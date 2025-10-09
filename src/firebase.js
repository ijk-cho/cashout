import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDOTj6AhRM4ZQodcaAEpnzdOmi2maCFQ0",
  authDomain: "cashout-9ce04.firebaseapp.com",
  projectId: "cashout-9ce04",
  storageBucket: "cashout-9ce04.firebasestorage.app",
  messagingSenderId: "1070226641263",
  appId: "1:1070226641263:web:9d19d2dac3ae887654189a",
  measurementId: "G-DWDX2QEEJ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);
