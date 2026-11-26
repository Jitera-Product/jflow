import { fetchJson } from './fetchJson';
import type { Decision, GateView } from './types';

export const decideGate = (project: string, gate: string, body: Decision) =>
  fetchJson<GateView>(`/api/gate/${encodeURIComponent(project)}/${encodeURIComponent(gate)}`, { method: 'POST', body });
