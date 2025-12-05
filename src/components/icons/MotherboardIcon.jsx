import React from 'react';

const MotherboardIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="5" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="15" y="5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="5" y="15" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="15" y="15" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="9" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1"/>
      <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1"/>
      <line x1="7" y1="9" x2="7" y2="15" stroke="currentColor" strokeWidth="1"/>
      <line x1="17" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
};

export default MotherboardIcon;
