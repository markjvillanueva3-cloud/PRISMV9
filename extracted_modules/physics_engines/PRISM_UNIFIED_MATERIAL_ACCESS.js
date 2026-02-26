const PRISM_UNIFIED_MATERIAL_ACCESS = {
    version: '1.0.0',

    // All known material databases to query
    databases: [
        'CONSOLIDATED_MATERIALS',
        'DatabaseConsolidation.Materials',
        'LASER_MATERIALS',
        'WATERJET_MATERIALS',
        'WEDM_MATERIALS',
        'EDM_ELECTRODE_MATERIALS',
        'UNIFIED_MATERIALS'
    ],

    /**
     * Master material lookup - searches ALL databases
     */
    getMaterial(materialId) {
        const key = (materialId || '').toLowerCase().replace(/[- ]/g, '_');

        // 1. Try CONSOLIDATED_MATERIALS first (85+ materials)
        if (typeof DatabaseConsolidation !== 'undefined' && DatabaseConsolidation.Materials) {
            const mat = this._searchObject(DatabaseConsolidation.Materials, key);
            if (mat) return { ...mat, source: 'CONSOLIDATED_MATERIALS', type: 'machining' };
        }
        // 2. Try CONSOLIDATED_MATERIALS directly
        if (typeof CONSOLIDATED_MATERIALS !== 'undefined') {
            const mat = this._searchObject(CONSOLIDATED_MATERIALS, key);
            if (mat) return { ...mat, source: 'CONSOLIDATED_MATERIALS', type: 'machining' };
        }
        // 3. Try LASER_MATERIALS
        if (typeof LASER_MATERIALS !== 'undefined') {
            const mat = this._searchObject(LASER_MATERIALS, key);
            if (mat) return { ...mat, source: 'LASER_MATERIALS', type: 'laser' };
        }
        // 4. Try WATERJET_MATERIALS
        if (typeof WATERJET_MATERIALS !== 'undefined') {
            const mat = this._searchObject(WATERJET_MATERIALS, key);
            if (mat) return { ...mat, source: 'WATERJET_MATERIALS', type: 'waterjet' };
        }
        // 5. Try WEDM_MATERIALS (18 materials)
        if (typeof WEDM_MATERIALS !== 'undefined') {
            const mat = this._searchObject(WEDM_MATERIALS, key);
            if (mat) return { ...mat, source: 'WEDM_MATERIALS', type: 'wedm' };
        }
        // 6. Try EDM_ELECTRODE_MATERIALS
        if (typeof EDM_ELECTRODE_MATERIALS !== 'undefined') {
            const mat = this._searchObject(EDM_ELECTRODE_MATERIALS, key);
            if (mat) return { ...mat, source: 'EDM_ELECTRODE_MATERIALS', type: 'edm' };
        }
        // 7. Try global getMaterial function
        if (typeof getMaterial === 'function') {
            const mat = getMaterial(key);
            if (mat) return { ...mat, source: 'getMaterial', type: 'machining' };
        }
        return null;
    },
    /**
     * Get cutting data for machining operations
     */
    getCuttingData(materialId, toolType = 'carbide', operation = 'rough') {
        const mat = this.getMaterial(materialId);
        if (!mat) return this._getDefaultCuttingData(materialId);

        // Extract SFM
        let sfm = 400;
        if (mat.sfm) {
            if (typeof mat.sfm === 'object') {
                sfm = mat.sfm[toolType]?.[operation] || mat.sfm[toolType]?.rough ||
                      mat.sfm.carbide?.[operation] || mat.sfm.carbide?.rough || 400;
            } else {
                sfm = mat.sfm;
            }
        } else if (mat.baseSpeed) {
            // LASER_MATERIALS format
            sfm = mat.baseSpeed * 50; // Convert to approximate SFM
        } else if (mat.machining?.recommendedSpeed) {
            sfm = mat.machining.recommendedSpeed[toolType] || mat.machining.recommendedSpeed.carbide || 400;
        }
        // Extract chipload/IPT
        let ipt = 0.004;
        if (mat.chipLoad) {
            ipt = mat.chipLoad[operation] || mat.chipLoad.rough || mat.chipLoad || 0.004;
        } else if (mat.machining?.Kc11) {
            // Physics data - estimate from Kc
            ipt = this._estimateIptFromKc(mat.machining.Kc11);
        }
        // Get Kc value
        let Kc = 1800;
        if (mat.Kc) {
            Kc = mat.Kc;
        } else if (mat.machining?.Kc11) {
            Kc = typeof mat.machining.Kc11 === 'object' ?
                 mat.machining.Kc11.annealed || mat.machining.Kc11.hardened || 1800 :
                 mat.machining.Kc11;
        }
        // Determine ISO group
        const group = this._getISOGroup(mat.category || mat.name || materialId);

        return {
            sfm,
            ipt,
            doc: this._getDefaultDoc(group),
            woc: this._getDefaultWoc(group),
            Kc,
            hardness: this._extractHardness(mat),
            group,
            material: materialId,
            category: mat.category || 'steel',
            coolant: mat.coolant || mat.bestGas || 'flood',
            notes: mat.notes || '',
            source: mat.source,
            machinability: mat.machinability || mat.machining?.machinabilityRating || 50
        };
    },
    /**
     * Get ALL materials across all databases
     */
    getAllMaterials() {
        const all = new Map();

        // Consolidated materials
        if (typeof DatabaseConsolidation !== 'undefined' && DatabaseConsolidation.Materials) {
            Object.entries(DatabaseConsolidation.Materials).forEach(([key, mat]) => {
                all.set(key, { ...mat, key, source: 'CONSOLIDATED_MATERIALS', type: 'machining' });
            });
        }
        // LASER_MATERIALS
        if (typeof LASER_MATERIALS !== 'undefined') {
            Object.entries(LASER_MATERIALS).forEach(([key, mat]) => {
                if (!all.has(key)) {
                    all.set(key, { ...mat, key, source: 'LASER_MATERIALS', type: 'laser' });
                }
            });
        }
        // WATERJET_MATERIALS
        if (typeof WATERJET_MATERIALS !== 'undefined') {
            Object.entries(WATERJET_MATERIALS).forEach(([key, mat]) => {
                if (!all.has(key)) {
                    all.set(key, { ...mat, key, source: 'WATERJET_MATERIALS', type: 'waterjet' });
                }
            });
        }
        // WEDM_MATERIALS
        if (typeof WEDM_MATERIALS !== 'undefined') {
            Object.entries(WEDM_MATERIALS).forEach(([key, mat]) => {
                if (!all.has(key)) {
                    all.set(key, { ...mat, key, source: 'WEDM_MATERIALS', type: 'wedm' });
                }
            });
        }
        return Array.from(all.values());
    },
    /**
     * Get materials by category
     */
    getByCategory(category) {
        return this.getAllMaterials().filter(m =>
            m.category?.toLowerCase() === category.toLowerCase() ||
            m.name?.toLowerCase().includes(category.toLowerCase())
        );
    },
    /**
     * Get materials by type (machining, laser, waterjet, wedm, edm)
     */
    getByType(type) {
        return this.getAllMaterials().filter(m => m.type === type);
    },
    /**
     * Search materials
     */
    search(query) {
        const q = (query || '').toLowerCase();
        return this.getAllMaterials().filter(m =>
            m.key?.toLowerCase().includes(q) ||
            m.name?.toLowerCase().includes(q) ||
            m.category?.toLowerCase().includes(q)
        );
    },
    /**
     * Get material count
     */
    getCount() {
        return this.getAllMaterials().length;
    },
    // Helper methods
    _searchObject(obj, key) {
        if (!obj || typeof obj !== 'object') return null;

        // Direct match
        if (obj[key]) return obj[key];

        // Fuzzy match
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v !== 'object') continue;
            if (k.toLowerCase().includes(key) || key.includes(k.toLowerCase())) {
                return v;
            }
        }
        // Search nested (for physics materials section)
        if (obj.ferrous) {
            for (const [k, v] of Object.entries(obj.ferrous)) {
                if (k.includes(key) || key.includes(k.split('_').pop())) {
                    return v;
                }
            }
        }
        if (obj.nonFerrous) {
            for (const [k, v] of Object.entries(obj.nonFerrous)) {
                if (k.includes(key) || key.includes(k.split('_').pop())) {
                    return v;
                }
            }
        }
        return null;
    },
    _getDefaultCuttingData(materialId) {
        const key = (materialId || '').toLowerCase();

        // Category-based defaults
        if (key.includes('alum')) return { sfm: 900, ipt: 0.005, doc: 1.5, woc: 0.45, Kc: 700, group: 'N', material: materialId, category: 'aluminum' };
        if (key.includes('stain') || key.includes('ss') || key.includes('304') || key.includes('316')) return { sfm: 300, ipt: 0.003, doc: 0.6, woc: 0.3, Kc: 2800, group: 'M', material: materialId, category: 'stainless' };
        if (key.includes('titan') || key.includes('ti-')) return { sfm: 180, ipt: 0.002, doc: 0.35, woc: 0.2, Kc: 1600, group: 'S', material: materialId, category: 'titanium' };
        if (key.includes('inconel') || key.includes('hastelloy') || key.includes('718')) return { sfm: 65, ipt: 0.001, doc: 0.15, woc: 0.1, Kc: 3000, group: 'S', material: materialId, category: 'superalloy' };
        if (key.includes('cast') && key.includes('iron')) return { sfm: 400, ipt: 0.005, doc: 1.0, woc: 0.4, Kc: 1200, group: 'K', material: materialId, category: 'cast_iron' };
        if (key.includes('brass') || key.includes('bronze') || key.includes('copper')) return { sfm: 600, ipt: 0.004, doc: 1.2, woc: 0.4, Kc: 900, group: 'N', material: materialId, category: 'copper' };
        if (key.includes('plastic') || key.includes('delrin') || key.includes('nylon') || key.includes('peek')) return { sfm: 500, ipt: 0.006, doc: 2.0, woc: 0.5, Kc: 200, group: 'O', material: materialId, category: 'plastic' };
        if (key.includes('hardened') || key.includes('hrc')) return { sfm: 120, ipt: 0.001, doc: 0.1, woc: 0.12, Kc: 4500, group: 'H', material: materialId, category: 'hardened' };
        if (key.includes('tool') && key.includes('steel')) return { sfm: 200, ipt: 0.002, doc: 0.4, woc: 0.25, Kc: 2600, group: 'P', material: materialId, category: 'tool_steel' };

        // Default to mild steel
        return { sfm: 400, ipt: 0.004, doc: 1.0, woc: 0.4, Kc: 1800, group: 'P', material: materialId, category: 'steel' };
    },
    _getISOGroup(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('stain')) return 'M';
        if (cat.includes('cast') && cat.includes('iron')) return 'K';
        if (cat.includes('alum') || cat.includes('copper') || cat.includes('brass')) return 'N';
        if (cat.includes('titan') || cat.includes('inconel') || cat.includes('nickel') || cat.includes('super')) return 'S';
        if (cat.includes('harden')) return 'H';
        if (cat.includes('plastic') || cat.includes('composite')) return 'O';
        return 'P'; // Steel default
    },
    _getDefaultDoc(group) {
        const docs = { 'P': 1.0, 'M': 0.6, 'K': 1.0, 'N': 1.5, 'S': 0.3, 'H': 0.1, 'O': 2.0 };
        return docs[group] || 1.0;
    },
    _getDefaultWoc(group) {
        const wocs = { 'P': 0.4, 'M': 0.3, 'K': 0.4, 'N': 0.45, 'S': 0.15, 'H': 0.12, 'O': 0.5 };
        return wocs[group] || 0.4;
    },
    _extractHardness(mat) {
        if (mat.hardness) {
            if (typeof mat.hardness === 'number') return mat.hardness;
            if (typeof mat.hardness === 'string') {
                const match = mat.hardness.match(/(\d+)/);
                return match ? parseInt(match[1]) : 150;
            }
            if (mat.hardness.value) return mat.hardness.value;
        }
        if (mat.mechanical?.hardness?.value) return mat.mechanical.hardness.value;
        return 150;
    },
    _estimateIptFromKc(Kc) {
        // Higher Kc = harder material = lower chipload
        if (Kc > 3000) return 0.001;
        if (Kc > 2500) return 0.002;
        if (Kc > 2000) return 0.003;
        if (Kc > 1500) return 0.004;
        if (Kc > 1000) return 0.005;
        return 0.006;
    }
}