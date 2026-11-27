import { TEAM_STORE } from './savedTeam';

export function saveTeam(team: string): void {
  try {
    localStorage.setItem(TEAM_STORE, team);
  } catch {
    // The team still applies on this page.
  }
}
