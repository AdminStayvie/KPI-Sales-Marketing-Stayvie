/**
 * @file login.js
 * @description Handles logic for the login page by fetching user data from Google Sheets.
 * @version 2.0.0
 *
 * Perubahan Utama (v2.0.0):
 * - ROLE-BASED REDIRECTION: Mengarahkan pengguna ke dashboard yang sesuai ('management' atau 'sales').
 */

document.addEventListener('DOMContentLoaded', () => {
    // URL Google Apps Script, pastikan ini adalah URL yang benar dari deployment Anda.
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Jika pengguna sudah login, langsung arahkan ke dashboard yang sesuai.
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        if (user.role === 'management') {
            window.location.href = 'dashboard-manajemen.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        submitButton.textContent = 'Mencoba Login...';
        submitButton.disabled = true;
        errorMessageDiv.style.display = 'none';

        const payload = {
            action: 'login',
            username: username,
            password: password
        };

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success' && result.data.user) {
                // Simpan informasi pengguna ke localStorage
                localStorage.setItem('currentUser', JSON.stringify(result.data.user));
                
                submitButton.textContent = 'Login Berhasil, Mengarahkan...';

                // --- LOGIKA PENGALIHAN BERDASARKAN PERAN ---
                if (result.data.user.role === 'management') {
                    window.location.href = 'dashboard-manajemen.html';
                } else {
                    window.location.href = 'dashboard.html';
                }

            } else {
                errorMessageDiv.textContent = result.message || 'Username atau password salah!';
                errorMessageDiv.style.display = 'block';
                submitButton.textContent = 'Login';
                submitButton.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessageDiv.textContent = 'Terjadi kesalahan saat menghubungi server.';
            errorMessageDiv.style.display = 'block';
            submitButton.textContent = 'Login';
            submitButton.disabled = false;
        }
    });
});
