let laws = [];
let protocol = [];

// Přihlášení
function login() {
    document.getElementById('loginOverlay').style.display = 'none';
    load();
}

// Červené varování místo alertu
function showAlert(msg) {
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

// Načítání a Sekce
async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        let subs = Array.from(item.querySelectorAll('.sub-line')).map(line => parseSub(line.innerText, line.innerHTML));

        if (title.includes('§7')) {
            subs = subs.map(s => s.text.includes('c)') ? parseSub("c) úmyslně a zbraní střelnou sazba 3-10 let", "c) úmyslně a zbraní střelnou <b class='highlight'>sazba 3-10 let</b>") : s);
        }
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
        <div class="law-item" id="${law.id}">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row">
                        <div style="flex:1">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" placeholder="J">
                        <button class="add-btn" onclick="add('${law.id}', ${sIdx})">+</button>
                    </div>
                `).join('')}
            </div>
        </div>`).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    const val = parseInt(document.getElementById(`j_${lawId}_${sIdx}`).value) || 0;

    if (val > 0 && (val < sub.minJ || (val > sub.maxJ && sub.maxJ !== 999))) {
        return showAlert(`MAXIMÁLNĚ ${sub.maxJ} LET!`); // Tady se volá to červené okno
    }

    const letter = sub.text.match(/^([a-z]\))/i)?.[1] || "";
    protocol.push({ lawId, title: law.title, letter, jail: val, isZP: sub.isZP });
    update();
}

function update() {
    document.getElementById('caseEntries').innerHTML = protocol.map(p => `
        <div class="protocol-card" onclick="document.getElementById('${p.lawId}').scrollIntoView({behavior:'smooth'})">
            <span style="color:var(--accent); font-weight:bold;">${p.title} ${p.letter}</span>
            <div style="font-size:18px; font-weight:900;">${p.jail} J</div>
        </div>`).join('');
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
}

function newCase() { protocol = []; update(); }