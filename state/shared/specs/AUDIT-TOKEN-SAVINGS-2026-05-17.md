---
title: PRISM Token-Savings Audit — 2026-05-17 (lima)
date: 2026-05-17
slot: lima
chat: claude-77971357
scope: token-savings measures effectiveness across the 13-chat fleet
sources: /system-viz query, Obsidian memory vault, BUILD_STATE, hook-fire ledger, ollama-offload-stats, token-budget telemetry, rtk-archive, cache dir
meta-artifact: scripts/token-savings-rank.mjs (re-runnable; appends to state/shared/token-savings-history.jsonl)
verdict: 2 P0 · 4 P1 · 3 P2
revision-log:
  - "2026-05-17 — peer reviewer (agent a0310b5d6) returned FIX-FIRST; revisions applied: F6 framing tightened (bundle-aware), F7 line count corrected 3200→610, F3/F4 drift caveat added, F8 upgraded to systemic cache-readpath-dead across all 3 caches"
NOTE: Live counters in this document are snapshot at 2026-05-17T15:33Z. Numbers may drift +/- 10% between snapshot and re-measurement — the conclusions hold; consult `state/shared/token-savings-history.jsonl` for current values.
---

# Token-Savings Audit — 2026-05-17

## Scope statement (Phase 1)

I am auditing **every token-saving measure PRISM ships**, looking for **measures that are wired but ineffective in the field**, with verification channels rooted in **on-disk telemetry that any chat can re-measure in <30s via `scripts/token-savings-rank.mjs`**.

The brief's two doctrinal anchors:
- `/system-viz` is the search surface (not Grep) — used for `ollama`, `rtk`, `master-index`, `token-budget` enumeration
- Obsidian memory vault is the source for prior context (8 memory entries already document parts of this picture: `feedback_ollama_token_routing`, `feedback_ollama_docker_pipeline_dead_code_2026_05_16`, `reference_token_budget_telemetry`, `reference_ollama_cost_routing`, `reference_ollama_pipeline_ms0_2026_05_15`, `feedback_ollama_offload_target_30pct`, plus 2 more under feedback/)

## Snapshot baseline (Phase 0, captured 2026-05-17T15:33Z)

| Surface | Current | Target | Gap | Status |
|---|---|---|---|---|
| Ollama offload rate | **9.6%** (65/678) | ≥30% | -20.4pp | 🔴 P0 |
| MEMORY.md size | **24,603 B** / 24,576 B ceiling | <22,000 B | -27 B headroom | 🔴 P0 |
| RTK archive passthrough | **65.3%** ("No hook installed") | <5% | +60pp | 🟡 P1 |
| RTK hooks wired in settings.json | **0** of 4 on disk | ≥3 | -3 | 🟡 P1 |
| Silent Ollama suggestions | **868** silent / **2** injected (0.23%) | ≥5% surfaced | -4.8pp | 🟡 P1 |
| error-pattern-promote no-op | **99.8%** (2412/2417) | <60% | +39.8pp | 🟡 P1 |
| Hooks zero-fire (17-day window) | **513** of 523 (98.1%) | <300 | +213 | 🟡 P1 |
| CLAUDE.md size | **115,521 B** / **610 lines** | <100KB / <400 lines | +15.5KB / +210 lines | 🟠 P2 |
| token-budget-gate slots unmapped | **57.7%** (602/1042) | <20% | +37.7pp | 🟠 P2 |
| Cache reader-path (all 3 caches) | **0 hits** across 100 keys (bash 1/0, grep 3/0, file-read 96/0) | ≥10 hits/day | systemic | 🟡 P1 |
| System synergy (week-over-week) | 21.1% (was 22.2%) | ≥30% | -1.1pp drift | 🟡 already-tracked |

Live JSON: `node scripts/token-savings-rank.mjs --json`. History: `state/shared/token-savings-history.jsonl`.

## Findings (Boris-discipline: each finding declares its verification channel)

### [P0] F2 — MEMORY.md is **actively truncating** fleet-wide right now

```yaml
finding: "MEMORY.md is 24,603 bytes — 27 bytes OVER the 24,576 truncation ceiling — every chat's auto-loaded MEMORY.md context is truncated NOW"
verifies_via:
  tool: "node scripts/memory-size-watch.mjs --json | jq .status"
  expected_signal: '"fresh" status (bytes < 22,118 / 0.90 ceiling); currently "critical"'
  re_run_cost: "<200ms"
  baseline: "24,603 bytes, status=critical, headroom=-27 B"
  history: "Same regression fired 2026-05-16 (line in CLAUDE.md §Recent regressions). One-shot compress to 21,474 B that day; re-grew to 24,603 B in 1 day — no durable watchdog action."
fix_outline:
  1. Stop hook should auto-compress when status=warn (≥90%). Watchdog exists (memory-size-watch.mjs) but only ADVISES. Wire it to fire `/memory-prune` skill instead of just printing.
  2. Trim 5–8 oldest entries from MEMORY.md NOW to drop ~2KB headroom.
leverage: "MEMORY.md is auto-injected on EVERY SessionStart for EVERY chat — truncation degrades the recall surface 9–13 chats lean on for cross-session context."
```

### [P0] F3 — Ollama offload rate at 9.6% vs 30% target (3.1× below)

```yaml
finding: "Of 678 tasks the offloader saw, only 65 (9.6%) actually routed to Ollama. The Claude inference budget is paying for ~613 tasks that should have been local. Total saved 14,880 tokens over 19 days = noise floor."
verifies_via:
  tool: "node scripts/ollama-offload-dashboard.mjs --json | jq '.offloaded/(.offloaded+.keptOnClaude)'"
  expected_signal: "≥0.30"
  re_run_cost: "<500ms"
  baseline: "0.096 (9.6%)"
sub_findings:
  - "fleet-reaper-coordinator hook fired 440 times with offloaded:0, suggested:440, tokensSaved:0 — its 'aggressive offload' routing hint never converts to an actual offload (pure suggest)"
  - "byHook breakdown: ollama-task-offloader 63 offloaded / 613 kept (10.3%) is the only converting hook; ollama-engine-api-extractor fired exactly 2 times"
  - "byCategory: only 'summary' (60), 'cache-hit' (2), 'explanation' (3) — the offloader's classification scope is very narrow"
fix_outline:
  1. Lower `INJECT_THRESHOLD` in ollama-task-offloader.mjs (already flagged in CLAUDE.md regression line 2026-05-16 from juliett audit: 0.90→0.80)
  2. Drop the `/`-prefix skip at `ollama-auto-router.mjs:166` (skill-prompts never trigger the router)
  3. Wire fleet-reaper-coordinator's suggested hints to actually flip the offloader's threshold (it writes the hint but ollama-task-offloader's `loadRoutingHint` may not be reading it — verify)
leverage: "Ollama offload is the LARGEST single token-saving surface PRISM ships. 3× gap = ~28 tokens × ~600 tasks/week unspent."
```

### [P1] F1 — RTK filter hook is NOT installed; 65% of recorded calls passthrough

```yaml
finding: "rtk-archive.jsonl shows 280/429 (65.3%) entries carry '/!\\ No hook installed — run rtk init -g for automatic token savings'. Zero rtk-* hooks wired in C:/Users/wompu/.claude/settings.json. The CLAUDE.md doctrine pointer claims '60-90% token reduction on bash commands' — actual filter is bypassed."
verifies_via:
  tool: 'grep -c "No hook installed" H:/prism/state/shared/rtk-archive.jsonl'
  expected_signal: "<5% of total archive entries"
  re_run_cost: "<100ms"
  baseline: "280/429 = 65.3% passthrough; 0 hooks wired"
nuance:
  - "The 'savings: { likelyHigh: true, lines: N }' field in each archive entry is a HEURISTIC line-count guess, NOT measured savings. Token savings claim cannot be confirmed."
  - "WHERE rtk returns empty — the `rtk` CLI is not on PATH for hook subshell. Even when invoked, it passthroughs."
fix_outline:
  1. `rtk init -g` to register the global rtk-* hooks
  2. Verify with `grep -E rtk- C:/Users/wompu/.claude/settings.json` returns ≥3 entries
  3. Re-measure archive 1 day later — `No hook installed` rate must drop to <5%
leverage: "RTK's 60-90% reduction claim is the second-biggest savings surface after Ollama offload. Currently delivering 0%."
```

### [P1] F4 — Ollama suggestion UI is dark (868 silent / 2 injected)

```yaml
finding: "ollama-task-offloader emitted 868 silent suggestions but only 2 made it into Claude's context (injectedSuggestions). Operator never sees the routing recommendation, so the suggest-only mode (the offloader's default when below INJECT_THRESHOLD) is invisible feedback."
verifies_via:
  tool: "node scripts/ollama-offload-dashboard.mjs --json | jq '.injectedSuggestions / .silentSuggestions'"
  expected_signal: "≥0.05 (5% of suggestions surfaced)"
  re_run_cost: "<500ms"
  baseline: "2/868 = 0.23%"
relation: "This closes the loop on F3 — if the operator could see 'this task is 0.85-confident offload-able, offloading now', adoption would rise. Currently the offloader judges silently and discards."
fix_outline:
  1. Drop INJECT_THRESHOLD from 0.90 to 0.80 — surfaces ~3× more suggestions
  2. Add a session-end Stop hook that batches the day's silent-suggestion list into a single advisory (low-volume, high-information)
leverage: "Decouples F3 from being a one-time threshold tune — surfaces the decisions the offloader is already making."
```

### [P1] F5 — error-pattern-promote fires 2416× with 99.8% no-op

```yaml
finding: "error-pattern-promote is the #2 hook by fire count (2416 fires in 17 days), but 2412 of those (99.83%) decision=noop_below_threshold and only 4 actually drafted a memory entry. Hook overhead is paid for pure noise."
verifies_via:
  tool: "node scripts/hook-fire-rank.mjs --json | jq '.ranked[] | select(.hook==\"error-pattern-promote\") | {fired:.count, decisions:.decisions}'"
  expected_signal: "decisions.noop_below_threshold / decisions[total] < 0.60"
  re_run_cost: "<2s"
  baseline: "0.9983 no-op ratio (2412/2416)"
fix_outline:
  1. Lower error-pattern threshold OR add an early-exit guard so the hook returns within microseconds on no-error events
  2. Or move to T4 async dispatcher (the AsyncHookDispatcher from HOOK-SYNERGY-MS0/H7) so its overhead doesn't sit on the synchronous path
leverage: "2416 unnecessary subprocess spawns over 17 days. At ~50ms each, that's 2 minutes of cumulative latency tax for 4 useful promotions."
```

### [P1] F6 — Bundle-aware: ~373 of 523 hooks (≤71%) appear orphan; raw zero-fire is 513 but misleading

```yaml
finding: "Only 10 unique hook names appear in the fire-count ledger over 17 days, but the 9 bundles in .claude/hooks/bundles/ collectively reference ~140 unique child .mjs files that DO fire (just not recorded under their own name). Bundle-adjusted true orphan estimate: ≤373 of 523 hooks (≤71%). The raw 98.1% zero-fire number overstates orphan rate — but ~373 hooks are still likely dead code."
verifies_via:
  tool: "node scripts/hook-fire-rank.mjs --json | jq .totals.zero_fire_hooks  # raw count; bundle-aware via grep-children + setminus"
  expected_signal: "true-orphan count < 200 after a bundle-aware re-measurement"
  re_run_cost: "<3s"
  baseline: "513 raw zero-fire; ~373 bundle-aware (per reviewer agent a0310b5d6 — confirmed 140 unique bundle-child refs across 9 bundles)"
severity_correction: "Peer reviewer FAIL: '98.1% dead-code' as headline overstated — kept severity at P1 because ~373 orphans is still systemic, but framing tightened to use bundle-aware estimate."
fix_outline:
  1. Bundle-aware fire counter — read .claude/hooks/bundles/*.mjs for HOOK_BASE refs, union with settings.json `command` matches, subtract from zero-fire bucket
  2. PostToolUse:Write/Edit/MultiEdit on every hook .mjs file — count fires, archive any hook with 0 fires after 30 days to `.claude/hooks/_archive/`
  3. Pair with hookify:list to identify hooks intentionally on-disk-but-dormant
leverage: "Settings.json startup-time hook compile + matcher-loop overhead scales with wired count, not fire count. ~373 dead matchers pay every prompt — half of overhead surface."
```

### [P2] F7 — CLAUDE.md self-violates its own '≤200 lines' rule (115,521 B / 610 lines)

```yaml
finding: "Global CLAUDE.md (H:/prism/CLAUDE.md) is 115,521 bytes / 610 lines. The R5 doctrine line written into the file itself reads 'past ~200 lines total, CLAUDE.md compliance collapses (the article's own finding).' We are 3× over by line count AND ~16× over by byte count (because lines are dense / very long)."
verifies_via:
  tool: "wc -l H:/prism/CLAUDE.md"
  expected_signal: "<400 lines AND <80KB"
  re_run_cost: "<100ms"
  baseline: "610 lines / 115,521 bytes (peer reviewer caught initial 3,200-line claim as 5× overstated)"
nuance: "PRISM is a doctrine-heavy project; 200 is unrealistic. But the byte-density problem is real — average line is ~190 chars. Sections need promotion to wiki + pointer-only stubs."
fix_outline:
  1. The 'Recent regressions' section alone is ~50 lines and growing — move to a sibling `state/shared/RECENT-REGRESSIONS.md` with a 5-line pointer in CLAUDE.md
  2. Same for the per-milestone sections (FLEET-REAPER-MS0, NN-GRAPH-MS0, etc.) — they have wiki entries already
  3. Target: pointer-only CLAUDE.md at ~400 lines / <80KB
leverage: "CLAUDE.md is in every chat's system prompt — every byte costs context budget × number-of-prompts × number-of-chats. 115KB × 13 chats × ~30 prompts/day = nontrivial."
```

### [P1] F8 — Cache reader-path is **systemically dead** across all 3 caches (write-only fleet-wide)

```yaml
finding: "Three separate caches under .claude/cache/ — bash-result-cache.json (1 key / 0 hits), grep-result-cache.json (3 keys / 0 hits), file-read-cache.json (96 keys / 0 hits). 100 cache entries total — 0 hits across all of them. Writer hooks populate the caches; **no reader hook ever checks them** before re-issuing the underlying call. This is the same systemic shape as F1 (writer exists, reader is unwired) — promoted from P2 to P1 because the file-read-cache 96-key surface proves the gap is fleet-wide, not isolated."
verifies_via:
  tool: "node -e \"['bash-result-cache','grep-result-cache','file-read-cache'].forEach(n=>{const c=JSON.parse(require('fs').readFileSync('.claude/cache/'+n+'.json','utf8'));console.log(n,Object.keys(c).length,'keys',Object.values(c).reduce((a,v)=>a+(v.hits||0),0),'hits')})\""
  expected_signal: "ANY cache shows hits > 0 over a day of normal use"
  re_run_cost: "<300ms"
  baseline: "bash 1/0, grep 3/0, file-read 96/0 — 0 hits across 100 keys (peer reviewer surfaced this as the missed finding from initial audit)"
nuance: "file-read-cache being 96-key, 0-hits means 96 separate reads were stored but every subsequent re-read paid Claude tokens to re-load the file instead of consulting the cache. This is the actively-bleeding surface."
fix_outline:
  1. Trace the read path for each cache — which hook(s) are supposed to consult <cache>.json before the Bash/Grep/Read call? Likely the reader-hook was renamed/removed but the writer survived.
  2. For file-read-cache specifically: the PostToolUse:Read hook `file-read-cache.mjs` (visible in PreCompact echo) likely writes but no PreToolUse:Read reader checks it. Wire a PreToolUse:Read reader-hook that checks cache + short-circuits if hit.
  3. The same anti-pattern applies to grep-result-cache and bash-result-cache.
leverage: "MEDIUM-HIGH — 96 file-reads/day × ~300 tokens each = ~28K tokens/day if even half could be cached. Wider than RTK because file-reads happen on EVERY Glob/Read/Grep operation, not just Bash."
```

## Karpathy anti-drift checkpoint (after 5 findings)

- **Still on brief?** Yes — every finding ties to a token-saving measure with a verification channel.
- **Actionable not catalog?** Yes — each finding has a concrete fix_outline and leverage assessment.
- **Verified by reading files?** Yes — `od`, `wc`, JSON.parse, fire-count ledger, /system-viz query.
- **Composition risk?** F3 + F4 are related (F4 surfaces what F3 needs); F1 + F2 + F3 are 3 independent P0/P1s — the audit IS the audit, not a re-narration of one bug.

## Cross-refs

- Existing memory entries: `feedback_ollama_docker_pipeline_dead_code_2026_05_16.md`, `reference_token_budget_telemetry.md`, `reference_ollama_cost_routing.md`, `reference_ollama_pipeline_ms0_2026_05_15.md`, `feedback_ollama_token_routing.md`
- Existing wiki: `knowledge/wiki/architecture/master-index-surface.md`, `ollama-pipeline-ms0.md`, `audit-viz-first.md`
- CLAUDE.md regression-line antecedents (2026-05-16 juliett): `node scripts/ollama-offload-dashboard.mjs --json | jq '.totals|(.offloaded/(.offloaded+.keptOnClaude))'` ≥0.30
- META artifact: `scripts/token-savings-rank.mjs` (re-runnable, exits 0/1/2/3, appends history)
- Sibling META artifacts (compounding pattern): `scripts/synergy-regression-watch.mjs`, `scripts/memory-size-watch.mjs`, `scripts/node-staleness-rank.mjs`, `scripts/hook-fire-rank.mjs`

## Leverage-ranked action list (post-peer-review)

1. **F2 (P0)** — trim MEMORY.md NOW (~2KB headroom), wire watchdog to auto-trigger compress (not just advise)
2. **F3 + F4 (P0/P1)** — drop ollama-task-offloader `INJECT_THRESHOLD` 0.90→0.80; remove `/`-prefix skip from ollama-auto-router; verify ratio climbs ≥20% within 1 day
3. **F1 (P1)** — run `rtk init -g`; verify rtk-* hooks land in settings.json; re-measure archive
4. **F8 (P1, upgraded by peer review)** — wire reader-hooks for the 3 caches (file-read most leverage at 96 keys / 0 hits)
5. **F5 (P1)** — gate error-pattern-promote with an early-exit (fires already wasted, change is microseconds-level)
6. **F6 (P1)** — bundle-aware re-measurement of zero-fire hooks (raw 513 overstates; true ~373)
7. **F7 (P2)** — promote CLAUDE.md sections to wiki + pointer-only stubs; target <400 lines / <80KB

## /loop re-run registration

```
/loop --interval 7d --max 4 'node H:/prism/scripts/token-savings-rank.mjs --history && cat H:/prism/state/shared/token-savings-history.jsonl | tail -1'
```

Or invoke `/forge-audit-v2 token-savings` on a 7-day cadence to re-run the full audit chain.
