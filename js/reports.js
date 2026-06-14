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

    // Render Table based on type
    let html = `<table class="data-table">
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
            case 'bank_nagadi': html += renderBankNagadi(filteredData); break;
            case 'aamdani_khata': html += renderLedger(filteredData, 'income'); break;
            case 'kharcha_khata': html += renderLedger(filteredData, 'expense'); break;
            case 'nagad_bank': html += renderCashBank(filteredData); break;
            case 'aaya_vyaya': html += renderIncomeExpenditure(filteredData); break;
            case 'trial_balance': html += renderTrialBalance(filteredData); break;
        }
    }

    html += `</tbody></table>`;
    document.getElementById('report-table-wrapper').innerHTML = html;
}

// 1. Bank Cash Book logic
function renderBankNagadi(data) {
    let html = '';
    let cashBalance = 0;
    let bankBalance = 0;

    data.forEach(t => {
        let cashIn = 0, cashOut = 0, bankIn = 0, bankOut = 0;
        let amount = Number(t.amount);

        // Simple assumption: if no specific cash/bank flag, treat as bank for safety in demo
        if (t.type === 'income') {
            bankIn = amount; 
            bankBalance += amount;
        } else {
            bankOut = amount;
            bankBalance -= amount;
        }

        html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.voucher_no || '-'}</td>
                <td>${t.description}</td>
                <td style="text-align: right;">${cashIn ? formatCurrency(cashIn) : '-'}</td>
                <td style="text-align: right;">${cashOut ? formatCurrency(cashOut) : '-'}</td>
                <td style="text-align: right;">${bankIn ? formatCurrency(bankIn) : '-'}</td>
                <td style="text-align: right;">${bankOut ? formatCurrency(bankOut) : '-'}</td>
                <td style="text-align: right; font-weight: bold;">${formatCurrency(cashBalance)}</td>
                <td style="text-align: right; font-weight: bold;">${formatCurrency(bankBalance)}</td>
            </tr>
        `;
    });
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
