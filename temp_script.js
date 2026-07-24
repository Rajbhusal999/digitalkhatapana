
        document.addEventListener('DOMContentLoaded', async () => {
            if (sessionStorage.getItem('school_user_logged_in') !== 'true') {
                window.location.href = 'school-login.html';
                return;
            }

            if (window.initDatabase) {
                await window.initDatabase();
            }

            // Set Print Headers
            if (window._activeSchoolInfo) {
                document.getElementById('print_school_name').innerText = window._activeSchoolInfo.schoolName || '';
                document.getElementById('print_school_address').innerText = window._activeSchoolInfo.address || '';
            }
        });

        async function loadReport() {
            if (!window._activeSchoolInfo || !supabaseClient) return;
            const schoolId = window._activeSchoolInfo.id;
            const pageNo = document.getElementById('search_page_no').value.trim();

            if (!pageNo) {
                alert("Please enter a Page No.");
                return;
            }

            // Update print header
            document.getElementById('print_page_no').innerText = pageNo;

            const tbody = document.getElementById('entries-tbody');
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">लोड हुँदैछ...</td></tr>`;

            // Fetch vouchers by page_no
            const { data, error } = await supabaseClient
                .from('bnk_vouchers')
                .select(`
                    *,
                    bnk_entries (*)
                `)
                .eq('school_id', schoolId)
                .eq('page_no', pageNo)
                .order('transaction_date', { ascending: true })
                .order('created_at', { ascending: true });
            
            if (error) {
                tbody.innerHTML = `<tr><td colspan="10" style="color:red; text-align: center;">Error loading report.</td></tr>`;
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;">No entries found for this Page No.</td></tr>`;
                return;
            }

            // Sort data numerically by voucher_no
            data.sort((a, b) => {
                const vA = parseInt(a.voucher_no) || 0;
                const vB = parseInt(b.voucher_no) || 0;
                if (vA !== vB) return vA - vB;
                return new Date(a.transaction_date) - new Date(b.transaction_date);
            });

            let html = '';
            let totals = { cdr:0, ccr:0, bdr:0, bcr:0, bud:0, mdr:0, mcr:0 };

            data.forEach(voucher => {
                let isFirstRow = true;
                const entries = voucher.bnk_entries || [];

                if (entries.length === 0) {
                    html += `
                        <tr class="voucher-row">
                            <td>${voucher.transaction_date}</td>
                            <td>${voucher.voucher_no || '-'}</td>
                            <td style="text-align: left;">${voucher.particulars}</td>
                            <td colspan="7"></td>
                        </tr>
                    `;
                }

                entries.forEach((entry) => {
                    const cdr = Number(entry.cash_debit) || 0;
                    const ccr = Number(entry.cash_credit) || 0;
                    const bdr = Number(entry.bank_debit) || 0;
                    const bcr = Number(entry.bank_credit) || 0;
                    const bud = Number(entry.budget_kharcha) || 0;
                    const mdr = Number(entry.bibidh_debit) || 0;
                    const mcr = Number(entry.bibidh_credit) || 0;

                    html += `
                        <tr class="${isFirstRow ? 'voucher-row' : ''}">
                            <td>${isFirstRow ? voucher.transaction_date : ''}</td>
                            <td>${isFirstRow ? (voucher.voucher_no || '-') : ''}</td>
                            <td style="text-align: left;">${isFirstRow ? voucher.particulars : ''}</td>
                            <td>${cdr || ''}</td>
                            <td>${ccr || ''}</td>
                            <td>${bdr || ''}</td>
                            <td>${bcr || ''}</td>
                            <td>${bud || ''}</td>
                            <td>${mdr || ''}</td>
                            <td>${mcr || ''}</td>
                        </tr>
                    `;
                    
                    isFirstRow = false;
                    totals.cdr += cdr;
                    totals.ccr += ccr;
                    totals.bdr += bdr;
                    totals.bcr += bcr;
                    totals.bud += bud;
                    totals.mdr += mdr;
                    totals.mcr += mcr;
                });
            });
            
            tbody.innerHTML = html;

            document.getElementById('tot_cash_dr').innerText = totals.cdr.toFixed(2);
            document.getElementById('tot_cash_cr').innerText = totals.ccr.toFixed(2);
            document.getElementById('tot_bank_dr').innerText = totals.bdr.toFixed(2);
            document.getElementById('tot_bank_cr').innerText = totals.bcr.toFixed(2);
            document.getElementById('tot_budget').innerText = totals.bud.toFixed(2);
            document.getElementById('tot_misc_dr').innerText = totals.mdr.toFixed(2);
            document.getElementById('tot_misc_cr').innerText = totals.mcr.toFixed(2);
        }

        function exportToExcel() {
            const table = document.getElementById("reportTable");
            const pageNo = document.getElementById('search_page_no').value.trim() || 'All';
            const wb = XLSX.utils.table_to_book(table, {sheet: "Bank Nagadi Kitaab"});
            XLSX.writeFile(wb, `Bank_Nagadi_Kitaab_Page_${pageNo}.xlsx`);
        }
    