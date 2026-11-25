const STORAGE_KEY = "atlas_college_application_v1";

const defaultApplication = {
    reference: "ATL-2026-10482",
    applicant: "Thabo Mokoena",
    programme: "Information Technology",
    intake: "2026",
    studyMode: "Full-time",
    submittedDate: "18 August 2026",
    documents: { id: null, matric: null, results: null, address: null },
    payment: { paid: true, amount: 250, method: "Card", receipt: "ATL-PAY-481902", date: new Date().toISOString() },
    decision: null
};

let application = loadApplication();

function loadApplication() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultApplication));
            return structuredClone(defaultApplication);
        }
        const parsed = JSON.parse(stored);
        return {
            ...structuredClone(defaultApplication),
            ...parsed,
            documents: { ...defaultApplication.documents, ...(parsed.documents || {}) }
        };
    } catch (error) {
        return structuredClone(defaultApplication);
    }
}

function saveApplication() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(application));
}

const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");
const forgotPasswordView = document.getElementById("forgotPasswordView");
const portalView = document.getElementById("portalView");
const profileButton = document.getElementById("profileButton");

const signInBtn = document.getElementById("signInBtn");
const createAccountBtn = document.getElementById("createAccountBtn");
const sendResetLinkBtn = document.getElementById("sendResetLinkBtn");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const goToSignUpLink = document.getElementById("goToSignUpLink");
const goToSignInFromSignUp = document.getElementById("goToSignInFromSignUp");
const backToSignInFromForgot = document.getElementById("backToSignInFromForgot");

const applicationReference = document.getElementById("applicationReference");
const programmeName = document.getElementById("programmeName");
const submittedDate = document.getElementById("submittedDate");
const mainStatusBadge = document.getElementById("mainStatusBadge");
const toastContainer = document.getElementById("toastContainer");

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

function showAuthView(viewToShow) {
    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    portalView.classList.add("hidden");
    profileButton.classList.add("hidden");

    viewToShow.classList.remove("hidden");
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

forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthView(forgotPasswordView);
});

backToSignInFromForgot.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthView(loginView);
});

signInBtn.addEventListener("click", () => {
    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    portalView.classList.remove("hidden");
    profileButton.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

createAccountBtn.addEventListener("click", () => {
    const fullName = document.getElementById("signupNameInput").value.trim();
    const email = document.getElementById("signupEmailInput").value.trim();
    const password = document.getElementById("signupPasswordInput").value;
    const confirmPassword = document.getElementById("signupConfirmPasswordInput").value;

    if (!fullName || !email || !password || !confirmPassword) {
        showToast("Please fill in all required fields.", "error");
        return;
    }
    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    application.applicant = fullName;
    saveApplication();
    showToast("Account created successfully.", "success");

    loginView.classList.add("hidden");
    signupView.classList.add("hidden");
    forgotPasswordView.classList.add("hidden");
    portalView.classList.remove("hidden");
    profileButton.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

sendResetLinkBtn.addEventListener("click", () => {
    const email = document.getElementById("forgotEmailInput").value.trim();
    if (!email) {
        showToast("Please enter your email address.", "error");
        return;
    }
    document.getElementById("forgotEmailInput").value = "";
    showToast("Password reset instructions sent to your email.", "success");
    showAuthView(loginView);
});

profileButton.addEventListener("click", () => {
    showAuthView(loginView);
});

// PASSWORD VISIBILITY TOGGLE
const eyeOffSvg = '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
const eyeOnSvg = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

document.querySelectorAll("[data-toggle-password]").forEach(btn => {
    btn.addEventListener("click", () => {
        const targetInput = document.getElementById(btn.dataset.togglePassword);
        if (!targetInput) return;
        const isHidden = targetInput.type === "password";
        targetInput.type = isHidden ? "text" : "password";
        btn.innerHTML = isHidden ? eyeOnSvg : eyeOffSvg;
    });
});

function renderBasicInformation() {
    applicationReference.textContent = application.reference;
    programmeName.textContent = application.programme;
    submittedDate.textContent = application.submittedDate;
}

const documentConfig = {
    id: { name: "ID / Passport", description: "Government-issued identity document" },
    matric: { name: "Matric Certificate", description: "Final school certificate" },
    results: { name: "Latest School Results", description: "Most recent academic records" },
    address: { name: "Proof of Address", description: "Recent document showing residence" }
};

let currentDocumentType = null;
let selectedFile = null;

const uploadModal = document.getElementById("uploadModal");
const documentModal = document.getElementById("documentModal");

function openModal(modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeModal(modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
}

const uploadModalTitle = document.getElementById("uploadModalTitle");
const uploadDescription = document.getElementById("uploadDescription");
const fileInput = document.getElementById("fileInput");
const selectedFileBox = document.getElementById("selectedFile");

function openUploadModal(type) {
    currentDocumentType = type;
    selectedFile = null;
    fileInput.value = "";
    selectedFileBox.textContent = "";
    selectedFileBox.classList.add("hidden");

    const config = documentConfig[type];
    uploadModalTitle.textContent = "Upload " + config.name;
    uploadDescription.textContent = "Upload your " + config.name.toLowerCase() + " below. Accepted formats: PDF, JPG, PNG.";
    openModal(uploadModal);
}

document.querySelectorAll("[data-document]").forEach(button => {
    button.addEventListener("click", () => {
        const type = button.dataset.document;
        if (application.documents[type]) {
            openDocumentModal(type);
        } else {
            openUploadModal(type);
        }
    });
});

document.getElementById("chooseFileButton").addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) selectFile(file);
});

function selectFile(file) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
        showToast("Please choose a PDF, JPG or PNG file.", "error");
        fileInput.value = "";
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast("Please use a file smaller than 2 MB.", "error");
        fileInput.value = "";
        return;
    }
    selectedFile = file;
    selectedFileBox.textContent = file.name + " • " + formatFileSize(file.size);
    selectedFileBox.classList.remove("hidden");
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const dropZone = document.getElementById("dropZone");
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => { dropZone.classList.remove("dragover"); });
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
});

document.getElementById("saveDocument").addEventListener("click", () => {
    if (!selectedFile) {
        showToast("Please choose a document first.", "error");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        application.documents[currentDocumentType] = {
            name: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            data: reader.result,
            uploadedAt: new Date().toISOString()
        };
        saveApplication();
        closeModal(uploadModal);
        showToast(documentConfig[currentDocumentType].name + " uploaded successfully.", "success");
        updateInterface();
    };
    reader.readAsDataURL(selectedFile);
});

function openDocumentModal(type) {
    const documentData = application.documents[type];
    if (!documentData) {
        openUploadModal(type);
        return;
    }
    document.getElementById("viewDocumentName").textContent = documentData.name;
    document.getElementById("viewDocumentDetails").textContent = "Uploaded " + formatFileSize(documentData.size);
    currentDocumentType = type;
    openModal(documentModal);
}

document.getElementById("replaceDocumentButton").addEventListener("click", () => {
    closeModal(documentModal);
    openUploadModal(currentDocumentType);
});

document.getElementById("closeUploadModal").addEventListener("click", () => closeModal(uploadModal));
document.getElementById("cancelUpload").addEventListener("click", () => closeModal(uploadModal));
document.getElementById("closeDocumentModal").addEventListener("click", () => closeModal(documentModal));
document.getElementById("closeDocumentButton").addEventListener("click", () => closeModal(documentModal));

function getDocumentCount() {
    return Object.values(application.documents).filter(Boolean).length;
}

function allDocumentsUploaded() {
    return getDocumentCount() === 4;
}

function getApplicationState() {
    if (application.decision === "accepted") return "accepted";
    if (application.decision === "unsuccessful") return "unsuccessful";
    if (allDocumentsUploaded()) return "review";
    return "action";
}

function updateMainStatus() {
    const state = getApplicationState();
    mainStatusBadge.className = "status-badge";
    if (state === "action") {
        mainStatusBadge.classList.add("status-action");
        mainStatusBadge.textContent = "Status: Action Required";
    } else if (state === "review") {
        mainStatusBadge.classList.add("status-review");
        mainStatusBadge.textContent = "Status: Under Review";
    } else if (state === "accepted") {
        mainStatusBadge.classList.add("status-accepted");
        mainStatusBadge.textContent = "Status: Accepted";
    } else if (state === "unsuccessful") {
        mainStatusBadge.classList.add("status-unsuccessful");
        mainStatusBadge.textContent = "Status: Unsuccessful";
    }
}

function renderRequirement(type) {
    const data = application.documents[type];
    const status = document.getElementById(type + "Status");
    const action = document.getElementById(type + "Action");
    const description = document.getElementById(type + "Description");

    if (data) {
        status.className = "requirement-status received";
        status.textContent = "Received";
        action.className = "requirement-action";
        action.textContent = "View";
        description.textContent = data.name + " • " + formatFileSize(data.size);
    } else {
        status.className = "requirement-status required";
        status.textContent = "Required";
        action.className = "requirement-action primary";
        action.textContent = "Upload";
        description.textContent = documentConfig[type].description;
    }
}

function updateInterface() {
    renderBasicInformation();
    renderRequirement("id");
    renderRequirement("matric");
    renderRequirement("results");
    renderRequirement("address");
    updateMainStatus();
}

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

[uploadModal, documentModal].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal);
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        [uploadModal, documentModal].forEach(modal => closeModal(modal));
    }
});

updateInterface();
