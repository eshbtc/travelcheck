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
          <title id="title3">Travelcheck — Monochrome</title>
          <desc id="desc3">Simplified one-color Travelcheck logo with card, globe, and verification badge.</desc>
          <style>
            {`
              :root{
                --ink:#0f172a;
                --bg:#ffffff;
              }
              .card{ fill:var(--bg); }
              .globe-ring{ stroke:var(--ink); stroke-width:16; fill:none; stroke-linecap:round; }
              .equator{ stroke:var(--ink); stroke-width:16; stroke-linecap:round; }
              .grid{ stroke:var(--ink); stroke-width:4; fill:none; opacity:.5; }
              .badge{ fill:var(--ink); }
              .check{ fill:var(--bg); }
            `}
          </style>
          <rect className="card" x="62" y="68" width="132" height="100" rx="22"/>
          <defs>
            <clipPath id="gClip"><circle cx="128" cy="118" r="46"/></clipPath>
          </defs>
          <circle className="globe-ring" cx="128" cy="118" r="46"/>
          <g clipPath="url(#gClip)">
            <path className="grid" d="M82 118h92"/>
            <path className="grid" d="M86 103c14-8 62-8 86 0"/>
            <path className="grid" d="M86 133c14 8 62 8 86 0"/>
            <path className="grid" d="M128 72c-20 0-36 21-36 46s16 46 36 46"/>
            <path className="grid" d="M128 72c20 0 36 21 36 46s-16 46-36 46"/>
          </g>
          <line className="equator" x1="82" y1="118" x2="174" y2="118"/>
          <g transform="translate(154,150)">
            <circle className="badge" r="20"/>
            <path className="check" d="M-6 4l-7-8a6 6 0 0 1 9-8l4 5 12-12a6 6 0 1 1 9 9l-17 17a6 6 0 0 1-10-3z"/>
          </g>
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
        <title id="title">Travelcheck — Transparent</title>
        <desc id="desc">Passport card with globe lines and an offset badge check.</desc>
        <style>
          {`
            :root{
              --ink:#0f172a;
              --grid:#223044;
              --land:#0ea5e9;
              --card:#ffffff;
              --badge:#0b1220;
              --check:#22c55e;
              --shadow:rgba(15,23,42,.08);
            }
            .card{ fill:var(--card); }
            .globe-ring{ stroke:var(--ink); stroke-width:16; fill:none; stroke-linecap:round; }
            .equator{ stroke:var(--ink); stroke-width:16; stroke-linecap:round; }
            .grid{ stroke:var(--grid); stroke-width:4; fill:none; opacity:.9; }
            .land{ fill:var(--land); opacity:.16; }
            .badge{ fill:var(--badge); }
            .check{ fill:var(--check); }
            .shadow{ fill:var(--shadow); }
          `}
        </style>
        <ellipse className="shadow" cx="128" cy="194" rx="74" ry="14"/>
        <rect className="card" x="62" y="68" width="132" height="100" rx="22"/>
        <defs>
          <clipPath id="globeClip"><circle cx="128" cy="118" r="46"/></clipPath>
        </defs>
        <circle className="globe-ring" cx="128" cy="118" r="46"/>
        <g clipPath="url(#globeClip)">
          <path className="grid" d="M82 118h92"/>
          <path className="grid" d="M86 103c14-8 62-8 86 0"/>
          <path className="grid" d="M86 133c14 8 62 8 86 0"/>
          <path className="grid" d="M128 72c-20 0-36 21-36 46s16 46 36 46"/>
          <path className="grid" d="M128 72c20 0 36 21 36 46s-16 46-36 46"/>
          <path className="land" d="M102 96c10-6 26-7 38-3 6 2 10 5 12 8 2 3 0 6-4 7-13 3-29 3-43-1-6-2-7-7-3-11z"/>
          <path className="land" d="M92 127c3-4 10-7 18-8 16-2 36 3 44 10 4 4 3 8-3 9-23 4-44 2-57-5-4-2-5-5-2-6z"/>
        </g>
        <line className="equator" x1="82" y1="118" x2="174" y2="118"/>
        <g transform="translate(154,150)">
          <circle className="badge" r="20"/>
          <path className="check" d="M-6 4l-7-8a6 6 0 0 1 9-8l4 5 12-12a6 6 0 1 1 9 9l-17 17a6 6 0 0 1-10-3z"/>
        </g>
      </svg>
    </div>
  );
};

export default Logo;
