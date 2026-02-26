const PRISM_ENHANCED_TOOLPATH_GENERATOR = {
  version: '3.0.0',

  // Generate 2D pocket toolpath with REAL coordinates
  generatePocket: function(params) {
    const {
      boundary = { minX: 0, maxX: 100, minY: 0, maxY: 50 },
      islands = [],
      toolDiameter = 10,
      stepover = 0.4,  // As fraction of tool diameter
      depth = 5,
      stepdown = 2,
      safeZ = 5,
      feedRate = 1000,
      plungeRate = 300,
      pattern = 'zigzag'  // 'zigzag', 'spiral', 'parallel'
    } = params;

    const toolpath = {
      type: 'pocket',
      tool: { diameter: toolDiameter },
      moves: [],
      statistics: {
        totalMoves: 0,
        rapidMoves: 0,
        feedMoves: 0,
        totalDistance: 0,
        estimatedTime: 0
      }
    };
    const stepoverDist = toolDiameter * stepover;
    const toolRadius = toolDiameter / 2;
    const passes = Math.ceil(depth / stepdown);

    // Generate passes
    for (let pass = 1; pass <= passes; pass++) {
      const currentZ = -Math.min(pass * stepdown, depth);

      // Calculate offset boundary for tool radius
      const offsetBound = {
        minX: boundary.minX + toolRadius,
        maxX: boundary.maxX - toolRadius,
        minY: boundary.minY + toolRadius,
        maxY: boundary.maxY - toolRadius
      };
      if (pattern === 'zigzag') {
        // Zigzag pattern
        let y = offsetBound.minY;
        let direction = 1; // 1 = right, -1 = left

        // Rapid to start
        toolpath.moves.push({
          type: 'rapid',
          x: direction === 1 ? offsetBound.minX : offsetBound.maxX,
          y: y,
          z: safeZ
        });

        // Plunge
        toolpath.moves.push({
          type: 'feed',
          x: direction === 1 ? offsetBound.minX : offsetBound.maxX,
          y: y,
          z: currentZ,
          f: plungeRate
        });

        while (y <= offsetBound.maxY) {
          // Cut across
          toolpath.moves.push({
            type: 'feed',
            x: direction === 1 ? offsetBound.maxX : offsetBound.minX,
            y: y,
            z: currentZ,
            f: feedRate
          });

          // Step over
          y += stepoverDist;
          if (y <= offsetBound.maxY) {
            toolpath.moves.push({
              type: 'feed',
              x: direction === 1 ? offsetBound.maxX : offsetBound.minX,
              y: y,
              z: currentZ,
              f: feedRate * 0.5
            });
          }
          direction *= -1;
        }
      } else if (pattern === 'spiral') {
        // Spiral inward pattern
        let currentBound = { ...offsetBound };

        // Start at outside
        toolpath.moves.push({
          type: 'rapid',
          x: currentBound.minX,
          y: currentBound.minY,
          z: safeZ
        });

        // Plunge
        toolpath.moves.push({
          type: 'feed',
          x: currentBound.minX,
          y: currentBound.minY,
          z: currentZ,
          f: plungeRate
        });

        while (currentBound.maxX - currentBound.minX > stepoverDist * 2 &&
               currentBound.maxY - currentBound.minY > stepoverDist * 2) {
          // Bottom edge
          toolpath.moves.push({ type: 'feed', x: currentBound.maxX, y: currentBound.minY, z: currentZ, f: feedRate });
          // Right edge
          toolpath.moves.push({ type: 'feed', x: currentBound.maxX, y: currentBound.maxY, z: currentZ, f: feedRate });
          // Top edge
          toolpath.moves.push({ type: 'feed', x: currentBound.minX, y: currentBound.maxY, z: currentZ, f: feedRate });
          // Left edge
          currentBound.minX += stepoverDist;
          currentBound.maxX -= stepoverDist;
          currentBound.minY += stepoverDist;
          currentBound.maxY -= stepoverDist;
          toolpath.moves.push({ type: 'feed', x: currentBound.minX, y: currentBound.minY + stepoverDist, z: currentZ, f: feedRate });
        }
      }
      // Retract after pass
      toolpath.moves.push({
        type: 'rapid',
        x: toolpath.moves[toolpath.moves.length - 1].x,
        y: toolpath.moves[toolpath.moves.length - 1].y,
        z: safeZ
      });
    }
    // Calculate statistics
    let lastMove = { x: 0, y: 0, z: safeZ };
    for (const move of toolpath.moves) {
      toolpath.statistics.totalMoves++;
      if (move.type === 'rapid') toolpath.statistics.rapidMoves++;
      else toolpath.statistics.feedMoves++;

      const dist = Math.sqrt(
        Math.pow((move.x || lastMove.x) - lastMove.x, 2) +
        Math.pow((move.y || lastMove.y) - lastMove.y, 2) +
        Math.pow((move.z || lastMove.z) - lastMove.z, 2)
      );
      toolpath.statistics.totalDistance += dist;

      if (move.type === 'feed') {
        toolpath.statistics.estimatedTime += dist / (move.f || feedRate);
      } else {
        toolpath.statistics.estimatedTime += dist / 5000; // Rapid rate assumed
      }
      lastMove = { x: move.x || lastMove.x, y: move.y || lastMove.y, z: move.z || lastMove.z };
    }
    return toolpath;
  },
  // Generate contour/profile toolpath
  generateContour: function(params) {
    const {
      points = [],  // Array of {x, y} points
      depth = 5,
      stepdown = 2,
      toolDiameter = 10,
      compensation = 'left',  // 'left', 'right', 'none'
      safeZ = 5,
      feedRate = 800,
      plungeRate = 200,
      leadIn = { type: 'arc', radius: 5 },
      closed = true
    } = params;

    if (points.length < 2) {
      return { error: 'At least 2 points required for contour' };
    }
    const toolpath = {
      type: 'contour',
      tool: { diameter: toolDiameter },
      moves: [],
      statistics: { totalMoves: 0, rapidMoves: 0, feedMoves: 0, totalDistance: 0, estimatedTime: 0 }
    };
    const toolRadius = toolDiameter / 2;
    const passes = Math.ceil(depth / stepdown);

    // Calculate offset points based on compensation
    const offsetPoints = points.map((pt, i) => {
      if (compensation === 'none') return pt;

      // Calculate normal vector
      const prev = points[(i - 1 + points.length) % points.length];
      const next = points[(i + 1) % points.length];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      const nx = -dy / len;  // Normal
      const ny = dx / len;

      const sign = compensation === 'left' ? 1 : -1;
      return {
        x: pt.x + nx * toolRadius * sign,
        y: pt.y + ny * toolRadius * sign
      };
    });

    for (let pass = 1; pass <= passes; pass++) {
      const currentZ = -Math.min(pass * stepdown, depth);

      // Lead-in
      if (leadIn.type === 'arc') {
        const firstPt = offsetPoints[0];
        const secondPt = offsetPoints[1];
        const dx = secondPt.x - firstPt.x;
        const dy = secondPt.y - firstPt.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;

        const leadStart = {
          x: firstPt.x - (dx / len) * leadIn.radius - (dy / len) * leadIn.radius * (compensation === 'left' ? 1 : -1),
          y: firstPt.y - (dy / len) * leadIn.radius + (dx / len) * leadIn.radius * (compensation === 'left' ? 1 : -1)
        };
        toolpath.moves.push({ type: 'rapid', x: leadStart.x, y: leadStart.y, z: safeZ });
        toolpath.moves.push({ type: 'feed', x: leadStart.x, y: leadStart.y, z: currentZ, f: plungeRate });
        toolpath.moves.push({
          type: 'arc',
          x: firstPt.x,
          y: firstPt.y,
          z: currentZ,
          i: (firstPt.x - leadStart.x) / 2,
          j: (firstPt.y - leadStart.y) / 2,
          direction: compensation === 'left' ? 'CW' : 'CCW',
          f: feedRate * 0.5
        });
      } else {
        toolpath.moves.push({ type: 'rapid', x: offsetPoints[0].x, y: offsetPoints[0].y, z: safeZ });
        toolpath.moves.push({ type: 'feed', x: offsetPoints[0].x, y: offsetPoints[0].y, z: currentZ, f: plungeRate });
      }
      // Cut contour
      for (let i = 1; i < offsetPoints.length; i++) {
        toolpath.moves.push({
          type: 'feed',
          x: offsetPoints[i].x,
          y: offsetPoints[i].y,
          z: currentZ,
          f: feedRate
        });
      }
      // Close if needed
      if (closed) {
        toolpath.moves.push({
          type: 'feed',
          x: offsetPoints[0].x,
          y: offsetPoints[0].y,
          z: currentZ,
          f: feedRate
        });
      }
      // Retract
      toolpath.moves.push({
        type: 'rapid',
        x: toolpath.moves[toolpath.moves.length - 1].x,
        y: toolpath.moves[toolpath.moves.length - 1].y,
        z: safeZ
      });
    }
    // Calculate statistics
    let lastMove = { x: 0, y: 0, z: safeZ };
    for (const move of toolpath.moves) {
      toolpath.statistics.totalMoves++;
      if (move.type === 'rapid') toolpath.statistics.rapidMoves++;
      else toolpath.statistics.feedMoves++;

      const dist = Math.sqrt(
        Math.pow((move.x || lastMove.x) - lastMove.x, 2) +
        Math.pow((move.y || lastMove.y) - lastMove.y, 2) +
        Math.pow((move.z || lastMove.z) - lastMove.z, 2)
      );
      toolpath.statistics.totalDistance += dist;
      lastMove = { x: move.x || lastMove.x, y: move.y || lastMove.y, z: move.z || lastMove.z };
    }
    return toolpath;
  },
  // Generate drilling pattern
  generateDrilling: function(params) {
    const {
      holes = [],  // Array of {x, y, depth}
      peckDepth = 3,
      safeZ = 5,
      rapidZ = 2,
      feedRate = 150,
      retractAmount = 1,
      cycleType = 'peck'  // 'simple', 'peck', 'chipbreak'
    } = params;

    const toolpath = {
      type: 'drilling',
      cycleType: cycleType,
      moves: [],
      statistics: { totalMoves: 0, holes: holes.length, estimatedTime: 0 }
    };
    for (const hole of holes) {
      const holeDepth = hole.depth || 10;

      // Rapid to hole position
      toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: safeZ });
      toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: rapidZ });

      if (cycleType === 'simple') {
        // Simple drill - straight plunge
        toolpath.moves.push({ type: 'feed', x: hole.x, y: hole.y, z: -holeDepth, f: feedRate });
        toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: rapidZ });
      } else if (cycleType === 'peck') {
        // Peck drill - full retract between pecks
        let currentZ = 0;
        while (currentZ > -holeDepth) {
          currentZ = Math.max(currentZ - peckDepth, -holeDepth);
          toolpath.moves.push({ type: 'feed', x: hole.x, y: hole.y, z: currentZ, f: feedRate });
          if (currentZ > -holeDepth) {
            toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: rapidZ });
            toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: currentZ + retractAmount });
          }
        }
        toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: rapidZ });
      } else if (cycleType === 'chipbreak') {
        // Chip break - small retract between pecks
        let currentZ = 0;
        while (currentZ > -holeDepth) {
          currentZ = Math.max(currentZ - peckDepth, -holeDepth);
          toolpath.moves.push({ type: 'feed', x: hole.x, y: hole.y, z: currentZ, f: feedRate });
          if (currentZ > -holeDepth) {
            toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: currentZ + retractAmount * 0.2 });
          }
        }
        toolpath.moves.push({ type: 'rapid', x: hole.x, y: hole.y, z: rapidZ });
      }
      toolpath.statistics.totalMoves = toolpath.moves.length;
    }
    return toolpath;
  },
  // Convert toolpath to G-code
  toGCode: function(toolpath, options = {}) {
    const {
      lineNumbers = true,
      lineIncrement = 10,
      decimals = 3,
      controller = 'fanuc'
    } = options;

    const gcode = [];
    let lineNum = 10;

    const addLine = (code) => {
      if (lineNumbers) {
        gcode.push(`N${lineNum} ${code}`);
        lineNum += lineIncrement;
      } else {
        gcode.push(code);
      }
    };
    // Header
    addLine('G90 G94 G17');  // Absolute, feed/min, XY plane
    addLine('G21');  // Metric (or G20 for inch)

    for (const move of toolpath.moves) {
      const x = move.x !== undefined ? ` X${move.x.toFixed(decimals)}` : '';
      const y = move.y !== undefined ? ` Y${move.y.toFixed(decimals)}` : '';
      const z = move.z !== undefined ? ` Z${move.z.toFixed(decimals)}` : '';
      const f = move.f !== undefined ? ` F${Math.round(move.f)}` : '';

      if (move.type === 'rapid') {
        addLine(`G0${x}${y}${z}`);
      } else if (move.type === 'feed') {
        addLine(`G1${x}${y}${z}${f}`);
      } else if (move.type === 'arc') {
        const i = move.i !== undefined ? ` I${move.i.toFixed(decimals)}` : '';
        const j = move.j !== undefined ? ` J${move.j.toFixed(decimals)}` : '';
        const gcode_arc = move.direction === 'CW' ? 'G2' : 'G3';
        addLine(`${gcode_arc}${x}${y}${z}${i}${j}${f}`);
      }
    }
    return gcode.join('\n');
  }
}