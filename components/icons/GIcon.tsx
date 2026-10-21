import React from 'react';

export const GIcon = ({ size = 24, color = "currentColor", className = "" }: { size?: number, color?: string, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <text 
      x="50%" 
      y="50%" 
      dy=".35em" 
      textAnchor="middle" 
      fontFamily="'Outfit', 'Inter', system-ui, sans-serif" 
      fontWeight="900" 
      fontSize="18" 
      fill={color}
    >
      G
    </text>
  </svg>
);
