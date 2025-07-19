// KPI Sales & Marketing System JavaScript
// =================================================================================
// KONFIGURASI PENTING
// PASTE URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI SETELAH DEPLOYMENT
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec"; 
// =================================================================================

// Data statis aplikasi (tidak berubah)
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
  ],
  users: [
    {"username": "eka", "password": "eka123", "role": "sales", "name": "Eka"},
    {"username": "saski", "password": "saski123", "role": "sales", "name": "Saski"},
    {"username": "lidya", "password": "lidya123", "role": "sales", "name": "Lidya"},
    {"username": "rizka", "password": "rizka123", "role": "sales", "name": "Rizka"},
    {"username": "admin", "password": "admin123", "role": "management", "name": "Management"}
  ],
  cutoff_times: {
    "daily": "16:00",
    "weekly": "Monday 16:00",
    "monthly": "20th 16:00"
  }
};

// State aplikasi (data dinamis)
let currentUser = null;
let currentData = {
  leads: [], canvasing: [], promosi: [], doorToDoor: [], quotations: [],
  surveys: [], reports: [], crmSurveys: [], conversions: [], events: [], campaigns: [],
  settings: {}
};

// Fungsi untuk mengubah file menjadi Base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Hanya ambil data base64-nya
    reader.onerror = error => reject(error);
  });
}

// Fungsi untuk mengirim data ke Google Apps Script
async function sendData(action, sheetName, data, fileInput, event) {
  const button = event.target.querySelector('button[type="submit"]');
  const originalButtonText = button.innerHTML;
  button.innerHTML = '<span class="loading"></span> Mengirim...';
  button.disabled = true;

  const payload = {
    action: action,
    sheetName: sheetName,
    data: data
  };

  if (fileInput && fileInput.files[0]) {
    const file = fileInput.files[0];
    payload.fileData = await toBase64(file);
    payload.fileName = file.name;
    payload.fileType = file.type;
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === 'success') {
      showMessage('Data berhasil disimpan!', 'success');
      if (!currentData[sheetName.toLowerCase()]) {
        currentData[sheetName.toLowerCase()] = [];
      }
      currentData[sheetName.toLowerCase()].push(result.data);
      
      const updateFunction = window[`update${sheetName}Summary`];
      if (typeof updateFunction === 'function') {
        updateFunction();
      }
      updateDashboard();
      event.target.reset();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error sending data:', error);
    showMessage(`Gagal mengirim data: ${error.message}`, 'error');
  } finally {
    button.innerHTML = originalButtonText;
    button.disabled = false;
  }
}

// Fungsi untuk memuat semua data awal dari Google Sheet
async function loadInitialData() {
    if (SCRIPT_URL === "URL_WEB_APP_APPS_SCRIPT_ANDA") {
        showMessage("PENTING: Konfigurasi URL Google Apps Script di app.js belum diisi!", "error");
        return;
    }
    
    showMessage("Memuat data dari server...", "info");
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            // Pastikan semua array data ada, bahkan jika kosong
            for (const key in currentData) {
                if (key !== 'settings' && result.data[key]) {
                    currentData[key] = result.data[key];
                }
            }
            showMessage("Data berhasil dimuat.", "success");
            updateDashboard();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    }
}

// --- FUNGSI-FUNGSI FORM HANDLER ---
function handleLeadForm(e) {
  e.preventDefault();
  if (!isWithinCutoffTime()) {
    showMessage('Maaf, batas waktu input harian (16:00) sudah terlewati!', 'error');
    return;
  }
  const formData = new FormData(e.target);
  const data = {
    id: Date.now(), sales: currentUser.username, customerName: formData.get('customerName'),
    leadSource: formData.get('leadSource'), product: formData.get('product'),
    contact: formData.get('contact'), notes: formData.get('notes'),
    date: getCurrentDateString(), timestamp: new Date().toISOString()
  };
  sendData('saveData', 'Leads', data, null, e);
}

function handleCanvasingForm(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    id: Date.now(), sales: currentUser.username, meetingTitle: formData.get('meetingTitle'),
    notes: formData.get('notes'), date: getCurrentDateString(), timestamp: new Date().toISOString()
  };
  sendData('saveData', 'Canvasing', data, e.target.querySelector('input[type="file"]'), e);
}

function handlePromosiForm(e) {
    e.preventDefault();
    if (!isWithinCutoffTime()) {
        showMessage('Maaf, batas waktu input harian (16:00) sudah terlewati!', 'error');
        return;
    }
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, campaignName: formData.get('campaignName'),
        platform: formData.get('platform'), date: getCurrentDateString(), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Promosi', data, e.target.querySelector('input[type="file"]'), e);
}

function handleDoorToDoorForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, visitDate: formData.get('visitDate'),
        institutionName: formData.get('institutionName'), address: formData.get('address'),
        picName: formData.get('picName'), picPhone: formData.get('picPhone'),
        response: formData.get('response'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'DoorToDoor', data, e.target.querySelector('input[type="file"]'), e);
}

function handleQuotationForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, customerName: formData.get('customerName'),
        productType: formData.get('productType'), quotationAmount: formData.get('quotationAmount'),
        description: formData.get('description'), date: getCurrentDateString(), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Quotations', data, e.target.querySelector('input[type="file"]'), e);
}

function handleSurveyForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, customerName: formData.get('customerName'),
        gender: formData.get('gender'), phone: formData.get('phone'), surveyDate: formData.get('surveyDate'),
        origin: formData.get('origin'), feedback: formData.get('feedback'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Surveys', data, e.target.querySelector('input[type="file"]'), e);
}

function handleLaporanForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, reportPeriod: formData.get('reportPeriod'),
        managementFeedback: formData.get('managementFeedback'), additionalNotes: formData.get('additionalNotes'),
        timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Reports', data, e.target.querySelector('input[type="file"]'), e);
}

function handleCrmSurveyForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, competitorName: formData.get('competitorName'),
        website: formData.get('website'), product: formData.get('product'),
        priceDetails: formData.get('priceDetails'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'CRMSurveys', data, null, e);
}

function handleKonversiForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, eventName: formData.get('eventName'),
        clientName: formData.get('clientName'), eventDate: formData.get('eventDate'),
        venueType: formData.get('venueType'), barterValue: formData.get('barterValue'),
        barterDescription: formData.get('barterDescription'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Conversions', data, null, e);
}

function handleEventForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, eventName: formData.get('eventName'),
        eventType: formData.get('eventType'), eventDate: formData.get('eventDate'),
        eventLocation: formData.get('eventLocation'), organizer: formData.get('organizer'),
        benefits: formData.get('benefits'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Events', data, e.target.querySelector('input[type="file"]'), e);
}

function handleCampaignForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: Date.now(), sales: currentUser.username, campaignTitle: formData.get('campaignTitle'),
        targetMarket: formData.get('targetMarket'), campaignDate: formData.get('campaignDate'),
        conceptDescription: formData.get('conceptDescription'), potentialConversion: formData.get('potentialConversion'),
        budget: formData.get('budget'), timestamp: new Date().toISOString()
    };
    sendData('saveData', 'Campaigns', data, e.target.querySelector('input[type="file"]'), e);
}

// --- FUNGSI UTILITY & MANAJEMEN ---
function initializeSettings() {
  const allTargets = [...appData.daily_targets, ...appData.weekly_targets, ...appData.monthly_targets];
  allTargets.forEach(target => { currentData.settings[target.id] = true; });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date) {
    if (!(date instanceof Date)) { date = new Date(date); }
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function getCurrentDateString() { return new Date().toISOString().split('T')[0]; }
function isWithinCutoffTime() { return new Date().getHours() < 16; }
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function getMonthStart(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), 1); }

function login(username, password) {
  const user = appData.users.find(u => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    document.body.setAttribute('data-role', user.role);
    return true;
  }
  return false;
}

function logout() {
  currentUser = null;
  document.body.removeAttribute('data-role');
  showPage('loginPage');
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  
  if (pageId === 'mainApp') {
    updateDateTime();
    loadInitialData();
  }
}

function showContentPage(pageId) {
  document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
  loadPageData(pageId);
}

function updateDateTime() {
  const now = new Date();
  const timeString = now.toLocaleString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('currentDateTime').textContent = timeString;
}

// --- FUNGSI DASHBOARD & KALKULASI ---
function updateDashboard() {
    if (!currentUser) return;
    document.getElementById('userDisplayName').textContent = currentUser.name;
    const today = getCurrentDateString();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();
    
    const dailyAchieved = calculateDailyAchievements(today);
    const weeklyAchieved = calculateWeeklyAchievements(weekStart);
    const monthlyAchieved = calculateMonthlyAchievements(monthStart);
    
    const dailyTotal = appData.daily_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    const weeklyTotal = appData.weekly_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    const monthlyTotal = appData.monthly_targets.reduce((sum, t) => currentData.settings[t.id] ? sum + t.target : sum, 0);
    
    updateProgressBar('daily', dailyAchieved, dailyTotal);
    updateProgressBar('weekly', weeklyAchieved, weeklyTotal);
    updateProgressBar('monthly', monthlyAchieved, monthlyTotal);
    updateTargetBreakdown();
}

function updateProgressBar(type, achieved, total) {
  const percentage = total > 0 ? Math.round((achieved / total) * 100) : 0;
  document.getElementById(`${type}Progress`).style.width = `${percentage}%`;
  document.getElementById(`${type}Percentage`).textContent = `${percentage}%`;
  document.getElementById(`${type}Achieved`).textContent = achieved;
  document.getElementById(`${type}Total`).textContent = total;
}

function getFilteredData(dataType) {
    const data = currentData[dataType] || [];
    return currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.username);
}

function calculateDailyAchievements(date) {
    const leadsToday = getFilteredData('leads').filter(l => l.date && l.date.startsWith(date)).length;
    const promosiToday = getFilteredData('promosi').filter(p => p.date && p.date.startsWith(date)).length;
    return leadsToday + promosiToday;
}

function calculateWeeklyAchievements(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const canvasingThisWeek = getFilteredData('canvasing').filter(c => c.date && new Date(c.date) >= weekStart && new Date(c.date) <= weekEnd).length;
    const doorToDoorThisWeek = getFilteredData('doorToDoor').filter(d => d.visitDate && new Date(d.visitDate) >= weekStart && new Date(d.visitDate) <= weekEnd).length;
    return canvasingThisWeek + doorToDoorThisWeek;
}

function calculateMonthlyAchievements(monthStart) {
    const campaignsThisMonth = getFilteredData('campaigns').filter(c => c.campaignDate && new Date(c.campaignDate).getMonth() === monthStart.getMonth()).length;
    const eventsThisMonth = getFilteredData('events').filter(e => e.eventDate && new Date(e.eventDate).getMonth() === monthStart.getMonth()).length;
    return campaignsThisMonth + eventsThisMonth;
}

function updateTargetBreakdown() {
  const container = document.getElementById('targetBreakdown');
  if (!container) return;
  container.innerHTML = '<div class="target-breakdown"></div>'; // Clear
  const breakdownContainer = container.querySelector('.target-breakdown');

  const allTargets = [
    ...appData.daily_targets.map(t => ({...t, type: 'Harian'})),
    ...appData.weekly_targets.map(t => ({...t, type: 'Mingguan'})),
    ...appData.monthly_targets.map(t => ({...t, type: 'Bulanan'}))
  ];
  
  let currentType = '';
  allTargets.forEach(target => {
    if (currentData.settings[target.id]) {
      if(target.type !== currentType) {
          currentType = target.type;
          const h4 = document.createElement('h4');
          h4.textContent = `Target ${currentType}`;
          breakdownContainer.appendChild(h4);
      }
      const achieved = 0; // Simplified for demo
      const status = achieved >= target.target ? 'completed' : 'pending';
      breakdownContainer.innerHTML += `
        <div class="target-item">
          <div class="target-name">${target.name}</div>
          <div class="target-progress">
            <span>${achieved}/${target.target}</span>
            <span class="target-status ${status}">${status === 'completed' ? 'Selesai' : 'Pending'}</span>
          </div>
        </div>`;
    }
  });
}

// --- FUNGSI UPDATE SUMMARY UNTUK SETIAP HALAMAN ---
function createSummaryTable(containerId, data, headers, rowGenerator) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const userSpecificData = currentUser.role === 'management' ? data : data.filter(d => d.sales === currentUser.username);

    if (userSpecificData.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data yang diinput</div>`;
        return;
    }

    let tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>`;
    userSpecificData.slice(-10).reverse().forEach(item => {
        tableHTML += `<tr>${rowGenerator(item)}</tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function updateLeadsSummary() {
    createSummaryTable('leadSummary', currentData.leads, ['Customer', 'Sumber', 'Produk', 'Kontak', 'Waktu'], item => 
        `<td>${item.customerName}</td><td>${item.leadSource}</td><td>${item.product}</td><td>${item.contact}</td>
         <td>${new Date(item.timestamp).toLocaleTimeString('id-ID')}</td>`
    );
}

function updateCanvasingSummary() {
    createSummaryTable('canvasingSummary', currentData.canvasing, ['Judul Meeting', 'Tanggal', 'File', 'Catatan'], item => 
        `<td>${item.meetingTitle}</td><td>${formatDate(item.date)}</td>
         <td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td><td>${item.notes || '-'}</td>`
    );
}

function updatePromosiSummary() {
    createSummaryTable('promosiSummary', currentData.promosi, ['Campaign', 'Platform', 'Tanggal', 'Screenshot'], item => 
        `<td>${item.campaignName}</td><td>${item.platform}</td><td>${formatDate(item.date)}</td>
         <td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateDoorToDoorSummary() {
    createSummaryTable('doorToDoorSummary', currentData.doorToDoor, ['Tanggal', 'Instansi', 'PIC', 'Response', 'Bukti'], item => 
        `<td>${formatDate(item.visitDate)}</td><td>${item.institutionName}</td><td>${item.picName}</td>
         <td>${item.response.substring(0, 30)}...</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateQuotationsSummary() {
    createSummaryTable('quotationSummary', currentData.quotations, ['Customer', 'Produk', 'Nominal', 'Tanggal', 'File'], item => 
        `<td>${item.customerName}</td><td>${item.productType}</td><td>${formatCurrency(item.quotationAmount)}</td>
         <td>${formatDate(item.date)}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateSurveysSummary() {
    createSummaryTable('surveySummary', currentData.surveys, ['Customer', 'Tanggal', 'Asal', 'Feedback', 'Dok.'], item => 
        `<td>${item.customerName}</td><td>${formatDate(item.surveyDate)}</td><td>${item.origin}</td>
         <td>${item.feedback.substring(0, 30)}...</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateReportsSummary() {
    createSummaryTable('laporanSummary', currentData.reports, ['Periode', 'File', 'Feedback', 'Upload'], item => 
        `<td>${item.reportPeriod}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>
         <td>${(item.managementFeedback || '-').substring(0, 30)}...</td><td>${formatDate(item.timestamp)}</td>`
    );
}

function updateCRMSurveysSummary() {
    createSummaryTable('crmSurveySummary', currentData.crmSurveys, ['Kompetitor', 'Website', 'Produk', 'Harga', 'Tanggal'], item => 
        `<td>${item.competitorName}</td><td>${item.website ? `<a href="${item.website}" target="_blank">Link</a>` : '-'}</td>
         <td>${item.product.substring(0, 20)}...</td><td>${item.priceDetails.substring(0, 20)}...</td><td>${formatDate(item.timestamp)}</td>`
    );
}

function updateConversionsSummary() {
    createSummaryTable('konversiSummary', currentData.conversions, ['Event', 'Client', 'Venue', 'Nilai Barter', 'Tanggal'], item => 
        `<td>${item.eventName}</td><td>${item.clientName}</td><td>${item.venueType}</td>
         <td>${formatCurrency(item.barterValue)}</td><td>${formatDate(item.eventDate)}</td>`
    );
}

function updateEventsSummary() {
    createSummaryTable('eventSummary', currentData.events, ['Event', 'Jenis', 'Tanggal', 'Lokasi', 'Dok.'], item => 
        `<td>${item.eventName}</td><td>${item.eventType}</td><td>${formatDate(item.eventDate)}</td>
         <td>${item.eventLocation}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateCampaignsSummary() {
    createSummaryTable('campaignSummary', currentData.campaigns, ['Campaign', 'Target', 'Tanggal', 'Budget', 'Materi'], item => 
        `<td>${item.campaignTitle}</td><td>${item.targetMarket}</td><td>${formatDate(item.campaignDate)}</td>
         <td>${formatCurrency(item.budget)}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>`
    );
}

function updateAdministrasiSummary() {
    if (currentUser && currentUser.role === 'management') {
        updateAdminSettings();
    }
}

function updateAdminSettings() {
  const container = document.getElementById('adminSettings');
  if (!container) return;
  
  let html = '<div class="admin-settings-grid">';
  const allTargets = [...appData.daily_targets, ...appData.weekly_targets, ...appData.monthly_targets];
  
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
  updateDashboard();
  // Di aplikasi nyata, Anda akan mengirim perubahan ini ke server untuk disimpan.
  showMessage('Pengaturan disimpan (hanya di sesi ini).', 'info');
}

// --- EVENT LISTENERS & INISIALISASI ---
function showMessage(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `message ${type}`;
  notification.textContent = message;
  const mainContent = document.querySelector('.main-content');
  mainContent.insertBefore(notification, mainContent.firstChild);
  setTimeout(() => { notification.remove(); }, 4000);
}

function loadPageData(pageId) {
    const functionName = `update${pageId.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Summary`;
    if (typeof window[functionName] === 'function') {
        window[functionName]();
    }
    if (pageId === 'crm-survey') {
        const salesNameField = document.querySelector('#crm-survey input[name="salesName"]');
        if (salesNameField && currentUser) salesNameField.value = currentUser.name;
    }
}

document.addEventListener('DOMContentLoaded', function() {
  initializeSettings();
  
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (login(username, password)) {
      showPage('mainApp');
    } else {
      showMessage('Username atau password salah!', 'error');
    }
  });
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      showContentPage(this.getAttribute('data-page'));
    });
  });
  
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
      if (formElement) {
          formElement.addEventListener('submit', forms[formId]);
      }
  }

  document.getElementById('filterDate').value = getCurrentDateString();
  setInterval(updateDateTime, 60000);
  checkCutoffWarnings();
});

function checkCutoffWarnings() {
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour >= 15 && currentHour < 16) {
    setTimeout(() => {
      showMessage('Peringatan: Batas waktu input target harian adalah pukul 16:00!', 'warning');
    }, 1000);
  }
}
