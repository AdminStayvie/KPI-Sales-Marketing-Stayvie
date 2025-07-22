/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 6.1.0 - Perbaikan Stabilitas dan Penanganan Error.
 */

const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) { window.location.href = 'index.html'; }
const currentUser = JSON.parse(currentUserJSON);
if (currentUser.role !== 'management') { alert('Akses ditolak. Halaman ini hanya untuk manajemen.'); window.location.href = 'dashboard.html'; }

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

const TARGET_CONFIG = {
    daily: [
        { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads' },
        { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'prospects' },
        { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'promosi' }
    ],
    weekly: [
        { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'canvasing' },
        { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'doorToDoor' },
        { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'quotations' },
        { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'surveys' },
        { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'reports' },
        { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'crmSurveys' },
        { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'conversions' }
    ],
    monthly: [
        { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'b2bBookings' },
        { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'venueBookings' },
        { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'events' },
        { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'campaigns' }
    ]
};
const ALL_DATA_KEYS = Object.values(TARGET_CONFIG).flat().map(t => t.dataKey);

let allData = {};
let allSalesUsers = [];
let isFetching = false;

// =================================================================================
// FUNGSI PENGAMBILAN DATA
// =================================================================================

async function loadInitialData(isInitialLoad = false) {
    if (isFetching) return;
    isFetching = true;
    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    const fetchUrl = new URL(SCRIPT_URL);
    fetchUrl.searchParams.append('action', 'getDataForPeriod');
    fetchUrl.searchParams.append('startDate', toLocalDateString(periodStartDate));
    fetchUrl.searchParams.append('endDate', toLocalDateString(periodEndDate));
    fetchUrl.searchParams.append('includeUsers', 'true');
    fetchUrl.searchParams.append('t', new Date().getTime());

    try {
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;
            if (allData.users && allData.users.length > 0) {
                allSalesUsers = allData.users.filter(u => u.role === 'sales').map(u => u.name);
            } else {
                const salesFromActivities = new Set();
                ALL_DATA_KEYS.forEach(key => (allData[key] || []).forEach(item => item && item.sales && salesFromActivities.add(item.sales)));
                allSalesUsers = Array.from(salesFromActivities);
            }
            
            if (isInitialLoad) {
                setupTimeOffForm();
                renderKpiSettings();
            }
            updateAllUI();
            if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        if (isInitialLoad) showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
        console.error("Fetch Error:", error);
    } finally {
        isFetching = false;
    }
}

// =================================================================================
// FUNGSI UTAMA UI & PERHITUNGAN
// =================================================================================

function updateAllUI() {
    try {
        const penalties = calculatePenalties();
        updateStatCards(penalties);
        updateLeaderboard(penalties);
        renderTabbedTargetSummary();
        renderTimeOffList();
        updateTeamValidationBreakdown();
    } catch(error) {
        console.error("Error updating management UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data manajemen.", "error");
    }
}

function getFilteredData(salesName, dataKey, validationFilter = ['Approved']) {
    const data = allData[dataKey] || [];
    if (!Array.isArray(data)) return [];
    return data.filter(item => 
        item &&
        item.sales === salesName && 
        (validationFilter.includes('All') || validationFilter.includes(item.validationStatus))
    );
}

function updateStatCards(penalties) {
    const approvedLeads = (allData.leads || []).filter(d => d && d.validationStatus === 'Approved');
    const approvedCanvasing = (allData.canvasing || []).filter(d => d && d.validationStatus === 'Approved');
    document.getElementById('totalLeads').textContent = approvedLeads.length;
    document.getElementById('totalCanvasing').textContent = approvedCanvasing.length;
    
    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = ALL_DATA_KEYS.reduce((total, key) => total + getFilteredData(salesName, key, ['Approved']).length, 0);
    });
    const topSales = Object.keys(salesPerformance).length > 0 ? Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b) : 'N/A';
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total);
}

function updateLeaderboard(penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const leaderboardData = allSalesUsers.map(salesName => {
        const totalActivities = ALL_DATA_KEYS.reduce((sum, key) => sum + getFilteredData(salesName, key, ['Approved']).length, 0);
        return { name: salesName, total: totalActivities, penalty: penalties.bySales[salesName] || 0 };
    });
    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<div class="performance-table-wrapper"><table class="performance-table" style="table-layout: auto;"><thead><tr><th>Nama Sales</th><th>Total Aktivitas (Approved)</th><th>Denda Final</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td><strong>${s.total}</strong></td><td>${formatCurrency(s.penalty)}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data sales</td></tr>'}</tbody></table></div>`;
}

function calculatePenalties() {
    const penalties = { total: 0, bySales: {} };
    const kpiSettings = allData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    if (today < periodStartDate) return penalties;

    allSalesUsers.forEach(salesName => {
        penalties.bySales[salesName] = 0;
        
        TARGET_CONFIG.daily.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            datesToCheck.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved'])
                        .filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                    if (achievedToday < target.target) penalties.bySales[salesName] += target.penalty;
                }
            });
        });

        const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
        TARGET_CONFIG.weekly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            sundaysInPeriod.forEach(sunday => {
                const weekStart = getWeekStart(sunday);
                const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved'])
                    .filter(d => { if(!d) return false; const itemDate = new Date(d.timestamp); return itemDate >= weekStart && itemDate <= sunday; }).length;
                if (achievedThisWeek < target.target) penalties.bySales[salesName] += target.penalty;
            });
        });

        if (today > periodEndDate) {
            TARGET_CONFIG.monthly.forEach(target => {
                if (kpiSettings[target.id] === false) return;
                const achievedThisPeriod = getFilteredData(salesName, target.dataKey, ['Approved']).length;
                if (achievedThisPeriod < target.target) penalties.bySales[salesName] += target.penalty;
            });
        }
    });

    penalties.total = Object.values(penalties.bySales).reduce((sum, p) => sum + p, 0);
    return penalties;
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
}

function renderTabbedTargetSummary() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('tabContentContainer');
    if (!tabsContainer || !contentContainer) return;
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    const periodDates = getDatesForPeriod();
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    allSalesUsers.forEach((salesName, index) => {
        const contentId = `content-${salesName.replace(/\s+/g, '')}`;
        tabsContainer.innerHTML += `<button class="tab-button ${index === 0 ? 'active' : ''}" data-tab="${contentId}">${salesName}</button>`;
        let tableHeader = '<tr><th>Target</th>';
        periodDates.forEach(date => { tableHeader += `<th>${date.getDate()}</th>`; });
        tableHeader += '</tr>';
        let tableBody = '';
        ['daily', 'weekly', 'monthly'].forEach(period => {
            TARGET_CONFIG[period].forEach(target => {
                tableBody += `<tr><td>${target.name} (${period.charAt(0)})</td>`;
                periodDates.forEach(date => {
                    let cellContent = '';
                    let cellClass = '';
                    if (period === 'daily') {
                        if (isDayOff(date, salesName)) {
                            cellClass = 'off-day';
                        } else {
                            const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                            cellContent = achievedToday >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                        }
                    } else if (period === 'weekly' && date.getDay() === 0) {
                        const weekStart = getWeekStart(date);
                        const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= weekStart && dDate <= date; }).length;
                        cellContent = achievedThisWeek >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    } else if (period === 'monthly' && date.getDate() === 20) {
                        const achievedThisMonth = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= periodStartDate && dDate <= periodEndDate; }).length;
                        cellContent = achievedThisMonth >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    }
                    tableBody += `<td class="${cellClass}">${cellContent}</td>`;
                });
                tableBody += '</tr>';
            });
        });
        contentContainer.innerHTML += `<div id="${contentId}" class="tab-content ${index === 0 ? 'active' : ''}"><div class="performance-table-wrapper"><table class="performance-table">${tableHeader}${tableBody}</table></div></div>`;
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function updateTeamValidationBreakdown() {
    const container = document.getElementById('teamValidationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    ALL_DATA_KEYS.forEach(key => {
        const data = allData[key] || [];
        if(Array.isArray(data)) {
            data.forEach(item => {
                if(item) {
                    total++;
                    if (item.validationStatus === 'Approved') approved++;
                    else if (item.validationStatus === 'Pending') pending++;
                    else if (item.validationStatus === 'Rejected') rejected++;
                }
            });
        }
    });
    container.innerHTML = `
        <div class="validation-stats">
            <div class="stat-item approved"><strong>${approved}</strong> Disetujui</div>
            <div class="stat-item pending"><strong>${pending}</strong> Pending</div>
            <div class="stat-item rejected"><strong>${rejected}</strong> Ditolak</div>
            <div class="stat-item total"><strong>${total}</strong> Total Data</div>
        </div>`;
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (pending > 0) {
        pendingBadge.textContent = pending;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
    }
}

// =================================================================================
// PUSAT VALIDASI
// =================================================================================

async function loadPendingEntries() {
    const container = document.getElementById('validationContainer');
    if (!container) return;
    container.innerHTML = '<p>Memuat data yang perlu divalidasi...</p>';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getPendingEntries&t=${new Date().getTime()}`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            renderValidationCenter(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        container.innerHTML = `<p class="message error">Gagal memuat data: ${error.message}</p>`;
    }
}

function renderValidationCenter(data) {
    const container = document.getElementById('validationContainer');
    if (!container) return;
    container.innerHTML = '';

    if (Object.keys(data).length === 0) {
        container.innerHTML = '<p class="message success">Tidak ada data yang perlu divalidasi saat ini. Kerja bagus!</p>';
        document.getElementById('pendingCountBadge').style.display = 'none';
        return;
    }

    let totalPending = 0;
    for (const sheetName in data) {
        const items = data[sheetName];
        if (!Array.isArray(items)) continue;
        totalPending += items.length;
        const card = document.createElement('div');
        card.className = 'card';
        
        let tableHTML = `
            <div class="card__header"><h3>${sheetName} (${items.length} pending)</h3></div>
            <div class="card__body performance-table-wrapper">
                <table class="validation-table">
                    <thead><tr><th>Waktu</th><th>Sales</th><th>Detail Utama</th><th>Aksi</th></tr></thead>
                    <tbody>`;
        
        items.forEach(item => {
            if (!item) return;
            const mainDetail = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
            tableHTML += `
                <tr>
                    <td>${item.datestamp || new Date(item.timestamp).toLocaleDateString()}</td>
                    <td>${item.sales}</td>
                    <td>${mainDetail}</td>
                    <td class="validation-actions">
                        <button class="btn btn--sm btn--primary" onclick="handleValidation('${sheetName}', '${item.id}', 'approve')">Approve</button>
                        <button class="btn btn--sm btn--secondary" onclick="handleValidation('${sheetName}', '${item.id}', 'reject')">Reject</button>
                    </td>
                </tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        card.innerHTML = tableHTML;
        container.appendChild(card);
    }
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (totalPending > 0) {
        pendingBadge.textContent = totalPending;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
    }
}

async function handleValidation(sheetName, id, type) {
    let notes = '';
    if (type === 'reject') {
        notes = prompt(`Mohon berikan alasan penolakan untuk data ini:`);
        if (notes === null || notes.trim() === '') {
            showMessage('Penolakan dibatalkan karena tidak ada alasan yang diberikan.', 'info');
            return;
        }
    }

    const action = type === 'approve' ? 'approveEntry' : 'rejectEntry';
    const payload = { action, sheetName, id, notes };

    showMessage('Memproses validasi...', 'info');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Validasi berhasil disimpan.', 'success');
            loadPendingEntries(); 
            loadInitialData(); 
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showMessage(`Gagal memproses validasi: ${error.message}`, 'error');
    }
}


// =================================================================================
// FUNGSI PENGATURAN & INISIALISASI
// =================================================================================

function renderKpiSettings() {
    const container = document.getElementById('kpiSettingsContainer');
    if (!container) return;
    container.innerHTML = '';
    const allTargets = [...TARGET_CONFIG.daily, ...TARGET_CONFIG.weekly, ...TARGET_CONFIG.monthly];
    const kpiSettings = allData.kpiSettings || {};
    allTargets.forEach(target => {
        const isActive = kpiSettings[target.id] !== false;
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.innerHTML = `<div class="setting-info"><div class="setting-name">${target.name}</div><div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div></div><label class="toggle-switch"><input type="checkbox" data-target-id="${target.id}" ${isActive ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
        container.appendChild(item);
    });
    container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
        toggle.addEventListener('change', handleKpiSettingChange);
    });
}

async function handleKpiSettingChange(event) {
    const toggle = event.target;
    const targetId = toggle.dataset.targetId;
    const isActive = toggle.checked;
    toggle.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateKpiSetting', targetId, isActive })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Pengaturan KPI berhasil diperbarui.', 'success');
            if (!allData.kpiSettings) allData.kpiSettings = {};
            allData.kpiSettings[targetId] = isActive;
            updateAllUI();
        } else { throw new Error(result.message); }
    } catch (error) {
        showMessage(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
        toggle.checked = !isActive;
    } finally {
        toggle.disabled = false;
    }
}

function setupTimeOffForm() {
    const form = document.getElementById('timeOffForm');
    const salesSelect = document.getElementById('timeOffSales');
    if (!form || !salesSelect) return;
    salesSelect.innerHTML = '<option value="Global">Global (Hari Libur)</option>';
    allSalesUsers.forEach(name => {
        salesSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('timeOffDate').value;
        const sales = salesSelect.value;
        if (!date) { showMessage('Silakan pilih tanggal.', 'error'); return; }
        const payload = { action: 'saveTimeOff', data: { date, sales } };
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true; submitButton.textContent = 'Menyimpan...';
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage('Data berhasil disimpan.', 'success');
                loadInitialData(); form.reset();
            } else { throw new Error(result.message || 'Gagal menyimpan data.'); }
        } catch (error) { showMessage(`Error: ${error.message}`, 'error');
        } finally { submitButton.disabled = false; submitButton.textContent = 'Simpan'; }
    });
}

function renderTimeOffList() {
    const container = document.getElementById('timeOffListContainer');
    if (!container) return;
    container.innerHTML = '';
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return;
    timeOffData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        if (!item) return;
        const li = document.createElement('li');
        const displayDate = new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        li.innerHTML = `<span>${displayDate} - <strong>${item.sales}</strong></span><button class="delete-btn" data-id="${item.id}">&times;</button>`;
        container.appendChild(li);
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Anda yakin ingin menghapus data ini?')) {
                const payload = { action: 'deleteTimeOff', id };
                try {
                    const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') { showMessage('Data berhasil dihapus.', 'success'); loadInitialData();
                    } else { throw new Error(result.message || 'Gagal menghapus data.'); }
                } catch (error) { showMessage(`Error: ${error.message}`, 'error'); }
            }
        });
    });
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'validationCenter') {
        loadPendingEntries();
    }
}

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshValidationBtn')?.addEventListener('click', loadPendingEntries);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showContentPage(link.dataset.page);
        });
    });
    setupFilters(loadInitialData);
    loadInitialData(true);
}

document.addEventListener('DOMContentLoaded', initializeApp);
