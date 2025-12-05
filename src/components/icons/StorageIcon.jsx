import React from 'react';

const StorageIcon = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="8" y1="21" x2="8" y2="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="8" r="1" fill="currentColor"/>
      <circle cx="18" cy="12" r="1" fill="currentColor"/>
      <circle cx="18" cy="16" r="1" fill="currentColor"/>
    </svg>
  );
};

export default StorageIcon;
