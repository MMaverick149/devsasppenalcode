let laws = [];
let protocol = [];

window.onload = () => load();

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => parseSub(line.innerText, line.innerHTML));
        return { id: "law_"+idx, title, subs };
    });
    render();
}

function parseSub(raw, html) {
    const txt = raw.toLowerCase();
    const match = txt.match(/sazba\s+(\d+)-(\d+)/i) || txt.match(/od\s+(\d+)\s+.*(?:do|až|po)\s+(\d+)/i);
    return { 
        text: raw, html, 
        minJ: match ? parseInt(match[1]) : 0, 
        maxJ: match ? parseInt(match[2]) : 999,
        isZP: raw.toUpperCase().includes("ZBROJNÍ")
    };
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row">
                        <div style="flex:1">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" placeholder="J">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" placeholder="$">
                        <button class="add-btn" onclick="add('${law.id}', ${sIdx})">+</button>
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

    protocol.push({ title: law.title, text: sub.text, jail: jVal, fine: fVal, isZP: sub.isZP });
    update();
}

function update() {
    document.getElementById('caseEntries').innerHTML = protocol.map(p => `
        <div class="protocol-card">
            <div style="font-size:14px; margin-bottom:5px;"><b>${p.title}</b> ${p.isZP ? '<span class="badge-zp">Zbrojní Průkaz</span>':''}</div>
            <div style="font-size:12px; color:#aaa; margin-bottom:10px;">${p.text}</div>
            <div class="p-price"><b>${p.jail} LET | $${p.fine}</b></div>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = "$" + protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
}

function newCase() { protocol = []; update(); }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }