/**
 * @file app.js
 * @description Logika utama untuk dashboard KPI Sales, diadaptasi untuk Firebase dengan unggahan file ke Google Drive.
 * @version 10.0.0 - Migrasi unggahan file dari Firebase Storage ke Google Apps Script.
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
let currentUser;
let unsubscribeListeners = [];

auth.onAuthStateChanged(user => {
    if (user) {
        const userJSON = localStorage.getItem('currentUser');
        if (userJSON) {
            currentUser = JSON.parse(userJSON);
            if (currentUser.uid === user.uid) {
                initializeApp();
            } else {
                fetchUserAndInitialize(user);
            }
        } else {
            fetchUserAndInitialize(user);
        }
    } else {
        unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        unsubscribeListeners = [];
        window.location.href = 'index.html';
    }
});

function fetchUserAndInitialize(user) {
    db.collection('Users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            currentUser = { uid: user.uid, email: user.email, ...doc.data() };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            initializeApp();
        } else {
            showMessage('Data pengguna tidak ditemukan di database.', 'error');
            auth.signOut();
        }
    }).catch(error => {
        showMessage(`Gagal mengambil data pengguna: ${error.message}`, 'error');
        auth.signOut();
    });
}


// =================================================================================
// KONFIGURASI TERPUSAT
// =================================================================================
const CONFIG = {
    targets: {
        daily: [
            { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads', page: 'input-lead' },
            { id: 2, name: "Konversi Lead Menjadi Prospek", target: 5, penalty: 20000, dataKey: 'prospects', page: 'input-lead' },
            { id: 3, name: "Promosi Campaign Package", target: 2, penalty: 10000, dataKey: 'promosi', page: 'upload-promosi' }
        ],
        weekly: [
            { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'canvasing', page: 'upload-canvasing' },
            { id: 5, name: "Door-to-door perusahaan", target: 3, penalty: 150000, dataKey: 'doorToDoor', page: 'door-to-door' },
            { id: 6, name: "Menyampaikan Quotation", target: 1, penalty: 50000, dataKey: 'quotations', page: 'quotation' },
            { id: 7, name: "Survey pengunjung Co-living", target: 4, penalty: 50000, dataKey: 'surveys', page: 'survey-coliving' },
            { id: 8, name: "Laporan Ringkas Mingguan", target: 1, penalty: 50000, dataKey: 'reports', page: 'laporan-mingguan' },
            { id: 9, name: "Input CRM Survey kompetitor", target: 1, penalty: 25000, dataKey: 'crmSurveys', page: 'crm-survey' },
            { id: 10, name: "Konversi Booking Venue Barter", target: 1, penalty: 75000, dataKey: 'conversions', page: 'konversi-venue' }
        ],
        monthly: [
            { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'b2bBookings', page: 'input-lead' },
            { id: 12, name: "Konversi Booking Venue", target: 2, penalty: 200000, dataKey: 'venueBookings', page: 'input-lead' },
            { id: 13, name: "Mengikuti Event/Networking", target: 1, penalty: 125000, dataKey: 'events', page: 'event-networking' },
            { id: 14, name: "Launch Campaign Package", target: 1, penalty: 150000, dataKey: 'campaigns', page: 'launch-campaign' }
        ]
    },
    dataMapping: {
        'leads': { sheetName: 'Leads', headers: ['Waktu', 'Customer', 'Produk', 'Status Lead', 'Status Validasi', 'Aksi'], rowGenerator: 'generateLeadRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'prospects': { sheetName: 'Prospects', headers: ['Waktu', 'Customer', 'Produk', 'Status Lead', 'Status Validasi', 'Aksi'], rowGenerator: 'generateLeadRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'b2bBookings': { sheetName: 'B2BBookings', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'venueBookings': { sheetName: 'VenueBookings', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'dealLainnya': { sheetName: 'Deal Lainnya', headers: ['Waktu', 'Customer', 'Produk', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { timestamp: 'Waktu Input', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status', revisionLog: 'Log Revisi' } },
        'canvasing': { sheetName: 'Canvasing', headers: ['Waktu', 'Judul Meeting', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'promosi': { sheetName: 'Promosi', headers: ['Waktu', 'Campaign', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' }},
        'doorToDoor': { sheetName: 'DoorToDoor', headers: ['Waktu', 'Instansi', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'quotations': { sheetName: 'Quotations', headers: ['Waktu', 'Customer', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'surveys': { sheetName: 'Surveys', headers: ['Waktu', 'Customer', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'reports': { sheetName: 'Reports', headers: ['Waktu', 'Periode', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Upload', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'crmSurveys': { sheetName: 'CRMSurveys', headers: ['Waktu', 'Kompetitor', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'conversions': { sheetName: 'Conversions', headers: ['Waktu', 'Event', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'events': { sheetName: 'Events', headers: ['Waktu', 'Nama Event', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
        'campaigns': { sheetName: 'Campaigns', headers: ['Waktu', 'Judul', 'Status Validasi', 'Aksi'], rowGenerator: 'generateSimpleRow', detailLabels: { datestamp: 'Waktu Input', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', revisionLog: 'Log Revisi' } },
    }
};

const FORM_PAGE_MAP = {
    'leads': 'input-lead', 'prospects': 'input-lead', 'b2bBookings': 'input-lead', 'venueBookings': 'input-lead', 'dealLainnya': 'input-lead',
    'canvasing': 'upload-canvasing', 'promosi': 'upload-promosi', 'doorToDoor': 'door-to-door', 'quotations': 'quotation',
    'surveys': 'survey-coliving', 'reports': 'laporan-mingguan', 'crmSurveys': 'crm-survey', 'conversions': 'konversi-venue',
    'events': 'event-networking', 'campaigns': 'launch-campaign'
};

let currentData = {};
let isFetchingData = false;
let performanceReportWeekOffset = 0;

// =================================================================================
// FUNGSI PENGAMBILAN & PENGIRIMAN DATA (DENGAN UPLOAD KE GDRIVE)
// =================================================================================

/**
 * [MODIFIKASI] Mengirim file ke Google Drive melalui Google Apps Script.
 * @param {File} file - Objek file dari input form.
 * @returns {Promise<string|null>} - URL file yang dapat diakses publik dari Google Drive atau null jika gagal.
 */
async function uploadFile(file) {
    if (!file) return null;

    // URL dari Google Apps Script Web App Anda
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0o1xUtRSksLhlZCgDYCyJt-FS1bM2rKzIIuKLPDV0IRbo_NWlR1PI1s0P04ESO_VyBw/exec";

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // e.target.result berisi data URL base64 (contoh: "data:image/jpeg;base64,/9j/4AAQSkZJRg...")
                const fileDataAsBase64 = e.target.result;

                const payload = {
                    fileName: file.name,
                    mimeType: file.type,
                    fileData: fileDataAsBase64
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    // Karena payload dikirim sebagai JSON, kita tidak bisa menggunakan 'no-cors'.
                    // Apps Script harus dikonfigurasi untuk menangani permintaan CORS.
                    // doGet(e) dan doPost(e) di Apps Script secara otomatis menangani preflight requests.
                    body: JSON.stringify(payload),
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8", // Sesuai dengan tipe konten yang diterima Apps Script
                    },
                });
                
                // Membaca response sebagai JSON
                const result = await response.json();

                if (result.status === "success" && result.url) {
                    console.log("Upload ke GDrive berhasil:", result.url);
                    resolve(result.url);
                } else {
                    // Jika ada pesan error dari script, tampilkan
                    throw new Error(result.message || 'Gagal mengunggah file ke Google Drive.');
                }

            } catch (error) {
                console.error('Google Drive Upload Error:', error);
                reject(error);
            }
        };
        reader.onerror = error => {
            console.error('File Reader Error:', error);
            reject(error);
        };
        // Membaca file sebagai Data URL (base64)
        reader.readAsDataURL(file);
    });
}


function setupRealtimeListeners() {
    unsubscribeListeners.forEach(unsubscribe => unsubscribe());
    unsubscribeListeners = [];

    showMessage("Menyambungkan ke server...", "info");
    document.body.style.cursor = 'wait';

    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    const collectionsToFetch = Object.keys(CONFIG.dataMapping);
    
    collectionsToFetch.forEach(dataKey => {
        const collectionName = CONFIG.dataMapping[dataKey].sheetName;
        const query = db.collection(collectionName)
            .where('sales', '==', currentUser.name)
            .where('timestamp', '>=', periodStartDate.toISOString())
            .where('timestamp', '<=', periodEndDate.toISOString());

        const unsubscribe = query.onSnapshot(snapshot => {
            currentData[dataKey] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateAllUI();
            document.body.style.cursor = 'default';
        }, error => {
            let errorMessage = `Gagal memuat data ${collectionName}: ${error.message}`;
            if (error.code === 'failed-precondition') {
                errorMessage = `Gagal memuat data karena indeks database tidak ada. Buka Console (F12), cari pesan error, lalu klik link yang diberikan untuk membuat indeks secara otomatis di Firebase. Setelah indeks selesai dibuat (beberapa menit), refresh halaman ini.`;
            }
            showMessage(errorMessage, 'error');
            console.error(`Listen error for ${collectionName}:`, error);
            document.body.style.cursor = 'default';
        });
        unsubscribeListeners.push(unsubscribe);
    });

    const settingsUnsubscribe = db.collection('settings').onSnapshot(snapshot => {
        snapshot.forEach(doc => {
            if (doc.id === 'kpi') {
                currentData.kpiSettings = doc.data();
            } else if (doc.id === 'timeOff') {
                currentData.timeOff = doc.data().entries || [];
            }
        });
        updateAllUI();
        updateSidebarMenuState(); 
    });
    unsubscribeListeners.push(settingsUnsubscribe);
}


async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const collectionName = form.dataset.sheetName;
    if (!collectionName) return;

    const button = form.querySelector('button[type="submit"]');
    let originalButtonText = '';
    if (button) {
        originalButtonText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> Mengirim...';
        button.disabled = true;
    }

    try {
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (!(value instanceof File)) {
                data[key] = value;
            }
        }
        
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                // [MODIFIKASI] Memanggil fungsi uploadFile yang baru
                const downloadURL = await uploadFile(value);
                data[key] = downloadURL;
            }
        }

        data.sales = currentUser.name;
        data.timestamp = new Date().toISOString(); 
        data.datestamp = getDatestamp();
        data.validationStatus = 'Pending';
        data.validationNotes = '';
        
        if (collectionName === 'Leads') {
            data.status = 'Lead';
            data.statusLog = `${getDatestamp()}: Dibuat sebagai Lead.`;
        }
        
        await db.collection(collectionName).add(data);
        
        showMessage('Data berhasil disimpan!', 'success');
        form.reset();
        
    } catch (error) {
        showMessage(`Gagal menyimpan data: ${error.message}.`, 'error');
        console.error("Save data error:", error);
    } finally {
        if (button) {
            button.innerHTML = originalButtonText;
            button.disabled = false;
        }
    }
}

function getDealCollectionName(product) {
    const productLower = product.toLowerCase();
    if (product === 'Kamar Hotel B2B') {
        return 'B2BBookings';
    } else if (productLower.includes('venue') || productLower.includes('package')) {
        return 'VenueBookings';
    }
    return 'Deal Lainnya';
}

async function handleUpdateLead(e) {
    e.preventDefault();
    const form = e.target;
    const leadId = form.querySelector('#updateLeadId').value;
    const newStatus = form.querySelector('#updateStatus').value;
    const notes = form.querySelector('#statusLog').value;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
        const allLeadsAndProspects = [...(currentData.leads || []), ...(currentData.prospects || [])];
        const leadData = allLeadsAndProspects.find(item => item && item.id === leadId);

        if (!leadData) throw new Error('Data asli tidak ditemukan!');

        const sourceCollectionName = leadData.status === 'Lead' ? 'Leads' : 'Prospects';
        const originalDocRef = db.collection(sourceCollectionName).doc(leadId);
        
        if (sourceCollectionName === 'Leads' && newStatus === 'Prospect') {
            const originalDoc = await originalDocRef.get();
            if (!originalDoc.exists) throw new Error("Dokumen Lead asli tidak ditemukan di database.");

            const newData = { ...originalDoc.data() };
            newData.status = 'Prospect';
            newData.statusLog = (newData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi Prospect. Catatan: ${notes}`;
            newData.timestamp = new Date().toISOString();
            newData.datestamp = getDatestamp();
            
            await db.collection('Prospects').add(newData);

            await originalDocRef.update({
                status: 'Prospect',
                statusLog: newData.statusLog
            });

        } else if (newStatus === 'Deal') {
            const originalDoc = await originalDocRef.get();
            if (!originalDoc.exists) throw new Error("Dokumen asli tidak ditemukan di database.");

            const dealCollectionName = getDealCollectionName(leadData.product);
            
            const newData = { ...originalDoc.data() };
            newData.status = 'Deal';
            newData.statusLog = (newData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi Deal. Catatan: ${notes}`;
            newData.timestamp = new Date().toISOString();
            newData.datestamp = getDatestamp();
            
            const proofInput = form.querySelector('#modalProofOfDeal');
            if (proofInput && proofInput.files.length > 0) {
                // [MODIFIKASI] Memanggil fungsi uploadFile yang baru
                newData.proofOfDeal = await uploadFile(proofInput.files[0]);
            } else if (!leadData.proofOfDeal) {
                throw new Error('Bukti deal wajib diunggah saat mengubah status menjadi "Deal".');
            }

            await db.collection(dealCollectionName).add(newData);

            await originalDocRef.update({
                status: 'Deal',
                statusLog: newData.statusLog
            });

        } else {
            const updatedLog = (leadData.statusLog || '') + `\n${getDatestamp()}: Status diubah menjadi ${newStatus}. Catatan: ${notes}`;
            await originalDocRef.update({
                status: newStatus,
                statusLog: updatedLog
            });
        }

        showMessage('Status berhasil diperbarui!', 'success');
        closeModal();

    } catch (error) {
        showMessage(`Gagal memperbarui status: ${error.message}`, 'error');
        console.error("Update Lead Error:", error);
    } finally {
        button.disabled = false;
    }
}


async function handleRevisionSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const collectionName = form.dataset.sheetName;
    const id = form.dataset.id;
    if (!collectionName || !id) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
        const originalDocRef = db.collection(collectionName).doc(id);
        const originalDoc = await originalDocRef.get();
        if (!originalDoc.exists) {
            throw new Error("Dokumen yang akan direvisi tidak ditemukan.");
        }
        const originalData = originalDoc.data();

        const formData = new FormData(form);
        const dataToUpdate = {};
        
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                // [MODIFIKASI] Memanggil fungsi uploadFile yang baru
                const downloadURL = await uploadFile(value);
                dataToUpdate[key] = downloadURL;
            } else if (!(value instanceof File)) {
                dataToUpdate[key] = value;
            }
        }
        
        dataToUpdate.validationStatus = 'Pending';
        dataToUpdate.validationNotes = '';
        
        const revisionEntry = `${getDatestamp()}: Data direvisi oleh ${currentUser.name}.`;
        dataToUpdate.revisionLog = originalData.revisionLog ? `${originalData.revisionLog}\n${revisionEntry}` : revisionEntry;
        
        if (collectionName === 'Leads') {
            dataToUpdate.status = 'Lead';
        } else if (collectionName === 'Prospects') {
            dataToUpdate.status = 'Prospect';
        }

        await originalDocRef.update(dataToUpdate);

        showMessage('Data revisi berhasil dikirim!', 'success');
        closeModal();

    } catch (error) {
        showMessage(`Gagal mengirim revisi: ${error.message}`, 'error');
        console.error("Revision Submit Error:", error);
    } finally {
        button.disabled = false;
    }
}

// =================================================================================
// FUNGSI UI & PERHITUNGAN (TIDAK ADA PERUBAHAN DI SINI)
// =================================================================================

function updateSidebarMenuState() {
    const kpiSettings = currentData.kpiSettings || {};
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];

    const pageToTargetId = {};
    allTargets.forEach(target => {
        if (!pageToTargetId[target.page]) {
            pageToTargetId[target.page] = [];
        }
        pageToTargetId[target.page].push(target.id);
    });

    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        const page = link.dataset.page;
        if (pageToTargetId[page]) {
            const allTargetsForPageDisabled = pageToTargetId[page].every(id => kpiSettings[id] === false);

            const existingSpan = link.querySelector('.inactive-span');
            if (allTargetsForPageDisabled) {
                if (!existingSpan) {
                    const span = document.createElement('span');
                    span.textContent = ' (non aktif)';
                    span.className = 'inactive-span';
                    span.style.opacity = '0.6';
                    span.style.fontSize = '0.9em';
                    link.appendChild(span);
                }
                link.style.pointerEvents = 'none';
                link.style.opacity = '0.5';
            } else {
                if (existingSpan) {
                    existingSpan.remove();
                }
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
            }
        }
    });
}


function updateAllUI() {
    try {
        updateDashboard();
        updateAllSummaries();
        calculateAndDisplayPenalties();
        updateValidationBreakdown();
        renderPerformanceReport();
        updateSidebarMenuState(); 
    } catch (error) {
        console.error("Error updating UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data. Coba refresh halaman.", "error");
    }
}

function getFilteredData(dataType, validationFilter = ['approved']) {
    const data = currentData[dataType] || [];
    if (!Array.isArray(data)) return [];
    if (validationFilter.includes('all')) {
        return data;
    }
    const lowerCaseFilter = validationFilter.map(f => f.toLowerCase());
    return data.filter(item => item && item.validationStatus && lowerCaseFilter.includes(item.validationStatus.toLowerCase()));
}

function calculateProgressForAllStatuses(dataKey, startDate, endDate) {
    const data = currentData[dataKey] || [];
    if (!Array.isArray(data)) return 0;
    return data.filter(item => {
        if (!item || !(item.timestamp || item.datestamp)) return false;
        const itemDate = new Date(item.timestamp); 
        return itemDate && itemDate >= startDate && itemDate <= endDate;
    }).length;
}

function updateDashboard() {
    if (!currentUser || !currentData.kpiSettings) return;
    document.getElementById('userDisplayName').textContent = currentUser.name;
    const kpiSettings = currentData.kpiSettings || {};

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    let dailyAchieved = 0;
    let dailyTotal = 0;
    CONFIG.targets.daily.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            dailyAchieved += calculateProgressForAllStatuses(target.dataKey, todayStart, todayEnd);
            dailyTotal += target.target;
        }
    });
    updateProgressBar('daily', dailyAchieved, dailyTotal);

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    let weeklyAchieved = 0;
    let weeklyTotal = 0;
    CONFIG.targets.weekly.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            weeklyAchieved += calculateProgressForAllStatuses(target.dataKey, weekStart, weekEnd);
            weeklyTotal += target.target;
        }
    });
    updateProgressBar('weekly', weeklyAchieved, weeklyTotal);

    let monthlyAchieved = 0;
    let monthlyTotal = 0;
    CONFIG.targets.monthly.forEach(target => {
        if (kpiSettings[target.id] !== false) {
            const allDataForTargetInPeriod = currentData[target.dataKey] || [];
            monthlyAchieved += allDataForTargetInPeriod.length;
            monthlyTotal += target.target;
        }
    });
    updateProgressBar('monthly', monthlyAchieved, monthlyTotal);
}

function calculateAndDisplayPenalties() {
    const potentialPenaltyEl = document.getElementById('potentialPenalty');
    const finalPenaltyEl = document.getElementById('finalPenalty');
    if (!potentialPenaltyEl || !finalPenaltyEl) return;

    const potentialPenalty = calculatePenaltyForValidationStatus(['approved', 'pending']);
    potentialPenaltyEl.textContent = formatCurrency(potentialPenalty);

    const finalPenalty = calculatePenaltyForValidationStatus(['approved']);
    finalPenaltyEl.textContent = formatCurrency(finalPenalty);
}

function calculatePenaltyForValidationStatus(validationFilter) {
    let totalPenalty = 0;
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const kpiSettings = currentData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);

    if (today < periodStartDate || !currentData.timeOff) return 0;

    CONFIG.targets.daily.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        datesToCheck.forEach(date => {
            if (!isDayOff(date, currentUser.name)) {
                const achievedToday = getFilteredData(target.dataKey, validationFilter)
                    .filter(d => {
                        if (!d) return false;
                        const itemDate = new Date(d.timestamp);
                        return itemDate && itemDate.toDateString() === date.toDateString();
                    }).length;
                if (achievedToday < target.target) totalPenalty += target.penalty;
            }
        });
    });

    const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
    CONFIG.targets.weekly.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        sundaysInPeriod.forEach(sunday => {
            const weekStart = getWeekStart(sunday);
            const achievedThisWeek = getFilteredData(target.dataKey, validationFilter)
                .filter(d => {
                    if (!d) return false;
                    const itemDate = new Date(d.timestamp);
                    return itemDate && itemDate >= weekStart && itemDate <= sunday;
                }).length;
            if (achievedThisWeek < target.target) totalPenalty += target.penalty;
        });
    });

    if (today > periodEndDate) {
        CONFIG.targets.monthly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            const achievedThisMonth = getFilteredData(target.dataKey, validationFilter).length;
            if (achievedThisMonth < target.target) totalPenalty += target.penalty;
        });
    }
    return totalPenalty;
}

function updateValidationBreakdown() {
    const container = document.getElementById('validationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        const data = currentData[dataKey] || [];
        if (Array.isArray(data)) {
            data.forEach(item => {
                if(item && item.validationStatus) {
                    total++;
                    const status = item.validationStatus.toLowerCase();
                    if (status === 'approved') approved++;
                    else if (status === 'pending') pending++;
                    else if (status === 'rejected') rejected++;
                }
            });
        }
    });
    container.innerHTML = `
        <div class="validation-stats">
            <div class="stat-item approved"><strong>${approved}</strong> Disetujui</div>
            <div class="stat-item pending"><strong>${pending}</strong> Pending</div>
            <div class="stat-item rejected"><strong>${rejected}</strong> Ditolak</div>
            <div class="stat-item total"><strong>${total}</strong> Total Data</div>
        </div>`;
}

function updateProgressBar(type, achieved, total) {
    const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
    const progressFill = document.getElementById(`${type}Progress`);
    const percentageText = document.getElementById(`${type}Percentage`);
    const achievedText = document.getElementById(`${type}Achieved`);
    const totalText = document.getElementById(`${type}Total`);

    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (percentageText) percentageText.textContent = `${percentage}%`;
    if (achievedText) achievedText.textContent = achieved;
    if (totalText) totalText.textContent = total;
}

function renderPerformanceReport() {
    const table = document.getElementById('performanceTable');
    const kpiSettings = currentData.kpiSettings || {};
    if (!table) return;

    const todayString = toLocalDateString(new Date());
    const periodDates = getDatesForPeriod();
    if (periodDates.length === 0) {
        table.innerHTML = '<tbody><tr><td>Pilih periode untuk melihat laporan.</td></tr></tbody>';
        return;
    }
    const weekDates = periodDates.slice(performanceReportWeekOffset * 7, (performanceReportWeekOffset * 7) + 7);

    const dailyCounts = {};
    const allTargets = [...CONFIG.targets.daily, ...CONFIG.targets.weekly, ...CONFIG.targets.monthly];
    allTargets.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        (currentData[target.dataKey] || []).forEach(item => {
            if (!item || !item.timestamp) return;
            const itemDate = new Date(item.timestamp);
            if (!itemDate) return;
            const dateString = toLocalDateString(itemDate);
            
            if (!dailyCounts[dateString]) dailyCounts[dateString] = {};
            if (!dailyCounts[dateString][target.dataKey]) dailyCounts[dateString][target.dataKey] = { P: 0, A: 0, R: 0 };
            
            const status = (item.validationStatus || 'pending').toLowerCase();
            if (status === 'pending') dailyCounts[dateString][target.dataKey].P++;
            else if (status === 'approved') dailyCounts[dateString][target.dataKey].A++;
            else if (status === 'rejected') dailyCounts[dateString][target.dataKey].R++;
        });
    });

    let tableHeaderHTML = '<thead><tr><th>Target KPI</th>';
    weekDates.forEach(date => {
        const isTodayClass = toLocalDateString(date) === todayString ? 'is-today' : '';
        tableHeaderHTML += `<th class="${isTodayClass}">${date.toLocaleDateString('id-ID', { weekday: 'short' })}<br>${date.getDate()}</th>`;
    });
    tableHeaderHTML += '</tr></thead>';

    let tableBodyHTML = '<tbody>';
    ['daily', 'weekly'].forEach(period => {
        CONFIG.targets[period].forEach(target => {
            if (kpiSettings[target.id] === false) return;
            
            tableBodyHTML += `<tr><td>${target.name} (${target.target})</td>`;
            weekDates.forEach(date => {
                const isTodayClass = toLocalDateString(date) === todayString ? 'is-today' : '';
                let cellContent = '';
                const dateString = toLocalDateString(date);
                
                if (period === 'daily') {
                    const counts = dailyCounts[dateString]?.[target.dataKey] || { P: 0, A: 0, R: 0 };
                    cellContent = isDayOff(date, currentUser.name)
                        ? '-'
                        : `<span class="par-cell"><span class="par-p">${counts.P}</span>/<span class="par-a">${counts.A}</span>/<span class="par-r">${counts.R}</span></span>`;
                } else if (period === 'weekly' && date.getDay() === 0) {
                    const weekStart = getWeekStart(date);
                    let weeklyP = 0, weeklyA = 0, weeklyR = 0;
                    for (let i = 0; i < 7; i++) {
                        const dayInWeek = new Date(weekStart);
                        dayInWeek.setDate(dayInWeek.getDate() + i);
                        const dayString = toLocalDateString(dayInWeek);
                        const counts = dailyCounts[dayString]?.[target.dataKey] || { P: 0, A: 0, R: 0 };
                        weeklyP += counts.P;
                        weeklyA += counts.A;
                        weeklyR += counts.R;
                    }
                    cellContent = `<span class="par-cell"><span class="par-p">${weeklyP}</span>/<span class="par-a">${weeklyA}</span>/<span class="par-r">${weeklyR}</span></span>`;
                }
                tableBodyHTML += `<td class="${isTodayClass}">${cellContent}</td>`;
            });
            tableBodyHTML += '</tr>';
        });
    });

    CONFIG.targets.monthly.forEach(target => {
        if (kpiSettings[target.id] === false) return;
        
        let totalP = 0, totalA = 0, totalR = 0;
        (currentData[target.dataKey] || []).forEach(item => {
            const status = (item.validationStatus || 'pending').toLowerCase();
            if (status === 'pending') totalP++;
            else if (status === 'approved') totalA++;
            else if (status === 'rejected') totalR++;
        });

        tableBodyHTML += `<tr>
            <td>${target.name} (${target.target})</td>
            <td colspan="7" class="monthly-total-cell">
                Total Periode: 
                <span class="par-cell">
                    <span class="par-p">${totalP}</span>/<span class="par-a">${totalA}</span>/<span class="par-r">${totalR}</span>
                </span>
            </td>
        </tr>`;
    });

    tableBodyHTML += '</tbody>';
    table.innerHTML = tableHeaderHTML + tableBodyHTML;

    document.getElementById('prevWeekBtn').disabled = (performanceReportWeekOffset === 0);
    const totalWeeks = Math.ceil(periodDates.length / 7);
    document.getElementById('nextWeekBtn').disabled = (performanceReportWeekOffset >= totalWeeks - 1);
    const startRange = weekDates[0] ? weekDates[0].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    const endRange = weekDates.length > 0 ? weekDates[weekDates.length - 1].toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '';
    document.getElementById('weekRangeLabel').textContent = startRange && endRange ? `${startRange} - ${endRange}` : '...';
}

function updateAllSummaries() {
    updateLeadTabs();
    Object.keys(CONFIG.dataMapping).forEach(dataKey => {
        const mapping = CONFIG.dataMapping[dataKey];
        const containerId = `${dataKey}Summary`;
        const container = document.getElementById(containerId);
        if (container) {
            updateSimpleSummaryTable(dataKey, mapping, container);
        }
    });
}

function updateSimpleSummaryTable(dataKey, mapping, container) {
    const dataToDisplay = (currentData[dataKey] || []).filter(item => item);
    if (dataToDisplay.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data untuk periode ini</div>`;
        return;
    }
    const rowGenerator = window[mapping.rowGenerator];
    const tableHTML = `<table><thead><tr><th>${mapping.headers.join('</th><th>')}</th></tr></thead><tbody>${dataToDisplay.slice().reverse().map(item => item ? rowGenerator(item, dataKey) : '').join('')}</tbody></table>`;
    container.innerHTML = tableHTML;
}

function updateLeadTabs() {
    const leadContainer = document.getElementById('leadContent');
    const prospectContainer = document.getElementById('prospectContent');
    const dealContainer = document.getElementById('dealContent');
    if (!leadContainer || !prospectContainer || !dealContainer) return;

    const allLeads = currentData.leads || [];
    const allProspects = currentData.prospects || [];
    
    const leads = allLeads.filter(item => item && (item.status === 'Lead' || item.validationStatus === 'Rejected'));
    const prospects = allProspects.filter(item => item && item.validationStatus !== 'Rejected');
    const rejectedProspects = allProspects.filter(item => item && item.validationStatus === 'Rejected');


    renderLeadTable(leadContainer, leads, 'leads');
    renderLeadTable(prospectContainer, prospects, 'prospects');
    
    const allDeals = [
        ...(currentData.b2bBookings || []).map(d => ({...d, originalDataKey: 'b2bBookings'})),
        ...(currentData.venueBookings || []).map(d => ({...d, originalDataKey: 'venueBookings'})),
        ...(currentData.dealLainnya || []).map(d => ({...d, originalDataKey: 'dealLainnya'}))
    ];
    
    if (allDeals.length === 0) {
        dealContainer.innerHTML = `<div class="empty-state">Belum ada data Deal untuk periode ini</div>`;
        return;
    }

    allDeals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const mapping = CONFIG.dataMapping['leads'];
    const headers = mapping.headers;
    const tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>
        ${allDeals.map(item => item ? generateDealRow(item, item.originalDataKey) : '').join('')}
    </tbody></table>`;
    dealContainer.innerHTML = tableHTML;
}

function renderLeadTable(container, data, dataKey) {
    if (!data || data.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada data ${dataKey} untuk periode ini</div>`;
        return;
    }
    const mapping = CONFIG.dataMapping[dataKey];
    if (!mapping) {
        container.innerHTML = `<div class="empty-state">Konfigurasi tabel tidak ditemukan.</div>`;
        return;
    }
    const headers = mapping.headers;
    const rowGenerator = window[mapping.rowGenerator];
    const tableHTML = `<table><thead><tr><th>${headers.join('</th><th>')}</th></tr></thead><tbody>${data.slice().reverse().map(item => item ? rowGenerator(item, dataKey) : '').join('')}</tbody></table>`;
    container.innerHTML = tableHTML;
}

function generateSimpleRow(item, dataKey) {
    const validationStatus = item.validationStatus || 'Pending';
    const statusClass = validationStatus.toLowerCase();
    const mainValue = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
    
    let actionCell = '-';
    if (validationStatus.toLowerCase() === 'rejected') {
        actionCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item.id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    }

    return `
        <tr onclick="openDetailModal('${item.id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${mainValue}</td>
            <td><span class="status status--${statusClass}">${validationStatus}</span></td>
            <td>${actionCell}</td>
        </tr>`;
}

function generateLeadRow(item, dataKey) {
    const statusClass = (item.status || '').toLowerCase().replace(/\s+/g, '-');
    const validationStatus = item.validationStatus || 'Pending';
    const validationStatusClass = validationStatus.toLowerCase();
    let actionButton = '-';

    if ((dataKey === 'leads' || dataKey === 'prospects') && validationStatus.toLowerCase() !== 'rejected') {
        actionButton = `<button class="btn btn--sm btn--outline" onclick="openUpdateModal('${item.id}'); event.stopPropagation();">Update</button>`;
    }
    
    let validationCell = `<span class="status status--${validationStatusClass}">${validationStatus}</span>`;
    if (validationStatus.toLowerCase() === 'rejected') {
        validationCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item.id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    }

    return `
        <tr onclick="openDetailModal('${item.id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--${statusClass}">${item.status || 'N/A'}</span></td>
            <td>${validationCell}</td>
            <td>${actionButton}</td>
        </tr>`;
}

function generateDealRow(item, dataKey) {
    const validationStatus = item.validationStatus || 'Pending';
    const validationStatusClass = validationStatus.toLowerCase();
    
    let actionCell = '-';
    if (validationStatus.toLowerCase() === 'rejected') {
        actionCell = `<button class="btn btn--sm btn--revise" onclick="openRevisionModal('${item.id}', '${dataKey}'); event.stopPropagation();">Revisi</button>`;
    }

    return `
        <tr onclick="openDetailModal('${item.id}', '${dataKey}')">
            <td>${item.datestamp || ''}</td>
            <td>${item.customerName || ''}</td>
            <td>${item.product || ''}</td>
            <td><span class="status status--deal">Deal</span></td>
            <td><span class="status status--${validationStatusClass}">${validationStatus}</span></td>
            <td>${actionCell}</td>
        </tr>`;
}

function openUpdateModal(leadId) {
    const modal = document.getElementById('updateLeadModal');
    const allLeadsAndProspects = [...(currentData.leads || []), ...(currentData.prospects || [])];
    const lead = allLeadsAndProspects.find(l => l && l.id === leadId);

    if (!lead || !modal) {
        showMessage('Data untuk diupdate tidak ditemukan.', 'error');
        return;
    }
    document.getElementById('updateLeadId').value = lead.id;
    document.getElementById('modalCustomerName').textContent = lead.customerName;
    const statusSelect = document.getElementById('updateStatus');
    const proofContainer = document.getElementById('proofOfDealContainer');
    const proofInput = document.getElementById('modalProofOfDeal');
    
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

    const toggleProofVisibility = () => {
        if (statusSelect.value === 'Deal') {
            proofContainer.style.display = 'block';
            proofInput.required = true;
        } else {
            proofContainer.style.display = 'none';
            proofInput.required = false;
        }
    };

    statusSelect.removeEventListener('change', toggleProofVisibility);
    statusSelect.addEventListener('change', toggleProofVisibility);
    toggleProofVisibility();

    modal.classList.add('active');
}

function openRevisionModal(itemId, dataKey) {
    const allData = Object.values(currentData).flat();
    const item = allData.find(d => d && d.id === itemId);
    const mapping = CONFIG.dataMapping[dataKey];

    if (!item || !mapping) {
        showMessage('Data untuk direvisi tidak ditemukan.', 'error');
        return;
    }

    const modal = document.getElementById('revisionModal');
    const formContainer = document.getElementById('revisionForm');
    const notesText = document.getElementById('rejectionNotesText');

    notesText.textContent = item.validationNotes || 'Tidak ada catatan.';
    formContainer.innerHTML = '';
    formContainer.dataset.sheetName = mapping.sheetName;
    formContainer.dataset.id = item.id;

    const pageId = FORM_PAGE_MAP[dataKey];
    const formTemplate = pageId ? document.querySelector(`#${pageId} .kpi-form`) : null;
    
    if (formTemplate) {
        formContainer.innerHTML = formTemplate.innerHTML;
        
        for (const key in item) {
            const input = formContainer.querySelector(`[name="${key}"]`);
            if (input && input.type !== 'file') {
                input.value = item[key];
            }
        }
        
        const submitButton = formContainer.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Kirim Ulang untuk Validasi';
        }
    } else {
        formContainer.innerHTML = '<p class="message error">Tidak dapat memuat form revisi.</p>';
        console.error(`Form template tidak ditemukan untuk dataKey: ${dataKey}`);
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('updateLeadModal')?.classList.remove('active');
    document.getElementById('updateLeadForm')?.reset();
    document.getElementById('revisionModal')?.classList.remove('active');
    document.getElementById('revisionForm')?.reset();
}

function closeDetailModal() {
    document.getElementById('detailModal')?.classList.remove('active');
}

function openDetailModal(itemId, dataKey) {
    const allData = Object.values(currentData).flat();
    const item = allData.find(d => d && d.id === itemId);
    const mapping = CONFIG.dataMapping[dataKey];

    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan:", itemId, dataKey);
        showMessage("Tidak dapat menampilkan detail data.", "error");
        return;
    }

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');
    if(!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Detail Data`;
    modalBody.innerHTML = '';

    const detailList = document.createElement('dl');
    detailList.className = 'detail-list';
    const dateFields = ['timestamp', 'visitDate', 'surveyDate', 'eventDate', 'campaignStartDate', 'campaignEndDate'];

    for (const key in mapping.detailLabels) {
        if (Object.prototype.hasOwnProperty.call(item, key) && (item[key] || item[key] === 0 || typeof item[key] === 'string')) {
            const dt = document.createElement('dt');
            dt.textContent = mapping.detailLabels[key];
            
            const dd = document.createElement('dd');
            let value = item[key];

            if (key === 'timestamp') value = item.datestamp || formatDate(item.timestamp);
            else if (dateFields.includes(key)) value = formatDate(value);
            else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('budget') || key.toLowerCase().includes('value')) value = formatCurrency(value);
            else if (key === 'validationStatus') {
                dd.innerHTML = `<span class="status status--${(value || 'pending').toLowerCase()}">${value || 'Pending'}</span>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
            } else if (typeof value === 'string' && (value.startsWith('http'))) {
                 dd.innerHTML = `<a href="${value}" target="_blank" rel="noopener noreferrer">Lihat File/Link</a>`;
                detailList.appendChild(dt); detailList.appendChild(dd); continue;
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
    if (date.getDay() === 0) return true; // Minggu selalu libur
    const dateString = toLocalDateString(date);
    const timeOffData = currentData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
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
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        auth.signOut();
    });
    document.getElementById('updateLeadForm')?.addEventListener('submit', handleUpdateLead);
    document.getElementById('revisionForm')?.addEventListener('submit', handleRevisionSubmit);
    
    document.querySelectorAll('#leadTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#leadTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#leadTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        if (performanceReportWeekOffset > 0) {
            performanceReportWeekOffset--;
            renderPerformanceReport();
        }
    });

    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        const periodDates = getDatesForPeriod();
        const totalWeeks = Math.ceil(periodDates.length / 7);
        if (performanceReportWeekOffset < totalWeeks - 1) {
            performanceReportWeekOffset++;
            renderPerformanceReport();
        }
    });
}

function initializeApp() {
    if (!currentUser) return;
    document.body.setAttribute('data-role', currentUser.role);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    setupEventListeners();
    setupFilters(() => {
        performanceReportWeekOffset = 0;
        setupRealtimeListeners();
    });
    setupRealtimeListeners();
}
