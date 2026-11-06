---
name: build
description: Build a Linear project with an approved plan - take every ready issue in plan order, implement it in its own worktree, commit, push and open a draft PR, stacking dependent issues, running independent ones in parallel. Use for /flow:build (Claude Code) or $build (Codex), or when a project has the flow:build label.
argument-hint: <LINEAR project or issue>
---

# build

Read `CONVENTIONS.md` in this skill's folder first and follow it, especially "Build rules".

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.
Always work on the whole project. Never ask the human which issue to take.

Precondition: project label `flow:build`. Repos are checked out side by side under the current
folder (for example `~/Projects/acme`).

## One call = one wave

1. **Read state.** The project issues (status, blocked-by, assignee, `gitBranchName`), their
   PRs (state, base, checks, review, unresolved comments), `2-spec.md`, `3-plan.md` and the
   Build table in `0-status.md` (add it from `templates/0-status.md` if it is missing).
2. **Answers first.** For every issue in "waiting for answer", read new replies in its PR and
   Linear comments. If answered, move it back to ready.
3. **Ready issues.** An issue is ready when it has no PR yet and every issue it depends on
   is merged or has an open PR.
4. **Build them with a pool of 3.** Start up to 3 ready issues in plan order. When one
   finishes, check again what is ready (an issue whose dependency just got its PR is ready
   now) and start the next one right away. Keep going until nothing is ready and nothing is
   running. Each issue follows "Per issue" below.
   - Claude Code: one `flow-builder` subagent per issue, up to 3 at the same time.
   - Codex, or no subagents: one issue after another, inline.
5. **Review fixes.** For PRs with new review comments that ask for changes, fix them on the
   same branch (same steps 3-6 of "Per issue"), reply in the thread, do not resolve it.
6. **Report.** Update the Build table and the Build row in `0-status.md`, and show the human
   one table: issue, PR, base, checks, review, status. List what waits for whom.
7. When every issue is merged, say so: the next `next` call moves the project to verify.

## Per issue

1. **Branch.** Name: the issue's `gitBranchName` from Linear, so GitHub links the PR to the
   issue. Base: the default branch, or the branch of the issue it depends on (stack). With
   two dependencies in the same repo, stack on the later one in plan order.
2. **Worktree.** `git fetch`, then `git worktree add ../.worktrees/<repo>/<branch> -b <branch>
   origin/<base>` (or the local base branch for a stack). Work only there.
3. **Code.** Build exactly the issue's section in `3-plan.md`, within `2-spec.md`. If the plan
   is wrong or a real question comes up, see "Questions" below.
4. **Prove.** Run the proof-of-done commands from the plan. Fix until they pass.
5. **Commit and push.** Small, clear commits that name the issue ID. `git push -u origin <branch>`.
6. **Draft PR.** `gh pr create --draft --base <base>`. Body: what and why in a few lines,
   link to the issue, link to the plan section, how it was proven, "Stacked on #N" when
   stacked. Move the Linear issue to In Review and attach the PR.
7. **Log.** Build table row (branch, base, PR, status) and one log line in `0-status.md`.

## Questions (human in the loop)

Technical decisions belong to plan and TDR, so questions during build should be rare.
When one comes up:

- **Human in the chat:** ask there and wait.
- **No human** (subagent, runner): post the question as a PR comment, tagging the issue
  assignee, else the project lead (find their GitHub login from their earlier PRs or ask once
  and note it in `0-status.md`). Add the same question as a Linear comment on the issue. Set
  the Build table status to "waiting for answer", push what is done, and go on with other
  issues.
- If the answer changes the plan, update that issue's section in `3-plan.md` and say so in
  the log.

## Never

Merge a PR, push to `main` or `master`, force push, rewrite a pushed branch, close someone
else's PR, or touch a branch that is not this project's. Hooks block most of these.

End the reply with the "Stage done: build" lines from the conventions only when every issue
has a PR. Otherwise end with what the next call will do.
