# Deploy jflow

jflow is one Node service. This page shows how to run it on plain Docker or on one Kubernetes
Deployment. No ArgoCD, Helm or Terraform is needed.

## Image and run

Build from the repo root, because the image needs `templates/`, `web/` and `service/agent/`:

```
docker build -f service/Dockerfile -t jflow:1 .
```

Or run it without Docker: `cd web && npm ci && npm run build`, then `cd ../service && npm ci && npm run build && node dist/main.js`.
The built service needs the `templates/` and `web/dist` folders at the repo root (the repo layout: `service/dist`
sits two levels below it).

The service listens on `PORT` (default `8080`).

## The setup path

1. Run the image with Postgres and the env values below.
2. Put Cloudflare Access in front of the site, with sign-in through any identity provider (Google, for example).
3. Open the site. The first person to sign in becomes an engineer.
4. Finish the checklist on `/settings`.

## Env values

| Env var | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres 14 or newer, for example `postgres://jflow:pass@db.example.com:5432/jflow`. jflow runs its migrations at start. |
| `JFLOW_SETTINGS_KEY` | At least 32 characters. Encrypts every secret in the database: the docs token, the Linear key, the gate secret and the chat tokens. Keep it. If you lose or change it, jflow refuses to start, because it cannot open the stored gate secret. |
| `JFLOW_ACCESS_TEAM_DOMAIN` | The team domain of your Cloudflare Access, for example `yourteam.cloudflareaccess.com`. |
| `JFLOW_ACCESS_AUD` | The audience (AUD) tag of the Access application that protects the site. |
| `PORT` | Optional. Default `8080`. |

Nothing else is required. jflow refuses to start when a value is missing or too short, and the error names
the variable. Env values are read at start, so restart jflow after you change them.

The two Access values are env vars and not settings because they guard `/settings` itself. jflow keeps no
other setting in env. The folder for flow documents, the templates and the document tool calls have built-in defaults.
Everything else is set on `/settings` while jflow runs.

jflow creates its gate secret on the first start and keeps it sealed in the database.

## First visit

Open `https://<your host>/settings`. Cloudflare Access asks you to sign in. When no engineer is stored yet, the
first email that signs in becomes the first engineer. Two people at the same moment cannot both claim it.
A second person who signs in later gets `not_allowed` until an engineer adds them.

The first save on `/settings` fills in the jflow address (public URL) from the address in your browser. You
can edit it in People. It is a bare origin: scheme, host and an optional port, with no path. Gate links and
the chat copy blocks are built from it. jflow never takes it from the `Host` header of a request.

The checklist on top shows what is left. Each item links to its section:

1. **Linear.** Paste an API key and pick the teams. On save, jflow creates the `flow:*` project labels that are missing.
2. **Jitera.** Set the MCP URL and a token tied to the project that holds the flow documents (for example the key of
   an agent in that project). "Test" lists the flow folder.
   The TDR folder is here too.
3. **People.** Check the jflow address. List the engineers, one email per line.
4. **Chats.** "New token" asks for a name and shows the token once, with copy blocks for Jitera, Claude Code
   and any other MCP chat. In Jitera, add jflow as a custom connector: the MCP URL, Client ID empty, and the
   token as Client Secret (a secret without a client ID is a bearer token). A chat needs no redeploy. "Revoke" stops a token at once, for MCP calls and for
   [gate callbacks](gate-callback.md).

The Chats item is done when any token was used once. Until the jflow address is set, only `open_gate`
answers `not_configured`, and the chat token is shown without the copy blocks.

## Network

- Put TLS in front with any reverse proxy. The jflow address on `/settings` is the public origin, for example
  `https://flow.example.com`. Gate links are built from it.
- `/`, `/f/*`, `/workload`, `/gate/*`, `/settings` and `/api/*` must sit behind Cloudflare Access. The pages are a static app that
  jflow serves itself, and the app calls `/api/*`. Access sends the `Cf-Access-Jwt-Assertion` header, and
  jflow verifies that JWT itself against `JFLOW_ACCESS_TEAM_DOMAIN` and `JFLOW_ACCESS_AUD` on every `/api` call. Cloudflare
  Access is the only SSO supported today. Do not route those paths to jflow without it. The boards need nothing extra: they use the Linear key and teams from `/settings`. Anyone Access lets in can open them, and only `/settings` is limited to engineers.
- `/mcp` and `/webhooks/gate` must be reachable by the MCP client and by the chat host. They do their own
  auth (bearer token and signed body). Keep them off the open internet if you can, for example with an IP
  allow list at the proxy.

## Checks

- Health check: `GET /healthz` returns `ok`.
- Run one replica. Each instance keeps the settings and the chat tokens in memory, so a change or a revoke on
  one replica would not reach another. The gate table lives in the documents store, and two replicas could
  race on the same gate.

## Plain Docker

```
docker run -d --name jflow --restart unless-stopped -p 127.0.0.1:8080:8080 \
  --env-file /etc/jflow/jflow.env \
  jflow:1
```

`jflow.env` holds `DATABASE_URL`, `JFLOW_SETTINGS_KEY`, `JFLOW_ACCESS_TEAM_DOMAIN` and `JFLOW_ACCESS_AUD`, one
`NAME=value` per line. Point the reverse proxy at `127.0.0.1:8080`.

## One Kubernetes Deployment

Put the four env values in a Secret named `jflow-secrets`.

```
apiVersion: apps/v1
kind: Deployment
metadata: { name: jflow }
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector: { matchLabels: { app: jflow } }
  template:
    metadata: { labels: { app: jflow } }
    spec:
      containers:
        - name: jflow
          image: registry.example.com/jflow:1
          ports: [{ containerPort: 8080 }]
          envFrom: [{ secretRef: { name: jflow-secrets } }]
          readinessProbe: { httpGet: { path: /healthz, port: 8080 } }
          livenessProbe: { httpGet: { path: /healthz, port: 8080 } }
```

Add a Service and an Ingress (or any proxy) for TLS, with Cloudflare Access in front of every path except
`/healthz`, `/mcp` and `/webhooks/gate`.

## Upgrading from a config file

Older versions took a JSON config file (`JFLOW_CONFIG`), `JFLOW_GATE_SECRET` and one token env var per
`mcpClients` entry. A new version does not need them. For a running deploy, keep this order:

1. Update the image and start it once with the old values still set: `JFLOW_CONFIG` (and the file), `JFLOW_GATE_SECRET`
   and the token vars named by the `tokenEnv` of each `mcpClients` entry. Keep `DATABASE_URL` and `JFLOW_SETTINGS_KEY` as they are.
2. On that start jflow copies, once and only where the database has no value yet:
   - `JFLOW_GATE_SECRET` becomes the gate secret, so open gates keep their signature;
   - each `mcpClients` entry with its env token becomes a chat token with the same name, so a connected chat
     keeps working. A missing token, or one under 32 characters, is skipped with a warning;
   - `engineers` and `publicUrl` from the file.

   The log says which old values can go. A value already in the database, for example one an engineer changed
   on `/settings`, is never overwritten.
3. Only after that start, remove the old values: `JFLOW_CONFIG` and the file, `JFLOW_GATE_SECRET` and the token vars.

Do not remove `JFLOW_GATE_SECRET` before that first start. The gate secret would then be created new, and every open gate
would become invalid.

If `JFLOW_ACCESS_TEAM_DOMAIN` and `JFLOW_ACCESS_AUD` are not set, jflow still takes the two Access values from the
`access` part of the file. Set both env vars before you remove the file, or the next start fails.

### Moving jflow to a new host

The jflow address can only be changed from that address, so a new host cannot save its own address while the old one
is stored. Clear the stored address with `update settings set value = value - 'publicUrl' where id = 1;`, then open
`/settings` at the new address. The next save takes the page origin.
