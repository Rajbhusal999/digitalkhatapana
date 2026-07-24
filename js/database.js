/**
 * database.js - Data Access Layer (Trimmed)
 */
let supabaseClient = null;
let cachedRegisteredSchools = [];
window._activeSchoolInfo = null;

function getSchoolId() {
    const email = sessionStorage.getItem('school_user_email');
    if (email) return email.replace(/[^a-zA-Z0-9@.]/g, '');
    if (window._activeSchoolInfo && window._activeSchoolInfo.schoolEmail) {
        return window._activeSchoolInfo.schoolEmail.replace(/[^a-zA-Z0-9@.]/g, '');
    }
    return 'default';
}

async function initDatabase() {
    const hasConfig = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY;
    if (!hasConfig || !window.supabase) return;
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check Supabase Auth session
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        sessionStorage.setItem('school_user_logged_in', 'true');
        sessionStorage.setItem('school_user_email', session.user.email);
        await _resolveActiveSchoolInfo(session.user.email);
    } else {
        // If there's no supabase session but sessionStorage says logged in, it's faked/expired!
        if (sessionStorage.getItem('school_user_logged_in') === 'true') {
             sessionStorage.removeItem('school_user_logged_in');
             sessionStorage.removeItem('school_user_email');
             // Optionally redirect to login immediately if we are on a protected page
             if (window.location.pathname.includes('landing.html') || window.location.pathname.includes('reports.html')) {
                 window.location.replace('digitalkhatapana.html');
             }
        }
    }
    
    await fetchRegisteredSchools();
}

async function _resolveActiveSchoolInfo(email) {
    if (!supabaseClient || !email) return;
    try {
        const { data, error } = await supabaseClient.from('registered_schools').select('*').ilike('school_email', email).single();
        if (error || !data) return;
        window._activeSchoolInfo = _mapSchool(data);
    } catch (e) {
        console.error('Error resolving active school:', e);
    }
}

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

async function fetchRegisteredSchools() {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient.from('registered_schools').select('*');
    if (!error && data) {
        cachedRegisteredSchools = data.map(_mapSchool);
    }
    return cachedRegisteredSchools;
}

window.initDatabase = initDatabase;
window.getSchoolId = getSchoolId;
window.fetchRegisteredSchools = fetchRegisteredSchools;
