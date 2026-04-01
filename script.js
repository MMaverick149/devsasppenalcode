let lawsData = [];
let activeCase = [];

window.onload = load;

async function load() {
    try {
        const res = await fetch('tresty.html?v=' + Date.now());
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        lawsData = Array.from(doc.querySelectorAll('.law-item')).map((cat, cIdx) => ({
            id: "cat_" + cIdx,
            title: cat.getAttribute('data-title') || "Neznámá sekce",
            subs: Array.from(cat.querySelectorAll('.sub-line')).map((line, sIdx) => {
                const raw = line.innerText;
                // Vylepšená detekce čísel pro sazby
                const numbers = raw.match(/\d+/g);
                let min = 0, max = 999;
                
                if (raw.toLowerCase().includes("sazba")) {
                    if (numbers && numbers.length >= 2) {
                        min = parseInt(numbers[0]);
                        max = parseInt(numbers[1]);
                    }
                } else if (raw.toLowerCase().includes("od")) {
                    min = numbers ? parseInt(numbers[0]) : 0;
                }

                return {
                    id: `item_${cIdx}_${sIdx}`,
                    html: line.innerHTML,
                    text: raw,
                    minJ: min,
                    maxJ: raw.toLowerCase().includes("doživotí") ? 999 : max,
                    fixJ: line.getAttribute('data-fix-jail'),
                    fixF: line.getAttribute('data-fix-fine')
                };
            })
        }));
        render();
    } catch (e) {
        showAlert("CHYBA: Nepodařilo se načíst tresty.html!");
    }
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('lawsContainer');
    
    container.innerHTML = lawsData.map(cat => {
        const filtered = cat.subs.filter(s => s.text.toLowerCase().includes(query) || cat.title.toLowerCase().includes(query));
        if (filtered.length === 0 && query !== "") return "";

        return `
        <div class="law-category ${query !== "" ? 'active' : ''}">
            <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                ${cat.title}
            </div>
            <div class="category-content">
                ${filtered.map(sub => `
                    <div class="punishment-row">
                        <div style="flex:1;">${sub.html}</div>
                        <div style="display:flex; gap:5px; align-items:center;">
                            <input type="number" class="input-box" id="j_${sub.id}" placeholder="J" value="${sub.fixJ || ''}" ${sub.fixJ ? 'disabled' : ''}>
                            <input type="number" class="input-box" id="f_${sub.id}" placeholder="$" value="${sub.fixF || ''}" ${sub.fixF ? 'disabled' : ''}>
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
    
    const jInput = document.getElementById(`j_${subId}`);
    const fInput = document.getElementById(`f_${subId}`);

    let valJ = sub.fixJ ? parseInt(sub.fixJ) : (parseInt(jInput.value) || 0);
    let valF = sub.fixF ? parseInt(sub.fixF) : (parseInt(fInput.value) || 0);

    // KONTROLA: Musí být alespoň jedna hodnota
    if (valJ === 0 && valF === 0) {
        showAlert("Zadejte počet měsíců (J) nebo výši pokuty ($)!");
        return;
    }

    // VALIDACE SAZBY (pouze pokud není fixní)
    if (!sub.fixJ && valJ > 0) {
        if (valJ < sub.minJ) {
            showAlert(`CHYBA: Minimální sazba je ${sub.minJ} J!`);
            return;
        }
        if (valJ > sub.maxJ) {
            showAlert(`CHYBA: Maximální sazba je ${sub.maxJ} J!`);
            return;
        }
    }

    // PŘIDÁNÍ
    activeCase.push({
        title: cat.title,
        desc: sub.text.split(')')[1] || sub.text,
        jail: valJ,
        fine: valF
    });

    updateSidebar();
    
    // Vyčistit pole
    if (!sub.fixJ) jInput.value = '';
    if (!sub.fixF) fInput.value = '';
}

function updateSidebar() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = activeCase.map((item, idx) => `
        <div class="protocol-card">
            <small style="color:var(--accent); font-weight:bold;">${item.title}</small>
            <div style="font-size:14px; margin:4px 0;">${item.jail} J | $${item.fine.toLocaleString()}</div>
            <span class="remove-btn" onclick="activeCase.splice(${idx},1);updateSidebar()">✕</span>
        </div>`).join('');
    
    document.getElementById('sumJail').innerText = activeCase.reduce((s, i) => s + i.jail, 0);
    document.getElementById('sumFine').innerText = activeCase.reduce((s, i) => s + i.fine, 0).toLocaleString();
}

function showAlert(m) {
    document.getElementById('alertMsg').innerText = m;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function enterEvidence() { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('mainContent').style.display = 'flex'; }
function newCase() { activeCase = []; updateSidebar(); }