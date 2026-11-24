import { esc } from './esc.js';
import { page } from './page.js';

export const messagePage = (title: string, line: string) => page(title, `<h1>${esc(title)}</h1><p class="reason">${esc(line)}</p>`);
