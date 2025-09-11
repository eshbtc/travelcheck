import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'icon' | 'lockup' | 'monochrome' | 'sidebar';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'icon', 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
    xl: 'h-40 w-40',
    '2xl': 'h-48 w-48',
    '3xl': 'h-56 w-56',
    '4xl': 'h-64 w-64',
  };

  const lockupSizeClasses = {
    xs: 'h-6',
    sm: 'h-12',
    md: 'h-20',
    lg: 'h-32',
    xl: 'h-40',
    '2xl': 'h-48',
    '3xl': 'h-56',
    '4xl': 'h-64',
  };

  const getLogoSrc = () => {
    switch (variant) {
      case 'lockup':
        return '/logo-lockup.svg';
      case 'monochrome':
        return '/logo-monochrome.svg';
      default:
        return '/logo-icon.svg';
    }
  };

  const getAltText = () => {
    switch (variant) {
      case 'lockup':
        return 'TravelCheck Logo with Wordmark';
      case 'monochrome':
        return 'TravelCheck Monochrome Logo';
      case 'sidebar':
        return 'TravelCheck';
      default:
        return 'TravelCheck Logo';
    }
  };

  if (variant === 'sidebar') {
    // Compact lockup for narrow rails: icon + text wordmark, no slogan
    const textSizes: Record<NonNullable<LogoProps['size']>, string> = {
      xs: 'text-lg',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-2xl',
      xl: 'text-4xl',
      '2xl': 'text-5xl',
      '3xl': 'text-6xl',
      '4xl': 'text-7xl',
    };
    // Make the icon slightly larger relative to the wordmark for better balance in the rail
    const iconMap: Record<NonNullable<LogoProps['size']>, string> = {
      xs: 'h-8 w-8',
      sm: 'h-10 w-10',
      md: 'h-14 w-14',
      lg: 'h-16 w-16',
      xl: 'h-16 w-16',
      '2xl': 'h-20 w-20',
      '3xl': 'h-24 w-24',
      '4xl': 'h-28 w-28',
    };
    return (
      <div className={`flex items-center gap-3 ${className}`} aria-label={getAltText()}>
        <Image src={'/logo-icon.svg'} alt={'Logo icon'} width={96} height={96} className={`${iconMap[size]} shrink-0`} />
        <span className={`font-extrabold leading-none text-text-primary ${textSizes[size]} whitespace-nowrap`}>
          TravelCheck
        </span>
      </div>
    );
  }

  if (variant === 'lockup') {
    return (
      <div className={`${lockupSizeClasses[size]} ${className}`}>
        <Image
          src={getLogoSrc()}
          alt={getAltText()}
          width={720}
          height={200}
          className="h-full w-auto"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <Image
        src={getLogoSrc()}
        alt={getAltText()}
        width={256}
        height={256}
        className="h-full w-full"
        priority
      />
    </div>
  );
};

export { Logo };
export default Logo;
