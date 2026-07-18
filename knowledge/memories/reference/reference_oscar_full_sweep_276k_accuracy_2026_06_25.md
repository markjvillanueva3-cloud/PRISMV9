---
name: reference_oscar_full_sweep_276k_accuracy_2026_06_25
description: "SFC full-mode sweep COMPLETE (slot:oscar, 2026-06-25): 69,120 cells x 4 tool materials = 276,480 comparisons, 0 errors, 151MB ledger. Needed a 32GB heap (default ~2GB OOMs at ~165K rows -> baked into the script via sweep-heap-reexec.mjs U-OSC-SWEEP-HEAP-REEXEC). Carbide is conservative/neutral in 5 of 6 ISO groups; the per-ISO P+10%/K+17.6% aggressive readings were a tool-material MIX artifact. REAL LEAD: PRISM derates HSS Vc correctly but aggressive_rush HSS-on-steel ~77 m/min (~253 SFM) may exceed the HSS thermal red-line (queued task: HSS Vc ceiling)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.689Z
aliases: reference_oscar_full_sweep_276k_accuracy_2026_06_25
---


**SFC full-mode sweep COMPLETE (slot:oscar, 2026-06-25) -- priority-3b accuracy validation over the
ENTIRE app input space.** `npx tsx scripts/sfc-full-sweep-compare.mjs --mode full --no-vendor --out
data/state/sfc-full-sweep-FULL-ledger.jsonl` -> **69,120 cells x 4 tool materials = 276,480
comparisons, 0 errors, 151MB ledger**. (The prior prod-mode run was 576 rows; this is the full
Blackwell-scale sweep.)

**OOM + permanent fix (U-OSC-SWEEP-HEAP-REEXEC, commit 3-file 249-insert).** Full mode FATAL-OOMs on
the default ~2GB heap at ~165,656 rows ("Reached heap limit Allocation failed"). The script's own
accumulators are tiny (~MB of numbers) -- the pressure is the full-enumeration materialization +
engine working set (large-but-BOUNDED: a 32GB heap completes it on the 136GB host; NOT an unbounded
per-cell leak). Fix: `scripts/lib/sweep-heap-reexec.mjs` (mirrors `tsx-reexec-guard` but keys on the
HEAP flag, so it fires under `npx tsx` too where the tsx guard no-ops) + 9/9 tests, wired before the
tsx re-exec (NODE_OPTIONS inheritance). Knob `PRISM_SFC_SWEEP_HEAP_MB` (default 32768).

**Accuracy result (PRISM vs the carbide-keyed 5-vendor baseline), by ISO x tool_material median Vc delta:**
- **Carbide (the apples-to-apples comparison): conservative/neutral in 5 of 6 ISO groups** --
  P -22.7% / M -11.1% / N -60.6% / S -2.7% (all SAFE), K +0%, H +7.6% (modest). This is the headline:
  PRISM-carbide does NOT over-speed.
- The per-ISO SUMMARY readings P +10% / K +17.6% ("aggressive") were a **tool-material MIX artifact** --
  driven by the HSS rows, not carbide. Always read per-ISO x per-material, never the per-ISO mix.
- vs G-Wizard published Vc +7.5% (slightly aggressive), vs HSMAdvisor Vc -24.4% (SAFE).

**LEAD RESOLVED (task #18 closed -- NOT a bug).** PRISM **derates Vc for HSS correctly** (iso P: carbide
PRISM 170 -> hss 68.8 m/min capped; NOT material-blind). The HSS tool-material factor is sourced + tested
(`src/physics/tool-material-speed-override.ts`: HSS-K=0.13, HSS-P=0.35 validated +31%). The sweep's
apparent asymmetry (aggressive scales HSS 2.2x but carbide only 1.13x) was an **RPM-cap artifact**, proven
by a per-cell uncapped probe (`rpm_capped=false`, no machine cap): the TRUE uncapped Vc scales **2.2x for
BOTH** materials -- carbide cost_batch 100 -> aggressive 220, hss 35 -> 77 (identical ratio). In the SWEEP
carbide aggressive (uncapped 220) was machine-RPM-CAPPED to 113 (1.13x visible) while hss 77 stayed below
the cap (2.2x visible). So the aggressive mode scales ALL materials uniformly -- no HSS over-speed. (Clean
payoff of this session's `cutting_speed_uncapped` field, U-OSC-VC-UNCAPPED-PARITY, which made the
disentangling a single probe.) **Residual P3 DESIGN note (not a bug, debatable):** aggressive_rush is not
per-material thermal-aware -- HSS-on-steel 77 m/min (~253 SFM) is thermally aggressive for plain HSS (vs
~80-110 SFM conservative), but aggressive_rush explicitly trades tool life for MRR and the user chose it.
A future tooling-aware enhancement could clamp HSS/ceramic Vc to a thermal ceiling even in aggressive
mode; low priority, needs physics-reviewer + a sourced per-material thermal limit. (Ceramic/cbn show PRISM
313 m/min baseline=null -> no datum; the catalog-OCR non-carbide reference unit, not a PRISM change.)

**Ledger -> india (priority 4):** the 276,480-row `data/state/sfc-full-sweep-FULL-ledger.jsonl` is the
training input for india LoRA/GNN + the downstream PRISM_SFC_CALIB_APPLY (GPU/Blackwell) layer. Fields are
COMPLETE: fz (U-OSC-SWEEP-LEDGER-FZ + per-mode split U-OSC-SWEEP-FZ-MODE-SPLIT) AND now
prism_vc_uncapped_mpm + prism_rpm_capped (U-OSC-SWEEP-LEDGER-UNCAPPED) so the model can learn
capped-vs-true Vc. The FULL ledger was REGENERATED with all fields via a bare `npx tsx --mode full` (NO
NODE_OPTIONS) -> live-proved the baked-in heap-reexec (U-OSC-SWEEP-HEAP-REEXEC + sibling
U-OSC-ALLAXIS-HEAP-REEXEC) completes the run with zero OOM. Sibling:
[[reference_oscar_full_sweep_validated_2026_06_25]] (the prod-mode predecessor).

**Units this session (2026-06-25 part 2, slot:oscar):** U-OSC-SWEEP-FZ-MODE-SPLIT (per-mode fz in
--json) -> U-OSC-SWEEP-HEAP-REEXEC (shared sweep-heap-reexec.mjs lib + 9/9 tests + wire) ->
U-OSC-SWEEP-LEDGER-UNCAPPED (uncapped Vc + cap flag in ledger row) -> U-OSC-ALLAXIS-HEAP-REEXEC (R15
sibling wire). All [MAIN-FORCE], scrutiny-gated at Stop.
