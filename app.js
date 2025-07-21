/**
 * @file app.js
 * @description Logika utama untuk dashboard KPI.
 * @version 3.1.0
 *
 * Perubahan Utama (v3.1.0):
 * - FITUR UTAMA: Menambahkan alur kerja pembaruan status lead.
 * - Tampilan: Tabel leads sekarang menampilkan semua data dengan kolom status dan tombol update.
 * - Modal Update: Membuat modal pop-up untuk mengubah status lead.
 * - LOGIKA KONVERSI OTOMATIS:
 * - Mengubah status ke "Prospect" akan otomatis membuat data di sheet "Prospects" dan memenuhi target KPI.
 * - Mengubah status ke "Deal" akan otomatis membuat data di "B2BBookings" atau "VenueBookings" dan memenuhi target KPI yang relevan.
 * - BACKEND INTEGRATION: Menambahkan fungsi untuk mengirim data pembaruan ke Google Apps Script.
 *
 * Perubahan Sebelumnya:
 * - Menambahkan filter tahun dan periode di dashboard sales.
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
        // <<< PERUBAHAN: Menambahkan mapping untuk data konversi baru >>>
        'Leads': { dataKey: 'leads', headers: ['Waktu', 'Customer', 'Sumber', 'Produk', 'Status', 'Aksi'], rowGenerator: generateLeadRow },
        'Prospects': { dataKey: 'prospects' }, // Hanya untuk tracking, tidak ditampilkan
        'B2BBookings': { dataKey: 'b2bBookings' }, // Hanya untuk tracking
        'VenueBookings': { dataKey: 'venueBookings' }, // Hanya untuk tracking
        'Canvasing': { dataKey: 'canvasing', headers: ['Waktu', 'Judul Meeting', 'File'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.meetingTitle || ''}</td><td>${item.fileUrl ? `<a href="${item.fileUrl}" target="_blank">${item.fileName}</a>` : 'N/A'}</td>` },
        'Promosi': { dataKey: 'promosi', headers: ['Waktu', 'Campaign', 'Platform'], rowGenerator: item => `<td>${item.datestamp || ''}</td><td>${item.campaignName || ''}</td><td>${item.platform || ''}</td>` },
        // ... mapping lainnya tetap sama ...
    }
};

// --- STATE APLIKASI ---
let currentData = { settings: {} };
Object.values(CONFIG.dataMapping).forEach(map => { currentData[map.dataKey] = []; });
let selectedYear, selectedPeriod;

// =================================================================================
// FUNGSI INTI (Core Functions)
// =================================================================================
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
            // Muat ulang semua data untuk memastikan sinkronisasi
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

async function loadInitialData() {
    showMessage("Memuat data dari server...", "info");
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData&includeUsers=true`, { mode: 'cors' });
        const result = await response.json();
        if (result.status === 'success') {
            for (const key in result.data) {
                if (currentData.hasOwnProperty(key) || key === 'timeOff') {
                    currentData[key] = result.data[key] || [];
                }
            }
            showMessage("Data berhasil dimuat.", "success");
            updateAllUI();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
    }
}

// =================================================================================
// FORM HANDLING
// =================================================================================
function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const sheetName = form.dataset.sheetName;
    if (!sheetName) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.id = `lead_${Date.now()}`; // ID unik untuk lead
    data.sales = currentUser.name;
    data.timestamp = getLocalTimestampString();
    data.datestamp = getDatestamp();
    data.status = 'Lead'; // Status awal
    data.updateNotes = ''; // Catatan update awal

    const fileInput = form.querySelector('input[type="file"]');
    const payload = { sheetName, data };
    if (fileInput && fileInput.files[0]) {
        // Logika file upload jika diperlukan
    }
    sendData('saveData', payload, e);
}

// <<< BARU: Fungsi untuk menangani update lead >>>
function handleUpdateLead(e) {
    e.preventDefault();
    const form = e.target;
    const leadId = form.querySelector('#updateLeadId').value;
    const newStatus = form.querySelector('#updateStatus').value;
    const updateNotes = form.querySelector('#updateNotes').value;

    const leadData = currentData.leads.find(lead => lead.id === leadId);
    if (!leadData) {
        showMessage('Data lead tidak ditemukan!', 'error');
        return;
    }

    const payload = {
        leadId,
        newStatus,
        updateNotes,
        leadData // Kirim data lead asli untuk membuat entri konversi
    };

    sendData('updateLeadStatus', payload, e);
}

// =================================================================================
// KALKULASI & UPDATE UI
// =================================================================================

function updateAllUI() {
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    updateDashboard(periodStartDate, periodEndDate);
    updateAllSummaries(periodStartDate, periodEndDate);
    calculateAndDisplayPenalties(periodStartDate, periodEndDate);
}

// ... (fungsi-fungsi update UI lainnya tetap sama) ...

function updateSummaryTable(sheetName, mapping, periodStartDate, periodEndDate) {
    const containerId = `${mapping.dataKey}Summary`;
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // <<< PERUBAHAN: Untuk leads, kita tidak memfilter berdasarkan periode agar semua bisa diupdate
    const dataToDisplay = sheetName === 'Leads'
        ? getFilteredData(mapping.dataKey) // Ambil semua lead milik user
        : getFilteredData(mapping.dataKey, periodStartDate, periodEndDate);

    if (dataToDisplay.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data</div>`;
        return;
    }

    let tableHTML = `
        <table>
            <thead><tr><th>${mapping.headers.join('</th><th>')}</th></tr></thead>
            <tbody>${dataToDisplay.reverse().map(item => mapping.rowGenerator(item)).join('')}</tbody>
        </table>`;
    container.innerHTML = tableHTML;
}

// <<< BARU: Fungsi untuk membuat baris tabel lead dengan tombol update >>>
function generateLeadRow(item) {
    const statusClass = item.status ? item.status.toLowerCase() : 'lead';
    return `
        <tr>
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.leadSource || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--${statusClass}">${item.status || 'Lead'}</span></td>
            <td>
                ${item.status === 'Lead' ? `<button class="btn btn--sm btn--outline" onclick="openUpdateModal('${item.id}')">Update</button>` : '-'}
            </td>
        </tr>
    `;
}

// =================================================================================
// <<< BARU: FUNGSI MODAL >>>
// =================================================================================
function openUpdateModal(leadId) {
    const modal = document.getElementById('updateLeadModal');
    const lead = currentData.leads.find(l => l.id === leadId);
    if (!lead || !modal) return;

    document.getElementById('updateLeadId').value = lead.id;
    document.getElementById('modalCustomerName').textContent = lead.customerName;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('updateLeadModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('updateLeadForm').reset();
    }
}

// =================================================================================
// INISIALISASI
// =================================================================================
function initializeApp() {
    if (!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    Object.keys(CONFIG.targets).flatMap(p => CONFIG.targets[p]).forEach(t => { currentData.settings[t.id] = true; });
    
    updateDateTime();
    setInterval(updateDateTime, 60000);
    
    setupEventListeners();
    setupFilters();
    loadInitialData();
}

function setupEventListeners() {
    document.querySelectorAll('form.kpi-form').forEach(form => form.addEventListener('submit', handleFormSubmit));
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showContentPage(link.getAttribute('data-page')); }));
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    // <<< BARU: Event listener untuk form update
    document.getElementById('updateLeadForm')?.addEventListener('submit', handleUpdateLead);
}

// ... (sisa fungsi utility dan setup lainnya tetap sama) ...
