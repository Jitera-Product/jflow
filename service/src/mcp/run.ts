import { FeatureError } from '../feature/FeatureError.js';
import { GateError } from '../gates/GateError.js';
import { Refusal } from './Refusal.js';

const ok = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] });
const fail = (text: string) => ({ isError: true, content: [{ type: 'text' as const, text }] });

export async function run(body: () => Promise<unknown>) {
  try {
    return ok(await body());
  } catch (e) {
    if (e instanceof Refusal) return fail(e.message);
    if (e instanceof FeatureError || e instanceof GateError) return fail(`${e.code}: ${e.message}`);
    return fail(`error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
