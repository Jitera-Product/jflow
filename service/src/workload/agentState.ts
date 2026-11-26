import { DEFAULT_SETTINGS } from './defaultSettings.js';
import { hasLabel } from './hasLabel.js';
import { repoLabelCount } from './repoLabelCount.js';
import type { AgentState, Issue, Settings } from './types.js';

export function agentState(i: Issue, now: number, s: Settings = DEFAULT_SETTINGS): AgentState | null {
  if (hasLabel(i, 'agent:review')) return 'review';
  if (hasLabel(i, 'agent:working')) return now - Date.parse(i.updatedAt) > s.stuckHours * 3600e3 ? 'stuck' : 'working';
  if (hasLabel(i, 'agent:ready') && repoLabelCount(i) === 1) return 'ready';
  return null;
}
