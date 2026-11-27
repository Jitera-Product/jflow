import { githubGet } from './githubGet.js';

export async function checkGithub(fetchFn: typeof fetch, token: string): Promise<void> {
  await githubGet(fetchFn, token, '/user');
}
