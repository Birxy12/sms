import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getProspectusFeeData, getExpectedFeeForStudent, formatNaira } from './prospectusFees';
import { generateUniqueClassRegNo } from './regNoGenerator';

export const ensureStudentEnrolled = async (applicantInfo, status, existingRegNo) => {
  if (status === 'rejected') return existingRegNo || null;
  try {
    let feeSettings = {};
    try {
      const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
      if (feeSnap.exists()) feeSettings = feeSnap.data() || {};
    } catch (e) {}

    // Calculate accurate section prospectus fee for candidate's class
    const className = applicantInfo.classApplyingFor || applicantInfo.targetClass || applicantInfo.class || '';
    const prospectusData = getProspectusFeeData(className);
    const expectedFee = getExpectedFeeForStudent(className, true, feeSettings);

    // Check if student with this application number already exists in students collection
    const appNo = applicantInfo.appNo || applicantInfo.applicationNumber;
    if (appNo) {
      const qStud = query(collection(db, 'students'), where('appNo', '==', appNo));
      const studSnap = await getDocs(qStud);

      if (!studSnap.empty) {
        return studSnap.docs[0].data().regNo || existingRegNo;
      }
    }

    // Generate unique class-dependent registration number
    const regNo = existingRegNo || await generateUniqueClassRegNo(className);

    const fullName = applicantInfo.fullName || applicantInfo.studentName || applicantInfo.applicantName || 'Unknown';
    const phone = applicantInfo.phone || applicantInfo.guardianPhone || '';

    await addDoc(collection(db, 'students'), {
      name: fullName,
      regNo,
      className: className,
      studentType: 'new_intake',
      isNewIntake: true,
      dateOfBirth: applicantInfo.dateOfBirth || '',
      gender: applicantInfo.gender || '',
      stateOfOrigin: applicantInfo.stateOfOrigin || '',
      localGovernment: applicantInfo.localGovernment || '',
      phone: phone,
      guardianPhone: phone,
      guardianName: applicantInfo.guardianName || fullName,
      admissionStatus: status,
      appNo: appNo || '',
      paidFee: 0,
      paidAmount: 0,
      expectedFee: expectedFee,
      classSection: prospectusData.sectionTitle,
      admissionConfirmed: true,
      paymentConfirmed: false,
      requiresAdminConfirmation: false,
      classActivated: true,
      status: 'active',
      pendingAdmissionMessage: `Pending bursar payment confirmation for ${prospectusData.sectionTitle} (${formatNaira(expectedFee)}).`,
      createdAt: serverTimestamp(),
      createdBy: 'admission_portal_auto',
    });

    return regNo;
  } catch (err) {
    console.error('Error auto-enrolling student:', err);
    return existingRegNo;
  }
};
