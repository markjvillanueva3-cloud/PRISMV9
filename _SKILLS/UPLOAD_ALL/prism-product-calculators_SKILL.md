---
name: prism-product-calculators
description: |
  Product-specific calculator implementations.
---

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

*END OF SKILL: prism-product-calculators*

---
