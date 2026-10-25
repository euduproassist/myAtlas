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

    let masterCoursesList = [];
    try {
      const masterSnapshot = await getDocs(collection(db, "master_courses"));
      masterSnapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.course) {
          masterCoursesList.push({
            course: d.course || '',
            studyMode: d.studyMode || 'Full-time',
            campus: d.campus || 'Main Campus'
          });
        }
      });
    } catch (e) {
      console.error("Error fetching master courses for preview:", e);
    }

    let formHtml = `
      <div class="application-form-preview-wrapper" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <header style="border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 32px;">
          <span style="font-size: 11px; font-weight: 700; color: #0866f5; text-transform: uppercase; letter-spacing: 1px;">Live Form Preview</span>
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
            ${savedBasicInfo.cycleName || "Student Application Form"}
          </h2>
          <p style="font-size: 13px; color: #64748b; margin-top: 4px;">
            Academic Year: <strong>${savedBasicInfo.academicYear || "N/A"}</strong> | Qualification: <strong>${savedBasicInfo.qualification || "N/A"}</strong>
          </p>
        </header>
        <form id="applicantPreviewForm" onsubmit="return false;" style="display: flex; flex-direction: column; gap: 28px;">
    `;

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

      if (fields.length === 0 && sectionKey === "education_courses" && savedSelectedCourses.length === 0) {
        return;
      }

      formHtml += `
        <section class="form-preview-section" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="background: #f8fafc; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px;">
            <div style="color: #0866f5; display: flex; align-items: center;">${sectionMeta.icon}</div>
            <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin: 0;">${sectionMeta.title}</h3>
          </div>
          <div style="padding: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px;">
      `;

      if (sectionKey === "education_courses") {
        formHtml += renderEducationCoursesSectionHTML(fields, savedSelectedCourses, masterCoursesList, savedBasicInfo);
      } else {
        if (fields.length === 0) {
          formHtml += `<p style="grid-column: 1 / -1; color: #94a3b8; font-size: 13px; font-style: italic; margin: 0;">No fields enabled for this section.</p>`;
        } else {
          fields.forEach(field => {
            formHtml += renderIndividualFieldHTML(field, sectionKey);
          });
        }
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
 * Render Section 4 Educational Background & Course Selection
 */
function renderEducationCoursesSectionHTML(activeEducationFields, savedSelectedCourses, masterCoursesList, savedBasicInfo) {
  let html = "";
  const fieldNamesSet = new Set(activeEducationFields.map(f => f.fieldName));

  // 1. Matric Status/Current Standing
  if (fieldNamesSet.has("Matric Status/Current Standing")) {
    const fieldObj = activeEducationFields.find(f => f.fieldName === "Matric Status/Current Standing");
    const reqAsterisk = fieldObj?.requirement === "Required" ? `<span style="color: #e53b4d;">*</span>` : ``;

    html += `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 600; color: #334155;">Matric Status/Current Standing ${reqAsterisk}</label>
        <select id="matricStandingTrigger" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; color: #1e293b; font-size: 13px;">
          <option value="" disabled selected>Select option</option>
          <option value="Currently in Grade 12">Currently in Grade 12</option>
          <option value="Completed Matric">Completed Matric</option>
        </select>

        <!-- Sub-section for Currently in Grade 12 -->
        <div id="grade12SubSection" style="display: none; margin-top: 12px; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; flex-direction: column; gap: 16px;">
          <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">High School Education History</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Name of the school/institution ${reqAsterisk}</label>
              <input type="text" placeholder="School Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
              <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province ${reqAsterisk}</label>
              <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 8px;">
            <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin:0;">High school results (grade 11 final yr results/grade 12 june exam results)</h4>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="grade11SubjectsTable">
              <thead>
                <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569;">
                  <th style="padding: 10px 14px;">Subject Name</th>
                  <th style="padding: 10px 14px; width: 25%;">Results / %</th>
                  <th style="padding: 10px 14px; width: 25%;">Level</th>
                  <th style="padding: 10px 14px; width: 80px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody id="grade11SubjectsBody">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
                </tr>
              </tbody>
            </table>
            <div style="padding: 10px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <button type="button" id="addGrade11SubjectBtn" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 600; border-radius: 4px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Subject</button>
            </div>
          </div>
        </div>

        <!-- Sub-section for Completed Matric -->
        <div id="completedMatricSubSection" style="display: none; margin-top: 12px; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; flex-direction: column; gap: 16px;">
          <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">High School Education History</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Name of the school/institution ${reqAsterisk}</label>
              <input type="text" placeholder="School Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
              <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province ${reqAsterisk}</label>
              <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed/Matriculated ${reqAsterisk}</label>
              <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
            </div>
          </div>

          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-top: 8px;">
            <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin:0;">High school results (grade 12 final yr results)</h4>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;" id="grade12SubjectsTable">
              <thead>
                <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0; text-align: left; color: #475569;">
                  <th style="padding: 10px 14px;">Subject Name</th>
                  <th style="padding: 10px 14px; width: 25%;">Results / %</th>
                  <th style="padding: 10px 14px; width: 25%;">Level</th>
                  <th style="padding: 10px 14px; width: 80px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody id="grade12SubjectsBody">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
                  <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
                </tr>
              </tbody>
            </table>
            <div style="padding: 10px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
              <button type="button" id="addGrade12SubjectBtn" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 600; border-radius: 4px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Subject</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Have you previously attended a tertiary institution?
  if (fieldNamesSet.has("Have you previously attended a tertiary institution?")) {
    const fieldObj = activeEducationFields.find(f => f.fieldName === "Have you previously attended a tertiary institution?");
    const reqAsterisk = fieldObj?.requirement === "Required" ? `<span style="color: #e53b4d;">*</span>` : ``;

    html += `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
        <label style="font-size: 13px; font-weight: 600; color: #334155;">Have you previously attended a tertiary institution? ${reqAsterisk}</label>
        <div style="display: flex; gap: 20px; align-items: center; margin-top: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="radio" name="tertiaryAttendance" value="Yes" id="tertiaryTriggerYes" style="accent-color: #0284c7;" /> Yes
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="radio" name="tertiaryAttendance" value="No" id="tertiaryTriggerNo" style="accent-color: #0284c7;" /> No
          </label>
        </div>
        <!-- Hidden select for compatibility with existing script logic -->
        <select id="tertiaryTrigger" style="display: none;">
          <option value="" disabled selected></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <div id="tertiaryBlock" style="display: none; margin-top: 12px; flex-direction: column; gap: 14px;">
          <div id="tertiaryContainer" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="tertiary-card" style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative;">
              <div style="grid-column: 1 / -1;">
                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Institution Name ${reqAsterisk}</label>
                <input type="text" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Qualification / Programme ${reqAsterisk}</label>
                <input type="text" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Current / Final Status ${reqAsterisk}</label>
                <select class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;">
                  <option value="" disabled selected>Select option</option>
                  <option value="Completed">Completed</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Transferred">Transferred</option>
                </select>
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Started ${reqAsterisk}</label>
                <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed ${reqAsterisk}</label>
                <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
              </div>
            </div>
          </div>
          <button type="button" id="addTertiaryCardBtn" style="align-self: flex-start; background: #ffffff; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 600; border-radius: 6px; padding: 8px 16px; font-size: 12px; cursor: pointer;">+ Add Another Tertiary Education</button>
        </div>
      </div>
    `;
  }

  // 3. Course selection with Progressive Cascading Filters
  if (fieldNamesSet.has("Course selection")) {
    html += renderCascadingCourseSelectionBlock(savedSelectedCourses, masterCoursesList, savedBasicInfo);
  }

  return html;
}

/**
 * Render Progressive Cascading Course Selection Block (with Unique Preview IDs)
 */
function renderCascadingCourseSelectionBlock(savedSelectedCourses, masterCoursesList, savedBasicInfo) {
  if (!savedSelectedCourses || savedSelectedCourses.length === 0) {
    return `
      <div style="grid-column: 1 / -1; margin-top: 14px; background: #fff5f5; border: 1px solid #fecdd3; padding: 14px; border-radius: 6px; color: #e11d48; font-size: 13px;">
        No courses were selected in Step 3. Applicants will not see any course selection choices.
      </div>`;
  }

  const validCourses = savedSelectedCourses.map(key => {
    const parts = key.split("_");
    const cName = parts[0] || key;
    const sMode = parts[1] || "Full-time";
    const camp = parts[2] || "Main Campus";

    return {
      course: cName,
      studyMode: sMode,
      campus: camp
    };
  });

  const activeAcademicYear = savedBasicInfo.academicYear || new Date().getFullYear().toString();

  return `
    <div style="grid-column: 1 / -1; margin-top: 10px; background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; display: flex; flex-direction: column; gap: 14px;" id="previewCascadingWrapper" data-courses='${JSON.stringify(validCourses)}'>
      <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">Course Selection</h4>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Academic year</label>
          <input type="text" id="preview_displayAcademicYear" class="control" value="${activeAcademicYear}" readonly style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background:#f8fafc; color:#64748b; font-size: 13px; cursor:not-allowed;" />
        </div>

        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Study mode</label>
          <select id="preview_filterStudyMode" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;">
            <option value="" disabled selected>Select study mode</option>
          </select>
        </div>

        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Campus</label>
          <select id="preview_filterCampus" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" disabled>
            <option value="" disabled selected>Select campus</option>
          </select>
        </div>

        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Course</label>
          <select id="preview_filterCourseDropdown" class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" disabled>
            <option value="" disabled selected>Select course</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render individual field controls according to Blueprint Master Logic (Sections 1, 2, 3, 5, 6)
 */
function renderIndividualFieldHTML(field, sectionKey) {
  const reqAsterisk = field.requirement === "Required" ? `<span style="color: #e53b4d;">*</span>` : ``;
  const fname = field.fieldName;

  if (fname.includes("Disability")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 600; color: #334155;">Do you have any disabilities? ${reqAsterisk}</label>
        <select id="disabilityTrigger" class="control" style="max-width: 320px; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; font-size: 13px;">
          <option value="" disabled selected>Select option</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
        <div id="disabilityDetailsBlock" style="display: none; margin-top: 10px; flex-direction: column; gap: 12px;">
          <div id="disabilityContainer" style="display: flex; flex-direction: column; gap: 10px;">
            <div class="disability-row" style="display: flex; gap: 10px; align-items: center;">
              <input type="text" placeholder="Describe disability (e.g., Visual Impairment)" style="flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; font-size: 13px;" />
              <button type="button" class="remove-disability-btn" style="background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
            </div>
          </div>
          <button type="button" id="addDisabilityBtn" style="align-self: flex-start; background: #ffffff; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 600; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer;">+ Add Disability</button>
        </div>
      </div>
    `;
  }

  if (fname.includes("Residential Address") && !fname.includes("Postal")) {
    return `
      <div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="grid-column: 1 / -1;">
          <label style="font-size: 13px; font-weight: 600; color: #334155; display: block; margin-bottom: 6px;">Physical Residential Address ${reqAsterisk}</label>
          <input type="text" placeholder="Street Address, Building, Unit" style="width:100%; height:40px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
          <input type="text" placeholder="City" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
          <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
          <input type="text" placeholder="Code" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country of Residence ${reqAsterisk}</label>
          <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
      </div>
    `;
  }

  if (fname.includes("Postal Address")) {
    const triggerId = sectionKey === "guardian" ? "guardianPostalTrigger" : "contactPostalTrigger";
    const blockId = sectionKey === "guardian" ? "guardianPostalBlock" : "contactPostalBlock";

    return `
      <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 13px; font-weight: 600; color: #334155;">Postal Address - Same as residential? ${reqAsterisk}</label>
        <div style="display: flex; gap: 20px; align-items: center; margin-top: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="radio" name="${triggerId}_radio" value="Yes" class="postal-radio-yes" data-trigger="${triggerId}" style="accent-color: #0284c7;" /> Yes
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="radio" name="${triggerId}_radio" value="No" class="postal-radio-no" data-trigger="${triggerId}" style="accent-color: #0284c7;" /> No
          </label>
        </div>
        <select id="${triggerId}" style="display: none;">
          <option value="" disabled selected></option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        <div id="${blockId}" style="display: none; margin-top: 10px; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="grid-column: 1 / -1;">
            <label style="font-size: 13px; font-weight: 600; color: #334155; display: block; margin-bottom: 6px;">Postal Address Line ${reqAsterisk}</label>
            <input type="text" placeholder="P.O Box / Street Address" style="width:100%; height:40px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">City / Town ${reqAsterisk}</label>
            <input type="text" placeholder="City" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Province / State ${reqAsterisk}</label>
            <input type="text" placeholder="Province" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Postal Code ${reqAsterisk}</label>
            <input type="text" placeholder="Postal Code" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Country ${reqAsterisk}</label>
            <input type="text" placeholder="Country" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
          </div>
        </div>
      </div>
    `;
  }

  if (sectionKey === "documents") {
    return `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #1e293b; display: block; margin-bottom: 2px;">${fname} ${reqAsterisk}</label>
          <span style="font-size: 11px; color: #64748b;">PDF, PNG, JPG, JPEG</span>
        </div>
        <label style="display: inline-flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #cbd5e1; color: #0284c7; font-weight: 600; border-radius: 6px; padding: 8px 14px; font-size: 12px; cursor: pointer; text-align: center;">
          Choose File
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style="display: none;" />
        </label>
      </div>
    `;
  }

  if (fname.includes("Confirmation") || fname.includes("Consent") || fname.includes("Agreement")) {
    return `
      <div style="grid-column: 1 / -1; display: flex; align-items: flex-start; gap: 12px; background: #ffffff; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <input type="checkbox" style="width:18px; height:18px; margin-top:2px; cursor:pointer; accent-color: #0284c7;" />
        <label style="font-size: 13px; color: #334155; line-height: 1.4;">${fname} ${reqAsterisk}</label>
      </div>
    `;
  }

  const isDate = fname.toLowerCase().includes("date");
  const isEmail = fname.toLowerCase().includes("email");
  const inputType = isDate ? "date" : (isEmail ? "email" : "text");

  return `
    <div>
      <label style="font-size: 13px; font-weight: 600; color: #334155; display: block; margin-bottom: 6px;">${fname} ${reqAsterisk}</label>
      <input type="${inputType}" placeholder="Enter ${fname.toLowerCase()}" style="width: 100%; height: 40px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; font-size: 13px; color: #1e293b;" />
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
        <input type="text" placeholder="Describe disability..." style="flex: 1; height: 38px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 12px; background: #ffffff; font-size: 13px;" />
        <button type="button" class="remove-disability-btn" style="background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">✕</button>
      `;
      disabilityContainer.appendChild(row);

      row.querySelector(".remove-disability-btn").addEventListener("click", () => row.remove());
    });
  }

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

  // 2. Postal Address Radio & Select Toggles
  document.querySelectorAll(".postal-radio-yes, .postal-radio-no").forEach(radio => {
    radio.addEventListener("change", (e) => {
      const triggerId = e.target.dataset.trigger;
      const selectEl = document.getElementById(triggerId);
      if (selectEl) {
        selectEl.value = e.target.value;
        selectEl.dispatchEvent(new Event("change"));
      }
    });
  });

  const setupPostalToggle = (triggerId, blockId) => {
    const trigger = document.getElementById(triggerId);
    const block = document.getElementById(blockId);
    if (trigger && block) {
      trigger.addEventListener("change", (e) => {
        block.style.display = e.target.value === "No" ? "grid" : "none";
      });
    }
  };
  setupPostalToggle("contactPostalTrigger", "contactPostalBlock");
  setupPostalToggle("guardianPostalTrigger", "guardianPostalBlock");

  // 3. Matric Standing Conditional Toggle (Currently in Grade 12 vs Completed Matric)
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
    });
  }

  // 4. Dynamic Grade 11 Subject Rows
  const addGrade11SubjectBtn = document.getElementById("addGrade11SubjectBtn");
  const grade11SubjectsBody = document.getElementById("grade11SubjectsBody");
  if (addGrade11SubjectBtn && grade11SubjectsBody) {
    addGrade11SubjectBtn.addEventListener("click", () => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f1f5f9";
      tr.innerHTML = `
        <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
      `;
      grade11SubjectsBody.appendChild(tr);
    });
  }

  // 5. Dynamic Grade 12 Subject Rows
  const addGrade12SubjectBtn = document.getElementById("addGrade12SubjectBtn");
  const grade12SubjectsBody = document.getElementById("grade12SubjectsBody");
  if (addGrade12SubjectBtn && grade12SubjectsBody) {
    addGrade12SubjectBtn.addEventListener("click", () => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f1f5f9";
      tr.innerHTML = `
        <td style="padding: 8px 14px;"><input type="text" placeholder="Subject Name" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px;"><input type="number" placeholder="%" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px;"><input type="text" placeholder="Level" style="width:100%; height:34px; border:1px solid #cbd5e1; border-radius:4px; padding:0 8px; font-size: 12px;" /></td>
        <td style="padding: 8px 14px; text-align: center;"><button type="button" class="remove-subject-row" style="background:#fff1f2; border:1px solid #fecdd3; color:#e11d48; border-radius:4px; padding:4px 8px; cursor:pointer;">✕</button></td>
      `;
      grade12SubjectsBody.appendChild(tr);
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-subject-row")) {
      const tr = e.target.closest("tr");
      const tbody = tr.parentNode;
      if (tbody && tbody.querySelectorAll("tr").length > 1) {
        tr.remove();
      } else if (tr) {
        tr.querySelectorAll("input").forEach(inp => inp.value = "");
      }
    }
  });

  // 6. Tertiary Institution Radio & Dynamic Cards
  document.querySelectorAll("#tertiaryTriggerYes, #tertiaryTriggerNo").forEach(radio => {
    radio.addEventListener("change", (e) => {
      const selectEl = document.getElementById("tertiaryTrigger");
      if (selectEl) {
        selectEl.value = e.target.value;
        selectEl.dispatchEvent(new Event("change"));
      }
    });
  });

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
      card.style.cssText = "background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative;";
      card.innerHTML = `
        <button type="button" class="remove-card-btn" style="position: absolute; top: 16px; right: 16px; background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 600;">Remove</button>
        <div style="grid-column: 1 / -1;">
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Institution Name</label>
          <input type="text" placeholder="University / College Name" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Qualification / Programme</label>
          <input type="text" placeholder="e.g. Diploma in IT" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Current / Final Status</label>
          <select class="control" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;">
            <option value="" disabled selected>Select option</option>
            <option value="Completed">Completed</option>
            <option value="Discontinued">Discontinued</option>
            <option value="Transferred">Transferred</option>
          </select>
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Started</label>
          <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Year Completed</label>
          <input type="number" placeholder="YYYY" style="width:100%; height:38px; border:1px solid #cbd5e1; border-radius:6px; padding:0 12px; background: #ffffff; font-size: 13px;" />
        </div>
      `;
      tertiaryContainer.appendChild(card);

      card.querySelector(".remove-card-btn").addEventListener("click", () => card.remove());
    });
  }

  // 7. Progressive Cascading Course Selection Filters (Using Unique Preview IDs)
  const cascadingWrapper = document.getElementById("previewCascadingWrapper");
  if (cascadingWrapper) {
    const validCourses = JSON.parse(cascadingWrapper.dataset.courses || "[]");

    const smSelect = document.getElementById("preview_filterStudyMode");
    const cpSelect = document.getElementById("preview_filterCampus");
    const crSelect = document.getElementById("preview_filterCourseDropdown");

    if (smSelect && cpSelect && crSelect) {
      const uniqueStudyModes = Array.from(new Set(validCourses.map(v => v.studyMode))).sort();

      smSelect.innerHTML = '<option value="" disabled selected>Select study mode</option>';
      uniqueStudyModes.forEach(sm => {
        const opt = document.createElement("option");
        opt.value = sm;
        opt.textContent = sm;
        smSelect.appendChild(opt);
      });

      smSelect.addEventListener("change", () => {
        const selectedSM = smSelect.value;

        cpSelect.innerHTML = '<option value="" disabled selected>Select campus</option>';
        cpSelect.disabled = false;
        crSelect.innerHTML = '<option value="" disabled selected>Select course</option>';
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

        crSelect.innerHTML = '<option value="" disabled selected>Select course</option>';
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
}

