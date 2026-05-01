const PRISM_LATHE_MANUFACTURER_DATA = {
    version: '1.0.0',

    // Insert manufacturers and their turning data
    manufacturers: {
        'sandvik': {
            name: 'Sandvik Coromant',
            turning: {
                'mild_steel_1018': { sfm: 700, ipr: 0.012, doc: 0.100, grade: 'GC4325' },
                'steel_4140': { sfm: 550, ipr: 0.010, doc: 0.080, grade: 'GC4325' },
                'stainless_304': { sfm: 400, ipr: 0.008, doc: 0.060, grade: 'GC2220' },
                'stainless_316': { sfm: 350, ipr: 0.007, doc: 0.050, grade: 'GC2220' },
                'aluminum_6061': { sfm: 1200, ipr: 0.015, doc: 0.150, grade: 'H13A' },
                'titanium_6al4v': { sfm: 200, ipr: 0.006, doc: 0.040, grade: 'GC1125' },
                'inconel_718': { sfm: 120, ipr: 0.005, doc: 0.030, grade: 'GC1105' },
                'cast_iron': { sfm: 500, ipr: 0.012, doc: 0.100, grade: 'GC3215' }
            },
            grooving: {
                'mild_steel_1018': { sfm: 500, ipr: 0.004, width_mult: 0.8 },
                'stainless_304': { sfm: 300, ipr: 0.003, width_mult: 0.7 },
                'aluminum_6061': { sfm: 900, ipr: 0.005, width_mult: 0.9 }
            },
            threading: {
                'mild_steel_1018': { sfm: 200, passes: 6, infeed: 'modified_flank' },
                'stainless_304': { sfm: 120, passes: 8, infeed: 'modified_flank' },
                'aluminum_6061': { sfm: 400, passes: 4, infeed: 'radial' }
            }
        },
        'kennametal': {
            name: 'Kennametal',
            turning: {
                'mild_steel_1018': { sfm: 680, ipr: 0.012, doc: 0.100, grade: 'KCP25B' },
                'steel_4140': { sfm: 530, ipr: 0.010, doc: 0.075, grade: 'KCP25B' },
                'stainless_304': { sfm: 380, ipr: 0.008, doc: 0.060, grade: 'KCM25' },
                'aluminum_6061': { sfm: 1150, ipr: 0.014, doc: 0.150, grade: 'KC730' },
                'titanium_6al4v': { sfm: 180, ipr: 0.006, doc: 0.035, grade: 'KC5010' },
                'inconel_718': { sfm: 100, ipr: 0.004, doc: 0.025, grade: 'KC5010' }
            }
        },
        'iscar': {
            name: 'Iscar',
            turning: {
                'mild_steel_1018': { sfm: 720, ipr: 0.013, doc: 0.100, grade: 'IC8250' },
                'steel_4140': { sfm: 560, ipr: 0.011, doc: 0.080, grade: 'IC8250' },
                'stainless_304': { sfm: 420, ipr: 0.008, doc: 0.065, grade: 'IC1008' },
                'aluminum_6061': { sfm: 1250, ipr: 0.016, doc: 0.160, grade: 'IC20' }
            }
        },
        'walter': {
            name: 'Walter',
            turning: {
                'mild_steel_1018': { sfm: 690, ipr: 0.012, doc: 0.095, grade: 'WPP20S' },
                'stainless_304': { sfm: 390, ipr: 0.008, doc: 0.055, grade: 'WMP20S' },
                'titanium_6al4v': { sfm: 190, ipr: 0.006, doc: 0.038, grade: 'WSM20S' }
            }
        }
    },
    /**
     * Get lathe cutting data for manufacturer and material
     */
    getData(manufacturer, material, operation = 'turning') {
        const mfr = (manufacturer || 'sandvik').toLowerCase();
        const mat = this._mapMaterial(material);
        const op = operation.toLowerCase();

        const mfrData = this.manufacturers[mfr] || this.manufacturers['sandvik'];
        const opData = mfrData[op] || mfrData['turning'];

        if (opData && opData[mat]) {
            return { ...opData[mat], manufacturer: mfrData.name, material: mat };
        }
        // Fallback to sandvik defaults
        const fallback = this.manufacturers['sandvik'][op];
        return fallback?.[mat] || fallback?.['mild_steel_1018'] || {
            sfm: 500, ipr: 0.010, doc: 0.080, grade: 'Generic'
        };
    },
    _mapMaterial(material) {
        const mat = (material || '').toLowerCase();
        if (mat.includes('1018') || mat.includes('mild') || mat.includes('1020')) return 'mild_steel_1018';
        if (mat.includes('4140') || mat.includes('4340') || mat.includes('alloy')) return 'steel_4140';
        if (mat.includes('304') || mat.includes('stainless')) return 'stainless_304';
        if (mat.includes('316')) return 'stainless_316';
        if (mat.includes('6061') || mat.includes('aluminum') || mat.includes('7075')) return 'aluminum_6061';
        if (mat.includes('titan') || mat.includes('ti6al') || mat.includes('ti-6al')) return 'titanium_6al4v';
        if (mat.includes('inconel') || mat.includes('718')) return 'inconel_718';
        if (mat.includes('cast') && mat.includes('iron')) return 'cast_iron';
        return 'mild_steel_1018';
    },
    /**
     * Calculate lathe parameters with machine limits
     */
    calculateParams(material, diameter, manufacturer = 'sandvik', operation = 'turning') {
        const data = this.getData(manufacturer, material, operation);

        // Calculate RPM from SFM: RPM = (SFM * 12) / (π * D)
        let rpm = Math.round((data.sfm * 12) / (Math.PI * diameter));

        // Apply machine limits if available
        if (typeof PRISM_DEEP_MACHINE_INTEGRATION !== 'undefined') {
            const specs = PRISM_DEEP_MACHINE_INTEGRATION.getSpecs();
            rpm = Math.min(rpm, specs.maxRpm);
            rpm = Math.max(rpm, specs.minRpm);
        }
        // Calculate IPM from IPR
        const ipm = Math.round(rpm * data.ipr);

        return {
            rpm,
            ipm,
            ipr: data.ipr,
            sfm: data.sfm,
            doc: data.doc,
            grade: data.grade,
            manufacturer: data.manufacturer,
            diameter
        };
    }
}