import React from 'react';

const PowerIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="8" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M7 8V6a1 1 0 011-1h8a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8" cy="13" r="1" fill="currentColor"/>
      <circle cx="16" cy="13" r="1" fill="currentColor"/>
      <path d="M10 10v6m4-6v6" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 12h-2m-14 0H3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
};

export default PowerIcon;
