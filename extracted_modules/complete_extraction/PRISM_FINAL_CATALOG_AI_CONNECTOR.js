const PRISM_FINAL_CATALOG_AI_CONNECTOR = {
    version: '1.0.0',
    
    // Generate training data for cutting parameter prediction
    generateCuttingTrainingData: function() {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return [];
        
        const trainingData = [];
        
        // OSG drill data
        if (catalog.osg?.adoDrills?.cuttingData) {
            const data = catalog.osg.adoDrills.cuttingData;
            for (const [material, params] of Object.entries(data)) {
                if (params.vc_sfm && params.feed_ipr) {
                    trainingData.push({
                        source: 'OSG_ADO',
                        toolType: 'drill',
                        material,
                        speed_sfm: Array.isArray(params.vc_sfm) ? (params.vc_sfm[0] + params.vc_sfm[1]) / 2 : params.vc_sfm,
                        feed_ipr: Array.isArray(params.feed_ipr) ? (params.feed_ipr[0] + params.feed_ipr[1]) / 2 : params.feed_ipr
                    });
                }
            }
        }
        
        // Ceratizit 7-flute HEM data
        if (catalog.CERATIZIT?.cuttingData) {
            for (const [material, params] of Object.entries(catalog.CERATIZIT.cuttingData)) {
                if (params.vc_sfm && params.fz_ipt) {
                    trainingData.push({
                        source: 'Ceratizit_7Flute',
                        toolType: 'endmill_7flute',
                        material,
                        speed_sfm: params.vc_sfm,
                        feed_ipt: params.fz_ipt,
                        doc_factor: params.ae_factor,
                        woc_factor: params.ap_factor
                    });
                }
            }
        }
        
        // Zeni face milling data
        if (catalog.zeni?.faceMilling_OCTY?.cuttingData) {
            for (const [materialGroup, data] of Object.entries(catalog.zeni.faceMilling_OCTY.cuttingData)) {
                for (const [subGroup, params] of Object.entries(data)) {
                    if (params.vc_m_min && params.fz_ipt) {
                        trainingData.push({
                            source: 'Zeni_OCTY',
                            toolType: 'face_mill',
                            materialGroup,
                            subGroup,
                            speed_mpm: params.vc_m_min,
                            feed_ipt: params.fz_ipt
                        });
                    }
                }
            }
        }
        
        return trainingData;
    },
    
    // Generate training data for tool geometry
    generateToolGeometryTrainingData: function() {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return [];
        
        const trainingData = [];
        
        // ISCAR EC-B3 end mills
        if (catalog.iscarMultiMaster?.ecB3EndMills?.items) {
            for (const item of catalog.iscarMultiMaster.ecB3EndMills.items) {
                trainingData.push({
                    source: 'ISCAR_EC-B3',
                    toolType: 'solid_endmill',
                    diameter_mm: item.dc_mm,
                    shank_mm: item.dconms_mm,
                    flutes: 3,
                    helixAngle: 45,
                    maxDOC_mm: item.apmax_mm,
                    oal_mm: item.oal_mm,
                    feed_range_mm: item.fz_mm
                });
            }
        }
        
        // SGS end mills
        if (catalog.SGS) {
            for (const [series, data] of Object.entries(catalog.SGS)) {
                if (data.items && Array.isArray(data.items)) {
                    for (const item of data.items) {
                        trainingData.push({
                            source: `SGS_${series}`,
                            toolType: 'solid_endmill',
                            series: series,
                            diameter: item.diameter || item.d,
                            flutes: item.flutes || data.flutes,
                            coating: item.coating || data.coating
                        });
                    }
                }
            }
        }
        
        return trainingData;
    },
    
    // Generate training data for insert geometry
    generateInsertTrainingData: function() {
        const catalog = typeof PRISM_CATALOG_FINAL !== 'undefined' ? PRISM_CATALOG_FINAL : null;
        if (!catalog) return [];
        
        const trainingData = [];
        
        // ISCAR turning inserts
        if (catalog.iscarTurningInserts) {
            for (const [insertType, data] of Object.entries(catalog.iscarTurningInserts)) {
                if (data.items) {
                    for (const item of data.items) {
                        trainingData.push({
                            source: 'ISCAR_Turning',
                            insertType,
                            designation: item.designation,
                            ic_in: item.ic_in,
                            thickness_in: item.s_in,
                            cornerRadius_in: item.re_in,
                            depthOfCut_range: item.ap_in,
                            feed_range: item.f_ipr,
                            grades: data.grades
                        });
                    }
                }
            }
        }
        
        // Kennametal DNMA inserts
        if (catalog.kennametalTurning?.dnmaInserts?.items) {
            for (const item of catalog.kennametalTurning.dnmaInserts.items) {
                trainingData.push({
                    source: 'Kennametal_DNMA',
                    insertType: 'DNMA',
                    ansi: item.ansi,
                    iso: item.iso,
                    diameter_mm: item.d_mm,
                    diameter_in: item.d_in,
                    cornerRadius_mm: item.re_mm,
                    cornerRadius_in: item.re_in,
                    geometry: catalog.kennametalTurning.dnmaInserts.geometry
                });
            }
        }
        
        return trainingData;
    },
    
    // Connect to PRISM AI training system
    connectToAI: function() {
        if (typeof PRISM_AI_TRAINING_DATA !== 'undefined') {
            // Add our training data generators
            PRISM_AI_TRAINING_DATA.addSource('FINAL_CATALOG_CUTTING', this.generateCuttingTrainingData);
            PRISM_AI_TRAINING_DATA.addSource('FINAL_CATALOG_GEOMETRY', this.generateToolGeometryTrainingData);
            PRISM_AI_TRAINING_DATA.addSource('FINAL_CATALOG_INSERTS', this.generateInsertTrainingData);
            console.log('[PRISM_FINAL_CATALOG_AI_CONNECTOR] Connected to AI training system');
            return true;
        }
        
        if (typeof PRISM_AI_100_KB_CONNECTOR !== 'undefined') {
            PRISM_AI_100_KB_CONNECTOR.registerKnowledgeBase('FINAL_CATALOG', {
                cutting: this.generateCuttingTrainingData,
                geometry: this.generateToolGeometryTrainingData,
                inserts: this.generateInsertTrainingData
            });
            console.log('[PRISM_FINAL_CATALOG_AI_CONNECTOR] Connected to 100KB connector');
            return true;
        }
        
        return false;
    },
    
    // Get statistics on available training data
    getTrainingStats: function() {
        return {
            cuttingData: this.generateCuttingTrainingData().length,
            geometryData: this.generateToolGeometryTrainingData().length,
            insertData: this.generateInsertTrainingData().length
        };
    }
}