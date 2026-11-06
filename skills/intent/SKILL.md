---
name: intent
description: Start the flow for a Linear project - create its Jitera flow folder and write 1-intent.md. Use when someone says /flow:intent or $intent, "start the flow", or wants to frame a problem before spec.
argument-hint: <LINEAR project or issue>
---

# intent

Read `CONVENTIONS.md` in this skill's folder first and follow it.

Input: a Linear project or issue, from the arguments (`$ARGUMENTS`) or the user's message.
See "Finding the project" in the conventions.

## Steps

1. Read the Linear project: name, description, documents, issues, comments.
2. Find the flow folder `documents/Flow/<PROJECT-ID> <Project name>/`. If it does not exist,
   create it with `0-status.md` and `1-intent.md` from `templates/`, and add a link to the folder at
   the top of the Linear project description (read the description first, keep the rest).
3. Fill `1-intent.md` from what the project already says. The project description is often
   most of the intent already. Use the team context and the repos under the current folder
   to name affected systems concretely (repo names, services, envs).
4. Interactive: interview the human, one question at a time, until Problem, Outcome and
   Constraints are clear. Headless: write what is unclear under "Open questions".
5. Update `0-status.md`: your stage row and one log line.
6. Set the project label `flow:intent` if no `flow:*` label is set. Do not set `flow:spec` -
   that is the human gate.
7. Reply with the folder link and the open questions, nothing else.
