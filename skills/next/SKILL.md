---
name: next
description: Move a Linear project to its next flow stage - look at its flow label and files, confirm the gate with the human, set the next label and run the next stage skill. Use for /flow:next (Claude Code) or $next (Codex) or "move this forward".
argument-hint: "[LINEAR project or issue]"
---

# next

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.
With no input, use the git branch. See "Finding the project" in the conventions.

## How it decides

Read the project label, its issues and their PRs, and the files in its flow folder, then use
this table. "Gate" rows need the human's explicit yes. First show a 3-5 line summary of what
they approve (open questions, flagged concerns, the pieces in the plan, failed checks).

| Current state | Check | Action |
| --- | --- | --- |
| no `flow:*` label, no folder | - | run the `intent` skill |
| `flow:intent` | intent has blocking open questions | show them, stop |
| `flow:intent` | intent complete | **gate**: approve intent? -> set `flow:spec`, run the `spec` skill |
| `flow:spec` | - | run the `spec` skill |
| `flow:spec-review` | a flagged concern has no Decision line | list every undecided concern, ask the human to decide each one (or explicitly move it out of scope), write the answers into `2-spec.md`, stay on the label |
| `flow:spec-review` | spec says TDR not needed | **gate**: approve spec? -> set `flow:plan`, run the `plan` skill |
| `flow:spec-review` | spec says TDR needed | **gate**: approve spec? -> set `flow:tdr`, run the `tdr` skill |
| `flow:tdr` | TDR missing | run the `tdr` skill |
| `flow:tdr` | TDR is Draft or In Review | show its status and open points, stop. The engineer owns it. |
| `flow:tdr` | TDR is Accepted | **gate**: move to plan? -> set `flow:plan`, run the `plan` skill |
| `flow:plan` | no `3-plan.md` or no issues yet | run the `plan` skill |
| `flow:plan` | open technical questions in `3-plan.md` | show them, stop |
| `flow:plan` | plan written, issues exist, no open technical questions | **gate**: approve plan? -> set `flow:build`, run the `build` skill |
| `flow:build` | some issues not merged | run the `build` skill (one wave: builds what is ready, picks up answers and review comments, reports) |
| `flow:build` | all issues merged or released | set `flow:verify`, run the `verify` skill (no gate, it is a fact) |
| `flow:verify` | `4-verification.md` missing or older than the last merge | run the `verify` skill |
| `flow:verify` | all checks pass | **gate**: mark done? -> set `flow:done` |
| `flow:verify` | some checks fail | show the failures, stop |
| `flow:done` | - | say it is done, stop |

## Fresh context for spec and verify

`spec` and `verify` ask no questions, so they always run in a fresh context:

- Claude Code: delegate to the `flow-spec` or `flow-verifier` subagent from this plugin, pass
  the project, and show the human the summary it returns.
- Codex, or when subagents are not available: run the `spec` or `verify` skill inline.

"Run the `spec` skill" and "run the `verify` skill" in the table above mean this.

## Rules

- A gate summary lists **every** undecided item, not a selection: open questions, flagged
  concerns without a Decision line, open technical questions. One "yes" never decides
  several items at once. Each item gets its own answer, written into the file.

- If the human says no at a gate, ask what to change, apply it in the file of the current
  stage, and stay on the same label.
- Swap labels, never stack them: remove the old `flow:*` label when setting the new one.
- One step per call. After the next stage finishes, stop. If it ran inline, end with the
  "Stage done" lines from the conventions. If it ran in a subagent, the main session stays
  clean, so just say what the next call would do.
- On every label change update `0-status.md` in the same step: mark the stage just approved
  done, the next one in progress (TDR skipped when not needed), and log
  `YYYY-MM-DD - <stage> approved - <person>`.
- Headless (no human): never pass a gate. Only run the rows without **gate**, then stop.
