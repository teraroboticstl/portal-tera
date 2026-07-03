import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, MapPin } from 'lucide-react';

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['tournament-config'],
    queryFn: () => base44.entities.TournamentConfig.filter({ is_active: true }),
  });

  const activeConfig = configs[0];

  useEffect(() => {
    if (!activeConfig?.tournament_date) return;

    const calculateTimeLeft = () => {
      const targetDate = new Date(activeConfig.tournament_date).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        expired: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeConfig]);

  if (!activeConfig) {
    return (
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center gap-3 text-[#B8BDC7]">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span>Nenhum torneio configurado. Configure a data no Painel Admin.</span>
        </div>
      </div>
    );
  }

  const TimeBlock = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl px-4 py-3 min-w-[80px]">
        <span className="text-3xl md:text-4xl font-bold text-[#F5F7FA] font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-[#B8BDC7] mt-2 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111217] border border-[#E10600]/30 rounded-2xl p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-[#E10600]" />
            <h3 className="text-lg font-bold text-[#E10600]">Contagem Regressiva</h3>
          </div>
          <p className="text-[#F5F7FA] font-medium">{activeConfig.tournament_name}</p>
          {activeConfig.location && (
            <div className="flex items-center gap-1 text-sm text-[#B8BDC7] mt-1">
              <MapPin className="w-3 h-3" />
              {activeConfig.location}
            </div>
          )}
        </div>
        {activeConfig.program && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            activeConfig.program === 'FRC' ? 'bg-red-500/20 text-red-400' :
            activeConfig.program === 'FTC' ? 'bg-orange-500/20 text-orange-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {activeConfig.program}
          </span>
        )}
      </div>

      {timeLeft?.expired ? (
        <div className="text-center py-4">
          <span className="text-2xl font-bold text-[#E10600]">O torneio começou! 🎉</span>
        </div>
      ) : timeLeft ? (
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <TimeBlock value={timeLeft.days} label="Dias" />
          <span className="text-2xl text-[#B8BDC7] font-bold">:</span>
          <TimeBlock value={timeLeft.hours} label="Horas" />
          <span className="text-2xl text-[#B8BDC7] font-bold">:</span>
          <TimeBlock value={timeLeft.minutes} label="Min" />
          <span className="text-2xl text-[#B8BDC7] font-bold">:</span>
          <TimeBlock value={timeLeft.seconds} label="Seg" />
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="animate-pulse text-[#B8BDC7]">Carregando...</div>
        </div>
      )}
    </motion.div>
  );
}