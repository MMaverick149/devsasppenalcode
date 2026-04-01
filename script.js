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
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+.*(?:do|až|po)\s+(\d+)/i) || raw.match(/(\d+)\s*(?:rok|let|roku)\s+na\s+(\d+)/i);
            
            // Načtení fixních hodnot z HTML
            const fixJ = parseInt(line.getAttribute('data-fix-jail')) || 0;
            const fixF = parseInt(line.getAttribute('data-fix-fine')) || 0;

            return { 
                text: line.innerText, 
                html: line.innerHTML, 
                minJ: match ? parseInt(match[1]) : 0, 
                maxJ: match ? parseInt(match[2]) : 999,
                fixJ: fixJ,
                fixF: fixF,
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
                ${law.subs.map((sub, sIdx) => {
                    // Pokud je fixní trest, předvyplníme a zamkneme políčko
                    const jAttr = sub.fixJ > 0 ? `value="${sub.fixJ}" disabled` : `placeholder="J"`;
                    const fAttr = sub.fixF > 0 ? `value="${sub.fixF}" disabled` : `placeholder="$"`;
                    
                    return `
                    <div class="row" style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #1c1f24;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" min="0" class="input-box" id="j_${law.id}_${sIdx}" ${jAttr}>
                        <input type="number" min="0" class="input-box" id="f_${law.id}_${sIdx}" ${fAttr}>
                        <button onclick="add('${law.id}', ${sIdx})" style="background:var(--accent); border:none; width:40px; height:35px; font-weight:900; cursor:pointer; border-radius:4px;">+</button>
                    </div>`;
                }).join('')}
            </div>
        </div>`).join('');
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    
    // Priorita: Fixní hodnota > Ruční hodnota
    let jVal = sub.fixJ > 0 ? sub.fixJ : parseInt(document.getElementById(`j_${lawId}_${sIdx}`).value) || 0;
    let fVal = sub.fixF > 0 ? sub.fixF : parseInt(document.getElementById(`f_${lawId}_${sIdx}`).value) || 0;

    // 1. ZÁKAZ ZÁPORNÝCH HODNOT
    if (jVal < 0 || fVal < 0) {
        showCustomAlert("Chyba hodnoty", "Tresty nemohou být v záporných číslech.");
        return;
    }

    // 2. KONTROLA MINIMÁLNÍ HRANICE (pokud není fixní)
    if (sub.fixJ === 0 && jVal > 0 && jVal < sub.minJ) {
        showCustomAlert("PODMINIMÁLNÍ TREST", `Minimální sazba pro tento čin je ${sub.minJ} let.`);
        return;
    }

    // 3. KONTROLA MAXIMÁLNÍ HRANICE
    if (sub.fixJ === 0 && jVal > sub.maxJ && sub.maxJ !== 999) {
        showCustomAlert("NADMAXIMÁLNÍ TREST", `Sazba je max ${sub.maxJ} let. Více nelze udělit ani se Státním Zástupcem!`);
        return;
    }

    if (jVal > 0 || fVal > 0) {
        protocol.push({ 
            title: law.title, 
            subText: sub.text, 
            jail: jVal, 
            fine: fVal, 
            isZP: sub.isZP 
        });
        update();
        if (sub.fixJ === 0) document.getElementById(`j_${lawId}_${sIdx}`).value = '';
        if (sub.fixF === 0) document.getElementById(`f_${lawId}_${sIdx}`).value = '';
    }
}

function showCustomAlert(title, msg) {
    const alertBox = document.getElementById('customAlert');
    alertBox.querySelector('h2').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    alertBox.style.display = 'flex';
}

function update() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = protocol.map((p, idx) => `
        <div class="protocol-card">
            <span class="p-header">${p.title} ${p.isZP ? '<span style="background:var(--red); color:#fff; font-size:10px; padding:2px 6px; border-radius:3px; margin-left:10px;">Zbrojní Průkaz</span>' : ''}</span>
            <span class="p-text">${p.subText}</span>
            <div class="p-footer"><b>${p.jail} LET | $${p.fine.toLocaleString()}</b></div>
            <div onclick="removeEntry(${idx})" style="position:absolute; top:10px; right:10px; cursor:pointer; color:#444;">✕</div>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = protocol.reduce((a, b) => a + b.jail, 0);
    document.getElementById('sumFine').innerText = protocol.reduce((a, b) => a + b.fine, 0).toLocaleString();
}

function removeEntry(idx) { protocol.splice(idx, 1); update(); }
function newCase() { protocol = []; update(); }
function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }

// ... (začátek load a render zůstává stejný, změna je v add a regexu)

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    laws = Array.from(doc.querySelectorAll('.law-item')).map((item, idx) => {
        const title = item.getAttribute('data-title');
        const subs = Array.from(item.querySelectorAll('.sub-line')).map(line => {
            const raw = line.innerText.toLowerCase();
            
            // Rozšířený regex pro zachycení "od X let" i "doživotí" (považováno za 999)
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
                maxJ: (raw.includes("doživotí")) ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                fixJ: fixJ !== null && fixJ !== "" ? parseInt(fixJ) : null,
                fixF: fixF !== null && fixF !== "" ? parseInt(fixF) : null,
                isZP: line.innerText.toUpperCase().includes("ZBROJNÍ")
            };
        });
        return { id: "law_"+idx, title, subs };
    });
    render();
}

function add(lawId, sIdx) {
    const law = laws.find(l => l.id === lawId);
    const sub = law.subs[sIdx];
    
    const inputJ = document.getElementById(`j_${lawId}_${sIdx}`);
    const inputF = document.getElementById(`f_${lawId}_${sIdx}`);

    // STRIKTNÍ PRIORITA: Pokud je v HTML definováno data-fix, ignoruj vstup a použij fix
    let jVal = sub.fixJ !== null ? sub.fixJ : (parseInt(inputJ.value) || 0);
    let fVal = sub.fixF !== null ? sub.fixF : (parseInt(inputF.value) || 0);

    // OCHRANA PROTI FIXNÍM NULÁM: Pokud paragraf zakazuje pokutu (data-fix-fine="0")
    if (sub.fixF === 0 && (parseInt(inputF.value) || 0) > 0) {
        showCustomAlert("ZÁKAZ POKUTY", "Tento paragraf neumožňuje udělení peněžitého trestu.");
        return;
    }
    if (sub.fixJ === 0 && (parseInt(inputJ.value) || 0) > 0) {
        showCustomAlert("ZÁKAZ VĚZENÍ", "Tento čin je pouze za pokutu.");
        return;
    }

    // VALIDACE LIMITŮ (pouze pokud není fixní)
    if (sub.fixJ === null) {
        if (jVal > 0 && jVal < sub.minJ) {
            showCustomAlert("PODMINIMÁLNÍ TREST", `Minimální sazba je ${sub.minJ} let.`);
            return;
        }
        if (jVal > sub.maxJ) {
            showCustomAlert("NADMAXIMÁLNÍ TREST", `Sazba je max ${sub.maxJ} let.`);
            return;
        }
    }

    if (jVal > 0 || fVal > 0) {
        protocol.push({ title: law.title, subText: sub.text, jail: jVal, fine: fVal, isZP: sub.isZP });
        update();
        if (sub.fixJ === null) inputJ.value = '';
        if (sub.fixF === null) inputF.value = '';
    }
}

// ... (load funkce zůstává stejná, zaměřme se na add a render)

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    document.getElementById('lawsContainer').innerHTML = laws
        .filter(l => l.title.toLowerCase().includes(query) || l.subs.some(s => s.text.toLowerCase().includes(query)))
        .map(law => `
        <div class="law-item">
            <div class="law-header" onclick="this.parentElement.classList.toggle('active')">${law.title} <span>▼</span></div>
            <div class="law-content">
                ${law.subs.map((sub, sIdx) => {
                    // Pokud je v HTML data-fix-jail="0", políčko bude prázdné a zamčené
                    // Pokud je tam např. "5", bude tam 5 a zamčené
                    const jVal = sub.fixJ !== null ? sub.fixJ : "";
                    const fVal = sub.fixF !== null ? sub.fixF : "";
                    const jDis = sub.fixJ !== null ? "disabled" : "";
                    const fDis = sub.fixF !== null ? "disabled" : "";
                    
                    return `
                    <div class="row" style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #1c1f24;">
                        <div style="flex:1;">${sub.html}</div>
                        <input type="number" class="input-box" id="j_${law.id}_${sIdx}" value="${jVal}" ${jDis} placeholder="J">
                        <input type="number" class="input-box" id="f_${law.id}_${sIdx}" value="${fVal}" ${fDis} placeholder="$">
                        <button onclick="add('${law.id}', ${sIdx})" style="background:var(--accent); border:none; width:40px; height:35px; font-weight:900; cursor:pointer; border-radius:4px;">+</button>
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

    // STRIKTNÍ VALIDACE: Pokud je v HTML fix, použijeme ho. Pokud ne, vezmeme vstup.
    let finalJ = sub.fixJ !== null ? sub.fixJ : (parseInt(inputJ.value) || 0);
    let finalF = sub.fixF !== null ? sub.fixF : (parseInt(inputF.value) || 0);

    // Kontrola minimálního trestu (jen u ne-fixních)
    if (sub.fixJ === null && finalJ > 0 && finalJ < sub.minJ) {
        showCustomAlert("PODMINIMÁLNÍ TREST", `Tento čin vyžaduje minimálně ${sub.minJ} let.`);
        return;
    }

    // Kontrola maximálního trestu (jen u ne-fixních)
    if (sub.fixJ === null && finalJ > sub.maxJ) {
        showCustomAlert("NADMAXIMÁLNÍ TREST", `Maximální sazba je ${sub.maxJ} let.`);
        return;
    }

    // Pokud je fix-jail nastaven na 0 a uživatel se pokusí něco přidat (nemělo by jít, ale pro jistotu)
    if (sub.fixJ === 0 && finalJ > 0) finalJ = 0;
    if (sub.fixF === 0 && finalF > 0) finalF = 0;

    if (finalJ > 0 || finalF > 0) {
        protocol.push({ 
            title: law.title, 
            subText: sub.text, 
            jail: finalJ, 
            fine: finalF, 
            isZP: sub.isZP 
        });
        update();
        // Vymažeme jen ta pole, která nejsou fixní
        if (sub.fixJ === null) inputJ.value = '';
        if (sub.fixF === null) inputF.value = '';
    }
}