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

    updateSidebarActiveState();

    // Initialize Nepali Date Picker
    if (window.nepaliDatePicker) {
        document.querySelectorAll('.nepali-date').forEach(input => {
            input.nepaliDatePicker({ ndpYear: true, ndpMonth: true, ndpYearCount: 10 });
        });
    }

    await window.initDatabase();
    updateSchoolHeader();
    allTransactions = window.getTransactions();
    generateReport();

    if (urlParams.get('action') === 'manage_headings') {
        setTimeout(() => {
            if (typeof toggleHeadingManager === 'function') toggleHeadingManager();
        }, 300);
    }
});

// ─────────────────────────────────────────────────────────────────
// SCHOOL HEADER
// ─────────────────────────────────────────────────────────────────
function updateSchoolHeader() {
    // Use window._activeSchoolInfo resolved from Supabase by database.js
    const info = window._activeSchoolInfo;
    if (!info) return;
    try {
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

function getSchoolDisplayName() {
    const info = window._activeSchoolInfo;
    return (info && info.schoolName) ? info.schoolName : 'श्री जन जागृति माध्यमिक विद्यालय';
}

function getSchoolAddress() {
    const info = window._activeSchoolInfo;
    return (info && info.address) ? info.address : 'तिलोत्तमा-३, रुपन्देही';
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
    filteredData.sort((a, b) => {
        let vA = String(a.voucher_no || a.voucherNo || '').trim();
        let vB = String(b.voucher_no || b.voucherNo || '').trim();
        return vA.localeCompare(vB, undefined, { numeric: true, sensitivity: 'base' });
    });

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

    // Dynamic Print Page Size Setup
    let styleEl = document.getElementById('dynamic-print-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-style';
        document.head.appendChild(styleEl);
    }
    const isA3 = (currentReport === 'aamdani_khata' || currentReport === 'kharcha_khata');
    styleEl.innerHTML = `@media print { @page { size: ${isA3 ? 'A3' : 'A4'} landscape; margin: 5mm; } }`;

    document.getElementById('report-table-wrapper').innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────
// 1. BANK NAGADI KITAB (Enhanced)
// ─────────────────────────────────────────────────────────────────
function renderBankNagadi(data) {
    let allRows = [];
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
            allRows.push({
                date: idx === 0 ? t.date : '',
                voucher_no: idx === 0 ? (t.voucher_no || t.voucherNo || '–') : '',
                particulars: idx === 0 ? (t.particulars || t.description || '') : '',
                cashDr: Number(r.cash_dr) || 0,
                cashCr: Number(r.cash_cr) || 0,
                bankDr: Number(r.bank_dr) || 0,
                bankCr: Number(r.bank_cr) || 0,
                budgetExp: Number(r.budget_exp) || 0,
                miscDr: Number(r.misc_dr) || 0,
                miscCr: Number(r.misc_cr) || 0
            });
        });
    });

    const schoolName = getSchoolDisplayName();
    const schoolAddress = getSchoolAddress();
    const fyEl = document.getElementById('filter-fiscal-year');
    const fiscalYear = fyEl ? fyEl.value : '२०८२/८३';
    const title = 'बैंक तथा नगद किताब';

    let headerHtml = `
        <div class="khata-print-header" style="text-align:center;margin-bottom:8px;">
            <div style="font-size:1.15rem;font-weight:800;font-family:var(--font-nepali);">${schoolName}</div>
            <div style="font-size:0.95rem;font-weight:600;font-family:var(--font-nepali);color:var(--secondary);">${schoolAddress}</div>
            <div style="font-size:0.9rem;font-weight:600;color:var(--secondary);">आ.व. ${fiscalYear}</div>
            <div style="font-size:1rem;font-weight:700;font-family:var(--font-nepali);margin-top:4px;border-top:2px solid #333;border-bottom:2px solid #333;padding:3px 0;display:inline-block;">${title}</div>
        </div>
        <table class="data-table bank-cash-book-table" style="margin-bottom:0;">
            <thead>
                <tr>
                    <th rowspan="2" style="vertical-align:middle;color:#fff;">मिति</th>
                    <th rowspan="2" style="vertical-align:middle;color:#fff;">भौचर नं</th>
                    <th rowspan="2" style="vertical-align:middle;color:#fff;">विवरण</th>
                    <th colspan="2" style="text-align:center;background:#f0f4ff;color:#333;">नगद मौज्दात</th>
                    <th colspan="2" style="text-align:center;background:#f0fff4;color:#333;">बैंक मौज्दात</th>
                    <th style="text-align:center;background:#fff8f0;color:#333;">बजेट खर्च</th>
                    <th colspan="2" style="text-align:center;background:#fff0f0;color:#333;">विविध</th>
                </tr>
                <tr>
                    <th style="text-align:center;background:#f0f4ff;color:#333;">डेबिट (Dr)</th>
                    <th style="text-align:center;background:#f0f4ff;color:#333;">क्रेडिट (Cr)</th>
                    <th style="text-align:center;background:#f0fff4;color:#333;">डेबिट (Dr)</th>
                    <th style="text-align:center;background:#f0fff4;color:#333;">क्रेडिट (Cr)</th>
                    <th style="text-align:center;background:#fff8f0;color:#333;">रकम</th>
                    <th style="text-align:center;background:#fff0f0;color:#333;">डेबिट (Dr)</th>
                    <th style="text-align:center;background:#fff0f0;color:#333;">क्रेडिट (Cr)</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (allRows.length === 0) {
        return `<div style="overflow-x:auto;">${headerHtml}<tr><td colspan="10" style="text-align:center;padding:20px;">कुनै तथ्यांक भेटिएन।</td></tr></tbody></table></div>`;
    }

    let html = '';
    const ROWS_PER_PAGE = 10;
    let tCashDr=0, tCashCr=0, tBankDr=0, tBankCr=0, tBudgetExp=0, tMiscDr=0, tMiscCr=0;

    for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
        let pageRows = allRows.slice(i, i + ROWS_PER_PAGE);
        let isLastPage = (i + ROWS_PER_PAGE >= allRows.length);
        
        // Remove page-break-inside: avoid to prevent the entire table from jumping to page 2
        // Use a smaller ROWS_PER_PAGE to comfortably fit with the report header
        html += `<div style="page-break-after: ${isLastPage ? 'auto' : 'always'}; margin-bottom: ${isLastPage ? '0' : '20px'};">`;
        html += headerHtml;
        
        let pCashDr=0, pCashCr=0, pBankDr=0, pBankCr=0, pBudgetExp=0, pMiscDr=0, pMiscCr=0;

        pageRows.forEach(r => {
            tCashDr += r.cashDr; tCashCr += r.cashCr;
            tBankDr += r.bankDr; tBankCr += r.bankCr;
            tBudgetExp += r.budgetExp; tMiscDr += r.miscDr; tMiscCr += r.miscCr;

            pCashDr += r.cashDr; pCashCr += r.cashCr;
            pBankDr += r.bankDr; pBankCr += r.bankCr;
            pBudgetExp += r.budgetExp; pMiscDr += r.miscDr; pMiscCr += r.miscCr;
            
            html += `
                <tr>
                    <td>${r.date}</td>
                    <td>${r.voucher_no}</td>
                    <td>${r.particulars}</td>
                    <td class="num-cell">${r.cashDr ? formatCurrency(r.cashDr) : ''}</td>
                    <td class="num-cell">${r.cashCr ? formatCurrency(r.cashCr) : ''}</td>
                    <td class="num-cell">${r.bankDr ? formatCurrency(r.bankDr) : ''}</td>
                    <td class="num-cell">${r.bankCr ? formatCurrency(r.bankCr) : ''}</td>
                    <td class="num-cell">${r.budgetExp ? formatCurrency(r.budgetExp) : ''}</td>
                    <td class="num-cell">${r.miscDr ? formatCurrency(r.miscDr) : ''}</td>
                    <td class="num-cell">${r.miscCr ? formatCurrency(r.miscCr) : ''}</td>
                </tr>`;
        });

        const emptyRowsCount = ROWS_PER_PAGE - pageRows.length;
        for(let e=0; e<emptyRowsCount; e++) {
            html += `<tr style="height:28px;"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        }

        html += `
            <tr class="khata-total-row">
                <td colspan="3" style="text-align:center;font-weight:bold;">पृष्ठ जम्मा (Page Total)</td>
                <td class="num-cell">${pCashDr ? formatCurrency(pCashDr) : ''}</td>
                <td class="num-cell">${pCashCr ? formatCurrency(pCashCr) : ''}</td>
                <td class="num-cell">${pBankDr ? formatCurrency(pBankDr) : ''}</td>
                <td class="num-cell">${pBankCr ? formatCurrency(pBankCr) : ''}</td>
                <td class="num-cell">${pBudgetExp ? formatCurrency(pBudgetExp) : ''}</td>
                <td class="num-cell">${pMiscDr ? formatCurrency(pMiscDr) : ''}</td>
                <td class="num-cell">${pMiscCr ? formatCurrency(pMiscCr) : ''}</td>
            </tr>`;

        if (isLastPage) {
            html += `
            <tr class="khata-total-row">
                <td colspan="3" style="text-align:center;font-weight:bold;">कुल जम्मा (Grand Total)</td>
                <td class="num-cell">${tCashDr ? formatCurrency(tCashDr) : ''}</td>
                <td class="num-cell">${tCashCr ? formatCurrency(tCashCr) : ''}</td>
                <td class="num-cell">${tBankDr ? formatCurrency(tBankDr) : ''}</td>
                <td class="num-cell">${tBankCr ? formatCurrency(tBankCr) : ''}</td>
                <td class="num-cell">${tBudgetExp ? formatCurrency(tBudgetExp) : ''}</td>
                <td class="num-cell">${tMiscDr ? formatCurrency(tMiscDr) : ''}</td>
                <td class="num-cell">${tMiscCr ? formatCurrency(tMiscCr) : ''}</td>
            </tr>`;
        }

        html += `</tbody></table></div>`;
    }
    
    return html;
}

// ─────────────────────────────────────────────────────────────────
// 2. AAMDANI KHATA / 3. KHARCHA KHATA — Multi-column format
// ─────────────────────────────────────────────────────────────────
function renderKhata(data, type) {
    const headings = window.getLedgerHeadings(type);
    const isParent = h => !h.parent_id || h.parent_id === 'null' || h.parent_id === '';
    const parents = headings.filter(isParent).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
    const schoolName = getSchoolDisplayName();
    const schoolAddress = getSchoolAddress();
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
        <div style="font-size:0.95rem;font-weight:600;font-family:var(--font-nepali);color:var(--secondary);">${schoolAddress}</div>
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
    let allRows = [];
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
            
            // Extract splits from description if they exist (safe from FK constraints)
            let desc = t.description || t.particulars || '';
            if (desc.includes('|||SPLITS:')) {
                try {
                    const parts = desc.split('|||SPLITS:');
                    const parsedSplits = JSON.parse(parts[1]);
                    Object.assign(r, parsedSplits);
                    t.particulars = parts[0]; // Clean up display
                } catch(e) {}
            }
            
            // Also check category for backwards compatibility
            if (t.category && typeof t.category === 'string' && t.category.startsWith('{')) {
                try {
                    const parsedSplits = JSON.parse(t.category);
                    Object.assign(r, parsedSplits);
                } catch(e) {}
            }
            
            if (Object.keys(r).length === 0) {
                // Fallback to default logic if no advanced splits
                if (t.type === 'income') {
                    if (pm === 'cash') r.cash_dr = amount; else r.bank_dr = amount;
                    r.misc_dr = amount;
                } else {
                    if (pm === 'cash') r.cash_cr = amount; else r.bank_cr = amount;
                    if (t.category && !t.category.startsWith('{') && t.category.toLowerCase().includes('misc')) r.misc_cr = amount;
                    else r.budget_exp = amount;
                }
            }
            rows = [r];
        }

        rows.forEach((r, idx) => {
            allRows.push({
                cashDr: Number(r.cash_dr) || 0,
                cashCr: Number(r.cash_cr) || 0,
                bankDr: Number(r.bank_dr) || 0,
                bankCr: Number(r.bank_cr) || 0,
                budgetExp: Number(r.budget_exp) || 0,
                miscDr: Number(r.misc_dr) || 0,
                miscCr: Number(r.misc_cr) || 0
            });
        });
    });

    const schoolName = getSchoolDisplayName();
    const schoolAddress = getSchoolAddress();
    const fyEl = document.getElementById('filter-fiscal-year');
    const fiscalYear = fyEl ? fyEl.value : '२०८२/८३';
    const title = 'नगद बैङ्क खाता';

    let headerHtml = `
        <div class="khata-print-header" style="text-align:center;margin-bottom:8px;">
            <div style="font-size:1.15rem;font-weight:800;font-family:var(--font-nepali);">${schoolName}</div>
            <div style="font-size:0.95rem;font-weight:600;font-family:var(--font-nepali);color:var(--secondary);">${schoolAddress}</div>
            <div style="font-size:1.3rem;font-weight:700;font-family:var(--font-nepali);margin-top:4px;">${title} (${fiscalYear})</div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table bank-cash-book-table" style="margin-bottom:0; font-family:var(--font-nepali); border-collapse: collapse;">
            <thead>
                <tr>
                    <th rowspan="2" style="vertical-align:middle;text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">पाना नं.</th>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">नगद</th>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">बैङ्क</th>
                    <th rowspan="2" style="vertical-align:middle;text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">खर्च</th>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">पेश्की</th>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">विविध</th>
                </tr>
                <tr>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">डेबिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">क्रेडिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">डेबिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">क्रेडिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">पाएको</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">फर्छ्यौट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">डेबिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #333;padding:4px;">क्रेडिट</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (allRows.length === 0) {
        return `<div style="overflow-x:auto;">${headerHtml}<tr><td colspan="10" style="text-align:center;padding:20px;">कुनै तथ्यांक भेटिएन।</td></tr></tbody></table></div></div>`;
    }

    let html = headerHtml;
    const ROWS_PER_PAGE = 10;
    
    let tCashDr=0, tCashCr=0, tBankDr=0, tBankCr=0, tBudgetExp=0, tMiscDr=0, tMiscCr=0;
    let pageNumber = 1;

    for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
        let pageRows = allRows.slice(i, i + ROWS_PER_PAGE);
        let pCashDr=0, pCashCr=0, pBankDr=0, pBankCr=0, pBudgetExp=0, pMiscDr=0, pMiscCr=0;
        
        pageRows.forEach(r => {
            pCashDr += r.cashDr; pCashCr += r.cashCr;
            pBankDr += r.bankDr; pBankCr += r.bankCr;
            pBudgetExp += r.budgetExp; pMiscDr += r.miscDr; pMiscCr += r.miscCr;
            
            tCashDr += r.cashDr; tCashCr += r.cashCr;
            tBankDr += r.bankDr; tBankCr += r.bankCr;
            tBudgetExp += r.budgetExp; tMiscDr += r.miscDr; tMiscCr += r.miscCr;
        });

        html += `
            <tr>
                <td style="text-align:center;">${pageNumber++}.</td>
                <td class="num-cell">${pCashDr ? formatCurrency(pCashDr) : '०.००'}</td>
                <td class="num-cell">${pCashCr ? formatCurrency(pCashCr) : '०.००'}</td>
                <td class="num-cell">${pBankDr ? formatCurrency(pBankDr) : '०.००'}</td>
                <td class="num-cell">${pBankCr ? formatCurrency(pBankCr) : '०.००'}</td>
                <td class="num-cell">${pBudgetExp ? formatCurrency(pBudgetExp) : '०.००'}</td>
                <td class="num-cell"></td>
                <td class="num-cell"></td>
                <td class="num-cell">${pMiscDr ? formatCurrency(pMiscDr) : '०.००'}</td>
                <td class="num-cell">${pMiscCr ? formatCurrency(pMiscCr) : '०.००'}</td>
            </tr>
        `;
    }

    let remaining = 11 - (pageNumber - 1);
    for(let i=0; i < remaining; i++) {
        html += `
            <tr>
                <td style="text-align:center;">${pageNumber++}.</td>
                <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
        `;
    }

    html += `
        <tr style="font-weight:bold;">
            <td style="text-align:center;">जम्मा</td>
            <td class="num-cell">${formatCurrency(tCashDr)}</td>
            <td class="num-cell">${formatCurrency(tCashCr)}</td>
            <td class="num-cell">${formatCurrency(tBankDr)}</td>
            <td class="num-cell">${formatCurrency(tBankCr)}</td>
            <td class="num-cell">${formatCurrency(tBudgetExp)}</td>
            <td class="num-cell">०.००</td>
            <td class="num-cell">०.००</td>
            <td class="num-cell">${formatCurrency(tMiscDr)}</td>
            <td class="num-cell">${formatCurrency(tMiscCr)}</td>
        </tr>
    `;

    let bankBalVal = Math.abs(tBankDr - tBankCr);
    let totalDebit = tCashDr + tBankDr + tBudgetExp + tMiscDr; 
    let totalCredit = tCashCr + tBankCr + tMiscCr; 

    html += `
        <tr>
            <td colspan="3"></td>
            <td style="text-align:center;font-family:Arial,sans-serif;font-weight:600;">Bank b/d</td>
            <td class="num-cell" style="font-weight:600;">${formatCurrency(bankBalVal)}</td>
            <td colspan="5"></td>
        </tr>
    `;

    html += `<tr><td colspan="10" style="border:none;">&nbsp;</td></tr>`;

    html += `
        <tr>
            <td colspan="2" style="font-family:Arial,sans-serif;border:1px solid #333;background:#e2e8f0;padding:4px;">Debit Amount</td>
            <td class="num-cell" style="border:1px solid #333;font-weight:bold;background:#e2e8f0;padding:4px;">${formatCurrency(totalDebit)}</td>
            <td colspan="7" style="border:none;"></td>
        </tr>
        <tr>
            <td colspan="2" style="font-family:Arial,sans-serif;border:1px solid #333;background:#e2e8f0;padding:4px;">Credit Amount</td>
            <td class="num-cell" style="border:1px solid #333;font-weight:bold;background:#e2e8f0;padding:4px;">${formatCurrency(totalCredit)}</td>
            <td colspan="7" style="border:none;"></td>
        </tr>
    `;

    html += `</tbody></table></div>`;
    return html;
}

// ─────────────────────────────────────────────────────────────────
// 5. INCOME VS EXPENDITURE
// ─────────────────────────────────────────────────────────────────
window.recalcAyaVyaya = function() {
    let tInc = 0;
    document.querySelectorAll('.inc-amt-cell').forEach(td => {
        let valStr = td.innerText || td.textContent;
        let val = Number(valStr.replace(/,/g, '').trim()) || 0;
        tInc += val;
    });
    const incTotalEl = document.getElementById('aya-vyaya-total-inc');
    if (incTotalEl) incTotalEl.innerText = tInc > 0 ? formatCurrency(tInc) : '0.00';

    let tExp = 0;
    document.querySelectorAll('.exp-amt-cell').forEach(td => {
        let valStr = td.innerText || td.textContent;
        let val = Number(valStr.replace(/,/g, '').trim()) || 0;
        tExp += val;
    });
    const expTotalEl = document.getElementById('aya-vyaya-total-exp');
    if (expTotalEl) expTotalEl.innerText = tExp > 0 ? formatCurrency(tExp) : '0.00';
};

function renderIncomeExpenditure(data) {
    const fyEl = document.getElementById('filter-fiscal-year');
    const fiscalYear = fyEl ? fyEl.value : '२०८२/८३';
    const title = 'आय / व्यय विवरण';

    function getLeafHeadings(type) {
        const headings = window.getLedgerHeadings(type);
        const isParent = h => !h.parent_id || h.parent_id === 'null' || h.parent_id === '';
        const parents = headings.filter(isParent).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
        const allLeafCols = [];
        parents.forEach(parent => {
            const children = headings.filter(h => h.parent_id === parent.id).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
            if (children.length > 0) {
                children.forEach(child => allLeafCols.push({ ...child }));
            } else {
                allLeafCols.push({ ...parent });
            }
        });
        return allLeafCols;
    }

    let incomes = [];
    let expenses = [];
    let totalInc = 0;
    let totalExp = 0;

    let incTotals = {};
    let expTotals = {};
    
    // Sum from transactions
    data.forEach(t => {
        const amt = Number(t.subheading_amount || t.amount || 0);
        if (t.type === 'income') {
            let key = t.subheading_id || t.category;
            incTotals[key] = (incTotals[key] || 0) + amt;
        } else if (t.type === 'expense') {
            let key = t.subheading_id || t.category;
            expTotals[key] = (expTotals[key] || 0) + amt;
        }
    });

    const incHeadings = getLeafHeadings('income');
    const expHeadings = getLeafHeadings('expense');

    incHeadings.forEach(h => {
        let amt = (incTotals[h.id] || 0) + (incTotals[h.name_ne] || 0);
        incomes.push({ label: h.name_ne, amount: amt });
        totalInc += amt;
        delete incTotals[h.id];
        delete incTotals[h.name_ne];
    });

    expHeadings.forEach(h => {
        let amt = (expTotals[h.id] || 0) + (expTotals[h.name_ne] || 0);
        expenses.push({ label: h.name_ne, amount: amt });
        totalExp += amt;
        delete expTotals[h.id];
        delete expTotals[h.name_ne];
    });

    const schoolName = getSchoolDisplayName();
    const schoolAddress = getSchoolAddress();
    
    let headerHtml = `
        <div class="khata-print-header" style="text-align:center;margin-bottom:8px;">
            <div style="font-size:1.15rem;font-weight:800;font-family:var(--font-nepali);">${schoolName}</div>
            <div style="font-size:0.95rem;font-weight:600;font-family:var(--font-nepali);color:var(--secondary);">${schoolAddress}</div>
            <div style="font-size:1.3rem;font-weight:700;font-family:var(--font-nepali);margin-top:4px;">आ.व. ${fiscalYear} को ${title}</div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table aya-vyaya-table" style="margin-bottom:0; font-family:var(--font-nepali); border-collapse: collapse; width:100%; border:2px solid #000;">
            <thead>
                <tr>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:50%;font-size:1.1rem;">आम्दानी</th>
                    <th colspan="2" style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:50%;font-size:1.1rem;">खर्च</th>
                </tr>
                <tr>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:4px;width:30%;">शीर्षक</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:4px;width:20%;">रकम</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:4px;width:30%;">शीर्षक</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:4px;width:20%;">रकम</th>
                </tr>
            </thead>
            <tbody>
    `;

    let html = headerHtml;
    let maxLen = Math.max(incomes.length, expenses.length);

    for(let i=0; i<maxLen; i++) {
        let inc = incomes[i] || { label: '', amount: 0 };
        let exp = expenses[i] || { label: '', amount: 0 };
        
        let incAmt = inc.amount > 0 ? formatCurrency(inc.amount) : '';
        let expAmt = exp.amount > 0 ? formatCurrency(exp.amount) : '';

        html += `
            <tr>
                <td style="text-align:right;border:1px solid #000;padding:4px 8px;">${inc.label}</td>
                <td class="num-cell inc-amt-cell" style="border:1px solid #000;padding:4px 8px;">${incAmt}</td>
                <td style="text-align:right;border:1px solid #000;padding:4px 8px;">${exp.label}</td>
                <td class="num-cell exp-amt-cell" style="border:1px solid #000;padding:4px 8px;">${expAmt}</td>
            </tr>
        `;
    }

    const predefinedManual = [
        { inc: '', exp: 'नगद' },
        { inc: '', exp: 'रा.वा. बैंक' },
        { inc: '', exp: '' },
        { inc: '', exp: '' }
    ];

    predefinedManual.forEach(row => {
        html += `
            <tr>
                <td contenteditable="true" class="editable-cell" style="text-align:right;border:1px solid #000;padding:4px 8px;outline:none;background:#fefefe;min-height:24px;" title="Click to edit">${row.inc}</td>
                <td contenteditable="true" class="editable-cell num-cell inc-amt-cell" style="border:1px solid #000;padding:4px 8px;outline:none;background:#fefefe;min-height:24px;" oninput="window.recalcAyaVyaya()" title="Click to enter amount"></td>
                <td contenteditable="true" class="editable-cell" style="text-align:right;border:1px solid #000;padding:4px 8px;outline:none;background:#fefefe;min-height:24px;" title="Click to edit">${row.exp}</td>
                <td contenteditable="true" class="editable-cell num-cell exp-amt-cell" style="border:1px solid #000;padding:4px 8px;outline:none;background:#fefefe;min-height:24px;" oninput="window.recalcAyaVyaya()" title="Click to enter amount"></td>
            </tr>
        `;
    });

    html += `
        <tr style="font-weight:bold;">
            <td style="text-align:center;border:1px solid #000;padding:6px;">जम्मा</td>
            <td class="num-cell" id="aya-vyaya-total-inc" style="border:1px solid #000;padding:6px;">${totalInc > 0 ? formatCurrency(totalInc) : '0.00'}</td>
            <td style="text-align:center;border:1px solid #000;padding:6px;">जम्मा</td>
            <td class="num-cell" id="aya-vyaya-total-exp" style="border:1px solid #000;padding:6px;">${totalExp > 0 ? formatCurrency(totalExp) : '0.00'}</td>
        </tr>
    `;

    html += `</tbody></table></div>`;
    renderSummaryCards([]);

    return html;
}

// ─────────────────────────────────────────────────────────────────
// 6. TRIAL BALANCE
// ─────────────────────────────────────────────────────────────────
function renderTrialBalance(data) {
    let tCashDr = 0, tCashCr = 0, tBankDr = 0, tBankCr = 0, tBudgetExp = 0, tMiscDr = 0, tMiscCr = 0;
    
    data.forEach(t => {
        let amount = Number(t.amount);
        let pm = t.payment_method || 'bank';
        
        if (t.type === 'income') {
            if (pm === 'cash') tCashDr += amount; else tBankDr += amount;
            tMiscDr += amount;
        } else if (t.type === 'expense') {
            if (pm === 'cash') tCashCr += amount; else tBankCr += amount;
            if (t.category && t.category.toLowerCase().includes('misc')) tMiscCr += amount;
            else tBudgetExp += amount;
        }
    });

    const fyEl = document.getElementById('filter-fiscal-year');
    const fiscalYear = fyEl ? fyEl.value : '२०८२/०८३';

    let totalDr = tCashDr + tBankDr + tBudgetExp + tMiscDr;
    let totalCr = tCashCr + tBankCr + tMiscCr;

    let cashDiff = tCashDr - tCashCr;
    let bankDiff = tBankDr - tBankCr;
    let expDiff = tBudgetExp - 0;
    let advDiff = 0 - 0;
    let miscDiff = tMiscDr - tMiscCr;
    let totalDiff = totalDr - totalCr;

    const schoolName = getSchoolDisplayName();
    const schoolAddress = getSchoolAddress();

    let html = `
        <div class="khata-print-header" style="text-align:center;margin-bottom:8px;">
            <div style="font-size:1.15rem;font-weight:800;font-family:var(--font-nepali);">${schoolName}</div>
            <div style="font-size:0.95rem;font-weight:600;font-family:var(--font-nepali);color:var(--secondary);">${schoolAddress}</div>
            <div style="font-size:1.3rem;font-weight:700;font-family:var(--font-nepali);margin-top:4px;">सन्तुलन परीक्षण ( आ.व. ${fiscalYear} )</div>
        </div>
        <div style="overflow-x:auto;">
        <table class="data-table trial-balance-table" style="margin-bottom:0; font-family:var(--font-nepali); border-collapse: collapse; width:100%; border:1px solid #000;">
            <thead>
                <tr>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:10%;">क्र.सं.</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:30%;">विवरण</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:20%;">डेबिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:20%;">क्रेडिट</th>
                    <th style="text-align:center;background:#fff;color:#000;border:1px solid #000;padding:6px;width:20%;">कैफियत</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align:center;border:1px solid #000;padding:4px 8px;">१</td>
                    <td style="text-align:right;border:1px solid #000;padding:4px 8px;">नगद</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tCashDr ? formatCurrency(tCashDr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tCashCr ? formatCurrency(tCashCr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${cashDiff ? formatCurrency(cashDiff) : '०'}</td>
                </tr>
                <tr>
                    <td style="text-align:center;border:1px solid #000;padding:4px 8px;">२</td>
                    <td style="text-align:right;border:1px solid #000;padding:4px 8px;">बैंक</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tBankDr ? formatCurrency(tBankDr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tBankCr ? formatCurrency(tBankCr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${bankDiff ? formatCurrency(bankDiff) : '०'}</td>
                </tr>
                <tr>
                    <td style="text-align:center;border:1px solid #000;padding:4px 8px;">३</td>
                    <td style="text-align:right;border:1px solid #000;padding:4px 8px;">खर्च</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tBudgetExp ? formatCurrency(tBudgetExp) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;"></td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${expDiff ? formatCurrency(expDiff) : '०'}</td>
                </tr>
                <tr>
                    <td style="text-align:center;border:1px solid #000;padding:4px 8px;">४</td>
                    <td style="text-align:right;border:1px solid #000;padding:4px 8px;">पेश्की</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;"></td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;"></td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${advDiff ? formatCurrency(advDiff) : '०'}</td>
                </tr>
                <tr>
                    <td style="text-align:center;border:1px solid #000;padding:4px 8px;">५</td>
                    <td style="text-align:right;border:1px solid #000;padding:4px 8px;">विविध</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tMiscDr ? formatCurrency(tMiscDr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${tMiscCr ? formatCurrency(tMiscCr) : ''}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:4px 8px;">${miscDiff ? formatCurrency(miscDiff) : '०'}</td>
                </tr>
                <tr style="font-weight:bold;">
                    <td colspan="2" style="text-align:center;border:1px solid #000;padding:6px;">जम्मा</td>
                    <td class="num-cell" style="border:1px solid #000;padding:6px;">${totalDr ? formatCurrency(totalDr) : '०'}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:6px;">${totalCr ? formatCurrency(totalCr) : '०'}</td>
                    <td class="num-cell" style="border:1px solid #000;padding:6px;">${totalDiff ? formatCurrency(totalDiff) : '०'}</td>
                </tr>
            </tbody>
        </table>
        </div>
    `;

    renderSummaryCards([]);
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
    const isParent = h => !h.parent_id || h.parent_id === 'null' || h.parent_id === '';
    const parents = headings.filter(isParent).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

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
        console.error(err);
        alert('शीर्षक सुरक्षित गर्न असफल भयो।\nError: ' + (err.message || err));
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
    const isParent = h => !h.parent_id || h.parent_id === 'null' || h.parent_id === '';
    const parents = headings.filter(isParent).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    subSelect.innerHTML = '<option value="">-- उप-शीर्षक छान्नुहोस् --</option>';
    parents.forEach(parent => {
        const children = headings.filter(h => h.parent_id === parent.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
        if (children.length > 0) {
            const optGroup = document.createElement('optgroup');
            optGroup.label = parent.name_ne;
            
            // Allow selecting the parent itself
            const parentOpt = document.createElement('option');
            parentOpt.value = parent.id;
            parentOpt.textContent = `${parent.name_ne} (मुख्य शीर्षक)`;
            optGroup.appendChild(parentOpt);

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

function addSplitRow() {
    const container = document.getElementById('split-entries-container');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'split-row';
    row.style.cssText = 'display:flex; gap:10px; margin-bottom:8px;';
    
    row.innerHTML = `
        <select class="form-control split-col" style="flex:1;">
            <option value="bank_dr">बैंक डेबिट (Bank Dr)</option>
            <option value="bank_cr">बैंक क्रेडिट (Bank Cr)</option>
            <option value="cash_dr">नगद डेबिट (Cash Dr)</option>
            <option value="cash_cr">नगद क्रेडिट (Cash Cr)</option>
            <option value="budget_exp">खर्च (Budget Exp)</option>
            <option value="misc_dr">विविध डेबिट (Misc Dr)</option>
            <option value="misc_cr">विविध क्रेडिट (Misc Cr)</option>
        </select>
        <input type="number" class="form-control split-amt" placeholder="Amount" min="0" step="0.01" style="width:140px;">
        <button type="button" class="btn-secondary" style="padding:4px 8px; color:red;" onclick="removeSplitRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeSplitRow(btn) {
    const row = btn.parentElement;
    const container = document.getElementById('split-entries-container');
    if (container && container.children.length > 1) {
        row.remove();
    } else {
        alert('कम्तिमा एउटा रकम विभाजन हुनुपर्छ।');
    }
}

async function handleInlineSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('entry-tx-type').value;
    const subheadingId = document.getElementById('entry-subheading').value;
    const date = document.getElementById('tx-date').value;
    const voucherNo = document.getElementById('tx-voucher').value.trim();
    const particulars = document.getElementById('tx-particulars').value.trim();
    // Build custom splits JSON as an Object to save space
    let splitsObj = {};
    const splitRows = document.querySelectorAll('.split-row');
    splitRows.forEach(row => {
        const col = row.querySelector('.split-col').value;
        const amtStr = row.querySelector('.split-amt').value;
        const amtVal = Number(amtStr);
        if (amtVal > 0) {
            splitsObj[col] = (splitsObj[col] || 0) + amtVal;
        }
    });
    
    // Auto-calculate total amount based on Debits vs Credits
    let totalDr = (splitsObj.bank_dr || 0) + (splitsObj.cash_dr || 0) + (splitsObj.misc_dr || 0) + (splitsObj.budget_exp || 0);
    let totalCr = (splitsObj.bank_cr || 0) + (splitsObj.cash_cr || 0) + (splitsObj.misc_cr || 0);
    let amount = Math.max(totalDr, totalCr);
    
    if (!date || !voucherNo || !particulars || amount <= 0) {
        alert('कृपया सबै आवश्यक फिल्डहरू र कम्तिमा एउटा रकम भर्नुहोस्।');
        return;
    }

    const saveBtn = document.querySelector('#inline-entry-form button[type="submit"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
    
    // Save splits safely in description (avoids FK constraints on category)
    let advancedSplitsJson = Object.keys(splitsObj).length > 0 ? JSON.stringify(splitsObj) : null;
    let finalDescription = particulars;
    if (advancedSplitsJson) {
        finalDescription += '|||SPLITS:' + advancedSplitsJson;
    }

    const formData = {
        type: type,
        category: type === 'income' ? 'gov_conditional' : 'salary', // MUST be a valid school_category
        date: date,
        voucher_no: voucherNo,
        voucherNo: voucherNo,
        particulars: particulars,
        description: finalDescription,
        amount: amount,
        subheading_id: subheadingId || null,
        subheading_amount: amount,
        payment_method: 'bank',
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
    
    const isA3 = (currentReport === 'aamdani_khata' || currentReport === 'kharcha_khata');
    const formatSize = isA3 ? 'a3' : 'a4';

    html2pdf().set({
        margin: 0.3,
        filename: `${currentReport}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: formatSize, orientation: 'landscape' }
    }).from(element).save();
}

function exportReportExcel() {
    let table = document.querySelector('#report-table-wrapper table');
    if (!table) { alert('कुनै तालिका डेटा छैन।'); return; }
    if (typeof XLSX === 'undefined') { alert('Excel library not loaded.'); return; }
    const wb = XLSX.utils.table_to_book(table, { sheet: reportConfigs[currentReport].title });
    XLSX.writeFile(wb, `${currentReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function printReport() {
    window.print();
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
