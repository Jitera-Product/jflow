import { ApiError } from './ApiError';

export async function getAgentPrompt(): Promise<string> {
  const res = await fetch('/api/agent-prompt', { credentials: 'same-origin', headers: { accept: 'text/markdown' } });
  if (!res.ok) throw new ApiError(res.status, 'error');
  return res.text();
}
