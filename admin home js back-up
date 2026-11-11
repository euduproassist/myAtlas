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

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeMenu();
    }
});

/* =====================================================
   3. PASSWORD VISIBILITY
===================================================== */
document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.target);
        if (!target) return;
        const isPassword = target.type === "password";
        target.type = isPassword ? "text" : "password";
        button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
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
   5. ACTIVATION FORM
===================================================== */
const activationForm = document.getElementById("activationForm");

activationForm.addEventListener("submit", event => {
    event.preventDefault();
    const newPin = document.getElementById("newPin").value;
    const confirmPin = document.getElementById("confirmPin").value;

    if (newPin !== confirmPin) {
        showToast("Your new PIN and confirmation PIN do not match.", "error");
        document.getElementById("confirmPin").focus();
        return;
    }

    if (!/^[0-9]{4,6}$/.test(newPin)) {
        showToast("Your PIN must contain 4 to 6 digits.", "error");
        document.getElementById("newPin").focus();
        return;
    }

    showToast("Your activation form is valid. Backend activation will be added later.");
});

/* =====================================================
   6. SIGN IN FORM
===================================================== */
const signinForm = document.getElementById("signinForm");

signinForm.addEventListener("submit", event => {
    event.preventDefault();
    showToast("Your sign-in form is valid. Authentication will be connected later.");
});

/* =====================================================
   7. FORGOT PASSWORD FORM
===================================================== */
const forgotForm = document.getElementById("forgotForm");

forgotForm.addEventListener("submit", event => {
    event.preventDefault();
    showToast("Your recovery details have been entered. Password recovery will be connected later.");
});

/* =====================================================
   8. INITIAL STATE
===================================================== */
showPanel("home");
