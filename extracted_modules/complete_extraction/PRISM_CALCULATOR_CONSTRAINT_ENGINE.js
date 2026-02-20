const PRISM_CALCULATOR_CONSTRAINT_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_CALCULATOR_CONSTRAINT_ENGINE',

    /**
     * Apply all constraints to find valid parameter ranges
     */
    applyAllConstraints: function(inputs) {
        const constraints = {
            rpm: { min: 0, max: Infinity, limitedBy: [] },
            feed: { min: 0, max: Infinity, limitedBy: [] },
            doc: { min: 0, max: Infinity, limitedBy: [] },
            woc: { min: 0, max: Infinity, limitedBy: [] },
            vc: { min: 0, max: Infinity, limitedBy: [] }
        };
        // Apply constraints from each source
        this.applyMachineConstraints(constraints, inputs.machine);
        this.applyControllerConstraints(constraints, inputs.controller);
        this.applyToolConstraints(constraints, inputs.tool);
        this.applyHolderConstraints(constraints, inputs.holder);
        this.applyWorkholdingConstraints(constraints, inputs.workholding);
        this.applyMaterialConstraints(constraints, inputs.material, inputs.tool);
        this.applyToolpathConstraints(constraints, inputs.toolpath);

        return constraints;
    },
    applyMachineConstraints: function(constraints, machine) {
        if (!machine) return;

        const spindle = machine.spindle || machine;

        // RPM limits
        if (spindle.maxRpm) {
            constraints.rpm.max = Math.min(constraints.rpm.max, spindle.maxRpm);
            constraints.rpm.limitedBy.push('spindle_max_rpm');
        }
        if (spindle.minRpm) {
            constraints.rpm.min = Math.max(constraints.rpm.min, spindle.minRpm);
            constraints.rpm.limitedBy.push('spindle_min_rpm');
        }
        // Feed limits from axes
        if (machine.axes) {
            const maxAxisFeed = Math.min(
                machine.axes.x?.maxFeed || Infinity,
                machine.axes.y?.maxFeed || Infinity,
                machine.axes.z?.maxFeed || Infinity
            );
            constraints.feed.max = Math.min(constraints.feed.max, maxAxisFeed);
            constraints.feed.limitedBy.push('axis_max_feed');
        } else if (machine.rapids) {
            constraints.feed.max = Math.min(constraints.feed.max, machine.rapids.xy || machine.rapids.xyz || 25000);
            constraints.feed.limitedBy.push('rapid_limit');
        }
        // Power/Torque limits (will be checked dynamically)
        constraints.powerLimit = spindle.peakHp || spindle.maxPower || 20;
        constraints.torqueLimit = spindle.torque || spindle.maxTorque || 100;

        // Machine rigidity factor
        const rigidityFactors = {
            'light': 0.75,
            'medium': 1.0,
            'heavy': 1.15,
            'ultra-rigid': 1.30,
            'ultra_heavy': 1.30
        };
        constraints.machineRigidity = rigidityFactors[machine.structure?.rigidityClass || machine.rigidityClass] || 1.0;
    },
    applyControllerConstraints: function(constraints, controller) {
        if (!controller) return;

        // Look-ahead affects max achievable feed at small moves
        if (controller.motion?.lookAhead) {
            constraints.controllerLookAhead = controller.motion.lookAhead;
        }
        // Block processing rate
        if (controller.motion?.blockProcessingRate) {
            constraints.blockProcessingRate = controller.motion.blockProcessingRate;
        }
        // 5-axis capabilities
        constraints.rtcpCapable = controller.compensation?.rtcpCapable ||
                                  controller.fiveAxis?.tcpc || false;
    },
    applyToolConstraints: function(constraints, tool) {
        if (!tool) return;

        const diameter = tool.diameter || tool.solidTool?.diameter ||
                        tool.indexableTool?.cuttingDiameter || 12;

        // Store tool diameter for reference
        constraints.toolDiameter = diameter;

        // DOC limits from tool geometry
        if (tool.solidTool?.fluteLength) {
            constraints.doc.max = Math.min(constraints.doc.max, tool.solidTool.fluteLength);
            constraints.doc.limitedBy.push('flute_length');
        } else if (tool.indexableTool?.maxDoc) {
            constraints.doc.max = Math.min(constraints.doc.max, tool.indexableTool.maxDoc);
            constraints.doc.limitedBy.push('insert_max_doc');
        }
        // WOC limited by tool diameter
        constraints.woc.max = Math.min(constraints.woc.max, diameter);
        constraints.woc.limitedBy.push('tool_diameter');

        // Center cutting affects plunge capability
        constraints.centerCutting = tool.solidTool?.centerCutting !== false;
    },
    applyHolderConstraints: function(constraints, holder) {
        if (!holder) return;

        // Max RPM from holder balance grade
        if (holder.maxRpm) {
            constraints.rpm.max = Math.min(constraints.rpm.max, holder.maxRpm);
            constraints.rpm.limitedBy.push('holder_max_rpm');
        }
        // Holder rigidity affects achievable parameters
        constraints.holderRigidity = holder.rigidityFactor || holder.rigidity || 1.0;
        constraints.holderDamping = holder.damping || 1.0;
        constraints.holderRunout = holder.runout || 0.003;
    },
    applyWorkholdingConstraints: function(constraints, workholding) {
        if (!workholding) return;

        // Get rigidity from workholding database
        const rigidityData = PRISM_WORKHOLDING_DATABASE.calculateRigidity(workholding);

        constraints.workholdingRigidity = rigidityData.rigidity;
        constraints.workholdingDamping = rigidityData.damping;

        // Thin wall considerations
        if (workholding.thinWalls) {
            constraints.thinWallMode = true;
            constraints.doc.max *= 0.5;
            constraints.woc.max *= 0.5;
            constraints.doc.limitedBy.push('thin_wall');
            constraints.woc.limitedBy.push('thin_wall');
        }
    },
    applyMaterialConstraints: function(constraints, material, tool) {
        if (!material) return;

        // Get cutting parameters from material
        const toolMat = tool?.solidTool?.material || tool?.material || 'carbide';

        // Try to get from PRISM material database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && material.id) {
            const matData = PRISM_MATERIALS_MASTER.byId?.(material.id);
            if (matData?.cuttingParams?.[toolMat]) {
                const params = matData.cuttingParams[toolMat];
                constraints.vcRange = {
                    min: params.vc?.min || 50,
                    max: params.vc?.max || 300
                };
                constraints.fzRange = {
                    min: params.fz?.min || 0.03,
                    max: params.fz?.max || 0.3
                };
            }
        }
        // Get Kc from material
        constraints.materialKc = material.Kc11 || material.Kc || 1800;
        constraints.materialMc = material.mc || 0.25;
    },
    applyToolpathConstraints: function(constraints, toolpath) {
        if (!toolpath) return;

        // Get strategy from cross-CAM mapping if applicable
        if (toolpath.camSystem && toolpath.strategyName) {
            const strategyData = PRISM_CROSSCAM_STRATEGY_MAP.mapStrategy(
                toolpath.camSystem,
                toolpath.strategyName
            );

            if (strategyData) {
                constraints.strategyModifiers = strategyData.modifiers || {};
                constraints.engagementType = strategyData.engagementType || 'variable';

                if (strategyData.maxEngagement && constraints.toolDiameter) {
                    constraints.woc.max = Math.min(
                        constraints.woc.max,
                        strategyData.maxEngagement * constraints.toolDiameter
                    );
                    constraints.woc.limitedBy.push('strategy_engagement_limit');
                }
            }
        }
        // Direct engagement limits
        if (toolpath.maxRadialEngagement && constraints.toolDiameter) {
            constraints.woc.max = Math.min(
                constraints.woc.max,
                toolpath.maxRadialEngagement * constraints.toolDiameter
            );
        }
        if (toolpath.maxAxialEngagement) {
            constraints.doc.max = Math.min(constraints.doc.max, toolpath.maxAxialEngagement);
        }
    },
    /**
     * Calculate composite rigidity factor from all sources
     */
    getCompositeRigidity: function(constraints) {
        const machineRig = constraints.machineRigidity || 1.0;
        const holderRig = constraints.holderRigidity || 1.0;
        const workholdingRig = constraints.workholdingRigidity || 1.0;

        // Geometric mean for composite
        return Math.pow(machineRig * holderRig * workholdingRig, 1/3);
    }
}