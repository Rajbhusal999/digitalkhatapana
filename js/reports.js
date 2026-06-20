// js/reports.js — Full Ledger Report System
// Handles: Bank Nagadi Kitab, Aamdani Khata, Kharcha Khata, Heading Manager, A3 Print, Excel Export

// Report Configurations
const reportConfigs = {
    'bank_nagadi': {
        title: 'बैंक नगदी किताब',
        subtitle: 'दैनिक बैंक र नगद कारोबारको विवरण',
        en: 'Bank Cash Book'
    },
    'aamdani_khata': {
        title: 'आम्दानी खाता',
        subtitle: 'विद्यालयको सम्पूर्ण आय विवरण',
        en: 'Income Ledger'
    },
    'kharcha_khata': {
        title: 'खर्च खाता',
        subtitle: 'विद्यालयको सम्पूर्ण व्यय विवरण',
        en: 'Expenditure Ledger'
    },
    'nagad_bank': {
        title: 'नगद बैंक खाता',
        subtitle: 'बैंक र नगदको एकीकृत मौज्दात विवरण',
        en: 'Cash Bank Ledger'
    },
    'aaya_vyaya': {
        title: 'आय व्यय विवरण',
        subtitle: 'निश्चित अवधिको आय र व्ययको सारांश',
        en: 'Income & Expenditure'
    },
    'trial_balance': {
        title: 'ट्रायल ब्यालेन्स',
        subtitle: 'सम्पूर्ण खाताहरूको सन्तुलन परीक्षण',
        en: 'Trial Balance'
    }
};

let currentReport = 'bank_nagadi';
let allTransactions = [];

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const reportParam = urlParams.get('report');
    if (reportParam && reportConfigs[reportParam]) {
        currentReport = reportParam;
    }

    updateSchoolHeader();
    updateSidebarActiveState();

    // Initialize Nepali Date Picker
    if (window.nepaliDatePicker) {
        document.querySelectorAll('.nepali-date').forEach(input => {
            input.nepaliDatePicker({ ndpYear: true, ndpMonth: true, ndpYearCount: 10 });
        });
    }

    await window.initDatabase();
    allTransactions = window.getTransactions();
    generateReport();
});

// ─────────────────────────────────────────────────────────────────
// SCHOOL HEADER
// ─────────────────────────────────────────────────────────────────
function updateSchoolHeader() {
    let schoolInfoStr = localStorage.getItem('nepal_school_registered_info');
    if (!schoolInfoStr) {
        const schoolsListStr = localStorage.getItem('nepal_registered_schools');
        if (schoolsListStr) {
            try {
                const list = JSON.parse(schoolsListStr);
                const approved = list.find(s => s.status === 'Approved');
                if (approved) {
                    schoolInfoStr = JSON.stringify(approved);
                    localStorage.setItem('nepal_school_registered_info', schoolInfoStr);
                }
            } catch(e) {}
        }
    }
    if (schoolInfoStr) {
        try {
            const info = JSON.parse(schoolInfoStr);
            const titleEl = document.getElementById('txt-school-name');
            if (titleEl && info.schoolName) titleEl.innerText = info.schoolName;
            const subEl = document.getElementById('txt-gov-subtitle');
            if (subEl && info.address) subEl.innerText = info.address;
            const logoContainer = document.getElementById('user-school-logo-container');
            if (logoContainer && info.logo) {
                logoContainer.innerHTML = `<img src="${info.logo}" alt="Logo" class="gov-logo" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--secondary);">`;
            }
        } catch(e) {}
    }
}

function getSchoolDisplayName() {
    const schoolInfoStr = localStorage.getItem('nepal_school_registered_info');
    if (schoolInfoStr) {
        try {
            const info = JSON.parse(schoolInfoStr);
            return info.schoolName || 'श्री जन जागृति माध्यमिक विद्यालय';
        } catch(e) {}
    }
    return 'श्री जन जागृति माध्यमिक विद्यालय';
}

// ─────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────
function updateSidebarActiveState() {
    document.querySelectorAll('.report-tab-btn, .report-nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.target === currentReport) btn.classList.add('active');
    });
}

function loadReport(reportKey) {
    currentReport = reportKey;
    const url = new URL(window.location);
    url.searchParams.set('report', reportKey);
    window.history.pushState({}, '', url);
    updateSidebarActiveState();

    // Toggle heading manager visibility
    const hm = document.getElementById('heading-manager-panel');
    if (hm) hm.style.display = 'none';

    generateReport();
}

// ─────────────────────────────────────────────────────────────────
// DATA LOAD
// ─────────────────────────────────────────────────────────────────
async function loadInitialData() {
    try {
        document.getElementById('report-table-wrapper').innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div class="spinner"></div><p>Loading data from cloud...</p></div>`;
        allTransactions = window.getTransactions();
        generateReport();
    } catch (error) {
        document.getElementById('report-table-wrapper').innerHTML = `<p style="text-align:center;color:var(--danger);padding:30px;">तथ्यांक लोड गर्न समस्या भयो। (Error loading data)</p>`;
    }
}

// ─────────────────────────────────────────────────────────────────
// CURRENCY FORMAT
// ─────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '–';
    const num = Number(amount);
    if (num === 0) return '–';
    const parts = num.toFixed(2).split('.');
    let intPart = parts[0];
    const lastThree = intPart.substring(intPart.length - 3);
    const others = intPart.substring(0, intPart.length - 3);
    if (others !== '') {
        intPart = others.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    return intPart + '.' + parts[1];
}

// ─────────────────────────────────────────────────────────────────
// MAIN GENERATE REPORT
// ─────────────────────────────────────────────────────────────────
function generateReport() {
    const config = reportConfigs[currentReport];
    document.getElementById('report-title').innerText = config.title;
    document.getElementById('report-subtitle').innerText = config.subtitle;

    const fy = document.getElementById('filter-fiscal-year').value;
    const fromDate = document.getElementById('filter-from-date').value;
    const toDate = document.getElementById('filter-to-date').value;

    let filteredData = [...allTransactions];
    if (fy !== 'all') {
        filteredData = filteredData.filter(t => !t.fiscal_year || t.fiscal_year === fy);
    }
    if (fromDate) {
        filteredData = filteredData.filter(t => t.date >= fromDate);
    }
    if (toDate) {
        filteredData = filteredData.filter(t => t.date <= toDate);
    }
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    document.getElementById('report-summary-container').innerHTML = '';

    // Show/hide entry button
    const btnToggleEntry = document.getElementById('btn-toggle-entry');
    if (btnToggleEntry) {
        btnToggleEntry.style.display = currentReport === 'bank_nagadi' ? 'inline-flex' : 'none';
    }

    // Show/hide heading manager button
    const btnHeadingMgr = document.getElementById('btn-heading-manager');
    if (btnHeadingMgr) {
        btnHeadingMgr.style.display = (currentReport === 'aamdani_khata' || currentReport === 'kharcha_khata') ? 'inline-flex' : 'none';
    }

    // Hide inline form if switching
    const inlineFormContainer = document.getElementById('inline-entry-form-container');
    if (inlineFormContainer && inlineFormContainer.style.display === 'block') {
        inlineFormContainer.style.display = 'none';
    }

    let html = '';
    switch (currentReport) {
        case 'bank_nagadi':   html = renderBankNagadi(filteredData); break;
        case 'aamdani_khata': html = renderKhata(filteredData, 'income'); break;
        case 'kharcha_khata': html = renderKhata(filteredData, 'expense'); break;
        case 'nagad_bank':    html = renderCashBank(filteredData); break;
        case 'aaya_vyaya':    html = renderIncomeExpenditure(filteredData); break;
        case 'trial_balance': html = renderTrialBalance(filteredData); break;
    }

    document.getElementById('report-table-wrapper').innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────
// 1. BANK NAGADI KITAB (Enhanced)
// ─────────────────────────────────────────────────────────────────
function renderBankNagadi(data) {
    let html = `
    <table class="data-table bank-cash-book-table">
        <thead>
            <tr>
                <th rowspan="2" style="vertical-align:middle;">मिति</th>
                <th rowspan="2" style="vertical-align:middle;">भौचर नं</th>
                <th rowspan="2" style="vertical-align:middle;">विवरण</th>
                <th colspan="2" style="text-align:center;background:#f0f4ff;">नगद मौज्दात</th>
                <th colspan="2" style="text-align:center;background:#f0fff4;">बैंक मौज्दात</th>
                <th style="text-align:center;background:#fff8f0;">बजेट खर्च</th>
                <th colspan="2" style="text-align:center;background:#fff0f0;">विविध</th>
            </tr>
            <tr>
                <th style="text-align:center;background:#f0f4ff;">डेबिट (Dr)</th>
                <th style="text-align:center;background:#f0f4ff;">क्रेडिट (Cr)</th>
                <th style="text-align:center;background:#f0fff4;">डेबिट (Dr)</th>
                <th style="text-align:center;background:#f0fff4;">क्रेडिट (Cr)</th>
                <th style="text-align:center;background:#fff8f0;">रकम</th>
                <th style="text-align:center;background:#fff0f0;">डेबिट (Dr)</th>
                <th style="text-align:center;background:#fff0f0;">क्रेडिट (Cr)</th>
            </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
        html += `<tr><td colspan="10" style="text-align:center;padding:20px;">कुनै तथ्यांक भेटिएन।</td></tr></tbody></table>`;
        return html;
    }

    let tCashDr=0, tCashCr=0, tBankDr=0, tBankCr=0, tBudgetExp=0, tMiscDr=0, tMiscCr=0;

    data.forEach(t => {
        let rows = [];
        if (t.type === 'direct_entry') {
            try {
                const parsedCat = JSON.parse(t.category);
                rows = Array.isArray(parsedCat) ? parsedCat : [parsedCat];
            } catch(e) {}
        } else {
            let amount = Number(t.amount);
            let pm = t.payment_method || 'bank';
            let r = {};
            if (t.type === 'income') {
                if (pm === 'cash') r.cash_dr = amount; else r.bank_dr = amount;
                r.misc_dr = amount;
            } else {
                if (pm === 'cash') r.cash_cr = amount; else r.bank_cr = amount;
                if (t.category && t.category.toLowerCase().includes('misc')) r.misc_cr = amount;
                else r.budget_exp = amount;
            }
            rows = [r];
        }

        rows.forEach((r, idx) => {
            const cashDr = r.cash_dr || 0, cashCr = r.cash_cr || 0;
            const bankDr = r.bank_dr || 0, bankCr = r.bank_cr || 0;
            const budgetExp = r.budget_exp || 0, miscDr = r.misc_dr || 0, miscCr = r.misc_cr || 0;

            tCashDr += cashDr; tCashCr += cashCr;
            tBankDr += bankDr; tBankCr += bankCr;
            tBudgetExp += budgetExp; tMiscDr += miscDr; tMiscCr += miscCr;

            html += `
                <tr>
                    <td>${idx === 0 ? t.date : ''}</td>
                    <td>${idx === 0 ? (t.voucher_no || t.voucherNo || '–') : ''}</td>
                    <td>${idx === 0 ? (t.particulars || t.description || '') : ''}</td>
                    <td class="num-cell">${cashDr ? formatCurrency(cashDr) : ''}</td>
                    <td class="num-cell">${cashCr ? formatCurrency(cashCr) : ''}</td>
                    <td class="num-cell">${bankDr ? formatCurrency(bankDr) : ''}</td>
                    <td class="num-cell">${bankCr ? formatCurrency(bankCr) : ''}</td>
                    <td class="num-cell">${budgetExp ? formatCurrency(budgetExp) : ''}</td>
                    <td class="num-cell">${miscDr ? formatCurrency(miscDr) : ''}</td>
                    <td class="num-cell">${miscCr ? formatCurrency(miscCr) : ''}</td>
                </tr>`;
        });
    });

    html += `
        <tr class="khata-total-row">
            <td colspan="3" style="text-align:center;font-weight:bold;">जम्मा (Total)</td>
            <td class="num-cell">${tCashDr ? formatCurrency(tCashDr) : ''}</td>
            <td class="num-cell">${tCashCr ? formatCurrency(tCashCr) : ''}</td>
            <td class="num-cell">${tBankDr ? formatCurrency(tBankDr) : ''}</td>
            <td class="num-cell">${tBankCr ? formatCurrency(tBankCr) : ''}</td>
            <td class="num-cell">${tBudgetExp ? formatCurrency(tBudgetExp) : ''}</td>
            <td class="num-cell">${tMiscDr ? formatCurrency(tMiscDr) : ''}</td>
            <td class="num-cell">${tMiscCr ? formatCurrency(tMiscCr) : ''}</td>
        </tr>
    </tbody></table>`;
    return html;
}

// ─────────────────────────────────────────────────────────────────
// 2. AAMDANI KHATA / 3. KHARCHA KHATA — Multi-column format
// ─────────────────────────────────────────────────────────────────
function renderKhata(data, type) {
    const headings = window.getLedgerHeadings(type);
    const parents = headings.filter(h => !h.parent_id).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
    const schoolName = getSchoolDisplayName();
    const fyEl = document.getElementById('filter-fiscal-year');
    const fiscalYear = fyEl ? fyEl.value : '२०८२/८३';
    const title = type === 'income' ? 'आम्दानी खाता' : 'खर्च खाता';

    // Build leaf (sub-heading) column list — for columns without children, the parent itself is a leaf
    const allLeafCols = [];
    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
        if (children.length > 0) {
            children.forEach(child => allLeafCols.push({ ...child, parentName: parent.name_ne }));
        } else {
            allLeafCols.push({ ...parent, parentName: null });
        }
    });

    // Map amounts to leaf column IDs
    const colTotals = {};
    allLeafCols.forEach(col => { colTotals[col.id] = 0; });
    let grandTotal = 0;

    const filteredTx = data.filter(t => t.type === type);
    filteredTx.forEach(t => {
        const amt = Number(t.subheading_amount || t.amount || 0);
        grandTotal += amt;
        if (t.subheading_id && colTotals[t.subheading_id] !== undefined) {
            colTotals[t.subheading_id] += amt;
        }
    });

    // Build header rows — row1: parent groups, row2: sub-heading leaf names
    let hdrRow1 = '<th rowspan="2" style="vertical-align:middle;min-width:50px;">क्र.सं.</th><th rowspan="2" style="vertical-align:middle;min-width:120px;">विवरण</th><th rowspan="2" style="vertical-align:middle;min-width:80px;">भौचर नं.</th>';
    let hdrRow2 = '';

    // Group leaves by parentName to compute colspan
    const parentGroups = [];
    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        if (children.length > 0) {
            parentGroups.push({ parent, leaves: children });
        } else {
            parentGroups.push({ parent, leaves: [parent] });
        }
    });

    const bgColors = ['#e8f0fe', '#e8f5e9', '#fce8b2', '#fde0dc', '#f3e5f5', '#e0f7fa', '#f1f8e9', '#fff8e1'];
    parentGroups.forEach((group, gi) => {
        const bg = bgColors[gi % bgColors.length];
        // Determine a readable dark text color
        const textColors = ['#1e3a8a','#14532d','#713f12','#7f1d1d','#4a1d96','#164e63','#365314','#78350f'];
        const tc = textColors[gi % textColors.length];
        if (group.leaves.length === 1 && group.leaves[0].id === group.parent.id) {
            hdrRow1 += `<th rowspan="2" style="vertical-align:middle;background:${bg};color:${tc};min-width:90px;font-size:0.78rem;">${group.parent.name_ne}</th>`;
        } else {
            hdrRow1 += `<th colspan="${group.leaves.length}" style="text-align:center;background:${bg};color:${tc};font-size:0.78rem;">${group.parent.name_ne}</th>`;
            group.leaves.forEach(leaf => {
                hdrRow2 += `<th style="text-align:center;background:${bg};color:${tc};min-width:90px;font-size:0.72rem;">${leaf.name_ne}</th>`;
            });
        }
    });
    hdrRow1 += '<th rowspan="2" style="vertical-align:middle;min-width:100px;background:#1a3a6e;color:white;">जम्मा (रू.)</th>';

    // Data rows
    let sn = 1;
    let dataRows = '';
    filteredTx.forEach(t => {
        const amt = Number(t.subheading_amount || t.amount || 0);
        dataRows += `<tr>
            <td style="text-align:center;">${sn++}</td>
            <td>${t.particulars || t.description || ''}</td>
            <td style="text-align:center;">${t.voucher_no || t.voucherNo || '–'}</td>`;

        allLeafCols.forEach(col => {
            let cellAmt = '';
            if (t.subheading_id === col.id && amt > 0) {
                cellAmt = formatCurrency(amt);
            }
            dataRows += `<td class="num-cell">${cellAmt}</td>`;
        });

        dataRows += `<td class="num-cell" style="font-weight:600;">${formatCurrency(amt)}</td></tr>`;
    });

    // Add empty rows for printing (at least 15 rows minimum)
    const emptyRowCount = Math.max(0, 15 - filteredTx.length);
    for (let i = 0; i < emptyRowCount; i++) {
        dataRows += `<tr style="height:28px;"><td></td><td></td><td></td>`;
        allLeafCols.forEach(() => { dataRows += `<td></td>`; });
        dataRows += `<td></td></tr>`;
    }

    // Total row
    let totalRow = `<tr class="khata-total-row">
        <td colspan="3" style="text-align:center;font-weight:bold;font-family:var(--font-nepali);">जम्मा (Total)</td>`;
    allLeafCols.forEach(col => {
        totalRow += `<td class="num-cell">${colTotals[col.id] ? formatCurrency(colTotals[col.id]) : ''}</td>`;
    });
    totalRow += `<td class="num-cell" style="font-weight:bold;">${formatCurrency(grandTotal)}</td></tr>`;

    return `
    <div class="khata-print-header" style="text-align:center;margin-bottom:8px;">
        <div style="font-size:1.15rem;font-weight:800;font-family:var(--font-nepali);">${schoolName}</div>
        <div style="font-size:0.9rem;font-weight:600;color:var(--secondary);">आ.व. ${fiscalYear}</div>
        <div style="font-size:1rem;font-weight:700;font-family:var(--font-nepali);margin-top:4px;border-top:2px solid #333;border-bottom:2px solid #333;padding:3px 0;">${title}</div>
    </div>
    <div style="overflow-x:auto;">
    <table class="data-table khata-table" id="khata-table-${type}">
        <thead>
            <tr>${hdrRow1}</tr>
            <tr>${hdrRow2}</tr>
        </thead>
        <tbody>
            ${dataRows}
            ${totalRow}
        </tbody>
    </table>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// 4. CASH/BANK LEDGER
// ─────────────────────────────────────────────────────────────────
function renderCashBank(data) {
    let html = `<table class="data-table"><thead><tr>
        <th>मिति</th><th>विवरण</th>
        <th>नगद प्राप्ति</th><th>नगद भुक्तानी</th>
        <th>बैंक जम्मा</th><th>बैंक भुक्तानी</th><th>कुल मौज्दात</th>
    </tr></thead><tbody>`;
    let balance = 0;
    let tCashIn = 0, tCashOut = 0, tBankIn = 0, tBankOut = 0;
    data.forEach(t => {
        let amt = Number(t.amount);
        let pm = t.payment_method || 'bank';
        let cIn = 0, cOut = 0, bIn = 0, bOut = 0;

        if (t.type === 'income') { 
            balance += amt; 
            if (pm === 'cash') { cIn = amt; tCashIn += amt; }
            else { bIn = amt; tBankIn += amt; }
        } else { 
            balance -= amt; 
            if (pm === 'cash') { cOut = amt; tCashOut += amt; }
            else { bOut = amt; tBankOut += amt; }
        }
        
        html += `<tr>
            <td>${t.date}</td><td>${t.particulars||t.description||''}</td>
            <td class="num-cell">${cIn?formatCurrency(cIn):'–'}</td>
            <td class="num-cell">${cOut?formatCurrency(cOut):'–'}</td>
            <td class="num-cell">${bIn?formatCurrency(bIn):'–'}</td>
            <td class="num-cell">${bOut?formatCurrency(bOut):'–'}</td>
            <td class="num-cell" style="font-weight:bold;">${formatCurrency(balance)}</td>
        </tr>`;
    });
    
    html += `<tr class="khata-total-row">
        <td colspan="2" style="text-align:center;font-weight:bold;">जम्मा (Total)</td>
        <td class="num-cell">${tCashIn ? formatCurrency(tCashIn) : '–'}</td>
        <td class="num-cell">${tCashOut ? formatCurrency(tCashOut) : '–'}</td>
        <td class="num-cell">${tBankIn ? formatCurrency(tBankIn) : '–'}</td>
        <td class="num-cell">${tBankOut ? formatCurrency(tBankOut) : '–'}</td>
        <td class="num-cell" style="font-weight:bold;">${formatCurrency(balance)}</td>
    </tr>`;

    html += `</tbody></table>`;
    return html;
}

// ─────────────────────────────────────────────────────────────────
// 5. INCOME VS EXPENDITURE
// ─────────────────────────────────────────────────────────────────
function renderIncomeExpenditure(data) {
    let cats = {}, totalInc = 0, totalExp = 0;
    data.forEach(t => {
        if (!cats[t.category]) cats[t.category] = { income: 0, expense: 0 };
        const amt = Number(t.amount);
        if (t.type === 'income') { cats[t.category].income += amt; totalInc += amt; }
        else { cats[t.category].expense += amt; totalExp += amt; }
    });
    let html = `<table class="data-table"><thead><tr>
        <th>शीर्षक</th><th>कुल आम्दानी (रू.)</th><th>कुल खर्च (रू.)</th><th>बचत/घाटा (रू.)</th>
    </tr></thead><tbody>`;
    for (const [cat, v] of Object.entries(cats)) {
        const diff = v.income - v.expense;
        html += `<tr>
            <td>${cat}</td>
            <td class="num-cell">${formatCurrency(v.income)}</td>
            <td class="num-cell">${formatCurrency(v.expense)}</td>
            <td class="num-cell" style="color:${diff>=0?'var(--success)':'var(--danger)'};">${formatCurrency(diff)}</td>
        </tr>`;
    }
    const net = totalInc - totalExp;
    html += `<tr class="khata-total-row">
        <td>कुल जम्मा</td>
        <td class="num-cell">${formatCurrency(totalInc)}</td>
        <td class="num-cell">${formatCurrency(totalExp)}</td>
        <td class="num-cell" style="color:${net>=0?'var(--success)':'var(--danger)'};">${formatCurrency(net)}</td>
    </tr></tbody></table>`;
    renderSummaryCards([
        { label: 'कुल आम्दानी', value: totalInc, type: 'surplus' },
        { label: 'कुल खर्च', value: totalExp, type: 'deficit' },
        { label: 'बाँकी', value: net, type: net>=0?'surplus':'deficit' }
    ]);
    return html;
}

// ─────────────────────────────────────────────────────────────────
// 6. TRIAL BALANCE
// ─────────────────────────────────────────────────────────────────
function renderTrialBalance(data) {
    let cats = {}, totalDr = 0, totalCr = 0;
    data.forEach(t => {
        if (!cats[t.category]) cats[t.category] = { dr: 0, cr: 0 };
        const amt = Number(t.amount);
        if (t.type==='income') { cats[t.category].cr += amt; totalCr += amt; }
        else { cats[t.category].dr += amt; totalDr += amt; }
    });
    let html = `<table class="data-table"><thead><tr>
        <th>सि.नं.</th><th>खाताको नाम</th><th>डेबिट (Dr)</th><th>क्रेडिट (Cr)</th>
    </tr></thead><tbody>`;
    let sn = 1;
    for (const [cat, v] of Object.entries(cats)) {
        html += `<tr>
            <td>${sn++}</td><td>${cat}</td>
            <td class="num-cell">${v.dr>0?formatCurrency(v.dr):'–'}</td>
            <td class="num-cell">${v.cr>0?formatCurrency(v.cr):'–'}</td>
        </tr>`;
    }
    const netBank = totalCr - totalDr;
    if (netBank > 0) {
        html += `<tr><td>${sn++}</td><td>बैंक तथा नगद मौज्दात</td><td class="num-cell">${formatCurrency(netBank)}</td><td>–</td></tr>`;
        totalDr += netBank;
    }
    html += `<tr class="khata-total-row">
        <td colspan="2" style="text-align:center;">कुल जम्मा</td>
        <td class="num-cell">${formatCurrency(totalDr)}</td>
        <td class="num-cell">${formatCurrency(totalCr)}</td>
    </tr></tbody></table>`;
    return html;
}

function renderSummaryCards(cards) {
    const container = document.getElementById('report-summary-container');
    if (!container) return;
    container.innerHTML = `<div class="report-summary-cards">
        ${cards.map(c => `
            <div class="report-summary-card ${c.type}">
                <h3>${c.label}</h3>
                <div class="amount">रू. ${formatCurrency(c.value)}</div>
            </div>
        `).join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// HEADING MANAGER
// ─────────────────────────────────────────────────────────────────
function toggleHeadingManager() {
    const panel = document.getElementById('heading-manager-panel');
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        renderHeadingManager();
    } else {
        panel.style.display = 'none';
    }
}

function renderHeadingManager() {
    const type = currentReport === 'aamdani_khata' ? 'income' : 'expense';
    const headings = window.getLedgerHeadings(type);
    const parents = headings.filter(h => !h.parent_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    const container = document.getElementById('heading-manager-list');
    if (!container) return;

    container.innerHTML = '';
    if (parents.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">कुनै शीर्षक छैन।</p>';
        return;
    }

    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        const childrenHTML = children.map(child => `
            <div class="hm-subrow">
                <span class="hm-sub-badge">उप</span>
                <span class="hm-name">${child.name_ne} <small style="color:#888;">${child.name_en||''}</small></span>
                <div class="hm-actions">
                    <button class="hm-btn hm-btn-edit" onclick="openEditHeading('${child.id}')">✏️</button>
                    <button class="hm-btn hm-btn-del" onclick="confirmDeleteHeading('${child.id}')">🗑️</button>
                </div>
            </div>
        `).join('');

        container.innerHTML += `
            <div class="hm-group">
                <div class="hm-parentrow">
                    <span class="hm-parent-badge">मु</span>
                    <span class="hm-name"><strong>${parent.name_ne}</strong> <small style="color:#888;">${parent.name_en||''}</small></span>
                    <div class="hm-actions">
                        <button class="hm-btn hm-btn-add-sub" onclick="openAddSubHeading('${parent.id}','${type}')">+ उप</button>
                        <button class="hm-btn hm-btn-edit" onclick="openEditHeading('${parent.id}')">✏️</button>
                        <button class="hm-btn hm-btn-del" onclick="confirmDeleteHeading('${parent.id}')">🗑️</button>
                    </div>
                </div>
                ${childrenHTML}
            </div>`;
    });
}

function openAddHeading(type) {
    document.getElementById('hm-modal-title').innerText = 'नयाँ मुख्य शीर्षक थप्नुहोस्';
    document.getElementById('hm-form-id').value = '';
    document.getElementById('hm-form-type').value = type;
    document.getElementById('hm-form-parent').value = '';
    document.getElementById('hm-form-name-ne').value = '';
    document.getElementById('hm-form-name-en').value = '';
    document.getElementById('hm-form-order').value = 99;
    document.getElementById('hm-modal').style.display = 'flex';
}

function openAddSubHeading(parentId, type) {
    document.getElementById('hm-modal-title').innerText = 'नयाँ उप-शीर्षक थप्नुहोस्';
    document.getElementById('hm-form-id').value = '';
    document.getElementById('hm-form-type').value = type;
    document.getElementById('hm-form-parent').value = parentId;
    document.getElementById('hm-form-name-ne').value = '';
    document.getElementById('hm-form-name-en').value = '';
    document.getElementById('hm-form-order').value = 99;
    document.getElementById('hm-modal').style.display = 'flex';
}

function openEditHeading(id) {
    const h = window.getLedgerHeadingById(id);
    if (!h) return;
    document.getElementById('hm-modal-title').innerText = 'शीर्षक सम्पादन गर्नुहोस्';
    document.getElementById('hm-form-id').value = h.id;
    document.getElementById('hm-form-type').value = h.type;
    document.getElementById('hm-form-parent').value = h.parent_id || '';
    document.getElementById('hm-form-name-ne').value = h.name_ne;
    document.getElementById('hm-form-name-en').value = h.name_en || '';
    document.getElementById('hm-form-order').value = h.sort_order || 0;
    document.getElementById('hm-modal').style.display = 'flex';
}

function closeHmModal() {
    document.getElementById('hm-modal').style.display = 'none';
}

async function handleHmFormSubmit(e) {
    e.preventDefault();
    const heading = {
        id: document.getElementById('hm-form-id').value || null,
        type: document.getElementById('hm-form-type').value,
        parent_id: document.getElementById('hm-form-parent').value || null,
        name_ne: document.getElementById('hm-form-name-ne').value.trim(),
        name_en: document.getElementById('hm-form-name-en').value.trim(),
        sort_order: Number(document.getElementById('hm-form-order').value) || 0
    };

    if (!heading.name_ne) { alert('नेपाली नाम आवश्यक छ।'); return; }

    const saveBtn = document.getElementById('hm-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'सुरक्षित हुँदैछ...';

    try {
        await window.saveLedgerHeading(heading);
        closeHmModal();
        renderHeadingManager();
        generateReport(); // Refresh khata columns
        showReportToast('शीर्षक सफलतापूर्वक सुरक्षित गरियो!', 'success');
    } catch(err) {
        alert('शीर्षक सुरक्षित गर्न असफल भयो।');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'सुरक्षित गर्नुहोस्';
    }
}

async function confirmDeleteHeading(id) {
    const h = window.getLedgerHeadingById(id);
    if (!h) return;
    if (!confirm(`के तपाईं "${h.name_ne}" शीर्षक मेट्न निश्चित हुनुहुन्छ?\n(सबै उप-शीर्षकहरू पनि मेटिनेछन्)`)) return;
    try {
        await window.deleteLedgerHeading(id);
        renderHeadingManager();
        generateReport();
        showReportToast('शीर्षक मेटिएको छ।', 'info');
    } catch(err) {
        alert('शीर्षक मेट्न असफल भयो।');
    }
}

// ─────────────────────────────────────────────────────────────────
// BANK NAGADI ENTRY FORM — ENHANCED WITH SUBHEADING DROPDOWN
// ─────────────────────────────────────────────────────────────────
function toggleEntryForm() {
    const formContainer = document.getElementById('inline-entry-form-container');
    if (!formContainer) return;
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        formContainer.style.display = 'block';
        populateSubheadingDropdown();
    } else {
        formContainer.style.display = 'none';
        const form = document.getElementById('inline-entry-form');
        if (form) form.reset();
    }
}

function populateSubheadingDropdown() {
    const typeSelect = document.getElementById('entry-tx-type');
    const subSelect = document.getElementById('entry-subheading');
    if (!typeSelect || !subSelect) return;

    const type = typeSelect.value;
    const headings = window.getLedgerHeadings(type);
    const parents = headings.filter(h => !h.parent_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    subSelect.innerHTML = '<option value="">-- उप-शीर्षक छान्नुहोस् --</option>';
    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        if (children.length > 0) {
            const optGroup = document.createElement('optgroup');
            optGroup.label = parent.name_ne;
            children.forEach(child => {
                const opt = document.createElement('option');
                opt.value = child.id;
                opt.textContent = `${parent.name_ne} → ${child.name_ne}`;
                optGroup.appendChild(opt);
            });
            subSelect.appendChild(optGroup);
        } else {
            const opt = document.createElement('option');
            opt.value = parent.id;
            opt.textContent = parent.name_ne;
            subSelect.appendChild(opt);
        }
    });
}

async function handleInlineSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('entry-tx-type').value;
    const subheadingId = document.getElementById('entry-subheading').value;
    const date = document.getElementById('tx-date').value;
    const voucherNo = document.getElementById('tx-voucher').value.trim();
    const particulars = document.getElementById('tx-particulars').value.trim();
    const amount = Number(document.getElementById('entry-amount').value);

    if (!date || !voucherNo || !particulars || !amount || amount <= 0) {
        alert('कृपया सबै आवश्यक फिल्डहरू भर्नुहोस्।\nPlease fill all required fields.');
        return;
    }

    const saveBtn = document.querySelector('#inline-entry-form button[type="submit"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    const formData = {
        type: type,
        category: type === 'income' ? 'gov_conditional' : 'salary', // default category
        date: date,
        voucher_no: voucherNo,
        voucherNo: voucherNo,
        particulars: particulars,
        description: particulars,
        amount: amount,
        subheading_id: subheadingId || null,
        subheading_amount: amount,
        payment_method: document.getElementById('entry-payment-method')?.value || 'bank',
        fiscal_year: document.getElementById('filter-fiscal-year').value || '2082/83',
        fund_source: 'Internal'
    };

    try {
        await window.saveTransaction(formData);
        allTransactions = window.getTransactions();
        generateReport();
        toggleEntryForm();
        showReportToast('✅ कारोबार सफलतापूर्वक सुरक्षित गरियो!', 'success');
    } catch (error) {
        console.error(error);
        alert('Failed to save transaction: ' + (error.message || error));
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'सुरक्षित गर्नुहोस् (Save)'; }
    }
}

// ─────────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────
function exportReportPDF() {
    const element = document.getElementById('report-printable-area');
    if (typeof html2pdf === 'undefined') { window.print(); return; }
    const config = reportConfigs[currentReport];
    html2pdf().set({
        margin: 0.3,
        filename: `${currentReport}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' }
    }).from(element).save();
}

function exportReportExcel() {
    let table = document.querySelector('#report-table-wrapper table');
    if (!table) { alert('कुनै तालिका डेटा छैन।'); return; }
    if (typeof XLSX === 'undefined') { alert('Excel library not loaded.'); return; }
    const wb = XLSX.utils.table_to_book(table, { sheet: reportConfigs[currentReport].title });
    XLSX.writeFile(wb, `${currentReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function printA3() {
    const body = document.body;
    body.classList.add('a3-print-mode');
    window.print();
    setTimeout(() => body.classList.remove('a3-print-mode'), 1000);
}

// ─────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────
function showReportToast(msg, type = 'success') {
    let container = document.getElementById('report-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'report-toast-container';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content">${msg}</div><button style="background:none;border:none;cursor:pointer;font-weight:bold;" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
}
