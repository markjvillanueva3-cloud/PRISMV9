---
name: reference-us-c22-electrode-pairing-2026-05-22
description: ARC-MS6/muS-C22 ElectrodePairingEngine shipped+wired+tested (commit 647cb99381) — rougher/finisher naming-convention parser + sizing-rule validator wired as prism_edm:electrode_pairing_group. Charlie iter11 of 20.
aliases: reference_us_c22_electrode_pairing_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.984Z
---


**2026-05-22 charlie /loop iter 11.** Shipped ARC-MS6/muS-C22 — `ElectrodePairingEngine` (commit `647cb99381`).

**What it is.** Naming-convention parser + optional sizing-rule validator for sinker-EDM electrode sets. Takes a flat list of electrode filenames (typically a directory listing of a cavity's programs), detects the rough/semi/finish stage tag in each, groups by `cavity_id` (the filename with the stage tag stripped), and — when per-file XY dimensions are supplied — validates that stages decrease in size per cutting order (rough ≥ semi ≥ finish). Pure, deterministic, Zod-validated, ~430 lines.

**Pattern coverage.** 4 shop conventions, case-insensitive, boundary-anchored to avoid mid-word false-matches:
- suffix tag: `_R / _S / _F` (with optional trailing digit for stage_index)
- word tag: `_ROUGH / _SEMI / _FINISH`
- short tag: `_RUF / _SEM / _FIN`
- prefix tag: `R_ / S_ / F_` (or `ROUGH_ / SEMI_ / FINISH_`)
Per-stage patterns are tried longest-first (`_ROUGH` before `_R`) so word tags win over short ones. The `(?=\.|_|-|$)` lookahead is fixed-width — catastrophic-backtracking-safe — and prevents `_RIM` / `_FOO` from tripping the `_R` / `_F` patterns. Callers may override `patterns` entirely per shop.

**Where it sits.** `mcp-server/src/engines/ElectrodePairingEngine.ts`. Wired into `prism_edm` as action `electrode_pairing_group` (edmDispatcher.ts enum + lazy-import case + edmActionSchemas.ts Zod schema registered in `EDM_ACTION_SCHEMAS`). 20 tests in `src/__tests__/ElectrodePairingEngine.test.ts`: canonical 3-stage, multi-cavity, unpaired, case-insensitive, all 4 pattern families, stage_index capture, duplicate-stage tiebreak (lowest-index wins), sizing pass/violation/null, incomplete-warn + opt-out, empty input, deterministic ordering, engine-named validation errors. Distinct from the 10+ existing electrode engines (Design/Geometry/Inspection/Coverage/AI variants) — filename→cavity_id grouping was genuinely unowned.

**Bug found at runtime (not by reviewers).** First sizing-PASS test used a 2-stage set (`A_R.NC`/`A_F.NC`) — incomplete → `warn_on_incomplete` default-true added an aggregate warning → broke `expect(warnings).toHaveLength(0)`. Fix: use a complete 3-stage set so only the sizing assertion is load-bearing. **Same class of bug as iter 10's substring-collision** — reviewers PASSed the logic, runtime exposed the assumption. Lesson reinforced: always re-run after every fix; reviewer PASS ≠ runtime PASS.

**3-of-3 PASS×3, zero blockers.** P3 notes only: degenerate-stem inputs like `_F.NC` strip to cavity_id `.NC` (non-blocking, low-likelihood real-shop input).

**Charlie queue state after iter 11 (cumulative this session: iters 1-11).**
- SHIPPED (8 units across 11 iters): muS-D54..D55 (offset SPC), muS-D58..D59 (electrode inspection), P0-U02 Sinker AGI master, P0-U03 Laser AGI master, P0-U04 Waterjet AGI master, muS-C25 (electrode cost model), muS-C22 (electrode pairing).
- Phantoms verified DONE: muS-C19 (`SinkerEDMElectrodeGeometryEngine` complete + tested in `src/__tests__/engines/`), U-APPW41B (`TaptiteElectrodeMacroBridgeEngine` wired + 2 test files).
- **Remaining genuine candidates** (heavier modes than bounded build-and-wire):
  - **muS-C24 electrode-to-cavity traceability** — link electrode programs (`ROUGH_X.NC`) to die-cavity programs (`X.NC`). Requires corpus linking against the 489-file JM-DIE electrode archive + 972 Roku-Roku programs. Heavier than a pure-calc engine.
  - **muS-C01 wire EDM archive census** — index 4058 wire EDM files with mcx8-reader metadata. Corpus-harvest mode, not engine build.
  - **muS-C20 machine routing logic** (Roku-Roku vs Okuma 5AX vs OM-2 by electrode type) — concrete bounded engine, dedup-clean from existing engines, could be next.
  - **muS-C21 graphite vs copper decision engine** (workpiece material → electrode material) — concrete bounded engine.
  - **muS-C23 wafer die code decoder** (parse `WAFER880X334X145.MIN` → parametric geometry) — concrete bounded engine.
  - P0-U01 premature validate-unit (Lathe/WEDM AGI masters don't exist yet).
  - U-AITRAIN-WIRE-ELECTRODE-DEEP-LEARNING — heavy corpus training.

**Why:** muS-C20/C21/C23 are the same shape as muS-C25/C22 (pure-calc / parse / decide engines, bounded, dedup-clean, single-engine build-and-wire). They are the highest-ROI remaining set for the next session.
**How to apply:** When the cron next fires with fresh post-compact context: run `node .claude/helpers/priority-queue.mjs --pick --slot charlie`, then dedup-check muS-C20 (machine routing) FIRST — it's the most concrete (3 named machines, decision logic). Then C21 (graphite/copper decision), then C23 (wafer code decoder). Each follows the muS-C25/C22 template: engine + dispatcher case + schema + ≥12-test suite + per-file scrutiny + 3-of-3. Related: [[reference_us_c25_electrode_cost_2026_05_22]] · [[reference_arc_ms10_closeout_debt_2026_05_22]] · [[feedback_engine_tests_in_tests_dir]].
