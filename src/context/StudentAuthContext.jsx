import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StudentAuthContext = createContext();

export const StudentAuthProvider = ({ children }) => {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load student on mount
  useEffect(() => {
    const storedStudent = localStorage.getItem('currentStudent');
    if (storedStudent) {
      setCurrentStudent(JSON.parse(storedStudent));
    }
    setLoading(false);
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
        setCurrentStudent(studentData);
        localStorage.setItem('currentStudent', JSON.stringify(studentData));
        return { success: true };
      } else {
        return { success: false, message: 'Student record not found. Please check your Registration Number and Class.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message && error.message.includes('Database \'(default)\' not found')) {
        return { 
          success: false, 
          message: 'Firestore Database is not enabled. Please enable Firestore in your Firebase Console for project "schoolportals12".' 
        };
      }
      return { success: false, message: 'Server error during login. Please try again later.' };
    }
  };

  const logout = () => {
    setCurrentStudent(null);
    localStorage.removeItem('currentStudent');
  };

  const updateProfile = async (newData) => {
    if (!currentStudent) return { success: false, message: 'Not logged in' };
    
    try {
      const { db } = await import('../lib/firebase');
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
    <StudentAuthContext.Provider value={{ currentStudent, login, logout, updateProfile, loading }}>
      {!loading && children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => useContext(StudentAuthContext);
