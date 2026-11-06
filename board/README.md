# Team workload board

One page per team: every person's own projects and the work they do outside them, with a
"free in N weeks" forecast and an agent lane for issues handed to `/flow:quick`.

- **Team and Status**: filters at the top pick which Linear projects are on the board; with no
  choice it is every open project of every team. The browser remembers the last choice, and
  the link carries it too, so a team can share one link. Nothing is configured on the server.
- **Own projects**: projects on the board where the person is lead or member, with the number
  of their active issues in each.
- **Other projects**: other projects where they have active issues, with a count.
- **Without a project**: those issues, one by one.
- **Agent**: issues labeled for the agent (`agent:ready` + one `repo:`, `agent:working`,
  `agent:review`, stuck after 24 hours) with the `/flow:quick <ID>` command.
- **Forecast**: open issues (started + Todo) / issues the person closed per week over the last
  21 days, agent closures left out. No forecast below 3 closures.

It runs as one Cloudflare Worker: static React page plus `GET /api/board`, which reads Linear
GraphQL with a server-side API key, pages through every result and caches the answer for
`CACHE_MINUTES` (Refresh skips the cache). All rules live in `src/shared/model.ts` and are
covered by `test/model.test.ts`.

## Access

The board shows people and issue titles. It has no login of its own: put it behind
Cloudflare Access (or another identity-aware proxy) on a custom domain. `workers_dev` is off
in `wrangler.jsonc` so the Worker is not reachable around Access.

## Develop

```bash
cd board
npm install
cp .dev.vars.example .dev.vars   # Linear API key
npm test
npm run dev                      # builds the page and starts wrangler dev
```

Use a Linear API key of a workspace member who can see all the projects and issues the board
should show.

## Deploy

`.github/workflows/board.yml` tests and builds on every PR. On a push to `main` it deploys when
the repository variable `BOARD_DEPLOY` is `true`, in the `production` environment. Keep the
secrets in that environment, not in the repository, and limit it to protected branches with a
required reviewer: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `LINEAR_API_KEY`. Bind your domain to the `jflow-board` Worker (custom domain) behind
Cloudflare Access.
