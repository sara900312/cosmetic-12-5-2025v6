import React from 'react';

const RamIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="8" width="20" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M6 8V6a1 1 0 011-1h2a1 1 0 011 1v2M14 8V6a1 1 0 011-1h2a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2"/>
      <line x1="6" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2"/>
      <line x1="10" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="2"/>
      <line x1="14" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2"/>
      <line x1="18" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
};

export default RamIcon;
