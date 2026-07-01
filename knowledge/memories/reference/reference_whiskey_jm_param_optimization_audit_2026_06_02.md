---
name: reference_whiskey_jm_param_optimization_audit_2026_06_02
description: "Data-backed answer to 'is our JM lathe data optimized?' — ran lathe-fleet-param-audit (U-CL15) over 1,467 ORIGINAL JM programs (31 customers, A-side). 98.8% PROPER but NOT optimized: 85.4% feed-mode UNDECLARED (F-range 0.0015-150 = real IPR/IPM ambiguity), 100% units-undeclared (0 G20/G21 of 1467; relies on Okuma machine-default inch), 1.2% G96-without-G50-cap (safety gap; BRICO/CFC ~10% worst). CRITICAL: the OD-grind/ID-hone/counterbore-relief finishing practice is ~0.1% annotated in the corpus (od_grind 1, relief 1, hone 0, press_fit 0 of 1467) -> purely tribal -> only captured in reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01 + wiki. Generation round-trip BLOCKED on dist-build staleness (needs slot->main merge)."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.256Z
aliases: reference_whiskey_jm_param_optimization_audit_2026_06_02
---


# JM lathe param-optimization fleet audit (CLOSED-LOOP-MS0/U-CL15 consumer, slot:whiskey, 2026-06-02)

Ran the U-CL15 `lathe-fleet-param-audit` deterministically over the **A-side (original) JM programs** of 31 deduped cached A/B-pair jsonls — **1,467 programs, 29 customers with data** (ACUMENT/HEDALLOY a_paths unreadable on this PC). Report: `state/shared/specs/WHISKEY-PARAM-OPTIMIZATION-AUDIT-2026-06-02.{md,json}`.

## Answer to "ensure our data is optimized" — NO, three systemic gaps (all safe, one safety-class)
1. **feed-mode UNDECLARED 85.4%** — no G94/G95 → IPR vs IPM ambiguity. Evidence: fleet F-range **0.0015→150** (sub-thou IPR + 100+ IPM coexisting, no declared mode). #1 gap.
2. **units undeclared 100%** (0 G20/G21 of 1467) — relies on Okuma OSP machine-default inch. Unit-implicit, non-portable, violates UNITS-FIRST. Generator should emit explicit G20.
3. **G96 without G50 cap 1.2%** — the only ERROR-class (chuck-overspeed). Worst: BRICO ~10%, CFC ~10.5%, CHOCTAW 3.6%.
- PROPER (lint-clean) **98.8%** — originals are SAFE; vc(S@G96) 100–1500 SFM mean 242; G50 caps present in ~98.8%; op-mix bore-heavy (bore_rough 759 dominant — the carbide-insert-bore workload).

## CRITICAL finding — the finishing practice is NOT in the corpus
Of 1,467 programs the finishing-allowance PRACTICE is annotated ~0.1%: **od_grind 1, relief 1, id_hone 0, press_fit 0** (carbide=327 only names the insert material). The OD-grind / ID-hone / counterbore-relief practice the operator described is **purely tribal — a generator cannot learn it from program comments.** It exists ONLY in [[reference_jm_lathe_finishing_allowances_carbide_pressfit_2026_06_01]] + `knowledge/wiki/code-tribal/jm-lathe-finishing-allowances.md`. This PROVES the operator's "make this a memory and wiki" instruction was load-bearing, not redundant.

## How to apply
1. **Generator value-add over JM originals** = declare G95 + emit G20 + pair G96 with G50 cap + apply the finishing-allowance rule from print tolerances. (a)–(c) already baked into PRISM U-CL5/U-CL7 emitters by construction; (d) from the tribal capture.
2. **Accuracy must score against as-machined intent**, not the bare print number — a press-fit bore/OD cut to nominal is WRONG (must carry grind/hone stock).
3. **The full generation round-trip (read print→write→post→compare) is BLOCKED** offline: PRISM engines need the built dist, and `build:fast` is RED on slot/whiskey from pre-existing cross-tree staleness (turningDispatcher→LatheLiveToolingPlannerEngine.js, IdeaBlock→ideaBlockSchema.js — NOT my edits). Unblocked by the slot→main merge. This audit is the TARGET-side measurement; the round-trip is the next leg gated on the merge.
4. **Workflow lesson (re-confirmed):** the param-audit fleet workflow's 31 schema-bound agents ALL failed StructuredOutput ([[reference_alpha_explore_agent_schema_incompat]]). Pure deterministic transforms = run code directly; schema-bound workflow agents only for judgment (R5).
