/**
 * PRISM_STANDALONE_CALCULATOR_API
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: calculator
 * Lines: 296
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_STANDALONE_CALCULATOR_API = {
  version: '1.0.0',

  // ====== CORE MILLING CALCULATIONS ======
  milling: {
    // Calculate RPM from SFM and diameter
    rpm: function(sfm, diameter, units = 'imperial') {
      if (units === 'metric') {
        // Vc in m/min, D in mm
        return Math.round((sfm * 1000) / (Math.PI * diameter));
      }
      // SFM, D in inches
      return Math.round((sfm * 12) / (Math.PI * diameter));
    },
    // Calculate SFM from RPM and diameter
    sfm: function(rpm, diameter, units = 'imperial') {
      if (units === 'metric') {
        return Math.round((Math.PI * diameter * rpm) / 1000 * 10) / 10;
      }
      return Math.round((Math.PI * diameter * rpm) / 12 * 10) / 10;
    },
    // Calculate feed rate (IPM or mm/min)
    feedRate: function(rpm, ipt, flutes) {
      return Math.round(rpm * ipt * flutes * 100) / 100;
    },
    // Calculate chip load (IPT) from feed rate
    chipLoad: function(feedRate, rpm, flutes) {
      return Math.round((feedRate / (rpm * flutes)) * 10000) / 10000;
    },
    // Calculate MRR (cubic inches/min or cm³/min)
    mrr: function(woc, doc, feedRate) {
      return Math.round(woc * doc * feedRate * 1000) / 1000;
    },
    // Chip thinning compensation factor
    chipThinningFactor: function(woc, toolDiameter) {
      const engagement = woc / toolDiameter;
      if (engagement >= 0.5) return 1.0;
      const factor = 1 - 2 * engagement;
      return Math.round(1 / Math.sqrt(1 - factor * factor) * 1000) / 1000;
    },
    // Adjusted feed with chip thinning
    adjustedFeed: function(baseFeed, woc, toolDiameter) {
      const ctf = this.chipThinningFactor(woc, toolDiameter);
      return Math.round(baseFeed * ctf * 100) / 100;
    },
    // Calculate cutting force (approximate)
    cuttingForce: function(doc, woc, feed, Kc) {
      // Kc = specific cutting force (N/mm² or psi)
      const chipArea = doc * feed;
      return Math.round(Kc * chipArea * woc * 100) / 100;
    },
    // Calculate spindle power required (HP or kW)
    power: function(mrr, Kc, efficiency = 0.8, units = 'imperial') {
      if (units === 'metric') {
        // MRR in cm³/min, Kc in N/mm², output in kW
        return Math.round((mrr * Kc) / (60000 * efficiency) * 100) / 100;
      }
      // MRR in in³/min, Kc in psi, output in HP
      return Math.round((mrr * Kc) / (396000 * efficiency) * 100) / 100;
    },
    // Calculate tool deflection
    deflection: function(force, stickout, diameter, material = 'carbide') {
      const E = material === 'carbide' ? 87000000 : 30000000; // psi
      const I = (Math.PI * Math.pow(diameter / 2, 4)) / 4;
      return Math.round((force * Math.pow(stickout, 3)) / (3 * E * I) * 10000) / 10000;
    },
    // Surface finish prediction (Ra)
    surfaceFinish: function(feedPerRev, cornerRadius) {
      // Ra = f² / (32 × R) in same units
      const theoretical = Math.pow(feedPerRev, 2) / (32 * cornerRadius);
      return {
        theoretical: Math.round(theoretical * 10000) / 10000,
        estimated: Math.round(theoretical * 1.3 * 10000) / 10000, // 30% worse typical
        unit: 'same as input units'
      };
    }
  },
  // ====== CORE TURNING/LATHE CALCULATIONS ======
  turning: {
    // Calculate RPM from SFM and diameter
    rpm: function(sfm, diameter, units = 'imperial') {
      return PRISM_STANDALONE_CALCULATOR_API.milling.rpm(sfm, diameter, units);
    },
    // Calculate SFM from RPM
    sfm: function(rpm, diameter, units = 'imperial') {
      return PRISM_STANDALONE_CALCULATOR_API.milling.sfm(rpm, diameter, units);
    },
    // Calculate feed rate (IPR or mm/rev)
    feedPerRev: function(ipm, rpm) {
      return Math.round((ipm / rpm) * 10000) / 10000;
    },
    // Calculate IPM from IPR
    ipm: function(ipr, rpm) {
      return Math.round(ipr * rpm * 100) / 100;
    },
    // Calculate MRR for turning
    mrr: function(doc, feed, rpm, diameter) {
      // MRR = π × D × DOC × f × RPM (simplified)
      return Math.round(Math.PI * diameter * doc * feed * 1000) / 1000;
    },
    // Surface finish for turning
    surfaceFinish: function(feedPerRev, noseRadius) {
      return PRISM_STANDALONE_CALCULATOR_API.milling.surfaceFinish(feedPerRev, noseRadius);
    },
    // Constant surface speed (CSS) RPM at diameter
    cssRpm: function(targetSfm, diameter, units = 'imperial') {
      return this.rpm(targetSfm, diameter, units);
    }
  },
  // ====== DRILLING CALCULATIONS ======
  drilling: {
    // Calculate RPM
    rpm: function(sfm, diameter, units = 'imperial') {
      return PRISM_STANDALONE_CALCULATOR_API.milling.rpm(sfm, diameter, units);
    },
    // Calculate feed rate
    feedRate: function(rpm, ipr) {
      return Math.round(rpm * ipr * 100) / 100;
    },
    // Recommended peck depth
    peckDepth: function(diameter, material = 'steel') {
      const factors = {
        aluminum: 3.0,
        steel: 1.5,
        stainless: 1.0,
        titanium: 0.75,
        cast_iron: 2.0
      };
      return Math.round(diameter * (factors[material] || 1.5) * 100) / 100;
    },
    // Tap drill size
    tapDrill: function(majorDiameter, pitch, threadPercentage = 75) {
      // For metric: Tap drill = Major - Pitch
      // For imperial: Tap drill = Major - (1/TPI)
      const minorDia = majorDiameter - pitch;
      const adjustment = (majorDiameter - minorDia) * (1 - threadPercentage / 100);
      return Math.round((minorDia + adjustment) * 1000) / 1000;
    }
  },
  // ====== MATERIAL DATABASE LOOKUP ======
  materials: {
    // Get recommended parameters for material
    get: function(materialName, operation = 'milling') {
      const data = {
        // Aluminum alloys
        '6061-T6': { sfm: { carbide: 1000, hss: 400 }, ipt: 0.004, Kc: 700 },
        '7075-T6': { sfm: { carbide: 800, hss: 350 }, ipt: 0.003, Kc: 800 },
        '2024-T3': { sfm: { carbide: 900, hss: 375 }, ipt: 0.0035, Kc: 750 },

        // Steels
        '1018': { sfm: { carbide: 500, hss: 100 }, ipt: 0.003, Kc: 2000 },
        '4140': { sfm: { carbide: 400, hss: 80 }, ipt: 0.0025, Kc: 2400 },
        '4340': { sfm: { carbide: 350, hss: 70 }, ipt: 0.002, Kc: 2600 },
        'D2': { sfm: { carbide: 150, hss: 40 }, ipt: 0.0015, Kc: 3000 },

        // Stainless steels
        '304': { sfm: { carbide: 300, hss: 60 }, ipt: 0.002, Kc: 2800 },
        '316': { sfm: { carbide: 250, hss: 50 }, ipt: 0.0018, Kc: 3000 },
        '17-4PH': { sfm: { carbide: 200, hss: 45 }, ipt: 0.0015, Kc: 3200 },

        // Titanium
        'Ti-6Al-4V': { sfm: { carbide: 150, hss: 35 }, ipt: 0.0015, Kc: 1500 },

        // Inconel
        '718': { sfm: { carbide: 80, hss: 20 }, ipt: 0.001, Kc: 3500 },
        '625': { sfm: { carbide: 70, hss: 18 }, ipt: 0.001, Kc: 3600 },

        // Cast iron
        'gray_iron': { sfm: { carbide: 400, hss: 100 }, ipt: 0.004, Kc: 1200 },
        'ductile_iron': { sfm: { carbide: 350, hss: 90 }, ipt: 0.003, Kc: 1400 }
      };
      const normalized = materialName.toLowerCase().replace(/[- ]/g, '_');
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().replace(/[- ]/g, '_') === normalized) {
          return value;
        }
      }
      return null;
    },
    // List all available materials
    list: function() {
      return ['6061-T6', '7075-T6', '2024-T3', '1018', '4140', '4340', 'D2',
              '304', '316', '17-4PH', 'Ti-6Al-4V', '718', '625',
              'gray_iron', 'ductile_iron'];
    }
  },
  // ====== COMPLETE PARAMETER CALCULATION ======
  calculate: function(params) {
    /**
     * All-in-one parameter calculator
     * @param {Object} params - Input parameters
     * @param {string} params.operation - 'milling', 'turning', 'drilling'
     * @param {string} params.material - Material name (e.g., '6061-T6')
     * @param {number} params.toolDiameter - Tool diameter
     * @param {number} params.flutes - Number of flutes (milling)
     * @param {number} params.doc - Depth of cut
     * @param {number} params.woc - Width of cut (milling)
     * @param {string} params.toolMaterial - 'carbide' or 'hss'
     * @param {string} params.units - 'imperial' or 'metric'
     * @returns {Object} Complete cutting parameters
     */
    const {
      operation = 'milling',
      material = '6061-T6',
      toolDiameter,
      flutes = 4,
      doc,
      woc,
      toolMaterial = 'carbide',
      units = 'imperial',
      cornerRadius = 0.015
    } = params;

    if (!toolDiameter) {
      return { error: 'toolDiameter is required' };
    }
    // Get material data
    const matData = this.materials.get(material);
    if (!matData) {
      return { error: `Material '${material}' not found. Use materials.list() to see available materials.` };
    }
    const sfm = matData.sfm[toolMaterial] || matData.sfm.carbide;
    const baseIpt = matData.ipt;
    const Kc = matData.Kc;

    // Calculate base parameters
    const rpm = this.milling.rpm(sfm, toolDiameter, units);
    const maxRpm = 20000; // Safety limit
    const safeRpm = Math.min(rpm, maxRpm);

    // Determine depths if not provided
    const effectiveDoc = doc || toolDiameter * 0.5;
    const effectiveWoc = woc || toolDiameter * 0.3;

    // Calculate chip thinning
    const ctf = this.milling.chipThinningFactor(effectiveWoc, toolDiameter);
    const adjustedIpt = baseIpt * ctf;

    // Calculate feed rate
    const feedRate = this.milling.feedRate(safeRpm, adjustedIpt, flutes);

    // Calculate MRR
    const mrr = this.milling.mrr(effectiveWoc, effectiveDoc, feedRate);

    // Calculate power
    const power = this.milling.power(mrr, Kc, 0.8, units);

    // Calculate surface finish
    const feedPerRev = feedRate / safeRpm;
    const surfaceFinish = this.milling.surfaceFinish(feedPerRev, cornerRadius);

    return {
      // Input echo
      input: {
        operation,
        material,
        toolDiameter,
        flutes,
        toolMaterial,
        units
      },
      // Calculated parameters
      rpm: safeRpm,
      sfm: sfm,
      feedRate: feedRate,
      chipLoad: adjustedIpt,
      baseChipLoad: baseIpt,
      chipThinningFactor: ctf,
      depthOfCut: effectiveDoc,
      widthOfCut: effectiveWoc,
      mrr: mrr,
      powerRequired: power,
      powerUnit: units === 'metric' ? 'kW' : 'HP',
      surfaceFinish: surfaceFinish,
      // Recommendations
      recommendations: {
        roughing: {
          doc: toolDiameter * 1.0,  // Full LOC utilization
          woc: toolDiameter * 0.1,  // 10% for adaptive
          feedMultiplier: 1.2
        },
        finishing: {
          doc: toolDiameter * 0.05,
          woc: toolDiameter * 0.5,
          feedMultiplier: 0.7
        }
      },
      // G-code snippet
      gcode: {
        speedCommand: `S${safeRpm} M3`,
        feedCommand: `F${Math.round(feedRate)}`,
        comment: `(${material} / ${toolMaterial.toUpperCase()} / ${toolDiameter}" ${flutes}FL)`
      }
    };
  }
}