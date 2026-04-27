import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={26} />
      </div>
      <div className="stat-info">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;
