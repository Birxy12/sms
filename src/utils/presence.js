import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';

/**
 * Hook to track and return the live number of online / logged in users across the webapp.
 */
export const useOnlineUsers = (user) => {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    // Generate or retrieve unique session ID
    let sessionId = sessionStorage.getItem('sms_presence_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      sessionStorage.setItem('sms_presence_session_id', sessionId);
    }

    const userId = user?.id || user?.regNo || user?.email || sessionId;
    const userName = user?.name || user?.['STUDENT NAME'] || user?.username || 'Visitor';
    const userRole = user?.role || (user?.regNo ? 'Student' : 'Guest');

    const presenceRef = doc(db, 'presence', sessionId);

    // Heartbeat function to update presence
    const updateHeartbeat = async () => {
      try {
        await setDoc(presenceRef, {
          userId,
          userName,
          userRole,
          lastSeen: Date.now(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        // Silent catch for network/permission delays
      }
    };

    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 60000); // 1-minute heartbeat

    // Listen to active presence within last 5 minutes
    const presenceCol = collection(db, 'presence');
    const unsubscribe = onSnapshot(presenceCol, (snapshot) => {
      const now = Date.now();
      const cutoff = now - 5 * 60 * 1000; // 5 minutes
      
      let count = 0;
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.lastSeen && data.lastSeen > cutoff) {
          count++;
        }
      });

      // Ensure at least 1 (current user)
      setOnlineCount(Math.max(1, count));
    }, () => {
      // Fallback
      setOnlineCount(1);
    });

    // Cleanup on window unload or unmount
    const handleUnload = () => {
      try {
        deleteDoc(presenceRef);
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id, user?.regNo, user?.email]);

  return onlineCount;
};
