// Use namespace imports to bypass compiler errors about missing named exports
import * as firebase_app from "firebase/app";
import * as firebase_auth from "firebase/auth";
import * as firebase_firestore from "firebase/firestore";
import { Truck, HistoryItem } from "../types";

// Destructure with any casting to satisfy the compiler while accessing modular functions
const { initializeApp, getApp, getApps } = firebase_app as any;
const { getAuth, GoogleAuthProvider, signInWithPopup, signOut: firebaseSignOut, onAuthStateChanged: firebaseOnAuthStateChanged } = firebase_auth as any;
const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, doc, deleteDoc, updateDoc, onSnapshot } = firebase_firestore as any;

/**
 * FIREBASE CONFIGURATION
 * To go live, replace these placeholders with your actual Firebase project keys
 * found in the Firebase Console (Project Settings > General > Your Apps).
 */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Check if we are using placeholder values or invalid keys
const isConfigValid = firebaseConfig.apiKey && 
                     firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && 
                     firebaseConfig.projectId !== "your-project-id";

const isMockMode = !isConfigValid;

let app: any;
let auth: any;
let db: any;
let googleProvider: any;

if (!isMockMode) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn("Firebase initialization failed due to invalid keys. Falling back to Mock Mode.");
  }
}

/**
 * MOCK IMPLEMENTATION FOR LOCAL STORAGE FALLBACK
 * This allows the app to function (Garage, History, Auth) even without a Firebase Key.
 */
const mockAuth = {
  currentUser: JSON.parse(localStorage.getItem('carb_mock_user') || 'null'),
  onAuthStateChanged: (callback: (user: any) => void) => {
    const user = JSON.parse(localStorage.getItem('carb_mock_user') || 'null');
    callback(user);
    // Simulate real-time storage sync
    const handler = (e: StorageEvent) => {
        if (e.key === 'carb_mock_user') callback(JSON.parse(e.newValue || 'null'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
};

export const signInWithGoogle = async () => {
  if (isMockMode || !auth) {
    const mockUser = {
      uid: 'mock-user-fleet-id',
      email: 'operator@norcalcarb.com',
      displayName: 'Fleet Commander',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fleet'
    };
    localStorage.setItem('carb_mock_user', JSON.stringify(mockUser));
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload(); 
    return mockUser;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (isMockMode || !auth) {
    localStorage.removeItem('carb_mock_user');
    window.location.reload();
    return;
  }
  await firebaseSignOut(auth);
};

// --- DATA ACCESS LAYER (ABSTRACTION) ---

export const saveScanToCloud = async (userId: string, scanData: any) => {
  if (isMockMode || !db) {
    const history = JSON.parse(localStorage.getItem(`history_${userId}`) || '[]');
    history.unshift({ ...scanData, id: Date.now().toString(), timestamp: Date.now() });
    localStorage.setItem(`history_${userId}`, JSON.stringify(history.slice(0, 50)));
    return;
  }
  try {
    await addDoc(collection(db, "users", userId, "history"), {
      ...scanData,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Error saving history", e);
  }
};

export const getHistoryFromCloud = async (userId: string) => {
  if (isMockMode || !db) {
    return JSON.parse(localStorage.getItem(`history_${userId}`) || '[]');
  }
  try {
    const q = query(collection(db, "users", userId, "history"), orderBy("timestamp", "desc"), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching history", e);
    return [];
  }
};

export const addTruckToGarage = async (userId: string, truck: Omit<Truck, 'id'>) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    const newTruck = { ...truck, id: Date.now().toString() };
    trucks.unshift(newTruck);
    localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    return newTruck;
  }
  try {
    const docRef = await addDoc(collection(db, "users", userId, "trucks"), truck);
    return { id: docRef.id, ...truck };
  } catch (e) {
    throw e;
  }
};

export const deleteTruckFromGarage = async (userId: string, truckId: string) => {
  if (isMockMode || !db) {
    let trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    trucks = trucks.filter((t: any) => t.id !== truckId);
    localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    return;
  }
  await deleteDoc(doc(db, "users", userId, "trucks", truckId));
};

export const updateTruckStatus = async (userId: string, truckId: string, status: string, lastChecked: number) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    const index = trucks.findIndex((t: any) => t.id === truckId);
    if (index !== -1) {
      trucks[index] = { ...trucks[index], status, lastChecked };
      localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    }
    return;
  }
  await updateDoc(doc(db, "users", userId, "trucks", truckId), { status, lastChecked });
};

export const subscribeToGarage = (userId: string, callback: (trucks: Truck[]) => void) => {
  if (isMockMode || !db) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    callback(trucks);
    const handler = (e: StorageEvent) => {
      if (e.key === `trucks_${userId}`) callback(JSON.parse(e.newValue || '[]'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  const q = query(collection(db, "users", userId, "trucks"), orderBy("lastChecked", "desc"));
  return onSnapshot(q, (snapshot: any) => {
    const trucks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Truck));
    callback(trucks);
  });
};

const finalAuth = (isMockMode || !auth) ? mockAuth : auth;

/**
 * Unified onAuthStateChanged wrapper that handles both the mock mode (which uses a method)
 * and the real modular Firebase mode (which uses a standalone function).
 */
const onAuthStateChanged = (authInstance: any, callback: any) => {
  if (authInstance && typeof authInstance.onAuthStateChanged === 'function') {
    return authInstance.onAuthStateChanged(callback);
  }
  return firebaseOnAuthStateChanged(authInstance, callback);
};

export { finalAuth as auth, onAuthStateChanged };