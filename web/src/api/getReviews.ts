import { fetchJson } from './fetchJson';
import type { Reviews } from './types';

export const getReviews = () => fetchJson<Reviews>('/api/waiting/reviews');
