import { z } from 'zod';

export const UI_FILE = '2-ui/README.md';
export const project = z.string().describe('Linear project ID, like P-CORE-396');
