const PRISM_AI_100_DATABASE_REGISTRY = {

    version: '1.0.0',

    // Complete list of ALL 56 databases
    databases: {
        // MATERIALS & CUTTING (11 databases)
        'PRISM_MATERIALS_MASTER': {
            type: 'materials',
            priority: 1,
            aiFeatures: ['speed', 'feed', 'life', 'force'],
            trainingTargets: ['speedFeed', 'toolLife', 'surfaceFinish', 'cuttingForce']
        },
        'PRISM_JOHNSON_COOK_DATABASE': {
            type: 'materials',
            priority: 1,
            aiFeatures: ['flow_stress', 'strain_rate', 'temperature'],
            trainingTargets: ['cuttingForce', 'chipFormation', 'temperature']
        },
        'PRISM_MATERIAL_KC_DATABASE': {
            type: 'materials',
            priority: 1,
            aiFeatures: ['specific_cutting_force', 'power'],
            trainingTargets: ['cuttingForce', 'power', 'spindle_load']
        },
        'PRISM_SURFACE_FINISH_DATABASE': {
            type: 'quality',
            priority: 1,
            aiFeatures: ['Ra', 'Rz', 'Rt'],
            trainingTargets: ['surfaceFinish', 'quality']
        },
        'PRISM_ENHANCED_MATERIAL_DATABASE': {
            type: 'materials',
            priority: 2,
            aiFeatures: ['properties', 'heat_treatment'],
            trainingTargets: ['materialSelection', 'machinability']
        },
        'PRISM_CONSOLIDATED_MATERIALS': {
            type: 'materials',
            priority: 3,
            aiFeatures: ['unified_properties'],
            trainingTargets: ['materialLookup']
        },
        'PRISM_MATERIALS_COMPLETE': {
            type: 'materials',
            priority: 3,
            aiFeatures: ['complete_data'],
            trainingTargets: ['materialLookup']
        },
        'PRISM_THERMAL_PROPERTIES': {
            type: 'materials',
            priority: 2,
            aiFeatures: ['thermal_conductivity', 'expansion', 'specific_heat'],
            trainingTargets: ['thermalAnalysis', 'temperaturePrediction']
        },
        'PRISM_TAYLOR_COMPLETE': {
            type: 'toollife',
            priority: 1,
            aiFeatures: ['taylor_n', 'taylor_C', 'extended_coefficients'],
            trainingTargets: ['toolLife', 'wearPrediction']
        },
        'PRISM_TAYLOR_ADVANCED': {
            type: 'toollife',
            priority: 1,
            aiFeatures: ['extended_taylor', 'multi_factor'],
            trainingTargets: ['toolLife', 'wearPrediction']
        },
        'PRISM_COATINGS_COMPLETE': {
            type: 'tooling',
            priority: 1,
            aiFeatures: ['coating_properties', 'wear_resistance'],
            trainingTargets: ['coatingSelection', 'toolLife']
        },
        // TOOLING & TOOLHOLDING (10 databases)
        'PRISM_TOOL_PROPERTIES_DATABASE': {
            type: 'tooling',
            priority: 1,
            aiFeatures: ['geometry', 'material', 'coating'],
            trainingTargets: ['toolSelection', 'toolLife', 'performance']
        },
        'PRISM_TOOL_TYPES_COMPLETE': {
            type: 'tooling',
            priority: 2,
            aiFeatures: ['tool_types', 'applications'],
            trainingTargets: ['toolSelection']
        },
        'PRISM_TOOL_HOLDER_INTERFACES_COMPLETE': {
            type: 'toolholding',
            priority: 2,
            aiFeatures: ['interface_types', 'compatibility'],
            trainingTargets: ['holderSelection']
        },
        'PRISM_BIG_DAISHOWA_HOLDER_DATABASE': {
            type: 'toolholding',
            priority: 2,
            aiFeatures: ['rigidity', 'runout', 'balance'],
            trainingTargets: ['chatterPrediction', 'holderSelection']
        },
        'PRISM_SCHUNK_TOOLHOLDER_DATABASE': {
            type: 'toolholding',
            priority: 2,
            aiFeatures: ['holder_specs', 'clamping_force'],
            trainingTargets: ['holderSelection', 'rigidity']
        },
        'PRISM_ZENI_COMPLETE_CATALOG': {
            type: 'tooling',
            priority: 2,
            aiFeatures: ['tool_catalog', 'specs'],
            trainingTargets: ['toolSelection']
        },
        'PRISM_TDM_TOOL_MANAGEMENT_DATABASE': {
            type: 'inventory',
            priority: 2,
            aiFeatures: ['inventory', 'usage', 'lifecycle'],
            trainingTargets: ['inventoryOptimization', 'toolOrdering']
        },
        'PRISM_CLAMPING_MECHANISMS_COMPLETE': {
            type: 'toolholding',
            priority: 2,
            aiFeatures: ['clamping_types', 'force'],
            trainingTargets: ['clampingSelection']
        },
        'PRISM_CUTTING_TOOL_DATABASE': {
            type: 'tooling',
            priority: 1,
            aiFeatures: ['tool_data', 'cutting_params'],
            trainingTargets: ['speedFeed', 'toolSelection']
        },
        'PRISM_EXTENDED_MATERIAL_CUTTING_DB': {
            type: 'cutting',
            priority: 1,
            aiFeatures: ['cutting_data', 'material_specific'],
            trainingTargets: ['speedFeed', 'toolLife']
        },
        // WORKHOLDING & FIXTURES (8 databases)
        'PRISM_WORKHOLDING_DATABASE': {
            type: 'workholding',
            priority: 2,
            aiFeatures: ['workholding_types', 'applications'],
            trainingTargets: ['setupOptimization', 'fixtureSelection']
        },
        'PRISM_SCHUNK_DATABASE': {
            type: 'workholding',
            priority: 2,
            aiFeatures: ['clamping_systems', 'force'],
            trainingTargets: ['clampingForce', 'setupOptimization']
        },
        'PRISM_JERGENS_DATABASE': {
            type: 'fixtures',
            priority: 2,
            aiFeatures: ['fixture_components', 'modular'],
            trainingTargets: ['fixtureDesign', 'setupTime']
        },
        'PRISM_KURT_VISE_DATABASE': {
            type: 'workholding',
            priority: 2,
            aiFeatures: ['vise_specs', 'clamping_force'],
            trainingTargets: ['viseSelection', 'clampingForce']
        },
        'PRISM_LANG_DATABASE': {
            type: 'workholding',
            priority: 2,
            aiFeatures: ['workholding_solutions', 'quick_change'],
            trainingTargets: ['setupOptimization']
        },
        'PRISM_FIXTURE_DATABASE': {
            type: 'fixtures',
            priority: 2,
            aiFeatures: ['fixture_data', 'designs'],
            trainingTargets: ['fixtureSelection']
        },
        'PRISM_HYPERMILL_FIXTURE_DATABASE': {
            type: 'fixtures',
            priority: 3,
            aiFeatures: ['CAM_fixtures', 'simulation'],
            trainingTargets: ['CAMIntegration']
        },
        'PRISM_STOCK_POSITIONS_DATABASE': {
            type: 'setup',
            priority: 2,
            aiFeatures: ['stock_positions', 'orientations'],
            trainingTargets: ['setupOptimization', 'partOrientation']
        },
        // MACHINES & CONTROLLERS (10 databases)
        'PRISM_CONTROLLER_DATABASE': {
            type: 'machines',
            priority: 1,
            aiFeatures: ['controller_specs', 'capabilities'],
            trainingTargets: ['controllerSelection', 'postProcessing']
        },
        'PRISM_POST_MACHINE_DATABASE': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['post_processors', 'machine_configs'],
            trainingTargets: ['postGeneration', 'gcodeOptimization']
        },
        'PRISM_UNIFIED_MANUFACTURER_DATABASE': {
            type: 'machines',
            priority: 1,
            aiFeatures: ['all_manufacturers', 'specs'],
            trainingTargets: ['machineSelection', 'capabilities']
        },
        'PRISM_OKUMA_LATHE_GCODE_DATABASE': {
            type: 'gcode',
            priority: 2,
            aiFeatures: ['gcode_reference', 'okuma_specific'],
            trainingTargets: ['gcodeGeneration', 'postProcessing']
        },
        'PRISM_OKUMA_LATHE_MCODE_DATABASE': {
            type: 'mcode',
            priority: 2,
            aiFeatures: ['mcode_reference', 'machine_functions'],
            trainingTargets: ['gcodeGeneration']
        },
        'PRISM_OKUMA_MACHINE_CAD_DATABASE': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['machine_geometry', 'kinematics'],
            trainingTargets: ['collisionDetection', 'simulation']
        },
        'PRISM_LATHE_MACHINE_DB': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['lathe_specs', 'capabilities'],
            trainingTargets: ['machineSelection', 'latheOperations']
        },
        'PRISM_LATHE_MANUFACTURER_DATA': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['manufacturer_data', 'specs'],
            trainingTargets: ['machineSelection']
        },
        'PRISM_MACHINE_SPEC_STANDARD': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['standard_specs', 'tolerances'],
            trainingTargets: ['machineCapability']
        },
        'PRISM_MAJOR_MANUFACTURERS_CATALOG': {
            type: 'machines',
            priority: 2,
            aiFeatures: ['manufacturer_catalog', 'products'],
            trainingTargets: ['machineSelection']
        },
        // OPERATIONS & PROCESSES (8 databases)
        'PRISM_MACHINING_PROCESS_DATABASE': {
            type: 'process',
            priority: 1,
            aiFeatures: ['process_knowledge', 'best_practices'],
            trainingTargets: ['processPlanning', 'operationSelection']
        },
        'PRISM_OPERATION_PARAM_DATABASE': {
            type: 'operations',
            priority: 1,
            aiFeatures: ['operation_params', 'defaults'],
            trainingTargets: ['parameterOptimization']
        },
        'PRISM_THREAD_STANDARD_DATABASE': {
            type: 'threading',
            priority: 2,
            aiFeatures: ['thread_specs', 'standards'],
            trainingTargets: ['threadingOperations']
        },
        'PRISM_CNC_SAFETY_DATABASE': {
            type: 'safety',
            priority: 1,
            aiFeatures: ['safety_rules', 'limits'],
            trainingTargets: ['safetyChecks', 'collisionAvoidance']
        },
        'PRISM_AUTOMATION_VARIANTS_DATABASE': {
            type: 'automation',
            priority: 3,
            aiFeatures: ['automation_options', 'workflows'],
            trainingTargets: ['automationSelection']
        },
        'PRISM_TOOLPATH_STRATEGIES_COMPLETE': {
            type: 'toolpath',
            priority: 1,
            aiFeatures: ['strategies', 'applications'],
            trainingTargets: ['strategySelection', 'toolpathOptimization']
        },
        'PRISM_FEATURE_STRATEGY_COMPLETE': {
            type: 'process',
            priority: 1,
            aiFeatures: ['feature_to_strategy', 'mappings'],
            trainingTargets: ['featureRecognition', 'strategySelection']
        },
        'PRISM_COMPREHENSIVE_CAM_STRATEGIES': {
            type: 'toolpath',
            priority: 1,
            aiFeatures: ['CAM_strategies', 'parameters'],
            trainingTargets: ['strategySelection']
        },
        // BUSINESS & COSTING (5 databases)
        'PRISM_COST_DATABASE': {
            type: 'costing',
            priority: 1,
            aiFeatures: ['cost_data', 'rates'],
            trainingTargets: ['costEstimation', 'pricing']
        },
        'PRISM_COMPOUND_JOB_PROPERTIES_DATABASE': {
            type: 'jobs',
            priority: 2,
            aiFeatures: ['job_properties', 'complexity'],
            trainingTargets: ['jobEstimation', 'scheduling']
        },
        'PRISM_REPORT_TEMPLATES_DATABASE': {
            type: 'reporting',
            priority: 3,
            aiFeatures: ['report_formats', 'templates'],
            trainingTargets: ['reportGeneration']
        },
        'PRISM_CAPABILITY_ASSESSMENT_DATABASE': {
            type: 'capabilities',
            priority: 2,
            aiFeatures: ['capabilities', 'ratings'],
            trainingTargets: ['machineSelection', 'processCapability']
        },
        'PRISM_ML_TRAINING_PATTERNS_DATABASE': {
            type: 'ml',
            priority: 1,
            aiFeatures: ['training_patterns', 'learned_models'],
            trainingTargets: ['ALL']
        },
        // CAD/CAM & POST (4 databases)
        'PRISM_FUSION_POST_DATABASE': {
            type: 'post',
            priority: 2,
            aiFeatures: ['fusion_posts', 'templates'],
            trainingTargets: ['postGeneration']
        },
        'PRISM_MASTER_CAD_CAM_DATABASE': {
            type: 'cadcam',
            priority: 1,
            aiFeatures: ['integrated_data', 'workflows'],
            trainingTargets: ['CADCAMIntegration']
        },
        'PRISM_EMBEDDED_PARTS_DATABASE': {
            type: 'parts',
            priority: 2,
            aiFeatures: ['sample_parts', 'features'],
            trainingTargets: ['featureRecognition', 'partClassification']
        },
        'PRISM_AI_TOOLPATH_DATABASE': {
            type: 'toolpath',
            priority: 1,
            aiFeatures: ['AI_toolpaths', 'optimized'],
            trainingTargets: ['toolpathLearning']
        }
    },
    // Get all databases
    getAll: function() {
        return this.databases;
    },
    // Get databases by type
    getByType: function(type) {
        return Object.entries(this.databases)
            .filter(([_, config]) => config.type === type)
            .map(([name, config]) => ({ name, ...config }));
    },
    // Get databases by priority
    getByPriority: function(priority) {
        return Object.entries(this.databases)
            .filter(([_, config]) => config.priority === priority)
            .map(([name, config]) => ({ name, ...config }));
    },
    // Get count
    getCount: function() {
        return Object.keys(this.databases).length;
    }
}