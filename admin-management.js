import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.documentElement.style.overflowX = "hidden";
document.body.style.overflowX = "hidden";

// 30-MINUTE INACTIVITY TIMER SETUP (Robust Interval Check)
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds
let lastActivityTime = Date.now();

function updateActivityTime() {
  lastActivityTime = Date.now();
}

['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'].forEach(eventType => {
  window.addEventListener(eventType, updateActivityTime, { passive: true });
});

setInterval(() => {
  if (Date.now() - lastActivityTime >= INACTIVITY_LIMIT) {
    signOut(auth).then(() => {
      window.location.href = 'admin-home.html#sign-in';
    });
    lastActivityTime = Date.now();
  }
}, 1000);

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

// FETCH AND RENDER PUBLISHED APPLICATION CYCLES
let cachedCycles = [];

async function fetchAndRenderApplicationCycles() {
  const years = [2025, 2026, 2027, 2028];
  const quals = ['undergraduate', 'postgraduate', 'research'];
  let allCycles = [];

  for (const yr of years) {
    for (const q of quals) {
      const colName = `${yr}_${q}_admissions`;
      try {
        const querySnap = await getDocs(collection(db, colName));
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          allCycles.push({
            id: docSnap.id,
            collectionName: colName,
            ...data
          });
        });
      } catch (err) {
        // Skip collections that don't exist
      }
    }
  }

  cachedCycles = allCycles;
  renderSidebarFolders(cachedCycles);
}

function renderSidebarFolders(cycles, searchQuery = "") {
  const container = document.getElementById('cyclesFoldersContainer');
  const emptyState = document.getElementById('emptyCyclesState');
  const countBadge = document.getElementById('cyclesCountBadge');

  if (!container) return;
  container.innerHTML = '';

  const filteredCycles = cycles.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (c.cycleName && c.cycleName.toLowerCase().includes(q)) ||
           (c.folderName && c.folderName.toLowerCase().includes(q)) ||
           (c.qualificationType && c.qualificationType.toLowerCase().includes(q));
  });

  if (countBadge) countBadge.textContent = filteredCycles.length;

  if (filteredCycles.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Group by folderName
  const folderMap = new Map();
  filteredCycles.forEach(cycle => {
    const folderName = cycle.folderName || 'Application Cycles';
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, []);
    }
    folderMap.get(folderName).push(cycle);
  });

  folderMap.forEach((cycleList, folderName) => {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-item open'; // Default open or closed

    const header = document.createElement('div');
    header.className = 'folder-header';
    header.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      <span>${folderName}</span>
      <div class="folder-chevron"></div>
    `;

    header.addEventListener('click', () => {
      folderDiv.classList.toggle('open');
    });

    const contentDiv = document.createElement('div');
    contentDiv.className = 'folder-content';

    cycleList.forEach(cycle => {
      const subItem = document.createElement('div');
      subItem.className = 'cycle-sub-item';
      subItem.textContent = cycle.cycleName || 'Unnamed Cycle';

      subItem.addEventListener('click', () => {
        document.querySelectorAll('.cycle-sub-item').forEach(el => el.classList.remove('active'));
        subItem.classList.add('active');
        displayCycleDetails(cycle);
      });

      contentDiv.appendChild(subItem);
    });

    folderDiv.appendChild(header);
    folderDiv.appendChild(contentDiv);
    container.appendChild(folderDiv);
  });
}

// Display Cycle Details in Centre Main Content Area (Matching Screenshot)
function displayCycleDetails(cycle) {
  const welcomeView = document.getElementById('welcomeView');
  const cycleDetailView = document.getElementById('cycleDetailView');

  if (welcomeView) welcomeView.style.display = 'none';
  if (cycleDetailView) cycleDetailView.style.display = 'flex';

  const detailCycleName = document.getElementById('detailCycleName');
  const detailStatusBadge = document.getElementById('detailStatusBadge');
  const detailDegreeType = document.getElementById('detailDegreeType');
  const detailOpeningDate = document.getElementById('detailOpeningDate');
  const detailClosingDate = document.getElementById('detailClosingDate');

  const tableDegreeType = document.getElementById('tableDegreeType');
  const tableOpeningDate = document.getElementById('tableOpeningDate');
  const tableClosingDate = document.getElementById('tableClosingDate');
  const tableStatus = document.getElementById('tableStatus');

  if (detailCycleName) detailCycleName.textContent = cycle.cycleName || 'Application Cycle';
  if (detailDegreeType) detailDegreeType.textContent = cycle.qualificationType || 'Undergraduate';
  if (detailOpeningDate) detailOpeningDate.textContent = `Opens ${cycle.openingDate || 'N/A'}`;
  if (detailClosingDate) detailClosingDate.textContent = `Closes ${cycle.closingDate || 'N/A'}`;

  if (tableDegreeType) tableDegreeType.textContent = cycle.qualificationType || 'Undergraduate';
  if (tableOpeningDate) tableOpeningDate.textContent = cycle.openingDate || 'N/A';
  if (tableClosingDate) tableClosingDate.textContent = cycle.closingDate || 'N/A';

  const isOpen = cycle.status === 'published' && !cycle.isManuallyClosed;
  if (detailStatusBadge) {
    detailStatusBadge.textContent = isOpen ? 'Open' : 'Closed';
    detailStatusBadge.style.background = isOpen ? '#eaf5ff' : '#ffeaea';
    detailStatusBadge.style.color = isOpen ? '#0866f5' : '#e53e3e';
  }
  if (tableStatus) {
    tableStatus.textContent = isOpen ? '● Open' : '● Closed';
  }
}

// Search filter inside sidebar
const sidebarCycleSearch = document.getElementById('sidebarCycleSearch');
if (sidebarCycleSearch) {
  sidebarCycleSearch.addEventListener('input', (e) => {
    renderSidebarFolders(cachedCycles, e.target.value);
  });
}

// Navigation to Admin Builder (`Admin.html`) when creating a new cycle
const newCycleNavBtn = document.getElementById('newCycleNavBtn');
const createCycleWelcomeBtn = document.getElementById('createCycleWelcomeBtn');
const quickActionCreateCycle = document.getElementById('quickActionCreateCycle');

function goToAdminBuilder(e) {
  if (e) e.preventDefault();
  window.location.href = 'Admin.html';
}

if (newCycleNavBtn) newCycleNavBtn.addEventListener('click', goToAdminBuilder);
if (createCycleWelcomeBtn) createCycleWelcomeBtn.addEventListener('click', goToAdminBuilder);
if (quickActionCreateCycle) quickActionCreateCycle.addEventListener('click', goToAdminBuilder);

// Load cycles on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderApplicationCycles();
});
