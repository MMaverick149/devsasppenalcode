let laws = [];
let protocol = [];

function login() { document.getElementById('loginOverlay').style.display = 'none'; load(); }

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => {
            const raw = line.innerText.toLowerCase();
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+.*(?:do|až|po)\s+(\d+)/i);
            return { 
                text: line.innerText, 
                html: line.innerHTML, 
                minJ: match ? parseInt(match[1]) : 0, 
                maxJ: match ? parseInt(match[2]) : 999,
                isZP: line.innerText.toUpperCase().includes("ZBROJNÍ")
            };
        });
        return { id: "law_"+idx, title, subs };
    });
    render();
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('lawsContainer');
    container.innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query) || l.subs.some(s => s.text.toLowerCase().includes(query)))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title} <span>▼</span></div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row" style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #1c1f24;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" placeholder="J" style="background:#000; border:1px solid #333; color:var(--accent); width:45px; padding:8px; text-align:center;">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" placeholder="$" style="background:#000; border:1px solid #333; color:var(--accent); width:60px; padding:8px; text-align:center;">
                        <button onclick="add('${law.id}', ${sIdx})" style="background:var(--accent); border:none; padding:8px 15px; font-weight:900; cursor:pointer; border-radius:4px;">+</button>
                    </div>
                `).join('')}
            </div>
        </div>`).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    const jVal = parseInt(document.getElementById(`j_${lawId}_${sIdx}`).value) || 0;
    const fVal = parseInt(document.getElementById(`f_${lawId}_${sIdx}`).value) || 0;

    if (jVal > sub.maxJ && sub.maxJ !== 999) {
        document.getElementById('alertMsg').innerText = `Sazba je max ${sub.maxJ} let. Více nelze udělit ani se Státním Zástupcem!`;
        document.getElementById('customAlert').style.display = 'flex';
        return;
    }

    protocol.push({ title: law.title, subText: sub.text, jail: jVal, fine: fVal, isZP: sub.isZP });
    update();
}

function update() {
    document.getElementById('caseEntries').innerHTML = protocol.map(p => `
        <div class="protocol-card">
            <span class="p-header">${p.title} ${p.isZP ? '<span style="background:var(--red); color:#fff; font-size:10px; padding:2px 5px; border-radius:3px; margin-left:10px;">Zbrojní Průkaz</span>' : ''}</span>
            <div class="p-text">${p.subText}</div>
            <div class="p-footer">${p.jail} LET | $${p.fine.toLocaleString()}</div>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
}

function newCase() { protocol = []; update(); }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }