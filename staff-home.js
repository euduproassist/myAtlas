// Import Firebase services connected via firebase-config.js
import { auth, db, storage, analytics } from "./firebase-config.js";

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

// Open Modal Function
function openCreateModal(e) {
  if (e) e.preventDefault();
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Close Modal Function
function closeCreateModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// Handle overlay backdrop click
function handleOverlayClick(e) {
  if (e.target === modalOverlay) {
    closeCreateModal();
  }
}

// Submit Create Cycle action
function submitCreateCycle(e) {
  if (e) e.preventDefault();
  const cycleName = cycleNameInput ? cycleNameInput.value : '';
  const checkedBoxes = document.querySelectorAll('input[name="degreeType"]:checked');
  
  alert(`[Simulated Action] Create Cycle clicked!\nName: "${cycleName || '(Blank)'}"\nSelected Categories: ${checkedBoxes.length}`);
  closeCreateModal();
}

// Event Listeners for Modal
if (openModalBtn) openModalBtn.addEventListener('click', openCreateModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeCreateModal);
if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeCreateModal);
if (modalOverlay) modalOverlay.addEventListener('click', handleOverlayClick);
if (submitCycleBtn) submitCycleBtn.addEventListener('click', submitCreateCycle);

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

const guideLinks = document.querySelectorAll('#guideLink, #supportLink');
guideLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Setup Guide & Support");
  });
});

const privacyLink = document.getElementById('privacyLink');
if (privacyLink) {
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Privacy Policy");
  });
}

const termsLink = document.getElementById('termsLink');
if (termsLink) {
  termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Terms & Conditions");
  });
}
