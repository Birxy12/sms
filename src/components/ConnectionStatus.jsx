import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Firestore provides a special document that we can listen to for connection state
    // Note: This is more common in Realtime DB, but for Firestore we can use a "ping" listener
    // or simply rely on the fact that onSnapshot error handlers will catch connection issues.
    
    // However, a better way for Firestore is to monitor the window online/offline events
    // and combine it with the health of our snapshots.
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold animate-pulse border border-red-100 shadow-sm">
        <WifiOff size={14} />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
      <Wifi size={14} />
      <span>Connected</span>
    </div>
  );
};

export default ConnectionStatus;
