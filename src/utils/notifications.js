import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { ensureFirebaseAuth } from '../lib/ensureAuth';

/**
 * Sends notifications to students / classes / school globally via Firebase Firestore.
 * 
 * @param {Object} options 
 * @param {'in-app' | 'email' | 'sms' | 'both' | 'all'} options.type - The type/channel of notification.
 * @param {string} options.subject - The subject/title of the notification.
 * @param {string} options.message - The body of the message.
 * @param {'global' | 'class' | 'student'} [options.targetType='global'] - Target audience type.
 * @param {string} [options.targetValue=''] - Target class name or student regNo if targetType is 'class' or 'student'.
 * @param {Array<{email?: string, phone?: string, name?: string, regNo?: string}>} [options.recipients] - Optional list of specific recipients.
 * @returns {Promise<{success: boolean, results?: any, error?: string}>}
 */
export const sendNotification = async ({ 
  type = 'both', 
  subject = 'School Notice', 
  message = '', 
  targetType = 'global', 
  targetValue = '', 
  recipients = [] 
}) => {
  try {
    await ensureFirebaseAuth();

    const timestampIso = new Date().toISOString();

    // If specific individual recipients were passed
    if (recipients && recipients.length > 1) {
      const batch = writeBatch(db);
      recipients.forEach(r => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          title: subject || 'School Notification',
          message,
          type,
          targetType: 'student',
          targetValue: r.regNo || r.email || r.phone || '',
          recipientName: r.name || '',
          recipientEmail: r.email || '',
          recipientPhone: r.phone || '',
          read: false,
          createdAt: serverTimestamp(),
          timestamp: timestampIso
        });
      });
      await batch.commit();

      return {
        success: true,
        results: {
          totalSent: recipients.length,
          emailsSent: type === 'email' || type === 'both' || type === 'all' ? recipients.length : 0,
          smsSent: type === 'sms' || type === 'both' || type === 'all' ? recipients.length : 0
        }
      };
    }

    // Standard broadcast (global, class, or single student)
    const docRef = await addDoc(collection(db, 'notifications'), {
      title: subject || 'School Announcement',
      message,
      type,
      targetType: targetType || 'global',
      targetValue: targetValue || '',
      read: false,
      createdAt: serverTimestamp(),
      timestamp: timestampIso,
      recipientEmail: recipients?.[0]?.email || '',
      recipientPhone: recipients?.[0]?.phone || '',
      recipientName: recipients?.[0]?.name || ''
    });

    return {
      success: true,
      results: {
        id: docRef.id,
        totalSent: 1,
        emailsSent: type === 'email' || type === 'both' || type === 'all' ? 1 : 0,
        smsSent: type === 'sms' || type === 'both' || type === 'all' ? 1 : 0
      }
    };
  } catch (error) {
    console.error('Error sending notification via Firebase:', error);
    return { success: false, error: error.message || 'Firebase notification error' };
  }
};
