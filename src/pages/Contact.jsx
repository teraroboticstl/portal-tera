import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Handshake, Users, CircleHelp, Send, Cog } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.ContactMessage.create(data),
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ name: form.name, email: form.email, subject: form.subject, message: form.message });
  };

  return (
    <div className="bg-black">
      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute -right-32 top-0 opacity-5">
          <Cog className="w-[400px] h-[400px] text-[#E10600]" style={{ transform: 'rotate(7deg)' }} />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Fale Conosco</span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-4 mb-6 tracking-tighter">
              CON<span className="text-[#E10600]">TATO</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Estamos sempre abertos a novas parcerias, patrocínios e colaborações. Entre em contato e vamos construir o futuro juntos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form section */}
      <section className="py-20 px-6 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-16">
            {/* Left */}
            <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-black text-white mb-6 uppercase">Informações de Contato</h2>
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#E10600] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Localização</h3>
                    <p className="text-gray-400">SESI Três Lagoas<br />Três Lagoas, MS - Brasil</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#E10600] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Email</h3>
                    <p className="text-gray-400">teraroboticstl@gmail.com</p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-4 uppercase">Como podemos ajudar?</h3>
              <div className="grid gap-3">
                {[
                  { icon: Handshake, title: 'Patrocínio', value: 'patrocinio', desc: 'Quero apoiar a equipe financeiramente' },
                  { icon: Users, title: 'Parceria', value: 'parceria', desc: 'Interesse em parceria técnica ou educacional' },
                  { icon: CircleHelp, title: 'Informações', value: 'informacoes', desc: 'Dúvidas sobre a equipe ou programas' },
                ].map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <button key={item.title} type="button"
                      onClick={() => setForm(f => ({ ...f, subject: item.value }))}
                      className="flex items-center gap-3 p-4 border border-white/10 hover:border-white/30 text-left transition-all">
                      <ItemIcon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Form */}
            <motion.div className="lg:col-span-3" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              {sent ? (
                <div className="bg-black border border-[#E10600]/30 p-12 text-center">
                  <div className="w-20 h-20 bg-[#E10600] flex items-center justify-center mx-auto mb-6">
                    <Send className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-4 uppercase">Mensagem Enviada!</h2>
                  <p className="text-gray-400">Recebemos sua mensagem e responderemos em breve.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-black border border-white/10 p-8 md:p-12">
                  <h2 className="text-2xl font-black text-white mb-8 uppercase">Envie sua Mensagem</h2>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-white uppercase text-sm tracking-wider font-medium">Nome completo *</label>
                        <input
                          className="w-full bg-white/5 border border-white/20 text-white placeholder:text-gray-600 px-3 py-2 focus:outline-none focus:border-[#E10600] transition-colors"
                          placeholder="Seu nome" required value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-white uppercase text-sm tracking-wider font-medium">Email *</label>
                        <input
                          type="email"
                          className="w-full bg-white/5 border border-white/20 text-white placeholder:text-gray-600 px-3 py-2 focus:outline-none focus:border-[#E10600] transition-colors"
                          placeholder="seu@email.com" required value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-white uppercase text-sm tracking-wider font-medium">Assunto *</label>
                      <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white w-full">
                          <SelectValue placeholder="Selecione o assunto" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/20 [&_*]:text-white">
                          <SelectItem value="patrocinio">Patrocínio</SelectItem>
                          <SelectItem value="parceria">Parceria</SelectItem>
                          <SelectItem value="informacoes">Informações</SelectItem>
                          <SelectItem value="imprensa">Imprensa</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-white uppercase text-sm tracking-wider font-medium">Mensagem *</label>
                      <textarea
                        className="w-full min-h-[150px] bg-white/5 border border-white/20 text-white placeholder:text-gray-600 px-3 py-2 focus:outline-none focus:border-[#E10600] transition-colors resize-none"
                        placeholder="Como podemos ajudar?" required value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      />
                    </div>
                    <button type="submit" disabled={mutation.isPending}
                      className="w-full bg-[#E10600] hover:bg-[#7A0000] text-white font-bold h-14 uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                      <Send className="w-5 h-5" />
                      {mutation.isPending ? 'Enviando...' : 'Enviar Mensagem'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="h-80 bg-white/5 border-t border-white/10 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-[#E10600] mx-auto mb-3" />
            <p className="text-white font-bold text-lg">SESI Três Lagoas</p>
            <p className="text-gray-400">Três Lagoas, MS - Brasil</p>
          </div>
        </div>
      </section>
    </div>
  );
}