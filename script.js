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
    // 1. Urutkan data (pastikan 'reports' tersedia di scope global)
    const sortedData = [...reports].sort((a, b) => new Date(`${a.tgl}T${a.waktu}`) - new Date(`${b.tgl}T${b.waktu}`));
    const d = sortedData[index];
    
    // 2. Logika pengecekan insiden
    const isIncident = d.insidenWhat && d.insidenWhat.trim() !== "";
    const previewBody = document.getElementById('preview-body');

    // 3. Render Template
    previewBody.innerHTML = `
        <div class="preview-container" style="font-family: 'Arial', 'Times New Roman', serif; padding: 20px; color: #333; line-height: 1.6;">
            
            <!-- HEADER -->
            <div style="background: #2c3e50; color: #fff; padding: 15px; text-align: center; font-size: 1.2rem; font-weight: bold; border-radius: 4px 4px 0 0; margin-bottom: 20px;">
                PRATINJAU LAPORAN K3 (HSE REPORT)
            </div>
            
            <!-- SECTION I: INFO PROYEK -->
            <h4 style="border-left: 4px solid #2c3e50; padding-left: 10px; margin-bottom: 10px; color: #2c3e50;">I. INFORMASI PROYEK</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; table-layout: fixed;">
                <tr>
                    <td style="border: 1px solid #bdc3c7; padding: 10px; background: #f8f9fa; width: 30%; font-weight: bold;">Tanggal / Waktu</td>
                    <td style="border: 1px solid #bdc3c7; padding: 10px;">${formatDateIndo(d.tgl)} / ${d.waktu} WIB</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #bdc3c7; padding: 10px; background: #f8f9fa; font-weight: bold;">Proyek / Area</td>
                    <td style="border: 1px solid #bdc3c7; padding: 10px;">${d.proyek} / ${d.area}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #bdc3c7; padding: 10px; background: #f8f9fa; font-weight: bold;">Manpower / PTW</td>
                    <td style="border: 1px solid #bdc3c7; padding: 10px;">${d.manpower} Personel / <span style="color: #2980b9;">${d.ptw || '-'}</span></td>
                </tr>
                <tr>
                    <td style="border: 1px solid #bdc3c7; padding: 10px; background: #f8f9fa; font-weight: bold;">Status Keamanan</td>
                    <td style="border: 1px solid #bdc3c7; padding: 10px;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 3px; background: ${isIncident ? '#e74c3c' : '#27ae60'}; color: white; font-weight: bold; font-size: 0.85rem;">
                            ${isIncident ? '🚨 INCIDENT' : '✅ SAFE'}
                        </span>
                    </td>
                </tr>
            </table>

            <!-- SECTION II: DESKRIPSI -->
            <h4 style="border-left: 4px solid #2c3e50; padding-left: 10px; margin-bottom: 10px; color: #2c3e50;">II. AKTIVITAS & RENCANA KERJA</h4>
            <div style="border: 1px solid #bdc3c7; padding: 15px; background: #fff; margin-bottom: 25px; white-space: pre-wrap; border-radius: 4px; min-height: 60px;">${d.keterangan}</div>

            <!-- SECTION III: DOKUMENTASI -->
            <h4 style="border-left: 4px solid #2c3e50; padding-left: 10px; margin-bottom: 15px; color: #2c3e50;">III. DOKUMENTASI LAPANGAN</h4>
            <div style="display: flex; flex-direction: column; gap: 20px;">
                
                <div style="width: 100%;">
                    <p style="font-weight: bold; margin-bottom: 8px; font-size: 0.9rem; color: #555;">📸 Foto Aktivitas Utama:</p>
                    <img src="${d.fotoAdmin}" style="width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; background: #eee;">
                </div>
                
                ${d.fotoInsiden ? `
                <div style="width: 100%; border-top: 1px dashed #e74c3c; pt: 15px;">
                    <p style="font-weight: bold; color: #e74c3c; margin-bottom: 8px; font-size: 0.9rem;">⚠️ Foto Temuan Insiden/Bahaya:</p>
                    <img src="${d.fotoInsiden}" style="width: 100%; max-height: 400px; object-fit: contain; border: 2px solid #e74c3c; border-radius: 8px; background: #fdf2f2;">
                </div>
                ` : ''}
                
            </div>
        </div>
    `;

    // 4. Tampilkan Modal
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
