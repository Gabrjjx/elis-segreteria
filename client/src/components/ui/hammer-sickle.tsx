import React from "react";

interface HammerSickleProps {
  width?: number;
  height?: number;
  className?: string;
}

export function HammerSickle({ width = 40, height = 40, className = "" }: HammerSickleProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {/* Martello */}
        <path 
          d="M220 95L160 155L160 365L220 425L260 385L260 135L220 95Z" 
          fill="#FFD700" 
        />
        <path 
          d="M160 155L60 155L20 195L20 325L60 365L160 365Z" 
          fill="#FFD700" 
        />
        
        {/* Falce */}
        <path 
          d="M580 525C480 625 360 580 300 500C240 420 240 320 300 260L340 300C300 340 300 400 340 440C380 480 460 470 540 390L580 525Z" 
          fill="#FFD700" 
        />
        <path 
          d="M300 260L340 220L380 180L420 140L460 100L500 60L540 40L580 80L540 120L500 160L460 200L420 240L380 280L340 300L300 260Z" 
          fill="#FFD700" 
        />
      </g>
    </svg>
  );
}