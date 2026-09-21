import React, { useState } from 'react';
import { HardDrive, Upload, CheckCircle2, AlertCircle, ExternalLink, Copy, Key, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { uploadToGoogleDrive, getGoogleAuthUrl } from '@/api/googleDriveClient';

export default function GoogleDriveTestManagement({ user }) {
  const [file, setFile] = useState(null);
  const [context, setContext] = useState('test');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  };

  const handleUploadTest = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo para o teste.');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      toast.info('Iniciando envio para o Google Drive institucional...');
      const data = await uploadToGoogleDrive({
        file,
        context,
      });

      setResult(data);
      toast.success('Upload concluído com sucesso no Google Drive!');
    } catch (err) {
      console.error('[Teste Google Drive] Falha no upload:', err);
      toast.error(err.message || 'Falha ao realizar upload.');
      setResult({
        isError: true,
        message: err.message
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateAuthUrl = async () => {
    setAuthLoading(true);
    try {
      const data = await getGoogleAuthUrl();
      setAuthUrl(data.authUrl);
      toast.success('URL de autorização gerada com sucesso.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível gerar a URL de autorização.');
    } finally {
      setAuthLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Cabeçalho */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 flex items-center justify-center text-[#E10600]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Infraestrutura Google Drive Institucional</h2>
            <p className="text-sm text-[#B8BDC7]">
              Conta proprietária: <span className="text-white font-mono font-medium">teraroboticstl@gmail.com</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-[#B8BDC7] leading-relaxed">
          Esta ferramenta administrativa permite testar isoladamente o pipeline server-side de upload e streaming via Google Drive API v3 (OAuth 2.0 com acesso offline). 
          Nenhum formulário de produção foi alterado e os dados aqui enviados são gravados na pasta de testes do Drive.
        </p>
      </div>

      {/* Assistente de Configuração OAuth */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#E10600]" />
            <h3 className="font-bold text-white">Assistente de Conexão OAuth 2.0</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateAuthUrl}
            disabled={authLoading}
            className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${authLoading ? 'animate-spin' : ''}`} />
            {authLoading ? 'Verificando...' : 'Gerar URL de Autorização'}
          </Button>
        </div>

        <p className="text-xs text-[#B8BDC7]">
          Utilize o botão acima para gerar a URL de consentimento offline e autorizar o acesso da conta <strong className="text-white">teraroboticstl@gmail.com</strong>.
          Após a autorização, a página retornará o <code className="text-emerald-400">GOOGLE_REFRESH_TOKEN</code> para ser cadastrado na Vercel.
        </p>

        {authUrl && (
          <div className="p-4 bg-[#0B0B0D] border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <ShieldCheck className="w-4 h-4" />
              URL de autorização pronta para a conta institucional:
            </div>
            <div className="flex items-center gap-2">
              <Input 
                readOnly 
                value={authUrl} 
                className="bg-[#111217] border-[#1F222B] text-xs font-mono text-gray-300"
              />
              <Button 
                onClick={() => window.open(authUrl, '_blank')}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white text-xs px-4"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Autorizar no Google
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Teste de Upload */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#E10600]" />
          Teste de Upload Server-side
        </h3>

        <form onSubmit={handleUploadTest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs text-[#B8BDC7] mb-1.5 block">Arquivo de Teste (Imagem ou PDF)</Label>
              <Input 
                type="file" 
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="bg-[#0B0B0D] border-[#1F222B] text-white file:text-white file:bg-[#1F222B] file:border-0 file:rounded-md file:mr-3 file:px-2 file:py-1 cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-xs text-[#B8BDC7] mb-1.5 block">Contexto / Pasta Destino</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
                  <SelectItem value="test">test (Testes do Sistema)</SelectItem>
                  <SelectItem value="products">products (Produtos/Loja)</SelectItem>
                  <SelectItem value="projects">projects (Projetos Sociais)</SelectItem>
                  <SelectItem value="robots">robots (Robôs da Equipe)</SelectItem>
                  <SelectItem value="sponsors">sponsors (Patrocinadores)</SelectItem>
                  <SelectItem value="events">events (Galeria de Eventos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button 
              type="submit" 
              disabled={!file || uploading}
              className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold px-6"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Transmitindo para o Google Drive...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Executar Teste de Upload
                </>
              )}
            </Button>
            {file && (
              <span className="text-xs text-[#B8BDC7]">
                Arquivo selecionado: <strong className="text-white">{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </form>

        {/* Resultado do Teste */}
        {result && (
          <div className="mt-6 pt-6 border-t border-[#1F222B]">
            {result.isError ? (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-400">Falha no processamento do teste</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.message}</p>
                  <p className="text-xs text-[#B8BDC7] mt-2">
                    Dica: Se as credenciais do Google Drive ainda não foram configuradas nas variáveis de ambiente da Vercel / servidor local, configure <code className="text-white">GOOGLE_CLIENT_ID</code>, <code className="text-white">GOOGLE_CLIENT_SECRET</code> e <code className="text-white">GOOGLE_REFRESH_TOKEN</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Arquivo gravado no Google Drive com sucesso!
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#B8BDC7]">Identificador Persistente (fileId):</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(result.fileId, 'fileId')}
                        className="h-6 text-xs text-[#E10600] hover:bg-[#E10600]/10 px-2"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copiar
                      </Button>
                    </div>
                    <div className="font-mono text-sm text-white bg-[#111217] p-2 rounded border border-[#1F222B] break-all select-all">
                      {result.fileId}
                    </div>

                    <div className="text-xs space-y-1 text-[#B8BDC7]">
                      <p>Nome sanitizado: <span className="text-white font-mono">{result.name}</span></p>
                      <p>MIME Type: <span className="text-white font-mono">{result.mimeType}</span></p>
                      <p>Tamanho: <span className="text-white font-mono">{(result.size / 1024).toFixed(1)} KB</span></p>
                      <p>Pasta de Destino ID: <span className="text-white font-mono">{result.folderId}</span></p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a 
                        href={result.webViewLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center text-xs text-[#E10600] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir no Google Drive
                      </a>
                      <span className="text-gray-600">|</span>
                      <a 
                        href={result.directUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center text-xs text-blue-400 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Testar streaming (/api/media/[id])
                      </a>
                    </div>
                  </div>

                  {/* Pré-visualização caso seja imagem */}
                  {result.mimeType?.startsWith('image/') && (
                    <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-4 flex flex-col items-center justify-center">
                      <span className="text-xs text-[#B8BDC7] mb-2">Pré-visualização via Stream HTTP:</span>
                      <div className="w-48 h-48 rounded-lg overflow-hidden border border-[#1F222B] bg-black flex items-center justify-center">
                        <img 
                          src={result.directUrl} 
                          alt={result.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Se a rota local não estiver rodando com credenciais, exibe fallback
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
