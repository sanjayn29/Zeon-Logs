// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4TKe7vVGWBuXaJ5H6K3hErpcUzlgANy4",
  authDomain: "zeon-cfc23.firebaseapp.com",
  projectId: "zeon-cfc23",
  storageBucket: "zeon-cfc23.firebasestorage.app",
  messagingSenderId: "292217253039",
  appId: "1:292217253039:web:0be8680a3089eda193f85a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider to prompt for account selection
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
