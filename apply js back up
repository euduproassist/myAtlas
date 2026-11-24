import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    let selectedProgramWish = '';

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

    // Function to check Firestore and update dropdown states based on active cycles
    async function checkActiveCycles() {
        if (!programWishSelect) return;

        const currentYear = new Date().getFullYear();
        const yearsToCheck = [currentYear, currentYear + 1];
        const qualificationTypes = [
            { value: "Undergraduate Degree", slug: "undergraduate" },
            { value: "Postgraduate Degree", slug: "postgraduate" },
            { value: "Research Degree", slug: "research" }
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeQualifications = new Set();

        for (const yr of yearsToCheck) {
            for (const qual of qualificationTypes) {
                const collectionName = `${yr}_${qual.slug}_admissions`;
                try {
                    const querySnapshot = await getDocs(collection(db, collectionName));
                    querySnapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        if (data.status === "published" && !data.isManuallyClosed) {
                            if (data.openingDate && data.closingDate) {
                                const openDate = new Date(data.openingDate);
                                const closeDate = new Date(data.closingDate);
                                openDate.setHours(0, 0, 0, 0);
                                closeDate.setHours(23, 59, 59, 999);

                                if (today >= openDate && today <= closeDate) {
                                    activeQualifications.add(qual.value);
                                }
                            }
                        }
                    });
                } catch (err) {
                    // Collection might not exist yet; safe to ignore
                }
            }
        }

        // Loop through options and disable/blur if no active cycle exists
        for (let i = 0; i < programWishSelect.options.length; i++) {
            const opt = programWishSelect.options[i];
            if (!opt.value) continue; // Skip the default prompt option

            if (!activeQualifications.has(opt.value)) {
                opt.disabled = true;
                opt.classList.add('disabled-option');
                if (!opt.textContent.includes('(Closed)')) {
                    opt.textContent += ' (Closed / Unavailable)';
                }
            } else {
                opt.disabled = false;
                opt.classList.remove('disabled-option');
            }
        }
    }

    // Run cycle availability check on load
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

        // Erase/reset all downstream selects, inputs, and radios completely
        if (studentNumberSelect) studentNumberSelect.value = "";
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        
        const radios = document.querySelectorAll('input[name="popia_consent"]');
        radios.forEach(radio => radio.checked = false);

        // Hide all downstream cards completely
        step1Card.classList.add('hidden');
        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');

        if (value) {
            step1Card.classList.remove('hidden');
            step1Card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    function handleStudentNumberChange(value) {
        // Erase/reset all downstream selects, inputs, and radios completely when student number choice changes
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        
        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        // Hide and clear all downstream cards completely
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
        // Erase/reset all downstream inputs and radios completely when returning choice changes
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        
        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        // Hide and clear all downstream cards completely
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
            alert('later development still in operation');
        } else {
            alert('You must accept the POPIA terms to proceed with your application.');
        }
    }
});
