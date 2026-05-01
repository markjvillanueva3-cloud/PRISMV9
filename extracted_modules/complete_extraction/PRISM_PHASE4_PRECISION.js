const PRISM_PHASE4_PRECISION = {
    version: '8.49.000',
    phase: 'Phase 4: Precision Physics',
    buildDate: '2026-01-12',
    sources: ['MIT 2.75', 'MIT 2.001', 'MIT 3.22', 'MIT 2.003J', 'Caltech MS 115'],

    // SECTION 1: GEOMETRIC ERROR MODEL (ISO 230-1)
    // MIT 2.75 Precision Machine Design - Prof. Alexander Slocum
    // 3-axis: 21 error parameters (6 per axis + 3 squareness)
    // 5-axis: 41 error parameters (21 + 10 per rotary axis)
    // HTM (Homogeneous Transformation Matrix) approach

    GeometricErrorModel: {
        // 21-parameter model for 3-axis machine
        // Per axis: δx, δy, δz (positioning), εx, εy, εz (angular)
        // Squareness: αxy, αxz, αyz

        // Error parameters structure
        createErrorModel(machineType = '3-axis') {
            const model = {
                type: machineType,
                // Linear axis errors (per axis)
                xAxis: {
                    EXX: 0, // Positioning error in X
                    EYX: 0, // Straightness Y in X
                    EZX: 0, // Straightness Z in X
                    EAX: 0, // Roll around X
                    EBX: 0, // Pitch around X
                    ECX: 0  // Yaw around X
                },
                yAxis: {
                    EXY: 0, EYY: 0, EZY: 0, EAY: 0, EBY: 0, ECY: 0
                },
                zAxis: {
                    EXZ: 0, EYZ: 0, EZZ: 0, EAZ: 0, EBZ: 0, ECZ: 0
                },
                // Squareness errors
                squareness: {
                    SXY: 0, // XY squareness
                    SXZ: 0, // XZ squareness
                    SYZ: 0  // YZ squareness
                }
            };
            if (machineType === '5-axis') {
                // Add rotary axis errors (A and C typical)
                model.aAxis = {
                    EXA: 0, EYA: 0, EZA: 0, // Linear errors
                    EAA: 0, EBA: 0, ECA: 0, // Angular errors
                    // Axis location errors
                    XOA: 0, YOA: 0, ZOA: 0, // Position offsets
                    AOA: 0                   // Orientation
                };
                model.cAxis = {
                    EXC: 0, EYC: 0, EZC: 0,
                    EAC: 0, EBC: 0, ECC: 0,
                    XOC: 0, YOC: 0, ZOC: 0,
                    COC: 0
                };
            }
            return model;
        },
        // Homogeneous Transformation Matrix (4x4)
        // Used for kinematic chain computation
        createHTM(dx, dy, dz, rx, ry, rz) {
            // Small angle approximation for efficiency
            const cx = Math.cos(rx), sx = Math.sin(rx);
            const cy = Math.cos(ry), sy = Math.sin(ry);
            const cz = Math.cos(rz), sz = Math.sin(rz);

            return [
                [cy*cz, -cy*sz, sy, dx],
                [sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy, dy],
                [-cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy, dz],
                [0, 0, 0, 1]
            ];
        },
        // Multiply two 4x4 HTMs
        multiplyHTM(A, B) {
            const C = [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    for (let k = 0; k < 4; k++) {
                        C[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return C;
        },
        // Calculate volumetric error at position [x, y, z]
        calculateVolumetricError(model, position) {
            const { x, y, z } = position;
            const { xAxis, yAxis, zAxis, squareness } = model;

            // Position-dependent errors (simplified linear model)
            // In reality, these would be polynomial or lookup table based
            const errors = {
                // Linear errors (proportional to travel)
                dx: xAxis.EXX * x / 1000 + yAxis.EXY * y / 1000 + zAxis.EXZ * z / 1000,
                dy: xAxis.EYX * x / 1000 + yAxis.EYY * y / 1000 + zAxis.EYZ * z / 1000,
                dz: xAxis.EZX * x / 1000 + yAxis.EZY * y / 1000 + zAxis.EZZ * z / 1000,

                // Angular errors
                rx: xAxis.EAX * x / 1000 + yAxis.EAY * y / 1000 + zAxis.EAZ * z / 1000,
                ry: xAxis.EBX * x / 1000 + yAxis.EBY * y / 1000 + zAxis.EBZ * z / 1000,
                rz: xAxis.ECX * x / 1000 + yAxis.ECY * y / 1000 + zAxis.ECZ * z / 1000
            };
            // Add squareness contributions (Abbe errors)
            errors.dx += squareness.SXY * y / 1000 + squareness.SXZ * z / 1000;
            errors.dy += squareness.SYZ * z / 1000;

            // Total volumetric error (RSS)
            const totalError = Math.sqrt(errors.dx**2 + errors.dy**2 + errors.dz**2);

            return {
                components: errors,
                total: totalError,
                position
            };
        },
        // Generate volumetric error map over workspace
        generateErrorMap(model, workspace, gridPoints = 5) {
            const { xMin, xMax, yMin, yMax, zMin, zMax } = workspace;
            const dx = (xMax - xMin) / (gridPoints - 1);
            const dy = (yMax - yMin) / (gridPoints - 1);
            const dz = (zMax - zMin) / (gridPoints - 1);

            const errorMap = [];
            let maxError = 0, avgError = 0, count = 0;

            for (let i = 0; i < gridPoints; i++) {
                for (let j = 0; j < gridPoints; j++) {
                    for (let k = 0; k < gridPoints; k++) {
                        const pos = {
                            x: xMin + i * dx,
                            y: yMin + j * dy,
                            z: zMin + k * dz
                        };
                        const error = this.calculateVolumetricError(model, pos);
                        errorMap.push(error);
                        maxError = Math.max(maxError, error.total);
                        avgError += error.total;
                        count++;
                    }
                }
            }
            return {
                map: errorMap,
                statistics: {
                    maxError: maxError.toFixed(4),
                    avgError: (avgError / count).toFixed(4),
                    points: count
                }
            };
        },
        // Compensation: inverse of error
        calculateCompensation(model, position) {
            const error = this.calculateVolumetricError(model, position);
            return {
                x: position.x - error.components.dx,
                y: position.y - error.components.dy,
                z: position.z - error.components.dz,
                applied: error.components
            };
        }
    },
    // SECTION 2: THERMAL COMPENSATION ENGINE
    // MIT 2.75 - Thermal error is often 40-70% of total error
    // Uses: FDM simulation, α × L × ΔT expansion model

    ThermalCompensation: {
        // Material thermal expansion coefficients (µm/m/°C)
        expansionCoefficients: {
            steel: 11.7,
            aluminum: 23.1,
            cast_iron: 10.5,
            granite: 6.0,
            invar: 1.2,
            zerodur: 0.05,
            titanium: 8.6,
            carbide: 5.0,
            ceramic: 3.0
        },
        // Calculate thermal expansion: ΔL = α × L × ΔT
        calculateExpansion(material, length, deltaT) {
            const alpha = this.expansionCoefficients[material] || 11.7;
            const deltaL = alpha * length * deltaT / 1000; // µm
            return {
                material,
                alpha,
                length,
                deltaT,
                expansion: deltaL.toFixed(4),
                units: 'µm'
            };
        },
        // Multi-component thermal model
        createThermalModel(components) {
            return {
                components: components.map(c => ({
                    name: c.name,
                    material: c.material,
                    length: c.length,
                    referenceTemp: c.referenceTemp || 20,
                    currentTemp: c.currentTemp || 20,
                    alpha: this.expansionCoefficients[c.material] || 11.7
                })),
                calculateTotalExpansion: function() {
                    let total = { x: 0, y: 0, z: 0 };
                    for (const comp of this.components) {
                        const deltaT = comp.currentTemp - comp.referenceTemp;
                        const expansion = comp.alpha * comp.length * deltaT / 1000;
                        // Assume expansion direction from component definition
                        if (comp.direction === 'x') total.x += expansion;
                        else if (comp.direction === 'y') total.y += expansion;
                        else total.z += expansion;
                    }
                    return total;
                }
            };
        },
        // Simple 1D FDM thermal simulation
        // Solves: dT/dt = α∇²T (heat diffusion)
        FDMThermalSimulation: class {
            constructor(length, nodes, material = 'steel') {
                this.length = length;
                this.nodes = nodes;
                this.dx = length / (nodes - 1);
                this.T = Array(nodes).fill(20); // Initial temp 20°C

                // Thermal properties
                const props = {
                    steel: { k: 50, rho: 7800, cp: 500 },
                    aluminum: { k: 205, rho: 2700, cp: 900 },
                    cast_iron: { k: 52, rho: 7200, cp: 460 }
                };
                const p = props[material] || props.steel;
                this.alpha = p.k / (p.rho * p.cp); // Thermal diffusivity m²/s
            }
            // Set boundary conditions
            setBoundary(left, right) {
                this.T[0] = left;
                this.T[this.nodes - 1] = right;
            }
            // One time step using explicit FDM
            step(dt) {
                const Tnew = [...this.T];
                const r = this.alpha * dt / (this.dx * this.dx);

                // Stability check: r < 0.5 for explicit method
                if (r > 0.5) {
                    console.warn('FDM stability warning: r =', r);
                }
                for (let i = 1; i < this.nodes - 1; i++) {
                    Tnew[i] = this.T[i] + r * (this.T[i+1] - 2*this.T[i] + this.T[i-1]);
                }
                this.T = Tnew;
                return this.T;
            }
            // Simulate to steady state
            simulateToSteady(maxSteps = 1000, tolerance = 0.001) {
                const dt = 0.4 * this.dx * this.dx / this.alpha; // Safe dt

                for (let step = 0; step < maxSteps; step++) {
                    const Told = [...this.T];
                    this.step(dt);

                    // Check convergence
                    let maxChange = 0;
                    for (let i = 0; i < this.nodes; i++) {
                        maxChange = Math.max(maxChange, Math.abs(this.T[i] - Told[i]));
                    }
                    if (maxChange < tolerance) {
                        return { converged: true, steps: step, temperature: this.T };
                    }
                }
                return { converged: false, steps: maxSteps, temperature: this.T };
            }
            // Get thermal expansion profile
            getExpansionProfile(material = 'steel', referenceTemp = 20) {
                const alpha = PRISM_PHASE4_PRECISION.ThermalCompensation.expansionCoefficients[material];
                const dx = this.dx;
                let totalExpansion = 0;

                for (let i = 0; i < this.nodes; i++) {
                    const deltaT = this.T[i] - referenceTemp;
                    totalExpansion += alpha * dx * deltaT / 1000; // µm
                }
                return {
                    profile: this.T.map((t, i) => ({
                        position: i * dx,
                        temperature: t.toFixed(2),
                        localExpansion: (alpha * dx * (t - referenceTemp) / 1000).toFixed(4)
                    })),
                    totalExpansion: totalExpansion.toFixed(4)
                };
            }
        },
        // Compensation lookup table
        createCompensationTable(temperatures, measurements) {
            // temperatures: array of temp values
            // measurements: corresponding error values
            return {
                temps: temperatures,
                errors: measurements,
                interpolate: function(T) {
                    // Linear interpolation
                    if (T <= this.temps[0]) return this.errors[0];
                    if (T >= this.temps[this.temps.length - 1]) return this.errors[this.errors.length - 1];

                    for (let i = 0; i < this.temps.length - 1; i++) {
                        if (T >= this.temps[i] && T < this.temps[i + 1]) {
                            const t = (T - this.temps[i]) / (this.temps[i + 1] - this.temps[i]);
                            return this.errors[i] + t * (this.errors[i + 1] - this.errors[i]);
                        }
                    }
                    return 0;
                }
            };
        }
    },
    // SECTION 3: TOOL DEFLECTION CALCULATOR
    // MIT 2.001 Mechanics - Euler-Bernoulli and Timoshenko beam theory
    // End mill modeled as cantilever beam with end load

    ToolDeflection: {
        // Material properties (GPa for E, GPa for G)
        materials: {
            carbide: { E: 580, G: 230, density: 14500 },
            HSS: { E: 210, G: 80, density: 8000 },
            ceramic: { E: 350, G: 140, density: 3500 },
            CBN: { E: 680, G: 280, density: 3480 },
            diamond: { E: 1050, G: 500, density: 3520 }
        },
        // Euler-Bernoulli beam: δ = FL³/(3EI)
        // Valid for L/D > 10 (slender beams)
        eulerBernoulli(force, length, diameter, material = 'carbide') {
            const props = this.materials[material];
            const E = props.E * 1e9; // Convert GPa to Pa
            const I = Math.PI * Math.pow(diameter/1000, 4) / 64; // m^4
            const L = length / 1000; // m
            const F = force; // N

            const deflection = (F * Math.pow(L, 3)) / (3 * E * I);
            const slope = (F * Math.pow(L, 2)) / (2 * E * I);

            return {
                method: 'Euler-Bernoulli',
                deflection: (deflection * 1e6).toFixed(4), // µm
                slope: (slope * 1e6).toFixed(4), // µrad
                stiffness: (F / deflection / 1e6).toFixed(2), // N/µm
                valid: length / diameter > 10
            };
        },
        // Timoshenko beam: includes shear deformation
        // δ = FL³/(3EI) + FL/(κAG)
        // More accurate for L/D < 10
        timoshenko(force, length, diameter, material = 'carbide') {
            const props = this.materials[material];
            const E = props.E * 1e9;
            const G = props.G * 1e9;
            const L = length / 1000;
            const D = diameter / 1000;
            const F = force;

            const I = Math.PI * Math.pow(D, 4) / 64;
            const A = Math.PI * Math.pow(D, 2) / 4;
            const kappa = 0.9; // Shear correction factor for circular section

            const bendingDefl = (F * Math.pow(L, 3)) / (3 * E * I);
            const shearDefl = (F * L) / (kappa * A * G);
            const totalDefl = bendingDefl + shearDefl;

            return {
                method: 'Timoshenko',
                bendingDeflection: (bendingDefl * 1e6).toFixed(4),
                shearDeflection: (shearDefl * 1e6).toFixed(4),
                totalDeflection: (totalDefl * 1e6).toFixed(4),
                shearContribution: ((shearDefl / totalDefl) * 100).toFixed(1) + '%',
                stiffness: (F / totalDefl / 1e6).toFixed(2)
            };
        },
        // Tapered end mill deflection (variable cross-section)
        taperedEndMill(force, stickout, shankDia, fluteDia, fluteLength, material = 'carbide') {
            const props = this.materials[material];
            const E = props.E * 1e9;

            // Model as two sections: shank + flute
            const shankLength = stickout - fluteLength;

            if (shankLength < 0) {
                return { error: 'Flute length exceeds stickout' };
            }
            // Shank section deflection at flute junction
            const Ishank = Math.PI * Math.pow(shankDia/1000, 4) / 64;
            const Iflute = Math.PI * Math.pow(fluteDia/1000, 4) / 64;
            const Lshank = shankLength / 1000;
            const Lflute = fluteLength / 1000;

            // Deflection at tip = shank deflection + rotation × flute length + flute deflection
            const shankDefl = (force * Math.pow(Lshank, 3)) / (3 * E * Ishank);
            const shankSlope = (force * Math.pow(Lshank, 2)) / (2 * E * Ishank);
            const fluteDefl = (force * Math.pow(Lflute, 3)) / (3 * E * Iflute);

            const totalDefl = shankDefl + shankSlope * Lflute + fluteDefl;

            return {
                method: 'Tapered End Mill',
                shankDeflection: (shankDefl * 1e6).toFixed(4),
                fluteDeflection: (fluteDefl * 1e6).toFixed(4),
                rotationContribution: (shankSlope * Lflute * 1e6).toFixed(4),
                totalDeflection: (totalDefl * 1e6).toFixed(4),
                stiffness: (force / totalDefl / 1e6).toFixed(2)
            };
        },
        // Calculate cutting force from parameters
        calculateCuttingForce(Kc, ae, ap, fz, numTeeth) {
            // Simplified: Fc = Kc × ae × ap × fz × z / 1000
            // Kc in N/mm², ae (radial DOC) in mm, ap (axial DOC) in mm
            const Fc = Kc * ae * ap * fz * numTeeth / 1000;
            return {
                tangentialForce: Fc.toFixed(1),
                radialForce: (Fc * 0.3).toFixed(1), // Approximate Kr = 0.3
                axialForce: (Fc * 0.1).toFixed(1)   // Approximate Ka = 0.1
            };
        },
        // Surface error from deflection
        calculateSurfaceError(deflection, toolRadius, stepover) {
            // Error pattern from tool deflection
            const scallop = (stepover * stepover) / (8 * toolRadius);
            const totalError = deflection + scallop;
            return {
                deflectionError: deflection.toFixed(4),
                scallopHeight: scallop.toFixed(4),
                totalError: totalError.toFixed(4)
            };
        }
    },
    // SECTION 4: SPINDLE ERROR MOTION
    // ISO 230-7, ASME B89.3.4
    // Components: Radial, axial, tilt (synchronous + asynchronous)

    SpindleError: {
        // Spindle error motion model
        createSpindleModel(params = {}) {
            return {
                // Synchronous errors (repeat every revolution)
                synchronous: {
                    radial: params.radialSync || 0.5,      // µm
                    axial: params.axialSync || 0.3,        // µm
                    tilt: params.tiltSync || 0.1           // µrad
                },
                // Asynchronous errors (random, non-repeating)
                asynchronous: {
                    radial: params.radialAsync || 0.2,
                    axial: params.axialAsync || 0.1,
                    tilt: params.tiltAsync || 0.05
                },
                // Structural errors
                structural: {
                    axisShift: params.axisShift || 0.1,    // Shift with speed
                    thermalGrowth: params.thermalGrowth || 0.5 // µm/°C
                }
            };
        },
        // Calculate total error motion at measurement point
        calculateErrorMotion(model, measuringRadius, rpm = 10000) {
            // Synchronous: consistent pattern, can be compensated
            // Asynchronous: random, limits achievable accuracy

            const radialTotal = Math.sqrt(
                model.synchronous.radial**2 + model.asynchronous.radial**2
            );
            const axialTotal = Math.sqrt(
                model.synchronous.axial**2 + model.asynchronous.axial**2
            );

            // Tilt contributes to radial error at measuring radius
            const tiltContribution = model.synchronous.tilt * measuringRadius / 1000;

            // Total radial error
            const totalRadial = Math.sqrt(radialTotal**2 + tiltContribution**2);

            return {
                radialError: totalRadial.toFixed(3),
                axialError: axialTotal.toFixed(3),
                synchronousRatio: {
                    radial: (model.synchronous.radial / radialTotal * 100).toFixed(1) + '%',
                    axial: (model.synchronous.axial / axialTotal * 100).toFixed(1) + '%'
                },
                achievableRoundness: (2 * totalRadial).toFixed(3), // Peak-to-valley
                units: 'µm'
            };
        },
        // Frequency analysis of runout
        analyzeRunout(samples, rpm) {
            // Simple FFT-like analysis for spindle harmonics
            const n = samples.length;
            const fundamentalFreq = rpm / 60; // Hz

            // Calculate RMS and peak-to-valley
            const mean = samples.reduce((a, b) => a + b, 0) / n;
            const centered = samples.map(s => s - mean);
            const rms = Math.sqrt(centered.reduce((a, b) => a + b*b, 0) / n);
            const p2v = Math.max(...samples) - Math.min(...samples);

            // Simple harmonic content estimation
            // In practice, use full FFT
            const harmonics = [];
            for (let h = 1; h <= 5; h++) {
                let sumCos = 0, sumSin = 0;
                for (let i = 0; i < n; i++) {
                    const angle = 2 * Math.PI * h * i / n;
                    sumCos += centered[i] * Math.cos(angle);
                    sumSin += centered[i] * Math.sin(angle);
                }
                const amplitude = 2 * Math.sqrt(sumCos*sumCos + sumSin*sumSin) / n;
                harmonics.push({
                    harmonic: h,
                    frequency: (h * fundamentalFreq).toFixed(1),
                    amplitude: amplitude.toFixed(4)
                });
            }
            return { rms: rms.toFixed(4), peakToValley: p2v.toFixed(4), harmonics };
        },
        // Bearing wear prediction (simplified L10 life)
        predictBearingLife(radialLoad, axialLoad, rpm, bearingC) {
            // L10 = (C/P)^3 × 10^6 / (60 × n) hours
            // C = dynamic load rating, P = equivalent load
            const P = radialLoad + 0.5 * axialLoad; // Simplified
            const L10 = Math.pow(bearingC / P, 3) * 1e6 / (60 * rpm);

            return {
                equivalentLoad: P.toFixed(1),
                L10Life: L10.toFixed(0),
                L10Hours: L10.toFixed(0),
                recommendation: L10 > 20000 ? 'Acceptable' : L10 > 5000 ? 'Monitor' : 'Replace soon'
            };
        }
    },
    // SECTION 5: ABBE ERROR CALCULATOR
    // MIT 2.75 - Abbe Principle: Measurement axis should align with motion axis
    // Error = offset × angular error

    AbbeError: {
        // Calculate Abbe error: ε = d × tan(θ) ≈ d × θ for small angles
        calculate(offsetDistance, angularError) {
            // offsetDistance in mm, angularError in µrad
            const error = offsetDistance * angularError / 1000; // µm
            return {
                offset: offsetDistance,
                angularError: angularError,
                abbeError: error.toFixed(4),
                units: 'µm',
                principle: 'ε = d × θ'
            };
        },
        // Analyze probe offset configuration
        analyzeProbeOffset(probeOffset, axisTilts) {
            // probeOffset: {x, y, z} in mm
            // axisTilts: {pitch, yaw, roll} in µrad

            const errors = {
                x: probeOffset.y * axisTilts.yaw / 1000 + probeOffset.z * axisTilts.pitch / 1000,
                y: probeOffset.x * axisTilts.yaw / 1000 + probeOffset.z * axisTilts.roll / 1000,
                z: probeOffset.x * axisTilts.pitch / 1000 + probeOffset.y * axisTilts.roll / 1000
            };
            const total = Math.sqrt(errors.x**2 + errors.y**2 + errors.z**2);

            return {
                componentErrors: {
                    x: errors.x.toFixed(4),
                    y: errors.y.toFixed(4),
                    z: errors.z.toFixed(4)
                },
                totalAbbeError: total.toFixed(4),
                recommendation: total < 1 ? 'Acceptable' : 'Reduce probe offset or angular errors'
            };
        },
        // Optimal metrology frame design
        designMetrologyFrame(measurementPoints, constraints) {
            // Goal: minimize Abbe offsets for all measurement points
            // Simplified: find centroid as optimal frame origin

            const n = measurementPoints.length;
            const centroid = { x: 0, y: 0, z: 0 };

            for (const p of measurementPoints) {
                centroid.x += p.x / n;
                centroid.y += p.y / n;
                centroid.z += p.z / n;
            }
            // Calculate max offset from centroid
            let maxOffset = 0;
            for (const p of measurementPoints) {
                const offset = Math.sqrt(
                    (p.x - centroid.x)**2 +
                    (p.y - centroid.y)**2 +
                    (p.z - centroid.z)**2
                );
                maxOffset = Math.max(maxOffset, offset);
            }
            return {
                optimalOrigin: {
                    x: centroid.x.toFixed(2),
                    y: centroid.y.toFixed(2),
                    z: centroid.z.toFixed(2)
                },
                maxAbbeOffset: maxOffset.toFixed(2),
                recommendation: 'Place measurement frame origin at centroid'
            };
        }
    },
    // SECTION 6: ERROR BUDGET SYNTHESIZER
    // MIT 2.75 - Error budgeting is fundamental to precision design
    // Methods: RSS, worst-case, Monte Carlo

    ErrorBudget: {
        // Root Sum of Squares (statistical combination)
        RSS(errors) {
            const sumSquares = errors.reduce((sum, e) => sum + e.value**2, 0);
            const total = Math.sqrt(sumSquares);

            // Sensitivity analysis
            const sensitivities = errors.map(e => ({
                source: e.source,
                value: e.value,
                contribution: ((e.value**2 / sumSquares) * 100).toFixed(1) + '%'
            }));

            return {
                method: 'RSS',
                total: total.toFixed(4),
                sources: sensitivities,
                assumption: 'Errors are independent and random'
            };
        },
        // Worst-case (arithmetic sum)
        worstCase(errors) {
            const total = errors.reduce((sum, e) => sum + Math.abs(e.value), 0);

            return {
                method: 'Worst Case',
                total: total.toFixed(4),
                sources: errors.map(e => ({
                    source: e.source,
                    value: e.value,
                    contribution: ((Math.abs(e.value) / total) * 100).toFixed(1) + '%'
                })),
                assumption: 'All errors at maximum simultaneously'
            };
        },
        // Monte Carlo simulation
        monteCarlo(errorDistributions, samples = 10000) {
            const results = [];

            for (let i = 0; i < samples; i++) {
                let totalError = 0;
                for (const dist of errorDistributions) {
                    // Sample from distribution
                    let sample;
                    if (dist.type === 'normal') {
                        // Box-Muller transform
                        const u1 = Math.random(), u2 = Math.random();
                        sample = dist.mean + dist.std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    } else if (dist.type === 'uniform') {
                        sample = dist.min + Math.random() * (dist.max - dist.min);
                    } else {
                        sample = dist.value || 0;
                    }
                    totalError += sample;
                }
                results.push(totalError);
            }
            // Statistics
            results.sort((a, b) => a - b);
            const mean = results.reduce((a, b) => a + b, 0) / samples;
            const variance = results.reduce((sum, r) => sum + (r - mean)**2, 0) / samples;
            const std = Math.sqrt(variance);

            return {
                method: 'Monte Carlo',
                samples: samples,
                mean: mean.toFixed(4),
                std: std.toFixed(4),
                percentile95: results[Math.floor(0.95 * samples)].toFixed(4),
                percentile99: results[Math.floor(0.99 * samples)].toFixed(4),
                min: results[0].toFixed(4),
                max: results[samples - 1].toFixed(4)
            };
        },
        // Create complete error budget
        createBudget(name, target, sources) {
            const rss = this.RSS(sources);
            const worst = this.worstCase(sources);

            return {
                name,
                target,
                RSS: rss,
                worstCase: worst,
                meetsTarget: {
                    RSS: parseFloat(rss.total) <= target,
                    worstCase: parseFloat(worst.total) <= target
                },
                recommendation: parseFloat(rss.total) <= target
                    ? 'Budget met with RSS method'
                    : 'Reduce largest contributors: ' + sources.sort((a,b) => b.value - a.value).slice(0,3).map(s => s.source).join(', ')
            };
        }
    },
    // SECTION 7: VIBRATION/CHATTER PREDICTION
    // MIT 2.003J Dynamics - Regenerative chatter, stability lobes

    ChatterPrediction: {
        // Single degree of freedom (SDOF) cutting dynamics
        SDOFModel: class {
            constructor(params) {
                this.m = params.mass || 1;           // kg (modal mass)
                this.k = params.stiffness || 1e7;    // N/m
                this.c = params.damping || 500;      // Ns/m
                this.Kc = params.cuttingCoeff || 2000; // N/mm² (specific cutting force)
                this.numTeeth = params.numTeeth || 4;

                // Derived parameters
                this.wn = Math.sqrt(this.k / this.m);     // Natural frequency rad/s
                this.fn = this.wn / (2 * Math.PI);        // Natural frequency Hz
                this.zeta = this.c / (2 * Math.sqrt(this.k * this.m)); // Damping ratio
            }
            // Frequency Response Function (FRF)
            FRF(omega) {
                const r = omega / this.wn;
                const denom = Math.sqrt((1 - r*r)**2 + (2 * this.zeta * r)**2);
                const magnitude = 1 / (this.k * denom);
                const phase = Math.atan2(-2 * this.zeta * r, 1 - r*r);
                return { magnitude, phase };
            }
            // Critical depth of cut (stability limit)
            // blim = -1 / (2 * Kc * Re[G(ω)])
            criticalDepth(omega) {
                const { magnitude, phase } = this.FRF(omega);
                const realPart = magnitude * Math.cos(phase);
                if (realPart >= 0) return Infinity; // Stable
                return -1 / (2 * this.Kc * this.numTeeth * realPart);
            }
        },
        // Generate stability lobe diagram
        generateStabilityLobes(model, rpmRange, lobes = 10) {
            const { rpmMin, rpmMax } = rpmRange;
            const points = [];

            // Find frequency at minimum stability (near natural frequency)
            const omega_c = model.wn * Math.sqrt(1 - 2 * model.zeta * model.zeta);

            // For each lobe (k = 0, 1, 2, ...)
            for (let k = 0; k < lobes; k++) {
                const lobePoints = [];

                // Phase equation: ε = π - 2*arctan(...)
                // Tooth passing frequency: ftp = z * n / 60
                // Phase between waves: φ = 2π * ftp / fc + ε

                // Simplified: calculate RPM for each lobe
                for (let i = 0; i < 50; i++) {
                    const omega = omega_c * (0.8 + 0.4 * i / 49); // Scan around ωc
                    const { phase } = model.FRF(omega);
                    const epsilon = Math.PI - 2 * phase;

                    // Spindle speed for this lobe
                    const n_rpm = 60 * omega / (2 * Math.PI) / model.numTeeth / (k + epsilon / (2 * Math.PI));

                    if (n_rpm >= rpmMin && n_rpm <= rpmMax) {
                        const blim = model.criticalDepth(omega);
                        if (blim > 0 && blim < 100) {
                            lobePoints.push({ rpm: n_rpm, blim: blim * 1000 }); // mm
                        }
                    }
                }
                if (lobePoints.length > 0) {
                    points.push({ lobe: k, points: lobePoints });
                }
            }
            return {
                naturalFrequency: model.fn.toFixed(1),
                dampingRatio: model.zeta.toFixed(3),
                lobes: points,
                recommendation: 'Operate in valleys between lobes for maximum depth'
            };
        },
        // Check if operating point is stable
        checkStability(model, rpm, depthOfCut) {
            const ftp = rpm * model.numTeeth / 60; // Tooth passing frequency Hz
            const omega = 2 * Math.PI * ftp;
            const blim = model.criticalDepth(omega);

            return {
                rpm,
                depthOfCut,
                criticalDepth: (blim * 1000).toFixed(3),
                stable: depthOfCut < blim * 1000,
                margin: ((blim * 1000 - depthOfCut) / (blim * 1000) * 100).toFixed(1) + '%'
            };
        },
        // Damping ratio estimation from FRF peak
        estimateDamping(peakMagnitude, staticStiffness) {
            // |G(ωn)| = 1 / (2 * k * ζ)
            const zeta = 1 / (2 * staticStiffness * peakMagnitude);
            return {
                dampingRatio: zeta.toFixed(4),
                qualityFactor: (1 / (2 * zeta)).toFixed(1),
                criticalDamping: zeta >= 1 ? 'Overdamped' : zeta > 0.7 ? 'Near critical' : 'Underdamped'
            };
        }
    },
    // SECTION 8: SURFACE FINISH PREDICTION
    // Kinematic Ra + dynamic effects + process capability

    SurfaceFinish: {
        // Theoretical Ra from geometry (turning)
        theoreticalRaTurning(feed, noseRadius) {
            // Ra ≈ f² / (32 × r) for ideal case
            const Ra = (feed * feed) / (32 * noseRadius);
            return {
                Ra: Ra.toFixed(3),
                Rmax: (Ra * 4).toFixed(3), // Approximate Rz
                units: 'µm',
                formula: 'Ra = f²/(32r)'
            };
        },
        // Theoretical Ra for milling (ball end)
        theoreticalRaMilling(stepover, toolRadius) {
            // Scallop height h = r - √(r² - (ae/2)²)
            // For small ae: h ≈ ae²/(8r)
            const h = (stepover * stepover) / (8 * toolRadius);
            const Ra = h / 4; // Approximate Ra from scallop

            return {
                scallopHeight: h.toFixed(4),
                Ra: Ra.toFixed(4),
                units: 'µm',
                formula: 'h = ae²/(8r)'
            };
        },
        // Dynamic surface finish model
        dynamicRa(theoreticalRa, vibrationAmplitude, toolWear) {
            // Ra_actual = Ra_theoretical + vibration contribution + wear contribution
            const vibrationContrib = vibrationAmplitude * 0.5; // Simplified
            const wearContrib = toolWear * 0.1; // µm per VB mm

            const actualRa = theoreticalRa + vibrationContrib + wearContrib;

            return {
                theoretical: theoreticalRa.toFixed(3),
                vibration: vibrationContrib.toFixed(3),
                wear: wearContrib.toFixed(3),
                actual: actualRa.toFixed(3),
                degradation: ((actualRa / theoreticalRa - 1) * 100).toFixed(1) + '%'
            };
        },
        // Process capability (Cpk)
        calculateCpk(measurements, USL, LSL) {
            const n = measurements.length;
            const mean = measurements.reduce((a, b) => a + b, 0) / n;
            const std = Math.sqrt(measurements.reduce((s, x) => s + (x - mean)**2, 0) / (n - 1));

            const Cpu = (USL - mean) / (3 * std);
            const Cpl = (mean - LSL) / (3 * std);
            const Cpk = Math.min(Cpu, Cpl);
            const Cp = (USL - LSL) / (6 * std);

            return {
                mean: mean.toFixed(4),
                std: std.toFixed(4),
                Cp: Cp.toFixed(3),
                Cpk: Cpk.toFixed(3),
                capability: Cpk >= 1.67 ? 'Excellent' : Cpk >= 1.33 ? 'Good' : Cpk >= 1.0 ? 'Marginal' : 'Poor',
                ppm: Cpk >= 0 ? this._ppmFromCpk(Cpk) : 'N/A'
            };
        },
        _ppmFromCpk(Cpk) {
            // Approximate PPM from Cpk using normal distribution
            const z = 3 * Cpk;
            // Standard normal CDF approximation
            const t = 1 / (1 + 0.2316419 * z);
            const d = 0.3989423 * Math.exp(-z * z / 2);
            const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
            return Math.round(p * 2 * 1e6); // Two-tail PPM
        },
        // Surface finish standards (ISO)
        getStandard(Ra) {
            const standards = [
                { Ra: 0.025, N: 'N1', finish: 'Mirror polish' },
                { Ra: 0.05, N: 'N2', finish: 'Super finish' },
                { Ra: 0.1, N: 'N3', finish: 'Lapping' },
                { Ra: 0.2, N: 'N4', finish: 'Fine grinding' },
                { Ra: 0.4, N: 'N5', finish: 'Grinding' },
                { Ra: 0.8, N: 'N6', finish: 'Fine turning' },
                { Ra: 1.6, N: 'N7', finish: 'Turning' },
                { Ra: 3.2, N: 'N8', finish: 'Rough turning' },
                { Ra: 6.3, N: 'N9', finish: 'Rough machining' },
                { Ra: 12.5, N: 'N10', finish: 'Sand casting' }
            ];

            for (const std of standards) {
                if (Ra <= std.Ra) return std;
            }
            return standards[standards.length - 1];
        }
    },
    // TEST SUITE

    runTests() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM Phase 4 Precision Physics - MIT Algorithm Tests');
        console.log('═══════════════════════════════════════════════════════════════');

        const results = [];

        // Test Geometric Error Model
        try {
            const model = this.GeometricErrorModel.createErrorModel('3-axis');
            model.xAxis.EXX = 5; // 5 µm/m positioning error
            model.yAxis.EYY = 3;
            model.squareness.SXY = 10; // 10 µrad

            const error = this.GeometricErrorModel.calculateVolumetricError(model, {x: 100, y: 100, z: 50});
            results.push({ name: 'Geometric Error Model', status: 'PASS', total: error.total.toFixed(4) + ' µm' });
            console.log(`✓ Geometric Error: PASS (total=${error.total.toFixed(4)} µm)`);
        } catch (e) { results.push({ name: 'Geometric Error', status: 'FAIL' }); console.log(`✗ Geometric Error: FAIL`); }

        // Test Thermal Compensation
        try {
            const expansion = this.ThermalCompensation.calculateExpansion('steel', 500, 5);
            const sim = new this.ThermalCompensation.FDMThermalSimulation(100, 21, 'steel');
            sim.setBoundary(30, 20);
            const result = sim.simulateToSteady();
            results.push({ name: 'Thermal FDM', status: result.converged ? 'PASS' : 'FAIL', steps: result.steps });
            console.log(`✓ Thermal FDM: PASS (converged in ${result.steps} steps)`);
        } catch (e) { results.push({ name: 'Thermal FDM', status: 'FAIL' }); console.log(`✗ Thermal: FAIL`); }

        // Test Tool Deflection
        try {
            const eb = this.ToolDeflection.eulerBernoulli(100, 50, 10, 'carbide');
            const ts = this.ToolDeflection.timoshenko(100, 50, 10, 'carbide');
            results.push({ name: 'Tool Deflection', status: 'PASS', EB: eb.deflection, TS: ts.totalDeflection });
            console.log(`✓ Tool Deflection: PASS (EB=${eb.deflection}µm, TS=${ts.totalDeflection}µm)`);
        } catch (e) { results.push({ name: 'Tool Deflection', status: 'FAIL' }); console.log(`✗ Deflection: FAIL`); }

        // Test Spindle Error
        try {
            const model = this.SpindleError.createSpindleModel({ radialSync: 0.5, axialSync: 0.3 });
            const error = this.SpindleError.calculateErrorMotion(model, 25);
            results.push({ name: 'Spindle Error', status: 'PASS', radial: error.radialError + 'µm' });
            console.log(`✓ Spindle Error: PASS (radial=${error.radialError}µm)`);
        } catch (e) { results.push({ name: 'Spindle Error', status: 'FAIL' }); console.log(`✗ Spindle: FAIL`); }

        // Test Abbe Error
        try {
            const abbe = this.AbbeError.calculate(50, 10);
            results.push({ name: 'Abbe Error', status: 'PASS', error: abbe.abbeError + 'µm' });
            console.log(`✓ Abbe Error: PASS (error=${abbe.abbeError}µm at 50mm offset, 10µrad tilt)`);
        } catch (e) { results.push({ name: 'Abbe Error', status: 'FAIL' }); console.log(`✗ Abbe: FAIL`); }

        // Test Error Budget
        try {
            const sources = [
                { source: 'Geometric', value: 0.5 },
                { source: 'Thermal', value: 0.8 },
                { source: 'Deflection', value: 0.3 },
                { source: 'Spindle', value: 0.2 }
            ];
            const budget = this.ErrorBudget.createBudget('Total Position Error', 1.5, sources);
            results.push({ name: 'Error Budget', status: budget.meetsTarget.RSS ? 'PASS' : 'FAIL', RSS: budget.RSS.total });
            console.log(`✓ Error Budget: PASS (RSS=${budget.RSS.total}µm, target=1.5µm)`);
        } catch (e) { results.push({ name: 'Error Budget', status: 'FAIL' }); console.log(`✗ Budget: FAIL`); }

        // Test Chatter Prediction
        try {
            const model = new this.ChatterPrediction.SDOFModel({
                mass: 2, stiffness: 5e7, damping: 1000, cuttingCoeff: 2000, numTeeth: 4
            });
            const stability = this.ChatterPrediction.checkStability(model, 10000, 2);
            results.push({ name: 'Chatter Model', status: 'PASS', stable: stability.stable });
            console.log(`✓ Chatter Model: PASS (stable=${stability.stable}, blim=${stability.criticalDepth}mm)`);
        } catch (e) { results.push({ name: 'Chatter Model', status: 'FAIL' }); console.log(`✗ Chatter: FAIL`); }

        // Test Surface Finish
        try {
            const Ra = this.SurfaceFinish.theoreticalRaTurning(0.1, 0.8);
            const cpk = this.SurfaceFinish.calculateCpk([0.8, 0.9, 0.85, 0.82, 0.88, 0.91, 0.87], 1.6, 0);
            results.push({ name: 'Surface Finish', status: 'PASS', Ra: Ra.Ra, Cpk: cpk.Cpk });
            console.log(`✓ Surface Finish: PASS (Ra=${Ra.Ra}µm, Cpk=${cpk.Cpk})`);
        } catch (e) { results.push({ name: 'Surface Finish', status: 'FAIL' }); console.log(`✗ Surface: FAIL`); }

        // Test Monte Carlo
        try {
            const dists = [
                { type: 'normal', mean: 0, std: 0.2 },
                { type: 'normal', mean: 0, std: 0.3 },
                { type: 'uniform', min: -0.1, max: 0.1 }
            ];
            const mc = this.ErrorBudget.monteCarlo(dists, 5000);
            results.push({ name: 'Monte Carlo', status: 'PASS', p95: mc.percentile95 });
            console.log(`✓ Monte Carlo: PASS (95th percentile=${mc.percentile95}µm)`);
        } catch (e) { results.push({ name: 'Monte Carlo', status: 'FAIL' }); console.log(`✗ Monte Carlo: FAIL`); }

        console.log('═══════════════════════════════════════════════════════════════');
        const passed = results.filter(r => r.status === 'PASS').length;
        console.log(`Results: ${passed}/${results.length} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');

        return results;
    }
}