export const PAGE = 250;
export const MAX_PAGES = 20;

const USER = 'id name displayName email';

export const PROJECTS_QUERY = `query BoardProjects($filter: ProjectFilter, $after: String) {
  projects(first: 50, after: $after, filter: $filter) {
    nodes { id name url status { name type } lead { ${USER} } members(first: 100) { nodes { ${USER} } } }
      pageInfo { hasNextPage endCursor }
  }
}`;

export const OPTIONS_QUERY = `query BoardOptions {
  teams(first: 250) { nodes { id name key } }
  projectStatuses(first: 50) { nodes { id name type position } }
}`;

export const ISSUES_QUERY = `query BoardIssues($filter: IssueFilter, $after: String) {
  issues(first: ${PAGE}, after: $after, filter: $filter) {
    nodes {
      identifier title url updatedAt completedAt
      state { name }
      assignee { ${USER} }
      project { id name }
      labels(first: 50) { nodes { name } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
