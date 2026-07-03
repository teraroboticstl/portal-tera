import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Check, X, Plus, Download, Target, Users, Heart, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PROJECTS_DATA = {
  'TIR': {
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/e685bd1ed_ChatGPTImage11demaide202621_33_32.png',
    subtitle: 'Tecnologia e Inovação em Robótica',
    color: '#CC0000',
    metrics: [
      { icon: Target, label: 'Objetivo', value: 'Competição', desc: 'Interclasse de robótica entre turmas do SESI' },
      { icon: Users, label: 'Público Alvo', value: 'Estudantes', desc: 'Alunos do ensino fundamental e médio' },
      { icon: Heart, label: 'Pessoas Afetadas', value: '200+', desc: 'Participantes diretos e indiretos' },
      { icon: Building2, label: 'Instituições', value: '1', desc: 'SESI Três Lagoas' },
    ],
    paragraphs: [
      'O TIR (Tecnologia e Inovação em Robótica) é o programa de interclasse de robótica do SESI Três Lagoas, criado pela equipe TeraRobotics para democratizar o acesso à robótica educacional dentro da própria escola.',
      'O projeto conecta turmas de diferentes anos escolares em uma competição amistosa, onde equipes de alunos constroem e programam robôs LEGO para completar missões temáticas, promovendo aprendizado de STEM de forma prática e divertida.',
      'A cada edição, o TIR evolui em complexidade e alcance, engajando mais estudantes e professores no ecossistema de inovação da TeraRobotics.',
    ],
  },
  'Eco Tera': {
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/df0a61560_Ecotera.jpg',
    subtitle: 'Sustentabilidade e Robótica Ambiental',
    color: '#2d7a2d',
    metrics: [
      { icon: Target, label: 'Objetivo', value: 'Sustentabilidade', desc: 'Aplicar robótica em soluções ambientais' },
      { icon: Users, label: 'Público Alvo', value: 'Comunidade', desc: 'Escola e comunidade de Três Lagoas' },
      { icon: Heart, label: 'Pessoas Afetadas', value: '500+', desc: 'Impacto na comunidade escolar' },
      { icon: Building2, label: 'Instituições', value: '3+', desc: 'Parceiros ambientais e educacionais' },
    ],
    paragraphs: [
      'O Eco Tera é a iniciativa de sustentabilidade da TeraRobotics, que une tecnologia e consciência ambiental para criar soluções inovadoras voltadas ao meio ambiente.',
      'Por meio de projetos que envolvem robótica, sensoriamento e automação, a equipe desenvolve protótipos que ajudam no monitoramento ambiental, reciclagem inteligente e educação ecológica para a comunidade.',
      'O projeto reforça o compromisso da TeraRobotics com o desenvolvimento sustentável e com a formação de jovens engenheiros conscientes do seu papel no planeta.',
    ],
  },
  'M.I.A': {
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/b59f1ff25_TeraUnearthed.jpg',
    subtitle: 'Mapeamento e Inteligência Arqueológica',
    color: '#8B4513',
    metrics: [
      { icon: Target, label: 'Objetivo', value: 'Arqueologia', desc: 'Catalogar sítios arqueológicos do Brasil' },
      { icon: Users, label: 'Público Alvo', value: 'Pesquisadores', desc: 'Arqueólogos e historiadores' },
      { icon: Heart, label: 'Pessoas Afetadas', value: '1000+', desc: 'Usuários da plataforma digital' },
      { icon: Building2, label: 'Instituições', value: '10+', desc: 'Universidades e institutos parceiros' },
    ],
    paragraphs: [
      'O M.I.A (Mapeamento e Inteligência Arqueológica) é uma plataforma digital desenvolvida pela TeraRobotics que cataloga e georreferencia sítios arqueológicos em todo o Brasil.',
      'A plataforma democratiza o acesso ao conhecimento histórico, permitindo que pesquisadores, estudantes e entusiastas explorem o patrimônio arqueológico brasileiro de forma interativa e acessível.',
      'Com recursos de inteligência artificial e geoprocessamento, o M.I.A apoia escavações, preservação do patrimônio cultural e pesquisas acadêmicas em todo o território nacional.',
    ],
  },
  'NeuroBotics': {
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/e9a7bf59e_LogoTera-Corao2.png',
    subtitle: 'Robótica Aplicada à Neurociência',
    color: '#CC0000',
    metrics: [
      { icon: Target, label: 'Objetivo', value: 'Inclusão', desc: 'Robótica para reabilitação e inclusão' },
      { icon: Users, label: 'Público Alvo', value: 'PcD', desc: 'Pessoas com deficiência e necessidades especiais' },
      { icon: Heart, label: 'Pessoas Afetadas', value: '150+', desc: 'Beneficiários diretos do projeto' },
      { icon: Building2, label: 'Instituições', value: '5+', desc: 'Clínicas e centros de reabilitação' },
    ],
    paragraphs: [
      'O NeuroBotics é o projeto da TeraRobotics voltado para a aplicação da robótica na neurociência e reabilitação, desenvolvendo soluções tecnológicas que promovem inclusão e melhora na qualidade de vida.',
      'A equipe desenvolve dispositivos robóticos assistivos e interfaces neurais simplificadas que auxiliam pessoas com deficiência motora ou neurológica em suas atividades cotidianas e processos de reabilitação.',
      'O projeto reúne estudantes de robótica, neurociência e engenharia biomédica em uma colaboração única, resultando em protótipos inovadores apresentados em competições nacionais e internacionais.',
    ],
  },
};

function EditableText({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const handleSave = () => { onSave(draft); setEditing(false); };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className={`${className} bg-white/10 border border-[#CC0000] rounded p-2 w-full resize-none outline-none`}
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
      <p className={className}>{value}</p>
      <button
        onClick={() => setEditing(true)}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-[#CC0000] p-1 rounded"
        title="Editar"
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
        <img src={photo.url} alt="" className="w-full h-full object-cover" />
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
  const projectKey = params.get('project') || 'TIR';
  const base = PROJECTS_DATA[projectKey] || PROJECTS_DATA['TIR'];

  const storageKey = `project_detail_${projectKey}`;

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...base, ...JSON.parse(saved) };
    } catch {}
    return base;
  });

  const [photos, setPhotos] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_photos`);
      return saved ? JSON.parse(saved) : [];
    } catch {}
    return [];
  });

  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);
  const pageRef = useRef(null);

  const updateParagraph = (index, value) => {
    const newParagraphs = [...data.paragraphs];
    newParagraphs[index] = value;
    setData(d => ({ ...d, paragraphs: newParagraphs }));
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify({ paragraphs: data.paragraphs }));
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
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const canvas = await html2canvas(pageRef.current, { backgroundColor: '#000', scale: 1.5 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`${projectKey}.pdf`);
  };

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
          >
            {saved ? <><Check className="w-3.5 h-3.5 text-green-400" /> Salvo!</> : <><Check className="w-3.5 h-3.5" /> Salvar</>}
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
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#CC0000] shadow-[0_0_50px_rgba(204,0,0,0.4)] mb-6 relative z-10"
        >
          <img src={data.logo} alt={projectKey} className="w-full h-full object-cover" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-6xl font-black tracking-tight mb-2 relative z-10"
        >
          {projectKey}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-base sm:text-lg relative z-10"
        >
          {data.subtitle}
        </motion.p>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#CC0000] to-transparent" />
      </div>

      {/* Metrics */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111] border border-white/10 p-5 rounded-lg hover:border-[#CC0000]/50 transition-colors"
            >
              <m.icon className="w-6 h-6 text-[#CC0000] mb-3" />
              <div className="text-2xl font-black text-white mb-1">{m.value}</div>
              <div className="text-[#CC0000] text-xs font-bold uppercase tracking-wide mb-1">{m.label}</div>
              <div className="text-gray-500 text-xs leading-tight">{m.desc}</div>
            </motion.div>
          ))}
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
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">01 — História</span>
            <EditableText
              value={data.paragraphs[0]}
              onSave={(val) => updateParagraph(0, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
          </div>
          {/* Col direita — parágrafo 2 */}
          <div className="border-t lg:border-t-0 border-white/10 p-7 flex flex-col justify-center bg-[#080808]">
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">02 — Impacto</span>
            <EditableText
              value={data.paragraphs[1]}
              onSave={(val) => updateParagraph(1, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Bloco 2: Texto longo | Foto grande direita */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 border-x border-b border-white/10">
          {/* Texto ocupa 3 colunas */}
          <div className="lg:col-span-3 p-7 flex flex-col justify-center bg-[#060606] border-b lg:border-b-0 lg:border-r border-white/10">
            <span className="text-[#CC0000] text-xs font-black uppercase tracking-widest mb-3">03 — Futuro</span>
            <EditableText
              value={data.paragraphs[2] || ''}
              onSave={(val) => updateParagraph(2, val)}
              className="text-gray-300 leading-relaxed text-sm sm:text-base"
            />
            {/* Extra paragraph slot */}
            {data.paragraphs[3] && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <EditableText
                  value={data.paragraphs[3]}
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
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
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