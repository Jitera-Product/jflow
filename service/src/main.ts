import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from './config/loadConfig.js';
import { migrate } from './db/migrate.js';
import { liveDocuments } from './documents/liveDocuments.js';
import { createHttpServer } from './http/createHttpServer.js';
import { liveTracker } from './linear/liveTracker.js';
import { openSettings } from './settings/openSettings.js';
import { pgSettingsStore } from './settings/pgSettingsStore.js';

const config = loadConfig(process.env);
const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 4, connectionTimeoutMillis: 10_000 });
pool.on('error', (e) => console.error(`jflow: db: ${e.message}`));
await migrate(pool, fileURLToPath(new URL('../migrations', import.meta.url)));
const settings = await openSettings(pgSettingsStore(pool), config.settingsKey, config.seedEngineers, () => new Date());
const server = createHttpServer({
  config,
  settings,
  docs: liveDocuments(settings, config.documents, config.publicUrl),
  tracker: liveTracker(settings, config.publicUrl),
  now: () => new Date(),
});
server.listen(config.port, () => console.log(`jflow listening on port ${config.port}`));
process.on('SIGTERM', () => server.close(() => pool.end().finally(() => process.exit(0))));
