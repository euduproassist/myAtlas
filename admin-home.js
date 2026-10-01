import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

  // ==========================================
  // ENTERPRISE BACKEND SECURITY & ACTIVATION
  // ==========================================

  function getDeviceId() {
    let id = localStorage.getItem('device_fingerprint');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem('device_fingerprint', id);
    }
    return id;
  }

  const deviceId = getDeviceId();
  const activateForm = document.querySelector('#view-form form');
  const activateSubmitBtn = activateForm ? activateForm.querySelector('button[type="submit"]') : null;

  async function checkLockoutStatus() {
    const lockRef = doc(db, 'admin_lockouts', deviceId);
    const snap = await getDoc(lockRef);
    if (snap.exists()) {
      const data = snap.data();
      const now = Date.now();
      if (data.blockedUntil && data.blockedUntil > now) {
        startCountdown(Math.ceil((data.blockedUntil - now) / 1000));
        return true;
      }
    }
    return false;
  }

  function startCountdown(seconds) {
    if (!activateSubmitBtn) return;
    activateSubmitBtn.disabled = true;
    let timerContainer = document.getElementById('lockout-timer');
    if (!timerContainer) {
      timerContainer = document.createElement('div');
      timerContainer.id = 'lockout-timer';
      timerContainer.style.textAlign = 'center';
      timerContainer.style.marginTop = '12px';
      timerContainer.style.color = '#d93838';
      timerContainer.style.fontWeight = '700';
      activateSubmitBtn.parentNode.insertBefore(timerContainer, activateSubmitBtn.nextSibling);
    }

    const interval = setInterval(() => {
      if (seconds <= 0) {
        clearInterval(interval);
        activateSubmitBtn.disabled = false;
        timerContainer.textContent = '';
      } else {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        let timeStr = `${s}s`;
        if (m > 0 || h > 0) timeStr = `${m}m ${s}s`;
        if (h > 0) timeStr = `${h}h ${m}m ${s}s`;
        timerContainer.textContent = `Too many failed attempts. Please try again in ${timeStr}`;
        seconds--;
      }
    }, 1000);
  }

  async function handleFailedAttempt() {
    const lockRef = doc(db, 'admin_lockouts', deviceId);
    const snap = await getDoc(lockRef);
    let attempts = 1;
    let lockoutTier = 0;

    if (snap.exists()) {
      const data = snap.data();
      attempts = (data.attempts || 0) + 1;
      lockoutTier = data.lockoutTier || 0;
    }

    let duration = 0;
    if (attempts >= 3) {
      if (lockoutTier === 0) {
        duration = 30; // First round: 30s lockout
        lockoutTier = 1;
      } else if (lockoutTier === 1) {
        duration = 60; // Second round: 60s lockout
        lockoutTier = 2;
      } else {
        duration = 86400; // Third round: 24h lockout (86400s)
      }
      attempts = 0;
    }

    const blockedUntil = duration > 0 ? Date.now() + (duration * 1000) : 0;
    await setDoc(lockRef, { attempts, lockoutTier, blockedUntil });

    alert('Invalid credentials, please try again.');
    if (duration > 0) {
      startCountdown(duration);
    }
  }

  checkLockoutStatus();

  if (activateForm) {
    activateForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (await checkLockoutStatus()) return;

      const initials = document.getElementById('initials').value.trim();
      const firstname = document.getElementById('firstname').value.trim();
      const surname = document.getElementById('surname').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const role = document.getElementById('role').value;
      const temppass = document.getElementById('temppass').value;
      const newpass = document.getElementById('newpass').value;
      const confirmpass = document.getElementById('confirmpass').value;

      // Validate Password Criteria
      const validPass = newpass.length >= 8 && newpass.length <= 12 &&
                        /[A-Z]/.test(newpass) &&
                        /[0-9]/.test(newpass) &&
                        /_/.test(newpass);

      if (!validPass || newpass !== confirmpass) {
        alert('Invalid credentials, please try again.');
        return;
      }

      try {
        const q = query(
          collection(db, 'pre_approved_admins'),
          where('initials', '==', initials),
          where('firstname', '==', firstname),
          where('surname', '==', surname),
          where('email', '==', email),
          where('phone', '==', phone),
          where('role', '==', role),
          where('temppass', '==', temppass)
        );

        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          await handleFailedAttempt();
          return;
        }

        // Match found — Create Firebase Authentication account
        await createUserWithEmailAndPassword(auth, email, newpass);

        // Store active admin profile
        await setDoc(doc(db, 'activated_admins', email), {
          initials, firstname, surname, email, phone, role, activatedAt: new Date().toISOString()
        });

        // Reset lockouts on success
        await setDoc(doc(db, 'admin_lockouts', deviceId), { attempts: 0, lockoutTier: 0, blockedUntil: 0 });

        alert('Account activated successfully! Please sign in.');
        window.history.pushState({ view: 'signin' }, '', '#sign-in');
        showSigninView();

      } catch (err) {
        await handleFailedAttempt();
      }
    });
  }

  // ==========================================
  // SIGN IN & OTP LOGIC
  // ==========================================

  const sendOtpBtn = document.querySelector('#view-signin .input-action-btn');
  const signinForm = document.querySelector('#view-signin form');
  let generatedOtp = null;

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const role = document.getElementById('signin-role').value;

      if (!email || !password || !role) {
        alert('Invalid credentials, please try again.');
        return;
      }

      try {
        // Verify user against Activated Admins database record
        const docRef = doc(db, 'activated_admins', email);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || docSnap.data().role !== role) {
          alert('Invalid credentials, please try again.');
          return;
        }

        // Authenticate password with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);

        // Generate 6-digit OTP
        generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in backend collection
        await setDoc(doc(db, 'admin_otps', email), {
          otp: generatedOtp,
          createdAt: Date.now()
        });

        alert(`OTP sent to ${email}. (Verification OTP: ${generatedOtp})`);

      } catch (err) {
        alert('Invalid credentials, please try again.');
      }
    });
  }

  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('signin-email').value.trim();
      const enteredOtp = document.getElementById('signin-otp').value.trim();

      if (!generatedOtp || enteredOtp !== generatedOtp) {
        alert('Invalid credentials, please try again.');
        return;
      }

      // Verify OTP from backend store
      const otpRef = doc(db, 'admin_otps', email);
      const otpSnap = await getDoc(otpRef);

      if (otpSnap.exists() && otpSnap.data().otp === enteredOtp) {
        alert('Authentication successful! Redirecting to admin portal...');
        window.location.href = 'admin-portal.html';
      } else {
        alert('Invalid credentials, please try again.');
      }
    });
  }
});
