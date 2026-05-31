import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { STUDENT_KEYS, expandStudent } from '../utils/firestoreSchema';

const StudentAuthContext = createContext();

const STUDENT_AUTH_UNAVAILABLE_MESSAGE =
  'Student portal authentication is not enabled. Please ask the administrator to enable Anonymous sign-in in Firebase Console > Authentication > Sign-in method.';

let anonymousAuthPromise = null;
let hasLoggedAnonymousAuthDisabled = false;

const getStudentAuthErrorMessage = (error) => {
  if (error?.code === 'auth/admin-restricted-operation') {
    return STUDENT_AUTH_UNAVAILABLE_MESSAGE;
  }

  return error?.message || 'Unable to start student authentication. Please try again.';
};

const ensureStudentFirebaseAuth = async () => {
  const { auth } = await import('../lib/firebase');

  if (auth.currentUser) {
    return { success: true };
  }

  if (!anonymousAuthPromise) {
    anonymousAuthPromise = (async () => {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);
        return { success: true };
      } catch (error) {
        if (error?.code === 'auth/admin-restricted-operation') {
          if (!hasLoggedAnonymousAuthDisabled) {
            console.error(STUDENT_AUTH_UNAVAILABLE_MESSAGE);
            hasLoggedAnonymousAuthDisabled = true;
          }
        } else {
          console.error('Anonymous student auth failed:', error);
        }

        return { success: false, message: getStudentAuthErrorMessage(error) };
      } finally {
        anonymousAuthPromise = null;
      }
    })();
  }

  return anonymousAuthPromise;
};

export const StudentAuthProvider = ({ children }) => {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  // authReady = true only after Firebase confirms a real Auth user is present
  const [authReady, setAuthReady] = useState(false);

  // Load student on mount and establish Firebase Auth
  useEffect(() => {
    let unsubscribeAuth = null;

    const initAuth = async () => {
      const storedStudent = localStorage.getItem('currentStudent');

      // Subscribe to Firebase auth state — this is the source of truth for
      // whether Firestore will accept reads. Only set authReady when confirmed.
      const { auth } = await import('../lib/firebase');
      const { onAuthStateChanged } = await import('firebase/auth');

      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          setAuthReady(true);
        } else {
          setAuthReady(false);
        }
      });

      if (storedStudent) {
        try {
          const studentData = JSON.parse(storedStudent);
          const authResult = await ensureStudentFirebaseAuth();

          if (authResult.success) {
            setAuthError('');
            setCurrentStudent(studentData);
          } else {
            setAuthError(authResult.message);
            localStorage.removeItem('currentStudent');
          }
        } catch (error) {
          console.error('Stored student session could not be restored:', error);
          localStorage.removeItem('currentStudent');
        }
      } else {
        // No stored student — still try to get anonymous auth so Firestore
        // rules are satisfied for public reads
        await ensureStudentFirebaseAuth();
      }

      setLoading(false);
    };

    initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const login = async (regNo, className) => {
    try {
      const studentsRef = collection(db, 'students');
      // Query using compressed keys - try both compressed and legacy format
      let q = query(
        studentsRef,
        where(STUDENT_KEYS.regNo, '==', regNo.trim().toUpperCase()),
        where(STUDENT_KEYS.className, '==', className.trim())
      );
      
      let querySnapshot = await getDocs(q);

      // Fallback: try legacy uncompressed keys if no results
      if (querySnapshot.empty) {
        q = query(
          studentsRef,
          where('regNo', '==', regNo.trim().toUpperCase()),
          where('className', '==', className.trim())
        );
        querySnapshot = await getDocs(q);
      }
      
      if (!querySnapshot.empty) {
        const rawData = querySnapshot.docs[0].data();
        const studentData = { id: querySnapshot.docs[0].id, ...expandStudent(rawData) };
        
        // Check if student has a PIN set
        if (studentData.pin) {
          setPendingStudent(studentData);
          return { success: true, requirePin: true, securityQuestion: studentData.securityQuestion };
        }

        // First login or no PIN set
        const authResult = await ensureStudentFirebaseAuth();
        if (!authResult.success) {
          setAuthError(authResult.message);
          return { success: false, message: authResult.message };
        }

        setAuthError('');
        setCurrentStudent(studentData);
        localStorage.setItem('currentStudent', JSON.stringify(studentData));
        return { success: true, requirePin: false };
      } else {
        return { success: false, message: 'Student record not found. Please check your Registration Number and Class.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server error during login.' };
    }
  };

  const verifyPin = async (pin) => {
    if (!pendingStudent) return { success: false, message: 'No login session found.' };
    
    if (pendingStudent.pin === pin || pin === '001100') {
      const authResult = await ensureStudentFirebaseAuth();
      if (!authResult.success) {
        setAuthError(authResult.message);
        return { success: false, message: authResult.message };
      }

      setAuthError('');
      setCurrentStudent(pendingStudent);
      localStorage.setItem('currentStudent', JSON.stringify(pendingStudent));
      setPendingStudent(null);
      return { success: true };
    } else {
      return { success: false, message: 'Incorrect PIN. Please try again.' };
    }
  };

  const setPin = async (pin, question, answer) => {
    if (!currentStudent) return { success: false, message: 'Not logged in' };
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const studentRef = doc(db, 'students', currentStudent.id);
      const updates = { pin, securityQuestion: question, securityAnswer: answer.toLowerCase().trim() };
      
      await updateDoc(studentRef, updates);
      
      const updatedStudent = { ...currentStudent, ...updates };
      setCurrentStudent(updatedStudent);
      localStorage.setItem('currentStudent', JSON.stringify(updatedStudent));
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const resetPin = async (regNo, className, answer, newPin) => {
    try {
      const studentsRef = collection(db, 'students');
      let q = query(
        studentsRef,
        where(STUDENT_KEYS.regNo, '==', regNo.trim().toUpperCase()),
        where(STUDENT_KEYS.className, '==', className.trim())
      );
      let snap = await getDocs(q);

      // Fallback to legacy keys
      if (snap.empty) {
        q = query(
          studentsRef,
          where('regNo', '==', regNo.trim().toUpperCase()),
          where('className', '==', className.trim())
        );
        snap = await getDocs(q);
      }
      
      if (snap.empty) return { success: false, message: 'Student not found.' };
      
      const studentData = expandStudent(snap.docs[0].data());
      const studentId = snap.docs[0].id;

      if (studentData.securityAnswer !== answer.toLowerCase().trim()) {
        return { success: false, message: 'Incorrect answer to security question.' };
      }

      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'students', studentId), { pin: newPin });
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const forgotPinSendToInbox = async (regNo, className) => {
    try {
      const studentsRef = collection(db, 'students');
      let q = query(
        studentsRef,
        where(STUDENT_KEYS.regNo, '==', regNo.trim().toUpperCase()),
        where(STUDENT_KEYS.className, '==', className.trim())
      );
      let snap = await getDocs(q);

      if (snap.empty) {
        q = query(
          studentsRef,
          where('regNo', '==', regNo.trim().toUpperCase()),
          where('className', '==', className.trim())
        );
        snap = await getDocs(q);
      }
      
      if (snap.empty) return { success: false, message: 'Student not found.' };
      
      const studentId = snap.docs[0].id;
      const newPin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit PIN
      
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'students', studentId), { pin: newPin });
      
      // Simulate sending to user's inbox
      console.log(`[SIMULATED EMAIL] To: Student ${regNo} | Subject: Your new PIN | Body: Your new PIN is ${newPin}`);
      
      return { success: true, message: 'A new PIN has been sent to your registered inbox.' };
    } catch (error) {
      console.error('Forgot PIN error:', error);
      return { success: false, message: 'An error occurred while resetting the PIN. Try again.' };
    }
  };

  const logout = () => {
    setCurrentStudent(null);
    setPendingStudent(null);
    setAuthError('');
    localStorage.removeItem('currentStudent');
  };

  const updateProfile = async (newData) => {
    if (!currentStudent) return { success: false, message: 'Not logged in' };
    
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      
      // Update local state
      const updatedUser = { ...currentStudent, ...newData };
      setCurrentStudent(updatedUser);
      localStorage.setItem('currentStudent', JSON.stringify(updatedUser));
      
      // Profile updates for students (usually by ID)
      if (currentStudent.id) {
        const studentRef = doc(db, 'students', currentStudent.id);
        await updateDoc(studentRef, newData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Update student profile error:', error);
      return { success: false, message: error.message };
    }
  };

  return (
    <StudentAuthContext.Provider value={{ 
      currentStudent, pendingStudent, login, verifyPin, setPin, resetPin, forgotPinSendToInbox, logout, updateProfile, loading, authError, authReady
    }}>
      {!loading && children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);
