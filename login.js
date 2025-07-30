/**
 * @file login.js
 * @description Handles logic for the login page using Firebase Authentication.
 * @version 3.1.0 - Added password visibility toggle.
 */

// SVG Icons for password toggle
const eyeIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>`;

const eyeOffIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>`;


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    // [NEW] Setup for password toggle
    if (togglePassword) {
        togglePassword.innerHTML = eyeIconSVG; // Set initial icon

        togglePassword.addEventListener('click', function () {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle the icon
            this.innerHTML = type === 'password' ? eyeIconSVG : eyeOffIconSVG;
        });
    }


    // Cek status login pengguna saat halaman dimuat
    auth.onAuthStateChanged(user => {
        if (user) {
            // Pengguna sudah login, dapatkan data tambahan dari Firestore
            // [FIXED] Mengubah 'users' menjadi 'Users' agar sesuai dengan nama koleksi di Firestore
            db.collection('Users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const userData = { uid: user.uid, email: user.email, ...doc.data() };
                    localStorage.setItem('currentUser', JSON.stringify(userData));
                    
                    // Arahkan berdasarkan peran
                    if (userData.role === 'management') {
                        window.location.href = 'dashboard-manajemen.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    // Jika data user di firestore tidak ada, logout saja
                    console.error("User document not found in Firestore for UID:", user.uid);
                    errorMessageDiv.textContent = 'Data pengguna tidak ditemukan. Hubungi administrator.';
                    errorMessageDiv.style.display = 'block';
                    auth.signOut();
                }
            }).catch(error => {
                console.error("Error fetching user document:", error);
                auth.signOut();
            });
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value; // Asumsikan username adalah email
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        submitButton.textContent = 'Mencoba Login...';
        submitButton.disabled = true;
        errorMessageDiv.style.display = 'none';

        try {
            // Login menggunakan Firebase Auth
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged akan menangani pengalihan halaman secara otomatis
            
        } catch (error) {
            console.error('Firebase Login error:', error);
            let message = 'Username atau password salah!';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Username atau password yang Anda masukkan salah.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Format email yang Anda masukkan tidak valid.';
            } else {
                message = 'Terjadi kesalahan saat mencoba login.';
            }
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            submitButton.textContent = 'Login';
            submitButton.disabled = false;
        }
    });
});
