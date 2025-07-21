/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 1.7.0
 *
 * Perubahan Utama (v1.7.0):
 * - FITUR BARU: Menambahkan "Ringkasan Ketercapaian Target Sales". Fitur ini menampilkan progress bar untuk setiap target (harian, mingguan, bulanan) bagi masing-masing sales.
 * - PENAMBAHAN KONFIGURASI: Menduplikasi `TARGET_CONFIG` dari `app.js` untuk memungkinkan perhitungan pencapaian target di halaman manajemen.
 *
 * Perubahan Sebelumnya:
 * - RESTRUKTURISASI VISUAL: Mengganti satu grafik dengan beberapa visualisasi yang lebih fokus.
 * - PERBAIKAN BUG: Logika "Total Aktivitas" dan "Sales Terbaik" menghitung semua kategori.
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

// <<< BARU: Duplikasi konfigurasi target dari app.js >>>
// NOTE: Idealnya ini ada di file konfigurasi bersama.
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


const CHART_COLORS = [
    'rgba(50, 184, 198, 0.7)', 'rgba(94, 82, 64, 0.7)', 'rgba(230, 129, 97, 0.7)',
    'rgba(255, 205, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)', 'rgba(201, 203, 207, 0.7)', 'rgba(54, 162, 235, 0.7)',
    'rgba(255, 99, 132, 0.7)', 'rgba(12, 65, 99, 0.7)'
];

let allData = {};
let previousAllData = {};
let salesList = [];
let chartInstances = {};
let isFetching = false;

// =================================================================================
// FUNGSI UTAMA
// =================================================================================

async function loadInitialData(isInitialLoad = false) {
    if (isFetching) return;
    isFetching = true;

    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    
    try {
        const fetchUrl = `${SCRIPT_URL}?action=getAllData&t=${new Date().getTime()}`;
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;
            if (JSON.stringify(allData) !== JSON.stringify(previousAllData)) {
                previousAllData = JSON.parse(JSON.stringify(allData));
                
                const allSalesNames = new Set();
                TRACKED_ACTIVITY_KEYS.forEach(key => {
                    (allData[key] || []).forEach(item => item.sales && allSalesNames.add(item.sales));
                });
                salesList = Array.from(allSalesNames);
                
                updateAllUI();
                if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");
            } else if (isInitialLoad) {
                updateAllUI();
                showMessage("Data berhasil dimuat.", "success");
            }
        } else {
            if (isInitialLoad) throw new Error(result.message);
        }
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
    renderTargetAchievementSummary(); // <<< BARU: Panggil fungsi ringkasan target
}

// =================================================================================
// FUNGSI UPDATE UI
// =================================================================================

function updateStatCards() {
    const monthStart = getMonthStart();
    
    const leadsThisMonth = (allData.leads || []).filter(d => new Date(d.timestamp) >= monthStart);
    const canvasingThisMonth = (allData.canvasing || []).filter(d => new Date(d.timestamp) >= monthStart);
    
    document.getElementById('totalLeads').textContent = leadsThisMonth.length;
    document.getElementById('totalCanvasing').textContent = canvasingThisMonth.length;

    const salesPerformance = {};
    salesList.forEach(salesName => {
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
    const monthStart = getMonthStart();

    const leaderboardData = salesList.map(salesName => {
        const leads = (allData.leads || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const canvasing = (allData.canvasing || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const promosi = (allData.promosi || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const total = TRACKED_ACTIVITY_KEYS.reduce((acc, key) => 
            acc + (allData[key] || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length, 0);
        return { name: salesName, leads, canvasing, promosi, total };
    });

    leaderboardData.sort((a, b) => b.total - a.total);

    container.innerHTML = `
        <table>
            <thead><tr><th>Nama Sales</th><th>Leads</th><th>Canvasing</th><th>Promosi</th><th>Total Aktivitas</th></tr></thead>
            <tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td>${s.leads}</td><td>${s.canvasing}</td><td>${s.promosi}</td><td><strong>${s.total}</strong></td></tr>`).join('')}</tbody>
        </table>`;
}

// =================================================================================
// FUNGSI VISUALISASI
// =================================================================================

function destroyAllCharts() {
    for (const chartId in chartInstances) {
        if (chartInstances[chartId]) chartInstances[chartId].destroy();
    }
    chartInstances = {};
}

function renderVisualizations() {
    destroyAllCharts();
    renderCategoryComparisonChart();
    renderIndividualSalesCharts();
}

function renderCategoryComparisonChart() {
    const ctx = document.getElementById('categoryComparisonChart')?.getContext('2d');
    if (!ctx) return;
    const monthStart = getMonthStart();

    const data = TRACKED_ACTIVITY_KEYS.map(key => 
        (allData[key] || []).filter(d => new Date(d.timestamp) >= monthStart).length
    );

    chartInstances.categoryComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: TRACKED_ACTIVITY_KEYS.map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            datasets: [{ label: 'Total Input', data: data, backgroundColor: CHART_COLORS }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderIndividualSalesCharts() {
    const container = document.getElementById('individualSalesCharts');
    if (!container) return;
    container.innerHTML = '';
    const monthStart = getMonthStart();

    salesList.forEach(salesName => {
        const chartData = [];
        const chartLabels = [];

        TRACKED_ACTIVITY_KEYS.forEach(key => {
            const count = (allData[key] || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
            if (count > 0) {
                chartData.push(count);
                chartLabels.push(key.charAt(0).toUpperCase() + key.slice(1));
            }
        });

        if (chartData.length > 0) {
            const chartId = `salesChart_${salesName.replace(/\s+/g, '')}`;
            const chartContainer = document.createElement('div');
            chartContainer.className = 'individual-chart-container';
            chartContainer.innerHTML = `<h5>${salesName}</h5><div class="chart-container" style="height: 300px;"><canvas id="${chartId}"></canvas></div>`;
            container.appendChild(chartContainer);

            const ctx = document.getElementById(chartId).getContext('2d');
            chartInstances[chartId] = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: CHART_COLORS, borderColor: 'var(--color-surface)', borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, boxWidth: 12 } } } }
            });
        }
    });
}

// =================================================================================
// <<< FUNGSI BARU: RINGKASAN KETERCAPAIAN TARGET >>>
// =================================================================================

/**
 * Helper function to calculate achievement for a specific sales and target.
 */
function calculateAchievementForTarget(salesName, target) {
    if (!target.dataKey || !target.dateField) return 0;

    const data = (allData[target.dataKey] || []).filter(d => d.sales === salesName);
    if (data.length === 0) return 0;

    const today = new Date();
    const weekStart = getWeekStart(today);
    const monthStart = getMonthStart(today);

    return data.filter(d => {
        const itemDateStr = d[target.dateField];
        if (!itemDateStr) return false;
        const itemDate = new Date(itemDateStr);
        if (isNaN(itemDate.getTime())) return false;

        if (TARGET_CONFIG.daily.some(t => t.id === target.id)) {
            return itemDate.toDateString() === today.toDateString();
        }
        if (TARGET_CONFIG.weekly.some(t => t.id === target.id)) {
            return itemDate >= weekStart && itemDate <= today;
        }
        if (TARGET_CONFIG.monthly.some(t => t.id === target.id)) {
            return itemDate >= monthStart && itemDate <= today;
        }
        return false;
    }).length;
}

/**
 * Merender ringkasan ketercapaian target untuk setiap sales.
 */
function renderTargetAchievementSummary() {
    const container = document.getElementById('targetAchievementSummary');
    if (!container) return;
    container.innerHTML = ''; // Kosongkan kontainer

    salesList.forEach(salesName => {
        const salesCard = document.createElement('div');
        salesCard.className = 'sales-target-card';

        let cardHTML = `<h5>${salesName}</h5>`;
        
        ['daily', 'weekly', 'monthly'].forEach(period => {
            TARGET_CONFIG[period].forEach(target => {
                const achieved = calculateAchievementForTarget(salesName, target);
                const percentage = target.target > 0 ? Math.min(100, Math.round((achieved / target.target) * 100)) : 0;
                
                cardHTML += `
                    <div class="target-item">
                        <span class="target-name">${target.name} (${period.charAt(0).toUpperCase()})</span>
                        <div class="target-progress-details">
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                            </div>
                            <span class="progress-text">${achieved}/${target.target}</span>
                        </div>
                    </div>
                `;
            });
        });

        salesCard.innerHTML = cardHTML;
        container.appendChild(salesCard);
    });
}


// =================================================================================
// FUNGSI UTILITY & INISIALISASI
// =================================================================================

function getWeekStart(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return d; }

function getMonthStart(date = new Date()) {
    const today = new Date(date);
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const cutoffDay = 20;
    let startDate;
    if (currentDay > cutoffDay) {
        startDate = new Date(currentYear, currentMonth, 21);
    } else {
        const previousMonth = new Date(currentYear, currentMonth, 1);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        startDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 21);
    }
    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

function showMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.message');
    if(existingMessage) existingMessage.remove();
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(notification, mainContent.firstChild);
        setTimeout(() => { notification.remove(); }, 4000);
    }
}

function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    loadInitialData(true); 
    setInterval(() => loadInitialData(false), REFRESH_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializeApp);
