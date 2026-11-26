import { fetchJson } from './fetchJson';
import type { CreatedIdea, IdeaInput } from './types';

export const createIdea = (body: IdeaInput) => fetchJson<CreatedIdea>('/api/ideas', { method: 'POST', body });
