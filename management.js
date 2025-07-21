/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 1.8.0
 *
 * Perubahan Utama (v1.8.0):
 * - FITUR UTAMA: Merombak total "Ringkasan Ketercapaian Target" menjadi "Laporan Kinerja Rinci".
 * - Tampilan per Tab: Setiap sales memiliki tab sendiri.
 * - Filter Periode: Menambahkan filter tahun dan periode bulan (misal: Jun-Jul).
 * - Tampilan Kalender: Menampilkan tabel dengan tanggal sebagai kolom dan target sebagai baris.
 * - Indikator Kinerja: Menampilkan (✓/✗) untuk target harian dan (progres/target) untuk mingguan/bulanan.
 * - PENGAMBILAN DATA: Logika sekarang siap menerima daftar semua pengguna dari server untuk memastikan semua sales (termasuk yang belum aktif) bisa ditampilkan.
 *
 * Perubahan Sebelumnya:
 * - Menambahkan "Ringkasan Ketercapaian Target Sales" dengan progress bar.
 * - RESTRUKTURISASI VISUAL: Memisahkan grafik menjadi beberapa visualisasi.
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
        { id: 1, name: "Menginput Data Lead", target: 20, dataKey: 'leads', dateField: 'timestamp' },
        { id: 3, name: "Promosi Campaign Package", target: 2, dataKey: 'promosi', dateField: 'timestamp' }
    ],
    weekly: [
        { id: 4, name: "Canvasing dan Pitching", target: 1, dataKey: 'canvasing', dateField: 'timestamp' },
        { id: 5, name: "Door-to-door perusahaan", target: 3, dataKey: 'doorToDoor', dateField: 'timestamp' },
        { id: 6, name: "Menyampaikan Quotation", target: 1, dataKey: 'quotations', dateField: 'timestamp' },
        { id: 7, name: "Survey pengunjung Co-living", target: 4, dataKey: 'surveys', dateField: 'timestamp' },
        { id: 8, name: "Laporan Ringkas Mingguan", target: 1, dataKey: 'reports', dateField: 'timestamp' },
        { id: 9, name: "Input CRM Survey kompetitor", target: 1, dataKey: 'crmSurveys', dateField: 'timestamp' },
        { id: 10, name: "Konversi Booking Venue Barter", target: 1, dataKey: 'conversions', dateField: 'timestamp' }
    ],
    monthly: [
        { id: 13, name: "Mengikuti Event/Networking", target: 1, dataKey: 'events', dateField: 'timestamp' },
        { id: 14, name: "Launch Campaign Package", target: 1, dataKey: 'campaigns', dateField: 'timestamp' }
    ]
};

const CHART_COLORS = ['rgba(50, 184, 198, 0.7)', 'rgba(94, 82, 64, 0.7)', 'rgba(230, 129, 97, 0.7)', 'rgba(255, 205, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(201, 203, 207, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(12, 65, 99, 0.7)'];

let allData = {};
let previousAllData = {};
let allSalesUsers = []; // <<< Daftar semua user sales dari server
let chartInstances = {};
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
        const fetchUrl = `${SCRIPT_URL}?action=getAllData&includeUsers=true&t=${new Date().getTime()}`; // Minta data user
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;
            if (JSON.stringify(allData) !== JSON.stringify(previousAllData)) {
                previousAllData = JSON.parse(JSON.stringify(allData));
                
                // <<< Gunakan daftar user dari server, fallback ke data aktivitas
                if (allData.users && allData.users.length > 0) {
                    allSalesUsers = allData.users.filter(u => u.role === 'sales').map(u => u.name);
                } else {
                    const salesFromActivities = new Set();
                    TRACKED_ACTIVITY_KEYS.forEach(key => (allData[key] || []).forEach(item => item.sales && salesFromActivities.add(item.sales)));
                    allSalesUsers = Array.from(salesFromActivities);
                }
                
                if (isInitialLoad) setupFilters();
                updateAllUI();
                if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");
            } else if (isInitialLoad) {
                if (isInitialLoad) setupFilters();
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
    updateStatCards();
    updateLeaderboard();
    renderVisualizations();
    renderTabbedTargetSummary(); // <<< Panggil fungsi laporan baru
}

// =================================================================================
// FUNGSI UPDATE UI (STATISTIK & LEADERBOARD)
// =================================================================================

function updateStatCards() {
    const monthStart = getMonthStart(new Date(selectedYear, selectedPeriod.split('-')[0], 21));
    const leadsThisMonth = (allData.leads || []).filter(d => new Date(d.timestamp) >= monthStart);
    const canvasingThisMonth = (allData.canvasing || []).filter(d => new Date(d.timestamp) >= monthStart);
    
    document.getElementById('totalLeads').textContent = leadsThisMonth.length;
    document.getElementById('totalCanvasing').textContent = canvasingThisMonth.length;

    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = TRACKED_ACTIVITY_KEYS.reduce((total, key) => 
            total + (allData[key] || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length, 0);
    });

    const topSales = Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b, 'N/A');
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = 'Rp 0';
}

function updateLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const monthStart = getMonthStart(new Date(selectedYear, selectedPeriod.split('-')[0], 21));

    const leaderboardData = allSalesUsers.map(salesName => {
        const leads = (allData.leads || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const canvasing = (allData.canvasing || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const promosi = (allData.promosi || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const total = TRACKED_ACTIVITY_KEYS.reduce((acc, key) => acc + (allData[key] || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length, 0);
        return { name: salesName, leads, canvasing, promosi, total };
    });

    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<table><thead><tr><th>Nama Sales</th><th>Leads</th><th>Canvasing</th><th>Promosi</th><th>Total Aktivitas</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td>${s.leads}</td><td>${s.canvasing}</td><td>${s.promosi}</td><td><strong>${s.total}</strong></td></tr>`).join('')}</tbody></table>`;
}

// =================================================================================
// FUNGSI VISUALISASI (GRAFIK)
// =================================================================================

function destroyAllCharts() { Object.values(chartInstances).forEach(chart => chart.destroy()); chartInstances = {}; }
function renderVisualizations() { destroyAllCharts(); renderCategoryComparisonChart(); renderIndividualSalesCharts(); }

function renderCategoryComparisonChart() {
    const ctx = document.getElementById('categoryComparisonChart')?.getContext('2d');
    if (!ctx) return;
    const monthStart = getMonthStart(new Date(selectedYear, selectedPeriod.split('-')[0], 21));
    const data = TRACKED_ACTIVITY_KEYS.map(key => (allData[key] || []).filter(d => new Date(d.timestamp) >= monthStart).length);
    chartInstances.categoryComparison = new Chart(ctx, { type: 'bar', data: { labels: TRACKED_ACTIVITY_KEYS.map(k => k.charAt(0).toUpperCase() + k.slice(1)), datasets: [{ label: 'Total Input', data: data, backgroundColor: CHART_COLORS }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

function renderIndividualSalesCharts() {
    const container = document.getElementById('individualSalesCharts');
    if (!container) return;
    container.innerHTML = '';
    const monthStart = getMonthStart(new Date(selectedYear, selectedPeriod.split('-')[0], 21));

    allSalesUsers.forEach(salesName => {
        const chartData = TRACKED_ACTIVITY_KEYS.map(key => (allData[key] || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length);
        if (chartData.some(d => d > 0)) {
            const chartId = `salesChart_${salesName.replace(/\s+/g, '')}`;
            container.innerHTML += `<div class="individual-chart-container"><h5>${salesName}</h5><div class="chart-container" style="height: 300px;"><canvas id="${chartId}"></canvas></div></div>`;
            const ctx = document.getElementById(chartId).getContext('2d');
            chartInstances[chartId] = new Chart(ctx, { type: 'doughnut', data: { labels: TRACKED_ACTIVITY_KEYS.map(k => k.charAt(0).toUpperCase() + k.slice(1)), datasets: [{ data: chartData, backgroundColor: CHART_COLORS, borderColor: 'var(--color-surface)', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, boxWidth: 12 } } } } });
        }
    });
}

// =================================================================================
// <<< FUNGSI BARU: LAPORAN KINERJA RINCI (TABEL KALENDER) >>>
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
        renderTabbedTargetSummary();
    });
    periodFilter.addEventListener('change', (e) => {
        selectedPeriod = e.target.value;
        renderTabbedTargetSummary();
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
    // Set default ke periode saat ini
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
    const [startMonthIndex] = selectedPeriod.split('-').map(Number);
    const startYear = selectedYear;
    const endYear = startMonthIndex === 11 ? Number(selectedYear) + 1 : startYear;
    
    const startDate = new Date(startYear, startMonthIndex, 21);
    const endDate = new Date(endYear, (startMonthIndex + 1) % 12, 20);
    
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

function renderTabbedTargetSummary() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('tabContentContainer');
    if (!tabsContainer || !contentContainer) return;

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    const periodDates = getDatesForPeriod();

    allSalesUsers.forEach((salesName, index) => {
        const tabId = `tab-${salesName.replace(/\s+/g, '')}`;
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
                    if (period === 'daily') {
                        const achievedToday = dataForTarget.filter(d => new Date(d.timestamp).toDateString() === date.toDateString()).length;
                        cellContent = achievedToday >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    } else if (period === 'weekly' && date.getDay() === 0) { // Minggu
                        const weekStart = getWeekStart(date);
                        const achievedThisWeek = dataForTarget.filter(d => { const dDate = new Date(d.timestamp); return dDate >= weekStart && dDate <= date; }).length;
                        cellContent = `<span class="progress-fraction">${achievedThisWeek}/${target.target}</span>`;
                    } else if (period === 'monthly' && date.getDate() === 20) {
                        const monthStart = getMonthStart(date);
                        const achievedThisMonth = dataForTarget.filter(d => new Date(d.timestamp) >= monthStart).length;
                        cellContent = `<span class="progress-fraction">${achievedThisMonth}/${target.target}</span>`;
                    }
                    tableBody += `<td>${cellContent}</td>`;
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
// FUNGSI UTILITY & INISIALISASI
// =================================================================================

function getWeekStart(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return d; }
function getMonthStart(date = new Date()) { const d = new Date(date); const day = d.getDate(); let m = d.getMonth(); let y = d.getFullYear(); if (day < 21) { m = (m - 1 + 12) % 12; if (m === 11) y--; } return new Date(y, m, 21); }
function showMessage(message, type = 'info') { const el = document.querySelector('.message'); if(el) el.remove(); const n = document.createElement('div'); n.className = `message ${type}`; n.textContent = message; document.querySelector('.main-content')?.insertBefore(n, document.querySelector('.main-content').firstChild); setTimeout(() => n.remove(), 4000); }
function updateDateTime() { const el = document.getElementById('currentDateTime'); if (el) el.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    loadInitialData(true); 
    setInterval(() => loadInitialData(false), REFRESH_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializeApp);
