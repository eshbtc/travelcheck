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
          <title id="title3">Travelcheck Logo — Monochrome Refined</title>
          <desc id="desc3">Solid stamp ring with passport card, balanced globe, and white knockout check.</desc>
          <style>
            {`
              :root{ --tc-one:#0f172a; }
              .ink{ fill:var(--tc-one); }
              .inv{ fill:#ffffff; }
              .globe{ stroke:#ffffff; stroke-width:12; stroke-linecap:round; stroke-linejoin:round; fill:none; }
            `}
          </style>
          <circle className="ink" cx="128" cy="128" r="110"/>
          <rect className="inv" x="64" y="72" width="128" height="96" rx="20" ry="20"/>
          <circle className="globe" cx="128" cy="120" r="36"/>
          <line className="globe" x1="92" y1="120" x2="164" y2="120"/>
          <path className="inv" d="M112 136l-12-14a8 8 0 0 1 12-10l8 10 20-20a8 8 0 0 1 12 12l-26 26a8 8 0 0 1-12-4z"/>
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
        <title id="title">Travelcheck Logo Refined</title>
        <desc id="desc">Centered stamp circle with passport card, balanced globe lines, and check mark aligned properly.</desc>
        <style>
          {`
            :root{
              --tc-blue:#0ea5e9;
              --tc-ink:#0f172a;
              --tc-green:#22c55e;
              --tc-bg:#ffffff;
            }
            .ring{ fill:var(--tc-blue); }
            .card{ fill:var(--tc-bg); }
            .globe{ stroke:var(--tc-ink); stroke-width:12; stroke-linecap:round; stroke-linejoin:round; fill:none; }
            .check{ fill:var(--tc-green); }
          `}
        </style>
        <circle className="ring" cx="128" cy="128" r="110"/>
        <rect className="card" x="64" y="72" width="128" height="96" rx="20" ry="20"/>
        <circle className="globe" cx="128" cy="120" r="36"/>
        <line className="globe" x1="92" y1="120" x2="164" y2="120"/>
        <path className="check" d="M112 136l-12-14a8 8 0 0 1 12-10l8 10 20-20a8 8 0 0 1 12 12l-26 26a8 8 0 0 1-12-4z"/>
      </svg>
    </div>
  );
};

export default Logo;
