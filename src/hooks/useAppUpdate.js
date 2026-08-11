import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const checkVersionAndSetupPush = async () => {
      try {
        // 1. Check Version from Firestore
        const appInfo = await App.getInfo();
        const currentVersion = appInfo.version; // e.g. "1.1"
        
        const configRef = doc(db, 'system_config', 'app_version');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const { latest_version } = configSnap.data();
          if (latest_version && latest_version !== currentVersion) {
            setLatestVersion(latest_version);
            setUpdateAvailable(true);
          }
        }

        // 2. Clear App Badge if opened
        try {
          await Badge.clear();
        } catch (e) {
          console.log('Badge clear not supported or failed', e);
        }

        // 3. Setup Push Notifications
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission denied');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('Push notification received: ', notification);
          // If it's an update notification, show badge
          if (notification.title?.toLowerCase().includes('update')) {
            try {
              await Badge.set({ count: 1 });
            } catch (e) {
              // ignore
            }
          }
        });

      } catch (error) {
        console.error('Error during update check or push setup:', error);
      }
    };

    checkVersionAndSetupPush();

    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  return { updateAvailable, latestVersion };
}
