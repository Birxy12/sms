import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ensureFirebaseAuth } from '../lib/ensureAuth';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';

/**
 * Cutoff threshold for real-time online presence (75 seconds).
 * Heartbeats run every 25 seconds; allowing 3 missed intervals for jitter.
 */
const PRESENCE_CUTOFF_MS = 75 * 1000;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const DEBOUNCE_HEARTBEAT_MS = 8 * 1000;
const PRUNE_INTERVAL_MS = 180 * 1000; // 3 minutes

/**
 * Retrieve or generate persistent Client ID (unique per browser / device profile).
 */
const getPersistentClientId = () => {
  if (typeof window === 'undefined') return 'server_client';
  try {
    let clientId = localStorage.getItem('sms_presence_client_id');
    if (!clientId) {
      clientId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('sms_presence_client_id', clientId);
    }
    return clientId;
  } catch (e) {
    return 'dev_' + Math.random().toString(36).substring(2, 11);
  }
};

/**
 * Retrieve or generate persistent Tab Session ID (unique per browser tab).
 */
const getTabSessionId = () => {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let sessionId = sessionStorage.getItem('sms_presence_tab_id');
    if (!sessionId) {
      sessionId = 'tab_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('sms_presence_tab_id', sessionId);
    }
    return sessionId;
  } catch (e) {
    return 'tab_' + Math.random().toString(36).substring(2, 11);
  }
};

const getInitialCachedCount = () => {
  if (typeof window === 'undefined') return 1;
  try {
    const cached = sessionStorage.getItem('sms_cached_online_count') || localStorage.getItem('sms_cached_online_count');
    return cached ? Math.max(1, parseInt(cached, 10)) : 1;
  } catch (e) {
    return 1;
  }
};

/**
 * Singleton PresenceManager coordinating a single Firestore snapshot listener,
 * single heartbeat timer, inter-tab broadcast, and all mounted components.
 */
class PresenceManager {
  constructor() {
    this.clientId = getPersistentClientId();
    this.sessionId = `${this.clientId}_${getTabSessionId()}`;
    this.currentUser = null;
    this.currentCount = getInitialCachedCount();
    this.listeners = new Set();
    this.subscribersCount = 0;
    this.isStarted = false;
    this.unsubscribeSnapshot = null;
    this.heartbeatTimer = null;
    this.lastHeartbeatTime = 0;
    this.lastPruneTime = 0;
    this.broadcastChannel = null;

    this.initBroadcastChannel();
    this.initWindowEvents();
  }

  initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.broadcastChannel = new BroadcastChannel('sms_presence_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'COUNT_UPDATE' && typeof event.data.count === 'number') {
          this.setCount(Math.max(1, event.data.count), false);
        }
      };
    } catch (e) {
      // Ignore broadcast channel errors
    }
  }

  initWindowEvents() {
    if (typeof window === 'undefined') return;

    const onActivity = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      this.sendHeartbeat(false);
    };

    window.addEventListener('focus', onActivity, { passive: true });
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.sendHeartbeat(true);
        }
      });
    }

    const handleUnload = () => {
      this.cleanupDoc();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  getUserId() {
    const u = this.currentUser;
    return (u?.id || u?.regNo || u?.email || u?.username || `guest_${this.clientId}`);
  }

  getUserName() {
    const u = this.currentUser;
    return (u?.name || u?.['STUDENT NAME'] || u?.username || 'Guest Visitor');
  }

  getUserRole() {
    const u = this.currentUser;
    return (u?.role || (u?.regNo ? 'Student' : 'Guest'));
  }

  setUser(user) {
    const prevUserId = this.getUserId();
    this.currentUser = user || null;
    const newUserId = this.getUserId();

    if (prevUserId !== newUserId && this.isStarted) {
      this.sendHeartbeat(true);
    }
  }

  setCount(newCount, broadcast = true) {
    const count = Math.max(1, newCount);
    if (this.currentCount === count) return;
    this.currentCount = count;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sms_cached_online_count', String(count));
        localStorage.setItem('sms_cached_online_count', String(count));
      }
    } catch (e) {}

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'COUNT_UPDATE', count });
      } catch (e) {}
    }

    this.listeners.forEach((listener) => {
      try {
        listener(count);
      } catch (e) {}
    });
  }

  async sendHeartbeat(force = false) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const now = Date.now();
    if (!force && (now - this.lastHeartbeatTime < DEBOUNCE_HEARTBEAT_MS)) {
      return;
    }
    this.lastHeartbeatTime = now;

    try {
      await ensureFirebaseAuth();
      const presenceRef = doc(db, 'presence', this.sessionId);
      await setDoc(presenceRef, {
        userId: this.getUserId(),
        clientId: this.clientId,
        sessionId: this.sessionId,
        userName: this.getUserName(),
        userRole: this.getUserRole(),
        lastSeen: now,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      // Silent catch
    }
  }

  cleanupDoc() {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const presenceRef = doc(db, 'presence', this.sessionId);
      deleteDoc(presenceRef).catch(() => {});
    } catch (e) {}
  }

  start() {
    this.subscribersCount++;
    if (this.isStarted) return;
    this.isStarted = true;

    this.sendHeartbeat(true);

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      // If tab is active / visible, send heartbeat
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.sendHeartbeat(true);
      }
    }, HEARTBEAT_INTERVAL_MS);

    this.attachSnapshotListener();
  }

  attachSnapshotListener() {
    if (typeof this.unsubscribeSnapshot === 'function') {
      try { this.unsubscribeSnapshot(); } catch (e) {}
      this.unsubscribeSnapshot = null;
    }

    try {
      const presenceCol = collection(db, 'presence');
      this.unsubscribeSnapshot = onSnapshot(presenceCol, (snapshot) => {
        const now = Date.now();
        const activeUsers = new Set();
        const staleDocIds = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data) return;

          let lastSeenMs = 0;
          if (typeof data.lastSeen === 'number') {
            lastSeenMs = data.lastSeen;
          } else if (data.lastSeen?.toMillis) {
            lastSeenMs = data.lastSeen.toMillis();
          } else if (data.lastSeen?.seconds) {
            lastSeenMs = data.lastSeen.seconds * 1000;
          } else if (data.updatedAt) {
            lastSeenMs = new Date(data.updatedAt).getTime() || 0;
          }

          if (lastSeenMs) {
            const diff = now - lastSeenMs;
            // Bounded window check: accounts for mild clock skew (-15s) and cutoff (+75s)
            if (diff >= -15000 && diff <= PRESENCE_CUTOFF_MS) {
              const effectiveUserId = data.userId || (data.clientId ? `guest_${data.clientId}` : docSnap.id);
              activeUsers.add(effectiveUserId);
            } else if (diff > PRUNE_INTERVAL_MS) {
              staleDocIds.push(docSnap.id);
            }
          } else {
            staleDocIds.push(docSnap.id);
          }
        });

        // Always ensure current user / client is included when online
        const myUserId = this.getUserId();
        if (myUserId) {
          activeUsers.add(myUserId);
        }

        const finalCount = Math.max(1, activeUsers.size);
        this.setCount(finalCount, true);

        // Periodic light background pruning of dead presence docs
        if (staleDocIds.length > 0 && (now - this.lastPruneTime > PRUNE_INTERVAL_MS)) {
          this.lastPruneTime = now;
          staleDocIds.slice(0, 15).forEach((staleId) => {
            deleteDoc(doc(db, 'presence', staleId)).catch(() => {});
          });
        }
      }, (err) => {
        // Retry connection on network recovery
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setTimeout(() => {
            if (this.isStarted && navigator.onLine) {
              this.attachSnapshotListener();
            }
          }, 8000);
        }
      });
    } catch (e) {
      // Silent catch
    }
  }

  stop() {
    this.subscribersCount = Math.max(0, this.subscribersCount - 1);
    if (this.subscribersCount === 0) {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (typeof this.unsubscribeSnapshot === 'function') {
        try { this.unsubscribeSnapshot(); } catch (e) {}
        this.unsubscribeSnapshot = null;
      }
      this.isStarted = false;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentCount);
    this.start();

    return () => {
      this.listeners.delete(listener);
      this.stop();
    };
  }
}

// Global Singleton Instance
const presenceManager = new PresenceManager();

/**
 * Hook to track and return the live number of online / logged in users across the webapp at light speed.
 * Synchronized across all components and browser tabs.
 */
export const useOnlineUsers = (user) => {
  const [onlineCount, setOnlineCount] = useState(presenceManager.currentCount);

  useEffect(() => {
    presenceManager.setUser(user);
  }, [user?.id, user?.regNo, user?.email, user?.username, user?.role]);

  useEffect(() => {
    const unsubscribe = presenceManager.subscribe((count) => {
      setOnlineCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return onlineCount;
};
