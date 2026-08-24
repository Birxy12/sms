import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Maps a class name string to its standardized registration number code.
 * Basic 1 -> B1, Basic 2 -> B2, ..., Basic 6 -> B6
 * Nursery 1 -> N1, Nursery 2 -> N2, Nursery 3 -> N3
 * JSS 1 -> JSS1, SS 1 -> SS1, SS 2 SCIENCE -> SS2-SCI, SS 2 ART -> SS2-ART, etc.
 */
export const getClassCode = (className = '') => {
  if (!className) return 'GEN';
  const upper = className.trim().toUpperCase();

  // 1. Nursery 1 to 3
  if (upper.includes('NURSERY 1') || upper.includes('NUR 1') || upper.includes('NURSERY1') || upper === 'N1') return 'N1';
  if (upper.includes('NURSERY 2') || upper.includes('NUR 2') || upper.includes('NURSERY2') || upper === 'N2') return 'N2';
  if (upper.includes('NURSERY 3') || upper.includes('NUR 3') || upper.includes('NURSERY3') || upper === 'N3') return 'N3';

  // 2. Basic 1 to 6 / Primary 1 to 6
  if (upper.includes('BASIC 1') || upper.includes('PRIMARY 1') || upper.includes('PRY 1') || upper.includes('BASIC1') || upper === 'B1') return 'B1';
  if (upper.includes('BASIC 2') || upper.includes('PRIMARY 2') || upper.includes('PRY 2') || upper.includes('BASIC2') || upper === 'B2') return 'B2';
  if (upper.includes('BASIC 3') || upper.includes('PRIMARY 3') || upper.includes('PRY 3') || upper.includes('BASIC3') || upper === 'B3') return 'B3';
  if (upper.includes('BASIC 4') || upper.includes('PRIMARY 4') || upper.includes('PRY 4') || upper.includes('BASIC4') || upper === 'B4') return 'B4';
  if (upper.includes('BASIC 5') || upper.includes('PRIMARY 5') || upper.includes('PRY 5') || upper.includes('BASIC5') || upper === 'B5') return 'B5';
  if (upper.includes('BASIC 6') || upper.includes('PRIMARY 6') || upper.includes('PRY 6') || upper.includes('BASIC6') || upper === 'B6') return 'B6';

  // 3. Junior Secondary
  if (upper.includes('JSS 1') || upper.includes('JSS1')) return 'JSS1';
  if (upper.includes('JSS 2') || upper.includes('JSS2')) return 'JSS2';
  if (upper.includes('JSS 3') || upper.includes('JSS3')) return 'JSS3';

  // 4. Senior Secondary
  if (upper.includes('SS 1') || upper.includes('SS1')) return 'SS1';
  if (upper.includes('SS 2 SCI') || upper.includes('SS2 SCIENCE') || upper.includes('SS2-SCI')) return 'SS2-SCI';
  if (upper.includes('SS 2 ART') || upper.includes('SS2 ART') || upper.includes('SS2-ART')) return 'SS2-ART';
  if (upper.includes('SS 3 SCI') || upper.includes('SS3 SCIENCE') || upper.includes('SS3-SCI')) return 'SS3-SCI';
  if (upper.includes('SS 3 ART') || upper.includes('SS3 ART') || upper.includes('SS3-ART')) return 'SS3-ART';

  // 5. Fallback alphanumeric code
  const sanitized = upper.replace(/[^A-Z0-9]/g, '');
  return sanitized || 'GEN';
};

/**
 * Formats a sequence or random number:
 * - 3 digits (e.g. 001 - 999) if seq < 1000
 * - 4 or more digits (e.g. 1000, 1001) if seq >= 1000
 */
export const formatRegNumberSuffix = (num) => {
  const n = Number(num) || 1;
  if (n < 1000) {
    return String(n).padStart(3, '0');
  }
  return String(n);
};

/**
 * Generates a unique class registration number with collision checking.
 * Format: BDS/{classCode}/{year}/{suffix}
 * Example: BDS/B1/2026/042, BDS/N1/2026/001, BDS/JSS1/2026/015
 */
export const generateUniqueRegNoSync = (className, existingRegNosSet = new Set(), year = new Date().getFullYear()) => {
  const classCode = getClassCode(className);
  const prefix = `BDS/${classCode}/${year}/`;

  // Filter existing numbers matching this prefix
  const matchingNums = [];
  existingRegNosSet.forEach(reg => {
    if (reg && reg.toUpperCase().startsWith(prefix.toUpperCase())) {
      const parts = reg.split('/');
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) matchingNums.push(last);
    }
  });

  // Calculate next sequential candidate
  let nextNum = matchingNums.length > 0 ? Math.max(...matchingNums) + 1 : 1;
  let candidate = `${prefix}${formatRegNumberSuffix(nextNum)}`;

  // Ensure collision-free
  while (existingRegNosSet.has(candidate)) {
    nextNum++;
    candidate = `${prefix}${formatRegNumberSuffix(nextNum)}`;
  }

  return candidate;
};

/**
 * Async generator that reads existing student records from Firestore to guarantee no duplicates.
 */
export const generateUniqueClassRegNo = async (className, year = new Date().getFullYear()) => {
  const classCode = getClassCode(className);
  const prefix = `BDS/${classCode}/${year}/`;

  try {
    const snap = await getDocs(collection(db, 'students'));
    const existingRegNos = new Set();
    const existingNums = [];

    snap.docs.forEach(d => {
      const data = d.data();
      const reg = data.regNo || data.r;
      if (reg) {
        existingRegNos.add(reg.toUpperCase());
        if (reg.toUpperCase().startsWith(prefix.toUpperCase())) {
          const parts = reg.split('/');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num)) existingNums.push(num);
        }
      }
    });

    let nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : Math.floor(10 + Math.random() * 80);
    let candidate = `${prefix}${formatRegNumberSuffix(nextNum)}`;

    while (existingRegNos.has(candidate.toUpperCase())) {
      nextNum++;
      candidate = `${prefix}${formatRegNumberSuffix(nextNum)}`;
    }

    return candidate;
  } catch (err) {
    console.error('Error in generateUniqueClassRegNo:', err);
    const rand = Math.floor(100 + Math.random() * 899);
    return `${prefix}${formatRegNumberSuffix(rand)}`;
  }
};
