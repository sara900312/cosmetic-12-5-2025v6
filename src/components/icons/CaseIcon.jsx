import React from 'react';

const CaseIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="8" y="5" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="15" cy="9" r="1" fill="currentColor"/>
      <rect x="8" y="11" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="8" y="17" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="10" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
};

export default CaseIcon;
