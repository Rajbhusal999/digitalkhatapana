/**
 * database.js - Data Access Layer
 * Supabase Cloud Database (Primary and Only Storage).
 * LocalStorage is used ONLY for the 'theme' UI preference key.
 */

// ──────────────────────────────────────────────────────────────
// Default Seed Categories
// ──────────────────────────────────────────────────────────────
const DEFAULT_INCOME_CATEGORIES = {
    'gov_conditional': { en: 'Government Conditional Grant', ne: 'संघीय सशर्त अनुदान' },
    'local_level': { en: 'Local Government Budget', ne: 'स्थानीय तह अनुदान' },
    'internal_source': { en: 'School Internal Source', ne: 'विद्यालय आन्तरिक स्रोत' },
    'mid_day_meal': { en: 'Mid-Day Meal Program Budget', ne: 'दिवा खाजा अनुदान' },
    'donation': { en: 'Donations & Charity', ne: 'चन्दा र सहयोग' },
    'misc_income': { en: 'Miscellaneous Income', ne: 'विविध आय' }
};

const DEFAULT_EXPENSE_CATEGORIES = {
    'salary': { en: 'Teacher & Staff Salary', enShort: 'Salary', ne: 'शिक्षक तथा कर्मचारी तलब' },
    'infrastructure': { en: 'Infrastructure & Repair', enShort: 'Infrastructure', ne: 'भौतिक निर्माण तथा मर्मत' },
    'materials': { en: 'Educational & IT Materials', enShort: 'Materials', ne: 'शैक्षिक तथा सूचना-प्रविधि सामग्री' },
    'meal_cost': { en: 'Mid-Day Meal Expenses', enShort: 'Meal Management', ne: 'दिवा खाजा व्यवस्थापन खर्च' },
    'scholarship': { en: 'Student Scholarships', enShort: 'Scholarships', ne: 'विद्यार्थी छात्रवृत्ति वितरण' },
    'office_ops': { en: 'Office Operations & Stationery', enShort: 'Office Ops', ne: 'कार्यालय सञ्चालन र मसलन्द' },
    'misc_expense': { en: 'Miscellaneous Expense', enShort: 'Misc', ne: 'विविध खर्च' }
};

// ──────────────────────────────────────────────────────────────
// Dynamic Categories (loaded from Supabase per school)
// ──────────────────────────────────────────────────────────────
let INCOME_CATEGORIES = {};
let EXPENSE_CATEGORIES = {};

// ──────────────────────────────────────────────────────────────
// Default ledger headings seed
// ──────────────────────────────────────────────────────────────
const DEFAULT_INCOME_HEADINGS = [
    { id: 'a1-001', type: 'income', parent_id: null, name_ne: 'सरकारी अनुदान', name_en: 'Govt Conditional Grant', sort_order: 1 },
    { id: 'a1-001-a', type: 'income', parent_id: 'a1-001', name_ne: 'तलब भत्ता', name_en: 'Salary Allowance', sort_order: 1 },
    { id: 'a1-001-b', type: 'income', parent_id: 'a1-001', name_ne: 'दिवा खाजा', name_en: 'Mid-Day Meal', sort_order: 2 },
    { id: 'a1-001-c', type: 'income', parent_id: 'a1-001', name_ne: 'अन्य', name_en: 'Others', sort_order: 3 },
    { id: 'a1-002', type: 'income', parent_id: null, name_ne: 'PCP', name_en: 'PCP', sort_order: 2 },
    { id: 'a1-003', type: 'income', parent_id: null, name_ne: 'स्थानीय अनुदान', name_en: 'Local Govt Grant', sort_order: 3 },
    { id: 'a1-003-a', type: 'income', parent_id: 'a1-003', name_ne: 'निर्माण', name_en: 'Construction', sort_order: 1 },
    { id: 'a1-003-b', type: 'income', parent_id: 'a1-003', name_ne: 'शैक्षिक', name_en: 'Educational', sort_order: 2 },
    { id: 'a1-003-c', type: 'income', parent_id: 'a1-003', name_ne: 'अन्य', name_en: 'Others', sort_order: 3 },
    { id: 'a1-004', type: 'income', parent_id: null, name_ne: 'संस्थागत', name_en: 'Institutional', sort_order: 4 },
    { id: 'a1-005', type: 'income', parent_id: null, name_ne: 'सापटी', name_en: 'Loan', sort_order: 5 },
    { id: 'a1-006', type: 'income', parent_id: null, name_ne: 'विविध', name_en: 'Miscellaneous', sort_order: 6 }
];

const DEFAULT_EXPENSE_HEADINGS = [
    { id: 'c1-001', type: 'expense', parent_id: null, name_ne: 'सरकारी अनुदान', name_en: 'Govt Grant', sort_order: 1 },
    { id: 'c1-001-a', type: 'expense', parent_id: 'c1-001', name_ne: 'तलब भत्ता', name_en: 'Salary', sort_order: 1 },
    { id: 'c1-001-b', type: 'expense', parent_id: 'c1-001', name_ne: 'दिवा खाजा', name_en: 'Mid-Day Meal', sort_order: 2 },
    { id: 'c1-001-c', type: 'expense', parent_id: 'c1-001', name_ne: 'भवन निर्माण', name_en: 'Construction', sort_order: 3 },
    { id: 'c1-002', type: 'expense', parent_id: null, name_ne: 'स्थानीय अनुदान', name_en: 'Local Grant', sort_order: 2 },
    { id: 'c1-002-a', type: 'expense', parent_id: 'c1-002', name_ne: 'तलब भत्ता', name_en: 'Salary', sort_order: 1 },
    { id: 'c1-002-b', type: 'expense', parent_id: 'c1-002', name_ne: 'निर्माण', name_en: 'Construction', sort_order: 2 },
    { id: 'c1-002-c', type: 'expense', parent_id: 'c1-002', name_ne: 'शैक्षिक सामग्री', name_en: 'Educational Materials', sort_order: 3 },
    { id: 'c1-003', type: 'expense', parent_id: null, name_ne: 'संस्थागत', name_en: 'Institutional', sort_order: 3 },
    { id: 'c1-004', type: 'expense', parent_id: null, name_ne: 'PCD', name_en: 'PCD', sort_order: 4 },
    { id: 'c1-005', type: 'expense', parent_id: null, name_ne: 'कर्मचारी सुविधा', name_en: 'Staff Benefits', sort_order: 5 },
    { id: 'c1-006', type: 'expense', parent_id: null, name_ne: 'सामाजिक सुरक्षा', name_en: 'Social Security', sort_order: 6 },
    { id: 'c1-007', type: 'expense', parent_id: null, name_ne: 'उपकरण सामग्री', name_en: 'Equipment & Materials', sort_order: 7 },
    { id: 'c1-007-a', type: 'expense', parent_id: 'c1-007', name_ne: 'कम्प्युटर', name_en: 'Computer', sort_order: 1 },
    { id: 'c1-007-b', type: 'expense', parent_id: 'c1-007', name_ne: 'फर्निचर', name_en: 'Furniture', sort_order: 2 },
    { id: 'c1-008', type: 'expense', parent_id: null, name_ne: 'विविध', name_en: 'Miscellaneous', sort_order: 8 }
];

// ──────────────────────────────────────────────────────────────
// Supabase Client & Memory Cache
// ──────────────────────────────────────────────────────────────
let supabaseClient = null;

let cachedTransactions = [];
let cachedBudgets = {};
let cachedFeedbacks = [];
let cachedHeadings = [];
let cachedRegisteredSchools = [];
let cachedAssets = [];

// Active school info — set from Supabase after login, no localStorage
window._activeSchoolInfo = null;

// ──────────────────────────────────────────────────────────────
// School ID Helper — reads from sessionStorage (set at login)
// ──────────────────────────────────────────────────────────────
function getSchoolId() {
    const email = sessionStorage.getItem('school_user_email');
    if (email) return email.replace(/[^a-zA-Z0-9@.]/g, '');
    if (window._activeSchoolInfo && window._activeSchoolInfo.schoolEmail) {
        return window._activeSchoolInfo.schoolEmail.replace(/[^a-zA-Z0-9@.]/g, '');
    }
    return 'default';
}

// ──────────────────────────────────────────────────────────────
// Initialize Database
// ──────────────────────────────────────────────────────────────
async function initDatabase() {
    const hasConfig = typeof SUPABASE_URL !== 'undefined' &&
                      typeof SUPABASE_ANON_KEY !== 'undefined' &&
                      SUPABASE_URL &&
                      SUPABASE_ANON_KEY &&
                      !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_URL') &&
                      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_PUBLIC_KEY');

    if (!hasConfig || !window.supabase) {
        console.error('Supabase credentials not configured. Database unavailable.');
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize Supabase client.', err);
        return;
    }

    // Resolve active school info from Supabase using session email
    const sessionEmail = sessionStorage.getItem('school_user_email');
    if (sessionEmail) {
        await _resolveActiveSchoolInfo(sessionEmail);
    }

    await syncFromSupabase();
    await loadCategoriesFromSupabase();
}

// ──────────────────────────────────────────────────────────────
// Resolve & cache active school info from Supabase
// ──────────────────────────────────────────────────────────────
async function _resolveActiveSchoolInfo(email) {
    if (!supabaseClient || !email) return;
    try {
        const { data, error } = await supabaseClient
            .from('registered_schools')
            .select('*')
            .ilike('school_email', email)
            .single();
        if (error || !data) return;
        window._activeSchoolInfo = _mapSchool(data);
    } catch (e) {
        console.error('Error resolving active school from Supabase:', e);
    }
}

// ──────────────────────────────────────────────────────────────
// Map Supabase snake_case row → camelCase app object
// ──────────────────────────────────────────────────────────────
function _mapSchool(item) {
    return {
        id: item.id,
        schoolName: item.school_name,
        address: item.address,
        schoolEmail: item.school_email,
        emis: item.emis,
        principalName: item.principal_name,
        pPhone: item.principal_phone,
        accountantName: item.accountant_name,
        aPhone: item.accountant_phone,
        logo: item.logo,
        status: item.status,
        otp: item.otp,
        otpUsed: item.otp_used,
        permanentPassword: item.permanent_password,
        subscription: (function(){
            try { return typeof item.subscription === 'string' ? JSON.parse(item.subscription) : item.subscription; }
            catch(e) { return item.subscription; }
        })(),
        paymentMethod: item.payment_method,
        transactionCode: item.transaction_code,
        registeredAt: item.registered_at
    };
}

// ──────────────────────────────────────────────────────────────
// Sync All Data From Supabase into Memory Cache
// ──────────────────────────────────────────────────────────────
async function syncFromSupabase() {
    if (!supabaseClient) return;
    try {
        const schoolId = getSchoolId();

        // Fetch transactions
        const txRes = await supabaseClient.from('transactions').select('*').eq('school_id', schoolId);
        if (txRes.error) {
            console.error('Error fetching transactions:', txRes.error);
        } else {
            cachedTransactions = txRes.data.map(item => ({
            id: item.id,
            date: item.date,
            type: item.type,
            category: item.category,
            particulars: item.particulars,
            amount: Number(item.amount),
            voucherNo: item.voucher_no,
            voucher_no: item.voucher_no,
            source: item.source,
            recordedBy: item.recorded_by,
            payment_method: item.payment_method || 'bank',
            subheading_id: item.subheading_id || null,
            subheading_amount: Number(item.subheading_amount || 0),
            fiscal_year: item.fiscal_year || null,
            description: item.description || item.particulars || '',
            receipt_url: item.receipt_url || null
        }));
        }

        // Fetch budgets
        const bgRes = await supabaseClient.from('budgets').select('*').eq('school_id', schoolId);
        if (bgRes.error) {
            console.error('Error fetching budgets:', bgRes.error);
        } else {
            cachedBudgets = {};
            bgRes.data.forEach(item => {
                cachedBudgets[item.category] = Number(item.amount);
            });
        }

        // Fetch feedbacks
        const fbRes = await supabaseClient.from('feedbacks').select('*').eq('school_id', schoolId);
        if (fbRes.error) {
            console.error('Error fetching feedbacks:', fbRes.error);
        } else {
            cachedFeedbacks = fbRes.data.map(item => ({
            id: item.id,
            name: item.name,
            role: item.role,
            phone: item.phone,
            email: item.email,
            message: item.message,
            replied: item.replied,
            replyText: item.reply_text,
            date: item.date
        }));
        }

        // Fetch ledger headings
        const hdRes = await supabaseClient.from('ledger_headings').select('*').eq('school_id', schoolId).order('sort_order');
        if (!hdRes.error && hdRes.data && hdRes.data.length > 0) {
            cachedHeadings = hdRes.data.map(h => {
                if (h.parent_id === 'null' || h.parent_id === '') h.parent_id = null;
                return h;
            });
        } else {
            cachedHeadings = [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
        }

        // Fetch assets
        const astRes = await supabaseClient.from('assets').select('*').eq('school_id', schoolId);
        if (!astRes.error && astRes.data) {
            cachedAssets = astRes.data.map(item => ({
                id: item.id,
                asset_name: item.asset_name,
                category: item.category,
                purchase_date: item.purchase_date,
                value: Number(item.value),
                condition: item.condition,
                location: item.location,
                recorded_by: item.recorded_by
            }));
        } else {
            cachedAssets = [];
        }

        console.log('Supabase data synchronized successfully.');
        await fetchRegisteredSchools();
    } catch (err) {
        console.error('Failed to sync from Supabase:', err);
    }
}

// ──────────────────────────────────────────────────────────────
// Categories — Load from Supabase (seed defaults if none exist)
// ──────────────────────────────────────────────────────────────
async function loadCategoriesFromSupabase() {
    if (!supabaseClient) {
        INCOME_CATEGORIES = { ...DEFAULT_INCOME_CATEGORIES };
        EXPENSE_CATEGORIES = { ...DEFAULT_EXPENSE_CATEGORIES };
        return;
    }

    const schoolId = getSchoolId();
    try {
        const { data, error } = await supabaseClient
            .from('school_categories')
            .select('*')
            .eq('school_id', schoolId);

        if (error) throw error;

        const incomeRows = data.filter(r => r.type === 'income');
        const expenseRows = data.filter(r => r.type === 'expense');

        if (incomeRows.length === 0) {
            // Seed defaults to Supabase
            await _seedDefaultCategories(schoolId, 'income', DEFAULT_INCOME_CATEGORIES);
            INCOME_CATEGORIES = { ...DEFAULT_INCOME_CATEGORIES };
        } else {
            INCOME_CATEGORIES = {};
            incomeRows.forEach(r => { INCOME_CATEGORIES[r.key] = { en: r.name_en, ne: r.name_ne }; });
        }

        if (expenseRows.length === 0) {
            await _seedDefaultCategories(schoolId, 'expense', DEFAULT_EXPENSE_CATEGORIES);
            EXPENSE_CATEGORIES = { ...DEFAULT_EXPENSE_CATEGORIES };
        } else {
            EXPENSE_CATEGORIES = {};
            expenseRows.forEach(r => { EXPENSE_CATEGORIES[r.key] = { en: r.name_en, enShort: r.name_en_short || r.name_en, ne: r.name_ne }; });
        }
    } catch (e) {
        console.error('Error loading categories from Supabase, using defaults:', e);
        INCOME_CATEGORIES = { ...DEFAULT_INCOME_CATEGORIES };
        EXPENSE_CATEGORIES = { ...DEFAULT_EXPENSE_CATEGORIES };
    }
}

async function _seedDefaultCategories(schoolId, type, defaults) {
    if (!supabaseClient) return;
    const rows = Object.entries(defaults).map(([key, val]) => ({
        school_id: schoolId,
        type: type,
        key: key,
        name_ne: val.ne,
        name_en: val.en,
        name_en_short: val.enShort || val.en,
        is_default: true
    }));
    try {
        await supabaseClient.from('school_categories').upsert(rows, { onConflict: 'school_id,type,key' });
    } catch (e) {
        console.error('Error seeding default categories:', e);
    }
}

// ──────────────────────────────────────────────────────────────
// Save Custom Category to Supabase
// ──────────────────────────────────────────────────────────────
async function saveCustomCategory(type, key, neName, enName) {
    const schoolId = getSchoolId();
    const row = {
        school_id: schoolId,
        type: type,
        key: key,
        name_ne: neName,
        name_en: enName,
        name_en_short: enName.substring(0, 15),
        is_default: false
    };

    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('school_categories')
                .upsert(row, { onConflict: 'school_id,type,key' });
            if (error) throw error;
        } catch (e) {
            console.error('Error saving category to Supabase:', e);
            throw e;
        }
    }

    // Update in-memory
    if (type === 'income') {
        INCOME_CATEGORIES[key] = { en: enName, ne: neName };
    } else {
        EXPENSE_CATEGORIES[key] = { en: enName, enShort: enName.substring(0, 15), ne: neName };
    }
}

// ──────────────────────────────────────────────────────────────
// Registered Schools CRUD
// ──────────────────────────────────────────────────────────────
async function fetchRegisteredSchools() {
    if (!supabaseClient) return cachedRegisteredSchools;
    try {
        const { data, error } = await supabaseClient.from('registered_schools').select('*');
        if (error) throw error;
        cachedRegisteredSchools = data.map(_mapSchool);
        console.log(`Fetched ${cachedRegisteredSchools.length} registered schools from Supabase.`);
        return cachedRegisteredSchools;
    } catch (e) {
        console.error('Failed to fetch registered schools from Supabase:', e);
        return cachedRegisteredSchools;
    }
}

async function upsertRegisteredSchool(school) {
    const dbPayload = {
        school_name: school.schoolName,
        address: school.address,
        school_email: school.schoolEmail,
        emis: school.emis,
        principal_name: school.principalName,
        principal_phone: school.pPhone,
        accountant_name: school.accountantName,
        accountant_phone: school.aPhone,
        logo: school.logo,
        status: school.status || 'Pending',
        otp: school.otp,
        otp_used: school.otpUsed || false,
        permanent_password: school.permanentPassword,
        subscription: typeof school.subscription === 'object' ? JSON.stringify(school.subscription) : school.subscription,
        payment_method: school.paymentMethod,
        transaction_code: school.transactionCode
    };

    if (school.id) {
        dbPayload.id = school.id;
    }

    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('registered_schools')
                .upsert(dbPayload, { onConflict: 'school_email' });
            if (error) throw error;
            await fetchRegisteredSchools();
        } catch (e) {
            console.error('Error upserting registered school:', e);
            throw e;
        }
    } else {
        // Update in-memory cache if Supabase not available
        cachedRegisteredSchools = cachedRegisteredSchools.filter(s => s.schoolEmail.toLowerCase() !== school.schoolEmail.toLowerCase());
        cachedRegisteredSchools.push(school);
    }
}

async function deleteRegisteredSchool(email) {
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('registered_schools')
                .delete()
                .eq('school_email', email);
            if (error) throw error;
            await fetchRegisteredSchools();
        } catch (e) {
            console.error('Error deleting registered school:', e);
            throw e;
        }
    } else {
        cachedRegisteredSchools = cachedRegisteredSchools.filter(s => s.schoolEmail.toLowerCase() !== email.toLowerCase());
    }
}

// ──────────────────────────────────────────────────────────────
// Getters (return in-memory cache)
// ──────────────────────────────────────────────────────────────
function getTransactions() { return cachedTransactions || []; }
function getBudgets()      { return cachedBudgets || {}; }
function getFeedbacks()    { return cachedFeedbacks || []; }
function getAssets()       { return cachedAssets || []; }

function getLedgerHeadings(type) {
    const all = cachedHeadings || [];
    if (type) return all.filter(h => h.type === type);
    return all;
}

function getLedgerHeadingById(id) {
    return (cachedHeadings || []).find(h => h.id === id) || null;
}

// ──────────────────────────────────────────────────────────────
// Transactions CRUD
// ──────────────────────────────────────────────────────────────
async function saveTransaction(tx) {
    const basePayload = {
        id: tx.id || 'tx-' + Date.now(),
        school_id: getSchoolId(),
        date: tx.date,
        type: tx.type,
        category: tx.category,
        particulars: tx.particulars || tx.description || '',
        description: tx.description || tx.particulars || '',
        amount: Number(tx.amount),
        voucher_no: tx.voucherNo || tx.voucher_no,
        source: tx.source || tx.fund_source || 'Internal',
        recorded_by: tx.recordedBy || 'Accountant',
        payment_method: tx.payment_method || 'bank'
    };

    let fullPayload = { ...basePayload };
    if (tx.fiscal_year) fullPayload.fiscal_year = tx.fiscal_year;
    if (tx.subheading_id) {
        fullPayload.subheading_id = tx.subheading_id;
        fullPayload.subheading_amount = Number(tx.subheading_amount || tx.amount || 0);
    }
    if (tx.receipt_url) fullPayload.receipt_url = tx.receipt_url;

    if (supabaseClient) {
        let { error } = await supabaseClient.from('transactions').upsert(fullPayload);
        
        if (error && error.message && error.message.includes('Could not find')) {
            console.warn('Schema column missing. Retrying with base payload...', error.message);
            const retry = await supabaseClient.from('transactions').upsert(basePayload);
            error = retry.error;
        }
        if (error) { 
            console.error('Error saving transaction to Supabase:', error); 
            // Graceful fallback to memory cache if schema error (e.g., missing column)
            const fallbackTx = { ...tx, id: basePayload.id };
            const idx = cachedTransactions.findIndex(t => t.id === fallbackTx.id);
            if (idx !== -1) { cachedTransactions[idx] = fallbackTx; }
            else { cachedTransactions.push(fallbackTx); }
        } else {
            await syncFromSupabase();
        }
    } else {
        const idx = cachedTransactions.findIndex(t => t.id === basePayload.id);
        if (idx !== -1) {
            cachedTransactions[idx] = { ...cachedTransactions[idx], ...tx, id: basePayload.id };
        } else {
            cachedTransactions.push({ ...tx, id: basePayload.id });
        }
    }
    return tx;
}

async function deleteTransaction(id) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
        if (error) { console.error('Error deleting transaction from Supabase:', error); throw error; }
        await syncFromSupabase();
    } else {
        cachedTransactions = cachedTransactions.filter(t => t.id !== id);
    }
}

// ──────────────────────────────────────────────────────────────
// Budgets CRUD
// ──────────────────────────────────────────────────────────────
async function saveBudget(category, amount) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('budgets').upsert({
            school_id: getSchoolId(),
            category: category,
            amount: Number(amount)
        });
        if (error) { console.error('Error saving budget to Supabase:', error); throw error; }
        await syncFromSupabase();
    } else {
        cachedBudgets[category] = Number(amount);
    }
    return cachedBudgets;
}

// ──────────────────────────────────────────────────────────────
// Feedbacks CRUD
// ──────────────────────────────────────────────────────────────
async function saveFeedback(fb) {
    fb.id = 'fb-' + Date.now();
    fb.date = new Date().toISOString().split('T')[0];
    fb.replied = false;
    fb.replyText = null;

    if (supabaseClient) {
        const dbPayload = {
            id: fb.id,
            school_id: getSchoolId(),
            name: fb.name,
            role: fb.role,
            phone: fb.phone || null,
            email: fb.email || null,
            message: fb.message,
            replied: fb.replied,
            reply_text: fb.replyText,
            date: fb.date
        };
        const { error } = await supabaseClient.from('feedbacks').insert(dbPayload);
        if (error) { console.error('Error saving feedback to Supabase:', error); throw error; }
        await syncFromSupabase();
    } else {
        cachedFeedbacks.push(fb);
    }
    return fb;
}

async function replyToFeedback(id, text) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('feedbacks')
            .update({ replied: true, reply_text: text })
            .eq('id', id);
        if (error) { console.error('Error updating feedback on Supabase:', error); throw error; }
        await syncFromSupabase();
    } else {
        const idx = cachedFeedbacks.findIndex(f => f.id === id);
        if (idx !== -1) {
            cachedFeedbacks[idx].replied = true;
            cachedFeedbacks[idx].replyText = text;
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Ledger Headings CRUD
// ──────────────────────────────────────────────────────────────
async function saveLedgerHeading(heading) {
    if (!heading.id) {
        heading.id = 'hd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    }
    heading.school_id = heading.school_id || getSchoolId();
    heading.sort_order = heading.sort_order || 0;

    if (supabaseClient) {
        const payload = {
            id: heading.id,
            school_id: heading.school_id,
            type: heading.type,
            parent_id: (!heading.parent_id || heading.parent_id === 'null' || heading.parent_id === '') ? null : heading.parent_id,
            name_ne: heading.name_ne,
            name_en: heading.name_en || heading.name_ne,
            sort_order: heading.sort_order
        };
        const { error } = await supabaseClient.from('ledger_headings').upsert(payload);
        if (error) { 
            console.error('Error saving heading:', error); 
            // Fallback to memory
            const idx = cachedHeadings.findIndex(h => h.id === heading.id);
            if (idx !== -1) { cachedHeadings[idx] = heading; }
            else { cachedHeadings.push(heading); }
        } else {
            await syncFromSupabase();
        }
    } else {
        const idx = cachedHeadings.findIndex(h => h.id === heading.id);
        if (idx !== -1) { cachedHeadings[idx] = heading; }
        else { cachedHeadings.push(heading); }
    }
    return heading;
}

async function deleteLedgerHeading(id) {
    if (supabaseClient) {
        const { error: err1 } = await supabaseClient.from('ledger_headings').delete().eq('parent_id', id);
        const { error: err2 } = await supabaseClient.from('ledger_headings').delete().eq('id', id);
        if (err1 || err2) { 
            console.error('Error deleting heading:', err1 || err2); 
            cachedHeadings = cachedHeadings.filter(h => h.id !== id && h.parent_id !== id);
        } else {
            await syncFromSupabase();
        }
    } else {
        cachedHeadings = cachedHeadings.filter(h => h.id !== id && h.parent_id !== id);
    }
}

// ──────────────────────────────────────────────────────────────
// Assets CRUD
// ──────────────────────────────────────────────────────────────
async function saveAsset(asset) {
    const schoolId = getSchoolId();
    const dbPayload = {
        school_id: schoolId,
        asset_name: asset.asset_name,
        category: asset.category,
        purchase_date: asset.purchase_date,
        value: Number(asset.value || 0),
        condition: asset.condition || 'Good',
        location: asset.location || null,
        recorded_by: asset.recorded_by || sessionStorage.getItem('school_user_email') || 'Accountant'
    };

    if (asset.id) dbPayload.id = asset.id;

    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('assets').upsert(dbPayload).select().single();
        if (error) { console.error('Error saving asset to Supabase:', error); throw error; }
        await syncFromSupabase();
        return data;
    } else {
        const newAsset = { ...dbPayload, id: asset.id || 'ast-' + Date.now() };
        const idx = cachedAssets.findIndex(a => a.id === newAsset.id);
        if (idx !== -1) { cachedAssets[idx] = newAsset; }
        else { cachedAssets.push(newAsset); }
        return newAsset;
    }
}

async function deleteAsset(id) {
    if (supabaseClient) {
        const { error } = await supabaseClient.from('assets').delete().eq('id', id);
        if (error) { console.error('Error deleting asset from Supabase:', error); throw error; }
        await syncFromSupabase();
    } else {
        cachedAssets = cachedAssets.filter(a => a.id !== id);
    }
}

// ──────────────────────────────────────────────────────────────
// Notifications CRUD (Super Admin use only)
// ──────────────────────────────────────────────────────────────
async function saveNotification(notification) {
    if (!supabaseClient) return;
    try {
        const payload = {
            id: 'notif-' + Date.now(),
            to_email: notification.to,
            subject: notification.subject,
            body: notification.body,
            school_name: notification.schoolName || null,
            timestamp: notification.timestamp || new Date().toISOString()
        };
        await supabaseClient.from('notifications').insert(payload);
    } catch (e) {
        console.error('Error saving notification to Supabase:', e);
    }
}

async function fetchNotifications() {
    if (!supabaseClient) return [];
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .order('timestamp', { ascending: false });
        if (error) throw error;
        return (data || []).map(n => ({
            id: n.id,
            to: n.to_email,
            subject: n.subject,
            body: n.body,
            schoolName: n.school_name,
            timestamp: n.timestamp
        }));
    } catch (e) {
        console.error('Error fetching notifications from Supabase:', e);
        return [];
    }
}

async function clearNotifications() {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from('notifications').delete().neq('id', '');
    } catch (e) {
        console.error('Error clearing notifications from Supabase:', e);
    }
}

// ──────────────────────────────────────────────────────────────
// Broadcasts CRUD
// ──────────────────────────────────────────────────────────────
async function saveBroadcast(msg, type) {
    if (!supabaseClient) return;
    try {
        const payload = {
            id: 'bc_' + Date.now(),
            message: msg,
            type: type || 'info',
            date: new Date().toISOString()
        };
        await supabaseClient.from('broadcasts').upsert([payload]);
    } catch (e) {
        console.error('Error saving broadcast to Supabase:', e);
    }
}

async function fetchLatestBroadcast() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('broadcasts')
            .select('*')
            .order('date', { ascending: false })
            .limit(1);
        if (error || !data || data.length === 0) return null;
        return data[0];
    } catch (e) {
        console.error('Error fetching broadcast:', e);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// Currency Formatting Helpers
// ──────────────────────────────────────────────────────────────
const NEPALI_DIGITS = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
};

function toNepaliDigits(numberString) {
    return String(numberString).replace(/[0-9]/g, char => NEPALI_DIGITS[char] || char);
}

function formatNepaliStyleNumber(num) {
    const parts = Number(num).toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);

    if (otherNumbers !== '') {
        const groupedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        intPart = groupedOthers + ',' + lastThree;
    } else {
        intPart = lastThree;
    }

    return intPart + '.' + decPart;
}

function formatCurrency(amount, isDevanagari = false) {
    const formattedNum = formatNepaliStyleNumber(amount);
    if (isDevanagari) {
        return 'रू. ' + toNepaliDigits(formattedNum);
    }
    return 'रू. ' + formattedNum;
}

function formatDate(dateStr, isDevanagari = false) {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const englishDate = dateObj.toLocaleDateString('en-US', options);

    if (isDevanagari) {
        return toNepaliDigits(dateStr.replace(/-/g, '/'));
    }
    return englishDate;
}

// ──────────────────────────────────────────────────────────────
// Expose all functions to window
// ──────────────────────────────────────────────────────────────
window.initDatabase           = initDatabase;
window.fetchRegisteredSchools = fetchRegisteredSchools;
window.upsertRegisteredSchool = upsertRegisteredSchool;
window.deleteRegisteredSchool = deleteRegisteredSchool;
window.getTransactions        = getTransactions;
window.saveTransaction        = saveTransaction;
window.deleteTransaction      = deleteTransaction;
window.getBudgets             = getBudgets;
window.saveBudget             = saveBudget;
window.getFeedbacks           = getFeedbacks;
window.saveFeedback           = saveFeedback;
window.replyToFeedback        = replyToFeedback;
window.getAssets              = getAssets;
window.saveAsset              = saveAsset;
window.deleteAsset            = deleteAsset;
window.loadCategoriesFromSupabase = loadCategoriesFromSupabase;
window.saveCustomCategory     = saveCustomCategory;
window.getLedgerHeadings      = getLedgerHeadings;
window.getLedgerHeadingById   = getLedgerHeadingById;
window.saveLedgerHeading      = saveLedgerHeading;
window.deleteLedgerHeading    = deleteLedgerHeading;
window.saveNotification       = saveNotification;
window.fetchNotifications     = fetchNotifications;
window.clearNotifications     = clearNotifications;
window.saveBroadcast          = saveBroadcast;
window.fetchLatestBroadcast   = fetchLatestBroadcast;
window.getSchoolId            = getSchoolId;
window.formatCurrency         = formatCurrency;
window.formatNepaliStyleNumber= formatNepaliStyleNumber;
window.toNepaliDigits         = toNepaliDigits;

// ──────────────────────────────────────────────────────────────
// Inject Dynamic Footer and Global Nepali Clock
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Global Nepali Clock in Header
    const header = document.querySelector('header');
    if (header) {
        const clockDiv = document.createElement('div');
        clockDiv.id = 'live-nepali-clock';
        clockDiv.style.cssText = 'position: absolute; left: 50%; transform: translateX(-50%); font-weight: 700; font-family: var(--font-nepali), sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.1rem; color: #ffffff; background: linear-gradient(135deg, var(--secondary-dark), #1e293b); padding: 8px 24px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); text-align: center; z-index: 10;';

        header.appendChild(clockDiv);

        const engToNep = {'0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९'};

        function updateClock() {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const nepaliDate = new Date(utc + (3600000 * 5.75));

            let hours = nepaliDate.getHours();
            let minutes = nepaliDate.getMinutes();
            let seconds = nepaliDate.getSeconds();
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12;

            const strTime = (hours < 10 ? '0'+hours : hours) + ':' +
                            (minutes < 10 ? '0'+minutes : minutes) + ':' +
                            (seconds < 10 ? '0'+seconds : seconds) + ' ' + ampm;

            let bsDateStr = '';
            if (window.NepaliFunctions) {
                try {
                    const bsDate = window.NepaliFunctions.GetCurrentBsDate();
                    bsDateStr = window.NepaliFunctions.GetBsFullDate(bsDate, true) + ' | ';
                } catch(e) {}
            }

            const nepaliStrTime = strTime.replace(/[0-9]/g, m => engToNep[m]);
            clockDiv.innerHTML = `<span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">${bsDateStr}</span> <div style="display:flex; align-items:center; gap:6px;"><span style="color:#e5a93b;">🕒</span> <span>${nepaliStrTime}</span></div>`;
        }

        updateClock();
        setInterval(updateClock, 1000);
    }

    // 2. Dynamic Footer Logic
    setTimeout(() => {
        try {
            const footerBottom = document.querySelector('footer .footer-bottom');
            if (footerBottom) {
                let schoolName = 'खातापाना Digital';
                let address = '';
                let phone = '';
                let email = '';

                const path = window.location.pathname.toLowerCase();
                const isPlatformPage = path.includes('digitalkhatapana.html') ||
                                       path.includes('select-school.html') ||
                                       path.includes('school-login.html') ||
                                       path.includes('portal-admin.html') ||
                                       path.includes('subscription.html') ||
                                       path.endsWith('/');

                if (!isPlatformPage && window._activeSchoolInfo) {
                    const info = window._activeSchoolInfo;
                    if (info.schoolName) schoolName = info.schoolName;
                    if (info.address) address = info.address;
                    if (info.pPhone) phone = info.pPhone;
                    if (info.schoolEmail) email = info.schoolEmail;
                }

                let nepaliYearStr = '२०८३';
                if (window.NepaliFunctions) {
                    try {
                        nepaliYearStr = window.toNepaliDigits(window.NepaliFunctions.GetCurrentBsDate().year);
                    } catch(e){}
                } else {
                    nepaliYearStr = window.toNepaliDigits(new Date().getFullYear() + 57);
                }

                let text = `© ${nepaliYearStr} ${schoolName}`;
                if (address) text += ` | ${address}`;
                if (phone) text += ` | फोन: ${phone}`;
                if (email) text += ` | इमेल: ${email}`;

                const currentText = footerBottom.innerText;
                if (currentText.includes('प्रशासनिक')) {
                    text += ` | प्रशासनिक लेखा व्यवस्थापन पोर्टल`;
                } else if (currentText.includes('सुशासन')) {
                    text += ` | सुशासन, पारदर्शिता र गुणस्तरीय शिक्षा`;
                } else if (currentText.includes('केन्द्रीय')) {
                    text += ` | केन्द्रीय सुपर एडमिन प्रशासन प्रणाली`;
                }

                footerBottom.innerText = text;
            }
        } catch(e) {}
    }, 300);
});

// ──────────────────────────────────────────────────────────────
// Global Theme Toggle
// ──────────────────────────────────────────────────────────────
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    if (themeText) themeText.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

document.addEventListener('DOMContentLoaded', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    if (isDark && themeIcon) {
        themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light Mode';
    }
});
