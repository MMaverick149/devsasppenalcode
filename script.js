let lawsData = [];
let activeCase = [];

window.onload = load;

async function load() {
    const res = await fetch('tresty.html?v=' + Date.now());
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    lawsData = Array.from(doc.querySelectorAll('.law-item')).map((cat, cIdx) => ({
        id: "cat_" + cIdx,
        title: cat.getAttribute('data-title') || "Neznámá sekce",
        subs: Array.from(cat.querySelectorAll('.sub-line')).map((line, sIdx) => {
            const raw = line.innerText;
            // Detekce sazeb z textu
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+let/i);
            return {
                id: `item_${cIdx}_${sIdx}`,
                html: line.innerHTML,
                text: raw,
                minJ: match ? parseInt(match[1]) : 0,
                maxJ: raw.toLowerCase().includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                fixJ: line.getAttribute('data-fix-jail'),
                fixF: line.getAttribute('data-fix-fine')
            };
        })
    }));
    render();
}

function enterEvidence() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'flex';
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('lawsContainer');
    
    container.innerHTML = lawsData.map(cat => {
        const hasMatch = cat.title.toLowerCase().includes(query) || cat.subs.some(s => s.text.toLowerCase().includes(query));
        if (!hasMatch && query !== "") return "";

        return `
        <div class="law-category ${query !== "" ? 'active' : ''}">
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                ${cat.title}
            </div>
            <div class="category-content">
                ${cat.subs.map(sub => `
                    <div class="punishment-row">
                        <div style="flex:1; font-size:13px;">${sub.html}</div>
                        <div style="display:flex; gap:5px;">
                            <input type="number" class="input-box" id="j_${sub.id}" placeholder="J" value="${sub.fixJ !== null ? sub.fixJ : ''}" ${sub.fixJ !== null ? 'disabled' : ''}>
                            <input type="number" class="input-box" id="f_${sub.id}" placeholder="$" value="${sub.fixF !== null ? sub.fixF : ''}" ${sub.fixF !== null ? 'disabled' : ''}>
                            <button class="add-btn" onclick="addToCase('${sub.id}', '${cat.id}')">+</button>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');
}

function addToCase(subId, catId) {
    const cat = lawsData.find(c => c.id === catId);
    const sub = cat.subs.find(s => s.id === subId);
    const inJ = document.getElementById(`j_${subId}`);
    const inF = document.getElementById(`f_${subId}`);

    let valJ = sub.fixJ !== null ? parseInt(sub.fixJ) : (parseInt(inJ.value) || 0);
    let valF = sub.fixF !== null ? parseInt(sub.fixF) : (parseInt(inF.value) || 0);

    // KONTROLA LIMITŮ - PŘIDÁNO VAROVÁNÍ
    if (sub.fixJ === null) {
        if (valJ > 0 && valJ < sub.minJ) {
            showAlert(`CHYBA: Trest je příliš nízký. Minimální sazba pro tento paragraf je ${sub.minJ} let.`);
            return; // Zastaví přidání
        }
        if (valJ > sub.maxJ) {
            showAlert(`CHYBA: Trest překračuje sazbu. Maximální délka vězení je ${sub.maxJ} let.`);
            return; // Zastaví přidání
        }
    }

    // Pokud projde kontrolou, přidá se do seznamu
    if (valJ > 0 || valF > 0) {
        activeCase.push({ title: cat.title, jail: valJ, fine: valF });
        updateSidebar();
        
        // Vyčistit pole (pokud není fixní)
        if (sub.fixJ === null) inJ.value = '';
        if (sub.fixF === null) inF.value = '';
    } else {
        showAlert("CHYBA: Musíš zadat délku vězení nebo výši pokuty.");
    }
}

function updateSidebar() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = activeCase.map((item, idx) => `
        <div class="protocol-card">
            <div style="font-size:11px; color:var(--accent); font-weight:bold; margin-bottom:5px;">${item.title}</div>
            <div style="font-size:14px; font-weight:bold;">${item.jail} J | $${item.fine.toLocaleString()}</div>
            <span style="position:absolute; right:10px; top:10px; cursor:pointer; opacity:0.5;" onclick="activeCase.splice(${idx},1);updateSidebar()">✕</span>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = activeCase.reduce((s, i) => s + i.jail, 0);
    document.getElementById('sumFine').innerText = activeCase.reduce((s, i) => s + i.fine, 0).toLocaleString();
    list.scrollTop = list.scrollHeight;
}

function showAlert(m) {
    document.getElementById('alertMsg').innerText = m;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

function newCase() {
    activeCase = [];
    updateSidebar();
}