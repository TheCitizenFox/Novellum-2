import React from 'react';
import { cn } from '../utils/cn';
import { useAppStore } from '../store';

interface FeatureBadgeProps {
  number: number;
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
}

export const FeatureBadge: React.FC<FeatureBadgeProps> = ({ number, className, position = 'top-left' }) => {
  const { state } = useAppStore();

  if (!state.isInfographicMode) return null;

  const positionClasses = {
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'custom': '', // Requires manual positioning via className
  };

  return (
    <div
      className={cn(
        "absolute z-[999] flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full",
        "bg-accent-primary text-white font-bold text-xs md:text-sm shadow-lg",
        "border-2 border-bg-main ring-4 ring-accent-primary/20",
        positionClasses[position],
        className
      )}
    >
      {number}
    </div>
  );
};
