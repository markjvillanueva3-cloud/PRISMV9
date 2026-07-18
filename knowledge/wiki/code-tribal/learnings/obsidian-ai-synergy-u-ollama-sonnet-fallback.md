# OBSIDIAN-AI-SYNERGY/U-OLLAMA-SONNET-FALLBACK — [MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-SONNET-FALLBACK (slot:india): Claude/Sonnet fallback on Ollama failure + IPv4 default + rerank drift

**Commit:** `28ec933a0ada` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:16:18-05:00
**Tags:** obsidian-ai-synergy, u-ollama-sonnet-fallback, auto-distilled

## Subject
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-SONNET-FALLBACK (slot:india): Claude/Sonnet fallback on Ollama failure + IPv4 default + rerank drift

## Body
```
[MAIN] [OBSIDIAN-AI-SYNERGY]/U-OLLAMA-SONNET-FALLBACK (slot:india): Claude/Sonnet fallback on Ollama failure + IPv4 default + rerank drift

OLLAMA-FLEET-AUDIT-2026-06-11 P0-3 (operator's explicit 'sonnet fallback if ollama
fails') + P1-6 (Windows IPv6 fix). 2-reviewer (code-reviewer + silent-failure-hunter) PASS.

P0-3 Sonnet fallback (FM-2: Ollama-down dead-end gave Claude ZERO signal):
- ask-ollama.mjs: new buildFallbackSignal(); wired at both generation-failure sites
  (ask + file mode). Ollama-down now: exit 3 PRESERVED, output is an actionable
  'you are the fallback' directive (human) OR machine-readable {lane:claude,
  ollamaUnavailable,fellBack} JSON (--json). --json previously emitted an
  UNPARSEABLE error string (silent parse-fail). Graph-load sites left untouched.
- trigger-command-pipeline.mjs: runStep CONSUMES the structured fallback -- clean
  reason (not a raw JSON blob) + propagates fallback:'claude' so the pipeline
  escalates to Claude (operator intent flowing THROUGH the pipeline). Non-JSON
  stderr verbatim (back-compat: existing test stays green).

P1-6 Windows IPv6: OllamaHookBridgeEngine.ts baseUrl localhost -> OLLAMA_URL||
127.0.0.1 (localhost resolves ::1 first; Ollama binds IPv4 -> 2s fail ate the
500ms hook budget -> every bridge call silently fell back). JSDoc synced.

Pre-existing drift (caught by the 2-reviewer pass): command-ollama-routes.mjs
OLLAMA_MODES was missing 'rerank' (a real ask-ollama TEXT_MODE) -> drift test red
on HEAD + the rerank offload route unrepresentable. Added (free-text, peer to viz/ask).

Tests: ask-ollama 81/81, OllamaHookBridgeEngine 47/47, trigger-command-pipeline
29/29 (3 new: --json fallback, structured-fallback consume, drift now green).

NOT done (deliberate, R12): P0-1 auto-exec in the UserPromptSubmit offloader -- the
author's R12 design is CORRECT (the hook sees only the prompt, never the file; a
blocking Ollama call adds 180s latency to every prompt fleet-wide). True auto-exec
belongs at PreToolUse:Read with verifiedOffload, non-edit reads only -- separate
unit. P0-2 (route-pretooluse wiring + offloader ollama-down inject) needs main-tree
harness edits (cross-worktree firewall blocks them from india).
```

## Files touched (8)
- mcp-server/src/__tests__/OllamaHookBridgeEngine.test.ts |  10 ++-
- mcp-server/src/engines/OllamaHookBridgeEngine.ts        |  10 ++-
- scripts/__tests__/ask-ollama.test.mjs                   |  16 +++-
- scripts/ask-ollama.mjs                                  |  39 ++++++++-
- scripts/lib/command-ollama-routes.mjs                   | 283 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/trigger-command-pipeline.mjs                    | 338 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/trigger-command-pipeline.test.mjs               | 273 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 7 files changed, 962 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 28ec933a0ada`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._