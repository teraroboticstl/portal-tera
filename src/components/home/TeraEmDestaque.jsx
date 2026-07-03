import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pencil, X, Plus, ExternalLink, Trash2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isAdmin as checkIsAdmin } from '@/components/internal/ProtectedRoute';

const DEFAULT_HIGHLIGHTS = [
  { id: 'dd1', vehicle: 'Diário Digital', url: 'https://www.diariodigital.com.br/geral/escola-sesi-de-tres-lagoas-conquista-trofeu-na-seletiva-de-robotica', photo: null },
  { id: 'ag1', vehicle: 'AgoraMS', url: 'https://www.agorams.com.br/equipe-da-escola-sesi-de-tres-lagoas-conquista-trofeu-na-seletiva-de-robotica-no-df/', photo: null },
  { id: 'rc1', vehicle: 'RCN67', url: 'https://www.rcn67.com.br/tres-lagoas/estudantes-de-tres-lagoas-participam-de-feira-de-robotica-em-brasilia/', photo: null },
  { id: 'ar1', vehicle: 'ArapuaNews', url: 'https://arapuanews.com.br/equipes-de-ms-dao-show-de-garra-e-superacao-no-ultimo-dia-do-festival-sesi-de-robotica/', photo: null },
  { id: 'pn1', vehicle: 'Perfil News', url: 'https://www.perfilnews.com.br/2024/03/06/equipes-de-robotica-de-ms-participam-do-festival-sesi-de-educacao-no-df/', photo: null },
  { id: 'jd1', vehicle: 'Jornal DiaDia', url: 'https://jornaldiadia.com.br/equipe-do-sesi-leva-oficinas-de-robotica-para-criancas-e-adolescentes-neuroatipicos/', photo: null },
  { id: 'fi1', vehicle: 'FIEMS', url: 'https://www.fiems.com.br/noticias/equipe-do-sesi-leva-oficinas-de-robotica-para-criancas-e-adolescentes-neuroatipicos/59947', photo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/09384ffc7_image.png' },
  { id: 'ftc1', vehicle: 'FTC Team 17730', url: 'https://teams.robotics-catalyst.org/team/ftc/17730', photo: null },
  { id: 'ftce1', vehicle: 'FTC Events', url: 'https://ftc-events.firstinspires.org/2025/team/17730', photo: null },
  { id: 'tba1', vehicle: 'The Blue Alliance', url: 'https://www.thebluealliance.com/team/10343', photo: null },
  { id: 'ani1', vehicle: 'Agência de Notícias da Indústria', url: 'https://noticias.portaldaindustria.com.br/noticias/educacao/festival-sesi-de-educacao-segue-a-todo-vapor-no-primeiro-dia-de-competicoes/', photo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/6acdbe888_image.png' },
];

const LS_KEY = 'tera_highlights_v2';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveToStorage(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function OGImage({ url, photo, vehicle, isAdmin, onEdit }) {
  const [src, setSrc] = useState(photo || null);
  const [loading, setLoading] = useState(!photo);

  useEffect(() => {
    if (photo) { setSrc(photo); setLoading(false); return; }
    setLoading(true);
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => {
        const img = data?.data?.image?.url || data?.data?.screenshot?.url || null;
        if (img) setSrc(img);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url, photo]);

  return (
    <div className="relative w-full h-44 overflow-hidden bg-[#111] flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#cc0000] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {src ? (
        <img src={src} alt={vehicle} className="w-full h-full object-cover" />
      ) : !loading ? (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <ExternalLink className="w-8 h-8 text-[#cc0000]/50" />
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">{vehicle}</span>
        </div>
      ) : null}

      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-[#cc0000] text-white p-1.5 rounded-full z-10"
          title="Editar card"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function TeraEmDestaque({ user: propUser }) {
  const [highlights, setHighlights] = useState(() => {
    const stored = loadFromStorage();
    if (!stored) return DEFAULT_HIGHLIGHTS;
    return stored.map(h => h.id === 'fi1' && !h.photo
      ? { ...h, photo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/09384ffc7_image.png' }
      : h
    );
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // { ...cardData }
  const [deleteConfirm, setDeleteConfirm] = useState(null); // card id to confirm delete
  const [addForm, setAddForm] = useState({ vehicle: '', url: '', photo: null });
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);

  useEffect(() => {
    if (!propUser) {
      base44.auth.me().then(u => setFetchedUser(u)).catch(() => {});
    }
  }, [propUser]);

  const activeUser = propUser || fetchedUser;
  const isAdmin = checkIsAdmin(activeUser);

  const save = (data) => { setHighlights(data); saveToStorage(data); };

  const removeCard = (id) => {
    save(highlights.filter(h => h.id !== id));
    setDeleteConfirm(null);
    setEditingCard(null);
  };

  const updateCard = (updated) => {
    save(highlights.map(h => h.id === updated.id ? updated : h));
    setEditingCard(null);
  };

  const addHighlight = () => {
    if (!addForm.vehicle || !addForm.url) return;
    const newItem = { id: `custom_${Date.now()}`, ...addForm };
    save([...highlights, newItem]);
    setAddForm({ vehicle: '', url: '', photo: null });
    setShowAddModal(false);
  };

  const handleUploadEdit = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEdit(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditingCard(c => ({ ...c, photo: file_url }));
    setUploadingEdit(false);
  };

  const handleUploadAdd = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAdd(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAddForm(f => ({ ...f, photo: file_url }));
    setUploadingAdd(false);
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#0a0a0a] relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-[#cc0000] font-bold text-xs sm:text-sm tracking-widest uppercase">— Imprensa —</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-3 mb-4 tracking-tight">
            TERA EM <span className="text-[#cc0000]">DESTAQUE</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">Cobertura da imprensa e reconhecimentos da nossa equipe na mídia nacional.</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {highlights.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative cursor-pointer"
              onClick={() => window.open(h.url, '_blank', 'noopener noreferrer')}
            >
              <div className="relative bg-[#111] border border-white/5 hover:border-[#cc0000]/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col" style={{ borderBottom: '3px solid #cc0000' }}>
                <OGImage
                  url={h.url}
                  photo={h.photo}
                  vehicle={h.vehicle}
                  isAdmin={isAdmin}
                  onEdit={() => setEditingCard({ ...h })}
                />
                <div className="px-3 py-2.5 flex items-center justify-between gap-1">
                  <span className="text-white text-xs font-bold uppercase tracking-wide truncate leading-tight">{h.vehicle}</span>
                  <ExternalLink className="w-3 h-3 text-[#cc0000] flex-shrink-0" />
                </div>
              </div>

              {/* Remove button - admin only */}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(h.id); }}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#cc0000] hover:bg-red-800 text-white w-5 h-5 rounded-full flex items-center justify-center z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}

          {/* Add button - admin only */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center justify-center"
            >
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full h-full min-h-[160px] border-2 border-dashed border-white/10 hover:border-[#cc0000]/50 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-[#cc0000] transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs uppercase tracking-wide font-bold">Adicionar</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ADD Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#111] border border-white/10 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black uppercase tracking-wide">Adicionar Destaque</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Nome do Veículo</label>
                <input
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 text-sm focus:border-[#cc0000] outline-none"
                  value={addForm.vehicle}
                  onChange={e => setAddForm(f => ({ ...f, vehicle: e.target.value }))}
                  placeholder="Ex: Jornal do Brasil"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Link da Matéria</label>
                <input
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 text-sm focus:border-[#cc0000] outline-none"
                  value={addForm.url}
                  onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Foto (opcional — será buscada automaticamente)</label>
                <input type="file" accept="image/*" className="w-full text-gray-400 text-sm" onChange={handleUploadAdd} disabled={uploadingAdd} />
                {uploadingAdd && <p className="text-xs text-yellow-400 mt-1">Carregando...</p>}
              </div>
              <button
                onClick={addHighlight}
                className="w-full bg-[#cc0000] hover:bg-red-800 text-white font-bold uppercase tracking-wide py-2.5 text-sm transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setEditingCard(null)}>
          <div className="bg-[#111] border border-white/10 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black uppercase tracking-wide">Editar Card</h3>
              <button onClick={() => setEditingCard(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Nome do Veículo</label>
                <input
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 text-sm focus:border-[#cc0000] outline-none"
                  value={editingCard.vehicle}
                  onChange={e => setEditingCard(c => ({ ...c, vehicle: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Link da Matéria</label>
                <input
                  className="w-full bg-black border border-white/10 text-white px-3 py-2 text-sm focus:border-[#cc0000] outline-none"
                  value={editingCard.url}
                  onChange={e => setEditingCard(c => ({ ...c, url: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Trocar Foto de Capa</label>
                <input type="file" accept="image/*" className="w-full text-gray-400 text-sm" onChange={handleUploadEdit} disabled={uploadingEdit} />
                {uploadingEdit && <p className="text-xs text-yellow-400 mt-1">Carregando...</p>}
                {editingCard.photo && !uploadingEdit && (
                  <img src={editingCard.photo} alt="" className="mt-2 h-20 object-cover rounded border border-white/10" />
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(editingCard.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-red-700 text-red-500 hover:bg-red-900/20 text-sm font-bold uppercase tracking-wide transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Remover
                </button>
                <button
                  onClick={() => updateCard(editingCard)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#cc0000] hover:bg-red-800 text-white font-bold uppercase tracking-wide py-2.5 text-sm transition-colors"
                >
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111] border border-red-900/50 p-6 w-full max-w-sm text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-black text-lg mb-2">Remover card?</h3>
            <p className="text-gray-400 text-sm mb-6">Tem certeza que deseja remover este card? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-white/10 text-gray-400 hover:text-white py-2.5 text-sm font-bold uppercase tracking-wide transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => removeCard(deleteConfirm)}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2.5 text-sm font-bold uppercase tracking-wide transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}