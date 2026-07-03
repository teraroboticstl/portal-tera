import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Handshake, Gem, Award, Star, Cog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';

const TIER_CONFIG = {
  Master: { label: 'Institucional', color: 'text-purple-400', border: 'border-purple-500/40', badge: 'bg-purple-500/20 text-purple-300', icon: Gem },
  Gold:   { label: 'Ouro', color: 'text-yellow-400', border: 'border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-300', icon: Award },
  Silver: { label: 'Prata', color: 'text-gray-300', border: 'border-gray-500/40', badge: 'bg-gray-500/20 text-gray-300', icon: Star },
  Apoio:  { label: 'Bronze / Apoio', color: 'text-orange-400', border: 'border-orange-500/30', badge: 'bg-orange-500/10 text-orange-300', icon: Handshake },
};

function SponsorCard({ sponsor, size = 'md' }) {
  const tier = TIER_CONFIG[sponsor.category] || TIER_CONFIG.Apoio;
  const TierIcon = tier.icon;
  const isLarge = size === 'lg';

  const inner = (
    <div className={`group bg-[#111] border ${tier.border} hover:border-[#E10600]/60 hover:shadow-[0_0_20px_rgba(225,6,0,0.15)] transition-all duration-300 rounded-xl p-5 flex flex-col items-center gap-3 h-full`}>
      {/* Logo area */}
      <div className={`${isLarge ? 'w-full h-32' : 'w-full h-20'} flex items-center justify-center rounded-lg bg-white/5 p-3`}>
        {sponsor.logo_url ? (
          <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
        ) : (
          <TierIcon className={`${isLarge ? 'w-12 h-12' : 'w-8 h-8'} ${tier.color} opacity-40`} />
        )}
      </div>

      {/* Name */}
      <h3 className={`font-bold text-white text-center ${isLarge ? 'text-lg' : 'text-sm'}`}>{sponsor.name}</h3>

      {/* Badge */}
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tier.badge}`}>
        {tier.label}
      </span>

      {/* Link */}
      {sponsor.link && (
        <div className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-[#E10600] transition-colors mt-auto">
          <ExternalLink className="w-3 h-3" />
          <span>Visitar site</span>
        </div>
      )}
    </div>
  );

  if (sponsor.link) return <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>;
  return inner;
}

export default function Sponsors() {
  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => base44.entities.Sponsor.list('order'),
  });

  const master   = sponsors.filter(s => s.category === 'Master');
  const gold     = sponsors.filter(s => s.category === 'Gold');
  const silver   = sponsors.filter(s => s.category === 'Silver');
  const apoio    = sponsors.filter(s => s.category === 'Apoio' || !s.category);

  return (
    <div className="pt-14 bg-black min-h-screen">

      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Cog className="w-[400px] h-[400px] text-[#E10600]" style={{ transform: 'rotate(-6deg)' }} />
        </div>
        <div className="absolute -right-20 bottom-0 opacity-5 pointer-events-none">
          <Cog className="w-80 h-80 text-[#E10600]" />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block border border-[#E10600] bg-[#E10600]/10 px-4 py-1 mb-5">
              <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Nossos Parceiros</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-2 mb-6 tracking-tighter">
              PATROCI<span className="text-[#E10600]">NADORES</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Agradecemos às empresas e instituições que acreditam no poder transformador da educação STEM e tornam nosso trabalho possível.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits bar */}
      <section className="py-10 px-6 bg-[#E10600]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { title: 'Impacto Social', desc: 'Investir em educação STEM transforma vidas e comunidades.' },
            { title: 'Visibilidade', desc: 'Sua marca associada à inovação em eventos regionais e nacionais.' },
            { title: 'Talentos', desc: 'Acesso a futuros profissionais de engenharia e tecnologia.' },
          ].map((b, i) => (
            <motion.div key={b.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <h3 className="text-lg font-black text-white mb-2 uppercase">{b.title}</h3>
              <p className="text-white/80 text-sm">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sponsors List */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-20">
          {isLoading && <LoadingSpinner />}

          {/* Master / Institucional */}
          {(master.length > 0 || (!isLoading && sponsors.length === 0)) && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeader icon={Gem} label="Patrocinador Institucional" color="text-purple-400" />
              {master.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {master.map(s => <SponsorCard key={s.id} sponsor={s} size="lg" />)}
                </div>
              ) : (
                <div className="bg-[#111] border border-purple-500/30 rounded-xl p-8 flex items-center gap-5 max-w-lg">
                  <Gem className="w-10 h-10 text-purple-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-black text-white">SESI – Escola SESI Três Lagoas</h3>
                    <p className="text-purple-400 text-sm uppercase tracking-wider mt-1">Patrocinador Institucional</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Gold */}
          {gold.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeader icon={Award} label="Patrocinadores Ouro" color="text-yellow-400" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gold.map(s => <SponsorCard key={s.id} sponsor={s} size="lg" />)}
              </div>
            </motion.div>
          )}

          {/* Silver */}
          {silver.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeader icon={Star} label="Patrocinadores Prata" color="text-gray-300" />
              <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {silver.map(s => <SponsorCard key={s.id} sponsor={s} />)}
              </div>
            </motion.div>
          )}

          {/* Apoio / Bronze */}
          {apoio.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <SectionHeader icon={Handshake} label="Parceiros e Apoiadores" color="text-orange-400" />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {apoio.map(s => <SponsorCard key={s.id} sponsor={s} size="sm" />)}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {!isLoading && sponsors.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <Handshake className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum patrocinador cadastrado ainda.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Handshake className="w-12 h-12 text-[#E10600] mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase tracking-tight">
              Quer Apoiar a <span className="text-[#E10600]">TeraRobotics?</span>
            </h2>
            <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
              Oferecemos diferentes níveis de patrocínio com benefícios exclusivos. Entre em contato para conhecer nossas propostas de parceria.
            </p>
            <Link to={createPageUrl('Contact')}>
              <Button className="bg-[#E10600] hover:bg-[#E10600]/80 text-white font-bold uppercase tracking-wider px-10 h-12 text-sm">
                Seja um Patrocinador
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 bg-[#111] border border-white/10 rounded-lg flex items-center justify-center">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <h2 className={`text-2xl font-black uppercase tracking-wider ${color}`}>{label}</h2>
    </div>
  );
}