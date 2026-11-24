import type { IncomingMessage } from 'node:http';

const BODY_LIMIT = 1024 * 1024;

export function readBody(req: IncomingMessage): Promise<Buffer | null> {
  if (Number(req.headers['content-length'] ?? 0) > BODY_LIMIT) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        req.removeAllListeners('data');
        req.pause();
        resolve(null);
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
