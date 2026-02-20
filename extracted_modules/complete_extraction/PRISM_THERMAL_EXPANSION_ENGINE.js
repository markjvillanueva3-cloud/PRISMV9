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