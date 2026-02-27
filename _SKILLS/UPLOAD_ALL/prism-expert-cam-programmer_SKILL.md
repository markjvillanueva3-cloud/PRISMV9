---
name: prism-expert-cam-programmer
description: |
  CAM programming expert. Toolpath strategy and optimization.
---

| Strategy | Use Case | Stepover |
|----------|----------|----------|
| `adaptive` | HSM, aluminum, deep pockets | 40% tool diameter |
| `pocketing` | Standard pocket clearing | 40% tool diameter |
| `facing` | Face milling, stock cleanup | 60-70% tool diameter |
| `3d_roughing` | 3D surface roughing | 40% tool diameter |

### Finishing Strategies
| Strategy | Use Case | Stepover |
|----------|----------|----------|
| `contour` | Walls, profiles | 10% tool diameter |
| `pencil` | Corner cleanup | 5-10% tool diameter |
| `parallel` | Flat areas | 10% tool diameter |
| `scallop` | 3D surfaces | Based on scallop height |
| `spiral` | Large flat areas | 10% tool diameter |

### Drilling Strategies
| Strategy | Use Case |
|----------|----------|
| `drill` | Standard holes, shallow |
| `peck` | Deep holes >3xD |
| `bore` | Precision holes |
| `ream` | Finish holes, tight tolerance |
| `tap` | Threaded holes |

## Analysis Patterns

### Operation Sequence Planning
```javascript
function planOperations(features, material) {
  const plan = [];
  const isAluminum = material?.toLowerCase().includes('aluminum');
  
  // 1. Facing first
  plan.push({ op: 'facing', strategy: 'face_milling', priority: 1 });
  
  // 2. Roughing (adaptive for aluminum)
  const roughStrategy = isAluminum ? 'adaptive_clearing' : 'pocket_clearing';
  plan.push({ op: 'roughing', strategy: roughStrategy, priority: 2 });
  
  // 3. Drilling (if holes present)
  const holes = features.filter(f => f.type === 'hole');
  if (holes.length > 0) {
    plan.push({ op: 'drilling', strategy: 'peck_drill', priority: 3, count: holes.length });
  }
  
  // 4. Semi-finish
  plan.push({ op: 'semi_finish', strategy: 'parallel', priority: 4 });
  
  // 5. Finishing
  plan.push({ op: 'finishing', strategy: 'contour', priority: 5 });
  
  return plan;
}
```

### Tool Selection Logic
```javascript
function selectTool(feature) {
  if (feature.type === 'hole') {
    return { type: 'drill', diameter: feature.diameter, material: 'carbide', coating: 'TiAlN' };
  }
  if (feature.type === 'pocket') {
    return { type: 'end_mill', diameter: Math.min(feature.cornerRadius * 2, 12), flutes: 3, material: 'carbide', coating: 'TiAlN' };
  }
  return { type: 'end_mill', diameter: 10, flutes: 4 };
}
```

### Cutting Parameter Calculation
```javascript
const materialFactors = {
  'aluminum': { sfm: 800, fpt: 0.1, doc: 0.5 },
  'steel': { sfm: 300, fpt: 0.05, doc: 0.3 },
  'stainless': { sfm: 150, fpt: 0.03, doc: 0.2 },
  'titanium': { sfm: 100, fpt: 0.02, doc: 0.15 }
};

function calculateParams(material, tool) {
  const factors = materialFactors[material.toLowerCase()] || materialFactors['steel'];
  const rpm = (factors.sfm * 12) / (Math.PI * tool.diameter / 25.4);
  const feedrate = rpm * factors.fpt * (tool.flutes || 4);
  return { rpm: Math.round(rpm), feedrate: Math.round(feedrate), depthOfCut: tool.diameter * factors.doc, stepover: tool.diameter * 0.4 };
}
```

## Quick Consultation

When making CAM decisions, ask:
1. What material? → Determines strategy and parameters
2. What features? → Determines operation sequence
3. What tolerance? → Determines finishing approach
4. What tools available? → Constrains options
5. What machine? → Determines capabilities

---

**Version:** Created 2026-01-23 | Source: PRISM v8.89.002 Lines 589868-589996
