export const DEFAULT_AVERAGE_DIVISORS = {
  JSS1: 16,
  JSS2: 16,
  JSS3: 16,
  SS1: 16,
  'SS2 SCIENCE': 9,
  'SS2 ART': 9,
  'SS3 SCIENCE': 9,
  'SS3 ART': 9,
};

const normalizeClassKey = (className = '') => {
  if (!className) return '';
  return className
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[-_/]/g, ' ') // normalize separators
    .replace(/\s+/g, ' ');
};

export const getAverageDivisor = (className = '', configuredDivisors = {}) => {
  const normalizedClass = normalizeClassKey(className);
  const directMatch = configuredDivisors?.[normalizedClass];
  if (directMatch !== undefined && directMatch !== null && directMatch !== '') {
    const parsed = Number(directMatch);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  const fallbackKey = Object.keys(configuredDivisors || {}).find((key) => normalizeClassKey(key) === normalizedClass);
  if (fallbackKey !== undefined) {
    const parsed = Number(configuredDivisors[fallbackKey]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  if (normalizedClass.includes('JSS') || normalizedClass.includes('SS 1') || normalizedClass === 'SS1') return 16;
  if ((normalizedClass.includes('SS2') || normalizedClass.includes('SS3') || normalizedClass.includes('SS 2') || normalizedClass.includes('SS 3')) &&
      (normalizedClass.includes('ART') || normalizedClass.includes('SCIENCE'))) return 9;
  if (normalizedClass.includes('SS2') || normalizedClass.includes('SS3') || normalizedClass.includes('SS 2') || normalizedClass.includes('SS 3')) return 9;
  return DEFAULT_AVERAGE_DIVISORS[normalizedClass] || 16;
};
