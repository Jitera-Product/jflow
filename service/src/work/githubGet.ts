export async function githubGet<T>(fetchFn: typeof fetch, token: string, path: string): Promise<T> {
  const res = await fetchFn(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json', authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28', 'user-agent': 'jflow',
    },
  });
  if (!res.ok) throw new Error(`GitHub: HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}
