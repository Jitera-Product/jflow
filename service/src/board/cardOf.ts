import type { FlowProject } from '../linear/types.js';
import type { StageName } from '../status/stages.js';
import { pilotOf } from '../work/pilotOf.js';
import { openGateOf } from './openGateOf.js';
import { stageSince } from './stageSince.js';
import { STUCK_DAYS } from './stuckDays.js';
import type { Card, CardData, StatusFile } from './types.js';
import { waitsFor } from './waitsFor.js';
import { wholeDaysSince } from './wholeDaysSince.js';

const NONE: CardData = { checks: [], active: false };

export function cardOf(
  p: FlowProject, stage: StageName, file: StatusFile | null, id: string | null,
  engineers: string[], viewer: string, now: Date, data: CardData = NONE,
): Card {
  const openGate = openGateOf(file);
  const { checks } = data;
  const build = file?.build ?? [];
  const waits = waitsFor(openGate?.missing ?? null, stage, p.lead, engineers, build, checks.length > 0);
  const me = viewer.toLowerCase();
  const since = stageSince(file, p.updatedAt);
  const waitingForMe =
    (!!p.lead && p.lead.email.toLowerCase() === me && waits.some((w) => w.kind === 'owner')) ||
    (engineers.includes(me) && waits.some((w) => w.kind === 'engineer'));
  const failed = checks.filter((c) => !c.passed).length;
  const pilot = pilotOf(build);
  return {
    key: p.identifier ?? p.slugId, slugId: p.slugId, id,
    name: p.name, url: p.url, team: p.team, owner: p.lead,
    stage, days: wholeDaysSince(since, now), since, waitsFor: waits,
    stuck: pilot.mismatch || (!!openGate && now.getTime() - Date.parse(openGate.opened) > STUCK_DAYS * 86_400_000),
    waitingForMe, notStarted: !file, openGate,
    build, pilot: pilot.pilot, pilotMismatch: pilot.mismatch,
    qa: checks.length ? { passed: checks.length - failed, failed } : null,
    agentActive: data.active,
  };
}
