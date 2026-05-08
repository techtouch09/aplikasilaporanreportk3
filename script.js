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

// 3. IMAGE PROCESSING
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
                const MAX_WIDTH = 1200; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
    });
}

// 4. CORE PDF GENERATOR (Times New Roman 12 & Adaptive Logic)
function generateHSEReportPage(doc, data, titleText) {
    const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
    const displayDate = formatDateIndo(data.tgl);

    doc.setFont("times", "bold");
    doc.setFontSize(16); 
    doc.text(titleText, 105, 15, { align: "center" });
    
    doc.setFont("times", "normal");
    doc.setFontSize(12); 
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 22, { align: "center" });
    doc.line(15, 25, 195, 25);

    doc.autoTable({
        startY: 30,
        body: [
            ["Tanggal / Waktu Lapor", `${displayDate} / ${data.waktu}`],
            ["Proyek / Area", `${data.proyek} / ${data.area}`],
            ["Izin Kerja (PTW)", data.ptw || "-"],
            ["Manpower", data.manpower + " Orang"],
            ["Aktivitas Kerja", data.keterangan],
            ["Status Area", isIncident ? "TERJADI INSIDEN" : "AMAN / SAFE"],
            ["Tindakan Perbaikan", data.corrective || "-"],
            ["Rencana Besok", data.rencana || "-"]
        ],
        theme: 'grid',
        styles: { font: "times", fontSize: 12, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
        margin: { left: 15, right: 15 }
    });

    let currentY = doc.lastAutoTable.finalY + 12;
    doc.setFont("times", "bold"); doc.setFontSize(12);
    doc.text("DOKUMENTASI LAPANGAN:", 15, currentY);
    currentY += 8;

    const addAdaptiveImg = (imgData, label, y) => {
        if (!imgData) return y;
        try {
            const props = doc.getImageProperties(imgData);
            const fullWidth = 180; 
            const ratio = props.width / props.height;
            let h = fullWidth / ratio;
            if (y + h > 280) {
                if (280 - y < 60) { doc.addPage(); y = 20; }
                else { h = 280 - y - 10; }
            }
            doc.setFont("times", "bold");
            doc.text(label, 15, y);
            doc.addImage(imgData, 'JPEG', 15, y + 2, h * ratio > 180 ? 180 : h * ratio, h);
            return y + h + 15;
        } catch (e) { return y; }
    };

    let nextY = addAdaptiveImg(data.fotoAdmin, "Foto Aktivitas Utama:", currentY);
    if (isIncident && data.fotoInsiden) {
        addAdaptiveImg(data.fotoInsiden, "Foto Temuan Insiden:", nextY);
    }
}

// 5. DOWNLOAD FUNCTIONS
async function downloadPDF(index) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const d = reports[index];
    generateHSEReportPage(doc, d, "DAILY HSE REPORT");
    const fileDate = formatDateIndo(d.tgl).replace(/\//g, '-');
    doc.save(`HSE_REPORT_${d.proyek.toUpperCase()}_${fileDate}.pdf`);
}

async function downloadFilteredPDF(range) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    const filtered = reports.filter(item => {
        const d = new Date(item.tgl);
        if (range === 'harian') return d.toDateString() === now.toDateString();
        if (range === 'mingguan') { let week = new Date(); week.setDate(now.getDate()-7); return d >= week && d <= now; }
        if (range === 'bulanan') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return false;
    });
    if (filtered.length === 0) return alert("Data tidak ditemukan");
    filtered.sort((a,b) => new Date(`${b.tgl}T${b.waktu}`) - new Date(`${a.tgl}T${a.waktu}`));
    filtered.forEach((d, i) => { if(i>0) doc.addPage(); generateHSEReportPage(doc, d, `REKAP HSE ${range.toUpperCase()}`); });
    
    const tgl = now.toLocaleDateString('id-ID').replace(/\//g,'-');
    const namaProyek = filtered[0].proyek.toUpperCase();
    doc.save(`REKAP_HSE_${range.toUpperCase()}_${namaProyek}_${tgl}.pdf`);
}

// 6. PRATINJAU (PREVIEW) - KEMBALI KE MENU & TABEL SEMULA
function openPreview(index) {
    const d = reports[index];
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
    const previewBody = document.getElementById('preview-body');

    previewBody.innerHTML = `
        <div class="preview-container" style="font-family: 'Times New Roman', serif;">
            <div class="preview-section-title" style="background:#333; color:#fff; padding:10px; margin-bottom:15px; text-align:center; font-weight:bold;">INFORMASI LAPORAN K3</div>
            
            <div class="preview-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <div style="border:1px solid #ddd; padding:8px;"><strong>Tanggal:</strong> ${formatDateIndo(d.tgl)}</div>
                <div style="border:1px solid #ddd; padding:8px;"><strong>Waktu:</strong> ${d.waktu}</div>
                <div style="border:1px solid #ddd; padding:8px;"><strong>Proyek:</strong> ${d.proyek}</div>
                <div style="border:1px solid #ddd; padding:8px;"><strong>Area:</strong> ${d.area}</div>
                <div style="border:1px solid #ddd; padding:8px;"><strong>Manpower:</strong> ${d.manpower} Orang</div>
                <div style="border:1px solid #ddd; padding:8px;"><strong>Status:</strong> ${isIncident ? '<span style="color:red; font-weight:bold;">INCIDENT</span>' : '<span style="color:green; font-weight:bold;">SAFE</span>'}</div>
            </div>

            <div class="preview-section-title" style="border-bottom:2px solid #333; font-weight:bold; margin-bottom:10px;">AKTIVITAS KERJA</div>
            <div style="border:1px solid #ddd; padding:10px; background:#f9f9f9; margin-bottom:20px; white-space: pre-wrap;">${d.keterangan}</div>

            ${isIncident ? `
            <div class="preview-section-title" style="color:red; font-weight:bold; border-bottom:2px solid red; margin-bottom:10px;">DETAIL INVESTIGASI INSIDEN</div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.95rem;">
                <tr><td style="border:1px solid #ddd; padding:8px; width:30%;"><strong>Apa:</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.insidenWhat}</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;"><strong>Siapa:</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.insidenWho}</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;"><strong>Dimana:</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.insidenWhere}</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;"><strong>Kronologi:</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.insidenHow}</td></tr>
            </table>` : ''}

            <div class="preview-section-title" style="border-bottom:2px solid #333; font-weight:bold; margin-bottom:10px;">DOKUMENTASI FOTO</div>
            <div style="text-align:center;">
                <p><strong>Foto Aktivitas Utama:</strong></p>
                <img src="${d.fotoAdmin}" style="max-width:100%; height:auto; border:1px solid #ddd; border-radius:5px; margin-bottom:15px;">
                ${d.fotoInsiden ? `<p style="color:red;"><strong>Foto Temuan Insiden:</strong></p><img src="${d.fotoInsiden}" style="max-width:100%; height:auto; border:2px solid red; border-radius:5px;">` : ''}
            </div>
        </div>
    `;
    document.getElementById('modal-preview').classList.remove('hidden');
}

function closePreview() { document.getElementById('modal-preview').classList.add('hidden'); }

// 7. FORM CONTROL (X DAN BATAL)
function showForm(index = -1) {
    const modal = document.getElementById('modal-form');
    document.getElementById('hse-form').reset();
    document.getElementById('editIndex').value = index;
    if (index > -1) {
        document.getElementById('modalTitle').innerText = "Edit Laporan K3";
        const d = reports[index];
        const fields = ['tgl','waktu','proyek','area','ptw','manpower','keterangan','insidenWhat','insidenWho','insidenWhere','insidenWhen','insidenHow','corrective','rencana'];
        fields.forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = d[f] || ''; });
    } else {
        document.getElementById('modalTitle').innerText = "Buat Laporan Baru";
        document.getElementById('tgl').value = new Date().toISOString().split('T')[0];
    }
    modal.classList.remove('hidden');
}

function hideForm() { if (confirm("Batalkan pengisian laporan?")) { document.getElementById('modal-form').classList.add('hidden'); } }

// 8. CRUD & RENDER
function renderReports(filterData = reports) {
    const list = document.getElementById('reportList');
    if(!list) return;
    list.innerHTML = '';
    filterData.forEach((data, index) => {
        const originalIndex = reports.findIndex(r => r === data);
        const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
        
        const thumbStyle = `width: 200px; height: auto; border-radius: 8px; cursor: pointer; border: 1px solid #ddd; margin-bottom: 8px;`;

        list.innerHTML += `
            <tr>
                <td style="text-align:center">${index + 1}</td>
                <td>${formatDateIndo(data.tgl)}<br><small>${data.waktu}</small></td>
                <td><b>${data.proyek}</b></td>
                <td>${data.area}</td>
                <td style="text-align:center;">${data.manpower}</td>
                <td style="padding: 10px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <img src="${data.fotoAdmin}" style="${thumbStyle}" onclick="openPreview(${originalIndex})">
                        <div style="font-size: 0.85rem; width: 200px;">
                            <strong>Ket:</strong> ${data.keterangan.substring(0, 50)}...
                        </div>
                    </div>
                </td>
                <td style="text-align:center;">${isIncident ? '<span class="badge-red">INCIDENT</span>' : '<span class="badge-green">SAFE</span>'}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="openPreview(${originalIndex})" class="btn-icon view"><i class="fas fa-eye"></i></button>
                        <button onclick="showForm(${originalIndex})" class="btn-icon edit"><i class="fas fa-edit"></i></button>
                        <button onclick="downloadPDF(${originalIndex})" class="btn-icon pdf"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="deleteReport(${originalIndex})" class="btn-icon delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

document.getElementById('hse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const fAdmin = document.getElementById('fotoAdmin');
    const fInsiden = document.getElementById('fotoInsiden');

    const reportData = {
        tgl: document.getElementById('tgl').value,
        waktu: document.getElementById('waktu').value,
        proyek: document.getElementById('proyek').value,
        area: document.getElementById('area').value,
        ptw: document.getElementById('ptw').value,
        manpower: document.getElementById('manpower').value,
        keterangan: document.getElementById('keterangan').value,
        insidenWhat: document.getElementById('insidenWhat').value,
        insidenWho: document.getElementById('insidenWho').value,
        insidenWhere: document.getElementById('insidenWhere').value,
        insidenWhen: document.getElementById('insidenWhen').value,
        insidenHow: document.getElementById('insidenHow').value,
        corrective: document.getElementById('corrective').value,
        rencana: document.getElementById('rencana').value,
        fotoAdmin: fAdmin.files[0] ? await processImage(fAdmin.files[0]) : (editIndex > -1 ? reports[editIndex].fotoAdmin : null),
        fotoInsiden: fInsiden.files[0] ? await processImage(fInsiden.files[0]) : (editIndex > -1 ? reports[editIndex].fotoInsiden : null)
    };

    if (editIndex > -1) reports[editIndex] = reportData;
    else reports.unshift(reportData);

    localStorage.setItem('hse_reports', JSON.stringify(reports));
    renderReports();
    document.getElementById('modal-form').classList.add('hidden');
    alert("Laporan Berhasil Disimpan!");
});

function deleteReport(index) { if (confirm("Hapus laporan ini?")) { reports.splice(index, 1); localStorage.setItem('hse_reports', JSON.stringify(reports)); renderReports(); } }

function searchReport() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = reports.filter(r => r.proyek.toLowerCase().includes(val) || formatDateIndo(r.tgl).includes(val));
    renderReports(filtered);
}