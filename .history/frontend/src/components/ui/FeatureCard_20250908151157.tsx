import React from 'react';
import Card from './Card';
import Button from './Button';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  gradient?: 'blue' | 'teal' | 'yellow' | 'green';
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  actionText = 'Get started',
  onAction,
  className,
  gradient = 'blue',
}) => {
  const gradientClasses = {
    blue: 'from-kaggle-blue/20 to-kaggle-blue/5',
    teal: 'from-kaggle-teal/20 to-kaggle-teal/5',
    yellow: 'from-kaggle-yellow/20 to-kaggle-yellow/5',
    green: 'from-kaggle-green/20 to-kaggle-green/5',
  };

  return (
    <Card className={`relative overflow-hidden ${className}`} hover>
      {/* Abstract background shapes */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]}`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-kaggle-yellow/10 transform translate-x-8 -translate-y-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-kaggle-teal/10 transform -translate-x-4 translate-y-4" />
        <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-kaggle-blue/10 transform -translate-x-8 -translate-y-8" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-white shadow-kaggle">
          {icon}
        </div>
        
        <h3 className="text-lg font-semibold text-text-primary text-center mb-2">
          {title}
        </h3>
        
        <p className="text-text-secondary text-center mb-6 text-sm leading-relaxed">
          {description}
        </p>
        
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="text-kaggle-blue hover:text-kaggle-blue/80"
          >
            {actionText}
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FeatureCard;
