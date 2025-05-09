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
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {/* Falce */}
        <path
          d="M17 82C27 72 40 66 50 65C60 64 68 66 75 70L65 80C60 75 55 73 50 74C45 75 37 78 30 85L17 82Z"
          fill="#E32922"
          stroke="#000000"
          strokeWidth="2"
        />
        <path
          d="M75 70L65 60L55 50L45 40L35 30L25 20L15 15L10 20L15 30L25 40L35 50L45 60L55 70L65 80L75 70Z"
          fill="#E32922"
          stroke="#000000"
          strokeWidth="2"
        />
        
        {/* Martello */}
        <rect
          x="65"
          y="15"
          width="20"
          height="12"
          fill="#E32922"
          stroke="#000000"
          strokeWidth="2"
        />
        <path
          d="M75 20L75 70"
          stroke="#000000"
          strokeWidth="4"
          fill="#E32922"
        />
      </g>
    </svg>
  );
}