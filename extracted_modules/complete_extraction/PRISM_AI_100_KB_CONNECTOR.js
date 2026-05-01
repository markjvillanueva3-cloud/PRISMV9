const PRISM_AI_100_KB_CONNECTOR = {

    version: '1.0.0',
    connectedAlgorithms: [],

    // Knowledge base sources
    kbSources: [
        'PRISM_CROSS_DISCIPLINARY',
        'PRISM_AI_DEEP_LEARNING',
        'PRISM_CAM_ENGINE',
        'PRISM_CAD_ENGINE',
        'PRISM_UNIVERSITY_ALGORITHMS',
        'PRISM_CORE_ALGORITHMS',
        'PRISM_GRAPH_ALGORITHMS',
        'PRISM_GEOMETRY_ALGORITHMS',
        'PRISM_COLLISION_ALGORITHMS',
        'PRISM_NUMERICAL_ENGINE',
        'PRISM_OPTIMIZATION_COMPLETE'
    ],

    // Connect all knowledge base algorithms
    connectAll: function() {
        console.log('[AI 100%] Connecting ALL knowledge base algorithms...');

        for (const kbName of this.kbSources) {
            try {
                const kb = window[kbName];
                if (kb) {
                    const count = this._connectFromKB(kb, kbName);
                    console.log(`  ✓ ${kbName}: ${count} algorithms`);
                }
            } catch (e) {
                // Skip if can't connect
            }
        }
        console.log(`[AI 100%] Total algorithms connected: ${this.connectedAlgorithms.length}`);
        return this.connectedAlgorithms.length;
    },
    _connectFromKB: function(kb, kbName, path = '') {
        let count = 0;

        for (const [key, value] of Object.entries(kb)) {
            if (key.startsWith('_') || key === 'version' || key === 'created') continue;

            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === 'function') {
                this.connectedAlgorithms.push({
                    name: currentPath,
                    source: kbName,
                    fn: value,
                    type: this._classifyAlgorithm(key, currentPath)
                });
                count++;
            } else if (typeof value === 'object' && value !== null) {
                // Check for implementation
                if (value.implementation && typeof value.implementation === 'function') {
                    this.connectedAlgorithms.push({
                        name: currentPath,
                        source: kbName,
                        fn: value.implementation,
                        formula: value.formula,
                        description: value.description,
                        type: 'formula'
                    });
                    count++;
                }
                // Check for forward/compute
                if (value.forward && typeof value.forward === 'function') {
                    this.connectedAlgorithms.push({
                        name: `${currentPath}.forward`,
                        source: kbName,
                        fn: value.forward,
                        type: 'neural'
                    });
                    count++;
                }
                // Recurse (max depth 5)
                if (currentPath.split('.').length < 5) {
                    count += this._connectFromKB(value, kbName, currentPath);
                }
            }
        }
        return count;
    },
    _classifyAlgorithm: function(name, path) {
        const lower = (name + path).toLowerCase();

        if (lower.includes('physics') || lower.includes('force') || lower.includes('thermal')) return 'physics';
        if (lower.includes('neural') || lower.includes('activation') || lower.includes('layer')) return 'neural';
        if (lower.includes('optimize') || lower.includes('pso') || lower.includes('genetic')) return 'optimization';
        if (lower.includes('predict') || lower.includes('estimate')) return 'prediction';
        if (lower.includes('toolpath') || lower.includes('cam')) return 'cam';
        if (lower.includes('geometry') || lower.includes('nurbs') || lower.includes('surface')) return 'geometry';
        if (lower.includes('bayesian') || lower.includes('monte') || lower.includes('statistical')) return 'statistics';

        return 'utility';
    },
    // Run algorithm by name
    runAlgorithm: function(name, ...args) {
        const algo = this.connectedAlgorithms.find(a =>
            a.name === name || a.name.endsWith(name) || a.name.includes(name)
        );

        if (algo && algo.fn) {
            return algo.fn(...args);
        }
        return null;
    },
    // Get algorithms by type
    getByType: function(type) {
        return this.connectedAlgorithms.filter(a => a.type === type);
    },
    // Get statistics
    getStatistics: function() {
        const byType = {};
        const bySource = {};

        for (const algo of this.connectedAlgorithms) {
            byType[algo.type] = (byType[algo.type] || 0) + 1;
            bySource[algo.source] = (bySource[algo.source] || 0) + 1;
        }
        return {
            total: this.connectedAlgorithms.length,
            byType,
            bySource
        };
    }
}