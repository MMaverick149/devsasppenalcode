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
            const match = raw.match(/sazba\s+(\d+)-(\d+)/i) || raw.match(/od\s+(\d+)\s+let/i);
            return {
                id: `item_${cIdx}_${sIdx}`,
                html: line.innerHTML,
                text: raw,
                hasZbrojak: raw.toLowerCase().includes("zbrojní průkaz"), // Detekce zbrojáku
                minJ: match ? parseInt(match[1]) : 0,
                maxJ: raw.toLowerCase().includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                fixJ: line.getAttribute('data-fix-jail'),
                fixF: line.getAttribute('data-fix-fine')
            };
        })
    }));
    render();
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

    if (valJ === 0 && valF === 0) {
        showAlert("Zadejte počet let nebo pokutu!");
        return;
    }

    if (valJ >= 25) {
        showAlert("POZOR: Trest 25 let a více (Doživotí) vyžaduje konzultaci se STÁTNÍM ZÁSTUPCEM!");
    }

    activeCase.push({ 
        title: cat.title, 
        subText: sub.text, 
        zbrojak: sub.hasZbrojak,
        jail: valJ, 
        fine: valF 
    });
    
    updateSidebar();
    if (!sub.fixJ) jInput.value = '';
    if (!sub.fixF) fInput.value = '';
}

function updateSidebar() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = activeCase.map((item, idx) => `
        <div class="protocol-card">
            <span class="card-close" onclick="activeCase.splice(${idx},1);updateSidebar()">×</span>
            <div class="card-top">
                <span class="card-title">${item.title}</span>
                ${item.zbrojak ? '<span class="tag-zbrojak">Zbrojní Průkaz</span>' : ''}
            </div>
            <div class="card-desc">${item.subText}</div>
            <div class="card-footer">${item.jail} LET | $${item.fine.toLocaleString()}</div>
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