import { gql } from './gql.js';

const QUERY = `query BoardUserByEmail($email: String!) {
  users(first: 5, filter: { email: { eqIgnoreCase: $email } }) { nodes { id name email active } }
}`;

export async function findUserByEmail(fetchFn: typeof fetch, apiKey: string, email: string): Promise<{ id: string; name: string } | null> {
  const data = await gql<{ users: { nodes: Array<{ id: string; name: string; email: string; active: boolean }> } }>(fetchFn, apiKey, QUERY, { email });
  const u = data.users.nodes.find((n) => n.active && n.email.toLowerCase() === email.toLowerCase());
  return u ? { id: u.id, name: u.name } : null;
}
