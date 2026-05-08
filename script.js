// 1. INITIALIZATION
let reports = JSON.parse(localStorage.getItem('hse_reports')) || [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    renderReports();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('tgl')) document.getElementById('tgl').value = today;
});

// Fungsi Pembantu: Format Tanggal ke DD/MM/YYYY
function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

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

// 4. DOWNLOAD PDF (DIPERBAIKI: TANGGAL SESUAI RIWAYAT)
async function downloadPDF(index) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const d = reports[index];
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
    
    // Gunakan format DD/MM/YYYY
    const displayDate = formatDateIndo(d.tgl);

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("DAILY HSE REPORT", 105, 15, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Dicetak: ${displayDate}`, 105, 22, { align: "center" });
    doc.line(20, 25, 190, 25);

    const tableBody = [
        ["Tanggal / Waktu Lapor", `${displayDate} / ${d.waktu}`],
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

    // Nama file menggunakan format tanggal riwayat (DD-MM-YYYY)
    doc.save(`HSE_Report_${d.proyek}_${displayDate.replace(/\//g, '-')}.pdf`);
}

// 5. RENDER TABLE (PEMBERIAN NOMOR URUT & SORTING WAKTU)
function renderReports(filterData = reports) {
    const list = document.getElementById('reportList');
    if(!list) return;
    list.innerHTML = '';

    // Urutkan data berdasarkan tanggal dan waktu terbaru
    const sortedData = [...filterData].sort((a, b) => {
        const dateA = new Date(`${a.tgl}T${a.waktu}`);
        const dateB = new Date(`${b.tgl}T${b.waktu}`);
        return dateB - dateA;
    });

    sortedData.forEach((data, index) => {
        const originalIndex = reports.findIndex(r => r === data);
        const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
        
        const imgHTML = data.fotoAdmin 
            ? `<div class="img-table-container" onclick="openPreview(${originalIndex})" title="Klik untuk lihat detail">
                <img src="${data.fotoAdmin}" class="thumb-table-large">
                <div class="img-overlay"><i class="fas fa-search-plus"></i></div>
               </div>` 
            : `<div class="no-img-thumb"><i class="fas fa-image"></i></div>`;

        // Menggunakan fungsi format tanggal Indonesia
        const displayDate = formatDateIndo(data.tgl);

        list.innerHTML += `
            <tr>
                <td style="text-align:center">${index + 1}</td>
                <td>${displayDate}<br><small>${data.waktu}</small></td>
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
                        <button onclick="openPreview(${originalIndex})" class="btn-icon view" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                        <button onclick="showForm(${originalIndex})" class="btn-icon edit" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="downloadPDF(${originalIndex})" class="btn-icon pdf" title="Cetak PDF"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="deleteReport(${originalIndex})" class="btn-icon delete" title="Hapus"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

// 6. OPEN PREVIEW (DIPERBAIKI: FORMAT TANGGAL)
function openPreview(index) {
    const d = reports[index];
    const previewBody = document.getElementById('preview-body');
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
    const displayDate = formatDateIndo(d.tgl);

    previewBody.innerHTML = `
        <div class="preview-container">
            <div class="preview-section-title">Informasi Proyek</div>
            <div class="preview-grid">
                <div class="preview-item"><strong>Tanggal:</strong> ${displayDate}</div>
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

// 7. FORM CRUD
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
        document.getElementById('waktu').value = ""; 
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

async function processImage(file) {
    return new Promise((resolve) => {
        if (!file) resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

document.getElementById('hse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const fotoAdminInput = document.getElementById('fotoAdmin');
    const insidenWhat = document.getElementById('insidenWhat').value;
    const fotoInsidenInput = document.getElementById('fotoInsiden');
    const waktuInput = document.getElementById('waktu').value;

    if (!waktuInput || waktuInput.trim() === "") {
        alert("⚠️ Waktu lapor harus diisi!");
        return;
    }

    if (editIndex === -1 && fotoAdminInput.files.length === 0) {
        alert("⚠️ GAGAL SIMPAN: Anda wajib mengunggah Foto Dokumentasi Kerja Utama!");
        return;
    }

    try {
        const reportData = {
            tgl: document.getElementById('tgl').value,
            waktu: waktuInput,
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
            fotoAdmin: fotoAdminInput.files[0] ? await processImage(fotoAdminInput.files[0]) : (editIndex > -1 ? reports[editIndex].fotoAdmin : null),
            fotoInsiden: fotoInsidenInput.files[0] ? await processImage(fotoInsidenInput.files[0]) : (editIndex > -1 ? reports[editIndex].fotoInsiden : null)
        };

        if (editIndex > -1) {
            reports[editIndex] = reportData;
        } else {
            reports.unshift(reportData); 
        }

        localStorage.setItem('hse_reports', JSON.stringify(reports));
        renderReports();
        document.getElementById('modal-form').classList.add('hidden');
        alert("✅ Laporan Berhasil Disimpan!");
    } catch (error) {
        alert("⚠️ GAGAL: Memori penuh.");
    }
});

function deleteReport(index) {
    if (confirm("Hapus laporan ini?")) {
        reports.splice(index, 1);
        localStorage.setItem('hse_reports', JSON.stringify(reports));
        renderReports();
    }
}

// 8. PENCARIAN (DIPERBAIKI: HANYA TANGGAL)
function searchReport() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = reports.filter(r => {
        const displayDate = formatDateIndo(r.tgl);
        return displayDate.includes(val);
    });
    renderReports(filtered);
}

// 9. DOWNLOAD FILTERED PDF (DIPERBAIKI: FORMAT TANGGAL)
async function downloadFilteredPDF(range) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    
    const filteredData = reports.filter(item => {
        const reportDate = new Date(item.tgl);
        if (range === 'harian') return reportDate.toDateString() === now.toDateString();
        // ... sisa filter mingguan/bulanan ...
        return false;
    });

    if (filteredData.length === 0) {
        alert(`Tidak ada laporan.`);
        return;
    }

    for (let i = 0; i < filteredData.length; i++) {
        const d = filteredData[i];
        const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
        const displayDate = formatDateIndo(d.tgl);
        if (i > 0) doc.addPage();

        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("DAILY HSE REPORT", 105, 15, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Dicetak: ${displayDate}`, 105, 22, { align: "center" });
        doc.line(20, 25, 190, 25);

        const tableBody = [
            ["Tanggal / Waktu Lapor", `${displayDate} / ${d.waktu}`],
            ["Proyek / Area", `${d.proyek} / ${d.area}`],
            ["Izin Kerja (PTW)", d.ptw || "-"],
            ["Manpower", d.manpower + " Orang"],
            ["Aktivitas Kerja", d.keterangan],
            ["Status Area", isIncident ? "TERJADI INSIDEN" : "AMAN / SAFE"],
            ["Tindakan Perbaikan", d.corrective || "-"],
            ["Rencana Besok", d.rencana || "-"]
        ];

        doc.autoTable({
            startY: 30,
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } }
        });
        // ... sisa logic dokumentasi foto ...
    }
    doc.save(`REKAP_HSE_${range.toUpperCase()}_${now.toISOString().split('T')[0]}.pdf`);
}