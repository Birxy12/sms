import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import bdsLogo from '../assets/bdslogo.jpg';

const LandingHeader = () => {
  const { schoolName, schoolLogo } = useTheme();

  return (
    <nav className="landing-nav">
      <div className="landing-logo cursor-pointer">
        <img src={schoolLogo || bdsLogo} alt="Logo" style={{ height: '60px', objectFit: 'contain' }} />
        <h2>{schoolName || 'School'}<span>.</span></h2>
      </div>
      <div className="nav-links">
        <Link to="/about">About Us</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/login" className="portal-btn">
          Student Login <LogIn size={18} />
        </Link>
      </div>
    </nav>
  );
};

export default LandingHeader;
