# Build Spec — `master_post_haas` (Haas NGC mill master post) — slot:echo

> **Why this is a spec, not a same-session build (R6 + R12):** the Haas post emits **real shop-floor G-code** for JM Die's VMC-03/04. The sibling `HurcoV11MillMasterPostEngine` (2,270 lines) and `OkumaOSPMillMasterPostEngine` (1,885 lines) were each built over *many* units with operator corroboration against real JM-posted NC. A correct Haas post must be built the same disciplined way — **from the real JM Haas corpus as ground truth** — not improvised in one autonomous pass. This spec makes that build mechanical + safe.
>
> **Closes:** the corpus `haas-vf2` entry's `status:"full-post-GAP"` (post-training-corpus.json L29-39) and condition-2's named remaining gap in `WINMAX-LIVE-TEST-LOG.md` ("build `master_post_haas`"). Cheap `.cps` Haas is ALREADY proven 15/15 dialect-clean; this is the **full post** side.

## 0. Ground truth FIRST (do this before writing a line of the engine)
Haas was NOT improvised for Hurco — it was mirrored from real `.cps` output. Same here:
1. `node scripts/cheap-cps-validate.mjs` surfaces the sampled **real JM Haas NC** paths (the 160,582-program corpus). Read 3-5 real Haas mill programs end-to-end.
2. Extract the EXACT, observed Haas structure (header order, tool-change block, canned-cycle form, footer) — do not invent. Cite the source program for each emitted block (the Hurco engine cites `HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps` line numbers — mirror that rigor).
3. Cross-check every emitted code against `scripts/post-nc-dialect-lint.mjs --dialect haas` rules (the proven 15/15 bar) BEFORE claiming done.

## 1. New engine: `mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts`
Mirror `HurcoV11MillMasterPostEngine` STRUCTURE (it is the template — read `generateProgram()` at L709-930 + the emit helpers `generateSafeStart`/`generateToolChange`/`generateSpindleStart`/`generateToolpath`/`performPhysicsChecks`). Reuse the SAME `MillOperation` / `MillTool` / `MillMaterial` contracts (corpus jobs already match them).

`export const haasNGCMillMasterPostEngine = new HaasNGCMillMasterPostEngine();`
`generateProgram(operations: MillOperation[], config?: Partial<HaasPostConfig>): HaasPostOutput`

### Emission skeleton (Haas NGC — VERIFY each against real JM NC + the haas dialect-lint)
- **Header:** `O#####` (5-digit, Haas convention) `(comment)` · `(MACHINE: HAAS VF-2)` · units `G20`(inch)/`G21`(mm) — **resolve from config.units; UNITS-FIRST per CLAUDE.md, a mismatch = 25.4× scrap**.
- **Safe start:** `G00 G17 G40 G49 G80 G90` (Haas safe-start canon — verify against real NC) · `G54` work offset.
- **Per operation:**
  - `(OPERATION n: TYPE)` `()`-comments (Haas/Fanuc paren comments — NOT Okuma `[]`).
  - Tool change: `T# M06` · `G43 H#` (tool-length comp) · optional `G187 P{1|2|3} E{}` **high-speed smoothing — CORRECT for Haas** (P1 rough/P2 default/P3 finish), UNLIKE Hurco where G187 is wrong (must be G05.3). This is the load-bearing dialect difference.
  - Spindle: `S# M03` · coolant `M08` (flood) AFTER spindle-at-speed (mill ordering).
  - Toolpath: `G00` rapids, `G01 F#` feeds from `coordinates[]`. Canned cycles: drill `G81`, peck `G83 Q# R#` (depth>3×D → peck — the playbook rule), `G80` cancel. Arc `G02/G03` when `arc_data` present.
- **Footer:** `M09` (coolant off) · `M05` (spindle stop) · `G91 G28 Z0` then `G28 X0 Y0` (or `G53` machine-home — verify JM convention) · `M30` · `%`.
- **pre-NGC variant** (`config.ngc:false` for VMC-03/04 if pre-Next-Gen-Control): NO NGC-only codes (no `G187` if the control predates it — confirm per machine; corpus note says "pre-NGC = no NGC G-codes"). Gate behind a config flag; default NGC=true (VF-2 NGC).

### Discipline (engines/CLAUDE.md + safety)
- **NO inlined physics constants** — any force/Kienzle check imports from `src/physics/constants.ts` (mirror Hurco `resolveKienzle` / `performPhysicsChecks`). kc1.1 map: P1800/M2100/K1100/N700/S2800/H3200.
- Return typed `HaasPostOutput` (mirror `HurcoPostOutput`: `gcode`, `warnings`, `physics_checks`, `tools_used`, `tribal_tips_applied`, `estimated_time`, `setup_sheet?`).
- Scope CUT to the CORE complete post (header/safe-start/per-op/canned-cycles/footer + physics checks). PSN-enrichment / prove-out / advanced-ASF / aggressiveness are SEPARATE follow-units (exactly how Hurco accreted them — U-PPGH02/H03/H04/PSN-MS0/MS1). A complete correct base post IS a "full post"; the extras are orthogonal.

## 2. Router branch: `camDispatcher.ts` `master_post_by_machine` (L6935-7038)
Add a Haas branch BEFORE the `else` reject (alongside Hurco/Okuma/Mitsubishi):
```ts
} else if (model.includes("HAAS") || model.includes("VF") || model.includes("VM2") /* Haas VM mills */ || model.includes("UMC")) {
  const { haasNGCMillMasterPostEngine } = await import("../../engines/HaasNGCMillMasterPostEngine.js");
  const callerCfg = ((params as any).config ?? {}) as Record<string, unknown>;
  const haasOut = haasNGCMillMasterPostEngine.generateProgram((params as any).operations, callerCfg as any);
  const { sealMasterPostOutput: sealHaas } = await import("../../cps/sealMasterPostOutput.js");
  result = sealHaas(haasOut, { source_engine_versions: { "HaasNGCMillMasterPostEngine": "1.0.0" }, verify_tier: (params as any).verify_tier });
}
```
- Update the `else` reject string (L7035) to list Haas in "Supported mills".
- **Anti-regression:** `master_post_by_machine` is an existing action — no new enum entry needed (it routes by `machine_model`). Confirm `sealMasterPostOutput` accepts the Haas output shape (it's generic over `{gcode,...}` — mirror the OSP/Hurco seal calls).
- Optional: also add a direct `master_post_haas` action (enum + case + schema) if a non-router entry point is wanted; the corpus `haas-vf2` post already uses `master_post_by_machine` w/ `machine_model:"HAAS_VF2"`, so the router branch ALONE unblocks it. Prefer router-only first (smaller, anti-regression-safe).

## 3. Schema
Reuse the existing mill master-post schema (the same `operations[]` MillOperation contract Hurco/OSP use via `master_post_by_machine`). No new schema needed for the router path. If adding a direct `master_post_haas` action, add `MasterPostHaasSchema` in `camActionSchemas.ts` mirroring the Hurco mill schema (L113-139).

## 4. Corpus wiring
`post-training-corpus.json` `haas-vf2` entry: once the router branch lands, flip `status` → `to-train`, `actionVerified` → true. The mill jobs (face-1op/pocket-2op/drill-cycle) already target it. The drill-cycle job (depth 10mm / dia 6.35mm = 1.57×, NOT >3×D) → expect `G81` not `G83` (verify the canned-cycle selection logic emits G81 here).

## 5. Tests (`mcp-server/src/__tests__/HaasNGCMillMasterPostEngine.test.ts` — NOT engines/__tests__/, per stop_on_unwired_assets scan path)
- **Reference-value** (R9): given the corpus `pocket-2op` ops → assert the emitted gcode CONTAINS `T1 M06`, `G43 H1`, `S877 M03`, `G54`, `()`-comments (not `[]`), `G21`(metric), `M30`, `%`; assert NO `G187` when pre-NGC, assert `G187 P` present when NGC; assert drill→`G81` (shallow) and a deep-drill fixture→`G83`.
- **Variability floor (≥3 spanning):** face / pocket / drill ops; metric vs inch units; NGC vs pre-NGC.
- **Failure modes (≥3):** empty operations[], op missing coordinates, NaN/negative feed (structured error, not throw, per engines/CLAUDE.md edge rule).
- **Adversarial (≥2):** Infinity rpm, oversize op list.
- **Round-trip E2E through the dispatcher** (not just the singleton): call `master_post_by_machine` w/ `machine_model:"HAAS_VF2"` → assert non-empty gcode + 0 reject.

## 6. Conformance bar (the SAME bar the other 3 posts met — this is "done")
`node scripts/post-training-harness.mjs --post haas-vf2 --generate --from-sfc --from-knowledge`:
- **3/3 jobs PERFECT** = `post-nc-dialect-lint --dialect haas` **0 ERRORs** + structural-100% (the proven Haas bar — cheap-cps proved the linter on 15 real programs).
- SFC speeds/feeds flow through (`--from-sfc`).
- Knowledge traveler + playbook conformance emitted (`--from-knowledge`, already built U-PT-KNOWLEDGE-ENRICH).

## 7. Reflect (close-out — feedback_reflect_all_changes_post_update)
- `WINMAX-LIVE-TEST-LOG.md`: move "build master_post_haas" from Remaining → PROVEN (condition 2 full side complete for Haas).
- Wiki: `knowledge/wiki/code-tribal/` Haas-post entry. Memory: `reference_master_post_haas_*`.
- CLAUDE.md `## Recent regressions` if any bug found during build.

## Haas-specific gotchas (load-bearing — get these wrong = scrap/crash)
1. **G187 is CORRECT for Haas** (high-speed smoothing P1/P2/P3) — the OPPOSITE of Hurco (where G187→must be G05.3). This is the #1 reason a generic mill post mis-emits for Haas.
2. **`()` paren comments** (Haas/Fanuc) — never Okuma `[]`.
3. **`M08` coolant AFTER `M03`-at-speed** (mill ordering; lathe differs).
4. **UNITS FIRST** — `G20`(inch)/`G21`(mm) from config.units; JM Haas programs are commonly INCH — verify per program, a units mismatch is a 25.4× scale error.
5. **pre-NGC vs NGC** — VMC-03/04 may be pre-Next-Gen-Control; gate NGC-only codes behind config.
6. **5-digit O-numbers** (`O#####`) Haas convention.
7. Decimal-point programming (`X1.0` not `X10000` — that's Okuma's no-decimal trap).

---
_Author: slot:echo (claude-321c1d3f), 2026-06-01, U-PT-HAAS-SPEC. Template engine: `HurcoV11MillMasterPostEngine.ts`. Ground-truth corpus: JM Die Haas mill NC via `cheap-cps-validate.mjs`._
