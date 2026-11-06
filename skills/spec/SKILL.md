---
name: spec
description: Draft or update 2-spec.md for a Linear project from its approved intent. Use for /flow:spec (Claude Code) or $spec (Codex), when a project has the flow:spec label, or on a runner after the intent gate.
argument-hint: <LINEAR project or issue>
---

# spec

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.

## Preconditions

- The project has the label `flow:spec`, or the human running this says to go ahead.
- `1-intent.md` has no open question that blocks design. If it does, stop and list the blockers.

## Steps

1. Read the project, `1-intent.md`, and `2-spec.md` if it exists.
2. Read the affected repos (read only): `CLAUDE.md`, relevant code, and existing TDRs in
   Jitera (the TDR folder setting, default `documents/Technical Design Record (TDR)/`) that touch the same area.
3. Write `2-spec.md` from `templates/2-spec.md`:
   - Requirements - numbered and testable.
   - Design - one part per repo. Name real files, tables, endpoints.
   - Security and compliance - tenancy and RLS, secrets, encryption and BYOK, audit log,
     anything the compliance setting names. Write "none" explicitly if nothing applies.
   - Rollout and rollback - deploy order across repos, feature flags, how to undo.
   - TDR - go through "When a TDR is needed" in the conventions. Write "Not needed" or
     "Needed for <decision>, because <trigger>". Link existing TDRs in the same area.
   - Flagged concerns - what you are unsure about and who should decide, one numbered item
     each with an empty "Decision:" line. Product questions count too, not only technical
     ones. Never resolve a concern by quietly assuming the status quo.
4. If `2-spec.md` already has content, keep human edits. Change only what the intent or the
   code now contradicts, and say what changed in the log line.
5. Update `0-status.md`: your stage row and one log line. Set the project label `flow:spec-review`.
6. Reply with the folder link, the TDR verdict and the flagged concerns.

Do not write the plan. Do not touch code.
