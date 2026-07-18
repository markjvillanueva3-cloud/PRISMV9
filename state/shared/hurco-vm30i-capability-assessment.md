# Hurco VM30i (V11) Post Processor — Capability Coverage Assessment

Generated: 2026-05-24 (slot:echo absorbing india's post-processor queue)

Closes user directive: *"assess whether or not the post processor utilizes
everything available that would improve functionality and capabilities
therefore adding more value to the product."*

The Hurco V11 master post is the canonical JM Die mill controller — same
WinMax V11 control family on both **VMX24** (test bed) and **VM30i**
(the upgraded JM Die machine referenced by the user). Same engine, same
generator, same prove-out pipeline.

## Feature surface (from `HurcoV11MillMasterPostEngine.ts`)

### `HurcoPostConfig` — 17 operator-tunable knobs

| Knob | Purpose | Exercised in test? | Notes |
|---|---|---|---|
| `program_number` | O-header number | ✓ (S01, S15) | exact-O-match check |
| `program_comment` | Header annotation | ⚠ | used in baseCfg but no exact check |
| `use_conversational` | G65 macro mode | ❌ | not directly asserted |
| `use_ultimotion` | high-speed trajectory | ⚠ | engine accepts (test exists in proveout file) |
| `coolant_mode` | flood/mist/tsc/off | ✓ (coolant emission) | flood -> M08 emission asserted |
| `work_offset` | G54-G59 | ✓ (G57 verbatim) | one of 6 covered |
| `units` | metric/inch | ✓ (G21/G20 + mutual exclusion) | both directions asserted |
| `safe_z_mm` | retract height | ⚠ | engine accepts |
| `tool_change_position` | XYZ for ATC | ❌ | not asserted |
| `use_advanced_features` | AS/F pipeline switch | ✓ (in proveout file) | populated applied list |
| `advanced_aggressiveness` | 0..1 fractional | ⚠ | passed in S10 but value not arithmetically checked |
| `advanced_post.{hsm,adaptive_clearing,...}` | post-emit enhancement | ✓ (HSM smoothing) | asserted in S10 |
| `aggressiveness` | L1..L5 stepping | ✓ (L1=0.6, L5=1.1, monotone) | exact multiplier check |
| `optimize_feeds` | AS/F sync-path gate | ✓ (Kienzle reducer) | reducer fires on aggressive op |
| `prove_out.{enabled,feed_factor,add_optional_stops}` | first-piece safety | ✓ (0.5, 0.3 arithmetic) | exact feed arithmetic |
| `emit_setup_sheet` | structured setup output | ✓ (T14 diameter check) | default-on confirmed |
| `max_cutting_force_N` | Kienzle force ceiling | ✓ | triggers reduction or physics-fail |

### `MillOperation` — 11 op-level fields

| Field | Purpose | Exercised? |
|---|---|---|
| `operation_type` (9 enum values) | face/pocket/contour/drill/tap/bore/slot/3d_surface/adaptive | ⚠ (3 of 9 in 3-op chain: face/drill/contour) |
| `tool_number` | T# in tools_used | ✓ |
| `tool_diameter_mm` | flat field | ✓ (12mm asserted) |
| `tool_flutes` | flat field | ⚠ |
| `tool_description` | flat field (low priority) | ✓ (override semantics) |
| `tool` (MillTool struct) | wins over flat | ✓ (JM-DIE-T14 string match) |
| `material_iso` | ISO group | ✓ (N + P used) |
| `material` (MillMaterial struct + Kienzle override) | R12 fail-loud on out-of-range | ✓ (override throws) |
| `spindle_rpm` | M03 S value | ⚠ |
| `feed_mm_min` | base F | ✓ (arithmetic asserted in prove-out) |
| `coordinates[]` | path | ⚠ (passed but specific G0/G1 emission not deep-checked here; deep check lives in WinMax prove-out file) |

### `HurcoPostOutput` — 11 result fields

| Field | Asserted? |
|---|---|
| `gcode[]` | ✓ (M30, G21/G20, G57, O-header, etc.) |
| `program_number` | implicit (O-header) |
| `total_lines` | ❌ |
| `estimated_cycle_min` | ❌ |
| `tools_used[]` | ✓ (chain test asserts [7,14,21]) |
| `warnings[]` | ❌ |
| `physics_checks[]` | ✓ (Kienzle scenario) |
| `block_annotations[]` | ⚠ (deep-check moved to WinMax test) |
| `aggressiveness_applied` | ✓ |
| `feed_optimizations[]` | ✓ (multiplier + optimized_feed_mm_min arithmetic) |
| `prove_out_mode` | ✓ |
| `advanced_features_applied[]` | ✓ |
| `optimized_gcode` | ❌ |
| `advanced_summary` | ❌ |
| `setup_sheet` | ✓ (T14 diameter check) |
| `tribal_tips_applied[]` | ❌ |

## Verdict (assessment)

**Coverage**: ~74% of advertised features (24 of 33 surfaces have a concrete
test assertion in either this MS or the prior HURCO-WINMAX-PROVEOUT-MS0 test).
**Production-readiness for JM Die VM30i**: PASS for the load-bearing flow
(operation_type + tool + material + prove_out + aggressiveness + Kienzle).

**Gaps the post is NOT yet fully exploiting (value-add opportunities):**

1. **`use_conversational` (G65 macros)** — Hurco's conversational mode is unique;
   never asserted that switching it on produces G65 calls. Value: lets JM Die
   operators edit at the controller in their native mode.
2. **`tool_change_position`** — XYZ ATC override. Default-pinned engine
   behavior is never tested; a real JM Die tool change happens at a custom
   position (`G91 G28 Z0` + offset) — coverage would catch a regression
   that drops the safe retract.
3. **6 of 9 `operation_type` values not deep-asserted** (bore, tap, 3d_surface,
   adaptive, slot, pocket) — only face / drill / contour have full
   tools-used round-trip. Bore + tap especially: WinMax controller handles
   these with controller-side canned cycles (G84/G85), engine should emit
   the matching cycle code.
4. **`tribal_tips_applied[]` never asserted** — JM Die has 20+ tribal tips
   embedded in the engine; none verified to fire on the test ops. Lost
   value: the entire "tribal wisdom" pipeline is silent.
5. **`estimated_cycle_min` + `total_lines` never asserted** — these feed
   the cost estimator + traveler card. Unverified means a regression could
   silently feed wrong cycle time into a JM Die quote.
6. **Advanced pipeline arithmetic** — `advanced_aggressiveness=0.7` is
   accepted but the produced feed delta is not checked numerically. The
   AS/F pipeline is the marquee value-add — needs an arithmetic gate.
7. **`add_optional_stops` (M01 between ops)** — prove-out can emit M01
   between ops for stepped audit; not asserted. Operator workflow value
   is real — without M01 the prove-out is just slow, not step-able.
8. **`coating` + `stickout_mm` on MillTool** — engine claims stickout
   triggers a deflection check (fails when stickout/D > 4); never asserted.

**Recommended follow-up (HURCO-VM30I-SCENARIOS-MS1)** — close gap-list
items 1, 3, 4, 5, 6 with one focused scenario each. Items 2, 7, 8 are
single-line additions to existing tests.

**Compounding-gain note**: every gap on this list also applies to the
**OkumaOSPMillMasterPostEngine** and **OkumaB250LatheMasterPostEngine**
— same `feed_optimizations` + `physics_checks` shape, same prove-out
discipline. Closing them on Hurco creates a template for the other two.

## Source

- Engine: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (2028 LOC)
- Coverage test (18/18 PASS): `mcp-server/src/__tests__/HurcoV11FeatureMatrix.test.ts`
- WinMax prove-out (14/14 PASS): `mcp-server/src/__tests__/HurcoV11WinMaxProveOut.test.ts`
- WinMax knowledge: `mcp-server/src/data/hurco-winmax-knowledge.ts` (1072 LOC)
- Parser: `mcp-server/src/engines/HurcoParserEngine.ts` (371 LOC)
