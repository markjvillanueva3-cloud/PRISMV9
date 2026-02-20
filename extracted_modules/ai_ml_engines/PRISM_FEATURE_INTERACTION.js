const PRISM_FEATURE_INTERACTION = {
  version: '1.0.0',

  /**
   * Analyze interactions between features
   */
  analyze(features) {
    const interactions = [];

    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const interaction = this._checkInteraction(features[i], features[j]);
        if (interaction) {
          interactions.push(interaction);
        }
      }
    }
    // Check for compound interactions (3+ features)
    const compounds = this._checkCompoundInteractions(features);
    interactions.push(...compounds);

    return {
      hasInteractions: interactions.length > 0,
      interactions,
      sequenceConstraints: this._deriveSequenceConstraints(interactions),
      warnings: interactions.filter(i => i.severity === 'high').map(i => i.warning)
    };
  },
  _checkInteraction(f1, f2) {
    // Proximity check
    const proximity = this._calculateProximity(f1, f2);

    // Check for overlapping/intersecting features
    if (proximity.overlapping) {
      return {
        type: 'overlap',
        features: [f1.id, f2.id],
        severity: 'critical',
        warning: `Features ${f1.id} and ${f2.id} overlap - check design`,
        resolution: 'Modify one feature to eliminate overlap'
      };
    }
    // Check for thin wall between features
    if (proximity.distance < 0.1 && proximity.distance > 0) {
      return {
        type: 'thin_wall',
        features: [f1.id, f2.id],
        severity: 'high',
        wallThickness: proximity.distance,
        warning: `Thin wall (${proximity.distance.toFixed(3)}") between ${f1.id} and ${f2.id}`,
        resolution: 'Machine adjacent features together, use light cuts',
        sequenceRequirement: 'machine_together'
      };
    }
    // Check for boss inside pocket
    if ((f1.type === 'pocket' && f2.type === 'boss') ||
        (f2.type === 'pocket' && f1.type === 'boss')) {
      const pocket = f1.type === 'pocket' ? f1 : f2;
      const boss = f1.type === 'boss' ? f1 : f2;

      if (this._isInside(boss, pocket)) {
        return {
          type: 'boss_in_pocket',
          features: [pocket.id, boss.id],
          severity: 'medium',
          warning: `Boss ${boss.id} inside pocket ${pocket.id} - requires rest machining`,
          resolution: 'Use rest machining or smaller tool for pocket floor',
          sequenceRequirement: 'rough_pocket_first'
        };
      }
    }
    // Check for holes too close together
    if (f1.type === 'hole' && f2.type === 'hole') {
      const minSpacing = Math.max(f1.params?.diameter || 0, f2.params?.diameter || 0) * 1.5;
      if (proximity.distance < minSpacing && proximity.distance > 0) {
        return {
          type: 'close_holes',
          features: [f1.id, f2.id],
          severity: 'medium',
          warning: `Holes ${f1.id} and ${f2.id} are close - may affect accuracy`,
          resolution: 'Drill in alternating pattern to reduce stress'
        };
      }
    }
    // Check for thread near thin wall
    if ((f1.type === 'thread' || f2.type === 'thread') &&
        (f1.type === 'contour' || f2.type === 'contour' || proximity.nearEdge)) {
      return {
        type: 'thread_near_edge',
        features: [f1.id, f2.id],
        severity: 'medium',
        warning: 'Thread near edge - risk of breakthrough or distortion',
        resolution: 'Check thread depth, consider thread milling'
      };
    }
    return null;
  },
  _checkCompoundInteractions(features) {
    const compounds = [];

    // Check for multiple pockets sharing walls
    const pockets = features.filter(f => f.type === 'pocket');
    if (pockets.length > 2) {
      // Check if they form a grid pattern
      let sharedWalls = 0;
      for (let i = 0; i < pockets.length; i++) {
        for (let j = i + 1; j < pockets.length; j++) {
          const proximity = this._calculateProximity(pockets[i], pockets[j]);
          if (proximity.distance < 0.2) sharedWalls++;
        }
      }
      if (sharedWalls > pockets.length) {
        compounds.push({
          type: 'pocket_grid',
          features: pockets.map(p => p.id),
          severity: 'medium',
          warning: 'Multiple pockets with shared walls - machining order affects accuracy',
          resolution: 'Machine from center out, or use constant tool engagement paths',
          sequenceRequirement: 'center_out'
        });
      }
    }
    // Check for deep features with multiple tools required
    const deepFeatures = features.filter(f =>
      (f.params?.depth || 0) > (f.params?.width || f.params?.diameter || 1) * 3
    );

    if (deepFeatures.length > 1) {
      compounds.push({
        type: 'multiple_deep_features',
        features: deepFeatures.map(f => f.id),
        severity: 'low',
        warning: 'Multiple deep features may require tool length planning',
        resolution: 'Group operations by tool length to minimize changes'
      });
    }
    return compounds;
  },
  _calculateProximity(f1, f2) {
    // Get bounding boxes
    const bb1 = this._getBoundingBox(f1);
    const bb2 = this._getBoundingBox(f2);

    // Check overlap
    const overlapping =
      bb1.minX < bb2.maxX && bb1.maxX > bb2.minX &&
      bb1.minY < bb2.maxY && bb1.maxY > bb2.minY;

    // Calculate minimum distance
    let distance = Infinity;

    if (!overlapping) {
      const dx = Math.max(0, Math.max(bb1.minX - bb2.maxX, bb2.minX - bb1.maxX));
      const dy = Math.max(0, Math.max(bb1.minY - bb2.maxY, bb2.minY - bb1.maxY));
      distance = Math.sqrt(dx*dx + dy*dy);
    } else {
      distance = 0;
    }
    return {
      overlapping: overlapping && distance === 0,
      distance,
      nearEdge: false // Would need part boundary info
    };
  },
  _getBoundingBox(feature) {
    const params = feature.params || {};
    const x = params.x || 0;
    const y = params.y || 0;

    if (feature.type === 'hole' || feature.type === 'boss') {
      const r = (params.diameter || 0.5) / 2;
      return {
        minX: x - r, maxX: x + r,
        minY: y - r, maxY: y + r
      };
    }
    const l = params.length || 1;
    const w = params.width || 1;
    return {
      minX: x - l/2, maxX: x + l/2,
      minY: y - w/2, maxY: y + w/2
    };
  },
  _isInside(inner, outer) {
    const bbInner = this._getBoundingBox(inner);
    const bbOuter = this._getBoundingBox(outer);

    return bbInner.minX > bbOuter.minX && bbInner.maxX < bbOuter.maxX &&
           bbInner.minY > bbOuter.minY && bbInner.maxY < bbOuter.maxY;
  },
  _deriveSequenceConstraints(interactions) {
    const constraints = [];

    for (const interaction of interactions) {
      if (interaction.sequenceRequirement) {
        constraints.push({
          type: interaction.sequenceRequirement,
          features: interaction.features,
          reason: interaction.warning
        });
      }
    }
    return constraints;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_FEATURE_INTERACTION] v1.0 initialized');
    return this;
  }
}