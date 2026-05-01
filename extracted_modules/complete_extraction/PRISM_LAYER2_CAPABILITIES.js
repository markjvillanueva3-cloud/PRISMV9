const PRISM_LAYER2_CAPABILITIES = {

    registerAll() {
        // Toolpath Strategy Selection
        PRISM_CAPABILITY_REGISTRY.register('layer2.toolpath', {
            id: 'toolpath.strategySelect',
            name: 'Toolpath Strategy Selection',
            description: 'Get recommended toolpath strategies for operation type',
            category: 'toolpath',
            inputs: {
                operationType: { type: 'string', required: true, options: ['roughing', 'finishing', 'drilling', 'pocketing'] },
                geometry: { type: 'string', required: false, options: ['open', 'closed', 'slot', 'pocket'] },
                axes: { type: 'number', required: false, options: [3, 4, 5] }
            },
            outputs: {
                strategies: { type: 'array', description: 'Matching toolpath strategies' }
            },
            execute: async (inputs) => {
                const { operationType, geometry, axes = 3 } = inputs;
                let strategies = [];

                if (typeof PRISM_TOOLPATH_STRATEGIES_COMPLETE !== 'undefined') {
                    strategies = PRISM_TOOLPATH_STRATEGIES_COMPLETE.strategies || [];

                    strategies = strategies.filter(s => {
                        const opMatch = s.operation_type === operationType || s.suitable_for?.includes(operationType);
                        const axesMatch = !axes || s.axes_required <= axes;
                        return opMatch && axesMatch;
                    });
                }
                PRISM_EVENT_BUS.publish('toolpath:strategies:selected', { inputs, count: strategies.length });
                return strategies;
            },
            preferredUI: 'strategy-panel'
        });

        // Toolpath Generation
        PRISM_CAPABILITY_REGISTRY.register('layer2.toolpath', {
            id: 'toolpath.generate',
            name: 'Generate Toolpath',
            description: 'Generate toolpath for given geometry and strategy',
            category: 'toolpath',
            inputs: {
                geometry: { type: 'object', required: true, description: 'Part geometry (mesh/brep)' },
                strategy: { type: 'string', required: true },
                tool: { type: 'object', required: true },
                parameters: { type: 'object', required: false }
            },
            outputs: {
                toolpath: { type: 'object', description: 'Generated toolpath with motion data' }
            },
            execute: async (inputs) => {
                const { geometry, strategy, tool, parameters = {} } = inputs;

                PRISM_EVENT_BUS.publish('toolpath:generate:started', { strategy, tool: tool.name });
                PRISM_UI_ADAPTER.updateProgress('toolpath-gen', 0, 'Initializing toolpath generation...');

                // Use PRISM_REAL_TOOLPATH_ENGINE if available
                let toolpath = null;
                if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined') {
                    try {
                        PRISM_UI_ADAPTER.updateProgress('toolpath-gen', 30, 'Calculating tool positions...');
                        toolpath = await PRISM_REAL_TOOLPATH_ENGINE.generate(geometry, strategy, tool, parameters);
                        PRISM_UI_ADAPTER.updateProgress('toolpath-gen', 100, 'Toolpath complete');
                    } catch (e) {
                        PRISM_UI_ADAPTER.showError(e, { context: 'Toolpath Generation' });
                        throw e;
                    }
                }
                PRISM_EVENT_BUS.publish('toolpath:generate:complete', {
                    strategy,
                    pointCount: toolpath?.points?.length || 0
                });

                return toolpath;
            },
            preferredUI: '3d-viewer'
        });

        // Post Processor Selection
        PRISM_CAPABILITY_REGISTRY.register('layer2.post', {
            id: 'post.select',
            name: 'Post Processor Selection',
            description: 'Find post processor for machine controller',
            category: 'post',
            inputs: {
                controller: { type: 'string', required: true, description: 'Controller type (Fanuc, Siemens, etc.)' },
                machine: { type: 'string', required: false }
            },
            outputs: {
                posts: { type: 'array', description: 'Compatible post processors' }
            },
            execute: async (inputs) => {
                const { controller, machine } = inputs;
                let posts = [];

                if (typeof PRISM_ENHANCED_POST_DATABASE_V2 !== 'undefined') {
                    posts = PRISM_ENHANCED_POST_DATABASE_V2.posts || [];
                    posts = posts.filter(p =>
                        p.controller === controller ||
                        p.controller?.toLowerCase().includes(controller.toLowerCase())
                    );
                }
                if (typeof PRISM_FUSION_POST_DATABASE !== 'undefined' && posts.length === 0) {
                    const fusionPosts = PRISM_FUSION_POST_DATABASE.posts || [];
                    posts = fusionPosts.filter(p => p.controller === controller);
                }
                PRISM_EVENT_BUS.publish('post:selected', { controller, count: posts.length });
                return posts;
            },
            preferredUI: 'list-panel'
        });

        // G-code Generation
        PRISM_CAPABILITY_REGISTRY.register('layer2.post', {
            id: 'post.generateGcode',
            name: 'Generate G-code',
            description: 'Convert toolpath to G-code using selected post processor',
            category: 'post',
            inputs: {
                toolpath: { type: 'object', required: true },
                postId: { type: 'string', required: true },
                options: { type: 'object', required: false }
            },
            outputs: {
                gcode: { type: 'string', description: 'Generated G-code program' },
                statistics: { type: 'object', description: 'Program statistics' }
            },
            execute: async (inputs) => {
                const { toolpath, postId, options = {} } = inputs;

                PRISM_EVENT_BUS.publish('post:gcode:started', { postId });
                PRISM_UI_ADAPTER.updateProgress('gcode-gen', 0, 'Initializing G-code generation...');

                let gcode = '';
                let statistics = { lineCount: 0, estimatedTime: 0 };

                // Find post processor
                let post = null;
                if (typeof PRISM_ENHANCED_POST_DATABASE_V2 !== 'undefined') {
                    post = PRISM_ENHANCED_POST_DATABASE_V2.posts?.find(p => p.id === postId);
                }
                if (post && toolpath?.points) {
                    PRISM_UI_ADAPTER.updateProgress('gcode-gen', 50, 'Converting toolpath to G-code...');

                    // Generate G-code header
                    gcode = `%\nO${options.programNumber || '1000'} (PRISM GENERATED)\n`;
                    gcode += `(POST: ${post.name})\n`;
                    gcode += `(DATE: ${new Date().toISOString()})\n`;
                    gcode += `G90 G40 G80\n`;
                    gcode += `G21\n`; // Metric

                    // Process toolpath points
                    for (const point of toolpath.points) {
                        if (point.type === 'rapid') {
                            gcode += `G0 X${point.x.toFixed(4)} Y${point.y.toFixed(4)} Z${point.z.toFixed(4)}\n`;
                        } else {
                            gcode += `G1 X${point.x.toFixed(4)} Y${point.y.toFixed(4)} Z${point.z.toFixed(4)} F${point.feed || 1000}\n`;
                        }
                    }
                    gcode += `M30\n%\n`;
                    statistics.lineCount = gcode.split('\n').length;

                    PRISM_UI_ADAPTER.updateProgress('gcode-gen', 100, 'G-code generation complete');
                }
                PRISM_EVENT_BUS.publish('post:gcode:complete', {
                    postId,
                    lineCount: statistics.lineCount
                });

                return { gcode, statistics };
            },
            preferredUI: 'code-editor'
        });

        console.log('[RETROFIT] Layer 2 capabilities registered: 4');
    }
}