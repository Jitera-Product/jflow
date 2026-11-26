import { FeatureError } from '../feature/FeatureError.js';
import { GateError } from '../gates/GateError.js';
import { Refusal } from './Refusal.js';

const ok = (value: unknown, _meta?: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  ...(_meta && { _meta }),
});
const fail = (text: string) => ({ isError: true, content: [{ type: 'text' as const, text }] });

export async function run<T>(body: () => Promise<T>, metaOf?: (value: T) => Record<string, unknown>) {
  try {
    const value = await body();
    return ok(value, metaOf?.(value));
  } catch (e) {
    if (e instanceof Refusal) return fail(e.message);
    if (e instanceof FeatureError || e instanceof GateError) return fail(`${e.code}: ${e.message}`);
    return fail(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
