---
name: prism-cutting-fluids
description: |
  Cutting fluid selection, application methods, and optimization for CNC machining.
  Flood coolant, MQL, cryogenic, through-spindle coolant, air blast, and dry machining.
  Concentration management, filtration, and material-specific coolant strategies.
  
  Functions: coolant_select, mql_parameters, concentration_check,
  flow_rate_calc, coolant_life_estimate, cryogenic_feasibility,
  tsc_pressure_calc, coolant_cost_analysis
  
  Academic Source: MIT 2.810, Machining Fundamentals, CIRP research
  Total: ~380 lines
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cutting", "fluids", "fluid", "selection", "application", "methods", "optimization"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cutting-fluids")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cutting-fluids") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cutting parameters for 316 stainless?"
→ Load skill: skill_content("prism-cutting-fluids") → Extract relevant cutting data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot fluids issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM CUTTING FLUID SCIENCE
## Coolant Selection, Application & Management for CNC Operations

## 1. CUTTING FLUID FUNCTIONS

### Primary Roles
- **Cooling**: Removes heat from cutting zone (60-80% of heat in flood applications)
- **Lubrication**: Reduces friction at tool-chip and tool-work interfaces
- **Chip evacuation**: Flushes chips from cutting zone, critical in deep holes/pockets
- **Corrosion protection**: Prevents rust on machine, workpiece, and chips

### Heat Distribution Without Coolant
| Component | % of Total Heat |
|-----------|----------------|
| Chip | 70-80% |
| Workpiece | 10-20% |
| Tool | 5-10% |
| Environment | ~1% |

### Heat Distribution With Flood Coolant
Coolant absorbs 15-25% of total heat, primarily from chip and workpiece.
Tool temperature reduction: 20-50% depending on access to cutting zone.

## 2. FLUID TYPES & SELECTION

### Classification (ISO 6743-7)

| Type | Composition | Cooling | Lubrication | Best For |
|------|-------------|---------|-------------|----------|
| Straight oils | Mineral/synthetic oil, no water | Low | Excellent | Threading, tapping, broaching, gear cutting |
| Soluble oils | 3-10% oil in water emulsion | Good | Good | General milling/turning, moderate speeds |
| Semi-synthetic | 2-5% oil + synthetic in water | Very good | Good | High-speed machining, grinding |
| Synthetic | Chemical solution, no oil | Excellent | Fair | High-speed aluminum, grinding |
| Neat cutting oil | Undiluted mineral/EP oil | Low | Excellent | Swiss-type, heavy threading |

### Selection Decision Matrix
```
Material         → Aluminum: Synthetic or semi-synthetic (avoid staining)
                 → Steel: Soluble oil or semi-synthetic
                 → Stainless: Heavy-duty soluble or neat oil (EP additives)
                 → Titanium: High-pressure flood or cryogenic
                 → Cast iron: Dry or MQL (avoid rust issues with water)
                 → Inconel: High-pressure flood, extreme EP additives

Operation        → High-speed milling: Synthetic (best cooling)
                 → Threading/tapping: Neat oil (best lubrication)
                 → Deep hole drilling: Through-tool, high pressure
                 → Grinding: Synthetic or semi-synthetic (filtration critical)
                 → EDM: Dielectric oil (specialized)
```

### EP (Extreme Pressure) Additives
- **Sulfur compounds**: Activate at 200-400°C, form FeS films. Best for ferrous.
- **Chlorine compounds**: Activate at 300-600°C. Avoid with titanium (stress corrosion).
- **Phosphorus compounds**: Anti-wear, lower activation temp. Good for aluminum.

## 3. APPLICATION METHODS

### Flood Coolant
- **Flow rate**: 2-20 L/min depending on operation
- **Pressure**: 1-3 bar (standard), 7-70 bar (high pressure)
- **Nozzle positioning**: Aim at cutting zone, 30-45° to tool axis
- **Coverage**: Minimum 2× chip cross-section area in flow

### Flood Flow Rate Guidelines
| Operation | Tool Diameter | Flow Rate (L/min) |
|-----------|--------------|-------------------|
| Milling | 10mm | 3-5 |
| Milling | 25mm | 8-12 |
| Milling | 50mm | 15-25 |
| Turning | General | 5-10 |
| Drilling | 6mm | 2-4 |
| Drilling | 20mm | 6-10 |
| Grinding | Surface | 15-30 |

## 4. THROUGH-SPINDLE COOLANT (TSC)

### Pressure Classifications
| Class | Pressure (bar) | Application |
|-------|---------------|-------------|
| Standard | 7-20 | General drilling, light milling |
| High pressure | 20-40 | Deep holes (>3xD), stainless |
| Ultra-high | 40-70 | Titanium, Inconel, >5xD drilling |
| Super-high | 70-150 | Aerospace alloys, gun drilling |

### TSC Benefits
- 3-5× tool life improvement in deep hole drilling
- Chip evacuation: Critical above 3×D depth
- Temperature reduction: 40-60% vs external flood
- Required for indexable drills above 2×D

### Flow Rate Through Tool
```
Q = C_d × A × √(2 × ΔP / ρ)

Where:
  Q = volumetric flow rate (m³/s)
  C_d = discharge coefficient (0.6-0.8 for coolant holes)
  A = total coolant hole area (m²)
  ΔP = pressure differential (Pa)
  ρ = coolant density (~1000 kg/m³)
```

## 5. MQL - MINIMUM QUANTITY LUBRICATION

### Principles
- Oil consumption: 5-50 mL/hour (vs 20-100 L/min for flood)
- Aerosol delivery: Compressed air (4-6 bar) + micro oil droplets (1-10 μm)
- Lubrication-dominant: Minimal cooling effect, relies on air for chip clearing

### MQL Parameters
| Parameter | Range | Notes |
|-----------|-------|-------|
| Oil flow | 5-50 mL/hr | Start at 20 mL/hr, adjust |
| Air pressure | 4-6 bar | Higher for deeper features |
| Droplet size | 1-10 μm | Smaller = better penetration |
| Oil type | Ester-based | Vegetable esters preferred |
| Nozzle distance | 20-50mm | Closer = better accuracy |

### MQL Best Applications
- Aluminum milling (excellent with diamond-coated tools)
- Cast iron boring/milling (eliminates rust issues)
- Steel milling at moderate speeds
- MDF/composite machining

### MQL Limitations
- Poor for deep hole drilling (>3×D needs TSC)
- Insufficient for titanium/Inconel heavy cuts
- Threading/tapping: borderline (depends on pitch/depth)
- Requires good chip evacuation strategy (air blast)

## 6. CRYOGENIC MACHINING

### Methods
| Method | Medium | Temperature | Application |
|--------|--------|-------------|-------------|
| LN2 spray | Liquid nitrogen | -196°C | Titanium, Inconel roughing |
| CO2 snow | Compressed CO2 | -78°C | Steel/stainless finishing |
| Sub-zero air | Vortex tube | -30°C | Aluminum, mild steel |
| Cryo-MQL | LN2 + MQL oil | -196°C + lubrication | Best of both, aerospace |

### Cryogenic Benefits
- Tool life: 2-5× improvement in Ti-6Al-4V
- Surface integrity: Lower residual stress than flood
- No coolant disposal costs
- Environmentally clean

### Cryogenic Economics
```
Break-even calculation:
  LN2 cost: $0.30-0.50/liter
  Consumption: 0.5-2.0 L/min
  Hourly cost: $9-60/hr for LN2
  
  Compare vs:
  Coolant purchase + disposal: $2-5/hr
  Tool life improvement savings: Variable
  
  Typically viable when tool life gain > 3× OR
  when coolant disposal is expensive (Ti/Inconel chips)
```

## 7. MATERIAL-SPECIFIC STRATEGIES

### Aluminum Alloys
- **Preferred**: Synthetic coolant or MQL
- **Avoid**: High-sulfur oils (staining), chlorinated fluids
- **Key**: High flow for chip flushing, prevent BUE at low speeds
- **pH**: Maintain 8.5-9.5 to prevent staining

### Carbon & Alloy Steels
- **Preferred**: Soluble oil 5-8% concentration
- **EP additives**: Sulfur-based for heavy cuts
- **Key**: Balance cooling and lubrication
- **Corrosion**: Rust inhibitors essential for water-based

### Stainless Steels (300/400 series)
- **Preferred**: Heavy-duty soluble oil with EP additives
- **Key**: Maximum cooling at cutting zone, reduce work hardening
- **Chlorine**: Avoid on austenitic (stress corrosion cracking risk)
- **Pressure**: 20+ bar recommended for drilling

### Titanium Alloys (Ti-6Al-4V)
- **Preferred**: High-pressure flood (40-70 bar) or cryogenic
- **CRITICAL**: Never use chlorinated fluids (titanium stress corrosion)
- **Key**: Maximum coolant to cutting zone, tool temperature is limiting factor
- **Alternative**: Cryo-MQL for best surface integrity

### Nickel Alloys (Inconel 718, Waspaloy)
- **Preferred**: Ultra-high pressure flood (70+ bar)
- **EP**: Maximum EP additive concentration
- **Key**: Heat removal is critical, tool life depends on temperature control
- **Flow**: Coherent jet nozzles improve delivery effectiveness 40%

### Cast Iron
- **Preferred**: Dry machining or MQL
- **Reason**: Graphite in cast iron self-lubricates; water causes rust
- **Exception**: Ductile iron heavy cuts → light flood coolant
- **Dust**: Ensure chip/dust extraction system in dry cutting

## 8. COOLANT MANAGEMENT

### Concentration Control
```
Refractometer reading × factor = actual concentration

Factors by type:
  Soluble oil: 1.0 (direct reading)
  Semi-synthetic: 0.8-1.2 (varies by brand)
  Synthetic: Factory-specific factor required

Target ranges:
  General machining: 5-8%
  Grinding: 3-5%
  Heavy-duty (stainless/ti): 8-12%
  Light duty (aluminum): 4-6%
```

### Monitoring Schedule
| Parameter | Frequency | Target | Action if Out |
|-----------|-----------|--------|---------------|
| Concentration | Daily | ±1% of target | Add concentrate or water |
| pH | Weekly | 8.5-9.5 | Add biocide if dropping |
| Bacteria count | Monthly | <10⁵ CFU/mL | Biocide treatment |
| Tramp oil | Weekly | <2% surface | Skim or coalesce |
| Hardness | Monthly | <300 ppm CaCO3 | DI water additions |

### Coolant Life Extension
- Tramp oil skimming: Adds 2-4 months to sump life
- Aeration: Weekend aeration prevents anaerobic bacteria
- Filtration: 25μm minimum for general, 5μm for grinding
- Sump cleaning: Full dump and clean every 6-12 months

## 9. COST & ENVIRONMENTAL ANALYSIS

### Total Coolant Cost Model
```
C_total = C_purchase + C_disposal + C_maintenance + C_tool_impact + C_health

Typical breakdown (% of total):
  Purchase: 25-35%
  Disposal: 15-25% (higher for hazardous)
  Maintenance: 10-15% (testing, additives, skimmers)
  Tool impact: 20-30% (tool life variation)
  Health/safety: 5-10% (PPE, ventilation, monitoring)
  
Industry average: $2-8 per machine-hour for flood coolant
MQL alternative: $0.50-2.00 per machine-hour
Dry machining: $0 coolant but +30-100% tool cost increase
```

### Environmental Comparison
| Method | Waste Volume | Disposal Class | Carbon Footprint |
|--------|-------------|----------------|-----------------|
| Flood | 500-2000 L/sump | Regulated waste | High |
| MQL | 0.5-2 L/shift | Minimal | Very low |
| Cryogenic | Zero liquid waste | N/A (evaporates) | Medium (LN2 production) |
| Dry | Zero | N/A | Lowest |

### Decision Framework
```
IF deep_hole_drilling AND depth > 3×D → TSC flood required
IF titanium OR inconel → High-pressure flood or cryogenic
IF aluminum AND high_speed → Synthetic flood or MQL
IF cast_iron → MQL or dry
IF grinding → Synthetic flood, fine filtration
IF threading AND >M10 → Neat cutting oil or heavy EP
IF cost_priority → MQL (lowest operating cost)
IF surface_integrity_critical → Cryogenic + MQL
```

*Single-purpose skill: Cutting fluid selection and optimization for CNC machining operations.*
