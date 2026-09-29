// Import Firebase services connected via firebase-config.js
import { auth, db, storage, analytics } from "./firebase-config.js";
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Ensure zero horizontal overflow on load
document.documentElement.style.overflowX = "hidden";
document.body.style.overflowX = "hidden";

// Modal Elements
const modalOverlay = document.getElementById('createModalOverlay');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const submitCycleBtn = document.getElementById('submitCycleBtn');
const cycleNameInput = document.getElementById('cycleNameInput');

// Step 2 Dashboard Elements
const modalStep1Body = document.getElementById('modalStep1Body');
const modalStep1Footer = document.getElementById('modalStep1Footer');
const modalStep2Body = document.getElementById('modalStep2Body');
const modalStep2Footer = document.getElementById('modalStep2Footer');
const selectedBadgesContainer = document.getElementById('selectedBadgesContainer');
const addDegreeDropdownBtn = document.getElementById('addDegreeDropdownBtn');
const addDegreeDropdownList = document.getElementById('addDegreeDropdownList');
const masterCoursesTableBody = document.getElementById('masterCoursesTableBody');
const selectedCourseCountText = document.getElementById('selectedCourseCountText');
const cancelCycleBtn = document.getElementById('cancelCycleBtn');
const continueCycleBtn = document.getElementById('continueCycleBtn');
const openingDateInput = document.getElementById('openingDateInput');
const closingDateInput = document.getElementById('closingDateInput');

// App State
let currentCycleData = {
  name: '',
  selectedDegrees: []
};

// Open Modal Function
function openCreateModal(e) {
  if (e) e.preventDefault();
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');
    resetModalToStep1();
  }
}

// Close Modal Function (Strictly via Cancel or X)
function closeCreateModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

function resetModalToStep1() {
  if (modalStep1Body) modalStep1Body.style.display = 'block';
  if (modalStep1Footer) modalStep1Footer.style.display = 'flex';
  if (modalStep2Body) modalStep2Body.style.display = 'none';
  if (modalStep2Footer) modalStep2Footer.style.display = 'none';
  if (cycleNameInput) cycleNameInput.value = '';
  document.querySelectorAll('input[name="degreeType"]').forEach(cb => cb.checked = false);
}

// Step 1: User clicks "Create Cycle"
async function submitCreateCycle(e) {
  if (e) e.preventDefault();
  const cycleName = cycleNameInput ? cycleNameInput.value.trim() : '';
  const checkedBoxes = document.querySelectorAll('input[name="degreeType"]:checked');
  
  if (!cycleName) {
    alert('Please enter an application cycle name.');
    return;
  }
  if (checkedBoxes.length === 0) {
    alert('Please select at least one degree type.');
    return;
  }

  currentCycleData.name = cycleName;
  currentCycleData.selectedDegrees = Array.from(checkedBoxes).map(cb => cb.value);

  // Transition UI to Step 2 Dashboard (Reference Image view)
  if (modalStep1Body) modalStep1Body.style.display = 'none';
  if (modalStep1Footer) modalStep1Footer.style.display = 'none';
  if (modalStep2Body) modalStep2Body.style.display = 'block';
  if (modalStep2Footer) modalStep2Footer.style.display = 'flex';

  renderDegreeBadges();
  await loadMasterCoursesIntoTable();
}

// Render Top Degree Badges & Manage "Add Degree" Dropdown State
function renderDegreeBadges() {
  if (!selectedBadgesContainer) return;
  selectedBadgesContainer.innerHTML = '';

  const allPossibleDegrees = ['Undergraduate degrees', 'Postgraduate degrees', 'Research degrees'];
  
  // Render Badges
  currentCycleData.selectedDegrees.forEach(deg => {
    const badge = document.createElement('div');
    badge.style.cssText = 'background: #eaf5ff; border: 1px solid #b3d7ff; color: var(--blue); padding: 4px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 650; display: flex; align-items: center; gap: 6px;';
    badge.innerHTML = `<span>🎓</span> ${deg} <button type="button" data-deg="${deg}" class="remove-deg-btn" style="background:none; border:none; color:var(--blue); cursor:pointer; font-weight:bold;">×</button>`;
    selectedBadgesContainer.appendChild(badge);
  });

  // Handle Remove Badge Inside Dashboard
  document.querySelectorAll('.remove-deg-btn').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const degToRemove = ev.target.getAttribute('data-deg');
      if (currentCycleData.selectedDegrees.length === 1) {
        alert('You must have at least one degree type selected.');
        return;
      }
      currentCycleData.selectedDegrees = currentCycleData.selectedDegrees.filter(d => d !== degToRemove);
      renderDegreeBadges();
      updateAddDegreeButtonState();
    });
  });

  updateAddDegreeButtonState();
}

function updateAddDegreeButtonState() {
  const allPossibleDegrees = ['Undergraduate degrees', 'Postgraduate degrees', 'Research degrees'];
  const remainingDegrees = allPossibleDegrees.filter(d => !currentCycleData.selectedDegrees.includes(d));

  if (remainingDegrees.length === 0) {
    addDegreeDropdownBtn.disabled = true;
    addDegreeDropdownBtn.style.opacity = '0.5';
    addDegreeDropdownBtn.style.cursor = 'not-allowed';
  } else {
    addDegreeDropdownBtn.disabled = false;
    addDegreeDropdownBtn.style.opacity = '1';
    addDegreeDropdownBtn.style.cursor = 'pointer';
  }

  // Populate dropdown options
  if (addDegreeDropdownList) {
    addDegreeDropdownList.innerHTML = '';
    remainingDegrees.forEach(rem => {
      const item = document.createElement('div');
      item.style.cssText = 'padding: 8px 14px; font-size: 13px; color: var(--navy); cursor: pointer; transition: background 0.1s;';
      item.textContent = rem;
      item.onmouseover = () => item.style.background = '#f0f6fc';
      item.onmouseout = () => item.style.background = '#fff';
      item.onclick = () => {
        currentCycleData.selectedDegrees.push(rem);
        renderDegreeBadges();
        addDegreeDropdownList.style.display = 'none';
      };
      addDegreeDropdownList.appendChild(item);
    });
  }
}

// Toggle Dropdown Menu
if (addDegreeDropdownBtn) {
  addDegreeDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = addDegreeDropdownList.style.display === 'block';
    addDegreeDropdownList.style.display = isVisible ? 'none' : 'block';
  });
}

window.addEventListener('click', () => {
  if (addDegreeDropdownList) addDegreeDropdownList.style.display = 'none';
});

// Load Master Courses from Firestore `master_courses` Collection
async function loadMasterCoursesIntoTable() {
  if (!masterCoursesTableBody) return;
  masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--muted);">Loading master courses...</td></tr>`;

  try {
    const querySnapshot = await getDocs(collection(db, "master_courses"));
    masterCoursesTableBody.innerHTML = '';

    if (querySnapshot.empty) {
      masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--muted);">No master courses found in database.</td></tr>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const courseId = docSnap.id;

      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom: 1px solid var(--line); transition: background 0.1s;';
      tr.onmouseover = () => tr.style.background = '#fafcfe';
      tr.onmouseout = () => tr.style.background = '#fff';

      tr.innerHTML = `
        <td style="padding: 12px;"><input type="checkbox" class="course-checkbox" value="${courseId}" data-coursedata='${JSON.stringify(data)}' style="width: 16px; height: 16px; accent-color: var(--blue); cursor: pointer;"></td>
        <td style="padding: 12px; font-weight: 650; color: var(--navy);">${data.course || ''}</td>
        <td style="padding: 12px; color: var(--muted);">${data.studyMode || ''}</td>
        <td style="padding: 12px; color: var(--muted);">${data.campus || ''}</td>
        <td style="padding: 12px; color: var(--muted);">${data.academicYear || new Date().getFullYear()}</td>
      `;
      masterCoursesTableBody.appendChild(tr);
    });

    attachCourseSelectionListeners();
  } catch (error) {
    console.error("Error loading master courses:", error);
    masterCoursesTableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #e53e3e;">Error loading courses. Check console permissions.</td></tr>`;
  }
}

function attachCourseSelectionListeners() {
  const checkboxes = document.querySelectorAll('.course-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateSelectedCourseCount);
  });
}

function updateSelectedCourseCount() {
  const checked = document.querySelectorAll('.course-checkbox:checked');
  if (selectedCourseCountText) {
    selectedCourseCountText.textContent = `${checked.length} course${checked.length === 1 ? '' : 's'} selected`;
  }
}

// Final Save on "Continue" Click -> Writes single document to `application_cycles`
async function handleContinueCycle(e) {
  if (e) e.preventDefault();

  const openingDate = openingDateInput ? openingDateInput.value : '';
  const closingDate = closingDateInput ? closingDateInput.value : '';
  const checkedCourses = document.querySelectorAll('.course-checkbox:checked');

  if (!openingDate || !closingDate) {
    alert('Please select both an opening date and a closing date.');
    return;
  }
  if (checkedCourses.length === 0) {
    alert('Please select at least one course for this application cycle.');
    return;
  }

  const selectedCoursesList = Array.from(checkedCourses).map(cb => JSON.parse(cb.getAttribute('data-coursedata')));

  const cyclePayload = {
    cycleName: currentCycleData.name,
    degreeTypes: currentCycleData.selectedDegrees,
    openingDate: openingDate,
    closingDate: closingDate,
    courses: selectedCoursesList,
    createdAt: serverTimestamp()
  };

  try {
    continueCycleBtn.textContent = 'Saving...';
    continueCycleBtn.disabled = true;

    // Save into Firestore collection `application_cycles` with automatic document ID
    const docRef = await addDoc(collection(db, "application_cycles"), cyclePayload);
    
    alert(`Success! Application cycle created with ID: ${docRef.id}`);
    closeCreateModal();
  } catch (error) {
    console.error("Error saving application cycle:", error);
    alert('Failed to save cycle. Check console permissions.');
  } finally {
    continueCycleBtn.textContent = 'Continue →';
    continueCycleBtn.disabled = false;
  }
}

// Event Listeners for Modal Flow
if (openModalBtn) openModalBtn.addEventListener('click', openCreateModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeCreateModal);
if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeCreateModal);
if (cancelCycleBtn) cancelCycleBtn.addEventListener('click', closeCreateModal);
if (submitCycleBtn) submitCycleBtn.addEventListener('click', submitCreateCycle);
if (continueCycleBtn) continueCycleBtn.addEventListener('click', handleContinueCycle);

// Prevent clicking backdrop from closing the modal (must use Cancel or X)
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      // Do nothing - modal stays open until Cancel or X is pressed
    }
  });
}

// Step card & footer link action handlers
document.querySelectorAll('.action-step-1').forEach(el => {
  el.addEventListener('click', openCreateModal);
});

const viewAppsBtn = document.getElementById('viewAppsBtn');
if (viewAppsBtn) {
  viewAppsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert("View Applications clicked");
  });
}

const manageFieldsBtn = document.getElementById('manageFieldsBtn');
if (manageFieldsBtn) {
  manageFieldsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Manage Fields clicked");
  });
}

const viewReportsBtn = document.getElementById('viewReportsBtn');
if (viewReportsBtn) {
  viewReportsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert("View Reports clicked");
  });
}

