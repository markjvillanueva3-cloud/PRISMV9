---
title: PRISM Launch-Readiness Audit — 2026-05-24
date: 2026-05-24
type: architecture
status: live
tags: [launch, readiness, audit, revenue, mill, lathe, wedm, cam, post-processor]
related:
  - "[[forge-audit-v2]]"
  - "[[roadmap-consolidation]]"
  - "[[domain-pipeline-ms0]]"
  - "[[priority-queue]]"
  - "[[psn-definition]]"
created_by: claude-333c36e8 slot:india
---

# PRISM Launch-Readiness Audit — 2026-05-24

> First end-to-end audit of how close PRISM is to revenue, scored per functional domain. Output of `/forge-audit-v2 PRISM-LAUNCH-READINESS` + manual mining. Produces the `PRISM-LAUNCH-READINESS-MS0` milestone envelope as a side effect.

## Why this audit exists

User directive (2026-05-24): *"develop full combination pipelines scenario testing utilizing the entire prism suite now that we have real customer data... audit and analyze all user requests over the past 6 months of chat logs... determine how close we are for each functional part of the prism app to launch and start generating revenue."*

The audit needed to come BEFORE scenario generation. Generating thousands of test scenarios without knowing the per-domain gap matrix would waste compute on coverage we already have. The audit gates scenario allocation: 7800 scenarios partitioned across domains by gap depth, not by uniform spray.

## Methodology (Boris-discipline)

Every finding declares its own re-measurement tool. Findings without a verification channel are opinions, not findings — HARD BLOCK per `/forge-audit-v2` rule 1.

### Mining sources (structured + Obsidian)

| Source | Size | Window | Notes |
|---|---|---|---|
| `state/shared/AGENT_CHAT.jsonl` | 493 lines | 3.5d rolling | Short-tail only; 6mo provenance lives in handoffs/commits/memories |
| `state/shared/handoffs/HANDOFF-*.md` | 2,419 | session-keyed | Per-chat continuity |
| `git log --since=6mo` | (rtk-summarized, raw counts deferred) | 6mo | Commits include slot routing |
| `mcp-server/data/**/*.json` (envelope-shaped) | 1,443 candidates | all-time | Mix of claims + envelopes |
| `state/shared/specs/ROADMAP-CONSOLIDATED.json` | 882 milestones / 2876 pending / 969 prose | regenerated 2026-05-24 | Master remaining-work view |
| `state/shared/specs/MISC-TASKS-INVENTORY.json` | 0 (regenerated empty 2026-05-16) | 2026-05-16 | Stale — see Recent regressions |
| `knowledge/memories/` | 9,635 .md | all-time | Standing doctrine + work references |
| `knowledge/wiki/` | 23,981 entries (33,667 architecture files) | all-time | Karpathy-LLM-wiki |
| `knowledge/wiki/lessons/` | 147 | all-time | Distilled findings |
| `knowledge/wiki/decisions/` | 1 | thin | Decision log under-utilized — opportunity |
| `state/shared/BUILD_STATE.json` | regenerated this session | live | Per-domain wiring source |
| `state/shared/specs/` | 301 .md/.json | all-time | Audit + plan archive |

## Findings (top 10, all with verification channels)

### Composite

- **Launch-revenue-readiness: ~23%** (composite weighted across domains)
- **Lathe is closest to revenue:** 40% net, 2-4 weeks
- **WEDM is furthest:** 0% net, 12-16 weeks
- **The bottleneck is NOT backend depth** (78% wired, 3273 engines, 8168 actions, 3836 tests). It is operator-facing surfaces + 3 P0 backend gaps.

### Per-domain (see also: `state/shared/specs/LAUNCH-READINESS-2026-05-24.md`)

```
Domain      Depth  -Block  -FE   Net  Weeks-to-Rev
Lathe         75    -20    -15   40   2-4
Mill          45    -10    -15   20   8-12
WEDM          30    -15    -15    0   12-16
CAM-facade    65    -10    -15   40   4-8
Post-Proc     55    -25    -15   15   6-10
```

### Revenue-blocker rank (top 10)

1. **P0 — Frontend merge gap.** 2 FE pending merge (cqask/ui Next.js 13, mcp-cadquery/frontend Vite/React 19). No operator UI = no revenue.
2. **P0 — Lathe body-rescale upgrader.** JM-DIE-LATHE-UPGRADE-MS0 audit: 96% FAIL (192/200) — V1/V2 upgrader skips machine.envelope rescale.
3. **P0 — Quote-to-ship wiring.** QUOTING-PIPELINE-MS0 wire-not-build (12 units; 7 bridges reuse 30+ engines, not connected end-to-end).
4. **P0 — Envelope drift (175 cases).** Planning untrustworthy until reconciled.
5. **P0 — Post-processor cross-controller validation.** Master-post thin; Fanuc→Okuma→Heidenhain dialect cross-map is structural-not-textual but explicit-map coverage incomplete.
6. **P1 — Mill engine depth.** Lathe 188 vs mill 58 (3.2× gap). Operator-perceived parity essential.
7. **P1 — WEDM domain-classification drift.** Graph 20 'wire' engines vs WEDM_DIGEST.json 62 — drift hides actual coverage.
8. **P1 — AI training pipeline.** AUROC 0.096 vs gate 0.78. Embedding-source fix landed 2026-05-23 — retrain pending. Also `U-NN-TRAINER-EXPORT-RESTORE` blocks pipeline.
9. **P1 — Tests/engine ratio 1.17.** Below 1.5 industry-defensible floor for revenue-bearing surfaces.
10. **P2 — Cumulative pending 2876 units.** Scope-bloat risk; defer non-launch units post-launch.

## PSN-leg health snapshot

| Leg | Status |
|---|---|
| 1. Obsidian brain | 🟢 9,635 memories |
| 2. PRISM OS | 🟢 97 dispatchers / 8,168 actions |
| 3. Wiki | 🟢 23,981 entries (4.2% broken links) |
| 4. Memories | 🟢 vault precheck firing |
| 5. Tribal | 🟡 0.8% wiki tribal embedding coverage |
| 6. System Viz | 🟡 282K nodes; regen FAILED 18h ago at merge augmentations |
| 7. Engines | 🟡 78% wired (729 unwired) |
| 8. Algorithms | 🟢 499 formulas |
| 9. Formulas | 🟢 |
| 10. NN/GNN | 🔴 AUROC 0.096 (gate 0.78), retrain pending |
| 11. PRISM AI | 🟡 4/7 PRISM-AI engines lack memo coverage (42.9%) |

## Compounding artifact (forge-v5+ tax)

This audit emits ≥1 re-runnable measurement tool per Hard Rule 3:

- `scripts/generate-launch-readiness-features.mjs` — /system-viz roost generator that renders the per-domain readiness as a navigable 3D node tree.
- `state/shared/specs/LAUNCH-READINESS-2026-05-24.{json,md,html}` — the audit itself is re-runnable (rerun via the same methodology after milestone close-outs).
- Future: `scripts/launch-readiness-rerun.mjs` (Phase 2 work) — bundles the audit into a single command + adaptive thresholds.

## Proposed milestone

**`PRISM-LAUNCH-READINESS-MS0`** — 32 units across 6 phases (P0 revenue-unblock, P1 domain-depth, P2 scenario-corpus, P3 ai-training, P4 prove-out, P5 launch-gates), 12 weeks, partitioned across 13 NATO slots.

See: `mcp-server/data/roadmaps/PRISM-LAUNCH-READINESS-MS0.json`

### Success criteria

- Composite readiness ≥80%
- Per-domain: lathe ≥85, mill ≥75, wedm ≥65, cam-facade ≥80, post-proc ≥90
- All 8 P0 units complete
- 7,800 scenarios across 5 domains
- AI training AUROC ≥0.78
- Prove-out pass rate ≥95%
- Frontend pending merges = 0

## Recent regressions surfaced by this audit

(Auto-appended to `H:/prism/CLAUDE.md ## Recent regressions` per Boris back-flow pattern.)

- **2026-05-24 — `MISC-TASKS-INVENTORY.json` stale + empty.** Schema 1.0.0 from 2026-05-16 reports `total_misc_tasks: 0` despite the CLAUDE.md narrative claiming 318. `scripts/extract-misc-tasks.mjs` should re-run. **Fix:** `node scripts/extract-misc-tasks.mjs` on golf-slot. **Verify:** `grep total_misc_tasks state/shared/specs/MISC-TASKS-INVENTORY.json`.
- **2026-05-24 — System-viz regen failure 18h.** SessionStart reported: regen FAILED at `merge augmentations` exit 1. Affects master-index search degradation. **Fix:** `node scripts/regen-viz.mjs --fast --resume merge-augmentations`. **Verify:** mtime of `state/shared/system-viz/system-graph.json` updates.
- **2026-05-24 — WEDM domain-classification drift.** Graph reports 20 'wire' engines vs `WEDM_DIGEST.json` claims 62. Domain classifier in `regen-viz.mjs` undercounts WEDM. **Fix:** WEDM-DOMAIN-CLASSIFY-FIX (P1-U02 of this milestone). **Verify:** post-fix `coverage-by-domain` matches digest.

## Deferred from this audit (R12 fail-loud)

| Deferred | Reason | Compensation |
|---|---|---|
| Peer-reviewer auto-spawn (Boris pattern) | Would consume ~30k tokens at 54%+ context already | Every finding has explicit verification channel — re-measurement cheap |
| `/forge7` scenario-gen contract design | Token budget; properly a next-/loop task | Slot partition documented; each domain slot owns its scenario gen |
| `/rgs6` envelope generation | Manual envelope authoring was faster this session | Manual envelope is well-formed; /rgs6 can refine in next iteration via adaptive thresholds |
| `/loop` 7d re-run registration | ScheduleWakeup not used in /loop per [[feedback_no_schedule_wakeup_in_loop]] | Re-run via `/forge-audit-v2 PRISM-LAUNCH-READINESS` after Phase 1 close |
| Raw commit-count verification | rtk wrapper summarized git log; raw bypass returned same 50 — investigation deferred | Doesn't change findings; affects metadata only |

## Next actions

1. **slot:romeo** — claim P0-U01 + P0-U02 (frontend merges) — highest-leverage P0
2. **slot:bravo** — claim P0-U03 (lathe body-rescale) — biggest revenue lift
3. **slot:charlie** — claim P0-U04 (quote-to-ship wiring) + P1-U02 (wedm classify fix)
4. **slot:india** — claim P0-U06 (post-proc validation corpus, 800 scenarios)
5. **slot:golf** — claim P0-U05 (envelope drift sweep) + integration
6. **slot:echo** — claim P3-U01 (AI trainer-export-restore) — unblocks all AI training

## References

- `H:/prism/state/shared/specs/LAUNCH-READINESS-2026-05-24.json` — machine-readable
- `H:/prism/state/shared/specs/LAUNCH-READINESS-2026-05-24.md` — full audit narrative
- `H:/prism/state/shared/specs/LAUNCH-READINESS-2026-05-24.html` — HTML companion
- `H:/prism/mcp-server/data/roadmaps/PRISM-LAUNCH-READINESS-MS0.json` — milestone envelope
- `H:/prism/scripts/generate-launch-readiness-features.mjs` — /system-viz roost generator
- `[[forge-audit-v2]]` — audit pipeline doctrine
- `[[roadmap-consolidation]]` — master remaining-work index
- `[[domain-pipeline-ms0]]` — per-domain pipeline skeleton
- `[[psn-definition]]` — 11-leg taxonomy
