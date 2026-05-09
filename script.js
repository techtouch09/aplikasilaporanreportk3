// Inisialisasi Database dan Status Login
let reports = JSON.parse(localStorage.getItem('HSE_DB')) || [];

// --- FUNGSI AUTO-CHECK SAAT REFRESH ---
window.onload = function() {
    const isLoggedIn = localStorage.getItem('HSE_LOGGED_IN');
    if (isLoggedIn === "true") {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        renderTable();
    }
};

// --- LOGIN ---
function handleLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    if(u === "Safety" && p === "260922") {
        localStorage.setItem('HSE_LOGGED_IN', "true");
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        renderTable();
    } else {
        alert("Login Gagal!");
    }
}

// --- LOGOUT ---
function handleLogout() {
    localStorage.removeItem('HSE_LOGGED_IN');
    location.reload(); 
}

// --- NAVIGASI ---
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + id).classList.remove('hidden');
}

// --- VALIDASI ---
function validateFiles(input, max) {
    if(input.files.length > max) { alert(`Maksimal ${max} foto!`); input.value = ""; }
}

// --- SIMPAN / UPDATE LAPORAN ---
document.getElementById('report-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalBtnText = btnSubmit.innerText;
    btnSubmit.innerText = "Menyimpan...";
    btnSubmit.disabled = true;

    const id = document.getElementById('edit-id').value;
    const workPhotos = await getBase64Batch(document.getElementById('foto_kerja').files);
    const incidentPhotos = await getBase64Batch(document.getElementById('foto_insiden').files);

    const existingReport = id ? reports.find(r => r.id == id) : null;

    const reportData = {
        id: id ? parseInt(id) : Date.now(),
        tgl: document.getElementById('tgl').value,
        jam: document.getElementById('jam').value,
        proyek: document.getElementById('proyek').value,
        area: document.getElementById('area').value,
        permit: document.getElementById('permit').value,
        manpower: document.getElementById('manpower').value,
        ket: document.getElementById('ket_kerja').value,
        what: document.getElementById('what').value,
        who: document.getElementById('who').value,
        where: document.getElementById('where').value,
        when: document.getElementById('when').value,
        why: document.getElementById('why').value,
        how: document.getElementById('how').value,
        corrective: document.getElementById('corrective').value,
        plan: document.getElementById('plan_besok').value,
        photos: workPhotos.length ? workPhotos : (existingReport ? existingReport.photos : []),
        incidentPhotos: incidentPhotos.length ? incidentPhotos : (existingReport ? existingReport.incidentPhotos : [])
    };

    if(id) {
        const index = reports.findIndex(r => r.id == id);
        reports[index] = reportData;
        alert("✅ Perubahan Berhasil Disimpan!");
    } else {
        reports.push(reportData);
        alert("✅ Laporan Baru Berhasil Ditambahkan!");
    }

    localStorage.setItem('HSE_DB', JSON.stringify(reports));
    this.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('form-title').innerText = "Buat Laporan Baru";
    document.getElementById('btn-cancel').classList.add('hidden');

    renderTable();
    showPage('summary');

    btnSubmit.innerText = originalBtnText;
    btnSubmit.disabled = false;
});

// --- RENDER TABEL ---
function renderTable() {
    const tbody = document.getElementById('rekap-body');
    const filtered = getFilteredData();

    tbody.innerHTML = filtered.map((r, i) => {
        const isUnsafe = r.what && r.what.trim().length > 0;
        const displayDate = r.tgl.split('-').reverse().join('/');
        
        return `
            <tr>
                <td>${i+1}</td>
                <td><b>${displayDate}</b><br><small>${r.jam} WIB</small></td>
                <td><b>${r.proyek}</b><br>${r.area}</td>
                <td style="text-align: center;">${r.manpower}</td>
                <td onclick="viewDetail(${r.id})" style="cursor:pointer">
                    <div style="display:flex; gap:5px; align-items:center;">
                        ${r.photos && r.photos[0] ? `<img src="${r.photos[0]}" style="width:50px; height:40px; object-fit:cover; border-radius:4px;">` : ''}
                        <span style="font-size:0.7rem;">${r.ket ? r.ket.substring(0,15)+'...' : '-'}</span>
                    </div>
                </td>
                <td><span class="status-pill ${isUnsafe ? 'unsafe' : 'safe'}">${isUnsafe ? 'TEMUAN' : 'AMAN'}</span></td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-primary" style="padding:4px 8px;" onclick="exportSinglePDF(${r.id})">PDF</button>
                        <button class="btn btn-secondary" style="padding:4px 8px;" onclick="editReport(${r.id})">Edit</button>
                        <button class="btn btn-danger" style="padding:4px 8px;" onclick="deleteReport(${r.id})">Hapus</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- FUNGSI PRATINJAU (IDENTIK DENGAN ISI PDF) ---
function viewDetail(id) {
    const r = reports.find(x => x.id == id);
    if (!r) return;

    document.getElementById('main-app').classList.add('hidden');
    const modal = document.getElementById('modal-detail');
    const container = document.getElementById('modal-data');
    
    const displayDate = r.tgl.split('-').reverse().join('/');

    container.innerHTML = `
        <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin:0; color: #1e293b;">LAPORAN HSE DIGITAL</h2>
            <small style="color: #64748b;">ID Laporan: ${r.id}</small>
        </div>

        <h4 style="background: #f1f5f9; padding: 5px 10px; border-left: 4px solid #3b82f6;">I. INFORMASI UMUM</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom:15px;">
            <tr><td style="width:35%; border:1px solid #ddd; padding:8px; font-weight:bold;">Tanggal / Jam</td><td style="border:1px solid #ddd; padding:8px;">${displayDate} / ${r.jam} WIB</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Proyek / Area</td><td style="border:1px solid #ddd; padding:8px;">${r.proyek} / ${r.area}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Izin Kerja (PTW)</td><td style="border:1px solid #ddd; padding:8px;">${r.permit || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Manpower</td><td style="border:1px solid #ddd; padding:8px;">${r.manpower} Orang</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Aktivitas Kerja</td><td style="border:1px solid #ddd; padding:8px;">${r.ket || "-"}</td></tr>
        </table>

        <h4 style="background: #f1f5f9; padding: 5px 10px; border-left: 4px solid #ef4444;">II. INSIDEN (5W + 1H)</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom:15px;">
            <tr><td style="width:35%; border:1px solid #ddd; padding:8px; font-weight:bold;">Apa (What)</td><td style="border:1px solid #ddd; padding:8px;">${r.what || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Siapa (Who)</td><td style="border:1px solid #ddd; padding:8px;">${r.who || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Dimana (Where)</td><td style="border:1px solid #ddd; padding:8px;">${r.where || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Kapan (When)</td><td style="border:1px solid #ddd; padding:8px;">${r.when || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Mengapa (Why)</td><td style="border:1px solid #ddd; padding:8px;">${r.why || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Bagaimana (How)</td><td style="border:1px solid #ddd; padding:8px;">${r.how || "-"}</td></tr>
        </table>

        <h4 style="background: #f1f5f9; padding: 5px 10px; border-left: 4px solid #10b981;">III. TINDAKAN & RENCANA</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-bottom:15px;">
            <tr><td style="width:35%; border:1px solid #ddd; padding:8px; font-weight:bold;">Perbaikan (Corrective)</td><td style="border:1px solid #ddd; padding:8px;">${r.corrective || "-"}</td></tr>
            <tr><td style="border:1px solid #ddd; padding:8px; font-weight:bold;">Rencana Besok</td><td style="border:1px solid #ddd; padding:8px;">${r.plan || "-"}</td></tr>
        </table>
        
        <h4 style="margin-bottom: 10px;">📸 DOKUMENTASI</h4>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
                <p style="font-weight:bold; font-size:0.75rem; text-align:center;">FOTO KERJA</p>
                ${r.photos && r.photos[0] ? `<img src="${r.photos[0]}" style="width:100%; border-radius:5px;">` : `<div style="height:100px; background:#f3f4f6; border-radius:5px;"></div>`}
            </div>
            <div>
                <p style="font-weight:bold; font-size:0.75rem; text-align:center;">FOTO INSIDEN</p>
                ${r.incidentPhotos && r.incidentPhotos[0] ? `<img src="${r.incidentPhotos[0]}" style="width:100%; border-radius:5px;">` : `<div style="height:100px; background:#f3f4f6; border-radius:5px;"></div>`}
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closePreview()">Tutup</button>
            <button class="btn btn-primary" onclick="exportSinglePDF(${r.id})">Cetak PDF</button>
        </div>
    `;
    modal.classList.remove('hidden');
    window.scrollTo(0,0);
}

// --- CETAK PDF INDIVIDUAL ---
// --- CETAK PDF (DENGAN PERBAIKAN FOTO AGAR TIDAK BUNTEK) ---
async function exportSinglePDF(id) {
    const r = reports.find(x => x.id == id);
    if (!r) return;

    // --- PERBAIKAN FORMAT TANGGAL ---
    // Mengubah YYYY-MM-DD menjadi DD/MM/YYYY
    const formattedDate = r.tgl.split('-').reverse().join('/');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const projNameClean = r.proyek.replace(/\s+/g, '_').toUpperCase();
    const fileName = `HSE_REPORT_${projNameClean}.pdf`;

    // Header
    doc.setFontSize(16);
    doc.text("LAPORAN HSE DIGITAL", 105, 15, { align: "center" });
    
    // I. Informasi Umum
    doc.autoTable({
        startY: 25,
        head: [['I. INFORMASI UMUM', 'DETAIL']],
        body: [
            // Menggunakan formattedDate yang sudah diperbaiki
            ['Tanggal / Jam', `${formattedDate} / ${r.jam} WIB`], 
            ['Proyek / Area', `${r.proyek} / ${r.area}`],
            ['Izin Kerja (PTW)', r.permit || "-"],
            ['Manpower', `${r.manpower} Orang`],
            ['Aktivitas Kerja', r.ket || "-"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] } // Warna biru
    });

    // II. Insiden
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        head: [['II. INSIDEN (5W + 1H)', 'KETERANGAN']],
        body: [
            ['Apa (What)', r.what || "-"],
            ['Siapa (Who)', r.who || "-"],
            ['Dimana (Where)', r.where || "-"],
            ['Kapan (When)', r.when || "-"],
            ['Mengapa (Why)', r.why || "-"],
            ['Bagaimana (How)', r.how || "-"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] } // Warna merah
    });

    // III. Tindakan
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 5,
        head: [['III. TINDAKAN & RENCANA', 'DETAIL']],
        body: [
            ['Tindakan Perbaikan', r.corrective || "-"],
            ['Rencana Besok', r.plan || "-"]
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] } // Warna hijau
    });

    let yPos = doc.lastAutoTable.finalY + 10;
    
    // --- LOGIC FOTO PROPORSI OTOMATIS ---
    const addImageProportional = (imgData, x, y, targetWidth) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = imgData;
            img.onload = function() {
                const imgHeight = (img.height / img.width) * targetWidth;
                doc.addImage(imgData, 'JPEG', x, y, targetWidth, imgHeight);
                resolve(imgHeight);
            };
        });
    };

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');

    if (r.photos && r.photos[0]) {
        doc.text("FOTO KERJA:", 14, yPos);
        await addImageProportional(r.photos[0], 14, yPos + 5, 85);
    }

    if (r.incidentPhotos && r.incidentPhotos[0]) {
        doc.text("FOTO INSIDEN:", 110, yPos);
        await addImageProportional(r.incidentPhotos[0], 110, yPos + 5, 85);
    }

    doc.save(fileName);
}

// --- FUNGSI LAINNYA TETAP ---
function getFilteredData() {
    const fDate = document.getElementById('filter-date').value;
    const fType = document.getElementById('filter-type').value;
    let filtered = [...reports].sort((a,b) => new Date(b.tgl + ' ' + b.jam) - new Date(a.tgl + ' ' + a.jam));
    if(fDate) {
        filtered = filtered.filter(r => r.tgl === fDate);
    }
    return filtered;
}

function editReport(id) {
    const r = reports.find(x => x.id == id);
    if (!r) return;
    document.getElementById('edit-id').value = r.id;
    document.getElementById('tgl').value = r.tgl;
    document.getElementById('jam').value = r.jam;
    document.getElementById('proyek').value = r.proyek;
    document.getElementById('area').value = r.area;
    document.getElementById('permit').value = r.permit;
    document.getElementById('manpower').value = r.manpower;
    document.getElementById('ket_kerja').value = r.ket;
    document.getElementById('what').value = r.what;
    document.getElementById('who').value = r.who;
    document.getElementById('where').value = r.where;
    document.getElementById('when').value = r.when;
    document.getElementById('why').value = r.why;
    document.getElementById('how').value = r.how;
    document.getElementById('corrective').value = r.corrective;
    document.getElementById('plan_besok').value = r.plan;
    document.getElementById('form-title').innerText = "Mode Edit Laporan: " + r.id;
    document.getElementById('btn-cancel').classList.remove('hidden');
    showPage('create');
    window.scrollTo(0,0);
}

function closePreview() {
    document.getElementById('modal-detail').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

function deleteReport(id) {
    if(confirm("Hapus laporan ini secara permanen?")) {
        reports = reports.filter(r => r.id != id);
        localStorage.setItem('HSE_DB', JSON.stringify(reports));
        renderTable();
    }
}

async function getBase64Batch(files) {
    return Promise.all(Array.from(files).map(file => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }));
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('show');
}
// --- CETAK PDF BATCH (HARIAN / MINGGUAN / BULANAN) ---
async function exportFilteredPDF() {
    const filteredData = getFilteredData();
    if (filteredData.length === 0) {
        alert("Tidak ada data untuk diunduh!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Looping melalui data yang sudah difilter (Harian/Mingguan/Bulanan)
    for (let i = 0; i < filteredData.length; i++) {
        const r = filteredData[i];
        
        // --- PERBAIKAN TANGGAL DI SINI ---
        const tglIndo = r.tgl.split('-').reverse().join('/'); 

        if (i > 0) doc.addPage();

        // Judul & Header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text("LAPORAN HSE DIGITAL", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Halaman: ${i + 1} dari ${filteredData.length}`, 105, 20, { align: "center" });

        // I. Informasi Umum
        doc.autoTable({
            startY: 25,
            head: [['I. INFORMASI UMUM', 'DETAIL']],
            body: [
                // Menggunakan tglIndo yang sudah diformat
                ['Tanggal / Jam', `${tglIndo} / ${r.jam} WIB`], 
                ['Proyek / Area', `${r.proyek} / ${r.area}`],
                ['Izin Kerja (PTW)', r.permit || "-"],
                ['Manpower', `${r.manpower} Orang`],
                ['Aktivitas Kerja', r.ket || "-"]
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // II. Insiden
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 5,
            head: [['II. INSIDEN (5W + 1H)', 'KETERANGAN']],
            body: [
                ['Apa (What)', r.what || "-"],
                ['Siapa (Who)', r.who || "-"],
                ['Dimana (Where)', r.where || "-"],
                ['Kapan (When)', r.when || "-"],
                ['Mengapa (Why)', r.why || "-"],
                ['Bagaimana (How)', r.how || "-"]
            ],
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] }
        });

        // III. Tindakan & Rencana
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 5,
            head: [['III. TINDAKAN & RENCANA', 'DETAIL']],
            body: [
                ['Tindakan Perbaikan', r.corrective || "-"],
                ['Rencana Besok', r.plan || "-"]
            ],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }
        });

        // Bagian Foto (Tetap menggunakan logic proporsional)
        let yPos = doc.lastAutoTable.finalY + 10;
        const addImg = async (data, x, y, w) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = data;
                img.onload = () => {
                    const h = (img.height / img.width) * w;
                    doc.addImage(data, 'JPEG', x, y, w, h);
                    resolve(h);
                };
                img.onerror = () => resolve(0);
            });
        };

        doc.setFontSize(10);
        if (r.photos && r.photos[0]) {
            doc.text("FOTO KERJA:", 14, yPos);
            await addImg(r.photos[0], 14, yPos + 5, 85);
        }
        if (r.incidentPhotos && r.incidentPhotos[0]) {
            doc.text("FOTO INSIDEN:", 110, yPos);
            await addImg(r.incidentPhotos[0], 110, yPos + 5, 85);
        }
    }

    const fileName = `REKAP_HSE_${new Date().getTime()}.pdf`;
    doc.save(fileName);
}

// --- 1. FUNGSI MEMBERSIHKAN DATA LAMA (> 30 HARI) ---
function autoCleanupReports() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const initialLength = reports.length;
    
    // Filter hanya laporan yang kurang dari 30 hari
    reports = reports.filter(r => {
        // Jika r.id menggunakan Date.now(), kita bisa pakai itu, 
        // atau parse r.tgl jika formatnya konsisten
        return r.id > thirtyDaysAgo; 
    });

    if (reports.length < initialLength) {
        localStorage.setItem('HSE_DB', JSON.stringify(reports));
        console.log(`Auto-cleanup: ${initialLength - reports.length} laporan lama dihapus.`);
    }
}

// --- 2. CEK SISA MEMORI BROWSER ---
function checkStorageQuota() {
    let total = 0;
    for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
            total += ((localStorage[x].length + x.length) * 2);
        }
    }
    const sizeInMB = (total / 1024 / 1024).toFixed(2);
    
    // Chrome biasanya kasih limit 5MB per domain
    if (sizeInMB > 4.0) { // Jika sudah di atas 4MB, kasih peringatan
        alert(`⚠️ MEMORI HAMPIR PENUH!\nPenggunaan: ${sizeInMB} MB / 5 MB.\nSegera ekspor PDF dan hapus laporan yang tidak diperlukan.`);
    }
}

// --- 3. UPDATE FUNGSI ONLOAD ---
window.onload = function() {
    autoCleanupReports(); // Jalankan pembersihan otomatis saat buka aplikasi
    checkStorageQuota();  // Cek memori
    
    const isLoggedIn = localStorage.getItem('HSE_LOGGED_IN');
    if (isLoggedIn === "true") {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        renderTable();
    }
};

// --- 4. UPDATE EVENT LISTENER SUBMIT (Bagian Simpan) ---
document.getElementById('report-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Tambahkan Cek Memori sebelum proses simpan
    checkStorageQuota();

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    // ... (kode lainnya tetap sama) ...

    try {
        if(id) {
            const index = reports.findIndex(r => r.id == id);
            reports[index] = reportData;
            alert("✅ Perubahan Berhasil Disimpan!");
        } else {
            reports.push(reportData);
            alert("✅ Laporan Baru Berhasil Ditambahkan!");
        }

        localStorage.setItem('HSE_DB', JSON.stringify(reports));
    } catch (e) {
        // Jika LocalStorage benar-benar penuh, Chrome akan melempar error
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("❌ GAGAL MENYIMPAN! Memori browser sudah penuh. Silahkan hapus beberapa laporan lama atau bersihkan cache.");
        }
    }

    // ... (sisa kode reset form dan renderTable) ...
});