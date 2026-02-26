const PRISM_COLLISION_ENGINE = {
  version: '1.0.0',

  // BOUNDING BOX COLLISION

  boundingBox: {
    /**
     * Check if two AABBs (Axis-Aligned Bounding Boxes) collide
     */
    checkAABB(box1, box2) {
      return (
        box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
        box1.minY <= box2.maxY && box1.maxY >= box2.minY &&
        box1.minZ <= box2.maxZ && box1.maxZ >= box2.minZ
      );
    },
    /**
     * Get AABB for a tool at a position
     */
    getToolAABB(tool, position) {
      const r = tool.diameter / 2;
      const h = tool.length || tool.flute_length || 2;

      return {
        minX: position.x - r,
        maxX: position.x + r,
        minY: position.y - r,
        maxY: position.y + r,
        minZ: position.z - h,
        maxZ: position.z
      };
    },
    /**
     * Get AABB for tool holder at a position
     */
    getHolderAABB(holder, position, toolLength) {
      const r = holder.diameter / 2;
      const h = holder.length || 3;
      const z0 = position.z + toolLength - holder.grip_length;

      return {
        minX: position.x - r,
        maxX: position.x + r,
        minY: position.y - r,
        maxY: position.y + r,
        minZ: z0,
        maxZ: z0 + h
      };
    }
  },
  // INTERFERENCE CHECKING

  interference: {
    /**
     * Check toolpath for collisions with workpiece
     */
    checkToolpath(toolpath, tool, stock, features) {
      const collisions = [];
      let toolAABB;

      for (let i = 0; i < toolpath.length; i++) {
        const move = toolpath[i];

        // Skip rapid moves at safe height
        if (move.type === 'rapid' && move.z > stock.height + 0.1) continue;

        // Get tool bounding box at this position
        toolAABB = PRISM_COLLISION_ENGINE.boundingBox.getToolAABB(tool, move);

        // Check collision with stock (only matters for non-cutting moves)
        if (move.type === 'rapid') {
          // For rapids, check if path goes through material
          const stockAABB = {
            minX: 0, maxX: stock.length,
            minY: 0, maxY: stock.width,
            minZ: 0, maxZ: stock.height
          };
          if (PRISM_COLLISION_ENGINE.boundingBox.checkAABB(toolAABB, stockAABB)) {
            collisions.push({
              type: 'rapid_through_material',
              index: i,
              position: { x: move.x, y: move.y, z: move.z },
              severity: 'critical',
              message: 'Rapid move passes through material'
            });
          }
        }
        // Check holder collision (tool not cutting, but holder hitting)
        if (tool.stickout && move.z < stock.height - tool.stickout) {
          collisions.push({
            type: 'holder_collision',
            index: i,
            position: { x: move.x, y: move.y, z: move.z },
            severity: 'critical',
            message: 'Tool holder would collide with workpiece'
          });
        }
        // Check for gouging (cutting where we shouldn't)
        if (features) {
          for (const feature of features) {
            if (this._isGouging(move, tool, feature)) {
              collisions.push({
                type: 'gouge',
                index: i,
                position: { x: move.x, y: move.y, z: move.z },
                feature: feature.id,
                severity: 'warning',
                message: `Potential gouge on feature ${feature.id}`
              });
            }
          }
        }
      }
      return {
        passed: collisions.filter(c => c.severity === 'critical').length === 0,
        collisions,
        criticalCount: collisions.filter(c => c.severity === 'critical').length,
        warningCount: collisions.filter(c => c.severity === 'warning').length
      };
    },
    /**
     * Check if a move would gouge a feature
     */
    _isGouging(move, tool, feature) {
      // Simplified gouge check - compare Z to feature floor with tolerance
      if (feature.type === 'pocket' && feature.floor !== undefined) {
        if (move.z < feature.floor - 0.001) { // 0.001" tolerance
          // Check if we're actually in the pocket area
          if (this._pointInPolygon(move, feature.boundary)) {
            return true;
          }
        }
      }
      return false;
    },
    /**
     * Point-in-polygon test
     */
    _pointInPolygon(point, polygon) {
      let inside = false;
      const n = polygon.length;

      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }
  }