# PRISM Awareness Snapshot

> Generated **2026-05-13T05:06:23.910Z** · graph mtime 2026-05-10T23:30:37.555Z
> One-shot session warmup: built/wired/utilized/drifted in 60 lines.
> Regenerate: `node scripts/awareness-snapshot.mjs` · or via `/awareness-snapshot` skill.

## Headline (from BUILD_STATE)
- **2324** engines built · **1073** with wiki entry
- **879** engines on disk with no dispatcher reference (NEEDS_WIRING)
- **3399** roadmap units pending across active milestones
- **2** frontend merge(s) pending · **3** envelope drift case(s)

## Graph utilization (filtered to semantic layers L0..L8 + L10)
Scanned **5,014** of **110,375** nodes (excluded L9 fs-root + L11 fs-leaves).
HIGH-degree threshold: in≥3 · out≥3 (≥85th percentile).

| Class | Count | What it means |
|-------|-------|---------------|
| **hub** | 437 | high in + high out — central infrastructure |
| **sink** | 239 | high in + low out — well-used utility |
| **source** | 226 | low in + high out — driver / orchestrator |
| **orphan** | 86 | low in + low out + has docs — built but unwired (punch list) |
| **ghost** | 2924 | low in + low out + no docs — dead-code candidate |
| **normal** | 1102 | functioning, ordinary usage |

## Top hubs (most-connected — central nervous system)
- [L5/stub_heavy] **Other** (in 255 · out 2397)
- [L5/built] **Other** (in 255 · out 2397)
- [L5/stub_heavy] **Lathe** (in 51 · out 234)
- [L2/built] **MCP Server :3100** (in 14 · out 185)
- [L6/built] **Test Suite (3418 → 147 buckets)** (in 41 · out 147)
- [L3/built] **Tier-1: Claude** (in 4 · out 169)
- [L1/built] **mcp-server/web** (in 167 · out 3)
- [L5/built] **WEDM** (in 6 · out 156)
- [L5/stub] **Hyper** (in 22 · out 108)
- [L6/built] **Physics Constants (3)** (in 118 · out 4)

## Top orphans (built + documented + unwired — fix candidates)
- [L7/built] **Agent** (in 1 · out 1)
- [L7/built] **Base** (in 1 · out 1)
- [L7/built] **Coolant** (in 1 · out 1)
- [L7/built] **Database** (in 1 · out 1)
- [L7/built] **Hook** (in 1 · out 1)
- [L7/built] **PostProcessor** (in 1 · out 1)
- [L7/built] **Script** (in 1 · out 1)
- [L7/built] **Skill** (in 1 · out 1)
- [L7/built] **Materials (live)** (in 0 · out 1)
- [L7/built] **Tools (live)** (in 0 · out 1)

## Ghost density by layer (dead-code candidates per layer)
- L5: 1906
- L8: 417
- L6: 300
- L10: 290
- L7: 10
- L4: 1

## Milestone drift (envelope vs git reality)
**3** milestone(s) drifted. Top by shipped count:
- **HTML-PRIMARY-MS0** — claimed `not_started` / derived `in_progress_real` (1/7 shipped)
- **MF-MS1** — claimed `completed` / derived `not_started_real` (0/4 shipped)
- **MF-MS2** — claimed `completed` / derived `not_started_real` (0/3 shipped)

---
_Sources: `state/shared/system-viz/system-graph.json`, `state/shared/BUILD_STATE.json`, `state/shared/MILESTONE_PROGRESS.json`._
_Drill-down: `/master-index <query>` (search) · `/utilization-dashboard` (full per-node classification) · `/system-viz` (3D viewer)._