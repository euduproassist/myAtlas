import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Master Blueprint Reference for Field Structuring
const BLUEPRINT_SECTIONS = {
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
  },
  documents: {
    title: "6. Documents",
    icon: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
  }
};

/**
 * Main function to generate and inject the Application Preview inside Step 4
 */
export async function renderStep4ApplicationPreview(containerElementId = "builderStep4Preview") {
  let targetContainer = document.getElementById(containerElementId);

  // Fallback: create container inside builderStep4 if it doesn't exist
  if (!targetContainer) {
    const step4 = document.getElementById("builderStep4");
    if (!step4) return;
    targetContainer = document.createElement("div");
    targetContainer.id = containerElementId;
    targetContainer.style.marginTop = "24px";
    step4.insertBefore(targetContainer, step4.querySelector(".actions"));
  }

  targetContainer.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0866f5; font-size: 15px; font-weight: 600;">
      Generating live application form preview from configured choices...
    </div>`;

  const savedFieldsState = JSON.parse(localStorage.getItem("myAtlas_formFieldsState") || "{}");
  const savedSelectedCourses = JSON.parse(localStorage.getItem("myAtlas_selectedCourses") || "[]");
  const savedBasicInfo = JSON.parse(localStorage.getItem("myAtlas_basicInfo") || "{}");

  try {
    const fieldsSnapshot = await getDocs(collection(db, "application_form_fields"));
    const activeFields = [];

    fieldsSnapshot.forEach((docSnap) => {
      const fieldData = docSnap.data();
      const fieldId = docSnap.id;
      
      // Check if configured as selected by admin
      const userState = savedFieldsState[fieldId];
      const isSelected = userState ? userState.isSelected : fieldData.isSelected;
      const requirement = userState ? userState.requirement : fieldData.requirement;

      if (isSelected) {
        activeFields.push({
          id: fieldId,
          ...fieldData,
          requirement
        });
      }
    });

    activeFields.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Build the Preview Form HTML
    let formHtml = `
      <div class="application-form-preview-wrapper" style="background: #ffffff; border: 1px solid var(--border-light, #cfe3f7); border-radius: 8px; padding: 28px;">
        <header style="border-bottom: 2px solid #eaf5ff; padding-bottom: 16px; margin-bottom: 28px;">
          <span style="font-size: 11px; font-weight: 700; color: #0866f5; text-transform: uppercase; letter-spacing: 1px;">Live Form Preview</span>
          <h2 style="font-size: 22px; font-weight: 800; color: #071c72; margin-top: 4px;">
            ${savedBasicInfo.cycleName || "Student Application Form"}
          </h2>
          <p style="font-size: 13px; color: #7897c5; margin-top: 4px;">
            Academic Year: <strong>${savedBasicInfo.academicYear || "N/A"}</strong> | Qualification: <strong>${savedBasicInfo.qualification || "N/A"}</strong>
          </p>
        </header>
        <form id="applicantPreviewForm" onsubmit="return false;" style="display: flex; flex-direction: column; gap: 32px;">
    `;

    // Group fields by Section
    const sectionsGrouped = {
      personal: activeFields.filter(f => f.section === "personal" || !f.section),
      contact: activeFields.filter(f => f.section === "contact"),
      guardian: activeFields.filter(f => f.section === "guardian"),
      education_courses: activeFields.filter(f => f.section === "education_courses"),
      additional_info: activeFields.filter(f => f.section === "additional_info"),
      documents: activeFields.filter(f => f.section === "documents")
    };

    Object.keys(sectionsGrouped).forEach((sectionKey) => {
      const fields = sectionsGrouped[sectionKey];
      const sectionMeta = BLUEPRINT_SECTIONS[sectionKey] || { title: sectionKey, icon: "" };

      formHtml += `
        <section class="form-preview-section" style="border: 1px solid #e1efff; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="background: #fafcfe; padding: 14px 20px; border-bottom: 1px solid #e1efff; display: flex; align-items: center; gap: 12px;">
            <div style="color: #0866f5; display: flex; align-items: center;">${sectionMeta.icon}</div>
            <h3 style="font-size: 15px; font-weight: 750; color: #071c72; margin: 0;">${sectionMeta.title}</h3>
          </div>
          <div style="padding: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px;">
      `;

      if (fields.length === 0 && sectionKey !== "education_courses") {
        formHtml += `<p style="grid-column: 1 / -1; color: #7897c5; font-size: 13px; font-style: italic;">No fields enabled for this section.</p>`;
      } else {
        fields.forEach(field => {
          formHtml += renderIndividualFieldHTML(field, sectionKey);
        });
      }

      // Append Step 3 Selected Courses into Section 4B
      if (sectionKey === "education_courses") {
        formHtml += renderCourseSelectionBlock(savedSelectedCourses);
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

    targetContainer.innerHTML = formHtml;
    attachFormEventListeners();

  } catch (err) {
    console.error("Error generating application preview:", err);
    targetContainer.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Failed to generate form preview. Please check network connection.</div>`;
  }
}

/**
 * Render individual field controls according to Blueprint Master Logic
 */
function renderIndividualFieldHTML(field, sectionKey) {
  const reqAsterisk = field.requirement === "Required" ? `<span style="color: #e53b4d;">*</span>` : ``;
  const fname = field.fieldName;

  // 1. DISABILITY INFORMATION (Conditional with Multi-Add Support)
  if (fname.includes("Disability")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 700; color: #244b88;">Do you have any disabilities? ${reqAsterisk}</label>
        <select id="disabilityTrigger" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;">
          <option value="" disabled selected>Select option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
        <div id="disabilityDetailsBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 14px;">
          <div id="disabilityContainer" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="disability-row" style="display: flex; gap: 10px; align-items: center;">
              <input type="text" placeholder="Describe disability (e.g., Visual Impairment)" style="flex: 1; height: 38px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;" />
              <button type="button" class="remove-disability-btn" style="background: #fff0f0; border: 1px solid #ffd0d0; color: red; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
            </div>
          </div>
          <button type="button" id="addDisabilityBtn" style="align-self: flex-start; background: #eaf5ff; border: 1px solid #0866f5; color: #0866f5; font-weight: 700; border-radius: 4px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Disability</button>
        </div>
      </div>
    `;
  }

  // 2. RESIDENTIAL ADDRESS MULTI-SUBFIELDS
  if (fname.includes("Residential Address") && !fname.includes("Postal")) {
    return `
      <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; background: #f8fbff; padding: 16px; border-radius: 6px; border: 1px solid #e1efff;">
        <div style="grid-column: 1 / -1;">
          <label style="font-size: 13px; font-weight: 700; color: #244b88; display: block; margin-bottom: 6px;">Physical Residential Address ${reqAsterisk}</label>
          <input type="text" placeholder="Street Address, Building, Unit" style="width:100%; height:40px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
          <input type="text" placeholder="City" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
          <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
          <input type="text" placeholder="Code" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Country of Residence ${reqAsterisk}</label>
          <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
      </div>
    `;
  }

  // 3. POSTAL ADDRESS (Conditional Trigger - Hidden by Default)
  if (fname.includes("Postal Address")) {
    const triggerId = sectionKey === "guardian" ? "guardianPostalTrigger" : "contactPostalTrigger";
    const blockId = sectionKey === "guardian" ? "guardianPostalBlock" : "contactPostalBlock";

    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 700; color: #244b88;">Is the Postal address the same as residential address? ${reqAsterisk}</label>
        <select id="${triggerId}" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;">
          <option value="" disabled selected>Select option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <div id="${blockId}" style="display: none; margin-top: 10px; grid-template-columns: repeat(2, 1fr); gap: 14px; background: #f8fbff; padding: 16px; border-radius: 6px; border: 1px solid #e1efff;">
          <div style="grid-column: 1 / -1;">
            <label style="font-size: 13px; font-weight: 700; color: #244b88; display: block; margin-bottom: 6px;">Postal Address Line ${reqAsterisk}</label>
            <input type="text" placeholder="P.O Box / Street Address" style="width:100%; height:40px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
            <input type="text" placeholder="City" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
            <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
            <input type="text" placeholder="Postal Code" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
            <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
          </div>
        </div>
      </div>
    `;
  }

  // 4. SECTION A: MATRIC STATUS & HIGHSCHOOL HISTORY (Section 4A corresponding with Step 2 Table)
  if (fname.includes("Matric Status") || fname.includes("Current Standing")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 700; color: #244b88;">Matric Status / Current Standing ${reqAsterisk}</label>
        <select id="matricStandingTrigger" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;">
          <option value="" disabled selected>Select option</option>
          <option value="Completed Matric">Completed Matric</option>
          <option value="Currently in Grade 12">Currently in Grade 12</option>
        </select>

        <div id="matricCompletedBlock" style="display: none; margin-top: 14px; flex-direction: column; gap: 20px;">
          <!-- High School Education History -->
          <div style="background: #f8fbff; padding: 16px; border-radius: 6px; border: 1px solid #cfe3ff; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
            <h4 style="grid-column: 1 / -1; font-size: 14px; font-weight: 750; color: #071c72; margin: 0;">High School Education History</h4>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Name of High School ${reqAsterisk}</label>
              <input type="text" placeholder="School Name" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Country of High School ${reqAsterisk}</label>
              <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
              <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Year Completed / Matriculated ${reqAsterisk}</label>
              <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
            </div>
          </div>

          <!-- Subject Results (Grade 12 Final Year Results) Dynamic Table -->
          <div style="background: #ffffff; border: 1px solid #cfe3ff; border-radius: 6px; overflow: hidden;">
            <div style="padding: 12px 16px; background: #edf6ff; border-bottom: 1px solid #cfe3ff;">
              <h4 style="font-size: 14px; font-weight: 750; color: #071c72; margin:0;">Subject Results (Grade 12 Final Year Results)</h4>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="subjectsTable">
              <thead>
                <tr style="background: #fafcfe; border-bottom: 1px solid #e1efff; text-align: left; color: #0866f5;">
                  <th style="padding: 10px 14px;">Subject Name</th>
                  <th style="padding: 10px 14px; width: 25%;">Results / %</th>
                  <th style="padding: 10px 14px; width: 25%;">Level</th>
                  <th style="padding: 10px 14px; width: 80px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody id="subjectsTableBody">
                <tr style="border-bottom: 1px solid #edf6ff;">
                  <td style="padding: 8px 14px;"><input type="text" placeholder="e.g. Mathematics" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
                  <td style="padding: 8px 14px;"><input type="number" placeholder="75" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
                  <td style="padding: 8px 14px;"><input type="text" placeholder="Level 6" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
                  <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-row-btn" style="background:#fff0f0; border:1px solid #ffd0d0; color:red; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
                </tr>
              </tbody>
            </table>
            <div style="padding: 10px 16px; background: #fafcfe; border-top: 1px solid #e1efff;">
              <button type="button" id="addSubjectRowBtn" style="background: #eaf5ff; border: 1px solid #0866f5; color: #0866f5; font-weight: 700; border-radius: 4px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Subject</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. PREVIOUS TERTIARY INSTITUTION (Section 4A corresponding with Step 2 Table)
  if (fname.includes("tertiary institution")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 700; color: #244b88;">Have you previously attended a tertiary institution? ${reqAsterisk}</label>
        <select id="tertiaryTrigger" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;">
          <option value="" disabled selected>Select option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <div id="tertiaryBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 14px;">
          <div id="tertiaryContainer" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="tertiary-card" style="background: #f8fbff; padding: 16px; border-radius: 6px; border: 1px solid #cfe3ff; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
              <div style="grid-column: 1 / -1;">
                <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Institution Name ${reqAsterisk}</label>
                <input type="text" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Qualification / Programme ${reqAsterisk}</label>
                <input type="text" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Current / Final Status ${reqAsterisk}</label>
                <select style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;">
                  <option value="" disabled selected>Select option</option>
                  <option value="Completed">Completed</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Transferred">Transferred</option>
                </select>
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Year Started ${reqAsterisk}</label>
                <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Year Completed ${reqAsterisk}</label>
                <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
              </div>
            </div>
          </div>
          <button type="button" id="addTertiaryCardBtn" style="align-self: flex-start; background: #eaf5ff; border: 1px solid #0866f5; color: #0866f5; font-weight: 700; border-radius: 4px; padding: 8px 16px; font-size: 12px; cursor: pointer;">+ Add Another Tertiary Education</button>
        </div>
      </div>
    `;
  }

  // 6. DOCUMENTS SECTION (Upload Inputs)
  if (sectionKey === "documents") {
    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 6px;">
        <label style="font-size: 13px; font-weight: 700; color: #244b88;">${fname} ${reqAsterisk}</label>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" style="font-size: 12px; border: 1px dashed #70aaff; border-radius: 6px; padding: 12px; background: #fafdff; cursor: pointer;" />
      </div>
    `;
  }

  // 7. DECLARATIONS / CHECKBOXES (Section 5)
  if (fname.includes("Confirmation") || fname.includes("Consent") || fname.includes("Agreement")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; align-items: flex-start; gap: 10px; background: #fafcfe; padding: 12px; border-radius: 6px; border: 1px solid #e1efff;">
        <input type="checkbox" style="width:18px; height:18px; margin-top:2px; cursor:pointer;" />
        <label style="font-size: 13px; color: #244b88; line-height: 1.4;">${fname} ${reqAsterisk}</label>
      </div>
    `;
  }

  // STANDARD INPUT FIELD (Default Fallback)
  const isDate = fname.toLowerCase().includes("date");
  const isEmail = fname.toLowerCase().includes("email");
  const inputType = isDate ? "date" : (isEmail ? "email" : "text");

  return `
    <div>
      <label style="font-size: 13px; font-weight: 700; color: #244b88; display: block; margin-bottom: 6px;">${fname} ${reqAsterisk}</label>
      <input type="${inputType}" placeholder="Enter ${fname}" style="width: 100%; height: 40px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;" />
    </div>
  `;
}

/**
 * Render Step 3 Selected Master Courses in Section 4B
 */
function renderCourseSelectionBlock(selectedCoursesKeys) {
  if (!selectedCoursesKeys || selectedCoursesKeys.length === 0) {
    return `
      <div style="grid-column: 1 / -1; margin-top: 14px; background: #fff9f9; border: 1px solid #ffe0e0; padding: 14px; border-radius: 6px; color: #d32f2f; font-size: 13px;">
        ⚠️ No courses were selected in Step 3. Applicants will not see any course selection choices.
      </div>`;
  }

  let courseItemsHtml = selectedCoursesKeys.map(key => {
    const parts = key.split("_");
    const title = parts[0] || key;
    const mode = parts[1] || "Full-time";
    const campus = parts[2] || "Main Campus";

    return `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #cfe3ff; border-radius: 6px; background: #ffffff; cursor: pointer;">
        <div>
          <strong style="color: #071c72; font-size: 13.5px; display: block;">${title}</strong>
          <span style="font-size: 11px; color: #7897c5;">Study Mode: ${mode} | Campus: ${campus}</span>
        </div>
        <input type="radio" name="selectedCourseOption" style="width: 18px; height: 18px;" />
      </label>
    `;
  }).join("");

  return `
    <div style="grid-column: 1 / -1; margin-top: 10px; background: #f8fbff; border: 1px solid #cfe3ff; padding: 16px; border-radius: 6px;">
      <h4 style="font-size: 14px; font-weight: 750; color: #071c72; margin-bottom: 10px;">Section B: Course Selection (Choose Your Course)</h4>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${courseItemsHtml}
      </div>
    </div>
  `;
}

/**
 * Attach dynamic event listeners for conditional logic and dynamic tables
 */
function attachFormEventListeners() {
  // 1. Disability Conditional Toggle & Multi-Add Logic
  const disabilityTrigger = document.getElementById("disabilityTrigger");
  const disabilityDetailsBlock = document.getElementById("disabilityDetailsBlock");
  const disabilityContainer = document.getElementById("disabilityContainer");
  const addDisabilityBtn = document.getElementById("addDisabilityBtn");

  if (disabilityTrigger && disabilityDetailsBlock) {
    disabilityTrigger.addEventListener("change", (e) => {
      disabilityDetailsBlock.style.display = e.target.value === "Yes" ? "flex" : "none";
    });
  }

  if (addDisabilityBtn && disabilityContainer) {
    addDisabilityBtn.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "disability-row";
      row.style.cssText = "display: flex; gap: 10px; align-items: center;";
      row.innerHTML = `
        <input type="text" placeholder="Describe disability..." style="flex: 1; height: 38px; border: 1px solid #cfe3ff; border-radius: 6px; padding: 0 12px;" />
        <button type="button" class="remove-disability-btn" style="background: #fff0f0; border: 1px solid #ffd0d0; color: red; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
      `;
      disabilityContainer.appendChild(row);

      row.querySelector(".remove-disability-btn").addEventListener("click", () => row.remove());
    });
  }

  // Handle remove for initial disability row
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-disability-btn")) {
      const row = e.target.closest(".disability-row");
      if (disabilityContainer && disabilityContainer.querySelectorAll(".disability-row").length > 1) {
        row.remove();
      } else if (row) {
        const input = row.querySelector("input");
        if (input) input.value = "";
      }
    }
  });

  // 2. Postal Address Conditional Toggles (Hidden by Default, reveals on "No")
  const setupPostalToggle = (triggerId, blockId) => {
    const trigger = document.getElementById(triggerId);
    const block = document.getElementById(blockId);
    if (trigger && block) {
      trigger.addEventListener("change", (e) => {
        if (e.target.value === "No") {
          block.style.display = "grid";
        } else {
          block.style.display = "none";
        }
      });
    }
  };
  setupPostalToggle("contactPostalTrigger", "contactPostalBlock");
  setupPostalToggle("guardianPostalTrigger", "guardianPostalBlock");

  // 3. Matric Standing Conditional Toggle (Section 4A Logic)
  const matricTrigger = document.getElementById("matricStandingTrigger");
  const matricBlock = document.getElementById("matricCompletedBlock");
  if (matricTrigger && matricBlock) {
    matricTrigger.addEventListener("change", (e) => {
      matricBlock.style.display = e.target.value === "Completed Matric" ? "flex" : "none";
    });
  }

  // 4. Dynamic Grade 12 Subject Rows
  const addSubjectRowBtn = document.getElementById("addSubjectRowBtn");
  const subjectsTableBody = document.getElementById("subjectsTableBody");
  if (addSubjectRowBtn && subjectsTableBody) {
    addSubjectRowBtn.addEventListener("click", () => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #edf6ff";
      tr.innerHTML = `
        <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
        <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
        <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cfe3ff; border-radius:4px; padding:0 8px;" /></td>
        <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-row-btn" style="background:#fff0f0; border:1px solid #ffd0d0; color:red; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
      `;
      subjectsTableBody.appendChild(tr);
    });

    subjectsTableBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-row-btn")) {
        e.target.closest("tr").remove();
      }
    });
  }

  // 5. Tertiary Institution Conditional Toggle & Dynamic Cards
  const tertiaryTrigger = document.getElementById("tertiaryTrigger");
  const tertiaryBlock = document.getElementById("tertiaryBlock");
  const tertiaryContainer = document.getElementById("tertiaryContainer");
  const addTertiaryCardBtn = document.getElementById("addTertiaryCardBtn");

  if (tertiaryTrigger && tertiaryBlock) {
    tertiaryTrigger.addEventListener("change", (e) => {
      tertiaryBlock.style.display = e.target.value === "Yes" ? "flex" : "none";
    });
  }

  if (addTertiaryCardBtn && tertiaryContainer) {
    addTertiaryCardBtn.addEventListener("click", () => {
      const card = document.createElement("div");
      card.className = "tertiary-card";
      card.style.cssText = "background: #f8fbff; padding: 16px; border-radius: 6px; border: 1px solid #cfe3ff; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; position: relative;";
      card.innerHTML = `
        <button type="button" class="remove-card-btn" style="position: absolute; top: 10px; right: 10px; background: #fff0f0; border: 1px solid #ffd0d0; color: red; border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;">Remove</button>
        <div style="grid-column: 1 / -1;">
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Institution Name</label>
          <input type="text" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Qualification / Programme</label>
          <input type="text" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Current / Final Status</label>
          <select style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;">
            <option value="" disabled selected>Select option</option>
            <option value="Completed">Completed</option>
            <option value="Discontinued">Discontinued</option>
            <option value="Transferred">Transferred</option>
          </select>
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Year Started</label>
          <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 700; color: #244b88; display: block; margin-bottom: 4px;">Year Completed</label>
          <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cfe3ff; border-radius:6px; padding:0 12px;" />
        </div>
      `;
      tertiaryContainer.appendChild(card);

      card.querySelector(".remove-card-btn").addEventListener("click", () => card.remove());
    });
  }
}
