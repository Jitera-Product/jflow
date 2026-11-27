import { gql } from './gql.js';
import { personName } from './personName.js';
import type { ProjectAbout, ProjectPost } from './types.js';

const QUERY = `query ProjectAbout($id: String!) {
  project(id: $id) {
    description content
    projectUpdates(first: 20) { nodes { body createdAt health user { name displayName } } }
    comments(first: 20) { nodes { body createdAt user { name displayName } } }
  }
}`;

type User = { name: string; displayName: string } | null;
type Post = { body: string; createdAt: string; health?: ProjectPost['health']; user: User };
type Data = {
  project: { description: string | null; content: string | null; projectUpdates: { nodes: Post[] }; comments: { nodes: Post[] } } | null;
};

const postsOf = (nodes: Post[]): ProjectPost[] => nodes
  .map((n) => ({ author: n.user ? personName(n.user) : 'Someone', createdAt: n.createdAt, body: n.body, health: n.health ?? null }))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 5); // Linear does not document the default order, so take 20 and keep the newest 5

export async function readProjectAbout(fetchFn: typeof fetch, apiKey: string, projectId: string): Promise<ProjectAbout> {
  const { project: p } = await gql<Data>(fetchFn, apiKey, QUERY, { id: projectId });
  if (!p) throw new Error('Linear: project not found');
  return {
    summary: p.description ?? '', content: p.content ?? '',
    updates: postsOf(p.projectUpdates.nodes), comments: postsOf(p.comments.nodes),
  };
}
