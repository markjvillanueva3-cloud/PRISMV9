# PRISM PRODUCT CALCULATORS SKILL
## Complete Calculator Implementation Patterns
### Version 1.0 | January 2026

---

## OVERVIEW

This skill provides complete implementation patterns for PRISM's core calculation products. Each calculator follows the 6+ source rule, integrates with all relevant databases, and produces outputs with uncertainty quantification.

**PRISM Product Calculator Suite:**
1. Speed & Feed Calculator (primary calculation engine)
2. Force Calculator (cutting mechanics)
3. Power Calculator (machine utilization)
4. Tool Life Predictor (economics optimization)
5. Surface Finish Estimator (quality prediction)
6. Cycle Time Calculator (production planning)
7. Cost Estimator (quoting support)

---

## PART 1: CORE CALCULATOR ARCHITECTURE

---

## 1. CALCULATOR DESIGN PRINCIPLES

### 1.1 The 6+ Source Rule

Every PRISM calculation MUST combine data from at least 6 sources:

```javascript
/**
 * MANDATORY CALCULATION SOURCES
 * ═══════════════════════════════
 * 
 * SOURCE 1: Material Database
 *   - Base cutting parameters
 *   - Physical properties
 *   - Machinability factors
 * 
 * SOURCE 2: Tool Database
 *   - Geometry parameters
 *   - Coating factors
 *   - Grade recommendations
 * 
 * SOURCE 3: Machine Database
 *   - Capability limits (RPM, feed, power)
 *   - Rigidity factors
 *   - Controller characteristics
 * 
 * SOURCE 4: Physics Engine
 *   - Force models (Kienzle, Merchant)
 *   - Thermal models
 *   - Stability analysis (chatter)
 * 
 * SOURCE 5: Historical/Learning Data
 *   - What actually worked before
 *   - Shop-specific adjustments
 *   - Learned optimizations
 * 
 * SOURCE 6: AI/ML Recommendation
 *   - Bayesian optimization output
 *   - Neural network prediction
 *   - Ensemble consensus
 */
```

### 1.2 Calculator Base Class

```javascript
/**
 * PRISM_CALCULATOR_BASE
 * Base class for all PRISM calculators
 */
const PRISM_CALCULATOR_BASE = {
    
    _meta: {
        id: 'PRISM_CALCULATOR_BASE',
        version: '9.0.0',
        minSources: 6,
        requiresUncertainty: true
    },
    
    // Data source connections (set during init)
    _sources: {
        materials: null,
        tools: null,
        machines: null,
        physics: null,
        historical: null,
        ai: null
    },
    
    // Source validation
    _validateSources() {
        const connected = Object.values(this._sources).filter(s => s !== null);
        if (connected.length < this._meta.minSources) {
            throw new Error(
                `Calculator requires ${this._meta.minSources} sources, ` +
                `only ${connected.length} connected`
            );
        }
        return true;
    },
    
    // Initialize connections via Gateway
    async init() {
        this._sources.materials = await PRISM_GATEWAY.getDatabase('materials');
        this._sources.tools = await PRISM_GATEWAY.getDatabase('tools');
        this._sources.machines = await PRISM_GATEWAY.getDatabase('machines');
        this._sources.physics = await PRISM_GATEWAY.getEngine('physics');
        this._sources.historical = await PRISM_GATEWAY.getDatabase('historical');
        this._sources.ai = await PRISM_GATEWAY.getEngine('ai-optimizer');
        
        this._validateSources();
        
        // Register as consumer of all databases
        PRISM_GATEWAY.registerConsumer(this._meta.id, {
            databases: ['materials', 'tools', 'machines', 'historical'],
            engines: ['physics', 'ai-optimizer']
        });
        
        return this;
    },
    
    // Standard output structure
    _createOutput(primaryValue, unit, options = {}) {
        return {
            value: primaryValue,
            unit: unit,
            confidence: options.confidence || 0.85,
            uncertainty: {
                low: options.low || primaryValue * 0.85,
                high: options.high || primaryValue * 1.15,
                stdDev: options.stdDev || null
            },
            range: {
                conservative: options.conservative || primaryValue * 0.75,
                aggressive: options.aggressive || primaryValue * 1.25
            },
            _sources: options.sources || {},
            _weights: options.weights || {},
            _timestamp: new Date().toISOString(),
            _calculatorId: this._meta.id,
            _calculatorVersion: this._meta.version
        };
    },
    
    // Fusion algorithm for combining sources
    _fuseResults(sources, weights, constraints) {
        // Weighted average with constraint enforcement
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (const [sourceName, value] of Object.entries(sources)) {
            if (value !== null && weights[sourceName]) {
                weightedSum += value * weights[sourceName];
                totalWeight += weights[sourceName];
            }
        }
        
        let result = totalWeight > 0 ? weightedSum / totalWeight : null;
        
        // Apply hard constraints
        if (constraints) {
            if (constraints.max !== undefined && result > constraints.max) {
                result = constraints.max;
            }
            if (constraints.min !== undefined && result < constraints.min) {
                result = constraints.min;
            }
        }
        
        return result;
    },
    
    // Calculate confidence from source agreement
    _calculateConfidence(sources) {
        const values = Object.values(sources).filter(v => v !== null);
        if (values.length < 2) return 0.5;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const cv = Math.sqrt(variance) / mean; // Coefficient of variation
        
        // Lower CV = higher agreement = higher confidence
        // CV of 0 = confidence 1.0, CV of 0.5 = confidence 0.5
        return Math.max(0.3, Math.min(0.99, 1 - cv));
    }
};
```

### 1.3 Standard Input Structure

```javascript
/**
 * STANDARD CALCULATOR INPUT
 * All calculators accept this standardized input format
 */
const CALCULATOR_INPUT_SCHEMA = {
    
    // Material specification (required)
    material: {
        id: 'string',           // e.g., "STEEL_4140" or "AL_6061_T6"
        hardness: 'number',     // Optional override (HRC or HB)
        condition: 'string'     // Optional: "annealed", "heat_treated", etc.
    },
    
    // Tool specification (required)
    tool: {
        id: 'string',           // e.g., "EM_0500_4FL_ALTiN"
        diameter: 'number',     // Tool diameter (mm or inch)
        flutes: 'number',       // Number of cutting edges
        type: 'string',         // "endmill", "drill", "insert", etc.
        coating: 'string',      // Optional override
        geometry: {             // Optional detailed geometry
            helix: 'number',
            rake: 'number',
            relief: 'number'
        }
    },
    
    // Machine specification (required)
    machine: {
        id: 'string',           // e.g., "HAAS_VF2" or "DMG_CMX50U"
        rpm_max: 'number',      // Optional override
        power: 'number',        // Optional override (kW)
        rigidity: 'string'      // Optional: "low", "medium", "high"
    },
    
    // Operation specification (required)
    operation: {
        type: 'string',         // "roughing", "finishing", "slotting", etc.
        depth_of_cut: 'number', // ap (mm or inch)
        width_of_cut: 'number', // ae (mm or inch) - for milling
        engagement: 'number'    // Optional: ae/D ratio (0-1)
    },
    
    // Process options (optional)
    options: {
        coolant: 'string',      // "flood", "mist", "dry", "hpc"
        interrupted: 'boolean', // Interrupted cut?
        finish_req: 'number',   // Target Ra (µm)
        tool_life_target: 'number', // Target minutes
        conservative: 'boolean' // Use conservative values?
    },
    
    // Units (optional, defaults to metric)
    units: {
        length: 'string',       // "mm" or "inch"
        speed: 'string',        // "m_min" or "sfm"
        feed: 'string'          // "mm_rev" or "ipr"
    }
};
```

---

## 2. SPEED & FEED CALCULATOR

### 2.1 Complete Implementation

```javascript
/**
 * PRISM_SPEED_FEED_CALCULATOR
 * Primary calculation engine for cutting parameters
 * Implements 6+ source rule with fusion and uncertainty
 */
const PRISM_SPEED_FEED_CALCULATOR = {
    
    ...PRISM_CALCULATOR_BASE,
    
    _meta: {
        id: 'PRISM_SPEED_FEED_CALCULATOR',
        version: '9.0.0',
        minSources: 6,
        requiresUncertainty: true,
        
        // Consumer registration
        dataSources: {
            materials: {
                fields: ['base_speed', 'machinability', 'kc1_1', 'mc', 'hardness_range'],
                required: true
            },
            tools: {
                fields: ['speed_factor', 'coating_factor', 'flute_factor', 'max_chip_load'],
                required: true
            },
            machines: {
                fields: ['rpm_max', 'feed_rate_max', 'power_available', 'rigidity_factor'],
                required: true
            },
            physics: {
                fields: ['stability_limit', 'force_prediction', 'thermal_limit'],
                required: true
            },
            historical: {
                fields: ['best_results', 'shop_adjustments'],
                required: false
            },
            ai: {
                fields: ['optimized_params', 'confidence_score'],
                required: false
            }
        }
    },
    
    /**
     * Main calculation method
     * @param {Object} input - Standardized calculator input
     * @returns {Object} Complete speed/feed recommendation with uncertainty
     */
    async calculate(input) {
        this._validateSources();
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 1: Material Database
        // ═══════════════════════════════════════════════════════════
        const material = await this._sources.materials.get(input.material.id);
        if (!material) {
            throw new Error(`Material not found: ${input.material.id}`);
        }
        
        const materialSpeed = this._calculateMaterialSpeed(material, input);
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 2: Tool Database
        // ═══════════════════════════════════════════════════════════
        const tool = await this._sources.tools.get(input.tool.id);
        const toolFactors = this._calculateToolFactors(tool, input);
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 3: Machine Database
        // ═══════════════════════════════════════════════════════════
        const machine = await this._sources.machines.get(input.machine.id);
        const machineConstraints = this._getMachineConstraints(machine, input);
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 4: Physics Engine
        // ═══════════════════════════════════════════════════════════
        const physicsResult = await this._sources.physics.analyzeStability({
            material,
            tool,
            machine,
            operation: input.operation
        });
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 5: Historical/Learning Data
        // ═══════════════════════════════════════════════════════════
        const historical = await this._sources.historical.query({
            material: input.material.id,
            tool_type: input.tool.type,
            operation: input.operation.type
        });
        
        // ═══════════════════════════════════════════════════════════
        // SOURCE 6: AI/ML Recommendation
        // ═══════════════════════════════════════════════════════════
        const aiRecommendation = await this._sources.ai.optimize({
            material,
            tool,
            machine,
            operation: input.operation,
            historical
        });
        
        // ═══════════════════════════════════════════════════════════
        // FUSION: Combine all sources
        // ═══════════════════════════════════════════════════════════
        const speedSources = {
            material: materialSpeed.speed,
            tool: materialSpeed.speed * toolFactors.speedMultiplier,
            physics: physicsResult.stableSpeed,
            historical: historical?.bestSpeed || null,
            ai: aiRecommendation?.speed || null
        };
        
        const speedWeights = {
            material: 0.25,
            tool: 0.20,
            physics: 0.25,
            historical: 0.15,
            ai: 0.15
        };
        
        // Calculate fused speed
        const fusedSpeed = this._fuseResults(
            speedSources, 
            speedWeights,
            { max: machineConstraints.rpm_max * Math.PI * input.tool.diameter / 1000 }
        );
        
        // Calculate RPM from fused speed
        const rpm = this._speedToRpm(fusedSpeed, input.tool.diameter, input.units);
        
        // Apply machine constraint
        const constrainedRpm = Math.min(rpm, machineConstraints.rpm_max);
        
        // Calculate feed rate
        const feedResult = this._calculateFeed(
            material, tool, input, constrainedRpm, physicsResult
        );
        
        // Calculate confidence from source agreement
        const confidence = this._calculateConfidence(speedSources);
        
        // ═══════════════════════════════════════════════════════════
        // BUILD OUTPUT
        // ═══════════════════════════════════════════════════════════
        return {
            // Primary recommendations
            speed: this._createOutput(fusedSpeed, 'm/min', {
                confidence,
                low: fusedSpeed * 0.85,
                high: Math.min(fusedSpeed * 1.15, machineConstraints.speed_max),
                conservative: fusedSpeed * 0.75,
                aggressive: Math.min(fusedSpeed * 1.25, machineConstraints.speed_max),
                sources: speedSources,
                weights: speedWeights
            }),
            
            rpm: this._createOutput(constrainedRpm, 'rev/min', {
                confidence,
                low: constrainedRpm * 0.85,
                high: Math.min(constrainedRpm * 1.15, machineConstraints.rpm_max),
                conservative: constrainedRpm * 0.75,
                aggressive: Math.min(constrainedRpm * 1.25, machineConstraints.rpm_max)
            }),
            
            feed_per_tooth: feedResult.fz,
            feed_per_rev: feedResult.f,
            feed_rate: feedResult.vf,
            
            // Depth of cut recommendations
            depth_of_cut: {
                recommended: input.operation.depth_of_cut,
                max_stable: physicsResult.maxStableDepth,
                unit: input.units?.length || 'mm'
            },
            
            // Width of cut recommendations
            width_of_cut: {
                recommended: input.operation.width_of_cut,
                max_stable: physicsResult.maxStableWidth,
                unit: input.units?.length || 'mm'
            },
            
            // Derived calculations
            mrr: this._calculateMRR(input, constrainedRpm, feedResult),
            chip_thickness: this._calculateChipThickness(input, feedResult),
            
            // Supporting data
            _stability: {
                isStable: physicsResult.isStable,
                margin: physicsResult.stabilityMargin,
                criticalSpeed: physicsResult.criticalSpeed
            },
            
            _powerCheck: {
                required: this._calculatePower(material, input, feedResult),
                available: machineConstraints.power_available,
                utilization: null // Calculated below
            },
            
            _sources: {
                material: { id: material.id, speed: materialSpeed },
                tool: { id: tool?.id, factors: toolFactors },
                machine: { id: machine.id, constraints: machineConstraints },
                physics: { stable: physicsResult.isStable, limit: physicsResult.stableSpeed },
                historical: { found: !!historical, count: historical?.count || 0 },
                ai: { confidence: aiRecommendation?.confidence || 0 }
            },
            
            _timestamp: new Date().toISOString(),
            _calculatorId: this._meta.id,
            _version: this._meta.version
        };
    },
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════
    
    _calculateMaterialSpeed(material, input) {
        // Get base speed from material database
        let baseSpeed = material.cutting_parameters?.base_speed || 100;
        
        // Adjust for hardness if provided
        if (input.material.hardness) {
            const hardnessRange = material.hardness_range || { min: 150, max: 300 };
            const hardnessFactor = this._hardnessFactor(
                input.material.hardness, 
                hardnessRange
            );
            baseSpeed *= hardnessFactor;
        }
        
        // Adjust for operation type
        const operationFactors = {
            roughing: 0.9,
            semi_finish: 1.0,
            finishing: 1.1,
            slotting: 0.7,
            plunging: 0.5
        };
        baseSpeed *= operationFactors[input.operation.type] || 1.0;
        
        return {
            speed: baseSpeed,
            factors: {
                base: material.cutting_parameters?.base_speed,
                hardness: input.material.hardness,
                operation: input.operation.type
            }
        };
    },
    
    _calculateToolFactors(tool, input) {
        let speedMultiplier = 1.0;
        let feedMultiplier = 1.0;
        
        // Coating factor
        const coatingFactors = {
            'uncoated': 0.7,
            'TiN': 0.85,
            'TiCN': 0.90,
            'TiAlN': 1.0,
            'AlTiN': 1.05,
            'AlCrN': 1.0,
            'nACo': 1.1,
            'DLC': 1.15,
            'CVD': 1.0,
            'PVD': 1.05
        };
        const coating = input.tool.coating || tool?.coating || 'TiAlN';
        speedMultiplier *= coatingFactors[coating] || 1.0;
        
        // Helix angle factor (for end mills)
        if (tool?.geometry?.helix) {
            // Higher helix = smoother cut = can run faster
            speedMultiplier *= 1 + (tool.geometry.helix - 30) * 0.005;
        }
        
        // Flute count factor for feed
        if (input.tool.flutes > 4) {
            feedMultiplier *= 0.9; // Reduce chip load for more flutes
        }
        
        return {
            speedMultiplier,
            feedMultiplier,
            coating,
            maxChipLoad: tool?.max_chip_load || 0.1
        };
    },
    
    _getMachineConstraints(machine, input) {
        return {
            rpm_max: input.machine.rpm_max || machine?.spindle?.rpm_max || 10000,
            rpm_min: machine?.spindle?.rpm_min || 50,
            feed_rate_max: machine?.axes?.feed_rate_max || 10000,
            power_available: input.machine.power || machine?.spindle?.power_kw || 15,
            speed_max: (input.machine.rpm_max || machine?.spindle?.rpm_max || 10000) * 
                       Math.PI * input.tool.diameter / 1000,
            rigidity_factor: this._rigidityFactor(input.machine.rigidity || machine?.rigidity)
        };
    },
    
    _rigidityFactor(rigidity) {
        const factors = {
            'very_low': 0.5,
            'low': 0.7,
            'medium': 1.0,
            'high': 1.15,
            'very_high': 1.3
        };
        return factors[rigidity] || 1.0;
    },
    
    _hardnessFactor(hardness, range) {
        // Linear interpolation based on hardness
        const mid = (range.min + range.max) / 2;
        if (hardness <= mid) {
            return 1.0 + (mid - hardness) / mid * 0.3;
        } else {
            return 1.0 - (hardness - mid) / (range.max - mid) * 0.5;
        }
    },
    
    _speedToRpm(speed, diameter, units) {
        // Speed in m/min, diameter in mm
        const d = units?.length === 'inch' ? diameter * 25.4 : diameter;
        return (speed * 1000) / (Math.PI * d);
    },
    
    _calculateFeed(material, tool, input, rpm, physicsResult) {
        // Base chip load from material
        const baseChipLoad = material.cutting_parameters?.chip_load || 0.05;
        
        // Adjust for operation type
        const operationFactors = {
            roughing: 1.0,
            semi_finish: 0.7,
            finishing: 0.4,
            slotting: 0.6,
            plunging: 0.3
        };
        let fz = baseChipLoad * (operationFactors[input.operation.type] || 1.0);
        
        // Adjust for tool diameter
        const d = input.tool.diameter;
        if (d < 6) fz *= 0.7;
        else if (d < 12) fz *= 0.85;
        else if (d > 25) fz *= 1.1;
        
        // Chip thinning adjustment for radial engagement
        if (input.operation.engagement && input.operation.engagement < 0.5) {
            const thinningFactor = 1 / Math.sqrt(input.operation.engagement);
            fz *= Math.min(thinningFactor, 3.0); // Cap at 3x
        }
        
        // Check against physics limit
        if (physicsResult.maxChipLoad && fz > physicsResult.maxChipLoad) {
            fz = physicsResult.maxChipLoad;
        }
        
        // Calculate derived values
        const z = input.tool.flutes || 4;
        const f = fz * z;           // Feed per revolution
        const vf = f * rpm;         // Feed rate mm/min
        
        return {
            fz: this._createOutput(fz, 'mm/tooth', {
                confidence: 0.85,
                low: fz * 0.75,
                high: fz * 1.25,
                conservative: fz * 0.6,
                aggressive: fz * 1.5
            }),
            f: this._createOutput(f, 'mm/rev', {
                confidence: 0.85
            }),
            vf: this._createOutput(vf, 'mm/min', {
                confidence: 0.85
            })
        };
    },
    
    _calculateMRR(input, rpm, feedResult) {
        const ae = input.operation.width_of_cut || input.tool.diameter;
        const ap = input.operation.depth_of_cut || 1;
        const vf = feedResult.vf.value;
        
        const mrr = (ae * ap * vf) / 1000; // cm³/min
        
        return this._createOutput(mrr, 'cm³/min', {
            confidence: 0.9
        });
    },
    
    _calculateChipThickness(input, feedResult) {
        const fz = feedResult.fz.value;
        const ae = input.operation.width_of_cut || input.tool.diameter;
        const d = input.tool.diameter;
        
        // Actual chip thickness considering radial engagement
        const engagement = ae / d;
        const h_actual = fz * Math.sqrt(engagement);
        
        return {
            programmed: fz,
            actual: h_actual,
            thinning_factor: engagement < 1 ? 1 / Math.sqrt(engagement) : 1.0,
            unit: 'mm'
        };
    },
    
    _calculatePower(material, input, feedResult) {
        // Using specific cutting force
        const kc1_1 = material.force_parameters?.kc1_1 || 1800;
        const mc = material.force_parameters?.mc || 0.25;
        
        const h = feedResult.fz.value; // Chip thickness
        const kc = kc1_1 * Math.pow(h, -mc);
        
        const ap = input.operation.depth_of_cut || 1;
        const ae = input.operation.width_of_cut || input.tool.diameter;
        const vf = feedResult.vf.value;
        
        // Simplified power calculation
        const mrr = (ae * ap * vf) / 1000 / 60; // cm³/s
        const power = (kc * mrr * 10) / 1000; // kW (approximate)
        
        return this._createOutput(power, 'kW', {
            confidence: 0.75
        });
    }
};
```

---

## 3. FORCE CALCULATOR

### 3.1 Complete Implementation

```javascript
/**
 * PRISM_FORCE_CALCULATOR
 * Cutting force prediction using multiple models
 * Implements Kienzle, Merchant, and empirical models
 */
const PRISM_FORCE_CALCULATOR = {
    
    ...PRISM_CALCULATOR_BASE,
    
    _meta: {
        id: 'PRISM_FORCE_CALCULATOR',
        version: '9.0.0',
        minSources: 6,
        
        dataSources: {
            materials: {
                fields: ['kc1_1', 'mc', 'shear_angle', 'friction_coeff', 'yield_strength'],
                required: true
            },
            tools: {
                fields: ['rake_angle', 'edge_radius', 'nose_radius', 'geometry'],
                required: true
            },
            machines: {
                fields: ['rigidity', 'spindle_stiffness'],
                required: true
            }
        }
    },
    
    /**
     * Calculate cutting forces
     * @param {Object} input - Standard calculator input plus force-specific options
     * @returns {Object} Force components with uncertainty
     */
    async calculate(input) {
        this._validateSources();
        
        // Get material data
        const material = await this._sources.materials.get(input.material.id);
        const tool = await this._sources.tools.get(input.tool.id);
        const machine = await this._sources.machines.get(input.machine.id);
        
        // Get force model parameters
        const forceParams = material.force_parameters || {};
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 1: Kienzle Force Model
        // ═══════════════════════════════════════════════════════════
        const kienzleForce = this._kienzleModel(forceParams, input);
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 2: Merchant Force Model
        // ═══════════════════════════════════════════════════════════
        const merchantForce = this._merchantModel(material, tool, input);
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 3: Empirical Correction
        // ═══════════════════════════════════════════════════════════
        const historical = await this._sources.historical.query({
            material: input.material.id,
            operation: input.operation.type,
            metric: 'cutting_force'
        });
        const empiricalAdjust = historical?.adjustment_factor || 1.0;
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 4: AI/ML Prediction
        // ═══════════════════════════════════════════════════════════
        const aiPrediction = await this._sources.ai.predict({
            model: 'force_prediction',
            inputs: { material, tool, machine, operation: input.operation }
        });
        
        // ═══════════════════════════════════════════════════════════
        // FUSION: Combine models
        // ═══════════════════════════════════════════════════════════
        const sources = {
            kienzle: kienzleForce.Fc,
            merchant: merchantForce.Fc,
            historical: kienzleForce.Fc * empiricalAdjust,
            ai: aiPrediction?.Fc || null
        };
        
        const weights = {
            kienzle: 0.35,
            merchant: 0.25,
            historical: 0.25,
            ai: 0.15
        };
        
        const fusedFc = this._fuseResults(sources, weights, null);
        const confidence = this._calculateConfidence(sources);
        
        // Force ratios (typically from Merchant model)
        const Fc = fusedFc;
        const Ft = Fc * (merchantForce.Ft / merchantForce.Fc);
        const Fr = Fc * 0.3; // Radial typically 25-35% of Fc
        
        return {
            // Main cutting force (tangential)
            Fc: this._createOutput(Fc, 'N', {
                confidence,
                low: Fc * 0.85,
                high: Fc * 1.15,
                sources,
                weights
            }),
            
            // Feed force (axial)
            Ft: this._createOutput(Ft, 'N', {
                confidence: confidence * 0.9
            }),
            
            // Radial force
            Fr: this._createOutput(Fr, 'N', {
                confidence: confidence * 0.85
            }),
            
            // Resultant force
            F_resultant: this._createOutput(
                Math.sqrt(Fc*Fc + Ft*Ft + Fr*Fr), 'N',
                { confidence: confidence * 0.9 }
            ),
            
            // Specific cutting force
            kc: this._createOutput(
                kienzleForce.kc, 'N/mm²',
                { confidence: 0.85 }
            ),
            
            // Torque
            torque: this._createOutput(
                Fc * (input.tool.diameter / 2000), 'Nm',
                { confidence }
            ),
            
            // Model breakdown
            _models: {
                kienzle: kienzleForce,
                merchant: merchantForce,
                empirical_factor: empiricalAdjust,
                ai_prediction: aiPrediction
            },
            
            _sources: sources,
            _timestamp: new Date().toISOString(),
            _calculatorId: this._meta.id
        };
    },
    
    /**
     * Kienzle Force Model
     * Fc = kc × b × h
     * kc = kc1.1 × h^(-mc)
     */
    _kienzleModel(forceParams, input) {
        const kc1_1 = forceParams.kc1_1 || 1800;
        const mc = forceParams.mc || 0.25;
        
        // Chip dimensions
        const h = input.feed_per_tooth || 0.1;  // Chip thickness (mm)
        const b = input.operation.depth_of_cut || 2;  // Chip width (mm)
        
        // Specific cutting force at chip thickness h
        const kc = kc1_1 * Math.pow(h, -mc);
        
        // Main cutting force
        const Fc = kc * b * h;
        
        // Feed force (typically 40-60% of Fc)
        const Ft = Fc * 0.5;
        
        return {
            Fc,
            Ft,
            kc,
            kc1_1,
            mc,
            h,
            b
        };
    },
    
    /**
     * Merchant Force Model (Orthogonal cutting)
     * Based on shear plane theory
     */
    _merchantModel(material, tool, input) {
        // Shear angle (degrees)
        const phi = material.shear_angle || 25;
        const phiRad = phi * Math.PI / 180;
        
        // Rake angle (degrees)
        const alpha = tool?.geometry?.rake || 10;
        const alphaRad = alpha * Math.PI / 180;
        
        // Friction angle (from friction coefficient)
        const mu = material.friction_coeff || 0.5;
        const beta = Math.atan(mu);
        
        // Chip dimensions
        const h = input.feed_per_tooth || 0.1;
        const b = input.operation.depth_of_cut || 2;
        
        // Shear stress
        const tau_s = material.yield_strength 
            ? material.yield_strength / Math.sqrt(3) 
            : 400; // MPa
        
        // Shear force
        const As = (b * h) / Math.sin(phiRad);
        const Fs = tau_s * As;
        
        // Cutting force components (Merchant's circle)
        const Fc = Fs * Math.cos(beta - alphaRad) / Math.cos(phiRad + beta - alphaRad);
        const Ft = Fs * Math.sin(beta - alphaRad) / Math.cos(phiRad + beta - alphaRad);
        
        return {
            Fc,
            Ft,
            Fs,
            phi,
            alpha,
            beta: beta * 180 / Math.PI,
            tau_s
        };
    }
};
```

---

## 4. TOOL LIFE CALCULATOR

### 4.1 Complete Implementation

```javascript
/**
 * PRISM_TOOL_LIFE_CALCULATOR
 * Tool life prediction using Taylor equation and wear models
 */
const PRISM_TOOL_LIFE_CALCULATOR = {
    
    ...PRISM_CALCULATOR_BASE,
    
    _meta: {
        id: 'PRISM_TOOL_LIFE_CALCULATOR',
        version: '9.0.0',
        minSources: 6,
        
        dataSources: {
            materials: {
                fields: ['taylor_n', 'taylor_C', 'abrasiveness', 'work_hardening'],
                required: true
            },
            tools: {
                fields: ['substrate', 'coating', 'wear_resistance', 'toughness'],
                required: true
            },
            machines: {
                fields: ['rigidity', 'coolant_pressure'],
                required: true
            }
        }
    },
    
    /**
     * Calculate expected tool life
     */
    async calculate(input) {
        this._validateSources();
        
        const material = await this._sources.materials.get(input.material.id);
        const tool = await this._sources.tools.get(input.tool.id);
        const machine = await this._sources.machines.get(input.machine.id);
        
        // Current cutting conditions
        const Vc = input.cutting_speed || 200; // m/min
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 1: Taylor Tool Life
        // ═══════════════════════════════════════════════════════════
        const taylorLife = this._taylorModel(material, tool, Vc);
        
        // ═══════════════════════════════════════════════════════════
        // MODEL 2: Wear Rate Model
        // ═══════════════════════════════════════════════════════════
        const wearLife = this._wearRateModel(material, tool, input);
        
        // ═══════════════════════════════════════════════════════════
        // ADJUSTMENT FACTORS
        // ═══════════════════════════════════════════════════════════
        const factors = this._getLifeFactors(input, machine);
        
        // ═══════════════════════════════════════════════════════════
        // HISTORICAL DATA
        // ═══════════════════════════════════════════════════════════
        const historical = await this._sources.historical.query({
            material: input.material.id,
            tool_type: input.tool.type,
            metric: 'tool_life'
        });
        
        // ═══════════════════════════════════════════════════════════
        // AI PREDICTION
        // ═══════════════════════════════════════════════════════════
        const aiPrediction = await this._sources.ai.predict({
            model: 'tool_life',
            inputs: { material, tool, speed: Vc, feed: input.feed }
        });
        
        // ═══════════════════════════════════════════════════════════
        // FUSION
        // ═══════════════════════════════════════════════════════════
        const sources = {
            taylor: taylorLife.T,
            wear: wearLife.T,
            historical: historical?.avgLife || null,
            ai: aiPrediction?.life || null
        };
        
        const fusedLife = this._fuseResults(sources, {
            taylor: 0.30,
            wear: 0.25,
            historical: 0.25,
            ai: 0.20
        }, null);
        
        // Apply adjustment factors
        const adjustedLife = fusedLife * factors.total;
        
        const confidence = this._calculateConfidence(sources);
        
        return {
            // Expected tool life
            life_minutes: this._createOutput(adjustedLife, 'min', {
                confidence,
                low: adjustedLife * 0.6,
                high: adjustedLife * 1.5,
                conservative: adjustedLife * 0.5,
                aggressive: adjustedLife * 2.0,
                sources
            }),
            
            // Parts per tool (if cycle time known)
            parts_per_tool: input.cycle_time 
                ? this._createOutput(Math.floor(adjustedLife / input.cycle_time), 'parts', {
                    confidence: confidence * 0.9
                })
                : null,
            
            // Economic analysis
            economics: this._calculateEconomics(adjustedLife, input),
            
            // Taylor parameters
            taylor: {
                n: taylorLife.n,
                C: taylorLife.C,
                equation: `V × T^${taylorLife.n.toFixed(2)} = ${taylorLife.C.toFixed(0)}`
            },
            
            // Adjustment factors applied
            factors: factors,
            
            // Wear prediction
            wear_mode: wearLife.dominantWear,
            
            // Optimal speed for target life
            optimal_speed: this._optimalSpeedForLife(
                taylorLife.n, taylorLife.C, 
                input.target_life || 20
            ),
            
            _sources: sources,
            _timestamp: new Date().toISOString(),
            _calculatorId: this._meta.id
        };
    },
    
    /**
     * Taylor Tool Life Model
     * V × T^n = C
     */
    _taylorModel(material, tool, Vc) {
        // Get Taylor parameters
        let n = material.tool_life?.taylor_n || 0.25;
        let C = material.tool_life?.taylor_C || 200;
        
        // Adjust for tool type
        const toolTypeFactors = {
            'HSS': { n_mult: 0.4, C_mult: 0.5 },
            'carbide_uncoated': { n_mult: 0.8, C_mult: 0.8 },
            'carbide_coated': { n_mult: 1.0, C_mult: 1.0 },
            'ceramic': { n_mult: 1.6, C_mult: 1.3 },
            'CBN': { n_mult: 2.0, C_mult: 1.5 },
            'PCD': { n_mult: 2.2, C_mult: 1.6 }
        };
        
        const toolType = tool?.substrate || 'carbide_coated';
        const factors = toolTypeFactors[toolType] || { n_mult: 1.0, C_mult: 1.0 };
        
        n *= factors.n_mult;
        C *= factors.C_mult;
        
        // Calculate tool life: T = (C/V)^(1/n)
        const T = Math.pow(C / Vc, 1 / n);
        
        return { T, n, C, Vc };
    },
    
    /**
     * Wear Rate Model
     */
    _wearRateModel(material, tool, input) {
        // Flank wear rate factors
        const abrasiveness = material.abrasiveness || 1.0;
        const wearResistance = tool?.wear_resistance || 1.0;
        
        // Estimate wear rate (VB/min)
        const baseWearRate = 0.01 * abrasiveness / wearResistance;
        
        // Temperature effect (higher speed = faster wear)
        const speedFactor = Math.pow(input.cutting_speed / 200, 1.5);
        const wearRate = baseWearRate * speedFactor;
        
        // Time to reach VB = 0.3mm (typical limit)
        const T = 0.3 / wearRate;
        
        // Determine dominant wear mechanism
        let dominantWear = 'flank';
        if (input.cutting_speed > 250) dominantWear = 'crater';
        if (material.work_hardening > 1.5) dominantWear = 'notch';
        
        return { T, wearRate, dominantWear };
    },
    
    /**
     * Get life adjustment factors
     */
    _getLifeFactors(input, machine) {
        const factors = {
            coolant: 1.0,
            interrupted: 1.0,
            engagement: 1.0,
            surface: 1.0,
            rigidity: 1.0
        };
        
        // Coolant factor
        const coolantFactors = {
            'dry': 0.5,
            'mist': 0.7,
            'flood': 1.0,
            'hpc': 1.4,
            'through_tool': 1.3,
            'cryogenic': 1.8
        };
        factors.coolant = coolantFactors[input.options?.coolant] || 1.0;
        
        // Interrupted cut factor
        if (input.options?.interrupted) {
            factors.interrupted = 0.6;
        }
        
        // Engagement factor (full slot = more wear)
        const engagement = input.operation?.engagement || 0.5;
        factors.engagement = engagement > 0.8 ? 0.7 : 
                            engagement > 0.5 ? 0.85 : 
                            engagement > 0.2 ? 1.0 : 1.2;
        
        // Workpiece surface factor
        if (input.options?.scale || input.options?.forging_skin) {
            factors.surface = 0.4;
        }
        
        // Machine rigidity
        factors.rigidity = machine?.rigidity_factor || 1.0;
        
        // Total factor
        factors.total = Object.values(factors)
            .filter(v => typeof v === 'number')
            .reduce((a, b) => a * b, 1);
        
        return factors;
    },
    
    /**
     * Calculate optimal speed for target tool life
     */
    _optimalSpeedForLife(n, C, targetLife) {
        // From Taylor: V = C / T^n
        const optimalSpeed = C / Math.pow(targetLife, n);
        
        return this._createOutput(optimalSpeed, 'm/min', {
            confidence: 0.8
        });
    },
    
    /**
     * Economic analysis
     */
    _calculateEconomics(life, input) {
        const toolCost = input.tool_cost || 50; // $ per edge
        const machineRate = input.machine_rate || 75; // $/hour
        const changeTime = input.change_time || 2; // minutes
        
        // Cost per minute of cutting
        const toolCostPerMin = toolCost / life;
        const changeCostPerMin = (machineRate / 60) * (changeTime / life);
        const totalCostPerMin = toolCostPerMin + changeCostPerMin;
        
        return {
            tool_cost_per_min: toolCostPerMin,
            change_cost_per_min: changeCostPerMin,
            total_cost_per_min: totalCostPerMin,
            currency: 'USD'
        };
    }
};
```

---

*END OF PART 1*

---


## Section 5: Surface Finish Estimator

### 5.1 Surface Finish Calculator Implementation

```javascript
/**
 * PRISM_SURFACE_FINISH_CALCULATOR
 * 
 * Predicts surface finish (Ra) based on:
 * - Theoretical geometry (tool nose radius, feed)
 * - Material factors (BUE tendency, chip characteristics)
 * - Machine factors (rigidity, vibration)
 * - Process factors (speed, coolant, tool wear)
 * 
 * Implements 6+ Source Rule for comprehensive prediction
 */
const PRISM_SURFACE_FINISH_CALCULATOR = {
    ...PRISM_CALCULATOR_BASE,
    
    name: 'Surface Finish Calculator',
    version: '9.0.0',
    
    /**
     * Main calculation entry point
     */
    async calculate(input) {
        this._validateSources();
        await this.init();
        
        // SOURCE 1: Theoretical geometric finish
        const geometric = this._geometricFinish(input);
        
        // SOURCE 2: Material effects
        const materialFactor = await this._getMaterialFactor(input);
        
        // SOURCE 3: Machine/process effects
        const processFactor = this._getProcessFactor(input);
        
        // SOURCE 4: Physics-based vibration effects
        const vibrationFactor = await this._getVibrationFactor(input);
        
        // SOURCE 5: Historical correlation
        const historical = await this._getHistoricalFinish(input);
        
        // SOURCE 6: AI prediction
        const aiPrediction = await this._getAIPrediction(input);
        
        // Fuse all sources
        const predicted = this._fuseFinishResults({
            geometric,
            materialFactor,
            processFactor,
            vibrationFactor,
            historical,
            aiPrediction
        }, input);
        
        return this._createFinishOutput(predicted, input);
    },
    
    /**
     * Theoretical geometric surface finish
     * Ra_theoretical = f² / (32 × r)
     * where f = feed per rev, r = nose radius
     */
    _geometricFinish(input) {
        const feed = input.feed_per_rev || 0.1; // mm/rev
        const noseRadius = input.tool?.nose_radius || 0.8; // mm
        
        // Theoretical Ra in μm
        let Ra_theoretical;
        
        if (input.operation?.type === 'milling') {
            // For milling: Ra = f² / (32 × r) × corner factor
            const cornerRadius = input.tool?.corner_radius || 0.4;
            Ra_theoretical = (Math.pow(feed, 2) / (32 * cornerRadius)) * 1000;
        } else {
            // For turning: Ra = f² / (32 × r)
            Ra_theoretical = (Math.pow(feed, 2) / (32 * noseRadius)) * 1000;
        }
        
        // Apply tool geometry corrections
        const geometryFactor = this._getToolGeometryFactor(input);
        Ra_theoretical *= geometryFactor;
        
        return {
            Ra: Ra_theoretical,
            formula: 'f²/(32×r)',
            feed: feed,
            radius: noseRadius,
            confidence: 0.9
        };
    },
    
    /**
     * Tool geometry effects on finish
     */
    _getToolGeometryFactor(input) {
        let factor = 1.0;
        
        // Rake angle effect
        const rakeAngle = input.tool?.rake_angle || 6;
        if (rakeAngle < 0) factor *= 1.1; // Negative rake = rougher
        if (rakeAngle > 15) factor *= 0.9; // High positive = smoother
        
        // Edge sharpness
        const edgeRadius = input.tool?.edge_radius || 0.02; // mm
        if (edgeRadius > 0.03) factor *= 1.15; // Worn edge = rougher
        if (edgeRadius < 0.01) factor *= 0.95; // Very sharp = smoother
        
        // Coating effect
        const coating = input.tool?.coating || 'TiN';
        const coatingFactors = {
            'uncoated': 1.0,
            'TiN': 0.95,
            'TiAlN': 0.92,
            'AlTiN': 0.90,
            'TiCN': 0.93,
            'DLC': 0.85,
            'diamond': 0.75
        };
        factor *= coatingFactors[coating] || 1.0;
        
        return factor;
    },
    
    /**
     * Material effects on surface finish
     */
    async _getMaterialFactor(input) {
        const material = await PRISM_GATEWAY.request('materials.get', {
            id: input.material?.id
        });
        
        let factor = 1.0;
        
        // Built-up edge tendency (major factor)
        const bueTendency = material.built_up_edge_tendency || 0.5;
        factor *= 1.0 + (bueTendency * 0.5); // 0-50% increase
        
        // Chip type effect
        const chipType = material.chip_formation_type || 'continuous';
        const chipFactors = {
            'continuous': 1.0,
            'lamellar': 1.1,
            'segmented': 1.15,
            'discontinuous': 1.25
        };
        factor *= chipFactors[chipType] || 1.0;
        
        // Hardness effect (harder often finishes better)
        const hardness = material.hardness_brinell || 200;
        if (hardness > 300) factor *= 0.9;
        if (hardness < 150) factor *= 1.15; // Soft, gummy
        
        // Sulfur content (free machining)
        const sulfur = material.composition?.S || 0;
        if (sulfur > 0.15) factor *= 1.1; // Sulfide inclusions
        
        return {
            factor: factor,
            bue_tendency: bueTendency,
            chip_type: chipType,
            hardness: hardness,
            confidence: 0.85
        };
    },
    
    /**
     * Process and machine effects
     */
    _getProcessFactor(input) {
        let factor = 1.0;
        
        // Cutting speed effect
        const speed = input.cutting_speed || 100; // m/min
        const optimalSpeed = input.material?.optimal_finish_speed || 150;
        
        // Below optimal = more BUE
        if (speed < optimalSpeed * 0.7) {
            factor *= 1.2;
        }
        // Above optimal = thermal effects
        if (speed > optimalSpeed * 1.5) {
            factor *= 1.1;
        }
        
        // Coolant effect
        const coolant = input.coolant || 'flood';
        const coolantFactors = {
            'dry': 1.25,
            'air': 1.2,
            'mist': 1.1,
            'MQL': 1.05,
            'flood': 1.0,
            'high_pressure': 0.9,
            'cryogenic': 0.85
        };
        factor *= coolantFactors[coolant] || 1.0;
        
        // Depth of cut effect
        const doc = input.depth_of_cut || 1.0;
        if (doc > 3.0) factor *= 1.15; // Heavy cut = more deflection
        if (doc < 0.5) factor *= 0.95; // Light = spring cuts possible
        
        // Tool wear state
        const wearState = input.tool_wear || 'fresh';
        const wearFactors = {
            'fresh': 1.0,
            'light': 1.05,
            'moderate': 1.15,
            'heavy': 1.35,
            'worn': 1.5
        };
        factor *= wearFactors[wearState] || 1.0;
        
        // Machine rigidity
        const rigidity = input.machine?.rigidity_factor || 1.0;
        factor *= 1.0 / rigidity; // Lower rigidity = worse finish
        
        return {
            factor: factor,
            speed_effect: speed / optimalSpeed,
            coolant: coolant,
            wear_state: wearState,
            confidence: 0.8
        };
    },
    
    /**
     * Vibration/chatter effects on finish
     */
    async _getVibrationFactor(input) {
        const stability = await PRISM_GATEWAY.request('physics.stability', {
            rpm: input.rpm,
            depth: input.depth_of_cut,
            width: input.width_of_cut,
            machine: input.machine?.id,
            tool: input.tool?.id
        });
        
        let factor = 1.0;
        
        // Stability margin effect
        const margin = stability.stability_margin || 1.0;
        if (margin < 0.2) factor *= 2.0; // Near chatter
        else if (margin < 0.5) factor *= 1.3;
        else if (margin > 1.5) factor *= 0.9; // Very stable
        
        // Forced vibration from imbalance, runout
        const runout = input.tool?.runout || 0.01; // mm
        factor *= 1.0 + (runout / 0.1); // Every 0.1mm adds 100%
        
        return {
            factor: factor,
            stability_margin: margin,
            runout: runout,
            chatter_risk: margin < 0.3 ? 'high' : margin < 0.7 ? 'moderate' : 'low',
            confidence: 0.75
        };
    },
    
    /**
     * Historical finish data correlation
     */
    async _getHistoricalFinish(input) {
        const similar = await PRISM_GATEWAY.request('learning.similar_operations', {
            material: input.material?.id,
            operation: input.operation?.type,
            tool_type: input.tool?.type,
            speed_range: [input.cutting_speed * 0.8, input.cutting_speed * 1.2],
            limit: 20
        });
        
        if (!similar || similar.length === 0) {
            return { Ra: null, confidence: 0 };
        }
        
        // Statistical analysis of historical results
        const finishes = similar.map(s => s.measured_Ra).filter(r => r);
        const avgRa = finishes.reduce((a, b) => a + b, 0) / finishes.length;
        const stdDev = Math.sqrt(
            finishes.reduce((sum, r) => sum + Math.pow(r - avgRa, 2), 0) / finishes.length
        );
        
        return {
            Ra: avgRa,
            std_dev: stdDev,
            sample_size: finishes.length,
            confidence: Math.min(0.9, 0.5 + (finishes.length / 40))
        };
    },
    
    /**
     * AI/ML finish prediction
     */
    async _getAIPrediction(input) {
        const prediction = await PRISM_GATEWAY.request('ai.predict_finish', {
            features: {
                material_id: input.material?.id,
                hardness: input.material?.hardness,
                tool_type: input.tool?.type,
                nose_radius: input.tool?.nose_radius,
                coating: input.tool?.coating,
                speed: input.cutting_speed,
                feed: input.feed_per_rev,
                depth: input.depth_of_cut,
                coolant: input.coolant,
                rigidity: input.machine?.rigidity_factor
            }
        });
        
        return {
            Ra: prediction.value,
            confidence: prediction.confidence || 0.7,
            model: prediction.model_used
        };
    },
    
    /**
     * Fuse all finish predictions
     */
    _fuseFinishResults(sources, input) {
        // Calculate final Ra with weighted contributions
        const geometric_Ra = sources.geometric.Ra;
        const material_factor = sources.materialFactor.factor;
        const process_factor = sources.processFactor.factor;
        const vibration_factor = sources.vibrationFactor.factor;
        
        // Physics-based prediction
        let physics_Ra = geometric_Ra * material_factor * process_factor * vibration_factor;
        
        // Combine with historical if available
        const weights = {
            physics: 0.45,
            historical: 0.30,
            ai: 0.25
        };
        
        let final_Ra = physics_Ra * weights.physics;
        let total_weight = weights.physics;
        
        if (sources.historical.Ra) {
            final_Ra += sources.historical.Ra * weights.historical;
            total_weight += weights.historical;
        }
        
        if (sources.aiPrediction.Ra) {
            final_Ra += sources.aiPrediction.Ra * weights.ai;
            total_weight += weights.ai;
        }
        
        final_Ra /= total_weight;
        
        // Calculate confidence from source agreement
        const predictions = [physics_Ra];
        if (sources.historical.Ra) predictions.push(sources.historical.Ra);
        if (sources.aiPrediction.Ra) predictions.push(sources.aiPrediction.Ra);
        
        const confidence = this._calculateConfidence(predictions);
        
        return {
            Ra: final_Ra,
            physics_Ra: physics_Ra,
            confidence: confidence,
            sources: sources
        };
    },
    
    /**
     * Create comprehensive output
     */
    _createFinishOutput(predicted, input) {
        const Ra = predicted.Ra;
        
        // Convert to other roughness standards
        const Rz = Ra * 4.5; // Approximate Rz
        const Rt = Ra * 7;   // Approximate Rt
        const RMS = Ra * 1.11; // RMS roughness
        const CLA = Ra; // Center Line Average = Ra
        const microinch = Ra * 39.37; // μm to μin
        
        // N-grade classification
        let N_grade;
        if (Ra <= 0.025) N_grade = 'N1';
        else if (Ra <= 0.05) N_grade = 'N2';
        else if (Ra <= 0.1) N_grade = 'N3';
        else if (Ra <= 0.2) N_grade = 'N4';
        else if (Ra <= 0.4) N_grade = 'N5';
        else if (Ra <= 0.8) N_grade = 'N6';
        else if (Ra <= 1.6) N_grade = 'N7';
        else if (Ra <= 3.2) N_grade = 'N8';
        else if (Ra <= 6.3) N_grade = 'N9';
        else if (Ra <= 12.5) N_grade = 'N10';
        else if (Ra <= 25) N_grade = 'N11';
        else N_grade = 'N12';
        
        // Achievability assessment
        const target = input.target_finish;
        let achievable = true;
        let recommendations = [];
        
        if (target && Ra > target * 1.1) {
            achievable = false;
            recommendations = this._getImprovementRecommendations(predicted, input, target);
        }
        
        return {
            surface_finish: {
                Ra: { value: Ra, unit: 'μm', uncertainty: Ra * (1 - predicted.confidence) },
                Ra_microinch: { value: microinch, unit: 'μin' },
                Rz: { value: Rz, unit: 'μm' },
                Rt: { value: Rt, unit: 'μm' },
                RMS: { value: RMS, unit: 'μm' },
                N_grade: N_grade
            },
            confidence: predicted.confidence,
            achievable: achievable,
            recommendations: recommendations,
            sources: {
                geometric: predicted.sources.geometric,
                material_effect: predicted.sources.materialFactor,
                process_effect: predicted.sources.processFactor,
                vibration_effect: predicted.sources.vibrationFactor,
                historical: predicted.sources.historical,
                ai: predicted.sources.aiPrediction
            },
            physics_breakdown: {
                theoretical_Ra: predicted.sources.geometric.Ra,
                with_material: predicted.sources.geometric.Ra * predicted.sources.materialFactor.factor,
                with_process: predicted.sources.geometric.Ra * predicted.sources.materialFactor.factor * predicted.sources.processFactor.factor,
                with_vibration: predicted.physics_Ra
            },
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Generate improvement recommendations
     */
    _getImprovementRecommendations(predicted, input, target) {
        const recommendations = [];
        const sources = predicted.sources;
        
        // Check each factor for improvement potential
        if (sources.processFactor.factor > 1.1) {
            if (input.coolant === 'dry' || input.coolant === 'air') {
                recommendations.push({
                    action: 'Use flood coolant or MQL',
                    expected_improvement: '10-25%',
                    priority: 'high'
                });
            }
            if (sources.processFactor.wear_state !== 'fresh') {
                recommendations.push({
                    action: 'Use fresh tool edge',
                    expected_improvement: '5-35%',
                    priority: 'high'
                });
            }
        }
        
        // Feed reduction
        const currentFeed = input.feed_per_rev;
        const neededRa = target;
        const currentGeoRa = sources.geometric.Ra;
        
        if (currentGeoRa > neededRa * 0.8) {
            // Ra ∝ f², so f_new = f_old × √(Ra_new/Ra_old)
            const feedReduction = Math.sqrt(neededRa / currentGeoRa);
            recommendations.push({
                action: `Reduce feed to ${(currentFeed * feedReduction).toFixed(3)} mm/rev`,
                expected_improvement: `${((1 - feedReduction) * 100).toFixed(0)}%`,
                priority: 'medium'
            });
        }
        
        // Tool nose radius
        if (input.tool?.nose_radius < 0.8) {
            recommendations.push({
                action: 'Use larger nose radius (0.8-1.2mm)',
                expected_improvement: '15-30%',
                priority: 'medium'
            });
        }
        
        // Vibration control
        if (sources.vibrationFactor.factor > 1.2) {
            recommendations.push({
                action: 'Reduce depth of cut or use vibration damping',
                expected_improvement: '10-20%',
                priority: 'medium'
            });
        }
        
        // Speed optimization
        if (sources.materialFactor.bue_tendency > 0.5 && input.cutting_speed < 150) {
            recommendations.push({
                action: 'Increase cutting speed to reduce BUE',
                expected_improvement: '5-15%',
                priority: 'low'
            });
        }
        
        return recommendations;
    }
};
```

### 5.2 Surface Finish Reference Values

| Finish Grade | Ra (μm) | Ra (μin) | Typical Applications |
|--------------|---------|----------|---------------------|
| N1 | 0.025 | 1 | Gage blocks, mirrors |
| N2 | 0.05 | 2 | Precision bearings |
| N3 | 0.1 | 4 | Hydraulic seals |
| N4 | 0.2 | 8 | Precision shafts |
| N5 | 0.4 | 16 | Bearing journals |
| N6 | 0.8 | 32 | Gear teeth |
| N7 | 1.6 | 63 | General machined |
| N8 | 3.2 | 125 | Structural surfaces |
| N9 | 6.3 | 250 | Rough machined |
| N10 | 12.5 | 500 | Cast surfaces |

---



## Section 6: Cycle Time Calculator

### 6.1 Cycle Time Calculator Implementation

```javascript
/**
 * PRISM_CYCLE_TIME_CALCULATOR
 * 
 * Comprehensive cycle time estimation including:
 * - Cutting time (material removal)
 * - Rapid traverse time
 * - Tool change time
 * - Dwell and positioning time
 * - Setup and load/unload time
 * 
 * Implements 6+ Source Rule with machine dynamics
 */
const PRISM_CYCLE_TIME_CALCULATOR = {
    ...PRISM_CALCULATOR_BASE,
    
    name: 'Cycle Time Calculator',
    version: '9.0.0',
    
    /**
     * Main calculation entry point
     */
    async calculate(input) {
        this._validateSources();
        await this.init();
        
        // SOURCE 1: Machine capabilities
        const machine = await this._getMachineData(input);
        
        // SOURCE 2: Toolpath analysis
        const toolpath = this._analyzeToolpath(input);
        
        // SOURCE 3: Operation parameters
        const operations = await this._analyzeOperations(input);
        
        // SOURCE 4: Physics-based dynamics
        const dynamics = this._calculateDynamics(input, machine);
        
        // SOURCE 5: Historical job data
        const historical = await this._getHistoricalTimes(input);
        
        // SOURCE 6: AI optimization
        const aiOptimization = await this._getAIOptimization(input);
        
        // Calculate all time components
        const times = this._calculateAllTimes({
            machine,
            toolpath,
            operations,
            dynamics,
            historical,
            aiOptimization
        }, input);
        
        return this._createTimeOutput(times, input);
    },
    
    /**
     * Get machine dynamic capabilities
     */
    async _getMachineData(input) {
        const machine = await PRISM_GATEWAY.request('machines.get', {
            id: input.machine?.id
        });
        
        return {
            rapid_rate: {
                x: machine.rapid_x || 30000, // mm/min
                y: machine.rapid_y || 30000,
                z: machine.rapid_z || 24000
            },
            acceleration: {
                x: machine.accel_x || 3000, // mm/s²
                y: machine.accel_y || 3000,
                z: machine.accel_z || 2000
            },
            jerk: {
                x: machine.jerk_x || 50000, // mm/s³
                y: machine.jerk_y || 50000,
                z: machine.jerk_z || 40000
            },
            tool_change_time: machine.tool_change_time || 4, // seconds
            spindle_accel_time: machine.spindle_accel_time || 2, // seconds to max RPM
            spindle_orient_time: machine.spindle_orient_time || 0.5,
            pallet_change_time: machine.pallet_change_time || 15, // if applicable
            rotary_speed: machine.rotary_speed || 20, // degrees/sec
            controller_lookahead: machine.lookahead || 100 // blocks
        };
    },
    
    /**
     * Analyze toolpath for time estimation
     */
    _analyzeToolpath(input) {
        const toolpath = input.toolpath || {};
        
        // If raw toolpath data available
        if (toolpath.points) {
            return this._analyzeToolpathPoints(toolpath.points);
        }
        
        // Otherwise use summary data
        return {
            cutting_distance: toolpath.cutting_distance || 0,
            rapid_distance: toolpath.rapid_distance || 0,
            tool_changes: toolpath.tool_changes || 0,
            operations: toolpath.operations || [],
            total_blocks: toolpath.block_count || 0,
            arc_moves: toolpath.arc_count || 0,
            linear_moves: toolpath.linear_count || 0
        };
    },
    
    /**
     * Detailed toolpath point analysis
     */
    _analyzeToolpathPoints(points) {
        let cutting_distance = 0;
        let rapid_distance = 0;
        let arc_count = 0;
        let linear_count = 0;
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (curr.type === 'rapid' || curr.type === 'G0') {
                rapid_distance += distance;
            } else {
                cutting_distance += distance;
                if (curr.type === 'arc' || curr.type === 'G2' || curr.type === 'G3') {
                    arc_count++;
                } else {
                    linear_count++;
                }
            }
        }
        
        return {
            cutting_distance,
            rapid_distance,
            tool_changes: 0, // Count from operations
            arc_moves: arc_count,
            linear_moves: linear_count,
            total_blocks: points.length
        };
    },
    
    /**
     * Analyze individual operations
     */
    async _analyzeOperations(input) {
        const operations = input.operations || [];
        const analyzed = [];
        
        for (const op of operations) {
            const opData = {
                name: op.name,
                type: op.type,
                tool_id: op.tool_id,
                cutting_time: 0,
                rapid_time: 0,
                approach_time: 0
            };
            
            // Calculate based on operation type
            switch (op.type) {
                case 'face':
                    opData.cutting_time = this._calculateFaceTime(op);
                    break;
                case 'rough':
                case 'rough_pocket':
                case 'rough_profile':
                    opData.cutting_time = this._calculateRoughTime(op);
                    break;
                case 'finish':
                case 'finish_profile':
                case 'finish_pocket':
                    opData.cutting_time = this._calculateFinishTime(op);
                    break;
                case 'drill':
                case 'peck_drill':
                    opData.cutting_time = this._calculateDrillTime(op);
                    break;
                case 'tap':
                    opData.cutting_time = this._calculateTapTime(op);
                    break;
                case 'bore':
                    opData.cutting_time = this._calculateBoreTime(op);
                    break;
                case 'thread':
                    opData.cutting_time = this._calculateThreadTime(op);
                    break;
            }
            
            analyzed.push(opData);
        }
        
        return analyzed;
    },
    
    /**
     * Calculate facing operation time
     */
    _calculateFaceTime(op) {
        const width = op.width || 100; // mm
        const length = op.length || 100;
        const stepover = op.stepover || 0.7; // % of tool diameter
        const toolDia = op.tool_diameter || 50;
        const feedrate = op.feed_rate || 1000; // mm/min
        
        const effectiveStepover = toolDia * stepover;
        const passes = Math.ceil(width / effectiveStepover);
        const totalDistance = passes * length;
        
        return (totalDistance / feedrate) * 60; // seconds
    },
    
    /**
     * Calculate roughing time (volumetric)
     */
    _calculateRoughTime(op) {
        // Volume-based estimation
        const volume = op.volume || 0; // mm³
        const mrr = op.mrr || 50000; // mm³/min (material removal rate)
        
        if (volume && mrr) {
            return (volume / mrr) * 60; // seconds
        }
        
        // Distance-based fallback
        const distance = op.cutting_distance || 0;
        const feedrate = op.feed_rate || 800;
        return (distance / feedrate) * 60;
    },
    
    /**
     * Calculate finishing time
     */
    _calculateFinishTime(op) {
        const distance = op.cutting_distance || 0;
        const feedrate = op.feed_rate || 1500; // Typically faster than rough
        return (distance / feedrate) * 60;
    },
    
    /**
     * Calculate drilling time
     */
    _calculateDrillTime(op) {
        const depth = op.depth || 20;
        const feed = op.feed_rate || 200; // mm/min
        const retractRate = op.rapid_rate || 5000;
        const pecks = op.pecks || 1;
        
        // Drill down time
        const drillTime = (depth / feed) * 60;
        
        // Peck retract time
        const peckRetractTime = pecks > 1 ? 
            ((depth / pecks) * (pecks - 1) / retractRate) * 60 : 0;
        
        // Final retract
        const retractTime = (depth / retractRate) * 60;
        
        return drillTime + peckRetractTime + retractTime;
    },
    
    /**
     * Calculate tapping time
     */
    _calculateTapTime(op) {
        const depth = op.depth || 15;
        const pitch = op.pitch || 1.5;
        const rpm = op.rpm || 500;
        
        // Feed = pitch × RPM for rigid tapping
        const feedrate = pitch * rpm; // mm/min
        
        // Down and back up at same rate
        const tapTime = (depth / feedrate) * 60 * 2;
        
        return tapTime;
    },
    
    /**
     * Calculate boring time
     */
    _calculateBoreTime(op) {
        const depth = op.depth || 25;
        const feed = op.feed_rate || 100;
        const retractRate = op.rapid_rate || 3000;
        
        return ((depth / feed) + (depth / retractRate)) * 60;
    },
    
    /**
     * Calculate threading time
     */
    _calculateThreadTime(op) {
        const length = op.length || 20;
        const pitch = op.pitch || 1.5;
        const passes = op.passes || 6; // Spring passes
        const rpm = op.rpm || 400;
        
        const feedrate = pitch * rpm;
        const passTime = (length / feedrate) * 60;
        
        return passTime * passes * 2; // In and out each pass
    },
    
    /**
     * Calculate machine dynamics effects
     */
    _calculateDynamics(input, machine) {
        // Acceleration/deceleration time overhead
        const accel = machine.acceleration;
        const rapid = machine.rapid_rate;
        
        // Time to reach rapid speed (simplified)
        const accelTimeX = (rapid.x / 60) / accel.x;
        const accelTimeY = (rapid.y / 60) / accel.y;
        const accelTimeZ = (rapid.z / 60) / accel.z;
        
        // Corner slowdown estimation
        const cornerFactor = input.toolpath?.arc_moves ? 
            1 + (input.toolpath.arc_moves * 0.001) : 1.0;
        
        // Block processing overhead
        const blockTime = 0.001; // ~1ms per block typical
        const blockOverhead = (input.toolpath?.total_blocks || 1000) * blockTime;
        
        return {
            accel_overhead: Math.max(accelTimeX, accelTimeY, accelTimeZ),
            corner_factor: cornerFactor,
            block_processing: blockOverhead,
            lookahead_effect: machine.controller_lookahead > 50 ? 0.95 : 1.05
        };
    },
    
    /**
     * Historical cycle time data
     */
    async _getHistoricalTimes(input) {
        const similar = await PRISM_GATEWAY.request('learning.similar_jobs', {
            part_family: input.part_family,
            material: input.material?.id,
            machine: input.machine?.id,
            volume_range: input.part_volume ? 
                [input.part_volume * 0.7, input.part_volume * 1.3] : null,
            limit: 10
        });
        
        if (!similar || similar.length === 0) {
            return { cycle_time: null, confidence: 0 };
        }
        
        const times = similar.map(s => s.actual_cycle_time).filter(t => t);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        
        return {
            cycle_time: avgTime,
            sample_size: times.length,
            confidence: Math.min(0.85, 0.4 + (times.length / 25))
        };
    },
    
    /**
     * AI cycle time optimization
     */
    async _getAIOptimization(input) {
        const optimization = await PRISM_GATEWAY.request('ai.optimize_cycle', {
            operations: input.operations,
            machine: input.machine?.id,
            current_estimate: input.preliminary_time
        });
        
        return {
            optimized_time: optimization.predicted_time,
            savings_potential: optimization.potential_reduction,
            recommendations: optimization.suggestions,
            confidence: optimization.confidence || 0.7
        };
    },
    
    /**
     * Calculate all time components
     */
    _calculateAllTimes(sources, input) {
        const { machine, toolpath, operations, dynamics } = sources;
        
        // Cutting time from operations
        let cuttingTime = operations.reduce((sum, op) => sum + op.cutting_time, 0);
        
        // Apply dynamics factors
        cuttingTime *= dynamics.corner_factor;
        cuttingTime *= dynamics.lookahead_effect;
        
        // Rapid time
        const rapidDistance = toolpath.rapid_distance || 
            (input.operations?.length || 1) * 200; // Estimate 200mm avg rapid per op
        const avgRapidRate = (machine.rapid_rate.x + machine.rapid_rate.y + machine.rapid_rate.z) / 3;
        let rapidTime = (rapidDistance / avgRapidRate) * 60;
        rapidTime += dynamics.accel_overhead * (input.operations?.length || 1);
        
        // Tool change time
        const toolChanges = toolpath.tool_changes || (input.tools?.length || 1) - 1;
        const toolChangeTime = toolChanges * machine.tool_change_time;
        
        // Spindle time (start, stop, speed changes)
        const spindleChanges = input.spindle_changes || toolChanges + 1;
        const spindleTime = spindleChanges * machine.spindle_accel_time;
        
        // Dwell time (if any specified)
        const dwellTime = input.total_dwell || 0;
        
        // Block processing overhead
        const processingTime = dynamics.block_processing;
        
        // Sum all non-cutting time
        const nonCuttingTime = rapidTime + toolChangeTime + spindleTime + 
                               dwellTime + processingTime;
        
        // Total machining time
        const machiningTime = cuttingTime + nonCuttingTime;
        
        // Setup time (separate from cycle)
        const setupTime = input.setup_time || this._estimateSetupTime(input);
        
        // Load/unload time
        const loadUnloadTime = input.load_unload_time || 30; // seconds typical
        
        return {
            cutting: cuttingTime,
            rapid: rapidTime,
            tool_change: toolChangeTime,
            spindle: spindleTime,
            dwell: dwellTime,
            processing: processingTime,
            non_cutting: nonCuttingTime,
            machining: machiningTime,
            setup: setupTime,
            load_unload: loadUnloadTime,
            total_cycle: machiningTime + loadUnloadTime
        };
    },
    
    /**
     * Estimate setup time
     */
    _estimateSetupTime(input) {
        let setup = 300; // Base 5 minutes
        
        // Add for fixtures
        const fixtures = input.fixtures || 1;
        setup += fixtures * 120; // 2 min per fixture
        
        // Add for tools
        const tools = input.tools?.length || 5;
        setup += tools * 60; // 1 min per tool
        
        // Add for first article inspection
        if (input.first_article) {
            setup += 600; // 10 min for inspection
        }
        
        return setup;
    },
    
    /**
     * Create comprehensive output
     */
    _createTimeOutput(times, input) {
        // Calculate efficiency metrics
        const cuttingEfficiency = times.cutting / times.machining * 100;
        
        // Parts per hour
        const partsPerHour = 3600 / times.total_cycle;
        
        // Format times for display
        const formatTime = (seconds) => ({
            seconds: Math.round(seconds * 10) / 10,
            minutes: Math.round(seconds / 6) / 10,
            formatted: `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
        });
        
        return {
            cycle_time: {
                total: formatTime(times.total_cycle),
                machining: formatTime(times.machining),
                cutting: formatTime(times.cutting),
                non_cutting: formatTime(times.non_cutting)
            },
            breakdown: {
                cutting: formatTime(times.cutting),
                rapid: formatTime(times.rapid),
                tool_change: formatTime(times.tool_change),
                spindle: formatTime(times.spindle),
                dwell: formatTime(times.dwell),
                processing: formatTime(times.processing),
                load_unload: formatTime(times.load_unload)
            },
            setup_time: formatTime(times.setup),
            efficiency: {
                cutting_percentage: Math.round(cuttingEfficiency * 10) / 10,
                non_productive_percentage: Math.round((100 - cuttingEfficiency) * 10) / 10,
                utilization_rating: cuttingEfficiency > 70 ? 'excellent' :
                                   cuttingEfficiency > 50 ? 'good' :
                                   cuttingEfficiency > 30 ? 'fair' : 'poor'
            },
            production: {
                parts_per_hour: Math.round(partsPerHour * 10) / 10,
                parts_per_shift: Math.round(partsPerHour * 7.5), // 7.5 hr shift
                parts_per_day: Math.round(partsPerHour * 22.5) // 3 shifts
            },
            confidence: 0.8, // Based on source quality
            timestamp: new Date().toISOString()
        };
    }
};
```

### 6.2 Cycle Time Components Reference

| Component | Typical Range | Optimization Target |
|-----------|---------------|---------------------|
| Cutting Time | 30-70% of cycle | Maximize (productive) |
| Rapid Time | 5-15% | Minimize rapid distances |
| Tool Change | 3-10% | Reduce tool count, organize |
| Spindle Time | 2-5% | Minimize speed changes |
| Load/Unload | 5-20% | Automation, fixtures |
| Positioning | 2-8% | Optimize approach paths |

---



## Section 7: Cost Estimator

### 7.1 Job Cost Calculator Implementation

```javascript
/**
 * PRISM_COST_ESTIMATOR
 * 
 * Comprehensive cost estimation including:
 * - Machine time costs
 * - Tool costs (wear, replacement)
 * - Material costs
 * - Labor costs
 * - Overhead allocation
 * - Profit margin calculation
 * 
 * Implements 6+ Source Rule for accurate costing
 */
const PRISM_COST_ESTIMATOR = {
    ...PRISM_CALCULATOR_BASE,
    
    name: 'Cost Estimator',
    version: '9.0.0',
    
    /**
     * Main calculation entry point
     */
    async calculate(input) {
        this._validateSources();
        await this.init();
        
        // SOURCE 1: Machine rate database
        const machineRates = await this._getMachineRates(input);
        
        // SOURCE 2: Tool cost database
        const toolCosts = await this._getToolCosts(input);
        
        // SOURCE 3: Material pricing
        const materialCosts = await this._getMaterialCosts(input);
        
        // SOURCE 4: Labor rates
        const laborRates = await this._getLaborRates(input);
        
        // SOURCE 5: Historical job costs
        const historical = await this._getHistoricalCosts(input);
        
        // SOURCE 6: AI cost optimization
        const aiAnalysis = await this._getAIAnalysis(input);
        
        // Calculate all cost components
        const costs = this._calculateAllCosts({
            machineRates,
            toolCosts,
            materialCosts,
            laborRates,
            historical,
            aiAnalysis
        }, input);
        
        return this._createCostOutput(costs, input);
    },
    
    /**
     * Get machine hourly rates
     */
    async _getMachineRates(input) {
        const machine = await PRISM_GATEWAY.request('machines.get', {
            id: input.machine?.id
        });
        
        // Get shop-specific or default rates
        const rates = await PRISM_GATEWAY.request('cost.machine_rates', {
            machine_id: input.machine?.id,
            shop_id: input.shop_id
        });
        
        return {
            // Direct costs
            hourly_rate: rates.hourly_rate || this._defaultMachineRate(machine),
            setup_rate: rates.setup_rate || rates.hourly_rate * 0.5,
            
            // Component breakdown
            depreciation: rates.depreciation_per_hour || 15,
            maintenance: rates.maintenance_per_hour || 8,
            power: rates.power_per_hour || 5,
            consumables: rates.consumables_per_hour || 3,
            
            // Machine type factor
            type_factor: this._getMachineTypeFactor(machine),
            
            // Capability premium
            capability_premium: machine.axes > 3 ? 1.3 : 1.0
        };
    },
    
    /**
     * Default machine rate by type
     */
    _defaultMachineRate(machine) {
        const baseRates = {
            'manual_mill': 35,
            'manual_lathe': 30,
            'cnc_mill_3axis': 65,
            'cnc_mill_4axis': 85,
            'cnc_mill_5axis': 125,
            'cnc_lathe_2axis': 55,
            'cnc_lathe_live': 95,
            'cnc_swiss': 110,
            'cnc_turn_mill': 135,
            'wire_edm': 75,
            'sinker_edm': 70,
            'surface_grinder': 55,
            'cylindrical_grinder': 65,
            'laser': 85,
            'waterjet': 70
        };
        
        const type = machine.type || 'cnc_mill_3axis';
        return baseRates[type] || 65;
    },
    
    /**
     * Machine type cost factor
     */
    _getMachineTypeFactor(machine) {
        const factors = {
            'swiss': 1.4,
            'turn_mill': 1.3,
            '5axis': 1.5,
            '4axis': 1.2,
            '3axis': 1.0,
            'edm': 1.1,
            'grinder': 1.0
        };
        
        return factors[machine.type] || 1.0;
    },
    
    /**
     * Calculate tool costs
     */
    async _getToolCosts(input) {
        const tools = input.tools || [];
        const toolCosts = [];
        
        for (const tool of tools) {
            const toolData = await PRISM_GATEWAY.request('tools.get', {
                id: tool.id
            });
            
            // Tool cost per edge/life
            const costPerEdge = toolData.cost / (toolData.edges || 1);
            
            // Estimated usage for this job
            const toolLife = tool.expected_life || 30; // minutes
            const useTime = tool.cutting_time || 10; // minutes
            const edgesUsed = useTime / toolLife;
            
            toolCosts.push({
                tool_id: tool.id,
                name: toolData.name,
                cost_per_edge: costPerEdge,
                edges_used: edgesUsed,
                total_cost: costPerEdge * edgesUsed,
                holder_wear: (toolData.holder_cost || 200) * 0.001 * useTime // Amortize
            });
        }
        
        return {
            tools: toolCosts,
            total: toolCosts.reduce((sum, t) => sum + t.total_cost + t.holder_wear, 0),
            per_part: toolCosts.reduce((sum, t) => sum + t.total_cost + t.holder_wear, 0) / (input.quantity || 1)
        };
    },
    
    /**
     * Calculate material costs
     */
    async _getMaterialCosts(input) {
        const material = await PRISM_GATEWAY.request('materials.get', {
            id: input.material?.id
        });
        
        // Get current pricing
        const pricing = await PRISM_GATEWAY.request('cost.material_pricing', {
            material_id: input.material?.id,
            form: input.stock?.form || 'bar'
        });
        
        // Calculate stock volume/weight
        const stockVolume = this._calculateStockVolume(input.stock);
        const stockWeight = stockVolume * (material.density || 7.85) / 1000; // kg
        
        // Calculate material cost
        const pricePerKg = pricing.price_per_kg || this._defaultMaterialPrice(material);
        const rawCost = stockWeight * pricePerKg;
        
        // Add cutting/prep charges
        const cutCharge = pricing.cut_charge || 5;
        const certCharge = input.requires_cert ? (pricing.cert_charge || 15) : 0;
        
        // Scrap value (if applicable)
        const partVolume = input.part?.volume || stockVolume * 0.3;
        const chipWeight = stockWeight * (1 - partVolume / stockVolume);
        const scrapValue = chipWeight * (pricing.scrap_price || pricePerKg * 0.1);
        
        return {
            stock: {
                form: input.stock?.form,
                dimensions: input.stock?.dimensions,
                volume: stockVolume,
                weight: stockWeight
            },
            pricing: {
                price_per_kg: pricePerKg,
                raw_cost: rawCost,
                cut_charge: cutCharge,
                cert_charge: certCharge,
                total: rawCost + cutCharge + certCharge
            },
            scrap: {
                weight: chipWeight,
                value: scrapValue
            },
            net_cost: rawCost + cutCharge + certCharge - scrapValue
        };
    },
    
    /**
     * Calculate stock volume from dimensions
     */
    _calculateStockVolume(stock) {
        if (!stock) return 1000; // Default 1000 mm³
        
        const form = stock.form || 'block';
        const dims = stock.dimensions || {};
        
        switch (form) {
            case 'bar':
            case 'round':
                const diameter = dims.diameter || 25;
                const length = dims.length || 100;
                return Math.PI * Math.pow(diameter / 2, 2) * length;
                
            case 'block':
            case 'plate':
                const x = dims.x || dims.length || 100;
                const y = dims.y || dims.width || 100;
                const z = dims.z || dims.height || 25;
                return x * y * z;
                
            case 'tube':
                const od = dims.od || 50;
                const id = dims.id || 40;
                const len = dims.length || 100;
                return Math.PI * (Math.pow(od / 2, 2) - Math.pow(id / 2, 2)) * len;
                
            default:
                return 1000;
        }
    },
    
    /**
     * Default material price per kg
     */
    _defaultMaterialPrice(material) {
        const basePrices = {
            'carbon_steel': 1.50,
            'alloy_steel': 2.50,
            'stainless_steel': 5.00,
            'tool_steel': 8.00,
            'aluminum': 4.00,
            'aluminum_7075': 8.00,
            'brass': 7.00,
            'bronze': 9.00,
            'copper': 10.00,
            'titanium': 35.00,
            'inconel': 45.00,
            'hastelloy': 55.00,
            'plastic': 3.00,
            'peek': 100.00
        };
        
        const type = material.type || material.category || 'carbon_steel';
        return basePrices[type] || 3.00;
    },
    
    /**
     * Get labor rates
     */
    async _getLaborRates(input) {
        const rates = await PRISM_GATEWAY.request('cost.labor_rates', {
            shop_id: input.shop_id,
            skill_level: input.skill_level || 'machinist'
        });
        
        return {
            // Loaded rates (including benefits, overhead)
            setup_rate: rates.setup_rate || 45, // $/hour
            run_rate: rates.run_rate || 35, // $/hour
            inspection_rate: rates.inspection_rate || 40,
            programming_rate: rates.programming_rate || 65,
            
            // Time estimates
            setup_time: input.setup_time || 0.5, // hours
            run_time: (input.cycle_time || 300) * (input.quantity || 1) / 3600, // hours
            inspection_time: input.inspection_time || 0.25,
            programming_time: input.programming_time || 0, // Often amortized
            
            // Attendance factor (breaks, meetings, etc.)
            attendance_factor: 0.85
        };
    },
    
    /**
     * Historical cost data
     */
    async _getHistoricalCosts(input) {
        const similar = await PRISM_GATEWAY.request('learning.similar_quotes', {
            part_family: input.part_family,
            material: input.material?.id,
            complexity: input.complexity_score,
            volume_range: input.part?.volume ? 
                [input.part.volume * 0.7, input.part.volume * 1.3] : null,
            limit: 15
        });
        
        if (!similar || similar.length === 0) {
            return { cost_per_part: null, confidence: 0 };
        }
        
        // Analyze historical costs
        const costs = similar.map(s => s.actual_cost_per_part).filter(c => c);
        const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        
        return {
            cost_per_part: avgCost,
            sample_size: costs.length,
            min: Math.min(...costs),
            max: Math.max(...costs),
            confidence: Math.min(0.85, 0.4 + (costs.length / 30))
        };
    },
    
    /**
     * AI cost analysis
     */
    async _getAIAnalysis(input) {
        const analysis = await PRISM_GATEWAY.request('ai.cost_analysis', {
            part: input.part,
            material: input.material?.id,
            operations: input.operations,
            quantity: input.quantity
        });
        
        return {
            predicted_cost: analysis.predicted_cost,
            cost_drivers: analysis.primary_cost_drivers,
            optimization_opportunities: analysis.savings_opportunities,
            confidence: analysis.confidence || 0.7
        };
    },
    
    /**
     * Calculate all cost components
     */
    _calculateAllCosts(sources, input) {
        const { machineRates, toolCosts, materialCosts, laborRates } = sources;
        const quantity = input.quantity || 1;
        
        // Machine time cost
        const cycleTime = input.cycle_time || 300; // seconds
        const machineTimeHours = (cycleTime * quantity) / 3600;
        const machineCost = machineTimeHours * machineRates.hourly_rate;
        
        // Setup cost (amortized over quantity)
        const setupHours = laborRates.setup_time;
        const setupCost = setupHours * (machineRates.setup_rate + laborRates.setup_rate);
        const setupPerPart = setupCost / quantity;
        
        // Labor cost
        const laborCost = laborRates.run_time * laborRates.run_rate * laborRates.attendance_factor;
        
        // Tool cost (already calculated)
        const toolCostTotal = toolCosts.total;
        
        // Material cost
        const materialCostTotal = materialCosts.net_cost * quantity;
        
        // Inspection cost
        const inspectionCost = laborRates.inspection_time * laborRates.inspection_rate;
        
        // Programming cost (if not yet amortized)
        const programmingCost = laborRates.programming_time * laborRates.programming_rate;
        const programmingPerPart = programmingCost / quantity;
        
        // Sum direct costs
        const directCosts = machineCost + laborCost + toolCostTotal + 
                           materialCostTotal + inspectionCost;
        
        // Overhead allocation
        const overheadRate = input.overhead_rate || 0.25; // 25% typical
        const overhead = directCosts * overheadRate;
        
        // Total cost
        const totalCost = directCosts + overhead + setupCost + programmingCost;
        
        // Per part cost
        const costPerPart = totalCost / quantity;
        
        return {
            machine: {
                time_hours: machineTimeHours,
                rate: machineRates.hourly_rate,
                cost: machineCost
            },
            setup: {
                time_hours: setupHours,
                cost: setupCost,
                per_part: setupPerPart
            },
            labor: {
                time_hours: laborRates.run_time,
                rate: laborRates.run_rate,
                cost: laborCost
            },
            tooling: {
                details: toolCosts.tools,
                total: toolCostTotal,
                per_part: toolCosts.per_part
            },
            material: {
                gross: materialCosts.pricing.total * quantity,
                scrap_credit: materialCosts.scrap.value * quantity,
                net: materialCostTotal,
                per_part: materialCosts.net_cost
            },
            inspection: {
                time_hours: laborRates.inspection_time,
                cost: inspectionCost
            },
            programming: {
                time_hours: laborRates.programming_time,
                cost: programmingCost,
                per_part: programmingPerPart
            },
            overhead: {
                rate: overheadRate,
                amount: overhead
            },
            totals: {
                direct: directCosts,
                indirect: overhead + setupCost + programmingCost,
                total: totalCost,
                per_part: costPerPart
            }
        };
    },
    
    /**
     * Create comprehensive output with pricing
     */
    _createCostOutput(costs, input) {
        const quantity = input.quantity || 1;
        
        // Calculate margins and pricing
        const targetMargin = input.target_margin || 0.30; // 30%
        const sellingPrice = costs.totals.per_part / (1 - targetMargin);
        const profit = sellingPrice - costs.totals.per_part;
        
        // Break-even analysis
        const fixedCosts = costs.setup.cost + costs.programming.cost;
        const variableCostPerPart = costs.totals.per_part - (fixedCosts / quantity);
        const breakEvenQty = Math.ceil(fixedCosts / (sellingPrice - variableCostPerPart));
        
        // Cost breakdown percentages
        const breakdown = {
            machine: (costs.machine.cost / costs.totals.total) * 100,
            labor: (costs.labor.cost / costs.totals.total) * 100,
            tooling: (costs.tooling.total / costs.totals.total) * 100,
            material: (costs.material.net / costs.totals.total) * 100,
            setup: (costs.setup.cost / costs.totals.total) * 100,
            overhead: (costs.overhead.amount / costs.totals.total) * 100
        };
        
        return {
            summary: {
                cost_per_part: Math.round(costs.totals.per_part * 100) / 100,
                total_cost: Math.round(costs.totals.total * 100) / 100,
                suggested_price: Math.round(sellingPrice * 100) / 100,
                profit_per_part: Math.round(profit * 100) / 100,
                margin: targetMargin * 100
            },
            breakdown: {
                machine: costs.machine,
                setup: costs.setup,
                labor: costs.labor,
                tooling: costs.tooling,
                material: costs.material,
                inspection: costs.inspection,
                programming: costs.programming,
                overhead: costs.overhead
            },
            percentages: {
                machine: Math.round(breakdown.machine * 10) / 10,
                labor: Math.round(breakdown.labor * 10) / 10,
                tooling: Math.round(breakdown.tooling * 10) / 10,
                material: Math.round(breakdown.material * 10) / 10,
                setup: Math.round(breakdown.setup * 10) / 10,
                overhead: Math.round(breakdown.overhead * 10) / 10
            },
            economics: {
                break_even_quantity: breakEvenQty,
                fixed_costs: Math.round(fixedCosts * 100) / 100,
                variable_cost_per_part: Math.round(variableCostPerPart * 100) / 100,
                quantity: quantity
            },
            quantity_pricing: this._generateQuantityBreaks(costs, input),
            confidence: 0.8,
            currency: input.currency || 'USD',
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Generate quantity break pricing
     */
    _generateQuantityBreaks(costs, input) {
        const quantities = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
        const fixedCosts = costs.setup.cost + costs.programming.cost;
        const variableCost = costs.totals.total - fixedCosts;
        const targetMargin = input.target_margin || 0.30;
        
        return quantities.map(qty => {
            const totalCost = fixedCosts + (variableCost * qty / (input.quantity || 1));
            const costPerPart = totalCost / qty;
            const price = costPerPart / (1 - targetMargin);
            
            return {
                quantity: qty,
                cost_per_part: Math.round(costPerPart * 100) / 100,
                price_per_part: Math.round(price * 100) / 100,
                total_price: Math.round(price * qty * 100) / 100
            };
        });
    }
};
```

### 7.2 Cost Components Reference

| Cost Element | Typical % | Optimization Strategy |
|--------------|-----------|----------------------|
| Machine Time | 25-40% | Reduce cycle time, increase utilization |
| Labor | 15-30% | Automation, efficient setup |
| Material | 15-35% | Material optimization, nesting |
| Tooling | 5-15% | Tool life optimization, proper selection |
| Setup | 10-25% | Fixture design, quick-change systems |
| Overhead | 15-30% | Shop efficiency, capacity utilization |

---



## Section 8: Calculator Integration Patterns

### 8.1 Calculator Chain Pattern

```javascript
/**
 * PRISM_CALCULATOR_CHAIN
 * 
 * Chains multiple calculators for comprehensive analysis.
 * Output from one calculator feeds into the next.
 */
const PRISM_CALCULATOR_CHAIN = {
    
    /**
     * Execute full machining analysis chain
     */
    async analyzeComplete(input) {
        const results = {};
        
        // Step 1: Speed & Feed Calculation
        console.log('Step 1: Calculating speeds and feeds...');
        results.speedFeed = await PRISM_SPEED_FEED_CALCULATOR.calculate(input);
        
        // Enrich input with calculated values
        const enrichedInput = {
            ...input,
            cutting_speed: results.speedFeed.speed.value,
            rpm: results.speedFeed.rpm.value,
            feed_per_tooth: results.speedFeed.feed_per_tooth.value,
            feed_rate: results.speedFeed.feed_rate.value,
            depth_of_cut: results.speedFeed.depth_of_cut.value,
            mrr: results.speedFeed.mrr.value
        };
        
        // Step 2: Force Calculation
        console.log('Step 2: Calculating cutting forces...');
        results.forces = await PRISM_FORCE_CALCULATOR.calculate(enrichedInput);
        
        // Add force data
        enrichedInput.cutting_force = results.forces.Fc.value;
        enrichedInput.power_required = results.forces.power.value;
        
        // Step 3: Tool Life Prediction
        console.log('Step 3: Predicting tool life...');
        results.toolLife = await PRISM_TOOL_LIFE_CALCULATOR.calculate(enrichedInput);
        
        // Add tool life to operations
        enrichedInput.tool_life = results.toolLife.life_minutes.value;
        
        // Step 4: Surface Finish Estimation
        console.log('Step 4: Estimating surface finish...');
        results.surfaceFinish = await PRISM_SURFACE_FINISH_CALCULATOR.calculate(enrichedInput);
        
        // Step 5: Cycle Time Calculation
        console.log('Step 5: Calculating cycle time...');
        results.cycleTime = await PRISM_CYCLE_TIME_CALCULATOR.calculate(enrichedInput);
        
        // Add cycle time
        enrichedInput.cycle_time = results.cycleTime.cycle_time.total.seconds;
        
        // Step 6: Cost Estimation
        console.log('Step 6: Estimating costs...');
        results.cost = await PRISM_COST_ESTIMATOR.calculate(enrichedInput);
        
        // Compile final report
        return this._compileReport(results, input);
    },
    
    /**
     * Compile comprehensive report
     */
    _compileReport(results, input) {
        return {
            summary: {
                operation: input.operation?.type || 'machining',
                material: input.material?.name || input.material?.id,
                tool: input.tool?.name || input.tool?.id,
                machine: input.machine?.name || input.machine?.id
            },
            
            cutting_parameters: {
                speed: results.speedFeed.speed,
                rpm: results.speedFeed.rpm,
                feed_rate: results.speedFeed.feed_rate,
                depth_of_cut: results.speedFeed.depth_of_cut,
                width_of_cut: results.speedFeed.width_of_cut
            },
            
            process_data: {
                cutting_force: results.forces.Fc,
                power_required: results.forces.power,
                torque: results.forces.torque,
                mrr: results.speedFeed.mrr
            },
            
            tool_performance: {
                expected_life: results.toolLife.life_minutes,
                wear_mode: results.toolLife.wear_mode,
                cost_per_edge: results.toolLife.economics.tool_cost_per_min
            },
            
            quality: {
                surface_finish: results.surfaceFinish.surface_finish,
                achievable: results.surfaceFinish.achievable,
                recommendations: results.surfaceFinish.recommendations
            },
            
            time: {
                cycle_time: results.cycleTime.cycle_time,
                breakdown: results.cycleTime.breakdown,
                efficiency: results.cycleTime.efficiency
            },
            
            cost: {
                per_part: results.cost.summary.cost_per_part,
                suggested_price: results.cost.summary.suggested_price,
                breakdown: results.cost.percentages
            },
            
            confidence: {
                overall: this._calculateOverallConfidence(results),
                by_calculator: {
                    speed_feed: results.speedFeed.confidence,
                    forces: results.forces.confidence,
                    tool_life: results.toolLife.confidence,
                    surface_finish: results.surfaceFinish.confidence,
                    cycle_time: results.cycleTime.confidence,
                    cost: results.cost.confidence
                }
            },
            
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Calculate overall confidence
     */
    _calculateOverallConfidence(results) {
        const confidences = [
            results.speedFeed.confidence,
            results.forces.confidence,
            results.toolLife.confidence,
            results.surfaceFinish.confidence,
            results.cycleTime.confidence,
            results.cost.confidence
        ];
        
        // Geometric mean for overall confidence
        const product = confidences.reduce((a, b) => a * b, 1);
        return Math.pow(product, 1 / confidences.length);
    }
};
```

### 8.2 Parallel Calculation Pattern

```javascript
/**
 * PRISM_PARALLEL_CALCULATOR
 * 
 * Runs independent calculations in parallel for speed.
 */
const PRISM_PARALLEL_CALCULATOR = {
    
    /**
     * Calculate multiple scenarios in parallel
     */
    async compareScenarios(baseInput, variations) {
        const scenarios = variations.map(v => ({
            ...baseInput,
            ...v
        }));
        
        // Run all calculations in parallel
        const results = await Promise.all(
            scenarios.map(async (scenario, index) => ({
                scenario_id: index,
                name: variations[index].name || `Scenario ${index + 1}`,
                input: scenario,
                result: await PRISM_CALCULATOR_CHAIN.analyzeComplete(scenario)
            }))
        );
        
        // Rank scenarios
        return this._rankScenarios(results);
    },
    
    /**
     * Rank scenarios by criteria
     */
    _rankScenarios(results) {
        // Score each scenario
        const scored = results.map(r => ({
            ...r,
            scores: {
                cost: 100 - (r.result.cost.per_part / Math.max(...results.map(x => x.result.cost.per_part.value)) * 100),
                time: 100 - (r.result.time.cycle_time.total.seconds / Math.max(...results.map(x => x.result.time.cycle_time.total.seconds)) * 100),
                quality: r.result.confidence.overall * 100,
                tool_life: (r.result.tool_performance.expected_life.value / Math.max(...results.map(x => x.result.tool_performance.expected_life.value)) * 100)
            }
        }));
        
        // Calculate overall score (weighted)
        scored.forEach(s => {
            s.overall_score = 
                s.scores.cost * 0.35 +
                s.scores.time * 0.25 +
                s.scores.quality * 0.20 +
                s.scores.tool_life * 0.20;
        });
        
        // Sort by overall score
        scored.sort((a, b) => b.overall_score - a.overall_score);
        
        return {
            ranked_scenarios: scored,
            best_scenario: scored[0],
            comparison_matrix: this._createComparisonMatrix(scored)
        };
    },
    
    /**
     * Create comparison matrix
     */
    _createComparisonMatrix(scenarios) {
        return scenarios.map(s => ({
            name: s.name,
            cost: s.result.cost.per_part,
            time: s.result.time.cycle_time.total.formatted,
            finish: s.result.quality.surface_finish.Ra.value,
            tool_life: s.result.tool_performance.expected_life.value,
            score: Math.round(s.overall_score)
        }));
    }
};
```

### 8.3 Optimization Pattern

```javascript
/**
 * PRISM_OPTIMIZATION_CALCULATOR
 * 
 * Finds optimal parameters through iterative calculation.
 */
const PRISM_OPTIMIZATION_CALCULATOR = {
    
    /**
     * Optimize for minimum cost
     */
    async optimizeForCost(input, constraints) {
        const speedRange = [
            constraints.min_speed || input.cutting_speed * 0.5,
            constraints.max_speed || input.cutting_speed * 1.5
        ];
        
        const feedRange = [
            constraints.min_feed || input.feed_per_tooth * 0.5,
            constraints.max_feed || input.feed_per_tooth * 1.5
        ];
        
        // Grid search
        const results = [];
        const steps = 10;
        
        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {
                const speed = speedRange[0] + (speedRange[1] - speedRange[0]) * (i / steps);
                const feed = feedRange[0] + (feedRange[1] - feedRange[0]) * (j / steps);
                
                const testInput = {
                    ...input,
                    cutting_speed: speed,
                    feed_per_tooth: feed
                };
                
                try {
                    const result = await PRISM_COST_ESTIMATOR.calculate(testInput);
                    
                    // Check constraints
                    if (this._meetsConstraints(result, constraints)) {
                        results.push({
                            speed,
                            feed,
                            cost: result.summary.cost_per_part,
                            time: result.breakdown.machine.time_hours
                        });
                    }
                } catch (e) {
                    // Skip invalid combinations
                }
            }
        }
        
        // Find minimum cost
        results.sort((a, b) => a.cost - b.cost);
        
        return {
            optimal: results[0],
            alternatives: results.slice(1, 5),
            search_space: {
                speed_range: speedRange,
                feed_range: feedRange,
                points_evaluated: (steps + 1) * (steps + 1),
                valid_points: results.length
            }
        };
    },
    
    /**
     * Check if result meets constraints
     */
    _meetsConstraints(result, constraints) {
        if (constraints.max_cost && result.summary.cost_per_part > constraints.max_cost) {
            return false;
        }
        if (constraints.max_time && result.breakdown.machine.time_hours > constraints.max_time) {
            return false;
        }
        return true;
    },
    
    /**
     * Multi-objective optimization
     */
    async optimizePareto(input, objectives, constraints) {
        // Generate candidate solutions
        const candidates = await this._generateCandidates(input, 100);
        
        // Evaluate all candidates
        const evaluated = await Promise.all(
            candidates.map(async c => ({
                params: c,
                result: await PRISM_CALCULATOR_CHAIN.analyzeComplete(c)
            }))
        );
        
        // Find Pareto front
        const paretoFront = this._findParetoFront(evaluated, objectives);
        
        return {
            pareto_front: paretoFront,
            total_evaluated: evaluated.length,
            objectives: objectives
        };
    },
    
    /**
     * Find Pareto-optimal solutions
     */
    _findParetoFront(solutions, objectives) {
        const dominated = new Set();
        
        for (let i = 0; i < solutions.length; i++) {
            for (let j = 0; j < solutions.length; j++) {
                if (i === j) continue;
                
                if (this._dominates(solutions[j], solutions[i], objectives)) {
                    dominated.add(i);
                    break;
                }
            }
        }
        
        return solutions.filter((_, i) => !dominated.has(i));
    },
    
    /**
     * Check if solution A dominates solution B
     */
    _dominates(a, b, objectives) {
        let dominated = true;
        let strictlyBetter = false;
        
        for (const obj of objectives) {
            const aVal = this._getObjectiveValue(a, obj);
            const bVal = this._getObjectiveValue(b, obj);
            
            if (obj.minimize) {
                if (aVal > bVal) dominated = false;
                if (aVal < bVal) strictlyBetter = true;
            } else {
                if (aVal < bVal) dominated = false;
                if (aVal > bVal) strictlyBetter = true;
            }
        }
        
        return dominated && strictlyBetter;
    },
    
    /**
     * Get objective value from result
     */
    _getObjectiveValue(solution, objective) {
        switch (objective.name) {
            case 'cost':
                return solution.result.cost.summary.cost_per_part;
            case 'time':
                return solution.result.time.cycle_time.total.seconds;
            case 'quality':
                return solution.result.quality.surface_finish.Ra.value;
            case 'tool_life':
                return solution.result.tool_performance.expected_life.value;
            default:
                return 0;
        }
    }
};
```

---



## Section 9: API Examples and Usage

### 9.1 Basic Calculator Usage

```javascript
// Example 1: Speed and Feed Calculation
const speedFeedInput = {
    material: {
        id: 'AISI_4140',
        hardness: 28, // HRC
        condition: 'annealed'
    },
    tool: {
        id: 'EM-001',
        type: 'endmill',
        diameter: 12, // mm
        flutes: 4,
        coating: 'TiAlN',
        helix_angle: 35,
        rake_angle: 8
    },
    machine: {
        id: 'VMC-001',
        rpm_max: 12000,
        power: 15, // kW
        rigidity_factor: 0.85
    },
    operation: {
        type: 'roughing',
        depth_of_cut: 5, // mm
        width_of_cut: 6, // mm (50% stepover)
        engagement: 'side'
    },
    coolant: 'flood',
    units: { length: 'mm', speed: 'm/min', feed: 'mm' }
};

const speedFeedResult = await PRISM_SPEED_FEED_CALCULATOR.calculate(speedFeedInput);

console.log('Recommended Speed:', speedFeedResult.speed.value, 'm/min');
console.log('RPM:', speedFeedResult.rpm.value);
console.log('Feed Rate:', speedFeedResult.feed_rate.value, 'mm/min');
console.log('Confidence:', speedFeedResult.confidence);
```

### 9.2 Force Calculation with Full Context

```javascript
// Example 2: Cutting Force Prediction
const forceInput = {
    material: {
        id: 'Ti-6Al-4V',
        kc1_1: 1800, // N/mm² (specific cutting force)
        mc: 0.25,    // Kienzle exponent
        yield_strength: 880, // MPa
        shear_angle: 35 // degrees
    },
    tool: {
        id: 'EM-Ti-001',
        type: 'endmill',
        diameter: 10,
        flutes: 5,
        rake_angle: 12,
        helix_angle: 38,
        edge_radius: 0.015
    },
    operation: {
        type: 'slotting',
        depth_of_cut: 1.0,
        width_of_cut: 10, // Full width
        feed_per_tooth: 0.05,
        cutting_speed: 60
    },
    machine: {
        rigidity_factor: 0.9
    }
};

const forceResult = await PRISM_FORCE_CALCULATOR.calculate(forceInput);

console.log('Cutting Force Fc:', forceResult.Fc.value, 'N');
console.log('Feed Force Ft:', forceResult.Ft.value, 'N');
console.log('Radial Force Fr:', forceResult.Fr.value, 'N');
console.log('Required Power:', forceResult.power.value, 'kW');
console.log('Torque:', forceResult.torque.value, 'N·m');
```

### 9.3 Tool Life Estimation

```javascript
// Example 3: Tool Life Prediction
const toolLifeInput = {
    material: {
        id: 'Inconel_718',
        taylor_n: 0.18,
        taylor_C: 45,
        abrasiveness: 0.9,
        work_hardening: 0.85
    },
    tool: {
        id: 'CM-IN-001',
        type: 'carbide',
        grade: 'KC5010',
        coating: 'TiAlN',
        substrate: 'submicron_carbide',
        edges: 4,
        cost: 85 // $ per insert
    },
    operation: {
        cutting_speed: 35, // m/min
        feed_per_tooth: 0.08,
        depth_of_cut: 1.5
    },
    coolant: 'high_pressure',
    interrupted: false,
    machine: {
        rigidity_factor: 0.85
    },
    tool_cost: 85,
    machine_rate: 95,
    change_time: 3
};

const toolLifeResult = await PRISM_TOOL_LIFE_CALCULATOR.calculate(toolLifeInput);

console.log('Expected Life:', toolLifeResult.life_minutes.value, 'minutes');
console.log('Conservative:', toolLifeResult.life_minutes.conservative, 'minutes');
console.log('Parts per Tool:', toolLifeResult.parts_per_tool);
console.log('Dominant Wear:', toolLifeResult.wear_mode);
console.log('Cost per Minute:', '$' + toolLifeResult.economics.total_cost_per_min);
```

### 9.4 Surface Finish Prediction

```javascript
// Example 4: Surface Finish Estimation
const surfaceInput = {
    material: {
        id: 'AL_6061_T6',
        hardness: 95, // HB
        built_up_edge_tendency: 0.7,
        chip_formation_type: 'continuous'
    },
    tool: {
        type: 'turning_insert',
        nose_radius: 0.8, // mm
        rake_angle: 6,
        coating: 'TiN',
        edge_radius: 0.01
    },
    operation: {
        type: 'turning',
        feed_per_rev: 0.15, // mm/rev
        depth_of_cut: 1.0,
        cutting_speed: 300
    },
    coolant: 'flood',
    tool_wear: 'fresh',
    machine: {
        rigidity_factor: 0.9
    },
    target_finish: 1.6 // Ra target in μm
};

const finishResult = await PRISM_SURFACE_FINISH_CALCULATOR.calculate(surfaceInput);

console.log('Predicted Ra:', finishResult.surface_finish.Ra.value, 'μm');
console.log('N-Grade:', finishResult.surface_finish.N_grade);
console.log('Achievable:', finishResult.achievable);
console.log('Confidence:', finishResult.confidence);

if (!finishResult.achievable) {
    console.log('Recommendations:');
    finishResult.recommendations.forEach(r => {
        console.log(`  - ${r.action} (${r.expected_improvement})`);
    });
}
```

### 9.5 Complete Job Analysis

```javascript
// Example 5: Full Machining Analysis Chain
const jobInput = {
    // Part information
    part: {
        name: 'Bearing Housing',
        volume: 125000, // mm³
        material_volume: 250000 // Stock volume
    },
    part_family: 'housings',
    
    // Material
    material: {
        id: 'AISI_4340',
        name: '4340 Alloy Steel',
        hardness: 32,
        condition: 'heat_treated'
    },
    
    // Stock
    stock: {
        form: 'block',
        dimensions: { x: 100, y: 75, z: 50 }
    },
    
    // Operations
    operations: [
        {
            name: 'Face',
            type: 'face',
            tool_id: 'FM-002',
            width: 100,
            length: 75,
            stepover: 0.7,
            feed_rate: 800,
            tool_diameter: 50
        },
        {
            name: 'Rough Pocket',
            type: 'rough_pocket',
            tool_id: 'EM-003',
            volume: 50000,
            mrr: 25000
        },
        {
            name: 'Finish Pocket',
            type: 'finish_pocket',
            tool_id: 'EM-004',
            cutting_distance: 450,
            feed_rate: 1200
        },
        {
            name: 'Drill Holes x4',
            type: 'drill',
            tool_id: 'DR-001',
            depth: 35,
            feed_rate: 150,
            pecks: 3,
            count: 4
        },
        {
            name: 'Tap M10x1.5 x4',
            type: 'tap',
            tool_id: 'TAP-001',
            depth: 20,
            pitch: 1.5,
            rpm: 400,
            count: 4
        }
    ],
    
    // Tools
    tools: [
        { id: 'FM-002', cutting_time: 2, expected_life: 60 },
        { id: 'EM-003', cutting_time: 8, expected_life: 30 },
        { id: 'EM-004', cutting_time: 3, expected_life: 45 },
        { id: 'DR-001', cutting_time: 1, expected_life: 120 },
        { id: 'TAP-001', cutting_time: 1, expected_life: 200 }
    ],
    
    // Machine
    machine: {
        id: 'VMC-002',
        name: 'Haas VF-2',
        type: 'cnc_mill_3axis',
        rpm_max: 8100,
        power: 22.4,
        rigidity_factor: 0.85
    },
    
    // Production
    quantity: 25,
    
    // Quality
    target_finish: 1.6,
    requires_cert: true,
    first_article: true,
    
    // Timing
    setup_time: 0.75, // hours
    programming_time: 2.0, // hours
    inspection_time: 0.5, // hours
    
    // Economics
    target_margin: 0.30,
    currency: 'USD'
};

// Run complete analysis
const analysis = await PRISM_CALCULATOR_CHAIN.analyzeComplete(jobInput);

// Display results
console.log('\n=== JOB ANALYSIS RESULTS ===\n');

console.log('CUTTING PARAMETERS:');
console.log(`  Speed: ${analysis.cutting_parameters.speed.value} m/min`);
console.log(`  RPM: ${analysis.cutting_parameters.rpm.value}`);
console.log(`  Feed: ${analysis.cutting_parameters.feed_rate.value} mm/min`);

console.log('\nPROCESS DATA:');
console.log(`  Cutting Force: ${analysis.process_data.cutting_force.value} N`);
console.log(`  Power: ${analysis.process_data.power_required.value} kW`);
console.log(`  MRR: ${analysis.process_data.mrr.value} mm³/min`);

console.log('\nTOOL PERFORMANCE:');
console.log(`  Expected Life: ${analysis.tool_performance.expected_life.value} min`);
console.log(`  Wear Mode: ${analysis.tool_performance.wear_mode}`);

console.log('\nQUALITY:');
console.log(`  Surface Finish: Ra ${analysis.quality.surface_finish.Ra.value} μm`);
console.log(`  Achievable: ${analysis.quality.achievable}`);

console.log('\nTIME:');
console.log(`  Cycle Time: ${analysis.time.cycle_time.total.formatted}`);
console.log(`  Cutting: ${analysis.time.breakdown.cutting.formatted}`);
console.log(`  Efficiency: ${analysis.time.efficiency.cutting_percentage}%`);

console.log('\nCOST:');
console.log(`  Cost per Part: $${analysis.cost.per_part}`);
console.log(`  Suggested Price: $${analysis.cost.suggested_price}`);
console.log(`  Breakdown:`);
console.log(`    Machine: ${analysis.cost.breakdown.machine}%`);
console.log(`    Labor: ${analysis.cost.breakdown.labor}%`);
console.log(`    Material: ${analysis.cost.breakdown.material}%`);
console.log(`    Tooling: ${analysis.cost.breakdown.tooling}%`);

console.log('\nCONFIDENCE:');
console.log(`  Overall: ${(analysis.confidence.overall * 100).toFixed(1)}%`);
```

### 9.6 Scenario Comparison

```javascript
// Example 6: Compare Multiple Scenarios
const baseInput = {
    material: { id: 'AISI_4140', hardness: 28 },
    tool: { id: 'EM-001', diameter: 12, flutes: 4 },
    machine: { id: 'VMC-001', rpm_max: 12000 },
    operation: { type: 'roughing' },
    quantity: 100
};

const variations = [
    { name: 'Conservative', cutting_speed: 80, feed_per_tooth: 0.08 },
    { name: 'Standard', cutting_speed: 120, feed_per_tooth: 0.10 },
    { name: 'Aggressive', cutting_speed: 160, feed_per_tooth: 0.12 },
    { name: 'HSM', cutting_speed: 200, feed_per_tooth: 0.06, depth_of_cut: 1.5 }
];

const comparison = await PRISM_PARALLEL_CALCULATOR.compareScenarios(baseInput, variations);

console.log('\n=== SCENARIO COMPARISON ===\n');
console.log('RANKING:');
comparison.comparison_matrix.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}: Score ${s.score}, Cost $${s.cost}, Time ${s.time}`);
});

console.log('\nBEST SCENARIO:', comparison.best_scenario.name);
```

---

## Section 10: Calculator Quick Reference

### 10.1 Calculator Summary Table

| Calculator | Primary Output | Key Inputs | 6+ Sources |
|------------|----------------|------------|------------|
| Speed & Feed | RPM, feed rate, MRR | Material, tool, machine, operation | Material DB, Tool DB, Machine DB, Physics, Historical, AI |
| Force | Fc, Ft, Fr, power | Material kc, tool geometry, parameters | Kienzle, Merchant, Empirical, Historical, AI, Physics |
| Tool Life | Minutes, parts/tool | Taylor coefficients, wear factors | Taylor, Wear models, Adjustments, Historical, AI, Economics |
| Surface Finish | Ra, Rz, N-grade | Feed, nose radius, material | Geometric, Material, Process, Vibration, Historical, AI |
| Cycle Time | Seconds, efficiency | Toolpath, machine dynamics | Operations, Machine, Dynamics, Historical, AI, Block processing |
| Cost | $/part, price | All above + rates | Machine, Labor, Tool, Material, Historical, AI |

### 10.2 Gateway Routes for Calculators

```javascript
// Calculator Gateway registrations
PRISM_GATEWAY.register('calculate.speed_feed', PRISM_SPEED_FEED_CALCULATOR.calculate);
PRISM_GATEWAY.register('calculate.force', PRISM_FORCE_CALCULATOR.calculate);
PRISM_GATEWAY.register('calculate.tool_life', PRISM_TOOL_LIFE_CALCULATOR.calculate);
PRISM_GATEWAY.register('calculate.surface_finish', PRISM_SURFACE_FINISH_CALCULATOR.calculate);
PRISM_GATEWAY.register('calculate.cycle_time', PRISM_CYCLE_TIME_CALCULATOR.calculate);
PRISM_GATEWAY.register('calculate.cost', PRISM_COST_ESTIMATOR.calculate);
PRISM_GATEWAY.register('calculate.complete', PRISM_CALCULATOR_CHAIN.analyzeComplete);
PRISM_GATEWAY.register('calculate.compare', PRISM_PARALLEL_CALCULATOR.compareScenarios);
PRISM_GATEWAY.register('calculate.optimize', PRISM_OPTIMIZATION_CALCULATOR.optimizeForCost);
```

### 10.3 Error Handling Pattern

```javascript
// Robust calculator invocation with error handling
async function safeCalculate(calculator, input) {
    try {
        // Validate minimum required inputs
        if (!input.material?.id) {
            throw new Error('Material ID is required');
        }
        if (!input.tool?.id && !input.tool?.type) {
            throw new Error('Tool ID or type is required');
        }
        
        const result = await calculator.calculate(input);
        
        // Verify result quality
        if (result.confidence < 0.5) {
            console.warn('Low confidence result:', result.confidence);
        }
        
        return { success: true, data: result };
        
    } catch (error) {
        console.error('Calculation error:', error.message);
        
        // Return fallback/default values
        return {
            success: false,
            error: error.message,
            fallback: calculator.getDefaults?.(input) || null
        };
    }
}
```

---

*END OF SKILL: prism-product-calculators*

---
