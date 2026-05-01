const PRISM_AI_PHYSICS_ENGINE = {

    // CUTTING MECHANICS - Fundamental Physics

    /**
     * Merchant's Circle - Cutting Force Model
     * Source: MIT 2.008 Lecture 5
     */
    merchantCuttingForce: function(params) {
        const {
            Vc,         // Cutting speed (m/min)
            f,          // Feed per tooth (mm)
            ap,         // Depth of cut (mm)
            ae,         // Width of cut (mm)
            Kc1,        // Specific cutting force at 1mm² (N/mm²)
            mc,         // Cutting force exponent (typically 0.25)
            gamma       // Rake angle (radians)
        } = params;

        // Chip thickness
        const h = f * Math.sin(Math.acos(1 - 2 * ae / (2 * 10))); // Simplified

        // Specific cutting force with chip thickness correction
        const Kc = Kc1 * Math.pow(h, -mc);

        // Cutting force
        const Fc = Kc * ap * f;

        // Shear angle from Merchant's theory
        const phi = Math.PI/4 - gamma/2;

        // Thrust force
        const Ft = Fc * Math.tan(phi - gamma);

        // Power
        const Pc = (Fc * Vc) / (60 * 1000); // kW

        return {
            Fc,         // Main cutting force (N)
            Ft,         // Thrust force (N)
            Pc,         // Cutting power (kW)
            Kc,         // Actual specific cutting force
            phi,        // Shear angle (rad)
            shearAngleDeg: phi * 180 / Math.PI
        };
    },
    /**
     * Taylor Tool Life Equation
     * Source: MIT 2.008, F.W. Taylor's original research
     */
    taylorToolLife: function(Vc, material) {
        // V × T^n = C
        // where: V = cutting speed, T = tool life, n & C are material constants

        const taylorCoeffs = this._getTaylorCoefficients(material);
        const { n, C, Vref, Tref } = taylorCoeffs;

        // Tool life in minutes
        const T = Math.pow(C / Vc, 1/n);

        // Extended Taylor (with feed and DOC)
        // V × T^n × f^a × d^b = C_extended

        return {
            toolLife: T,        // minutes
            n,
            C,
            confidence: taylorCoeffs.confidence || 0.85,
            source: taylorCoeffs.source || 'database'
        };
    },
    /**
     * Extended Taylor with Feed and DOC
     * Source: Machining Data Handbook
     */
    extendedTaylorToolLife: function(Vc, f, ap, material) {
        const coeffs = this._getTaylorCoefficients(material);
        const { n, C, a = 0.3, b = 0.15 } = coeffs;

        // V × T^n × f^a × d^b = C_ext
        // Solving for T: T = (C_ext / (V × f^a × d^b))^(1/n)

        const C_ext = C * Math.pow(0.1, -a) * Math.pow(1.0, -b); // Reference at f=0.1, d=1.0
        const T = Math.pow(C_ext / (Vc * Math.pow(f, a) * Math.pow(ap, b)), 1/n);

        return {
            toolLife: Math.max(0.1, T),
            exponents: { n, a, b },
            reliability: 0.80
        };
    },
    _getTaylorCoefficients: function(material) {
        // Default coefficients by material family
        const defaults = {
            'aluminum': { n: 0.35, C: 800, source: 'handbook' },
            'steel': { n: 0.25, C: 200, source: 'handbook' },
            'stainless': { n: 0.20, C: 150, source: 'handbook' },
            'titanium': { n: 0.15, C: 80, source: 'handbook' },
            'cast_iron': { n: 0.28, C: 180, source: 'handbook' },
            'inconel': { n: 0.12, C: 40, source: 'handbook' },
            'brass': { n: 0.40, C: 500, source: 'handbook' },
            'copper': { n: 0.38, C: 450, source: 'handbook' }
        };
        // Try to get from PRISM database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && material.id) {
            const mat = PRISM_MATERIALS_MASTER.byId?.(material.id);
            if (mat?.taylor_coefficients) {
                return {
                    n: mat.taylor_coefficients.n,
                    C: mat.taylor_coefficients.C,
                    source: 'prism_database',
                    confidence: 0.95
                };
            }
        }
        // Fallback to material family
        const family = (material.family || material.type || 'steel').toLowerCase();
        for (const [key, coeffs] of Object.entries(defaults)) {
            if (family.includes(key)) return coeffs;
        }
        return defaults.steel;
    },
    /**
     * Surface Finish Prediction
     * Source: MIT 2.830, Machining Fundamentals
     */
    predictSurfaceFinish: function(params) {
        const {
            f,          // Feed per rev (mm/rev)
            r,          // Tool nose radius (mm)
            Vc = 100,   // Cutting speed (m/min)
            BUE = false // Built-up edge present
        } = params;

        // Theoretical Ra (geometric)
        // Ra = f² / (32 × r)  [mm] → convert to μm
        const Ra_theoretical = (f * f) / (32 * r) * 1000; // μm

        // Correction factors
        let K_speed = 1.0;
        if (Vc < 50) K_speed = 1.3;     // Low speed = worse finish
        else if (Vc > 200) K_speed = 0.9; // High speed = better

        let K_BUE = BUE ? 2.0 : 1.0;    // BUE doubles roughness

        // Actual Ra
        const Ra_actual = Ra_theoretical * K_speed * K_BUE;

        // Convert to different units
        return {
            Ra_um: Ra_actual,
            Ra_uin: Ra_actual * 39.37,   // microinches
            Rz_um: Ra_actual * 4,        // Approximate Rz
            theoretical: Ra_theoretical,
            factors: { K_speed, K_BUE }
        };
    },
    /**
     * Metal Removal Rate (MRR)
     */
    calculateMRR: function(params) {
        const { Vc, f, ap, ae, D } = params;

        // MRR = Vc × f × ap × ae / D (for milling)
        // MRR = Vc × f × ap (for turning, ae = pi×D)

        const MRR_turning = Vc * f * ap * 1000; // mm³/min
        const MRR_milling = ae * ap * f * (1000 * Vc / (Math.PI * D)); // mm³/min

        return {
            turning: MRR_turning,
            milling: MRR_milling,
            unit: 'mm³/min'
        };
    },
    /**
     * Cutting Temperature (Analytical Model)
     * Source: Shaw's Metal Cutting Principles
     */
    cuttingTemperature: function(params) {
        const {
            Vc,         // m/min
            f,          // mm
            ap,         // mm
            Kc,         // N/mm²
            k = 50,     // Thermal conductivity (W/m·K)
            rho = 7850, // Density (kg/m³)
            cp = 500    // Specific heat (J/kg·K)
        } = params;

        // Heat partition coefficient (fraction to chip)
        const R = 0.9;

        // Shear plane temperature rise
        // ΔT_shear = (R × Kc × f × ap × Vc) / (rho × cp × f × ap × Vc)
        // Simplified: depends on specific cutting energy

        const thermal_number = (rho * cp * Vc / 60) * f / (1000 * k);
        const temp_rise = (R * Kc * Vc / 60) / (rho * cp * Vc / 60 * 0.001);

        // Chip-tool interface temperature
        const T_chip = 20 + temp_rise * 0.5; // Ambient + rise
        const T_tool = 20 + temp_rise * 0.3; // Tool sees less heat

        return {
            T_chip_interface: Math.min(1200, T_chip),
            T_tool_surface: Math.min(800, T_tool),
            thermal_number,
            unit: '°C'
        };
    },
    // CHATTER & STABILITY ANALYSIS
    // Source: Altintas - Manufacturing Automation

    /**
     * Stability Lobe Diagram Calculation
     * Source: Altintas, MIT 2.830
     */
    stabilityLobes: function(params) {
        const {
            fn,         // Natural frequency (Hz)
            zeta,       // Damping ratio
            Kt,         // Cutting coefficient (N/mm²)
            Kr = 0.3,   // Radial to tangential force ratio
            numTeeth,   // Number of cutting edges
            D,          // Tool diameter (mm)
            ae          // Radial depth of cut (mm)
        } = params;

        const lobes = [];

        // For each lobe (k = 0, 1, 2, ...)
        for (let k = 0; k < 5; k++) {
            const lobe = [];

            // Frequency range for this lobe
            for (let fc = fn * 0.5; fc <= fn * 2.0; fc += fn * 0.02) {
                // Phase angle
                const omega = 2 * Math.PI * fc;
                const omega_n = 2 * Math.PI * fn;
                const r = omega / omega_n;

                // Real and imaginary parts of FRF
                const H_re = (1 - r * r) / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
                const H_im = -2 * zeta * r / ((1 - r * r) ** 2 + (2 * zeta * r) ** 2);

                // Phase angle
                const psi = Math.atan2(H_im, H_re);

                // Critical depth of cut
                const Lambda_R = -1 / (2 * Kt * Math.sqrt(H_re * H_re + H_im * H_im));

                // Spindle speed for this lobe
                const epsilon = Math.PI - 2 * psi;
                const N = 60 * fc / (numTeeth * (k + epsilon / (2 * Math.PI)));

                // Limiting depth
                const ap_lim = Lambda_R * 2 * 1000; // Convert to mm

                if (N > 0 && ap_lim > 0) {
                    lobe.push({ N: Math.round(N), ap_lim: Math.abs(ap_lim) });
                }
            }
            lobes.push(lobe);
        }
        return {
            lobes,
            naturalFrequency: fn,
            dampingRatio: zeta,
            recommendation: this._findStableZones(lobes)
        };
    },
    _findStableZones: function(lobes) {
        // Find RPM values where all lobes allow maximum DOC
        const stableZones = [];

        // Combine all lobes and find peaks
        const allPoints = lobes.flat().sort((a, b) => a.N - b.N);

        // Simple peak finding
        for (let i = 1; i < allPoints.length - 1; i++) {
            if (allPoints[i].ap_lim > allPoints[i-1].ap_lim &&
                allPoints[i].ap_lim > allPoints[i+1].ap_lim) {
                stableZones.push({
                    rpm: allPoints[i].N,
                    maxDOC: allPoints[i].ap_lim
                });
            }
        }
        return stableZones.slice(0, 5); // Top 5 stable zones
    },
    /**
     * Quick Chatter Risk Assessment
     */
    chatterRiskAssessment: function(params) {
        const {
            spindle_rpm,
            depth_of_cut,
            tool_stickout,
            tool_diameter,
            material_hardness
        } = params;

        // Risk factors
        let risk = 0;

        // High L/D ratio = high risk
        const LD_ratio = tool_stickout / tool_diameter;
        if (LD_ratio > 6) risk += 40;
        else if (LD_ratio > 4) risk += 25;
        else if (LD_ratio > 3) risk += 10;

        // Deep cuts = higher risk
        const DOC_ratio = depth_of_cut / tool_diameter;
        if (DOC_ratio > 1.5) risk += 30;
        else if (DOC_ratio > 1.0) risk += 20;
        else if (DOC_ratio > 0.5) risk += 10;

        // Hard materials = higher risk
        if (material_hardness > 45) risk += 20;
        else if (material_hardness > 30) risk += 10;

        // High spindle speed can be unstable
        if (spindle_rpm > 15000) risk += 15;
        else if (spindle_rpm > 10000) risk += 5;

        return {
            riskScore: Math.min(100, risk),
            level: risk > 60 ? 'HIGH' : risk > 30 ? 'MEDIUM' : 'LOW',
            factors: {
                LD_ratio,
                DOC_ratio,
                hardness: material_hardness
            },
            recommendations: this._getChatterRecommendations(risk, LD_ratio, DOC_ratio)
        };
    },
    _getChatterRecommendations: function(risk, LD, DOC) {
        const recs = [];

        if (LD > 4) {
            recs.push('Reduce tool stickout or use shorter tool');
            recs.push('Consider shrink fit or hydraulic holder');
        }
        if (DOC > 1.0) {
            recs.push('Reduce depth of cut');
            recs.push('Use multiple passes');
        }
        if (risk > 50) {
            recs.push('Reduce feed rate by 20-30%');
            recs.push('Try variable helix endmill');
            recs.push('Adjust RPM to stability lobe');
        }
        return recs;
    }
}