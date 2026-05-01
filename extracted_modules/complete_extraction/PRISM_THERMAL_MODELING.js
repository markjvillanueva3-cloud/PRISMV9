const PRISM_THERMAL_MODELING = {
    name: 'PRISM_THERMAL_MODELING',
    version: '1.0.0',
    source: 'MIT 2.008, 2.51 - Thermal Science',
    
    /**
     * Loewen-Shaw Temperature Model
     * Analytical cutting temperature prediction
     * Source: MIT 2.008
     */
    loewenShawTemperature: function(params) {
        const {
            cuttingSpeed,    // m/min
            feed,            // mm/rev
            depthOfCut,      // mm
            specificCuttingForce, // N/mm²
            materialDensity,  // kg/m³
            specificHeat,     // J/(kg·K)
            thermalConductivity, // W/(m·K)
            ambientTemp = 20  // °C
        } = params;
        
        const V = cuttingSpeed / 60; // m/s
        const t = feed; // uncut chip thickness
        const b = depthOfCut;
        
        // Cutting force
        const Fc = specificCuttingForce * t * b;
        
        // Power
        const P = Fc * V; // W
        
        // Thermal diffusivity
        const alpha = thermalConductivity / (materialDensity * specificHeat);
        
        // Peclet number (ratio of convection to conduction)
        const Pe = V * t / (2 * alpha);
        
        // Temperature rise in shear zone (Loewen-Shaw)
        // ΔT = (0.4 * u * V) / (ρ * c * sqrt(α * L))
        const u = specificCuttingForce; // Specific energy
        const L = t; // Characteristic length
        
        const deltaT = (0.4 * u * V * 1e6) / (materialDensity * specificHeat * Math.sqrt(alpha * L / 1000));
        
        // Tool-chip interface temperature (higher)
        // Typically 1.2-1.5x shear zone temperature
        const interfaceTemp = ambientTemp + deltaT * 1.3;
        
        // Maximum tool temperature (slightly lower due to conduction)
        const maxToolTemp = ambientTemp + deltaT * 1.1;
        
        return {
            shearZoneTemp: ambientTemp + deltaT,
            interfaceTemp: interfaceTemp,
            maxToolTemp: maxToolTemp,
            pecletNumber: Pe,
            powerGenerated: P,
            temperatureRise: deltaT,
            heatPartition: {
                chip: 0.75,    // 75% to chip
                tool: 0.15,    // 15% to tool
                workpiece: 0.10 // 10% to workpiece
            }
        };
    },
    
    /**
     * Trigger Equation (Simplified)
     * Quick temperature estimation
     */
    triggerTemperature: function(params) {
        const {
            specificEnergy, // J/mm³
            cuttingSpeed,   // m/min
            thermalNumber   // Non-dimensional thermal number (0.1-1.0)
        } = params;
        
        // θ = C * u^a * V^b
        // Typical values: a=0.9, b=0.3, C depends on material
        const C = 300;
        const a = 0.9;
        const b = 0.3;
        
        const temperature = C * Math.pow(specificEnergy, a) * Math.pow(cuttingSpeed / 100, b) * thermalNumber;
        
        return {
            temperature: temperature,
            criticalTemp: 800, // Typical tool degradation temperature
            safetyMargin: (800 - temperature) / 800 * 100
        };
    },
    
    /**
     * Fourier Heat Conduction (1D Finite Difference)
     * For transient thermal analysis
     */
    fourierConduction1D: function(config) {
        const {
            length,          // Domain length (mm)
            nodes = 50,      // Number of nodes
            timeSteps = 100,
            dt,              // Time step (s)
            thermalDiffusivity, // α = k/(ρ*c)
            initialTemp,     // Initial temperature distribution (array or value)
            leftBC,          // { type: 'dirichlet'|'neumann', value: T or flux }
            rightBC,         // { type: 'dirichlet'|'neumann', value: T or flux }
            heatSource = null // { position, magnitude }
        } = config;
        
        const dx = length / (nodes - 1);
        const Fo = thermalDiffusivity * dt / (dx * dx); // Fourier number
        
        // Stability check
        if (Fo > 0.5) {
            console.warn(`Fourier number ${Fo.toFixed(3)} > 0.5, solution may be unstable`);
        }
        
        // Initialize temperature array
        let T = new Array(nodes);
        if (Array.isArray(initialTemp)) {
            T = [...initialTemp];
        } else {
            T.fill(initialTemp);
        }
        
        const history = [{ time: 0, T: [...T] }];
        
        // Time stepping (explicit method)
        for (let n = 0; n < timeSteps; n++) {
            const Tnew = [...T];
            
            // Interior nodes
            for (let i = 1; i < nodes - 1; i++) {
                Tnew[i] = T[i] + Fo * (T[i+1] - 2*T[i] + T[i-1]);
                
                // Add heat source if present
                if (heatSource && Math.abs((i * dx) - heatSource.position) < dx) {
                    Tnew[i] += heatSource.magnitude * dt;
                }
            }
            
            // Boundary conditions
            if (leftBC.type === 'dirichlet') {
                Tnew[0] = leftBC.value;
            } else { // Neumann
                Tnew[0] = Tnew[1] - leftBC.value * dx;
            }
            
            if (rightBC.type === 'dirichlet') {
                Tnew[nodes-1] = rightBC.value;
            } else { // Neumann
                Tnew[nodes-1] = Tnew[nodes-2] + rightBC.value * dx;
            }
            
            T = Tnew;
            
            if ((n + 1) % 10 === 0) {
                history.push({ time: (n + 1) * dt, T: [...T] });
            }
        }
        
        return {
            finalTemperature: T,
            maxTemp: Math.max(...T),
            minTemp: Math.min(...T),
            history,
            fourierNumber: Fo,
            stable: Fo <= 0.5
        };
    },
    
    /**
     * Thermal Expansion Compensation
     */
    thermalExpansion: function(params) {
        const {
            length,              // mm
            temperatureChange,   // ΔT in °C
            expansionCoefficient // α in 1/°C (e.g., steel: 12e-6)
        } = params;
        
        const expansion = length * expansionCoefficient * temperatureChange;
        
        return {
            expansion: expansion,      // mm
            expansionMicrons: expansion * 1000, // μm
            strainPercent: expansionCoefficient * temperatureChange * 100,
            compensation: -expansion   // Negative to compensate
        };
    }
}