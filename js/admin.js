/**
 * admin.js - Administrative Portal Controller
 * Controls authentication, transaction CRUD, budget configurations, and feedback responses.
 */

let activeTab = 'overview';
let activeEditId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize database (resolves school from Supabase via session email)
    try {
        await initDatabase();
    } catch (e) {
        console.error('Database initialization failed (Supabase connection issues?):', e);
    }

    updateSchoolHeader();
    initAdminPage();
    
    // Refresh UI elements after Supabase data syncs
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        updateAdminMetrics();
        handleTypeChange();
        renderOverviewTable();
        renderBudgetPlanner();
        renderFeedbackInbox();
        renderAdmTransactionsTable();
    }
});

/**
 * Authentication Gate Checks
 */

function handleLogout() {
    sessionStorage.removeItem('admin_logged_in');
    showAdmToast('Logged out successfully.', 'info');
    setTimeout(() => {
        location.reload();
    }, 500);
}

/**
 * Page Initializations
 */
function initAdminPage() {
    if (sessionStorage.getItem('admin_logged_in') !== 'true') return;
    
    updateSchoolHeader();
    updateAdminMetrics();
    handleTypeChange(); // populate category dropdown for the entry form
    renderOverviewTable();
    renderBudgetPlanner();
    renderFeedbackInbox();
    renderAdmTransactionsTable();
    renderAssetsTable();
    renderAdminHeadings();
}

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

        // Update School Logo if custom logo uploaded
        const logoContainer = document.getElementById('adm-school-logo-container');
        if (logoContainer && schoolInfo.logo) {
            logoContainer.innerHTML = `<img src="${schoolInfo.logo}" alt="Logo" class="gov-logo" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--secondary); box-shadow: 0 4px 6px rgba(0,0,0,0.15);">`;
        }
    } catch (e) {
        console.error('Error loading school details in Admin Panel:', e);
    }
}

/**
 * Switch Dashboard Tabs
 */
function switchTab(tabId) {
    activeTab = tabId;
    
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Deactivate all nav buttons
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show active tab
    const tabEl = document.getElementById('tab-' + tabId);
    if (tabEl) tabEl.classList.remove('hidden');
    
    // Activate nav button
    const btnEl = document.getElementById('nav-btn-' + tabId);
    if (btnEl) btnEl.classList.add('active');
    
    // Refresh components
    if (tabId === 'overview') {
        renderOverviewTable();
        updateAdminMetrics();
    } else if (tabId === 'transactions') {
        renderAdmTransactionsTable();
    } else if (tabId === 'budget') {
        renderBudgetPlanner();
    } else if (tabId === 'feedback') {
        renderFeedbackInbox();
    } else if (tabId === 'assets') {
        renderAssetsTable();
    } else if (tabId === 'headings') {
        renderAdminHeadings();
    }
}

/**
 * Update Admin financial overview KPIs
 */
function updateAdminMetrics() {
    const transactions = getTransactions();
    let income = 0;
    let expense = 0;
    
    transactions.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'income') {
            income += amt;
        } else {
            expense += amt;
        }
    });
    
    const balance = income - expense;
    
    document.getElementById('adm-val-revenue').innerText = formatCurrency(income);
    document.getElementById('adm-val-expenses').innerText = formatCurrency(expense);
    
    const balanceEl = document.getElementById('adm-val-balance');
    balanceEl.innerText = formatCurrency(balance);
    if (balance < 0) {
        balanceEl.style.color = 'var(--danger)';
    } else {
        balanceEl.style.color = '';
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
 * Render overview recent transaction logs (Top 6 records)
 */
function renderOverviewTable() {
    const tbody = document.getElementById('adm-recent-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const transactions = getTransactions();
    // Sort transactions by date descending
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 6);
    
    recent.forEach(t => {
        let catLabel = '';
        if (t.type === 'income') {
            catLabel = INCOME_CATEGORIES[t.category] ? INCOME_CATEGORIES[t.category].ne : t.category;
        } else {
            catLabel = EXPENSE_CATEGORIES[t.category] ? EXPENSE_CATEGORIES[t.category].ne : t.category;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td><code>${t.voucherNo}</code></td>
            <td>
                <div class="particulars-cell">
                    <div class="particulars-title" style="font-weight: 500;">${t.particulars}</div>
                    <div class="particulars-details">
                        <span><strong>Source:</strong> ${t.source}</span>
                    </div>
                </div>
            </td>
            <td>${catLabel}</td>
            <td><span class="badge ${t.type}">${t.type === 'income' ? 'आम्दानी' : 'खर्च'}</span></td>
            <td class="amount-col ${t.type}">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
            </td>
            <td>
                <div class="btn-action-group">
                    <button class="btn-icon edit" onclick="handleEditTransaction('${t.id}')" title="Edit">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="handleDeleteTransaction('${t.id}')" title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No records found.</td></tr>`;
    }
}

/**
 * Render complete transactions table for Record Ledger panel search
 */
function renderAdmTransactionsTable() {
    const tbody = document.getElementById('adm-search-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const transactions = getTransactions();
    const query = document.getElementById('adm-search-input').value.toLowerCase().trim();
    
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sorted.forEach(t => {
        if (query) {
            const partMatch = t.particulars.toLowerCase().includes(query);
            const vchMatch = (t.voucherNo || '').toLowerCase().includes(query);
            const srcMatch = (t.source || '').toLowerCase().includes(query);
            if (!partMatch && !vchMatch && !srcMatch) return;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${t.voucherNo}</code></td>
            <td>
                <div style="font-weight:500;">${t.particulars}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">
                    ${formatDate(t.date)} | Source: ${t.source}
                </div>
            </td>
            <td class="amount-col ${t.type}" style="font-size:0.8rem;">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
            </td>
            <td style="text-align:center;">
                <div class="btn-action-group" style="justify-content:center;">
                    ${t.receipt_url ? `<button class="btn-icon view" title="View Receipt" onclick="window.open('${t.receipt_url}', '_blank')">🧾</button>` : ''}
                    <button class="btn-icon edit" onclick="handleEditTransaction('${t.id}')">
                        ✏️
                    </button>
                    <button class="btn-icon delete" onclick="handleDeleteTransaction('${t.id}')">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Submit Ledger Transactions
 */
async function handleLedgerSubmit(event) {
    event.preventDefault();
    
    const type = document.getElementById('tx-type').value;
    const cat = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const vch = document.getElementById('tx-voucher').value.trim();
    const part = document.getElementById('tx-particulars').value.trim();
    const src = document.getElementById('tx-source').value.trim();
    const amt = Number(document.getElementById('tx-amount').value);
    const receiptFile = document.getElementById('tx-receipt').files[0];
    
    if (!vch || !part || !src || isNaN(amt) || amt <= 0) {
        showAdmToast('Please check form fields for accuracy.', 'error');
        return;
    }
    
    let receipt_url = null;
    if (receiptFile) {
        try {
            receipt_url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(receiptFile);
            });
        } catch (e) {
            console.error("Error reading receipt file:", e);
        }
    }

    const transaction = {
        type: type,
        category: cat,
        date: date,
        voucherNo: vch,
        particulars: part,
        source: src,
        amount: amt,
        receipt_url: receipt_url
    };
    
    if (activeEditId) {
        transaction.id = activeEditId;
    }
    
    try {
        // Save to Database
        await saveTransaction(transaction);
        
        // Check if this expenditure exceeds budget cap
        if (type === 'expense') {
            checkBudgetAlert(cat, amt);
        }
        
        showAdmToast(activeEditId ? 'Voucher modified successfully!' : 'New voucher logged successfully!', 'success');
        
        resetForm();
        initAdminPage(); // Refresh metrics, forms, and tables
    } catch (err) {
        showAdmToast('Failed to save record to database.', 'error');
    }
}

/**
 * Check budget threshold alert on saving expenditure
 */
function checkBudgetAlert(category, expAmt) {
    const budgets = getBudgets();
    const transactions = getTransactions();
    
    const cap = budgets[category] || 0;
    
    // Compute total expenditure on this category
    let categoryTotal = 0;
    transactions.forEach(t => {
        if (t.type === 'expense' && t.category === category) {
            categoryTotal += Number(t.amount);
        }
    });
    
    if (categoryTotal > cap) {
        const catLabel = EXPENSE_CATEGORIES[category] ? EXPENSE_CATEGORIES[category].ne : category;
        showAdmToast(`⚠️ BUDGET WARNING: Category "${catLabel}" has exceeded its budget cap by ${formatCurrency(categoryTotal - cap)}!`, 'error');
    }
}

/**
 * Edit Transaction Trigger
 */
function handleEditTransaction(id) {
    const transactions = getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    activeEditId = id;
    
    // Switch to Record Ledger Tab
    switchTab('transactions');
    
    // Pre-fill Form
    document.getElementById('tx-id-input').value = tx.id;
    document.getElementById('tx-type').value = tx.type;
    
    // Populate categories according to type before selecting
    handleTypeChange();
    
    document.getElementById('tx-category').value = tx.category;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-voucher').value = tx.voucherNo;
    document.getElementById('tx-particulars').value = tx.particulars;
    document.getElementById('tx-source').value = tx.source;
    document.getElementById('tx-amount').value = tx.amount;
    
    document.getElementById('form-entry-title').innerText = 'भौचर संशोधन फारम (Modify Ledger)';
}

/**
 * Delete Transaction
 */
async function handleDeleteTransaction(id) {
    if (confirm('Are you sure you want to delete this voucher from the ledger? This cannot be undone.')) {
        try {
            await deleteTransaction(id);
            showAdmToast('Ledger record removed successfully.', 'info');
            initAdminPage();
        } catch (err) {
            showAdmToast('Failed to delete transaction from database.', 'error');
        }
    }
}

function resetForm() {
    activeEditId = null;
    document.getElementById('tx-id-input').value = '';
    document.getElementById('ledger-entry-form').reset();
    document.getElementById('form-entry-title').innerText = 'आम्दानी तथा खर्च प्रविष्टि फारम';
    handleTypeChange();
}

/**
 * Render Budget Planner Adjustments
 */
function renderBudgetPlanner() {
    const editContainer = document.getElementById('budget-edit-container');
    const statusContainer = document.getElementById('adm-budget-progress-container');
    
    if (!editContainer || !statusContainer) return;
    
    const budgets = getBudgets();
    const transactions = getTransactions();
    
    // Calculate total expense for each category
    const expenseTotals = {};
    Object.keys(EXPENSE_CATEGORIES).forEach(cat => {
        expenseTotals[cat] = 0;
    });
    
    transactions.forEach(t => {
        if (t.type === 'expense' && expenseTotals[t.category] !== undefined) {
            expenseTotals[t.category] += Number(t.amount);
        }
    });
    
    editContainer.innerHTML = '';
    statusContainer.innerHTML = '';
    
    Object.keys(EXPENSE_CATEGORIES).forEach(cat => {
        const budgetCap = budgets[cat] || 0;
        const actualSpent = expenseTotals[cat] || 0;
        const percentage = budgetCap > 0 ? Math.round((actualSpent / budgetCap) * 100) : 0;
        
        // Tab 3 Panel Left - Budget Config Input fields
        const editItem = document.createElement('div');
        editItem.className = 'budget-edit-item';
        editItem.innerHTML = `
            <div>
                <strong style="display:block; font-size:0.9rem;">${EXPENSE_CATEGORIES[cat].ne}</strong>
                <span style="font-size:0.75rem; color:#94A3B8;">${EXPENSE_CATEGORIES[cat].en}</span>
            </div>
            <div>
                <input type="number" name="budget-${cat}" min="0" value="${budgetCap}" style="padding:8px 12px; border-radius:6px; border:1px solid var(--border); width:100%; text-align:right;">
            </div>
        `;
        editContainer.appendChild(editItem);
        
        // Tab 3 Panel Right - Status Progress Meters
        let progressClass = 'normal';
        if (percentage >= 100) {
            progressClass = 'danger';
        } else if (percentage >= 85) {
            progressClass = 'warning';
        }
        
        const statusItemHTML = `
            <div class="budget-item" style="margin-bottom:12px;">
                <div class="budget-item-info">
                    <span class="budget-label" style="color:var(--text-main); font-weight:600;">
                        ${EXPENSE_CATEGORIES[cat].ne}
                    </span>
                    <span class="budget-values" style="font-size:0.8rem;">
                        ${formatCurrency(actualSpent)} / ${formatCurrency(budgetCap)} (${percentage}%)
                        ${actualSpent > budgetCap ? `<span class="overbudget-badge">Over Limit</span>` : ''}
                    </span>
                </div>
                <div class="progress-track" style="height:6px;">
                    <div class="progress-fill ${progressClass}" style="width: ${Math.min(percentage, 100)}%;"></div>
                </div>
            </div>
        `;
        statusContainer.insertAdjacentHTML('beforeend', statusItemHTML);
    });
}

async function handleBudgetSubmit(event) {
    event.preventDefault();
    const budgets = getBudgets();
    
    try {
        const promises = [];
        Object.keys(EXPENSE_CATEGORIES).forEach(cat => {
            const inputEl = document.querySelector(`input[name="budget-${cat}"]`);
            if (inputEl) {
                const newCap = Number(inputEl.value);
                promises.push(saveBudget(cat, newCap));
            }
        });
        
        await Promise.all(promises);
        
        showAdmToast('Annual budget limitations configuration updated.', 'success');
        renderBudgetPlanner();
        updateAdminMetrics();
    } catch (err) {
        showAdmToast('Failed to update budget settings.', 'error');
    }
}

/**
 * Render Public Grievances Board
 */
function renderFeedbackInbox() {
    const tbody = document.getElementById('adm-feedback-tbody');
    const badge = document.getElementById('feedback-badge-count');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const feedbacks = getFeedbacks();
    
    // Sort feedbacks: pending answers first, then date descending
    const sorted = [...feedbacks].sort((a,b) => {
        if (a.replied === b.replied) {
            return new Date(b.date) - new Date(a.date);
        }
        return a.replied ? 1 : -1;
    });
    
    let pendingCount = 0;
    
    sorted.forEach(fb => {
        if (!fb.replied) pendingCount++;
        
        const row = document.createElement('tr');
        
        let actionHTML = '';
        if (fb.replied) {
            actionHTML = `<span style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">Answered</span>`;
        } else {
            actionHTML = `
                <button class="btn-portal" style="padding:6px 12px; font-size:0.8rem; box-shadow:none;" onclick="openReplyModal('${fb.id}')">
                    Reply (जवाफ दिनुहोस्)
                </button>
            `;
        }
        
        const statusBadge = fb.replied 
            ? `<span class="badge income" style="font-size:0.7rem;">सम्बोधित (Replied)</span>`
            : `<span class="badge expense" style="font-size:0.7rem;">बाँकी (Pending)</span>`;
            
        row.innerHTML = `
            <td>${formatDate(fb.date)}</td>
            <td>
                <strong>${fb.name}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${fb.role}</div>
            </td>
            <td>
                <div style="font-style:italic; font-size:0.85rem; color:var(--text-main);">"${fb.message}"</div>
                ${fb.replied ? `<div style="margin-top:6px; border-left:2px solid var(--primary); padding-left:8px; font-size:0.8rem; color:var(--text-muted);"><strong>Reply:</strong> ${fb.replyText}</div>` : ''}
            </td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center;">${actionHTML}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Manage feedback navigation count badge
    if (pendingCount > 0) {
        badge.innerText = pendingCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
    
    if (feedbacks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Inbox is empty. No public messages yet.</td></tr>`;
    }
}

/**
 * Open Reply Dialog
 */
function openReplyModal(fbId) {
    const feedbacks = getFeedbacks();
    const fb = feedbacks.find(f => f.id === fbId);
    if (!fb) return;
    
    document.getElementById('reply-fb-id').value = fb.id;
    document.getElementById('reply-author-label').innerText = `${fb.name} (${fb.role}) - Submitted on ${formatDate(fb.date)}`;
    document.getElementById('reply-message-text').innerText = `"${fb.message}"`;
    document.getElementById('reply-text').value = '';
    
    document.getElementById('reply-modal-overlay').classList.add('active');
}

function closeReplyModal() {
    document.getElementById('reply-modal-overlay').classList.remove('active');
}

async function handleFeedbackReplySubmit(event) {
    event.preventDefault();
    const fbId = document.getElementById('reply-fb-id').value;
    const replyText = document.getElementById('reply-text').value.trim();
    
    if (!replyText) {
        showAdmToast('Please write an answer before submitting.', 'error');
        return;
    }
    
    try {
        await replyToFeedback(fbId, replyText);
        showAdmToast('Official reply dispatched successfully.', 'success');
        closeReplyModal();
        renderFeedbackInbox();
    } catch (err) {
        showAdmToast('Failed to send reply to database.', 'error');
    }
}



/**
 * Toast notifications helpers
 */
function showAdmToast(message, type = 'success') {
    const container = document.getElementById('adm-toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-weight:bold;" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 50);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * ══════════════════════════════════════════════
 * ASSETS MANAGEMENT
 * ══════════════════════════════════════════════
 */
async function handleAssetSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('asset-id-input').value;
    const name = document.getElementById('asset-name').value.trim();
    const category = document.getElementById('asset-category').value;
    const date = document.getElementById('asset-date').value;
    const value = document.getElementById('asset-value').value || 0;
    const condition = document.getElementById('asset-condition').value;
    const location = document.getElementById('asset-location').value.trim();

    if (!name || !date) {
        showAdmToast('Please fill in required fields.', 'error');
        return;
    }

    const asset = {
        asset_name: name,
        category: category,
        purchase_date: date,
        value: Number(value),
        condition: condition,
        location: location
    };

    if (id) {
        asset.id = id;
    }

    try {
        await saveAsset(asset);
        showAdmToast(id ? 'Asset updated successfully.' : 'Asset added successfully.', 'success');
        resetAssetForm();
        renderAssetsTable();
    } catch (err) {
        showAdmToast('Failed to save asset.', 'error');
    }
}

function renderAssetsTable() {
    const tbody = document.getElementById('adm-assets-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const assets = getAssets();
    
    if (assets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No assets recorded.</td></tr>`;
        return;
    }

    assets.forEach(a => {
        let conditionColor = 'var(--success)';
        if (a.condition === 'Fair') conditionColor = 'var(--warning)';
        else if (a.condition === 'Poor') conditionColor = 'var(--danger)';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight: 500;">${a.asset_name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${a.location ? 'Loc: ' + a.location : ''} | Date: ${formatDate(a.purchase_date)}</div>
            </td>
            <td>${a.category}</td>
            <td class="amount-col income" style="font-weight: 600;">${formatCurrency(a.value)}</td>
            <td><span style="color:${conditionColor}; font-weight: bold; font-size: 0.8rem;">${a.condition}</span></td>
            <td style="text-align:center;">
                <div class="btn-action-group" style="justify-content:center;">
                    <button class="btn-icon edit" onclick="handleEditAsset('${a.id}')">✏️</button>
                    <button class="btn-icon delete" onclick="handleDeleteAsset('${a.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function handleEditAsset(id) {
    const assets = getAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    document.getElementById('asset-id-input').value = asset.id;
    document.getElementById('asset-name').value = asset.asset_name;
    document.getElementById('asset-category').value = asset.category;
    document.getElementById('asset-date').value = asset.purchase_date;
    document.getElementById('asset-value').value = asset.value;
    document.getElementById('asset-condition').value = asset.condition;
    document.getElementById('asset-location').value = asset.location;
}

async function handleDeleteAsset(id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        try {
            await deleteAsset(id);
            showAdmToast('Asset deleted successfully.', 'info');
            renderAssetsTable();
        } catch (err) {
            showAdmToast('Failed to delete asset.', 'error');
        }
    }
}

function resetAssetForm() {
    document.getElementById('asset-entry-form').reset();
    document.getElementById('asset-id-input').value = '';
}

/**
 * ══════════════════════════════════════════════
 * HEADING MANAGEMENT (Admin)
 * ══════════════════════════════════════════════
 */
function renderAdminHeadings() {
    renderAdminHeadingList('income', 'admin-income-headings-list');
    renderAdminHeadingList('expense', 'admin-expense-headings-list');
}

function renderAdminHeadingList(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const headings = window.getLedgerHeadings ? window.getLedgerHeadings(type) : [];
    const parents = headings.filter(h => !h.parent_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    container.innerHTML = '';
    if (parents.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">कुनै शीर्षक छैन।</p>';
        return;
    }

    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        const childrenHTML = children.map(child => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-left: 20px; border-bottom: 1px dashed #eee;">
                <span>
                    <span style="background: var(--secondary); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px;">उप</span>
                    ${child.name_ne} <small style="color:#888;">${child.name_en||''}</small>
                </span>
                <div class="btn-action-group" style="justify-content: flex-end; gap: 4px;">
                    <button class="btn-icon edit" onclick="openAdminEditHeading('${child.id}')" title="Edit">✏️</button>
                    <button class="btn-icon delete" onclick="confirmAdminDeleteHeading('${child.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');

        container.innerHTML += `
            <div style="margin-bottom: 10px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span>
                        <span style="background: var(--primary); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 6px;">मु</span>
                        <strong>${parent.name_ne}</strong> <small style="color:#888;">${parent.name_en||''}</small>
                    </span>
                    <div class="btn-action-group" style="justify-content: flex-end; gap: 4px;">
                        <button class="btn-icon" style="background: var(--primary-light); color: var(--primary);" onclick="openAdminAddSubHeading('${parent.id}','${type}')" title="Add Subheading">+ उप</button>
                        <button class="btn-icon edit" onclick="openAdminEditHeading('${parent.id}')" title="Edit">✏️</button>
                        <button class="btn-icon delete" onclick="confirmAdminDeleteHeading('${parent.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                ${childrenHTML}
            </div>`;
    });
}

function openAdminAddHeading(type) {
    document.getElementById('admin-hm-modal-title').innerText = 'नयाँ मुख्य शीर्षक थप्नुहोस्';
    document.getElementById('admin-hm-id').value = '';
    document.getElementById('admin-hm-type').value = type;
    document.getElementById('admin-hm-parent').value = '';
    document.getElementById('admin-hm-name-ne').value = '';
    document.getElementById('admin-hm-name-en').value = '';
    document.getElementById('admin-hm-order').value = 99;
    document.getElementById('admin-hm-modal').classList.add('active');
}

function openAdminAddSubHeading(parentId, type) {
    document.getElementById('admin-hm-modal-title').innerText = 'नयाँ उप-शीर्षक थप्नुहोस्';
    document.getElementById('admin-hm-id').value = '';
    document.getElementById('admin-hm-type').value = type;
    document.getElementById('admin-hm-parent').value = parentId;
    document.getElementById('admin-hm-name-ne').value = '';
    document.getElementById('admin-hm-name-en').value = '';
    document.getElementById('admin-hm-order').value = 99;
    document.getElementById('admin-hm-modal').classList.add('active');
}

function openAdminEditHeading(id) {
    if (!window.getLedgerHeadingById) return;
    const h = window.getLedgerHeadingById(id);
    if (!h) return;
    document.getElementById('admin-hm-modal-title').innerText = 'शीर्षक सम्पादन गर्नुहोस्';
    document.getElementById('admin-hm-id').value = h.id;
    document.getElementById('admin-hm-type').value = h.type;
    document.getElementById('admin-hm-parent').value = h.parent_id || '';
    document.getElementById('admin-hm-name-ne').value = h.name_ne;
    document.getElementById('admin-hm-name-en').value = h.name_en || '';
    document.getElementById('admin-hm-order').value = h.sort_order || 99;
    document.getElementById('admin-hm-modal').classList.add('active');
}

function closeAdminHmModal() {
    document.getElementById('admin-hm-modal').classList.remove('active');
}

async function handleAdminHmSubmit(event) {
    event.preventDefault();
    if (!window.saveLedgerHeading) return;

    const id = document.getElementById('admin-hm-id').value;
    const type = document.getElementById('admin-hm-type').value;
    const parent_id = document.getElementById('admin-hm-parent').value;
    const name_ne = document.getElementById('admin-hm-name-ne').value.trim();
    const name_en = document.getElementById('admin-hm-name-en').value.trim();
    const sort_order = parseInt(document.getElementById('admin-hm-order').value) || 99;

    const heading = {
        id: id || 'hd-' + Date.now(),
        type: type,
        parent_id: parent_id || null,
        name_ne: name_ne,
        name_en: name_en,
        sort_order: sort_order
    };

    try {
        await window.saveLedgerHeading(heading);
        showAdmToast('शीर्षक सफलतापूर्वक सुरक्षित गरियो!', 'success');
        closeAdminHmModal();
        renderAdminHeadings();
    } catch (err) {
        showAdmToast('शीर्षक सुरक्षित गर्न समस्या भयो।', 'error');
    }
}

async function confirmAdminDeleteHeading(id) {
    if (!window.deleteLedgerHeading) return;
    if (confirm('के तपाईं यो शीर्षक हटाउन निश्चित हुनुहुन्छ? (Are you sure you want to delete this heading?)')) {
        try {
            await window.deleteLedgerHeading(id);
            showAdmToast('शीर्षक मेटिएको छ।', 'info');
            renderAdminHeadings();
        } catch(err) {
            showAdmToast('शीर्षक हटाउन समस्या भयो।', 'error');
        }
    }
}

