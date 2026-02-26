const PRISM_5AXIS_BLISK_CAM_ENGINE = {
  version: '1.0.0',

  /**
   * Generate complete blisk machining sequence
   */
  generateBliskProgram(blisk, options = {}) {
    const {
      roughingTool = { diameter: 6, cornerRadius: 0.5, type: 'ball', fluteLength: 25 },
      finishingTool = { diameter: 4, cornerRadius: 0, type: 'ball', fluteLength: 30 },
      stockAllowance = 0.5,
      finishAllowance = 0.1,
      roughingStepover = 0.4,    // As fraction of tool diameter
      finishingStepover = 0.15,
      channelFirst = true,       // Machine channels before blades
      bidirectional = true,      // Bidirectional roughing
      linkHeight = 5.0,          // Safe height for link moves (above stock)
      maxTilt = 30,              // Maximum tool tilt angle
      machine = null             // Machine configuration for kinematic validation
    } = options;

    const program = {
      type: 'BLISK_5AXIS_PROGRAM',
      operations: [],
      statistics: {
        totalTime: 0,
        roughingTime: 0,
        finishingTime: 0,
        toolChanges: 0,
        linkMoves: 0
      }
    };
    // Get blade geometry
    const bladeCount = blisk.blades?.length || 0;
    const channelCount = bladeCount;  // One channel between each pair of blades

    // Phase 1: Channel Roughing
    for (let ch = 0; ch < channelCount; ch++) {
      const blade1 = blisk.blades[ch];
      const blade2 = blisk.blades[(ch + 1) % bladeCount];

      const channelRoughing = this._generateChannelRoughing({
        blade1,
        blade2,
        hub: blisk.disk,
        tool: roughingTool,
        stockAllowance,
        stepover: roughingStepover * roughingTool.diameter,
        bidirectional,
        maxTilt,
        channelIndex: ch
      });

      program.operations.push({
        type: 'CHANNEL_ROUGHING',
        channelIndex: ch,
        toolpath: channelRoughing,
        tool: roughingTool
      });

      program.statistics.roughingTime += channelRoughing.cycleTime;

      // Link move to next channel
      if (ch < channelCount - 1) {
        const linkMove = this._generateChannelLink(channelRoughing, ch + 1, linkHeight, blisk);
        program.operations.push({
          type: 'LINK_MOVE',
          from: ch,
          to: ch + 1,
          path: linkMove
        });
        program.statistics.linkMoves++;
      }
    }
    // Phase 2: Blade Semi-Finish
    for (let b = 0; b < bladeCount; b++) {
      const blade = blisk.blades[b];

      const bladeSemiFinish = this._generateBladeSemiFinish({
        blade,
        hub: blisk.disk,
        tool: finishingTool,
        stockAllowance: finishAllowance,
        stepover: finishingStepover * finishingTool.diameter * 1.5,
        maxTilt,
        bladeIndex: b
      });

      program.operations.push({
        type: 'BLADE_SEMI_FINISH',
        bladeIndex: b,
        toolpath: bladeSemiFinish,
        tool: finishingTool
      });
    }
    // Phase 3: Blade Finishing (Pressure and Suction sides)
    for (let b = 0; b < bladeCount; b++) {
      const blade = blisk.blades[b];

      // Pressure side finishing
      const pressureFinish = this._generateBladeFinishing({
        blade,
        side: 'pressure',
        tool: finishingTool,
        stepover: finishingStepover * finishingTool.diameter,
        maxTilt,
        bladeIndex: b
      });

      program.operations.push({
        type: 'BLADE_FINISH_PRESSURE',
        bladeIndex: b,
        toolpath: pressureFinish,
        tool: finishingTool
      });

      // Suction side finishing
      const suctionFinish = this._generateBladeFinishing({
        blade,
        side: 'suction',
        tool: finishingTool,
        stepover: finishingStepover * finishingTool.diameter,
        maxTilt,
        bladeIndex: b
      });

      program.operations.push({
        type: 'BLADE_FINISH_SUCTION',
        bladeIndex: b,
        toolpath: suctionFinish,
        tool: finishingTool
      });

      program.statistics.finishingTime += pressureFinish.cycleTime + suctionFinish.cycleTime;
    }
    // Phase 4: Fillet Finishing
    for (let b = 0; b < bladeCount; b++) {
      const filletFinish = this._generateFilletFinishing({
        blade: blisk.blades[b],
        fillet: blisk.fillets?.[b],
        hub: blisk.disk,
        tool: finishingTool,
        stepover: finishingStepover * finishingTool.diameter * 0.5,
        maxTilt,
        bladeIndex: b
      });

      program.operations.push({
        type: 'FILLET_FINISH',
        bladeIndex: b,
        toolpath: filletFinish,
        tool: finishingTool
      });
    }
    // Phase 5: Leading/Trailing Edge Finishing
    for (let b = 0; b < bladeCount; b++) {
      const edgeFinish = this._generateEdgeFinishing({
        blade: blisk.blades[b],
        tool: finishingTool,
        stepover: finishingStepover * finishingTool.diameter * 0.3,
        bladeIndex: b
      });

      program.operations.push({
        type: 'EDGE_FINISH',
        bladeIndex: b,
        toolpath: edgeFinish,
        tool: finishingTool
      });
    }
    // Calculate total time
    program.statistics.totalTime = program.statistics.roughingTime + program.statistics.finishingTime;
    program.statistics.toolChanges = 2;  // Roughing and finishing tools

    return program;
  },
  /**
   * Generate channel roughing toolpath between two adjacent blades
   */
  _generateChannelRoughing(params) {
    const {
      blade1, blade2, hub, tool, stockAllowance, stepover, bidirectional, maxTilt, channelIndex
    } = params;

    const toolpath = {
      type: 'CHANNEL_ROUGHING_5AXIS',
      points: [],
      cycleTime: 0
    };
    // Get channel geometry bounds
    const channelDepth = blade1.bladeHeight || 50;
    const channelWidth = this._calculateChannelWidth(blade1, blade2);

    // Calculate number of passes based on channel depth and tool diameter
    const effectiveDoc = tool.fluteLength * 0.8;  // Use 80% of flute length
    const zPasses = Math.ceil(channelDepth / effectiveDoc);

    // Calculate number of lateral passes
    const effectiveWidth = channelWidth - 2 * stockAllowance - tool.diameter;
    const lateralPasses = Math.ceil(effectiveWidth / stepover);

    // Generate roughing passes from top to bottom
    for (let zPass = 0; zPass < zPasses; zPass++) {
      const zLevel = channelDepth - (zPass + 1) * effectiveDoc;
      const isLastZ = zPass === zPasses - 1;

      // Generate lateral passes at this Z level
      for (let latPass = 0; latPass < lateralPasses; latPass++) {
        const lateralOffset = stockAllowance + tool.diameter / 2 + latPass * stepover;
        const direction = bidirectional && latPass % 2 === 1 ? -1 : 1;

        // Generate path along channel at this lateral offset
        const passPoints = this._generateChannelPass({
          blade1, blade2, hub,
          zLevel,
          lateralOffset,
          direction,
          tool,
          stockAllowance,
          maxTilt
        });

        toolpath.points.push(...passPoints);
      }
      // Retract between Z levels
      if (!isLastZ) {
        const lastPoint = toolpath.points[toolpath.points.length - 1];
        if (lastPoint) {
          toolpath.points.push({
            ...lastPoint,
            z: lastPoint.z + 5,  // Small retract
            type: 'RETRACT'
          });
        }
      }
    }
    // Estimate cycle time (simplified)
    const totalLength = this._calculatePathLength(toolpath.points);
    const feedRate = 1000;  // mm/min typical for roughing
    toolpath.cycleTime = totalLength / feedRate;

    return toolpath;
  },
  /**
   * Generate single channel pass at given Z level and lateral offset
   */
  _generateChannelPass(params) {
    const { blade1, blade2, hub, zLevel, lateralOffset, direction, tool, stockAllowance, maxTilt } = params;

    const points = [];
    const divisions = 50;  // Points along channel

    for (let i = 0; i <= divisions; i++) {
      const t = direction > 0 ? i / divisions : 1 - i / divisions;  // 0 to 1 along channel

      // Calculate position between blades at this span position
      const blade1Point = this._getBladePointAtSpan(blade1, t, 'pressure');
      const blade2Point = this._getBladePointAtSpan(blade2, t, 'suction');

      // Interpolate between blades based on lateral offset
      const totalWidth = Math.sqrt(
        Math.pow(blade2Point.x - blade1Point.x, 2) +
        Math.pow(blade2Point.y - blade1Point.y, 2)
      );
      const blendFactor = Math.min(1, Math.max(0, lateralOffset / totalWidth));

      const x = blade1Point.x + blendFactor * (blade2Point.x - blade1Point.x);
      const y = blade1Point.y + blendFactor * (blade2Point.y - blade1Point.y);
      const z = Math.max(zLevel, hub?.zLevel || 0) + stockAllowance;

      // Calculate tool axis (tilted toward channel center for better access)
      const channelCenterX = (blade1Point.x + blade2Point.x) / 2;
      const channelCenterY = (blade1Point.y + blade2Point.y) / 2;

      const tiltTowardCenter = Math.min(maxTilt, 15) * Math.PI / 180;
      const tiltDirX = channelCenterX - x;
      const tiltDirY = channelCenterY - y;
      const tiltDirLen = Math.sqrt(tiltDirX * tiltDirX + tiltDirY * tiltDirY);

      let toolAxis = { x: 0, y: 0, z: 1 };  // Default vertical
      if (tiltDirLen > 0.1) {
        toolAxis = {
          x: Math.sin(tiltTowardCenter) * tiltDirX / tiltDirLen,
          y: Math.sin(tiltTowardCenter) * tiltDirY / tiltDirLen,
          z: Math.cos(tiltTowardCenter)
        };
      }
      points.push({
        x, y, z,
        i: toolAxis.x,
        j: toolAxis.y,
        k: toolAxis.z,
        t,
        type: 'CUT'
      });
    }
    return points;
  },
  /**
   * Generate blade finishing toolpath (flowline strategy)
   */
  _generateBladeFinishing(params) {
    const { blade, side, tool, stepover, maxTilt, bladeIndex } = params;

    const toolpath = {
      type: `BLADE_FINISH_${side.toUpperCase()}`,
      points: [],
      cycleTime: 0
    };
    // Get blade surface
    const surface = side === 'pressure' ? blade.pressureSurface : blade.suctionSurface;

    // Generate flowline paths from hub to tip
    const spanDivisions = Math.ceil(blade.bladeHeight / stepover);
    const chordDivisions = 80;

    for (let s = 0; s <= spanDivisions; s++) {
      const span = s / spanDivisions;  // 0 at hub, 1 at tip
      const direction = s % 2 === 0 ? 1 : -1;  // Bidirectional for efficiency

      for (let c = 0; c <= chordDivisions; c++) {
        const chord = direction > 0 ? c / chordDivisions : 1 - c / chordDivisions;

        // Evaluate surface point
        const pt = surface?.evaluate?.(chord, span) ||
                   this._approximateBladeSurfacePoint(blade, side, chord, span);

        // Get surface normal for tool axis
        const normal = surface?.normal?.(chord, span) ||
                       this._approximateBladeSurfaceNormal(blade, side, chord, span);

        // Apply lead/tilt for better cutting
        const leadAngle = 5 * Math.PI / 180;  // 5 degree lead
        const toolAxis = this._applyLeadAngle(normal, leadAngle, chord > 0.5 ? 1 : -1);

        // Validate tilt angle
        const tiltAngle = Math.acos(toolAxis.z) * 180 / Math.PI;
        if (tiltAngle > maxTilt) {
          // Adjust tool axis to stay within limits
          const scale = maxTilt / tiltAngle;
          toolAxis.x *= scale;
          toolAxis.y *= scale;
          toolAxis.z = Math.cos(maxTilt * Math.PI / 180);
        }
        toolpath.points.push({
          x: pt.x,
          y: pt.y,
          z: pt.z,
          i: toolAxis.x,
          j: toolAxis.y,
          k: toolAxis.z,
          span,
          chord,
          type: 'CUT'
        });
      }
      // Add small retract between passes
      if (s < spanDivisions) {
        const lastPt = toolpath.points[toolpath.points.length - 1];
        toolpath.points.push({
          ...lastPt,
          z: lastPt.z + 0.5,
          type: 'RETRACT'
        });
      }
    }
    // Estimate cycle time
    const totalLength = this._calculatePathLength(toolpath.points);
    const feedRate = 2000;  // mm/min for finishing
    toolpath.cycleTime = totalLength / feedRate;

    return toolpath;
  },
  /**
   * Generate fillet finishing toolpath
   */
  _generateFilletFinishing(params) {
    const { blade, fillet, hub, tool, stepover, maxTilt, bladeIndex } = params;

    const toolpath = {
      type: 'FILLET_FINISHING',
      points: [],
      cycleTime: 0
    };
    // Fillet typically follows blade root contour
    const chordDivisions = 60;
    const filletDivisions = 10;  // Across the fillet width

    for (let f = 0; f <= filletDivisions; f++) {
      const filletParam = f / filletDivisions;  // 0 at blade, 1 at hub
      const direction = f % 2 === 0 ? 1 : -1;

      for (let c = 0; c <= chordDivisions; c++) {
        const chord = direction > 0 ? c / chordDivisions : 1 - c / chordDivisions;

        // Get fillet point
        const filletRadius = fillet?.radius || 3.0;
        const filletAngle = filletParam * Math.PI / 2;  // 0 to 90 degrees

        // Calculate position on fillet arc
        const bladeRootPt = this._getBladePointAtSpan(blade, chord, 'pressure', 0);
        const pt = {
          x: bladeRootPt.x,
          y: bladeRootPt.y,
          z: bladeRootPt.z - filletRadius * (1 - Math.cos(filletAngle))
        };
        // Tool axis perpendicular to fillet surface
        const toolAxis = {
          x: 0,
          y: 0,
          z: 1
        };
        toolpath.points.push({
          ...pt,
          i: toolAxis.x,
          j: toolAxis.y,
          k: toolAxis.z,
          chord,
          filletParam,
          type: 'CUT'
        });
      }
    }
    const totalLength = this._calculatePathLength(toolpath.points);
    toolpath.cycleTime = totalLength / 1500;

    return toolpath;
  },
  /**
   * Generate leading/trailing edge finishing
   */
  _generateEdgeFinishing(params) {
    const { blade, tool, stepover, bladeIndex } = params;

    const toolpath = {
      type: 'EDGE_FINISHING',
      points: [],
      cycleTime: 0
    };
    // Leading edge path (from hub to tip)
    const spanDivisions = 40;

    // Leading edge
    for (let s = 0; s <= spanDivisions; s++) {
      const span = s / spanDivisions;
      const lePt = blade.leadingEdge?.evaluate?.(span) ||
                   this._getBladePointAtSpan(blade, 0, 'pressure', span);

      // Tool axis tangent to edge
      const nextPt = blade.leadingEdge?.evaluate?.(Math.min(1, span + 0.01)) ||
                     this._getBladePointAtSpan(blade, 0, 'pressure', Math.min(1, span + 0.01));

      const tangent = {
        x: nextPt.x - lePt.x,
        y: nextPt.y - lePt.y,
        z: nextPt.z - lePt.z
      };
      const tangentLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);

      // Tool perpendicular to edge tangent
      const toolAxis = tangentLen > 0.01 ? {
        x: -tangent.y / tangentLen,
        y: tangent.x / tangentLen,
        z: 0
      } : { x: 0, y: 0, z: 1 };

      toolpath.points.push({
        ...lePt,
        i: toolAxis.x,
        j: toolAxis.y,
        k: toolAxis.z,
        span,
        edge: 'leading',
        type: 'CUT'
      });
    }
    // Trailing edge (similar pattern)
    for (let s = spanDivisions; s >= 0; s--) {
      const span = s / spanDivisions;
      const tePt = blade.trailingEdge?.evaluate?.(span) ||
                   this._getBladePointAtSpan(blade, 1, 'pressure', span);

      toolpath.points.push({
        ...tePt,
        i: 0, j: 0, k: 1,
        span,
        edge: 'trailing',
        type: 'CUT'
      });
    }
    const totalLength = this._calculatePathLength(toolpath.points);
    toolpath.cycleTime = totalLength / 1000;

    return toolpath;
  },
  /**
   * Generate safe link move between channels
   */
  _generateChannelLink(fromPath, toChannel, linkHeight, blisk) {
    const lastPoint = fromPath.points[fromPath.points.length - 1];
    if (!lastPoint) return [];

    const toAngle = (toChannel / blisk.blades.length) * 2 * Math.PI;
    const radius = blisk.disk?.outerDiameter / 2 || 100;

    // Retract
    const retractPt = {
      x: lastPoint.x,
      y: lastPoint.y,
      z: lastPoint.z + linkHeight,
      i: 0, j: 0, k: 1,
      type: 'RAPID'
    };
    // Move to next channel entry
    const approachPt = {
      x: radius * Math.cos(toAngle),
      y: radius * Math.sin(toAngle),
      z: lastPoint.z + linkHeight,
      i: 0, j: 0, k: 1,
      type: 'RAPID'
    };
    // Plunge to start cutting
    const plungePt = {
      ...approachPt,
      z: lastPoint.z + 2,
      type: 'PLUNGE'
    };
    return [retractPt, approachPt, plungePt];
  },
  // Helper methods
  _calculateChannelWidth(blade1, blade2) {
    // Approximate channel width from blade positions
    const angle1 = blade1.angle || 0;
    const angle2 = blade2.angle || (angle1 + 10);
    const radius = blade1.diskRadius || 100;

    return 2 * radius * Math.sin((angle2 - angle1) * Math.PI / 360);
  },
  _getBladePointAtSpan(blade, chordPos, side, spanPos = 0.5) {
    // Get point on blade surface
    if (blade.pressureSurface?.evaluate && side === 'pressure') {
      return blade.pressureSurface.evaluate(chordPos, spanPos);
    }
    if (blade.suctionSurface?.evaluate && side === 'suction') {
      return blade.suctionSurface.evaluate(chordPos, spanPos);
    }
    // Fallback approximation
    const angle = blade.angle * Math.PI / 180;
    const radius = blade.diskRadius + spanPos * blade.bladeHeight;
    return {
      x: radius * Math.cos(angle) + chordPos * blade.rootChord * Math.cos(angle + Math.PI/2),
      y: radius * Math.sin(angle) + chordPos * blade.rootChord * Math.sin(angle + Math.PI/2),
      z: spanPos * blade.bladeHeight
    };
  },
  _approximateBladeSurfacePoint(blade, side, chord, span) {
    const offset = side === 'pressure' ? -1 : 1;
    const thickness = blade.bladeThickness || 2;

    return this._getBladePointAtSpan(blade, chord, side, span);
  },
  _approximateBladeSurfaceNormal(blade, side, chord, span) {
    const normal = side === 'pressure' ? { x: 0, y: -1, z: 0 } : { x: 0, y: 1, z: 0 };

    // Rotate by blade angle
    const angle = blade.angle * Math.PI / 180;
    return {
      x: normal.x * Math.cos(angle) - normal.y * Math.sin(angle),
      y: normal.x * Math.sin(angle) + normal.y * Math.cos(angle),
      z: normal.z
    };
  },
  _applyLeadAngle(normal, leadAngle, direction) {
    // Apply lead angle in feed direction
    const cos = Math.cos(leadAngle);
    const sin = Math.sin(leadAngle) * direction;

    return {
      x: normal.x * cos,
      y: normal.y * cos,
      z: normal.z * cos + sin
    };
  },
  _calculatePathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      const dz = points[i].z - points[i-1].z;
      length += Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    return length;
  },
  /**
   * Generate G-code from blisk program
   */
  generateGCode(program, postProcessor = 'FANUC_5AXIS') {
    const gcode = [];

    // Header
    gcode.push('%');
    gcode.push('O9212 (BLISK MACHINING PROGRAM)');
    gcode.push('(GENERATED BY PRISM v8.87.001)');
    gcode.push('G90 G94 G17');
    gcode.push('G21 (METRIC)');

    let currentTool = null;
    let opNumber = 1;

    program.operations.forEach(op => {
      // Tool change if needed
      if (op.tool && (!currentTool || op.tool.diameter !== currentTool.diameter)) {
        const toolNum = op.tool.type === 'ball' ? 1 : 2;
        gcode.push(`N${opNumber * 100} T${toolNum} M6`);
        gcode.push(`G43 H${toolNum}`);
        currentTool = op.tool;
        opNumber++;
      }
      // Operation header
      gcode.push(`(${op.type} - ${op.channelIndex !== undefined ? `CHANNEL ${op.channelIndex}` : `BLADE ${op.bladeIndex}`})`);

      // G43.4 for TCPC mode (5-axis)
      gcode.push('G43.4 H1');

      // Spindle on
      const rpm = op.type.includes('ROUGH') ? 8000 : 12000;
      gcode.push(`S${rpm} M3`);

      // Toolpath points
      if (op.toolpath?.points) {
        op.toolpath.points.forEach((pt, idx) => {
          if (pt.type === 'RAPID') {
            gcode.push(`G0 X${pt.x.toFixed(4)} Y${pt.y.toFixed(4)} Z${pt.z.toFixed(4)} A${this._calculateAAxis(pt).toFixed(4)} C${this._calculateCAxis(pt).toFixed(4)}`);
          } else {
            const feedRate = pt.type === 'PLUNGE' ? 500 : (op.type.includes('ROUGH') ? 1000 : 2000);
            gcode.push(`G1 X${pt.x.toFixed(4)} Y${pt.y.toFixed(4)} Z${pt.z.toFixed(4)} A${this._calculateAAxis(pt).toFixed(4)} C${this._calculateCAxis(pt).toFixed(4)} F${feedRate}`);
          }
        });
      }
      // Cancel TCPC
      gcode.push('G49');
      opNumber++;
    });

    // Footer
    gcode.push('M5');
    gcode.push('G91 G28 Z0');
    gcode.push('G28 X0 Y0');
    gcode.push('M30');
    gcode.push('%');

    return gcode.join('\n');
  },
  _calculateAAxis(pt) {
    // A axis (tilt) from tool axis vector
    const k = pt.k || 1;
    return Math.acos(Math.min(1, Math.max(-1, k))) * 180 / Math.PI;
  },
  _calculateCAxis(pt) {
    // C axis (rotation) from tool axis vector
    const i = pt.i || 0;
    const j = pt.j || 0;
    return Math.atan2(i, j) * 180 / Math.PI;
  }
}