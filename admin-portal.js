import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { renderStep4ApplicationPreview } from "./form-template.js";

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

let resolveAuthReady;
let authReadySettled = false;
const authReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

function settleAuthReady(verifiedUser) {
  if (!authReadySettled) {
    authReadySettled = true;
    resolveAuthReady(verifiedUser);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    settleAuthReady(null);
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
      settleAuthReady(null);
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

    settleAuthReady(user);

  } catch (error) {
    console.error("Security verification error:", error);
    settleAuthReady(null);
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
   2. APPLICATION CYCLE BUILDER LOGIC (STEPS 1 to 4)
===================================================== */
const mainWorkspace = document.getElementById('mainWorkspace');
const welcomeView = document.getElementById('welcomeView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const rightSidebar = document.getElementById('rightSidebar');

const builderStep1 = document.getElementById('builderStep1');
const builderStep2 = document.getElementById('builderStep2');
const builderStep3 = document.getElementById('builderStep3');
const builderStep4 = document.getElementById('builderStep4');

const navStep1 = document.getElementById('navStep1');
const navStep2 = document.getElementById('navStep2');
const navStep3 = document.getElementById('navStep3');
const navStep4 = document.getElementById('navStep4');

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
const cancelReviewBtn = document.getElementById('cancelReviewBtn');

const nextStepBtn = document.getElementById('nextStepBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const toCoursesBtn = document.getElementById('toCoursesBtn');
const prevToFormBtn = document.getElementById('prevToFormBtn');
const toReviewBtn = document.getElementById('toReviewBtn');
const prevToCoursesBtn = document.getElementById('prevToCoursesBtn');
const publishCycleBtn = document.getElementById('publishCycleBtn');

// Courses step specific elements
const coursesDynamicHeading = document.getElementById('coursesDynamicHeading');
const masterCoursesTableBody = document.getElementById('masterCoursesTableBody');
const filterCourse = document.getElementById('filterCourse');
const filterStudyMode = document.getElementById('filterStudyMode');
const filterCampus = document.getElementById('filterCampus');
const filterSearch = document.getElementById('filterSearch');
const coursesSelectedCountBadge = document.getElementById('coursesSelectedCountBadge');
const selectAllCoursesCheck = document.getElementById('selectAllCoursesCheck');

const BASIC_INFO_STORAGE_KEY = 'myAtlas_basicInfo';
const FORM_FIELDS_STATE_KEY = 'myAtlas_formFieldsState';

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

function getFolderCollectionName(folderNameValue) {
  const currentCreationYear = new Date().getFullYear();
  const rawFolder = (folderNameValue || `${currentCreationYear} - Application Cycle`).trim();
  const slug = rawFolder
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `${currentCreationYear}_application_cycle`;
}

function buildCycleNaming(qualVal, yearVal, cycleNumber) {
  const categoryName = qualVal.replace(/\s+Degree$/i, '').trim();
  const cycleName = `${categoryName} Applications ${yearVal}-Cycle ${cycleNumber}`;
  const docId = cycleName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return { cycleName, docId };
}

async function fetchExistingCyclesForQualification(qualVal, yearVal, folderNameValue = '') {
  if (!qualVal || !yearVal) return [];
  const verifiedUser = await authReadyPromise;
  if (!verifiedUser) return [];

  try {
    const collectionName = getFolderCollectionName(folderNameValue || (folderNameInput ? folderNameInput.value : ''));
    const snapshot = await getDocs(collection(db, collectionName));
    const qualNormalized = qualVal.trim().toLowerCase();
    const yearStr = String(yearVal).trim();

    let cycles = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const sameQual = (data.qualificationType || '').trim().toLowerCase() === qualNormalized;
      const sameYear = String(data.academicYear || '').trim() === yearStr;
      if (sameQual && sameYear) {
        cycles.push({ id: docSnap.id, ...data });
      }
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
      const existingCycles = await fetchExistingCyclesForQualification(qual, yr, folderNameInput ? folderNameInput.value : '');
      const cycleNumber = existingCycles.length + 1;
      const { cycleName } = buildCycleNaming(qual, yr, cycleNumber);
      cycleNameInput.value = cycleName;
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

async function loadBasicInfoFromLocalStorage() {
  const raw = localStorage.getItem(BASIC_INFO_STORAGE_KEY);
  if (!raw) {
    await updateAutoNaming();
    return;
  }
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
    await updateAutoNaming();
  } catch (err) {
    console.error("Error loading local storage data:", err);
  }
}

function resetStep2UiDefaults() {
  const selectAllIds = [
    'selectAllCheck',
    'selectContactAllCheck',
    'selectGuardianAllCheck',
    'selectEducCoursesAllCheck',
    'selectAdditionalInfoAllCheck',
    'selectDocumentsAllCheck'
  ];
  selectAllIds.forEach((id) => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = false;
  });

  const badgeIds = [
    'selectedCountBadge',
    'contactSelectedCountBadge',
    'guardianSelectedCountBadge',
    'educCoursesSelectedCountBadge',
    'additionalInfoSelectedCountBadge',
    'documentsSelectedCountBadge'
  ];
  badgeIds.forEach((id) => {
    const badge = document.getElementById(id);
    if (badge) badge.textContent = '0 selected';
  });
}

function resetStep3UiDefaults() {
  masterCoursesCache = [];
  if (filterCourse) filterCourse.innerHTML = '<option value="">All Courses</option>';
  if (filterStudyMode) filterStudyMode.innerHTML = '<option value="">All Study Modes</option>';
  if (filterCampus) filterCampus.innerHTML = '<option value="">All Campuses</option>';
  if (filterSearch) filterSearch.value = '';
  if (selectAllCoursesCheck) selectAllCoursesCheck.checked = false;
  if (coursesSelectedCountBadge) coursesSelectedCountBadge.textContent = '0 selected';
  if (masterCoursesTableBody) masterCoursesTableBody.innerHTML = '';
}

async function handleQualificationTypeChange() {
  localStorage.removeItem(FORM_FIELDS_STATE_KEY);
  localStorage.removeItem('myAtlas_selectedCourses');

  if (academicYearSelect) {
    populateAcademicYears();
    academicYearSelect.value = '';
  }

  const { todayStr, maxStr } = getTodayAndMaxDateStrings();
  if (openingDateInput) {
    openingDateInput.value = '';
    openingDateInput.min = todayStr;
    openingDateInput.max = maxStr;
    updateDatePlaceholderState(openingDateInput, openingDateWrapper);
  }
  if (closingDateInput) {
    closingDateInput.value = '';
    closingDateInput.min = todayStr;
    closingDateInput.max = maxStr;
    updateDatePlaceholderState(closingDateInput, closingDateWrapper);
  }
  if (cycleNameInput) {
    cycleNameInput.value = '';
  }

  resetStep2UiDefaults();
  resetStep3UiDefaults();

  await updateAutoNaming();
  saveBasicInfoToLocalStorage();
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

  const existingCycles = await fetchExistingCyclesForQualification(qual, yr, folderNameInput ? folderNameInput.value : '');
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
   4. STEP 3 COURSES & FILTERING LOGIC
===================================================== */
let masterCoursesCache = [];

function getSelectedCoursesSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem('myAtlas_selectedCourses') || '[]'));
  } catch (e) {
    return new Set();
  }
}

function saveSelectedCoursesSet(setObj) {
  localStorage.setItem('myAtlas_selectedCourses', JSON.stringify(Array.from(setObj)));
}

function getQualificationFilteredCourses() {
  const qualVal = qualificationSelect ? qualificationSelect.value.trim() : '';
  if (!qualVal) return masterCoursesCache;

  return masterCoursesCache.filter(item => {
    const lowerCourseName = (item.course || '').trim().toLowerCase();
    if (qualVal === 'Undergraduate Degree') {
      return lowerCourseName.startsWith('higher certificate') ||
             lowerCourseName.startsWith('diploma') ||
             lowerCourseName.startsWith('bachelor');
    } else if (qualVal === 'Postgraduate Degree') {
      return lowerCourseName.startsWith('postgraduate');
    } else if (qualVal === 'Research Degree') {
      return lowerCourseName.startsWith('masters') ||
             lowerCourseName.startsWith('phd') ||
             lowerCourseName.startsWith('doctorate');
    }
    return true;
  });
}

async function loadMasterCoursesFromFirestore() {
  if (!masterCoursesTableBody) return;
  masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading courses...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "master_courses"));
    let rawCourses = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.course) {
        rawCourses.push({
          id: docSnap.id,
          course: data.course || '',
          studyMode: data.studyMode || data.study_mode || '',
          campus: data.campus || '',
          academicYear: data.academicYear || data.academic_year || (academicYearSelect ? academicYearSelect.value : new Date().getFullYear())
        });
      }
    });

    const uniqueMap = new Map();
    rawCourses.forEach(item => {
      const key = `${item.course.trim().toLowerCase()}_${item.studyMode.trim().toLowerCase()}_${item.campus.trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    masterCoursesCache = Array.from(uniqueMap.values());
    populateCourseFilters(masterCoursesCache);
    renderFilteredMasterCourses();
  } catch (err) {
    console.error("Error loading master courses:", err);
    masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Failed to load master courses from database.</td></tr>';
  }
}

function populateCourseFilters(courses) {
  if (!filterCourse || !filterStudyMode || !filterCampus) return;

  const qualFiltered = getQualificationFilteredCourses();
  const coursesSet = new Set();
  const studyModesSet = new Set();
  const campusesSet = new Set();

  qualFiltered.forEach(c => {
    if (c.course) coursesSet.add(c.course);
    if (c.studyMode) studyModesSet.add(c.studyMode);
    if (c.campus) campusesSet.add(c.campus);
  });

  filterCourse.innerHTML = '<option value="">All Courses</option>';
  Array.from(coursesSet).sort().forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    filterCourse.appendChild(opt);
  });

  filterStudyMode.innerHTML = '<option value="">All Study Modes</option>';
  Array.from(studyModesSet).sort().forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    filterStudyMode.appendChild(opt);
  });

  filterCampus.innerHTML = '<option value="">All Campuses</option>';
  Array.from(campusesSet).sort().forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    filterCampus.appendChild(opt);
  });
}

function renderFilteredMasterCourses() {
  if (!masterCoursesTableBody) return;

  const selectedCourseFilter = filterCourse ? filterCourse.value.toLowerCase() : '';
  const selectedStudyModeFilter = filterStudyMode ? filterStudyMode.value.toLowerCase() : '';
  const selectedCampusFilter = filterCampus ? filterCampus.value.toLowerCase() : '';
  const searchQuery = filterSearch ? filterSearch.value.toLowerCase().trim() : '';
  const chosenYear = academicYearSelect && academicYearSelect.value ? academicYearSelect.value : new Date().getFullYear();
  const savedCoursesSet = getSelectedCoursesSet();

  const qualFiltered = getQualificationFilteredCourses();

  const filtered = qualFiltered.filter(item => {
    const matchCourse = !selectedCourseFilter || item.course.toLowerCase() === selectedCourseFilter;
    const matchStudyMode = !selectedStudyModeFilter || item.studyMode.toLowerCase() === selectedStudyModeFilter;
    const matchCampus = !selectedCampusFilter || item.campus.toLowerCase() === selectedCampusFilter;
    const matchSearch = !searchQuery || 
      item.course.toLowerCase().includes(searchQuery) ||
      item.studyMode.toLowerCase().includes(searchQuery) ||
      item.campus.toLowerCase().includes(searchQuery);

    return matchCourse && matchStudyMode && matchCampus && matchSearch;
  });

  masterCoursesTableBody.innerHTML = '';
  if (filtered.length === 0) {
    masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No matching courses found.</td></tr>';
    updateCoursesSelectedCount();
    return;
  }

  filtered.forEach((item) => {
    const tr = document.createElement('tr');
    const uniqueKey = `${item.course}_${item.studyMode}_${item.campus}`;
    tr.dataset.courseKey = uniqueKey;
    const isChecked = savedCoursesSet.has(uniqueKey) ? 'checked' : '';

    tr.innerHTML = `
      <td style="padding-left: 21px;"><input type="checkbox" class="check course-row-checkbox" ${isChecked} aria-label="Select ${item.course}"></td>
      <td>${item.course}</td>
      <td><span class="behaviour">${item.studyMode || 'Full-time'}</span></td>
      <td>${item.campus || 'Main Campus'}</td>
      <td>${chosenYear}</td>
    `;
    masterCoursesTableBody.appendChild(tr);
  });

  updateCoursesSelectedCount();
}

function updateCoursesSelectedCount() {
  const checkboxes = document.querySelectorAll('.course-row-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  if (coursesSelectedCountBadge) coursesSelectedCountBadge.textContent = `${count} selected`;
}

if (filterCourse) filterCourse.addEventListener('change', renderFilteredMasterCourses);
if (filterStudyMode) filterStudyMode.addEventListener('change', renderFilteredMasterCourses);
if (filterCampus) filterCampus.addEventListener('change', renderFilteredMasterCourses);
if (filterSearch) filterSearch.addEventListener('input', renderFilteredMasterCourses);

const selectAllCoursesCb = document.getElementById('selectAllCoursesCheck');
if (selectAllCoursesCb) {
  selectAllCoursesCb.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('.course-row-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const tr = cb.closest('tr');
      if (tr && tr.dataset.courseKey) {
        const setObj = getSelectedCoursesSet();
        if (isChecked) setObj.add(tr.dataset.courseKey);
        else setObj.delete(tr.dataset.courseKey);
        saveSelectedCoursesSet(setObj);
      }
    });
    updateCoursesSelectedCount();
  });
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('course-row-checkbox')) {
    updateCoursesSelectedCount();
    const tr = e.target.closest('tr');
    if (tr && tr.dataset.courseKey) {
      const setObj = getSelectedCoursesSet();
      if (e.target.checked) setObj.add(tr.dataset.courseKey);
      else setObj.delete(tr.dataset.courseKey);
      saveSelectedCoursesSet(setObj);
    }
  }
});

/* =====================================================
   5. NAVIGATION & VIEW SWITCHING (STEPS 1 to 4)
===================================================== */
function showBuilderStep(stepNum) {
  if (stepNum === 1) {
    if (builderStep1) builderStep1.style.display = 'block';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'none';
    if (builderStep4) builderStep4.style.display = 'none';
    if (navStep1) { navStep1.classList.add('active'); navStep1.classList.remove('completed'); }
    if (navStep2) { navStep2.classList.remove('active', 'completed'); }
    if (navStep3) { navStep3.classList.remove('active', 'completed'); }
    if (navStep4) { navStep4.classList.remove('active', 'completed'); }
  } else if (stepNum === 2) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'block';
    if (builderStep3) builderStep3.style.display = 'none';
    if (builderStep4) builderStep4.style.display = 'none';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.add('active'); navStep2.classList.remove('completed'); }
    if (navStep3) { navStep3.classList.remove('active', 'completed'); }
    if (navStep4) { navStep4.classList.remove('active', 'completed'); }
    loadAllFormTables();
  } else if (stepNum === 3) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'block';
    if (builderStep4) builderStep4.style.display = 'none';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.remove('active'); navStep2.classList.add('completed'); }
    if (navStep3) { navStep3.classList.add('active'); navStep3.classList.remove('completed'); }
    if (navStep4) { navStep4.classList.remove('active', 'completed'); }

    if (coursesDynamicHeading && qualificationSelect) {
      const qualVal = qualificationSelect.value;
      if (qualVal) {
        const baseName = qualVal.replace(/\s+Degree$/i, '');
        coursesDynamicHeading.textContent = `${baseName} Courses`;
      } else {
        coursesDynamicHeading.textContent = 'Courses';
      }
    }

    masterCoursesCache = [];
    requestAnimationFrame(() => {
      loadMasterCoursesFromFirestore();
    });
  } else if (stepNum === 4) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'none';
    if (builderStep4) builderStep4.style.display = 'block';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.remove('active'); navStep2.classList.add('completed'); }
    if (navStep3) { navStep3.classList.remove('active'); navStep3.classList.add('completed'); }
    if (navStep4) { navStep4.classList.add('active'); navStep4.classList.remove('completed'); }

    renderStep4ApplicationPreview("builderStep4Preview");
  }
}

async function openCycleBuilder(e) {
  if (e) e.preventDefault();
  setupDateConstraints();
  populateAcademicYears();
  if (welcomeView) welcomeView.style.display = 'none';
  if (rightSidebar) rightSidebar.style.display = 'none';
  if (mainWorkspace) mainWorkspace.classList.add('builder-active');
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  showBuilderStep(1);
  await loadBasicInfoFromLocalStorage();
}

function closeCycleBuilderAndReset(e) {
  if (e) e.preventDefault();
  localStorage.removeItem(BASIC_INFO_STORAGE_KEY);
  localStorage.removeItem(FORM_FIELDS_STATE_KEY);
  localStorage.removeItem('myAtlas_selectedCourses');

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

  resetStep2UiDefaults();
  resetStep3UiDefaults();

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
if (cancelReviewBtn) cancelReviewBtn.addEventListener('click', closeCycleBuilderAndReset);

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
    showBuilderStep(4);
  });
}

if (prevToCoursesBtn) {
  prevToCoursesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showBuilderStep(3);
  });
}

/* =====================================================
   6. PUBLISH CYCLE ACTION (WRITES SNAPSHOT TO FIRESTORE)
===================================================== */
if (publishCycleBtn) {
  publishCycleBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const isValid = await validateBasicInfoFields();
    if (!isValid) {
      showBuilderStep(1);
      return;
    }

    const savedFieldsState = getFormFieldsState();
    const savedSelectedCourses = JSON.parse(localStorage.getItem('myAtlas_selectedCourses') || '[]');

    if (savedSelectedCourses.length === 0) {
      alert("Please select at least one course in Step 3 before publishing.");
      showBuilderStep(3);
      return;
    }

    publishCycleBtn.disabled = true;
    publishCycleBtn.textContent = "Publishing...";

    try {
      const qualVal = qualificationSelect.value.trim();
      const yearVal = academicYearSelect.value.trim();
      const folderVal = folderNameInput ? folderNameInput.value : '';

      const existingCycles = await fetchExistingCyclesForQualification(qualVal, yearVal, folderVal);
      const cycleNumber = existingCycles.length + 1;

      const collectionName = getFolderCollectionName(folderVal);
      const { cycleName: finalCycleName, docId: cycleId } = buildCycleNaming(qualVal, yearVal, cycleNumber);

      const querySnapshot = await getDocs(collection(db, "application_form_fields"));
      const formFieldsSnapshot = [];

      querySnapshot.forEach((docSnap) => {
        const fieldData = docSnap.data();
        const fieldId = docSnap.id;
        const userState = savedFieldsState[fieldId];
        const isSelected = userState ? userState.isSelected : (fieldData.isSelected !== undefined ? fieldData.isSelected : true);
        const requirement = userState ? userState.requirement : (fieldData.requirement || 'Required');

        if (isSelected) {
          formFieldsSnapshot.push({
            fieldId: fieldId,
            fieldName: fieldData.fieldName || '',
            section: fieldData.section || 'personal',
            requirement: requirement || 'Required',
            fieldBehaviour: fieldData.fieldBehaviour || 'Standard',
            order: fieldData.order || 0
          });
        }
      });

      formFieldsSnapshot.sort((a, b) => (a.order || 0) - (b.order || 0));

      const selectedCoursesSnapshot = savedSelectedCourses.map(key => {
        const parts = key.split("_");
        return {
          course: parts[0] || key,
          studyMode: parts[1] || 'Full-time',
          campus: parts[2] || 'Main Campus',
          academicYear: yearVal
        };
      });

      const cyclePayload = {
        cycleId: cycleId,
        folderName: folderVal,
        cycleName: finalCycleName,
        academicYear: yearVal,
        qualificationType: qualVal,
        status: "published",
        openingDate: openingDateInput.value,
        closingDate: closingDateInput.value,
        isManuallyClosed: false,
        publishedAt: serverTimestamp(),
        formFieldsSnapshot: formFieldsSnapshot,
        selectedCoursesSnapshot: selectedCoursesSnapshot
      };

      await setDoc(doc(db, collectionName, cycleId), cyclePayload);

      alert("Application cycle published successfully!");
      closeCycleBuilderAndReset();

    } catch (err) {
      console.error("Error publishing cycle:", err);
      alert("Failed to publish application cycle. Please check your connection and try again.");
    } finally {
      publishCycleBtn.disabled = false;
      publishCycleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        Publish Cycle
      `;
    }
  });
}

// Listeners for row changes in Step 2
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
    await handleQualificationTypeChange();
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
