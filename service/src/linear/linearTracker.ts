import { gql } from './gql.js';
import type { Label, ProjectData, Tracker } from './types.js';

const IDENTIFIER = /^P-[A-Z0-9]+-\d+$/i;
const isFlow = (name: string) => name.startsWith('flow:');

const PROJECT_QUERY = `query FlowProject($id: String!) {
  project(id: $id) {
    id name url
    lead { name email }
    teams(first: 50) { nodes { key } }
    labels(first: 250) { nodes { id name } }
  }
}`;
const LABEL_IDS_QUERY = `query ProjectLabelIds($id: String!) {
  project(id: $id) { labels(first: 250) { nodes { id name } } }
}`;
const LABEL_LOOKUP_QUERY = `query FlowLabel($name: String!) {
  projectLabels(first: 1, filter: { name: { eq: $name } }) { nodes { id } }
}`;
const LABEL_CREATE_MUTATION = `mutation CreateFlowLabel($name: String!) {
  projectLabelCreate(input: { name: $name }) { success projectLabel { id } }
}`;
const UPDATE_MUTATION = `mutation SetProjectLabels($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input) { success }
}`;

export function linearTracker(apiKey: string, fetchFn: typeof fetch = fetch): Tracker {
  const notFound = (e: unknown) => e instanceof Error && /not found/i.test(e.message);

  return {
    async getProject(ref) {
      if (!IDENTIFIER.test(ref)) return null;
      let p: ProjectData | null;
      try {
        p = (await gql<{ project: ProjectData | null }>(fetchFn, apiKey, PROJECT_QUERY, { id: ref })).project;
      } catch (e) {
        if (notFound(e)) return null;
        throw e;
      }
      if (!p) return null;
      const flow = p.labels.nodes.map((l) => l.name).filter(isFlow).sort()[0] ?? null;
      return {
        id: p.id, identifier: ref.toUpperCase(), name: p.name, url: p.url,
        teams: p.teams.nodes.map((t) => t.key),
        lead: p.lead ? { name: p.lead.name, email: p.lead.email.toLowerCase() } : null,
        flowLabel: flow,
      };
    },

    async setFlowLabel(projectId, label) {
      const found = await gql<{ projectLabels: { nodes: Array<{ id: string }> } }>(fetchFn, apiKey, LABEL_LOOKUP_QUERY, { name: label });
      const target = found.projectLabels.nodes[0]
        ?? (await gql<{ projectLabelCreate: { projectLabel: { id: string } } }>(fetchFn, apiKey, LABEL_CREATE_MUTATION, { name: label })).projectLabelCreate.projectLabel;
      const cur = await gql<{ project: { labels: { nodes: Label[] } } }>(fetchFn, apiKey, LABEL_IDS_QUERY, { id: projectId });
      const keep = cur.project.labels.nodes.filter((l) => !isFlow(l.name)).map((l) => l.id);
      await gql(fetchFn, apiKey, UPDATE_MUTATION, { id: projectId, input: { labelIds: [...keep, target.id] } });
    },
  };
}
