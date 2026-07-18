# Lathe Galaxy GSD.md — domain Get-Stuff-Done session protocol (slot:whiskey)

> The lathe-domain session lifecycle. Complements the root `mcp-server/data/docs/gsd/GSD_QUICK.md` (fleet-wide hooks) — this file is the **turning-specific** order-of-operations a whiskey session follows from orient → emit → ship → close. Cascade-injects when editing under `engines/lathe/`. Pointers, not duplication. Built 2026-05-29 (U-PSGB-WHISKEY-GSD).

## 0. The one law
**Physics-first, safety-gated, Okuma-default.** A turning program is a chuck spinning a part at speed near a human; every emit passes the safety sequence (§3) BEFORE it ships. JM Die is **100% Okuma OSP** — default the dialect to Okuma, never Fanuc, or you misprogram every job.

## 1. Orient (session start)
1. `/galaxy-verify-whiskey` — loads the galaxy brain (CLAUDE/MEMORY/PATHS/TOOLBELT) + runs the 13-gate + PSN check.
2. Confirm **Okuma-default** (LTH-01..07, OSP-P300/P200/U10/P500/P300SA). `[[reference_jm_die_is_okuma_heavy_implications_2026_05_27]]`.
3. **Health-check the stack** — `node scripts/ollama-docker-health.mjs` (or just try it). MCP port 3100 / Ollama `/api/chat` / qdrant are *frequently down*. Map to offline fallbacks (§8) immediately — do NOT wait for a dispatcher timeout mid-task.
4. Read THIS session's handoff (`per-agent-handoff.mjs read`).

## 2. Before building (dedup + constants)
- `duplicationGuardEngine.mustCheckBeforeCreating()` — ~238 lathe engines exist flat in `engines/`. Check before any new engine (THROWS on dup).
- **Read `physics/constants.ts` BEFORE any physics edit** — never inline kc1.1 / mc / Taylor / chip-breaker geometry. Inlining is a P0 (hook-blocked).
- Pick work from the slot/domain queue (`/pick-unit --slot whiskey`) or the priority queue.

## 3. Pre-emit safety sequence (THE lathe ritual — in order, every program)
1. **Workholding** — `prism_turning:lathe_workholding_select_jaw` (chuck-jaw force, pull-out resistance, lift-off moment).
2. **Part-off / catcher** — `prism_turning:lathe_partoff_safety_gate` (timing + clearance).
3. **Composite predicate** — `prism_turning:lathe_safety_predicate_evaluate` (proof-carrying).
4. **Per-op spindle envelope** — `prism_safety:check_spindle_torque` + `check_spindle_power` (NOT a fresh formula; NOT `lathe_spindle_*` — those action IDs do not exist).
5. **G50 cap on every G96** — CSS runs RPM up at small Ø → chuck overspeed. `G50 S<max>` mandatory. Missing = −20 / crash.
6. **Feed-mode confirm** — G95 (IPR) for turning; G94 (IPM) is a 10× crash risk. Confirm against the controller dialect.
7. **Threading** — multi-pass G76 rough→semi→finish; never single-pass / bare G92 a tolerance thread.
8. **Parting/grooving** — depth >3× tool width → G75 peck (chip evacuation).
9. **Sub-spindle handoff** — phase-sync ≤0.5°.
10. **Live-tooling C-axis** — Cartesian XYZ+C OR polar G12.1/G13.1; confirm mode against the post.
Shop-floor tier: **Ω≥0.95, S(x)≥0.98**.

## 4. Validate ladder (cheapest → strongest)
1. **`/lathe-lint <prog.nc>`** — offline, ms, the 8 gotchas as PASS/FAIL. Run FIRST (works when 3100 is down). `[[lathe-program-lint]]`.
2. **`command node scripts/lathe-quality-pipeline.mjs <prog>`** — 10-pt quality rubric (EXPERT≥80). `[[reference_lathe_program_quality_rubric_2026_05_27]]`.
3. **MCP `lathe_validate_program` / `lathe_check_collision`** — when 3100 is up (richer; the linter is the pre-flight, not the replacement).
4. **Cpk gate** — `TurningCpkSurrogateEngine` pre-cut; `prism_quality:*` post.

## 5. Ship
- Post via the Okuma master-post (`OkumaB250LatheMasterPostEngine` / `MasterPostEngine`) — `[[lathe-okuma-dialect]]`.
- `/ship-lathe` (final gate + sign-off).

## 6. Close (every session)
- **Multi-file build → per-file scrutiny** (2 reviewers after EACH file) per `[[feedback_parallel_scrutiny_per_file]]`.
- **End-of-task 3-of-3** Stop gate (arms A+B+C all PASS) on the session diff.
- Commit `[whiskey] [<SCOPE>]/U-<id>: <title>` from the slot worktree (`H:/prism-slot-whiskey`). If `slot-commit-enforce` misresolves the slot, the `[BOOTSTRAP-SLOT-ENFORCE]` token is the audited one-off.
- **Doc-reflect 4 surfaces** per `[[feedback_reflect_all_changes_post_update]]`: galaxy CLAUDE/MEMORY (+TOOLBELT/PATHS if pathing changed) + wiki + Obsidian memory.
- `/handoff` (or `/compact` auto-writes) — RESUME directive for the next session.

## 7. Domain failure modes to NEVER repeat (mined R12 lessons)
1. **Annotation pass ≠ machining improvement** — `JMDieLatheProgramUpgraderV2` is pure pass-through; never claim machining-content gains from it. `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]`.
2. **Comment-strip before scanning G-code** — codes inside `( … )` / `[ … ]` false-trigger detection (cost the iter265 + linter bugs). Strip per-line first.
3. **Empty-source classification** — A-file <10 real lines → `empty_source`, never scored (inflates deltas).
4. **AB-locator base-name priority** — prefer base-name-matched B over filename-suffixed variants (iter279-281 SFS anomaly).
5. **JM Die "B" programs are AI-generated**, not human master revisions — adopting their patterns is partly self-referential. `[[feedback_jm_die_b_versions_are_ai_not_human_upgrade]]`.
6. **`lathe_spindle_*_check` action IDs do NOT exist** — use `prism_safety:check_spindle_torque`/`check_spindle_power`. (Cost a 3-of-3 R12 block 2026-05-29.)

## 8. Offline degradation (MCP/Ollama/qdrant down — the common case)
| Want | Online | Offline fallback |
|------|--------|------------------|
| program validate | `lathe_validate_program` | **`/lathe-lint`** + `lathe-quality-pipeline.mjs` |
| where-is-X | `master_index_query` | Glob/Grep per PATHS.md (system-viz graph search if graph fresh) |
| tribal recall | `tribal_search`/`semantic_search` (qdrant) | Glob `*{whiskey,lathe,okuma}*.md` @ memory dir; `query-lathe-tribal.mjs` |
| summarize/explain | Ollama `/ollama-*` | do it inline (Claude) |

## Related
- Galaxy: [[lathe-galaxy]] · safety: [[lathe-safety-gates]] · dialect: [[lathe-okuma-dialect]] · lint: [[lathe-program-lint]]
- Root GSD: `mcp-server/data/docs/gsd/GSD_QUICK.md` · soul: `state/shared/slot-souls/whiskey.md`
