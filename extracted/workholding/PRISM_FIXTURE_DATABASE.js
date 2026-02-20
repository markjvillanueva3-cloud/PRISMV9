// PRISM_FIXTURE_DATABASE - Lines 723701-724025 (325 lines) - Fixture database\n\nconst PRISM_FIXTURE_DATABASE = {

    version: '1.0.0',
    created: '2026-01-14',
    description: 'Comprehensive fixture and workholding database for PRISM CAM',

    // MANUFACTURER DATABASES (Expandable)

    manufacturers: {
        kurt: null,      // Will be populated by PRISM_KURT_VISE_DATABASE
        schunk: null,    // Future: Schunk catalog
        lang: null,      // Future: Lang Technik
        jergens: null,   // Future: Jergens Ball-Lock
        fifth_axis: null // Future: 5th Axis
    },
    // FIXTURE CATEGORIES (Classification System)

    categories: {
        VISE: {
            code: 'VIS',
            subcategories: ['precision', 'production', 'self_centering', 'multi_station', 'modular', 'low_profile', 'double_station']
        },
        CHUCK: {
            code: 'CHK',
            subcategories: ['three_jaw', 'four_jaw', 'six_jaw', 'collet', 'power', 'diaphragm', 'magnetic']
        },
        FIXTURE_PLATE: {
            code: 'PLT',
            subcategories: ['grid_plate', 'subplate', 'vacuum', 't_slot']
        },
        TOMBSTONE: {
            code: 'TMB',
            subcategories: ['two_face', 'four_face', 'six_face', 'angle']
        },
        CLAMP: {
            code: 'CLP',
            subcategories: ['strap', 'toe', 'swing', 'toggle', 'cam', 'edge']
        },
        COLLET: {
            code: 'COL',
            subcategories: ['ER', 'R8', '5C', 'dead_length', 'expanding']
        },
        FIVE_AXIS: {
            code: '5AX',
            subcategories: ['dovetail', 'zero_point', 'pull_stud', 'grip']
        }
    },
    // STIFFNESS DATABASE
    // Critical for chatter prediction (N/μm typical values)

    stiffnessDefaults: {
        // Vises by size
        vise_4in: { kx: 100, ky: 130, kz: 220 },
        vise_6in: { kx: 150, ky: 200, kz: 300 },
        vise_8in: { kx: 200, ky: 260, kz: 400 },

        // Chucks
        chuck_6in: { radial: 150, axial: 350 },
        chuck_8in: { radial: 180, axial: 400 },
        chuck_10in: { radial: 220, axial: 500 },
        chuck_12in: { radial: 280, axial: 600 },
        collet_chuck: { radial: 300, axial: 600 },
        power_chuck: { radial: 350, axial: 700 },

        // Fixture plates (per inch thickness)
        plate_aluminum: { kz_per_inch: 50 },
        plate_steel: { kz_per_inch: 150 },
        plate_cast_iron: { kz_per_inch: 175 },

        // Zero-point systems
        zero_point: { kx: 400, ky: 400, kz: 800 },

        // Clamps (approximate)
        strap_clamp: { kz: 30 },
        toe_clamp: { kz: 20 },
        toggle_clamp: { kz: 15 }
    },
    // FRICTION COEFFICIENTS (for clamping force calculations)

    frictionCoefficients: {
        steel_on_steel_dry: 0.15,
        steel_on_steel_oily: 0.10,
        steel_on_aluminum: 0.12,
        aluminum_on_aluminum: 0.10,
        serrated_jaws: 0.25,
        diamond_jaws: 0.35,
        carbide_jaws: 0.30,
        smooth_jaws: 0.12,
        rubber_pads: 0.40,
        soft_jaws_machined: 0.20
    },
    // CLAMPING FORCE CALCULATIONS

    clampingCalculations: {

        // Safety factors by operation type
        safetyFactors: {
            finishing: 1.5,
            semi_finishing: 2.0,
            roughing: 2.5,
            heavy_roughing: 3.0,
            interrupted_cut: 3.5,
            slotting: 3.0
        },
        // Minimum clamping force: Fc_min = (F_cut × SF) / (μ × n)
        // F_cut = cutting force, SF = safety factor, μ = friction, n = clamps
        calculateMinClampingForce: function(cuttingForce, operationType, frictionType, numClamps) {
            const sf = this.safetyFactors[operationType] || 2.0;
            const mu = PRISM_FIXTURE_DATABASE.frictionCoefficients[frictionType] || 0.15;
            return (cuttingForce * sf) / (mu * numClamps);
        },
        // Vise torque to clamping force
        // F = (2π × T × η) / (d × tan(α))
        // T = torque (in-lbs), η = efficiency (~0.85), d = screw diameter, α = lead angle
        viseTorqueToForce: function(torque_in_lbs, screwDiameter_in, leadAngle_deg, efficiency) {
            efficiency = efficiency || 0.85;
            const alpha_rad = (leadAngle_deg || 3.5) * Math.PI / 180;
            return (2 * Math.PI * torque_in_lbs * efficiency) / (screwDiameter_in * Math.tan(alpha_rad));
        },
        // Hydraulic cylinder force
        // F = P × A = P × π × d²/4
        hydraulicForce: function(pressure_psi, pistonDiameter_in) {
            const area = Math.PI * Math.pow(pistonDiameter_in, 2) / 4;
            return pressure_psi * area;
        }
    },
    // FIXTURE SELECTION ENGINE

    selectionEngine: {

        // Main recommendation function
        recommendFixture: function(params) {
            const {
                partShape,       // 'prismatic', 'cylindrical', 'complex', 'thin_wall', 'round'
                partSize,        // { x, y, z } in inches
                machineType,     // 'vmc', 'hmc', 'lathe', '5axis'
                operation,       // 'roughing', 'finishing', 'drilling', etc.
                cuttingForce,    // Estimated cutting force in lbs
                multiSide,       // Boolean - need access to multiple sides?
                automation       // Boolean - automated cell?
            } = params;

            const recommendations = [];

            // === VISE SELECTION ===
            if (partShape === 'prismatic' && machineType !== 'lathe') {
                // Determine jaw width needed (part width + 0.5" minimum grip)
                const minJawWidth = Math.max(partSize.y + 0.5, 4);
                const jawWidth = minJawWidth <= 4 ? 4 : (minJawWidth <= 6 ? 6 : 8);

                // Get Kurt vises that match
                if (PRISM_KURT_VISE_DATABASE) {
                    let candidates = PRISM_KURT_VISE_DATABASE.vises.filter(v =>
                        v.jaw_width_in >= jawWidth &&
                        v.jaw_opening_in >= partSize.x
                    );

                    // Filter for 5-axis if needed
                    if (machineType === '5axis' || multiSide) {
                        candidates = candidates.filter(v => v.overall_height_in <= 3.5);
                    }
                    // Filter for automation
                    if (automation) {
                        candidates = candidates.filter(v => v.base_type.includes('52mm'));
                    }
                    // Sort by clamping force
                    candidates.sort((a, b) => b.clamping_force_lbs - a.clamping_force_lbs);

                    candidates.slice(0, 3).forEach(v => {
                        recommendations.push({
                            type: 'vise',
                            manufacturer: 'Kurt',
                            model: v.model,
                            series: v.series,
                            confidence: 0.9,
                            clamping_force: v.clamping_force_lbs,
                            reason: `${v.jaw_width_in}" jaw, ${v.jaw_opening_in}" opening, ${v.clamping_force_lbs} lbs force`
                        });
                    });
                }
            }
            // === CHUCK SELECTION (Lathe) ===
            if (machineType === 'lathe') {
                if (partShape === 'cylindrical' || partShape === 'round') {
                    const partDiameter = Math.max(partSize.x, partSize.y);

                    recommendations.push({
                        type: 'chuck',
                        subtype: 'three_jaw_scroll',
                        size: partDiameter < 4 ? '6_inch' : (partDiameter < 8 ? '8_inch' : '10_inch'),
                        confidence: 0.85,
                        reason: `Self-centering for round stock up to ${partDiameter}" diameter`
                    });

                    if (partDiameter < 2) {
                        recommendations.push({
                            type: 'collet',
                            subtype: 'collet_chuck',
                            confidence: 0.90,
                            reason: 'Higher precision for small diameter parts'
                        });
                    }
                }
            }
            // === 5-AXIS WORKHOLDING ===
            if (machineType === '5axis' || multiSide) {
                recommendations.push({
                    type: '5axis',
                    subtype: 'dovetail',
                    confidence: 0.80,
                    reason: 'Maximum tool access for multi-side machining'
                });

                if (automation) {
                    recommendations.push({
                        type: '5axis',
                        subtype: 'zero_point',
                        confidence: 0.85,
                        reason: 'Quick-change for automated cells'
                    });
                }
            }
            // === THIN WALL / DELICATE PARTS ===
            if (partShape === 'thin_wall') {
                recommendations.push({
                    type: 'vacuum',
                    confidence: 0.75,
                    reason: 'Minimal clamping distortion for thin parts'
                });

                recommendations.push({
                    type: 'chuck',
                    subtype: 'six_jaw_scroll',
                    confidence: 0.70,
                    reason: 'Even pressure distribution for thin-wall cylindrical parts'
                });
            }
            // Sort by confidence
            recommendations.sort((a, b) => b.confidence - a.confidence);

            return recommendations;
        }
    },
    // WORKPIECE DEFLECTION CALCULATION

    deflectionCalculations: {

        // Simple beam deflection under point load
        // δ = (F × L³) / (3 × E × I)
        cantileverDeflection: function(force_lbs, length_in, E_psi, momentOfInertia_in4) {
            return (force_lbs * Math.pow(length_in, 3)) / (3 * E_psi * momentOfInertia_in4);
        },
        // Simply supported beam, center load
        // δ = (F × L³) / (48 × E × I)
        simplySupportedDeflection: function(force_lbs, length_in, E_psi, momentOfInertia_in4) {
            return (force_lbs * Math.pow(length_in, 3)) / (48 * E_psi * momentOfInertia_in4);
        },
        // Rectangular cross-section moment of inertia
        // I = (b × h³) / 12
        rectangularMomentOfInertia: function(width_in, height_in) {
            return (width_in * Math.pow(height_in, 3)) / 12;
        },
        // Circular cross-section moment of inertia
        // I = (π × d⁴) / 64
        circularMomentOfInertia: function(diameter_in) {
            return (Math.PI * Math.pow(diameter_in, 4)) / 64;
        }
    },
    // INTEGRATION METHODS

    initialize: function() {
        // Link Kurt database if available
        if (typeof PRISM_KURT_VISE_DATABASE !== 'undefined') {
            this.manufacturers.kurt = PRISM_KURT_VISE_DATABASE;
            console.log('[PRISM Fixture] Kurt database linked: ' + PRISM_KURT_VISE_DATABASE.vises.length + ' vises');
        }
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM Fixture] Database initialized');
        return this;
    },
    // Get all vises from all manufacturers
    getAllVises: function() {
        const allVises = [];

        if (this.manufacturers.kurt) {
            allVises.push(...this.manufacturers.kurt.vises);
        }
        // Add other manufacturers as they're integrated

        return allVises;
    },
    // Search across all manufacturers
    searchFixtures: function(query) {
        const results = [];
        const allVises = this.getAllVises();

        const queryLower = query.toLowerCase();
        allVises.forEach(v => {
            if (v.model.toLowerCase().includes(queryLower) ||
                v.series.toLowerCase().includes(queryLower) ||
                v.manufacturer.toLowerCase().includes(queryLower)) {
                results.push(v);
            }
        });

        return results;
    },
    // Get fixture by ID
    getFixtureById: function(id) {
        const allVises = this.getAllVises();
        return allVises.find(v => v.id === id);
    },
    // Get stiffness for a fixture
    getStiffness: function(fixtureId) {
        const fixture = this.getFixtureById(fixtureId);
        if (fixture && fixture.stiffness) {
            return fixture.stiffness;
        }
        // Return default based on type
        if (fixtureId.includes('4')) return this.stiffnessDefaults.vise_4in;
        if (fixtureId.includes('6')) return this.stiffnessDefaults.vise_6in;
        if (fixtureId.includes('8')) return this.stiffnessDefaults.vise_8in;

        return this.stiffnessDefaults.vise_6in; // Default
    }
};
