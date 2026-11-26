import { fetchJson } from './fetchJson';
import type { FeaturePanelView } from './types';

export const getFeaturePanel = (key: string) => fetchJson<FeaturePanelView>(`/api/board/feature/${encodeURIComponent(key)}`);
