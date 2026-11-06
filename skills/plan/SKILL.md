---
name: plan
description: Write 3-plan.md for a Linear project with an approved spec and break it into small Linear issues (about one PR each) with dependencies. Use for /flow:plan (Claude Code) or $plan (Codex), or when a project has the flow:plan label.
argument-hint: <LINEAR project or issue>
---

# plan

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.

Meant to run locally with a human. The repos must be checked out side by side under the
current folder (for example `~/Projects/acme`).

Precondition: project label `flow:plan`, or the human says to go ahead.

1. Read the project, `1-intent.md` and `2-spec.md`. The spec is the contract.
2. Write `3-plan.md` from `templates/3-plan.md`. Break the spec into small pieces, each about
   one PR in one repo. A repo can have several pieces. First the order and dependencies
   between pieces, then one section per piece: files that change, work order, risks,
   proof of done (exact test and lint commands), what it depends on.
   Every flagged concern in `2-spec.md` must have a Decision line. If one does not, stop
   and send the human back to the spec gate. Never plan around an undecided concern by
   assuming the current behavior stays.
   Settle every technical decision now. What cannot be settled goes under "Open technical
   questions" and is closed with the human before the gate. Build should not need to ask.
3. Walk the human through the plan and adjust. Keep their edits in the file.
4. When the human agrees, make sure every piece has a Linear issue in the project.
   Reuse existing issues that match. Show the list of issues you would create and create
   them only after a yes. Each issue gets a short title, the repo, and a link to its plan
   section. Set blocked-by relations from the dependencies. Write the issue IDs into the
   section headings (`## ENG-1234 <short title> (<repo>)`).
5. Update `0-status.md`: the Plan row and one log line. Do not set `flow:build` - that is the human gate.

Building is the `build` skill, not this one.
