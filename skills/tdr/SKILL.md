---
name: tdr
description: Draft or update the TDR a Linear project needs, in the jflow TDR format (templates/tdr.md), and link it from 2-spec.md. Optional step, only when 2-spec.md says a TDR is needed. Use for /flow:tdr (Claude Code) or $tdr (Codex), or when a project has the flow:tdr label.
argument-hint: <LINEAR project or issue>
---

# tdr

Read `CONVENTIONS.md` in this skill's folder first and follow it, especially "When a TDR is
needed" and rule 8: the TDR belongs to the engineer.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.

## Steps

1. Read the project, `1-intent.md` and `2-spec.md`. The TDR line in `2-spec.md` says which
   decision needs a record. If it says "Not needed", say so and stop.
2. Look for an existing TDR on the same topic in `documents/Technical Design Record (TDR)/`,
   only to avoid a duplicate or to fill Supersedes.
3. If none exists, create `documents/Technical Design Record (TDR)/TDR <Name>.md` from
   `templates/tdr.md` with Status: Draft and the engineer as Owner (ask who, or use the
   project lead). If one exists, read it and update only what the spec changed.
4. Follow the template and use ADR / TDR best practice. Keep every section,
   write "none" where nothing applies. Options must be real alternatives, not straw men.
   Be concrete about cost, tenancy, security and how to undo. Put what you are unsure
   about under Open questions.
5. Put the TDR link on the TDR line in `2-spec.md` (read it first, change only that line).
6. Update `0-status.md`: your stage row and one log line.
7. Reply with the TDR link and the open questions. Never set the status to Accepted or
   Implemented. The engineer reviews, edits and accepts it, then `next` moves on.
