# PRISM Awareness Snapshot

> Generated **2026-06-01T18:54:46.386Z** · graph mtime 2026-06-01T16:12:27.106Z
> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.

## Headline (from BUILD_STATE)
- **3646** engines built · **1101** with wiki entry
- **118** engines on disk with no dispatcher reference (NEEDS_WIRING)
- **3025** roadmap units pending across active milestones
- **2** frontend merge(s) pending · **192** envelope drift case(s)

## Ready to use (built AND wired — invokable now)
- **3658** engines wired & ready to use — invokable via a dispatcher right now.
- **118** engines built but UNWIRED — on disk, NOT invokable until wired.
- **97%** dispatcher coverage (3658 of 3776 domain-tracked engines wired).
  > _"domain-tracked" buckets every engine file by domain; the Headline's "engines built" uses a narrower scan — different denominators, each correct in its own frame._
- Largest unwired backlog — wire these to unlock the most capability:
  - **Other**: 679/701 wired (97%) · 22 unwired
  - **Speed**: 14/19 wired (74%) · 5 unwired
  - **Monolith**: 12/17 wired (71%) · 5 unwired
  - **Hyper**: 70/73 wired (96%) · 3 unwired
  - **Wet**: 12/15 wired (80%) · 3 unwired
  - **Creo**: 1/4 wired (25%) · 3 unwired
  - **Mill**: 68/70 wired (97%) · 2 unwired
  - **Tool**: 61/63 wired (97%) · 2 unwired

## Graph utilization (filtered to semantic layers L0..L8 + L10)
Scanned **50,293** of **50,490** nodes (excluded L9 fs-root + L11 fs-leaves).
HIGH-degree threshold: in≥3 · out≥2 (≥85th percentile).

| Class | Count | What it means |
|-------|-------|---------------|
| **hub** | 4455 | high in + high out — central infrastructure |
| **sink** | 8404 | high in + low out — well-used utility |
| **source** | 4492 | low in + high out — driver / orchestrator |
| **orphan** | 12781 | low in + low out, BUILT artifact — built but under-utilized (punch list) |
| **ghost** | 0 | low in + low out, not-built — dead-code / fs-leaf / unrealized roadmap candidate |
| **normal** | 20161 | functioning, ordinary usage |

## Top hubs (most-connected — central nervous system)
- [L10/built] **layer-l4a** (in 10890 · out 2)
- [L10/built] **tests-index** (in 4626 · out 4618)
- [L10/built] **layer-l8** (in 8670 · out 551)
- [L10/built] **dispatcher-cam** (in 2521 · out 2313)
- [L10/built] **layer-l5** (in 3933 · out 109)
- [L10/built] **dispatcher-calc** (in 1666 · out 1355)
- [L10/built] **monolith-modules-index** (in 1689 · out 1204)
- [L10/built] **domain-other** (in 1288 · out 1196)
- [L10/built] **layer-l1** (in 1572 · out 878)
- [L10/built] **layer-l6** (in 930 · out 1471)

## Top orphans (built + documented + unwired — fix candidates)
- [L3/built] **T3: Mill AGI** (in 1 · out 1)
- [L3/built] **T3: Wire EDM AGI** (in 1 · out 1)
- [L3/built] **T3: Quality AI** (in 1 · out 1)
- [L4/built] **adaptiveControl** (in 1 · out 1)
- [L4/built] **cadDrawingKnowledge** (in 1 · out 1)
- [L4/built] **calc** (in 1 · out 1)
- [L4/built] **fluidThermal** (in 1 · out 1)
- [L4/built] **formingCasting** (in 1 · out 1)
- [L4/built] **hook** (in 1 · out 1)
- [L4/built] **knowledge** (in 1 · out 1)

## Ghost density by layer (dead-code candidates per layer)
_None._

## Galaxy Federation (hub-and-spoke context roll-up)
- **34** galaxy brains rolled up · KNOWS-MAP indexes **767** capability tokens / **15** top topics.
- Feed-up digest `state/shared/galaxy-cards/MASTER-DIGEST.md` — inject ONE ranked digest instead of re-reading 34 galaxy brains.
- Who-knows-what: `node scripts/galaxy-knows-map.mjs who <topic>` (1 lookup → which galaxy holds context on X).
- Top galaxies by salience:
  - **hermes-zulu** (salience 7.89) — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
  - **quoting** (salience 7.78) — per-domain working brain (slot:charlie)
  - **token-optimization** (salience 7.43) — Token Optimization + Efficiency Hunting + Obsidian + Per-Chat Galaxy Buildout
  - **system-viz** (salience 7.36) — System-Viz Upgrades, Integration & Utilization
  - **post-processor** (salience 7.05) — Post-Processors (G-code emission · controller dialects · MasterPost · JM .cps fleet)

## Milestone drift (envelope vs git reality)
**192** milestone(s) drifted. Top by shipped count:
- **CLI-MS0** — claimed `not_started` / derived `completed_real` (22/22 shipped)
- **SYSTEM-VIZ-BRAIN-MS0** — claimed `completed` / derived `in_progress_real` (22/26 shipped)
- **SCIMATH-MS5** — claimed `not_started` / derived `in_progress_real` (22/23 shipped)
- **SCIMATH-MS1** — claimed `not_started` / derived `in_progress_real` (19/20 shipped)
- **SCIMATH-MS0** — claimed `not_started` / derived `completed_real` (17/17 shipped)

## Warnings
- system-graph.json unreadable (663MB > V8 string limit) — utilization computed from architecture-graph.json (DEGRADED: ~50K-node architecture subset, NOT the full merged graph; counts undercount orphans/ghosts). Fix: streaming graph-read (sierra).

---
_Sources: `state/shared/system-viz/system-graph.json`, `state/shared/BUILD_STATE.json`, `state/shared/MILESTONE_PROGRESS.json`, `state/shared/galaxy-cards/MASTER-DIGEST.json`, `KNOWS-MAP.json`._
_Drill-down: `/master-index <query>` (search) · `/utilization-dashboard` (full per-node classification) · `/system-viz` (3D viewer)._