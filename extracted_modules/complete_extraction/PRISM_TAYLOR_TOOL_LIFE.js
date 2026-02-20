const PRISM_TAYLOR_TOOL_LIFE = {
    version: '3.0.0', totalCombinations: 150,
    // V × T^n = C  (Extended: V × T^n × f^a × d^b = C)
    constants: {
        'steel_low_carbon': {
            'HSS': { C: 70, n: 0.125, a: 0.75, b: 0.15 }, 'HSS_Coated': { C: 85, n: 0.130, a: 0.72, b: 0.14 },
            'Carbide_Uncoated': { C: 200, n: 0.250, a: 0.50, b: 0.15 }, 'Carbide_TiN': { C: 280, n: 0.270, a: 0.48, b: 0.14 },
            'Carbide_TiAlN': { C: 320, n: 0.280, a: 0.45, b: 0.13 }, 'Carbide_AlCrN': { C: 350, n: 0.290, a: 0.44, b: 0.12 },
            'Ceramic_Al2O3': { C: 500, n: 0.400, a: 0.35, b: 0.10 }, 'CBN': { C: 800, n: 0.500, a: 0.30, b: 0.08 }
        },
        'steel_medium_carbon': {
            'HSS': { C: 55, n: 0.125, a: 0.75, b: 0.15 }, 'Carbide_TiN': { C: 240, n: 0.270, a: 0.48, b: 0.14 },
            'Carbide_TiAlN': { C: 280, n: 0.280, a: 0.45, b: 0.13 }, 'Ceramic_Al2O3': { C: 450, n: 0.400, a: 0.35, b: 0.10 }
        },
        'steel_alloy': {
            'HSS': { C: 45, n: 0.125, a: 0.75, b: 0.15 }, 'Carbide_TiAlN': { C: 250, n: 0.280, a: 0.45, b: 0.13 },
            'Ceramic_Al2O3': { C: 400, n: 0.400, a: 0.35, b: 0.10 }, 'CBN': { C: 600, n: 0.500, a: 0.30, b: 0.08 }
        },
        'steel_tool': {
            'HSS': { C: 25, n: 0.120, a: 0.78, b: 0.16 }, 'Carbide_TiAlN': { C: 120, n: 0.260, a: 0.48, b: 0.14 },
            'CBN': { C: 350, n: 0.450, a: 0.32, b: 0.09 }
        },
        'stainless_austenitic': {
            'HSS': { C: 35, n: 0.120, a: 0.78, b: 0.16 }, 'Carbide_TiN': { C: 170, n: 0.240, a: 0.50, b: 0.15 },
            'Carbide_TiAlN': { C: 200, n: 0.250, a: 0.48, b: 0.14 }, 'Ceramic_SiAlON': { C: 350, n: 0.380, a: 0.36, b: 0.11 }
        },
        'stainless_martensitic': {
            'HSS': { C: 40, n: 0.120, a: 0.76, b: 0.15 }, 'Carbide_TiAlN': { C: 180, n: 0.250, a: 0.48, b: 0.14 }
        },
        'stainless_ph': {
            'HSS': { C: 30, n: 0.115, a: 0.80, b: 0.17 }, 'Carbide_TiAlN': { C: 150, n: 0.240, a: 0.50, b: 0.15 }
        },
        'stainless_duplex': {
            'HSS': { C: 32, n: 0.118, a: 0.78, b: 0.16 }, 'Carbide_TiAlN': { C: 160, n: 0.245, a: 0.49, b: 0.14 }
        },
        'cast_iron_gray': {
            'HSS': { C: 80, n: 0.140, a: 0.70, b: 0.14 }, 'Carbide_TiN': { C: 320, n: 0.300, a: 0.43, b: 0.11 },
            'Ceramic_Al2O3': { C: 600, n: 0.450, a: 0.32, b: 0.08 }, 'CBN': { C: 900, n: 0.520, a: 0.28, b: 0.06 }
        },
        'cast_iron_ductile': {
            'HSS': { C: 65, n: 0.135, a: 0.72, b: 0.14 }, 'Carbide_TiAlN': { C: 340, n: 0.310, a: 0.42, b: 0.11 },
            'CBN': { C: 800, n: 0.510, a: 0.28, b: 0.06 }
        },
        'aluminum_wrought': {
            'HSS': { C: 300, n: 0.180, a: 0.60, b: 0.12 }, 'Carbide_Uncoated': { C: 800, n: 0.350, a: 0.40, b: 0.10 },
            'PCD': { C: 2000, n: 0.550, a: 0.25, b: 0.05 }
        },
        'aluminum_cast': {
            'HSS': { C: 250, n: 0.170, a: 0.62, b: 0.13 }, 'Carbide_Uncoated': { C: 700, n: 0.340, a: 0.42, b: 0.11 },
            'PCD': { C: 1800, n: 0.540, a: 0.26, b: 0.06 }
        },
        'copper_pure': {
            'HSS': { C: 150, n: 0.150, a: 0.65, b: 0.14 }, 'Carbide_Uncoated': { C: 400, n: 0.300, a: 0.45, b: 0.12 }
        },
        'titanium_pure': {
            'HSS': { C: 25, n: 0.110, a: 0.80, b: 0.18 }, 'Carbide_TiAlN': { C: 120, n: 0.220, a: 0.52, b: 0.15 }
        },
        'titanium_alloy': {
            'HSS': { C: 20, n: 0.100, a: 0.82, b: 0.19 }, 'Carbide_TiAlN': { C: 100, n: 0.200, a: 0.55, b: 0.16 },
            'Carbide_AlCrN': { C: 120, n: 0.210, a: 0.53, b: 0.15 }
        },
        'nickel_superalloy': {
            'HSS': { C: 12, n: 0.090, a: 0.85, b: 0.20 }, 'Carbide_TiAlN': { C: 60, n: 0.180, a: 0.58, b: 0.17 },
            'Ceramic_SiAlON': { C: 150, n: 0.280, a: 0.45, b: 0.13 }, 'CBN': { C: 200, n: 0.320, a: 0.42, b: 0.12 }
        },
        'cobalt_superalloy': {
            'HSS': { C: 10, n: 0.085, a: 0.88, b: 0.21 }, 'Carbide_TiAlN': { C: 50, n: 0.170, a: 0.60, b: 0.18 },
            'CBN': { C: 180, n: 0.310, a: 0.43, b: 0.12 }
        },
        'hardened_steel': {
            'Carbide_TiAlN': { C: 80, n: 0.200, a: 0.55, b: 0.16 }, 'Ceramic_Al2O3': { C: 180, n: 0.320, a: 0.42, b: 0.12 },
            'CBN': { C: 350, n: 0.420, a: 0.33, b: 0.09 }, 'PCBN': { C: 400, n: 0.450, a: 0.30, b: 0.08 }
        }
    },
    calculateToolLife: function(matCat, toolMat, speed, feed = 0.2, doc = 1.0) {
        const c = this.constants[matCat]?.[toolMat];
        if (!c) return null;
        const T = Math.pow(c.C / (speed * Math.pow(feed, c.a) * Math.pow(doc, c.b)), 1/c.n);
        return { toolLife_minutes: T, toolLife_hours: T / 60, constants: c, inputs: { speed, feed, doc } };
    },
    calculateEconomicSpeed: function(matCat, toolMat, changeCost, toolCost, machCostPerMin) {
        const c = this.constants[matCat]?.[toolMat];
        if (!c) return null;
        const Tc = changeCost / machCostPerMin, Tt = toolCost / machCostPerMin;
        const Te = (1/c.n - 1) * (Tc + Tt);
        const Ve = c.C / Math.pow(Te, c.n);
        return { economicToolLife_minutes: Te, economicSpeed: Ve, constants: c };
    },
    getAvailableToolMaterials: function(matCat) { return Object.keys(this.constants[matCat] || {}); }
}