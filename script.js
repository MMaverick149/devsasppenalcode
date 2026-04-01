let lawsData = [];
let activeCase = [];

// Načtení dat při startu
window.onload = async () => {
    try {
        const response = await fetch('tresty.html?v=' + Date.now());
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const categories = doc.querySelectorAll('.law-item');
        lawsData = Array.from(categories).map((cat, cIdx) => ({
            id: cIdx,
            title: cat.getAttribute('data-title') || "Neznámá kategorie",
            items: Array.from(cat.querySelectorAll('.sub-line')).map((line, iIdx) => {
                const text = line.innerText;
                const match = text.match(/sazba\s+(\d+)-(\d+)/i) || text.match(/od\s+(\d+)\s+let/i);
                return {
                    id: `${cIdx}_${iIdx}`,
                    fullHtml: line.innerHTML,
                    pureText: text,
                    minJ: match ? parseInt(match[1]) : 0,
                    maxJ: text.toLowerCase().includes("doživotí") ? 999 : (match && match[2] ? parseInt(match[2]) : 999),
                    fixJ: line.getAttribute('data-fix-jail'),
                    fixF: line.getAttribute('data-fix-fine')
                };
            })
        }));
        render();
    } catch (e) {
        console.error("Chyba při načítání zákoníku:", e);
    }
};

function enterEvidence() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'flex';
}

function render() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('lawsContainer');
    
    container.innerHTML = lawsData.map(cat => {
        const filteredItems = cat.items.filter(i => i.pureText.toLowerCase().includes(query) || cat.title.toLowerCase().includes(query));
        if (filteredItems.length === 0 && query !== "") return "";

        return `
            <div class="law-category ${query !== "" ? 'active' : ''}">
                <div class="category-header" onclick="this.parentElement.classList.toggle('active')">
                    ${cat.title}
                </div>
                <div class="category-content">
                    ${filteredItems.map(item => `
                        <div class="punishment-row">
                            <div class="law-text">${item.fullHtml}</div>
                            <div class="input-group">
                                <input type="number" class="val-input" id="j_${item.id}" placeholder="J" value="${item.fixJ || ''}" ${item.fixJ ? 'disabled' : ''}>
                                <input type="number" class="val-input" id="f_${item.id}" placeholder="$" value="${item.fixF || ''}" ${item.fixF ? 'disabled' : ''}>
                                <button class="add-btn" onclick="addToCase('${cat.id}', '${item.id}')">+</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function addToCase(catId, itemId) {
    const cat = lawsData.find(c => c.id == catId);
    const item = cat.items.find(i => i.id == itemId);
    
    const jailVal = item.fixJ ? parseInt(item.fixJ) : (parseInt(document.getElementById(`j_${itemId}`).value) || 0);
    const fineVal = item.fixF ? parseInt(item.fixF) : (parseInt(document.getElementById(`f_${itemId}`).value) || 0);

    // Kontrola sazeb
    if (!item.fixJ && (jailVal < item.minJ || jailVal > item.maxJ)) {
        showCustomAlert(`Sazba je ${item.minJ}-${item.maxJ} let. Více nelze udělit ani se Státním Zástupcem!`);
        return;
    }

    activeCase.push({
        catTitle: cat.title,
        desc: item.pureText.split(')')[1] || item.pureText,
        jail: jailVal,
        fine: fineVal
    });

    updateSidebar();
}

function updateSidebar() {
    const list = document.getElementById('caseEntries');
    list.innerHTML = activeCase.map((entry, idx) => `
        <div class="protocol-item">
            <span class="remove-item" onclick="removeItem(${idx})">✕</span>
            <span class="title">${entry.catTitle}</span>
            <span class="desc">${entry.desc.substring(0, 60)}...</span>
            <div class="values">${entry.jail} J | $${entry.fine.toLocaleString()}</div>
        </div>
    `).join('');

    const totalJ = activeCase.reduce((sum, e) => sum + e.jail, 0);
    const totalF = activeCase.reduce((sum, e) => sum + e.fine, 0);

    document.getElementById('sumJail').innerText = totalJ;
    document.getElementById('sumFine').innerText = totalF.toLocaleString();
}

function removeItem(idx) {
    activeCase.splice(idx, 1);
    updateSidebar();
}

function newCase() {
    activeCase = [];
    updateSidebar();
}

function showCustomAlert(msg) {
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
}