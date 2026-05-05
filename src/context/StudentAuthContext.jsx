import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StudentAuthContext = createContext();

export const StudentAuthProvider = ({ children }) => {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load student on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedStudent = localStorage.getItem('currentStudent');
      if (storedStudent) {
        const studentData = JSON.parse(storedStudent);
        setCurrentStudent(studentData);
        
        // Restore Firebase Auth session
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const { auth } = await import('../lib/firebase');
          await signInAnonymously(auth);
        } catch (authError) {
          console.error('Anonymous student auth restoration failed:', authError);
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
        try {
          const { signInAnonymously } = await import('firebase/auth');
          const { auth } = await import('../lib/firebase');
          await signInAnonymously(auth);
        } catch (authError) {
          console.error('Anonymous student auth failed:', authError);
        }

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
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        await signInAnonymously(auth);
      } catch (authError) {
        console.error('Anonymous student pin auth failed:', authError);
      }

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
      currentStudent, pendingStudent, login, verifyPin, setPin, resetPin, logout, updateProfile, loading 
    }}>
      {!loading && children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);
