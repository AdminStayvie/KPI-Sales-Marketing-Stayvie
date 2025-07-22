/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 5.0.0
 *
 * Perubahan Utama (v5.0.0):
 * - FITUR: Menambahkan halaman dan logika untuk mengaktifkan/menonaktifkan target KPI.
 * - UPDATE: Perhitungan denda sekarang hanya menghitung KPI yang aktif.
 */

const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) { window.location.href = 'index.html'; }
const currentUser = JSON.parse(currentUserJSON);
if (currentUser.role !== 'management') { alert('Akses ditolak. Halaman ini hanya untuk manajemen.'); window.location.href = 'dashboard.html'; }
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";
const REFRESH_INTERVAL = 60000;
const TRACKED_ACTIVITY_KEYS = ['leads', 'canvasing', 'promosi', 'doorToDoor', 'quotations', 'surveys', 'reports', 'crmSurveys', 'conversions', 'events', 'campaigns'];
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
let allData = {};
let allSalesUsers = [];
let isFetching = false;

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
                TRACKED_ACTIVITY_KEYS.forEach(key => (allData[key] || []).forEach(item => item.sales && salesFromActivities.add(item.sales)));
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

function updateAllUI() {
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const penalties = calculatePenalties(periodStartDate, periodEndDate);
    updateStatCards(periodStartDate, periodEndDate, penalties);
    updateLeaderboard(periodStartDate, periodEndDate, penalties);
    renderTabbedTargetSummary();
    renderTimeOffList();
}

function updateStatCards(periodStartDate, periodEndDate, penalties) {
    const leadsThisPeriod = allData.leads || [];
    const canvasingThisPeriod = allData.canvasing || [];
    document.getElementById('totalLeads').textContent = leadsThisPeriod.length;
    document.getElementById('totalCanvasing').textContent = canvasingThisPeriod.length;
    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = TRACKED_ACTIVITY_KEYS.reduce((total, key) => total + (allData[key] || []).filter(d => d.sales === salesName).length, 0);
    });
    const topSales = Object.keys(salesPerformance).length > 0 ? Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b) : 'N/A';
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total);
}

function updateLeaderboard(periodStartDate, periodEndDate, penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const leaderboardData = allSalesUsers.map(salesName => {
        const activities = {};
        TRACKED_ACTIVITY_KEYS.forEach(key => {
            activities[key] = (allData[key] || []).filter(d => d.sales === salesName).length;
        });
        const total = Object.values(activities).reduce((sum, count) => sum + count, 0);
        return { name: salesName, ...activities, total, penalty: penalties.bySales[salesName] || 0 };
    });
    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<div class="performance-table-wrapper"><table class="performance-table" style="table-layout: auto;"><thead><tr><th>Nama Sales</th><th>Total Aktivitas</th><th>Denda</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td><strong>${s.total}</strong></td><td>${formatCurrency(s.penalty)}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data sales</td></tr>'}</tbody></table></div>`;
}

function calculatePenalties(periodStartDate, periodEndDate) {
    const penalties = { total: 0, bySales: {} };
    const kpiSettings = allData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    if (today < periodStartDate) return penalties;

    allSalesUsers.forEach(salesName => {
        penalties.bySales[salesName] = 0;
        
        TARGET_CONFIG.daily.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            let missedDays = 0;
            datesToCheck.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = (allData[target.dataKey] || []).filter(d => d.sales === salesName && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                    if (achievedToday < target.target) missedDays++;
                }
            });
            penalties.bySales[salesName] += missedDays * target.penalty;
        });

        const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
        TARGET_CONFIG.weekly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            let missedWeeks = 0;
            sundaysInPeriod.forEach(sunday => {
                const weekStart = getWeekStart(sunday);
                const achievedThisWeek = (allData[target.dataKey] || []).filter(d => { const itemDate = new Date(d.timestamp); return d.sales === salesName && itemDate >= weekStart && itemDate <= sunday; }).length;
                if (achievedThisWeek < target.target) missedWeeks++;
            });
            penalties.bySales[salesName] += missedWeeks * target.penalty;
        });

        if (today > periodEndDate) {
            TARGET_CONFIG.monthly.forEach(target => {
                if (kpiSettings[target.id] === false) return;
                const achievedThisPeriod = (allData[target.dataKey] || []).filter(d => d.sales === salesName).length;
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
    return (allData.timeOff || []).some(off => off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
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
                const dataForTarget = (allData[target.dataKey] || []).filter(d => d.sales === salesName);
                periodDates.forEach(date => {
                    let cellContent = '';
                    let cellClass = '';
                    if (period === 'daily') {
                        if (isDayOff(date, salesName)) {
                            cellClass = 'off-day';
                        } else {
                            const achievedToday = dataForTarget.filter(d => new Date(d.timestamp).toDateString() === date.toDateString()).length;
                            cellContent = achievedToday >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                        }
                    } else if (period === 'weekly' && date.getDay() === 0) {
                        const weekStart = getWeekStart(date);
                        const achievedThisWeek = dataForTarget.filter(d => { const dDate = new Date(d.timestamp); return dDate >= weekStart && dDate <= date; }).length;
                        cellContent = achievedThisWeek >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    } else if (period === 'monthly' && date.getDate() === 20) {
                        const achievedThisMonth = dataForTarget.filter(d => { const dDate = new Date(d.timestamp); return dDate >= periodStartDate && dDate <= periodEndDate; }).length;
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
        item.innerHTML = `
            <div class="setting-info">
                <div class="setting-name">${target.name}</div>
                <div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" data-target-id="${target.id}" ${isActive ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        `;
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
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateKpiSetting', targetId, isActive })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Pengaturan KPI berhasil diperbarui.', 'success');
            if (!allData.kpiSettings) allData.kpiSettings = {};
            allData.kpiSettings[targetId] = isActive;
            updateAllUI();
        } else {
            throw new Error(result.message);
        }
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
    salesSelect.innerHTML = '<option value="Global">Global (Hari Libur)</option>';
    allSalesUsers.forEach(name => {
        salesSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('timeOffDate').value;
        const sales = salesSelect.value;
        if (!date) {
            showMessage('Silakan pilih tanggal.', 'error');
            return;
        }
        const payload = { action: 'saveTimeOff', data: { date, sales } };
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage('Data berhasil disimpan.', 'success');
                loadInitialData();
                form.reset();
            } else {
                throw new Error(result.message || 'Gagal menyimpan data.');
            }
        } catch (error) {
            showMessage(`Error: ${error.message}`, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Simpan';
        }
    });
}

function renderTimeOffList() {
    const container = document.getElementById('timeOffListContainer');
    if (!container) return;
    container.innerHTML = '';
    (allData.timeOff || []).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
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
                    if (result.status === 'success') {
                        showMessage('Data berhasil dihapus.', 'success');
                        loadInitialData();
                    } else {
                        throw new Error(result.message || 'Gagal menghapus data.');
                    }
                } catch (error) {
                    showMessage(`Error: ${error.message}`, 'error');
                }
            }
        });
    });
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
}

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
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
