// ===================================================================================
// PENGATURAN KONEKSI KE GOOGLE SHEETS
// Ganti URL ini dengan URL Web App dari Google Apps Script Anda setelah di-deploy.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec';
// ===================================================================================

// Application state
let currentUser = null;
let appData = { users: [], targets: [] };
let currentData = { kpiEntries: [] };

// Utility functions
function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount); }
function formatDate(date) { if (!date) return ''; const dateObj = typeof date === 'string' ? new Date(date) : date; if (isNaN(dateObj)) return ''; return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(dateObj); }
function getCurrentDateString() { return new Date().toISOString().split('T')[0]; }
function showLoading(form, isLoading) { const button = form.querySelector('button[type="submit"]'); if (button) { if (isLoading) { button.disabled = true; button.innerHTML = '<span class="loading"></span> Mengunggah...'; } else { button.disabled = false; button.innerHTML = button.dataset.originalText || 'Simpan'; } } }

// Fungsi untuk membaca file sebagai Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===================================================================================
// FUNGSI KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
// ===================================================================================
async function fetchInitialData() { /* ... (sama seperti sebelumnya) ... */ }
async function postData(sheetName, data, fileInfo = null) {
    try {
        let payload = { sheetName, data };
        // Jika ada file yang akan diunggah, ubah menjadi base64 dan tambahkan ke payload
        if (fileInfo && fileInfo.file) {
            const base64String = await fileToBase64(fileInfo.file);
            payload.fileData = {
                base64: base64String,
                mimeType: fileInfo.file.type,
                fileName: fileInfo.file.name,
                linkKey: fileInfo.linkKey // Nama kolom di sheet untuk menyimpan link
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
// AUTHENTICATION & PAGE MANAGEMENT
// ===================================================================================
function login(username, password) { /* ... (sama) ... */ }
function logout() { /* ... (sama) ... */ }
function showPage(pageId) { /* ... (sama) ... */ }
function showContentPage(pageId) { /* ... (sama) ... */ }

// ===================================================================================
// DASHBOARD & DATA DISPLAY
// ===================================================================================
function updateDateTime() { /* ... (sama) ... */ }
function updateDashboard() { /* ... (sama) ... */ }
function renderSummaryTable(containerId, data, columns, emptyMessage) { /* ... (sama seperti sebelumnya, tapi sekarang akan menampilkan link GDrive) ... */ }

// ===================================================================================
// FORM HANDLERS
// ===================================================================================
async function handleFormSubmit(form, sheetName, dataMapper, fileInputInfo = null) {
    showLoading(form, true);
    const formData = new FormData(form);
    
    // Tambahkan field umum ke data
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
            fileToUpload = {
                file: fileInput.files[0],
                linkKey: fileInputInfo.linkKey
            };
        }
    }
    
    const success = await postData(sheetName, data, fileToUpload);
    if (success) {
        showMessage(`${sheetName.replace('KPI-Entries', 'Data')} berhasil disimpan!`, 'success');
        await fetchInitialData(); // Ambil data terbaru
        loadPageData(document.querySelector('.content-page.active').id);
        updateDashboard();
        form.reset();
    } else {
        showMessage(`Gagal menyimpan data.`, 'error');
    }
    showLoading(form, false);
}

function loadPageData(pageId) {
    // Implementasi loadPageData dengan renderSummaryTable seperti sebelumnya
    // Contoh untuk satu halaman:
    switch(pageId) {
        case 'upload-canvasing':
           renderSummaryTable('canvasingSummary', currentData.kpiEntries.filter(e => e.Kategori === 'Upload Meeting Canvasing'), [
              { header: 'Judul Meeting', key: 'Judul Meeting' },
              { header: 'Catatan', key: 'Catatan' },
              { header: 'Link File', key: 'Link File' }, // Kolom ini akan berisi link GDrive
              { header: 'Tanggal', key: 'Tanggal' },
          ], 'Belum ada upload canvasing.');
          break;
        // ... tambahkan case untuk halaman lain
    }
}


// ===================================================================================
// EVENT LISTENERS
// ===================================================================================
document.addEventListener('DOMContentLoaded', async function() {
    // ... (fungsi inisialisasi sama seperti sebelumnya) ...

    // --- CONTOH EVENT LISTENER BARU UNTUK FORM DENGAN FILE ---
    
    document.getElementById('canvasingForm').addEventListener('submit', e => {
        e.preventDefault();
        handleFormSubmit(e.target, 'KPI-Entries', 
            fd => ({ // dataMapper
                'Kategori': 'Upload Meeting Canvasing',
                'Judul Meeting': fd.get('meetingTitle'),
                'Catatan': fd.get('notes')
            }),
            { inputName: 'document', linkKey: 'Link File' } // fileInputInfo
        );
    });

    document.getElementById('promosiForm').addEventListener('submit', e => {
        e.preventDefault();
        handleFormSubmit(e.target, 'KPI-Entries',
            fd => ({
                'Kategori': 'Upload Promosi Campaign',
                'Nama Campaign': fd.get('campaignName'),
                'Platform': fd.get('platform')
            }),
            { inputName: 'screenshot', linkKey: 'Link Screenshot' }
        );
    });

    document.getElementById('doorToDoorForm').addEventListener('submit', e => {
        e.preventDefault();
        handleFormSubmit(e.target, 'KPI-Entries',
            fd => ({
                'Kategori': 'Door-to-door',
                'Tanggal Kunjungan': fd.get('visitDate'),
                'Nama Instansi': fd.get('institutionName'),
                'Alamat Lengkap Instansi': fd.get('address'),
                'Nama PIC Instansi': fd.get('picName'),
                'Nomor HP PIC': fd.get('picPhone'),
                'Hasil Respons Kunjungan': fd.get('response')
            }),
            { inputName: 'proof', linkKey: 'Link Bukti Kunjungan' }
        );
    });
    
    // Lanjutkan pola yang sama untuk semua form lain yang memiliki input file...
    // Contoh untuk Quotation:
    document.getElementById('quotationForm').addEventListener('submit', e => {
        e.preventDefault();
        handleFormSubmit(e.target, 'KPI-Entries',
            fd => ({
                'Kategori': 'Quotation',
                'Nama Customer': fd.get('customerName'),
                'Jenis Produk': fd.get('productType'),
                'Nominal Quotation': fd.get('quotationAmount'),
                'Keterangan': fd.get('description')
            }),
            { inputName: 'quotationDoc', linkKey: 'Link Dokumen Quotation' }
        );
    });

    // ... Dan seterusnya untuk form: surveyForm, laporanForm, eventForm, campaignForm

    // --- FORM TANPA FILE TETAP SAMA ---
    document.getElementById('leadForm').addEventListener('submit', e => {
        e.preventDefault();
        handleFormSubmit(e.target, 'KPI-Entries', fd => ({
            'Kategori': 'Input Lead',
            'Nama Customer / Perusahaan': fd.get('customerName'),
            'Sumber Lead': fd.get('leadSource'),
            'Produk yang Diminati': fd.get('product'),
            'No Kontak': fd.get('contact'),
            'Catatan Awal': fd.get('notes')
        })); // Tidak ada argumen ke-4 karena tidak ada file
    });
    
    // ... Lanjutkan untuk crmSurveyForm dan konversiForm
});

// Utility function for showing messages
function showMessage(message, type = 'info') { /* ... (sama) ... */ }

// NOTE: Potongan kode yang tidak berubah (seperti fetchInitialData, login, dll.) disingkat agar fokus pada perubahan.
// Anda harus menggabungkan logika baru ini dengan file app.js Anda yang sudah ada.
