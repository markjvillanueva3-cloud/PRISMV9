---
name: scrutiny-gate-protocol
description: Universal Stop hook that blocks task completion until both self-review and a parallel reviewer-agent scrutiny are recorded. Active for every chat in the PRISM repo.
type: project
originSessionId: 2a125756-5751-4129-a9cc-b48330e2b9d8
---
# Scrutiny Gate (UNIVERSAL — every chat, every Stop)

`.claude/hooks/scrutinize-before-stop.mjs` BLOCKS task completion when:
- session has uncommitted file changes (after filtering noise files), AND
- scrutiny ledger has no entry for current session, AND
- block count for session < 3

**Why:** User has been shipped partial work too many times. Tests-pass + build-pass is necessary but not sufficient — a parallel agent with a fresh prompt catches blindspots.

**How to apply (when Stop hook fires):**
1. `Agent({ subagent_type: 'reviewer', description: 'Review session diff', prompt: 'Review uncommitted changes; check tests + ≥3 failure modes, no stub/TODO, physics constants imported, dispatcher wiring complete. PASS or list blockers.' })`
2. Self-review via `git diff` against original user request
3. `node .claude/scripts/scrutiny-mark.mjs --session-id <id-from-block-message> --self --agent --notes "<one-line summary>"`

**Guarantees:**
- Universal: hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE=minimal` cannot disable it
- Auto-cleanup: hook is one-shot node, mark CLI is one-shot, parallel reviewer Agent terminates after returning final message — no daemons
- Escape hatch: after 3 block attempts the gate auto-passes with a warning
- Wired in project `.claude/settings.json` (NOT user-global) so it activates for every chat working in this repo

**State files:**
- `mcp-server/data/state/SCRUTINY_LEDGER.json` — keyed by session_id

**Tests:** `.claude/helpers/scrutiny-ledger.test.mjs` (19 tests) + `hook-profile.test.mjs:scrutinize-before-stop ALWAYS fires`

**Adopted from** `everything-claude-code` review-before-merge cadence (MIT, 2026-04-27). Shipped commits `1d3f5ca1b` + `acd14b47a`.
