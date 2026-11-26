export type TrackerProject = {
  id: string; identifier: string; name: string; url: string;
  teams: string[];
  lead: { name: string; email: string } | null;
  flowLabel: string | null;
};
export interface Tracker {
  getProject(ref: string): Promise<TrackerProject | null>;
  setFlowLabel(projectId: string, label: string): Promise<void>;
}

export type Label = { id: string; name: string };
export type ProjectData = {
  id: string; name: string; url: string;
  lead: { name: string; email: string } | null;
  teams: { nodes: Array<{ key: string }> };
  labels: { nodes: Label[] };
};

export type FlowProject = {
  uuid: string; slugId: string; identifier: string | null; name: string; url: string; team: string;
  lead: { name: string; email: string } | null;
  flowLabel: string; state: string; updatedAt: string;
};
