import React from 'react';

const CoolerIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 3v6m0 6v6M3 12h6m6 0h6" stroke="currentColor" strokeWidth="2"/>
      <path d="M6.34 6.34l4.24 4.24m5.66 0l4.24-4.24M6.34 17.66l4.24-4.24m5.66 0l4.24 4.24" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
};

export default CoolerIcon;
