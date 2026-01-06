import React from 'react';

interface LoyaltyCardProps {
  title?: string;
  points?: number;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ title, points, subtitle, className, children }) => {
  return (
    <div className={`p-4 border rounded-lg bg-white ${className || ''}`}>
      {title && <div className="text-sm text-gray-500">{title}</div>}
      <div className="text-2xl font-bold text-gray-900">{points ?? 0}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      {children}
    </div>
  );
};

export default LoyaltyCard;
