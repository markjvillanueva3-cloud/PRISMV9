const PRISM_CALCULATOR_PHYSICS_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_PHYSICS_ENGINE',

    // CUTTING FORCE MODELS
    forces: {
        /**
         * Mechanistic Cutting Force Model (Altintas)
         * Calculates forces based on chip thickness and specific cutting pressure
         */
        millingForces: function(params) {
            const {
                Kc,              // Specific cutting pressure (N/mm²)
                ae,              // Radial engagement (mm)
                ap,              // Axial engagement / DOC (mm)
                fz,              // Feed per tooth (mm)
                z,               // Number of teeth
                D,               // Tool diameter (mm)
                helixAngle,      // Helix angle (degrees)
                leadAngle        // Lead/approach angle (degrees) - for face mills
            } = params;

            // Engagement angles
            const phi_st = Math.acos(1 - 2 * ae / D);  // Start angle
            const phi_ex = Math.PI;                     // Exit angle (climb milling)

            // Average chip thickness (considering engagement)
            const engagementRatio = ae / D;
            const avgEngagement = Math.asin(engagementRatio);
            const h_avg = fz * Math.sin(avgEngagement) * engagementRatio;
            const h_max = fz * Math.sqrt(2 * ae / D - Math.pow(ae / D, 2));

            // Cutting coefficients (from material Kc)
            const Kr = 0.35;  // Radial force ratio (typical for steel)
            const Ka = 0.25;  // Axial force ratio

            const Ktc = Kc;                            // Tangential cutting coefficient
            const Krc = Kr * Kc;                       // Radial cutting coefficient
            const Kac = Ka * Kc;                       // Axial cutting coefficient

            // Average forces per tooth
            const Ft_avg = Ktc * ap * h_avg;          // Tangential force (N)
            const Fr_avg = Krc * ap * h_avg;          // Radial force (N)
            const Fa_avg = Kac * ap * h_avg;          // Axial force (N)

            // Peak forces (at maximum chip thickness)
            const Ft_peak = Ktc * ap * h_max;
            const Fr_peak = Krc * ap * h_max;
            const Fa_peak = Kac * ap * h_max;

            // Number of teeth engaged (average)
            const engagedTeeth = z * (phi_ex - phi_st) / (2 * Math.PI);
            const engagedTeethMax = Math.ceil(engagedTeeth);

            // Total average forces
            const Ft_total = Ft_avg * engagedTeeth;
            const Fr_total = Fr_avg * engagedTeeth;
            const Fa_total = Fa_avg * engagedTeeth;

            // Peak total forces
            const Ft_peak_total = Ft_peak * engagedTeethMax;
            const Fr_peak_total = Fr_peak * engagedTeethMax;

            // Resultant force in XY plane
            const Fxy = Math.sqrt(Ft_total * Ft_total + Fr_total * Fr_total);
            const F_resultant = Math.sqrt(Fxy * Fxy + Fa_total * Fa_total);

            // Torque
            const torque = Ft_total * D / 2000;  // Nm

            // Bending moment at tool tip
            const stickout = params.stickout || 50;  // mm
            const bendingMoment = Fr_total * stickout;  // N·mm

            return {
                tangential: { avg: Ft_avg, peak: Ft_peak, total: Ft_total },
                radial: { avg: Fr_avg, peak: Fr_peak, total: Fr_total },
                axial: { avg: Fa_avg, peak: Fa_peak, total: Fa_total },
                resultant: F_resultant,
                resultantXY: Fxy,
                torque: torque,
                bendingMoment: bendingMoment,
                engagedTeeth: engagedTeeth,
                chipThickness: { avg: h_avg, max: h_max },
                units: { force: 'N', torque: 'Nm', moment: 'N·mm' }
            };
        },
        /**
         * Turning Force Model (Kienzle)
         */
        turningForces: function(params) {
            const { Kc, mc, ap, f, Vc, kr } = params;
            // kr = lead angle (KAPR)

            // Chip cross-section
            const b = ap / Math.sin(kr * Math.PI / 180);  // Uncut chip width
            const h = f * Math.sin(kr * Math.PI / 180);   // Chip thickness

            // Kienzle equation: Kc = Kc1.1 × h^(-mc)
            const Kc_actual = Kc * Math.pow(h, -mc);

            // Main cutting force
            const Fc = Kc_actual * b * h;  // N

            // Feed force (typically 40-60% of Fc)
            const Ff = 0.5 * Fc;

            // Radial/passive force
            const Fp = Fc * Math.tan((90 - kr) * Math.PI / 180);

            // Power
            const power = Fc * Vc / 60000;  // kW

            return {
                cutting: Fc,
                feed: Ff,
                radial: Fp,
                resultant: Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp),
                power: power,
                specificCuttingForce: Kc_actual,
                units: { force: 'N', power: 'kW' }
            };
        }
    },
    // POWER & TORQUE
    power: {
        /**
         * Calculate spindle power requirement
         */
        spindlePower: function(Fc, Vc) {
            // P = Fc × Vc / 60000 (Fc in N, Vc in m/min, P in kW)
            return Fc * Vc / 60000;
        },
        /**
         * Calculate power from MRR and specific energy
         */
        powerFromMRR: function(mrr, specificEnergy) {
            // mrr in cm³/min, specificEnergy in W·s/mm³ = J/mm³
            // P = MRR × specificEnergy / 60
            return (mrr * specificEnergy) / 60;  // kW
        },
        /**
         * Calculate spindle torque at RPM
         */
        spindleTorque: function(power, rpm) {
            // T = P × 9549 / rpm (P in kW, T in Nm)
            return power * 9549 / rpm;
        },
        /**
         * Check against spindle power/torque curve
         */
        checkSpindleLimits: function(requiredPower, requiredTorque, spindle, rpm) {
            // Interpolate power curve
            const availablePower = this.interpolateCurve(spindle.powerCurve, rpm, 'power');
            const availableTorque = this.interpolateCurve(spindle.torqueCurve, rpm, 'torque');

            const safetyMargin = 0.85;  // 85% of available

            return {
                powerOk: requiredPower <= availablePower * safetyMargin,
                torqueOk: requiredTorque <= availableTorque * safetyMargin,
                powerUtilization: requiredPower / availablePower,
                torqueUtilization: requiredTorque / availableTorque,
                availablePower: availablePower,
                availableTorque: availableTorque,
                limitingFactor: requiredPower / availablePower > requiredTorque / availableTorque
                    ? 'power' : 'torque',
                maxAllowedPower: availablePower * safetyMargin,
                maxAllowedTorque: availableTorque * safetyMargin
            };
        },
        interpolateCurve: function(curve, rpm, type) {
            if (!curve || curve.length === 0) {
                return type === 'power' ? 15 : 100;  // Defaults
            }
            // Sort by RPM
            const sorted = [...curve].sort((a, b) => a.rpm - b.rpm);

            // Below minimum
            if (rpm <= sorted[0].rpm) {
                return type === 'power' ? sorted[0].power : sorted[0].torque;
            }
            // Above maximum
            if (rpm >= sorted[sorted.length - 1].rpm) {
                return type === 'power' ? sorted[sorted.length - 1].power : sorted[sorted.length - 1].torque;
            }
            // Linear interpolation
            for (let i = 0; i < sorted.length - 1; i++) {
                if (rpm >= sorted[i].rpm && rpm <= sorted[i + 1].rpm) {
                    const ratio = (rpm - sorted[i].rpm) / (sorted[i + 1].rpm - sorted[i].rpm);
                    const v1 = type === 'power' ? sorted[i].power : sorted[i].torque;
                    const v2 = type === 'power' ? sorted[i + 1].power : sorted[i + 1].torque;
                    return v1 + ratio * (v2 - v1);
                }
            }
            return type === 'power' ? 15 : 100;
        }
    },
    // DEFLECTION CALCULATIONS
    deflection: {
        /**
         * Tool deflection at tip (cantilever beam model)
         */
        toolDeflection: function(F, L, D, E) {
            // δ = F × L³ / (3 × E × I)
            // I = π × D⁴ / 64 for solid cylinder
            E = E || 620000;  // MPa for carbide
            const I = Math.PI * Math.pow(D, 4) / 64;
            return F * Math.pow(L, 3) / (3 * E * I);  // mm
        },
        /**
         * Stepped tool deflection (varying diameter)
         */
        steppedToolDeflection: function(F, segments) {
            // segments: [{length, diameter}]
            // Calculate deflection for multi-diameter tool
            const E = 620000;  // MPa
            let totalDeflection = 0;
            let cumulativeLength = 0;

            for (const seg of segments) {
                const I = Math.PI * Math.pow(seg.diameter, 4) / 64;
                const L = seg.length;

                // Deflection contribution from this segment
                const segDeflection = F * Math.pow(L, 3) / (3 * E * I);

                // Add angular contribution to subsequent segments
                const angle = F * L * L / (2 * E * I);

                totalDeflection += segDeflection;
                cumulativeLength += L;
            }
            return totalDeflection;
        },
        /**
         * Total system deflection including holder and spindle
         */
        systemDeflection: function(params) {
            const { F, toolLength, toolDia, holderStiffness, spindleStiffness, holderRunout } = params;

            // Tool deflection
            const toolDefl = this.toolDeflection(F, toolLength, toolDia);

            // Holder deflection (if stiffness known)
            const holderDefl = holderStiffness ? F / holderStiffness : 0;

            // Spindle deflection (if stiffness known)
            const spindleDefl = spindleStiffness ? F / spindleStiffness : 0;

            // Runout contribution (adds to error, not force-dependent)
            const runoutContribution = holderRunout || 0;

            // Total at tool tip (worst case addition)
            const total = toolDefl + holderDefl + spindleDefl + runoutContribution;

            return {
                tool: toolDefl,
                holder: holderDefl,
                spindle: spindleDefl,
                runout: runoutContribution,
                total: total,
                breakdown: {
                    toolPercent: (toolDefl / total) * 100,
                    holderPercent: (holderDefl / total) * 100,
                    spindlePercent: (spindleDefl / total) * 100,
                    runoutPercent: (runoutContribution / total) * 100
                },
                withinTolerance: function(tolerance) { return total < tolerance; }
            };
        }
    },
    // THERMAL CALCULATIONS
    thermal: {
        /**
         * Estimate cutting temperature (Loewen-Shaw model)
         */
        cuttingTemperature: function(params) {
            const { Vc, f, Kc, k, rho, c, ambient } = params;
            // k = thermal conductivity (W/m·K)
            // rho = density (kg/m³)
            // c = specific heat (J/kg·K)

            ambient = ambient || 20;  // °C

            // Thermal number
            const Rt = (rho * c * Vc * f) / (60 * k);

            // Simplified temperature rise model
            // Most heat goes to chip (~75%), some to tool (~10%), some to work (~15%)
            const heatGeneration = Kc * Vc * f / 60;  // W/mm

            // Temperature rise estimation
            const deltaT = 0.4 * heatGeneration / (rho * c);

            return {
                temperatureRise: deltaT,
                chipTemperature: ambient + deltaT * 0.75,
                toolTemperature: ambient + deltaT * 0.10,
                workTemperature: ambient + deltaT * 0.15,
                heatPartition: {
                    chip: 0.75,
                    tool: 0.10,
                    work: 0.15
                }
            };
        }
    },
    // SURFACE FINISH PREDICTION
    surfaceFinish: {
        /**
         * Theoretical surface roughness (kinematic)
         */
        theoreticalRa: function(params) {
            const { fz, cornerRadius, toolType } = params;

            if (toolType === 'ball') {
                // Ball end mill: Ra ≈ fz² / (8 × R)
                const R = params.toolRadius || cornerRadius;
                return (fz * fz) / (8 * R) * 1000;  // μm
            } else {
                // End mill with corner radius: Ra ≈ fz² / (32 × r)
                const r = cornerRadius || 0.4;
                return (fz * fz) / (32 * r) * 1000;  // μm
            }
        },
        /**
         * Practical surface roughness (includes factors)
         */
        practicalRa: function(params) {
            const theoreticalRa = this.theoreticalRa(params);

            // Adjustment factors
            const materialFactor = params.materialFactor || 1.0;
            const toolConditionFactor = params.toolCondition || 1.0;
            const rigidityFactor = params.rigidity || 1.0;
            const vibrationFactor = params.vibration || 1.0;

            return theoreticalRa * materialFactor * toolConditionFactor *
                   rigidityFactor * vibrationFactor;
        }
    }
}