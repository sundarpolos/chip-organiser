

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqSROiVtpeGpH6-gfvfKdG9liWoz3WMaw",
  authDomain: "chip-maestro.firebaseapp.com",
  projectId: "chip-maestro",
  storageBucket: "chip-maestro.appspot.com",
  messagingSenderId: "1069831670036",
  appId: "1:1069831670036:web:b523603757dc7be3c99a01"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
