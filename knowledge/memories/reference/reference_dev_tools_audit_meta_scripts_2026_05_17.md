---
name: reference-dev-tools-audit-meta-scripts-2026-05-17
description: "DEV-TOOLS-AUDIT META scripts shipped + empirical fleet-health discoveries (synergy/stale/cold/helpers/hook-fire)"
aliases: reference_dev_tools_audit_meta_scripts_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.089Z
---


# DEV-TOOLS-AUDIT META scripts + empirical fleet baselines (2026-05-17, slot echo)

## What shipped this session (8 commits)

Tribal-bridge wave (audit finding #3 + sibling):
- **cdad09490** — `MillingAGIMasterEngine` tribal-corpus wiring: DI seam `TribalConsultFn`, `tribal_status` provenance, top-5-by-confidence sources. Was: `tribalSources=[]` lie + `abductive()` "Evidence: tribal knowledge supports this" with no actual consultation. 47/47 tests, 6 P0/P1/P2 fixed in-commit per Karpathy R7.
- **44980b391** — `LatheAGIKnowledgeUnificationEngine` tribal seeding: same shape, KG engine. Adds `seedTribalTips()` after `seedCanonicalFormulas()` in constructor; static catalogs `KIENZLE_TIPS + TAYLOR_TIPS + THERMAL_TIPS + METALLURGY_TIPS + CHEMISTRY_TIPS + CHIP_PHYSICS_TIPS + DYNAMICS_TIPS + OKUMA_LATHE_TRIBAL_TIPS`. `normalizeTribalTip()` converges two parallel TribalTip shapes (physics-science `tip_id/description` vs Okuma `id/tip`). 34/34 tests.

META scripts (AUDIT-DEV-TOOLS-PIPELINES-2026-05-16 F3):
- **46f7cfeb2** — `scripts/stale-milestone-rank.mjs` (closes F2+F3): pure CLI ranks stale milestones for archive priority. Score = `pending*2 + age_days + 365-bonus-if-never-started`. Treats null/""/unparseable lastShippedDate as `never_started` (MILESTONE_PROGRESS.json emits `""` not null — strict null-check would mis-classify entire never-shipped cohort). 24/24 tests.
- **37feea659** — `scripts/dev-tool-leverage-rank.mjs` (final F3): aggregator over the 4 META tools (synergy/stale/cold/helper). Parallel `spawnSync` with 30s budget each. Per-tool `extract<Name>()` returns uniform envelope `{tool, status, findings: [{id, label, severity, score, detail}]}`. Severity rank `p0 > p1 > p2 > p3 > info` → score DESC → id ASC stable sort. Exit 0/1/2 cron-friendly. 39/39 tests.
- **317465aac8** — `scripts/hook-fire-rank.mjs` (F3 + F4 empirical): READS `mcp-server/data/state/hook-fire-counts.jsonl` (8K events) — alternative to fork-storm-prone spawn-based profiling. `parseLedger` + `aggregateFires` + `findZeroFireHooks` pure functions. 20/20 tests.

Tight surgical:
- **95ea2e394** — `stop-force-loop-continue.mjs` 1-line gate fix: `loop.status !== "active"` → `"running"`. `loop-state.mjs:71` writes `"running"`; the `"active"` gate was dead-code fleet-wide → `## RESUME_LOOP` re-injection never fired.
- **2513098c8** — `ProductPillarEngine` live wired-engine resolver (PILLAR-TELEMETRY-FIX, prior segment).

Skill (cross-attribution):
- `b1e599d5fc` — `.claude/commands/dev-tool-leverage.md` (runbook for the aggregator). Shipped via peer wholesale `git add` absorption; my "U-DEV-TOOL-LEVERAGE-SKILL" commit `57f0ceb47a` carried peer CAM-AGI files instead. Repo state correct, attribution scrambled.

## Empirical fleet-health discoveries (validated this session)

| Metric | Value | Source |
|---|---|---|
| Synergy ratio | 21.11% (-1.09pp vs 2026-05-09 22.20%) | `synergy-regression-watch.mjs` p0 alert |
| Stale milestones | 556 / 681 (81.6%) | `stale-milestone-rank.mjs` live smoke |
| Cold scripts | 485 / 823 (58.9%) | peer `cold-script-rank.mjs` |
| Orphan helpers | 76 | peer `helper-orphan-rank.mjs` |
| **Hooks never fire** | **500 / 510 (98%)** | `hook-fire-rank.mjs` discovery |
| Hooks actually firing | 10 unique over 393.7h | hook-fire-counts.jsonl |
| Top firer | `wiki-precheck-inject` 5.80/h | telemetry |
| Aggregator total findings | 13 (p0×1, p1×1, p2×4, p3×7) | `dev-tool-leverage-rank.mjs` |

**F4 empirical answer (audit's "set 400-hook upper-bound" intuition):** 605→510 hook count is mostly dead weight; ~83-98% of on-disk hooks never fire in a 16-day window. Reducing the on-disk count is safer than setting a budget threshold — most hooks contribute to session-start load+resolve overhead, not runtime budget.

## Recurring failure pattern this session: multi-chat collision-absorption

When a peer chat runs wholesale `git add -A` (or `git commit -a`) while my files are dirty/staged, their commit captures my hunks under their commit subject. Observed at least 4 times this session:
- iter 6 MillingAGI: peer absorbed iter 5 devDispatcher seam edit (clean — my work shipped, just under peer subject)
- iter 7 LatheAGI: peer's knowledge-conversion-roundtrip.test.ts absorbed into my commit
- iter 2 (new loop) hook-fire-rank: my commit absorbed 326 peer tribal-tip deletions from in-flight OBSOLESCENCE-CLEANUP-MS0/U-OBS-A4
- iter 3 (new loop) skill: peer's [[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]]/[[reference_u_feedback_forcing_2026_05_17|U-FEEDBACK-FORCING]] absorbed my skill file; my "U-DTL-SKILL" commit carried peer CAM-AGI files

**Mitigations attempted (partially effective):** explicit pathspec (`git add -- file1 file2` then `git commit -- path` — fails when path was added via `-f`), session-file-ownership.json claim-bumping (works), wait for `.git/index.lock` clearance.

**The real fix per CLAUDE.md doctrine:** sibling worktree per [[feedback_conflict_fork_rule]] — `git worktree add ../prism-<scope> -b work/<scope>`. The shared `H:/prism` tree with N concurrent chats running wholesale `git add` is structurally race-prone. Per-slot worktree migration (SLOT-WORKTREE-MS0 shipped 2026-05-16) is the durable answer — chats in `slot/<nato>` branches commit atomically without cross-tree absorption.

**Standing rule going forward:** if a chat detects 3+ commits in a row with peer-absorbed hunks, FORK to a sibling worktree before continuing. Don't fight the index in the shared tree.

## How to use these META scripts

```bash
# One-command dashboard over 4 sub-tools
node H:/prism/scripts/dev-tool-leverage-rank.mjs
node H:/prism/scripts/dev-tool-leverage-rank.mjs --json    # for hook consumption
node H:/prism/scripts/dev-tool-leverage-rank.mjs --tools synergy,stale

# Individual sub-tools (when you want depth not breadth)
node H:/prism/scripts/synergy-regression-watch.mjs
node H:/prism/scripts/stale-milestone-rank.mjs --top 25
node H:/prism/scripts/cold-script-rank.mjs --top 25
node H:/prism/scripts/helper-orphan-rank.mjs
node H:/prism/scripts/hook-fire-rank.mjs --include-zero
```

All support `--frozen-time ISO` for deterministic CI baselines.

## Follow-up units (NOT shipped this session)

- Wire `synergy-regression-watch.mjs` into a Stop hook (alert when p0 fires)
- Add `hook-fire-rank` to `dev-tool-leverage-rank.mjs` `SUB_TOOLS` registry (needs new `extractHookFire()` extractor)
- Build `unwired-engine-leverage-rank.mjs` (last F3 META still missing — but per `validate-unwired-signal.mjs`, the 836 pool is 96% noise → low signal value)
- F1 + F4 follow-ups need a wiki entry (`knowledge/wiki/architecture/dev-tools-audit-meta-scripts.md`) but wiki path is peer-regen-claimed — defer to a quieter session

## Sister memories
- [[reference_synergy_regression_watch_2026_05_16]] — F1 META artifact (already-shipped)
- [[feedback_conflict_fork_rule]] — the doctrine the absorption pattern triggers
- [[reference_slot_worktree_ms0_p3_cutover_complete]] — the durable answer to absorption
- [[reference_intel_ollama_p22_u03_collision]] — prior recurring-collision precedent
- [[feedback_dont_wire_for_wiring_sake_2026_05_16]] — informed the decision to skip wiring more orphan hooks
