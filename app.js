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
            // --- PERBAIKAN DI SINI ---
            // Langsung salin data menggunakan kunci yang sama dari server
            for (const key in result.data) {
                if (currentData.hasOwnProperty(key)) {
                    currentData[key] = result.data[key];
                }
            }
            // --- AKHIR PERBAIKAN ---

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

// --- FUNGSI-FUNGSI FORM HANDLER ---
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

// --- LOGIKA KALKULASI & UPDATE UI ---
function getFilteredData(dataType) { const data = currentData[dataType] || []; return currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.name); }

function calculateAchievementForTarget(targetId) {
    const today = getCurrentDateString();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    switch(targetId) {
        case 1: return getFilteredData('leads').filter(d => d.date && d.date.startsWith(today)).length;
        case 2: return 0;
        case 3: return getFilteredData('promosi').filter(d => d.date && d.date.startsWith(today)).length;
        case 4: return getFilteredData('canvasing').filter(d => d.date && new Date(d.date) >= weekStart).length;
        case 5: return getFilteredData('doorToDoor').filter(d => d.visitDate && new Date(d.visitDate) >= weekStart).length;
        case 6: return getFilteredData('quotations').filter(d => d.date && new Date(d.date) >= weekStart).length;
        case 7: return getFilteredData('surveys').filter(d => d.surveyDate && new Date(d.surveyDate) >= weekStart).length;
        case 8: return getFilteredData('reports').filter(d => d.timestamp && new Date(d.timestamp) >= weekStart).length;
        case 9: return getFilteredData('crmSurveys').filter(d => d.timestamp && new Date(d.timestamp) >= weekStart).length;
        case 10: return getFilteredData('conversions').filter(d => d.eventDate && new Date(d.eventDate) >= weekStart).length;
        case 11: return 0;
        case 12: return 0;
        case 13: return getFilteredData('events').filter(d => d.eventDate && new Date(d.eventDate) >= monthStart).length;
        case 14: return getFilteredData('campaigns').filter(d => d.campaignStartDate && new Date(d.campaignStartDate) >= monthStart).length;
        default: return 0;
    }
}

function calculateDailyAchievements() { return appData.daily_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0); }
function calculateWeeklyAchievements() { return appData.weekly_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0); }
function calculateMonthlyAchievements() { return appData.monthly_targets.reduce((total, target) => total + calculateAchievementForTarget(target.id), 0); }

function updateTargetBreakdown() {
    const container = document.getElementById('targetBreakdown');
    if (!container) return;
    container.innerHTML = '';
    const allTargets = [ ...appData.daily_targets.map(t => ({ ...t, type: 'Harian' })), ...appData.weekly_targets.map(t => ({ ...t, type: 'Mingguan' })), ...appData.monthly_targets.map(t => ({ ...t, type: 'Bulanan' })) ];
    let currentType = '';
    allTargets.forEach(target => {
        if (currentData.settings[target.id]) {
            if (target.type !== currentType) {
                currentType = target.type;
                const h4 = document.createElement('h4');
                h4.textContent = `Target ${currentType}`;
                container.appendChild(h4);
            }
            const achieved = calculateAchievementForTarget(target.id);
            const status = achieved >= target.target ? 'completed' : 'pending';
            const item = document.createElement('div');
            item.className = 'target-item';
            item.innerHTML = `<div class="target-name">${target.name}</div><div class="target-progress"><span>${achieved}/${target.target}</span><span class="target-status ${status}">${status === 'completed' ? 'Selesai' : 'Pending'}</span></div>`;
            container.appendChild(item);
        }
    });
}

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
function updateAdminSettings() { const container = document.getElementById('adminSettings'); if (!container) return; let html = '<div class="admin-settings-grid">'; const allTargets = [...appData.daily_targets, ...appData.weekly_targets, ...appData.monthly_targets]; allTargets.forEach(target => { const isActive = currentData.settings[target.id]; html += `<div class="setting-item"><div class="setting-info"><div class="setting-name">${target.name}</div><div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div></div><label class="toggle-switch"><input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSetting(${target.id})"><span class="toggle-slider"></span></label></div>`; }); html += '</div>'; container.innerHTML = html; }
window.toggleSetting = function(targetId) { currentData.settings[targetId] = !currentData.settings[targetId]; updateDashboard(); showMessage('Pengaturan disimpan (hanya di sesi ini).', 'info'); }

// --- EVENT LISTENERS & INISIALISASI ---
function showMessage(message, type = 'info') { const notification = document.createElement('div'); notification.className = `message ${type}`; notification.textContent = message; const mainContent = document.querySelector('.main-content'); if(mainContent) { mainContent.insertBefore(notification, mainContent.firstChild); setTimeout(() => { notification.remove(); }, 4000); } }
function setupFormListeners() {
    const forms = {
        'leadForm': handleLeadForm, 'canvasingForm': handleCanvasingForm,
        'promosiForm': handlePromosiForm, 'doorToDoorForm': handleDoorToDoorForm,
        'quotationForm': handleQuotationForm, 'surveyForm': handleSurveyForm,
        'laporanForm': handleLaporanForm, 'crmSurveyForm': handleCrmSurveyForm,
        'konversiForm': handleKonversiForm, 'eventForm': handleEventForm,
        'campaignForm': handleCampaignForm
    };
    for (const formId in forms) {
        const formElement = document.getElementById(formId);
        if (formElement) formElement.addEventListener('submit', forms[formId]);
    }
}

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
