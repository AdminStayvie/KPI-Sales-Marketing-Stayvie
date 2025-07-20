/**
 * @file app.js
 * @description Main application logic for the KPI dashboard.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) { window.location.href = 'index.html'; }
let currentUser = JSON.parse(currentUserJSON);

// =================================================================================
// KONFIGURASI PENTING
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; 

// --- STATE APLIKASI ---
let currentData = {
  leads: [], canvasing: [], promosi: [], doorToDoor: [], quotations: [],
  surveys: [], reports: [], crmSurveys: [], conversions: [], events: [], campaigns: [],
  settings: {}
};
let cutoffPeriods = []; // State untuk menyimpan daftar periode

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
// ... (Semua fungsi handleForm lainnya tetap sama)

// --- FUNGSI UTILITY & MANAJEMEN ---
function toBase64(file) { /* ... */ }
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
function updateDashboard() { /* ... */ }
function updateProgressBar(type, achieved, total) { /* ... */ }
function getFilteredData(dataType, period) {
    let data = currentData[dataType] || [];
    let userSpecificData = currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name);

    if (period && period.start && period.end) {
        userSpecificData = userSpecificData.filter(item => {
            const dateField = item.date || item.visitDate || item.surveyDate || item.eventDate || item.campaignStartDate || (item.timestamp ? item.timestamp.split('T')[0] : null);
            if (!dateField) return false;
            const itemDate = new Date(dateField);
            return itemDate >= period.start && itemDate <= period.end;
        });
    }
    return userSpecificData;
}

// --- LOGIKA FILTER PERIODE BARU ---
function generateCutoffPeriods() {
    const periods = [];
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();

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
        
        const start = new Date(periodStart);
        start.setHours(0,0,0,0);
        const end = new Date(periodEnd);
        end.setHours(23,59,59,999);

        periods.push({ text: periodText, start: start, end: end });
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() - 1);
        periodStart.setMonth(periodStart.getMonth() - 1);
    }
    cutoffPeriods = periods; // Simpan ke state global
}

function populateAllPeriodFilters() {
    const filterSelects = document.querySelectorAll('.period-filter');
    if (filterSelects.length === 0) return;
    
    filterSelects.forEach(select => {
        select.innerHTML = '';
        cutoffPeriods.forEach((period, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = period.text;
            select.appendChild(option);
        });
    });
}

// --- FUNGSI UPDATE SUMMARY (DENGAN LOGIKA FILTER BARU) ---
function createSummaryTable(containerId, dataKey, headers, rowGenerator, filterId) {
    const container = document.getElementById(containerId);
    const filterSelect = document.getElementById(filterId);
    if (!container || !filterSelect) return;

    const selectedIndex = filterSelect.value || 0;
    const selectedPeriod = cutoffPeriods[selectedIndex];
    
    const filteredData = getFilteredData(dataKey, selectedPeriod);

    if (filteredData.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data pada periode ini</div>`;
        return;
    }

    let tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>`;
    filteredData.slice(-10).reverse().forEach(item => { tableHTML += `<tr>${rowGenerator(item)}</tr>`; });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function updateAllSummaries() {
    updateLeadsSummary(); updateCanvasingSummary(); updatePromosiSummary();
    updateDoorToDoorSummary(); updateQuotationsSummary(); updateSurveysSummary();
    updateReportsSummary(); updateCRMSurveysSummary(); updateConversionsSummary();
    updateEventsSummary(); updateCampaignsSummary();
}

function updateLeadsSummary() { createSummaryTable('leadSummary', 'leads', ['Waktu Input', 'Customer', 'Sumber', 'Produk', 'Kontak'], item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.leadSource || ''}</td><td>${item.product || ''}</td><td>${item.contact || ''}</td>`, 'leadsFilter'); }
function updateCanvasingSummary() { createSummaryTable('canvasingSummary', 'canvasing', ['Waktu Input', 'Judul Meeting', 'Tanggal', 'File'], item => `<td>${item.datestamp || ''}</td><td>${item.meetingTitle || ''}</td><td>${item.date ? formatDate(item.date) : ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`, 'canvasingFilter'); }
function updatePromosiSummary() { createSummaryTable('promosiSummary', 'promosi', ['Waktu Input', 'Campaign', 'Platform', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.campaignName || ''}</td><td>${item.platform || ''}</td><td>${item.date ? formatDate(item.date) : ''}</td>`, 'promosiFilter'); }
function updateDoorToDoorSummary() { createSummaryTable('doorToDoorSummary', 'doorToDoor', ['Waktu Input', 'Tanggal Kunjungan', 'Instansi', 'PIC'], item => `<td>${item.datestamp || ''}</td><td>${item.visitDate ? formatDate(item.visitDate) : ''}</td><td>${item.institutionName || ''}</td><td>${item.picName || ''}</td>`, 'doorToDoorFilter'); }
function updateQuotationsSummary() { createSummaryTable('quotationSummary', 'quotations', ['Waktu Input', 'Customer', 'Produk', 'Nominal'], item => `<td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.productType || ''}</td><td>${item.quotationAmount ? formatCurrency(item.quotationAmount) : ''}</td>`, 'quotationsFilter'); }
function updateSurveysSummary() { createSummaryTable('surveySummary', 'surveys', ['Waktu Input', 'Tanggal Survey', 'Customer', 'Asal'], item => `<td>${item.datestamp || ''}</td><td>${item.surveyDate ? formatDate(item.surveyDate) : ''}</td><td>${item.customerName || ''}</td><td>${item.origin || ''}</td>`, 'surveysFilter'); }
function updateReportsSummary() { createSummaryTable('laporanSummary', 'reports', ['Waktu Input', 'Periode', 'File'], item => `<td>${item.datestamp || ''}</td><td>${item.reportPeriod || ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`, 'reportsFilter'); }
function updateCRMSurveysSummary() { createSummaryTable('crmSurveySummary', 'crmSurveys', ['Waktu Input', 'Kompetitor', 'Website'], item => `<td>${item.datestamp || ''}</td><td>${item.competitorName || ''}</td><td>${item.website ? `<a href="${item.website}" target="_blank">Link</a>` : '-'}</td>`, 'crmSurveysFilter'); }
function updateConversionsSummary() { createSummaryTable('konversiSummary', 'conversions', ['Waktu Input', 'Event', 'Client', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.clientName || ''}</td><td>${item.eventDate ? formatDate(item.eventDate) : ''}</td>`, 'conversionsFilter'); }
function updateEventsSummary() { createSummaryTable('eventSummary', 'events', ['Waktu Input', 'Nama Event', 'Jenis', 'Tanggal'], item => `<td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.eventType || ''}</td><td>${item.eventDate ? formatDate(item.eventDate) : ''}</td>`, 'eventsFilter'); }
function updateCampaignsSummary() { createSummaryTable('campaignSummary', 'campaigns', ['Waktu Input', 'Judul', 'Periode', 'Budget'], item => `<td>${item.datestamp || ''}</td><td>${item.campaignTitle || ''}</td><td>${item.campaignStartDate ? formatDate(item.campaignStartDate) : ''} - ${item.campaignEndDate ? formatDate(item.campaignEndDate) : ''}</td><td>${item.budget ? formatCurrency(item.budget) : ''}</td>`, 'campaignsFilter'); }
function updateAdministrasiSummary() { /* ... (Tidak berubah) ... */ }
function updateAdminSettings() { /* ... (Tidak berubah) ... */ }
window.toggleSetting = function(targetId) { /* ... (Tidak berubah) ... */ }

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
    
    generateCutoffPeriods();
    populateAllPeriodFilters();
    
    document.querySelectorAll('.period-filter').forEach(filter => {
        filter.addEventListener('change', updateAllSummaries);
    });

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
