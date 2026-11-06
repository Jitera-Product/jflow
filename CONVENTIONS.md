# Flow conventions

Every flow skill follows these rules. Read this file before doing anything else.

## The unit is a Linear project

One Linear project = one problem = one run through the flow. The issues inside the project
are just the breakdown into small pieces, each about one PR in one repo. They come from
the plan and carry no flow stage of their own.

The one exception is `quick`: one small issue without a flow project gets its own one-issue
folder and goes straight to build (see `skills/quick/SKILL.md`).

## Where things live

- **Linear project** - the card and the stage. The stage is a project label, see below.
- **Linear issues in the project** - small work items, about one PR each. Normal statuses,
  branches and PRs.
- **Jitera folder** - the only source of truth for the artifacts. One folder per project in
  the Jitera project for flow documents (setting, default "Flow"), one file per stage:

  ```
  documents/Flow/<PROJECT-ID> <Project name>/
    0-status.md         status table of all stages + log
    1-intent.md
    2-spec.md
    3-plan.md
    4-verification.md
  ```

  Folders made before numbering have `intent.md`, `spec.md`, `plan.md`, `verification.md` and
  `log.md`. When you touch such a folder, first move each file to its new name (move, never
  recreate), then add the status table at the top of `0-status.md`, filled from the log and
  the Linear label.

  Numbers give the reading order. The TDR, when needed, lives with the other TDRs and is
  linked from `2-spec.md`.

  `<PROJECT-ID>` is the Linear project ID, for example `P-ENG-12`. Read and write the files
  with the Jitera MCP tools (`resource_read`, `resource_write`). Templates for every file are
  in `templates/` next to this file. The Linear project description holds a link to the folder.
- **Repos** - code, `CLAUDE.md`, repo skills, hooks. Unchanged by this plugin.
- **Model and memory** - if the team sets a model route (setting), every session uses it, so
  all sessions share the same team context.

## Settings

Read the `## jflow` section of the CLAUDE.md files in scope (user, project, repo). Each line
overrides one default:

| Setting | Default |
| --- | --- |
| Jitera project for flow documents | Flow |
| TDR folder | Technical Design Record (TDR) |
| Product docs to search for context | none |
| Model route | none |
| Compliance to check in specs and TDRs | none |

## Finding the project

Skills accept a Linear project (ID, slug or URL) or an issue (ID or URL). For an issue, use
the project it belongs to. With no input, take the issue ID from the git branch name
(`alice/eng-1234-...`) and go to its project. If nothing works, ask.

## Stage labels (Linear project labels)

| Label | Meaning | Who sets it |
| --- | --- | --- |
| `flow:intent` | Intent is being written | human |
| `flow:spec` | Intent approved, spec can be drafted | human (gate) |
| `flow:spec-review` | Spec draft is ready for humans | agent |
| `flow:tdr` | Optional. Spec approved, a TDR is needed first | human (gate) |
| `flow:plan` | Spec approved (and TDR accepted, if needed), plan can be written | human (gate) |
| `flow:build` | Plan approved, issues exist, build can start | human (gate) |
| `flow:verify` | All issues merged or deployed, ready to verify | agent or human |
| `flow:done` | Verified | human (gate) |

The labels are workspace project labels in the group `Flow`. Only one `flow:*` label on a
project at a time. Setting a new one means removing the old one.
Project status (Backlog, Planned, In Progress, ...) and issue statuses keep working as before.

## When a TDR is needed

A spec is the working doc of one project. A TDR records an architecture decision that
outlives the project. Most projects need no TDR. The `spec` skill checks these triggers:

- a new service, new infrastructure or a new external vendor
- a data model change or migration that touches more than one service
- security: auth, tenancy and RLS, encryption and BYOK, anything your compliance regime looks at (setting)
- a contract change between services (API, events, Hasura schema)
- a decision that is expensive or impossible to undo
- a visible change in infrastructure cost

TDRs live in Jitera in the TDR folder (setting) as `TDR <Name>.md` and follow
`templates/tdr.md` (ADR best practice). Status: Draft, In Review, Accepted, Implemented,
Superseded. `2-spec.md` links to
the TDR and does not repeat it.

## Nothing undecided passes a gate

Every open question, flagged concern and open technical question needs a written decision
before its gate: who decided, what, when. Product questions count as much as technical ones.
An agent never fills a gap by assuming the current behavior stays. "Out of scope, follow-up
<issue>" is a decision. Silence is not.

## Technical questions are closed before build

Every technical decision is made in spec, TDR or plan. `3-plan.md` has an "Open technical
questions" list, and the plan gate does not pass while it has items. Questions during build
are normal but rare, and go through the human-in-the-loop path in the `build` skill.

## Build rules

- One issue = one branch = one draft PR, in its own git worktree.
- Branch name = the issue's `gitBranchName` from Linear.
- An issue that depends on another is stacked: its branch starts from the dependency's
  branch and its PR targets that branch. Never wait for a merge.
- Independent issues build in parallel, 3 at a time. When one finishes, the next ready issue
  starts, until the whole project is done or blocked.
- Allowed: commit, push the issue branch, open a draft PR, reply in PR threads, move the
  Linear issue to In Progress or In Review.
- Never: merge, push to `main` or `master`, force push, rewrite a pushed branch. The plugin
  hook blocks these.
- The human approves each PR (review and merge) and each stage gate. Nothing else.

## Rules for agents

1. **Read before write.** Always read the current version of a file right before editing it.
   People edit in parallel.
2. **Own file only.** `intent` writes `1-intent.md`, `spec` writes `2-spec.md`, `plan` writes
   `3-plan.md`, `verify` writes `4-verification.md`. Read the others, never rewrite them. Never
   delete and recreate a file. Create a missing file from its template.
3. **Keep `0-status.md` current.** Every run and every gate decision updates it: set the
   Status, Updated and By of its stage row (not started, in progress, done, skipped), and
   append one line under Log: date, stage, who or which agent, what happened. The Linear
   label stays the source of truth for the current stage. The table is the readable summary,
   so whoever moves the label updates the table in the same step.
4. **Never pass a gate on your own.** Gates (`flow:spec`, `flow:tdr`, `flow:plan`, `flow:build`,
   `flow:done`) are set by people. A human can pass a gate by saying yes in `next`.
   Without that yes, an agent may only set `flow:spec-review` or `flow:verify` (after all
   issues are merged), or leave the label as is.
5. **Git only in build and quick.** Only `build` and `quick` commit, push feature branches and
   open PRs (see "Build rules"). Every other stage never touches git. Nobody but a human
   merges.
6. **No destructive infra commands.** Never run `terraform apply`, `terraform destroy`,
   `kubectl delete`, `az ... delete`, `gcloud ... delete`, `aws ... delete-*`, DNS changes
   or anything that writes to a cloud account. Write the command into the plan instead.
7. **Headless mode.** If there is no human to answer (`claude -p` on a runner, or a
   subagent such as `flow-spec` and `flow-verifier`), do not ask questions. Put them under "Open questions" or "Flagged concerns" and finish.
8. **TDRs belong to engineers.** An agent may draft or update a TDR, but never sets its
   status to Accepted or Implemented. That is the engineer's call.
9. **One stage, one session.** A stage works best in a fresh context: it relies on the
   files, not on the chat that led to them. When a stage finishes, end the reply with these
   two lines (the hook in this plugin looks for the first one):

   ```
   Stage done: <stage>.
   Next: /clear, then /flow:next <project>   (Codex: /new, then $next <project>)
   ```

   `<stage>` is one of intent, spec, tdr, plan, build, verify. Build uses one subagent per
   issue, so the main session stays clean.
10. **Style.** English. Plain, short words. Hyphens only, never em or en dashes.
