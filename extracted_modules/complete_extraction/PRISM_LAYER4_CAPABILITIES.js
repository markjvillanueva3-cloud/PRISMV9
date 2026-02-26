const PRISM_LAYER4_CAPABILITIES = {

    registerAll() {
        // STEP File Parsing
        PRISM_CAPABILITY_REGISTRY.register('layer4.cad', {
            id: 'cad.parseSTEP',
            name: 'Parse STEP File',
            description: 'Parse STEP/IGES file and extract geometry',
            category: 'cad',
            inputs: {
                content: { type: 'string', required: true, description: 'STEP file content' }
            },
            outputs: {
                entities: { type: 'array', description: 'Parsed CAD entities' },
                topology: { type: 'object', description: 'B-Rep topology' }
            },
            execute: async (inputs) => {
                const { content } = inputs;

                PRISM_EVENT_BUS.publish('cad:parse:started', { fileSize: content.length });
                PRISM_UI_ADAPTER.updateProgress('step-parse', 0, 'Parsing STEP file...');

                let result = { entities: [], topology: {} };

                if (typeof PRISM_STEP_PARSER_100 !== 'undefined') {
                    PRISM_UI_ADAPTER.updateProgress('step-parse', 30, 'Extracting entities...');
                    result = PRISM_STEP_PARSER_100.parse(content);
                    PRISM_UI_ADAPTER.updateProgress('step-parse', 100, 'Parse complete');
                }
                PRISM_EVENT_BUS.publish('cad:parse:complete', { entityCount: result.entities?.length || 0 });
                return result;
            },
            preferredUI: '3d-viewer'
        });

        // NURBS Surface Evaluation
        PRISM_CAPABILITY_REGISTRY.register('layer4.cad', {
            id: 'cad.evaluateNURBS',
            name: 'Evaluate NURBS Surface',
            description: 'Evaluate NURBS surface at parameter values',
            category: 'cad',
            inputs: {
                surface: { type: 'object', required: true, description: 'NURBS surface definition' },
                u: { type: 'number', required: true, min: 0, max: 1 },
                v: { type: 'number', required: true, min: 0, max: 1 }
            },
            outputs: {
                point: { type: 'object', description: '3D point on surface' },
                normal: { type: 'object', description: 'Surface normal' }
            },
            execute: async (inputs) => {
                const { surface, u, v } = inputs;

                // Use PRISM CAD engine if available
                let point = { x: 0, y: 0, z: 0 };
                let normal = { x: 0, y: 0, z: 1 };

                if (typeof PRISM_CAD_OPERATIONS_LAYER4 !== 'undefined' && PRISM_CAD_OPERATIONS_LAYER4.nurbs) {
                    const result = PRISM_CAD_OPERATIONS_LAYER4.nurbs.evaluateSurface(surface, u, v);
                    point = result.point;
                    normal = result.normal;
                }
                PRISM_EVENT_BUS.publish('cad:nurbs:evaluated', { u, v });
                return { point, normal };
            },
            preferredUI: 'point-display'
        });

        // Collision Detection
        PRISM_CAPABILITY_REGISTRY.register('layer4.collision', {
            id: 'collision.check',
            name: 'Collision Detection',
            description: 'Check for collisions between tool assembly and workpiece/fixture using BVH',
            category: 'collision',
            inputs: {
                toolAssembly: { type: 'object', required: true, description: 'Tool + holder geometry' },
                workpiece: { type: 'object', required: true },
                fixture: { type: 'object', required: false }
            },
            outputs: {
                hasCollision: { type: 'boolean' },
                collisionPoints: { type: 'array', description: 'Collision contact points' }
            },
            execute: async (inputs) => {
                const { toolAssembly, workpiece, fixture } = inputs;

                PRISM_EVENT_BUS.publish('collision:check:started', {});

                let result = { hasCollision: false, collisionPoints: [] };

                if (typeof PRISM_COLLISION_ENGINE !== 'undefined') {
                    result = PRISM_COLLISION_ENGINE.check(toolAssembly, workpiece, fixture);
                } else if (typeof PRISM_BVH_ENGINE !== 'undefined') {
                    result = PRISM_BVH_ENGINE.checkCollision(toolAssembly, workpiece);
                }
                PRISM_EVENT_BUS.publish('collision:check:complete', {
                    hasCollision: result.hasCollision,
                    pointCount: result.collisionPoints?.length || 0
                });

                return result;
            },
            preferredUI: 'collision-viewer'
        });

        // Feature Recognition
        PRISM_CAPABILITY_REGISTRY.register('layer4.cad', {
            id: 'cad.featureRecognition',
            name: 'Feature Recognition',
            description: 'Recognize machining features (holes, pockets, bosses) from solid model',
            category: 'cad',
            inputs: {
                model: { type: 'object', required: true, description: 'B-Rep solid model' }
            },
            outputs: {
                features: { type: 'array', description: 'Recognized features with types and parameters' }
            },
            execute: async (inputs) => {
                const { model } = inputs;

                PRISM_EVENT_BUS.publish('cad:feature:started', {});
                PRISM_UI_ADAPTER.updateProgress('feature-rec', 0, 'Analyzing model topology...');

                let features = [];

                if (typeof PRISM_CAD_OPERATIONS_LAYER4 !== 'undefined' && PRISM_CAD_OPERATIONS_LAYER4.featureRecognition) {
                    PRISM_UI_ADAPTER.updateProgress('feature-rec', 50, 'Recognizing features...');
                    features = PRISM_CAD_OPERATIONS_LAYER4.featureRecognition.recognize(model);
                    PRISM_UI_ADAPTER.updateProgress('feature-rec', 100, 'Feature recognition complete');
                }
                PRISM_EVENT_BUS.publish('cad:feature:complete', { featureCount: features.length });
                return features;
            },
            preferredUI: 'feature-tree'
        });

        // B-Rep Topology Query
        PRISM_CAPABILITY_REGISTRY.register('layer4.cad', {
            id: 'cad.queryTopology',
            name: 'Query B-Rep Topology',
            description: 'Query faces, edges, vertices of B-Rep solid',
            category: 'cad',
            inputs: {
                solid: { type: 'object', required: true },
                query: { type: 'string', required: true, options: ['faces', 'edges', 'vertices', 'shells', 'loops'] }
            },
            outputs: {
                entities: { type: 'array', description: 'Queried topological entities' }
            },
            execute: async (inputs) => {
                const { solid, query } = inputs;

                let entities = [];

                if (solid && solid[query]) {
                    entities = solid[query];
                }
                PRISM_EVENT_BUS.publish('cad:topology:queried', { query, count: entities.length });
                return entities;
            },
            preferredUI: 'topology-tree'
        });

        console.log('[RETROFIT] Layer 4 capabilities registered: 5');
    }
}