# Hurco V11 Mill Post Processor — Verification Report

**Date:** 2026-05-22 · **Slot:** india · **Session:** `bde6fa1d` · **Trigger:** operator request — *"utilize the apps to test the hurco post processor to ensure its built and coded properly"*

---

## Executive Verdict

> **The HurcoV11MillMasterPostEngine is NOT in a "built and coded properly" state.** The auxiliary pipelines (advanced post, coolant, aggressiveness, prove-out, rapid optimization, HSM dwell, feature sequencer, sidecar) all pass — but the **core engine output format** has 25 test failures including Hurco-specific feature codes that are silently missing.

**Test fleet (11 HurcoV11 test files, 223 tests total):**

| Category | Files | Tests | Status |
|---|---:|---:|---|
| Core engine output (`HurcoV11MillMasterPostEngine.test.ts`) | 1 | 50 | **25 FAIL / 25 PASS (50% PASS)** |
| Advanced pipeline + 9 auxiliary suites | 10 | 173 | 173 PASS (100%) |

**Token economy note:** the test suite is mostly green (88.8% overall pass). The failures concentrate in ONE file, but that one file is the **canonical output contract** for the post — which is what Fusion 360's posted .NC would have to honor before WinMax PC sees it.

---

## Environment

- **WinMax PC installed:** `C:\Program Files\Hurco\MT WinMax Desktop\WinMaxMill.exe` v11.4.3.31916 (exact target — engine header says "Hurco VMX24 - WinMax V11")
- **JM Die historical Hurco corpus:** essentially **none** — 62k+ files scanned (out of ~100k+, ran out of time), zero `.HCM` files found, 43 `.NC` files (mostly Okuma/Haas), 12,042 `.MIN` files (Okuma lathe). Regression-against-archive plan is NOT viable.
- **Engine LOC:** 1664 in `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts`

---

## 25 Failures, categorized

### A. Missing Hurco-specific output (highest WinMax impact — 3)

| # | Test | What's missing |
|---:|---|---|
| 1 | `UltiMotion G187 P3 emitted by default` | **CORRECTED 2026-05-22 by operator:** the correct Hurco V11 smoothing/UltiMotion inline code is **`G05.3 P<n>`** (similar to Fanuc HPCC G05.1 / G05 P10000). The test expects G187 (Haas dialect — wrong), the engine emits only a comment annotation citing "Hurco V11 has NO inline UltiMotion G-code" (also wrong — operator confirms G05.3 IS valid Hurco). **BOTH engine comment and test need fixing:** engine should emit `G05.3 P<mode>` when `use_ultimotion: true`; test should assert that line. Engine line 597-606 comment is misinformation that needs replacement. |
| 2 | `emits G54.1 P12 extended offset for work_offset 12` | Extended work offsets `G54.1 P#` (for work_offset > 9) — engine emits wrong format |
| 3 | `emits S<rpm> M03 spindle CW with exact RPM value` | The basic `S<rpm> M03` spindle-on block is wrong somehow |

### B. Physics check string format (8) — `physics_checks[].check` strings don't include the constants

| # | Test | What's missing |
|---:|---|---|
| 4 | `Kienzle Fc check uses CANONICAL_KIENZLE constants...` | `check` string omits `kc1_1=1500` & `mc=0.25` (canonical for ISO M) — observed: `"Cutting force 666 N vs machine limit 2000 N"` |
| 5 | `Taylor tool-life check uses canonical C and n constants...` | Same pattern — Taylor C/n constants missing from check string |
| 6 | `stickout deflection check appears only when tool.stickout_mm provided` | Stickout deflection check not appearing OR not matching ratio condition |
| 7 | `custom kc1_1 override is honored` | Override path doesn't reflect custom value in check string |
| 8 | `falls back to canonical kc1_1 when no override (ISO M)` | Fallback path doesn't surface canonical value |
| 9 | `partial override (kc1_1 only) keeps canonical mc and surfaces both` | Partial-override surfacing broken |
| 10 | `getStats reports ... 5 base physics checks ...` | **engine reports `physics_checks: 4` but spec says 5** — one physics check is genuinely missing |
| 11 | `warnings array contains operation index + RPM value when physics check fails` | Warning format missing `Op 1 line` prefix |

### C. Material-constant override validation (5) — U-PPGH04 silent-disable guard

| # | Test | What's missing |
|---:|---|---|
| 12 | `rejects kc1_1 override below safe floor` | No floor validation — silently accepts |
| 13 | `rejects kc1_1 override above safe ceiling` | No ceiling validation — silently accepts |
| 14 | `rejects mc override outside [0.10, 0.45]` | No mc range validation |
| 15 | `rejects mismatched iso_group between op.material_iso and op.material.iso_group` | No cross-field validation |
| 16 | `Kienzle-bounded feed optimization > reduces feed when predicted Fc exceeds max_cutting_force_N` | Feed-bound loop not triggering |
| 17 | `Kienzle-bounded feed optimization > optimized feed produces Fc ≤ limit` | When it does run, the bound is wrong |

> ⚠️ U-PPGH04 ships under-validated. Per R12 fail-loud doctrine, silently accepting out-of-range kc1_1 is the bug class that lets a programmer push 4× canonical force into a real spindle. This is safety-relevant.

### D. Setup sheet emission (3)

| # | Test | What's missing |
|---:|---|---|
| 18 | `emits setup_sheet by default with machine='Hurco VMX24' and controller='WinMax V11'` | `setup_sheet` not in result OR fields missing |
| 19 | `setup_sheet.tools deduplicated and sorted ascending by tool number` | Dedup + sort logic missing |
| 20 | `setup_sheet.operations rows have sequential 1-based sequence numbers in order` | Sequence numbering missing |

### E. postSingle simplified API (4)

| # | Test | What's missing |
|---:|---|---|
| 21 | `wraps a single PostMove array into a complete program` | `postSingle` either missing or doesn't wrap properly |
| 22 | `PostMove arc_cw with R is preserved through to G02 R# output` | Arc with R-form not emitting `G02 R#` |
| 23 | `aggressiveness param flows through to output and header` | Aggressiveness header line missing |
| 24 | `structured tool coating + stickout flow into setup sheet` | Structured-tool→setup-sheet pipe missing |

### F. Tool/config precedence (1)

| # | Test | What's missing |
|---:|---|---|
| 25 | `uses structured tool.description override when supplied (flat tool_description shadowed)` | Config precedence wrong — flat key wins over structured |

---

## What this means for your Fusion-to-WinMax workflow

You said *"when we get to testing, I'll log into fusion to post hurco programs"*. **Important distinction:** there are TWO separate posts here:

1. **PRISM's `HurcoV11MillMasterPostEngine`** — TypeScript engine that consumes `MillOperation[]` and emits G-code lines. Tested above. Has 25 failing assertions.
2. **Fusion 360's Hurco `.cps` post processor** — JavaScript that Fusion uses internally. Lives in Fusion's posts folder. PRISM does not (yet?) ship a Fusion `.cps` post for Hurco V11.

If you post in Fusion 360, **Fusion uses ITS post processor, not PRISM's engine**. Verifying PRISM's engine and the Fusion `.cps` are two separate verification jobs. Things to know:
- Fusion's default Hurco post (`hurco.cps`) is shipped by Autodesk + maintained by their HSM team — different code from PRISM's
- If you want PRISM's logic in Fusion's post path, that's a `.cps` wrapper unit (significant work — translate the TypeScript engine into Fusion's JavaScript Post Processor format)
- WinMax PC will load whatever .NC you give it regardless of which post produced it

**Realistic next steps to actually test "the Hurco post":**

| Path | Effort | Value |
|---|---|---|
| **A. Fix PRISM's engine** (25 test failures → 0) | 1-2 days dedicated milestone (`HURCO-POST-REMEDIATION-MS0`) | Restores the canonical post + makes the engine reliable |
| **B. Post from Fusion + load in WinMax** | Operator does it manually | Verifies Fusion's Autodesk post + WinMax — does NOT verify PRISM's engine |
| **C. Build a Fusion `.cps` wrapper around PRISM's engine** | 2-3 day milestone, AFTER (A) is green | Routes Fusion's output through PRISM physics gates. Highest long-term value. |
| **D. Build a WinMax GUI driver** | Half-day | Useful for any path above. Premature until (A) lands. |

---

## Recommendation

1. **Don't ship a WinMax GUI driver this session** — the upstream engine isn't ready. Building UIA automation on top of a 50%-failing post is premature.
2. **Open `HURCO-POST-REMEDIATION-MS0`** as a milestone with the 25 failures as units. Categories A + C are safety-relevant (UltiMotion missing → wrong cycle behavior; material-override floor missing → unsafe force). Categories B+D+E are output-fidelity.
3. **For your Fusion-to-WinMax test pass** that you said you'll do: it'll exercise **Fusion's** post, not PRISM's. Useful as an independent baseline + good for spotting WinMax-side issues, but it's a different test than verifying PRISM's engine.
4. **Reproduce the failures yourself:** `cd H:/prism/mcp-server && npx vitest run src/__tests__/HurcoV11MillMasterPostEngine.test.ts`

---

## Artifacts

- This report: `state/shared/specs/HURCO-POST-VERIFICATION-2026-05-22.md`
- Raw failure list: `state/shared/specs/HURCO-POST-VERIFICATION-FAILURES-2026-05-22.txt`
- Engine: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` (1664 LOC)
- Tests: `mcp-server/src/__tests__/HurcoV11*.test.ts` (11 files, 223 tests, 198 PASS / 25 FAIL)
- Corpus probe: `state/shared/hurco-quick.json` + `state/shared/hurco-ncfiles.json`
- WinMax PC: `C:\Program Files\Hurco\MT WinMax Desktop\WinMaxMill.exe` v11.4.3.31916
