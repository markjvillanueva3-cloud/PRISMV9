# Plan — Priority Queue + Auto-Pickup + Wiring Check + High-ROI Proposer

## Context

The `/checkin-<nato> /loop` contract is live + documented this session. Next-level
autonomous loop: when a chat finishes a unit, it should **seamlessly auto-pick
the next-best one** (backend-dev tools prioritized over app-functionality),
**auto-verify it closed out + wired correctly**, and **propose a high-ROI
extension** (algorithm/formula/engine that would improve PRISM).

User asked for:
1. Master priority-queue node in `/system-viz`, color-coded by category.
2. Backend-dev units at the TOP of the pickup queue.
3. Stop hook that closes out the finished unit + picks the next available.
4. Stop hook that checks `/system-viz` for where the unit needs wiring.
5. High-ROI proposer (algorithm/formula/engine recommendation).

All built on the existing pieces (ROADMAP-CONSOLIDATED 5826 items, slot
worktrees, Stop-hook framework, system-viz augmentation pattern).

## Phase A — Priority queue master node (generator + viz augmentation)

NEW `scripts/generate-priority-queue-features.mjs` (+ `.test.mjs`):
- Read `ROADMAP-CONSOLIDATED.json` (5826 items = 4497 pending + 969 prose +
  318 misc + 42 bridge).
- Classify each unit via pure `classifyUnit(unit)`:
  - **backend-dev** (priority 0, color `#3b82f6` blue) — milestone matches
    `BACKEND-DEVTOOLS|RGS|INFRA|HOOK|DEV-VELOCITY|COMMAND-KERNEL|SYSTEM-VIZ|
    FLEET-REAPER|CLEANUP|TRIBAL-GRAPH|MEMORY|CHECKIN|OLLAMA` OR domain ∈
    `{hooks, infra, docs}`.
  - **bridge** (priority 1, color `#f59e0b` amber) — units already in
    `bridge_units.{wiring,deep_integration}` from ROADMAP-CONSOLIDATED.
  - **app-functionality** (priority 2, color `#10b981` green) — everything else.
- Emit `ghost.priority_queue` roost (kind `ghost-roost`, parent
  `ghost.planned_features`) + one `priority-unit` child per unit, carrying
  `{label, color, info, priority, category, milestone}` fields. Children sorted
  by `(priority asc, milestone asc, unit_id asc)` for stable ordering.
- Register in `regen-viz.mjs` FAST[] (after `generate-bridge-synergy-features.mjs`)
  + `merge-augmentations.mjs` (loadOptional + splice + version + summary log).

## Phase B — `priority-queue-helper.mjs` (read-only API)

NEW `.claude/helpers/priority-queue.mjs` + test:
- `pickNextUnit({slot, excludeIds})` → returns the highest-priority pending
  unit eligible for `slot` (backend-dev first; filter out already-claimed/
  shipped/blocked).
- `summarize()` → `{total, byCategory, byMilestone, topN}`.
- Reads `ROADMAP-CONSOLIDATED.json` + `MILESTONE_PROGRESS.json` (shipped) +
  `chat-slots.json` (active claims) so pickup never collides with peer work.

## Phase C — Stop hooks (3 NEW, all advisory)

All 3 are Stop hooks, all advisory (never block), all keyword-gated and respect
existing kill-switch convention (`PRISM_<NAME>_DISABLE=1`).

1. NEW `.claude/hooks/stop-auto-pickup-next.mjs` (+test) — when this session
   shipped a unit (parse last commit for `U-...`), call
   `priority-queue.pickNextUnit({slot})` and surface the next candidate (id,
   title, category color, milestone, spec path) as a Stop advisory. Chat decides
   to take it on next iteration. Throttled per-session.

2. NEW `.claude/hooks/stop-wiring-check.mjs` (+test) — for each unit shipped
   this session, query `system-viz-query.mjs find <unit deliverable>` for
   dispatcher refs. If a new engine has 0 dispatcher refs → advisory: "wire
   this to <suggested dispatcher per domain>." Reuses existing
   `stop-auto-wire.mjs` + `stop_on_unwired_assets.mjs` if possible — verify
   first; this hook fills the unit-attribution gap (the existing hooks audit
   globally; this one ties the gap to THIS session's shipped unit).

3. NEW `.claude/hooks/stop-high-roi-proposer.mjs` (+test) — scans this
   session's shipped deliverables + system-graph degree-centrality (engines
   with many incoming refs = high-leverage) and surfaces 1-3 specific high-ROI
   proposals: "extracting <X> into a shared helper would touch N call sites,"
   "an algorithm covering <Y> domain would unblock M waiting units," etc.
   Modeled on the existing `compounding-gains-audit` machinery referenced in
   forge6/forge7.

## Phase D — Wire hooks + doctrine

EDIT `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json`
(both copies, c-to-h-mirror replicates) — register the 3 new Stop hooks
between `session-end-peer-share` and `duplication-guard-stop` (the documented
T3 advisory wiring cluster per `[[reference_stop_advisory_wiring_cluster_2026_05_15]]`).

EDIT `H:/prism/CLAUDE.md` — extend the `## /checkin-<nato> /loop full-stack
contract` section with steps 6.a (auto-pickup), 6.b (wiring-check),
6.c (high-ROI proposer). Memory + wiki entries for each.

## Phase E — Verification + close-out

- node:test green for the helper + each Stop hook (~30+ tests total).
- Live verification: ship a small unit, observe Stop hook output — the 3
  advisories surface together.
- /system-viz query: `ghost.priority_queue` roost + 5826+ color-coded children.
- 3-of-3 scrutiny on session diff.
- Doc reflection (CLAUDE.md, wiki, memory, MEMORY.md).
- Commit (`[PRIORITY-QUEUE-MS0]/juliett` or similar SCOPE-MS0/U-* tag).

## Files

NEW (~10): `scripts/generate-priority-queue-features.mjs` (+test),
`.claude/helpers/priority-queue.mjs` (+test),
`.claude/hooks/stop-auto-pickup-next.mjs` (+test),
`.claude/hooks/stop-wiring-check.mjs` (+test),
`.claude/hooks/stop-high-roi-proposer.mjs` (+test),
3 doc files (wiki + memory + CLAUDE.md section).
EDIT (~4): `scripts/regen-viz.mjs` (+1 line FAST[]),
`scripts/merge-augmentations.mjs` (splice + version + log),
2 settings.json copies (hook registrations).

## Reuse

- `generate-bridge-synergy-features.mjs` — exact template for the new generator.
- `consolidate-roadmaps.mjs` — its `DEEP_INTEGRATION_BRIDGES` const pattern
  for the classifier keyword list.
- `system-viz-query.mjs find` — used by wiring-check hook.
- Existing Stop hook patterns (`scrutinize-before-stop`,
  `close-out-audit-suggest`) — for the 3 new Stop hooks' structure.
- `chat-slots.mjs` — for active-claim filter in `pickNextUnit`.

## Out of scope

- Building any of the 5,826 underlying units (this milestone wires DISCOVERY +
  AUTO-PICKUP + WIRING-CHECK + HIGH-ROI proposers; execution is downstream).
- Modifying `/pick-unit` itself (the priority-queue helper is the new layer;
  pick-unit stays unchanged for back-compat).
- Auto-claiming the next unit (advisory only — operator/chat decides).

## Risk

- 3 new Stop hooks add latency to every Stop event. Mitigation: each is
  keyword/condition-gated (no-op when no unit shipped this session); throttled.
- Mis-classification (some milestones could legitimately be either category).
  Mitigation: classifier exposed as a pure function, fully tested with edge
  cases; user can override via per-unit `category` field in
  ROADMAP-CONSOLIDATED.
- High-ROI proposer could surface noise. Mitigation: top-3 cap, confidence
  threshold, advisory-only.

## Context-budget honesty

This is a substantial milestone (10+ new files). Given current session context
is very high after 3 milestones + 1 doctrine pointer today, executing this
fully here risks degraded quality. Two viable paths:
1. Approve + execute here in remaining budget (compact-friendly if needed).
2. Approve the plan; execute in a fresh `/checkin-<nato> /loop` chat using
   the plan file as the spec — exactly the contract just documented.

Either way, the plan is the deliverable that lets execution proceed cleanly.
