import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { Truck, HistoryItem } from "../types";

// NOTE: These are placeholders. In a production environment, 
// these should be populated with real values from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Check if we are using placeholder values
const isMockMode = firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY" || !firebaseConfig.apiKey;

let app: any;
let auth: any;
let db: any;
let googleProvider: any;

if (!isMockMode) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn("Firebase initialization failed. Falling back to Mock Mode.");
  }
}

/**
 * MOCK IMPLEMENTATION FOR LOCAL STORAGE FALLBACK
 */
const mockAuth = {
  currentUser: JSON.parse(localStorage.getItem('carb_mock_user') || 'null'),
  onAuthStateChanged: (callback: (user: any) => void) => {
    const user = JSON.parse(localStorage.getItem('carb_mock_user') || 'null');
    callback(user);
    return () => {}; // Unsubscribe
  }
};

export const signInWithGoogle = async () => {
  if (isMockMode) {
    const mockUser = {
      uid: 'mock-user-123',
      email: 'driver@norcalcarb.com',
      displayName: 'Fleet Operator',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver'
    };
    localStorage.setItem('carb_mock_user', JSON.stringify(mockUser));
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload(); // Refresh to trigger auth state listeners
    return mockUser;
  }

  if (!auth) throw new Error("Firebase not configured");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (isMockMode) {
    localStorage.removeItem('carb_mock_user');
    window.location.reload();
    return;
  }
  if (!auth) return;
  await firebaseSignOut(auth);
};

// --- HISTORY & SCANS ---

export const saveScanToCloud = async (userId: string, scanData: any) => {
  if (isMockMode) {
    const history = JSON.parse(localStorage.getItem(`history_${userId}`) || '[]');
    history.unshift({ ...scanData, id: Date.now().toString(), timestamp: Date.now() });
    localStorage.setItem(`history_${userId}`, JSON.stringify(history.slice(0, 50)));
    return;
  }
  if (!db) return;
  try {
    await addDoc(collection(db, "users", userId, "history"), {
      ...scanData,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Error saving to cloud", e);
  }
};

export const getHistoryFromCloud = async (userId: string) => {
  if (isMockMode) {
    return JSON.parse(localStorage.getItem(`history_${userId}`) || '[]');
  }
  if (!db) return [];
  try {
    const q = query(
      collection(db, "users", userId, "history"), 
      orderBy("timestamp", "desc"), 
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching history", e);
    return [];
  }
};

// --- GARAGE (TRUCKS) ---

export const addTruckToGarage = async (userId: string, truck: Omit<Truck, 'id'>) => {
  if (isMockMode) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    const newTruck = { ...truck, id: Date.now().toString() };
    trucks.unshift(newTruck);
    localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    return newTruck;
  }
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, "users", userId, "trucks"), truck);
    return { id: docRef.id, ...truck };
  } catch (e) {
    console.error("Error adding truck", e);
    throw e;
  }
};

export const deleteTruckFromGarage = async (userId: string, truckId: string) => {
  if (isMockMode) {
    let trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    trucks = trucks.filter((t: any) => t.id !== truckId);
    localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    return;
  }
  if (!db) return;
  try {
    await deleteDoc(doc(db, "users", userId, "trucks", truckId));
  } catch (e) {
    console.error("Error deleting truck", e);
    throw e;
  }
};

export const updateTruckStatus = async (userId: string, truckId: string, status: string, lastChecked: number) => {
  if (isMockMode) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    const index = trucks.findIndex((t: any) => t.id === truckId);
    if (index !== -1) {
      trucks[index] = { ...trucks[index], status, lastChecked };
      localStorage.setItem(`trucks_${userId}`, JSON.stringify(trucks));
    }
    return;
  }
  if (!db) return;
  try {
    await updateDoc(doc(db, "users", userId, "trucks", truckId), {
      status,
      lastChecked
    });
  } catch (e) {
    console.error("Error updating truck", e);
    throw e;
  }
};

export const subscribeToGarage = (userId: string, callback: (trucks: Truck[]) => void) => {
  if (isMockMode) {
    const trucks = JSON.parse(localStorage.getItem(`trucks_${userId}`) || '[]');
    callback(trucks);
    
    // Listen for local storage changes (if user has multiple tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `trucks_${userId}`) {
        callback(JSON.parse(e.newValue || '[]'));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  if (!db) return () => {};
  const q = query(collection(db, "users", userId, "trucks"), orderBy("lastChecked", "desc"));
  return onSnapshot(q, (snapshot) => {
    const trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Truck));
    callback(trucks);
  });
};

// Re-export auth based on mode
const finalAuth = isMockMode ? mockAuth : auth;
const finalDb = isMockMode ? null : db;

export { finalAuth as auth, finalDb as db, onAuthStateChanged };
