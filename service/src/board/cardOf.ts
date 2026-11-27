import type { FlowProject } from '../linear/types.js';
import type { StageName } from '../status/stages.js';
import { openGateOf } from './openGateOf.js';
import { stageSince } from './stageSince.js';
import { STUCK_DAYS } from './stuckDays.js';
import type { Card, StatusFile } from './types.js';
import { waitsFor } from './waitsFor.js';
import { wholeDaysSince } from './wholeDaysSince.js';

export function cardOf(
  p: FlowProject, stage: StageName, file: StatusFile | null, id: string | null,
  engineers: string[], viewer: string, now: Date,
): Card {
  const openGate = openGateOf(file);
  const waits = waitsFor(openGate?.missing ?? null, stage, p.lead, engineers);
  const me = viewer.toLowerCase();
  const behind = !!file?.stage && file.stage !== stage;
  const since = stageSince(behind ? null : file, p.updatedAt);
  const waitingForMe =
    (!!p.lead && p.lead.email.toLowerCase() === me && waits.some((w) => w.kind === 'owner')) ||
    (engineers.includes(me) && waits.some((w) => w.kind === 'engineer'));
  return {
    key: p.identifier ?? p.slugId, slugId: p.slugId, id,
    name: p.name, url: p.url, team: p.team, owner: p.lead,
    stage, days: wholeDaysSince(since, now), since, waitsFor: waits,
    stuck: !!openGate && now.getTime() - Date.parse(openGate.opened) > STUCK_DAYS * 86_400_000,
    waitingForMe, notStarted: !file, behind, openGate,
  };
}
