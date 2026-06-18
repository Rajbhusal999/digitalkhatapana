/**
 * database.js - Data Access Layer & Shared Utilities
 * Refactored to support Supabase Cloud Database with LocalStorage Fallback.
 */

let DB_KEY = 'nepal_school_finances';
let BUDGET_KEY = 'nepal_school_budgets';
let FEEDBACK_KEY = 'nepal_school_feedbacks';
let HEADINGS_KEY = 'nepal_school_ledger_headings';
let dbSuffix = '';

function initKeys() {
    let schoolInfoStr = localStorage.getItem('nepal_school_registered_info');
    if (!schoolInfoStr) {
        const schoolsListStr = localStorage.getItem('nepal_registered_schools');
        if (schoolsListStr) {
            try {
                const schoolsList = JSON.parse(schoolsListStr);
                const approvedSchool = schoolsList.find(s => s.status === 'Approved');
                if (approvedSchool) {
                    schoolInfoStr = JSON.stringify(approvedSchool);
                    localStorage.setItem('nepal_school_registered_info', schoolInfoStr);
                }
            } catch (e) {
                console.error('Error recovering school info in initKeys:', e);
            }
        }
    }
    if (schoolInfoStr) {
        try {
            const schoolInfo = JSON.parse(schoolInfoStr);
            if (schoolInfo.schoolEmail) {
                dbSuffix = '_' + schoolInfo.schoolEmail.replace(/[^a-zA-Z0-9]/g, '');
            }
        } catch(e) {
            console.error(e);
        }
    }
    DB_KEY = 'nepal_school_finances' + dbSuffix;
    BUDGET_KEY = 'nepal_school_budgets' + dbSuffix;
    FEEDBACK_KEY = 'nepal_school_feedbacks' + dbSuffix;
    HEADINGS_KEY = 'nepal_school_ledger_headings' + dbSuffix;
    loadDynamicCategories();
}

// Default Seed Categories
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

// Dynamic Categories
let INCOME_CATEGORIES = {};
let EXPENSE_CATEGORIES = {};

function loadDynamicCategories() {
    const incKey = 'nepal_school_income_categories' + dbSuffix;
    const expKey = 'nepal_school_expense_categories' + dbSuffix;
    
    const incStored = localStorage.getItem(incKey);
    const expStored = localStorage.getItem(expKey);
    
    let incParsed = null;
    let expParsed = null;
    
    try {
        if (incStored && incStored !== 'null' && incStored !== 'undefined') {
            incParsed = JSON.parse(incStored);
        }
    } catch(e) {}
    
    try {
        if (expStored && expStored !== 'null' && expStored !== 'undefined') {
            expParsed = JSON.parse(expStored);
        }
    } catch(e) {}
    
    // Seed defaults if empty, missing, or corrupt
    if (!incParsed || Object.keys(incParsed).length === 0) {
        localStorage.setItem(incKey, JSON.stringify(DEFAULT_INCOME_CATEGORIES));
        INCOME_CATEGORIES = JSON.parse(JSON.stringify(DEFAULT_INCOME_CATEGORIES));
    } else {
        INCOME_CATEGORIES = incParsed;
    }
    
    if (!expParsed || Object.keys(expParsed).length === 0) {
        localStorage.setItem(expKey, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
        EXPENSE_CATEGORIES = JSON.parse(JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
    } else {
        EXPENSE_CATEGORIES = expParsed;
    }
}

function saveCustomCategory(type, key, neName, enName) {
    const incKey = 'nepal_school_income_categories' + dbSuffix;
    const expKey = 'nepal_school_expense_categories' + dbSuffix;
    
    if (type === 'income') {
        INCOME_CATEGORIES[key] = { en: enName, ne: neName };
        localStorage.setItem(incKey, JSON.stringify(INCOME_CATEGORIES));
    } else {
        EXPENSE_CATEGORIES[key] = { en: enName, enShort: enName.substring(0, 15), ne: neName };
        localStorage.setItem(expKey, JSON.stringify(EXPENSE_CATEGORIES));
    }
}

// Seed/Mock Data for Local Storage Fallback
const DEFAULT_TRANSACTIONS = [
    { id: 'tx-1', date: '2026-04-15', type: 'income', category: 'gov_conditional', particulars: 'First Trimester Teacher Salary Grant (पहिलो चौमासिक शिक्षक तलब अनुदान)', amount: 1250000, voucherNo: 'V-8081-01', source: 'Federal Ministry of Education', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-2', date: '2026-04-18', type: 'income', category: 'mid_day_meal', particulars: 'Mid-day Meal Grant for Grades 1-5 (दिवा खाजा बजेट प्राप्त - कक्षा १-५)', amount: 280000, voucherNo: 'V-8081-02', source: 'Local Municipality Office', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-3', date: '2026-04-20', type: 'expense', category: 'salary', particulars: 'Salary Distribution for Baishakh Month (बैशाख महिनाको शिक्षक कर्मचारी पारिश्रमिक भुक्तानी)', amount: 980000, voucherNo: 'EXP-8081-01', source: 'Conditional Grant Account', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-4', date: '2026-04-25', type: 'expense', category: 'meal_cost', particulars: 'Payment for midday meal grains & catering (दिवा खाजा खाद्यान्न तथा खाजा खर्च भुक्तानी)', amount: 140000, voucherNo: 'EXP-8081-02', source: 'Meal Account', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-5', date: '2026-05-02', type: 'income', category: 'donation', particulars: 'Donation from local community for Computer Lab (कम्प्युटर प्रयोगशाला सहयोग - स्थानीय समुदाय)', amount: 120000, voucherNo: 'V-8081-03', source: 'Rotary Club of Pokhara', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-6', date: '2026-05-10', type: 'expense', category: 'materials', particulars: 'Purchase of 3 Desktop Computers & Router (३ थान डेस्कटप कम्प्युटर तथा राउटर खरिद)', amount: 950000, voucherNo: 'EXP-8081-03', source: 'Internal / Donation Pool', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-7', date: '2026-05-12', type: 'expense', category: 'infrastructure', particulars: 'Primary school building roof leakage repair (प्राथमिक भवन छाना मर्मत तथा रङ्गरोगन)', amount: 115000, voucherNo: 'EXP-8081-04', source: 'Local Gov Budget', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-8', date: '2026-05-18', type: 'income', category: 'local_level', particulars: 'Matching grant for school playground fence (विद्यालय खेलमैदान पर्खाल निर्माण अनुदान)', amount: 250000, voucherNo: 'V-8081-04', source: 'Ward No. 4 Office', recordedBy: 'Ram Bahadur Thapa (Accountant)' },
    { id: 'tx-9', date: '2026-05-25', type: 'expense', category: 'scholarship', particulars: 'Distribution of annual scholarship for underprivileged students (जेहेन्दार तथा विपन्न छात्रवृत्ति वितरण)', amount: 450000, voucherNo: 'EXP-8081-05', source: 'Local Gov & School Pool', recordedBy: 'Ram Bahadur Thapa (Accountant)' }
];

const DEFAULT_BUDGETS = {
    'salary': 2000000,
    'infrastructure': 500000,
    'materials': 800000,
    'meal_cost': 400000,
    'scholarship': 300000,
    'office_ops': 150000,
    'misc_expense': 100000
};

const DEFAULT_FEEDBACKS = [
    { id: 'fb-1', name: 'Hari Prasad Baskota', role: 'Parent (अभिभावक)', date: '2026-05-20', message: 'विद्यालयको आय-व्यय विवरण अनलाइनमा राखेर एकदमै राम्रो काम गर्नुभयो। दिवा खाजाको गुणस्तर अझै थप सुधार गरिदिनुहुन अनुरोध गर्दछु।', replied: false, replyText: null },
    { id: 'fb-2', name: 'Sushma Regmi', role: 'Local Citizen (स्थानीय नागरिक)', date: '2026-05-26', message: 'कम्प्युटर ल्याबमा इन्टरनेट कहिले जडान हुन्छ? विद्यार्थीहरूलाई डिजिटल साक्षरता धेरै आवश्यक छ। बजेट पर्याप्त छुट्टिएको देखिन्छ।', replied: true, replyText: 'सुझावका लागि धन्यवाद। कम्प्युटर खरिद भइसकेको छ र यसै महिनाभित्र वाइफाइ जडान गरेर सञ्चालनमा ल्याइनेछ।' }
];

// Default ledger headings seed (matching picture format)
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

// Connection variables
let supabaseClient = null;
let useSupabase = false;

// Memory Cache
let cachedTransactions = [];
let cachedBudgets = {};
let cachedFeedbacks = [];
let cachedHeadings = [];

/**
 * Initialize Database
 * Resolves connection details, determines if to use Supabase or Fallback LocalStorage
 */
async function initDatabase() {
    initKeys();
    // Check if configuration parameters exist and are not defaults
    const hasConfig = typeof SUPABASE_URL !== 'undefined' && 
                      typeof SUPABASE_ANON_KEY !== 'undefined' &&
                      SUPABASE_URL && 
                      SUPABASE_ANON_KEY &&
                      !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_URL') &&
                      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_PUBLIC_KEY');

    if (hasConfig && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            useSupabase = true;
            console.log("Supabase client initialized successfully.");
        } catch (err) {
            console.error("Failed to initialize Supabase client. Falling back to local storage.", err);
            useSupabase = false;
        }
    } else {
        console.warn("Supabase credentials not configured. Falling back to Demo LocalStorage Mode.");
        useSupabase = false;
    }

    if (useSupabase) {
        await syncFromSupabase();
    } else {
        syncFromLocalStorage();
    }
}

/**
 * School ID helper — returns a sanitized school email key for multi-tenancy
 */
function getSchoolId() {
    const schoolInfoStr = localStorage.getItem('nepal_school_registered_info');
    if (schoolInfoStr) {
        try {
            const info = JSON.parse(schoolInfoStr);
            if (info.schoolEmail) return info.schoolEmail.replace(/[^a-zA-Z0-9@.]/g, '');
        } catch(e) {}
    }
    return 'default';
}

/**
 * LocalStorage Fallback Handlers
 */
function syncFromLocalStorage() {
    if (!localStorage.getItem(DB_KEY) || localStorage.getItem(DB_KEY) === 'null' || localStorage.getItem(DB_KEY) === 'undefined') {
        const initialTransactions = dbSuffix ? [] : DEFAULT_TRANSACTIONS;
        localStorage.setItem(DB_KEY, JSON.stringify(initialTransactions));
    }
    if (!localStorage.getItem(BUDGET_KEY) || localStorage.getItem(BUDGET_KEY) === 'null' || localStorage.getItem(BUDGET_KEY) === 'undefined') {
        localStorage.setItem(BUDGET_KEY, JSON.stringify(DEFAULT_BUDGETS));
    }
    if (!localStorage.getItem(FEEDBACK_KEY) || localStorage.getItem(FEEDBACK_KEY) === 'null' || localStorage.getItem(FEEDBACK_KEY) === 'undefined') {
        const initialFeedbacks = dbSuffix ? [] : DEFAULT_FEEDBACKS;
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(initialFeedbacks));
    }
    // Seed default headings if not present
    const storedHeadings = localStorage.getItem(HEADINGS_KEY);
    if (!storedHeadings || storedHeadings === 'null' || storedHeadings === 'undefined' || JSON.parse(storedHeadings || '[]').length === 0) {
        const allDefaults = [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
        localStorage.setItem(HEADINGS_KEY, JSON.stringify(allDefaults));
    }

    try {
        cachedTransactions = JSON.parse(localStorage.getItem(DB_KEY)) || [];
    } catch (e) {
        console.error("Error parsing DB_KEY, resetting:", e);
        cachedTransactions = dbSuffix ? [] : DEFAULT_TRANSACTIONS;
        localStorage.setItem(DB_KEY, JSON.stringify(cachedTransactions));
    }

    try {
        cachedBudgets = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
    } catch (e) {
        console.error("Error parsing BUDGET_KEY, resetting:", e);
        cachedBudgets = DEFAULT_BUDGETS;
        localStorage.setItem(BUDGET_KEY, JSON.stringify(cachedBudgets));
    }

    try {
        cachedFeedbacks = JSON.parse(localStorage.getItem(FEEDBACK_KEY)) || [];
    } catch (e) {
        console.error("Error parsing FEEDBACK_KEY, resetting:", e);
        cachedFeedbacks = dbSuffix ? [] : DEFAULT_FEEDBACKS;
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(cachedFeedbacks));
    }

    try {
        cachedHeadings = JSON.parse(localStorage.getItem(HEADINGS_KEY)) || [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
    } catch (e) {
        cachedHeadings = [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
    }
}

/**
 * Supabase Data Sync Handlers
 */
async function syncFromSupabase() {
    try {
        // Fetch transactions
        const txRes = await supabaseClient.from('transactions').select('*');
        if (txRes.error) throw txRes.error;
        // Map database naming (snake_case) to application (camelCase)
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
            description: item.description || item.particulars || ''
        }));

        // Fetch budgets
        const bgRes = await supabaseClient.from('budgets').select('*');
        if (bgRes.error) throw bgRes.error;
        cachedBudgets = {};
        bgRes.data.forEach(item => {
            cachedBudgets[item.category] = Number(item.amount);
        });

        // Fetch feedbacks
        const fbRes = await supabaseClient.from('feedbacks').select('*');
        if (fbRes.error) throw fbRes.error;
        cachedFeedbacks = fbRes.data.map(item => ({
            id: item.id,
            name: item.name,
            role: item.role,
            message: item.message,
            replied: item.replied,
            replyText: item.reply_text,
            date: item.date
        }));

        // Fetch ledger headings
        const hdRes = await supabaseClient.from('ledger_headings').select('*').order('sort_order');
        if (!hdRes.error && hdRes.data && hdRes.data.length > 0) {
            cachedHeadings = hdRes.data;
        } else {
            // Fallback to localStorage or defaults
            try {
                const stored = localStorage.getItem(HEADINGS_KEY);
                cachedHeadings = (stored && stored !== 'null') ? JSON.parse(stored) : [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
            } catch(e) {
                cachedHeadings = [...DEFAULT_INCOME_HEADINGS, ...DEFAULT_EXPENSE_HEADINGS];
            }
        }

        console.log("Supabase data synchronized successfully.");
    } catch (err) {
        console.error("Failed to fetch data from Supabase. Falling back to LocalStorage.", err);
        useSupabase = false;
        syncFromLocalStorage();
    }
}

/**
 * Getters (return cached data immediately for synchronous UI drawing)
 */
function getTransactions() {
    return cachedTransactions || [];
}

function getBudgets() {
    return cachedBudgets || {};
}

function getFeedbacks() {
    return cachedFeedbacks || [];
}

function getLedgerHeadings(type) {
    const all = cachedHeadings || [];
    if (type) return all.filter(h => h.type === type);
    return all;
}

function getLedgerHeadingById(id) {
    return (cachedHeadings || []).find(h => h.id === id) || null;
}

/**
 * Mutation Writers (Async)
 */
async function saveTransaction(tx) {
    if (useSupabase) {
        // Prepare DB payload (snake_case)
        const dbPayload = {
            id: tx.id || 'tx-' + Date.now(),
            date: tx.date,
            type: tx.type,
            category: tx.category,
            particulars: tx.particulars || tx.description || '',
            description: tx.description || tx.particulars || '',
            amount: Number(tx.amount),
            voucher_no: tx.voucherNo || tx.voucher_no,
            source: tx.source || tx.fund_source || 'Internal',
            recorded_by: tx.recordedBy || 'Accountant',
            payment_method: tx.payment_method || 'bank',
            fiscal_year: tx.fiscal_year || null,
            subheading_id: tx.subheading_id || null,
            subheading_amount: Number(tx.subheading_amount || tx.amount || 0)
        };

        const { error } = await supabaseClient
            .from('transactions')
            .upsert(dbPayload);

        if (error) {
            console.error("Error saving to Supabase:", error);
            throw error;
        }
        await syncFromSupabase();
    } else {
        // LocalStorage logic
        const transactions = getTransactions();
        if (tx.id) {
            const idx = transactions.findIndex(t => t.id === tx.id);
            if (idx !== -1) transactions[idx] = { ...transactions[idx], ...tx };
        } else {
            tx.id = 'tx-' + Date.now();
            if (!tx.recordedBy) tx.recordedBy = 'Accountant';
            transactions.push(tx);
        }
        localStorage.setItem(DB_KEY, JSON.stringify(transactions));
        cachedTransactions = transactions;
    }
    return tx;
}

async function deleteTransaction(id) {
    if (useSupabase) {
        const { error } = await supabaseClient
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting from Supabase:", error);
            throw error;
        }
        await syncFromSupabase();
    } else {
        let transactions = getTransactions();
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem(DB_KEY, JSON.stringify(transactions));
        cachedTransactions = transactions;
    }
}

async function saveBudget(category, amount) {
    if (useSupabase) {
        const { error } = await supabase
            .from('budgets')
            .upsert({
                category: category,
                amount: Number(amount)
            });

        if (error) {
            console.error("Error saving budget to Supabase:", error);
            throw error;
        }
        await syncFromSupabase();
    } else {
        const budgets = getBudgets();
        budgets[category] = Number(amount);
        localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
        cachedBudgets = budgets;
    }
    return cachedBudgets;
}

async function saveFeedback(fb) {
    fb.id = 'fb-' + Date.now();
    fb.date = new Date().toISOString().split('T')[0];
    fb.replied = false;
    fb.replyText = null;

    if (useSupabase) {
        const dbPayload = {
            id: fb.id,
            name: fb.name,
            role: fb.role,
            message: fb.message,
            replied: fb.replied,
            reply_text: fb.replyText,
            date: fb.date
        };

        const { error } = await supabase
            .from('feedbacks')
            .insert(dbPayload);

        if (error) {
            console.error("Error sending feedback to Supabase:", error);
            throw error;
        }
        await syncFromSupabase();
    } else {
        const feedbacks = getFeedbacks();
        feedbacks.push(fb);
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
        cachedFeedbacks = feedbacks;
    }
    return fb;
}

async function replyToFeedback(id, text) {
    if (useSupabase) {
        const { error } = await supabase
            .from('feedbacks')
            .update({
                replied: true,
                reply_text: text
            })
            .eq('id', id);

        if (error) {
            console.error("Error updating feedback on Supabase:", error);
            throw error;
        }
        await syncFromSupabase();
    } else {
        const feedbacks = getFeedbacks();
        const idx = feedbacks.findIndex(f => f.id === id);
        if (idx !== -1) {
            feedbacks[idx].replied = true;
            feedbacks[idx].replyText = text;
            localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
            cachedFeedbacks = feedbacks;
        }
    }
}

/**
 * Ledger Heading CRUD (Async)
 */
async function saveLedgerHeading(heading) {
    if (!heading.id) {
        heading.id = 'hd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    }
    heading.school_id = heading.school_id || getSchoolId();
    heading.sort_order = heading.sort_order || 0;

    if (useSupabase) {
        const payload = {
            id: heading.id,
            school_id: heading.school_id,
            type: heading.type,
            parent_id: heading.parent_id || null,
            name_ne: heading.name_ne,
            name_en: heading.name_en || heading.name_ne,
            sort_order: heading.sort_order
        };
        const { error } = await supabaseClient.from('ledger_headings').upsert(payload);
        if (error) { console.error('Error saving heading:', error); throw error; }
        await syncFromSupabase();
    } else {
        const existing = cachedHeadings.findIndex(h => h.id === heading.id);
        if (existing !== -1) {
            cachedHeadings[existing] = heading;
        } else {
            cachedHeadings.push(heading);
        }
        localStorage.setItem(HEADINGS_KEY, JSON.stringify(cachedHeadings));
    }
    return heading;
}

async function deleteLedgerHeading(id) {
    if (useSupabase) {
        // Delete children first
        await supabaseClient.from('ledger_headings').delete().eq('parent_id', id);
        const { error } = await supabaseClient.from('ledger_headings').delete().eq('id', id);
        if (error) { console.error('Error deleting heading:', error); throw error; }
        await syncFromSupabase();
    } else {
        // Remove heading and all its children
        cachedHeadings = cachedHeadings.filter(h => h.id !== id && h.parent_id !== id);
        localStorage.setItem(HEADINGS_KEY, JSON.stringify(cachedHeadings));
    }
}

/**
 * Currency Formatting Helpers (unchanged)
 */
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
        const groupedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
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

// Explicitly attach to window to prevent "is not defined" errors when caching goes wrong
window.initDatabase = initDatabase;
window.getTransactions = getTransactions;
window.saveTransaction = saveTransaction;
window.deleteTransaction = deleteTransaction;
window.loadDynamicCategories = loadDynamicCategories;
window.getLedgerHeadings = getLedgerHeadings;
window.getLedgerHeadingById = getLedgerHeadingById;
window.saveLedgerHeading = saveLedgerHeading;
window.deleteLedgerHeading = deleteLedgerHeading;
window.getSchoolId = getSchoolId;
window.formatCurrency = formatCurrency;
window.formatNepaliStyleNumber = formatNepaliStyleNumber;
window.toNepaliDigits = toNepaliDigits;
