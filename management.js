/**
 * @file management.js
 * @description Logika untuk halaman dashboard manajemen.
 * @version 6.5.0 - [FEAT] Mengubah proses validasi agar tidak me-refresh halaman secara otomatis.
 */

const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) { window.location.href = 'index.html'; }
const currentUser = JSON.parse(currentUserJSON);
if (currentUser.role !== 'management') { alert('Akses ditolak. Halaman ini hanya untuk manajemen.'); window.location.href = 'dashboard.html'; }

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

const CONFIG = {
    dataMapping: {
        'Leads': { dataKey: 'leads', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Prospects': { dataKey: 'prospects', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'B2BBookings': { dataKey: 'b2bBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'VenueBookings': { dataKey: 'venueBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Deal Lainnya': { dataKey: 'dealLainnya', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Canvasing': { dataKey: 'canvasing', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Promosi': { dataKey: 'promosi', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' }},
        'DoorToDoor': { dataKey: 'doorToDoor', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Quotations': { dataKey: 'quotations', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Surveys': { dataKey: 'surveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Reports': { dataKey: 'reports', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'CRMSurveys': { dataKey: 'crmSurveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Conversions': { dataKey: 'conversions', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Events': { dataKey: 'events', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Campaigns': { dataKey: 'campaigns', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
    }
};

const TARGET_CONFIG = {
    daily: [
        { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads' },
        { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'prospects' },
        { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'promosi' }
    ],
    weekly: [
        { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'canvasing' },
        { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'doorToDoor' },
        { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'quotations' },
        { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'surveys' },
        { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'reports' },
        { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'crmSurveys' },
        { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'conversions' }
    ],
    monthly: [
        { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'b2bBookings' },
        { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'venueBookings' },
        { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'events' },
        { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'campaigns' }
    ]
};
const ALL_DATA_KEYS = Object.values(TARGET_CONFIG).flat().map(t => t.dataKey);

let allData = {};
let allSalesUsers = [];
let isFetching = false;
let pendingEntries = {};

// =================================================================================
// FUNGSI PENGAMBILAN DATA
// =================================================================================

async function loadInitialData(isInitialLoad = false) {
    if (isFetching) return;
    isFetching = true;
    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    const fetchUrl = new URL(SCRIPT_URL);
    fetchUrl.searchParams.append('action', 'getDataForPeriod');
    fetchUrl.searchParams.append('startDate', toLocalDateString(periodStartDate));
    fetchUrl.searchParams.append('endDate', toLocalDateString(periodEndDate));
    fetchUrl.searchParams.append('includeUsers', 'true');
    fetchUrl.searchParams.append('t', new Date().getTime());

    try {
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data;
            if (allData.users && allData.users.length > 0) {
                allSalesUsers = allData.users.filter(u => u.role === 'sales').map(u => u.name);
            } else {
                const salesFromActivities = new Set();
                ALL_DATA_KEYS.forEach(key => (allData[key] || []).forEach(item => item && item.sales && salesFromActivities.add(item.sales)));
                allSalesUsers = Array.from(salesFromActivities);
            }
            
            if (isInitialLoad) {
                setupTimeOffForm();
                renderKpiSettings();
            }
            updateAllUI();
            if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        if (isInitialLoad) showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
        console.error("Fetch Error:", error);
    } finally {
        isFetching = false;
    }
}

// =================================================================================
// FUNGSI UTAMA UI & PERHITUNGAN
// =================================================================================

function updateAllUI() {
    try {
        const penalties = calculatePenalties();
        updateStatCards(penalties);
        updateLeaderboard(penalties);
        renderTabbedTargetSummary();
        renderTimeOffList();
        updateTeamValidationBreakdown();
    } catch(error) {
        console.error("Error updating management UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data manajemen.", "error");
    }
}

function getFilteredData(salesName, dataKey, validationFilter = ['Approved']) {
    const data = allData[dataKey] || [];
    if (!Array.isArray(data)) return [];
    return data.filter(item => 
        item &&
        item.sales === salesName && 
        (validationFilter.includes('All') || (item.validationStatus && validationFilter.map(f=>f.toLowerCase()).includes(item.validationStatus.toLowerCase())))
    );
}

function updateStatCards(penalties) {
    const approvedLeads = (allData.leads || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    const approvedCanvasing = (allData.canvasing || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    document.getElementById('totalLeads').textContent = approvedLeads.length;
    document.getElementById('totalCanvasing').textContent = approvedCanvasing.length;
    
    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = ALL_DATA_KEYS.reduce((total, key) => total + getFilteredData(salesName, key, ['Approved']).length, 0);
    });
    const topSales = Object.keys(salesPerformance).length > 0 ? Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b) : 'N/A';
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total);
}

function updateLeaderboard(penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const leaderboardData = allSalesUsers.map(salesName => {
        const totalActivities = ALL_DATA_KEYS.reduce((sum, key) => sum + getFilteredData(salesName, key, ['Approved']).length, 0);
        return { name: salesName, total: totalActivities, penalty: penalties.bySales[salesName] || 0 };
    });
    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<div class="performance-table-wrapper"><table class="performance-table" style="table-layout: auto;"><thead><tr><th>Nama Sales</th><th>Total Aktivitas (Approved)</th><th>Denda Final</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td><strong>${s.total}</strong></td><td>${formatCurrency(s.penalty)}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data sales</td></tr>'}</tbody></table></div>`;
}

function calculatePenalties() {
    const penalties = { total: 0, bySales: {} };
    const kpiSettings = allData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    if (today < periodStartDate) return penalties;

    allSalesUsers.forEach(salesName => {
        penalties.bySales[salesName] = 0;
        
        TARGET_CONFIG.daily.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            datesToCheck.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved'])
                        .filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                    if (achievedToday < target.target) penalties.bySales[salesName] += target.penalty;
                }
            });
        });

        const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
        TARGET_CONFIG.weekly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            sundaysInPeriod.forEach(sunday => {
                const weekStart = getWeekStart(sunday);
                const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved'])
                    .filter(d => { if(!d) return false; const itemDate = new Date(d.timestamp); return itemDate >= weekStart && itemDate <= sunday; }).length;
                if (achievedThisWeek < target.target) penalties.bySales[salesName] += target.penalty;
            });
        });

        if (today > periodEndDate) {
            TARGET_CONFIG.monthly.forEach(target => {
                if (kpiSettings[target.id] === false) return;
                const achievedThisPeriod = getFilteredData(salesName, target.dataKey, ['Approved']).length;
                if (achievedThisPeriod < target.target) penalties.bySales[salesName] += target.penalty;
            });
        }
    });

    penalties.total = Object.values(penalties.bySales).reduce((sum, p) => sum + p, 0);
    return penalties;
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
}

function renderTabbedTargetSummary() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('tabContentContainer');
    if (!tabsContainer || !contentContainer) return;
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    const periodDates = getDatesForPeriod();
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const kpiSettings = allData.kpiSettings || {};

    allSalesUsers.forEach((salesName, index) => {
        const contentId = `content-${salesName.replace(/\s+/g, '')}`;
        tabsContainer.innerHTML += `<button class="tab-button ${index === 0 ? 'active' : ''}" data-tab="${contentId}">${salesName}</button>`;
        let tableHeader = '<tr><th>Target</th>';
        periodDates.forEach(date => { tableHeader += `<th>${date.getDate()}</th>`; });
        tableHeader += '</tr>';
        let tableBody = '';
        ['daily', 'weekly', 'monthly'].forEach(period => {
            TARGET_CONFIG[period].forEach(target => {
                if (kpiSettings[target.id] === false) return;
                tableBody += `<tr><td>${target.name} (${period.charAt(0)})</td>`;
                periodDates.forEach(date => {
                    let cellContent = '';
                    let cellClass = '';
                    if (period === 'daily') {
                        if (isDayOff(date, salesName)) {
                            cellClass = 'off-day';
                        } else {
                            const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                            cellContent = achievedToday >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                        }
                    } else if (period === 'weekly' && date.getDay() === 0) {
                        const weekStart = getWeekStart(date);
                        const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= weekStart && dDate <= date; }).length;
                        cellContent = achievedThisWeek >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    } else if (period === 'monthly' && date.getDate() === 20) {
                        const achievedThisMonth = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= periodStartDate && dDate <= periodEndDate; }).length;
                        cellContent = achievedThisMonth >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    }
                    tableBody += `<td class="${cellClass}">${cellContent}</td>`;
                });
                tableBody += '</tr>';
            });
        });
        contentContainer.innerHTML += `<div id="${contentId}" class="tab-content ${index === 0 ? 'active' : ''}"><div class="performance-table-wrapper"><table class="performance-table">${tableHeader}${tableBody}</table></div></div>`;
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function updateTeamValidationBreakdown() {
    const container = document.getElementById('teamValidationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    ALL_DATA_KEYS.forEach(key => {
        const data = allData[key] || [];
        if(Array.isArray(data)) {
            data.forEach(item => {
                if(item && item.validationStatus) {
                    total++;
                    const status = item.validationStatus.toLowerCase();
                    if (status === 'approved') approved++;
                    else if (status === 'pending') pending++;
                    else if (status === 'rejected') rejected++;
                }
            });
        }
    });
    container.innerHTML = `
        <div class="validation-stats">
            <div class="stat-item approved"><strong>${approved}</strong> Disetujui</div>
            <div class="stat-item pending"><strong>${pending}</strong> Pending</div>
            <div class="stat-item rejected"><strong>${rejected}</strong> Ditolak</div>
            <div class="stat-item total"><strong>${total}</strong> Total Data</div>
        </div>`;
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (pending > 0) {
        pendingBadge.textContent = pending;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
    }
}

// =================================================================================
// PUSAT VALIDASI
// =================================================================================

async function loadPendingEntries() {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    if (!tabsContainer || !contentContainer) return;
    
    tabsContainer.innerHTML = '<p>Memuat data...</p>';
    contentContainer.innerHTML = '';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getPendingEntries&t=${new Date().getTime()}`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            pendingEntries = result.data;
            renderValidationTabs(pendingEntries);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        tabsContainer.innerHTML = `<p class="message error">Gagal memuat data: ${error.message}</p>`;
    }
}

function renderValidationTabs(data) {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const pendingBySales = {};
    let totalPendingAll = 0;

    for (const sheetName in data) {
        data[sheetName].forEach(item => {
            if (!item || !item.sales) return;
            if (!pendingBySales[item.sales]) {
                pendingBySales[item.sales] = { total: 0, items: {} };
            }
            if (!pendingBySales[item.sales].items[sheetName]) {
                pendingBySales[item.sales].items[sheetName] = [];
            }
            pendingBySales[item.sales].items[sheetName].push(item);
            pendingBySales[item.sales].total++;
            totalPendingAll++;
        });
    }

    const pendingBadge = document.getElementById('pendingCountBadge');
    if (totalPendingAll > 0) {
        pendingBadge.textContent = totalPendingAll;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
        tabsContainer.innerHTML = '<p class="message success">Tidak ada data yang perlu divalidasi saat ini. Kerja bagus!</p>';
        return;
    }

    let isFirstTab = true;
    for (const salesName in pendingBySales) {
        const salesData = pendingBySales[salesName];
        const tabId = `validation-tab-${salesName.replace(/\s+/g, '')}`;
        const contentId = `validation-content-${salesName.replace(/\s+/g, '')}`;

        const tabButton = document.createElement('button');
        tabButton.className = `tab-button ${isFirstTab ? 'active' : ''}`;
        tabButton.dataset.tab = contentId;
        tabButton.innerHTML = `${salesName} <span class="pending-badge">${salesData.total}</span>`;
        tabsContainer.appendChild(tabButton);

        const contentDiv = document.createElement('div');
        contentDiv.id = contentId;
        contentDiv.className = `tab-content ${isFirstTab ? 'active' : ''}`;
        
        for (const sheetName in salesData.items) {
            const items = salesData.items[sheetName];
            const card = document.createElement('div');
            card.className = 'card';
            let tableHTML = `
                <div class="card__header"><h3>${sheetName} (${items.length} pending)</h3></div>
                <div class="card__body performance-table-wrapper">
                    <table class="validation-table">
                        <thead><tr><th>Waktu</th><th>Detail Utama</th><th>Aksi</th></tr></thead>
                        <tbody>`;
            items.forEach(item => {
                const mainDetail = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
                tableHTML += `
                    <tr data-id="${item.id}" data-sheet="${sheetName}">
                        <td>${item.datestamp || new Date(item.timestamp).toLocaleDateString()}</td>
                        <td>${mainDetail}</td>
                        <td class="validation-actions">
                            <button class="btn btn--sm btn--outline" onclick="openDetailModal('${item.id}', '${sheetName}')">Detail</button>
                            <button class="btn btn--sm btn--primary" onclick="handleValidation(this, '${sheetName}', '${item.id}', 'approve')">Approve</button>
                            <button class="btn btn--sm btn--secondary" onclick="handleValidation(this, '${sheetName}', '${item.id}', 'reject')">Reject</button>
                        </td>
                    </tr>`;
            });
            tableHTML += `</tbody></table></div>`;
            card.innerHTML = tableHTML;
            contentDiv.appendChild(card);
        }
        contentContainer.appendChild(contentDiv);
        isFirstTab = false;
    }

    document.querySelectorAll('#validationTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#validationTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#validationTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}


async function handleValidation(buttonElement, sheetName, id, type) {
    let notes = '';
    if (type === 'reject') {
        notes = prompt(`Mohon berikan alasan penolakan untuk data ini:`);
        if (notes === null || notes.trim() === '') {
            showMessage('Penolakan dibatalkan karena tidak ada alasan yang diberikan.', 'info');
            return;
        }
    }

    const action = type === 'approve' ? 'approveEntry' : 'rejectEntry';
    const payload = { action, sheetName, id, notes };

    const actionCell = buttonElement.parentElement;
    actionCell.querySelectorAll('button').forEach(btn => btn.disabled = true);

    showMessage('Memproses validasi...', 'info');
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Validasi berhasil disimpan.', 'success');
            
            const row = actionCell.parentElement;

            if (type === 'approve') {
                actionCell.innerHTML = `<span class="status status--approved">Approved</span>`;
            } else {
                actionCell.innerHTML = `<span class="status status--rejected">Rejected</span>`;
            }

            const pendingBadge = document.getElementById('pendingCountBadge');
            if (pendingBadge) {
                let currentCount = parseInt(pendingBadge.textContent) || 0;
                if (currentCount > 0) {
                    pendingBadge.textContent = currentCount - 1;
                    if (pendingBadge.textContent === '0') pendingBadge.style.display = 'none';
                }
            }

            const activeTabBadge = document.querySelector('#validationTabsContainer .tab-button.active .pending-badge');
            if (activeTabBadge) {
                 let currentTabCount = parseInt(activeTabBadge.textContent) || 0;
                 if (currentTabCount > 0) {
                    activeTabBadge.textContent = currentTabCount - 1;
                 }
            }
            
            setTimeout(() => {
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    const tableBody = actionCell.closest('tbody');
                    if (tableBody && tableBody.children.length === 0) {
                        const card = tableBody.closest('.card');
                        card.innerHTML = `<div class="card__body" style="text-align: center;">Semua item di kategori ini telah divalidasi.</div>`;
                    }
                }, 500);
            }, 1000);

        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showMessage(`Gagal memproses validasi: ${error.message}`, 'error');
        actionCell.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

// =================================================================================
// FUNGSI MODAL
// =================================================================================

function closeDetailModal() {
    const modal = document.getElementById('managementDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openDetailModal(itemId, sheetName) {
    const items = pendingEntries[sheetName] || [];
    const item = items.find(d => d && d.id === itemId);
    const mapping = CONFIG.dataMapping[sheetName];

    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan untuk modal:", itemId, sheetName);
        showMessage("Tidak dapat menampilkan detail data.", "error");
        return;
    }

    const modal = document.getElementById('managementDetailModal');
    const modalTitle = document.getElementById('managementDetailModalTitle');
    const modalBody = document.getElementById('managementDetailModalBody');
    if(!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Detail Data - ${sheetName}`;
    modalBody.innerHTML = '';

    const detailList = document.createElement('dl');
    detailList.className = 'detail-list';
    const dateFields = ['timestamp', 'visitDate', 'surveyDate', 'eventDate', 'campaignStartDate', 'campaignEndDate'];

    for (const key in mapping.detailLabels) {
        if (Object.prototype.hasOwnProperty.call(item, key) && (item[key] || item[key] === 0 || typeof item[key] === 'string')) {
            const dt = document.createElement('dt');
            dt.textContent = mapping.detailLabels[key];
            
            const dd = document.createElement('dd');
            let value = item[key];

            if (key === 'timestamp') value = item.datestamp;
            else if (dateFields.includes(key)) value = formatDate(value);
            else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('value')) value = formatCurrency(value);
            else if (key === 'validationStatus') {
                dd.innerHTML = `<span class="status status--${(value || 'pending').toLowerCase()}">${value || 'Pending'}</span>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
            } else if (typeof value === 'string' && (value.startsWith('http'))) {
                 dd.innerHTML = `<a href="${value}" target="_blank" rel="noopener noreferrer">Lihat File/Link</a>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
            }
            
            dd.textContent = value;
            detailList.appendChild(dt);
            detailList.appendChild(dd);
        }
    }
    
    modalBody.appendChild(detailList);
    modal.classList.add('active');
}


// =================================================================================
// FUNGSI PENGATURAN & INISIALISASI
// =================================================================================

function renderKpiSettings() {
    const container = document.getElementById('kpiSettingsContainer');
    if (!container) return;
    container.innerHTML = '';
    const allTargets = [...TARGET_CONFIG.daily, ...TARGET_CONFIG.weekly, ...TARGET_CONFIG.monthly];
    const kpiSettings = allData.kpiSettings || {};
    allTargets.forEach(target => {
        const isActive = kpiSettings[target.id] !== false;
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.innerHTML = `<div class="setting-info"><div class="setting-name">${target.name}</div><div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div></div><label class="toggle-switch"><input type="checkbox" data-target-id="${target.id}" ${isActive ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
        container.appendChild(item);
    });
    container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
        toggle.addEventListener('change', handleKpiSettingChange);
    });
}

async function handleKpiSettingChange(event) {
    const toggle = event.target;
    const targetId = toggle.dataset.targetId;
    const isActive = toggle.checked;
    toggle.disabled = true;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateKpiSetting', targetId, isActive })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Pengaturan KPI berhasil diperbarui.', 'success');
            if (!allData.kpiSettings) allData.kpiSettings = {};
            allData.kpiSettings[targetId] = isActive;
            updateAllUI();
        } else { throw new Error(result.message); }
    } catch (error) {
        showMessage(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
        toggle.checked = !isActive;
    } finally {
        toggle.disabled = false;
    }
}

function setupTimeOffForm() {
    const form = document.getElementById('timeOffForm');
    const salesSelect = document.getElementById('timeOffSales');
    if (!form || !salesSelect) return;
    salesSelect.innerHTML = '<option value="Global">Global (Hari Libur)</option>';
    allSalesUsers.forEach(name => {
        salesSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('timeOffDate').value;
        const sales = salesSelect.value;
        if (!date) { showMessage('Silakan pilih tanggal.', 'error'); return; }
        const payload = { action: 'saveTimeOff', data: { date, sales, id: `timeoff_${Date.now()}` } };
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true; submitButton.textContent = 'Menyimpan...';
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage('Data berhasil disimpan.', 'success');
                loadInitialData(); form.reset();
            } else { throw new Error(result.message || 'Gagal menyimpan data.'); }
        } catch (error) { showMessage(`Error: ${error.message}`, 'error');
        } finally { submitButton.disabled = false; submitButton.textContent = 'Simpan'; }
    });
}

function renderTimeOffList() {
    const container = document.getElementById('timeOffListContainer');
    if (!container) return;
    container.innerHTML = '';
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return;
    timeOffData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        if (!item || !item.date) return;
        const li = document.createElement('li');
        const displayDate = new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        li.innerHTML = `<span>${displayDate} - <strong>${item.sales}</strong></span><button class="delete-btn" data-id="${item.id}">&times;</button>`;
        container.appendChild(li);
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Anda yakin ingin menghapus data ini?')) {
                const payload = { action: 'deleteTimeOff', id };
                try {
                    const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (result.status === 'success') { showMessage('Data berhasil dihapus.', 'success'); loadInitialData();
                    } else { throw new Error(result.message || 'Gagal menghapus data.'); }
                } catch (error) { showMessage(`Error: ${error.message}`, 'error'); }
            }
        });
    });
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'validationCenter') {
        loadPendingEntries();
    }
}

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('refreshValidationBtn')?.addEventListener('click', loadPendingEntries);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showContentPage(link.dataset.page);
        });
    });
    setupFilters(loadInitialData);
    loadInitialData(true);
}

document.addEventListener('DOMContentLoaded', initializeApp);
