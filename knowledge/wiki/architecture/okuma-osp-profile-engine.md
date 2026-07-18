---
title: OkumaLatheOSPProfileEngine — capability profile + parameter recommender
type: architecture
status: shipped
unit: U-MIKE-OSP-PROFILE-ENGINE
milestone: MIKE-OSP-PROFILE-MS0
slot: mike
date: 2026-05-23
---

# OkumaLatheOSPProfileEngine

Production engine that profiles Okuma OSP-controller capabilities and produces consensus-gated parameter recommendations for the JM Die Okuma lathe fleet (7 machines spanning 6 controller families).

Combines **two upstream patterns**:
- **india** `HurcoV11MillMasterPost` group-D physics gates (commit `ae0f634ae4`) — Kienzle Fc bound, Taylor tool-life, stickout L/D, R12 fail-loud material validation.
- **echo** `LATHE-P2P-CONSENSUS-MS4` consensus + safety gate (commit `d6a975d987`) — 3-candidate fanout (conservative/balanced/aggressive), Omega/S(x) shop-floor gate, `SafetyGateRejection` throwing class.

Source: `mcp-server/src/engines/OkumaLatheOSPProfileEngine.ts` · Tests: `mcp-server/src/__tests__/OkumaLatheOSPProfileEngine.test.ts` (32/32 PASS).

## Why this exists

The sister unit [[fusion-tooling-catalog-extraction]] extracted speed/feed envelopes from existing mill/EDM `.hsmlib` libraries. The sister unit [[jm-lathe-post-audit]] (pending wiki page; see memo `[[reference_jm_lathe_post_audit_2026_05_23]]`) classified the 7 Okuma `.cps` posts and flagged 6 upgrade candidates.

The gap between the two: the audit's "Rebuild plain post with Ai-Enhanced + iMachining" recommendation assumes the underlying controller can execute those instructions. **Two of the seven lathes (LTH-03 LNC8 + LTH-04 Crown L1060) run the legacy OSP-U10L controller**, which has no iMachining instruction and no AI-adaptive feedrate. A post-only upgrade is impossible there — those need a hardware-side refresh.

This engine surfaces the capability gate so downstream consumers cannot accidentally generate posts the controller would reject.

## API

### Controller classification

```ts
OkumaLatheOSPProfileEngine.classifyController("OSP-P300SA")
// → { family: "P300SA", generation: 5, imachining_capable: true,
//     ai_adaptive_feedrate_capable: true, live_tooling_capable: true,
//     c_axis_capable: true, spindle_max_rpm: 6000, feed_mode_default: "G95",
//     thread_pitch_macro: "G76", notes: [...] }

OkumaLatheOSPProfileEngine.classifyController("OSP-U10L").imachining_capable  // false
OkumaLatheOSPProfileEngine.classifyController("FANUC-31i")                    // null
```

Recognised OSP families (covers all 7 JM Die Okuma lathes):

| Family | Gen | iMachining | AI-adaptive | Live tool | C-axis | Spindle max |
|--------|----:|:----------:|:-----------:|:---------:|:------:|------------:|
| P200LA | 3   | ✓ | ✓ |   |   | 5000 |
| P300L  | 4   | ✓ | ✓ | ✓ | ✓ | 4000 |
| P300LA | 4   | ✓ | ✓ | ✓ | ✓ | 4500 |
| P300SA | 5   | ✓ | ✓ | ✓ | ✓ | 6000 |
| P500   | 5   | ✓ | ✓ | ✓ | ✓ | 3500 |
| **U10L** | **1** | **✗** | **✗** |   |   | 4500 |

### Physics gates (india pattern)

```ts
// Kienzle Fc = kc1_1 * b * fz^(1-mc) * ap, references CANONICAL_KIENZLE
OkumaLatheOSPProfileEngine.applyKienzleGate({
  iso_group: "P", ap_mm: 1.5, fz_mm: 0.15, max_force_N: 5000
});
// → { fc_N: 643.7, within_bounds: true, headroom_pct: 87.1,
//     kc1_1_used: 1800, mc_used: 0.25 }

// Taylor T = (C/Vc)^(1/n), references CANONICAL_TAYLOR
OkumaLatheOSPProfileEngine.applyTaylorGate({
  iso_group: "P", vc_m_min: 150, target_life_min: 30
});
// → { predicted_life_min: 29.66, life_margin_factor: 0.989, ok: false,
//     C_used: 350, n_used: 0.25 }

// Stickout L/D + cubic deflection falloff
OkumaLatheOSPProfileEngine.applyStickoutGate({ L_mm: 50, D_mm: 10 });
// → { LD_ratio: 5, ok: false, deflection_class: "compliant",
//     recommended_max_force_N: 512 }   // 1000 * (4/5)^3
```

**R12 fail-loud**: all three gates validate via Zod and **THROW** on out-of-range input (`ap > 50 mm`, `vc = 0`, `D = 0`, `iso_group ∉ {P,M,K,N,S,H}`, etc.). No silent clamping.

### Consensus + safety gate (echo pattern)

```ts
const result = OkumaLatheOSPProfileEngine.consensusParameters(
  "P",                  // ISO group
  machine,              // LatheMachineDescriptor
  dialect,              // OSPDialectProfile (from classifyController)
  stickoutResult,       // from applyStickoutGate
  30,                   // target_life_min
);
// → { candidates: [conservative, balanced, aggressive],
//     recommended: { strategy: "balanced", vc_m_min: 95, fz_mm: 0.15, ap_mm: 1.5,
//                    predicted_fc_N: 643, predicted_life_min: 30, confidence: 1.0 },
//     omega: 0.95, sx: 0.98, passes_safety_gate: true }

OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.97, sx: 0.99 });
// → void (pass)
OkumaLatheOSPProfileEngine.enforceSafetyGate({ omega: 0.94, sx: 0.99 });
// → throws SafetyGateRejection { omega: 0.94, sx: 0.99,
//                                 omega_threshold: 0.95, sx_threshold: 0.98 }
```

Tier thresholds (matches CLAUDE.md + echo P1-U03):
- `shop_floor` (default): Omega ≥ 0.95, S(x) ≥ 0.98
- `lab`: Omega ≥ 0.85, S(x) ≥ 0.90
- `research`: Omega ≥ 0.70, S(x) ≥ 0.80

### Material × stickout matrix

```ts
OkumaLatheOSPProfileEngine.buildMaterialStickoutMatrix(
  machine,
  dialect,
  ["P", "M", "N"],
  [{ L_mm: 25, D_mm: 16 }, { L_mm: 50, D_mm: 16 }],
);
// → { "P_25x16": ConsensusResult, "P_50x16": ConsensusResult,
//     "M_25x16": ConsensusResult, "M_50x16": ConsensusResult,
//     "N_25x16": ConsensusResult, "N_50x16": ConsensusResult }
```

The user-named matrix surface for *"tooling parameters relative to material, stock stick out, tool type and stick out and all other machining parameters"*.

## Anti-regression invariant

Locked by test `"U10L legacy dialect produces LOWER S(x) than P300SA modern dialect (same material)"`:

```
S(x)[P300SA, steel P, 40x16 stickout] > S(x)[U10L, steel P, 40x16 stickout]
```

The dialect-capability multiplier inside `consensusParameters` (sum of iMachining_capable + ai_adaptive_feedrate_capable + base) is what produces this ordering. If a future refactor flattens it, the upgrade-ROI signal vanishes silently — the test catches that.

## Cross-refs

- Pattern sources: india `[HurcoV11MillMasterPost.test.ts]` (commit `ae0f634ae4`), echo `[LathePvsBOMS4Acceptance.test.ts]` (commit `d6a975d987`)
- Sister units: [[fusion-tooling-catalog-extraction]], wiki entry for `jm-lathe-post-audit` (pending; see memo `[[reference_jm_lathe_post_audit_2026_05_23]]`)
- Memory: `[[reference_mike_osp_profile_engine_2026_05_23]]`
- Race-mitigation patterns used: [[mike-bridge-wiring-race-mitigation-2026-05-23]]
