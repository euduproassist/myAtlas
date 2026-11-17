import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* =====================================================
   1. AUTHENTICATION & DATABASE VERIFICATION
===================================================== */
const userMenuTrigger = document.getElementById("userMenuTrigger");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const userAvatar = document.getElementById("userAvatar");
const dropdownUserName = document.getElementById("dropdownUserName");
const dropdownUserEmail = document.getElementById("dropdownUserEmail");
const dropdownUserRole = document.getElementById("dropdownUserRole");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "admin-home.html";
    return;
  }

  try {
    const roleCollections = ["admissions_staff", "administrators", "technical_support"];
    let profileData = null;

    for (const collectionName of roleCollections) {
      const docRef = doc(db, collectionName, user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        profileData = docSnap.data();
        break;
      }
    }

    if (!profileData) {
      await signOut(auth);
      window.location.href = "admin-home.html";
      return;
    }

    const title = (profileData.title || "").trim();
    const surname = (profileData.surname || "").trim();
    const surnameInitial = surname ? surname.charAt(0).toUpperCase() : "A";
    const email = (profileData.email || user.email || "").trim();
    const rawRole = (profileData.role || "Staff").trim();
    const formattedRole = rawRole.replace(/_/g, " ");

    if (userAvatar) userAvatar.textContent = surnameInitial;
    if (dropdownUserName) dropdownUserName.textContent = title ? `${title} ${surname}` : surname;
    if (dropdownUserEmail) dropdownUserEmail.textContent = email;
    if (dropdownUserRole) dropdownUserRole.textContent = formattedRole;

  } catch (error) {
    console.error("Security verification error:", error);
    window.location.href = "admin-home.html";
  }
});

if (userMenuTrigger && userDropdownMenu) {
  userMenuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    userDropdownMenu.classList.toggle("active");
  });

  window.addEventListener("click", () => {
    if (userDropdownMenu.classList.contains("active")) {
      userDropdownMenu.classList.remove("active");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "admin-home.html";
    } catch (error) {
      console.error("Sign out error:", error);
    }
  });
}

/* =====================================================
   2. APPLICATION CYCLE BUILDER LOGIC (STEPS 1, 2 & 3)
===================================================== */
const mainWorkspace = document.getElementById('mainWorkspace');
const welcomeView = document.getElementById('welcomeView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const rightSidebar = document.getElementById('rightSidebar');

const builderStep1 = document.getElementById('builderStep1');
const builderStep2 = document.getElementById('builderStep2');
const builderStep3 = document.getElementById('builderStep3');

const navStep1 = document.getElementById('navStep1');
const navStep2 = document.getElementById('navStep2');
const navStep3 = document.getElementById('navStep3');

const qualificationSelect = document.getElementById('qualification');
const academicYearSelect = document.getElementById('academic-year');
const openingDateInput = document.getElementById('opening-date');
const closingDateInput = document.getElementById('closing-date');
const openingDateWrapper = document.getElementById('opening-date-wrapper');
const closingDateWrapper = document.getElementById('closing-date-wrapper');
const folderNameInput = document.getElementById('folder-name');
const cycleNameInput = document.getElementById('cycle-name');

const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const cancelCoursesBtn = document.getElementById('cancelCoursesBtn');

const nextStepBtn = document.getElementById('nextStepBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const toCoursesBtn = document.getElementById('toCoursesBtn');
const prevToFormBtn = document.getElementById('prevToFormBtn');
const toReviewBtn = document.getElementById('toReviewBtn');

const BASIC_INFO_STORAGE_KEY = 'myAtlas_basicInfo';
const FORM_FIELDS_STATE_KEY = 'myAtlas_formFieldsState';
const SELECTED_COURSES_STORAGE_KEY = 'myAtlas_selectedCourses';

function getTodayAndMaxDateStrings() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    todayStr: `${currentYear}-${month}-${day}`,
    maxStr: `${currentYear}-12-31`,
    currentYear
  };
}

function updateDatePlaceholderState(inputEl, wrapperEl) {
  if (!inputEl || !wrapperEl) return;
  if (inputEl.value) {
    wrapperEl.classList.remove('is-empty');
  } else {
    wrapperEl.classList.add('is-empty');
  }
}

function bindCalendarOnlyInput(inputEl, wrapperEl) {
  if (!inputEl || !wrapperEl) return;
  inputEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') e.preventDefault();
  });
  inputEl.addEventListener('paste', (e) => e.preventDefault());
  inputEl.addEventListener('drop', (e) => e.preventDefault());

  wrapperEl.addEventListener('click', () => {
    if (typeof inputEl.showPicker === 'function') {
      try { inputEl.showPicker(); } catch (err) { inputEl.focus(); }
    } else {
      inputEl.focus();
    }
  });
}

bindCalendarOnlyInput(openingDateInput, openingDateWrapper);
bindCalendarOnlyInput(closingDateInput, closingDateWrapper);

function setupDateConstraints() {
  if (!openingDateInput || !closingDateInput) return;
  const { todayStr, maxStr } = getTodayAndMaxDateStrings();
  openingDateInput.min = todayStr;
  openingDateInput.max = maxStr;
  closingDateInput.min = openingDateInput.value || todayStr;
  closingDateInput.max = maxStr;
  updateDatePlaceholderState(openingDateInput, openingDateWrapper);
  updateDatePlaceholderState(closingDateInput, closingDateWrapper);
}

function populateAcademicYears() {
  if (!academicYearSelect) return;
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  academicYearSelect.innerHTML = '<option value="" selected disabled>Select academic year</option>';
  [currentYear, nextYear].forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    academicYearSelect.appendChild(opt);
  });
}

async function fetchExistingCyclesForQualification(qualVal, yearVal) {
  if (!qualVal || !yearVal) return [];
  try {
    const qualSlug = qualVal.toLowerCase().replace(/\s+degree$/i, '').replace(/\s+/g, '_');
    const collectionName = `${yearVal}_${qualSlug}_admissions`;
    const snapshot = await getDocs(collection(db, collectionName));
    let cycles = [];
    snapshot.forEach(docSnap => {
      cycles.push({ id: docSnap.id, ...docSnap.data() });
    });
    return cycles;
  } catch (err) {
    console.error("Error fetching existing cycles:", err);
    return [];
  }
}

async function updateAutoNaming() {
  const currentCreationYear = new Date().getFullYear();
  if (folderNameInput) {
    folderNameInput.value = `${currentCreationYear} - Application Cycle`;
  }

  if (qualificationSelect && academicYearSelect && cycleNameInput) {
    const qual = qualificationSelect.value;
    const yr = academicYearSelect.value;
    if (qual && yr) {
      const categoryName = qual.replace(/\s+Degree$/i, '');
      const existingCycles = await fetchExistingCyclesForQualification(qual, yr);
      const cycleNumber = existingCycles.length + 1;
      cycleNameInput.value = `${categoryName} Applications ${yr}-Cycle ${cycleNumber}`;
    } else {
      cycleNameInput.value = '';
    }
  }
}

function saveBasicInfoToLocalStorage() {
  const data = {
    qualification: qualificationSelect.value,
    academicYear: academicYearSelect.value,
    openingDate: openingDateInput.value,
    closingDate: closingDateInput.value,
    folderName: folderNameInput.value,
    cycleName: cycleNameInput.value
  };
  localStorage.setItem(BASIC_INFO_STORAGE_KEY, JSON.stringify(data));
}

function loadBasicInfoFromLocalStorage() {
  const raw = localStorage.getItem(BASIC_INFO_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const { todayStr, maxStr } = getTodayAndMaxDateStrings();

    if (qualificationSelect) qualificationSelect.value = parsed.qualification || '';
    if (academicYearSelect) {
      populateAcademicYears();
      academicYearSelect.value = parsed.academicYear || '';
    }
    if (openingDateInput) {
      const savedOpen = parsed.openingDate || '';
      openingDateInput.value = (savedOpen >= todayStr && savedOpen <= maxStr) ? savedOpen : '';
      if (openingDateInput.value) {
        closingDateInput.min = openingDateInput.value;
      }
      updateDatePlaceholderState(openingDateInput, openingDateWrapper);
    }
    if (closingDateInput) {
      const savedClose = parsed.closingDate || '';
      const minClose = openingDateInput.value || todayStr;
      closingDateInput.value = (savedClose > minClose && savedClose <= maxStr) ? savedClose : '';
      updateDatePlaceholderState(closingDateInput, closingDateWrapper);
    }
    updateAutoNaming();
  } catch (err) {
    console.error("Error loading local storage data:", err);
  }
}

async function validateBasicInfoFields() {
  const qual = qualificationSelect.value;
  const yr = academicYearSelect.value;
  const opening = openingDateInput.value;
  const closing = closingDateInput.value;
  const { todayStr, maxStr, currentYear } = getTodayAndMaxDateStrings();

  if (!qual || !yr || !opening || !closing) {
    alert("Please fill in all required fields in Basic Info before proceeding.");
    return false;
  }

  if (opening < todayStr || opening > maxStr || closing < todayStr || closing > maxStr) {
    alert(`Opening and closing dates must be between today (${todayStr}) and ${currentYear}-12-31.`);
    return false;
  }

  const openDateObj = new Date(opening);
  const closeDateObj = new Date(closing);

  if (closeDateObj <= openDateObj) {
    alert("The closing date must be strictly after the opening date.");
    return false;
  }

  const existingCycles = await fetchExistingCyclesForQualification(qual, yr);
  if (existingCycles.length > 0) {
    let latestClosingDate = null;
    existingCycles.forEach(c => {
      if (c.closingDate) {
        const cDate = new Date(c.closingDate);
        if (!latestClosingDate || cDate > latestClosingDate) {
          latestClosingDate = cDate;
        }
      }
    });

    if (latestClosingDate && openDateObj <= latestClosingDate) {
      const formattedLatest = latestClosingDate.toISOString().split('T')[0];
      alert(`Overlap Error: For ${qual} (${yr}), the opening date (${opening}) must be strictly after the closing date of the previous cycle (${formattedLatest}).`);
      return false;
    }
  }

  return true;
}

/* =====================================================
   3. STEP 2 FORM FIELDS STATE & FIRESTORE INTEGRATION
===================================================== */
function getFormFieldsState() {
  try {
    return JSON.parse(localStorage.getItem(FORM_FIELDS_STATE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveFormFieldState(fieldId, isSelected, requirement) {
  const state = getFormFieldsState();
  state[fieldId] = { isSelected, requirement };
  localStorage.setItem(FORM_FIELDS_STATE_KEY, JSON.stringify(state));
}

async function loadTableFieldsFromFirestore(sectionName, tbodyId, checkboxClass, countBadgeId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];
    const savedState = getFormFieldsState();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (sectionName === "personal") {
        if (["contact", "guardian", "education_courses", "additional_info", "documents"].includes(data.section)) return;
      } else {
        if (data.section !== sectionName) return;
      }

      let isSelected = data.isSelected !== undefined ? data.isSelected : true;
      let requirement = data.requirement || 'Required';
      if (savedState[docSnap.id]) {
        isSelected = savedState[docSnap.id].isSelected;
        requirement = savedState[docSnap.id].requirement;
      }

      fields.push({ id: docSnap.id, ...data, isSelected, requirement });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No fields found in database.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      tr.dataset.fieldId = field.id;
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `<span class="behaviour conditional">Conditional</span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check ${checkboxClass}" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName || ''}</td>
        <td>
          <select class="requirement-select" aria-label="${field.fieldName} requirement">
            <option ${reqSelected}>Required</option>
            <option ${optSelected}>Optional</option>
          </select>
        </td>
        <td>${behaviourHtml}</td>
      `;
      tbody.appendChild(tr);
    });

    updateTableSelectedCount(checkboxClass, countBadgeId);
  } catch (err) {
    console.error(`Error loading fields for ${sectionName}:`, err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:red;">Failed to load fields.</td></tr>';
  }
}

function updateTableSelectedCount(checkboxClass, badgeId) {
  const checkboxes = document.querySelectorAll(`.${checkboxClass}`);
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById(badgeId);
  if (badge) badge.textContent = `${count} selected`;
}

function loadAllFormTables() {
  loadTableFieldsFromFirestore("personal", "formFieldsTableBody", "field-checkbox", "selectedCountBadge");
  loadTableFieldsFromFirestore("contact", "contactFieldsTableBody", "contact-field-checkbox", "contactSelectedCountBadge");
  loadTableFieldsFromFirestore("guardian", "guardianFieldsTableBody", "guardian-field-checkbox", "guardianSelectedCountBadge");
  loadTableFieldsFromFirestore("education_courses", "educCoursesFieldsTableBody", "educ-courses-field-checkbox", "educCoursesSelectedCountBadge");
  loadTableFieldsFromFirestore("additional_info", "additionalInfoFieldsTableBody", "additional-info-field-checkbox", "additionalInfoSelectedCountBadge");
  loadTableFieldsFromFirestore("documents", "documentsFieldsTableBody", "documents-field-checkbox", "documentsSelectedCountBadge");
}

function setupSelectAllHandler(selectAllCheckboxId, rowCheckboxClass, badgeId) {
  const selectAllCb = document.getElementById(selectAllCheckboxId);
  if (!selectAllCb) return;

  selectAllCb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll(`.${rowCheckboxClass}`);
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const tr = cb.closest('tr');
      if (tr && tr.dataset.fieldId) {
        const reqSelect = tr.querySelector('.requirement-select');
        saveFormFieldState(tr.dataset.fieldId, isChecked, reqSelect ? reqSelect.value : 'Required');
      }
    });
    updateTableSelectedCount(rowCheckboxClass, badgeId);
  });
}

setupSelectAllHandler('selectAllCheck', 'field-checkbox', 'selectedCountBadge');
setupSelectAllHandler('selectContactAllCheck', 'contact-field-checkbox', 'contactSelectedCountBadge');
setupSelectAllHandler('selectGuardianAllCheck', 'guardian-field-checkbox', 'guardianSelectedCountBadge');
setupSelectAllHandler('selectEducCoursesAllCheck', 'educ-courses-field-checkbox', 'educCoursesSelectedCountBadge');
setupSelectAllHandler('selectAdditionalInfoAllCheck', 'additional-info-field-checkbox', 'additionalInfoSelectedCountBadge');
setupSelectAllHandler('selectDocumentsAllCheck', 'documents-field-checkbox', 'documentsSelectedCountBadge');

/* =====================================================
   4. STEP 3 COURSES INTEGRATION & FILTERING LOGIC
===================================================== */
let cachedMasterCourses = [];

function getSelectedCoursesState() {
  try {
    return JSON.parse(localStorage.getItem(SELECTED_COURSES_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveSelectedCoursesState(selectedIds) {
  localStorage.setItem(SELECTED_COURSES_STORAGE_KEY, JSON.stringify(selectedIds));
}

function getQualificationFilteredCourses(allCourses) {
  const basicInfo = JSON.parse(localStorage.getItem(BASIC_INFO_STORAGE_KEY) || '{}');
  const qualVal = (basicInfo.qualification || '').trim().toLowerCase();

  if (!qualVal) return allCourses;

  return allCourses.filter(course => {
    const name = (course.courseName || course.name || '').toLowerCase();
    if (qualVal.includes('undergraduate')) {
      return name.startsWith('higher certificate') || name.startsWith('diploma') || name.startsWith('bachelor');
    } else if (qualVal.includes('postgraduate')) {
      return name.startsWith('postgraduate') || name.includes('honours') || name.includes('master') || name.includes('post-graduate');
    } else if (qualVal.includes('research')) {
      return name.includes('master') || name.includes('phd') || name.includes('doctorate') || name.includes('research');
    }
    return true;
  });
}

async function loadMasterCoursesForStep3() {
  const tbody = document.getElementById('masterCoursesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading master courses from database...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "master_courses"));
    cachedMasterCourses = [];
    querySnapshot.forEach((docSnap) => {
      cachedMasterCourses.push({ id: docSnap.id, ...docSnap.data() });
    });

    populateStep3FilterDropdowns(cachedMasterCourses);
    renderFilteredMasterCourses();
  } catch (err) {
    console.error("Error loading master_courses:", err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Failed to load courses from master records.</td></tr>';
  }
}

function populateStep3FilterDropdowns(courses) {
  const filterCourse = document.getElementById('filterCourse');
  const filterStudyMode = document.getElementById('filterStudyMode');
  const filterCampus = document.getElementById('filterCampus');

  if (!filterCourse || !filterStudyMode || !filterCampus) return;

  const qualFiltered = getQualificationFilteredCourses(courses);

  const courseNames = [...new Set(qualFiltered.map(c => c.courseName || c.name || ''))].filter(Boolean).sort();
  const studyModes = [...new Set(qualFiltered.map(c => c.studyMode || c.mode || ''))].filter(Boolean).sort();
  const campuses = [...new Set(qualFiltered.map(c => c.campus || ''))].filter(Boolean).sort();

  filterCourse.innerHTML = '<option value="">All Courses</option>';
  courseNames.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    filterCourse.appendChild(opt);
  });

  filterStudyMode.innerHTML = '<option value="">All Study Modes</option>';
  studyModes.forEach(mode => {
    const opt = document.createElement('option');
    opt.value = mode;
    opt.textContent = mode;
    filterStudyMode.appendChild(opt);
  });

  filterCampus.innerHTML = '<option value="">All Campuses</option>';
  campuses.forEach(campus => {
    const opt = document.createElement('option');
    opt.value = campus;
    opt.textContent = campus;
    filterCampus.appendChild(opt);
  });
}

function renderFilteredMasterCourses() {
  const tbody = document.getElementById('masterCoursesTableBody');
  if (!tbody) return;

  const filterCourseVal = (document.getElementById('filterCourse')?.value || '').trim().toLowerCase();
  const filterStudyModeVal = (document.getElementById('filterStudyMode')?.value || '').trim().toLowerCase();
  const filterCampusVal = (document.getElementById('filterCampus')?.value || '').trim().toLowerCase();
  const searchQuery = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

  const qualFiltered = getQualificationFilteredCourses(cachedMasterCourses);

  const filtered = qualFiltered.filter(c => {
    const name = (c.courseName || c.name || '').toLowerCase();
    const mode = (c.studyMode || c.mode || '').toLowerCase();
    const campus = (c.campus || '').toLowerCase();
    const year = String(c.academicYear || c.year || '').toLowerCase();

    if (filterCourseVal && name !== filterCourseVal) return false;
    if (filterStudyModeVal && mode !== filterStudyModeVal) return false;
    if (filterCampusVal && campus !== filterCampusVal) return false;

    if (searchQuery) {
      const matchText = `${name} ${mode} ${campus} ${year}`;
      if (!matchText.includes(searchQuery)) return false;
    }

    return true;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#7897c5;">No courses match the selected filters.</td></tr>';
    updateCoursesSelectedCountBadge();
    updateSelectAllCoursesCheckboxState();
    return;
  }

  const selectedCourses = getSelectedCoursesState();

  filtered.forEach(course => {
    const tr = document.createElement('tr');
    tr.dataset.courseId = course.id;
    const isChecked = selectedCourses.includes(course.id) ? 'checked' : '';

    const courseName = course.courseName || course.name || 'Unnamed Course';
    const studyMode = course.studyMode || course.mode || 'Full-time';
    const campus = course.campus || 'Main Campus';
    const academicYear = course.academicYear || course.year || '2026';

    tr.innerHTML = `
      <td style="padding-left: 21px;">
        <input type="checkbox" class="check course-row-checkbox" ${isChecked} aria-label="Select ${courseName}">
      </td>
      <td><strong>${courseName}</strong></td>
      <td>${studyMode}</td>
      <td>${campus}</td>
      <td>${academicYear}</td>
    `;
    tbody.appendChild(tr);
  });

  updateCoursesSelectedCountBadge();
  updateSelectAllCoursesCheckboxState();
}

function updateCoursesSelectedCountBadge() {
  const badge = document.getElementById('coursesSelectedCountBadge');
  if (!badge) return;
  const selectedCourses = getSelectedCoursesState();
  badge.textContent = `${selectedCourses.length} selected`;
}

function updateSelectAllCoursesCheckboxState() {
  const selectAllCb = document.getElementById('selectAllCoursesCheck');
  if (!selectAllCb) return;

  const rowCheckboxes = document.querySelectorAll('.course-row-checkbox');
  if (rowCheckboxes.length === 0) {
    selectAllCb.checked = false;
    selectAllCb.indeterminate = false;
    return;
  }

  let allChecked = true;
  let anyChecked = false;
  rowCheckboxes.forEach(cb => {
    if (cb.checked) {
      anyChecked = true;
    } else {
      allChecked = false;
    }
  });

  selectAllCb.checked = allChecked;
  selectAllCb.indeterminate = anyChecked && !allChecked;
}

const selectAllCoursesCheck = document.getElementById('selectAllCoursesCheck');
if (selectAllCoursesCheck) {
  selectAllCoursesCheck.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const rowCheckboxes = document.querySelectorAll('.course-row-checkbox');
    let selectedCourses = getSelectedCoursesState();

    rowCheckboxes.forEach(cb => {
      cb.checked = isChecked;
      const tr = cb.closest('tr');
      if (tr && tr.dataset.courseId) {
        const courseId = tr.dataset.courseId;
        if (isChecked) {
          if (!selectedCourses.includes(courseId)) selectedCourses.push(courseId);
        } else {
          selectedCourses = selectedCourses.filter(id => id !== courseId);
        }
      }
    });

    saveSelectedCoursesState(selectedCourses);
    updateCoursesSelectedCountBadge();
  });
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('course-row-checkbox')) {
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.courseId) return;
    const courseId = tr.dataset.courseId;
    let selectedCourses = getSelectedCoursesState();

    if (e.target.checked) {
      if (!selectedCourses.includes(courseId)) selectedCourses.push(courseId);
    } else {
      selectedCourses = selectedCourses.filter(id => id !== courseId);
    }

    saveSelectedCoursesState(selectedCourses);
    updateCoursesSelectedCountBadge();
    updateSelectAllCoursesCheckboxState();
  }
});

['filterCourse', 'filterStudyMode', 'filterCampus'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', renderFilteredMasterCourses);
  }
});

const filterSearch = document.getElementById('filterSearch');
if (filterSearch) {
  filterSearch.addEventListener('input', renderFilteredMasterCourses);
}

/* =====================================================
   5. NAVIGATION & VIEW SWITCHING (STEPS 1, 2, 3)
===================================================== */
function showBuilderStep(stepNum) {
  if (builderStep1) builderStep1.style.display = (stepNum === 1) ? 'block' : 'none';
  if (builderStep2) builderStep2.style.display = (stepNum === 2) ? 'block' : 'none';
  if (builderStep3) builderStep3.style.display = (stepNum === 3) ? 'block' : 'none';

  if (navStep1) {
    navStep1.classList.toggle('active', stepNum === 1);
    navStep1.classList.toggle('completed', stepNum > 1);
  }
  if (navStep2) {
    navStep2.classList.toggle('active', stepNum === 2);
    navStep2.classList.toggle('completed', stepNum > 2);
  }
  if (navStep3) {
    navStep3.classList.toggle('active', stepNum === 3);
    navStep3.classList.toggle('completed', stepNum > 3);
    navStep3.style.opacity = '1';
  }

  if (stepNum === 1) {
    const sub = document.getElementById('builderMainSub');
    if (sub) sub.textContent = "Set up the basic information for your application cycle. You can complete the other sections later.";
  } else if (stepNum === 2) {
    loadAllFormTables();
    const sub = document.getElementById('builderMainSub');
    if (sub) sub.textContent = "Select the information applicants must provide when completing their applications.";
  } else if (stepNum === 3) {
    const basicInfo = JSON.parse(localStorage.getItem(BASIC_INFO_STORAGE_KEY) || '{}');
    const headingEl = document.getElementById('coursesDynamicHeading');
    if (headingEl) {
      headingEl.textContent = basicInfo.qualification ? `${basicInfo.qualification} Courses` : "Courses";
    }
    const sub = document.getElementById('builderMainSub');
    if (sub) sub.textContent = "Select the courses available for this application cycle from master records.";
    loadMasterCoursesForStep3();
  }
}

function openCycleBuilder(e) {
  if (e) e.preventDefault();
  setupDateConstraints();
  populateAcademicYears();
  loadBasicInfoFromLocalStorage();
  if (welcomeView) welcomeView.style.display = 'none';
  if (rightSidebar) rightSidebar.style.display = 'none';
  if (mainWorkspace) mainWorkspace.classList.add('builder-active');
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  showBuilderStep(1);
  updateAutoNaming();
}

function closeCycleBuilderAndReset(e) {
  if (e) e.preventDefault();
  localStorage.removeItem(BASIC_INFO_STORAGE_KEY);
  localStorage.removeItem(FORM_FIELDS_STATE_KEY);
  localStorage.removeItem(SELECTED_COURSES_STORAGE_KEY);

  if (qualificationSelect) qualificationSelect.value = '';
  if (academicYearSelect) { populateAcademicYears(); academicYearSelect.value = ''; }
  if (openingDateInput) {
    openingDateInput.value = '';
    updateDatePlaceholderState(openingDateInput, openingDateWrapper);
  }
  if (closingDateInput) {
    closingDateInput.value = '';
    updateDatePlaceholderState(closingDateInput, closingDateWrapper);
  }
  if (folderNameInput) folderNameInput.value = '';
  if (cycleNameInput) cycleNameInput.value = '';

  if (cycleBuilderView) cycleBuilderView.style.display = 'none';
  if (mainWorkspace) mainWorkspace.classList.remove('builder-active');
  if (rightSidebar) rightSidebar.style.display = 'block';
  if (welcomeView) welcomeView.style.display = 'flex';
}

document.querySelectorAll('.create-cycle-trigger').forEach(btn => {
  btn.addEventListener('click', openCycleBuilder);
});

if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', closeCycleBuilderAndReset);
if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeCycleBuilderAndReset);
if (cancelCoursesBtn) cancelCoursesBtn.addEventListener('click', closeCycleBuilderAndReset);

if (nextStepBtn) {
  nextStepBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await validateBasicInfoFields()) {
      saveBasicInfoToLocalStorage();
      showBuilderStep(2);
    }
  });
}

if (prevStepBtn) {
  prevStepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilderStep(1);
  });
}

if (toCoursesBtn) {
  toCoursesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilderStep(3);
  });
}

if (prevToFormBtn) {
  prevToFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilderStep(2);
  });
}

if (toReviewBtn) {
  toReviewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const selectedCourses = getSelectedCoursesState();
    if (selectedCourses.length === 0) {
      alert("Please select at least one course before proceeding to Step 4.");
      return;
    }
    alert("Step 3 courses saved successfully! Step 4 (Review & Publish) is coming up next.");
  });
}

// Form field change listeners
document.addEventListener('change', (e) => {
  const tr = e.target.closest('tr');
  if (!tr || !tr.dataset.fieldId) return;

  const cb = tr.querySelector('input[type="checkbox"]');
  const reqSelect = tr.querySelector('.requirement-select');
  if (cb && reqSelect) {
    saveFormFieldState(tr.dataset.fieldId, cb.checked, reqSelect.value);
  }

  if (e.target.classList.contains('field-checkbox')) {
    updateTableSelectedCount('field-checkbox', 'selectedCountBadge');
  } else if (e.target.classList.contains('contact-field-checkbox')) {
    updateTableSelectedCount('contact-field-checkbox', 'contactSelectedCountBadge');
  } else if (e.target.classList.contains('guardian-field-checkbox')) {
    updateTableSelectedCount('guardian-field-checkbox', 'guardianSelectedCountBadge');
  } else if (e.target.classList.contains('educ-courses-field-checkbox')) {
    updateTableSelectedCount('educ-courses-field-checkbox', 'educCoursesSelectedCountBadge');
  } else if (e.target.classList.contains('additional-info-field-checkbox')) {
    updateTableSelectedCount('additional-info-field-checkbox', 'additionalInfoSelectedCountBadge');
  } else if (e.target.classList.contains('documents-field-checkbox')) {
    updateTableSelectedCount('documents-field-checkbox', 'documentsSelectedCountBadge');
  }
});

// Basic info change listeners
if (qualificationSelect) {
  qualificationSelect.addEventListener('change', async () => {
    await updateAutoNaming();
    saveBasicInfoToLocalStorage();
  });
}
if (academicYearSelect) {
  academicYearSelect.addEventListener('change', async () => {
    await updateAutoNaming();
    saveBasicInfoToLocalStorage();
  });
}
if (openingDateInput) {
  openingDateInput.addEventListener('change', () => {
    updateDatePlaceholderState(openingDateInput, openingDateWrapper);
    const openVal = openingDateInput.value;
    if (openVal) {
      closingDateInput.min = openVal;
      if (closingDateInput.value && closingDateInput.value <= openVal) {
        closingDateInput.value = '';
        updateDatePlaceholderState(closingDateInput, closingDateWrapper);
      }
    }
    saveBasicInfoToLocalStorage();
  });
}
if (closingDateInput) {
  closingDateInput.addEventListener('change', () => {
    updateDatePlaceholderState(closingDateInput, closingDateWrapper);
    saveBasicInfoToLocalStorage();
  });
}
