---
name: reference-us-c21-electrode-material-decision-2026-05-22
description: ARC-MS6/muS-C21 ElectrodeMaterialDecisionEngine shipped+wired+tested+3of3-cleared (commit 025c7d55) — graphite-vs-copper decision scoring model wired as prism_edm:electrode_material_decide. Charlie iter13-14. 3-of-3 PASS×3 (completed iter14 after API rate-limit cleared).
aliases: reference_us_c21_electrode_material_decision_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.231Z
---


**2026-05-22 charlie /loop iter 13.** Shipped ARC-MS6/muS-C21 — `ElectrodeMaterialDecisionEngine` (commit `025c7d55`).

**What it is.** A real scoring-model decision engine over 5 electrode materials × 7 workpiece classes — replaces the 3-branch ternary `matRec` string buried in `ElectrodeDesignEngine.design()`. Given a workpiece material + process context, scores every electrode material and returns a ranked recommendation with per-material rationale + margin-based confidence.

Scoring: `score = 50 − wear_ratio[mat][class] + workpiece_affinity + feature/process bonuses`. Factors: wear ratio (lower=better), workpiece-class affinity (CuW dominates carbide; copper scores LAST on copper-alloy workpiece — Cu-on-Cu sticks), surface-finish target (Ra<0.4µm → copper/CuW), hardness (HRC>55 → graphite_fine/CuW), feature flags (sharp_corners, deep_ribs), cavity aspect ratio (>3 → CuW), num_cavities amortisation (>5 → CuW), cost_priority dial (low_cost/balanced/performance). Confidence = (top−second)/(top−bottom).

**Where it sits.** `mcp-server/src/engines/ElectrodeMaterialDecisionEngine.ts`. Wired into `prism_edm` as action `electrode_material_decide` (edmDispatcher.ts enum + lazy-import case + edmActionSchemas.ts Zod schema). 20 tests in `src/__tests__/ElectrodeMaterialDecisionEngine.test.ts` — all hand-computed literals (canonical D2=50; carbide CuW=65; copper LAST on brass=−35; sharp+deep CuW=82; 7 workpiece-class normalizations; HRC/Ra/cavity/cost modifiers; confidence margins; validation). Pure, deterministic, Zod-validated, engine-named errors.

**Bug caught at runtime.** The aluminum classifier regex `al\b` matched the trailing "al" of the word "material" → "unknown material XYZ" misclassified as aluminum. Also `Ti-6Al-4V` would trip the loose `al-?[0-9]` before the titanium check. Fix: reordered `_classifyWorkpiece` (carbide→inconel→titanium→stainless→aluminum→copper_alloy→tool_steel, most-specific first) + tightened to `\bal\b` word boundaries. **Third runtime-caught bug this session** (iter10 substring-collision, iter11 incomplete-set warning, iter13 regex over-match) — the pattern holds: reviewer logic-PASS ≠ runtime-PASS, always re-run.

**3-of-3 SCRUTINY — COMPLETE (PASS×3).** The 3 review arms were rate-limited on 3 attempts during iter 13 (`API Error: Server is temporarily limiting requests · not your usage limit` — fleet-wide saturation). The ledger was deliberately NOT faked. On the iter-14 cron fire the API had cleared; all 3 arms (reviewer A holistic / reviewer B test+wiring / code-analyzer C regression) returned **VERDICT: PASS** on commit `025c7d55` with **zero P0/P1 blockers**. The session ledger is marked. P3 notes only: fallback-note gating is cosmetic; the dispatcher Zod schema is looser than the engine's internal `.strict()` schema (harmless — engine re-validates, throws an engine-named error); `tellurium_copper` has no decisive-win scenario (niche material, intentional); `tolerance_mm` is an accepted-but-unused forward-compat placeholder.

**Lesson — infra-blocked gates: never fake, document loudly, retry next fire.** When the 3-of-3 review arms are rate-limited, the correct move is (1) commit the verified work, (2) leave the ledger UNMARKED (faking a gate is forbidden), (3) write a memory flagging the pending state with the exact retry command, (4) tick the loop honestly, (5) do NOT start a new unit (a down gate means new units also go unscrutinized — that compounds debt). The next cron fire retries; if the API cleared, the gate completes. This kept muS-C21 from becoming silent committed-but-unscrutinized debt. Related: [[reference_us_c25_electrode_cost_2026_05_22]] · [[reference_us_c22_electrode_pairing_2026_05_22]] · [[feedback_parallel_scrutiny_per_file]].
