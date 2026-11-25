import { fetchJson } from './fetchJson';
import type { GateView } from './types';

export const getGate = (project: string, gate: string) =>
  fetchJson<GateView>(`/api/gate/${encodeURIComponent(project)}/${encodeURIComponent(gate)}`);
