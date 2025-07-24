/**
 * @file management.js
 * @description Logika untuk dashboard manajemen, diadaptasi untuk Firebase.
 * @version 7.0.1 - Firebase Integration Case Fix
 */

// --- PENJAGA HALAMAN & INISIALISASI PENGGUNA ---
let currentUser;
auth.onAuthStateChanged(user => {
    if (user) {
        const userJSON = localStorage.getItem('currentUser');
        if (userJSON) {
            const parsedUser = JSON.parse(userJSON);
            if (parsedUser.role !== 'management') {
                alert('Akses ditolak.');
                window.location.href = 'dashboard.html';
                return;
            }
            currentUser = parsedUser;
            initializeApp();
        } else {
            // [FIXED] Mengubah 'users' menjadi 'Users'
            db.collection('Users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().role === 'management') {
                    currentUser = { uid: user.uid, email: user.email, ...doc.data() };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    initializeApp();
                } else {
                    alert('Akses ditolak.');
                    auth.signOut();
                }
            }).catch(() => auth.signOut());
        }
    } else {
        window.location.href = 'index.html';
    }
});

// =================================================================================
// KONFIGURASI (SAMA SEPERTI ASLINYA)
// =================================================================================
const CONFIG = {
    dataMapping: {
        'Leads': { dataKey: 'leads', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Prospects': { dataKey: 'prospects', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'B2BBookings': { dataKey: 'b2bBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'VenueBookings': { dataKey: 'venueBookings', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Deal Lainnya': { dataKey: 'dealLainnya', detailLabels: { timestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', leadSource: 'Sumber Lead', product: 'Produk', contact: 'Kontak', proofOfLead: 'Bukti Lead', notes: 'Catatan Awal', status: 'Status Lead', proofOfDeal: 'Bukti Deal', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi', statusLog: 'Log Status' } },
        'Canvasing': { dataKey: 'canvasing', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', meetingTitle: 'Judul Meeting', document: 'File', notes: 'Catatan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Promosi': { dataKey: 'promosi', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', campaignName: 'Nama Campaign', platform: 'Platform', screenshot: 'Screenshot', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' }},
        'DoorToDoor': { dataKey: 'doorToDoor', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', visitDate: 'Tanggal Kunjungan', institutionName: 'Nama Instansi', address: 'Alamat', picName: 'Nama PIC', picPhone: 'Kontak PIC', response: 'Hasil Kunjungan', proof: 'Bukti', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Quotations': { dataKey: 'quotations', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', productType: 'Jenis Produk', quotationDoc: 'Dokumen', quotationAmount: 'Nominal', description: 'Keterangan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Surveys': { dataKey: 'surveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', customerName: 'Nama Customer', gender: 'Jenis Kelamin', phone: 'No. Telepon', surveyDate: 'Tanggal Survey', origin: 'Asal', feedback: 'Tanggapan', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Reports': { dataKey: 'reports', detailLabels: { datestamp: 'Waktu Upload', sales: 'Sales', reportPeriod: 'Periode Laporan', reportDoc: 'Dokumen', managementFeedback: 'Feedback', additionalNotes: 'Catatan Tambahan', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'CRMSurveys': { dataKey: 'crmSurveys', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', competitorName: 'Nama Kompetitor', website: 'Website', product: 'Produk', priceDetails: 'Detail Harga', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Conversions': { dataKey: 'conversions', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', clientName: 'Nama Client', eventDate: 'Tanggal Event', venueType: 'Jenis Venue', barterValue: 'Nilai Barter', barterDescription: 'Keterangan', barterAgreementFile: 'File Perjanjian', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Events': { dataKey: 'events', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', eventName: 'Nama Event', eventType: 'Jenis Event', eventDate: 'Tanggal Event', eventLocation: 'Lokasi', organizer: 'Penyelenggara', benefits: 'Hasil/Manfaat', documentation: 'Dokumentasi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
        'Campaigns': { dataKey: 'campaigns', detailLabels: { datestamp: 'Waktu Input', sales: 'Sales', campaignTitle: 'Judul Kampanye', targetMarket: 'Target Pasar', campaignStartDate: 'Tgl Mulai', campaignEndDate: 'Tgl Selesai', conceptDescription: 'Deskripsi', potentialConversion: 'Potensi', budget: 'Budget', campaignMaterial: 'Materi', validationStatus: 'Status Validasi', validationNotes: 'Catatan Validasi' } },
    }
};

const TARGET_CONFIG = {
    daily: [ { id: 1, name: "Menginput Data Lead", target: 20, penalty: 15000, dataKey: 'leads' }, /* ...sisanya sama... */ ],
    weekly: [ { id: 4, name: "Canvasing dan Pitching", target: 1, penalty: 50000, dataKey: 'canvasing' }, /* ...sisanya sama... */ ],
    monthly: [ { id: 11, name: "Konversi Booking Kamar B2B", target: 2, penalty: 200000, dataKey: 'b2bBookings' }, /* ...sisanya sama... */ ]
};
// Salin TARGET_CONFIG lengkap dari file asli Anda ke sini
const ALL_DATA_KEYS = Object.values(TARGET_CONFIG).flat().map(t => t.dataKey);

let allData = {};
let allSalesUsers = [];
let isFetching = false;
let pendingEntries = {};

// =================================================================================
// FUNGSI PENGAMBILAN DATA (VERSI FIREBASE)
// =================================================================================

async function loadInitialData(isInitialLoad = false) {
    if (isFetching) return;
    isFetching = true;
    if (isInitialLoad) showMessage("Memuat data tim dari server...", "info");
    
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    allData = {}; // Reset data

    try {
        const collectionsToFetch = Object.values(CONFIG.dataMapping).map(m => m.sheetName);
        const fetchPromises = collectionsToFetch.map(collectionName => 
            db.collection(collectionName)
              .where('timestamp', '>=', periodStartDate.toISOString())
              .where('timestamp', '<=', periodEndDate.toISOString())
              .get()
        );

        const settingsPromises = [
            db.collection('settings').doc('kpi').get(),
            db.collection('settings').doc('timeOff').get(),
            // [FIXED] Mengubah 'users' menjadi 'Users'
            db.collection('Users').where('role', '==', 'sales').get()
        ];
        
        const allPromises = [...fetchPromises, ...settingsPromises];
        const results = await Promise.all(allPromises);

        // Proses data KPI
        results.slice(0, collectionsToFetch.length).forEach((snapshot, index) => {
            const collectionName = collectionsToFetch[index];
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const dataKey = Object.keys(CONFIG.dataMapping).find(k => CONFIG.dataMapping[k].sheetName === collectionName);
            if(dataKey) {
                allData[CONFIG.dataMapping[dataKey].dataKey] = data;
            }
        });
        
        // Proses data pengaturan dan user
        const kpiSettingsDoc = results[results.length - 3];
        allData.kpiSettings = kpiSettingsDoc.exists ? kpiSettingsDoc.data() : {};

        const timeOffDoc = results[results.length - 2];
        allData.timeOff = timeOffDoc.exists ? timeOffDoc.data().entries : [];
        
        const usersSnapshot = results[results.length - 1];
        allSalesUsers = usersSnapshot.docs.map(doc => doc.data().name);

        if (isInitialLoad) {
            setupTimeOffForm();
            renderKpiSettings();
        }
        updateAllUI();
        if (isInitialLoad) showMessage("Data berhasil dimuat.", "success");

    } catch (error) {
        if (isInitialLoad) showMessage(`Gagal memuat data awal: ${error.message}`, 'error');
        console.error("Fetch Error:", error);
    } finally {
        isFetching = false;
    }
}

// =================================================================================
// PUSAT VALIDASI (VERSI FIREBASE)
// =================================================================================

async function loadPendingEntries() {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    if (!tabsContainer || !contentContainer) return;
    
    tabsContainer.innerHTML = '<p>Memuat data...</p>';
    contentContainer.innerHTML = '';

    try {
        pendingEntries = {}; // Reset
        const collectionsToFetch = Object.values(CONFIG.dataMapping).map(m => m.sheetName);
        const fetchPromises = collectionsToFetch.map(collectionName => 
            db.collection(collectionName).where('validationStatus', '==', 'Pending').get()
        );
        
        const snapshots = await Promise.all(fetchPromises);
        
        snapshots.forEach((snapshot, index) => {
            const collectionName = collectionsToFetch[index];
            if (!snapshot.empty) {
                pendingEntries[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        });
        
        renderValidationTabs(pendingEntries);

    } catch (error) {
        tabsContainer.innerHTML = `<p class="message error">Gagal memuat data: ${error.message}</p>`;
    }
}

async function handleValidation(buttonElement, sheetName, id, type) {
    let notes = '';
    if (type === 'reject') {
        notes = prompt(`Mohon berikan alasan penolakan untuk data ini:`);
        if (notes === null || notes.trim() === '') {
            showMessage('Penolakan dibatalkan karena tidak ada alasan yang diberikan.', 'info');
            return;
        }
    }

    const actionCell = buttonElement.parentElement;
    actionCell.querySelectorAll('button').forEach(btn => btn.disabled = true);
    showMessage('Memproses validasi...', 'info');

    try {
        await db.collection(sheetName).doc(id).update({
            validationStatus: type === 'approve' ? 'Approved' : 'Rejected',
            validationNotes: notes
        });

        showMessage('Validasi berhasil disimpan.', 'success');
        // Hapus baris dari UI setelah berhasil
        const row = actionCell.parentElement;
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500);

    } catch (error) {
        showMessage(`Gagal memproses validasi: ${error.message}`, 'error');
        actionCell.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

// =================================================================================
// PENGATURAN (VERSI FIREBASE)
// =================================================================================

async function handleKpiSettingChange(event) {
    const toggle = event.target;
    const targetId = toggle.dataset.targetId;
    const isActive = toggle.checked;
    toggle.disabled = true;

    try {
        await db.collection('settings').doc('kpi').set({
            [targetId]: isActive
        }, { merge: true });
        
        showMessage('Pengaturan KPI berhasil diperbarui.', 'success');
        if (!allData.kpiSettings) allData.kpiSettings = {};
        allData.kpiSettings[targetId] = isActive;
        updateAllUI();

    } catch (error) {
        showMessage(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
        toggle.checked = !isActive;
    } finally {
        toggle.disabled = false;
    }
}

async function handleTimeOffSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const date = document.getElementById('timeOffDate').value;
    const sales = document.getElementById('timeOffSales').value;
    const description = document.getElementById('timeOffDescription').value;
    if (!date || !description) { 
        showMessage('Tanggal dan Keterangan wajib diisi.', 'error'); 
        return; 
    }

    const newEntry = { date, sales, description, id: `timeoff_${Date.now()}` };
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true; submitButton.textContent = 'Menyimpan...';

    try {
        await db.collection('settings').doc('timeOff').update({
            entries: firebase.firestore.FieldValue.arrayUnion(newEntry)
        });
        showMessage('Data libur berhasil disimpan.', 'success');
        loadInitialData(); 
        form.reset();
    } catch (error) {
        // Jika dokumen belum ada, buat baru
        if (error.code === 'not-found') {
            await db.collection('settings').doc('timeOff').set({ entries: [newEntry] });
            showMessage('Data libur berhasil disimpan.', 'success');
            loadInitialData(); 
            form.reset();
        } else {
            showMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Simpan';
    }
}

async function handleDeleteTimeOff(id) {
    if (!confirm('Anda yakin ingin menghapus data ini?')) return;
    
    const entryToDelete = (allData.timeOff || []).find(item => item.id === id);
    if (!entryToDelete) {
        showMessage('Data tidak ditemukan untuk dihapus.', 'error');
        return;
    }

    try {
        await db.collection('settings').doc('timeOff').update({
            entries: firebase.firestore.FieldValue.arrayRemove(entryToDelete)
        });
        showMessage('Data berhasil dihapus.', 'success');
        loadInitialData();
    } catch (error) {
        showMessage(`Error menghapus data: ${error.message}`, 'error');
    }
}

// =================================================================================
// SEMUA FUNGSI UI LAINNYA (TETAP SAMA SEPERTI ASLINYA)
// CUKUP SALIN DAN TEMPEL SEMUA FUNGSI DARI KODE LAMA ANDA DI SINI
// MULAI DARI `updateAllUI` SAMPAI AKHIR
// =================================================================================

function updateAllUI() {
    try {
        const penalties = calculatePenalties();
        updateStatCards(penalties);
        updateLeaderboard(penalties);
        renderTabbedTargetSummary();
        renderTimeOffList();
        updateTeamValidationBreakdown();
    } catch(error) {
        console.error("Error updating management UI:", error);
        showMessage("Terjadi kesalahan saat menampilkan data manajemen.", "error");
    }
}

function getFilteredData(salesName, dataKey, validationFilter = ['Approved']) {
    const data = allData[dataKey] || [];
    if (!Array.isArray(data)) return [];
    return data.filter(item => 
        item &&
        item.sales === salesName && 
        (validationFilter.includes('All') || (item.validationStatus && validationFilter.map(f=>f.toLowerCase()).includes(item.validationStatus.toLowerCase())))
    );
}

function updateStatCards(penalties) {
    const approvedLeads = (allData.leads || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    const approvedCanvasing = (allData.canvasing || []).filter(d => d && d.validationStatus && d.validationStatus.toLowerCase() === 'approved');
    document.getElementById('totalLeads').textContent = approvedLeads.length;
    document.getElementById('totalCanvasing').textContent = approvedCanvasing.length;
    
    const salesPerformance = {};
    allSalesUsers.forEach(salesName => {
        salesPerformance[salesName] = ALL_DATA_KEYS.reduce((total, key) => total + getFilteredData(salesName, key, ['Approved']).length, 0);
    });
    const topSales = Object.keys(salesPerformance).length > 0 ? Object.keys(salesPerformance).reduce((a, b) => salesPerformance[a] > salesPerformance[b] ? a : b) : 'N/A';
    document.getElementById('topSales').textContent = topSales;
    document.getElementById('totalPenalty').textContent = formatCurrency(penalties.total);
}

function updateLeaderboard(penalties) {
    const container = document.getElementById('leaderboard');
    if (!container) return;
    const leaderboardData = allSalesUsers.map(salesName => {
        const totalActivities = ALL_DATA_KEYS.reduce((sum, key) => sum + getFilteredData(salesName, key, ['Approved']).length, 0);
        return { name: salesName, total: totalActivities, penalty: penalties.bySales[salesName] || 0 };
    });
    leaderboardData.sort((a, b) => b.total - a.total);
    container.innerHTML = `<div class="performance-table-wrapper"><table class="performance-table" style="table-layout: auto;"><thead><tr><th>Nama Sales</th><th>Total Aktivitas (Approved)</th><th>Denda Final</th></tr></thead><tbody>${leaderboardData.map(s => `<tr><td>${s.name}</td><td><strong>${s.total}</strong></td><td>${formatCurrency(s.penalty)}</td></tr>`).join('') || '<tr><td colspan="3">Tidak ada data sales</td></tr>'}</tbody></table></div>`;
}

function calculatePenalties() {
    const penalties = { total: 0, bySales: {} };
    const kpiSettings = allData.kpiSettings || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const datesToCheck = getDatesForPeriod().filter(date => date < today);
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();

    if (today < periodStartDate) return penalties;

    allSalesUsers.forEach(salesName => {
        penalties.bySales[salesName] = 0;
        
        TARGET_CONFIG.daily.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            datesToCheck.forEach(date => {
                if (!isDayOff(date, salesName)) {
                    const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved'])
                        .filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                    if (achievedToday < target.target) penalties.bySales[salesName] += target.penalty;
                }
            });
        });

        const sundaysInPeriod = datesToCheck.filter(date => date.getDay() === 0);
        TARGET_CONFIG.weekly.forEach(target => {
            if (kpiSettings[target.id] === false) return;
            sundaysInPeriod.forEach(sunday => {
                const weekStart = getWeekStart(sunday);
                const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const itemDate = new Date(d.timestamp); return itemDate >= weekStart && itemDate <= sunday; }).length;
                if (achievedThisWeek < target.target) penalties.bySales[salesName] += target.penalty;
            });
        });

        if (today > periodEndDate) {
            TARGET_CONFIG.monthly.forEach(target => {
                if (kpiSettings[target.id] === false) return;
                const achievedThisPeriod = getFilteredData(salesName, target.dataKey, ['Approved']).length;
                if (achievedThisPeriod < target.target) penalties.bySales[salesName] += target.penalty;
            });
        }
    });

    penalties.total = Object.values(penalties.bySales).reduce((sum, p) => sum + p, 0);
    return penalties;
}

function isDayOff(date, salesName) {
    if (date.getDay() === 0) return true;
    const dateString = toLocalDateString(date);
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return false;
    return timeOffData.some(off => off && off.date === dateString && (off.sales === 'Global' || off.sales === salesName));
}

function renderTabbedTargetSummary() {
    const tabsContainer = document.getElementById('tabsContainer');
    const contentContainer = document.getElementById('tabContentContainer');
    if (!tabsContainer || !contentContainer) return;
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    const periodDates = getDatesForPeriod();
    const periodStartDate = getPeriodStartDate();
    const periodEndDate = getPeriodEndDate();
    const kpiSettings = allData.kpiSettings || {};

    allSalesUsers.forEach((salesName, index) => {
        const contentId = `content-${salesName.replace(/\s+/g, '')}`;
        tabsContainer.innerHTML += `<button class="tab-button ${index === 0 ? 'active' : ''}" data-tab="${contentId}">${salesName}</button>`;
        let tableHeader = '<tr><th>Target</th>';
        periodDates.forEach(date => { tableHeader += `<th>${date.getDate()}</th>`; });
        tableHeader += '</tr>';
        let tableBody = '';
        ['daily', 'weekly', 'monthly'].forEach(period => {
            TARGET_CONFIG[period].forEach(target => {
                if (kpiSettings[target.id] === false) return;
                tableBody += `<tr><td>${target.name} (${period.charAt(0)})</td>`;
                periodDates.forEach(date => {
                    let cellContent = '';
                    let cellClass = '';
                    if (period === 'daily') {
                        if (isDayOff(date, salesName)) {
                            cellClass = 'off-day';
                        } else {
                            const achievedToday = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => d && new Date(d.timestamp).toDateString() === date.toDateString()).length;
                            cellContent = achievedToday >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                        }
                    } else if (period === 'weekly' && date.getDay() === 0) {
                        const weekStart = getWeekStart(date);
                        const achievedThisWeek = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= weekStart && dDate <= date; }).length;
                        cellContent = achievedThisWeek >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    } else if (period === 'monthly' && date.getDate() === 20) {
                        const achievedThisMonth = getFilteredData(salesName, target.dataKey, ['Approved']).filter(d => { if(!d) return false; const dDate = new Date(d.timestamp); return dDate >= periodStartDate && dDate <= periodEndDate; }).length;
                        cellContent = achievedThisMonth >= target.target ? '<span class="check-mark">✓</span>' : '<span class="cross-mark">✗</span>';
                    }
                    tableBody += `<td class="${cellClass}">${cellContent}</td>`;
                });
                tableBody += '</tr>';
            });
        });
        contentContainer.innerHTML += `<div id="${contentId}" class="tab-content ${index === 0 ? 'active' : ''}"><div class="performance-table-wrapper"><table class="performance-table">${tableHeader}${tableBody}</table></div></div>`;
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function updateTeamValidationBreakdown() {
    const container = document.getElementById('teamValidationBreakdown');
    if (!container) return;
    let total = 0, approved = 0, pending = 0, rejected = 0;
    ALL_DATA_KEYS.forEach(key => {
        const data = allData[key] || [];
        if(Array.isArray(data)) {
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
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (pending > 0) {
        pendingBadge.textContent = pending;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
    }
}

function renderValidationTabs(data) {
    const tabsContainer = document.getElementById('validationTabsContainer');
    const contentContainer = document.getElementById('validationTabContentContainer');
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const pendingBySales = {};
    let totalPendingAll = 0;

    for (const sheetName in data) {
        data[sheetName].forEach(item => {
            if (!item || !item.sales) return;
            if (!pendingBySales[item.sales]) {
                pendingBySales[item.sales] = { total: 0, items: {} };
            }
            if (!pendingBySales[item.sales].items[sheetName]) {
                pendingBySales[item.sales].items[sheetName] = [];
            }
            pendingBySales[item.sales].items[sheetName].push(item);
            pendingBySales[item.sales].total++;
            totalPendingAll++;
        });
    }

    const pendingBadge = document.getElementById('pendingCountBadge');
    if (totalPendingAll > 0) {
        pendingBadge.textContent = totalPendingAll;
        pendingBadge.style.display = 'inline-flex';
    } else {
        pendingBadge.style.display = 'none';
        tabsContainer.innerHTML = '<p class="message success">Tidak ada data yang perlu divalidasi saat ini. Kerja bagus!</p>';
        return;
    }

    let isFirstTab = true;
    for (const salesName in pendingBySales) {
        const salesData = pendingBySales[salesName];
        const tabId = `validation-tab-${salesName.replace(/\s+/g, '')}`;
        const contentId = `validation-content-${salesName.replace(/\s+/g, '')}`;

        const tabButton = document.createElement('button');
        tabButton.className = `tab-button ${isFirstTab ? 'active' : ''}`;
        tabButton.dataset.tab = contentId;
        tabButton.innerHTML = `${salesName} <span class="pending-badge">${salesData.total}</span>`;
        tabsContainer.appendChild(tabButton);

        const contentDiv = document.createElement('div');
        contentDiv.id = contentId;
        contentDiv.className = `tab-content ${isFirstTab ? 'active' : ''}`;
        
        for (const sheetName in salesData.items) {
            const items = salesData.items[sheetName];
            const card = document.createElement('div');
            card.className = 'card';
            let tableHTML = `
                <div class="card__header"><h3>${sheetName} (${items.length} pending)</h3></div>
                <div class="card__body performance-table-wrapper">
                    <table class="validation-table">
                        <thead><tr><th>Waktu</th><th>Detail Utama</th><th>Aksi</th></tr></thead>
                        <tbody>`;
            items.forEach(item => {
                const mainDetail = item.customerName || item.meetingTitle || item.campaignName || item.institutionName || item.competitorName || item.eventName || item.campaignTitle || 'N/A';
                tableHTML += `
                    <tr data-id="${item.id}" data-sheet="${sheetName}">
                        <td>${item.datestamp || new Date(item.timestamp).toLocaleDateString()}</td>
                        <td>${mainDetail}</td>
                        <td class="validation-actions">
                            <button class="btn btn--sm btn--outline" onclick="openDetailModal('${item.id}', '${sheetName}')">Detail</button>
                            <button class="btn btn--sm btn--primary" onclick="handleValidation(this, '${sheetName}', '${item.id}', 'approve')">Approve</button>
                            <button class="btn btn--sm btn--secondary" onclick="handleValidation(this, '${sheetName}', '${item.id}', 'reject')">Reject</button>
                        </td>
                    </tr>`;
            });
            tableHTML += `</tbody></table></div>`;
            card.innerHTML = tableHTML;
            contentDiv.appendChild(card);
        }
        contentContainer.appendChild(contentDiv);
        isFirstTab = false;
    }

    document.querySelectorAll('#validationTabsContainer .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#validationTabsContainer .tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#validationTabContentContainer .tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });
}

function closeDetailModal() {
    const modal = document.getElementById('managementDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openDetailModal(itemId, sheetName) {
    const items = pendingEntries[sheetName] || [];
    const item = items.find(d => d && d.id === itemId);
    const mapping = CONFIG.dataMapping[sheetName];

    if (!item || !mapping) {
        console.error("Data atau mapping tidak ditemukan untuk modal:", itemId, sheetName);
        showMessage("Tidak dapat menampilkan detail data.", "error");
        return;
    }

    const modal = document.getElementById('managementDetailModal');
    const modalTitle = document.getElementById('managementDetailModalTitle');
    const modalBody = document.getElementById('managementDetailModalBody');
    if(!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = `Detail Data - ${sheetName}`;
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

            if (key === 'timestamp') value = item.datestamp;
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

function renderKpiSettings() {
    const container = document.getElementById('kpiSettingsContainer');
    if (!container) return;
    container.innerHTML = '';
    const allTargets = [...TARGET_CONFIG.daily, ...TARGET_CONFIG.weekly, ...TARGET_CONFIG.monthly];
    const kpiSettings = allData.kpiSettings || {};
    allTargets.forEach(target => {
        const isActive = kpiSettings[target.id] !== false;
        const item = document.createElement('div');
        item.className = 'setting-item';
        item.innerHTML = `<div class="setting-info"><div class="setting-name">${target.name}</div><div class="setting-description">Denda: ${formatCurrency(target.penalty)}</div></div><label class="toggle-switch"><input type="checkbox" data-target-id="${target.id}" ${isActive ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
        container.appendChild(item);
    });
    container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
        toggle.addEventListener('change', handleKpiSettingChange);
    });
}

function setupTimeOffForm() {
    const form = document.getElementById('timeOffForm');
    const salesSelect = document.getElementById('timeOffSales');
    if (!form || !salesSelect) return;
    salesSelect.innerHTML = '<option value="Global">Global (Hari Libur)</option>';
    allSalesUsers.forEach(name => {
        salesSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
    form.addEventListener('submit', handleTimeOffSubmit);
}

function renderTimeOffList() {
    const container = document.getElementById('timeOffListContainer');
    if (!container) return;
    container.innerHTML = '';
    const timeOffData = allData.timeOff || [];
    if (!Array.isArray(timeOffData)) return;
    timeOffData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        if (!item || !item.date) return;
        const li = document.createElement('li');
        const displayDate = new Date(item.date + 'T00:00:00Z').toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        li.innerHTML = `<span>${displayDate} - <strong>${item.sales}</strong> (${item.description || 'Tanpa keterangan'})</span><button class="delete-btn" data-id="${item.id}">&times;</button>`;
        container.appendChild(li);
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteTimeOff(e.target.dataset.id));
    });
}

function showContentPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'validationCenter') {
        loadPendingEntries();
    }
}

function initializeApp() {
    document.getElementById('userDisplayName').textContent = currentUser.name;
    document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());
    document.getElementById('refreshValidationBtn')?.addEventListener('click', loadPendingEntries);
    updateDateTime();
    setInterval(updateDateTime, 60000);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showContentPage(link.dataset.page);
        });
    });
    setupFilters(loadInitialData);
    loadInitialData(true);
}
