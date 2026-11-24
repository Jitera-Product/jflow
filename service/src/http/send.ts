import type { ServerResponse } from 'node:http';

export const send = (res: ServerResponse, status: number, body: string, headers: Record<string, string> = { 'content-type': 'text/plain; charset=utf-8' }) => {
  res.writeHead(status, headers).end(body);
};
