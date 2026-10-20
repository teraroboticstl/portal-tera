import './helpers/isolatedSupabase.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { getDriveErrorInfo } from '../api/_lib/googleDrive.js';

describe('Cronômetro e Sequência de Áudio FLL BIOGLOW', () => {

  it('1. Arquivos MP3 oficiais existem no diretório public e public/audio', () => {
    const paths = [
      './public/Som inicio de round.MP3',
      './public/Som final de Round.MP3',
      './public/Bip.MP3',
      './public/audio/Som inicio de round.MP3',
      './public/audio/Som final de Round.MP3',
      './public/audio/Bip.MP3',
      './public/audio/som-inicio-round.mp3',
      './public/audio/som-final-round.mp3'
    ];

    paths.forEach(p => {
      assert.ok(fs.existsSync(path.resolve(p)), `Arquivo ${p} deve existir`);
      const stat = fs.statSync(path.resolve(p));
      assert.ok(stat.size > 1000, `Arquivo ${p} deve ter tamanho válido (>1KB), encontrado ${stat.size} bytes`);
    });
  });

  it('2. Gerenciador fllAudio exporta funções para início, término, bips e controle de mudo', () => {
    const code = fs.readFileSync(path.resolve('./src/lib/fllAudio.js'), 'utf-8');
    assert.ok(code.includes('export function playStartRoundSound'), 'Exporta playStartRoundSound');
    assert.ok(code.includes('export function playEndRoundSound'), 'Exporta playEndRoundSound');
    assert.ok(code.includes('export function playCountdownPip'), 'Exporta playCountdownPip');
    assert.ok(code.includes('export function stopAllAudio'), 'Exporta stopAllAudio');
    assert.ok(code.includes('export function setSoundMuted'), 'Exporta setSoundMuted');
    assert.ok(code.includes('export function preloadFllAudio'), 'Exporta preloadFllAudio');
  });

  it('3. Remoção de sintetizadores, osciladores e fallbacks sonoros tipo MIDI', () => {
    const code = fs.readFileSync(path.resolve('./src/lib/fllAudio.js'), 'utf-8');
    assert.ok(!code.includes('createOscillator'), 'Não deve conter osciladores Web Audio sintetizados');
    assert.ok(!code.includes('playSynthesizedStartFallback'), 'Não deve conter fanfarra sintetizada');
    assert.ok(!code.includes('playSynthesizedBuzzerFallback'), 'Não deve conter buzzer sintetizado');
    assert.ok(!code.includes('AudioContext'), 'Não deve instanciar AudioContext sintetizado');
  });

  it('4. Cabeçalho BioglowScoreHeader inclui controle de som ativado/desativado (Volume2 / VolumeX)', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('Volume2') && code.includes('VolumeX'), 'Inclui ícones Volume2 e VolumeX');
    assert.ok(code.includes('handleToggleSound'), 'Possui manipulador handleToggleSound');
    assert.ok(code.includes('soundMuted'), 'Gerencia estado soundMuted');
  });

  it('5. Cabeçalho reproduz Som inicio de round.MP3 simultaneamente ao início de 02:30', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('playStartRoundSound()'), 'Chama playStartRoundSound ao iniciar round');
    assert.ok(code.includes('secondsLeft === 150'), 'Verifica se está em 150s (02:30) para disparar som de início');
  });

  it('6. Cabeçalho emite bip curto nos últimos 10 segundos (00:10 até 00:01) totalizando 10 bips', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('next >= 1 && next <= 10'), 'Verifica intervalo dos últimos 10 segundos');
    assert.ok(code.includes('playCountdownPip()'), 'Emite bip curto via playCountdownPip');
    assert.ok(code.includes('beepedSecondsRef'), 'Evita repetições e duplicações usando ref');
  });

  it('7. Ao atingir 00:00, reproduz Som final de Round.MP3 uma única vez sem bip simultâneo', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('playEndRoundSound()'), 'Chama som de término em 00:00');
    assert.ok(code.includes('hasPlayedEndSoundRef'), 'Garante execução única do som final');
    assert.ok(!code.includes('playCountdownPip();\n      }\n      setIsRunning(false);\n      return 0;'), 'Não toca bip no segundo 0');
  });

  it('8. Pausar interrompe contagem e qualquer áudio em reprodução; Retomar não repete início nem bips passados', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('pauseTimer'), 'Possui função pauseTimer');
    assert.ok(code.includes('stopAllAudio()'), 'Chama stopAllAudio ao pausar');
    assert.ok(code.includes('resumeTimer'), 'Possui função resumeTimer');
  });

  it('9. Zerar interrompe áudios e redefine o cronômetro para 02:30 com sequência renovada', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('resetTrigger > 0'), 'Observa resetTrigger');
    assert.ok(code.includes('setSecondsLeft(150)'), 'Restaura para 150 segundos');
    assert.ok(code.includes('beepedSecondsRef.current.clear()'), 'Limpa bips emitidos');
  });

  it('10. Cronômetro não atinge valores negativos ao finalizar (clamped em 00:00)', () => {
    const code = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(code.includes('Math.max(0, next)'), 'Garante valor não negativo');
    assert.ok(code.includes('return 0;'), 'Retorna 0 ao finalizar');
  });

  it('11. Handler real preserva SHA-256 dos três áudios oficiais com Drive/cache simulados, sem produção', async () => {
    const slots = { round_start: 'Som inicio de round.MP3', countdown_beep: 'Bip.MP3', round_end: 'Som final de Round.MP3' };
    const aliases = { start: 'round_start', beep: 'countdown_beep', end: 'round_end' };
    const bytes = new Map();
    const config = {};
    for (const [slot, filename] of Object.entries(slots)) {
      const buffer = fs.readFileSync(path.resolve('public', filename));
      bytes.set(slot, buffer);
      config[slot] = { fileId: slot, mimeType: 'audio/mpeg', sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
    }
    const cache = new Map(); let downloads = 0, failDownload = false;
    const logs = [];
    const context = vm.createContext({ Buffer, console: { error(...args) { logs.push(args); } } });
    const stub = exports => new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const handler = new vm.SourceTextModule(fs.readFileSync(path.resolve('api/fll/[action].js'), 'utf8'), { context });
    await handler.link(name => {
      if (name.endsWith('supabaseServer.js')) return stub({ validateUserAuth() { throw Error('Unexpected auth'); }, createScopedUserSupabaseClient() { throw Error('Unexpected database'); }, supabaseServer: {} });
      if (name.endsWith('googleDrive.js')) return stub({ getDriveErrorInfo, getGoogleDriveClient: async () => ({ files: { get: async ({ fileId }) => { if (failDownload) throw new Error('synthetic-sensitive-token'); downloads++; return { data: bytes.get(fileId) }; } } }) });
      if (name.endsWith('fllSimulations.js')) return stub({ handleFllSimulations() { throw Error('Unexpected simulation'); } });
      if (name.endsWith('fllAudioStorage.js')) return stub({ getActiveFllSeasonData() { throw Error('Unexpected season'); }, getFllAudioConfig: async () => config, SLOT_CANONICAL_MAP: aliases, VALID_SLOTS: Object.keys(slots), getCachedAudioBytes: id => cache.get(id), cacheAudioBytes: (id, value) => cache.set(id, value) });
      throw Error(`Unexpected dependency ${name}`);
    });
    await handler.evaluate();
    for (const rawSlot of [...Object.keys(slots), ...Object.keys(aliases)]) {
      const canonical = aliases[rawSlot] || rawSlot;
      const response = { headers: {}, statusCode: null, body: null,
        setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; },
        end(data) { this.body = data; }, json(data) { this.body = data; } };
      await handler.namespace.default({ method: 'GET', url: '/api/fll/audio', query: { slot: rawSlot }, headers: {} }, response);
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.headers['Content-Type'], 'audio/mpeg');
      assert.strictEqual(crypto.createHash('sha256').update(response.body).digest('hex'), config[canonical].sha256);
    }
    assert.strictEqual(downloads, 3, 'Os aliases reutilizam os bytes em cache dos três slots');
    cache.clear(); failDownload = true;
    const denied = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler.namespace.default({ method: 'GET', url: '/api/fll/audio', query: { slot: 'start' }, headers: {} }, denied);
    assert.strictEqual(denied.code, 500);
    assert.doesNotMatch(JSON.stringify({ response: denied.body, logs }), /synthetic-sensitive-token/);
  });

  it('12. Painel Admin possui a seção Áudios FLL com três campos independentes e prévias', () => {
    const adminCode = fs.readFileSync(path.resolve('./src/pages/AdminPanel.jsx'), 'utf-8');
    assert.ok(adminCode.includes('fll_audios'), 'AdminPanel preserva alias da guia legada');
    assert.ok(adminCode.includes('<FllSimulatorsManagement user={user} />'), 'AdminPanel renderiza o painel consolidado atual');
    const simulatorCode = fs.readFileSync(path.resolve('./src/components/admin/FllSimulatorsManagement.jsx'), 'utf-8');
    assert.ok(simulatorCode.includes('<FllAudiosManagement'), 'Painel consolidado preserva gerenciador de áudios');

    const fllAudiosCode = fs.readFileSync(path.resolve('./src/components/admin/FllAudiosManagement.jsx'), 'utf-8');
    assert.ok(fllAudiosCode.includes('FLL_AUDIO_SLOTS'), 'Utiliza slots de áudio oficiais');
    assert.ok(fllAudiosCode.includes('uploadFllAudio'), 'Permite upload de MP3');
    assert.ok(fllAudiosCode.includes('togglePlayPreview'), 'Possui botão de prévia de áudio');
  });

});
