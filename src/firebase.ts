import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase client instance
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Verify live Firestore connectivity
export async function verifyFirestoreConnection(): Promise<boolean> {
  try {
    // Ping Firestore directly from server to verify live access
    const testDoc = await getDocFromServer(doc(db, 'system_test', 'status'));
    console.log('[Firebase Client] Connected to Firestore successfully. Status doc exists:', testDoc.exists());
    return true;
  } catch (err) {
    console.warn('[Firebase Client] Connection check notice:', err);
    return false;
  }
}
