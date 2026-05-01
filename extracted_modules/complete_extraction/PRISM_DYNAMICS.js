const PRISM_DYNAMICS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5-AXIS KINEMATICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Forward Kinematics for 5-axis machine
   * @param {Object} joints - {X, Y, Z, A, C} in mm and degrees
   * @param {Object} config - Machine configuration
   * @returns {Object} Tool position and orientation
   */
  fiveAxisFK: function(joints, config = {}) {
    const { X, Y, Z, A, C } = joints;
    const machineType = config.type || 'table-table';
    
    const Arad = A * Math.PI / 180;
    const Crad = C * Math.PI / 180;
    
    // Rotation matrices
    const Rx = this._rotationX(Arad);
    const Rz = this._rotationZ(Crad);
    
    let R, position;
    
    if (machineType === 'table-table') {
      // Tool fixed, table rotates
      R = this._matMul3x3(Rz, Rx);
      position = { x: X, y: Y, z: Z };
    } else if (machineType === 'head-head') {
      // Table fixed, head rotates
      R = this._matMul3x3(Rx, Rz);
      position = { x: X, y: Y, z: Z };
    } else {
      // Mixed configuration
      R = this._matMul3x3(Rz, Rx);
      position = { x: X, y: Y, z: Z };
    }
    
    // Tool axis is the Z column of rotation matrix
    const toolAxis = { x: R[0][2], y: R[1][2], z: R[2][2] };
    
    return {
      position,
      rotation: R,
      toolAxis,
      joints: { X, Y, Z, A, C }
    };
  },
  
  /**
   * Inverse Kinematics for 5-axis machine
   * @param {Object} toolPose - {position: {x,y,z}, axis: {x,y,z}}
   * @param {Object} config - Machine configuration and limits
   * @returns {Object} Joint values or failure
   */
  fiveAxisIK: function(toolPose, config = {}) {
    const { position, axis } = toolPose;
    
    // Normalize tool axis
    const len = Math.sqrt(axis.x**2 + axis.y**2 + axis.z**2);
    const nx = axis.x / len;
    const ny = axis.y / len;
    const nz = axis.z / len;
    
    // Calculate A (tilt from Z axis)
    // A = 0 when tool is vertical (pointing down, nz = -1)
    const A = Math.acos(-nz) * 180 / Math.PI;
    
    // Calculate C (rotation about Z)
    // Handle singularity when A ≈ 0
    let C;
    if (Math.abs(A) < 0.001) {
      // Singularity - use previous C or default
      C = config.previousC || 0;
    } else {
      C = Math.atan2(ny, nx) * 180 / Math.PI;
    }
    
    // Pivot compensation (if machine has offset pivot)
    const pivotOffset = config.pivotOffset || { x: 0, y: 0, z: 0 };
    const Arad = A * Math.PI / 180;
    const Crad = C * Math.PI / 180;
    
    // Calculate actual XYZ considering pivot
    const X = position.x - pivotOffset.x * (1 - Math.cos(Arad) * Math.cos(Crad));
    const Y = position.y - pivotOffset.y * (1 - Math.cos(Arad) * Math.sin(Crad));
    const Z = position.z - pivotOffset.z * (1 - Math.cos(Arad));
    
    const joints = { X, Y, Z, A, C };
    
    // Check limits
    const valid = this._checkLimits(joints, config.limits);
    
    return {
      ...joints,
      valid,
      singularity: Math.abs(A) < 0.001
    };
  },
  
  /**
   * Compute Jacobian matrix for velocity kinematics
   */
  computeJacobian: function(joints, config = {}) {
    const h = 0.001; // Small perturbation
    const J = [];
    const axes = ['X', 'Y', 'Z', 'A', 'C'];
    
    const basePose = this.fiveAxisFK(joints, config);
    
    for (const axis of axes) {
      const perturbedJoints = { ...joints };
      perturbedJoints[axis] += h;
      const perturbedPose = this.fiveAxisFK(perturbedJoints, config);
      
      // Numerical derivative
      const dPos = {
        x: (perturbedPose.position.x - basePose.position.x) / h,
        y: (perturbedPose.position.y - basePose.position.y) / h,
        z: (perturbedPose.position.z - basePose.position.z) / h
      };
      
      J.push([dPos.x, dPos.y, dPos.z]);
    }
    
    return this._transpose(J);
  },
  
  /**
   * Check for kinematic singularity
   */
  checkSingularity: function(joints, config = {}) {
    const J = this.computeJacobian(joints, config);
    const det = this._determinant3x3(J.slice(0, 3).map(row => row.slice(0, 3)));
    
    const threshold = config.singularityThreshold || 0.01;
    
    return {
      singular: Math.abs(det) < threshold,
      determinant: det,
      aAngle: joints.A
    };
  },
  
  _rotationX: function(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c]
    ];
  },
  
  _rotationZ: function(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1]
    ];
  },
  
  _matMul3x3: function(A, B) {
    const C = [[0,0,0], [0,0,0], [0,0,0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  },
  
  _transpose: function(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  },
  
  _determinant3x3: function(A) {
    return A[0][0] * (A[1][1]*A[2][2] - A[1][2]*A[2][1])
         - A[0][1] * (A[1][0]*A[2][2] - A[1][2]*A[2][0])
         + A[0][2] * (A[1][0]*A[2][1] - A[1][1]*A[2][0]);
  },
  
  _checkLimits: function(joints, limits) {
    if (!limits) return true;
    for (const [axis, value] of Object.entries(joints)) {
      if (limits[axis]) {
        const [min, max] = limits[axis];
        if (value < min || value > max) return false;
      }
    }
    return true;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VIBRATION ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate natural frequencies
   * @param {number|Array} mass - Mass or mass matrix
   * @param {number|Array} stiffness - Stiffness or stiffness matrix
   * @returns {Object} Natural frequencies and related parameters
   */
  naturalFrequencies: function(mass, stiffness, damping = 0) {
    // Single DOF
    if (typeof mass === 'number') {
      const omegaN = Math.sqrt(stiffness / mass);
      const zeta = damping / (2 * Math.sqrt(stiffness * mass));
      const omegaD = omegaN * Math.sqrt(1 - zeta * zeta);
      
      return {
        omegaN,                           // rad/s
        frequencyHz: omegaN / (2 * Math.PI),
        period: 2 * Math.PI / omegaN,
        dampingRatio: zeta,
        dampedFrequency: omegaD / (2 * Math.PI),
        qualityFactor: 1 / (2 * zeta)
      };
    }
    
    // Multi-DOF (simplified - diagonal matrices)
    const n = mass.length;
    const frequencies = [];
    
    for (let i = 0; i < n; i++) {
      const omega = Math.sqrt(stiffness[i][i] / mass[i][i]);
      frequencies.push({
        mode: i + 1,
        omegaN: omega,
        frequencyHz: omega / (2 * Math.PI)
      });
    }
    
    return { frequencies: frequencies.sort((a, b) => a.omegaN - b.omegaN) };
  },
  
  /**
   * Calculate Frequency Response Function
   * @param {Object} system - {mass, stiffness, damping}
   * @param {number} omega - Frequency (rad/s)
   * @returns {Object} Complex FRF value
   */
  frequencyResponse: function(system, omega) {
    const { mass, stiffness, damping } = system;
    
    const real = stiffness - mass * omega * omega;
    const imag = damping * omega;
    
    const denominator = real * real + imag * imag;
    
    return {
      real: real / denominator,
      imag: -imag / denominator,
      magnitude: 1 / Math.sqrt(denominator),
      phase: -Math.atan2(imag, real)
    };
  },
  
  /**
   * Generate FRF over frequency range
   */
  generateFRF: function(system, freqRange) {
    const { fMin, fMax, points = 1000 } = freqRange;
    const data = [];
    
    for (let i = 0; i < points; i++) {
      const f = fMin + (fMax - fMin) * i / (points - 1);
      const omega = 2 * Math.PI * f;
      const frf = this.frequencyResponse(system, omega);
      
      data.push({
        frequency: f,
        ...frf
      });
    }
    
    return data;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STABILITY & CHATTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate Stability Lobe Diagram
   * @param {Object} config - {frf, Kc, teeth, rpmRange}
   * @returns {Array} Stability lobe points
   */
  stabilityLobes: function(config) {
    const { frf, Kc, teeth, rpmRange } = config;
    const [rpmMin, rpmMax] = rpmRange;
    const lobes = [];
    
    // For each lobe (0 to ~10)
    for (let lobe = 0; lobe < 10; lobe++) {
      const lobePoints = [];
      
      // Scan chatter frequencies
      for (let fc = 100; fc <= 5000; fc += 10) {
        const omega = 2 * Math.PI * fc;
        
        // Get FRF at this frequency
        let G;
        if (typeof frf === 'function') {
          G = frf(fc);
        } else {
          G = this.frequencyResponse(frf, omega);
        }
        
        // Only process if FRF real part is negative
        if (G.real < 0) {
          // Phase calculation
          const psi = Math.PI - 2 * Math.atan2(G.imag, G.real);
          
          // Spindle speed for this lobe
          const toothPassingFreq = fc / (lobe + psi / (2 * Math.PI));
          const rpm = 60 * toothPassingFreq / teeth;
          
          if (rpm >= rpmMin && rpm <= rpmMax) {
            // Critical depth
            const bLim = -1 / (2 * Kc * teeth * G.real);
            
            if (bLim > 0 && bLim < 50) {  // Reasonable depth limit
              lobePoints.push({ rpm, doc: bLim });
            }
          }
        }
      }
      
      if (lobePoints.length > 0) {
        lobes.push({
          lobe: lobe + 1,
          points: lobePoints.sort((a, b) => a.rpm - b.rpm)
        });
      }
    }
    
    return lobes;
  },
  
  /**
   * Check if cutting parameters are stable
   */
  checkStability: function(params, stabilityData) {
    const { rpm, doc } = params;
    
    // Find stability limit at this RPM
    let minStableDoc = Infinity;
    
    for (const lobe of stabilityData) {
      for (let i = 0; i < lobe.points.length - 1; i++) {
        const p1 = lobe.points[i];
        const p2 = lobe.points[i + 1];
        
        if (rpm >= p1.rpm && rpm <= p2.rpm) {
          // Interpolate
          const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
          const limit = p1.doc + t * (p2.doc - p1.doc);
          minStableDoc = Math.min(minStableDoc, limit);
        }
      }
    }
    
    return {
      stable: doc < minStableDoc,
      limit: minStableDoc,
      margin: minStableDoc - doc
    };
  },
  
  /**
   * Detect chatter from vibration signal using FFT
   */
  detectChatter: function(signal, config) {
    const { sampleRate, teeth, rpm } = config;
    
    // Compute FFT
    const spectrum = this._fft(signal);
    const freqs = spectrum.map((_, i) => i * sampleRate / signal.length);
    
    // Tooth passing frequency and harmonics
    const toothFreq = rpm * teeth / 60;
    const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);
    
    // Find peaks
    const peaks = this._findPeaks(spectrum, freqs);
    
    // Check if dominant peak is at non-harmonic frequency
    let chatterDetected = false;
    let chatterFreq = null;
    let chatterIndex = 0;
    
    for (const peak of peaks) {
      const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < 10);
      if (!isHarmonic && peak.magnitude > peaks[0].magnitude * 0.5) {
        chatterDetected = true;
        chatterFreq = peak.frequency;
        chatterIndex = peak.magnitude / peaks[0].magnitude;
        break;
      }
    }
    
    return {
      chatterDetected,
      chatterFrequency: chatterFreq,
      chatterIndex,
      spectrum: spectrum.slice(0, signal.length / 2),
      frequencies: freqs.slice(0, signal.length / 2)
    };
  },
  
  _fft: function(signal) {
    // Simple DFT (use FFT library in production)
    const N = signal.length;
    const spectrum = [];
    
    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      spectrum.push(Math.sqrt(real * real + imag * imag) / N);
    }
    
    return spectrum;
  },
  
  _findPeaks: function(spectrum, freqs) {
    const peaks = [];
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {
        if (spectrum[i] > 0.01) {  // Threshold
          peaks.push({
            frequency: freqs[i],
            magnitude: spectrum[i],
            index: i
          });
        }
      }
    }
    
    return peaks.sort((a, b) => b.magnitude - a.magnitude);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // THERMAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate cutting temperature
   */
  cuttingTemperature: function(params) {
    const {
      cuttingForce,      // N
      cuttingVelocity,   // m/min
      mrr,               // mm³/min
      material,
      heatPartition = 0.2,  // Fraction to tool
      ambientTemp = 20
    } = params;
    
    const V_ms = cuttingVelocity / 60;  // m/s
    const power = cuttingForce * V_ms;   // W
    
    // Heat to chip
    const density = material?.density || 7850;  // kg/m³
    const specificHeat = material?.specificHeat || 500;  // J/(kg·K)
    
    const mrr_m3s = mrr * 1e-9 / 60;  // m³/s
    const massFlowRate = density * mrr_m3s;  // kg/s
    
    // Temperature rise in chip
    const chipHeat = (1 - heatPartition) * power;
    const deltaT_chip = chipHeat / (massFlowRate * specificHeat);
    
    // Tool-chip interface (simplified)
    const interfaceTemp = ambientTemp + deltaT_chip * 0.8;
    
    return {
      chipTemperature: ambientTemp + deltaT_chip,
      interfaceTemperature: interfaceTemp,
      toolHeat: heatPartition * power,
      chipHeat: chipHeat,
      totalPower: power
    };
  },
  
  /**
   * Calculate heat partition ratio
   */
  heatPartition: function(params) {
    const { cuttingSpeed, toolConductivity, workpieceConductivity } = params;
    
    // Simplified model based on thermal conductivity ratio
    const k_ratio = toolConductivity / workpieceConductivity;
    const speed_factor = Math.min(1, cuttingSpeed / 200);  // Normalized speed
    
    // Higher speed = more heat to chip
    // Higher tool conductivity relative to workpiece = less heat to tool
    const R_tool = 0.3 * (1 - speed_factor) / (1 + k_ratio);
    
    return {
      toTool: R_tool,
      toWorkpiece: 0.1 + 0.1 * (1 - speed_factor),
      toChip: 1 - R_tool - 0.1 - 0.1 * (1 - speed_factor)
    };
  },
  
  /**
   * Transient temperature calculation (lumped capacitance)
   */
  transientTemperature: function(params) {
    const {
      initialTemp,
      ambientTemp,
      heatTransferCoeff,  // W/(m²·K)
      surfaceArea,        // m²
      mass,               // kg
      specificHeat,       // J/(kg·K)
      time                // s
    } = params;
    
    // Time constant
    const tau = mass * specificHeat / (heatTransferCoeff * surfaceArea);
    
    // Temperature at time t
    const T = ambientTemp + (initialTemp - ambientTemp) * Math.exp(-time / tau);
    
    return {
      temperature: T,
      timeConstant: tau,
      coolingRate: (initialTemp - ambientTemp) / tau * Math.exp(-time / tau)
    };
  },
  
  /**
   * Calculate convection heat transfer coefficient
   */
  convectionCoefficient: function(params) {
    const {
      fluidVelocity,      // m/s
      fluidDensity,       // kg/m³
      fluidViscosity,     // Pa·s
      fluidConductivity,  // W/(m·K)
      fluidSpecificHeat,  // J/(kg·K)
      characteristicLength // m
    } = params;
    
    // Reynolds number
    const Re = fluidDensity * fluidVelocity * characteristicLength / fluidViscosity;
    
    // Prandtl number
    const Pr = fluidViscosity * fluidSpecificHeat / fluidConductivity;
    
    // Nusselt number (Dittus-Boelter for turbulent flow)
    let Nu;
    if (Re > 10000) {
      Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, 0.4);
    } else {
      Nu = 0.664 * Math.sqrt(Re) * Math.pow(Pr, 1/3);
    }
    
    // Heat transfer coefficient
    const h = Nu * fluidConductivity / characteristicLength;
    
    return {
      reynoldsNumber: Re,
      prandtlNumber: Pr,
      nusseltNumber: Nu,
      heatTransferCoeff: h,
      flowRegime: Re > 10000 ? 'turbulent' : Re > 2300 ? 'transition' : 'laminar'
    };
  }
}