---
title: AUTOINVOKE-HITRATE-MS0 — Unified Fix Plan (skill + memory auto-invocation → high accurate hit rate)
date: 2026-05-19
slot: foxtrot
session: claude-6437979f
tool: /forge7 (plan-only — no build this session)
audits: state/shared/specs/SKILL-AUTOINVOKE-COVERAGE-AUDIT-2026-05-19.md (peer-reviewed) + memory audit (this session)
status: PLAN — awaiting approval; coordinate with concurrent memory chat before build
advisoryOnly: true
---

# AUTOINVOKE-HITRATE-MS0 — Unified Fix Plan

## Root cause (one paragraph)

PRISM's auto-invoke surfaces all use **keyword/substring matching**, and the one memory hook that fires on prompts (`memory-rag-inject.mjs`) is **orphaned** (not in settings.json; last fired 2026-05-10; even then `scanned=0`). The *semantic* retrieval capability already exists — `prism_memory:semantic_search`/`qdrant_vector_search`/`find_similar`, `ObsidianMemoryRagEngine`, warm `nomic-embed-text` — but **nothing auto-invokes it**. Fix = wire existing semantic retrieval into the auto-invoke hooks, on the right events, with hit-rate instrumentation. No new retrieval engine is built (duplication guard applies).

## Design spine

A single shared helper — `scripts/lib/semantic-retrieve.mjs` (the *one* genuinely new artifact) — wraps `prism_memory:semantic_search` (nomic-embed cosine; Qdrant when up, in-process fallback). Both `skill-auto-trigger.mjs` and the revived `memory-rag-inject.mjs` call it against their own corpus (trigger ledger / memory vault). One semantic core, two consumers. This is the synergy: today there are two independent keyword matchers; after, one embedding retriever feeding both.

## Phases (every unit carries a Phase-0.7 verification channel)

### Phase A — Baseline + coordinate (BLOCKS all build until done)

**U-A1 · Coordinate with the concurrent memory chat**
Post to chat bus; inventory exactly what index/engine that chat produced (keyword vs embedding; consumed or orphaned). Do not touch memory hooks until its scope is known.
```
verify: channel=integration · tool=`node .claude/helpers/agent-coordination.mjs post` + written inventory in this doc's §Memory-chat-inventory · expected=ack + artifact list · re_run=n/a
```

**U-A2 · Hit-rate baseline (before any fix)**
Read EXISTING telemetry — `recall-counter-track` counts, `post-memory-context-eval` scores, `skill-trigger-coverage.mjs`. Emit `state/shared/autoinvoke-hitrate-baseline.json`.
```
verify: channel=metric · tool=`node scripts/skill-trigger-coverage.mjs --json` + parse recall-counter/eval logs · expected=baseline JSON {skill_cov_pct, mem_precision_at3, mem_recall_rate} · baseline=skill 23.5%, mem recall ≈ 0 (memory-rag-inject dead) · re_run=5s
```

### Phase B — Memory: revive + de-orphan (highest leverage — currently 0)

**U-B1 · Re-wire `memory-rag-inject.mjs` into settings.json UserPromptSubmit**
It is orphaned. Restore the entry (C: settings.json → c-to-h-mirror propagates).
```
verify: channel=integration · tool=`grep -n memory-rag-inject "H:/.claude/settings.json"` + fire on a test prompt · expected=1 match + log line `triggered=...` (not absent) · baseline=0 matches, last log 2026-05-10 · re_run=10s
```

**U-B2 · Fix `ObsidianMemoryRagEngine` `scanned=0`**
Even when invoked it scanned ZERO vault entries — same class as the documented `memory-relevance-inject` "hardcoded foreign-user path → 0% recall" regression. Derive vault dir from `os.homedir()`; add a fail-loud assertion that scanned>0 when the vault is non-empty.
```
verify: channel=test · tool=`obsidianMemoryRagEngine.query({query:<known memory topic>})` · expected=scanned>0 AND ≥1 hit on a memory known to exist · baseline=scanned=0 hits=0 · re_run=3s
```

**U-B3 · Settings-wiring-drift guard**
The orphaning is the known `feedback_settings_wiring_drift_2026_05_16` class. Add the critical auto-invoke hooks to a settings-presence assertion (reuse the MINIMAL_ALLOWLIST / settings-audit pattern — do NOT build a new guard engine).
```
verify: channel=test · tool=drift-guard unit test: delete the entry → guard flags it · expected=BLOCK/advisory fires · baseline=no guard (silent un-wire) · re_run=2s
```

### Phase C — Memory: semantic upgrade + un-gate

**U-C1 · Swap disk-scan → semantic retrieval (REUSE, do not rebuild)**
`ObsidianMemoryRagEngine` calls the new `semantic-retrieve.mjs` → `prism_memory:semantic_search` (nomic-embed). Keep keyword scan as the offline fallback only.
```
verify: channel=eval · tool=precision@3 on a 30-query labeled set (queries→expected memory) · expected=precision@3 ≥ keyword baseline + 0.20 · baseline=measured in U-A2 · re_run=20s
```

**U-C2 · Un-gate from keyword-only**
Today it only triggers on `remember/recall/previous/...`. Replace with a semantic-relevance floor (mirror skill-auto-trigger's 0.65 surface gate) so a prompt that NEEDS a memory but doesn't say "remember" still retrieves.
```
verify: channel=eval · tool=recall-rate on the subset of the labeled set whose prompts contain NO recall keyword · expected=recall 0 → ≥0.5 · baseline=0 (gated out) · re_run=20s
```

### Phase D — Skill: close the high-ROI tail (bounded, NOT 394)

**U-D1 · `--exclude-wrappers` flag on `skill-trigger-coverage.mjs`** — makes the META number honest (raw 19.5% counts 104 wrappers).
```
verify: channel=test · tool=`node scripts/skill-trigger-coverage.mjs --json --exclude-wrappers` · expected=coveragePct == honest 23.5% · baseline=raw 19.5% · re_run=3s
```

**U-D2 · Author triggers + descriptions for the top ~40-60 dark-gap skills**
Rank via `high-roi-skill-rank.mjs`; generate `triggers:`/`description:` blocks by **embedding-similarity to nearest covered skill** (semantic-retrieve.mjs again — same spine), human-approve, not from scratch.
```
verify: channel=metric · tool=`skill-trigger-coverage.mjs --json` after re-extract · expected=honest coverage 23.5% → ≥40% · baseline=23.5% · re_run=5s
```

**U-D3 · Fix the 2 declared-but-broken** (`checkin-mike` remove block; `wedm-hook-disable` repair).
```
verify: channel=test · tool=`skill-trigger-coverage.mjs --json | .declaredNotCaptured` · expected=0 · baseline=2 · re_run=3s
```

### Phase E — MEMORY.md recall hole

**U-E1 · Recompact MEMORY.md under the 24.4 KB ceiling** (currently 32.5 KB → SessionStart index truncates = static-recall hole; known recurring regression with an existing watchdog).
```
verify: channel=metric · tool=`node scripts/node-staleness-rank.mjs --json | jq .memory.bytes` · expected=<22000 AND status==fresh · baseline=32.5KB/critical · re_run=3s
```

### Phase F — Unify + instrument + regression-proof

**U-F1 · Shared hit-rate dashboard** — one re-runnable read over the EXISTING telemetry (recall-counter-track + post-memory-context-eval + skill-auto-trigger telemetry). The compounding META artifact.
```
verify: channel=metric · tool=`node scripts/autoinvoke-hitrate.mjs --json` · expected={skill_cov, mem_precision@3, mem_recall_rate} all present · baseline=no unified surface · re_run=5s
```

**U-F2 · Schedule weekly re-measure** — `/loop --interval 7d` re-run of U-F1; drift down = regression alarm. (Offered, not auto-registered.)

## Reuse ledger (duplication-guard pre-cleared)

| Need | Reuse (do NOT rebuild) | New? |
|---|---|---|
| Semantic retrieval | `prism_memory:semantic_search`/`qdrant`/`find_similar`, nomic-embed | — |
| Memory RAG engine | `ObsidianMemoryRagEngine` (fix, don't replace) | — |
| Skill coverage measure | `skill-trigger-coverage.mjs` (U-LIMA-A5; add 1 flag) | — |
| Skill ROI ranking | `high-roi-skill-rank.mjs` | — |
| Hit-rate telemetry | `recall-counter-track.mjs`, `post-memory-context-eval.mjs` | — |
| Shared semantic wrapper | — | `scripts/lib/semantic-retrieve.mjs` (the ONE new artifact) |

## Sequencing & dependencies

A (A1→A2) gates everything. B1→B2→B3 sequential (revive → fix → guard). C depends on B2 (engine must scan before it can be made semantic). D is independent of B/C (skill side) — parallelizable. E independent. F depends on B+C+D landing (it measures them). **A1 (coordinate) is hard-blocking**: do not start B until the memory chat's scope is known.

## Risks

- **Collision with the memory chat** — A1 mitigates; if that chat already rewired memory-rag-inject, B1/B2 collapse to verification-only.
- **Embedding latency on UserPromptSubmit** — semantic-retrieve must stay ≤ the hook's existing 4 s budget; Qdrant-down fallback must be the keyword scan, never a block.
- **Un-gating (C2) → context bloat** — the semantic floor must be tuned to cap injected memories (mirror skill-auto-trigger top-K + char cap) or every prompt balloons.

## Verification rollup

Single command proves the whole milestone moved the needle: `node scripts/autoinvoke-hitrate.mjs --json` (U-F1) vs `autoinvoke-hitrate-baseline.json` (U-A2). Ship gate: skill coverage ≥40%, memory precision@3 ≥ baseline+0.20, memory recall-rate 0 → measurable, MEMORY.md < 22 KB.
