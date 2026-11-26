import type { DocumentsConnection } from './types.js';

export const DEFAULT_VERBS: DocumentsConnection['verbs'] = {
  read: { tool: 'resource_read', args: { path: '{path}', line_number: '100000' } },
  list: { tool: 'resource_read', args: { path: '{path}' } },
  create: { tool: 'resource_write', args: { path: '{path}', content: '{content}', operation: 'create' } },
  update: { tool: 'resource_write', args: { path: '{path}', content: '{content}', operation: 'update' } },
};
