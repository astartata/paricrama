import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBKdp5GzsxHVyVx_go6NrUbVxW2gcFsavE',
  authDomain: 'parikrama-2026.firebaseapp.com',
  projectId: 'parikrama-2026',
  storageBucket: 'parikrama-2026.firebasestorage.app',
  messagingSenderId: '657847486560',
  appId: '1:657847486560:web:bad06d0fe004bc9bc6db05'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const auth = getAuth(firebaseApp);

window.firebaseReady = Promise.resolve({ db, storage, collection, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL });
