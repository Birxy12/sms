/**
 * Firestore Schema Mapping
 * Used to compress database storage by shortening field names.
 */

export const MARKS_KEYS = {
  // Root level
  regNo: 'r',
  studentName: 'n',
  className: 'c',
  session: 's',
  term: 't',
  marks: 'm',
  updatedAt: 'u',
  average: 'avg',
  overallTotal: 'ot',
  
  // Inside marks[subject]
  cat1: 'c1',
  cat2: 'c2',
  exam: 'ex',
  total: 'to',
  percent: 'pc',
  grade: 'gr',
  remarks: 'rm',
  position: 'ps',
  min: 'mi',
  max: 'ma'
};

export const STUDENT_KEYS = {
  regNo: 'r',
  name: 'n',
  gender: 'g',
  className: 'c',
  dob: 'd',
  club: 'cl',
  house: 'h',
  updatedAt: 'u',
  photo: 'p'
};

/**
 * Maps a plain object to its compressed Firestore version
 */
export const compressMarks = (data) => {
  const compressed = {
    [MARKS_KEYS.regNo]: data.regNo || data.reg_no || "",
    [MARKS_KEYS.studentName]: data.studentName || data.student_name || "",
    [MARKS_KEYS.className]: data.className || data.class_name || "",
    [MARKS_KEYS.session]: data.session || "",
    [MARKS_KEYS.term]: data.term || "",
    [MARKS_KEYS.updatedAt]: data.updatedAt || data.updated_at || new Date().toISOString(),
    [MARKS_KEYS.marks]: {}
  };

  if (data.marks) {
    Object.entries(data.marks).forEach(([subject, m]) => {
      if (subject === '_meta') {
        const metaObj = {};
        if (m.average !== undefined) metaObj[MARKS_KEYS.average] = m.average;
        if (m.overallTotal !== undefined) metaObj[MARKS_KEYS.overallTotal] = m.overallTotal;
        if (m.position !== undefined) metaObj[MARKS_KEYS.position] = m.position;
        compressed[MARKS_KEYS.marks]._meta = metaObj;
      } else if (m) {
        const subObj = {};
        if (m.cat1 !== undefined) subObj[MARKS_KEYS.cat1] = m.cat1;
        if (m.cat2 !== undefined) subObj[MARKS_KEYS.cat2] = m.cat2;
        if (m.exam !== undefined) subObj[MARKS_KEYS.exam] = m.exam;
        if (m.total !== undefined) subObj[MARKS_KEYS.total] = m.total;
        if (m.percent !== undefined) subObj[MARKS_KEYS.percent] = m.percent;
        if (m.grade !== undefined) subObj[MARKS_KEYS.grade] = m.grade;
        if (m.remarks !== undefined) subObj[MARKS_KEYS.remarks] = m.remarks;
        if (m.position !== undefined) subObj[MARKS_KEYS.position] = m.position;
        if (m.min !== undefined) subObj[MARKS_KEYS.min] = m.min;
        if (m.max !== undefined) subObj[MARKS_KEYS.max] = m.max;
        compressed[MARKS_KEYS.marks][subject] = subObj;
      }
    });
  }

  return compressed;
};

/**
 * Maps a compressed Firestore mark doc to its expanded version
 */
export const expandMarks = (compressed) => {
  if (!compressed) return null;
  
  // Detect if it's already expanded (legacy)
  if (compressed.regNo || compressed.reg_no) {
    // Start with the nested marks object
    const marksObj = { ...(compressed.marks || {}) };

    // Also collect any flat top-level 'marks.SUBJECT' keys (mixed legacy format)
    Object.keys(compressed).forEach(key => {
      if (key.startsWith('marks.')) {
        const subjectName = key.slice('marks.'.length);
        // Only add if not already present from the nested object
        if (!marksObj[subjectName]) {
          marksObj[subjectName] = compressed[key];
        }
      }
    });

    // Also merge from nested 'm' compressed field if present alongside legacy keys
    if (compressed.m && typeof compressed.m === 'object') {
      Object.entries(compressed.m).forEach(([subj, m]) => {
        if (!marksObj[subj]) {
          marksObj[subj] = {
            cat1: m.c1,
            cat2: m.c2,
            exam: m.ex,
            total: m.to,
            percent: m.pc,
            grade: m.gr
          };
        }
      });
    }

    return {
      regNo: compressed.regNo || compressed.reg_no,
      studentName: compressed.studentName || compressed.student_name,
      className: compressed.className || compressed.class_name,
      session: compressed.session,
      term: compressed.term,
      updatedAt: compressed.updatedAt || compressed.updated_at,
      marks: marksObj
    };
  }

  const data = {
    regNo: compressed[MARKS_KEYS.regNo],
    studentName: compressed[MARKS_KEYS.studentName],
    className: compressed[MARKS_KEYS.className],
    session: compressed[MARKS_KEYS.session],
    term: compressed[MARKS_KEYS.term],
    updatedAt: compressed[MARKS_KEYS.updatedAt],
    marks: {}
  };

  if (compressed[MARKS_KEYS.marks]) {
    Object.entries(compressed[MARKS_KEYS.marks]).forEach(([subject, m]) => {
      if (subject === '_meta') {
        data.marks._meta = {
          average: m[MARKS_KEYS.average],
          overallTotal: m[MARKS_KEYS.overallTotal],
          position: m[MARKS_KEYS.position]
        };
      } else {
        data.marks[subject] = {
          cat1: m[MARKS_KEYS.cat1],
          cat2: m[MARKS_KEYS.cat2],
          exam: m[MARKS_KEYS.exam],
          total: m[MARKS_KEYS.total],
          percent: m[MARKS_KEYS.percent],
          grade: m[MARKS_KEYS.grade],
          remarks: m[MARKS_KEYS.remarks],
          position: m[MARKS_KEYS.position],
          min: m[MARKS_KEYS.min],
          max: m[MARKS_KEYS.max]
        };
      }
    });
  }

  return data;
};

export const compressStudent = (data = {}) => {
  const regNo = data.regNo || data.REGNO || data.r || "";
  const name = data.name || data['STUDENT NAME'] || data.n || "";
  const gender = normalizeGender(data.gender || data.GENDER || data.g);
  const className = data.className || data.CLASS || data.class_name || data.class || data.c || "";
  const dob = data.dob || data.DOB || data.d || "";
  const club = data.club || data.cl || "";
  const house = data.house || data.h || "";
  const updatedAt = data.updatedAt || data.u || new Date().toISOString();
  const photo = data.photo || data.p || "";

  const result = {
    // Compressed keys
    [STUDENT_KEYS.regNo]: regNo,
    [STUDENT_KEYS.name]: name,
    [STUDENT_KEYS.gender]: gender,
    [STUDENT_KEYS.className]: className,
    [STUDENT_KEYS.dob]: dob,
    [STUDENT_KEYS.club]: club,
    [STUDENT_KEYS.house]: house,
    [STUDENT_KEYS.updatedAt]: updatedAt,
    [STUDENT_KEYS.photo]: photo,

    // Uncompressed standard keys for multi-index Firestore queries
    regNo,
    name,
    gender,
    className,
    dob,
    club,
    house,
    updatedAt,
    photo
  };

  if (data.phone !== undefined && data.phone !== null) result.phone = String(data.phone);
  if (data.email !== undefined && data.email !== null) result.email = String(data.email);
  if (data.pin !== undefined && data.pin !== null) result.pin = data.pin;
  if (data.studentType !== undefined && data.studentType !== null) result.studentType = String(data.studentType);
  if (data.isNewIntake !== undefined && data.isNewIntake !== null) result.isNewIntake = Boolean(data.isNewIntake);
  if (data.expectedFee !== undefined && data.expectedFee !== null) result.expectedFee = Number(data.expectedFee);
  if (data.paidFee !== undefined && data.paidFee !== null) result.paidFee = Number(data.paidFee);
  if (data.paidAmount !== undefined && data.paidAmount !== null) result.paidAmount = Number(data.paidAmount);
  if (data.securityQuestion !== undefined && data.securityQuestion !== null) result.securityQuestion = String(data.securityQuestion);
  if (data.securityAnswer !== undefined && data.securityAnswer !== null) result.securityAnswer = String(data.securityAnswer);
  if (data.enrolledVia !== undefined && data.enrolledVia !== null) result.enrolledVia = String(data.enrolledVia);
  if (data.registeredAt !== undefined && data.registeredAt !== null) result.registeredAt = String(data.registeredAt);

  // Strip any accidental undefined
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });

  return result;
};

export const normalizeGender = (g) => {
  if (!g) return 'Male';
  const str = String(g).trim().toUpperCase();
  if (str === 'F' || str === 'FEMALE' || str.startsWith('F')) return 'Female';
  if (str === 'M' || str === 'MALE' || str.startsWith('M')) return 'Male';
  return 'Male';
};

export const expandStudent = (compressed) => {
  if (!compressed) return null;
  
  // Detect if already expanded
  if (compressed.regNo || compressed.REGNO || compressed.name || compressed['STUDENT NAME']) {
    return {
      regNo: compressed.regNo || compressed.REGNO || compressed['REG NO'] || compressed.r || '',
      name: compressed.name || compressed['STUDENT NAME'] || compressed.n || '',
      gender: normalizeGender(compressed.gender || compressed.GENDER || compressed.g),
      className: compressed.className || compressed.CLASS || compressed.class_name || compressed.class || compressed.c || compressed.grade || compressed.Class || compressed['Class'] || compressed['CLASS NAME'] || '',
      dob: compressed.dob || compressed.DOB || compressed.d || '',
      club: compressed.club || compressed.cl || '',
      house: compressed.house || compressed.h || '',
      updatedAt: compressed.updatedAt || compressed.u || '',
      photo: compressed.photo || compressed.p || '',
      pin: compressed.pin,
      studentType: compressed.studentType || (compressed.isNewIntake ? 'new_intake' : 'returning'),
      isNewIntake: compressed.isNewIntake === true || compressed.studentType === 'new_intake',
      expectedFee: compressed.expectedFee !== undefined ? Number(compressed.expectedFee) : undefined,
      paidFee: compressed.paidFee !== undefined ? Number(compressed.paidFee) : (compressed.paidAmount !== undefined ? Number(compressed.paidAmount) : undefined),
      securityQuestion: compressed.securityQuestion,
      securityAnswer: compressed.securityAnswer
    };
  }

  return {
    regNo: compressed[STUDENT_KEYS.regNo] || compressed.regNo || compressed.REGNO || '',
    name: compressed[STUDENT_KEYS.name] || compressed.name || compressed['STUDENT NAME'] || '',
    gender: normalizeGender(compressed[STUDENT_KEYS.gender] || compressed.gender || compressed.GENDER),
    className: compressed[STUDENT_KEYS.className] || compressed.className || compressed.CLASS || compressed.class_name || compressed.c || compressed.class || compressed.grade || '',
    dob: compressed[STUDENT_KEYS.dob] || compressed.dob || '',
    club: compressed[STUDENT_KEYS.club] || compressed.club || '',
    house: compressed[STUDENT_KEYS.house] || compressed.house || '',
    updatedAt: compressed[STUDENT_KEYS.updatedAt] || compressed.updatedAt || '',
    photo: compressed[STUDENT_KEYS.photo] || compressed.photo || '',
    pin: compressed.pin,
    studentType: compressed.studentType || (compressed.isNewIntake ? 'new_intake' : 'returning'),
    isNewIntake: compressed.isNewIntake === true || compressed.studentType === 'new_intake',
    expectedFee: compressed.expectedFee !== undefined ? Number(compressed.expectedFee) : undefined,
    paidFee: compressed.paidFee !== undefined ? Number(compressed.paidFee) : (compressed.paidAmount !== undefined ? Number(compressed.paidAmount) : undefined),
    securityQuestion: compressed.securityQuestion,
    securityAnswer: compressed.securityAnswer
  };
};
