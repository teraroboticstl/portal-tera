import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ 
  children, 
  className = '', 
  hover = true,
  gradient = false,
  onClick
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        relative bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden
        ${hover ? 'hover:border-[#E10600]/50 transition-all duration-300' : ''}
        ${gradient ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-[#E10600]/5 before:to-transparent before:pointer-events-none' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}