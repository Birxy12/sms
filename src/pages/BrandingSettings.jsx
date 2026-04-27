import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Save, RefreshCcw, Palette, School } from 'lucide-react';

const BrandingSettings = () => {
  const { 
    schoolName, setSchoolName, 
    primaryColor, setPrimaryColor, 
    secondaryColor, setSecondaryColor,
    schoolLogo, setSchoolLogo,
    navbarBg, setNavbarBg,
    footerBg, setFooterBg,
    navbarTextColor, setNavbarTextColor,
    footerTextColor, setFooterTextColor,
    principalSignature, setPrincipalSignature,
    principalStamp, setPrincipalStamp,
    bursarSignature, setBursarSignature,
    bursarStamp, setBursarStamp
  } = useTheme();

  // Local state for form buffers
  const [name, setName] = useState(schoolName);
  const [primary, setPrimary] = useState(primaryColor);
  const [secondary, setSecondary] = useState(secondaryColor);
  const [logoPreview, setLogoPreview] = useState(schoolLogo);
  const [navBg, setNavBg] = useState(navbarBg);
  const [footBg, setFootBg] = useState(footerBg);
  const [navText, setNavText] = useState(navbarTextColor);
  const [footText, setFootText] = useState(footerTextColor);
  const [pSig, setPSig] = useState(principalSignature);
  const [pStamp, setPStamp] = useState(principalStamp);
  const [bSig, setBSig] = useState(bursarSignature);
  const [bStamp, setBStamp] = useState(bursarStamp);

  // Sync with context once loaded
  React.useEffect(() => {
    setName(schoolName);
    setPrimary(primaryColor);
    setSecondary(secondaryColor);
    setLogoPreview(schoolLogo);
    setNavBg(navbarBg);
    setFootBg(footerBg);
    setNavText(navbarTextColor);
    setFootText(footerTextColor);
    setPSig(principalSignature);
    setPStamp(principalStamp);
    setBSig(bursarSignature);
    setBStamp(bursarStamp);
  }, [schoolName, primaryColor, secondaryColor, schoolLogo, navbarBg, footerBg, navbarTextColor, footerTextColor, principalSignature, principalStamp, bursarSignature, bursarStamp]);

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSchoolName(name);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setSchoolLogo(logoPreview);
    setNavbarBg(navBg);
    setFooterBg(footBg);
    setNavbarTextColor(navText);
    setFooterTextColor(footText);
    setPrincipalSignature(pSig);
    setPrincipalStamp(pStamp);
    setBursarSignature(bSig);
    setBursarStamp(bStamp);
    alert('Branding and Credentials updated successfully!');
  };

  const handleReset = () => {
    setName('BONUS DOMINUS SECONDARY SCHOOL');
    setPrimary('#ff6b00');
    setSecondary('#111111');
    setLogoPreview(null);
    setSchoolLogo(null);
    setPSig(null);
    setPStamp(null);
    setBSig(null);
    setBStamp(null);
    setPrincipalSignature(null);
    setPrincipalStamp(null);
    setBursarSignature(null);
    setBursarStamp(null);
  };

  return (
    <div className="branding-settings">
      <div className="dashboard-title">
        <h1>Branding & Settings</h1>
        <p>Customize your secondary school identity across the platform.</p>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '32px' }}>
        {/* School Name Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <School color="var(--primary)" />
            <h3>General Identity</h3>
          </div>
          <div className="input-group">
            <label>School Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter school name"
              className="settings-input"
            />
          </div>
          <div className="input-group" style={{ marginTop: '20px' }}>
            <label>School Logo (Max 2MB)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="School Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <School size={20} color="#94a3b8" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={(e) => handleImageUpload(e, setLogoPreview)}
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        {/* Credentials Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <RefreshCcw color="var(--primary)" />
            <h3>Official Credentials</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Principal Section */}
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ fontWeight: '900', fontSize: '12px', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' }}>Principal</p>
              <div style={{ spaceY: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Signature</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {pSig && <img src={pSig} alt="Sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPSig)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Stamp</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {pStamp && <img src={pStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPStamp)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bursar Section */}
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ fontWeight: '900', fontSize: '12px', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' }}>Bursar</p>
              <div style={{ spaceY: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Signature</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {bSig && <img src={bSig} alt="Sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBSig)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Stamp</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {bStamp && <img src={bStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBStamp)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Palette color="var(--primary)" />
            <h3>Theme Colors</h3>
          </div>
          
          <div className="color-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Primary Accent</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Used for buttons, icons, and highlights.</p>
              </div>
              <input 
                type="color" 
                value={primary} 
                onChange={(e) => setPrimary(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Sidebar & Secondary</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Used for dashboard navigation background.</p>
              </div>
              <input 
                type="color" 
                value={secondary} 
                onChange={(e) => setSecondary(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div style={{ borderTop: '1px solid #eee', margin: '10px 0' }}></div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Navbar Background</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Background color of the public navigation bar.</p>
              </div>
              <input 
                type="color" 
                value={navBg} 
                onChange={(e) => setNavBg(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Navbar Text Color</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Color of links and text in the navbar.</p>
              </div>
              <input 
                type="color" 
                value={navText} 
                onChange={(e) => setNavText(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Footer Background</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Background color of the bottom footer section.</p>
              </div>
              <input 
                type="color" 
                value={footBg} 
                onChange={(e) => setFootBg(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Footer Text Color</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Color of links and text in the footer.</p>
              </div>
              <input 
                type="color" 
                value={footText} 
                onChange={(e) => setFootText(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="settings-actions" style={{ marginTop: '40px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
        <button className="btn-outline" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCcw size={18} /> Reset to Default
        </button>
        <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px' }}>
          <Save size={18} /> Save Changes
        </button>
      </div>

      {/* Preview Section */}
      <div className="card-white" style={{ marginTop: '40px' }}>
        <h3>Real-time Preview</h3>
        <p style={{ marginBottom: '20px' }}>This is how your current palette looks in action.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ backgroundColor: primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px' }}>Button Style</button>
          <div style={{ backgroundColor: secondary, color: '#fff', padding: '10px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {logoPreview && <img src={logoPreview} alt="" style={{ height: '24px' }} />}
            Sidebar Mockup
          </div>
          <div style={{ color: primary, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>Link Hover State</div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
