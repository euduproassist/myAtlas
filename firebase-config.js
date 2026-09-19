// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
