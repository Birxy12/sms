/**
 * BONUS DOMINUS SCHOOLS - PROSPECTUS 2025/2026
 * Official School Fees Schedule and Admission Requirements for Newly Admitted Students
 */

export const PROSPECTUS_REQUIREMENTS = [
  'Birth Certificate or Birth declaration',
  'Two (2) recent passport photographs of the child',
  'Two passport photographs of the parent or guardian',
  'Immunization/Vaccination card record (for Nursery section)',
  'Previous school report card',
  'Medical fitness report or health records',
  'Completed admission/registration form',
  'Payment receipt for the admission and school fees',
  'A file jacket',
  'A ream of A4 paper',
  'A roll of Tissue paper (Big size)',
  'Broom',
  'Medium size of Dettol/Izal'
];

export const PROSPECTUS_FEES_SCHEDULE = {
  nursery: {
    sectionKey: 'nursery',
    sectionTitle: 'NURSERY SECTION',
    classesDesc: 'Toddlers, Pre-Nursery, Nursery 1, Nursery 2, KG',
    total: 55000,
    items: [
      { name: 'Registration', amount: 2000 },
      { name: 'School Fees', amount: 23000 },
      { name: 'School Uniform', amount: 8000 },
      { name: 'School P.E', amount: 7000 },
      { name: 'School Jacket', amount: 3000 },
      { name: 'Sports Wear', amount: 6000 },
      { name: 'Inter-House Sports Levy', amount: 2000 },
      { name: 'Caution Fee', amount: 2000 },
      { name: 'Result Booklet', amount: 2000 }
    ]
  },
  primary: {
    sectionKey: 'primary',
    sectionTitle: 'PRIMARY SECTION',
    classesDesc: 'Basic 1 to Basic 6 (Primary 1 - 6)',
    total: 59000,
    items: [
      { name: 'Registration', amount: 2000 },
      { name: 'School Fees', amount: 25000 },
      { name: 'School Uniform', amount: 10000 },
      { name: 'School P.E', amount: 7000 },
      { name: 'School Jacket', amount: 3000 },
      { name: 'Sports Wear', amount: 6000 },
      { name: 'Inter-House Sports Levy', amount: 2000 },
      { name: 'Caution Fee', amount: 2000 },
      { name: 'Result Booklet', amount: 2000 }
    ]
  },
  junior_secondary: {
    sectionKey: 'junior_secondary',
    sectionTitle: 'JUNIOR SECONDARY SECTION',
    classesDesc: 'JSS1, JSS2, JSS3',
    total: 77000,
    items: [
      { name: 'Registration', amount: 2000 },
      { name: 'School Fees', amount: 32000 },
      { name: 'School Uniform', amount: 15000 },
      { name: 'School P.E', amount: 10000 },
      { name: 'Sports Wear', amount: 7000 },
      { name: 'Inter-House Sports Levy', amount: 3000 },
      { name: 'Computer Fee', amount: 2000 },
      { name: 'Science Fee', amount: 2000 },
      { name: 'Caution Fee', amount: 4000 }
    ]
  },
  senior_secondary: {
    sectionKey: 'senior_secondary',
    sectionTitle: 'SENIOR SECONDARY SECTION',
    classesDesc: 'SS1, SS2, SS3 (Science, Art & Commercial)',
    total: 78000,
    items: [
      { name: 'Registration', amount: 2000 },
      { name: 'School Fees', amount: 33000 },
      { name: 'School Uniform', amount: 15000 },
      { name: 'School P.E', amount: 10000 },
      { name: 'Sports Wear', amount: 7000 },
      { name: 'Inter-House Sports Levy', amount: 3000 },
      { name: 'Computer Fee', amount: 2000 },
      { name: 'Science Fee', amount: 2000 },
      { name: 'Caution Fee', amount: 4000 }
    ]
  }
};

/**
 * Classifies any class name string into one of the 4 standard school sections
 * @param {string} className
 * @returns {'nursery' | 'primary' | 'junior_secondary' | 'senior_secondary'}
 */
export function getClassSection(className) {
  if (!className) return 'junior_secondary';
  const c = String(className).trim().toUpperCase();

  // 1. Nursery Section (Toddlers, Creche, Pre-Nursery, Nursery, KG, etc.)
  if (
    c.includes('TODDLER') || 
    c.includes('CRECHE') || 
    c.includes('NURSERY') || 
    c.includes('NUR') || 
    c.includes('KG') || 
    c.includes('PLAY') ||
    c.includes('PRE-NURSERY')
  ) {
    return 'nursery';
  }

  // 2. Primary Section (Basic 1 to 6, Primary 1 to 6, Pry 1 to 6, Grade 1 to 6)
  if (
    c.includes('BASIC') || 
    c.includes('PRIMARY') || 
    c.includes('PRY') || 
    c.includes('GRADE') ||
    /^(B|P|BASIC|PRY|PRIMARY)\s*[1-6]$/i.test(c)
  ) {
    return 'primary';
  }

  // 3. Senior Secondary (SS1, SS2, SS3, SSS1, SSS2, SSS3)
  if (
    c.startsWith('SS') || 
    c.startsWith('SSS') || 
    c.includes('SENIOR')
  ) {
    return 'senior_secondary';
  }

  // 4. Junior Secondary (JSS1, JSS2, JSS3, JS1, JS2, JS3, JUNIOR)
  if (
    c.startsWith('JSS') || 
    c.startsWith('JS') || 
    c.includes('JUNIOR')
  ) {
    return 'junior_secondary';
  }

  // Default fallback based on common school levels
  return 'junior_secondary';
}

/**
 * Retrieves the complete prospectus fee breakdown and requirements for a given class
 * @param {string} className
 */
export function getProspectusFeeData(className) {
  const sectionKey = getClassSection(className);
  const data = PROSPECTUS_FEES_SCHEDULE[sectionKey] || PROSPECTUS_FEES_SCHEDULE.junior_secondary;
  return {
    ...data,
    requirements: PROSPECTUS_REQUIREMENTS,
    className: className || data.classesDesc
  };
}

/**
 * Formats a numeric currency value into standard Nigerian Naira (₦) representation
 * @param {number} amount
 */
export function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}
