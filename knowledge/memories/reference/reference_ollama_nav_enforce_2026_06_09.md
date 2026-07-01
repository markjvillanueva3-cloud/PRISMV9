---
name: reference_ollama_nav_enforce_2026_06_09
description: "U-OLLAMA-NAV-ENFORCE (slot:alpha, commit 36105372ec) -- auto-surface the DORMANT ollama-prism-bridge on codebase-navigation intent. The local-LLM codebase-nav capability (7 read-only tools, ~0 Claude tokens) + /ollama-bridge skill existed but were dormant (route take-rate 0.4%, offload 7% vs 30% target). New UserPromptSubmit hook ollama-nav-enforce-inject.mjs fires ONLY on nav-verb AND codebase-noun, injects the ready-to-run bridge command, advisory (no quality loss), per-session-per-question dedup, telemetry into byHook[ollama-nav-enforce].suggested. Directive: 'enforce ollama for searches/reads/navigating the codebase.'"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.679Z
aliases: reference_ollama_nav_enforce_2026_06_09
---


# ollama-nav-enforce -- route codebase navigation to the local LLM (2026-06-09, slot:alpha)

Operator directive (post-compact refined /goal): *"exhaustively max out local-LLM
utilization ... ENFORCE using ollama for searches, reads, navigating the codebase ...
no loss of quality."* Shipped the alpha-lane enforcement slice.

## The key insight: the capability was BUILT but DORMANT
PRISM already had `scripts/ollama-prism-bridge.mjs` -- an agentic harness where a
LOCAL Ollama model autonomously chains SEVEN read-only tools (viz_search,
wiki_lookup, read_excerpt, obsidian_lookup, dispatcher_map, semantic_search,
mcp_call) to answer a multi-step "where is X / how does Y / what wires to Z"
investigation at ~0 Claude tokens -- plus a manual `/ollama-bridge` skill. But it
was DORMANT: route-savings take-rate ~0.4% (38/9967 fires), ollama-offload ~7% vs
the 30% target. No hook auto-surfaced it; the skill had triggers but was NOT in
INVOKE_NOW, so skill-auto-trigger only emitted a generic low-salience suggest.
**The gap was enforcement/auto-utilization, NOT a missing build.** (R8 lesson:
check what's built-but-dormant before building new.)

## What shipped (commit 36105372ec)
- `.claude/hooks/ollama-nav-enforce-inject.mjs` (NEW UserPromptSubmit hook). Fires
  ONLY on high-confidence nav-intent: a **nav-verb AND a codebase-noun** must both
  appear -- so "how does a lathe work" (domain) never fires, but "how does the
  slot-claim system work, which files" (codebase) does. Injects the ready-to-run
  `node scripts/ollama-prism-bridge.mjs "<question>"`. ADVISORY, never a hard block
  (honors no-quality-loss -- a hard block on a read needed for an edit would lose
  fidelity). Per-session-per-question dedup via `scripts/lib/session-once-gate.mjs`
  so the identical suggestion never re-injects (alpha's own efficiency mandate).
  Bumps `byHook[ollama-nav-enforce].suggested` in ollama-offload-stats.json -- which
  the existing `ollama-route-check-inject` health hook already reads (decisions =
  offloaded+kept+suggested), so the 7%->30% climb is measurable.
- `.claude/hooks/__tests__/ollama-nav-enforce-inject.test.mjs` (8 tests: happy +
  domain-reject load-bearing case + slash/long/already-routing/empty failures +
  quote-injection + dedup-key adversarial).
- `.claude/commands/ollama-bridge.md` (gitignored, edited on disk): fixed 3
  doc-drift LIES (R12) -- "three tools"->seven, default model `3b`->`32b` (actual
  DEFAULT_MODEL at ollama-prism-bridge.mjs:75), "does NOT call live MCP"->`mcp_call`
  shipped. Added the nav-enforce auto-surface pointer.
- Wired as an individual UserPromptSubmit entry in settings.json:1252 (C: + mirrored
  H:), near master-index-precheck-inject / ollama-pipeline-injector.

## Verification (R15: wire->test->validate->all-galaxies)
- 8/8 tests; LIVE: nav->inject runnable cmd, dup->dedup-suppressed, "how does a
  lathe work"->no-fire, disable-knob->suppress, exactly 1 telemetry bump across 4
  invocations (deduped/skipped/disabled correctly did not count).
- 3-of-3 scrutiny PASS (reviewers A/B/C), zero P0/P1. Confirmed: fail-safe every
  path, operator-/goal self-trigger triple-gated (slash + 1200-char cap + verb^noun),
  fleet-concurrency-safe temp+rename telemetry, ReDoS-safe flat-alternation regexes,
  sanitizer strips quote/backtick/dollar/backslash (suggestion is non-executed).
- APPLY-TO-ALL-GALAXIES: session-generic hook -> fires for every slot's nav prompt
  across all 26 chats from ONE wiring (R15 step-4 satisfied by construction).

## LIVE FINDING (high-value, routed to bravo U5b) -- the bridge default model is broken
Validating the value chain end-to-end (R15) surfaced a real blocker: the bridge's
DEFAULT_MODEL `qwen2.5-coder:32b` does NOT emit native Ollama tool-calls -- it
returns the tool-call as plain TEXT, so the agent loop executes 0 tools and the
bridge returns garbage. PROOF (live, 2026-06-09 on DESKTOP-N7MI1VB):
- bare default -> "(no tools used -- answered directly)", returned the raw
  `{"name":"dispatcher_map",...}` JSON as the answer.
- `--model gpt-oss:20b` -> chained 4 REAL tools (viz_search -> dispatcher_map ->
  wiki_lookup -> read_excerpt), ~1670 tok gathered locally, correctly found
  `prism_calc / calcDispatcher` for cutting force.
This likely explains a chunk of the 0.4% bridge take-rate (anyone who tried the
default got garbage). ROOT FIX = bridge DEFAULT_MODEL (bravo's U5b "native
tool-calling") -- routed to bravo via AGENT_CHAT, NOT edited by alpha. Mitigation
shipped (commit be52720b32): alpha's nav suggestion pins `--model gpt-oss:20b`
(env PRISM_OLLAMA_NAV_BRIDGE_MODEL) so routing does not lose quality today.
Resident tool-capable models on this box: gpt-oss:20b, gpt-oss:120b (the 1.5b/32b
coders + qwen3-vl vision are NOT reliable tool-callers). Commits: 36105372ec
(hook+test+wiring) + be52720b32 (model-pin).

## Lane discipline
Stayed OUT of bravo's engine-routing (U3-U7: ModelRoutingEngine / ask-ollama
DEFAULT_MODEL / OllamaHookBridgeEngine). This hook is the advisory/enforcement
seam (alpha: route-before-grep), not model routing. Clone of the
`wiki-read-offload-advisory.mjs` pattern (the READ sibling; this is the NAV sibling).

## Next-fire follow-ups (P2, deferred; this fire shipped the core)
1. **Tune CODEBASE_NOUN_RE recall/precision** once telemetry shows noise -- generic
   nouns (files/functions/routes) can co-fire on a borderline non-code question.
   Advisory+deduped so low harm, but worth a pass.
2. **PreToolUse:Grep advisory sibling** -- catch CLAUDE's OWN mid-task exploratory
   Grep (not just the operator prompt) and nudge to the bridge. Riskier (false-pos
   on targeted greps) -> needs the verb^noun precision applied to the grep pattern.
3. The bigger offload lever (bravo's U5b, ollama-prism-bridge native tool-calling)
   remains bravo's -- do not claim.

See [[reference_ollama_vision_single_source_2026_06_09]] (prior alpha ollama slice),
[[reference_ultracode_highvalue_discovery_2026_06_09]] (the ranked queue),
[[feedback_ollama_token_routing]] (the 30% offload target doctrine).
