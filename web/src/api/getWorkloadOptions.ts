import type { Options } from '@/workload/types';
import { fetchJson } from './fetchJson';

export const getWorkloadOptions = () => fetchJson<Options>('/api/workload/options');
