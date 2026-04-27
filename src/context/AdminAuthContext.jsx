/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';


const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted admin session
    const savedAdmin = localStorage.getItem('adminUser');
    if (savedAdmin) {
      setCurrentAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    // 1. Check hardcoded Admin credentials
    if (identifier === 'globixtechinc@gmail.com' && password === '@@@@@@@@') {
      const adminUser = { email: identifier, role: 'admin', name: 'System Administrator', staffId: 'ADMIN/001' };
      setCurrentAdmin(adminUser);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      return { success: true };
    }
    
    // 2. Principal Login
    if (identifier === 'bdspal' && password === '@@@@@@@@') {
      const adminUser = { email: 'principal@bonusdominus.edu', role: 'principal', name: 'School Principal', staffId: 'BDS/PRIN/001' };
      setCurrentAdmin(adminUser);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      return { success: true };
    }
    
    // 3. Bursar Login
    if (identifier === 'bussar' && password === '@@@@@@@@') {
      const adminUser = { email: 'bursar@bonusdominus.edu', role: 'bursar', name: 'School Bursar', staffId: 'BDS/BUR/001' };
      setCurrentAdmin(adminUser);
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      return { success: true };
    }
    
    // 4. Try Firestore lookup (either by Email or Staff ID)
    try {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const staffRef = collection(db, 'staff');
      let q;
      const normalizedIdentifier = identifier.trim();
      
      if (normalizedIdentifier.includes('@')) {
        q = query(staffRef, where('email', '==', normalizedIdentifier.toLowerCase()));
      } else {
        // Try uppercase first (standard)
        q = query(staffRef, where('staffId', '==', normalizedIdentifier.toUpperCase()));
      }
      
      let querySnapshot = await getDocs(q);
      
      // If uppercase search failed and it's not an email, try lowercase/raw search
      if (querySnapshot.empty && !normalizedIdentifier.includes('@')) {
        const qRaw = query(staffRef, where('staffId', '==', normalizedIdentifier.toLowerCase()));
        querySnapshot = await getDocs(qRaw);
        
        if (querySnapshot.empty) {
           const qLiteral = query(staffRef, where('staffId', '==', normalizedIdentifier));
           querySnapshot = await getDocs(qLiteral);
        }
      }
      
      if (!querySnapshot.empty) {
        const staffData = querySnapshot.docs[0].data();
        // Allow the user-defined password OR the default 134
        if (staffData.password === password || (password === '134' && !staffData.password)) {
          const user = { ...staffData, id: querySnapshot.docs[0].id };
          setCurrentAdmin(user);
          localStorage.setItem('adminUser', JSON.stringify(user));
          return { success: true };
        }
      }
    } catch (error) {
      console.error('Staff login error:', error);
    }

    return { success: false, message: 'Invalid credentials. Teachers default password is 134' };
  };

  const logout = () => {
    setCurrentAdmin(null);
    localStorage.removeItem('adminUser');
    // Also sign out Firebase Auth if used
    import('../lib/firebase').then(({ auth }) => {
      import('firebase/auth').then(({ signOut }) => signOut(auth).catch(() => {}));
    });
  }; // end logout


  // ── Google Sign-In (staff only) ──────────────────────────────────────────
  const loginWithGoogle = async () => {
    try {
      const { auth, db } = await import('../lib/firebase');
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleEmail = result.user.email?.toLowerCase();

      if (!googleEmail) return { success: false, message: 'Could not retrieve email from Google.' };

      const q = query(collection(db, 'staff'), where('email', '==', googleEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: 'No staff account found for this Google email. Contact admin.' };
      }

      const staffData = { ...snap.docs[0].data(), id: snap.docs[0].id };
      if (staffData.status === 'pending') {
        return { success: false, message: 'Your account is pending admin approval.' };
      }

      setCurrentAdmin(staffData);
      localStorage.setItem('adminUser', JSON.stringify(staffData));
      return { success: true, role: staffData.role };
    } catch (err) {
      if (err.code === 'auth/configuration-not-found') {
        return { success: false, message: 'Google Sign-In is not enabled for this project. Please contact the administrator to enable it in the Firebase Console.' };
      }
      if (err.code === 'auth/popup-closed-by-user') return { success: false, message: '' };
      return { success: false, message: 'Google sign-in failed. Try again.' };
    }
  };

  // ── Phone Number Login (staff only) ──────────────────────────────────────
  const loginWithPhone = async (phone, password) => {
    try {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const normalizedPhone = phone.trim().replace(/\s+/g, '');
      const q = query(collection(db, 'staff'), where('phone', '==', normalizedPhone));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: 'No staff account found with that phone number.' };
      }

      const staffData = snap.docs[0].data();
      if (staffData.status === 'pending') {
        return { success: false, message: 'Your account is pending admin approval.' };
      }

      if (staffData.password === password || (password === '134' && !staffData.password)) {
        const user = { ...staffData, id: snap.docs[0].id };
        setCurrentAdmin(user);
        localStorage.setItem('adminUser', JSON.stringify(user));
        return { success: true, role: staffData.role };
      }

      return { success: false, message: 'Incorrect password. Default is 134.' };
    } catch (err) {
      console.error('Phone login error:', err);
      return { success: false, message: 'Login failed. Check your connection.' };
    }
  };

  const registerStaff = async (staffData) => {
    try {
      const { db } = await import('../lib/firebase');
      const { collection, addDoc, query, where, getDocs } = await import('firebase/firestore');

      // Check if email or phone already exists
      const staffRef = collection(db, 'staff');
      const qEmail = query(staffRef, where('email', '==', staffData.email.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) return { success: false, message: 'Email already registered.' };

      const qPhone = query(staffRef, where('phone', '==', staffData.phone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) return { success: false, message: 'Phone number already registered.' };

      await addDoc(staffRef, {
        ...staffData,
        email: staffData.email.toLowerCase(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (err) {
      console.error('Staff registration error:', err);
      return { success: false, message: 'Registration failed. Try again.' };
    }
  };

  const updateProfile = async (newData) => {

    if (!currentAdmin) return { success: false, message: 'Not logged in' };
    
    try {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      // Update local state
      const updatedUser = { ...currentAdmin, ...newData };
      setCurrentAdmin(updatedUser);
      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      
      // If it's a staff member (has an id from Firestore), update the DB
      if (currentAdmin.id) {
        const staffRef = doc(db, 'staff', currentAdmin.id);
        await updateDoc(staffRef, newData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message };
    }
  };

  const value = {
    currentAdmin,
    login,
    loginWithGoogle,
    loginWithPhone,
    registerStaff,
    logout,
    updateProfile,
    loading
  };


  return (
    <AdminAuthContext.Provider value={value}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
