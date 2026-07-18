# PRISM Inference Chain Engine

## Purpose
Multi-step physics reasoning chains that compose Kienzle, Taylor, and power calculations into complete machining parameter sets. Propagates uncertainty through each calculation step.

## Chain Types
- `speed_feed` — Material → Kienzle → Taylor → Speed/Feed → Power check → Safety score
- `tool_life` — Cutting conditions → Taylor → Wear prediction → Cost/tool
- `power` — Forces → Torque → Power → Spindle check → Safety
- `cost` — All above → Cycle time → Tool cost → Total cost/part
- `uncertainty` — GUM-compliant uncertainty propagation through any chain

## Actions (via prism_calc)
- `inference_chain` — Execute named chain with input parameters

## Usage
Provide material, tool, and desired operation. Engine executes multi-step physics chain, validating at each step. Returns full parameter set with uncertainty bounds and safety scores.

## Key Parameters
- `chain` — Chain type from list above
- `material` — Material ID or ISO group
- `tool` — Tool ID or specifications
- `operation` — "roughing" | "finishing" | "semi-finishing"
- `constraints` — { max_power_kw, max_torque_nm, target_surface_finish_um }

## Safety Integration
Every chain terminates with S(x) calculation. Chain BLOCKS if any intermediate step produces NaN, negative values, or physically impossible results.
