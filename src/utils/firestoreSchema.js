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
    [MARKS_KEYS.regNo]: data.regNo || data.reg_no,
    [MARKS_KEYS.studentName]: data.studentName || data.student_name,
    [MARKS_KEYS.className]: data.className || data.class_name,
    [MARKS_KEYS.session]: data.session,
    [MARKS_KEYS.term]: data.term,
    [MARKS_KEYS.updatedAt]: data.updatedAt || data.updated_at || new Date().toISOString(),
    [MARKS_KEYS.marks]: {}
  };

  if (data.marks) {
    Object.entries(data.marks).forEach(([subject, m]) => {
      if (subject === '_meta') {
        compressed[MARKS_KEYS.marks]._meta = {
          [MARKS_KEYS.average]: m.average,
          [MARKS_KEYS.overallTotal]: m.overallTotal
        };
      } else {
        compressed[MARKS_KEYS.marks][subject] = {
          [MARKS_KEYS.cat1]: m.cat1,
          [MARKS_KEYS.cat2]: m.cat2,
          [MARKS_KEYS.exam]: m.exam,
          [MARKS_KEYS.total]: m.total,
          [MARKS_KEYS.percent]: m.percent,
          [MARKS_KEYS.grade]: m.grade,
          [MARKS_KEYS.remarks]: m.remarks,
          [MARKS_KEYS.position]: m.position,
          [MARKS_KEYS.min]: m.min,
          [MARKS_KEYS.max]: m.max
        };
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
          overallTotal: m[MARKS_KEYS.overallTotal]
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

export const compressStudent = (data) => ({
  [STUDENT_KEYS.regNo]: data.regNo,
  [STUDENT_KEYS.name]: data.name,
  [STUDENT_KEYS.gender]: data.gender,
  [STUDENT_KEYS.className]: data.className,
  [STUDENT_KEYS.dob]: data.dob,
  [STUDENT_KEYS.club]: data.club,
  [STUDENT_KEYS.house]: data.house,
  [STUDENT_KEYS.updatedAt]: data.updatedAt || new Date().toISOString(),
  [STUDENT_KEYS.photo]: data.photo
});

export const expandStudent = (compressed) => ({
  regNo: compressed[STUDENT_KEYS.regNo],
  name: compressed[STUDENT_KEYS.name],
  gender: compressed[STUDENT_KEYS.gender],
  className: compressed[STUDENT_KEYS.className],
  dob: compressed[STUDENT_KEYS.dob],
  club: compressed[STUDENT_KEYS.club],
  house: compressed[STUDENT_KEYS.house],
  updatedAt: compressed[STUDENT_KEYS.updatedAt],
  photo: compressed[STUDENT_KEYS.photo]
});
