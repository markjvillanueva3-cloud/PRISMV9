---
title: "reference-graph-octopus-autowire-ms0-2026-05-22"
name: reference-graph-octopus-autowire-ms0-2026-05-22
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_graph_octopus_autowire_ms0_2026_05_22.md
promoted_at: 2026-06-06T04:55:53.437Z
source_refs: 3
---

# GRAPH-OCTOPUS-AUTOWIRE-MS0 close-out — 17/17 units shipped 2026-05-22 (slot echo)

User work order (2026-05-22 echo session continued post-/compact): "continue with master index graph, octopus and graph aware tool hooks" + standing `/goal [do everything in logical ROI order | all gaps filled, all tasks completed and wired] /loop` directive. Closes three connected gaps in PRISM's own AI/awareness infrastructure that the audit surfaced as silent under-utilization.

## Three gaps, three tracks, all closed

### Track B (B1-B5) — master-index graph freshness + autoupdate
**Gap:** `system-graph.json` (412 MB → 452 MB now) ran 9.5h stale because the `.git/hooks/post-commit` spawn discarded its exit code (`>/dev/null 2>&1`). The graph exceeds master-index-search-lib's 200 MB load cap, so search depends entirely on the 109 MB sidecar; when stale, the staleness gate rejected it and degraded fleet search to a 20K-node `architecture-graph.json` fallback.

**Shipped:**
- **B1** root-cause: crashed pid lock + Windows PID-reuse phantom + silent skip from the `>/dev/null` redirect + missing completion sentinel + orphaned regen-viz OOM under host memory pressure.
- **B2** TTL backstop on the shared write-lock + `.last-successful-regen.json` sentinel (35/35 tests).
- **B3** sidecar rebuild chained into `system-viz-on-commit.mjs` (the dominant graph writer never rebuilt it; `regen-viz.mjs` did but ran less often). Rebuilt the sidecar immediately — 258,874 nodes / 111.9 MB / 16.5 s — fleet search un-degraded.
- **B4** `.last-regen-failure.json` companion marker (script-managed, captures stage/exit/signal/stderr) + new Stop hook `stop-graph-staleness-backstop.mjs` (T3, fleet-shared throttle, default-on, 3h staleness threshold; 21+14 tests).
- **B5** new SessionStart hook `sessionstart-graph-staleness-inject.mjs` (T2, 4-branch advisory: failure > graph-missing > graph-stale > sidecar-stale; 15 tests).

### Track A (A1-A6) — graph-aware tool hooks (Grep / Write / Bash)
**Gap:** Only `pre-read-graph-inject.mjs` consulted the master graph; Grep / Write / Bash did not, and key derivation was a crude basename.

**Shipped:**
- **A1** shared `scripts/lib/graph-key-derive.mjs` — `deriveGraphKeys({input, tool: "read"|"grep"|"write"|"bash"})`. Bash is NARROW: returns [] for any verb not in `FILE_SEARCH_CMDS` (grep/rg/find/cat/head/tail/ls), walking past env-prefixes + `rtk` wrapper. Reuses `tokenize` from `master-index-search-lib.mjs` so STOPWORDS + MIN_TOKEN_LEN are single-source-of-truth (27 tests).
- **A2/A3/A4** three new PreToolUse hooks: `pre-grep-graph-inject.mjs` (10 tests), `pre-write-graph-inject.mjs` (10 tests; ADVISORY duplicate-detect nudge, never blocks), `pre-bash-graph-inject.mjs` (11 tests; quiet on the 95% of bash invocations that aren't file searches).
- **A5** refactored `pre-read-graph-inject.mjs` onto the shared lib — `deriveQueryKey` replaced with `deriveGraphKeys({tool: "read"})`. R7-surface deviation: the unit spec said "preserve existing tests" but the shared lib's array+lowercase contract is structurally incompatible with the old string+case-preserving `deriveQueryKey`, so 16 derivation unit tests were replaced with E2E tests through the shared lib (single source of truth in `graph-key-derive.test.mjs`). All 4 PreToolUse graph hooks now share ONE derivation core.
- **A6** wired all 3 new hooks into `C:/Users/wompu/.claude/settings.json` PreToolUse chain (c-to-h-mirror replicated). LIVE-FIRE CONFIRMED in the implementing chat: pre-grep fired on this session's own grep for the wiring, surfacing 3 master-graph nodes — proving the hook is live in the fleet.

### Track C (C1-C6) — octopus 5-LLM consensus auto-invoke repair
**Gap:** Consensus engine + 5 voice clients + 4 hooks were all built but `consensus-model-performance.json` was frozen at "2026-05-05 n=1 ema=0" — the system had never meaningfully run. User's exact phrasing: "we need octopus auto invoked when we need it. I don't think we've ever used it."

**Shipped:**
- **C5** new operator CLI `scripts/octopus-setup.mjs` — probes the 5 voices (anthropic / codex / ollama / xai / google) and prints per-voice remediation. Live on this PC: 3/5 ready (anthropic + ollama-8models + google; missing codex auth + XAI_API_KEY). Exit 0 if ≥3 ready — usable in CI gating. 21 tests.
- **C1** drain mechanism verified end-to-end. Root cause of the 72-entry backlog was the missing `dist/engines/*.js` build (the unit description literally named it). Now the dist exists; the drainer + Stop hook both work. Live verification: drained 4/54 in a session; persistence + recallability confirmed via the processed JSONL audit. Backlog drains naturally via the Stop hook ×~11 fleet chats.
- **C6** WIRE-EXEMPT stubs replaced with REAL engines. `PRISMContextInjectorEngine.ts` now lazy-imports `master-index-search-lib.mjs`, runs BM25 over the 258K-node graph, composes a `### Relevant PRISM context` blob (capped, clamped). `ConsensusModelPerformanceEngine.ts` now has real `loadState` (fail-open on missing/invalid/wrong-shape) + `recommendVendors` (3-branch keep-set ladder: cold-start keep-all / signal nonZero≥floor / partial pad-to-floor; floor clamped to available.length so consensus can NEVER collapse below floor) + new pure `recordOutcome` with canonical EMA update. Old `ctx.text` / `rec.ranked` tsc errors are now CLEAN. 32 tests.
- **C2 + C3 + C4** subsumed in one disciplined hook `auto-consensus-sync-bash.mjs` — PreToolUse:Bash, gated by a 5-class irreversibility classifier (`git-force-push`, `git-hard-reset`, `git-branch-force-delete`, `rm-recursive-force`, `git-clean-force`). DEFAULT behavior: match → ASK with class name (zero LLM cost). OPT-IN (PRISM_AUTO_CONSENSUS_SYNC_BASH=1): match → sync 5-LLM consensus with 10 s timeout → translate verdict to ask|allow. SAFETY INVARIANT hard-asserted in tests: a classified destructive command can ONLY reach allow via consensus rec="accept"; every other branch (default, disable-knob, engine-missing, timeout, throw, escalate, review, classifier-throw) → ASK. 26 tests.

## R7 deviations surfaced (CLAUDE.md doctrine)

- **U-GO-A5** "preserve existing tests" vs "single source of truth" — picked the latter; `deriveQueryKey`'s case-preserving string contract is structurally incompatible with the shared lib's lowercased-array contract. The 16 deleted unit tests are now covered once in `graph-key-derive.test.mjs` (single source). End-to-end behavior preserved.
- **U-GO-C1** "the queue is not draining" turned out to be "the dist build was missing". The drainer + Stop hook were already correct.
- **U-GO-C5** reframed Track C scope mid-session: octopus is NOT dead, it's GRACEFUL-DEGRADED. The stubs threw, but every call site in `MultiModelConsensusEngine.ts` is try/catch-wrapped → fail-OPEN → consensus runs without context injection or perf-weighted vendor selection. C6's "3 tsc errors" premise was stale.
- **U-GO-C2 first scrutiny pass FAILED** — both reviewers caught real bugs: Arm A on safety-invariant breach (the `PRISM_AUTO_CONSENSUS_SYNC_DISABLE=1` knob short-circuited to silent allow BEFORE classification), Arm B on tautological `decision === "ask" || decision === "allow"` assertion. Fixed via classify-first reorder + deterministic engine-path env knob + stub-engine test pattern. Second pass both PASS, 0 P0/P1.

## Memory + wiki cross-refs

- Wiki: `knowledge/wiki/architecture/graph-octopus-autowire-ms0.md`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json` (17 close_out_log entries)
- Sibling milestone: see [[reference_session_continuity_stack_2026_05_15]] for the precedent of "audit your own substrate" milestones.

## Source

Promoted from memory [[reference_graph_octopus_autowire_ms0_2026_05_22]] (referenced 3x across the vault). The memory remains the editable source of truth.
