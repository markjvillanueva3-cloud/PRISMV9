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
}