/**
 * Formats a date string to YYYY-MM-DD format for HTML date inputs.
 * Handles common formats like DD/MM/YYYY, MM/DD/YYYY, etc.
 * @param {string|Date} dateVal 
 * @returns {string} Formatted date string or empty string
 */
export const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  
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
