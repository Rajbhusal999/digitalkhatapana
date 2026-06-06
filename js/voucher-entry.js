/**
 * js/voucher-entry.js - Standalone Voucher Entry Page Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate check
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    if (!isLoggedIn) {
        // Redirect back to admin portal login
        window.location.href = 'admin.html';
        return;
    }

    // 2. Set default brand layout
    updateSchoolHeader();

    // 3. Initialize keys and populate category dropdown instantly
    initKeys();
    handleTypeChange();

    // 4. Initialize database connection in the background
    try {
        await initDatabase();
    } catch (e) {
        console.error("Database initialization failed:", e);
    }

    // 5. Default date is today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tx-date').value = today;
});

/**
 * Brand header updater
 */
function updateSchoolHeader() {
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
                console.error('Error recovering school info:', e);
            }
        }
    }
    if (schoolInfoStr) {
        try {
            const schoolInfo = JSON.parse(schoolInfoStr);
            const titleEl = document.getElementById('adm-school-name');
            const subEl = document.getElementById('adm-school-sub');
            const userEl = document.getElementById('adm-user-name');
            if (titleEl && schoolInfo.schoolName) {
                titleEl.innerText = schoolInfo.schoolName;
            }
            if (subEl && schoolInfo.address) {
                subEl.innerText = `लेखा तथा बजेट प्रशासन केन्द्र (${schoolInfo.address})`;
            }
            if (userEl && schoolInfo.accountant) {
                userEl.innerText = `प्रयोक्ता: ${schoolInfo.accountant} (लेखापाल) | प्र.अ.: ${schoolInfo.principal || '-'}`;
            }

            const logoContainer = document.getElementById('adm-school-logo-container');
            if (logoContainer && schoolInfo.logo) {
                logoContainer.innerHTML = `<img src="${schoolInfo.logo}" alt="Logo" class="gov-logo" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--secondary); box-shadow: 0 4px 6px rgba(0,0,0,0.15);">`;
            }

            if (schoolInfo.photo) {
                document.body.style.backgroundImage = `linear-gradient(rgba(244, 246, 249, 0.93), rgba(244, 246, 249, 0.93)), url('${schoolInfo.photo}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundAttachment = 'fixed';
                document.body.style.backgroundPosition = 'center';
            }
        } catch (e) {
            console.error('Error loading school details:', e);
        }
    }
}

/**
 * Form type changes (Swaps category options between income & expense types)
 */
function handleTypeChange() {
    const type = document.getElementById('tx-type').value;
    const catSelect = document.getElementById('tx-category');
    if (!catSelect) return;
    
    catSelect.innerHTML = '';
    
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    Object.keys(categories).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerText = `${categories[key].ne} (${categories[key].en})`;
        catSelect.appendChild(opt);
    });
}

/**
 * Handle new voucher submission
 */
async function handleVoucherSubmit(event) {
    event.preventDefault();

    const type = document.getElementById('tx-type').value;
    const cat = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const vch = document.getElementById('tx-voucher').value.trim();
    const part = document.getElementById('tx-particulars').value.trim();
    const src = document.getElementById('tx-source').value.trim();
    const amt = Number(document.getElementById('tx-amount').value);

    if (!vch || !part || !src || isNaN(amt) || amt <= 0) {
        showAdmToast('कृपया सबै आवश्यक फिल्डहरू सही भर्नुहोस्।', 'error');
        return;
    }

    const transaction = {
        type: type,
        category: cat,
        date: date,
        voucherNo: vch,
        particulars: part,
        source: src,
        amount: amt
    };

    try {
        await saveTransaction(transaction);
        
        let hasAlert = false;
        if (type === 'expense') {
            hasAlert = checkBudgetAlert(cat, amt);
        }

        showAdmToast('नयाँ भौचर सफलतापूर्वक सुरक्षित गरियो!', 'success');
        
        // Redirect back to dashboard after a delay (longer if budget warning triggered so they can read it)
        const redirectDelay = hasAlert ? 3500 : 1500;
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, redirectDelay);
    } catch (err) {
        console.error(err);
        showAdmToast('डाटाबेसमा भौचर सुरक्षित गर्न असफल भयो।', 'error');
    }
}

/**
 * Budget warning alert
 */
function checkBudgetAlert(category, expAmt) {
    const budgets = getBudgets();
    const transactions = getTransactions();
    
    const cap = budgets[category] || 0;
    
    let categoryTotal = 0;
    transactions.forEach(t => {
        if (t.type === 'expense' && t.category === category) {
            categoryTotal += Number(t.amount);
        }
    });
    
    if (categoryTotal > cap) {
        const catLabel = EXPENSE_CATEGORIES[category] ? EXPENSE_CATEGORIES[category].ne : category;
        showAdmToast(`⚠️ बजेट चेतावनी: "${catLabel}" को बजेट सीमा नाघ्यो! (${formatCurrency(categoryTotal - cap)} बढी)`, 'error');
        return true;
    }
    return false;
}

/**
 * Toast helper
 */
function showAdmToast(message, type = 'success') {
    const container = document.getElementById('adm-toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4500);
}
