// Utility to send notifications via the local Express server

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Sends a notification to students or parents.
 * 
 * @param {Object} options 
 * @param {'email' | 'sms' | 'both'} options.type - The type of notification to send.
 * @param {string} options.subject - The subject of the email (ignored for SMS).
 * @param {string} options.message - The body of the message.
 * @param {Array<{email?: string, phone?: string, name?: string}>} options.recipients - The list of recipients.
 * @returns {Promise<{success: boolean, results?: any, error?: string}>}
 */
export const sendNotification = async ({ type, subject, message, recipients }) => {
  try {
    const response = await fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        subject,
        message,
        recipients,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};
