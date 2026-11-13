import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
  // If no user is logged in, immediately redirect to sign in
  if (!user) {
    window.location.href = "admin-home.html";
    return;
  }

  try {
    // Search the three active staff database collections matching your role architecture
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

    // If account exists in Auth but not in staff database tables, sign out and block access
    if (!profileData) {
      await signOut(auth);
      window.location.href = "admin-home.html";
      return;
    }

    // Extract details
    const title = (profileData.title || "").trim();
    const surname = (profileData.surname || "").trim();
    const surnameInitial = surname ? surname.charAt(0).toUpperCase() : "A";
    const email = (profileData.email || user.email || "").trim();
    const rawRole = (profileData.role || "Staff").trim();
    const formattedRole = rawRole.replace(/_/g, " ");

    // 2. The Profile Icon: Show first letter of surname
    if (userAvatar) {
      userAvatar.textContent = surnameInitial;
    }

    // 3. The Profile Card: Show Title + Surname, Email, and Formatted Role
    if (dropdownUserName) {
      dropdownUserName.textContent = title ? `${title} ${surname}` : surname;
    }

    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = email;
    }

    if (dropdownUserRole) {
      dropdownUserRole.textContent = formattedRole;
    }

  } catch (error) {
    console.error("Security verification error:", error);
    window.location.href = "admin-home.html";
  }
});

/* =====================================================
   3. PROFILE DROPDOWN MENU TOGGLE
===================================================== */
if (userMenuTrigger && userDropdownMenu) {
  userMenuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    userDropdownMenu.classList.toggle("active");
  });

  // Close dropdown when clicking outside
  window.addEventListener("click", () => {
    if (userDropdownMenu.classList.contains("active")) {
      userDropdownMenu.classList.remove("active");
    }
  });
}

/* =====================================================
   4. LOGOUT FEATURE
===================================================== */
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
