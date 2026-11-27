import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const ACCOUNTS_COLLECTION = "applicant_accounts";
const COMPLETE_APPLICATION_COLLECTION = "complete_application";
const MAIL_COLLECTION = "mail";

function normalizeEmailId(email) {
    return encodeURIComponent(email.trim().toLowerCase());
}

// =========================================================
// DOM REFERENCES
// =========================================================
const pageShell = document.getElementById("pageShell");
const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");
const forgotPasswordView = document.getElementById("forgotPasswordView");
const portalView = document.getElementById("portalView");
const portalTitle = document.getElementById("portalTitle");
const portalSubtitle = document.getElementById("portalSubtitle");
const profileButton = document.getElementById("profileButton");
const startApplicationBtn = document.getElementById("startApplicationBtn");

const signInBtn = document.getElementById("signInBtn");
const createAccountBtn = document.getElementById("createAccountBtn");
const sendResetLinkBtn = document.getElementById("sendResetLinkBtn");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const goToSignUpLink = document.getElementById("goToSignUpLink");
const goToSignInFromSignUp = document.getElementById("goToSignInFromSignUp");
const backToSignInFromForgot = document.getElementById("backToSignInFromForgot");

const toastContainer = document.getElementById("toastContainer");

// Password Requirement Pop-Up (JOptionPane style, colorless)
const passwordReqModal = document.getElementById("passwordReqModal");
const closePasswordReqBtn = document.getElementById("closePasswordReqBtn");
const okPasswordReqBtn = document.getElementById("okPasswordReqBtn");

// OTP Verification Pop-Up (JOptionPane style, colorless, 6 blocks)
const otpModal = document.getElementById("otpModal");
const closeOtpBtn = document.getElementById("closeOtpBtn");
const cancelOtpBtn = document.getElementById("cancelOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpSubText = document.getElementById("otpSubText");
const otpFeedback = document.getElementById("otpFeedback");
const otpBoxes = Array.from(document.querySelectorAll("#otpInputs .otp-box"));

let pendingOtpSession = null;
let allowPortalNavigation = false;

// =========================================================
// FOOTER & BASE NAVIGATION
// =========================================================
document.querySelector(".logo-link").addEventListener("click", (e) => {
    e.preventDefault();
});

document.getElementById("privacyLink").addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Privacy Policy page will be connected later.");
});

document.getElementById("termsLink").addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Terms & Conditions page will be connected later.");
});

document.getElementById("supportLink").addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Help section will be connected later.");
});

startApplicationBtn.addEventListener("click", (e) => {
    e.preventDefault();
});

function showAuthView(viewToShow) {
    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    portalView.classList.add("hidden");
    profileButton.classList.add("hidden");

    viewToShow.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function hasUserApplied(user) {
    const email = (user?.email || "").trim().toLowerCase();
    const uid = user?.uid || "";

    if (uid) {
        const byUidDocSnap = await getDoc(doc(db, COMPLETE_APPLICATION_COLLECTION, uid));
        if (byUidDocSnap.exists()) {
            return true;
        }
    }

    if (email) {
        const byEmailDocSnap = await getDoc(doc(db, COMPLETE_APPLICATION_COLLECTION, normalizeEmailId(email)));
        if (byEmailDocSnap.exists()) {
            return true;
        }

        const emailQuery = query(
            collection(db, COMPLETE_APPLICATION_COLLECTION),
            where("email", "==", email)
        );
        const emailQuerySnap = await getDocs(emailQuery);
        if (!emailQuerySnap.empty) {
            return true;
        }
    }

    if (uid) {
        const uidQuery = query(
            collection(db, COMPLETE_APPLICATION_COLLECTION),
            where("uid", "==", uid)
        );
        const uidQuerySnap = await getDocs(uidQuery);
        if (!uidQuerySnap.empty) {
            return true;
        }
    }

    return false;
}

async function enterPortalDashboard(user = auth.currentUser) {
    allowPortalNavigation = true;
    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    portalView.classList.remove("hidden");
    profileButton.classList.remove("hidden");

    const alreadyApplied = await hasUserApplied(user);
    if (alreadyApplied) {
        if (portalTitle) portalTitle.textContent = "u already applied please";
        if (portalSubtitle) portalSubtitle.textContent = "Your application is already recorded in our system.";
        if (startApplicationBtn) startApplicationBtn.classList.add("hidden");
    } else {
        if (portalTitle) portalTitle.textContent = "No Applications Found";
        if (portalSubtitle) portalSubtitle.textContent = "You have not submitted any applications yet.";
        if (startApplicationBtn) startApplicationBtn.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// AUTH NAVIGATION LOGIC
goToSignUpLink.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthView(signupView);
});

goToSignInFromSignUp.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthView(loginView);
});

// Forgot password is disabled for now
forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
});

backToSignInFromForgot.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthView(loginView);
});

sendResetLinkBtn.addEventListener("click", (e) => {
    e.preventDefault();
});

// =========================================================
// BLUR & JOPTIONPANE POP-UP HELPERS
// =========================================================
function setPageBlurred(shouldBlur) {
    if (shouldBlur) {
        pageShell.classList.add("blurred");
    } else {
        pageShell.classList.remove("blurred");
    }
}

function evaluatePasswordRules(password) {
    const checks = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };
    const allMet = Object.values(checks).every(Boolean);
    return { checks, allMet };
}

function setRuleMark(elementId, isMet) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isMet) {
        el.textContent = "✓";
        el.classList.remove("unmet");
        el.classList.add("met");
    } else {
        el.textContent = "✕";
        el.classList.remove("met");
        el.classList.add("unmet");
    }
}

function openPasswordRequirementsPopup(checks) {
    setRuleMark("reqMarkLength", checks.length);
    setRuleMark("reqMarkUpper", checks.upper);
    setRuleMark("reqMarkLower", checks.lower);
    setRuleMark("reqMarkNumber", checks.number);
    setRuleMark("reqMarkSpecial", checks.special);

    setPageBlurred(true);
    passwordReqModal.classList.add("open");
    passwordReqModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closePasswordRequirementsPopup() {
    passwordReqModal.classList.remove("open");
    passwordReqModal.setAttribute("aria-hidden", "true");
    if (!otpModal.classList.contains("open")) {
        setPageBlurred(false);
        document.body.style.overflow = "";
    }
}

closePasswordReqBtn.addEventListener("click", closePasswordRequirementsPopup);
okPasswordReqBtn.addEventListener("click", closePasswordRequirementsPopup);

function clearOtpBoxes() {
    otpBoxes.forEach((box) => {
        box.value = "";
    });
    otpFeedback.textContent = "";
}

function openOtpPopup(email) {
    clearOtpBoxes();
    otpSubText.textContent = `Enter the 6-digit verification code sent to ${email}.`;
    setPageBlurred(true);
    otpModal.classList.add("open");
    otpModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => otpBoxes[0]?.focus(), 50);
}

function closeOtpPopup() {
    otpModal.classList.remove("open");
    otpModal.setAttribute("aria-hidden", "true");
    if (!passwordReqModal.classList.contains("open")) {
        setPageBlurred(false);
        document.body.style.overflow = "";
    }
}

closeOtpBtn.addEventListener("click", closeOtpPopup);
cancelOtpBtn.addEventListener("click", closeOtpPopup);

// 6-Block OTP Box Navigation & Paste Support
otpBoxes.forEach((box, idx) => {
    box.addEventListener("input", () => {
        box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
        otpFeedback.textContent = "";
        if (box.value && idx < otpBoxes.length - 1) {
            otpBoxes[idx + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && idx > 0) {
            otpBoxes[idx - 1].focus();
        }
    });

    box.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData?.getData("text") || "").replace(/[^0-9]/g, "").slice(0, 6);
        if (!pasted) return;
        pasted.split("").forEach((digit, i) => {
            if (otpBoxes[i]) otpBoxes[i].value = digit;
        });
        const focusIdx = Math.min(pasted.length, otpBoxes.length - 1);
        otpBoxes[focusIdx]?.focus();
    });
});

// =========================================================
// OTP GENERATION & CLEAN LIGHT-BLUE EMAIL QUEUE (/mail)
// =========================================================
function generateSixDigitOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(firstName, email, otpCode) {
    const safeName = firstName || "Applicant";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Atlas College — Email Verification Code</title>
</head>
<body style="margin:0;padding:24px;background-color:#f0f7ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#071c72;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background-color:#ffffff;border:1px solid #cfe3ff;border-radius:10px;overflow:hidden;">
    <tr>
      <td style="background-color:#e6f2ff;padding:20px 24px;border-bottom:1px solid #cfe3ff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#0866f5;">Atlas College</div>
        <div style="font-size:18px;font-weight:750;color:#071c72;margin-top:4px;">Applicant Account Verification</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#244b88;">Hello ${safeName},</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#244b88;">Use the 6-digit verification code below to confirm your email address and activate your applicant account:</p>
        <div style="margin:18px 0;padding:16px;text-align:center;background-color:#f3f9ff;border:1px solid #b8d8ff;border-radius:8px;">
          <span style="font-size:28px;font-weight:800;letter-spacing:8px;color:#0866f5;">${otpCode}</span>
        </div>
        <p style="margin:0;font-size:12.5px;line-height:1.5;color:#526e9e;">If you did not request this verification code, you can safely ignore this email.</p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f7fbff;padding:14px 24px;border-top:1px solid #e1effe;font-size:11.5px;color:#7897c5;">
        © 2026 Atlas College. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>`;

    await addDoc(collection(db, MAIL_COLLECTION), {
        to: email,
        message: {
            subject: "Atlas College — Your 6-Digit Verification Code",
            text: `Hello ${safeName}, your Atlas College verification code is ${otpCode}.`,
            html
        },
        createdAt: serverTimestamp()
    });
}

// =========================================================
// SIGN-UP FLOW (First Name, Password Rules, Existing/Unverified)
// =========================================================
createAccountBtn.addEventListener("click", async () => {
    const firstName = document.getElementById("signupFirstNameInput").value.trim();
    const email = document.getElementById("signupEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("signupPasswordInput").value;
    const confirmPassword = document.getElementById("signupConfirmPasswordInput").value;

    if (!firstName || !email || !password || !confirmPassword) {
        showToast("Please fill in all required fields.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    const { checks, allMet } = evaluatePasswordRules(password);
    if (!allMet) {
        openPasswordRequirementsPopup(checks);
        return;
    }

    createAccountBtn.disabled = true;

    try {
        const accountRef = doc(db, ACCOUNTS_COLLECTION, normalizeEmailId(email));
        const existingSnap = await getDoc(accountRef);

        if (existingSnap.exists()) {
            const existingData = existingSnap.data();

            // Email already exists and account is active -> inform and redirect to Sign In
            if (existingData.activated === true) {
                showToast("An active account with this email already exists. Redirecting to Sign In.", "error");
                document.getElementById("loginEmailInput").value = email;
                showAuthView(loginView);
                return;
            }

            // Email exists but never confirmed OTP -> use the NEW password entered now, refresh OTP, open colorless OTP card
            const otpCode = generateSixDigitOtp();
            await updateDoc(accountRef, {
                firstName,
                email,
                pendingPassword: password,
                otpCode,
                activated: false,
                updatedAt: serverTimestamp()
            });

            await sendOtpEmail(firstName, email, otpCode);

            pendingOtpSession = {
                firstName,
                email,
                password,
                otpCode,
                isExistingUnverified: true
            };

            openOtpPopup(email);
            showToast("Verification code sent to your email.", "success");
            return;
        }

        // Brand-new account registration -> store pending record, send OTP, open colorless 6-block OTP card
        const otpCode = generateSixDigitOtp();
        await setDoc(accountRef, {
            firstName,
            email,
            pendingPassword: password,
            otpCode,
            activated: false,
            createdAt: serverTimestamp()
        });

        await sendOtpEmail(firstName, email, otpCode);

        pendingOtpSession = {
            firstName,
            email,
            password,
            otpCode,
            isExistingUnverified: false
        };

        openOtpPopup(email);
        showToast("Verification code sent to your email.", "success");
    } catch (error) {
        showToast(error.message || "Could not process sign up.", "error");
    } finally {
        createAccountBtn.disabled = false;
    }
});

// =========================================================
// CONFIRM 6-BLOCK OTP & ACTIVATE ACCOUNT
// =========================================================
verifyOtpBtn.addEventListener("click", async () => {
    if (!pendingOtpSession) {
        otpFeedback.textContent = "No active OTP session found.";
        return;
    }

    const enteredOtp = otpBoxes.map((b) => b.value.trim()).join("");
    if (enteredOtp.length < 6) {
        otpFeedback.textContent = "Please enter all 6 digits.";
        return;
    }

    verifyOtpBtn.disabled = true;
    otpFeedback.textContent = "";

    try {
        const accountRef = doc(db, ACCOUNTS_COLLECTION, normalizeEmailId(pendingOtpSession.email));
        const snap = await getDoc(accountRef);
        const currentRecord = snap.exists() ? snap.data() : null;

        const expectedOtp = currentRecord?.otpCode || pendingOtpSession.otpCode;
        const activePassword = currentRecord?.pendingPassword || pendingOtpSession.password;
        const activeFirstName = currentRecord?.firstName || pendingOtpSession.firstName;

        if (enteredOtp !== expectedOtp) {
            otpFeedback.textContent = "The OTP code you entered is incorrect.";
            return;
        }

        // Create or update Firebase Authentication account using the latest password
        try {
            await createUserWithEmailAndPassword(auth, pendingOtpSession.email, activePassword);
        } catch (authErr) {
            if (authErr.code === "auth/email-already-in-use") {
                // If an unverified auth user already existed from an earlier attempt, sign in briefly or note update
                try {
                    await signInWithEmailAndPassword(auth, pendingOtpSession.email, activePassword);
                } catch (_) {
                    // Proceed to mark activated if credentials differ
                }
            } else {
                throw authErr;
            }
        }

        await setDoc(accountRef, {
            firstName: activeFirstName,
            email: pendingOtpSession.email,
            activated: true,
            otpCode: null,
            pendingPassword: null,
            activatedAt: serverTimestamp()
        }, { merge: true });

        // Sign out so user signs in through the Sign In screen
        await signOut(auth);

        const verifiedEmail = pendingOtpSession.email;
        pendingOtpSession = null;
        closeOtpPopup();

        document.getElementById("loginEmailInput").value = verifiedEmail;
        document.getElementById("loginPasswordInput").value = "";
        showToast("Account activated! Please sign in.", "success");
        showAuthView(loginView);
    } catch (error) {
        otpFeedback.textContent = error.message || "Could not verify OTP.";
    } finally {
        verifyOtpBtn.disabled = false;
    }
});

// =========================================================
// SIGN-IN & DASHBOARD AUTHENTICATION GUARD
// =========================================================
signInBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("loginPasswordInput").value;

    if (!email || !password) {
        showToast("Please enter your email address and password.", "error");
        return;
    }

    signInBtn.disabled = true;

    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const signedInEmail = (credential.user?.email || email).toLowerCase();

        const accountSnap = await getDoc(doc(db, ACCOUNTS_COLLECTION, normalizeEmailId(signedInEmail)));
        if (accountSnap.exists()) {
            const data = accountSnap.data();
            if (data.activated === false) {
                await signOut(auth);
                showToast("Please verify your OTP first to activate your account.", "error");
                return;
            }
        }

        await enterPortalDashboard(credential.user);
        showToast("Signed in successfully.", "success");
    } catch (error) {
        showToast("Invalid email or password.", "error");
    } finally {
        signInBtn.disabled = false;
    }
});

profileButton.addEventListener("click", async () => {
    allowPortalNavigation = false;
    try {
        await signOut(auth);
    } catch (_) {
        // Ignore sign-out errors
    }
    showAuthView(loginView);
});

// Dashboard guard: if user is not genuinely authorized/authenticated, silently kick back to Sign In with no alert
onAuthStateChanged(auth, (user) => {
    const isOnPortal = !portalView.classList.contains("hidden");
    if (!user && (isOnPortal || !allowPortalNavigation)) {
        allowPortalNavigation = false;
        loginView.classList.remove("hidden");
        signupView.classList.add("hidden");
        forgotPasswordView.classList.add("hidden");
        portalView.classList.add("hidden");
        profileButton.classList.add("hidden");
    }
});

// =========================================================
// PASSWORD VISIBILITY TOGGLE & TOASTS
// =========================================================
const eyeOffSvg = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
const eyeOnSvg = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
        const targetInput = document.getElementById(btn.dataset.togglePassword);
        if (!targetInput) return;
        const isHidden = targetInput.type === "password";
        targetInput.type = isHidden ? "text" : "password";
        btn.innerHTML = isHidden ? eyeOnSvg : eyeOffSvg;
    });
});

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}
