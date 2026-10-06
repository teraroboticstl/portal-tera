import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

  it('11. Rota de áudio /api/fll/audio entrega bytes idênticos (SHA-256 idêntico) aos arquivos originais do Google Drive', async () => {
    const { default: fllHandler } = await import('../api/fll/[action].js');
    const { getFllAudioConfig } = await import('../api/_lib/fllAudioStorage.js');
    const config = await getFllAudioConfig();

    for (const slot of ['start', 'beep', 'end']) {
      const slotData = config[slot];
      if (!slotData?.fileId) continue;

      const chunks = [];
      const headers = {};
      let statusCode = 200;

      const req = {
        method: 'GET',
        url: `/api/fll/audio?slot=${slot}`,
        query: { slot },
        headers: {}
      };

      const res = {
        setHeader(k, v) { headers[k] = v; },
        status(c) { statusCode = c; return this; },
        end(data) {
          if (data) chunks.push(data);
        }
      };

      await audioHandler(req, res);

      assert.strictEqual(statusCode, 200, `Slot ${slot} deve responder com status 200`);
      assert.strictEqual(headers['Content-Type'], 'audio/mpeg', `Content-Type deve ser audio/mpeg`);

      const receivedBuf = Buffer.concat(chunks);
      const computedSha = crypto.createHash('sha256').update(receivedBuf).digest('hex');

      assert.strictEqual(
        computedSha, 
        slotData.sha256, 
        `Hash SHA-256 do áudio entregue (${slot}) deve ser 100% idêntico ao armazenado`
      );
    }
  });

  it('12. Painel Admin possui a seção Áudios FLL com três campos independentes e prévias', () => {
    const adminCode = fs.readFileSync(path.resolve('./src/pages/AdminPanel.jsx'), 'utf-8');
    assert.ok(adminCode.includes('fll_audios'), 'AdminPanel inclui guia fll_audios');
    assert.ok(adminCode.includes('FllAudiosManagement'), 'AdminPanel renderiza FllAudiosManagement');

    const fllAudiosCode = fs.readFileSync(path.resolve('./src/components/admin/FllAudiosManagement.jsx'), 'utf-8');
    assert.ok(fllAudiosCode.includes('FLL_AUDIO_SLOTS'), 'Utiliza slots de áudio oficiais');
    assert.ok(fllAudiosCode.includes('uploadFllAudio'), 'Permite upload de MP3');
    assert.ok(fllAudiosCode.includes('togglePlayPreview'), 'Possui botão de prévia de áudio');
  });

});
