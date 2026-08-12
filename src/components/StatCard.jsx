import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ end, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 1500;
    const stepTime = Math.max(10, Math.floor(duration / end));
    const timer = setInterval(() => {
      start += Math.max(1, Math.floor(end / (duration / stepTime)));
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [end]);

  return <>{prefix}{count.toLocaleString()}{suffix}</>;
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  // Try to parse numeric value for animation
  let content = value;
  if (typeof value === 'number') {
    content = <AnimatedCounter end={value} />;
  } else if (typeof value === 'string') {
    const numMatch = value.match(/^([^\d]*)(\d+(?:,\d+)?(?:\.\d+)?)([^\d]*)$/);
    if (numMatch) {
      const parsedNum = parseFloat(numMatch[2].replace(/,/g, ''));
      content = <AnimatedCounter end={parsedNum} prefix={numMatch[1]} suffix={numMatch[3]} />;
    }
  }

  return (
    <div className="card-white flex items-center gap-5 group hover:border-indigo-200 transition-all cursor-default overflow-hidden">
      <div 
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0" 
        style={{ backgroundColor: `${color}10`, color: color }}
      >
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div className="truncate">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1 truncate">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight truncate">{content}</h3>
      </div>
    </div>
  );
};

export default StatCard;
