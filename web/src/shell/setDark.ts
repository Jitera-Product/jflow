import { THEME_STORE } from './savedDark';

export function setDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(THEME_STORE, dark ? 'dark' : 'light');
  } catch {
    // The theme still changes for this page.
  }
}
