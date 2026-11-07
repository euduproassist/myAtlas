// supabase-config.js import
import { supabase } from "./supabase-config.js";

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
    window.history.pushState({ view: 'signin' }, '', '#sign-in');
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

// --- STEP 8: PASSWORD VALIDATION LIVE CHECK ---
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

// --- STEP 8: AUTO-CAPITALIZE SPECIFIC INPUT FIELDS ON BLUR ---
const autoCapitalizeIds = ['initials', 'firstname', 'surname', 'email', 'signin-email'];

autoCapitalizeIds.forEach((id) => {
  const inputElem = document.getElementById(id);
  if (inputElem) {
    inputElem.addEventListener('blur', () => {
      inputElem.value = inputElem.value.toUpperCase();
    });
  }
});

// --- STEPS 9, 10 & 11: ACTIVATION SUBMISSION LOGIC (SUPABASE) ---
const activationForm = document.querySelector('#view-form form');

activationForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  autoCapitalizeIds.forEach((id) => {
    const inputElem = document.getElementById(id);
    if (inputElem) {
      inputElem.value = inputElem.value.toUpperCase();
    }
  });

  const initials = document.getElementById('initials').value.trim();
  const firstname = document.getElementById('firstname').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const role = document.getElementById('role').value;
  const tempPass = document.getElementById('temppass').value;
  const newPass = document.getElementById('newpass').value;
  const confirmPass = document.getElementById('confirmpass').value;

  if (newPass !== confirmPass) {
    alert('New password and confirm password do not match.');
    return;
  }

  try {
    // 1. Verify against pre_approved_personnel table (Step 9)
    const { data: preApproved, error: preError } = await supabase
      .from('pre_approved_personnel')
      .select('*')
      .eq('email', email)
      .eq('initials', initials)
      .eq('firstname', firstname)
      .eq('surname', surname)
      .eq('phone', phone)
      .eq('role', role)
      .eq('temppass', tempPass)
      .maybeSingle();

    if (preError || !preApproved) {
      alert('Activation failed: The details entered do not match our pre-approved records in the database.');
      return;
    }

    // 2. Register user via Supabase Auth (Step 10)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: newPass
    });

    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) throw new Error('User ID could not be retrieved from authentication.');

    // 3. Generate 8-digit unique Personnel Number (YY + 6 random digits) (Step 10)
    const currentYearSuffix = new Date().getFullYear().toString().slice(-2);
    let personnelNumber = '';
    let isUnique = false;

    while (!isUnique) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
      personnelNumber = `${currentYearSuffix}${randomDigits}`;

      const { data: existing } = await supabase
        .from('personnel')
        .select('personnel_number')
        .eq('personnel_number', personnelNumber)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
    }

    // 4. Insert into personnel table (Step 10)
    const { error: insertError } = await supabase
      .from('personnel')
      .insert([
        {
          id: userId,
          personnel_number: personnelNumber,
          initials,
          firstname,
          surname,
          email,
          phone,
          role,
          is_active: false
        }
      ]);

    if (insertError) throw insertError;

    // 5. Trigger Welcome Email (Step 11)
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email,
          firstname: firstname,
          personnelNumber: personnelNumber
        }
      });
    } catch (emailError) {
      console.warn('Email trigger notification note:', emailError);
    }

    alert(`Your MyAtlas account has been successfully activated!\n\nYour Generated Personnel Number is: ${personnelNumber}\nPlease keep this safe.`);

    window.history.pushState({ view: 'signin' }, '', '#sign-in');
    showSigninView();

  } catch (error) {
    console.error('Activation Error:', error);
    alert('Error during activation: ' + error.message);
  }
});

// --- STEP 12: SIGN-IN VERIFICATION LOGIC (SUPABASE) ---
const signinForm = document.querySelector('#view-signin form');

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const signinEmailElem = document.getElementById('signin-email');
  if (signinEmailElem) {
    signinEmailElem.value = signinEmailElem.value.toUpperCase();
  }

  const personnelNumber = document.getElementById('signin-personnel').value.trim();
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const role = document.getElementById('signin-role').value;

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authError) throw authError;
    const userId = authData.user?.id;

    // 2. Cross-check personnel table details
    const { data: personnelRecord, error: fetchError } = await supabase
      .from('personnel')
      .select('*')
      .eq('id', userId)
      .eq('personnel_number', personnelNumber)
      .eq('email', email)
      .eq('role', role)
      .maybeSingle();

    if (fetchError || !personnelRecord) {
      alert('Sign-In failed: The details entered do not match our active records for this account.');
      return;
    }

    // 3. Successful login redirect
    window.location.href = 'admin.html';

  } catch (error) {
    console.error('Sign-In Error:', error);
    alert('Sign-In failed: ' + error.message);
  }
});
