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
   2. STEP 1: APPLICATION CYCLE BUILDER LOGIC
===================================================== */
const mainWorkspace = document.getElementById('mainWorkspace');
const welcomeView = document.getElementById('welcomeView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const rightSidebar = document.getElementById('rightSidebar');

const qualificationSelect = document.getElementById('qualification');
const academicYearSelect = document.getElementById('academic-year');
const openingDateInput = document.getElementById('opening-date');
const closingDateInput = document.getElementById('closing-date');
const folderNameInput = document.getElementById('folder-name');
const cycleNameInput = document.getElementById('cycle-name');

const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const nextStepBtn = document.getElementById('nextStepBtn');

const BASIC_INFO_STORAGE_KEY = 'myAtlas_basicInfo';

function setupDateConstraints() {
  if (!openingDateInput || !closingDateInput) return;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Format today's date as YYYY-MM-DD in local time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  // Format December 31st of current year as YYYY-12-31
  const maxStr = `${currentYear}-12-31`;

  // Restrict opening date: cannot be earlier than today, cannot exceed current year end
  openingDateInput.min = todayStr;
  openingDateInput.max = maxStr;

  // Restrict closing date initially based on current year bounds
  closingDateInput.min = todayStr;
  closingDateInput.max = maxStr;
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
    if (qualificationSelect) qualificationSelect.value = parsed.qualification || '';
    if (academicYearSelect) {
      populateAcademicYears();
      academicYearSelect.value = parsed.academicYear || '';
    }
    if (openingDateInput) {
      openingDateInput.value = parsed.openingDate || '';
      if (openingDateInput.value) {
        // Ensure closing date minimum updates if opening date was restored from storage
        closingDateInput.min = openingDateInput.value;
      }
    }
    if (closingDateInput) closingDateInput.value = parsed.closingDate || '';
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

function openCycleBuilder(e) {
  if (e) e.preventDefault();
  setupDateConstraints();
  populateAcademicYears();
  loadBasicInfoFromLocalStorage();
  if (welcomeView) welcomeView.style.display = 'none';
  if (rightSidebar) rightSidebar.style.display = 'none';
  if (mainWorkspace) mainWorkspace.classList.add('builder-active');
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  updateAutoNaming();
}

function closeCycleBuilderAndReset(e) {
  if (e) e.preventDefault();
  // Erase all saved progress in local storage
  localStorage.removeItem(BASIC_INFO_STORAGE_KEY);
  localStorage.removeItem('myAtlas_formFieldsState');
  localStorage.removeItem('myAtlas_selectedCourses');

  // Reset inputs
  if (qualificationSelect) qualificationSelect.value = '';
  if (academicYearSelect) { populateAcademicYears(); academicYearSelect.value = ''; }
  if (openingDateInput) openingDateInput.value = '';
  if (closingDateInput) closingDateInput.value = '';
  if (folderNameInput) folderNameInput.value = '';
  if (cycleNameInput) cycleNameInput.value = '';

  // Return to welcome view and restore right sidebar
  if (cycleBuilderView) cycleBuilderView.style.display = 'none';
  if (mainWorkspace) mainWorkspace.classList.remove('builder-active');
  if (rightSidebar) rightSidebar.style.display = 'block';
  if (welcomeView) welcomeView.style.display = 'flex';
}

// Bind all 3 "Create Application Cycle" buttons
document.querySelectorAll('.create-cycle-trigger').forEach(btn => {
  btn.addEventListener('click', openCycleBuilder);
});

// Cancel button
if (cancelCycleBtn) {
  cancelCycleBtn.addEventListener('click', closeCycleBuilderAndReset);
}

// Next Step 1 validation button (Step 2 is disabled for now)
if (nextStepBtn) {
  nextStepBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await validateBasicInfoFields()) {
      saveBasicInfoToLocalStorage();
      alert("Step 1 validated and saved successfully! Steps 2, 3, and 4 are disabled for now.");
    }
  });
}

// Listeners for automatic updates & local storage saving
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
    const openVal = openingDateInput.value;
    if (openVal) {
      // Ensure closing date cannot be set before or on the chosen opening date
      closingDateInput.min = openVal;
      if (closingDateInput.value && closingDateInput.value <= openVal) {
        closingDateInput.value = ''; // Reset invalid closing date
      }
    }
    saveBasicInfoToLocalStorage();
  });
}
if (closingDateInput) {
  closingDateInput.addEventListener('change', saveBasicInfoToLocalStorage);
}
