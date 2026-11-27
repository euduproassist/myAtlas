import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    let selectedProgramWish = '';
    // Maps qualificationType -> array of currently open cycle objects from Firestore
    const activeCyclesByQualification = new Map();

    const programWishSelect = document.getElementById('program-wish-select');
    const popiaContinueBtn = document.getElementById('popia-continue-btn');
    const step4Card = document.getElementById('step4-card');

    // Helper matching admin-portal.js local date parsing (avoids UTC off-by-one issues)
    function parseIsoDateOnly(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.trim().split('-');
        if (parts.length !== 3) return null;
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        if (!year || month < 0 || !day) return null;
        return new Date(year, month, day);
    }

    function getTodayDateOnly() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function clearApplicationSession() {
        selectedProgramWish = '';
        sessionStorage.removeItem('myAtlas_activeCycles');
        sessionStorage.removeItem('myAtlas_selectedQualification');
        sessionStorage.removeItem('myAtlas_popiaAccepted');

        if (programWishSelect) {
            programWishSelect.value = '';
        }

        document.querySelectorAll('input[name="popia_consent"]').forEach((radio) => {
            radio.checked = false;
        });

        step4Card.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Query Firestore collections matching admin-portal.js (<year>_application_cycle)
    async function checkActiveCycles() {
        if (!programWishSelect) return;

        const currentYear = new Date().getFullYear();
        const candidateCollections = [
            `${currentYear - 1}_application_cycle`,
            `${currentYear}_application_cycle`,
            `${currentYear + 1}_application_cycle`
        ];

        const today = getTodayDateOnly();
        activeCyclesByQualification.clear();

        for (const colName of candidateCollections) {
            try {
                const querySnapshot = await getDocs(collection(db, colName));
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();

                    // Match admin-portal.js computeCycleStatus() logic
                    if (data.status === "published" && data.isManuallyClosed !== true) {
                        const openDate = parseIsoDateOnly(data.openingDate);
                        const closeDate = parseIsoDateOnly(data.closingDate);

                        const isAfterOpen = !openDate || today >= openDate;
                        const isBeforeClose = !closeDate || today <= closeDate;

                        if (isAfterOpen && isBeforeClose && data.qualificationType) {
                            const qualKey = data.qualificationType.trim();
                            if (!activeCyclesByQualification.has(qualKey)) {
                                activeCyclesByQualification.set(qualKey, []);
                            }
                            activeCyclesByQualification.get(qualKey).push({
                                id: docSnap.id,
                                _collectionName: colName,
                                ...data
                            });
                        }
                    }
                });
            } catch (err) {
                console.warn(`Could not read ${colName}:`, err);
            }
        }

        // Enable or disable dropdown options based on active published cycles
        for (let i = 0; i < programWishSelect.options.length; i++) {
            const opt = programWishSelect.options[i];
            if (!opt.value) continue;

            // Strip any previous suffix before re-evaluating
            const baseLabel = opt.textContent.replace(/\s*\(Closed \/ Unavailable\)$/i, '').trim();

            if (!activeCyclesByQualification.has(opt.value)) {
                opt.disabled = true;
                opt.classList.add('disabled-option');
                opt.textContent = `${baseLabel} (Closed / Unavailable)`;
            } else {
                opt.disabled = false;
                opt.classList.remove('disabled-option');
                opt.textContent = baseLabel;
            }
        }
    }

    await checkActiveCycles();

    if (programWishSelect) {
        programWishSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption && selectedOption.disabled) {
                alert("This application cycle is currently closed or unavailable.");
                e.target.value = "";
                handleProgramWishChange("");
                return;
            }
            handleProgramWishChange(e.target.value);
        });
    }

    if (popiaContinueBtn) {
        popiaContinueBtn.addEventListener('click', handlePopiaContinue);
    }

    function handleProgramWishChange(value) {
        selectedProgramWish = value;

        document.querySelectorAll('input[name="popia_consent"]').forEach(radio => radio.checked = false);
        step4Card.classList.add('hidden');

        if (value) {
            // Save the matching open cycles for this qualification so the application form step can load them
            const matchingCycles = activeCyclesByQualification.get(value) || [];
            sessionStorage.setItem('myAtlas_activeCycles', JSON.stringify(matchingCycles));
            sessionStorage.setItem('myAtlas_selectedQualification', value);

            step4Card.classList.remove('hidden');
            step4Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            sessionStorage.removeItem('myAtlas_activeCycles');
            sessionStorage.removeItem('myAtlas_selectedQualification');
        }
    }

    function handlePopiaContinue() {
        const selectedOption = document.querySelector('input[name="popia_consent"]:checked');
        if (!selectedOption) {
            alert('Please select whether you accept or do not accept the POPIA terms to continue.');
            return;
        }
        if (selectedOption.value === 'accept') {
            const matchingCycles = activeCyclesByQualification.get(selectedProgramWish) || [];
            if (matchingCycles.length === 0) {
                alert('No open application cycle was found for this qualification.');
                return;
            }
            sessionStorage.setItem('myAtlas_popiaAccepted', 'true');
            alert(`POPIA accepted. Ready to load application form for: ${matchingCycles[0].cycleName}`);
        } else {
            clearApplicationSession();
            alert('You did not accept the POPIA terms. Your session has been cleared.');
        }
    }
});
