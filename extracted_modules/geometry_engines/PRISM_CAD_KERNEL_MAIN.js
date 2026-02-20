const PRISM_CAD_KERNEL_MAIN = {
    name: 'PRISM_CAD_KERNEL_MAIN',
    version: '1.0.0',
    build: 'v8.63.004',

    // Module references
    modules: {
        math: PRISM_CAD_MATH,
        bspline: PRISM_BSPLINE_ENGINE,
        stepParser: PRISM_STEP_PARSER_ENHANCED,
        tessellator: PRISM_ADAPTIVE_TESSELLATOR,
        occt: PRISM_OCCT_KERNEL,
        persistentHomology: PRISM_PERSISTENT_HOMOLOGY,
        alphaShapes: PRISM_ALPHA_SHAPES,
        spectralGraph: PRISM_SPECTRAL_GRAPH_CAD,
        kriging: PRISM_KRIGING_SURFACES
    },
    // Import CAD file (auto-detects format)
    importFile: async function(arrayBuffer, filename, options) {
        const ext = (filename || '').toLowerCase().split('.').pop();

        console.log(`[PRISM CAD] Importing file: ${filename}`);

        switch (ext) {
            case 'stp':
            case 'step':
                return await PRISM_OCCT_KERNEL.importSTEP(arrayBuffer, options);
            case 'igs':
            case 'iges':
                return await PRISM_OCCT_KERNEL.importIGES(arrayBuffer, options);
            default:
                console.warn(`[PRISM CAD] Unknown format: ${ext}, trying STEP`);
                return await PRISM_OCCT_KERNEL.importSTEP(arrayBuffer, options);
        }
    },
    // Parse STEP content (string)
    parseSTEP: function(stepContent) {
        return PRISM_STEP_PARSER_ENHANCED.parse(stepContent);
    },
    // Tessellate a surface
    tessellateSurface: function(surface, parsedData, quality) {
        return PRISM_ADAPTIVE_TESSELLATOR.tessellateSurface(surface, parsedData, quality);
    },
    // Analyze model topology
    analyzeTopology: function(mesh) {
        return PRISM_PERSISTENT_HOMOLOGY.detectFeatures(mesh);
    },
    // Analyze mesh structure
    analyzeStructure: function(mesh) {
        return PRISM_SPECTRAL_GRAPH_CAD.analyzeMeshStructure(mesh);
    },
    // Reconstruct surface from points with uncertainty
    reconstructSurface: function(points, values, gridSize) {
        return PRISM_KRIGING_SURFACES.reconstructSurface({ points, values }, gridSize);
    },
    // Compute alpha shape from point cloud
    computeAlphaShape: function(points, alpha) {
        return PRISM_ALPHA_SHAPES.computeAlphaShape(points, alpha);
    },
    // Evaluate NURBS surface
    evaluateNURBS: function(surface, u, v) {
        const data = PRISM_ADAPTIVE_TESSELLATOR.buildSurfaceData(surface);
        if (!data) return null;

        return {
            point: PRISM_BSPLINE_ENGINE.evaluateNURBSSurface(
                data.controlGrid, data.weightsGrid,
                surface.degreeU, surface.degreeV,
                data.knotsU, data.knotsV, u, v
            ),
            normal: PRISM_BSPLINE_ENGINE.evaluateSurfaceNormal(
                data.controlGrid, data.weightsGrid,
                surface.degreeU, surface.degreeV,
                data.knotsU, data.knotsV, u, v
            )
        };
    },
    // Get status of all modules
    getStatus: function() {
        return {
            version: this.version,
            build: this.build,
            modules: {
                math: { loaded: true },
                bspline: { loaded: true, selfTest: PRISM_BSPLINE_ENGINE.selfTest() },
                stepParser: { loaded: true },
                tessellator: { loaded: true, selfTest: PRISM_ADAPTIVE_TESSELLATOR.selfTest() },
                occt: PRISM_OCCT_KERNEL.getStatus(),
                persistentHomology: { loaded: true, status: 'IMPLEMENTED' },
                alphaShapes: { loaded: true, status: 'IMPLEMENTED' },
                spectralGraph: { loaded: true, status: 'IMPLEMENTED' },
                kriging: { loaded: true, status: 'IMPLEMENTED' }
            },
            innovations: [
                'PERSISTENT_HOMOLOGY',
                'ALPHA_SHAPES',
                'SPECTRAL_GRAPH',
                'KRIGING_SURFACES'
            ]
        };
    },
    // Initialize OCCT (call early for faster first import)
    initializeOCCT: async function() {
        return await PRISM_OCCT_KERNEL.initialize();
    }
}