/**
 * @file app.js
 * @description Main application logic for the KPI dashboard.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) {
    // Jika tidak ada pengguna yang login, tendang kembali ke halaman login.
    window.location.href = 'index.html';
}
// Variabel global untuk pengguna yang sedang login
let currentUser = JSON.parse(currentUserJSON);


// =================================================================================
// KONFIGURASI PENTING
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; 
// =================================================================================

// State aplikasi (data dinamis)
let currentData = {
  leads: [], canvasing: [], promosi: [], doorToDoor: [], quotations: [],
  surveys: [], reports: [], crmSurveys: [], conversions: [], events: [], campaigns: [],
  settings: {}
};
let selectedPeriod = { start: null, end: null }; // State untuk filter periode

// Fungsi untuk mengubah file menjadi Base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

// Fungsi untuk mengirim data ke Google Apps Script dengan penanganan error yang lebih baik
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
      method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Server merespons dengan status: ${response.status}`);
    const result = await response.json();
    if (result.status === 'success') {
      showMessage('Data berhasil disimpan!', 'success');
      const dataKey = sheetName.charAt(0).toLowerCase() + sheetName.slice(1);
      if (!currentData[dataKey]) currentData[dataKey] = [];
      currentData[dataKey].push(result.data);
      updateAllSummaries(); // Perbarui semua tabel, termasuk yang baru difilter
      updateDashboard();
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

// --- PERBAIKAN DI SINI ---
// Fungsi untuk memuat semua data awal dari Google Sheet
async function loadInitialData() {
    showMessage("Memuat data dari server...", "info");
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            // Loop melalui data yang diterima dari server
            for (const serverKey in result.data) {
                // Ubah kunci dari server (PascalCase) menjadi kunci lokal (camelCase)
                const localKey = serverKey.charAt(0).toLowerCase() + serverKey.slice(1);
                // Jika kunci lokal ada di currentData, salin datanya
                if (currentData.hasOwnProperty(localKey)) {
                    currentData[localKey] = result.data[serverKey];
                }
            }
            
            showMessage("Data berhasil dimuat.", "success");
            
            // Setelah semua data ada, perbarui semua UI
            updateDashboard();
            updateAllSummaries(); // Panggil fungsi ini untuk mengisi semua tabel
            
            showContentPage('dashboard'); // Tampilkan halaman dashboard sebagai default
        } else { throw new Error(result.message); }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    }
}
// --- AKHIR PERBAIKAN ---

// Fungsi untuk memperbarui semua tabel ringkasan sekaligus
function updateAllSummaries() {
    updateLeadsSummary(); updateCanvasingSummary(); updatePromosiSummary();
    updateDoorToDoorSummary(); updateQuotationsSummary(); updateSurveysSummary();
    updateReportsSummary(); updateCRMSurveysSummary(); updateConversionsSummary();
    updateEventsSummary(); updateCampaignsSummary(); updateAdministrasiSummary();
}

// --- FUNGSI-FUNGSI FORM HANDLER (Tidak berubah) ---
function handleLeadForm(e) { e.preventDefault(); if (!isWithinCutoffTime()) { showMessage('Batas waktu input harian (16:00) terlewati!', 'error'); return; } const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, customerName: formData.get('customerName'), leadSource: formData.get('leadSource'), product: formData.get('product'), contact: formData.get('contact'), notes: formData.get('notes'), date: getCurrentDateString(), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Leads', data, null, e); }
function handleCanvasingForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, meetingTitle: formData.get('meetingTitle'), notes: formData.get('notes'), date: getCurrentDateString(), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Canvasing', data, e.target.querySelector('input[type="file"]'), e); }
function handlePromosiForm(e) { e.preventDefault(); if (!isWithinCutoffTime()) { showMessage('Batas waktu input harian (16:00) terlewati!', 'error'); return; } const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, campaignName: formData.get('campaignName'), platform: formData.get('platform'), date: getCurrentDateString(), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Promosi', data, e.target.querySelector('input[type="file"]'), e); }
function handleDoorToDoorForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, visitDate: formData.get('visitDate'), institutionName: formData.get('institutionName'), address: formData.get('address'), picName: formData.get('picName'), picPhone: formData.get('picPhone'), response: formData.get('response'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'DoorToDoor', data, e.target.querySelector('input[type="file"]'), e); }
function handleQuotationForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, customerName: formData.get('customerName'), productType: formData.get('productType'), quotationAmount: formData.get('quotationAmount'), description: formData.get('description'), date: getCurrentDateString(), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Quotations', data, e.target.querySelector('input[type="file"]'), e); }
function handleSurveyForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, customerName: formData.get('customerName'), gender: formData.get('gender'), phone: formData.get('phone'), surveyDate: formData.get('surveyDate'), origin: formData.get('origin'), feedback: formData.get('feedback'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Surveys', data, e.target.querySelector('input[type="file"]'), e); }
function handleLaporanForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, reportPeriod: formData.get('reportPeriod'), managementFeedback: formData.get('managementFeedback'), additionalNotes: formData.get('additionalNotes'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Reports', data, e.target.querySelector('input[type="file"]'), e); }
function handleCrmSurveyForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, competitorName: formData.get('competitorName'), website: formData.get('website'), product: formData.get('product'), priceDetails: formData.get('priceDetails'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'CRMSurveys', data, null, e); }
function handleKonversiForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, eventName: formData.get('eventName'), clientName: formData.get('clientName'), eventDate: formData.get('eventDate'), venueType: formData.get('venueType'), barterValue: formData.get('barterValue'), barterDescription: formData.get('barterDescription'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Conversions', data, null, e); }
function handleEventForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, eventName: formData.get('eventName'), eventType: formData.get('eventType'), eventDate: formData.get('eventDate'), eventLocation: formData.get('eventLocation'), organizer: formData.get('organizer'), benefits: formData.get('benefits'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Events', data, e.target.querySelector('input[type="file"]'), e); }
function handleCampaignForm(e) { e.preventDefault(); const formData = new FormData(e.target); const data = { id: Date.now(), sales: currentUser.name, campaignTitle: formData.get('campaignTitle'), targetMarket: formData.get('targetMarket'), campaignStartDate: formData.get('campaignStartDate'), campaignEndDate: formData.get('campaignEndDate'), conceptDescription: formData.get('conceptDescription'), potentialConversion: formData.get('potentialConversion'), budget: formData.get('budget'), timestamp: getLocalTimestampString(), datestamp: getDatestamp() }; sendData('saveData', 'Campaigns', data, e.target.querySelector('input[type="file"]'), e); }

// --- FUNGSI UTILITY & MANAJEMEN (Tidak berubah) ---
function initializeSettings() { /* ... */ }
function formatCurrency(amount) { /* ... */ }
function formatDate(date) { /* ... */ }
function getCurrentDateString() { /* ... */ }
function getLocalTimestampString() { /* ... */ }
function getDatestamp() { /* ... */ }
function isWithinCutoffTime() { /* ... */ }
function logout() { /* ... */ }
function showContentPage(pageId) { /* ... */ }
function updateDateTime() { /* ... */ }

// --- LOGIKA FILTER PERIODE (Tidak berubah) ---
function getCutoffPeriods() { /* ... */ }
function populatePeriodFilter() { /* ... */ }

// --- FUNGSI DASHBOARD & KALKULASI (Tidak berubah) ---
function updateDashboard() { /* ... */ }
function updateProgressBar(type, achieved, total) { /* ... */ }
function getFilteredData(dataType) { /* ... */ }
function calculateDailyAchievements(date) { /* ... */ }
function getWeekStart(date = new Date()) { /* ... */ }
function getMonthStart(date = new Date()) { /* ... */ }
function calculateWeeklyAchievements(weekStart) { /* ... */ }
function calculateMonthlyAchievements(monthStart) { /* ... */ }
function updateTargetBreakdown() { /* ... */ }

// --- FUNGSI UPDATE SUMMARY (Tidak berubah) ---
function createSummaryTable(containerId, data, headers, rowGenerator) { /* ... */ }
function updateLeadsSummary() { /* ... */ }
function updateCanvasingSummary() { /* ... */ }
// ... (dan semua fungsi update summary lainnya)
function updateAdministrasiSummary() { /* ... */ }
function updateAdminSettings() { /* ... */ }
window.toggleSetting = function(targetId) { /* ... */ }

// --- EVENT LISTENERS & INISIALISASI ---
function showMessage(message, type = 'info') { /* ... */ }
function setupFormListeners() { /* ... */ }

document.addEventListener('DOMContentLoaded', function() {
    if(!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    initializeSettings();
    updateDateTime();
    setInterval(updateDateTime, 60000);
    setupFormListeners();
    
    populatePeriodFilter();
    
    const periodFilter = document.getElementById('periodFilter');
    if(periodFilter) {
        periodFilter.addEventListener('change', () => {
            const periods = getCutoffPeriods();
            const selectedIndex = periodFilter.value;
            const newPeriod = periods[selectedIndex];
            selectedPeriod.start = newPeriod.start;
            selectedPeriod.end = newPeriod.end;
            selectedPeriod.start.setHours(0, 0, 0, 0);
            selectedPeriod.end.setHours(23, 59, 59, 999);
            updateAllSummaries();
        });
    }

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
