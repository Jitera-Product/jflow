# Deploy jflow

jflow is one Node service. This page shows how to run it on plain Docker or on one Kubernetes
Deployment. No ArgoCD, Helm or Terraform is needed.

## Image and run

Build from the repo root, because the image needs `templates/`:

```
docker build -f service/Dockerfile -t jflow:1 .
```

Or run it without Docker: `cd service && npm ci && npm run build && node dist/main.js`. The built service needs
the `templates/` folder at the repo root (the repo layout: `service/dist` sits two levels below it), or set `templatesDir` in the config.

The service listens on `PORT` (default `8080`).

## Config and env

`JFLOW_CONFIG` is the path of a JSON file. Start from `service/config.example.json`; the fields are in
[service/README.md](../service/README.md). Secrets never go in the file. They are env vars:

| Env var | Notes |
| --- | --- |
| `JFLOW_CONFIG` | Path of the config file. |
| `JFLOW_GATE_SECRET` | At least 32 characters. |
| `JFLOW_CALLBACK_SECRET` | At least 32 characters. Shared with the chat host that sends [gate callbacks](gate-callback.md). |
| `DATABASE_URL` | Postgres 14 or newer, for example `postgres://jflow:pass@db.example.com:5432/jflow`. jflow runs its migrations at start. |
| `JFLOW_SETTINGS_KEY` | At least 32 characters. Encrypts the docs token and the Linear key in the database. If you change it, type the two keys again on `/settings`. |
| `MCP_TOKEN` | One per `mcpClients` entry, named by its `tokenEnv`. At least 32 characters, and each one unique. |
| `JFLOW_ACCESS_AUD` | Optional. Overrides `access.aud` in the file. |
| `JFLOW_ACCESS_TEAM_DOMAIN` | Optional. Overrides `access.teamDomain` in the file. |

jflow refuses to start when a value is missing or too short, and the error names the variable.
Secrets are read at start, so restart jflow after you change them.

The docs URL, project, docs token, Linear API key, teams and engineers live in the database, not in env
vars. Engineers change them on the `/settings` page while jflow runs.

## First run

1. Start jflow with the env vars above. It creates its tables and stores the `engineers` from the file as
   the first engineers.
2. Open `<publicUrl>/settings` as one of those engineers.
3. Set the docs URL, the project, the docs token, the Linear API key and the teams, then save.

Until then every MCP tool answers `not_configured` with a link to `/settings`. After the first run the
`engineers` in the file are not read again; the list on `/settings` wins.

## Network

- Put TLS in front with any reverse proxy. `publicUrl` in the config is the public origin, for example
  `https://flow.example.com`. Gate links are built from it.
- `/gate/*`, `/settings` and `/api/*` must sit behind Cloudflare Access. The pages are a static app that
  jflow serves itself, and the app calls `/api/*`. Access sends the `Cf-Access-Jwt-Assertion` header, and
  jflow verifies that JWT itself against `access.teamDomain` and `access.aud` on every `/api` call. Cloudflare
  Access is the only SSO supported today. Do not route `/gate/*`, `/settings` or `/api/*` to jflow without it.
- `/mcp` and `/webhooks/gate` must be reachable by the MCP client and by the chat host. They do their own
  auth (bearer token and signed body). Keep them off the open internet if you can, for example with an IP
  allow list at the proxy.

## Checks

- Health check: `GET /healthz` returns `ok`.
- Run one replica. Each instance keeps the settings in memory, and the gate table lives in the documents
  store. Two replicas could race on the same gate.

## Plain Docker

```
docker run -d --name jflow --restart unless-stopped -p 127.0.0.1:8080:8080 \
  -v /etc/jflow/config.json:/config/config.json:ro \
  -e JFLOW_CONFIG=/config/config.json \
  --env-file /etc/jflow/secrets.env \
  jflow:1
```

`secrets.env` holds the secret vars from the table, including `DATABASE_URL` and `JFLOW_SETTINGS_KEY`, one `NAME=value` per line. Point the reverse proxy at
`127.0.0.1:8080`.

## One Kubernetes Deployment

Put `config.json` in a ConfigMap named `jflow-config` and the secret vars in a Secret named `jflow-secrets`.

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
          env: [{ name: JFLOW_CONFIG, value: /config/config.json }]
          envFrom: [{ secretRef: { name: jflow-secrets } }]
          volumeMounts: [{ name: config, mountPath: /config }]
          readinessProbe: { httpGet: { path: /healthz, port: 8080 } }
          livenessProbe: { httpGet: { path: /healthz, port: 8080 } }
      volumes: [{ name: config, configMap: { name: jflow-config } }]
```

Add a Service and an Ingress (or any proxy) for TLS, with Cloudflare Access in front of `/gate/*`,
`/settings` and `/api/*`. Put `DATABASE_URL` and `JFLOW_SETTINGS_KEY` in `jflow-secrets` too.
