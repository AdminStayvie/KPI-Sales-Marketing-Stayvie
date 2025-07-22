/**
 * @file app.js
 * @description Logika utama untuk dashboard KPI Sales.
 * @version 6.2.0
 *
 * Perubahan Utama (v6.2.0):
 * - FIX: Memperbaiki bug di mana update status dari tab Prospect tidak berfungsi.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
const currentUserJSON = localStorage.getItem('currentUser');
if (!currentUserJSON) { window.location.href = 'index.html'; }
const currentUser = JSON.parse(currentUserJSON);

// =================================================================================
// KONFIGURASI TERPUSAT
// =================================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

const CONFIG = {
    targets: {
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
    },
    dataMapping: {
        'Leads': { 
            dataKey: 'leads', 
            headers: ['Waktu', 'Customer', 'Sumber', 'Produk', 'Status', 'Aksi'], 
            rowGenerator: generateLeadRow,
            detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status', statusLog: 'Log Status' }
        },
        'Canvasing': { 
            dataKey: 'canvasing', 
            headers: ['Waktu', 'Judul Meeting', 'File'], 
            rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.meetingTitle || ''}</td><td>${item.document ? 'Ada File' : 'N/A'}</td></tr>`,
            detailLabels: { datestamp: 'Waktu Upload', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan' }
        },
        'Promosi': { dataKey: 'promosi', headers: ['Waktu', 'Campaign', 'Platform'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.campaignName || ''}</td><td>${item.platform || ''}</td></tr>`, detailLabels: { datestamp: 'Waktu Upload', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot' }},
        'DoorToDoor': { dataKey: 'doorToDoor', headers: ['Waktu', 'Tanggal', 'Instansi', 'PIC'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${formatDate(item.visitDate)}</td><td>${item.institutionName || ''}</td><td>${item.picName || ''}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti' } },
        'Quotations': { dataKey: 'quotations', headers: ['Waktu', 'Customer', 'Produk', 'Nominal'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.customerName || ''}</td><td>${item.productType || ''}</td><td>${formatCurrency(item.quotationAmount)}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan' } },
        'Surveys': { dataKey: 'surveys', headers: ['Waktu', 'Tgl Survey', 'Customer', 'Asal'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${formatDate(item.surveyDate)}</td><td>${item.customerName || ''}</td><td>${item.origin || ''}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi' } },
        'Reports': { dataKey: 'reports', headers: ['Waktu', 'Periode', 'File'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.reportPeriod || ''}</td><td>${item.reportDoc ? 'Ada File' : 'N/A'}</td></tr>`, detailLabels: { datestamp: 'Waktu Upload', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan' } },
        'CRMSurveys': { dataKey: 'crmSurveys', headers: ['Waktu', 'Kompetitor', 'Website'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.competitorName || ''}</td><td>${item.website ? 'Ada Link' : '-'}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga' } },
        'Conversions': { dataKey: 'conversions', headers: ['Waktu', 'Event', 'Client', 'Tanggal'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.clientName || ''}</td><td>${formatDate(item.eventDate)}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian' } },
        'Events': { dataKey: 'events', headers: ['Waktu', 'Nama Event', 'Jenis', 'Tanggal'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.eventName || ''}</td><td>${item.eventType || ''}</td><td>${formatDate(item.eventDate)}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi' } },
        'Campaigns': { dataKey: 'campaigns', headers: ['Waktu', 'Judul', 'Periode', 'Budget'], rowGenerator: (item, dataKey) => `<tr onclick="openDetailModal('${item.id}')"><td>${item.datestamp || ''}</td><td>${item.campaignTitle || ''}</td><td>${formatDate(item.campaignStartDate)} - ${formatDate(item.campaignEndDate)}</td><td>${formatCurrency(item.budget)}</td></tr>`, detailLabels: { datestamp: 'Waktu Input', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi' } },
    }
};
let currentData = { settings: {}, kpiSettings: {} };
Object.values(CONFIG.dataMapping).forEach(map => { currentData[map.dataKey] = []; });
let isFetchingData = false;

async function loadInitialData() {
    if (isFetchingData) return;
    isFetchingData = true;
    showMessage("Memuat data dari server...", "info");
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const fetchUrl = new URL(SCRIPT_URL);
    fetchUrl.searchParams.append('action', 'getDataForPeriod');
    fetchUrl.searchParams.append('startDate', toLocalDateString(periodStartDate));
    fetchUrl.searchParams.append('endDate', toLocalDateString(periodEndDate));
    fetchUrl.searchParams.append('salesName', currentUser.name);
    try {
        const response = await fetch(fetchUrl, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            Object.keys(currentData).forEach(key => {
                if (key !== 'settings') currentData[key] = [];
            });
            for (const key in result.data) {
                currentData[key] = result.data[key] || [];
            }
            showMessage("Data berhasil dimuat.", "success");
            updateAllUI();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    } finally {
        isFetchingData = false;
    }
}

async function sendData(action, payloadData, event) {
    const button = event ? event.target.querySelector('button[type="submit"]') : null;
    let originalButtonText = '';
    if (button) {
        originalButtonText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> Mengirim...';
        button.disabled = true;
    }
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...payloadData })
        });
        if (!response.ok) throw new Error(`Server merespons dengan status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'success') {
            showMessage('Data berhasil diproses!', 'success');
            await loadInitialData();
            if (event) event.target.reset();
            closeModal();
        } else {
            throw new Error(result.message || 'Terjadi kesalahan di server.');
        }
    } catch (error) {
        showMessage(`Gagal memproses data: ${error.message}.`, 'error');
    } finally {
        if (button) {
            button.innerHTML = originalButtonText;
            button.disabled = false;
        }
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const sheetName = form.dataset.sheetName;
    if (!sheetName) return;
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File && value.size > 0) continue;
        data[key] = value;
    }
    const fileInputs = form.querySelectorAll('input[type="file"]');
    for (const fileInput of fileInputs) {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            data[fileInput.name] = {
                fileName: file.name,
                mimeType: file.type,
                data: await toBase64(file)
            };
        }
    }
    data.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    data.sales = currentUser.name;
    data.timestamp = getLocalTimestampString();
    data.datestamp = getDatestamp();
    if (sheetName === 'Leads') {
        data.status = 'Lead';
        data.statusLog = '';
    }
    const payload = { sheetName, data };
    sendData('saveData', payload, e);
}

function handleUpdateLead(e) {
    e.preventDefault();
    const form = e.target;
    const leadId = form.querySelector('#updateLeadId').value;
    const newStatus = form.querySelector('#updateStatus').value;
    const statusLog = form.querySelector('#statusLog').value;
    
    const allLeadsAndProspects = [
        ...(currentData.leads || []),
        ...(currentData.prospects || [])
    ];
    const leadData = allLeadsAndProspects.find(item => item.id === leadId);

    if (!leadData) {
        showMessage('Data asli untuk diupdate tidak ditemukan!', 'error');
        return;
    }

    const originalLeadId = leadData.id.startsWith('prospect_') 
        ? leadData.id.replace('prospect_', 'item_') 
        : leadData.id;

    const payload = {
        leadId: originalLeadId,
        newStatus,
        statusLog,
        leadData
    };
    sendData('updateLeadStatus', payload, e);
}

function updateAllUI() {
    updateDashboard();
    updateAllSummaries();
    calculateAndDisplayPenalties();
}

function getFilteredData(dataType) {
    return currentData[dataType] || [];
}

function calculateAchievementForTarget(target) {
    if (!target.dataKey) return 0;
    const data = getFilteredData(target.dataKey);
    return data.length;
}

function updateDashboard() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    const achievements = {
        daily: 0,
        weekly: 0,
        monthly: 0
    };
    const totals = {
        daily: 0,
        weekly: 0,
        monthly: 0
    };
    const kpiSettings = currentData.kpiSettings || {};
    ['daily', 'weekly', 'monthly'].forEach(period => {
        CONFIG.targets[period].forEach(target => {
            if (kpiSettings[target.id] !== false) {
                const achieved = calculateAchievementForTarget(target);
                achievements[period] += achieved;
                totals[period] += target.target;
            }
        });
        updateProgressBar(period, achievements[period], totals[period]);
    });
    updateTargetBreakdown();
}

function calculateAndDisplayPenalties() {
    const penaltyElement = document.getElementById('totalPenalty');
    if (!penaltyElement) return;
    let totalPenalty = 0;
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const kpiSettings = currentData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    if (today < periodStartDate) {
        penaltyElement.textContent = formatCurrency(0);
        return;
    }
    CONFIG.targets.daily.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        datesToCheck.forEach(date => {
            if (!isDayOff(date, currentUser.name)) {
                const achievedToday = getFilteredData(target.dataKey).filter(d => new Date(d.timestamp).toDateString() === date.toDateString()).length;
                if (achievedToday < target.target) totalPenalty += target.penalty;
            }
        });
    });
    const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
    CONFIG.targets.weekly.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        sundaysInPeriod.forEach(sunday => {
            const weekStart = getWeekStart(sunday);
            const achievedThisWeek = getFilteredData(target.dataKey).filter(d => {
                const itemDate = new Date(d.timestamp);
                return itemDate >= weekStart && itemDate <= sunday;
            }).length;
            if (achievedThisWeek < target.target) totalPenalty += target.penalty;
        });
    });
    if (today > periodEndDate) {
        CONFIG.targets.monthly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            const achievedThisMonth = getFilteredData(target.dataKey).length;
            if (achievedThisMonth < target.target) totalPenalty += target.penalty;
        });
    }
    penaltyElement.textContent = formatCurrency(totalPenalty);
}

function updateTargetBreakdown() {
    const container = document.getElementById('targetBreakdown');
    if (!container) return;
    container.innerHTML = '';
    const kpiSettings = currentData.kpiSettings || {};
    ['daily', 'weekly', 'monthly'].forEach(period => {
        const header = document.createElement('h4');
        header.textContent = `Target ${period.charAt(0).toUpperCase() + period.slice(1)}`;
        container.appendChild(header);
        CONFIG.targets[period].forEach(target => {
            if (kpiSettings[target.id] !== false) {
                const achieved = calculateAchievementForTarget(target);
                const status = achieved >= target.target ? 'completed' : 'pending';
                container.innerHTML += `<div class="target-item"><div class="target-name">${target.name}</div><div class="target-progress"><span>${achieved}/${target.target}</span><span class="target-status ${status}">${status === 'completed' ? 'Selesai' : 'Pending'}</span></div></div>`;
            }
        });
    });
}

function updateProgressBar(type, achieved, total) {
    const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
    document.getElementById(`${type}Progress`).style.width = `${percentage}%`;
    document.getElementById(`${type}Percentage`).textContent = `${percentage}%`;
    document.getElementById(`${type}Achieved`).textContent = achieved;
    document.getElementById(`${type}Total`).textContent = total;
}

function updateAllSummaries() {
    updateLeadTabs();
    for (const sheetName in CONFIG.dataMapping) {
        const mapping = CONFIG.dataMapping[sheetName];
        if (sheetName !== 'Leads' && mapping.headers) {
            updateSimpleSummaryTable(sheetName, mapping);
        }
    }
}

function updateSimpleSummaryTable(sheetName, mapping) {
    const containerId = `${mapping.dataKey}Summary`;
    const container = document.getElementById(containerId);
    if (!container) return;
    const dataToDisplay = getFilteredData(mapping.dataKey);
    if (dataToDisplay.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data untuk periode ini</div>`;
        return;
    }
    const tableHTML = `<table><thead><tr><th>${mapping.headers.join('</th><th>')}</th></tr></thead><tbody>${dataToDisplay.slice().reverse().map(item => mapping.rowGenerator(item, mapping.dataKey)).join('')}</tbody></table>`;
    container.innerHTML = tableHTML;
}

function updateLeadTabs() {
    const leadContainer = document.getElementById('leadContent');
    const prospectContainer = document.getElementById('prospectContent');
    const dealContainer = document.getElementById('dealContent');

    if (!leadContainer || !prospectContainer || !dealContainer) return;

    const allLeads = currentData.leads || [];
    const allProspects = currentData.prospects || [];
    const allDeals = [
        ...(currentData.b2bBookings || []),
        ...(currentData.venueBookings || []),
        ...(currentData.dealLainnya || [])
    ];

    const dealIds = new Set(allDeals.map(d => d.id.replace('deal_', 'item_')));

    const leads = allLeads.filter(item => item.status === 'Lead');
    const prospects = allProspects.filter(p => !dealIds.has(p.id.replace('prospect_', 'item_')));
    const deals = allDeals;

    renderLeadTable(leadContainer, leads, 'Lead');
    renderLeadTable(prospectContainer, prospects, 'Prospect');
    renderLeadTable(dealContainer, deals, 'Deal');
}

function renderLeadTable(container, data, statusType) {
    if (data.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data ${statusType} untuk periode ini</div>`;
        return;
    }

    const headers = ['Waktu', 'Customer', 'Sumber', 'Produk', 'Status', 'Aksi'];
    const tableHTML = `
        <table>
            <thead>
                <tr><th>${headers.join('</th><th>')}</th></tr>
            </thead>
            <tbody>
                ${data.slice().reverse().map(item => generateLeadRow(item, statusType)).join('')}
            </tbody>
        </table>`;
    container.innerHTML = tableHTML;
}

function generateLeadRow(item, statusType) {
    const statusClass = (item.status || '').toLowerCase().replace(/\s+/g, '-');
    let actionButton = '-';

    if (statusType === 'Lead' || statusType === 'Prospect') {
        actionButton = `<button class="btn btn--sm btn--outline" onclick="openUpdateModal('${item.id}'); event.stopPropagation();">Update</button>`;
    }
    
    return `
        <tr onclick="openDetailModal('${item.id}')">
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.leadSource || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--${statusClass}">${item.status || 'N/A'}</span></td>
            <td>${actionButton}</td>
        </tr>`;
}

function openUpdateModal(leadId) {
    const modal = document.getElementById('updateLeadModal');
    const allLeadsAndProspects = [
        ...(currentData.leads || []),
        ...(currentData.prospects || [])
    ];
    const lead = allLeadsAndProspects.find(l => l.id === leadId);

    if (!lead || !modal) {
        showMessage('Data untuk diupdate tidak ditemukan.', 'error');
        return;
    }
    document.getElementById('updateLeadId').value = lead.id;
    document.getElementById('modalCustomerName').textContent = lead.customerName;
    const statusSelect = document.getElementById('updateStatus');
    statusSelect.innerHTML = '';
    const currentStatus = lead.status || 'Lead';
    document.getElementById('modalCurrentStatus').textContent = currentStatus;
    const statusElement = document.getElementById('modalCurrentStatus');
    statusElement.className = `status status--${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;
    statusElement.style.paddingLeft = '0';
    if (currentStatus === 'Lead') {
        statusSelect.innerHTML = `<option value="Prospect">Prospect</option><option value="Deal">Deal</option><option value="Lost">Lost</option>`;
    } else if (currentStatus === 'Prospect') {
        statusSelect.innerHTML = `<option value="Deal">Deal</option><option value="Lost">Lost</option>`;
    }
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('updateLeadModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('updateLeadForm').reset();
    }
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openDetailModal(itemId) {
    const allLeadData = [
        ...(currentData.leads || []),
        ...(currentData.prospects || []),
        ...(currentData.b2bBookings || []),
        ...(currentData.venueBookings || []),
        ...(currentData.dealLainnya || [])
    ];

    const item = allLeadData.find(d => d.id === itemId);
    const mapping = CONFIG.dataMapping['Leads'];

    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan:", itemId);
        return;
    }

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');
    
    modalTitle.textContent = `Detail Customer`;
    modalBody.innerHTML = '';

    const detailList = document.createElement('dl');
    detailList.className = 'detail-list';

    const dateFields = ['timestamp', 'visitDate', 'surveyDate', 'eventDate', 'campaignStartDate', 'campaignEndDate'];

    for (const key in mapping.detailLabels) {
        if (Object.prototype.hasOwnProperty.call(item, key) && item[key]) {
            const dt = document.createElement('dt');
            dt.textContent = mapping.detailLabels[key];
            
            const dd = document.createElement('dd');
            let value = item[key];

            if (key === 'timestamp') {
                value = item.datestamp;
            } else if (dateFields.includes(key)) {
                value = formatDate(value);
            } else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('value')) {
                value = formatCurrency(value);
            } else if (typeof value === 'string' && (value.startsWith('http'))) {
                 dd.innerHTML = `<a href="${value}" target="_blank" rel="noopener noreferrer">Lihat File/Link</a>`;
                detailList.appendChild(dt);
                detailList.appendChild(dd);
                continue;
            }
            
            dd.textContent = value;
            detailList.appendChild(dt);
            detailList.appendChild(dd);
        }
    }
    
    modalBody.appendChild(detailList);
    modal.classList.add('active');
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    return (currentData.timeOff || []).some(off => 
        off.date === dateString && (off.sales === 'Global' || off.sales === salesName)
    );
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
}

function setupEventListeners() {
    document.querySelectorAll('form.kpi-form').forEach(form => form.addEventListener('submit', handleFormSubmit));
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        showContentPage(link.getAttribute('data-page'));
    }));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('updateLeadForm')?.addEventListener('submit', handleUpdateLead);
    
    document.querySelectorAll('#leadTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#leadTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#leadTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function initializeApp() {
    if (!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    Object.keys(CONFIG.targets).flatMap(p => CONFIG.targets[p]).forEach(t => {
        currentData.settings[t.id] = true;
    });
    updateDateTime();
    setInterval(updateDateTime, 60000);
    setupEventListeners();
    setupFilters(loadInitialData);
    loadInitialData();
}

document.addEventListener('DOMContentLoaded', initializeApp);
