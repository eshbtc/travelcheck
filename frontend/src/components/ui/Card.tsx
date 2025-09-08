import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false, 
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'bg-bg-primary rounded-xl border border-border-light shadow-kaggle',
        paddingClasses[padding],
        hover && 'hover:shadow-kaggle-lg transition-shadow duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
