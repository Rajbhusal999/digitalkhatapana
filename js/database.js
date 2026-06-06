/**
 * database.js - Data Access Layer & Shared Utilities
 * Refactored to support Supabase Cloud Database with LocalStorage Fallback.
 */

let DB_KEY = 'nepal_school_finances';
let BUDGET_KEY = 'nepal_school_budgets';
let FEEDBACK_KEY = 'nepal_school_feedbacks';
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
}

// Standard Categories
const INCOME_CATEGORIES = {
    'gov_conditional': { en: 'Government Conditional Grant', ne: 'संघीय सशर्त अनुदान' },
    'local_level': { en: 'Local Government Budget', ne: 'स्थानीय तह अनुदान' },
    'internal_source': { en: 'School Internal Source', ne: 'विद्यालय आन्तरिक स्रोत' },
    'mid_day_meal': { en: 'Mid-Day Meal Program Budget', ne: 'दिवा खाजा अनुदान' },
    'donation': { en: 'Donations & Charity', ne: 'चन्दा र सहयोग' },
    'misc_income': { en: 'Miscellaneous Income', ne: 'विविध आय' }
};

const EXPENSE_CATEGORIES = {
    'salary': { en: 'Teacher & Staff Salary', enShort: 'Salary', ne: 'शिक्षक तथा कर्मचारी तलब' },
    'infrastructure': { en: 'Infrastructure & Repair', enShort: 'Infrastructure', ne: 'भौतिक निर्माण तथा मर्मत' },
    'materials': { en: 'Educational & IT Materials', enShort: 'Materials', ne: 'शैक्षिक तथा सूचना-प्रविधि सामग्री' },
    'meal_cost': { en: 'Mid-Day Meal Expenses', enShort: 'Meal Management', ne: 'दिवा खाजा व्यवस्थापन खर्च' },
    'scholarship': { en: 'Student Scholarships', enShort: 'Scholarships', ne: 'विद्यार्थी छात्रवृत्ति वितरण' },
    'office_ops': { en: 'Office Operations & Stationery', enShort: 'Office Ops', ne: 'कार्यालय सञ्चालन र मसलन्द' },
    'misc_expense': { en: 'Miscellaneous Expense', enShort: 'Misc', ne: 'विविध खर्च' }
};

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

// Connection variables
let supabase = null;
let useSupabase = false;

// Memory Cache
let cachedTransactions = [];
let cachedBudgets = {};
let cachedFeedbacks = [];

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
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
}

/**
 * Supabase Data Sync Handlers
 */
async function syncFromSupabase() {
    try {
        // Fetch transactions
        const txRes = await supabase.from('transactions').select('*');
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
            source: item.source,
            recordedBy: item.recorded_by
        }));

        // Fetch budgets
        const bgRes = await supabase.from('budgets').select('*');
        if (bgRes.error) throw bgRes.error;
        cachedBudgets = {};
        bgRes.data.forEach(item => {
            cachedBudgets[item.category] = Number(item.amount);
        });

        // Fetch feedbacks
        const fbRes = await supabase.from('feedbacks').select('*');
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
            particulars: tx.particulars,
            amount: Number(tx.amount),
            voucher_no: tx.voucherNo,
            source: tx.source,
            recorded_by: tx.recordedBy || 'Ram Bahadur Thapa (Accountant)'
        };

        const { error } = await supabase
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
            if (idx !== -1) transactions[idx] = tx;
        } else {
            tx.id = 'tx-' + Date.now();
            tx.recordedBy = 'Ram Bahadur Thapa (Accountant)';
            transactions.push(tx);
        }
        localStorage.setItem(DB_KEY, JSON.stringify(transactions));
        cachedTransactions = transactions;
    }
    return tx;
}

async function deleteTransaction(id) {
    if (useSupabase) {
        const { error } = await supabase
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
