// KPI Sales & Marketing System JavaScript

// Application data and state
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

// Application state
let currentUser = null;
let currentData = {
  leads: [],
  canvasing: [],
  promosi: [],
  doorToDoor: [],
  quotations: [],
  surveys: [],
  reports: [],
  crmSurveys: [],
  conversions: [],
  events: [],
  campaigns: [],
  settings: {}
};

// Initialize all target settings as active by default
function initializeSettings() {
  const allTargets = [...appData.daily_targets, ...appData.weekly_targets, ...appData.monthly_targets];
  allTargets.forEach(target => {
    currentData.settings[target.id] = true;
  });
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

function isWithinCutoffTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  const cutoffTime = 16 * 60; // 16:00 in minutes
  
  return currentTime <= cutoffTime;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Authentication
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

// Page management
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });
  
  // Show target page
  document.getElementById(pageId).classList.remove('hidden');
  
  if (pageId === 'mainApp') {
    updateDateTime();
    updateDashboard();
  }
}

function showContentPage(pageId) {
  // Hide all content pages
  document.querySelectorAll('.content-page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show target content page
  document.getElementById(pageId).classList.add('active');
  
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
  
  // Load page-specific data
  loadPageData(pageId);
}

// Dashboard functions
function updateDateTime() {
  const now = new Date();
  const timeString = now.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById('currentDateTime').textContent = timeString;
}

function updateDashboard() {
  if (!currentUser) return;
  
  document.getElementById('userDisplayName').textContent = currentUser.name;
  
  const today = getCurrentDateString();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  
  // Calculate achievements
  const dailyAchieved = calculateDailyAchievements(today);
  const weeklyAchieved = calculateWeeklyAchievements(weekStart);
  const monthlyAchieved = calculateMonthlyAchievements(monthStart);
  
  // Calculate totals
  const dailyTotal = appData.daily_targets.reduce((sum, target) => 
    currentData.settings[target.id] ? sum + target.target : sum, 0);
  const weeklyTotal = appData.weekly_targets.reduce((sum, target) => 
    currentData.settings[target.id] ? sum + target.target : sum, 0);
  const monthlyTotal = appData.monthly_targets.reduce((sum, target) => 
    currentData.settings[target.id] ? sum + target.target : sum, 0);
  
  // Update progress bars
  updateProgressBar('daily', dailyAchieved, dailyTotal);
  updateProgressBar('weekly', weeklyAchieved, weeklyTotal);
  updateProgressBar('monthly', monthlyAchieved, monthlyTotal);
  
  // Calculate penalties
  const totalPenalty = calculateTotalPenalties();
  document.getElementById('totalPenalty').textContent = formatCurrency(totalPenalty);
  
  // Update target breakdown
  updateTargetBreakdown();
}

function updateProgressBar(type, achieved, total) {
  const percentage = total > 0 ? Math.round((achieved / total) * 100) : 0;
  
  document.getElementById(`${type}Progress`).style.width = `${percentage}%`;
  document.getElementById(`${type}Percentage`).textContent = `${percentage}%`;
  document.getElementById(`${type}Achieved`).textContent = achieved;
  document.getElementById(`${type}Total`).textContent = total;
}

function calculateDailyAchievements(date) {
  const userLeads = currentUser.role === 'management' ? 
    currentData.leads : 
    currentData.leads.filter(l => l.sales === currentUser.username);
  
  const userPromosi = currentUser.role === 'management' ? 
    currentData.promosi : 
    currentData.promosi.filter(p => p.sales === currentUser.username);
  
  const leadsToday = userLeads.filter(l => l.date === date).length;
  const promosiToday = userPromosi.filter(p => p.date === date).length;
  
  return leadsToday + promosiToday;
}

function calculateWeeklyAchievements(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const userCanvasing = currentUser.role === 'management' ? 
    currentData.canvasing : 
    currentData.canvasing.filter(c => c.sales === currentUser.username);
  
  const userDoorToDoor = currentUser.role === 'management' ? 
    currentData.doorToDoor : 
    currentData.doorToDoor.filter(d => d.sales === currentUser.username);
  
  const canvasingThisWeek = userCanvasing.filter(c => {
    const date = new Date(c.date);
    return date >= weekStart && date <= weekEnd;
  }).length;
  
  const doorToDoorThisWeek = userDoorToDoor.filter(d => {
    const date = new Date(d.visitDate);
    return date >= weekStart && date <= weekEnd;
  }).length;
  
  return canvasingThisWeek + doorToDoorThisWeek;
}

function calculateMonthlyAchievements(monthStart) {
  const userCampaigns = currentUser.role === 'management' ? 
    currentData.campaigns : 
    currentData.campaigns.filter(c => c.sales === currentUser.username);
  
  const userEvents = currentUser.role === 'management' ? 
    currentData.events : 
    currentData.events.filter(e => e.sales === currentUser.username);
  
  const campaignsThisMonth = userCampaigns.filter(c => {
    const date = new Date(c.campaignDate);
    return date.getMonth() === monthStart.getMonth() && 
           date.getFullYear() === monthStart.getFullYear();
  }).length;
  
  const eventsThisMonth = userEvents.filter(e => {
    const date = new Date(e.eventDate);
    return date.getMonth() === monthStart.getMonth() && 
           date.getFullYear() === monthStart.getFullYear();
  }).length;
  
  return campaignsThisMonth + eventsThisMonth;
}

function calculateTotalPenalties() {
  // This is a simplified calculation
  // In a real system, this would be more complex based on actual missed targets
  return 0; // No penalties calculated for demo
}

function updateTargetBreakdown() {
  const container = document.getElementById('targetBreakdown');
  if (!container) return;
  
  let html = '<div class="target-breakdown">';
  
  // Daily targets
  html += '<h4>Target Harian</h4>';
  appData.daily_targets.forEach(target => {
    if (currentData.settings[target.id]) {
      const achieved = 0; // Simplified for demo
      const status = achieved >= target.target ? 'completed' : 'pending';
      html += `
        <div class="target-item">
          <div class="target-name">${target.name}</div>
          <div class="target-progress">
            <span>${achieved}/${target.target}</span>
            <span class="target-status ${status}">
              ${status === 'completed' ? 'Selesai' : 'Pending'}
            </span>
          </div>
        </div>
      `;
    }
  });
  
  // Weekly targets
  html += '<h4>Target Mingguan</h4>';
  appData.weekly_targets.forEach(target => {
    if (currentData.settings[target.id]) {
      const achieved = 0; // Simplified for demo
      const status = achieved >= target.target ? 'completed' : 'pending';
      html += `
        <div class="target-item">
          <div class="target-name">${target.name}</div>
          <div class="target-progress">
            <span>${achieved}/${target.target}</span>
            <span class="target-status ${status}">
              ${status === 'completed' ? 'Selesai' : 'Pending'}
            </span>
          </div>
        </div>
      `;
    }
  });
  
  // Monthly targets
  html += '<h4>Target Bulanan</h4>';
  appData.monthly_targets.forEach(target => {
    if (currentData.settings[target.id]) {
      const achieved = 0; // Simplified for demo
      const status = achieved >= target.target ? 'completed' : 'pending';
      html += `
        <div class="target-item">
          <div class="target-name">${target.name}</div>
          <div class="target-progress">
            <span>${achieved}/${target.target}</span>
            <span class="target-status ${status}">
              ${status === 'completed' ? 'Selesai' : 'Pending'}
            </span>
          </div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Form handlers
function handleLeadForm(formData) {
  const lead = {
    id: Date.now(),
    sales: currentUser.username,
    customerName: formData.get('customerName'),
    leadSource: formData.get('leadSource'),
    product: formData.get('product'),
    contact: formData.get('contact'),
    notes: formData.get('notes'),
    date: getCurrentDateString(),
    timestamp: new Date().toISOString()
  };
  
  currentData.leads.push(lead);
  showMessage('Lead berhasil ditambahkan!', 'success');
  updateLeadSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('leadForm').reset();
}

function handleCanvasingForm(formData) {
  const canvasing = {
    id: Date.now(),
    sales: currentUser.username,
    meetingTitle: formData.get('meetingTitle'),
    notes: formData.get('notes'),
    date: getCurrentDateString(),
    timestamp: new Date().toISOString(),
    fileName: formData.get('document') ? formData.get('document').name : null
  };
  
  currentData.canvasing.push(canvasing);
  showMessage('Upload canvasing berhasil!', 'success');
  updateCanvasingSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('canvasingForm').reset();
}

function handlePromosiForm(formData) {
  const promosi = {
    id: Date.now(),
    sales: currentUser.username,
    campaignName: formData.get('campaignName'),
    platform: formData.get('platform'),
    date: getCurrentDateString(),
    timestamp: new Date().toISOString(),
    fileName: formData.get('screenshot') ? formData.get('screenshot').name : null
  };
  
  currentData.promosi.push(promosi);
  showMessage('Upload promosi berhasil!', 'success');
  updatePromosiSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('promosiForm').reset();
}

function handleDoorToDoorForm(formData) {
  const doorToDoor = {
    id: Date.now(),
    sales: currentUser.username,
    visitDate: formData.get('visitDate'),
    institutionName: formData.get('institutionName'),
    address: formData.get('address'),
    picName: formData.get('picName'),
    picPhone: formData.get('picPhone'),
    response: formData.get('response'),
    timestamp: new Date().toISOString(),
    fileName: formData.get('proof') ? formData.get('proof').name : null
  };
  
  currentData.doorToDoor.push(doorToDoor);
  showMessage('Data door-to-door berhasil disimpan!', 'success');
  updateDoorToDoorSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('doorToDoorForm').reset();
}

function handleQuotationForm(formData) {
  const quotation = {
    id: Date.now(),
    sales: currentUser.username,
    customerName: formData.get('customerName'),
    productType: formData.get('productType'),
    quotationAmount: formData.get('quotationAmount'),
    description: formData.get('description'),
    date: getCurrentDateString(),
    timestamp: new Date().toISOString(),
    fileName: formData.get('quotationDoc') ? formData.get('quotationDoc').name : null
  };
  
  currentData.quotations.push(quotation);
  showMessage('Quotation berhasil disimpan!', 'success');
  updateQuotationSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('quotationForm').reset();
}

function handleSurveyForm(formData) {
  const survey = {
    id: Date.now(),
    sales: currentUser.username,
    customerName: formData.get('customerName'),
    gender: formData.get('gender'),
    phone: formData.get('phone'),
    surveyDate: formData.get('surveyDate'),
    origin: formData.get('origin'),
    feedback: formData.get('feedback'),
    timestamp: new Date().toISOString(),
    fileName: formData.get('documentation') ? formData.get('documentation').name : null
  };
  
  currentData.surveys.push(survey);
  showMessage('Survey berhasil disimpan!', 'success');
  updateSurveySummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('surveyForm').reset();
}

function handleLaporanForm(formData) {
  const laporan = {
    id: Date.now(),
    sales: currentUser.username,
    reportPeriod: formData.get('reportPeriod'),
    managementFeedback: formData.get('managementFeedback'),
    additionalNotes: formData.get('additionalNotes'),
    timestamp: new Date().toISOString(),
    fileName: formData.get('reportDoc') ? formData.get('reportDoc').name : null
  };
  
  currentData.reports.push(laporan);
  showMessage('Laporan berhasil diupload!', 'success');
  updateLaporanSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('laporanForm').reset();
}

function handleCrmSurveyForm(formData) {
  const crmSurvey = {
    id: Date.now(),
    sales: currentUser.username,
    competitorName: formData.get('competitorName'),
    website: formData.get('website'),
    product: formData.get('product'),
    priceDetails: formData.get('priceDetails'),
    timestamp: new Date().toISOString()
  };
  
  currentData.crmSurveys.push(crmSurvey);
  showMessage('Survey kompetitor berhasil disimpan!', 'success');
  updateCrmSurveySummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('crmSurveyForm').reset();
}

function handleKonversiForm(formData) {
  const konversi = {
    id: Date.now(),
    sales: currentUser.username,
    eventName: formData.get('eventName'),
    clientName: formData.get('clientName'),
    eventDate: formData.get('eventDate'),
    venueType: formData.get('venueType'),
    barterValue: formData.get('barterValue'),
    barterDescription: formData.get('barterDescription'),
    timestamp: new Date().toISOString()
  };
  
  currentData.conversions.push(konversi);
  showMessage('Data konversi venue berhasil disimpan!', 'success');
  updateKonversiSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('konversiForm').reset();
}

function handleEventForm(formData) {
  const event = {
    id: Date.now(),
    sales: currentUser.username,
    eventName: formData.get('eventName'),
    eventType: formData.get('eventType'),
    eventDate: formData.get('eventDate'),
    eventLocation: formData.get('eventLocation'),
    organizer: formData.get('organizer'),
    benefits: formData.get('benefits'),
    timestamp: new Date().toISOString(),
    fileName: formData.get('documentation') ? formData.get('documentation').name : null
  };
  
  currentData.events.push(event);
  showMessage('Data event berhasil disimpan!', 'success');
  updateEventSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('eventForm').reset();
}

function handleCampaignForm(formData) {
  const campaign = {
    id: Date.now(),
    sales: currentUser.username,
    campaignTitle: formData.get('campaignTitle'),
    targetMarket: formData.get('targetMarket'),
    campaignDate: formData.get('campaignDate'),
    conceptDescription: formData.get('conceptDescription'),
    potentialConversion: formData.get('potentialConversion'),
    budget: formData.get('budget'),
    timestamp: new Date().toISOString(),
    fileName: formData.get('campaignMaterial') ? formData.get('campaignMaterial').name : null
  };
  
  currentData.campaigns.push(campaign);
  showMessage('Campaign berhasil dilaunch!', 'success');
  updateCampaignSummary();
  updateDashboard();
  
  // Reset form
  document.getElementById('campaignForm').reset();
}

// Summary update functions
function updateLeadSummary() {
  const container = document.getElementById('leadSummary');
  if (!container) return;
  
  const userLeads = currentData.leads.filter(l => l.sales === currentUser.username);
  const todayLeads = userLeads.filter(l => l.date === getCurrentDateString());
  
  if (todayLeads.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada lead yang diinput hari ini</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Sumber</th>
          <th>Produk</th>
          <th>Kontak</th>
          <th>Waktu</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  todayLeads.forEach(lead => {
    html += `
      <tr>
        <td>${lead.customerName}</td>
        <td>${lead.leadSource}</td>
        <td>${lead.product}</td>
        <td>${lead.contact}</td>
        <td>${new Date(lead.timestamp).toLocaleTimeString('id-ID')}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateCanvasingSummary() {
  const container = document.getElementById('canvasingSummary');
  if (!container) return;
  
  const userCanvasing = currentData.canvasing.filter(c => c.sales === currentUser.username);
  
  if (userCanvasing.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada upload canvasing</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Judul Meeting</th>
          <th>Tanggal</th>
          <th>File</th>
          <th>Catatan</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userCanvasing.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.meetingTitle}</td>
        <td>${formatDate(new Date(item.date))}</td>
        <td>${item.fileName || 'Tidak ada file'}</td>
        <td>${item.notes || '-'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updatePromosiSummary() {
  const container = document.getElementById('promosiSummary');
  if (!container) return;
  
  const userPromosi = currentData.promosi.filter(p => p.sales === currentUser.username);
  
  if (userPromosi.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada upload promosi</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Platform</th>
          <th>Tanggal</th>
          <th>Screenshot</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userPromosi.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.campaignName}</td>
        <td>${item.platform}</td>
        <td>${formatDate(new Date(item.date))}</td>
        <td>${item.fileName || 'Tidak ada file'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateDoorToDoorSummary() {
  const container = document.getElementById('doorToDoorSummary');
  if (!container) return;
  
  const userDoorToDoor = currentData.doorToDoor.filter(d => d.sales === currentUser.username);
  
  if (userDoorToDoor.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada data door-to-door</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Instansi</th>
          <th>PIC</th>
          <th>Response</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userDoorToDoor.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${formatDate(new Date(item.visitDate))}</td>
        <td>${item.institutionName}</td>
        <td>${item.picName}</td>
        <td>${item.response.substring(0, 50)}...</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateQuotationSummary() {
  const container = document.getElementById('quotationSummary');
  if (!container) return;
  
  const userQuotations = currentData.quotations.filter(q => q.sales === currentUser.username);
  
  if (userQuotations.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada quotation</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Produk</th>
          <th>Nominal</th>
          <th>Tanggal</th>
          <th>File</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userQuotations.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.customerName}</td>
        <td>${item.productType}</td>
        <td>${formatCurrency(item.quotationAmount)}</td>
        <td>${formatDate(new Date(item.date))}</td>
        <td>${item.fileName || 'Tidak ada file'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateSurveySummary() {
  const container = document.getElementById('surveySummary');
  if (!container) return;
  
  const userSurveys = currentData.surveys.filter(s => s.sales === currentUser.username);
  
  if (userSurveys.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada survey</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Gender</th>
          <th>Tanggal</th>
          <th>Asal</th>
          <th>Feedback</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userSurveys.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.customerName}</td>
        <td>${item.gender}</td>
        <td>${formatDate(new Date(item.surveyDate))}</td>
        <td>${item.origin}</td>
        <td>${item.feedback.substring(0, 50)}...</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateLaporanSummary() {
  const container = document.getElementById('laporanSummary');
  if (!container) return;
  
  const userReports = currentData.reports.filter(r => r.sales === currentUser.username);
  
  if (userReports.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada laporan mingguan</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Periode</th>
          <th>File</th>
          <th>Feedback Management</th>
          <th>Upload</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userReports.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.reportPeriod}</td>
        <td>${item.fileName || 'Tidak ada file'}</td>
        <td>${item.managementFeedback ? item.managementFeedback.substring(0, 50) + '...' : '-'}</td>
        <td>${formatDate(new Date(item.timestamp))}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateCrmSurveySummary() {
  const container = document.getElementById('crmSurveySummary');
  if (!container) return;
  
  const userCrmSurveys = currentData.crmSurveys.filter(c => c.sales === currentUser.username);
  
  if (userCrmSurveys.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada survey kompetitor</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Kompetitor</th>
          <th>Website</th>
          <th>Produk</th>
          <th>Harga</th>
          <th>Tanggal</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userCrmSurveys.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.competitorName}</td>
        <td>${item.website || '-'}</td>
        <td>${item.product.substring(0, 50)}...</td>
        <td>${item.priceDetails.substring(0, 50)}...</td>
        <td>${formatDate(new Date(item.timestamp))}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateKonversiSummary() {
  const container = document.getElementById('konversiSummary');
  if (!container) return;
  
  const userConversions = currentData.conversions.filter(c => c.sales === currentUser.username);
  
  if (userConversions.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada konversi venue</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Client</th>
          <th>Venue</th>
          <th>Nilai Barter</th>
          <th>Tanggal</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userConversions.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.eventName}</td>
        <td>${item.clientName}</td>
        <td>${item.venueType}</td>
        <td>${formatCurrency(item.barterValue)}</td>
        <td>${formatDate(new Date(item.eventDate))}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateEventSummary() {
  const container = document.getElementById('eventSummary');
  if (!container) return;
  
  const userEvents = currentData.events.filter(e => e.sales === currentUser.username);
  
  if (userEvents.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada data event</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th>Jenis</th>
          <th>Tanggal</th>
          <th>Lokasi</th>
          <th>Penyelenggara</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userEvents.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.eventName}</td>
        <td>${item.eventType}</td>
        <td>${formatDate(new Date(item.eventDate))}</td>
        <td>${item.eventLocation}</td>
        <td>${item.organizer}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function updateCampaignSummary() {
  const container = document.getElementById('campaignSummary');
  if (!container) return;
  
  const userCampaigns = currentData.campaigns.filter(c => c.sales === currentUser.username);
  
  if (userCampaigns.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada campaign</div>';
    return;
  }
  
  let html = `
    <table>
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Target Market</th>
          <th>Tanggal</th>
          <th>Budget</th>
          <th>Material</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  userCampaigns.slice(-10).forEach(item => {
    html += `
      <tr>
        <td>${item.campaignTitle}</td>
        <td>${item.targetMarket}</td>
        <td>${formatDate(new Date(item.campaignDate))}</td>
        <td>${formatCurrency(item.budget)}</td>
        <td>${item.fileName || 'Tidak ada file'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Administration functions
function updateAdminSettings() {
  const container = document.getElementById('adminSettings');
  if (!container) return;
  
  let html = '<div class="admin-settings-grid">';
  
  const allTargets = [
    ...appData.daily_targets.map(t => ({...t, type: 'Harian'})),
    ...appData.weekly_targets.map(t => ({...t, type: 'Mingguan'})),
    ...appData.monthly_targets.map(t => ({...t, type: 'Bulanan'}))
  ];
  
  allTargets.forEach(target => {
    const isActive = currentData.settings[target.id];
    html += `
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-name">${target.name}</div>
          <div class="setting-description">${target.type} - Target: ${target.target} - Denda: ${formatCurrency(target.penalty)}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSetting(${target.id})">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function toggleSetting(targetId) {
  currentData.settings[targetId] = !currentData.settings[targetId];
  updateDashboard();
}

// Page data loading
function loadPageData(pageId) {
  switch(pageId) {
    case 'input-lead':
      updateLeadSummary();
      break;
    case 'upload-canvasing':
      updateCanvasingSummary();
      break;
    case 'upload-promosi':
      updatePromosiSummary();
      break;
    case 'door-to-door':
      updateDoorToDoorSummary();
      break;
    case 'quotation':
      updateQuotationSummary();
      break;
    case 'survey-coliving':
      updateSurveySummary();
      break;
    case 'laporan-mingguan':
      updateLaporanSummary();
      break;
    case 'crm-survey':
      updateCrmSurveySummary();
      // Auto-fill sales name
      const salesNameField = document.querySelector('input[name="salesName"]');
      if (salesNameField && currentUser) {
        salesNameField.value = currentUser.name;
      }
      break;
    case 'konversi-venue':
      updateKonversiSummary();
      break;
    case 'event-networking':
      updateEventSummary();
      break;
    case 'launch-campaign':
      updateCampaignSummary();
      break;
    case 'administrasi':
      if (currentUser && currentUser.role === 'management') {
        updateAdminSettings();
      }
      break;
  }
}

// Utility functions
function showMessage(message, type = 'info') {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.className = `message ${type}`;
  notification.textContent = message;
  
  // Insert at the top of the main content
  const mainContent = document.querySelector('.main-content');
  mainContent.insertBefore(notification, mainContent.firstChild);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize settings
  initializeSettings();
  
  // Login form handler
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (login(username, password)) {
      showPage('mainApp');
      showContentPage('dashboard');
    } else {
      showMessage('Username atau password salah!', 'error');
    }
  });
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const pageId = this.getAttribute('data-page');
      if (pageId) {
        showContentPage(pageId);
      }
    });
  });
  
  // Form handlers - existing ones
  document.getElementById('leadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!isWithinCutoffTime()) {
      showMessage('Maaf, batas waktu input harian (16:00) sudah terlewati!', 'error');
      return;
    }
    handleLeadForm(new FormData(this));
  });
  
  document.getElementById('canvasingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleCanvasingForm(new FormData(this));
  });
  
  document.getElementById('promosiForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!isWithinCutoffTime()) {
      showMessage('Maaf, batas waktu input harian (16:00) sudah terlewati!', 'error');
      return;
    }
    handlePromosiForm(new FormData(this));
  });
  
  document.getElementById('doorToDoorForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleDoorToDoorForm(new FormData(this));
  });
  
  // New form handlers
  document.getElementById('quotationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleQuotationForm(new FormData(this));
  });
  
  document.getElementById('surveyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleSurveyForm(new FormData(this));
  });
  
  document.getElementById('laporanForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleLaporanForm(new FormData(this));
  });
  
  document.getElementById('crmSurveyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleCrmSurveyForm(new FormData(this));
  });
  
  document.getElementById('konversiForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleKonversiForm(new FormData(this));
  });
  
  document.getElementById('eventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleEventForm(new FormData(this));
  });
  
  document.getElementById('campaignForm').addEventListener('submit', function(e) {
    e.preventDefault();
    handleCampaignForm(new FormData(this));
  });
  
  // Date filter
  document.getElementById('filterBtn').addEventListener('click', function() {
    const selectedDate = document.getElementById('filterDate').value;
    if (selectedDate) {
      // In a real application, this would filter the dashboard data
      showMessage(`Filter diterapkan untuk tanggal ${formatDate(new Date(selectedDate))}`, 'info');
    }
  });
  
  // Set default date to today
  document.getElementById('filterDate').value = getCurrentDateString();
  
  // Update date time every minute
  setInterval(updateDateTime, 60000);
  
  // Check for cutoff warnings
  checkCutoffWarnings();
});

// Global functions for HTML event handlers
window.toggleSetting = toggleSetting;

function checkCutoffWarnings() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Show warning if approaching cutoff time (after 15:00)
  if (currentHour >= 15 && currentHour < 16) {
    setTimeout(() => {
      showMessage('Peringatan: Batas waktu input target harian adalah pukul 16:00!', 'warning');
    }, 1000);
  }
}