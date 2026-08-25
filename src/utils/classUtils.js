import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export const DEFAULT_CLASSES = [
  'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'
];

/**
 * Canonical class name standardizer to avoid duplicate variations like 'JSS 1' vs 'JSS1'.
 */
export function normalizeClassName(raw) {
  if (!raw) return '';
  let str = String(raw).trim().toUpperCase();
  
  // Replace multiple spaces with single space
  str = str.replace(/\s+/g, ' ');

  // Standardize JSS 1 -> JSS1, JSS 2 -> JSS2, JSS 3 -> JSS3
  str = str.replace(/^JSS\s*([1-3])$/i, 'JSS$1');
  
  // Standardize SS 1 -> SS1, SS 2 -> SS2, SS 3 -> SS3 (without stream)
  str = str.replace(/^SS\s*([1-3])$/i, 'SS$1');
  
  // Standardize SS 2 ART / SS2-ART / SS 2 SCIENCE -> SS2 ART / SS2 SCIENCE
  str = str.replace(/^SS\s*([1-3])\s*[-_]?\s*(ART|SCIENCE|COMMERCE)$/i, 'SS$1 $2');
  str = str.replace(/^SS([1-3])\s*[-_]\s*(ART|SCIENCE|COMMERCE)$/i, 'SS$1 $2');
  
  // Standardize JS1 -> JSS1, JS2 -> JSS2, JS3 -> JSS3
  str = str.replace(/^JS\s*([1-3])$/i, 'JSS$1');

  // Standardize BASIC 1, NURSERY 1, TODDLER 1, etc.
  str = str.replace(/^(BASIC|PRY|PRIMARY|NURSERY|TODDLER|KG)\s*([1-6])$/i, '$1 $2');

  return str;
}

/**
 * Returns a list of unique, canonical normalized classes without duplicates.
 */
export function getUniqueClasses(classList = []) {
  const seen = new Set();
  const result = [];
  (classList || []).forEach(cls => {
    const norm = normalizeClassName(cls);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  });
  return result;
}

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
        dynamicClasses.push(normalizeClassName(doc.id));
      }
    });

    const merged = getUniqueClasses([...DEFAULT_CLASSES, ...dynamicClasses]);
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
              dynamicClasses.push(normalizeClassName(doc.id));
            }
          });
          const merged = getUniqueClasses([...DEFAULT_CLASSES, ...dynamicClasses]);
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
