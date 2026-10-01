import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.style.overflowX = "hidden";
  document.body.style.overflowX = "hidden";

  const viewWelcome = document.getElementById('view-welcome');
  const viewForm = document.getElementById('view-form');
  const viewSignin = document.getElementById('view-signin');
  
  const activateBtn = document.getElementById('activate-btn');
  const gotoSigninBtn = document.getElementById('goto-signin-btn');
  const gotoSigninFromForm = document.getElementById('goto-signin-from-form');
  const gotoActivateBtn = document.getElementById('goto-activate-btn');
  
  const footerSigninTriggers = document.querySelectorAll('.footer-signin-trigger');
  const footerActivateTriggers = document.querySelectorAll('.footer-activate-trigger');

  // Push initial state into history so device back button works seamlessly
  window.history.replaceState({ view: 'welcome' }, '', '#admin-login');

  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      window.history.pushState({ view: 'form' }, '', '#complete-profile');
      showFormView();
    });
  }

  if (gotoSigninBtn) {
    gotoSigninBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({ view: 'signin' }, '', '#sign-in');
      showSigninView();
    });
  }

  if (gotoSigninFromForm) {
    gotoSigninFromForm.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({ view: 'signin' }, '', '#sign-in');
      showSigninView();
    });
  }

  if (gotoActivateBtn) {
    gotoActivateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({ view: 'form' }, '', '#complete-profile');
      showFormView();
    });
  }

  footerSigninTriggers.forEach(trig => {
    trig.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({ view: 'signin' }, '', '#sign-in');
      showSigninView();
    });
  });

  footerActivateTriggers.forEach(trig => {
    trig.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({ view: 'form' }, '', '#complete-profile');
      showFormView();
    });
  });

  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view === 'form') {
      showFormView();
    } else if (event.state && event.state.view === 'signin') {
      showSigninView();
    } else {
      showWelcomeView();
    }
  });

  function showFormView() {
    viewWelcome.classList.remove('active');
    viewSignin.classList.remove('active');
    setTimeout(() => {
      viewForm.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }

  function showSigninView() {
    viewWelcome.classList.remove('active');
    viewForm.classList.remove('active');
    setTimeout(() => {
      viewSignin.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }

  function showWelcomeView() {
    viewForm.classList.remove('active');
    viewSignin.classList.remove('active');
    setTimeout(() => {
      viewWelcome.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }

  // Password Visibility Toggle for Sign In
  const passwordInput = document.getElementById('signin-password');
  if (passwordInput) {
    const passwordToggleBtn = passwordInput.nextElementSibling;
    if (passwordToggleBtn) {
      passwordToggleBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          passwordToggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        } else {
          passwordInput.type = 'password';
          passwordToggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        }
      });
    }
  }

  // Password Validation Live Check
  const newPassInput = document.getElementById('newpass');
  const critLength = document.getElementById('crit-length');
  const critUpper = document.getElementById('crit-upper');
  const critNumber = document.getElementById('crit-number');
  const critUnderscore = document.getElementById('crit-underscore');

  if (newPassInput) {
    newPassInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length >= 8 && val.length <= 12) {
        critLength.className = 'criterion valid';
        critLength.textContent = '✓ Must be 8 to 12 characters';
      } else {
        critLength.className = 'criterion invalid';
        critLength.textContent = '✕ Must be 8 to 12 characters';
      }
      if (/[A-Z]/.test(val)) {
        critUpper.className = 'criterion valid';
        critUpper.textContent = '✓ Include at least one uppercase letter';
      } else {
        critUpper.className = 'criterion invalid';
        critUpper.textContent = '✕ Include at least one uppercase letter';
      }
      if (/[0-9]/.test(val)) {
        critNumber.className = 'criterion valid';
        critNumber.textContent = '✓ Includes at least one number';
      } else {
        critNumber.className = 'criterion invalid';
        critNumber.textContent = '✕ Includes at least one number';
      }
      if (/_/.test(val)) {
        critUnderscore.className = 'criterion valid';
        critUnderscore.textContent = '✓ Includes at least one underscore';
      } else {
        critUnderscore.className = 'criterion invalid';
        critUnderscore.textContent = '✕ Includes at least one underscore';
      }
    });
  }

  // --- RATE LIMITING & BACKEND ACTIVATION LOGIC ---
  let activationAttempts = 0;
  let lockoutTimer = null;

  const formElement = document.querySelector('#view-form form');
  if (formElement) {
    // Add countdown element below submit button
    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'activation-countdown';
    countdownDiv.style.cssText = 'color: #d93838; font-size: 13px; font-weight: 600; text-align: center; margin-top: 10px;';
    formElement.querySelector('.cta-area').appendChild(countdownDiv);

    formElement.addEventListener('submit', async (e) => {
      e.preventDefault();
      const initials = document.getElementById('initials').value.trim();
      const firstName = document.getElementById('firstname').value.trim();
      const surname = document.getElementById('surname').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const role = document.getElementById('role').value;
      const tempPass = document.getElementById('temppass').value;
      const newPass = document.getElementById('newpass').value;
      const confirmPass = document.getElementById('confirmpass').value;

      // Validate new password rules locally
      const isValidPass = newPass.length >= 8 && newPass.length <= 12 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /_/.test(newPass);
      if (!isValidPass || newPass !== confirmPass) {
        alert("Invalid credentials, please try again..");
        return;
      }

      try {
        // Query Firestore backend for matching credentials
        const q = query(
          collection(db, "admins"),
          where("email", "==", email),
          where("initials", "==", initials),
          where("firstName", "==", firstName),
          where("surname", "==", surname),
          where("phone", "==", phone),
          where("role", "==", role),
          where("tempPass", "==", tempPass)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          handleActivationFailure(formElement, countdownDiv);
          return;
        }

        // Success: Update backend to store new password & set activated = true
        const adminDocRef = querySnapshot.docs[0].ref;
        await updateDoc(adminDocRef, {
          password: newPass,
          activated: true,
          tempPass: "" // Clear temp pass
        });

        alert("Account successfully activated! Please sign in.");
        window.history.pushState({ view: 'signin' }, '', '#sign-in');
        showSigninView();

      } catch (err) {
        console.error("Activation error:", err);
        alert("Invalid credentials, please try again..");
      }
    });
  }

  function handleActivationFailure(formEl, countdownEl) {
    activationAttempts++;
    const submitBtn = formEl.querySelector('button[type="submit"]');

    if (activationAttempts === 1) {
      alert("Invalid credentials, please try again..");
    } else if (activationAttempts === 2) {
      alert("Invalid credentials, please try again..");
    } else if (activationAttempts === 3) {
      // 30 seconds lockout
      triggerLockout(submitBtn, countdownEl, 30, () => { activationAttempts = 3; });
    } else if (activationAttempts === 4) {
      // 60 seconds lockout
      triggerLockout(submitBtn, countdownEl, 60, () => { activationAttempts = 4; });
    } else {
      // Permanent 24hr block
      submitBtn.disabled = true;
      countdownEl.textContent = "Device/Account temporarily blocked for 24 hours due to multiple failed attempts.";
    }
  }

  function triggerLockout(btn, countdownEl, seconds, callback) {
    btn.disabled = true;
    let remaining = seconds;
    countdownEl.textContent = `Too many failed attempts. Please wait ${remaining}s...`;

    lockoutTimer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownEl.textContent = `Too many failed attempts. Please wait ${remaining}s...`;
      } else {
        clearInterval(lockoutTimer);
        countdownEl.textContent = "";
        btn.disabled = false;
        if (callback) callback();
      }
    }, 1000);
  }

  // --- SIGN IN & OTP LOGIC ---
  const signinForm = document.querySelector('#view-signin form');
  let generatedOtp = null;

  if (signinForm) {
    const sendOtpBtn = signinForm.querySelector('.input-action-btn');
    const emailInput = document.getElementById('signin-email');
    const passInput = document.getElementById('signin-password');
    const roleInput = document.getElementById('signin-role');
    const otpInput = document.getElementById('signin-otp');

    sendOtpBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value;
      const role = roleInput.value;

      if (!email || !password || !role) {
        alert("Please enter your email, password, and role before requesting an OTP.");
        return;
      }

      try {
        const q = query(
          collection(db, "admins"),
          where("email", "==", email),
          where("password", "==", password),
          where("role", "==", role),
          where("activated", "==", true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          alert("Invalid credentials, please try again..");
          return;
        }

        // Generate 6-digit random OTP
        generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("Secure OTP generated for backend delivery:", generatedOtp); // Simulated email dispatch
        alert(`OTP successfully sent to ${email}. (Check console for simulation code).`);

      } catch (err) {
        console.error("OTP error:", err);
        alert("Invalid credentials, please try again..");
      }
    });

    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredOtp = otpInput.value.trim();

      if (!generatedOtp || enteredOtp !== generatedOtp) {
        alert("Invalid credentials, please try again..");
        return;
      }

      // Successful authentication & OTP verification
      alert("Sign in successful! Redirecting to admin portal...");
      // window.location.href = "admin-portal.html";
    });
  }
});
