---
name: prism-expert-quality-control
description: |
  SPC and inspection expert. Quality metrics and control charts.
---

```javascript
const inspectionMethods = {
  'CMM': { accuracy: '0.001mm', type: 'Contact/Non-contact' },
  'optical': { accuracy: '0.005mm', type: 'Vision system' },
  'profilometer': { accuracy: '0.0001mm', type: 'Surface roughness' },
  'gauge': { accuracy: 'Per gauge', type: 'Go/No-go' },
  'caliper': { accuracy: '0.01mm', type: 'Manual measurement' },
  'micrometer': { accuracy: '0.001mm', type: 'Manual precision' }
};
```

### SPC Charts
```javascript
const spcCharts = [
  'X-bar R',     // Variable data, subgroups
  'X-bar S',     // Variable data, larger subgroups
  'I-MR',        // Individual measurements
  'p-chart',     // Proportion defective
  'c-chart'      // Count of defects
];
```

### ISO Standards
```javascript
const isoStandards = [
  'ISO 9001',    // Quality management
  'ISO 2768',    // General tolerances
  'ISO 1302',    // Surface texture
  'ASME Y14.5'   // GD&T
];
```

## Analysis Patterns (JavaScript)

### Cp and Cpk Calculation
```javascript
function calculateCapability(measurements, USL, LSL) {
    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const stdDev = Math.sqrt(
        measurements.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (measurements.length - 1)
    );
    
    const Cp = (USL - LSL) / (6 * stdDev);
    const Cpk = Math.min(
        (USL - mean) / (3 * stdDev),
        (mean - LSL) / (3 * stdDev)
    );
    
    return { Cp, Cpk, mean, stdDev };
}
```

### Inspection Plan Creation
```javascript
function createInspectionPlan(features, criticality) {
    return features.map(f => ({
        feature: f.name,
        method: f.tolerance < 0.01 ? 'CMM' : 'caliper',
        frequency: criticality === 'high' ? '100%' : 'Sample',
        acceptance: `${f.nominal} ± ${f.tolerance}`
    }));
}
```

### FAI Report Generation
```javascript
function generateFAI(part, measurements) {
    return {
        partNumber: part.id,
        date: new Date().toISOString(),
        inspector: 'PRISM System',
        results: measurements.map(m => ({
            characteristic: m.feature,
            nominal: m.nominal,
            actual: m.measured,
            tolerance: m.tolerance,
            status: Math.abs(m.measured - m.nominal) <= m.tolerance ? 'PASS' : 'FAIL'
        }))
    };
}
```

## Quick Consultation

### When to Consult
- Setting up SPC for new processes
- Creating inspection plans
- Generating FAI documentation
- Analyzing process capability
- Selecting measurement methods

### Key Questions
1. Is this process capable for the tolerance?
2. What inspection method is appropriate?
3. How often should we inspect?
4. What does the SPC chart indicate?

---

## MIT Course References
- **2.810** - Manufacturing Processes & Systems
- **2.830** - Control of Manufacturing Processes
- **6.041** - Probabilistic Systems Analysis
- **15.063** - Communicating with Data
