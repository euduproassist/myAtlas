import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.documentElement.style.overflowX = "hidden";
document.body.style.overflowX = "hidden";

// UI View Containers
const dashboardView = document.getElementById('dashboardView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const openModalBtn = document.getElementById('openModalBtn');
const cancelCycleBtn = document.getElementById('cancelCycleBtn');

// Form Inputs & Table References
const masterCoursesTableBody = document.getElementById('masterCoursesTableBody');
const selectedCourseCountText = document.getElementById('selectedCourseCountText');

let masterCoursesCache = [];
let selectedCourseIds = new Set();

// FUNCTION 2: Create Application Cycle Button Action
function showCycleBuilder(e) {
  if (e) e.preventDefault();
  const welcomeSidebar = document.getElementById('welcomeSidebar');
  const mainShell = document.getElementById('mainShell');
  
  if (welcomeSidebar) welcomeSidebar.style.display = 'none';
  if (mainShell) mainShell.classList.add('builder-active');
  
  if (dashboardView) dashboardView.style.display = 'none';
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  
  fetchMasterCourses();
}

// FUNCTION 5: Cancel Button Action
function cancelCycleCreation(e) {
  if (e) e.preventDefault();
  if (confirm("Are you sure you want to cancel? All progress for this cycle will be discarded.")) {
    selectedCourseIds.clear();
    const welcomeSidebar = document.getElementById('welcomeSidebar');
    const mainShell = document.getElementById('mainShell');
    
    if (welcomeSidebar) welcomeSidebar.style.display = 'flex';
    if (mainShell) mainShell.classList.remove('builder-active');

    if (cycleBuilderView) cycleBuilderView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
  }
}

// FUNCTION 3: Calendar Icons & Picker Features
document.querySelectorAll(".calendar-button").forEach(button => {
  button.addEventListener("click", () => {
    const picker = document.getElementById(button.dataset.dateTarget);
    if (picker) {
      if (typeof picker.showPicker === "function") {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    }
  });
});

function formatDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

[
  ["openingDateInput", "openingDateText"],
  ["closingDateInput", "closingDateText"]
].forEach(([nativeId, textId]) => {
  const nativeInput = document.getElementById(nativeId);
  const textInput = document.getElementById(textId);

  if (nativeInput && textInput) {
    nativeInput.addEventListener("change", () => {
      textInput.value = formatDate(nativeInput.value);
    });
  }
});

// FUNCTION 4: Undergraduate Course Table Features
async function fetchMasterCourses() {
  if (!masterCoursesTableBody) return;
  masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--muted);">Loading master courses from database...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "master_courses"));
    masterCoursesCache = [];
    
    querySnapshot.forEach((docSnap) => {
      masterCoursesCache.push({ id: docSnap.id, ...docSnap.data() });
    });

    populateTableFilters();
    renderCoursesTable(masterCoursesCache);
  } catch (err) {
    console.error("Error fetching master courses:", err);
    masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #e53e3e;">Error loading courses. Please check Firestore permissions.</td></tr>`;
  }
}

function populateTableFilters() {
  const filterCourse = document.getElementById('filterCourse');
  const filterStudyMode = document.getElementById('filterStudyMode');
  const filterCampus = document.getElementById('filterCampus');
  if (!filterCourse || !filterStudyMode || !filterCampus) return;

  const uniqueCourses = [...new Set(masterCoursesCache.map(c => c.course))];
  const uniqueModes = [...new Set(masterCoursesCache.map(c => c.studyMode))];
  const uniqueCampuses = [...new Set(masterCoursesCache.map(c => c.campus))];

  filterCourse.innerHTML = `<option value="">All courses</option>` + uniqueCourses.map(c => `<option value="${c}">${c}</option>`).join('');
  filterStudyMode.innerHTML = `<option value="">All study modes</option>` + uniqueModes.map(m => `<option value="${m}">${m}</option>`).join('');
  filterCampus.innerHTML = `<option value="">All campuses</option>` + uniqueCampuses.map(cp => `<option value="${cp}">${cp}</option>`).join('');
}

function renderCoursesTable(courses) {
  if (!masterCoursesTableBody) return;
  masterCoursesTableBody.innerHTML = '';

  if (courses.length === 0) {
    masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--muted);">No courses found in database.</td></tr>`;
    return;
  }

  const currentYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  courses.forEach(item => {
    const tr = document.createElement('tr');
    const isChecked = selectedCourseIds.has(item.id);

    tr.innerHTML = `
      <td>
        <input type="checkbox" class="course-checkbox course-row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} aria-label="Select ${item.course || 'course'}">
      </td>
      <td>${item.course || ''}</td>
      <td>${item.studyMode || ''}</td>
      <td>${item.campus || ''}</td>
      <td>${item.academicYear || currentYear}</td>
    `;

    const checkbox = tr.querySelector('.course-row-checkbox');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedCourseIds.add(item.id);
      } else {
        selectedCourseIds.delete(item.id);
      }
      updateSelectedCount();
    });

    masterCoursesTableBody.appendChild(tr);
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  if (selectedCourseCountText) {
    selectedCourseCountText.textContent = `${selectedCourseIds.size} ${selectedCourseIds.size === 1 ? 'course' : 'courses'} selected`;
  }

  const selectAll = document.getElementById("selectAllCourses");
  if (selectAll && masterCoursesTableBody) {
    const checkboxes = [...masterCoursesTableBody.querySelectorAll('.course-row-checkbox')];
    if (checkboxes.length > 0) {
      selectAll.checked = checkboxes.every(cb => cb.checked);
      selectAll.indeterminate = checkboxes.some(cb => cb.checked) && !checkboxes.every(cb => cb.checked);
    }
  }
}

const selectAllCoursesBtn = document.getElementById("selectAllCourses");
if (selectAllCoursesBtn) {
  selectAllCoursesBtn.addEventListener("change", () => {
    const checkboxes = [...masterCoursesTableBody.querySelectorAll('.course-row-checkbox')];
    checkboxes.forEach(cb => {
      cb.checked = selectAllCoursesBtn.checked;
      const id = cb.getAttribute('data-id');
      if (selectAllCoursesBtn.checked) {
        selectedCourseIds.add(id);
      } else {
        selectedCourseIds.delete(id);
      }
    });
    updateSelectedCount();
  });
}

const searchCoursesBtn = document.getElementById('searchCoursesBtn');
if (searchCoursesBtn) {
  searchCoursesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const cVal = document.getElementById('filterCourse').value.toLowerCase();
    const mVal = document.getElementById('filterStudyMode').value.toLowerCase();
    const cpVal = document.getElementById('filterCampus').value.toLowerCase();

    const filtered = masterCoursesCache.filter(item => {
      const matchC = !cVal || (item.course && item.course.toLowerCase().includes(cVal));
      const matchM = !mVal || (item.studyMode && item.studyMode.toLowerCase().includes(mVal));
      const matchCp = !cpVal || (item.campus && item.campus.toLowerCase().includes(cpVal));
      return matchC && matchM && matchCp;
    });

    renderCoursesTable(filtered);
  });
}

// BIND ACTIVE FUNCTION LISTENERS
if (openModalBtn) openModalBtn.addEventListener('click', showCycleBuilder);
document.querySelectorAll('.action-step-1').forEach(el => el.addEventListener('click', showCycleBuilder));
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', cancelCycleCreation);

// FUNCTION 1: PROFILE ICON & AUTHENTICATION FEATURES
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
    if (dropdownUserRole) dropdownUserRole.textContent = (userDocData.role || 'Staff').replace('_', ' ');

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
