let laws = [];
let protocol = [];

window.onload = load;

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Automatické načtení sekcí (§7, §8 atd.)
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        return {
            id: "law_" + idx,
            title: item.getAttribute('data-title') || "Neznámá sekce",
            subs: Array.from(item.querySelectorAll('.sub-line')).map(line => {
                const raw = line.innerText.toLowerCase();
                const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+let/i);
                return {
                    text: line.innerText,
                    html: line.innerHTML,
                    minJ: match ? parseInt(match[1]) : 0,
                    maxJ: raw.includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                    fixJ: line.getAttribute('data-fix-jail') ? parseInt(line.getAttribute('data-fix-jail')) : null,
                    fixF: line.getAttribute('data-fix-fine') ? parseInt(line.getAttribute('data-fix-fine')) : null
                };
            })
        };
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
    
    container.innerHTML = laws.map(law => {
        const hasMatch = law.title.toLowerCase().includes(query) || law.subs.some(s => s.text.toLowerCase().includes(query));
        if (!hasMatch && query !== "") return "";

        return `
        <div class="law-item ${query !== "" ? 'active' : ''}">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" placeholder="J" value="${sub.fixJ || ''}" ${sub.fixJ ? 'disabled' : ''}>
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" placeholder="$" value="${sub.fixF || ''}" ${sub.fixF ? 'disabled' : ''}>
                        <button class="add-btn" onclick="add('${law.id}', ${sIdx})">+</button>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    const jIn = document.getElementById(`j_${lawId}_${sIdx}`);
    const fIn = document.getElementById(`f_${lawId}_${sIdx}`);

    let vJ = sub.fixJ || parseInt(jIn.value) || 0;
    let vF = sub.fixF || parseInt(fIn.value) || 0;

    if (!sub.fixJ && (vJ < sub.minJ || vJ > sub.maxJ)) {
        return showAlert(`TREST MIMO SAZBU! (${sub.minJ} - ${sub.maxJ} let)`);
    }

    protocol.push({ title: law.title, jail: vJ, fine: vF });
    updateSidebar();
}

function updateSidebar() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = protocol.map((p, i) => `
        <div class="protocol-card">
            <small>${p.title}</small>
            <div><b>${p.jail} J | $${p.fine.toLocaleString()}</b></div>
            <span style="position:absolute; right:10px; top:10px; cursor:pointer;" onclick="protocol.splice(${i},1);updateSidebar()">✕</span>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
    list.scrollTop = list.scrollHeight;
}

function showAlert(m) { document.getElementById('alertMsg').innerText = m; document.getElementById('customAlert').style.display = 'flex'; }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function newCase() { protocol = []; updateSidebar(); }