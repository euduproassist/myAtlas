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

let currentPanel = "home";

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

    currentPanel = panelName;
    closeMenu();

    if (window.innerWidth <= 760) {
        requestAnimationFrame(() => {
            rightSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }
}

/* =====================================================
   2. NAVIGATION & EVENT BINDINGS
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

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMenu();
    }
});

// Bind UI Navigation buttons programmatically
document.getElementById("navHomeBrand").addEventListener("click", () => showPanel("home"));
document.getElementById("btnGoActivate").addEventListener("click", () => showPanel("activate"));
document.getElementById("linkGoSignin").addEventListener("click", (e) => { e.preventDefault(); showPanel("signin"); });
document.getElementById("linkGoForgot").addEventListener("click", (e) => { e.preventDefault(); showPanel("forgot"); });

// Dropdown menu buttons
document.querySelectorAll(".menu-dropdown button[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => showPanel(btn.getAttribute("data-panel")));
});

// Back links
document.querySelectorAll("button.back-link[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => showPanel(btn.getAttribute("data-panel")));
});

// Footer links
document.getElementById("footerPrivacy").addEventListener("click", (e) => { e.preventDefault(); showToast("Privacy Policy page will be connected later."); });
document.getElementById("footerTerms").addEventListener("click", (e) => { e.preventDefault(); showToast("Terms & Conditions page will be connected later."); });
document.getElementById("footerHelp").addEventListener("click", (e) => { e.preventDefault(); showToast("Help section will be connected later."); });

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
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

/* =====================================================
   5. ACTIVATION FORM SUBMISSION
===================================================== */
const activationForm = document.getElementById("activationForm");

activationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("activationTitle").value.trim();
    const surname = document.getElementById("activationSurname").value.trim();
    const email = document.getElementById("activationEmail").value.trim();
    const role = document.getElementById("activationRole").value;
    const campus = document.getElementById("activationCampus").value;
    const temporaryPassword = document.getElementById("temporaryPassword").value;
    const newPin = document.getElementById("newPin").value;
    const confirmPin = document.getElementById("confirmPin").value;

    if (newPin !== confirmPin) {
        showToast("Your new PIN and confirmation PIN do not match.", "error");
        document.getElementById("confirmPin").focus();
        return;
    }

    if (!/^[0-9]{6}$/.test(newPin)) {
        showToast("Your PIN must contain exactly 6 digits.", "error");
        document.getElementById("newPin").focus();
        return;
    }

    let preApprovedCollection = "";
    let targetCollection = "";

    if (role === "Admissions") {
        preApprovedCollection = "pre_approved_admissions";
        targetCollection = "admissions_staff";
    } else if (role === "Administration") {
        preApprovedCollection = "pre_approved_administrators";
        targetCollection = "administrators";
    } else if (role === "Technical Support") {
        preApprovedCollection = "pre_approved_tech_support";
        targetCollection = "technical_support";
    } else {
        showToast("Details invalid", "error");
        return;
    }

    try {
        const preApprovedRef = collection(db, preApprovedCollection);
        const q = query(
            preApprovedRef,
            where("title", "==", title),
            where("surname", "==", surname),
            where("email", "==", email),
            where("role", "==", role),
            where("campus", "==", campus),
            where("temporaryPassword", "==", temporaryPassword)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast("Details invalid", "error");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, newPin);
        const user = userCredential.user;

        const currentYearSuffix = new Date().getFullYear().toString().slice(-2);
        const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
        const personnelNumber = `${currentYearSuffix}${randomDigits}`;

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

        await setDoc(doc(collection(db, "mail")), {
            to: email,
            message: {
                subject: "Welcome to MyAtlas — Your Personnel Number",
                text: `Hello ${title} ${surname},\n\nYour MyAtlas account has been successfully activated.\n\nYour MyAtlas Personnel Number is: ${personnelNumber}\n\nPlease keep this number safe as you will need it to sign in to the portal.\n\nBest regards,\nAtlas College Admin Team`,
                html: `
                  <div style="font-family: sans-serif; background-color: #f5f9ff; padding: 40px 20px; color: #071c72;">
                    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #cfe3ff;">
                      <div style="background-color: #071c72; padding: 25px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">ATLAS COLLEGE</h1>
                        <p style="color: #0866f5; margin: 5px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase;">Admin Portal Activation</p>
                      </div>
                      <div style="padding: 30px;">
                        <h2 style="color: #071c72; margin-top: 0;">Welcome, ${title} ${surname}!</h2>
                        <p style="color: #244b88; font-size: 15px; line-height: 1.5;">Your MyAtlas admin account has been successfully activated. Below is your generated personnel number required for signing in:</p>
                        <div style="background-color: #eaf5ff; border: 1px dashed #0866f5; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
                          <span style="display: block; font-size: 12px; color: #7897c5; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your Personnel Number</span>
                          <span style="font-size: 28px; font-weight: 800; color: #0866f5; letter-spacing: 2px;">${personnelNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `
            }
        });

        showToast("Account activated successfully! Check your email for your Personnel Number.");
        setTimeout(() => {
            showPanel("signin");
        }, 1500);

    } catch (error) {
        console.error("Activation Error:", error);
        showToast("Details invalid", "error");
    }
});

/* =====================================================
   6. SIGN IN FORM SUBMISSION
===================================================== */
const signinForm = document.getElementById("signinForm");

signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const personnelNumber = document.getElementById("personnelNumber").value.trim();
    const email = document.getElementById("signinEmail").value.trim();
    const role = document.getElementById("signinRole").value;
    const campus = document.getElementById("signinCampus").value;
    const pin = document.getElementById("signinPin").value;

    let targetCollection = "";
    if (role === "Admissions") {
        targetCollection = "admissions_staff";
    } else if (role === "Administration") {
        targetCollection = "administrators";
    } else if (role === "Technical Support") {
        targetCollection = "technical_support";
    } else {
        showToast("Details invalid.", "error");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pin);
        const user = userCredential.user;

        const activeRef = collection(db, targetCollection);
        const q = query(
            activeRef,
            where("uid", "==", user.uid),
            where("personnelNumber", "==", personnelNumber),
            where("email", "==", email),
            where("role", "==", role),
            where("campus", "==", campus)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast("Details invalid.", "error");
            return;
        }

        showToast("Sign-in successful! Redirecting...");
        setTimeout(() => {
            window.location.href = "admin-portal.html";
        }, 1000);

    } catch (error) {
        console.error("Sign-In Error:", error);
        showToast("Details invalid.", "error");
    }
});

/* =====================================================
   7. FORGOT PASSWORD / PIN FORM
===================================================== */
const forgotForm = document.getElementById("forgotForm");

forgotForm.addEventListener("submit", event => {
    event.preventDefault();
    showToast("Recovery instructions have been sent to your email.");
});

/* =====================================================
   8. INITIAL STATE
===================================================== */
showPanel("home");
