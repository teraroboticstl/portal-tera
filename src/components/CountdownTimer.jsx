import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CountdownTimer({ targetDate, label = "Countdown para Competição" }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate) - new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const timeUnits = [
    { value: timeLeft.days, label: 'DIAS' },
    { value: timeLeft.hours, label: 'HORAS' },
    { value: timeLeft.minutes, label: 'MIN' },
    { value: timeLeft.seconds, label: 'SEG' }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-[#E10600]" />
        <h3 className="text-[#F5F7FA] font-medium">{label}</h3>
      </div>
      
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {timeUnits.map((unit, index) => (
          <motion.div
            key={unit.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#0B0B0D] border border-[#1F222B] rounded-lg p-2 sm:p-3 text-center overflow-hidden"
          >
            <div className={`text-2xl sm:text-3xl font-bold mb-1 ${
              unit.value === 0 ? 'text-[#B8BDC7]' : 'text-[#E10600]'
            }`}>
              {String(unit.value).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm text-[#B8BDC7] font-medium">
              {unit.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}