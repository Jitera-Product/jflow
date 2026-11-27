import type { Feature } from '../feature/types.js';
import type { Role } from './types.js';

// The confirm page sits behind Cloudflare Access and is linked only from the feature's chat,
// so anyone who reaches it may approve as engineer; owner is the Linear lead.
export function rolesOf(f: Feature, email: string): Role[] {
  const isLead = !!f.lead && f.lead.email.toLowerCase() === email.toLowerCase();
  return isLead ? ['owner', 'engineer'] : ['engineer'];
}
