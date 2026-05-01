---
name: prism-manufacturing-cost
description: |
  Manufacturing cost estimation for CNC job quoting and process optimization.
  Cycle time estimation, machine hour rates, tool cost per part, material cost,
  setup amortization, and multi-operation costing.
  
  Functions: cycle_time_estimate, machine_hour_rate, tool_cost_per_part,
  material_cost, setup_amortization, total_part_cost, batch_cost_curve,
  break_even_quantity, make_vs_buy, cost_per_feature, quote_generate
  
  Academic Source: MIT 2.854 (Production Systems), MIT 2.810, SCEA Handbook
  Total: ~370 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "manufacturing", "cost", "estimation", "quoting", "process", "optimization", "cycle"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-manufacturing-cost")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-manufacturing-cost") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What manufacturing parameters for 316 stainless?"
→ Load skill: skill_content("prism-manufacturing-cost") → Extract relevant manufacturing data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot cost issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM MANUFACTURING COST ESTIMATION
## CNC Job Costing, Quoting, and Process Economics

# 1. COST STRUCTURE OVERVIEW

## 1.1 Cost Components

```
C_total = C_material + C_machining + C_tooling + C_setup + C_overhead + C_profit

Where:
  C_material  = raw material + scrap allowance
  C_machining = machine time × hour rate
  C_tooling   = tool wear cost allocated per part
  C_setup     = setup time amortized over batch
  C_overhead  = inspection, handling, secondary ops
  C_profit    = margin (typically 15-35%)
```

## 1.2 Typical Cost Breakdown (CNC Milled Part)

```
Small batch (10 parts):
  Material: 15%  |  Machining: 25%  |  Setup: 30%  |  Tooling: 5%  |  Overhead: 25%

Medium batch (100 parts):
  Material: 20%  |  Machining: 35%  |  Setup: 8%   |  Tooling: 7%  |  Overhead: 30%

Large batch (1000+ parts):
  Material: 25%  |  Machining: 40%  |  Setup: 2%   |  Tooling: 8%  |  Overhead: 25%
```

# 2. MACHINE HOUR RATE CALCULATION

## 2.1 Machine Cost Rate

```
R_machine = (C_purchase × CRF + C_maintenance + C_floor + C_power) / H_annual

where:
  C_purchase = machine purchase price ($)
  CRF = capital recovery factor = i(1+i)^n / ((1+i)^n - 1)
  i = interest rate (WACC or hurdle rate)
  n = depreciation period (years, typically 7-10)
  C_maintenance = annual maintenance cost (3-5% of purchase)
  C_floor = floor space cost ($/ft² × footprint)
  C_power = kW rating × utilization × $/kWh × hours
  H_annual = productive hours per year (typically 4000-6000)
```

## 2.2 Loaded Machine Rate (Including Labor)

```
R_loaded = R_machine + R_labor × (1 + overhead_rate)

where:
  R_labor = operator hourly rate ($/hr)
  overhead_rate = benefits + supervision + admin (40-80%)
  
For attended operation: ratio = 1 operator : 1 machine
For lights-out/cell: ratio = 1 operator : 2-4 machines
```

## 2.3 Typical Machine Hour Rates (2025 USD)

| Machine Type | Purchase ($K) | Rate ($/hr) |
|-------------|---------------|-------------|
| Manual mill | 50-80 | 35-50 |
| VMC 3-axis | 100-250 | 65-95 |
| VMC 5-axis | 300-700 | 120-180 |
| HMC with pallet | 400-800 | 130-200 |
| CNC lathe 2-axis | 80-200 | 55-85 |
| Mill-turn multitask | 400-900 | 140-220 |
| Swiss-type | 200-450 | 90-140 |
| Wire EDM | 150-400 | 75-120 |
| Grinding (CNC) | 200-500 | 85-130 |

# 3. CYCLE TIME ESTIMATION

## 3.1 Cycle Time Components

```
t_cycle = t_load + t_approach + t_cutting + t_rapid + t_tool_change + t_unload

where:
  t_load    = part load/clamp time (30-120 sec manual, 5-15 sec auto)
  t_approach = approach/retract moves at feed rate
  t_cutting = actual cutting time = L_cut / (f × n) or L_cut / Vf
  t_rapid   = rapid traverse time = L_rapid / V_rapid
  t_tool_change = ATC time × number of tools
  t_unload  = part unclamp/remove time
```

## 3.2 Cutting Time Formulas

**Turning:**
```
t_cut = (L + L_approach + L_overrun) / (f × n)
      = (L + L_a + L_o) × π × D / (1000 × f × Vc)

For multiple passes:
  N_passes = ceil(total_DOC / ap_max)
  t_total = N_passes × t_cut_per_pass
```

**Milling (linear):**
```
t_cut = (L + L_approach + L_overrun) / Vf
Vf = fz × z × n (mm/min)

L_approach for face milling = sqrt(ae × (D - ae))
L_approach for slot = D/2
```

**Drilling:**
```
t_drill = (depth + 0.3D + 2) / (f × n)
  0.3D = point allowance (118° drill)
  2mm = clearance plane approach
```

## 3.3 Tool Change Time

```
ATC time by machine type:
  VMC with arm-type ATC: 2-5 sec
  VMC with carousel: 4-8 sec
  HMC: 1.5-3 sec
  Lathe turret: 0.5-2 sec
  Mill-turn: 2-6 sec
  
Total tool change time per part:
  t_tc = N_tools × t_atc
```

## 3.4 Rapid Traverse Time

```
V_rapid typical: 30-60 m/min (varies by axis, machine)

t_rapid = Σ(L_rapid_i / V_rapid)

For 3-axis with simultaneous rapids:
  t_rapid = max(Lx/Vx, Ly/Vy, Lz/Vz)
```

# 4. TOOL COST PER PART

## 4.1 Indexable Insert Tools

```
C_tool_per_part = C_edge / N_parts_per_edge

C_edge = (C_insert / N_edges) + C_holder_amort
  
C_holder_amort = C_holder / (N_edges_lifetime × N_parts_per_edge)
  ≈ 0 for most calculations (holder lasts thousands of edges)

N_parts_per_edge = T_life / t_cut_per_part
  where T_life = tool life in minutes (from Taylor equation)
```

**Example:**
Insert cost: $12, 4 edges → $3/edge
Tool life: 15 min/edge, cutting time: 2 min/part
Parts per edge: 7.5 → round down to 7
Tool cost per part: $3 / 7 = $0.43

## 4.2 Solid Carbide End Mills

```
C_tool_per_part = (C_endmill / (N_regrinds + 1)) / N_parts_per_life

Regrind economics:
  New end mill: $50-200
  Regrind cost: $15-40
  Performance after regrind: 80-90% of new
  Typical regrinds: 3-5 before scrap
```

## 4.3 Total Tooling Cost

```
C_tooling_total = Σᵢ (C_tool_i / N_parts_per_edge_i)

Sum over all tools used in the operation.
For complex parts: 5-15 different tools, each with its own life.
```

# 5. MATERIAL COST

## 5.1 Raw Material Cost

```
C_material = V_blank × ρ × P_material × (1 + scrap_rate)

where:
  V_blank = blank volume (cm³)
  ρ = material density (g/cm³)
  P_material = price per kg ($)
  scrap_rate = percentage lost to chips + cutoff (10-60%)
```

## 5.2 Buy-to-Fly Ratio

```
BTF = weight of raw material / weight of finished part

Typical BTF ratios:
  Simple turned: 1.2-1.5
  Prismatic milled: 2-4
  Aerospace structural: 5-20 (high-value material, lots removed)
  Near-net forging: 1.3-1.8
  Casting + machining: 1.1-1.5
```

## 5.3 Material Prices (Approximate 2025)

| Material | Form | $/kg | $/lb |
|----------|------|------|------|
| 1018 steel | bar | 1.00-1.50 | 0.45-0.70 |
| 4140 alloy | bar | 2.00-3.00 | 0.90-1.35 |
| 304 stainless | bar | 4.00-6.00 | 1.80-2.70 |
| 6061-T6 Al | bar | 4.00-6.00 | 1.80-2.70 |
| 7075-T6 Al | plate | 8.00-12.00 | 3.60-5.45 |
| Ti-6Al-4V | bar | 30-50 | 14-23 |
| Inconel 718 | bar | 40-70 | 18-32 |
| Brass 360 | bar | 6.00-9.00 | 2.70-4.10 |

# 6. SETUP AND OVERHEAD

## 6.1 Setup Time Estimation

```
t_setup = t_fixture + t_tools + t_program + t_first_article

t_fixture: mount fixture/vise, indicate
  Simple vise: 10-20 min
  Dedicated fixture: 15-30 min
  Multi-axis fixture: 30-60 min

t_tools: load tools, set offsets
  Per tool: 2-5 min (manual touch-off)
  With tool presetter: 0.5-1 min
  Typical: 5-15 tools × time = 10-75 min

t_program: load program, verify (or program from scratch)
  Existing program: 5-10 min (load + verify)
  New program (simple): 30-60 min
  New program (complex): 2-8 hours

t_first_article: run first part, measure, adjust
  Simple: 15-30 min
  Complex (CMM required): 30-120 min
```

## 6.2 Setup Cost Amortization

```
C_setup_per_part = (t_setup × R_loaded) / Q

where Q = batch quantity

Example: 45 min setup × $85/hr loaded = $63.75 setup cost
  Q = 10 parts: $6.38/part
  Q = 100 parts: $0.64/part
  Q = 1000 parts: $0.06/part
```

## 6.3 Secondary Operations

```
Common secondary ops and typical costs:
  Deburring (manual): 1-5 min × $30/hr = $0.50-2.50
  Deburring (tumble): $0.10-0.50/part (batch)
  Heat treatment: $0.50-5.00/part
  Anodize (aluminum): $2-8/part
  Plating (Ni, Cr, Zn): $1-10/part
  Grinding (precision): additional machining cycle
  CMM inspection: $5-30/part
  Surface treatment (passivate, black oxide): $0.50-3.00
```

# 7. TOTAL PART COST MODEL

## 7.1 Complete Formula

```
C_part = C_material + C_machining + C_tooling + C_setup + C_secondary + C_scrap

C_machining = Σ_ops (t_cycle_i × R_loaded_i / 60)
C_tooling = Σ_tools (C_edge_j / N_parts_per_edge_j)
C_setup = Σ_ops (t_setup_i × R_loaded_i) / Q
C_scrap = C_part_subtotal × scrap_rate / (1 - scrap_rate)

Quote price:
  P_quote = C_part / (1 - margin)
  
  Typical margins:
    Job shop: 20-35%
    Production: 10-20%
    Aerospace/medical: 25-40%
```

## 7.2 Quick Estimation Heuristic

```
For simple parts (rough estimate):
  C_part ≈ C_material × (1 + complexity_factor × BTF)

Complexity factors:
  Simple (2-3 features): 2-3
  Medium (5-10 features): 4-6
  Complex (15+ features, tight tolerance): 8-15
  Aerospace complex: 15-30
```

# 8. BATCH ECONOMICS

## 8.1 Economic Order Quantity

```
EOQ = sqrt(2 × D × S / H)

where:
  D = annual demand (parts/year)
  S = setup cost per batch ($)
  H = holding cost per part per year ($/part/year)
    = C_part × carrying_rate (typically 20-30%)
```

## 8.2 Break-Even: CNC vs Alternative

```
CNC cost per part = C_setup/Q + C_variable
Alternative (manual, outsource, additive) = C_alt

Break-even quantity:
  Q_be = C_setup / (C_alt - C_variable)
```

## 8.3 Multi-Operation Part Costing

```
For parts requiring multiple setups/machines:
  C_total = Σᵢ (C_setup_i/Q + t_cycle_i × R_i/60 + C_tool_i)
            + C_material + C_secondary

Optimize by:
  1. Combine operations (mill-turn vs separate lathe + mill)
  2. Tombstone/pallet fixtures (multiple parts per setup)
  3. Dedicated tooling for large batches
  4. Tool life management across operations
```
