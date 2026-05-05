---
schema_version: 1.0.0
source: project
section: SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
slug: scrutiny-gate-universal-every-chat-every-stop
start_line: 23
end_line: 30
indexed_at: 2026-05-05T13:49:55.465Z
content_hash: bcd46b23230313a2572008762c7a896cc57357596f9f53fc4e03dec67dd89f29
mirror_engine: ClaudeMdChunkerEngine
---
## SCRUTINY GATE (UNIVERSAL — every chat, every Stop)
A Stop hook (`.claude/hooks/scrutinize-before-stop.mjs`) **blocks** task completion when the session has uncommitted file changes and the scrutiny ledger has no entry for the current session. To finish a task you MUST:
1. Dispatch a parallel reviewer agent: `Agent({ subagent_type: 'reviewer', description: 'Review session diff', prompt: 'Review uncommitted changes; check tests + ≥3 failure modes, no stub/TODO, physics constants imported, dispatcher wiring complete. PASS or list blockers.' })` — this agent terminates automatically when it returns its final message (one-shot, no daemon).
2. Self-review via `git diff` against the user's original request.
3. Record completion: `node .claude/scripts/scrutiny-mark.mjs --session-id <id-from-block-message> --self --agent --notes "<one-line summary>"`

The hook is in `MINIMAL_ALLOWLIST` so `PRISM_HOOK_PROFILE` cannot disable it. After 3 block attempts the gate auto-passes with a warning (escape hatch). Ledger lives at `mcp-server/data/state/SCRUTINY_LEDGER.json` keyed by session id.
