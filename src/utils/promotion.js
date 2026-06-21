// src/utils/promotion.js
// Placeholder promotion utilities for ResultPublisher component.
// Implement actual promotion logic as needed.
export const calculatePromotion = (studentData) => {
  // Example: return unchanged data; replace with your logic.
  return studentData;
};

export const getNextClass = (currentClass) => {
  // Example progression mapping; adjust as required.
  const classOrder = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];
  const idx = classOrder.indexOf(currentClass);
  return idx >= 0 && idx < classOrder.length - 1 ? classOrder[idx + 1] : currentClass;
};

export const promoteStudents = async (students) => {
  // Stub function: iterate and apply promotion logic.
  return students.map(student => ({
    ...student,
    className: getNextClass(student.className)
  }));
};

export default { calculatePromotion, getNextClass, promoteStudents };
