const PRISM_LATHE_TOOLPATH_ENGINE = {
  version: '1.0.0',

  // TURNING OPERATIONS

  turning: {
    /**
     * Generate OD (Outside Diameter) roughing toolpath
     */
    odRough(params) {
      const {
        startDiameter,
        endDiameter,
        startZ,
        endZ,
        depthOfCut = 0.1,    // DOC per pass
        feedRate = 0.012,     // IPR
        safeX,               // Safe retract X
        clearanceZ = 0.1     // Clearance above part
      } = params;

      const toolpath = [];
      const totalStock = (startDiameter - endDiameter) / 2;
      const passes = Math.ceil(totalStock / depthOfCut);
      const actualDoc = totalStock / passes;

      let currentRadius = startDiameter / 2;

      for (let pass = 1; pass <= passes; pass++) {
        const targetRadius = (startDiameter / 2) - (actualDoc * pass);

        // Rapid to start position
        toolpath.push({
          type: 'rapid',
          x: currentRadius + 0.05,
          z: startZ + clearanceZ
        });

        // Rapid to Z start
        toolpath.push({
          type: 'rapid',
          x: currentRadius + 0.05,
          z: startZ
        });

        // Feed to depth
        toolpath.push({
          type: 'feed',
          x: targetRadius,
          z: startZ,
          f: feedRate * 0.5
        });

        // Cut along Z
        toolpath.push({
          type: 'feed',
          x: targetRadius,
          z: endZ,
          f: feedRate
        });

        // Clear out at 45 degrees
        toolpath.push({
          type: 'feed',
          x: targetRadius + actualDoc,
          z: endZ - actualDoc,
          f: feedRate
        });

        // Rapid retract
        toolpath.push({
          type: 'rapid',
          x: safeX || (startDiameter / 2) + 0.5,
          z: endZ - actualDoc
        });

        currentRadius = targetRadius;
      }
      return {
        type: 'od_rough',
        toolpath,
        stats: {
          passes,
          materialRemoved: Math.PI * (Math.pow(startDiameter/2, 2) - Math.pow(endDiameter/2, 2)) * Math.abs(endZ - startZ),
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate OD finishing toolpath
     */
    odFinish(params) {
      const {
        diameter,
        startZ,
        endZ,
        feedRate = 0.006,    // Fine IPR
        springPasses = 1,    // Number of spring passes
        safeX
      } = params;

      const toolpath = [];
      const radius = diameter / 2;

      // Main pass + spring passes
      for (let pass = 0; pass <= springPasses; pass++) {
        // Rapid to start
        toolpath.push({
          type: 'rapid',
          x: radius + 0.02,
          z: startZ + 0.05
        });

        // Plunge to diameter
        toolpath.push({
          type: 'feed',
          x: radius,
          z: startZ + 0.05,
          f: feedRate * 0.3
        });

        // Feed along Z
        toolpath.push({
          type: 'feed',
          x: radius,
          z: startZ,
          f: feedRate
        });

        toolpath.push({
          type: 'feed',
          x: radius,
          z: endZ,
          f: feedRate
        });

        // Retract
        toolpath.push({
          type: 'rapid',
          x: safeX || radius + 0.5,
          z: endZ
        });
      }
      return {
        type: 'od_finish',
        toolpath,
        stats: {
          passes: 1 + springPasses,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate ID (Internal Diameter) boring toolpath
     */
    idBore(params) {
      const {
        startDiameter,
        endDiameter,
        startZ,
        endZ,
        depthOfCut = 0.05,
        feedRate = 0.008,
        minBore = 0.25        // Minimum bore diameter for tool clearance
      } = params;

      const toolpath = [];
      const totalStock = (endDiameter - startDiameter) / 2;
      const passes = Math.ceil(totalStock / depthOfCut);
      const actualDoc = totalStock / passes;

      let currentRadius = startDiameter / 2;

      for (let pass = 1; pass <= passes; pass++) {
        const targetRadius = (startDiameter / 2) + (actualDoc * pass);

        // Rapid to center
        toolpath.push({
          type: 'rapid',
          x: 0,
          z: startZ + 0.1
        });

        // Move to start position inside bore
        toolpath.push({
          type: 'rapid',
          x: currentRadius - 0.02,
          z: startZ + 0.05
        });

        // Position at Z start
        toolpath.push({
          type: 'rapid',
          x: currentRadius - 0.02,
          z: startZ
        });

        // Feed to diameter
        toolpath.push({
          type: 'feed',
          x: targetRadius,
          z: startZ,
          f: feedRate * 0.5
        });

        // Bore along Z
        toolpath.push({
          type: 'feed',
          x: targetRadius,
          z: endZ,
          f: feedRate
        });

        // Retract to center
        toolpath.push({
          type: 'rapid',
          x: targetRadius - 0.02,
          z: endZ
        });

        toolpath.push({
          type: 'rapid',
          x: 0,
          z: endZ
        });

        currentRadius = targetRadius;
      }
      return {
        type: 'id_bore',
        toolpath,
        stats: {
          passes,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    _estimateTime(toolpath, feedRate) {
      let time = 0;
      let lastPoint = null;
      const rapidRate = 200; // IPM for rapids

      for (const move of toolpath) {
        if (lastPoint) {
          const dx = (move.x || 0) - (lastPoint.x || 0);
          const dz = (move.z || 0) - (lastPoint.z || 0);
          const dist = Math.sqrt(dx*dx + dz*dz);

          if (move.type === 'rapid') {
            time += dist / rapidRate;
          } else {
            // For turning, feed is in IPR, need RPM context
            // Estimate assuming 1000 RPM average
            const effectiveFeed = (move.f || feedRate) * 1000;
            time += dist / effectiveFeed;
          }
        }
        lastPoint = move;
      }
      return Math.round(time * 60); // Return seconds
    }
  },
  // FACING OPERATIONS

  facing: {
    /**
     * Generate face turning toolpath
     */
    face(params) {
      const {
        outerDiameter,
        innerDiameter = 0,
        depth = 0.02,
        feedRate = 0.010,
        depthOfCut = 0.05,
        startZ = 0
      } = params;

      const toolpath = [];
      const passes = Math.ceil(depth / depthOfCut);
      const actualDoc = depth / passes;

      for (let pass = 1; pass <= passes; pass++) {
        const currentZ = startZ - (actualDoc * pass);

        // Start at outer diameter
        toolpath.push({
          type: 'rapid',
          x: outerDiameter / 2 + 0.05,
          z: currentZ + 0.02
        });

        // Position at Z
        toolpath.push({
          type: 'feed',
          x: outerDiameter / 2 + 0.05,
          z: currentZ,
          f: feedRate * 0.3
        });

        // Face inward
        toolpath.push({
          type: 'feed',
          x: innerDiameter / 2,
          z: currentZ,
          f: feedRate
        });

        // Retract
        toolpath.push({
          type: 'rapid',
          x: innerDiameter / 2,
          z: currentZ + 0.1
        });
      }
      return {
        type: 'face',
        toolpath,
        stats: {
          passes,
          estimatedTime: this.turning._estimateTime(toolpath, feedRate)
        }
      };
    }
  },
  // GROOVING OPERATIONS

  grooving: {
    /**
     * Generate OD groove toolpath
     */
    odGroove(params) {
      const {
        position,           // Z position of groove
        diameter,           // OD of part
        grooveDepth,        // How deep into part
        grooveWidth,        // Width of groove
        toolWidth,          // Width of grooving tool
        feedRate = 0.003,
        peckDepth = 0.02    // Peck increment
      } = params;

      const toolpath = [];
      const finalRadius = (diameter / 2) - grooveDepth;
      const pecks = Math.ceil(grooveDepth / peckDepth);
      const actualPeck = grooveDepth / pecks;

      // If groove wider than tool, need multiple plunges
      const plunges = Math.ceil(grooveWidth / toolWidth);
      const plungeSpacing = grooveWidth / plunges;

      for (let p = 0; p < plunges; p++) {
        const plungeZ = position - (p * plungeSpacing);
        let currentRadius = diameter / 2;

        for (let peck = 1; peck <= pecks; peck++) {
          const targetRadius = (diameter / 2) - (actualPeck * peck);

          // Rapid to position
          toolpath.push({
            type: 'rapid',
            x: currentRadius + 0.02,
            z: plungeZ
          });

          // Plunge
          toolpath.push({
            type: 'feed',
            x: targetRadius,
            z: plungeZ,
            f: feedRate
          });

          // Dwell for chip break
          toolpath.push({
            type: 'dwell',
            x: targetRadius,
            z: plungeZ,
            dwell: 0.5
          });

          // Retract for chip clear
          toolpath.push({
            type: 'rapid',
            x: currentRadius + 0.02,
            z: plungeZ
          });

          currentRadius = targetRadius;
        }
      }
      return {
        type: 'od_groove',
        toolpath,
        stats: {
          plunges,
          pecks,
          estimatedTime: this.turning._estimateTime(toolpath, feedRate)
        }
      };
    }
  },
  // THREADING OPERATIONS

  threading: {
    /**
     * Generate external thread toolpath
     */
    externalThread(params) {
      const {
        majorDiameter,
        minorDiameter,
        pitch,              // Thread pitch (mm or TPI)
        startZ,
        length,
        passes = 6,         // Number of thread passes
        infeedAngle = 29.5  // Compound infeed angle
      } = params;

      const toolpath = [];
      const threadDepth = (majorDiameter - minorDiameter) / 2;
      const endZ = startZ - length;

      // Calculate infeed per pass (decreasing cuts)
      const infeedSchedule = this._calculateInfeedSchedule(threadDepth, passes);

      for (let pass = 0; pass < passes; pass++) {
        const infeed = infeedSchedule[pass];
        const currentRadius = (majorDiameter / 2) - infeed;

        // Compound infeed offset
        const zOffset = infeed * Math.tan(infeedAngle * Math.PI / 180);

        // Rapid to start
        toolpath.push({
          type: 'rapid',
          x: majorDiameter / 2 + 0.1,
          z: startZ + pitch + zOffset
        });

        // Position at depth
        toolpath.push({
          type: 'rapid',
          x: currentRadius,
          z: startZ + pitch + zOffset
        });

        // Thread pass (G32 or G76 style)
        toolpath.push({
          type: 'thread',
          x: currentRadius,
          z: endZ - pitch,
          pitch: pitch,
          f: pitch  // Feed = pitch for threading
        });

        // Retract
        toolpath.push({
          type: 'rapid',
          x: majorDiameter / 2 + 0.1,
          z: endZ - pitch
        });
      }
      // Spring passes (2 passes at full depth)
      for (let spring = 0; spring < 2; spring++) {
        const currentRadius = minorDiameter / 2;

        toolpath.push({
          type: 'rapid',
          x: majorDiameter / 2 + 0.1,
          z: startZ + pitch
        });

        toolpath.push({
          type: 'rapid',
          x: currentRadius,
          z: startZ + pitch
        });

        toolpath.push({
          type: 'thread',
          x: currentRadius,
          z: endZ - pitch,
          pitch: pitch,
          f: pitch
        });

        toolpath.push({
          type: 'rapid',
          x: majorDiameter / 2 + 0.1,
          z: endZ - pitch
        });
      }
      return {
        type: 'external_thread',
        toolpath,
        stats: {
          passes: passes + 2,
          threadDepth,
          estimatedTime: (passes + 2) * (length / pitch / 1000) * 60 // Rough estimate
        }
      };
    },
    _calculateInfeedSchedule(totalDepth, passes) {
      // Square root infeed schedule (decreasing cuts)
      const schedule = [];
      for (let i = 1; i <= passes; i++) {
        const cumulativeDepth = totalDepth * Math.sqrt(i / passes);
        schedule.push(cumulativeDepth);
      }
      return schedule;
    }
  },
  /**
   * Generate complete lathe program
   */
  generate(operation, params) {
    console.log('[LATHE_TOOLPATH] Generating:', operation);

    switch (operation) {
      case 'od_rough':
      case 'turn_rough':
        return this.turning.odRough(params);
      case 'od_finish':
      case 'turn_finish':
        return this.turning.odFinish(params);
      case 'id_bore':
      case 'bore':
        return this.turning.idBore(params);
      case 'face':
        return this.facing.face(params);
      case 'groove':
      case 'od_groove':
        return this.grooving.odGroove(params);
      case 'thread':
      case 'external_thread':
        return this.threading.externalThread(params);
      default:
        console.warn('[LATHE_TOOLPATH] Unknown operation:', operation);
        return { type: operation, toolpath: [], stats: {} };
    }
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_LATHE_TOOLPATH_ENGINE] v1.0 initialized');
    console.log('  Operations: OD rough/finish, ID bore, face, groove, thread');
    return this;
  }
}