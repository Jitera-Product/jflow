import type { Config } from '../config/types.js';
import { FeatureError } from '../feature/FeatureError.js';
import type { LiveSettings } from '../settings/types.js';
import { mcpDocuments } from './mcpDocuments.js';
import type { Documents } from './types.js';

export function liveDocuments(settings: LiveSettings, base: Config['documents'], make = mcpDocuments): Documents {
  let key = '';
  let docs: Documents | undefined;

  const current = (): Documents => {
    const { docsUrl, docsToken } = settings.get();
    if (docsUrl === '' || docsToken === '') {
      throw new FeatureError(
        'not_configured',
        'jflow is not set up yet: the Jitera MCP URL or token is missing. An engineer sets them on /settings.',
      );
    }
    const want = JSON.stringify([docsUrl, docsToken]);
    if (!docs || want !== key) {
      docs = make({ kind: base.kind, url: docsUrl, token: docsToken, headers: {}, verbs: base.verbs });
      key = want;
    }
    return docs;
  };

  return {
    async read(path) { return current().read(path); },
    async list(path) { return current().list(path); },
    async create(path, content) { return current().create(path, content); },
    async update(path, content) { return current().update(path, content); },
  };
}
