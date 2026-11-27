import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { requestOrigin } from '../src/http/requestOrigin.js';

const req = (headers: Record<string, string>, encrypted = false) => ({ headers, socket: { encrypted } }) as unknown as IncomingMessage;

describe('requestOrigin', () => {
  it('takes the scheme from the socket and the Host header', () => {
    expect(requestOrigin(req({ host: 'localhost:8080' }))).toBe('http://localhost:8080');
    expect(requestOrigin(req({ host: 'Flow.Example.com:443' }, true))).toBe('https://flow.example.com');
  });
  it('prefers the first forwarded proto and host', () => {
    const r = req({ host: 'jflow.svc:8080', 'x-forwarded-proto': 'https, http', 'x-forwarded-host': 'flow.example.com, jflow.svc' });
    expect(requestOrigin(r)).toBe('https://flow.example.com');
    expect(requestOrigin(req({ host: 'flow.example.com', 'x-forwarded-proto': 'https' }))).toBe('https://flow.example.com');
  });
  it('is null for a missing or bad host or scheme', () => {
    expect(requestOrigin(req({}))).toBeNull();
    for (const host of ['evil.com/path', 'a@evil.com', 'evil.com?x', 'evil.com#x', 'x:99999', '']) {
      expect(requestOrigin(req({ host }))).toBeNull();
    }
    expect(requestOrigin(req({ host: 'flow.example.com', 'x-forwarded-proto': 'javascript' }))).toBeNull();
  });
});
