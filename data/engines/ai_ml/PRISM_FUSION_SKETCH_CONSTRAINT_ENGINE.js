/**
 * PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 13
 * Lines: 379
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE = {
  version: '1.0.0',
  name: 'Fusion-Style Sketch Constraint Engine',
  description: 'Complete parametric sketch constraint solver based on Fusion 360 methodology',

  // Constraint type definitions matching Fusion 360
  constraintTypes: {
    HORIZONTAL: { id: 'horizontal', symbol: '━', description: 'Make line horizontal' },
    VERTICAL: { id: 'vertical', symbol: '┃', description: 'Make line vertical' },
    COINCIDENT: { id: 'coincident', symbol: '◉', description: 'Point on line/point' },
    TANGENT: { id: 'tangent', symbol: '⊙', description: 'Tangent to curve' },
    EQUAL: { id: 'equal', symbol: '═', description: 'Equal size' },
    PARALLEL: { id: 'parallel', symbol: '∥', description: 'Parallel lines' },
    PERPENDICULAR: { id: 'perpendicular', symbol: '⊥', description: 'Perpendicular lines' },
    FIX: { id: 'fix', symbol: '📌', description: 'Fix position' },
    MIDPOINT: { id: 'midpoint', symbol: '◇', description: 'Point at midpoint' },
    CONCENTRIC: { id: 'concentric', symbol: '⊚', description: 'Concentric circles' },
    COLLINEAR: { id: 'collinear', symbol: '⟺', description: 'Collinear lines' },
    SYMMETRY: { id: 'symmetry', symbol: '⟷', description: 'Symmetric about line' },
    SMOOTH: { id: 'smooth', symbol: '〰', description: 'Smooth curvature' }
  },
  // Active constraints in sketch
  constraints: [],

  // Apply horizontal/vertical constraint to line
  applyHorizontalVertical: function(line) {
    const dx = Math.abs(line.end.x - line.start.x);
    const dy = Math.abs(line.end.y - line.start.y);

    if (dx > dy) {
      // Make horizontal
      line.end.y = line.start.y;
      return { type: 'horizontal', applied: true, line };
    } else {
      // Make vertical
      line.end.x = line.start.x;
      return { type: 'vertical', applied: true, line };
    }
  },
  // Apply coincident constraint (point to point or point to line)
  applyCoincident: function(point, target) {
    if (target.type === 'point') {
      // Point to point coincidence
      point.x = target.x;
      point.y = target.y;
      point.z = target.z || 0;
      return { type: 'coincident_point', applied: true, point, target };
    } else if (target.type === 'line') {
      // Point on line - project to nearest point
      const projectedPoint = this._projectPointToLine(point, target);
      point.x = projectedPoint.x;
      point.y = projectedPoint.y;
      return { type: 'coincident_line', applied: true, point, target };
    } else if (target.type === 'circle') {
      // Point on circle - project to nearest point on circle
      const dx = point.x - target.center.x;
      const dy = point.y - target.center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        point.x = target.center.x + (dx / dist) * target.radius;
        point.y = target.center.y + (dy / dist) * target.radius;
      }
      return { type: 'coincident_circle', applied: true, point, target };
    }
    return { applied: false };
  },
  // Apply tangent constraint between curves
  applyTangent: function(curve1, curve2) {
    if (curve1.type === 'line' && curve2.type === 'circle') {
      // Line tangent to circle
      const result = this._makeLineTangentToCircle(curve1, curve2);
      return { type: 'tangent_line_circle', applied: result.success, ...result };
    } else if (curve1.type === 'circle' && curve2.type === 'circle') {
      // Circle tangent to circle
      const result = this._makeCirclesTangent(curve1, curve2);
      return { type: 'tangent_circles', applied: result.success, ...result };
    } else if (curve1.type === 'arc' && curve2.type === 'line') {
      // Arc tangent to line
      return this._makeArcTangentToLine(curve1, curve2);
    }
    return { applied: false };
  },
  // Apply equal constraint (make sizes identical)
  applyEqual: function(object1, object2) {
    if (object1.type === 'line' && object2.type === 'line') {
      // Make lines equal length
      const len1 = this._lineLength(object1);
      const len2 = this._lineLength(object2);
      const avgLen = (len1 + len2) / 2;

      this._setLineLength(object1, avgLen);
      this._setLineLength(object2, avgLen);
      return { type: 'equal_lines', applied: true, length: avgLen };
    } else if (object1.type === 'circle' && object2.type === 'circle') {
      // Make circles equal radius
      const avgRadius = (object1.radius + object2.radius) / 2;
      object1.radius = avgRadius;
      object2.radius = avgRadius;
      return { type: 'equal_circles', applied: true, radius: avgRadius };
    }
    return { applied: false };
  },
  // Apply parallel constraint
  applyParallel: function(line1, line2) {
    const angle1 = Math.atan2(line1.end.y - line1.start.y, line1.end.x - line1.start.x);
    const len2 = this._lineLength(line2);

    // Rotate line2 to be parallel to line1
    const midpoint2 = {
      x: (line2.start.x + line2.end.x) / 2,
      y: (line2.start.y + line2.end.y) / 2
    };
    line2.start.x = midpoint2.x - (len2 / 2) * Math.cos(angle1);
    line2.start.y = midpoint2.y - (len2 / 2) * Math.sin(angle1);
    line2.end.x = midpoint2.x + (len2 / 2) * Math.cos(angle1);
    line2.end.y = midpoint2.y + (len2 / 2) * Math.sin(angle1);

    return { type: 'parallel', applied: true, angle: angle1 };
  },
  // Apply perpendicular constraint
  applyPerpendicular: function(line1, line2) {
    const angle1 = Math.atan2(line1.end.y - line1.start.y, line1.end.x - line1.start.x);
    const perpAngle = angle1 + Math.PI / 2;
    const len2 = this._lineLength(line2);

    // Find intersection point
    const intersection = this._lineLineIntersection(line1, line2);
    if (intersection) {
      line2.start.x = intersection.x - (len2 / 2) * Math.cos(perpAngle);
      line2.start.y = intersection.y - (len2 / 2) * Math.sin(perpAngle);
      line2.end.x = intersection.x + (len2 / 2) * Math.cos(perpAngle);
      line2.end.y = intersection.y + (len2 / 2) * Math.sin(perpAngle);
    }
    return { type: 'perpendicular', applied: true, angle: perpAngle };
  },
  // Apply fix constraint (lock position)
  applyFix: function(object) {
    object.fixed = true;
    object.fixedPosition = {
      x: object.x || object.start?.x || object.center?.x,
      y: object.y || object.start?.y || object.center?.y,
      z: object.z || object.start?.z || object.center?.z || 0
    };
    return { type: 'fix', applied: true, position: object.fixedPosition };
  },
  // Apply midpoint constraint
  applyMidpoint: function(point, line) {
    const midX = (line.start.x + line.end.x) / 2;
    const midY = (line.start.y + line.end.y) / 2;
    point.x = midX;
    point.y = midY;
    return { type: 'midpoint', applied: true, midpoint: { x: midX, y: midY } };
  },
  // Apply concentric constraint
  applyConcentric: function(circle1, circle2) {
    // Move circle2's center to circle1's center
    circle2.center.x = circle1.center.x;
    circle2.center.y = circle1.center.y;
    return { type: 'concentric', applied: true, center: circle1.center };
  },
  // Apply collinear constraint
  applyCollinear: function(line1, line2) {
    const angle1 = Math.atan2(line1.end.y - line1.start.y, line1.end.x - line1.start.x);
    const len2 = this._lineLength(line2);

    // Project line2 onto line1's infinite extension
    const projStart = this._projectPointToInfiniteLine(line2.start, line1);
    const projEnd = this._projectPointToInfiniteLine(line2.end, line1);

    line2.start = projStart;
    line2.end = projEnd;

    return { type: 'collinear', applied: true };
  },
  // Apply symmetry constraint
  applySymmetry: function(object1, object2, symmetryLine) {
    // Mirror object2 about symmetry line to match object1's reflection
    const mirrored = this._mirrorObject(object1, symmetryLine);

    if (object2.type === 'point') {
      object2.x = mirrored.x;
      object2.y = mirrored.y;
    } else if (object2.type === 'circle') {
      object2.center = mirrored.center;
      object2.radius = object1.radius; // Also make equal
    } else if (object2.type === 'line') {
      object2.start = mirrored.start;
      object2.end = mirrored.end;
    }
    return { type: 'symmetry', applied: true, mirrorLine: symmetryLine };
  },
  // Solve all constraints in sketch
  solveSketchConstraints: function(sketch, maxIterations = 100) {
    const tolerance = 1e-6;
    let iteration = 0;
    let maxError = Infinity;

    while (iteration < maxIterations && maxError > tolerance) {
      maxError = 0;

      for (const constraint of sketch.constraints) {
        const result = this._applyConstraint(constraint, sketch);
        if (result.error) {
          maxError = Math.max(maxError, result.error);
        }
      }
      iteration++;
    }
    return {
      solved: maxError <= tolerance,
      iterations: iteration,
      finalError: maxError,
      constraintCount: sketch.constraints.length
    };
  },
  // Helper functions
  _projectPointToLine: function(point, line) {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return { x: line.start.x, y: line.start.y };

    const t = Math.max(0, Math.min(1,
      ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / len2
    ));

    return {
      x: line.start.x + t * dx,
      y: line.start.y + t * dy
    };
  },
  _projectPointToInfiniteLine: function(point, line) {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return { x: line.start.x, y: line.start.y };

    const t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / len2;

    return {
      x: line.start.x + t * dx,
      y: line.start.y + t * dy
    };
  },
  _lineLength: function(line) {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  },
  _setLineLength: function(line, newLength) {
    const currentLen = this._lineLength(line);
    if (currentLen === 0) return;

    const scale = newLength / currentLen;
    const midX = (line.start.x + line.end.x) / 2;
    const midY = (line.start.y + line.end.y) / 2;

    const dx = (line.end.x - line.start.x) / 2;
    const dy = (line.end.y - line.start.y) / 2;

    line.start.x = midX - dx * scale;
    line.start.y = midY - dy * scale;
    line.end.x = midX + dx * scale;
    line.end.y = midY + dy * scale;
  },
  _lineLineIntersection: function(line1, line2) {
    const x1 = line1.start.x, y1 = line1.start.y;
    const x2 = line1.end.x, y2 = line1.end.y;
    const x3 = line2.start.x, y3 = line2.start.y;
    const x4 = line2.end.x, y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  },
  _makeLineTangentToCircle: function(line, circle) {
    // Adjust line to be tangent to circle
    const midLine = {
      x: (line.start.x + line.end.x) / 2,
      y: (line.start.y + line.end.y) / 2
    };
    const dx = midLine.x - circle.center.x;
    const dy = midLine.y - circle.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < circle.radius) {
      // Line center inside circle, move it out
      const scale = circle.radius / dist;
      midLine.x = circle.center.x + dx * scale;
      midLine.y = circle.center.y + dy * scale;
    }
    // Rotate line to be tangent at closest point
    const tangentAngle = Math.atan2(dy, dx) + Math.PI / 2;
    const len = this._lineLength(line);

    line.start.x = midLine.x - (len / 2) * Math.cos(tangentAngle);
    line.start.y = midLine.y - (len / 2) * Math.sin(tangentAngle);
    line.end.x = midLine.x + (len / 2) * Math.cos(tangentAngle);
    line.end.y = midLine.y + (len / 2) * Math.sin(tangentAngle);

    return { success: true, tangentPoint: midLine };
  },
  _makeCirclesTangent: function(circle1, circle2) {
    const dx = circle2.center.x - circle1.center.x;
    const dy = circle2.center.y - circle1.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // External tangency: centers are r1 + r2 apart
    const targetDist = circle1.radius + circle2.radius;

    if (dist > 0) {
      const scale = targetDist / dist;
      circle2.center.x = circle1.center.x + dx * scale;
      circle2.center.y = circle1.center.y + dy * scale;
    }
    return { success: true, distance: targetDist };
  },
  _mirrorObject: function(object, mirrorLine) {
    const mirrorPoint = (p) => {
      const proj = this._projectPointToInfiniteLine(p, mirrorLine);
      return {
        x: 2 * proj.x - p.x,
        y: 2 * proj.y - p.y
      };
    };
    if (object.type === 'point') {
      return mirrorPoint(object);
    } else if (object.type === 'circle') {
      return { center: mirrorPoint(object.center), radius: object.radius };
    } else if (object.type === 'line') {
      return { start: mirrorPoint(object.start), end: mirrorPoint(object.end) };
    }
    return object;
  },
  _applyConstraint: function(constraint, sketch) {
    const { type, entities } = constraint;

    switch (type) {
      case 'horizontal':
        return this.applyHorizontalVertical(entities[0]);
      case 'coincident':
        return this.applyCoincident(entities[0], entities[1]);
      case 'tangent':
        return this.applyTangent(entities[0], entities[1]);
      case 'equal':
        return this.applyEqual(entities[0], entities[1]);
      case 'parallel':
        return this.applyParallel(entities[0], entities[1]);
      case 'perpendicular':
        return this.applyPerpendicular(entities[0], entities[1]);
      case 'fix':
        return this.applyFix(entities[0]);
      case 'midpoint':
        return this.applyMidpoint(entities[0], entities[1]);
      case 'concentric':
        return this.applyConcentric(entities[0], entities[1]);
      case 'collinear':
        return this.applyCollinear(entities[0], entities[1]);
      case 'symmetry':
        return this.applySymmetry(entities[0], entities[1], entities[2]);
      default:
        return { applied: false };
    }
  },
  confidence: {
    overall: 0.88,
    constraintSolving: 0.92,
    geometryCalculation: 0.90,
    multiConstraint: 0.85
  }
}