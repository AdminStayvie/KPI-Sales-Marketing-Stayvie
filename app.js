// ===================================================================================
// PENGATURAN KONEKSI KE GOOGLE SHEETS
// Pastikan URL ini sudah benar!
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec';
// ===================================================================================

// Application state
let currentUser = null;
let appData = { users: [], targets: [] };
let currentData = { kpiEntries: [] };

// Utility Functions
function formatCurrency(amount) { /* ... sama ... */ }
function formatDate(date) { /* ... sama ... */ }
function getCurrentDateString() { /* ... sama ... */ }
function showLoading(form, isLoading, message = 'Mengirim...') { /* ... sama ... */ }
function fileToBase64(file) { /* ... sama ... */ }
function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    const mainContent = document.querySelector('.main-content');
    // Jika di halaman utama, tampilkan di atas. Jika tidak, tampilkan di halaman login.
    if (mainContent) {
        mainContent.insertBefore(notification, mainContent.firstChild);
    } else {
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.parentNode.insertBefore(notification, loginCard);
        }
    }
    setTimeout(() => { notification.remove(); }, 4000);
}

// ===================================================================================
// FUNGSI KOMUNIKASI DENGAN GOOGLE APPS SCRIPT
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
            errorDiv.textContent = 'Gagal memuat data. Pastikan konfigurasi server benar dan coba muat ulang.';
        }
        return false;
    }
}

async function postData(sheetName, data, fileInfo = null) {
    // ... (Fungsi postData tetap sama) ...
}

// ===================================================================================
// AUTHENTICATION & PAGE MANAGEMENT
// ===================================================================================
function login(username, password) {
  if (!appData.users || appData.users.length === 0) {
      showMessage('Data pengguna tidak dapat dimuat. Gagal login.', 'error');
      return false;
  }
  // Memastikan password dari GSheet diperlakukan sebagai string
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
    showPage('loginPage');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    if (pageId === 'mainApp') {
        // Panggil setup untuk elemen-elemen di dalam mainApp SETELAH ditampilkan
        setupAppEventListeners();
        updateDateTime();
        updateDashboard();
    }
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    
    loadPageData(pageId);
}

// ... (Sisa fungsi seperti updateDashboard, renderSummaryTable, handleFormSubmit, dll. tetap sama) ...


// ===================================================================================
// SETUP EVENT LISTENERS (DIRESTRUKTURISASI)
// ===================================================================================

/**
 * Fungsi ini hanya mengatur event listener untuk halaman login.
 * Dijalankan saat DOM pertama kali dimuat.
 */
async function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error("Fatal Error: Login form not found!");
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
            showContentPage('dashboard');
        } else {
            showMessage('Username atau password salah!', 'error');
        }
    });
}

/**
 * Fungsi ini mengatur SEMUA event listener untuk aplikasi utama.
 * Fungsi ini dipanggil HANYA SETELAH login berhasil.
 */
function setupAppEventListeners() {
    // Tombol Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Navigasi Sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showContentPage(this.getAttribute('data-page'));
        });
    });

    // Semua Form KPI
    // Anda bisa menambahkan semua event listener form di sini
    // Contoh:
    const canvasingForm = document.getElementById('canvasingForm');
    if (canvasingForm) {
        canvasingForm.addEventListener('submit', e => {
            e.preventDefault();
            // handleFormSubmit(...);
        });
    }
    
    const leadForm = document.getElementById('leadForm');
    if(leadForm) {
        leadForm.addEventListener('submit', e => {
            e.preventDefault();
            // handleFormSubmit(...);
        });
    }
    // ... dan seterusnya untuk semua form lainnya.
    // Ini memastikan script tidak crash jika salah satu form tidak ditemukan.
}


// Titik Awal Eksekusi JavaScript
document.addEventListener('DOMContentLoaded', function() {
    setupLogin();
});
