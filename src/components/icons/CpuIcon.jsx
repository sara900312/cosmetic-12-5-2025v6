import React from 'react';

const CpuIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9 1v6m6 0V1m0 22v-6m-6 6v-6M1 9h6m10 0h6M7 15H1m22 0h-6" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
};

export default CpuIcon;
