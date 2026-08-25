/**
 * WhatsApp integration utility for school communication, private chats, and PIN resets.
 */

// Default school support WhatsApp number (Nigerian format)
export const DEFAULT_SCHOOL_WHATSAPP = '2348030000000';

/**
 * Normalizes any phone number into standard international format for WhatsApp (e.g., 2348012345678).
 * Handles Nigerian local prefixes (080, 081, 070, 090, 091), removes spaces, symbols, plus signs.
 * 
 * @param {string} phone 
 * @returns {string} clean phone number for wa.me
 */
export const formatWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, ''); // strip non-digits

  // If starts with 0 (e.g. 08031234567), replace leading 0 with 234
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.startsWith('234')) {
    // already starts with 234
  } else if (cleaned.length === 10 && (cleaned.startsWith('80') || cleaned.startsWith('81') || cleaned.startsWith('70') || cleaned.startsWith('90') || cleaned.startsWith('91'))) {
    cleaned = '234' + cleaned;
  }

  return cleaned;
};

/**
 * Creates a direct WhatsApp chat URL with pre-filled message.
 * 
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @returns {string} https://wa.me/... URL
 */
export const createWhatsAppChatUrl = (phone, message = '') => {
  const cleanPhone = formatWhatsAppPhone(phone) || DEFAULT_SCHOOL_WHATSAPP;
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
};

/**
 * Generates a WhatsApp PIN Reset message URL for a student.
 * 
 * @param {Object} params
 * @param {string} params.phone - Student registered phone number
 * @param {string} params.studentName - Student name
 * @param {string} params.regNo - Student registration number
 * @param {string} params.newPin - Generated 6-digit PIN
 * @param {string} [params.className] - Student class
 * @param {string} [params.schoolName] - School name
 * @returns {{ url: string, message: string, cleanPhone: string, hasPhone: boolean }}
 */
export const generateWhatsAppPinReset = ({
  phone,
  studentName = 'Student',
  regNo = '',
  newPin,
  className = '',
  schoolName = 'Bonus Dominus School'
}) => {
  const cleanPhone = formatWhatsAppPhone(phone);
  const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 10);

  const message = `🔐 *${schoolName.toUpperCase()} - PORTAL PIN NOTIFICATION*\n\n` +
    `Hello *${studentName}*${regNo ? ` (${regNo})` : ''}${className ? ` [Class: ${className}]` : ''},\n\n` +
    `Your secure 6-digit Portal Login PIN has been generated/reset:\n\n` +
    `🔑 *Your New PIN: ${newPin}*\n\n` +
    `Please use this PIN together with your Registration Number to access your Student Dashboard and Report Cards.\n\n` +
    `⚠️ *Important*: Keep your PIN confidential. Do not share it with unauthorized persons.`;

  const url = hasPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    url,
    message,
    cleanPhone,
    hasPhone
  };
};

/**
 * Opens WhatsApp in a new browser tab or native app.
 * 
 * @param {string} url 
 */
export const openWhatsApp = (url) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};
