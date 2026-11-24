const ENDPOINT = 'https://api.linear.app/graphql';

export async function gql<T>(fetchFn: typeof fetch, apiKey: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok || body.errors?.length || !body.data) {
    const msg = body.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`Linear: ${msg}`);
  }
  return body.data;
}
