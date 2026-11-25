import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { send } from '../send.js';

const PAGE_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'",
};
const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// path is /assets/<file> or an app route; every app route gets index.html, the app routes itself.
export async function staticFiles(webDir: string, res: ServerResponse, path: string) {
  if (!path.startsWith('/assets/')) return send(res, 200, await readFile(join(webDir, 'index.html'), 'utf8'), PAGE_HEADERS);
  const dir = resolve(webDir, 'assets');
  let file: string;
  try {
    file = resolve(dir, decodeURIComponent(path.slice('/assets/'.length)));
  } catch {
    return send(res, 404, 'not found'); // bad percent encoding
  }
  if (!file.startsWith(dir + sep)) return send(res, 404, 'not found');
  let body: Buffer;
  try {
    body = await readFile(file);
  } catch {
    return send(res, 404, 'not found'); // missing, a folder, or a bad name
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'public, max-age=31536000, immutable',
  }).end(body);
}
