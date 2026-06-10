// This file initializes the connection to Firebase — the backend service used
// by MefeeKali for authentication and database storage

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoF0ZfiKsWlc1Lb_NbMZ4O-wKqEgEn88I",
  authDomain: "mefeekali.firebaseapp.com",
  projectId: "mefeekali",
  storageBucket: "mefeekali.firebasestorage.app",
  messagingSenderId: "305970497691",
  appId: "1:305970497691:web:adadddb836d9661ecd1e3e",
  measurementId: "G-9KM0K6YLRP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);