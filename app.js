// ===================================================================================
// PENGATURAN KONEKSI KE GOOGLE SHEETS
// Pastikan URL ini sudah benar!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec';
// ===================================================================================

// Application state
let currentUser = null;
let appData = { users: [], targets: [] };
let currentData = { kpiEntries: [] };

// ... (semua fungsi utility seperti formatCurrency, formatDate, dll. tetap sama) ...
function formatCurrency(amount) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount); }
function formatDate(date) { if (!date) return ''; const dateObj = typeof date === 'string' ? new Date(date) : date; if (isNaN(dateObj)) return ''; return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(dateObj); }
function getCurrentDateString() { return new Date().toISOString().split('T')[0]; }
function showLoading(form, isLoading, message = 'Mengirim...') { const button = form.querySelector('button[type="submit"]'); if (button) { if (isLoading) { button.disabled = true; button.innerHTML = `<span class="loading"></span> ${message}`; } else { button.disabled = false; button.innerHTML = button.dataset.originalText || 'Simpan'; } } }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }


// ===================================================================================
// FUNGSI KOMUNIKASI DENGAN GOOGLE APPS SCRIPT (DIPERBARUI)
// ===================================================================================
async function fetchInitialData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`);
        if (!response.ok) {
            // Jika gagal, coba dapatkan pesan error dari server
            const errorBody = await response.text();
            throw new Error(`Gagal terhubung ke server. Status: ${response.status}. Pesan: ${errorBody}`);
        }
        const data = await response.json();
        if (data.error) { // Jika Apps Script mengembalikan error terstruktur
             throw new Error(`Error dari server: ${data.error}`);
        }
        appData.users = data.users || [];
        appData.targets = data.targets || [];
        currentData.kpiEntries = data.kpiEntries || [];
        console.log("Initial data loaded successfully.");
        return true;
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // Tampilkan error ke pengguna di halaman login
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            let errorDiv = loginContainer.querySelector('.message.error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'message error';
                const loginCard = loginContainer.querySelector('.login-card');
                loginCard.parentNode.insertBefore(errorDiv, loginCard);
            }
            errorDiv.textContent = 'Gagal memuat data. Pastikan koneksi internet stabil dan konfigurasi server benar. Coba muat ulang halaman.';
        }
        return false;
    }
}

async function postData(sheetName, data, fileInfo = null) {
    // ... (Fungsi postData tetap sama seperti sebelumnya) ...
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
// AUTHENTICATION & PAGE MANAGEMENT (DIPERBARUI)
// ===================================================================================
function login(username, password) {
  // Pastikan appData.users ada dan bukan array kosong
  if (!appData.users || appData.users.length === 0) {
      showMessage('Data pengguna tidak ditemukan. Gagal login.', 'error');
      return false;
  }
  const user = appData.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password.toString() === password);
  if (user) {
    currentUser = user;
    document.body.setAttribute('data-role', user.role);
    return true;
  }
  return false;
}
// ... (sisa fungsi page management tetap sama) ...
function logout() { /* ... (sama) ... */ }
function showPage(pageId) { /* ... (sama) ... */ }
function showContentPage(pageId) { /* ... (sama) ... */ }


// ===================================================================================
// EVENT LISTENERS (DIPERBARUI)
// ===================================================================================
document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('loginForm');
    const loginButton = loginForm.querySelector('button[type="submit"]');
    loginButton.dataset.originalText = loginButton.innerHTML; // Simpan teks asli

    showLoading(loginForm, true, 'Memuat data...');

    const dataLoaded = await fetchInitialData();
    
    // Sembunyikan loading setelah selesai, baik berhasil maupun gagal
    showLoading(loginForm, false);

    if (!dataLoaded) {
        // Jika data gagal dimuat, jangan lanjutkan setup event listener lain
        loginButton.disabled = true; // Matikan tombol login
        return;
    }
    
    // Event listener untuk form login
    loginForm.addEventListener('submit', function(e) {
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

    // ... (Semua event listener lain untuk form KPI tetap sama) ...
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.querySelectorAll('.nav-link').forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); showContentPage(this.getAttribute('data-page')); }); });
    // Dst. untuk semua form
});

// ... (sisa fungsi lain seperti handleFormSubmit, renderSummaryTable, showMessage, dll. tetap sama) ...
