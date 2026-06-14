# DORMANT FEATURES — Phase-5 enumeration: TELEMETRY-PIPELINE GAPS (2026-05-26, slot:alpha iter10)

**Trigger:** operator re-issued "look for OTHER dormant features for high-ROI synergy" after Phase-1+Phase-4 of `DORMANT-FEATURES-ENUMERATION-2026-05-26.md` shipped (11 units across iter1-9). This document enumerates the next orthogonal class — telemetry pipelines for features that ARE firing but show 0 fires in the aggregator dashboards.

**Discovery source:** `state/shared/dashboards/FEATURE-UTILIZATION.md` (auto-generated 2026-05-26T04:39:12Z by slot:sierra iter7 U-FEATURE-UTIL-METER). Dashboard explicitly says "⚠ Missing telemetry sources: `rtk`" — but the gap is broader than that single source.

## D-tier: per-feature telemetry counter gaps

The FEATURE-UTILIZATION dashboard tracks 18 features. Only 2 show fires (Ollama 2,928 · GrepGlobIndex 1,029). The other 16 features are DEMONSTRABLY firing this session — the SessionStart hook injections prove PSN, SystemViz, WikiInject, MemoryInject, TribalInject, Obsidian all fire on every prompt. The dashboard sees them as zero because the counter they should increment doesn't exist or isn't read.

### D1. PSN counter wiring — 0 fires, tier:unknown
- **Why:** The PSN-LEG-STATE hook fires every UserPromptSubmit (verified live this turn). PSN cross-leg routing happens via 5+ surfaces. None increment a "PSN feature was used" counter.
- **Depends-on:** A shared counter sidecar (`wiki-recall-counts.json` pattern works; or a new `feature-util-counts.json`).
- **Blocks:** FEATURE-UTILIZATION accurate tier classification; any data-driven decision about PSN value.

### D2. SystemViz counter wiring — 0 fires, tier:medium
- **Why:** `/system-viz` skill + master-index pre-search injector fire constantly; SystemViz shows 0.
- **Depends-on:** Same sidecar as D1.
- **Blocks:** Same.

### D3. WikiInject counter wiring — 0 fires, tier:medium
- **Why:** Wiki precheck injector fires per UserPromptSubmit (sub-hooks 3 in dashboard). 0 fires recorded.
- **Depends-on:** Same sidecar.
- **Blocks:** Wiki utilization measurement.

### D4. MemoryInject counter wiring — 0 fires, tier:medium
- **Why:** Memory recall injector + memory vault pre-search (5 sub-hooks in dashboard). 0 fires recorded.
- **Depends-on:** Same sidecar; `recall-counter-track.mjs` already tracks per-FILE read counts at `mcp-server/data/state/wiki-recall-counts.json` — but per-FEATURE aggregation doesn't exist.
- **Blocks:** MemoryInject utilization measurement.

### D5. TribalInject counter wiring — 0 fires, tier:medium
- **Why:** Tribal-by-domain injector fires per prompt; dashboard shows 0.
- **Depends-on:** Same sidecar.
- **Blocks:** Tribal utilization measurement; per-domain coverage signal.

### D6. Obsidian counter wiring — 0 fires, tier:medium
- **Why:** stop-obsidian-memory-feed.mjs runs on every Stop (per CLAUDE.md §Doc reflection rule). 0 fires recorded.
- **Depends-on:** Same sidecar.
- **Blocks:** Obsidian feed pipeline visibility.

### D7. HTMLOverMD counter wiring — 0 fires, tier:medium
- **Why:** `mdToHtml()` is exported and CLAUDE.md §HTML-FOR-MD says it's used; 0 fires recorded.
- **Depends-on:** Same sidecar.
- **Blocks:** HTML-companion-discipline measurement.

### D8. PRISMAwareness counter wiring — 0 fires, tier:unknown
- **Why:** awareness-snapshot-inject.mjs SessionStart hook (verified per CLAUDE.md §MASTER INDEX); 0 fires.
- **Depends-on:** Same sidecar.
- **Blocks:** Awareness-stack measurement.

### D9. CLAUDE_md counter wiring — 0 fires, tier:medium
- **Why:** CLAUDE_md reads are the substrate of every chat; 0 fires recorded. The dashboard's category is probably "CLAUDE.md is the input substrate" but a per-section read counter would surface dormant sections.
- **Depends-on:** Same sidecar.
- **Blocks:** CLAUDE_md section-utilization measurement (data for the future U-CLAUDE-MD-PRUNE).

### D10-D17. UNKNOWN-tier dormants (the dashboard literally classifies these as no-data):
- **PSN, LoRA, RAG_Qdrant, DeepLearning, PRISMAwareness, Octopus, NVIDIA_NIM** — 7 features that the FEATURE-UTILIZATION aggregator can't even classify because zero telemetry source covers them.
- **Why:** Same telemetry-gap as D1-D9, but more severe — for these the AGGREGATOR doesn't even know where to look.
- **Depends-on:** First the sidecar (D1), then a `telemetry-source-registry.json` mapping feature-name → counter-key.
- **Blocks:** Data-driven decisions about whether to keep, archive, or invest in these 7 features.

### D18. NN_GNN counter wiring — 0 fires, tier:low
- **Why:** NN/GNN training/eval pipeline is built (per CLAUDE.md §NN-GRAPH MS0/MS1/MS2). PSN-LEG-STATE hook surfaces "AUROC UNGRADED" every prompt — that's a real signal, but the dashboard sees 0 fires. Eval-deferred state is itself a fire-of-zero.
- **Depends-on:** Same sidecar + bridge from NN retrain to counter.
- **Blocks:** Tier-5 GNN wiring-inference utilization measurement.

### D19. RTK counter source — "missing telemetry source: rtk" flagged on dashboard
- **Why:** RTK fires constantly (per SessionStart telemetry banner "RTK 53.7% hit / 467k saved"). FEATURE-UTILIZATION says no source covers it. The hook reminder shows fleet RTK stats but the dashboard's `byFeature` aggregator can't read them.
- **Depends-on:** Bridge from `rtk-savings` ledger → FEATURE-UTILIZATION reader.
- **Blocks:** RTK feature-tier classification (currently UNKNOWN despite being the highest-savings feature in PRISM).

## E-tier: Missing data artifacts named by existing code

### E1. `token-savings-top-roi-candidates.json` MISSING on disk
- **Why:** `state/shared/dashboards/top-50-roi-detectors.md` line 4 says: "Source: Synthetic seed (no token-savings-top-roi-candidates.json on disk yet — populated by scripts/lib/token-savings-corpus-collector.mjs once it ships)". The lib reads from this JSON; the JSON doesn't exist; the lib silently falls back to a synthetic seed.
- **Depends-on:** Either ship the collector script OR write a generator from existing telemetry sources.
- **Blocks:** Live-tuned bandit detector reweighting; ROI-driven detector promotion.

### E2. `bandit-tune` lib applied to live observations
- **Why:** `scripts/lib/detector-bandit-tune.mjs` exists per the dashboard comment ("operators do nothing — bandit-tune reweights from first ~200 fires per detector"). With E1 missing, the bandit has no source data to consume.
- **Depends-on:** E1.
- **Blocks:** Adaptive detector coverage (the whole point of the bandit).

## F-tier: Active-but-quiet PRISM scheduled jobs

Cron jobs currently active (per `CronList`):
- `61361ec9` — Every Thursday 9:17 AM — `/forge-audit-v2` PSN+SystemViz+OS+Obsidian+memory+wiki...
- `3c8173bb` — Every Monday 9:37 AM — `/forge-audit-v2` speed-feed engines + decisioning pipelines
- `0b28c502` — Every Friday 9:17 AM — `/forge-audit-v2` math/sci concepts
- `4c99c95b` — Every Tuesday 2:23 PM — `/forge-audit-v2` machining concepts/domains
- `740ac7cf` — Every 10 min (this session's `next units` loop)

### F1. /forge-audit-v2 weekly audit cycle — output telemetry?
- **Why:** 4 distinct durable cron jobs run /forge-audit-v2 weekly. Their OUTPUTS land somewhere but aren't surfaced in FEATURE-UTILIZATION. Audit-of-audits gap.
- **Depends-on:** Inspect /forge-audit-v2 output paths; verify last 4-7 runs landed; surface success/failure rate.
- **Blocks:** Confidence that weekly audits are actually running and produce actionable findings.

## Scope-expansion ideas (S-tier additions to enumeration v1)

### S6. Centralize feature-counter library
A single `incrementFeatureCounter(name)` util at `.claude/helpers/feature-counter.mjs` would let every hook that emits a feature touch increment the same sidecar. Adopting this would close D1-D9 + D18 + D19 in one architectural shift.

### S7. FEATURE-UTILIZATION dashboard ↔ live-state binding
The dashboard regenerates manually (last 2026-05-26T04:39:12Z = 14h ago). A Stop-hook regen on N edits to instrumented hooks would keep it fresh. Currently the dashboard's "freshness" is operator-driven.

### S8. PSN per-leg per-session usage matrix
Beyond "did the PSN feature fire" — track WHICH leg was queried per session. 11 legs × N sessions = matrix that surfaces which legs are actually load-bearing per-domain-slot.

## Sequencing recommendation

**Phase-5a (single ship, unblocks the whole tier):**
- S6 — ship `feature-counter.mjs` shared util (~30 LOC + tests). Single source of truth.

**Phase-5b (depends on Phase-5a):**
- D1-D9 — patch each of the 9 "tier:medium" injectors to call the counter. Each is a 1-line addition to existing hooks.

**Phase-5c (depends on Phase-5b):**
- D19 — bridge RTK ledger → FEATURE-UTILIZATION reader (read-only adapter).
- E1+E2 — generate `token-savings-top-roi-candidates.json` from live telemetry (the bandit-tune library can now consume it).

**Phase-5d (audit-of-audits):**
- F1 — audit /forge-audit-v2 cron-job output landing zones.

## PSN synergy map (per item)

Every D-tier item touches at least one PSN leg:
- D1 → PSN itself (meta)
- D2 → Leg #6 (System Viz)
- D3 → Leg #3 (Wiki)
- D4 → Leg #4 (Memories)
- D5 → Leg #5 (Tribal)
- D6 → Leg #1 (Obsidian brain)
- D8 → Leg #11 (PRISM AI router)
- D18 → Leg #10 (NN/GNN)
- D19 → Token-savings infrastructure (cross-cutting)

S6 (the shared counter lib) is the high-leverage architectural lever — it converts 18-line per-hook patches into 1-line each, AND establishes the pattern for any future feature added to the dashboard.

## Cross-refs

- Parent enumeration: `state/shared/specs/DORMANT-FEATURES-ENUMERATION-2026-05-26.md` (Phase-1, Phase-4 shipped)
- Grandparent plan: `state/shared/specs/PLAN-FILL-GAPS-RTK-EFFICIENCY-2026-05-26.md`
- Source dashboard: `state/shared/dashboards/FEATURE-UTILIZATION.md` (slot:sierra iter7 generator)
- Companion: `state/shared/dashboards/top-50-roi-detectors.md` (E1 source comment)
- Sibling: `state/shared/dashboards/PSN-COVERAGE-2026-05-24.md` (different methodology, complementary signal)
- Doctrine: [[feedback_psn_definition]] (canonical 11-leg taxonomy)
- Prior precedent: [[reference_phase1_token_savings_ship_batch_2026_05_26]] (close-out template)
