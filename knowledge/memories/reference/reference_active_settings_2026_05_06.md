---
name: Power-user Claude Code settings tunings applied 2026-05-06
description: Three off-by-default settings activated; do not remove during settings cleanup
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
Applied 2026-05-06 for token economy + MCP startup latency:

1. **`ENABLE_PROMPT_CACHING_1H=1`** in `settings.json` env — bumps prompt cache TTL from 5min default to 1 hour. Reduces input-token cost on multi-chat sessions hitting similar context blocks (CLAUDE.md, hook injections, memory blob).

2. **`skillOverrides`** in `settings.json` (top-level) — 9 ollama-* skills marked `user-invocable-only`: `ollama-explain`, `ollama-summarize`, `ollama-docstring`, `ollama-classify`, `ollama-diff-summary`, `ollama-error-triage`, `ollama-extract`, `ollama-test-stub`, `ollama-boilerplate`. Hooks still fire them automatically; only model-side auto-discovery is suppressed. User invokes manually with `/ollama-*` slash commands.

3. **`alwaysLoad: true`** on `prism-mcp-server` and `claude-flow` in `H:\.claude\.mcp.json` — eliminates lazy-load latency (~200ms each) on first MCP call. Slightly slower SessionStart, faster first dispatcher hit.

**How to apply:**
- Do NOT recommend these as "improvements" — already on.
- Do NOT remove during settings cleanup — they're load-bearing.
- If `skillOverrides` or `alwaysLoad` keys turn out to use different names in newer Claude Code versions, the harness ignores unknown keys (no breakage); the env var is universally supported.
- After CLI updates, verify these stay present — settings.json hooks may rewrite the file. Restore if missing.

**Verification path:** restart, check whether `/ollama-explain` still works (it should — skills user-invocable), check first MCP call latency (should be <100ms).
