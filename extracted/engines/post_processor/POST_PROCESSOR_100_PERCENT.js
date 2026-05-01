// POST_PROCESSOR_100_PERCENT - Lines 340209-341412 (1204 lines) - Complete post processor\n\nconst POST_PROCESSOR_100_PERCENT = {
  version: '1.0.0',

  // 1. COMPREHENSIVE G-CODE VALIDATOR (Enhanced)

  gcodeValidator: {
    /**
     * Validate G-code with full modal state tracking and arc validation
     */
    validateFull(gcode, controller = 'FANUC') {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        statistics: {
          totalLines: 0,
          codeLines: 0,
          comments: 0,
          gCodes: {},
          mCodes: {},
          toolChanges: 0,
          movements: { rapid: 0, linear: 0, arcCW: 0, arcCCW: 0 }
        },
        modalState: {}
      };
      const lines = gcode.split('\n');
      const modal = this._initModalState();
      let lineNum = 0;
      let lastX = 0, lastY = 0, lastZ = 0;

      for (const line of lines) {
        lineNum++;
        result.statistics.totalLines++;
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) continue;

        // Handle comments
        if (trimmed.startsWith('(') || trimmed.startsWith(';')) {
          result.statistics.comments++;
          continue;
        }
        result.statistics.codeLines++;

        // Parse line
        const parsed = this._parseLine(trimmed, lineNum);

        // Update modal state
        this._updateModalState(modal, parsed, result);

        // Validate G-codes
        this._validateGCodes(parsed, modal, controller, lineNum, result);

        // Validate M-codes
        this._validateMCodes(parsed, modal, controller, lineNum, result);

        // Validate coordinates
        this._validateCoordinates(parsed, modal, lineNum, result, lastX, lastY, lastZ);

        // Validate arcs specifically
        if (parsed.gCodes.includes(2) || parsed.gCodes.includes(3)) {
          this._validateArc(parsed, lineNum, result, lastX, lastY, lastZ);
        }
        // Validate feed rate
        this._validateFeedRate(parsed, modal, lineNum, result);

        // Validate spindle
        this._validateSpindle(parsed, modal, lineNum, result);

        // Update positions
        if (parsed.X !== null) lastX = parsed.X;
        if (parsed.Y !== null) lastY = parsed.Y;
        if (parsed.Z !== null) lastZ = parsed.Z;

        // Track statistics
        this._updateStatistics(parsed, result);
      }
      // Final validation checks
      this._finalChecks(modal, result);

      result.valid = result.errors.length === 0;
      result.modalState = modal;

      return result;
    },
    /**
     * Initialize modal state
     */
    _initModalState() {
      return {
        motionMode: 0,        // G00, G01, G02, G03
        plane: 17,            // G17, G18, G19
        units: 21,            // G20 (inch), G21 (mm)
        positioning: 90,      // G90 (absolute), G91 (incremental)
        feedRateMode: 94,     // G94 (per minute), G95 (per rev)
        workOffset: 54,       // G54-G59
        lengthComp: null,     // G43, G44, G49
        cutterComp: 40,       // G40, G41, G42
        cycleMode: 80,        // G80, G81-G89
        spindleOn: false,
        spindleDir: null,     // M03 (CW), M04 (CCW)
        spindleSpeed: 0,
        coolantOn: false,
        feedRate: 0,
        currentTool: 0,
        toolLengthOffset: 0
      };
    },
    /**
     * Parse a G-code line
     */
    _parseLine(line, lineNum) {
      const result = {
        lineNum,
        raw: line,
        N: null,
        gCodes: [],
        mCodes: [],
        X: null, Y: null, Z: null,
        A: null, B: null, C: null,
        I: null, J: null, K: null,
        R: null,
        F: null,
        S: null,
        T: null,
        H: null,
        D: null,
        P: null,
        Q: null,
        L: null
      };
      // Remove comments
      const cleanLine = line.replace(/\([^)]*\)/g, '').replace(/;.*/g, '').trim();

      // Extract N (line number)
      const nMatch = cleanLine.match(/N(\d+)/);
      if (nMatch) result.N = parseInt(nMatch[1]);

      // Extract G codes
      const gMatches = cleanLine.match(/G(\d+\.?\d*)/g);
      if (gMatches) {
        result.gCodes = gMatches.map(g => parseFloat(g.substring(1)));
      }
      // Extract M codes
      const mMatches = cleanLine.match(/M(\d+)/g);
      if (mMatches) {
        result.mCodes = mMatches.map(m => parseInt(m.substring(1)));
      }
      // Extract coordinates
      const coords = ['X', 'Y', 'Z', 'A', 'B', 'C', 'I', 'J', 'K', 'R', 'F', 'S', 'T', 'H', 'D', 'P', 'Q', 'L'];
      for (const c of coords) {
        const regex = new RegExp(c + '([+-]?\\d*\\.?\\d+)');
        const match = cleanLine.match(regex);
        if (match) result[c] = parseFloat(match[1]);
      }
      return result;
    },
    /**
     * Update modal state from parsed line
     */
    _updateModalState(modal, parsed, result) {
      for (const g of parsed.gCodes) {
        // Motion mode
        if ([0, 1, 2, 3].includes(g)) modal.motionMode = g;
        // Plane
        else if ([17, 18, 19].includes(g)) modal.plane = g;
        // Units
        else if ([20, 21].includes(g)) modal.units = g;
        // Positioning
        else if ([90, 91].includes(g)) modal.positioning = g;
        // Feed rate mode
        else if ([94, 95].includes(g)) modal.feedRateMode = g;
        // Work offset
        else if (g >= 54 && g <= 59) modal.workOffset = g;
        // Length comp
        else if ([43, 44, 49].includes(g)) modal.lengthComp = g === 49 ? null : g;
        // Cutter comp
        else if ([40, 41, 42].includes(g)) modal.cutterComp = g;
        // Canned cycles
        else if (g >= 80 && g <= 89) modal.cycleMode = g;
      }
      for (const m of parsed.mCodes) {
        // Spindle
        if (m === 3) { modal.spindleOn = true; modal.spindleDir = 'CW'; }
        else if (m === 4) { modal.spindleOn = true; modal.spindleDir = 'CCW'; }
        else if (m === 5) { modal.spindleOn = false; modal.spindleDir = null; }
        // Coolant
        else if ([7, 8, 50, 51, 88].includes(m)) modal.coolantOn = true;
        else if (m === 9) modal.coolantOn = false;
        // Tool change
        else if (m === 6 && parsed.T !== null) modal.currentTool = parsed.T;
      }
      if (parsed.F !== null) modal.feedRate = parsed.F;
      if (parsed.S !== null) modal.spindleSpeed = parsed.S;
      if (parsed.T !== null && parsed.mCodes.includes(6)) modal.currentTool = parsed.T;
      if (parsed.H !== null) modal.toolLengthOffset = parsed.H;
    },
    /**
     * Validate G-codes for controller
     */
    _validateGCodes(parsed, modal, controller, lineNum, result) {
      const validGCodes = {
        FANUC: [0,1,2,3,4,10,17,18,19,20,21,22,23,27,28,29,30,31,32,40,41,42,43,43.4,44,49,50,51,52,53,54,55,56,57,58,59,65,68,68.2,73,74,76,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99],
        HAAS: [0,1,2,3,4,10,12,13,17,18,19,20,21,28,29,31,32,35,40,41,42,43,43.4,44,47,49,50,51,52,53,54,55,56,57,58,59,60,61,65,68,73,74,76,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,98,99,100,103,107,110,111,112,113,114,129,136,141,143,150,154,184,187,234],
        MAZAK: [0,1,2,3,4,5,10,17,18,19,20,21,22,23,27,28,29,30,31,40,41,42,43,43.4,44,49,50,51,52,53,54,55,56,57,58,59,61,64,65,68,73,74,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99]
      };
      const valid = validGCodes[controller] || validGCodes.FANUC;

      for (const g of parsed.gCodes) {
        if (!valid.includes(g)) {
          result.warnings.push({
            line: lineNum,
            code: 'UNSUPPORTED_GCODE',
            message: 'G' + g + ' may not be supported on ' + controller,
            severity: 'warning'
          });
        }
      }
    },
    /**
     * Validate M-codes for controller
     */
    _validateMCodes(parsed, modal, controller, lineNum, result) {
      const validMCodes = {
        FANUC: [0,1,2,3,4,5,6,7,8,9,19,29,30,48,49,98,99],
        HAAS: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,19,21,22,23,24,25,26,29,30,31,34,36,39,41,42,50,51,52,53,59,75,76,77,78,79,80,82,83,84,85,86,88,89,95,96,97,98,99],
        MAZAK: [0,1,2,3,4,5,6,7,8,9,19,29,30,48,49,50,51,98,99]
      };
      const valid = validMCodes[controller] || validMCodes.FANUC;

      for (const m of parsed.mCodes) {
        if (!valid.includes(m)) {
          result.warnings.push({
            line: lineNum,
            code: 'UNSUPPORTED_MCODE',
            message: 'M' + m + ' may not be supported on ' + controller,
            severity: 'warning'
          });
        }
      }
    },
    /**
     * Validate coordinates
     */
    _validateCoordinates(parsed, modal, lineNum, result, lastX, lastY, lastZ) {
      // Check for motion without coordinates
      if ([1, 2, 3].includes(modal.motionMode)) {
        if (parsed.X === null && parsed.Y === null && parsed.Z === null &&
            parsed.I === null && parsed.J === null && parsed.R === null) {
          // Modal motion is active but no coordinates - OK if just modal
          if (!parsed.gCodes.includes(modal.motionMode)) {
            // No explicit motion code and no coords - might be issue
          }
        }
      }
      // Check Z plunge safety
      if (parsed.Z !== null && parsed.Z < lastZ) {
        // Plunging - check if feed rate is set for G01
        if (modal.motionMode === 1 && modal.feedRate <= 0) {
          result.errors.push({
            line: lineNum,
            code: 'PLUNGE_NO_FEED',
            message: 'Z plunge (G01) without feed rate set',
            severity: 'error'
          });
        }
      }
    },
    /**
     * Validate arc (G02/G03) - CRITICAL MISSING FEATURE
     */
    _validateArc(parsed, lineNum, result, lastX, lastY, lastZ) {
      const isG02 = parsed.gCodes.includes(2);
      const isG03 = parsed.gCodes.includes(3);

      if (!isG02 && !isG03) return;

      // Check for arc definition
      const hasIJ = parsed.I !== null || parsed.J !== null;
      const hasR = parsed.R !== null;
      const hasEndpoint = parsed.X !== null || parsed.Y !== null;

      // Must have either IJ or R
      if (!hasIJ && !hasR) {
        result.errors.push({
          line: lineNum,
          code: 'ARC_NO_CENTER',
          message: (isG02 ? 'G02' : 'G03') + ' arc without center (I/J) or radius (R)',
          severity: 'error'
        });
        return;
      }
      // Check for endpoint
      if (!hasEndpoint) {
        result.warnings.push({
          line: lineNum,
          code: 'ARC_NO_ENDPOINT',
          message: 'Arc without explicit endpoint (full circle assumed)',
          severity: 'warning'
        });
      }
      // If IJ format, validate arc geometry
      if (hasIJ && hasEndpoint) {
        const startX = lastX;
        const startY = lastY;
        const endX = parsed.X !== null ? parsed.X : startX;
        const endY = parsed.Y !== null ? parsed.Y : startY;
        const centerX = startX + (parsed.I || 0);
        const centerY = startY + (parsed.J || 0);

        // Calculate radii
        const startRadius = Math.sqrt(Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2));
        const endRadius = Math.sqrt(Math.pow(endX - centerX, 2) + Math.pow(endY - centerY, 2));

        // Check if radii match (tolerance)
        const tolerance = 0.001; // mm
        const radiusDiff = Math.abs(startRadius - endRadius);

        if (radiusDiff > tolerance) {
          result.errors.push({
            line: lineNum,
            code: 'ARC_RADIUS_MISMATCH',
            message: 'Arc start radius (' + startRadius.toFixed(4) + ') does not match end radius (' + endRadius.toFixed(4) + '). Difference: ' + radiusDiff.toFixed(4),
            severity: 'error'
          });
        }
        // Check for zero radius
        if (startRadius < 0.0001) {
          result.errors.push({
            line: lineNum,
            code: 'ARC_ZERO_RADIUS',
            message: 'Arc has zero or near-zero radius',
            severity: 'error'
          });
        }
      }
      // If R format, validate
      if (hasR) {
        if (parsed.R === 0) {
          result.errors.push({
            line: lineNum,
            code: 'ARC_ZERO_R',
            message: 'Arc with R=0 is invalid',
            severity: 'error'
          });
        }
        // Check if R is reasonable compared to arc length
        if (hasEndpoint) {
          const startX = lastX;
          const startY = lastY;
          const endX = parsed.X !== null ? parsed.X : startX;
          const endY = parsed.Y !== null ? parsed.Y : startY;
          const chordLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

          if (Math.abs(parsed.R) < chordLength / 2) {
            result.errors.push({
              line: lineNum,
              code: 'ARC_R_TOO_SMALL',
              message: 'Arc radius R=' + parsed.R + ' is too small for chord length ' + chordLength.toFixed(3),
              severity: 'error'
            });
          }
        }
      }
    },
    /**
     * Validate feed rate
     */
    _validateFeedRate(parsed, modal, lineNum, result) {
      // Check for cutting motion without feed
      if ([1, 2, 3].includes(modal.motionMode)) {
        if (modal.feedRate <= 0) {
          // Only warn if there's actual motion
          if (parsed.X !== null || parsed.Y !== null || parsed.Z !== null) {
            result.errors.push({
              line: lineNum,
              code: 'NO_FEED_RATE',
              message: 'Cutting motion (G0' + modal.motionMode + ') without feed rate',
              severity: 'error'
            });
          }
        }
        // Check for unreasonably high feed
        if (modal.feedRate > 50000) {
          result.warnings.push({
            line: lineNum,
            code: 'HIGH_FEED_RATE',
            message: 'Very high feed rate: F' + modal.feedRate + ' (verify this is correct)',
            severity: 'warning'
          });
        }
      }
    },
    /**
     * Validate spindle
     */
    _validateSpindle(parsed, modal, lineNum, result) {
      // Check for cutting without spindle
      if ([1, 2, 3].includes(modal.motionMode) && !modal.spindleOn) {
        if (parsed.X !== null || parsed.Y !== null) {
          result.warnings.push({
            line: lineNum,
            code: 'CUTTING_NO_SPINDLE',
            message: 'XY cutting motion without spindle running',
            severity: 'warning'
          });
        }
      }
      // Check for very high/low spindle speed
      if (modal.spindleSpeed > 0) {
        if (modal.spindleSpeed > 40000) {
          result.warnings.push({
            line: lineNum,
            code: 'HIGH_SPINDLE_SPEED',
            message: 'Very high spindle speed: S' + modal.spindleSpeed,
            severity: 'warning'
          });
        }
        if (modal.spindleSpeed < 100 && modal.spindleOn) {
          result.warnings.push({
            line: lineNum,
            code: 'LOW_SPINDLE_SPEED',
            message: 'Very low spindle speed: S' + modal.spindleSpeed,
            severity: 'warning'
          });
        }
      }
    },
    /**
     * Update statistics
     */
    _updateStatistics(parsed, result) {
      // Count G-codes
      for (const g of parsed.gCodes) {
        const key = 'G' + g;
        result.statistics.gCodes[key] = (result.statistics.gCodes[key] || 0) + 1;

        // Movement types
        if (g === 0) result.statistics.movements.rapid++;
        else if (g === 1) result.statistics.movements.linear++;
        else if (g === 2) result.statistics.movements.arcCW++;
        else if (g === 3) result.statistics.movements.arcCCW++;
      }
      // Count M-codes
      for (const m of parsed.mCodes) {
        const key = 'M' + m;
        result.statistics.mCodes[key] = (result.statistics.mCodes[key] || 0) + 1;

        // Tool changes
        if (m === 6) result.statistics.toolChanges++;
      }
    },
    /**
     * Final validation checks
     */
    _finalChecks(modal, result) {
      // Check program ended properly
      if (modal.spindleOn) {
        result.warnings.push({
          line: result.statistics.totalLines,
          code: 'SPINDLE_LEFT_ON',
          message: 'Program ended with spindle still running',
          severity: 'warning'
        });
      }
      if (modal.coolantOn) {
        result.warnings.push({
          line: result.statistics.totalLines,
          code: 'COOLANT_LEFT_ON',
          message: 'Program ended with coolant still on',
          severity: 'warning'
        });
      }
      if (modal.cutterComp !== 40) {
        result.warnings.push({
          line: result.statistics.totalLines,
          code: 'CUTTER_COMP_ACTIVE',
          message: 'Program ended with cutter compensation still active',
          severity: 'warning'
        });
      }
    }
  },
  // 2. ERROR RECOVERY SYSTEM (Enhanced)

  errorRecovery: {
    /**
     * Generate comprehensive error recovery sequences
     */
    generateRecoverySequences(controller = 'FANUC') {
      return {
        safeRetract: this._generateSafeRetract(controller),
        toolBreakageRecovery: this._generateToolBreakageRecovery(controller),
        powerFailureRestart: this._generatePowerFailureRestart(controller),
        emergencyStop: this._generateEmergencyStop(controller),
        coolantFailure: this._generateCoolantFailureRecovery(controller)
      };
    },
    /**
     * Safe retract sequence
     */
    _generateSafeRetract(controller) {
      const sequences = {
        FANUC: [
          '(=== SAFE RETRACT SEQUENCE ===)',
          'M05 (Spindle stop)',
          'M09 (Coolant off)',
          'G49 (Cancel tool length comp)',
          'G40 (Cancel cutter comp)',
          'G80 (Cancel canned cycles)',
          'G91 G28 Z0 (Home Z)',
          'G28 X0 Y0 (Home XY)',
          'G90 (Back to absolute)',
          '(=== SAFE POSITION REACHED ===)'
        ],
        HAAS: [
          '(=== SAFE RETRACT SEQUENCE ===)',
          'M05 (Spindle stop)',
          'M09 (Coolant off)',
          'G49 (Cancel tool length comp)',
          'G40 (Cancel cutter comp)',
          'G80 (Cancel canned cycles)',
          'G53 G00 Z0 (Machine Z home)',
          'G53 G00 X0 Y0 (Machine XY home)',
          '(=== SAFE POSITION REACHED ===)'
        ],
        MAZAK: [
          '(=== SAFE RETRACT SEQUENCE ===)',
          'M05 (Spindle stop)',
          'M09 (Coolant off)',
          'G49 (Cancel tool length comp)',
          'G40 (Cancel cutter comp)',
          'G80 (Cancel canned cycles)',
          'G91 G28 Z0 (Home Z)',
          'G28 X0 Y0 (Home XY)',
          'G90 (Back to absolute)',
          '(=== SAFE POSITION REACHED ===)'
        ]
      };
      return {
        code: (sequences[controller] || sequences.FANUC).join('\n'),
        description: 'Emergency safe retract - stops all motion, cancels modes, homes axes',
        usage: 'Insert after any error or emergency stop'
      };
    },
    /**
     * Tool breakage recovery
     */
    _generateToolBreakageRecovery(controller) {
      const code = [
        '(=== TOOL BREAKAGE RECOVERY ===)',
        '(Run this after tool breakage is detected)',
        '',
        'M05 (Stop spindle)',
        'M09 (Coolant off)',
        'G49 (Cancel length comp)',
        'G91 G28 Z0 (Retract Z)',
        'G90',
        '',
        '(Broken tool is still in spindle)',
        '(1. Manually remove broken tool)',
        '(2. Load replacement tool)',
        '(3. Re-touch-off tool length)',
        '(4. Set #100 = operation to restart)',
        '(5. Run program with block search to #100)',
        '',
        'M01 (Optional stop - confirm tool replaced)',
        '',
        '(If using macro for restart:)',
        'IF [#100 GT 0] GOTO #100',
        '',
        '(=== END RECOVERY ===)'
      ];

      return {
        code: code.join('\n'),
        description: 'Recovery sequence after tool breakage',
        steps: [
          'Stop machine and assess damage',
          'Remove broken tool fragments',
          'Load replacement tool',
          'Re-measure tool length offset',
          'Use block search to find restart point',
          'Resume program'
        ]
      };
    },
    /**
     * Power failure restart
     */
    _generatePowerFailureRestart(controller) {
      const code = [
        '(=== POWER FAILURE RESTART ===)',
        '(Run after power restoration)',
        '',
        '(Step 1: Re-reference machine)',
        '(Home all axes per machine procedure)',
        '',
        '(Step 2: Verify tool in spindle)',
        'M19 (Orient spindle)',
        '',
        '(Step 3: Re-establish work offset)',
        'G54 (Select work offset)',
        '',
        '(Step 4: Verify tool length)',
        '(Run tool setter or manual touch-off)',
        '',
        '(Step 5: Find restart point)',
        '(Use block search or set restart variable)',
        '#500 = [RESTART_BLOCK_NUMBER]',
        '',
        '(Step 6: Verify coolant/chip removal)',
        'M01 (Optional stop for verification)',
        '',
        '(Step 7: Resume at reduced speed initially)',
        '(=== END POWER FAILURE RESTART ===)'
      ];

      return {
        code: code.join('\n'),
        description: 'Procedure after power failure',
        checklist: [
          'Home all axes',
          'Verify tool in spindle matches program',
          'Re-establish work offset (may need re-probing)',
          'Verify tool length offset',
          'Clear chips from work area',
          'Check coolant level',
          'Find last completed operation',
          'Use single block for first few moves'
        ]
      };
    },
    /**
     * Emergency stop sequence
     */
    _generateEmergencyStop(controller) {
      const sequences = {
        FANUC: [
          '(=== EMERGENCY SEQUENCE ===)',
          '(Insert at strategic points)',
          '',
          'N9000 (Emergency block)',
          'M05',
          'M09',
          'G49',
          'G40',
          'G91 G28 Z0',
          'G28 X0 Y0',
          'G90',
          'M30',
          '',
          '(Call with: GOTO 9000)'
        ],
        HAAS: [
          '(=== EMERGENCY SEQUENCE ===)',
          '',
          'N9000',
          'M05',
          'M09',
          'G53 G00 Z0',
          'G53 G00 X0 Y0',
          'M30'
        ]
      };
      return {
        code: (sequences[controller] || sequences.FANUC).join('\n'),
        description: 'Emergency stop block that can be jumped to',
        usage: 'Add to end of program, jump with GOTO 9000 if needed'
      };
    },
    /**
     * Coolant failure recovery
     */
    _generateCoolantFailureRecovery(controller) {
      return {
        code: [
          '(=== COOLANT FAILURE RECOVERY ===)',
          '',
          'M05 (Stop spindle - prevent thermal damage)',
          'G04 P2000 (Dwell 2 seconds)',
          'M09 (Ensure coolant command off)',
          '',
          '(Options:)',
          '(1. Fix coolant and resume)',
          '(2. Switch to mist/MQL: M07)',
          '(3. Run dry at reduced speed)',
          '',
          '(If running dry, reduce speed:)',
          '#101 = #101 * 0.7 (Reduce SFM 30%)',
          '#102 = #102 * 0.5 (Reduce feed 50%)',
          '',
          '(=== END COOLANT RECOVERY ===)'
        ].join('\n'),
        description: 'Recovery when coolant fails mid-program'
      };
    },
    /**
     * Generate block search restart markers
     */
    generateRestartMarkers(operations) {
      const markers = [];
      let blockNum = 1000;

      markers.push('(=== RESTART MARKER LEGEND ===)');

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        markers.push('(N' + blockNum + ' = Operation ' + (i + 1) + ': ' + (op.name || 'Unknown') + ')');
        blockNum += 100;
      }
      markers.push('(Use block search to find N#### and restart)');
      markers.push('(=== END LEGEND ===)');

      return markers.join('\n');
    }
  },
  // 3. MACHINE ENVELOPE VALIDATOR

  envelopeValidator: {
    /**
     * Validate G-code against machine envelope
     */
    validateAgainstEnvelope(gcode, machineEnvelope) {
      const result = {
        valid: true,
        violations: [],
        warnings: [],
        maxExtents: { x: 0, y: 0, z: 0 },
        minExtents: { x: Infinity, y: Infinity, z: Infinity }
      };
      const envelope = machineEnvelope || {
        xMin: 0, xMax: 762,
        yMin: 0, yMax: 406,
        zMin: -508, zMax: 0,
        aMin: -120, aMax: 120,
        cMin: -360, cMax: 360
      };
      const lines = gcode.split('\n');
      let currentX = 0, currentY = 0, currentZ = 0;
      let currentA = 0, currentB = 0, currentC = 0;
      let isIncremental = false;
      let lineNum = 0;

      for (const line of lines) {
        lineNum++;
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith(';')) continue;

        // Check for incremental mode
        if (trimmed.includes('G91')) isIncremental = true;
        if (trimmed.includes('G90')) isIncremental = false;

        // Extract coordinates
        const xMatch = trimmed.match(/X([+-]?\d*\.?\d+)/);
        const yMatch = trimmed.match(/Y([+-]?\d*\.?\d+)/);
        const zMatch = trimmed.match(/Z([+-]?\d*\.?\d+)/);
        const aMatch = trimmed.match(/A([+-]?\d*\.?\d+)/);
        const bMatch = trimmed.match(/B([+-]?\d*\.?\d+)/);
        const cMatch = trimmed.match(/C([+-]?\d*\.?\d+)/);

        // Update positions
        if (xMatch) {
          const val = parseFloat(xMatch[1]);
          currentX = isIncremental ? currentX + val : val;
        }
        if (yMatch) {
          const val = parseFloat(yMatch[1]);
          currentY = isIncremental ? currentY + val : val;
        }
        if (zMatch) {
          const val = parseFloat(zMatch[1]);
          currentZ = isIncremental ? currentZ + val : val;
        }
        if (aMatch) currentA = parseFloat(aMatch[1]);
        if (bMatch) currentB = parseFloat(bMatch[1]);
        if (cMatch) currentC = parseFloat(cMatch[1]);

        // Track extents
        result.maxExtents.x = Math.max(result.maxExtents.x, currentX);
        result.maxExtents.y = Math.max(result.maxExtents.y, currentY);
        result.maxExtents.z = Math.max(result.maxExtents.z, currentZ);
        result.minExtents.x = Math.min(result.minExtents.x, currentX);
        result.minExtents.y = Math.min(result.minExtents.y, currentY);
        result.minExtents.z = Math.min(result.minExtents.z, currentZ);

        // Check violations
        if (currentX < envelope.xMin || currentX > envelope.xMax) {
          result.violations.push({
            line: lineNum,
            axis: 'X',
            value: currentX,
            limit: currentX < envelope.xMin ? envelope.xMin : envelope.xMax,
            message: 'X=' + currentX + ' exceeds travel limit (' + envelope.xMin + ' to ' + envelope.xMax + ')'
          });
          result.valid = false;
        }
        if (currentY < envelope.yMin || currentY > envelope.yMax) {
          result.violations.push({
            line: lineNum,
            axis: 'Y',
            value: currentY,
            limit: currentY < envelope.yMin ? envelope.yMin : envelope.yMax,
            message: 'Y=' + currentY + ' exceeds travel limit (' + envelope.yMin + ' to ' + envelope.yMax + ')'
          });
          result.valid = false;
        }
        if (currentZ < envelope.zMin || currentZ > envelope.zMax) {
          result.violations.push({
            line: lineNum,
            axis: 'Z',
            value: currentZ,
            limit: currentZ < envelope.zMin ? envelope.zMin : envelope.zMax,
            message: 'Z=' + currentZ + ' exceeds travel limit (' + envelope.zMin + ' to ' + envelope.zMax + ')'
          });
          result.valid = false;
        }
        // Check rotary limits
        if (envelope.aMin !== undefined && (currentA < envelope.aMin || currentA > envelope.aMax)) {
          result.violations.push({
            line: lineNum,
            axis: 'A',
            value: currentA,
            message: 'A=' + currentA + ' exceeds rotary limit (' + envelope.aMin + '° to ' + envelope.aMax + '°)'
          });
          result.valid = false;
        }
        if (envelope.cMin !== undefined && (currentC < envelope.cMin || currentC > envelope.cMax)) {
          // Check if C can wrap
          if (Math.abs(currentC) > 360 && !envelope.cContinuous) {
            result.warnings.push({
              line: lineNum,
              axis: 'C',
              value: currentC,
              message: 'C=' + currentC + '° may require rewind (limit: ' + envelope.cMin + '° to ' + envelope.cMax + '°)'
            });
          }
        }
      }
      return result;
    },
    /**
     * Check if position is within soft limits
     */
    checkSoftLimits(x, y, z, envelope, margin = 5) {
      const warnings = [];

      if (x < envelope.xMin + margin) {
        warnings.push('X approaching minimum soft limit');
      }
      if (x > envelope.xMax - margin) {
        warnings.push('X approaching maximum soft limit');
      }
      if (y < envelope.yMin + margin) {
        warnings.push('Y approaching minimum soft limit');
      }
      if (y > envelope.yMax - margin) {
        warnings.push('Y approaching maximum soft limit');
      }
      if (z < envelope.zMin + margin) {
        warnings.push('Z approaching minimum soft limit');
      }
      return warnings;
    }
  },
  // 4. POST PROCESSOR TEST SUITE

  testSuite: {
    testCases: [],

    /**
     * Initialize test cases
     */
    initializeTests() {
      this.testCases = [
        // Basic syntax tests
        {
          name: 'Valid simple program',
          gcode: '%\nO0001\nG21 G17 G40 G49 G80 G90\nG54\nT1 M06\nG43 H1\nS1000 M03\nM08\nG00 X0 Y0\nG00 Z5.\nG01 Z-1. F100\nG01 X10. Y10. F200\nG00 Z50.\nM09\nM05\nG91 G28 Z0\nM30\n%',
          controller: 'FANUC',
          expectedErrors: 0,
          expectedWarnings: 0
        },
        {
          name: 'Missing feed rate on G01',
          gcode: 'G01 X10. Y10.',
          controller: 'FANUC',
          expectedErrors: 1,
          errorCode: 'NO_FEED_RATE'
        },
        {
          name: 'Arc without center or radius',
          gcode: 'G02 X10. Y10.',
          controller: 'FANUC',
          expectedErrors: 1,
          errorCode: 'ARC_NO_CENTER'
        },
        {
          name: 'Arc with mismatched radius',
          gcode: 'G01 X0 Y0 F100\nG02 X10. Y10. I5. J0.',
          controller: 'FANUC',
          expectedErrors: 1,
          errorCode: 'ARC_RADIUS_MISMATCH'
        },
        {
          name: 'Arc with R=0',
          gcode: 'G02 X10. Y10. R0',
          controller: 'FANUC',
          expectedErrors: 1,
          errorCode: 'ARC_ZERO_R'
        },
        {
          name: 'Unsupported G-code warning',
          gcode: 'G999',
          controller: 'FANUC',
          expectedWarnings: 1,
          warningCode: 'UNSUPPORTED_GCODE'
        },
        {
          name: 'Spindle left on at end',
          gcode: 'S1000 M03\nM30',
          controller: 'FANUC',
          expectedWarnings: 1,
          warningCode: 'SPINDLE_LEFT_ON'
        },
        {
          name: 'Coolant left on at end',
          gcode: 'M08\nM30',
          controller: 'FANUC',
          expectedWarnings: 1,
          warningCode: 'COOLANT_LEFT_ON'
        },
        {
          name: 'Very high feed rate',
          gcode: 'G01 X10. F99999',
          controller: 'FANUC',
          expectedWarnings: 1,
          warningCode: 'HIGH_FEED_RATE'
        },
        {
          name: 'Valid arc with R',
          gcode: 'G01 X0 Y0 F100\nG02 X10. Y0 R5.',
          controller: 'FANUC',
          expectedErrors: 0
        },
        {
          name: 'Valid arc with IJ',
          gcode: 'G01 X0 Y0 F100\nG02 X10. Y0 I5. J0.',
          controller: 'FANUC',
          expectedErrors: 0
        },
        // Envelope tests
        {
          name: 'Within envelope',
          gcode: 'G00 X100. Y100. Z-50.',
          controller: 'FANUC',
          envelope: { xMin: 0, xMax: 500, yMin: 0, yMax: 500, zMin: -200, zMax: 0 },
          expectedEnvelopeViolations: 0
        },
        {
          name: 'X exceeds envelope',
          gcode: 'G00 X600.',
          controller: 'FANUC',
          envelope: { xMin: 0, xMax: 500, yMin: 0, yMax: 500, zMin: -200, zMax: 0 },
          expectedEnvelopeViolations: 1
        }
      ];

      return this.testCases.length;
    },
    /**
     * Run all tests
     */
    runAllTests() {
      if (this.testCases.length === 0) {
        this.initializeTests();
      }
      const results = {
        total: this.testCases.length,
        passed: 0,
        failed: 0,
        details: []
      };
      for (const test of this.testCases) {
        const testResult = this.runSingleTest(test);
        results.details.push(testResult);

        if (testResult.passed) {
          results.passed++;
        } else {
          results.failed++;
        }
      }
      results.passRate = Math.round((results.passed / results.total) * 100) + '%';

      return results;
    },
    /**
     * Run single test
     */
    runSingleTest(test) {
      const result = {
        name: test.name,
        passed: true,
        errors: [],
        validationResult: null,
        envelopeResult: null
      };
      try {
        // Run G-code validation
        const validation = POST_PROCESSOR_100_PERCENT.gcodeValidator.validateFull(test.gcode, test.controller);
        result.validationResult = validation;

        // Check expected errors
        if (test.expectedErrors !== undefined) {
          if (validation.errors.length !== test.expectedErrors) {
            result.passed = false;
            result.errors.push('Expected ' + test.expectedErrors + ' errors, got ' + validation.errors.length);
          }
        }
        // Check specific error code
        if (test.errorCode) {
          const hasError = validation.errors.some(e => e.code === test.errorCode);
          if (!hasError) {
            result.passed = false;
            result.errors.push('Expected error code ' + test.errorCode + ' not found');
          }
        }
        // Check expected warnings
        if (test.expectedWarnings !== undefined) {
          if (validation.warnings.length !== test.expectedWarnings) {
            result.passed = false;
            result.errors.push('Expected ' + test.expectedWarnings + ' warnings, got ' + validation.warnings.length);
          }
        }
        // Check specific warning code
        if (test.warningCode) {
          const hasWarning = validation.warnings.some(w => w.code === test.warningCode);
          if (!hasWarning) {
            result.passed = false;
            result.errors.push('Expected warning code ' + test.warningCode + ' not found');
          }
        }
        // Run envelope validation if specified
        if (test.envelope) {
          const envelopeResult = POST_PROCESSOR_100_PERCENT.envelopeValidator.validateAgainstEnvelope(test.gcode, test.envelope);
          result.envelopeResult = envelopeResult;

          if (test.expectedEnvelopeViolations !== undefined) {
            if (envelopeResult.violations.length !== test.expectedEnvelopeViolations) {
              result.passed = false;
              result.errors.push('Expected ' + test.expectedEnvelopeViolations + ' envelope violations, got ' + envelopeResult.violations.length);
            }
          }
        }
      } catch (e) {
        result.passed = false;
        result.errors.push('Exception: ' + e.message);
      }
      return result;
    },
    /**
     * Generate test report
     */
    generateTestReport(results) {
      const report = [];

      report.push('╔════════════════════════════════════════════════════════════╗');
      report.push('║           POST PROCESSOR TEST SUITE REPORT                 ║');
      report.push('╚════════════════════════════════════════════════════════════╝');
      report.push('');
      report.push('Total Tests: ' + results.total);
      report.push('Passed: ' + results.passed + ' (' + results.passRate + ')');
      report.push('Failed: ' + results.failed);
      report.push('');
      report.push('─────────────────────────────────────────────────────────────');

      for (const test of results.details) {
        const status = test.passed ? '✓' : '✗';
        report.push(status + ' ' + test.name);

        if (!test.passed) {
          for (const error of test.errors) {
            report.push('    └─ ' + error);
          }
        }
      }
      report.push('─────────────────────────────────────────────────────────────');

      return report.join('\n');
    }
  },
  // 5. ENHANCED ENTRY/EXIT STRATEGIES

  entryExitEnhanced: {
    /**
     * Calculate optimal lead-in for profiling
     */
    calculateLeadIn(params) {
      const {
        toolDiameter,
        material = 'steel',
        profileType = 'external',
        direction = 'climb',
        feedRate = 500
      } = params;

      // Lead-in distance: 50-100% of tool diameter
      const leadInLength = toolDiameter * 0.75;

      // Approach angle
      const approachAngle = 45; // degrees

      // Tangent or arc entry
      const entryType = material.includes('aluminum') ? 'arc' : 'tangent';

      const result = {
        type: entryType,
        length: Math.round(leadInLength * 100) / 100,
        angle: approachAngle,
        radius: toolDiameter * 0.5,
        feedRate: Math.round(feedRate * 0.5),
        gcode: []
      };
      if (entryType === 'arc') {
        result.gcode = [
          '(ARC LEAD-IN)',
          'G01 F' + result.feedRate,
          direction === 'climb' ? 'G02' : 'G03' + ' R' + result.radius.toFixed(3) + ' (Lead-in arc)',
          'G01 F' + feedRate + ' (Full feed)'
        ];
      } else {
        result.gcode = [
          '(TANGENT LEAD-IN)',
          'G01 F' + result.feedRate,
          '(Tangent approach at ' + approachAngle + ' degrees)',
          'G01 F' + feedRate + ' (Full feed)'
        ];
      }
      return result;
    },
    /**
     * Calculate optimal lead-out for profiling
     */
    calculateLeadOut(params) {
      const {
        toolDiameter,
        direction = 'climb',
        feedRate = 500
      } = params;

      const leadOutLength = toolDiameter * 0.5;

      return {
        type: 'tangent',
        length: Math.round(leadOutLength * 100) / 100,
        angle: 45,
        gcode: [
          '(TANGENT LEAD-OUT)',
          direction === 'climb' ? 'G02' : 'G03' + ' R' + (toolDiameter * 0.3).toFixed(3) + ' (Lead-out arc)',
          'G00 Z5. (Retract)'
        ]
      };
    },
    /**
     * Calculate ramp entry parameters
     */
    calculateRampEntry(params) {
      const {
        toolDiameter,
        material = 'steel',
        depth,
        feedRate = 500
      } = params;

      // Max ramp angle by material
      const maxAngles = {
        aluminum: 5,
        steel: 3,
        stainless: 2,
        titanium: 1.5,
        hardened: 1
      };
      const maxAngle = maxAngles[material] || 3;
      const rampLength = depth / Math.tan(maxAngle * Math.PI / 180);
      const rampFeed = feedRate * 0.5;

      return {
        angle: maxAngle,
        length: Math.round(rampLength * 100) / 100,
        feedRate: Math.round(rampFeed),
        passes: Math.ceil(depth / (toolDiameter * 0.5)),
        gcode: [
          '(RAMP ENTRY)',
          '(Max angle: ' + maxAngle + ' degrees)',
          '(Ramp length: ' + rampLength.toFixed(2) + 'mm)',
          'G01 Z-' + depth.toFixed(3) + ' F' + rampFeed + ' (Ramp to depth)'
        ]
      };
    }
  }
};
