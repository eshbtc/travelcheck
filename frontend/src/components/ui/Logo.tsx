import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'lockup' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'icon', 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  };

  const lockupSizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-20',
  };

  if (variant === 'lockup') {
    return (
      <div className={`${lockupSizeClasses[size]} ${className}`}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 720 200" 
          className="h-full w-auto"
          role="img" 
          aria-labelledby="title2 desc2"
        >
          <title id="title2">Travelcheck Logo Lockup</title>
          <desc id="desc2">Stamp icon with Travelcheck wordmark.</desc>
          <style>
            {`
              :root{
                --tc-primary:#20BEFF;
                --tc-accent:#00C853;
                --tc-ink:#202124;
                --tc-text:#202124;
              }
              .ring{ fill:var(--tc-primary); }
              .passport{ fill:#ffffff; }
              .lines{ stroke:var(--tc-ink); stroke-width:5.5; stroke-linecap:round; stroke-linejoin:round; fill:none; }
              .plane{ fill:var(--tc-primary); }
              .check{ fill:var(--tc-accent); }
              .word{ font:700 44px/1 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; fill:var(--tc-text); letter-spacing:.2px;}
              .sub{ font:400 16px/1.5 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; fill:#475569;}
            `}
          </style>
          <g transform="translate(10,10)">
            <circle className="ring" cx="80" cy="80" r="70"/>
            <rect className="passport" x="42" y="45" rx="11" ry="11" width="76" height="62"/>
            <path className="lines" d="M56 77h48"/>
            <path className="lines" d="M80 57c13 0 22 9 22 22s-9 22-22 22"/>
            <path className="lines" d="M80 57c-13 0-22 9-22 22s9 22 22 22"/>
            <path className="lines" d="M32 100c15 13 35 20 56 20 16 0 30-3 44-9"/>
            <path className="plane" d="M134 111l13 3c2 1 2 4-1 4l-12 2-7 7c-2 1-5 1-5-1l2-7-5-5c-1-2 0-4 3-3l8 3 5-4c1 0 3 0 3 1z"/>
            <path className="check" d="M66 112a6 6 0 0 1-4-2l-11-14a5 5 0 1 1 8-5l8 9 21-21a5 5 0 1 1 7 7l-26 26a6 6 0 0 1-3 1z"/>
          </g>
          <text className="word" x="180" y="90">TravelCheck</text>
          <text className="sub" x="180" y="120">Email + passport intelligence for accurate, auditable travel history</text>
        </svg>
      </div>
    );
  }

  if (variant === 'monochrome') {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 256 256" 
          className="h-full w-full"
          role="img" 
          aria-labelledby="title3 desc3"
        >
          <title id="title3">Travelcheck Monochrome</title>
          <desc id="desc3">Single-color variant of the Travelcheck logo for simplified printing.</desc>
          <style>
            {`
              :root{ --tc-one:#202124; }
              .fill{ fill:var(--tc-one); }
              .lines{ stroke:#ffffff; stroke-width:7; stroke-linecap:round; stroke-linejoin:round; fill:none; opacity:.9;}
              .inv{ fill:#ffffff; }
            `}
          </style>
          <circle className="fill" cx="128" cy="124" r="92"/>
          <rect className="inv" x="76" y="76" rx="14" ry="14" width="104" height="84"/>
          <path className="lines" d="M92 118h72"/>
          <path className="lines" d="M128 92c17 0 30 12 30 30s-13 30-30 30"/>
          <path className="lines" d="M128 92c-17 0-30 12-30 30s13 30 30 30"/>
          <path className="lines" d="M66 144c20 18 47 28 76 28 21 0 41-5 58-14"/>
          <path className="inv" d="M194 158l17 4c3 1 3 5-1 6l-17 3-10 9c-2 2-6 1-6-2l3-10-7-7c-2-2 0-5 3-4l11 4 7-5c1-1 3-1 4 2z"/>
          <path className="inv" d="M108 154a8 8 0 0 1-6-3l-14-18a6 6 0 1 1 10-7l10 12 28-28a6 6 0 1 1 8 8l-34 34a8 8 0 0 1-6 2z"/>
        </svg>
      </div>
    );
  }

  // Default icon variant
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 256 256" 
        className="h-full w-full"
        role="img" 
        aria-labelledby="title desc"
      >
        <title id="title">Travelcheck Logo</title>
        <desc id="desc">Clean passport stamp with verification checkmark for travel history validation.</desc>
        <style>
          {`
            :root{
              --tc-primary:#20BEFF;
              --tc-accent:#00C853;
              --tc-ink:#202124;
              --tc-bg:#ffffff;
            }
            .shadow{ fill:rgba(32,33,36,0.08); }
            .ring{ fill:var(--tc-primary); }
            .passport{ fill:#ffffff; }
            .lines{ stroke:var(--tc-ink); stroke-width:4; stroke-linecap:round; stroke-linejoin:round; fill:none; }
            .check{ fill:var(--tc-accent); }
          `}
        </style>
        <ellipse className="shadow" cx="128" cy="200" rx="70" ry="16"/>
        <circle className="ring" cx="128" cy="128" r="80" />
        <rect className="passport" x="88" y="88" rx="12" ry="12" width="80" height="60"/>
        <path className="lines" d="M98 118h60"/>
        <path className="lines" d="M98 128h60"/>
        <path className="lines" d="M98 138h40"/>
        <path className="check" d="M118 128l8 8 16-16" stroke="var(--tc-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </div>
  );
};

export default Logo;
