const PRISM_SKETCH_ENGINE = {
  version: '1.0.0',

  // SKETCH STATE
  state: {
    activeSketch: null,
    sketches: [],
    currentPlane: 'XY',
    workPlanes: {
      'XY': { normal: { x: 0, y: 0, z: 1 }, origin: { x: 0, y: 0, z: 0 } },
      'XZ': { normal: { x: 0, y: 1, z: 0 }, origin: { x: 0, y: 0, z: 0 } },
      'YZ': { normal: { x: 1, y: 0, z: 0 }, origin: { x: 0, y: 0, z: 0 } }
    },
    gridSize: 1.0,
    snapEnabled: true
  },
  // SKETCH MANAGEMENT

  // Create a new sketch
  createSketch(name, plane = 'XY', offset = 0) {
    const sketch = {
      id: `sketch_${Date.now()}`,
      name: name || `Sketch ${this.state.sketches.length + 1}`,
      plane: plane,
      offset: offset,
      entities: [],
      constraints: [],
      closed: false,
      valid: false,
      area: 0,
      centroid: { x: 0, y: 0 },
      solver: null  // Will hold reference to constraint solver instance
    };
    // Initialize constraint solver for this sketch
    if (typeof PRISM_PARAMETRIC_CONSTRAINT_SOLVER !== 'undefined') {
      sketch.solver = Object.create(PRISM_PARAMETRIC_CONSTRAINT_SOLVER);
      sketch.solver.reset();
    }
    this.state.sketches.push(sketch);
    this.state.activeSketch = sketch;

    console.log(`[Sketch Engine] Created sketch: ${sketch.name}`);
    return sketch;
  },
  // Get active sketch
  getActiveSketch() {
    return this.state.activeSketch;
  },
  // Set active sketch
  setActiveSketch(sketchId) {
    const sketch = this.state.sketches.find(s => s.id === sketchId);
    if (sketch) {
      this.state.activeSketch = sketch;
      return true;
    }
    return false;
  },
  // Close/finish sketch
  closeSketch(sketchId = null) {
    const sketch = sketchId ?
      this.state.sketches.find(s => s.id === sketchId) :
      this.state.activeSketch;

    if (sketch) {
      sketch.closed = true;
      this.validateSketch(sketch);
      this.calculateSketchProperties(sketch);

      // Emit event
      if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
        PRISM_EVENT_MANAGER.emit('sketch:closed', {
          id: sketch.id,
          name: sketch.name,
          valid: sketch.valid,
          area: sketch.area
        });
      }
    }
  },
  // SKETCH ENTITIES

  // Add a point to the active sketch
  addPoint(x, y) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Apply snap if enabled
    if (this.state.snapEnabled) {
      x = this.snapToGrid(x);
      y = this.snapToGrid(y);
    }
    const point = {
      id: `point_${sketch.entities.length + 1}`,
      type: 'point',
      x: x,
      y: y,
      construction: false
    };
    sketch.entities.push(point);

    // Add to constraint solver
    if (sketch.solver) {
      sketch.solver.addPoint(point.id, x, y);
    }
    return point;
  },
  // Add a line between two points
  addLine(x1, y1, x2, y2) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Create endpoints
    const start = this.addPoint(x1, y1);
    const end = this.addPoint(x2, y2);

    const line = {
      id: `line_${sketch.entities.length + 1}`,
      type: 'line',
      start: start.id,
      end: end.id,
      construction: false
    };
    sketch.entities.push(line);

    // Add to constraint solver
    if (sketch.solver) {
      sketch.solver.addLine(line.id, start.id, end.id);
    }
    return line;
  },
  // Add a circle
  addCircle(centerX, centerY, radius) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Create center point
    const center = this.addPoint(centerX, centerY);

    const circle = {
      id: `circle_${sketch.entities.length + 1}`,
      type: 'circle',
      center: center.id,
      radius: radius,
      construction: false
    };
    sketch.entities.push(circle);

    // Add to constraint solver
    if (sketch.solver) {
      sketch.solver.addCircle(circle.id, center.id, radius);
    }
    return circle;
  },
  // Add an arc (3-point or center-based)
  addArc(centerX, centerY, radius, startAngle, endAngle) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Create center point
    const center = this.addPoint(centerX, centerY);

    // Calculate start and end points
    const startX = centerX + radius * Math.cos(startAngle * Math.PI / 180);
    const startY = centerY + radius * Math.sin(startAngle * Math.PI / 180);
    const endX = centerX + radius * Math.cos(endAngle * Math.PI / 180);
    const endY = centerY + radius * Math.sin(endAngle * Math.PI / 180);

    const startPoint = this.addPoint(startX, startY);
    const endPoint = this.addPoint(endX, endY);

    const arc = {
      id: `arc_${sketch.entities.length + 1}`,
      type: 'arc',
      center: center.id,
      start: startPoint.id,
      end: endPoint.id,
      radius: radius,
      startAngle: startAngle,
      endAngle: endAngle,
      construction: false
    };
    sketch.entities.push(arc);

    return arc;
  },
  // Add a rectangle
  addRectangle(x, y, width, height) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Create four lines
    const line1 = this.addLine(x, y, x + width, y);
    const line2 = this.addLine(x + width, y, x + width, y + height);
    const line3 = this.addLine(x + width, y + height, x, y + height);
    const line4 = this.addLine(x, y + height, x, y);

    // Add constraints for rectangle
    if (sketch.solver) {
      sketch.solver.addHorizontalConstraint(line1.id);
      sketch.solver.addHorizontalConstraint(line3.id);
      sketch.solver.addVerticalConstraint(line2.id);
      sketch.solver.addVerticalConstraint(line4.id);
    }
    return {
      type: 'rectangle',
      lines: [line1, line2, line3, line4],
      x: x,
      y: y,
      width: width,
      height: height
    };
  },
  // Add a slot (obround)
  addSlot(x1, y1, x2, y2, width) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    const halfWidth = width / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;  // Normal x
    const ny = dx / len;   // Normal y

    // Create lines
    const line1 = this.addLine(
      x1 + nx * halfWidth, y1 + ny * halfWidth,
      x2 + nx * halfWidth, y2 + ny * halfWidth
    );
    const line2 = this.addLine(
      x1 - nx * halfWidth, y1 - ny * halfWidth,
      x2 - nx * halfWidth, y2 - ny * halfWidth
    );

    // Create arcs at ends
    const arc1 = this.addArc(x1, y1, halfWidth,
      Math.atan2(ny, nx) * 180 / Math.PI,
      Math.atan2(-ny, -nx) * 180 / Math.PI
    );
    const arc2 = this.addArc(x2, y2, halfWidth,
      Math.atan2(-ny, -nx) * 180 / Math.PI,
      Math.atan2(ny, nx) * 180 / Math.PI
    );

    return {
      type: 'slot',
      lines: [line1, line2],
      arcs: [arc1, arc2],
      width: width
    };
  },
  // Add spline (B-spline)
  addSpline(points) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    const splinePoints = points.map(p => this.addPoint(p.x, p.y));

    const spline = {
      id: `spline_${sketch.entities.length + 1}`,
      type: 'spline',
      points: splinePoints.map(p => p.id),
      degree: 3,
      construction: false
    };
    sketch.entities.push(spline);
    return spline;
  },
  // Mark entity as construction geometry
  setConstruction(entityId, isConstruction = true) {
    const sketch = this.state.activeSketch;
    if (!sketch) return false;

    const entity = sketch.entities.find(e => e.id === entityId);
    if (entity) {
      entity.construction = isConstruction;
      return true;
    }
    return false;
  },
  // CONSTRAINT SHORTCUTS

  // Add dimension to entity
  addDimension(entityId, value) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const entity = sketch.entities.find(e => e.id === entityId);
    if (!entity) return null;

    let constraint = null;

    if (entity.type === 'line') {
      // Add length dimension
      constraint = sketch.solver.addDistanceConstraint(
        entity.start, entity.end, value
      );
    } else if (entity.type === 'circle') {
      // Add radius dimension
      constraint = sketch.solver.addRadiusConstraint(entityId, value);
    }
    if (constraint) {
      sketch.constraints.push(constraint);
    }
    return constraint;
  },
  // Add horizontal constraint
  makeHorizontal(lineId) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addHorizontalConstraint(lineId);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Add vertical constraint
  makeVertical(lineId) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addVerticalConstraint(lineId);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Make two entities parallel
  makeParallel(line1Id, line2Id) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addParallelConstraint(line1Id, line2Id);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Make two entities perpendicular
  makePerpendicular(line1Id, line2Id) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addPerpendicularConstraint(line1Id, line2Id);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Make two points coincident
  makeCoincident(point1Id, point2Id) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addCoincidentConstraint(point1Id, point2Id);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Make entities equal
  makeEqual(entity1Id, entity2Id) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addEqualConstraint(entity1Id, entity2Id);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // Fix entity position
  fixPosition(entityId) {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return null;

    const constraint = sketch.solver.addFixedConstraint(entityId);
    sketch.constraints.push(constraint);
    return constraint;
  },
  // SKETCH OPERATIONS

  // Mirror entities about a line
  mirror(entityIds, mirrorLineId) {
    const sketch = this.state.activeSketch;
    if (!sketch) return [];

    const mirrorLine = sketch.entities.find(e => e.id === mirrorLineId);
    if (!mirrorLine || mirrorLine.type !== 'line') return [];

    const mirroredEntities = [];

    for (const id of entityIds) {
      const entity = sketch.entities.find(e => e.id === id);
      if (entity && entity.type === 'point') {
        const mirrored = this.mirrorPoint(entity, mirrorLine);
        mirroredEntities.push(mirrored);
      }
      // Add line, circle, arc mirroring as needed
    }
    return mirroredEntities;
  },
  // Helper: mirror a point about a line
  mirrorPoint(point, line) {
    const sketch = this.state.activeSketch;
    const start = sketch.entities.find(e => e.id === line.start);
    const end = sketch.entities.find(e => e.id === line.end);

    // Line direction
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;

    // Vector from line start to point
    const px = point.x - start.x;
    const py = point.y - start.y;

    // Reflection
    const dot = px * nx + py * ny;
    const mirrorX = 2 * (start.x + dot * nx) - point.x;
    const mirrorY = 2 * (start.y + dot * ny) - point.y;

    return this.addPoint(mirrorX, mirrorY);
  },
  // Offset entities
  offset(entityIds, distance) {
    const sketch = this.state.activeSketch;
    if (!sketch) return [];

    const offsetEntities = [];

    for (const id of entityIds) {
      const entity = sketch.entities.find(e => e.id === id);
      if (entity) {
        if (entity.type === 'circle') {
          // Offset circle = change radius
          const newCircle = this.addCircle(
            sketch.entities.find(e => e.id === entity.center).x,
            sketch.entities.find(e => e.id === entity.center).y,
            entity.radius + distance
          );
          offsetEntities.push(newCircle);
        }
        // Add line, arc offset as needed
      }
    }
    return offsetEntities;
  },
  // Trim entity at intersection
  trim(entityId, trimPointX, trimPointY) {
    // Implementation would split entity at trim point
    console.log(`[Sketch Engine] Trim at (${trimPointX}, ${trimPointY})`);
    return true;
  },
  // Extend entity to boundary
  extend(entityId, boundaryEntityId) {
    // Implementation would extend entity to intersect boundary
    console.log(`[Sketch Engine] Extend ${entityId} to ${boundaryEntityId}`);
    return true;
  },
  // Fillet between two lines
  fillet(line1Id, line2Id, radius) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Find intersection point
    const line1 = sketch.entities.find(e => e.id === line1Id);
    const line2 = sketch.entities.find(e => e.id === line2Id);

    if (!line1 || !line2) return null;

    // Create fillet arc
    // (Simplified - actual implementation would compute tangent points)
    const arc = {
      id: `fillet_${sketch.entities.length + 1}`,
      type: 'fillet',
      line1: line1Id,
      line2: line2Id,
      radius: radius,
      construction: false
    };
    sketch.entities.push(arc);
    return arc;
  },
  // Chamfer between two lines
  chamfer(line1Id, line2Id, distance) {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    // Create chamfer line
    const chamfer = {
      id: `chamfer_${sketch.entities.length + 1}`,
      type: 'chamfer',
      line1: line1Id,
      line2: line2Id,
      distance: distance,
      construction: false
    };
    sketch.entities.push(chamfer);
    return chamfer;
  },
  // VALIDATION AND PROPERTIES

  // Validate sketch (check if closed profile)
  validateSketch(sketch) {
    // Check if sketch forms closed profile(s)
    const profiles = this.findClosedProfiles(sketch);
    sketch.valid = profiles.length > 0;
    sketch.profiles = profiles;
    return sketch.valid;
  },
  // Find closed profiles in sketch
  findClosedProfiles(sketch) {
    const profiles = [];

    // Simplified: look for connected loops
    // Full implementation would use graph traversal

    const nonConstructionEntities = sketch.entities.filter(e =>
      !e.construction && (e.type === 'line' || e.type === 'arc' || e.type === 'circle')
    );

    // Check circles (always closed)
    for (const entity of nonConstructionEntities) {
      if (entity.type === 'circle') {
        profiles.push({
          entities: [entity.id],
          type: 'circular',
          closed: true
        });
      }
    }
    return profiles;
  },
  // Calculate sketch area and centroid
  calculateSketchProperties(sketch) {
    if (!sketch.profiles || sketch.profiles.length === 0) {
      sketch.area = 0;
      sketch.centroid = { x: 0, y: 0 };
      return;
    }
    let totalArea = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (const profile of sketch.profiles) {
      if (profile.type === 'circular') {
        const circle = sketch.entities.find(e => e.id === profile.entities[0]);
        if (circle) {
          const area = Math.PI * circle.radius * circle.radius;
          totalArea += area;
          const center = sketch.entities.find(e => e.id === circle.center);
          centroidX += center.x * area;
          centroidY += center.y * area;
        }
      }
      // Add polygon area calculation
    }
    sketch.area = totalArea;
    if (totalArea > 0) {
      sketch.centroid = {
        x: centroidX / totalArea,
        y: centroidY / totalArea
      };
    }
  },
  // Solve sketch constraints
  solveSketch() {
    const sketch = this.state.activeSketch;
    if (!sketch || !sketch.solver) return false;

    const solved = sketch.solver.solve();

    if (solved) {
      // Update entity positions from solver
      for (const entity of sketch.entities) {
        const solverEntity = sketch.solver.getEntity(entity.id);
        if (solverEntity) {
          if (entity.type === 'point') {
            entity.x = solverEntity.x;
            entity.y = solverEntity.y;
          } else if (entity.type === 'circle') {
            entity.radius = solverEntity.radius;
          }
        }
      }
    }
    return solved;
  },
  // GRID AND SNAPPING

  setGridSize(size) {
    this.state.gridSize = size;
  },
  enableSnap(enable = true) {
    this.state.snapEnabled = enable;
  },
  snapToGrid(value) {
    return Math.round(value / this.state.gridSize) * this.state.gridSize;
  },
  // Snap to nearest entity
  snapToEntity(x, y, tolerance = 2) {
    const sketch = this.state.activeSketch;
    if (!sketch) return { x, y };

    let nearest = null;
    let minDist = tolerance;

    for (const entity of sketch.entities) {
      if (entity.type === 'point') {
        const dist = Math.sqrt(
          Math.pow(entity.x - x, 2) + Math.pow(entity.y - y, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: entity.x, y: entity.y };
        }
      }
    }
    return nearest || { x, y };
  },
  // EXPORT / CONVERSION

  // Export sketch to DXF format
  exportToDXF(sketchId = null) {
    const sketch = sketchId ?
      this.state.sketches.find(s => s.id === sketchId) :
      this.state.activeSketch;

    if (!sketch) return null;

    let dxf = '0\nSECTION\n2\nENTITIES\n';

    for (const entity of sketch.entities) {
      if (entity.construction) continue;

      if (entity.type === 'line') {
        const start = sketch.entities.find(e => e.id === entity.start);
        const end = sketch.entities.find(e => e.id === entity.end);
        dxf += `0\nLINE\n10\n${start.x}\n20\n${start.y}\n11\n${end.x}\n21\n${end.y}\n`;
      } else if (entity.type === 'circle') {
        const center = sketch.entities.find(e => e.id === entity.center);
        dxf += `0\nCIRCLE\n10\n${center.x}\n20\n${center.y}\n40\n${entity.radius}\n`;
      }
    }
    dxf += '0\nENDSEC\n0\nEOF\n';
    return dxf;
  },
  // Convert sketch to 3D wire frame
  toWireFrame3D() {
    const sketch = this.state.activeSketch;
    if (!sketch) return null;

    const plane = this.state.workPlanes[sketch.plane];
    const wireFrame = {
      vertices: [],
      edges: []
    };
    // Convert 2D points to 3D based on work plane
    for (const entity of sketch.entities) {
      if (entity.type === 'point') {
        const point3D = this.projectTo3D(entity.x, entity.y, plane, sketch.offset);
        wireFrame.vertices.push(point3D);
      }
    }
    return wireFrame;
  },
  // Project 2D point to 3D work plane
  projectTo3D(x, y, plane, offset = 0) {
    const origin = plane.origin;
    const normal = plane.normal;

    // Simplified projection - full implementation would use proper basis vectors
    if (normal.z === 1) {
      return { x: x + origin.x, y: y + origin.y, z: offset + origin.z };
    } else if (normal.y === 1) {
      return { x: x + origin.x, y: offset + origin.y, z: y + origin.z };
    } else if (normal.x === 1) {
      return { x: offset + origin.x, y: x + origin.y, z: y + origin.z };
    }
    return { x, y, z: offset };
  }
}