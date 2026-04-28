---
source: project
section: SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
slug: scrutiny-gate-universal-every-chat-every-stop
indexed_at: 2026-04-28T00:49:50.547Z
---

## SCRUTINY GATE (UNIVERSAL — every chat, every Stop)

A Stop hook (`.claude/hooks/scrutinize-before-stop.mjs`) **blocks** task completion when the session has uncommitted file changes and the scrutiny ledger has no entry for the current session. To finish a task you MUST:
1. Dispatch a parallel reviewer agent: `Agent({ subagent_type: 'reviewer', description: 'Review session diff', prompt: 'Review uncommitted changes; check tests + ≥3 failure modes, no stub/TODO, physics constants imported, dispatcher wiring complete. PASS or list blockers.' })` — this agent terminates automatically when it returns its final message (one-shot, no daemon).
2. Self-review via `git diff` against the user's original request.
3. Record completion: `node .claude/scripts/scrutiny-mark.mjs --session-id <id-from-block-message> --self --agent --notes "<one-line summary>"`

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id.
