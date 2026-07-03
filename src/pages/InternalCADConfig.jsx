import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Key, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

function InternalCADConfigContent({ user }) {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.OnshapeConfig.list().then(configs => {
      if (configs && configs.length > 0) {
        const c = configs[0];
        setConfigId(c.id);
        setAccessKey(c.access_key || '');
        setSecretKey(c.secret_key || '');
      }
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const data = { access_key: accessKey, secret_key: secretKey, label: 'default' };
    if (configId) {
      await base44.entities.OnshapeConfig.update(configId, data);
    } else {
      const created = await base44.entities.OnshapeConfig.create(data);
      setConfigId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <InternalPageLayout user={user} currentPage="InternalCADConfig" title="Config. Onshape">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-900/30 to-transparent border border-blue-500/20 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-blue-400" /> Credenciais Onshape API
          </h2>
          <p className="text-gray-400 text-sm">Configuração das chaves de acesso à API REST do Onshape para geração de peças automática.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-300">
            <p className="font-bold mb-0.5">Como obter suas chaves:</p>
            <p>1. Acesse <strong>onshape.com</strong> → clique no seu avatar → <strong>My Account</strong></p>
            <p>2. Vá em <strong>API Keys</strong> → <strong>Create new API key</strong></p>
            <p>3. Copie o <strong>Access Key</strong> e o <strong>Secret Key</strong> e cole abaixo.</p>
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onSubmit={handleSave} className="bg-[#0d1525] border border-blue-500/20 rounded-2xl p-6 space-y-5">

          <div>
            <label className="text-xs text-blue-300 font-bold uppercase tracking-widest block mb-2">Onshape Access Key</label>
            <input
              value={accessKey}
              onChange={e => setAccessKey(e.target.value)}
              placeholder="Cole seu Access Key aqui..."
              className="w-full bg-black/30 border border-blue-500/20 focus:border-blue-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-blue-300 font-bold uppercase tracking-widest block mb-2">Onshape Secret Key</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="Cole seu Secret Key aqui..."
                className="w-full bg-black/30 border border-blue-500/20 focus:border-blue-400/60 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
              />
              <button type="button" onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={!accessKey.trim() || !secretKey.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors">
            {saving ? (
              <><span className="animate-spin">⚙️</span> Salvando...</>
            ) : saved ? (
              <><CheckCircle className="w-4 h-4 text-green-300" /> Salvo com sucesso!</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar Credenciais</>
            )}
          </button>
        </motion.form>

        <p className="text-center text-xs text-gray-700 mt-4">
          As credenciais são armazenadas no banco de dados do app e usadas automaticamente pelo Assistente CAD.
        </p>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalCADConfig() {
  return (
    <ProtectedRoute requireApproved={true} requireAdmin={true}>
      <InternalCADConfigContent />
    </ProtectedRoute>
  );
}