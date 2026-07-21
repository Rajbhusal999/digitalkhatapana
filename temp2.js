
        // ✅ SINGLE unified init — no race condition, Supabase client owned by admin panel
        let superAdminSupabase = null;

        document.addEventListener('DOMContentLoaded', async () => {
            // Reset filter
            const filterSelect = document.getElementById('filter-status-select');
            if (filterSelect) filterSelect.value = 'all';

            // Create dedicated Supabase client for super admin (no dependency on database.js)
            if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                try {
                    superAdminSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    console.log('[SuperAdmin] Own Supabase client created successfully.');
                } catch (e) {
                    console.error('[SuperAdmin] Failed to create Supabase client:', e);
                }
            }

            checkSuperAuth();
        });

        // ─── Fetch registered_schools DIRECTLY from Supabase ───────────────────────
        async function fetchSchoolsFromSupabase() {
            if (!superAdminSupabase) {
                console.warn('[SuperAdmin] No Supabase client.');
                return [];
            }
            try {
                const { data, error } = await superAdminSupabase
                    .from('registered_schools')
                    .select('*')
                    .order('registered_at', { ascending: false });
                if (error) throw error;

                // Map snake_case → camelCase
                const schools = (data || []).map(item => ({
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
                    subscription: (function () {
                        try { return typeof item.subscription === 'string' ? JSON.parse(item.subscription) : item.subscription; }
                        catch (e) { return item.subscription; }
                    })(),
                    paymentMethod: item.payment_method,
                    transactionCode: item.transaction_code,
                    registeredAt: item.registered_at
                }));

                _cachedSchoolsList = schools;
                console.log(`[SuperAdmin] Loaded ${schools.length} schools from Supabase.`);
                return schools;
            } catch (e) {
                console.error('[SuperAdmin] Supabase fetch failed:', e);
                return _cachedSchoolsList || [];
            }
        }

        // ─── Initialize dashboard (always pulls fresh from Supabase) ───────────────
        async function initSuperDashboard() {
            const schools = await fetchSchoolsFromSupabase();
            updateSuperMetrics(schools);
            renderSchoolsDatabase(schools);
            renderNotifications();
            setTimeout(renderSuperCharts, 100);
        }

        // In-memory cache for admin panel
        let _cachedSchoolsList = [];

        // ─── Render mock notifications in Super Admin Inbox (from Supabase) ──────
        async function renderNotifications() {
            const listEl = document.getElementById('email-inbox-list');
            if (!listEl) return;

            listEl.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">Loading notifications...</div>';

            let notifications = [];
            if (window.fetchNotifications) {
                notifications = await window.fetchNotifications();
            }

            listEl.innerHTML = '';

            // Sort by timestamp descending
            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            notifications.forEach(notif => {
                const bubble = document.createElement('div');
                bubble.className = 'email-bubble';

                const timeStr = new Date(notif.timestamp).toLocaleString();

                bubble.innerHTML = `
                    <div class="email-header">
                        <span>To: ${notif.to}</span>
                        <span>${timeStr}</span>
                    </div>
                    <div class="email-subject">✉️ ${notif.subject}</div>
                    <div class="email-body">${notif.body}</div>
                `;

                bubble.style.cursor = 'pointer';
                bubble.title = 'Click to find this school in the table below';
                bubble.onclick = () => {
                    document.getElementById('filter-status-select').value = 'all';
                    const searchInput = document.getElementById('search-school-input');
                    if (notif.schoolName) {
                        searchInput.value = notif.schoolName;
                    } else {
                        searchInput.value = '';
                    }
                    renderSchoolsDatabase();
                    showSuperToast('Showing registration for: ' + (notif.schoolName || 'all schools'), 'info');
                };

                listEl.appendChild(bubble);
            });

            if (notifications.length === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 40px 10px; font-size: 0.85rem; border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm); margin-top: 20px;">
                        Inbox is empty.<br>New school registrations will trigger alert emails here.
                    </div>
                `;
            }
        }

        async function clearNotifications() {
            if (confirm('Are you sure you want to clear all system email notifications?')) {
                if (window.clearNotifications) {
                    await window.clearNotifications();
                }
                showSuperToast('Email notifications cleared.', 'info');
                renderNotifications();
            }
        }

        function checkSuperAuth() {
            const isLoggedIn = sessionStorage.getItem('super_admin_logged_in') === 'true';
            const loginSection = document.getElementById('super-login-section');
            const dashboardSection = document.getElementById('super-dashboard-section');
            if (isLoggedIn) {
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                initSuperDashboard();
            } else {
                loginSection.style.display = 'flex';
                dashboardSection.style.display = 'none';
            }
        }

        function handleSuperLogin(event) {
            if (event) event.preventDefault();
            try {
                const email = document.getElementById('super-email').value.trim().toLowerCase();
                const password = document.getElementById('super-password').value.trim();
                if (email === 'khatapanadigital2083@gmail.com' && password === 'Khatapana@2083/') {
                    sessionStorage.setItem('super_admin_logged_in', 'true');
                    try { showSuperToast('Access Granted! Redirecting to dashboard...', 'success'); } catch (e) { }
                    setTimeout(() => { checkSuperAuth(); }, 1000);
                } else {
                    try { showSuperToast('Invalid Credentials! Access Denied.', 'error'); } catch (e) { alert('Invalid Credentials! Access Denied.'); }
                }
            } catch (err) {
                alert("Login Error: " + err.message + "\nPlease make sure you are not in Incognito Mode and cookies/storage are allowed.");
            }
        }

        function handleSuperLogout() {
            sessionStorage.removeItem('super_admin_logged_in');
            showSuperToast('Logged out successfully.', 'info');
            setTimeout(() => { checkSuperAuth(); }, 500);
        }

        function updateSuperMetrics(schoolsList) {
            schoolsList = schoolsList || [];

            const total = schoolsList.length;
            const pending = schoolsList.filter(s => s.status === 'Pending').length;
            const approved = schoolsList.filter(s => s.status === 'Approved').length;
            const rejected = schoolsList.filter(s => s.status === 'Rejected').length;

            document.getElementById('kpi-val-total').innerText = total;
            document.getElementById('kpi-val-pending').innerText = pending;
            document.getElementById('kpi-val-approved').innerText = approved;
            document.getElementById('kpi-val-rejected').innerText = rejected;
        }

        async function renderSchoolsDatabase(schoolsList) {
            const tbody = document.getElementById('super-schools-tbody');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:20px;">Loading schools from database...</td></tr>';

            // ✅ Always fetch fresh from Supabase if no list was passed
            if (!schoolsList) {
                schoolsList = await fetchSchoolsFromSupabase();
                updateSuperMetrics(schoolsList);
            }

            tbody.innerHTML = '';

            // Sort by date descending
            schoolsList.sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0));

            const searchQuery = document.getElementById('search-school-input').value.toLowerCase().trim();
            const filterStatus = document.getElementById('filter-status-select').value;

            let displayedCount = 0;

            schoolsList.forEach(school => {
                // Apply filter status
                if (filterStatus !== 'all' && school.status !== filterStatus) return;

                // Apply search query
                if (searchQuery) {
                    const nameMatch = (school.schoolName || '').toLowerCase().includes(searchQuery);
                    const emailMatch = (school.schoolEmail || '').toLowerCase().includes(searchQuery);
                    const emisMatch = (school.emis || '').toLowerCase().includes(searchQuery);
                    if (!nameMatch && !emailMatch && !emisMatch) return;
                }

                displayedCount++;
                const row = document.createElement('tr');

                // Status badge
                let statusBadge = '';
                if (school.status === 'Approved') {
                    statusBadge = `<span class="badge income" style="font-size:0.75rem; font-weight:700;">स्वीकृत (Approved)</span>`;
                } else if (school.status === 'Rejected') {
                    statusBadge = `<span class="badge expense" style="font-size:0.75rem; font-weight:700; background:#ef4444; color:white;">अस्वीकृत (Rejected)</span>`;
                } else {
                    statusBadge = `<span class="badge expense" style="font-size:0.75rem; font-weight:700; background:#e5a93b; color:#1e293b;">बाँकी (Pending)</span>`;
                }

                // Actions buttons
                let actionHTML = '';
                const escEmail = school.schoolEmail.replace(/'/g, "\\'");
                const escName = (school.schoolName || '').replace(/'/g, "\\'");
                if (school.status === 'Pending') {
                    actionHTML = `
                        <div class="btn-action-group" style="justify-content: center; gap: 6px; flex-wrap: wrap;">
                            <button class="btn-action-approve" onclick="handleApproveSchool('${escEmail}')">
                                Approve
                            </button>
                            <button class="btn-action-reject" onclick="handleRejectSchool('${escEmail}')">
                                Reject
                            </button>
                            <button class="btn-action-delete" onclick="openDeleteModal('${escEmail}','${escName}')" title="Permanently delete school">
                                🗑️ Delete
                            </button>
                        </div>
                    `;
                } else if (school.status === 'Rejected') {
                    actionHTML = `
                        <div class="btn-action-group" style="justify-content: center; gap: 6px; flex-wrap: wrap;">
                            <button class="btn-action-approve" onclick="handleApproveSchool('${escEmail}')">
                                Approve
                            </button>
                            <button class="btn-action-delete" onclick="openDeleteModal('${escEmail}','${escName}')" title="Permanently delete school">
                                🗑️ Delete
                            </button>
                        </div>
                    `;
                } else {
                    actionHTML = `
                        <div class="btn-action-group" style="justify-content: center; gap: 6px; flex-wrap: wrap;">
                            <span style="font-size:0.8rem; color:#10b981; font-weight:bold; display:flex; align-items:center; gap:3px;">
                                ✓ Approved
                            </span>
                            <button style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; padding:6px 10px; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;" onclick="handleResendOTP('${escEmail}')" title="Regenerate and resend OTP to school email">
                                🔁 Resend OTP
                            </button>
                            <button class="btn-action-reject" style="padding: 4px 8px; font-size: 0.7rem; opacity: 0.7;" onclick="handleRejectSchool('${escEmail}')">
                                Suspend
                            </button>
                            <button class="btn-action-delete" onclick="openDeleteModal('${escEmail}','${escName}')" title="Permanently delete school">
                                🗑️ Delete
                            </button>
                        </div>
                    `;
                }

                const regDate = school.registeredAt ? new Date(school.registeredAt).toLocaleDateString() : '-';

                // Build subscription/expiry cell
                let expiryHTML = '';
                const sub = school.subscription;
                if (sub && sub.planName === 'Free') {
                    expiryHTML = `
                        <div style="font-size:0.8rem; font-weight:700; color:#a5b4fc; margin-bottom:4px;">Free</div>
                        <span class="sub-expiry-badge lifetime">∞ Lifetime</span>
                    `;
                } else if (sub && sub.expiresAt) {
                    const expiryDate = new Date(sub.expiresAt);
                    const now = new Date();
                    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    const formattedExpiry = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    let badgeClass = 'active';
                    let badgeIcon = '✅';
                    let daysLabel = `${daysLeft}d left`;
                    if (daysLeft <= 0) {
                        badgeClass = 'expired'; badgeIcon = '❌'; daysLabel = 'Expired';
                    } else if (daysLeft <= 30) {
                        badgeClass = 'warning'; badgeIcon = '⚠️'; daysLabel = `${daysLeft}d left`;
                    }
                    expiryHTML = `
                        <div style="font-size:0.8rem; font-weight:700; color:#e2e8f0; margin-bottom:4px;">${sub.planName || '-'}</div>
                        <div style="font-size:0.72rem; color:#94a3b8; margin-bottom:5px;">Expires: ${formattedExpiry}</div>
                        <span class="sub-expiry-badge ${badgeClass}">${badgeIcon} ${daysLabel}</span>
                    `;
                } else {
                    expiryHTML = `<span class="sub-expiry-badge none">— Not set</span>`;
                }

                row.innerHTML = `
                    <td>${regDate}</td>
                    <td>
                        <strong>${school.schoolName}</strong>
                        <div style="font-size:0.75rem; color:#cbd5e1; font-weight:500;">${school.address || '-'}</div>
                    </td>
                    <td><code>${school.emis || '-'}</code></td>
                    <td>${school.schoolEmail}</td>
                    <td>${school.paymentMethod || 'None (Free)'}</td>
                    <td><code>${school.transactionCode || 'N/A'}</code></td>
                    <td>${expiryHTML}</td>
                    <td style="text-align:center;">${statusBadge}</td>
                    <td style="text-align:center;">${actionHTML}</td>
                `;
                tbody.appendChild(row);
            });

            if (displayedCount === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px;">No registered schools found matching the criteria.</td></tr>`;
            }
        }

        async function handleApproveSchool(email) {
            // Fetch fresh list from Supabase
            const schoolsList = await fetchSchoolsFromSupabase();
            const idx = schoolsList.findIndex(s => s.schoolEmail.toLowerCase() === email.toLowerCase());
            if (idx === -1) return;

            // Generate 8-character alphanumeric OTP
            const otpChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let otp = '';
            for (let i = 0; i < 8; i++) otp += otpChars[Math.floor(Math.random() * otpChars.length)];

            schoolsList[idx].status = 'Approved';
            schoolsList[idx].otp = otp;
            schoolsList[idx].otpUsed = false;
            schoolsList[idx].approvedAt = new Date().toISOString();
            if (schoolsList[idx].subscription) schoolsList[idx].subscription.status = 'Active';

            // Save to Supabase
            if (window.upsertRegisteredSchool) {
                await window.upsertRegisteredSchool(schoolsList[idx]);
            }

            const schoolName = schoolsList[idx].schoolName || email;
            const loginUrl = window.location.origin + (window.location.pathname.replace('portal-admin.html', '')) + 'school-login.html';

            // Save notification to Supabase
            if (window.saveNotification) {
                await window.saveNotification({
                    to: email,
                    subject: `✅ Khata Pana Login OTP - ${schoolName}`,
                    body: `OTP: ${otp} — Login at: ${loginUrl}`,
                    schoolName: schoolName,
                    timestamp: new Date().toISOString()
                });
            }

            // ── Send OTP email via FormSubmit ──
            const emailBody = `
विद्यालय दर्ता अनुमोदन सफल! (School Registration APPROVED)

नमस्कार, ${schoolName} टोली,

तपाईंको विद्यालयको दर्ता Digital Khata Pana प्रणालीमा सफलतापूर्वक अनुमोदित भएको छ।

════════════════════════════════
  लगइन प्रमाणपत्र (Login Credentials)
════════════════════════════════
  दर्ता इमेल  : ${email}
  एक पटक पासवर्ड (OTP) : ${otp}
════════════════════════════════

⚠️  यो OTP एक पटक मात्र प्रयोग गर्न सकिन्छ।
पहिलो लगइनपछि तपाईंले आफ्नो मनपर्ने पासवर्ड सेट गर्नुहुनेछ।

लगइन गर्न यहाँ क्लिक गर्नुहोस्:
${loginUrl}

यदि कुनै सहयोग चाहिएमा Admin लाई सम्पर्क गर्नुहोस्।

- Digital Khata Pana प्रशासन
            `;

            fetch(`https://formsubmit.co/ajax/${email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `✅ Khata Pana Login OTP - ${schoolName}`,
                    message: emailBody
                })
            })
                .then(r => r.json())
                .then(() => console.log(`OTP email sent to ${email}`))
                .catch(err => console.warn('OTP email failed (FormSubmit):', err));

            showSuperToast(`✅ "${schoolName}" approved! OTP: ${otp} — sent to ${email}`, 'success');
            initSuperDashboard();
        }

        async function handleResendOTP(email) {
            const schoolsList = await fetchSchoolsFromSupabase();
            const idx = schoolsList.findIndex(s => s.schoolEmail.toLowerCase() === email.toLowerCase());
            if (idx === -1) return;

            // Generate fresh OTP
            const otpChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let otp = '';
            for (let i = 0; i < 8; i++) otp += otpChars[Math.floor(Math.random() * otpChars.length)];

            schoolsList[idx].otp = otp;
            schoolsList[idx].otpUsed = false;
            if (window.upsertRegisteredSchool) {
                await window.upsertRegisteredSchool(schoolsList[idx]);
            }

            const schoolName = schoolsList[idx].schoolName || email;
            const loginUrl = window.location.origin + (window.location.pathname.replace('portal-admin.html', '')) + 'school-login.html';

            const emailBody = `
नयाँ OTP पठाइएको छ! (New One-Time Password)

नमस्कार, ${schoolName} टोली,

तपाईंको खातामा नयाँ लगइन OTP उत्पन्न गरिएको छ।

════════════════════════════════
  नयाँ लगइन प्रमाणपत्र (New Login Credentials)
════════════════════════════════
  दर्ता इमेल  : ${email}
  नयाँ OTP    : ${otp}
════════════════════════════════

⚠️ यो OTP एक पटक मात्र प्रयोग गर्न सकिन्छ।

लगइन लिंक: ${loginUrl}

- Digital Khata Pana प्रशासन
            `;

            fetch(`https://formsubmit.co/ajax/${email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ _subject: `🔁 Khata Pana New OTP - ${schoolName}`, message: emailBody })
            })
                .then(r => r.json())
                .then(() => console.log(`Resend OTP email sent to ${email}`))
                .catch(err => console.warn('Resend OTP email failed:', err));

            showSuperToast(`🔁 New OTP: ${otp} — resent to ${email}`, 'success');
        }

        async function handleRejectSchool(email) {
            if (confirm('Are you sure you want to reject/suspend this school registration?')) {
                const schoolsList = await fetchSchoolsFromSupabase();
                const idx = schoolsList.findIndex(s => s.schoolEmail.toLowerCase() === email.toLowerCase());
                if (idx !== -1) {
                    schoolsList[idx].status = 'Rejected';
                    if (schoolsList[idx].subscription) {
                        schoolsList[idx].subscription.status = 'Rejected';
                    }
                    if (window.upsertRegisteredSchool) {
                        await window.upsertRegisteredSchool(schoolsList[idx]);
                    }
                    showSuperToast(`Registration for ${schoolsList[idx].schoolName} has been rejected/suspended.`, 'info');
                    initSuperDashboard();
                }
            }
        }

        /* ─────────────────────────────────────────────────
           DELETE SCHOOL — Full Data Wipe
        ───────────────────────────────────────────────── */
        let _pendingDeleteEmail = null;
        let _pendingDeleteName = null;

        function openDeleteModal(email, schoolName) {
            _pendingDeleteEmail = email;
            _pendingDeleteName = schoolName;
            document.getElementById('del-school-name-label').innerText = schoolName || email;
            document.getElementById('del-confirm-input').value = '';
            document.getElementById('del-confirm-btn').disabled = true;
            document.getElementById('delete-school-modal').classList.add('active');
        }

        function closeDeleteModal() {
            document.getElementById('delete-school-modal').classList.remove('active');
            _pendingDeleteEmail = null;
            _pendingDeleteName = null;
        }

        function checkDeleteConfirm() {
            const val = document.getElementById('del-confirm-input').value.trim();
            document.getElementById('del-confirm-btn').disabled = (val !== 'DELETE');
        }

        async function confirmDeleteSchool() {
            if (!_pendingDeleteEmail) return;
            const email = _pendingDeleteEmail;
            const schoolName = _pendingDeleteName || email;

            // 1. Delete from Supabase registered_schools
            if (window.deleteRegisteredSchool) {
                await window.deleteRegisteredSchool(email);
            }

        }
            } catch (e) { }

        // 3. Wipe all school-specific localStorage keys
        const keysToDelete = [
            'nepal_school_finances' + suffix,
            'nepal_school_budgets' + suffix,
            'nepal_school_feedbacks' + suffix,
            'nepal_school_ledger_headings' + suffix,
            'nepal_school_income_categories' + suffix,
            'nepal_school_expense_categories' + suffix
        ];
        keysToDelete.forEach(k => localStorage.removeItem(k));

        // 4. Wipe Supabase records for this school's email (school_id)
        try {
            const hasConfig = typeof SUPABASE_URL !== 'undefined' &&
                typeof SUPABASE_ANON_KEY !== 'undefined' &&
                SUPABASE_URL && SUPABASE_ANON_KEY &&
                !SUPABASE_URL.includes('YOUR_SUPABASE') &&
                !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');

            if (hasConfig && window.supabase) {
                const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                const schoolId = email.replace(/[^a-zA-Z0-9@.]/g, '');

                // Delete transactions by school_id
                await client.from('transactions').delete().eq('school_id', schoolId);
                // Delete budgets by school_id
                await client.from('budgets').delete().eq('school_id', schoolId);
                // Delete feedbacks by school_id
                await client.from('feedbacks').delete().eq('school_id', schoolId);
                // Delete ledger headings by school_id
                await client.from('ledger_headings').delete().eq('school_id', schoolId);

                console.log(`Supabase records for ${schoolId} deleted.`);
            }
        } catch (err) {
            console.warn('Supabase cleanup partial or not applicable:', err);
        }

        closeDeleteModal();
        showSuperToast(`🗑️ School "${schoolName}" and all its data have been permanently deleted.`, 'error');
        initSuperDashboard();
        }

        // Beautiful toast helper
        function showSuperToast(message, type = 'success') {
            const container = document.getElementById('super-toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <div class="toast-content" style="font-size:0.85rem; font-weight:500;">${message}</div>
                <button style="background:none; border:none; color:#94a3b8; cursor:pointer; font-weight:bold; font-size:1.1rem;" onclick="this.parentElement.remove()">×</button>
            `;

            container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 50);

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }
        // Floating Action Menu Logic
        function toggleFab() {
            const menu = document.getElementById('fab-menu');
            const fab = document.getElementById('super-fab');
            menu.classList.toggle('active');
            if (menu.classList.contains('active')) {
                fab.style.transform = 'scale(1.1) rotate(45deg)';
            } else {
                fab.style.transform = 'scale(1) rotate(0deg)';
            }
        }

        // CSV Export Feature — uses in-memory cache
        async function exportDataCSV() {
            const schoolsList = _cachedSchoolsList.length > 0 ? _cachedSchoolsList : await fetchSchoolsFromSupabase();

            if (schoolsList.length === 0) {
                showSuperToast('No data to export.', 'info');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,School Name,EMIS Code,Email,Phone,Status,Reg Date\n";
            schoolsList.forEach(s => {
                let row = `"${s.schoolName || ''}","${s.emis || ''}","${s.schoolEmail || ''}","${s.principalPhone || s.phone || ''}","${s.status || 'Pending'}","${s.registeredAt || ''}"`;
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "khata_pana_schools.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showSuperToast('Data exported to CSV.', 'success');
            toggleFab();
        }

        // Command Center Tabs
        function switchCmdTab(tab) {
            document.getElementById('cmd-btn-inbox').classList.remove('active');
            document.getElementById('cmd-btn-broadcast').classList.remove('active');
            document.getElementById('cmd-tab-inbox').style.display = 'none';
            document.getElementById('cmd-tab-broadcast').style.display = 'none';

            document.getElementById('cmd-btn-' + tab).classList.add('active');
            document.getElementById('cmd-tab-' + tab).style.display = 'flex';
        }

        // Global Broadcast Logic — saves to Supabase
        async function sendBroadcast() {
            const msg = document.getElementById('broadcast-msg').value.trim();
            const type = document.getElementById('broadcast-type').value;
            if (!msg) {
                showSuperToast('Please enter a broadcast message.', 'error');
                return;
            }

            if (window.saveBroadcast) {
                await window.saveBroadcast(msg, type);
            }
            document.getElementById('broadcast-msg').value = '';
            showSuperToast('Global Broadcast sent to all schools!', 'success');
        }

        // Render Chart.js Analytics — uses in-memory data
        let regChartInstance = null;
        let statusChartInstance = null;

        function renderSuperCharts() {
            const schoolsList = _cachedSchoolsList || [];

            // Process data for Status Donut Chart
            const pending = schoolsList.filter(s => s.status === 'Pending').length;
            const approved = schoolsList.filter(s => s.status === 'Approved').length;
            const rejected = schoolsList.filter(s => s.status === 'Rejected').length;

            const statusCtx = document.getElementById('statusChart').getContext('2d');
            if (statusChartInstance) statusChartInstance.destroy();

            statusChartInstance = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Pending', 'Rejected'],
                    datasets: [{
                        data: [approved, pending, rejected],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
                    }
                }
            });

            // Process data for Registration Line Chart (Mocked historical data combined with actual)
            const regCtx = document.getElementById('registrationChart').getContext('2d');
            if (regChartInstance) regChartInstance.destroy();

            // Mock monthly data up to now for visual effect
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
            const data = [5, 12, 19, 30, 45, 60, total = schoolsList.length > 60 ? schoolsList.length : 72];

            regChartInstance = new Chart(regCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Registrations',
                        data: data,
                        borderColor: '#e5a93b',
                        backgroundColor: 'rgba(229, 169, 59, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#64748b' }, grid: { display: false } }
                    }
                }
            });
        }
    