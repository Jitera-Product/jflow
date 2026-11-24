import { esc } from './esc.js';

const CSS = `body{font:16px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#111}
h1{font-size:1.4rem}dt{font-weight:600;margin-top:.6rem}dd{margin:0}
.reason{padding:.6rem .8rem;background:#f4f4f5;border-radius:6px}.error{background:#fee2e2}
form{display:flex;gap:.6rem;margin-top:1.2rem}button{font:inherit;padding:.5rem 1rem;border-radius:6px;border:1px solid #111;cursor:pointer}
button[value=approve]{background:#111;color:#fff}`;

export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
