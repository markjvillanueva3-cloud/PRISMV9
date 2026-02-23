---
name: prism-expert-cad-expert
description: |
  AI Domain Expert for CAD Modeling & Design. Provides feature recognition,
  file format recommendations, DFM analysis, and modeling strategies.
  Covers STEP, IGES, STL formats and feature-based/direct/hybrid modeling.

  MIT Foundation: 2.008 (Design & Manufacturing II), 6.837 (Computer Graphics)
---

# PRISM Expert: CAD Expert
## AI Domain Expert Skill for CAD Modeling & Design

---

## Expert Profile

| Attribute | Value |
|-----------|-------|
| **ID** | `cad_expert` |
| **Name** | CAD Expert |
| **Domain** | CAD Modeling & Design |
| **Source** | PRISM_PHASE8_EXPERTS.CADExpert |
| **Lines** | 589777-589866 |
| **Confidence** | 1.0 |

---

## Knowledge Base

### Feature Types
```javascript
const featureTypes = [
  'hole',      // Drilled, bored, reamed
  'pocket',    // Open or closed
  'slot',      // Through or blind
  'boss',      // Raised feature
  'fillet',    // Internal radius
  'chamfer',   // Edge break
  'thread',    // Internal or external
  'pattern'    // Linear or circular
];
```

### Supported File Formats
```javascript
const fileFormats = {
  'STEP': { extension: '.stp/.step', interop: 'Excellent' },
  'IGES': { extension: '.igs/.iges', interop: 'Good' },
  'STL':  { extension: '.stl', interop: 'Mesh only' },
  'DXF':  { extension: '.dxf', interop: '2D/3D' },
  'DWG':  { extension: '.dwg', interop: 'AutoCAD native' },
  'SLDPRT': { extension: '.sldprt', interop: 'SolidWorks' },
  'X_T':  { extension: '.x_t', interop: 'Parasolid' },
  'SAT':  { extension: '.sat', interop: 'ACIS' }
};
```

### Modeling Strategies
```javascript
const strategies = [
  'feature_based',     // Parametric features
  'direct_modeling',   // Push-pull operations
  'hybrid',            // Feature + direct
  'surface_modeling'   // Complex forms
];
```

---

## Decision Rules

| Rule | Condition | Recommendation |
|------|-----------|----------------|
| Format Selection | Cross-platform exchange | Use STEP AP214 |
| Feature Recognition | Hole depth/dia > 10:1 | Flag as deep hole |
| DFM Check | Corner radius < 3mm | Warn about tool access |
| Complexity | Feature count > 50 | Suggest simplification |

---

## Analysis Patterns (JavaScript)

### Feature Recognition
```javascript
function recognizeFeatures(geometry) {
    const features = [];
    // Analyze geometry for machinable features
    if (geometry.hasCircularCuts) features.push('hole');
    if (geometry.hasPockets) features.push('pocket');
    if (geometry.hasSlots) features.push('slot');
    return features;
}
```

### Format Recommendation
```javascript
function recommendFormat(requirements) {
    if (requirements.meshOnly) return 'STL';
    if (requirements.parametric) return 'Native CAD';
    if (requirements.interoperability) return 'STEP';
    return 'STEP'; // Default for manufacturing
}
```

### DFM Analysis
```javascript
function analyzeDFM(part) {
    const issues = [];
    // Check for manufacturability issues
    if (part.minCornerRadius < 3) {
        issues.push('Small corner radius - may need EDM');
    }
    if (part.maxDepthRatio > 10) {
        issues.push('Deep feature - special tooling needed');
    }
    return issues;
}
```

---

## Integration Points

### PRISM Modules Using This Expert
1. **PRISM_FEATURE_RECOGNITION** - Automatic feature detection
2. **PRISM_DFM_ANALYZER** - Design for Manufacturing checks
3. **PRISM_CAD_IMPORTER** - File format handling
4. **PRISM_TOOLPATH_GENERATOR** - Feature-based toolpaths
5. **PRISM_QUOTING_ENGINE** - Complexity assessment

### Input Requirements
```javascript
{
  problem: {
    partGeometry: { /* CAD data */ },
    targetFormat: 'STEP' | 'STL' | etc,
    dfmRequirements: { tolerances, materials }
  }
}
```

### Output Format
```javascript
{
  expert: 'CAD Expert',
  domain: 'CAD Modeling & Design',
  features: ['hole', 'pocket', 'slot'],
  formatRecommendation: { format: 'STEP', reason: '...' },
  dfmIssues: [...],
  confidence: 0.92
}
```

---

## Quick Consultation

### When to Consult
- Importing customer CAD files
- Feature recognition for CAM
- DFM review before quoting
- File format conversion
- Complex geometry analysis

### Key Questions
1. What features can be automatically recognized?
2. Which file format preserves the most data?
3. Are there any DFM issues with this design?
4. What modeling strategy suits this part best?

---

## MIT Course References
- **2.008** - Design & Manufacturing II
- **2.007** - Design & Manufacturing I
- **6.837** - Computer Graphics
- **2.739** - Product Design & Development
