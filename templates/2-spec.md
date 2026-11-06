# Spec - <PROJECT-ID> <Project name>

**Requirements.** Numbered, testable.

**Design.** One part per repo: what changes and why. APIs, data model, migrations.

**Security and compliance.** Auth, RLS / tenancy, secrets, encryption and BYOK, audit log.
Write "none" if nothing applies.

**Rollout and rollback.** Deploy order across repos, feature flags, how to undo.

**TDR.** "Not needed" or "Needed for <decision>, because <trigger>". Link existing TDRs that apply.

**Flagged concerns.** What the agent was not sure about. One numbered item each, and every
item ends with a decision line before the spec gate:

1. <concern> - Decide: <who>
   Decision: <what was decided> - <who>, YYYY-MM-DD

"Out of scope, follow-up <issue>" is a valid decision. "Undecided" is not.
