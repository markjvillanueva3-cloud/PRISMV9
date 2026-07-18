---
name: reference_fusion_inch_conversion_2026_06_21
description: Fusion brand + JM_Milling tool libs converted mm->inch for JM (inch shop) + dimensional sanitize; feed-unit resolved via crib; slot:romeo 2026-06-21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.582Z
aliases: reference_fusion_inch_conversion_2026_06_21
---


**FUSION-INCH-CONVERT (slot:romeo, 2026-06-21)** — operator: *"double check dimensions, it seems like you prioritize metric, we do everything in inches"* + *"import the tool & tool-holder libraries into Fusion's CLOUD folder so coworkers can access."* Commits `350c0f91db` (convert) + `adbb8115de` (test-harden). 3-of-3 scrutiny PASS (A/B/C, 0 P0/P1; all 3 confirmed the conversion is field-selective + safe).

**Key finding (R12):** the brand DC values were physically CORRECT (a 1/2in tool = 12.7mm) — NO 25.4x data error existed. The libraries were just `unit:"millimeters"`-labeled, which reads wrong to an inch shop. Plus ~223 brand + 17 legacy tools had impossible OAL/flute/shank (parse artifacts, e.g. SFDM=25374mm).

**Feed-unit question RESOLVED (the crux):** Fusion stores feeds in the TOOL'S unit. Verified by comparing a real inch JM crib (`PRISM_JM_VMC-01`, unit=inches) — its `f_n=0.0314 in/rev`, `f_z=0.0052 in/tooth`, `v_f=110.24 IPM` (= n×f_n exactly). So a mm lib's `f_n` (mm/rev) IS unit-dependent and MUST scale 1/25.4 when converting; `n` (rpm) is unit-independent. The legacy `PRISM_JM_Milling` presets carry ONLY `{n, f_n}` (no f_z/v_c) so its conversion is well-defined + safe.

**What shipped (durable — survives the nightly regen):**
- `scripts/lib/tool-unit-convert.mjs` (NEW, 23 tests): field-selective mm->inch — scales ONLY length geometry (DC/SFDM/LCF/OAL/RE/DCN/LF/shoulder-length/shaft-diameter/tip-*), NEVER angles (HA/thread-profile-angle) or counts (NOF). Holder segments converted. `convertToolMmToInch` REFUSES feed-bearing tools unless given `opts.convertPreset` (Fusion feed-unit guard). + `sanitizeToolGeometryMm` (null garbage OAL/LF/LCF; SFDM/shaft->DC fallback; spares 0-valid tip-length). + `unknownGeometryKeys` audit anchor.
- `scripts/lib/brand-tool-catalog.mjs`: `OAL_MAX_MM/LCF_MAX_MM=1000`, `SHANK_MAX_MM=250` ceilings + `plausibleLengthMm`; normalizeRecord nulls past-ceiling oal/flute/shank (tool KEPT — geometry_plausible unchanged, only geometry_complete reflects the loss). +5 tests (39).
- `scripts/emit-brand-tool-libraries.mjs`: Fusion lane DEFAULTS to inches for JM (`--unit mm` override; `buildFusionLibrary` pure default stays mm so existing tests pass); hyperMILL/Mastercam lanes stay mm; `manifest.unit` (schema 1.2.0).
- `scripts/convert-jm-milling-to-inch.mjs` (NEW, 6 tests): converts the 14160-tool combined lib incl feeds (`f_n/25.4`, `n` unchanged); refuses any unverified feed field; atomic write.

**VALIDATED live:** 19 brand libs (41309 tools) + `PRISM_JM_Milling` (14160) all `unit=inches`, 0 garbage OAL/LCF, angles+feeds correct (Helical 1/2in -> DC 0.5/LCF 0.625/OAL 4.0; 1/4in -> n 10026rpm/f_n 0.000984 in/rev). Re-placed to Fusion `Local/`: **44 inches, 1 mm**. The 12 JM machine cribs (VMC/LTH, already inches w/ feeds+holders) left UNTOUCHED.

**FOLLOW-UP — last mm lib closed (U-FUSION-INCH-GENERAL `aad757c366` + P2 `96bb89e984`, 3-of-3 PASS):** built a GENERAL converter after verifying every field unit corpus-wide (81 .tools). `scripts/convert-fusion-tools-to-inch.mjs` (6 tests) + extended `tool-unit-convert.mjs` (31 tests). New classifications (verified vs inch crib + identity v_f=n*f_z*NOF + repo `PRISM.cps:210 tool.bodyLength`): geometry `LB`=body-length(/25.4), `SIG`=drill point angle 90-140deg(unchanged, in 26 libs), `HAND`=handedness bool(unchanged), `TP`=0-corpus-wide UNVERIFIED(left + FAIL-LOUD if non-zero). General feed converter `convertPresetMmToInch`: `f_n/f_z/v_f*/f_ramp/stepdown/stepover`=/25.4, **`v_c`=SURFACE SPEED m/min->SFM xFT_PER_M(3.280839895), NOT /25.4** (459 SFM/3.28=140 m/min; /25.4 + x25.4 absurd), `n/n_ramp/ramp-angle`=unchanged; fail-loud on any unclassified feed key. `PRISM_UPSET_H13` (5 tools) converted live (face mill v_c 412 SFM/f_z 0.0047in; drill SIG=140 preserved). **Fusion Local/ now 45 inches, 0 mm — units initiative COMPLETE.** (R12 correction: the brand libs DO carry `HAND` but as a TOOL-LEVEL string `"HAND":"R"`, NOT in geometry — so the LB/SIG/HAND additions are still purely additive; already-shipped conversions unaffected.)

**Still flagged for operator (NOT auto-done):**
1. 3 large face mills (ISCAR F45 / Kennametal 250-315mm) typed `flat end mill` in Fusion (no face-mill branch in fusionType) — categorization nuance, dimensionally fine.
2. CLOUD upload (below) — operator action; publishes to coworkers.

**CLOUD import — CANNOT be done via files (account-synced).** Fusion Cloud libs sync through the Autodesk Team hub; no local path, no bridge wired. Libraries staged in `Local/` (file-writable tier); operator uploads Local->Cloud in the Fusion app (Manufacture > Manage > Tool Library > drag/copy Local lib onto a Cloud library node). Steps + full report: `state/shared/jm-fusion-tools/FUSION-INCH-CONVERSION-2026-06-21.md`. Left to operator since it publishes to coworkers.

Sibling: [[reference_brand_catalog_cleanup_2026_06_20]] · [[reference_fusion_live_tool_libraries_2026_06_15]] · [[feedback_always_check_units_vs_part_and_print]].
