/**
 * JSS2 Bulk Upload Script
 * Reads jss2ful.xlsx and pushes student records + marks to Firestore.
 * Run: node scripts/upload_jss2.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection } from 'firebase/firestore';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CLASS_NAME = 'JSS2';
const SESSION    = '2025/2026';
const TERM       = 'Second Term';
// ───────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Read firebase config from the project
const firebaseConfigPath = join(__dirname, '../src/lib/firebase.js');
const configText = readFileSync(firebaseConfigPath, 'utf8');

// Extract firebaseConfig object via regex
const match = configText.match(/const firebaseConfig\s*=\s*(\{[\s\S]*?\});/);
if (!match) { console.error('❌ Could not read firebaseConfig from firebase.js'); process.exit(1); }

let firebaseConfig;
try {
  // Use eval in a safe limited scope to parse the object
  firebaseConfig = Function(`"use strict"; return (${match[1]})`)();
} catch (e) {
  console.error('❌ Could not parse firebaseConfig:', e.message);
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── SUBJECT NAME NORMALIZER ────────────────────────────────────────────────
function normalizeSubject(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase();
  if (!s) return null;

  const map = {
    'ENGLISH LANG.': 'ENGLISH LANGUAGE',
    'ENGLISH LANGUAGE': 'ENGLISH LANGUAGE',
    'IGBO LANG.': 'IGBO LANGUAGE',
    'IGBO': 'IGBO LANGUAGE',
    'MATHEMATICS': 'MATHEMATICS',
    'FRENCH': 'FRENCH',
    'BASIC SC & TECH': 'BASIC SCIENCE & TECHNOLOGY',
    'BASIC SCI & TECH': 'BASIC SCIENCE & TECHNOLOGY',
    'AGRIC. SCIENCE': 'AGRIC SCIENCE',
    'AGRIC SCIENCE': 'AGRIC SCIENCE',
    'C.R.S': 'C.R.S',
    'CIVIC EDUCATION': 'CIVIC EDUCATION',
    'BUSINESS STUDIES': 'BUSINESS STUDIES',
    'C.C.A': 'C.C.A',
    'HISTORY': 'HISTORY',
    'I . C . T': 'I.C.T',
    'ICT': 'I.C.T',
    'HOME ECONOMICS': 'HOME ECONOMICS',
    'SECURITY': 'SECURITY EDUCATION',
    'SECURITY EDUCATION': 'SECURITY EDUCATION',
    'SOCIAL STUDIES': 'SOCIAL STUDIES',
    'P . H . E': 'PHYSICAL & HEALTH EDUCATION',
    'PHE': 'PHYSICAL & HEALTH EDUCATION',
    'P.H.E': 'PHYSICAL & HEALTH EDUCATION',
  };
  return map[s] || s;
}

// ─── GRADE CALCULATOR ───────────────────────────────────────────────────────
function calcGrade(total) {
  const t = parseFloat(total) || 0;
  if (t >= 75) return 'A';
  if (t >= 70) return 'B1';
  if (t >= 65) return 'B2';
  if (t >= 60) return 'B3';
  if (t >= 50) return 'C4';
  if (t >= 45) return 'C5';
  if (t >= 40) return 'D7';
  if (t >= 35) return 'E8';
  return 'F9';
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  const filePath = join(__dirname, '../src/assets/jss2ful.xlsx');
  console.log(`\n📂 Reading: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Row 0 (index 0) = subject names at every 4th column starting at col 2
  // Row 1 (index 1) = CAT / CAT2 / EXAM / TOTAL headers
  // Row 2+ = data rows

  const subjectRow = raw[0];
  const subjects = [];

  // Build subject map: name → column index of TOTAL field
  // Each subject block is 4 cols wide: CAT, CAT2, EXAM, TOTAL
  // Subject name appears at the CAT column, TOTAL is +3
  let subjectName = null;
  for (let c = 2; c < subjectRow.length; c++) {
    const cell = subjectRow[c];
    if (cell && typeof cell === 'string' && cell.trim()) {
      subjectName = normalizeSubject(cell);
    }
    // Detect if this column is a TOTAL column (every 4th from start of a block)
    const headerCell = (raw[1][c] || '').toString().toUpperCase();
    if (headerCell.includes('TOTAL') && subjectName) {
      subjects.push({
        name: subjectName,
        catIdx: c - 3,   // CAT1
        cat2Idx: c - 2,  // CAT2
        examIdx: c - 1,  // EXAM
        totalIdx: c,     // TOTAL
      });
    }
  }

  console.log(`📚 Detected ${subjects.length} subjects:`, subjects.map(s => s.name).join(', '));

  // Data rows start at index 2
  const dataRows = raw.slice(2).filter(row =>
    row && row[0] && String(row[0]).includes('/')
  );

  console.log(`👥 Found ${dataRows.length} student rows\n`);

  const termKey     = TERM.replace(/\s/g, '').toLowerCase();
  const sessionKey  = SESSION.replace('/', '-');

  let studentBatch  = writeBatch(db);
  let marksBatch    = writeBatch(db);
  let sCount = 0, mCount = 0, batchCount = 0;

  for (const row of dataRows) {
    const rawRegNo = String(row[0] || '').trim();
    const name     = String(row[1] || '').trim();

    if (!rawRegNo || !name) continue;

    const docId     = rawRegNo.replace(/\//g, '-');
    const sessionId = `${docId}_${sessionKey}_${termKey}`;

    // ── Build marks object ──────────────────────────────────────────────────
    const marks = {};
    for (const subj of subjects) {
      const cat1  = parseFloat(row[subj.catIdx])  || 0;
      const cat2  = parseFloat(row[subj.cat2Idx]) || 0;
      const exam  = parseFloat(row[subj.examIdx]) || 0;
      const rawTotal = parseFloat(row[subj.totalIdx]);
      const total = isNaN(rawTotal) ? (cat1 + cat2 + exam) : rawTotal;

      if (cat1 === 0 && cat2 === 0 && exam === 0 && total === 0) continue; // skip blank subjects

      marks[subj.name] = {
        cat1:  String(cat1  || ''),
        cat2:  String(cat2  || ''),
        exam:  String(exam  || ''),
        total: String(total || ''),
        grade: calcGrade(total),
      };
    }

    // ── Write student record ────────────────────────────────────────────────
    const studentRef = doc(collection(db, 'students'), docId);
    studentBatch.set(studentRef, {
      regNo: rawRegNo,
      name,
      className: CLASS_NAME,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    sCount++;

    // ── Write marks record ─────────────────────────────────────────────────
    const marksRef = doc(collection(db, 'marks'), sessionId);
    marksBatch.set(marksRef, {
      regNo: rawRegNo,
      studentName: name,
      className: CLASS_NAME,
      term: TERM,
      session: SESSION,
      marks,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    mCount++;
    batchCount++;

    // Firestore batch limit = 500 ops; commit every 200 students
    if (batchCount >= 200) {
      await studentBatch.commit();
      await marksBatch.commit();
      studentBatch = writeBatch(db);
      marksBatch   = writeBatch(db);
      batchCount   = 0;
      console.log(`  ✅ Committed batch — ${sCount} students so far...`);
    } else {
      process.stdout.write(`  ↑ Queued: ${name} (${rawRegNo})\n`);
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await studentBatch.commit();
    await marksBatch.commit();
  }

  console.log(`\n✅ Done! Uploaded ${sCount} students and ${mCount} marks records to Firestore.`);
  console.log(`   Class: ${CLASS_NAME} | Session: ${SESSION} | Term: ${TERM}`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Upload failed:', err.message);
  process.exit(1);
});
