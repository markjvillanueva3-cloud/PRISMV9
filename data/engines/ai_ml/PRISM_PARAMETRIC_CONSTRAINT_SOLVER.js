/**
 * PRISM_PARAMETRIC_CONSTRAINT_SOLVER
 * Extracted from PRISM v8.89.002 monolith
 * References: 27
 * Lines: 629
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_PARAMETRIC_CONSTRAINT_SOLVER = {
  version: '1.0.0',

  // CONSTRAINT TYPES
  constraintTypes: {
    // Dimensional constraints
    DISTANCE: { dof: 1, type: 'dimensional', symbol: 'D' },
    ANGLE: { dof: 1, type: 'dimensional', symbol: '∠' },
    RADIUS: { dof: 1, type: 'dimensional', symbol: 'R' },
    DIAMETER: { dof: 1, type: 'dimensional', symbol: '⌀' },
    LENGTH: { dof: 1, type: 'dimensional', symbol: 'L' },

    // Geometric constraints
    HORIZONTAL: { dof: 1, type: 'geometric', symbol: '—' },
    VERTICAL: { dof: 1, type: 'geometric', symbol: '|' },
    PARALLEL: { dof: 1, type: 'geometric', symbol: '∥' },
    PERPENDICULAR: { dof: 1, type: 'geometric', symbol: '⊥' },
    TANGENT: { dof: 1, type: 'geometric', symbol: '○' },
    COINCIDENT: { dof: 2, type: 'geometric', symbol: '◉' },
    CONCENTRIC: { dof: 2, type: 'geometric', symbol: '⊙' },
    COLINEAR: { dof: 2, type: 'geometric', symbol: '≡' },
    EQUAL: { dof: 1, type: 'geometric', symbol: '=' },
    SYMMETRIC: { dof: 2, type: 'geometric', symbol: '⟷' },
    MIDPOINT: { dof: 2, type: 'geometric', symbol: 'M' },

    // Fix constraints
    FIXED: { dof: 3, type: 'fix', symbol: '▪' },
    FIX_X: { dof: 1, type: 'fix', symbol: '|x' },
    FIX_Y: { dof: 1, type: 'fix', symbol: '|y' }
  },
  // SOLVER STATE
  state: {
    entities: [],
    constraints: [],
    parameters: new Map(),
    dofCount: 0,
    solved: false,
    iterations: 0,
    tolerance: 1e-6,
    maxIterations: 1000
  },
  // ENTITY MANAGEMENT

  // Add a point entity
  addPoint(id, x, y, z = 0) {
    const point = {
      id: id,
      type: 'point',
      x: x,
      y: y,
      z: z,
      dof: 2,  // 2D point has 2 degrees of freedom
      fixed: false
    };
    this.state.entities.push(point);
    this.state.dofCount += point.dof;
    return point;
  },
  // Add a line entity
  addLine(id, startId, endId) {
    const start = this.getEntity(startId);
    const end = this.getEntity(endId);

    if (!start || !end) {
      console.error('Invalid start or end point');
      return null;
    }
    const line = {
      id: id,
      type: 'line',
      start: startId,
      end: endId,
      dof: 0  // Line DOF is determined by its endpoints
    };
    this.state.entities.push(line);
    return line;
  },
  // Add a circle/arc entity
  addCircle(id, centerId, radius) {
    const center = this.getEntity(centerId);

    if (!center) {
      console.error('Invalid center point');
      return null;
    }
    const circle = {
      id: id,
      type: 'circle',
      center: centerId,
      radius: radius,
      dof: 1  // Circle has 1 DOF (radius) beyond its center
    };
    this.state.entities.push(circle);
    this.state.dofCount += circle.dof;
    return circle;
  },
  // Add an arc entity
  addArc(id, centerId, startId, endId, radius) {
    const arc = {
      id: id,
      type: 'arc',
      center: centerId,
      start: startId,
      end: endId,
      radius: radius,
      dof: 1
    };
    this.state.entities.push(arc);
    this.state.dofCount += arc.dof;
    return arc;
  },
  // Get entity by ID
  getEntity(id) {
    return this.state.entities.find(e => e.id === id);
  },
  // CONSTRAINT MANAGEMENT

  // Add a constraint
  addConstraint(type, entities, value = null, options = {}) {
    const constraintDef = this.constraintTypes[type];
    if (!constraintDef) {
      console.error(`Unknown constraint type: ${type}`);
      return null;
    }
    const constraint = {
      id: `constraint_${this.state.constraints.length + 1}`,
      type: type,
      entities: entities,  // Array of entity IDs
      value: value,        // For dimensional constraints
      priority: options.priority || 1,
      weight: options.weight || 1,
      symbol: constraintDef.symbol,
      dof: constraintDef.dof,
      satisfied: false
    };
    this.state.constraints.push(constraint);
    this.state.dofCount -= constraint.dof;
    this.state.solved = false;

    return constraint;
  },
  // Add distance constraint
  addDistanceConstraint(entity1Id, entity2Id, distance) {
    return this.addConstraint('DISTANCE', [entity1Id, entity2Id], distance);
  },
  // Add horizontal constraint
  addHorizontalConstraint(lineId) {
    return this.addConstraint('HORIZONTAL', [lineId]);
  },
  // Add vertical constraint
  addVerticalConstraint(lineId) {
    return this.addConstraint('VERTICAL', [lineId]);
  },
  // Add parallel constraint
  addParallelConstraint(line1Id, line2Id) {
    return this.addConstraint('PARALLEL', [line1Id, line2Id]);
  },
  // Add perpendicular constraint
  addPerpendicularConstraint(line1Id, line2Id) {
    return this.addConstraint('PERPENDICULAR', [line1Id, line2Id]);
  },
  // Add coincident constraint (two points same location)
  addCoincidentConstraint(point1Id, point2Id) {
    return this.addConstraint('COINCIDENT', [point1Id, point2Id]);
  },
  // Add concentric constraint (two circles same center)
  addConcentricConstraint(circle1Id, circle2Id) {
    return this.addConstraint('CONCENTRIC', [circle1Id, circle2Id]);
  },
  // Add tangent constraint
  addTangentConstraint(entity1Id, entity2Id) {
    return this.addConstraint('TANGENT', [entity1Id, entity2Id]);
  },
  // Add equal constraint
  addEqualConstraint(entity1Id, entity2Id) {
    return this.addConstraint('EQUAL', [entity1Id, entity2Id]);
  },
  // Add fixed constraint
  addFixedConstraint(entityId) {
    const entity = this.getEntity(entityId);
    if (entity) {
      entity.fixed = true;
    }
    return this.addConstraint('FIXED', [entityId]);
  },
  // Add angle constraint
  addAngleConstraint(line1Id, line2Id, angle) {
    return this.addConstraint('ANGLE', [line1Id, line2Id], angle);
  },
  // Add radius constraint
  addRadiusConstraint(circleId, radius) {
    return this.addConstraint('RADIUS', [circleId], radius);
  },
  // PARAMETER MANAGEMENT (for parametric updates)

  // Define a named parameter
  defineParameter(name, value) {
    this.state.parameters.set(name, value);
  },
  // Get parameter value
  getParameter(name) {
    return this.state.parameters.get(name);
  },
  // Update parameter and re-solve
  updateParameter(name, newValue) {
    if (this.state.parameters.has(name)) {
      this.state.parameters.set(name);
      this.state.solved = false;
      return this.solve();
    }
    return false;
  },
  // Update constraint value
  updateConstraintValue(constraintId, newValue) {
    const constraint = this.state.constraints.find(c => c.id === constraintId);
    if (constraint) {
      constraint.value = newValue;
      this.state.solved = false;
      return this.solve();
    }
    return false;
  },
  // CONSTRAINT SOLVER (Newton-Raphson based)

  solve() {
    console.log('[Constraint Solver] Starting solve...');
    console.log(`[Constraint Solver] DOF count: ${this.state.dofCount}`);

    // Check if fully constrained
    if (this.state.dofCount > 0) {
      console.warn(`[Constraint Solver] Under-constrained by ${this.state.dofCount} DOF`);
    } else if (this.state.dofCount < 0) {
      console.warn(`[Constraint Solver] Over-constrained by ${-this.state.dofCount}`);
    }
    this.state.iterations = 0;
    let converged = false;

    while (!converged && this.state.iterations < this.state.maxIterations) {
      this.state.iterations++;

      // Calculate error for each constraint
      const errors = this.calculateConstraintErrors();
      const totalError = errors.reduce((sum, e) => sum + Math.abs(e), 0);

      if (totalError < this.state.tolerance) {
        converged = true;
        break;
      }
      // Calculate Jacobian
      const jacobian = this.calculateJacobian();

      // Solve for adjustments using pseudo-inverse
      const adjustments = this.solveLinearSystem(jacobian, errors);

      // Apply adjustments
      this.applyAdjustments(adjustments);
    }
    this.state.solved = converged;

    if (converged) {
      console.log(`[Constraint Solver] Converged in ${this.state.iterations} iterations`);
      this.markConstraintsSatisfied();
    } else {
      console.error(`[Constraint Solver] Failed to converge after ${this.state.maxIterations} iterations`);
    }
    return converged;
  },
  // Calculate error for each constraint
  calculateConstraintErrors() {
    const errors = [];

    for (const constraint of this.state.constraints) {
      const error = this.evaluateConstraint(constraint);
      errors.push(error);
    }
    return errors;
  },
  // Evaluate a single constraint
  evaluateConstraint(constraint) {
    const entities = constraint.entities.map(id => this.getEntity(id));

    switch (constraint.type) {
      case 'DISTANCE':
        return this.evalDistance(entities, constraint.value);
      case 'HORIZONTAL':
        return this.evalHorizontal(entities);
      case 'VERTICAL':
        return this.evalVertical(entities);
      case 'PARALLEL':
        return this.evalParallel(entities);
      case 'PERPENDICULAR':
        return this.evalPerpendicular(entities);
      case 'COINCIDENT':
        return this.evalCoincident(entities);
      case 'CONCENTRIC':
        return this.evalConcentric(entities);
      case 'TANGENT':
        return this.evalTangent(entities);
      case 'EQUAL':
        return this.evalEqual(entities);
      case 'ANGLE':
        return this.evalAngle(entities, constraint.value);
      case 'RADIUS':
        return this.evalRadius(entities, constraint.value);
      case 'FIXED':
        return 0;  // Fixed constraints are always satisfied
      default:
        return 0;
    }
  },
  // Distance error calculation
  evalDistance(entities, targetDistance) {
    if (entities.length < 2) return 0;

    let p1, p2;

    // Handle different entity types
    if (entities[0].type === 'point') {
      p1 = { x: entities[0].x, y: entities[0].y };
    } else if (entities[0].type === 'line') {
      const start = this.getEntity(entities[0].start);
      p1 = { x: start.x, y: start.y };
    }
    if (entities[1].type === 'point') {
      p2 = { x: entities[1].x, y: entities[1].y };
    } else if (entities[1].type === 'line') {
      const start = this.getEntity(entities[1].start);
      p2 = { x: start.x, y: start.y };
    }
    const currentDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );

    return currentDistance - targetDistance;
  },
  // Horizontal error calculation
  evalHorizontal(entities) {
    if (entities[0].type !== 'line') return 0;

    const line = entities[0];
    const start = this.getEntity(line.start);
    const end = this.getEntity(line.end);

    return end.y - start.y;  // Should be 0 for horizontal
  },
  // Vertical error calculation
  evalVertical(entities) {
    if (entities[0].type !== 'line') return 0;

    const line = entities[0];
    const start = this.getEntity(line.start);
    const end = this.getEntity(line.end);

    return end.x - start.x;  // Should be 0 for vertical
  },
  // Parallel error calculation
  evalParallel(entities) {
    if (entities.length < 2) return 0;

    const line1 = entities[0];
    const line2 = entities[1];

    const start1 = this.getEntity(line1.start);
    const end1 = this.getEntity(line1.end);
    const start2 = this.getEntity(line2.start);
    const end2 = this.getEntity(line2.end);

    // Cross product should be 0 for parallel
    const dx1 = end1.x - start1.x;
    const dy1 = end1.y - start1.y;
    const dx2 = end2.x - start2.x;
    const dy2 = end2.y - start2.y;

    return dx1 * dy2 - dy1 * dx2;
  },
  // Perpendicular error calculation
  evalPerpendicular(entities) {
    if (entities.length < 2) return 0;

    const line1 = entities[0];
    const line2 = entities[1];

    const start1 = this.getEntity(line1.start);
    const end1 = this.getEntity(line1.end);
    const start2 = this.getEntity(line2.start);
    const end2 = this.getEntity(line2.end);

    // Dot product should be 0 for perpendicular
    const dx1 = end1.x - start1.x;
    const dy1 = end1.y - start1.y;
    const dx2 = end2.x - start2.x;
    const dy2 = end2.y - start2.y;

    return dx1 * dx2 + dy1 * dy2;
  },
  // Coincident error calculation
  evalCoincident(entities) {
    if (entities.length < 2) return 0;

    const p1 = entities[0];
    const p2 = entities[1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return Math.sqrt(dx * dx + dy * dy);
  },
  // Concentric error calculation
  evalConcentric(entities) {
    if (entities.length < 2) return 0;

    const c1Center = this.getEntity(entities[0].center);
    const c2Center = this.getEntity(entities[1].center);

    const dx = c2Center.x - c1Center.x;
    const dy = c2Center.y - c1Center.y;

    return Math.sqrt(dx * dx + dy * dy);
  },
  // Tangent error calculation
  evalTangent(entities) {
    // Simplified: distance between circle and line should equal radius
    if (entities.length < 2) return 0;

    const circle = entities[0].type === 'circle' ? entities[0] : entities[1];
    const line = entities[0].type === 'line' ? entities[0] : entities[1];

    if (!circle || !line) return 0;

    const center = this.getEntity(circle.center);
    const lineStart = this.getEntity(line.start);
    const lineEnd = this.getEntity(line.end);

    // Point-to-line distance
    const A = center.x - lineStart.x;
    const B = center.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const lenSq = C * C + D * D;
    const t = Math.max(0, Math.min(1, (A * C + B * D) / lenSq));

    const closestX = lineStart.x + t * C;
    const closestY = lineStart.y + t * D;

    const distance = Math.sqrt(
      Math.pow(center.x - closestX, 2) + Math.pow(center.y - closestY, 2)
    );

    return distance - circle.radius;
  },
  // Equal constraint evaluation
  evalEqual(entities) {
    if (entities.length < 2) return 0;

    // For lines, compare lengths
    if (entities[0].type === 'line' && entities[1].type === 'line') {
      const len1 = this.getLineLength(entities[0]);
      const len2 = this.getLineLength(entities[1]);
      return len1 - len2;
    }
    // For circles, compare radii
    if (entities[0].type === 'circle' && entities[1].type === 'circle') {
      return entities[0].radius - entities[1].radius;
    }
    return 0;
  },
  // Angle error calculation
  evalAngle(entities, targetAngle) {
    if (entities.length < 2) return 0;

    const line1 = entities[0];
    const line2 = entities[1];

    const start1 = this.getEntity(line1.start);
    const end1 = this.getEntity(line1.end);
    const start2 = this.getEntity(line2.start);
    const end2 = this.getEntity(line2.end);

    const dx1 = end1.x - start1.x;
    const dy1 = end1.y - start1.y;
    const dx2 = end2.x - start2.x;
    const dy2 = end2.y - start2.y;

    const dot = dx1 * dx2 + dy1 * dy2;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const currentAngle = Math.acos(dot / (len1 * len2)) * (180 / Math.PI);

    return currentAngle - targetAngle;
  },
  // Radius error calculation
  evalRadius(entities, targetRadius) {
    if (entities[0].type !== 'circle') return 0;
    return entities[0].radius - targetRadius;
  },
  // Helper: get line length
  getLineLength(line) {
    const start = this.getEntity(line.start);
    const end = this.getEntity(line.end);
    return Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
  },
  // Calculate Jacobian matrix (numerical approximation)
  calculateJacobian() {
    const epsilon = 1e-7;
    const numConstraints = this.state.constraints.length;
    const variables = this.getVariables();
    const numVariables = variables.length;

    const jacobian = [];

    for (let i = 0; i < numConstraints; i++) {
      const row = [];
      const constraint = this.state.constraints[i];
      const baseError = this.evaluateConstraint(constraint);

      for (let j = 0; j < numVariables; j++) {
        const variable = variables[j];
        const originalValue = this.getVariableValue(variable);

        // Perturb variable
        this.setVariableValue(variable, originalValue + epsilon);
        const perturbedError = this.evaluateConstraint(constraint);

        // Restore original value
        this.setVariableValue(variable, originalValue);

        // Numerical derivative
        row.push((perturbedError - baseError) / epsilon);
      }
      jacobian.push(row);
    }
    return jacobian;
  },
  // Get all variable references
  getVariables() {
    const variables = [];

    for (const entity of this.state.entities) {
      if (entity.fixed) continue;

      if (entity.type === 'point') {
        variables.push({ entity: entity.id, property: 'x' });
        variables.push({ entity: entity.id, property: 'y' });
      } else if (entity.type === 'circle') {
        variables.push({ entity: entity.id, property: 'radius' });
      }
    }
    return variables;
  },
  // Get variable value
  getVariableValue(variable) {
    const entity = this.getEntity(variable.entity);
    return entity[variable.property];
  },
  // Set variable value
  setVariableValue(variable, value) {
    const entity = this.getEntity(variable.entity);
    entity[variable.property] = value;
  },
  // Solve linear system Ax = b using pseudo-inverse
  solveLinearSystem(A, b) {
    // Simplified solver using gradient descent approach
    const variables = this.getVariables();
    const adjustments = new Array(variables.length).fill(0);
    const damping = 0.5;  // Damping factor to prevent oscillation

    for (let i = 0; i < b.length; i++) {
      for (let j = 0; j < variables.length; j++) {
        if (Math.abs(A[i][j]) > 1e-10) {
          adjustments[j] -= damping * b[i] * A[i][j] / (A[i][j] * A[i][j]);
        }
      }
    }
    return adjustments;
  },
  // Apply calculated adjustments to variables
  applyAdjustments(adjustments) {
    const variables = this.getVariables();

    for (let i = 0; i < variables.length; i++) {
      const currentValue = this.getVariableValue(variables[i]);
      this.setVariableValue(variables[i], currentValue + adjustments[i]);
    }
  },
  // Mark constraints as satisfied
  markConstraintsSatisfied() {
    for (const constraint of this.state.constraints) {
      const error = Math.abs(this.evaluateConstraint(constraint));
      constraint.satisfied = error < this.state.tolerance;
    }
  },
  // STATUS AND DIAGNOSTICS

  getStatus() {
    return {
      entityCount: this.state.entities.length,
      constraintCount: this.state.constraints.length,
      dofCount: this.state.dofCount,
      solved: this.state.solved,
      iterations: this.state.iterations,
      fullyConstrained: this.state.dofCount === 0,
      overConstrained: this.state.dofCount < 0,
      underConstrained: this.state.dofCount > 0
    };
  },
  getConstraintStatus() {
    return this.state.constraints.map(c => ({
      id: c.id,
      type: c.type,
      symbol: c.symbol,
      satisfied: c.satisfied,
      entities: c.entities
    }));
  },
  // RESET

  reset() {
    this.state.entities = [];
    this.state.constraints = [];
    this.state.parameters.clear();
    this.state.dofCount = 0;
    this.state.solved = false;
    this.state.iterations = 0;
  }
}