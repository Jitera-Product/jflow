import type { AgentState } from './types.js';

export const agentHeld = (st: AgentState | null): boolean => st === 'working' || st === 'review';
