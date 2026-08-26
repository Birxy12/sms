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
 * Retrieves the complete default prospectus fee breakdown and requirements for a given class
 * @param {string} className
 */
export function getProspectusFeeData(className) {
  const sectionKey = getClassSection(className);
  const data = PROSPECTUS_FEES_SCHEDULE[sectionKey] || PROSPECTUS_FEES_SCHEDULE.junior_secondary;
  const schoolFeeItem = data.items.find(i => i.name.toLowerCase().includes('school fee'));
  const schoolFee = schoolFeeItem ? schoolFeeItem.amount : Math.round(data.total * 0.45);
  
  return {
    ...data,
    schoolFee,
    prospectiveTotal: data.total,
    requirements: PROSPECTUS_REQUIREMENTS,
    className: className || data.classesDesc
  };
}

/**
 * Retrieves the default structured fee configuration for a class
 * Returning students pay schoolFee only; New Intakes pay prospectiveTotal.
 * @param {string} className
 */
export function getDefaultClassFeeStructure(className) {
  const pData = getProspectusFeeData(className);
  return {
    className: className || 'JSS1',
    sectionKey: pData.sectionKey,
    sectionTitle: pData.sectionTitle,
    schoolFee: pData.schoolFee,
    prospectiveTotal: pData.prospectiveTotal,
    items: pData.items,
    requirements: pData.requirements
  };
}

/**
 * Resolves the class fee configuration by merging Firestore settings with defaults
 * @param {string} className
 * @param {object} feeSettings - Document data from settings/fees in Firestore
 */
export function getClassFees(className, feeSettings = {}) {
  const defaults = getDefaultClassFeeStructure(className);
  if (!feeSettings || typeof feeSettings !== 'object') {
    return defaults;
  }

  const custom = feeSettings[className] || feeSettings[className?.trim()] || feeSettings['default'];
  if (!custom) {
    return defaults;
  }

  if (typeof custom === 'number') {
    return {
      ...defaults,
      schoolFee: custom,
      // If user sets a custom school fee, scale or keep prospectiveTotal
      prospectiveTotal: Math.max(custom, defaults.prospectiveTotal)
    };
  }

  if (typeof custom === 'object') {
    return {
      ...defaults,
      schoolFee: custom.schoolFee !== undefined && custom.schoolFee !== null && custom.schoolFee !== '' 
        ? Number(custom.schoolFee) 
        : defaults.schoolFee,
      prospectiveTotal: custom.prospectiveTotal !== undefined && custom.prospectiveTotal !== null && custom.prospectiveTotal !== ''
        ? Number(custom.prospectiveTotal) 
        : (custom.total !== undefined ? Number(custom.total) : defaults.prospectiveTotal),
      items: Array.isArray(custom.items) && custom.items.length > 0 ? custom.items : defaults.items
    };
  }

  return defaults;
}

/**
 * Determines the expected fee for a student based on whether they are a New Intake or Existing/Returning student
 * @param {object|string} studentOrClass - Student object or className string
 * @param {boolean} [isNewIntake] - Optional override boolean
 * @param {object} [feeSettings] - Optional fee settings from Firestore
 * @returns {number} The expected fee in Naira
 */
export function getExpectedFeeForStudent(studentOrClass, isNewIntake, feeSettings = {}) {
  if (!studentOrClass) return 0;

  let className = '';
  let studentIntake = false;

  if (typeof studentOrClass === 'object') {
    className = studentOrClass.className || studentOrClass.class_name || studentOrClass.CLASS || studentOrClass.class || '';
    studentIntake = studentOrClass.isNewIntake === true || 
                    studentOrClass.studentType === 'new_intake' || 
                    String(studentOrClass.studentType || '').toLowerCase().includes('new');
    
    // If student explicitly has a positive expected fee already configured on their profile
    if (studentOrClass.expectedFee !== undefined && studentOrClass.expectedFee !== null && Number(studentOrClass.expectedFee) > 0) {
      return Number(studentOrClass.expectedFee);
    }
  } else {
    className = String(studentOrClass);
  }

  const finalIsNewIntake = isNewIntake !== undefined ? Boolean(isNewIntake) : studentIntake;
  const classFeeConfig = getClassFees(className, feeSettings);

  return finalIsNewIntake ? classFeeConfig.prospectiveTotal : classFeeConfig.schoolFee;
}

/**
 * Generates an accurate itemized fee breakdown for a newly admitted applicant
 * taking reference from official prospectus items while syncing with custom fee settings.
 * @param {string} className
 * @param {object} feeSettings
 */
export function getApplicantFeeBreakdown(className, feeSettings = {}) {
  const feeConfig = getClassFees(className, feeSettings);
  const defaultData = getProspectusFeeData(className);
  
  // If custom items are already explicitly configured
  if (Array.isArray(feeConfig.items) && feeConfig.items.length > 0 && feeConfig.items !== defaultData.items) {
    const total = feeConfig.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    return {
      className: className || defaultData.className,
      sectionKey: feeConfig.sectionKey,
      sectionTitle: feeConfig.sectionTitle,
      classesDesc: defaultData.classesDesc,
      schoolFee: feeConfig.schoolFee,
      total: feeConfig.prospectiveTotal || total,
      items: feeConfig.items,
      requirements: PROSPECTUS_REQUIREMENTS
    };
  }

  const targetTotal = Number(feeConfig.prospectiveTotal || defaultData.total);
  const targetSchoolFee = Number(feeConfig.schoolFee || defaultData.schoolFee);

  // Take default non-school-fee prospectus items
  const nonSchoolFeeItems = defaultData.items.filter(i => !i.name.toLowerCase().includes('school fee'));
  const nonSchoolFeeSum = nonSchoolFeeItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  
  let finalItems = [];
  finalItems.push({ name: 'School Fees (Tuition)', amount: targetSchoolFee });

  const remaining = targetTotal - targetSchoolFee;
  if (remaining <= 0) {
    finalItems = [{ name: 'Total School Fees & Admission Package', amount: targetTotal }];
  } else if (nonSchoolFeeSum > 0 && Math.abs(remaining - nonSchoolFeeSum) > 0) {
    // Proportionately adjust other items so the sum equals targetTotal exactly
    let runningSum = 0;
    const scaledItems = nonSchoolFeeItems.map((item, idx) => {
      if (idx === nonSchoolFeeItems.length - 1) {
        const lastAmt = remaining - runningSum;
        return { name: item.name, amount: Math.max(0, lastAmt) };
      }
      const ratio = item.amount / nonSchoolFeeSum;
      const amt = Math.round(remaining * ratio);
      runningSum += amt;
      return { name: item.name, amount: amt };
    });
    finalItems.push(...scaledItems);
  } else {
    finalItems.push(...nonSchoolFeeItems);
  }

  return {
    className: className || defaultData.className,
    sectionKey: feeConfig.sectionKey,
    sectionTitle: feeConfig.sectionTitle,
    classesDesc: defaultData.classesDesc,
    schoolFee: targetSchoolFee,
    total: targetTotal,
    items: finalItems,
    requirements: PROSPECTUS_REQUIREMENTS
  };
}

/**
 * Formats a numeric currency value into standard Nigerian Naira (₦) representation
 * @param {number} amount
 */
export function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
}

