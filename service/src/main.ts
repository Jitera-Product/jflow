import { loadConfig } from './config/loadConfig.js';
import { mcpDocuments } from './documents/mcpDocuments.js';
import { createHttpServer } from './http/createHttpServer.js';
import { linearTracker } from './linear/linearTracker.js';

const config = loadConfig(process.env);
const server = createHttpServer({
  config, docs: mcpDocuments(config.documents), tracker: linearTracker(config.linearApiKey), now: () => new Date(),
});
server.listen(config.port, () => console.log(`jflow listening on port ${config.port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
