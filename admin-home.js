import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* =====================================================
   1. PANEL MANAGEMENT
===================================================== */
const panels = {
    home: document.getElementById("homePanel"),
    activate: document.getElementById("activatePanel"),
    signin: document.getElementById("signinPanel"),
    forgot: document.getElementById("forgotPanel")
};

function showPanel(panelName) {
    if (!panels[panelName]) return;
    const rightSection = document.getElementById("rightSection");

    Object.values(panels).forEach(panel => {
        panel.hidden = true;
    });

    const selectedPanel = panels[panelName];
    selectedPanel.hidden = false;
    selectedPanel.style.animation = "none";
    void selectedPanel.offsetWidth;
    selectedPanel.style.animation = "";

    if (window.innerWidth <= 760) {
        requestAnimationFrame(() => {
            rightSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }
}

// Make showPanel globally available for inline onclick handlers
window.showPanel = showPanel;

/* =====================================================
   2. NAVIGATION MENU
===================================================== */
const menuButton = document.getElementById("menuButton");
const menuDropdown = document.getElementById("menuDropdown");

menuButton.addEventListener("click", () => {
    const isOpen = !menuDropdown.hidden;
    menuDropdown.hidden = isOpen;
    menuButton.classList.toggle("active", !isOpen);
    menuButton.setAttribute("aria-expanded", String(!isOpen));
});

function closeMenu() {
    menuDropdown.hidden = true;
    menuButton.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", event => {
    if (!menuButton.contains(event.target) && !menuDropdown.contains(event.target)) {
        closeMenu();
    }
});

/* =====================================================
   3. PASSWORD / PIN VISIBILITY
===================================================== */
document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.target);
        if (!target) return;
        const isPassword = target.type === "password";
        target.type = isPassword ? "text" : "password";
        button.setAttribute("aria-label", isPassword ? "Hide PIN" : "Show PIN");
    });
});

/* =====================================================
   4. TOAST NOTIFICATIONS
===================================================== */
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

window.showToast = showToast;

/* =====================================================
   5. ACTIVATION FORM LOGIC
===================================================== */
const activationForm = document.getElementById("activationForm");

activationForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("activationTitle").value;
    const surname = document.getElementById("activationSurname").value.trim();
    const email = document.getElementById("activationEmail").value.trim();
    const role = document.getElementById("activationRole").value;
    const campus = document.getElementById("activationCampus").value;
    const temporaryPassword = document.getElementById("temporaryPassword").value;
    const newPin = document.getElementById("newPin").value;
    const confirmPin = document.getElementById("confirmPin").value;

    if (newPin !== confirmPin) {
        showToast("Details invalid", "error");
        return;
    }

    if (!/^[0-9]{6}$/.test(newPin)) {
        showToast("Details invalid", "error");
        return;
    }

    // Map role to pre-approved and active target collections
    let preApprovedCollection = '';
    let targetCollection = '';

    if (role === 'Administration') {
        preApprovedCollection = 'pre_approved_admins';
        targetCollection = 'admins';
    } else if (role === 'Admissions') {
        preApprovedCollection = 'pre_approved_admissions';
        targetCollection = 'admissions';
    } else if (role === 'Technical Support') {
        preApprovedCollection = 'pre_approved_system_admins';
        targetCollection = 'system_admins';
    } else {
        showToast("Details invalid", "error");
        return;
    }

    try {
        // Query pre-approved collection
        const preApprovedRef = collection(db, preApprovedCollection);
        const q = query(
            preApprovedRef,
            where('title', '==', title),
            where('surname', '==', surname),
            where('email', '==', email),
            where('role', '==', role),
            where('campus', '==', campus),
            where('temporaryPassword', '==', temporaryPassword)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast("Details invalid", "error");
            return;
        }

        // Create user in Firebase Auth using email and new 6-digit PIN
        const userCredential = await createUserWithEmailAndPassword(auth, email, newPin);
        const user = userCredential.user;

        // Generate 8-digit Personnel Number (2-digit year + 6 random digits)
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
        const personnelNumber = `${yearSuffix}${randomDigits}`;

        // Save profile in target collection
        await setDoc(doc(db, targetCollection, user.uid), {
            uid: user.uid,
            personnelNumber,
            title,
            surname,
            email,
            role,
            campus,
            createdAt: new Date().toISOString()
        });

        // Queue welcome email
        await setDoc(doc(collection(db, "mail")), {
            to: email,
            message: {
                subject: "Welcome to MyAtlas — Your Personnel Number",
                text: `Hello ${title} ${surname},\n\nYour MyAtlas account has been successfully activated.\n\nYour MyAtlas Personnel Number is: ${personnelNumber}\n\nPlease keep this safe as you will need it to sign in.\n\nBest regards,\nAtlas College Admin Team`,
                html: `<div style="font-family: sans-serif; padding: 20px; color: #071c72;"><h2>Welcome, ${title} ${surname}!</h2><p>Your MyAtlas account has been successfully activated.</p><p>Your Personnel Number is: <strong>${personnelNumber}</strong></p></div>`
            }
        });

        showToast("Account activated successfully! Check your email for your Personnel Number.", "success");
        showPanel("signin");

    } catch (error) {
        console.error("Activation Error:", error);
        showToast("Details invalid", "error");
    }
});

/* =====================================================
   6. SIGN IN FORM LOGIC
===================================================== */
const signinForm = document.getElementById("signinForm");

signinForm.addEventListener("submit", async event => {
    event.preventDefault();

    const personnelNumber = document.getElementById("personnelNumber").value.trim();
    const email = document.getElementById("signinEmail").value.trim();
    const role = document.getElementById("signinRole").value;
    const campus = document.getElementById("signinCampus").value;
    const pin = document.getElementById("signinPin").value;

    let targetCollection = '';
    if (role === 'Administration') {
        targetCollection = 'admins';
    } else if (role === 'Admissions') {
        targetCollection = 'admissions';
    } else if (role === 'Technical Support') {
        targetCollection = 'system_admins';
    } else {
        showToast("Details invalid.", "error");
        return;
    }

    try {
        // 1. Authenticate with Firebase Auth using email and PIN
        const userCredential = await signInWithEmailAndPassword(auth, email, pin);
        const user = userCredential.user;

        // 2. Verify secondary parameters in Firestore
        const activeRef = collection(db, targetCollection);
        const q = query(
            activeRef,
            where('uid', '==', user.uid),
            where('personnelNumber', '==', personnelNumber),
            where('email', '==', email),
            where('role', '==', role),
            where('campus', '==', campus)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast("Details invalid.", "error");
            return;
        }

        // Success redirect
        showToast("Sign in successful! Redirecting...", "success");
        setTimeout(() => {
            window.location.href = 'admin-portal.html';
        }, 1000);

    } catch (error) {
        console.error("Sign-In Error:", error);
        showToast("Details invalid.", "error");
    }
});

/* =====================================================
   7. FORGOT PASSWORD FORM LOGIC
===================================================== */
const forgotForm = document.getElementById("forgotForm");

forgotForm.addEventListener("submit", event => {
    event.preventDefault();
    showToast("Password recovery instructions have been noted.");
});

// Initial load state
showPanel("home");
