import { checkSettings } from './checkSettings.js';
import { openSecret } from './openSecret.js';
import { sealSecret } from './sealSecret.js';
import { SettingsError } from './SettingsError.js';
import type { LiveSettings, Settings, SettingsStore, StoredRow } from './types.js';

export async function openSettings(
  store: SettingsStore,
  key: string,
  seedEngineers: string[],
  now: () => Date,
): Promise<LiveSettings> {
  let row = await store.load();
  if (!row) {
    const value = {
      docsUrl: '',
      jiteraProject: '',
      docsToken: '',
      linearApiKey: '',
      teams: [],
      engineers: seedEngineers.map((e) => e.toLowerCase()),
    };
    await store.save(value, 'config', now());
    row = (await store.load()) as StoredRow;
  }

  const read = (r: StoredRow, field: 'docsToken' | 'linearApiKey'): string => {
    const plain = openSecret(key, r.value[field]);
    if (plain === null) {
      console.error(`jflow: settings: cannot decrypt ${field}, set it again on /settings`);
      return '';
    }
    return plain;
  };
  const toSettings = (r: StoredRow): Settings => ({
    docsUrl: r.value.docsUrl,
    jiteraProject: r.value.jiteraProject,
    docsToken: read(r, 'docsToken'),
    linearApiKey: read(r, 'linearApiKey'),
    teams: r.value.teams,
    engineers: r.value.engineers,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  });

  let current = toSettings(row);
  let stored = row.value;

  return {
    get: () => current,
    async save(input, by) {
      const engineers = input.engineers.map((e) => e.toLowerCase());
      const problems = checkSettings({ ...input, engineers }, by.toLowerCase());
      if (problems.length > 0) throw new SettingsError(problems);
      const at = now();
      const value = {
        docsUrl: input.docsUrl,
        jiteraProject: input.jiteraProject,
        docsToken: input.docsToken ? sealSecret(key, input.docsToken) : stored.docsToken,
        linearApiKey: input.linearApiKey ? sealSecret(key, input.linearApiKey) : stored.linearApiKey,
        teams: input.teams,
        engineers,
      };
      await store.save(value, by, at);
      stored = value;
      current = toSettings({ value, updatedBy: by, updatedAt: at });
      return current;
    },
  };
}
