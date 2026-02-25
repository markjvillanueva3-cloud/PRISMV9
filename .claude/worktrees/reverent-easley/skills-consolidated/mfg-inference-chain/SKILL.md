---
name: mfg-inference-chain
description: Run connected physics chain from cutting parameters through force, temperature, wear, life, and cost — full causal model
---

## When To Use
- Want to see the full causal chain from cutting parameters to final outcomes
- Need to understand how a speed/feed change propagates through force, temperature, wear, and cost
- Evaluating the downstream impact of a parameter change on all connected physics
- Teaching or documenting the interconnected nature of machining physics
- NOT for single-formula calculations (use mfg-formula-lookup or mfg-cutting-force)
- NOT for uncertainty propagation (use mfg-uncertainty)

## How To Use
### Run full inference chain
```
prism_calc action=inference_chain params={
  material: "4140_steel",
  operation: "milling",
  Vc: 200,
  fz: 0.15,
  ap: 3,
  ae: 25
}
```

### Chain with tool and machine context
```
prism_calc action=inference_chain params={
  material: "inconel_718",
  operation: "turning",
  Vc: 45,
  f: 0.20,
  ap: 2.0,
  tool: "CNMG120408-SM GC1115",
  machine: "dmg_ctx_beta_1250"
}
```

## What It Returns
```json
{
  "chain": {
    "inputs": {
      "material": "4140_steel",
      "Vc_m_min": 200,
      "fz_mm": 0.15,
      "ap_mm": 3,
      "ae_mm": 25
    },
    "step_1_force": {
      "model": "Kienzle",
      "kc_N_mm2": 2864,
      "Fc_N": 1074,
      "Ft_N": 537,
      "Fa_N": 322,
      "power_kW": 3.58,
      "torque_Nm": 17.1
    },
    "step_2_temperature": {
      "model": "Loewen-Shaw",
      "cutting_zone_C": 485,
      "chip_temp_C": 420,
      "workpiece_temp_C": 125,
      "thermal_partition": {"chip": 0.72, "tool": 0.18, "workpiece": 0.10}
    },
    "step_3_wear": {
      "model": "Usui_abrasive_diffusion",
      "flank_wear_rate_um_min": 8.5,
      "crater_wear_rate_um_min": 2.1,
      "dominant_mechanism": "abrasive (65%) + diffusion (35%)",
      "temperature_acceleration_factor": 1.8
    },
    "step_4_life": {
      "model": "Taylor_extended",
      "tool_life_min": 32.5,
      "VB_at_end_of_life_mm": 0.3,
      "flank_wear_criterion": "VB_max = 0.3mm (ISO 3685)"
    },
    "step_5_cost": {
      "model": "Gilbert_economics",
      "cost_per_part": 3.85,
      "machining_time_cost": 2.40,
      "tool_cost": 0.95,
      "tool_change_cost": 0.50
    }
  },
  "causal_insights": [
    "Cutting zone temperature of 485C activates diffusion wear at 35% of total — approaching the CVD coating limit (~550C)",
    "Increasing Vc by 20% would raise temperature to ~560C, shifting wear to diffusion-dominated and halving tool life",
    "Reducing fz by 15% reduces force by 12% but only extends tool life by 8% due to speed-dominant wear"
  ]
}
```

## Examples
### Full chain for 4140 steel milling
- Input: `prism_calc action=inference_chain params={material: "4140_steel", operation: "milling", Vc: 200, fz: 0.15, ap: 3, ae: 25}`
- Output: Force 1074N, temp 485C, wear 8.5 um/min abrasive-dominant, life 32.5 min, cost $3.85/part, 3 causal insights
- Edge case: At temperatures above coating stability threshold, the chain flags a regime change warning

### Chain for Inconel with ceramic tooling
- Input: `prism_calc action=inference_chain params={material: "inconel_718", operation: "turning", Vc: 45, f: 0.20, ap: 2.0}`
- Output: Chain shows high forces (work hardening), extreme temperatures, notch wear dominant mechanism
- Edge case: Inconel chain includes work-hardening feedback loop not present in steel calculations
