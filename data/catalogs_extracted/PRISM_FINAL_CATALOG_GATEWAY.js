/**
 * PRISM_FINAL_CATALOG_GATEWAY
 * Extracted from PRISM v8.89.002 monolith
 * References: 27
 * Category: catalogs
 * Lines: 416
 * Session: R2.3.6 Catalog/MIT Extraction
 */

const PRISM_FINAL_CATALOG_GATEWAY = {
    version: '1.0.0',
    description: 'Gateway routes for PRISM_CATALOG_FINAL (complete 44 PDF extraction)',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TOOL HOLDER ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getToolHolder: function(manufacturer, type) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog || !catalog.toolHolders) return null;
        
        const mfrKey = manufacturer.toLowerCase();
        const holders = catalog.toolHolders;
        
        if (mfrKey === 'guhring') return type ? holders.guhring?.[type] : holders.guhring;
        if (mfrKey === 'big daishowa' || mfrKey === 'bigdaishowa') return type ? holders.bigDaishowa?.[type] : holders.bigDaishowa;
        if (mfrKey === 'rego-fix' || mfrKey === 'regofix') return type ? holders.regoFix?.[type] : holders.regoFix;
        if (mfrKey === 'haimer') return type ? holders.haimer?.[type] : catalog.haimerHolders || holders.haimer;
        
        return holders[mfrKey];
    },
    
    getHydraulicChuck: function(manufacturer, clampingDia) {
        const holders = this.getToolHolder(manufacturer, 'hydraulicChucks');
        if (!holders?.specifications) return null;
        return holders.specifications.find(h => h.clampingDia === clampingDia);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // WORKHOLDING ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getVise: function(manufacturer, model) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.workholding) return null;
        
        if (manufacturer.toLowerCase() === 'orange vise' || manufacturer.toLowerCase() === 'orangevise') {
            const ov = catalog.workholding.orangeVise;
            if (!model) return ov;
            return ov?.vises?.find(v => v.model === model);
        }
        return null;
    },
    
    getViseByJawWidth: function(width) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.workholding?.orangeVise?.vises) return null;
        return catalog.workholding.orangeVise.vises.find(v => v.jawWidth_in === width);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CUTTING TOOL ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getCuttingTool: function(manufacturer, series) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        const mfr = manufacturer.toLowerCase();
        
        // Check cuttingTools section
        if (catalog.cuttingTools?.[mfr]) {
            return series ? catalog.cuttingTools[mfr][series] : catalog.cuttingTools[mfr];
        }
        
        // Check top-level manufacturer sections
        if (mfr === 'osg') return series ? catalog.osg?.[series] : catalog.osg;
        if (mfr === 'iscar') return series ? catalog.iscarMultiMaster?.[series] || catalog.iscar?.[series] : { ...catalog.iscarMultiMaster, ...catalog.iscar };
        if (mfr === 'seco' || mfr === 'widia') return catalog.secoWidia;
        if (mfr === 'emuge') return series ? catalog.emuge?.[series] || catalog.EMUGE?.[series] : { ...catalog.emuge, ...catalog.EMUGE };
        if (mfr === 'kennametal') return series ? catalog.kennametal?.[series] || catalog.kennametalRotating?.[series] : { ...catalog.kennametal, ...catalog.kennametalRotating };
        if (mfr === 'sgs') return catalog.SGS;
        if (mfr === 'ma ford' || mfr === 'maford') return catalog.maFordTuffCut;
        if (mfr === 'ingersoll') return catalog.ingersollFaceMills || catalog.INGERSOLL;
        if (mfr === 'allied' || mfr === 'allied machine') return catalog.alliedMachine;
        if (mfr === 'tungaloy') return catalog.TUNGALOY;
        if (mfr === 'ceratizit') return catalog.CERATIZIT;
        if (mfr === 'accupro') return catalog.ACCUPRO;
        if (mfr === 'korloy') return catalog.KORLOY;
        if (mfr === 'zeni') return catalog.zeni;
        
        return null;
    },
    
    getDrillData: function(manufacturer, series, material) {
        const tool = this.getCuttingTool(manufacturer, series);
        if (!tool) return null;
        
        // OSG ADO drills
        if (manufacturer.toLowerCase() === 'osg' && tool.adoDrills) {
            const drills = tool.adoDrills;
            if (material && drills.cuttingData) {
                return drills.cuttingData[material] || drills.cuttingData;
            }
            return drills;
        }
        
        // Allied Machine GEN3SYS
        if (manufacturer.toLowerCase().includes('allied') && tool.gen3sysXTPro) {
            return tool.gen3sysXTPro;
        }
        
        // Kennametal Beyond HP
        if (manufacturer.toLowerCase() === 'kennametal' && tool.beyondHPDeepHole) {
            return tool.beyondHPDeepHole;
        }
        
        return tool;
    },
    
    getEndMillData: function(manufacturer, series) {
        const tool = this.getCuttingTool(manufacturer, series);
        if (!tool) return null;
        
        // SGS Z-Carb, V-Carb etc.
        if (manufacturer.toLowerCase() === 'sgs') {
            return series ? tool[series] : tool;
        }
        
        // ISCAR solid carbide end mills
        if (manufacturer.toLowerCase() === 'iscar' && tool.ecB3EndMills) {
            return tool.ecB3EndMills;
        }
        
        return tool;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LATHE TOOLING ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getLatheTooling: function(manufacturer, type) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        const mfr = manufacturer.toLowerCase();
        
        if (mfr === 'global cnc' || mfr === 'globalcnc') {
            return type ? catalog.globalCnc?.[type] : catalog.globalCnc;
        }
        if (mfr === 'iscar') {
            if (type === 'camfix') return catalog.iscarCamfix;
            if (type === 'flashline') return catalog.iscarFlashLine;
            return catalog.iscarTurningInserts;
        }
        if (mfr === 'zeni') {
            return catalog.zeni?.turningToolholders;
        }
        if (mfr === 'kennametal') {
            return catalog.kennametalTurning;
        }
        
        return null;
    },
    
    getBMTHolder: function(size, type) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.bmtLiveTooling) return null;
        
        const key = `bmt${size}`;
        const holders = catalog.bmtLiveTooling[key];
        if (!holders) return null;
        return type ? holders[type] : holders;
    },
    
    getVDIHolder: function(size, type) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.vdiTooling) return null;
        
        const key = `vdi${size}`;
        const holders = catalog.vdiTooling[key];
        if (!holders) return null;
        return type ? holders[type] : holders;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INSERT GRADE ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getInsertGrade: function(manufacturer, grade) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        const mfr = manufacturer.toLowerCase();
        
        if (mfr === 'kennametal') {
            const grades = catalog.kennametal?.insertGrades || catalog.kennametalTurning?.kenlocGrades;
            if (!grades) return null;
            if (!grade) return grades;
            // Search all grade arrays
            for (const [category, gradeList] of Object.entries(grades)) {
                if (Array.isArray(gradeList) && gradeList.includes(grade)) {
                    return { grade, category, manufacturer: 'Kennametal' };
                }
            }
        }
        
        if (mfr === 'seco') return catalog.seco?.insertGrades;
        if (mfr === 'iscar') return catalog.iscar?.insertGrades;
        if (mfr === 'korloy') return catalog.KORLOY?.grades;
        
        return null;
    },
    
    getEquivalentGrade: function(fromMfr, fromGrade, toMfr) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        // Check multiple locations for cross-reference
        const xref = catalog.gradeReference?.crossReference || 
                     catalog.insertGrades?.crossReference ||
                     catalog.helpers?.gradeEquivalents;
        
        if (!xref) return null;
        
        // Find the grade in the cross-reference table
        for (const entry of Object.values(xref)) {
            if (entry[fromMfr.toLowerCase()] === fromGrade || 
                entry[fromMfr] === fromGrade) {
                return entry[toMfr.toLowerCase()] || entry[toMfr];
            }
        }
        
        return null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SPINDLE INTERFACE ROUTES
    // ═══════════════════════════════════════════════════════════════════════════
    
    getSpindleInterface: function(type, size) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.spindleInterfaces) return null;
        
        const key = `${type.toLowerCase()}${size || ''}`;
        return catalog.spindleInterfaces[key] || catalog.spindleInterfaces[type.toLowerCase()];
    },
    
    getCollisionEnvelope: function(interfaceType) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.collisionEnvelopes && !catalog?.collisionHelpers) return null;
        
        const envelopes = catalog.collisionEnvelopes || catalog.collisionHelpers;
        return envelopes[interfaceType.toLowerCase()];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-MASTER MODULAR TOOLING (ISCAR)
    // ═══════════════════════════════════════════════════════════════════════════
    
    getMultiMasterHead: function(type) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog?.iscarMultiMaster?.millingHeadTypes) return null;
        
        const heads = catalog.iscarMultiMaster.millingHeadTypes;
        if (!type) return heads;
        return heads[type.toLowerCase()] || heads[type];
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ISO MATERIAL CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    classifyMaterial: function(materialName) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        // Check for ISO materials in various locations
        const isoMaterials = catalog.isoMaterials || 
                            catalog.utilities?.isoMaterialClassification ||
                            catalog.CERATIZIT?.isoMaterialGroups;
        
        if (!isoMaterials) return null;
        
        const name = materialName.toLowerCase();
        
        // Search through ISO groups
        for (const [isoCode, group] of Object.entries(isoMaterials)) {
            if (group.examples && group.examples.some(ex => name.includes(ex.toLowerCase()))) {
                return { iso: isoCode, ...group };
            }
            if (group.subgroups) {
                for (const [subCode, sub] of Object.entries(group.subgroups)) {
                    if (sub.examples && sub.examples.some(ex => name.includes(ex.toLowerCase()))) {
                        return { iso: isoCode, subgroup: subCode, ...sub };
                    }
                }
            }
        }
        
        return null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CUTTING PARAMETERS BY MATERIAL
    // ═══════════════════════════════════════════════════════════════════════════
    
    getCuttingParams: function(material, toolType, manufacturer) {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return null;
        
        // Ceratizit 7-flute HEM data
        if (toolType === '7flute' || toolType === 'hem') {
            const ceratizit = catalog.CERATIZIT?.cuttingData;
            if (ceratizit && ceratizit[material]) {
                return ceratizit[material];
            }
        }
        
        // OSG drill data
        if (toolType === 'drill' && (!manufacturer || manufacturer.toLowerCase() === 'osg')) {
            const osg = catalog.osg?.adoDrills?.cuttingData;
            if (osg && osg[material]) return osg[material];
        }
        
        // General cutting parameters
        if (catalog.cuttingParameters) {
            const params = catalog.cuttingParameters;
            if (params[manufacturer?.toLowerCase()]) {
                return params[manufacturer.toLowerCase()][material] || params[manufacturer.toLowerCase()];
            }
        }
        
        return null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getStats: function() {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return { error: 'Catalog not loaded' };
        
        return {
            version: catalog.version,
            generated: catalog.generated,
            totalManufacturers: catalog.totalManufacturers || 25,
            sections: {
                toolHolders: !!catalog.toolHolders,
                workholding: !!catalog.workholding,
                cuttingTools: !!catalog.cuttingTools,
                spindleInterfaces: !!catalog.spindleInterfaces,
                insertGrades: !!catalog.kennametal || !!catalog.seco,
                latheTooling: !!catalog.globalCnc || !!catalog.vdiTooling,
                multiMaster: !!catalog.iscarMultiMaster,
                isoMaterials: !!catalog.isoMaterials || !!catalog.CERATIZIT
            },
            manufacturers: [
                'Guhring', 'BIG DAISHOWA', 'REGO-FIX', 'Haimer', 'Orange Vise',
                'OSG', 'ISCAR', 'Sandvik', 'EMUGE', 'Kennametal', 'SECO/WIDIA',
                'SGS', 'MA Ford', 'Ingersoll', 'Allied Machine', 'Tungaloy',
                'Ceratizit', 'Accupro', 'Korloy', 'Zeni', 'Global CNC'
            ]
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // GATEWAY REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    registerRoutes: function() {
        if (typeof PRISM_GATEWAY === 'undefined') {
            console.warn('[PRISM_FINAL_CATALOG_GATEWAY] PRISM_GATEWAY not found');
            return false;
        }
        
        const routes = {
            // Tool Holders
            'final.holder.get': 'PRISM_FINAL_CATALOG_GATEWAY.getToolHolder',
            'final.holder.hydraulic': 'PRISM_FINAL_CATALOG_GATEWAY.getHydraulicChuck',
            
            // Workholding
            'final.vise.get': 'PRISM_FINAL_CATALOG_GATEWAY.getVise',
            'final.vise.byWidth': 'PRISM_FINAL_CATALOG_GATEWAY.getViseByJawWidth',
            
            // Cutting Tools
            'final.cutting.get': 'PRISM_FINAL_CATALOG_GATEWAY.getCuttingTool',
            'final.drill.get': 'PRISM_FINAL_CATALOG_GATEWAY.getDrillData',
            'final.endmill.get': 'PRISM_FINAL_CATALOG_GATEWAY.getEndMillData',
            
            // Lathe Tooling
            'final.lathe.get': 'PRISM_FINAL_CATALOG_GATEWAY.getLatheTooling',
            'final.bmt.get': 'PRISM_FINAL_CATALOG_GATEWAY.getBMTHolder',
            'final.vdi.get': 'PRISM_FINAL_CATALOG_GATEWAY.getVDIHolder',
            
            // Insert Grades
            'final.grade.get': 'PRISM_FINAL_CATALOG_GATEWAY.getInsertGrade',
            'final.grade.equivalent': 'PRISM_FINAL_CATALOG_GATEWAY.getEquivalentGrade',
            
            // Spindle Interfaces
            'final.spindle.get': 'PRISM_FINAL_CATALOG_GATEWAY.getSpindleInterface',
            'final.collision.envelope': 'PRISM_FINAL_CATALOG_GATEWAY.getCollisionEnvelope',
            
            // Multi-Master
            'final.multimaster.get': 'PRISM_FINAL_CATALOG_GATEWAY.getMultiMasterHead',
            
            // Materials & Parameters
            'final.iso.classify': 'PRISM_FINAL_CATALOG_GATEWAY.classifyMaterial',
            'final.params.get': 'PRISM_FINAL_CATALOG_GATEWAY.getCuttingParams',
            
            // Statistics
            'final.stats': 'PRISM_FINAL_CATALOG_GATEWAY.getStats'
        };
        
        let registered = 0;
        for (const [route, target] of Object.entries(routes)) {
            PRISM_GATEWAY.register(route, target);
            registered++;
        }
        
        console.log(`[PRISM_FINAL_CATALOG_GATEWAY] Registered ${registered} routes`);
        return registered;
    }
}