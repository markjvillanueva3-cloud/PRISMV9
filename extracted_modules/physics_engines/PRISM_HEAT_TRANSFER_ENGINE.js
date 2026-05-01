const PRISM_HEAT_TRANSFER_ENGINE = {
    name: 'PRISM_HEAT_TRANSFER_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.51, MIT 16.050',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONDUCTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * 1D steady-state conduction (Fourier's law)
     * q = -k × dT/dx
     */
    steadyStateConduction1D: function(params) {
        const {
            thermalConductivity: k, // W/(m·K)
            length: L,              // m
            crossSectionArea: A,    // m²
            T_hot,                  // °C
            T_cold                  // °C
        } = params;
        
        const dT = T_hot - T_cold;
        const q = k * A * dT / L; // W
        const R_thermal = L / (k * A); // K/W
        
        return {
            heatFlux_W: q,
            heatFlux_W_m2: k * dT / L,
            thermalResistance_K_W: R_thermal,
            temperatureGradient_K_m: -dT / L,
            temperatureProfile: (x) => T_hot - (dT / L) * x
        };
    },
    
    /**
     * 1D transient conduction (lumped capacitance)
     * Valid when Bi < 0.1
     */
    transientLumpedCapacitance: function(params) {
        const {
            mass: m,                    // kg
            specificHeat: c,            // J/(kg·K)
            surfaceArea: A_s,           // m²
            heatTransferCoeff: h,       // W/(m²·K)
            T_initial,                  // °C
            T_ambient,                  // °C
            time: t                     // s
        } = params;
        
        // Time constant
        const tau = m * c / (h * A_s);
        
        // Temperature at time t
        const T = T_ambient + (T_initial - T_ambient) * Math.exp(-t / tau);
        
        // Cooling/heating rate
        const dT_dt = -(T_initial - T_ambient) / tau * Math.exp(-t / tau);
        
        // Time to reach target temperature
        const timeToTemp = (T_target) => {
            const ratio = (T_target - T_ambient) / (T_initial - T_ambient);
            return ratio > 0 ? -tau * Math.log(ratio) : Infinity;
        };
        
        return {
            temperature_C: T,
            timeConstant_s: tau,
            coolingRate_C_s: Math.abs(dT_dt),
            percentComplete: (1 - Math.exp(-t / tau)) * 100,
            time95percent_s: 3 * tau,
            temperatureFunction: (time) => T_ambient + (T_initial - T_ambient) * Math.exp(-time / tau),
            timeToTarget: timeToTemp
        };
    },
    
    /**
     * 1D transient conduction with FDM (finite difference)
     * @param {Object} params - Material, geometry, boundary conditions
     * @param {Object} config - Numerical parameters
     * @returns {Object} Temperature field evolution
     */
    transientConduction1D_FDM: function(params, config) {
        const {
            thermalConductivity: k,
            density: rho,
            specificHeat: c,
            length: L,
            T_initial,
            T_left,          // Left boundary (Dirichlet)
            T_right,         // Right boundary (Dirichlet)
            q_left,          // Left heat flux (Neumann) - alternative
            h_right,         // Convection at right (Robin) - alternative
            T_inf            // Ambient for convection
        } = params;
        
        const {
            nx = 50,         // Spatial nodes
            dt = 0.1,        // Time step (s)
            duration = 100   // Total simulation time (s)
        } = config;
        
        const alpha = k / (rho * c); // Thermal diffusivity
        const dx = L / (nx - 1);
        
        // Stability check (Fo ≤ 0.5 for explicit)
        const Fo = alpha * dt / (dx * dx);
        if (Fo > 0.5) {
            console.warn(`Fourier number ${Fo.toFixed(3)} > 0.5. Reduce dt for stability.`);
        }
        
        // Initialize temperature array
        let T = Array(nx).fill(T_initial);
        const history = [{ time: 0, T: [...T] }];
        
        const numSteps = Math.floor(duration / dt);
        
        for (let step = 0; step < numSteps; step++) {
            const T_new = [...T];
            
            // Interior points (explicit FTCS)
            for (let i = 1; i < nx - 1; i++) {
                T_new[i] = T[i] + Fo * (T[i+1] - 2*T[i] + T[i-1]);
            }
            
            // Boundary conditions
            if (T_left !== undefined) {
                T_new[0] = T_left;
            } else if (q_left !== undefined) {
                // Neumann: q = -k dT/dx
                T_new[0] = T_new[1] + q_left * dx / k;
            }
            
            if (T_right !== undefined) {
                T_new[nx-1] = T_right;
            } else if (h_right !== undefined && T_inf !== undefined) {
                // Robin: q = h(T - T_inf)
                const Bi = h_right * dx / k;
                T_new[nx-1] = (T_new[nx-2] + Bi * T_inf) / (1 + Bi);
            }
            
            T = T_new;
            
            // Store at intervals
            if (step % Math.max(1, Math.floor(numSteps / 100)) === 0) {
                history.push({ time: (step + 1) * dt, T: [...T] });
            }
        }
        
        return {
            finalTemperature: T,
            history,
            fourierNumber: Fo,
            dx,
            dt,
            maxTemp: Math.max(...T),
            minTemp: Math.min(...T),
            positions: Array(nx).fill(0).map((_, i) => i * dx)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONVECTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Forced convection heat transfer coefficient
     * @param {Object} params - Flow and geometry parameters
     * @returns {Object} Heat transfer coefficient and related values
     */
    forcedConvectionCoefficient: function(params) {
        const {
            velocity: U,            // m/s
            characteristicLength: L, // m
            fluidType = 'air'       // or 'water', 'oil', 'coolant'
        } = params;
        
        // Fluid properties at ~20-25°C
        const fluids = {
            'air': { rho: 1.2, mu: 1.8e-5, k: 0.026, cp: 1006, Pr: 0.71 },
            'water': { rho: 1000, mu: 1e-3, k: 0.6, cp: 4186, Pr: 7 },
            'oil': { rho: 870, mu: 0.03, k: 0.14, cp: 1880, Pr: 400 },
            'coolant': { rho: 1050, mu: 2e-3, k: 0.5, cp: 3500, Pr: 14 }
        };
        
        const fluid = fluids[fluidType] || fluids.water;
        
        // Reynolds number
        const Re = fluid.rho * U * L / fluid.mu;
        
        // Flow regime
        const flowRegime = Re < 2300 ? 'laminar' : Re < 4000 ? 'transition' : 'turbulent';
        
        // Nusselt number correlations
        let Nu;
        if (Re < 2300) {
            // Laminar flow over flat plate
            Nu = 0.664 * Math.pow(Re, 0.5) * Math.pow(fluid.Pr, 1/3);
        } else if (Re < 5e5) {
            // Turbulent flat plate (Colburn)
            Nu = 0.0296 * Math.pow(Re, 0.8) * Math.pow(fluid.Pr, 1/3);
        } else {
            // Fully turbulent (Dittus-Boelter)
            Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(fluid.Pr, 0.4);
        }
        
        // Heat transfer coefficient
        const h = Nu * fluid.k / L;
        
        return {
            heatTransferCoeff_W_m2K: h,
            reynoldsNumber: Re,
            nusseltNumber: Nu,
            prandtlNumber: fluid.Pr,
            flowRegime,
            fluid: fluidType,
            thermalBoundaryLayer_mm: L * 1000 / Math.pow(Re, 0.5) * Math.pow(fluid.Pr, 1/3)
        };
    },
    
    /**
     * Coolant effectiveness in machining
     */
    coolantEffectiveness: function(params) {
        const {
            cuttingSpeed: V,         // m/min
            flowRate: Q,             // L/min
            coolantType = 'water_based',
            nozzleDiameter: d_n = 3, // mm
            nozzleDistance: L_n = 50 // mm from cutting zone
        } = params;
        
        // Coolant properties
        const coolants = {
            'water_based': { h_eff: 10000, coolingCapacity: 1.0, friction_reduction: 0.15 },
            'straight_oil': { h_eff: 3000, coolingCapacity: 0.4, friction_reduction: 0.25 },
            'synthetic': { h_eff: 8000, coolingCapacity: 0.8, friction_reduction: 0.20 },
            'semi_synthetic': { h_eff: 7000, coolingCapacity: 0.7, friction_reduction: 0.22 },
            'mql': { h_eff: 2000, coolingCapacity: 0.15, friction_reduction: 0.30 }
        };
        
        const coolant = coolants[coolantType] || coolants.water_based;
        
        // Jet velocity
        const A_nozzle = Math.PI * (d_n/2/1000) ** 2; // m²
        const V_jet = (Q / 60000) / A_nozzle; // m/s
        
        // Momentum ratio (jet penetration)
        const V_chip = V / 60; // m/s
        const momentumRatio = V_jet / V_chip;
        
        // Effective heat transfer coefficient (depends on penetration)
        const penetrationFactor = Math.min(1, momentumRatio / 2);
        const h_actual = coolant.h_eff * penetrationFactor;
        
        // Temperature reduction estimate
        const T_reduction_estimate = penetrationFactor * coolant.coolingCapacity * 200; // °C
        
        return {
            effectiveHTC_W_m2K: h_actual,
            jetVelocity_m_s: V_jet,
            momentumRatio,
            penetrationFactor,
            estimatedTempReduction_C: T_reduction_estimate,
            frictionReduction_percent: coolant.friction_reduction * 100 * penetrationFactor,
            coolantType,
            recommendation: momentumRatio < 1.5 ? 
                'Increase flow rate or reduce nozzle diameter for better penetration' :
                'Good coolant delivery'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('heat.conduction1D', 'PRISM_HEAT_TRANSFER_ENGINE.steadyStateConduction1D');
            PRISM_GATEWAY.register('heat.transientLumped', 'PRISM_HEAT_TRANSFER_ENGINE.transientLumpedCapacitance');
            PRISM_GATEWAY.register('heat.transientFDM', 'PRISM_HEAT_TRANSFER_ENGINE.transientConduction1D_FDM');
            PRISM_GATEWAY.register('heat.convectionCoeff', 'PRISM_HEAT_TRANSFER_ENGINE.forcedConvectionCoefficient');
            PRISM_GATEWAY.register('heat.coolant', 'PRISM_HEAT_TRANSFER_ENGINE.coolantEffectiveness');
            console.log('[PRISM] PRISM_HEAT_TRANSFER_ENGINE registered: 5 routes');
        }
    }
};


/**
 * PRISM_THERMAL_EXPANSION_ENGINE
 * Thermal effects on dimensional accuracy
 * Source: MIT 2.75 (Precision Machine Design)
 */
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
}