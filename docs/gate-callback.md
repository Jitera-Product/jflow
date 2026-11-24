# Gate callback

A gate asks a person to approve the next stage of a feature. Most people answer on the confirm page.
A chat host can also show the gate as a card and send the answer back to jflow. This page is the contract
for that callback.

## When to send

Send one callback when the person the card was sent to answers it: Approve or Request changes.

Only that person's own answer counts. Do not send an answer on behalf of someone else, and do not send one
because a bot, a rule or a model chose it. jflow trusts the email in the callback as the person who decided.

## What the card shows

Render the card from the structured fields `project`, `from` and `to` that jflow returned when the gate
opened (the result of `open_gate`). Do not build the card from text the model wrote: a model can describe
one move and open another. Send back the `to` you showed, so jflow can check the click is for this gate.

## Request

```
POST <jflow URL>/webhooks/gate
Content-Type: application/json
x-jflow-timestamp: <unix time in seconds>
x-jflow-signature: sha256=<hex HMAC-SHA256(secret, timestamp + "." + body)>
```

Body:

```json
{
  "gate": "gab23cd45ef",
  "project": "P-CORE-396",
  "decision": "approve",
  "email": "mika@example.com",
  "source": "my-chat-host",
  "to": "flow:plan"
}
```

- `gate`: the gate id. It is the last part of the confirm link, `<jflow URL>/gate/<project>/<gate>`.
- `project`: the Linear project id, the part before the gate id in the same link.
- `decision`: `approve` or `changes`.
- `email`: the email of the person who answered, as your host knows it. Case does not matter.
- `source`: a short name for your host. No `|` and no line breaks. It goes into the log line, as
  `- 2026-11-23 - Spec review approved - mika@example.com via my-chat-host`.
- `to`: the `flow:*` label the card showed as the target, the `to` jflow returned for this gate. jflow
  refuses the answer when it is not the gate's `to`.

The body is at most 1 MB.

## Signature

You and jflow share one secret (`JFLOW_CALLBACK_SECRET` on the jflow side, at least 32 characters).

1. Take the current unix time in seconds as a string, for example `1795600000`.
2. Take the exact bytes of the JSON body you send.
3. Compute HMAC-SHA256 with the secret over `timestamp + "." + body`.
4. Send the hex digest as `x-jflow-signature: sha256=<hex>` and the time as `x-jflow-timestamp`.

Sign the bytes you send. If you format the JSON again after signing, the signature does not match.

jflow refuses a timestamp more than 300 seconds away from its own clock, in either direction.

## Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 204 | none | The answer counts. |
| 400 | `{ "error": "invalid_body" }` | The body is not JSON of the shape above, a field is empty, `to` is not a `flow:*` label, or `source` holds `\|` or a line break. |
| 401 | `{ "error": "unauthorized" }` | Bad signature, or the timestamp is missing, not a whole number, or too old or too new. |
| 404 | `{ "error": "not_found" }` | No such project or gate. |
| 409 | `{ "error": "<code>" }` | The gate did not take the answer. See below. |
| 413 | plain text | The body is over 1 MB. |

Codes on 409:

- `closed`: the gate is already approved, sent back or replaced. Also when the project label already moved
  through this gate but the status file was not updated; a person may need to fix the status file.
- `stale`: the project moved on since the gate opened. The gate is now closed.
- `invalid`: the gate was changed by hand. It cannot be decided.
- `not_allowed`: this person does not hold a role the gate still needs.
- `mismatch`: the `to` in the body is not the gate's `to`. The card showed another move. Nothing changed.
- `team_not_enabled` or `no_folder`: the project is not set up for jflow.

Do not retry a 4xx. A 5xx or a network error may be retried with a new timestamp and signature.

## Replays

A replay is harmless. One person fills one role once: the same approval sent again changes nothing and
gives 204 while the gate is open, and 409 `closed` after it closed. A gate that needs two roles stays open
until a second person approves.
