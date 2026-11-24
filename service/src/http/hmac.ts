import { createHmac } from 'node:crypto';

export const hmac = (secret: string | Buffer, ...parts: Array<string | Buffer>) => {
  const h = createHmac('sha256', secret);
  for (const p of parts) h.update(p);
  return h.digest('hex');
};
