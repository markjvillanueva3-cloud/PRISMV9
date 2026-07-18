---
name: reference-audit-token-savings-2026-05-17
description: Token-savings audit findings + META artifact location — re-run via scripts/token-savings-rank.mjs
aliases: reference_audit_token_savings_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.473Z
---


# 2026-05-17 token-savings audit (lima)

PRISM's token-savings layer is **mostly write-only**: writers populate state but reader-hooks aren't wired. Findings (2 P0 / 5 P1 / 1 P2):

- **P0 F2** — MEMORY.md 24,603B / 24,576B ceiling (-27B headroom) — truncating fleet-wide RIGHT NOW. Same regression fired 2026-05-16; one-shot compress re-grew in <1 day. Watchdog advises, doesn't auto-act.
- **P0 F3** — Ollama offload 9.6% vs 30% target. [[reference_fleet_reaper|fleet-reaper]]-coordinator fires 440× with 0 conversions. Fix: drop INJECT_THRESHOLD 0.90→0.80, remove `/`-prefix skip at ollama-auto-router.mjs:166.
- **P1 F1** — RTK filter hook NOT installed; 65% archive entries carry "No hook installed". 0 rtk-* hooks wired. CLI not on PATH. Fix: `rtk init -g`.
- **P1 F4** — Ollama suggestion UI dark (2 injected / 868 silent = 0.23%). Closes the loop on F3.
- **P1 F5** — error-pattern-promote 99.83% no-op (2412/2417 fires). Pure overhead — add early-exit OR move to T4 async dispatcher.
- **P1 F6** — Bundle-aware ~373 of 523 hooks (~71%) appear orphan. Raw 513 zero-fire is misleading because 9 bundles fire ~140 child .mjs files indirectly. Peer reviewer caught this.
- **F8 — RETRACTED (was P1, now P2)** — the "cache reader-path dead / 0 hits" finding was a MISDIAGNOSIS. `file-read-cache.mjs` IS the reader (PreToolUse:Read deny-dedup hook via read-bundle.mjs); it saves by DENYING re-reads — entry shape `{ts,path}`, no `.hits` field. The META probe summed a phantom `.hits` → false 0. Corrected 2026-05-17: probe now measures entry freshness; F8 only fires P2 if a dedup cache's newest entry is >48h stale. Same bug class as the 2026-05-16 "assume schema without reading the file" regression.
- **P2 F7** — CLAUDE.md 610 lines / 115KB violates "≤200 lines" self-rule. Initial audit claimed 3,200 lines (5× overstated) — peer reviewer corrected.

**META artifact**: `H:/prism/scripts/token-savings-rank.mjs` — re-runnable, exits 0/1/2/3, appends to `state/shared/token-savings-history.jsonl`. Run via `node scripts/token-savings-rank.mjs --json --history`. Baseline snapshot recorded 2026-05-17T15:45Z.

**Doctrine pattern**: "writer-without-reader" is the dominant token-savings failure mode in PRISM. Auditing the savings layer = finding where the conversion step from measurement → action is unwired.

**Peer reviewer**: agent a0310b5d6 (isolation:worktree) returned FIX-FIRST → 3 revisions + 1 missed finding upgrade applied.

**Cross-refs**: `state/shared/specs/AUDIT-TOKEN-SAVINGS-2026-05-17.md` + `.html` · `knowledge/wiki/architecture/audit-token-savings-2026-05-17.md` · sibling memories [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]], [[reference_token_budget_telemetry]], [[reference_ollama_cost_routing]].

**/loop registration**: `/loop --interval 7d --max 4 'node H:/prism/scripts/token-savings-rank.mjs --history'`.
