import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const DEFAULT_CLUBS = [
  'Jets Club',
  'Press Club',
  'Drama Club',
  'Music & Choir Club',
  'Debating & Literary Society',
  'ICT & Robotics Club',
  'Red Cross Society',
  'Girls Guide',
  'Boys Scout',
  'Sports Club',
  'Creative Arts & Craft Club',
  'Young Farmers Club'
];

export const DEFAULT_HOUSES = [
  'Blue House',
  'Red House',
  'Green House',
  'Yellow House',
  'Purple House',
  'Gold House',
  'Diamond House',
  'Silver House'
];

const SETTINGS_DOC_ID = 'school_clubs_and_houses';

/**
 * Fetch clubs and houses asynchronously from Firestore
 */
export async function fetchSchoolClubsAndHouses() {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        clubs: Array.isArray(data.clubs) && data.clubs.length > 0 ? data.clubs : DEFAULT_CLUBS,
        houses: Array.isArray(data.houses) && data.houses.length > 0 ? data.houses : DEFAULT_HOUSES
      };
    }
  } catch (err) {
    console.warn('Could not fetch clubs and houses from Firestore:', err);
  }
  return { clubs: DEFAULT_CLUBS, houses: DEFAULT_HOUSES };
}

/**
 * Save clubs to Firestore
 */
export async function saveSchoolClubs(clubs) {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(docRef, { clubs, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save clubs:', err);
    throw err;
  }
}

/**
 * Save houses to Firestore
 */
export async function saveSchoolHouses(houses) {
  try {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(docRef, { houses, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save houses:', err);
    throw err;
  }
}

/**
 * React hook to listen to real-time updates of clubs and houses
 */
export function useGlobalClubsAndHouses() {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [houses, setHouses] = useState(DEFAULT_HOUSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.clubs) && data.clubs.length > 0) {
            setClubs(data.clubs);
          }
          if (Array.isArray(data.houses) && data.houses.length > 0) {
            setHouses(data.houses);
          }
        }
        setLoading(false);
      }, (err) => {
        console.warn('Realtime clubs/houses listener warning:', err.message);
        setLoading(false);
      });
    } catch (e) {
      console.warn('Clubs and houses snapshot setup failed:', e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  return { clubs, houses, loading };
}
