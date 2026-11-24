import { db } from "./firebase-config.js";
import { renderStep4ApplicationPreview } from "./form-template.js";
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

            const draftSnap = await searchCollectionByIdentifier('draft_applications', idVal, passportVal);
            if (draftSnap) {
                const draftData = draftSnap.data();
                currentDraftDocId = draftSnap.id;

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

    async function handlePopiaContinue() {
        const selectedOption = document.querySelector('input[name="popia_consent"]:checked');
        if (!selectedOption) {
            alert('Please select whether you accept or do not accept the POPIA terms to continue.');
            return;
        }

        if (selectedOption.value === 'decline') {
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

    // Delegates form rendering directly to renderStep4ApplicationPreview from form-template.js
    async function openLiveApplicationForm(cycleData, existingDraftData = null) {
        if (welcomeSection) welcomeSection.classList.add('hidden');
        if (programSelectCard) programSelectCard.classList.add('hidden');
        if (step1Card) step1Card.classList.add('hidden');
        if (portalCard) portalCard.classList.add('hidden');
        if (step2Card) step2Card.classList.add('hidden');
        if (step3Card) step3Card.classList.add('hidden');
        if (step4Card) step4Card.classList.add('hidden');
        if (mainPageContainer) mainPageContainer.classList.add('full-width-form-mode');

        liveApplicationContainer.classList.remove('hidden');

        await renderStep4ApplicationPreview("liveFormMount", {
            studentMode: true,
            cycleName: cycleData.cycleName || "Student Application Form",
            academicYear: cycleData.academicYear || "",
            qualification: cycleData.qualificationType || selectedProgramWish || "",
            formFieldsSnapshot: cycleData.formFieldsSnapshot || {},
            selectedCoursesSnapshot: cycleData.selectedCoursesSnapshot || []
        });

        if (existingDraftData) {
            restoreDraftIntoForm(existingDraftData);
            if (draftSaveIndicator) {
                draftSaveIndicator.textContent = "Resumed saved draft • Auto-saving enabled";
            }
        }

        attachAutoSaveListeners();
        liveApplicationContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

        if (forDraft) {
            return basePayload;
        }

        const courseSelection = {
            studyQualification: document.getElementById("whatDoYouWishToStudyTrigger")?.value || "",
            academicYear: document.getElementById("preview_displayAcademicYear")?.value || "",
            studyMode: document.getElementById("preview_filterStudyMode")?.value || "",
            campus: document.getElementById("preview_filterCampus")?.value || "",
            course: document.getElementById("preview_filterCourseDropdown")?.value || ""
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

        if (draftData.residentialAddress) {
            const resGroup = document.querySelector('[data-address-group="residential"]');
            if (resGroup) {
                Object.entries(draftData.residentialAddress).forEach(([k, v]) => {
                    const el = resGroup.querySelector(`[data-addr-part="${k}"]`);
                    if (el && v) el.value = v;
                });
            }
        }

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
                    const card = document.createElement("div");
                    card.className = "tertiary-card";
                    card.style.cssText = "background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; position: relative;";
                    card.innerHTML = `
                        ${idx > 0 ? `<button type="button" class="remove-card-btn" style="position: absolute; top: 14px; right: 14px; background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 600;">Remove</button>` : ''}
                        <div style="grid-column: 1 / -1;">
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Institution Name</label>
                            <input type="text" data-tertiary-field="institution" value="${escapeHtml(rec.institution)}" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Qualification / Programme</label>
                            <input type="text" data-tertiary-field="qualification" value="${escapeHtml(rec.qualification)}" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Current / Final Status</label>
                            <select data-tertiary-field="status" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;">
                                <option value="" ${!rec.status ? 'selected' : ''} disabled>Select option</option>
                                <option value="Completed" ${rec.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Discontinued" ${rec.status === 'Discontinued' ? 'selected' : ''}>Discontinued</option>
                                <option value="Transferred" ${rec.status === 'Transferred' ? 'selected' : ''}>Transferred</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Started</label>
                            <input type="number" data-tertiary-field="yearStarted" value="${escapeHtml(rec.yearStarted)}" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed</label>
                            <input type="number" data-tertiary-field="yearCompleted" value="${escapeHtml(rec.yearCompleted)}" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#fff;" />
                        </div>
                    `;
                    container.appendChild(card);
                });
            }
        }
    }

    function attachAutoSaveListeners() {
        if (!liveFormMount) return;

        const handleFormChange = (e) => {
            if (isSubmitting) return;
            if (e.target.closest("#previewCascadingWrapper")) return;
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

    async function handleFinalSubmit() {
        if (isSubmitting) return;

        const requiredElements = liveFormMount.querySelectorAll('[data-required="true"]');
        for (const el of requiredElements) {
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

        const studyTrigger = document.getElementById("whatDoYouWishToStudyTrigger");
        const smSelect = document.getElementById("preview_filterStudyMode");
        const cpSelect = document.getElementById("preview_filterCampus");
        const crSelect = document.getElementById("preview_filterCourseDropdown");

        if (studyTrigger && (!studyTrigger.value || !smSelect?.value || !cpSelect?.value || !crSelect?.value)) {
            alert("Please complete your Course Selection details (Qualification, Study Mode, Campus, and Course).");
            return;
        }

        const fullData = collectFormData(false);
        if (!fullData.applicantEmail || !fullData.applicantEmail.includes("@")) {
            alert("Please enter a valid email address so we can send your Application Reference Number and PIN.");
            return;
        }

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

            await setDoc(doc(db, "complete_applications", referenceNumber), {
                ...fullData,
                referenceNumber,
                pin,
                status: "Submitted",
                submittedAt: serverTimestamp()
            });

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

            if (currentActiveCycle?._collectionName && currentActiveCycle?.id) {
                try {
                    await updateDoc(doc(db, currentActiveCycle._collectionName, currentActiveCycle.id), {
                        applicationCount: increment(1)
                    });
                } catch (countErr) {
                    console.warn("Could not increment applicationCount:", countErr);
                }
            }

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
