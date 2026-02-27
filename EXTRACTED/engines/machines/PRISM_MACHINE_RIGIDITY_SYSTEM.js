/**
 * PRISM_MACHINE_RIGIDITY_SYSTEM
 * Extracted from PRISM v8.89.002 monolith
 * References: 15
 * Lines: 87
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_MACHINE_RIGIDITY_SYSTEM = {
    version: '1.0.0',

    // Rigidity classes and their parameter multipliers
    classes: {
        'ultra_light': {
            speedMult: 0.7, feedMult: 0.6, docMult: 0.5, wocMult: 0.6,
            description: 'Desktop/hobby machines, router tables'
        },
        'light': {
            speedMult: 0.85, feedMult: 0.75, docMult: 0.7, wocMult: 0.75,
            description: 'Small VMCs, benchtop machines'
        },
        'medium': {
            speedMult: 1.0, feedMult: 1.0, docMult: 1.0, wocMult: 1.0,
            description: 'Standard VMCs (VF-2, DMC-V class)'
        },
        'heavy': {
            speedMult: 1.0, feedMult: 1.15, docMult: 1.25, wocMult: 1.2,
            description: 'Large VMCs, horizontal machining centers'
        },
        'ultra_rigid': {
            speedMult: 1.0, feedMult: 1.3, docMult: 1.5, wocMult: 1.4,
            description: 'Large HMCs, jig borers, heavy production'
        }
    },
    // Machine to rigidity mapping
    machineRigidity: {
        // Haas
        'HAAS_VF2': 'medium',
        'HAAS_VF4': 'medium',
        'HAAS_VF6': 'heavy',
        'HAAS_UMC750': 'medium',
        'HAAS_EC400': 'heavy',
        'HAAS_MINIMILL': 'light',
        'HAAS_OM2': 'light',

        // DMG MORI
        'DMG_DMU50': 'medium',
        'DMG_DMU80': 'heavy',
        'DMG_NHX5000': 'ultra_rigid',

        // Mazak
        'MAZAK_VCN530': 'heavy',
        'MAZAK_INTEGREX': 'ultra_rigid',

        // Okuma
        'OKUMA_GENOS': 'medium',
        'OKUMA_MB5000': 'heavy',

        // Makino
        'MAKINO_PS95': 'heavy',
        'MAKINO_A51': 'ultra_rigid'
    },
    /**
     * Get rigidity class for machine
     */
    getClass(machineId) {
        if (this.machineRigidity[machineId]) {
            return this.machineRigidity[machineId];
        }
        // Try partial match
        const id = machineId.toUpperCase();
        for (const [key, rigidity] of Object.entries(this.machineRigidity)) {
            if (id.includes(key) || key.includes(id)) {
                return rigidity;
            }
        }
        return 'medium'; // Default
    },
    /**
     * Apply rigidity adjustments to parameters
     */
    adjustParams(params, machineId) {
        const rigidityClass = this.getClass(machineId);
        const multipliers = this.classes[rigidityClass];

        return {
            sfm: Math.round(params.sfm * multipliers.speedMult),
            ipt: params.ipt * multipliers.feedMult,
            doc: params.doc * multipliers.docMult,
            woc: params.woc * multipliers.wocMult,
            rigidityClass,
            applied: multipliers
        };
    }
}