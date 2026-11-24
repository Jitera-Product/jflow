import { randomBytes } from 'node:crypto';

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
export function newGateId(): string {
  return 'g' + [...randomBytes(10)].map((b) => B32[b & 31]).join('');
}
