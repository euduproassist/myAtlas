import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { renderStep4ApplicationPreview } from "./form-template.js";

document.addEventListener("DOMContentLoaded", async () => {
  const mainPageContainer = document.getElementById("mainPageContainer");
  const programSelect = document.getElementById("program-wish-select");
  const step1Card = document.getElementById("step1-card");
  const studentNumSelect = document.getElementById("student-number-select");
  const portalRedirectCard = document.getElementById("portal-redirect-card");
  const step2Card = document.getElementById("step2-card");
  const returningSelect = document.getElementById("returning-select");
  const step3Card = document.getElementById("step3-card");
  const saIdInput = document.getElementById("sa-id");
  const passportInput = document.getElementById("passport");
  const findAppBtn = document.getElementById("find-app-btn");
  const returningFeedback = document.getElementById("returning-search-feedback");
  const step4Card = document.getElementById("step4-card");
  const popiaRadios = document.getElementsByName("popia_consent");
  const popiaContinueBtn = document.getElementById("popia-continue-btn");

  const liveApplicationContainer = document.getElementById("live-application-container");
  const liveFormMount = document.getElementById("liveFormMount");
  const draftSaveIndicator = document.getElementById("draftSaveIndicator");
  const applicantPinInput = document.getElementById("applicantPinInput");
  const applicantPinConfirmInput = document.getElementById("applicantPinConfirmInput");
  const finalSubmitApplicationBtn = document.getElementById("finalSubmitApplicationBtn");
  const submissionConfirmationScreen = document.getElementById("submission-confirmation-screen");

  let activeCyclesByQualification = new Map();
  let currentSelectedCycle = null;
  let currentDraftDocId = null;
  let autoSaveTimeout = null;
  let hydratedDraftData = null;

  function setFullWidthFormMode(enabled) {
    if (!mainPageContainer) return;
    if (enabled) {
      mainPageContainer.classList.add("full-width-form-mode");
    } else {
      mainPageContainer.classList.remove("full-width-form-mode");
    }
  }

  function showElement(el) {
    if (!el) return;
    el.classList.remove("hidden");
    el.classList.add("fade-in");
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("fade-in");
  }

  function pickPreferredCycle(cycles) {
    if (!cycles || cycles.length === 0) return null;
    return [...cycles].sort((a, b) => {
      const yearA = String(a.academicYear || "");
      const yearB = String(b.academicYear || "");
      if (yearA !== yearB) return yearB.localeCompare(yearA);
      const timeA = String(a.publishedAt || a.createdAt || "");
      const timeB = String(b.publishedAt || b.createdAt || "");
      return timeB.localeCompare(timeA);
    })[0];
  }

  async function loadPublishedApplicationCycles() {
    if (!programSelect) return;

    const currentYear = new Date().getFullYear();
    const candidateYears = [
      String(currentYear - 1),
      String(currentYear),
      String(currentYear + 1),
      String(currentYear + 2)
    ];

    const availableQualifications = new Set();
    activeCyclesByQualification.clear();

    for (const yr of candidateYears) {
      try {
        const snap = await getDocs(collection(db, `${yr}_application_cycle`));
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const qual = data.qualification;
          if (!qual) return;

          const isPublished = data.status === "published";
          const isManuallyClosed = Boolean(data.isManuallyClosed);
          const count = Number(data.applicationCount || 0);
          const maxApps = data.maxApplications !== undefined && data.maxApplications !== null && data.maxApplications !== ""
            ? Number(data.maxApplications)
            : null;
          const isQuotaReached = maxApps !== null && !Number.isNaN(maxApps) && count >= maxApps;

          const isAvailable = isPublished && !isManuallyClosed && !isQuotaReached;

          if (isAvailable) {
            availableQualifications.add(qual);
            if (!activeCyclesByQualification.has(qual)) {
              activeCyclesByQualification.set(qual, []);
            }
            activeCyclesByQualification.get(qual).push({
              id: docSnap.id,
              collectionName: `${yr}_application_cycle`,
              ...data
            });
          }
        });
      } catch (err) {
        console.warn(`Could not read ${yr}_application_cycle:`, err.message);
      }
    }

    Array.from(programSelect.options).forEach((opt) => {
      if (!opt.value) return;
      const isOpen = availableQualifications.has(opt.value);
      opt.disabled = !isOpen;
      opt.classList.toggle("disabled-option", !isOpen);

      if (!opt.dataset.baseLabel) {
        opt.dataset.baseLabel = opt.textContent.trim();
      }
      opt.textContent = isOpen
        ? opt.dataset.baseLabel
        : `${opt.dataset.baseLabel} (Closed / Unavailable)`;
    });
  }

  await loadPublishedApplicationCycles();

  if (programSelect) {
    programSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      hideElement(step1Card);
      hideElement(portalRedirectCard);
      hideElement(step2Card);
      hideElement(step3Card);
      hideElement(step4Card);
      hideElement(liveApplicationContainer);
      hideElement(submissionConfirmationScreen);
      setFullWidthFormMode(false);
      currentSelectedCycle = null;

      if (studentNumSelect) studentNumSelect.value = "";
      if (returningSelect) returningSelect.value = "";

      if (value) {
        const matchingCycles = activeCyclesByQualification.get(value) || [];
        currentSelectedCycle = pickPreferredCycle(matchingCycles);
        showElement(step1Card);
      }
    });
  }

  if (studentNumSelect) {
    studentNumSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      hideElement(portalRedirectCard);
      hideElement(step2Card);
      hideElement(step3Card);
      hideElement(step4Card);
      hideElement(liveApplicationContainer);
      setFullWidthFormMode(false);
      if (returningSelect) returningSelect.value = "";

      if (value === "yes") {
        showElement(portalRedirectCard);
      } else if (value === "no") {
        showElement(step2Card);
      }
    });
  }

  if (returningSelect) {
    returningSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      hideElement(step3Card);
      hideElement(step4Card);
      hideElement(liveApplicationContainer);
      setFullWidthFormMode(false);
      hydratedDraftData = null;
      currentDraftDocId = null;

      if (value === "yes") {
        showElement(step3Card);
      } else if (value === "no") {
        showElement(step4Card);
      }
    });
  }

  function showReturningFeedback(htmlContent, isWarning = false) {
    if (!returningFeedback) return;
    returningFeedback.className = isWarning ? "warning-alert fade-in" : "portal-alert fade-in";
    returningFeedback.style.marginTop = "16px";
    returningFeedback.innerHTML = htmlContent;
    showElement(returningFeedback);
  }

  if (findAppBtn) {
    findAppBtn.addEventListener("click", async () => {
      const saId = (saIdInput ? saIdInput.value : "").trim();
      const passport = (passportInput ? passportInput.value : "").trim();

      if (!saId && !passport) {
        showReturningFeedback("Please enter either your <strong>South African ID Number</strong> or your <strong>Passport Number</strong> to search for a saved application.", true);
        return;
      }

      findAppBtn.disabled = true;
      findAppBtn.textContent = "Searching...";

      try {
        const draftsRef = collection(db, "draft_applications");
        let matchedDoc = null;

        if (saId) {
          const qId = query(draftsRef, where("saIdNumber", "==", saId));
          const snapId = await getDocs(qId);
          if (!snapId.empty) {
            matchedDoc = snapId.docs[0];
          }
        }

        if (!matchedDoc && passport) {
          const qPass = query(draftsRef, where("passportNumber", "==", passport));
          const snapPass = await getDocs(qPass);
          if (!snapPass.empty) {
            matchedDoc = snapPass.docs[0];
          }
        }

        if (matchedDoc) {
          currentDraftDocId = matchedDoc.id;
          hydratedDraftData = matchedDoc.data();

          if (!currentSelectedCycle && hydratedDraftData.qualification) {
            const matchingCycles = activeCyclesByQualification.get(hydratedDraftData.qualification) || [];
            currentSelectedCycle = pickPreferredCycle(matchingCycles);
            if (programSelect && hydratedDraftData.qualification) {
              programSelect.value = hydratedDraftData.qualification;
            }
          }

          showReturningFeedback(
            `<strong>Saved application found!</strong> Last saved on ${escapeText(hydratedDraftData.updatedAt ? new Date(hydratedDraftData.updatedAt).toLocaleString() : "recently")}. Please accept the POPIA notice below to continue where you left off.`,
            false
          );
          showElement(step4Card);
        } else {
          showReturningFeedback(
            `No saved draft application was found matching those details. You can select <strong>"No"</strong> above to start a new application.`,
            true
          );
        }
      } catch (err) {
        console.error("Error searching draft applications:", err);
        showReturningFeedback("Unable to search saved applications right now. Please try again.", true);
      } finally {
        findAppBtn.disabled = false;
        findAppBtn.textContent = "Find My Application ➔";
      }
    });
  }

  function escapeText(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSelectedPopiaConsent() {
    for (const radio of popiaRadios) {
      if (radio.checked) return radio.value;
    }
    return null;
  }

  if (popiaContinueBtn) {
    popiaContinueBtn.addEventListener("click", async () => {
      const consent = getSelectedPopiaConsent();
      if (!consent) {
        alert("Please select either 'I accept' or 'I do not accept' before continuing.");
        return;
      }

      if (consent === "decline") {
        alert("You must accept the POPIA Privacy Notice to proceed with an online application.");
        return;
      }

      const selectedQual = programSelect ? programSelect.value : "";
      if (!currentSelectedCycle && selectedQual) {
        const matchingCycles = activeCyclesByQualification.get(selectedQual) || [];
        currentSelectedCycle = pickPreferredCycle(matchingCycles);
      }

      if (!currentSelectedCycle) {
        alert("No active application cycle was found for your selected qualification.");
        return;
      }

      hideElement(step4Card);
      setFullWidthFormMode(true);
      showElement(liveApplicationContainer);

      await renderStep4ApplicationPreview("liveFormMount", {
        studentMode: true,
        cycleName: currentSelectedCycle.cycleName,
        academicYear: currentSelectedCycle.academicYear,
        qualification: currentSelectedCycle.qualification,
        formFieldsSnapshot: currentSelectedCycle.formFieldsSnapshot || {},
        selectedCoursesSnapshot: currentSelectedCycle.selectedCoursesSnapshot || []
      });

      if (hydratedDraftData) {
        populateFormFromDraft(hydratedDraftData);
      }

      bindAutoSaveListeners();
      liveApplicationContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function extractFormPayload() {
    const responses = {};
    let saIdNumber = (saIdInput ? saIdInput.value.trim() : "");
    let passportNumber = (passportInput ? passportInput.value.trim() : "");
    let applicantEmail = "";
    let applicantFullName = "";

    document.querySelectorAll("#liveFormMount .standard-applicant-input").forEach((input) => {
      const fieldName = input.dataset.fieldName || input.dataset.fieldId || "Field";
      const val = input.value.trim();
      responses[fieldName] = val;

      if (input.dataset.semantic === "saIdNumber" && val) saIdNumber = val;
      if (input.dataset.semantic === "passportNumber" && val) passportNumber = val;
      if (input.dataset.semantic === "applicantEmail" && val) applicantEmail = val;

      const lower = fieldName.toLowerCase();
      if ((lower.includes("full name") || lower === "name" || lower.includes("first name")) && val) {
        applicantFullName = applicantFullName ? `${applicantFullName} ${val}` : val;
      }
    });

    document.querySelectorAll("#liveFormMount .final-declaration-checkbox").forEach((cb) => {
      const label = cb.dataset.fieldName || cb.dataset.fieldId || "Declaration";
      responses[label] = cb.checked;
    });

    const resGroup = document.querySelector('#liveFormMount [data-address-group="residential"]');
    if (resGroup) {
      responses["Residential Address"] = {
        street: resGroup.querySelector('[data-addr-part="street"]')?.value.trim() || "",
        city: resGroup.querySelector('[data-addr-part="city"]')?.value.trim() || "",
        province: resGroup.querySelector('[data-addr-part="province"]')?.value.trim() || "",
        postalCode: resGroup.querySelector('[data-addr-part="postalCode"]')?.value.trim() || "",
        country: resGroup.querySelector('[data-addr-part="country"]')?.value.trim() || ""
      };
    }

    document.querySelectorAll("#liveFormMount [data-postal-group]").forEach((pGroup) => {
      const prefix = pGroup.dataset.postalGroup;
      const sameAsRes = document.getElementById(`${prefix}Trigger`)?.value || "";
      const key = prefix === "guardianPostal" ? "Guardian Postal Address" : "Postal Address";
      responses[key] = {
        sameAsResidential: sameAsRes,
        street: pGroup.querySelector('[data-postal-part="street"]')?.value.trim() || "",
        city: pGroup.querySelector('[data-postal-part="city"]')?.value.trim() || "",
        province: pGroup.querySelector('[data-postal-part="province"]')?.value.trim() || "",
        postalCode: pGroup.querySelector('[data-postal-part="postalCode"]')?.value.trim() || "",
        country: pGroup.querySelector('[data-postal-part="country"]')?.value.trim() || ""
      };
    });

    const disabilityTrigger = document.getElementById("disabilityTrigger");
    if (disabilityTrigger) {
      const items = Array.from(document.querySelectorAll("#disabilityContainer .disability-row input"))
        .map((inp) => inp.value.trim())
        .filter(Boolean);
      responses["Disabilities"] = {
        hasDisability: disabilityTrigger.value,
        details: items
      };
    }

    const matricTrigger = document.getElementById("matricStandingTrigger");
    if (matricTrigger) {
      const standing = matricTrigger.value;
      const g11Rows = Array.from(document.querySelectorAll("#grade11SubjectsBody tr")).map((tr) => {
        const inputs = tr.querySelectorAll("input");
        return {
          subject: inputs[0]?.value.trim() || "",
          percentage: inputs[1]?.value.trim() || "",
          level: inputs[2]?.value.trim() || ""
        };
      }).filter((r) => r.subject || r.percentage || r.level);

      const g12Rows = Array.from(document.querySelectorAll("#grade12SubjectsBody tr")).map((tr) => {
        const inputs = tr.querySelectorAll("input");
        return {
          subject: inputs[0]?.value.trim() || "",
          percentage: inputs[1]?.value.trim() || "",
          level: inputs[2]?.value.trim() || ""
        };
      }).filter((r) => r.subject || r.percentage || r.level);

      responses["Education History"] = {
        standing,
        grade12School: {
          schoolName: document.querySelector('[data-g12-field="schoolName"]')?.value.trim() || "",
          country: document.querySelector('[data-g12-field="country"]')?.value.trim() || "",
          province: document.querySelector('[data-g12-field="province"]')?.value.trim() || "",
          subjects: g11Rows
        },
        completedMatric: {
          schoolName: document.querySelector('[data-matric-field="schoolName"]')?.value.trim() || "",
          country: document.querySelector('[data-matric-field="country"]')?.value.trim() || "",
          province: document.querySelector('[data-matric-field="province"]')?.value.trim() || "",
          yearCompleted: document.querySelector('[data-matric-field="yearCompleted"]')?.value.trim() || "",
          subjects: g12Rows
        }
      };
    }

    const tertiaryTrigger = document.getElementById("tertiaryTrigger");
    if (tertiaryTrigger) {
      const cards = Array.from(document.querySelectorAll("#tertiaryContainer .tertiary-card")).map((card) => ({
        institution: card.querySelector('[data-tertiary-field="institution"]')?.value.trim() || "",
        qualification: card.querySelector('[data-tertiary-field="qualification"]')?.value.trim() || "",
        status: card.querySelector('[data-tertiary-field="status"]')?.value || "",
        yearStarted: card.querySelector('[data-tertiary-field="yearStarted"]')?.value.trim() || "",
        yearCompleted: card.querySelector('[data-tertiary-field="yearCompleted"]')?.value.trim() || ""
      })).filter((c) => c.institution || c.qualification);

      responses["Tertiary History"] = {
        attendedTertiary: tertiaryTrigger.value,
        records: cards
      };
    }

    const studyWish = document.getElementById("whatDoYouWishToStudyTrigger")?.value || "";
    const studyMode = document.getElementById("preview_filterStudyMode")?.value || "";
    const campus = document.getElementById("preview_filterCampus")?.value || "";
    const course = document.getElementById("preview_filterCourseDropdown")?.value || "";
    const academicYear = document.getElementById("preview_displayAcademicYear")?.value || currentSelectedCycle?.academicYear || "";

    responses["Course Selection"] = {
      wishToStudyFor: studyWish,
      academicYear,
      studyMode,
      campus,
      course
    };

    return {
      saIdNumber,
      passportNumber,
      applicantEmail,
      applicantFullName: applicantFullName || "Applicant",
      qualification: currentSelectedCycle?.qualification || "",
      academicYear,
      cycleId: currentSelectedCycle?.id || "",
      cycleCollection: currentSelectedCycle?.collectionName || "",
      cycleName: currentSelectedCycle?.cycleName || "",
      selectedCourse: course,
      selectedStudyMode: studyMode,
      selectedCampus: campus,
      responses
    };
  }

  function populateFormFromDraft(draft) {
    if (!draft || !draft.responses) return;
    const resp = draft.responses;

    document.querySelectorAll("#liveFormMount .standard-applicant-input").forEach((input) => {
      const fname = input.dataset.fieldName || input.dataset.fieldId;
      if (fname && resp[fname] !== undefined && typeof resp[fname] !== "object") {
        input.value = resp[fname];
      }
    });

    document.querySelectorAll("#liveFormMount .final-declaration-checkbox").forEach((cb) => {
      const label = cb.dataset.fieldName || cb.dataset.fieldId;
      if (label && typeof resp[label] === "boolean") {
        cb.checked = resp[label];
      }
    });

    if (resp["Residential Address"] && typeof resp["Residential Address"] === "object") {
      const resGroup = document.querySelector('#liveFormMount [data-address-group="residential"]');
      if (resGroup) {
        const d = resp["Residential Address"];
        if (resGroup.querySelector('[data-addr-part="street"]')) resGroup.querySelector('[data-addr-part="street"]').value = d.street || "";
        if (resGroup.querySelector('[data-addr-part="city"]')) resGroup.querySelector('[data-addr-part="city"]').value = d.city || "";
        if (resGroup.querySelector('[data-addr-part="province"]')) resGroup.querySelector('[data-addr-part="province"]').value = d.province || "";
        if (resGroup.querySelector('[data-addr-part="postalCode"]')) resGroup.querySelector('[data-addr-part="postalCode"]').value = d.postalCode || "";
        if (resGroup.querySelector('[data-addr-part="country"]')) resGroup.querySelector('[data-addr-part="country"]').value = d.country || "";
      }
    }

    if (resp["Disabilities"] && typeof resp["Disabilities"] === "object") {
      const trigger = document.getElementById("disabilityTrigger");
      if (trigger && resp["Disabilities"].hasDisability) {
        trigger.value = resp["Disabilities"].hasDisability;
        trigger.dispatchEvent(new Event("change"));
        const firstInput = document.querySelector("#disabilityContainer .disability-row input");
        if (firstInput && Array.isArray(resp["Disabilities"].details) && resp["Disabilities"].details[0]) {
          firstInput.value = resp["Disabilities"].details[0];
        }
      }
    }

    if (resp["Course Selection"] && typeof resp["Course Selection"] === "object") {
      const cs = resp["Course Selection"];
      const wishTrig = document.getElementById("whatDoYouWishToStudyTrigger");
      if (wishTrig && cs.wishToStudyFor) {
        wishTrig.value = cs.wishToStudyFor;
        wishTrig.dispatchEvent(new Event("change"));
      }
      const smSel = document.getElementById("preview_filterStudyMode");
      if (smSel && cs.studyMode) {
        smSel.value = cs.studyMode;
        smSel.dispatchEvent(new Event("change"));
      }
      const cpSel = document.getElementById("preview_filterCampus");
      if (cpSel && cs.campus) {
        cpSel.value = cs.campus;
        cpSel.dispatchEvent(new Event("change"));
      }
      const crSel = document.getElementById("preview_filterCourseDropdown");
      if (crSel && cs.course) {
        crSel.value = cs.course;
      }
    }
  }

  async function saveDraftToFirestore() {
    const payload = extractFormPayload();
    const identifier = payload.saIdNumber || payload.passportNumber || payload.applicantEmail;

    if (!identifier) {
      if (draftSaveIndicator) {
        draftSaveIndicator.textContent = "Enter ID/Passport or Email to enable auto-save";
      }
      return;
    }

    if (!currentDraftDocId) {
      const cleanId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
      currentDraftDocId = `draft_${cleanId}`;
    }

    try {
      if (draftSaveIndicator) {
        draftSaveIndicator.textContent = "Saving draft...";
      }

      await setDoc(doc(db, "draft_applications", currentDraftDocId), {
        ...payload,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (draftSaveIndicator) {
        draftSaveIndicator.textContent = `Draft saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    } catch (err) {
      console.error("Draft auto-save error:", err);
      if (draftSaveIndicator) {
        draftSaveIndicator.textContent = "Draft save pending";
      }
    }
  }

  function bindAutoSaveListeners() {
    if (!liveFormMount) return;
    liveFormMount.addEventListener("input", () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(saveDraftToFirestore, 900);
    });
    liveFormMount.addEventListener("change", () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(saveDraftToFirestore, 400);
    });
  }

  function validateApplicationForm(payload) {
    const missing = [];

    document.querySelectorAll("#liveFormMount .standard-applicant-input").forEach((input) => {
      if (input.dataset.required === "true" && !input.value.trim()) {
        missing.push(input.dataset.fieldName || "Required field");
      }
    });

    document.querySelectorAll("#liveFormMount .final-declaration-checkbox").forEach((cb) => {
      if (cb.dataset.required === "true" && !cb.checked) {
        missing.push(cb.dataset.fieldName || "Declaration checkbox");
      }
    });

    const courseSelect = document.getElementById("preview_filterCourseDropdown");
    if (courseSelect && courseSelect.dataset.required === "true" && !courseSelect.value) {
      missing.push("Course selection");
    }

    if (missing.length > 0) {
      alert(`Please complete the following required fields:\n• ${missing.join("\n• ")}`);
      return false;
    }

    const pin = (applicantPinInput ? applicantPinInput.value : "").trim();
    const confirmPin = (applicantPinConfirmInput ? applicantPinConfirmInput.value : "").trim();

    if (!/^[0-9]{6}$/.test(pin)) {
      alert("Please create a strictly 6-digit numeric PIN (e.g. 482910).");
      if (applicantPinInput) applicantPinInput.focus();
      return false;
    }

    if (pin !== confirmPin) {
      alert("Your 6-digit PIN and confirmation PIN do not match.");
      if (applicantPinConfirmInput) applicantPinConfirmInput.focus();
      return false;
    }

    if (!payload.applicantEmail) {
      alert("Please enter your email address so we can send your Application Reference Number and PIN.");
      return false;
    }

    return true;
  }

  function generateReferenceNumber() {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `ATL-${year}-${rand}`;
  }

  if (finalSubmitApplicationBtn) {
    finalSubmitApplicationBtn.addEventListener("click", async () => {
      const payload = extractFormPayload();
      if (!validateApplicationForm(payload)) return;

      const pin = applicantPinInput.value.trim();
      const referenceNumber = generateReferenceNumber();

      finalSubmitApplicationBtn.disabled = true;
      finalSubmitApplicationBtn.textContent = "Submitting Application...";

      try {
        await setDoc(doc(db, "complete_applications", referenceNumber), {
          referenceNumber,
          pin,
          status: "Submitted",
          submittedAt: new Date().toISOString(),
          ...payload
        });

        if (currentSelectedCycle?.collectionName && currentSelectedCycle?.id) {
          try {
            await updateDoc(
              doc(db, currentSelectedCycle.collectionName, currentSelectedCycle.id),
              { applicationCount: increment(1) }
            );
          } catch (countErr) {
            console.warn("Could not increment applicationCount:", countErr);
          }
        }

        if (currentDraftDocId) {
          try {
            await deleteDoc(doc(db, "draft_applications", currentDraftDocId));
          } catch (draftErr) {
            console.warn("Could not delete draft after submission:", draftErr);
          }
        }

        await setDoc(doc(collection(db, "mail")), {
          to: payload.applicantEmail,
          message: {
            subject: `Atlas College Application Received — Ref: ${referenceNumber}`,
            text: `Hello ${payload.applicantFullName},\n\nYour application to Atlas College has been submitted successfully.\n\nApplication Reference Number: ${referenceNumber}\nYour 6-Digit Portal PIN: ${pin}\n\nPlease keep these details safe to check your application status.\n\nKind regards,\nAtlas College Admissions`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #0056b3; color: #ffffff; padding: 20px;">
                  <h2 style="margin: 0; font-size: 20px;">Application Submitted Successfully</h2>
                </div>
                <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
                  <p>Hello <strong>${escapeText(payload.applicantFullName)}</strong>,</p>
                  <p>Thank you for applying to <strong>Atlas College</strong>. Your application has been received and logged.</p>
                  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 18px 0;">
                    <p style="margin: 0 0 8px;"><strong>Application Reference Number:</strong> <span style="color: #0056b3; font-size: 16px;">${escapeText(referenceNumber)}</span></p>
                    <p style="margin: 0;"><strong>Your 6-Digit Portal PIN:</strong> <span style="color: #0056b3; font-size: 16px;">${escapeText(pin)}</span></p>
                  </div>
                  <p style="font-size: 13px; color: #64748b;">Keep your Reference Number and 6-digit PIN safe to track your application progress.</p>
                </div>
              </div>
            `
          }
        });

        hideElement(liveApplicationContainer);
        showElement(submissionConfirmationScreen);
        submissionConfirmationScreen.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        console.error("Application submission failed:", err);
        alert("There was an error submitting your application. Please try again.");
        finalSubmitApplicationBtn.disabled = false;
        finalSubmitApplicationBtn.textContent = "Submit Application ➔";
      }
    });
  }
});
