import React from 'react';

interface SenaLogoProps {
  className?: string;
  color?: string; // default is #39A900 (official SENA green)
  size?: number | string;
}

export const SenaLogo: React.FC<SenaLogoProps> = ({
  className = 'h-10 w-auto',
  color = '#39A900',
  size
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 360"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      role="img"
      aria-label="Logo SENA"
    >
      {/* 1. Head (Solid Circle at the top) */}
      <circle cx="160" cy="50" r="36" fill={color} />

      {/* 2. Text: SENA */}
      <g fill={color}>
        {/* Letter S */}
        <path d="M52 140 C52 118 70 108 96 108 C116 108 128 116 130 128 L108 132 C106 126 102 122 95 122 C88 122 81 125 81 130 C81 136 86 138 98 141 C118 145 132 152 132 166 C132 181 118 190 95 190 C72 190 56 181 53 164 L75 160 C77 169 84 175 95 175 C103 175 110 171 110 165 C110 159 104 156 91 153 C72 149 52 143 52 140 Z" />
        
        {/* Letter E */}
        <path d="M142 110 H184 V124 H158 V142 H180 V156 H158 V174 H185 V188 H142 Z" />
        
        {/* Letter N */}
        <path d="M196 110 H213 L233 162 V110 H248 V188 H231 L211 136 V188 H196 Z" />
        
        {/* Letter A */}
        <path d="M272 110 H290 L312 188 H294 L289 170 H272 L267 188 H250 Z M276 156 H285 L281 134 Z" />
      </g>

      {/* 3. SENA Figure / Body / Chevron */}
      <g fill={color}>
        {/* Main upper arms & outer silhouette */}
        <path
          d="M 30 200 
             H 290 
             V 228 
             H 244 
             L 290 316 
             L 248 338 
             L 204 250 
             L 160 338 
             L 116 250 
             L 72 338 
             L 30 316 
             L 76 228 
             H 30 
             Z"
        />
        {/* Inner negative space / triangular cutouts creating the characteristic SENA geometric shape */}
        <path
          d="M 160 228 
             L 188 284 
             L 218 228 
             Z"
          fill="#FFFFFF"
        />
        <path
          d="M 160 228 
             L 102 228 
             L 132 284 
             Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
};
