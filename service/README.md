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
| `teams` | Linear team keys that use jflow. |
| `engineers` | Emails of the engineers who may decide gates. |
| `access` | `teamDomain` and `aud` of the Cloudflare Access app that protects the web pages. |
| `documents` | The documents MCP connection: `kind`, `url`, `tokenEnv` (name of the env var with the token), `headers`, and the `verbs` (`read`, `list`, `create`, `update`) as a tool name plus args. Args may use `{path}` and `{content}`. |
| `mcpClients` | Clients of the `/mcp` route. Each has a `name` and a `tokenEnv`. |

## Environment variables

- `JFLOW_CONFIG`: path to the config file.
- `LINEAR_API_KEY`
- `JFLOW_GATE_SECRET`: at least 32 characters.
- `JFLOW_CALLBACK_SECRET`: at least 32 characters.
- The variable named by `documents.tokenEnv` (the example uses `DOCS_TOKEN`).
- One variable per entry in `mcpClients`, named by its `tokenEnv` (the example uses `MCP_TOKEN`). At least 32 characters, and each one different.
- `PORT`: optional, default `8080`.

## Run locally

```
cd service
npm ci
npm run build
cp config.example.json config.local.json   # then edit it
export JFLOW_CONFIG=$PWD/config.local.json
export LINEAR_API_KEY=... JFLOW_GATE_SECRET=... JFLOW_CALLBACK_SECRET=... DOCS_TOKEN=... MCP_TOKEN=...
npm start
curl localhost:8080/healthz
```

Tests: `npm test`.

## Container

Build from the repo root, because the image needs `templates/`:

```
docker build -f service/Dockerfile -t jflow:dev .
docker run --rm -p 8080:8080 \
  -e JFLOW_CONFIG=/config.json -v $PWD/service/config.local.json:/config.json \
  -e LINEAR_API_KEY=... -e JFLOW_GATE_SECRET=... -e JFLOW_CALLBACK_SECRET=... \
  -e DOCS_TOKEN=... -e MCP_TOKEN=... \
  jflow:dev
```

## Routes

| Route | Use |
| --- | --- |
| `GET /healthz` | Returns `ok`. |
| `POST /mcp` | MCP endpoint for agents. Needs a bearer token from `mcpClients`. |
| `GET /gate/<project>/<gate>` | The confirm page for a gate. |
| `POST /gate/<project>/<gate>` | Sends the answer from the confirm page. |
| `POST /webhooks/gate` | Signed callback from a chat host. See [docs/gate-callback.md](../docs/gate-callback.md). |
