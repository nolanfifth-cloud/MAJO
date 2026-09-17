import React from 'react';

interface MajoLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'horizontal';
}

export const MajoLogo: React.FC<MajoLogoProps> = ({
  className = '',
  showWordmark = true,
  size = 'md',
  variant = 'full',
}) => {
  // Dimensions based on size
  const sizeStyles = {
    sm: { icon: 'w-8 h-8', text: 'text-base', container: 'gap-1.5' },
    md: { icon: 'w-12 h-12', text: 'text-xl', container: 'gap-2' },
    lg: { icon: 'w-16 h-16', text: 'text-2xl', container: 'gap-3' },
    xl: { icon: 'w-24 h-24', text: 'text-3xl', container: 'gap-4' },
  }[size];

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 500 320"
        className={`${sizeStyles.icon} ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MAJO Logo Icon"
      >
        <defs>
          <linearGradient id="logo-left-facet" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#003d99" />
            <stop offset="50%" stopColor="#0954c8" />
            <stop offset="100%" stopColor="#196fe6" />
          </linearGradient>
          <linearGradient id="logo-diagonal-facet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#247cf7" />
            <stop offset="60%" stopColor="#0b63e5" />
            <stop offset="100%" stopColor="#004fc7" />
          </linearGradient>
          <linearGradient id="logo-pill-cyan" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="30%" stopColor="#00b4d8" />
            <stop offset="70%" stopColor="#0091ff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
          <linearGradient id="logo-right-pillar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0091ff" />
            <stop offset="40%" stopColor="#0077ff" />
            <stop offset="100%" stopColor="#0055d4" />
          </linearGradient>
        </defs>

        <g id="logo-emblem">
          {/* Left Vertical Facet */}
          <path
            d="M 158 272 L 158 128 C 158 115 167 106.5 179.5 106.5 L 201 149 L 201 252 L 158 272 Z"
            fill="url(#logo-left-facet)"
          />

          {/* Left Folded Diagonal Facet */}
          <path
            d="M 179.5 106.5 L 250 177 L 228.5 198.5 L 201 149 L 179.5 106.5 Z"
            fill="url(#logo-diagonal-facet)"
          />

          {/* Top-Right Floating Diagonal Pill */}
          <path
            d="M 318.8 91.8 A 21.5 21.5 0 0 1 349.2 122.2 L 281.2 190.2 A 21.5 21.5 0 0 1 250.8 159.8 L 318.8 91.8 Z"
            fill="url(#logo-pill-cyan)"
          />

          {/* Right Vertical Pillar */}
          <path
            d="M 299 155 A 21.5 21.5 0 0 1 342 155 L 342 252 L 299 272 L 299 155 Z"
            fill="url(#logo-right-pillar)"
          />
        </g>
      </svg>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center ${sizeStyles.container} ${className}`}>
        <img
          src="/assets/majo-logo.svg"
          alt="MAJO Logo"
          className={`${sizeStyles.icon} object-contain`}
        />
        {showWordmark && (
          <div className="flex flex-col justify-center">
            <div className="flex items-center tracking-tight font-black text-[#0c1b33]">
              <span className={sizeStyles.text}>MAJO</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default 'full' variant: Logo icon above MAJO text, exactly as in the user's screenshot
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src="/assets/majo-logo.svg"
        alt="MAJO Logo"
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
};
