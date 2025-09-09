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
          <title id="title2">TravelCheck Logo Lockup</title>
          <desc id="desc2">Enhanced TravelCheck logo with wordmark for headers and marketing materials.</desc>
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
                --text:#0f172a;
                --subtext:#475569;
              }
              .card{ fill:var(--card); }
              .globe-ring{ stroke:var(--ink); stroke-width:8; fill:none; stroke-linecap:round; }
              .equator{ stroke:var(--ink); stroke-width:8; stroke-linecap:round; }
              .grid{ stroke:var(--grid); stroke-width:2; fill:none; opacity:.9; }
              .land{ fill:var(--land); opacity:.16; }
              .badge{ fill:var(--badge); }
              .check{ fill:var(--check); }
              .shadow{ fill:var(--shadow); }
              .wordmark{ font:700 48px/1 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; fill:var(--text); letter-spacing:.5px;}
              .tagline{ font:400 16px/1.4 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; fill:var(--subtext);}
            `}
          </style>
          <g transform="translate(20,20)">
            <ellipse className="shadow" cx="80" cy="122" rx="46" ry="9"/>
            <rect className="card" x="39" y="42" width="82" height="62" rx="14"/>
            <defs>
              <clipPath id="globeClip"><circle cx="80" cy="73" r="29"/></clipPath>
            </defs>
            <circle className="globe-ring" cx="80" cy="73" r="29"/>
            <g clipPath="url(#globeClip)">
              <path className="grid" d="M51 73h58"/>
              <path className="grid" d="M54 64c9-5 39-5 54 0"/>
              <path className="grid" d="M54 82c9 5 39 5 54 0"/>
              <path className="grid" d="M80 45c-12 0-22 13-22 28s10 28 22 28"/>
              <path className="grid" d="M80 45c12 0 22 13 22 28s-10 28-22 28"/>
              <path className="land" d="M64 60c6-4 16-4 24-2 4 1 6 3 7 5 1 2 0 4-2 4-8 2-18 2-27-1-4-1-4-4-2-6z"/>
              <path className="land" d="M58 79c2-2 6-4 11-5 10-1 22 2 27 6 2 2 2 5-2 5-14 2-27 1-35-3-2-1-3-3-1-3z"/>
            </g>
            <line className="equator" x1="51" y1="73" x2="109" y2="73"/>
            <g transform="translate(96,93)">
              <circle className="badge" r="12"/>
              <path className="check" d="M-4 2l-4-5a4 4 0 0 1 6-5l2 3 7-7a4 4 0 1 1 5 5l-10 10a4 4 0 0 1-6-2z"/>
            </g>
          </g>
          <g transform="translate(160,0)">
            <text className="wordmark" x="0" y="80">TravelCheck</text>
            <text className="tagline" x="0" y="110">Email + passport intelligence for accurate, auditable travel history</text>
          </g>
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

export { Logo };
export default Logo;
