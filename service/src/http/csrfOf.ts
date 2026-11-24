import { hmac } from './hmac.js';

export const csrfOf = (csrfKey: Buffer, gate: string, email: string) => hmac(csrfKey, `csrf|${gate}|${email}`);
