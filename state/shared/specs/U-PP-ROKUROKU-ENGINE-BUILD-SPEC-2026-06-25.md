# U-PP-ROKUROKU-ENGINE -- build spec (template-derived, ready to execute)

> slot:echo, 2026-06-25. Enumeration complete (read `HurcoV11/HaasNGC` templates + `master_post_by_machine`
> + the golden). This is the precise blueprint so the next turn executes the engine in one focused pass with
> full comprehensive-build + per-file scrutiny + physics-review -- NOT a rushed turn-tail half-build (R12).
> VMC-05 Roku-Roku HC 658-II is the ONLY JM machine with neither track (else-rejects at camDispatcher.ts:7157).

## Foundation (verified this session)
- **Template:** `HaasNGCMillMasterPostEngine.ts` (508 lines) -- ~90% of its emit is **universal-ISO/Fanuc**
  and transfers verbatim: header block, safe-start `G0 G17 G40 G49 G80 G90`, tool-change `T# M6`,
  spindle `G0 G90 G54 X Y S M3`, `G43 H# Z`, coolant M8/M7, toolpath G0/G1/G2/G3 with **Fanuc I/J/R arc
  convention** (line 329 "Fanuc/Haas convention"), canned cycles G81/G82/G83/G73/G84/G85 (line 371
  "universal ISO codes Haas NGC uses natively"), retract `G91 G28 Z0.`, footer M5/G28/M30.
- **Input contract:** reuse `HaasMillOperation` shape (operation_type, tool_number, tool_diameter_mm,
  spindle_rpm, feed_mm_min, coordinates[], arc_data[], cycle, material_iso). Same as Hurco/Okuma/Haas.
- **Physics:** clone `physicsChecks()` -- canonical Kienzle/Taylor IMPORTED from `src/physics/constants.ts`
  (never inline). The machine envelope constants (MAX_RPM/MAX_FORCE) are advisory de-rates that WARN, not block.

## The Fanuc-31i-B5 / Roku-Roku deltas (the ONLY things that change vs HaasNGC)
1. **Header identity:** `(MACHINE: HAAS VF-2)` -> `(MACHINE: ROKU-ROKU HC 658-II)` + `(CONTROL: FANUC 31i-B5)`.
2. **Dialect tag:** `controller:"haas", dialect:"haas"` -> `controller:"fanuc", dialect:"fanuc-31i"`.
3. **High-speed smoothing:** Haas G187 -> **Fanuc `G05.1 Q1` AICC-II / Nano look-ahead** (Roku-Roku is a
   high-speed graphite/hard-mill). Source: the VERIFIED `knowledge/wiki/post-processor/post-processor-foundations.md`
   ("Fanuc G05.1 Q1 Alpha-I look-ahead method") -- NOT a copyrighted manual (clears U-LEGAL-13 for the dialect).
   Emit `G05.1 Q1` (look-ahead ON) after spindle / before G43; `G05.1 Q0` to cancel before M30. Make it
   opt-in via `config.use_lookahead` (default per the golden -- see below), mirroring HaasNGC's `use_g187` opt-in.
4. **TSC coolant:** HaasNGC emits `M88` for through-spindle-coolant. Roku-Roku TSC M-code is machine-config
   dependent -- keep flood/mist (M8/M7) universal; gate TSC behind a config flag, default OFF (do NOT
   fabricate the Roku-Roku TSC M-code -- verify vs the golden or leave caller-supplied; R12).
5. **Machine envelope:** Roku-Roku HC 658-II is a HIGH-SPEED VMC (graphite/hard-milling), so MAX_RPM is far
   above the VF-2's 8100. Do NOT fabricate the datasheet value -- make MAX_RPM a config field with a
   conservative advisory default + caller-override + advisory-only WARN (never a hard block), exactly like
   HaasNGC's MAX_FORCE_N. Note the assumption in a comment (R12).

## Acceptance / loss functions (R15)
- **Engine:** `RokuRokuFanuc31iMillMasterPostEngine.ts` exports the singleton + `generateProgram(operations, config)`.
- **Tests:** real R9 companion `RokuRokuFanuc31iMillMasterPostEngine.test.ts` -- happy + >=3 failure (empty ops,
  non-finite XY, invalid feed) + >=2 adversarial (NaN spindle, oversize) + the G05.1 Q1 emit + units-first
  (G20 inch scaling) + a canned-cycle case. >=10 cases, all reference-value.
- **Wire:** add a branch in `master_post_by_machine` (camDispatcher.ts ~7144, BEFORE the else-reject):
  `model.includes("ROKU") || model.includes("HC 658") || model.includes("FANUC 31") || model.includes("31I")`
  -> `rokuRokuFanuc31iMillMasterPostEngine.generateProgram(...)`. Update the else-reject's supported-list string.
  Ensure it does NOT mis-catch a Hurco/Haas/Okuma model (those branches PRECEDE it).
- **Validate (the new tool):** `node scripts/post-block-audit.mjs <emit.nc> --dialect fanuc --golden <Roku golden NC>`
  -> 0 surprise codes the golden never used (the cross-track parity check). Golden: `JM DIE/PRISM MODIFIED
  POST PROCESSORS/Roku-Roku-Ai-Enhanced.cps` is a Fusion .cps DEFINITION (not NC) -- find a real Roku-Roku
  emitted NC in the JM corpus for the vocabulary baseline, OR block-audit the engine's own emit for dialect
  sanity + invariants (no ERROR, program-end present, units declared).
- **Scrutiny:** per-file 2-arm (code-analyzer + reviewer) + physics-reviewer (mandatory -- it clones the force
  checks) + the end-of-task 3-of-3.

## After this: FA10S + EA-sinker-route (the last 2 gaps)
- **U-PP-FA10S-WIRE:** the route mis-sends FA10S -> MV1200R (wrong model/dialect). Add a W31MV-2 dialect
  profile selection to the Mitsubishi WEDM engine + route FA10S/W31MV before the generic MITSUBISHI branch.
- **U-PP-EA-SINKER-ROUTE:** RECONCILE the two sinker engines -- `edm_sinker_program` routes to
  `EDMProgramAssemblerEngine.assembleSinkerEDM` (its own SinkerEDMInput), NOT the canonical
  `PPSinkerEDMPostEngine.generate` (EA12V/EA12S/EA12D/EA28V machine-aware, EA12D added this session in
  `669c03dacf`). Decide the canonical sinker engine + a machine-routed EA-family action. NEEDS R8 (understand
  why two exist) -- not a blind wire.
