/**
 * wallet.js
 * Utility functions for Student Wallet management and transaction handling.
 * Integrates with Firestore 'wallets' collection with fallback to localStorage.
 */

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY_PREFIX = 'student_wallet_';

const getLocalStorageWallet = (studentId) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${studentId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading wallet from localStorage:', e);
  }
  return {
    balance: 5000, // Initial default welcome credit for demonstration
    transactions: [
      {
        id: 'TX-INIT-001',
        type: 'CREDIT',
        method: 'Welcome Bonus',
        amount: 5000,
        description: 'Student Wallet Initialization Bonus',
        status: 'SUCCESS',
        date: new Date().toISOString()
      }
    ]
  };
};

const saveLocalStorageWallet = (studentId, data) => {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed saving wallet to localStorage:', e);
  }
};

/**
 * Fetch wallet balance and transactions for a student.
 */
export const getStudentWallet = async (studentId) => {
  if (!studentId) return { balance: 0, transactions: [] };
  
  const localData = getLocalStorageWallet(studentId);
  try {
    const docRef = doc(db, 'wallets', String(studentId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const remoteData = docSnap.data();
      const merged = {
        balance: remoteData.balance ?? localData.balance,
        transactions: remoteData.transactions || localData.transactions
      };
      saveLocalStorageWallet(studentId, merged);
      return merged;
    } else {
      // First time initialization in Firestore
      await setDoc(docRef, localData, { merge: true }).catch(() => {});
      return localData;
    }
  } catch (e) {
    console.warn('Firestore wallet read error, using offline local wallet:', e);
    return localData;
  }
};

/**
 * Credit / Fund student wallet.
 */
export const fundStudentWallet = async (studentId, amount, method = 'Card Payment', reference = '') => {
  const currentWallet = await getStudentWallet(studentId);
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) throw new Error('Funding amount must be greater than zero.');

  const txId = reference || `TX-DEP-${Date.now().toString(36).toUpperCase()}`;
  const newTx = {
    id: txId,
    type: 'CREDIT',
    method: method,
    amount: numAmount,
    description: `Wallet Deposit via ${method}`,
    status: 'SUCCESS',
    date: new Date().toISOString()
  };

  const updatedWallet = {
    balance: (currentWallet.balance || 0) + numAmount,
    transactions: [newTx, ...(currentWallet.transactions || [])]
  };

  saveLocalStorageWallet(studentId, updatedWallet);
  try {
    await setDoc(doc(db, 'wallets', String(studentId)), updatedWallet, { merge: true });
  } catch (e) {
    console.warn('Could not sync funded wallet to Firestore:', e);
  }

  return updatedWallet;
};

/**
 * Debit / Spend from student wallet.
 */
export const debitStudentWallet = async (studentId, amount, purpose = 'School Fee Payment', reference = '') => {
  const currentWallet = await getStudentWallet(studentId);
  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) throw new Error('Debit amount must be greater than zero.');
  if (currentWallet.balance < numAmount) {
    throw new Error(`Insufficient wallet balance. Available: ₦${currentWallet.balance.toLocaleString()}, Required: ₦${numAmount.toLocaleString()}`);
  }

  const txId = reference || `TX-PAY-${Date.now().toString(36).toUpperCase()}`;
  const newTx = {
    id: txId,
    type: 'DEBIT',
    method: 'Wallet Direct',
    amount: numAmount,
    description: purpose,
    status: 'SUCCESS',
    date: new Date().toISOString()
  };

  const updatedWallet = {
    balance: currentWallet.balance - numAmount,
    transactions: [newTx, ...(currentWallet.transactions || [])]
  };

  saveLocalStorageWallet(studentId, updatedWallet);
  try {
    await setDoc(doc(db, 'wallets', String(studentId)), updatedWallet, { merge: true });
  } catch (e) {
    console.warn('Could not sync debited wallet to Firestore:', e);
  }

  return updatedWallet;
};
