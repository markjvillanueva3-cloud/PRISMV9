const PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE = {
  version: '1.0.0',

  // LEARNED BEHAVIOR DATABASE

  learnedBehaviors: {
    // Per-machine axis behavior profiles
    // Key: machineId, Value: { axes: { X: {...}, Y: {...}, ... } }
  },
  // Observation buffer for learning
  observations: [],
  maxObservations: 10000,

  // Default behavior templates
  defaultBehaviors: {
    linear: {
      maxVelocity: 30000,        // mm/min
      maxAcceleration: 5000,     // mm/min²
      maxJerk: 50000,            // mm/min³
      servoLag: 0.002,           // seconds
      followingError: 0.005,     // mm at rapid
      backlash: 0.005,           // mm
      repeatability: 0.002,      // mm
      thermalCoeff: 0.00001,     // mm/°C expansion
      resonanceFreq: 50,         // Hz (to avoid)
      velocityProfile: 'trapezoidal'  // 'trapezoidal', 's-curve', 'jerk-limited'
    },
    rotary: {
      maxVelocity: 6000,         // deg/min
      maxAcceleration: 2000,     // deg/min²
      maxJerk: 20000,            // deg/min³
      servoLag: 0.003,           // seconds
      followingError: 0.01,      // degrees at rapid
      backlash: 0.008,           // degrees
      repeatability: 0.003,      // degrees
      indexAccuracy: 0.002,      // degrees
      clampingDelay: 0.5,        // seconds
      velocityProfile: 's-curve'
    }
  },
  // INITIALIZATION

  init() {
    console.log('[AXIS_BEHAVIOR_LEARNING] Initializing...');

    // Load saved behaviors
    this.loadLearnedBehaviors();

    // Listen for motion events
    window.addEventListener('axisMotionComplete', (e) => {
      this.recordObservation(e.detail);
    });

    // Listen for probing results (calibration data)
    window.addEventListener('probeResultReceived', (e) => {
      this.learnFromProbing(e.detail);
    });

    // Integrate with simulation systems
    this.integrateWithSimulation();

    console.log('[AXIS_BEHAVIOR_LEARNING] Ready with',
                Object.keys(this.learnedBehaviors).length, 'machine profiles');

    return this;
  },
  // RECORD MOTION OBSERVATION

  recordObservation(detail) {
    const observation = {
      timestamp: Date.now(),
      machineId: detail.machineId,
      axis: detail.axis,
      startPos: detail.startPos,
      endPos: detail.endPos,
      commandedVelocity: detail.velocity,
      actualVelocity: detail.actualVelocity,
      acceleration: detail.acceleration,
      duration: detail.duration,
      followingError: detail.followingError,
      motorLoad: detail.motorLoad,
      temperature: detail.temperature
    };
    this.observations.push(observation);

    // Keep buffer size manageable
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }
    // Learn from accumulated observations
    this.learnFromObservations(detail.machineId, detail.axis);
  },
  // LEARN FROM OBSERVATIONS

  learnFromObservations(machineId, axis) {
    const axisObservations = this.observations.filter(o =>
      o.machineId === machineId && o.axis === axis
    );

    if (axisObservations.length < 10) return; // Need minimum data

    // Calculate average behaviors
    const avgVelocity = this.average(axisObservations.map(o => o.actualVelocity));
    const avgAccel = this.average(axisObservations.map(o => o.acceleration));
    const avgFollowError = this.average(axisObservations.map(o => o.followingError).filter(e => e));

    // Calculate velocity profile characteristics
    const velocityProfile = this.analyzeVelocityProfile(axisObservations);

    // Update learned behaviors
    if (!this.learnedBehaviors[machineId]) {
      this.learnedBehaviors[machineId] = { axes: {} };
    }
    const existing = this.learnedBehaviors[machineId].axes[axis] || this.getDefaultBehavior(axis);

    this.learnedBehaviors[machineId].axes[axis] = {
      ...existing,
      maxVelocity: Math.max(existing.maxVelocity, avgVelocity * 1.1),
      followingError: avgFollowError || existing.followingError,
      velocityProfile: velocityProfile.type,
      accelTime: velocityProfile.accelTime,
      decelTime: velocityProfile.decelTime,
      observationCount: axisObservations.length,
      lastUpdated: Date.now()
    };
    // Save periodically
    if (axisObservations.length % 100 === 0) {
      this.saveLearnedBehaviors();
    }
  },
  // ANALYZE VELOCITY PROFILE

  analyzeVelocityProfile(observations) {
    // Analyze motion profile shape
    // Returns: { type: 'trapezoidal'|'s-curve'|'jerk-limited', accelTime, decelTime }

    const profiles = observations.filter(o => o.duration > 0.1); // Filter short moves

    if (profiles.length < 5) {
      return { type: 'trapezoidal', accelTime: 0.1, decelTime: 0.1 };
    }
    // Calculate average acceleration/deceleration times
    let totalAccelTime = 0;
    let totalDecelTime = 0;

    for (const obs of profiles) {
      // Estimate accel time from duration and velocity
      const distance = Math.abs(obs.endPos - obs.startPos);
      const avgVel = distance / obs.duration;

      // Simplified: assume symmetric accel/decel
      const rampTime = (obs.commandedVelocity - avgVel) / obs.acceleration;
      totalAccelTime += Math.abs(rampTime);
      totalDecelTime += Math.abs(rampTime);
    }
    const avgAccelTime = totalAccelTime / profiles.length;
    const avgDecelTime = totalDecelTime / profiles.length;

    // Determine profile type based on jerk behavior
    // S-curve has smoother transitions
    const hasJerkLimiting = avgAccelTime > 0.05;

    return {
      type: hasJerkLimiting ? 's-curve' : 'trapezoidal',
      accelTime: avgAccelTime,
      decelTime: avgDecelTime
    };
  },
  // LEARN FROM PROBING

  learnFromProbing(detail) {
    const { machineId, axis, measuredPos, commandedPos, direction, temperature } = detail;

    if (!this.learnedBehaviors[machineId]) {
      this.learnedBehaviors[machineId] = { axes: {} };
    }
    const existing = this.learnedBehaviors[machineId].axes[axis] || this.getDefaultBehavior(axis);

    // Calculate positioning error
    const error = Math.abs(measuredPos - commandedPos);

    // Learn backlash from direction changes
    if (direction === 'reversal') {
      const backlashSamples = existing.backlashSamples || [];
      backlashSamples.push(error);

      if (backlashSamples.length > 10) {
        backlashSamples.shift();
      }
      existing.backlash = this.average(backlashSamples);
      existing.backlashSamples = backlashSamples;
    }
    // Learn thermal expansion
    if (temperature !== undefined) {
      const tempSamples = existing.tempSamples || [];
      tempSamples.push({ temp: temperature, error: error });

      if (tempSamples.length > 20) {
        const thermalCoeff = this.calculateThermalCoeff(tempSamples);
        existing.thermalCoeff = thermalCoeff;
      }
      existing.tempSamples = tempSamples;
    }
    // Update repeatability
    const repeatSamples = existing.repeatSamples || [];
    repeatSamples.push(error);
    if (repeatSamples.length > 50) repeatSamples.shift();
    existing.repeatability = this.standardDeviation(repeatSamples) * 2; // 2-sigma
    existing.repeatSamples = repeatSamples;

    this.learnedBehaviors[machineId].axes[axis] = existing;
    this.saveLearnedBehaviors();

    console.log('[AXIS_BEHAVIOR_LEARNING] Learned from probing:', axis,
                'backlash:', existing.backlash?.toFixed(4),
                'repeatability:', existing.repeatability?.toFixed(4));
  },
  // GET BEHAVIOR FOR SIMULATION

  getBehavior(machineId, axis) {
    const machineData = this.learnedBehaviors[machineId];
    if (machineData?.axes?.[axis]) {
      return { ...this.getDefaultBehavior(axis), ...machineData.axes[axis] };
    }
    return this.getDefaultBehavior(axis);
  },
  getDefaultBehavior(axis) {
    const isRotary = ['A', 'B', 'C'].includes(axis);
    return { ...this.defaultBehaviors[isRotary ? 'rotary' : 'linear'] };
  },
  // PREDICT MOTION TIME

  predictMotionTime(machineId, axis, distance, maxVelocity) {
    const behavior = this.getBehavior(machineId, axis);

    // Trapezoidal profile: time = distance/velocity + accel_time
    const cruiseVel = Math.min(maxVelocity, behavior.maxVelocity);
    const accelTime = cruiseVel / behavior.maxAcceleration;
    const accelDist = 0.5 * behavior.maxAcceleration * accelTime * accelTime;

    if (distance < 2 * accelDist) {
      // Short move - triangular profile
      return 2 * Math.sqrt(distance / behavior.maxAcceleration);
    }
    // Long move - trapezoidal profile
    const cruiseDist = distance - 2 * accelDist;
    const cruiseTime = cruiseDist / cruiseVel;

    return 2 * accelTime + cruiseTime;
  },
  // PREDICT FOLLOWING ERROR

  predictFollowingError(machineId, axis, velocity) {
    const behavior = this.getBehavior(machineId, axis);

    // Following error increases with velocity
    const ratio = velocity / behavior.maxVelocity;
    return behavior.followingError * ratio;
  },
  // INTEGRATE WITH SIMULATION

  integrateWithSimulation() {
    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      ULTIMATE_3D_MACHINE_SYSTEM.animation.getAxisBehavior = (machineId, axis) => {
        return this.getBehavior(machineId, axis);
      };
      ULTIMATE_3D_MACHINE_SYSTEM.animation.predictMoveTime = (machineId, axis, dist, vel) => {
        return this.predictMotionTime(machineId, axis, dist, vel);
      };
      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with ULTIMATE_3D_MACHINE_SYSTEM');
    }
    // Integrate with PRISM_KINEMATIC_SOLVER
    if (typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      PRISM_KINEMATIC_SOLVER.getAxisBehavior = (machineId, axis) => {
        return this.getBehavior(machineId, axis);
      };
      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with PRISM_KINEMATIC_SOLVER');
    }
    // Integrate with G-code backplot
    if (typeof PRISM_GCODE_BACKPLOT_ENGINE !== 'undefined') {
      PRISM_GCODE_BACKPLOT_ENGINE.axisBehaviors = this;

      console.log('[AXIS_BEHAVIOR_LEARNING] Integrated with PRISM_GCODE_BACKPLOT_ENGINE');
    }
  },
  // UTILITY FUNCTIONS

  average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
  standardDeviation(arr) {
    const avg = this.average(arr);
    const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },
  calculateThermalCoeff(samples) {
    // Linear regression to find thermal coefficient
    if (samples.length < 3) return 0.00001;

    const temps = samples.map(s => s.temp);
    const errors = samples.map(s => s.error);

    const n = samples.length;
    const sumX = temps.reduce((a, b) => a + b, 0);
    const sumY = errors.reduce((a, b) => a + b, 0);
    const sumXY = temps.reduce((acc, t, i) => acc + t * errors[i], 0);
    const sumX2 = temps.reduce((acc, t) => acc + t * t, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return Math.abs(slope);
  },
  // PERSISTENCE

  loadLearnedBehaviors() {
    try {
      const stored = localStorage.getItem('prism_axis_behaviors');
      if (stored) {
        this.learnedBehaviors = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AXIS_BEHAVIOR_LEARNING] Failed to load:', e);
    }
  },
  saveLearnedBehaviors() {
    try {
      // Clean up internal arrays before saving
      const toSave = JSON.parse(JSON.stringify(this.learnedBehaviors));
      for (const machine of Object.values(toSave)) {
        for (const axis of Object.values(machine.axes || {})) {
          delete axis.backlashSamples;
          delete axis.tempSamples;
          delete axis.repeatSamples;
        }
      }
      localStorage.setItem('prism_axis_behaviors', JSON.stringify(toSave));
    } catch (e) {
      console.warn('[AXIS_BEHAVIOR_LEARNING] Failed to save:', e);
    }
  },
  // API

  getAllBehaviors() {
    return this.learnedBehaviors;
  },
  exportBehaviors() {
    return JSON.stringify(this.learnedBehaviors, null, 2);
  },
  importBehaviors(json) {
    try {
      const imported = JSON.parse(json);
      this.learnedBehaviors = { ...this.learnedBehaviors, ...imported };
      this.saveLearnedBehaviors();
      return true;
    } catch (e) {
      return false;
    }
  }
}