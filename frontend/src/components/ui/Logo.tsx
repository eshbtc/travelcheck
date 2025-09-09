import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'icon' | 'lockup' | 'monochrome';
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
      default:
        return 'TravelCheck Logo';
    }
  };

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
