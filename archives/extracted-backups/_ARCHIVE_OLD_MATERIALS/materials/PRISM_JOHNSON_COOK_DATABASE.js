/**
 * PRISM_JOHNSON_COOK_DATABASE
 * Extracted: Session 1.A.1 - January 22, 2026
 * Source: PRISM v8.89.002 (Line info in extraction-index)
 * Lines: 150
 * 
 * Part of PRISM Materials Database Category
 */


const PRISM_JOHNSON_COOK_DATABASE = {
    name: 'PRISM Johnson-Cook Strain Rate Database',
    version: '2.0.0',
    mitSource: 'MIT 3.22 - Mechanical Behavior of Materials',
    description: 'Comprehensive strain-rate sensitivity parameters for high-speed machining',

    // Common reference values
    constants: {
        eps_dot_ref: 1.0,      // Reference strain rate (1/s)
        T_room: 293,           // Room temperature (K)
    },
    // STEELS - Johnson-Cook Parameters
    steels: {
        // Low Carbon Steels
        '1020': { A: 310, B: 530, n: 0.26, C: 0.014, m: 0.9, T_melt: 1808 },
        '1045': { A: 553, B: 601, n: 0.234, C: 0.0134, m: 1.0, T_melt: 1793 },
        '1050': { A: 500, B: 550, n: 0.25, C: 0.015, m: 1.0, T_melt: 1785 },
        '12L14': { A: 400, B: 500, n: 0.31, C: 0.020, m: 0.95, T_melt: 1783 },

        // Medium Carbon Steels
        '4130': { A: 595, B: 580, n: 0.30, C: 0.023, m: 1.03, T_melt: 1803 },
        '4140': { A: 598, B: 768, n: 0.29, C: 0.014, m: 0.99, T_melt: 1793 },
        '4350': { A: 820, B: 600, n: 0.28, C: 0.015, m: 1.05, T_melt: 1785 },

        // Alloy Steels
        '8620': { A: 450, B: 640, n: 0.33, C: 0.018, m: 0.95, T_melt: 1803 },
        '9310': { A: 520, B: 680, n: 0.31, C: 0.016, m: 1.0, T_melt: 1793 },
        '52100': { A: 900, B: 650, n: 0.25, C: 0.012, m: 1.1, T_melt: 1788 },
        '300M': { A: 1150, B: 700, n: 0.24, C: 0.011, m: 1.15, T_melt: 1773 },
        'Maraging_300': { A: 1200, B: 500, n: 0.20, C: 0.010, m: 1.2, T_melt: 1723 },

        // Tool Steels
        'A2': { A: 1100, B: 800, n: 0.22, C: 0.008, m: 1.1, T_melt: 1700 },
        'D2': { A: 1200, B: 850, n: 0.20, C: 0.007, m: 1.15, T_melt: 1695 },
        'H13': { A: 950, B: 750, n: 0.24, C: 0.010, m: 1.05, T_melt: 1700 },
        'M2': { A: 1050, B: 820, n: 0.23, C: 0.009, m: 1.08, T_melt: 1705 },
        'O1': { A: 900, B: 720, n: 0.25, C: 0.011, m: 1.03, T_melt: 1710 },
        'S7': { A: 880, B: 700, n: 0.26, C: 0.012, m: 1.0, T_melt: 1715 }
    },
    // STAINLESS STEELS - Johnson-Cook Parameters
    stainless: {
        // Austenitic
        '304': { A: 310, B: 1000, n: 0.65, C: 0.07, m: 1.0, T_melt: 1723 },
        '304L': { A: 280, B: 950, n: 0.67, C: 0.068, m: 0.98, T_melt: 1723 },
        '316': { A: 305, B: 1161, n: 0.61, C: 0.01, m: 1.0, T_melt: 1673 },
        '316L': { A: 290, B: 1100, n: 0.63, C: 0.011, m: 0.98, T_melt: 1673 },
        '321': { A: 320, B: 1050, n: 0.60, C: 0.065, m: 1.02, T_melt: 1693 },
        '347': { A: 330, B: 1080, n: 0.58, C: 0.060, m: 1.0, T_melt: 1693 },

        // Martensitic
        '410': { A: 450, B: 750, n: 0.45, C: 0.025, m: 1.05, T_melt: 1753 },
        '420': { A: 550, B: 800, n: 0.40, C: 0.020, m: 1.1, T_melt: 1753 },
        '440C': { A: 750, B: 900, n: 0.32, C: 0.015, m: 1.2, T_melt: 1713 },

        // PH Stainless
        '17_4PH': { A: 650, B: 850, n: 0.38, C: 0.018, m: 1.08, T_melt: 1713 },
        '15_5PH': { A: 680, B: 880, n: 0.36, C: 0.017, m: 1.1, T_melt: 1718 },

        // Duplex
        '2205': { A: 480, B: 920, n: 0.48, C: 0.030, m: 1.0, T_melt: 1673 },
        '2507': { A: 550, B: 980, n: 0.45, C: 0.028, m: 1.02, T_melt: 1658 }
    },
    // ALUMINUM ALLOYS - Johnson-Cook Parameters
    aluminum: {
        // 2xxx Series (Aerospace)
        '2024_T351': { A: 369, B: 684, n: 0.73, C: 0.0083, m: 1.7, T_melt: 775 },
        '2014_T6': { A: 290, B: 450, n: 0.36, C: 0.014, m: 1.0, T_melt: 780 },
        '2219_T87': { A: 320, B: 400, n: 0.32, C: 0.012, m: 1.1, T_melt: 800 },

        // 6xxx Series (General Purpose)
        '6061_T6': { A: 324, B: 114, n: 0.42, C: 0.002, m: 1.34, T_melt: 855 },
        '6082_T6': { A: 280, B: 140, n: 0.40, C: 0.003, m: 1.30, T_melt: 855 },
        '6063_T6': { A: 200, B: 100, n: 0.45, C: 0.004, m: 1.25, T_melt: 880 },

        // 7xxx Series (High Strength)
        '7075_T6': { A: 520, B: 477, n: 0.52, C: 0.001, m: 1.61, T_melt: 750 },
        '7050_T7451': { A: 480, B: 450, n: 0.50, C: 0.002, m: 1.55, T_melt: 760 },
        '7475_T761': { A: 450, B: 420, n: 0.48, C: 0.003, m: 1.50, T_melt: 755 },

        // Cast Alloys
        'A356_T6': { A: 180, B: 250, n: 0.38, C: 0.008, m: 1.2, T_melt: 830 },
        'A380': { A: 150, B: 200, n: 0.40, C: 0.010, m: 1.1, T_melt: 850 }
    },
    // TITANIUM ALLOYS - Johnson-Cook Parameters
    titanium: {
        'Ti_Grade2': { A: 380, B: 550, n: 0.45, C: 0.032, m: 0.7, T_melt: 1941 },
        'Ti_Grade5': { A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8, T_melt: 1878 },  // Ti-6Al-4V
        'Ti6Al4V_ELI': { A: 850, B: 350, n: 0.35, C: 0.013, m: 0.82, T_melt: 1878 },
        'Ti_6246': { A: 920, B: 450, n: 0.38, C: 0.011, m: 0.85, T_melt: 1883 },
        'Ti_5553': { A: 1050, B: 500, n: 0.32, C: 0.010, m: 0.9, T_melt: 1873 },
        'Ti_17': { A: 980, B: 480, n: 0.35, C: 0.011, m: 0.88, T_melt: 1885 },
        'Ti_Beta_C': { A: 950, B: 550, n: 0.40, C: 0.015, m: 0.75, T_melt: 1888 }
    },
    // NICKEL SUPERALLOYS - Johnson-Cook Parameters
    nickel: {
        'Inconel_625': { A: 1200, B: 1400, n: 0.65, C: 0.017, m: 1.3, T_melt: 1623 },
        'Inconel_600': { A: 550, B: 1200, n: 0.70, C: 0.020, m: 1.2, T_melt: 1686 },
        'Waspaloy': { A: 1100, B: 600, n: 0.55, C: 0.015, m: 1.25, T_melt: 1603 },
        'Hastelloy_X': { A: 800, B: 1000, n: 0.62, C: 0.018, m: 1.15, T_melt: 1633 },
        'Rene_41': { A: 950, B: 700, n: 0.58, C: 0.014, m: 1.22, T_melt: 1598 },
        'Udimet_720': { A: 1000, B: 750, n: 0.56, C: 0.013, m: 1.28, T_melt: 1593 },
        'Haynes_230': { A: 680, B: 900, n: 0.60, C: 0.016, m: 1.18, T_melt: 1628 }
    },
    // COPPER ALLOYS - Johnson-Cook Parameters
    copper: {
        'C10100': { A: 90, B: 292, n: 0.31, C: 0.025, m: 1.09, T_melt: 1356 },
        'C11000': { A: 85, B: 280, n: 0.32, C: 0.024, m: 1.08, T_melt: 1356 },
        'C17200': { A: 350, B: 500, n: 0.35, C: 0.020, m: 1.0, T_melt: 1338 },  // Beryllium Copper
        'C26000': { A: 120, B: 350, n: 0.38, C: 0.018, m: 1.05, T_melt: 1188 },  // Brass
        'C36000': { A: 140, B: 280, n: 0.35, C: 0.015, m: 1.02, T_melt: 1173 },  // Free-cutting brass
        'C51000': { A: 200, B: 420, n: 0.40, C: 0.022, m: 1.1, T_melt: 1223 }   // Phosphor bronze
    },
    // Utility function to calculate flow stress
    calculateFlowStress: function(materialId, strain, strainRate, temp) {
        // Find material in any category
        let params = null;
        for (const category of [this.steels, this.stainless, this.aluminum, this.titanium, this.nickel, this.copper]) {
            if (category[materialId]) {
                params = category[materialId];
                break;
            }
        }
        if (!params) {
            console.warn(`[PRISM JC] No Johnson-Cook params for ${materialId}`);
            return null;
        }
        const { A, B, n, C, m, T_melt } = params;
        const T_room = this.constants.T_room;
        const eps_dot_0 = this.constants.eps_dot_ref;

        // σ = [A + B*ε^n] * [1 + C*ln(ε̇/ε̇₀)] * [1 - T*^m]
        const term1 = A + B * Math.pow(Math.max(strain, 0.001), n);
        const term2 = 1 + C * Math.log(Math.max(strainRate / eps_dot_0, 1));
        const T_star = Math.max(0, Math.min(1, (temp - T_room) / (T_melt - T_room)));
        const term3 = 1 - Math.pow(T_star, m);

        return term1 * term2 * term3;
    },
    // Get all available materials
    getAllMaterials: function() {
        return [
            ...Object.keys(this.steels),
            ...Object.keys(this.stainless),
            ...Object.keys(this.aluminum),
            ...Object.keys(this.titanium),
            ...Object.keys(this.nickel),
            ...Object.keys(this.copper)
        ];
    }
};
