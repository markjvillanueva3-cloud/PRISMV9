---
name: reference-jm-die-is-okuma-heavy-implications-2026-05-27
description: Empirical finding from iter145-iter161 — JM-Die's lathe fleet is Okuma-heavy (LB-3000EX/LU-300/Multus). The PRISM_UPGRADED/<Vendor>/ folders are ALL Okuma variants. Implications for which wizard levers fire in production.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.167Z
aliases: reference_jm_die_is_okuma_heavy_implications_2026_05_27
---


# JM-Die is Okuma-heavy — wizard-lever firing implications

## What I observed (iter145-iter161)

Across the 2 customers I sampled in `JM DIE/CNC LATHE/`:
- **ALCOA/PRISM_UPGRADED/** subfolders: 7 Okuma variants (GENOS L200E-M, GENOS L300-M, LB-3000EX, LB-3000EX-BigBore, LB-3000EX_II, LNC8, Multus B250II)
- **ITW/PRISM_UPGRADED/** subfolders: 7 Okuma variants (same set as ALCOA)
- **No Fanuc subfolders**
- **No Haas subfolders**
- **No Doosan subfolders**

## Verified against canonical `jm-die-profile.ts` (iter162)

`mcp-server/src/data/jm-die-profile.ts` JM_DIE_MACHINES authoritative inventory — all visible LTH-* entries:
- LTH-01 Okuma GENOS L300-M (OSP-P300L-R)
- LTH-02 Okuma GENOS L200E-M (OSP-P200LA-R)
- LTH-03 Okuma LNC8 (OSP-U10L)
- LTH-04 Okuma Crown L1060 (OSP-U10L)
- LTH-05 Okuma GENOS L400II-E (OSP-P300LA-E)
- LTH-06 Okuma LB 3000EX Big Bore (OSP-P500)
- LTH-07 Okuma Multus B250II (OSP-P300SA)

**100% Okuma for lathes**. Non-Okuma machines exist (Hurco VM30i + Haas VF-2/OM-2 + Fanuc Roku-Roku for mills; Mitsubishi for EDM) but **none for lathes**. The empirical 2-customer sample correctly predicted the canonical inventory.

Source A-version `.MIN` files use Mazak EIA dialect headers (NBAR/CLEAR/DEF WORK) but are NOT routed to Mazak upgrade — they get upgraded to Okuma in B-versions.

## Implications for wizard levers

| Lever | Fires on JM-Die data? | Why |
|-------|-----------------------|-----|
| `structural_safety_gate` (insert G50 before G96) | Rarely | Real programs already have G50 (Okuma + Mazak both standard-include it) |
| `structural_cycle_substitution` (G92→G76) | Rarely | Real programs don't use G92 (G76 / Okuma G33 are standard) |
| `structural_finish_pass` (G70 after G71) | **Detector-only**, never applied | Detector skips Okuma + Mazak (single-line G71 with U/H embeds finish-stock). Real JM-Die files are all Okuma → applier never runs |
| `tooling_documentation` (insert ANSI in T-block) | **Always**, never applied | Real programs use Mazak T<NN><NN><NN> format without ANSI comments. Applier is structural-only; routes to operator review |
| `thread_validator_*` (G76 rule issues) | Rarely | Sampled programs don't have threading |

## What this means in practice

**The current wizard's primary value on real JM-Die programs is**:
1. **Detect what's missing/wrong** (3 detectors all run correctly)
2. **Surface tooling documentation gap** (universal — every program is missing ANSI-insert comments)
3. **Validate threading** (no false positives; correctly returns clean when no G76/G92)

**The current wizard's primary value-NOT-yet-realized**:
- Auto-applying structural levers — would only fire on Fanuc/Haas/Doosan programs, which JM-Die may not have
- Insert-substitution from shop tool-list — needs real ALCOA tool-list loaded (not synthetic fixture)
- Cycle-time scoring — requires Stage 6-11 implementation (P1 follow-up)

## How to apply going forward

**When prioritizing P1/P2 follow-up units:**
- ✅ HIGH PRIORITY: real ALCOA tool-list ingestion → bridge.resolve actually returns customer-specific inserts
- ✅ HIGH PRIORITY: real master-index ingestion from Sumitomo/Kennametal/Sandvik PDFs → wizard picks real grades
- ⏬ DEFERRED: Fanuc/Haas-specific applier improvements — no JM-Die data to test against
- ⏬ DEFERRED: Doosan-specific dialect — not in JM fleet

**When validating against real data:**
- Expect zero structural levers to fire on Okuma B-versions
- Expect 1-2 tooling recommendations per program (universal "document insert" gap)
- Expect threading validator to return clean (none of sampled programs thread)

## What WOULD fire if JM-Die had Fanuc/Haas programs

Test program: any with `G71 P10 Q20 U0.02 W0.005` followed by `N10..N20` profile + no G70:
- `structural_finish_pass` detector + applier both fire
- Stage 5 inserts `G70 P10 Q20 F0.005` after profile end
- Round-trip diff shows the new line

The wizard CAN do this — it just doesn't get the chance on Okuma-only data.

## Related

- [[reference_whiskey_real_data_validation_pattern_2026_05_27]] — programs-tested table
- [[feedback_jm_die_b_versions_are_ai_not_human_upgrade]] — B-versions = PRISM v2.0.0 output
- [[reference_lathe_canned_cycle_dialects_2026_05_27]] — dialect reference (Okuma single-line G71)
- [[reference_lathe_machine_vendor_models_design_2026_05_27]] — per-JM-fleet-machine specs (Okuma-dominant)
