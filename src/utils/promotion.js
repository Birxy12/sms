/**
 * promotion.js
 * Handles student class promotion logic for the school management system.
 *
 * Rules:
 * - JSS1 → JSS2, JSS2 → JSS3, JSS3 → SS1  (auto, if avg ≥ 45%)
 * - SS1  → SS2 ART or SS2 SCIENCE           (manual, admin selects based on subjects)
 * - SS2 ART → SS3 ART, SS2 SCIENCE → SS3 SCIENCE  (auto, if avg ≥ 45%)
 * - SS3 ART / SS3 SCIENCE → graduates       (no move)
 *
 * Average is derived from the student's Third Term marks document.
 */

import { db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';

/** Map of auto-promotion paths */
export const AUTO_PROMOTION_MAP = {
  'JSS1': 'JSS2',
  'JSS2': 'JSS3',
  'JSS3': 'SS1',
  'SS2 ART': 'SS3 ART',
  'SS2 SCIENCE': 'SS3 SCIENCE',
};

/** Classes that require manual placement by admin */
export const MANUAL_PLACEMENT_CLASSES = ['SS1'];

/** Classes with no further promotion (graduates) */
export const TERMINAL_CLASSES = ['SS3 ART', 'SS3 SCIENCE'];

/**
 * Returns the next class for auto-promotion, or null if manual/terminal.
 */
export const getNextClass = (currentClass) => {
  if (TERMINAL_CLASSES.includes(currentClass)) return null;
  return AUTO_PROMOTION_MAP[currentClass] || null;
};

/**
 * Extracts the average from a marks document (_meta.average field).
 * Handles both compressed and expanded schemas.
 */
export const getAverageFromMarks = (marksDoc) => {
  if (!marksDoc) return 0;
  // Expanded schema
  if (marksDoc.marks?._meta?.average !== undefined) {
    return parseFloat(marksDoc.marks._meta.average) || 0;
  }
  // Compressed schema: marks -> m -> _meta -> avg
  const m = marksDoc.m;
  if (m?._meta?.avg !== undefined) {
    return parseFloat(m._meta.avg) || 0;
  }
  // Direct avg field fallback
  if (marksDoc.avg !== undefined) return parseFloat(marksDoc.avg) || 0;
  if (marksDoc.average !== undefined) return parseFloat(marksDoc.average) || 0;
  return 0;
};

/**
 * Fetches Third Term marks for a specific class and session.
 * Returns a map of regNo → average.
 */
export const fetchThirdTermAverages = async (className, session) => {
  const averages = {};
  try {
    const q = query(
      collection(db, 'marks'),
      where('c', '==', className),
      where('s', '==', session),
      where('t', '==', 'Third Term')
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const data = d.data();
      const regNo = data.r || data.regNo;
      const avg = getAverageFromMarks({ m: data.m, marks: data.marks, avg: data.avg });
      if (regNo) averages[regNo] = avg;
    });

    // Fallback: also try expanded schema
    if (snap.empty) {
      const q2 = query(
        collection(db, 'marks'),
        where('className', '==', className),
        where('session', '==', session),
        where('term', '==', 'Third Term')
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
        const data = d.data();
        const regNo = data.regNo || data.r;
        const avg = getAverageFromMarks(data);
        if (regNo) averages[regNo] = avg;
      });
    }
  } catch (err) {
    console.error('Error fetching Third Term marks:', err);
  }
  return averages;
};

/**
 * Fetches all students for a given className.
 * Returns array of { id, regNo, name, className, ... }
 */
export const fetchStudentsForClass = async (className) => {
  const students = [];
  try {
    // Try compressed schema first
    const q = query(collection(db, 'students'), where('c', '==', className));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.docs.forEach(d => {
        const data = d.data();
        students.push({
          id: d.id,
          regNo: data.r || data.regNo,
          name: data.n || data.name,
          className: data.c || data.className,
        });
      });
    } else {
      // Fallback to expanded schema
      const q2 = query(collection(db, 'students'), where('className', '==', className));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
        const data = d.data();
        students.push({
          id: d.id,
          regNo: data.regNo || data.r,
          name: data.name || data.n,
          className: data.className || data.c,
        });
      });
    }
  } catch (err) {
    console.error('Error fetching students for class:', err);
  }
  return students;
};

/**
 * Performs bulk auto-promotion for all eligible classes.
 * 
 * @param {string} session - The academic session e.g. '2025/2026'
 * @param {number} threshold - Minimum average to qualify (default: 45)
 * @returns {object} result with promoted, failed, skipped, and details arrays
 */
export const runAutoPromotion = async (session, threshold = 45) => {
  const result = {
    promoted: [],
    failed: [],
    skipped: [],
    details: [],
  };

  const autoClasses = Object.keys(AUTO_PROMOTION_MAP);

  for (const className of autoClasses) {
    const nextClass = AUTO_PROMOTION_MAP[className];
    const students = await fetchStudentsForClass(className);
    const averages = await fetchThirdTermAverages(className, session);

    if (students.length === 0) {
      result.details.push({ class: className, note: 'No students found' });
      continue;
    }

    const batch = writeBatch(db);
    let classPromoted = 0;
    let classFailed = 0;

    for (const student of students) {
      const avg = averages[student.regNo] ?? null;

      if (avg === null) {
        // No marks found — skip
        result.skipped.push({ ...student, reason: 'No Third Term marks found' });
        continue;
      }

      if (avg >= threshold) {
        const studentRef = doc(db, 'students', student.id);
        // Update both compressed 'c' and expanded 'className' fields
        batch.update(studentRef, { c: nextClass, className: nextClass });
        result.promoted.push({ ...student, avg, from: className, to: nextClass });
        classPromoted++;
      } else {
        result.failed.push({ ...student, avg, from: className, reason: `Average ${avg.toFixed(1)}% below ${threshold}%` });
        classFailed++;
      }
    }

    await batch.commit();
    result.details.push({
      class: className,
      nextClass,
      total: students.length,
      promoted: classPromoted,
      failed: classFailed,
    });
  }

  return result;
};

/**
 * Promotes a single SS1 student to SS2 ART or SS2 SCIENCE.
 * 
 * @param {string} studentId - Firestore document ID
 * @param {'SS2 ART'|'SS2 SCIENCE'} targetClass - The stream to place the student in
 */
export const promoteOneSS1Student = async (studentId, targetClass) => {
  const validTargets = ['SS2 ART', 'SS2 SCIENCE'];
  if (!validTargets.includes(targetClass)) {
    throw new Error(`Invalid target class: ${targetClass}. Must be 'SS2 ART' or 'SS2 SCIENCE'.`);
  }
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, { c: targetClass, className: targetClass });
};

export default { runAutoPromotion, promoteOneSS1Student, getNextClass, fetchStudentsForClass, fetchThirdTermAverages };
