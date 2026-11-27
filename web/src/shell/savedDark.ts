export const THEME_STORE = 'jflow-theme';

export function savedDark(): boolean {
  try {
    return localStorage.getItem(THEME_STORE) === 'dark';
  } catch {
    return false;
  }
}
