import { auth, db, storage, analytics } from "./firebase-config.js";
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
// State tracking simulated for cycle creation
let cycleConfig = {
  name: "2026 Academic Year",
  degreeTypes: ["Undergraduate Degrees", "Postgraduate Degrees"]
};

// Switch from Dashboard View to Builder View
function showCycleBuilder(e) {
  if (e) e.preventDefault();
  if (dashboardView) dashboardView.style.display = 'none';
  if (cycleBuilderView) cycleBuilderView.style.display = 'block';
  renderDegreeBadges();
  fetchMasterCourses();
}

// Switch back to Dashboard and clear progress
function cancelCycleCreation(e) {
  if (e) e.preventDefault();
  if (confirm("Are you sure you want to cancel? All progress for this cycle will be discarded.")) {
    selectedCourseIds.clear();
    if (cycleBuilderView) cycleBuilderView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
  }
}

// Render Header Degree Badges & Manage "Add Degree" button state
function renderDegreeBadges() {
  const container = document.getElementById('degreeBadgesContainer');
  const addBtn = document.getElementById('addDegreeDropdownBtn');
  if (!container) return;

  container.innerHTML = '';
  cycleConfig.degreeTypes.forEach((deg, index) => {
    const badge = document.createElement('div');
    badge.style.cssText = "display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--border-light); padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 650; color: var(--navy);";
    badge.innerHTML = `<span>🎓</span> ${deg} <span style="cursor: pointer; color: #8fa6c2; margin-left: 4px;" data-index="${index}">✕</span>`;
    
    badge.querySelector('span[data-index]').addEventListener('click', (ev) => {
      const idx = parseInt(ev.target.getAttribute('data-index'));
      cycleConfig.degreeTypes.splice(idx, 1);
      renderDegreeBadges();
    });
    container.appendChild(badge);
  });

  // If user selected all 3, disable add degree button as requested
  if (addBtn) {
    if (cycleConfig.degreeTypes.length >= 3) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
    }
  }
}

// Add Degree Dropdown Action
const addDegreeDropdownBtn = document.getElementById('addDegreeDropdownBtn');
if (addDegreeDropdownBtn) {
  addDegreeDropdownBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const available = ["Undergraduate Degrees", "Postgraduate Degrees", "Master & Doctoral Degrees"]
      .filter(d => !cycleConfig.degreeTypes.includes(d));
    if (available.length === 0) return;
    
    const choice = prompt(`Select degree type to add:\n${available.map((d, i) => `${i + 1}.${d}`).join('\n')}`);
    const index = parseInt(choice) - 1;
    if (!isNaN(index) && available[index]) {
      cycleConfig.degreeTypes.push(available[index]);
      renderDegreeBadges();
    }
  });
}

// Fetch Courses from Firestore master_courses collection
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

  const currentYear = new Date().getFullYear();

  courses.forEach(item => {
    const tr = document.createElement('tr');
    tr.style.cssText = "border-bottom: 1px solid var(--line); transition: background 0.1s;";
    const isChecked = selectedCourseIds.has(item.id);

    tr.innerHTML = `
      <td style="padding: 12px 16px;"><input type="checkbox" class="course-row-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="accent-color: var(--blue);"></td>
      <td style="padding: 12px 16px; font-weight: 650; color: var(--navy);">${item.course || ''}</td>
      <td style="padding: 12px 16px; color: var(--muted);">${item.studyMode || ''}</td>
      <td style="padding: 12px 16px; color: var(--muted);">${item.campus || ''}</td>
      <td style="padding: 12px 16px; color: var(--muted);">${item.academicYear || currentYear}</td>
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
    selectedCourseCountText.textContent = `${selectedCourseIds.size} courses selected`;
  }
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

  if (selectedCourseIds.size === 0) {
    alert("Please select at least one course from the table before continuing.");
    return;
  }

  try {
    continueCycleBtn.disabled = true;
    continueCycleBtn.textContent = "Saving...";

    // Gather selected course full objects
    const chosenCourses = masterCoursesCache.filter(c => selectedCourseIds.has(c.id));

    // Save as a single document into application_cycles collection with auto ID
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
    
    // Reset and return to dashboard
    selectedCourseIds.clear();
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

// Event bindings
if (openModalBtn) openModalBtn.addEventListener('click', showCycleBuilder);
document.querySelectorAll('.action-step-1').forEach(el => el.addEventListener('click', showCycleBuilder));
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', cancelCycleCreation);
if (continueCycleBtn) continueCycleBtn.addEventListener('click', handleContinueCycle);

// Retain handlers for other untouched UI elements
const viewAppsBtn = document.getElementById('viewAppsBtn');
if (viewAppsBtn) viewAppsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("View Applications clicked"); });

const manageFieldsBtn = document.getElementById('manageFieldsBtn');
if (manageFieldsBtn) manageFieldsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("Manage Fields clicked"); });

const viewReportsBtn = document.getElementById('viewReportsBtn');
if (viewReportsBtn) viewReportsBtn.addEventListener('click', (e) => { e.preventDefault(); alert("View Reports clicked"); });

document.querySelectorAll('#guideLink, #supportLink, #privacyLink, #termsLink').forEach(link => {
  link.addEventListener('click', (e) => { e.preventDefault(); alert(link.textContent + " clicked"); });
});

