import React from 'react';
import { motion } from 'framer-motion';

export default function SectionTitle({ title, subtitle, accent = true, center = true }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-12 ${center ? 'text-center' : ''}`}
    >
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        {accent ? (
          <>
            <span className="text-[#E10600]">{title.split(' ')[0]}</span>
            {' '}
            <span>{title.split(' ').slice(1).join(' ')}</span>
          </>
        ) : (
          title
        )}
      </h2>
      {subtitle && (
        <p className="text-[#B8BDC7] text-lg max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}