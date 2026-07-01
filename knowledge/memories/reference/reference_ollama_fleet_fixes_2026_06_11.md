---
name: reference_ollama_fleet_fixes_2026_06_11
description: "Ollama fleet-wide fixes shipped by india 2026-06-11 (Sonnet fallback, IPv4, keep_alive, timeout-scaling) + what is blocked from worktrees"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.676Z
aliases: reference_ollama_fleet_fixes_2026_06_11
---


OLLAMA-FLEET-AUDIT-2026-06-11 (`state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md`, 5 Sonnet-agent slices). **Root cause:** Ollama is HEALTHY; the "failure" is UNDER-UTILIZATION -- every offload hook EMITS a text advisory, none AUTO-EXECUTES, and `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` (live env) is read by NO wired hook. 671 large-read suggests -> 0 offloads, ~23% rate (<30% target).

**SHIPPED (slot:india, branch cad-fusion-live-ms0):**
- keep_alive `10m -> OLLAMA_KEEP_ALIVE||30m` (`e5f29a5df5`). Finding: interactive shells carry a STALE `OLLAMA_KEEP_ALIVE=10m` while the live server env is 30m (env not uniformly propagated -- golf infra-hygiene note).
- Sonnet fallback (`28ec933a0a`): `ask-ollama.mjs buildFallbackSignal()` at BOTH generation-failure sites -- exit 3 preserved, but emits a "you are the fallback" directive (human) OR `{lane:"claude",ollamaUnavailable,fellBack}` JSON (`--json`, which was an UNPARSEABLE error string before). `trigger-command-pipeline.mjs::runStep` CONSUMES it (clean reason + propagates `fallback:"claude"` through the pipeline). `resolveExecutor` (`.claude/hooks/lib/ollama-cost-router.mjs:296`) returns `lane:"claude"` when Ollama is down = the canonical fallback primitive.
- IPv4 (`28ec933a0a`): `OllamaHookBridgeEngine` baseUrl `localhost -> OLLAMA_URL||127.0.0.1` (Windows resolves `localhost` to `::1` first; Ollama binds IPv4 -> the 2s fail ate the 500ms hook budget -> every bridge call silently fell back).
- rerank mode drift (`28ec933a0a`): `command-ollama-routes.mjs OLLAMA_MODES` was missing `rerank` (a real ask-ollama TEXT_MODE) -> drift test RED on HEAD. Added. (Also rescued 3 untracked orphan files: trigger-command-pipeline.{mjs,test.mjs} + command-ollama-routes.mjs, uncommitted peer work from the 2026-06-04 U-CMD-OLLAMA-ROUTE memo.)
- timeout-scaling FM-4 (`7521518fcf`): `scaleTimeoutForBytes()` -- file modes scale the timeout to content size (57KB: 180s->234s, was killed mid-answer), explicit `--timeout` wins, 600s ceiling. ask-ollama 84/84.

**BLOCKED from the india worktree** (cross-worktree firewall hard-blocks `.claude/hooks/*.mjs` + settings.json): the auto-utilization WIRING -- P0-2 (wire `ollama-route-pretooluse.mjs` into settings.json; `PRISM_OLLAMA_ROUTE_AUTO=1` is live but the hook never fires), the offloader ollama-down inject (FM-2 site 1), async-ify ollama-auto-router, nomic vault-embed-on-Stop. Needs a MAIN-TREE chat or a logged `PRISM_CROSS_WORKTREE_BYPASS=1`.

**DELIBERATELY NOT DONE (R12):** P0-1 auto-exec in the UserPromptSubmit offloader. The author's R12 design (`ollama-task-offloader.mjs:370-375`) is CORRECT -- the hook sees only the prompt text, never the file, and a blocking Ollama call = up to 180s latency on EVERY prompt fleet-wide; SAFE_AUTOEXEC categories (explain/summarize) are the SLOW ones. True auto-exec belongs at PreToolUse:Read with `verifiedOffload` (`scripts/lib/ollama-verified-offload.mjs`, the built-but-unwired keystone -- its `fallback` param IS the Sonnet-fallback), gated to NON-edit reads only.

Audit **P1-9** (stale /ollama-bridge model ref) was MOOT -- already resolved (no hardcoded tag). [[feedback_read_full_content_not_titles]] [[feedback_never_claim_absence_without_deep_search]]
