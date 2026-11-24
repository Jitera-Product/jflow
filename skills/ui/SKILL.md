---
name: ui
description: Collect the UI design handoff for a Linear project whose spec changes the UI, and save it as 2-ui/README.md. Optional step, only when 2-spec.md says the feature changes UI. Use for /flow:ui (Claude Code) or $ui (Codex), or when a project has the flow:ui label.
argument-hint: <LINEAR project or issue>
---

# ui

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.

The owner designs the screens in Claude Design. This skill does not design. It collects the
handoff and keeps it next to the spec, so the plan can point at it.

## Steps

1. Read the project and `2-spec.md`. If the spec does not change the UI, say so and stop.
2. Ask the person for two things:
   - the handoff link from Claude Design
   - one PNG per screen and state (default, empty, error, and so on), uploaded to the chat
3. Wait for both. Do not invent screens and do not fill gaps. List what is missing.
4. Save them: with the jflow tools, call `save_ui_handoff` with the link and one row per screen
   and state (name, state, file). Without them, write `2-ui/README.md` from `templates/2-ui.md`.
5. Update `0-status.md`: the UI row and one log line (`log_stage` with the jflow tools).
6. Open the gate to `flow:plan`: `open_gate` with the jflow tools, and show the returned link.
   Without them, ask the human and follow `next`. Never set `flow:plan` yourself.
7. Reply with the handoff link, the screen count and the gate link.
