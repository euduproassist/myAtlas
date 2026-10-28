document.addEventListener('DOMContentLoaded', () => {
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

    if (programWishSelect) {
        programWishSelect.addEventListener('change', (e) => handleProgramWishChange(e.target.value));
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

        // Reset all downstream selects and inputs when program choice changes
        if (studentNumberSelect) studentNumberSelect.value = "";
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        
        const radios = document.querySelectorAll('input[name="popia_consent"]');
        radios.forEach(radio => radio.checked = false);

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
            alert('later development still in operation');
        } else {
            alert('You must accept the POPIA terms to proceed with your application.');
        }
    }
});
