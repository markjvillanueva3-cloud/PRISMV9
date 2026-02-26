const PRISM_POST_INTEGRATION_MODULE = {
  version: '1.0.0',

  // 1. REAL-TIME CUTTING PARAMETER ENGINE

  cuttingParams: {
    // Current state
    state: {
      currentTool: null,
      currentMaterial: null,
      currentAe: 0,           // Radial engagement (ae)
      currentAp: 0,           // Axial depth (ap)
      currentFeed: 0,
      currentSpeed: 0,
      pathHistory: [],        // Last N points for analysis
      totalCutLength: 0,
      segmentCount: 0
    },
    /**
     * Initialize for a new operation
     */
    initOperation(tool, material, params) {
      this.state.currentTool = tool;
      this.state.currentMaterial = material;
      this.state.currentAe = params.ae || 0;
      this.state.currentAp = params.ap || 0;
      this.state.currentFeed = params.feed || 0;
      this.state.currentSpeed = params.speed || 0;
      this.state.pathHistory = [];
      this.state.totalCutLength = 0;
      this.state.segmentCount = 0;

      console.log('[PRISM_POST] Initialized for:', tool?.description || 'unknown tool');
    },
    /**
     * Master chip thinning lookup table
     */
    CHIP_THINNING_TABLE: {
      // ae/D ratio : feed multiplier
      0.02: 3.00, 0.03: 2.70, 0.04: 2.50, 0.05: 2.30,
      0.06: 2.15, 0.07: 2.05, 0.08: 1.95, 0.09: 1.88,
      0.10: 1.80, 0.12: 1.68, 0.14: 1.58, 0.16: 1.50,
      0.18: 1.44, 0.20: 1.38, 0.22: 1.34, 0.25: 1.28,
      0.28: 1.23, 0.30: 1.19, 0.33: 1.15, 0.35: 1.12,
      0.38: 1.09, 0.40: 1.06, 0.45: 1.03, 0.50: 1.00,
      0.55: 0.98, 0.60: 0.96, 0.65: 0.94, 0.70: 0.92,
      0.75: 0.90, 0.80: 0.88, 0.85: 0.86, 0.90: 0.84,
      0.95: 0.82, 1.00: 0.80
    },
    /**
     * Calculate chip thinning factor with interpolation
     */
    getChipThinningFactor(aeRatio) {
      const table = this.CHIP_THINNING_TABLE;
      const ratios = Object.keys(table).map(Number).sort((a, b) => a - b);

      // Clamp to table range
      if (aeRatio <= ratios[0]) return table[ratios[0]];
      if (aeRatio >= ratios[ratios.length - 1]) return table[ratios[ratios.length - 1]];

      // Linear interpolation
      for (let i = 0; i < ratios.length - 1; i++) {
        if (aeRatio >= ratios[i] && aeRatio <= ratios[i + 1]) {
          const t = (aeRatio - ratios[i]) / (ratios[i + 1] - ratios[i]);
          return table[ratios[i]] * (1 - t) + table[ratios[i + 1]] * t;
        }
      }
      return 1.0;
    },
    /**
     * Get optimized feed for current conditions
     */
    getOptimizedFeed(baseFeed, options = {}) {
      let feed = baseFeed;
      const adjustments = [];

      const toolDia = this.state.currentTool?.diameter || 12;
      const ae = options.ae || this.state.currentAe;
      const ap = options.ap || this.state.currentAp;

      // 1. CHIP THINNING COMPENSATION
      if (ae > 0 && toolDia > 0) {
        const aeRatio = ae / toolDia;
        const ctFactor = this.getChipThinningFactor(aeRatio);
        feed *= ctFactor;
        if (ctFactor !== 1.0) {
          adjustments.push({ type: 'chipThin', factor: ctFactor, reason: 'ae/D=' + aeRatio.toFixed(2) });
        }
      }
      // 2. SEGMENT LENGTH ADJUSTMENT
      if (options.segmentLength && options.segmentLength < 1.0) {
        // Short segments need feed reduction for control accuracy
        const lengthFactor = Math.max(0.5, Math.sqrt(options.segmentLength));
        feed *= lengthFactor;
        adjustments.push({ type: 'shortSegment', factor: lengthFactor });
      }
      // 3. CORNER APPROACH ADJUSTMENT
      if (options.cornerAngle !== undefined && options.cornerAngle < 150) {
        const cornerFactor = this._getCornerFactor(options.cornerAngle);
        feed *= cornerFactor;
        adjustments.push({ type: 'corner', factor: cornerFactor, angle: options.cornerAngle });
      }
      // 4. DEPTH ADJUSTMENT (for aggressive depths)
      if (ap > toolDia * 1.5) {
        const depthFactor = Math.max(0.7, 1 - (ap - toolDia * 1.5) / (toolDia * 3));
        feed *= depthFactor;
        adjustments.push({ type: 'depth', factor: depthFactor });
      }
      // 5. MATERIAL-SPECIFIC OVERRIDE
      const materialFactor = this._getMaterialFactor(this.state.currentMaterial);
      if (materialFactor !== 1.0) {
        feed *= materialFactor;
        adjustments.push({ type: 'material', factor: materialFactor });
      }
      return {
        originalFeed: baseFeed,
        optimizedFeed: Math.round(feed),
        adjustments,
        totalFactor: feed / baseFeed
      };
    },
    /**
     * Corner deceleration factor
     */
    _getCornerFactor(angle) {
      if (angle >= 150) return 1.00;
      if (angle >= 135) return 0.90;
      if (angle >= 120) return 0.75;
      if (angle >= 100) return 0.55;
      if (angle >= 90) return 0.40;
      if (angle >= 70) return 0.28;
      if (angle >= 45) return 0.18;
      return 0.10;
    },
    /**
     * Material feed factor
     */
    _getMaterialFactor(material) {
      const factors = {
        'aluminum': 1.0,
        '6061': 1.0,
        '7075': 0.95,
        'steel': 0.85,
        '1018': 0.88,
        '4140': 0.80,
        'stainless': 0.70,
        '304': 0.70,
        '316': 0.65,
        'titanium': 0.55,
        'ti6al4v': 0.50,
        'inconel': 0.40,
        'copper': 1.1,
        'brass': 1.15,
        'plastic': 1.3
      };
      const key = (material || '').toLowerCase();
      for (const [mat, factor] of Object.entries(factors)) {
        if (key.includes(mat)) return factor;
      }
      return 1.0;
    }
  },
  // 2. SEGMENT LENGTH TRACKING

  segmentTracker: {
    lastPosition: null,
    segments: [],

    /**
     * Track a new move and calculate segment length
     */
    trackMove(x, y, z) {
      let segmentLength = 0;

      if (this.lastPosition) {
        const dx = x - this.lastPosition.x;
        const dy = y - this.lastPosition.y;
        const dz = z - this.lastPosition.z;
        segmentLength = Math.sqrt(dx*dx + dy*dy + dz*dz);

        this.segments.push({
          length: segmentLength,
          from: { ...this.lastPosition },
          to: { x, y, z }
        });

        // Keep only last 10 segments for memory
        if (this.segments.length > 10) {
          this.segments.shift();
        }
      }
      this.lastPosition = { x, y, z };
      return segmentLength;
    },
    /**
     * Calculate arc length for circular move
     */
    calculateArcLength(clockwise, cx, cy, startX, startY, endX, endY) {
      // Calculate radius
      const r = Math.sqrt((startX - cx)**2 + (startY - cy)**2);

      // Calculate angles
      const startAngle = Math.atan2(startY - cy, startX - cx);
      const endAngle = Math.atan2(endY - cy, endX - cx);

      // Calculate swept angle
      let sweepAngle = endAngle - startAngle;
      if (clockwise && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
      if (!clockwise && sweepAngle < 0) sweepAngle += 2 * Math.PI;

      // Arc length = r * |angle|
      return r * Math.abs(sweepAngle);
    },
    /**
     * Detect upcoming corner by analyzing segment directions
     */
    detectCorner(nextX, nextY, nextZ) {
      if (this.segments.length < 1) return 180; // Assume straight

      const last = this.segments[this.segments.length - 1];

      // Current direction
      const dx1 = last.to.x - last.from.x;
      const dy1 = last.to.y - last.from.y;

      // Next direction
      const dx2 = nextX - last.to.x;
      const dy2 = nextY - last.to.y;

      // Calculate angle between directions
      const dot = dx1*dx2 + dy1*dy2;
      const mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
      const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);

      if (mag1 < 0.001 || mag2 < 0.001) return 180;

      const cosAngle = dot / (mag1 * mag2);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

      return angle;
    },
    reset() {
      this.lastPosition = null;
      this.segments = [];
    }
  },
  // 3. VARIABLE SPEED/FEED DURING CUTS (SSV)

  variableSpeedFeed: {
    enabled: false,
    ssvEnabled: false,

    /**
     * Generate SSV (Spindle Speed Variation) codes
     */
    generateSSV(controller, options = {}) {
      const amplitude = options.amplitude || 5;  // % variation
      const frequency = options.frequency || 2;  // Hz

      const codes = {
        FANUC: {
          enable: 'G10.6 P' + amplitude + ' Q' + (frequency * 1000),
          disable: 'G10.5'
        },
        HAAS: {
          enable: 'G199 P' + amplitude + ' Q' + (frequency * 60),  // Convert to RPM/min
          disable: 'G198'
        },
        MAZAK: {
          enable: 'G57 P' + amplitude + ' Q' + frequency,
          disable: 'G56'
        },
        OKUMA: {
          enable: 'SSV ON A' + amplitude + ' F' + frequency,
          disable: 'SSV OFF'
        },
        SIEMENS: {
          enable: 'SPIF(' + amplitude + ',' + (frequency * 1000) + ')',
          disable: 'SPIF'
        },
        DMG: {
          enable: 'M853',  // Enable SSV
          disable: 'M854'
        }
      };
      return codes[controller.toUpperCase()] || codes.FANUC;
    },
    /**
     * Determine if SSV should be active
     */
    shouldUseSSV(operation, tool) {
      // SSV helps with:
      // 1. Long boring operations
      // 2. Deep turning
      // 3. Slotting with chatter risk
      // 4. Thin-wall machining

      const opType = operation?.type || '';
      const toolRatio = (tool?.overallLength || 100) / (tool?.diameter || 12);

      // High L/D ratio = chatter risk
      if (toolRatio > 4) return true;

      // Boring operations
      if (opType.includes('bore') || opType.includes('turn')) return true;

      // Slotting
      if (opType.includes('slot') && opType.includes('full')) return true;

      return false;
    },
    /**
     * Generate variable feed rate block
     */
    generateVariableFeed(baseFeed, variationPercent = 10) {
      // Creates a ramping feed pattern
      const steps = [];
      const rampSteps = 5;

      for (let i = 0; i < rampSteps; i++) {
        const factor = 1 - (variationPercent / 100) * Math.sin(i * Math.PI / rampSteps);
        steps.push(Math.round(baseFeed * factor));
      }
      return steps;
    }
  },
  // 4. POST PROCESSOR G-CODE OUTPUT ENHANCEMENT

  postOutput: {
    /**
     * Generate PRISM-enhanced onLinear function
     */
    generateOnLinear(controllerType) {
      return `
/**
 * PRISM-Enhanced Linear Move (G1)
 * Includes real-time feed optimization
 */
function onLinear(x, y, z, feed) {
    var xVal = xOutput.format(x);
    var yVal = yOutput.format(y);
    var zVal = zOutput.format(z);

    var optimizedFeed = feed;
    var prismComment = "";

    // PRISM OPTIMIZATION
    if (getProperty("prismRoughingLogic")) {
        var segment = PRISM_SEGMENT_TRACKER.trackMove(x, y, z);
        var corner = PRISM_SEGMENT_TRACKER.detectCorner(x, y, z);

        var result = PRISM_CUTTING_PARAMS.getOptimizedFeed(feed, {
            segmentLength: segment,
            cornerAngle: corner,
            ae: PRISM_CUTTING_PARAMS.state.currentAe,
            ap: PRISM_CUTTING_PARAMS.state.currentAp
        });

        optimizedFeed = result.optimizedFeed;

        if (result.totalFactor !== 1.0 && getProperty("prismComments")) {
            prismComment = " (PRISM: " + Math.round(result.totalFactor * 100) + "%)";
        }
    }
    var fVal = feedOutput.format(optimizedFeed);

    if (xVal || yVal || zVal) {
        writeBlock(gMotionModal.format(1), xVal, yVal, zVal, fVal);
        if (prismComment) {
            writeComment(prismComment);
        }
    } else if (fVal) {
        writeBlock(gMotionModal.format(1), fVal);
    }
}
`;
    },
    /**
     * Generate PRISM-enhanced onCircular function
     */
    generateOnCircular(controllerType) {
      return `
/**
 * PRISM-Enhanced Circular Move (G2/G3)
 * Includes arc-length based feed optimization
 */
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
    var start = getCurrentPosition();

    var optimizedFeed = feed;

    // PRISM OPTIMIZATION for arcs
    if (getProperty("prismRoughingLogic")) {
        var arcLength = PRISM_SEGMENT_TRACKER.calculateArcLength(
            clockwise, cx, cy, start.x, start.y, x, y
        );

        // Short arcs need feed reduction for accuracy
        if (arcLength < 2.0) {
            optimizedFeed = Math.round(feed * Math.max(0.5, Math.sqrt(arcLength / 2)));
        }
        // Very tight radii need reduction
        var radius = Math.sqrt((start.x - cx) * (start.x - cx) + (start.y - cy) * (start.y - cy));
        if (radius < 3.0) {
            optimizedFeed = Math.min(optimizedFeed, Math.round(feed * 0.6));
        }
    }
    // Update tracker
    PRISM_SEGMENT_TRACKER.trackMove(x, y, z);

    // Output arc
    if (isFullCircle()) {
        switch (getCircularPlane()) {
            case PLANE_XY:
                writeBlock(
                    gMotionModal.format(clockwise ? 2 : 3),
                    iOutput.format(cx - start.x),
                    jOutput.format(cy - start.y),
                    feedOutput.format(optimizedFeed)
                );
                break;
            // ... other planes
        }
    } else {
        writeBlock(
            gMotionModal.format(clockwise ? 2 : 3),
            xOutput.format(x),
            yOutput.format(y),
            zOutput.format(z),
            iOutput.format(cx - start.x),
            jOutput.format(cy - start.y),
            feedOutput.format(optimizedFeed)
        );
    }
}
`;
    },
    /**
     * Generate PRISM initialization code for post
     */
    generatePRISMInit() {
      return `
// PRISM AI CUTTING PARAMETER ENGINE

var PRISM_CUTTING_PARAMS = {
    state: {
        currentTool: null,
        currentMaterial: "",
        currentAe: 0,
        currentAp: 0
    },
    CHIP_THINNING_TABLE: {
        0.05: 2.30, 0.10: 1.80, 0.15: 1.55, 0.20: 1.38,
        0.25: 1.28, 0.30: 1.19, 0.35: 1.12, 0.40: 1.06,
        0.45: 1.03, 0.50: 1.00, 0.60: 0.96, 0.70: 0.92,
        0.80: 0.88, 0.90: 0.84, 1.00: 0.80
    },
    getChipThinningFactor: function(aeRatio) {
        var table = this.CHIP_THINNING_TABLE;
        var ratios = Object.keys(table).map(Number).sort(function(a,b){return a-b;});

        if (aeRatio <= ratios[0]) return table[ratios[0]];
        if (aeRatio >= ratios[ratios.length-1]) return table[ratios[ratios.length-1]];

        for (var i = 0; i < ratios.length - 1; i++) {
            if (aeRatio >= ratios[i] && aeRatio <= ratios[i+1]) {
                var t = (aeRatio - ratios[i]) / (ratios[i+1] - ratios[i]);
                return table[ratios[i]] * (1-t) + table[ratios[i+1]] * t;
            }
        }
        return 1.0;
    },
    getOptimizedFeed: function(baseFeed, options) {
        var feed = baseFeed;
        var toolDia = this.state.currentTool ? this.state.currentTool.diameter : 12;
        var ae = options.ae || this.state.currentAe;

        // Chip thinning
        if (ae > 0 && toolDia > 0) {
            var aeRatio = ae / toolDia;
            var ctFactor = this.getChipThinningFactor(aeRatio);
            feed *= ctFactor;
        }
        // Segment length
        if (options.segmentLength && options.segmentLength < 1.0) {
            feed *= Math.max(0.5, Math.sqrt(options.segmentLength));
        }
        // Corner
        if (options.cornerAngle !== undefined && options.cornerAngle < 150) {
            var cornerFactor = this.getCornerFactor(options.cornerAngle);
            feed *= cornerFactor;
        }
        return {
            originalFeed: baseFeed,
            optimizedFeed: Math.round(feed),
            totalFactor: feed / baseFeed
        };
    },
    getCornerFactor: function(angle) {
        if (angle >= 150) return 1.00;
        if (angle >= 135) return 0.90;
        if (angle >= 120) return 0.75;
        if (angle >= 100) return 0.55;
        if (angle >= 90) return 0.40;
        return 0.25;
    },
    initSection: function(section) {
        this.state.currentTool = section.getTool();
        this.state.currentAe = section.getParameter("operation:stepover") || 0;
        this.state.currentAp = section.getParameter("operation:maximumStepdown") || 0;
    }
};
var PRISM_SEGMENT_TRACKER = {
    lastPosition: null,
    segments: [],

    trackMove: function(x, y, z) {
        var length = 0;
        if (this.lastPosition) {
            var dx = x - this.lastPosition.x;
            var dy = y - this.lastPosition.y;
            var dz = z - this.lastPosition.z;
            length = Math.sqrt(dx*dx + dy*dy + dz*dz);
            this.segments.push({ length: length, to: {x:x, y:y, z:z} });
            if (this.segments.length > 10) this.segments.shift();
        }
        this.lastPosition = {x:x, y:y, z:z};
        return length;
    },
    calculateArcLength: function(clockwise, cx, cy, startX, startY, endX, endY) {
        var r = Math.sqrt((startX-cx)*(startX-cx) + (startY-cy)*(startY-cy));
        var startAngle = Math.atan2(startY-cy, startX-cx);
        var endAngle = Math.atan2(endY-cy, endX-cx);
        var sweep = endAngle - startAngle;
        if (clockwise && sweep > 0) sweep -= 2 * Math.PI;
        if (!clockwise && sweep < 0) sweep += 2 * Math.PI;
        return r * Math.abs(sweep);
    },
    detectCorner: function(nextX, nextY, nextZ) {
        if (this.segments.length < 2) return 180;
        var s1 = this.segments[this.segments.length - 2];
        var s2 = this.segments[this.segments.length - 1];
        if (!s1 || !s2 || !s1.to || !s2.to) return 180;

        var dx1 = s2.to.x - s1.to.x;
        var dy1 = s2.to.y - s1.to.y;
        var dx2 = nextX - s2.to.x;
        var dy2 = nextY - s2.to.y;

        var dot = dx1*dx2 + dy1*dy2;
        var mag1 = Math.sqrt(dx1*dx1 + dy1*dy1);
        var mag2 = Math.sqrt(dx2*dx2 + dy2*dy2);

        if (mag1 < 0.001 || mag2 < 0.001) return 180;

        var cosAngle = dot / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
    },
    reset: function() {
        this.lastPosition = null;
        this.segments = [];
    }
};
`;
    },
    /**
     * Generate PRISM properties for post
     */
    generatePRISMProperties() {
      return `
// PRISM AI Optimization Properties
properties.prismRoughingLogic = {
    title: "PRISM Advanced Cutting",
    description: "Enable PRISM AI real-time cutting parameter optimization",
    type: "boolean",
    value: true,
    scope: "post"
};
properties.chipThinningCompensation = {
    title: "Chip Thinning Compensation",
    description: "Automatically adjust feed based on radial engagement (ae/D ratio)",
    type: "boolean",
    value: true,
    scope: "post"
};
properties.segmentLengthOptimization = {
    title: "Segment Length Optimization",
    description: "Adjust feed for short segments to maintain accuracy",
    type: "boolean",
    value: true,
    scope: "post"
};
properties.cornerDeceleration = {
    title: "Corner Deceleration",
    description: "Automatically reduce feed at direction changes",
    type: "boolean",
    value: true,
    scope: "post"
};
properties.arcLengthOptimization = {
    title: "Arc Length Optimization",
    description: "Adjust feed for short arcs and tight radii",
    type: "boolean",
    value: true,
    scope: "post"
};
properties.prismComments = {
    title: "PRISM Comments",
    description: "Add comments showing feed adjustments",
    type: "boolean",
    value: false,
    scope: "post"
};
properties.variableSpeedMachining = {
    title: "Variable Speed (SSV)",
    description: "Enable spindle speed variation for chatter suppression",
    type: "boolean",
    value: false,
    scope: "post"
};
properties.ssvAmplitude = {
    title: "SSV Amplitude (%)",
    description: "Spindle speed variation percentage",
    type: "number",
    value: 5,
    range: [1, 15],
    scope: "post"
};
`;
    }
  },
  // 5. INTEGRATION WITH POST_GENERATOR

  integrateWithGenerator() {
    // Enhance POST_GENERATOR if it exists
    if (typeof POST_GENERATOR !== 'undefined') {
      const originalGeneratePRISM = POST_GENERATOR.generatePRISMRoughingLogic;

      POST_GENERATOR.generatePRISMRoughingLogic = (family, machine) => {
        // Call original
        let output = originalGeneratePRISM ? originalGeneratePRISM.call(POST_GENERATOR, family, machine) : '';

        // Add enhanced PRISM code
        output += this.postOutput.generatePRISMInit();

        return output;
      };
      console.log('[PRISM_POST_INTEGRATION] Enhanced POST_GENERATOR.generatePRISMRoughingLogic');
    }
    // Enhance COMPLETE_POST_PROCESSOR_ENGINE if it exists
    if (typeof COMPLETE_POST_PROCESSOR_ENGINE !== 'undefined') {
      COMPLETE_POST_PROCESSOR_ENGINE.prismIntegration = {
        getOptimizedFeed: (feed, opts) => this.cuttingParams.getOptimizedFeed(feed, opts),
        trackSegment: (x, y, z) => this.segmentTracker.trackMove(x, y, z),
        getSSVCodes: (ctrl, opts) => this.variableSpeedFeed.generateSSV(ctrl, opts),
        generateEnhancedOnLinear: (ctrl) => this.postOutput.generateOnLinear(ctrl),
        generateEnhancedOnCircular: (ctrl) => this.postOutput.generateOnCircular(ctrl)
      };
      console.log('[PRISM_POST_INTEGRATION] Enhanced COMPLETE_POST_PROCESSOR_ENGINE');
    }
  },
  /**
   * Initialize module
   */
  init() {
    console.log('[PRISM_POST_INTEGRATION_MODULE] Initializing...');
    this.integrateWithGenerator();
    return this;
  }
}