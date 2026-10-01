import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CONFIG_PATH = path.resolve(process.cwd(), 'src/config/fllAudioConfig.json');
const STORAGE_DIR = path.resolve(process.cwd(), 'src/config/fll-audio-store');

// Garante que o diretório de armazenamento local seguro exista para cache de bytes
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch {}
}

export const VALID_SLOTS = ['start', 'beep', 'end'];

/**
 * Lê a configuração persistente dos 3 áudios do simulador FLL
 */
export function getFllAudioConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[fllAudioStorage] Falha ao ler fllAudioConfig.json:', err.message);
  }
  return { start: null, beep: null, end: null };
}

/**
 * Salva a configuração persistente dos áudios
 */
export function saveFllAudioConfig(newConfig) {
  try {
    const current = getFllAudioConfig();
    const updated = {
      ...current,
      ...newConfig
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('[fllAudioStorage] Erro ao gravar fllAudioConfig.json:', err);
    throw err;
  }
}

/**
 * Grava em cache local os bytes do arquivo para entrega ultrarrápida com 100% de integridade
 */
export function cacheAudioBytes(fileId, buffer) {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.warn('[fllAudioStorage] Falha ao gravar cache local de áudio:', err.message);
  }
}

/**
 * Obtém os bytes do áudio em cache local (se disponível)
 */
export function getCachedAudioBytes(fileId) {
  try {
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    console.warn('[fllAudioStorage] Falha ao recuperar cache de áudio:', err.message);
  }
  return null;
}

/**
 * Remove os bytes de um arquivo antigo não mais referenciado
 */
export function purgeCachedAudioBytes(fileId) {
  try {
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

/**
 * Calcula o hash SHA-256 de um buffer
 */
export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
