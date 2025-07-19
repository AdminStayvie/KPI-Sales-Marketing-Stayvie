// ===================================================================================
// PENGATURAN KONEKSI KE GOOGLE SHEETS
// Pastikan URL ini adalah URL Web App Anda yang sudah di-deploy.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec';
// ===================================================================================

// STATE APLIKASI
let currentUser = null;
let appData = { users: [], targets: [] };
let currentData = { kpiEntries: [] };

// ===================================================================================
// FUNGSI-FUNGSI UTILITY (PEMBANTU)
// ===================================================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date) {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj)) return '';
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(dateObj);
}

function getCurrentDateString() {
    return new Date().toISOString().split('T')[0];
}

function showLoading(form, isLoading, message = 'Mengirim...') {
    if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<span class="loading"></span> ${message}`;
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || 'Simpan';
        }
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(notification, mainContent.firstChild);
    } else {
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.parentNode.insertBefore(notification, loginCard);
        }
    }
    setTimeout(() => { notification.remove(); }, 5000);
}

// ===================================================================================
// KOMUNIKASI DENGAN GOOGLE APPS SCRIPT (API)
// ===================================================================================

async function fetchInitialData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(`Server logic error: ${data.error}`);
        appData.users = data.users || [];
        appData.targets = data.targets || [];
        currentData.kpiEntries = data.kpiEntries || [];
        console.log("Initial data loaded successfully.");
        return true;
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            let errorDiv = loginContainer.querySelector('.message.error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'message error';
                const loginCard = loginContainer.querySelector('.login-card');
                loginCard.parentNode.insertBefore(errorDiv, loginCard);
            }
            errorDiv.textContent = 'Gagal memuat data. Pastikan konfigurasi server benar dan coba muat ulang halaman.';
        }
        return false;
    }
}

async function postData(sheetName, data, fileInfo = null) {
    try {
        let payload = { sheetName, data };
        if (fileInfo && fileInfo.file) {
            const base64String = await fileToBase64(fileInfo.file);
            payload.fileData = {
                base64: base64String,
                mimeType: fileInfo.file.type,
                fileName: fileInfo.file.name,
                linkKey: fileInfo.linkKey
            };
        }
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'Unknown error occurred');
        }
        return true;
    } catch (error) {
        console.error(`Failed to post data to ${sheetName}:`, error);
        showMessage(`Gagal menyimpan data: ${error.message}`, 'error');
        return false;
    }
}

// ===================================================================================
// LOGIKA INTI APLIKASI (AUTENTIKASI, NAVIGASI, UI)
// ===================================================================================

function login(username, password) {
    if (!appData.users || appData.users.length === 0) {
        showMessage('Data pengguna tidak dapat dimuat. Gagal login.', 'error');
        return false;
    }
    const user = appData.users.find(u => u.username.toLowerCase() === username.toLowerCase() && String(u.password) === password);
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
    document.body.dataset.appListeners = 'false'; // Reset listener flag
    showPage('loginPage');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    if (pageId === 'mainApp') {
        setupAppEventListeners();
        updateDateTime();
        updateDashboard();
        showContentPage('dashboard');
    }
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    loadPageData(pageId);
}

function updateDateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const dateTimeElement = document.getElementById('currentDateTime');
    if(dateTimeElement) dateTimeElement.textContent = timeString;
}

function updateDashboard() {
    if (!currentUser) return;
    const userDisplay = document.getElementById('userDisplayName');
    if(userDisplay) userDisplay.textContent = currentUser.name;
    // Logika dashboard lebih lanjut bisa ditambahkan di sini
}

function renderSummaryTable(containerId, data, columns, emptyMessage) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const userEntries = currentUser.role === 'management'
        ? data
        : data.filter(entry => entry.Sales && entry.Sales.toLowerCase() === currentUser.name.toLowerCase());

    if (userEntries.length === 0) {
        container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
        return;
    }

    let head = '<tr>' + columns.map(col => `<th>${col.header}</th>`).join('') + '</tr>';
    let body = userEntries.slice(-10).reverse().map(entry => {
        let row = '<tr>';
        columns.forEach(col => {
            let value = entry[col.key] || '-';
            if (col.key.toLowerCase().includes('date') && value !== '-') value = formatDate(new Date(value));
            if (col.key.toLowerCase().includes('amount') || col.key.toLowerCase().includes('value') || col.key.toLowerCase().includes('budget')) value = formatCurrency(Number(value));
            if (col.key.toLowerCase().includes('link') && value && value.startsWith('http')) value = `<a href="${value}" target="_blank" rel="noopener noreferrer">Lihat File</a>`;
            row += `<td>${value}</td>`;
        });
        row += '</tr>';
        return row;
    }).join('');

    container.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

async function handleFormSubmit(form, sheetName, dataMapper, fileInputInfo = null) {
    showLoading(form, true);
    const formData = new FormData(form);
    const addCommonFields = (d) => {
        d['Sales'] = currentUser.name;
        d['Timestamp'] = new Date().toISOString();
        d['Tanggal'] = getCurrentDateString();
        return d;
    };
    const data = addCommonFields(dataMapper(formData));

    let fileToUpload = null;
    if (fileInputInfo) {
        const fileInput = form.querySelector(`input[name="${fileInputInfo.inputName}"]`);
        if (fileInput && fileInput.files.length > 0) {
            fileToUpload = { file: fileInput.files[0], linkKey: fileInputInfo.linkKey };
        }
    }

    const success = await postData(sheetName, data, fileToUpload);
    if (success) {
        showMessage(`Data berhasil disimpan!`, 'success');
        await fetchInitialData();
        loadPageData(document.querySelector('.content-page.active').id);
        updateDashboard();
        form.reset();
    }
    showLoading(form, false);
}

function loadPageData(pageId) {
    const entries = currentData.kpiEntries;
    switch (pageId) {
        case 'input-lead': renderSummaryTable('leadSummary', entries.filter(e => e.Kategori === 'Input Lead'), [{ header: 'Customer', key: 'Nama Customer / Perusahaan' }, { header: 'Sumber', key: 'Sumber Lead' }, { header: 'Produk', key: 'Produk yang Diminati' }, { header: 'Kontak', key: 'No Kontak' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada lead yang diinput.'); break;
        case 'upload-canvasing': renderSummaryTable('canvasingSummary', entries.filter(e => e.Kategori === 'Upload Meeting Canvasing'), [{ header: 'Judul Meeting', key: 'Judul Meeting' }, { header: 'Catatan', key: 'Catatan' }, { header: 'Link File', key: 'Link File' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada upload canvasing.'); break;
        case 'upload-promosi': renderSummaryTable('promosiSummary', entries.filter(e => e.Kategori === 'Upload Promosi Campaign'), [{ header: 'Nama Campaign', key: 'Nama Campaign' }, { header: 'Platform', key: 'Platform' }, { header: 'Link Screenshot', key: 'Link Screenshot' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada upload promosi.'); break;
        case 'door-to-door': renderSummaryTable('doorToDoorSummary', entries.filter(e => e.Kategori === 'Door-to-door'), [{ header: 'Tanggal Kunjungan', key: 'Tanggal Kunjungan' }, { header: 'Nama Instansi', key: 'Nama Instansi' }, { header: 'PIC', key: 'Nama PIC Instansi' }, { header: 'Link Bukti', key: 'Link Bukti Kunjungan' },], 'Belum ada rekap door-to-door.'); break;
        case 'quotation': renderSummaryTable('quotationSummary', entries.filter(e => e.Kategori === 'Quotation'), [{ header: 'Customer', key: 'Nama Customer' }, { header: 'Jenis Produk', key: 'Jenis Produk' }, { header: 'Nominal', key: 'Nominal Quotation' }, { header: 'Link Dokumen', key: 'Link Dokumen Quotation' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada riwayat quotation.'); break;
        case 'survey-coliving': renderSummaryTable('surveySummary', entries.filter(e => e.Kategori === 'Survey Co-Living'), [{ header: 'Customer', key: 'Nama Customer' }, { header: 'Tanggal Survey', key: 'Tanggal Survey' }, { header: 'Asal', key: 'Asal Kampus/Tempat Kerja' }, { header: 'Link Dokumen', key: 'Link Dokumentasi' },], 'Belum ada hasil survey.'); break;
        case 'laporan-mingguan': renderSummaryTable('laporanSummary', entries.filter(e => e.Kategori === 'Laporan Mingguan'), [{ header: 'Periode', key: 'Periode Laporan' }, { header: 'Link Laporan', key: 'Link Dokumen Laporan' }, { header: 'Feedback', key: 'Feedback Manajemen' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada riwayat laporan mingguan.'); break;
        case 'crm-survey': const crmSalesField = document.querySelector('#crmSurveyForm input[name="salesName"]'); if (crmSalesField) crmSalesField.value = currentUser.name; renderSummaryTable('crmSurveySummary', entries.filter(e => e.Kategori === 'CRM Survey Kompetitor'), [{ header: 'Sales', key: 'Sales' }, { header: 'Kompetitor', key: 'Nama Kompetitor' }, { header: 'Website', key: 'Website' }, { header: 'Tanggal', key: 'Tanggal' },], 'Belum ada data survey kompetitor.'); break;
        case 'konversi-venue': renderSummaryTable('konversiSummary', entries.filter(e => e.Kategori === 'Konversi Booking Venue'), [{ header: 'Nama Event', key: 'Nama Event/Acara' }, { header: 'Client', key: 'Nama Client' }, { header: 'Tanggal Event', key: 'Tanggal Event' }, { header: 'Nilai Barter', key: 'Nilai Barter' },], 'Belum ada riwayat konversi venue.'); break;
        case 'event-networking': renderSummaryTable('eventSummary', entries.filter(e => e.Kategori === 'Event/Networking'), [{ header: 'Nama Event', key: 'Nama Event' }, { header: 'Jenis', key: 'Jenis Event' }, { header: 'Tanggal', key: 'Tanggal Event' }, { header: 'Link Dokumen', key: 'Link Dokumentasi' },], 'Belum ada riwayat event.'); break;
        case 'launch-campaign': renderSummaryTable('campaignSummary', entries.filter(e => e.Kategori === 'Launch Campaign'), [{ header: 'Judul Kampanye', key: 'Judul Kampanye' }, { header: 'Target Pasar', key: 'Target Pasar' }, { header: 'Tanggal', key: 'Tanggal Campaign' }, { header: 'Budget', key: 'Budget Campaign' }, { header: 'Link Materi', key: 'Link Materi Campaign' },], 'Belum ada riwayat campaign.'); break;
    }
}

// ===================================================================================
// SETUP EVENT LISTENERS (TITIK PUSAT PENGATURAN EVENT)
// ===================================================================================

function setupAppEventListeners() {
    if (document.body.dataset.appListeners === 'true') return;
    document.body.dataset.appListeners = 'true';

    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showContentPage(this.getAttribute('data-page'));
        });
    });

    document.getElementById('leadForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Input Lead', 'Nama Customer / Perusahaan': fd.get('customerName'), 'Sumber Lead': fd.get('leadSource'), 'Produk yang Diminati': fd.get('product'), 'No Kontak': fd.get('contact'), 'Catatan Awal': fd.get('notes') })); });
    document.getElementById('canvasingForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Upload Meeting Canvasing', 'Judul Meeting': fd.get('meetingTitle'), 'Catatan': fd.get('notes') }), { inputName: 'document', linkKey: 'Link File' }); });
    document.getElementById('promosiForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Upload Promosi Campaign', 'Nama Campaign': fd.get('campaignName'), 'Platform': fd.get('platform') }), { inputName: 'screenshot', linkKey: 'Link Screenshot' }); });
    document.getElementById('doorToDoorForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Door-to-door', 'Tanggal Kunjungan': fd.get('visitDate'), 'Nama Instansi': fd.get('institutionName'), 'Alamat Lengkap Instansi': fd.get('address'), 'Nama PIC Instansi': fd.get('picName'), 'Nomor HP PIC': fd.get('picPhone'), 'Hasil Respons Kunjungan': fd.get('response') }), { inputName: 'proof', linkKey: 'Link Bukti Kunjungan' }); });
    document.getElementById('quotationForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Quotation', 'Nama Customer': fd.get('customerName'), 'Jenis Produk': fd.get('productType'), 'Nominal Quotation': fd.get('quotationAmount'), 'Keterangan': fd.get('description') }), { inputName: 'quotationDoc', linkKey: 'Link Dokumen Quotation' }); });
    document.getElementById('surveyForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Survey Co-Living', 'Nama Customer': fd.get('customerName'), 'Jenis Kelamin': fd.get('gender'), 'No Telepon': fd.get('phone'), 'Tanggal Survey': fd.get('surveyDate'), 'Asal Kampus/Tempat Kerja': fd.get('origin'), 'Tanggapan Tamu': fd.get('feedback') }), { inputName: 'documentation', linkKey: 'Link Dokumentasi' }); });
    document.getElementById('laporanForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Laporan Mingguan', 'Periode Laporan': fd.get('reportPeriod'), 'Feedback Manajemen': fd.get('managementFeedback'), 'Catatan Tambahan': fd.get('additionalNotes') }), { inputName: 'reportDoc', linkKey: 'Link Dokumen Laporan' }); });
    document.getElementById('crmSurveyForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'CRM Survey Kompetitor', 'Nama Kompetitor': fd.get('competitorName'), 'Website': fd.get('website'), 'Product': fd.get('product'), 'Detail Harga': fd.get('priceDetails') })); });
    document.getElementById('konversiForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Konversi Booking Venue', 'Nama Event/Acara': fd.get('eventName'), 'Nama Client': fd.get('clientName'), 'Tanggal Event': fd.get('eventDate'), 'Jenis Venue': fd.get('venueType'), 'Nilai Barter': fd.get('barterValue'), 'Keterangan Barter': fd.get('barterDescription') })); });
    document.getElementById('eventForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Event/Networking', 'Nama Event': fd.get('eventName'), 'Jenis Event': fd.get('eventType'), 'Tanggal Event': fd.get('eventDate'), 'Lokasi Event': fd.get('eventLocation'), 'Penyelenggara': fd.get('organizer'), 'Hasil/Manfaat yang Diperoleh': fd.get('benefits') }), { inputName: 'documentation', linkKey: 'Link Dokumentasi' }); });
    document.getElementById('campaignForm')?.addEventListener('submit', e => { e.preventDefault(); handleFormSubmit(e.target, 'KPI-Entries', fd => ({ 'Kategori': 'Launch Campaign', 'Judul Kampanye': fd.get('campaignTitle'), 'Target Pasar': fd.get('targetMarket'), 'Tanggal Campaign': fd.get('campaignDate'), 'Deskripsi Konsep': fd.get('conceptDescription'), 'Potensi Traffic/Konversi': fd.get('potentialConversion'), 'Budget Campaign': fd.get('budget') }), { inputName: 'campaignMaterial', linkKey: 'Link Materi Campaign' }); });
}

// ===================================================================================
// TITIK AWAL EKSEKUSI JAVASCRIPT
// ===================================================================================

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error("Fatal Error: Login form not found on initial load!");
        return;
    }

    const loginButton = loginForm.querySelector('button[type="submit"]');
    loginButton.dataset.originalText = loginButton.innerHTML;

    showLoading(loginForm, true, 'Memuat data...');
    const dataLoaded = await fetchInitialData();
    showLoading(loginForm, false);

    if (!dataLoaded) {
        loginButton.disabled = true;
        return;
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (login(username, password)) {
            showPage('mainApp');
        } else {
            showMessage('Username atau password salah!', 'error');
        }
    });
});
