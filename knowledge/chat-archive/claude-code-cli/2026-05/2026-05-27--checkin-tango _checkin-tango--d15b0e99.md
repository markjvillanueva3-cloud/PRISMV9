---
type: "chat-session"
source: "claude-code-cli"
session_id: "d15b0e99-8885-4c98-8688-a87fa16703a9"
title: "checkin-tango /checkin-tango"
date: "2026-05-27"
first_ts: "2026-05-27T22:30:24.954Z"
last_ts: "2026-05-27T22:31:04.611Z"
cwd: "H:\\PRISM"
messages: 3
user_msgs: 2
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/d15b0e99-8885-4c98-8688-a87fa16703a9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:47"
---

# checkin-tango /checkin-tango

> **claude-code-cli** | 2026-05-27 | 3 msgs (2 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/d15b0e99-8885-4c98-8688-a87fa16703a9.jsonl`

## Transcript

### User | 2026-05-27T22:30:49.607Z

<command-message>checkin-tango</command-message>
<command-name>/checkin-tango</command-name>

### User | 2026-05-27T22:30:49.607Z

# /checkin-tango — slot-locked /checkin

Force-takes the **tango** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `tango-work`, then runs the standard `/checkin` pipeline.

This wrapper exists because it binds THIS chat to the `tango` slot before the standard /checkin pipeline runs — guarantees the handoff bind, drift check, commit hygiene, BUILD_STATE inject, system-viz ping, and pickup candidates are all keyed to the right slot. Slot-claim wrapper for /checkin. The /checkin pipeline body is canonical — this skill just ensures the slot binding is correct first. Args after /checkin-<slot> are forwarded to /checkin (including /loop, /goal, /pick-unit, etc.).

## Slot binding (replaces /checkin Step 1 / Step 2)

> **AUTO-ENFORCED (U-SLOT-BIND-ENFORCE, 2026-05-18).** The
> `slot-bind-enforce.mjs` UserPromptSubmit hook ALREADY force-claimed the
> `tango` slot deterministically the instant this `/checkin`
> prompt was submitted — using the harness `session_id` from stdin
> (authoritative), NOT a hand-copied id. If the hook injected a
> `✅ slot-bind-enforce: slot \`tango\` deterministically bound to
> \`claude-<id>\`` line into your context, **use that exact chat id** for
> every chat-slots / slot-task-claim / handoff call this session and SKIP the
> bash below — re-running it is redundant (the hook's idempotent fast-path
> already no-ops a correct binding). Only run the bash manually if the hook
> emitted a `⚠️ no harness session_id` advisory (no stdin id — the fallback
> path), and in that case STABLE MUST come from the LIVE
> `**Chat Isolation:**` line in THIS session's context, NEVER from a
> conversation summary / handoff (a stale id there is the exact cross-chat
> unit-collision bug this hook was built to kill).

```bash
STABLE="claude-<8hex-from-the-LIVE-Chat-Isolation-line>"   # fallback only
BRANCH=$(git -C H:/prism rev-parse --abbrev-ref HEAD 2>/dev/null)
SLOT="tango"
TOPIC="tango-work"

# Reap stale slots first, t
... [+854 chars truncated]

### Assistant | 2026-05-27T22:31:04.609Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
