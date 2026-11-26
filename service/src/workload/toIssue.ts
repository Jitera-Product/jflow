import { toPerson } from './toPerson.js';
import type { Issue, LinearIssue } from './types.js';

export const toIssue = (i: LinearIssue): Issue => ({
  id: i.identifier,
  title: i.title,
  url: i.url,
  status: i.state?.name ?? '',
  assignee: i.assignee ? toPerson(i.assignee) : null,
  project: i.project,
  labels: i.labels.nodes.map((l) => l.name),
  updatedAt: i.updatedAt,
  completedAt: i.completedAt,
});
