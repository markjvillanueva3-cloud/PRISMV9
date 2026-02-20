const PRISM_MATERIALS_FACTORY = {
    version: '3.0.0',
    templates: {
        steel_low_carbon: { Kc_base: 1300, Kc_per_MPa: 0.5, mc: 0.21, sfm_carbide: 250, sfm_hss: 90, thermal: { expansion: 11.7, conductivity: 51.9, specific_heat: 486 } },
        steel_medium_carbon: { Kc_base: 1500, Kc_per_MPa: 0.55, mc: 0.23, sfm_carbide: 180, sfm_hss: 65, thermal: { expansion: 11.2, conductivity: 46.6, specific_heat: 480 } },
        steel_high_carbon: { Kc_base: 1700, Kc_per_MPa: 0.6, mc: 0.24, sfm_carbide: 140, sfm_hss: 50, thermal: { expansion: 10.8, conductivity: 42.0, specific_heat: 475 } },
        steel_alloy: { Kc_base: 1600, Kc_per_MPa: 0.58, mc: 0.24, sfm_carbide: 160, sfm_hss: 55, thermal: { expansion: 11.3, conductivity: 44.0, specific_heat: 477 } },
        steel_tool: { Kc_base: 2200, Kc_per_MPa: 0.65, mc: 0.23, sfm_carbide: 50, sfm_hss: 20, thermal: { expansion: 11.0, conductivity: 30.0, specific_heat: 460 } },
        stainless_austenitic: { Kc_base: 2500, Kc_per_MPa: 0.5, mc: 0.20, sfm_carbide: 200, sfm_hss: 60, thermal: { expansion: 16.0, conductivity: 16.2, specific_heat: 500 } },
        stainless_martensitic: { Kc_base: 2200, Kc_per_MPa: 0.55, mc: 0.22, sfm_carbide: 150, sfm_hss: 50, thermal: { expansion: 10.8, conductivity: 24.9, specific_heat: 460 } },
        stainless_ph: { Kc_base: 2800, Kc_per_MPa: 0.6, mc: 0.22, sfm_carbide: 120, sfm_hss: 40, thermal: { expansion: 10.8, conductivity: 18.0, specific_heat: 480 } },
        stainless_duplex: { Kc_base: 2600, Kc_per_MPa: 0.55, mc: 0.21, sfm_carbide: 140, sfm_hss: 45, thermal: { expansion: 13.0, conductivity: 19.0, specific_heat: 480 } },
        cast_iron_gray: { Kc_base: 1000, Kc_per_MPa: 0.4, mc: 0.28, sfm_carbide: 350, sfm_hss: 100, thermal: { expansion: 10.5, conductivity: 46.0, specific_heat: 490 } },
        cast_iron_ductile: { Kc_base: 1300, Kc_per_MPa: 0.45, mc: 0.26, sfm_carbide: 300, sfm_hss: 90, thermal: { expansion: 11.0, conductivity: 36.0, specific_heat: 500 } },
        cast_iron_cgi: { Kc_base: 1150, Kc_per_MPa: 0.42, mc: 0.27, sfm_carbide: 280, sfm_hss: 85, thermal: { expansion: 11.0, conductivity: 38.0, specific_heat: 495 } },
        aluminum_wrought: { Kc_base: 600, Kc_per_MPa: 0.3, mc: 0.25, sfm_carbide: 1000, sfm_hss: 400, thermal: { expansion: 23.1, conductivity: 167.0, specific_heat: 900 } },
        aluminum_cast: { Kc_base: 700, Kc_per_MPa: 0.35, mc: 0.26, sfm_carbide: 800, sfm_hss: 350, thermal: { expansion: 21.0, conductivity: 140.0, specific_heat: 880 } },
        copper_pure: { Kc_base: 900, Kc_per_MPa: 0.4, mc: 0.24, sfm_carbide: 600, sfm_hss: 200, thermal: { expansion: 16.5, conductivity: 401.0, specific_heat: 385 } },
        brass: { Kc_base: 600, Kc_per_MPa: 0.25, mc: 0.25, sfm_carbide: 700, sfm_hss: 300, thermal: { expansion: 18.7, conductivity: 120.0, specific_heat: 380 } },
        bronze: { Kc_base: 800, Kc_per_MPa: 0.35, mc: 0.25, sfm_carbide: 400, sfm_hss: 150, thermal: { expansion: 17.0, conductivity: 50.0, specific_heat: 380 } },
        titanium_pure: { Kc_base: 1300, Kc_per_MPa: 0.45, mc: 0.23, sfm_carbide: 180, sfm_hss: 50, thermal: { expansion: 8.6, conductivity: 21.9, specific_heat: 523 } },
        titanium_alloy: { Kc_base: 1500, Kc_per_MPa: 0.5, mc: 0.23, sfm_carbide: 120, sfm_hss: 35, thermal: { expansion: 8.6, conductivity: 6.7, specific_heat: 526 } },
        nickel_superalloy: { Kc_base: 2800, Kc_per_MPa: 0.55, mc: 0.21, sfm_carbide: 60, sfm_hss: 15, thermal: { expansion: 13.0, conductivity: 11.4, specific_heat: 435 } },
        cobalt_superalloy: { Kc_base: 3000, Kc_per_MPa: 0.6, mc: 0.20, sfm_carbide: 50, sfm_hss: 12, thermal: { expansion: 12.5, conductivity: 14.0, specific_heat: 420 } },
        hardened_steel: { Kc_base: 3500, Kc_per_MPa: 0.7, mc: 0.18, sfm_carbide: 80, sfm_hss: 0, thermal: { expansion: 11.0, conductivity: 40.0, specific_heat: 470 } },
        magnesium: { Kc_base: 400, Kc_per_MPa: 0.2, mc: 0.26, sfm_carbide: 1500, sfm_hss: 600, thermal: { expansion: 26.0, conductivity: 156.0, specific_heat: 1020 } },
        zinc_alloy: { Kc_base: 500, Kc_per_MPa: 0.3, mc: 0.25, sfm_carbide: 800, sfm_hss: 300, thermal: { expansion: 27.0, conductivity: 113.0, specific_heat: 390 } }
    },
    generateMaterial: function(id, name, template, tensile, yield_val, hardness, machinability, extras = {}) {
        const t = this.templates[template];
        if (!t) return null;
        const Kc1_1 = Math.round(t.Kc_base + t.Kc_per_MPa * tensile);
        const isoMap = {
            'steel_low_carbon': 'P', 'steel_medium_carbon': 'P', 'steel_alloy': 'P', 'steel_tool': 'P',
            'stainless_austenitic': 'M', 'stainless_martensitic': 'M', 'stainless_ph': 'M',
            'stainless_duplex': 'M', 'stainless_ferritic': 'M',
            'cast_iron_gray': 'K', 'cast_iron_ductile': 'K', 'cast_iron_cgi': 'K',
            'aluminum_wrought': 'N', 'aluminum_cast': 'N', 'copper_pure': 'N', 'brass': 'N',
            'bronze': 'N', 'magnesium': 'N', 'zinc_alloy': 'N',
            'titanium_pure': 'S', 'titanium_alloy': 'S', 'nickel_superalloy': 'S', 'cobalt_superalloy': 'S',
            'hardened_steel': 'H'
        };
        const mf = machinability / 70;
        return {
            id, name, iso: isoMap[template] || "P", category: template, tensile_MPa: tensile, yield_MPa: yield_val, hardness_BHN: hardness,
            density: extras.density || 7.85, Kc1_1, mc: t.mc, machinability,
            cutting_speeds: {
                HSS: { sfm: Math.round(t.sfm_hss * mf), m_min: Math.round(t.sfm_hss * mf * 0.305) },
                Carbide: { sfm: Math.round(t.sfm_carbide * mf), m_min: Math.round(t.sfm_carbide * mf * 0.305) },
                Ceramic: { sfm: Math.round(t.sfm_carbide * mf * 1.6), m_min: Math.round(t.sfm_carbide * mf * 1.6 * 0.305) },
                CBN: { sfm: Math.round(t.sfm_carbide * mf * 2.5), m_min: Math.round(t.sfm_carbide * mf * 2.5 * 0.305) }
            },
            thermal: { ...t.thermal }, coolant: extras.coolant || 'Emulsion 8-12%', ...extras
        };
    }
}