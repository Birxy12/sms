import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  // Load student on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedStudent = localStorage.getItem('currentStudent');
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
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (regNo, className) => {
    try {
      const studentsRef = collection(db, 'students');
      const q = query(
        studentsRef, 
        where('regNo', '==', regNo.trim().toUpperCase()), 
        where('className', '==', className.trim())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        
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
    
    if (pendingStudent.pin === pin) {
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
      const q = query(
        studentsRef, 
        where('regNo', '==', regNo.trim().toUpperCase()), 
        where('className', '==', className.trim())
      );
      const snap = await getDocs(q);
      
      if (snap.empty) return { success: false, message: 'Student not found.' };
      
      const studentData = snap.docs[0].data();
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
      currentStudent, pendingStudent, login, verifyPin, setPin, resetPin, logout, updateProfile, loading, authError 
    }}>
      {!loading && children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);
