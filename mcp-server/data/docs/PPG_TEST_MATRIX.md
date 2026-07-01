# PPG Comprehensive Test Matrix v2

## Targets
- **New scenarios:** 1,847
- **New test files:** 72
- **Existing PP tests:** 1,508 across 57 files
- **Total post-completion:** 3,355+ test scenarios
- **Threshold:** 95/100 on 20-agent scrutiny

## v1 Scorecard (44.8/100 — FAIL)
Catastrophic gaps: multi-tool integration (8), turning (12), regression (22),
scalability (25), physics citations (28), fixture design (28), assertions (31).
v2 addresses ALL 20 findings.

---

## PART A: TEST INFRASTRUCTURE (must build BEFORE any test scenarios)

### A1. Shared G-Code Comparator Utility
**File:** `src/__tests__/helpers/gcode-comparator.ts`

Single canonical comparison utility used by ALL 72 test files. Replaces the
two disconnected parsers (ProgramCompareEngine.normalizeLine + gcode-parser.ts).

```typescript
// Normalization contract — exact specification
export function normalizeGcode(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')           // CR+LF → LF
    .split('\n')
    .map(line => line
      .replace(/\(.*?\)/g, '')         // strip () comments (Fanuc/Haas)
      .replace(/;.*$/g, '')            // strip ; comments (Siemens/Heidenhain)
      .replace(/^\s*N\d+\s*/g, '')     // strip N-line numbers
      .replace(/\s+/g, ' ')           // collapse whitespace
      .trim()
      .toUpperCase())
    .filter(line => line.length > 0 && line !== '%')
    .join('\n');
}

// Structural comparison — ignores comments, N-numbers, whitespace, EOL
export function assertGcodeEqual(actual: string, expected: string): void {
  expect(normalizeGcode(actual)).toBe(normalizeGcode(expected));
}

// Property-based validation — every block checked
export function assertNoNaN(output: ParsedBlock[]): void {
  for (const block of output) {
    if (block.S !== undefined) expect(Number.isFinite(block.S)).toBe(true);
    if (block.F !== undefined) expect(Number.isFinite(block.F)).toBe(true);
    if (block.X !== undefined) expect(Number.isFinite(block.X)).toBe(true);
    if (block.Y !== undefined) expect(Number.isFinite(block.Y)).toBe(true);
    if (block.Z !== undefined) expect(Number.isFinite(block.Z)).toBe(true);
  }
}

// Machine limit validation
export function assertWithinLimits(output: ParsedBlock[], machine: MachineConfig): void {
  for (const block of output) {
    if (block.S !== undefined) {
      expect(block.S).toBeGreaterThan(0);
      expect(block.S).toBeLessThanOrEqual(machine.max_rpm);
    }
    if (block.F !== undefined && block.type === 'cutting') {
      expect(block.F).toBeGreaterThan(0);
      expect(block.F).toBeLessThanOrEqual(machine.max_feed);
    }
  }
}

// Feed format validation
export function assertMillingFeedInteger(output: string): void {
  const motionLines = output.split('\n')
    .filter(l => /^[GN]/.test(l.trim()) && /F\d/.test(l) && !/G84|G95|G93/.test(l));
  for (const line of motionLines) {
    expect(line).toMatch(/F\d+(?!\.\d)/);  // F followed by digits, no decimal
  }
}

export function assertTappingFeedPrecise(output: string, unit: 'inch' | 'mm'): void {
  const tapLines = output.split('\n').filter(l => /G84/.test(l) && /F/.test(l));
  const decimals = unit === 'inch' ? 4 : 3;
  for (const line of tapLines) {
    const fMatch = line.match(/F(\d+\.\d+)/);
    expect(fMatch).not.toBeNull();
    expect(fMatch![1].split('.')[1].length).toBe(decimals);
  }
}
```

### A2. Test Fixture Schema
**File:** `src/__tests__/helpers/ppg-fixture-schema.ts`

Every test fixture follows this interface. Parameterized: same geometry, different controller output.

```typescript
export interface PPGTestFixture {
  id: string;                        // e.g., "face-mill-4140-haas"
  geometry: CanonicalGeometry;       // shared geometry across controllers
  machine: { brand: string; model: string; controller: string; max_rpm: number; max_feed: number; max_power_kw: number; travel: [number, number, number]; };
  material: { name: string; iso_group: string; kc1_1: number; mc: number; source: string; };
  tools: ToolFixture[];
  operations: OperationFixture[];
  expected_output: { [controller: string]: string };  // golden G-code per controller
  expected_properties: {
    no_nan: true;
    feeds_integer_milling: true;
    feeds_precise_tapping: true;
    within_machine_limits: true;
    safe_start_present: true;
    program_end_present: true;
  };
}

export interface CanonicalGeometry {
  description: string;               // e.g., "4x4x1 inch block, 0.5 deep pocket"
  stock: [number, number, number];   // LWH
  features: Feature[];               // pockets, holes, etc.
}

export interface ToolFixture {
  number: number;                    // T1, T2, ...
  type: string;                      // "endmill", "drill", "tap", "face_mill"
  diameter: number;
  flutes: number;
  description: string;               // "1/2 4FL CARBIDE EM"
  offset_number: number;             // H1, H2, ... MUST match T number
  expected_rpm: number;
  expected_feed: number;
  expected_sfm: number;
  expected_ipt: number;
}
```

### A3. Test Generator Framework
**File:** `src/__tests__/helpers/ppg-test-generator.ts`

Parameterized test generation via `it.each` / `describe.each`. One template
generates 10 controller variants automatically.

```typescript
export const CONTROLLERS = [
  { id: 'haas_ngc', name: 'Haas NGC', safe_start: 'G28 G91 Z0.\nG90 G80 G40 G17', tool_change: 'T{t} M06\nG43 H{h}', program_end: 'M30\n%' },
  { id: 'fanuc_31i', name: 'Fanuc 31i', ... },
  { id: 'siemens_840d', name: 'Siemens 840D', ... },
  { id: 'heidenhain_tnc', name: 'Heidenhain TNC640', ... },
  { id: 'mazak_smooth', name: 'Mazak SmoothAi', ... },
  { id: 'okuma_osp', name: 'Okuma OSP-P300', ... },
  { id: 'hurco_winmax', name: 'Hurco WinMax', ... },
  { id: 'dmg_celos_s', name: 'DMG MORI CELOS (Siemens)', ... },
  { id: 'dmg_celos_f', name: 'DMG MORI CELOS (Fanuc)', ... },
  { id: 'brother_speedio', name: 'Brother Speedio', ... },
  { id: 'doosan_puma', name: 'Doosan Puma', ... },
] as const;

export const OPERATIONS = [
  'face_mill', 'pocket_2d', 'contour_2d', 'adaptive_2d', 'slot',
  'chamfer', 'engrave', 'drill', 'peck_drill', 'chip_break',
  'tap_rigid', 'bore', 'ream', 'thread_mill', '3d_parallel',
  '3d_scallop', '3d_pencil', '3d_steep_shallow', 'swarf',
  '4th_axis_index', '3plus2_positional', '5axis_simultaneous',
  'css_turning', 'rough_turning_g71', 'finish_turning_g70',
  'threading_g76', 'grooving', 'parting',
] as const;

// Auto-generates test.each matrix
export function generateControllerOpMatrix(
  controllers: typeof CONTROLLERS,
  operations: typeof OPERATIONS,
  testFn: (ctrl: Controller, op: Operation) => Promise<void>
) { /* returns describe.each blocks */ }

// Auto-scan folder for real programs
export function generateRealProgramTests(
  dir: string,
  machineContext: MachineConfig,
  validateFn: (result: PipelineResult) => void
) { /* returns test per file found */ }
```

### A4. Regression Infrastructure
**File:** `src/__tests__/helpers/ppg-regression.ts`

```typescript
// Golden reference management
export const GOLDEN_REF_DIR = 'src/__tests__/fixtures/golden-references/';

// Update golden references (run manually: PRISM_UPDATE_GOLDEN=1 npx vitest)
export function updateGoldenRef(controller: string, program: string, output: string): void;

// Compare against golden reference with detailed diff on failure
export function assertMatchesGolden(controller: string, program: string, actual: string): void;

// Snapshot strategy: structural snapshots (not byte-exact)
// Ignores: comments, N-numbers, whitespace, blank lines, EOL chars
// Preserves: G/M codes, coordinates, S/F values, tool numbers

// Suite time budget: total < 5 minutes on CI
export const SUITE_TIME_BUDGET_MS = 300_000;

// Flaky test strategy: real-program tests that fail on parse edge cases
// get quarantined to ppg-quarantine.test.ts with documented reason
// Quarantined tests run but don't fail CI — they log warnings instead

// Deterministic seeding for fuzz tests
export const FUZZ_SEED = 42;  // reproducible random sequences
```

### A5. CI Gate Definition
**Pre-commit hook (enforced):** `npx vitest run src/__tests__/ppg-*.test.ts`
**CI pipeline gate:** All PPG tests + all PP-MOAT tests must pass.
**Blocking rule:** No commit can break golden references or safety tests.
**Suite time budget:** < 5 minutes total for all PPG tests.
**PP-MOAT continuity:** MOAT-MS1 (20) + MS2 (44) + MS3 (40) = 104 tests
must continue passing after every PPG change.

---

## PART B: TEST CATEGORIES (18 categories, 1,847 scenarios)

### B1. Controller × Operation Matrix (11 × 28 = 308 scenarios)
**Files:** `ppg-matrix-{controller}.test.ts` (11 files, auto-generated)
**Generator:** `ppg-test-generator.ts` with `describe.each(OPERATIONS)`

Operations now include ALL Fusion 360 types + turning:
- Milling (12): face, pocket, contour, adaptive, slot, chamfer, engrave, 3D parallel, 3D scallop, 3D pencil, 3D steep-shallow, swarf
- Holemaking (6): drill, peck drill, chip break, tap rigid, bore, ream
- Thread (1): thread mill
- Multi-axis (3): 4th-axis index, 3+2 positional, 5-axis simultaneous
- Turning (6): CSS rough, CSS finish, G71 canned rough, G70 canned finish, G76 threading, grooving/parting

Each cell: pipeline processes fixture → output validated for correct syntax, no NaN, within limits.
Controllers: 11 (DMG MORI split into Siemens/Fanuc sub-dialects).

**Assertions per cell:**
```typescript
assertNoNaN(output.blocks);
assertWithinLimits(output.blocks, machine);
assertSafeStartPresent(output.raw, controller);
assertProgramEndPresent(output.raw, controller);
```

### B2. Feed Format Matrix (11 × 8 = 88 scenarios)
**Files:** `ppg-feed-format-{controller}.test.ts` (11 files, table-driven)

| Feed Type | Input | Expected | Assertion |
|---|---|---|---|
| Milling (IPM) | F80.000 | F80 | `/F\d+(?!\.\d)/` |
| Milling (mm/min) | F2032.0 | F2032 | `/F\d+(?!\.\d)/` |
| Tapping (inch) 1/4-20 | pitch=0.05 | F0.0500 | exact 4 decimals |
| Tapping (inch) 3/8-16 | pitch=0.0625 | F0.0625 | exact 4 decimals |
| Tapping (inch) 7/16-20 | pitch=0.05 | F0.0500 | exact 4 decimals |
| Tapping (metric) M6x1.0 | pitch=1.0 | F1.000 | exact 3 decimals |
| Tapping (metric) M8x1.25 | pitch=1.25 | F1.250 | exact 3 decimals |
| Tapping (metric) M10x1.5 | pitch=1.5 | F1.500 | exact 3 decimals |
| Sub-1 IPM (finish) | F0.003 | F0.0030 | preserved, not F0 |
| Rapid (G0) | — | no F | `/G0[^F]*$/` |
| Inverse time (G93) | F2.5 | F2.5000 | 4 decimals |
| Feed-per-rev (G95) | F0.008 | F0.0080 | 4 decimals |

### B3. Structural Blocks (11 × 3 = 33 scenarios)
**File:** `ppg-structural-blocks.test.ts` (1 file, table-driven from ControllerDialectEngine)

Per controller: safe start, tool change, program end.
Golden reference values sourced directly from ControllerDialectEngine config.
```typescript
describe.each(CONTROLLERS)('$name structural blocks', (ctrl) => {
  it('safe start matches dialect engine', () => { /* ... */ });
  it('tool change T1 M06 G43 H1', () => { /* ... */ });
  it('program end M30 / END PGM', () => { /* ... */ });
});
```

### B4. G-Code Structural Correctness (NEW — 100 scenarios)
**Files:** (5 files — addresses v1 score 52 "coverage gaps")
This entire category was MISSING from v1.

**`ppg-subprograms.test.ts`** (15 scenarios)
- M98 P-call (Fanuc/Haas/Okuma/Doosan)
- M97 local subprogram (Haas)
- G65 macro call with arguments (Haas/Fanuc)
- L-call (Siemens)
- Heidenhain CALL PGM / CALL LBL
- Nested subprogram (M98 within M98)

**`ppg-coolant-codes.test.ts`** (15 scenarios)
- M08 flood ON after every tool change
- M09 flood OFF before Z retract
- M88 through-spindle coolant (where supported)
- M07 mist coolant
- Coolant required for Ti-6Al-4V (mandatory flood — WARN if missing)
- Coolant required for 316L stainless
- No coolant for aluminum (acceptable)

**`ppg-compensation.test.ts`** (20 scenarios)
- G41/G42 cutter comp entry (approach move required)
- G41/G42 exit (departure move required)
- G40 cancel before tool change
- G43 H{n} tool length — H must match T number
- G43 H0 → WARNING (almost always wrong)
- G44 (negative comp) handling
- Concurrent G41 within G41 → ERROR
- Tool nose radius comp (TNRC) for turning: G41/G42 with nose vector T1-T9

**`ppg-work-offsets.test.ts`** (15 scenarios)
- G54 through G59 (6 standard offsets)
- G54.1 P1 through P48 (extended offsets, Fanuc/Haas)
- G15 (Okuma coordinate system)
- Multi-WCS program: G54 OP1 → G55 OP2 → G56 OP3
- WCS-aware travel limit check (X100 in G55 ≠ X100 in machine coords)

**`ppg-misc-gcodes.test.ts`** (35 scenarios)
- G02/G03 circular: IJK format, R format, full circle, helical
- G04 dwell: P seconds (Fanuc), P milliseconds (Haas), X seconds
- G28/G30/G53 retract per controller dialect
- M140 Z-retract (Hurco)
- M01 optional stop — present when configured
- "/" block skip character — correct position
- N-word line numbers — on/off per setting
- % program start/end markers per dialect
- CR+LF vs LF output per target platform
- Line length limit: 250 char (Fanuc 0i), 512 char (Okuma), unlimited (Siemens)
- Comment format: (text) Fanuc/Haas, ;text Siemens, ;text Heidenhain
- G20/G21 metric/imperial header per convention

### B5. Canned Cycles — Per-Dialect (3 dialect groups × 10 cycles = 80 scenarios)
**Files:** `ppg-cycles-fanuc-compat.test.ts`, `ppg-cycles-siemens.test.ts`, `ppg-cycles-heidenhain.test.ts`

**Fanuc-compatible** (Haas, Fanuc, Okuma, Mazak, DMG-Fanuc, Brother, Doosan):
G81 spot/drill, G82 counterbore (P dwell), G83 peck (Q depth), G73 chip break,
G84 rigid tap (F = pitch), G85 bore, G86 bore-stop, G87 back bore, G89 bore-dwell.
**Mazak additions:** G130 tornado tap (Mazak-specific).
**Okuma additions:** G85/G86 roughing/finishing turning cycles.

**Siemens:** CYCLE81, CYCLE82 (bore/counterbore), CYCLE83 (deep drill),
CYCLE84 (tap), CYCLE85 (bore), CYCLE86 (bore orient), CYCLE87 (bore stop),
MCALL pattern. CYCLE800 (tilted workplane). CYCLE832 (HSM tolerance).

**Heidenhain:** CYCL DEF 200 (drill), 201 (ream), 202 (bore), 203 (countersink),
204 (back bore), 205 (peck), 206 (rigid tap), 207 (tap chuck), 252 (pocket),
254 (groove). CYCL CALL after every CYCL DEF.

Each cycle tested with: 10mm hole, 20mm deep, Q2 peck, P0.5 dwell where applicable.

### B6. Turning-Specific Test Suite (NEW — 120 scenarios)
**Files:** (6 files — addresses v1 score 12 "turning gap")
This was CATASTROPHICALLY missing from v1.

**`ppg-turning-css.test.ts`** (25 scenarios)
- G96 constant surface speed activation
- G97 constant RPM activation
- G96→G97 transition mid-program
- G96 with G50 S-clamp at minimum diameter
- G96 at D=0mm → HARD STOP (infinite RPM) → ERROR, block output
- G96 at D=2mm on 6000 RPM max → S limited to ~6000, not exceeded
- CSS RPM validation at 5 different diameters (OD, ID, face, groove, part-off)
- Correct SFM from material (4140: 400 SFM, 6061: 1000 SFM, 316L: 200 SFM)

**`ppg-turning-canned-cycles.test.ts`** (25 scenarios)
- G70 finish turning cycle (Fanuc pattern)
- G71 rough turning cycle (depth, retract, finish allowance)
- G72 rough facing cycle
- G76 single-point threading (lead, depth, passes, spring passes)
- G92 threading (older format)
- Okuma-specific: G85/G86 roughing/finishing cycle
- Each cycle validated for: correct parameters, no NaN, feed-per-rev (G95/G99)

**`ppg-turning-tnrc.test.ts`** (15 scenarios)
- G41/G42 with tool nose vector (T1-T9 orientations)
- TNRC for outside turning (G42)
- TNRC for inside boring (G41)
- TNRC for facing (orientation-dependent)
- Cancel TNRC (G40) before tool change
- No TNRC for grooving tools (warning if applied)

**`ppg-turning-feed-modes.test.ts`** (15 scenarios)
- G95 feed-per-revolution (turning default)
- G94 feed-per-minute (live tooling)
- G95→G94 transition for live tooling on lathe
- G99 feed-per-rev in canned cycles (turning)
- G98 feed-per-min in canned cycles (milling on lathe)
- Feed format: G95 F0.008 (4 decimals), G94 F80 (integer)

**`ppg-turning-workholding.test.ts`** (20 scenarios)
- Chuck clamp M10/M11 (Fanuc) or M68/M69 (Okuma)
- Tailstock advance/retract M14/M15
- Bar feeder advance M99 (with counter)
- Part catcher M37/M38 (Haas)
- Sub-spindle transfer M23/M24 (spindle orient)
- Collet open/close M10/M11
- Verify clamp BEFORE cut, unclamp AFTER retract

**`ppg-turning-live-tooling.test.ts`** (20 scenarios)
- C-axis engagement G12.1 (Fanuc) / G112 (Okuma)
- C-axis milling: cross-drilling, cross-milling, polygon turning
- G13.1 C-axis cancel
- Y-axis milling on mill-turn (if equipped)
- Correct transition: spindle stop → C-axis lock → live tool start → mill → unlock → spindle restart

### B7. Multi-Tool Integration Tests (NEW — 60 scenarios)
**Files:** (4 files — addresses v1 score 8 "multi-tool")
This was CATASTROPHICALLY missing from v1.

**`ppg-multi-tool-5tool-mill.test.ts`** (15 scenarios)
Canonical 5-tool milling program:
T1=1" face mill (rough face), T2=1/2" EM (pocket rough), T3=1/2" EM (pocket finish),
T4=#7 drill (6 holes), T5=1/4-20 tap (6 holes)
- Each tool has DIFFERENT S/F (verified per tool)
- H numbers match T numbers (H1=T1, H2=T2...)
- G43 H{n} appears after every M06
- Coolant: M08 after each tool, M09 before retract
- WCS: G54 throughout (single setup)
- Program structure: safe start → T1 → T2 → T3 → T4 → T5 → M30

**`ppg-multi-tool-10tool-production.test.ts`** (15 scenarios)
Canonical 10-tool production program (realistic):
T1=2" face mill, T2=1" EM rough, T3=1/2" EM finish, T4=chamfer mill,
T5=center drill, T6=#Q drill, T7=3/8-16 tap, T8=1" drill,
T9=1" bore, T10=3/8" EM (deburr)
- S/F vary per tool AND per pass (T2 rough vs T3 finish)
- WCS: G54 for OP1 (top), G55 for OP2 (flip, bottom)
- Coolant transitions: flood (T1-T3), TSC (T6-T9), mist (T10)
- Prove-out mode: all S/F derated 50% feed / 80% speed
- Tool magazine: T2 staged while T1 cuts (next-tool optimization)

**`ppg-multi-tool-same-tool-reuse.test.ts`** (15 scenarios)
- T3 for roughing, then T3 again for finishing (same tool, different S/F)
- Verify T3 gets rough S/F first time, finish S/F second time
- No spurious M06 between same-tool operations (optional optimization)
- G43 H3 verified on both uses

**`ppg-multi-wcs.test.ts`** (15 scenarios)
- G54 → G55 → G56 (3 setups in one program)
- Each WCS has different Z-zero (part flip)
- Retract to safe Z BEFORE WCS change
- Correct WCS after tool change (not reset to G54)
- Extended offsets: G54.1 P1 through P6

### B8. Safety / Edge Cases (100 scenarios — expanded from 80)
**Files:** (6 files)

**`ppg-nan-guard-exhaustive.test.ts`** (25 scenarios)
Fuzz inputs that must NEVER produce NaN:
- missing material → conservative default S/F
- zero diameter tool → ERROR, not NaN
- null machine → ERROR, not NaN
- div-by-zero in physics (ae=0) → guarded
- undefined speed → conservative default
- kc1_1=0 → ERROR
- negative depth → ERROR
- NaN propagation chain: NaN force → NaN power → NaN feed → all guarded

**`ppg-machine-limit-exhaustive.test.ts`** (25 scenarios)
- S12000 on 8100 max → clamped to S8100 + WARNING
- S50000 on 15000 max → clamped + WARNING
- F500 on 300 IPM max → clamped + WARNING
- X800 on 500mm travel → ERROR, block output
- Negative X travel: X-500 on 0-400mm → ERROR
- Power 25kW on 15kW spindle → WARNING + derate suggestion
- Critical violation (>120%): BLOCK output, omega=0
- S=max_rpm exactly → PASS (boundary: <=, not <)
- S > 32767 on 16-bit controller (Fanuc 0i, Brother TC-S2D) → ERROR

**`ppg-collision-hazard.test.ts`** (15 scenarios)
- G0 at Z-25 (rapid into material) → WARNING
- M06 without Z retract (G28/G53/safe Z) → ERROR
- Lateral G0 at cutting depth → WARNING
- G28 without preceding G91 → WARNING (could rapid through part)

**`ppg-missing-code-detection.test.ts`** (20 scenarios)
- T2 → cutting without M06 → ERROR
- Missing M03/M04 before cutting move → ERROR (spindle not on)
- Missing G43 H after M06 → WARNING
- G43 H0 (zero offset) → WARNING
- G43 H5 when tool is T3 → WARNING (H/T mismatch)
- M06 with no T code preceding → WARNING
- Duplicate T numbers in sequence → WARNING
- Missing M30/M02 at program end → WARNING
- Negative F value → ERROR (undefined behavior on controller)
- F0 explicit → ERROR (feed is zero)
- S0 → WARNING (spindle not turning; may be intentional for manual orient)

**`ppg-adversarial-sequences.test.ts`** (NEW — 10 scenarios)
State-dependent dangerous G-code sequences:
- G41 active → G41 again (double cutter comp) → ERROR
- G96 at D approaching zero → RPM climb → hard stop at G50 S-limit
- Modal F carry: G0 X5 → G1 X10 (no F) → should use last modal F or ERROR
- G28 without G91 + non-zero XYZ → check if rapids through part
- Active G43 → M06 without G49 cancel → WARNING
- Circular move G02/G03 with R too small for arc → ERROR
- Thread G76 with wrong pitch/lead combination → ERROR

**`ppg-input-validation.test.ts`** (5 scenarios)
- Empty G-code (0 bytes) → PipelineValidationError with message
- Comments-only program (no motion) → PipelineValidationError
- Non-ASCII in comments (Chinese, emoji) → sanitize to ASCII, don't crash
- 50,000 line program → process within 120s memory budget <1GB
- Binary file (not text) → PipelineValidationError

### B9. Real Program Validation (211 scenarios)
**Files:** (5 files)

**`ppg-okuma-production-100.test.ts`** (100 scenarios)
Selection from data/programs/okuma/ (2,734 available):
- 25 turning programs with G96/G97 CSS
- 20 milling programs (VMC operations)
- 15 drilling/tapping programs
- 20 multi-operation programs (3+ tools)
- 20 complex programs (threading, grooving, live tooling)
Selection criteria: file size diversity (10-line to 500-line), operation diversity.
Validation: parse → pipeline → no NaN → structure preserved → machine limits.
Pass threshold: `expect(passRate).toBeGreaterThanOrEqual(0.95);`

**`ppg-haas-production-50.test.ts`** (50 scenarios)
Selection from data/programs/haas/ (138 available):
- 15 milling, 10 drilling, 10 tapping, 10 multi-op, 5 probing
Pass threshold: `expect(passRate).toBeGreaterThanOrEqual(0.90);`

**`ppg-hurco-production-11.test.ts`** (11 scenarios)
All 11 programs from data/programs/hurco/.
Pass threshold: `expect(passRate).toBeGreaterThanOrEqual(0.80);`

**`ppg-cross-cam-parse.test.ts`** (20 scenarios)
5 programs per dialect: Fanuc, Siemens, Heidenhain, Okuma formats.
Auto-detect dialect, preserve comments, round-trip structure.
Uses CrossCAMPostEngine (already exists, NOT rebuilt).

**`ppg-program-diversity.test.ts`** (30 scenarios)
- 5 programs with 1 tool only
- 5 programs with 5+ tools
- 5 programs with 10+ tools
- 5 programs with 500+ lines
- 5 programs with mixed drilling + milling
- 5 programs with mixed metric/imperial

### B10. Golden Reference Comparison (55 scenarios — equalized)
**Files:** `ppg-golden-{controller}.test.ts` (11 files)

EQUALIZED: every controller gets 5 golden references.
(v1 had 5:1 ratio — now all equal)

| Controller | Programs | Types |
|---|---|---|
| Haas NGC | 5 | face, pocket, drill, tap, 5-tool-multi |
| Fanuc 31i | 5 | face, pocket, drill, tap, 5-tool-multi |
| Siemens 840D | 5 | face, pocket(CYCLE), drill(CYCLE83), tap(CYCLE84), TRAORI |
| Heidenhain TNC | 5 | face, pocket(CYCL252), drill(CYCL205), tap(CYCL206), TCPM |
| Mazak Smooth | 5 | face, pocket, drill, G130 tornado tap, G5.1 HSM |
| Okuma OSP | 5 | face, pocket, CSS turning, G76 thread, NAT profile |
| Hurco WinMax | 5 | face(ISNC), pocket(BNC), drill, G05.3, UltiMotion |
| DMG MORI (S) | 5 | face, CYCLE800 tilted, CYCLE832 HSM, TRAORI, mill-turn |
| DMG MORI (F) | 5 | face, pocket, drill, tap, CELOS-specific |
| Brother | 5 | face, pocket, drill, high-speed tap, 30-tool ATC |
| Doosan Puma | 5 | CSS face, CSS OD turn, G71 rough, G76 thread, live tool |

**Comparison method:** `assertGcodeEqual(actual, golden)` from shared comparator.
**Update process:** `PRISM_UPDATE_GOLDEN=1 npx vitest run ppg-golden-*` regenerates.

### B11. Physics Validation (60 scenarios — with cited references)
**Files:** (5 files — addresses v1 score 28 "physics accuracy")

**`ppg-kienzle-force-validation.test.ts`** (20 scenarios)
Source: Altintas, Y. "Manufacturing Automation" 2nd Ed., 2012, Table 2.1
| Material | kc1_1 (N/mm²) | mc | Source Page | Test: ap=3mm, fz=0.15mm |
|---|---|---|---|---|
| AISI 1045 | 1800 | 0.25 | p.37 Table 2.1 | Fc = 1800 × 3 × 0.15^0.75 = 1228N ±3% |
| AISI 4140 | 1900 | 0.26 | p.37 | Fc = 1900 × 3 × 0.15^0.74 = 1338N ±3% |
| 6061-T6 Al | 800 | 0.23 | p.38 | Fc = 800 × 3 × 0.15^0.77 = 508N ±3% |
| Ti-6Al-4V | 1680 | 0.23 | Sharman 2004, Table 3 | Fc = 1680 × 3 × 0.15^0.77 = 1066N ±5% |
| 316L SS | 2100 | 0.26 | p.38 | Fc = 2100 × 3 × 0.15^0.74 = 1479N ±3% |

Correction factors tested:
- Rake angle: Kγ = 1 - 0.01 × (γ₀ - γ_ref) where γ_ref = 6°
- Wear land: KVB = 1 + 0.5 × VB/0.3 (VB in mm)
- Speed: KVc = (Vc/Vc_ref)^-0.1
- Size effect: Kh = (h/h_ref)^(-mc) already in formula

```typescript
it('AISI 1045 face mill force within 3% of Altintas Table 2.1', () => {
  const result = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: 3, fz: 0.15 });
  expect(result.Fc).toBeCloseTo(1228, -1);  // within ~12N
});
```

**`ppg-power-formula.test.ts`** (10 scenarios)
- P_kW = Fc_N × Vc_m_min / 60000 — dimensional analysis verified
- P(1228N, 200 m/min) = 1228 × 200 / 60000 = 4.09 kW
- Power > machine.max_power_kw → WARNING
- Power check at 5 different cutting conditions

**`ppg-taylor-tool-life.test.ts`** (10 scenarios)
Source: Machining Data Handbook, 3rd Ed., 1980
- T = (C/Vc)^(1/n) where C, n from constants.ts
- 4140 at Vc=200: T = (350/200)^(1/0.25) = 9.38 min
- 6061 at Vc=300: T = (600/300)^(1/0.35) = 5.28 min
- Tool life < 15 min → WARNING in G-code
- Tool life < 5 min → ERROR (unsafe, tool will fail mid-cut)

**`ppg-chip-thinning.test.ts`** (10 scenarios)
- ae/D ratio → effective chip thickness
- h_eff = fz × sqrt(D / (D - 2×ae)) for ae < D/2 (conventional)
- ae/D = 0.05 (light radial) → thin factor = 2.29 → adjusted fz
- ae/D = 0.50 (half width) → thin factor = 1.0 → no adjustment
- Chip thinning compensation applied BEFORE machine limit check

**`ppg-monte-carlo-confidence.test.ts`** (10 scenarios)
- N ≥ 1000 samples for stable 95% CI (explicit requirement)
- Confidence = 95% CI half-width / mean feed × 100 (as percentage)
- Confidence > 15% → WARNING in G-code comment
- Confidence > 25% → recommend prove-out mode
- Analytical validation: for normal distribution σ=5%, CI ≈ 1.96×σ/√N

### B12. CPS Generation Matrix (11 × 5 = 55 scenarios)
**File:** `ppg-cps-generation-matrix.test.ts` (table-driven)

| Config | Validation |
|---|---|
| Default (all features) | JS parse OK, required fields present, banned APIs absent, machine limits embedded |
| Minimal (no PRISM) | Clean standard post, no PRISM comments |
| Prove-out ON (50/80) | S/F derated, header banner present |
| Override T1 | Override applied, comparison comment present |
| Baseline mode | Original S/F, PRISM suggestions in comments only |

Banned API gate (every generated CPS):
```typescript
expect(cpsContent).not.toMatch(/HTTPClient/);
expect(cpsContent).not.toMatch(/httpGet|httpPost/);
expect(cpsContent).not.toMatch(/getGlobalParameter\s*\(\s*['"]prism:/);
```

### B13. Fuzz / Chaos Testing (120 scenarios — seeded deterministic)
**File:** `ppg-fuzz-chaos.test.ts`

Seeded RNG (`FUZZ_SEED = 42`) for reproducible results.

| Fuzz Type | Count | Seed Range |
|---|---|---|
| Random S values | 20 | S from -1000 to 999999 (includes negative!) |
| Random F values | 20 | F from -100 to 99999 (includes negative!) |
| Random coordinates | 20 | XYZ from -99999 to 99999 |
| Malformed G-code | 20 | Missing letters, wrong types, partial lines |
| Missing fields | 20 | No tool, no material, no machine, partial JSON |
| Encoding attacks | 10 | Unicode, emoji, null bytes, 64KB comments |
| State corruption | 10 | Out-of-order modal codes, conflicting G-codes |

ALL must produce: valid output OR structured error `{ code: /^PPG-E\d{4}$/, message: string (>10 chars), field?: string }`. NEVER NaN, NEVER crash, NEVER hang >30s.

### B14. E2E Journey Tests (23 scenarios)
**Files:** `ppg-e2e-journey-a.test.ts` (10), `ppg-e2e-journey-b.test.ts` (13)

Journey A (1 per controller): API → CPS → reference post → output verify.
Journey B (10 controllers + 3 materials): upload → material → optimize → diff.
Material selection REQUIRED for Journey B (not optional).

### B15. Performance Benchmarks (15 scenarios)
**File:** `ppg-performance-benchmarks.test.ts`

| Metric | Budget | Measurement |
|---|---|---|
| 10 blocks | < 0.5s | `performance.now()` wall clock |
| 100 blocks | < 2s | wall clock |
| 500 blocks | < 10s | wall clock |
| 1000 blocks | < 30s | wall clock |
| 5000 blocks | < 120s | wall clock |
| 1000 blocks heap | < 400MB | `process.memoryUsage().heapUsed` |
| Cache hit (100b) | < 0.5s | second run same input |
| Cache speedup | > 50% | (cold - warm) / cold |
| 10 controllers gen | < 30s total | all CPS files generated |
| 910 machine list | < 200ms | server-side data assembly |
| 2883 program scan | < 200ms | directory listing |
| All PPG tests | < 300s total | full suite time budget |
| Cold start | < 5s | first pipeline invocation |
| Concurrent 3 | < 30s each | 3 pipelines in parallel |
| Concurrent 5 | < 60s each | 5 pipelines in parallel |

### B16. Machinist Trust Validation (30 scenarios)
**Files:** (4 files)

**`ppg-sfm-ipt-display.test.ts`** (10 scenarios)
- SFM = π × D_inch × RPM / 12 (verified: π×0.5×7200/12 = 942.48 → 942)
- IPT = F / (RPM × flutes) (verified: 52/(7200×4) = 0.00181)
- Chip load = fz (from physics)
- Actual chip thickness with thin-factor correction
- Units match program mode (SFM for inch, Vc for metric)

**`ppg-proveout-modes.test.ts`** (8 scenarios)
- Default: ON (50% feed, 80% speed)
- Custom: 70% feed, 90% speed
- OFF: full physics S/F
- Per-tool prove-out: trust T3, derate T7 (NEW per scrutiny)
- Header banner: "**** PROVE-OUT MODE: Feed 50%, Speed 80% ****"
- Derate applied AFTER physics, BEFORE machine limits
- Derated values still within machine limits

**`ppg-override-mechanism.test.ts`** (7 scenarios)
- Override T1 S6000 F40 → applied + comparison comment
- Override S99999 → CLAMPED to machine max + warning
- Override + prove-out → override wins (explicit > default)
- Override absent → physics values used
- Selective baseline: accept suggestion #3, reject #1 and #2

**`ppg-program-header.test.ts`** (5 scenarios)
- Header includes: part#, material (ISO group + HRC), machine, controller
- Tool list table: T#, description, diameter, flutes, expected life
- Setup notes: WCS, fixture, coolant type, stock dimensions
- Comment style matches controller: () for Fanuc, ; for Siemens
- Header < 50 lines (concise, not verbose)

### B17. Multi-Setup / Multi-Axis Modes (NEW — 40 scenarios)
**Files:** (3 files — addresses v1 score 34 "missing dimensions")

**`ppg-multi-setup.test.ts`** (15 scenarios)
- 2-setup program (top + flip): G54 OP1, G55 OP2
- 3-setup program (top + sides + flip): G54, G55, G56
- Tombstone fixture: G54.1 P1 through P4 (4 parts on tombstone)
- Safe retract BETWEEN setups (Z home before WCS change)
- Rechuck after flip (chuck open, part flip, chuck close, re-prove)

**`ppg-multiaxis-modes.test.ts`** (15 scenarios)
- 3-axis (XYZ only) → standard G-code
- 3+1 (4th axis indexing, A or B) → clamp/unclamp, shortest path
- 3+2 (positional 5-axis) → CYCLE800/G68.2/PLANE SPATIAL per controller
- 4-axis continuous → A/B in motion blocks
- 5-axis simultaneous → RTCP/TCP activation per controller
- Inverse time feed G93 for 5-axis → verified
- Machine kinematics: table-table vs head-table → different A/B/C mapping

**`ppg-post-settings.test.ts`** (10 scenarios)
- Smoothing on/off: G187 (Haas), CYCLE832 (Siemens), G5.1 (Mazak)
- Through-spindle coolant: M88 where supported
- Line numbers on/off
- Optional stop M01 insertion at tool changes
- Block skip "/" prefix on selected lines
- Sequence number spacing (N10, N20... vs N1, N2...)

### B18. Interoperability (NEW — 15 scenarios)
**File:** `ppg-interoperability.test.ts`

- Fanuc 0i line length ≤ 250 chars (long lines wrapped or truncated)
- Siemens 840D: unlimited line length → no wrapping
- DNC transfer: program fits in 1MB transfer buffer
- USB/CF card: filename ≤ 32 chars, 8.3 format for older machines
- Output encoding: ASCII (no UTF-8 BOM for CNC controllers)
- Partial file safety: if post fails at block 500, partial output has M30/% appended

---

## PART C: SUMMARY

| # | Category | Files | Scenarios | Priority |
|---|---|---|---|---|
| B1 | Controller × Operation | 11 | 308 | P0 |
| B2 | Feed Format | 11 | 88 | P0 |
| B3 | Structural Blocks | 1 | 33 | P0 |
| B4 | G-Code Structural Correctness | 5 | 100 | P0 |
| B5 | Canned Cycles | 3 | 80 | P0 |
| B6 | Turning Suite | 6 | 120 | P0 |
| B7 | Multi-Tool Integration | 4 | 60 | P0 |
| B8 | Safety / Edge Cases | 6 | 100 | P0 |
| B9 | Real Program Validation | 5 | 211 | P0 |
| B10 | Golden References | 11 | 55 | P0 |
| B11 | Physics Validation | 5 | 60 | P1 |
| B12 | CPS Generation | 1 | 55 | P1 |
| B13 | Fuzz / Chaos | 1 | 120 | P0 |
| B14 | E2E Journeys | 2 | 23 | P1 |
| B15 | Performance Benchmarks | 1 | 15 | P2 |
| B16 | Machinist Trust | 4 | 30 | P1 |
| B17 | Multi-Setup / Multi-Axis | 3 | 40 | P0 |
| B18 | Interoperability | 1 | 15 | P1 |
| **TOTAL** | | **72** | **1,513** | |

With infrastructure (Part A): 5 shared helper files.
With existing 1,508 PP tests: **3,021+ total scenarios**.

## PART D: EXECUTION PLAN

### Week 1 — Build Generators + Core Tests (P0 subset: ~450 scenarios)
**Monday:** Build test infrastructure (Part A: comparator, schema, generators, regression helpers). Build generators FIRST — this unlocks 70%+ of scenarios automatically. (~6 hrs)
**Tuesday:** Controller×Op matrix generator + Haas/Fanuc/Okuma (3 controllers × 28 ops = 84 scenarios auto-generated). Feed format for same 3 controllers (24 scenarios). Golden refs for Haas (5 programs). (~6 hrs)
**Wednesday:** FIRST TEST IN FUSION 360 + fix issues. Real program validation harness (scan data/programs/ + batch validate). Run 30 Haas programs. Safety exhaustive (NaN guards + machine limits = 50 scenarios). (~6 hrs)
**Thursday:** Multi-tool integration (5-tool + 10-tool programs = 30 scenarios). Turning CSS + canned cycles (25 scenarios). Structural correctness (subprograms, coolant, compensation = 30 scenarios). (~6 hrs)
**Friday:** Expand to all 11 controllers (matrix generator produces remaining 8). Fuzz testing (120 scenarios, auto-generated from seed). Run 100 Okuma programs. Buffer for fixes. (~6 hrs)

### Week 2 — Full Coverage (remaining P0 + P1: ~700 scenarios)
Turn the crank on all remaining categories. Physics validation with cited references. CPS generation matrix. E2E journeys. Full turning suite (120 scenarios). Full golden references (55 programs, all 11 controllers equalized).

### Week 3 — Hardening (P2: ~45 scenarios + polish)
Performance benchmarks. Machinist trust validation. Interoperability. Polish test descriptions, add missing edge cases discovered during weeks 1-2.
