import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_VgymmMPh63mg6gbi1mfErkIWS-YpfF8",
  authDomain: "myatlas-302b5.firebaseapp.com",
  projectId: "myatlas-302b5",
  storageBucket: "myatlas-302b5.firebasestorage.app",
  messagingSenderId: "327047050047",
  appId: "1:327047050047:web:a993a6598949869d96198a",
  measurementId: "G-L211XXVV0N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services to be exported
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
