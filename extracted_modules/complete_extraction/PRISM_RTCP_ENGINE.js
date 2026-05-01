const PRISM_RTCP_ENGINE = {
    version: '1.0.0',
    name: 'RTCP (Rotary Tool Center Point) Engine',

    // G-code commands
    commands: {
        FANUC: {
            enable: 'G43.4',      // Dynamic TCP (RTCP)
            disable: 'G49',       // Cancel TCP
            enableAlt: 'G43.5',   // Tool center point control type 2
            tiltedPlane: 'G68.2', // Tilted work plane
            cancelTilt: 'G69'     // Cancel tilted work plane
        },
        SIEMENS: {
            enable: 'TRAORI',     // Transformation orientation
            disable: 'TRAFOOF',   // Transformation off
            tcp: 'RTCP',          // RTCP active
            toolFrame: 'TOFRAME'  // Tool frame rotation
        },
        HEIDENHAIN: {
            enable: 'M128',       // TCPM (Tool Center Point Management)
            disable: 'M129',      // Cancel TCPM
            plane: 'PLANE SPATIAL' // Spatial plane function
        }
    },
    state: {
        enabled: false,
        toolLength: 0,
        toolOffset: { x: 0, y: 0, z: 0 },
        gaugePoint: { x: 0, y: 0, z: 0 },
        pivotDistance: 0
    },
    // Initialize RTCP with tool and machine parameters
    initialize: function(toolLength, machineConfig) {
        this.state.toolLength = toolLength;
        this.state.enabled = true;

        // Set gauge point based on machine config
        if (machineConfig.gaugePoint) {
            this.state.gaugePoint = { ...machineConfig.gaugePoint };
        }
        // Calculate pivot distance for trunnion tables
        if (machineConfig.pivotDistance !== undefined) {
            this.state.pivotDistance = machineConfig.pivotDistance;
        }
        return { success: true, state: this.state };
    },
    // Compute TCP compensation for a given position and rotary angles
    // This is the core RTCP calculation
    computeTCPCompensation: function(programmedPos, rotaryAngles, config = 'BC') {
        const { x, y, z } = programmedPos;
        const L = this.state.toolLength;

        if (!this.state.enabled || L === 0) {
            return { x, y, z, compensated: false };
        }
        let compensated = { x, y, z };

        if (config === 'BC' || config === 'HEAD_HEAD_BC') {
            const { b = 0, c = 0 } = rotaryAngles;
            const bRad = b * Math.PI / 180;
            const cRad = c * Math.PI / 180;

            // Tool vector when rotated
            const toolVec = {
                x: Math.sin(bRad) * Math.sin(cRad),
                y: Math.sin(bRad) * Math.cos(cRad),
                z: Math.cos(bRad)
            };
            // TCP compensation = programmed position - tool length * (rotated tool vector - neutral tool vector)
            // Neutral tool vector is (0, 0, 1)
            compensated = {
                x: x - L * toolVec.x,
                y: y - L * toolVec.y,
                z: z - L * (toolVec.z - 1)
            };
        } else if (config === 'AC' || config === 'TABLE_TABLE_AC') {
            const { a = 0, c = 0 } = rotaryAngles;
            const aRad = a * Math.PI / 180;
            const cRad = c * Math.PI / 180;

            // For table-table, we compensate for workpiece rotation
            const ca = Math.cos(aRad), sa = Math.sin(aRad);
            const cc = Math.cos(cRad), sc = Math.sin(cRad);

            // Pivot point compensation (if trunnion)
            const P = this.state.pivotDistance;

            // Workpiece origin after rotation (relative to pivot)
            const dx = -P * sa;  // X offset due to tilt
            const dz = P * (1 - ca);  // Z offset due to tilt

            // Apply C rotation to the offset
            compensated = {
                x: x + dx * cc,
                y: y + dx * sc,
                z: z + dz
            };
        }
        return {
            x: compensated.x,
            y: compensated.y,
            z: compensated.z,
            compensated: true,
            original: { x, y, z },
            toolLength: L
        };
    },
    // Inverse TCP: Given machine coordinates, find programmed position
    inverseTCPCompensation: function(machinePos, rotaryAngles, config = 'BC') {
        const { x, y, z } = machinePos;
        const L = this.state.toolLength;

        if (!this.state.enabled || L === 0) {
            return { x, y, z, compensated: false };
        }
        let programmed = { x, y, z };

        if (config === 'BC' || config === 'HEAD_HEAD_BC') {
            const { b = 0, c = 0 } = rotaryAngles;
            const bRad = b * Math.PI / 180;
            const cRad = c * Math.PI / 180;

            const toolVec = {
                x: Math.sin(bRad) * Math.sin(cRad),
                y: Math.sin(bRad) * Math.cos(cRad),
                z: Math.cos(bRad)
            };
            // Reverse the compensation
            programmed = {
                x: x + L * toolVec.x,
                y: y + L * toolVec.y,
                z: z + L * (toolVec.z - 1)
            };
        }
        return { ...programmed, compensated: true };
    },
    // Generate G-code for RTCP activation
    generateGCode: function(controller = 'FANUC', toolNumber, toolLength) {
        const lines = [];
        const cmds = this.commands[controller] || this.commands.FANUC;

        lines.push(`(RTCP ACTIVATION FOR TOOL ${toolNumber})`);
        lines.push(`G43 H${toolNumber} (Tool length offset)`);
        lines.push(`${cmds.enable} (Enable RTCP/TCP)`);

        if (controller === 'SIEMENS') {
            lines.push(`${cmds.tcp} (RTCP active)`);
        }
        return lines.join('\n');
    },
    // Generate G-code for RTCP deactivation
    generateDisableGCode: function(controller = 'FANUC') {
        const cmds = this.commands[controller] || this.commands.FANUC;
        return `${cmds.disable} (Disable RTCP/TCP)`;
    },
    // Check if position requires RTCP based on rotary angles
    requiresRTCP: function(rotaryAngles, threshold = 0.1) {
        const { a = 0, b = 0, c = 0 } = rotaryAngles;

        // RTCP needed if any rotary axis is significantly non-zero
        return Math.abs(a) > threshold || Math.abs(b) > threshold;
        // Note: C-axis rotation alone doesn't require RTCP for most configs
    }
};
// SECTION 5: SINGULARITY AVOIDANCE STRATEGIES
// Source: MIT 2.003J, Stanford CS 223A

const PRISM_SINGULARITY_AVOIDANCE = {
    version: '1.0.0',
    name: 'Singularity Avoidance Engine',

    strategies: {
        REDIRECT: 'redirect_to_safe',      // Move to safe position first
        LINEARIZE: 'linearize_motion',     // Use linear approximation through singularity
        SMOOTH: 'smooth_transition',       // Gradual transition using damped motion
        REORIENT: 'reorient_tool',         // Change tool orientation approach
        SPLIT: 'split_motion'              // Split move into segments
    },
    // Analyze toolpath for singularity zones
    analyzeToolpath: function(toolpath, config) {
        const zones = [];
        const singularityAxes = this._getSingularityAxes(config);

        toolpath.forEach((point, index) => {
            const angles = { a: point.a || 0, b: point.b || 0, c: point.c || 0 };

            singularityAxes.forEach(({ axis, criticalAngles }) => {
                const angleValue = angles[axis.toLowerCase()];

                criticalAngles.forEach(critAngle => {
                    const distance = Math.abs(angleValue - critAngle);

                    if (distance < 5) { // Within 5 degrees of singularity
                        zones.push({
                            pointIndex: index,
                            point: point,
                            axis: axis,
                            criticalAngle: critAngle,
                            distance: distance,
                            severity: distance < 1 ? 'critical' : distance < 3 ? 'warning' : 'caution'
                        });
                    }
                });
            });
        });

        return {
            hasSingularities: zones.length > 0,
            zones: zones,
            criticalCount: zones.filter(z => z.severity === 'critical').length,
            warningCount: zones.filter(z => z.severity === 'warning').length
        };
    },
    // Apply avoidance strategy to toolpath
    applyAvoidanceStrategy: function(toolpath, singularityZones, strategy = 'SMOOTH') {
        const modifiedPath = [...toolpath];

        singularityZones.forEach(zone => {
            if (zone.severity !== 'critical') return;

            switch (strategy) {
                case 'REDIRECT':
                    this._applyRedirect(modifiedPath, zone);
                    break;
                case 'LINEARIZE':
                    this._applyLinearization(modifiedPath, zone);
                    break;
                case 'SMOOTH':
                    this._applySmoothTransition(modifiedPath, zone);
                    break;
                case 'SPLIT':
                    this._applySplitMotion(modifiedPath, zone);
                    break;
            }
        });

        return modifiedPath;
    },
    // Get singularity axes for configuration
    _getSingularityAxes: function(config) {
        if (config.includes('AC')) {
            return [
                { axis: 'A', criticalAngles: [0] },
                { axis: 'A', criticalAngles: [90, -90] } // workspace limits
            ];
        } else if (config.includes('BC')) {
            return [
                { axis: 'B', criticalAngles: [0] }
            ];
        }
        return [];
    },
    // Redirect strategy: Move away from singularity first
    _applyRedirect: function(path, zone) {
        const idx = zone.pointIndex;
        const axis = zone.axis.toLowerCase();
        const safeOffset = zone.criticalAngle > 0 ? -10 : 10;

        // Insert intermediate point with safe angle
        if (idx > 0) {
            const prevPoint = { ...path[idx - 1] };
            prevPoint[axis] = zone.criticalAngle + safeOffset;
            path.splice(idx, 0, prevPoint);
        }
    },
    // Linearization: Smooth through singularity
    _applyLinearization: function(path, zone) {
        const idx = zone.pointIndex;

        if (idx > 0 && idx < path.length - 1) {
            // Interpolate through singularity
            const prev = path[idx - 1];
            const next = path[idx + 1];

            // Linear interpolation of C-axis through singularity
            path[idx].c = (prev.c + next.c) / 2;
        }
    },
    // Smooth transition: Gradual motion through singularity
    _applySmoothTransition: function(path, zone) {
        const idx = zone.pointIndex;
        const axis = zone.axis.toLowerCase();

        // Add intermediate points for smooth transition
        const numInterpolations = 3;

        if (idx > 0 && idx < path.length) {
            const prev = path[idx - 1];
            const curr = path[idx];

            const interpolated = [];
            for (let i = 1; i <= numInterpolations; i++) {
                const t = i / (numInterpolations + 1);
                const interp = {};

                ['x', 'y', 'z', 'a', 'b', 'c'].forEach(key => {
                    interp[key] = prev[key] + t * (curr[key] - prev[key]);
                });

                // Apply smoothing to the critical axis
                const smoothFactor = 0.5 - 0.5 * Math.cos(Math.PI * t);
                interp[axis] = prev[axis] + smoothFactor * (curr[axis] - prev[axis]);

                interpolated.push(interp);
            }
            path.splice(idx, 0, ...interpolated);
        }
    },
    // Split motion: Break into smaller segments
    _applySplitMotion: function(path, zone) {
        const idx = zone.pointIndex;

        if (idx > 0) {
            const prev = path[idx - 1];
            const curr = path[idx];

            // Split into 5 segments
            const segments = 5;
            const newPoints = [];

            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const point = {};

                ['x', 'y', 'z', 'a', 'b', 'c'].forEach(key => {
                    point[key] = prev[key] + t * (curr[key] - prev[key]);
                });

                newPoints.push(point);
            }
            path.splice(idx, 0, ...newPoints);
        }
    }
};
// SECTION 6: LAYER 5 CAPABILITY REGISTRATION
// Registers all Layer 5 capabilities with PRISM_CAPABILITY_REGISTRY

const PRISM_LAYER5_CAPABILITIES = {
    version: '1.0.0',

    registerAll: function() {
        if (typeof PRISM_CAPABILITY_REGISTRY === 'undefined') {
            console.warn('[PRISM-L5] CAPABILITY_REGISTRY not found, skipping registration');
            return;
        }
        // Capability 1: Forward Kinematics (DH)
        PRISM_CAPABILITY_REGISTRY.register('layer5.kinematics.forward', {
            id: 'kinematics-forward-dh',
            name: 'Forward Kinematics (DH Parameters)',
            description: 'Compute tool position from joint angles using DH parameters',
            category: 'kinematics',
            inputs: {
                config: { type: 'string', required: true, options: Object.keys(PRISM_DH_KINEMATICS.machineConfigs) },
                jointAngles: { type: 'object', required: true }
            },
            outputs: {
                position: 'object',
                toolAxis: 'object',
                orientation: 'object'
            },
            execute: function(params) {
                const dhConfig = PRISM_DH_KINEMATICS.machineConfigs[params.config];
                if (!dhConfig) return { error: 'Unknown configuration' };

                const jointArray = [
                    params.jointAngles.x || 0,
                    params.jointAngles.y || 0,
                    params.jointAngles.z || 0,
                    params.jointAngles.a || params.jointAngles.b || 0,
                    params.jointAngles.c || 0
                ];

                const T = PRISM_DH_KINEMATICS.forwardKinematicsDH(dhConfig.dhParams, jointArray);
                return PRISM_DH_KINEMATICS.extractPose(T);
            },
            preferredUI: 'form-result'
        });

        // Capability 2: Inverse Kinematics
        PRISM_CAPABILITY_REGISTRY.register('layer5.kinematics.inverse', {
            id: 'kinematics-inverse-ik',
            name: 'Inverse Kinematics Solver',
            description: 'Compute joint angles from desired tool position/orientation',
            category: 'kinematics',
            inputs: {
                targetPosition: { type: 'object', required: true },
                targetToolVector: { type: 'object', required: true },
                config: { type: 'string', required: true },
                toolLength: { type: 'number', default: 0 }
            },
            outputs: {
                solution: 'object',
                warnings: 'array'
            },
            execute: function(params) {
                return PRISM_INVERSE_KINEMATICS_SOLVER.solveIKClosedForm(
                    params.targetPosition,
                    params.targetToolVector,
                    params.config,
                    params.toolLength
                );
            },
            preferredUI: 'form-result'
        });

        // Capability 3: Jacobian & Singularity Analysis
        PRISM_CAPABILITY_REGISTRY.register('layer5.kinematics.singularity', {
            id: 'kinematics-singularity-check',
            name: 'Singularity Detection',
            description: 'Detect kinematic singularities from current position',
            category: 'kinematics',
            inputs: {
                config: { type: 'string', required: true },
                jointAngles: { type: 'object', required: true },
                toolLength: { type: 'number', default: 100 }
            },
            outputs: {
                nearSingularity: 'boolean',
                conditionNumber: 'number',
                manipulability: 'number',
                singularities: 'array'
            },
            execute: function(params) {
                const jacobian = PRISM_JACOBIAN_ENGINE.computeAnalyticalJacobian5Axis(
                    params.config,
                    params.jointAngles,
                    params.toolLength
                );

                const analysis = PRISM_JACOBIAN_ENGINE.detectSingularity(jacobian);
                const configCheck = PRISM_JACOBIAN_ENGINE.checkConfigSingularities(params.config, params.jointAngles);

                return {
                    ...analysis,
                    singularities: configCheck.singularities
                };
            },
            preferredUI: 'status-panel'
        });

        // Capability 4: RTCP Compensation
        PRISM_CAPABILITY_REGISTRY.register('layer5.kinematics.rtcp', {
            id: 'kinematics-rtcp-compute',
            name: 'RTCP Compensation',
            description: 'Compute TCP compensation for 5-axis positioning',
            category: 'kinematics',
            inputs: {
                programmedPosition: { type: 'object', required: true },
                rotaryAngles: { type: 'object', required: true },
                toolLength: { type: 'number', required: true },
                config: { type: 'string', default: 'BC' }
            },
            outputs: {
                compensatedPosition: 'object',
                original: 'object'
            },
            execute: function(params) {
                PRISM_RTCP_ENGINE.initialize(params.toolLength, { pivotDistance: 0 });
                return PRISM_RTCP_ENGINE.computeTCPCompensation(
                    params.programmedPosition,
                    params.rotaryAngles,
                    params.config
                );
            },
            preferredUI: 'form-result'
        });

        // Capability 5: Toolpath Singularity Analysis
        PRISM_CAPABILITY_REGISTRY.register('layer5.kinematics.analyzeToolpath', {
            id: 'kinematics-toolpath-singularity',
            name: 'Toolpath Singularity Analysis',
            description: 'Analyze toolpath for singularity zones',
            category: 'kinematics',
            inputs: {
                toolpath: { type: 'array', required: true },
                config: { type: 'string', required: true }
            },
            outputs: {
                hasSingularities: 'boolean',
                zones: 'array',
                criticalCount: 'number'
            },
            execute: function(params) {
                return PRISM_SINGULARITY_AVOIDANCE.analyzeToolpath(params.toolpath, params.config);
            },
            preferredUI: 'table-result'
        });

        console.log('[PRISM-L5] 5 kinematics capabilities registered');
    }
};
// SECTION 7: EVENT BUS INTEGRATION

const PRISM_LAYER5_EVENTS = {
    initialize: function() {
        if (typeof PRISM_EVENT_BUS === 'undefined') {
            console.warn('[PRISM-L5] EVENT_BUS not found, skipping event setup');
            return;
        }
        // Subscribe to machine configuration changes
        PRISM_EVENT_BUS.subscribe('machine:config:changed', (data) => {
            console.log('[PRISM-L5] Machine config changed:', data.configName);

            // Validate new configuration
            const config = PRISM_DH_KINEMATICS.machineConfigs[data.configName];
            if (config) {
                PRISM_EVENT_BUS.publish('kinematics:config:validated', {
                    configName: data.configName,
                    config: config,
                    singularities: config.singularities
                });
            }
        });

        // Subscribe to position updates for singularity monitoring
        PRISM_EVENT_BUS.subscribe('position:updated', (data) => {
            if (data.config && (data.a !== undefined || data.b !== undefined)) {
                const singCheck = PRISM_JACOBIAN_ENGINE.checkConfigSingularities(
                    data.config,
                    { a: data.a, b: data.b, c: data.c }
                );

                if (singCheck.hasSingularity) {
                    PRISM_EVENT_BUS.publish('kinematics:singularity:warning', singCheck);
                }
            }
        });

        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM-L5] Event bus integration complete');
    }
};
// SECTION 8: SELF-TESTS

const PRISM_LAYER5_TESTS = {
    runAll: function() {
        console.log('[PRISM-L5] Running self-tests...');
        const results = [];

        // Test 1: DH Forward Kinematics
        try {
            const config = PRISM_DH_KINEMATICS.machineConfigs.TABLE_TABLE_AC;
            const T = PRISM_DH_KINEMATICS.forwardKinematicsDH(config.dhParams, [100, 50, -50, 30, 45]);
            const pose = PRISM_DH_KINEMATICS.extractPose(T);

            results.push({
                test: 'DH Forward Kinematics',
                passed: pose.position && typeof pose.position.x === 'number',
                result: pose.position
            });
        } catch (e) {
            results.push({ test: 'DH Forward Kinematics', passed: false, error: e.message });
        }
        // Test 2: Closed-form IK
        try {
            const ikResult = PRISM_INVERSE_KINEMATICS_SOLVER.solveIKClosedForm(
                { x: 100, y: 50, z: -50 },
                { i: 0.5, j: 0.5, k: 0.707 },
                'TABLE_TABLE_AC',
                100
            );

            results.push({
                test: 'Closed-form IK',
                passed: ikResult.success && ikResult.solution,
                result: ikResult.solution
            });
        } catch (e) {
            results.push({ test: 'Closed-form IK', passed: false, error: e.message });
        }
        // Test 3: Jacobian computation
        try {
            const J = PRISM_JACOBIAN_ENGINE.computeAnalyticalJacobian5Axis(
                'BC',
                { x: 0, y: 0, z: 0, b: 30, c: 45 },
                100
            );

            results.push({
                test: 'Jacobian Computation',
                passed: J.length === 6 && J[0].length === 5,
                result: { rows: J.length, cols: J[0].length }
            });
        } catch (e) {
            results.push({ test: 'Jacobian Computation', passed: false, error: e.message });
        }
        // Test 4: Singularity detection
        try {
            const singCheck = PRISM_JACOBIAN_ENGINE.checkConfigSingularities('BC', { b: 0.5, c: 45 });

            results.push({
                test: 'Singularity Detection',
                passed: singCheck.singularities !== undefined,
                result: { hasSingularity: singCheck.hasSingularity, count: singCheck.singularities.length }
            });
        } catch (e) {
            results.push({ test: 'Singularity Detection', passed: false, error: e.message });
        }
        // Test 5: RTCP Compensation
        try {
            PRISM_RTCP_ENGINE.initialize(100, { pivotDistance: 200 });
            const comp = PRISM_RTCP_ENGINE.computeTCPCompensation(
                { x: 100, y: 50, z: 0 },
                { b: 30, c: 45 },
                'BC'
            );

            results.push({
                test: 'RTCP Compensation',
                passed: comp.compensated === true,
                result: { x: comp.x?.toFixed(3), y: comp.y?.toFixed(3), z: comp.z?.toFixed(3) }
            });
        } catch (e) {
            results.push({ test: 'RTCP Compensation', passed: false, error: e.message });
        }
        // Summary
        const passed = results.filter(r => r.passed).length;
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[PRISM-L5] Tests completed: ${passed}/${results.length} passed`);

        results.forEach(r => {
            const status = r.passed ? '✅' : '❌';
            console.log(`  ${status} ${r.test}`);
        });

        return { passed, total: results.length, results };
    }
};
// SECTION 9: INITIALIZATION

(function initializeLayer5() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Initializing Layer 5: Machine Kinematics...');

    // Register capabilities
    PRISM_LAYER5_CAPABILITIES.registerAll();

    // Setup event bus integration
    PRISM_LAYER5_EVENTS.initialize();

    // Run self-tests
    const testResults = PRISM_LAYER5_TESTS.runAll();

    // Publish initialization complete event
    if (typeof PRISM_EVENT_BUS !== 'undefined') {
        PRISM_EVENT_BUS.publish('layer5:initialized', {
            version: '1.0.0',
            modules: ['DH_KINEMATICS', 'JACOBIAN_ENGINE', 'IK_SOLVER', 'RTCP_ENGINE', 'SINGULARITY_AVOIDANCE'],
            capabilities: 5,
            testsPassed: testResults.passed,
            testsTotal: testResults.total
        });
    }
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Layer 5: Machine Kinematics loaded successfully');
    console.log('═'.repeat(70));
    console.log('  PRISM LAYER 5 COMPONENTS:');
    console.log('  • PRISM_DH_KINEMATICS - DH parameter forward kinematics');
    console.log('  • PRISM_JACOBIAN_ENGINE - Jacobian & singularity analysis');
    console.log('  • PRISM_INVERSE_KINEMATICS_SOLVER - Iterative & closed-form IK');
    console.log('  • PRISM_RTCP_ENGINE - TCP compensation (G43.4/G43.5)');
    console.log('  • PRISM_SINGULARITY_AVOIDANCE - Toolpath singularity handling');
    console.log('═'.repeat(70));
})();

// 5. PRISM_VERIFICATION_CENTER
// Unified verification and validation hub
// Combines all verification capabilities

const PRISM_VERIFICATION_CENTER = {
  version: '1.0.0',
  name: 'PRISM Unified Verification Center',

  config: {
    autoCollisionCheck: true,
    autoMaterialRemoval: true,
    autoRestMaterialAnalysis: true,
    simulationSpeed: 1.0, // 1.0 = realtime, 2.0 = 2x speed
    stopOnCollision: true,
    stopAtM0: true,
    stopAtLineNumber: null
  },
  state: {
    currentJob: null,
    simulationState: 'idle', // idle, running, paused, complete
    currentBlock: 0,
    totalBlocks: 0,
    currentTime: 0,
    totalTime: 0,
    results: {
      collisions: [],
      nearMisses: [],
      restMaterial: null,
      cycleTime: 0
    }
  },
  // INTEGRATION WITH OTHER ENGINES

  engines: {
    voxelStock: null,
    collision: null,
    restMaterial: null,
    kinematics: null
  },
  initialize() {
    // Connect to other PRISM engines
    if (typeof PRISM_VOXEL_STOCK_ENGINE !== 'undefined') {
      this.engines.voxelStock = PRISM_VOXEL_STOCK_ENGINE;
    }
    if (typeof PRISM_COLLISION_DETECTION_V2 !== 'undefined') {
      this.engines.collision = PRISM_COLLISION_DETECTION_V2;
    }
    if (typeof PRISM_REST_MATERIAL_ENGINE !== 'undefined') {
      this.engines.restMaterial = PRISM_REST_MATERIAL_ENGINE;
    }
    if (typeof PRISM_MACHINE_KINEMATICS_ENGINE !== 'undefined') {
      this.engines.kinematics = PRISM_MACHINE_KINEMATICS_ENGINE;
    }
    console.log('[PRISM-VERIFICATION] Initialized with engines:', Object.keys(this.engines).filter(k => this.engines[k]));
    return true;
  },
  // JOB SETUP

  loadJob(job) {
    this.state.currentJob = job;
    this.state.simulationState = 'idle';
    this.state.currentBlock = 0;
    this.state.totalBlocks = job.toolpath ? job.toolpath.points.length : 0;
    this.state.results = {
      collisions: [],
      nearMisses: [],
      restMaterial: null,
      cycleTime: 0
    };
    // Initialize stock if available
    if (this.engines.voxelStock && job.stock) {
      this.engines.voxelStock.initializeFromBox(
        job.stock.minX, job.stock.minY, job.stock.minZ,
        job.stock.maxX, job.stock.maxY, job.stock.maxZ,
        job.stock.resolution
      );
    }
    // Set machine configuration
    if (this.engines.kinematics && job.machine) {
      this.engines.kinematics.setMachineConfiguration(job.machine.configuration);
    }
    return {
      success: true,
      blocks: this.state.totalBlocks,
      estimatedTime: this._estimateCycleTime(job)
    };
  },
  // SIMULATION CONTROL

  start() {
    if (!this.state.currentJob) {
      return { error: 'No job loaded' };
    }
    this.state.simulationState = 'running';
    this._runSimulation();

    return { status: 'started' };
  },
  pause() {
    this.state.simulationState = 'paused';
    return { status: 'paused', currentBlock: this.state.currentBlock };
  },
  stop() {
    this.state.simulationState = 'idle';
    this.state.currentBlock = 0;
    return { status: 'stopped' };
  },
  stepForward() {
    if (this.state.currentBlock < this.state.totalBlocks - 1) {
      this.state.currentBlock++;
      this._processBlock(this.state.currentBlock);
      return { block: this.state.currentBlock };
    }
    return { block: this.state.currentBlock, atEnd: true };
  },
  stepBackward() {
    // Note: stepping backward requires recalculating from start
    if (this.state.currentBlock > 0) {
      this.state.currentBlock--;
      // Would need to rebuild stock state to this point
      return { block: this.state.currentBlock };
    }
    return { block: this.state.currentBlock, atStart: true };
  },
  goToBlock(blockNumber) {
    if (blockNumber >= 0 && blockNumber < this.state.totalBlocks) {
      this.state.currentBlock = blockNumber;
      return { block: this.state.currentBlock };
    }
    return { error: 'Invalid block number' };
  },
  // SIMULATION EXECUTION

  _runSimulation() {
    const simulate = () => {
      if (this.state.simulationState !== 'running') return;

      if (this.state.currentBlock < this.state.totalBlocks) {
        const result = this._processBlock(this.state.currentBlock);

        // Check stop conditions
        if (this.config.stopOnCollision && result.collision) {
          this.state.simulationState = 'paused';
          console.log('[PRISM-VERIFICATION] Stopped at collision, block:', this.state.currentBlock);
          return;
        }
        if (this.config.stopAtM0 && result.m0) {
          this.state.simulationState = 'paused';
          console.log('[PRISM-VERIFICATION] Stopped at M0, block:', this.state.currentBlock);
          return;
        }
        if (this.config.stopAtLineNumber && this.state.currentBlock >= this.config.stopAtLineNumber) {
          this.state.simulationState = 'paused';
          console.log('[PRISM-VERIFICATION] Stopped at line number:', this.state.currentBlock);
          return;
        }
        this.state.currentBlock++;

        // Continue simulation
        const delay = 1000 / (60 * this.config.simulationSpeed); // 60 blocks per second at 1x
        setTimeout(simulate, delay);
      } else {
        this.state.simulationState = 'complete';
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM-VERIFICATION] Simulation complete');
        this._finalizeResults();
      }
    };
    simulate();
  },
  _processBlock(blockIndex) {
    const job = this.state.currentJob;
    const point = job.toolpath.points[blockIndex];
    const result = { collision: false, m0: false };

    // Material removal
    if (this.config.autoMaterialRemoval && this.engines.voxelStock && !point.rapid) {
      this.engines.voxelStock.removeMaterial(
        { x: point.x, y: point.y, z: point.z },
        job.tool
      );
    }
    // Collision check
    if (this.config.autoCollisionCheck && this.engines.collision) {
      const checkResult = this.engines.collision.checkPosition(
        { x: point.x, y: point.y, z: point.z },
        { a: point.a, b: point.b, c: point.c },
        job.tool
      );

      if (checkResult.collision) {
        result.collision = true;
        this.state.results.collisions.push({
          block: blockIndex,
          position: { x: point.x, y: point.y, z: point.z },
          components: checkResult.collidingComponents
        });
      }
    }
    // Check for M0 (program stop)
    if (point.m0 || point.m === 0) {
      result.m0 = true;
    }
    return result;
  },
  _finalizeResults() {
    // Run rest material analysis
    if (this.config.autoRestMaterialAnalysis && this.engines.restMaterial) {
      const restResults = this.engines.restMaterial.analyzeRestMaterial();
      this.state.results.restMaterial = restResults;
    }
    // Calculate final statistics
    this.state.results.cycleTime = this.state.totalTime;
    this.state.results.summary = {
      blocksProcessed: this.state.totalBlocks,
      collisionsDetected: this.state.results.collisions.length,
      nearMissesDetected: this.state.results.nearMisses.length,
      materialRemoved: this.engines.voxelStock ?
        this.engines.voxelStock.getStatistics().removedVolume : 0
    };
  },
  _estimateCycleTime(job) {
    // Simple estimation based on toolpath length and feed rates
    let totalTime = 0;

    if (job.toolpath && job.toolpath.points) {
      for (let i = 1; i < job.toolpath.points.length; i++) {
        const p1 = job.toolpath.points[i - 1];
        const p2 = job.toolpath.points[i];

        const distance = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) +
          Math.pow(p2.y - p1.y, 2) +
          Math.pow(p2.z - p1.z, 2)
        );

        const feed = p2.f || p1.f || 1000; // mm/min
        const rapid = p2.rapid ? 10000 : feed; // Assume 10m/min rapid

        totalTime += (distance / (p2.rapid ? rapid : feed)) * 60; // seconds
      }
    }
    this.state.totalTime = totalTime;
    return totalTime;
  },
  // RESULTS AND REPORTING

  getStatus() {
    return {
      state: this.state.simulationState,
      progress: {
        currentBlock: this.state.currentBlock,
        totalBlocks: this.state.totalBlocks,
        percentage: ((this.state.currentBlock / this.state.totalBlocks) * 100).toFixed(1)
      },
      time: {
        elapsed: this.state.currentTime,
        estimated: this.state.totalTime
      },
      results: {
        collisions: this.state.results.collisions.length,
        nearMisses: this.state.results.nearMisses.length
      }
    };
  },
  getFullReport() {
    return {
      job: this.state.currentJob ? {
        name: this.state.currentJob.name,
        tool: this.state.currentJob.tool
      } : null,
      status: this.getStatus(),
      collisions: this.state.results.collisions,
      nearMisses: this.state.results.nearMisses,
      restMaterial: this.state.results.restMaterial,
      stock: this.engines.voxelStock ? this.engines.voxelStock.getStatistics() : null,
      recommendations: this._generateRecommendations()
    };
  },
  _generateRecommendations() {
    const recommendations = [];

    if (this.state.results.collisions.length > 0) {
      recommendations.push({
        severity: 'error',
        message: `${this.state.results.collisions.length} collision(s) detected - NC file cannot be approved`
      });
    }
    if (this.state.results.nearMisses.length > 10) {
      recommendations.push({
        severity: 'warning',
        message: 'Multiple near-miss events detected - consider reviewing clearance distances'
      });
    }
    if (this.state.results.restMaterial && this.state.results.restMaterial.summary) {
      if (parseFloat(this.state.results.restMaterial.summary.maxRestFound) > 0.5) {
        recommendations.push({
          severity: 'info',
          message: 'Significant rest material detected - consider rest machining operation'
        });
      }
    }
    return recommendations;
  }
};
// WINDOW REGISTRATION AND INITIALIZATION

// Register all new engines
if (typeof window !== 'undefined') {
  window.PRISM_VOXEL_STOCK_ENGINE = PRISM_VOXEL_STOCK_ENGINE;
  window.PRISM_COLLISION_DETECTION_V2 = PRISM_COLLISION_DETECTION_V2;
  window.PRISM_REST_MATERIAL_ENGINE = PRISM_REST_MATERIAL_ENGINE;
  window.PRISM_MACHINE_KINEMATICS_ENGINE = PRISM_MACHINE_KINEMATICS_ENGINE;
  window.PRISM_VERIFICATION_CENTER = PRISM_VERIFICATION_CENTER;
}
// Initialize verification center after other engines
if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') {
    PRISM_VERIFICATION_CENTER.initialize();
  } else {
    window.addEventListener('load', () => {
      PRISM_VERIFICATION_CENTER.initialize();
    });
  }
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] IMPROVEMENTS BATCH 1 - v8.9.290 LOADED');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] New Components:');
console.log('  - PRISM_VOXEL_STOCK_ENGINE v1.0.0');
console.log('  - PRISM_COLLISION_DETECTION_V2 v2.0.0');
console.log('  - PRISM_REST_MATERIAL_ENGINE v1.0.0');
console.log('  - PRISM_MACHINE_KINEMATICS_ENGINE v1.0.0');
console.log('  - PRISM_VERIFICATION_CENTER v1.0.0');

// BATCH 2 IMPROVEMENTS - v8.9.290 INTEGRATED
// Integrated: Wire EDM, ML Patterns, Workflow V2, UI Integration, Cycle Time

// PRISM IMPROVEMENTS BATCH 2 - v8.9.290
// Building on v8.9.290
// BATCH 2 CONTENTS:
// 1. WIRE_EDM_STRATEGY_DATABASE - Comprehensive Wire EDM strategies
// 2. PRISM_ML_TRAINING_PATTERNS_DATABASE - ML training data patterns
// 3. PRISM_WORKFLOW_ORCHESTRATOR_V2 - Enhanced workflow management
// 4. PRISM_UI_INTEGRATION_ENGINE - Unified UI/3D integration
// 5. PRISM_CYCLE_TIME_PREDICTION_ENGINE - Accurate cycle time estimation

// 1. WIRE_EDM_STRATEGY_DATABASE
// Comprehensive Wire EDM strategies based on Mastercam Wire and industry standards

const WIRE_EDM_STRATEGY_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Wire EDM Strategy Database',

  // WIRE EDM FUNDAMENTALS
  fundamentals: {
    process: {
      description: 'Wire Electrical Discharge Machining (Wire EDM) uses electrical discharges to erode material',
      principle: 'Spark erosion between wire electrode and workpiece in dielectric fluid',
      accuracy: '±0.002mm to ±0.005mm achievable',
      surfaceFinish: 'Ra 0.2 to 1.6 μm typical'
    },
    wireTypes: {
      brass: {
        composition: '65% Cu, 35% Zn',
        diameter: [0.10, 0.15, 0.20, 0.25, 0.30],
        applications: ['General purpose', 'Steel', 'Carbide'],
        tensileStrength: '400-900 N/mm²'
      },
      zinc_coated: {
        composition: 'Brass core with zinc coating',
        diameter: [0.20, 0.25, 0.30],
        applications: ['High-speed cutting', 'Thick workpieces'],
        benefit: '25-30% faster than brass'
      },
      diffusion_annealed: {
        composition: 'Brass with diffused zinc layer',
        diameter: [0.20, 0.25, 0.30],
        applications: ['Fine finishing', 'Complex profiles'],
        benefit: 'Superior surface finish'
      },
      molybdenum: {
        composition: '99.95% Mo',
        diameter: [0.10, 0.15, 0.18],
        applications: ['Fine details', 'Hard materials'],
        benefit: 'Reusable, minimal wire breakage'
      },
      tungsten: {
        composition: '99.95% W',
        diameter: [0.03, 0.05, 0.07],
        applications: ['Micro EDM', 'Ultra-fine features'],
        benefit: 'Smallest possible features'
      }
    },
    dielectricFluids: {
      deionizedWater: {
        resistivity: '1-5 MΩ·cm',
        applications: ['Most common', 'Steel', 'Aluminum'],
        advantages: ['Clean', 'Safe', 'Economical']
      },
      oilBased: {
        type: 'EDM oil',
        applications: ['Carbide', 'PCD', 'CBN'],
        advantages: ['Better surface finish on hard materials']
      }
    }
  },
  // TOOLPATH STRATEGIES
  strategies: {
    // 2-Axis Strategies
    contour: {
      type: '2-axis',
      name: 'Wire Contour',
      description: 'Same shape at top and bottom of workpiece',
      parameters: {
        compensation: ['Computer', 'Control', 'None', 'Reverse'],
        direction: ['Climb', 'Conventional'],
        leadIn: ['Line', 'Arc', 'Line and Arc', 'Perpendicular'],
        leadOut: ['Line', 'Arc', 'Arc and Line', 'None'],
        overlap: { min: 0, max: 1, default: 0.02, unit: 'mm' }
      },
      passSequence: ['Rough', 'Skim1', 'Skim2', 'Skim3'],
      applications: ['Punch shapes', 'Die openings', 'General profiles']
    },
    noCore: {
      type: '2-axis',
      name: 'No Core Contour',
      description: 'Roughing followed by slug destruction',
      parameters: {
        slugRemoval: ['Core destruction', 'Tabbed'],
        gridPattern: ['Spiral', 'ZigZag', 'Parallel'],
        gridSpacing: { min: 0.5, max: 5, default: 1, unit: 'mm' }
      },
      applications: ['Large pockets', 'Slug disposal needed', 'Blind pockets']
    },
    openContour: {
      type: '2-axis',
      name: 'Open Path',
      description: 'Non-closed wire path for partial features',
      parameters: {
        entryPoint: ['Start', 'End', 'Midpoint'],
        exitPoint: ['Start', 'End', 'Midpoint'],
        cornerTreatment: ['Sharp', 'Radius', 'Chamfer']
      },
      applications: ['Slots', 'Grooves', 'Partial profiles']
    },
    // 4-Axis Strategies
    fourAxisTaper: {
      type: '4-axis',
      name: '4-Axis Taper',
      description: 'Different XY and UV contours for tapered parts',
      parameters: {
        syncMode: [
          'By entity',   // Same number of entities required
          'By branch',   // Uses 3D branch points
          'By point',    // User-defined sync points
          'Manual',      // Manual area matching
          'By node',     // Parametric spline node matching
          'Manual/density' // With density control
        ],
        taperAngle: { min: -45, max: 45, unit: 'degrees' },
        uvPlaneHeight: { type: 'absolute', relative: 'stock_top' },
        xyPlaneHeight: { type: 'absolute', relative: 'stock_bottom' }
      },
      applications: ['Extrusion dies', 'Draft angles', 'Tapered punches']
    },
    fourAxisConstantTaper: {
      type: '4-axis',
      name: '4-Axis Constant Taper',
      description: 'Same profile with constant taper angle',
      parameters: {
        taperAngle: { min: -45, max: 45, default: 0, unit: 'degrees' },
        taperDirection: ['Inward', 'Outward'],
        landHeight: { min: 0, max: 50, unit: 'mm' }
      },
      applications: ['Die clearance', 'Punch relief', 'Injection molds']
    },
    fourAxisVariable: {
      type: '4-axis',
      name: '4-Axis Variable Taper',
      description: 'Variable taper angle around contour',
      parameters: {
        taperByEntity: true,
        taperTable: { type: 'entity_angle_mapping' },
        blendMethod: ['Linear', 'Smooth', 'Sharp']
      },
      applications: ['Complex extrusion dies', 'Variable relief']
    },
    // Special Strategies
    multipleContours: {
      type: '2-axis',
      name: 'Multiple Contours',
      description: 'Process multiple shapes in optimized sequence',
      parameters: {
        sortMethod: ['Inside out', 'Outside in', 'Shortest path', 'Manual'],
        commonApproach: true,
        machineOrder: { type: 'optimization' }
      },
      applications: ['Multi-cavity dies', 'Gang tooling', 'Production']
    },
    tabbed: {
      type: '2-axis',
      name: 'Tabbed Contour',
      description: 'Leave tabs to hold slug during cutting',
      parameters: {
        tabCount: { min: 1, max: 20, default: 4 },
        tabWidth: { min: 0.2, max: 5, default: 1.5, unit: 'mm' },
        tabLocation: ['Automatic', 'Manual', 'Equal spacing'],
        tabCutOrder: ['After roughing', 'After finishing', 'Separate operation']
      },
      applications: ['Heavy slugs', 'Preventing wire break', 'Part retention']
    }
  },
  // PASS DEFINITIONS
  passDefinitions: {
    rough: {
      name: 'Rough Cut',
      purpose: 'Material removal, establish profile',
      typical: {
        offset: '0.15-0.20mm per side',
        power: 'High',
        feed: 'Moderate',
        wireSpeed: 'High',
        flushing: 'Maximum'
      },
      wireWear: 'Highest - use fresh wire'
    },
    skim1: {
      name: 'First Skim',
      purpose: 'Remove roughing marks, establish accuracy',
      typical: {
        offset: '0.05-0.08mm per side',
        power: 'Medium-High',
        feed: 'Moderate-Fast',
        wireSpeed: 'Medium',
        flushing: 'Medium-High'
      },
      stockRemoval: '0.10-0.12mm'
    },
    skim2: {
      name: 'Second Skim',
      purpose: 'Improve surface finish',
      typical: {
        offset: '0.02-0.04mm per side',
        power: 'Medium',
        feed: 'Fast',
        wireSpeed: 'Medium',
        flushing: 'Medium'
      },
      stockRemoval: '0.03-0.06mm'
    },
    skim3: {
      name: 'Third Skim (Polish)',
      purpose: 'Final surface finish',
      typical: {
        offset: '0.00-0.01mm per side',
        power: 'Low',
        feed: 'Very Fast',
        wireSpeed: 'Low',
        flushing: 'Light'
      },
      stockRemoval: '0.01-0.02mm'
    },
    tab: {
      name: 'Tab Cut',
      purpose: 'Remove tabs after main cutting',
      typical: {
        power: 'Medium',
        feed: 'Slow',
        approach: 'Tangential entry'
      }
    }
  },
  // COMPENSATION METHODS
  compensation: {
    computer: {
      name: 'Computer Compensation',
      description: 'Offset calculated in CAM software',
      output: 'Centerline path (no G41/G42)',
      advantages: ['Visual verification', 'Accurate preview', 'Control independence'],
      code: 'No compensation codes in NC'
    },
    control: {
      name: 'Control Compensation',
      description: 'Offset calculated by machine control',
      output: 'Programmed path with G41/G42',
      advantages: ['Runtime adjustment', 'Wear compensation', 'Size optimization'],
      codes: {
        left: 'G41',
        right: 'G42',
        cancel: 'G40'
      }
    },
    wireDiameter: {
      description: 'Compensation includes wire radius plus spark gap',
      calculation: 'Offset = (WireDiameter / 2) + SparkGap + StockAllowance',
      typical: {
        '0.20mm_wire': { sparkGap: 0.012, total: 0.112 },
        '0.25mm_wire': { sparkGap: 0.015, total: 0.140 },
        '0.30mm_wire': { sparkGap: 0.018, total: 0.168 }
      }
    }
  },
  // FLUSHING STRATEGIES
  flushing: {
    standard: {
      name: 'Standard Flushing',
      pressure: 'Medium',
      upperGuide: 'On',
      lowerGuide: 'On',
      applications: ['General cutting', 'Through cuts']
    },
    submerged: {
      name: 'Submerged Cutting',
      description: 'Workpiece fully submerged in dielectric',
      advantages: ['Better heat dissipation', 'Improved finish', 'Less oxidation'],
      applications: ['High-precision', 'Fine finishing']
    },
    lowPressure: {
      name: 'Low Pressure Flushing',
      description: 'Reduced flushing for delicate features',
      applications: ['Thin walls', 'Fine details', 'Fragile parts'],
      settings: { pressure: '10-30%', flowRate: 'Reduced' }
    },
    pulsed: {
      name: 'Pulsed Flushing',
      description: 'Intermittent flushing synchronized with spark',
      applications: ['Deep cuts', 'Difficult flushing', 'Tall workpieces'],
      benefit: 'Better chip evacuation'
    }
  },
  // MATERIAL-SPECIFIC PARAMETERS
  materialParameters: {
    steel: {
      toolSteel: {
        power: 'Standard',
        wireType: 'brass',
        speedFactor: 1.0,
        surfaceFinish: 'Good'
      },
      stainless: {
        power: 'Reduced 10-15%',
        wireType: 'zinc_coated',
        speedFactor: 0.85,
        notes: 'Increased wire wear'
      },
      hardened: {
        power: 'Standard to high',
        wireType: 'brass',
        speedFactor: 0.9,
        notes: 'Excellent results, stable process'
      }
    },
    carbide: {
      tungsten_carbide: {
        power: 'High',
        wireType: 'zinc_coated',
        speedFactor: 0.3,
        dielectric: 'Oil recommended',
        notes: 'Very slow, excellent finish possible'
      }
    },
    aluminum: {
      general: {
        power: 'Reduced 20-30%',
        wireType: 'brass',
        speedFactor: 1.5,
        notes: 'Fast cutting, good flushing critical'
      }
    },
    copper: {
      general: {
        power: 'Reduced 15-20%',
        wireType: 'brass',
        speedFactor: 1.3,
        notes: 'Excellent conductivity aids process'
      }
    },
    titanium: {
      general: {
        power: 'Medium',
        wireType: 'zinc_coated',
        speedFactor: 0.6,
        dielectric: 'Deionized water',
        notes: 'Heat sensitive, good flushing required'
      }
    },
    graphite: {
      general: {
        power: 'Low',
        wireType: 'brass',
        speedFactor: 2.0,
        notes: 'Very fast, heavy particle generation'
      }
    },
    pcd_cbn: {
      polycrystalline: {
        power: 'Very High',
        wireType: 'brass',
        speedFactor: 0.1,
        dielectric: 'Oil required',
        notes: 'Extremely slow, special technology required'
      }
    }
  },
  // HELPER FUNCTIONS

  getRecommendedStrategy(partType, taperRequired) {
    if (taperRequired && partType.differentTopBottom) {
      return this.strategies.fourAxisTaper;
    } else if (taperRequired) {
      return this.strategies.fourAxisConstantTaper;
    } else if (partType.multiCavity) {
      return this.strategies.multipleContours;
    } else if (partType.heavySlug) {
      return this.strategies.tabbed;
    } else {
      return this.strategies.contour;
    }
  },
  calculateCuttingTime(length, thickness, material, wireType) {
    const baseRate = this.materialParameters[material]?.general?.speedFactor || 1.0;
    const thicknessFactor = 1 + (thickness - 10) * 0.02; // Base at 10mm
    const wireRate = wireType === 'zinc_coated' ? 1.25 : 1.0;

    const effectiveRate = 100 * baseRate * wireRate / thicknessFactor; // mm²/min
    return (length * thickness) / effectiveRate; // minutes
  },
  getWireSelection(material, precision, thickness) {
    if (precision === 'ultra' && thickness < 10) {
      return this.fundamentals.wireTypes.tungsten;
    } else if (material === 'carbide' || material === 'pcd_cbn') {
      return this.fundamentals.wireTypes.zinc_coated;
    } else if (precision === 'high') {
      return this.fundamentals.wireTypes.diffusion_annealed;
    } else {
      return this.fundamentals.wireTypes.brass;
    }
  }
};
// 2. PRISM_ML_TRAINING_PATTERNS_DATABASE
// Machine learning training patterns for strategy recommendations

const PRISM_ML_TRAINING_PATTERNS_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Machine Learning Training Patterns',

  // FEATURE VECTORS FOR ML MODELS
  featureDefinitions: {
    geometry: {
      surfaceArea: { type: 'continuous', unit: 'mm²', normalize: [0, 1000000] },
      volume: { type: 'continuous', unit: 'mm³', normalize: [0, 10000000] },
      boundingBoxRatio: { type: 'continuous', description: 'Length/Width/Height ratios' },
      featureCount: { type: 'integer', description: 'Number of recognized features' },
      pocketCount: { type: 'integer' },
      holeCount: { type: 'integer' },
      slotCount: { type: 'integer' },
      surfaceComplexity: { type: 'continuous', range: [0, 1] },
      undercuts: { type: 'boolean' },
      thinWalls: { type: 'boolean', threshold: '< 2mm' },
      deepPockets: { type: 'boolean', threshold: 'depth > 3x width' }
    },
    material: {
      type: { type: 'categorical', values: ['steel', 'aluminum', 'titanium', 'superalloy', 'copper', 'plastic'] },
      hardness: { type: 'continuous', unit: 'HRC', range: [0, 70] },
      machinability: { type: 'continuous', range: [0, 100] },
      thermalConductivity: { type: 'continuous' },
      abrasiveness: { type: 'categorical', values: ['low', 'medium', 'high'] }
    },
    tolerance: {
      surfaceFinish: { type: 'continuous', unit: 'Ra μm', range: [0.1, 25] },
      dimensionalTolerance: { type: 'continuous', unit: 'mm', range: [0.001, 1] },
      geometricTolerance: { type: 'continuous' },
      criticalFeatures: { type: 'integer' }
    },
    machine: {
      type: { type: 'categorical', values: ['3-axis', '4-axis', '5-axis', 'mill-turn'] },
      spindlePower: { type: 'continuous', unit: 'kW' },
      maxRPM: { type: 'continuous' },
      workEnvelope: { type: 'vector', dimensions: 3 },
      rigidity: { type: 'categorical', values: ['light', 'medium', 'heavy'] }
    }
  },
  // TRAINING PATTERNS - ROUGHING
  roughingPatterns: [
    {
      id: 'ROUGH_001',
      name: 'Deep Pocket Roughing - Steel',
      input: {
        geometry: { pocketDepth: 50, pocketWidth: 30, cornerRadius: 5 },
        material: { type: 'steel', hardness: 28, machinability: 70 },
        tolerance: { surfaceFinish: 3.2, dimensional: 0.1 }
      },
      recommendedStrategy: 'optimized_roughing',
      recommendedParams: {
        stepover: '40%',
        stepdown: '1.5 × diameter',
        feedMultiplier: 1.0,
        entryMethod: 'helix',
        toolDiaRatio: 0.6 // Tool diameter vs pocket width
      },
      outcomes: {
        cycleTime: 'baseline',
        toolLife: 'excellent',
        quality: 'good'
      }
    },
    {
      id: 'ROUGH_002',
      name: 'Adaptive Roughing - Aluminum',
      input: {
        geometry: { stockVolume: 500000, pocketCount: 3 },
        material: { type: 'aluminum', hardness: 0, machinability: 100 },
        tolerance: { surfaceFinish: 6.3 }
      },
      recommendedStrategy: 'adaptive_clearing',
      recommendedParams: {
        stepover: '10%',
        stepdown: '2.0 × diameter',
        feedMultiplier: 2.0,
        chipLoad: 0.15,
        entryMethod: 'ramp'
      },
      outcomes: {
        cycleTime: 'reduced_40%',
        toolLife: 'excellent',
        quality: 'good'
      }
    },
    {
      id: 'ROUGH_003',
      name: 'Heavy Roughing - Cast Iron',
      input: {
        geometry: { stockRemoval: 'heavy', surfaceArea: 50000 },
        material: { type: 'cast_iron', hardness: 35, machinability: 50 },
        tolerance: { surfaceFinish: 6.3 }
      },
      recommendedStrategy: 'z_level_roughing',
      recommendedParams: {
        stepover: '65%',
        stepdown: '0.8 × diameter',
        feedMultiplier: 0.8,
        coolant: 'flood',
        tool: 'indexable_insert'
      },
      outcomes: {
        cycleTime: 'moderate',
        toolLife: 'good',
        quality: 'acceptable'
      }
    },
    {
      id: 'ROUGH_004',
      name: 'Superalloy Roughing',
      input: {
        geometry: { complexity: 'medium' },
        material: { type: 'inconel', hardness: 45, machinability: 15 },
        tolerance: { surfaceFinish: 3.2 }
      },
      recommendedStrategy: 'pecking_roughing',
      recommendedParams: {
        stepover: '20%',
        stepdown: '0.3 × diameter',
        feedMultiplier: 0.3,
        coolant: 'high_pressure',
        spindleRPM: 'reduced',
        chipBreaking: true
      },
      outcomes: {
        cycleTime: 'long',
        toolLife: 'challenging',
        quality: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - FINISHING
  finishingPatterns: [
    {
      id: 'FINISH_001',
      name: 'Surface Finishing - Ra 0.8',
      input: {
        geometry: { surfaceType: '3D_freeform', curvature: 'varying' },
        material: { type: 'steel', hardness: 50 },
        tolerance: { surfaceFinish: 0.8 }
      },
      recommendedStrategy: 'parallel_finishing',
      recommendedParams: {
        stepover: '0.1mm',
        toolType: 'ballnose',
        direction: 'climb',
        feedMultiplier: 0.7,
        spindleRPM: 'maximum'
      },
      outcomes: {
        surfaceFinish: 'achieved',
        cycleTime: 'long'
      }
    },
    {
      id: 'FINISH_002',
      name: 'Wall Finishing - Thin Features',
      input: {
        geometry: { wallThickness: 1.5, wallHeight: 30 },
        material: { type: 'aluminum' },
        tolerance: { dimensional: 0.02 }
      },
      recommendedStrategy: 'z_level_finishing',
      recommendedParams: {
        stepdown: '0.5mm',
        toolType: 'endmill',
        passes: ['climb_then_conventional'],
        springPasses: 2,
        reducedFeed: true
      },
      outcomes: {
        deflection: 'minimized',
        accuracy: 'achieved'
      }
    },
    {
      id: 'FINISH_003',
      name: 'Pocket Floor Finishing',
      input: {
        geometry: { surfaceType: 'planar', pocketFloor: true },
        material: { type: 'steel', hardness: 30 },
        tolerance: { flatness: 0.01, surfaceFinish: 1.6 }
      },
      recommendedStrategy: 'face_finishing',
      recommendedParams: {
        stepover: '60%',
        toolType: 'facemill',
        wiper: true,
        feedMultiplier: 1.2
      },
      outcomes: {
        flatness: 'achieved',
        finish: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - 5-AXIS
  fiveAxisPatterns: [
    {
      id: '5X_001',
      name: 'Impeller Blade Machining',
      input: {
        geometry: { bladeCount: 7, bladeHeight: 40, hubDiameter: 100 },
        material: { type: 'titanium' },
        tolerance: { profile: 0.05 }
      },
      recommendedStrategy: 'swarf_cutting',
      recommendedParams: {
        toolType: 'tapered_ballnose',
        leadAngle: 3,
        tiltAngle: 'variable',
        linkingMethod: 'smooth_5axis',
        collisionAvoidance: 'automatic'
      },
      outcomes: {
        blendQuality: 'excellent',
        cycleTime: 'optimized'
      }
    },
    {
      id: '5X_002',
      name: 'Turbine Blade Polishing',
      input: {
        geometry: { bladeType: 'turbine', surfaceArea: 2000 },
        material: { type: 'inconel' },
        tolerance: { surfaceFinish: 0.4 }
      },
      recommendedStrategy: '5axis_flow_finishing',
      recommendedParams: {
        toolType: 'ballnose',
        stepover: '0.05mm',
        toolAxisControl: 'surface_normal',
        leadLag: { lead: 5, lag: 0 }
      },
      outcomes: {
        finish: 'mirror',
        time: 'extended'
      }
    }
  ],

  // TRAINING PATTERNS - DRILLING
  drillingPatterns: [
    {
      id: 'DRILL_001',
      name: 'Deep Hole Drilling',
      input: {
        geometry: { holeDiameter: 10, holeDepth: 100 },
        material: { type: 'steel', hardness: 28 },
        tolerance: { straightness: 0.1 }
      },
      recommendedStrategy: 'peck_drilling',
      recommendedParams: {
        peckDepth: '3 × diameter',
        retract: '1mm',
        coolant: 'through_tool',
        dwellTime: 0.5
      },
      outcomes: {
        chipEvacuation: 'good',
        accuracy: 'achieved'
      }
    },
    {
      id: 'DRILL_002',
      name: 'High Precision Boring',
      input: {
        geometry: { holeDiameter: 25, holeDepth: 40 },
        material: { type: 'steel', hardness: 40 },
        tolerance: { diameter: 0.01, roundness: 0.005 }
      },
      recommendedStrategy: 'boring_cycle',
      recommendedParams: {
        toolType: 'boring_bar',
        passes: ['semi-finish', 'finish'],
        stock: [0.2, 0.05],
        feed: 'reduced',
        dwell: 1.0
      },
      outcomes: {
        accuracy: 'excellent',
        finish: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - TURNING
  turningPatterns: [
    {
      id: 'TURN_001',
      name: 'OD Roughing',
      input: {
        geometry: { outerDiameter: 100, length: 150 },
        material: { type: 'steel', hardness: 25 },
        tolerance: { dimensional: 0.1 }
      },
      recommendedStrategy: 'facing_and_turning',
      recommendedParams: {
        depthOfCut: 3,
        feed: 0.3,
        approach: 'step_turning',
        coolant: 'flood'
      },
      outcomes: {
        time: 'fast',
        toolLife: 'good'
      }
    },
    {
      id: 'TURN_002',
      name: 'ID Threading',
      input: {
        geometry: { threadType: 'M20x2.5', depth: 20, internal: true },
        material: { type: 'steel', hardness: 30 },
        tolerance: { thread_class: '6H' }
      },
      recommendedStrategy: 'thread_milling',
      recommendedParams: {
        passes: 6,
        infeedMethod: 'modified_flank',
        springPass: true,
        threadChecker: true
      },
      outcomes: {
        accuracy: 'excellent',
        finish: 'good'
      }
    }
  ],

  // ML MODEL INTERFACE

  getFeatureVector(partData, materialData, toleranceData, machineData) {
    const vector = [];

    // Geometry features
    vector.push(partData.surfaceArea || 0);
    vector.push(partData.volume || 0);
    vector.push(partData.featureCount || 0);
    vector.push(partData.pocketCount || 0);
    vector.push(partData.holeCount || 0);
    vector.push(partData.surfaceComplexity || 0);
    vector.push(partData.thinWalls ? 1 : 0);
    vector.push(partData.deepPockets ? 1 : 0);

    // Material features
    const materialIndex = ['steel', 'aluminum', 'titanium', 'superalloy', 'copper', 'plastic']
      .indexOf(materialData.type);
    vector.push(materialIndex >= 0 ? materialIndex : 0);
    vector.push(materialData.hardness || 0);
    vector.push(materialData.machinability || 50);

    // Tolerance features
    vector.push(toleranceData.surfaceFinish || 3.2);
    vector.push(toleranceData.dimensional || 0.1);
    vector.push(toleranceData.criticalFeatures || 0);

    // Machine features
    const machineIndex = ['3-axis', '4-axis', '5-axis', 'mill-turn']
      .indexOf(machineData.type);
    vector.push(machineIndex >= 0 ? machineIndex : 0);

    return vector;
  },
  findSimilarPatterns(featureVector, topN = 5) {
    // Simple similarity search based on Euclidean distance
    const allPatterns = [
      ...this.roughingPatterns,
      ...this.finishingPatterns,
      ...this.fiveAxisPatterns,
      ...this.drillingPatterns,
      ...this.turningPatterns
    ];

    const scored = allPatterns.map(pattern => {
      const patternVector = this._patternToVector(pattern);
      const distance = this._euclideanDistance(featureVector, patternVector);
      return { pattern, distance };
    });

    scored.sort((a, b) => a.distance - b.distance);

    return scored.slice(0, topN).map(s => s.pattern);
  },
  _patternToVector(pattern) {
    // Simplified - would need full implementation
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  },
  _euclideanDistance(v1, v2) {
    let sum = 0;
    const len = Math.min(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }
};
// 3. PRISM_WORKFLOW_ORCHESTRATOR_V2
// Enhanced workflow management for both primary modes

const PRISM_WORKFLOW_ORCHESTRATOR_V2 = {
  version: '3.0.0',
  name: 'PRISM Workflow Orchestrator V2',

  // INTELLIGENT MACHINING MODE WORKFLOW
  intelligentMachiningWorkflow: {
    stages: [
      {
        id: 'input',
        name: 'Input Processing',
        steps: [
          { id: 'load_model', name: 'Load CAD Model', engines: ['PRISM_CAD_IMPORT_ENGINE'] },
          { id: 'analyze_geometry', name: 'Geometry Analysis', engines: ['PRISM_ENHANCED_CAD_KERNEL'] },
          { id: 'recognize_features', name: 'Feature Recognition', engines: ['FEATURE_RECOGNITION_ENGINE'] }
        ]
      },
      {
        id: 'setup',
        name: 'Machine Setup',
        steps: [
          { id: 'select_machine', name: 'Machine Selection', engines: ['MACHINE_CATALOG_ENGINE'] },
          { id: 'configure_workholding', name: 'Workholding Setup', engines: ['WORKHOLDING_ENGINE'] },
          { id: 'set_datum', name: 'Datum/Origin Setup', engines: ['DATUM_ENGINE'] }
        ]
      },
      {
        id: 'strategy',
        name: 'Strategy Generation',
        steps: [
          { id: 'select_material', name: 'Material Selection', engines: ['MATERIAL_DATABASE'] },
          { id: 'select_tools', name: 'Tool Selection', engines: ['TOOL_SELECTION_ENGINE', 'MASTER_TOOL_DATABASE'] },
          { id: 'generate_strategies', name: 'Strategy Generation', engines: ['CAM_STRATEGY_ENGINE', 'ML_STRATEGY_RECOMMENDATION_ENGINE_V2'] },
          { id: 'calculate_params', name: 'Parameter Calculation', engines: ['PRISM_PHYSICS_ENGINE', 'G_FORCE_ENGINE'] }
        ]
      },
      {
        id: 'toolpath',
        name: 'Toolpath Generation',
        steps: [
          { id: 'generate_toolpath', name: 'Toolpath Calculation', engines: ['PRISM_REAL_TOOLPATH_ENGINE'] },
          { id: 'optimize_toolpath', name: 'Toolpath Optimization', engines: ['TOOLPATH_OPTIMIZER_ENGINE'] },
          { id: 'simulate', name: 'Simulation & Verification', engines: ['PRISM_VERIFICATION_CENTER', 'PRISM_COLLISION_DETECTION_V2'] }
        ]
      },
      {
        id: 'output',
        name: 'Output Generation',
        steps: [
          { id: 'generate_gcode', name: 'G-Code Generation', engines: ['UNIVERSAL_POST_PROCESSOR_ENGINE', 'PRISM_UNIVERSAL_POST_GENERATOR_V2'] },
          { id: 'generate_docs', name: 'Documentation', engines: ['SETUP_SHEET_GENERATOR'] },
          { id: 'export', name: 'Export & Transfer', engines: ['DNC_TRANSFER_ENGINE'] }
        ]
      }
    ],

    getStageProgress(stageId) {
      const stage = this.stages.find(s => s.id === stageId);
      if (!stage) return null;

      let completed = 0;
      stage.steps.forEach(step => {
        if (step.status === 'complete') completed++;
      });

      return {
        stage: stage.name,
        progress: (completed / stage.steps.length) * 100,
        completedSteps: completed,
        totalSteps: stage.steps.length
      };
    }
  },
  // PRINT/CAD → CNC PROGRAM MODE WORKFLOW
  printToCNCWorkflow: {
    stages: [
      {
        id: 'print_input',
        name: 'Drawing Input',
        steps: [
          { id: 'load_print', name: 'Load Drawing/PDF', engines: ['PDF_IMPORT_ENGINE', 'IMAGE_IMPORT_ENGINE'] },
          { id: 'ocr_extract', name: 'OCR Text Extraction', engines: ['PRISM_OCR_ENGINE'] },
          { id: 'parse_dimensions', name: 'Dimension Parsing', engines: ['DIMENSION_PARSER_ENGINE'] },
          { id: 'extract_gdt', name: 'GD&T Extraction', engines: ['ASME_Y14_5_GDT_DATABASE', 'ISO_GPS_GDT_DATABASE'] }
        ]
      },
      {
        id: 'interpretation',
        name: 'Drawing Interpretation',
        steps: [
          { id: 'identify_views', name: 'View Identification', engines: ['VIEW_RECOGNITION_ENGINE'] },
          { id: 'extract_geometry', name: 'Geometry Extraction', engines: ['GEOMETRY_EXTRACTION_ENGINE'] },
          { id: 'build_model', name: '3D Model Construction', engines: ['MODEL_RECONSTRUCTION_ENGINE'] },
          { id: 'validate_model', name: 'Model Validation', engines: ['MODEL_VALIDATION_ENGINE'] }
        ]
      },
      {
        id: 'feature_analysis',
        name: 'Feature Analysis',
        steps: [
          { id: 'recognize_features', name: 'Feature Recognition', engines: ['FEATURE_RECOGNITION_ENGINE'] },
          { id: 'interpret_tolerances', name: 'Tolerance Interpretation', engines: ['TOLERANCE_INTERPRETER_ENGINE'] },
          { id: 'identify_critical', name: 'Critical Features', engines: ['CRITICAL_FEATURE_ENGINE'] }
        ]
      },
      {
        id: 'process_planning',
        name: 'Process Planning',
        steps: [
          { id: 'select_operations', name: 'Operation Selection', engines: ['OPERATION_PLANNER_ENGINE'] },
          { id: 'sequence_ops', name: 'Operation Sequencing', engines: ['SEQUENCE_OPTIMIZER_ENGINE'] },
          { id: 'select_tools', name: 'Tool Selection', engines: ['TOOL_SELECTION_ENGINE'] },
          { id: 'calculate_params', name: 'Parameter Calculation', engines: ['PRISM_PHYSICS_ENGINE'] }
        ]
      },
      {
        id: 'program_generation',
        name: 'Program Generation',
        steps: [
          { id: 'generate_toolpaths', name: 'Toolpath Generation', engines: ['PRISM_REAL_TOOLPATH_ENGINE'] },
          { id: 'verify_program', name: 'Program Verification', engines: ['PRISM_VERIFICATION_CENTER'] },
          { id: 'generate_gcode', name: 'G-Code Output', engines: ['UNIVERSAL_POST_PROCESSOR_ENGINE'] },
          { id: 'create_setup', name: 'Setup Documentation', engines: ['SETUP_SHEET_GENERATOR'] }
        ]
      }
    ]
  },
  // STATE MANAGEMENT
  state: {
    activeWorkflow: null,
    currentStage: null,
    currentStep: null,
    history: [],
    results: {}
  },
  startWorkflow(mode) {
    if (mode === 'intelligent') {
      this.state.activeWorkflow = this.intelligentMachiningWorkflow;
    } else if (mode === 'print_to_cnc') {
      this.state.activeWorkflow = this.printToCNCWorkflow;
    } else {
      return { error: 'Unknown workflow mode' };
    }
    this.state.currentStage = this.state.activeWorkflow.stages[0];
    this.state.currentStep = this.state.currentStage.steps[0];
    this.state.history = [];
    this.state.results = {};

    return {
      success: true,
      mode: mode,
      firstStage: this.state.currentStage.name,
      firstStep: this.state.currentStep.name
    };
  },
  executeStep(stepId, inputData) {
    const step = this._findStep(stepId);
    if (!step) return { error: 'Step not found' };

    // Execute engines for this step
    const results = [];
    step.engines.forEach(engineName => {
      const engine = window[engineName];
      if (engine) {
        // Engine execution would happen here
        results.push({ engine: engineName, status: 'executed' });
      } else {
        results.push({ engine: engineName, status: 'not_found' });
      }
    });

    step.status = 'complete';
    this.state.history.push({ stepId, timestamp: Date.now(), results });
    this.state.results[stepId] = results;

    return {
      success: true,
      step: step.name,
      results: results,
      nextStep: this._getNextStep(stepId)
    };
  },
  _findStep(stepId) {
    for (const stage of this.state.activeWorkflow.stages) {
      const step = stage.steps.find(s => s.id === stepId);
      if (step) return step;
    }
    return null;
  },
  _getNextStep(currentStepId) {
    let foundCurrent = false;

    for (const stage of this.state.activeWorkflow.stages) {
      for (const step of stage.steps) {
        if (foundCurrent) return step;
        if (step.id === currentStepId) foundCurrent = true;
      }
    }
    return null; // No more steps
  },
  getWorkflowStatus() {
    if (!this.state.activeWorkflow) return null;

    let totalSteps = 0;
    let completedSteps = 0;

    this.state.activeWorkflow.stages.forEach(stage => {
      stage.steps.forEach(step => {
        totalSteps++;
        if (step.status === 'complete') completedSteps++;
      });
    });

    return {
      workflow: this.state.activeWorkflow === this.intelligentMachiningWorkflow ?
        'Intelligent Machining' : 'Print to CNC',
      progress: ((completedSteps / totalSteps) * 100).toFixed(1),
      completedSteps,
      totalSteps,
      currentStage: this.state.currentStage?.name,
      currentStep: this.state.currentStep?.name
    };
  }
};
// 4. PRISM_UI_INTEGRATION_ENGINE
// Unified UI/3D viewport integration

const PRISM_UI_INTEGRATION_ENGINE = {
  version: '1.0.0',
  name: 'PRISM UI Integration Engine',

  // LAYOUT CONFIGURATIONS
  layouts: {
    standard: {
      name: 'Standard Layout',
      panels: {
        left: { width: '300px', components: ['feature_tree', 'tool_list'] },
        center: { width: 'flex', components: ['3d_viewport'] },
        right: { width: '350px', components: ['properties', 'parameters'] },
        bottom: { height: '200px', components: ['toolpath_list', 'log'] }
      }
    },
    compact: {
      name: 'Compact Layout',
      panels: {
        left: { width: '250px', components: ['tree_view'] },
        center: { width: 'flex', components: ['3d_viewport'] },
        right: { width: '300px', components: ['properties'] }
      }
    },
    simulation: {
      name: 'Simulation Layout',
      panels: {
        left: { width: '250px', components: ['operation_list'] },
        center: { width: 'flex', components: ['3d_viewport', 'simulation_controls'] },
        right: { width: '350px', components: ['collision_results', 'statistics'] },
        bottom: { height: '150px', components: ['timeline', 'nc_code'] }
      }
    },
    printReading: {
      name: 'Print Reading Layout',
      panels: {
        left: { width: '50%', components: ['drawing_view'] },
        center: { width: '50%', components: ['3d_model_view'] },
        bottom: { height: '200px', components: ['dimension_list', 'gdt_list'] }
      }
    }
  },
  // COMPONENT DEFINITIONS
  components: {
    feature_tree: {
      type: 'tree',
      dataSource: 'FEATURE_RECOGNITION_ENGINE',
      icons: true,
      contextMenu: true,
      selectable: true
    },
    tool_list: {
      type: 'list',
      dataSource: 'MASTER_TOOL_DATABASE',
      groupBy: 'type',
      searchable: true,
      draggable: true
    },
    '3d_viewport': {
      type: 'viewport',
      engine: 'PRISM_UNIFIED_3D_VIEWPORT_ENGINE',
      controls: ['rotate', 'pan', 'zoom', 'fit', 'views'],
      layers: ['model', 'toolpath', 'stock', 'fixture']
    },
    properties: {
      type: 'property_grid',
      categories: ['geometry', 'machining', 'tolerance'],
      editable: true
    },
    parameters: {
      type: 'parameter_panel',
      sections: ['cutting', 'feeds_speeds', 'clearances'],
      validation: true,
      units: true
    },
    toolpath_list: {
      type: 'table',
      columns: ['operation', 'tool', 'time', 'status'],
      sortable: true,
      filterable: true
    },
    simulation_controls: {
      type: 'toolbar',
      buttons: ['play', 'pause', 'stop', 'step_forward', 'step_back', 'speed'],
      slider: 'position'
    },
    timeline: {
      type: 'timeline',
      dataSource: 'simulation',
      markers: ['tool_changes', 'collisions']
    },
    nc_code: {
      type: 'code_viewer',
      syntax: 'gcode',
      lineNumbers: true,
      currentLineHighlight: true
    },
    drawing_view: {
      type: 'image_viewer',
      zoom: true,
      pan: true,
      annotations: true
    },
    dimension_list: {
      type: 'table',
      columns: ['dimension', 'value', 'tolerance', 'status'],
      editable: true
    },
    gdt_list: {
      type: 'table',
      columns: ['symbol', 'value', 'datum', 'feature'],
      icons: true
    }
  },
  // STATE
  state: {
    activeLayout: null,
    panelStates: {},
    selection: [],
    viewportState: {}
  },
  // LAYOUT MANAGEMENT

  setLayout(layoutName) {
    const layout = this.layouts[layoutName];
    if (!layout) return { error: 'Layout not found' };

    this.state.activeLayout = layout;
    this._renderLayout(layout);

    return { success: true, layout: layoutName };
  },
  _renderLayout(layout) {
    // Would integrate with actual DOM rendering
    console.log('[PRISM-UI] Rendering layout:', layout.name);
  },
  // VIEWPORT INTEGRATION

  syncViewportWith3DEngine() {
    if (typeof PRISM_UNIFIED_3D_VIEWPORT_ENGINE !== 'undefined') {
      // Connect viewport to 3D engine
      return { connected: true };
    }
    return { connected: false, reason: '3D engine not loaded' };
  },
  updateViewport(data) {
    // Update what's displayed in the viewport
    const updates = [];

    if (data.model) {
      updates.push('model');
    }
    if (data.toolpath) {
      updates.push('toolpath');
    }
    if (data.stock) {
      updates.push('stock');
    }
    return { updated: updates };
  },
  // SELECTION MANAGEMENT

  setSelection(items) {
    this.state.selection = items;
    this._notifySelectionChange(items);
    return { selected: items.length };
  },
  _notifySelectionChange(items) {
    // Notify all components of selection change
    console.log('[PRISM-UI] Selection changed:', items.length, 'items');
  },
  // THEME SUPPORT

  themes: {
    dark: {
      background: '#1a1a2e',
      panel: '#16213e',
      text: '#e2e2e2',
      accent: '#3b82f6',
      border: '#2d3748'
    },
    light: {
      background: '#f3f4f6',
      panel: '#ffffff',
      text: '#1f2937',
      accent: '#2563eb',
      border: '#d1d5db'
    },
    highContrast: {
      background: '#000000',
      panel: '#1a1a1a',
      text: '#ffffff',
      accent: '#00ff00',
      border: '#ffffff'
    }
  },
  setTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return { error: 'Theme not found' };

    // Apply theme
    if (typeof document !== 'undefined') {
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--prism-${key}`, value);
      });
    }
    return { success: true, theme: themeName };
  }
}