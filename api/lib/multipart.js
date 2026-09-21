import Busboy from 'busboy';

/**
 * Faz o parse de requisições multipart/form-data em ambiente Node.js / Vercel Serverless
 * @param {import('http').IncomingMessage} req
 * @param {number} maxBytes - Limite máximo de bytes (padrão: 100MB)
 * @returns {Promise<{ fields: Record<string, string>, file: { buffer: Buffer, filename: string, mimeType: string, size: number } | null }>}
 */
export function parseMultipart(req, maxBytes = 100 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: maxBytes,
          files: 1
        }
      });
    } catch (err) {
      return reject(new Error('Falha ao inicializar parser multipart: ' + err.message));
    }

    const fields = {};
    let fileData = null;
    let fileLimitExceeded = false;

    busboy.on('field', (name, val) => {
      fields[name] = val;
    });

    busboy.on('file', (name, fileStream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      let totalSize = 0;

      fileStream.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > maxBytes) {
          fileLimitExceeded = true;
        }
        chunks.push(chunk);
      });

      fileStream.on('limit', () => {
        fileLimitExceeded = true;
      });

      fileStream.on('end', () => {
        if (!fileLimitExceeded) {
          fileData = {
            buffer: Buffer.concat(chunks),
            filename: filename || 'arquivo',
            mimeType: mimeType || 'application/octet-stream',
            size: totalSize
          };
        }
      });
    });

    busboy.on('finish', () => {
      if (fileLimitExceeded) {
        return reject(new Error(`O arquivo excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))}MB.`));
      }
      resolve({ fields, file: fileData });
    });

    busboy.on('error', (err) => {
      reject(err);
    });

    req.pipe(busboy);
  });
}
