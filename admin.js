import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.documentElement.style.overflowX = "hidden";
document.body.style.overflowX = "hidden";

// UI View Elements
const dashboardView = document.getElementById('dashboardView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const welcomeSidebar = document.getElementById('welcomeSidebar');
const mainShell = document.getElementById('mainShell');
const openModalBtn = document.getElementById('openModalBtn');
const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');

// Builder Step Sub-views & Navigation
const builderStep1 = document.getElementById('builderStep1');
const builderStep2 = document.getElementById('builderStep2');
const builderStep3 = document.getElementById('builderStep3');
const builderStep4 = document.getElementById('builderStep4');
const navStep1 = document.getElementById('navStep1');
const navStep2 = document.getElementById('navStep2');
const navStep3 = document.getElementById('navStep3');
const navStep4 = document.getElementById('navStep4');
const nextStepBtn = document.getElementById('nextStepBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const toCoursesBtn = document.getElementById('toCoursesBtn');
const prevToFormBtn = document.getElementById('prevToFormBtn');
const toReviewBtn = document.getElementById('toReviewBtn');
const cancelCoursesBtn = document.getElementById('cancelCoursesBtn');
const cancelReviewBtn = document.getElementById('cancelReviewBtn');
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

// Auto-naming Fields
const qualificationSelect = document.getElementById('qualification');
const academicYearSelect = document.getElementById('academic-year');
const openingDateInput = document.getElementById('opening-date');
const closingDateInput = document.getElementById('closing-date');
const folderNameInput = document.getElementById('folder-name');
const cycleNameInput = document.getElementById('cycle-name');

// Automatically populate Academic Year with Current Year and Next Year only
function populateAcademicYears() {
  if (!academicYearSelect) return;
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const years = [currentYear, nextYear];
  
  academicYearSelect.innerHTML = '<option value="" selected disabled>Select academic year</option>';
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    academicYearSelect.appendChild(opt);
  });
}

function updateAutoNaming() {
  const currentCreationYear = new Date().getFullYear();
  if (folderNameInput) {
    folderNameInput.value = `${currentCreationYear} - Application Cycle`;
  }

  if (qualificationSelect && academicYearSelect && cycleNameInput) {
    const qual = qualificationSelect.value;
    const yr = academicYearSelect.value;
    if (qual && yr) {
      const categoryName = qual.replace(/\s+Degree$/i, '');
      cycleNameInput.value = `${categoryName} Applications ${yr}`;
    } else {
      cycleNameInput.value = '';
    }
  }
}

// Local Storage Helper with 24-hour expiration check
const STORAGE_KEY = 'myAtlas_basicInfo';
const EXPIRY_HOURS = 24;

function saveBasicInfoToLocalStorage() {
  const data = {
    qualification: qualificationSelect.value,
    academicYear: academicYearSelect.value,
    openingDate: openingDateInput.value,
    closingDate: closingDateInput.value,
    folderName: folderNameInput.value,
    cycleName: cycleNameInput.value,
    timestamp: new Date().getTime()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadBasicInfoFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const now = new Date().getTime();
    const hoursElapsed = (now - parsed.timestamp) / (1000 * 60 * 60);
    
    if (hoursElapsed > EXPIRY_HOURS) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (qualificationSelect) qualificationSelect.value = parsed.qualification || '';
    if (academicYearSelect) {
      populateAcademicYears();
      academicYearSelect.value = parsed.academicYear || '';
    }
    if (openingDateInput) openingDateInput.value = parsed.openingDate || '';
    if (closingDateInput) closingDateInput.value = parsed.closingDate || '';
    updateAutoNaming();
  } catch (err) {
    console.error("Error loading local storage data:", err);
  }
}

function validateBasicInfoFields() {
  if (!qualificationSelect.value || !academicYearSelect.value || !openingDateInput.value || !closingDateInput.value) {
    alert("Please fill in all required fields in Basic Info before proceeding.");
    return false;
  }
  return true;
}

// Fetch personal form fields from Firestore and populate table with strict validation
async function loadFormFieldsFromFirestore() {
  const tbody = document.getElementById('formFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Filter out other sections
      if (data.section === "contact" || data.section === "guardian" || data.section === "education_courses" || data.section === "additional_info" || data.section === "documents") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

    updateSelectedCount();
  } catch (err) {
    console.error("Error loading application form fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

// Fetch contact fields from Firestore
async function loadContactFieldsFromFirestore() {
  const tbody = document.getElementById('contactFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.section !== "contact") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid contact fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check contact-field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

    updateContactSelectedCount();
  } catch (err) {
    console.error("Error loading application contact fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

// Fetch guardian fields from Firestore
async function loadGuardianFieldsFromFirestore() {
  const tbody = document.getElementById('guardianFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.section !== "guardian") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid guardian fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check guardian-field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

    updateGuardianSelectedCount();
  } catch (err) {
    console.error("Error loading application guardian fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

// Fetch educational background & course selection fields from Firestore
async function loadEducCoursesFieldsFromFirestore() {
  const tbody = document.getElementById('educCoursesFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.section !== "education_courses") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check educ-courses-field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

    updateEducCoursesSelectedCount();
  } catch (err) {
    console.error("Error loading educational background & course fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

// Fetch additional applicant info & declarations fields from Firestore
async function loadAdditionalInfoFieldsFromFirestore() {
  const tbody = document.getElementById('additionalInfoFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.section !== "additional_info") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check additional-info-field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

  updateAdditionalInfoSelectedCount();
  } catch (err) {
    console.error("Error loading additional info fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

// Fetch master courses from Firestore, remove duplicates permanently, and render table
let masterCoursesCache = [];

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

    // Permanently remove duplicates based on unique combination of course, studyMode, and campus
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

  const coursesSet = new Set();
  const studyModesSet = new Set();
  const campusesSet = new Set();

  courses.forEach(c => {
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

  const filtered = masterCoursesCache.filter(item => {
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
    tr.innerHTML = `
      <td style="padding-left: 21px;"><input type="checkbox" class="check course-row-checkbox" aria-label="Select ${item.course}"></td>
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

if (selectAllCoursesCheck) {
  selectAllCoursesCheck.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.course-row-checkbox');
    checkboxes.forEach(cb => { cb.checked = e.target.checked; });
    updateCoursesSelectedCount();
  });
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('course-row-checkbox')) {
    updateCoursesSelectedCount();
  }
});

// Fetch documents fields from Firestore
async function loadDocumentsFieldsFromFirestore() {
  const tbody = document.getElementById('documentsFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.section !== "documents") return;

      const hasAllFields = 
        data.fieldName !== undefined && data.fieldName !== null && data.fieldName !== '' &&
        data.requirement !== undefined && data.requirement !== null &&
        data.fieldBehaviour !== undefined && data.fieldBehaviour !== null &&
        data.isSelected !== undefined && data.isSelected !== null &&
        data.order !== undefined && data.order !== null;

      if (!hasAllFields) return;
      if (data.requirement !== "Required" && data.requirement !== "Optional") return;
      if (data.fieldBehaviour !== "Standard" && data.fieldBehaviour !== "Conditional") return;
      if (typeof data.isSelected !== "boolean") return;

      fields.push({ id: docSnap.id, ...data });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No valid fields found matching criteria in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      let behaviourHtml = `<span class="behaviour">Standard</span>`;
      if (field.fieldBehaviour === 'Conditional') {
        behaviourHtml = `
          <span class="behaviour-group">
            <span class="behaviour conditional">Conditional</span>
            <span class="behaviour-arrow" aria-hidden="true">⌄</span>
          </span>`;
      }

      tr.innerHTML = `
        <td><input type="checkbox" class="check documents-field-checkbox" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
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

    updateDocumentsSelectedCount();
  } catch (err) {
    console.error("Error loading document fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields from database.</td></tr>';
  }
}

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('selectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

function updateContactSelectedCount() {
  const checkboxes = document.querySelectorAll('.contact-field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('contactSelectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

function updateGuardianSelectedCount() {
  const checkboxes = document.querySelectorAll('.guardian-field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('guardianSelectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

function updateEducCoursesSelectedCount() {
  const checkboxes = document.querySelectorAll('.educ-courses-field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('educCoursesSelectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

function updateAdditionalInfoSelectedCount() {
  const checkboxes = document.querySelectorAll('.additional-info-field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('additionalInfoSelectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

function updateDocumentsSelectedCount() {
  const checkboxes = document.querySelectorAll('.documents-field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById('documentsSelectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('field-checkbox')) {
    updateSelectedCount();
  } else if (e.target.classList.contains('contact-field-checkbox')) {
    updateContactSelectedCount();
  } else if (e.target.classList.contains('guardian-field-checkbox')) {
    updateGuardianSelectedCount();
  } else if (e.target.classList.contains('educ-courses-field-checkbox')) {
    updateEducCoursesSelectedCount();
  } else if (e.target.classList.contains('additional-info-field-checkbox')) {
    updateAdditionalInfoSelectedCount();
  } else if (e.target.classList.contains('documents-field-checkbox')) {
    updateDocumentsSelectedCount();
  }
});

// View Navigation Handler
function showBuilderStep(stepNum) {
  if (stepNum === 1) {
    if (builderStep1) builderStep1.style.display = 'block';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'none';
    if (navStep1) { navStep1.classList.add('active'); navStep1.classList.remove('completed'); }
    if (navStep2) { navStep2.classList.remove('active', 'completed'); }
    if (navStep3) { navStep3.classList.remove('active', 'completed'); }
    window.location.hash = 'builder';
  } else if (stepNum === 2) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'block';
    if (builderStep3) builderStep3.style.display = 'none';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.add('active'); navStep2.classList.remove('completed'); }
    if (navStep3) { navStep3.classList.remove('active', 'completed'); }
    loadFormFieldsFromFirestore();
    loadContactFieldsFromFirestore();
    loadGuardianFieldsFromFirestore();
    loadEducCoursesFieldsFromFirestore();
    loadAdditionalInfoFieldsFromFirestore();
    loadDocumentsFieldsFromFirestore();
    window.location.hash = 'builder-form';
  } else if (stepNum === 3) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'block';
    if (builderStep4) builderStep4.style.display = 'none';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.remove('active'); navStep2.classList.add('completed'); }
    if (navStep3) { navStep3.classList.add('active'); navStep3.classList.remove('completed'); }
    if (navStep4) { navStep4.classList.remove('active', 'completed'); }

    // Dynamic Heading based on Qualification Type
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
    window.location.hash = 'builder-courses';
  } else if (stepNum === 4) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'none';
    if (builderStep3) builderStep3.style.display = 'none';
    if (builderStep4) builderStep4.style.display = 'block';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.remove('active'); navStep2.classList.add('completed'); }
    if (navStep3) { navStep3.classList.remove('active'); navStep3.classList.add('completed'); }
    if (navStep4) { navStep4.classList.add('active'); navStep4.classList.remove('completed'); }

    // Bind summary details from Step 1 inputs
    if (document.getElementById('reviewQualification')) document.getElementById('reviewQualification').textContent = qualificationSelect.value || '—';
    if (document.getElementById('reviewAcademicYear')) document.getElementById('reviewAcademicYear').textContent = academicYearSelect.value || '—';
    if (document.getElementById('reviewOpeningDate')) document.getElementById('reviewOpeningDate').textContent = openingDateInput.value || '—';
    if (document.getElementById('reviewClosingDate')) document.getElementById('reviewClosingDate').textContent = closingDateInput.value || '—';
    if (document.getElementById('reviewCycleName')) document.getElementById('reviewCycleName').textContent = cycleNameInput.value || '—';
    if (document.getElementById('reviewFolderName')) document.getElementById('reviewFolderName').textContent = folderNameInput.value || '—';

    // Count selected courses
    const selectedCoursesCount = document.querySelectorAll('.course-row-checkbox:checked').length;
    if (document.getElementById('reviewCoursesCount')) {
      document.getElementById('reviewCoursesCount').textContent = `${selectedCoursesCount} selected`;
    }

    // Count selected form fields across all tables
    const totalFieldsCount = document.querySelectorAll('.field-checkbox:checked, .contact-field-checkbox:checked, .guardian-field-checkbox:checked, .educ-courses-field-checkbox:checked, .additional-info-field-checkbox:checked, .documents-field-checkbox:checked').length;
    if (document.getElementById('reviewFieldsCount')) {
      document.getElementById('reviewFieldsCount').textContent = `${totalFieldsCount} selected`;
    }

    window.location.hash = 'builder-review';
  }
}

function showCycleBuilder(e) {
  if (e) e.preventDefault();
  populateAcademicYears();
  loadBasicInfoFromLocalStorage();
  if (welcomeSidebar) welcomeSidebar.style.display = 'none';
  if (mainShell) mainShell.classList.add('builder-active');
  if (dashboardView) dashboardView.style.display = 'none';
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  
  if (window.location.hash === '#builder-form') {
    showBuilderStep(2);
  } else {
    showBuilderStep(1);
    updateAutoNaming();
  }
}

function hideCycleBuilder(e) {
  if (e) e.preventDefault();
  if (welcomeSidebar) welcomeSidebar.style.display = 'flex';
  if (mainShell) mainShell.classList.remove('builder-active');
  if (cycleBuilderView) cycleBuilderView.style.display = 'none';
  if (dashboardView) dashboardView.style.display = 'block';
  window.location.hash = 'dashboard';
}

if (nextStepBtn) {
  nextStepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (validateBasicInfoFields()) {
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
    alert("Proceeding to Review & Publish step.");
  });
}

function handleInitialRoute() {
  if (window.location.hash === '#builder-courses') {
    showCycleBuilder();
    showBuilderStep(3);
  } else if (window.location.hash.startsWith('#builder')) {
    showCycleBuilder();
  } else {
    hideCycleBuilder();
  }
}

window.addEventListener('DOMContentLoaded', handleInitialRoute);
window.addEventListener('hashchange', handleInitialRoute);

if (openModalBtn) openModalBtn.addEventListener('click', showCycleBuilder);
document.querySelectorAll('.action-step-1').forEach(el => el.addEventListener('click', showCycleBuilder));
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', hideCycleBuilder);
if (cancelFormBtn) cancelFormBtn.addEventListener('click', hideCycleBuilder);
if (cancelCoursesBtn) cancelCoursesBtn.addEventListener('click', hideCycleBuilder);

if (qualificationSelect) qualificationSelect.addEventListener('change', updateAutoNaming);
if (academicYearSelect) academicYearSelect.addEventListener('change', updateAutoNaming);

// PROFILE ICON & AUTHENTICATION FEATURES
const userMenuTrigger = document.getElementById('userMenuTrigger');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const userAvatar = document.getElementById('userAvatar');
const dropdownUserName = document.getElementById('dropdownUserName');
const dropdownUserEmail = document.getElementById('dropdownUserEmail');
const dropdownUserRole = document.getElementById('dropdownUserRole');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'admin-home.html#sign-in';
    return;
  }

  try {
    const activeCollections = ['admins', 'academic_heads', 'system_admins'];
    let userDocData = null;

    for (const colName of activeCollections) {
      const docRef = doc(db, colName, user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        userDocData = docSnap.data();
        break;
      }
    }

    if (!userDocData) {
      await signOut(auth);
      window.location.href = 'admin-home.html#sign-in';
      return;
    }

    const initials = userDocData.initials || (userDocData.firstname ? userDocData.firstname.charAt(0) : 'A');
    if (userAvatar) userAvatar.textContent = initials;

    if (dropdownUserName) dropdownUserName.textContent = `${userDocData.firstname || ''} ${userDocData.surname || ''}`.trim();
    if (dropdownUserEmail) dropdownUserEmail.textContent = userDocData.email || user.email;
    if (dropdownUserRole) dropdownUserRole.textContent = (userDocData.role || 'Admin').replace('_', ' ');

  } catch (err) {
    console.error("Profile Verification Error:", err);
    window.location.href = 'admin-home.html#sign-in';
  }
});

if (userMenuTrigger) {
  userMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userDropdownMenu) userDropdownMenu.classList.toggle('active');
  });
}

window.addEventListener('click', () => {
  if (userDropdownMenu && userDropdownMenu.classList.contains('active')) {
    userDropdownMenu.classList.remove('active');
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = 'admin-home.html#sign-in';
    } catch (err) {
      console.error("Logout Error:", err);
    }
  });
}
