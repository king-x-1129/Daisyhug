// src/lib/mockFirebase.ts
import { toast } from 'sonner';

// Initialize a local state object synchronized with localStorage
const getLocalStorageData = () => {
  const defaultData = {
    users: {},
    products: {},
    orders: {},
    withdrawals: {},
    reviews: {},
    settings: {
      shop: {
        primaryColor: "#4f46e5",
        accentColor: "#ef4444",
        shopName: "Resellxpk",
        heroTitle: "Empower Your Business Journey",
        heroSubtitle: "Join thousands of successful entrepreneurs. Start your online business with zero investment.",
        logoUrl: ""
      }
    },
    wishlist: {},
    coupons: {},
    clicks: {},
    supplier_applications: {}
  };

  try {
    const stored = localStorage.getItem('mock_firestore_db');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse mock DB", e);
  }

  localStorage.setItem('mock_firestore_db', JSON.stringify(defaultData));
  return defaultData;
};

const saveLocalStorageData = (data: any) => {
  localStorage.setItem('mock_firestore_db', JSON.stringify(data));
  // Trigger active listeners
  triggerListeners();
};

// Active listeners for onSnapshot
const listeners = new Set<() => void>();
const triggerListeners = () => {
  listeners.forEach(l => {
    try { l(); } catch (e) { console.error(e); }
  });
};

// --- mock auth state ---
let currentUser: any = null;
try {
  const savedUser = localStorage.getItem('mock_firebase_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  }
} catch (e) {
  console.error(e);
}

const authListeners = new Set<(user: any) => void>();
const triggerAuthListeners = () => {
  authListeners.forEach(l => {
    try { l(currentUser); } catch (e) { console.error(e); }
  });
};

// --- Firebase App ---
export function initializeApp() {
  return { name: '[MockFirebaseApp]' };
}

// --- Firebase Storage ---
export function getStorage() {
  return { name: '[MockFirebaseStorage]' };
}

// --- Firebase Auth ---
export const auth = {
  get currentUser() {
    return currentUser;
  }
};

export function getAuth() {
  return auth;
}

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  authListeners.add(callback);
  // Call immediately with current state
  setTimeout(() => callback(currentUser), 0);
  return () => {
    authListeners.delete(callback);
  };
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const dbData = getLocalStorageData();
  // Find user by email
  const userProfile: any = Object.values(dbData.users).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  
  if (email === 'kingx1129@gmail.com' && password === 'Password@1129') {
    // Admin bypass login
    currentUser = {
      uid: 'admin-uid-123',
      email: 'kingx1129@gmail.com',
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'password', displayName: 'Platform Administrator', email: 'kingx1129@gmail.com', photoURL: '' }]
    };
    
    // Create admin user record if missing
    if (!dbData.users[currentUser.uid]) {
      dbData.users[currentUser.uid] = {
        uid: currentUser.uid,
        fullName: 'Platform Administrator',
        email: 'kingx1129@gmail.com',
        role: 'admin',
        walletBalance: 125000,
        pendingProfit: 24500,
        totalWithdrawn: 48000,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      saveLocalStorageData(dbData);
    }
    
    localStorage.setItem('mock_firebase_user', JSON.stringify(currentUser));
    triggerAuthListeners();
    return { user: currentUser };
  }

  if (email === 'storeilia08@gmail.com' && password === '@resell.Daisy@123') {
    // Admin bypass login for storeilia08
    currentUser = {
      uid: 'admin-uid-storeilia08',
      email: 'storeilia08@gmail.com',
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'password', displayName: 'Moderator Admin', email: 'storeilia08@gmail.com', photoURL: '' }]
    };
    
    // Create admin user record if missing
    if (!dbData.users[currentUser.uid]) {
      dbData.users[currentUser.uid] = {
        uid: currentUser.uid,
        fullName: 'Moderator Admin',
        email: 'storeilia08@gmail.com',
        role: 'admin',
        walletBalance: 0,
        pendingProfit: 0,
        totalWithdrawn: 0,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      saveLocalStorageData(dbData);
    }
    
    localStorage.setItem('mock_firebase_user', JSON.stringify(currentUser));
    triggerAuthListeners();
    return { user: currentUser };
  }

  if (!userProfile) {
    throw new Error('Firebase: Error (auth/user-not-found).');
  }

  currentUser = {
    uid: userProfile.uid,
    email: userProfile.email,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: 'password', displayName: userProfile.fullName, email: userProfile.email, photoURL: '' }]
  };

  localStorage.setItem('mock_firebase_user', JSON.stringify(currentUser));
  triggerAuthListeners();
  return { user: currentUser };
}

export async function createUserWithEmailAndPassword(authInstance: any, email: string, password: string) {
  const dbData = getLocalStorageData();
  const exists = Object.values(dbData.users).some((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('Firebase: Error (auth/email-already-in-use).');
  }

  const uid = 'user-uid-' + Math.random().toString(36).substr(2, 9);
  currentUser = {
    uid,
    email,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: 'password', displayName: email.split('@')[0], email, photoURL: '' }]
  };

  localStorage.setItem('mock_firebase_user', JSON.stringify(currentUser));
  triggerAuthListeners();
  return { user: currentUser };
}

export async function signInWithPopup(authInstance: any, provider: any) {
  // Mock Google Sign-In with popup
  const email = 'google_user_' + Math.random().toString(36).substr(2, 5) + '@example.com';
  const uid = 'google-uid-' + Math.random().toString(36).substr(2, 9);
  currentUser = {
    uid,
    email,
    emailVerified: true,
    isAnonymous: false,
    providerData: [{ providerId: 'google.com', displayName: 'Google User', email, photoURL: '' }]
  };
  localStorage.setItem('mock_firebase_user', JSON.stringify(currentUser));
  triggerAuthListeners();
  return { user: currentUser };
}

export async function signOut(authInstance: any) {
  currentUser = null;
  localStorage.removeItem('mock_firebase_user');
  triggerAuthListeners();
}

// --- Firebase Firestore ---
export const db = { name: '[MockFirestore]' };

export function getFirestore() {
  return db;
}

export function collection(dbInstance: any, path: string) {
  return { type: 'collection', path };
}

export function doc(parentRef: any, ...pathSegments: string[]) {
  if (parentRef.type === 'collection') {
    return { type: 'document', collectionPath: parentRef.path, docId: pathSegments[0] };
  }
  // If parentRef is dbInstance
  if (pathSegments.length >= 2) {
    return { type: 'document', collectionPath: pathSegments[0], docId: pathSegments[1] };
  }
  // Direct path parse (e.g. users/123)
  const parts = pathSegments[0].split('/');
  return { type: 'document', collectionPath: parts[0], docId: parts[1] };
}

// Helper to convert internal representation to DocumentSnapshot
const createDocSnapshot = (docId: string, data: any) => {
  return {
    id: docId,
    exists: () => data !== undefined,
    data: () => data
  };
};

export async function getDoc(docRef: any) {
  const dbData = getLocalStorageData();
  const collectionData = dbData[docRef.collectionPath] || {};
  const docData = collectionData[docRef.docId];
  return createDocSnapshot(docRef.docId, docData);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const dbData = getLocalStorageData();
  if (!dbData[docRef.collectionPath]) {
    dbData[docRef.collectionPath] = {};
  }
  const current = dbData[docRef.collectionPath][docRef.docId] || {};
  const merged = (options && options.merge) ? { ...current, ...data } : data;
  dbData[docRef.collectionPath][docRef.docId] = merged;
  saveLocalStorageData(dbData);
}

export async function updateDoc(docRef: any, data: any) {
  const dbData = getLocalStorageData();
  const collectionData = dbData[docRef.collectionPath] || {};
  const docData = collectionData[docRef.docId];
  if (!docData) {
    throw new Error(`Document not found: ${docRef.collectionPath}/${docRef.docId}`);
  }
  dbData[docRef.collectionPath][docRef.docId] = { ...docData, ...data };
  saveLocalStorageData(dbData);
}

export async function addDoc(collectionRef: any, data: any) {
  const dbData = getLocalStorageData();
  const docId = 'doc-id-' + Math.random().toString(36).substr(2, 9);
  if (!dbData[collectionRef.path]) {
    dbData[collectionRef.path] = {};
  }
  dbData[collectionRef.path][docId] = { id: docId, ...data };
  saveLocalStorageData(dbData);
  return { id: docId };
}

export async function deleteDoc(docRef: any) {
  const dbData = getLocalStorageData();
  if (dbData[docRef.collectionPath] && dbData[docRef.collectionPath][docRef.docId]) {
    delete dbData[docRef.collectionPath][docRef.docId];
    saveLocalStorageData(dbData);
  }
}

// Query constraints
export function query(collectionRef: any, ...constraints: any[]) {
  return { type: 'query', path: collectionRef.path, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

export function increment(value: number) {
  return { type: 'increment', value };
}

export function writeBatch(dbInstance?: any) {
  const operations: (() => void)[] = [];
  return {
    set(docRef: any, data: any, options?: any) {
      operations.push(() => {
        const dbData = getLocalStorageData();
        if (!dbData[docRef.collectionPath]) {
          dbData[docRef.collectionPath] = {};
        }
        const current = dbData[docRef.collectionPath][docRef.docId] || {};
        const merged = (options && options.merge) ? { ...current, ...data } : data;
        dbData[docRef.collectionPath][docRef.docId] = merged;
        saveLocalStorageData(dbData);
      });
    },
    update(docRef: any, data: any) {
      operations.push(() => {
        const dbData = getLocalStorageData();
        const collectionData = dbData[docRef.collectionPath] || {};
        const docData = collectionData[docRef.docId];
        if (docData) {
          // Resolve increments
          const updated = { ...docData };
          for (const [key, val] of Object.entries(data)) {
            if (val && typeof val === 'object' && (val as any).type === 'increment') {
              updated[key] = (Number(updated[key]) || 0) + (val as any).value;
            } else {
              updated[key] = val;
            }
          }
          dbData[docRef.collectionPath][docRef.docId] = updated;
          saveLocalStorageData(dbData);
        }
      });
    },
    delete(docRef: any) {
      operations.push(() => {
        const dbData = getLocalStorageData();
        if (dbData[docRef.collectionPath] && dbData[docRef.collectionPath][docRef.docId]) {
          delete dbData[docRef.collectionPath][docRef.docId];
          saveLocalStorageData(dbData);
        }
      });
    },
    async commit() {
      operations.forEach(op => op());
    }
  };
}

// Storage Mocks
export function ref(storageInstance: any, path: string) {
  return { type: 'storage_ref', path };
}

export async function uploadBytes(refInstance: any, fileOrBlob: any) {
  return { ref: refInstance };
}

export async function getDownloadURL(refInstance: any) {
  return `https://picsum.photos/seed/${refInstance.path || 'dummy'}/600/600`;
}

export async function getDocs(queryOrCollectionRef: any) {
  const dbData = getLocalStorageData();
  const path = queryOrCollectionRef.path;
  const collectionData = dbData[path] || {};
  let docs = Object.entries(collectionData).map(([id, data]) => ({ id, data }));

  // Apply query filters if present
  if (queryOrCollectionRef.type === 'query') {
    const constraints = queryOrCollectionRef.constraints || [];
    for (const c of constraints) {
      if (!c) continue;
      if (c.type === 'where') {
        const { field, op, value } = c;
        docs = docs.filter(docItem => {
          const itemVal = (docItem.data as any)[field];
          if (op === '==') return itemVal === value;
          if (op === '!=') return itemVal !== value;
          if (op === '>') return itemVal > value;
          if (op === '>=') return itemVal >= value;
          if (op === '<') return itemVal < value;
          if (op === '<=') return itemVal <= value;
          if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
          return true;
        });
      }
    }
  }

  return {
    docs: docs.map(d => createDocSnapshot(d.id, d.data)),
    size: docs.length,
    empty: docs.length === 0
  };
}

export function onSnapshot(ref: any, onNext: (snap: any) => void, onError?: (err: any) => void) {
  const callback = async () => {
    try {
      if (ref.type === 'document') {
        const snap = await getDoc(ref);
        onNext(snap);
      } else {
        const snap = await getDocs(ref);
        onNext(snap);
      }
    } catch (e) {
      if (onError) onError(e);
    }
  };

  listeners.add(callback);
  // Initial call
  setTimeout(callback, 0);

  return () => {
    listeners.delete(callback);
  };
}
