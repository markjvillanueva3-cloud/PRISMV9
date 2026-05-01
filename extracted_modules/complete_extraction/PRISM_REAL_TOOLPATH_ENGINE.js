const PRISM_REAL_TOOLPATH_ENGINE = {
  version: '1.0.0',

  // TOOLPATH GENERATION ALGORITHMS

  generate2D: {
    /**
     * Generate face milling toolpath (zigzag pattern)
     */
    faceMill(params) {
      const {
        bounds,           // { minX, maxX, minY, maxY }
        toolDiameter,
        stepover = 0.7,   // 70% stepover default
        feedRate,
        rapidHeight = 0.5,
        depthOfCut,
        startZ,
        finalZ
      } = params;

      const toolpath = [];
      const effectiveStepover = toolDiameter * stepover;
      const overlap = toolDiameter * (1 - stepover) / 2;

      // Calculate passes needed
      const totalDepth = startZ - finalZ;
      const passes = Math.ceil(totalDepth / depthOfCut);
      const actualDoc = totalDepth / passes;

      // Generate zigzag pattern for each depth pass
      for (let pass = 1; pass <= passes; pass++) {
        const currentZ = startZ - (actualDoc * pass);
        let direction = 1; // 1 = forward, -1 = backward

        // Start position
        let y = bounds.minY - overlap;

        // Rapid to start
        toolpath.push({
          type: 'rapid',
          x: bounds.minX - toolDiameter/2,
          y: y,
          z: rapidHeight
        });

        // Plunge to depth
        toolpath.push({
          type: 'feed',
          x: bounds.minX - toolDiameter/2,
          y: y,
          z: currentZ,
          f: feedRate * 0.5 // Reduced plunge feed
        });

        // Zigzag across surface
        while (y <= bounds.maxY + overlap) {
          if (direction === 1) {
            toolpath.push({
              type: 'feed',
              x: bounds.maxX + toolDiameter/2,
              y: y,
              z: currentZ,
              f: feedRate
            });
          } else {
            toolpath.push({
              type: 'feed',
              x: bounds.minX - toolDiameter/2,
              y: y,
              z: currentZ,
              f: feedRate
            });
          }
          // Move to next row
          y += effectiveStepover;
          if (y <= bounds.maxY + overlap) {
            toolpath.push({
              type: 'feed',
              x: direction === 1 ? bounds.maxX + toolDiameter/2 : bounds.minX - toolDiameter/2,
              y: y,
              z: currentZ,
              f: feedRate
            });
          }
          direction *= -1;
        }
        // Retract
        toolpath.push({
          type: 'rapid',
          x: toolpath[toolpath.length-1].x,
          y: toolpath[toolpath.length-1].y,
          z: rapidHeight
        });
      }
      return {
        type: 'face_mill',
        toolpath,
        stats: {
          passes,
          totalMoves: toolpath.length,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate pocket toolpath (contour parallel / offset pattern)
     */
    pocket(params) {
      const {
        boundary,         // Array of {x, y} points defining pocket
        toolDiameter,
        stepover = 0.5,   // 50% stepover for pockets
        feedRate,
        rapidHeight = 0.5,
        depthOfCut,
        startZ,
        finalZ,
        direction = 'climb' // 'climb' or 'conventional'
      } = params;

      const toolpath = [];
      const toolRadius = toolDiameter / 2;
      const effectiveStepover = toolDiameter * stepover;

      // Calculate number of Z passes
      const totalDepth = startZ - finalZ;
      const zPasses = Math.ceil(totalDepth / depthOfCut);
      const actualDoc = totalDepth / zPasses;

      // Generate offset contours (pocket clearing)
      const generateOffsetContours = (boundary, maxOffset) => {
        const contours = [];
        let currentOffset = toolRadius;

        while (currentOffset < maxOffset) {
          const offsetContour = this._offsetPolygon(boundary, -currentOffset);
          if (offsetContour.length >= 3) {
            contours.push(offsetContour);
          } else {
            break; // Can't offset any more
          }
          currentOffset += effectiveStepover;
        }
        return direction === 'climb' ? contours : contours.reverse();
      };
      // Calculate max offset needed
      const bounds = this._getBounds(boundary);
      const maxOffset = Math.min(bounds.width, bounds.height) / 2;
      const contours = generateOffsetContours(boundary, maxOffset);

      // Generate toolpath for each Z level
      for (let zPass = 1; zPass <= zPasses; zPass++) {
        const currentZ = startZ - (actualDoc * zPass);

        // For each offset contour
        for (let i = 0; i < contours.length; i++) {
          const contour = contours[i];
          if (contour.length < 2) continue;

          // Rapid to start of contour
          toolpath.push({
            type: 'rapid',
            x: contour[0].x,
            y: contour[0].y,
            z: rapidHeight
          });

          // Ramp or plunge into material
          if (i === 0) {
            // Helical ramp for first contour
            const rampAngle = 3; // degrees
            const rampLength = actualDoc / Math.tan(rampAngle * Math.PI / 180);
            toolpath.push({
              type: 'helix_ramp',
              x: contour[0].x,
              y: contour[0].y,
              z: currentZ,
              rampLength: rampLength,
              f: feedRate * 0.3
            });
          } else {
            // Direct plunge for subsequent contours (already in pocket)
            toolpath.push({
              type: 'feed',
              x: contour[0].x,
              y: contour[0].y,
              z: currentZ,
              f: feedRate * 0.5
            });
          }
          // Follow contour
          for (let j = 1; j < contour.length; j++) {
            toolpath.push({
              type: 'feed',
              x: contour[j].x,
              y: contour[j].y,
              z: currentZ,
              f: feedRate
            });
          }
          // Close contour
          toolpath.push({
            type: 'feed',
            x: contour[0].x,
            y: contour[0].y,
            z: currentZ,
            f: feedRate
          });
        }
        // Retract after this Z level
        toolpath.push({
          type: 'rapid',
          x: toolpath[toolpath.length-1].x,
          y: toolpath[toolpath.length-1].y,
          z: rapidHeight
        });
      }
      return {
        type: 'pocket',
        toolpath,
        stats: {
          zPasses,
          contourCount: contours.length,
          totalMoves: toolpath.length,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate contour/profile toolpath
     */
    contour(params) {
      const {
        boundary,         // Array of {x, y} points
        toolDiameter,
        side = 'outside', // 'outside', 'inside', 'on'
        feedRate,
        rapidHeight = 0.5,
        depthOfCut,
        startZ,
        finalZ,
        leadIn = true,
        leadOut = true
      } = params;

      const toolpath = [];
      const toolRadius = toolDiameter / 2;

      // Calculate offset based on side
      let offset = 0;
      if (side === 'outside') offset = toolRadius;
      else if (side === 'inside') offset = -toolRadius;

      // Generate offset contour
      const contour = offset !== 0 ? this._offsetPolygon(boundary, offset) : boundary;

      // Calculate Z passes
      const totalDepth = startZ - finalZ;
      const zPasses = Math.ceil(totalDepth / depthOfCut);
      const actualDoc = totalDepth / zPasses;

      // Generate lead-in point
      const leadInPoint = leadIn ? this._calculateLeadIn(contour[0], contour[1], toolRadius) : contour[0];

      // Generate toolpath for each Z level
      for (let zPass = 1; zPass <= zPasses; zPass++) {
        const currentZ = startZ - (actualDoc * zPass);

        // Rapid to lead-in point
        toolpath.push({
          type: 'rapid',
          x: leadInPoint.x,
          y: leadInPoint.y,
          z: rapidHeight
        });

        // Plunge
        toolpath.push({
          type: 'feed',
          x: leadInPoint.x,
          y: leadInPoint.y,
          z: currentZ,
          f: feedRate * 0.5
        });

        // Lead-in arc if enabled
        if (leadIn && leadInPoint !== contour[0]) {
          toolpath.push({
            type: 'arc_cw',
            x: contour[0].x,
            y: contour[0].y,
            z: currentZ,
            i: (contour[0].x - leadInPoint.x) / 2,
            j: (contour[0].y - leadInPoint.y) / 2,
            f: feedRate
          });
        }
        // Follow contour
        for (let i = 1; i < contour.length; i++) {
          toolpath.push({
            type: 'feed',
            x: contour[i].x,
            y: contour[i].y,
            z: currentZ,
            f: feedRate
          });
        }
        // Close contour
        toolpath.push({
          type: 'feed',
          x: contour[0].x,
          y: contour[0].y,
          z: currentZ,
          f: feedRate
        });

        // Lead-out arc if enabled
        if (leadOut) {
          const leadOutPoint = this._calculateLeadOut(contour[0], contour[contour.length-1], toolRadius);
          toolpath.push({
            type: 'arc_cw',
            x: leadOutPoint.x,
            y: leadOutPoint.y,
            z: currentZ,
            i: (leadOutPoint.x - contour[0].x) / 2,
            j: (leadOutPoint.y - contour[0].y) / 2,
            f: feedRate
          });
        }
        // Retract
        toolpath.push({
          type: 'rapid',
          x: toolpath[toolpath.length-1].x,
          y: toolpath[toolpath.length-1].y,
          z: rapidHeight
        });
      }
      return {
        type: 'contour',
        toolpath,
        stats: {
          zPasses,
          totalMoves: toolpath.length,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate drilling toolpath
     */
    drill(params) {
      const {
        holes,            // Array of {x, y, diameter, depth}
        toolDiameter,
        feedRate,
        rapidHeight = 0.5,
        peckDepth = null, // If set, use peck drilling
        dwellTime = 0     // Dwell at bottom (seconds)
      } = params;

      const toolpath = [];

      for (const hole of holes) {
        // Rapid to hole position
        toolpath.push({
          type: 'rapid',
          x: hole.x,
          y: hole.y,
          z: rapidHeight
        });

        if (peckDepth && hole.depth > peckDepth) {
          // Peck drilling (G83 style)
          let currentDepth = 0;
          while (currentDepth < hole.depth) {
            currentDepth = Math.min(currentDepth + peckDepth, hole.depth);

            // Rapid to just above previous depth
            if (currentDepth > peckDepth) {
              toolpath.push({
                type: 'rapid',
                x: hole.x,
                y: hole.y,
                z: -(currentDepth - peckDepth) + 0.02 // 0.02" above
              });
            }
            // Drill to current depth
            toolpath.push({
              type: 'feed',
              x: hole.x,
              y: hole.y,
              z: -currentDepth,
              f: feedRate,
              cycle: 'drill'
            });

            // Retract to clear chips
            toolpath.push({
              type: 'rapid',
              x: hole.x,
              y: hole.y,
              z: rapidHeight
            });
          }
        } else {
          // Simple drilling (G81 style)
          toolpath.push({
            type: 'feed',
            x: hole.x,
            y: hole.y,
            z: -hole.depth,
            f: feedRate,
            dwell: dwellTime,
            cycle: 'drill'
          });

          // Retract
          toolpath.push({
            type: 'rapid',
            x: hole.x,
            y: hole.y,
            z: rapidHeight
          });
        }
      }
      return {
        type: 'drill',
        toolpath,
        stats: {
          holeCount: holes.length,
          peckDrilling: peckDepth !== null,
          totalMoves: toolpath.length,
          estimatedTime: this._estimateTime(toolpath, feedRate)
        }
      };
    },
    /**
     * Generate slot milling toolpath
     */
    slot(params) {
      const {
        start,            // {x, y}
        end,              // {x, y}
        width,            // Slot width
        toolDiameter,
        feedRate,
        rapidHeight = 0.5,
        depthOfCut,
        startZ,
        finalZ,
        rampAngle = 3     // Ramp angle in degrees
      } = params;

      const toolpath = [];
      const toolRadius = toolDiameter / 2;

      // Calculate slot direction
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx*dx + dy*dy);
      const nx = -dy / length; // Normal X
      const ny = dx / length;  // Normal Y

      // Offset for slot sides
      const sideOffset = (width / 2) - toolRadius;

      // Z passes
      const totalDepth = startZ - finalZ;
      const zPasses = Math.ceil(totalDepth / depthOfCut);
      const actualDoc = totalDepth / zPasses;

      // Ramp entry
      const rampLength = actualDoc / Math.tan(rampAngle * Math.PI / 180);

      for (let zPass = 1; zPass <= zPasses; zPass++) {
        const currentZ = startZ - (actualDoc * zPass);

        // Rapid to start
        toolpath.push({
          type: 'rapid',
          x: start.x,
          y: start.y,
          z: rapidHeight
        });

        // Ramp into slot along length
        const rampEndX = start.x + (dx / length) * Math.min(rampLength, length/2);
        const rampEndY = start.y + (dy / length) * Math.min(rampLength, length/2);

        toolpath.push({
          type: 'feed',
          x: rampEndX,
          y: rampEndY,
          z: currentZ,
          f: feedRate * 0.3
        });

        // Mill to end of slot (center)
        toolpath.push({
          type: 'feed',
          x: end.x,
          y: end.y,
          z: currentZ,
          f: feedRate
        });

        // If slot wider than tool, clean sides
        if (sideOffset > 0) {
          // Offset to one side
          toolpath.push({
            type: 'feed',
            x: end.x + nx * sideOffset,
            y: end.y + ny * sideOffset,
            z: currentZ,
            f: feedRate
          });

          // Back along side
          toolpath.push({
            type: 'feed',
            x: start.x + nx * sideOffset,
            y: start.y + ny * sideOffset,
            z: currentZ,
            f: feedRate
          });

          // Across to other side
          toolpath.push({
            type: 'feed',
            x: start.x - nx * sideOffset,
            y: start.y - ny * sideOffset,
            z: currentZ,
            f: feedRate
          });

          // Along other side
          toolpath.push({
            type: 'feed',
            x: end.x - nx * sideOffset,
            y: end.y