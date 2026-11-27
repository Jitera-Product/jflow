export const TEAM_STORE = 'jflow-team';

export function savedTeam(): string {
  try {
    return localStorage.getItem(TEAM_STORE) ?? '';
  } catch {
    return '';
  }
}
