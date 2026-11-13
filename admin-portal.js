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
   2. APPLICATION CYCLE BUILDER (STEPS 1 TO 4)
===================================================== */
const mainWorkspace = document.getElementById('mainWorkspace');
const dashboardView = document.getElementById('dashboardView');
const cycleBuilderView = document.getElementById('cycleBuilderView');

// Three Create Buttons
const sidebarNewCycleBtn = document.getElementById('sidebarNewCycleBtn');
const centreCreateCycleBtn = document.getElementById('centreCreateCycleBtn');
const quickActionCreateCycleBtn = document.getElementById('quickActionCreateCycleBtn');

// Cancel Buttons
const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const cancelCoursesBtn = document.getElementById('cancelCoursesBtn');
const cancelReviewBtn = document.getElementById('cancelReviewBtn');

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
const prevToCoursesBtn = document.getElementById('prevToCoursesBtn');
const publishCycleBtn = document.getElementById('publishCycleBtn');

// Courses step elements
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

// Local Storage Management
const BASIC_INFO_KEY = 'myAtlas_basicInfo';
const FORM_FIELDS_KEY = 'myAtlas_formFieldsState';
const SELECTED_COURSES_KEY = 'myAtlas_selectedCourses';

function saveBasicInfoToLocalStorage() {
  const data = {
    qualification: qualificationSelect.value,
    academicYear: academicYearSelect.value,
    openingDate: openingDateInput.value,
    closingDate: closingDateInput.value,
    folderName: folderNameInput.value,
    cycleName: cycleNameInput.value
  };
  localStorage.setItem(BASIC_INFO_KEY, JSON.stringify(data));
}

function loadBasicInfoFromLocalStorage() {
  const raw = localStorage.getItem(BASIC_INFO_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
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

function getFormFieldsState() {
  try {
    return JSON.parse(localStorage.getItem(FORM_FIELDS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveFormFieldState(fieldId, isSelected, requirement) {
  const state = getFormFieldsState();
  state[fieldId] = { isSelected, requirement };
  localStorage.setItem(FORM_FIELDS_KEY, JSON.stringify(state));
}

function getSelectedCoursesSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SELECTED_COURSES_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function saveSelectedCoursesSet(setObj) {
  localStorage.setItem(SELECTED_COURSES_KEY, JSON.stringify(Array.from(setObj)));
}

// Validation for Step 1
async function validateBasicInfoFields() {
  const qual = qualificationSelect.value;
  const yr = academicYearSelect.value;
  const opening = openingDateInput.value;
  const closing = closingDateInput.value;

  if (!qual || !yr || !opening || !closing) {
    alert("Please fill in all required fields in Basic Info before proceeding.");
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

// Table Field Loader for Step 2
async function loadTableFieldsFromFirestore(sectionName, tbodyId, checkboxClass, countBadgeId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

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

      let isSelected = data.isSelected;
      let requirement = data.requirement;
      if (savedState[docSnap.id]) {
        isSelected = savedState[docSnap.id].isSelected;
        requirement = savedState[docSnap.id].requirement;
      }

      fields.push({ id: docSnap.id, ...data, isSelected, requirement });
    });

    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No fields found.</td></tr>';
      return;
    }

    fields.forEach((field) => {
      const tr = document.createElement('tr');
      tr.dataset.fieldId = field.id;
      const isCheckedAttr = field.isSelected ? 'checked' : '';
      const reqSelected = field.requirement === 'Required' ? 'selected' : '';
      const optSelected = field.requirement === 'Optional' ? 'selected' : '';

      tr.innerHTML = `
        <td><input type="checkbox" class="check ${checkboxClass}" ${isCheckedAttr} aria-label="Include ${field.fieldName}"></td>
        <td>${field.fieldName}</td>
        <td>
          <select class="requirement-select" aria-label="${field.fieldName} requirement">
            <option ${reqSelected}>Required</option>
            <option ${optSelected}>Optional</option>
          </select>
        </td>
        <td><span class="behaviour">${field.fieldBehaviour || 'Standard'}</span></td>
      `;
      tbody.appendChild(tr);
    });

    updateTableSelectedCount(checkboxClass, countBadgeId);
  } catch (err) {
    console.error("Error loading fields:", err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Failed to load fields.</td></tr>';
  }
}

function updateTableSelectedCount(checkboxClass, badgeId) {
  const checkboxes = document.querySelectorAll(`.${checkboxClass}`);
  let count = 0;
  checkboxes.forEach(cb => { if (cb.checked) count++; });
  const badge = document.getElementById(badgeId);
  if (badge) badge.textContent = `${count} selected`;
}

function loadAllFormFields() {
  loadTableFieldsFromFirestore("personal", "formFieldsTableBody", "field-checkbox", "selectedCountBadge");
  loadTableFieldsFromFirestore("contact", "contactFieldsTableBody", "contact-field-checkbox", "contactSelectedCountBadge");
  loadTableFieldsFromFirestore("guardian", "guardianFieldsTableBody", "guardian-field-checkbox", "guardianSelectedCountBadge");
  loadTableFieldsFromFirestore("education_courses", "educCoursesFieldsTableBody", "educ-courses-field-checkbox", "educCoursesSelectedCountBadge");
  loadTableFieldsFromFirestore("additional_info", "additionalInfoFieldsTableBody", "additional-info-field-checkbox", "additionalInfoSelectedCountBadge");
  loadTableFieldsFromFirestore("documents", "documentsFieldsTableBody", "documents-field-checkbox", "documentsSelectedCountBadge");
}

// Master Courses for Step 3
let masterCoursesCache = [];

function getQualificationFilteredCourses() {
  const qualVal = qualificationSelect ? qualificationSelect.value.trim() : '';
  if (!qualVal) return masterCoursesCache;

  return masterCoursesCache.filter(item => {
    const lowerName = (item.course || '').trim().toLowerCase();
    if (qualVal === 'Undergraduate Degree') {
      return lowerName.startsWith('higher certificate') || lowerName.startsWith('diploma') || lowerName.startsWith('bachelor');
    } else if (qualVal === 'Postgraduate Degree') {
      return lowerName.startsWith('postgraduate');
    } else if (qualVal === 'Research Degree') {
      return lowerName.startsWith('masters') || lowerName.startsWith('phd') || lowerName.startsWith('doctorate');
    }
    return true;
  });
}

async function loadMasterCourses() {
  if (!masterCoursesTableBody) return;
  masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading courses...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "master_courses"));
    let raw = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.course) {
        raw.push({
          id: docSnap.id,
          course: data.course || '',
          studyMode: data.studyMode || data.study_mode || '',
          campus: data.campus || ''
        });
      }
    });

    const uniqueMap = new Map();
    raw.forEach(item => {
      const key = `${item.course.trim().toLowerCase()}_${item.studyMode.trim().toLowerCase()}_${item.campus.trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });

    masterCoursesCache = Array.from(uniqueMap.values());
    populateCourseFilters();
    renderFilteredMasterCourses();
  } catch (err) {
    console.error("Error loading courses:", err);
    masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Failed to load courses.</td></tr>';
  }
}

function populateCourseFilters() {
  if (!filterCourse || !filterStudyMode || !filterCampus) return;
  const qualFiltered = getQualificationFilteredCourses();
  const cSet = new Set(), smSet = new Set(), cpSet = new Set();

  qualFiltered.forEach(c => {
    if (c.course) cSet.add(c.course);
    if (c.studyMode) smSet.add(c.studyMode);
    if (c.campus) cpSet.add(c.campus);
  });

  filterCourse.innerHTML = '<option value="">All Courses</option>';
  Array.from(cSet).sort().forEach(v => filterCourse.add(new Option(v, v)));

  filterStudyMode.innerHTML = '<option value="">All Study Modes</option>';
  Array.from(smSet).sort().forEach(v => filterStudyMode.add(new Option(v, v)));

  filterCampus.innerHTML = '<option value="">All Campuses</option>';
  Array.from(cpSet).sort().forEach(v => filterCampus.add(new Option(v, v)));
}

function renderFilteredMasterCourses() {
  if (!masterCoursesTableBody) return;
  const cFilter = filterCourse ? filterCourse.value.toLowerCase() : '';
  const smFilter = filterStudyMode ? filterStudyMode.value.toLowerCase() : '';
  const cpFilter = filterCampus ? filterCampus.value.toLowerCase() : '';
  const search = filterSearch ? filterSearch.value.toLowerCase().trim() : '';
  const chosenYear = academicYearSelect && academicYearSelect.value ? academicYearSelect.value : new Date().getFullYear();
  const savedSet = getSelectedCoursesSet();

  const filtered = getQualificationFilteredCourses().filter(item => {
    return (!cFilter || item.course.toLowerCase() === cFilter) &&
           (!smFilter || item.studyMode.toLowerCase() === smFilter) &&
           (!cpFilter || item.campus.toLowerCase() === cpFilter) &&
           (!search || item.course.toLowerCase().includes(search) || item.studyMode.toLowerCase().includes(search) || item.campus.toLowerCase().includes(search));
  });

  masterCoursesTableBody.innerHTML = '';
  if (filtered.length === 0) {
    masterCoursesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No matching courses found.</td></tr>';
    updateCoursesSelectedCount();
    return;
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    const uniqueKey = `${item.course}_${item.studyMode}_${item.campus}`;
    tr.dataset.courseKey = uniqueKey;
    const isChecked = savedSet.has(uniqueKey) ? 'checked' : '';

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

// Event Listeners for Checkboxes & Requirements
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('field-checkbox') || e.target.classList.contains('contact-field-checkbox') || e.target.classList.contains('guardian-field-checkbox') || e.target.classList.contains('educ-courses-field-checkbox') || e.target.classList.contains('additional-info-field-checkbox') || e.target.classList.contains('documents-field-checkbox')) {
    const tr = e.target.closest('tr');
    if (tr && tr.dataset.fieldId) {
      const reqSelect = tr.querySelector('.requirement-select');
      saveFormFieldState(tr.dataset.fieldId, e.target.checked, reqSelect ? reqSelect.value : 'Required');
    }
  } else if (e.target.classList.contains('requirement-select')) {
    const tr = e.target.closest('tr');
    if (tr && tr.dataset.fieldId) {
      const cb = tr.querySelector('input[type="checkbox"]');
      saveFormFieldState(tr.dataset.fieldId, cb ? cb.checked : true, e.target.value);
    }
  } else if (e.target.classList.contains('course-row-checkbox')) {
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

// Step Navigation Handler
function showBuilderStep(stepNum) {
  [builderStep1, builderStep2, builderStep3, builderStep4].forEach((el, idx) => {
    if (el) el.style.display = (idx + 1 === stepNum) ? 'block' : 'none';
  });

  [navStep1, navStep2, navStep3, navStep4].forEach((el, idx) => {
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (idx + 1 === stepNum) el.classList.add('active');
    else if (idx + 1 < stepNum) el.classList.add('completed');
  });

  if (stepNum === 2) loadAllFormFields();
  if (stepNum === 3) {
    if (coursesDynamicHeading && qualificationSelect) {
      const qualVal = qualificationSelect.value;
      coursesDynamicHeading.textContent = qualVal ? `${qualVal.replace(/\s+Degree$/i, '')} Courses` : 'Courses';
    }
    loadMasterCourses();
  }
  if (stepNum === 4) {
    renderStep4ApplicationPreview("builderStep4Preview");
  }
}

function openCycleBuilder(e) {
  if (e) e.preventDefault();
  populateAcademicYears();
  loadBasicInfoFromLocalStorage();
  if (dashboardView) dashboardView.style.display = 'none';
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  if (mainWorkspace) mainWorkspace.classList.add('builder-active');
  showBuilderStep(1);
  updateAutoNaming();
}

function closeCycleBuilderAndReset(e) {
  if (e) e.preventDefault();
  // Permanently delete all local storage saved data for creating cycle
  localStorage.removeItem(BASIC_INFO_KEY);
  localStorage.removeItem(FORM_FIELDS_KEY);
  localStorage.removeItem(SELECTED_COURSES_KEY);

  // Reset form inputs visually
  if (qualificationSelect) qualificationSelect.value = '';
  if (academicYearSelect) { populateAcademicYears(); academicYearSelect.value = ''; }
  if (openingDateInput) openingDateInput.value = '';
  if (closingDateInput) closingDateInput.value = '';
  if (folderNameInput) folderNameInput.value = '';
  if (cycleNameInput) cycleNameInput.value = '';

  // Return to the first page / home dashboard
  if (cycleBuilderView) cycleBuilderView.style.display = 'none';
  if (dashboardView) dashboardView.style.display = 'flex';
  if (mainWorkspace) mainWorkspace.classList.remove('builder-active');
}

// Bind ALL THREE Create Application Cycle Buttons
if (sidebarNewCycleBtn) sidebarNewCycleBtn.addEventListener('click', openCycleBuilder);
if (centreCreateCycleBtn) centreCreateCycleBtn.addEventListener('click', openCycleBuilder);
if (quickActionCreateCycleBtn) quickActionCreateCycleBtn.addEventListener('click', openCycleBuilder);

// Bind Cancel Buttons across all steps
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', closeCycleBuilderAndReset);
if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeCycleBuilderAndReset);
if (cancelCoursesBtn) cancelCoursesBtn.addEventListener('click', closeCycleBuilderAndReset);
if (cancelReviewBtn) cancelReviewBtn.addEventListener('click', closeCycleBuilderAndReset);

// Step progression bindings
if (nextStepBtn) {
  nextStepBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await validateBasicInfoFields()) {
      saveBasicInfoToLocalStorage();
      showBuilderStep(2);
    }
  });
}

if (prevStepBtn) prevStepBtn.addEventListener('click', (e) => { e.preventDefault(); showBuilderStep(1); });
if (toCoursesBtn) toCoursesBtn.addEventListener('click', (e) => { e.preventDefault(); showBuilderStep(3); });
if (prevToFormBtn) prevToFormBtn.addEventListener('click', (e) => { e.preventDefault(); showBuilderStep(2); });
if (toReviewBtn) toReviewBtn.addEventListener('click', (e) => { e.preventDefault(); showBuilderStep(4); });
if (prevToCoursesBtn) prevToCoursesBtn.addEventListener('click', (e) => { e.preventDefault(); showBuilderStep(3); });

// Auto-naming listeners
if (qualificationSelect) qualificationSelect.addEventListener('change', async () => { await updateAutoNaming(); saveBasicInfoToLocalStorage(); });
if (academicYearSelect) academicYearSelect.addEventListener('change', async () => { await updateAutoNaming(); saveBasicInfoToLocalStorage(); });
if (openingDateInput) openingDateInput.addEventListener('change', saveBasicInfoToLocalStorage);
if (closingDateInput) closingDateInput.addEventListener('change', saveBasicInfoToLocalStorage);

/* =====================================================
   3. PUBLISH CYCLE ACTION (SAVING TO FIRESTORE & WIPING LOCAL STORAGE)
===================================================== */
if (publishCycleBtn) {
  publishCycleBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!await validateBasicInfoFields()) {
      showBuilderStep(1);
      return;
    }

    const savedFieldsState = getFormFieldsState();
    const savedSelectedCourses = JSON.parse(localStorage.getItem(SELECTED_COURSES_KEY) || '[]');

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
      
      const existingCycles = await fetchExistingCyclesForQualification(qualVal, yearVal);
      const cycleNumber = existingCycles.length + 1;

      const qualSlug = qualVal.toLowerCase().replace(/\s+degree$/i, '').replace(/\s+/g, '_');
      const collectionName = `${yearVal}_${qualSlug}_admissions`;

      const prefix = qualVal.toLowerCase().includes('post') ? 'postgrad' : (qualVal.toLowerCase().includes('research') ? 'research' : 'undergrad');
      const cycleId = `${prefix}-${yearVal}-cycle-${cycleNumber}`;
      const finalCycleName = `${qualVal.replace(/\s+Degree$/i, '')} Applications ${yearVal}-Cycle ${cycleNumber}`;

      // Form fields snapshot
      const querySnapshot = await getDocs(collection(db, "application_form_fields"));
      const formFieldsSnapshot = [];

      querySnapshot.forEach((docSnap) => {
        const fieldData = docSnap.data();
        const fieldId = docSnap.id;
        const userState = savedFieldsState[fieldId];
        const isSelected = userState ? userState.isSelected : fieldData.isSelected;
        const requirement = userState ? userState.requirement : fieldData.requirement;

        if (isSelected) {
          formFieldsSnapshot.push({
            fieldId,
            fieldName: fieldData.fieldName || '',
            section: fieldData.section || 'personal',
            requirement: requirement || 'Required',
            fieldBehaviour: fieldData.fieldBehaviour || 'Standard',
            order: fieldData.order || 0
          });
        }
      });

      formFieldsSnapshot.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Courses snapshot
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
        cycleId,
        folderName: folderNameInput.value,
        cycleName: finalCycleName,
        academicYear: yearVal,
        qualificationType: qualVal,
        status: "published",
        openingDate: openingDateInput.value,
        closingDate: closingDateInput.value,
        isManuallyClosed: false,
        publishedAt: serverTimestamp(),
        formFieldsSnapshot,
        selectedCoursesSnapshot
      };

      // Save to Firestore
      await setDoc(doc(db, collectionName, cycleId), cyclePayload);

      alert("Application cycle published successfully!");

      // Automatically wipes local storage and leads back to the home page of admin-portal.html
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
