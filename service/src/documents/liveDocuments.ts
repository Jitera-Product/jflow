import type { Config } from '../config/types.js';
import { FeatureError } from '../feature/FeatureError.js';
import type { LiveSettings } from '../settings/types.js';
import { mcpDocuments } from './mcpDocuments.js';
import type { Documents } from './types.js';

export function liveDocuments(settings: LiveSettings, base: Config['documents'], publicUrl: string, make = mcpDocuments): Documents {
  let key = '';
  let docs: Documents | undefined;

  const current = (): Documents => {
    const { docsUrl, jiteraProject, docsToken } = settings.get();
    if (docsUrl === '' || jiteraProject === '' || docsToken === '') {
      throw new FeatureError(
        'not_configured',
        `jflow is not set up yet: the Jitera docs URL, project or token is missing. An engineer sets them at ${publicUrl}/settings.`,
      );
    }
    const want = JSON.stringify([docsUrl, jiteraProject, docsToken]);
    if (!docs || want !== key) {
      docs = make({ kind: base.kind, url: docsUrl, token: docsToken, headers: { 'x-jitera-project': jiteraProject }, verbs: base.verbs });
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
