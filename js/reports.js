// js/reports.js

// Report Configurations
const reportConfigs = {
    'bank_nagadi': {
        title: 'बैंक नगदी किताब (Bank Cash Book)',
        subtitle: 'दैनिक बैंक र नगद कारोबारको विवरण',
        headers: ['मिति', 'भौचर नं.', 'विवरण', 'नगद आम्दानी', 'नगद खर्च', 'बैंक जम्मा', 'बैंक भुक्तानी', 'नगद मौज्दात', 'बैंक मौज्दात']
    },
    'aamdani_khata': {
        title: 'आम्दानी खाता (Income Ledger)',
        subtitle: 'विद्यालयको सम्पूर्ण आय विवरण',
        headers: ['मिति', 'भौचर नं.', 'विवरण', 'आम्दानी शीर्षक', 'रकम (रू.)']
    },
    'kharcha_khata': {
        title: 'खर्च खाता (Expenditure Ledger)',
        subtitle: 'विद्यालयको सम्पूर्ण व्यय विवरण',
        headers: ['मिति', 'भौचर नं.', 'विवरण', 'खर्च शीर्षक', 'रकम (रू.)']
    },
    'nagad_bank': {
        title: 'नगद बैंक खाता (Cash Bank Ledger)',
        subtitle: 'बैंक र नगदको एकीकृत मौज्दात विवरण',
        headers: ['मिति', 'विवरण', 'नगद प्राप्ति', 'नगद भुक्तानी', 'बैंक जम्मा', 'बैंक भुक्तानी', 'कुल मौज्दात']
    },
    'aaya_vyaya': {
        title: 'आय व्यय विवरण (Income & Expenditure)',
        subtitle: 'निश्चित अवधिको आय र व्ययको सारांश',
        headers: ['शीर्षक', 'कुल आम्दानी (रू.)', 'कुल खर्च (रू.)', 'बचत/घाटा (रू.)']
    },
    'trial_balance': {
        title: 'ट्रायल ब्यालेन्स (Trial Balance)',
        subtitle: 'सम्पूर्ण खाताहरूको सन्तुलन परीक्षण',
        headers: ['सि.नं.', 'खाताको नाम (Ledger Account)', 'डेबिट (Debit)', 'क्रेडिट (Credit)']
    }
};

let currentReport = 'bank_nagadi';
let allTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Get report type from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const reportParam = urlParams.get('report');
    
    if (reportParam && reportConfigs[reportParam]) {
        currentReport = reportParam;
    }

    // Set school header
    updateSchoolHeader();

    // Set active button
    updateSidebarActiveState();

    // Load Data
    await loadInitialData();
});

function updateSidebarActiveState() {
    document.querySelectorAll('.report-nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.target === currentReport) {
            btn.classList.add('active');
        }
    });
}

function loadReport(reportKey) {
    currentReport = reportKey;
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('report', reportKey);
    window.history.pushState({}, '', url);

    updateSidebarActiveState();
    generateReport();
}

async function loadInitialData() {
    try {
        // Fetch all transactions using the database.js function
        const data = await getTransactions();
        if (data) {
            allTransactions = data;
        }
        generateReport();
    } catch (error) {
        console.error("Error loading transactions:", error);
        document.getElementById('report-table-wrapper').innerHTML = `<p class="error-text">तथ्यांक लोड गर्न समस्या भयो। (Error loading data)</p>`;
    }
}

function formatCurrency(amount) {
    if (!amount) return '०.००';
    return Number(amount).toLocaleString('ne-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateReport() {
    const config = reportConfigs[currentReport];
    
    // Update Titles
    document.getElementById('report-title').innerText = config.title.split(' (')[0];
    document.getElementById('report-subtitle').innerText = config.subtitle;

    // Apply Filters
    const fy = document.getElementById('filter-fiscal-year').value;
    const fromDate = document.getElementById('filter-from-date').value;
    const toDate = document.getElementById('filter-to-date').value;

    let filteredData = allTransactions;

    if (fy !== 'all') {
        filteredData = filteredData.filter(t => t.fiscal_year === fy);
    }
    if (fromDate) {
        filteredData = filteredData.filter(t => new Date(t.date) >= new Date(fromDate));
    }
    if (toDate) {
        filteredData = filteredData.filter(t => new Date(t.date) <= new Date(toDate));
    }

    // Sort by date ascending
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Clear summary container
    document.getElementById('report-summary-container').innerHTML = '';

    // Show/Hide New Entry Button for Bank Cash Book
    const btnToggleEntry = document.getElementById('btn-toggle-entry');
    if (btnToggleEntry) {
        btnToggleEntry.style.display = currentReport === 'bank_nagadi' ? 'inline-block' : 'none';
    }

    // Hide inline form if we switch reports
    const inlineFormContainer = document.getElementById('inline-entry-form-container');
    if (inlineFormContainer && inlineFormContainer.style.display === 'block') {
        inlineFormContainer.style.display = 'none';
    }

    // Render Table based on type
    let html = '';
    
    if (currentReport === 'bank_nagadi') {
        html = renderBankNagadi(filteredData);
    } else {
        html = `<table class="data-table">
                    <thead>
                        <tr>
                            ${config.headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>`;

        if (filteredData.length === 0) {
            html += `<tr><td colspan="${config.headers.length}" style="text-align: center;">कुनै तथ्यांक भेटिएन। (No data found)</td></tr>`;
        } else {
            // Specific Report Renderers
            switch (currentReport) {
                case 'aamdani_khata': html += renderLedger(filteredData, 'income'); break;
                case 'kharcha_khata': html += renderLedger(filteredData, 'expense'); break;
                case 'nagad_bank': html += renderCashBank(filteredData); break;
                case 'aaya_vyaya': html += renderIncomeExpenditure(filteredData); break;
                case 'trial_balance': html += renderTrialBalance(filteredData); break;
            }
        }
        html += `</tbody></table>`;
    }

    html += `</tbody></table>`;
    document.getElementById('report-table-wrapper').innerHTML = html;
}

// 1. Bank Cash Book logic (11 column format)
function renderBankNagadi(data) {
    let html = `
    <table class="data-table bank-cash-book-table">
        <thead>
            <tr>
                <th rowspan="2" style="vertical-align: middle;">मिति</th>
                <th rowspan="2" style="vertical-align: middle;">भौचर नं</th>
                <th rowspan="2" style="vertical-align: middle;">विवरण</th>
                <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border);">नगद मौज्दात</th>
                <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border);">बैंक मौज्दात</th>
                <th style="text-align: center; border-bottom: 1px solid var(--border);">बजेट खर्च</th>
                <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border);">विविध</th>
            </tr>
            <tr>
                <th style="text-align: center;">डेबिट (Debit)</th>
                <th style="text-align: center;">क्रेडिट (Credit)</th>
                <th style="text-align: center;">डेबिट (Debit)</th>
                <th style="text-align: center;">क्रेडिट (Credit)</th>
                <th style="text-align: center;">रकम (Amount)</th>
                <th style="text-align: center;">डेबिट (Debit)</th>
                <th style="text-align: center;">क्रेडिट (Credit)</th>
            </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
        html += `<tr><td colspan="10" style="text-align: center;">कुनै तथ्यांक भेटिएन। (No data found)</td></tr></tbody></table>`;
        return html;
    }

    let tCashDr = 0, tCashCr = 0, tBankDr = 0, tBankCr = 0;
    let tBudgetExp = 0, tMiscDr = 0, tMiscCr = 0;

    data.forEach(t => {
        let amount = Number(t.amount);
        let cashDr = '', cashCr = '', bankDr = '', bankCr = '';
        let budgetExp = '', miscDr = '', miscCr = '';

        if (t.type === 'direct_entry') {
            try {
                const customAmounts = JSON.parse(t.category);
                cashDr = customAmounts.cash_dr || '';
                cashCr = customAmounts.cash_cr || '';
                bankDr = customAmounts.bank_dr || '';
                bankCr = customAmounts.bank_cr || '';
                budgetExp = customAmounts.budget_exp || '';
                miscDr = customAmounts.misc_dr || '';
                miscCr = customAmounts.misc_cr || '';

                if(cashDr) tCashDr += Number(cashDr);
                if(cashCr) tCashCr += Number(cashCr);
                if(bankDr) tBankDr += Number(bankDr);
                if(bankCr) tBankCr += Number(bankCr);
                if(budgetExp) tBudgetExp += Number(budgetExp);
                if(miscDr) tMiscDr += Number(miscDr);
                if(miscCr) tMiscCr += Number(miscCr);

            } catch (e) { console.error("Error parsing direct_entry:", e); }
        } else {
            // Data Mapping Logic for legacy entries
            let paymentMethod = t.payment_method || 'bank'; // fallback to bank
            
            if (t.type === 'income') {
                if (paymentMethod === 'cash') {
                    cashDr = amount; tCashDr += amount;
                } else {
                    bankDr = amount; tBankDr += amount;
                }
                miscDr = amount; tMiscDr += amount; // Income goes to Misc Debit
            } else { // Expense
                if (paymentMethod === 'cash') {
                    cashCr = amount; tCashCr += amount;
                } else {
                    bankCr = amount; tBankCr += amount;
                }
                
                // Assume "misc_expense" goes to Misc, else Budget
                if (t.category && t.category.toLowerCase().includes('misc')) {
                    miscCr = amount; tMiscCr += amount;
                } else {
                    budgetExp = amount; tBudgetExp += amount;
                }
            }
        }

        html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.voucher_no || '-'}</td>
                <td>${t.description}</td>
                <td style="text-align: right;">${cashDr ? cashDr : ''}</td>
                <td style="text-align: right;">${cashCr ? cashCr : ''}</td>
                <td style="text-align: right;">${bankDr ? bankDr : ''}</td>
                <td style="text-align: right;">${bankCr ? bankCr : ''}</td>
                <td style="text-align: right;">${budgetExp ? budgetExp : ''}</td>
                <td style="text-align: right;">${miscDr ? miscDr : ''}</td>
                <td style="text-align: right;">${miscCr ? miscCr : ''}</td>
            </tr>
        `;
    });

    // Total Row
    html += `
        <tr style="background: #ffff00; font-weight: bold; font-family: var(--font-nepali);">
            <td colspan="3" style="text-align: center; color: black;">जम्मा</td>
            <td style="text-align: right; color: black;">${tCashDr ? formatCurrency(tCashDr) : ''}</td>
            <td style="text-align: right; color: black;">${tCashCr ? formatCurrency(tCashCr) : ''}</td>
            <td style="text-align: right; color: black;">${tBankDr ? formatCurrency(tBankDr) : ''}</td>
            <td style="text-align: right; color: black;">${tBankCr ? formatCurrency(tBankCr) : ''}</td>
            <td style="text-align: right; color: black;">${tBudgetExp ? formatCurrency(tBudgetExp) : ''}</td>
            <td style="text-align: right; color: black;">${tMiscDr ? formatCurrency(tMiscDr) : ''}</td>
            <td style="text-align: right; color: black;">${tMiscCr ? formatCurrency(tMiscCr) : ''}</td>
        </tr>
    `;

    html += `</tbody></table>`;
    return html;
}

// 2. & 3. Income / Expense Ledger
function renderLedger(data, typeFilter) {
    let html = '';
    let total = 0;

    data.filter(t => t.type === typeFilter).forEach(t => {
        let amount = Number(t.amount);
        total += amount;
        html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.voucher_no || '-'}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td style="text-align: right;">${formatCurrency(amount)}</td>
            </tr>
        `;
    });

    html += `
        <tr style="background: #f8fafc; font-weight: bold;">
            <td colspan="4" style="text-align: right;">कुल जम्मा (Total):</td>
            <td style="text-align: right; color: var(--secondary);">${formatCurrency(total)}</td>
        </tr>
    `;
    
    // Add summary cards
    renderSummaryCards([
        { label: typeFilter === 'income' ? 'कुल आम्दानी' : 'कुल खर्च', value: total, type: 'neutral' }
    ]);

    return html;
}

// 4. Cash/Bank Integrated Ledger
function renderCashBank(data) {
    let html = '';
    let balance = 0;

    data.forEach(t => {
        let cIn = 0, cOut = 0, bIn = 0, bOut = 0;
        let amt = Number(t.amount);
        if (t.type === 'income') { bIn = amt; balance += amt; }
        else { bOut = amt; balance -= amt; }

        html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td style="text-align: right;">${cIn ? formatCurrency(cIn) : '-'}</td>
                <td style="text-align: right;">${cOut ? formatCurrency(cOut) : '-'}</td>
                <td style="text-align: right;">${bIn ? formatCurrency(bIn) : '-'}</td>
                <td style="text-align: right;">${bOut ? formatCurrency(bOut) : '-'}</td>
                <td style="text-align: right; font-weight: bold;">${formatCurrency(balance)}</td>
            </tr>
        `;
    });
    return html;
}

// 5. Income vs Expenditure
function renderIncomeExpenditure(data) {
    let categories = {};
    let totalInc = 0, totalExp = 0;

    data.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = { income: 0, expense: 0 };
        }
        let amt = Number(t.amount);
        if (t.type === 'income') {
            categories[t.category].income += amt;
            totalInc += amt;
        } else {
            categories[t.category].expense += amt;
            totalExp += amt;
        }
    });

    let html = '';
    for (const [cat, vals] of Object.entries(categories)) {
        let diff = vals.income - vals.expense;
        html += `
            <tr>
                <td>${cat}</td>
                <td style="text-align: right;">${formatCurrency(vals.income)}</td>
                <td style="text-align: right;">${formatCurrency(vals.expense)}</td>
                <td style="text-align: right; color: ${diff >= 0 ? 'var(--success)' : 'var(--danger)'}">
                    ${formatCurrency(diff)}
                </td>
            </tr>
        `;
    }

    let netDiff = totalInc - totalExp;
    html += `
        <tr style="background: #f8fafc; font-weight: bold; font-size: 1.1em;">
            <td>कुल जम्मा (Total)</td>
            <td style="text-align: right; color: var(--success);">${formatCurrency(totalInc)}</td>
            <td style="text-align: right; color: var(--danger);">${formatCurrency(totalExp)}</td>
            <td style="text-align: right; color: ${netDiff >= 0 ? 'var(--success)' : 'var(--danger)'};">
                ${formatCurrency(netDiff)}
            </td>
        </tr>
    `;

    renderSummaryCards([
        { label: 'कुल आम्दानी (Income)', value: totalInc, type: 'surplus' },
        { label: 'कुल खर्च (Expense)', value: totalExp, type: 'deficit' },
        { label: 'बाँकी मौज्दात (Net)', value: netDiff, type: netDiff >= 0 ? 'surplus' : 'deficit' }
    ]);

    return html;
}

// 6. Trial Balance
function renderTrialBalance(data) {
    let categories = {};
    let totalDr = 0, totalCr = 0;

    // Simplified logic: Income -> Credit, Expense -> Debit for trial balance purpose
    data.forEach(t => {
        if (!categories[t.category]) {
            categories[t.category] = { dr: 0, cr: 0 };
        }
        let amt = Number(t.amount);
        if (t.type === 'income') {
            categories[t.category].cr += amt;
            totalCr += amt;
        } else {
            categories[t.category].dr += amt;
            totalDr += amt;
        }
    });

    let html = '';
    let sn = 1;
    for (const [cat, vals] of Object.entries(categories)) {
        html += `
            <tr>
                <td>${sn++}</td>
                <td>${cat}</td>
                <td style="text-align: right;">${vals.dr > 0 ? formatCurrency(vals.dr) : '-'}</td>
                <td style="text-align: right;">${vals.cr > 0 ? formatCurrency(vals.cr) : '-'}</td>
            </tr>
        `;
    }

    // Add Bank/Cash Balance (Debit)
    let netBank = totalCr - totalDr;
    if(netBank > 0) {
        html += `
            <tr>
                <td>${sn++}</td>
                <td>बैंक तथा नगद मौज्दात (Bank & Cash)</td>
                <td style="text-align: right;">${formatCurrency(netBank)}</td>
                <td style="text-align: right;">-</td>
            </tr>
        `;
        totalDr += netBank;
    }

    html += `
        <tr style="background: #0b2b61; color: white; font-weight: bold; font-size: 1.1em;">
            <td colspan="2" style="text-align: center;">कुल जम्मा (Total)</td>
            <td style="text-align: right;">${formatCurrency(totalDr)}</td>
            <td style="text-align: right;">${formatCurrency(totalCr)}</td>
        </tr>
    `;
    return html;
}

function renderSummaryCards(cards) {
    const container = document.getElementById('report-summary-container');
    container.innerHTML = `<div class="report-summary-cards">
        ${cards.map(c => `
            <div class="report-summary-card ${c.type}">
                <h3>${c.label}</h3>
                <div class="amount">रू. ${formatCurrency(c.value)}</div>
            </div>
        `).join('')}
    </div>`;
}

// Export utilities
function exportReportPDF() {
    const element = document.getElementById('report-printable-area');
    const opt = {
        margin:       0.5,
        filename:     `${currentReport}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

function exportReportExcel() {
    const table = document.querySelector('#report-table-wrapper table');
    if (!table) {
        alert("No table data to export!");
        return;
    }
    const wb = XLSX.utils.table_to_book(table, {sheet: "Report"});
    XLSX.writeFile(wb, `${currentReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Inline Form Logic
function toggleEntryForm() {
    const formContainer = document.getElementById('inline-entry-form-container');
    if (formContainer.style.display === 'none') {
        formContainer.style.display = 'block';
        document.getElementById('tx-date').valueAsDate = new Date();
    } else {
        formContainer.style.display = 'none';
        document.getElementById('inline-entry-form').reset();
    }
}

async function handleInlineSubmit(e) {
    e.preventDefault();
    
    // Bundle the 7 specific amounts into a JSON string
    const amountsObj = {
        cash_dr: document.getElementById('tx-cash-dr').value,
        cash_cr: document.getElementById('tx-cash-cr').value,
        bank_dr: document.getElementById('tx-bank-dr').value,
        bank_cr: document.getElementById('tx-bank-cr').value,
        budget_exp: document.getElementById('tx-budget-exp').value,
        misc_dr: document.getElementById('tx-misc-dr').value,
        misc_cr: document.getElementById('tx-misc-cr').value
    };

    // Fallback if saveTransaction doesn't exist
    if (typeof saveTransaction !== 'function') {
        alert("Saving is only available if database.js supports saveTransaction. Simulating save for now.");
        const newTx = {
            id: 'TX' + Date.now(),
            date: document.getElementById('tx-date').value,
            voucher_no: document.getElementById('tx-voucher').value,
            description: document.getElementById('tx-particulars').value,
            amount: 0, // Not used for direct_entry
            type: 'direct_entry',
            category: JSON.stringify(amountsObj),
            payment_method: 'bank',
            fiscal_year: document.getElementById('filter-fiscal-year').value === 'all' ? '2082/83' : document.getElementById('filter-fiscal-year').value
        };
        allTransactions.push(newTx);
        toggleEntryForm();
        generateReport();
        return;
    }
    
    const formData = {
        type: 'direct_entry',
        category: JSON.stringify(amountsObj), // Store JSON in category
        date: document.getElementById('tx-date').value,
        voucher_no: document.getElementById('tx-voucher').value,
        description: document.getElementById('tx-particulars').value,
        amount: 0, // Direct entry uses custom amounts, amount is 0
        payment_method: 'bank', 
        fund_source: 'Internal' 
    };
    
    try {
        const result = await saveTransaction(formData);
        if (result && (result.success || result.id)) {
            // Re-fetch data
            await loadInitialData();
            toggleEntryForm();
        } else {
            // Wait, database.js returns tx on success, not {success: true} for localStorage
            await loadInitialData();
            toggleEntryForm();
        }
    } catch (error) {
        console.error(error);
        alert('Failed to save transaction.');
    }
}

// Update School Header Dynamically
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
            const titleEl = document.getElementById('txt-school-name');
            
            if (titleEl && schoolInfo.schoolName) {
                titleEl.innerText = schoolInfo.schoolName;
            }

            const logoContainer = document.getElementById('user-school-logo-container');
            if (logoContainer && schoolInfo.logo) {
                logoContainer.innerHTML = `<img src="${schoolInfo.logo}" alt="Logo" class="gov-logo" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
            }

        } catch (e) {
            console.error('Error loading school details:', e);
        }
    }
}
