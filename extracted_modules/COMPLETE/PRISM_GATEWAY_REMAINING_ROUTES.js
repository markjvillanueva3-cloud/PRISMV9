const PRISM_GATEWAY_REMAINING_ROUTES = {

    VERSION: '1.5.3',
    TOTAL_MODULES: 367,

    ROUTES: [
        // PRISM_100_PERCENT_COMPLETENESS
        {
            module: 'PRISM_100_PERCENT_COMPLETENESS',
            routes: [
                { path: 'data.100percentne.get', method: 'get' },
                { path: 'data.100percentne.set', method: 'set' },
                { path: 'data.100percentne.process', method: 'process' },
                { path: 'data.100percentne.validate', method: 'validate' },
                { path: 'data.100percentne.export', method: 'export' },
                { path: 'data.100percentne.import', method: 'import' },
            ]
        },
        // PRISM_2D_TOOLPATH_ENGINE
        {
            module: 'PRISM_2D_TOOLPATH_ENGINE',
            routes: [
                { path: 'engine.2dtoolpath.calculate', method: 'calculate' },
                { path: 'engine.2dtoolpath.process', method: 'process' },
                { path: 'engine.2dtoolpath.run', method: 'run' },
                { path: 'engine.2dtoolpath.configure', method: 'configure' },
                { path: 'engine.2dtoolpath.validate', method: 'validate' },
                { path: 'engine.2dtoolpath.getResult', method: 'getResult' },
            ]
        },
        // PRISM_3D_VISUAL_ENHANCEMENT_ENGINE
        {
            module: 'PRISM_3D_VISUAL_ENHANCEMENT_ENGINE',
            routes: [
                { path: 'engine.3dvisualenha.calculate', method: 'calculate' },
                { path: 'engine.3dvisualenha.process', method: 'process' },
                { path: 'engine.3dvisualenha.run', method: 'run' },
                { path: 'engine.3dvisualenha.configure', method: 'configure' },
                { path: 'engine.3dvisualenha.validate', method: 'validate' },
                { path: 'engine.3dvisualenha.getResult', method: 'getResult' },
            ]
        },
        // PRISM_5AXIS_BLISK_CAM_ENGINE
        {
            module: 'PRISM_5AXIS_BLISK_CAM_ENGINE',
            routes: [
                { path: 'engine.5axisbliskca.calculate', method: 'calculate' },
                { path: 'engine.5axisbliskca.process', method: 'process' },
                { path: 'engine.5axisbliskca.run', method: 'run' },
                { path: 'engine.5axisbliskca.configure', method: 'configure' },
                { path: 'engine.5axisbliskca.validate', method: 'validate' },
                { path: 'engine.5axisbliskca.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ACTIVATIONS_ENGINE
        {
            module: 'PRISM_ACTIVATIONS_ENGINE',
            routes: [
                { path: 'engine.activations.calculate', method: 'calculate' },
                { path: 'engine.activations.process', method: 'process' },
                { path: 'engine.activations.run', method: 'run' },
                { path: 'engine.activations.configure', method: 'configure' },
                { path: 'engine.activations.validate', method: 'validate' },
                { path: 'engine.activations.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADAPTIVE_HSM_ENGINE
        {
            module: 'PRISM_ADAPTIVE_HSM_ENGINE',
            routes: [
                { path: 'engine.adaptivehsm.calculate', method: 'calculate' },
                { path: 'engine.adaptivehsm.process', method: 'process' },
                { path: 'engine.adaptivehsm.run', method: 'run' },
                { path: 'engine.adaptivehsm.configure', method: 'configure' },
                { path: 'engine.adaptivehsm.validate', method: 'validate' },
                { path: 'engine.adaptivehsm.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADAPTIVE_TESSELLATOR
        {
            module: 'PRISM_ADAPTIVE_TESSELLATOR',
            routes: [
                { path: 'adaptive.tessellator.adapt', method: 'adapt' },
                { path: 'adaptive.tessellator.learn', method: 'learn' },
                { path: 'adaptive.tessellator.update', method: 'update' },
                { path: 'adaptive.tessellator.configure', method: 'configure' },
                { path: 'adaptive.tessellator.evaluate', method: 'evaluate' },
                { path: 'adaptive.tessellator.reset', method: 'reset' },
            ]
        },
        // PRISM_ADVANCED_BLADE_SURFACE_ENGINE
        {
            module: 'PRISM_ADVANCED_BLADE_SURFACE_ENGINE',
            routes: [
                { path: 'engine.advancedblad.calculate', method: 'calculate' },
                { path: 'engine.advancedblad.process', method: 'process' },
                { path: 'engine.advancedblad.run', method: 'run' },
                { path: 'engine.advancedblad.configure', method: 'configure' },
                { path: 'engine.advancedblad.validate', method: 'validate' },
                { path: 'engine.advancedblad.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADVANCED_COLLISION_ENGINE
        {
            module: 'PRISM_ADVANCED_COLLISION_ENGINE',
            routes: [
                { path: 'engine.advancedcoll.calculate', method: 'calculate' },
                { path: 'engine.advancedcoll.process', method: 'process' },
                { path: 'engine.advancedcoll.run', method: 'run' },
                { path: 'engine.advancedcoll.configure', method: 'configure' },
                { path: 'engine.advancedcoll.validate', method: 'validate' },
                { path: 'engine.advancedcoll.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADVANCED_KINEMATICS_ENGINE
        {
            module: 'PRISM_ADVANCED_KINEMATICS_ENGINE',
            routes: [
                { path: 'engine.advancedkine.calculate', method: 'calculate' },
                { path: 'engine.advancedkine.process', method: 'process' },
                { path: 'engine.advancedkine.run', method: 'run' },
                { path: 'engine.advancedkine.configure', method: 'configure' },
                { path: 'engine.advancedkine.validate', method: 'validate' },
                { path: 'engine.advancedkine.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADVANCED_METAHEURISTICS
        {
            module: 'PRISM_ADVANCED_METAHEURISTICS',
            routes: [
                { path: 'adv.metaheuristi.process', method: 'process' },
                { path: 'adv.metaheuristi.calculate', method: 'calculate' },
                { path: 'adv.metaheuristi.optimize', method: 'optimize' },
                { path: 'adv.metaheuristi.configure', method: 'configure' },
                { path: 'adv.metaheuristi.validate', method: 'validate' },
                { path: 'adv.metaheuristi.run', method: 'run' },
            ]
        },
        // PRISM_ADVANCED_OPTIMIZATION_ENGINE
        {
            module: 'PRISM_ADVANCED_OPTIMIZATION_ENGINE',
            routes: [
                { path: 'engine.advancedopti.calculate', method: 'calculate' },
                { path: 'engine.advancedopti.process', method: 'process' },
                { path: 'engine.advancedopti.run', method: 'run' },
                { path: 'engine.advancedopti.configure', method: 'configure' },
                { path: 'engine.advancedopti.validate', method: 'validate' },
                { path: 'engine.advancedopti.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADVANCED_SWEEP_LOFT_ENGINE
        {
            module: 'PRISM_ADVANCED_SWEEP_LOFT_ENGINE',
            routes: [
                { path: 'engine.advancedswee.calculate', method: 'calculate' },
                { path: 'engine.advancedswee.process', method: 'process' },
                { path: 'engine.advancedswee.run', method: 'run' },
                { path: 'engine.advancedswee.configure', method: 'configure' },
                { path: 'engine.advancedswee.validate', method: 'validate' },
                { path: 'engine.advancedswee.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER
        {
            module: 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER',
            routes: [
                { path: 'opt.advancedunco.optimize', method: 'optimize' },
                { path: 'opt.advancedunco.minimize', method: 'minimize' },
                { path: 'opt.advancedunco.maximize', method: 'maximize' },
                { path: 'opt.advancedunco.configure', method: 'configure' },
                { path: 'opt.advancedunco.pareto', method: 'pareto' },
                { path: 'opt.advancedunco.getResult', method: 'getResult' },
            ]
        },
        // PRISM_AIRCUT_ELIMINATION_ENGINE
        {
            module: 'PRISM_AIRCUT_ELIMINATION_ENGINE',
            routes: [
                { path: 'engine.aircutelimin.calculate', method: 'calculate' },
                { path: 'engine.aircutelimin.process', method: 'process' },
                { path: 'engine.aircutelimin.run', method: 'run' },
                { path: 'engine.aircutelimin.configure', method: 'configure' },
                { path: 'engine.aircutelimin.validate', method: 'validate' },
                { path: 'engine.aircutelimin.getResult', method: 'getResult' },
            ]
        },
        // PRISM_AI_COMPLETE_SYSTEM
        {
            module: 'PRISM_AI_COMPLETE_SYSTEM',
            routes: [
                { path: 'ai.completesyst.predict', method: 'predict' },
                { path: 'ai.completesyst.train', method: 'train' },
                { path: 'ai.completesyst.evaluate', method: 'evaluate' },
                { path: 'ai.completesyst.configure', method: 'configure' },
                { path: 'ai.completesyst.getModel', method: 'getModel' },
                { path: 'ai.completesyst.infer', method: 'infer' },
            ]
        },
        // PRISM_AI_DATABASE_CONNECTOR
        {
            module: 'PRISM_AI_DATABASE_CONNECTOR',
            routes: [
                { path: 'db.aiconnector.get', method: 'get' },
                { path: 'db.aiconnector.list', method: 'list' },
                { path: 'db.aiconnector.search', method: 'search' },
                { path: 'db.aiconnector.byId', method: 'byId' },
                { path: 'db.aiconnector.filter', method: 'filter' },
                { path: 'db.aiconnector.count', method: 'count' },
            ]
        },
        // PRISM_AI_KNOWLEDGE_INTEGRATION
        {
            module: 'PRISM_AI_KNOWLEDGE_INTEGRATION',
            routes: [
                { path: 'ai.knowledgeint.predict', method: 'predict' },
                { path: 'ai.knowledgeint.train', method: 'train' },
                { path: 'ai.knowledgeint.evaluate', method: 'evaluate' },
                { path: 'ai.knowledgeint.configure', method: 'configure' },
                { path: 'ai.knowledgeint.getModel', method: 'getModel' },
                { path: 'ai.knowledgeint.infer', method: 'infer' },
            ]
        },
        // PRISM_AI_MATERIAL_MODIFIERS
        {
            module: 'PRISM_AI_MATERIAL_MODIFIERS',
            routes: [
                { path: 'ai.materialmodi.predict', method: 'predict' },
                { path: 'ai.materialmodi.train', method: 'train' },
                { path: 'ai.materialmodi.evaluate', method: 'evaluate' },
                { path: 'ai.materialmodi.configure', method: 'configure' },
                { path: 'ai.materialmodi.getModel', method: 'getModel' },
                { path: 'ai.materialmodi.infer', method: 'infer' },
            ]
        },
        // PRISM_AI_ORCHESTRATION_ENGINE
        {
            module: 'PRISM_AI_ORCHESTRATION_ENGINE',
            routes: [
                { path: 'engine.aiorchestrat.calculate', method: 'calculate' },
                { path: 'engine.aiorchestrat.process', method: 'process' },
                { path: 'engine.aiorchestrat.run', method: 'run' },
                { path: 'engine.aiorchestrat.configure', method: 'configure' },
                { path: 'engine.aiorchestrat.validate', method: 'validate' },
                { path: 'engine.aiorchestrat.getResult', method: 'getResult' },
            ]
        },
        // PRISM_AI_PARAMS
        {
            module: 'PRISM_AI_PARAMS',
            routes: [
                { path: 'ai.params.predict', method: 'predict' },
                { path: 'ai.params.train', method: 'train' },
                { path: 'ai.params.evaluate', method: 'evaluate' },
                { path: 'ai.params.configure', method: 'configure' },
                { path: 'ai.params.getModel', method: 'getModel' },
                { path: 'ai.params.infer', method: 'infer' },
            ]
        },
        // PRISM_AI_TOOLPATH_DATABASE
        {
            module: 'PRISM_AI_TOOLPATH_DATABASE',
            routes: [
                { path: 'db.aitoolpath.get', method: 'get' },
                { path: 'db.aitoolpath.list', method: 'list' },
                { path: 'db.aitoolpath.search', method: 'search' },
                { path: 'db.aitoolpath.byId', method: 'byId' },
                { path: 'db.aitoolpath.filter', method: 'filter' },
                { path: 'db.aitoolpath.count', method: 'count' },
            ]
        },
        // PRISM_AI_UNIFIED_DATA_CONNECTOR
        {
            module: 'PRISM_AI_UNIFIED_DATA_CONNECTOR',
            routes: [
                { path: 'ai.unifieddatac.predict', method: 'predict' },
                { path: 'ai.unifieddatac.train', method: 'train' },
                { path: 'ai.unifieddatac.evaluate', method: 'evaluate' },
                { path: 'ai.unifieddatac.configure', method: 'configure' },
                { path: 'ai.unifieddatac.getModel', method: 'getModel' },
                { path: 'ai.unifieddatac.infer', method: 'infer' },
            ]
        },
        // PRISM_ALGORITHM_STRATEGIES
        {
            module: 'PRISM_ALGORITHM_STRATEGIES',
            routes: [
                { path: 'alg.strategies.run', method: 'run' },
                { path: 'alg.strategies.configure', method: 'configure' },
                { path: 'alg.strategies.execute', method: 'execute' },
                { path: 'alg.strategies.getResult', method: 'getResult' },
                { path: 'alg.strategies.validate', method: 'validate' },
                { path: 'alg.strategies.compare', method: 'compare' },
            ]
        },
        // PRISM_ALPHA_SHAPES
        {
            module: 'PRISM_ALPHA_SHAPES',
            routes: [
                { path: 'alpha.shapes.init', method: 'init' },
                { path: 'alpha.shapes.run', method: 'run' },
                { path: 'alpha.shapes.process', method: 'process' },
                { path: 'alpha.shapes.get', method: 'get' },
                { path: 'alpha.shapes.set', method: 'set' },
                { path: 'alpha.shapes.configure', method: 'configure' },
            ]
        },
        // PRISM_ARC_FITTING_ENGINE
        {
            module: 'PRISM_ARC_FITTING_ENGINE',
            routes: [
                { path: 'engine.arcfitting.calculate', method: 'calculate' },
                { path: 'engine.arcfitting.process', method: 'process' },
                { path: 'engine.arcfitting.run', method: 'run' },
                { path: 'engine.arcfitting.configure', method: 'configure' },
                { path: 'engine.arcfitting.validate', method: 'validate' },
                { path: 'engine.arcfitting.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ATTENTION_ENGINE
        {
            module: 'PRISM_ATTENTION_ENGINE',
            routes: [
                { path: 'engine.attention.calculate', method: 'calculate' },
                { path: 'engine.attention.process', method: 'process' },
                { path: 'engine.attention.run', method: 'run' },
                { path: 'engine.attention.configure', method: 'configure' },
                { path: 'engine.attention.validate', method: 'validate' },
                { path: 'engine.attention.getResult', method: 'getResult' },
            ]
        },
        // PRISM_AUTOMATION_VARIANTS_DATABASE
        {
            module: 'PRISM_AUTOMATION_VARIANTS_DATABASE',
            routes: [
                { path: 'db.automationva.get', method: 'get' },
                { path: 'db.automationva.list', method: 'list' },
                { path: 'db.automationva.search', method: 'search' },
                { path: 'db.automationva.byId', method: 'byId' },
                { path: 'db.automationva.filter', method: 'filter' },
                { path: 'db.automationva.count', method: 'count' },
            ]
        },
        // PRISM_BATCH_LOADER
        {
            module: 'PRISM_BATCH_LOADER',
            routes: [
                { path: 'batch.core.load', method: 'load' },
                { path: 'batch.core.import', method: 'import' },
                { path: 'batch.core.process', method: 'process' },
                { path: 'batch.core.validate', method: 'validate' },
                { path: 'batch.core.getStatus', method: 'getStatus' },
                { path: 'batch.core.cancel', method: 'cancel' },
            ]
        },
        // PRISM_BATCH_STEP_IMPORT_ENGINE
        {
            module: 'PRISM_BATCH_STEP_IMPORT_ENGINE',
            routes: [
                { path: 'engine.batchstepimp.calculate', method: 'calculate' },
                { path: 'engine.batchstepimp.process', method: 'process' },
                { path: 'engine.batchstepimp.run', method: 'run' },
                { path: 'engine.batchstepimp.configure', method: 'configure' },
                { path: 'engine.batchstepimp.validate', method: 'validate' },
                { path: 'engine.batchstepimp.getResult', method: 'getResult' },
            ]
        },
        // PRISM_BAYESIAN_LEARNING
        {
            module: 'PRISM_BAYESIAN_LEARNING',
            routes: [
                { path: 'learn.bayesian.train', method: 'train' },
                { path: 'learn.bayesian.predict', method: 'predict' },
                { path: 'learn.bayesian.evaluate', method: 'evaluate' },
                { path: 'learn.bayesian.update', method: 'update' },
                { path: 'learn.bayesian.export', method: 'export' },
                { path: 'learn.bayesian.getModel', method: 'getModel' },
            ]
        },
        // PRISM_BAYESIAN_SYSTEM
        {
            module: 'PRISM_BAYESIAN_SYSTEM',
            routes: [
                { path: 'bayesian.system.init', method: 'init' },
                { path: 'bayesian.system.run', method: 'run' },
                { path: 'bayesian.system.process', method: 'process' },
                { path: 'bayesian.system.get', method: 'get' },
                { path: 'bayesian.system.set', method: 'set' },
                { path: 'bayesian.system.configure', method: 'configure' },
            ]
        },
        // PRISM_BEZIER_INTERSECTION_ENGINE
        {
            module: 'PRISM_BEZIER_INTERSECTION_ENGINE',
            routes: [
                { path: 'engine.bezierinters.calculate', method: 'calculate' },
                { path: 'engine.bezierinters.process', method: 'process' },
                { path: 'engine.bezierinters.run', method: 'run' },
                { path: 'engine.bezierinters.configure', method: 'configure' },
                { path: 'engine.bezierinters.validate', method: 'validate' },
                { path: 'engine.bezierinters.getResult', method: 'getResult' },
            ]
        },
        // PRISM_BIG_DAISHOWA_HOLDER_DATABASE
        {
            module: 'PRISM_BIG_DAISHOWA_HOLDER_DATABASE',
            routes: [
                { path: 'db.bigdaishowah.get', method: 'get' },
                { path: 'db.bigdaishowah.list', method: 'list' },
                { path: 'db.bigdaishowah.search', method: 'search' },
                { path: 'db.bigdaishowah.byId', method: 'byId' },
                { path: 'db.bigdaishowah.filter', method: 'filter' },
                { path: 'db.bigdaishowah.count', method: 'count' },
            ]
        },
        // PRISM_BILATERAL_MESH_FILTER
        {
            module: 'PRISM_BILATERAL_MESH_FILTER',
            routes: [
                { path: 'mesh.bilateralfil.generate', method: 'generate' },
                { path: 'mesh.bilateralfil.refine', method: 'refine' },
                { path: 'mesh.bilateralfil.validate', method: 'validate' },
                { path: 'mesh.bilateralfil.export', method: 'export' },
                { path: 'mesh.bilateralfil.optimize', method: 'optimize' },
                { path: 'mesh.bilateralfil.simplify', method: 'simplify' },
            ]
        },
        // PRISM_BOSS_DETECTION_ENGINE
        {
            module: 'PRISM_BOSS_DETECTION_ENGINE',
            routes: [
                { path: 'engine.bossdetectio.calculate', method: 'calculate' },
                { path: 'engine.bossdetectio.process', method: 'process' },
                { path: 'engine.bossdetectio.run', method: 'run' },
                { path: 'engine.bossdetectio.configure', method: 'configure' },
                { path: 'engine.bossdetectio.validate', method: 'validate' },
                { path: 'engine.bossdetectio.getResult', method: 'getResult' },
            ]
        },
        // PRISM_BREP_TESSELLATOR
        {
            module: 'PRISM_BREP_TESSELLATOR',
            routes: [
                { path: 'brep.tessellator.init', method: 'init' },
                { path: 'brep.tessellator.run', method: 'run' },
                { path: 'brep.tessellator.process', method: 'process' },
                { path: 'brep.tessellator.get', method: 'get' },
                { path: 'brep.tessellator.set', method: 'set' },
                { path: 'brep.tessellator.configure', method: 'configure' },
            ]
        },
        // PRISM_BREP_VALIDATION_EXTENSION
        {
            module: 'PRISM_BREP_VALIDATION_EXTENSION',
            routes: [
                { path: 'brep.validation.init', method: 'init' },
                { path: 'brep.validation.run', method: 'run' },
                { path: 'brep.validation.process', method: 'process' },
                { path: 'brep.validation.get', method: 'get' },
                { path: 'brep.validation.set', method: 'set' },
                { path: 'brep.validation.configure', method: 'configure' },
            ]
        },
        // PRISM_BUSINESS_AI_SYSTEM
        {
            module: 'PRISM_BUSINESS_AI_SYSTEM',
            routes: [
                { path: 'ai.businesssyst.predict', method: 'predict' },
                { path: 'ai.businesssyst.train', method: 'train' },
                { path: 'ai.businesssyst.evaluate', method: 'evaluate' },
                { path: 'ai.businesssyst.configure', method: 'configure' },
                { path: 'ai.businesssyst.getModel', method: 'getModel' },
                { path: 'ai.businesssyst.infer', method: 'infer' },
            ]
        },
        // PRISM_CAD_CONFIDENCE_ENGINE
        {
            module: 'PRISM_CAD_CONFIDENCE_ENGINE',
            routes: [
                { path: 'engine.cadconfidenc.calculate', method: 'calculate' },
                { path: 'engine.cadconfidenc.process', method: 'process' },
                { path: 'engine.cadconfidenc.run', method: 'run' },
                { path: 'engine.cadconfidenc.configure', method: 'configure' },
                { path: 'engine.cadconfidenc.validate', method: 'validate' },
                { path: 'engine.cadconfidenc.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CAD_KERNEL_MAIN
        {
            module: 'PRISM_CAD_KERNEL_MAIN',
            routes: [
                { path: 'cad.kernelmain.create', method: 'create' },
                { path: 'cad.kernelmain.modify', method: 'modify' },
                { path: 'cad.kernelmain.evaluate', method: 'evaluate' },
                { path: 'cad.kernelmain.validate', method: 'validate' },
                { path: 'cad.kernelmain.export', method: 'export' },
                { path: 'cad.kernelmain.import', method: 'import' },
            ]
        },
        // PRISM_CAD_MATH
        {
            module: 'PRISM_CAD_MATH',
            routes: [
                { path: 'cad.math.create', method: 'create' },
                { path: 'cad.math.modify', method: 'modify' },
                { path: 'cad.math.evaluate', method: 'evaluate' },
                { path: 'cad.math.validate', method: 'validate' },
                { path: 'cad.math.export', method: 'export' },
                { path: 'cad.math.import', method: 'import' },
            ]
        },
        // PRISM_CALCULATOR_CHATTER_ENGINE
        {
            module: 'PRISM_CALCULATOR_CHATTER_ENGINE',
            routes: [
                { path: 'engine.calculatorch.calculate', method: 'calculate' },
                { path: 'engine.calculatorch.process', method: 'process' },
                { path: 'engine.calculatorch.run', method: 'run' },
                { path: 'engine.calculatorch.configure', method: 'configure' },
                { path: 'engine.calculatorch.validate', method: 'validate' },
                { path: 'engine.calculatorch.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CALCULATOR_CONSTRAINT_ENGINE
        {
            module: 'PRISM_CALCULATOR_CONSTRAINT_ENGINE',
            routes: [
                { path: 'engine.calculatorco.calculate', method: 'calculate' },
                { path: 'engine.calculatorco.process', method: 'process' },
                { path: 'engine.calculatorco.run', method: 'run' },
                { path: 'engine.calculatorco.configure', method: 'configure' },
                { path: 'engine.calculatorco.validate', method: 'validate' },
                { path: 'engine.calculatorco.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CALCULATOR_LEARNING_ENGINE
        {
            module: 'PRISM_CALCULATOR_LEARNING_ENGINE',
            routes: [
                { path: 'engine.calculatorle.calculate', method: 'calculate' },
                { path: 'engine.calculatorle.process', method: 'process' },
                { path: 'engine.calculatorle.run', method: 'run' },
                { path: 'engine.calculatorle.configure', method: 'configure' },
                { path: 'engine.calculatorle.validate', method: 'validate' },
                { path: 'engine.calculatorle.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CALCULATOR_OPTIMIZER
        {
            module: 'PRISM_CALCULATOR_OPTIMIZER',
            routes: [
                { path: 'opt.calculator.optimize', method: 'optimize' },
                { path: 'opt.calculator.minimize', method: 'minimize' },
                { path: 'opt.calculator.maximize', method: 'maximize' },
                { path: 'opt.calculator.configure', method: 'configure' },
                { path: 'opt.calculator.pareto', method: 'pareto' },
                { path: 'opt.calculator.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CALCULATOR_PHYSICS_ENGINE
        {
            module: 'PRISM_CALCULATOR_PHYSICS_ENGINE',
            routes: [
                { path: 'engine.calculatorph.calculate', method: 'calculate' },
                { path: 'engine.calculatorph.process', method: 'process' },
                { path: 'engine.calculatorph.run', method: 'run' },
                { path: 'engine.calculatorph.configure', method: 'configure' },
                { path: 'engine.calculatorph.validate', method: 'validate' },
                { path: 'engine.calculatorph.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CALCULATOR_RECOMMENDATION_ENGINE
        {
            module: 'PRISM_CALCULATOR_RECOMMENDATION_ENGINE',
            routes: [
                { path: 'engine.calculatorre.calculate', method: 'calculate' },
                { path: 'engine.calculatorre.process', method: 'process' },
                { path: 'engine.calculatorre.run', method: 'run' },
                { path: 'engine.calculatorre.configure', method: 'configure' },
                { path: 'engine.calculatorre.validate', method: 'validate' },
                { path: 'engine.calculatorre.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CAM_100_PERCENT_ENHANCEMENT
        {
            module: 'PRISM_CAM_100_PERCENT_ENHANCEMENT',
            routes: [
                { path: 'cam.100percenten.generate', method: 'generate' },
                { path: 'cam.100percenten.optimize', method: 'optimize' },
                { path: 'cam.100percenten.validate', method: 'validate' },
                { path: 'cam.100percenten.simulate', method: 'simulate' },
                { path: 'cam.100percenten.export', method: 'export' },
                { path: 'cam.100percenten.configure', method: 'configure' },
            ]
        },
        // PRISM_CAM_CUTTING_PARAM_BRIDGE
        {
            module: 'PRISM_CAM_CUTTING_PARAM_BRIDGE',
            routes: [
                { path: 'cam.cuttingparam.generate', method: 'generate' },
                { path: 'cam.cuttingparam.optimize', method: 'optimize' },
                { path: 'cam.cuttingparam.validate', method: 'validate' },
                { path: 'cam.cuttingparam.simulate', method: 'simulate' },
                { path: 'cam.cuttingparam.export', method: 'export' },
                { path: 'cam.cuttingparam.configure', method: 'configure' },
            ]
        },
        // PRISM_CAM_LEARNING_ENGINE
        {
            module: 'PRISM_CAM_LEARNING_ENGINE',
            routes: [
                { path: 'engine.camlearning.calculate', method: 'calculate' },
                { path: 'engine.camlearning.process', method: 'process' },
                { path: 'engine.camlearning.run', method: 'run' },
                { path: 'engine.camlearning.configure', method: 'configure' },
                { path: 'engine.camlearning.validate', method: 'validate' },
                { path: 'engine.camlearning.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CAM_LEARNING_ENGINE_ENHANCED
        {
            module: 'PRISM_CAM_LEARNING_ENGINE_ENHANCED',
            routes: [
                { path: 'engine.camlearninge.calculate', method: 'calculate' },
                { path: 'engine.camlearninge.process', method: 'process' },
                { path: 'engine.camlearninge.run', method: 'run' },
                { path: 'engine.camlearninge.configure', method: 'configure' },
                { path: 'engine.camlearninge.validate', method: 'validate' },
                { path: 'engine.camlearninge.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE
        {
            module: 'PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE',
            routes: [
                { path: 'engine.camtoolpathp.calculate', method: 'calculate' },
                { path: 'engine.camtoolpathp.process', method: 'process' },
                { path: 'engine.camtoolpathp.run', method: 'run' },
                { path: 'engine.camtoolpathp.configure', method: 'configure' },
                { path: 'engine.camtoolpathp.validate', method: 'validate' },
                { path: 'engine.camtoolpathp.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CAPABILITY_ASSESSMENT_DATABASE
        {
            module: 'PRISM_CAPABILITY_ASSESSMENT_DATABASE',
            routes: [
                { path: 'db.capabilityas.get', method: 'get' },
                { path: 'db.capabilityas.list', method: 'list' },
                { path: 'db.capabilityas.search', method: 'search' },
                { path: 'db.capabilityas.byId', method: 'byId' },
                { path: 'db.capabilityas.filter', method: 'filter' },
                { path: 'db.capabilityas.count', method: 'count' },
            ]
        },
        // PRISM_CHATTER_PREDICTION_ENGINE
        {
            module: 'PRISM_CHATTER_PREDICTION_ENGINE',
            routes: [
                { path: 'engine.chatterpredi.calculate', method: 'calculate' },
                { path: 'engine.chatterpredi.process', method: 'process' },
                { path: 'engine.chatterpredi.run', method: 'run' },
                { path: 'engine.chatterpredi.configure', method: 'configure' },
                { path: 'engine.chatterpredi.validate', method: 'validate' },
                { path: 'engine.chatterpredi.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CHUCK_DATABASE_V2
        {
            module: 'PRISM_CHUCK_DATABASE_V2',
            routes: [
                { path: 'db.chuckv2.get', method: 'get' },
                { path: 'db.chuckv2.list', method: 'list' },
                { path: 'db.chuckv2.search', method: 'search' },
                { path: 'db.chuckv2.byId', method: 'byId' },
                { path: 'db.chuckv2.filter', method: 'filter' },
                { path: 'db.chuckv2.count', method: 'count' },
            ]
        },
        // PRISM_CLAMPING_MECHANISMS_COMPLETE
        {
            module: 'PRISM_CLAMPING_MECHANISMS_COMPLETE',
            routes: [
                { path: 'data.clampingmech.get', method: 'get' },
                { path: 'data.clampingmech.set', method: 'set' },
                { path: 'data.clampingmech.process', method: 'process' },
                { path: 'data.clampingmech.validate', method: 'validate' },
                { path: 'data.clampingmech.export', method: 'export' },
                { path: 'data.clampingmech.import', method: 'import' },
            ]
        },
        // PRISM_CLAUDE_API
        {
            module: 'PRISM_CLAUDE_API',
            routes: [
                { path: 'claude.api.init', method: 'init' },
                { path: 'claude.api.run', method: 'run' },
                { path: 'claude.api.process', method: 'process' },
                { path: 'claude.api.get', method: 'get' },
                { path: 'claude.api.set', method: 'set' },
                { path: 'claude.api.configure', method: 'configure' },
            ]
        },
        // PRISM_CLAUDE_COMPLEX_ORCHESTRATOR
        {
            module: 'PRISM_CLAUDE_COMPLEX_ORCHESTRATOR',
            routes: [
                { path: 'claude.complex.init', method: 'init' },
                { path: 'claude.complex.run', method: 'run' },
                { path: 'claude.complex.process', method: 'process' },
                { path: 'claude.complex.get', method: 'get' },
                { path: 'claude.complex.set', method: 'set' },
                { path: 'claude.complex.configure', method: 'configure' },
            ]
        },
        // PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR
        {
            module: 'PRISM_CLAUDE_MACHINE_TYPE_ORCHESTRATOR',
            routes: [
                { path: 'claude.machine.init', method: 'init' },
                { path: 'claude.machine.run', method: 'run' },
                { path: 'claude.machine.process', method: 'process' },
                { path: 'claude.machine.get', method: 'get' },
                { path: 'claude.machine.set', method: 'set' },
                { path: 'claude.machine.configure', method: 'configure' },
            ]
        },
        // PRISM_CLAUDE_ORCHESTRATOR
        {
            module: 'PRISM_CLAUDE_ORCHESTRATOR',
            routes: [
                { path: 'claude.orchestrator.init', method: 'init' },
                { path: 'claude.orchestrator.run', method: 'run' },
                { path: 'claude.orchestrator.process', method: 'process' },
                { path: 'claude.orchestrator.get', method: 'get' },
                { path: 'claude.orchestrator.set', method: 'set' },
                { path: 'claude.orchestrator.configure', method: 'configure' },
            ]
        },
        // PRISM_CLIPPER2_ENGINE
        {
            module: 'PRISM_CLIPPER2_ENGINE',
            routes: [
                { path: 'engine.clipper2.calculate', method: 'calculate' },
                { path: 'engine.clipper2.process', method: 'process' },
                { path: 'engine.clipper2.run', method: 'run' },
                { path: 'engine.clipper2.configure', method: 'configure' },
                { path: 'engine.clipper2.validate', method: 'validate' },
                { path: 'engine.clipper2.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CNCCOOKBOOK_INTEGRATION
        {
            module: 'PRISM_CNCCOOKBOOK_INTEGRATION',
            routes: [
                { path: 'cnccookb.integration.init', method: 'init' },
                { path: 'cnccookb.integration.run', method: 'run' },
                { path: 'cnccookb.integration.process', method: 'process' },
                { path: 'cnccookb.integration.get', method: 'get' },
                { path: 'cnccookb.integration.set', method: 'set' },
                { path: 'cnccookb.integration.configure', method: 'configure' },
            ]
        },
        // PRISM_CNC_SAFETY_DATABASE
        {
            module: 'PRISM_CNC_SAFETY_DATABASE',
            routes: [
                { path: 'db.cncsafety.get', method: 'get' },
                { path: 'db.cncsafety.list', method: 'list' },
                { path: 'db.cncsafety.search', method: 'search' },
                { path: 'db.cncsafety.byId', method: 'byId' },
                { path: 'db.cncsafety.filter', method: 'filter' },
                { path: 'db.cncsafety.count', method: 'count' },
            ]
        },
        // PRISM_COATING_LOOKUP
        {
            module: 'PRISM_COATING_LOOKUP',
            routes: [
                { path: 'coating.lookup.init', method: 'init' },
                { path: 'coating.lookup.run', method: 'run' },
                { path: 'coating.lookup.process', method: 'process' },
                { path: 'coating.lookup.get', method: 'get' },
                { path: 'coating.lookup.set', method: 'set' },
                { path: 'coating.lookup.configure', method: 'configure' },
            ]
        },
        // PRISM_COLLISION_ALGORITHMS
        {
            module: 'PRISM_COLLISION_ALGORITHMS',
            routes: [
                { path: 'alg.collisions.run', method: 'run' },
                { path: 'alg.collisions.configure', method: 'configure' },
                { path: 'alg.collisions.execute', method: 'execute' },
                { path: 'alg.collisions.getResult', method: 'getResult' },
                { path: 'alg.collisions.validate', method: 'validate' },
                { path: 'alg.collisions.compare', method: 'compare' },
            ]
        },
        // PRISM_COLLISION_DETECTION_V2
        {
            module: 'PRISM_COLLISION_DETECTION_V2',
            routes: [
                { path: 'collision.detectionv2.detect', method: 'detect' },
                { path: 'collision.detectionv2.check', method: 'check' },
                { path: 'collision.detectionv2.validate', method: 'validate' },
                { path: 'collision.detectionv2.getReport', method: 'getReport' },
                { path: 'collision.detectionv2.configure', method: 'configure' },
                { path: 'collision.detectionv2.visualize', method: 'visualize' },
            ]
        },
        // PRISM_COLLISION_MOTION
        {
            module: 'PRISM_COLLISION_MOTION',
            routes: [
                { path: 'collision.motion.detect', method: 'detect' },
                { path: 'collision.motion.check', method: 'check' },
                { path: 'collision.motion.validate', method: 'validate' },
                { path: 'collision.motion.getReport', method: 'getReport' },
                { path: 'collision.motion.configure', method: 'configure' },
                { path: 'collision.motion.visualize', method: 'visualize' },
            ]
        },
        // PRISM_COMBINATORIAL
        {
            module: 'PRISM_COMBINATORIAL',
            routes: [
                { path: 'combinat.core.init', method: 'init' },
                { path: 'combinat.core.run', method: 'run' },
                { path: 'combinat.core.process', method: 'process' },
                { path: 'combinat.core.get', method: 'get' },
                { path: 'combinat.core.set', method: 'set' },
                { path: 'combinat.core.configure', method: 'configure' },
            ]
        },
        // PRISM_COMBINATORIAL_OPTIMIZER
        {
            module: 'PRISM_COMBINATORIAL_OPTIMIZER',
            routes: [
                { path: 'opt.combinatoria.optimize', method: 'optimize' },
                { path: 'opt.combinatoria.minimize', method: 'minimize' },
                { path: 'opt.combinatoria.maximize', method: 'maximize' },
                { path: 'opt.combinatoria.configure', method: 'configure' },
                { path: 'opt.combinatoria.pareto', method: 'pareto' },
                { path: 'opt.combinatoria.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COMPLETE_2D_ENGINE
        {
            module: 'PRISM_COMPLETE_2D_ENGINE',
            routes: [
                { path: 'engine.complete2d.calculate', method: 'calculate' },
                { path: 'engine.complete2d.process', method: 'process' },
                { path: 'engine.complete2d.run', method: 'run' },
                { path: 'engine.complete2d.configure', method: 'configure' },
                { path: 'engine.complete2d.validate', method: 'validate' },
                { path: 'engine.complete2d.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COMPLETE_3D_ENGINE
        {
            module: 'PRISM_COMPLETE_3D_ENGINE',
            routes: [
                { path: 'engine.complete3d.calculate', method: 'calculate' },
                { path: 'engine.complete3d.process', method: 'process' },
                { path: 'engine.complete3d.run', method: 'run' },
                { path: 'engine.complete3d.configure', method: 'configure' },
                { path: 'engine.complete3d.validate', method: 'validate' },
                { path: 'engine.complete3d.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COMPLEX_CAD_LEARNING_ENGINE
        {
            module: 'PRISM_COMPLEX_CAD_LEARNING_ENGINE',
            routes: [
                { path: 'engine.complexcadle.calculate', method: 'calculate' },
                { path: 'engine.complexcadle.process', method: 'process' },
                { path: 'engine.complexcadle.run', method: 'run' },
                { path: 'engine.complexcadle.configure', method: 'configure' },
                { path: 'engine.complexcadle.validate', method: 'validate' },
                { path: 'engine.complexcadle.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COMPOUND_JOB_PROPERTIES_DATABASE
        {
            module: 'PRISM_COMPOUND_JOB_PROPERTIES_DATABASE',
            routes: [
                { path: 'db.compoundjobp.get', method: 'get' },
                { path: 'db.compoundjobp.list', method: 'list' },
                { path: 'db.compoundjobp.search', method: 'search' },
                { path: 'db.compoundjobp.byId', method: 'byId' },
                { path: 'db.compoundjobp.filter', method: 'filter' },
                { path: 'db.compoundjobp.count', method: 'count' },
            ]
        },
        // PRISM_COMPREHENSIVE_CAM_STRATEGIES
        {
            module: 'PRISM_COMPREHENSIVE_CAM_STRATEGIES',
            routes: [
                { path: 'cam.comprehensiv.generate', method: 'generate' },
                { path: 'cam.comprehensiv.optimize', method: 'optimize' },
                { path: 'cam.comprehensiv.validate', method: 'validate' },
                { path: 'cam.comprehensiv.simulate', method: 'simulate' },
                { path: 'cam.comprehensiv.export', method: 'export' },
                { path: 'cam.comprehensiv.configure', method: 'configure' },
            ]
        },
        // PRISM_COMPUTATIONAL_GEOMETRY
        {
            module: 'PRISM_COMPUTATIONAL_GEOMETRY',
            routes: [
                { path: 'geom.computationa.create', method: 'create' },
                { path: 'geom.computationa.evaluate', method: 'evaluate' },
                { path: 'geom.computationa.transform', method: 'transform' },
                { path: 'geom.computationa.validate', method: 'validate' },
                { path: 'geom.computationa.export', method: 'export' },
                { path: 'geom.computationa.analyze', method: 'analyze' },
            ]
        },
        // PRISM_CONFIDENCE_CHECK
        {
            module: 'PRISM_CONFIDENCE_CHECK',
            routes: [
                { path: 'confiden.check.init', method: 'init' },
                { path: 'confiden.check.run', method: 'run' },
                { path: 'confiden.check.process', method: 'process' },
                { path: 'confiden.check.get', method: 'get' },
                { path: 'confiden.check.set', method: 'set' },
                { path: 'confiden.check.configure', method: 'configure' },
            ]
        },
        // PRISM_CONSOLIDATED_MATERIALS
        {
            module: 'PRISM_CONSOLIDATED_MATERIALS',
            routes: [
                { path: 'consolid.materials.init', method: 'init' },
                { path: 'consolid.materials.run', method: 'run' },
                { path: 'consolid.materials.process', method: 'process' },
                { path: 'consolid.materials.get', method: 'get' },
                { path: 'consolid.materials.set', method: 'set' },
                { path: 'consolid.materials.configure', method: 'configure' },
            ]
        },
        // PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED
        {
            module: 'PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED',
            routes: [
                { path: 'opt.constrainede.optimize', method: 'optimize' },
                { path: 'opt.constrainede.minimize', method: 'minimize' },
                { path: 'opt.constrainede.maximize', method: 'maximize' },
                { path: 'opt.constrainede.configure', method: 'configure' },
                { path: 'opt.constrainede.pareto', method: 'pareto' },
                { path: 'opt.constrainede.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CONSTRAINED_OPTIMIZER
        {
            module: 'PRISM_CONSTRAINED_OPTIMIZER',
            routes: [
                { path: 'opt.constrained.optimize', method: 'optimize' },
                { path: 'opt.constrained.minimize', method: 'minimize' },
                { path: 'opt.constrained.maximize', method: 'maximize' },
                { path: 'opt.constrained.configure', method: 'configure' },
                { path: 'opt.constrained.pareto', method: 'pareto' },
                { path: 'opt.constrained.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CONSTRUCTION_GEOMETRY_ENGINE
        {
            module: 'PRISM_CONSTRUCTION_GEOMETRY_ENGINE',
            routes: [
                { path: 'engine.construction.calculate', method: 'calculate' },
                { path: 'engine.construction.process', method: 'process' },
                { path: 'engine.construction.run', method: 'run' },
                { path: 'engine.construction.configure', method: 'configure' },
                { path: 'engine.construction.validate', method: 'validate' },
                { path: 'engine.construction.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COOLANT_LOOKUP
        {
            module: 'PRISM_COOLANT_LOOKUP',
            routes: [
                { path: 'coolant.lookup.init', method: 'init' },
                { path: 'coolant.lookup.run', method: 'run' },
                { path: 'coolant.lookup.process', method: 'process' },
                { path: 'coolant.lookup.get', method: 'get' },
                { path: 'coolant.lookup.set', method: 'set' },
                { path: 'coolant.lookup.configure', method: 'configure' },
            ]
        },
        // PRISM_COORDINATE_SYSTEM_ENGINE
        {
            module: 'PRISM_COORDINATE_SYSTEM_ENGINE',
            routes: [
                { path: 'engine.coordinatesy.calculate', method: 'calculate' },
                { path: 'engine.coordinatesy.process', method: 'process' },
                { path: 'engine.coordinatesy.run', method: 'run' },
                { path: 'engine.coordinatesy.configure', method: 'configure' },
                { path: 'engine.coordinatesy.validate', method: 'validate' },
                { path: 'engine.coordinatesy.getResult', method: 'getResult' },
            ]
        },
        // PRISM_COORDINATE_TRANSFORM_ENGINE
        {
            module: 'PRISM_COORDINATE_TRANSFORM_ENGINE',
            routes: [
                { path: 'engine.coordinatetr.calculate', method: 'calculate' },
                { path: 'engine.coordinatetr.process', method: 'process' },
                { path: 'engine.coordinatetr.run', method: 'run' },
                { path: 'engine.coordinatetr.configure', method: 'configure' },
                { path: 'engine.coordinatetr.validate', method: 'validate' },
                { path: 'engine.coordinatetr.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CORE_ALGORITHMS
        {
            module: 'PRISM_CORE_ALGORITHMS',
            routes: [
                { path: 'alg.cores.run', method: 'run' },
                { path: 'alg.cores.configure', method: 'configure' },
                { path: 'alg.cores.execute', method: 'execute' },
                { path: 'alg.cores.getResult', method: 'getResult' },
                { path: 'alg.cores.validate', method: 'validate' },
                { path: 'alg.cores.compare', method: 'compare' },
            ]
        },
        // PRISM_COST_DATABASE
        {
            module: 'PRISM_COST_DATABASE',
            routes: [
                { path: 'db.cost.get', method: 'get' },
                { path: 'db.cost.list', method: 'list' },
                { path: 'db.cost.search', method: 'search' },
                { path: 'db.cost.byId', method: 'byId' },
                { path: 'db.cost.filter', method: 'filter' },
                { path: 'db.cost.count', method: 'count' },
            ]
        },
        // PRISM_COST_ESTIMATION
        {
            module: 'PRISM_COST_ESTIMATION',
            routes: [
                { path: 'cost.estimation.init', method: 'init' },
                { path: 'cost.estimation.run', method: 'run' },
                { path: 'cost.estimation.process', method: 'process' },
                { path: 'cost.estimation.get', method: 'get' },
                { path: 'cost.estimation.set', method: 'set' },
                { path: 'cost.estimation.configure', method: 'configure' },
            ]
        },
        // PRISM_CROSSCAM_STRATEGY_MAP
        {
            module: 'PRISM_CROSSCAM_STRATEGY_MAP',
            routes: [
                { path: 'cam.crossstrateg.generate', method: 'generate' },
                { path: 'cam.crossstrateg.optimize', method: 'optimize' },
                { path: 'cam.crossstrateg.validate', method: 'validate' },
                { path: 'cam.crossstrateg.simulate', method: 'simulate' },
                { path: 'cam.crossstrateg.export', method: 'export' },
                { path: 'cam.crossstrateg.configure', method: 'configure' },
            ]
        },
        // PRISM_CROSS_DOMAIN
        {
            module: 'PRISM_CROSS_DOMAIN',
            routes: [
                { path: 'cross.domain.init', method: 'init' },
                { path: 'cross.domain.run', method: 'run' },
                { path: 'cross.domain.process', method: 'process' },
                { path: 'cross.domain.get', method: 'get' },
                { path: 'cross.domain.set', method: 'set' },
                { path: 'cross.domain.configure', method: 'configure' },
            ]
        },
        // PRISM_CSG_ENGINE
        {
            module: 'PRISM_CSG_ENGINE',
            routes: [
                { path: 'engine.csg.calculate', method: 'calculate' },
                { path: 'engine.csg.process', method: 'process' },
                { path: 'engine.csg.run', method: 'run' },
                { path: 'engine.csg.configure', method: 'configure' },
                { path: 'engine.csg.validate', method: 'validate' },
                { path: 'engine.csg.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CSG_OPERATIONS
        {
            module: 'PRISM_CSG_OPERATIONS',
            routes: [
                { path: 'csg.operations.init', method: 'init' },
                { path: 'csg.operations.run', method: 'run' },
                { path: 'csg.operations.process', method: 'process' },
                { path: 'csg.operations.get', method: 'get' },
                { path: 'csg.operations.set', method: 'set' },
                { path: 'csg.operations.configure', method: 'configure' },
            ]
        },
        // PRISM_CSP_ENHANCED
        {
            module: 'PRISM_CSP_ENHANCED',
            routes: [
                { path: 'csp.enhanced.init', method: 'init' },
                { path: 'csp.enhanced.run', method: 'run' },
                { path: 'csp.enhanced.process', method: 'process' },
                { path: 'csp.enhanced.get', method: 'get' },
                { path: 'csp.enhanced.set', method: 'set' },
                { path: 'csp.enhanced.configure', method: 'configure' },
            ]
        },
        // PRISM_CSP_ENHANCED_ENGINE
        {
            module: 'PRISM_CSP_ENHANCED_ENGINE',
            routes: [
                { path: 'engine.cspenhanced.calculate', method: 'calculate' },
                { path: 'engine.cspenhanced.process', method: 'process' },
                { path: 'engine.cspenhanced.run', method: 'run' },
                { path: 'engine.cspenhanced.configure', method: 'configure' },
                { path: 'engine.cspenhanced.validate', method: 'validate' },
                { path: 'engine.cspenhanced.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CURVATURE_ANALYSIS_ENGINE
        {
            module: 'PRISM_CURVATURE_ANALYSIS_ENGINE',
            routes: [
                { path: 'engine.curvatureana.calculate', method: 'calculate' },
                { path: 'engine.curvatureana.process', method: 'process' },
                { path: 'engine.curvatureana.run', method: 'run' },
                { path: 'engine.curvatureana.configure', method: 'configure' },
                { path: 'engine.curvatureana.validate', method: 'validate' },
                { path: 'engine.curvatureana.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CUSTOMER_MANAGER
        {
            module: 'PRISM_CUSTOMER_MANAGER',
            routes: [
                { path: 'customer.manager.init', method: 'init' },
                { path: 'customer.manager.run', method: 'run' },
                { path: 'customer.manager.process', method: 'process' },
                { path: 'customer.manager.get', method: 'get' },
                { path: 'customer.manager.set', method: 'set' },
                { path: 'customer.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_CUTTING_MECHANICS
        {
            module: 'PRISM_CUTTING_MECHANICS',
            routes: [
                { path: 'cutting.mechanics.init', method: 'init' },
                { path: 'cutting.mechanics.run', method: 'run' },
                { path: 'cutting.mechanics.process', method: 'process' },
                { path: 'cutting.mechanics.get', method: 'get' },
                { path: 'cutting.mechanics.set', method: 'set' },
                { path: 'cutting.mechanics.configure', method: 'configure' },
            ]
        },
        // PRISM_CUTTING_MECHANICS_ENGINE
        {
            module: 'PRISM_CUTTING_MECHANICS_ENGINE',
            routes: [
                { path: 'engine.cuttingmecha.calculate', method: 'calculate' },
                { path: 'engine.cuttingmecha.process', method: 'process' },
                { path: 'engine.cuttingmecha.run', method: 'run' },
                { path: 'engine.cuttingmecha.configure', method: 'configure' },
                { path: 'engine.cuttingmecha.validate', method: 'validate' },
                { path: 'engine.cuttingmecha.getResult', method: 'getResult' },
            ]
        },
        // PRISM_CUTTING_TOOL_DATABASE_V2
        {
            module: 'PRISM_CUTTING_TOOL_DATABASE_V2',
            routes: [
                { path: 'db.cuttingtoolv.get', method: 'get' },
                { path: 'db.cuttingtoolv.list', method: 'list' },
                { path: 'db.cuttingtoolv.search', method: 'search' },
                { path: 'db.cuttingtoolv.byId', method: 'byId' },
                { path: 'db.cuttingtoolv.filter', method: 'filter' },
                { path: 'db.cuttingtoolv.count', method: 'count' },
            ]
        },
        // PRISM_CUTTING_TOOL_EXPANSION_V3
        {
            module: 'PRISM_CUTTING_TOOL_EXPANSION_V3',
            routes: [
                { path: 'cutting.tool.init', method: 'init' },
                { path: 'cutting.tool.run', method: 'run' },
                { path: 'cutting.tool.process', method: 'process' },
                { path: 'cutting.tool.get', method: 'get' },
                { path: 'cutting.tool.set', method: 'set' },
                { path: 'cutting.tool.configure', method: 'configure' },
            ]
        },
        // PRISM_DATABASE_HUB
        {
            module: 'PRISM_DATABASE_HUB',
            routes: [
                { path: 'db.hub.get', method: 'get' },
                { path: 'db.hub.list', method: 'list' },
                { path: 'db.hub.search', method: 'search' },
                { path: 'db.hub.byId', method: 'byId' },
                { path: 'db.hub.filter', method: 'filter' },
                { path: 'db.hub.count', method: 'count' },
            ]
        },
        // PRISM_DEBOUNCE
        {
            module: 'PRISM_DEBOUNCE',
            routes: [
                { path: 'debounce.core.init', method: 'init' },
                { path: 'debounce.core.run', method: 'run' },
                { path: 'debounce.core.process', method: 'process' },
                { path: 'debounce.core.get', method: 'get' },
                { path: 'debounce.core.set', method: 'set' },
                { path: 'debounce.core.configure', method: 'configure' },
            ]
        },
        // PRISM_DECISION_TREE_ENGINE
        {
            module: 'PRISM_DECISION_TREE_ENGINE',
            routes: [
                { path: 'engine.decisiontree.calculate', method: 'calculate' },
                { path: 'engine.decisiontree.process', method: 'process' },
                { path: 'engine.decisiontree.run', method: 'run' },
                { path: 'engine.decisiontree.configure', method: 'configure' },
                { path: 'engine.decisiontree.validate', method: 'validate' },
                { path: 'engine.decisiontree.getResult', method: 'getResult' },
            ]
        },
        // PRISM_DEEP_MACHINE_INTEGRATION
        {
            module: 'PRISM_DEEP_MACHINE_INTEGRATION',
            routes: [
                { path: 'deep.machine.init', method: 'init' },
                { path: 'deep.machine.run', method: 'run' },
                { path: 'deep.machine.process', method: 'process' },
                { path: 'deep.machine.get', method: 'get' },
                { path: 'deep.machine.set', method: 'set' },
                { path: 'deep.machine.configure', method: 'configure' },
            ]
        },
        // PRISM_DELAUNAY_3D_ENGINE
        {
            module: 'PRISM_DELAUNAY_3D_ENGINE',
            routes: [
                { path: 'engine.delaunay3d.calculate', method: 'calculate' },
                { path: 'engine.delaunay3d.process', method: 'process' },
                { path: 'engine.delaunay3d.run', method: 'run' },
                { path: 'engine.delaunay3d.configure', method: 'configure' },
                { path: 'engine.delaunay3d.validate', method: 'validate' },
                { path: 'engine.delaunay3d.getResult', method: 'getResult' },
            ]
        },
        // PRISM_DEPRECATED
        {
            module: 'PRISM_DEPRECATED',
            routes: [
                { path: 'deprecat.core.init', method: 'init' },
                { path: 'deprecat.core.run', method: 'run' },
                { path: 'deprecat.core.process', method: 'process' },
                { path: 'deprecat.core.get', method: 'get' },
                { path: 'deprecat.core.set', method: 'set' },
                { path: 'deprecat.core.configure', method: 'configure' },
            ]
        },
        // PRISM_DIMENSIONALITY_ENGINE
        {
            module: 'PRISM_DIMENSIONALITY_ENGINE',
            routes: [
                { path: 'engine.dimensionali.calculate', method: 'calculate' },
                { path: 'engine.dimensionali.process', method: 'process' },
                { path: 'engine.dimensionali.run', method: 'run' },
                { path: 'engine.dimensionali.configure', method: 'configure' },
                { path: 'engine.dimensionali.validate', method: 'validate' },
                { path: 'engine.dimensionali.getResult', method: 'getResult' },
            ]
        },
        // PRISM_DQN_ENGINE
        {
            module: 'PRISM_DQN_ENGINE',
            routes: [
                { path: 'engine.dqn.calculate', method: 'calculate' },
                { path: 'engine.dqn.process', method: 'process' },
                { path: 'engine.dqn.run', method: 'run' },
                { path: 'engine.dqn.configure', method: 'configure' },
                { path: 'engine.dqn.validate', method: 'validate' },
                { path: 'engine.dqn.getResult', method: 'getResult' },
            ]
        },
        // PRISM_DROPDOWN_SYSTEM
        {
            module: 'PRISM_DROPDOWN_SYSTEM',
            routes: [
                { path: 'dropdown.system.init', method: 'init' },
                { path: 'dropdown.system.run', method: 'run' },
                { path: 'dropdown.system.process', method: 'process' },
                { path: 'dropdown.system.get', method: 'get' },
                { path: 'dropdown.system.set', method: 'set' },
                { path: 'dropdown.system.configure', method: 'configure' },
            ]
        },
        // PRISM_DYNAMICS
        {
            module: 'PRISM_DYNAMICS',
            routes: [
                { path: 'dynamics.core.init', method: 'init' },
                { path: 'dynamics.core.run', method: 'run' },
                { path: 'dynamics.core.process', method: 'process' },
                { path: 'dynamics.core.get', method: 'get' },
                { path: 'dynamics.core.set', method: 'set' },
                { path: 'dynamics.core.configure', method: 'configure' },
            ]
        },
        // PRISM_EMBEDDED_PARTS_DATABASE
        {
            module: 'PRISM_EMBEDDED_PARTS_DATABASE',
            routes: [
                { path: 'db.embeddedpart.get', method: 'get' },
                { path: 'db.embeddedpart.list', method: 'list' },
                { path: 'db.embeddedpart.search', method: 'search' },
                { path: 'db.embeddedpart.byId', method: 'byId' },
                { path: 'db.embeddedpart.filter', method: 'filter' },
                { path: 'db.embeddedpart.count', method: 'count' },
            ]
        },
        // PRISM_ENHANCED_COLLISION_ENGINE
        {
            module: 'PRISM_ENHANCED_COLLISION_ENGINE',
            routes: [
                { path: 'engine.enhancedcoll.calculate', method: 'calculate' },
                { path: 'engine.enhancedcoll.process', method: 'process' },
                { path: 'engine.enhancedcoll.run', method: 'run' },
                { path: 'engine.enhancedcoll.configure', method: 'configure' },
                { path: 'engine.enhancedcoll.validate', method: 'validate' },
                { path: 'engine.enhancedcoll.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ENHANCED_GDT_ENGINE
        {
            module: 'PRISM_ENHANCED_GDT_ENGINE',
            routes: [
                { path: 'engine.enhancedgdt.calculate', method: 'calculate' },
                { path: 'engine.enhancedgdt.process', method: 'process' },
                { path: 'engine.enhancedgdt.run', method: 'run' },
                { path: 'engine.enhancedgdt.configure', method: 'configure' },
                { path: 'engine.enhancedgdt.validate', method: 'validate' },
                { path: 'engine.enhancedgdt.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ENHANCED_INTEGRATION
        {
            module: 'PRISM_ENHANCED_INTEGRATION',
            routes: [
                { path: 'enhanced.integration.init', method: 'init' },
                { path: 'enhanced.integration.run', method: 'run' },
                { path: 'enhanced.integration.process', method: 'process' },
                { path: 'enhanced.integration.get', method: 'get' },
                { path: 'enhanced.integration.set', method: 'set' },
                { path: 'enhanced.integration.configure', method: 'configure' },
            ]
        },
        // PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE
        {
            module: 'PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE',
            routes: [
                { path: 'engine.enhancedlath.calculate', method: 'calculate' },
                { path: 'engine.enhancedlath.process', method: 'process' },
                { path: 'engine.enhancedlath.run', method: 'run' },
                { path: 'engine.enhancedlath.configure', method: 'configure' },
                { path: 'engine.enhancedlath.validate', method: 'validate' },
                { path: 'engine.enhancedlath.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ENHANCED_LATHE_OPERATIONS_ENGINE
        {
            module: 'PRISM_ENHANCED_LATHE_OPERATIONS_ENGINE',
            routes: [
                { path: 'engine.enhancedlath.calculate', method: 'calculate' },
                { path: 'engine.enhancedlath.process', method: 'process' },
                { path: 'engine.enhancedlath.run', method: 'run' },
                { path: 'engine.enhancedlath.configure', method: 'configure' },
                { path: 'engine.enhancedlath.validate', method: 'validate' },
                { path: 'engine.enhancedlath.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ENHANCED_MASTER_ORCHESTRATOR
        {
            module: 'PRISM_ENHANCED_MASTER_ORCHESTRATOR',
            routes: [
                { path: 'enhanced.master.init', method: 'init' },
                { path: 'enhanced.master.run', method: 'run' },
                { path: 'enhanced.master.process', method: 'process' },
                { path: 'enhanced.master.get', method: 'get' },
                { path: 'enhanced.master.set', method: 'set' },
                { path: 'enhanced.master.configure', method: 'configure' },
            ]
        },
        // PRISM_ENHANCED_MATERIAL_DATABASE
        {
            module: 'PRISM_ENHANCED_MATERIAL_DATABASE',
            routes: [
                { path: 'db.enhancedmate.get', method: 'get' },
                { path: 'db.enhancedmate.list', method: 'list' },
                { path: 'db.enhancedmate.search', method: 'search' },
                { path: 'db.enhancedmate.byId', method: 'byId' },
                { path: 'db.enhancedmate.filter', method: 'filter' },
                { path: 'db.enhancedmate.count', method: 'count' },
            ]
        },
        // PRISM_ENHANCED_MILL_TURN_CAM_ENGINE
        {
            module: 'PRISM_ENHANCED_MILL_TURN_CAM_ENGINE',
            routes: [
                { path: 'engine.enhancedmill.calculate', method: 'calculate' },
                { path: 'engine.enhancedmill.process', method: 'process' },
                { path: 'engine.enhancedmill.run', method: 'run' },
                { path: 'engine.enhancedmill.configure', method: 'configure' },
                { path: 'engine.enhancedmill.validate', method: 'validate' },
                { path: 'engine.enhancedmill.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ENHANCED_POST_DATABASE_V2
        {
            module: 'PRISM_ENHANCED_POST_DATABASE_V2',
            routes: [
                { path: 'db.enhancedpost.get', method: 'get' },
                { path: 'db.enhancedpost.list', method: 'list' },
                { path: 'db.enhancedpost.search', method: 'search' },
                { path: 'db.enhancedpost.byId', method: 'byId' },
                { path: 'db.enhancedpost.filter', method: 'filter' },
                { path: 'db.enhancedpost.count', method: 'count' },
            ]
        },
        // PRISM_ENHANCED_TOOLPATH_GENERATOR
        {
            module: 'PRISM_ENHANCED_TOOLPATH_GENERATOR',
            routes: [
                { path: 'toolpath.enhancedgene.generate', method: 'generate' },
                { path: 'toolpath.enhancedgene.optimize', method: 'optimize' },
                { path: 'toolpath.enhancedgene.validate', method: 'validate' },
                { path: 'toolpath.enhancedgene.simulate', method: 'simulate' },
                { path: 'toolpath.enhancedgene.export', method: 'export' },
                { path: 'toolpath.enhancedgene.link', method: 'link' },
            ]
        },
        // PRISM_ENSEMBLE_ENGINE
        {
            module: 'PRISM_ENSEMBLE_ENGINE',
            routes: [
                { path: 'engine.ensemble.calculate', method: 'calculate' },
                { path: 'engine.ensemble.process', method: 'process' },
                { path: 'engine.ensemble.run', method: 'run' },
                { path: 'engine.ensemble.configure', method: 'configure' },
                { path: 'engine.ensemble.validate', method: 'validate' },
                { path: 'engine.ensemble.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ERROR_HANDLER
        {
            module: 'PRISM_ERROR_HANDLER',
            routes: [
                { path: 'error.handler.init', method: 'init' },
                { path: 'error.handler.run', method: 'run' },
                { path: 'error.handler.process', method: 'process' },
                { path: 'error.handler.get', method: 'get' },
                { path: 'error.handler.set', method: 'set' },
                { path: 'error.handler.configure', method: 'configure' },
            ]
        },
        // PRISM_EVENT_INTEGRATION_BRIDGE
        {
            module: 'PRISM_EVENT_INTEGRATION_BRIDGE',
            routes: [
                { path: 'event.integration.init', method: 'init' },
                { path: 'event.integration.run', method: 'run' },
                { path: 'event.integration.process', method: 'process' },
                { path: 'event.integration.get', method: 'get' },
                { path: 'event.integration.set', method: 'set' },
                { path: 'event.integration.configure', method: 'configure' },
            ]
        },
        // PRISM_EVENT_MANAGER
        {
            module: 'PRISM_EVENT_MANAGER',
            routes: [
                { path: 'event.manager.init', method: 'init' },
                { path: 'event.manager.run', method: 'run' },
                { path: 'event.manager.process', method: 'process' },
                { path: 'event.manager.get', method: 'get' },
                { path: 'event.manager.set', method: 'set' },
                { path: 'event.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_EVOLUTIONARY_ENHANCED_ENGINE
        {
            module: 'PRISM_EVOLUTIONARY_ENHANCED_ENGINE',
            routes: [
                { path: 'engine.evolutionary.calculate', method: 'calculate' },
                { path: 'engine.evolutionary.process', method: 'process' },
                { path: 'engine.evolutionary.run', method: 'run' },
                { path: 'engine.evolutionary.configure', method: 'configure' },
                { path: 'engine.evolutionary.validate', method: 'validate' },
                { path: 'engine.evolutionary.getResult', method: 'getResult' },
            ]
        },
        // PRISM_EXPANDED_POST_PROCESSORS
        {
            module: 'PRISM_EXPANDED_POST_PROCESSORS',
            routes: [
                { path: 'expanded.post.init', method: 'init' },
                { path: 'expanded.post.run', method: 'run' },
                { path: 'expanded.post.process', method: 'process' },
                { path: 'expanded.post.get', method: 'get' },
                { path: 'expanded.post.set', method: 'set' },
                { path: 'expanded.post.configure', method: 'configure' },
            ]
        },
        // PRISM_EXTENDED_MATERIAL_CUTTING_DB
        {
            module: 'PRISM_EXTENDED_MATERIAL_CUTTING_DB',
            routes: [
                { path: 'extended.material.init', method: 'init' },
                { path: 'extended.material.run', method: 'run' },
                { path: 'extended.material.process', method: 'process' },
                { path: 'extended.material.get', method: 'get' },
                { path: 'extended.material.set', method: 'set' },
                { path: 'extended.material.configure', method: 'configure' },
            ]
        },
        // PRISM_FEATURE_CURVES_ENGINE
        {
            module: 'PRISM_FEATURE_CURVES_ENGINE',
            routes: [
                { path: 'engine.featurecurve.calculate', method: 'calculate' },
                { path: 'engine.featurecurve.process', method: 'process' },
                { path: 'engine.featurecurve.run', method: 'run' },
                { path: 'engine.featurecurve.configure', method: 'configure' },
                { path: 'engine.featurecurve.validate', method: 'validate' },
                { path: 'engine.featurecurve.getResult', method: 'getResult' },
            ]
        },
        // PRISM_FEATURE_HISTORY_MANAGER
        {
            module: 'PRISM_FEATURE_HISTORY_MANAGER',
            routes: [
                { path: 'feature.history.init', method: 'init' },
                { path: 'feature.history.run', method: 'run' },
                { path: 'feature.history.process', method: 'process' },
                { path: 'feature.history.get', method: 'get' },
                { path: 'feature.history.set', method: 'set' },
                { path: 'feature.history.configure', method: 'configure' },
            ]
        },
        // PRISM_FEATURE_INTERACTION
        {
            module: 'PRISM_FEATURE_INTERACTION',
            routes: [
                { path: 'feature.interaction.init', method: 'init' },
                { path: 'feature.interaction.run', method: 'run' },
                { path: 'feature.interaction.process', method: 'process' },
                { path: 'feature.interaction.get', method: 'get' },
                { path: 'feature.interaction.set', method: 'set' },
                { path: 'feature.interaction.configure', method: 'configure' },
            ]
        },
        // PRISM_FEATURE_INTERACTION_ENGINE
        {
            module: 'PRISM_FEATURE_INTERACTION_ENGINE',
            routes: [
                { path: 'engine.featureinter.calculate', method: 'calculate' },
                { path: 'engine.featureinter.process', method: 'process' },
                { path: 'engine.featureinter.run', method: 'run' },
                { path: 'engine.featureinter.configure', method: 'configure' },
                { path: 'engine.featureinter.validate', method: 'validate' },
                { path: 'engine.featureinter.getResult', method: 'getResult' },
            ]
        },
        // PRISM_FEATURE_RECOGNITION_ENHANCED
        {
            module: 'PRISM_FEATURE_RECOGNITION_ENHANCED',
            routes: [
                { path: 'feature.recognition.init', method: 'init' },
                { path: 'feature.recognition.run', method: 'run' },
                { path: 'feature.recognition.process', method: 'process' },
                { path: 'feature.recognition.get', method: 'get' },
                { path: 'feature.recognition.set', method: 'set' },
                { path: 'feature.recognition.configure', method: 'configure' },
            ]
        },
        // PRISM_FEATURE_STRATEGY_COMPLETE
        {
            module: 'PRISM_FEATURE_STRATEGY_COMPLETE',
            routes: [
                { path: 'data.featurestrat.get', method: 'get' },
                { path: 'data.featurestrat.set', method: 'set' },
                { path: 'data.featurestrat.process', method: 'process' },
                { path: 'data.featurestrat.validate', method: 'validate' },
                { path: 'data.featurestrat.export', method: 'export' },
                { path: 'data.featurestrat.import', method: 'import' },
            ]
        },
        // PRISM_FILLETING_ENGINE
        {
            module: 'PRISM_FILLETING_ENGINE',
            routes: [
                { path: 'engine.filleting.calculate', method: 'calculate' },
                { path: 'engine.filleting.process', method: 'process' },
                { path: 'engine.filleting.run', method: 'run' },
                { path: 'engine.filleting.configure', method: 'configure' },
                { path: 'engine.filleting.validate', method: 'validate' },
                { path: 'engine.filleting.getResult', method: 'getResult' },
            ]
        },
        // PRISM_FINANCIAL_ENGINE
        {
            module: 'PRISM_FINANCIAL_ENGINE',
            routes: [
                { path: 'engine.financial.calculate', method: 'calculate' },
                { path: 'engine.financial.process', method: 'process' },
                { path: 'engine.financial.run', method: 'run' },
                { path: 'engine.financial.configure', method: 'configure' },
                { path: 'engine.financial.validate', method: 'validate' },
                { path: 'engine.financial.getResult', method: 'getResult' },
            ]
        },
        // PRISM_FIXTURE_DATABASE
        {
            module: 'PRISM_FIXTURE_DATABASE',
            routes: [
                { path: 'db.fixture.get', method: 'get' },
                { path: 'db.fixture.list', method: 'list' },
                { path: 'db.fixture.search', method: 'search' },
                { path: 'db.fixture.byId', method: 'byId' },
                { path: 'db.fixture.filter', method: 'filter' },
                { path: 'db.fixture.count', method: 'count' },
            ]
        },
        // PRISM_FORCE_LOOKUP
        {
            module: 'PRISM_FORCE_LOOKUP',
            routes: [
                { path: 'physics.lookup.calculate', method: 'calculate' },
                { path: 'physics.lookup.simulate', method: 'simulate' },
                { path: 'physics.lookup.model', method: 'model' },
                { path: 'physics.lookup.validate', method: 'validate' },
                { path: 'physics.lookup.getResult', method: 'getResult' },
                { path: 'physics.lookup.analyze', method: 'analyze' },
            ]
        },
        // PRISM_FUSION_POST_DATABASE
        {
            module: 'PRISM_FUSION_POST_DATABASE',
            routes: [
                { path: 'db.fusionpost.get', method: 'get' },
                { path: 'db.fusionpost.list', method: 'list' },
                { path: 'db.fusionpost.search', method: 'search' },
                { path: 'db.fusionpost.byId', method: 'byId' },
                { path: 'db.fusionpost.filter', method: 'filter' },
                { path: 'db.fusionpost.count', method: 'count' },
            ]
        },
        // PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE
        {
            module: 'PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE',
            routes: [
                { path: 'engine.fusionsketch.calculate', method: 'calculate' },
                { path: 'engine.fusionsketch.process', method: 'process' },
                { path: 'engine.fusionsketch.run', method: 'run' },
                { path: 'engine.fusionsketch.configure', method: 'configure' },
                { path: 'engine.fusionsketch.validate', method: 'validate' },
                { path: 'engine.fusionsketch.getResult', method: 'getResult' },
            ]
        },
        // PRISM_GATEWAY
        {
            module: 'PRISM_GATEWAY',
            routes: [
                { path: 'gateway.core.init', method: 'init' },
                { path: 'gateway.core.run', method: 'run' },
                { path: 'gateway.core.process', method: 'process' },
                { path: 'gateway.core.get', method: 'get' },
                { path: 'gateway.core.set', method: 'set' },
                { path: 'gateway.core.configure', method: 'configure' },
            ]
        },
        // PRISM_GATEWAY_100_PERCENT_ROUTES
        {
            module: 'PRISM_GATEWAY_100_PERCENT_ROUTES',
            routes: [
                { path: 'gateway.100.init', method: 'init' },
                { path: 'gateway.100.run', method: 'run' },
                { path: 'gateway.100.process', method: 'process' },
                { path: 'gateway.100.get', method: 'get' },
                { path: 'gateway.100.set', method: 'set' },
                { path: 'gateway.100.configure', method: 'configure' },
            ]
        },
        // PRISM_GATEWAY_BULK_ROUTES
        {
            module: 'PRISM_GATEWAY_BULK_ROUTES',
            routes: [
                { path: 'gateway.bulk.init', method: 'init' },
                { path: 'gateway.bulk.run', method: 'run' },
                { path: 'gateway.bulk.process', method: 'process' },
                { path: 'gateway.bulk.get', method: 'get' },
                { path: 'gateway.bulk.set', method: 'set' },
                { path: 'gateway.bulk.configure', method: 'configure' },
            ]
        },
        // PRISM_GATEWAY_ENHANCED
        {
            module: 'PRISM_GATEWAY_ENHANCED',
            routes: [
                { path: 'gateway.enhanced.init', method: 'init' },
                { path: 'gateway.enhanced.run', method: 'run' },
                { path: 'gateway.enhanced.process', method: 'process' },
                { path: 'gateway.enhanced.get', method: 'get' },
                { path: 'gateway.enhanced.set', method: 'set' },
                { path: 'gateway.enhanced.configure', method: 'configure' },
            ]
        },
        // PRISM_GEODESIC_DISTANCE
        {
            module: 'PRISM_GEODESIC_DISTANCE',
            routes: [
                { path: 'geodesic.distance.init', method: 'init' },
                { path: 'geodesic.distance.run', method: 'run' },
                { path: 'geodesic.distance.process', method: 'process' },
                { path: 'geodesic.distance.get', method: 'get' },
                { path: 'geodesic.distance.set', method: 'set' },
                { path: 'geodesic.distance.configure', method: 'configure' },
            ]
        },
        // PRISM_GEODESIC_DISTANCE_ENGINE
        {
            module: 'PRISM_GEODESIC_DISTANCE_ENGINE',
            routes: [
                { path: 'engine.geodesicdist.calculate', method: 'calculate' },
                { path: 'engine.geodesicdist.process', method: 'process' },
                { path: 'engine.geodesicdist.run', method: 'run' },
                { path: 'engine.geodesicdist.configure', method: 'configure' },
                { path: 'engine.geodesicdist.validate', method: 'validate' },
                { path: 'engine.geodesicdist.getResult', method: 'getResult' },
            ]
        },
        // PRISM_GEOMETRY_ALGORITHMS
        {
            module: 'PRISM_GEOMETRY_ALGORITHMS',
            routes: [
                { path: 'geom.algorithms.create', method: 'create' },
                { path: 'geom.algorithms.evaluate', method: 'evaluate' },
                { path: 'geom.algorithms.transform', method: 'transform' },
                { path: 'geom.algorithms.validate', method: 'validate' },
                { path: 'geom.algorithms.export', method: 'export' },
                { path: 'geom.algorithms.analyze', method: 'analyze' },
            ]
        },
        // PRISM_GRAPH_ALGORITHMS
        {
            module: 'PRISM_GRAPH_ALGORITHMS',
            routes: [
                { path: 'alg.graphs.run', method: 'run' },
                { path: 'alg.graphs.configure', method: 'configure' },
                { path: 'alg.graphs.execute', method: 'execute' },
                { path: 'alg.graphs.getResult', method: 'getResult' },
                { path: 'alg.graphs.validate', method: 'validate' },
                { path: 'alg.graphs.compare', method: 'compare' },
            ]
        },
        // PRISM_GRAPH_ALGORITHMS_ENGINE
        {
            module: 'PRISM_GRAPH_ALGORITHMS_ENGINE',
            routes: [
                { path: 'engine.graphalgorit.calculate', method: 'calculate' },
                { path: 'engine.graphalgorit.process', method: 'process' },
                { path: 'engine.graphalgorit.run', method: 'run' },
                { path: 'engine.graphalgorit.configure', method: 'configure' },
                { path: 'engine.graphalgorit.validate', method: 'validate' },
                { path: 'engine.graphalgorit.getResult', method: 'getResult' },
            ]
        },
        // PRISM_HARMONIC_MAPS_ENGINE
        {
            module: 'PRISM_HARMONIC_MAPS_ENGINE',
            routes: [
                { path: 'engine.harmonicmaps.calculate', method: 'calculate' },
                { path: 'engine.harmonicmaps.process', method: 'process' },
                { path: 'engine.harmonicmaps.run', method: 'run' },
                { path: 'engine.harmonicmaps.configure', method: 'configure' },
                { path: 'engine.harmonicmaps.validate', method: 'validate' },
                { path: 'engine.harmonicmaps.getResult', method: 'getResult' },
            ]
        },
        // PRISM_HEAT_TRANSFER_ENGINE
        {
            module: 'PRISM_HEAT_TRANSFER_ENGINE',
            routes: [
                { path: 'engine.heattransfer.calculate', method: 'calculate' },
                { path: 'engine.heattransfer.process', method: 'process' },
                { path: 'engine.heattransfer.run', method: 'run' },
                { path: 'engine.heattransfer.configure', method: 'configure' },
                { path: 'engine.heattransfer.validate', method: 'validate' },
                { path: 'engine.heattransfer.getResult', method: 'getResult' },
            ]
        },
        // PRISM_HELICAL_DRILLING_ENGINE
        {
            module: 'PRISM_HELICAL_DRILLING_ENGINE',
            routes: [
                { path: 'engine.helicaldrill.calculate', method: 'calculate' },
                { path: 'engine.helicaldrill.process', method: 'process' },
                { path: 'engine.helicaldrill.run', method: 'run' },
                { path: 'engine.helicaldrill.configure', method: 'configure' },
                { path: 'engine.helicaldrill.validate', method: 'validate' },
                { path: 'engine.helicaldrill.getResult', method: 'getResult' },
            ]
        },
        // PRISM_HISTORY
        {
            module: 'PRISM_HISTORY',
            routes: [
                { path: 'history.core.init', method: 'init' },
                { path: 'history.core.run', method: 'run' },
                { path: 'history.core.process', method: 'process' },
                { path: 'history.core.get', method: 'get' },
                { path: 'history.core.set', method: 'set' },
                { path: 'history.core.configure', method: 'configure' },
            ]
        },
        // PRISM_HOLDER_CLEARANCE_VALIDATOR
        {
            module: 'PRISM_HOLDER_CLEARANCE_VALIDATOR',
            routes: [
                { path: 'holder.clearance.init', method: 'init' },
                { path: 'holder.clearance.run', method: 'run' },
                { path: 'holder.clearance.process', method: 'process' },
                { path: 'holder.clearance.get', method: 'get' },
                { path: 'holder.clearance.set', method: 'set' },
                { path: 'holder.clearance.configure', method: 'configure' },
            ]
        },
        // PRISM_HYBRID_TOOLPATH_SYNTHESIZER
        {
            module: 'PRISM_HYBRID_TOOLPATH_SYNTHESIZER',
            routes: [
                { path: 'toolpath.hybridsynthe.generate', method: 'generate' },
                { path: 'toolpath.hybridsynthe.optimize', method: 'optimize' },
                { path: 'toolpath.hybridsynthe.validate', method: 'validate' },
                { path: 'toolpath.hybridsynthe.simulate', method: 'simulate' },
                { path: 'toolpath.hybridsynthe.export', method: 'export' },
                { path: 'toolpath.hybridsynthe.link', method: 'link' },
            ]
        },
        // PRISM_HYPERMILL_FIXTURE_DATABASE
        {
            module: 'PRISM_HYPERMILL_FIXTURE_DATABASE',
            routes: [
                { path: 'db.hypermillfix.get', method: 'get' },
                { path: 'db.hypermillfix.list', method: 'list' },
                { path: 'db.hypermillfix.search', method: 'search' },
                { path: 'db.hypermillfix.byId', method: 'byId' },
                { path: 'db.hypermillfix.filter', method: 'filter' },
                { path: 'db.hypermillfix.count', method: 'count' },
            ]
        },
        // PRISM_ICP_REGISTRATION_ENGINE
        {
            module: 'PRISM_ICP_REGISTRATION_ENGINE',
            routes: [
                { path: 'engine.icpregistrat.calculate', method: 'calculate' },
                { path: 'engine.icpregistrat.process', method: 'process' },
                { path: 'engine.icpregistrat.run', method: 'run' },
                { path: 'engine.icpregistrat.configure', method: 'configure' },
                { path: 'engine.icpregistrat.validate', method: 'validate' },
                { path: 'engine.icpregistrat.getResult', method: 'getResult' },
            ]
        },
        // PRISM_INIT_ORCHESTRATOR
        {
            module: 'PRISM_INIT_ORCHESTRATOR',
            routes: [
                { path: 'init.orchestrator.init', method: 'init' },
                { path: 'init.orchestrator.run', method: 'run' },
                { path: 'init.orchestrator.process', method: 'process' },
                { path: 'init.orchestrator.get', method: 'get' },
                { path: 'init.orchestrator.set', method: 'set' },
                { path: 'init.orchestrator.configure', method: 'configure' },
            ]
        },
        // PRISM_INNOVATION_REGISTRY
        {
            module: 'PRISM_INNOVATION_REGISTRY',
            routes: [
                { path: 'innovati.registry.init', method: 'init' },
                { path: 'innovati.registry.run', method: 'run' },
                { path: 'innovati.registry.process', method: 'process' },
                { path: 'innovati.registry.get', method: 'get' },
                { path: 'innovati.registry.set', method: 'set' },
                { path: 'innovati.registry.configure', method: 'configure' },
            ]
        },
        // PRISM_INSPECTION_ENGINE
        {
            module: 'PRISM_INSPECTION_ENGINE',
            routes: [
                { path: 'engine.inspection.calculate', method: 'calculate' },
                { path: 'engine.inspection.process', method: 'process' },
                { path: 'engine.inspection.run', method: 'run' },
                { path: 'engine.inspection.configure', method: 'configure' },
                { path: 'engine.inspection.validate', method: 'validate' },
                { path: 'engine.inspection.getResult', method: 'getResult' },
            ]
        },
        // PRISM_INTELLIGENT_COLLISION_SYSTEM
        {
            module: 'PRISM_INTELLIGENT_COLLISION_SYSTEM',
            routes: [
                { path: 'collision.intelligents.detect', method: 'detect' },
                { path: 'collision.intelligents.check', method: 'check' },
                { path: 'collision.intelligents.validate', method: 'validate' },
                { path: 'collision.intelligents.getReport', method: 'getReport' },
                { path: 'collision.intelligents.configure', method: 'configure' },
                { path: 'collision.intelligents.visualize', method: 'visualize' },
            ]
        },
        // PRISM_INTERNAL_POST_ENGINE
        {
            module: 'PRISM_INTERNAL_POST_ENGINE',
            routes: [
                { path: 'engine.internalpost.calculate', method: 'calculate' },
                { path: 'engine.internalpost.process', method: 'process' },
                { path: 'engine.internalpost.run', method: 'run' },
                { path: 'engine.internalpost.configure', method: 'configure' },
                { path: 'engine.internalpost.validate', method: 'validate' },
                { path: 'engine.internalpost.getResult', method: 'getResult' },
            ]
        },
        // PRISM_INTERVAL_ENGINE
        {
            module: 'PRISM_INTERVAL_ENGINE',
            routes: [
                { path: 'engine.interval.calculate', method: 'calculate' },
                { path: 'engine.interval.process', method: 'process' },
                { path: 'engine.interval.run', method: 'run' },
                { path: 'engine.interval.configure', method: 'configure' },
                { path: 'engine.interval.validate', method: 'validate' },
                { path: 'engine.interval.getResult', method: 'getResult' },
            ]
        },
        // PRISM_INVENTORY_ENGINE
        {
            module: 'PRISM_INVENTORY_ENGINE',
            routes: [
                { path: 'engine.inventory.calculate', method: 'calculate' },
                { path: 'engine.inventory.process', method: 'process' },
                { path: 'engine.inventory.run', method: 'run' },
                { path: 'engine.inventory.configure', method: 'configure' },
                { path: 'engine.inventory.validate', method: 'validate' },
                { path: 'engine.inventory.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ISOSURFACE_ENGINE
        {
            module: 'PRISM_ISOSURFACE_ENGINE',
            routes: [
                { path: 'engine.isosurface.calculate', method: 'calculate' },
                { path: 'engine.isosurface.process', method: 'process' },
                { path: 'engine.isosurface.run', method: 'run' },
                { path: 'engine.isosurface.configure', method: 'configure' },
                { path: 'engine.isosurface.validate', method: 'validate' },
                { path: 'engine.isosurface.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ISOTROPIC_REMESHING
        {
            module: 'PRISM_ISOTROPIC_REMESHING',
            routes: [
                { path: 'mesh.isotropicrei.generate', method: 'generate' },
                { path: 'mesh.isotropicrei.refine', method: 'refine' },
                { path: 'mesh.isotropicrei.validate', method: 'validate' },
                { path: 'mesh.isotropicrei.export', method: 'export' },
                { path: 'mesh.isotropicrei.optimize', method: 'optimize' },
                { path: 'mesh.isotropicrei.simplify', method: 'simplify' },
            ]
        },
        // PRISM_JERGENS_DATABASE
        {
            module: 'PRISM_JERGENS_DATABASE',
            routes: [
                { path: 'db.jergens.get', method: 'get' },
                { path: 'db.jergens.list', method: 'list' },
                { path: 'db.jergens.search', method: 'search' },
                { path: 'db.jergens.byId', method: 'byId' },
                { path: 'db.jergens.filter', method: 'filter' },
                { path: 'db.jergens.count', method: 'count' },
            ]
        },
        // PRISM_JOB_COSTING_ENGINE
        {
            module: 'PRISM_JOB_COSTING_ENGINE',
            routes: [
                { path: 'engine.jobcosting.calculate', method: 'calculate' },
                { path: 'engine.jobcosting.process', method: 'process' },
                { path: 'engine.jobcosting.run', method: 'run' },
                { path: 'engine.jobcosting.configure', method: 'configure' },
                { path: 'engine.jobcosting.validate', method: 'validate' },
                { path: 'engine.jobcosting.getResult', method: 'getResult' },
            ]
        },
        // PRISM_JOB_SHOP_SCHEDULING_ENGINE
        {
            module: 'PRISM_JOB_SHOP_SCHEDULING_ENGINE',
            routes: [
                { path: 'engine.jobshopsched.calculate', method: 'calculate' },
                { path: 'engine.jobshopsched.process', method: 'process' },
                { path: 'engine.jobshopsched.run', method: 'run' },
                { path: 'engine.jobshopsched.configure', method: 'configure' },
                { path: 'engine.jobshopsched.validate', method: 'validate' },
                { path: 'engine.jobshopsched.getResult', method: 'getResult' },
            ]
        },
        // PRISM_JOB_TRACKING_ENGINE
        {
            module: 'PRISM_JOB_TRACKING_ENGINE',
            routes: [
                { path: 'engine.jobtracking.calculate', method: 'calculate' },
                { path: 'engine.jobtracking.process', method: 'process' },
                { path: 'engine.jobtracking.run', method: 'run' },
                { path: 'engine.jobtracking.configure', method: 'configure' },
                { path: 'engine.jobtracking.validate', method: 'validate' },
                { path: 'engine.jobtracking.getResult', method: 'getResult' },
            ]
        },
        // PRISM_KALMAN_CONTROLLER
        {
            module: 'PRISM_KALMAN_CONTROLLER',
            routes: [
                { path: 'kalman.controller.init', method: 'init' },
                { path: 'kalman.controller.run', method: 'run' },
                { path: 'kalman.controller.process', method: 'process' },
                { path: 'kalman.controller.get', method: 'get' },
                { path: 'kalman.controller.set', method: 'set' },
                { path: 'kalman.controller.configure', method: 'configure' },
            ]
        },
        // PRISM_KALMAN_FILTER
        {
            module: 'PRISM_KALMAN_FILTER',
            routes: [
                { path: 'kalman.filter.init', method: 'init' },
                { path: 'kalman.filter.run', method: 'run' },
                { path: 'kalman.filter.process', method: 'process' },
                { path: 'kalman.filter.get', method: 'get' },
                { path: 'kalman.filter.set', method: 'set' },
                { path: 'kalman.filter.configure', method: 'configure' },
            ]
        },
        // PRISM_KERNEL_INTEGRATION
        {
            module: 'PRISM_KERNEL_INTEGRATION',
            routes: [
                { path: 'kernel.integration.init', method: 'init' },
                { path: 'kernel.integration.run', method: 'run' },
                { path: 'kernel.integration.process', method: 'process' },
                { path: 'kernel.integration.get', method: 'get' },
                { path: 'kernel.integration.set', method: 'set' },
                { path: 'kernel.integration.configure', method: 'configure' },
            ]
        },
        // PRISM_KINEMATIC_SOLVER
        {
            module: 'PRISM_KINEMATIC_SOLVER',
            routes: [
                { path: 'kin.solver.calculate', method: 'calculate' },
                { path: 'kin.solver.forward', method: 'forward' },
                { path: 'kin.solver.inverse', method: 'inverse' },
                { path: 'kin.solver.jacobian', method: 'jacobian' },
                { path: 'kin.solver.validate', method: 'validate' },
                { path: 'kin.solver.transform', method: 'transform' },
            ]
        },
        // PRISM_KNOWLEDGE_BASE
        {
            module: 'PRISM_KNOWLEDGE_BASE',
            routes: [
                { path: 'knowledg.base.init', method: 'init' },
                { path: 'knowledg.base.run', method: 'run' },
                { path: 'knowledg.base.process', method: 'process' },
                { path: 'knowledg.base.get', method: 'get' },
                { path: 'knowledg.base.set', method: 'set' },
                { path: 'knowledg.base.configure', method: 'configure' },
            ]
        },
        // PRISM_KRIGING_SURFACES
        {
            module: 'PRISM_KRIGING_SURFACES',
            routes: [
                { path: 'geom.krigings.create', method: 'create' },
                { path: 'geom.krigings.evaluate', method: 'evaluate' },
                { path: 'geom.krigings.transform', method: 'transform' },
                { path: 'geom.krigings.validate', method: 'validate' },
                { path: 'geom.krigings.export', method: 'export' },
                { path: 'geom.krigings.analyze', method: 'analyze' },
            ]
        },
        // PRISM_KURT_VISE_DATABASE
        {
            module: 'PRISM_KURT_VISE_DATABASE',
            routes: [
                { path: 'db.kurtvise.get', method: 'get' },
                { path: 'db.kurtvise.list', method: 'list' },
                { path: 'db.kurtvise.search', method: 'search' },
                { path: 'db.kurtvise.byId', method: 'byId' },
                { path: 'db.kurtvise.filter', method: 'filter' },
                { path: 'db.kurtvise.count', method: 'count' },
            ]
        },
        // PRISM_LANG_DATABASE
        {
            module: 'PRISM_LANG_DATABASE',
            routes: [
                { path: 'db.lang.get', method: 'get' },
                { path: 'db.lang.list', method: 'list' },
                { path: 'db.lang.search', method: 'search' },
                { path: 'db.lang.byId', method: 'byId' },
                { path: 'db.lang.filter', method: 'filter' },
                { path: 'db.lang.count', method: 'count' },
            ]
        },
        // PRISM_LATHE_MACHINE_DB
        {
            module: 'PRISM_LATHE_MACHINE_DB',
            routes: [
                { path: 'lathe.machine.init', method: 'init' },
                { path: 'lathe.machine.run', method: 'run' },
                { path: 'lathe.machine.process', method: 'process' },
                { path: 'lathe.machine.get', method: 'get' },
                { path: 'lathe.machine.set', method: 'set' },
                { path: 'lathe.machine.configure', method: 'configure' },
            ]
        },
        // PRISM_LATHE_MANUFACTURER_DATA
        {
            module: 'PRISM_LATHE_MANUFACTURER_DATA',
            routes: [
                { path: 'lathe.manufacturer.init', method: 'init' },
                { path: 'lathe.manufacturer.run', method: 'run' },
                { path: 'lathe.manufacturer.process', method: 'process' },
                { path: 'lathe.manufacturer.get', method: 'get' },
                { path: 'lathe.manufacturer.set', method: 'set' },
                { path: 'lathe.manufacturer.configure', method: 'configure' },
            ]
        },
        // PRISM_LATHE_PARAM_ENGINE
        {
            module: 'PRISM_LATHE_PARAM_ENGINE',
            routes: [
                { path: 'engine.latheparam.calculate', method: 'calculate' },
                { path: 'engine.latheparam.process', method: 'process' },
                { path: 'engine.latheparam.run', method: 'run' },
                { path: 'engine.latheparam.configure', method: 'configure' },
                { path: 'engine.latheparam.validate', method: 'validate' },
                { path: 'engine.latheparam.getResult', method: 'getResult' },
            ]
        },
        // PRISM_LAZY_LOADER
        {
            module: 'PRISM_LAZY_LOADER',
            routes: [
                { path: 'batch.lazy.load', method: 'load' },
                { path: 'batch.lazy.import', method: 'import' },
                { path: 'batch.lazy.process', method: 'process' },
                { path: 'batch.lazy.validate', method: 'validate' },
                { path: 'batch.lazy.getStatus', method: 'getStatus' },
                { path: 'batch.lazy.cancel', method: 'cancel' },
            ]
        },
        // PRISM_LEARNING_FEEDBACK_CONNECTOR
        {
            module: 'PRISM_LEARNING_FEEDBACK_CONNECTOR',
            routes: [
                { path: 'learn.feedbackconn.train', method: 'train' },
                { path: 'learn.feedbackconn.predict', method: 'predict' },
                { path: 'learn.feedbackconn.evaluate', method: 'evaluate' },
                { path: 'learn.feedbackconn.update', method: 'update' },
                { path: 'learn.feedbackconn.export', method: 'export' },
                { path: 'learn.feedbackconn.getModel', method: 'getModel' },
            ]
        },
        // PRISM_LEARNING_RATE_SCHEDULER_ENGINE
        {
            module: 'PRISM_LEARNING_RATE_SCHEDULER_ENGINE',
            routes: [
                { path: 'engine.learningrate.calculate', method: 'calculate' },
                { path: 'engine.learningrate.process', method: 'process' },
                { path: 'engine.learningrate.run', method: 'run' },
                { path: 'engine.learningrate.configure', method: 'configure' },
                { path: 'engine.learningrate.validate', method: 'validate' },
                { path: 'engine.learningrate.getResult', method: 'getResult' },
            ]
        },
        // PRISM_LOCAL_SEARCH
        {
            module: 'PRISM_LOCAL_SEARCH',
            routes: [
                { path: 'local.search.init', method: 'init' },
                { path: 'local.search.run', method: 'run' },
                { path: 'local.search.process', method: 'process' },
                { path: 'local.search.get', method: 'get' },
                { path: 'local.search.set', method: 'set' },
                { path: 'local.search.configure', method: 'configure' },
            ]
        },
        // PRISM_LOD_MANAGER
        {
            module: 'PRISM_LOD_MANAGER',
            routes: [
                { path: 'lod.manager.init', method: 'init' },
                { path: 'lod.manager.run', method: 'run' },
                { path: 'lod.manager.process', method: 'process' },
                { path: 'lod.manager.get', method: 'get' },
                { path: 'lod.manager.set', method: 'set' },
                { path: 'lod.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_LOGGER
        {
            module: 'PRISM_LOGGER',
            routes: [
                { path: 'logger.core.init', method: 'init' },
                { path: 'logger.core.run', method: 'run' },
                { path: 'logger.core.process', method: 'process' },
                { path: 'logger.core.get', method: 'get' },
                { path: 'logger.core.set', method: 'set' },
                { path: 'logger.core.configure', method: 'configure' },
            ]
        },
        // PRISM_LOSS_FUNCTIONS_ENGINE
        {
            module: 'PRISM_LOSS_FUNCTIONS_ENGINE',
            routes: [
                { path: 'engine.lossfunction.calculate', method: 'calculate' },
                { path: 'engine.lossfunction.process', method: 'process' },
                { path: 'engine.lossfunction.run', method: 'run' },
                { path: 'engine.lossfunction.configure', method: 'configure' },
                { path: 'engine.lossfunction.validate', method: 'validate' },
                { path: 'engine.lossfunction.getResult', method: 'getResult' },
            ]
        },
        // PRISM_LP_SOLVERS
        {
            module: 'PRISM_LP_SOLVERS',
            routes: [
                { path: 'lp.solvers.init', method: 'init' },
                { path: 'lp.solvers.run', method: 'run' },
                { path: 'lp.solvers.process', method: 'process' },
                { path: 'lp.solvers.get', method: 'get' },
                { path: 'lp.solvers.set', method: 'set' },
                { path: 'lp.solvers.configure', method: 'configure' },
            ]
        },
        // PRISM_MACHINE_3D_LEARNING_ENGINE
        {
            module: 'PRISM_MACHINE_3D_LEARNING_ENGINE',
            routes: [
                { path: 'engine.machine3dlea.calculate', method: 'calculate' },
                { path: 'engine.machine3dlea.process', method: 'process' },
                { path: 'engine.machine3dlea.run', method: 'run' },
                { path: 'engine.machine3dlea.configure', method: 'configure' },
                { path: 'engine.machine3dlea.validate', method: 'validate' },
                { path: 'engine.machine3dlea.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MACHINE_3D_MODEL_DATABASE_V2
        {
            module: 'PRISM_MACHINE_3D_MODEL_DATABASE_V2',
            routes: [
                { path: 'db.machine3dmod.get', method: 'get' },
                { path: 'db.machine3dmod.list', method: 'list' },
                { path: 'db.machine3dmod.search', method: 'search' },
                { path: 'db.machine3dmod.byId', method: 'byId' },
                { path: 'db.machine3dmod.filter', method: 'filter' },
                { path: 'db.machine3dmod.count', method: 'count' },
            ]
        },
        // PRISM_MACHINE_3D_MODEL_DATABASE_V3
        {
            module: 'PRISM_MACHINE_3D_MODEL_DATABASE_V3',
            routes: [
                { path: 'db.machine3dmod.get', method: 'get' },
                { path: 'db.machine3dmod.list', method: 'list' },
                { path: 'db.machine3dmod.search', method: 'search' },
                { path: 'db.machine3dmod.byId', method: 'byId' },
                { path: 'db.machine3dmod.filter', method: 'filter' },
                { path: 'db.machine3dmod.count', method: 'count' },
            ]
        },
        // PRISM_MACHINE_CAD_CONSTRAINT_LEARNER
        {
            module: 'PRISM_MACHINE_CAD_CONSTRAINT_LEARNER',
            routes: [
                { path: 'learn.machinecadco.train', method: 'train' },
                { path: 'learn.machinecadco.predict', method: 'predict' },
                { path: 'learn.machinecadco.evaluate', method: 'evaluate' },
                { path: 'learn.machinecadco.update', method: 'update' },
                { path: 'learn.machinecadco.export', method: 'export' },
                { path: 'learn.machinecadco.getModel', method: 'getModel' },
            ]
        },
        // PRISM_MACHINE_SPEC_STANDARD
        {
            module: 'PRISM_MACHINE_SPEC_STANDARD',
            routes: [
                { path: 'machine.spec.init', method: 'init' },
                { path: 'machine.spec.run', method: 'run' },
                { path: 'machine.spec.process', method: 'process' },
                { path: 'machine.spec.get', method: 'get' },
                { path: 'machine.spec.set', method: 'set' },
                { path: 'machine.spec.configure', method: 'configure' },
            ]
        },
        // PRISM_MACHINING_PROCESS_DATABASE
        {
            module: 'PRISM_MACHINING_PROCESS_DATABASE',
            routes: [
                { path: 'db.machiningpro.get', method: 'get' },
                { path: 'db.machiningpro.list', method: 'list' },
                { path: 'db.machiningpro.search', method: 'search' },
                { path: 'db.machiningpro.byId', method: 'byId' },
                { path: 'db.machiningpro.filter', method: 'filter' },
                { path: 'db.machiningpro.count', method: 'count' },
            ]
        },
        // PRISM_MAJOR_MANUFACTURERS_CATALOG
        {
            module: 'PRISM_MAJOR_MANUFACTURERS_CATALOG',
            routes: [
                { path: 'major.manufacturer.init', method: 'init' },
                { path: 'major.manufacturer.run', method: 'run' },
                { path: 'major.manufacturer.process', method: 'process' },
                { path: 'major.manufacturer.get', method: 'get' },
                { path: 'major.manufacturer.set', method: 'set' },
                { path: 'major.manufacturer.configure', method: 'configure' },
            ]
        },
        // PRISM_MANUFACTURERS_CATALOG_BATCH2
        {
            module: 'PRISM_MANUFACTURERS_CATALOG_BATCH2',
            routes: [
                { path: 'batch.manufacturer.load', method: 'load' },
                { path: 'batch.manufacturer.import', method: 'import' },
                { path: 'batch.manufacturer.process', method: 'process' },
                { path: 'batch.manufacturer.validate', method: 'validate' },
                { path: 'batch.manufacturer.getStatus', method: 'getStatus' },
                { path: 'batch.manufacturer.cancel', method: 'cancel' },
            ]
        },
        // PRISM_MANUFACTURER_CATALOG_CONSOLIDATED
        {
            module: 'PRISM_MANUFACTURER_CATALOG_CONSOLIDATED',
            routes: [
                { path: 'manufact.catalog.init', method: 'init' },
                { path: 'manufact.catalog.run', method: 'run' },
                { path: 'manufact.catalog.process', method: 'process' },
                { path: 'manufact.catalog.get', method: 'get' },
                { path: 'manufact.catalog.set', method: 'set' },
                { path: 'manufact.catalog.configure', method: 'configure' },
            ]
        },
        // PRISM_MANUFACTURER_CATALOG_DB
        {
            module: 'PRISM_MANUFACTURER_CATALOG_DB',
            routes: [
                { path: 'manufact.catalog.init', method: 'init' },
                { path: 'manufact.catalog.run', method: 'run' },
                { path: 'manufact.catalog.process', method: 'process' },
                { path: 'manufact.catalog.get', method: 'get' },
                { path: 'manufact.catalog.set', method: 'set' },
                { path: 'manufact.catalog.configure', method: 'configure' },
            ]
        },
        // PRISM_MANUFACTURER_LOOKUP
        {
            module: 'PRISM_MANUFACTURER_LOOKUP',
            routes: [
                { path: 'manufact.lookup.init', method: 'init' },
                { path: 'manufact.lookup.run', method: 'run' },
                { path: 'manufact.lookup.process', method: 'process' },
                { path: 'manufact.lookup.get', method: 'get' },
                { path: 'manufact.lookup.set', method: 'set' },
                { path: 'manufact.lookup.configure', method: 'configure' },
            ]
        },
        // PRISM_MANUFACTURING_SEARCH
        {
            module: 'PRISM_MANUFACTURING_SEARCH',
            routes: [
                { path: 'manufact.search.init', method: 'init' },
                { path: 'manufact.search.run', method: 'run' },
                { path: 'manufact.search.process', method: 'process' },
                { path: 'manufact.search.get', method: 'get' },
                { path: 'manufact.search.set', method: 'set' },
                { path: 'manufact.search.configure', method: 'configure' },
            ]
        },
        // PRISM_MANUFACTURING_SEARCH_ENGINE
        {
            module: 'PRISM_MANUFACTURING_SEARCH_ENGINE',
            routes: [
                { path: 'engine.manufacturin.calculate', method: 'calculate' },
                { path: 'engine.manufacturin.process', method: 'process' },
                { path: 'engine.manufacturin.run', method: 'run' },
                { path: 'engine.manufacturin.configure', method: 'configure' },
                { path: 'engine.manufacturin.validate', method: 'validate' },
                { path: 'engine.manufacturin.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MASTER_CAD_CAM_DATABASE
        {
            module: 'PRISM_MASTER_CAD_CAM_DATABASE',
            routes: [
                { path: 'db.mastercadcam.get', method: 'get' },
                { path: 'db.mastercadcam.list', method: 'list' },
                { path: 'db.mastercadcam.search', method: 'search' },
                { path: 'db.mastercadcam.byId', method: 'byId' },
                { path: 'db.mastercadcam.filter', method: 'filter' },
                { path: 'db.mastercadcam.count', method: 'count' },
            ]
        },
        // PRISM_MASTER_DB
        {
            module: 'PRISM_MASTER_DB',
            routes: [
                { path: 'master.db.init', method: 'init' },
                { path: 'master.db.run', method: 'run' },
                { path: 'master.db.process', method: 'process' },
                { path: 'master.db.get', method: 'get' },
                { path: 'master.db.set', method: 'set' },
                { path: 'master.db.configure', method: 'configure' },
            ]
        },
        // PRISM_MASTER_INITIALIZER
        {
            module: 'PRISM_MASTER_INITIALIZER',
            routes: [
                { path: 'master.initializer.init', method: 'init' },
                { path: 'master.initializer.run', method: 'run' },
                { path: 'master.initializer.process', method: 'process' },
                { path: 'master.initializer.get', method: 'get' },
                { path: 'master.initializer.set', method: 'set' },
                { path: 'master.initializer.configure', method: 'configure' },
            ]
        },
        // PRISM_MASTER_ORCHESTRATOR
        {
            module: 'PRISM_MASTER_ORCHESTRATOR',
            routes: [
                { path: 'master.orchestrator.init', method: 'init' },
                { path: 'master.orchestrator.run', method: 'run' },
                { path: 'master.orchestrator.process', method: 'process' },
                { path: 'master.orchestrator.get', method: 'get' },
                { path: 'master.orchestrator.set', method: 'set' },
                { path: 'master.orchestrator.configure', method: 'configure' },
            ]
        },
        // PRISM_MATERIALS_COMPLETE
        {
            module: 'PRISM_MATERIALS_COMPLETE',
            routes: [
                { path: 'data.materials.get', method: 'get' },
                { path: 'data.materials.set', method: 'set' },
                { path: 'data.materials.process', method: 'process' },
                { path: 'data.materials.validate', method: 'validate' },
                { path: 'data.materials.export', method: 'export' },
                { path: 'data.materials.import', method: 'import' },
            ]
        },
        // PRISM_MATERIAL_ALIASES
        {
            module: 'PRISM_MATERIAL_ALIASES',
            routes: [
                { path: 'material.aliases.init', method: 'init' },
                { path: 'material.aliases.run', method: 'run' },
                { path: 'material.aliases.process', method: 'process' },
                { path: 'material.aliases.get', method: 'get' },
                { path: 'material.aliases.set', method: 'set' },
                { path: 'material.aliases.configure', method: 'configure' },
            ]
        },
        // PRISM_MATERIAL_KC_DATABASE
        {
            module: 'PRISM_MATERIAL_KC_DATABASE',
            routes: [
                { path: 'db.materialkc.get', method: 'get' },
                { path: 'db.materialkc.list', method: 'list' },
                { path: 'db.materialkc.search', method: 'search' },
                { path: 'db.materialkc.byId', method: 'byId' },
                { path: 'db.materialkc.filter', method: 'filter' },
                { path: 'db.materialkc.count', method: 'count' },
            ]
        },
        // PRISM_MATERIAL_PHYSICS
        {
            module: 'PRISM_MATERIAL_PHYSICS',
            routes: [
                { path: 'physics.material.calculate', method: 'calculate' },
                { path: 'physics.material.simulate', method: 'simulate' },
                { path: 'physics.material.model', method: 'model' },
                { path: 'physics.material.validate', method: 'validate' },
                { path: 'physics.material.getResult', method: 'getResult' },
                { path: 'physics.material.analyze', method: 'analyze' },
            ]
        },
        // PRISM_MATERIAL_SIMULATION_ENGINE
        {
            module: 'PRISM_MATERIAL_SIMULATION_ENGINE',
            routes: [
                { path: 'engine.materialsimu.calculate', method: 'calculate' },
                { path: 'engine.materialsimu.process', method: 'process' },
                { path: 'engine.materialsimu.run', method: 'run' },
                { path: 'engine.materialsimu.configure', method: 'configure' },
                { path: 'engine.materialsimu.validate', method: 'validate' },
                { path: 'engine.materialsimu.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MEDIAL_AXIS_ENGINE
        {
            module: 'PRISM_MEDIAL_AXIS_ENGINE',
            routes: [
                { path: 'engine.medialaxis.calculate', method: 'calculate' },
                { path: 'engine.medialaxis.process', method: 'process' },
                { path: 'engine.medialaxis.run', method: 'run' },
                { path: 'engine.medialaxis.configure', method: 'configure' },
                { path: 'engine.medialaxis.validate', method: 'validate' },
                { path: 'engine.medialaxis.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MEMORY_EFFICIENT_SEARCH
        {
            module: 'PRISM_MEMORY_EFFICIENT_SEARCH',
            routes: [
                { path: 'memory.efficient.init', method: 'init' },
                { path: 'memory.efficient.run', method: 'run' },
                { path: 'memory.efficient.process', method: 'process' },
                { path: 'memory.efficient.get', method: 'get' },
                { path: 'memory.efficient.set', method: 'set' },
                { path: 'memory.efficient.configure', method: 'configure' },
            ]
        },
        // PRISM_MESH_DECIMATION_ENGINE
        {
            module: 'PRISM_MESH_DECIMATION_ENGINE',
            routes: [
                { path: 'engine.meshdecimati.calculate', method: 'calculate' },
                { path: 'engine.meshdecimati.process', method: 'process' },
                { path: 'engine.meshdecimati.run', method: 'run' },
                { path: 'engine.meshdecimati.configure', method: 'configure' },
                { path: 'engine.meshdecimati.validate', method: 'validate' },
                { path: 'engine.meshdecimati.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MESH_DEFORMATION_ENGINE
        {
            module: 'PRISM_MESH_DEFORMATION_ENGINE',
            routes: [
                { path: 'engine.meshdeformat.calculate', method: 'calculate' },
                { path: 'engine.meshdeformat.process', method: 'process' },
                { path: 'engine.meshdeformat.run', method: 'run' },
                { path: 'engine.meshdeformat.configure', method: 'configure' },
                { path: 'engine.meshdeformat.validate', method: 'validate' },
                { path: 'engine.meshdeformat.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MESH_OPERATIONS
        {
            module: 'PRISM_MESH_OPERATIONS',
            routes: [
                { path: 'mesh.operations.generate', method: 'generate' },
                { path: 'mesh.operations.refine', method: 'refine' },
                { path: 'mesh.operations.validate', method: 'validate' },
                { path: 'mesh.operations.export', method: 'export' },
                { path: 'mesh.operations.optimize', method: 'optimize' },
                { path: 'mesh.operations.simplify', method: 'simplify' },
            ]
        },
        // PRISM_MESH_PARAMETERIZATION
        {
            module: 'PRISM_MESH_PARAMETERIZATION',
            routes: [
                { path: 'mesh.parameteriza.generate', method: 'generate' },
                { path: 'mesh.parameteriza.refine', method: 'refine' },
                { path: 'mesh.parameteriza.validate', method: 'validate' },
                { path: 'mesh.parameteriza.export', method: 'export' },
                { path: 'mesh.parameteriza.optimize', method: 'optimize' },
                { path: 'mesh.parameteriza.simplify', method: 'simplify' },
            ]
        },
        // PRISM_MESH_SEGMENTATION_ENGINE
        {
            module: 'PRISM_MESH_SEGMENTATION_ENGINE',
            routes: [
                { path: 'engine.meshsegmenta.calculate', method: 'calculate' },
                { path: 'engine.meshsegmenta.process', method: 'process' },
                { path: 'engine.meshsegmenta.run', method: 'run' },
                { path: 'engine.meshsegmenta.configure', method: 'configure' },
                { path: 'engine.meshsegmenta.validate', method: 'validate' },
                { path: 'engine.meshsegmenta.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MESH_SMOOTHING
        {
            module: 'PRISM_MESH_SMOOTHING',
            routes: [
                { path: 'mesh.smoothing.generate', method: 'generate' },
                { path: 'mesh.smoothing.refine', method: 'refine' },
                { path: 'mesh.smoothing.validate', method: 'validate' },
                { path: 'mesh.smoothing.export', method: 'export' },
                { path: 'mesh.smoothing.optimize', method: 'optimize' },
                { path: 'mesh.smoothing.simplify', method: 'simplify' },
            ]
        },
        // PRISM_METAHEURISTIC_OPTIMIZATION
        {
            module: 'PRISM_METAHEURISTIC_OPTIMIZATION',
            routes: [
                { path: 'opt.metaheuristi.optimize', method: 'optimize' },
                { path: 'opt.metaheuristi.minimize', method: 'minimize' },
                { path: 'opt.metaheuristi.maximize', method: 'maximize' },
                { path: 'opt.metaheuristi.configure', method: 'configure' },
                { path: 'opt.metaheuristi.pareto', method: 'pareto' },
                { path: 'opt.metaheuristi.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MFG_OPTIMIZATION
        {
            module: 'PRISM_MFG_OPTIMIZATION',
            routes: [
                { path: 'opt.mfg.optimize', method: 'optimize' },
                { path: 'opt.mfg.minimize', method: 'minimize' },
                { path: 'opt.mfg.maximize', method: 'maximize' },
                { path: 'opt.mfg.configure', method: 'configure' },
                { path: 'opt.mfg.pareto', method: 'pareto' },
                { path: 'opt.mfg.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MFG_OPTIMIZATION_ADVANCED
        {
            module: 'PRISM_MFG_OPTIMIZATION_ADVANCED',
            routes: [
                { path: 'opt.mfgadvanced.optimize', method: 'optimize' },
                { path: 'opt.mfgadvanced.minimize', method: 'minimize' },
                { path: 'opt.mfgadvanced.maximize', method: 'maximize' },
                { path: 'opt.mfgadvanced.configure', method: 'configure' },
                { path: 'opt.mfgadvanced.pareto', method: 'pareto' },
                { path: 'opt.mfgadvanced.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MFG_OPTIMIZATION_ADVANCED_B
        {
            module: 'PRISM_MFG_OPTIMIZATION_ADVANCED_B',
            routes: [
                { path: 'opt.mfgadvancedb.optimize', method: 'optimize' },
                { path: 'opt.mfgadvancedb.minimize', method: 'minimize' },
                { path: 'opt.mfgadvancedb.maximize', method: 'maximize' },
                { path: 'opt.mfgadvancedb.configure', method: 'configure' },
                { path: 'opt.mfgadvancedb.pareto', method: 'pareto' },
                { path: 'opt.mfgadvancedb.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MFG_PHYSICS
        {
            module: 'PRISM_MFG_PHYSICS',
            routes: [
                { path: 'physics.mfg.calculate', method: 'calculate' },
                { path: 'physics.mfg.simulate', method: 'simulate' },
                { path: 'physics.mfg.model', method: 'model' },
                { path: 'physics.mfg.validate', method: 'validate' },
                { path: 'physics.mfg.getResult', method: 'getResult' },
                { path: 'physics.mfg.analyze', method: 'analyze' },
            ]
        },
        // PRISM_ML_TRAINING_PATTERNS_DATABASE
        {
            module: 'PRISM_ML_TRAINING_PATTERNS_DATABASE',
            routes: [
                { path: 'db.mltrainingpa.get', method: 'get' },
                { path: 'db.mltrainingpa.list', method: 'list' },
                { path: 'db.mltrainingpa.search', method: 'search' },
                { path: 'db.mltrainingpa.byId', method: 'byId' },
                { path: 'db.mltrainingpa.filter', method: 'filter' },
                { path: 'db.mltrainingpa.count', method: 'count' },
            ]
        },
        // PRISM_MODEL_COMPRESSION_ENGINE
        {
            module: 'PRISM_MODEL_COMPRESSION_ENGINE',
            routes: [
                { path: 'engine.modelcompres.calculate', method: 'calculate' },
                { path: 'engine.modelcompres.process', method: 'process' },
                { path: 'engine.modelcompres.run', method: 'run' },
                { path: 'engine.modelcompres.configure', method: 'configure' },
                { path: 'engine.modelcompres.validate', method: 'validate' },
                { path: 'engine.modelcompres.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MODULE_REGISTRY
        {
            module: 'PRISM_MODULE_REGISTRY',
            routes: [
                { path: 'module.registry.init', method: 'init' },
                { path: 'module.registry.run', method: 'run' },
                { path: 'module.registry.process', method: 'process' },
                { path: 'module.registry.get', method: 'get' },
                { path: 'module.registry.set', method: 'set' },
                { path: 'module.registry.configure', method: 'configure' },
            ]
        },
        // PRISM_MOEAD_ENGINE
        {
            module: 'PRISM_MOEAD_ENGINE',
            routes: [
                { path: 'engine.moead.calculate', method: 'calculate' },
                { path: 'engine.moead.process', method: 'process' },
                { path: 'engine.moead.run', method: 'run' },
                { path: 'engine.moead.configure', method: 'configure' },
                { path: 'engine.moead.validate', method: 'validate' },
                { path: 'engine.moead.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MONTE_CARLO
        {
            module: 'PRISM_MONTE_CARLO',
            routes: [
                { path: 'monte.carlo.init', method: 'init' },
                { path: 'monte.carlo.run', method: 'run' },
                { path: 'monte.carlo.process', method: 'process' },
                { path: 'monte.carlo.get', method: 'get' },
                { path: 'monte.carlo.set', method: 'set' },
                { path: 'monte.carlo.configure', method: 'configure' },
            ]
        },
        // PRISM_MOTION_PLANNING_ENHANCED
        {
            module: 'PRISM_MOTION_PLANNING_ENHANCED',
            routes: [
                { path: 'motion.planning.init', method: 'init' },
                { path: 'motion.planning.run', method: 'run' },
                { path: 'motion.planning.process', method: 'process' },
                { path: 'motion.planning.get', method: 'get' },
                { path: 'motion.planning.set', method: 'set' },
                { path: 'motion.planning.configure', method: 'configure' },
            ]
        },
        // PRISM_MOTION_PLANNING_ENHANCED_ENGINE
        {
            module: 'PRISM_MOTION_PLANNING_ENHANCED_ENGINE',
            routes: [
                { path: 'engine.motionplanni.calculate', method: 'calculate' },
                { path: 'engine.motionplanni.process', method: 'process' },
                { path: 'engine.motionplanni.run', method: 'run' },
                { path: 'engine.motionplanni.configure', method: 'configure' },
                { path: 'engine.motionplanni.validate', method: 'validate' },
                { path: 'engine.motionplanni.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MULTI_OBJECTIVE
        {
            module: 'PRISM_MULTI_OBJECTIVE',
            routes: [
                { path: 'multi.objective.init', method: 'init' },
                { path: 'multi.objective.run', method: 'run' },
                { path: 'multi.objective.process', method: 'process' },
                { path: 'multi.objective.get', method: 'get' },
                { path: 'multi.objective.set', method: 'set' },
                { path: 'multi.objective.configure', method: 'configure' },
            ]
        },
        // PRISM_MULTI_OBJECTIVE_ENGINE
        {
            module: 'PRISM_MULTI_OBJECTIVE_ENGINE',
            routes: [
                { path: 'engine.multiobjecti.calculate', method: 'calculate' },
                { path: 'engine.multiobjecti.process', method: 'process' },
                { path: 'engine.multiobjecti.run', method: 'run' },
                { path: 'engine.multiobjecti.configure', method: 'configure' },
                { path: 'engine.multiobjecti.validate', method: 'validate' },
                { path: 'engine.multiobjecti.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MULTI_OBJECTIVE_OPTIMIZER
        {
            module: 'PRISM_MULTI_OBJECTIVE_OPTIMIZER',
            routes: [
                { path: 'opt.multiobjecti.optimize', method: 'optimize' },
                { path: 'opt.multiobjecti.minimize', method: 'minimize' },
                { path: 'opt.multiobjecti.maximize', method: 'maximize' },
                { path: 'opt.multiobjecti.configure', method: 'configure' },
                { path: 'opt.multiobjecti.pareto', method: 'pareto' },
                { path: 'opt.multiobjecti.getResult', method: 'getResult' },
            ]
        },
        // PRISM_MULTI_OBJECTIVE_SCALARIZATION
        {
            module: 'PRISM_MULTI_OBJECTIVE_SCALARIZATION',
            routes: [
                { path: 'multi.objective.init', method: 'init' },
                { path: 'multi.objective.run', method: 'run' },
                { path: 'multi.objective.process', method: 'process' },
                { path: 'multi.objective.get', method: 'get' },
                { path: 'multi.objective.set', method: 'set' },
                { path: 'multi.objective.configure', method: 'configure' },
            ]
        },
        // PRISM_NN_LAYERS_ADVANCED
        {
            module: 'PRISM_NN_LAYERS_ADVANCED',
            routes: [
                { path: 'adv.nnlayers.process', method: 'process' },
                { path: 'adv.nnlayers.calculate', method: 'calculate' },
                { path: 'adv.nnlayers.optimize', method: 'optimize' },
                { path: 'adv.nnlayers.configure', method: 'configure' },
                { path: 'adv.nnlayers.validate', method: 'validate' },
                { path: 'adv.nnlayers.run', method: 'run' },
            ]
        },
        // PRISM_NORMALIZATION_ENGINE
        {
            module: 'PRISM_NORMALIZATION_ENGINE',
            routes: [
                { path: 'engine.normalizatio.calculate', method: 'calculate' },
                { path: 'engine.normalizatio.process', method: 'process' },
                { path: 'engine.normalizatio.run', method: 'run' },
                { path: 'engine.normalizatio.configure', method: 'configure' },
                { path: 'engine.normalizatio.validate', method: 'validate' },
                { path: 'engine.normalizatio.getResult', method: 'getResult' },
            ]
        },
        // PRISM_NURBS_ADVANCED
        {
            module: 'PRISM_NURBS_ADVANCED',
            routes: [
                { path: 'geom.advanced.create', method: 'create' },
                { path: 'geom.advanced.evaluate', method: 'evaluate' },
                { path: 'geom.advanced.transform', method: 'transform' },
                { path: 'geom.advanced.validate', method: 'validate' },
                { path: 'geom.advanced.export', method: 'export' },
                { path: 'geom.advanced.analyze', method: 'analyze' },
            ]
        },
        // PRISM_NURBS_ADVANCED_ENGINE
        {
            module: 'PRISM_NURBS_ADVANCED_ENGINE',
            routes: [
                { path: 'engine.nurbsadvance.calculate', method: 'calculate' },
                { path: 'engine.nurbsadvance.process', method: 'process' },
                { path: 'engine.nurbsadvance.run', method: 'run' },
                { path: 'engine.nurbsadvance.configure', method: 'configure' },
                { path: 'engine.nurbsadvance.validate', method: 'validate' },
                { path: 'engine.nurbsadvance.getResult', method: 'getResult' },
            ]
        },
        // PRISM_NURBS_ENHANCED
        {
            module: 'PRISM_NURBS_ENHANCED',
            routes: [
                { path: 'geom.enhanced.create', method: 'create' },
                { path: 'geom.enhanced.evaluate', method: 'evaluate' },
                { path: 'geom.enhanced.transform', method: 'transform' },
                { path: 'geom.enhanced.validate', method: 'validate' },
                { path: 'geom.enhanced.export', method: 'export' },
                { path: 'geom.enhanced.analyze', method: 'analyze' },
            ]
        },
        // PRISM_NURBS_LIBRARY
        {
            module: 'PRISM_NURBS_LIBRARY',
            routes: [
                { path: 'geom.library.create', method: 'create' },
                { path: 'geom.library.evaluate', method: 'evaluate' },
                { path: 'geom.library.transform', method: 'transform' },
                { path: 'geom.library.validate', method: 'validate' },
                { path: 'geom.library.export', method: 'export' },
                { path: 'geom.library.analyze', method: 'analyze' },
            ]
        },
        // PRISM_OCCT_KERNEL
        {
            module: 'PRISM_OCCT_KERNEL',
            routes: [
                { path: 'occt.kernel.init', method: 'init' },
                { path: 'occt.kernel.run', method: 'run' },
                { path: 'occt.kernel.process', method: 'process' },
                { path: 'occt.kernel.get', method: 'get' },
                { path: 'occt.kernel.set', method: 'set' },
                { path: 'occt.kernel.configure', method: 'configure' },
            ]
        },
        // PRISM_OCR_ENGINE
        {
            module: 'PRISM_OCR_ENGINE',
            routes: [
                { path: 'engine.ocr.calculate', method: 'calculate' },
                { path: 'engine.ocr.process', method: 'process' },
                { path: 'engine.ocr.run', method: 'run' },
                { path: 'engine.ocr.configure', method: 'configure' },
                { path: 'engine.ocr.validate', method: 'validate' },
                { path: 'engine.ocr.getResult', method: 'getResult' },
            ]
        },
        // PRISM_OFFSET_SURFACE
        {
            module: 'PRISM_OFFSET_SURFACE',
            routes: [
                { path: 'geom.offset.create', method: 'create' },
                { path: 'geom.offset.evaluate', method: 'evaluate' },
                { path: 'geom.offset.transform', method: 'transform' },
                { path: 'geom.offset.validate', method: 'validate' },
                { path: 'geom.offset.export', method: 'export' },
                { path: 'geom.offset.analyze', method: 'analyze' },
            ]
        },
        // PRISM_OFFSET_SURFACE_ENGINE
        {
            module: 'PRISM_OFFSET_SURFACE_ENGINE',
            routes: [
                { path: 'engine.offsetsurfac.calculate', method: 'calculate' },
                { path: 'engine.offsetsurfac.process', method: 'process' },
                { path: 'engine.offsetsurfac.run', method: 'run' },
                { path: 'engine.offsetsurfac.configure', method: 'configure' },
                { path: 'engine.offsetsurfac.validate', method: 'validate' },
                { path: 'engine.offsetsurfac.getResult', method: 'getResult' },
            ]
        },
        // PRISM_OKUMA_LATHE_GCODE_DATABASE
        {
            module: 'PRISM_OKUMA_LATHE_GCODE_DATABASE',
            routes: [
                { path: 'db.okumalathegc.get', method: 'get' },
                { path: 'db.okumalathegc.list', method: 'list' },
                { path: 'db.okumalathegc.search', method: 'search' },
                { path: 'db.okumalathegc.byId', method: 'byId' },
                { path: 'db.okumalathegc.filter', method: 'filter' },
                { path: 'db.okumalathegc.count', method: 'count' },
            ]
        },
        // PRISM_OKUMA_LATHE_MCODE_DATABASE
        {
            module: 'PRISM_OKUMA_LATHE_MCODE_DATABASE',
            routes: [
                { path: 'db.okumalathemc.get', method: 'get' },
                { path: 'db.okumalathemc.list', method: 'list' },
                { path: 'db.okumalathemc.search', method: 'search' },
                { path: 'db.okumalathemc.byId', method: 'byId' },
                { path: 'db.okumalathemc.filter', method: 'filter' },
                { path: 'db.okumalathemc.count', method: 'count' },
            ]
        },
        // PRISM_OKUMA_MACHINE_CAD_DATABASE
        {
            module: 'PRISM_OKUMA_MACHINE_CAD_DATABASE',
            routes: [
                { path: 'db.okumamachine.get', method: 'get' },
                { path: 'db.okumamachine.list', method: 'list' },
                { path: 'db.okumamachine.search', method: 'search' },
                { path: 'db.okumamachine.byId', method: 'byId' },
                { path: 'db.okumamachine.filter', method: 'filter' },
                { path: 'db.okumamachine.count', method: 'count' },
            ]
        },
        // PRISM_OPERATION_PARAMS
        {
            module: 'PRISM_OPERATION_PARAMS',
            routes: [
                { path: 'operatio.params.init', method: 'init' },
                { path: 'operatio.params.run', method: 'run' },
                { path: 'operatio.params.process', method: 'process' },
                { path: 'operatio.params.get', method: 'get' },
                { path: 'operatio.params.set', method: 'set' },
                { path: 'operatio.params.configure', method: 'configure' },
            ]
        },
        // PRISM_OPERATION_PARAM_DATABASE
        {
            module: 'PRISM_OPERATION_PARAM_DATABASE',
            routes: [
                { path: 'db.operationpar.get', method: 'get' },
                { path: 'db.operationpar.list', method: 'list' },
                { path: 'db.operationpar.search', method: 'search' },
                { path: 'db.operationpar.byId', method: 'byId' },
                { path: 'db.operationpar.filter', method: 'filter' },
                { path: 'db.operationpar.count', method: 'count' },
            ]
        },
        // PRISM_OPTIMIZATION_COMPLETE
        {
            module: 'PRISM_OPTIMIZATION_COMPLETE',
            routes: [
                { path: 'opt.complete.optimize', method: 'optimize' },
                { path: 'opt.complete.minimize', method: 'minimize' },
                { path: 'opt.complete.maximize', method: 'maximize' },
                { path: 'opt.complete.configure', method: 'configure' },
                { path: 'opt.complete.pareto', method: 'pareto' },
                { path: 'opt.complete.getResult', method: 'getResult' },
            ]
        },
        // PRISM_OPTIMIZED_MODE
        {
            module: 'PRISM_OPTIMIZED_MODE',
            routes: [
                { path: 'opt.optimizedmod.optimize', method: 'optimize' },
                { path: 'opt.optimizedmod.minimize', method: 'minimize' },
                { path: 'opt.optimizedmod.maximize', method: 'maximize' },
                { path: 'opt.optimizedmod.configure', method: 'configure' },
                { path: 'opt.optimizedmod.pareto', method: 'pareto' },
                { path: 'opt.optimizedmod.getResult', method: 'getResult' },
            ]
        },
        // PRISM_OPTIMIZERS_ENGINE
        {
            module: 'PRISM_OPTIMIZERS_ENGINE',
            routes: [
                { path: 'engine.optimizers.calculate', method: 'calculate' },
                { path: 'engine.optimizers.process', method: 'process' },
                { path: 'engine.optimizers.run', method: 'run' },
                { path: 'engine.optimizers.configure', method: 'configure' },
                { path: 'engine.optimizers.validate', method: 'validate' },
                { path: 'engine.optimizers.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ORDER_MANAGER
        {
            module: 'PRISM_ORDER_MANAGER',
            routes: [
                { path: 'order.manager.init', method: 'init' },
                { path: 'order.manager.run', method: 'run' },
                { path: 'order.manager.process', method: 'process' },
                { path: 'order.manager.get', method: 'get' },
                { path: 'order.manager.set', method: 'set' },
                { path: 'order.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE
        {
            module: 'PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE',
            routes: [
                { path: 'engine.parametricca.calculate', method: 'calculate' },
                { path: 'engine.parametricca.process', method: 'process' },
                { path: 'engine.parametricca.run', method: 'run' },
                { path: 'engine.parametricca.configure', method: 'configure' },
                { path: 'engine.parametricca.validate', method: 'validate' },
                { path: 'engine.parametricca.getResult', method: 'getResult' },
            ]
        },
        // PRISM_PARAMETRIC_CONSTRAINT_SOLVER
        {
            module: 'PRISM_PARAMETRIC_CONSTRAINT_SOLVER',
            routes: [
                { path: 'parametr.constraint.init', method: 'init' },
                { path: 'parametr.constraint.run', method: 'run' },
                { path: 'parametr.constraint.process', method: 'process' },
                { path: 'parametr.constraint.get', method: 'get' },
                { path: 'parametr.constraint.set', method: 'set' },
                { path: 'parametr.constraint.configure', method: 'configure' },
            ]
        },
        // PRISM_PARTICLE_FILTER
        {
            module: 'PRISM_PARTICLE_FILTER',
            routes: [
                { path: 'particle.filter.init', method: 'init' },
                { path: 'particle.filter.run', method: 'run' },
                { path: 'particle.filter.process', method: 'process' },
                { path: 'particle.filter.get', method: 'get' },
                { path: 'particle.filter.set', method: 'set' },
                { path: 'particle.filter.configure', method: 'configure' },
            ]
        },
        // PRISM_PATTERN_ENGINE
        {
            module: 'PRISM_PATTERN_ENGINE',
            routes: [
                { path: 'engine.pattern.calculate', method: 'calculate' },
                { path: 'engine.pattern.process', method: 'process' },
                { path: 'engine.pattern.run', method: 'run' },
                { path: 'engine.pattern.configure', method: 'configure' },
                { path: 'engine.pattern.validate', method: 'validate' },
                { path: 'engine.pattern.getResult', method: 'getResult' },
            ]
        },
        // PRISM_PERSISTENT_HOMOLOGY
        {
            module: 'PRISM_PERSISTENT_HOMOLOGY',
            routes: [
                { path: 'persiste.homology.init', method: 'init' },
                { path: 'persiste.homology.run', method: 'run' },
                { path: 'persiste.homology.process', method: 'process' },
                { path: 'persiste.homology.get', method: 'get' },
                { path: 'persiste.homology.set', method: 'set' },
                { path: 'persiste.homology.configure', method: 'configure' },
            ]
        },
        // PRISM_PIML_CHATTER_ENGINE
        {
            module: 'PRISM_PIML_CHATTER_ENGINE',
            routes: [
                { path: 'engine.pimlchatter.calculate', method: 'calculate' },
                { path: 'engine.pimlchatter.process', method: 'process' },
                { path: 'engine.pimlchatter.run', method: 'run' },
                { path: 'engine.pimlchatter.configure', method: 'configure' },
                { path: 'engine.pimlchatter.validate', method: 'validate' },
                { path: 'engine.pimlchatter.getResult', method: 'getResult' },
            ]
        },
        // PRISM_PLUGIN_MANAGER
        {
            module: 'PRISM_PLUGIN_MANAGER',
            routes: [
                { path: 'plugin.manager.init', method: 'init' },
                { path: 'plugin.manager.run', method: 'run' },
                { path: 'plugin.manager.process', method: 'process' },
                { path: 'plugin.manager.get', method: 'get' },
                { path: 'plugin.manager.set', method: 'set' },
                { path: 'plugin.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_POINT_CLOUD_PROCESSING
        {
            module: 'PRISM_POINT_CLOUD_PROCESSING',
            routes: [
                { path: 'point.cloud.init', method: 'init' },
                { path: 'point.cloud.run', method: 'run' },
                { path: 'point.cloud.process', method: 'process' },
                { path: 'point.cloud.get', method: 'get' },
                { path: 'point.cloud.set', method: 'set' },
                { path: 'point.cloud.configure', method: 'configure' },
            ]
        },
        // PRISM_POLICY_ITERATION_ENGINE
        {
            module: 'PRISM_POLICY_ITERATION_ENGINE',
            routes: [
                { path: 'engine.policyiterat.calculate', method: 'calculate' },
                { path: 'engine.policyiterat.process', method: 'process' },
                { path: 'engine.policyiterat.run', method: 'run' },
                { path: 'engine.policyiterat.configure', method: 'configure' },
                { path: 'engine.policyiterat.validate', method: 'validate' },
                { path: 'engine.policyiterat.getResult', method: 'getResult' },
            ]
        },
        // PRISM_POST_ANALYSIS_AI
        {
            module: 'PRISM_POST_ANALYSIS_AI',
            routes: [
                { path: 'post.analysis.init', method: 'init' },
                { path: 'post.analysis.run', method: 'run' },
                { path: 'post.analysis.process', method: 'process' },
                { path: 'post.analysis.get', method: 'get' },
                { path: 'post.analysis.set', method: 'set' },
                { path: 'post.analysis.configure', method: 'configure' },
            ]
        },
        // PRISM_POST_INTEGRATION_MODULE
        {
            module: 'PRISM_POST_INTEGRATION_MODULE',
            routes: [
                { path: 'post.integration.init', method: 'init' },
                { path: 'post.integration.run', method: 'run' },
                { path: 'post.integration.process', method: 'process' },
                { path: 'post.integration.get', method: 'get' },
                { path: 'post.integration.set', method: 'set' },
                { path: 'post.integration.configure', method: 'configure' },
            ]
        },
        // PRISM_POST_MACHINE_DATABASE
        {
            module: 'PRISM_POST_MACHINE_DATABASE',
            routes: [
                { path: 'db.postmachine.get', method: 'get' },
                { path: 'db.postmachine.list', method: 'list' },
                { path: 'db.postmachine.search', method: 'search' },
                { path: 'db.postmachine.byId', method: 'byId' },
                { path: 'db.postmachine.filter', method: 'filter' },
                { path: 'db.postmachine.count', method: 'count' },
            ]
        },
        // PRISM_POST_OPTIMIZER
        {
            module: 'PRISM_POST_OPTIMIZER',
            routes: [
                { path: 'opt.post.optimize', method: 'optimize' },
                { path: 'opt.post.minimize', method: 'minimize' },
                { path: 'opt.post.maximize', method: 'maximize' },
                { path: 'opt.post.configure', method: 'configure' },
                { path: 'opt.post.pareto', method: 'pareto' },
                { path: 'opt.post.getResult', method: 'getResult' },
            ]
        },
        // PRISM_POST_PROCESSOR_DATABASE_V2
        {
            module: 'PRISM_POST_PROCESSOR_DATABASE_V2',
            routes: [
                { path: 'db.postprocesso.get', method: 'get' },
                { path: 'db.postprocesso.list', method: 'list' },
                { path: 'db.postprocesso.search', method: 'search' },
                { path: 'db.postprocesso.byId', method: 'byId' },
                { path: 'db.postprocesso.filter', method: 'filter' },
                { path: 'db.postprocesso.count', method: 'count' },
            ]
        },
        // PRISM_POST_PROCESSOR_GENERATOR
        {
            module: 'PRISM_POST_PROCESSOR_GENERATOR',
            routes: [
                { path: 'post.processor.init', method: 'init' },
                { path: 'post.processor.run', method: 'run' },
                { path: 'post.processor.process', method: 'process' },
                { path: 'post.processor.get', method: 'get' },
                { path: 'post.processor.set', method: 'set' },
                { path: 'post.processor.configure', method: 'configure' },
            ]
        },
        // PRISM_PRETRAINED_MODELS
        {
            module: 'PRISM_PRETRAINED_MODELS',
            routes: [
                { path: 'pretrain.models.init', method: 'init' },
                { path: 'pretrain.models.run', method: 'run' },
                { path: 'pretrain.models.process', method: 'process' },
                { path: 'pretrain.models.get', method: 'get' },
                { path: 'pretrain.models.set', method: 'set' },
                { path: 'pretrain.models.configure', method: 'configure' },
            ]
        },
        // PRISM_PROBABILISTIC_REASONING_ENGINE
        {
            module: 'PRISM_PROBABILISTIC_REASONING_ENGINE',
            routes: [
                { path: 'engine.probabilisti.calculate', method: 'calculate' },
                { path: 'engine.probabilisti.process', method: 'process' },
                { path: 'engine.probabilisti.run', method: 'run' },
                { path: 'engine.probabilisti.configure', method: 'configure' },
                { path: 'engine.probabilisti.validate', method: 'validate' },
                { path: 'engine.probabilisti.getResult', method: 'getResult' },
            ]
        },
        // PRISM_PRODUCTION_SCHEDULER
        {
            module: 'PRISM_PRODUCTION_SCHEDULER',
            routes: [
                { path: 'producti.scheduler.init', method: 'init' },
                { path: 'producti.scheduler.run', method: 'run' },
                { path: 'producti.scheduler.process', method: 'process' },
                { path: 'producti.scheduler.get', method: 'get' },
                { path: 'producti.scheduler.set', method: 'set' },
                { path: 'producti.scheduler.configure', method: 'configure' },
            ]
        },
        // PRISM_PROGRESS
        {
            module: 'PRISM_PROGRESS',
            routes: [
                { path: 'progress.core.init', method: 'init' },
                { path: 'progress.core.run', method: 'run' },
                { path: 'progress.core.process', method: 'process' },
                { path: 'progress.core.get', method: 'get' },
                { path: 'progress.core.set', method: 'set' },
                { path: 'progress.core.configure', method: 'configure' },
            ]
        },
        // PRISM_QUALITY_MANAGER
        {
            module: 'PRISM_QUALITY_MANAGER',
            routes: [
                { path: 'quality.manager.init', method: 'init' },
                { path: 'quality.manager.run', method: 'run' },
                { path: 'quality.manager.process', method: 'process' },
                { path: 'quality.manager.get', method: 'get' },
                { path: 'quality.manager.set', method: 'set' },
                { path: 'quality.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_QUOTING_LEARNING
        {
            module: 'PRISM_QUOTING_LEARNING',
            routes: [
                { path: 'learn.quoting.train', method: 'train' },
                { path: 'learn.quoting.predict', method: 'predict' },
                { path: 'learn.quoting.evaluate', method: 'evaluate' },
                { path: 'learn.quoting.update', method: 'update' },
                { path: 'learn.quoting.export', method: 'export' },
                { path: 'learn.quoting.getModel', method: 'getModel' },
            ]
        },
        // PRISM_RAPID_PATH_OPTIMIZER
        {
            module: 'PRISM_RAPID_PATH_OPTIMIZER',
            routes: [
                { path: 'opt.rapidpath.optimize', method: 'optimize' },
                { path: 'opt.rapidpath.minimize', method: 'minimize' },
                { path: 'opt.rapidpath.maximize', method: 'maximize' },
                { path: 'opt.rapidpath.configure', method: 'configure' },
                { path: 'opt.rapidpath.pareto', method: 'pareto' },
                { path: 'opt.rapidpath.getResult', method: 'getResult' },
            ]
        },
        // PRISM_REGULARIZATION_ENGINE
        {
            module: 'PRISM_REGULARIZATION_ENGINE',
            routes: [
                { path: 'engine.regularizati.calculate', method: 'calculate' },
                { path: 'engine.regularizati.process', method: 'process' },
                { path: 'engine.regularizati.run', method: 'run' },
                { path: 'engine.regularizati.configure', method: 'configure' },
                { path: 'engine.regularizati.validate', method: 'validate' },
                { path: 'engine.regularizati.getResult', method: 'getResult' },
            ]
        },
        // PRISM_REPORTING_ENGINE
        {
            module: 'PRISM_REPORTING_ENGINE',
            routes: [
                { path: 'engine.reporting.calculate', method: 'calculate' },
                { path: 'engine.reporting.process', method: 'process' },
                { path: 'engine.reporting.run', method: 'run' },
                { path: 'engine.reporting.configure', method: 'configure' },
                { path: 'engine.reporting.validate', method: 'validate' },
                { path: 'engine.reporting.getResult', method: 'getResult' },
            ]
        },
        // PRISM_REPORT_TEMPLATES_DATABASE
        {
            module: 'PRISM_REPORT_TEMPLATES_DATABASE',
            routes: [
                { path: 'db.reporttempla.get', method: 'get' },
                { path: 'db.reporttempla.list', method: 'list' },
                { path: 'db.reporttempla.search', method: 'search' },
                { path: 'db.reporttempla.byId', method: 'byId' },
                { path: 'db.reporttempla.filter', method: 'filter' },
                { path: 'db.reporttempla.count', method: 'count' },
            ]
        },
        // PRISM_REST_MACHINING_ENGINE
        {
            module: 'PRISM_REST_MACHINING_ENGINE',
            routes: [
                { path: 'engine.restmachinin.calculate', method: 'calculate' },
                { path: 'engine.restmachinin.process', method: 'process' },
                { path: 'engine.restmachinin.run', method: 'run' },
                { path: 'engine.restmachinin.configure', method: 'configure' },
                { path: 'engine.restmachinin.validate', method: 'validate' },
                { path: 'engine.restmachinin.getResult', method: 'getResult' },
            ]
        },
        // PRISM_RIGID_BODY_DYNAMICS_ENGINE
        {
            module: 'PRISM_RIGID_BODY_DYNAMICS_ENGINE',
            routes: [
                { path: 'engine.rigidbodydyn.calculate', method: 'calculate' },
                { path: 'engine.rigidbodydyn.process', method: 'process' },
                { path: 'engine.rigidbodydyn.run', method: 'run' },
                { path: 'engine.rigidbodydyn.configure', method: 'configure' },
                { path: 'engine.rigidbodydyn.validate', method: 'validate' },
                { path: 'engine.rigidbodydyn.getResult', method: 'getResult' },
            ]
        },
        // PRISM_RL_SARSA_ENGINE
        {
            module: 'PRISM_RL_SARSA_ENGINE',
            routes: [
                { path: 'engine.rlsarsa.calculate', method: 'calculate' },
                { path: 'engine.rlsarsa.process', method: 'process' },
                { path: 'engine.rlsarsa.run', method: 'run' },
                { path: 'engine.rlsarsa.configure', method: 'configure' },
                { path: 'engine.rlsarsa.validate', method: 'validate' },
                { path: 'engine.rlsarsa.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ROBUST_OPTIMIZATION
        {
            module: 'PRISM_ROBUST_OPTIMIZATION',
            routes: [
                { path: 'opt.robust.optimize', method: 'optimize' },
                { path: 'opt.robust.minimize', method: 'minimize' },
                { path: 'opt.robust.maximize', method: 'maximize' },
                { path: 'opt.robust.configure', method: 'configure' },
                { path: 'opt.robust.pareto', method: 'pareto' },
                { path: 'opt.robust.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SAFETY
        {
            module: 'PRISM_SAFETY',
            routes: [
                { path: 'safety.core.init', method: 'init' },
                { path: 'safety.core.run', method: 'run' },
                { path: 'safety.core.process', method: 'process' },
                { path: 'safety.core.get', method: 'get' },
                { path: 'safety.core.set', method: 'set' },
                { path: 'safety.core.configure', method: 'configure' },
            ]
        },
        // PRISM_SANITIZER
        {
            module: 'PRISM_SANITIZER',
            routes: [
                { path: 'sanitize.core.init', method: 'init' },
                { path: 'sanitize.core.run', method: 'run' },
                { path: 'sanitize.core.process', method: 'process' },
                { path: 'sanitize.core.get', method: 'get' },
                { path: 'sanitize.core.set', method: 'set' },
                { path: 'sanitize.core.configure', method: 'configure' },
            ]
        },
        // PRISM_SCHEDULER
        {
            module: 'PRISM_SCHEDULER',
            routes: [
                { path: 'schedule.core.init', method: 'init' },
                { path: 'schedule.core.run', method: 'run' },
                { path: 'schedule.core.process', method: 'process' },
                { path: 'schedule.core.get', method: 'get' },
                { path: 'schedule.core.set', method: 'set' },
                { path: 'schedule.core.configure', method: 'configure' },
            ]
        },
        // PRISM_SCHUNK_DATABASE
        {
            module: 'PRISM_SCHUNK_DATABASE',
            routes: [
                { path: 'db.schunk.get', method: 'get' },
                { path: 'db.schunk.list', method: 'list' },
                { path: 'db.schunk.search', method: 'search' },
                { path: 'db.schunk.byId', method: 'byId' },
                { path: 'db.schunk.filter', method: 'filter' },
                { path: 'db.schunk.count', method: 'count' },
            ]
        },
        // PRISM_SCHUNK_TOOLHOLDER_DATABASE
        {
            module: 'PRISM_SCHUNK_TOOLHOLDER_DATABASE',
            routes: [
                { path: 'db.schunktoolho.get', method: 'get' },
                { path: 'db.schunktoolho.list', method: 'list' },
                { path: 'db.schunktoolho.search', method: 'search' },
                { path: 'db.schunktoolho.byId', method: 'byId' },
                { path: 'db.schunktoolho.filter', method: 'filter' },
                { path: 'db.schunktoolho.count', method: 'count' },
            ]
        },
        // PRISM_SDF_ENGINE
        {
            module: 'PRISM_SDF_ENGINE',
            routes: [
                { path: 'engine.sdf.calculate', method: 'calculate' },
                { path: 'engine.sdf.process', method: 'process' },
                { path: 'engine.sdf.run', method: 'run' },
                { path: 'engine.sdf.configure', method: 'configure' },
                { path: 'engine.sdf.validate', method: 'validate' },
                { path: 'engine.sdf.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SEARCH_ENHANCED
        {
            module: 'PRISM_SEARCH_ENHANCED',
            routes: [
                { path: 'search.enhanced.init', method: 'init' },
                { path: 'search.enhanced.run', method: 'run' },
                { path: 'search.enhanced.process', method: 'process' },
                { path: 'search.enhanced.get', method: 'get' },
                { path: 'search.enhanced.set', method: 'set' },
                { path: 'search.enhanced.configure', method: 'configure' },
            ]
        },
        // PRISM_SEARCH_ENHANCED_ENGINE
        {
            module: 'PRISM_SEARCH_ENHANCED_ENGINE',
            routes: [
                { path: 'engine.searchenhanc.calculate', method: 'calculate' },
                { path: 'engine.searchenhanc.process', method: 'process' },
                { path: 'engine.searchenhanc.run', method: 'run' },
                { path: 'engine.searchenhanc.configure', method: 'configure' },
                { path: 'engine.searchenhanc.validate', method: 'validate' },
                { path: 'engine.searchenhanc.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SEQUENCE_MODEL_ENGINE
        {
            module: 'PRISM_SEQUENCE_MODEL_ENGINE',
            routes: [
                { path: 'engine.sequencemode.calculate', method: 'calculate' },
                { path: 'engine.sequencemode.process', method: 'process' },
                { path: 'engine.sequencemode.run', method: 'run' },
                { path: 'engine.sequencemode.configure', method: 'configure' },
                { path: 'engine.sequencemode.validate', method: 'validate' },
                { path: 'engine.sequencemode.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SERVICE_WORKER
        {
            module: 'PRISM_SERVICE_WORKER',
            routes: [
                { path: 'service.worker.init', method: 'init' },
                { path: 'service.worker.run', method: 'run' },
                { path: 'service.worker.process', method: 'process' },
                { path: 'service.worker.get', method: 'get' },
                { path: 'service.worker.set', method: 'set' },
                { path: 'service.worker.configure', method: 'configure' },
            ]
        },
        // PRISM_SESSION5_EXTENDED_V3_TESTS
        {
            module: 'PRISM_SESSION5_EXTENDED_V3_TESTS',
            routes: [
                { path: 'session5.extended.init', method: 'init' },
                { path: 'session5.extended.run', method: 'run' },
                { path: 'session5.extended.process', method: 'process' },
                { path: 'session5.extended.get', method: 'get' },
                { path: 'session5.extended.set', method: 'set' },
                { path: 'session5.extended.configure', method: 'configure' },
            ]
        },
        // PRISM_SHAPE_DESCRIPTOR_ENGINE
        {
            module: 'PRISM_SHAPE_DESCRIPTOR_ENGINE',
            routes: [
                { path: 'engine.shapedescrip.calculate', method: 'calculate' },
                { path: 'engine.shapedescrip.process', method: 'process' },
                { path: 'engine.shapedescrip.run', method: 'run' },
                { path: 'engine.shapedescrip.configure', method: 'configure' },
                { path: 'engine.shapedescrip.validate', method: 'validate' },
                { path: 'engine.shapedescrip.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SHAPE_DIAMETER_FUNCTION
        {
            module: 'PRISM_SHAPE_DIAMETER_FUNCTION',
            routes: [
                { path: 'shape.diameter.init', method: 'init' },
                { path: 'shape.diameter.run', method: 'run' },
                { path: 'shape.diameter.process', method: 'process' },
                { path: 'shape.diameter.get', method: 'get' },
                { path: 'shape.diameter.set', method: 'set' },
                { path: 'shape.diameter.configure', method: 'configure' },
            ]
        },
        // PRISM_SHOP_LEARNING_ENGINE
        {
            module: 'PRISM_SHOP_LEARNING_ENGINE',
            routes: [
                { path: 'engine.shoplearning.calculate', method: 'calculate' },
                { path: 'engine.shoplearning.process', method: 'process' },
                { path: 'engine.shoplearning.run', method: 'run' },
                { path: 'engine.shoplearning.configure', method: 'configure' },
                { path: 'engine.shoplearning.validate', method: 'validate' },
                { path: 'engine.shoplearning.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SHOP_OPTIMIZER
        {
            module: 'PRISM_SHOP_OPTIMIZER',
            routes: [
                { path: 'opt.shop.optimize', method: 'optimize' },
                { path: 'opt.shop.minimize', method: 'minimize' },
                { path: 'opt.shop.maximize', method: 'maximize' },
                { path: 'opt.shop.configure', method: 'configure' },
                { path: 'opt.shop.pareto', method: 'pareto' },
                { path: 'opt.shop.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SHORTCUTS
        {
            module: 'PRISM_SHORTCUTS',
            routes: [
                { path: 'shortcut.core.init', method: 'init' },
                { path: 'shortcut.core.run', method: 'run' },
                { path: 'shortcut.core.process', method: 'process' },
                { path: 'shortcut.core.get', method: 'get' },
                { path: 'shortcut.core.set', method: 'set' },
                { path: 'shortcut.core.configure', method: 'configure' },
            ]
        },
        // PRISM_SIEMENS_5AXIS_CAM_ENGINE
        {
            module: 'PRISM_SIEMENS_5AXIS_CAM_ENGINE',
            routes: [
                { path: 'engine.siemens5axis.calculate', method: 'calculate' },
                { path: 'engine.siemens5axis.process', method: 'process' },
                { path: 'engine.siemens5axis.run', method: 'run' },
                { path: 'engine.siemens5axis.configure', method: 'configure' },
                { path: 'engine.siemens5axis.validate', method: 'validate' },
                { path: 'engine.siemens5axis.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SILHOUETTE_ENGINE
        {
            module: 'PRISM_SILHOUETTE_ENGINE',
            routes: [
                { path: 'engine.silhouette.calculate', method: 'calculate' },
                { path: 'engine.silhouette.process', method: 'process' },
                { path: 'engine.silhouette.run', method: 'run' },
                { path: 'engine.silhouette.configure', method: 'configure' },
                { path: 'engine.silhouette.validate', method: 'validate' },
                { path: 'engine.silhouette.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SKETCH_ENGINE
        {
            module: 'PRISM_SKETCH_ENGINE',
            routes: [
                { path: 'engine.sketch.calculate', method: 'calculate' },
                { path: 'engine.sketch.process', method: 'process' },
                { path: 'engine.sketch.run', method: 'run' },
                { path: 'engine.sketch.configure', method: 'configure' },
                { path: 'engine.sketch.validate', method: 'validate' },
                { path: 'engine.sketch.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SOLID_EDITING_ENGINE
        {
            module: 'PRISM_SOLID_EDITING_ENGINE',
            routes: [
                { path: 'engine.solidediting.calculate', method: 'calculate' },
                { path: 'engine.solidediting.process', method: 'process' },
                { path: 'engine.solidediting.run', method: 'run' },
                { path: 'engine.solidediting.configure', method: 'configure' },
                { path: 'engine.solidediting.validate', method: 'validate' },
                { path: 'engine.solidediting.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SPECTRAL_GRAPH_CAD
        {
            module: 'PRISM_SPECTRAL_GRAPH_CAD',
            routes: [
                { path: 'cad.spectralgrap.create', method: 'create' },
                { path: 'cad.spectralgrap.modify', method: 'modify' },
                { path: 'cad.spectralgrap.evaluate', method: 'evaluate' },
                { path: 'cad.spectralgrap.validate', method: 'validate' },
                { path: 'cad.spectralgrap.export', method: 'export' },
                { path: 'cad.spectralgrap.import', method: 'import' },
            ]
        },
        // PRISM_SQP_INTERIOR_POINT_ENGINE
        {
            module: 'PRISM_SQP_INTERIOR_POINT_ENGINE',
            routes: [
                { path: 'engine.sqpinteriorp.calculate', method: 'calculate' },
                { path: 'engine.sqpinteriorp.process', method: 'process' },
                { path: 'engine.sqpinteriorp.run', method: 'run' },
                { path: 'engine.sqpinteriorp.configure', method: 'configure' },
                { path: 'engine.sqpinteriorp.validate', method: 'validate' },
                { path: 'engine.sqpinteriorp.getResult', method: 'getResult' },
            ]
        },
        // PRISM_STATE
        {
            module: 'PRISM_STATE',
            routes: [
                { path: 'state.core.init', method: 'init' },
                { path: 'state.core.run', method: 'run' },
                { path: 'state.core.process', method: 'process' },
                { path: 'state.core.get', method: 'get' },
                { path: 'state.core.set', method: 'set' },
                { path: 'state.core.configure', method: 'configure' },
            ]
        },
        // PRISM_STATE_STORE
        {
            module: 'PRISM_STATE_STORE',
            routes: [
                { path: 'state.store.init', method: 'init' },
                { path: 'state.store.run', method: 'run' },
                { path: 'state.store.process', method: 'process' },
                { path: 'state.store.get', method: 'get' },
                { path: 'state.store.set', method: 'set' },
                { path: 'state.store.configure', method: 'configure' },
            ]
        },
        // PRISM_STEEL_ENDMILL_DB_V2
        {
            module: 'PRISM_STEEL_ENDMILL_DB_V2',
            routes: [
                { path: 'steel.endmill.init', method: 'init' },
                { path: 'steel.endmill.run', method: 'run' },
                { path: 'steel.endmill.process', method: 'process' },
                { path: 'steel.endmill.get', method: 'get' },
                { path: 'steel.endmill.set', method: 'set' },
                { path: 'steel.endmill.configure', method: 'configure' },
            ]
        },
        // PRISM_STEP_PARSER_ENHANCED
        {
            module: 'PRISM_STEP_PARSER_ENHANCED',
            routes: [
                { path: 'step.parser.init', method: 'init' },
                { path: 'step.parser.run', method: 'run' },
                { path: 'step.parser.process', method: 'process' },
                { path: 'step.parser.get', method: 'get' },
                { path: 'step.parser.set', method: 'set' },
                { path: 'step.parser.configure', method: 'configure' },
            ]
        },
        // PRISM_STOCK_POSITIONS_DATABASE
        {
            module: 'PRISM_STOCK_POSITIONS_DATABASE',
            routes: [
                { path: 'db.stockpositio.get', method: 'get' },
                { path: 'db.stockpositio.list', method: 'list' },
                { path: 'db.stockpositio.search', method: 'search' },
                { path: 'db.stockpositio.byId', method: 'byId' },
                { path: 'db.stockpositio.filter', method: 'filter' },
                { path: 'db.stockpositio.count', method: 'count' },
            ]
        },
        // PRISM_STRATEGY_SELECTOR
        {
            module: 'PRISM_STRATEGY_SELECTOR',
            routes: [
                { path: 'strategy.selector.init', method: 'init' },
                { path: 'strategy.selector.run', method: 'run' },
                { path: 'strategy.selector.process', method: 'process' },
                { path: 'strategy.selector.get', method: 'get' },
                { path: 'strategy.selector.set', method: 'set' },
                { path: 'strategy.selector.configure', method: 'configure' },
            ]
        },
        // PRISM_STRUCTURAL_MECHANICS
        {
            module: 'PRISM_STRUCTURAL_MECHANICS',
            routes: [
                { path: 'structur.mechanics.init', method: 'init' },
                { path: 'structur.mechanics.run', method: 'run' },
                { path: 'structur.mechanics.process', method: 'process' },
                { path: 'structur.mechanics.get', method: 'get' },
                { path: 'structur.mechanics.set', method: 'set' },
                { path: 'structur.mechanics.configure', method: 'configure' },
            ]
        },
        // PRISM_STRUCTURE_CHANGELOG
        {
            module: 'PRISM_STRUCTURE_CHANGELOG',
            routes: [
                { path: 'structur.changelog.init', method: 'init' },
                { path: 'structur.changelog.run', method: 'run' },
                { path: 'structur.changelog.process', method: 'process' },
                { path: 'structur.changelog.get', method: 'get' },
                { path: 'structur.changelog.set', method: 'set' },
                { path: 'structur.changelog.configure', method: 'configure' },
            ]
        },
        // PRISM_SUBDIVISION_SURFACES
        {
            module: 'PRISM_SUBDIVISION_SURFACES',
            routes: [
                { path: 'geom.subdivisions.create', method: 'create' },
                { path: 'geom.subdivisions.evaluate', method: 'evaluate' },
                { path: 'geom.subdivisions.transform', method: 'transform' },
                { path: 'geom.subdivisions.validate', method: 'validate' },
                { path: 'geom.subdivisions.export', method: 'export' },
                { path: 'geom.subdivisions.analyze', method: 'analyze' },
            ]
        },
        // PRISM_SURFACE_CURVATURE_UNIFIED
        {
            module: 'PRISM_SURFACE_CURVATURE_UNIFIED',
            routes: [
                { path: 'geom.curvatureuni.create', method: 'create' },
                { path: 'geom.curvatureuni.evaluate', method: 'evaluate' },
                { path: 'geom.curvatureuni.transform', method: 'transform' },
                { path: 'geom.curvatureuni.validate', method: 'validate' },
                { path: 'geom.curvatureuni.export', method: 'export' },
                { path: 'geom.curvatureuni.analyze', method: 'analyze' },
            ]
        },
        // PRISM_SURFACE_FINISH_DATABASE
        {
            module: 'PRISM_SURFACE_FINISH_DATABASE',
            routes: [
                { path: 'db.surfacefinis.get', method: 'get' },
                { path: 'db.surfacefinis.list', method: 'list' },
                { path: 'db.surfacefinis.search', method: 'search' },
                { path: 'db.surfacefinis.byId', method: 'byId' },
                { path: 'db.surfacefinis.filter', method: 'filter' },
                { path: 'db.surfacefinis.count', method: 'count' },
            ]
        },
        // PRISM_SURFACE_INTERSECTION_ENGINE
        {
            module: 'PRISM_SURFACE_INTERSECTION_ENGINE',
            routes: [
                { path: 'engine.surfaceinter.calculate', method: 'calculate' },
                { path: 'engine.surfaceinter.process', method: 'process' },
                { path: 'engine.surfaceinter.run', method: 'run' },
                { path: 'engine.surfaceinter.configure', method: 'configure' },
                { path: 'engine.surfaceinter.validate', method: 'validate' },
                { path: 'engine.surfaceinter.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SURFACE_RECONSTRUCTION_ENGINE
        {
            module: 'PRISM_SURFACE_RECONSTRUCTION_ENGINE',
            routes: [
                { path: 'engine.surfacerecon.calculate', method: 'calculate' },
                { path: 'engine.surfacerecon.process', method: 'process' },
                { path: 'engine.surfacerecon.run', method: 'run' },
                { path: 'engine.surfacerecon.configure', method: 'configure' },
                { path: 'engine.surfacerecon.validate', method: 'validate' },
                { path: 'engine.surfacerecon.getResult', method: 'getResult' },
            ]
        },
        // PRISM_SYMMETRY_DETECTION
        {
            module: 'PRISM_SYMMETRY_DETECTION',
            routes: [
                { path: 'symmetry.detection.init', method: 'init' },
                { path: 'symmetry.detection.run', method: 'run' },
                { path: 'symmetry.detection.process', method: 'process' },
                { path: 'symmetry.detection.get', method: 'get' },
                { path: 'symmetry.detection.set', method: 'set' },
                { path: 'symmetry.detection.configure', method: 'configure' },
            ]
        },
        // PRISM_TAYLOR_LOOKUP
        {
            module: 'PRISM_TAYLOR_LOOKUP',
            routes: [
                { path: 'taylor.lookup.init', method: 'init' },
                { path: 'taylor.lookup.run', method: 'run' },
                { path: 'taylor.lookup.process', method: 'process' },
                { path: 'taylor.lookup.get', method: 'get' },
                { path: 'taylor.lookup.set', method: 'set' },
                { path: 'taylor.lookup.configure', method: 'configure' },
            ]
        },
        // PRISM_TDM_TOOL_MANAGEMENT_DATABASE
        {
            module: 'PRISM_TDM_TOOL_MANAGEMENT_DATABASE',
            routes: [
                { path: 'db.tdmtoolmanag.get', method: 'get' },
                { path: 'db.tdmtoolmanag.list', method: 'list' },
                { path: 'db.tdmtoolmanag.search', method: 'search' },
                { path: 'db.tdmtoolmanag.byId', method: 'byId' },
                { path: 'db.tdmtoolmanag.filter', method: 'filter' },
                { path: 'db.tdmtoolmanag.count', method: 'count' },
            ]
        },
        // PRISM_THEME_MANAGER
        {
            module: 'PRISM_THEME_MANAGER',
            routes: [
                { path: 'theme.manager.init', method: 'init' },
                { path: 'theme.manager.run', method: 'run' },
                { path: 'theme.manager.process', method: 'process' },
                { path: 'theme.manager.get', method: 'get' },
                { path: 'theme.manager.set', method: 'set' },
                { path: 'theme.manager.configure', method: 'configure' },
            ]
        },
        // PRISM_THERMAL_EXPANSION_ENGINE
        {
            module: 'PRISM_THERMAL_EXPANSION_ENGINE',
            routes: [
                { path: 'engine.thermalexpan.calculate', method: 'calculate' },
                { path: 'engine.thermalexpan.process', method: 'process' },
                { path: 'engine.thermalexpan.run', method: 'run' },
                { path: 'engine.thermalexpan.configure', method: 'configure' },
                { path: 'engine.thermalexpan.validate', method: 'validate' },
                { path: 'engine.thermalexpan.getResult', method: 'getResult' },
            ]
        },
        // PRISM_THERMAL_MODELING
        {
            module: 'PRISM_THERMAL_MODELING',
            routes: [
                { path: 'physics.modeling.calculate', method: 'calculate' },
                { path: 'physics.modeling.simulate', method: 'simulate' },
                { path: 'physics.modeling.model', method: 'model' },
                { path: 'physics.modeling.validate', method: 'validate' },
                { path: 'physics.modeling.getResult', method: 'getResult' },
                { path: 'physics.modeling.analyze', method: 'analyze' },
            ]
        },
        // PRISM_THREAD_INTELLIGENCE_ENGINE
        {
            module: 'PRISM_THREAD_INTELLIGENCE_ENGINE',
            routes: [
                { path: 'engine.threadintell.calculate', method: 'calculate' },
                { path: 'engine.threadintell.process', method: 'process' },
                { path: 'engine.threadintell.run', method: 'run' },
                { path: 'engine.threadintell.configure', method: 'configure' },
                { path: 'engine.threadintell.validate', method: 'validate' },
                { path: 'engine.threadintell.getResult', method: 'getResult' },
            ]
        },
        // PRISM_THREAD_STANDARD_DATABASE
        {
            module: 'PRISM_THREAD_STANDARD_DATABASE',
            routes: [
                { path: 'db.threadstanda.get', method: 'get' },
                { path: 'db.threadstanda.list', method: 'list' },
                { path: 'db.threadstanda.search', method: 'search' },
                { path: 'db.threadstanda.byId', method: 'byId' },
                { path: 'db.threadstanda.filter', method: 'filter' },
                { path: 'db.threadstanda.count', method: 'count' },
            ]
        },
        // PRISM_TOAST
        {
            module: 'PRISM_TOAST',
            routes: [
                { path: 'toast.core.init', method: 'init' },
                { path: 'toast.core.run', method: 'run' },
                { path: 'toast.core.process', method: 'process' },
                { path: 'toast.core.get', method: 'get' },
                { path: 'toast.core.set', method: 'set' },
                { path: 'toast.core.configure', method: 'configure' },
            ]
        },
        // PRISM_TOOLS
        {
            module: 'PRISM_TOOLS',
            routes: [
                { path: 'tools.core.init', method: 'init' },
                { path: 'tools.core.run', method: 'run' },
                { path: 'tools.core.process', method: 'process' },
                { path: 'tools.core.get', method: 'get' },
                { path: 'tools.core.set', method: 'set' },
                { path: 'tools.core.configure', method: 'configure' },
            ]
        },
        // PRISM_TOOL_3D_GENERATOR
        {
            module: 'PRISM_TOOL_3D_GENERATOR',
            routes: [
                { path: 'viz3d.toolgenerato.render', method: 'render' },
                { path: 'viz3d.toolgenerato.update', method: 'update' },
                { path: 'viz3d.toolgenerato.configure', method: 'configure' },
                { path: 'viz3d.toolgenerato.export', method: 'export' },
                { path: 'viz3d.toolgenerato.animate', method: 'animate' },
                { path: 'viz3d.toolgenerato.transform', method: 'transform' },
            ]
        },
        // PRISM_TOOL_3D_GENERATOR_EXTENSION
        {
            module: 'PRISM_TOOL_3D_GENERATOR_EXTENSION',
            routes: [
                { path: 'viz3d.toolgenerato.render', method: 'render' },
                { path: 'viz3d.toolgenerato.update', method: 'update' },
                { path: 'viz3d.toolgenerato.configure', method: 'configure' },
                { path: 'viz3d.toolgenerato.export', method: 'export' },
                { path: 'viz3d.toolgenerato.animate', method: 'animate' },
                { path: 'viz3d.toolgenerato.transform', method: 'transform' },
            ]
        },
        // PRISM_TOOL_3D_GENERATOR_EXTENSION_V2
        {
            module: 'PRISM_TOOL_3D_GENERATOR_EXTENSION_V2',
            routes: [
                { path: 'viz3d.toolgenerato.render', method: 'render' },
                { path: 'viz3d.toolgenerato.update', method: 'update' },
                { path: 'viz3d.toolgenerato.configure', method: 'configure' },
                { path: 'viz3d.toolgenerato.export', method: 'export' },
                { path: 'viz3d.toolgenerato.animate', method: 'animate' },
                { path: 'viz3d.toolgenerato.transform', method: 'transform' },
            ]
        },
        // PRISM_TOOL_DATABASE_V7
        {
            module: 'PRISM_TOOL_DATABASE_V7',
            routes: [
                { path: 'db.toolv7.get', method: 'get' },
                { path: 'db.toolv7.list', method: 'list' },
                { path: 'db.toolv7.search', method: 'search' },
                { path: 'db.toolv7.byId', method: 'byId' },
                { path: 'db.toolv7.filter', method: 'filter' },
                { path: 'db.toolv7.count', method: 'count' },
            ]
        },
        // PRISM_TOOL_LIFE_ENGINE
        {
            module: 'PRISM_TOOL_LIFE_ENGINE',
            routes: [
                { path: 'engine.toollife.calculate', method: 'calculate' },
                { path: 'engine.toollife.process', method: 'process' },
                { path: 'engine.toollife.run', method: 'run' },
                { path: 'engine.toollife.configure', method: 'configure' },
                { path: 'engine.toollife.validate', method: 'validate' },
                { path: 'engine.toollife.getResult', method: 'getResult' },
            ]
        },
        // PRISM_TOOL_LIFE_ESTIMATOR
        {
            module: 'PRISM_TOOL_LIFE_ESTIMATOR',
            routes: [
                { path: 'tool.life.init', method: 'init' },
                { path: 'tool.life.run', method: 'run' },
                { path: 'tool.life.process', method: 'process' },
                { path: 'tool.life.get', method: 'get' },
                { path: 'tool.life.set', method: 'set' },
                { path: 'tool.life.configure', method: 'configure' },
            ]
        },
        // PRISM_TOOL_PROPERTIES_DATABASE
        {
            module: 'PRISM_TOOL_PROPERTIES_DATABASE',
            routes: [
                { path: 'db.toolproperti.get', method: 'get' },
                { path: 'db.toolproperti.list', method: 'list' },
                { path: 'db.toolproperti.search', method: 'search' },
                { path: 'db.toolproperti.byId', method: 'byId' },
                { path: 'db.toolproperti.filter', method: 'filter' },
                { path: 'db.toolproperti.count', method: 'count' },
            ]
        },
        // PRISM_TOOL_WEAR_MODELS
        {
            module: 'PRISM_TOOL_WEAR_MODELS',
            routes: [
                { path: 'tool.wear.init', method: 'init' },
                { path: 'tool.wear.run', method: 'run' },
                { path: 'tool.wear.process', method: 'process' },
                { path: 'tool.wear.get', method: 'get' },
                { path: 'tool.wear.set', method: 'set' },
                { path: 'tool.wear.configure', method: 'configure' },
            ]
        },
        // PRISM_TOPOLOGY_ENGINE
        {
            module: 'PRISM_TOPOLOGY_ENGINE',
            routes: [
                { path: 'engine.topology.calculate', method: 'calculate' },
                { path: 'engine.topology.process', method: 'process' },
                { path: 'engine.topology.run', method: 'run' },
                { path: 'engine.topology.configure', method: 'configure' },
                { path: 'engine.topology.validate', method: 'validate' },
                { path: 'engine.topology.getResult', method: 'getResult' },
            ]
        },
        // PRISM_TRANSFORMER_ENGINE
        {
            module: 'PRISM_TRANSFORMER_ENGINE',
            routes: [
                { path: 'engine.transformer.calculate', method: 'calculate' },
                { path: 'engine.transformer.process', method: 'process' },
                { path: 'engine.transformer.run', method: 'run' },
                { path: 'engine.transformer.configure', method: 'configure' },
                { path: 'engine.transformer.validate', method: 'validate' },
                { path: 'engine.transformer.getResult', method: 'getResult' },
            ]
        },
        // PRISM_TRUE_AI_SYSTEM
        {
            module: 'PRISM_TRUE_AI_SYSTEM',
            routes: [
                { path: 'ai.truesystem.predict', method: 'predict' },
                { path: 'ai.truesystem.train', method: 'train' },
                { path: 'ai.truesystem.evaluate', method: 'evaluate' },
                { path: 'ai.truesystem.configure', method: 'configure' },
                { path: 'ai.truesystem.getModel', method: 'getModel' },
                { path: 'ai.truesystem.infer', method: 'infer' },
            ]
        },
        // PRISM_TRUST_REGION_OPTIMIZER
        {
            module: 'PRISM_TRUST_REGION_OPTIMIZER',
            routes: [
                { path: 'opt.trustregion.optimize', method: 'optimize' },
                { path: 'opt.trustregion.minimize', method: 'minimize' },
                { path: 'opt.trustregion.maximize', method: 'maximize' },
                { path: 'opt.trustregion.configure', method: 'configure' },
                { path: 'opt.trustregion.pareto', method: 'pareto' },
                { path: 'opt.trustregion.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UI_SYSTEM_COMPLETE
        {
            module: 'PRISM_UI_SYSTEM_COMPLETE',
            routes: [
                { path: 'data.uisystem.get', method: 'get' },
                { path: 'data.uisystem.set', method: 'set' },
                { path: 'data.uisystem.process', method: 'process' },
                { path: 'data.uisystem.validate', method: 'validate' },
                { path: 'data.uisystem.export', method: 'export' },
                { path: 'data.uisystem.import', method: 'import' },
            ]
        },
        // PRISM_UNCONSTRAINED_OPTIMIZATION
        {
            module: 'PRISM_UNCONSTRAINED_OPTIMIZATION',
            routes: [
                { path: 'opt.unconstraine.optimize', method: 'optimize' },
                { path: 'opt.unconstraine.minimize', method: 'minimize' },
                { path: 'opt.unconstraine.maximize', method: 'maximize' },
                { path: 'opt.unconstraine.configure', method: 'configure' },
                { path: 'opt.unconstraine.pareto', method: 'pareto' },
                { path: 'opt.unconstraine.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UNIFIED_3D_VIEWPORT_ENGINE
        {
            module: 'PRISM_UNIFIED_3D_VIEWPORT_ENGINE',
            routes: [
                { path: 'engine.unified3dvie.calculate', method: 'calculate' },
                { path: 'engine.unified3dvie.process', method: 'process' },
                { path: 'engine.unified3dvie.run', method: 'run' },
                { path: 'engine.unified3dvie.configure', method: 'configure' },
                { path: 'engine.unified3dvie.validate', method: 'validate' },
                { path: 'engine.unified3dvie.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UNIFIED_CAD_LEARNING_SYSTEM
        {
            module: 'PRISM_UNIFIED_CAD_LEARNING_SYSTEM',
            routes: [
                { path: 'learn.unifiedcadsy.train', method: 'train' },
                { path: 'learn.unifiedcadsy.predict', method: 'predict' },
                { path: 'learn.unifiedcadsy.evaluate', method: 'evaluate' },
                { path: 'learn.unifiedcadsy.update', method: 'update' },
                { path: 'learn.unifiedcadsy.export', method: 'export' },
                { path: 'learn.unifiedcadsy.getModel', method: 'getModel' },
            ]
        },
        // PRISM_UNIFIED_CUTTING_ENGINE
        {
            module: 'PRISM_UNIFIED_CUTTING_ENGINE',
            routes: [
                { path: 'engine.unifiedcutti.calculate', method: 'calculate' },
                { path: 'engine.unifiedcutti.process', method: 'process' },
                { path: 'engine.unifiedcutti.run', method: 'run' },
                { path: 'engine.unifiedcutti.configure', method: 'configure' },
                { path: 'engine.unifiedcutti.validate', method: 'validate' },
                { path: 'engine.unifiedcutti.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UNIFIED_DATA
        {
            module: 'PRISM_UNIFIED_DATA',
            routes: [
                { path: 'unified.data.init', method: 'init' },
                { path: 'unified.data.run', method: 'run' },
                { path: 'unified.data.process', method: 'process' },
                { path: 'unified.data.get', method: 'get' },
                { path: 'unified.data.set', method: 'set' },
                { path: 'unified.data.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR
        {
            module: 'PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR',
            routes: [
                { path: 'unified.intelligent.init', method: 'init' },
                { path: 'unified.intelligent.run', method: 'run' },
                { path: 'unified.intelligent.process', method: 'process' },
                { path: 'unified.intelligent.get', method: 'get' },
                { path: 'unified.intelligent.set', method: 'set' },
                { path: 'unified.intelligent.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIFIED_LEARNING_ENGINE
        {
            module: 'PRISM_UNIFIED_LEARNING_ENGINE',
            routes: [
                { path: 'engine.unifiedlearn.calculate', method: 'calculate' },
                { path: 'engine.unifiedlearn.process', method: 'process' },
                { path: 'engine.unifiedlearn.run', method: 'run' },
                { path: 'engine.unifiedlearn.configure', method: 'configure' },
                { path: 'engine.unifiedlearn.validate', method: 'validate' },
                { path: 'engine.unifiedlearn.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UNIFIED_MANUFACTURER_DATABASE
        {
            module: 'PRISM_UNIFIED_MANUFACTURER_DATABASE',
            routes: [
                { path: 'db.unifiedmanuf.get', method: 'get' },
                { path: 'db.unifiedmanuf.list', method: 'list' },
                { path: 'db.unifiedmanuf.search', method: 'search' },
                { path: 'db.unifiedmanuf.byId', method: 'byId' },
                { path: 'db.unifiedmanuf.filter', method: 'filter' },
                { path: 'db.unifiedmanuf.count', method: 'count' },
            ]
        },
        // PRISM_UNIFIED_MATERIAL_ACCESS
        {
            module: 'PRISM_UNIFIED_MATERIAL_ACCESS',
            routes: [
                { path: 'unified.material.init', method: 'init' },
                { path: 'unified.material.run', method: 'run' },
                { path: 'unified.material.process', method: 'process' },
                { path: 'unified.material.get', method: 'get' },
                { path: 'unified.material.set', method: 'set' },
                { path: 'unified.material.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE
        {
            module: 'PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE',
            routes: [
                { path: 'engine.unifiedtoolp.calculate', method: 'calculate' },
                { path: 'engine.unifiedtoolp.process', method: 'process' },
                { path: 'engine.unifiedtoolp.run', method: 'run' },
                { path: 'engine.unifiedtoolp.configure', method: 'configure' },
                { path: 'engine.unifiedtoolp.validate', method: 'validate' },
                { path: 'engine.unifiedtoolp.getResult', method: 'getResult' },
            ]
        },
        // PRISM_UNITS
        {
            module: 'PRISM_UNITS',
            routes: [
                { path: 'units.core.init', method: 'init' },
                { path: 'units.core.run', method: 'run' },
                { path: 'units.core.process', method: 'process' },
                { path: 'units.core.get', method: 'get' },
                { path: 'units.core.set', method: 'set' },
                { path: 'units.core.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIVERSAL_FEATURE_LIBRARY
        {
            module: 'PRISM_UNIVERSAL_FEATURE_LIBRARY',
            routes: [
                { path: 'universa.feature.init', method: 'init' },
                { path: 'universa.feature.run', method: 'run' },
                { path: 'universa.feature.process', method: 'process' },
                { path: 'universa.feature.get', method: 'get' },
                { path: 'universa.feature.set', method: 'set' },
                { path: 'universa.feature.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIVERSAL_POST_GENERATOR_V2
        {
            module: 'PRISM_UNIVERSAL_POST_GENERATOR_V2',
            routes: [
                { path: 'universa.post.init', method: 'init' },
                { path: 'universa.post.run', method: 'run' },
                { path: 'universa.post.process', method: 'process' },
                { path: 'universa.post.get', method: 'get' },
                { path: 'universa.post.set', method: 'set' },
                { path: 'universa.post.configure', method: 'configure' },
            ]
        },
        // PRISM_UNIVERSITY_ALGORITHMS
        {
            module: 'PRISM_UNIVERSITY_ALGORITHMS',
            routes: [
                { path: 'alg.universitys.run', method: 'run' },
                { path: 'alg.universitys.configure', method: 'configure' },
                { path: 'alg.universitys.execute', method: 'execute' },
                { path: 'alg.universitys.getResult', method: 'getResult' },
                { path: 'alg.universitys.validate', method: 'validate' },
                { path: 'alg.universitys.compare', method: 'compare' },
            ]
        },
        // PRISM_VALUE_ITERATION_ENGINE
        {
            module: 'PRISM_VALUE_ITERATION_ENGINE',
            routes: [
                { path: 'engine.valueiterati.calculate', method: 'calculate' },
                { path: 'engine.valueiterati.process', method: 'process' },
                { path: 'engine.valueiterati.run', method: 'run' },
                { path: 'engine.valueiterati.configure', method: 'configure' },
                { path: 'engine.valueiterati.validate', method: 'validate' },
                { path: 'engine.valueiterati.getResult', method: 'getResult' },
            ]
        },
        // PRISM_VARIABLE_RADIUS_FILLET_ENGINE
        {
            module: 'PRISM_VARIABLE_RADIUS_FILLET_ENGINE',
            routes: [
                { path: 'engine.variableradi.calculate', method: 'calculate' },
                { path: 'engine.variableradi.process', method: 'process' },
                { path: 'engine.variableradi.run', method: 'run' },
                { path: 'engine.variableradi.configure', method: 'configure' },
                { path: 'engine.variableradi.validate', method: 'validate' },
                { path: 'engine.variableradi.getResult', method: 'getResult' },
            ]
        },
        // PRISM_VERIFICATION_CENTER
        {
            module: 'PRISM_VERIFICATION_CENTER',
            routes: [
                { path: 'verifica.center.init', method: 'init' },
                { path: 'verifica.center.run', method: 'run' },
                { path: 'verifica.center.process', method: 'process' },
                { path: 'verifica.center.get', method: 'get' },
                { path: 'verifica.center.set', method: 'set' },
                { path: 'verifica.center.configure', method: 'configure' },
            ]
        },
        // PRISM_VERIFIED_POST_DATABASE_V2
        {
            module: 'PRISM_VERIFIED_POST_DATABASE_V2',
            routes: [
                { path: 'db.verifiedpost.get', method: 'get' },
                { path: 'db.verifiedpost.list', method: 'list' },
                { path: 'db.verifiedpost.search', method: 'search' },
                { path: 'db.verifiedpost.byId', method: 'byId' },
                { path: 'db.verifiedpost.filter', method: 'filter' },
                { path: 'db.verifiedpost.count', method: 'count' },
            ]
        },
        // PRISM_VIBRATION_ANALYSIS
        {
            module: 'PRISM_VIBRATION_ANALYSIS',
            routes: [
                { path: 'vibratio.analysis.init', method: 'init' },
                { path: 'vibratio.analysis.run', method: 'run' },
                { path: 'vibratio.analysis.process', method: 'process' },
                { path: 'vibratio.analysis.get', method: 'get' },
                { path: 'vibratio.analysis.set', method: 'set' },
                { path: 'vibratio.analysis.configure', method: 'configure' },
            ]
        },
        // PRISM_VIBRATION_ANALYSIS_ENGINE
        {
            module: 'PRISM_VIBRATION_ANALYSIS_ENGINE',
            routes: [
                { path: 'engine.vibrationana.calculate', method: 'calculate' },
                { path: 'engine.vibrationana.process', method: 'process' },
                { path: 'engine.vibrationana.run', method: 'run' },
                { path: 'engine.vibrationana.configure', method: 'configure' },
                { path: 'engine.vibrationana.validate', method: 'validate' },
                { path: 'engine.vibrationana.getResult', method: 'getResult' },
            ]
        },
        // PRISM_VORONOI_3D_ENGINE
        {
            module: 'PRISM_VORONOI_3D_ENGINE',
            routes: [
                { path: 'engine.voronoi3d.calculate', method: 'calculate' },
                { path: 'engine.voronoi3d.process', method: 'process' },
                { path: 'engine.voronoi3d.run', method: 'run' },
                { path: 'engine.voronoi3d.configure', method: 'configure' },
                { path: 'engine.voronoi3d.validate', method: 'validate' },
                { path: 'engine.voronoi3d.getResult', method: 'getResult' },
            ]
        },
        // PRISM_VORONOI_ENGINE
        {
            module: 'PRISM_VORONOI_ENGINE',
            routes: [
                { path: 'engine.voronoi.calculate', method: 'calculate' },
                { path: 'engine.voronoi.process', method: 'process' },
                { path: 'engine.voronoi.run', method: 'run' },
                { path: 'engine.voronoi.configure', method: 'configure' },
                { path: 'engine.voronoi.validate', method: 'validate' },
                { path: 'engine.voronoi.getResult', method: 'getResult' },
            ]
        },
        // PRISM_WORKER_POOL
        {
            module: 'PRISM_WORKER_POOL',
            routes: [
                { path: 'worker.pool.init', method: 'init' },
                { path: 'worker.pool.run', method: 'run' },
                { path: 'worker.pool.process', method: 'process' },
                { path: 'worker.pool.get', method: 'get' },
                { path: 'worker.pool.set', method: 'set' },
                { path: 'worker.pool.configure', method: 'configure' },
            ]
        },
        // PRISM_WORKHOLDING_DATABASE
        {
            module: 'PRISM_WORKHOLDING_DATABASE',
            routes: [
                { path: 'db.workholding.get', method: 'get' },
                { path: 'db.workholding.list', method: 'list' },
                { path: 'db.workholding.search', method: 'search' },
                { path: 'db.workholding.byId', method: 'byId' },
                { path: 'db.workholding.filter', method: 'filter' },
                { path: 'db.workholding.count', method: 'count' },
            ]
        },
        // PRISM_WORKHOLDING_GEOMETRY_EXTENDED
        {
            module: 'PRISM_WORKHOLDING_GEOMETRY_EXTENDED',
            routes: [
                { path: 'geom.workholdinge.create', method: 'create' },
                { path: 'geom.workholdinge.evaluate', method: 'evaluate' },
                { path: 'geom.workholdinge.transform', method: 'transform' },
                { path: 'geom.workholdinge.validate', method: 'validate' },
                { path: 'geom.workholdinge.export', method: 'export' },
                { path: 'geom.workholdinge.analyze', method: 'analyze' },
            ]
        },
        // PRISM_XAI_ENGINE
        {
            module: 'PRISM_XAI_ENGINE',
            routes: [
                { path: 'engine.xai.calculate', method: 'calculate' },
                { path: 'engine.xai.process', method: 'process' },
                { path: 'engine.xai.run', method: 'run' },
                { path: 'engine.xai.configure', method: 'configure' },
                { path: 'engine.xai.validate', method: 'validate' },
                { path: 'engine.xai.getResult', method: 'getResult' },
            ]
        },
        // PRISM_ZENI_COMPLETE_CATALOG
        {
            module: 'PRISM_ZENI_COMPLETE_CATALOG',
            routes: [
                { path: 'data.zenicatalog.get', method: 'get' },
                { path: 'data.zenicatalog.set', method: 'set' },
                { path: 'data.zenicatalog.process', method: 'process' },
                { path: 'data.zenicatalog.validate', method: 'validate' },
                { path: 'data.zenicatalog.export', method: 'export' },
                { path: 'data.zenicatalog.import', method: 'import' },
            ]
        },
    ],

    registerAll: function() {
        if (typeof PRISM_GATEWAY === 'undefined') return { registered: 0 };
        const stats = { registered: 0, skipped: 0 };
        for (const mc of this.ROUTES) {
            for (const r of mc.routes) {
                if (!PRISM_GATEWAY.AUTHORITIES[r.path]) {
                    PRISM_GATEWAY.AUTHORITIES[r.path] = { module: mc.module, method: r.method };
                    stats.registered++;
                } else { stats.skipped++; }
            }
        }
        console.log('[REMAINING_ROUTES] Registered:', stats.registered, 'Skipped:', stats.skipped);
        return stats;
    }
}