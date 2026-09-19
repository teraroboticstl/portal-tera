import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Pencil, Check, X, Plus, Download, 
  Target, Users, Building2, Calendar, 
  ExternalLink, FolderOpen, AlertCircle 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LoadingSpinner from '@/components/common/LoadingSpinner';

function EditableText({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const handleSave = () => { 
    onSave(draft); 
    setEditing(false); 
  };
  const handleCancel = () => { 
    setDraft(value || ''); 
    setEditing(false); 
  };

  if (editing) {
    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className={`${className} bg-white/10 border border-[#CC0000] rounded p-2 w-full resize-none outline-none text-white`}
          rows={4}
        />
        <div className="flex gap-2 mt-1">
          <button onClick={handleSave} className="flex items-center gap-1 text-xs bg-[#CC0000] text-white px-3 py-1 rounded hover:bg-red-700">
            <Check className="w-3 h-3" /> Salvar
          </button>
          <button onClick={handleCancel} className="flex items-center gap-1 text-xs bg-white/10 text-white px-3 py-1 rounded hover:bg-white/20">
            <X className="w-3 h-3" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className={className}>{value || <span className="italic text-gray-500">Clique no lápis para adicionar texto...</span>}</p>
      <button
        onClick={() => setEditing(true)}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-[#CC0000] p-1 rounded"
        title="Editar rascunho local"
      >
        <Pencil className="w-3 h-3 text-white" />
      </button>
    </div>
  );
}

function SidePhotoSlot({ photo, onAdd, onRemove, accent, tall }) {
  const heightClass = tall ? 'min-h-[320px] h-full' : 'min-h-[260px] h-full';
  if (photo) {
    return (
      <div className={`relative group overflow-hidden ${heightClass} ${accent ? 'border-l-4 border-[#CC0000]' : ''}`}>
        <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/80 hover:bg-[#CC0000] p-1.5 rounded transition-all"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>
    );
  }
  return (
    <div
      onClick={onAdd}
      className={`${heightClass} ${accent ? 'border-l-4 border-[#CC0000]' : ''} flex flex-col items-center justify-center cursor-pointer bg-[#0d0d0d] hover:bg-white/5 transition-colors gap-3 border-r border-white/10`}
    >
      <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center">
        <Plus className="w-5 h-5 text-gray-600" />
      </div>
      <span className="text-gray-600 text-xs text-center px-4">Clique para adicionar<br />uma foto aqui</span>
    </div>
  );
}

export default function ProjectDetail() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id');
  const projectSlug = params.get('project'); // Fallback por compatibilidade retroativa

  // Consulta do projeto na entidade Project (tabela public.projects)
  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: ['project-detail', projectId, projectSlug],
    queryFn: async () => {
      if (projectId) {
        return await base44.entities.Project.get(projectId);
      }
      if (projectSlug) {
        // Tenta buscar por título aproximado ou exato
        const matches = await base44.entities.Project.filter({ title: projectSlug });
        if (matches && matches.length > 0) return matches[0];
        // Tenta listar todos e comparar sem case
        const all = await base44.entities.Project.list('-created_date');
        const found = all.find(p => p.title?.toLowerCase() === projectSlug.toLowerCase());
        if (found) return found;
      }
      return null;
    },
    enabled: Boolean(projectId || projectSlug),
  });

  // Chave estável para rascunhos em localStorage
  const storageKey = project?.id ? `project_detail_${project.id}` : (projectId ? `project_detail_${projectId}` : (projectSlug ? `project_detail_${projectSlug}` : null));

  // Estado local para parágrafos editoriais com fallback para descrição do banco
  const [paragraphs, setParagraphs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);
  const pageRef = useRef(null);

  // Inicializar dados do projeto e mesclar com rascunho salvo no localStorage
  useEffect(() => {
    if (!project) return;

    // Gerar parágrafos iniciais a partir do texto do projeto cadastrado
    const defaultParagraphs = (() => {
      if (project.description) {
        const splitParas = project.description
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(Boolean);
        if (splitParas.length > 0) return splitParas;
        return [project.description];
      }
      return ['Detalhes e documentação deste projeto em desenvolvimento.'];
    })();

    // Tentar carregar rascunhos locais previamente salvos
    if (storageKey) {
      try {
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.paragraphs && Array.isArray(parsed.paragraphs) && parsed.paragraphs.length > 0) {
            setParagraphs(parsed.paragraphs);
          } else {
            setParagraphs(defaultParagraphs);
          }
        } else {
          setParagraphs(defaultParagraphs);
        }

        const savedPhotos = localStorage.getItem(`${storageKey}_photos`);
        if (savedPhotos) {
          setPhotos(JSON.parse(savedPhotos));
        } else if (project.images && project.images.length > 1) {
          // Usa imagens extras cadastradas no banco como galeria inicial se não houver rascunho
          setPhotos(project.images.slice(1).map((url, idx) => ({ url, caption: `${project.title} #${idx + 1}` })));
        } else {
          setPhotos([]);
        }
      } catch (e) {
        setParagraphs(defaultParagraphs);
      }
    } else {
      setParagraphs(defaultParagraphs);
    }
  }, [project, storageKey]);

  const updateParagraph = (index, value) => {
    setParagraphs(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSave = () => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ paragraphs }));
    localStorage.setItem(`${storageKey}_photos`, JSON.stringify(photos));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos(prev => [...prev, { url: ev.target.result, caption: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleExportPDF = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(pageRef.current, { backgroundColor: '#000', scale: 1.5 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`${project?.title || 'projeto'}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    }
  };

  // Imagem principal de capa / logo
  const heroImage = project?.images?.[0] || '';

  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando dados do projeto..." />
      </div>
    );
  }

  // 2. Estado de Projeto Não Encontrado ou Erro
  if (!project || isError) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="sticky top-14 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center">
          <Link to="/Projects" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Voltar aos Projetos
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-[#CC0000]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Projeto Não Encontrado</h1>
          <p className="text-gray-400 text-sm mb-6">
            {error?.message || 'O projeto solicitado não foi localizado ou ainda não foi cadastrado no banco de dados da equipe.'}
          </p>
          <Link
            to="/Projects"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#CC0000] hover:bg-red-700 text-white px-5 py-2.5 rounded transition-colors"
          >
            <FolderOpen className="w-4 h-4" /> Ver Todos os Projetos
          </Link>
        </div>
      </div>
    );
  }

  // 3. Renderização Completa do Projeto com dados de public.projects
  return (
    <div className="min-h-screen bg-black text-white" ref={pageRef}>
      {/* Top bar */}
      <div className="sticky top-14 z-40 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/Projects" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Projetos
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
            title="Salva alterações de rascunho editorial neste navegador"
          >
            {saved ? <><Check className="w-3.5 h-3.5 text-green-400" /> Salvo!</> : <><Check className="w-3.5 h-3.5" /> Salvar Rascunho</>}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#CC0000] hover:bg-red-700 px-3 py-1.5 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative py-20 px-4 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#CC0000]/10 to-transparent pointer-events-none" />
        
        {heroImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#CC0000] shadow-[0_0_50px_rgba(204,0,0,0.4)] mb-6 relative z-10 bg-[#111217]"
          >
            <img src={heroImage} alt={project.title} className="w-full h-full object-cover" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border-4 border-[#CC0000] flex items-center justify-center mb-6 relative z-10 bg-[#111217] shadow-[0_0_50px_rgba(204,0,0,0.3)]"
          >
            <FolderOpen className="w-16 h-16 text-[#CC0000]" />
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-6xl font-black tracking-tight mb-3 relative z-10"
        >
          {project.title}
        </motion.h1>

        {project.date_period && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 text-gray-400 text-sm sm:text-base relative z-10 mb-3"
          >
            <Calendar className="w-4 h-4 text-[#CC0000]" />
            <span>{project.date_period}</span>
          </motion.div>
        )}

        {project.tags && project.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2 relative z-10 mb-4"
          >
            {project.tags.map(tag => (
              <span
                key={tag}
                className="bg-white/10 text-gray-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        )}

        {project.link && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 mt-2"
          >
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#CC0000] hover:bg-red-700 text-white px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-red-900/30"
            >
              <ExternalLink className="w-4 h-4" /> Acessar Link Oficial
            </a>
          </motion.div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#CC0000] to-transparent" />
      </div>

      {/* Metrics / Meta Highlights */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            className="bg-[#111] border border-white/10 p-5 rounded-lg hover:border-[#CC0000]/50 transition-colors"
          >
            <Target className="w-6 h-6 text-[#CC0000] mb-3" />
            <div className="text-xl sm:text-2xl font-black text-white mb-1 truncate">
              {project.tags?.[0] || 'Inovação'}
            </div>
            <div className="text-[#CC0000] text-xs font-bold uppercase tracking-wide mb-1">Eixo Principal</div>
            <div className="text-gray-500 text-xs leading-tight">Área de atuação e impacto</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-[#111] border border-white/10 p-5 rounded-lg hover:border-[#CC0000]/50 transition-colors"
          >
            <Calendar className="w-6 h-6 text-[#CC0000] mb-3" />
            <div className="text-xl sm:text-2xl font-black text-white mb-1 truncate">
              {project.date_period || 'Ativo'}
            </div>
            <div className="text-[#CC0000] text-xs font-bold uppercase tracking-wide mb-1">Cronograma</div>
            <div className="text-gray-500 text-xs leading-tight">Período de execução oficial</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[#111] border border-white/10 p-5 rounded-lg hover:border-[#CC0000]/50 transition-colors"
          >
            <Users className="w-6 h-6 text-[#CC0000] mb-3" />
            <div className="text-xl sm:text-2xl font-black text-white mb-1">TeraRobotics</div>
            <div className="text-[#CC0000] text-xs font-bold uppercase tracking-wide mb-1">Equipe</div>
            <div className="text-gray-500 text-xs leading-tight">Desenvolvido pelos membros</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-[#111] border border-white/10 p-5 rounded-lg hover:border-[#CC0000]/50 transition-colors"
          >
            <Building2 className="w-6 h-6 text-[#CC0000] mb-3" />
            <div className="text-xl sm:text-2xl font-black text-white mb-1">SESI Três Lagoas</div>
            <div className="text-[#CC0000] text-xs font-bold uppercase tracking-wide mb-1">Instituição</div>
            <div className="text-gray-500 text-xs leading-tight">Base de operações</div>
          </motion.div>
        </div>
      </div>

      {/* ── EDITORIAL LAYOUT: colunas laterais + texto ── */}
      <div className="max-w-6xl mx-auto px-4 pb-20 space-y-0">

        {/* Título da seção */}
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="w-8 h-1 bg-[#CC0000]" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Sobre o Projeto</h2>
          <div className="flex-1 h-px bg-white/10" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#CC0000] hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Foto
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddPhoto} className="hidden" />
        </div>

        {/* Bloco 1: Foto esquerda | Texto central | Texto direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-white/10">
          {/* Col esquerda — foto */}
          <SidePhotoSlot
            photo={photos[0]}
            onAdd={() => fileInputRef.current?.click()}
            onRemove={() => setPhotos(prev => prev.filter((_, i) => i !== 0))}
            accent
          />
          {/* Col central — parágrafo 1 */}
          <div className="border-t lg:border-t-0 lg:border-x border-white/10 p-7 flex flex-col justify-center bg-[#0a0a0a]">
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">01 — Apresentação</span>
            <EditableText
              value={paragraphs[0]}
              onSave={(val) => updateParagraph(0, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
          </div>
          {/* Col direita — parágrafo 2 */}
          <div className="border-t lg:border-t-0 border-white/10 p-7 flex flex-col justify-center bg-[#080808]">
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">02 — Impacto & Metodologia</span>
            <EditableText
              value={paragraphs[1] || ''}
              onSave={(val) => updateParagraph(1, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Bloco 2: Texto longo | Foto grande direita */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 border-x border-b border-white/10">
          {/* Texto ocupa 3 colunas */}
          <div className="lg:col-span-3 p-7 flex flex-col justify-center bg-[#060606] border-b lg:border-b-0 lg:border-r border-white/10">
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">03 — Próximos Passos</span>
            <EditableText
              value={paragraphs[2] || ''}
              onSave={(val) => updateParagraph(2, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
            {/* Extra paragraph slot */}
            {paragraphs[3] && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <EditableText
                  value={paragraphs[3]}
                  onSave={(val) => updateParagraph(3, val)}
                  className="text-gray-400 leading-relaxed text-sm"
                />
              </div>
            )}
          </div>
          {/* Foto ocupa 2 colunas */}
          <div className="lg:col-span-2">
            <SidePhotoSlot
              photo={photos[1]}
              onAdd={() => fileInputRef.current?.click()}
              onRemove={() => setPhotos(prev => prev.filter((_, i) => i !== 1))}
              tall
            />
          </div>
        </div>

        {/* Bloco 3: galeria de fotos extras (3+) em grid */}
        {photos.length > 2 && (
          <div className="border-x border-b border-white/10">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-4 h-4 bg-[#CC0000]" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Galeria</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
              {photos.slice(2).map((photo, i) => (
                <div key={i} className="relative aspect-square group border-r border-b border-white/10 last:border-r-0 overflow-hidden">
                  <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i + 2))}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/80 hover:bg-[#CC0000] p-1 rounded transition-all"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-r border-b border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors gap-2"
              >
                <Plus className="w-6 h-6 text-gray-600" />
                <span className="text-gray-600 text-xs">Mais fotos</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
