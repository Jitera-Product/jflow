# jflow service

A small Node service for the jflow flow. It keeps feature documents in a Jitera documents folder, reads
issues from Linear, and asks people to approve each stage of a feature at a gate. It also serves an MCP
endpoint so an agent can work on the same documents.

## Config file

Set `JFLOW_CONFIG` to the path of a JSON file. See `config.example.json` for a full example.

| Field | Meaning |
| --- | --- |
| `publicUrl` | Public origin of the service, for example `https://flow.example.com`. No path, query or hash. |
| `flowFolder` | Folder in the documents store that holds the flow, for example `documents/Flow`. |
| `templatesDir` | Optional. Folder with the document templates. Normally needs no setting: the default is the `templates/` folder at the repo root, and the container image keeps that layout. |
| `webDir` | Optional. Folder with the built web app. The default is `web/dist` at the repo root. |
| `engineers` | Emails of the first engineers, at least one. Read only when the database has no settings yet; after that the list on `/settings` wins. |
| `access` | `teamDomain` and `aud` of the Cloudflare Access app that protects the web pages. Optional here when `JFLOW_ACCESS_TEAM_DOMAIN` and `JFLOW_ACCESS_AUD` are set. |
| `documents` | The documents MCP connection: `kind` and the `verbs` (`read`, `list`, `create`, `update`) as a tool name plus args. Args may use `{path}` and `{content}`. The URL, project and token are set on `/settings`. |
| `mcpClients` | Clients of the `/mcp` route. Each has a `name` and a `tokenEnv`. |

## Environment variables

- `JFLOW_CONFIG`: path to the config file.
- `JFLOW_GATE_SECRET`: at least 32 characters.
- `JFLOW_CALLBACK_SECRET`: at least 32 characters.
- `DATABASE_URL`: Postgres 14 or newer. jflow runs its migrations at start.
- `JFLOW_SETTINGS_KEY`: at least 32 characters. Encrypts the docs token and the Linear key in the database. If you change it, type the two keys again on `/settings`.
- One variable per entry in `mcpClients`, named by its `tokenEnv` (the example uses `MCP_TOKEN`). At least 32 characters, and each one different.
- `JFLOW_ACCESS_AUD`, `JFLOW_ACCESS_TEAM_DOMAIN`: the Cloudflare Access `aud` and team domain. When set and not empty, they win over `access.aud` and `access.teamDomain` in the config file. One of the two places must give each value.
- `PORT`: optional, default `8080`.

The docs URL, project, docs token, Linear API key, teams and engineers live in the database. On the first run
open `<publicUrl>/settings` as one of the `engineers` in the file and set them. Until then the MCP tools
answer `not_configured`.

## Run locally

```
cd service
npm ci
npm run build
cp config.example.json config.local.json   # then edit it
export JFLOW_CONFIG=$PWD/config.local.json
export DATABASE_URL=... JFLOW_SETTINGS_KEY=... JFLOW_GATE_SECRET=... JFLOW_CALLBACK_SECRET=... MCP_TOKEN=...
npm start
curl localhost:8080/healthz
```

The service serves the built web app from `web/dist` (override with `webDir`), so build it once:
`cd web && npm ci && npm run build`. For UI work run `npm run dev` in `web/`. It serves on
localhost:5173 and proxies `/api` to the service on localhost:8080. Without Cloudflare Access in front,
`/api` calls need a valid Access JWT, so the dev server only shows data from a service set up for it.

Tests: `npm test`. The database tests need `TEST_DATABASE_URL` (a Postgres you can throw away).

## Container

Build from the repo root, because the image needs `templates/` and `web/`:

```
docker build -f service/Dockerfile -t jflow:dev .
docker run --rm -p 8080:8080 \
  -e JFLOW_CONFIG=/config.json -v $PWD/service/config.local.json:/config.json \
  -e DATABASE_URL=... -e JFLOW_SETTINGS_KEY=... -e JFLOW_GATE_SECRET=... -e JFLOW_CALLBACK_SECRET=... \
  -e MCP_TOKEN=... \
  jflow:dev
```

For a real deployment (network, health check, Docker and Kubernetes examples) see [docs/deploy.md](../docs/deploy.md).

## Routes

| Route | Use |
| --- | --- |
| `GET /healthz` | Returns `ok`. |
| `POST /mcp` | MCP endpoint for agents. Needs a bearer token from `mcpClients`. |
| `GET /settings`, `GET /gate/<project>/<gate>` | The web app (`index.html` from `webDir`). |
| `GET /assets/<file>` | The web app's built files. |
| `GET`, `POST /api/settings` | Settings for the web app. Engineers only. |
| `GET`, `POST /api/gate/<project>/<gate>` | A gate for the web app, and the decision on it. |
| `POST /webhooks/gate` | Signed callback from a chat host. See [docs/gate-callback.md](../docs/gate-callback.md). |
