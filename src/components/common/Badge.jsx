import React from 'react';

const variants = {
  default: 'bg-[#1F222B] text-[#B8BDC7]',
  accent: 'bg-[#E10600]/20 text-[#E10600]',
  frc: 'bg-red-500/20 text-red-400',
  ftc: 'bg-orange-500/20 text-orange-400',
  fll: 'bg-yellow-500/20 text-yellow-400',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  pending: 'bg-blue-500/20 text-blue-400',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
      ${variants[variant] || variants.default}
      ${className}
    `}>
      {children}
    </span>
  );
}