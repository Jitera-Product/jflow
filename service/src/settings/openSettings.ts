import { randomBytes } from 'node:crypto';
import { checkSettings } from './checkSettings.js';
import { openSecret } from './openSecret.js';
import { sealSecret } from './sealSecret.js';
import { SettingsError } from './SettingsError.js';
import type { LegacySettings, LiveSettings, Settings, SettingsStore, StoredRow, StoredValue } from './types.js';

const EMPTY: StoredValue = {
  docsUrl: '', docsToken: '', linearApiKey: '', githubToken: '', teams: [], engineers: [],
  tdrFolder: '', flowAgentUrl: '', gateSecret: '', legacyChatsImported: false,
};

export async function openSettings(
  store: SettingsStore,
  key: string,
  legacy: LegacySettings,
  now: () => Date,
): Promise<LiveSettings> {
  const loaded = await store.load();
  // A row from an older jflow lacks the newer fields; legacy values fill only what is still empty.
  const value: StoredValue = { ...EMPTY, ...loaded?.value };
  let changed = !loaded || Object.keys(EMPTY).some((k) => !(k in loaded.value));
  const fromFile: string[] = [];
  let gateSecretImported = false;
  if (value.engineers.length === 0 && legacy.engineers?.length) {
    value.engineers = legacy.engineers.map((e) => e.toLowerCase());
    fromFile.push('engineers');
    changed = true;
  }
  if (value.gateSecret === '') {
    value.gateSecret = sealSecret(key, legacy.gateSecret || randomBytes(32).toString('base64url'));
    gateSecretImported = Boolean(legacy.gateSecret);
    changed = true;
  }
  // Only write when something changed: a blind write at start could undo a save made meanwhile by another replica.
  if (changed) await store.save(value, loaded?.updatedBy ?? 'jflow', loaded?.updatedAt ?? now());
  if (fromFile.length) console.warn(`jflow: imported ${fromFile.join(' and ')} from JFLOW_CONFIG`);
  if (gateSecretImported) console.warn('jflow: imported the gate secret from JFLOW_GATE_SECRET; you can remove JFLOW_GATE_SECRET now');
  let row = (await store.load()) as StoredRow;

  const read = (r: StoredRow, field: 'docsToken' | 'linearApiKey' | 'githubToken'): string => {
    const plain = openSecret(key, r.value[field]);
    if (plain === null) {
      console.error(`jflow: settings: cannot decrypt ${field}, set it again on /settings`);
      return '';
    }
    return plain;
  };
  const toSettings = (r: StoredRow): Settings => {
    const gateSecret = openSecret(key, r.value.gateSecret);
    // Never replace it: a new secret would make every open gate look changed by hand.
    if (!gateSecret) throw new Error('cannot open the stored gate secret: JFLOW_SETTINGS_KEY changed? Restore the old key.');
    return {
      docsUrl: r.value.docsUrl,
      docsToken: read(r, 'docsToken'),
      linearApiKey: read(r, 'linearApiKey'),
      githubToken: read(r, 'githubToken'),
      teams: r.value.teams,
      engineers: r.value.engineers,
      tdrFolder: r.value.tdrFolder,
      flowAgentUrl: r.value.flowAgentUrl,
      gateSecret,
      legacyChatsImported: r.value.legacyChatsImported,
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt.toISOString(),
    };
  };

  let current = toSettings(row);

  return {
    get: () => current,
    async save(input, by) {
      const engineers = input.engineers.map((e) => e.toLowerCase());
      const problems = checkSettings({ ...input, engineers }, by.toLowerCase());
      if (problems.length > 0) throw new SettingsError(problems);
      const at = now();
      const stored = row.value;
      const value: StoredValue = {
        docsUrl: input.docsUrl,
        docsToken: input.docsToken ? sealSecret(key, input.docsToken) : stored.docsToken,
        linearApiKey: input.linearApiKey ? sealSecret(key, input.linearApiKey) : stored.linearApiKey,
        githubToken: input.githubToken ? sealSecret(key, input.githubToken) : stored.githubToken,
        teams: input.teams,
        engineers,
        tdrFolder: input.tdrFolder ?? stored.tdrFolder,
        flowAgentUrl: input.flowAgentUrl ?? stored.flowAgentUrl,
        gateSecret: stored.gateSecret,
        legacyChatsImported: stored.legacyChatsImported,
      };
      await store.save(value, by, at);
      row = { value, updatedBy: by, updatedAt: at };
      current = toSettings(row);
      return current;
    },
    async claimFirstEngineer(email) {
      const won = await store.claimFirstEngineer(email.toLowerCase(), now());
      row = (await store.load()) as StoredRow;
      current = toSettings(row);
      return won;
    },
    async markLegacyChatsImported() {
      const value = { ...row.value, legacyChatsImported: true };
      await store.save(value, row.updatedBy, row.updatedAt);
      row = { ...row, value };
      current = toSettings(row);
    },
  };
}
