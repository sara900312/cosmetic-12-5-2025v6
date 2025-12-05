import React from 'react';

const GpuIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="5" y="9" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M2 10h-1m1 4h-1M22 10h1m-1 4h1" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="12" r="1" fill="currentColor"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <circle cx="16" cy="12" r="1" fill="currentColor"/>
    </svg>
  );
};

export default GpuIcon;
