import { gql } from '../linear/gql.js';
import { allPages } from './allPages.js';
import { projectFilter } from './projectFilter.js';
import { ISSUES_QUERY, PROJECTS_QUERY } from './queries.js';
import { toIssue } from './toIssue.js';
import { toProject } from './toProject.js';
import type { BoardInput, FetchOptions, LinearIssue, LinearProject, Page } from './types.js';

export async function fetchBoardInput(fetchFn: typeof fetch, o: FetchOptions): Promise<BoardInput> {
  const issues = (filter: Record<string, unknown>) =>
    allPages<LinearIssue>(async (after) => (await gql<{ issues: Page<LinearIssue> }>(fetchFn, o.apiKey, ISSUES_QUERY, { filter, after })).issues);

  const [projects, started, todo, completed] = await Promise.all([
    allPages<LinearProject>(async (after) => (await gql<{ projects: Page<LinearProject> }>(fetchFn, o.apiKey, PROJECTS_QUERY, { filter: projectFilter(o), after })).projects),
    issues({ state: { type: { eq: 'started' } }, updatedAt: { gt: o.window } }),
    issues({ state: { type: { eq: 'unstarted' } } }),
    issues({ completedAt: { gt: `-P${o.paceDays}D` } }),
  ]);

  return {
    projects: projects.nodes.map(toProject),
    started: started.nodes.map(toIssue),
    todo: todo.nodes.map(toIssue),
    completed: completed.nodes.map(toIssue),
    cut: projects.cut || started.cut || todo.cut || completed.cut,
  };
}
