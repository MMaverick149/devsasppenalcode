let laws = [];
let protocol = [];

window.onload = () => load();

async function load() {
    try {
        const res = await fetch('tresty.html?v=' + Date.now());
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        laws = Array.from(doc.querySelectorAll('.law-item')).map((item, index) => {
            const title = item.getAttribute('data-title');
            const id = "law_" + index;
            let subs = Array.from(item.querySelectorAll('.sub-line')).map(line => parseSub(line.innerText, line.innerHTML));

            // Fixace limitů pro §7 c) a d)
            if (title.includes('§7')) {
                subs = subs.map(s => {
                    if (s.text.toLowerCase().includes('c)')) {
                        return parseSub("c) úmyslně a zbraní střelnou sazba 3-10 let", "c) úmyslně a zbraní střelnou <b class='highlight'>sazba 3-10 let</b>");
                    }
                    return s;
                });
            }
            return { id, title, subs };
        });
        render();
    } catch (e) { console.error("Chyba při načítání:", e); }
}

function parseSub(raw, html) {
    const txt = raw.toLowerCase();
    const dashMatch = txt.match(/sazba\s+(\d+)-(\d+)/i);
    const rangeMatch = txt.match(/od\s+(\d+)\s+.*(?:do|až|po)\s+(\d+|doživotí)/i);
    let min = 0; let max = 999;
    
    if (dashMatch) { min = parseInt(dashMatch[1]); max = parseInt(dashMatch[2]); }
    else if (rangeMatch) { min = parseInt(rangeMatch[1]); max = rangeMatch[2].includes("doživotí") ? 99 : parseInt(rangeMatch[2]); }

    return { 
        text: raw, html: html, minJ: min, maxJ: max,
        isZP: raw.toUpperCase().includes("ZBROJNÍ"),
        hasJ: txt.includes("let") || txt.includes("sazba"),
        hasF: txt.includes("pokut") || txt.includes("$")
    };
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query))
        .map((law, lIdx) => `
        <div class="law-item" id="${law.id}">
            <div class="law-header" onclick="toggleContent(this)">${law.title}</div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => `
                    <div class="row">
                        <div class="law-desc">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${lIdx}_${sIdx}" placeholder="J" ${!sub.hasJ?'disabled':''}>
                        <input type="number" class="input-box" id="f_${lIdx}_${sIdx}" placeholder="$" ${!sub.hasF?'disabled':''}>
                        <button class="add-btn" onclick="add(${lIdx}, ${sIdx})">+</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function add(lIdx, sIdx) {
    const jVal = parseInt(document.getElementById(`j_${lIdx}_${sIdx}`).value) || 0;
    const fVal = parseInt(document.getElementById(`f_${lIdx}_${sIdx}`).value) || 0;
    const sub = laws[lIdx].subs[sIdx];
    
    if (jVal > 0 && (jVal < sub.minJ || (jVal > sub.maxJ && sub.maxJ !== 999))) {
        return alert(`Trest musí být v rozmezí ${sub.minJ}-${sub.maxJ} let!`);
    }

    const letterMatch = sub.text.match(/^([a-z]\))/i);
    const letter = letterMatch ? letterMatch[1] : "";

    protocol.push({ 
        lawId: laws[lIdx].id, title: laws[lIdx].title, letter: letter,
        jail: jVal, fine: fVal, isZP: sub.isZP 
    });
    update();
}

function update() {
    document.getElementById('caseEntries').innerHTML = protocol.map((p, i) => `
        <div class="protocol-card" onclick="document.getElementById('${p.lawId}').scrollIntoView({behavior:'smooth'});">
            <span class="p-title">${p.title} ${p.letter} ${p.isZP ? '<span class="badge-zp">ZP</span>' : ''}</span>
            <div class="p-details">${p.jail} J | $${p.fine.toLocaleString()}</div>
        </div>
    `).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = "$" + protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
}

function newCase() {
    protocol = [];
    update();
}

function toggleContent(el) {
    const content = el.nextElementSibling;
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}