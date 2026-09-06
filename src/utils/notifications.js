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
    let emailsQueued = 0;
    let smsQueued = 0;
    let notifsQueued = 0;

    const wantsEmail = ['email', 'both', 'all'].includes(type);
    const wantsSms = ['sms', 'both', 'all'].includes(type);
    const wantsInApp = ['in-app', 'both', 'all'].includes(type);

    const batch = writeBatch(db);

    // Helper to queue a single recipient's messages
    const queueForRecipient = (r) => {
      // 1. In-App Notification
      if (wantsInApp) {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          title: subject || 'School Notification',
          message,
          type,
          targetType: targetType === 'global' ? 'global' : 'student',
          targetValue: targetType === 'global' ? '' : (r.regNo || r.email || r.phone || targetValue),
          recipientName: r.name || '',
          recipientEmail: r.email || '',
          recipientPhone: r.phone || '',
          read: false,
          createdAt: serverTimestamp(),
          timestamp: timestampIso
        });
        notifsQueued++;
      }

      // 2. Email (For Firebase "Trigger Email" Extension)
      if (wantsEmail && r.email) {
        const mailRef = doc(collection(db, 'mail'));
        batch.set(mailRef, {
          to: r.email,
          message: {
            subject: subject || 'School Notification',
            text: message,
            html: `<div style="font-family:sans-serif;padding:20px;"><h2>${subject || 'School Notification'}</h2><p>${message.replace(/\n/g, '<br/>')}</p></div>`
          },
          createdAt: serverTimestamp()
        });
        emailsQueued++;
      }

      // 3. SMS (For Firebase "Twilio Send Message" Extension)
      if (wantsSms && r.phone) {
        const smsRef = doc(collection(db, 'messages'));
        // Make sure phone is formatted cleanly (extension expects E.164, assuming user inputs correctly)
        const cleanPhone = r.phone.replace(/[^+\d]/g, ''); 
        if (cleanPhone) {
          batch.set(smsRef, {
            to: cleanPhone,
            body: `${subject ? subject.toUpperCase() + ':\n' : ''}${message}`,
            createdAt: serverTimestamp()
          });
          smsQueued++;
        }
      }
    };

    if (recipients && recipients.length > 0) {
      // Process specific recipients
      recipients.forEach(r => queueForRecipient(r));
    } else {
      // Broadcast/Single target without explicit recipients list
      queueForRecipient({
        email: '',
        phone: '',
        name: '',
        regNo: targetType === 'student' ? targetValue : ''
      });
    }

    await batch.commit();

    return {
      success: true,
      results: {
        totalSent: notifsQueued + emailsQueued + smsQueued,
        emailsSent: emailsQueued,
        smsSent: smsQueued,
        inAppSent: notifsQueued
      }
    };
  } catch (error) {
    console.error('Error sending notification via Firebase:', error);
    return { success: false, error: error.message || 'Firebase notification error' };
  }
};
