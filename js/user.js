/**
 * user.js - Public Portal Controller
 * Handles visual chart drawing, translations, transaction filtering, and feedback board updates.
 */

let currentLang = localStorage.getItem('school_lang') || 'ne'; // Default to Nepali for realistic gov feel
let trendChart = null;

// Translation dictionary
const TRANSLATIONS = {
    en: {
        'lang-btn-text': 'नेपाली संस्करण',
        'txt-school-name': 'Shree Jana Jagriti Secondary School',
        'txt-school-sub': 'Government of Nepal | Community School',
        'txt-gov-subtitle': 'Pokhara-15, Kaski, Nepal (Estd: 1959)',
        'txt-admin-portal-btn': 'Admin Portal',
        'txt-hero-title': 'Financial Transparency & Budget Disclosure Board',
        'txt-hero-desc': 'A digital portal showcasing real-time incomes, expenditures, and budget statements of the school, adhering to the "Good Governance and Transparency Guidelines" of the Government of Nepal.',
        'txt-fiscal-year-label': 'Fiscal Year',
        'txt-kpi-revenue-label': 'Total Income',
        'txt-kpi-revenue-sub': 'Grants, donations & internal income',
        'txt-kpi-expenses-label': 'Total Expenses',
        'txt-kpi-expenses-sub': 'Salaries, infrastructures & operations',
        'txt-kpi-balance-label': 'Net Balance',
        'txt-kpi-balance-sub': 'Bank balance & saved funds',
        'txt-kpi-utilization-label': 'Budget Spent',
        'txt-kpi-utilization-sub': 'Expenditure ratio of allocated budget',
        'txt-trend-chart-title': 'Income & Expenditure Monthly Trend',
        'txt-trend-chart-sub': 'Monthly analytics of incoming funds vs. expenditures',
        'txt-budget-list-title': 'Budget Allocation vs. Spent',
        'txt-budget-list-sub': 'Comparison of category budget caps and actual spent',
        'txt-table-title': 'Full Transaction Audit Ledger',
        'txt-table-sub': 'Detailed book entries of financial receipts and vouchers',
        'txt-export-csv-btn': 'Export CSV Data',
        'txt-print-btn': 'Print Page',
        'lbl-search': 'Search Details / Particulars',
        'lbl-filter-type': 'Transaction Type',
        'lbl-filter-cat': 'Category',
        'th-date': 'Date',
        'th-voucher': 'Voucher No.',
        'th-particulars': 'Particulars & Source of Fund',
        'th-category': 'Category',
        'th-type': 'Type',
        'th-amount': 'Amount',
        'txt-feedback-form-title': 'Public Inquiry & Feedback Form',
        'txt-feedback-form-sub': 'Help us improve transparency. Submit your questions, suggestions, or complaints.',
        'lbl-fb-name': 'Full Name *',
        'lbl-fb-role': 'Your Role *',
        'lbl-fb-msg': 'Suggestions / Feedback / Grievance *',
        'btn-fb-submit': 'Submit Feedback',
        'txt-feedback-feed-title': 'Citizen Feedback Board',
        'txt-feedback-feed-sub': 'Public inquiries received and official clarifications from management',
        'txt-footer-about-title': 'Nepal Gov School Financial Transparency',
        'txt-footer-about-desc': 'This public transparency portal aims to foster trust and accountability in community schools through digitalized governance.',
        'txt-footer-links-title': 'Quick Actions',
        'txt-footer-contact-title': 'Contact Office'
    },
    ne: {
        'lang-btn-text': 'English Version',
        'txt-school-name': 'श्री जन जागृति माध्यमिक विद्यालय',
        'txt-school-sub': 'नेपाल सरकार | सामुदायिक विद्यालय',
        'txt-gov-subtitle': 'Khairahani-1, Chitwan (स्थापित: २०१६)',
        'txt-admin-portal-btn': 'लेखा प्रशासन लगइन',
        'txt-hero-title': 'सार्वजनिक आय-व्यय तथा बजेट पारदर्शिता बोर्ड',
        'txt-hero-desc': 'नेपाल सरकारको "सुशासन तथा पारदर्शिता सम्बन्धी निर्देशिका" बमोजिम विद्यालयको आर्थिक कारोबारलाई समुदायमा सार्वजनिकिकरण गर्ने डिजिटल प्रणाली। यहाँ सबै आम्दानी र खर्चको विवरण पारदर्शी रूपमा हेर्न सकिन्छ।',
        'txt-fiscal-year-label': 'आर्थिक वर्ष',
        'txt-kpi-revenue-label': 'कुल आम्दानी',
        'txt-kpi-revenue-sub': 'अनुदान, चन्दा तथा आन्तरिक आम्दानी',
        'txt-kpi-expenses-label': 'कुल खर्च',
        'txt-kpi-expenses-sub': 'तलब, भौतिक निर्माण तथा सञ्चालन खर्च',
        'txt-kpi-balance-label': 'बाँकी कोष',
        'txt-kpi-balance-sub': 'बैंक मौज्दात तथा सञ्चित कोष',
        'txt-kpi-utilization-label': 'बजेट खर्च दर',
        'txt-kpi-utilization-sub': 'कुल विनियोजित बजेटको खर्च अनुपात',
        'txt-trend-chart-title': 'मासिक आय-व्यय प्रवृत्ति',
        'txt-trend-chart-sub': 'आय र व्ययको मासिक उतारचढाव विश्लेषण',
        'txt-budget-list-title': 'बजेट विनियोजन र खर्चको अवस्था',
        'txt-budget-list-sub': 'विषयगत शीर्षक अनुसार बजेट र वास्तविक खर्च',
        'txt-table-title': 'आय-व्यय भौचर स्रेस्ता विवरण',
        'txt-table-sub': 'विद्यालयको विस्तृत आय-व्यय स्रेस्ता र भौचर विवरण',
        'txt-export-csv-btn': 'CSV निर्यात गर्नुहोस्',
        'txt-print-btn': 'रिपोर्ट छाप्नुहोस्',
        'lbl-search': 'विवरण वा भौचर खोज्नुहोस्',
        'lbl-filter-type': 'कारोबार प्रकार',
        'lbl-filter-cat': 'बजेट शीर्षक',
        'th-date': 'मिति',
        'th-voucher': 'भौचर नं.',
        'th-particulars': 'विवरण तथा रकमको स्रोत',
        'th-category': 'शीर्षक',
        'th-type': 'प्रकार',
        'th-amount': 'रकम',
        'txt-feedback-form-title': 'सार्वजनिक सुझाव तथा गुनासो फारम',
        'txt-feedback-form-sub': 'पारदर्शिता सुधार गर्न आफ्नो रचनात्मक सुझाव वा गुनासो पेश गर्नुहोस्।',
        'lbl-fb-name': 'पूरा नाम *',
        'lbl-fb-role': 'सरोकारवाला भूमिका *',
        'lbl-fb-msg': 'जिज्ञासा, सुझाव वा गुनासो *',
        'btn-fb-submit': 'गुनासो दर्ता गर्नुहोस्',
        'txt-feedback-feed-title': 'नागरिक सुनुवाइ पाटी',
        'txt-feedback-feed-sub': 'अभिभावक तथा सरोकारवालाहरूबाट प्राप्त सुझाव र विद्यालयको आधिकारिक जवाफ',
        'txt-footer-about-title': 'नेपाल सरकार विद्यालय वित्तीय पारदर्शिता',
        'txt-footer-about-desc': 'यो पोर्टल सामुदायिक विद्यालयको आय-व्यय सार्वजनिक सुनुवाइलाई थप प्रविधिमैत्री र पारदर्शी बनाउन परीक्षणका रूपमा सञ्चालन गरिएको हो।',
        'txt-footer-links-title': 'द्रुत लिङ्कहरू',
        'txt-footer-contact-title': 'सम्पर्क ठेगाना'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // ── Resolve active school from login session ──────────────────────────────
    // Priority: sessionStorage email (set by school-login.html) > nepal_school_registered_info
    // Never fall back to "first approved school" — that causes data cross-contamination.
    const sessionEmail = sessionStorage.getItem('school_user_email');
    const isAdmin = sessionStorage.getItem('admin_logged_in') === 'true';
    let schoolInfoStr  = null;

    if (sessionEmail && isAdmin) {
        // Find the exact school the user logged in as
        try {
            const listRaw = localStorage.getItem('nepal_registered_schools');
            if (listRaw) {
                const list = JSON.parse(listRaw);
                const match = list.find(s => s.schoolEmail && s.schoolEmail.toLowerCase() === sessionEmail.toLowerCase());
                if (match) {
                    schoolInfoStr = JSON.stringify(match);
                    localStorage.setItem('nepal_school_registered_info', schoolInfoStr);
                }
            }
        } catch(e) {
            console.error('Error resolving school from session in user.js:', e);
        }
    }

    // If no session, fall back to whatever is in nepal_school_registered_info (e.g. first-time subscription flow)
    if (!schoolInfoStr) {
        schoolInfoStr = localStorage.getItem('nepal_school_registered_info');
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (schoolInfoStr) {
        try {
            const schoolInfo = JSON.parse(schoolInfoStr);
            if (schoolInfo.schoolName) {
                TRANSLATIONS.ne['txt-school-name'] = schoolInfo.schoolName;
                TRANSLATIONS.en['txt-school-name'] = schoolInfo.schoolName;
            }
            if (schoolInfo.address) {
                TRANSLATIONS.ne['txt-gov-subtitle'] = `सामुदायिक विद्यालय - ${schoolInfo.address} (इमिस कोड: ${schoolInfo.emis})`;
                TRANSLATIONS.en['txt-gov-subtitle'] = `Community School - ${schoolInfo.address} (EMIS: ${schoolInfo.emis})`;
            }

            // Inject custom school logo into the header logo container
            if (schoolInfo.logo) {
                const logoContainer = document.getElementById('user-school-logo-container');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${schoolInfo.logo}" alt="${schoolInfo.schoolName || 'School Logo'}" class="gov-logo" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--secondary); box-shadow: 0 4px 12px rgba(0,0,0,0.18);">`;
                }
            }
            
            // Wait for DOM elements to load then override static footer parts
            setTimeout(() => {
                const footerContactDesc = document.getElementById('txt-footer-contact-desc');
                const footerBottom = document.querySelector('footer .footer-bottom');
                if (footerContactDesc) {
                    footerContactDesc.innerHTML = `
                        <strong>${schoolInfo.schoolName}</strong><br>
                        <a href="https://maps.app.goo.gl/D39cBnAvLxvtyRXn6" target="_blank" style="color: inherit; text-decoration: none;">${schoolInfo.address}</a><br>
                        फोन: <a href="tel:${schoolInfo.pPhone ? schoolInfo.pPhone.replace(/[^0-9+]/g, '') : '+9779861079061'}" style="color: inherit; text-decoration: none;">${schoolInfo.pPhone || '+977-9861079061'}</a><br>
                        इमेल: <a href="mailto:${schoolInfo.schoolEmail || 'khatapanadigital2083@gmail.com'}" style="color: inherit; text-decoration: none;">${schoolInfo.schoolEmail || ('info@' + (schoolInfo.schoolName || 'school').toLowerCase().replace(/[^a-z0-9]/g, '') + '.edu.np')}</a>
                    `;
                }
                if (footerBottom) {
                    let nepaliYearStr = '२०८३';
                    if (window.NepaliFunctions) {
                        try { nepaliYearStr = window.toNepaliDigits(window.NepaliFunctions.GetCurrentBsDate().year); } catch(e){}
                    }
                    footerBottom.innerText = `© ${nepaliYearStr} ${schoolInfo.schoolName || 'खातापाना Digital'} | सुशासन, पारदर्शिता र गुणस्तरीय शिक्षा`;
                }
            }, 50);
        } catch (e) {
            console.error('Error overriding school info:', e);
        }
    }

    applyLanguage();
    initKeys(); // Load keys and categories synchronously from local storage
    populateCategoryDropdowns();
    await initDatabase();
    updateDashboardMetrics();
    renderBudgetBars();
    renderCharts();
    renderTransactionsTable();
    renderFeedbacks();
});


/**
 * Handle Language Toggling
 */
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ne' : 'en';
    localStorage.setItem('school_lang', currentLang);
    applyLanguage();
    
    // Re-render UI elements which depend on selected language
    populateCategoryDropdowns();
    updateDashboardMetrics();
    renderBudgetBars();
    renderTransactionsTable();
    renderFeedbacks();
    
    // Recreate charts with new translated labels
    if (trendChart) {
        trendChart.destroy();
    }
    renderCharts();
}

function applyLanguage() {
    const dict = TRANSLATIONS[currentLang];
    
    // Apply texts by element ID
    Object.keys(dict).forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                // Do not overwrite placeholder here, handle specifically if needed
            } else {
                el.innerText = dict[key];
            }
        }
    });
    
    // Set appropriate placeholder texts
    const searchInp = document.getElementById('search-input');
    if (searchInp) {
        searchInp.placeholder = currentLang === 'en' 
            ? 'Search particulars, voucher, source...' 
            : 'खोज्नुहोस् (विवरण, भौचर नं., स्रोत...)';
    }
    
    const msgInp = document.getElementById('fb-message');
    if (msgInp) {
        msgInp.placeholder = currentLang === 'en'
            ? 'Write your query or feedback here...'
            : 'आफ्नो सन्देश यहाँ लेख्नुहोस्...';
    }
    
    const nameInp = document.getElementById('fb-name');
    if (nameInp) {
        nameInp.placeholder = currentLang === 'en' ? 'Your full name' : 'तपाईंको नाम';
    }

    // Set document lang property
    document.documentElement.lang = currentLang;
}

/**
 * Populate Category Dropdowns based on language selection
 */
function populateCategoryDropdowns() {
    const catSelect = document.getElementById('filter-category');
    if (!catSelect) return;
    
    // Clear and build options
    catSelect.innerHTML = '';
    
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.innerText = currentLang === 'en' ? 'All Categories' : 'सबै शीर्षकहरू';
    catSelect.appendChild(allOpt);
    
    // Populate Income & Expenditure Categories
    const optGroupInc = document.createElement('optgroup');
    optGroupInc.label = currentLang === 'en' ? 'Income Headings' : 'आम्दानीका शीर्षकहरू';
    
    Object.keys(INCOME_CATEGORIES).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerText = INCOME_CATEGORIES[key][currentLang];
        optGroupInc.appendChild(opt);
    });
    catSelect.appendChild(optGroupInc);

    const optGroupExp = document.createElement('optgroup');
    optGroupExp.label = currentLang === 'en' ? 'Expenditure Headings' : 'खर्चका शीर्षकहरू';
    
    Object.keys(EXPENSE_CATEGORIES).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerText = EXPENSE_CATEGORIES[key][currentLang];
        optGroupExp.appendChild(opt);
    });
    catSelect.appendChild(optGroupExp);
}

/**
 * Recalculate and display core metrics
 */
function updateDashboardMetrics() {
    const transactions = getTransactions();
    const budgets = getBudgets();
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    transactions.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'income') {
            totalRevenue += amt;
        } else if (t.type === 'expense') {
            totalExpenses += amt;
        }
    });
    
    const netBalance = totalRevenue - totalExpenses;
    
    // Compute overall budget cap
    let totalBudgetAllocated = 0;
    Object.values(budgets).forEach(val => {
        totalBudgetAllocated += Number(val);
    });
    
    const utilizationRate = totalBudgetAllocated > 0 
        ? ((totalExpenses / totalBudgetAllocated) * 100).toFixed(1) 
        : '0.0';
    
    const isDevanagari = currentLang === 'ne';
    
    document.getElementById('val-total-revenue').innerText = formatCurrency(totalRevenue, isDevanagari);
    document.getElementById('val-total-expenses').innerText = formatCurrency(totalExpenses, isDevanagari);
    
    const balanceEl = document.getElementById('val-net-balance');
    balanceEl.innerText = formatCurrency(netBalance, isDevanagari);
    if (netBalance < 0) {
        balanceEl.style.color = 'var(--danger)';
    } else {
        balanceEl.style.color = '';
    }
    
    document.getElementById('val-budget-utilization').innerText = isDevanagari 
        ? toNepaliDigits(utilizationRate) + '%' 
        : utilizationRate + '%';
        
    generateFinancialNarrative(transactions);
}

/**
 * Generate a textual narrative of the financial status
 */
function generateFinancialNarrative(transactions) {
    let incomeCats = {};
    let expenseCats = {};
    
    transactions.forEach(tx => {
        if (tx.type === 'income') {
            incomeCats[tx.category] = (incomeCats[tx.category] || 0) + Number(tx.amount);
        } else if (tx.type === 'expense') {
            expenseCats[tx.category] = (expenseCats[tx.category] || 0) + Number(tx.amount);
        }
    });

    const getTopTwo = (catDict, sourceMap, lang) => {
        return Object.entries(catDict)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 2)
            .map(entry => {
                const catObj = sourceMap[entry[0]];
                return catObj ? catObj[lang] : entry[0];
            });
    };

    const topIncomes = getTopTwo(incomeCats, INCOME_CATEGORIES, 'ne');
    const topExpenses = getTopTwo(expenseCats, EXPENSE_CATEGORIES, 'ne');

    let narrative = "यस आर्थिक वर्षमा विद्यालयको आर्थिक अवस्था पारदर्शी र व्यवस्थित रहेको छ। ";
    
    if (topIncomes.length > 0) {
        narrative += `विद्यालयको आम्दानीका मुख्य स्रोतहरूमा विशेष गरी <strong>${topIncomes.join(' र ')}</strong> रहेका छन्। `;
    }
    
    if (topExpenses.length > 0) {
        narrative += `त्यसैगरी, प्राप्त बजेट मुख्य रूपमा <strong>${topExpenses.join(' र ')}</strong> जस्ता महत्त्वपूर्ण क्षेत्रहरूमा खर्च गरिएको छ। `;
    }

    narrative += "विद्यालयको सम्पूर्ण आर्थिक कारोबार बैंकिङ प्रणाली मार्फत व्यवस्थित गरिएको छ जसले सुशासन र नागरिकप्रतिको जवाफदेहिता सुनिश्चित गर्दछ।";

    // English version
    let enNarrative = "This fiscal year, the financial status of the school is transparent and well-managed. ";
    
    const topIncomesEn = getTopTwo(incomeCats, INCOME_CATEGORIES, 'en');
    const topExpensesEn = getTopTwo(expenseCats, EXPENSE_CATEGORIES, 'en');
    
    if (topIncomesEn.length > 0) {
        enNarrative += `The main sources of income are primarily <strong>${topIncomesEn.join(' and ')}</strong>. `;
    }
    
    if (topExpensesEn.length > 0) {
        enNarrative += `Similarly, the budget is mainly spent on crucial areas like <strong>${topExpensesEn.join(' and ')}</strong>. `;
    }
    
    enNarrative += "All financial transactions are conducted through the banking system, ensuring good governance and accountability to the citizens.";

    const narrativeEl = document.getElementById('txt-financial-narrative');
    if (narrativeEl) {
        narrativeEl.innerHTML = currentLang === 'en' ? enNarrative : narrative;
    }
}

/**
 * Render budget allocations vs. actual expenditures progress bars
 */
function renderBudgetBars() {
    const container = document.getElementById('budget-progress-container');
    if (!container) return;
    
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
    
    container.innerHTML = '';
    
    Object.keys(EXPENSE_CATEGORIES).forEach(cat => {
        const budgetCap = budgets[cat] || 0;
        const actualSpent = expenseTotals[cat] || 0;
        const percentage = budgetCap > 0 ? Math.round((actualSpent / budgetCap) * 100) : 0;
        
        let progressClass = 'normal';
        if (percentage >= 100) {
            progressClass = 'danger';
        } else if (percentage >= 85) {
            progressClass = 'warning';
        }
        
        const isDev = currentLang === 'ne';
        const formattedActual = formatCurrency(actualSpent, isDev);
        const formattedCap = formatCurrency(budgetCap, isDev);
        
        const labelText = EXPENSE_CATEGORIES[cat][currentLang];
        const subLabelText = currentLang === 'en' 
            ? EXPENSE_CATEGORIES[cat].ne 
            : EXPENSE_CATEGORIES[cat].en;
            
        const budgetItemHTML = `
            <div class="budget-item">
                <div class="budget-item-info">
                    <span class="budget-label">${labelText} <small>${subLabelText}</small></span>
                    <span class="budget-values">
                        ${formattedActual} / ${formattedCap} (${isDev ? toNepaliDigits(percentage) : percentage}%)
                        ${actualSpent > budgetCap ? `<span class="overbudget-badge">${isDev ? 'बजेट नाघेको' : 'Over budget'}</span>` : ''}
                    </span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${progressClass}" style="width: ${Math.min(percentage, 100)}%;"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', budgetItemHTML);
    });
}

/**
 * Render Chart.js monthly trend and doughnut categories
 */
function renderCharts() {
    const transactions = getTransactions();
    const isDev = currentLang === 'ne';
    
    // Group transaction amounts by months (for realistic representation, e.g., April, May, June)
    // In Nepal, Baishakh (~April/May), Jestha (~May/June), Ashad (~June/July), etc.
    const MONTH_LABELS = {
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ne: ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत']
    };
    
    // Let's map standard dates 01-12 to Nepal calendar months (for simulation, simply map JavaScript month index to Nepal fiscal or solar month)
    // 0 = Jan/Baishakh, 1 = Feb/Jestha, etc. for visual ease
    const monthlyIncome = Array(12).fill(0);
    const monthlyExpense = Array(12).fill(0);
    
    transactions.forEach(t => {
        if (!t.date) return;
        const dateObj = new Date(t.date);
        const m = dateObj.getMonth(); // 0 to 11
        if (t.type === 'income') {
            monthlyIncome[m] += Number(t.amount);
        } else {
            monthlyExpense[m] += Number(t.amount);
        }
    });
    
    // Get non-zero data range to make chart display look nice
    // Filter months that have activity to zoom the chart view or show 4 primary months
    const activeLabels = MONTH_LABELS[currentLang];
    
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: activeLabels,
            datasets: [
                {
                    label: isDev ? 'मासिक आम्दानी (Income)' : 'Monthly Income',
                    data: monthlyIncome,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35
                },
                {
                    label: isDev ? 'मासिक खर्च (Expenditure)' : 'Monthly Expenses',
                    data: monthlyExpense,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: isDev ? 'Mukta' : 'Inter',
                            size: 13
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: isDev ? 'Mukta' : 'Inter'
                        },
                        callback: function(value) {
                            return isDev ? toNepaliDigits(value / 1000) + ' हजार' : (value / 1000) + 'k';
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: isDev ? 'Mukta' : 'Inter',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

/**
 * Search and Filter transactions lists
 */
function filterTransactions() {
    renderTransactionsTable();
}

function renderTransactionsTable() {
    const tbody = document.getElementById('transaction-tbody');
    if (!tbody) return;
    
    const transactions = getTransactions();
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const typeFilter = document.getElementById('filter-type').value;
    const catFilter = document.getElementById('filter-category').value;
    
    tbody.innerHTML = '';
    
    const isDev = currentLang === 'ne';
    
    // Sort transactions by date descending
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let filteredCount = 0;
    
    sortedTxs.forEach(t => {
        // Apply type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) return;
        
        // Apply category filter
        if (catFilter !== 'all' && t.category !== catFilter) return;
        
        // Apply search query (particulars, voucherNo, source)
        if (query) {
            const partStr = t.particulars.toLowerCase();
            const vchStr = (t.voucherNo || '').toLowerCase();
            const srcStr = (t.source || '').toLowerCase();
            
            // Allow search matches on translated category labels as well
            let catMatchStr = '';
            if (t.type === 'income' && INCOME_CATEGORIES[t.category]) {
                catMatchStr = (INCOME_CATEGORIES[t.category].en + ' ' + INCOME_CATEGORIES[t.category].ne).toLowerCase();
            } else if (t.type === 'expense' && EXPENSE_CATEGORIES[t.category]) {
                catMatchStr = (EXPENSE_CATEGORIES[t.category].en + ' ' + EXPENSE_CATEGORIES[t.category].ne).toLowerCase();
            }
            
            const match = partStr.includes(query) || vchStr.includes(query) || srcStr.includes(query) || catMatchStr.includes(query);
            if (!match) return;
        }
        
        filteredCount++;
        
        // Resolve category text
        let catLabel = '';
        if (t.type === 'income') {
            catLabel = INCOME_CATEGORIES[t.category] ? INCOME_CATEGORIES[t.category][currentLang] : t.category;
        } else {
            catLabel = EXPENSE_CATEGORIES[t.category] ? EXPENSE_CATEGORIES[t.category][currentLang] : t.category;
        }
        
        // Build table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.date, isDev)}</td>
            <td><code>${isDev ? toNepaliDigits(t.voucherNo) : t.voucherNo}</code></td>
            <td>
                <div class="particulars-cell">
                    <div class="particulars-title">${t.particulars}</div>
                    <div class="particulars-details">
                        <span><strong>${isDev ? 'स्रोत/कोष:' : 'Source:'}</strong> ${t.source || '-'}</span>
                        <span><strong>${isDev ? 'प्रविष्टि:' : 'By:'}</strong> ${t.recordedBy || '-'}</span>
                    </div>
                </div>
            </td>
            <td><span class="nepali-font" style="font-size: 0.85rem;">${catLabel}</span></td>
            <td>
                <span class="badge ${t.type}">
                    ${t.type === 'income' ? (isDev ? 'आम्दानी' : 'Income') : (isDev ? 'खर्च' : 'Expenditure')}
                </span>
            </td>
            <td class="amount-col ${t.type}">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount, isDev)}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (filteredCount === 0) {
        const noRow = document.createElement('tr');
        noRow.innerHTML = `
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                ${isDev ? 'कुनै विवरण भेटिएन ।' : 'No records found matching criteria.'}
            </td>
        `;
        tbody.appendChild(noRow);
    }
}

async function submitPublicFeedback(event) {
    event.preventDefault();
    
    const nameVal = document.getElementById('fb-name').value.trim();
    const roleVal = document.getElementById('fb-role').value;
    const phoneVal = document.getElementById('fb-phone').value.trim();
    const emailVal = document.getElementById('fb-email').value.trim();
    const msgVal = document.getElementById('fb-message').value.trim();
    
    if (!nameVal || !msgVal || !phoneVal || !emailVal) {
        showToast(currentLang === 'en' ? 'Please fill in all fields.' : 'कृपया सबै क्षेत्रहरू भर्नुहोस्।', 'error');
        return;
    }
    
    try {
        await saveFeedback({
            name: nameVal,
            role: roleVal,
            phone: phoneVal,
            email: emailVal,
            message: msgVal
        });
        
        // Clear inputs
        document.getElementById('fb-name').value = '';
        document.getElementById('fb-phone').value = '';
        document.getElementById('fb-email').value = '';
        document.getElementById('fb-message').value = '';
        
        showToast(currentLang === 'en' ? 'Feedback submitted successfully!' : 'सुझाव/गुनासो सफलतापूर्वक दर्ता भयो!', 'success');
        
        // Reload feed
        renderFeedbacks();
        
        // Send real email to user using EmailJS
        let schoolName = 'School Administration';
        try {
            const schoolInfo = JSON.parse(localStorage.getItem('nepal_school_registered_info'));
            if (schoolInfo && schoolInfo.schoolName) {
                schoolName = schoolInfo.schoolName;
            }
        } catch (e) {}
        
        if (typeof emailjs !== 'undefined' && typeof EMAILJS_PUBLIC_KEY !== 'undefined' && EMAILJS_PUBLIC_KEY) {
            emailjs.init({
              publicKey: EMAILJS_PUBLIC_KEY,
            });
            
            const templateParams = {
                to_email: emailVal,
                to_name: nameVal,
                school_name: schoolName,
                message: msgVal
            };
            
            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                .then(() => {
                    alert("✅ SUCCESS! The auto-reply email was sent by EmailJS to " + emailVal + ".\n\nIf you don't see it, PLEASE CHECK YOUR SPAM/JUNK FOLDER.");
                    console.log('Auto-reply email sent successfully to ' + emailVal);
                }, (error) => {
                    alert("❌ EmailJS Failed to send! Error: " + JSON.stringify(error));
                    console.error('EmailJS Failed...', error);
                });
        } else {
            alert("⚠️ EmailJS is skipped! Your browser is still using the old cached config.js file.\n\nPlease do a HARD REFRESH by pressing [Ctrl] + [F5] on your keyboard to load the new keys!");
            console.warn('EmailJS is not configured. Auto-reply email was not sent. Please add keys to config.js.');
        }
        
    } catch (err) {
        showToast(currentLang === 'en' ? 'Failed to submit feedback. Try again.' : 'गुनासो दर्ता गर्न असफल भयो। पुनः प्रयास गर्नुहोस्।', 'error');
    }
}

/**
 * Render Feedbacks and replies
 */
function renderFeedbacks() {
    const container = document.getElementById('public-feedback-container');
    if (!container) return;
    
    const feedbacks = getFeedbacks();
    container.innerHTML = '';
    
    const isDev = currentLang === 'ne';
    
    // Sort feedbacks descending (newest first)
    const sortedFbs = [...feedbacks].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sortedFbs.forEach(fb => {
        const bubble = document.createElement('div');
        bubble.className = 'feedback-bubble';
        
        let replyHTML = '';
        if (fb.replied) {
            replyHTML = `
                <div class="admin-reply-box">
                    <div class="admin-reply-title">${isDev ? 'विद्यालय प्रशासनको जवाफ:' : 'Response from School Administration:'}</div>
                    <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-main);">${fb.replyText}</p>
                </div>
            `;
        } else {
            replyHTML = `
                <div class="admin-reply-box" style="border-left-color: var(--text-muted); background: #f9fafb;">
                    <p style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
                        ${isDev ? 'प्रतिक्रियाको प्रतीक्षामा...' : 'Awaiting official review...'}
                    </p>
                </div>
            `;
        }
        
        bubble.innerHTML = `
            <div class="feedback-meta">
                <span class="feedback-author">${fb.name} (${fb.role})</span>
                <span>${formatDate(fb.date, isDev)}</span>
            </div>
            <div class="feedback-message">"${fb.message}"</div>
            ${replyHTML}
        `;
        container.appendChild(bubble);
    });
    
    if (feedbacks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 20px; font-style: italic;">
                ${isDev ? 'हालसम्म कुनै प्रतिक्रिया दर्ता भएको छैन ।' : 'No comments on board yet.'}
            </div>
        `;
    }
}

/**
 * CSV Exporter helper
 */
function exportCSV() {
    const transactions = getTransactions();
    if (transactions.length === 0) {
        showToast('No transaction data to export.', 'error');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    // Headers
    csvContent += 'Date,Voucher No,Particulars,Source of Funds,Category,Type,Amount\n';
    
    transactions.forEach(t => {
        const row = [
            t.date,
            `"${t.voucherNo || ''}"`,
            `"${t.particulars.replace(/"/g, '""')}"`,
            `"${t.source || ''}"`,
            t.category,
            t.type,
            t.amount
        ].join(',');
        csvContent += row + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shree_jana_jagriti_school_audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(currentLang === 'en' ? 'CSV Exported successfully!' : 'CSV रिपोर्ट डाउनलोड भयो!', 'success');
}

/**
 * Custom Toast alert mechanism
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-weight:bold;" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Animation trigger
    setTimeout(() => toast.classList.add('show'), 50);
    
    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
