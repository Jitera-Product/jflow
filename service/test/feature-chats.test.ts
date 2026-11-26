import { describe, expect, it } from 'vitest';
import { chatUrlOf } from '../src/featureChats/chatUrlOf.js';
import { memoryFeatureChatStore } from '../src/featureChats/memoryFeatureChatStore.js';
import { chatIdOf } from '../src/mcp/chatIdOf.js';

const AGENT = 'https://studio.jitera.app/p/core/chat?a=agent-1';
const CHAT = '6f1c1d8e-0000-4000-8000-000000000001';
const FOLDER = 'documents/Flow/P-CORE-396 Name/';

describe('chatUrlOf', () => {
  it('opens the feature folder with the Flow agent; Studio takes a folder as its encoded tree path', () => {
    expect(chatUrlOf(AGENT, FOLDER, null)).toBe('https://studio.jitera.app/p/core/docs/%2FFlow%2FP-CORE-396%20Name?a=agent-1');
  });
  it('adds the stored chat', () => {
    expect(chatUrlOf(AGENT, FOLDER, CHAT)).toBe(`https://studio.jitera.app/p/core/docs/%2FFlow%2FP-CORE-396%20Name?a=agent-1&c=${CHAT}`);
  });
  it('without a folder starts a new chat with the agent, or opens the given chat', () => {
    expect(chatUrlOf(AGENT, null, null)).toBe('https://studio.jitera.app/p/core/chat?a=agent-1');
    expect(chatUrlOf(AGENT, null, CHAT)).toBe(`https://studio.jitera.app/p/core/chat?a=agent-1&c=${CHAT}`);
  });
  it('encodes the agent id and keeps other characters of the folder safe', () => {
    expect(chatUrlOf('https://s.example.com/p/x/chat?a=a%26b', 'documents/Flow/P-X-1 R&D #2?/', null))
      .toBe('https://s.example.com/p/x/docs/%2FFlow%2FP-X-1%20R%26D%20%232%3F?a=a%26b');
  });
  it.each(['', 'not a url', 'https://studio.jitera.app/chat?a=1', 'https://studio.jitera.app/p/core/chat'])('null for %j', (agent) => {
    expect(chatUrlOf(agent, FOLDER, CHAT)).toBeNull();
  });
});

describe('chatIdOf', () => {
  it('takes a uuid from jitera/chat', () => {
    expect(chatIdOf({ 'jitera/chat': { id: CHAT } })).toBe(CHAT);
    expect(chatIdOf({ 'jitera/chat': { id: CHAT.toUpperCase() } })).toBe(CHAT);
  });
  it.each([undefined, {}, { 'jitera/chat': null }, { 'jitera/chat': {} }, { 'jitera/chat': { id: 'abc' } }, { 'jitera/chat': { id: 5 } }, { 'jitera/chat': { id: `${CHAT}x` } }])(
    'null for %j', (meta) => {
      expect(chatIdOf(meta as Record<string, unknown> | undefined)).toBeNull();
    });
});

describe('memoryFeatureChatStore', () => {
  it('keeps the first chat of a feature', async () => {
    const s = memoryFeatureChatStore();
    expect(await s.get('P-ENG-12')).toBeNull();
    await s.remember('P-ENG-12', CHAT, new Date());
    await s.remember('P-ENG-12', 'other', new Date());
    expect(await s.get('P-ENG-12')).toBe(CHAT);
  });
});
