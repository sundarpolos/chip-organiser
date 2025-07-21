

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, getDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Function to check database connectivity
export async function checkDbConnection(): Promise<boolean> {
    try {
        // We try to get a document that doesn't exist.
        // This won't throw an error if the doc is not found, but it will fail
        // if the connection or credentials are bad.
        await getDoc(doc(db, "connectivity_test", "test_doc"));
        console.log("Firestore connection successful.");
        return true;
    } catch (error) {
        console.error("Firestore connection failed:", error);
        return false;
    }
}


export { db };
