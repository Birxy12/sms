import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="card-white flex items-center gap-5 group hover:border-indigo-200 transition-all cursor-default">
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" 
        style={{ backgroundColor: `${color}10`, color: color }}
      >
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;
