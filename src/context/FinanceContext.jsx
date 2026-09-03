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
    recentPayments: [],
    totalExpenses: 0,
    netBalance: 0,
    allExpenses: []
  });

  useEffect(() => {
    let unsubscribeStudents = null;
    let unsubscribeFees = null;
    let unsubscribeExpenses = null;
    let currentFeeSettings = {};
    let currentStudentsDocs = [];
    let currentExpensesDocs = [];
    let isMounted = true;

    const processFinance = (studentsDocs, expensesDocs) => {
      let totalExpected = 0;
      let totalCollected = 0;
      let totalDebt = 0;
      let clearedCount = 0;
      let owingCount = 0;
      const classMap = {};
      const debtorsList = [];
      const recentPayments = [];
      
      let totalExpenses = 0;
      const allExpenses = [];

      (expensesDocs || []).forEach(docSnap => {
        const data = docSnap.data();
        const amountStr = String(data.amount || '0').replace(/,/g, '');
        const amount = parseFloat(amountStr) || 0;
        totalExpenses += amount;
        allExpenses.push({ id: docSnap.id, ...data });
      });

      // sort expenses by date (newest first)
      allExpenses.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

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
        
        const expectedStr = String(merged.expectedFee || fallbackFee || '0').replace(/,/g, '');
        const expected = parseFloat(expectedStr) || 0;
        
        const paidStr = String(merged.paidFee || merged.paidAmount || '0').replace(/,/g, '');
        const paid = parseFloat(paidStr) || 0;
        
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
      const netBalance = totalCollected - totalExpenses;

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
          recentPayments,
          totalExpenses,
          netBalance,
          allExpenses
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
          currentStudentsDocs = snapshot.docs;
          processFinance(currentStudentsDocs, currentExpensesDocs);
        }, (error) => {
          console.error("Finance Context students snapshot error:", error);
        });
      }
      
      // Setup expenses listener
      if (!unsubscribeExpenses) {
        unsubscribeExpenses = onSnapshot(collection(db, 'bursar_expenses'), (snapshot) => {
          currentExpensesDocs = snapshot.docs;
          processFinance(currentStudentsDocs, currentExpensesDocs);
        }, (error) => {
          console.error("Finance Context expenses snapshot error:", error);
        });
      }
    }, (error) => {
      console.error("Finance Context fees snapshot error:", error);
    });

    return () => {
      isMounted = false;
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeFees) unsubscribeFees();
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, []);

  return (
    <FinanceContext.Provider value={{ financeData }}>
      {children}
    </FinanceContext.Provider>
  );
};
