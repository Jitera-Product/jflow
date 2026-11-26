# jflow service

A small Node service for the jflow flow. It keeps feature documents in a Jitera documents folder, reads
issues from Linear, and asks people to approve each stage of a feature at a gate. It also serves an MCP
endpoint so an agent can work on the same documents.

## Environment variables

| Env var | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres 14 or newer. jflow runs its migrations at start. |
| `JFLOW_SETTINGS_KEY` | At least 32 characters. Encrypts the secrets in the database (docs token, Linear key, gate secret, chat tokens). |
| `JFLOW_ACCESS_TEAM_DOMAIN` | Team domain of the Cloudflare Access app that protects the web pages. |
| `JFLOW_ACCESS_AUD` | Audience (AUD) tag of that Access app. |
| `PORT` | Optional, default `8080`. |

Everything else is set on `/settings`: the Linear key and teams, the Jitera MCP URL, token and project, the
engineers, the jflow address (public URL) and the chat tokens. The first person to sign in becomes an engineer. Until
the jflow address is set, `open_gate` answers `not_configured`. The setup path and the upgrade from a config file are in
[docs/deploy.md](../docs/deploy.md).

## Run locally

```
cd service
npm ci
npm run build
export DATABASE_URL=... JFLOW_SETTINGS_KEY=... JFLOW_ACCESS_TEAM_DOMAIN=... JFLOW_ACCESS_AUD=...
npm start
curl localhost:8080/healthz
```

The service serves the built web app from `web/dist`, so build it once:
`cd web && npm ci && npm run build`. For UI work run `npm run dev` in `web/`. It serves on
localhost:5173 and proxies `/api` to the service on localhost:8080. Without Cloudflare Access in front,
`/api` calls need a valid Access JWT, so the dev server only shows data from a service set up for it.

Tests: `npm test`. The database tests need `TEST_DATABASE_URL` (a Postgres you can throw away).

## Container

Build from the repo root, because the image needs `templates/` and `web/`:

```
docker build -f service/Dockerfile -t jflow:dev .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL=... -e JFLOW_SETTINGS_KEY=... \
  -e JFLOW_ACCESS_TEAM_DOMAIN=... -e JFLOW_ACCESS_AUD=... \
  jflow:dev
```

For a real deployment (network, health check, Docker and Kubernetes examples) see [docs/deploy.md](../docs/deploy.md).

## Routes

| Route | Use |
| --- | --- |
| `GET /healthz` | Returns `ok`. |
| `GET /` | The board by stage. Redirects to `/settings` until jflow is set up. |
| `POST /mcp` | MCP endpoint for agents. Needs the bearer token of a live chat token. |
| `GET /settings`, `/workload`, `/f/<KEY>`, `/gate/<project>/<gate>` | The web app (`index.html` from the built web app). `/f/<KEY>` is the feature panel. |
| `GET /assets/<file>` | The web app's built files. |
| `GET`, `POST /api/settings` | Settings for the web app. Engineers only. |
| `GET /api/setup` | The checklist: Linear, Jitera, Chats. Engineers only. |
| `POST /api/setup/jitera` | Test a Jitera MCP URL and token before saving them. A blank token uses the stored one, and only for the stored URL. Engineers only. |
| `GET /api/agent-prompt` | The Flow agent prompt for the Jitera copy block. Engineers only. |
| `GET /api/linear/teams` | The teams the saved Linear key can see. Engineers only. |
| `GET /api/linear/labels` | The `flow:*` labels Linear still lacks. jflow creates them on each settings save and when it sets a stage. Engineers only. |
| `GET`, `POST /api/chats` | List chat tokens, create one. The token is shown once, in the answer to POST. POST answers 409 `no_public_url` until the jflow address is set. Engineers only. |
| `DELETE /api/chats/<id>` | Revoke a chat token. It stops working at once. Engineers only. |
| `GET /api/me` | The signed-in viewer. Open to every Access user. |
| `GET /api/board` | The board by stage. Query: `team`, `mine`, `older`, `refresh=1`. Cached 60 seconds per team set. Open to every Access user. |
| `GET /api/board/feature/<KEY>` | The feature panel, read fresh. Open to every Access user. |
| `GET /api/ideas/owners` | Owners to pick for a new idea. Open to every Access user. |
| `POST /api/ideas` | New idea: creates the Linear project with `flow:intent`. The folder is created when the feature is started in chat. Answers 400 `owner_required` without an owner. Open to every Access user. |
| `GET /api/workload`, `GET /api/workload/options` | The team workload board and its filters. Cached 10 minutes; `refresh=1` skips it. Open to every Access user. |
| `GET`, `POST /api/gate/<project>/<gate>` | A gate for the web app, and the decision on it. |
| `POST /webhooks/gate` | Signed callback from a chat host. See [docs/gate-callback.md](../docs/gate-callback.md). |

Every `/api/*` call needs a valid Cloudflare Access JWT. Calls that change data also check the request origin.
