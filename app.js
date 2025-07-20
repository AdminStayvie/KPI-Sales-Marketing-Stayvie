/**
 * @file app.js
 * @description Main application logic for the KPI dashboard.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) {
    window.location.href = 'index.html';
}
let currentUser = JSON.parse(currentUserJSON);

// =================================================================================
// KONFIGURASI PENTING
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; 

// --- STATE APLIKASI ---
const appData = {
  sales_team: ["Eka", "Saski", "Lidya", "Rizka"],
  daily_targets: [
    {"id": 1, "name": "Menginput Data Lead", "target": 20, "penalty": 15000},
    {"id": 2, "name": "Konversi Lead Menjadi Prospek", "target": 5, "penalty": 20000},
    {"id": 3, "name": "Promosi Campaign Package", "target": 2, "penalty": 10000}
  ],
  weekly_targets: [
    {"id": 4, "name": "Canvasing dan Pitching", "target": 1, "penalty": 50000},
    {"id": 5, "name": "Door-to-door perusahaan", "target": 3, "penalty": 150000},
    {"id": 6, "name": "Menyampaikan Quotation", "target": 1, "penalty": 50000},
    {"id": 7, "name": "Survey pengunjung Co-living", "target": 4, "penalty": 50000},
    {"id": 8, "name": "Laporan Ringkas Mingguan", "target": 1, "penalty": 50000},
    {"id": 9, "name": "Input CRM Survey kompetitor", "target": 1, "penalty": 25000},
    {"id": 10, "name": "Konversi Booking Venue Barter", "target": 1, "penalty": 75000}
  ],
  monthly_targets: [
    {"id": 11, "name": "Konversi Booking Kamar B2B", "target": 2, "penalty": 200000},
    {"id": 12, "name": "Konversi Booking Venue", "target": 2, "penalty": 200000},
    {"id": 13, "name": "Mengikuti Event/Networking", "target": 1, "penalty": 125000},
    {"id": 14, "name": "Launch Campaign Package", "target": 1, "penalty": 150000}
  ]
};

let currentData = {
  leads: [], canvasing: [], promosi: [], doorToDoor: [], quotations: [],
  surveys: [], reports: [], crmSurveys: [], conversions: [], events: [], campaigns: [],
  settings: {}
};

// --- FUNGSI UTAMA ---
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
    const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Server merespons dengan status: ${response.status}`);
    const result = await response.json();
    if (result.status === 'success') {
      showMessage('Data berhasil disimpan!', 'success');
      const dataKey = sheetName.charAt(0).toLowerCase() + sheetName.slice(1);
      if (!currentData[dataKey]) currentData[dataKey] = [];
      currentData[dataKey].push(result.data);
      updateAllSummaries();
      updateDashboard();
      event.target.reset();
    } else { throw new Error(result.message || 'Terjadi kesalahan di server Apps Script.'); }
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
            for (const serverKey in result.data) {
                const localKey = serverKey.charAt(0).toLowerCase() + serverKey.slice(1);
                if (currentData.hasOwnProperty(localKey)) {
                    currentData[localKey] = result.data[serverKey];
                }
            }
            showMessage("Data berhasil dimuat.", "success");
            updateDashboard();
            updateAllSummaries();
            showContentPage('dashboard');
        } else { throw new Error(result.message); }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    }
}

// --- FUNGSI-FUNGSI FORM HANDLER (Tidak berubah) ---
function handleLeadForm(e) { e.preventDefault(); if (!isWithinCutoffTime()) { showMessage('Batas waktu input harian (16:00) terlewati!', 'error'); return; } const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, customerName: formData.get('customerName'), leadSource: formData.get('leadSource'), product: formData.get('product'), contact: formData.get('contact'), notes: formData.get('notes'), date: getCurrentDateString(), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Leads', data, null, e); }
// ... (dan semua fungsi handleForm lainnya)

// --- FUNGSI UTILITY & MANAJEMEN ---
function toBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = error => reject(error); }); }
function initializeSettings() { const allTargets = [...appData.daily_targets, ...appData.weekly_targets, ...appData.monthly_targets]; allTargets.forEach(target => { currentData.settings[target.id] = true; }); }
function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount); }
function formatDate(date) { if (!(date instanceof Date)) date = new Date(date); return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date); }
function getCurrentDateString() { const today = new Date(); const year = today.getFullYear(); const month = (today.getMonth() + 1).toString().padStart(2, '0'); const day = today.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; }
function getLocalTimestampString() { const now = new Date(); const year = now.getFullYear(); const month = (now.getMonth() + 1).toString().padStart(2, '0'); const day = now.getDate().toString().padStart(2, '0'); const hours = now.getHours().toString().padStart(2, '0'); const minutes = now.getMinutes().toString().padStart(2, '0'); const seconds = now.getSeconds().toString().padStart(2, '0'); const timezoneOffset = -now.getTimezoneOffset(); const offsetSign = timezoneOffset >= 0 ? '+' : '-'; const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0'); const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0'); return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`; }
function getDatestamp() { const now = new Date(); const hours = now.getHours().toString().padStart(2, '0'); const minutes = now.getMinutes().toString().padStart(2, '0'); const day = now.getDate().toString().padStart(2, '0'); const month = (now.getMonth() + 1).toString().padStart(2, '0'); const year = now.getFullYear(); return `${hours}:${minutes} ${day}/${month}/${year}`; }
function isWithinCutoffTime() { return new Date().getHours() < 16; }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
function showContentPage(pageId) { document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active')); const pageElement = document.getElementById(pageId); if (pageElement) pageElement.classList.add('active'); document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active')); const navLink = document.querySelector(`[data-page="${pageId}"]`); if (navLink) navLink.classList.add('active'); }
function updateDateTime() { const now = new Date(); const dateTimeElement = document.getElementById('currentDateTime'); if(dateTimeElement) dateTimeElement.textContent = now.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); }

// --- PERBAIKAN LOGIKA KALKULASI ---

// Fungsi helper untuk mendapatkan data yang sudah difilter berdasarkan pengguna
function getFilteredData(dataType) {
    const data = currentData[dataType] || [];
    return currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name);
}

// Fungsi helper terpusat untuk menghitung pencapaian target spesifik
function calculateAchievementForTarget(targetId, period) {
    const today = new Date();
    const weekStart = getWeekStart(today);
    const monthStart = getMonthStart(today);

    switch(targetId) {
        case 1: // Menginput Data Lead
            return getFilteredData('leads').filter(d => d.date && d.date.startsWith(getCurrentDateString())).length;
        case 3: // Promosi Campaign Package
            return getFilteredData('promosi').filter(d => d.date && d.date.startsWith(getCurrentDateString())).length;
        case 4: // Canvasing dan Pitching
            return getFilteredData('canvasing').filter(d => d.date && new Date(d.date) >= weekStart).length;
        // Tambahkan case lain di sini untuk target lainnya
        default:
            return 0; // Target belum diimplementasikan
    }
}

// Fungsi kalkulasi utama sekarang menggunakan helper
function calculateDailyAchievements() {
    return appData.daily_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0);
}

function calculateWeeklyAchievements() {
    return appData.weekly_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0);
}

function calculateMonthlyAchievements() {
    return appData.monthly_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0);
}

// Fungsi updateDetailTarget sekarang menggunakan kalkulasi nyata
function updateTargetBreakdown() {
    const container = document.getElementById('targetBreakdown');
    if (!container) return;
    container.innerHTML = ''; // Hapus konten lama

    const allTargets = [
        ...appData.daily_targets.map(t => ({ ...t, type: 'Harian' })),
        ...appData.weekly_targets.map(t => ({ ...t, type: 'Mingguan' })),
        ...appData.monthly_targets.map(t => ({ ...t, type: 'Bulanan' }))
    ];
    
    let currentType = '';
    allTargets.forEach(target => {
        if (currentData.settings[target.id]) {
            if (target.type !== currentType) {
                currentType = target.type;
                const h4 = document.createElement('h4');
                h4.textContent = `Target ${currentType}`;
                container.appendChild(h4);
            }
            
            // Kalkulasi pencapaian nyata
            const achieved = calculateAchievementForTarget(target.id);
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
        }
    });
}

// --- FUNGSI UPDATE UI LAINNYA ---
function updateDashboard() {
    if (!currentUser) return;
    const userDisplay = document.getElementById('userDisplayName');
    if (userDisplay) userDisplay.textContent = currentUser.name;
    
    const dailyAchieved = calculateDailyAchievements();
    const weeklyAchieved = calculateWeeklyAchievements();
    const monthlyAchieved = calculateMonthlyAchievements();
    
    const dailyTotal = appData.daily_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    const weeklyTotal = appData.weekly_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    const monthlyTotal = appData.monthly_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    
    updateProgressBar('daily', dailyAchieved, dailyTotal);
    updateProgressBar('weekly', weeklyAchieved, weeklyTotal);
    updateProgressBar('monthly', monthlyAchieved, monthlyTotal);
    updateTargetBreakdown();
}

function updateProgressBar(type, achieved, total) { const percentage = total > 0 ? Math.round((achieved / total) * 100) : 0; const progressFill = document.getElementById(`${type}Progress`); const percentageText = document.getElementById(`${type}Percentage`); const achievedText = document.getElementById(`${type}Achieved`); const totalText = document.getElementById(`${type}Total`); if(progressFill) progressFill.style.width = `${percentage}%`; if(percentageText) percentageText.textContent = `${percentage}%`; if(achievedText) achievedText.textContent = achieved; if(totalText) totalText.textContent = total; }
function getWeekStart(date = new Date()) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); }
function getMonthStart(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), 1); }

function updateAllSummaries() {
    updateLeadsSummary(); updateCanvasingSummary(); updatePromosiSummary();
    updateDoorToDoorSummary(); updateQuotationsSummary(); updateSurveysSummary();
    updateReportsSummary(); updateCRMSurveysSummary(); updateConversionsSummary();
    updateEventsSummary(); updateCampaignsSummary(); updateAdministrasiSummary();
}

function createSummaryTable(containerId, data, headers, rowGenerator) { const container = document.getElementById(containerId); if (!container) return; const userSpecificData = currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name); if (userSpecificData.length === 0) { container.innerHTML = `<div class="empty-state">Belum ada data yang diinput</div>`; return; } let tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>`; userSpecificData.slice(-10).reverse().forEach(item => { tableHTML += `<tr>${rowGenerator(item)}</tr>`; }); tableHTML += `</tbody></table>`; container.innerHTML = tableHTML; }
function updateLeadsSummary() { createSummaryTable('leadSummary', currentData.leads, ['Waktu Input', 'Customer', 'Sumber', 'Produk', 'Kontak'], item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.leadSource || ''}</td><td>${item.product || ''}</td><td>${item.contact || ''}</td>`); }
// ... (dan semua fungsi update summary lainnya)
function updateAdministrasiSummary() { if (currentUser && currentUser.role === 'management') updateAdminSettings(); }
function updateAdminSettings() { /* ... */ }
window.toggleSetting = function(targetId) { /* ... */ }

// --- EVENT LISTENERS & INISIALISASI ---
function showMessage(message, type = 'info') { const notification = document.createElement('div'); notification.className = `message ${type}`; notification.textContent = message; const mainContent = document.querySelector('.main-content'); if(mainContent) { mainContent.insertBefore(notification, mainContent.firstChild); setTimeout(() => { notification.remove(); }, 4000); } }
function setupFormListeners() { const forms = { 'leadForm': handleLeadForm, /* ... */ }; for (const formId in forms) { const formElement = document.getElementById(formId); if (formElement) formElement.addEventListener('submit', forms[formId]); } }

document.addEventListener('DOMContentLoaded', function() {
    if(!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    initializeSettings();
    updateDateTime();
    setInterval(updateDateTime, 60000);
    setupFormListeners();
    loadInitialData();
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showContentPage(this.getAttribute('data-page'));
        });
    });
});
