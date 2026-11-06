# TDR <Name>

| | |
| --- | --- |
| Status | Draft |
| Owner | @<engineer> |
| Deciders | @<people who approve> |
| Date | YYYY-MM-DD |
| Project | <Linear project URL> |
| Supersedes | <TDR link or none> |

## 1. Context and problem

What forces a decision now. Facts only: current state, limits, numbers.

## 2. Decision drivers

What matters most when choosing, in priority order. For example: tenancy isolation, compliance,
cost, time to ship, operational load, reversibility.

## 3. Options considered

At least two real options. "Do nothing" counts when it is viable.

### Option A - <name>

How it works. Pros. Cons. Cost. Effort.

### Option B - <name>

...

## 4. Decision

The chosen option, and why it wins on the drivers above. Why each other option lost.

## 5. Design

Diagram (mermaid) and what changes in each service: APIs, data model, migrations.

## 6. Security and compliance

Auth, tenancy and RLS, secrets, encryption and customer-managed keys, audit log, compliance impact.
Write "none" if nothing applies.

## 7. Consequences

- Good: what gets easier.
- Bad: what gets harder, new things to run and maintain.
- Risks and how we notice them (metrics, alerts).

## 8. Rollout and rollback

Order, feature flags, migration steps, how to undo and at what cost.

## 9. Open questions

Things the deciders must answer before Accepted.
