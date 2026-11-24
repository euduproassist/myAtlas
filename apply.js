import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    let selectedProgramWish = '';
    // Maps qualificationType -> array of currently open cycle objects from Firestore
    const activeCyclesByQualification = new Map();

    const programWishSelect = document.getElementById('program-wish-select');
    const studentNumberSelect = document.getElementById('student-number-select');
    const returningSelect = document.getElementById('returning-select');
    const findAppBtn = document.getElementById('find-app-btn');
    const popiaContinueBtn = document.getElementById('popia-continue-btn');

    const step1Card = document.getElementById('step1-card');
    const portalCard = document.getElementById('portal-redirect-card');
    const step2Card = document.getElementById('step2-card');
    const step3Card = document.getElementById('step3-card');
    const step4Card = document.getElementById('step4-card');

    const saIdInput = document.getElementById('sa-id');
    const passportInput = document.getElementById('passport');

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

    if (studentNumberSelect) {
        studentNumberSelect.addEventListener('change', (e) => handleStudentNumberChange(e.target.value));
    }

    if (returningSelect) {
        returningSelect.addEventListener('change', (e) => handleReturningChange(e.target.value));
    }

    if (findAppBtn) {
        findAppBtn.addEventListener('click', findApplication);
    }

    if (popiaContinueBtn) {
        popiaContinueBtn.addEventListener('click', handlePopiaContinue);
    }

    function handleProgramWishChange(value) {
        selectedProgramWish = value;

        if (studentNumberSelect) studentNumberSelect.value = "";
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";

        document.querySelectorAll('input[name="popia_consent"]').forEach(radio => radio.checked = false);

        step1Card.classList.add('hidden');
        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');

        if (value) {
            // Save the matching open cycles for this qualification so the application form step can load them
            const matchingCycles = activeCyclesByQualification.get(value) || [];
            sessionStorage.setItem('myAtlas_activeCycles', JSON.stringify(matchingCycles));
            sessionStorage.setItem('myAtlas_selectedQualification', value);

            step1Card.classList.remove('hidden');
            step1Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            sessionStorage.removeItem('myAtlas_activeCycles');
            sessionStorage.removeItem('myAtlas_selectedQualification');
        }
    }

    function handleStudentNumberChange(value) {
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";

        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');

        if (value === 'yes') {
            portalCard.classList.remove('hidden');
            portalCard.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else if (value === 'no') {
            step2Card.classList.remove('hidden');
            step2Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    function handleReturningChange(value) {
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";

        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');

        if (value === 'yes') {
            step3Card.classList.remove('hidden');
            step3Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else if (value === 'no') {
            step4Card.classList.remove('hidden');
            step4Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    function findApplication() {
        const id = saIdInput ? saIdInput.value.trim() : "";
        const passport = passportInput ? passportInput.value.trim() : "";

        if (!id && !passport) {
            alert('Please enter your South African ID number or passport number.');
            return;
        }
        alert('Searching for your existing application...');
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
            alert('You must accept the POPIA terms to proceed with your application.');
        }
    }
});
