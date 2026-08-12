import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export const DEFAULT_CLASSES = [
  'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'
];

/**
 * Asynchronously fetches all dynamic classes from the Firestore 'classes' collection
 * (managed under 'Manage Classes' in the sidebar navigation).
 * Merges them with default classes to ensure complete coverage.
 */
export async function fetchGlobalClasses() {
  try {
    const snap = await getDocs(collection(db, 'classes'));
    const dynamicClasses = [];
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (!data?.deleted && doc.id) {
        dynamicClasses.push(doc.id);
      }
    });

    const merged = Array.from(new Set([...DEFAULT_CLASSES, ...dynamicClasses])).filter(Boolean);
    return merged;
  } catch (err) {
    console.warn('[fetchGlobalClasses] Error loading classes from Firestore:', err);
    return DEFAULT_CLASSES;
  }
}

/**
 * Custom React hook to subscribe to real-time class changes from Firestore.
 */
export function useGlobalClasses() {
  const [classes, setClasses] = useState(DEFAULT_CLASSES);

  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, 'classes'),
        (snap) => {
          const dynamicClasses = [];
          snap.docs.forEach(doc => {
            const data = doc.data();
            if (!data?.deleted && doc.id) {
              dynamicClasses.push(doc.id);
            }
          });
          const merged = Array.from(new Set([...DEFAULT_CLASSES, ...dynamicClasses])).filter(Boolean);
          setClasses(merged);
        },
        (err) => {
          console.warn('[useGlobalClasses] Listener error:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('[useGlobalClasses] Failed to setup class listener:', e);
    }
  }, []);

  return classes;
}
