// 1. INITIALIZATION & MEMORY MANAGEMENT (MAX 31 LAPORAN)
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

// 3. IMAGE PROCESSING (KOMPRESI AGRESIF)
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
                const MAX_WIDTH = 800; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
}

// 4. CORE PDF GENERATOR (Times New Roman 12 & Adaptive Logic)
function generateHSEReportPage(doc, data, titleText) {
    const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
    const displayDate = formatDateIndo(data.tgl);
    const printTime = new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});

    doc.setFont("times", "bold");
    doc.setFontSize(16); 
    doc.text(titleText, 105, 15, { align: "center" });
    
    doc.setFont("times", "normal");
    doc.setFontSize(12); 
    doc.text(`Dicetak: ${displayDate} | ${printTime} WIB`, 105, 22, { align: "center" });
    doc.line(15, 25, 195, 25);

    doc.autoTable({
        startY: 30,
        body: [
            ["Tanggal / Waktu Lapor", `${displayDate} / ${data.waktu} WIB`],
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

    const addAdaptiveImg = (imgData, label, yPos) => {
        if (!imgData) return yPos;
        try {
            const props = doc.getImageProperties(imgData);
            const fullWidth = 180; 
            const ratio = props.width / props.height;
            let h = fullWidth / ratio;
            
            const bottomLimit = 280;
            const availableSpace = bottomLimit - yPos;

            if (h > availableSpace) {
                if (availableSpace < 50) {
                    doc.addPage();
                    yPos = 20;
                    h = fullWidth / ratio;
                } else {
                    h = availableSpace - 10;
                }
            }

            doc.setFont("times", "bold");
            doc.text(label, 15, yPos);
            const finalW = h * ratio > 180 ? 180 : h * ratio;
            doc.addImage(imgData, 'JPEG', 15, yPos + 2, finalW, h);
            return yPos + h + 15;
        } catch (e) { return yPos; }
    };

    let nextY = addAdaptiveImg(data.fotoAdmin, "Foto Aktivitas Utama:", currentY);
    if (isIncident && data.fotoInsiden) {
        addAdaptiveImg(data.fotoInsiden, "Foto Temuan Insiden:", nextY);
    }
}

// 5. DOWNLOAD FUNCTIONS (Urutan Ascending)
async function downloadPDF(index) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const sortedData = [...reports].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
    generateHSEReportPage(doc, sortedData[index], "DAILY HSE REPORT");
    doc.save(`HSE_REPORT_${sortedData[index].proyek.toUpperCase()}_${formatDateIndo(sortedData[index].tgl).replace(/\//g,'-')}.pdf`);
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
    filtered.sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));

    filtered.forEach((d, i) => { 
        if (i > 0) doc.addPage(); 
        generateHSEReportPage(doc, d, `REKAP HSE ${range.toUpperCase()}`); 
    });
    
    const tglFile = now.toLocaleDateString('id-ID').replace(/\//g, '-');
    const namaProyek = filtered[0].proyek.toUpperCase();
    doc.save(`REKAP_HSE_${range.toUpperCase()}_${namaProyek}_${tglFile}.pdf`);
}

// 6. PRATINJAU (PREVIEW) & CRUD
function openPreview(index) {
    const sortedData = [...reports].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
    const d = sortedData[index];
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
    const previewBody = document.getElementById('preview-body');

    previewBody.innerHTML = `
        <div class="preview-container" style="font-family: 'Times New Roman', serif; padding:10px; color: #000;">
            <div style="background:#333; color:#fff; padding:12px; text-align:center; font-weight:bold; margin-bottom:20px;">PRATINJAU LAPORAN K3</div>
            
            <h4 style="border-bottom:2px solid #333; padding-bottom:5px; margin-bottom:10px;">I. INFORMASI PROYEK</h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.95rem;">
                <tr><td style="border:1px solid #ddd; padding:8px; background:#f4f4f4; width:35%;"><strong>Tanggal / Waktu</strong></td><td style="border:1px solid #ddd; padding:8px;">${formatDateIndo(d.tgl)} / ${d.waktu} WIB</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px; background:#f4f4f4;"><strong>Proyek / Area</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.proyek} / ${d.area}</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px; background:#f4f4f4;"><strong>Manpower / PTW</strong></td><td style="border:1px solid #ddd; padding:8px;">${d.manpower} Orang / ${d.ptw || '-'}</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px; background:#f4f4f4;"><strong>Status</strong></td><td style="border:1px solid #ddd; padding:8px; font-weight:bold; color:${isIncident?'red':'green'};">${isIncident?'INCIDENT':'SAFE'}</td></tr>
            </table>

            <h4 style="border-bottom:2px solid #333; padding-bottom:5px; margin-bottom:10px;">II. AKTIVITAS & RENCANA</h4>
            <div style="border:1px solid #ddd; padding:10px; background:#f9f9f9; margin-bottom:20px; white-space: pre-wrap;">${d.keterangan}</div>

            <h4 style="margin-bottom: 10px;">DOKUMENTASI LAPANGAN:</h4>
            <div style="text-align:left;">
                <p style="font-weight:bold; margin-bottom:5px;">Foto Aktivitas Utama:</p>
                <img src="${d.fotoAdmin}" style="max-width:100%; border:1px solid #ddd; border-radius:5px; margin-bottom:15px;">
                
                ${d.fotoInsiden ? `
                <p style="font-weight:bold; color:red; margin-bottom:5px;">Foto Temuan Insiden:</p>
                <img src="${d.fotoInsiden}" style="max-width:100%; border:2px solid red; border-radius:5px;">
                ` : ''}
            </div>
        </div>
    `;
    document.getElementById('modal-preview').classList.remove('hidden');
}

function closePreview() { document.getElementById('modal-preview').classList.add('hidden'); }

function showForm(index = -1) {
    const modal = document.getElementById('modal-form');
    document.getElementById('hse-form').reset();
    if (index > -1) {
        document.getElementById('modalTitle').innerText = "Edit Laporan K3";
        const sortedData = [...reports].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
        const targetData = sortedData[index];
        document.getElementById('editIndex').value = reports.indexOf(targetData);
        const fields = ['tgl','waktu','proyek','area','ptw','manpower','keterangan','insidenWhat','insidenWho','insidenWhere','insidenWhen','insidenHow','corrective','rencana'];
        fields.forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = targetData[f] || ''; });
    } else {
        document.getElementById('modalTitle').innerText = "Buat Laporan Baru";
        document.getElementById('editIndex').value = -1;
        document.getElementById('tgl').value = new Date().toISOString().split('T')[0];
    }
    modal.classList.remove('hidden');
}

function hideForm() { if (confirm("Batalkan pengisian laporan?")) { document.getElementById('modal-form').classList.add('hidden'); } }

function renderReports(filterData = reports) {
    const list = document.getElementById('reportList');
    if(!list) return;
    list.innerHTML = '';
    const sortedData = [...filterData].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
    sortedData.forEach((data, index) => {
        const isIncident = data.insidenWhat && data.insidenWhat.trim() !== "";
        list.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="text-align:center; padding: 15px;">${index + 1}</td>
                <td style="padding: 15px;"><strong>${formatDateIndo(data.tgl)}</strong><br><small>${data.waktu} WIB</small></td>
                <td style="padding: 15px;"><b>${data.proyek}</b></td>
                <td style="padding: 15px;">${data.area}</td>
                <td style="padding: 15px; text-align:center;">${data.manpower}</td>
                <td style="padding: 15px; width: 250px;">
                    <div style="display:flex; flex-direction:column; align-items:center; background:#fafafa; border-radius:5px; padding:5px; border:1px solid #eee;">
                        <img src="${data.fotoAdmin}" style="width:100%; border-radius:5px; cursor:pointer;" onclick="openPreview(${index})">
                        <div style="font-size:0.75rem; text-align:left; width:100%; margin-top:5px; color:#555;">Ket: ${data.keterangan.substring(0,40)}...</div>
                    </div>
                </td>
                <td style="text-align:center; padding: 15px; font-weight:bold; color:${isIncident?'red':'green'};">${isIncident?'INCIDENT':'SAFE'}</td>
                <td style="padding: 15px;">
                    <div class="action-btns" style="display:flex; gap:5px; justify-content:center;">
                        <button onclick="openPreview(${index})" class="btn-icon view"><i class="fas fa-eye"></i></button>
                        <button onclick="showForm(${index})" class="btn-icon edit"><i class="fas fa-edit"></i></button>
                        <button onclick="downloadPDF(${index})" class="btn-icon pdf"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="deleteReportByRenderIndex(${index})" class="btn-icon delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

function deleteReportByRenderIndex(renderIndex) {
    if (confirm("Hapus laporan ini secara permanen?")) {
        const sortedData = [...reports].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
        const originalIndex = reports.indexOf(sortedData[renderIndex]);
        if (originalIndex > -1) {
            reports.splice(originalIndex, 1);
            localStorage.setItem('hse_reports', JSON.stringify(reports));
            renderReports();
        }
    }
}

document.getElementById('hse-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editIndex').value);
    try {
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
            fotoAdmin: document.getElementById('fotoAdmin').files[0] ? await processImage(document.getElementById('fotoAdmin').files[0]) : (editIndex > -1 ? reports[editIndex].fotoAdmin : null),
            fotoInsiden: document.getElementById('fotoInsiden').files[0] ? await processImage(document.getElementById('fotoInsiden').files[0]) : (editIndex > -1 ? reports[editIndex].fotoInsiden : null)
        };
        
        if (editIndex > -1) { 
            reports[editIndex] = reportData; 
        } else { 
            if (reports.length >= 31) { reports.shift(); } 
            reports.push(reportData); 
        }
        
        localStorage.setItem('hse_reports', JSON.stringify(reports));
        renderReports();
        document.getElementById('modal-form').classList.add('hidden');
        alert("✅ Laporan Berhasil Disimpan!");
    } catch (error) { 
        alert("⚠️ GAGAL: Memori browser penuh. Hapus beberapa laporan lama."); 
    }
});

function searchReport() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = reports.filter(r => r.proyek.toLowerCase().includes(val) || formatDateIndo(r.tgl).includes(val));
    renderReports(filtered);
}