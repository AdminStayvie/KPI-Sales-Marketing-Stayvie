/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
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
// KONFIGURASI
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; // <-- PASTIKAN INI URL DEPLOYMENT TERBARU ANDA
let allData = {}; // Tempat menyimpan semua data dari server
let salesList = []; // Daftar semua sales

// =================================================================================
// FUNGSI UTAMA
// =================================================================================

/**
 * Memuat semua data awal dari server.
 */
async function loadInitialData() {
    showMessage("Memuat data tim dari server...", "info");
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            allData = result.data;
            // Dapatkan daftar sales unik dari data leads
            salesList = [...new Set(allData.leads.map(item => item.sales))];
            showMessage("Data berhasil dimuat.", "success");
            updateAllUI();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
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
    
    const totalLeads = allData.leads.filter(d => new Date(d.timestamp) >= monthStart).length;
    const totalCanvasing = allData.canvasing.filter(d => new Date(d.timestamp) >= monthStart).length;
    
    document.getElementById('totalLeads').textContent = totalLeads;
    document.getElementById('totalCanvasing').textContent = totalCanvasing;

    // Logika untuk sales terbaik (contoh berdasarkan total input leads)
    const salesPerformance = {};
    allData.leads.forEach(lead => {
        salesPerformance[lead.sales] = (salesPerformance[lead.sales] || 0) + 1;
    });
    const topSales = Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b, 'N/A');
    document.getElementById('topSales').textContent = topSales;

    // Logika denda bisa ditambahkan di sini jika diperlukan
}

/**
 * Membuat dan memperbarui tabel papan peringkat.
 */
function updateLeaderboard() {
    const container = document.getElementById('leaderboard');
    if (!container) return;

    const leaderboardData = salesList.map(salesName => {
        const leads = allData.leads.filter(d => d.sales === salesName).length;
        const canvasing = allData.canvasing.filter(d => d.sales === salesName).length;
        const promosi = allData.promosi.filter(d => d.sales === salesName).length;
        const total = leads + canvasing + promosi;
        return { name: salesName, leads, canvasing, promosi, total };
    });

    // Urutkan berdasarkan total aktivitas
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
    const chartData = {
        labels: salesList,
        datasets: [{
            label: 'Total Leads',
            data: salesList.map(name => allData.leads.filter(d => d.sales === name).length),
            backgroundColor: 'rgba(50, 184, 198, 0.6)', // Teal
            borderColor: 'rgba(50, 184, 198, 1)',
            borderWidth: 1
        },
        {
            label: 'Total Canvasing',
            data: salesList.map(name => allData.canvasing.filter(d => d.sales === name).length),
            backgroundColor: 'rgba(94, 82, 64, 0.6)', // Brown
            borderColor: 'rgba(94, 82, 64, 1)',
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
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
    loadInitialData();
}

document.addEventListener('DOMContentLoaded', initializeApp);
