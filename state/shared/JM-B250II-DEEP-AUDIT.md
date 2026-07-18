# Okuma Multus B250IIW — Flagship Deep Audit

**Generated:** 2026-05-02
**Machine:** LTH-07 Okuma Multus B250IIW (sub-spindle wide-bed mill-turn)
**Controller:** OSP-P300SA
**Designation:** ★ FLAGSHIP — most expensive, most-capable, lowest tribal-knowledge density per dollar.

---

## TL;DR (top-line status for Mark)

| Question | Answer | Evidence |
|----------|--------|----------|
| **Master post wired?** | ✅ YES — `master_post_okuma_b250` action wired in `camDispatcher.ts:1127, :5378` | grep verified |
| **Engine class exists?** | ✅ YES — `OkumaB250LatheMasterPostEngine.ts` (664+ lines, full G-code generator) | file inspected |
| **OSP-P300SA dialect support level?** | ⚠️ **PARTIAL** — G50/G96/G97/G72/G70/G76/G83/G87/M38/M39/G112/G12.1 covered. **MISSING: G13/G14, $1/$2, WAITM, IGF, common-variable arithmetic.** | source code grep: G13.1 found only as polar-OFF cancel; no $1/$2/WAITM/IGF anywhere |
| **Sub-spindle handoff in collision sim?** | ⚠️ **PARTIAL** — M38/M39 sync codes emitted by post + tribal tip recorded. No collision-sim integration verified. | tribal tip L181-185; collision sim path NOT audited in this scan |
| **Okuma CAS data extracted?** | ⚠️ UNVERIFIED — extraction-log shows "Okuma(63)" extracted but CAS-specific (C-Axis Spindle) extraction status not confirmed | per CLAUDE.md "Already-extracted: Okuma(63)" |
| **Six casing/macro actions wired?** | ✅ ALL 6 WIRED — `okuma_generate_casing`, `okuma_generate_cbore`, `okuma_validate_macro`, `okuma_parse_macro`, `okuma_defaults`, `okuma_convert_to_hardcode` all in `camDispatcher.ts:1238, :6994-7020` | grep verified |

---

## 1. ACTION WIRING AUDIT

```
camDispatcher.ts:1127 — z.enum includes:
  "master_post_hurco_v11", "master_post_okuma_b250", "master_post_okuma_osp",
  "master_post_mitsubishi_mv1200r", "master_post_by_machine"
camDispatcher.ts:1238 — z.enum includes (all 6 Okuma macro actions):
  "okuma_generate_casing", "okuma_generate_cbore", "okuma_validate_macro",
  "okuma_parse_macro", "okuma_defaults", "okuma_convert_to_hardcode"
camDispatcher.ts:5378 — case "master_post_okuma_b250": { ... } handler present
camDispatcher.ts:6994 — case "okuma_generate_casing": { ... }
camDispatcher.ts:6999 — case "okuma_generate_cbore": { ... }
camDispatcher.ts:7004 — case "okuma_validate_macro": { ... }
camDispatcher.ts:7009 — case "okuma_parse_macro": { ... }
camDispatcher.ts:7014 — case "okuma_defaults": { ... }
camDispatcher.ts:7020 — case "okuma_convert_to_hardcode": { ... }
```
✅ **All 7 expected dispatcher actions wired.**

---

## 2. OSP-P300SA DIALECT COVERAGE

### Confirmed in `OkumaB250LatheMasterPostEngine.ts`:
| Code | Purpose | Status |
|------|---------|--------|
| G50 | Spindle clamp | ✅ in defaultConfig.css_max_rpm + tribal "G50 S3500" |
| G96 | Constant Surface Speed | ✅ tribal tip; emitted |
| G97 | Constant RPM (per filesystem header line: "G97 S1005 M3 M42") | ✅ generated when CSS off |
| G72/G70 | Roughing/finishing canned cycles | ✅ enumerated in feature list (engine doc L19) |
| G76 | Threading multi-pass | ✅ enumerated |
| G83/G87 | Drilling cycles | ✅ tribal tip L168-173 |
| G112 | Polar interpolation (C-axis milling) | ✅ enumerated |
| G12.1 | Polar mode for face patterns | ✅ tribal tip L188 |
| G13.1 | Polar interpolation OFF | ✅ source line 666 |
| M38 | Sub-spindle sync engage | ✅ tribal tip L182; tested |
| M39 | Sub-spindle sync release | ✅ tribal tip L182 |
| M76 | C-axis home | ✅ tribal tip L188 |
| M23 | Live tool ON | ✅ tribal tip L194 |
| M24 | Live tool OFF | ✅ tribal tip L194 |
| Common variables (V1-V99) | Per filesystem header `V1=22.0` | ⚠️ **NOT in engine** — tribal tip absent |

### Missing from engine (gap analysis vs. work order requirements):
| Code | Purpose | Gap impact |
|------|---------|------------|
| **G13** | Polar interpolation ON (without `.1`) | Mid — engine only emits `.1` variant |
| **G14** | Mirror-image OFF | High — sub-spindle work needs mirror cancel |
| **$1 / $2** | Path designator (channel 1 = main spindle, channel 2 = sub) | ★ **CRITICAL** — multi-channel programming completely absent. Sub-spindle DOES NOT use `$2` prefix anywhere in engine. |
| **WAITM** | Wait-for-other-channel sync barrier | ★ **CRITICAL** — needed for proper sub-spindle handoff |
| **IGF** | Intelligent G-code Function (Okuma-specific feature recognition) | High — major productivity feature, not implemented |
| **Common-variable arithmetic** | `V1 = V1 + 1` etc. for part counters, conditional logic | Mid — `MARK'S COMMON VARIABLES PART COUNTER.min` (filesystem) shows JM uses this |

**Action item:** Engine emits sub-spindle codes (M38/M39) but does NOT structure programs as multi-channel `$1`/`$2` synchronized blocks. Real Okuma Multus production code uses `$1`/`$2` prefixes + `WAITM` barriers — without these, generated programs will run sequentially on main spindle only, not in true mill-turn parallel mode.

---

## 3. SUB-SPINDLE HANDOFF — COLLISION SIMULATION

### What's present:
- ✅ M38/M39 macro emission in post output
- ✅ Tribal tip: "verify RPM match before transfer" (confidence 0.93)
- ✅ `sub_spindle_enabled: true` flag in defaultConfig
- ✅ JM Die in-shop programs `MARK'S WORKING SPINDLE GRAB-PULL-CUTOFF (SP2-Z=-0.8)` and variant `(SP2-Z=1.17)` — two production handoff macros captured

### What's NOT verified in this audit:
- ⚠️ Whether `prism_cad:cnc_simulate` / `cnc_simulate_physics` runs sub-spindle envelope checks
- ⚠️ Whether collision-prevention engine treats SP2 as a separate kinematic body
- ⚠️ Whether collision_check_full / collision_prevent_certify actions account for parts in transit between spindles
- ⚠️ Whether the `B-axis swivel head` collision envelope is registered in MachineEnvelopeEngine

### Recommendation:
Run `mcp__prism__prism_cad action=cnc_simulate_physics` against `MARK'S WORKING SPINDLE GRAB-PULL-CUTOFF` macro and inspect output for sub-spindle clearance verification. If it simulates as single-spindle, multi-channel collision sim is the gap to close.

---

## 4. OKUMA CAS (C-Axis Spindle) DATA EXTRACTION

Per CLAUDE.md L51 ("Already-extracted: Okuma(63)"), 63 Okuma items extracted into the duplication-guard registry. Specific CAS extraction status NOT verified in this scan.

**Filesystem evidence of CAS programming at JM:**
- `MARK'S COMMON VARIABLES PART COUNTER.min` — uses C-axis indirectly via common-variable counter
- `OKUMA MULTUS B250 3.15.24 REV A.cps` — 163,701-byte production post (likely contains CAS handlers)

**Action item:** Run `prism_dev action=extract_dark_content` or audit `mcp-server/data/state/extraction-log.json` for "Okuma CAS" entries. If absent, schedule extraction before the work order's "B250II is FLAGSHIP" claim is fully discharged.

---

## 5. FLAGSHIP READINESS SCORECARD

| Capability | Required | Status | Gap |
|------------|---------|--------|-----|
| Master post action wired | ✅ | ✅ | none |
| 6 macro actions wired | ✅ | ✅ | none |
| OSP-P300SA G-code coverage | full | partial (~75%) | G13/G14, $1/$2, WAITM, IGF, V-arithmetic |
| Sub-spindle handoff | full | partial | multi-channel structure, collision sim |
| Live tooling support | full | ✅ | none |
| C-axis polar milling | full | ✅ | none |
| Tribal knowledge | high density | ✅ 5 captured | more from operator interview |
| Production posts indexed | ✅ | ✅ (2 versions found) | resolve which is current |
| Physics envelope | full | ✅ (only machine fully populated) | none |
| Calibration data | populated | ❌ empty | chatter freq, thermal drift, ballbar |
| Collision envelope (B-axis swivel) | registered | unverified | **audit needed** |
| CAS extraction | complete | unverified | confirm extraction-log |

**Overall flagship readiness:** **~70%** — strong on dispatcher wiring, post existence, and tribal coverage. Weak on multi-channel programming structure, calibration data, and collision-sim integration.

---

## 6. NEXT-STEP RECOMMENDATIONS (ordered by ROI)

1. **(2 hours) Multi-channel post upgrade** — Add `$1`/`$2`/`WAITM` emission to `OkumaB250LatheMasterPostEngine.ts`. Without this, post output is sequential — half the machine's value is unused.
2. **(1 hour) IGF integration** — Wire Okuma's Intelligent G-code Function to PRISM feature recognition. Major productivity unlock for JM.
3. **(30 min) Common-variable arithmetic** — Capture V1-V99 counter macros from `MARK'S COMMON VARIABLES PART COUNTER.min` as a tribal-tip + post-emitter pattern.
4. **(1 hour) Collision-sim audit** — Verify multi-spindle / B-axis-head collision envelope is registered. Run sample handoff macro through `cnc_simulate_physics`.
5. **(30 min) CAS extraction confirmation** — Audit `extraction-log.json` for Okuma CAS entries; run `extract_dark_content` if missing.
6. **(15 min) Production-post resolution** — Confirm with Mark which post is current: PRISM-Modified `OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps` or in-shop `OKUMA MULTUS B250 3.15.24 REV A.cps`. Mark stale one with deprecation flag.

---

## 7. EVIDENCE TRAIL

- **Engine:** `mcp-server/src/engines/OkumaB250LatheMasterPostEngine.ts` (664+ lines)
- **Tests:** `mcp-server/src/__tests__/OkumaB250LatheMasterPostEngine.SidecarIntegration.test.ts`
- **Integration test:** `mcp-server/src/__tests__/integration/MasterPostOkumaB250.integration.test.ts`
- **Dispatcher:** `mcp-server/src/tools/dispatchers/camDispatcher.ts:1127, 1238, 5378, 6994-7020`
- **Profile:** `mcp-server/src/data/jm-die-profile.ts:246` (LTH-07 entry)
- **Production NC sample:** `JM DIE/CNC OKUMA MULTUS/MARK'S COMMON VARIABLES PART COUNTER.min`
- **Production post sample:** `JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps` (163,701 bytes)
- **PRISM-modified post:** `JM DIE/POSTS/OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps` (per profile L246)
