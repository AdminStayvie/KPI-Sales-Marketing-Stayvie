/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 1.4.0
 *
 * Perubahan Utama (v1.4.0):
 * - PERBAIKAN BUG KRITIS: Logika pengambilan daftar sales sekarang mengumpulkan nama dari SEMUA sumber data (Leads, Canvasing, DoorToDoor, dll.), tidak hanya dari 'Leads'. Ini memastikan semua sales yang aktif akan muncul di dashboard.
 * - PENINGKATAN: Logika refresh sekarang membandingkan konten data secara keseluruhan, memastikan UI selalu update jika ada perubahan sekecil apa pun.
 *
 * Perubahan Sebelumnya:
 * - PERBAIKAN BUG (Race Condition): Menambahkan flag `isFetching`.
 * - PERBAIKAN BUG (Logika Refresh): Memastikan UI selalu diperbarui setiap kali data baru berhasil dimuat.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) {
    window.location.href = 'index.html';
}
const currentUser = JSON.parse(currentUserJSON);
// Pastikan hanya manajemen yang bisa mengakses halaman ini
if (currentUser.role !== 'management') {
    alert('Akses ditolak. Halaman ini hanya untuk manajemen.');
    window.location.href = 'dashboard.html';
}

// =================================================================================
// KONFIGURASI & STATE
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; // <-- PASTIKAN INI URL DEPLOYMENT TERBARU ANDA
const REFRESH_INTERVAL = 30000; // Interval refresh dalam milidetik (30 detik)

let allData = {}; // Tempat menyimpan semua data dari server
let previousAllData = {}; // Menyimpan state data sebelumnya untuk perbandingan
let salesList = []; // Daftar semua sales
let salesChartInstance = null; // Variabel untuk menyimpan instance grafik
let isFetching = false; // Flag untuk mencegah race condition

// =================================================================================
// FUNGSI UTAMA
// =================================================================================

/**
 * Memuat semua data dari server.
 * @param {boolean} isInitialLoad - Menandakan apakah ini pemuatan pertama kali.
 */
async function loadInitialData(isInitialLoad = false) {
    if (isFetching) {
        console.log("Pemuatan data sedang berlangsung, permintaan baru diabaikan.");
        return;
    }
    isFetching = true;

    if (isInitialLoad) {
        showMessage("Memuat data tim dari server...", "info");
    }
    
    try {
        const fetchUrl = `${SCRIPT_URL}?action=getAllData&t=${new Date().getTime()}`;
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;

            // Hanya update UI jika konten data yang baru berbeda dari yang lama
            if (JSON.stringify(allData) !== JSON.stringify(previousAllData)) {
                console.log("Perubahan data terdeteksi. Memperbarui UI...");
                previousAllData = JSON.parse(JSON.stringify(allData)); // Deep copy untuk perbandingan berikutnya

                // <<< FIX: Kumpulkan nama sales dari SEMUA sumber data
                const allSalesNames = new Set();
                for (const key in allData) {
                    // Pastikan properti adalah array dan bukan properti lain seperti 'settings'
                    if (Array.isArray(allData[key])) {
                        allData[key].forEach(item => {
                            if (item && item.sales) {
                                allSalesNames.add(item.sales);
                            }
                        });
                    }
                }
                salesList = Array.from(allSalesNames);
                // <<< END FIX
                
                updateAllUI();

                if (isInitialLoad) {
                    showMessage("Data berhasil dimuat.", "success");
                }
            } else {
                 if (isInitialLoad) {
                    // Jika tidak ada perubahan tapi ini load pertama, tetap render UI
                    updateAllUI();
                    showMessage("Data berhasil dimuat.", "success");
                 }
            }
        } else {
            if (isInitialLoad) throw new Error(result.message);
            else console.error("Auto-refresh failed:", result.message);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        if (isInitialLoad) {
            showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
        }
    } finally {
        isFetching = false;
    }
}

/**
 * Memanggil semua fungsi untuk memperbarui UI.
 */
function updateAllUI() {
    updateStatCards();
    updateLeaderboard();
    renderSalesChart();
}

// =================================================================================
// FUNGSI UPDATE UI
// =================================================================================

/**
 * Memperbarui kartu statistik utama.
 */
function updateStatCards() {
    const monthStart = getMonthStart();
    
    const leadsThisMonth = (allData.leads || []).filter(d => new Date(d.timestamp) >= monthStart);
    const canvasingThisMonth = (allData.canvasing || []).filter(d => new Date(d.timestamp) >= monthStart);
    
    document.getElementById('totalLeads').textContent = leadsThisMonth.length;
    document.getElementById('totalCanvasing').textContent = canvasingThisMonth.length;

    const salesPerformance = {};
    leadsThisMonth.forEach(lead => {
        salesPerformance[lead.sales] = (salesPerformance[lead.sales] || 0) + 1;
    });

    const topSales = Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b, 'N/A');
    document.getElementById('topSales').textContent = topSales;

    document.getElementById('totalPenalty').textContent = 'Rp 0';
}


/**
 * Membuat dan memperbarui tabel papan peringkat.
 */
function updateLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    const monthStart = getMonthStart();

    const leaderboardData = salesList.map(salesName => {
        const leads = (allData.leads || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const canvasing = (allData.canvasing || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const promosi = (allData.promosi || []).filter(d => d.sales === salesName && new Date(d.timestamp) >= monthStart).length;
        const total = leads + canvasing + promosi;
        return { name: salesName, leads, canvasing, promosi, total };
    });

    leaderboardData.sort((a, b) => b.total - a.total);

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nama Sales</th>
                    <th>Leads</th>
                    <th>Canvasing</th>
                    <th>Promosi</th>
                    <th>Total Aktivitas</th>
                </tr>
            </thead>
            <tbody>
                ${leaderboardData.map(sales => `
                    <tr>
                        <td>${sales.name}</td>
                        <td>${sales.leads}</td>
                        <td>${sales.canvasing}</td>
                        <td>${sales.promosi}</td>
                        <td><strong>${sales.total}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    container.innerHTML = tableHTML;
}

/**
 * Merender grafik aktivitas sales.
 */
function renderSalesChart() {
    const ctx = document.getElementById('salesActivityChart').getContext('2d');
    
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    const monthStart = getMonthStart();

    const chartData = {
        labels: salesList,
        datasets: [{
            label: 'Total Leads (Bulan Ini)',
            data: salesList.map(name => (allData.leads || []).filter(d => d.sales === name && new Date(d.timestamp) >= monthStart).length),
            backgroundColor: 'rgba(50, 184, 198, 0.6)',
            borderColor: 'rgba(50, 184, 198, 1)',
            borderWidth: 1
        },
        {
            label: 'Total Canvasing (Bulan Ini)',
            data: salesList.map(name => (allData.canvasing || []).filter(d => d.sales === name && new Date(d.timestamp) >= monthStart).length),
            backgroundColor: 'rgba(94, 82, 64, 0.6)',
            borderColor: 'rgba(94, 82, 64, 1)',
            borderWidth: 1
        }]
    };

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}


// =================================================================================
// FUNGSI UTILITY & INISIALISASI
// =================================================================================

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
    // Hapus pesan lama sebelum menampilkan yang baru
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
