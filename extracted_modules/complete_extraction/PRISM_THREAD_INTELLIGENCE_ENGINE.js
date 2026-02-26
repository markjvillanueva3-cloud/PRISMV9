const PRISM_THREAD_INTELLIGENCE_ENGINE = {
  version: '3.0.0',

  // THREAD STANDARDS DATABASE

  standards: {
    // Unified National (ANSI/ASME B1.1)
    UNC: {
      name: 'Unified National Coarse',
      standard: 'ANSI B1.1',
      threadAngle: 60,
      sizes: {
        '#0': { major: 0.0600, tpi: 80, tapDrill: 0.0469 },
        '#1': { major: 0.0730, tpi: 64, tapDrill: 0.0595 },
        '#2': { major: 0.0860, tpi: 56, tapDrill: 0.0700 },
        '#3': { major: 0.0990, tpi: 48, tapDrill: 0.0785 },
        '#4': { major: 0.1120, tpi: 40, tapDrill: 0.0890 },
        '#5': { major: 0.1250, tpi: 40, tapDrill: 0.1015 },
        '#6': { major: 0.1380, tpi: 32, tapDrill: 0.1065 },
        '#8': { major: 0.1640, tpi: 32, tapDrill: 0.1360 },
        '#10': { major: 0.1900, tpi: 24, tapDrill: 0.1495 },
        '#12': { major: 0.2160, tpi: 24, tapDrill: 0.1770 },
        '1/4': { major: 0.2500, tpi: 20, tapDrill: 0.2010 },
        '5/16': { major: 0.3125, tpi: 18, tapDrill: 0.2570 },
        '3/8': { major: 0.3750, tpi: 16, tapDrill: 0.3125 },
        '7/16': { major: 0.4375, tpi: 14, tapDrill: 0.3680 },
        '1/2': { major: 0.5000, tpi: 13, tapDrill: 0.4219 },
        '9/16': { major: 0.5625, tpi: 12, tapDrill: 0.4844 },
        '5/8': { major: 0.6250, tpi: 11, tapDrill: 0.5312 },
        '3/4': { major: 0.7500, tpi: 10, tapDrill: 0.6562 },
        '7/8': { major: 0.8750, tpi: 9, tapDrill: 0.7656 },
        '1': { major: 1.0000, tpi: 8, tapDrill: 0.8750 }
      }
    },
    UNF: {
      name: 'Unified National Fine',
      standard: 'ANSI B1.1',
      threadAngle: 60,
      sizes: {
        '#0': { major: 0.0600, tpi: 80, tapDrill: 0.0469 },
        '#1': { major: 0.0730, tpi: 72, tapDrill: 0.0595 },
        '#2': { major: 0.0860, tpi: 64, tapDrill: 0.0700 },
        '#3': { major: 0.0990, tpi: 56, tapDrill: 0.0820 },
        '#4': { major: 0.1120, tpi: 48, tapDrill: 0.0935 },
        '#5': { major: 0.1250, tpi: 44, tapDrill: 0.1040 },
        '#6': { major: 0.1380, tpi: 40, tapDrill: 0.1130 },
        '#8': { major: 0.1640, tpi: 36, tapDrill: 0.1360 },
        '#10': { major: 0.1900, tpi: 32, tapDrill: 0.1590 },
        '#12': { major: 0.2160, tpi: 28, tapDrill: 0.1820 },
        '1/4': { major: 0.2500, tpi: 28, tapDrill: 0.2130 },
        '5/16': { major: 0.3125, tpi: 24, tapDrill: 0.2720 },
        '3/8': { major: 0.3750, tpi: 24, tapDrill: 0.3320 },
        '7/16': { major: 0.4375, tpi: 20, tapDrill: 0.3906 },
        '1/2': { major: 0.5000, tpi: 20, tapDrill: 0.4531 },
        '9/16': { major: 0.5625, tpi: 18, tapDrill: 0.5156 },
        '5/8': { major: 0.6250, tpi: 18, tapDrill: 0.5781 },
        '3/4': { major: 0.7500, tpi: 16, tapDrill: 0.6875 },
        '7/8': { major: 0.8750, tpi: 14, tapDrill: 0.8125 },
        '1': { major: 1.0000, tpi: 12, tapDrill: 0.9219 }
      }
    },
    // Metric (ISO 262)
    METRIC_COARSE: {
      name: 'ISO Metric Coarse',
      standard: 'ISO 262',
      threadAngle: 60,
      sizes: {
        'M1': { major: 1.0, pitch: 0.25, tapDrill: 0.75 },
        'M1.2': { major: 1.2, pitch: 0.25, tapDrill: 0.95 },
        'M1.4': { major: 1.4, pitch: 0.30, tapDrill: 1.10 },
        'M1.6': { major: 1.6, pitch: 0.35, tapDrill: 1.25 },
        'M2': { major: 2.0, pitch: 0.40, tapDrill: 1.60 },
        'M2.5': { major: 2.5, pitch: 0.45, tapDrill: 2.05 },
        'M3': { major: 3.0, pitch: 0.50, tapDrill: 2.50 },
        'M4': { major: 4.0, pitch: 0.70, tapDrill: 3.30 },
        'M5': { major: 5.0, pitch: 0.80, tapDrill: 4.20 },
        'M6': { major: 6.0, pitch: 1.00, tapDrill: 5.00 },
        'M8': { major: 8.0, pitch: 1.25, tapDrill: 6.80 },
        'M10': { major: 10.0, pitch: 1.50, tapDrill: 8.50 },
        'M12': { major: 12.0, pitch: 1.75, tapDrill: 10.20 },
        'M14': { major: 14.0, pitch: 2.00, tapDrill: 12.00 },
        'M16': { major: 16.0, pitch: 2.00, tapDrill: 14.00 },
        'M18': { major: 18.0, pitch: 2.50, tapDrill: 15.50 },
        'M20': { major: 20.0, pitch: 2.50, tapDrill: 17.50 },
        'M22': { major: 22.0, pitch: 2.50, tapDrill: 19.50 },
        'M24': { major: 24.0, pitch: 3.00, tapDrill: 21.00 },
        'M27': { major: 27.0, pitch: 3.00, tapDrill: 24.00 },
        'M30': { major: 30.0, pitch: 3.50, tapDrill: 26.50 }
      }
    },
    // NPT (ANSI/ASME B1.20.1)
    NPT: {
      name: 'National Pipe Tapered',
      standard: 'ANSI B1.20.1',
      threadAngle: 60,
      taperPerFoot: 0.75, // 3/4 inch per foot (1:16)
      sizes: {
        '1/16': { tpi: 27, tapDrill: 0.2420 },
        '1/8': { tpi: 27, tapDrill: 0.3390 },
        '1/4': { tpi: 18, tapDrill: 0.4375 },
        '3/8': { tpi: 18, tapDrill: 0.5781 },
        '1/2': { tpi: 14, tapDrill: 0.7188 },
        '3/4': { tpi: 14, tapDrill: 0.9219 },
        '1': { tpi: 11.5, tapDrill: 1.1562 },
        '1-1/4': { tpi: 11.5, tapDrill: 1.5000 },
        '1-1/2': { tpi: 11.5, tapDrill: 1.7344 },
        '2': { tpi: 11.5, tapDrill: 2.1875 }
      }
    },
    // ACME (ANSI/ASME B1.5)
    ACME: {
      name: 'ACME Thread',
      standard: 'ANSI B1.5',
      threadAngle: 29,
      description: 'Power transmission threads',
      common: ['1/4-16', '5/16-14', '3/8-12', '1/2-10', '5/8-8', '3/4-6', '1-5', '1-1/4-5', '1-1/2-4', '2-4']
    },
    // BSP (ISO 228 / BS EN ISO 228)
    BSPP: {
      name: 'British Standard Pipe Parallel',
      standard: 'ISO 228-1',
      threadAngle: 55,
      sizes: {
        'G1/8': { major: 9.728, tpi: 28 },
        'G1/4': { major: 13.157, tpi: 19 },
        'G3/8': { major: 16.662, tpi: 19 },
        'G1/2': { major: 20.955, tpi: 14 },
        'G3/4': { major: 26.441, tpi: 14 },
        'G1': { major: 33.249, tpi: 11 }
      }
    }
  },
  // THREAD CALLOUT PARSER

  parseThreadCallout(callout) {
    callout = callout.trim().toUpperCase();

    // UNC/UNF: "1/4-20 UNC" or "1/4-20"
    let match = callout.match(/^([#\d\/\-]+)-(\d+)\s*(UNC|UNF)?/i);
    if (match) {
      const size = match[1].replace('#', '');
      const tpi = parseInt(match[2]);
      const type = match[3] || (this._isCoarse(size, tpi) ? 'UNC' : 'UNF');
      return this._lookupUnified(size, type);
    }
    // Metric: "M6x1.0" or "M6"
    match = callout.match(/^M(\d+(?:\.\d+)?)\s*[xX]?\s*(\d+(?:\.\d+)?)?/i);
    if (match) {
      const diameter = parseFloat(match[1]);
      const pitch = match[2] ? parseFloat(match[2]) : null;
      return this._lookupMetric(diameter, pitch);
    }
    // NPT: "1/4 NPT" or "1/4-18 NPT"
    match = callout.match(/^([#\d\/\-]+)(?:-(\d+))?\s*NPT/i);
    if (match) {
      return this._lookupNPT(match[1]);
    }
    return null;
  },
  _isCoarse(size, tpi) {
    const coarse = this.standards.UNC.sizes[size];
    return coarse && coarse.tpi === tpi;
  },
  _lookupUnified(size, type) {
    const std = type === 'UNC' ? this.standards.UNC : this.standards.UNF;
    const data = std.sizes[size];
    if (!data) return null;

    return {
      type: type,
      size: size,
      majorDiameter: data.major,
      tpi: data.tpi,
      pitch: 1 / data.tpi,
      tapDrill: data.tapDrill,
      threadAngle: 60,
      standard: 'ANSI B1.1'
    };
  },
  _lookupMetric(diameter, pitch) {
    const sizeKey = `M${diameter}`;
    const data = this.standards.METRIC_COARSE.sizes[sizeKey];

    if (data) {
      const actualPitch = pitch || data.pitch;
      return {
        type: 'METRIC',
        size: sizeKey,
        majorDiameter: data.major,
        pitch: actualPitch,
        tapDrill: data.major - actualPitch,
        threadAngle: 60,
        standard: 'ISO 262'
      };
    }
    return null;
  },
  _lookupNPT(size) {
    const data = this.standards.NPT.sizes[size];
    if (!data) return null;

    return {
      type: 'NPT',
      size: size,
      tpi: data.tpi,
      tapDrill: data.tapDrill,
      threadAngle: 60,
      tapered: true,
      taperPerFoot: 0.75,
      standard: 'ANSI B1.20.1'
    };
  },
  // THREAD MILLING G-CODE GENERATION

  generateThreadMillGCode(params) {
    const {
      threadData,
      holeDiameter,
      holeDepth,
      startZ,
      threadDepth,
      threadMillDiameter,
      isInternal = true,
      isClimb = true,
      passes = 1
    } = params;

    const pitch = threadData.pitch || (1 / threadData.tpi);
    const threadMajor = threadData.majorDiameter;

    // Calculate helical arc radius
    // For internal: R = (Hole_Diameter - ThreadMill_Diameter) / 2
    // For external: R = (Major_Diameter + ThreadMill_Diameter) / 2
    const helixRadius = isInternal
      ? (holeDiameter - threadMillDiameter) / 2
      : (threadMajor + threadMillDiameter) / 2;

    const direction = isClimb ? 'G3' : 'G2'; // G3=CCW for climb internal

    let gcode = [];
    gcode.push(`(Thread Mill: ${threadData.type} ${threadData.size})`);
    gcode.push(`(Pitch: ${pitch.toFixed(4)}, Helix Radius: ${helixRadius.toFixed(4)})`);
    gcode.push(`G0 X0 Y0`);
    gcode.push(`G0 Z${(startZ + 0.1).toFixed(4)} (Rapid to clearance)`);
    gcode.push(`G1 Z${startZ.toFixed(4)} F10.0 (Feed to start)`);
    gcode.push(`G1 X${helixRadius.toFixed(4)} F20.0 (Move to helix start)`);

    // Helical interpolation
    const numRevolutions = Math.ceil(threadDepth / pitch);
    for (let rev = 0; rev < numRevolutions; rev++) {
      const zEnd = startZ - ((rev + 1) * pitch);
      gcode.push(`${direction} X${helixRadius.toFixed(4)} Y0 Z${zEnd.toFixed(4)} I${(-helixRadius).toFixed(4)} J0 F15.0`);
    }
    gcode.push(`G1 X0 Y0 (Return to center)`);
    gcode.push(`G0 Z${(startZ + 0.5).toFixed(4)} (Retract)`);

    return gcode.join('\n');
  }
}