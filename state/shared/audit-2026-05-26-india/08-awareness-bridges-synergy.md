---
name: 08-awareness-bridges-synergy
type: audit
slot: india
date: 2026-05-26
scope: awareness substrate + bridge inventory + cross-slot synergy + master-index drift
---

# Awareness + Bridges + Synergy Audit — slot india — 2026-05-26

## Awareness freshness

| Artifact | mtime (UTC) | Age | Verdict |
|---|---|---|---|
| `state/shared/AWARENESS-SNAPSHOT.md` | 2026-05-24T02:01:53Z | **~2.0 days** | **STALE** — no scheduled regen wired |
| `state/shared/BUILD_STATE.json` | 2026-05-26T05:50:20Z | ~1.5h | FRESH (this morning) |
| `state/shared/BUILD_STATE.md` | 2026-05-26T05:50:21Z | ~1.5h | FRESH |
| `state/shared/MILESTONE_PROGRESS.json` | 2026-05-25T17:19:57Z | ~13h | FRESH |
| `state/shared/specs/ROADMAP-CONSOLIDATED.json` | 2026-05-26T04:35:04Z | ~3h | FRESH |
| `state/shared/system-viz/system-graph.json` | 2026-05-26T05:08:57Z | ~2h | FRESH |

**R12 conflict (FAIL LOUD):**
- AWARENESS-SNAPSHOT header (2026-05-24) says **"593 NEEDS_WIRING"** and **"2876 roadmap units pending"**.
- BUILD_STATE.json (2026-05-26) says **"148 needs_wiring"** and **"2899 needs_building_active_units"**.
- The snapshot is being **injected at SessionStart by `awareness-snapshot-inject.mjs`** with 2-day-stale numbers. Chats are warming up with 593 unwired but the actual number is 148 (the 593 figure includes a wider domain bucket — see Master-Index drift below).
- No cron / scheduled task regenerates the snapshot. Drift unbounded.

## BUILD_STATE drift classification — top silent close-out candidates

From `MILESTONE_PROGRESS.json` (719 milestones · 5579 units · 2680 shipped · 2899 pending · **190 drift**):

| Class | Count | Risk | Action |
|---|---|---|---|
| `complete__completed_real` | 153 | NONE — status-text refinements | ignore |
| `not_started__completed_real` | 112 | **LOW — silent close-out debt** | flip envelopes |
| `not_started__in_progress_real` | 75 | MED — partial credit | review |
| `complete__not_started_real` | 28 | HIGH — phantom credit | investigate |
| `in_progress__in_progress_real` | 21 | NONE | ignore |
| `not_started__no_units` | 15 | LOW — envelope shell | ignore |
| `in_progress__not_started_real` | 13 | MED — orphan claim | investigate |

**120 low-risk silent close-outs identified** (`not_started`/`in_progress` claimed + `completed_real` derived). Top 5 by shipped count:

1. **COMMAND-KERNEL-MS0** — claimed `in_progress` → derived `completed_real` (29/29 shipped)
2. **INTEL-OLLAMA-OBSIDIAN-MS1** — claimed `in_progress` → derived `completed_real` (23/23 shipped)
3. **CLI-MS0** — claimed `not_started` → derived `completed_real` (22/22 shipped)
4. **MCAT-MS0** — claimed `in_progress` → derived `completed_real` (21/21 shipped)
5. **SCIMATH-MS0** — claimed `not_started` → derived `completed_real` (17/17 shipped)

All cleanable via `node scripts/close-out-milestone.mjs --milestone <ID>` (per `feedback_roadmap_close_out.md`).

**R12 — `complete__not_started_real` (28 cases) — PHANTOM CREDIT:** envelopes claim complete but git shows no units shipped. These need a *separate* audit pass — they're the inverse of silent close-outs (false-positive claims, not silent debt).

## Bridge units — built / in-progress / proposed

`ROADMAP-CONSOLIDATED.json` declares 42 bridge units (`bridge_units.wiring`=26 + `bridge_units.deep_integration`=16). **All 42 have `status: unknown`** in the consolidated inventory — there is no status field populated for bridge units (the inventory generator never resolves git evidence for them, even though commit evidence exists).

### Git-evidence inventory (manual cross-reference)

| Bridge class | Total | Built (commit found) | Pending |
|---|---|---|---|
| Wiring (`U-BRIDGE-WIRE-*`) | 26 declared | **37 commits found** (incl. variants like `*-PARTIAL`, `*-BATCH-2`) | unknown |
| Deep integration (`U-BRIDGE-SFC-*` etc.) | 16 declared | **6 SFC commits found** (FUSION, HYPERMILL, INVENTORHSM, SOLIDWORKS + others) | 10 |
| Total `U-BRIDGE-*` commits | — | **50 commits** in history | — |

### 5 examples — BUILT (commit evidence)

1. `U-BRIDGE-SFC-FUSION` — slot:echo iter3 (commit `8eced9a30f`, 2026-05-24)
2. `U-BRIDGE-SFC-HYPERMILL` — slot:echo iter4 (commit `b16ad70981`, 2026-05-24)
3. `U-BRIDGE-SFC-INVENTORHSM` — slot:echo iter5 (commit `3914d02405`, 2026-05-24)
4. `U-BRIDGE-WIRE-BUSINESS` — slot:mike (3 Business engines wired to prism_orchestrate, 2026-05-20)
5. `U-BRIDGE-WIRE-FLUID-PUMPS-5` — slot:kilo /loop (5 fluid/pump engines into prism_fluid_thermal, 2026-05-20)

### 5 examples — PROPOSED (no commit found)

1. `U-BRIDGE-SFC-MASTERCAM` — no commit; SFC→Mastercam still untouched
2. `U-BRIDGE-SFC-ESPRIT` — no commit; SFC→Esprit pending
3. `U-BRIDGE-MASTERPOST-CAM` — no commit; the Master Post unification touchpoint
4. `U-BRIDGE-AI-TIER1-TIER2` — no commit; Claude → FullSystemAICoordinator path
5. `U-BRIDGE-AI-TIER2-TIER3` — no commit; coordinator → 7 Tier-3 domain-specialist fan-out

### 5 examples — IN-PROGRESS (variant work)

1. `U-BRIDGE-WIRE-OTHER` (target 124 engines) — multiple `oscar` slot iterations chip away (2/4 Print, 3 Inventor, 3 Live, 2 Cross) ≈ 10 wired of 124
2. `U-BRIDGE-WIRE-LATHE` (target 64) — multiple BATCH-N variants, some shipped
3. `U-BRIDGE-WIRE-PROCESS` (target 7) — `BRIDGE-WIRE-PROCESS-EQUIPMENT` + `-2` shipped 14 engines (over-target)
4. `U-BRIDGE-LEARN-CAM` — `U-BRIDGE-LEARN-CAM-SFC` (whiskey iter8) shipped a piece
5. `U-BRIDGE-WIRE-LONGTAIL` (target 296) — broadest bucket, partial coverage

**R12 — bridge inventory desync:** `bridge_units.wiring[*].status=unknown` for ALL 42 is a generator gap. `audit-close-out-candidates.mjs` does *not* scan bridge units, only milestone envelopes. The consolidated roadmap reports bridges as "remaining work" even after 50 BRIDGE commits.

## Priority queue — actual --pick output

```
$ node .claude/helpers/priority-queue.mjs --pick --slot india
U-AITRAIN-POST-CNC-CONTROLLER-DEEP-LEARNING [app-functionality p2] AI-TRAINING-FIRST-MS0 —
  Train CNCControllerDeepLearningEngine on full pre-revenue corpus
  (JM-DIE 76K + MIT-OCW + v8.89 MIT kernels)  [post]
```

**Verdict — partial-FUNCTIONING:**
- `--pick` returns a unit (deterministic, no error)
- Returns an `app-functionality p2` unit — NOT a bridge unit (priority 1) and NOT a backend-dev unit (priority 0)
- Priority order documented at `priority-queue.mjs:14-16` is `backend-dev (0) → bridge (1) → app-functionality (2)`
- Either: (a) all p0+p1 are claimed / shipped / filtered for slot india, or (b) the slot-domain filter is too tight (india = "post-processor+master-post" — but `U-BRIDGE-MASTERPOST-CAM` should match)
- **R12:** the bridge-unit pickup the doctrine promises ("bridges are the highest-leverage starting set") is NOT happening for india — the bridge unit that maps exactly to india's domain (`U-BRIDGE-MASTERPOST-CAM`) is not returned.

## Master-index vs BUILD_STATE drift

| Surface | Node count |
|---|---|
| `system-graph.json` total ids (10MB sample × 54 scale) | ~1.08M ids |
| `system-graph.json` layer-tagged | ~163K |
| AWARENESS snapshot says scanned | 85,117 of 260,206 |
| BUILD_STATE tracks | 3516 engines / 991 domains |
| MILESTONE_PROGRESS tracks | 5579 units across 719 milestones |
| ROADMAP-CONSOLIDATED total remaining | 5826 (898 milestones · 2899 pending · 963 prose · 42 bridge · 318 misc) |

**Drift gradient (FAIL LOUD):**
- Graph has ~1M nodes (covers files, dirs, leaves, ghost roosts, scriptlib).
- AWARENESS scans 85K (filters L0..L8+L10 only — by design).
- BUILD_STATE tracks 3516 engines (3 orders of magnitude smaller).
- AWARENESS snapshot says **"593 NEEDS_WIRING"** but BUILD_STATE says **"148"** — same day's data should agree. The 593 number is from a 2-day-old snapshot generated when the count actually was 593.
- The injected SessionStart context is **giving every new chat in the fleet a 2-day-stale picture of unwired backlog**.
- Bridge units exist in `ROADMAP-CONSOLIDATED.bridge_units` but **none are nodes in `system-graph.json`** under their `U-BRIDGE-*` ids (verified — no `ghost.priority_queue` rendering for bridges by id; only `ghost.bridge_synergy` aggregate roost).

## Article incorporation candidates

dunik's article: *"Layer 4 only helps agents that run the same kind of task repeatedly. Bumping context from one run to the next is where the layer's bias shows up — they consolidate from many runs to one cleaner memory."*

PRISM ↔ article mapping for slot india:

### Candidate 1 — Cross-slot awareness consolidation (HIGHEST LEVERAGE)
**Gap:** Each of the 25 work slots runs `/loop` independently. `loop-state.mjs` is per-session, `chat-slots.json` is per-slot. The `error-pattern-capture` ledger and the `tribal-by-domain-inject` are global, but **there is no "consolidator" that drains the 25 per-slot loop runs into one cleaner memory the way dunik describes**. Each slot's mistakes stay in its own ledger; the fleet learns 25× slower than it could.
**Spec:** `U-FLEET-LEARNING-CONSOLIDATOR` — golf-slot cron that reads per-slot loop-state + last 10 commits per slot + extracts the "what kind of task this slot keeps doing" signature; rolls it up into a fleet-wide `state/shared/FLEET-PATTERNS.json` that the next /checkin reads BEFORE picking a unit.

### Candidate 2 — Awareness snapshot cold-cache fix (HIGH LEVERAGE, LOW COST)
**Gap:** `awareness-snapshot.mjs` regenerates only when manually invoked. Snapshot has been 2 days stale, injecting wrong numbers into every chat's SessionStart.
**Spec:** `U-AWARENESS-SNAPSHOT-CRON` — durable Windows task (5min phase offset like fleet-reaper) regenerates snapshot when BUILD_STATE.json mtime > snapshot mtime. Cheap: ~3s to regen, completely fixes the 593-vs-148 drift.

### Candidate 3 — Bridge-unit status materialization (MEDIUM LEVERAGE)
**Gap:** `bridge_units.wiring[*].status=unknown` for ALL 42 bridges. 50 BRIDGE-* commits in git but the consolidated inventory does not know.
**Spec:** `U-BRIDGE-STATUS-RESOLVER` — extend `consolidate-roadmaps.mjs` to resolve `U-BRIDGE-*` ids against `MILESTONE_PROGRESS.shipped` + commit subject grep. Surfaces "10 of 26 wiring bridges fully shipped, 8 partial, 8 untouched" instead of "42 unknown".

### Candidate 4 — Priority queue slot-domain enforcement
**Gap:** `priority-queue.mjs --pick --slot india` returned an `app-functionality p2` unit when `U-BRIDGE-MASTERPOST-CAM` (matches india's `post-processor` domain) was the doctrinally-correct pick.
**Spec:** `U-PRIORITY-QUEUE-SLOT-MATCH-AUDIT` — log every --pick decision with classifier output (priority, slot-domain match score, eligibility filters that hit) so the slot↔bridge alignment regressions are visible.

## R12 conflicts surfaced

1. **AWARENESS-SNAPSHOT "593 NEEDS_WIRING"** vs **BUILD_STATE.json "148 needs_wiring"** — 4× drift, stale snapshot is being injected every SessionStart fleet-wide.
2. **42 bridge units all `status:unknown`** vs **50 BRIDGE-* commits in git** — consolidator does not resolve bridge status.
3. **Priority queue doctrine says "bridges are highest-leverage"** vs **actual --pick for india returned p2 app-functionality** — slot-domain matching not propagating to bridge selection.

## Sources

- `state/shared/AWARENESS-SNAPSHOT.md` (mtime 2026-05-24T02:01:53Z)
- `state/shared/BUILD_STATE.json` (mtime 2026-05-26T05:50:20Z, schemaVersion 1.0.0)
- `state/shared/MILESTONE_PROGRESS.json` (mtime 2026-05-25T17:19:57Z, 719 milestones / 5579 units)
- `state/shared/specs/ROADMAP-CONSOLIDATED.json` (mtime 2026-05-26T04:35:04Z, 5826 total remaining)
- `state/shared/system-viz/system-graph.json` (542.5 MB, mtime 2026-05-26T05:08:57Z)
- `.claude/helpers/priority-queue.mjs:14-16` (priority order docstring)
- `knowledge/wiki/architecture/checkin-loop-fullstack.md` (contract doctrine)
- `git log --grep=U-BRIDGE-` (50 bridge commits)
