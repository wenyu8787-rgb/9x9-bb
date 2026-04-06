import { initializeApp } from 'firebase/app';

import { getAuth } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {

  apiKey: "AIzaSyAV-XBynLOj24QkJKcr46iOv9_8Fghrsec",

  authDomain: "x9game-fe151.firebaseapp.com",

  projectId: "x9game-fe151",

  storageBucket: "x9game-fe151.firebasestorage.app",

  messagingSenderId: "804172624927",

  appId: "1:804172624927:web:54b15e43ace8c769f7d12a"

};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);