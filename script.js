let laws = [];
let protocol = [];

window.onload = () => load();

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => {
            const raw = line.innerText.toLowerCase();
            
            // Regex pro detekci sazeb (např. 1-5 let, od 25 let po doživotí)
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || 
                          raw.match(/od\s+(\d+)\s+let\s+po\s+doživotí/i) ||
                          raw.match(/od\s+(\d+)\s+let\s+do\s+(\d+)/i) ||
                          raw.match(/(\d+)\s+rok[ua]\s+na\s+(\d+)/i);
            
            const fixJ = line.getAttribute('data-fix-jail');
            const fixF = line.getAttribute('data-fix-fine');

            return { 
                text: line.innerText, 
                html: line.innerHTML, 
                minJ: match ? parseInt(match[1]) : 0, 
                maxJ: raw.includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                fixJ: fixJ !== null ? parseInt(fixJ) : null,
                fixF: fixF !== null ? parseInt(fixF) : null,
                isZP: raw.includes("zbrojní průkaz")
            };
        });
        return { id: "law_"+idx, title, subs };
    });
    render();
}

function enterEvidence() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'flex';
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('lawsContainer');
    
    container.innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query) || l.subs.some(s => s.text.toLowerCase().includes(query)))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => {
                    const jVal = sub.fixJ !== null ? sub.fixJ : "";
                    const fVal = sub.fixF !== null ? sub.fixF : "";
                    return `
                    <div class="row" style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #1a1a1a;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" value="${jVal}" ${sub.fixJ !== null ? 'disabled' : ''} placeholder="J">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" value="${fVal}" ${sub.fixF !== null ? 'disabled' : ''} placeholder="$">
                        <button class="add-btn" onclick="add('${law.id}', ${sIdx})">+</button>
                    </div>`;
                }).join('')}
            </div>
        </div>`).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    
    const inputJ = document.getElementById(`j_${lawId}_${sIdx}`);
    const inputF = document.getElementById(`f_${lawId}_${sIdx}`);

    let finalJ = sub.fixJ !== null ? sub.fixJ : (parseInt(inputJ.value) || 0);
    let finalF = sub.fixF !== null ? sub.fixF : (parseInt(inputF.value) || 0);

    // Validace záporných hodnot
    if (finalJ < 0 || finalF < 0) return;

    // Validace limitů (pokud není fixní)
    if (sub.fixJ === null) {
        if (finalJ > 0 && finalJ < sub.minJ) {
            showAlert(`MINIMÁLNĚ ${sub.minJ} LET!`, `Tento paragraf vyžaduje přísnější potrestání.`);
            return;
        }
        if (finalJ > sub.maxJ) {
            showAlert(`MAXIMÁLNĚ ${sub.maxJ} LET!`, `Sazba neumožňuje vyšší trest.`);
            return;
        }
    }

    if (finalJ > 0 || finalF > 0) {
        protocol.push({ title: law.title, subText: sub.text, jail: finalJ, fine: finalF, isZP: sub.isZP });
        update();
        if (sub.fixJ === null) inputJ.value = '';
        if (sub.fixF === null) inputF.value = '';
    }
}

function update() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = protocol.map((p, idx) => `
        <div class="protocol-card">
            <div style="font-size:12px; font-weight:bold; color:var(--accent);">${p.title}</div>
            <div style="font-size:10px; color:#666; margin-bottom:5px;">${p.subText}</div>
            <div class="p-footer"><b>${p.jail} J | $${p.fine.toLocaleString()}</b></div>
            <div onclick="removeEntry(${idx})" style="position:absolute; top:5px; right:8px; cursor:pointer; color:#444;">✕</div>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
    
    // AUTO-SCROLL bočního panelu dolů
    list.scrollTop = list.scrollHeight;
}

function showAlert(title, msg) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function newCase() { protocol = []; update(); }
function removeEntry(idx) { protocol.splice(idx, 1); update(); }