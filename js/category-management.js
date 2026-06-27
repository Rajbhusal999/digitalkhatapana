/**
 * js/category-management.js - Administrative Category Management Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate check
    const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'admin.html';
        return;
    }

    // 2. Initialize database (resolves school from Supabase)
    try {
        await initDatabase();
    } catch (e) {
        console.error('Database initialization failed:', e);
    }

    // 3. Set default brand layout and render
    updateSchoolHeader();
    renderCategoryLists();
});

/**
 * Brand header updater
 */
function updateSchoolHeader() {
    // Use window._activeSchoolInfo resolved from Supabase by database.js
    const schoolInfo = window._activeSchoolInfo;
    if (!schoolInfo) return;
    try {
        const titleEl = document.getElementById('adm-school-name');
        const subEl = document.getElementById('adm-school-sub');
        const userEl = document.getElementById('adm-user-name');
        if (titleEl && schoolInfo.schoolName) {
            titleEl.innerText = schoolInfo.schoolName;
        }
        if (subEl && schoolInfo.address) {
            subEl.innerText = `लेखा तथा बजेट प्रशासन केन्द्र (${schoolInfo.address})`;
        }
        if (userEl && (schoolInfo.accountantName || schoolInfo.principalName)) {
            userEl.innerText = `प्रयोक्ता: ${schoolInfo.accountantName || '-'} (लेखापाल) | प्र.अ.: ${schoolInfo.principalName || '-'}`;
        }

        const logoContainer = document.getElementById('adm-school-logo-container');
        if (logoContainer && schoolInfo.logo) {
            logoContainer.innerHTML = `<img src="${schoolInfo.logo}" alt="Logo" class="gov-logo" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--secondary); box-shadow: 0 4px 6px rgba(0,0,0,0.15);">`;
        }
    } catch (e) {
        console.error('Error loading school details:', e);
    }
}

/**
 * Render Side-by-Side Lists
 */
function renderCategoryLists() {
    const incList = document.getElementById('income-categories-list');
    const expList = document.getElementById('expense-categories-list');
    
    if (!incList || !expList) return;
    
    incList.innerHTML = '';
    expList.innerHTML = '';
    
    // Render income categories
    Object.keys(INCOME_CATEGORIES).forEach(key => {
        const cat = INCOME_CATEGORIES[key];
        if (!cat) return;
        const item = document.createElement('li');
        item.className = 'category-item';
        item.innerHTML = `
            <div>
                <strong>${cat.ne || ''}</strong>
                <span style="display:block; font-size:0.8rem; color:var(--text-muted);">${cat.en || ''}</span>
            </div>
            <span class="category-badge">${key}</span>
        `;
        incList.appendChild(item);
    });
    
    // Render expense categories
    Object.keys(EXPENSE_CATEGORIES).forEach(key => {
        const cat = EXPENSE_CATEGORIES[key];
        if (!cat) return;
        const item = document.createElement('li');
        item.className = 'category-item';
        item.innerHTML = `
            <div>
                <strong>${cat.ne || ''}</strong>
                <span style="display:block; font-size:0.8rem; color:var(--text-muted);">${cat.en || ''}</span>
            </div>
            <span class="category-badge">${key}</span>
        `;
        expList.appendChild(item);
    });
}

/**
 * Handle new category submission
 */
function handleCategorySubmit(event) {
    event.preventDefault();
    
    const type = document.getElementById('cat-type').value;
    const neName = document.getElementById('cat-ne-name').value.trim();
    const enName = document.getElementById('cat-en-name').value.trim();
    
    if (!neName || !enName) {
        showAdmToast('कृपया शीर्षकको नाम भर्नुहोस्।', 'error');
        return;
    }
    
    // Generate a safe alphanumeric lowercase key
    const key = enName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    
    // Check for duplicate keys
    const targetMap = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (targetMap[key]) {
        showAdmToast('यो शीर्षक पहिल्यै उपलब्ध छ वा समान नाम छ! (Duplicate Key)', 'error');
        return;
    }
    
    try {
        saveCustomCategory(type, key, neName, enName);
        showAdmToast('शीर्षक सफलतापूर्वक थपियो!', 'success');
        
        // Reset form and re-render lists
        document.getElementById('category-entry-form').reset();
        renderCategoryLists();
    } catch(err) {
        console.error(err);
        showAdmToast('शीर्षक थप्न असफल भयो।', 'error');
    }
}

/**
 * Toast Helper
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
    }, 4000);
}
