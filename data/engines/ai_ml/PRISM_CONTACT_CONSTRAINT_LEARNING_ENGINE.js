/**
 * PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 11
 * Lines: 490
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED DATA STRUCTURES

  learnedData: {
    // Per-machine collision zones
    collisionZones: {},

    // Contact frequency maps (heat maps)
    contactHeatMaps: {},

    // Safe clearance distances
    safeClearances: {},

    // Common collision patterns
    collisionPatterns: [],

    // Tool-holder interference database
    toolHolderInterference: {},

    // Fixture collision zones
    fixtureCollisionZones: {}
  },
  // Observation buffer
  contactObservations: [],
  maxObservations: 5000,

  // INITIALIZATION

  init() {
    console.log('[CONTACT_LEARNING] Initializing...');

    // Load saved data
    this.loadLearnedData();

    // Listen for contact events
    window.addEventListener('contactDetected', (e) => {
      this.recordContact(e.detail);
    });

    // Listen for collision events
    window.addEventListener('collisionDetected', (e) => {
      this.recordCollision(e.detail);
    });

    // Integrate with constraint engine
    this.integrateWithConstraintEngine();

    // Integrate with collision system
    this.integrateWithCollisionSystem();

    console.log('[CONTACT_LEARNING] Ready with',
                this.contactObservations.length, 'observations');

    return this;
  },
  // RECORD OBSERVATIONS

  recordContact(detail) {
    const observation = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      contactPoint: detail.contactPoint,
      contactNormal: detail.contactNormal,
      penetrationDepth: detail.penetrationDepth,
      bodyA: detail.bodyA,
      bodyB: detail.bodyB,
      axisPositions: detail.axisPositions,
      toolId: detail.toolId,
      holderId: detail.holderId,
      operationType: detail.operationType
    };
    this.contactObservations.push(observation);

    if (this.contactObservations.length > this.maxObservations) {
      this.contactObservations.shift();
    }
    // Learn from accumulated data
    this.learnFromContacts(detail.machineId);
  },
  recordCollision(detail) {
    // Record as pattern
    const pattern = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      componentA: detail.componentA,
      componentB: detail.componentB,
      severity: detail.severity || 'warning',
      axisPositions: detail.axisPositions,
      toolInfo: detail.toolInfo,
      operationContext: detail.operationContext
    };
    this.learnedData.collisionPatterns.push(pattern);

    // Keep patterns manageable
    if (this.learnedData.collisionPatterns.length > 1000) {
      this.learnedData.collisionPatterns.shift();
    }
    // Update collision zones
    this.updateCollisionZones(detail);

    // Save periodically
    if (this.learnedData.collisionPatterns.length % 50 === 0) {
      this.saveLearnedData();
    }
  },
  // LEARNING ALGORITHMS

  learnFromContacts(machineId) {
    const machineContacts = this.contactObservations.filter(o =>
      o.machineId === machineId
    );

    if (machineContacts.length < 20) return;

    // Build contact heat map
    this.buildContactHeatMap(machineId, machineContacts);

    // Learn safe clearances
    this.learnSafeClearances(machineId, machineContacts);

    // Identify tool-holder interference zones
    this.learnToolHolderInterference(machineId, machineContacts);
  },
  buildContactHeatMap(machineId, contacts) {
    // Discretize workspace into grid
    const gridSize = 50; // mm
    const heatMap = {};

    for (const contact of contacts) {
      const pt = contact.contactPoint;
      if (!pt) continue;

      const key = `${Math.floor(pt.x / gridSize)}_${Math.floor(pt.y / gridSize)}_${Math.floor(pt.z / gridSize)}`;

      heatMap[key] = (heatMap[key] || 0) + 1;
    }
    this.learnedData.contactHeatMaps[machineId] = {
      gridSize,
      data: heatMap,
      maxCount: Math.max(...Object.values(heatMap)),
      lastUpdated: Date.now()
    };
  },
  learnSafeClearances(machineId, contacts) {
    // Group contacts by body pairs
    const pairClearances = {};

    for (const contact of contacts) {
      const pairKey = [contact.bodyA, contact.bodyB].sort().join('_');

      if (!pairClearances[pairKey]) {
        pairClearances[pairKey] = [];
      }
      // Record the penetration depth as "unsafe" clearance
      pairClearances[pairKey].push(contact.penetrationDepth || 0);
    }
    // Calculate safe clearance as max penetration + margin
    const safeClearances = {};

    for (const [pair, depths] of Object.entries(pairClearances)) {
      const maxPenetration = Math.max(...depths);
      safeClearances[pair] = {
        minimum: maxPenetration + 5,  // 5mm safety margin
        recommended: maxPenetration + 10,
        observationCount: depths.length
      };
    }
    this.learnedData.safeClearances[machineId] = safeClearances;
  },
  learnToolHolderInterference(machineId, contacts) {
    // Filter contacts involving tools or holders
    const toolContacts = contacts.filter(c =>
      c.toolId || c.holderId ||
      c.bodyA?.includes('tool') || c.bodyA?.includes('holder') ||
      c.bodyB?.includes('tool') || c.bodyB?.includes('holder')
    );

    if (toolContacts.length < 10) return;

    // Group by tool/holder combination
    const interferenceData = {};

    for (const contact of toolContacts) {
      const key = `${contact.toolId || 'unknown'}_${contact.holderId || 'unknown'}`;

      if (!interferenceData[key]) {
        interferenceData[key] = {
          contacts: [],
          axisRanges: { X: [], Y: [], Z: [], A: [], B: [], C: [] }
        };
      }
      interferenceData[key].contacts.push(contact.contactPoint);

      // Track axis positions at interference
      if (contact.axisPositions) {
        for (const [axis, pos] of Object.entries(contact.axisPositions)) {
          if (interferenceData[key].axisRanges[axis]) {
            interferenceData[key].axisRanges[axis].push(pos);
          }
        }
      }
    }
    // Calculate interference zones
    for (const [key, data] of Object.entries(interferenceData)) {
      data.interferenceZone = {};

      for (const [axis, positions] of Object.entries(data.axisRanges)) {
        if (positions.length > 0) {
          data.interferenceZone[axis] = {
            min: Math.min(...positions),
            max: Math.max(...positions)
          };
        }
      }
    }
    this.learnedData.toolHolderInterference[machineId] = interferenceData;
  },
  updateCollisionZones(detail) {
    const machineId = detail.machineId;

    if (!this.learnedData.collisionZones[machineId]) {
      this.learnedData.collisionZones[machineId] = [];
    }
    // Add new zone or update existing
    const newZone = {
      componentA: detail.componentA,
      componentB: detail.componentB,
      axisPositions: detail.axisPositions,
      boundingBox: detail.boundingBox,
      occurrenceCount: 1,
      lastOccurrence: Date.now()
    };
    // Check for similar existing zone
    const existingIdx = this.learnedData.collisionZones[machineId].findIndex(z =>
      z.componentA === newZone.componentA && z.componentB === newZone.componentB
    );

    if (existingIdx >= 0) {
      const existing = this.learnedData.collisionZones[machineId][existingIdx];
      existing.occurrenceCount++;
      existing.lastOccurrence = Date.now();

      // Expand bounding box
      if (detail.axisPositions) {
        for (const [axis, pos] of Object.entries(detail.axisPositions)) {
          if (!existing.axisRange) existing.axisRange = {};
          if (!existing.axisRange[axis]) {
            existing.axisRange[axis] = { min: pos, max: pos };
          } else {
            existing.axisRange[axis].min = Math.min(existing.axisRange[axis].min, pos);
            existing.axisRange[axis].max = Math.max(existing.axisRange[axis].max, pos);
          }
        }
      }
    } else {
      this.learnedData.collisionZones[machineId].push(newZone);
    }
  },
  // PREDICTION AND RECOMMENDATIONS

  /**
   * Predict if a position is likely to cause collision
   */
  predictCollision(machineId, axisPositions, toolId, holderId) {
    // Check learned collision zones
    const zones = this.learnedData.collisionZones[machineId] || [];

    for (const zone of zones) {
      if (!zone.axisRange) continue;

      let inZone = true;
      for (const [axis, pos] of Object.entries(axisPositions)) {
        const range = zone.axisRange[axis];
        if (range && (pos < range.min || pos > range.max)) {
          inZone = false;
          break;
        }
      }
      if (inZone && zone.occurrenceCount > 3) {
        return {
          likely: true,
          confidence: Math.min(0.95, zone.occurrenceCount / 20),
          zone: zone,
          reason: `${zone.componentA} - ${zone.componentB} collision zone`
        };
      }
    }
    // Check tool-holder interference
    if (toolId || holderId) {
      const interference = this.learnedData.toolHolderInterference[machineId];
      if (interference) {
        const key = `${toolId || 'unknown'}_${holderId || 'unknown'}`;
        const data = interference[key];

        if (data?.interferenceZone) {
          let inZone = true;
          for (const [axis, pos] of Object.entries(axisPositions)) {
            const range = data.interferenceZone[axis];
            if (range && (pos < range.min || pos > range.max)) {
              inZone = false;
              break;
            }
          }
          if (inZone) {
            return {
              likely: true,
              confidence: 0.8,
              reason: 'Tool-holder interference zone'
            };
          }
        }
      }
    }
    return { likely: false, confidence: 0.9 };
  },
  /**
   * Get recommended clearance for body pair
   */
  getRecommendedClearance(machineId, bodyA, bodyB) {
    const pairKey = [bodyA, bodyB].sort().join('_');
    const clearances = this.learnedData.safeClearances[machineId];

    if (clearances?.[pairKey]) {
      return clearances[pairKey];
    }
    // Return default
    return { minimum: 5, recommended: 10, observationCount: 0 };
  },
  /**
   * Get collision danger zones for visualization
   */
  getCollisionDangerZones(machineId) {
    return this.learnedData.collisionZones[machineId] || [];
  },
  /**
   * Get contact heat map for visualization
   */
  getContactHeatMap(machineId) {
    return this.learnedData.contactHeatMaps[machineId] || null;
  },
  // INTEGRATION

  integrateWithConstraintEngine() {
    if (typeof PRISM_CONTACT_CONSTRAINT_ENGINE === 'undefined') return;

    // Add prediction to constraint engine
    PRISM_CONTACT_CONSTRAINT_ENGINE.predictCollision = (machineId, positions, toolId, holderId) => {
      return this.predictCollision(machineId, positions, toolId, holderId);
    };
    PRISM_CONTACT_CONSTRAINT_ENGINE.getRecommendedClearance = (machineId, bodyA, bodyB) => {
      return this.getRecommendedClearance(machineId, bodyA, bodyB);
    };
    // Hook into constraint processing to learn
    const originalProcess = PRISM_CONTACT_CONSTRAINT_ENGINE.processCollisions.bind(PRISM_CONTACT_CONSTRAINT_ENGINE);

    PRISM_CONTACT_CONSTRAINT_ENGINE.processCollisions = (results, context = {}) => {
      const processed = originalProcess(results);

      // Learn from each contact
      for (const contact of processed.contacts || []) {
        this.recordContact({
          ...contact,
          ...context,
          penetrationDepth: contact.penetrationDepth
        });
      }
      return processed;
    };
    console.log('[CONTACT_LEARNING] Integrated with CONTACT_CONSTRAINT_ENGINE');
  },
  integrateWithCollisionSystem() {
    if (typeof COLLISION_SYSTEM === 'undefined') return;

    // Hook into collision monitor
    if (COLLISION_SYSTEM.Monitor) {
      COLLISION_SYSTEM.Monitor.onCollision((results) => {
        for (const collision of results.collisions || []) {
          window.dispatchEvent(new CustomEvent('collisionDetected', {
            detail: collision
          }));
        }
      });
    }
    // Add danger zone visualization
    COLLISION_SYSTEM.visualizeDangerZones = (machineId, scene) => {
      const zones = this.getCollisionDangerZones(machineId);
      const group = new THREE.Group();
      group.name = 'danger_zones';

      for (const zone of zones) {
        if (!zone.axisRange) continue;

        // Create danger zone indicator
        const geometry = new THREE.BoxGeometry(
          (zone.axisRange.X?.max - zone.axisRange.X?.min) || 50,
          (zone.axisRange.Y?.max - zone.axisRange.Y?.min) || 50,
          (zone.axisRange.Z?.max - zone.axisRange.Z?.min) || 50
        );

        const material = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.15 + (zone.occurrenceCount / 50) * 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          ((zone.axisRange.X?.max || 0) + (zone.axisRange.X?.min || 0)) / 2,
          ((zone.axisRange.Y?.max || 0) + (zone.axisRange.Y?.min || 0)) / 2,
          ((zone.axisRange.Z?.max || 0) + (zone.axisRange.Z?.min || 0)) / 2
        );

        mesh.userData = { zone, type: 'danger_zone' };
        group.add(mesh);
      }
      if (scene) scene.add(group);
      return group;
    };
    console.log('[CONTACT_LEARNING] Integrated with COLLISION_SYSTEM');
  },
  // PERSISTENCE

  loadLearnedData() {
    try {
      const stored = localStorage.getItem('prism_contact_learning');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.learnedData = { ...this.learnedData, ...parsed };

        const obsStored = localStorage.getItem('prism_contact_observations');
        if (obsStored) {
          this.contactObservations = JSON.parse(obsStored);
        }
      }
    } catch (e) {
      console.warn('[CONTACT_LEARNING] Failed to load:', e);
    }
  },
  saveLearnedData() {
    try {
      localStorage.setItem('prism_contact_learning', JSON.stringify(this.learnedData));

      // Save only recent observations
      const recentObs = this.contactObservations.slice(-1000);
      localStorage.setItem('prism_contact_observations', JSON.stringify(recentObs));
    } catch (e) {
      console.warn('[CONTACT_LEARNING] Failed to save:', e);
    }
  },
  // API

  getLearnedData() {
    return this.learnedData;
  },
  exportData() {
    return JSON.stringify({
      learnedData: this.learnedData,
      observations: this.contactObservations.slice(-500)
    }, null, 2);
  },
  importData(json) {
    try {
      const data = JSON.parse(json);
      if (data.learnedData) {
        this.learnedData = { ...this.learnedData, ...data.learnedData };
      }
      if (data.observations) {
        this.contactObservations.push(...data.observations);
      }
      this.saveLearnedData();
      return true;
    } catch (e) {
      return false;
    }
  },
  clearData() {
    this.learnedData = {
      collisionZones: {},
      contactHeatMaps: {},
      safeClearances: {},
      collisionPatterns: [],
      toolHolderInterference: {},
      fixtureCollisionZones: {}
    };
    this.contactObservations = [];
    this.saveLearnedData();
  }
}