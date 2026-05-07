// 1. INITIALIZATION
let reports = JSON.parse(localStorage.getItem('hse_reports')) || [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    renderReports();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('tgl')) document.getElementById('tgl').value = today;
});

// 2. AUTHENTICATION SYSTEM
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const loginSec = document.getElementById('login-section');
    const mainSec = document.getElementById('main-section');
    if (isLoggedIn === 'true') {
        if(loginSec) loginSec.classList.add('hidden');
        if(mainSec) mainSec.classList.remove('hidden');
    } else {
        if(loginSec) loginSec.classList.remove('hidden');
        if(mainSec) mainSec.classList.add('hidden');
    }
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === 'Safety' && pass === '260922') {
            localStorage.setItem('isLoggedIn', 'true');
            checkAuth();
        } else {
            alert('Username atau Password salah!');
        }
    });
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    location.reload();
}

// 3. IMAGE PROCESSING (BASE64)
async function getBase64(file) {
    return new Promise((resolve) => {
        if (!file) resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
    });
}

// 4. DOWNLOAD PDF
async function downloadPDF(index) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const d = reports[index];
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("DAILY HSE REPORT", 105, 15, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    const tableBody = [
        ["Tanggal / Waktu Lapor", `${d.tgl} / ${d.waktu}`],
        ["Proyek / Area", `${d.proyek} / ${d.area}`],
        ["Izin Kerja (PTW)", d.ptw || "-"],
        ["Manpower", d.manpower + " Orang"],
        ["Aktivitas Kerja", d.keterangan],
        ["Status Area", isIncident ? "TERJADI INSIDEN" : "AMAN / SAFE"]
    ];

    if(isIncident) {
        tableBody.push(["Detail Investigasi", 
            `Apa: ${d.insidenWhat}\n` +
            `Siapa: ${d.insidenWho}\n` +
            `Dimana: ${d.insidenWhere}\n` +
            `Jam Kejadian: ${d.insidenWhen}\n` + 
            `Kronologi: ${d.insidenHow}`
        ]);
    }
    tableBody.push(["Tindakan Perbaikan", d.corrective || "-"]);
    tableBody.push(["Rencana Besok", d.rencana || "-"]);

    doc.autoTable({
        startY: 30,
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } }
    });

    let currentY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("DOKUMENTASI LAPANGAN:", 20, currentY);

    const addImg = (imgData, x, y, maxW, maxH, label) => {
        if (!imgData) return;
        try {
            const props = doc.getImageProperties(imgData);
            const ratio = props.width / props.height;
            let width = maxW; let height = width / ratio;
            if (height > maxH) { height = maxH; width = height * ratio; }
            doc.setFontSize(9); doc.setFont("helvetica", "italic");
            doc.text(label, x, y + 4);
            doc.addImage(imgData, 'JPEG', x, y + 6, width, height);
        } catch (e) { console.error(e); }
    };

    if (d.fotoAdmin) addImg(d.fotoAdmin, 20, currentY, 80, 60, "Foto Aktivitas Utama:");
    if (isIncident && d.fotoInsiden) addImg(d.fotoInsiden, 110, currentY, 80, 60, "Foto Temuan Insiden:");

    doc.save(`HSE_Report_${d.proyek}_${d.tgl}.pdf`);
}

// 5. RENDER TABLE (BAGIAN YANG DIPERBAIKI)
function renderReports(filterData = reports) {
    const list = document.getElementById('reportList');
    if(!list) return;
    list.innerHTML = '';
    filterData.forEach((data, index) => {
        const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
        
        // Tampilan Foto di Tabel (Bisa diklik untuk preview)
        const imgHTML = data.fotoAdmin 
            ? `<div class="img-table-container" onclick="openPreview(${index})" title="Klik untuk lihat detail">
                <img src="${data.fotoAdmin}" class="thumb-table-large">
                <div class="img-overlay"><i class="fas fa-search-plus"></i></div>
               </div>` 
            : `<div class="no-img-thumb"><i class="fas fa-image"></i></div>`;

        list.innerHTML += `
            <tr>
                <td>${data.tgl}</td>
                <td><b>${data.proyek}</b></td>
                <td>${data.area}</td>
                <td>${data.manpower}</td>
                <td>
                    <div class="cell-content-enhanced">
                        ${imgHTML}
                        <div class="cell-text">
                            <small class="text-muted">Aktivitas:</small>
                            <p>${data.keterangan.length > 40 ? data.keterangan.substring(0, 40) + '...' : data.keterangan}</p>
                        </div>
                    </div>
                </td>
                <td>${isIncident ? '<span class="badge-red">INCIDENT</span>' : '<span class="badge-green">SAFE</span>'}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="openPreview(${index})" class="btn-icon view" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                        <button onclick="showForm(${index})" class="btn-icon edit" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="downloadPDF(${index})" class="btn-icon pdf" title="Cetak PDF"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="deleteReport(${index})" class="btn-icon delete" title="Hapus"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

// 6. OPEN PREVIEW
function openPreview(index) {
    const d = reports[index];
    const previewBody = document.getElementById('preview-body');
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";

    previewBody.innerHTML = `
        <div class="preview-container">
            <div class="preview-section-title">Informasi Proyek</div>
            <div class="preview-grid">
                <div class="preview-item"><strong>Tanggal:</strong> ${d.tgl}</div>
                <div class="preview-item"><strong>Waktu Lapor:</strong> ${d.waktu}</div>
                <div class="preview-item"><strong>Proyek:</strong> ${d.proyek}</div>
                <div class="preview-item"><strong>Area:</strong> ${d.area}</div>
                <div class="preview-item"><strong>Manpower:</strong> ${d.manpower} Orang</div>
                <div class="preview-item"><strong>PTW:</strong> ${d.ptw || '-'}</div>
            </div>

            <div class="preview-section-title">Aktivitas Kerja</div>
            <div class="preview-box">${d.keterangan}</div>

            ${isIncident ? `
            <div class="preview-section-title" style="color:red">Detail Investigasi</div>
            <div class="preview-grid" style="background:#fff5f5; border:1px solid #feb2b2; padding:10px; border-radius:5px;">
                <div class="preview-item"><strong>Apa:</strong> ${d.insidenWhat}</div>
                <div class="preview-item"><strong>Siapa:</strong> ${d.insidenWho}</div>
                <div class="preview-item"><strong>Dimana:</strong> ${d.insidenWhere}</div>
                <div class="preview-item"><strong>Jam Kejadian:</strong> ${d.insidenWhen}</div> 
                <div class="preview-item full-width" style="grid-column: span 2"><strong>Kronologi:</strong><br>${d.insidenHow}</div>
            </div>` : ''}

            <div class="preview-section-title">Dokumentasi Foto</div>
            <div class="preview-photo-grid">
                <div class="photo-wrapper">
                    <small>Foto Aktivitas Utama</small>
                    <img src="${d.fotoAdmin || ''}" alt="Foto Utama">
                </div>
                ${isIncident && d.fotoInsiden ? `
                <div class="photo-wrapper">
                    <small style="color:red">Foto Temuan Insiden</small>
                    <img src="${d.fotoInsiden}" alt="Foto Insiden">
                </div>` : ''}
            </div>
        </div>
    `;
    document.getElementById('modal-preview').classList.remove('hidden');
}

function closePreview() { document.getElementById('modal-preview').classList.add('hidden'); }

// 7. FORM CRUD & FUNGSI BATAL
function showForm(index = -1) {
    const modal = document.getElementById('modal-form');
    document.getElementById('hse-form').reset();
    document.getElementById('editIndex').value = index;
    if (index > -1) {
        document.getElementById('modalTitle').innerText = "Edit Laporan K3";
        fillForm(index);
    } else {
        document.getElementById('modalTitle').innerText = "Buat Laporan Baru";
        document.getElementById('tgl').value = new Date().toISOString().split('T')[0];
        document.getElementById('waktu').value = new Date().toLocaleTimeString('id-ID') + " WIB";
    }
    modal.classList.remove('hidden');
}

function hideForm() {
    if(confirm("Batalkan pengisian laporan? Perubahan yang belum disimpan akan hilang.")) {
        document.getElementById('modal-form').classList.add('hidden');
    }
}

function fillForm(index) {
    const d = reports[index];
    const fields = ['tgl', 'waktu', 'proyek', 'area', 'ptw', 'manpower', 'keterangan', 'insidenWhat', 'insidenWho', 'insidenWhere', 'insidenWhen', 'insidenWhy', 'insidenHow', 'corrective', 'rencana'];
    fields.forEach(f => {
        if(document.getElementById(f)) document.getElementById(f).value = d[f] || '';
    });
}

// Validasi Simpan Laporan
document.getElementById('hse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const fotoAdminInput = document.getElementById('fotoAdmin');
    const insidenWhat = document.getElementById('insidenWhat').value;
    const fotoInsidenInput = document.getElementById('fotoInsiden');

    // --- LOGIKA VALIDASI FOTO WAJIB ---
    
    // 1. Validasi Foto Utama (Wajib untuk laporan baru)
    if (editIndex === -1 && fotoAdminInput.files.length === 0) {
        alert("⚠️ GAGAL SIMPAN: Anda wajib mengunggah Foto Dokumentasi Kerja Utama!");
        return;
    }

    // 2. Validasi Foto Insiden (Wajib jika kolom 'What' diisi)
    if (insidenWhat.trim() !== "" && fotoInsidenInput.files.length === 0 && editIndex === -1) {
        alert("⚠️ GAGAL SIMPAN: Karena ada temuan insiden, Anda wajib melampirkan Foto Bukti Insiden!");
        return;
    }

    // --- PROSES PENGUMPULAN DATA ---
    const reportData = {
        tgl: document.getElementById('tgl').value,
        waktu: document.getElementById('waktu').value,
        proyek: document.getElementById('proyek').value,
        area: document.getElementById('area').value,
        ptw: document.getElementById('ptw').value,
        manpower: document.getElementById('manpower').value,
        keterangan: document.getElementById('keterangan').value,
        insidenWhat: insidenWhat,
        insidenWho: document.getElementById('insidenWho').value,
        insidenWhere: document.getElementById('insidenWhere').value,
        insidenWhen: document.getElementById('insidenWhen').value,
        insidenWhy: document.getElementById('insidenWhy').value,
        insidenHow: document.getElementById('insidenHow').value,
        corrective: document.getElementById('corrective').value,
        rencana: document.getElementById('rencana').value,
        // Logika ambil foto baru atau pertahankan foto lama saat edit
        fotoAdmin: await getBase64(fotoAdminInput.files[0]) || (editIndex > -1 ? reports[editIndex].fotoAdmin : null),
        fotoInsiden: await getBase64(fotoInsidenInput.files[0]) || (editIndex > -1 ? reports[editIndex].fotoInsiden : null)
    };

    if (editIndex > -1) {
        reports[editIndex] = reportData;
    } else {
        reports.push(reportData);
    }

    localStorage.setItem('hse_reports', JSON.stringify(reports));
    renderReports();
    document.getElementById('modal-form').classList.add('hidden');
    alert("✅ Laporan Berhasil Disimpan!");
});

// Helper Image Processing
async function getBase64(file) {
    if (!file) return null;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
    });
}

function deleteReport(index) {
    if (confirm("Hapus laporan ini?")) {
        reports.splice(index, 1);
        localStorage.setItem('hse_reports', JSON.stringify(reports));
        renderReports();
    }
}

function searchReport() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    renderReports(reports.filter(r => r.proyek.toLowerCase().includes(val) || r.area.toLowerCase().includes(val)));
}

async function downloadFilteredPDF(range) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    
    // 1. Logika Filtering Data
    const filteredData = reports.filter(item => {
        const reportDate = new Date(item.tgl);
        if (range === 'harian') {
            return reportDate.toDateString() === now.toDateString();
        } else if (range === 'mingguan') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            return reportDate >= sevenDaysAgo && reportDate <= now;
        } else if (range === 'bulanan') {
            return reportDate.getMonth() === now.getMonth() && 
                   reportDate.getFullYear() === now.getFullYear();
        }
        return false;
    });

    if (filteredData.length === 0) {
        alert(`Tidak ada laporan untuk periode ${range} ini.`);
        return;
    }

    // 2. Loop data untuk membuat tampilan yang sama persis
    for (let i = 0; i < filteredData.length; i++) {
        const d = filteredData[i];
        const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";

        // Jika bukan laporan pertama, tambah halaman baru
        if (i > 0) doc.addPage();

        // Header (Sesuai Gambar)
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DAILY HSE REPORT", 105, 15, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Dicetak: ${now.toLocaleDateString('id-ID')}`, 105, 22, { align: "center" });
        doc.line(20, 25, 190, 25);

        // Body Tabel (Sesuai Gambar)
        const tableBody = [
            ["Tanggal / Waktu Lapor", `${d.tgl} / ${d.waktu}`],
            ["Proyek / Area", `${d.proyek} / ${d.area}`],
            ["Izin Kerja (PTW)", d.ptw || "-"],
            ["Manpower", d.manpower + " Orang"],
            ["Aktivitas Kerja", d.keterangan],
            ["Status Area", isIncident ? "TERJADI INSIDEN" : "AMAN / SAFE"],
            ["Tindakan Perbaikan", d.corrective || "-"],
            ["Rencana Besok", d.rencana || "-"]
        ];

        if(isIncident) {
            tableBody.push(["Detail Investigasi", 
                `Apa: ${d.insidenWhat}\nSiapa: ${d.insidenWho}\nDimana: ${d.insidenWhere}\nJam: ${d.insidenWhen}\nKronologi: ${d.insidenHow}`
            ]);
        }

        doc.autoTable({
            startY: 30,
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold', fillColor: [255, 255, 255] } },
            margin: { left: 20, right: 20 }
        });

        // Dokumentasi (Sesuai Gambar)
        let currentY = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("DOKUMENTASI LAPANGAN:", 20, currentY);
        
        doc.setFontSize(9); doc.setFont("helvetica", "italic");
        doc.text("Foto Aktivitas Utama:", 20, currentY + 5);

        if (d.fotoAdmin) {
            try {
                // Menghitung rasio gambar agar tidak gepeng
                const props = doc.getImageProperties(d.fotoAdmin);
                const ratio = props.width / props.height;
                const imgW = 80;
                const imgH = imgW / ratio;
                doc.addImage(d.fotoAdmin, 'JPEG', 20, currentY + 8, imgW, imgH);
            } catch (e) {
                console.error("Gagal memuat gambar", e);
            }
        } else {
            doc.text("[Tidak Ada Foto]", 20, currentY + 15);
        }
    }

    doc.save(`REKAP_HSE_${range.toUpperCase()}_${now.toISOString().split('T')[0]}.pdf`);
}