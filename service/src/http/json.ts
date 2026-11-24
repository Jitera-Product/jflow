import type { ServerResponse } from 'node:http';
import { send } from './send.js';

export const json = (res: ServerResponse, status: number, value: unknown) => send(res, status, JSON.stringify(value), { 'content-type': 'application/json' });
