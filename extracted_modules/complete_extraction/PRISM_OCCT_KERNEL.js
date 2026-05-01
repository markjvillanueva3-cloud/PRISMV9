const PRISM_OCCT_KERNEL = {
    name: 'PRISM_OCCT_KERNEL',
    version: '1.0.0',

    // State
    oc: null,
    initialized: false,
    initPromise: null,

    // Initialize OpenCASCADE.js
    initialize: async function() {
        if (this.initialized) return true;
        if (this.initPromise) return this.initPromise;

        console.log('[PRISM OCCT] Initializing OpenCASCADE.js kernel...');

        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                // Try to load occt-import-js first (more reliable for browser)
                const occtModule = await import('https://cdn.jsdelivr.net/npm/<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="0d626e6e792064607d627f7920677e4d3d233d233c3f">[email&#160;protected]</a>/dist/occt-import-js.js');
                this.oc = await occtModule.default();
                this.initialized = true;
                (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM OCCT] OpenCASCADE.js initialized successfully');
                resolve(true);
            } catch (err) {
                console.warn('[PRISM OCCT] Failed to load occt-import-js:', err.message);
                console.log('[PRISM OCCT] Falling back to native JS CAD engine');
                this.initialized = false;
                resolve(false);
            }
        });

        return this.initPromise;
    },
    // Import STEP file using OCCT
    importSTEP: async function(arrayBuffer, options) {
        const opts = options || { linearDeflection: 0.1 };

        if (!this.initialized) {
            const success = await this.initialize();
            if (!success) {
                console.log('[PRISM OCCT] Using native STEP parser instead');
                return this.importSTEPNative(arrayBuffer);
            }
        }
        console.log('[PRISM OCCT] Importing STEP file...');
        const t0 = performance.now();

        try {
            const uint8 = new Uint8Array(arrayBuffer);
            const result = this.oc.ReadStepFile(uint8, opts);

            if (!result.success) {
                throw new Error('OCCT STEP read failed');
            }
            const elapsed = performance.now() - t0;
            console.log(`[PRISM OCCT] Imported ${result.meshes.length} meshes in ${elapsed.toFixed(1)}ms`);

            return {
                success: true,
                meshes: result.meshes,
                engine: 'occt-import-js',
                importTimeMs: elapsed
            };
        } catch (err) {
            console.error('[PRISM OCCT] Import error:', err);
            return this.importSTEPNative(arrayBuffer);
        }
    },
    // Native fallback STEP import
    importSTEPNative: function(arrayBuffer) {
        console.log('[PRISM OCCT] Using native STEP parser...');
        const t0 = performance.now();

        // Convert to string
        const decoder = new TextDecoder('utf-8');
        const stepContent = decoder.decode(new Uint8Array(arrayBuffer));

        // Parse with native parser
        const parsed = PRISM_STEP_PARSER_ENHANCED.parse(stepContent);

        // Tessellate all surfaces
        const meshes = [];

        for (const face of parsed.advancedFaces) {
            const surfaceData = parsed.bsplineSurfaces[face.surfaceRef];
            if (!surfaceData) continue;

            const mesh = PRISM_ADAPTIVE_TESSELLATOR.tessellateSurface(surfaceData, parsed, 'medium');
            if (mesh.vertices.length > 0) {
                meshes.push({
                    faceId: face.id,
                    attributes: {
                        position: { array: new Float32Array(mesh.vertices) },
                        normal: { array: new Float32Array(mesh.normals) }
                    },
                    index: { array: new Uint32Array(mesh.indices) }
                });
            }
        }
        const elapsed = performance.now() - t0;
        console.log(`[PRISM Native] Parsed ${parsed.stats.totalEntities} entities, created ${meshes.length} meshes in ${elapsed.toFixed(1)}ms`);

        return {
            success: true,
            meshes,
            parsed,
            engine: 'prism-native',
            importTimeMs: elapsed
        };
    },
    // Import IGES file
    importIGES: async function(arrayBuffer, options) {
        const opts = options || { linearDeflection: 0.1 };

        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.initialized || !this.oc) {
            console.warn('[PRISM OCCT] IGES import requires OpenCASCADE.js');
            return { success: false, error: 'OCCT not available' };
        }
        try {
            const uint8 = new Uint8Array(arrayBuffer);
            const result = this.oc.ReadIgesFile(uint8, opts);
            return { success: result.success, meshes: result.meshes, engine: 'occt-import-js' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
    // Check if OCCT is available
    isAvailable: function() {
        return this.initialized && this.oc !== null;
    },
    // Get kernel status
    getStatus: function() {
        return {
            initialized: this.initialized,
            engine: this.initialized ? 'occt-import-js' : 'prism-native',
            capabilities: {
                stepImport: true,
                igesImport: this.initialized,
                brepImport: this.initialized,
                booleanOps: false, // Requires full opencascade.js
                filleting: false
            }
        };
    }
}