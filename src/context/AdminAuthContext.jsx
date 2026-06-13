/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';


const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  // authReady = true only after onAuthStateChanged confirms Firebase has a user
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeAuth = null;

    const initAuth = async () => {
      const savedAdmin = localStorage.getItem('adminUser');

      try {
        const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');

        // Listen for auth state — sets authReady once confirmed
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          setAuthReady(!!user);
        });

        if (savedAdmin) {
          setCurrentAdmin(JSON.parse(savedAdmin));
          // Re-establish Firebase anonymous auth
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }

          // Wait for auth to be truly ready
          await new Promise(resolve => {
            const unsub = onAuthStateChanged(auth, (user) => {
              if (user) {
                unsub();
                resolve();
              }
            });
            // Timeout after 5s just in case
            setTimeout(() => {
              unsub();
              resolve();
            }, 5000);
          });
        } else {
          // No stored admin — still sign in anonymously so public Firestore
          // reads (e.g. students collection) work without hitting permission errors
          if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Silent anonymous auth failed:', e);
      }

      setLoading(false);
    };

    initAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const login = async (identifier, password) => {
    // Helper: ensure Firebase anonymous auth is active so Firestore rules pass
    const ensureAuth = async () => {
      try {
        const { signInAnonymously } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        const { getAuth } = await import('firebase/auth');
        const currentAuth = getAuth();
        if (!currentAuth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.warn('Anonymous auth failed:', e);
      }
    };

    let userToVerify = null;

    // 1. Check hardcoded Admin credentials (fallback to prevent lockout)
    if (identifier === 'admin@birxysms.edu' && password === '@@@@@&&&&&') {
      await ensureAuth();
      userToVerify = { email: identifier, role: 'admin', name: 'System Administrator', staffId: 'ADMIN/001' };
    }
    // New Super Admin requested by user
    else if (identifier === 'globixtechinc@gmail.com' && password === 'J123456@@') {
      await ensureAuth();
      userToVerify = { 
        email: identifier, 
        role: 'admin', 
        name: 'Globix Admin', 
        staffId: 'ADMIN/002',
        firstLogin: true,
        isSuperAdmin: true
      };
    }
    // Principal hardcoded login
    else if (identifier === 'principal@birxysms.edu' && password === '@@@@@@@@') {
      await ensureAuth();
      // Check Firestore for existing record (so PIN/password changes persist)
      try {
        const { db } = await import('../lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'staff'), where('email', '==', 'principal@birxysms.edu')));
        if (!snap.empty) {
          const data = snap.docs[0].data();
          userToVerify = { ...data, id: snap.docs[0].id };
        } else {
          userToVerify = { email: identifier, role: 'principal', name: 'School Principal', staffId: 'PRINCIPAL/001', firstLogin: true };
        }
      } catch { userToVerify = { email: identifier, role: 'principal', name: 'School Principal', staffId: 'PRINCIPAL/001', firstLogin: true }; }
    }
    // Bursar hardcoded login
    else if (identifier === 'bursar@birxysms.edu' && password === '@@@@@@@@') {
      await ensureAuth();
      // Check Firestore for existing record (so PIN/password changes persist)
      try {
        const { db } = await import('../lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'staff'), where('email', '==', 'bursar@birxysms.edu')));
        if (!snap.empty) {
          const data = snap.docs[0].data();
          userToVerify = { ...data, id: snap.docs[0].id };
        } else {
          userToVerify = { email: identifier, role: 'bursar', name: 'School Bursar', staffId: 'BURSAR/001', firstLogin: true };
        }
      } catch { userToVerify = { email: identifier, role: 'bursar', name: 'School Bursar', staffId: 'BURSAR/001', firstLogin: true }; }
    }
    else {
      // 2. Try Firestore lookup (either by Email or Staff ID)
      try {
        const { db, auth } = await import('../lib/firebase');
        const { signInAnonymously } = await import('firebase/auth');
        await signInAnonymously(auth);

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
          // Check password matching exactly what's set in the DB
          if (staffData.password === password) {
            userToVerify = { ...staffData, id: querySnapshot.docs[0].id };
          }
        }
      } catch (error) {
        console.error('Staff login error:', error);
      }
    }

    if (userToVerify) {
      // First-login: force password change before anything else
      if (userToVerify.firstLogin) {
        return { success: true, requirePasswordChange: true, user: userToVerify };
      }
      if (!userToVerify.emailVerified && userToVerify.email !== 'admin@birxysms.edu' && userToVerify.email !== 'bursar@birxysms.edu' && userToVerify.email !== 'principal@birxysms.edu' && userToVerify.email !== 'globixtechinc@gmail.com') {
        return { success: true, requireEmailVerification: true, user: userToVerify };
      }
      if (!userToVerify.pin) {
        return { success: true, requirePinSetup: true, user: userToVerify };
      }
      return { success: true, requirePin: true, user: userToVerify };
    }

    return { success: false, message: 'Invalid credentials. Please verify your password.' };
  };

  const completeLogin = (user) => {
    setCurrentAdmin(user);
    localStorage.setItem('adminUser', JSON.stringify(user));
  };

  const setupPin = async (user, pin) => {
    try {
      if (user.id) {
        const { db } = await import('../lib/firebase');
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'staff', user.id), { pin });
      }
      const updatedUser = { ...user, pin };
      completeLogin(updatedUser);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Failed to set PIN.' };
    }
  };

  const verifyPin = async (user, pin) => {
    if (user.pin === pin) {
      completeLogin(user);
      return { success: true };
    }
    return { success: false, message: 'Incorrect PIN.' };
  };

  const sendVerificationEmail = async (email) => {
    console.log(`[SIMULATED EMAIL] To: ${email} | Subject: Verify your email | Body: Your verification code is 123456`);
    return { success: true, message: 'Verification code sent to email.' };
  };

  const verifyEmail = async (user, code) => {
    if (code === '123456') { // Mock verification code
      try {
        if (user.id) {
          const { db } = await import('../lib/firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'staff', user.id), { emailVerified: true });
        }
        const updatedUser = { ...user, emailVerified: true };
        if (!updatedUser.pin) {
          return { success: true, requirePinSetup: true, user: updatedUser };
        }
        return { success: true, requirePin: true, user: updatedUser };
      } catch (err) {
        return { success: false, message: 'Error verifying email.' };
      }
    }
    return { success: false, message: 'Invalid verification code.' };
  };

  const registerPasskey = async (user) => {
    try {
      if (!window.PublicKeyCredential) return { success: false, message: 'WebAuthn not supported' };
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const publicKey = {
        challenge,
        rp: { name: "Bright Day School" },
        user: { id: Uint8Array.from(user.email, c => c.charCodeAt(0)), name: user.email, displayName: user.name },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform" },
        timeout: 60000,
        attestation: "none"
      };
      const credential = await navigator.credentials.create({ publicKey });
      if (credential) {
        if (user.id) {
          const { db } = await import('../lib/firebase');
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'staff', user.id), { passkeyId: credential.id });
        }
        return { success: true };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Passkey registration failed' };
    }
  };

  const loginWithPasskey = async () => {
    try {
      if (!window.PublicKeyCredential) return { success: false, message: 'WebAuthn not supported' };
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.get({ publicKey: { challenge, timeout: 60000 } });
      if (credential) {
        const { db } = await import('../lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'staff'), where('passkeyId', '==', credential.id)));
        if (!snap.empty) {
          const staffData = { ...snap.docs[0].data(), id: snap.docs[0].id };
          completeLogin(staffData);
          return { success: true, role: staffData.role };
        }
        return { success: false, message: 'Passkey not recognized.' };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Passkey login failed' };
    }
    return { success: false, message: 'Login cancelled' };
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

      if (staffData.password === password) {
        const user = { ...staffData, id: snap.docs[0].id };
        setCurrentAdmin(user);
        localStorage.setItem('adminUser', JSON.stringify(user));
        return { success: true, role: staffData.role };
      }

      return { success: false, message: 'Incorrect password.' };
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
      const { doc, updateDoc, collection, query, where, getDocs, setDoc } = await import('firebase/firestore');
      
      // Update local state
      const updatedUser = { ...currentAdmin, ...newData };
      setCurrentAdmin(updatedUser);
      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      
      // If it's a staff member (has an id from Firestore), update the DB
      if (currentAdmin.id) {
        const staffRef = doc(db, 'staff', currentAdmin.id);
        await updateDoc(staffRef, newData);
      } else {
        // Super Admin or someone without a record yet
        // Check if a record exists by email
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where('email', '==', currentAdmin.email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const docId = snap.docs[0].id;
          await updateDoc(doc(db, 'staff', docId), newData);
          // Also update local state with the ID for future edits
          const userWithId = { ...updatedUser, id: docId };
          setCurrentAdmin(userWithId);
          localStorage.setItem('adminUser', JSON.stringify(userWithId));
        } else {
          // Create new record
          const { addDoc } = await import('firebase/firestore');
          const newDoc = await addDoc(staffRef, {
            ...currentAdmin,
            ...newData,
            createdAt: new Date().toISOString()
          });
          const userWithId = { ...updatedUser, id: newDoc.id };
          setCurrentAdmin(userWithId);
          localStorage.setItem('adminUser', JSON.stringify(userWithId));
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: error.message };
    }
  };

  const changePassword = async (newPassword, targetUser = null) => {
    const user = targetUser || currentAdmin;
    if (!user) return { success: false, message: 'Not logged in' };
    try {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc, collection, query, where, getDocs, addDoc, setDoc } = await import('firebase/firestore');
      
      let staffId = user.id;
      if (!staffId) {
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          staffId = snap.docs[0].id;
        }
      }

      if (staffId) {
        await updateDoc(doc(db, 'staff', staffId), { password: newPassword, firstLogin: false });
      } else {
        // Create the record for principal/bursar on first password change
        const newRef = await addDoc(collection(db, 'staff'), {
          ...user,
          password: newPassword,
          firstLogin: false,
          createdAt: new Date().toISOString()
        });
        staffId = newRef.id;
      }
      
      // If changing own password, update local state
      if (!targetUser && currentAdmin) {
        const updatedUser = { ...currentAdmin, id: staffId, password: newPassword, firstLogin: false };
        setCurrentAdmin(updatedUser);
        localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: error.message };
    }
  };

  // Admin-only: reset another staff member's password and/or PIN
  const adminResetCredentials = async (staffId, { newPassword, clearPin } = {}) => {
    if (!currentAdmin || (currentAdmin.role !== 'admin' && !currentAdmin.isSuperAdmin)) {
      return { success: false, message: 'Only admins can reset credentials.' };
    }
    try {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const updates = {};
      if (newPassword) { updates.password = newPassword; updates.firstLogin = true; }
      if (clearPin) { updates.pin = null; }
      await updateDoc(doc(db, 'staff', staffId), updates);
      return { success: true };
    } catch (error) {
      console.error('Admin reset error:', error);
      return { success: false, message: error.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { db } = await import('../lib/firebase');
      const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
      
      const staffRef = collection(db, 'staff');
      const q = query(staffRef, where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, message: 'No account found with that email address.' };
      }
      
      const staffId = snap.docs[0].id;
      const newPassword = Math.random().toString(36).slice(-8); // Generate an 8-character password
      
      // Update password in DB
      await updateDoc(doc(db, 'staff', staffId), { password: newPassword });
      
      // In a real application, you would trigger an email via Firebase Functions/Email extension.
      // For now, we simulate sending the email to the user's inbox.
      console.log(`[SIMULATED EMAIL] To: ${email} | Subject: Your new password | Body: Your new password is ${newPassword}`);
      
      return { success: true, message: 'A new password has been sent to your email inbox.' };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, message: 'An error occurred while resetting the password. Try again.' };
    }
  };

  const value = {
    currentAdmin,
    login,
    completeLogin,
    setupPin,
    verifyPin,
    sendVerificationEmail,
    verifyEmail,
    registerPasskey,
    loginWithPasskey,
    loginWithGoogle,
    loginWithPhone,
    registerStaff,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    adminResetCredentials,
    loading,
    authReady
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
