import { toPerson } from './toPerson.js';
import type { LinearProject, Person, Project } from './types.js';

export const toProject = (p: LinearProject): Project => {
  const people = new Map<string, Person & { role: 'lead' | 'member' }>();
  for (const m of p.members.nodes) people.set(m.id, { ...toPerson(m), role: 'member' });
  if (p.lead) people.set(p.lead.id, { ...toPerson(p.lead), role: 'lead' });
  return { id: p.id, name: p.name, url: p.url, status: p.status?.name ?? '', statusType: p.status?.type ?? '', people: [...people.values()] };
};
