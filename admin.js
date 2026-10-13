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
const navStep1 = document.getElementById('navStep1');
const navStep2 = document.getElementById('navStep2');
const nextStepBtn = document.getElementById('nextStepBtn');
const prevStepBtn = document.getElementById('prevStepBtn');
const toCoursesBtn = document.getElementById('toCoursesBtn');

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

// Fetch form fields from Firestore and populate table
async function loadFormFieldsFromFirestore() {
  const tbody = document.getElementById('formFieldsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading fields...</td></tr>';

  try {
    const querySnapshot = await getDocs(collection(db, "application_form_fields"));
    let fields = [];
    querySnapshot.forEach((docSnap) => {
      fields.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort by order property if available
    fields.sort((a, b) => (a.order || 0) - (b.order || 0));

    tbody.innerHTML = '';
    if (fields.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No fields found in Firestore.</td></tr>';
      return;
    }

    fields.forEach((field, index) => {
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
      } else if (field.fieldBehaviour === 'Not Conditional') {
        behaviourHtml = `<span class="behaviour not-conditional">Not Conditional</span>`;
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

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.field-checkbox');
  let count = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) count++;
  });
  const badge = document.getElementById('selectedCountBadge');
  if (badge) badge.textContent = `${count} selected`;
}

document.addEventListener('change', (e) => {
  if (e.target.classList.contains('field-checkbox')) {
    updateSelectedCount();
  }
});

// View Navigation Handler
function showBuilderStep(stepNum) {
  if (stepNum === 1) {
    if (builderStep1) builderStep1.style.display = 'block';
    if (builderStep2) builderStep2.style.display = 'none';
    if (navStep1) { navStep1.classList.add('active'); navStep1.classList.remove('completed'); }
    if (navStep2) { navStep2.classList.remove('active', 'completed'); }
    window.location.hash = 'builder';
  } else if (stepNum === 2) {
    if (builderStep1) builderStep1.style.display = 'none';
    if (builderStep2) builderStep2.style.display = 'block';
    if (navStep1) { navStep1.classList.remove('active'); navStep1.classList.add('completed'); }
    if (navStep2) { navStep2.classList.add('active'); navStep2.classList.remove('completed'); }
    loadFormFieldsFromFirestore();
    window.location.hash = 'builder-form';
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

// Next button validation and local storage commit
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

// Handle initial route persistence based on hash
function handleInitialRoute() {
  if (window.location.hash.startsWith('#builder')) {
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

// Toggle User Dropdown Menu
if (userMenuTrigger) {
  userMenuTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userDropdownMenu) userDropdownMenu.classList.toggle('active');
  });
}

// Close dropdown when clicking anywhere outside
window.addEventListener('click', () => {
  if (userDropdownMenu && userDropdownMenu.classList.contains('active')) {
    userDropdownMenu.classList.remove('active');
  }
});

// Logout Button Action
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
