import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4yIvzQVwR9BbymED5rd4rTDYqDPgLw7w",
  authDomain: "new-bible-c41a2.firebaseapp.com",
  projectId: "new-bible-c41a2",
  storageBucket: "new-bible-c41a2.firebasestorage.app",
  messagingSenderId: "487143218054",
  appId: "1:487143218054:web:9c58b61d613c7173b52a07",
  measurementId: "G-7TLSJW0NB3"
};

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  enableIndexedDbPersistence(db).catch((error) => {
    console.warn("Firestore offline persistence disabled:", error?.code || error);
  });

  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.firebaseProvider = provider;
  window.firebaseFns = {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    deleteDoc
  };

  window.dispatchEvent(new CustomEvent("firebase-ready"));
} catch (error) {
  console.error("Firebase init failed:", error);
  window.dispatchEvent(new CustomEvent("firebase-error", { detail: error }));
}
