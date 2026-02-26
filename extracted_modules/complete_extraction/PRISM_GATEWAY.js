const PRISM_GATEWAY = {
    AUTHORITIES: {
        // === MATERIALS (Layer 1) - SINGLE SOURCE ===
        'material.get': { module: 'PRISM_MATERIALS_MASTER', method: 'getMaterial' },
        'material.byId': { module: 'PRISM_MATERIALS_MASTER', method: 'byId' },
        'material.search': { module: 'PRISM_MATERIALS_MASTER', method: 'search' },
        'material.cutting': { module: 'PRISM_MATERIALS_MASTER', method: 'getCuttingParams' },
        'material.johnsonCook': { module: 'PRISM_JOHNSON_COOK_DATABASE', method: 'get' },
        'material.thermal': { module: 'PRISM_THERMAL_PROPERTIES', method: 'get' },

        // === TOOLS (Layer 1) ===
        'tool.holder': { module: 'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE', method: 'get' },
        'tool.coating': { module: 'PRISM_COATINGS_COMPLETE', method: 'get' },
        'tool.type': { module: 'PRISM_TOOL_TYPES_COMPLETE', method: 'get' },
        'tool.life': { module: 'PRISM_TAYLOR_COMPLETE', method: 'calculate' },

        // === TOOLPATH (Layer 2) ===
        'toolpath.generate': { module: 'PRISM_REAL_TOOLPATH_ENGINE', method: 'generate' },
        'toolpath.lathe': { module: 'PRISM_LATHE_TOOLPATH_ENGINE', method: 'generate' },
        'toolpath.strategy': { module: 'PRISM_TOOLPATH_STRATEGIES_COMPLETE', method: 'get' },
        'toolpath.optimize': { module: 'PRISM_TOOLPATH_OPTIMIZATION', method: 'optimize' },

        // === G-CODE (Layer 2) ===
        'gcode.generate': { module: 'PRISM_TOOLPATH_GCODE_BRIDGE', method: 'generate' },
        'gcode.post': { module: 'PRISM_GUARANTEED_POST_PROCESSOR', method: 'process' },

        // === NUMERICAL (Layer 3) ===
        'numerical.matrix.multiply': { module: 'PRISM_NUMERICAL_ENGINE', method: 'matMul' },
        'numerical.matrix.invert': { module: 'PRISM_NUMERICAL_ENGINE', method: 'invert' },
        'numerical.matrix.svd': { module: 'PRISM_NUMERICAL_ENGINE', method: 'svd' },
        'numerical.solve.newton': { module: 'PRISM_NUMERICAL_ENGINE', method: 'newtonRaphson' },
        'numerical.solve.linear': { module: 'PRISM_NUMERICAL_ENGINE', method: 'solveLinear' },

        // === CAD/GEOMETRY (Layer 4) ===
        'geometry.nurbs.evaluate': { module: 'PRISM_NURBS_EVALUATOR', method: 'evaluate' },
        'geometry.nurbs.derivative': { module: 'PRISM_NURBS_EVALUATOR', method: 'derivative' },
        'geometry.brep': { module: 'PRISM_CAD_OPERATIONS_LAYER4', method: 'process' },
        'geometry.feature.recognize': { module: 'PRISM_CAD_OPERATIONS_LAYER4', method: 'recognizeFeatures' },

        // === KINEMATICS (Layer 5) ===
        'kinematics.fk.dh': { module: 'PRISM_DH_KINEMATICS', method: 'forwardKinematicsDH' },
        'kinematics.fk.screw': { module: 'PRISM_SCREW_KINEMATICS', method: 'forwardKinematicsPOE' },
        'kinematics.ik.solve': { module: 'PRISM_INVERSE_KINEMATICS_SOLVER', method: 'solveIK' },
        'kinematics.ik.closedForm': { module: 'PRISM_INVERSE_KINEMATICS_SOLVER', method: 'solveIKClosedForm' },
        'kinematics.ik.all': { module: 'PRISM_WORKSPACE_ANALYZER', method: 'getAllIKSolutions' },
        'kinematics.jacobian': { module: 'PRISM_JACOBIAN_ENGINE', method: 'computeJacobian' },
        'kinematics.singularity': { module: 'PRISM_SINGULARITY_AVOIDANCE', method: 'analyzeToolpath' },
        'kinematics.rtcp': { module: 'PRISM_RTCP_ENGINE', method: 'computeTCPCompensation' },
        'kinematics.machine': { module: 'PRISM_MACHINE_CONFIGS_COMPLETE', method: 'getConfig' },

        // === COLLISION (Cross-layer) ===
        'collision.check': { module: 'PRISM_BVH_ENGINE', method: 'checkCollision' },
        'collision.build': { module: 'PRISM_BVH_ENGINE', method: 'buildBVH' }
    },
    _callLog: [],
    _maxLogSize: 500,

    route: function(capability) {
        const authority = this.AUTHORITIES[capability];
        if (!authority) {
            console.warn(`[PRISM_GATEWAY] No authority registered for: ${capability}`);
            return null;
        }
        const module = window[authority.module];
        if (!module) {
            console.error(`[PRISM_GATEWAY] Authority module not found: ${authority.module}`);
            return null;
        }
        if (PRISM_CONSTANTS.LOG_GATEWAY_CALLS) {
            console.log(`[PRISM_GATEWAY] ${capability} → ${authority.module}.${authority.method}`);
        }
        this._logCall(capability, authority.module);
        return {
            module: module,
            method: authority.method,
            call: (...args) => module[authority.method](...args)
        };
    },
    call: function(capability, ...args) {
        const route = this.route(capability);
        if (!route) return null;
        return route.call(...args);
    },
    registerAuthority: function(capability, moduleName, methodName) {
        if (this.AUTHORITIES[capability]) {
            console.warn(`[PRISM_GATEWAY] Authority already exists for ${capability}: ${this.AUTHORITIES[capability].module}`);
            return false;
        }
        this.AUTHORITIES[capability] = { module: moduleName, method: methodName };
        console.log(`[PRISM_GATEWAY] Registered: ${capability} → ${moduleName}.${methodName}`);
        return true;
    },
    hasCapability: function(capability) {
        return this.AUTHORITIES[capability] !== undefined;
    },
    listCapabilities: function(prefix = '') {
        return Object.keys(this.AUTHORITIES).filter(k => k.startsWith(prefix)).sort();
    },
    _logCall: function(capability, module) {
        this._callLog.push({ capability, module, timestamp: Date.now() });
        if (this._callLog.length > this._maxLogSize) this._callLog.shift();
    }
}