/**
 * @file app.js
 * @description Logika utama untuk dashboard KPI (Versi Final dengan Perbaikan).
 * @version 2.5.0
 *
 * Perubahan Utama (v2.5.0):
 * - PERBAIKAN BUG (Fitur Hilang): Mengimplementasikan fungsi `calculateAndDisplayPenalties` untuk menghitung dan menampilkan total denda pada kartu dashboard. Logika ini sebelumnya tidak ada.
 *
 * Perubahan Sebelumnya:
 * - PERUBAHAN LOGIKA: Mengubah `timestamp` agar menggunakan zona waktu lokal (WIB).
 * - PERUBAHAN LOGIKA: Mengubah periode perhitungan bulanan (21 - 20).
 * - PERUBAHAN LOGIKA: Mengubah `dateField` untuk semua target menjadi 'timestamp'.
 * - PERBAIKAN BUG: Melengkapi `CONFIG.dataMapping`.
 * - KONFIGURASI TERPUSAT, FORM HANDLER TUNGGAL, PERHITUNGAN DINAMIS.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) {
    window.location.href = 'index.html';
}
const currentUser = JSON.parse(currentUserJSON);

// =================================================================================
// KONFIGURASI TERPUSAT
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

const CONFIG = {
    targets: {
        daily: [
            { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads', dateField: 'timestamp' },
            { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'prospects', dateField: 'timestamp' },
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
            { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'b2bBookings', dateField: 'timestamp' },
            { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'venueBookings', dateField: 'timestamp' },
            { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'events', dateField: 'timestamp' },
            { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'campaigns', dateField: 'timestamp' }
        ]
    },
    dataMapping: {
        'Leads': { dataKey: 'leads', headers: ['Waktu', 'Customer', 'Sumber', 'Produk'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.leadSource || ''}</td><td>${item.product || ''}</td>` },
        'Canvasing': { dataKey: 'canvasing', headers: ['Waktu', 'Judul Meeting', 'File'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.meetingTitle || ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>` },
        'Promosi': { dataKey: 'promosi', headers: ['Waktu', 'Campaign', 'Platform'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.campaignName || ''}</td><td>${item.platform || ''}</td>` },
        'DoorToDoor': { dataKey: 'doorToDoor', headers: ['Waktu', 'Tanggal', 'Instansi', 'PIC'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${formatDate(item.visitDate)}</td><td>${item.institutionName || ''}</td><td>${item.picName || ''}</td>` },
        'Quotations': { dataKey: 'quotations', headers: ['Waktu', 'Customer', 'Produk', 'Nominal'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.productType || ''}</td><td>${formatCurrency(item.quotationAmount)}</td>` },
        'Surveys': { dataKey: 'surveys', headers: ['Waktu', 'Tgl Survey', 'Customer', 'Asal'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${formatDate(item.surveyDate)}</td><td>${item.customerName || ''}</td><td>${item.origin || ''}</td>` },
        'Reports': { dataKey: 'reports', headers: ['Waktu', 'Periode', 'File'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.reportPeriod || ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>` },
        'CRMSurveys': { dataKey: 'crmSurveys', headers: ['Waktu', 'Kompetitor', 'Website'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.competitorName || ''}</td><td>${item.website ? `<a href="${item.website}" target="_blank">Link</a>` : '-'}</td>` },
        'Conversions': { dataKey: 'conversions', headers: ['Waktu', 'Event', 'Client', 'Tanggal'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.clientName || ''}</td><td>${formatDate(item.eventDate)}</td>` },
        'Events': { dataKey: 'events', headers: ['Waktu', 'Nama Event', 'Jenis', 'Tanggal'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.eventType || ''}</td><td>${formatDate(item.eventDate)}</td>` },
        'Campaigns': { dataKey: 'campaigns', headers: ['Waktu', 'Judul', 'Periode', 'Budget'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.campaignTitle || ''}</td><td>${formatDate(item.campaignStartDate)} - ${formatDate(item.campaignEndDate)}</td><td>${formatCurrency(item.budget)}</td>` },
    }
};

// --- STATE APLIKASI ---
let currentData = {
    settings: {}
};
Object.values(CONFIG.dataMapping).forEach(map => {
    currentData[map.dataKey] = [];
});

// =================================================================================
// FUNGSI INTI (Core Functions)
// =================================================================================
async function sendData(action, sheetName, data, fileInput, event) {
    const button = event.target.querySelector('button[type="submit"]');
    const originalButtonText = button.innerHTML;
    button.innerHTML = '<span class="loading"></span> Mengirim...';
    button.disabled = true;

    const payload = { action, sheetName, data };
    if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        payload.fileData = await toBase64(file);
        payload.fileName = file.name;
        payload.fileType = file.type;
        payload.categoryName = sheetName;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Server merespons dengan status: ${response.status}`);
        
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Data berhasil disimpan!', 'success');
            const dataKey = CONFIG.dataMapping[sheetName]?.dataKey;
            if (dataKey) {
                // Pastikan data yang diterima memiliki struktur yang benar
                const newData = result.data || data;
                currentData[dataKey].push(newData);
            }
            updateAllUI();
            event.target.reset();
        } else {
            throw new Error(result.message || 'Terjadi kesalahan di server Apps Script.');
        }
    } catch (error) {
        console.error('Error di dalam fungsi sendData:', error);
        showMessage(`Gagal mengirim data: ${error.message}.`, 'error');
    } finally {
        button.innerHTML = originalButtonText;
        button.disabled = false;
    }
}

async function loadInitialData() {
    showMessage("Memuat data dari server...", "info");
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            for (const key in result.data) {
                if (currentData.hasOwnProperty(key)) {
                    currentData[key] = result.data[key] || [];
                }
            }
            showMessage("Data berhasil dimuat.", "success");
            updateAllUI();
            showContentPage('dashboard');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    }
}

// =================================================================================
// FORM HANDLING (Dinamis)
// =================================================================================
function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const sheetName = form.dataset.sheetName;
    if (!sheetName) {
        console.error("Form tidak memiliki atribut 'data-sheet-name'.", form);
        showMessage("Terjadi kesalahan konfigurasi form.", "error");
        return;
    }
    
    const isDaily = CONFIG.targets.daily.some(t => CONFIG.dataMapping[sheetName]?.dataKey === t.dataKey);
    if (isDaily && !isWithinCutoffTime()) {
        showMessage('Batas waktu input harian (16:00) terlewati!', 'error');
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.id = Date.now();
    data.sales = currentUser.name;
    data.timestamp = getLocalTimestampString();
    data.datestamp = getDatestamp();
    if(!data.date) data.date = getCurrentDateString();

    const fileInput = form.querySelector('input[type="file"]');
    sendData('saveData', sheetName, data, fileInput, e);
}


// =================================================================================
// KALKULASI & UPDATE UI
// =================================================================================

function updateAllUI() {
    updateDashboard();
    updateAllSummaries();
    // <<< FIX: Panggil fungsi kalkulasi denda
    calculateAndDisplayPenalties(); 
    if (currentUser.role === 'management') {
        updateAdminSettings();
    }
}

function getFilteredData(dataType) {
    const data = currentData[dataType] || [];
    // Untuk manajemen, tampilkan semua data. Untuk sales, filter berdasarkan nama.
    if (currentUser.role === 'management') {
        return data;
    }
    return data.filter(d => d.sales === currentUser.name);
}

function calculateAchievementForTarget(target) {
    if (!target.dataKey || !target.dateField) return 0;

    const data = getFilteredData(target.dataKey);
    const today = new Date();
    const weekStart = getWeekStart(today);
    const monthStart = getMonthStart(today);

    return data.filter(d => {
        // Pastikan ada data tanggal dan valid
        const itemDateStr = d[target.dateField];
        if (!itemDateStr) return false;
        const itemDate = new Date(itemDateStr);
        if (isNaN(itemDate.getTime())) return false;

        // Cek periode berdasarkan tipe target
        if (CONFIG.targets.daily.includes(target)) {
            return itemDate.toDateString() === today.toDateString();
        }
        if (CONFIG.targets.weekly.includes(target)) {
            return itemDate >= weekStart && itemDate <= today;
        }
        if (CONFIG.targets.monthly.includes(target)) {
            return itemDate >= monthStart && itemDate <= today;
        }
        return false;
    }).length;
}

function updateDashboard() {
    document.getElementById('userDisplayName').textContent = currentUser.name;

    const achievements = { daily: 0, weekly: 0, monthly: 0 };
    const totals = { daily: 0, weekly: 0, monthly: 0 };

    ['daily', 'weekly', 'monthly'].forEach(period => {
        CONFIG.targets[period].forEach(target => {
            // Hanya hitung jika target aktif (berdasarkan settings)
            if (currentData.settings[target.id]) {
                const achieved = calculateAchievementForTarget(target);
                achievements[period] += achieved;
                totals[period] += target.target;
            }
        });
        updateProgressBar(period, achievements[period], totals[period]);
    });

    updateTargetBreakdown();
}

/**
 * <<< FIX: Fungsi baru untuk menghitung dan menampilkan denda.
 * Menghitung total denda berdasarkan target yang tidak tercapai.
 * Fungsi ini hanya berjalan untuk peran 'sales'.
 */
function calculateAndDisplayPenalties() {
    const penaltyElement = document.getElementById('totalPenalty');
    if (!penaltyElement || currentUser.role !== 'sales') {
        if(penaltyElement) penaltyElement.textContent = formatCurrency(0);
        return;
    }

    let totalPenalty = 0;
    const today = new Date();

    // Hanya hitung denda harian jika sudah lewat jam cutoff
    if (!isWithinCutoffTime()) {
        CONFIG.targets.daily.forEach(target => {
            if (currentData.settings[target.id]) {
                const achieved = calculateAchievementForTarget(target);
                if (achieved < target.target) {
                    totalPenalty += target.penalty;
                }
            }
        });
    }

    // Hanya hitung denda mingguan di akhir minggu (misal: hari Minggu)
    if (today.getDay() === 0) { 
        CONFIG.targets.weekly.forEach(target => {
            if (currentData.settings[target.id]) {
                const achieved = calculateAchievementForTarget(target);
                if (achieved < target.target) {
                    totalPenalty += target.penalty;
                }
            }
        });
    }
    
    // Hanya hitung denda bulanan di akhir periode (tanggal 20)
    if (today.getDate() === 20) {
        CONFIG.targets.monthly.forEach(target => {
            if (currentData.settings[target.id]) {
                const achieved = calculateAchievementForTarget(target);
                if (achieved < target.target) {
                    totalPenalty += target.penalty;
                }
            }
        });
    }

    penaltyElement.textContent = formatCurrency(totalPenalty);
}


function updateTargetBreakdown() {
    const container = document.getElementById('targetBreakdown');
    if (!container) return;
    container.innerHTML = '';
    
    ['daily', 'weekly', 'monthly'].forEach(period => {
        const activeTargets = CONFIG.targets[period].filter(t => currentData.settings[t.id]);
        if (activeTargets.length === 0) return;

        const header = document.createElement('h4');
        header.textContent = `Target ${period.charAt(0).toUpperCase() + period.slice(1)}`;
        container.appendChild(header);

        activeTargets.forEach(target => {
            const achieved = calculateAchievementForTarget(target);
            const status = achieved >= target.target ? 'completed' : 'pending';
            const item = document.createElement('div');
            item.className = 'target-item';
            item.innerHTML = `
                <div class="target-name">${target.name}</div>
                <div class="target-progress">
                    <span>${achieved}/${target.target}</span>
                    <span class="target-status ${status}">${status === 'completed' ? 'Selesai' : 'Pending'}</span>
                </div>`;
            container.appendChild(item);
        });
    });
}

function updateProgressBar(type, achieved, total) {
    const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
    const bar = document.getElementById(`${type}Progress`);
    const percText = document.getElementById(`${type}Percentage`);
    const achievedText = document.getElementById(`${type}Achieved`);
    const totalText = document.getElementById(`${type}Total`);

    if(bar) bar.style.width = `${percentage}%`;
    if(percText) percText.textContent = `${percentage}%`;
    if(achievedText) achievedText.textContent = achieved;
    if(totalText) totalText.textContent = total;
}

function updateSummaryTable(sheetName, mapping) {
    const containerId = `${mapping.dataKey}Summary`;
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const userSpecificData = getFilteredData(mapping.dataKey);

    if (userSpecificData.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data yang diinput</div>`;
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr><th>${mapping.headers.join('</th><th>')}</th></tr>
            </thead>
            <tbody>
                ${userSpecificData.slice(-10).reverse().map(item => `<tr>${mapping.rowGenerator(item)}</tr>`).join('')}
            </tbody>
        </table>`;
    container.innerHTML = tableHTML;
}

function updateAllSummaries() {
    for (const sheetName in CONFIG.dataMapping) {
        updateSummaryTable(sheetName, CONFIG.dataMapping[sheetName]);
    }
}

function updateAdminSettings() {
    const container = document.getElementById('adminSettings');
    if (!container) return;
    let html = '<div class="admin-settings-grid">';
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];
    allTargets.forEach(target => {
        const isActive = currentData.settings[target.id];
        html += `
            <div class="setting-item">
                <div class="setting-info">
                    <div class="setting-name">${target.name}</div>
                    <div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSetting(${target.id})">
                    <span class="toggle-slider"></span>
                </label>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.toggleSetting = function(targetId) {
    currentData.settings[targetId] = !currentData.settings[targetId];
    updateAllUI(); // Panggil updateAllUI agar semua kalkulasi diperbarui
    showMessage('Pengaturan disimpan (hanya di sesi ini).', 'info');
};


// =================================================================================
// FUNGSI UTILITY & INISIALISASI
// =================================================================================
function toBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = error => reject(error); }); }
function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0); }
function formatDate(dateStr) { if (!dateStr) return ''; const date = new Date(dateStr); if (isNaN(date.getTime())) return 'Invalid Date'; return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date); }
function getCurrentDateString() { const today = new Date(); return today.toISOString().split('T')[0]; }

function getLocalTimestampString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    const timezoneOffset = -now.getTimezoneOffset();
    const offsetSign = timezoneOffset >= 0 ? '+' : '-';
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
    const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

function getDatestamp() { const now = new Date(); return now.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }); }
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

function isWithinCutoffTime() { return new Date().getHours() < 16; }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
}

function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    }
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

function setupEventListeners() {
    document.querySelectorAll('form.kpi-form').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showContentPage(this.getAttribute('data-page'));
        });
    });

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

function initializeApp() {
    if (!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];
    allTargets.forEach(target => {
        currentData.settings[target.id] = true;
    });

    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    setupEventListeners();
    loadInitialData();
}

document.addEventListener('DOMContentLoaded', initializeApp);
