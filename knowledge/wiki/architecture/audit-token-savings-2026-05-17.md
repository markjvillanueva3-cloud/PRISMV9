---
title: Token-Savings Audit — 2026-05-17 (lima)
tags: [audit, token-savings, ollama, rtk, memory-md, cache, hooks, forge-audit-v2]
created: 2026-05-17
slot: lima
chat: claude-77971357
shipped-with: /forge-audit-v2 token-savings
sibling-spec: state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md
sibling-html: state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.html
meta-artifact: scripts/token-savings-rank.mjs
peer-reviewer: agent a0310b5d6 (FIX-FIRST → revisions applied)
---

# PRISM token-savings audit — 2026-05-17

## Summary

Comprehensive audit of every token-saving measure PRISM ships. Two P0s (MEMORY.md actively truncating fleet-wide; Ollama offload rate 9.6% vs 30% target), five P1s (RTK filter hook not installed; Ollama suggestion UI dark; error-pattern-promote 99.8% no-op; ~373 bundle-aware orphan hooks; cache reader-path systemically dead across all 3 caches), one P2 (CLAUDE.md self-violating its own ≤200-line doctrine at 610 lines / 115KB).

**Single biggest leverage**: F3 (Ollama offload). 30% target × ~600 tasks/week unspent is the largest single token-saving surface PRISM ships. Currently delivering 1/3 of nameplate.

## Methodology

Boris-discipline pattern from BORIS-LOOP-AGENT-DOCTRINE.md:
1. Each finding declares its verification channel (`tool`, `expected_signal`, `re_run_cost`, `baseline`)
2. Peer-reviewer agent challenges findings (isolation:worktree) — must return PASS/FAIL per finding
3. No FAILs allowed in final audit — peer-reviewer surfaced 3 revisions + 1 missed systemic finding, all applied
4. META artifact (`scripts/token-savings-rank.mjs`) consolidates all signals into one re-runnable measurement (exit 0/1/2/3, history append)

## Verification channels (the load-bearing detail)

Every finding can be re-measured by anyone in <30s via:

```bash
node H:/prism/scripts/token-savings-rank.mjs --json --history
```

Sample channels:
- F1 RTK: `grep -c "No hook installed" state/shared/rtk-archive.jsonl`
- F2 MEMORY.md: `node scripts/memory-size-watch.mjs --json | jq .status`
- F3 Ollama: `node scripts/ollama-offload-dashboard.mjs --json | jq '.offloaded/(.offloaded+.keptOnClaude)'`
- F8 Cache: `node -e "['bash-result-cache','grep-result-cache','file-read-cache'].forEach(...)"`

## Key insight (Karpathy R12 — fail loud)

PRISM's token-saving infrastructure is **mostly write-only**. RTK has writers but no installed filter; Ollama has classifiers but most suggestions never surface to the operator; caches have populators but no reader-hooks. The pattern repeats: a measurement system exists, but the conversion step from measurement → action is unwired. The audit's value is naming this pattern: **writer-without-reader is the dominant failure mode in PRISM's savings layer**.

## Peer-review findings that became part of the audit

1. F6 framing tightened — raw "98.1% dead hooks" overstated; bundle-aware ~71% (~373 of 523)
2. F7 line count corrected — initial 3,200-line claim was 5× overstated; actual is 610 lines
3. F8 upgraded P2→P1 — initial "bash-result cold" was too narrow; the systemic finding is "cache reader-path dead across all 3 caches" (96 file-read keys / 0 hits proves fleet-wide gap)
4. Drift caveat added — live counters drift +/- 10% between snapshot and re-measurement

## /loop re-run

```
/loop --interval 7d --max 4 'node H:/prism/scripts/token-savings-rank.mjs --history && tail -1 H:/prism/state/shared/token-savings-history.jsonl'
```

Or invoke `/forge-audit-v2 token-savings` on a 7-day cadence for the full synthesis loop.

## Cross-refs

- Spec: `state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md` + `.html`
- META: `scripts/token-savings-rank.mjs` (110 LOC, re-runnable, history-append)
- History: `state/shared/token-savings-history.jsonl`
- Memory: [[reference_audit_token_savings_2026_05_17]]
- Sibling tools: [[synergy-regression-watch]] · [[memory-size-watch]] · [[hook-fire-rank]] · [[node-staleness-rank]]
- Patch-sibling for CLAUDE.md back-flow: `state/shared/dashboards/patches/CLAUDE-MD-PATCH-token-savings-audit.md`
- Related doctrine: [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] · [[feedback_settings_wiring_drift_2026_05_16]] · [[bug-findings-wiki-gate]]
