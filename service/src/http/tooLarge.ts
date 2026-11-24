import type { ServerResponse } from 'node:http';
import { send } from './send.js';

export const tooLarge = (res: ServerResponse) => send(res, 413, 'too large', { 'content-type': 'text/plain; charset=utf-8', connection: 'close' });
