import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false, 
  padding = 'md',
  onClick 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        // Polished Kaggle-like card: subtle border, very soft shadow, rounded corners
        'bg-bg-primary rounded-xl border border-border-light shadow-[0_1px_1px_rgba(0,0,0,0.02)]',
        paddingClasses[padding],
        hover && 'transition-shadow duration-150 hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export { Card };
export default Card;
