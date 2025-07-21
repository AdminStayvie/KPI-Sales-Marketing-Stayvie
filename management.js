/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 2.9.0
 *
 * Perubahan Utama (v2.9.0):
 * - FITUR BARU: Implementasi penuh logika perhitungan denda di dashboard manajemen.
 * - `calculatePenalties`: Fungsi baru untuk menghitung denda berdasarkan target yang tidak tercapai pada periode yang dipilih.
 * - PENINGKATAN UI: Kartu "Total Denda Tim" dan tabel "Papan Peringkat" sekarang menampilkan total denda yang akurat sesuai dengan filter periode.
 *
 * Perubahan Sebelumnya:
 * - RESTRUKTURISASI UI: Memisahkan "Pengaturan Hari Libur & Izin" ke halaman terpisah.
 * - FITUR BARU: Hari Minggu secara otomatis dianggap sebagai hari libur.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) {
    window.location.href = 'index.html';
}
const currentUser = JSON.parse(currentUserJSON);
if (currentUser.role !== 'management') {
    alert('Akses ditolak. Halaman ini hanya untuk manajemen.');
    window.location.href = 'dashboard.html';
}

// =================================================================================
// KONFIGURASI & STATE
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";
const REFRESH_INTERVAL = 30000;

const TRACKED_ACTIVITY_KEYS = [
    'leads', 'canvasing', 'promosi', 'doorToDoor', 'quotations', 
    'surveys', 'reports', 'crmSurveys', 'conversions', 'events', 'campaigns'
];

const TARGET_CONFIG = {
    daily: [
        { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads', dateField: 'timestamp' },
        { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'promosi', dateField: 'timestamp' }
    ],
    weekly: [
        { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'canvasing', dateField: 'timestamp' },
        { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'doorToDoor', dateField: 'timestamp' },
        { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'quotations', dateField: 'timestamp' },
        { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'surveys', dateField: 'timestamp' },
        { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'reports', dateField: 'timestamp' },
        { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'crmSurveys', dateField: 'timestamp' },
        { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'conversions', dateField: 'timestamp' }
    ],
    monthly: [
        { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'events', dateField: 'timestamp' },
        { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'campaigns', dateField: 'timestamp' }
    ]
};

let allData = {};
let previousAllData = {};
let allSalesUsers = [];
let isFetching = false;
let selectedYear, selectedPeriod;

// =================================================================================
// FUNGSI UTAMA
// =================================================================================

async function loadInitialData(isInitialLoad = false) {
    if (isFetching) return;
    isFetching = true;
    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    
    try {
        const fetchUrl = `${SCRIPT_URL}?action=getAllData&includeUsers=true&t=${new Date().getTime()}`;
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;
            if (JSON.stringify(allData) !== JSON.stringify(previousAllData)) {
                previousAllData = JSON.parse(JSON.stringify(allData));
                
                if (allData.users && allData.users.length > 0) {
                    allSalesUsers = allData.users.filter(u => u.role === 'sales').map(u => u.name);
                } else {
                    const salesFromActivities = new Set();
                    TRACKED_ACTIVITY_KEYS.forEach(key => (allData[key] || []).forEach(item => item.sales && salesFromActivities.add(item.sales)));
                    allSalesUsers = Array.from(salesFromActivities);
                }
                
                if (isInitialLoad) {
                    setupFilters();
                    setupTimeOffForm();
                }
                updateAllUI();
                if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");
            } else if (isInitialLoad) {
                if (isInitialLoad) {
                    setupFilters();
                    setupTimeOffForm();
                }
                updateAllUI();
                showMessage("Data berhasil dimuat.", "success");
            }
        } else if (isInitialLoad) throw new Error(result.message);
    } catch (error) {
        if (isInitialLoad) showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    } finally {
        isFetching = false;
    }
}

function updateAllUI() {
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const penalties = calculatePenalties(periodStartDate, periodEndDate); // <<< HITUNG DENDA
    updateStatCards(periodStartDate, periodEndDate, penalties); // <<< KIRIM DENDA
    updateLeaderboard(periodStartDate, periodEndDate, penalties); // <<< KIRIM DENDA
    renderTabbedTargetSummary();
    renderTimeOffList();
}

// =================================================================================
// FUNGSI UPDATE UI (STATISTIK & LEADERBOARD)
// =================================================================================

function updateStatCards(periodStartDate, periodEndDate, penalties) {
    const dateFilter = d => {
        const itemDate = new Date(d.timestamp);
        return itemDate >= periodStartDate && itemDate <= periodEndDate;
    };

    const leadsThisPeriod = (allData.leads || []).filter(dateFilter);
    const canvasingThisPeriod = (allData.canvasing || []).filter(dateFilter);
    
    document.getElementById('totalLeads').textContent = leadsThisPeriod.length;
    document.getElementById('totalCanvasing').textContent = canvasingThisPeriod.length;

    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = TRACKED_ACTIVITY_KEYS.reduce((total, key) => 
            total + (allData[key] || []).filter(d => d.sales === salesName).filter(dateFilter).length, 0);
    });

    const topSales = Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b, 'N/A');
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total); // <<< TAMPILKAN DENDA
}

function updateLeaderboard(periodStartDate, periodEndDate, penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    const dateFilter = d => {
        const itemDate = new Date(d.timestamp);
        return itemDate >= periodStartDate && itemDate <= periodEndDate;
    };

    const leaderboardData = allSalesUsers.map(salesName => {
        const activities = {};
        TRACKED_ACTIVITY_KEYS.forEach(key => {
            activities[key] = (allData[key] || []).filter(d => d.sales === salesName).filter(dateFilter).length;
        });
        const total = Object.values(activities).reduce((sum, count) => sum + count, 0);
        
        return { name: salesName, ...activities, total, penalty: penalties.bySales[salesName] || 0 };
    });

    leaderboardData.sort((a, b) => b.total - a.total);
    
    container.innerHTML = `
        <div class="performance-table-wrapper">
            <table class="performance-table" style="table-layout: auto;">
                <thead>
                    <tr>
                        <th>Nama Sales</th>
                        <th>Total Aktivitas</th>
                        <th>Denda</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboardData.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            <td><strong>${s.total}</strong></td>
                            <td>${formatCurrency(s.penalty)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

// =================================================================================
// <<< FUNGSI BARU: LOGIKA PERHITUNGAN DENDA >>>
// =================================================================================
function calculatePenalties(periodStartDate, periodEndDate) {
    const penalties = { total: 0, bySales: {} };
    const today = new Date();

    // Denda hanya dihitung jika periode yang dipilih sudah berlalu
    if (periodEndDate > today) {
        return penalties;
    }

    allSalesUsers.forEach(salesName => {
        penalties.bySales[salesName] = 0;
        const periodDates = getDatesForPeriod();

        // Cek Denda Harian
        TARGET_CONFIG.daily.forEach(target => {
            let missedDays = 0;
            periodDates.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = (allData[target.dataKey] || []).filter(d => 
                        d.sales === salesName && new Date(d.timestamp).toDateString() === date.toDateString()
                    ).length;
                    if (achievedToday < target.target) {
                        missedDays++;
                    }
                }
            });
            penalties.bySales[salesName] += missedDays * target.penalty;
        });

        // Cek Denda Mingguan
        TARGET_CONFIG.weekly.forEach(target => {
            const achievedThisPeriod = (allData[target.dataKey] || []).filter(d => 
                d.sales === salesName && new Date(d.timestamp) >= periodStartDate && new Date(d.timestamp) <= periodEndDate
            ).length;
            if (achievedThisPeriod < target.target) {
                penalties.bySales[salesName] += target.penalty;
            }
        });

        // Cek Denda Bulanan
        TARGET_CONFIG.monthly.forEach(target => {
            const achievedThisPeriod = (allData[target.dataKey] || []).filter(d => 
                d.sales === salesName && new Date(d.timestamp) >= periodStartDate && new Date(d.timestamp) <= periodEndDate
            ).length;
            if (achievedThisPeriod < target.target) {
                penalties.bySales[salesName] += target.penalty;
            }
        });
    });

    penalties.total = Object.values(penalties.bySales).reduce((sum, p) => sum + p, 0);
    return penalties;
}


// =================================================================================
// FUNGSI LAPORAN KINERJA RINCI (TABEL KALENDER)
// =================================================================================

function setupFilters() {
    const yearFilter = document.getElementById('yearFilter');
    const periodFilter = document.getElementById('periodFilter');
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 2; i--) {
        yearFilter.innerHTML += `<option value="${i}">${i}</option>`;
    }
    selectedYear = yearFilter.value;
    generatePeriodOptions();
    
    yearFilter.addEventListener('change', (e) => {
        selectedYear = e.target.value;
        generatePeriodOptions();
        updateAllUI();
    });
    periodFilter.addEventListener('change', (e) => {
        selectedPeriod = e.target.value;
        updateAllUI();
    });
}

function generatePeriodOptions() {
    const periodFilter = document.getElementById('periodFilter');
    periodFilter.innerHTML = '';
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    for (let i = 0; i < 12; i++) {
        const month1 = months[i];
        const month2 = months[(i + 1) % 12];
        const value = `${i}-${(i + 1) % 12}`;
        periodFilter.innerHTML += `<option value="${value}">${month1} - ${month2}</option>`;
    }
    const now = new Date();
    const currentDay = now.getDate();
    let currentMonthIndex = now.getMonth();
    if (currentDay < 21) {
        currentMonthIndex = (currentMonthIndex - 1 + 12) % 12;
    }
    const nextMonthIndex = (currentMonthIndex + 1) % 12;
    selectedPeriod = `${currentMonthIndex}-${nextMonthIndex}`;
    periodFilter.value = selectedPeriod;
}

function getDatesForPeriod() {
    const startDate = getPeriodStartDate();
    const endDate = getPeriodEndDate();
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) {
        return true;
    }
    const dateString = toLocalDateString(date);
    return (allData.timeOff || []).some(off => 
        off.date === dateString && (off.sales === 'Global' || off.sales === salesName)
    );
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
                    } else if (period === 'weekly' && date.getDay() === 0) { // Minggu
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

// =================================================================================
// FUNGSI PENGATURAN HARI LIBUR & IZIN
// =================================================================================

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
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage('Data berhasil disimpan.', 'success');
                if (!allData.timeOff) allData.timeOff = [];
                allData.timeOff.push(result.data);
                updateAllUI();
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

    (allData.timeOff || []).forEach(item => {
        const li = document.createElement('li');
        const displayDate = new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        li.innerHTML = `
            <span>${displayDate} - <strong>${item.sales}</strong></span>
            <button class="delete-btn" data-id="${item.id}">&times;</button>
        `;
        container.appendChild(li);
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const userConfirmed = confirm('Anda yakin ingin menghapus data ini?');
            if (userConfirmed) {
                const payload = { action: 'deleteTimeOff', id };
                try {
                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'cors',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    });
                    const result = await response.json();
                    if (result.status === 'success') {
                        showMessage('Data berhasil dihapus.', 'success');
                        allData.timeOff = allData.timeOff.filter(item => item.id != id);
                        updateAllUI();
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

// =================================================================================
// FUNGSI UTILITY & INISIALISASI
// =================================================================================

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
}

function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0); }
function getWeekStart(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return d; }
function getPeriodStartDate() { if (!selectedYear || !selectedPeriod) return new Date(); const [startMonthIndex] = selectedPeriod.split('-').map(Number); return new Date(selectedYear, startMonthIndex, 21); }
function getPeriodEndDate() { if (!selectedYear || !selectedPeriod) return new Date(); const [startMonthIndex, endMonthIndex] = selectedPeriod.split('-').map(Number); const endYear = startMonthIndex > endMonthIndex ? Number(selectedYear) + 1 : selectedYear; const endDate = new Date(endYear, endMonthIndex, 20); endDate.setHours(23, 59, 59, 999); return endDate; }
function showMessage(message, type = 'info') { const el = document.querySelector('.message'); if(el) el.remove(); const n = document.createElement('div'); n.className = `message ${type}`; n.textContent = message; document.querySelector('.main-content')?.insertBefore(n, document.querySelector('.main-content').firstChild); setTimeout(() => n.remove(), 4000); }
function updateDateTime() { const el = document.getElementById('currentDateTime'); if (el) el.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }

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

    loadInitialData(true); 
    setInterval(() => loadInitialData(false), REFRESH_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializeApp);
