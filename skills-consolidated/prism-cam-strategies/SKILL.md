---
name: prism-cam-strategies
description: |
  Comprehensive CAM strategy reference for PRISM Manufacturing Intelligence.
  2D/3D roughing, finishing, and specialized strategies with recommendations.
  
  Modules Covered:
  - PRISM_COMPREHENSIVE_CAM_STRATEGIES
  - PRISM_3D_TOOLPATH_STRATEGY_ENGINE
  - PRISM_ADAPTIVE_HSM_ENGINE
  - PRISM_HYBRID_TOOLPATH_SYNTHESIZER
  
  Gateway Routes: cam.strategy.*, cam.recommend.*
  Cross-CAM: HyperMill, Fusion 360, Mastercam, SolidCAM equivalents
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "cam", "strategies", "comprehensive", "strategy", "manufacturing", "intelligence", "roughing"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-cam-strategies")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-cam-strategies") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What cam parameters for 316 stainless?"
→ Load skill: skill_content("prism-cam-strategies") → Extract relevant cam data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot strategies issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM CAM STRATEGIES
## 2D/3D Roughing, Finishing, and Strategy Selection
# 1. 2D STRATEGIES

## 1.1 Facing

**Purpose:** Remove material from top surface to establish datum.

```javascript
const FACING = {
  name: "Facing",
  patterns: ["zigzag", "one_way", "spiral", "bidirectional"],
  parameters: {
    stepover: { min: 0.4, typical: 0.6, max: 0.8, unit: "×D" },
    direction: ["climb", "conventional"],
    stockToLeave: { min: 0, typical: 0, max: 0.5, unit: "mm" }
  },
  recommendations: {
    aluminum: { stepover: 0.70, speed: "high" },
    steel: { stepover: 0.60, speed: "medium" },
    stainless: { stepover: 0.50, speed: "low" }
  }
};
```

## 1.2 2D Pocketing

**Purpose:** Clear material from enclosed boundary.

| Strategy | Efficiency | Surface Quality | Best For |
|----------|------------|-----------------|----------|
| Zigzag | 85% | 60% | Fast roughing |
| Spiral In | 75% | 80% | Better finish |
| Spiral Out | 78% | 85% | Center start |
| Trochoidal | 65% | 90% | Hard materials |
| Adaptive | 95% | 85% | Maximum MRR |

```javascript
const POCKETING_2D = {
  parameters: {
    stepover: { min: 0.30, typical: 0.50, max: 0.70, unit: "×D" },
    stepdown: { min: 0.50, typical: 1.00, max: 2.00, unit: "×D" }
  },
  entryMethods: ["plunge", "ramp", "helix", "predrill"],
  rampAngle: { min: 1, typical: 3, max: 10, unit: "degrees" },
  helixDiameter: { min: 0.5, typical: 1.0, max: 2.0, unit: "×D" }
};
```

## 1.3 2D Contouring

**Purpose:** Follow profile/contour path for walls.

```javascript
const CONTOURING_2D = {
  compensation: ["computer", "control", "off"],
  side: ["left", "right", "on"],
  direction: ["climb", "conventional"],
  leadInOut: {
    arc: { radius: { min: 0.25, typical: 0.5, max: 1.0, unit: "×D" } },
    linear: { length: { min: 1, typical: 3, max: 10, unit: "mm" } },
    tangent: { angle: 45, unit: "degrees" }
  },
  springPasses: { min: 0, typical: 1, max: 3 }
};
```
# 2. 3D ROUGHING STRATEGIES

## 2.1 Adaptive Clearing (HSM)

**THE MOST EFFICIENT ROUGHING STRATEGY FOR MOST APPLICATIONS**

```javascript
const ADAPTIVE_CLEARING = {
  name: "Adaptive Clearing / High Speed Machining",
  description: "Constant tool engagement with full depth cuts",
  
  // CAM equivalents
  hyperMill: "Optimized Roughing",
  fusion360: "Adaptive Clearing",
  mastercam: "Dynamic Mill",
  solidcam: "iMachining 3D",
  solidworks: "VoluMill",
  
  parameters: {
    optimalLoad: { min: 5, typical: 10, max: 25, unit: "%" },  // % of diameter
    maxStepdown: { min: 1.0, typical: 2.0, max: 4.0, unit: "×D" },
    flatAreaDetection: true,
    restMachining: true,
    chipThinningCompensation: true
  },
  
  advantages: [
    "Constant chip load maintains tool life",
    "Full depth of cut increases MRR by 200-400%",
    "Reduced vibration and chatter",
    "Lower heat generation",
    "Extends tool life 2-5×"
  ],
  
  optimalLoadByMaterial: {
    aluminum: { load: 15, stepdown: "3×D" },
    steel: { load: 10, stepdown: "2×D" },
    stainless: { load: 8, stepdown: "1.5×D" },
    titanium: { load: 6, stepdown: "1×D" },
    inconel: { load: 5, stepdown: "0.75×D" }
  }
};
```

## 2.2 Z-Level Roughing

**Purpose:** Horizontal slicing with constant Z stepdowns.

```javascript
const ZLEVEL_ROUGHING = {
  name: "Z-Level Roughing",
  hyperMill: "Z-Level Roughing",
  
  parameters: {
    stepdown: { min: 0.5, typical: 1.5, max: 3.0, unit: "mm" },
    stepover: { min: 40, typical: 60, max: 75, unit: "%" },
    direction: ["climb", "conventional", "mixed"]
  },
  
  bestFor: [
    "Steep walls (>45°)",
    "Vertical features",
    "Parts with ledges"
  ],
  
  limitations: [
    "Leaves stair-steps on shallow areas",
    "Not ideal for flat bottoms",
    "Higher tool engagement variation"
  ]
};
```

## 2.3 Parallel/Raster Roughing

```javascript
const PARALLEL_ROUGHING = {
  name: "Parallel/Raster Roughing",
  
  parameters: {
    angle: { min: 0, typical: 45, max: 90, unit: "degrees" },
    stepover: { min: 50, typical: 65, max: 75, unit: "%" }
  },
  
  bestFor: [
    "Simple prismatic parts",
    "Large flat areas",
    "When consistent cut direction needed"
  ]
};
```

## 2.4 Plunge Roughing

**Purpose:** Vertical drilling motion for difficult situations.

```javascript
const PLUNGE_ROUGHING = {
  name: "Plunge Roughing",
  
  parameters: {
    stepover: { min: 50, typical: 70, max: 85, unit: "%" },
    retractHeight: { typical: 2, unit: "mm" }
  },
  
  bestFor: [
    "Deep pockets (>4×D)",
    "Hard materials (>45 HRC)",
    "Long tool overhang (>5×D)",
    "Weak setups",
    "Thin walls"
  ],
  
  advantages: [
    "Forces directed into spindle (no deflection)",
    "Good for unstable setups",
    "Works with any length-to-diameter ratio"
  ]
};
```
# 3. 3D FINISHING STRATEGIES

## 3.1 Waterline (Z-Level Finishing)

```javascript
const WATERLINE = {
  name: "Waterline / Z-Level Finishing",
  
  parameters: {
    stepdown: { calculate: "From cusp height and tool radius" },
    cuspHeight: { min: 0.002, typical: 0.01, max: 0.05, unit: "mm" }
  },
  
  // Cusp height calculation: h = R - √(R² - (s/2)²)
  // Where R = tool radius, s = stepdown
  
  bestFor: [
    "Steep walls (>30°)",
    "Vertical surfaces",
    "Undercuts with ball mill"
  ],
  
  combinedWith: "Scallop/Parallel for shallow areas"
};
```

## 3.2 Parallel Finishing

```javascript
const PARALLEL_FINISHING = {
  name: "Parallel / Raster Finishing",
  
  parameters: {
    stepover: { calculate: "From cusp height and tool radius" },
    angle: { typical: 45, alternatives: [0, 90], unit: "degrees" }
  },
  
  bestFor: [
    "Shallow areas (<30°)",
    "Near-flat surfaces",
    "Large open areas"
  ],
  
  // Stepover for target cusp: s = 2√(2Rh - h²)
  cuspHeightFormula: "h = R - √(R² - (s/2)²)"
};
```

## 3.3 Scallop Finishing

```javascript
const SCALLOP = {
  name: "Scallop / Constant Cusp",
  hyperMill: "3D Contour Machining",
  
  description: "Constant cusp height regardless of surface angle",
  
  parameters: {
    cuspHeight: { min: 0.002, typical: 0.01, max: 0.03, unit: "mm" },
    stepover: "Varies with surface angle"
  },
  
  bestFor: [
    "Complex freeform surfaces",
    "Molds and dies",
    "Consistent surface finish everywhere"
  ],
  
  advantages: [
    "Consistent finish quality",
    "Optimized toolpath length",
    "No stairstepping"
  ]
};
```

## 3.4 Pencil Tracing

```javascript
const PENCIL = {
  name: "Pencil Tracing",
  
  description: "Traces internal corners and fillets",
  
  parameters: {
    toolDiameter: "Smaller than fillet radius",
    passes: { min: 1, typical: 2, max: 3 }
  },
  
  bestFor: [
    "Internal corners",
    "Fillet cleanup",
    "Rest machining corners"
  ]
};
```

## 3.5 Spiral Finishing

```javascript
const SPIRAL_FINISHING = {
  name: "Spiral / Morphed Spiral",
  
  description: "Continuous spiral from center outward or vice versa",
  
  bestFor: [
    "Hemispherical surfaces",
    "Dome shapes",
    "Minimal retracts needed"
  ],
  
  advantages: [
    "No lift-off marks",
    "Continuous engagement",
    "Excellent for rounded surfaces"
  ]
};
```
# 4. 5-AXIS STRATEGIES

## 4.1 Swarf Cutting

```javascript
const SWARF = {
  name: "Swarf / Flank Milling",
  
  description: "Side of tool follows ruled surface",
  
  parameters: {
    tiltAngle: "Follows surface",
    leadLag: { typical: 0, unit: "degrees" }
  },
  
  bestFor: [
    "Ruled surfaces (turbine blades)",
    "Tall thin walls",
    "Impeller channels"
  ],
  
  requirements: [
    "5-axis capable machine",
    "Ruled surface geometry",
    "Long flute length tool"
  ]
};
```

## 4.2 Multi-Axis Contouring

```javascript
const MULTIAXIS_CONTOUR = {
  name: "5-Axis Contouring",
  hyperMill: "5-Axis Shape Offset",
  
  parameters: {
    leadAngle: { min: -15, typical: 0, max: 15, unit: "degrees" },
    tiltAngle: { min: 0, typical: 3, max: 15, unit: "degrees" },
    toolAxisControl: ["to surface", "fixed", "interpolated"]
  },
  
  bestFor: [
    "Complex surfaces with undercuts",
    "Aerospace components",
    "Medical implants"
  ]
};
```
# 5. STRATEGY SELECTION GUIDE

## 5.1 Selection by Operation Type

| Operation | Primary Strategy | Alternative |
|-----------|------------------|-------------|
| **Rough - Pocket** | Adaptive Clearing | Plunge (deep) |
| **Rough - 3D** | Adaptive 3D | Z-Level |
| **Rough - Hard Material** | Plunge or Adaptive | Trochoidal |
| **Finish - Walls** | Waterline | Z-Level |
| **Finish - Floors** | Parallel | Scallop |
| **Finish - Freeform** | Scallop | Parallel + Waterline |
| **Finish - Corners** | Pencil | Rest finishing |
| **5-Axis Blades** | Swarf | Multi-axis contour |

## 5.2 Selection by Material

```javascript
const STRATEGY_BY_MATERIAL = {
  aluminum: {
    roughing: "adaptive",
    finishing: "parallel",
    notes: "High speeds, high MRR possible"
  },
  steel: {
    roughing: "adaptive",
    finishing: "waterline + parallel",
    notes: "Moderate speeds, watch heat"
  },
  stainless: {
    roughing: "adaptive (lower engagement)",
    finishing: "scallop",
    notes: "Work hardening - keep tool moving"
  },
  titanium: {
    roughing: "adaptive or plunge",
    finishing: "scallop",
    notes: "Low speed, high feed, manage heat"
  },
  inconel: {
    roughing: "plunge or light adaptive",
    finishing: "scallop with small stepover",
    notes: "Very low speed, ceramic or CBN for finishing"
  },
  hardened: {
    roughing: "plunge or light radial",
    finishing: "scallop with ball mill",
    notes: "Hard milling requires rigid setup"
  }
};
```

## 5.3 Selection by Geometry

```javascript
const STRATEGY_BY_GEOMETRY = {
  pocket_shallow: "adaptive 2D",
  pocket_deep: "adaptive 3D or plunge",
  core_vertical: "z-level roughing",
  core_complex: "adaptive 3D",
  
  finish_steep: "waterline",
  finish_shallow: "parallel",
  finish_mixed: "scallop (constant cusp)",
  finish_fillet: "pencil trace",
  
  thin_wall: "light cuts, alternating sides",
  thin_floor: "spiral, center out"
};
```
# 6. CAM SOFTWARE EQUIVALENTS

## 6.1 Strategy Name Mapping

| Generic | HyperMill | Fusion 360 | Mastercam | SolidCAM |
|---------|-----------|------------|-----------|----------|
| Adaptive | Optimized Roughing | Adaptive | Dynamic Mill | iMachining |
| Z-Level | Z-Level | Parallel | Waterline | HSM |
| Waterline | Z-Level Finishing | Contour | Waterline | Constant Z |
| Parallel | 3D Equidistant | Parallel | Surface Finish | 3D HSR |
| Scallop | 3D Contour | Scallop | Scallop | Constant Cusp |
| Pencil | Rest Machining | Pencil | Pencil | Corner Rest |
| Spiral | 3D Spiral | Spiral | Radial | Spiral |
| Swarf | 5X Shape Offset | Swarf | Swarf | Side Tilt |

## 6.2 Gateway Routes

| Route | Function | Description |
|-------|----------|-------------|
| `cam.strategy.get` | getStrategy() | Get strategy details |
| `cam.strategy.recommend` | recommendStrategy() | Recommend based on inputs |
| `cam.strategy.parameters` | getParameters() | Get strategy parameters |
| `cam.strategy.compare` | compareStrategies() | Compare two strategies |
| `cam.strategy.byMaterial` | strategyByMaterial() | Material-based recommendation |
| `cam.strategy.byGeometry` | strategyByGeometry() | Geometry-based recommendation |
## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| CAM-1001 | Invalid strategy name | Use getStrategies() for list |
| CAM-1002 | Incompatible parameters | Check min/max ranges |
| CAM-1003 | Stepover too aggressive | Reduce to recommended value |
| CAM-1004 | Stepdown exceeds tool | Limit to 3×D maximum |
| CAM-1005 | Entry method invalid | Use ramp/helix for pockets |
**END OF PRISM CAM STRATEGIES SKILL**
**Version 1.0 | Level 4 Reference | ~500 Lines**
**Sources: HyperMill, Fusion 360, Mastercam, SolidCAM best practices**
