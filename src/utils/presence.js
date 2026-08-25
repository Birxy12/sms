import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { ensureFirebaseAuth } from '../lib/ensureAuth';
import { doc, setDoc, onSnapshot, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';

/**
 * Hook to track and return the live number of online / logged in users across the webapp at light speed.
 */
export const useOnlineUsers = (user) => {
  // Load cached online count for instant 0ms initial render
  const [onlineCount, setOnlineCount] = useState(() => {
    try {
      const cached = sessionStorage.getItem('sms_cached_online_count');
      return cached ? Math.max(1, parseInt(cached, 10)) : 1;
    } catch (e) {
      return 1;
    }
  });

  const lastHeartbeatTime = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;
    let interval = null;
    let broadcastChannel = null;

    // Fast inter-tab broadcast channel for instantaneous zero-latency local sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('sms_presence_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'COUNT_UPDATE' && typeof event.data.count === 'number' && isMounted) {
            setOnlineCount(Math.max(1, event.data.count));
          }
        };
      }
    } catch (e) {}

    // Generate or retrieve persistent session ID
    let sessionId = sessionStorage.getItem('sms_presence_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      sessionStorage.setItem('sms_presence_session_id', sessionId);
    }

    const userId = user?.id || user?.regNo || user?.email || sessionId;
    const userName = user?.name || user?.['STUDENT NAME'] || user?.username || 'Visitor';
    const userRole = user?.role || (user?.regNo ? 'Student' : 'Guest');

    const presenceRef = doc(db, 'presence', sessionId);

    // Light-speed heartbeat function
    const updateHeartbeat = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastHeartbeatTime.current < 8000) {
        return; // Debounce rapid activity bursts to 8s
      }
      lastHeartbeatTime.current = now;

      try {
        await setDoc(presenceRef, {
          userId,
          userName,
          userRole,
          lastSeen: Date.now(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        // Silent catch
      }
    };

    const startPresence = async () => {
      try {
        await ensureFirebaseAuth();
        if (!isMounted) return;

        // 1. Send immediate heartbeat on mount
        await updateHeartbeat(true);

        // 2. High-frequency 15-second heartbeat loop
        interval = setInterval(() => updateHeartbeat(true), 15000);

        // 3. Realtime Snapshot Listener for live updates across all network clients
        const presenceCol = collection(db, 'presence');
        unsubscribe = onSnapshot(presenceCol, (snapshot) => {
          if (!isMounted) return;
          const now = Date.now();
          const cutoff = now - 2 * 60 * 1000; // Active within last 2 minutes

          let count = 0;
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.lastSeen && data.lastSeen > cutoff) {
              count++;
            }
          });

          const finalCount = Math.max(1, count);
          setOnlineCount(finalCount);
          try {
            sessionStorage.setItem('sms_cached_online_count', String(finalCount));
            if (broadcastChannel) {
              broadcastChannel.postMessage({ type: 'COUNT_UPDATE', count: finalCount });
            }
          } catch (e) {}
        }, () => {
          // Fallback
          setOnlineCount(1);
        });
      } catch (e) {
        // Fallback
      }
    };

    startPresence();

    // Trigger instant heartbeat when user becomes active (focus, tab switch, interaction)
    const handleUserActivity = () => updateHeartbeat(false);
    window.addEventListener('focus', handleUserActivity);
    window.addEventListener('pointerdown', handleUserActivity);
    document.addEventListener('visibilitychange', handleUserActivity);

    // Instant cleanup on window unload
    const handleUnload = () => {
      try {
        deleteDoc(presenceRef).catch(() => {});
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {}
      }
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch (e) {}
      }
      window.removeEventListener('focus', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      document.removeEventListener('visibilitychange', handleUserActivity);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id, user?.regNo, user?.email]);

  return onlineCount;
};
