let laws = [];
let protocol = [];

function login() {
    document.getElementById('loginOverlay').style.display = 'none';
    load(); // Načte data až po přihlášení
}

function showAlert(msg) {
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        let subs = Array.from(item.querySelectorAll('.sub-line')).map(line => parseSub(line.innerText, line.innerHTML));
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
        maxJ: match ? parseInt(match[2]) : 999 
    };
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">
                ${law.title}
            </div>
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
        showAlert(`LIMIT PŘEKROČEN! MAXIMÁLNĚ ${sub.maxJ} LET.`);
        return;
    }
    // ... zbytek tvé funkce add a update ...
}