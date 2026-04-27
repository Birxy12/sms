import React from 'react';

const LandingPage = () => {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui',
      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      color: 'white'
    }}>
      <h1>Landing Page - Debug Mode</h1>
      <p>If you see this, the 500 error is gone.</p>
      <button 
        onClick={() => window.location.reload()}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          background: 'white',
          color: '#4f46e5',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Reload Page
      </button>
    </div>
  );
};

export default LandingPage;
