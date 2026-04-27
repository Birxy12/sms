import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ThemeContext = createContext({
  schoolName: 'BONUS DOMINUS SECONDARY SCHOOL',
  primaryColor: '#ff6b00',
  secondaryColor: '#111111',
  schoolLogo: null,
  navbarBg: '#000000',
  footerBg: '#000000',
  navbarTextColor: '#ffffff',
  footerTextColor: '#ffffff',
  principalSignature: null,
  principalStamp: null,
  bursarSignature: null,
  bursarStamp: null
});

export const ThemeProvider = ({ children }) => {
  // Initialize with defaults
  const [schoolName, setSchoolName] = useState('BONUS DOMINUS SECONDARY SCHOOL');
  const [primaryColor, setPrimaryColor] = useState('#ff6b00');
  const [secondaryColor, setSecondaryColor] = useState('#111111');
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [navbarBg, setNavbarBg] = useState('#000000');
  const [footerBg, setFooterBg] = useState('#000000');
  const [navbarTextColor, setNavbarTextColor] = useState('#ffffff');
  const [footerTextColor, setFooterTextColor] = useState('#ffffff');
  const [principalSignature, setPrincipalSignature] = useState(null);
  const [principalStamp, setPrincipalStamp] = useState(null);
  const [bursarSignature, setBursarSignature] = useState(null);
  const [bursarStamp, setBursarStamp] = useState(null);
  const [whiteColor] = useState('#ffffff');
  const [loading, setLoading] = useState(true);

  // Track whether a user has explicitly changed a setting (prevents write-on-mount)
  const hasUserEdited = React.useRef(false);

  // 1. Initial Load from Firestore — read only, no write
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'branding'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.schoolName) setSchoolName(data.schoolName);
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
          if (data.schoolLogo) setSchoolLogo(data.schoolLogo);
          if (data.navbarBg) setNavbarBg(data.navbarBg);
          if (data.footerBg) setFooterBg(data.footerBg);
          if (data.navbarTextColor) setNavbarTextColor(data.navbarTextColor);
          if (data.footerTextColor) setFooterTextColor(data.footerTextColor);
          if (data.principalSignature) setPrincipalSignature(data.principalSignature);
          if (data.principalStamp) setPrincipalStamp(data.principalStamp);
          if (data.bursarSignature) setBursarSignature(data.bursarSignature);
          if (data.bursarStamp) setBursarStamp(data.bursarStamp);
        }
      } catch (e) {
        // Offline or network error — silently continue with local defaults
        console.warn("Could not load branding from Firestore. Using local defaults.", e.code || e.message);
      } finally {
        setLoading(false);
      }
    };
    loadBranding();
  }, []);

  // 2. Apply CSS Variables whenever colors change (no Firestore call here)
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor);
    document.documentElement.style.setProperty('--primary-hover', adjustColor(primaryColor, -20));
    document.documentElement.style.setProperty('--primary-light', `${primaryColor}1a`);
    document.documentElement.style.setProperty('--sidebar-bg', secondaryColor);
    document.documentElement.style.setProperty('--text-main', secondaryColor);
    document.documentElement.style.setProperty('--navbar-bg', navbarBg);
    document.documentElement.style.setProperty('--footer-bg', footerBg);
  }, [primaryColor, secondaryColor, navbarBg, footerBg]);

  // 3. Persist to Firestore — ONLY when the user actively edits a setting
  //    The hasUserEdited ref is set to true by the wrapped setters below.
  useEffect(() => {
    if (loading || !hasUserEdited.current) return;

    const persistBranding = async () => {
      try {
        await setDoc(doc(db, 'settings', 'branding'), {
          schoolName, primaryColor, secondaryColor, schoolLogo,
          navbarBg, footerBg, navbarTextColor, footerTextColor,
          principalSignature, principalStamp, bursarSignature, bursarStamp,
          lastUpdated: new Date().toISOString()
        });
      } catch (e) {
        // Offline — settings will persist on next successful connection attempt
        console.warn("Could not persist branding (offline?). Will retry automatically.", e.code || e.message);
      }
    };

    persistBranding();
  }, [schoolName, primaryColor, secondaryColor, schoolLogo, navbarBg, footerBg, navbarTextColor, footerTextColor, principalSignature, principalStamp, bursarSignature, bursarStamp, loading]);

  // Wrapped setters that mark the state as user-edited before updating
  const handleSet = (setter) => (value) => {
    hasUserEdited.current = true;
    setter(value);
  };

  // Helper to darken colors for hover states
  function adjustColor(hex, amt) {
    if (!hex || hex === 'transparent') return '#000000';
    let usePound = false;
    if (hex[0] === "#") {
      hex = hex.slice(1);
      usePound = true;
    }
    let num = parseInt(hex, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  return (
    <ThemeContext.Provider value={{ 
      schoolName, setSchoolName: handleSet(setSchoolName), 
      primaryColor, setPrimaryColor: handleSet(setPrimaryColor), 
      secondaryColor, setSecondaryColor: handleSet(setSecondaryColor),
      schoolLogo, setSchoolLogo: handleSet(setSchoolLogo),
      navbarBg, setNavbarBg: handleSet(setNavbarBg),
      footerBg, setFooterBg: handleSet(setFooterBg),
      navbarTextColor, setNavbarTextColor: handleSet(setNavbarTextColor),
      footerTextColor, setFooterTextColor: handleSet(setFooterTextColor),
      principalSignature, setPrincipalSignature: handleSet(setPrincipalSignature),
      principalStamp, setPrincipalStamp: handleSet(setPrincipalStamp),
      bursarSignature, setBursarSignature: handleSet(setBursarSignature),
      bursarStamp, setBursarStamp: handleSet(setBursarStamp),
      whiteColor
    }}>
      {!loading && children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      schoolName: 'BONUS DOMINUS SECONDARY SCHOOL',
      primaryColor: '#ff6b00',
      secondaryColor: '#111111',
      schoolLogo: null,
      navbarBg: '#000000',
      footerBg: '#000000',
      navbarTextColor: '#ffffff',
      footerTextColor: '#ffffff',
      principalSignature: null,
      principalStamp: null,
      bursarSignature: null,
      bursarStamp: null
    };
  }
  return context;
};
