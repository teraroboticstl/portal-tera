import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, ArrowLeft } from 'lucide-react';

export default function ChatMentor({ mentor, user, onClose }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const bottomRef = useRef(null);

  const isMentor = user && mentor.emails_mentor?.includes(user.email);

  const { data: mensagens = [] } = useQuery({
    queryKey: ['tir-chat', mentor.id],
    queryFn: () => base44.entities.TIRMensagem.filter({ mentor_id: mentor.id }, 'created_date'),
    refetchInterval: 5000,
    initialData: [],
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviar = useMutation({
    mutationFn: (txt) => base44.entities.TIRMensagem.create({
      mentor_id: mentor.id,
      autor_nome: user.full_name || user.email,
      autor_email: user.email,
      is_mentor: isMentor,
      texto: txt,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tir-chat', mentor.id] });
      setTexto('');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    enviar.mutate(texto.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0D1526] border border-green-500/20 rounded-2xl flex flex-col overflow-hidden"
        style={{ height: '80vh', maxHeight: 600 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center text-xl flex-shrink-0">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-sm">{mentor.nome}</p>
            <p className="text-green-400 text-xs">{mentor.funcao}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {mensagens.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-10 h-10 text-green-500/20 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Nenhuma mensagem ainda.</p>
              <p className="text-gray-700 text-xs mt-1">Seja o primeiro a enviar uma dúvida!</p>
            </div>
          )}
          {mensagens.map((msg) => {
            const isMe = msg.autor_email === user.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                  msg.is_mentor
                    ? 'bg-green-500/20 border border-green-500/30 text-white'
                    : isMe
                      ? 'bg-white/10 text-white'
                      : 'bg-[#111] border border-white/5 text-gray-200'
                }`}>
                  {!isMe && (
                    <p className={`text-[10px] font-bold mb-1 ${msg.is_mentor ? 'text-green-400' : 'text-gray-400'}`}>
                      {msg.is_mentor ? `🤖 ${msg.autor_nome}` : msg.autor_nome}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.texto}</p>
                  <p className="text-[10px] text-gray-500 mt-1 text-right">
                    {new Date(msg.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/5 flex gap-2 flex-shrink-0">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-2.5 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviar.isPending}
            className="px-4 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}