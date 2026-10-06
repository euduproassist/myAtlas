import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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

// Push initial state into history so the device's back button works seamlessly
window.history.replaceState({ view: 'welcome' }, '', '#admin-login');

activateBtn.addEventListener('click', () => {
  window.history.pushState({ view: 'form' }, '', '#complete-profile');
  showFormView();
});

gotoSigninBtn.addEventListener('click', (e) => {
  e.preventDefault();
  window.history.pushState({ view: 'signin' }, '', '#sign-in');
  showSigninView();
});

gotoSigninFromForm.addEventListener('click', (e) => {
  e.preventDefault();
  window.history.pushState({ view: 'signin' }, '', '#sign-in');
  showSigninView();
});

gotoActivateBtn.addEventListener('click', (e) => {
  e.preventDefault();
  window.history.pushState({ view: 'form' }, '', '#complete-profile');
  showFormView();
});

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
const passwordToggleBtn = passwordInput.nextElementSibling;
passwordToggleBtn.addEventListener('click', () => {
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    passwordToggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  } else {
    passwordInput.type = 'password';
    passwordToggleBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  }
});

// Password Validation Live Check
const newPassInput = document.getElementById('newpass');
const critLength = document.getElementById('crit-length');
const critUpper = document.getElementById('crit-upper');
const critNumber = document.getElementById('crit-number');
const critUnderscore = document.getElementById('crit-underscore');

newPassInput.addEventListener('input', (e) => {
  const val = e.target.value;

  // Length 8 to 12
  if (val.length >= 8 && val.length <= 12) {
    critLength.className = 'criterion valid';
    critLength.textContent = '✓ Must be 8 to 12 characters';
  } else {
    critLength.className = 'criterion invalid';
    critLength.textContent = '✕ Must be 8 to 12 characters';
  }

  // Uppercase letter
  if (/[A-Z]/.test(val)) {
    critUpper.className = 'criterion valid';
    critUpper.textContent = '✓ Include at least one uppercase letter';
  } else {
    critUpper.className = 'criterion invalid';
    critUpper.textContent = '✕ Include at least one uppercase letter';
  }

  // Number
  if (/[0-9]/.test(val)) {
    critNumber.className = 'criterion valid';
    critNumber.textContent = '✓ Includes at least one number';
  } else {
    critNumber.className = 'criterion invalid';
    critNumber.textContent = '✕ Includes at least one number';
  }

  // Underscore
  if (/_/.test(val)) {
    critUnderscore.className = 'criterion valid';
    critUnderscore.textContent = '✓ Includes at least one underscore';
  } else {
    critUnderscore.className = 'criterion invalid';
    critUnderscore.textContent = '✕ Includes at least one underscore';
  }
});

// --- ACTIVATION SUBMISSION LOGIC ---
const activationForm = document.querySelector('#view-form form');

activationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const initials = document.getElementById('initials').value.trim();
  const firstname = document.getElementById('firstname').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const role = document.getElementById('role').value;
  const tempPass = document.getElementById('temppass').value;
  const newPass = document.getElementById('newpass').value;
  const confirmPass = document.getElementById('confirmpass').value;

  // 1. Validate passwords match
  if (newPass !== confirmPass) {
    alert('New password and confirm password do not match.');
    return;
  }

  // 2. Map roles to their respective Firestore pre-approved and active profile collections
  let preApprovedCollection = '';
  let targetCollection = '';

  if (role === 'admin') {
    preApprovedCollection = 'pre_approved_admins';
    targetCollection = 'admins';
  } else if (role === 'academic_head') {
    preApprovedCollection = 'pre_approved_academic_heads';
    targetCollection = 'academic_heads';
  } else if (role === 'system_admin') {
    preApprovedCollection = 'pre_approved_system_admins';
    targetCollection = 'system_admins';
  } else {
    alert('Please select a valid role.');
    return;
  }

  try {
    // 3. Query corresponding Firestore pre-approved collection to verify entered details
    const preApprovedRef = collection(db, preApprovedCollection);
    const q = query(
      preApprovedRef,
      where('email', '==', email),
      where('initials', '==', initials),
      where('firstname', '==', firstname),
      where('surname', '==', surname),
      where('phone', '==', phone),
      where('role', '==', role),
      where('temppass', '==', tempPass)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert('Activation failed: The details entered do not match our pre-approved records in the database. Please verify your information.');
      return;
    }

    // 4. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, newPass);
    const user = userCredential.user;

    // 5. Save user profile details to designated Firestore collection
    await setDoc(doc(db, targetCollection, user.uid), {
      uid: user.uid,
      initials,
      firstname,
      surname,
      email,
      phone,
      role,
      createdAt: new Date().toISOString()
    });

    alert('Your MyAtlas account has been successfully activated! You can now sign in.');
    
    // Switch to Sign-In view automatically
    window.history.pushState({ view: 'signin' }, '', '#sign-in');
    showSigninView();

  } catch (error) {
    console.error('Activation Error:', error);
    alert('Error during activation: ' + error.message);
  }
});

// --- SIGN-IN & OTP LOGIC ---
const signinForm = document.getElementById('signin-form');
const signinEmailInput = document.getElementById('signin-email');
const signinPasswordInput = document.getElementById('signin-password');
const signinRoleInput = document.getElementById('signin-role');
const signinOtpInput = document.getElementById('signin-otp');
const sendOtpBtn = document.getElementById('send-otp-btn');
const signinSubmitBtn = document.getElementById('signin-submit-btn');

function checkSigninFormState() {
  const emailVal = signinEmailInput.value.trim();
  const passVal = signinPasswordInput.value.trim();
  const roleVal = signinRoleInput.value;
  const otpVal = signinOtpInput.value.trim();

  // 1. Enable Send OTP button only if Email, Password, and Role are non-empty
  if (emailVal !== '' && passVal !== '' && roleVal !== '') {
    sendOtpBtn.disabled = false;
    sendOtpBtn.style.opacity = '1';
    sendOtpBtn.style.cursor = 'pointer';
  } else {
    sendOtpBtn.disabled = true;
    sendOtpBtn.style.opacity = '0.5';
    sendOtpBtn.style.cursor = 'not-allowed';
  }

  // 2. Enable Sign In button only if ALL four fields are filled
  if (emailVal !== '' && passVal !== '' && roleVal !== '' && otpVal !== '') {
    signinSubmitBtn.disabled = false;
    signinSubmitBtn.style.opacity = '1';
    signinSubmitBtn.style.cursor = 'pointer';
  } else {
    signinSubmitBtn.disabled = true;
    signinSubmitBtn.style.opacity = '0.5';
    signinSubmitBtn.style.cursor = 'not-allowed';
  }
}

signinEmailInput.addEventListener('input', checkSigninFormState);
signinPasswordInput.addEventListener('input', checkSigninFormState);
signinRoleInput.addEventListener('change', checkSigninFormState);
signinOtpInput.addEventListener('input', checkSigninFormState);

// Send OTP Event Handler
sendOtpBtn.addEventListener('click', async () => {
  const email = signinEmailInput.value.trim();
  const password = signinPasswordInput.value.trim();
  const role = signinRoleInput.value;

  let targetCollection = '';
  if (role === 'admin') targetCollection = 'admins';
  else if (role === 'academic_head') targetCollection = 'academic_heads';
  else if (role === 'system_admin') targetCollection = 'system_admins';

  sendOtpBtn.disabled = true;
  sendOtpBtn.innerText = 'Verifying...';

  try {
    // A. Verify user account exists in activated collection
    const profileRef = collection(db, targetCollection);
    const q = query(profileRef, where('email', '==', email), where('role', '==', role));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert('Sign-In Failed: No activated account found with these credentials and role. Please activate your account first.');
      sendOtpBtn.innerText = 'Send OTP';
      checkSigninFormState();
      return;
    }

    // B. Verify credentials using standard Auth sign in check
    const tempUserCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = tempUserCredential.user.uid;

    // C. Generate 6-digit numeric OTP and save to Firestore
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // valid for 5 minutes

    await setDoc(doc(db, 'email_otps', uid), {
      email,
      otp: generatedOtp,
      expiresAt
    });

    alert(`OTP sent to ${email}: ${generatedOtp}\n(Note: In production, this code is delivered directly to your inbox).`);
    sendOtpBtn.innerText = 'OTP Sent';

  } catch (error) {
    console.error('OTP Send Error:', error);
    alert('Failed to send OTP: ' + error.message);
    sendOtpBtn.innerText = 'Send OTP';
    checkSigninFormState();
  }
});

// Sign-In Submit Handler
signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = signinEmailInput.value.trim();
  const password = signinPasswordInput.value.trim();
  const role = signinRoleInput.value;
  const otp = signinOtpInput.value.trim();

  let targetCollection = '';
  if (role === 'admin') targetCollection = 'admins';
  else if (role === 'academic_head') targetCollection = 'academic_heads';
  else if (role === 'system_admin') targetCollection = 'system_admins';

  try {
    // 1. Authenticate user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Validate role profile exists
    const docRef = doc(db, targetCollection, user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert('Access Denied: Account not activated or assigned to this role.');
      return;
    }

    // 3. Verify OTP code
    const otpDocRef = doc(db, 'email_otps', user.uid);
    const otpSnap = await getDoc(otpDocRef);

    if (!otpSnap.exists()) {
      alert('OTP error: Please request a new OTP code.');
      return;
    }

    const otpData = otpSnap.data();
    if (otpData.otp !== otp) {
      alert('Invalid OTP code. Please check your code and try again.');
      return;
    }

    if (Date.now() > otpData.expiresAt) {
      alert('OTP has expired. Please click "Send OTP" again.');
      return;
    }

    // D. Clean up used OTP code
    await deleteDoc(otpDocRef);

    alert('Sign in successful! Welcome back.');
    // Redirect or update UI state as needed for your application dashboard

  } catch (error) {
    console.error('Sign-in Error:', error);
    alert('Sign-in failed: ' + error.message);
  }
});

