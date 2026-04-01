function addToCase(subId, catId) {
    const cat = lawsData.find(c => c.id === catId);
    const sub = cat.subs.find(s => s.id === subId);
    
    const jInput = document.getElementById(`j_${subId}`);
    const fInput = document.getElementById(`f_${subId}`);

    let valJ = sub.fixJ ? parseInt(sub.fixJ) : (parseInt(jInput.value) || 0);
    let valF = sub.fixF ? parseInt(sub.fixF) : (parseInt(fInput.value) || 0);

    if (valJ === 0 && valF === 0) {
        showAlert("CHYBA: Zadejte délku vězení nebo pokutu!");
        return;
    }

    // NOVÁ LOGIKA: Kontrola pro Státního zástupce (25+ let)
    if (valJ >= 25) {
        showAlert("VAROVÁNÍ: Trest 25+ let (Doživotí) vyžaduje přítomnost nebo schválení Státního zástupce!");
        // Zde program pokračuje a trest přidá, pokud chceš jen varovat. 
        // Pokud chceš přidání úplně ZABLOKOVAT dokud to nesníží, přidej sem 'return;'.
    }

    // Klasická kontrola sazeb (pokud není trest fixní)
    if (!sub.fixJ && valJ > 0 && valJ < 25) { // Kontrola jen pro běžné tresty pod 25
        if (valJ < sub.minJ) {
            showAlert(`CHYBA: Minimální sazba je ${sub.minJ} J!`);
            return;
        }
        if (valJ > sub.maxJ) {
            showAlert(`CHYBA: Maximální sazba je ${sub.maxJ} J!`);
            return;
        }
    }

    // Přidání do protokolu
    activeCase.push({
        title: cat.title,
        desc: sub.text.substring(0, 50) + "...",
        jail: valJ,
        fine: valF
    });

    updateSidebar();
    
    if (!sub.fixJ) jInput.value = '';
    if (!sub.fixF) fInput.value = '';
}