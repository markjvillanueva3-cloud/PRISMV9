const PRISM_ENHANCED_GDT_ENGINE = {
  version: '3.0.0',
  standard: 'ASME Y14.5-2018',

  // COMPLETE GD&T SYMBOL DEFINITIONS

  symbols: {
    // Form Controls (Individual features, no datum reference)
    form: {
      flatness: { symbol: '⏥', unicode: 'U+23E5', category: 'form', requiresDatum: false,
        description: 'All surface points within tolerance zone between two parallel planes',
        application: 'Mating surfaces, sealing surfaces, reference planes',
        measurement: 'Surface plate with indicator, CMM plane fit' },
      straightness: { symbol: '⏤', unicode: 'U+23E4', category: 'form', requiresDatum: false,
        description: 'Line elements within tolerance zone between two parallel lines/cylinder',
        application: 'Shafts, edges, centerlines',
        measurement: 'V-blocks with indicator, CMM line fit' },
      circularity: { symbol: '○', unicode: 'U+25CB', category: 'form', requiresDatum: false,
        description: 'All points equidistant from center within radial tolerance',
        application: 'Bearing journals, seals, O-ring grooves',
        measurement: 'Roundness tester, CMM circle fit' },
      cylindricity: { symbol: '⌭', unicode: 'U+232D', category: 'form', requiresDatum: false,
        description: 'All surface points within two concentric cylinders',
        application: 'Precision bores, hydraulic cylinders',
        measurement: 'CMM cylinder fit, roundness at multiple heights' }
    },
    // Orientation Controls (Require datum reference)
    orientation: {
      perpendicularity: { symbol: '⊥', unicode: 'U+22A5', category: 'orientation', requiresDatum: true,
        description: 'Feature at 90° to datum within tolerance zone',
        application: 'Mounting surfaces, holes perpendicular to face',
        measurement: 'Height gauge from datum, CMM' },
      parallelism: { symbol: '∥', unicode: 'U+2225', category: 'orientation', requiresDatum: true,
        description: 'Feature parallel to datum within tolerance zone',
        application: 'Bearing surfaces, way covers, parallel shafts',
        measurement: 'Indicator sweep parallel to datum' },
      angularity: { symbol: '∠', unicode: 'U+2220', category: 'orientation', requiresDatum: true,
        description: 'Feature at specified angle to datum within tolerance zone',
        application: 'Tapers, chamfers, angled holes',
        measurement: 'Sine bar setup, CMM angular measurement' }
    },
    // Location Controls
    location: {
      position: { symbol: '⌖', unicode: 'U+2316', category: 'location', requiresDatum: true,
        description: 'True position within cylindrical/spherical tolerance zone',
        application: 'Hole patterns, pin locations, fastener clearance',
        measurement: 'CMM, functional gauge',
        formula: 'Position = 2 * sqrt(dx² + dy²)' },
      concentricity: { symbol: '◎', unicode: 'U+25CE', category: 'location', requiresDatum: true,
        description: 'All median points within cylindrical tolerance zone',
        application: 'Rotating parts requiring balance',
        measurement: 'CMM median point analysis' },
      symmetry: { symbol: '⌯', unicode: 'U+232F', category: 'location', requiresDatum: true,
        description: 'Median points equidistant from datum center plane',
        application: 'Keyways, slots requiring centering',
        measurement: 'Indicator from both sides' }
    },
    // Runout Controls
    runout: {
      circularRunout: { symbol: '↗', unicode: 'U+2197', category: 'runout', requiresDatum: true,
        description: 'FIM at any single cross-section when rotated',
        application: 'Shaft surfaces, rotating seals',
        measurement: 'Indicator while rotating on datums' },
      totalRunout: { symbol: '↗↗', unicode: 'U+2197U+2197', category: 'runout', requiresDatum: true,
        description: 'FIM over entire surface when rotated',
        application: 'Bearing journals, full surface control',
        measurement: 'Indicator traverse while rotating' }
    },
    // Profile Controls
    profile: {
      profileLine: { symbol: '⌒', unicode: 'U+2312', category: 'profile', requiresDatum: 'optional',
        description: '2D profile elements within bilateral tolerance zone',
        application: 'Cam profiles, 2D contours',
        measurement: 'CMM 2D scan, optical comparator' },
      profileSurface: { symbol: '⌓', unicode: 'U+2313', category: 'profile', requiresDatum: 'optional',
        description: '3D surface within bilateral tolerance zone',
        application: 'Freeform surfaces, airfoils, mold cavities',
        measurement: 'CMM 3D surface scan' }
    }
  },
  // DATUM FEATURE SYMBOLS

  datumSymbols: {
    primary: { priority: 1, dof: 3, description: 'Constrains 3 degrees of freedom' },
    secondary: { priority: 2, dof: 2, description: 'Constrains 2 additional DOF' },
    tertiary: { priority: 3, dof: 1, description: 'Constrains final DOF' }
  },
  // MATERIAL CONDITION MODIFIERS

  modifiers: {
    MMC: { symbol: 'Ⓜ', unicode: 'U+24C2', name: 'Maximum Material Condition',
      description: 'Tolerance applies at maximum material (shaft largest, hole smallest)',
      benefit: 'Bonus tolerance as feature departs from MMC',
      application: 'Clearance holes, assembly fits' },
    LMC: { symbol: 'Ⓛ', unicode: 'U+24C1', name: 'Least Material Condition',
      description: 'Tolerance applies at minimum material (shaft smallest, hole largest)',
      benefit: 'Ensures minimum wall thickness maintained',
      application: 'Thin walls, minimum edge distances' },
    RFS: { symbol: 'Ⓢ', unicode: 'U+24C8', name: 'Regardless of Feature Size',
      description: 'Tolerance applies regardless of actual size',
      note: 'Default condition in Y14.5-2018' },
    projected: { symbol: 'Ⓟ', unicode: 'U+24C5', name: 'Projected Tolerance Zone',
      description: 'Tolerance zone projects beyond feature',
      application: 'Press-fit pins, threaded holes for studs' },
    free: { symbol: 'Ⓕ', unicode: 'U+24BB', name: 'Free State',
      description: 'Measurement in unconstrained condition',
      application: 'Flexible parts, sheet metal' },
    tangent: { symbol: 'Ⓣ', unicode: 'U+24C9', name: 'Tangent Plane',
      description: 'Tolerance to tangent plane of surface',
      application: 'Fastener seating surfaces' },
    statistical: { symbol: 'ST', name: 'Statistical Tolerance',
      description: 'Tolerance can be exceeded if statistically validated' },
    continuous: { symbol: 'CF', name: 'Continuous Feature',
      description: 'Multiple features treated as single feature' },
    unequal: { symbol: 'UZ', name: 'Unequal Bilateral',
      description: 'Unequal distribution of profile tolerance' }
  },
  // FEATURE CONTROL FRAME PARSER

  parseFeatureControlFrame(fcfString) {
    // Parse: ⌖|⌀0.25 Ⓜ|A|B|C
    const parts = fcfString.split('|').map(p => p.trim());

    return {
      symbol: parts[0],
      tolerance: this._parseTolerance(parts[1]),
      primaryDatum: parts[2] || null,
      secondaryDatum: parts[3] || null,
      tertiaryDatum: parts[4] || null,
      modifiers: this._extractModifiers(parts[1])
    };
  },
  _parseTolerance(tolString) {
    const diameter = tolString.includes('⌀');
    const value = parseFloat(tolString.replace(/[^0-9.]/g, ''));
    return { value, diameter, original: tolString };
  },
  _extractModifiers(tolString) {
    const mods = [];
    if (tolString.includes('Ⓜ')) mods.push('MMC');
    if (tolString.includes('Ⓛ')) mods.push('LMC');
    if (tolString.includes('Ⓟ')) mods.push('projected');
    return mods;
  },
  // TOLERANCE ZONE CALCULATIONS

  calculateBonusTolerance(nominalSize, actualSize, condition, baseTolerance) {
    if (condition === 'MMC') {
      // Bonus = |Actual - MMC|
      const bonus = Math.abs(actualSize - nominalSize);
      return baseTolerance + bonus;
    } else if (condition === 'LMC') {
      const bonus = Math.abs(nominalSize - actualSize);
      return baseTolerance + bonus;
    }
    return baseTolerance; // RFS - no bonus
  },
  calculatePositionTolerance(dx, dy, dz = 0) {
    // True position deviation = 2 * sqrt(dx² + dy² + dz²)
    return 2 * Math.sqrt(dx * dx + dy * dy + dz * dz);
  },
  // GD&T INTERPRETATION FOR CAM

  interpretForCAM(gdtSpec) {
    const recommendations = [];

    // Map GD&T to machining requirements
    if (gdtSpec.symbol === '⌖') { // Position
      recommendations.push({
        operation: 'drilling',
        requirement: 'Use precision boring or reaming for tight position tolerance',
        tolerance: gdtSpec.tolerance.value,
        strategy: gdtSpec.tolerance.value < 0.05 ? 'PRECISION_BORE' :
                  gdtSpec.tolerance.value < 0.15 ? 'REAM' : 'DRILL'
      });
    }
    if (gdtSpec.symbol === '⏥') { // Flatness
      recommendations.push({
        operation: 'facing',
        requirement: 'Light finishing passes with fly cutter or face mill',
        tolerance: gdtSpec.tolerance.value,
        strategy: gdtSpec.tolerance.value < 0.025 ? 'GRINDING' :
                  gdtSpec.tolerance.value < 0.05 ? 'PRECISION_FACE' : 'STANDARD_FACE'
      });
    }
    if (gdtSpec.symbol === '○') { // Circularity
      recommendations.push({
        operation: 'turning/boring',
        requirement: 'Single setup, minimal tool pressure',
        tolerance: gdtSpec.tolerance.value,
        strategy: gdtSpec.tolerance.value < 0.01 ? 'PRECISION_TURN' : 'STANDARD_TURN'
      });
    }
    return recommendations;
  }
}