import { auth, db, storage, analytics } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.documentElement.style.overflowX = "hidden";
document.body.style.overflowX = "hidden";

// UI View Containers
const dashboardView = document.getElementById('dashboardView');
const cycleBuilderView = document.getElementById('cycleBuilderView');
const openModalBtn = document.getElementById('openModalBtn');
const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const continueCycleBtn = document.getElementById('continueCycleBtn');

// Form Inputs
const openingDateInput = document.getElementById('openingDateInput');
const closingDateInput = document.getElementById('closingDateInput');
const masterCoursesTableBody = document.getElementById('masterCoursesTableBody');
const selectedCourseCountText = document.getElementById('selectedCourseCountText');

let masterCoursesCache = [];
let selectedCourseIds = new Set();

let cycleConfig = {
  name: "2026 Academic Year",
  degreeTypes: ["Undergraduate degrees", "Postgraduate degrees", "Research degrees"]
};

// Switch from Dashboard View to Builder View
function showCycleBuilder(e) {
  if (e) e.preventDefault();
  const welcomeSidebar = document.getElementById('welcomeSidebar');
  const mainShell = document.getElementById('mainShell');
  
  if (welcomeSidebar) welcomeSidebar.style.display = 'none';
  if (mainShell) mainShell.classList.add('builder-active');
  
  if (dashboardView) dashboardView.style.display = 'none';
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  renderDegreeBadges();
  fetchMasterCourses();
}

// Switch back to Dashboard, restoring the sidebar and clearing progress
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

// Render Header Degree Badges in New Overlay Pill Layout
function renderDegreeBadges() {
  const container = document.getElementById('degreeList');
  if (!container) return;

  container.innerHTML = '';
  cycleConfig.degreeTypes.forEach((deg, index) => {
    const item = document.createElement('div');
    item.className = 'degree-item';
    item.setAttribute('data-degree', deg);

    item.innerHTML = `
      <div class="degree-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 9.5 12 4l10 5.5-10 5.5L2 9.5Z"/>
          <path d="M6 12v5.5c3.8 3 8.2 3 12 0V12"/>
          <path d="M22 9.5v6"/>
        </svg>
      </div>
      <div class="degree-chip">
        <span class="degree-name">${deg}</span>
        <button type="button" class="remove-degree" aria-label="Remove ${deg}" data-index="${index}">×</button>
      </div>
    `;

    item.querySelector('.remove-degree').addEventListener('click', (ev) => {
      const idx = parseInt(ev.target.getAttribute('data-index'));
      cycleConfig.degreeTypes.splice(idx, 1);
      renderDegreeBadges();
    });

    container.appendChild(item);
  });
}

// Degree Dropdown Handler
const addDegreeButton = document.getElementById("addDegreeButton");
const degreeDropdown = document.getElementById("degreeDropdown");

if (addDegreeButton && degreeDropdown) {
  addDegreeButton.addEventListener("click", () => {
    const isOpen = degreeDropdown.classList.toggle("open");
    addDegreeButton.setAttribute("aria-expanded", String(isOpen));
  });

  degreeDropdown.querySelectorAll("[data-add-degree]").forEach(button => {
    button.addEventListener("click", () => {
      const degree = button.dataset.addDegree;
      if (!cycleConfig.degreeTypes.includes(degree)) {
        cycleConfig.degreeTypes.push(degree);
        renderDegreeBadges();
      }
      degreeDropdown.classList.remove("open");
      addDegreeButton.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".add-degree-wrap")) {
      degreeDropdown.classList.remove("open");
      addDegreeButton.setAttribute("aria-expanded", "false");
    }
  });
}

// Date Picker Pickers & Formatters
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

// Fetch Master Courses from Firestore
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

// Populate Filter Dropdowns
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

// Render Courses Table
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

// Select All Courses Checkbox
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

// Search / Filter Button Handler
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

// Save Transactional Data to Firestore on "Continue" Click
async function handleContinueCycle(e) {
  if (e) e.preventDefault();
  
  const openingDate = openingDateInput ? openingDateInput.value : '';
  const closingDate = closingDateInput ? closingDateInput.value : '';

  if (!openingDate || !closingDate) {
    alert("Please select both opening and closing dates for the application cycle.");
    return;
  }

  if (closingDate < openingDate) {
    alert("The closing date cannot be earlier than the opening date.");
    return;
  }

  if (cycleConfig.degreeTypes.length === 0) {
    alert("Please add at least one degree type before continuing.");
    return;
  }

  if (selectedCourseIds.size === 0) {
    alert("Please select at least one course from the table before continuing.");
    return;
  }

  try {
    continueCycleBtn.disabled = true;
    continueCycleBtn.textContent = "Saving...";

    const chosenCourses = masterCoursesCache.filter(c => selectedCourseIds.has(c.id));

    const cycleData = {
      cycleName: cycleConfig.name,
      degreeTypes: cycleConfig.degreeTypes,
      openingDate: openingDate,
      closingDate: closingDate,
      selectedCourses: chosenCourses,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "application_cycles"), cycleData);
    
    alert(`Application cycle successfully created and saved!\nDocument ID: ${docRef.id}`);
    
    selectedCourseIds.clear();
    const welcomeSidebar = document.getElementById('welcomeSidebar');
    const mainShell = document.getElementById('mainShell');
    
    if (welcomeSidebar) welcomeSidebar.style.display = 'flex';
    if (mainShell) mainShell.classList.remove('builder-active');

    if (cycleBuilderView) cycleBuilderView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
  } catch (err) {
    console.error("Error saving application cycle:", err);
    alert("Failed to save application cycle. Check console for details.");
  } finally {
    continueCycleBtn.disabled = false;
    continueCycleBtn.textContent = "Continue →";
  }
}

// Navigation Tabs Switcher
const cycleContent = document.getElementById("cycleContent");
const alternateContent = document.getElementById("alternateContent");
const alternateHeading = document.getElementById("alternateHeading");
const alternateDescription = document.getElementById("alternateDescription");

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(item => {
      item.classList.toggle("active", item === tab);
    });

    if (tab.dataset.tab === "cycle") {
      cycleContent.hidden = false;
      alternateContent.hidden = true;
      return;
    }

    cycleContent.hidden = true;
    alternateContent.hidden = false;

    if (tab.dataset.tab === "form") {
      alternateHeading.textContent = "Application form";
      alternateDescription.textContent = "Configure the application form for this application cycle.";
    } else {
      alternateHeading.textContent = "Documents";
      alternateDescription.textContent = "Configure the documents required for this application cycle.";
    }
  });
});

// Add Selected Courses Prompt
const addSelectedCoursesBtn = document.getElementById("addSelectedCoursesBtn");
if (addSelectedCoursesBtn) {
  addSelectedCoursesBtn.addEventListener("click", () => {
    if (selectedCourseIds.size === 0) {
      alert("Please select at least one course.");
      return;
    }
    const chosenCourses = masterCoursesCache.filter(c => selectedCourseIds.has(c.id));
    const names = chosenCourses.map(c => c.course);
    alert(`${chosenCourses.length} course(s) selected:\n\n` + names.join("\n"));
  });
}

// Event bindings
if (openModalBtn) openModalBtn.addEventListener('click', showCycleBuilder);
document.querySelectorAll('.action-step-1').forEach(el => el.addEventListener('click', showCycleBuilder));
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', cancelCycleCreation);
if (continueCycleBtn) continueCycleBtn.addEventListener('click', handleContinueCycle);

// Retain handlers for other UI elements
const viewAppsBtn = document.getElementById('viewAppsBtn');
if (viewAppsBtn) viewAppsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("View Applications clicked"); });

const manageFieldsBtn = document.getElementById('manageFieldsBtn');
if (manageFieldsBtn) manageFieldsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("Manage Fields clicked"); });

const viewReportsBtn = document.getElementById('viewReportsBtn');
if (viewReportsBtn) viewReportsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("View Reports clicked"); });

document.querySelectorAll('#guideLink, #supportLink, #privacyLink, #termsLink').forEach(link => {
  link.addEventListener('click', (e) => { e.preventDefault(); alert(link.textContent + " clicked"); });
});

// AUTHENTICATION & USER PROFILE SECURITY CHECK
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
      alert("Error logging out: " + err.message);
    }
  });
}
