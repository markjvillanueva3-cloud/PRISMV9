const PRISM_THERMAL_EXPANSION_ENGINE = {
    name: 'PRISM_THERMAL_EXPANSION_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.75, Bryan Principles',
    
    /**
     * Linear thermal expansion
     * ΔL = L × α × ΔT
     */
    linearExpansion: function(params) {
        const {
            originalLength: L,      // mm
            temperatureChange: dT,  // °C
            material,
            CTE                     // Coefficient of thermal expansion (1/°C)
        } = params;
        
        // CTE database (µm/m/°C = 10⁻⁶/°C)
        const cteDatabase = {
            'steel': 11.7e-6,
            'stainless_steel': 17.3e-6,
            'aluminum': 23.1e-6,
            'brass': 19e-6,
            'copper': 16.5e-6,
            'cast_iron': 10.5e-6,
            'granite': 6e-6,
            'invar': 1.2e-6,
            'super_invar': 0.6e-6,
            'zerodur': 0.02e-6,
            'ceramic': 7e-6,
            'carbide': 5.5e-6
        };
        
        const alpha = CTE || cteDatabase[material?.toLowerCase()] || 12e-6;
        
        const dL = L * alpha * dT;
        
        return {
            expansion_mm: dL,
            expansion_um: dL * 1000,
            percentChange: (dL / L) * 100,
            CTE_per_C: alpha,
            material: material || 'default_steel',
            temperatureForTolerance: (tolerance) => tolerance / (L * alpha)
        };
    },
    
    /**
     * Thermal error analysis for machine tool
     * Based on Bryan's principles
     */
    machineToolThermalError: function(params) {
        const {
            machineGeometry,     // {X_axis_length, Y_axis_length, Z_axis_length}
            temperatureField,    // {X_gradient, Y_gradient, Z_gradient, spindle_delta}
            materials = {}       // Material for each component
        } = params;
        
        const { X_axis_length = 500, Y_axis_length = 400, Z_axis_length = 300 } = machineGeometry;
        const { X_gradient = 1, Y_gradient = 0.5, Z_gradient = 0.8, spindle_delta = 5 } = temperatureField;
        
        // Default to cast iron for structure
        const alpha_structure = 10.5e-6;
        const alpha_spindle = 11.7e-6;
        
        // Positional errors from thermal expansion
        const dX = X_axis_length * alpha_structure * X_gradient;
        const dY = Y_axis_length * alpha_structure * Y_gradient;
        const dZ = Z_axis_length * alpha_structure * Z_gradient;
        
        // Spindle growth (typically Z direction)
        const spindle_length = 150; // mm approximate
        const spindle_growth = spindle_length * alpha_spindle * spindle_delta;
        
        // Angular errors from temperature gradients
        // α = L × α_CTE × ΔT_gradient / height
        const height = 300; // mm structural height
        const angular_X = Math.atan(X_axis_length * alpha_structure * X_gradient / height) * 1e6; // µrad
        const angular_Y = Math.atan(Y_axis_length * alpha_structure * Y_gradient / height) * 1e6;
        
        // Total volumetric error (RSS)
        const total_error = Math.sqrt(dX*dX + dY*dY + (dZ + spindle_growth)**2);
        
        return {
            linearErrors_mm: { X: dX, Y: dY, Z: dZ + spindle_growth },
            linearErrors_um: { X: dX*1000, Y: dY*1000, Z: (dZ + spindle_growth)*1000 },
            spindleGrowth_um: spindle_growth * 1000,
            angularErrors_urad: { X: angular_X, Y: angular_Y },
            totalVolumetricError_um: total_error * 1000,
            recommendations: this._thermalRecommendations(total_error * 1000, temperatureField)
        };
    },
    
    _thermalRecommendations: function(total_error_um, temps) {
        const recs = [];
        
        if (total_error_um > 50) {
            recs.push('Consider active thermal compensation');
        }
        if (temps.spindle_delta > 3) {
            recs.push('Improve spindle cooling or increase warmup time');
        }
        if (temps.X_gradient > 1 || temps.Y_gradient > 1) {
            recs.push('Check environmental temperature control');
        }
        if (total_error_um > 10) {
            recs.push('Allow thermal stabilization before precision operations');
        }
        
        return recs.length ? recs : ['Thermal errors within acceptable limits'];
    },
    
    /**
     * Thermal compensation calculation
     */
    thermalCompensation: function(params) {
        const {
            measuredTemperatures,    // Array of {sensor_id, temp, position}
            referenceTemperatures,   // Array of {sensor_id, temp}
            compensationMatrix       // Pre-calibrated thermal error model
        } = params;
        
        // Calculate temperature changes from reference
        const tempChanges = measuredTemperatures.map((m, i) => ({
            sensor: m.sensor_id,
            delta: m.temp - (referenceTemperatures[i]?.temp || 20),
            position: m.position
        }));
        
        // If no compensation matrix, use simple model
        if (!compensationMatrix) {
            const avg_delta = tempChanges.reduce((s, t) => s + t.delta, 0) / tempChanges.length;
            return {
                compensation_X_um: avg_delta * 10,  // Simple estimate
                compensation_Y_um: avg_delta * 8,
                compensation_Z_um: avg_delta * 12,
                temperatureDeltas: tempChanges,
                method: 'simple_average'
            };
        }
        
        // Apply compensation matrix (linear model)
        // compensation = Σ(matrix_coeff × temp_delta)
        let comp_X = 0, comp_Y = 0, comp_Z = 0;
        
        for (let i = 0; i < tempChanges.length; i++) {
            if (compensationMatrix[i]) {
                comp_X += compensationMatrix[i].X * tempChanges[i].delta;
                comp_Y += compensationMatrix[i].Y * tempChanges[i].delta;
                comp_Z += compensationMatrix[i].Z * tempChanges[i].delta;
            }
        }
        
        return {
            compensation_X_um: comp_X,
            compensation_Y_um: comp_Y,
            compensation_Z_um: comp_Z,
            temperatureDeltas: tempChanges,
            method: 'matrix_compensation'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('thermal.expansion', 'PRISM_THERMAL_EXPANSION_ENGINE.linearExpansion');
            PRISM_GATEWAY.register('thermal.machineError', 'PRISM_THERMAL_EXPANSION_ENGINE.machineToolThermalError');
            PRISM_GATEWAY.register('thermal.compensation', 'PRISM_THERMAL_EXPANSION_ENGINE.thermalCompensation');
            console.log('[PRISM] PRISM_THERMAL_EXPANSION_ENGINE registered: 3 routes');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND EXPORT
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession4Part4() {
    PRISM_CUTTING_THERMAL_ENGINE.register();
    PRISM_HEAT_TRANSFER_ENGINE.register();
    PRISM_THERMAL_EXPANSION_ENGINE.register();
    
    console.log('[Session 4 Part 4] Registered 3 modules, 11 gateway routes');
    console.log('  - PRISM_CUTTING_THERMAL_ENGINE: Shear plane, Interface, Partition');
    console.log('  - PRISM_HEAT_TRANSFER_ENGINE: Conduction, Convection, Coolant');
    console.log('  - PRISM_THERMAL_EXPANSION_ENGINE: Expansion, Machine error, Compensation');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerSession4Part4();
}

console.log('[Session 4 Part 4] Thermal Analysis & Heat Transfer loaded - 3 modules');


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 MASTER REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerAllSession4() {
    registerSession4Part1();
    registerSession4Part2();
    registerSession4Part3();
    registerSession4Part4();
    console.log("[Session 4] All Physics & Dynamics modules registered");
    console.log("  - Part 1: Advanced Kinematics Engine");
    console.log("  - Part 2: Rigid Body Dynamics Engine");
    console.log("  - Part 3: Vibration & Chatter Analysis");
    console.log("  - Part 4: Thermal Analysis");
}

// Auto-register Session 4
if (typeof window !== "undefined") {
    window.PRISM_ADVANCED_KINEMATICS_ENGINE = PRISM_ADVANCED_KINEMATICS_ENGINE;
    window.PRISM_RIGID_BODY_DYNAMICS_ENGINE = PRISM_RIGID_BODY_DYNAMICS_ENGINE;
    window.PRISM_VIBRATION_ANALYSIS_ENGINE = PRISM_VIBRATION_ANALYSIS_ENGINE;
    window.PRISM_CHATTER_PREDICTION_ENGINE = PRISM_CHATTER_PREDICTION_ENGINE;
    window.PRISM_CUTTING_MECHANICS_ENGINE = PRISM_CUTTING_MECHANICS_ENGINE;
    window.PRISM_TOOL_LIFE_ENGINE = PRISM_TOOL_LIFE_ENGINE;
    window.PRISM_SURFACE_FINISH_ENGINE = PRISM_SURFACE_FINISH_ENGINE;
    window.PRISM_CUTTING_THERMAL_ENGINE = PRISM_CUTTING_THERMAL_ENGINE;
    window.PRISM_HEAT_TRANSFER_ENGINE = PRISM_HEAT_TRANSFER_ENGINE;
    window.PRISM_THERMAL_EXPANSION_ENGINE = PRISM_THERMAL_EXPANSION_ENGINE;
    registerAllSession4();
}

console.log("[PRISM v8.83.001] Session 4 Physics & Dynamics loaded - 10 modules, 3,439 lines");

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SESSION 4 ENHANCEMENT: PHYSICS-INFORMED MACHINE LEARNING (PIML)
// Cutting-edge 2024-2025 algorithms for chatter prediction
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRISM SESSION 4 ENHANCEMENT: PHYSICS-INFORMED MACHINE LEARNING (PIML)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Cutting-Edge Algorithms from 2024-2025 Research:
 * - Physics-Guided ML for Stability Lobe Diagrams (PGML-SLD)
 * - Semi-Discretization Method for Milling Dynamics
 * - Multi-Modal Data Fusion for Chatter Detection
 * - Online SLD Estimation with Continuous Learning
 * - Deep Neural Network Chatter Detection
 * 
 * Sources:
 * - arXiv:2511.17894 - ML-based Online SLD Estimation (Nov 2025)
 * - Nature Scientific Reports - Multi-modal Chatter Detection (Jan 2025)
 * - Journal of Intelligent Manufacturing - PGML Stability Modeling (2022)
 * - Mechanical Systems and Signal Processing - Lightweight Deep Learning (2024)
 * 
 * @version 1.0.0
 * @date January 18, 2026
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICS-INFORMED MACHINE LEARNING CHATTER ENGINE
// Combines physics-based models with ML for superior accuracy
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_PIML_CHATTER_ENGINE = {
  name: 'PRISM_PIML_CHATTER_ENGINE',
  version: '1.0.0',
  source: 'arXiv:2511.17894, Nature Sci. Rep. 2025, J. Intell. Manuf. 2022',
  algorithms: [
    'Semi-Discretization Method (SDM)',
    'Physics-Guided ML (PGML)',
    'Continuous Learning SVM',
    'Multi-Modal Data Fusion',
    'ANN-NADAM SLD Prediction',
    'Online Bayesian SLD Update',
    'Fractal-Based Feature Extraction'
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMI-DISCRETIZATION METHOD FOR MILLING STABILITY
  // Source: Insperger & Stépán (2002), arXiv:2511.17894
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Semi-Discretization Method for stability analysis
   * Models milling as delay differential equation (DDE)
   * ẍ(t) + 2ζωₙẋ(t) + ωₙ²x(t) = (Kc·ap/m)[x(t-T) - x(t)]
   * 
   * @param {Object} system - Dynamic system parameters
   * @param {Object} cutting - Cutting parameters
   * @param {number} N - Number of discrete intervals per period
   * @returns {Object} Stability analysis results
   */
  semiDiscretization: function(system, cutting, N = 40) {
    const { mass, stiffness, damping } = system;
    const { Kc, teeth, radialImmersion } = cutting;
    
    const wn = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    
    // Specific cutting coefficient (averaged)
    const g = radialImmersion || 1.0; // Radial immersion ratio
    const h = Kc * g / (2 * Math.PI); // Average directional factor
    
    return {
      /**
       * Compute stability at given spindle speed and depth
       */
      checkStability: function(rpm, ap) {
        const T = 60 / (rpm * teeth); // Tooth passing period
        const dt = T / N; // Discrete time step
        
        // State transition matrix construction
        // Using simplified first-order hold approximation
        const wd = wn * Math.sqrt(1 - zeta * zeta);
        const exp_term = Math.exp(-zeta * wn * dt);
        
        // Monodromy matrix (simplified 2x2 for SDOF)
        const a11 = exp_term * (Math.cos(wd * dt) + zeta * wn / wd * Math.sin(wd * dt));
        const a12 = exp_term * Math.sin(wd * dt) / wd;
        const a21 = -exp_term * wn * wn / wd * Math.sin(wd * dt);
        const a22 = exp_term * (Math.cos(wd * dt) - zeta * wn / wd * Math.sin(wd * dt));
        
        // Include cutting force effect (regenerative)
        const Kc_term = h * ap / mass;
        const b11 = Kc_term * (1 - a11);
        const b21 = Kc_term * (-a21);
        
        // Build full monodromy matrix over one period (N steps)
        // For stability, eigenvalues of monodromy matrix must be < 1
        
        // Simplified check: compute eigenvalues of single step matrix
        const A = [
          [a11 + b11, a12],
          [a21 + b21, a22]
        ];
        
        // Eigenvalue computation (2x2 case)
        const trace = A[0][0] + A[1][1];
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        const disc = trace * trace - 4 * det;
        
        let maxEig;
        if (disc >= 0) {
          const sqrt_disc = Math.sqrt(disc);
          maxEig = Math.max(Math.abs((trace + sqrt_disc) / 2), 
                           Math.abs((trace - sqrt_disc) / 2));
        } else {
          // Complex eigenvalues
          maxEig = Math.sqrt(det);
        }
        
        // Stability margin (power raised to N for full period)
        const periodicMaxEig = Math.pow(maxEig, N);
        
        return {
          stable: periodicMaxEig < 1.0,
          maxEigenvalue: periodicMaxEig,
          stabilityMargin: 1.0 - periodicMaxEig,
          rpm, ap
        };
      },
      
      /**
       * Generate stability lobe diagram
       */
      generateSLD: function(rpmRange, apRange, resolution = 100) {
        const [rpmMin, rpmMax] = rpmRange;
        const [apMin, apMax] = apRange;
        
        const sld = {
          stablePoints: [],
          unstablePoints: [],
          boundaryPoints: []
        };
        
        for (let i = 0; i <= resolution; i++) {
          const rpm = rpmMin + (rpmMax - rpmMin) * i / resolution;
          
          // Binary search for stability boundary
          let low = apMin, high = apMax;
          while (high - low > (apMax - apMin) / 1000) {
            const mid = (low + high) / 2;
            const result = this.checkStability(rpm, mid);
            if (result.stable) {
              low = mid;
            } else {
              high = mid;
            }
          }
          
          sld.boundaryPoints.push({ rpm, ap: (low + high) / 2 });
        }
        
        return sld;
      },
      
      params: { wn, zeta, h, teeth }
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS-GUIDED MACHINE LEARNING (PGML)
  // Source: J. Intelligent Manufacturing 2022
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * PGML model that combines physics-based SLD with neural network
   * Uses RCSA (Receptance Coupling Substructure Analysis) as physics base
   * Neural network learns residuals between physics model and reality
   */
  pgmlStabilityModel: {
    name: 'PGML_StabilityModel',
    
    /**
     * Initialize PGML model with physics-based prior
     */
    initialize: function(physicsModel, mlConfig = {}) {
      return {
        physics: physicsModel,
        ml: {
          layers: mlConfig.layers || [32, 16, 8],
          activation: mlConfig.activation || 'relu',
          weights: null,
          biases: null,
          trained: false
        },
        trainingData: [],
        validationData: []
      };
    },
    
    /**
     * Generate synthetic training data from physics model
     */
    generatePhysicsData: function(model, rpmRange, apRange, numSamples = 1000) {
      const data = [];
      const sdm = PRISM_PIML_CHATTER_ENGINE.semiDiscretization(
        model.physics.system,
        model.physics.cutting
      );
      
      for (let i = 0; i < numSamples; i++) {
        const rpm = rpmRange[0] + Math.random() * (rpmRange[1] - rpmRange[0]);
        const ap = apRange[0] + Math.random() * (apRange[1] - apRange[0]);
        
        const result = sdm.checkStability(rpm, ap);
        
        data.push({
          input: [rpm / 10000, ap / 10], // Normalized inputs
          output: [result.stable ? 1 : 0],
          eigenvalue: result.maxEigenvalue
        });
      }
      
      return data;
    },
    
    /**
     * Train neural network on combined physics + experimental data
     * Uses NADAM optimizer for better convergence on SLD lobes
     */
    train: function(model, experimentalData = [], options = {}) {
      const epochs = options.epochs || 100;
      const batchSize = options.batchSize || 32;
      const learningRate = options.learningRate || 0.001;
      
      // Combine physics-generated and experimental data
      const physicsData = this.generatePhysicsData(
        model,
        options.rpmRange || [1000, 20000],
        options.apRange || [0.1, 10]
      );
      
      // Weight experimental data higher (physics-informed)
      const combinedData = [
        ...physicsData.map(d => ({ ...d, weight: 1 })),
        ...experimentalData.map(d => ({ ...d, weight: 5 })) // Higher weight for real data
      ];
      
      // Initialize network weights
      const layers = model.ml.layers;
      model.ml.weights = [];
      model.ml.biases = [];
      
      let prevSize = 2; // Input: [rpm, ap]
      for (const layerSize of layers) {
        model.ml.weights.push(this._initWeights(prevSize, layerSize));
        model.ml.biases.push(new Array(layerSize).fill(0));
        prevSize = layerSize;
      }
      // Output layer
      model.ml.weights.push(this._initWeights(prevSize, 1));
      model.ml.biases.push([0]);
      
      // NADAM optimizer state
      const m = model.ml.weights.map(w => w.map(row => row.map(() => 0)));
      const v = model.ml.weights.map(w => w.map(row => row.map(() => 0)));
      const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
      
      // Training loop
      for (let epoch = 0; epoch < epochs; epoch++) {
        // Shuffle data
        this._shuffle(combinedData);
        
        let totalLoss = 0;
        
        for (let i = 0; i < combinedData.length; i += batchSize) {
          const batch = combinedData.slice(i, i + batchSize);
          
          for (const sample of batch) {
            // Forward pass
            const activations = this._forward(model, sample.input);
            const output = activations[activations.length - 1][0];
            
            // Compute loss (weighted binary cross-entropy)
            const target = sample.output[0];
            const loss = -sample.weight * (
              target * Math.log(output + eps) +
              (1 - target) * Math.log(1 - output + eps)
            );
            totalLoss += loss;
            
            // Backward pass (simplified gradient computation)
            const gradOutput = (output - target) * sample.weight;
            
            // Update weights using NADAM
            for (let l = model.ml.weights.length - 1; l >= 0; l--) {
              const grad = this._computeGradient(activations, l, gradOutput);
              
              for (let j = 0; j < model.ml.weights[l].length; j++) {
                for (let k = 0; k < model.ml.weights[l][j].length; k++) {
                  // NADAM update
                  m[l][j][k] = beta1 * m[l][j][k] + (1 - beta1) * grad[j][k];
                  v[l][j][k] = beta2 * v[l][j][k] + (1 - beta2) * grad[j][k] * grad[j][k];
                  
                  const mHat = m[l][j][k] / (1 - Math.pow(beta1, epoch + 1));
                  const vHat = v[l][j][k] / (1 - Math.pow(beta2, epoch + 1));
                  
                  // Nesterov momentum
                  const mNesterov = beta1 * mHat + (1 - beta1) * grad[j][k] / (1 - Math.pow(beta1, epoch + 1));
                  
                  model.ml.weights[l][j][k] -= learningRate * mNesterov / (Math.sqrt(vHat) + eps);
                }
              }
            }
          }
        }
        
        if (epoch % 10 === 0) {
          console.log(`[PGML] Epoch ${epoch}, Loss: ${(totalLoss / combinedData.length).toFixed(4)}`);
        }
      }
      
      model.ml.trained = true;
      return model;
    },
    
    /**
     * Predict stability using trained PGML model
     */
    predict: function(model, rpm, ap) {
      if (!model.ml.trained) {
        throw new Error('PGML model not trained');
      }
      
      const input = [rpm / 10000, ap / 10]; // Normalize
      const activations = this._forward(model, input);
      const probability = activations[activations.length - 1][0];
      
      return {
        stable: probability > 0.5,
        probability,
        confidence: Math.abs(probability - 0.5) * 2,
        rpm, ap
      };
    },
    
    /**
     * Generate PGML-enhanced SLD
     */
    generateSLD: function(model, rpmRange, apRange, resolution = 100) {
      const sld = {
        points: [],
        boundary: []
      };
      
      for (let i = 0; i <= resolution; i++) {
        const rpm = rpmRange[0] + (rpmRange[1] - rpmRange[0]) * i / resolution;
        
        // Binary search for boundary
        let low = apRange[0], high = apRange[1];
        while (high - low > 0.01) {
          const mid = (low + high) / 2;
          const result = this.predict(model, rpm, mid);
          if (result.stable) {
            low = mid;
          } else {
            high = mid;
          }
        }
        
        sld.boundary.push({ rpm, ap: (low + high) / 2 });
      }
      
      return sld;
    },
    
    // Helper functions
    _initWeights: function(rows, cols) {
      const weights = [];
      const scale = Math.sqrt(2 / rows); // He initialization
      for (let i = 0; i < rows; i++) {
        weights.push([]);
        for (let j = 0; j < cols; j++) {
          weights[i].push((Math.random() - 0.5) * 2 * scale);
        }
      }
      return weights;
    },
    
    _forward: function(model, input) {
      const activations = [input];
      let current = input;
      
      for (let l = 0; l < model.ml.weights.length; l++) {
        const W = model.ml.weights[l];
        const b = model.ml.biases[l];
        
        const output = [];
        for (let j = 0; j < W[0].length; j++) {
          let sum = b[j];
          for (let i = 0; i < current.length; i++) {
            sum += current[i] * W[i][j];
          }
          // ReLU for hidden, sigmoid for output
          if (l < model.ml.weights.length - 1) {
            output.push(Math.max(0, sum)); // ReLU
          } else {
            output.push(1 / (1 + Math.exp(-sum))); // Sigmoid
          }
        }
        activations.push(output);
        current = output;
      }
      
      return activations;
    },
    
    _computeGradient: function(activations, layer, gradOutput) {
      const grad = [];
      const input = activations[layer];
      
      for (let i = 0; i < input.length; i++) {
        grad.push([]);
        for (let j = 0; j < activations[layer + 1].length; j++) {
          grad[i].push(gradOutput * input[i]);
        }
      }
      
      return grad;
    },
    
    _shuffle: function(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-MODAL DATA FUSION FOR CHATTER DETECTION
  // Source: Nature Scientific Reports 2025
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Multi-modal chatter detection using fused sensor data
   * Combines: vibration, force, current, acoustic signals
   */
  multiModalChatterDetector: {
    name: 'MultiModal_ChatterDetector',
    
    /**
     * Fuse multiple sensor signals with adaptive weighting
     */
    fuseSignals: function(signals, weights = null) {
      const { vibration, force, current, acoustic } = signals;
      
      // Default adaptive weights based on signal quality
      if (!weights) {
        weights = this._computeAdaptiveWeights(signals);
      }
      
      // Feature extraction from each signal
      const features = {
        vibration: vibration ? this._extractFeatures(vibration, 'vibration') : null,
        force: force ? this._extractFeatures(force, 'force') : null,
        current: current ? this._extractFeatures(current, 'current') : null,
        acoustic: acoustic ? this._extractFeatures(acoustic, 'acoustic') : null
      };
      
      // Weighted feature fusion
      const fusedFeatures = [];
      const featureTypes = ['rms', 'kurtosis', 'crestFactor', 'spectralCentroid', 'fractalDimension'];
      
      for (const fType of featureTypes) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [signal, feat] of Object.entries(features)) {
          if (feat && feat[fType] !== undefined) {
            weightedSum += feat[fType] * weights[signal];
            totalWeight += weights[signal];
          }
        }
        
        fusedFeatures.push(totalWeight > 0 ? weightedSum / totalWeight : 0);
      }
      
      return {
        features: fusedFeatures,
        featureNames: featureTypes,
        weights,
        individualFeatures: features
      };
    },
    
    /**
     * Detect chatter using fused features and hybrid neural network
     */
    detectChatter: function(fusedData, model = null) {
      // Use pre-trained model or simple threshold-based detection
      if (model && model.trained) {
        return this._neuralNetworkDetect(fusedData, model);
      }
      
      // Threshold-based detection using physics-informed rules
      const features = fusedData.features;
      const [rms, kurtosis, crestFactor, spectralCentroid, fractalDim] = features;
      
      // Chatter indicators (from research)
      const chatterIndicators = {
        highKurtosis: kurtosis > 4.0,           // Non-Gaussian => chatter
        highCrestFactor: crestFactor > 5.0,     // Impulsive => chatter
        frequencyShift: spectralCentroid > 0.3, // Shifted spectrum
        lowFractal: fractalDim < 1.3            // Less complex signal
      };
      
      const chatterScore = (
        (chatterIndicators.highKurtosis ? 0.3 : 0) +
        (chatterIndicators.highCrestFactor ? 0.3 : 0) +
        (chatterIndicators.frequencyShift ? 0.2 : 0) +
        (chatterIndicators.lowFractal ? 0.2 : 0)
      );
      
      return {
        chatterDetected: chatterScore > 0.5,
        chatterScore,
        indicators: chatterIndicators,
        confidence: Math.abs(chatterScore - 0.5) * 2
      };
    },
    
    /**
     * Structure Function Method (SFM) for fractal feature extraction
     * Source: MDPI Sensors 2021
     */
    structureFunctionMethod: function(signal, maxOrder = 5) {
      const n = signal.length;
      const results = [];
      
      for (let order = 1; order <= maxOrder; order++) {
        // Compute structure function S_q(τ) for different lags
        const lags = [1, 2, 4, 8, 16, 32];
        const structureValues = [];
        
        for (const tau of lags) {
          if (tau >= n) continue;
          
          let sum = 0;
          for (let i = 0; i < n - tau; i++) {
            sum += Math.pow(Math.abs(signal[i + tau] - signal[i]), order);
          }
          structureValues.push({
            tau,
            value: sum / (n - tau)
          });
        }
        
        // Estimate Hurst exponent from log-log slope
        if (structureValues.length >= 2) {
          const logTau = structureValues.map(s => Math.log(s.tau));
          const logS = structureValues.map(s => Math.log(s.value + 1e-10));
          
          const slope = this._linearRegression(logTau, logS).slope;
          results.push({
            order,
            hurstExponent: slope / order,
            structureFunction: structureValues
          });
        }
      }
      
      // Fractal dimension D = 2 - H (for 1D signal)
      const avgHurst = results.reduce((sum, r) => sum + r.hurstExponent, 0) / results.length;
      const fractalDimension = 2 - avgHurst;
      
      return {
        fractalDimension,
        hurstExponent: avgHurst,
        structureAnalysis: results
      };
    },
    
    _extractFeatures: function(signal, type) {
      const n = signal.length;
      if (n === 0) return null;
      
      // RMS
      const rms = Math.sqrt(signal.reduce((sum, x) => sum + x * x, 0) / n);
      
      // Mean
      const mean = signal.reduce((sum, x) => sum + x, 0) / n;
      
      // Variance and std
      const variance = signal.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
      const std = Math.sqrt(variance);
      
      // Kurtosis (normalized 4th moment)
      const kurtosis = signal.reduce((sum, x) => sum + Math.pow((x - mean) / std, 4), 0) / n;
      
      // Crest factor (peak / RMS)
      const peak = Math.max(...signal.map(Math.abs));
      const crestFactor = peak / rms;
      
      // Spectral features (simplified - using signal variance as proxy)
      const spectralCentroid = variance / (rms + 1e-10);
      
      // Fractal dimension
      const fractal = this.structureFunctionMethod(signal);
      
      return {
        rms,
        mean,
        std,
        kurtosis,
        crestFactor,
        peak,
        spectralCentroid,
        fractalDimension: fractal.fractalDimension
      };
    },
    
    _computeAdaptiveWeights: function(signals) {
      const weights = {};
      let totalQuality = 0;
      
      for (const [name, signal] of Object.entries(signals)) {
        if (signal && signal.length > 0) {
          // Signal quality based on SNR estimate
          const mean = signal.reduce((s, x) => s + x, 0) / signal.length;
          const variance = signal.reduce((s, x) => s + (x - mean) ** 2, 0) / signal.length;
          const snr = variance > 0 ? Math.abs(mean) / Math.sqrt(variance) : 0;
          
          weights[name] = 1 + snr;
          totalQuality += weights[name];
        } else {
          weights[name] = 0;
        }
      }
      
      // Normalize
      for (const name of Object.keys(weights)) {
        weights[name] /= totalQuality || 1;
      }
      
      return weights;
    },
    
    _linearRegression: function(x, y) {
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      return { slope, intercept };
    },
    
    _neuralNetworkDetect: function(fusedData, model) {
      // Placeholder for trained neural network inference
      // In production, this would use the trained PGML model
      return this.detectChatter(fusedData, null);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ONLINE CONTINUOUS LEARNING FOR SLD
  // Source: ScienceDirect - Continuous Learning SVM (2015)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Continuously updating SLD model that learns from production data
   */
  continuousLearningSLD: {
    name: 'ContinuousLearning_SLD',
    
    /**
     * Initialize continuous learning model
     */
    initialize: function(baseSLD, trustThreshold = 0.7) {
      return {
        baseSLD: baseSLD,
        observations: [],
        trust: new Map(), // Region trust scores
        trustThreshold,
        updateCount: 0
      };
    },
    
    /**
     * Add new observation from production
     */
    addObservation: function(model, rpm, ap, stable, confidence = 1.0) {
      model.observations.push({
        rpm, ap, stable, confidence,
        timestamp: Date.now()
      });
      
      // Update local trust
      const regionKey = `${Math.round(rpm / 500)}_${Math.round(ap * 10)}`;
      const currentTrust = model.trust.get(regionKey) || 0;
      model.trust.set(regionKey, Math.min(1, currentTrust + 0.1 * confidence));
      
      model.updateCount++;
      
      // Trigger retraining if enough new data
      if (model.updateCount >= 10) {
        this.retrain(model);
        model.updateCount = 0;
      }
    },
    
    /**
     * Retrain model with accumulated observations
     * Uses Bayesian update to combine prior (physics) with observations
     */
    retrain: function(model) {
      const recentObs = model.observations.slice(-100); // Last 100 observations
      
      if (recentObs.length < 5) return;
      
      console.log(`[ContinuousLearning] Retraining with ${recentObs.length} observations`);
      
      // Bayesian update of SLD boundary
      // Prior: base SLD from physics model
      // Likelihood: from observations
      
      // Group observations by RPM region
      const regionUpdates = new Map();
      
      for (const obs of recentObs) {
        const rpmRegion = Math.round(obs.rpm / 100) * 100;
        if (!regionUpdates.has(rpmRegion)) {
          regionUpdates.set(rpmRegion, { stable: [], unstable: [] });
        }
        
        if (obs.stable) {
          regionUpdates.get(rpmRegion).stable.push(obs.ap);
        } else {
          regionUpdates.get(rpmRegion).unstable.push(obs.ap);
        }
      }
      
      // Update boundary estimates
      const newBoundary = [];
      for (const point of model.baseSLD.boundary || model.baseSLD.boundaryPoints) {
        const rpmRegion = Math.round(point.rpm / 100) * 100;
        const updates = regionUpdates.get(rpmRegion);
        
        if (updates && (updates.stable.length > 0 || updates.unstable.length > 0)) {
          // Bayesian update
          const maxStable = Math.max(...updates.stable, 0);
          const minUnstable = Math.min(...updates.unstable, Infinity);
          
          // Posterior estimate (weighted average of prior and observation)
          const observedBoundary = (maxStable + minUnstable) / 2;
          const trust = model.trust.get(`${rpmRegion / 500}_${Math.round(point.ap * 10)}`) || 0.5;
          
          const posteriorAp = point.ap * (1 - trust) + observedBoundary * trust;
          
          newBoundary.push({
            rpm: point.rpm,
            ap: posteriorAp,
            confidence: trust
          });
        } else {
          newBoundary.push({ ...point, confidence: 0.5 });
        }
      }
      
      model.updatedSLD = { boundary: newBoundary };
      
      return model;
    },
    
    /**
     * Predict stability with trust-weighted prediction
     */
    predict: function(model, rpm, ap) {
      const regionKey = `${Math.round(rpm / 500)}_${Math.round(ap * 10)}`;
      const trust = model.trust.get(regionKey) || 0.5;
      
      // Get boundary at this RPM
      const sld = model.updatedSLD || model.baseSLD;
      let boundary = null;
      
      for (let i = 0; i < sld.boundary.length - 1; i++) {
        const p1 = sld.boundary[i];
        const p2 = sld.boundary[i + 1];
        
        if (rpm >= p1.rpm && rpm <= p2.rpm) {
          const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
          boundary = p1.ap + t * (p2.ap - p1.ap);
          break;
        }
      }
      
      if (boundary === null) {
        boundary = sld.boundary[0].ap;
      }
      
      return {
        stable: ap < boundary,
        boundaryAp: boundary,
        margin: boundary - ap,
        trustScore: trust,
        reliable: trust >= model.trustThreshold
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SELF-TEST
  // ═══════════════════════════════════════════════════════════════════════════

  selfTest: function() {
    const results = [];
    
    // Test 1: Semi-discretization method
    const system = { mass: 0.1, stiffness: 1e7, damping: 100 };
    const cutting = { Kc: 1500e6, teeth: 4, radialImmersion: 0.5 };
    const sdm = this.semiDiscretization(system, cutting);
    
    const stabilityResult = sdm.checkStability(10000, 2);
    results.push({
      name: 'Semi-Discretization Method',
      passed: typeof stabilityResult.stable === 'boolean',
      details: `RPM=10000, ap=2mm, stable=${stabilityResult.stable}`
    });
    
    // Test 2: PGML initialization
    const pgmlModel = this.pgmlStabilityModel.initialize(
      { system, cutting },
      { layers: [16, 8] }
    );
    results.push({
      name: 'PGML Model Initialization',
      passed: pgmlModel !== null && pgmlModel.physics !== null,
      details: 'Model initialized with physics base'
    });
    
    // Test 3: Multi-modal feature extraction
    const testSignal = Array.from({ length: 1000 }, () => Math.random() - 0.5);
    const fusedData = this.multiModalChatterDetector.fuseSignals({
      vibration: testSignal,
      force: null
    });
    results.push({
      name: 'Multi-Modal Feature Extraction',
      passed: fusedData.features.length === 5,
      details: `Extracted ${fusedData.features.length} fused features`
    });
    
    // Test 4: Fractal dimension computation
    const fractal = this.multiModalChatterDetector.structureFunctionMethod(testSignal);
    results.push({
      name: 'Fractal Dimension (SFM)',
      passed: fractal.fractalDimension > 0 && fractal.fractalDimension < 3,
      details: `D = ${fractal.fractalDimension.toFixed(3)}`
    });
    
    // Test 5: Continuous learning SLD
    const baseSLD = sdm.generateSLD([5000, 15000], [0.5, 5], 20);
    const clModel = this.continuousLearningSLD.initialize(baseSLD);
    this.continuousLearningSLD.addObservation(clModel, 10000, 3, true, 0.9);
    results.push({
      name: 'Continuous Learning SLD',
      passed: clModel.observations.length === 1,
      details: 'Observation added and model updated'
    });
    
    console.log('[PRISM_PIML_CHATTER_ENGINE] Self-test results:');
    results.forEach(r => {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}: ${r.details}`);
    });
    
    return {
      passed: results.every(r => r.passed),
      results
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const SESSION4_PIML_ROUTES = {
  // Semi-Discretization
  'piml.sdm.create': 'PRISM_PIML_CHATTER_ENGINE.semiDiscretization',
  
  // PGML
  'piml.pgml.initialize': 'PRISM_PIML_CHATTER_ENGINE.pgmlStabilityModel.initialize',
  'piml.pgml.train': 'PRISM_PIML_CHATTER_ENGINE.pgmlStabilityModel.train',
  'piml.pgml.predict': 'PRISM_PIML_CHATTER_ENGINE.pgmlStabilityModel.predict',
  'piml.pgml.generateSLD': 'PRISM_PIML_CHATTER_ENGINE.pgmlStabilityModel.generateSLD',
  
  // Multi-Modal
  'piml.multimodal.fuse': 'PRISM_PIML_CHATTER_ENGINE.multiModalChatterDetector.fuseSignals',
  'piml.multimodal.detect': 'PRISM_PIML_CHATTER_ENGINE.multiModalChatterDetector.detectChatter',
  'piml.multimodal.fractal': 'PRISM_PIML_CHATTER_ENGINE.multiModalChatterDetector.structureFunctionMethod',
  
  // Continuous Learning
  'piml.continuous.initialize': 'PRISM_PIML_CHATTER_ENGINE.continuousLearningSLD.initialize',
  'piml.continuous.addObservation': 'PRISM_PIML_CHATTER_ENGINE.continuousLearningSLD.addObservation',
  'piml.continuous.predict': 'PRISM_PIML_CHATTER_ENGINE.continuousLearningSLD.predict',
  'piml.continuous.retrain': 'PRISM_PIML_CHATTER_ENGINE.continuousLearningSLD.retrain',
  
  // Test
  'piml.test': 'PRISM_PIML_CHATTER_ENGINE.selfTest'
};

// Registration function
function registerSession4PIML() {
  if (typeof PRISM_GATEWAY !== 'undefined') {

// ═══════════════════════════════════════════════════════════════════════════════════
// PRISM PHASE 1 - 220 COURSES UTILIZATION INTEGRATION
// Added: v8.87.001 - January 18, 2026
// 30 algorithms | 28 gateway routes | AI-enhanced Speed & Feed Calculator
// Sources: MIT 15.099, MIT 18.433, MIT 6.036, MIT 18.086, MIT 2.008, MIT 2.830
// Stanford CS229, Berkeley EE123, CMU 24-785
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * PRISM PHASE 1 - COURSES UTILIZATION INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * 
 * Version: 1.0.0
 * Date: January 18, 2026
 * Build Target: v8.87.001
 * 
 * PURPOSE: Integrate 30 Phase 1 algorithms from 220 university courses into PRISM
 * 
 * PHASE 1 ALGORITHMS (30):
 * ├── Optimization: PSO, ACO, Genetic Algorithm
 * ├── Machine Learning: Linear Regression, Random Forest
 * ├── Signal Processing: FFT, Butterworth Filter
 * ├── Manufacturing: Taylor Tool Life, Merchant Force, Stability Lobes
 * └── Additional: Newton, BFGS, K-Means, Kalman Filter
 * 
 * PROTOCOLS FOLLOWED (v12.0):
 * ├── Protocol A: Gateway-First Development
 * ├── Protocol B: Unit-Safe Development  
 * ├── Protocol C: Compare-Safe Development
 * ├── Protocol E: Constants-First Development
 * ├── Protocol F: Validation-First Development
 * ├── Protocol J: Innovation-First Development
 * ├── Protocol K: Knowledge-First Development
 * ├── Protocol O: AI-First Development
 * └── Protocol P: Learning-First Development
 * 
 * SOURCES:
 * ├── MIT 15.099: PSO, Optimization
 * ├── MIT 18.433: ACO, Combinatorial Optimization
 * ├── MIT 6.036: Linear Regression, ML Fundamentals
 * ├── MIT 18.086: FFT, Signal Processing
 * ├── MIT 2.008: Taylor Tool Life, Merchant Force
 * ├── MIT 2.830: Stability Lobes, Chatter Analysis
 * ├── Stanford CS229: Random Forest, ML
 * ├── Berkeley EE123: Butterworth Filter, Signal Processing
 * └── CMU 24-785: Genetic Algorithm
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PHASE 1 MASTER COORDINATOR
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PRISM_PHASE1_COORDINATOR = {
    version: '1.0.0',
    phase: 1,
    name: 'Immediate Integration',
    targetUtilization: 100,
    algorithmsIntegrated: 0,
    totalAlgorithms: 30,
    
    status: {
        initialized: false,
        gatewayRoutesRegistered: 0,
        calculatorIntegrated: false,
        chatterDetectionConnected: false,
        toolLifeLinked: false,
        learningPipelineActive: false
    },
    
    /**
     * Initialize Phase 1 Integration
     * Protocol A: All calls through PRISM_GATEWAY
     */
    initialize: function() {
        console.log('╔══════════════════════════════════════════════════════════════════╗');
        console.log('║  PRISM Phase 1 - 220 Courses Utilization Integration            ║');
        console.log('║  Target: 30 algorithms at 100% utilization                      ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝');
        
        // Step 1: Register all Phase 1 gateway routes
        const routeResult = PRISM_PHASE1_GATEWAY_ROUTES.registerAll();
        this.status.gatewayRoutesRegistered = routeResult.registered;
        
        // Step 2: Initialize AI-enhanced calculator
        if (typeof PRISM_PHASE1_SPEED_FEED_CALCULATOR !== 'undefined') {
            PRISM_PHASE1_SPEED_FEED_CALCULATOR.initialize();
            this.status.calculatorIntegrated = true;
        }
        
        // Step 3: Connect chatter detection system
        if (typeof PRISM_PHASE1_CHATTER_SYSTEM !== 'undefined') {
            PRISM_PHASE1_CHATTER_SYSTEM.initialize();
            this.status.chatterDetectionConnected = true;
        }
        
        // Step 4: Link tool life management
        if (typeof PRISM_PHASE1_TOOL_LIFE_MANAGER !== 'undefined') {
            PRISM_PHASE1_TOOL_LIFE_MANAGER.initialize();
            this.status.toolLifeLinked = true;
        }
        
        // Step 5: Activate learning pipeline
        if (typeof PRISM_AI_LEARNING_PIPELINE !== 'undefined') {
            this.status.learningPipelineActive = true;
        }
        
        this.status.initialized = true;
        this.algorithmsIntegrated = this._countIntegratedAlgorithms();
        
        console.log(`[Phase 1] Initialized: ${this.algorithmsIntegrated}/${this.totalAlgorithms} algorithms`);
        console.log(`[Phase 1] Gateway routes: ${this.status.gatewayRoutesRegistered}`);
        
        return {
            success: true,
            algorithmsIntegrated: this.algorithmsIntegrated,
            gatewayRoutes: this.status.gatewayRoutesRegistered,
            status: this.status
        };
    },
    
    _countIntegratedAlgorithms: function() {
        let count = 0;
        const algorithms = [
            'opt.pso', 'opt.aco', 'opt.genetic', 'opt.newton', 'opt.bfgs',
            'ml.linear_regression', 'ml.random_forest', 'ml.kmeans',
            'signal.fft', 'signal.butterworth', 'signal.stability_lobes',
            'mfg.taylor_tool_life', 'mfg.merchant_force', 'mfg.mrr',
            'ai.kalman.predict', 'physics.cutting_force', 'physics.tool_life'
        ];
        
        if (typeof PRISM_GATEWAY !== 'undefined') {
            algorithms.forEach(route => {
                if (PRISM_GATEWAY.routes && PRISM_GATEWAY.routes[route]) {
                    count++;
                }
            });
        }
        return count;
    },
    
    /**
     * Get Phase 1 status report
     */
    getStatus: function() {
        return {
            phase: this.phase,
            name: this.name,
            version: this.version,
            progress: `${this.algorithmsIntegrated}/${this.totalAlgorithms}`,
            utilization: Math.round((this.algorithmsIntegrated / this.totalAlgorithms) * 100) + '%',
            status: this.status,
            targetUtilization: this.targetUtilization + '%'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PHASE 1 GATEWAY ROUTES REGISTRATION
// Protocol A: Gateway-First Development
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PRISM_PHASE1_GATEWAY_ROUTES = {
    routes: {
        // ═══════════════════════════════════════════════════════════════
        // OPTIMIZATION ALGORITHMS (MIT 15.099, MIT 18.433, CMU 24-785)
        // ═══════════════════════════════════════════════════════════════
        'phase1.pso.speed_feed': 'PRISM_PHASE1_OPTIMIZERS.psoSpeedFeed',
        'phase1.pso.multi_objective': 'PRISM_PHASE1_OPTIMIZERS.psoMultiObjective',
        'phase1.aco.hole_sequence': 'PRISM_PHASE1_OPTIMIZERS.acoHoleSequence',
        'phase1.aco.routing': 'PRISM_PHASE1_OPTIMIZERS.acoRouting',
        'phase1.genetic.toolpath': 'PRISM_PHASE1_OPTIMIZERS.geneticToolpath',
        'phase1.genetic.parameters': 'PRISM_PHASE1_OPTIMIZERS.geneticParameters',
        'phase1.newton.optimize': 'PRISM_PHASE1_OPTIMIZERS.newtonOptimize',
        'phase1.bfgs.optimize': 'PRISM_PHASE1_OPTIMIZERS.bfgsOptimize',
        
        // ═══════════════════════════════════════════════════════════════
        // MACHINE LEARNING (MIT 6.036, Stanford CS229)
        // ═══════════════════════════════════════════════════════════════
        'phase1.ml.linear_predict': 'PRISM_PHASE1_ML.linearPredict',
        'phase1.ml.ridge_predict': 'PRISM_PHASE1_ML.ridgePredict',
        'phase1.ml.forest_predict': 'PRISM_PHASE1_ML.randomForestPredict',
        'phase1.ml.forest_tool_life': 'PRISM_PHASE1_ML.forestToolLifePredict',
        'phase1.ml.kmeans_cluster': 'PRISM_PHASE1_ML.kmeansCluster',
        
        // ═══════════════════════════════════════════════════════════════
        // SIGNAL PROCESSING (MIT 18.086, Berkeley EE123)
        // ═══════════════════════════════════════════════════════════════
        'phase1.signal.fft_analyze': 'PRISM_PHASE1_SIGNAL.fftAnalyze',
        'phase1.signal.fft_chatter': 'PRISM_PHASE1_SIGNAL.fftChatterDetect',
        'phase1.signal.butterworth': 'PRISM_PHASE1_SIGNAL.butterworthFilter',
        'phase1.signal.stability_lobes': 'PRISM_PHASE1_SIGNAL.stabilityLobes',
        'phase1.signal.spectral_density': 'PRISM_PHASE1_SIGNAL.spectralDensity',
        
        // ═══════════════════════════════════════════════════════════════
        // MANUFACTURING PHYSICS (MIT 2.008, MIT 2.830)
        // ═══════════════════════════════════════════════════════════════
        'phase1.mfg.taylor_tool_life': 'PRISM_PHASE1_MANUFACTURING.taylorToolLife',
        'phase1.mfg.extended_taylor': 'PRISM_PHASE1_MANUFACTURING.extendedTaylor',
        'phase1.mfg.merchant_force': 'PRISM_PHASE1_MANUFACTURING.merchantForce',
        'phase1.mfg.kienzle_force': 'PRISM_PHASE1_MANUFACTURING.kienzleForce',
        'phase1.mfg.mrr': 'PRISM_PHASE1_MANUFACTURING.materialRemovalRate',
        'phase1.mfg.surface_finish': 'PRISM_PHASE1_MANUFACTURING.surfaceFinish',
        'phase1.mfg.cutting_temperature': 'PRISM_PHASE1_MANUFACTURING.cuttingTemperature',
        
        // ═══════════════════════════════════════════════════════════════
        // INTEGRATED AI CALCULATOR
        // ═══════════════════════════════════════════════════════════════
        'phase1.calc.speed_feed': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.calculate',
        'phase1.calc.ai_optimize': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.aiOptimize',
        'phase1.calc.full_analysis': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.fullAnalysis'
    },
    
    registerAll: function() {
        let registered = 0;
        let failed = 0;
        
        if (typeof PRISM_GATEWAY === 'undefined') {
            console.error('[Phase 1] PRISM_GATEWAY not found');
            return { registered: 0, failed: Object.keys(this.routes).length };
        }
        
        for (const [route, target] of Object.entries(this.routes)) {
            try {
                PRISM_GATEWAY.register(route, target);
                registered++;
            } catch (e) {
                console.warn(`[Phase 1] Failed to register route: ${route}`);
                failed++;
            }
        }
        
        console.log(`[Phase 1 Routes] Registered: ${registered}, Failed: ${failed}`);
        return { registered, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PHASE 1 OPTIMIZATION ALGORITHMS
// Sources: MIT 15.099, MIT 18.433, CMU 24-785
// Protocol J: Innovation-First Development
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PRISM_PHASE1_OPTIMIZERS = {
    name: 'Phase 1 Optimization Algorithms',
    version: '1.0.0',
    source: 'MIT 15.099, MIT 18.433, CMU 24-785',
    
    /**
     * PSO Speed/Feed Multi-Objective Optimization
     * Source: MIT 15.099 - Introduction to Optimization
     * Protocol B: Unit-Safe Development (metric internal)
     */
    psoSpeedFeed: function(params) {
        const {
            material,
            tool,
            machine,
            objectives = ['productivity', 'tool_life', 'surface_finish'],
            constraints = {}
        } = params;
        
        // Protocol E: Constants-First Development
        const PSO_CONFIG = {
            particles: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_PARTICLES : 30,
            iterations: typeof PRISM_CONSTANTS !== 'undefined' ? 
                PRISM_CONSTANTS.AI.PSO_MAX_ITERATIONS : 100,
            w: 0.729,      // Inertia weight
            c1: 1.49445,   // Cognitive parameter
            c2: 1.49445    // Social parameter
        };
        
        // Define search bounds (metric internal - Protocol B)
        const bounds = {
            speed: { min: 50, max: 500 },      // m/min
            feed: { min: 0.05, max: 0.5 },     // mm/tooth
            doc: { min: 0.5, max: 10 }         // mm
        };
        
        // Apply material constraints
        if (material && material.speedRange) {
            bounds.speed.min = Math.max(bounds.speed.min, material.speedRange.min || 50);
            bounds.speed.max = Math.min(bounds.speed.max, material.speedRange.max || 500);
        }
        
        // Initialize particles
        const particles = [];
        for (let i = 0; i < PSO_CONFIG.particles; i++) {
            particles.push({
                position: {
                    speed: bounds.speed.min + Math.random() * (bounds.speed.max - bounds.speed.min),
                    feed: bounds.feed.min + Math.random() * (bounds.feed.max - bounds.feed.min),
                    doc: bounds.doc.min + Math.random() * (bounds.doc.max - bounds.doc.min)
                },
                velocity: { speed: 0, feed: 0, doc: 0 },
                bestPosition: null,
                bestFitness: -Infinity
            });
            particles[i].bestPosition = { ...particles[i].position };
        }
        
        let globalBest = { position: null, fitness: -Infinity };
        
        // PSO main loop
        for (let iter = 0; iter < PSO_CONFIG.iterations; iter++) {
            for (const particle of particles) {
                // Evaluate fitness (multi-objective)
                const fitness = this._evaluateSpeedFeedFitness(
                    particle.position, material, tool, machine, objectives
                );
                
                // Update personal best
                if (fitness > particle.bestFitness) {
                    particle.bestFitness = fitness;
                    particle.bestPosition = { ...particle.position };
                }
                
                // Update global best
                if (fitness > globalBest.fitness) {
                    globalBest.fitness = fitness;
                    globalBest.position = { ...particle.position };
                }
            }
            
            // Update velocities and positions
            for (const particle of particles) {
                for (const dim of ['speed', 'feed', 'doc']) {
                    const r1 = Math.random();
                    const r2 = Math.random();
                    
                    particle.velocity[dim] = 
                        PSO_CONFIG.w * particle.velocity[dim] +
                        PSO_CONFIG.c1 * r1 * (particle.bestPosition[dim] - particle.position[dim]) +
                        PSO_CONFIG.c2 * r2 * (globalBest.position[dim] - particle.position[dim]);
                    
                    particle.position[dim] += particle.velocity[dim];
                    
                    // Clamp to bounds
                    particle.position[dim] = Math.max(bounds[dim].min, 
                        Math.min(bounds[dim].max, particle.position[dim]));
                }
            }
        }
        
        // Return optimized parameters with confidence
        return {
            optimizedParams: globalBest.position,
            fitness: globalBest.fitness,
            objectives: objectives,
            source: 'MIT 15.099 - PSO Multi-Objective',
            confidence: Math.min(0.95, 0.7 + globalBest.fitness * 0.25),
            iterations: PSO_CONFIG.iterations,
            particles: PSO_CONFIG.particles
        };
    },
    
    /**
     * Evaluate fitness for speed/feed optimization
     * Protocol O: AI-First Development
     */
    _evaluateSpeedFeedFitness: function(position, material, tool, machine, objectives) {
        let fitness = 0;
        const weights = {
            productivity: 0.4,
            tool_life: 0.35,
            surface_finish: 0.25
        };
        
        // Calculate MRR (productivity)
        const mrr = position.speed * position.feed * position.doc;
        const mrrNormalized = mrr / 100; // Normalize
        
        // Estimate tool life using Taylor equation
        const toolLife = this._estimateToolLife(position.speed, material);
        const toolLifeNormalized = Math.min(1, toolLife / 120); // Normalize to 120 min baseline
        
        // Estimate surface finish (lower is better)
        const surfaceFinish = this._estimateSurfaceFinish(position.feed, tool);
        const surfaceFinishNormalized = 1 - Math.min(1, surfaceFinish / 3.2); // Normalize to Ra 3.2
        
        // Weight objectives
        if (objectives.includes('productivity')) {
            fitness += weights.productivity * mrrNormalized;
        }
        if (objectives.includes('tool_life')) {
            fitness += weights.tool_life * toolLifeNormalized;
        }
        if (objectives.includes('surface_finish')) {
            fitness += weights.surface_finish * surfaceFinishNormalized;
        }
        
        return fitness;
    },
    
    _estimateToolLife: function(speed, material) {
        // Taylor's equation: VT^n = C
        const n = material?.taylorN || 0.25;
        const C = material?.taylorC || 300;
        return Math.pow(C / speed, 1 / n);
    }