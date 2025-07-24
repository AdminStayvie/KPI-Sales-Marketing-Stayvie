/**
 * @file login.js
 * @description Handles logic for the login page using Firebase Authentication.
 * @version 3.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Cek status login pengguna saat halaman dimuat
    auth.onAuthStateChanged(user => {
        if (user) {
            // Pengguna sudah login, dapatkan data tambahan dari Firestore
            db.collection('users').doc(user.uid).get().then(doc => {
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
                    auth.signOut();
                }
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
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
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
