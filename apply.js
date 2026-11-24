import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc,
    addDoc,
    query,
    where,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Section metadata matching form-template.js (Documents section intentionally omitted on student side)
const STUDENT_SECTIONS = {
    personal: {
        title: "1. Personal Information",
        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="7.5" r="3.5"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg>`
    },
    contact: {
        title: "2. Contact Information",
        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
    },
    guardian: {
        title: "3. Parent or Guardian Information",
        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    },
    education_courses: {
        title: "4. Educational Background & Course Selection",
        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
    },
    additional_info: {
        title: "5. Additional Applicant Information & Declarations",
        icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    let selectedProgramWish = '';
    const activeCyclesByQualification = new Map();
    let currentActiveCycle = null;
    let currentDraftDocId = null;
    let draftSaveTimeout = null;
    let isSubmitting = false;

    const mainPageContainer = document.getElementById('mainPageContainer');
    const welcomeSection = document.getElementById('welcomeSection');
    const programSelectCard = document.getElementById('program-select-card');
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
    const returningSearchFeedback = document.getElementById('returning-search-feedback');

    const liveApplicationContainer = document.getElementById('live-application-container');
    const liveFormMount = document.getElementById('liveFormMount');
    const draftSaveIndicator = document.getElementById('draftSaveIndicator');
    const applicantPinInput = document.getElementById('applicantPinInput');
    const applicantPinConfirmInput = document.getElementById('applicantPinConfirmInput');
    const finalSubmitApplicationBtn = document.getElementById('finalSubmitApplicationBtn');
    const submissionConfirmationScreen = document.getElementById('submission-confirmation-screen');

    // Enforce digits-only input on PIN fields
    [applicantPinInput, applicantPinConfirmInput].forEach((input) => {
        if (!input) return;
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(0, 6);
        });
    });

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

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

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

        for (let i = 0; i < programWishSelect.options.length; i++) {
            const opt = programWishSelect.options[i];
            if (!opt.value) continue;

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

    // Complete reset back to Step 0 ("What do you wish to apply for?")
    function resetEverythingToStart() {
        sessionStorage.clear();
        selectedProgramWish = '';
        currentActiveCycle = null;
        currentDraftDocId = null;

        if (programWishSelect) programWishSelect.value = '';
        if (studentNumberSelect) studentNumberSelect.value = '';
        if (returningSelect) returningSelect.value = '';
        if (saIdInput) saIdInput.value = '';
        if (passportInput) passportInput.value = '';
        if (applicantPinInput) applicantPinInput.value = '';
        if (applicantPinConfirmInput) applicantPinConfirmInput.value = '';

        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        if (returningSearchFeedback) {
            returningSearchFeedback.innerHTML = '';
            returningSearchFeedback.classList.add('hidden');
        }

        if (liveFormMount) liveFormMount.innerHTML = '';
        if (liveApplicationContainer) liveApplicationContainer.classList.add('hidden');
        if (submissionConfirmationScreen) submissionConfirmationScreen.classList.add('hidden');

        if (mainPageContainer) mainPageContainer.classList.remove('full-width-form-mode');
        if (welcomeSection) welcomeSection.classList.remove('hidden');
        if (programSelectCard) programSelectCard.classList.remove('hidden');

        step1Card.classList.add('hidden');
        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');

        if (programSelectCard) {
            programSelectCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

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

    if (finalSubmitApplicationBtn) {
        finalSubmitApplicationBtn.addEventListener('click', handleFinalSubmit);
    }

    function handleProgramWishChange(value) {
        selectedProgramWish = value;
        currentDraftDocId = null;

        if (studentNumberSelect) studentNumberSelect.value = "";
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        if (returningSearchFeedback) {
            returningSearchFeedback.innerHTML = "";
            returningSearchFeedback.classList.add('hidden');
        }

        document.querySelectorAll('input[name="popia_consent"]').forEach(radio => radio.checked = false);

        step1Card.classList.add('hidden');
        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');
        liveApplicationContainer.classList.add('hidden');

        if (value) {
            const matchingCycles = activeCyclesByQualification.get(value) || [];
            currentActiveCycle = matchingCycles[0] || null;
            sessionStorage.setItem('myAtlas_activeCycles', JSON.stringify(matchingCycles));
            sessionStorage.setItem('myAtlas_selectedQualification', value);

            step1Card.classList.remove('hidden');
            step1Card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            currentActiveCycle = null;
            sessionStorage.removeItem('myAtlas_activeCycles');
            sessionStorage.removeItem('myAtlas_selectedQualification');
        }
    }

    function handleStudentNumberChange(value) {
        if (returningSelect) returningSelect.value = "";
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        if (returningSearchFeedback) {
            returningSearchFeedback.innerHTML = "";
            returningSearchFeedback.classList.add('hidden');
        }

        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        portalCard.classList.add('hidden');
        step2Card.classList.add('hidden');
        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');
        liveApplicationContainer.classList.add('hidden');

        if (value === 'yes') {
            portalCard.classList.remove('hidden');
            portalCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (value === 'no') {
            step2Card.classList.remove('hidden');
            step2Card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function handleReturningChange(value) {
        if (saIdInput) saIdInput.value = "";
        if (passportInput) passportInput.value = "";
        if (returningSearchFeedback) {
            returningSearchFeedback.innerHTML = "";
            returningSearchFeedback.classList.add('hidden');
        }

        document.querySelectorAll('input[name="popia_consent"]').forEach(r => r.checked = false);

        step3Card.classList.add('hidden');
        step4Card.classList.add('hidden');
        liveApplicationContainer.classList.add('hidden');

        if (value === 'yes') {
            step3Card.classList.remove('hidden');
            step3Card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (value === 'no') {
            step4Card.classList.remove('hidden');
            step4Card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // 1. Returning Applicants Lookup (complete_applications first -> draft_applications second -> not found)
    async function findApplication() {
        const idVal = saIdInput ? saIdInput.value.trim() : "";
        const passportVal = passportInput ? passportInput.value.trim() : "";

        if (!idVal && !passportVal) {
            alert('Please enter your South African ID number or passport number.');
            return;
        }

        findAppBtn.disabled = true;
        const originalBtnText = findAppBtn.textContent;
        findAppBtn.textContent = 'Searching...';
        returningSearchFeedback.classList.add('hidden');
        returningSearchFeedback.innerHTML = '';

        try {
            // Step A: Check complete_applications first
            const completedDoc = await searchCollectionByIdentifier('complete_applications', idVal, passportVal);
            if (completedDoc) {
                returningSearchFeedback.innerHTML = `
                    <div class="portal-alert" style="margin-top: 18px;">
                        <strong>Welcome back.</strong>
                        <br>
                        You have already submitted a completed application.
                        Please proceed to log into your online student application portal using your Application Reference Number and PIN.
                        <br><br>
                        Click <a href="#" onclick="return false;">here</a> to access your myAtlas portal.
                    </div>
                `;
                returningSearchFeedback.classList.remove('hidden');
                return;
            }

            // Step B: Check draft_applications second
            const draftSnap = await searchCollectionByIdentifier('draft_applications', idVal, passportVal);
            if (draftSnap) {
                const draftData = draftSnap.data();
                currentDraftDocId = draftSnap.id;

                // Resolve matching published cycle for this draft
                const draftQual = draftData.qualificationType || selectedProgramWish;
                const matchingCycles = activeCyclesByQualification.get(draftQual) || [];
                const matchedCycle = matchingCycles.find(c => c.id === draftData.cycleId) || matchingCycles[0] || currentActiveCycle;

                if (!matchedCycle) {
                    returningSearchFeedback.innerHTML = `
                        <div class="warning-alert">
                            We found your saved draft, but the application cycle for <strong>${escapeHtml(draftQual)}</strong> is currently closed or unavailable.
                        </div>
                    `;
                    returningSearchFeedback.classList.remove('hidden');
                    return;
                }

                currentActiveCycle = matchedCycle;
                selectedProgramWish = draftQual;
                sessionStorage.setItem('myAtlas_popiaAccepted', 'true');
                sessionStorage.setItem('myAtlas_draftId', currentDraftDocId);

                await openLiveApplicationForm(matchedCycle, draftData);
                return;
            }

            // Step C: Not found anywhere
            returningSearchFeedback.innerHTML = `
                <div class="warning-alert">
                    No application exists in the system for those details. Please check your ID or Passport number and try again, or select "No" above to start a new application.
                </div>
            `;
            returningSearchFeedback.classList.remove('hidden');
        } catch (err) {
            console.error("Error searching for existing application:", err);
            alert("An error occurred while searching for your application. Please try again.");
        } finally {
            findAppBtn.disabled = false;
            findAppBtn.textContent = originalBtnText;
        }
    }

    async function searchCollectionByIdentifier(collectionName, saId, passport) {
        const colRef = collection(db, collectionName);

        if (saId) {
            const qId = query(colRef, where("saIdNumber", "==", saId));
            const snapId = await getDocs(qId);
            if (!snapId.empty) return snapId.docs[0];
        }

        if (passport) {
            const qPass = query(colRef, where("passportNumber", "==", passport));
            const snapPass = await getDocs(qPass);
            if (!snapPass.empty) return snapPass.docs[0];
        }

        return null;
    }

    // 2. POPIA Terms & Conditions Handling
    async function handlePopiaContinue() {
        const selectedOption = document.querySelector('input[name="popia_consent"]:checked');
        if (!selectedOption) {
            alert('Please select whether you accept or do not accept the POPIA terms to continue.');
            return;
        }

        if (selectedOption.value === 'decline') {
            // Completely cancel, wipe sessionStorage, reset all inputs, and go back to Question 1
            resetEverythingToStart();
            return;
        }

        if (selectedOption.value === 'accept') {
            const matchingCycles = activeCyclesByQualification.get(selectedProgramWish) || [];
            if (matchingCycles.length === 0) {
                alert('No open application cycle was found for this qualification.');
                return;
            }
            currentActiveCycle = matchingCycles[0];
            sessionStorage.setItem('myAtlas_popiaAccepted', 'true');
            await openLiveApplicationForm(currentActiveCycle, null);
        }
    }

    // Build and display the live application form from the published cycle snapshot
    async function openLiveApplicationForm(cycleData, existingDraftData = null) {
        // Hide intake wizard cards and expand form area cleanly
        if (welcomeSection) welcomeSection.classList.add('hidden');
        if (programSelectCard) programSelectCard.classList.add('hidden');
        if (step1Card) step1Card.classList.add('hidden');
        if (portalCard) portalCard.classList.add('hidden');
        if (step2Card) step2Card.classList.add('hidden');
        if (step3Card) step3Card.classList.add('hidden');
        if (step4Card) step4Card.classList.add('hidden');
        if (mainPageContainer) mainPageContainer.classList.add('full-width-form-mode');

        liveApplicationContainer.classList.remove('hidden');
        liveFormMount.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #0056b3; font-size: 15px; font-weight: 600;">
                Loading your application form...
            </div>
        `;

        // Load master field definitions to get section, fieldName, order, and requirement
        const fieldsSnapshot = await getDocs(collection(db, "application_form_fields"));
        const savedFieldsState = cycleData.formFieldsSnapshot || {};
        const activeFields = [];

        fieldsSnapshot.forEach((docSnap) => {
            const fieldData = docSnap.data();
            const fieldId = docSnap.id;

            // Strictly exclude the Documents section on the student side
            if (fieldData.section === "documents") return;

            const cycleFieldConfig = savedFieldsState[fieldId];
            const isSelected = cycleFieldConfig ? cycleFieldConfig.isSelected : fieldData.isSelected;
            const requirement = cycleFieldConfig ? cycleFieldConfig.requirement : fieldData.requirement;

            if (isSelected) {
                activeFields.push({
                    id: fieldId,
                    ...fieldData,
                    requirement
                });
            }
        });

        activeFields.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Parse enabled courses from selectedCoursesSnapshot
        const rawCourses = Array.isArray(cycleData.selectedCoursesSnapshot) ? cycleData.selectedCoursesSnapshot : [];
        const validCourses = rawCourses.map((item) => {
            if (typeof item === 'object' && item !== null) {
                return {
                    course: item.course || '',
                    studyMode: item.studyMode || 'Full-time',
                    campus: item.campus || 'Main Campus'
                };
            }
            const parts = String(item).split("_");
            return {
                course: parts[0] || String(item),
                studyMode: parts[1] || "Full-time",
                campus: parts[2] || "Main Campus"
            };
        }).filter(c => c.course);

        let formHtml = `
            <div class="application-form-preview-wrapper" style="background: #ffffff; border: 1px solid #d1d8e0; border-radius: 9px; padding: clamp(16px, 3vw, 32px); box-shadow: 0 2px 7px rgba(0, 0, 0, 0.035);">
                <style>
                    .application-form-preview-wrapper,
                    .application-form-preview-wrapper * { box-sizing: border-box; }
                    .application-form-preview-wrapper {
                        width: 100%; max-width: 100%; min-width: 0;
                        background: #ffffff !important;
                        color: #0f172a;
                    }
                    .application-form-preview-wrapper * { min-width: 0; }
                    .application-form-preview-wrapper input:not([type="checkbox"]),
                    .application-form-preview-wrapper select,
                    .application-form-preview-wrapper textarea {
                        width: 100% !important; max-width: 100% !important; min-width: 0 !important;
                        font: inherit;
                    }
                    .application-form-preview-wrapper label,
                    .application-form-preview-wrapper h2,
                    .application-form-preview-wrapper h3,
                    .application-form-preview-wrapper h4,
                    .application-form-preview-wrapper p { overflow-wrap: anywhere; }
                    .application-form-preview-wrapper table { width: 100%; }
                    .application-form-preview-wrapper .disability-row { flex-wrap: wrap; }
                    @media (max-width: 640px) {
                        .application-form-preview-wrapper .form-preview-section > div:last-child { padding: 14px !important; }
                    }
                </style>
                <header style="border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px;">
                    <span style="font-size: 11px; font-weight: 700; color: #0056b3; text-transform: uppercase; letter-spacing: 1px;">Online Student Application</span>
                    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        ${escapeHtml(cycleData.cycleName || "Student Application Form")}
                    </h2>
                    <p style="font-size: 13px; color: #64748b; margin-top: 4px;">
                        Academic Year: <strong>${escapeHtml(cycleData.academicYear || "N/A")}</strong> | Qualification: <strong>${escapeHtml(cycleData.qualificationType || "N/A")}</strong>
                    </p>
                </header>
                <form id="studentLiveApplicationForm" onsubmit="return false;" style="display: flex; flex-direction: column; gap: 26px;">
        `;

        const sectionsGrouped = {
            personal: activeFields.filter(f => f.section === "personal" || !f.section),
            contact: activeFields.filter(f => f.section === "contact"),
            guardian: activeFields.filter(f => f.section === "guardian"),
            education_courses: activeFields.filter(f => f.section === "education_courses"),
            additional_info: activeFields.filter(f => f.section === "additional_info")
        };

        Object.keys(sectionsGrouped).forEach((sectionKey) => {
            const fields = sectionsGrouped[sectionKey];
            const sectionMeta = STUDENT_SECTIONS[sectionKey];
            if (!sectionMeta) return;

            if (fields.length === 0 && sectionKey !== "education_courses") {
                return;
            }
            if (fields.length === 0 && sectionKey === "education_courses" && validCourses.length === 0) {
                return;
            }

            formHtml += `
                <section class="form-preview-section" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
                    <div style="background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px;">
                        <div style="color: #0056b3; display: flex; align-items: center;">${sectionMeta.icon}</div>
                        <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0;">${sectionMeta.title}</h3>
                    </div>
                    <div style="padding: 22px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 18px;">
            `;

            if (sectionKey === "education_courses") {
                formHtml += renderEducationCoursesSectionHTML(fields, validCourses, cycleData);
            } else {
                fields.forEach(field => {
                    formHtml += renderIndividualFieldHTML(field, sectionKey);
                });
            }

            formHtml += `
                    </div>
                </section>
            `;
        });

        formHtml += `
                </form>
            </div>
        `;

        liveFormMount.innerHTML = formHtml;
        attachLiveFormListeners(validCourses);

        // If returning applicant resumed from draft_applications, pre-fill saved values
        if (existingDraftData) {
            restoreDraftIntoForm(existingDraftData);
            if (draftSaveIndicator) {
                draftSaveIndicator.textContent = "Resumed saved draft • Auto-saving enabled";
            }
        }

        attachAutoSaveListeners();
        liveApplicationContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderEducationCoursesSectionHTML(activeEducationFields, validCourses, cycleData) {
        let html = "";
        const fieldNamesSet = new Set(activeEducationFields.map(f => f.fieldName));

        if (fieldNamesSet.has("Matric Status/Current Standing")) {
            const fieldObj = activeEducationFields.find(f => f.fieldName === "Matric Status/Current Standing");
            const isReq = fieldObj?.requirement === "Required";
            const reqAsterisk = isReq ? `<span style="color: #e53b4d;">*</span>` : ``;

            html += `
                <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 13px; font-weight: 700; color: #1e293b;">Matric Status/Current Standing ${reqAsterisk}</label>
                    <select id="matricStandingTrigger" data-field-name="Matric Status/Current Standing" data-required="${isReq}" class="control" style="max-width: 340px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;">
                        <option value="" disabled selected>Select option</option>
                        <option value="Currently in Grade 12">Currently in Grade 12</option>
                        <option value="Completed Matric">Completed Matric</option>
                    </select>

                    <!-- Grade 12 Sub-section -->
                    <div id="grade12SubSection" style="display: none; margin-top: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; flex-direction: column; gap: 16px;">
                        <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0;">High school education History</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Name of the school/institution ${reqAsterisk}</label>
                                <input type="text" data-g12-field="schoolName" placeholder="School Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
                                <input type="text" data-g12-field="country" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province ${reqAsterisk}</label>
                                <input type="text" data-g12-field="province" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                        </div>

                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 8px;">
                            <div style="padding: 12px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin:0;">High school results (grade 11 final yr results/grade 12 june exam results)</h4>
                            </div>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px; min-width: 500px;" id="grade11SubjectsTable">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; color: #0056b3;">
                                            <th style="padding: 10px 14px;">Subject Name</th>
                                            <th style="padding: 10px 14px; width: 25%;">Results / %</th>
                                            <th style="padding: 10px 14px; width: 25%;">Level</th>
                                            <th style="padding: 10px 14px; width: 80px; text-align: center;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="grade11SubjectsBody">
                                        <tr style="border-bottom: 1px solid #f1f5f9;">
                                            <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff5f5; border:1px solid #feb2b2; color:#e53e3e; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                                <button type="button" id="addGrade11SubjectBtn" style="background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; font-weight: 600; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Subject</button>
                            </div>
                        </div>
                    </div>

                    <!-- Completed Matric Sub-section -->
                    <div id="completedMatricSubSection" style="display: none; margin-top: 14px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; flex-direction: column; gap: 16px;">
                        <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0;">High school education History</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Name of the school/institution ${reqAsterisk}</label>
                                <input type="text" data-matric-field="schoolName" placeholder="School Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
                                <input type="text" data-matric-field="country" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province ${reqAsterisk}</label>
                                <input type="text" data-matric-field="province" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed/Matriculated ${reqAsterisk}</label>
                                <input type="number" data-matric-field="yearCompleted" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                            </div>
                        </div>

                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 8px;">
                            <div style="padding: 12px 16px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                                <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin:0;">High school results (grade 12 final yr results)</h4>
                            </div>
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 12px; min-width: 500px;" id="grade12SubjectsTable">
                                    <thead>
                                        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; color: #0056b3;">
                                            <th style="padding: 10px 14px;">Subject Name</th>
                                            <th style="padding: 10px 14px; width: 25%;">Results / %</th>
                                            <th style="padding: 10px 14px; width: 25%;">Level</th>
                                            <th style="padding: 10px 14px; width: 80px; text-align: center;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="grade12SubjectsBody">
                                        <tr style="border-bottom: 1px solid #f1f5f9;">
                                            <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                                            <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff5f5; border:1px solid #feb2b2; color:#e53e3e; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
                                <button type="button" id="addGrade12SubjectBtn" style="background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; font-weight: 600; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Subject</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (fieldNamesSet.has("Have you previously attended a tertiary institution?")) {
            const fieldObj = activeEducationFields.find(f => f.fieldName === "Have you previously attended a tertiary institution?");
            const isReq = fieldObj?.requirement === "Required";
            const reqAsterisk = isReq ? `<span style="color: #e53b4d;">*</span>` : ``;

            html += `
                <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                    <label style="font-size: 13px; font-weight: 700; color: #1e293b;">Have you previously attended a tertiary institution? ${reqAsterisk}</label>
                    <select id="tertiaryTrigger" data-field-name="Have you previously attended a tertiary institution?" data-required="${isReq}" class="control" style="max-width: 340px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;">
                        <option value="" disabled selected>Select option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>

                    <div id="tertiaryBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 14px;">
                        <div id="tertiaryContainer" style="display: flex; flex-direction: column; gap: 14px;">
                            ${createTertiaryCardHTML(reqAsterisk, false)}
                        </div>
                        <button type="button" id="addTertiaryCardBtn" style="align-self: flex-start; background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; font-weight: 600; border-radius: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer;">+ Add Another Tertiary Education</button>
                    </div>
                </div>
            `;
        }

        if (fieldNamesSet.has("What do you wish to study for?") || validCourses.length > 0) {
            const fieldObj = activeEducationFields.find(f => f.fieldName === "What do you wish to study for?");
            const isReq = fieldObj ? fieldObj.requirement === "Required" : true;
            const reqAsterisk = isReq ? `<span style="color: #e53b4d;">*</span>` : ``;
            const activeAcademicYear = cycleData.academicYear || new Date().getFullYear().toString();
            const qualLabel = cycleData.qualificationType || selectedProgramWish || "";

            html += `
                <div style="grid-column: 1 / -1; margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; display: flex; flex-direction: column; gap: 16px;" id="studentCascadingWrapper" data-exclude-from-draft="true">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 700; color: #1e293b;">What do you wish to study for? ${reqAsterisk}</label>
                        <select id="whatDoYouWishToStudyTrigger" data-required="${isReq}" class="control" style="max-width: 340px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;">
                            <option value="" disabled selected>Select option</option>
                            ${qualLabel ? `<option value="${escapeHtml(qualLabel)}">${escapeHtml(qualLabel)}</option>` : ''}
                        </select>
                    </div>

                    <div id="cascadingSubFieldsBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 16px;">
                        <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0;">Course Selection Details</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Academic year</label>
                                <input type="text" id="student_displayAcademicYear" class="control" value="${escapeHtml(activeAcademicYear)}" readonly style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#f1f5f9; color:#64748b; cursor:not-allowed;" />
                            </div>

                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Study mode ${reqAsterisk}</label>
                                <select id="student_filterStudyMode" data-required="${isReq}" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;">
                                    <option value="" disabled selected>Select option</option>
                                </select>
                            </div>

                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Campus ${reqAsterisk}</label>
                                <select id="student_filterCampus" data-required="${isReq}" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" disabled>
                                    <option value="" disabled selected>Select option</option>
                                </select>
                            </div>

                            <div>
                                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Course ${reqAsterisk}</label>
                                <select id="student_filterCourseDropdown" data-required="${isReq}" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" disabled>
                                    <option value="" disabled selected>Select option</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    function createTertiaryCardHTML(reqAsterisk = '', removable = true) {
        return `
            <div class="tertiary-card" style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; position: relative;">
                ${removable ? `<button type="button" class="remove-card-btn" style="position: absolute; top: 14px; right: 14px; background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 600;">Remove</button>` : ''}
                <div style="grid-column: 1 / -1;">
                    <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Institution Name ${reqAsterisk}</label>
                    <input type="text" data-tertiary-field="institution" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Qualification / Programme ${reqAsterisk}</label>
                    <input type="text" data-tertiary-field="qualification" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Current / Final Status ${reqAsterisk}</label>
                    <select data-tertiary-field="status" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;">
                        <option value="" disabled selected>Select option</option>
                        <option value="Completed">Completed</option>
                        <option value="Discontinued">Discontinued</option>
                        <option value="Transferred">Transferred</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Started ${reqAsterisk}</label>
                    <input type="number" data-tertiary-field="yearStarted" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed ${reqAsterisk}</label>
                    <input type="number" data-tertiary-field="yearCompleted" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                </div>
            </div>
        `;
    }

    function renderIndividualFieldHTML(field, sectionKey) {
        const isReq = field.requirement === "Required";
        const reqAsterisk = isReq ? `<span style="color: #e53b4d;">*</span>` : ``;
        const fname = field.fieldName;

        if (fname.includes("Disability")) {
            return `
                <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 13px; font-weight: 700; color: #1e293b;">Do you have any disabilities? ${reqAsterisk}</label>
                    <select id="disabilityTrigger" data-field-name="${escapeHtml(fname)}" data-required="${isReq}" class="control" style="max-width: 340px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;">
                        <option value="" disabled selected>Select option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                    <div id="disabilityDetailsBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 14px;">
                        <div id="disabilityContainer" style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="disability-row" style="display: flex; gap: 10px; align-items: center;">
                                <input type="text" placeholder="Describe disability (e.g., Visual Impairment)" style="flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background:#fff;" />
                                <button type="button" class="remove-disability-btn" style="background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
                            </div>
                        </div>
                        <button type="button" id="addDisabilityBtn" style="align-self: flex-start; background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; font-weight: 600; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Disability</button>
                    </div>
                </div>
            `;
        }

        if (fname.includes("Residential Address") && !fname.includes("Postal")) {
            return `
                <div data-address-group="residential" style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="grid-column: 1 / -1;">
                        <label style="font-size: 13px; font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">Physical Residential Address ${reqAsterisk}</label>
                        <input type="text" data-addr-part="street" data-required="${isReq}" placeholder="Street Address, Building, Unit" style="width:100%; height:40px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
                        <input type="text" data-addr-part="city" data-required="${isReq}" placeholder="City" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
                        <input type="text" data-addr-part="province" data-required="${isReq}" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
                        <input type="text" data-addr-part="postalCode" data-required="${isReq}" placeholder="Code" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country of Residence ${reqAsterisk}</label>
                        <input type="text" data-addr-part="country" data-required="${isReq}" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                    </div>
                </div>
            `;
        }

        if (fname.includes("Postal Address")) {
            const prefix = sectionKey === "guardian" ? "guardianPostal" : "contactPostal";
            const triggerId = `${prefix}Trigger`;
            const blockId = `${prefix}Block`;

            return `
                <div data-postal-group="${prefix}" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 13px; font-weight: 700; color: #1e293b;">Is the Postal address the same as residential address? ${reqAsterisk}</label>
                    <select id="${triggerId}" data-required="${isReq}" class="control" style="max-width: 340px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;">
                        <option value="" disabled selected>Select option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>

                    <div id="${blockId}" style="display: none; margin-top: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="grid-column: 1 / -1;">
                            <label style="font-size: 13px; font-weight: 700; color: #1e293b; display: block; margin-bottom: 6px;">Postal Address Line ${reqAsterisk}</label>
                            <input type="text" data-postal-part="street" placeholder="P.O Box / Street Address" style="width:100%; height:40px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
                            <input type="text" data-postal-part="city" placeholder="City" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
                            <input type="text" data-postal-part="province" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
                            <input type="text" data-postal-part="postalCode" placeholder="Postal Code" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
                            <input type="text" data-postal-part="country" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                    </div>
                </div>
            `;
        }

        // Declaration / Agreement Checkboxes (strictly excluded from draft saving)
        if (fname.includes("Confirmation") || fname.includes("Consent") || fname.includes("Agreement")) {
            return `
                <div style="grid-column: 1 / -1; display: flex; align-items: flex-start; gap: 12px; background: #f8fafc; padding: 14px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <input type="checkbox" class="final-declaration-checkbox" data-field-id="${escapeHtml(field.id)}" data-field-name="${escapeHtml(fname)}" data-required="${isReq}" style="width:18px; height:18px; margin-top:2px; cursor:pointer;" />
                    <label style="font-size: 13px; color: #1e293b; line-height: 1.4; font-weight: 500;">${escapeHtml(fname)} ${reqAsterisk}</label>
                </div>
            `;
        }

        const lowerName = fname.toLowerCase();
        const isDate = lowerName.includes("date");
        const isEmail = lowerName.includes("email");
        const inputType = isDate ? "date" : (isEmail ? "email" : "text");

        let semanticTag = "";
        if (lowerName.includes("id number") || lowerName === "sa id" || lowerName === "identity number") {
            semanticTag = "saIdNumber";
        } else if (lowerName.includes("passport")) {
            semanticTag = "passportNumber";
        } else if (isEmail && sectionKey !== "guardian") {
            semanticTag = "applicantEmail";
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 13px; font-weight: 700; color: #1e293b; display: block;">${escapeHtml(fname)} ${reqAsterisk}</label>
                <input
                    type="${inputType}"
                    class="standard-applicant-input"
                    data-section="${escapeHtml(sectionKey)}"
                    data-field-id="${escapeHtml(field.id)}"
                    data-field-name="${escapeHtml(fname)}"
                    data-semantic="${semanticTag}"
                    data-required="${isReq}"
                    placeholder="Enter ${escapeHtml(fname)}"
                    style="width: 100%; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #0f172a;"
                />
            </div>
        `;
    }

    function attachLiveFormListeners(validCourses) {
        // 1. Disability Conditional Toggle & Multi-Add Logic
        const disabilityTrigger = document.getElementById("disabilityTrigger");
        const disabilityDetailsBlock = document.getElementById("disabilityDetailsBlock");
        const disabilityContainer = document.getElementById("disabilityContainer");
        const addDisabilityBtn = document.getElementById("addDisabilityBtn");

        if (disabilityTrigger && disabilityDetailsBlock) {
            disabilityTrigger.addEventListener("change", (e) => {
                disabilityDetailsBlock.style.display = e.target.value === "Yes" ? "flex" : "none";
                triggerDraftAutoSave();
            });
        }

        if (addDisabilityBtn && disabilityContainer) {
            addDisabilityBtn.addEventListener("click", () => {
                const row = document.createElement("div");
                row.className = "disability-row";
                row.style.cssText = "display: flex; gap: 10px; align-items: center;";
                row.innerHTML = `
                    <input type="text" placeholder="Describe disability..." style="flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background:#fff;" />
                    <button type="button" class="remove-disability-btn" style="background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
                `;
                disabilityContainer.appendChild(row);
            });
        }

        // 2. Postal Address Conditional Toggles
        const setupPostalToggle = (triggerId, blockId) => {
            const trigger = document.getElementById(triggerId);
            const block = document.getElementById(blockId);
            if (trigger && block) {
                trigger.addEventListener("change", (e) => {
                    block.style.display = e.target.value === "No" ? "grid" : "none";
                    triggerDraftAutoSave();
                });
            }
        };
        setupPostalToggle("contactPostalTrigger", "contactPostalBlock");
        setupPostalToggle("guardianPostalTrigger", "guardianPostalBlock");

        // 3. Matric Standing Conditional Toggle
        const matricTrigger = document.getElementById("matricStandingTrigger");
        const grade12SubSection = document.getElementById("grade12SubSection");
        const completedMatricSubSection = document.getElementById("completedMatricSubSection");

        if (matricTrigger && grade12SubSection && completedMatricSubSection) {
            matricTrigger.addEventListener("change", (e) => {
                const val = e.target.value;
                if (val === "Currently in Grade 12") {
                    grade12SubSection.style.display = "flex";
                    completedMatricSubSection.style.display = "none";
                } else if (val === "Completed Matric") {
                    completedMatricSubSection.style.display = "flex";
                    grade12SubSection.style.display = "none";
                } else {
                    grade12SubSection.style.display = "none";
                    completedMatricSubSection.style.display = "none";
                }
                triggerDraftAutoSave();
            });
        }

        // 4. Dynamic Grade 11 Subject Rows
        const addGrade11SubjectBtn = document.getElementById("addGrade11SubjectBtn");
        const grade11SubjectsBody = document.getElementById("grade11SubjectsBody");
        if (addGrade11SubjectBtn && grade11SubjectsBody) {
            addGrade11SubjectBtn.addEventListener("click", () => {
                grade11SubjectsBody.insertAdjacentHTML("beforeend", createSubjectRowHTML());
            });
        }

        // 5. Dynamic Grade 12 Subject Rows
        const addGrade12SubjectBtn = document.getElementById("addGrade12SubjectBtn");
        const grade12SubjectsBody = document.getElementById("grade12SubjectsBody");
        if (addGrade12SubjectBtn && grade12SubjectsBody) {
            addGrade12SubjectBtn.addEventListener("click", () => {
                grade12SubjectsBody.insertAdjacentHTML("beforeend", createSubjectRowHTML());
            });
        }

        // 6. Tertiary Institution Conditional Toggle & Dynamic Cards
        const tertiaryTrigger = document.getElementById("tertiaryTrigger");
        const tertiaryBlock = document.getElementById("tertiaryBlock");
        const tertiaryContainer = document.getElementById("tertiaryContainer");
        const addTertiaryCardBtn = document.getElementById("addTertiaryCardBtn");

        if (tertiaryTrigger && tertiaryBlock) {
            tertiaryTrigger.addEventListener("change", (e) => {
                tertiaryBlock.style.display = e.target.value === "Yes" ? "flex" : "none";
                triggerDraftAutoSave();
            });
        }

        if (addTertiaryCardBtn && tertiaryContainer) {
            addTertiaryCardBtn.addEventListener("click", () => {
                tertiaryContainer.insertAdjacentHTML("beforeend", createTertiaryCardHTML('', true));
            });
        }

        // Delegated click handler inside liveFormMount
        liveFormMount.addEventListener("click", (e) => {
            if (e.target.classList.contains("remove-disability-btn")) {
                const row = e.target.closest(".disability-row");
                if (disabilityContainer && disabilityContainer.querySelectorAll(".disability-row").length > 1) {
                    row.remove();
                } else if (row) {
                    const input = row.querySelector("input");
                    if (input) input.value = "";
                }
                triggerDraftAutoSave();
            }

            if (e.target.classList.contains("remove-subject-row")) {
                const tr = e.target.closest("tr");
                const tbody = tr?.parentNode;
                if (tbody && tbody.querySelectorAll("tr").length > 1) {
                    tr.remove();
                } else if (tr) {
                    tr.querySelectorAll("input").forEach(inp => inp.value = "");
                }
                triggerDraftAutoSave();
            }

            if (e.target.classList.contains("remove-card-btn")) {
                const card = e.target.closest(".tertiary-card");
                if (card) card.remove();
                triggerDraftAutoSave();
            }
        });

        // 7. Cascading Course Selection (NOT saved in draft_applications)
        const whatDoYouWishToStudyTrigger = document.getElementById("whatDoYouWishToStudyTrigger");
        const cascadingSubFieldsBlock = document.getElementById("cascadingSubFieldsBlock");
        const smSelect = document.getElementById("student_filterStudyMode");
        const cpSelect = document.getElementById("student_filterCampus");
        const crSelect = document.getElementById("student_filterCourseDropdown");

        if (whatDoYouWishToStudyTrigger && cascadingSubFieldsBlock) {
            whatDoYouWishToStudyTrigger.addEventListener("change", (e) => {
                cascadingSubFieldsBlock.style.display = e.target.value ? "flex" : "none";
            });
        }

        if (smSelect && cpSelect && crSelect) {
            const uniqueStudyModes = Array.from(new Set(validCourses.map(v => v.studyMode))).sort();

            smSelect.innerHTML = '<option value="" disabled selected>Select option</option>';
            uniqueStudyModes.forEach(sm => {
                const opt = document.createElement("option");
                opt.value = sm;
                opt.textContent = sm;
                smSelect.appendChild(opt);
            });

            smSelect.addEventListener("change", () => {
                const selectedSM = smSelect.value;

                cpSelect.innerHTML = '<option value="" disabled selected>Select option</option>';
                cpSelect.disabled = false;
                crSelect.innerHTML = '<option value="" disabled selected>Select option</option>';
                crSelect.disabled = true;

                const matchingCampuses = Array.from(new Set(
                    validCourses.filter(v => v.studyMode === selectedSM).map(v => v.campus)
                )).sort();

                matchingCampuses.forEach(camp => {
                    const opt = document.createElement("option");
                    opt.value = camp;
                    opt.textContent = camp;
                    cpSelect.appendChild(opt);
                });
            });

            cpSelect.addEventListener("change", () => {
                const selectedSM = smSelect.value;
                const selectedCampus = cpSelect.value;

                crSelect.innerHTML = '<option value="" disabled selected>Select option</option>';
                crSelect.disabled = false;

                const matchingCourses = Array.from(new Set(
                    validCourses.filter(v => v.studyMode === selectedSM && v.campus === selectedCampus).map(v => v.course)
                )).sort();

                matchingCourses.forEach(crs => {
                    const opt = document.createElement("option");
                    opt.value = crs;
                    opt.textContent = crs;
                    crSelect.appendChild(opt);
                });
            });
        }
    }

    function createSubjectRowHTML(subj = { subject: '', percentage: '', level: '' }) {
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 14px;"><input type="text" value="${escapeHtml(subj.subject)}" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                <td style="padding: 8px 14px;"><input type="number" value="${escapeHtml(subj.percentage)}" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                <td style="padding: 8px 14px;"><input type="text" value="${escapeHtml(subj.level)}" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px;" /></td>
                <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff5f5; border:1px solid #feb2b2; color:#e53e3e; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
            </tr>
        `;
    }

    // Collect form data. When forDraft = true, strictly excludes course selection & final agreement checkboxes.
    function collectFormData(forDraft = true) {
        const standardFields = {};
        let saIdNumber = "";
        let passportNumber = "";
        let applicantEmail = "";

        document.querySelectorAll(".standard-applicant-input").forEach((inp) => {
            const val = inp.value.trim();
            const fieldName = inp.dataset.fieldName;
            const section = inp.dataset.section || "general";
            const semantic = inp.dataset.semantic || "";

            if (!standardFields[section]) standardFields[section] = {};
            standardFields[section][fieldName] = val;

            if (semantic === "saIdNumber" && val) saIdNumber = val;
            if (semantic === "passportNumber" && val) passportNumber = val;
            if (semantic === "applicantEmail" && val) applicantEmail = val;
        });

        // Residential Address
        const resGroup = document.querySelector('[data-address-group="residential"]');
        let residentialAddress = null;
        if (resGroup) {
            residentialAddress = {
                street: resGroup.querySelector('[data-addr-part="street"]')?.value.trim() || "",
                city: resGroup.querySelector('[data-addr-part="city"]')?.value.trim() || "",
                province: resGroup.querySelector('[data-addr-part="province"]')?.value.trim() || "",
                postalCode: resGroup.querySelector('[data-addr-part="postalCode"]')?.value.trim() || "",
                country: resGroup.querySelector('[data-addr-part="country"]')?.value.trim() || ""
            };
        }

        // Contact Postal Address
        const contactPostalTrigger = document.getElementById("contactPostalTrigger");
        let contactPostalAddress = null;
        if (contactPostalTrigger) {
            const block = document.getElementById("contactPostalBlock");
            contactPostalAddress = {
                sameAsResidential: contactPostalTrigger.value,
                street: block?.querySelector('[data-postal-part="street"]')?.value.trim() || "",
                city: block?.querySelector('[data-postal-part="city"]')?.value.trim() || "",
                province: block?.querySelector('[data-postal-part="province"]')?.value.trim() || "",
                postalCode: block?.querySelector('[data-postal-part="postalCode"]')?.value.trim() || "",
                country: block?.querySelector('[data-postal-part="country"]')?.value.trim() || ""
            };
        }

        // Guardian Postal Address
        const guardianPostalTrigger = document.getElementById("guardianPostalTrigger");
        let guardianPostalAddress = null;
        if (guardianPostalTrigger) {
            const block = document.getElementById("guardianPostalBlock");
            guardianPostalAddress = {
                sameAsResidential: guardianPostalTrigger.value,
                street: block?.querySelector('[data-postal-part="street"]')?.value.trim() || "",
                city: block?.querySelector('[data-postal-part="city"]')?.value.trim() || "",
                province: block?.querySelector('[data-postal-part="province"]')?.value.trim() || "",
                postalCode: block?.querySelector('[data-postal-part="postalCode"]')?.value.trim() || "",
                country: block?.querySelector('[data-postal-part="country"]')?.value.trim() || ""
            };
        }

        // Disabilities
        const disabilityTrigger = document.getElementById("disabilityTrigger");
        let disabilityInfo = null;
        if (disabilityTrigger) {
            const list = [];
            document.querySelectorAll("#disabilityContainer .disability-row input").forEach((inp) => {
                const v = inp.value.trim();
                if (v) list.push(v);
            });
            disabilityInfo = {
                hasDisability: disabilityTrigger.value,
                descriptions: list
            };
        }

        // High School & Matric Standing
        const matricTrigger = document.getElementById("matricStandingTrigger");
        let highSchoolEducation = null;
        if (matricTrigger) {
            const standing = matricTrigger.value;
            const g11Subjects = [];
            document.querySelectorAll("#grade11SubjectsBody tr").forEach((tr) => {
                const inputs = tr.querySelectorAll("input");
                const s = inputs[0]?.value.trim() || "";
                const p = inputs[1]?.value.trim() || "";
                const l = inputs[2]?.value.trim() || "";
                if (s || p || l) g11Subjects.push({ subject: s, percentage: p, level: l });
            });

            const g12Subjects = [];
            document.querySelectorAll("#grade12SubjectsBody tr").forEach((tr) => {
                const inputs = tr.querySelectorAll("input");
                const s = inputs[0]?.value.trim() || "";
                const p = inputs[1]?.value.trim() || "";
                const l = inputs[2]?.value.trim() || "";
                if (s || p || l) g12Subjects.push({ subject: s, percentage: p, level: l });
            });

            highSchoolEducation = {
                matricStanding: standing,
                grade12Info: {
                    schoolName: document.querySelector('[data-g12-field="schoolName"]')?.value.trim() || "",
                    country: document.querySelector('[data-g12-field="country"]')?.value.trim() || "",
                    province: document.querySelector('[data-g12-field="province"]')?.value.trim() || "",
                    subjects: g11Subjects
                },
                completedMatricInfo: {
                    schoolName: document.querySelector('[data-matric-field="schoolName"]')?.value.trim() || "",
                    country: document.querySelector('[data-matric-field="country"]')?.value.trim() || "",
                    province: document.querySelector('[data-matric-field="province"]')?.value.trim() || "",
                    yearCompleted: document.querySelector('[data-matric-field="yearCompleted"]')?.value.trim() || "",
                    subjects: g12Subjects
                }
            };
        }

        // Tertiary History
        const tertiaryTrigger = document.getElementById("tertiaryTrigger");
        let tertiaryEducation = null;
        if (tertiaryTrigger) {
            const records = [];
            document.querySelectorAll("#tertiaryContainer .tertiary-card").forEach((card) => {
                const rec = {
                    institution: card.querySelector('[data-tertiary-field="institution"]')?.value.trim() || "",
                    qualification: card.querySelector('[data-tertiary-field="qualification"]')?.value.trim() || "",
                    status: card.querySelector('[data-tertiary-field="status"]')?.value || "",
                    yearStarted: card.querySelector('[data-tertiary-field="yearStarted"]')?.value.trim() || "",
                    yearCompleted: card.querySelector('[data-tertiary-field="yearCompleted"]')?.value.trim() || ""
                };
                if (rec.institution || rec.qualification || rec.status || rec.yearStarted || rec.yearCompleted) {
                    records.push(rec);
                }
            });
            tertiaryEducation = {
                attendedTertiary: tertiaryTrigger.value,
                records
            };
        }

        const basePayload = {
            cycleId: currentActiveCycle?.id || "",
            cycleCollection: currentActiveCycle?._collectionName || "",
            cycleName: currentActiveCycle?.cycleName || "",
            academicYear: currentActiveCycle?.academicYear || "",
            qualificationType: currentActiveCycle?.qualificationType || selectedProgramWish || "",
            saIdNumber,
            passportNumber,
            applicantEmail,
            standardFields,
            residentialAddress,
            contactPostalAddress,
            guardianPostalAddress,
            disabilityInfo,
            highSchoolEducation,
            tertiaryEducation
        };

        // Draft strictly excludes course selections and final declaration checkboxes
        if (forDraft) {
            return basePayload;
        }

        // Full submission includes course selections and declarations
        const courseSelection = {
            studyQualification: document.getElementById("whatDoYouWishToStudyTrigger")?.value || "",
            academicYear: document.getElementById("student_displayAcademicYear")?.value || "",
            studyMode: document.getElementById("student_filterStudyMode")?.value || "",
            campus: document.getElementById("student_filterCampus")?.value || "",
            course: document.getElementById("student_filterCourseDropdown")?.value || ""
        };

        const declarations = [];
        document.querySelectorAll(".final-declaration-checkbox").forEach((cb) => {
            declarations.push({
                fieldId: cb.dataset.fieldId || "",
                statement: cb.dataset.fieldName || "",
                accepted: cb.checked
            });
        });

        return {
            ...basePayload,
            courseSelection,
            declarations
        };
    }

    function restoreDraftIntoForm(draftData) {
        if (!draftData) return;

        // Restore standard inputs
        if (draftData.standardFields) {
            document.querySelectorAll(".standard-applicant-input").forEach((inp) => {
                const section = inp.dataset.section || "general";
                const fieldName = inp.dataset.fieldName;
                const savedVal = draftData.standardFields?.[section]?.[fieldName];
                if (savedVal !== undefined) {
                    inp.value = savedVal;
                }
            });
        }

        // Restore residential address
        if (draftData.residentialAddress) {
            const resGroup = document.querySelector('[data-address-group="residential"]');
            if (resGroup) {
                Object.entries(draftData.residentialAddress).forEach(([k, v]) => {
                    const el = resGroup.querySelector(`[data-addr-part="${k}"]`);
                    if (el && v) el.value = v;
                });
            }
        }

        // Restore contact & guardian postal addresses
        const restorePostal = (prefix, dataObj) => {
            if (!dataObj) return;
            const trigger = document.getElementById(`${prefix}Trigger`);
            const block = document.getElementById(`${prefix}Block`);
            if (trigger && dataObj.sameAsResidential) {
                trigger.value = dataObj.sameAsResidential;
                if (block) block.style.display = dataObj.sameAsResidential === "No" ? "grid" : "none";
            }
            if (block) {
                ['street', 'city', 'province', 'postalCode', 'country'].forEach((k) => {
                    const el = block.querySelector(`[data-postal-part="${k}"]`);
                    if (el && dataObj[k]) el.value = dataObj[k];
                });
            }
        };
        restorePostal("contactPostal", draftData.contactPostalAddress);
        restorePostal("guardianPostal", draftData.guardianPostalAddress);

        // Restore disabilities
        if (draftData.disabilityInfo) {
            const trigger = document.getElementById("disabilityTrigger");
            const block = document.getElementById("disabilityDetailsBlock");
            const container = document.getElementById("disabilityContainer");
            if (trigger && draftData.disabilityInfo.hasDisability) {
                trigger.value = draftData.disabilityInfo.hasDisability;
                if (block) block.style.display = draftData.disabilityInfo.hasDisability === "Yes" ? "flex" : "none";
            }
            if (container && Array.isArray(draftData.disabilityInfo.descriptions) && draftData.disabilityInfo.descriptions.length > 0) {
                container.innerHTML = "";
                draftData.disabilityInfo.descriptions.forEach((desc) => {
                    const row = document.createElement("div");
                    row.className = "disability-row";
                    row.style.cssText = "display: flex; gap: 10px; align-items: center;";
                    row.innerHTML = `
                        <input type="text" value="${escapeHtml(desc)}" placeholder="Describe disability..." style="flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background:#fff;" />
                        <button type="button" class="remove-disability-btn" style="background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
                    `;
                    container.appendChild(row);
                });
            }
        }

        // Restore high school & matric standing
        if (draftData.highSchoolEducation) {
            const hs = draftData.highSchoolEducation;
            const trigger = document.getElementById("matricStandingTrigger");
            const g12Sec = document.getElementById("grade12SubSection");
            const compSec = document.getElementById("completedMatricSubSection");

            if (trigger && hs.matricStanding) {
                trigger.value = hs.matricStanding;
                if (g12Sec && compSec) {
                    if (hs.matricStanding === "Currently in Grade 12") {
                        g12Sec.style.display = "flex";
                        compSec.style.display = "none";
                    } else if (hs.matricStanding === "Completed Matric") {
                        compSec.style.display = "flex";
                        g12Sec.style.display = "none";
                    }
                }
            }

            if (hs.grade12Info) {
                ['schoolName', 'country', 'province'].forEach((k) => {
                    const el = document.querySelector(`[data-g12-field="${k}"]`);
                    if (el && hs.grade12Info[k]) el.value = hs.grade12Info[k];
                });
                const tbody11 = document.getElementById("grade11SubjectsBody");
                if (tbody11 && Array.isArray(hs.grade12Info.subjects) && hs.grade12Info.subjects.length > 0) {
                    tbody11.innerHTML = hs.grade12Info.subjects.map(s => createSubjectRowHTML(s)).join("");
                }
            }

            if (hs.completedMatricInfo) {
                ['schoolName', 'country', 'province', 'yearCompleted'].forEach((k) => {
                    const el = document.querySelector(`[data-matric-field="${k}"]`);
                    if (el && hs.completedMatricInfo[k]) el.value = hs.completedMatricInfo[k];
                });
                const tbody12 = document.getElementById("grade12SubjectsBody");
                if (tbody12 && Array.isArray(hs.completedMatricInfo.subjects) && hs.completedMatricInfo.subjects.length > 0) {
                    tbody12.innerHTML = hs.completedMatricInfo.subjects.map(s => createSubjectRowHTML(s)).join("");
                }
            }
        }

        // Restore tertiary history
        if (draftData.tertiaryEducation) {
            const te = draftData.tertiaryEducation;
            const trigger = document.getElementById("tertiaryTrigger");
            const block = document.getElementById("tertiaryBlock");
            const container = document.getElementById("tertiaryContainer");

            if (trigger && te.attendedTertiary) {
                trigger.value = te.attendedTertiary;
                if (block) block.style.display = te.attendedTertiary === "Yes" ? "flex" : "none";
            }

            if (container && Array.isArray(te.records) && te.records.length > 0) {
                container.innerHTML = "";
                te.records.forEach((rec, idx) => {
                    container.insertAdjacentHTML("beforeend", createTertiaryCardHTML('', idx > 0));
                    const card = container.lastElementChild;
                    if (card) {
                        if (rec.institution) card.querySelector('[data-tertiary-field="institution"]').value = rec.institution;
                        if (rec.qualification) card.querySelector('[data-tertiary-field="qualification"]').value = rec.qualification;
                        if (rec.status) card.querySelector('[data-tertiary-field="status"]').value = rec.status;
                        if (rec.yearStarted) card.querySelector('[data-tertiary-field="yearStarted"]').value = rec.yearStarted;
                        if (rec.yearCompleted) card.querySelector('[data-tertiary-field="yearCompleted"]').value = rec.yearCompleted;
                    }
                });
            }
        }
    }

    // 3. Auto-Save Draft Logic (excludes course selections and final declaration checkboxes)
    function attachAutoSaveListeners() {
        if (!liveFormMount) return;

        const handleFormChange = (e) => {
            if (isSubmitting) return;
            // Ignore changes inside the course selection block or final declaration checkboxes
            if (e.target.closest("#studentCascadingWrapper")) return;
            if (e.target.classList.contains("final-declaration-checkbox")) return;

            triggerDraftAutoSave();
        };

        liveFormMount.addEventListener("input", handleFormChange);
        liveFormMount.addEventListener("change", handleFormChange);
    }

    function triggerDraftAutoSave() {
        if (isSubmitting) return;
        clearTimeout(draftSaveTimeout);
        draftSaveTimeout = setTimeout(saveDraftNow, 1200);
    }

    async function saveDraftNow() {
        if (isSubmitting) return;
        const draftPayload = collectFormData(true);

        // Determine document ID for draft_applications
        const cleanId = draftPayload.saIdNumber.replace(/[^a-zA-Z0-9]/g, "");
        const cleanPassport = draftPayload.passportNumber.replace(/[^a-zA-Z0-9]/g, "");
        const cleanEmail = draftPayload.applicantEmail.replace(/[^a-zA-Z0-9]/g, "");

        if (!currentDraftDocId) {
            if (cleanId) {
                currentDraftDocId = `draft_id_${cleanId}`;
            } else if (cleanPassport) {
                currentDraftDocId = `draft_pass_${cleanPassport}`;
            } else if (cleanEmail) {
                currentDraftDocId = `draft_email_${cleanEmail}`;
            } else {
                return;
            }
        }

        try {
            if (draftSaveIndicator) {
                draftSaveIndicator.textContent = "Saving draft...";
            }

            await setDoc(doc(db, "draft_applications", currentDraftDocId), {
                ...draftPayload,
                updatedAt: serverTimestamp()
            }, { merge: true });

            sessionStorage.setItem("myAtlas_draftId", currentDraftDocId);

            if (draftSaveIndicator) {
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                draftSaveIndicator.textContent = `Draft saved automatically at ${nowTime}`;
            }
        } catch (err) {
            console.error("Auto-save draft error:", err);
            if (draftSaveIndicator) {
                draftSaveIndicator.textContent = "Auto-save paused (check connection)";
            }
        }
    }

    function generateReferenceNumber(academicYear) {
        const yr = String(academicYear || new Date().getFullYear());
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        return `ATL-${yr}-${randomDigits}`;
    }

    // 4. Final Submission, PIN Validation, Draft Cleanup & Email Notification
    async function handleFinalSubmit() {
        if (isSubmitting) return;

        // Validate required inputs
        const requiredElements = liveFormMount.querySelectorAll('[data-required="true"]');
        for (const el of requiredElements) {
            // Skip hidden conditional blocks
            if (el.offsetParent === null) continue;

            if (el.type === "checkbox") {
                if (!el.checked) {
                    alert("Please tick all required declaration and agreement checkboxes before submitting.");
                    el.focus();
                    return;
                }
            } else if (!el.value || !el.value.trim()) {
                alert("Please complete all required fields marked with * before submitting.");
                el.focus();
                return;
            }
        }

        // Validate course selection
        const studyTrigger = document.getElementById("whatDoYouWishToStudyTrigger");
        const smSelect = document.getElementById("student_filterStudyMode");
        const cpSelect = document.getElementById("student_filterCampus");
        const crSelect = document.getElementById("student_filterCourseDropdown");

        if (studyTrigger && (!studyTrigger.value || !smSelect?.value || !cpSelect?.value || !crSelect?.value)) {
            alert("Please complete your Course Selection details (Qualification, Study Mode, Campus, and Course).");
            return;
        }

        // Validate applicant email so confirmation email can be delivered
        const fullData = collectFormData(false);
        if (!fullData.applicantEmail || !fullData.applicantEmail.includes("@")) {
            alert("Please enter a valid email address so we can send your Application Reference Number and PIN.");
            return;
        }

        // Validate strictly 6-digit numeric PIN
        const pin = applicantPinInput ? applicantPinInput.value.trim() : "";
        const confirmPin = applicantPinConfirmInput ? applicantPinConfirmInput.value.trim() : "";

        if (!/^\d{6}$/.test(pin)) {
            alert("Your PIN must be strictly 6 digits (numbers only, no letters or spaces).");
            applicantPinInput?.focus();
            return;
        }

        if (pin !== confirmPin) {
            alert("Your 6-digit PIN and Confirm PIN do not match.");
            applicantPinConfirmInput?.focus();
            return;
        }

        isSubmitting = true;
        clearTimeout(draftSaveTimeout);
        finalSubmitApplicationBtn.disabled = true;
        finalSubmitApplicationBtn.textContent = "Submitting Application...";

        try {
            const referenceNumber = generateReferenceNumber(fullData.academicYear);

            // Save completed application to complete_applications
            await setDoc(doc(db, "complete_applications", referenceNumber), {
                ...fullData,
                referenceNumber,
                pin,
                status: "Submitted",
                submittedAt: serverTimestamp()
            });

            // Delete old draft from draft_applications if it exists
            const draftIdsToDelete = new Set();
            if (currentDraftDocId) draftIdsToDelete.add(currentDraftDocId);
            const storedDraftId = sessionStorage.getItem("myAtlas_draftId");
            if (storedDraftId) draftIdsToDelete.add(storedDraftId);

            if (fullData.saIdNumber) {
                const snapId = await getDocs(query(collection(db, "draft_applications"), where("saIdNumber", "==", fullData.saIdNumber)));
                snapId.forEach(d => draftIdsToDelete.add(d.id));
            }
            if (fullData.passportNumber) {
                const snapPass = await getDocs(query(collection(db, "draft_applications"), where("passportNumber", "==", fullData.passportNumber)));
                snapPass.forEach(d => draftIdsToDelete.add(d.id));
            }

            for (const dId of draftIdsToDelete) {
                try {
                    await deleteDoc(doc(db, "draft_applications", dId));
                } catch (delErr) {
                    console.warn("Could not delete draft doc:", dId, delErr);
                }
            }

            // Increment applicationCount on the active cycle document
            if (currentActiveCycle?._collectionName && currentActiveCycle?.id) {
                try {
                    await updateDoc(doc(db, currentActiveCycle._collectionName, currentActiveCycle.id), {
                        applicationCount: increment(1)
                    });
                } catch (countErr) {
                    console.warn("Could not increment applicationCount:", countErr);
                }
            }

            // Queue confirmation email via /mail collection
            await addDoc(collection(db, "mail"), {
                to: fullData.applicantEmail,
                message: {
                    subject: `Atlas College Application Received – Ref: ${referenceNumber}`,
                    text: `Dear Applicant,\n\nYour application to Atlas College (${fullData.cycleName || fullData.qualificationType}) has been submitted successfully.\n\nApplication Reference Number: ${referenceNumber}\n6-Digit Portal PIN: ${pin}\n\nPlease keep these details safe to track your application status on the student portal.\n\nKind regards,\nAtlas College Admissions Office`,
                    html: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 28px;">
                            <h2 style="color: #0056b3; margin-top: 0;">Application Submitted Successfully</h2>
                            <p>Dear Applicant,</p>
                            <p>Thank you for applying to <strong>Atlas College</strong> (${escapeHtml(fullData.cycleName || fullData.qualificationType)}). Your application has been received.</p>
                            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
                                <p style="margin: 0 0 8px 0;"><strong>Application Reference Number:</strong> ${escapeHtml(referenceNumber)}</p>
                                <p style="margin: 0;"><strong>6-Digit Portal PIN:</strong> ${escapeHtml(pin)}</p>
                            </div>
                            <p>Please keep your Reference Number and 6-digit PIN safe so you can log into the student portal to check your application status.</p>
                            <p style="margin-bottom: 0;">Kind regards,<br><strong>Atlas College Admissions Office</strong></p>
                        </div>
                    `
                }
            });

            // Clear temporary session state and display centered confirmation screen
            sessionStorage.clear();
            liveApplicationContainer.classList.add("hidden");
            submissionConfirmationScreen.classList.remove("hidden");
            submissionConfirmationScreen.scrollIntoView({ behavior: "smooth", block: "center" });

        } catch (err) {
            console.error("Error submitting application:", err);
            alert("Failed to submit your application. Please check your internet connection and try again.");
            isSubmitting = false;
            finalSubmitApplicationBtn.disabled = false;
            finalSubmitApplicationBtn.textContent = "Submit Application ➔";
        }
    }
});
