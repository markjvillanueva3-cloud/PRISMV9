# PRISM Awareness Snapshot

> Generated **2026-06-27T15:36:59.356Z** · graph mtime 2026-06-27T06:06:12.632Z
> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.

## Headline (from BUILD_STATE)
- **3842** engines built · **1293** with wiki entry
- **6** engines on disk with no dispatcher reference (NEEDS_WIRING)
- **3862** roadmap units pending across active milestones
- **2** frontend merge(s) pending · **23** envelope drift case(s)

## Ready to use (built AND wired — invokable now)
- **3855** engines wired & ready to use — invokable via a dispatcher right now.
- **6** engines built but UNWIRED — on disk, NOT invokable until wired.
- **100%** dispatcher coverage (3855 of 3861 domain-tracked engines wired).
  > _"domain-tracked" buckets every engine file by domain; the Headline's "engines built" uses a narrower scan — different denominators, each correct in its own frame._
- Largest unwired backlog — wire these to unlock the most capability:
  - **Other**: 723/724 wired (100%) · 1 unwired
  - **Blueprint**: 10/11 wired (91%) · 1 unwired
  - **Auth**: 2/3 wired (67%) · 1 unwired
  - **Pre**: 2/3 wired (67%) · 1 unwired
  - **Redis**: 0/1 wired (0%) · 1 unwired
  - **Search**: 0/1 wired (0%) · 1 unwired

## Graph utilization (filtered to semantic layers L0..L8 + L10)
Scanned **68,760** of **68,849** nodes (excluded L9 fs-root + L11 fs-leaves).
HIGH-degree threshold: in≥3 · out≥2 (≥85th percentile).

| Class | Count | What it means |
|-------|-------|---------------|
| **hub** | 4687 | high in + high out — central infrastructure |
| **sink** | 8784 | high in + low out — well-used utility |
| **source** | 5264 | low in + high out — driver / orchestrator |
| **orphan** | 20866 | low in + low out, BUILT artifact — built but under-utilized (punch list) |
| **ghost** | 0 | low in + low out, not-built — dead-code / fs-leaf / unrealized roadmap candidate |
| **normal** | 29159 | functioning, ordinary usage |

## Top hubs (most-connected — central nervous system)
- [L10/built] **layer-l4a** (in 10891 · out 2)
- [L10/built] **tests-index** (in 5153 · out 5143)
- [L10/built] **layer-l8** (in 8670 · out 308)
- [L10/built] **dispatcher-cam** (in 2528 · out 2191)
- [L10/built] **layer-l5** (in 4255 · out 89)
- [L10/built] **feedback_auto_close_out** (in 3651 · out 6)
- [L10/built] **dispatcher-calc** (in 1703 · out 1306)
- [L10/built] **monolith-modules-index** (in 1689 · out 1204)
- [L10/built] **layer-l6** (in 1055 · out 1083)
- [L10/built] **layer-l1** (in 1572 · out 148)

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
- **34** galaxy brains rolled up · KNOWS-MAP indexes **678** capability tokens / **15** top topics.
- Feed-up digest `state/shared/galaxy-cards/MASTER-DIGEST.md` — inject ONE ranked digest instead of re-reading 34 galaxy brains.
- Who-knows-what: `node scripts/galaxy-knows-map.mjs who <topic>` (1 lookup → which galaxy holds context on X).
- Top galaxies by salience:
  - **hermes-zulu** (salience 8.33) — Hermes/Zulu Building + Stub Hunting + Fleet Orchestration
  - **ai-training** (salience 7.62) — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
  - **quoting** (salience 7.20) — per-domain working brain (slot:charlie)
  - **system-viz** (salience 7.17) — System-Viz Upgrades, Integration & Utilization
  - **token-optimization** (salience 7.10) — Token Optimization + Efficiency Hunting + Obsidian + Per-Chat Galaxy Buildout

## Milestone drift (envelope vs git reality)
**23** milestone(s) drifted. Top by shipped count:
- **SF-PSN-WIRE-MS0** — claimed `not_started` / derived `completed_real` (13/14 shipped)
- **CPL-MS2** — claimed `not_started` / derived `completed_real` (10/10 shipped)
- **LATHE-MASTER** — claimed `not_started` / derived `in_progress_real` (10/136 shipped)
- **MS-CRITWIRE** — claimed `not_started` / derived `in_progress_real` (7/16 shipped)
- **CAMK-MS2** — claimed `not_started` / derived `completed_real` (5/5 shipped)

## Warnings
- system-graph.json unreadable (663MB > V8 string limit) — utilization computed from architecture-graph.json (DEGRADED: ~50K-node architecture subset, NOT the full merged graph; counts undercount orphans/ghosts). Fix: streaming graph-read (sierra).

---
_Sources: `state/shared/system-viz/system-graph.json`, `state/shared/BUILD_STATE.json`, `state/shared/MILESTONE_PROGRESS.json`, `state/shared/galaxy-cards/MASTER-DIGEST.json`, `KNOWS-MAP.json`._
_Drill-down: `/master-index <query>` (search) · `/utilization-dashboard` (full per-node classification) · `/system-viz` (3D viewer)._