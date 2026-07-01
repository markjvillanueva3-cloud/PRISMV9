/**
 * PRISM_CONTACT_CONSTRAINT_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 441
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_CONTACT_CONSTRAINT_ENGINE = {
  version: '1.0.0',

  // Configuration
  config: {
    penetrationTolerance: 0.001,    // mm - minimum penetration to trigger
    maxPenetrationDepth: 10,        // mm - maximum allowed penetration
    contactStiffness: 100000,       // N/mm - spring constant for soft contact
    contactDamping: 1000,           // N·s/mm - damping coefficient
    frictionStatic: 0.3,            // static friction coefficient
    frictionDynamic: 0.2,           // dynamic friction coefficient
    restitution: 0.1,               // bounce coefficient (0-1)
    solverIterations: 10,           // constraint solver iterations
    baumgarteStabilization: 0.2,    // position correction factor
    warmStarting: true              // use previous solution as start
  },
  // Active constraints
  activeConstraints: [],

  // Contact manifold (current contact points)
  contactManifold: [],

  // Previous solution for warm starting
  previousSolution: null,

  // INITIALIZATION

  init() {
    console.log('[CONTACT_CONSTRAINT_ENGINE] Initializing...');

    // Integrate with collision system
    this.integrateWithCollisionSystem();

    // Integrate with simulation
    this.integrateWithSimulation();

    console.log('[CONTACT_CONSTRAINT_ENGINE] Ready');
    return this;
  },
  // CONTACT DETECTION AND CREATION

  /**
   * Process collision results and create contact constraints
   */
  processCollisions(collisionResults) {
    // Clear old manifold
    this.contactManifold = [];

    if (!collisionResults.hasCollision && collisionResults.collisions?.length === 0) {
      return { contacts: [], constraints: [] };
    }
    const contacts = [];

    for (const collision of collisionResults.collisions || []) {
      // Get detailed contact information
      const contactInfo = this.computeContactInfo(collision);

      if (contactInfo && contactInfo.penetrationDepth > this.config.penetrationTolerance) {
        contacts.push(contactInfo);
        this.contactManifold.push(contactInfo);
      }
    }
    // Create constraints for each contact
    const constraints = contacts.map(c => this.createContactConstraint(c));

    return { contacts, constraints };
  },
  /**
   * Compute detailed contact information
   */
  computeContactInfo(collision) {
    const { componentA, componentB, point, normal, depth } = collision;

    return {
      id: `contact_${componentA}_${componentB}_${Date.now()}`,
      bodyA: componentA,
      bodyB: componentB,
      contactPoint: point || { x: 0, y: 0, z: 0 },
      contactNormal: normal || { x: 0, y: 1, z: 0 },
      penetrationDepth: depth || 0,
      tangent1: this.computeTangent(normal),
      tangent2: this.computeTangent2(normal),
      relativeVelocity: { x: 0, y: 0, z: 0 },
      isResting: false,
      lifetime: 0
    };
  },
  /**
   * Compute tangent vector perpendicular to normal
   */
  computeTangent(normal) {
    if (!normal) return { x: 1, y: 0, z: 0 };

    // Choose a vector not parallel to normal
    const up = Math.abs(normal.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };

    // Cross product: tangent = up × normal
    return {
      x: up.y * normal.z - up.z * normal.y,
      y: up.z * normal.x - up.x * normal.z,
      z: up.x * normal.y - up.y * normal.x
    };
  },
  computeTangent2(normal) {
    const t1 = this.computeTangent(normal);
    // tangent2 = normal × tangent1
    return {
      x: normal.y * t1.z - normal.z * t1.y,
      y: normal.z * t1.x - normal.x * t1.z,
      z: normal.x * t1.y - normal.y * t1.x
    };
  },
  // CONSTRAINT CREATION

  /**
   * Create contact constraint from contact info
   */
  createContactConstraint(contactInfo) {
    return {
      type: 'contact',
      id: contactInfo.id,
      bodyA: contactInfo.bodyA,
      bodyB: contactInfo.bodyB,
      point: contactInfo.contactPoint,
      normal: contactInfo.contactNormal,
      penetration: contactInfo.penetrationDepth,

      // Constraint parameters
      stiffness: this.config.contactStiffness,
      damping: this.config.contactDamping,

      // Friction
      frictionStatic: this.config.frictionStatic,
      frictionDynamic: this.config.frictionDynamic,
      tangent1: contactInfo.tangent1,
      tangent2: contactInfo.tangent2,

      // Impulse accumulators (for warm starting)
      normalImpulse: 0,
      tangentImpulse1: 0,
      tangentImpulse2: 0,

      // State
      active: true
    };
  },
  /**
   * Create joint constraint (for axis limits)
   */
  createJointConstraint(joint, currentValue, limits) {
    const [min, max] = limits;

    let type = null;
    let error = 0;

    if (currentValue < min) {
      type = 'lower_limit';
      error = min - currentValue;
    } else if (currentValue > max) {
      type = 'upper_limit';
      error = currentValue - max;
    }
    if (!type) return null;

    return {
      type: 'joint_limit',
      id: `joint_${joint.name}_${type}`,
      joint: joint,
      limitType: type,
      error: error,
      stiffness: 1000000,  // Very stiff for hard limits
      damping: 10000,
      active: true
    };
  },
  // CONSTRAINT SOLVING

  /**
   * Solve all active constraints
   */
  solveConstraints(constraints, dt) {
    if (!constraints || constraints.length === 0) return [];

    const impulses = [];

    // Warm starting - use previous solution
    if (this.config.warmStarting && this.previousSolution) {
      this.applyWarmStart(constraints);
    }
    // Iterative solver
    for (let iter = 0; iter < this.config.solverIterations; iter++) {
      for (const constraint of constraints) {
        if (!constraint.active) continue;

        let impulse;

        if (constraint.type === 'contact') {
          impulse = this.solveContactConstraint(constraint, dt);
        } else if (constraint.type === 'joint_limit') {
          impulse = this.solveJointConstraint(constraint, dt);
        }
        if (impulse) {
          impulses.push(impulse);
        }
      }
    }
    // Store solution for warm starting
    this.previousSolution = constraints.map(c => ({
      id: c.id,
      normalImpulse: c.normalImpulse,
      tangentImpulse1: c.tangentImpulse1,
      tangentImpulse2: c.tangentImpulse2
    }));

    return impulses;
  },
  /**
   * Solve single contact constraint
   */
  solveContactConstraint(constraint, dt) {
    const { penetration, stiffness, damping, normal } = constraint;

    // Compute correction impulse using penalty method
    // F = k * penetration + c * velocity

    // Position correction (Baumgarte stabilization)
    const positionCorrection = this.config.baumgarteStabilization * penetration / dt;

    // Normal impulse
    const normalImpulse = stiffness * penetration * dt + damping * positionCorrection * dt;

    // Clamp to non-negative (can only push, not pull)
    const clampedImpulse = Math.max(0, normalImpulse);

    // Accumulate
    constraint.normalImpulse += clampedImpulse;

    // Friction impulses (simplified Coulomb friction)
    const maxFriction = constraint.frictionStatic * constraint.normalImpulse;
    constraint.tangentImpulse1 = Math.max(-maxFriction, Math.min(maxFriction, constraint.tangentImpulse1));
    constraint.tangentImpulse2 = Math.max(-maxFriction, Math.min(maxFriction, constraint.tangentImpulse2));

    return {
      constraintId: constraint.id,
      type: 'contact',
      impulse: {
        x: normal.x * clampedImpulse,
        y: normal.y * clampedImpulse,
        z: normal.z * clampedImpulse
      },
      point: constraint.point,
      magnitude: clampedImpulse
    };
  },
  /**
   * Solve joint limit constraint
   */
  solveJointConstraint(constraint, dt) {
    const { error, stiffness, damping } = constraint;

    // Spring-damper response
    const impulse = stiffness * error * dt;

    return {
      constraintId: constraint.id,
      type: 'joint_limit',
      joint: constraint.joint.name,
      correction: error * this.config.baumgarteStabilization,
      impulse: impulse
    };
  },
  /**
   * Apply warm start from previous solution
   */
  applyWarmStart(constraints) {
    if (!this.previousSolution) return;

    for (const constraint of constraints) {
      const prev = this.previousSolution.find(p => p.id === constraint.id);
      if (prev) {
        constraint.normalImpulse = prev.normalImpulse * 0.9;  // Decay factor
        constraint.tangentImpulse1 = prev.tangentImpulse1 * 0.9;
        constraint.tangentImpulse2 = prev.tangentImpulse2 * 0.9;
      }
    }
  },
  // POSITION CORRECTION

  /**
   * Compute position corrections to resolve penetrations
   */
  computePositionCorrections(constraints) {
    const corrections = [];

    for (const constraint of constraints) {
      if (!constraint.active) continue;

      if (constraint.type === 'contact' && constraint.penetration > this.config.penetrationTolerance) {
        // Push bodies apart along contact normal
        const correction = {
          bodyA: constraint.bodyA,
          bodyB: constraint.bodyB,
          correction: {
            x: constraint.normal.x * constraint.penetration * 0.5,
            y: constraint.normal.y * constraint.penetration * 0.5,
            z: constraint.normal.z * constraint.penetration * 0.5
          }
        };
        corrections.push(correction);
      }
      if (constraint.type === 'joint_limit') {
        corrections.push({
          joint: constraint.joint.name,
          correction: constraint.error * this.config.baumgarteStabilization
        });
      }
    }
    return corrections;
  },
  // COLLISION RESPONSE

  /**
   * Apply collision response (for dynamic simulation)
   */
  applyCollisionResponse(contact, bodyAVelocity, bodyBVelocity) {
    const { normal, restitution = this.config.restitution } = contact;

    // Relative velocity at contact point
    const relVel = {
      x: bodyAVelocity.x - bodyBVelocity.x,
      y: bodyAVelocity.y - bodyBVelocity.y,
      z: bodyAVelocity.z - bodyBVelocity.z
    };
    // Normal component of relative velocity
    const normalVel = relVel.x * normal.x + relVel.y * normal.y + relVel.z * normal.z;

    // Only separate if approaching
    if (normalVel >= 0) return null;

    // Impulse magnitude (simplified - assumes equal masses)
    const j = -(1 + restitution) * normalVel;

    return {
      impulse: {
        x: j * normal.x,
        y: j * normal.y,
        z: j * normal.z
      }
    };
  },
  // INTEGRATION WITH OTHER SYSTEMS

  integrateWithCollisionSystem() {
    if (typeof COLLISION_SYSTEM === 'undefined') return;

    // Add constraint processing to collision results
    COLLISION_SYSTEM.processWithConstraints = (model) => {
      const collisionResults = COLLISION_SYSTEM.checkCollisionsBVH?.(model) ||
                              COLLISION_SYSTEM.checkAllCollisions?.(model);

      if (!collisionResults) return null;

      const constraintResults = this.processCollisions(collisionResults);

      return {
        ...collisionResults,
        contacts: constraintResults.contacts,
        constraints: constraintResults.constraints
      };
    };
    console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with COLLISION_SYSTEM');
  },
  integrateWithSimulation() {
    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      ULTIMATE_3D_MACHINE_SYSTEM.contactConstraints = this;

      // Add constraint checking to animation
      const originalMoveAxis = ULTIMATE_3D_MACHINE_SYSTEM.animation.moveAxis;
      if (originalMoveAxis) {
        ULTIMATE_3D_MACHINE_SYSTEM.animation.moveAxis = async function(axis, target, duration) {
          // Check joint limits before moving
          const config = this.config?.axes?.[axis];
          if (config?.limits) {
            const constraint = PRISM_CONTACT_CONSTRAINT_ENGINE.createJointConstraint(
              { name: axis }, target, config.limits
            );

            if (constraint) {
              // Clamp target to limits
              target = Math.max(config.limits[0], Math.min(config.limits[1], target));
              console.log('[ContactConstraint] Clamped', axis, 'to', target);
            }
          }
          return originalMoveAxis.call(this, axis, target, duration);
        };
      }
      console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with ULTIMATE_3D_MACHINE_SYSTEM');
    }
    // Integrate with PRISM_KINEMATIC_SOLVER
    if (typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      PRISM_KINEMATIC_SOLVER.checkConstraints = (modelType, joints) => {
        const model = PRISM_KINEMATIC_SOLVER.getModel(modelType);
        if (!model?.joints) return { valid: true, constraints: [] };

        const constraints = [];

        for (const joint of model.joints) {
          const value = joints[joint.name];
          if (value !== undefined && joint.limits) {
            const constraint = this.createJointConstraint(joint, value, joint.limits);
            if (constraint) {
              constraints.push(constraint);
            }
          }
        }
        return {
          valid: constraints.length === 0,
          constraints
        };
      };
      console.log('[CONTACT_CONSTRAINT_ENGINE] Integrated with PRISM_KINEMATIC_SOLVER');
    }
  },
  // API

  getActiveConstraints() {
    return this.activeConstraints;
  },
  getContactManifold() {
    return this.contactManifold;
  },
  clearConstraints() {
    this.activeConstraints = [];
    this.contactManifold = [];
    this.previousSolution = null;
  },
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}