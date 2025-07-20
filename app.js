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
// =================================================================================

// --- STATE APLIKASI ---
let currentData = {
  leads: [], canvasing: [], promosi: [], doorToDoor: [], quotations: [],
  surveys: [], reports: [], crmSurveys: [], conversions: [], events: [], campaigns: [],
  settings: {}
};
let selectedPeriod = { start: null, end: null }; // State untuk filter periode

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

// --- FUNGSI-FUNGSI FORM HANDLER (Tidak berubah, hanya memanggil sendData) ---
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

// --- FUNGSI UTILITY & MANAJEMEN ---
function initializeSettings() { /* ... (Tidak berubah) ... */ }
function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount); }
function formatDate(date) { if (!(date instanceof Date)) date = new Date(date); return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date); }
function getCurrentDateString() { const today = new Date(); const year = today.getFullYear(); const month = (today.getMonth() + 1).toString().padStart(2, '0'); const day = today.getDate().toString().padStart(2, '0'); return `${year}-${month}-${day}`; }
function getLocalTimestampString() { const now = new Date(); const year = now.getFullYear(); const month = (now.getMonth() + 1).toString().padStart(2, '0'); const day = now.getDate().toString().padStart(2, '0'); const hours = now.getHours().toString().padStart(2, '0'); const minutes = now.getMinutes().toString().padStart(2, '0'); const seconds = now.getSeconds().toString().padStart(2, '0'); const timezoneOffset = -now.getTimezoneOffset(); const offsetSign = timezoneOffset >= 0 ? '+' : '-'; const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0'); const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0'); return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`; }
function getDatestamp() { const now = new Date(); const hours = now.getHours().toString().padStart(2, '0'); const minutes = now.getMinutes().toString().padStart(2, '0'); const day = now.getDate().toString().padStart(2, '0'); const month = (now.getMonth() + 1).toString().padStart(2, '0'); const year = now.getFullYear(); return `${hours}:${minutes} ${day}/${month}/${year}`; }
function isWithinCutoffTime() { return new Date().getHours() < 16; }
function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
function showContentPage(pageId) { document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active')); const pageElement = document.getElementById(pageId); if (pageElement) pageElement.classList.add('active'); document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active')); const navLink = document.querySelector(`[data-page="${pageId}"]`); if (navLink) navLink.classList.add('active'); }
function updateDateTime() { const now = new Date(); const dateTimeElement = document.getElementById('currentDateTime'); if(dateTimeElement) dateTimeElement.textContent = now.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); }

// --- LOGIKA FILTER PERIODE ---
function getCutoffPeriods() {
    const periods = [];
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth(); // 0-11

    let periodEnd, periodStart;
    if (today.getDate() > 20) {
        periodStart = new Date(currentYear, currentMonth, 21);
        periodEnd = new Date(currentYear, currentMonth + 1, 20);
    } else {
        periodStart = new Date(currentYear, currentMonth - 1, 21);
        periodEnd = new Date(currentYear, currentMonth, 20);
    }

    for (let i = 0; i < 6; i++) {
        const startStr = periodStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const endStr = periodEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const periodText = i === 0 ? `Periode Ini (${startStr} - ${endStr})` : `${startStr} - ${endStr}`;
        periods.push({ text: periodText, start: new Date(periodStart), end: new Date(periodEnd) });
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() - 1);
        periodStart.setMonth(periodStart.getMonth() - 1);
    }
    return periods;
}

function populatePeriodFilter() {
    const filterSelect = document.getElementById('periodFilter');
    if (!filterSelect) return;
    const periods = getCutoffPeriods();
    filterSelect.innerHTML = '';
    periods.forEach((period, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = period.text;
        filterSelect.appendChild(option);
    });
    const currentPeriod = periods[0];
    selectedPeriod.start = currentPeriod.start;
    selectedPeriod.end = currentPeriod.end;
    selectedPeriod.start.setHours(0, 0, 0, 0);
    selectedPeriod.end.setHours(23, 59, 59, 999);
}

// --- FUNGSI DASHBOARD & KALKULASI (Tidak berubah) ---
function updateDashboard() { /* ... (Tidak berubah) ... */ }
function updateProgressBar(type, achieved, total) { /* ... (Tidak berubah) ... */ }
function getFilteredData(dataType) { const data = currentData[dataType] || []; return currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name); }
function calculateDailyAchievements(date) { const leadsToday = getFilteredData('leads').filter(l => l.date && l.date.startsWith(date)).length; const promosiToday = getFilteredData('promosi').filter(p => p.date && p.date.startsWith(date)).length; return leadsToday + promosiToday; }
function getWeekStart(date = new Date()) { /* ... (Tidak berubah) ... */ }
function getMonthStart(date = new Date()) { /* ... (Tidak berubah) ... */ }
function calculateWeeklyAchievements(weekStart) { /* ... (Tidak berubah) ... */ }
function calculateMonthlyAchievements(monthStart) { /* ... (Tidak berubah) ... */ }
function updateTargetBreakdown() { /* ... (Tidak berubah) ... */ }

// --- FUNGSI UPDATE SUMMARY (DENGAN LOGIKA FILTER) ---
function createSummaryTable(containerId, data, headers, rowGenerator) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let userSpecificData = currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name);

    if (selectedPeriod.start && selectedPeriod.end) {
        userSpecificData = userSpecificData.filter(item => {
            const dateField = item.date || item.visitDate || item.surveyDate || item.eventDate || item.campaignStartDate;
            if (!dateField) return false;
            const itemDate = new Date(dateField);
            return itemDate >= selectedPeriod.start && itemDate <= selectedPeriod.end;
        });
    }

    if (userSpecificData.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data pada periode ini</div>`;
        return;
    }

    let tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>`;
    userSpecificData.slice(-10).reverse().forEach(item => { tableHTML += `<tr>${rowGenerator(item)}</tr>`; });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function updateLeadsSummary() { createSummaryTable('leadSummary', currentData.leads, ['Waktu Input', 'Customer', 'Sumber', 'Produk', 'Kontak'], item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.leadSource || ''}</td><td>${item.product || ''}</td><td>${item.contact || ''}</td>`); }
function updateCanvasingSummary() { createSummaryTable('canvasingSummary', currentData.canvasing, ['Waktu Input', 'Judul Meeting', 'Tanggal', 'File'], item => `<td>${item.datestamp || ''}</td><td>${item.meetingTitle || ''}</td><td>${item.date ? formatDate(item.date) : ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`); }
function updatePromosiSummary() { createSummaryTable('promosiSummary', currentData.promosi, ['Waktu Input', 'Campaign', 'Platform', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.campaignName || ''}</td><td>${item.platform || ''}</td><td>${item.date ? formatDate(item.date) : ''}</td>`); }
function updateDoorToDoorSummary() { createSummaryTable('doorToDoorSummary', currentData.doorToDoor, ['Waktu Input', 'Tanggal Kunjungan', 'Instansi', 'PIC'], item => `<td>${item.datestamp || ''}</td><td>${item.visitDate ? formatDate(item.visitDate) : ''}</td><td>${item.institutionName || ''}</td><td>${item.picName || ''}</td>`); }
function updateQuotationsSummary() { createSummaryTable('quotationSummary', currentData.quotations, ['Waktu Input', 'Customer', 'Produk', 'Nominal'], item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.productType || ''}</td><td>${item.quotationAmount ? formatCurrency(item.quotationAmount) : ''}</td>`); }
function updateSurveysSummary() { createSummaryTable('surveySummary', currentData.surveys, ['Waktu Input', 'Tanggal Survey', 'Customer', 'Asal'], item => `<td>${item.datestamp || ''}</td><td>${item.surveyDate ? formatDate(item.surveyDate) : ''}</td><td>${item.customerName || ''}</td><td>${item.origin || ''}</td>`); }
function updateReportsSummary() { createSummaryTable('laporanSummary', currentData.reports, ['Waktu Input', 'Periode', 'File'], item => `<td>${item.datestamp || ''}</td><td>${item.reportPeriod || ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`); }
function updateCRMSurveysSummary() { createSummaryTable('crmSurveySummary', currentData.crmSurveys, ['Waktu Input', 'Kompetitor', 'Website'], item => `<td>${item.datestamp || ''}</td><td>${item.competitorName || ''}</td><td>${item.website ? `<a href="${item.website}" target="_blank">Link</a>` : '-'}</td>`); }
function updateConversionsSummary() { createSummaryTable('konversiSummary', currentData.conversions, ['Waktu Input', 'Event', 'Client', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.clientName || ''}</td><td>${item.eventDate ? formatDate(item.eventDate) : ''}</td>`); }
function updateEventsSummary() { createSummaryTable('eventSummary', currentData.events, ['Waktu Input', 'Nama Event', 'Jenis', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.eventType || ''}</td><td>${item.eventDate ? formatDate(item.eventDate) : ''}</td>`); }
function updateCampaignsSummary() { createSummaryTable('campaignSummary', currentData.campaigns, ['Waktu Input', 'Judul', 'Periode', 'Budget'], item => `<td>${item.datestamp || ''}</td><td>${item.campaignTitle || ''}</td><td>${item.campaignStartDate ? formatDate(item.campaignStartDate) : ''} - ${item.campaignEndDate ? formatDate(item.campaignEndDate) : ''}</td><td>${item.budget ? formatCurrency(item.budget) : ''}</td>`); }
function updateAdministrasiSummary() { if (currentUser && currentUser.role === 'management') updateAdminSettings(); }
function updateAdminSettings() { /* ... (Tidak berubah) ... */ }
window.toggleSetting = function(targetId) { /* ... (Tidak berubah) ... */ }

// --- EVENT LISTENERS & INISIALISASI ---
function showMessage(message, type = 'info') { /* ... (Tidak berubah) ... */ }
function setupFormListeners() {
    const forms = { 'leadForm': handleLeadForm, 'canvasingForm': handleCanvasingForm, 'promosiForm': handlePromosiForm, 'doorToDoorForm': handleDoorToDoorForm, 'quotationForm': handleQuotationForm, 'surveyForm': handleSurveyForm, 'laporanForm': handleLaporanForm, 'crmSurveyForm': handleCrmSurveyForm, 'konversiForm': handleKonversiForm, 'eventForm': handleEventForm, 'campaignForm': handleCampaignForm };
    for (const formId in forms) { const formElement = document.getElementById(formId); if (formElement) formElement.addEventListener('submit', forms[formId]); }
}

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
