const PRISM_WORKHOLDING_DATABASE = {
    version: '1.0.0',
    authority: 'PRISM_WORKHOLDING_DATABASE',

    // FIXTURE TYPES
    fixtureTypes: {
        vise: {
            name: 'Machine Vise',
            category: 'standard',
            baseRigidity: 0.9,
            baseDamping: 0.85,
            clampingMethod: 'parallel_jaws',
            typicalClampingForce: { min: 15000, max: 60000 },  // N
            setupTime: 5,  // minutes typical
            repeatability: 0.01  // mm
        },
        hydraulic_vise: {
            name: 'Hydraulic Vise',
            category: 'premium',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'hydraulic_jaws',
            typicalClampingForce: { min: 25000, max: 80000 },
            setupTime: 3,
            repeatability: 0.005
        },
        chuck_3jaw: {
            name: '3-Jaw Chuck',
            category: 'turning',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'scroll_chuck',
            typicalClampingForce: { min: 20000, max: 100000 },
            setupTime: 5,
            repeatability: 0.05  // concentricity
        },
        chuck_6jaw: {
            name: '6-Jaw Chuck',
            category: 'turning',
            baseRigidity: 0.90,
            baseDamping: 0.85,
            clampingMethod: 'scroll_chuck',
            typicalClampingForce: { min: 25000, max: 120000 },
            setupTime: 5,
            repeatability: 0.02
        },
        collet_chuck: {
            name: 'Collet Chuck',
            category: 'turning',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'collet',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 2,
            repeatability: 0.01
        },
        vacuum: {
            name: 'Vacuum Table',
            category: 'specialty',
            baseRigidity: 0.60,
            baseDamping: 0.50,
            clampingMethod: 'vacuum',
            typicalClampingForce: { min: 5000, max: 20000 },  // depends on area
            setupTime: 2,
            repeatability: 0.1
        },
        magnetic: {
            name: 'Magnetic Chuck',
            category: 'specialty',
            baseRigidity: 0.70,
            baseDamping: 0.65,
            clampingMethod: 'magnetic',
            typicalClampingForce: { min: 10000, max: 40000 },
            setupTime: 1,
            repeatability: 0.05
        },
        fixture_plate: {
            name: 'Modular Fixture Plate',
            category: 'custom',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'toe_clamps',
            typicalClampingForce: { min: 8000, max: 30000 },
            setupTime: 15,
            repeatability: 0.02
        },
        tombstone: {
            name: 'Tombstone/Column',
            category: 'production',
            baseRigidity: 0.75,
            baseDamping: 0.70,
            clampingMethod: 'multi_face',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 20,
            repeatability: 0.02
        },
        pallet: {
            name: 'Pallet System',
            category: 'production',
            baseRigidity: 0.90,
            baseDamping: 0.85,
            clampingMethod: 'zero_point',
            typicalClampingForce: { min: 30000, max: 100000 },
            setupTime: 1,  // pallet change time
            repeatability: 0.005
        },
        soft_jaws: {
            name: 'Machined Soft Jaws',
            category: 'custom',
            baseRigidity: 0.95,
            baseDamping: 0.90,
            clampingMethod: 'profiled_jaws',
            typicalClampingForce: { min: 20000, max: 60000 },
            setupTime: 30,  // includes machining
            repeatability: 0.01
        },
        expanding_mandrel: {
            name: 'Expanding Mandrel',
            category: 'id_clamping',
            baseRigidity: 0.85,
            baseDamping: 0.80,
            clampingMethod: 'internal_expansion',
            typicalClampingForce: { min: 15000, max: 50000 },
            setupTime: 5,
            repeatability: 0.01
        }
    },
    // SPECIFIC WORKHOLDING PRODUCTS
    products: {
        // Kurt Vises
        'kurt_dl640': {
            manufacturer: 'Kurt',
            model: 'DL640',
            type: 'vise',
            jawWidth: 152,      // mm
            maxOpening: 175,    // mm
            clampingForce: 40000,  // N
            weight: 54,         // kg
            rigidityFactor: 0.95,
            damping: 0.90
        },
        'kurt_anglock': {
            manufacturer: 'Kurt',
            model: 'AngLock',
            type: 'vise',
            jawWidth: 152,
            maxOpening: 178,
            clampingForce: 35000,
            weight: 45,
            rigidityFactor: 0.92,
            damping: 0.88
        },
        // Schunk
        'schunk_kontec_ks': {
            manufacturer: 'Schunk',
            model: 'KONTEC KS',
            type: 'hydraulic_vise',
            jawWidth: 125,
            maxOpening: 160,
            clampingForce: 55000,
            weight: 38,
            rigidityFactor: 0.97,
            damping: 0.92
        },
        // Lang Technik
        'lang_makro_grip': {
            manufacturer: 'Lang Technik',
            model: 'Makro-Grip',
            type: 'vise',
            jawWidth: 125,
            maxOpening: 172,
            clampingForce: 48000,
            weight: 35,
            rigidityFactor: 0.94,
            damping: 0.89,
            fiveAxisCapable: true
        },
        // Mitee-Bite
        'miteebite_pitbull': {
            manufacturer: 'Mitee-Bite',
            model: 'Pitbull',
            type: 'fixture_plate',
            jawWidth: 38,
            maxOpening: 50,
            clampingForce: 8000,
            weight: 0.5,
            rigidityFactor: 0.80,
            damping: 0.75,
            lowProfile: true
        }
    },
    // RIGIDITY CALCULATION

    calculateRigidity: function(workholding) {
        const {
            fixtureType,
            product,
            partMass,
            overhang,
            contactArea,
            clampingForce
        } = workholding;

        // Get base rigidity from fixture type
        let baseRigidity = this.fixtureTypes[fixtureType]?.baseRigidity || 0.80;
        let baseDamping = this.fixtureTypes[fixtureType]?.baseDamping || 0.75;

        // Override with specific product if available
        if (product && this.products[product]) {
            baseRigidity = this.products[product].rigidityFactor || baseRigidity;
            baseDamping = this.products[product].damping || baseDamping;
        }
        // Part mass factor (heavier parts are more stable)
        const massFactor = Math.min(1.0, 0.7 + (partMass || 1) * 0.03);

        // Overhang penalty (more overhang = less rigid)
        const overhangPenalty = overhang ? Math.max(0.5, 1.0 - overhang * 0.01) : 1.0;

        // Contact area bonus
        const contactBonus = contactArea ? Math.min(1.15, 0.9 + contactArea * 0.0001) : 1.0;

        // Clamping force factor
        const typicalForce = this.fixtureTypes[fixtureType]?.typicalClampingForce?.max || 40000;
        const forceFactor = clampingForce ? Math.min(1.1, 0.8 + (clampingForce / typicalForce) * 0.3) : 1.0;

        const finalRigidity = baseRigidity * massFactor * overhangPenalty * contactBonus * forceFactor;
        const finalDamping = baseDamping * Math.sqrt(massFactor * overhangPenalty);

        return {
            rigidity: Math.min(1.0, finalRigidity),
            damping: Math.min(1.0, finalDamping),
            factors: {
                base: baseRigidity,
                mass: massFactor,
                overhang: overhangPenalty,
                contact: contactBonus,
                force: forceFactor
            }
        };
    },
    // Calculate maximum safe cutting force
    calculateMaxCuttingForce: function(workholding) {
        const rigidity = this.calculateRigidity(workholding);
        const clampingForce = workholding.clampingForce ||
            this.fixtureTypes[workholding.fixtureType]?.typicalClampingForce?.max || 30000;

        const frictionCoef = workholding.frictionCoefficient || 0.3;
        const safetyFactor = 2.0;

        // Maximum force that won't cause part slip
        const maxForce = (clampingForce * frictionCoef) / safetyFactor;

        return {
            maxCuttingForce: maxForce,
            clampingForce: clampingForce,
            rigidityScore: Math.round(rigidity.rigidity * 100)
        };
    }
}