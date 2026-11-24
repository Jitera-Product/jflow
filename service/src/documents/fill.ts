import type { McpVerb } from '../config/types.js';

export const fill = (verb: McpVerb, vars: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(verb.args).map(([k, v]) => [k, v.replace(/\{(path|content)\}/g, (_, n: string) => vars[n] ?? '')]),
  );
