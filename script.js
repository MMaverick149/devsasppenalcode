let laws = [];
let protocol = [];

// Okamžité načtení
window.onload = () => load();

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => {
            const raw = line.innerText.toLowerCase();
            // Oprava regexu pro lepší detekci limitů
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+.*(?:do|až|po)\s+(\d+)/i) || raw.match(/(\d+)\s*(?:rok|let|roku)\s+na\s+(\d+)/i);
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
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query) || l.subs.some(s => s.text.toLowerCase().includes(query)))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title} <span>▼</span></div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row" style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #1c1f24;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" placeholder="J" style="background:#000; border:1px solid #333; color:var(--accent); width:50px; padding:8px; text-align:center; border-radius:4px;">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" placeholder="$" style="background:#000; border:1px solid #333; color:var(--accent); width:70px; padding:8px; text-align:center; border-radius:4px;">
                        <button onclick="add('${law.id}', ${sIdx})" style="background:var(--accent); border:none; width:40px; height:35px; font-weight:900; cursor:pointer; border-radius:4px;">+</button>
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

    // FIX LOGIKY LIMITU: Kontrolujeme jen pokud je zadaná hodnota a pokud zákon má definované maxJ
    if (jVal > sub.maxJ && sub.maxJ !== 999) {
        document.getElementById('alertMsg').innerText = `Sazba je max ${sub.maxJ} let. Více nelze udělit ani se Státním Zástupcem!`;
        document.getElementById('customAlert').style.display = 'flex';
        return;
    }

    // Přidání do protokolu (i když je jedno z polí nula)
    if (jVal > 0 || fVal > 0) {
        protocol.push({ 
            title: law.title, 
            subText: sub.text, 
            jail: jVal, 
            fine: fVal, 
            isZP: sub.isZP 
        });
        update();
        // Vymazání políček po přidání
        document.getElementById(`j_${lawId}_${sIdx}`).value = '';
        document.getElementById(`f_${lawId}_${sIdx}`).value = '';
    }
}

function update() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = protocol.map((p, idx) => `
        <div class="protocol-card">
            <span class="p-header">${p.title} ${p.isZP ? '<span style="background:var(--red); color:#fff; font-size:10px; padding:2px 6px; border-radius:3px; margin-left:10px; vertical-align:middle;">Zbrojní Průkaz</span>' : ''}</span>
            <span class="p-text">${p.subText}</span>
            <div class="p-footer"><b>${p.jail} LET | $${p.fine.toLocaleString()}</b></div>
            <div onclick="removeEntry(${idx})" style="position:absolute; top:10px; right:10px; cursor:pointer; color:#444;">✕</div>
        </div>`).join('');
    
    const totalJ = protocol.reduce((a, b) => a + b.jail, 0);
    const totalF = protocol.reduce((a, b) => a + b.fine, 0);
    
    document.getElementById('sumJail').innerText = totalJ;
    document.getElementById('sumFine').innerText = totalF.toLocaleString();
}

function removeEntry(idx) { protocol.splice(idx, 1); update(); }
function newCase() { protocol = []; update(); }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }