let laws = [];
let protocol = [];

window.onload = load;

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => {
            const raw = line.innerText.toLowerCase();
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || 
                          raw.match(/od\s+(\d+)\s+let/i) ||
                          raw.match(/(\d+)\s+rok[ua]\s+na\s+(\d+)/i);
            
            return { 
                text: line.innerText, 
                html: line.innerHTML, 
                minJ: match ? parseInt(match[1]) : 0, 
                maxJ: raw.includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                fixJ: line.getAttribute('data-fix-jail') ? parseInt(line.getAttribute('data-fix-jail')) : null,
                fixF: line.getAttribute('data-fix-fine') ? parseInt(line.getAttribute('data-fix-fine')) : null,
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
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query) || l.subs.some(s => s.text.toLowerCase().includes(query)))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row" style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #1a1a1a;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" value="${sub.fixJ !== null ? sub.fixJ : ''}" ${sub.fixJ !== null ? 'disabled' : ''} placeholder="J">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" value="${sub.fixF !== null ? sub.fixF : ''}" ${sub.fixF !== null ? 'disabled' : ''} placeholder="$">
                        <button class="add-btn" onclick="add('${law.id}', ${sIdx})">+</button>
                    </div>`).join('')}
            </div>
        </div>`).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    const inJ = document.getElementById(`j_${lawId}_${sIdx}`);
    const inF = document.getElementById(`f_${lawId}_${sIdx}`);

    let valJ = sub.fixJ !== null ? sub.fixJ : (parseInt(inJ.value) || 0);
    let valF = sub.fixF !== null ? sub.fixF : (parseInt(inF.value) || 0);

    if (sub.fixJ === null) {
        if (valJ > 0 && valJ < sub.minJ) return showAlert("MINIMÁLNĚ " + sub.minJ + " LET!");
        if (valJ > sub.maxJ) return showAlert("MAXIMÁLNĚ " + sub.maxJ + " LET!");
    }

    if (valJ > 0 || valF > 0) {
        protocol.push({ title: law.title, subText: sub.text, jail: valJ, fine: valF, isZP: sub.isZP });
        update();
        if (sub.fixJ === null) inJ.value = '';
        if (sub.fixF === null) inF.value = '';
    }
}

function update() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = protocol.map((p, idx) => `
        <div class="protocol-card" style="background:#111; padding:10px; margin-bottom:8px; border-left:3px solid var(--accent); position:relative;">
            <div style="font-size:12px; font-weight:bold; color:var(--accent);">${p.title}</div>
            <div style="font-size:10px; color:#777;">${p.subText}</div>
            <div style="font-weight:bold; margin-top:5px;">${p.jail} J | $${p.fine}</div>
            <div onclick="removeEntry(${idx})" style="position:absolute; top:5px; right:10px; cursor:pointer;">✕</div>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
    
    // AUTO-SCROLL: Posune boční panel dolů na nejnovější trest
    list.scrollTop = list.scrollHeight;
}

function showAlert(msg) {
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').style.display = 'flex';
}
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function newCase() { protocol = []; update(); }
function removeEntry(idx) { protocol.splice(idx, 1); update(); }