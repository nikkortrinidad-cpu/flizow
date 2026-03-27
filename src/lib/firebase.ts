import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBncwf9Qi8vkNKeRrE1jrjJDr5eI-RJP5k",
  authDomain: "kanban-5f0f4.firebaseapp.com",
  projectId: "kanban-5f0f4",
  storageBucket: "kanban-5f0f4.firebasestorage.app",
  messagingSenderId: "209234941977",
  appId: "1:209234941977:web:6189232c2db32f82b37288"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
