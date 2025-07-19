/**
 * @file login.js
 * @description Handles logic for the login page by fetching user data from Google Sheets.
 */

document.addEventListener('DOMContentLoaded', () => {
    // URL Google Apps Script, pastikan ini adalah URL yang benar dari deployment Anda.
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztwK8UXJy1AFxfuftVvVGJzoXLxtnKbS9sZ4VV2fQy3dgmb0BkSR_qBZMWZhLB3pChIg/exec";

    const loginForm = document.getElementById('loginForm');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Jika pengguna sudah login di sesi sebelumnya, langsung arahkan ke dashboard.
    if (localStorage.getItem('currentUser')) {
        window.location.href = 'dashboard.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        submitButton.textContent = 'Mencoba Login...';
        submitButton.disabled = true;
        errorMessageDiv.style.display = 'none';

        // Payload yang akan dikirim ke Google Apps Script
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

            if (result.status === 'success' && result.user) {
                // Jika berhasil, simpan informasi pengguna ke localStorage
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                
                // Arahkan ke dashboard
                submitButton.textContent = 'Login Berhasil, Mengarahkan...';
                window.location.href = 'dashboard.html';
            } else {
                // Jika gagal, tampilkan pesan error dari server
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
