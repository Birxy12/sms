/**
 * Formats a date string to YYYY-MM-DD format for HTML date inputs.
 * Handles common formats like DD/MM/YYYY, MM/DD/YYYY, etc.
 * @param {string|Date} dateVal 
 * @returns {string} Formatted date string or empty string
 */
export const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  
  // Handle Firestore Timestamp / object
  if (dateVal && typeof dateVal === 'object') {
    if (typeof dateVal.toDate === 'function') {
      dateVal = dateVal.toDate();
    } else if (typeof dateVal.seconds === 'number') {
      dateVal = new Date(dateVal.seconds * 1000);
    }
  }

  // Handle number (milliseconds timestamp)
  if (typeof dateVal === 'number') {
    dateVal = new Date(dateVal);
  }

  // If it's already in YYYY-MM-DD format, return it
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal;
  }

  try {
    let date;
    
    if (dateVal instanceof Date) {
      date = dateVal;
    } else if (typeof dateVal === 'string') {
      // Handle DD/MM/YYYY format specifically since it's common and JS Date parser might fail or flip it
      if (dateVal.includes('/')) {
        const parts = dateVal.split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY if first part > 12 or if it's the intended format
          // Given the error "31/7/2013", it's clearly DD/MM/YYYY
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        }
      }
      
      if (!date || isNaN(date.getTime())) {
        date = new Date(dateVal);
      }
    }

    if (!date || isNaN(date.getTime())) return '';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    console.error('Date formatting error:', e);
    return '';
  }
};

/**
 * Formats timestamps into clean relative times (e.g. 2 hours ago, Yesterday)
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return 'Recently';
  let date;
  if (typeof dateInput === 'object' && dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return 'Recently';
  }

  if (isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateForInput(date);
};
