/**
 * Centralized subject configuration for the school management system.
 * This maps classes to their specific subject offerings.
 */

export const CLASS_LIST = [
  'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'
];

// JSS1 – JSS3 subjects
export const JSS_SUBJECTS = [
  'ENGLISH LANGUAGE',
  'MATHEMATICS',
  'IGBO',
  'FRENCH',
  'BASIC SC & TECH',
  'CIVIC EDUCATION',
  'PHE',
  'SECURITY EDUCATION',
  'SOCIAL STUDIES',
  'C.R.S',
  'ICT',
  'HISTORY',
  'HOME ECONOMICS',
  'BUSINESS STUDIES',
  'AGRICULTURAL SCIENCE'
];

// Common Senior Secondary subjects (both Art & Science)
export const SS_COMMON_SUBJECTS = [
  'ENGLISH LANGUAGE',
  'MATHEMATICS',
  'IGBO LANGUAGE',
  'BIOLOGY',
  'AGRIC SCIENCE',
  'ECONOMICS',
  'ANIMAL HUSBANDRY',
  'GOVERNMENT',
  'CIVIC EDUCATION',
  'COMPUTER SCIENCE',
  'MARKETING',
  'HISTORY',
  'FRENCH'
];

// SS Art stream subjects
export const SS_ART_SUBJECTS = [
  ...SS_COMMON_SUBJECTS,
  'C.R.S',
  'LITERATURE'
];

// SS Science stream subjects
export const SS_SCIENCE_SUBJECTS = [
  ...SS_COMMON_SUBJECTS,
  'CHEMISTRY',
  'PHYSICS'
];

// SS1 specific subjects
export const SS1_SUBJECTS = [
  'ENGLISH LANGUAGE',
  'MATHEMATICS',
  'IGBO LANGUAGE',
  'BIOLOGY',
  'CHEMISTRY',
  'PHYSICS',
  'C.R.S',
  'LITERATURE',
  'AGRIC SCIENCE',
  'ECONOMICS',
  'ANIMAL HUSBANDRY',
  'GOVERNMENT',
  'CIVIC EDUCATION',
  'COMPUTER SCIENCE',
  'MARKETING',
  'HISTORY',
  'FRENCH'
];

/**
 * Returns the list of subjects for a given class.
 * @param {string} className - e.g. 'JSS1', 'SS2 ART', 'SS3 SCIENCE'
 * @returns {string[]} Array of subject names
 */
export const getSubjectsForClass = (className) => {
  if (!className) return [];
  if (['JSS1', 'JSS2', 'JSS3'].includes(className)) return JSS_SUBJECTS;
  if (className === 'SS1') return SS1_SUBJECTS;
  if (className.includes('ART')) return SS_ART_SUBJECTS;
  if (className.includes('SCIENCE')) return SS_SCIENCE_SUBJECTS;
  return [];
};

/**
 * Returns all unique subjects across all classes.
 * @returns {string[]}
 */
export const getAllSubjects = () => {
  return [...new Set([...JSS_SUBJECTS, ...SS1_SUBJECTS, ...SS_ART_SUBJECTS, ...SS_SCIENCE_SUBJECTS])];
};
