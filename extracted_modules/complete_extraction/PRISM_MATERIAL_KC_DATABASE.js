const PRISM_MATERIAL_KC_DATABASE = {
    version: '1.0.0',

    // Kc1.1 values in N/mm² (specific cutting force at 1mm chip thickness)
    materials: {
        // Aluminum alloys
        'aluminum_1100': { Kc11: 350, mc: 0.25, group: 'N' },
        'aluminum_6061': { Kc11: 700, mc: 0.25, group: 'N' },
        'aluminum_7075': { Kc11: 800, mc: 0.25, group: 'N' },
        'aluminum_cast': { Kc11: 600, mc: 0.25, group: 'N' },

        // Carbon steels
        'steel_1018': { Kc11: 1800, mc: 0.25, group: 'P' },
        'steel_1045': { Kc11: 2000, mc: 0.25, group: 'P' },
        'steel_4140': { Kc11: 2200, mc: 0.25, group: 'P' },
        'steel_4340': { Kc11: 2400, mc: 0.25, group: 'P' },
        'mild_steel_1018': { Kc11: 1800, mc: 0.25, group: 'P' },

        // Stainless steels
        'stainless_304': { Kc11: 2800, mc: 0.22, group: 'M' },
        'stainless_316': { Kc11: 2900, mc: 0.22, group: 'M' },
        'stainless_17-4ph': { Kc11: 3200, mc: 0.22, group: 'M' },

        // Cast iron
        'cast_iron_gray': { Kc11: 1100, mc: 0.28, group: 'K' },
        'cast_iron_ductile': { Kc11: 1400, mc: 0.26, group: 'K' },

        // Titanium
        'titanium_cp': { Kc11: 1400, mc: 0.23, group: 'S' },
        'titanium_6al4v': { Kc11: 1600, mc: 0.23, group: 'S' },

        // Superalloys
        'inconel_718': { Kc11: 3000, mc: 0.21, group: 'S' },
        'inconel_625': { Kc11: 2800, mc: 0.21, group: 'S' },
        'hastelloy_x': { Kc11: 3200, mc: 0.20, group: 'S' },

        // Hardened steels
        'hardened_steel_45hrc': { Kc11: 4000, mc: 0.18, group: 'H' },
        'hardened_steel_55hrc': { Kc11: 5000, mc: 0.16, group: 'H' },
        'hardened_steel_62hrc': { Kc11: 6500, mc: 0.14, group: 'H' }
    },
    /**
     * Get Kc for material
     */
    getKc(materialId) {
        const key = materialId.toLowerCase().replace(/[- ]/g, '_');

        // Direct match
        if (this.materials[key]) {
            return this.materials[key];
        }
        // Partial match
        for (const [matKey, data] of Object.entries(this.materials)) {
            if (key.includes(matKey) || matKey.includes(key)) {
                return data;
            }
        }
        // Default to mild steel
        return this.materials['steel_1018'];
    },
    /**
     * Calculate cutting force
     */
    calculateForce(materialId, chipThickness, chipWidth) {
        const kc = this.getKc(materialId);
        // Kc = Kc1.1 * h^(-mc)
        const kcActual = kc.Kc11 * Math.pow(chipThickness, -kc.mc);
        const force = kcActual * chipThickness * chipWidth;
        return {
            Kc: Math.round(kcActual),
            force: Math.round(force),
            unit: 'N'
        };
    }
}