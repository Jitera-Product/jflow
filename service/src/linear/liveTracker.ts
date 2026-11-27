import { FeatureError } from '../feature/FeatureError.js';
import type { LiveSettings } from '../settings/types.js';
import { linearTracker } from './linearTracker.js';
import type { Tracker } from './types.js';

export function liveTracker(settings: LiveSettings, make = linearTracker): Tracker {
  let key = '';
  let tracker: Tracker | undefined;

  const current = (): Tracker => {
    const { linearApiKey } = settings.get();
    if (linearApiKey === '') {
      throw new FeatureError(
        'not_configured',
        'jflow is not set up yet: the Linear API key is missing. An engineer sets it on /settings.',
      );
    }
    if (!tracker || linearApiKey !== key) {
      tracker = make(linearApiKey);
      key = linearApiKey;
    }
    return tracker;
  };

  return {
    async getProject(ref) { return current().getProject(ref); },
    async setFlowLabel(projectId, label) { return current().setFlowLabel(projectId, label); },
  };
}
