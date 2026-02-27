/**
 * PRISM_THERMAL_PROPERTIES
 * Extracted from PRISM v8.89.002 monolith
 * References: 31
 * Category: thermal
 * Lines: 104
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_THERMAL_PROPERTIES = {
    name: 'PRISM Thermal Properties Database',
    version: '2.0.0',
    description: 'Comprehensive thermal characterization for precision machining',

    // STEELS - Thermal Properties
    // k: thermal conductivity (W/m·K)
    // cp: specific heat (J/kg·K)
    // alpha: thermal expansion (µm/m·K)
    // T_max: max service temp (°C)
    steels: {
        // Low Carbon
        '1018': { k: 51.9, cp: 486, alpha: 12.0, T_max: 538, density: 7870 },
        '1020': { k: 51.9, cp: 486, alpha: 11.7, T_max: 538, density: 7870 },
        '1045': { k: 49.8, cp: 486, alpha: 11.3, T_max: 427, density: 7850 },
        '12L14': { k: 50.0, cp: 472, alpha: 11.9, T_max: 427, density: 7870 },

        // Medium Carbon / Alloy
        '4130': { k: 42.7, cp: 477, alpha: 12.2, T_max: 482, density: 7850 },
        '4140': { k: 42.7, cp: 473, alpha: 12.3, T_max: 482, density: 7850 },
        '4340': { k: 44.5, cp: 475, alpha: 12.3, T_max: 538, density: 7850 },
        '8620': { k: 46.6, cp: 477, alpha: 12.0, T_max: 482, density: 7850 },
        '52100': { k: 46.6, cp: 475, alpha: 12.5, T_max: 177, density: 7830 },

        // Tool Steels
        'A2': { k: 24.0, cp: 460, alpha: 10.9, T_max: 538, density: 7860 },
        'D2': { k: 20.0, cp: 460, alpha: 10.4, T_max: 425, density: 7700 },
        'H13': { k: 28.6, cp: 460, alpha: 11.0, T_max: 593, density: 7800 },
        'M2': { k: 19.0, cp: 420, alpha: 11.5, T_max: 595, density: 8160 },
        'O1': { k: 45.0, cp: 460, alpha: 11.0, T_max: 260, density: 7850 },
        'S7': { k: 38.0, cp: 460, alpha: 12.3, T_max: 538, density: 7830 }
    },
    // STAINLESS STEELS - Thermal Properties
    stainless: {
        '304': { k: 16.2, cp: 500, alpha: 17.3, T_max: 870, density: 8000 },
        '304L': { k: 16.2, cp: 500, alpha: 17.3, T_max: 870, density: 8000 },
        '316': { k: 16.3, cp: 500, alpha: 16.0, T_max: 870, density: 8000 },
        '316L': { k: 16.3, cp: 500, alpha: 16.0, T_max: 870, density: 8000 },
        '410': { k: 24.9, cp: 460, alpha: 9.9, T_max: 760, density: 7740 },
        '420': { k: 24.9, cp: 460, alpha: 10.3, T_max: 760, density: 7740 },
        '440C': { k: 24.2, cp: 460, alpha: 10.2, T_max: 760, density: 7650 },
        '17_4PH': { k: 18.4, cp: 460, alpha: 10.8, T_max: 593, density: 7780 },
        '2205': { k: 19.0, cp: 500, alpha: 13.0, T_max: 315, density: 7820 }
    },
    // ALUMINUM ALLOYS - Thermal Properties
    aluminum: {
        '2024_T3': { k: 121, cp: 875, alpha: 22.8, T_max: 177, density: 2780 },
        '2024_T351': { k: 121, cp: 875, alpha: 22.8, T_max: 177, density: 2780 },
        '6061_T6': { k: 167, cp: 896, alpha: 23.6, T_max: 177, density: 2700 },
        '6082_T6': { k: 170, cp: 898, alpha: 24.0, T_max: 177, density: 2700 },
        '7075_T6': { k: 130, cp: 960, alpha: 23.4, T_max: 121, density: 2810 },
        '7050_T7451': { k: 155, cp: 860, alpha: 23.5, T_max: 121, density: 2830 },
        'A356_T6': { k: 150, cp: 963, alpha: 21.5, T_max: 177, density: 2680 }
    },
    // TITANIUM ALLOYS - Thermal Properties
    titanium: {
        'Ti_Grade2': { k: 16.4, cp: 523, alpha: 8.6, T_max: 482, density: 4510 },
        'Ti_Grade5': { k: 6.7, cp: 526, alpha: 8.6, T_max: 400, density: 4430 },
        'Ti6Al4V': { k: 6.7, cp: 526, alpha: 8.6, T_max: 400, density: 4430 },
        'Ti_6246': { k: 7.0, cp: 500, alpha: 8.5, T_max: 450, density: 4650 },
        'Ti_5553': { k: 7.5, cp: 520, alpha: 8.3, T_max: 400, density: 4640 }
    },
    // NICKEL SUPERALLOYS - Thermal Properties
    nickel: {
        'Inconel_718': { k: 11.4, cp: 435, alpha: 13.0, T_max: 704, density: 8190 },
        'Inconel_625': { k: 9.8, cp: 410, alpha: 12.8, T_max: 982, density: 8440 },
        'Inconel_600': { k: 14.9, cp: 444, alpha: 13.3, T_max: 1095, density: 8470 },
        'Waspaloy': { k: 11.7, cp: 418, alpha: 12.7, T_max: 870, density: 8190 },
        'Hastelloy_X': { k: 9.2, cp: 473, alpha: 15.9, T_max: 1095, density: 8220 }
    },
    // COPPER ALLOYS - Thermal Properties
    copper: {
        'C10100': { k: 391, cp: 385, alpha: 16.5, T_max: 260, density: 8940 },
        'C11000': { k: 388, cp: 385, alpha: 17.0, T_max: 260, density: 8940 },
        'C17200': { k: 105, cp: 420, alpha: 17.8, T_max: 315, density: 8250 },
        'C26000': { k: 120, cp: 377, alpha: 20.0, T_max: 260, density: 8530 },
        'C36000': { k: 115, cp: 380, alpha: 20.5, T_max: 260, density: 8500 }
    },
    // Get thermal properties for any material
    getProperties: function(materialId) {
        for (const category of [this.steels, this.stainless, this.aluminum, this.titanium, this.nickel, this.copper]) {
            if (category[materialId]) {
                return { ...category[materialId], id: materialId };
            }
        }
        return null;
    },
    // Calculate thermal expansion
    calculateExpansion: function(materialId, length_mm, deltaT) {
        const props = this.getProperties(materialId);
        if (!props) return null;

        // ΔL = L₀ × α × ΔT (in µm)
        return length_mm * props.alpha * deltaT;
    },
    // Calculate heat capacity
    calculateHeatCapacity: function(materialId, mass_kg) {
        const props = this.getProperties(materialId);
        if (!props) return null;

        // Q = m × cp (J/K)
        return mass_kg * props.cp;
    }
}