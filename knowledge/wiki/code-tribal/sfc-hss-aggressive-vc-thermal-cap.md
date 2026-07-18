---
schema: ideablock-v1
title: "HSS has no aggressive cutting-SPEED gear: a relative per-material derate is NOT an absolute thermal cap"
domain: "Speed-Feed Calculator (SFC)"
category: code-tribal
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-06-25-oscar
sources:
  - Trent & Wright, "Metal Cutting" 4e ch.6 (HSS red-hardness / hot-hardness mechanism, ~540-600 C)
  - Machinery's Handbook 31e — HSS milling speed tables (single recommended Vc band, no aggressive column for HSS)
  - xAI Grok (Hermes) independent physics consensus 2026-06-25 (corroborated no-aggressive-Vc for P/M/K/S + N-aluminum exception)
  - PRISM physics/constants.ts + tool-material-speed-override.ts (CANONICAL speed factors — never inline)
  - commit cb40bbba7b (U-OSC-HSS-AGGR-VC-CAP)
extracted_via: human-authored
extracted_at: 2026-06-25T15:30:00Z
authored_by: claude-d1c0715f (slot:oscar, U-OSC-HSS-AGGR-VC-CAP)
---

# HSS aggressive-Vc thermal cap

## The lesson (the bug class)

A **relative** tool-material speed derate (e.g. `HSS = 0.35 x carbide`) is NOT the same as an
**absolute** thermal ceiling. The relative factor scales the base Vc, but the *optimize-for-productivity*
("aggressive") mode independently picks a HIGHER base Vc column, and the relative factor scales THAT too —
so the derate does nothing to stop the aggressive mode from pushing a low-red-hardness tool past its
thermal limit. **Mode aggression and material derate are orthogonal axes; capping one does not cap the other.**

## The physics

HSS (high-speed steel) red-hardness / tempering limit is **~540-600 C**. Its recommended ("balanced")
cutting speed already sits AT that thermal ceiling, so HSS has **no aggressive cutting-SPEED (Vc) regime**
above its recommended speed — unlike carbide (red-hardness ~1000 C+), which has real Vc headroom. For HSS,
aggressive **MRR comes from depth-of-cut (ap) + feed-per-tooth (fz), not higher Vc**. Machinery's Handbook
HSS tables encode this empirically: a *single* recommended Vc band per material, with no separate
"aggressive" Vc column (the carbide tables DO have one).

**The aluminum exception (N):** aluminum's low cutting temperature keeps the tool-chip interface well
below the HSS tempering limit even at elevated Vc, so HSS retains a genuine ~1.5-2x aggressive Vc regime
in N. This is consistent with the canonical Taylor data (N carbide C=600/n=0.40 vs P C=350/n=0.25 — much
more speed headroom in aluminum). So N is EXCLUDED from the cap.

## The fix pattern (PRISM)

When a relative material derate exists but an aggressive MODE can over-reach a thermal limit, add a
**per-material, per-ISO categorical cap** that clamps ONLY the aggressive Vc base to the balanced base
(leave fz/ap aggressive). Mode-agnostic `min(resolvedVc, balancedVc)` catches productivity AND any
balanced->aggressive blend, and is a no-op for conservative/balanced. Place the categorical policy in the
existing material-speed-override layer (`tool-material-speed-override.ts`), NOT in `constants.ts` — it is
policy, not a Kienzle/Taylor numeric value. Apply at EVERY Vc-producing site (R15): the primary engine Vc,
its `alternatives.aggressive`, AND any sibling orchestrator that builds its own synthetic aggressive Vc
multiplier — otherwise the engines diverge for the affected material.

**Monotonic safety:** the cap only ever LOWERS Vc, and a lower Vc also lowers spindle power (P = Fc*Vc),
so it never trades one risk for another; the surviving aggressive fz/ap stay gated by the existing
force/workholding/deflection clamps.

## Don't re-break it

- Do NOT "fix" this by lowering the HSS BALANCED ratio — the balanced 0.35 is correctly calibrated to
  MODERN HSS-Co (the 24 m/min textbook figure is the old plain-HSS floor, the wrong anchor;
  physics-reviewer adjudicated 2026-06-09). This cap is the ORTHOGONAL aggressive-mode fix.
- Do NOT clamp carbide/cermet/ceramic/CBN/PCD — they have a real aggressive Vc gear (high red-hardness).
- Do NOT clamp N (aluminum) HSS — the exclusion is deliberate and physically grounded.

## Related

- Memory: [[reference_oscar_hss_aggressive_vc_cap_2026_06_25]] · [[reference_oscar_sfc_hss_overspeed_finding_2026_06_09]]
- Wiki: [[math-speed-feed-the-full-physics]] · [[speed-feed-galaxy]]
- Open follow-ups (P2): propagation-bridge roughing-feed derives from the Vc ratio not aggressive.fz
  (capped-HSS feed silently drops to balanced); engine effectiveIso vs orchestrator raw-iso predicate parity.
