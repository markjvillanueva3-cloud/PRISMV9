---
name: prism-expert-cad-expert
description: |
  CAD feature recognition expert. Geometry analysis.
---

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
