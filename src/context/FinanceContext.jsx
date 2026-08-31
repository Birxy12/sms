import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { expandStudent } from '../utils/firestoreSchema';
import { normalizeClassName } from '../utils/classUtils';
import { getExpectedFeeForStudent } from '../utils/prospectusFees';

const FinanceContext = createContext();

export const useFinance = () => {
  return useContext(FinanceContext);
};

export const FinanceProvider = ({ children }) => {
  const [financeData, setFinanceData] = useState({
    loading: true,
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalStudents: 0,
    clearedCount: 0,
    owingCount: 0,
    collectionRate: 0,
    classBreakdown: [],
    debtorsList: [],
    recentPayments: []
  });

  useEffect(() => {
    let unsubscribeStudents = null;
    let unsubscribeFees = null;
    let currentFeeSettings = {};
    let isMounted = true;

    const processFinance = (studentsDocs) => {
      let totalExpected = 0;
      let totalCollected = 0;
      let totalDebt = 0;
      let clearedCount = 0;
      let owingCount = 0;
      const classMap = {};
      const debtorsList = [];
      const recentPayments = [];

      studentsDocs.forEach(docSnap => {
        const rawData = docSnap.data();
        const data = expandStudent(rawData) || {};
        const merged = { id: docSnap.id, ...rawData, ...data };

        const cls = normalizeClassName(merged.className || 'Unassigned');
        if (!classMap[cls]) {
          classMap[cls] = {
            className: cls,
            expected: 0,
            collected: 0,
            debt: 0,
            studentCount: 0,
            clearedCount: 0,
            owingCount: 0
          };
        }
        classMap[cls].studentCount++;

        const fallbackFee = getExpectedFeeForStudent(merged, undefined, currentFeeSettings);
        const expected = parseFloat(merged.expectedFee) || parseFloat(fallbackFee) || 0;
        const paid = parseFloat(merged.paidFee) || parseFloat(merged.paidAmount) || 0;
        const balance = Math.max(0, expected - paid);

        classMap[cls].expected += expected;
        classMap[cls].collected += paid;
        classMap[cls].debt += balance;

        totalExpected += expected;
        totalCollected += paid;
        totalDebt += balance;

        const studentFinance = {
          ...merged,
          className: cls,
          expected,
          paid,
          balance,
          isOwing: balance > 0,
          isCleared: expected > 0 && balance === 0
        };

        if (balance > 0) {
          owingCount++;
          classMap[cls].owingCount++;
          debtorsList.push(studentFinance);
        } else if (expected > 0 && balance === 0) {
          clearedCount++;
          classMap[cls].clearedCount++;
        }

        if (paid > 0 || merged.lastPaymentDate) {
          recentPayments.push(studentFinance);
        }
      });

      const classBreakdown = Object.values(classMap).map(c => ({
        ...c,
        collectionRate: c.expected > 0 ? Math.round((c.collected / c.expected) * 100) : 0
      }));
      classBreakdown.sort((a, b) => a.className.localeCompare(b.className));
      debtorsList.sort((a, b) => b.balance - a.balance);
      recentPayments.sort((a, b) => (b.lastPaymentDate || '').localeCompare(a.lastPaymentDate || ''));

      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      if (isMounted) {
        setFinanceData({
          loading: false,
          totalExpected,
          totalCollected,
          totalOutstanding: totalDebt,
          totalStudents: studentsDocs.length,
          clearedCount,
          owingCount,
          collectionRate,
          classBreakdown,
          debtorsList,
          recentPayments
        });
      }
    };

    unsubscribeFees = onSnapshot(doc(db, 'settings', 'fees'), (feeSnap) => {
      if (feeSnap.exists()) {
        currentFeeSettings = feeSnap.data() || {};
      }
      
      // Setup students listener only after getting fees (or if fees don't exist yet)
      if (!unsubscribeStudents) {
        unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
          processFinance(snapshot.docs);
        }, (error) => {
          console.error("Finance Context students snapshot error:", error);
        });
      }
    }, (error) => {
      console.error("Finance Context fees snapshot error:", error);
    });

    return () => {
      isMounted = false;
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeFees) unsubscribeFees();
    };
  }, []);

  return (
    <FinanceContext.Provider value={{ financeData }}>
      {children}
    </FinanceContext.Provider>
  );
};
