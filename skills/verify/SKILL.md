---
name: verify
description: Verify that a Linear project is really done - run read-only checks from 2-spec.md and 3-plan.md and record evidence in 4-verification.md. Use for /flow:verify (Claude Code) or $verify (Codex), when a project has the flow:verify label, or on a runner after merge or deploy.
argument-hint: <LINEAR project or issue>
---

# verify

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.

Read only. Never change code, config or cloud resources in this skill.

## Steps

1. Read the project, its issues and their PRs, `2-spec.md`, `3-plan.md`, and
   `4-verification.md` if it exists.
2. Build a check list: every requirement in `2-spec.md`, every proof-of-done item in
   `3-plan.md`, and, if the spec links a TDR, that the built result matches its decision.
3. Run each check with read-only commands: tests, `grep`, `gh pr view`, `curl`, `dig`,
   cloud CLI `list` / `show` calls, Grafana queries.
4. Write `4-verification.md` from `templates/4-verification.md`: one row per check with pass or
   fail and evidence (short output, link, or PR number).
5. Update `0-status.md`: the Verify row and one log line. Post a project update in Linear with the summary and the folder link.
6. If a linked TDR is Accepted and the checks pass, suggest the engineer set it to
   Implemented. Do not change the TDR status yourself.
7. Do not set `flow:done`. A human does that after reading the evidence.
