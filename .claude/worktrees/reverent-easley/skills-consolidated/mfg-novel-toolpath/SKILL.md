---
name: mfg-novel-toolpath
description: Generate PRISM-developed novel toolpath strategies for challenging machining scenarios
---

## When To Use
- Facing a machining challenge that standard strategies do not solve well
- Need innovative approaches for thin walls, deep pockets, or exotic materials
- Want PRISM-generated strategies with engineering rationale and trade-offs
- NOT for standard strategy selection (use mfg-strategy-select)
- NOT for standard parameter calculation (use mfg-toolpath-params)

## How To Use
### Novel Strategy for Deep Thin-Wall Pocket
```
prism_toolpath action=prism_novel params={
  challenge: "deep pocket thin wall aluminum",
  constraints: {
    max_deflection: 0.02
  }
}
```

### Novel Strategy for Hardened Die Cavity
```
prism_toolpath action=prism_novel params={
  challenge: "complex 3D cavity in 58 HRC tool steel",
  constraints: {
    surface_finish_Ra: 0.4,
    no_hand_polishing: true
  }
}
```

### Novel Strategy for Superalloy Blade Root
```
prism_toolpath action=prism_novel params={
  challenge: "fir tree root form in Inconel 718",
  constraints: {
    profile_tolerance: 0.025,
    max_tool_changes: 3
  }
}
```

## What It Returns
```json
{
  "challenge": "deep pocket thin wall aluminum",
  "constraints": { "max_deflection": 0.02 },
  "novel_strategy": {
    "name": "alternating_depth_spiral_with_damping_passes",
    "phases": [
      {
        "phase": 1,
        "description": "Rough both sides alternately in 2mm Z steps to maintain symmetric wall support",
        "strategy": "alternating_side_adaptive",
        "doc_mm": 2.0,
        "stepover_percent": 15
      },
      {
        "phase": 2,
        "description": "Semi-finish with rest machining, leaving 0.3mm stock on walls",
        "strategy": "rest_machining",
        "stock_mm": 0.3
      },
      {
        "phase": 3,
        "description": "Finish with spring passes, alternating climb/conventional to cancel deflection bias",
        "strategy": "alternating_direction_finish",
        "passes": 3,
        "final_stock_mm": 0.0
      }
    ],
    "rationale": "Symmetric material removal prevents one-sided wall loading. Alternating finish direction cancels systematic deflection error.",
    "expected_deflection_mm": 0.015,
    "confidence": 0.88,
    "references": ["thin_wall_machining_handbook", "PRISM_wall_deflection_model"]
  },
  "alternatives": [
    {
      "name": "wax_fill_support",
      "description": "Fill pocket with machinable wax before finishing thin walls",
      "trade_off": "Requires wax filling station and extra setup time"
    }
  ]
}
```

## Examples
### Deep Thin-Wall Aluminum Pocket
- Input: `prism_toolpath action=prism_novel params={challenge: "deep pocket thin wall aluminum", constraints: {max_deflection: 0.02}}`
- Output: 3-phase alternating depth spiral with damping passes, 0.015mm expected deflection
- Edge case: Walls thinner than 1mm may require vacuum fixture or wax filling regardless of strategy

### Hardened Die Cavity without Polishing
- Input: `prism_toolpath action=prism_novel params={challenge: "complex 3D cavity in 58 HRC tool steel", constraints: {surface_finish_Ra: 0.4, no_hand_polishing: true}}`
- Output: Micro-ballnose HSM with 0.05mm stepover, cusp-height-controlled adaptive stepover
- Edge case: Ra 0.4 um at 58 HRC requires CBN ball-nose tools and 15,000+ RPM spindle

### Superalloy Blade Root Form
- Input: `prism_toolpath action=prism_novel params={challenge: "fir tree root form in Inconel 718", constraints: {profile_tolerance: 0.025, max_tool_changes: 3}}`
- Output: Form grinding with creep-feed approach, or multi-pass profiling with deflection compensation
- Edge case: Inconel work-hardens rapidly — each pass must cut below the hardened layer
