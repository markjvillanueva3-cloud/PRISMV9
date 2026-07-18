---
name: reference_counterfactual_mill_divergent_constants_2026_06_15
description: CounterfactualMillEngine inlines 12 DIVERGENT (wrong) Kienzle/Taylor constants vs CANONICAL_KIENZLE/CANONICAL_TAYLOR — physics-correctness bug; must refactor-to-import before wiring. Route to foxtrot/kilo (mill domain).
type: reference
slot: papa
source: prism-memory
synced: 2026-06-27T20:30:46.532Z
aliases: reference_counterfactual_mill_divergent_constants_2026_06_15
---


# CounterfactualMillEngine — inlined + DIVERGENT physics constants (correctness bug)

**Found 2026-06-15 (slot:papa, WIRE-UNWIRED-PAPA loop iter9)** while assessing
`mcp-server/src/engines/CounterfactualMillEngine.ts` for a prism_cam wire. The engine
hardcodes (lines 81-95) Kienzle + Taylor constant maps that VIOLATE the no-inline rail
AND disagree with the canonical authoritative source `mcp-server/src/physics/constants.ts`
(`CANONICAL_KIENZLE` / `CANONICAL_TAYLOR`, sourced Sandvik Coromant 2024 + ISO 3685:1993).

**12 divergent values** (engine value -> canonical correct value):
- **Kienzle mc**: K 0.25->**0.28**, N 0.20->**0.22**, S 0.28->**0.27**  (P/M/H match)
- **Taylor C**: P 250->**350**, M 180->**200**, K 300->**250**, S 120->**150**, H 100->**120**  (N matches)
- **Taylor n**: K 0.30->**0.25**, N 0.35->**0.40**, S 0.15->**0.18**, H 0.12->**0.15**  (P/M match)

The engine's `estimateBaseline()` uses these for the Kienzle force (`kc = kc1_1*h^-mc; Fc = kc*h*b`)
and Taylor life (`toolLife = (C/v)^(1/n)`), so its force + tool-life + every downstream
delta/recommendation are computed from WRONG coefficients for ISO groups K/N/S (and Taylor for
P/M/H too). This is a real prediction-correctness defect, not a style nit.

**Why NOT fixed/wired by papa:** (1) the fix is behavior-CHANGING (corrects the physics), so it
needs a physics-review sign-off + a downstream-impact check (any test/consumer pinned to the old
wrong values); (2) it is a mill-DOMAIN physics edit — papa soul `defer-physics-edits-to-domain-slot`.
Papa correctly REFUSED to wire an engine atop an unsound foundation (R13) and refused an
unauthorized physics edit. CounterfactualMill is therefore reclassified CLEAN -> DEFERRED in
`state/shared/specs/PAPA-WIRE-UNWIRED-WORKLIST-2026-06-14.md`.

**Fix unit (route to foxtrot/kilo OR a papa+physics-review pair):** `U-FIX-CFMILL-CANONICAL-CONSTANTS`
1. `import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";`
2. Delete the 4 inlined maps (KIENZLE_KC1_1, KIENZLE_MC, TAYLOR_C, TAYLOR_N); read
   `CANONICAL_KIENZLE[iso].{kc1_1,mc}` + `CANONICAL_TAYLOR[iso].{C,n}` in `estimateBaseline()`.
3. physics-review agent: confirm the formula path + the corrected coefficients.
4. Update/inspect any test pinned to the old outputs (behavior changes for K/N/S + Taylor).
5. THEN wire to prism_cam (analyze(MillingBaselineParams) + generateSingleCounterfactual) per the
   proven camDispatcher recipe (see [[reference_papa_hdrive_vault_synergy_2026_06_14]] handoff / worklist).

Sibling: the same audit pattern should sweep OTHER engines for inlined Kienzle/Taylor (grep
`KIENZLE_|TAYLOR_|kc1_1.*=.*1800` across engines/). Related doctrine: global CLAUDE.md SAFETY
(`NEVER inline Kienzle/Taylor/material constants`).
