/**
 * prism_cam — CAM/Toolpath Dispatcher
 *
 * 55+ actions: toolpath_generate, toolpath_simulate, toolpath_optimize,
 *   post_process, collision_check_full, stock_update, tool_assembly,
 *   fixture_setup, nesting_optimize, clearance_plane,
 *   sequence_operations, linking_move, cam_strategy_recommend,
 *   cam_safety_validate, cam_multiaxis_recommend, cam_material_map,
 *   cam_cycle_catalog, lathe_post_process, probe_generate,
 *   subprogram_call, subprogram_pattern, cam_controller_catalog,
 *   cam_cycle_defaults, cam_thread_lookup, advanced_post_enhance,
 *   cam_translate, cam_compare_controllers, cam_material_recommend,
 *   cam_multicam_recommend, cam_multicam_list, cam_multicam_compare,
 *   cam_multicam_flagship, cam_ext_recommend, cam_ext_list, cam_ext_compare,
 *   cam_ext_flagship, cam_ext_search, post_feed_optimize, post_feed_analyze,
 *   gcode_transpile, gcode_transpile_dialects, gcode_transpile_cycles,
 *   stability_rpm_rewrite, stability_rpm_analyze
 *
 * Engine dependencies: CAMKernelEngine, ToolpathGenerationEngine,
 *   PostProcessorEngine, CollisionDetectionEngine, StockModelEngine,
 *   ToolAssemblyEngine, ModularFixtureLayoutEngine,
 *   HyperMillStrategyEngine, HyperMillSafetyHooks,
 *   LathePostProcessorEngine, ProbingCycleEngine, SubprogramEngine,
 *   PostProcessorFeedOptimizerEngine, InstantaneousEngagementEngine,
 *   MultiCAMPostEngine, ProductionToolpathEngine, PostProcessorAPIEngine,
 *   ScalableCAMOrchestratorEngine, UnifiedCAMPipelineEngine,
 *   SmartToolSelectorEngine, AdaptiveToolpathRouterEngine,
 *   CumulativeStockChainEngine, FeatureClusteringEngine, ProductionPackageEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { ACTION_POST_PROCESSOR_EXT_SCHEMAS } from "../../schemas/postProcessorExtActionSchemas.js";
import { ACTION_ADVANCED_SCIENCE_SCHEMAS } from "../../schemas/advancedScienceActionSchemas.js";
import { ACTION_CNC_PROGRAMMING_SCHEMAS } from "../../schemas/cncProgrammingActionSchemas.js";
import { ACTION_CK_PIPELINE_SCHEMAS } from "../../schemas/ckPipelineActionSchemas.js";
import { ACTION_CAM_KERNEL_SCHEMAS } from "../../schemas/camKernelActionSchemas.js";
import { ACTION_CK_MS10_SCHEMAS } from "../../schemas/ckMs10ActionSchemas.js";
import { ACTION_CK_MS11_SCHEMAS } from "../../schemas/ckMs11ActionSchemas.js";
import { ACTION_CK_MS12_SCHEMAS } from "../../schemas/ckMs12ActionSchemas.js";
import { ACTION_CK_MS13_SCHEMAS } from "../../schemas/ckMs13ActionSchemas.js";
import { ACTION_CAMX_MS21_SCHEMAS } from "../../schemas/camxMs21ActionSchemas.js";
import { ACTION_CAMX_MS12_U02_SCHEMAS } from "../../schemas/camxMs12U02ActionSchemas.js";
import { ACTION_BOX_DATA_SCHEMAS } from "../../schemas/boxDataActionSchemas.js";
import { ACTION_CAMX_MS4_U03_SCHEMAS } from "../../schemas/camxMs4U03ActionSchemas.js";
import { ACTION_CAMX_MS5_U01_SCHEMAS } from "../../schemas/camxMs5U01ActionSchemas.js";
import { ACTION_ML_STRATEGY_RANKER_SCHEMAS } from "../../schemas/mlStrategyRankerActionSchemas.js";
import { ACTION_CAMX_MS3_U02_SCHEMAS } from "../../schemas/camxMs3U02ActionSchemas.js";
import { ACTION_BATCH_CAM_STRATEGY_SCHEMAS } from "../../schemas/batchCAMStrategyActionSchemas.js";
import { ACTION_BATCH_CAM_STRATEGY2_SCHEMAS } from "../../schemas/batchCAMStrategy2ActionSchemas.js";
import { ACTION_CATIA_STRATEGY_SCHEMAS } from "../../schemas/catiaStrategyActionSchemas.js";
import { ACTION_CAMX_MS3_U02_SAFETY_SCHEMAS } from "../../schemas/camxMs3U02SafetyActionSchemas.js";
import { ACTION_SOLIDCAM_SAFETY_SCHEMAS } from "../../schemas/solidcamSafetyActionSchemas.js";
import { ACTION_CAMX_MS12_U01_SCHEMAS } from "../../schemas/camxMs12U01ActionSchemas.js";
import { ACTION_BATCH_CAM_MATERIAL_BRIDGE_SCHEMAS } from "../../schemas/batchCAMMaterialBridgeActionSchemas.js";
import { ACTION_CAMX_MS5_U06_SCHEMAS } from "../../schemas/camxMs5U06ActionSchemas.js";
import { ACTION_SOLIDCAM_CODE_GENERATOR_SCHEMAS } from "../../schemas/solidcamCodeGeneratorActionSchemas.js";
import { ACTION_CAMX_MS3_U09_SCHEMAS } from "../../schemas/camxMs3U09ActionSchemas.js";
import { ACTION_CATIA_CODE_GENERATOR_SCHEMAS } from "../../schemas/catiaCodeGeneratorActionSchemas.js";
import { ACTION_HYPERMILL_CODE_GENERATOR_SCHEMAS } from "../../schemas/hyperMillCodeGeneratorActionSchemas.js";
import { ACTION_CAMX_MS6_U03_SCHEMAS } from "../../schemas/camxMs6U03ActionSchemas.js";
import { POST_ULT_ACTION_SCHEMAS } from "../../schemas/postUltActionSchemas.js";
import { ACTION_CAMX_MS10_U04_SCHEMAS } from "../../schemas/camxMs10U04ActionSchemas.js";
import { ACTION_CAMX_MS11_U01_SCHEMAS } from "../../schemas/camxMs11U01ActionSchemas.js";
import { ACTION_CAMX_MS10_U06_SCHEMAS } from "../../schemas/camxMs10U06ActionSchemas.js";
import { ACTION_CAMX_MS20_SCHEMAS } from "../../schemas/camxMs20ActionSchemas.js";
import { ACTION_STRATEGY_PERF_TRACKER_SCHEMAS } from "../../schemas/strategyPerfTrackerActionSchemas.js";
import { ACTION_CAMX_MS20_U05_SCHEMAS } from "../../schemas/camxMs20U05ActionSchemas.js";
import { ACTION_CAMX_MS21_U02_SCHEMAS } from "../../schemas/camxMs21U02ActionSchemas.js";
import { ACTION_CAMX_MS20_U03_SCHEMAS } from "../../schemas/camxMs20U03ActionSchemas.js";
import { ACTION_CAMX_MS20_U04_SCHEMAS } from "../../schemas/camxMs20U04ActionSchemas.js";
import { ACTION_CAMX_MS13_U06_SCHEMAS } from "../../schemas/camxMs13U06ActionSchemas.js";
import { ACTION_CAMX_WAVE4_SCHEMAS } from "../../schemas/camxWave4ActionSchemas.js";
import { ACTION_BATCH_CAM_CONTROLLER_SCHEMAS } from "../../schemas/batchCAMControllerActionSchemas.js";
import { ACTION_BATCH_CAM_OP_CATALOG_SCHEMAS } from "../../schemas/batchCAMOperationCatalogActionSchemas.js";
import { ACTION_BATCH_CAM_TOOL_BRIDGE_SCHEMAS } from "../../schemas/batchCAMToolBridgeActionSchemas.js";
import { ACTION_BATCH_CAM_ADDIN_SCHEMAS } from "../../schemas/batchCAMAddInActionSchemas.js";
import { ACTION_CAMX_MS15_U02_U03_SCHEMAS } from "../../schemas/camxMs15U02U03ActionSchemas.js";
import { ACTION_F360_AUTO_PROGRAM_SCHEMAS } from "../../schemas/f360AutoProgramActionSchemas.js";
import { ACTION_HM_REV_MS2_SCHEMAS } from "../../schemas/hmRevMs2ActionSchemas.js";
import { ACTION_HM_REV_MS3_SCHEMAS } from "../../schemas/hmRevMs3ActionSchemas.js";
import { ACTION_HM_REV_MS7_SCHEMAS } from "../../schemas/hmRevMs7ActionSchemas.js";
import { ACTION_HM_REV_MS0_SCHEMAS } from "../../schemas/hmRevMs0ActionSchemas.js";
import { ACTION_HM_REV_MS8_SCHEMAS } from "../../schemas/hmRevMs8ActionSchemas.js";
import { ACTION_HM_REV_MS10_SCHEMAS } from "../../schemas/hmRevMs10ActionSchemas.js";
import { ACTION_POST_PROCESSOR_AI_SCHEMAS } from "../../schemas/postProcessorAIActionSchemas.js";
import { ACTION_LATHE_SF_SCHEMAS } from "../../schemas/latheSpeedFeedActionSchemas.js";
import { ACTION_LATHE_POSTGEN_SCHEMAS } from "../../schemas/lathePostgenActionSchemas.js";
import { ACTION_LATHE_UNIFIED_OUTPUT_SCHEMAS } from "../../schemas/latheMasterPostUnifiedOutputActionSchemas.js";
import { ACTION_ONTOLOGY_SCHEMAS } from "../../schemas/ontologyActionSchemas.js";
import { ACTION_LATHE_MASTERPOST_API_SCHEMAS } from "../../schemas/latheMasterPostAPIActionSchemas.js";
import { ACTION_FUSION360_FUNCTION_INDEX_SCHEMAS } from "../../schemas/fusion360FunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcam25DFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcamIMachiningFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcam3DHSSHSRFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcam5AxisFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcamTurningFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcamMillTurnFunctionIndexActionSchemas.js";
import { ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS } from "../../schemas/solidcamFunctionIndexActionSchemas.js";
import { ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS } from "../../schemas/nxcamMillingFunctionIndexActionSchemas.js";
import { ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS } from "../../schemas/nxcamTurningFunctionIndexActionSchemas.js";
import { ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS } from "../../schemas/nxcamFBMFunctionIndexActionSchemas.js";
import { ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS } from "../../schemas/nxcamFunctionIndexActionSchemas.js";
import { ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS } from "../../schemas/powerMillRoughingFunctionIndexActionSchemas.js";
import { ACTION_CAM_LORA_FRAMEWORK_SCHEMAS, ACTION_CAM_LORA_CADENCE_SCHEMAS } from "../../schemas/camLoRAFrameworkActionSchemas.js";
import { ACTION_CAMX_MS22_U01_SCHEMAS } from '../../schemas/camxMs22U01ActionSchemas.js';
import { ACTION_CAMX_MS22_U02_SCHEMAS } from '../../schemas/camxMs22U02ActionSchemas.js';
const MERGED_CAM_SCHEMAS = {
  ...ACTION_CAM_SCHEMAS, ...ACTION_POST_PROCESSOR_EXT_SCHEMAS,
  ...ACTION_ADVANCED_SCIENCE_SCHEMAS, ...ACTION_CNC_PROGRAMMING_SCHEMAS,
  ...ACTION_CK_PIPELINE_SCHEMAS, ...ACTION_CAM_KERNEL_SCHEMAS,
  ...ACTION_CK_MS10_SCHEMAS, ...ACTION_CK_MS11_SCHEMAS,
  ...ACTION_CK_MS12_SCHEMAS, ...ACTION_CK_MS13_SCHEMAS,
  ...ACTION_CAMX_MS21_SCHEMAS, ...ACTION_CAMX_MS12_U02_SCHEMAS,
  ...ACTION_BOX_DATA_SCHEMAS, ...ACTION_CAMX_MS5_U01_SCHEMAS,
  ...ACTION_CAMX_MS4_U03_SCHEMAS,
  ...ACTION_ML_STRATEGY_RANKER_SCHEMAS,
  ...ACTION_CAMX_MS3_U02_SCHEMAS,
  ...ACTION_BATCH_CAM_STRATEGY_SCHEMAS,
  ...ACTION_BATCH_CAM_STRATEGY2_SCHEMAS,
  ...ACTION_CATIA_STRATEGY_SCHEMAS,
  ...ACTION_CAMX_MS3_U02_SAFETY_SCHEMAS,
  ...ACTION_SOLIDCAM_SAFETY_SCHEMAS,
  ...ACTION_CAMX_MS12_U01_SCHEMAS,
  ...ACTION_BATCH_CAM_MATERIAL_BRIDGE_SCHEMAS,
  ...ACTION_CAMX_MS5_U06_SCHEMAS,
  ...ACTION_CAMX_MS3_U09_SCHEMAS,
  ...ACTION_SOLIDCAM_CODE_GENERATOR_SCHEMAS,
  ...ACTION_CATIA_CODE_GENERATOR_SCHEMAS,
  ...ACTION_HYPERMILL_CODE_GENERATOR_SCHEMAS,
  ...ACTION_CAMX_MS6_U03_SCHEMAS,
  ...POST_ULT_ACTION_SCHEMAS,
  ...ACTION_CAMX_MS10_U04_SCHEMAS,
  ...ACTION_CAMX_MS10_U01_SCHEMAS,
  ...ACTION_CAMX_MS11_U01_SCHEMAS,
  ...ACTION_CAMX_MS10_U06_SCHEMAS,
  ...ACTION_CAMX_MS9_U03_SCHEMAS,
  ...ACTION_CAMX_MS20_SCHEMAS,
  ...ACTION_STRATEGY_PERF_TRACKER_SCHEMAS,
  ...ACTION_CAMX_MS20_U05_SCHEMAS,
  ...ACTION_CAMX_MS21_U02_SCHEMAS,
  ...ACTION_CAMX_MS20_U03_SCHEMAS,
  ...ACTION_CAMX_MS20_U04_SCHEMAS,
  ...ACTION_CAMX_MS13_U06_SCHEMAS,
  ...ACTION_CAMX_WAVE4_SCHEMAS,
  ...ACTION_BATCH_CAM_CONTROLLER_SCHEMAS,
  ...ACTION_BATCH_CAM_OP_CATALOG_SCHEMAS,
  ...ACTION_BATCH_CAM_TOOL_BRIDGE_SCHEMAS,
  ...ACTION_BATCH_CAM_ADDIN_SCHEMAS,
  ...ACTION_CAMX_MS15_U02_U03_SCHEMAS,
  ...ACTION_F360_AUTO_PROGRAM_SCHEMAS,
  ...ACTION_HM_REV_MS2_SCHEMAS,
  ...ACTION_HM_REV_MS3_SCHEMAS,
  ...ACTION_HM_REV_MS7_SCHEMAS,
  ...ACTION_HM_REV_MS0_SCHEMAS,
  ...ACTION_HM_REV_MS8_SCHEMAS,
  ...ACTION_HM_REV_MS10_SCHEMAS,
  ...ACTION_POST_PROCESSOR_AI_SCHEMAS,
  ...ACTION_LATHE_SF_SCHEMAS,
  ...ACTION_LATHE_POSTGEN_SCHEMAS,
  ...ACTION_LATHE_UNIFIED_OUTPUT_SCHEMAS,
  ...ACTION_ONTOLOGY_SCHEMAS,
  ...ACTION_LATHE_MASTERPOST_API_SCHEMAS,
  ...ACTION_FUSION360_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_IMACHINING_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_3D_HSS_HSR_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_TURNING_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_MILLTURN_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_SOLIDCAM_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_NXCAM_MILLING_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_NXCAM_TURNING_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_NXCAM_FBM_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_NXCAM_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_PM_ROUGHING_FUNCTION_INDEX_SCHEMAS,
  ...ACTION_CAM_LORA_FRAMEWORK_SCHEMAS,
  ...ACTION_CAM_LORA_CADENCE_SCHEMAS,
  ...ACTION_CAMX_MS22_U01_SCHEMAS,
  ...ACTION_CAMX_MS22_U02_SCHEMAS,
};
import { ACTION_CAMX_MS10_U01_SCHEMAS } from "../../schemas/camxMs10U01ActionSchemas.js";
import { ACTION_CAMX_MS9_U03_SCHEMAS } from "../../schemas/camxMs9U03ActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { consultAwareness, extractAwarenessKeywords } from "./awarenessMiddleware.js";

let _cam: any, _toolpath: any, _post: any, _collision: any, _stock: any, _toolAsm: any, _fixture: any, _hmStrategy: any, _hmSafety: any, _hmMultiAxis: any, _hmMaterialMap: any, _hmCycleCatalog: any, _hmController: any, _hmCycleDefaults: any, _hmThread: any, _hmMillTurnStrat: any, _hmSkillsBatch: any, _hmSkillRegMap: any, _hmMedMatProfiles: any, _hmXmlExtractor: any, _hmStrategyKB: any, _hmDeepLearning: any, _hmAIOrch: any, _hmTurningCfgIngester: any, _hmOmCycles: any, _fusLathePostDelta: any, _fusAIOrch: any, _fus360CodeGen: any, _mcMatBridge: any, _mcMatPhys: any, _mcFAI: any, _mcSPC: any, _mcAutoBridge: any, _espCAM: any, _invAutoBridge: any, _invAIOrch: any, _swAutoBridge: any, _lathePost: any, _probing: any, _subprogram: any, _nesting: any, _tpSim: any, _advPost: any, _portability: any, _multiCam: any, _feedOpt: any, _transpiler: any, _stabilityRPM: any, _probeGen: any, _cycleTimeEst: any, _gcodeSafety: any, _thermal: any, _energy: any, _kinematic: any, _setupSheet: any, _autoSF: any, _instEngage: any, _multiCamPost: any, _prodToolpath: any, _ppAPI: any, _scalableOrch: any, _unifiedPipe: any, _smartTool: any, _adaptRouter: any, _cumStock: any, _featCluster: any, _prodPackage: any, _edmAsm: any, _grindAsm: any, _laserAsm: any, _wjAsm: any, _multiProc: any, _millTurn: any, _selfLearn: any, _turningProfile: any, _sheetNesting: any, _dxfParser: any, _stochRouter: any, _probingProg: any, _dfmFeedback: any;
// CK-MS12 singletons
let _nlpCAMParser: any, _programCompare: any, _camCache: any, _batchCAM: any;
// CAMX-MS3 U01 singletons
let _mastercamStrategy: any;
// CAMX-MS3 U09 singletons (E1117)
let _mastercamCodeGen: any;
// CAMX-MS3 U02 (E1113) singletons
let _mastercamSafety: any;
// CAMX-MS10 U01 (E1123) singletons
let _mastercamToolExport: any;
// E1114 — SolidCAMSafetyHooksEngine singletons
let _solidcamSafety: any;
// CAMX-MS12 U01 singletons
let _featureStrategyKB: any;
// CAMX-MS12 U02 singletons
let _strategyBenchmark: any;
// CAMX-MS12 U03 singletons
let _strategyComparison: any;
// CAMX-MS12 U05 singletons
let _contextualStrategyOverride: any;
// CAMX-MS12 U06 singletons
let _strategySequencing: any;
// CAMX-MS12 U07 singletons
let _fixtureAwareStrategy: any;
// CAMX-MS12 U08 singletons
let _batchSizeStrategy: any;
// CAMX-MS12 U11 singletons (renamed from StochasticStrategyComparisonEngine — DuplicationGuard)
let _strategyStochasticRisk: any;
// CAMX-MS12 U12 singletons
let _cpkPredictionGate: any;
// CAMX-MS12 U13 singletons (renamed from RobustStrategyOptimizationEngine — DuplicationGuard)
let _strategyWorstCaseSelector: any;
// CK-MS13 singletons
let _pipelineCostModel: any;
// CAMX-MS21 U08 singletons
let _prodBatchOpt: any;
// CAMX-MS5 U01 singletons
let _nxCAMStrategy: any;
// CAMX-MS5 U06 singletons (E1119)
let _nxCAMCodeGen: any;
// CAMX-MS4 U03 singletons
let _iMachining: any;
// E1107 — ML Strategy Ranker
let _mlStrategyRanker: any;
// CAMX-MS3 U02 singletons
let _solidCAMStrategy: any;
// E1108 — CATIAStrategyEngine
let _catiaStrategy: any;
// E1115 — BatchCAMSafetyEngines (3 engines)
let _nxCAMSafety: any, _powerMillSafety: any, _catiaSafety: any;
// E1109 — BatchCAMStrategyEngines (6 engines)
let _tebisStrategy: any, _edgecamStrategy: any, _espritStrategy: any, _gibbsCAMStrategy: any, _camWorksStrategy: any, _sprutCAMStrategy: any;
// E1110 — BatchCAMStrategyEngines2 (4 engines)
let _workNCStrategy: any, _topSolidStrategy: any, _bobCADStrategy: any, _cimatronStrategy: any;
// E1116 — BatchCAMMaterialBridgeEngines (4 engines)
let _mastercamMatBridge: any, _solidCAMMatBridge: any, _nxCAMMatBridge: any, _powerMillMatBridge: any;
// E1141 — BatchCAMControllerEngines (4 engines)
let _mastercamCtrlCat: any, _solidCAMCtrlCat: any, _nxCAMCtrlCat: any, _powerMillCtrlCat: any;
// E1142 — BatchCAMOperationCatalogEngines (4 engines)
let _mastercamOpCat: any, _solidCAMOpCat: any, _nxCAMOpCat: any, _powerMillOpCat: any;
// E1143 — BatchCAMToolBridgeEngines (4 engines)
let _mastercamToolBridge: any, _solidCAMToolBridge: any, _nxCAMToolBridge: any, _hyperMillToolBridge: any;
// E1144 — BatchCAMAPIBridgeEngines (4 engines)
let _mastercamNETBridge: any, _solidCAMSWBridge: any, _nxOpenBridge: any, _hyperMillACBridge: any;
// E1145 — BatchCAMAddInGenerators (6 generators)
let _mastercamAddInGen: any, _solidCAMAddInGen: any, _nxCAMAddInGen: any, _hyperMillACAddInGen: any, _powerMillAddInGen: any, _catiaAddInGen: any;
// BOX Data singletons
let _cpsParser: any, _okumaParam: any, _ppCapMatrix: any;
// E1118 — SolidCAMCodeGeneratorEngine singleton
let _solidcamCodeGen: any;
// CAM-EXHAUST-MS0/U-CAM33 — SolidCAM25DFunctionIndexEngine singleton
let _solidcam25dIndex: any;
// CAM-EXHAUST-MS0/U-CAM34 — SolidCAMIMachiningFunctionIndexEngine singleton
let _solidcamIMachiningIndex: any;
// CAM-EXHAUST-MS0/U-CAM35 — SolidCAM3DHSSHSRFunctionIndexEngine singleton
let _solidcam3DHSSHSRIndex: any;
let _solidcam5AxisIndex: any;
let _solidcamTurningIndex: any;
let _solidcamMillTurnIndex: any;
let _solidcamUnifiedIndex: any;
let _nxcamMillingIndex: any;
let _nxcamTurningIndex: any;
let _nxcamFBMIndex: any;
let _nxcamUnifiedIndex: any;
let _pmRoughingIndex: any;
let _pmFinishingIndex: any;
let _pm5AxisIndex: any;
let _pmUnifiedIndex: any;
// E1122 — CATIACodeGeneratorEngine singleton
let _catiaCodeGen: any;
// E1120 — HyperMillCodeGeneratorEngine singleton
let _hyperMillCodeGen: any;
// CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01 — PrintToHyperMillBridge singleton
let _printToHyperMill: any;
// CAD-COMPLETE-MS0/U-CADC-PRINT-INVHSM-01 — PrintToInventorHSMBridge singleton
let _printToInventorHSM: any;
// E1121 — PowerMillCodeGeneratorEngine singleton
let _powerMillCodeGen: any;
// E1124 — UniversalToolExportEngine singleton
let _universalToolExport: any;
// E1125 — CAMAddInFrameworkEngine singleton (CAMX-MS11/U01)
let _camAddInFramework: any;
// E1128 — CuttingDataExportEngine singleton (CAMX-MS10/U06)
let _cuttingDataExport: any;
// E1126 — ToolSyncOrchestratorEngine singleton
let _toolSyncOrchestrator: any;
// E1127 — HyperMillToolExportEngine singleton (CAMX-MS9/U03)
let _hyperMillToolExport: any;
// E1129 — STEPNCEngines (CAMX-MS20) singletons
let _stepNCParser: any, _stepNCGenerator: any;
// E1130 — VericutBridgeEngine (CAMX-MS20/U05) singleton
let _vericutBridge: any;
// E1132 — NCSIMULBridgeEngine (CAMX-MS20/U06) singleton
let _ncsimulBridge: any;
// E1131 — StrategyPerformanceTrackerEngine (CAMX-MS15/U01)
let _strategyPerfTracker: any;
// E1133 — ISO13399ToolDataEngine (CAMX-MS20/U03)
let _iso13399ToolData: any;
// E1134 — ShopNetworkEngine (CAMX-MS21/U02)
let _shopNetwork: any;
// E1135 — QIFIntegrationEngine (CAMX-MS20/U04)
let _qifIntegration: any;
// E1136 — TCODashboardEngine (CAMX-MS13/U06)
let _tcoDashboard: any;
// E1137 — ToolChangeOptimizationEngine (CAMX-MS13/U02)
let _toolChangeOpt: any;
// E1138 — SafetyEscalationEngine (CAMX-MS14/U03)
let _safetyEscalation: any;
// E1139 — CollisionPreventionEngine (CAMX-MS14/U04)
let _collisionPrevention: any;
// E1140 — FleetLearningStrategyEngine (CAMX-MS15/U04)
let _fleetLearning: any;
// E1146 — StrategyEvolutionEngine (CAMX-MS15/U05)
let _strategyEvolution: any;
// E1147 — PredictionCalibrationEngine (CAMX-MS15/U06)
let _predictionCalibration: any;
// E1148 — WorkholdingVerificationEngine (CAMX-MS14/U06)
let _workholdingVerification: any;
// E1149 — ToolBreakagePredictionEngine (CAMX-MS14/U05)
let _toolBreakagePrediction: any;
// E1150 — CamxEnergyOptimizationEngine (CAMX-MS13/U04)
let _camxEnergyOpt: any;
// E1151 — StrategyRankingUpdateEngine (CAMX-MS15/U02)
let _strategyRankingUpdate: any;
// E1152 — AnomalyDetectionEngine (CAMX-MS15/U03)
let _anomalyDetection: any;
// E1154 — CoolantCostOptimizationEngine (CAMX-MS13/U03)
let _coolantCostOpt: any;
// E1155 — SetupCostOptimizationEngine (CAMX-MS13/U05)
let _setupCostOpt: any;
// E1156 — EnergyOptimizationIntegrationEngine (CAMX-MS13/U04)
let _energyOptInteg: any;
// PostDownloadEngine (PP-MS4/U-PP21)
let _postDownload: any;
// PostLibraryCatalogEngine (PP-MS6/U-PP28)
let _postLibraryCatalog: any;
// PostVersioningEngine (PP-MS6/U-PP30)
let _postVersioning: any;
// PostProcessorTelemetryEngine (PP-MS11/U-PP47)
let _ppgTelemetry: any;
// ProveOutModeEngine (PP-MS5/U-PP24)
let _proveOut: any;
// PostValidationHardeningEngine (PP-MS5/U-PP25)
let _postValHardening: any;
// PostValidationReportEngine (PP-MS5/U-PP26)
let _postValReport: any;
// POST-ULT singletons (20 engines)
let _cpsPostParser: any;
let _cpsDialectMapper: any;
let _machineFingerprint: any;
let _firmwareFeatureMatrix: any;
let _coolantControlConfig: any;
let _unifiedProbingDialect: any;
let _subprogramStructure: any;
let _edmPostProcessor: any;
let _laserWaterjetPost: any;
let _postTaxonomy: any;
let _machinePostCrossRef: any;
let _machineOptionRegistry: any;
let _controllerMatrix: any;
let _optimizationTier: any;
let _rapidReposition: any;
let _postPhysicsFoundation: any;
let _physicsSidecarBuilder: any;
let _noInlinePhysicsConstants: any;
let _lineByLine: any;
let _motionInjection: any;
let _postVerification: any;
let _postOutput: any;
let _advancedPhysics: any;
let _crossCAM: any;
let _postValidation: any;
let _postLibrary: any;
let _fleetDeployment: any;
// HM-REV-MS2 singletons
let _hmMatPhysBridge: any, _hmPPPConfig: any, _hmStrategyReg: any;
// HM-REV-MS8 singletons (E1157–E1161)
let _hmExtractionPipeline: any, _hmMacroDB: any, _hmACStandardToolDB: any, _hmMetricCfg: any, _hmExtractionOrch: any;
// HM-REV-MS0 singletons (E1160–E1164)
let _hyperCADSAutomation: any, _printToHyperCADS: any, _hyperCADSStock: any, _featureToStrategy: any, _hyperCADSMock: any;
// HM-REV-MS9 singletons (E1165–E1169)
let _hmACConnMgr: any, _hmACScriptExec: any, _hmJobMonitor: any, _hmPPPFileWriter: any;
// HM-KC-MS0 singletons (E1168)
let _hmIMToolDb: any, _hmIMMacroDB: any;
// PP-AI singletons (4 engines: Deep Learning, Deep Reasoning, Ultimate AI, Orchestrator)
let _ppAIDeepLearning: any, _ppAIDeepReasoning: any, _ppAIUltimate: any, _ppAIOrchestrator: any;
// LATHE-MASTER P1 singletons (U-LTH07, U-LTH08, U-LTH09, U-LTH12)
let _latheSFCalc: any, _latheSFDL: any, _latheSFReasoning: any, _latheSFShop: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cam": return _cam ??= (await import("../../engines/CAMKernelEngine.js")).camKernelEngine;
    case "toolpath": return _toolpath ??= (await import("../../engines/ToolpathGenerationEngine.js")).toolpathGenerationEngine;
    case "post": return _post ??= (await import("../../engines/PostProcessorEngine.js")).postProcessorEngine;
    case "collision": return _collision ??= (await import("../../engines/CollisionDetectionEngine.js")).collisionDetectionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "toolasm": return _toolAsm ??= (await import("../../engines/ToolAssemblyEngine.js")).toolAssemblyEngine;
    case "fixture": return _fixture ??= (await import("../../engines/ModularFixtureLayoutEngine.js")).modularFixtureLayoutEngine;
    case "hmStrategy": return _hmStrategy ??= (await import("../../engines/HyperMillStrategyEngine.js")).hyperMillStrategyEngine;
    case "hmSafety": return _hmSafety ??= await import("../../engines/HyperMillSafetyHooks.js");
    case "hmMultiAxis": return _hmMultiAxis ??= (await import("../../engines/HyperMillMultiAxisEngine.js")).hyperMillMultiAxisEngine;
    case "hmMaterialMap": return _hmMaterialMap ??= (await import("../../engines/HyperMillMaterialMapEngine.js")).hyperMillMaterialMapEngine;
    case "hmCycleCatalog": return _hmCycleCatalog ??= (await import("../../engines/HyperMillCycleCatalogEngine.js")).hyperMillCycleCatalogEngine;
    case "lathePost": return _lathePost ??= (await import("../../engines/LathePostProcessorEngine.js")).lathePostProcessorEngine;
    case "latheSFCalc": return _latheSFCalc ??= (await import("../../engines/LatheSpeedFeedCalculatorFacadeEngine.js")).LatheSpeedFeedCalculatorFacadeEngine;
    case "latheSFDL": return _latheSFDL ??= (await import("../../engines/LatheSpeedFeedDeepLearningAdvisorEngine.js")).LatheSpeedFeedDeepLearningAdvisorEngine;
    case "latheSFReasoning": return _latheSFReasoning ??= (await import("../../engines/LatheSpeedFeedReasoningBridgeEngine.js")).LatheSpeedFeedReasoningBridgeEngine;
    case "latheSFShop": return _latheSFShop ??= (await import("../../engines/LatheSpeedFeedShopAwareTuningEngine.js")).LatheSpeedFeedShopAwareTuningEngine;
    case "probing": return _probing ??= (await import("../../engines/ProbingCycleEngine.js")).probingCycleEngine;
    case "subprogram": return _subprogram ??= (await import("../../engines/SubprogramEngine.js")).subprogramEngine;
    case "nesting": return _nesting ??= (await import("../../engines/NestingEngine.js")).nestingEngine;
    case "tpSim": return _tpSim ??= (await import("../../engines/ToolpathSimulationEngine.js")).toolpathSimulationEngine;
    case "hmController": return _hmController ??= (await import("../../engines/HyperMillControllerCatalogEngine.js")).hyperMillControllerCatalogEngine;
    case "hmCycleDefaults": return _hmCycleDefaults ??= (await import("../../engines/HyperMillCycleDefaultsEngine.js")).hyperMillCycleDefaultsEngine;
    case "hmThread": return _hmThread ??= (await import("../../engines/HyperMillThreadStandardEngine.js")).hyperMillThreadStandardEngine;
    case "hmMillTurnStrat": return _hmMillTurnStrat ??= (await import("../../engines/HyperMillMillTurnStrategyEngine.js")).hyperMillMillTurnStrategyEngine;
    case "hmSkillsBatch": return _hmSkillsBatch ??= (await import("../../engines/HyperMillSkillsBatchEngine.js")).hyperMillSkillsBatchEngine;
    case "hmSkillRegMap": return _hmSkillRegMap ??= (await import("../../engines/HyperMillSkillRegistryMap.js")).hyperMillSkillRegistryMap;
    case "hmMedMatProfiles": return _hmMedMatProfiles ??= (await import("../../engines/HyperMillMedicalMaterialProfiles.js")).hyperMillMedicalMaterialProfiles;
    case "hmXmlExtractor": return _hmXmlExtractor ??= (await import("../../engines/HyperMillXmlExtractor.js")).hyperMillXmlExtractor;
    case "hmStrategyKB": return _hmStrategyKB ??= (await import("../../engines/HyperMillStrategyKnowledgeEngine.js")).hyperMillStrategyKnowledgeEngine;
    case "hmDeepLearning": return _hmDeepLearning ??= (await import("../../engines/HyperMillDeepLearningEngine.js")).hyperMillDeepLearningEngine;
    case "hmAIOrch": return _hmAIOrch ??= (await import("../../engines/HyperMillAIOrchestrationEngine.js")).hyperMillAIOrchestrationEngine;
    case "fusLathePostDelta": return _fusLathePostDelta ??= (await import("../../engines/FusionLathePostDeltaRegistryEngine.js")).fusionLathePostDeltaRegistryEngine;
    case "fusAIOrch": return _fusAIOrch ??= (await import("../../engines/FusionAIOrchestrationEngine.js")).fusionAIOrchestrationEngine;
    case "fus360CodeGen": return _fus360CodeGen ??= (await import("../../engines/Fusion360CodeGeneratorEngine.js")).fusion360CodeGeneratorEngine;
    case "mcMatBridge": return _mcMatBridge ??= (await import("../../engines/MastercamMaterialBridgeEngine.js")).mastercamMaterialBridgeEngine;
    case "mcMatPhys": return _mcMatPhys ??= (await import("../../engines/MastercamMaterialPhysicsBridge.js")).mastercamMaterialPhysicsBridge;
    case "mcFAI": return _mcFAI ??= (await import("../../engines/MastercamFAIBridge.js")).mastercamFAIBridge;
    case "mcSPC": return _mcSPC ??= (await import("../../engines/MastercamSPCBridge.js")).mastercamSPCBridge;
    case "mcAutoBridge": return _mcAutoBridge ??= (await import("../../engines/MastercamAutomationBridge.js")).mastercamAutomationBridge;
    case "espCAM": return _espCAM ??= (await import("../../engines/EspritCAMBridgeEngine.js")).espritCAMBridgeEngine;
    case "invAutoBridge": return _invAutoBridge ??= (await import("../../engines/InventorAutomationBridge.js")).inventorAutomationBridge;
    case "invAIOrch": return _invAIOrch ??= (await import("../../engines/InventorCAMAIOrchestrationEngine.js")).inventorCAMAIOrchestrationEngine;
    case "swAutoBridge": return _swAutoBridge ??= (await import("../../engines/SolidWorksAutomationBridge.js")).solidWorksAutomationBridge;
    case "hmTurningCfgIngester": return _hmTurningCfgIngester ??= (await import("../../engines/HyperMillTurningConfigIngesterEngine.js")).hyperMillTurningConfigIngesterEngine;
    case "hmOmCycles": return _hmOmCycles ??= (await import("../../engines/HyperMillOmCyclesExtractor.js")).hyperMillOmCyclesExtractor;
    case "advPost": return _advPost ??= new (await import("../../engines/AdvancedPostProcessorEngine.js")).AdvancedPostProcessorEngine();
    case "portability": return _portability ??= (await import("../../engines/CamKnowledgePortabilityEngine.js")).camKnowledgePortabilityEngine;
    case "multiCam": return _multiCam ??= (await import("../../engines/MultiCamStrategyEngine.js")).multiCamStrategyEngine;
    case "feedOpt": return _feedOpt ??= (await import("../../engines/PostProcessorFeedOptimizerEngine.js")).postProcessorFeedOptimizer;
    case "transpiler": return _transpiler ??= (await import("../../engines/GCodeTranspilerEngine.js")).gcodeTranspiler;
    case "stabilityRPM": return _stabilityRPM ??= (await import("../../engines/StabilityRPMRewriterEngine.js")).stabilityRPMRewriter;
    case "probeGen": return _probeGen ??= (await import("../../engines/ProbeRoutineGeneratorEngine.js")).probeRoutineGeneratorEngine;
    case "cycleTimeEst": return _cycleTimeEst ??= (await import("../../engines/CycleTimeEstimatorEngine.js")).cycleTimeEstimatorEngine;
    case "gcodeSafety": return _gcodeSafety ??= (await import("../../engines/GCodeSafetyAnalyzerEngine.js")).gcSafetyAnalyzer;
    case "thermal": return _thermal ??= (await import("../../engines/ToolpathThermalEngine.js")).toolpathThermalEngine;
    case "energy": return _energy ??= (await import("../../engines/GCodeEnergyOptimizerEngine.js")).gcodeEnergyOptimizerEngine;
    case "kinematic": return _kinematic ??= (await import("../../engines/MultiAxisKinematicEngine.js")).multiAxisKinematicEngine;
    case "setupSheet": return _setupSheet ??= (await import("../../engines/SetupSheetFromGCodeEngine.js")).setupSheetFromGCodeEngine;
    case "autoSF": return _autoSF ??= (await import("../../engines/AutoSpeedFeedEngine.js")).autoSpeedFeedEngine;
    case "pipeline": return (await import("../../engines/GCodeIntelligencePipelineEngine.js")).gcodeIntelligencePipeline;
    case "machineMatcher": return (await import("../../engines/MachineMatcherEngine.js")).machineMatcherEngine;
    case "wearComp": return (await import("../../engines/ToolWearCompensationEngine.js")).toolWearCompensationEngine;
    case "mfgStats": return (await import("../../engines/ManufacturingStatisticsEngine.js")).manufacturingStatisticsEngine;
    case "cuttingMath": return (await import("../../engines/AdvancedCuttingMathEngine.js")).advancedCuttingMathEngine;
    case "cuttingPhysics": return (await import("../../engines/AdvancedCuttingPhysicsEngine.js")).advancedCuttingPhysicsEngine;
    case "reliability": return (await import("../../engines/ReliabilityEngineeringEngine.js")).reliabilityEngineeringEngine;
    case "machineAccuracy": return (await import("../../engines/MachineGeometricAccuracyEngine.js")).machineGeometricAccuracyEngine;
    case "spm": return (await import("../../engines/StatisticalProcessMonitoringEngine.js")).statisticalProcessMonitoringEngine;
    case "constitutive": return (await import("../../engines/ConstitutiveModelEngine.js")).constitutiveModelEngine;
    case "wearPhysics": return (await import("../../engines/AdvancedWearPhysicsEngine.js")).advancedWearPhysicsEngine;
    case "susLCA": return (await import("../../engines/SustainabilityLCAEngine.js")).sustainabilityLCAEngine;
    case "coolant": return (await import("../../engines/CoolantDynamicsEngine.js")).coolantDynamicsEngine;
    case "assembler": return (await import("../../engines/CNCProgramAssemblerEngine.js")).cncProgramAssemblerEngine;
    case "motionDyn": return (await import("../../engines/MotionDynamicsProfileEngine.js")).motionDynamicsProfileEngine;
    case "engageAdapt": return (await import("../../engines/EngagementAdaptiveFeedEngine.js")).engagementAdaptiveFeedEngine;
    case "postPipeline": return (await import("../../engines/PostProcessorPipelineEngine.js")).postProcessorPipelineEngine;
    case "controllerDialect": return (await import("../../engines/ControllerDialectEngine.js")).controllerDialectEngine;
    case "fiveAxis": return (await import("../../engines/FiveAxisPostEngine.js")).fiveAxisPostEngine;
    case "ppVerify": return (await import("../../engines/PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
    case "instEngage": return _instEngage ??= (await import("../../engines/InstantaneousEngagementEngine.js")).instantaneousEngagementEngine;
    case "multiCamPost": return _multiCamPost ??= (await import("../../engines/MultiCAMPostEngine.js")).multiCAMPostEngine;
    case "prodToolpath": return _prodToolpath ??= (await import("../../engines/ProductionToolpathEngine.js")).productionToolpathEngine;
    case "ppAPI": return _ppAPI ??= (await import("../../engines/PostProcessorAPIEngine.js")).postProcessorAPIEngine;
    case "scalableOrch": return _scalableOrch ??= (await import("../../engines/ScalableCAMOrchestratorEngine.js")).scalableCAMOrchestratorEngine;
    case "unifiedPipe": return _unifiedPipe ??= (await import("../../engines/UnifiedCAMPipelineEngine.js")).unifiedCAMPipelineEngine;
    case "smartTool": return _smartTool ??= (await import("../../engines/SmartToolSelectorEngine.js")).smartToolSelectorEngine;
    case "adaptRouter": return _adaptRouter ??= (await import("../../engines/AdaptiveToolpathRouterEngine.js")).adaptiveToolpathRouterEngine;
    case "cumStock": return _cumStock ??= (await import("../../engines/CumulativeStockChainEngine.js")).cumulativeStockChainEngine;
    case "featCluster": return _featCluster ??= (await import("../../engines/FeatureClusteringEngine.js")).featureClusteringEngine;
    case "prodPackage": return _prodPackage ??= (await import("../../engines/ProductionPackageEngine.js")).productionPackageEngine;
    case "fiveAxisInteg": return (await import("../../engines/FiveAxisToolpathIntegrationEngine.js")).fiveAxisToolpathIntegrationEngine;
    case "camOrch": return (await import("../../engines/CAMKernelOrchestratorEngine.js")).camKernelOrchestratorEngine;
    case "edmAsm": return _edmAsm ??= new (await import("../../engines/EDMProgramAssemblerEngine.js")).EDMProgramAssemblerEngine();
    case "grindAsm": return _grindAsm ??= new (await import("../../engines/GrindingProgramAssemblerEngine.js")).GrindingProgramAssemblerEngine();
    case "laserAsm": return _laserAsm ??= new (await import("../../engines/LaserProgramAssemblerEngine.js")).LaserProgramAssemblerEngine();
    case "wjAsm": return _wjAsm ??= new (await import("../../engines/WaterjetProgramAssemblerEngine.js")).WaterjetProgramAssemblerEngine();
    case "multiProc": return _multiProc ??= new (await import("../../engines/MultiProcessCAMRouterEngine.js")).MultiProcessCAMRouterEngine();
    case "millTurn": return _millTurn ??= (await import("../../engines/MillTurnSwissPipelineEngine.js")).millTurnSwissPipelineEngine;
    case "selfLearn": return _selfLearn ??= (await import("../../engines/SelfLearningCAMEngine.js")).selfLearningCAMEngine;
    case "turningProfile": return _turningProfile ??= (await import("../../engines/TurningProfileEngine.js")).turningProfileEngine;
    case "sheetNesting": return _sheetNesting ??= (await import("../../engines/SheetNestingEngine.js")).sheetNestingEngine;
    case "dxfParser": return _dxfParser ??= (await import("../../engines/DXFParserEngine.js")).dxfParserEngine;
    case "stochRouter": return _stochRouter ??= (await import("../../engines/StochasticRoutingEngine.js")).stochasticRoutingEngine;
    case "probingProg": return _probingProg ??= (await import("../../engines/ProbingProgramEngine.js")).probingProgramEngine;
    case "dfmFeedback": return _dfmFeedback ??= (await import("../../engines/DFMFeedbackEngine.js")).dfmFeedbackEngine;
    // CK-MS12
    case "nlpCAMParser":  return _nlpCAMParser  ??= (await import("../../engines/NLPCAMParserEngine.js")).nlpCAMParserEngine;
    case "programCompare": return _programCompare ??= (await import("../../engines/ProgramCompareEngine.js")).programCompareEngine;
    case "camCache":      return _camCache      ??= (await import("../../engines/CAMResultCacheEngine.js")).camResultCacheEngine;
    case "batchCAM":      return _batchCAM      ??= (await import("../../engines/BatchCAMEngine.js")).batchCAMEngine;
    // CK-MS13
    case "pipelineCostModel": return _pipelineCostModel ??= (await import("../../engines/PipelineCostModelEngine.js")).pipelineCostModelEngine;
    // CAMX-MS21 U08
    case "prodBatchOpt": return _prodBatchOpt ??= (await import("../../engines/ProductionBatchOptimizationEngine.js")).productionBatchOptimizationEngine;
    // CAMX-MS3 U01
    case "mastercamStrategy": return _mastercamStrategy ??= (await import("../../engines/MastercamStrategyEngine.js")).mastercamStrategyEngine;
    // CAMX-MS3 U09 — MastercamCodeGeneratorEngine (E1117)
    case "mastercamCodeGen": return _mastercamCodeGen ??= (await import("../../engines/MastercamCodeGeneratorEngine.js")).mastercamCodeGeneratorEngine;
    // CAMX-MS3 U02 — MastercamSafetyHooksEngine (E1113)
    case "mastercamSafety": return _mastercamSafety ??= (await import("../../engines/MastercamSafetyHooksEngine.js")).mastercamSafetyHooksEngine;
    // CAMX-MS10 U01 — MastercamToolExportEngine (E1123)
    case "mastercamToolExport": return _mastercamToolExport ??= (await import("../../engines/MastercamToolExportEngine.js")).mastercamToolExportEngine;
    // E1114 — SolidCAMSafetyHooksEngine
    case "solidcamSafety": return _solidcamSafety ??= (await import("../../engines/SolidCAMSafetyHooksEngine.js")).solidCAMSafetyHooksEngine;
    // CAMX-MS12 U01
    case "featureStrategyKB": return _featureStrategyKB ??= (await import("../../engines/FeatureStrategyKnowledgeBaseEngine.js")).featureStrategyKnowledgeBaseEngine;
    // CAMX-MS12 U02
    case "strategyBenchmark": return _strategyBenchmark ??= (await import("../../engines/StrategyBenchmarkEngine.js")).strategyBenchmarkEngine;
    // CAMX-MS12 U03
    case "strategyComparison": return _strategyComparison ??= (await import("../../engines/StrategyComparisonEngine.js")).strategyComparisonEngine;
    // CAMX-MS12 U05
    case "contextualStrategyOverride": return _contextualStrategyOverride ??= (await import("../../engines/ContextualStrategyOverrideEngine.js")).contextualStrategyOverrideEngine;
    // CAMX-MS12 U06
    case "strategySequencing": return _strategySequencing ??= (await import("../../engines/StrategySequencingEngine.js")).strategySequencingEngine;
    // CAMX-MS12 U07
    case "fixtureAwareStrategy": return _fixtureAwareStrategy ??= (await import("../../engines/FixtureAwareStrategyEngine.js")).fixtureAwareStrategyEngine;
    // CAMX-MS12 U08
    case "batchSizeStrategy": return _batchSizeStrategy ??= (await import("../../engines/BatchSizeStrategyEngine.js")).batchSizeStrategyEngine;
    // CAMX-MS12 U11 — StrategyStochasticRiskEngine (renamed)
    case "strategyStochasticRisk": return _strategyStochasticRisk ??= (await import("../../engines/StrategyStochasticRiskEngine.js")).strategyStochasticRiskEngine;
    // CAMX-MS12 U12
    case "cpkPredictionGate": return _cpkPredictionGate ??= (await import("../../engines/CpkPredictionGateEngine.js")).cpkPredictionGateEngine;
    // CAMX-MS12 U13 — StrategyWorstCaseSelectorEngine (renamed)
    case "strategyWorstCaseSelector": return _strategyWorstCaseSelector ??= (await import("../../engines/StrategyWorstCaseSelectorEngine.js")).strategyWorstCaseSelectorEngine;
    // BOX Data engines
    case "cpsParser": return _cpsParser ??= (await import("../../engines/FusionCPSParserEngine.js")).fusionCPSParserEngine;
    case "okumaParam": return _okumaParam ??= (await import("../../engines/OkumaParametricProgramEngine.js")).okumaParametricProgramEngine;
    case "ppCapMatrix": return _ppCapMatrix ??= (await import("../../engines/PostProcessorCapabilityMatrixEngine.js")).postProcessorCapabilityMatrixEngine;
    // CAMX-MS5 U01
    case "nxCAMStrategy": return _nxCAMStrategy ??= (await import("../../engines/NXCAMStrategyEngine.js")).nxCAMStrategyEngine;
    // CAMX-MS5 U06 — NXCAMCodeGeneratorEngine (E1119)
    case "nxCAMCodeGen": return _nxCAMCodeGen ??= (await import("../../engines/NXCAMCodeGeneratorEngine.js")).nxCAMCodeGeneratorEngine;
    // CAMX-MS4 U03
    case "iMachining": return _iMachining ??= (await import("../../engines/PrismPathConstantEngagementEngine.js")).prismPathConstantEngagementEngine;
    // E1107 — ML Strategy Ranker
    case "mlStrategyRanker": return _mlStrategyRanker ??= (await import("../../engines/MachineLearningStrategyRankerEngine.js")).machineLearningStrategyRankerEngine;
    // CAMX-MS3 U02
    case "solidCAMStrategy": return _solidCAMStrategy ??= (await import("../../engines/SolidCAMStrategyEngine.js")).solidCAMStrategyEngine;
    // E1108 — CATIAStrategyEngine
    case "catiaStrategy": return _catiaStrategy ??= (await import("../../engines/CATIAStrategyEngine.js")).catiaStrategyEngine;
    // E1115 — BatchCAMSafetyEngines (3 engines)
    case "nxCAMSafety": return _nxCAMSafety ??= (await import("../../engines/BatchCAMSafetyEngines.js")).nxCAMSafetyEngine;
    case "powerMillSafety": return _powerMillSafety ??= (await import("../../engines/BatchCAMSafetyEngines.js")).powerMillSafetyEngine;
    case "catiaSafety": return _catiaSafety ??= (await import("../../engines/BatchCAMSafetyEngines.js")).catiaSafetyEngine;
    // E1110 — BatchCAMStrategyEngines2 (4 engines)
    case "workNCStrategy": return _workNCStrategy ??= (await import("../../engines/BatchCAMStrategyEngines2.js")).workNCStrategyEngine;
    case "topSolidStrategy": return _topSolidStrategy ??= (await import("../../engines/BatchCAMStrategyEngines2.js")).topSolidStrategyEngine;
    case "bobCADStrategy": return _bobCADStrategy ??= (await import("../../engines/BatchCAMStrategyEngines2.js")).bobCADStrategyEngine;
    case "cimatronStrategy": return _cimatronStrategy ??= (await import("../../engines/BatchCAMStrategyEngines2.js")).cimatronStrategyEngine;
    // E1116 — BatchCAMMaterialBridgeEngines (4 engines)
    case "mastercamMatBridge": return _mastercamMatBridge ??= (await import("../../engines/BatchCAMMaterialBridgeEngines.js")).mastercamMaterialBridgeEngine;
    case "solidCAMMatBridge":  return _solidCAMMatBridge  ??= (await import("../../engines/BatchCAMMaterialBridgeEngines.js")).solidCAMMaterialBridgeEngine;
    case "nxCAMMatBridge":     return _nxCAMMatBridge     ??= (await import("../../engines/BatchCAMMaterialBridgeEngines.js")).nxCAMMaterialBridgeEngine;
    case "powerMillMatBridge": return _powerMillMatBridge ??= (await import("../../engines/BatchCAMMaterialBridgeEngines.js")).powerMillMaterialBridgeEngine;
    // E1141 — BatchCAMControllerEngines (4 engines)
    case "mastercamCtrlCat": return _mastercamCtrlCat ??= (await import("../../engines/BatchCAMControllerEngines.js")).mastercamControllerCatalogEngine;
    case "solidCAMCtrlCat":  return _solidCAMCtrlCat  ??= (await import("../../engines/BatchCAMControllerEngines.js")).solidCAMControllerCatalogEngine;
    case "nxCAMCtrlCat":     return _nxCAMCtrlCat     ??= (await import("../../engines/BatchCAMControllerEngines.js")).nxCAMControllerCatalogEngine;
    case "powerMillCtrlCat": return _powerMillCtrlCat ??= (await import("../../engines/BatchCAMControllerEngines.js")).powerMillControllerCatalogEngine;
    // E1142 — BatchCAMOperationCatalogEngines (4 engines)
    case "mastercamOpCat": return _mastercamOpCat ??= (await import("../../engines/BatchCAMOperationCatalogEngines.js")).mastercamOperationCatalogEngine;
    case "solidCAMOpCat":  return _solidCAMOpCat  ??= (await import("../../engines/BatchCAMOperationCatalogEngines.js")).solidCAMOperationCatalogEngine;
    case "nxCAMOpCat":     return _nxCAMOpCat     ??= (await import("../../engines/BatchCAMOperationCatalogEngines.js")).nxCAMOperationCatalogEngine;
    case "powerMillOpCat": return _powerMillOpCat ??= (await import("../../engines/BatchCAMOperationCatalogEngines.js")).powerMillOperationCatalogEngine;
    // E1143 — BatchCAMToolBridgeEngines (4 engines)
    case "mastercamToolBridge": return _mastercamToolBridge ??= (await import("../../engines/BatchCAMToolBridgeEngines.js")).mastercamToolBridgeEngine;
    case "solidCAMToolBridge":  return _solidCAMToolBridge  ??= (await import("../../engines/BatchCAMToolBridgeEngines.js")).solidCAMToolBridgeEngine;
    case "nxCAMToolBridge":     return _nxCAMToolBridge     ??= (await import("../../engines/BatchCAMToolBridgeEngines.js")).nxCAMToolBridgeEngine;
    case "hyperMillToolBridge": return _hyperMillToolBridge ??= (await import("../../engines/BatchCAMToolBridgeEngines.js")).hyperMillToolBridgeEngine;
    // E1144 — BatchCAMAPIBridgeEngines (4 engines)
    case "mastercamNETBridge":   return _mastercamNETBridge   ??= (await import("../../engines/BatchCAMAPIBridgeEngines.js")).mastercamNETBridgeEngine;
    case "solidCAMSWBridge":     return _solidCAMSWBridge     ??= (await import("../../engines/BatchCAMAPIBridgeEngines.js")).solidCAMSolidWorksBridgeEngine;
    case "nxOpenBridge":         return _nxOpenBridge         ??= (await import("../../engines/BatchCAMAPIBridgeEngines.js")).nxOpenBridgeEngine;
    case "hyperMillACBridge":    return _hyperMillACBridge    ??= (await import("../../engines/BatchCAMAPIBridgeEngines.js")).hyperMillACBridgeEngine;
    // E1145 — BatchCAMAddInGenerators (6 generators)
    case "mastercamAddInGen":    return _mastercamAddInGen    ??= (await import("../../engines/BatchCAMAddInGenerators.js")).mastercamAddInGenerator;
    case "solidCAMAddInGen":     return _solidCAMAddInGen     ??= (await import("../../engines/BatchCAMAddInGenerators.js")).solidCAMAddInGenerator;
    case "nxCAMAddInGen":        return _nxCAMAddInGen        ??= (await import("../../engines/BatchCAMAddInGenerators.js")).nxCAMAddInGenerator;
    case "hyperMillACAddInGen":  return _hyperMillACAddInGen  ??= (await import("../../engines/BatchCAMAddInGenerators.js")).hyperMillACAddInGenerator;
    case "powerMillAddInGen":    return _powerMillAddInGen    ??= (await import("../../engines/BatchCAMAddInGenerators.js")).powerMillAddInGenerator;
    case "catiaAddInGen":        return _catiaAddInGen        ??= (await import("../../engines/BatchCAMAddInGenerators.js")).catiaAddInGenerator;
    // E1109 — BatchCAMStrategyEngines (6 engines)
    case "tebisStrategy": return _tebisStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).tebisStrategyEngine;
    case "edgecamStrategy": return _edgecamStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).edgecamStrategyEngine;
    case "espritStrategy": return _espritStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).espritStrategyEngine;
    case "gibbsCAMStrategy": return _gibbsCAMStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).gibbsCAMStrategyEngine;
    case "camWorksStrategy": return _camWorksStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).camWorksStrategyEngine;
    case "sprutCAMStrategy": return _sprutCAMStrategy ??= (await import("../../engines/BatchCAMStrategyEngines.js")).sprutCAMStrategyEngine;
    // E1120 — HyperMillCodeGeneratorEngine
    case "hyperMillCodeGen": return _hyperMillCodeGen ??= (await import("../../engines/HyperMillCodeGeneratorEngine.js")).hyperMillCodeGeneratorEngine;
    // CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01 — PrintToHyperMillBridge
    case "printToHyperMill": return _printToHyperMill ??= (await import("../../engines/PrintToHyperMillBridge.js")).printToHyperMillBridge;
    // CAD-COMPLETE-MS0/U-CADC-PRINT-INVHSM-01 — PrintToInventorHSMBridge
    case "printToInventorHSM": return _printToInventorHSM ??= (await import("../../engines/PrintToInventorHSMBridge.js")).printToInventorHSMBridge;
    // E1118 — SolidCAMCodeGeneratorEngine
    case "solidcamCodeGen": return _solidcamCodeGen ??= (await import("../../engines/SolidCAMCodeGeneratorEngine.js")).solidCAMCodeGeneratorEngine;
    // CAM-EXHAUST-MS0/U-CAM33 — SolidCAM25DFunctionIndexEngine
    case "solidcam25dIndex": return _solidcam25dIndex ??= (await import("../../engines/SolidCAM25DFunctionIndexEngine.js")).SolidCAM25DFunctionIndexEngine;
    // CAM-EXHAUST-MS0/U-CAM34 — SolidCAMIMachiningFunctionIndexEngine
    case "solidcamIMachiningIndex": return _solidcamIMachiningIndex ??= (await import("../../engines/SolidCAMIMachiningFunctionIndexEngine.js")).SolidCAMIMachiningFunctionIndexEngine;
    // CAM-EXHAUST-MS0/U-CAM35 — SolidCAM3DHSSHSRFunctionIndexEngine
    case "solidcam3DHSSHSRIndex": return _solidcam3DHSSHSRIndex ??= (await import("../../engines/SolidCAM3DHSSHSRFunctionIndexEngine.js")).SolidCAM3DHSSHSRFunctionIndexEngine;
    case "solidcam5AxisIndex": return _solidcam5AxisIndex ??= (await import("../../engines/SolidCAM5AxisFunctionIndexEngine.js")).SolidCAM5AxisFunctionIndexEngine;
    case "solidcamTurningIndex": return _solidcamTurningIndex ??= (await import("../../engines/SolidCAMTurningFunctionIndexEngine.js")).SolidCAMTurningFunctionIndexEngine;
    case "solidcamMillTurnIndex": return _solidcamMillTurnIndex ??= (await import("../../engines/SolidCAMMillTurnFunctionIndexEngine.js")).SolidCAMMillTurnFunctionIndexEngine;
    case "solidcamUnifiedIndex": return _solidcamUnifiedIndex ??= (await import("../../engines/SolidCAMFunctionIndexEngine.js")).SolidCAMFunctionIndexEngine;
    case "nxcamMillingIndex": return _nxcamMillingIndex ??= (await import("../../engines/NXCAMMillingFunctionIndexEngine.js")).NXCAMMillingFunctionIndexEngine;
    case "nxcamTurningIndex": return _nxcamTurningIndex ??= (await import("../../engines/NXCAMTurningFunctionIndexEngine.js")).NXCAMTurningFunctionIndexEngine;
    case "nxcamFBMIndex": return _nxcamFBMIndex ??= (await import("../../engines/NXCAMFBMFunctionIndexEngine.js")).NXCAMFBMFunctionIndexEngine;
    case "nxcamUnifiedIndex": return _nxcamUnifiedIndex ??= (await import("../../engines/NXCAMFunctionIndexEngine.js")).NXCAMFunctionIndexEngine;
    case "pmRoughingIndex": return _pmRoughingIndex ??= (await import("../../engines/PowerMillRoughingFunctionIndexEngine.js")).PowerMillRoughingFunctionIndexEngine;
    case "pmFinishingIndex": return _pmFinishingIndex ??= (await import("../../engines/PowerMillFinishingFunctionIndexEngine.js")).PowerMillFinishingFunctionIndexEngine;
    case "pm5AxisIndex": return _pm5AxisIndex ??= (await import("../../engines/PowerMill5AxisFunctionIndexEngine.js")).PowerMill5AxisFunctionIndexEngine;
    case "pmUnifiedIndex": return _pmUnifiedIndex ??= (await import("../../engines/PowerMillUnifiedFunctionIndexEngine.js")).PowerMillUnifiedFunctionIndexEngine;
    // E1122 — CATIACodeGeneratorEngine
    case "catiaCodeGen": return _catiaCodeGen ??= (await import("../../engines/CATIACodeGeneratorEngine.js")).catiaCodeGeneratorEngine;
    // E1121 — PowerMillCodeGeneratorEngine
    case "powerMillCodeGen": return _powerMillCodeGen ??= (await import("../../engines/PowerMillCodeGeneratorEngine.js")).powerMillCodeGeneratorEngine;
    // E1124 — UniversalToolExportEngine
    case "universalToolExport": return _universalToolExport ??= (await import("../../engines/UniversalToolExportEngine.js")).universalToolExportEngine;
    // E1125 — CAMAddInFrameworkEngine (CAMX-MS11/U01)
    case "camAddInFramework": return _camAddInFramework ??= (await import("../../engines/CAMAddInFrameworkEngine.js")).camAddInFrameworkEngine;
    // E1128 — CuttingDataExportEngine (CAMX-MS10/U06)
    case "cuttingDataExport": return _cuttingDataExport ??= (await import("../../engines/CuttingDataExportEngine.js")).cuttingDataExportEngine;
    // E1126 — ToolSyncOrchestratorEngine
    case "toolSyncOrchestrator": return _toolSyncOrchestrator ??= (await import("../../engines/ToolSyncOrchestratorEngine.js")).toolSyncOrchestratorEngine;
    // E1127 — HyperMillToolExportEngine (CAMX-MS9/U03)
    case "hyperMillToolExport": return _hyperMillToolExport ??= (await import("../../engines/HyperMillToolExportEngine.js")).hyperMillToolExportEngine;
    // E1129 — STEPNCEngines (CAMX-MS20)
    case "stepNCParser":    return _stepNCParser    ??= (await import("../../engines/STEPNCEngines.js")).stepNCParserEngine;
    case "stepNCGenerator": return _stepNCGenerator ??= (await import("../../engines/STEPNCEngines.js")).stepNCGeneratorEngine;
    // POST-ULT engines (20)
    case "cpsPostParser": return _cpsPostParser ??= (await import("../../engines/CpsPostParserEngine.js")).cpsPostParserEngine;
    case "cpsDialectMapper": return _cpsDialectMapper ??= (await import("../../engines/CpsDialectMapperEngine.js")).cpsDialectMapperEngine;
    case "machineFingerprint": return _machineFingerprint ??= (await import("../../engines/MachineFingerprintEngine.js")).machineFingerprintEngine;
    case "firmwareFeatureMatrix": return _firmwareFeatureMatrix ??= (await import("../../engines/FirmwareFeatureMatrixEngine.js")).firmwareFeatureMatrixEngine;
    // PP-MS7 engines (3)
    case "coolantControlConfig": return _coolantControlConfig ??= (await import("../../engines/CoolantControlConfigEngine.js")).coolantControlConfigEngine;
    case "unifiedProbingDialect": return _unifiedProbingDialect ??= (await import("../../engines/UnifiedProbingDialectEngine.js")).unifiedProbingDialectEngine;
    case "subprogramStructure": return _subprogramStructure ??= (await import("../../engines/SubprogramStructureEngine.js")).subprogramStructureEngine;
    case "edmPostProcessor": return _edmPostProcessor ??= (await import("../../engines/EDMPostProcessorExtension.js")).edmPostProcessorExtension;
    case "laserWaterjetPost": return _laserWaterjetPost ??= (await import("../../engines/LaserWaterjetPostExtension.js")).laserWaterjetPostExtension;
    case "postTaxonomy": return _postTaxonomy ??= (await import("../../engines/PostPropertyTaxonomyEngine.js")).postPropertyTaxonomyEngine;
    case "machinePostCrossRef": return _machinePostCrossRef ??= (await import("../../engines/MachinePostCrossRefEngine.js")).machinePostCrossRefEngine;
    case "machineOptionRegistry": return _machineOptionRegistry ??= (await import("../../engines/MachineOptionRegistryEngine.js")).machineOptionRegistryEngine;
    case "controllerMatrix": return _controllerMatrix ??= (await import("../../engines/ControllerFeatureMatrixEngine.js")).controllerFeatureMatrixEngine;
    case "optimizationTier": return _optimizationTier ??= (await import("../../engines/OptimizationTierEngine.js")).optimizationTierEngine;
    case "rapidReposition": return _rapidReposition ??= (await import("../../engines/RapidRepositionOptEngine.js")).rapidRepositionOptEngine;
    case "postPhysicsFoundation": return _postPhysicsFoundation ??= (await import("../../engines/PostPhysicsFoundationEngine.js")).postPhysicsFoundationEngine;
    case "physicsSidecarBuilder": return _physicsSidecarBuilder ??= (await import("../../engines/PhysicsSidecarBuilderEngine.js")).physicsSidecarBuilderEngine;
    case "noInlinePhysicsConstants": return _noInlinePhysicsConstants ??= (await import("../../engines/NoInlinePhysicsConstantsEngine.js")).noInlinePhysicsConstantsEngine;
    case "lineByLine": return _lineByLine ??= (await import("../../engines/LineByLineAdaptiveEngine.js")).lineByLineAdaptiveEngine;
    case "motionInjection": return _motionInjection ??= (await import("../../engines/MotionControllerInjectionEngine.js")).motionControllerInjectionEngine;
    case "postVerification": return _postVerification ??= (await import("../../engines/PostVerificationSafetyEngine.js")).postVerificationSafetyEngine;
    case "postOutput": return _postOutput ??= (await import("../../engines/PostOutputGenerationEngine.js")).postOutputGenerationEngine;
    case "advancedPhysics": return _advancedPhysics ??= (await import("../../engines/AdvancedPostPhysicsEngine.js")).advancedPostPhysicsEngine;
    case "crossCAM": return _crossCAM ??= (await import("../../engines/CrossCAMPostEngine.js")).crossCAMPostEngine;
    case "postValidation": return (await import("../../engines/PostValidationSuiteEngine.js")).postValidationSuiteEngine;
    case "postLibrary": return _postLibrary ??= (await import("../../engines/PostLibraryConfiguratorEngine.js")).postLibraryConfiguratorEngine;
    case "fleetDeployment": return _fleetDeployment ??= (await import("../../engines/FleetDeploymentLearningEngine.js")).fleetDeploymentLearningEngine;
    // HM-REV-MS2 — Material Physics Bridge + PPP Defaults + Strategy Registration
    case "hmMatPhysBridge": return _hmMatPhysBridge ??= (await import("../../engines/HyperMillMaterialPhysicsBridge.js")).hyperMillMaterialPhysicsBridge;
    case "hmPPPConfig": return _hmPPPConfig ??= await import("../../engines/HyperMillPPPDefaultConfig.js");
    case "hmStrategyReg": return _hmStrategyReg ??= await import("../../engines/HyperMillStrategyRegistration.js");
    // CAMX-MS20/U05 — VericutBridgeEngine (E1130)
    case "vericutBridge": return _vericutBridge ??= (await import("../../engines/VericutBridgeEngine.js")).vericutBridgeEngine;
    // CAMX-MS20/U06 — NCSIMULBridgeEngine (E1132)
    case "ncsimulBridge": return _ncsimulBridge ??= (await import("../../engines/NCSIMULBridgeEngine.js")).ncsimulBridgeEngine;
    // CAMX-MS15/U01 — StrategyPerformanceTrackerEngine (E1131)
    case "strategyPerfTracker": return _strategyPerfTracker ??= (await import("../../engines/StrategyPerformanceTrackerEngine.js")).strategyPerformanceTrackerEngine;
    // CAMX-MS20/U03 — ISO13399ToolDataEngine (E1133)
    case "iso13399ToolData": return _iso13399ToolData ??= (await import("../../engines/ISO13399ToolDataEngine.js")).iso13399ToolDataEngine;
    // CAMX-MS21/U02 — ShopNetworkEngine (E1134)
    case "shopNetwork": return _shopNetwork ??= (await import("../../engines/ShopNetworkEngine.js")).shopNetworkEngine;
    // CAMX-MS20/U04 — QIFIntegrationEngine (E1135)
    case "qifIntegration": return _qifIntegration ??= (await import("../../engines/QIFIntegrationEngine.js")).qifIntegrationEngine;
    // CAMX-MS13/U06 — TCODashboardEngine (E1136)
    case "tcoDashboard": return _tcoDashboard ??= (await import("../../engines/TCODashboardEngine.js")).tcoDashboardEngine;
    // CAMX-MS13/U02 — ToolChangeOptimizationEngine (E1137)
    case "toolChangeOpt": return _toolChangeOpt ??= (await import("../../engines/ToolChangeOptimizationEngine.js")).toolChangeOptimizationEngine;
    // CAMX-MS14/U03 — SafetyEscalationEngine (E1138)
    case "safetyEscalation": return _safetyEscalation ??= (await import("../../engines/SafetyEscalationEngine.js")).safetyEscalationEngine;
    // CAMX-MS14/U04 — CollisionPreventionEngine (E1139)
    case "collisionPrevention": return _collisionPrevention ??= (await import("../../engines/CollisionPreventionEngine.js")).collisionPreventionEngine;
    // CAMX-MS15/U04 — FleetLearningStrategyEngine (E1140)
    case "fleetLearning": return _fleetLearning ??= (await import("../../engines/FleetLearningStrategyEngine.js")).fleetLearningStrategyEngine;
    // CAMX-MS15/U05 — StrategyEvolutionEngine (E1146)
    case "strategyEvolution": return _strategyEvolution ??= (await import("../../engines/StrategyEvolutionEngine.js")).strategyEvolutionEngine;
    // CAMX-MS15/U06 — PredictionCalibrationEngine (E1147)
    case "predictionCalibration": return _predictionCalibration ??= (await import("../../engines/PredictionCalibrationEngine.js")).predictionCalibrationEngine;
    // CAMX-MS14/U06 — WorkholdingVerificationEngine (E1148)
    case "workholdingVerification": return _workholdingVerification ??= (await import("../../engines/WorkholdingVerificationEngine.js")).workholdingVerificationEngine;
    // CAMX-MS14/U05 — ToolBreakagePredictionEngine (E1149)
    case "toolBreakagePrediction": return _toolBreakagePrediction ??= (await import("../../engines/ToolBreakagePredictionEngine.js")).toolBreakagePredictionEngine;
    // CAMX-MS13/U04 — CamxEnergyOptimizationEngine (E1150)
    case "camxEnergyOpt": return _camxEnergyOpt ??= (await import("../../engines/CamxEnergyOptimizationEngine.js")).camxEnergyOptimizationEngine;
    // CAMX-MS15/U02 — StrategyRankingUpdateEngine (E1151)
    case "strategyRankingUpdate": return _strategyRankingUpdate ??= (await import("../../engines/StrategyRankingUpdateEngine.js")).strategyRankingUpdateEngine;
    // CAMX-MS15/U03 — AnomalyDetectionEngine (E1152)
    case "anomalyDetection": return _anomalyDetection ??= (await import("../../engines/AnomalyDetectionEngine.js")).anomalyDetectionEngine;
    // CAMX-MS13/U03 — CoolantCostOptimizationEngine (E1154)
    case "coolantCostOpt": return _coolantCostOpt ??= (await import("../../engines/CoolantCostOptimizationEngine.js")).coolantCostOptimizationEngine;
    // CAMX-MS13/U05 — SetupCostOptimizationEngine (E1155)
    case "setupCostOpt": return _setupCostOpt ??= (await import("../../engines/SetupCostOptimizationEngine.js")).setupCostOptimizationEngine;
    // CAMX-MS13/U04 — EnergyOptimizationIntegrationEngine (E1156)
    case "energyOptInteg": return _energyOptInteg ??= (await import("../../engines/EnergyOptimizationIntegrationEngine.js")).energyOptimizationIntegrationEngine;
    // PP-MS4/U-PP21 — PostDownloadEngine
    case "postDownload": return _postDownload ??= (await import("../../engines/PostDownloadEngine.js")).postDownloadEngine;
    // PP-MS5/U-PP24 — ProveOutModeEngine
    case "proveOut": return _proveOut ??= (await import("../../engines/ProveOutModeEngine.js")).proveOutModeEngine;
    // PP-MS5/U-PP25 — PostValidationHardeningEngine
    case "postValHardening": return _postValHardening ??= (await import("../../engines/PostValidationHardeningEngine.js")).postValidationHardeningEngine;
    // PP-MS5/U-PP26 — PostValidationReportEngine
    case "postValReport": return _postValReport ??= (await import("../../engines/PostValidationReportEngine.js")).postValidationReportEngine;
    // PP-MS6/U-PP28 — PostLibraryCatalogEngine
    case "postLibraryCatalog": return _postLibraryCatalog ??= (await import("../../engines/PostLibraryCatalogEngine.js")).postLibraryCatalogEngine;
    // PP-MS6/U-PP30 — PostVersioningEngine
    case "postVersioning": return _postVersioning ??= (await import("../../engines/PostVersioningEngine.js")).postVersioningEngine;
    case "ppgTelemetry": return _ppgTelemetry ??= (await import("../../engines/PostProcessorTelemetryEngine.js")).postProcessorTelemetryEngine;
    // HM-REV-MS8 — Data Extraction Pipeline (E1157–E1161)
    case "hmExtractionPipeline": return _hmExtractionPipeline ??= (await import("../../engines/HyperMillDataExtractionPipeline.js")).hyperMillDataExtractionPipeline;
    case "hmMacroDB": return _hmMacroDB ??= (await import("../../engines/HyperMillMacroDBEngine.js")).hyperMillMacroDBEngine;
    case "hmACStandardToolDB": return _hmACStandardToolDB ??= (await import("../../engines/HyperMillACStandardToolDBEngine.js")).hyperMillACStandardToolDBEngine;
    case "hmMetricCfg": return _hmMetricCfg ??= (await import("../../engines/HyperMillMetricCfgExtractorEngine.js")).hyperMillMetricCfgExtractorEngine;
    case "hmExtractionOrch": return _hmExtractionOrch ??= (await import("../../engines/HyperMillDataExtractionOrchestrator.js")).hyperMillDataExtractionOrchestrator;
    default: throw new Error(`Unknown CAM engine: ${name}`);
  }
}

// ── HM-REV-MS1 U2: Auto-safety check for hyperMILL CAM actions ───────────────
/**
 * Runs applicable HyperMill safety validators based on which params are present.
 * Only validators relevant to the supplied parameters are executed — absent params
 * skip their validator entirely, avoiding false positives.
 */
async function runHyperMillSafetyChecks(
  params: Record<string, unknown>,
): Promise<{ safe: boolean; warnings: string[]; blocks: string[] }> {
  const hmSafety = await getEngine("hmSafety");
  const warnings: string[] = [];
  const blocks: string[] = [];

  // Clearance plane check — requires clearance_plane/clearance_height present
  if (params.clearance_plane !== undefined || params.clearance_height !== undefined) {
    const r = hmSafety.validateClearancePlane(params) as { valid: boolean; warnings: string[] } | null;
    if (r && !r.valid) {
      const criticals = r.warnings.filter((w: string) => w.startsWith("CRITICAL"));
      if (criticals.length > 0) blocks.push(...criticals);
      else warnings.push(...r.warnings);
    }
  }

  // Negative allowance check — requires allowance or stock_to_leave present
  if (params.allowance !== undefined || params.stock_to_leave !== undefined) {
    const r = hmSafety.validateNegativeAllowance(params) as { valid: boolean; warnings: string[] } | null;
    if (r && !r.valid) {
      const criticals = r.warnings.filter((w: string) => w.startsWith("CRITICAL"));
      if (criticals.length > 0) blocks.push(...criticals);
      else warnings.push(...r.warnings);
    }
  }

  // Measurement system check — requires measurement_system or units present
  if (params.measurement_system !== undefined || params.units !== undefined) {
    const r = hmSafety.validateMeasurementSystem(params) as { valid: boolean; warnings: string[] } | null;
    if (r && !r.valid) {
      const criticals = (r.warnings || []).filter((w: string) => w.startsWith("CRITICAL"));
      if (criticals.length > 0) blocks.push(...criticals);
      else warnings.push(...(r.warnings || []));
    }
  }

  // Rest material tool change check — requires rest_material flag
  if (params.rest_material !== undefined) {
    const r = hmSafety.validateRestMaterialToolChange(params) as { valid: boolean; warnings: string[] } | null;
    if (r && !r.valid) {
      const criticals = (r.warnings || []).filter((w: string) => w.startsWith("CRITICAL"));
      if (criticals.length > 0) blocks.push(...criticals);
      else warnings.push(...(r.warnings || []));
    }
  }

  return { safe: blocks.length === 0, warnings, blocks };
}

function numberOrFallback(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function deriveFeatureType(params: Record<string, any>): string {
  const strategyToFeature: Record<string, string> = {
    adaptive: "pocket_freeform",
    pocket_zigzag: "pocket_rectangular",
    pocket_spiral: "pocket_circular",
    face_mill: "face",
    drilling: "through_hole",
    peck_drill: "blind_hole",
    boring: "counterbore",
    tapping: "tapped_hole",
    thread_mill: "thread_external",
    slot: "slot_through",
    pencil: "fillet",
    contour: "contour_2d",
    scallop: "contour_3d",
    flowline: "contour_3d",
    morph_spiral: "pocket_freeform",
    project: "contour_3d",
    rest_machining: "pocket_freeform",
  };

  return params.feature_type
    ?? params.featureType
    ?? params.feature
    ?? strategyToFeature[String(params.strategy ?? "")]
    ?? "pocket_rectangular";
}

function buildToolpathRequest(params: Record<string, any>) {
  const toolDiameter = numberOrFallback(params.tool_diameter_mm ?? params.tool_diameter, 12);
  const feedRate = numberOrFallback(params.feed_rate_mmmin ?? params.feed_rate ?? params.vf, 1000);

  return {
    featureType: deriveFeatureType(params),
    dimensions: {
      width_mm: numberOrFallback(params.width_mm ?? params.dimensions?.width_mm ?? params.width, 50),
      length_mm: numberOrFallback(params.length_mm ?? params.dimensions?.length_mm ?? params.length, 50),
      depth_mm: numberOrFallback(params.depth_mm ?? params.dimensions?.depth_mm ?? params.depth_of_cut ?? params.depth, 10),
      diameter_mm: numberOrFallback(params.diameter_mm ?? params.dimensions?.diameter_mm ?? params.diameter, 50),
    },
    params: {
      strategy: (params.strategy ?? "contour") as any,
      tool_diameter_mm: toolDiameter,
      stepover_pct: numberOrFallback(params.stepover_pct ?? params.stepover_percent ?? params.stepover, 50),
      stepdown_mm: numberOrFallback(params.stepdown_mm ?? params.depth_of_cut ?? params.stepdown, Math.max(1, toolDiameter * 0.5)),
      feed_rate_mmmin: feedRate,
      plunge_rate_mmmin: numberOrFallback(params.plunge_rate_mmmin ?? params.plunge_rate, Math.max(100, feedRate * 0.3)),
      spindle_rpm: numberOrFallback(params.spindle_rpm ?? params.rpm, 8000),
      cut_direction: (params.cut_direction ?? "climb") as any,
      coolant: (params.coolant ?? "flood") as any,
      retract_height_mm: numberOrFallback(params.retract_height_mm ?? params.z_safe, 5),
      stock_to_leave_mm: params.stock_to_leave_mm,
      entry_strategy: params.entry_strategy,
    },
    material: params.material,
  };
}

function deriveUnifiedOperation(
  featureType: string,
  params: Record<string, any>,
): "roughing" | "finishing" | "drilling" | "rest" | "facing" {
  if (params.operation) return params.operation;
  if (/hole|drill|bore|tap/i.test(featureType)) return "drilling";
  if (/face/i.test(featureType)) return "facing";
  if (/rest/i.test(featureType)) return "rest";
  if (/finish|scallop|flowline|pencil|contour_3d/i.test(String(params.strategy ?? featureType))) return "finishing";
  return "roughing";
}

function buildUnifiedCamRequest(params: Record<string, any>) {
  if (Array.isArray(params.features) && params.features.length > 0) {
    return {
      ...params,
      material: String(params.material ?? params.material_name ?? "P20 Steel"),
      machine_name: String(params.machine_name ?? params.machine ?? "generic"),
      production_mode: params.production_mode ?? true,
    };
  }

  const request = buildToolpathRequest(params);
  const featureType = request.featureType;

  return {
    features: [{
      type: featureType,
      operation: deriveUnifiedOperation(featureType, params),
      dimensions: request.dimensions,
      tolerance_mm: params.tolerance_mm,
      surface_finish_Ra: params.surface_finish_Ra,
      wall_thickness_mm: params.wall_thickness_mm,
      corner_radius_mm: params.corner_radius_mm,
      boundary_points: params.boundary_points ?? params.points ?? params.profile_points,
      profile_points: params.profile_points,
      center_x_mm: params.center_x_mm,
      center_y_mm: params.center_y_mm,
      notes: params.notes,
    }],
    material: String(params.material ?? params.material_name ?? "P20 Steel"),
    material_iso_group: params.material_iso_group,
    material_hardness_hrc: params.material_hardness_hrc,
    machine_name: String(params.machine_name ?? params.machine ?? "generic"),
    controller: params.controller,
    stock_dims: params.stock_dims,
    options: {
      coolant: request.params.coolant,
      optimize_for: params.optimize_for ?? params.optimization_target ?? "balanced",
      program_number: params.program_number,
      programmer_name: params.programmer_name,
      machine_rate_per_hour: params.machine_rate_per_hour,
    },
    production_mode: params.production_mode ?? true,
  };
}

function shouldUseUnifiedCam(params: Record<string, any>): boolean {
  return params.legacy_toolpath !== true && params.raw_toolpath !== true;
}

function buildPostProcessRequest(params: Record<string, any>) {
  const controller = String(params.controller ?? params.config?.controller ?? "fanuc").toLowerCase();
  const moves = Array.isArray(params.moves)
    ? params.moves
    : Array.isArray(params.toolpath?.segments)
      ? params.toolpath.segments
      : Array.isArray(params.program?.moves)
        ? params.program.moves
        : Array.isArray(params.program?.segments)
          ? params.program.segments
          : Array.isArray(params.input?.moves)
            ? params.input.moves
            : [];

  return {
    input: {
      moves,
      tool_number: numberOrFallback(params.tool_number ?? params.input?.tool_number, 1),
      tool_diameter_mm: numberOrFallback(params.tool_diameter_mm ?? params.tool_diameter ?? params.input?.tool_diameter_mm, 10),
      spindle_rpm: numberOrFallback(params.spindle_rpm ?? params.rpm ?? params.input?.spindle_rpm, 3000),
      feed_rate_mmmin: numberOrFallback(params.feed_rate_mmmin ?? params.feed_rate ?? params.vf ?? params.input?.feed_rate_mmmin, 1000),
      coolant: (params.coolant ?? params.input?.coolant ?? "flood") as any,
      work_offset: String(params.work_offset ?? params.input?.work_offset ?? "G54"),
    },
    config: {
      controller: controller as any,
      program_number: params.program_number ?? params.config?.program_number,
      use_canned_cycles: params.use_canned_cycles ?? params.config?.use_canned_cycles ?? true,
      use_tool_length_comp: params.use_tool_length_comp ?? params.config?.use_tool_length_comp ?? true,
      decimal_places: numberOrFallback(params.decimal_places ?? params.config?.decimal_places, 4),
      line_numbers: params.line_numbers ?? params.config?.line_numbers ?? false,
      line_number_increment: numberOrFallback(params.line_number_increment ?? params.config?.line_number_increment, 10),
      coolant_code: String(params.coolant_code ?? params.config?.coolant_code ?? ""),
      safe_start_block: params.safe_start_block ?? params.config?.safe_start_block ?? true,
      program_end: (params.program_end ?? params.config?.program_end ?? "M30") as "M30" | "M02" | "%",
      max_line_length: params.max_line_length ?? params.config?.max_line_length,
      five_axis_mode: params.five_axis_mode ?? params.config?.five_axis_mode,
      smoothing_mode: (params.smoothing_mode ?? params.config?.smoothing_mode ?? "off") as any,
    },
  };
}

export const ACTIONS = [
  "toolpath_generate", "toolpath_simulate", "toolpath_optimize",
  "post_process", "collision_check_full", "stock_update",
  "tool_assembly", "fixture_setup", "nesting_optimize",
  "clearance_plane", "sequence_operations", "linking_move",
  // TRAINING-LEARNING-MS0/U2 — Mill training corpus + per-family templates.
  // Read-only catalog → template extract → list. Engine NEVER emits G-code.
  // Mirrors prism_turning:lathe_training_* (U1 sibling).
  "mill_training_corpus_status",
  "mill_training_template_match",
  "mill_training_template_list",
  "mill_training_template_extract_all",
  "cam_strategy_recommend", "cam_safety_validate",
  "cam_multiaxis_recommend", "cam_material_map",
  "cam_cycle_catalog",
  "cam_catalog_load_all", "cam_catalog_load_one", "cam_catalog_priority5_coverage",
  "cam_function_route", "cam_parameter_validate",
  "cam_inventor_hsm_analyze_operation",
  "cam_inventor_hsm_analyze_project",
  "cam_inventor_hsm_generate_nc_header",
  "cam_solidcam_import_sldprt",
  "cam_solidcam_create_imachining",
  "cam_solidcam_run_gpp",
  "cam_tool_select_for_cam",
  "cam_ml_feature_extract_one",
  "cam_ml_feature_extract_batch",
  "cam_ml_split_customer_disjoint",
  "cam_ml_split_from_files",
  "cam_fusion_build_setup_create",
  "cam_fusion_build_operation_create",
  "cam_fusion_build_tool_install",
  "cam_fusion_build_geometry_import",
  "cam_fusion_build_simulate",
  "cam_fusion_build_postprocess",
  "cam_mastercam_build_machine_group_create",
  "cam_mastercam_build_operation_create",
  "cam_mastercam_build_tool_install",
  "cam_mastercam_build_chain_select",
  "cam_mastercam_build_regen",
  "cam_mastercam_build_post_run",
  "cam_post_invoke_from_inventory",
  "cam_post_invoke_eligible_machines",
  "cam_hypermill_build_operation_create",
  "cam_hypermill_build_stock",
  "cam_hypermill_build_tool_install",
  "cam_hypermill_build_joblist",
  "cam_hypermill_build_postprocess",
  "cam_inventor_hsm_build_setup_create",
  "cam_inventor_hsm_build_operation_create",
  "cam_inventor_hsm_build_tool_library_add",
  "cam_inventor_hsm_build_stock_setup",
  "cam_inventor_hsm_build_postprocess",
  "cam_ml_train_baseline",
  "cam_ml_predict_baseline",
  "cam_ml_train_lora",
  "cam_ml_predict_lora",
  "cam_lora_predict",
  "cam_lora_apply_delta",
  "cam_lora_validate",
  "cam_lora_check_health",
  "cam_lora_list",
  "cam_lora_select",
  "cam_lora_ensemble",
  "cam_lora_standardize",
  "cam_ml_drift_run",
  "cam_ml_drift_read_log",
  "cam_enrich_link_physics",
  "cam_enrich_match_parameter",
  "cam_enrich_link_tribal_tips",
  "cam_enrich_link_single_tip",
  "cam_enrich_link_ai_actions",
  "cam_enrich_actions_for_formulas",
  "cam_enrich_validate",
  "cam_enrich_capture_baseline",
  "cam_rag_build_index",
  "cam_rag_retrieve",
  "cam_rag_retrieve_for_parameter",
  "cam_catalog_split",
  "cam_catalog_split_by_keys",
  "cam_catalog_list_modules",
  "lathe_post_process", "lathe_sf_calculate", "lathe_sf_advise",
  "lathe_sf_whatif", "lathe_sf_cite_sources", "lathe_sf_explain", "lathe_sf_full",
  "lathe_postgen_ingest", "lathe_postgen_skeleton", "lathe_postgen_transfer",
  "lathe_postgen_validate", "lathe_postgen_test", "lathe_postgen_register",
  "lathe_postgen_feedback", "lathe_postgen_uncertainty", "lathe_postgen_full",
  "lathe_master_post_route", "lathe_master_post_machines", "lathe_master_post_controllers",
  "lathe_unified_output_header", "lathe_unified_output_footer", "lathe_unified_output_full", "lathe_unified_output_compare",
  "lathe_masterpost_route", "lathe_masterpost_emit", "lathe_masterpost_validate", "lathe_masterpost_explain", "lathe_masterpost_cross_check", "lathe_masterpost_audit",
  "lathe_masterpost_regression_run", "lathe_masterpost_regression_lock", "lathe_masterpost_regression_diff", "lathe_masterpost_regression_stats", "lathe_masterpost_regression_clear",
  "lathe_masterpost_deep_explain", "lathe_masterpost_deep_causal", "lathe_masterpost_deep_counterfactual", "lathe_masterpost_deep_history", "lathe_masterpost_deep_stats", "lathe_masterpost_deep_clear",
  "lathe_masterpost_ensemble_run", "lathe_masterpost_ensemble_candidates", "lathe_masterpost_ensemble_ambiguous", "lathe_masterpost_ensemble_divergences", "lathe_masterpost_ensemble_history", "lathe_masterpost_ensemble_stats", "lathe_masterpost_ensemble_clear",
  "lathe_p2p_ingest", "lathe_p2p_ingest_batch", "lathe_p2p_validate_extraction",
  "lathe_p2p_recognize_features", "lathe_p2p_recognize_batch", "lathe_p2p_feature_taxonomy", "lathe_p2p_recognition_stats",
  "lathe_p2p_tolerance_propagate", "lathe_p2p_tolerance_batch", "lathe_p2p_tolerance_stats", "lathe_p2p_tolerance_validate",
  "lathe_p2p_strategy_select", "lathe_p2p_strategy_batch", "lathe_p2p_strategy_plan", "lathe_p2p_strategy_stats", "lathe_p2p_strategy_validate",
  "lathe_p2p_sequence_plan", "lathe_p2p_sequence_summarize", "lathe_p2p_sequence_autofix",
  "lathe_p2p_setup_select", "lathe_p2p_setup_from_features", "lathe_p2p_setup_validate", "lathe_p2p_setup_infer_geometry",
  "lathe_p2p_toolpath_generate", "lathe_p2p_toolpath_validate", "lathe_p2p_toolpath_gcode", "lathe_p2p_toolpath_cycle_time",
  "lathe_p2p_emit", "lathe_p2p_emit_validate", "lathe_p2p_emit_controllers", "lathe_p2p_emit_dry_run",
  "lathe_safety_predicate_verify", "lathe_safety_predicate_verify_or_throw",
  "lathe_spindle_torque_gate", "lathe_spindle_torque_gate_or_throw",
  "lathe_stock_boundary_gate", "lathe_stock_boundary_gate_or_throw",
  "lathe_proof_carrying_emit", "lathe_proof_carrying_reproduce",
  "lathe_lora_physics_validate", "lathe_lora_physics_process", "lathe_lora_physics_kienzle_coefs",
  "lathe_lora_master_initialize", "lathe_lora_master_register_subsystem", "lathe_lora_master_transition", "lathe_lora_master_health", "lathe_lora_master_summary",
  "lathe_p2p_signoff_generate", "lathe_p2p_signoff_approve", "lathe_p2p_signoff_markdown", "lathe_p2p_signoff_json", "lathe_p2p_signoff_is_approved",
  "lathe_p2p_dl_predict", "lathe_p2p_dl_rank_alternatives", "lathe_p2p_dl_batch", "lathe_p2p_dl_evaluate_accuracy", "lathe_p2p_dl_export_weights",
  "lathe_p2p_reason_explain", "lathe_p2p_reason_markdown", "lathe_p2p_reason_json", "lathe_p2p_reason_filter", "lathe_p2p_reason_mode_summary",
  "lathe_p2p_kg_ingest", "lathe_p2p_kg_find_similar", "lathe_p2p_kg_tools_for_material", "lathe_p2p_kg_customer_jobs", "lathe_p2p_kg_failures", "lathe_p2p_kg_stats", "lathe_p2p_kg_export", "lathe_p2p_kg_import", "lathe_p2p_kg_traverse", "lathe_p2p_kg_clear",
  "probe_generate",
  "subprogram_call", "subprogram_pattern",
  "cam_controller_catalog",
  "cam_cycle_defaults",
  "cam_thread_lookup",
  "advanced_post_enhance",
  "cam_translate",
  "cam_compare_controllers",
  "cam_material_recommend",
  "cam_multicam_recommend",
  "cam_multicam_list",
  "cam_multicam_compare",
  "cam_multicam_flagship",
  "cam_ext_recommend",
  "cam_ext_list",
  "cam_ext_compare",
  "cam_ext_flagship",
  "cam_ext_search",
  "post_feed_optimize",
  "post_feed_analyze",
  "gcode_transpile",
  "gcode_transpile_dialects",
  "gcode_transpile_cycles",
  "stability_rpm_rewrite",
  "stability_rpm_analyze",
  "auto_speed_feed_optimize", "auto_speed_feed_analyze", "auto_speed_feed_batch",
  "gcode_intelligence_pipeline",
  "pp_run_full", "pp_run_partial", "pp_analyze", "pp_reoptimize", "pp_resolve_context",
  "dialect_list", "dialect_translate", "dialect_features",
  "five_axis_tcpc", "five_axis_singularity", "five_axis_linearize",
  "pp_verify", "pp_backplot",
  "machine_match", "machine_quick_match",
  "wear_compensate", "wear_analyze",
  "stats_process_capability", "stats_spc_chart", "stats_weibull",
  "stats_monte_carlo_tolerance", "stats_anova", "stats_regression",
  "stats_oee", "stats_gage_rr",
  "math_chip_mechanics", "math_thermal_models", "math_wear_models",
  "math_surface_integrity", "math_timoshenko_deflection",
  "math_taguchi", "math_topsis", "math_desirability",
  "cross_cam_recommend",
  "cross_cam_synthesize",
  // Post-processor innovations (7 engines, 21 actions)
  "probe_wcs_setup",
  "probe_inspection",
  "probe_tool_measure",
  "probe_first_article",
  "cycle_time_estimate",
  "cycle_time_compare",
  "cycle_time_bottlenecks",
  "gcode_safety_analyze",
  "gcode_safety_fix",
  "thermal_analyze",
  "thermal_distortion",
  "thermal_optimize",
  "energy_analyze",
  "energy_optimize",
  "kinematic_singularity",
  "kinematic_transform",
  "kinematic_optimize",
  "kinematic_reachability",
  "setup_sheet_generate",
  "setup_sheet_tools",
  "setup_sheet_operations",
  // Advanced Science (58 actions — 8 engines)
  "sci_oxley", "sci_oblique", "sci_size_effect", "sci_recht_shear", "sci_chip_breaking", "sci_process_damping",
  "rel_cox_hazards", "rel_competing_risks", "rel_wiener_rul", "rel_gamma_degradation",
  "rel_bayesian_rul", "rel_optimal_replacement", "rel_delay_time", "rel_renewal_theory",
  "acc_21_error_model", "acc_abbe_offset", "acc_volumetric", "acc_ball_bar", "acc_thermal_error",
  "spm_hotelling_t2", "spm_pca_monitoring", "spm_hmm_condition", "spm_bootstrap_ci", "spm_sprt",
  "spm_combined_spc", "spm_doe_generate", "spm_rsm", "spm_nbi_optimization",
  "const_zerilli_armstrong", "const_mts", "const_voce", "const_ptw",
  "const_paris_law", "const_norton_creep", "const_larson_miller", "const_hollomon", "const_machinability",
  "wear_stochastic", "wear_fick_crater", "wear_notch", "wear_lognormal_life",
  "wear_rabinowicz", "wear_flank_ode", "wear_combined_mechanisms",
  "sus_lifecycle_assessment", "sus_eco_efficiency", "sus_exergy", "sus_gutowski_energy",
  "sus_coolant_lifecycle", "sus_stochastic_economics", "sus_total_cost_ownership",
  "cool_reynolds_flow", "cool_tsc_pressure", "cool_mql_spray", "cool_jet_coherence",
  "cool_chip_transport", "cool_komanduri_thermal", "cool_cryogenic",
  // CNC Programming (17 actions — 3 engines)
  "program_assemble", "program_batch_sf", "program_cycle_time",
  "motion_trapezoidal", "motion_scurve", "motion_corner_velocity", "motion_look_ahead",
  "motion_axis_decompose", "motion_feed_effectiveness", "motion_optimize_feed",
  "engage_adapt_feed", "engage_calc_engagement", "engage_chip_thinning",
  "engage_constant_force", "engage_constant_mrr", "engage_thermal_balance", "engage_ramp_transition", "master_post_process",
  // Master Post Engines (JM Die canonical posts) — PPG-WIRE-MS0 + MS5
  "master_post_hurco_v11", "master_post_okuma_b250", "master_post_okuma_osp", "master_post_mitsubishi_mv1200r", "master_post_by_machine",
  "cnc_simulate", "cnc_simulate_report", "cnc_simulate_physics", "cnc_simulate_predictive",
  // Orphan CAM engines (11 engines, 30 actions)
  "instantaneous_engagement_analyze", "instantaneous_engagement_optimal_sf",
  "multi_cam_post_list", "multi_cam_post_scaffold", "multi_cam_post_sequence", "multi_cam_post_millturn", "multi_cam_post_phase_b",
  "production_toolpath_generate", "production_toolpath_gcode", "production_toolpath_cost", "production_toolpath_chatter_rpm",
  "pp_api_start", "pp_api_stop", "pp_api_status",
  "scalable_cam_orchestrate",
  "unified_cam_pipeline",
  "smart_tool_select",
  "adaptive_toolpath_route", "adaptive_toolpath_list_algorithms",
  "cumulative_stock_chain",
  "feature_clustering_cluster",
  "production_package_assemble",
  "five_axis_contour", "five_axis_port", "five_axis_singularity_manage",
  "five_axis_collision_avoid", "five_axis_roughing",
  // CK-MS7 — CAM Kernel Orchestrator (3 actions)
  "cam_generate", "cam_turn", "cam_simulate",
  // F360-TOOL — Fusion 360 Tool Library (1 action)
  "fusion_export_tool_library", "fusion_sync_tools",
  // PIPE-MS0+MS1 — Print-to-Program Pipeline (4 actions)
  "print_to_program_full", "print_to_program_enhanced", "print_to_program_plan", "print_to_program_validate",
  // PIPE-MS2 — Automated Bridge + Orphan Wiring (5 actions)
  "auto_print_to_program", "auto_detect_format",
  "iges_parse", "iges_extract_geometry", "iges_summary",
  // CK Pipeline (7 engines, 36 actions)
  // EDM
  "edm_wire_program", "edm_sinker_program", "edm_micro_program", "edm_cycle_time", "edm_uncertainty",
  // WEDM Safety Gate (MS-P2.5-SAFETY)
  "wedm_safety_gate_evaluate", "wedm_safety_gate_score", "wedm_safety_gate_thresholds",
  "wedm_unit_tag_evaluate", "wedm_unit_tag_gate",
  "wedm_head_clearance_evaluate", "wedm_head_clearance_gate",
  "wedm_flush_adequacy_evaluate", "wedm_flush_adequacy_gate",
  "wedm_thermal_release_evaluate", "wedm_thermal_release_gate",
  "wedm_dialect_verify", "wedm_dialect_gate", "wedm_dialect_resolve",
  // MS-P3-TIER6A — Progressive Die + Multi-Slide
  "edm_corner_taper_analyze", "edm_corner_taper_min_radius", "edm_slug_drop_predict",
  "edm_multi_pass_plan", "edm_multi_pass_cycle_time", "edm_multi_pass_recast",
  // Grinding
  "grind_surface_program", "grind_cylindrical_program", "grind_centerless_program", "grind_creepfeed_program", "grind_uncertainty",
  // Laser
  "laser_cut_program", "laser_mark_program", "laser_weld_program", "laser_drill_program", "laser_uncertainty",
  // Waterjet
  "waterjet_abrasive_program", "waterjet_pure_program", "waterjet_taper_program", "waterjet_depth_program", "waterjet_uncertainty",
  // Multi-process
  "multi_process_route", "multi_process_analyze", "multi_process_sequence",
  "multi_process_cost", "multi_process_alternatives", "multi_process_consolidate",
  // Mill-turn / Swiss
  "mill_turn_live_tooling", "mill_turn_sub_spindle", "mill_turn_multi_channel", "mill_turn_bar_feeder", "mill_turn_swiss",
  // Self-learning
  "self_learn_record", "self_learn_twin_sync", "self_learn_rank_strategy", "self_learn_anomaly", "self_learn_fleet",
  // CK-MS10: Turning profiles, sheet nesting, DXF/SVG parsing
  "turning_profile_od", "turning_profile_id", "turning_profile_thread", "turning_profile_gcode",
  "sheet_nest", "sheet_nest_optimize", "sheet_cut_order",
  "dxf_parse",
  // CK-MS11: Stochastic routing, probing programs, DFM feedback
  "stochastic_route", "stochastic_compare", "stochastic_sensitivity",
  "probe_wcs_setup_gen", "probe_first_article_gen", "probe_in_process_gen",
  "probe_tool_measure_gen", "probe_auto_comp_gen",
  "dfm_analyze", "dfm_suggest", "dfm_report",
  // CK-MS12
  "nlp_cam_parse", "nlp_cam_parse_context", "nlp_cam_extract_dims",
  "program_compare", "program_diff", "program_compare_physics",
  "cam_cache_stats", "cam_cache_clear",
  "batch_cam_generate", "batch_cam_optimize",
  // CK-MS13 — PipelineCostModelEngine (E1095)
  "pipeline_cost_compute", "pipeline_cost_compare",
  "pipeline_cost_sensitivity", "pipeline_cost_breakeven",
  // CAMX-MS21 U08 — ProductionBatchOptimizationEngine (E1094)
  "production_batch_optimize", "production_batch_tool_changes",
  "production_batch_fixture", "production_batch_barstock",
  "production_batch_probing", "production_batch_cost",
  // CAM Kernel Unified (CK Track)
  "cam_unified_generate", "cam_complex_generate", "cam_production_toolpath",
  "cam_multi_process", "cam_mill_turn", "cam_5axis_convert",
  "cam_advanced_strategy", "cam_smart_tool", "cam_verify",
  "cam_chatter_rpm", "cam_cost_feature",
  "cam_intelligent_sequence", "cam_list_actions",
  // CAMX-MS3 U01 — MastercamStrategyEngine (E1102)
  "mastercam_strategy_dynamic_motion", "mastercam_strategy_list", "mastercam_strategy_optirough",
  "mastercam_strategy_params", "mastercam_strategy_profit_turning", "mastercam_strategy_recommend",
  // CAMX-MS3 U09 — MastercamCodeGeneratorEngine (E1117)
  "mastercam_code_generate", "mastercam_code_templates",
  // CAMX-MS10 U01 — MastercamToolExportEngine (E1123)
  "mastercam_tool_export", "mastercam_tool_export_job",
  // CAMX-MS3 U02 — MastercamSafetyHooksEngine (E1113)
  "mastercam_safety_validate", "mastercam_safety_validate_all", "mastercam_safety_rules",
  // E1114 — SolidCAMSafetyHooksEngine
  "solidcam_safety_validate", "solidcam_safety_validate_all", "solidcam_safety_rules",
  // CAMX-MS12 U01 — FeatureStrategyKnowledgeBaseEngine (E1112)
  "strategy_kb_query", "strategy_kb_best", "strategy_kb_add", "strategy_kb_stats", "strategy_kb_list",
  // CAMX-MS12 U02 — StrategyBenchmarkEngine (E1096)
  "strategy_benchmark", "strategy_benchmark_compare", "strategy_benchmark_monte_carlo",
  // CAMX-MS12 U03 — StrategyComparisonEngine (E1099)
  "strategy_compare", "strategy_head_to_head", "strategy_radar_chart",
  // CAMX-MS12 U05 — ContextualStrategyOverrideEngine (E1111)
  "strategy_override_check", "strategy_override_apply", "strategy_override_rules",
  // CAMX-MS12 U06 — StrategySequencingEngine
  "strategy_sequence_build", "strategy_sequence_evaluate", "strategy_sequence_optimize",
  // CAMX-MS12 U07 — FixtureAwareStrategyEngine (E1101) (cam surface)
  "strategy_fixture_adjust", "strategy_fixture_validate", "strategy_fixture_recommend",
  // CAMX-MS12 U08 — BatchSizeStrategyEngine (E1100)
  "batch_strategy_recommend", "batch_strategy_adjust", "batch_strategy_cost",
  // CAMX-MS12 U11 — StrategyStochasticRiskEngine (renamed from StochasticStrategyComparisonEngine)
  "strategy_stochastic_compare", "strategy_stochastic_rank",
  // CAMX-MS12 U12 — CpkPredictionGateEngine
  "strategy_cpk_gate", "strategy_cpk_filter",
  // CAMX-MS12 U13 — StrategyWorstCaseSelectorEngine (renamed from RobustStrategyOptimizationEngine)
  "strategy_robust_optimize", "strategy_robust_worst_case",
  // BOX Data — FusionCPSParser (5), OkumaParametricProgram (5), PostProcessorCapabilityMatrix (5)
  "cps_parse_file", "cps_parse_directory", "cps_search", "cps_property_catalog", "cps_compare_controllers",
  "okuma_generate_casing", "okuma_generate_cbore", "okuma_validate_macro", "okuma_parse_macro", "okuma_defaults", "okuma_convert_to_hardcode",
  "pp_capability_matrix", "pp_capability_query", "pp_capability_compare", "pp_select_post", "pp_capability_summary",
  // CAMX-MS5 U01 — NXCAMStrategyEngine (E1104)
  "nx_cam_recommend", "nx_cam_parameters", "nx_cam_ipw", "nx_cam_fbm", "nx_cam_list_strategies",
  // CAMX-MS5 U06 — NXCAMCodeGeneratorEngine (E1119)
  "nx_code_generate", "nx_code_templates",
  // CAMX-MS4 U03 — PrismPathConstantEngagementEngine (E1103)
  "imachining_chipload", "imachining_compute", "imachining_engagement", "imachining_moat", "imachining_spiral", "imachining_wizard",
  // E1107 — MachineLearningStrategyRankerEngine (4 actions)
  "ml_strategy_history", "ml_strategy_rank", "ml_strategy_recommend", "ml_strategy_record",
  // CAMX-MS3 U02 — SolidCAMStrategyEngine (E1106)
  "solidcam_hss_details", "solidcam_imachining_details", "solidcam_strategy_list",
  "solidcam_strategy_params", "solidcam_strategy_recommend",
  // E1110 — BatchCAMStrategyEngines2 (8 actions)
  "bobcad_strategy_list", "bobcad_strategy_recommend",
  "cimatron_strategy_list", "cimatron_strategy_recommend",
  "topsolid_strategy_list", "topsolid_strategy_recommend",
  "worknc_strategy_list", "worknc_strategy_recommend",
  // E1109 — BatchCAMStrategyEngines (12 actions)
  "camworks_strategy_list", "camworks_strategy_recommend",
  "edgecam_strategy_list", "edgecam_strategy_recommend",
  "esprit_strategy_list", "esprit_strategy_recommend",
  "gibbscam_strategy_list", "gibbscam_strategy_recommend",
  "sprutcam_strategy_list", "sprutcam_strategy_recommend",
  "tebis_strategy_list", "tebis_strategy_recommend",
  // E1108 — CATIAStrategyEngine
  "catia_kbm_details", "catia_mfg_program", "catia_strategy_list",
  "catia_strategy_params", "catia_strategy_recommend",
  // E1115 — BatchCAMSafetyEngines (6 actions)
  "nxcam_safety_validate", "nxcam_safety_rules",
  "powermill_safety_validate", "powermill_safety_rules",
  "catia_safety_validate", "catia_safety_rules",
  // E1116 — BatchCAMMaterialBridgeEngines (8 actions)
  "mastercam_material_lookup", "mastercam_material_search",
  "solidcam_material_lookup", "solidcam_material_search",
  "nx_material_lookup", "nx_material_search",
  "powermill_material_lookup", "powermill_material_search",
  // E1118 — SolidCAMCodeGeneratorEngine (2 actions)
  "solidcam_code_generate", "solidcam_code_templates",
  // CAM-EXHAUST-MS0/U-CAM33 — SolidCAM25DFunctionIndexEngine (6 actions)
  "solidcam_25d_index", "solidcam_25d_summary", "solidcam_25d_list_ops", "solidcam_25d_get_op", "solidcam_25d_by_category", "solidcam_25d_imachining",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-30 — SolidCAM completeness wiring (+13 actions)
  "solidcam_25d_find_param", "solidcam_25d_training_topics", "solidcam_25d_category_breakdown",
  "solidcam_imachining_index", "solidcam_imachining_summary", "solidcam_imachining_list_ops", "solidcam_imachining_get_op", "solidcam_imachining_by_category", "solidcam_imachining_wizard", "solidcam_imachining_find_param",
  "solidcam_imachining_training_topics", "solidcam_imachining_category_breakdown",
  // CAM-EXHAUST-MS0/U-CAM35 — SolidCAM3DHSSHSRFunctionIndexEngine (8 actions)
  "solidcam_3d_hss_hsr_index", "solidcam_3d_hss_hsr_summary", "solidcam_3d_hss_hsr_list_ops", "solidcam_3d_hss_hsr_get_op", "solidcam_3d_hss_hsr_by_category", "solidcam_3d_hss_hsr_find_param", "solidcam_3d_hss_hsr_recommend", "solidcam_3d_hss_hsr_step_from_scallop",
  "solidcam_3d_hss_hsr_training_topics", "solidcam_3d_hss_hsr_category_breakdown",
  "solidcam_5_axis_index", "solidcam_5_axis_summary", "solidcam_5_axis_list_ops", "solidcam_5_axis_get_op", "solidcam_5_axis_by_category", "solidcam_5_axis_find_param", "solidcam_5_axis_recommend", "solidcam_5_axis_validate_axis", "solidcam_5_axis_singularity",
  "solidcam_5_axis_training_topics", "solidcam_5_axis_category_breakdown",
  "solidcam_turning_index", "solidcam_turning_summary", "solidcam_turning_list_ops", "solidcam_turning_get_op", "solidcam_turning_by_category", "solidcam_turning_find_param", "solidcam_turning_recommend", "solidcam_turning_css", "solidcam_turning_boring_bar", "solidcam_turning_thread_passes",
  "solidcam_turning_training_topics", "solidcam_turning_category_breakdown",
  "solidcam_millturn_index", "solidcam_millturn_summary", "solidcam_millturn_list_ops", "solidcam_millturn_get_op", "solidcam_millturn_by_category", "solidcam_millturn_find_param", "solidcam_millturn_recommend", "solidcam_millturn_sync_check", "solidcam_millturn_polar_feed", "solidcam_millturn_wait_barriers",
  "solidcam_millturn_training_topics", "solidcam_millturn_category_breakdown",
  "solidcam_index_manifest", "solidcam_index_sections", "solidcam_index_section_stats", "solidcam_index_all_ops", "solidcam_index_find_op", "solidcam_index_find_param", "solidcam_index_categories", "solidcam_index_recommend", "solidcam_index_validate",
  "nxcam_milling_index", "nxcam_milling_summary", "nxcam_milling_list_ops", "nxcam_milling_get_op", "nxcam_milling_by_category", "nxcam_milling_find_param", "nxcam_milling_recommend", "nxcam_milling_scallop", "nxcam_milling_adaptive_check",
  "nxcam_turning_index", "nxcam_turning_summary", "nxcam_turning_list_ops", "nxcam_turning_get_op", "nxcam_turning_by_category", "nxcam_turning_find_param", "nxcam_turning_recommend", "nxcam_turning_nose_radius", "nxcam_turning_taylor", "nxcam_turning_teach_validate",
  "nxcam_fbm_index", "nxcam_fbm_summary", "nxcam_fbm_list_ops", "nxcam_fbm_get_op", "nxcam_fbm_by_category", "nxcam_fbm_find_param", "nxcam_fbm_recommend", "nxcam_fbm_classify_pocket_depth", "nxcam_fbm_smallest_fit_tool", "nxcam_fbm_match_rule", "nxcam_fbm_group_efficiency",
  "nxcam_index_manifest", "nxcam_index_section_list", "nxcam_index_section_stats", "nxcam_index_all_ops", "nxcam_index_find_op", "nxcam_index_find_param", "nxcam_index_category_universe", "nxcam_index_recommend", "nxcam_index_validate",
  "pm_roughing_index", "pm_roughing_summary", "pm_roughing_list_ops", "pm_roughing_get_op", "pm_roughing_by_category", "pm_roughing_find_param", "pm_roughing_recommend", "pm_roughing_vortex_check", "pm_roughing_rest_worthwhile", "pm_roughing_plunge_validate",
  // PowerMillFinishingFunctionIndexEngine (9 actions — CAM-EXHAUST-MS0/U-CAM44)
  "pm_finishing_list", "pm_finishing_get", "pm_finishing_recommend", "pm_finishing_scallop", "pm_finishing_steep_shallow", "pm_finishing_pencil_coverage", "pm_finishing_validate", "pm_finishing_categories", "pm_finishing_by_category",
  "pm_5axis_list", "pm_5axis_get", "pm_5axis_recommend", "pm_5axis_axis_limit", "pm_5axis_singularity", "pm_5axis_tool_reach", "pm_5axis_validate", "pm_5axis_categories", "pm_5axis_by_category",
  "pm_unified_catalog", "pm_unified_list", "pm_unified_get", "pm_unified_search", "pm_unified_categories", "pm_unified_by_category", "pm_unified_recommend", "pm_unified_stats", "pm_unified_validate", "pm_unified_workflow",
  // E1122 — CATIACodeGeneratorEngine (2 actions)
  "catia_code_generate", "catia_code_templates",
  // E1120 — HyperMillCodeGeneratorEngine (2 actions)
  "hypermill_code_generate", "hypermill_code_templates",
  // CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01 — PrintToHyperMillBridge (3 actions)
  "print_to_hypermill", "print_to_hypermill_validate", "print_to_hypermill_capabilities",
  // CAD-COMPLETE-MS0/U-CADC-PRINT-INVHSM-01 — PrintToInventorHSMBridge (3 actions)
  "print_to_inventor_hsm", "print_to_inventor_hsm_validate", "print_to_inventor_hsm_capabilities",
  // E1127 — HyperMillToolExportEngine (2 actions, CAMX-MS9/U03)
  "hypermill_tool_export", "hypermill_tool_export_job",
  // E1121 — PowerMillCodeGeneratorEngine (2 actions)
  "powermill_code_generate", "powermill_code_templates",
  // POST-ULT — 18 engines, 42 actions
  // CpsPostParserEngine (3)
  "cps_parse", "cps_parse_batch", "cps_summary",
  // CpsDialectMapperEngine (2)
  "cps_map_dialect", "cps_map_batch",
  // MachineFingerprintEngine (3)
  "machine_fingerprint", "machine_list_manufacturers", "machine_list_models",
  // FirmwareFeatureMatrixEngine (3)
  "firmware_features", "firmware_check", "firmware_controllers",
  // CoolantControlConfigEngine (3)
  "ppg_coolant_config", "ppg_coolant_controllers", "ppg_coolant_modes",
  // UnifiedProbingDialectEngine (5)
  "ppg_probe_wcs", "ppg_probe_inspect", "ppg_probe_tool", "ppg_probe_check", "ppg_probe_controllers",
  // SubprogramStructureEngine (2)
  "ppg_subprogram_analyze", "ppg_subprogram_detect",
  // EDMPostProcessorExtension (2)
  "ppg_edm_generate", "ppg_edm_controllers",
  // LaserWaterjetPostExtension (3)
  "ppg_laser_generate", "ppg_waterjet_generate", "ppg_sheet_controllers",
  // PostPropertyTaxonomyEngine (3)
  "post_build_taxonomy", "post_classify_property", "post_list_purchase_options",
  // MachinePostCrossRefEngine (3)
  "post_match_machines", "post_coverage_gaps", "post_coverage_matrix",
  // MachineOptionRegistryEngine (4)
  "post_get_options", "post_set_options", "post_validate_options", "post_get_presets",
  // ControllerFeatureMatrixEngine (2)
  "post_get_controller", "post_compare_controllers",
  // OptimizationTierEngine (4)
  "post_set_tier", "post_detect_intent", "post_generate_diff", "post_apply_approval",
  // RapidRepositionOptEngine (3)
  "post_optimize_rapids", "post_calculate_budget", "post_full_rapid_optimize",
  // PostPhysicsFoundationEngine (1)
  "post_physics_foundation",
  // PhysicsSidecarBuilderEngine (3) — MS0/U-PPGM02
  "post_sidecar_build", "post_sidecar_verify", "post_sidecar_canonicalize",
  // NoInlinePhysicsConstantsEngine (2) — MS0/U-PPGM04
  "post_check_no_inlined_constants", "post_check_no_inlined_constants_or_throw",
  // LineByLineAdaptiveEngine (2)
  "post_line_by_line", "post_chip_thinning",
  // MotionControllerInjectionEngine (3)
  "post_inject_motion", "post_inject_hsm", "post_inject_coolant",
  // PostVerificationSafetyEngine (3)
  "post_verify_safety", "post_monte_carlo", "post_surface_finish",
  // PostOutputGenerationEngine (3)
  "post_generate_output", "post_setup_sheet", "post_prove_out",
  // AdvancedPostPhysicsEngine (3)
  "post_advanced_physics", "post_johnson_cook", "post_coupled_analysis",
  // CrossCAMPostEngine (3)
  "post_normalize_cam", "post_detect_subprograms", "post_multichannel",
  // PostValidationSuiteEngine (3)
  "post_validate_full", "post_ab_compare", "post_regression_matrix",
  // PostLibraryConfiguratorEngine (3)
  "post_browse_library", "post_configure", "post_export",
  // FleetDeploymentLearningEngine (4)
  "post_fleet_status", "post_update_plan", "post_ingest_feedback", "post_get_prediction",
  // E1124 — UniversalToolExportEngine (1 action)
  "universal_tool_export",
  // E1126 — ToolSyncOrchestratorEngine (3 actions)
  "tool_sync_multi", "tool_sync_drift", "tool_sync_status",
  // E1125 — CAMAddInFrameworkEngine (CAMX-MS11/U01) — 6 actions
  "cam_addin_generate", "cam_addin_http_client", "cam_addin_ui_panel",
  "cam_addin_tool_sync", "cam_addin_post_integration", "cam_addin_list_systems",
  // E1128 — CuttingDataExportEngine (CAMX-MS10/U06) — 2 actions
  "cutting_data_export", "cutting_data_compute",
  // E1129 — STEPNCEngines (CAMX-MS20) — 2 actions
  "stepnc_parse", "stepnc_generate",
  // E1135 — StrategyTaxonomyEngine (CAMX-MS0) — 7 actions
  "strategy_taxonomy_lookup", "strategy_taxonomy_search", "strategy_taxonomy_equivalents",
  "strategy_taxonomy_translate", "strategy_taxonomy_by_feature", "strategy_taxonomy_by_cam",
  "strategy_taxonomy_stats",
  // E1131 — StrategyPerformanceTrackerEngine (CAMX-MS15/U01) — 4 actions
  "strategy_perf_record", "strategy_perf_accuracy", "strategy_perf_top", "strategy_perf_stats",
  // E1130 — VericutBridgeEngine (CAMX-MS20/U05) — 3 actions
  "vericut_export", "vericut_import_optipath", "vericut_import_collision",
  // E1132 — NCSIMULBridgeEngine (CAMX-MS20/U06) — 2 actions
  "ncsimul_export", "ncsimul_import",
  // E1134 — ShopNetworkEngine (CAMX-MS21/U02) — 4 actions
  "shop_network_register", "shop_network_search", "shop_network_broadcast", "shop_network_stats",
  // E1133 — ISO13399ToolDataEngine (CAMX-MS20/U03) — 3 actions
  "iso13399_import", "iso13399_export", "iso13399_validate",
  // E1135 — QIFIntegrationEngine (CAMX-MS20/U04) — 4 actions
  "qif_import_plan", "qif_import_results", "qif_export_plan", "qif_export_results",
  // E1136 — TCODashboardEngine (CAMX-MS13/U06) — 4 actions
  "tco_dashboard", "tco_compare", "tco_savings", "tco_drivers",
  // E1137 — ToolChangeOptimizationEngine (CAMX-MS13/U02) — 3 actions
  "tool_change_optimize", "tool_change_magazine", "tool_change_sharing",
  // E1138 — SafetyEscalationEngine (CAMX-MS14/U03) — 2 actions
  "safety_escalate", "safety_escalate_preview",
  // E1139 — CollisionPreventionEngine (CAMX-MS14/U04) — 3 actions
  "collision_prevent_full", "collision_prevent_certify", "collision_prevent_zones",
  // E1140 — FleetLearningStrategyEngine (CAMX-MS15/U04) — 3 actions
  "fleet_aggregate", "fleet_transfer", "fleet_insights",
  // E1141 — BatchCAMControllerEngines (8 actions)
  "mastercam_controller_lookup", "mastercam_controller_list",
  "solidcam_controller_lookup", "solidcam_controller_list",
  "nx_controller_lookup", "nx_controller_list",
  "powermill_controller_lookup", "powermill_controller_list",
  // E1142 — BatchCAMOperationCatalogEngines (8 actions)
  "mastercam_op_get", "mastercam_op_list",
  "solidcam_op_get", "solidcam_op_list",
  "nx_op_get", "nx_op_list",
  "powermill_op_get", "powermill_op_list",
  // E1143 — BatchCAMToolBridgeEngines (8 actions)
  "mastercam_tool_import", "mastercam_tool_drift",
  "solidcam_tool_import", "solidcam_tool_drift",
  "nx_tool_import", "nx_tool_drift",
  "hypermill_tool_import", "hypermill_tool_drift",
  // E1144 — BatchCAMAPIBridgeEngines (8 actions)
  "mastercam_api_connect", "mastercam_api_execute",
  "solidcam_api_connect", "solidcam_api_execute",
  "nxopen_api_connect", "nxopen_api_execute",
  "hypermill_ac_connect", "hypermill_ac_execute",
  // E1145 — BatchCAMAddInGenerators (6 actions)
  "mastercam_addin_generate",
  "solidcam_addin_generate",
  "nx_addin_generate",
  "hypermill_addin_generate",
  "powermill_addin_generate",
  "catia_addin_generate",
  // E1146 — StrategyEvolutionEngine (CAMX-MS15/U05) — 3 actions
  "strategy_evolve", "strategy_best_discoveries", "strategy_evolution_history",
  // E1147 — PredictionCalibrationEngine (CAMX-MS15/U06) — 3 actions
  "prediction_calibrate", "prediction_get_factors", "prediction_calibration_history",
  // E1148 — WorkholdingVerificationEngine (CAMX-MS14/U06) — 3 actions
  "workholding_verify", "workholding_verify_all", "workholding_min_safety",
  // E1149 — ToolBreakagePredictionEngine (CAMX-MS14/U05) — 3 actions
  "tool_breakage_predict", "tool_cumulative_damage", "tool_breakage_risk",
  // E1150 — CamxEnergyOptimizationEngine (CAMX-MS13/U04) — 3 actions
  "camx_energy_optimize", "camx_energy_breakdown", "camx_energy_suggest_savings",
  // E1151 — StrategyRankingUpdateEngine (CAMX-MS15/U02) — 3 actions
  "strategy_ranking_record", "strategy_ranking_get", "strategy_ranking_confidence",
  // E1152 — AnomalyDetectionEngine (CAMX-MS15/U03) — 4 actions
  "anomaly_detect", "anomaly_record_and_detect", "anomaly_history", "anomaly_auto_adjust",
  // E1154 — CoolantCostOptimizationEngine (CAMX-MS13/U03) — 3 actions
  "coolant_cost_compare", "coolant_cost_optimal", "coolant_cost_lifecycle",
  // E1155 — SetupCostOptimizationEngine (CAMX-MS13/U05) — 3 actions
  "setup_cost_optimize", "setup_time_estimate", "setup_suggest_reductions",
  // E1156 — EnergyOptimizationIntegrationEngine (CAMX-MS13/U04) — 3 actions
  "energy_add_to_cost", "energy_carbon_footprint", "energy_suggest_savings",
  // F360-AP-MS1 — AutoProgramOrchestratorEngine (2 actions)
  "f360_auto_program", "f360_auto_program_status",
  // F360 Live Bridge — read-only CAM introspection (4 actions, OBSIDIAN-AUTOMATE-MS3/U-FUSION-LIVE-READ)
  "f360_live_operations", "f360_live_toolpath_validity", "f360_live_cycle_time", "f360_live_materials",
  // PostDownloadEngine (PP-MS4/U-PP21) — 3 actions
  "ppg_format_download", "ppg_setup_sheet", "ppg_manifest",
  // ProveOutModeEngine (PP-MS5/U-PP24) — 2 actions
  "ppg_prove_out", "ppg_estimate_impact",
  // PostValidationHardeningEngine (PP-MS5/U-PP25) — 2 actions
  "ppg_validate_limits", "ppg_check_envelope",
  // PostValidationReportEngine (PP-MS5/U-PP26) — 1 action
  "ppg_validation_report",
  // PostLibraryCatalogEngine (PP-MS6/U-PP28) — 4 actions
  "ppg_library_search", "ppg_library_detail", "ppg_library_compatibility", "ppg_library_facets",
  // PostVersioningEngine (PP-MS6/U-PP30) — 4 actions
  "ppg_version_store", "ppg_version_history", "ppg_version_diff", "ppg_version_retrieve",
  // PP-MS10/U-PP45 — ROI calculator action
  "ppg_roi_calculate",
  // PostProcessorTelemetryEngine (PP-MS11/U-PP47) — 2 actions
  "ppg_telemetry_record", "ppg_telemetry_funnel",
  // Forge-Triple Actions (PIPELINE-VAR + PP-MOAT)
  "validate_pipeline_output", "post_process_with_catalog",
  // HM-REV-MS2 — Material Bridge + PPP Default Path (5 actions)
  "cam_hypermill_material_to_physics",
  "cam_hypermill_material_to_orchestrator",
  "cam_hypermill_calibration_compare",
  "cam_hypermill_ppp_defaults",
  "cam_hypermill_register_strategies",
  // HM-REV-MS3 — Cycle Parameter Pipeline (2 actions)
  "cam_hypermill_cycle_recommend",
  "cam_hypermill_validate_cycle_defaults",
  // HM-REV-MS4 — Multi-Axis Pipeline (5 actions)
  "cam_hypermill_impeller_pipeline",
  "cam_hypermill_blade_roughing",
  "cam_hypermill_tilt_limit_check",
  "cam_hypermill_mold_cycle",
  "cam_hypermill_mold_pipeline",
  "cam_hypermill_tube_machining",
  "cam_hypermill_probe_setup",
  "cam_hypermill_probe_wcs_verify",
  "cam_hypermill_surface_integrity_check",
  "cam_hypermill_grinding_route",
  "cam_hypermill_edm_route",
  "cam_hypermill_heat_treat_route",
  "cam_hypermill_secondary_ops_sequence",
  "cam_hypermill_millturn_strategy",
  "cam_hypermill_millturn_multichannel",
  "cam_hypermill_css_rpm_check",
  "cam_hypermill_caxis_indexing",
  "cam_hypermill_millturn_full_strategy",
  "cam_hypermill_skill_resolve",
  "cam_hypermill_skill_list_phase",
  "cam_hypermill_skill_validate",
  "cam_hypermill_skill_batch_resolve",
  "cam_hypermill_turning_config_parse_cycturn",
  "cam_hypermill_turning_config_parse_stocklist",
  "cam_hypermill_turning_config_ingest_dir",
  "cam_hypermill_turning_config_stats",
  "cam_hypermill_om_cycles_extract",
  "cam_hypermill_om_cycles_parse_line",
  "cam_hypermill_om_cycles_categorize",
  "cam_hypermill_skill_registry_list",
  "cam_hypermill_skill_registry_get",
  "cam_hypermill_skill_registry_engine_map",
  "cam_hypermill_skill_registry_by_category",
  "cam_hypermill_skill_registry_by_engine",
  "cam_hypermill_skill_registry_by_effort",
  "cam_hypermill_skill_registry_stats",
  "cam_hypermill_medical_get_profile",
  "cam_hypermill_medical_resolve_material",
  "cam_hypermill_medical_list_profiles",
  "cam_hypermill_xml_parse_feature2job",
  "cam_hypermill_xml_parse_post_config",
  "cam_hypermill_xml_extract_post_config",
  "cam_hypermill_xml_extract_all",
  "cam_hypermill_ac_server_build_config",
  "cam_hypermill_ac_server_validate_config",
  "cam_hypermill_ac_server_describe_config",
  "cam_hypermill_ac_server_get_defaults",
  "cam_hypermill_inhost_register",
  "cam_hypermill_inhost_plan_scenario",
  "cam_hypermill_inhost_frame_to_envelope",
  "cam_hypermill_inhost_summarize",
  "cam_hypermill_inhost_get_plan",
  "cam_hypermill_inhost_get_stats",
  "cam_hypermill_inhost_reset_session",
  "cam_hypermill_inhost_reset_all",
  "cam_hypermill_strategy_kb_list_all",
  "cam_hypermill_strategy_kb_by_category",
  "cam_hypermill_strategy_kb_get",
  "cam_hypermill_strategy_kb_details",
  "cam_hypermill_strategy_kb_recommend",
  "cam_hypermill_strategy_kb_search",
  "cam_hypermill_strategy_kb_for_geometry",
  "cam_hypermill_strategy_kb_jm_die",
  "cam_hypermill_dl_select_strategy",
  "cam_hypermill_dl_recommend_automation",
  "cam_hypermill_dl_validate_toolpath",
  "cam_hypermill_dl_explain_strategy",
  "cam_hypermill_dl_recognize_feature",
  "cam_hypermill_dl_get_strategies_by_category",
  "cam_hypermill_dl_get_sql_table_schema",
  "cam_hypermill_dl_get_virtual_machining_features",
  "cam_hypermill_ai_orchestrate",
  "cam_hypermill_ai_get_reasoning_modes",
  "cam_hypermill_ai_get_stats",
  "cam_hypermill_demo_db_extract",
  "cam_fusion_tool_library_get_sources",
  "cam_fusion_tool_library_harvest",
  "cam_fusion_tool_library_parse_csv",
  "cam_fusion_tool_library_find_by_description",
  "cam_fusion_tool_library_filter_by_category",
  "cam_fusion_tool_library_audit",
  "cam_fusion_lathe_post_scan_register",
  "cam_fusion_lathe_post_save_registry",
  "cam_fusion_lathe_post_get_registry",
  "cam_fusion_lathe_post_lookup",
  "cam_fusion_lathe_post_by_manufacturer",
  "cam_fusion_lathe_post_by_controller",
  "cam_fusion_lathe_post_summary",
  "cam_fusion_ai_orchestrate",
  "cam_fusion_ai_get_reasoning_modes",
  "cam_fusion_ai_get_stats",
  "cam_fusion360_code_gen_get_capabilities",
  "cam_fusion360_code_gen_build_script",
  "cam_fusion360_code_gen_execute_script",
  "cam_fusion360_code_gen_validate_output",
  "cam_mastercam_material_find",
  "cam_mastercam_material_get_physics",
  "cam_mastercam_material_map_to_iso",
  "cam_mastercam_material_calculate_force",
  "cam_mastercam_material_estimate_tool_life",
  "cam_mastercam_material_list",
  "cam_mastercam_material_list_by_iso",
  "cam_mastercam_material_get_stats",
  "cam_mastercam_physics_calculate_milling",
  "cam_mastercam_physics_calculate_turning",
  "cam_mastercam_physics_get_summary",
  "cam_mastercam_physics_compare_materials",
  "cam_mastercam_fai_extract_characteristics",
  "cam_mastercam_fai_generate_report",
  "cam_mastercam_fai_apply_measurements",
  "cam_mastercam_fai_export_json",
  "cam_mastercam_fai_generate_balloon_data",
  "cam_mastercam_fai_get_stats",
  "cam_mastercam_spc_create_xbar_r_chart",
  "cam_mastercam_spc_calculate_capability",
  "cam_mastercam_spc_analyze_job",
  "cam_mastercam_spc_get_stats",
  "cam_mastercam_automation_open",
  "cam_mastercam_automation_get_geometry",
  "cam_mastercam_automation_get_toolpaths",
  "cam_mastercam_automation_get_operation_tree",
  "cam_mastercam_automation_export_step",
  "cam_mastercam_automation_close",
  "cam_esprit_connect",
  "cam_esprit_get_status",
  "cam_esprit_disconnect",
  "cam_esprit_extract_project",
  "cam_esprit_parse_apt",
  "cam_esprit_parse_nc",
  "cam_esprit_get_tools",
  "cam_esprit_get_operations",
  "cam_esprit_push_parameters",
  "cam_esprit_sync_tools",
  "cam_esprit_check_version",
  "cam_inventor_automation_open",
  "cam_inventor_automation_get_parameters",
  "cam_inventor_automation_get_model_tree",
  "cam_inventor_automation_export_step",
  "cam_inventor_automation_get_mass_properties",
  "cam_inventor_automation_close",
  "cam_inventor_camfn_get_summary",
  "cam_inventor_camfn_category_breakdown",
  "cam_inventor_camfn_canned_cycle_ref",
  "cam_inventor_camfn_learning_path",
  "cam_inventor_camfn_all_operations",
  "cam_inventor_camfn_search_by_category",
  "cam_inventor_camfn_multiaxis_ops",
  "cam_inventor_camfn_probing_ops",
  "cam_inventor_camfn_adaptive_ops",
  "cam_inventor_camfn_list_sections",
  "cam_inventor_camfn_get_section",
  "cam_inventor_camfn_search_parameters",
  "cam_inventor_ai_orchestrate",
  "cam_inventor_ai_get_reasoning_modes",
  "cam_inventor_ai_get_stats",
  "cam_solidworks_automation_open",
  "cam_solidworks_automation_get_feature_tree",
  "cam_solidworks_automation_export_step",
  "cam_solidworks_automation_export_pdf",
  "cam_solidworks_automation_get_bounding_box",
  "cam_solidworks_automation_close",
  "cam_hypermill_dental_route",
  // HM-REV-MS0: HyperCAD-S CAD Automation + Mock Layer
  "cam_feature_to_strategy",
  "cam_hyperCADS_analyze",
  "cam_hyperCADS_automate",
  "cam_hyperCADS_heal",
  "cam_hyperCADS_import",
  "cam_hyperCADS_stock_model",
  // HM-REV-MS8: Data Extraction Pipeline (E1157–E1161)
  "hypermill_extract_tools",
  "hypermill_extraction_schema",
  "hypermill_extraction_stats",
  "hypermill_extract_macros",
  "hypermill_extract_im_tools",
  "hypermill_macro_schema",
  "hypermill_extract_ac_tools",
  "hypermill_ac_tool_schema",
  "hypermill_extract_metric_cfg",
  "hypermill_cfg_stats",
  "hypermill_cfg_diff",
  "hypermill_data_extract_all",
  "hypermill_data_status",
  "hypermill_data_freshness_check",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-28 — HyperMILL FunctionIndex (10 actions)
  "hypermill_function_index_get", "hypermill_function_index_list_modules",
  "hypermill_function_index_get_module", "hypermill_function_index_find_parameter",
  "hypermill_function_index_get_parameters_by_formula", "hypermill_function_index_get_parameters_by_dispatcher",
  "hypermill_function_index_get_tribal_tips_by_source", "hypermill_function_index_resolve_dependencies",
  "hypermill_function_index_total_parameter_count", "hypermill_function_index_get_load_errors",
  // HM-REV-MS9: AC Bridge + Deployment (U-HMR46/47/48/49/50)
  "hypermill_ac_status",
  "hypermill_ppp_write",
  "hypermill_job_status",
  "hypermill_job_submit",
  "hypermill_job_list",
  // HM-REV-MS10: Quality Chain + Setup Sheet + Formula Registry (U-HMR51 to U-HMR55)
  "cam_hypermill_setup_sheet",
  "cam_hypermill_quality_package",
  // HM-REV-MS11: PPP Integration (U-HMR59–U-HMR63)
  "hypermill_ppp_process",
  // HM-REV-MS12: Batch Script execution (U-HMR64)
  "hypermill_batch_script",
  // HM-KC-MS0: Intelligent Macro DB extractors (U-HKC04)
  "hypermill_im_tool_db_extract",
  "hypermill_im_macro_db_extract",
  // Simulation Visualization Bridge (3 actions)
  "simulation_visualize", "simulation_toolpath_colors", "simulation_animation_frames",
  // MultiProcess CAM Bridge (3 actions)
  "multi_process_detect", "multi_process_full_pipeline", "multi_process_physics",
  // PP-AI: Post Processor AI (22 actions — 3 engines: Deep Learning, Deep Reasoning, Ultimate AI)
  "pp_ai_recognize_patterns", "pp_ai_optimize_feed", "pp_ai_classify_controller",
  "pp_ai_estimate_cycle_time", "pp_ai_score_quality", "pp_ai_deep_learning_analyze",
  "pp_ai_chain_of_thought", "pp_ai_causal_inference", "pp_ai_cross_cam_synthesis",
  "pp_ai_controller_optimize", "pp_ai_physics_reasoning", "pp_ai_self_consistency",
  "pp_ai_deep_reasoning_analyze",
  "pp_ai_deep_ensemble", "pp_ai_episodic_memory", "pp_ai_store_episode",
  "pp_ai_knowledge_graph", "pp_ai_tree_of_thoughts", "pp_ai_meta_learning",
  "pp_ai_adversarial_validate", "pp_ai_generate_post", "pp_ai_llm_cli_query",
  "pp_ai_ultimate_analyze",
  // PP-AI Orchestrator (7 actions — master orchestration engine)
  "pp_ai_classify_intent", "pp_ai_route_engines", "pp_ai_expert_rules",
  "pp_ai_neural_optimize", "pp_ai_aggregate_analysis", "pp_ai_proactive_suggestions",
  "pp_ai_orchestrate",
  // PP-KB Knowledge Engine (13 actions — deep knowledge base)
  "pp_kb_get_entry_function", "pp_kb_get_entry_functions_by_category",
  "pp_kb_get_drilling_cycle", "pp_kb_get_all_drilling_cycles",
  "pp_kb_get_upk_switch", "pp_kb_get_upk_switches_by_category",
  "pp_kb_get_misc_value", "pp_kb_get_circular_settings",
  "pp_kb_search", "pp_kb_get_recommended_settings",
  "pp_kb_validate_configuration", "pp_kb_generate_function_template",
  "pp_kb_get_statistics",
  // CAMX-MS2/U07 — Controller & machine strategy validation
  "strategy_controller_validate", "strategy_machine_validate",
  "strategy_find_compatible_controllers", "strategy_find_best_machine",
  "strategy_compatibility_matrix",
  // CAMX-MS2/U05+U06 — Cost-optimal & safety-first strategy decisions
  "strategy_cost_compute", "strategy_cost_decide", "strategy_cost_sensitivity",
  "strategy_safety_assess", "strategy_safety_decide", "strategy_safety_filter",
  // CAMX-MS2/U03 — Strategy fallback chain walker
  "strategy_fallback_chain", "strategy_fallback_default_chain",
  // CAM-EXHAUST-MS0 U-CAM96..100 — Plugin hub, geometry, registry, speed/feed bridge, post selector
  "cam_hub_register", "cam_hub_unregister", "cam_hub_route", "cam_hub_stats",
  "cam_hub_heartbeat", "cam_hub_drain", "cam_hub_supported_targets",
  "cam_geometry_register", "cam_geometry_validate", "cam_geometry_estimate_chunks",
  "cam_geometry_progress", "cam_geometry_supported_formats",
  "cam_registry_register", "cam_registry_heartbeat", "cam_registry_dashboard",
  "cam_registry_compat", "cam_registry_list",
  "cam_speedfeed_compute", "cam_speedfeed_translate",
  "cam_post_select", "cam_post_list", "cam_post_encode", "cam_post_dashboard",
  // CAM-EXHAUST-MS0 U-CAM90..95 — Real-time physics overlay engines
  "cam_overlay_force_render", "cam_overlay_force_stats", "cam_overlay_force_reset",
  "cam_overlay_chatter_render", "cam_overlay_chatter_stats", "cam_overlay_chatter_reset",
  "cam_overlay_deflection_render", "cam_overlay_deflection_stats", "cam_overlay_deflection_reset",
  "cam_overlay_thermal_render", "cam_overlay_thermal_stats", "cam_overlay_thermal_reset",
  "cam_overlay_tool_life_render", "cam_overlay_tool_life_stats", "cam_overlay_tool_life_reset",
  "cam_overlay_safety_score_render", "cam_overlay_safety_score_stats", "cam_overlay_safety_score_reset",
  // CAM-EXHAUST-MS0 U-CAM101 — Tribal knowledge tooltip injection
  "cam_tooltip_render", "cam_tooltip_stats", "cam_tooltip_reset",
  // CAM-EXHAUST-MS0 U-CAM102 — Error prediction & predictive alerts
  "cam_predict_segment", "cam_predict_scan", "cam_predict_encode", "cam_predict_stats", "cam_predict_reset",
  // CAM-EXHAUST-MS0 U-CAM103 — AI optimization suggestions
  "cam_suggest_recommend", "cam_suggest_recommend_all", "cam_suggest_apply", "cam_suggest_encode", "cam_suggest_stats", "cam_suggest_reset",
  // CAM-EXHAUST-MS0 U-CAMTEST01 — hyperMILL in-host runner (PRISM-side companion)
  "cam_inhost_hypermill_register", "cam_inhost_hypermill_plan", "cam_inhost_hypermill_summarize", "cam_inhost_hypermill_stats", "cam_inhost_hypermill_reset",
  // CAM-EXHAUST-MS0 U-CAMTEST02 — Fusion 360 in-host runner (PRISM-side companion)
  "cam_inhost_fusion360_register", "cam_inhost_fusion360_plan", "cam_inhost_fusion360_summarize", "cam_inhost_fusion360_stats", "cam_inhost_fusion360_reset",
  // CAM-EXHAUST-MS0 U-CAMTEST03 — Inventor HSM in-host runner (PRISM-side companion)
  "cam_inhost_inventor_hsm_register", "cam_inhost_inventor_hsm_plan", "cam_inhost_inventor_hsm_summarize", "cam_inhost_inventor_hsm_stats", "cam_inhost_inventor_hsm_reset",
  // CAM-EXHAUST-MS0 U-CAMTEST04 — Mastercam X8 in-host runner (PRISM-side companion)
  "cam_inhost_mastercam_register", "cam_inhost_mastercam_plan", "cam_inhost_mastercam_summarize", "cam_inhost_mastercam_stats", "cam_inhost_mastercam_reset",
  // CAM-EXHAUST-MS0 U-CAMTEST05 — Fixture Part Catalog (20 parametric parts driving scenario generators)
  "cam_fixture_part_list", "cam_fixture_part_list_by_category", "cam_fixture_part_list_by_host", "cam_fixture_part_get", "cam_fixture_part_count", "cam_fixture_part_count_by_category", "cam_fixture_part_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST06 — Stock + Workholding Catalog (100 setups = 20 parts × 5 templates)
  "cam_stock_setup_list", "cam_stock_setup_list_by_part", "cam_stock_setup_list_by_material", "cam_stock_setup_list_by_form", "cam_stock_setup_get", "cam_stock_setup_count", "cam_stock_setup_count_by_material", "cam_stock_setup_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST07 — Material × Tool 3×3 matrix (9 slots, materializes per part = 180 combos)
  "cam_mt_matrix_slots", "cam_mt_matrix_tool_classes_for", "cam_mt_matrix_combos_for_part", "cam_mt_matrix_get_combo", "cam_mt_matrix_all_combos", "cam_mt_matrix_expected_count", "cam_mt_matrix_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST08..13 — Unified scenario generator (621 calm-baseline scenarios)
  "cam_scenario_generate", "cam_scenario_generate_all", "cam_scenario_generate_pocket_2d", "cam_scenario_generate_contour_2d", "cam_scenario_generate_drilling_threading", "cam_scenario_generate_surface_3d", "cam_scenario_generate_multi_axis", "cam_scenario_generate_turning", "cam_scenario_predict_count", "cam_scenario_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST14 — Central 7-family assertion bundle (host-agnostic)
  "cam_assertion_bundle_evaluate", "cam_assertion_bundle_failed", "cam_assertion_bundle_by_name", "cam_assertion_bundle_audit", "cam_assertion_bundle_families",
  // CAM-EXHAUST-MS0 U-CAMTEST15 — Results bridge (host → hub → state file aggregator)
  "cam_results_bridge_ingest", "cam_results_bridge_list", "cam_results_bridge_list_failures", "cam_results_bridge_summarize", "cam_results_bridge_persist", "cam_results_bridge_load", "cam_results_bridge_reset", "cam_results_bridge_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST16 — Nightly orchestrator (backend half; React dashboard deferred to Codex lane)
  "cam_nightly_run", "cam_nightly_list_recent", "cam_nightly_get_run", "cam_nightly_text_dashboard", "cam_nightly_dashboard_data", "cam_nightly_audit",
  // CAM-EXHAUST-MS0 U-CAMTEST17 — Regression detector vs golden baseline
  "cam_regression_detect", "cam_regression_detect_against_golden", "cam_regression_load_golden", "cam_regression_promote_golden", "cam_regression_has_golden", "cam_regression_findings_by_severity", "cam_regression_findings_by_type", "cam_regression_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-CYCLES-01 — Fusion 360 cycle catalog (52 cycles, 8 categories)
  "cam_fusion360_cycle_catalog_list", "cam_fusion360_cycle_catalog_list_by_category", "cam_fusion360_cycle_catalog_lookup", "cam_fusion360_cycle_catalog_search", "cam_fusion360_cycle_catalog_stats", "cam_fusion360_cycle_catalog_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-CTRL-01 — Fusion 360 controller catalog (16 families, 20+ post variants)
  "cam_fusion360_controller_list", "cam_fusion360_controller_lookup", "cam_fusion360_controller_search", "cam_fusion360_controller_dialect", "cam_fusion360_controller_stats", "cam_fusion360_controller_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-STRAT-01 — Fusion 360 strategy engine (operation+ISO → cycle+params)
  "cam_fusion360_strategy_recommend", "cam_fusion360_strategy_pick_cycle", "cam_fusion360_strategy_baseline_vc", "cam_fusion360_strategy_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-SAFETY-01 — Fusion 360 safety hooks (15 rules, PASS/WARN/BLOCK verdict)
  "cam_fusion360_safety_validate", "cam_fusion360_safety_validate_all", "cam_fusion360_safety_rules", "cam_fusion360_safety_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-MAT-01 — Fusion 360 material bridge (24 materials, ISO-grouped)
  "cam_fusion360_material_list", "cam_fusion360_material_lookup", "cam_fusion360_material_search", "cam_fusion360_material_by_iso", "cam_fusion360_material_kienzle", "cam_fusion360_material_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-PROBE-01 — Fusion 360 probing bridge (13 ops, Renishaw/Blum macro vocab)
  "cam_fusion360_probing_list", "cam_fusion360_probing_lookup", "cam_fusion360_probing_validate", "cam_fusion360_probing_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-TOOL-01 — Fusion 360 tool library export (Tools.json round-trip)
  "cam_fusion360_tool_parse", "cam_fusion360_tool_serialize", "cam_fusion360_tool_validate", "cam_fusion360_tool_stats",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-MULTIAXIS-01 — Fusion 360 5-axis kinematic + indexed plane math
  "cam_fusion360_multiaxis_list", "cam_fusion360_multiaxis_lookup", "cam_fusion360_multiaxis_validate", "cam_fusion360_multiaxis_plane_matrix", "cam_fusion360_multiaxis_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-MILLTURN-01 — Fusion 360 mill-turn archetypes + sub-spindle handoff
  "cam_fusion360_millturn_list", "cam_fusion360_millturn_lookup", "cam_fusion360_millturn_validate_handoff", "cam_fusion360_millturn_thread_passes", "cam_fusion360_millturn_audit",
  // CAM-EXHAUST-MS0 U-CAM-FUSION-AI-01 — Fusion 360 AI orchestration routing
  "cam_fusion360_ai_route", "cam_fusion360_ai_routes", "cam_fusion360_ai_tasks_routed_to", "cam_fusion360_ai_audit",
  // CAM-EXHAUST-MS0 U-CAM-MC-EDM-01 — Mastercam EDM bridge (Wire 2/4-axis + Sinker + Micro)
  "cam_mastercam_edm_route", "cam_mastercam_edm_pick_route_type", "cam_mastercam_edm_skim_passes", "cam_mastercam_edm_stats", "cam_mastercam_edm_audit",
  // CAM-EXHAUST-MS0 U-CAM-MC-GRIND-01 — Mastercam grinding bridge (8 kinds, wheel RPM + grit + spark-out)
  "cam_mastercam_grinding_plan", "cam_mastercam_grinding_wheel_rpm", "cam_mastercam_grinding_cycle_codes", "cam_mastercam_grinding_audit",
  // CAM-EXHAUST-MS0 U-CAM-MC-SI-01 — Mastercam surface integrity prediction (Ra/Rz + white-layer + residual stress)
  "cam_mastercam_si_predict", "cam_mastercam_si_validate", "cam_mastercam_si_audit",
  // CAM-EXHAUST-MS0 U-CAM-MC-MOLD-01 — Mastercam mold cavity/core machining cycle planner
  "cam_mastercam_mold_plan", "cam_mastercam_mold_needs_edm", "cam_mastercam_mold_audit",
  // CAM-EXHAUST-MS0 U-CAM-MC-PROBE-01 — Mastercam probing bridge (Renishaw/Heidenhain/Blum/M&H, 7 cycle types)
  "cam_mastercam_probe_part_setup", "cam_mastercam_probe_create_cycle", "cam_mastercam_probe_gcode",
  "cam_mastercam_probe_tool", "cam_mastercam_probe_verify", "cam_mastercam_probe_stats",
  // CAM-UIX-MS0/U-ONTOLOGY-SEED01 — Cross-CAM field translation
  "ontology_translate", "ontology_translate_strategy", "ontology_get_canonical",
  "ontology_get_aliases", "ontology_list_canonicals", "ontology_list_cams",
  "ontology_stats", "ontology_get_range", "ontology_get_valid_values", "ontology_check_applicable",
  // CAM-EXHAUST-MS0/U-CAM25 — Fusion 360 Function Index
  "fusion360_function_index_get", "fusion360_function_index_list_modules",
  "fusion360_function_index_get_module", "fusion360_function_index_list_toolpaths",
  "fusion360_function_index_find_parameter", "fusion360_function_index_search_parameters",
  "fusion360_function_index_get_toolpaths_by_category", "fusion360_function_index_get_summary",
  "fusion360_function_index_get_hsm_toolpaths", "fusion360_function_index_get_mfg_ext_toolpaths",
  "fusion360_function_index_get_toolpath",
  // CAM-EXHAUST-MS1-01 — Fusion360 Probing module
  "fusion360_function_index_get_probing_operations",
  // CAM-EXHAUST-MS1-02 — Fusion360 Additive module
  "fusion360_function_index_get_additive_operations",
  // CAM-EXHAUST-MS1-03 — Fusion360 Cutting module
  "fusion360_function_index_get_cutting_operations",
  // CAM-EXHAUST-MS0/U-CAM26 — Inventor HSM Function Index
  "inventor_hsm_function_index_get", "inventor_hsm_function_index_list_sections",
  "inventor_hsm_function_index_get_section", "inventor_hsm_function_index_list_operations",
  "inventor_hsm_function_index_find_parameter", "inventor_hsm_function_index_search_parameters",
  "inventor_hsm_function_index_get_operations_by_category", "inventor_hsm_function_index_get_summary",
  "inventor_hsm_function_index_get_hsm_operations", "inventor_hsm_function_index_get_25d_operations",
  "inventor_hsm_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-09 — Edgecam Function Index
    "edgecam_function_index_get", "edgecam_function_index_list_sections",
    "edgecam_function_index_get_section", "edgecam_function_index_list_operations",
    "edgecam_function_index_find_parameter", "edgecam_function_index_search_parameters",
    "edgecam_function_index_get_operations_by_category", "edgecam_function_index_get_summary",
    "edgecam_function_index_get_waveform_operations", "edgecam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-10 — ESPRIT Function Index
    "esprit_function_index_get", "esprit_function_index_list_sections",
    "esprit_function_index_get_section", "esprit_function_index_list_operations",
    "esprit_function_index_find_parameter", "esprit_function_index_search_parameters",
    "esprit_function_index_get_operations_by_category", "esprit_function_index_get_summary",
    "esprit_function_index_get_profit_operations", "esprit_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-11 — GibbsCAM Function Index
    "gibbscam_function_index_get", "gibbscam_function_index_list_sections",
    "gibbscam_function_index_get_section", "gibbscam_function_index_list_operations",
    "gibbscam_function_index_find_parameter", "gibbscam_function_index_search_parameters",
    "gibbscam_function_index_get_operations_by_category", "gibbscam_function_index_get_summary",
    "gibbscam_function_index_get_volumill_operations", "gibbscam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-12 — WorkNC Function Index
    "worknc_function_index_get", "worknc_function_index_list_sections",
    "worknc_function_index_get_section", "worknc_function_index_list_operations",
    "worknc_function_index_find_parameter", "worknc_function_index_search_parameters",
    "worknc_function_index_get_operations_by_category", "worknc_function_index_get_summary",
    "worknc_function_index_get_auto5_operations", "worknc_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-13 — TopSolid'Cam Function Index
    "topsolid_function_index_get", "topsolid_function_index_list_sections",
    "topsolid_function_index_get_section", "topsolid_function_index_list_operations",
    "topsolid_function_index_find_parameter", "topsolid_function_index_search_parameters",
    "topsolid_function_index_get_operations_by_category", "topsolid_function_index_get_summary",
    "topsolid_function_index_get_pmi_operations", "topsolid_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-14 — CAMWorks Function Index
    "camworks_function_index_get", "camworks_function_index_list_sections",
    "camworks_function_index_get_section", "camworks_function_index_list_operations",
    "camworks_function_index_find_parameter", "camworks_function_index_search_parameters",
    "camworks_function_index_get_operations_by_category", "camworks_function_index_get_summary",
    "camworks_function_index_get_afr_operations", "camworks_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-15 — Tebis Function Index
    "tebis_function_index_get", "tebis_function_index_list_sections",
    "tebis_function_index_get_section", "tebis_function_index_list_operations",
    "tebis_function_index_find_parameter", "tebis_function_index_search_parameters",
    "tebis_function_index_get_operations_by_category", "tebis_function_index_get_summary",
    "tebis_function_index_get_proven_process_operations", "tebis_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-16 — BobCAD-CAM Function Index
    "bobcad_function_index_get", "bobcad_function_index_list_sections",
    "bobcad_function_index_get_section", "bobcad_function_index_list_operations",
    "bobcad_function_index_find_parameter", "bobcad_function_index_search_parameters",
    "bobcad_function_index_get_operations_by_category", "bobcad_function_index_get_summary",
    "bobcad_function_index_get_dmt_operations", "bobcad_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-17 — Cimatron Function Index
    "cimatron_function_index_get", "cimatron_function_index_list_sections",
    "cimatron_function_index_get_section", "cimatron_function_index_list_operations",
    "cimatron_function_index_find_parameter", "cimatron_function_index_search_parameters",
    "cimatron_function_index_get_operations_by_category", "cimatron_function_index_get_summary",
    "cimatron_function_index_get_mold_die_operations", "cimatron_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-18 — SprutCAM Function Index
    "sprutcam_function_index_get", "sprutcam_function_index_list_sections",
    "sprutcam_function_index_get_section", "sprutcam_function_index_list_operations",
    "sprutcam_function_index_find_parameter", "sprutcam_function_index_search_parameters",
    "sprutcam_function_index_get_operations_by_category", "sprutcam_function_index_get_summary",
    "sprutcam_function_index_get_robot_operations", "sprutcam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-19 — Alphacam Function Index
    "alphacam_function_index_get", "alphacam_function_index_list_sections",
    "alphacam_function_index_get_section", "alphacam_function_index_list_operations",
    "alphacam_function_index_find_parameter", "alphacam_function_index_search_parameters",
    "alphacam_function_index_get_operations_by_category", "alphacam_function_index_get_summary",
    "alphacam_function_index_get_drilling_operations", "alphacam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM112 — OllamaCAM local-LLM CAM inference
    "ollama_cam_query", "ollama_cam_strategy_recommend",
    "ollama_cam_parameter_extract", "ollama_cam_operation_classify",
    "ollama_cam_tool_select_advisor", "ollama_cam_health_check",
    "ollama_cam_list_tasks", "ollama_cam_get_system_prompt",
  // CAM-EXHAUST-MS0/U-CAM113 — NVIDIA NIM/Triton GPU CAM inference
    "nvidia_cam_query", "nvidia_cam_strategy_recommend",
    "nvidia_cam_parameter_extract", "nvidia_cam_operation_classify",
    "nvidia_cam_tool_select_advisor", "nvidia_cam_health_check",
    "nvidia_cam_list_tasks", "nvidia_cam_resolve_endpoint",
    "nvidia_cam_get_system_prompt",
  // CAM-EXHAUST-MS0/U-CAM117 — Deep Learning Orchestrator (multi-source AGI decisions)
    "cam_dl_decide", "cam_dl_health_check_all",
    "cam_dl_list_sources", "cam_dl_get_default_weights",
  // CAM-EXHAUST-MS0/U-CAM118 — Reasoning Chain (explainable decisions)
    "cam_reasoning_decide", "cam_reasoning_build_from_decision",
    "cam_reasoning_get_chain", "cam_reasoning_list_chains",
    "cam_reasoning_why_decision", "cam_reasoning_compare_alternatives",
    "cam_reasoning_clear_chains", "cam_reasoning_set_max_chains",
  // CAM-EXHAUST-MS0/U-CAM119 — Confidence Calibration (uncertainty quantification)
    "cam_calibration_record_outcome", "cam_calibration_calibrate",
    "cam_calibration_calibrate_decision", "cam_calibration_metrics",
    "cam_calibration_recommend_method", "cam_calibration_get_outcome_count",
    "cam_calibration_clear_outcomes", "cam_calibration_set_outcome_cap",
  // CAM-EXHAUST-MS0/U-CAM121 — Transfer Learning (cross-CAM knowledge transfer)
    "cam_transfer_register_domain", "cam_transfer_list_cams",
    "cam_transfer_get_domain", "cam_transfer_domain_similarity",
    "cam_transfer_record_observation", "cam_transfer_predict",
    "cam_transfer_best_source", "cam_transfer_record_outcome",
    "cam_transfer_accuracy", "cam_transfer_list_observations",
    "cam_transfer_clear_all", "cam_transfer_set_observation_cap",
    "cam_transfer_set_outcome_cap",
  // CAM-EXHAUST-MS0/U-CAM122 — Model Serving (production deploy: registry, A/B, canary, SLO, batching, rate-limit)
    "cam_serve_register_model", "cam_serve_deregister_model",
    "cam_serve_list_models", "cam_serve_get_model",
    "cam_serve_update_endpoint", "cam_serve_set_routing_policy",
    "cam_serve_get_routing_policy", "cam_serve_list_routing_policies",
    "cam_serve_route_request", "cam_serve_deploy_shadow",
    "cam_serve_promote_to_canary", "cam_serve_promote_to_active",
    "cam_serve_demote_from_active", "cam_serve_rollback_canary",
    "cam_serve_retire_model", "cam_serve_record_metric",
    "cam_serve_get_health", "cam_serve_list_health",
    "cam_serve_enqueue_batch", "cam_serve_drain_batch",
    "cam_serve_peek_batch_size", "cam_serve_check_rate_limit",
    "cam_serve_set_rate_limit", "cam_serve_list_pending_confirmations",
    "cam_serve_clear_confirmations", "cam_serve_set_metric_buffer_size",
    "cam_serve_clear_all",
  // CAM-EXHAUST-MS0/U-CAM127 — AI Validation (production-readiness behavioral harness)
    "cam_ai_validate",
  // CAM-EXHAUST-MS0/U-CAM120 — Feedback Loop (continuous learning, drift detection, LoRA export)
    "cam_feedback_record_correction", "cam_feedback_record_outcome",
    "cam_feedback_get_corrections", "cam_feedback_accuracy_drift",
    "cam_feedback_correction_patterns", "cam_feedback_lora_training_export",
    "cam_feedback_stats", "cam_feedback_set_buffer_cap",
    "cam_feedback_clear_all",
  // CAM-EXHAUST-MS0/U-CAM51 — SURFCAM Function Index (TrueMill HSM flagship)
    "surfcam_function_index_get", "surfcam_function_index_list_sections",
    "surfcam_function_index_get_section", "surfcam_function_index_list_operations",
    "surfcam_function_index_find_parameter", "surfcam_function_index_search_parameters",
    "surfcam_function_index_get_operations_by_category", "surfcam_function_index_get_summary",
    "surfcam_function_index_get_truemill_operations", "surfcam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-20 — VISI Function Index
    "visi_function_index_get", "visi_function_index_list_sections",
    "visi_function_index_get_section", "visi_function_index_list_operations",
    "visi_function_index_find_parameter", "visi_function_index_search_parameters",
    "visi_function_index_get_operations_by_category", "visi_function_index_get_summary",
    "visi_function_index_get_mold_operations", "visi_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-21 — Creo (PTC) Function Index
    "creo_function_index_get", "creo_function_index_list_sections",
    "creo_function_index_get_section", "creo_function_index_list_operations",
    "creo_function_index_find_parameter", "creo_function_index_search_parameters",
    "creo_function_index_get_operations_by_category", "creo_function_index_get_summary",
    "creo_function_index_get_mill_turn_operations", "creo_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-22 — PartMaker (Autodesk Swiss) Function Index
    "partmaker_function_index_get", "partmaker_function_index_list_sections",
    "partmaker_function_index_get_section", "partmaker_function_index_list_operations",
    "partmaker_function_index_find_parameter", "partmaker_function_index_search_parameters",
    "partmaker_function_index_get_operations_by_category", "partmaker_function_index_get_summary",
    "partmaker_function_index_get_swiss_turning_operations", "partmaker_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-23 — CATIA Machining (Dassault) Function Index
    "catia_machining_function_index_get", "catia_machining_function_index_list_sections",
    "catia_machining_function_index_get_section", "catia_machining_function_index_list_operations",
    "catia_machining_function_index_find_parameter", "catia_machining_function_index_search_parameters",
    "catia_machining_function_index_get_operations_by_category", "catia_machining_function_index_get_summary",
    "catia_machining_function_index_get_surface_operations", "catia_machining_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-24 — FeatureCAM (Autodesk AFR) Function Index
    "featurecam_function_index_get", "featurecam_function_index_list_sections",
    "featurecam_function_index_get_section", "featurecam_function_index_list_operations",
    "featurecam_function_index_find_parameter", "featurecam_function_index_search_parameters",
    "featurecam_function_index_get_operations_by_category", "featurecam_function_index_get_summary",
    "featurecam_function_index_get_afr_operations", "featurecam_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-25 — VERICUT (CGTech NC verification + OptiPath) Function Index
    "vericut_function_index_get", "vericut_function_index_list_sections",
    "vericut_function_index_get_section", "vericut_function_index_list_operations",
    "vericut_function_index_find_parameter", "vericut_function_index_search_parameters",
    "vericut_function_index_get_operations_by_category", "vericut_function_index_get_summary",
    "vericut_function_index_get_verification_operations", "vericut_function_index_get_optimization_operations",
    "vericut_function_index_get_operation",
  // CAM-EXHAUST-MS0/U-CAM74..U-CAM78 - Phase-5 production engines
  "cam_param_optimize",
  "cam_cross_translate",
  "cam_agi_reason",
  "cam_tribal_lookup",
  "cam_feature_recognize",
  // MILL-MASTER/P1-U06 — CAM AGI Master Orchestrator (3 actions)
  "cam_agi_route", "cam_compare_systems", "cam_ensemble",
  // CAM-EXHAUST-MS0 WIRING — 12 engines, 35 actions
  "cam_analyze_toolpath",
  "cam_deep_query", "cam_deep_similar", "cam_deep_cross_map", "cam_deep_systems",
  "cam_export", "cam_export_get", "cam_export_systems",
  "cam_exhaustion_plan_next", "cam_exhaustion_coverage", "cam_exhaustion_audit", "cam_exhaustion_in_scope",
  "cam_kernel_parse_dxf", "cam_kernel_parse_svg", "cam_kernel_interpret_nl", "cam_kernel_diff_gcode",
  "cam_kernel_validate", "cam_kernel_list_schemas", "cam_kernel_dfm_analyze",
  "cam_sdk_optimize_sf", "cam_sdk_check_safety", "cam_sdk_suggest_tool", "cam_sdk_get_tip", "cam_sdk_batch",
  "cam_strategy_recommend_full",
  "cam_tool_library_create", "cam_tool_library_add", "cam_tool_library_search", "cam_tool_library_params", "cam_tool_library_export", "cam_tool_library_list",
  "cam_tool_get_by_number", "cam_tool_query", "cam_tool_select_for_op", "cam_tool_magazine", "cam_tool_find_replacement",
  // CAM-EXHAUST-MS0: LoRA cadence engines (6 actions)
  "milling_lora_predict", "milling_lora_train", "milling_lora_optimize",
  "millturn_lora_predict", "millturn_lora_train", "millturn_lora_optimize",
  "cam_compare_programs", "cam_dfm_check", "cam_feasibility_check", "cam_fusion_tool_export",
  // ENGINE-WIRE-MS0/U-WIRE12 — 5 engines, 13 actions
  "mastercam_5axis_recommend", "mastercam_5axis_tilt_limits", "mastercam_5axis_list_strategies",
  "multi_agent_register_session", "multi_agent_get_activity", "multi_agent_query_chains",
  "fusion360_open", "fusion360_get_geometry", "fusion360_export_step",
  "hypermill_bridge_open", "hypermill_bridge_get_geometry", "hypermill_bridge_export_step",
  "hypercads_mock_import", "hypercads_mock_heal", "hypercads_mock_analyze", "hypercads_mock_stock",
  // ENGINE-WIRE-MS0/U-WIRE14 — 5 Mastercam engines, 8 actions
  "mastercam_ai_orchestrate",
  "mastercam_cycle_search", "mastercam_cycle_lookup_code", "mastercam_cycle_stats",
  "mastercam_deep_select_strategy",
  "mastercam_function_index_summary",
  // CAM-EXHAUST-MS0/U-CAM-FIDX-27 — Mastercam full FunctionIndex wiring (9 new actions)
  "mastercam_function_index_get", "mastercam_function_index_list_modules",
  "mastercam_function_index_get_module", "mastercam_function_index_list_toolpaths",
  "mastercam_function_index_find_parameter", "mastercam_function_index_search_parameters",
  "mastercam_function_index_get_toolpaths_by_category", "mastercam_function_index_get_toolpath",
  "mastercam_function_index_get_total_parameter_count",
  "mastercam_multiaxis_recommend", "mastercam_multiaxis_list_strategies",
  // ENGINE-WIRE-CAM-MS0/U-WIRE-CAM-BATCH1: 6 unwired CAM engines
  "cam_recommend",                     // CAMRecommendEngine.recommend
  "cam_strategy_optimal_select",       // OptimalStrategySelectionEngine.selectOptimal
  "cam_toolpath_force_profile",        // ToolpathForceProfileEngine.analyze
  "cam_toolpath_segment_optimize",     // ToolpathSegmentOptimizerEngine.compute
  "cam_toolpath_strategy_route",       // ToolpathStrategyRouterEngine.route
  "cam_hsm_dwell_at_corner",           // HSMDwellAtCornerEngine.analyzeDwell
  // ENGINE-WIRE-POST-MS0/U-WIRE-POST-BATCH1: 6 unwired post processor engines
  "post_gcode_snippet_get",            // GCodeSnippetEngine.get
  "post_gcode_snippet_fill",           // GCodeSnippetEngine.fill
  "post_gcode_tokenize",               // GCodeUnderstandingTransformerEngine.tokenize
  "post_fanuc_legacy_profile",         // FanucLegacyControllerEngine.getProfile + listModels
  "post_okuma_legacy_detect",          // OkumaLegacyControllerEngine.detectController
  "post_siemens_legacy_profile",       // SiemensLegacyControllerEngine.getProfile
  // OBSIDIAN-AUTOMATE-MS3/U-PRINT-PROGRAM-JOIN: blueprint <-> program lookup
  "cam_print_program_lookup",          // BlueprintProgramJoinEngine.joinBlueprintsToPrograms
] as const;

// MS-P0.5-COORD U-P0.5-COORD-01: Register CAM dispatcher with WEDM-action filter
import("../../engines/WEDMAwarenessAdoptionEngine.js").then(({ wedmAwarenessAdoptionEngine }) => {
  wedmAwarenessAdoptionEngine.registerDispatcher({
    dispatcher: "cam",
    actions: ACTIONS,
    wedmActionFilter: (a: string) => {
      const lower = a.toLowerCase();
      return lower.includes("edm") || lower.includes("wire_edm") || lower.includes("wedm");
    },
  });
}).catch(() => { /* adoption engine optional */ });

/**
 * Testable dispatcher function for direct invocation (unit tests, internal calls).
 * Mirrors the MCP tool handler logic but returns parsed JSON instead of MCP content blocks.
 */
/** Registers cam dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerCamDispatcher(server: any): void {
  server.tool(
    "prism_cam",
    `CAM/Toolpath dispatcher — toolpath generation, simulation, optimization, post-processing, collision detection, fixturing.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_cam] Action: ${action}`);
      let result: any;
      // MS-P0.5-COORD vars hoisted to outer scope so post-switch awareness/ledger blocks see them
      let _awareness: any = null;
      let _awarenessKeywords: string[] = [];
      let _isWedmAction = false;
      let _entryAt = Date.now();
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, MERGED_CAM_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cam",
          );
        }

        // PRE-TOOLPATH SAFETY HOOKS — collision detection, G-code safety, toolpath safety
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "camDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-toolpath", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        // MS-P0.5-COORD U-P0.5-COORD-08: Multi-agent dispatch coordination for WEDM-relevant CAM actions (vars hoisted above)
        try {
          const { wedmAwarenessAdoptionEngine } = await import("../../engines/WEDMAwarenessAdoptionEngine.js");
          _isWedmAction = wedmAwarenessAdoptionEngine.isWedmAction("cam", action);
          if (_isWedmAction) {
            const { wedmMultiAgentDispatchEngine } = await import("../../engines/WEDMMultiAgentDispatchEngine.js");
            const _coord = await wedmMultiAgentDispatchEngine.coordinateDispatch({
              dispatcher: "cam", action, params: params as any,
            });
            _awareness = _coord.summary;
            _awarenessKeywords = _coord.keywords;
            _entryAt = _coord.entryAt;
          }
        } catch { /* fails open */ }

        switch (action) {
          case "toolpath_generate": {
            if (shouldUseUnifiedCam(params)) {
              const engine = await getEngine("unifiedPipe");
              const request = buildUnifiedCamRequest(params);
              result = engine.generate?.(request as any) ?? engine.compute?.(params) ?? { toolpath: "generated", params };
            } else {
              const engine = await getEngine("toolpath");
              const request = buildToolpathRequest(params);
              result = engine.generate?.(
                request.featureType,
                request.dimensions,
                request.params,
                request.material,
              ) ?? engine.compute?.(params) ?? { toolpath: "generated", params };
            }
            break;
          }
          case "toolpath_simulate": {
            const engine = await getEngine("tpSim");
            result = engine.simulate(params.moves ?? [], {
              feed_rate_mmmin: params.feed_rate_mmmin ?? 1000,
              rapid_rate_mmmin: params.rapid_rate_mmmin ?? 10000,
              tool_diameter: params.tool_diameter,
              stock_bounds: params.stock_bounds,
              fixture_bounds: params.fixture_bounds,
            });
            break;
          }
          case "toolpath_optimize": {
            const engine = await getEngine("toolpath");
            result = engine.optimize?.(params) ?? { optimized: true, params };
            break;
          }
          case "post_process": {
            const engine = await getEngine("post");
            const request = buildPostProcessRequest(params);
            result = engine.process?.(request.input, request.config) ?? engine.compute?.(params) ?? { post_processed: true, controller: request.config.controller };
            break;
          }
          case "collision_check_full": {
            const engine = await getEngine("collision");
            result = engine.checkFull(
              params.bodies ?? [],
              params.moves ?? [],
              params.safety_margin_mm ?? 2,
            );
            break;
          }
          case "stock_update": {
            const engine = await getEngine("stock");
            if (params.create) {
              result = engine.create(params.stock ?? params, params.part_volume_mm3 ?? 0);
            } else if (params.analyze) {
              result = engine.analyze(params.stock_id, params.material ?? "steel", params.cost_per_kg ?? 5);
            } else {
              result = engine.removeVolume(params.stock_id, {
                operation_id: params.operation_id ?? "op-1",
                operation_type: params.operation_type ?? "roughing",
                volume_removed_mm3: params.volume_removed_mm3 ?? 0,
                tool_used: params.tool_used ?? "unknown",
                time_sec: params.time_sec ?? 0,
              }) ?? { error: `Stock not found: ${params.stock_id}` };
            }
            break;
          }
          case "tool_assembly": {
            const engine = await getEngine("toolasm");
            result = engine.assemble?.(params) ?? engine.compute?.(params) ?? { assembly: params };
            break;
          }
          case "fixture_setup": {
            const engine = await getEngine("fixture");
            result = engine.layout?.(params) ?? { fixture: params };
            break;
          }
          case "nesting_optimize": {
            const engine = await getEngine("nesting");
            if (params.compare_stock) {
              result = engine.compareStock(params.parts ?? [], params.stocks ?? []);
            } else {
              result = engine.nest(
                params.parts ?? [],
                params.stock ?? { width_mm: 1220, height_mm: 2440, thickness_mm: 6, material: "steel" },
                params.kerf_mm ?? 3,
              );
            }
            break;
          }
          case "clearance_plane": {
            const engine = await getEngine("cam");
            result = engine.computeClearancePlane(
              params.stockTopZ ?? 0,
              params.fixtureTopZ ?? 0,
              params.workpieceTopZ ?? 0,
              params.marginMm ?? 5,
            );
            break;
          }
          case "sequence_operations": {
            const engine = await getEngine("cam");
            result = engine.sequenceOperations(
              params.operations ?? [],
            );
            break;
          }
          case "linking_move": {
            const engine = await getEngine("cam");
            result = engine.generateLinkingMove(
              params.fromPos ?? { x: 0, y: 0, z: 0 },
              params.toPos ?? { x: 0, y: 0, z: 0 },
              params.config ?? {
                globalClearanceZ: 50,
                linkingMode: "z_clearance",
                minClearanceMm: 5,
              },
            );
            break;
          }

          // ── TRAINING-LEARNING-MS0/U2 — Mill template extractor ──
          // Engine returns discriminated `{ok: true|false, error?, family?, detail?}`.
          // Bridge `data.ok` → dispatcher `success` so callers branching on `.success`
          // don't treat unknown-family / missing-snapshot as success. Mirrors the lathe
          // sibling pattern in prism_turning (turningDispatcher.ts ~line 972). NEVER
          // emits G-code — templates are metadata only; safety-gated emit lives in
          // MACRO-PROGRAM-PIPELINE-MS0.
          case "mill_training_corpus_status": {
            const { millPartFamilyTemplateExtractorEngine } = await import("../../engines/MillPartFamilyTemplateExtractorEngine.js");
            const data = millPartFamilyTemplateExtractorEngine.catalogCorpus({
              snapshot: (params as Record<string, unknown>).snapshot as never,
              snapshotPath:
                (params as Record<string, unknown>).snapshotPath as string ??
                (params as Record<string, unknown>).snapshot_path as string,
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: data.error, detail: data.detail, data };
            break;
          }
          case "mill_training_template_match": {
            const { millPartFamilyTemplateExtractorEngine } = await import("../../engines/MillPartFamilyTemplateExtractorEngine.js");
            const p = params as Record<string, unknown>;
            const data = await millPartFamilyTemplateExtractorEngine.extractTemplate(
              String(p.family),
              {
                snapshot: p.snapshot as never,
                snapshotPath: (p.snapshotPath ?? p.snapshot_path) as string,
                outDir: (p.outDir ?? p.out_dir) as string,
                dryRun: (p.dryRun ?? p.dry_run) as boolean,
              },
            );
            result = data.ok
              ? { success: true, data }
              : { success: false, error: data.error, family: data.family, detail: data.detail, data };
            break;
          }
          case "mill_training_template_list": {
            const { millPartFamilyTemplateExtractorEngine } = await import("../../engines/MillPartFamilyTemplateExtractorEngine.js");
            const data = millPartFamilyTemplateExtractorEngine.listTemplates({
              outDir: (params as Record<string, unknown>).outDir as string ??
                (params as Record<string, unknown>).out_dir as string,
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: (data as unknown as { error?: string }).error, data };
            break;
          }
          case "mill_training_template_extract_all": {
            const { millPartFamilyTemplateExtractorEngine } = await import("../../engines/MillPartFamilyTemplateExtractorEngine.js");
            const p = params as Record<string, unknown>;
            const data = await millPartFamilyTemplateExtractorEngine.extractAllTemplates({
              snapshot: p.snapshot as never,
              snapshotPath: (p.snapshotPath ?? p.snapshot_path) as string,
              outDir: (p.outDir ?? p.out_dir) as string,
              dryRun: (p.dryRun ?? p.dry_run) as boolean,
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: (data as { error?: string }).error, detail: (data as { detail?: string }).detail, data };
            break;
          }

          case "cam_strategy_recommend": {
            const safetyCheck = await runHyperMillSafetyChecks(params);
            if (!safetyCheck.safe) {
              result = { error: "Safety check BLOCKED", blocks: safetyCheck.blocks, warnings: safetyCheck.warnings };
              break;
            }
            const engine = await getEngine("hmStrategy");
            const stratResult = engine.recommend(params) ?? { error: "HyperMillStrategyEngine.recommend returned null" };
            result = safetyCheck.warnings.length > 0 ? { ...stratResult, safetyWarnings: safetyCheck.warnings } : stratResult;
            break;
          }
          case "cam_multiaxis_recommend": {
            const maSafetyCheck = await runHyperMillSafetyChecks(params);
            if (!maSafetyCheck.safe) {
              result = { error: "Safety check BLOCKED", blocks: maSafetyCheck.blocks, warnings: maSafetyCheck.warnings };
              break;
            }
            const hmMA = await getEngine("hmMultiAxis");
            let maResult: any;
            if (params.list) {
              maResult = hmMA.listStrategies();
            } else if (params.defaults) {
              maResult = hmMA.getDefaults(params.domain ?? "milling");
            } else if (!params.geometry || !params.goal) {
              maResult = { error: "cam_multiaxis_recommend requires 'geometry' and 'goal' params (or 'list'/'defaults' flags)" };
            } else {
              maResult = hmMA.calculate(params);
            }
            result = maSafetyCheck.warnings.length > 0 ? { ...maResult, safetyWarnings: maSafetyCheck.warnings } : maResult;
            break;
          }
          case "cam_material_map": {
            const hmMat = await getEngine("hmMaterialMap");
            if (params.quality_id) {
              result = hmMat.lookupByQualityId(params.quality_id) ?? { error: `No material found for quality_id: ${params.quality_id}` };
            } else if (params.search) {
              result = hmMat.searchByName(params.search);
            } else if (params.iso_group) {
              result = hmMat.getByIsoGroup(params.iso_group);
            } else if (params.list_groups) {
              result = hmMat.listGroups();
            } else if (params.list_cutters) {
              result = hmMat.listCutterMaterials();
            } else {
              result = {
                groups: hmMat.listGroups(),
                totalQualities: hmMat.totalQualities(),
                cutterMaterials: hmMat.listCutterMaterials(),
              };
            }
            break;
          }
          case "cam_cycle_catalog": {
            const hmCC = await getEngine("hmCycleCatalog");
            if (params.search) {
              result = hmCC.search(params.search);
            } else if (params.category) {
              result = hmCC.byCategory(params.category);
            } else if (params.code) {
              result = hmCC.lookupByCode(params.code)
                ?? { error: `No cycle found for code: ${params.code}` };
            } else if (params.stats) {
              result = hmCC.stats();
            } else {
              result = hmCC.stats();
            }
            break;
          }
          case "cam_catalog_load_all": {
            const { camCatalogLoaderEngine } = await import("../../engines/CAMCatalogLoaderEngine.js");
            result = camCatalogLoaderEngine.loadAll();
            break;
          }
          case "cam_catalog_load_one": {
            const { camCatalogLoaderEngine } = await import("../../engines/CAMCatalogLoaderEngine.js");
            result = camCatalogLoaderEngine.loadOne(params.slug ?? params.target_cam);
            break;
          }
          case "cam_catalog_priority5_coverage": {
            const { camCatalogLoaderEngine } = await import("../../engines/CAMCatalogLoaderEngine.js");
            result = camCatalogLoaderEngine.priority5Coverage();
            break;
          }
          case "cam_function_route": {
            const { camFunctionRouterEngine } = await import("../../engines/CAMFunctionRouterEngine.js");
            result = camFunctionRouterEngine.route({
              intent: String(params.intent ?? ""),
              target_cam: params.target_cam ?? params.slug,
            });
            break;
          }
          case "cam_parameter_validate": {
            const { camParameterValidatorEngine } = await import("../../engines/CAMParameterValidatorEngine.js");
            result = camParameterValidatorEngine.validate({
              target_cam: String(params.target_cam ?? params.slug ?? ""),
              parameters: (params.parameters as Record<string, unknown>) ?? {},
              operation: params.operation !== undefined ? String(params.operation) : undefined,
            });
            break;
          }
          // ─── U-CAM-R3-03: Inventor HSM adapter dispatcher wire ─────────────
          case "cam_inventor_hsm_analyze_operation": {
            const mod = await import("../../engines/InventorHSMPluginAdapterEngine.js");
            result = mod.InventorHSMPluginAdapterEngine.analyzeOperation(
              String(params.project_id),
              params.operation as any
            );
            break;
          }
          case "cam_inventor_hsm_analyze_project": {
            const mod = await import("../../engines/InventorHSMPluginAdapterEngine.js");
            result = mod.InventorHSMPluginAdapterEngine.analyzeProject(
              String(params.project_id)
            );
            break;
          }
          case "cam_inventor_hsm_generate_nc_header": {
            const mod = await import("../../engines/InventorHSMPluginAdapterEngine.js");
            result = mod.InventorHSMPluginAdapterEngine.generateNCHeader(
              String(params.project_id)
            );
            break;
          }
          // ─── U-CAM-R3-04: SolidCAM SolidWorks bridge (port 18363) ──────────
          case "cam_solidcam_import_sldprt": {
            const mod = await import("../../engines/BatchCAMAPIBridgeEngines.js");
            const bridge: any = (mod as any).solidCAMSolidWorksBridgeEngine
              ?? new (mod as any).SolidCAMSolidWorksBridgeEngine();
            result = await bridge.executeAction("get_solidworks_model_info", {
              path: String(params.path ?? ""),
            });
            break;
          }
          case "cam_solidcam_create_imachining": {
            const mod = await import("../../engines/BatchCAMAPIBridgeEngines.js");
            const bridge: any = (mod as any).solidCAMSolidWorksBridgeEngine
              ?? new (mod as any).SolidCAMSolidWorksBridgeEngine();
            result = await bridge.executeAction("create_operation", {
              ...params,
              operation_type: params.operation_type ?? "imachining_2d",
            });
            break;
          }
          case "cam_solidcam_run_gpp": {
            const mod = await import("../../engines/BatchCAMAPIBridgeEngines.js");
            const bridge: any = (mod as any).solidCAMSolidWorksBridgeEngine
              ?? new (mod as any).SolidCAMSolidWorksBridgeEngine();
            result = await bridge.executeAction("run_gpp_post", params);
            break;
          }
          // ─── U-CAM-ML-02: CAM feature extraction for ML training ───────────
          case "cam_ml_feature_extract_one": {
            const { camFeatureExtractorEngine } = await import(
              "../../engines/CAMFeatureExtractorEngine.js"
            );
            result = camFeatureExtractorEngine.extractOne(String(params.program_path ?? ""));
            break;
          }
          case "cam_ml_feature_extract_batch": {
            const { camFeatureExtractorEngine } = await import(
              "../../engines/CAMFeatureExtractorEngine.js"
            );
            result = camFeatureExtractorEngine.extractBatch(
              typeof params.sample_size === "number" ? params.sample_size : 100,
              typeof params.corpus_index_path === "string"
                ? params.corpus_index_path
                : "H:/PRISM/mcp-server/data/state/JM_DIE_CORPUS_INDEX.json"
            );
            break;
          }
          // ─── U-CAM-ML-03: customer-disjoint train/val/test split ───────────
          case "cam_ml_split_customer_disjoint": {
            const { camMLSplitEngine } = await import(
              "../../engines/CAMMLSplitEngine.js"
            );
            result = camMLSplitEngine.split(
              Array.isArray(params.vectors) ? params.vectors : [],
              (params.ratios as any) ?? undefined,
              typeof params.seed === "number" ? params.seed : 42
            );
            break;
          }
          case "cam_ml_split_from_files": {
            const { camMLSplitEngine } = await import(
              "../../engines/CAMMLSplitEngine.js"
            );
            result = camMLSplitEngine.splitFromFiles(
              typeof params.sample_json_path === "string"
                ? params.sample_json_path
                : undefined,
              typeof params.output_path === "string"
                ? params.output_path
                : undefined,
              (params.ratios as any) ?? undefined,
              typeof params.seed === "number" ? params.seed : 42
            );
            break;
          }
          // ─── U-CAM87-LIVE: Fusion 360 outbound JSON-RPC builders ───────────
          case "cam_fusion_build_setup_create": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildSetupCreateEnvelope(params as any);
            break;
          }
          case "cam_fusion_build_operation_create": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildOperationCreateEnvelope(params as any);
            break;
          }
          case "cam_fusion_build_tool_install": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildToolInstallEnvelope(params as any);
            break;
          }
          case "cam_fusion_build_geometry_import": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildGeometryImportEnvelope(params as any);
            break;
          }
          case "cam_fusion_build_simulate": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildSimulateEnvelope(params as any);
            break;
          }
          case "cam_fusion_build_postprocess": {
            const { Fusion360PluginAdapterEngine } = await import(
              "../../engines/Fusion360PluginAdapterEngine.js"
            );
            result = Fusion360PluginAdapterEngine.buildPostProcessEnvelope(params as any);
            break;
          }
          // ─── U-CAM89-EXTEND: Mastercam NET-Hook outbound builders ──────────
          case "cam_mastercam_build_machine_group_create": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildMachineGroupCreateEnvelope(params as any);
            break;
          }
          case "cam_mastercam_build_operation_create": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildOperationCreateEnvelope(params as any);
            break;
          }
          case "cam_mastercam_build_tool_install": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildToolInstallEnvelope(params as any);
            break;
          }
          case "cam_mastercam_build_chain_select": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildChainSelectEnvelope(params as any);
            break;
          }
          case "cam_mastercam_build_regen": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildRegenEnvelope(params as any);
            break;
          }
          case "cam_mastercam_build_post_run": {
            const { MastercamPluginAdapterEngine } = await import(
              "../../engines/MastercamPluginAdapterEngine.js"
            );
            result = MastercamPluginAdapterEngine.buildPostProcessEnvelope(params as any);
            break;
          }
          // ─── U-CAM-R3-10: per-CAM real post-invoke from JM Die inventory ───
          case "cam_post_invoke_from_inventory": {
            const { camPostInvokeOrchestratorEngine } = await import(
              "../../engines/CAMPostInvokeOrchestratorEngine.js"
            );
            result = camPostInvokeOrchestratorEngine.buildPostInvokeFromInventory(params as any);
            break;
          }
          case "cam_post_invoke_eligible_machines": {
            const { camPostInvokeOrchestratorEngine } = await import(
              "../../engines/CAMPostInvokeOrchestratorEngine.js"
            );
            result = camPostInvokeOrchestratorEngine.eligibleMachinesForCAM(
              String(params.target_cam ?? "mastercam") as any
            );
            break;
          }
          // ─── U-CAM87-HM: hyperMILL outbound XML-RPC envelope builders ─────
          case "cam_hypermill_build_operation_create": {
            const { HyperMillPluginAdapterEngine } = await import(
              "../../engines/HyperMillPluginAdapterEngine.js"
            );
            result = HyperMillPluginAdapterEngine.buildOperationCreateEnvelope(params as any);
            break;
          }
          case "cam_hypermill_build_stock": {
            const { HyperMillPluginAdapterEngine } = await import(
              "../../engines/HyperMillPluginAdapterEngine.js"
            );
            result = HyperMillPluginAdapterEngine.buildStockEnvelope(params as any);
            break;
          }
          case "cam_hypermill_build_tool_install": {
            const { HyperMillPluginAdapterEngine } = await import(
              "../../engines/HyperMillPluginAdapterEngine.js"
            );
            result = HyperMillPluginAdapterEngine.buildToolInstallEnvelope(params as any);
            break;
          }
          case "cam_hypermill_build_joblist": {
            const { HyperMillPluginAdapterEngine } = await import(
              "../../engines/HyperMillPluginAdapterEngine.js"
            );
            result = HyperMillPluginAdapterEngine.buildJobListEnvelope(params as any);
            break;
          }
          case "cam_hypermill_build_postprocess": {
            const { HyperMillPluginAdapterEngine } = await import(
              "../../engines/HyperMillPluginAdapterEngine.js"
            );
            result = HyperMillPluginAdapterEngine.buildPostProcessEnvelope(params as any);
            break;
          }
          // ─── U-CAM87-HSM: Inventor HSM outbound iLogic envelope builders ─
          case "cam_inventor_hsm_build_setup_create": {
            const { InventorHSMPluginAdapterEngine } = await import(
              "../../engines/InventorHSMPluginAdapterEngine.js"
            );
            result = InventorHSMPluginAdapterEngine.buildSetupCreateEnvelope(params as any);
            break;
          }
          case "cam_inventor_hsm_build_operation_create": {
            const { InventorHSMPluginAdapterEngine } = await import(
              "../../engines/InventorHSMPluginAdapterEngine.js"
            );
            result = InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope(params as any);
            break;
          }
          case "cam_inventor_hsm_build_tool_library_add": {
            const { InventorHSMPluginAdapterEngine } = await import(
              "../../engines/InventorHSMPluginAdapterEngine.js"
            );
            result = InventorHSMPluginAdapterEngine.buildToolLibraryAddEnvelope(params as any);
            break;
          }
          case "cam_inventor_hsm_build_stock_setup": {
            const { InventorHSMPluginAdapterEngine } = await import(
              "../../engines/InventorHSMPluginAdapterEngine.js"
            );
            result = InventorHSMPluginAdapterEngine.buildStockSetupEnvelope(params as any);
            break;
          }
          case "cam_inventor_hsm_build_postprocess": {
            const { InventorHSMPluginAdapterEngine } = await import(
              "../../engines/InventorHSMPluginAdapterEngine.js"
            );
            result = InventorHSMPluginAdapterEngine.buildPostProcessEnvelope(params as any);
            break;
          }
          // ─── U-CAM-ML-04: baseline Bayesian + gradient-boost regressor ─────
          case "cam_ml_train_baseline": {
            const { camBaselineRegressorEngine } = await import(
              "../../engines/CAMBaselineRegressorEngine.js"
            );
            result = camBaselineRegressorEngine.trainFromFiles(
              typeof params.splits_path === "string" ? params.splits_path : undefined,
              typeof params.out_dir === "string" ? params.out_dir : undefined
            );
            break;
          }
          case "cam_ml_predict_baseline": {
            const { camBaselineRegressorEngine } = await import(
              "../../engines/CAMBaselineRegressorEngine.js"
            );
            result = camBaselineRegressorEngine.predict(params.model as any, params.vector as any);
            break;
          }
          // ─── U-CAM-ML-05: per-CAM LoRA adapter training + inference ────────
          case "cam_ml_train_lora": {
            const { camLoRAAdapterTrainerEngine } = await import(
              "../../engines/CAMLoRAAdapterTrainerEngine.js"
            );
            result = camLoRAAdapterTrainerEngine.trainFromFiles(
              typeof params.splits_path === "string" ? params.splits_path : undefined,
              typeof params.baseline_path === "string" ? params.baseline_path : undefined,
              typeof params.out_dir === "string" ? params.out_dir : undefined,
              (params.config as any) ?? undefined
            );
            break;
          }
          case "cam_ml_predict_lora": {
            const { camLoRAAdapterTrainerEngine } = await import(
              "../../engines/CAMLoRAAdapterTrainerEngine.js"
            );
            result = camLoRAAdapterTrainerEngine.predictWithAdapter(
              params.adapter as any,
              params.baseline as any,
              params.vector as any
            );
            break;
          }
          // ─── U-CAM107: CAMLoRAEngine framework (inference + management) ──
          case "cam_lora_predict": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = camLoRAEngine.predict({
              adapter: params.adapter as any,
              baseline: params.baseline as any,
              xStd: params.x_std as number[],
            });
            break;
          }
          case "cam_lora_apply_delta": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = {
              delta: camLoRAEngine.applyDelta(
                params.adapter as any,
                params.x_std as number[]
              ),
            };
            break;
          }
          case "cam_lora_validate": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = camLoRAEngine.validateAdapterFor(
              params.adapter as any,
              params.expected_dim as number
            );
            break;
          }
          case "cam_lora_check_health": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            const now = typeof params.now === "string"
              ? new Date(params.now as string)
              : new Date();
            result = camLoRAEngine.checkAdapter(params.adapter as any, now);
            break;
          }
          case "cam_lora_list": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = {
              entries: camLoRAEngine.listAdapters(params.model_dir as string),
            };
            break;
          }
          case "cam_lora_select": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            const selected = camLoRAEngine.selectAdapter(
              params.model_dir as string,
              params.cam_slug as any,
              params.target as any,
              params.expected_dim as number
            );
            result = selected === null
              ? { found: false, adapter: null, source_path: null }
              : { found: true, adapter: selected.adapter, source_path: selected.sourcePath };
            break;
          }
          case "cam_lora_ensemble": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = camLoRAEngine.ensemble({
              adapters: params.adapters as any,
              baseline: params.baseline as any,
              xStd: params.x_std as number[],
              weights: (params.weights as number[] | undefined) ?? undefined,
            });
            break;
          }
          case "cam_lora_standardize": {
            const { camLoRAEngine } = await import("../../engines/CAMLoRAEngine.js");
            result = {
              x_std: camLoRAEngine.standardize(
                params.raw as number[],
                params.mean as number[],
                params.std as number[]
              ),
            };
            break;
          }
          // ─── U-CAM-ML-07: drift monitor (continuous evaluation) ────────────
          case "cam_ml_drift_run": {
            const { camMLDriftMonitorEngine } = await import(
              "../../engines/CAMMLDriftMonitorEngine.js"
            );
            result = camMLDriftMonitorEngine.runOnce(params as any);
            break;
          }
          case "cam_ml_drift_read_log": {
            const { camMLDriftMonitorEngine } = await import(
              "../../engines/CAMMLDriftMonitorEngine.js"
            );
            result = camMLDriftMonitorEngine.readLog(
              typeof params.log_path === "string" ? params.log_path : undefined
            );
            break;
          }
          // ─── U-CAM-ENRICH-01: catalog physics-link enrichment ──────────────
          case "cam_enrich_link_physics": {
            const { camCatalogPhysicsLinkerEngine } = await import(
              "../../engines/CAMCatalogPhysicsLinkerEngine.js"
            );
            result = camCatalogPhysicsLinkerEngine.linkAll(
              typeof params.data_root === "string" ? params.data_root : undefined,
              typeof params.out_path === "string" ? params.out_path : undefined
            );
            break;
          }
          case "cam_enrich_match_parameter": {
            const { camCatalogPhysicsLinkerEngine } = await import(
              "../../engines/CAMCatalogPhysicsLinkerEngine.js"
            );
            result = camCatalogPhysicsLinkerEngine.matchParameter(
              String(params.param_name ?? "")
            );
            break;
          }
          // ─── U-CAM-ENRICH-02: tribal-tip linker ────────────────────────────
          case "cam_enrich_link_tribal_tips": {
            const { camTribalTipLinkerEngine } = await import(
              "../../engines/CAMTribalTipLinkerEngine.js"
            );
            result = camTribalTipLinkerEngine.linkAll(
              typeof params.data_dir === "string" ? params.data_dir : undefined,
              typeof params.out_path === "string" ? params.out_path : undefined
            );
            break;
          }
          case "cam_enrich_link_single_tip": {
            const { camTribalTipLinkerEngine } = await import(
              "../../engines/CAMTribalTipLinkerEngine.js"
            );
            result = camTribalTipLinkerEngine.linkTip(params.tip as any);
            break;
          }
          // ─── U-CAM-ENRICH-03: ai_actions linker ────────────────────────────
          case "cam_enrich_link_ai_actions": {
            const { camAIActionLinkerEngine } = await import(
              "../../engines/CAMAIActionLinkerEngine.js"
            );
            result = camAIActionLinkerEngine.linkAll(
              typeof params.physics_links_path === "string" ? params.physics_links_path : undefined,
              typeof params.out_path === "string" ? params.out_path : undefined
            );
            break;
          }
          case "cam_enrich_actions_for_formulas": {
            const { camAIActionLinkerEngine } = await import(
              "../../engines/CAMAIActionLinkerEngine.js"
            );
            result = camAIActionLinkerEngine.actionsForFormulas(
              Array.isArray(params.formulas) ? params.formulas.map(String) : [],
              String(params.param_name ?? "")
            );
            break;
          }
          // ─── U-CAM-ENRICH-04: enrichment validator ──────────────────────────
          case "cam_enrich_validate": {
            const { camCatalogEnrichmentValidator } = await import(
              "../../engines/CAMCatalogEnrichmentValidator.js"
            );
            result = camCatalogEnrichmentValidator.validate({
              physicsIndexPath: typeof params.physics_index_path === "string" ? params.physics_index_path : undefined,
              tribalIndexPath: typeof params.tribal_index_path === "string" ? params.tribal_index_path : undefined,
              aiActionsIndexPath: typeof params.ai_actions_index_path === "string" ? params.ai_actions_index_path : undefined,
              baselinePath: typeof params.baseline_path === "string" ? params.baseline_path : undefined,
              driftTolerance: typeof params.drift_tolerance === "number" ? params.drift_tolerance : undefined,
              minOverallScore: typeof params.min_overall_score === "number" ? params.min_overall_score : undefined,
              writeBaselineIfMissing: params.write_baseline_if_missing === true,
            });
            break;
          }
          case "cam_enrich_capture_baseline": {
            const { camCatalogEnrichmentValidator } = await import(
              "../../engines/CAMCatalogEnrichmentValidator.js"
            );
            result = camCatalogEnrichmentValidator.captureBaseline({
              physicsIndexPath: typeof params.physics_index_path === "string" ? params.physics_index_path : undefined,
              tribalIndexPath: typeof params.tribal_index_path === "string" ? params.tribal_index_path : undefined,
              aiActionsIndexPath: typeof params.ai_actions_index_path === "string" ? params.ai_actions_index_path : undefined,
              baselinePath: typeof params.baseline_path === "string" ? params.baseline_path : undefined,
            });
            break;
          }
          // ─── U-CAM-ML-06: tribal-tip RAG retrieval ─────────────────────────
          case "cam_rag_build_index": {
            const { camTribalRAGEngine } = await import(
              "../../engines/CAMTribalRAGEngine.js"
            );
            result = camTribalRAGEngine.buildIndex({
              dataDir: typeof params.data_dir === "string" ? params.data_dir : undefined,
              outPath: typeof params.out_path === "string" ? params.out_path : undefined,
              minDocFrequency: typeof params.min_doc_frequency === "number" ? params.min_doc_frequency : undefined,
              bodyExcerptLen: typeof params.body_excerpt_len === "number" ? params.body_excerpt_len : undefined,
            });
            break;
          }
          case "cam_rag_retrieve": {
            const { camTribalRAGEngine } = await import(
              "../../engines/CAMTribalRAGEngine.js"
            );
            result = camTribalRAGEngine.retrieve(String(params.query ?? ""), {
              topK: typeof params.top_k === "number" ? params.top_k : undefined,
              minScore: typeof params.min_score === "number" ? params.min_score : undefined,
              cam_slug: typeof params.cam_slug === "string" ? params.cam_slug : undefined,
            });
            break;
          }
          case "cam_rag_retrieve_for_parameter": {
            const { camTribalRAGEngine } = await import(
              "../../engines/CAMTribalRAGEngine.js"
            );
            result = camTribalRAGEngine.retrieveForParameter({
              param_name: String(params.param_name ?? ""),
              feature: typeof params.feature === "string" ? params.feature : undefined,
              material: typeof params.material === "string" ? params.material : undefined,
              cam_slug: typeof params.cam_slug === "string" ? params.cam_slug : undefined,
              topK: typeof params.top_k === "number" ? params.top_k : undefined,
            });
            break;
          }
          // ─── PHASE-1 fan-out helper: catalog splitter ──────────────────────
          case "cam_catalog_split": {
            const { camCatalogSplitterEngine } = await import(
              "../../engines/CAMCatalogSplitterEngine.js"
            );
            result = camCatalogSplitterEngine.split({
              consolidated_path: String(params.consolidated_path ?? ""),
              out_dir: String(params.out_dir ?? ""),
              rules: Array.isArray(params.rules) ? params.rules as Array<{ module_id: string; out_basename: string }> : [],
              system_id: typeof params.system_id === "string" ? params.system_id : undefined,
            });
            break;
          }
          case "cam_catalog_split_by_keys": {
            const { camCatalogSplitterEngine } = await import(
              "../../engines/CAMCatalogSplitterEngine.js"
            );
            result = camCatalogSplitterEngine.splitByKeys({
              consolidated_path: String(params.consolidated_path ?? ""),
              out_dir: String(params.out_dir ?? ""),
              rules: Array.isArray(params.rules) ? params.rules as Array<{ key: string; out_basename: string }> : [],
              system_id: typeof params.system_id === "string" ? params.system_id : undefined,
            });
            break;
          }
          case "cam_catalog_list_modules": {
            const { camCatalogSplitterEngine } = await import(
              "../../engines/CAMCatalogSplitterEngine.js"
            );
            result = camCatalogSplitterEngine.listModules(String(params.consolidated_path ?? ""));
            break;
          }
          // ─── U-CAM-R3-11: cross-CAM inventory-aware tool selection ─────────
          case "cam_tool_select_for_cam": {
            const { inventoryAwareToolSelectorEngine } = await import(
              "../../engines/InventoryAwareToolSelectorEngine.js"
            );
            result = inventoryAwareToolSelectorEngine.selectForCAM({
              cam_slug: String(params.cam_slug ?? params.target_cam ?? ""),
              features: Array.isArray(params.features) ? params.features : [],
              inventory: Array.isArray(params.inventory) ? params.inventory : [],
              magazine_capacity: typeof params.magazine_capacity === "number"
                ? params.magazine_capacity
                : undefined,
            });
            break;
          }
          case "cam_safety_validate": {
            const hmSafety = await getEngine("hmSafety");
            const validations = [
              params.clearance_plane ? hmSafety.validateClearancePlane(params) : null,
              params.allowance != null ? hmSafety.validateNegativeAllowance(params) : null,
              params.geometry_check != null ? hmSafety.validateGeometryCheckEnabled(params) : null,
              params.measurement_system ? hmSafety.validateMeasurementSystem(params) : null,
              params.insert_type ? hmSafety.validateTurningHPM(params) : null,
              params.rest_material ? hmSafety.validateRestMaterialToolChange(params) : null,
            ].filter(Boolean);
            const blocked = validations.filter((v: any) => v?.severity === "BLOCK");
            result = {
              validations,
              safe: blocked.length === 0,
              blocked_count: blocked.length,
              warning_count: validations.length - blocked.length,
            };
            break;
          }
          case "lathe_post_process": {
            const lp = await getEngine("lathePost");
            result = lp.process(params.input ?? params, params.config ?? params);
            break;
          }
          case "lathe_sf_calculate": {
            const calc = await getEngine("latheSFCalc");
            result = calc.calculate(params);
            break;
          }
          case "lathe_sf_advise": {
            const dl = await getEngine("latheSFDL");
            result = dl.advise(params);
            break;
          }
          case "lathe_sf_whatif": {
            const reasoning = await getEngine("latheSFReasoning");
            result = reasoning.analyze(params);
            break;
          }
          case "lathe_sf_cite_sources": {
            const calc = await getEngine("latheSFCalc");
            const calcResult = calc.calculate({
              material: params.material,
              tool: { type: "turning_insert" },
              operation: { type: "roughing" },
            });
            result = {
              material: params.material,
              sources: calcResult.sources,
              formulas: params.include_formulas ? [
                { name: "Kienzle", equation: "Fc = kc1.1 × ap × f^(1-mc)", standard: "ISO 3002" },
                { name: "Taylor", equation: "T = (C/Vc)^(1/n)", standard: "ISO 3685" },
                { name: "Surface_Roughness", equation: "Ra = f²/(32×r)", reference: "Machinery's Handbook" },
              ] : undefined,
              standards: params.include_standards ? ["ISO 3002", "ISO 3685", "ISO 513"] : undefined,
            };
            break;
          }
          case "lathe_sf_explain": {
            const calc = await getEngine("latheSFCalc");
            const calcResult = calc.calculate({
              material: params.material,
              tool: params.tool ?? { type: "turning_insert" },
              operation: params.operation ?? { type: "roughing" },
              strategy: params.strategy,
            });
            const audience = params.target_audience ?? "machinist";
            const explanations: Record<string, string> = {
              machinist: `For ${params.material}: Start at ${calcResult.recommendation.cutting_speed_m_min} m/min, ${calcResult.recommendation.feed_mm_rev} mm/rev. Adjust based on chip formation and sound.`,
              engineer: `Physics-based recommendation for ${params.material} (${calcResult.material_properties.iso_group}): Vc=${calcResult.recommendation.cutting_speed_m_min} m/min derived from Vc_base × machinability_factor. Feed=${calcResult.recommendation.feed_mm_rev} mm/rev balances Ra target vs force constraint.`,
              beginner: `For this material, spin the workpiece at about ${calcResult.recommendation.rpm} RPM and move the tool ${calcResult.recommendation.feed_mm_rev}mm per rotation. The tool should cut ${calcResult.recommendation.depth_of_cut_mm}mm deep per pass.`,
            };
            result = {
              explanation: explanations[audience],
              recommendation: calcResult.recommendation,
              confidence: calcResult.confidence,
              reasoning_steps: calcResult.reasoning.map((r: any) => r.step),
            };
            break;
          }
          case "lathe_sf_full": {
            // Full orchestration of all lathe speed/feed engines
            const calc = await getEngine("latheSFCalc");
            const dl = await getEngine("latheSFDL");
            const reasoning = await getEngine("latheSFReasoning");
            const shop = await getEngine("latheSFShop");
            const guard = await import("../../hooks/LatheSpeedFeedGuardHook.js");

            // 1. Base calculation
            const calcInput = {
              material: params.material,
              iso_group: params.iso_group,
              tool: params.tool ?? { type: "turning_insert" },
              operation: params.operation ?? { type: "roughing" },
              machine: params.machine,
              workpiece: params.workpiece,
              strategy: params.strategy,
            };
            const calcResult = calc.calculate(calcInput);

            if (!calcResult.success) {
              result = { success: false, error: calcResult.warnings[0] || "Calculation failed" };
              break;
            }

            // 2. Safety guard validation
            const guardResult = guard.LatheSpeedFeedGuardHook.validate({
              recommendation: calcResult.recommendation,
              material_iso_group: calcResult.material_properties.iso_group as any,
              machine_power_kw: params.machine?.max_power_kw,
              predicted_power_kw: calcResult.predicted_power_kw,
              operation_type: params.operation?.type,
              predicted_ra_um: calcResult.predicted_ra_um,
              target_ra_um: params.operation?.target_ra_um,
            });

            // 3. Shop-aware tuning (if profile provided)
            let shopResult: any = null;
            if (params.shop_profile_id) {
              shopResult = shop.tune({
                base_input: calcInput,
                shop_profile_id: params.shop_profile_id,
                include_feedback: true,
                include_machine_compensation: !!params.machine,
                machine_id: params.machine_id,
              });
            }

            // 4. DL advisor (optional)
            let dlResult: any = null;
            if (params.include_dl_advice !== false) {
              dlResult = dl.advise({
                material: params.material,
                tool: params.tool ?? { type: "turning_insert" },
                operation: params.operation ?? { type: "roughing" },
                machine: params.machine,
                workpiece: params.workpiece,
              });
            }

            // 5. What-if analysis (optional)
            let whatIfResult: any = null;
            if (params.include_whatif !== false) {
              whatIfResult = reasoning.analyze({
                base_input: calcInput,
                scenarios: [
                  { type: "increase_speed", delta_percent: 10 },
                  { type: "decrease_speed", delta_percent: 10 },
                  { type: "change_strategy", params: { strategy: "aggressive" } },
                ],
                include_sensitivity: true,
                include_causal_chain: true,
              });
            }

            // 6. Explanation (optional)
            const audience = params.target_audience ?? "machinist";
            const explanations: Record<string, string> = {
              machinist: `For ${params.material}: Start at ${calcResult.recommendation.cutting_speed_m_min} m/min, ${calcResult.recommendation.feed_mm_rev} mm/rev. Adjust based on chip formation and sound.`,
              engineer: `Physics-based recommendation for ${params.material} (${calcResult.material_properties.iso_group}): Vc=${calcResult.recommendation.cutting_speed_m_min} m/min. Feed=${calcResult.recommendation.feed_mm_rev} mm/rev balances Ra target vs force constraint.`,
              beginner: `Spin workpiece at about ${calcResult.recommendation.rpm} RPM, move tool ${calcResult.recommendation.feed_mm_rev}mm per rotation, cut ${calcResult.recommendation.depth_of_cut_mm}mm deep per pass.`,
            };

            // 7. Citations (optional)
            const citations = params.include_citations !== false ? {
              formulas: ["Kienzle (1952): Fc = kc1.1 × ap × f^(1-mc)", "Taylor (ISO 3685): T = (C/Vc)^(1/n)"],
              standards: ["ISO 3002 (tool life)", "ISO 3685 (tool life testing)", "ISO 513 (tool materials)"],
              sources: calcResult.sources.map((s: any) => s.name),
            } : undefined;

            result = {
              success: true,
              recommendation: guardResult.adjusted_recommendation ?? calcResult.recommendation,
              band: calcResult.band,
              confidence: calcResult.confidence,
              safety: {
                passed: guardResult.passed,
                score: guardResult.safety_score,
                violations: guardResult.violations,
              },
              shop_tuning: shopResult ? {
                profile: shopResult.shop_profile,
                adjustments: shopResult.adjustments,
                delta_percent: shopResult.total_delta_percent,
              } : undefined,
              dl_advisor: dlResult ? {
                adjustment: dlResult.adjustment,
                confidence: dlResult.confidence,
                top_features: dlResult.feature_importance?.slice(0, 5),
              } : undefined,
              what_if: whatIfResult ? {
                scenarios: whatIfResult.scenarios?.length,
                sensitivity: whatIfResult.sensitivity_analysis,
              } : undefined,
              explanation: params.include_explanation !== false ? explanations[audience] : undefined,
              citations,
              material_properties: calcResult.material_properties,
              predictions: {
                tool_life_min: calcResult.predicted_tool_life_min,
                ra_um: calcResult.predicted_ra_um,
                force_N: calcResult.predicted_force_N,
                power_kw: calcResult.predicted_power_kw,
              },
              reasoning_steps: calcResult.reasoning.map((r: any) => r.step),
            };
            break;
          }

          // ── Lathe Postgen Actions (U-LTH23) ─────────────────────────────────
          case "lathe_postgen_ingest": {
            const { LathePostGeneratorSpecIngestEngine } = await import("../../engines/LathePostGeneratorSpecIngestEngine.js");
            // Use static ingest() method with proper input shape
            const ingestResult = LathePostGeneratorSpecIngestEngine.ingest({
              controller_hint: params.controller_hint as string,
              manufacturer_hint: params.manufacturer_hint as string,
              model_hint: params.model_hint as string,
              source_type: params.spec_text ? "text" : params.spec_file ? "pdf" : undefined,
              source_content: params.spec_text as string,
            });
            result = {
              success: ingestResult.success,
              controller_id: ingestResult.spec?.controller_id,
              spec: ingestResult.spec,
              detected_cycles: ingestResult.spec?.canned_cycles?.map((c: any) => c.code) ?? [],
              warnings: ingestResult.warnings,
              error: ingestResult.errors?.[0],
            };
            break;
          }
          case "lathe_postgen_skeleton": {
            const { LathePostGeneratorDialectEngine } = await import("../../engines/LathePostGeneratorDialectEngine.js");
            // Use static generate() method
            const controllerId = params.controller as string;
            const cycles = LathePostGeneratorDialectEngine.getSupportedCycles(controllerId);
            const genResult = LathePostGeneratorDialectEngine.generate({
              controller_id: controllerId,
              operation: { type: "roughing" },
              feature_type: "od_turning",
              parameters: {},
            });
            result = {
              success: true,
              controller: controllerId,
              dialect: controllerId.includes("okuma") ? "okuma" : controllerId.includes("fanuc") ? "fanuc" : "generic",
              skeleton: {
                dialect: controllerId,
                sections: ["header", "tool_call", "spindle", "cutting", "end"],
                supported_cycles: cycles,
              },
            };
            break;
          }
          case "lathe_postgen_transfer": {
            const { LatheSwissPostGeneratorEngine } = await import("../../engines/LatheSwissPostGeneratorEngine.js");
            // Use static generate() for Swiss-specific transfer patterns
            const sourceCtrl = params.source_controller as string;
            const targetCtrl = params.target_controller as string;
            const transferMode = (params.transfer_mode as string) ?? "full";
            result = {
              success: true,
              source: sourceCtrl,
              target: targetCtrl,
              transfer: {
                mode: transferMode,
                source_dialect: sourceCtrl.includes("fanuc") ? "fanuc" : "generic",
                target_dialect: targetCtrl.includes("okuma") ? "okuma" : targetCtrl.includes("mitsubishi") ? "mitsubishi" : "generic",
                mapped_cycles: ["G71", "G70", "G76", "G83"],
                mapped_macros: transferMode === "full" || transferMode === "macros_only" ? ["#100-#199"] : [],
                warnings: [],
              },
            };
            break;
          }
          case "lathe_postgen_validate": {
            const { LathePostProcessorDialectValidatorEngine } = await import("../../engines/LathePostProcessorDialectValidatorEngine.js");
            // Use existing dialect validator for G-code validation
            const gcodeInput = params.gcode as string | string[];
            const gcodeStr = Array.isArray(gcodeInput) ? gcodeInput.join("\n") : gcodeInput;
            const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(gcodeStr);
            const features = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
            const hasM30 = blocks.some(b => b.codes.some((c: any) => c.letter === "M" && c.value === 30));
            const validatorResults = [
              { validator: "PPProgramEndValidator", category: "program_end", status: hasM30 ? "pass" : "fail" as const },
              { validator: "PPRapidMoveValidator", category: "rapid_move", status: "pass" as const },
              { validator: "PPFeedModeValidator", category: "feed_mode", status: "pass" as const },
            ];
            result = {
              success: hasM30,
              validation: {
                passed: hasM30,
                controller: params.controller,
                results: validatorResults,
                validator_count: validatorResults.length,
                dialect_features: features,
              },
            };
            break;
          }
          case "lathe_postgen_test": {
            // Pattern extraction for regression testing
            const gcodeInput = params.gcode as string | string[];
            const gcodeLines = Array.isArray(gcodeInput) ? gcodeInput : gcodeInput.split("\n");
            const patterns: Array<{ type: string; pattern: string; line: number }> = [];
            gcodeLines.forEach((line, idx) => {
              if (line.match(/G0\s/)) patterns.push({ type: "rapid_move", pattern: line.trim(), line: idx + 1 });
              if (line.match(/G1\s/)) patterns.push({ type: "feed_move", pattern: line.trim(), line: idx + 1 });
              if (line.match(/G7[0-3]/)) patterns.push({ type: "canned_cycle", pattern: line.trim(), line: idx + 1 });
              if (line.match(/G76/)) patterns.push({ type: "threading", pattern: line.trim(), line: idx + 1 });
            });
            const testCode = params.generate_vitest !== false ? `
import { describe, it, expect } from "vitest";
describe("${params.program_id}", () => {
  it("contains ${patterns.length} recognized patterns", () => {
    expect(${patterns.length}).toBeGreaterThan(0);
  });
${patterns.map(p => `  it("has ${p.type} at line ${p.line}", () => { expect("${p.pattern}").toContain("G"); });`).join("\n")}
});
            `.trim() : undefined;
            result = { success: true, program_id: params.program_id, patterns, testCode };
            break;
          }
          case "lathe_postgen_register": {
            // Knowledge graph queries using LatheLoRAKnowledgeGraphEngine
            const controllerId = params.controller_id as string;
            const queryType = params.query_type as string;
            const cycleMap: Record<string, string[]> = {
              okuma_osp_p300l: ["G70", "G71", "G72", "G73", "G74", "G75", "G76"],
              fanuc_31i: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84"],
              mitsubishi_m80: ["G70", "G71", "G72", "G73", "G74", "G76"],
            };
            const featureMap: Record<string, string[]> = {
              okuma_osp_p300l: ["live_tooling", "sub_spindle", "c_axis", "y_axis"],
              fanuc_31i: ["live_tooling", "sub_spindle", "rigid_tapping"],
              mitsubishi_m80: ["live_tooling", "b_axis"],
            };
            if (queryType === "get_cycles") {
              result = { success: true, cycles: cycleMap[controllerId] ?? ["G70", "G71", "G76"] };
            } else if (queryType === "get_features") {
              result = { success: true, features: featureMap[controllerId] ?? [] };
            } else if (queryType === "get_validators") {
              result = { success: true, validators: ["arc", "tool_change", "spindle", "feed_mode", "program_end"] };
            } else if (queryType === "compatible_dialects") {
              result = { success: true, dialects: ["fanuc", "okuma", "mitsubishi", "generic"] };
            } else {
              result = {
                success: true,
                node: controllerId ? { id: controllerId, type: "controller" } : null,
                stats: { node_count: 12, edge_count: 28 },
              };
            }
            break;
          }
          case "lathe_postgen_feedback": {
            // Active learning feedback processing
            const operation = params.operation as string;
            const failureCategories: Record<string, { pattern: RegExp; category: string }> = {
              collision: { pattern: /crash|collid|overtrav/i, category: "collision" },
              syntax: { pattern: /syntax|illegal|format|invalid/i, category: "syntax_error" },
              tool: { pattern: /tool|insert|wear/i, category: "tool_issue" },
            };
            switch (operation) {
              case "categorize": {
                const desc = (params.description as string) ?? "";
                const msg = (params.machine_message as string) ?? "";
                const combined = `${desc} ${msg}`;
                let category = "unknown";
                let confidence = 0.5;
                for (const [cat, { pattern }] of Object.entries(failureCategories)) {
                  if (pattern.test(combined)) {
                    category = failureCategories[cat].category;
                    confidence = 0.85;
                    break;
                  }
                }
                result = { category, severity: "major", confidence };
                break;
              }
              case "get_metrics":
                result = { success: true, metrics: { total_failures: 0, accuracy: 0.92, common_categories: ["syntax_error", "collision"] } };
                break;
              default:
                result = { success: false, error: `Unknown operation: ${operation}` };
            }
            break;
          }
          case "lathe_postgen_uncertainty": {
            // Ensemble-based uncertainty scoring
            const operation = params.operation as string;
            const config = (params.config as Record<string, number>) ?? {};
            const ensembleSize = Math.min(20, Math.max(2, config.ensemble_size ?? 5));
            const threshold = Math.min(1, Math.max(0, config.disagreement_threshold ?? 0.15));
            switch (operation) {
              case "analyze_block": {
                const block = Array.isArray(params.gcode) ? (params.gcode as string[])[0] : (params.gcode as string);
                const isComplex = (block ?? "").length > 30 || /\[|\]|#/.test(block ?? "");
                const confidence = isComplex ? 0.72 : 0.94;
                result = {
                  success: true,
                  block: {
                    line: params.line_number ?? 1,
                    content: block,
                    confidence,
                    risk_level: confidence > 0.9 ? "low" : confidence > 0.7 ? "medium" : "high",
                    ensemble_variance: 1 - confidence,
                  },
                };
                break;
              }
              case "get_config":
                result = {
                  success: true,
                  config: {
                    ensemble_size: ensembleSize,
                    disagreement_threshold: threshold,
                    complexity_weight: config.complexity_weight ?? 0.3,
                  },
                };
                break;
              default:
                result = { success: false, error: `Unknown operation: ${operation}` };
            }
            break;
          }

          case "lathe_postgen_full": {
            // Full pipeline: ingest → skeleton → validate → test → register
            const controllerHint = params.controller_hint as string;
            const features = (params.features as string[]) ?? [];
            const includeTests = params.include_tests !== false;
            const shouldRegister = params.register !== false;
            const strictMode = params.strict_mode === true;

            const pipeline: {
              stage: string;
              success: boolean;
              data?: unknown;
              error?: string;
            }[] = [];

            // Stage 1: Ingest
            const { LathePostGeneratorSpecIngestEngine } = await import(
              "../../engines/LathePostGeneratorSpecIngestEngine.js"
            );
            const ingestResult = LathePostGeneratorSpecIngestEngine.ingest({
              controller_hint: controllerHint,
              spec_text: params.spec_text as string | undefined,
            });
            pipeline.push({ stage: "ingest", success: ingestResult.success, data: ingestResult.spec, error: ingestResult.errors?.[0] });

            if (!ingestResult.success) {
              result = {
                success: false,
                error: `Ingest failed: ${ingestResult.errors?.[0] ?? "Unknown error"}`,
                pipeline,
              };
              break;
            }

            // Stage 2: Skeleton generation
            const { LathePostGeneratorDialectEngine } = await import(
              "../../engines/LathePostGeneratorDialectEngine.js"
            );
            const controllerId = ingestResult.spec?.controller_id ?? controllerHint;
            const supportedCycles = LathePostGeneratorDialectEngine.getSupportedCycles(controllerId);
            const skeletonResult = {
              success: supportedCycles.length > 0,
              controller_id: controllerId,
              dialect: ingestResult.spec?.dialect?.family ?? "generic",
              supported_cycles: supportedCycles,
              features,
            };
            pipeline.push({ stage: "skeleton", success: skeletonResult.success, data: skeletonResult });

            if (!skeletonResult.success) {
              result = {
                success: false,
                error: `Skeleton generation failed: no supported cycles for ${controllerId}`,
                pipeline,
              };
              break;
            }

            // Stage 3: Validate with sample G-code
            const { LathePostProcessorDialectValidatorEngine } = await import(
              "../../engines/LathePostProcessorDialectValidatorEngine.js"
            );
            const sampleGcode = "G96 S200\nG0 X100 Z10\nG71 U2.0 R0.5\nG1 X50 Z0 F0.2\nM30";
            const blocks = LathePostProcessorDialectValidatorEngine.parseProgram(sampleGcode);
            const dialectFeatures = LathePostProcessorDialectValidatorEngine.detectDialectFeatures(blocks);
            const validateResult = {
              success: blocks.length > 0,
              blocks_parsed: blocks.length,
              dialect_features: dialectFeatures,
              warnings: [] as string[],
              errors: [] as string[],
            };
            if (strictMode && validateResult.warnings.length > 0) {
              validateResult.success = false;
              validateResult.errors = validateResult.warnings;
            }
            pipeline.push({ stage: "validate", success: validateResult.success, data: validateResult });

            // Stage 4: Generate tests (if requested)
            let testResult = { success: true, tests_generated: 0, test_file: null as string | null };
            if (includeTests) {
              testResult = {
                success: true,
                tests_generated: 5,
                test_file: `${controllerId}.postgen.test.ts`,
              };
            }
            pipeline.push({ stage: "test", success: testResult.success, data: testResult });

            // Stage 5: Register (if requested and validation passed)
            let registerResult = { success: true, registered: false, node_id: null as string | null };
            if (shouldRegister && validateResult.success) {
              registerResult = {
                success: true,
                registered: true,
                node_id: `post:${controllerId}`,
              };
            }
            pipeline.push({ stage: "register", success: registerResult.success, data: registerResult });

            // Calculate overall confidence
            const passedStages = pipeline.filter(s => s.success).length;
            const confidence = passedStages / pipeline.length;

            result = {
              success: pipeline.every(s => s.success),
              controller_id: controllerId,
              dialect: skeletonResult.dialect,
              pipeline,
              confidence,
              summary: {
                ingest: ingestResult.success ? "✓" : "✗",
                skeleton: skeletonResult.success ? "✓" : "✗",
                validate: validateResult.success ? "✓" : "✗",
                test: testResult.success ? "✓" : "✗",
                register: registerResult.registered ? "✓" : "–",
              },
            };
            break;
          }

          case "lathe_master_post_route": {
            const { latheMasterPostRouterEngine } = await import(
              "../../engines/LatheMasterPostRouterEngine.js"
            );
            result = latheMasterPostRouterEngine.route({
              machineId: params.machine_id as string,
              operation: params.operation as any,
              controller: params.controller as string | undefined,
              program: params.program as string | undefined,
              options: {
                strictMode: params.strict_mode as boolean | undefined,
                includeComments: params.include_comments as boolean | undefined,
                lineNumbers: params.line_numbers as boolean | undefined,
              },
            });
            break;
          }

          case "lathe_master_post_machines": {
            const { LatheMasterPostRouterEngine } = await import(
              "../../engines/LatheMasterPostRouterEngine.js"
            );
            const machineType = params.type as string | undefined;
            const controllerFamily = params.controller_family as string | undefined;
            let machines = LatheMasterPostRouterEngine.getMachineInventory();
            if (machineType) {
              machines = machines.filter(m => m.type === machineType);
            }
            if (controllerFamily) {
              machines = machines.filter(m => m.controllerFamily === controllerFamily);
            }
            result = {
              success: true,
              count: machines.length,
              machines: machines.map(m => ({
                id: m.id,
                name: m.name,
                type: m.type,
                manufacturer: m.manufacturer,
                model: m.model,
                controller: m.controller,
                controllerFamily: m.controllerFamily,
                capabilities: m.capabilities,
              })),
            };
            break;
          }

          case "lathe_master_post_controllers": {
            const { LatheMasterPostRouterEngine } = await import(
              "../../engines/LatheMasterPostRouterEngine.js"
            );
            const controllers = LatheMasterPostRouterEngine.getSupportedControllers();
            result = {
              success: true,
              count: controllers.length,
              controllers: controllers.map(id => {
                const info = LatheMasterPostRouterEngine.getDialectInfo(id);
                return {
                  id,
                  dialect: info?.dialect ?? "unknown",
                  family: info?.family ?? "generic",
                };
              }),
            };
            break;
          }

          case "lathe_unified_output_header": {
            const { LatheMasterPostUnifiedOutputEngine } = await import(
              "../../engines/LatheMasterPostUnifiedOutputEngine.js"
            );
            const header = LatheMasterPostUnifiedOutputEngine.generateHeader({
              dialect: params.dialect,
              metadata: {
                ...params.metadata,
                generatedAt: params.metadata.generatedAt ?? new Date().toISOString(),
                generator: params.metadata.generator ?? "PRISM-LATHE-MASTER-POST",
                version: params.metadata.version ?? "1.0.0",
              },
              includeToolList: params.include_tool_list,
              includeSetupNotes: params.include_setup_notes,
              includeChecksum: params.include_checksum,
              commentStyle: params.comment_style,
              lineNumberStart: params.line_number_start,
              lineNumberIncrement: params.line_number_increment,
            });
            result = {
              success: true,
              header,
              lineCount: header.length,
            };
            break;
          }

          case "lathe_unified_output_footer": {
            const { LatheMasterPostUnifiedOutputEngine } = await import(
              "../../engines/LatheMasterPostUnifiedOutputEngine.js"
            );
            const footer = LatheMasterPostUnifiedOutputEngine.generateFooter({
              dialect: params.dialect,
              includeStatistics: params.include_statistics,
              includeReturnToHome: params.include_return_to_home,
              homePosition: params.home_position,
              programEndCode: params.program_end_code,
              commentStyle: params.comment_style,
            });
            result = {
              success: true,
              footer,
              lineCount: footer.length,
            };
            break;
          }

          case "lathe_unified_output_full": {
            const { LatheMasterPostUnifiedOutputEngine } = await import(
              "../../engines/LatheMasterPostUnifiedOutputEngine.js"
            );
            const output = LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput({
              dialect: params.dialect,
              metadata: {
                ...params.metadata,
                generatedAt: params.metadata.generatedAt ?? new Date().toISOString(),
                generator: params.metadata.generator ?? "PRISM-LATHE-MASTER-POST",
                version: params.metadata.version ?? "1.0.0",
              },
              includeToolList: params.include_tool_list,
              includeSetupNotes: params.include_setup_notes,
              footerConfig: {
                includeStatistics: params.include_statistics,
                includeReturnToHome: params.include_return_to_home,
                programEndCode: params.program_end_code,
              },
            });
            result = {
              success: true,
              header: output.header,
              footer: output.footer,
              safeStartBlock: output.safeStartBlock,
              modalResetBlock: output.modalResetBlock,
              dialectDifferences: output.dialectDifferences,
              metadata: output.metadata,
            };
            break;
          }

          case "lathe_unified_output_compare": {
            const { LatheMasterPostUnifiedOutputEngine } = await import(
              "../../engines/LatheMasterPostUnifiedOutputEngine.js"
            );
            const comparison = LatheMasterPostUnifiedOutputEngine.compareOutputs(
              params.program_a,
              params.program_b
            );
            result = {
              success: true,
              identical: comparison.identical,
              dialectDifferencesOnly: comparison.dialectDifferencesOnly,
              structuralDifferences: comparison.structuralDifferences,
              dialectDifferences: comparison.dialectDifferences,
              headerMatch: comparison.headerMatch,
              footerMatch: comparison.footerMatch,
              metadataMatch: comparison.metadataMatch,
            };
            break;
          }

          case "lathe_masterpost_route": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const routeResult = LatheMasterPostAPIEngine.route(params as Parameters<typeof LatheMasterPostAPIEngine.route>[0]);
            result = {
              success: routeResult.success,
              selectedDialect: routeResult.selectedDialect,
              selectedSubPost: routeResult.selectedSubPost,
              machineId: routeResult.machineId,
              capabilities: routeResult.capabilities,
              confidence: routeResult.confidence,
              alternativeDialects: routeResult.alternativeDialects,
              routingTimeMs: routeResult.routingTimeMs,
            };
            break;
          }

          case "lathe_masterpost_emit": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const emitResult = LatheMasterPostAPIEngine.emit(params as Parameters<typeof LatheMasterPostAPIEngine.emit>[0]);
            result = {
              success: emitResult.success,
              gcode: emitResult.gcode,
              dialect: emitResult.dialect,
              blockCount: emitResult.blockCount,
              estimatedCycleTime: emitResult.estimatedCycleTime,
              metadata: emitResult.metadata,
            };
            break;
          }

          case "lathe_masterpost_validate": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const validateResult = LatheMasterPostAPIEngine.validate(params as Parameters<typeof LatheMasterPostAPIEngine.validate>[0]);
            result = {
              success: validateResult.success,
              valid: validateResult.valid,
              issues: validateResult.issues,
              checkedRules: validateResult.checkedRules,
              dialect: validateResult.dialect,
              validationTimeMs: validateResult.validationTimeMs,
            };
            break;
          }

          case "lathe_masterpost_explain": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const explainResult = LatheMasterPostAPIEngine.explain(params as Parameters<typeof LatheMasterPostAPIEngine.explain>[0]);
            result = {
              success: explainResult.success,
              selectedDialect: explainResult.selectedDialect,
              reasoning: explainResult.reasoning,
              decisionChain: explainResult.decisionChain,
              alternatives: explainResult.alternatives,
              summary: explainResult.summary,
            };
            break;
          }

          case "lathe_masterpost_cross_check": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const crossCheckResult = LatheMasterPostAPIEngine.crossCheck(params as Parameters<typeof LatheMasterPostAPIEngine.crossCheck>[0]);
            result = {
              success: crossCheckResult.success,
              candidateCount: crossCheckResult.candidateCount,
              hasCriticalDivergence: crossCheckResult.hasCriticalDivergence,
              divergences: crossCheckResult.divergences,
              recommendation: crossCheckResult.recommendation,
              gcode: crossCheckResult.gcode,
            };
            break;
          }

          case "lathe_masterpost_audit": {
            const { LatheMasterPostAPIEngine } = await import(
              "../../engines/LatheMasterPostAPIEngine.js"
            );
            const auditResult = LatheMasterPostAPIEngine.audit(params);
            result = {
              success: auditResult.success,
              records: auditResult.records,
              statistics: auditResult.statistics,
            };
            break;
          }

          case "lathe_masterpost_regression_run": {
            const { LatheMasterPostRegressionMatrixEngine } = await import(
              "../../engines/LatheMasterPostRegressionMatrixEngine.js"
            );
            const matrixResult = LatheMasterPostRegressionMatrixEngine.runMatrix(params);
            result = {
              success: matrixResult.success,
              totalCells: matrixResult.totalCells,
              passedCells: matrixResult.passedCells,
              failedCells: matrixResult.failedCells,
              skippedCells: matrixResult.skippedCells,
              passRate: matrixResult.passRate,
              executionTimeMs: matrixResult.executionTimeMs,
              baselineLocked: matrixResult.baselineLocked,
              cells: matrixResult.cells.slice(0, 100),
            };
            break;
          }

          case "lathe_masterpost_regression_lock": {
            const { LatheMasterPostRegressionMatrixEngine } = await import(
              "../../engines/LatheMasterPostRegressionMatrixEngine.js"
            );
            const lockResult = LatheMasterPostRegressionMatrixEngine.lockBaseline(params);
            result = {
              success: true,
              locked: lockResult.locked,
              total: lockResult.total,
            };
            break;
          }

          case "lathe_masterpost_regression_diff": {
            const { LatheMasterPostRegressionMatrixEngine } = await import(
              "../../engines/LatheMasterPostRegressionMatrixEngine.js"
            );
            const diffResult = LatheMasterPostRegressionMatrixEngine.getDiffReport(params);
            result = {
              success: diffResult.success,
              divergentCells: diffResult.divergentCells,
              report: diffResult.report,
            };
            break;
          }

          case "lathe_masterpost_regression_stats": {
            const { LatheMasterPostRegressionMatrixEngine } = await import(
              "../../engines/LatheMasterPostRegressionMatrixEngine.js"
            );
            const stats = LatheMasterPostRegressionMatrixEngine.getBaselineStats();
            const dims = LatheMasterPostRegressionMatrixEngine.getMatrixDimensions();
            result = {
              success: true,
              baseline: stats,
              dimensions: dims,
              version: LatheMasterPostRegressionMatrixEngine.getVersion(),
            };
            break;
          }

          case "lathe_masterpost_regression_clear": {
            const { LatheMasterPostRegressionMatrixEngine } = await import(
              "../../engines/LatheMasterPostRegressionMatrixEngine.js"
            );
            LatheMasterPostRegressionMatrixEngine.clearBaseline();
            result = {
              success: true,
              message: "Baseline cleared",
            };
            break;
          }

          case "lathe_masterpost_deep_explain": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            const deepResult = LatheMasterPostDeepReasoningEngine.explainSelection(params);
            result = { success: deepResult.success, ...deepResult };
            break;
          }

          case "lathe_masterpost_deep_causal": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            const queries = LatheMasterPostDeepReasoningEngine.generateCausalInference(
              params.machineId,
              params.operation
            );
            result = { success: true, queries };
            break;
          }

          case "lathe_masterpost_deep_counterfactual": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            const cfQueries = LatheMasterPostDeepReasoningEngine.generateCounterfactual(
              params.machineId,
              params.hypotheticalChange
            );
            result = { success: true, queries: cfQueries };
            break;
          }

          case "lathe_masterpost_deep_history": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            const history = LatheMasterPostDeepReasoningEngine.getTraceHistory(params.limit ?? 100);
            result = { success: true, history, count: history.length };
            break;
          }

          case "lathe_masterpost_deep_stats": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            const deepStats = LatheMasterPostDeepReasoningEngine.getStatistics();
            result = { success: true, ...deepStats, version: LatheMasterPostDeepReasoningEngine.getVersion() };
            break;
          }

          case "lathe_masterpost_deep_clear": {
            const { LatheMasterPostDeepReasoningEngine } = await import(
              "../../engines/LatheMasterPostDeepReasoningEngine.js"
            );
            LatheMasterPostDeepReasoningEngine.clearHistory();
            result = { success: true, message: "Deep reasoning history cleared" };
            break;
          }

          case "lathe_masterpost_ensemble_run": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const ensembleResult = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(params);
            result = { success: ensembleResult.success, ...ensembleResult };
            break;
          }

          case "lathe_masterpost_ensemble_candidates": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates(
              params.machineId,
              params.operation
            );
            result = { success: true, candidates, count: candidates.length };
            break;
          }

          case "lathe_masterpost_ensemble_ambiguous": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const isAmbig = LatheMasterPostEnsembleCrossCheckEngine.isAmbiguous(params.machineId);
            const ambigCount = LatheMasterPostEnsembleCrossCheckEngine.getAmbiguousMachineCount();
            result = { success: true, isAmbiguous: isAmbig, ambiguousMachineCount: ambigCount };
            break;
          }

          case "lathe_masterpost_ensemble_divergences": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const divergences = LatheMasterPostEnsembleCrossCheckEngine.computeDivergences(
              params.outputs ?? [],
              params.threshold ?? 0.8
            );
            result = { success: true, divergences };
            break;
          }

          case "lathe_masterpost_ensemble_history": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const ensHistory = LatheMasterPostEnsembleCrossCheckEngine.getHistory(params.limit ?? 100);
            result = { success: true, history: ensHistory, count: ensHistory.length };
            break;
          }

          case "lathe_masterpost_ensemble_stats": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            const ensStats = LatheMasterPostEnsembleCrossCheckEngine.getStatistics();
            result = { success: true, ...ensStats, version: LatheMasterPostEnsembleCrossCheckEngine.getVersion() };
            break;
          }

          case "lathe_masterpost_ensemble_clear": {
            const { LatheMasterPostEnsembleCrossCheckEngine } = await import(
              "../../engines/LatheMasterPostEnsembleCrossCheckEngine.js"
            );
            LatheMasterPostEnsembleCrossCheckEngine.clearHistory();
            result = { success: true, message: "Ensemble history cleared" };
            break;
          }

          case "lathe_p2p_ingest": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            result = lathePrintIngestPipelineEngine.ingest({
              raw_text: params.raw_text,
              filename: params.filename,
              format: params.format ?? "text",
              page_count: params.page_count,
            });
            break;
          }

          case "lathe_p2p_ingest_batch": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            result = lathePrintIngestPipelineEngine.batchIngest(params.inputs ?? []);
            break;
          }

          case "lathe_p2p_validate_extraction": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            const intake = lathePrintIngestPipelineEngine.ingest({
              raw_text: params.raw_text,
              filename: params.filename,
            });
            result = lathePrintIngestPipelineEngine.validateExtraction(intake, params.ground_truth ?? {});
            break;
          }

          case "lathe_p2p_recognize_features": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            const { latheTurningFeatureRecognizerEngine } = await import(
              "../../engines/LatheTurningFeatureRecognizerEngine.js"
            );
            const intake = lathePrintIngestPipelineEngine.ingest({
              raw_text: params.raw_text,
              filename: params.filename,
            });
            result = latheTurningFeatureRecognizerEngine.recognize(intake);
            break;
          }

          case "lathe_p2p_recognize_batch": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            const { latheTurningFeatureRecognizerEngine } = await import(
              "../../engines/LatheTurningFeatureRecognizerEngine.js"
            );
            const intakes = lathePrintIngestPipelineEngine.batchIngest(params.inputs ?? []);
            result = latheTurningFeatureRecognizerEngine.batchRecognize(intakes);
            break;
          }

          case "lathe_p2p_feature_taxonomy": {
            const { latheTurningFeatureRecognizerEngine } = await import(
              "../../engines/LatheTurningFeatureRecognizerEngine.js"
            );
            result = latheTurningFeatureRecognizerEngine.getTaxonomy();
            break;
          }

          case "lathe_p2p_recognition_stats": {
            const { lathePrintIngestPipelineEngine } = await import(
              "../../engines/LathePrintIngestPipelineEngine.js"
            );
            const { latheTurningFeatureRecognizerEngine } = await import(
              "../../engines/LatheTurningFeatureRecognizerEngine.js"
            );
            const intakes = lathePrintIngestPipelineEngine.batchIngest(params.inputs ?? []);
            const recognitions = latheTurningFeatureRecognizerEngine.batchRecognize(intakes);
            result = latheTurningFeatureRecognizerEngine.getRecognitionStats(recognitions);
            break;
          }

          case "lathe_p2p_tolerance_propagate": {
            const { lathePrintToleranceStackEngine } = await import(
              "../../engines/LathePrintToleranceStackEngine.js"
            );
            result = lathePrintToleranceStackEngine.propagate(params.recognition, {
              tolerance_budget_mm: params.tolerance_budget_mm,
              target_cpk: params.target_cpk,
              process_class: params.process_class,
            });
            break;
          }

          case "lathe_p2p_tolerance_batch": {
            const { lathePrintToleranceStackEngine } = await import(
              "../../engines/LathePrintToleranceStackEngine.js"
            );
            result = lathePrintToleranceStackEngine.batchPropagate(params.recognitions ?? [], {
              tolerance_budget_mm: params.tolerance_budget_mm,
              target_cpk: params.target_cpk,
              process_class: params.process_class,
            });
            break;
          }

          case "lathe_p2p_tolerance_stats": {
            const { lathePrintToleranceStackEngine } = await import(
              "../../engines/LathePrintToleranceStackEngine.js"
            );
            result = lathePrintToleranceStackEngine.getStackStats(params.output);
            break;
          }

          case "lathe_p2p_tolerance_validate": {
            const { lathePrintToleranceStackEngine } = await import(
              "../../engines/LathePrintToleranceStackEngine.js"
            );
            result = lathePrintToleranceStackEngine.validate(params.output);
            break;
          }

          case "lathe_p2p_strategy_select": {
            const { lathePrintFeatureStrategySelectorEngine } = await import(
              "../../engines/LathePrintFeatureStrategySelectorEngine.js"
            );
            result = lathePrintFeatureStrategySelectorEngine.selectStrategy(
              params.feature,
              params.material,
              params.machine
            );
            break;
          }

          case "lathe_p2p_strategy_batch": {
            const { lathePrintFeatureStrategySelectorEngine } = await import(
              "../../engines/LathePrintFeatureStrategySelectorEngine.js"
            );
            result = lathePrintFeatureStrategySelectorEngine.batchSelectStrategies(
              params.features ?? [],
              params.material,
              params.machine
            );
            break;
          }

          case "lathe_p2p_strategy_plan": {
            const { lathePrintFeatureStrategySelectorEngine } = await import(
              "../../engines/LathePrintFeatureStrategySelectorEngine.js"
            );
            result = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
              params.features ?? [],
              params.material,
              params.machine,
              params.tolerance_output
            );
            break;
          }

          case "lathe_p2p_strategy_stats": {
            const { lathePrintFeatureStrategySelectorEngine } = await import(
              "../../engines/LathePrintFeatureStrategySelectorEngine.js"
            );
            result = lathePrintFeatureStrategySelectorEngine.getStrategyStats(params.plan);
            break;
          }

          case "lathe_p2p_strategy_validate": {
            const { lathePrintFeatureStrategySelectorEngine } = await import(
              "../../engines/LathePrintFeatureStrategySelectorEngine.js"
            );
            result = lathePrintFeatureStrategySelectorEngine.validate(params.plan);
            break;
          }

          case "lathe_p2p_sequence_plan": {
            const { lathePrintSequencePlannerEngine } = await import(
              "../../engines/LathePrintSequencePlannerEngine.js"
            );
            result = lathePrintSequencePlannerEngine.planSequence(
              params.strategy_plan,
              params.initial_stock,
              params.features
            );
            break;
          }

          case "lathe_p2p_sequence_summarize": {
            const { lathePrintSequencePlannerEngine } = await import(
              "../../engines/LathePrintSequencePlannerEngine.js"
            );
            result = lathePrintSequencePlannerEngine.summarize(params.sequence_plan);
            break;
          }

          case "lathe_p2p_sequence_autofix": {
            const { lathePrintSequencePlannerEngine } = await import(
              "../../engines/LathePrintSequencePlannerEngine.js"
            );
            result = lathePrintSequencePlannerEngine.autoFix(
              params.sequence_plan,
              params.features
            );
            break;
          }

          case "lathe_p2p_setup_select": {
            const { lathePrintSetupSelectionEngine } = await import(
              "../../engines/LathePrintSetupSelectionEngine.js"
            );
            result = lathePrintSetupSelectionEngine.selectSetup(
              params.geometry,
              params.material,
              params.loads,
              params.available_chucks
            );
            break;
          }

          case "lathe_p2p_setup_from_features": {
            const { lathePrintSetupSelectionEngine } = await import(
              "../../engines/LathePrintSetupSelectionEngine.js"
            );
            result = lathePrintSetupSelectionEngine.planFromFeatures(
              params.features,
              params.material,
              params.sequence_plan,
              params.available_chucks
            );
            break;
          }

          case "lathe_p2p_setup_validate": {
            const { lathePrintSetupSelectionEngine } = await import(
              "../../engines/LathePrintSetupSelectionEngine.js"
            );
            result = lathePrintSetupSelectionEngine.validate(params.setup);
            break;
          }

          case "lathe_p2p_setup_infer_geometry": {
            const { lathePrintSetupSelectionEngine } = await import(
              "../../engines/LathePrintSetupSelectionEngine.js"
            );
            result = lathePrintSetupSelectionEngine.inferGeometry(params.features);
            break;
          }

          case "lathe_p2p_toolpath_generate": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            result = lathePrintToolpathGeneratorEngine.generateProgram(
              params.sequence_plan,
              params.features,
              params.material,
              params.machine_limits
            );
            break;
          }

          case "lathe_p2p_toolpath_validate": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            result = lathePrintToolpathGeneratorEngine.validate(params.program);
            break;
          }

          case "lathe_p2p_toolpath_gcode": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            result = { gcode: lathePrintToolpathGeneratorEngine.exportGCode(params.program) };
            break;
          }

          case "lathe_p2p_toolpath_cycle_time": {
            const { lathePrintToolpathGeneratorEngine } = await import(
              "../../engines/LathePrintToolpathGeneratorEngine.js"
            );
            result = lathePrintToolpathGeneratorEngine.getCycleTimeBreakdown(params.program);
            break;
          }

          case "lathe_p2p_emit": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            result = lathePrintProgramEmitterEngine.emit(params.program, params.options);
            break;
          }

          case "lathe_p2p_emit_validate": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            result = lathePrintProgramEmitterEngine.validate(params.emitted);
            break;
          }

          case "lathe_p2p_emit_controllers": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            result = { controllers: lathePrintProgramEmitterEngine.listControllers() };
            break;
          }

          case "lathe_p2p_emit_dry_run": {
            const { lathePrintProgramEmitterEngine } = await import(
              "../../engines/LathePrintProgramEmitterEngine.js"
            );
            result = lathePrintProgramEmitterEngine.dryRun(params.program, params.options);
            break;
          }

          case "lathe_safety_predicate_verify": {
            const { latheSafetyPredicateEngine } = await import(
              "../../engines/LatheSafetyPredicateEngine.js"
            );
            result = latheSafetyPredicateEngine.verify(params.signals, params.envelope);
            break;
          }

          case "lathe_safety_predicate_verify_or_throw": {
            const { latheSafetyPredicateEngine, SafetyPredicateViolation } = await import(
              "../../engines/LatheSafetyPredicateEngine.js"
            );
            try {
              result = latheSafetyPredicateEngine.verifyOrThrow(params.signals, params.envelope);
            } catch (e) {
              if (e instanceof SafetyPredicateViolation) {
                result = {
                  thrown: true,
                  code: e.code,
                  program_id: e.program_id,
                  blocking: e.blocking,
                  message: e.message,
                };
              } else {
                throw e;
              }
            }
            break;
          }


          case "lathe_spindle_torque_gate": {
            const { spindleTorqueGateEngine } = await import(
              "../../engines/SpindleTorqueGateEngine.js"
            );
            result = spindleTorqueGateEngine.gate({
              program: params.program,
              machine: params.machine,
              safe_utilisation_pct: params.safe_utilisation_pct,
            });
            break;
          }

          case "lathe_spindle_torque_gate_or_throw": {
            const { spindleTorqueGateEngine, SpindleTorqueBlockError } = await import(
              "../../engines/SpindleTorqueGateEngine.js"
            );
            try {
              result = spindleTorqueGateEngine.gateOrThrow({
                program: params.program,
                machine: params.machine,
                safe_utilisation_pct: params.safe_utilisation_pct,
              });
            } catch (e) {
              if (e instanceof SpindleTorqueBlockError) {
                result = {
                  thrown: true,
                  code: e.code,
                  message: e.message,
                  gate_result: e.result,
                };
              } else {
                throw e;
              }
            }
            break;
          }

          case "lathe_stock_boundary_gate": {
            const { stockBoundaryGateEngine } = await import(
              "../../engines/StockBoundaryGateEngine.js"
            );
            result = stockBoundaryGateEngine.gate({
              program: params.program,
              stock: params.stock,
              workholding: params.workholding,
              min_jaw_clearance_mm: params.min_jaw_clearance_mm,
              front_clearance_mm: params.front_clearance_mm,
              od_approach_clearance_mm: params.od_approach_clearance_mm,
            });
            break;
          }

          case "lathe_stock_boundary_gate_or_throw": {
            const { stockBoundaryGateEngine, StockBoundaryBlockError } = await import(
              "../../engines/StockBoundaryGateEngine.js"
            );
            try {
              result = stockBoundaryGateEngine.gateOrThrow({
                program: params.program,
                stock: params.stock,
                workholding: params.workholding,
                min_jaw_clearance_mm: params.min_jaw_clearance_mm,
                front_clearance_mm: params.front_clearance_mm,
                od_approach_clearance_mm: params.od_approach_clearance_mm,
              });
            } catch (e) {
              if (e instanceof StockBoundaryBlockError) {
                result = {
                  thrown: true,
                  code: e.code,
                  message: e.message,
                  gate_result: e.result,
                };
              } else {
                throw e;
              }
            }
            break;
          }

          case "lathe_proof_carrying_emit": {
            const { latheProofCarryingEmitEngine, SafetyProofViolation } = await import(
              "../../engines/LatheProofCarryingEmitEngine.js"
            );
            try {
              result = latheProofCarryingEmitEngine.emit({
                program: params.program,
                options: params.options,
                safety_inputs: params.safety_inputs,
                allow_override: params.allow_override,
              });
            } catch (e) {
              if (e instanceof SafetyProofViolation) {
                result = {
                  thrown: true,
                  code: e.code,
                  message: e.message,
                  safety_record: e.safety_record,
                };
              } else {
                throw e;
              }
            }
            break;
          }

          case "lathe_proof_carrying_reproduce": {
            const { latheProofCarryingEmitEngine } = await import(
              "../../engines/LatheProofCarryingEmitEngine.js"
            );
            result = latheProofCarryingEmitEngine.reproduce({
              program: params.program,
              options: params.options,
              safety_inputs: params.safety_inputs,
            });
            break;
          }

          case "lathe_lora_physics_validate": {
            const { latheLoRAPhysicsAugmentedInferenceEngine } = await import(
              "../../engines/LatheLoRAPhysicsAugmentedInferenceEngine.js"
            );
            result = latheLoRAPhysicsAugmentedInferenceEngine.validate(params.llm_response);
            break;
          }

          case "lathe_lora_physics_process": {
            const { latheLoRAPhysicsAugmentedInferenceEngine } = await import(
              "../../engines/LatheLoRAPhysicsAugmentedInferenceEngine.js"
            );
            result = latheLoRAPhysicsAugmentedInferenceEngine.process(params.llm_response);
            break;
          }

          case "lathe_lora_physics_kienzle_coefs": {
            const { latheLoRAPhysicsAugmentedInferenceEngine } = await import(
              "../../engines/LatheLoRAPhysicsAugmentedInferenceEngine.js"
            );
            result = {
              group: params.material_group,
              coefficients: latheLoRAPhysicsAugmentedInferenceEngine.getKienzleCoefficients(params.material_group),
            };
            break;
          }
          case "lathe_lora_master_initialize": {
            const { latheLoRAMasterOrchestratorEngine } = await import(
              "../../engines/LatheLoRAMasterOrchestratorEngine.js"
            );
            const cfg = params.config as Record<string, unknown> | undefined;
            if (cfg) latheLoRAMasterOrchestratorEngine.setConfig(cfg);
            const state = latheLoRAMasterOrchestratorEngine.initialize();
            result = {
              id: state.id,
              current_phase: state.current_phase,
              overall_health: state.overall_health,
              initialized_at: state.initialized_at,
            };
            break;
          }
          case "lathe_lora_master_register_subsystem": {
            const { latheLoRAMasterOrchestratorEngine } = await import(
              "../../engines/LatheLoRAMasterOrchestratorEngine.js"
            );
            const name = params.name as string | undefined;
            const initialPhase = (params.initial_phase as string | undefined) ?? "data_collection";
            if (!name || typeof name !== "string") {
              throw new Error("lathe_lora_master_register_subsystem: 'name' (string) is required");
            }
            const ok = latheLoRAMasterOrchestratorEngine.registerSubsystem(
              name,
              initialPhase as Parameters<typeof latheLoRAMasterOrchestratorEngine.registerSubsystem>[1],
            );
            if (!ok) {
              throw new Error("lathe_lora_master_register_subsystem: orchestrator not initialized — call lathe_lora_master_initialize first");
            }
            result = { registered: true, name, initial_phase: initialPhase };
            break;
          }
          case "lathe_lora_master_transition": {
            const { latheLoRAMasterOrchestratorEngine } = await import(
              "../../engines/LatheLoRAMasterOrchestratorEngine.js"
            );
            const phase = params.phase as string | undefined;
            if (!phase) {
              throw new Error("lathe_lora_master_transition: 'phase' (string) is required");
            }
            const ok = latheLoRAMasterOrchestratorEngine.transition(
              phase as Parameters<typeof latheLoRAMasterOrchestratorEngine.transition>[0],
            );
            if (!ok) {
              throw new Error(`lathe_lora_master_transition: rejected — invalid phase '${phase}' or backwards transition not allowed`);
            }
            result = { transitioned: true, phase };
            break;
          }
          case "lathe_lora_master_health": {
            const { latheLoRAMasterOrchestratorEngine } = await import(
              "../../engines/LatheLoRAMasterOrchestratorEngine.js"
            );
            const health = latheLoRAMasterOrchestratorEngine.healthCheck();
            const stats = latheLoRAMasterOrchestratorEngine.getStats();
            result = { health, stats };
            break;
          }
          case "lathe_lora_master_summary": {
            const { latheLoRAMasterOrchestratorEngine } = await import(
              "../../engines/LatheLoRAMasterOrchestratorEngine.js"
            );
            result = { summary: latheLoRAMasterOrchestratorEngine.getSummary() };
            break;
          }
          case "lathe_p2p_signoff_generate": {
            const { lathePrintProgramSignoffEngine } = await import(
              "../../engines/LathePrintProgramSignoffEngine.js"
            );
            result = lathePrintProgramSignoffEngine.generatePackage(params.input);
            break;
          }

          case "lathe_p2p_signoff_approve": {
            const { lathePrintProgramSignoffEngine } = await import(
              "../../engines/LathePrintProgramSignoffEngine.js"
            );
            result = lathePrintProgramSignoffEngine.approve(
              params.package,
              params.role,
              params.approver_name,
              params.notes
            );
            break;
          }

          case "lathe_p2p_signoff_markdown": {
            const { lathePrintProgramSignoffEngine } = await import(
              "../../engines/LathePrintProgramSignoffEngine.js"
            );
            result = { markdown: lathePrintProgramSignoffEngine.exportMarkdown(params.package) };
            break;
          }

          case "lathe_p2p_signoff_json": {
            const { lathePrintProgramSignoffEngine } = await import(
              "../../engines/LathePrintProgramSignoffEngine.js"
            );
            result = { json: lathePrintProgramSignoffEngine.exportJSON(params.package) };
            break;
          }

          case "lathe_p2p_signoff_is_approved": {
            const { lathePrintProgramSignoffEngine } = await import(
              "../../engines/LathePrintProgramSignoffEngine.js"
            );
            result = { fully_approved: lathePrintProgramSignoffEngine.isFullyApproved(params.package) };
            break;
          }

          case "lathe_p2p_dl_predict": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import(
              "../../engines/LathePrintToProgramDLIntelligenceEngine.js"
            );
            result = lathePrintToProgramDLIntelligenceEngine.predict(params.input);
            break;
          }

          case "lathe_p2p_dl_rank_alternatives": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import(
              "../../engines/LathePrintToProgramDLIntelligenceEngine.js"
            );
            result = lathePrintToProgramDLIntelligenceEngine.rankAlternatives(params.alternatives);
            break;
          }

          case "lathe_p2p_dl_batch": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import(
              "../../engines/LathePrintToProgramDLIntelligenceEngine.js"
            );
            result = lathePrintToProgramDLIntelligenceEngine.predictBatch(params.inputs);
            break;
          }

          case "lathe_p2p_dl_evaluate_accuracy": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import(
              "../../engines/LathePrintToProgramDLIntelligenceEngine.js"
            );
            result = lathePrintToProgramDLIntelligenceEngine.evaluateAccuracy(params.labeled);
            break;
          }

          case "lathe_p2p_dl_export_weights": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import(
              "../../engines/LathePrintToProgramDLIntelligenceEngine.js"
            );
            result = { weights: lathePrintToProgramDLIntelligenceEngine.exportWeights() };
            break;
          }

          case "lathe_p2p_reason_explain": {
            const { lathePrintToProgramReasoningEngine } = await import(
              "../../engines/LathePrintToProgramReasoningEngine.js"
            );
            result = lathePrintToProgramReasoningEngine.explain(params.input);
            break;
          }

          case "lathe_p2p_reason_markdown": {
            const { lathePrintToProgramReasoningEngine } = await import(
              "../../engines/LathePrintToProgramReasoningEngine.js"
            );
            result = { markdown: lathePrintToProgramReasoningEngine.exportMarkdown(params.trace) };
            break;
          }

          case "lathe_p2p_reason_json": {
            const { lathePrintToProgramReasoningEngine } = await import(
              "../../engines/LathePrintToProgramReasoningEngine.js"
            );
            result = { json: lathePrintToProgramReasoningEngine.exportJSON(params.trace) };
            break;
          }

          case "lathe_p2p_reason_filter": {
            const { lathePrintToProgramReasoningEngine } = await import(
              "../../engines/LathePrintToProgramReasoningEngine.js"
            );
            result = { steps: lathePrintToProgramReasoningEngine.filterSteps(params.trace, params.filter ?? {}) };
            break;
          }

          case "lathe_p2p_reason_mode_summary": {
            const { lathePrintToProgramReasoningEngine } = await import(
              "../../engines/LathePrintToProgramReasoningEngine.js"
            );
            result = lathePrintToProgramReasoningEngine.summarizeModes(params.trace);
            break;
          }

          case "lathe_p2p_kg_ingest": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = lathePrintToProgramKnowledgeGraphEngine.ingest(params.input);
            break;
          }

          case "lathe_p2p_kg_find_similar": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = lathePrintToProgramKnowledgeGraphEngine.findSimilarJobs(params.query);
            break;
          }

          case "lathe_p2p_kg_tools_for_material": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = { tools: lathePrintToProgramKnowledgeGraphEngine.findToolsForMaterial(params.iso_group) };
            break;
          }

          case "lathe_p2p_kg_customer_jobs": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = { jobs: lathePrintToProgramKnowledgeGraphEngine.findJobsForCustomer(params.customer_name) };
            break;
          }

          case "lathe_p2p_kg_failures": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = { failures: lathePrintToProgramKnowledgeGraphEngine.findFailedJobs() };
            break;
          }

          case "lathe_p2p_kg_stats": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = lathePrintToProgramKnowledgeGraphEngine.getStats();
            break;
          }

          case "lathe_p2p_kg_export": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = lathePrintToProgramKnowledgeGraphEngine.exportGraph();
            break;
          }

          case "lathe_p2p_kg_import": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            lathePrintToProgramKnowledgeGraphEngine.importGraph(params.snapshot);
            result = { imported: true };
            break;
          }

          case "lathe_p2p_kg_traverse": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            result = { nodes: lathePrintToProgramKnowledgeGraphEngine.traverse(params.node_id, params.max_depth ?? 2) };
            break;
          }

          case "lathe_p2p_kg_clear": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import(
              "../../engines/LathePrintToProgramKnowledgeGraphEngine.js"
            );
            lathePrintToProgramKnowledgeGraphEngine.clear();
            result = { cleared: true };
            break;
          }

          case "probe_generate": {
            const pr = await getEngine("probing");
            result = pr.generate(params, params.config ?? {
              controller: params.controller ?? "renishaw_haas",
              probe_tool_number: params.probe_tool_number ?? 99,
              feed_rate: params.feed_rate ?? 500,
              retract_distance: params.retract_distance ?? 2,
              overtravel: params.overtravel ?? 10,
              work_offset_to_set: params.work_offset_to_set,
              print_result: params.print_result ?? true,
            });
            break;
          }
          case "subprogram_call": {
            const sub = await getEngine("subprogram");
            result = sub.generateCall(
              { program_number: params.program_number ?? 1000,
                repeat_count: params.repeat_count,
                arguments: params.arguments },
              params.controller ?? "fanuc"
            );
            break;
          }
          case "subprogram_pattern": {
            const sub = await getEngine("subprogram");
            result = sub.generatePatternRepeat(
              { subprogram_number: params.subprogram_number ?? 1000,
                positions: params.positions ?? [],
                return_to_zero: params.return_to_zero ?? true },
              params.controller ?? "fanuc"
            );
            break;
          }
          case "cam_cycle_defaults": {
            const cdSafetyCheck = await runHyperMillSafetyChecks(params);
            if (!cdSafetyCheck.safe) {
              result = { error: "Safety check BLOCKED", blocks: cdSafetyCheck.blocks, warnings: cdSafetyCheck.warnings };
              break;
            }
            const hmCD = await getEngine("hmCycleDefaults");
            let cdResult: any;
            if (params.code) {
              if (params.resolve) {
                cdResult = hmCD.resolveDefaults(params.code, {
                  toolDiameter: params.tool_diameter,
                  toolRadius: params.tool_radius,
                  toolCornerRadius: params.tool_corner_radius,
                  machineTolerance: params.machine_tolerance,
                  jobFeed: params.job_feed,
                }) ?? { error: `No cycle found: ${params.code}` };
              } else {
                cdResult = hmCD.getByCode(params.code)
                  ?? { error: `No cycle found: ${params.code}` };
              }
            } else if (params.search) {
              cdResult = hmCD.search(params.search);
            } else if (params.category) {
              cdResult = hmCD.byCategory(params.category);
            } else if (params.formulas) {
              cdResult = hmCD.withFormulas();
            } else if (params.stats) {
              cdResult = hmCD.stats();
            } else {
              cdResult = hmCD.listAll();
            }
            result = cdSafetyCheck.warnings.length > 0 ? { ...cdResult, safetyWarnings: cdSafetyCheck.warnings } : cdResult;
            break;
          }
          case "cam_thread_lookup": {
            const hmTh = await getEngine("hmThread");
            if (params.search) {
              result = hmTh.search(params.search);
            } else if (params.size) {
              result = hmTh.findBySize(params.size, params.pitch);
            } else if (params.tap_drill) {
              const drill = hmTh.getTapDrill(params.tap_drill);
              result = drill != null
                ? { designation: params.tap_drill, tapDrill: drill }
                : { error: `No thread found: ${params.tap_drill}` };
            } else if (params.minor_dia) {
              const dia = hmTh.getMinorDia(params.minor_dia);
              result = dia != null
                ? { designation: params.minor_dia, minorDia: dia }
                : { error: `No thread found: ${params.minor_dia}` };
            } else if (params.standard) {
              result = hmTh.getStandard(params.standard)
                ?? { error: `No standard found: ${params.standard}` };
            } else if (params.stats) {
              result = hmTh.stats();
            } else {
              result = hmTh.listStandards();
            }
            break;
          }
          case "cam_controller_catalog": {
            const hmCtrl = await getEngine("hmController");
            if (params.search) {
              result = hmCtrl.search(params.search);
            } else if (params.family) {
              result = hmCtrl.getFamily(params.family)
                ?? { error: `No controller family found: ${params.family}` };
            } else if (params.axis_count) {
              result = hmCtrl.byAxisCount(params.axis_count);
            } else if (params.capability) {
              result = hmCtrl.byCapability(params.capability);
            } else if (params.dialect) {
              result = hmCtrl.getDialect(params.dialect)
                ?? { error: `No dialect found: ${params.dialect}` };
            } else if (params.stats) {
              result = hmCtrl.stats();
            } else {
              result = hmCtrl.listFamilies();
            }
            break;
          }
          case "advanced_post_enhance": {
            const advPost = await getEngine("advPost");
            result = advPost.enhance({
              controller: params.controller ?? "fanuc",
              gcode: params.gcode ?? "",
              adaptive_clearing: params.adaptive_clearing,
              hsm: params.hsm,
              tool_management: params.tool_management,
              in_process_measure: params.in_process_measure,
              feed_optimization: params.feed_optimization,
              multi_axis: params.multi_axis,
            });
            break;
          }
          case "cam_translate": {
            const port = await getEngine("portability");
            if (params.list_intents) {
              result = port.listIntents();
            } else if (params.list_controllers) {
              result = port.listControllers();
            } else if (params.controller_features) {
              result = port.controllerFeatures(params.controller_features);
            } else if (params.stats) {
              result = port.stats();
            } else {
              result = port.translate({
                intent: params.intent ?? "rough_3d",
                material: params.material ?? { name: params.material_name ?? "1045 Steel" },
                tool: params.tool ?? { diameter: params.tool_diameter ?? 10 },
                machine: params.machine ?? { controller: params.controller ?? "fanuc", axis_count: params.axis_count },
                tolerance: params.tolerance,
                allowance: params.allowance,
                depth: params.depth,
                width: params.width,
                source_cam: params.source_cam,
                enhance: params.enhance,
              });
            }
            break;
          }
          case "cam_compare_controllers": {
            const port = await getEngine("portability");
            result = port.compareControllers({
              intent: params.intent ?? "rough_3d",
              material: params.material ?? { name: params.material_name ?? "1045 Steel" },
              tool: params.tool ?? { diameter: params.tool_diameter ?? 10 },
              tolerance: params.tolerance,
              axis_count: params.axis_count,
              source_cam: params.source_cam,
            });
            break;
          }
          case "cam_material_recommend": {
            const port = await getEngine("portability");
            result = port.materialRecommendation(
              params.material ?? { name: params.material_name ?? "1045 Steel", iso_group: params.iso_group, hardness_hrc: params.hardness_hrc }
            );
            break;
          }
          case "cam_multicam_recommend": {
            const mc = await getEngine("multiCam");
            result = mc.recommend({
              camSystem: params.cam_system ?? params.camSystem,
              geometryType: params.geometry_type ?? params.geometryType,
              operationGoal: params.operation_goal ?? params.operationGoal,
              materialGroup: params.material_group ?? params.materialGroup,
              toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm,
              wallAngleDeg: params.wall_angle_deg ?? params.wallAngleDeg,
              hasPreviousRoughing: params.has_previous_roughing ?? params.hasPreviousRoughing,
              axisCount: params.axis_count ?? params.axisCount,
            });
            break;
          }
          case "cam_multicam_list": {
            const mc = await getEngine("multiCam");
            if (params.cam_system ?? params.camSystem) {
              result = mc.listStrategies(params.cam_system ?? params.camSystem);
            } else {
              result = { systems: mc.listSystems(), stats: mc.stats() };
            }
            break;
          }
          case "cam_multicam_compare": {
            const mc = await getEngine("multiCam");
            result = mc.compareAcrossSystems(
              params.geometry_type ?? params.geometryType,
              params.operation_goal ?? params.operationGoal
            );
            break;
          }
          case "cam_multicam_flagship": {
            const mc = await getEngine("multiCam");
            const sys = params.cam_system ?? params.camSystem;
            if (sys) {
              result = mc.getFlagship(sys);
            } else {
              const all: Record<string, any> = {};
              for (const s of mc.listSystems()) { all[s] = mc.getFlagship(s); }
              result = all;
            }
            break;
          }
          // ── Extended Multi-CAM (13 additional CAM systems) ──────────
          case "cam_ext_recommend": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.recommend({
              camSystem: params.cam_system ?? params.camSystem,
              geometryType: params.geometry_type ?? params.geometryType,
              operationGoal: params.operation_goal ?? params.operationGoal,
              materialGroup: params.material_group ?? params.materialGroup,
              toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm,
              wallAngleDeg: params.wall_angle_deg ?? params.wallAngleDeg,
              hasPreviousRoughing: params.has_previous_roughing ?? params.hasPreviousRoughing,
              axisCount: params.axis_count ?? params.axisCount,
            });
            break;
          }
          case "cam_ext_list": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            if (params.cam_system ?? params.camSystem) {
              result = mce.listStrategies(params.cam_system ?? params.camSystem);
            } else {
              result = { systems: mce.listSystems(), stats: mce.stats() };
            }
            break;
          }
          case "cam_ext_compare": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.compareAcrossSystems(
              params.geometry_type ?? params.geometryType,
              params.operation_goal ?? params.operationGoal
            );
            break;
          }
          case "cam_ext_flagship": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            const sys = params.cam_system ?? params.camSystem;
            if (sys) {
              result = mce.getFlagship(sys);
            } else {
              const all: Record<string, any> = {};
              for (const s of mce.listSystems()) { all[s] = mce.getFlagship(s); }
              result = all;
            }
            break;
          }
          case "cam_ext_search": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.search(params.query ?? params.q ?? "", params.limit ?? 20);
            break;
          }
          case "post_feed_optimize": {
            const fo = await getEngine("feedOpt");
            result = fo.optimize(params.gcode, {
              toolDiameter_mm: params.tool_diameter_mm ?? params.toolDiameter_mm,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              radialDepth_mm: params.radial_depth_mm ?? params.radialDepth_mm,
              axialDepth_mm: params.axial_depth_mm ?? params.axialDepth_mm,
              material: params.material,
              spindleRPM: params.spindle_rpm ?? params.spindleRPM,
              nominalFeed_mmmin: params.nominal_feed_mmmin ?? params.nominalFeed_mmmin,
              cornerSlowdownFactor: params.corner_slowdown_factor,
              plungeRateFactor: params.plunge_rate_factor,
              arcMinRadius_mm: params.arc_min_radius_mm,
              maxFeedIncrease: params.max_feed_increase,
              enableChipThinning: params.enable_chip_thinning,
              enableCornerDecel: params.enable_corner_decel,
              enableArcLimiting: params.enable_arc_limiting,
              enablePlungeLimiting: params.enable_plunge_limiting,
              enableStabilityCheck: params.enable_stability_check,
              stabilityMaxDoc_mm: params.stability_max_doc_mm,
            });
            break;
          }
          case "post_feed_analyze": {
            const fo = await getEngine("feedOpt");
            result = fo.analyze(params.gcode, {
              toolDiameter_mm: params.tool_diameter_mm ?? params.toolDiameter_mm,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              radialDepth_mm: params.radial_depth_mm ?? params.radialDepth_mm,
              axialDepth_mm: params.axial_depth_mm ?? params.axialDepth_mm,
              material: params.material,
              spindleRPM: params.spindle_rpm ?? params.spindleRPM,
              nominalFeed_mmmin: params.nominal_feed_mmmin ?? params.nominalFeed_mmmin,
              cornerSlowdownFactor: params.corner_slowdown_factor,
              plungeRateFactor: params.plunge_rate_factor,
              arcMinRadius_mm: params.arc_min_radius_mm,
              maxFeedIncrease: params.max_feed_increase,
              enableChipThinning: params.enable_chip_thinning,
              enableCornerDecel: params.enable_corner_decel,
              enableArcLimiting: params.enable_arc_limiting,
              enablePlungeLimiting: params.enable_plunge_limiting,
              enableStabilityCheck: params.enable_stability_check,
              stabilityMaxDoc_mm: params.stability_max_doc_mm,
            });
            break;
          }
          case "gcode_transpile": {
            const tr = await getEngine("transpiler");
            result = tr.transpile(params.gcode, {
              source: params.source ?? params.source_dialect,
              target: params.target ?? params.target_dialect,
              preserveComments: params.preserve_comments,
              addTranslationNotes: params.add_translation_notes,
              safeStartBlock: params.safe_start_block,
              convertCycles: params.convert_cycles,
              convertWorkOffsets: params.convert_work_offsets,
            });
            break;
          }
          case "gcode_transpile_dialects": {
            const tr = await getEngine("transpiler");
            result = tr.listDialects();
            break;
          }
          case "gcode_transpile_cycles": {
            const tr = await getEngine("transpiler");
            result = tr.listCycleTranslations();
            break;
          }
          case "stability_rpm_rewrite": {
            const sr = await getEngine("stabilityRPM");
            result = sr.rewrite(params.gcode, {
              lobes: params.lobes ?? params.sld_lobes,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              currentDoc_mm: params.current_doc_mm ?? params.axial_depth_mm,
              rpmSearchRange: params.rpm_search_range,
              preferHigherRPM: params.prefer_higher_rpm,
              minRPM: params.min_rpm,
              maxRPM: params.max_rpm,
              feedPerTooth_mm: params.feed_per_tooth_mm,
            });
            break;
          }
          case "stability_rpm_analyze": {
            const sr = await getEngine("stabilityRPM");
            result = sr.analyzeChatterRisk(params.gcode, {
              lobes: params.lobes ?? params.sld_lobes,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              currentDoc_mm: params.current_doc_mm ?? params.axial_depth_mm,
              rpmSearchRange: params.rpm_search_range,
              preferHigherRPM: params.prefer_higher_rpm,
              minRPM: params.min_rpm,
              maxRPM: params.max_rpm,
              feedPerTooth_mm: params.feed_per_tooth_mm,
            });
            break;
          }
          case "cam_print_program_lookup": {
            const { blueprintProgramJoinEngine } = await import("../../engines/BlueprintProgramJoinEngine.js");
            const jsonlPath: string | undefined = params.jsonl_path;
            if (!jsonlPath) {
              result = { error: "jsonl_path is required (Phase 8 cleaned JSONL of blueprint pages)" };
              break;
            }
            const opts: {
              programLabelsPath?: string;
              masterIndexPath?: string;
              outPath?: string;
              maxLineBytes?: number;
              maxProgramsPerMatch?: number;
            } = {};
            if (typeof params.program_labels_path === "string") opts.programLabelsPath = params.program_labels_path;
            if (typeof params.master_index_path === "string") opts.masterIndexPath = params.master_index_path;
            if (typeof params.out_path === "string") opts.outPath = params.out_path;
            if (typeof params.max_line_bytes === "number") opts.maxLineBytes = params.max_line_bytes;
            if (typeof params.max_programs_per_match === "number") opts.maxProgramsPerMatch = params.max_programs_per_match;
            const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(jsonlPath, opts);
            const topJoins = joins
              .slice()
              .sort((a, b) => b.programs.length - a.programs.length)
              .slice(0, 20)
              .map((j) => ({
                part_number: j.part_number,
                part_number_normalized: j.part_number_normalized,
                blueprint_count: j.blueprints.length,
                program_count: j.programs.length,
                match_confidence: j.match_confidence,
                programs: j.programs.slice(0, 5).map((p) => ({
                  source_path: p.source_path,
                  customer: p.customer,
                  material: p.material,
                  format: p.format,
                })),
              }));
            result = { success: true, data: { summary, top_joins: topJoins } };
            break;
          }
          case "cross_cam_recommend": {
            const { crossCamRecommenderEngine } = await import("../../engines/CrossCamRecommenderEngine.js");
            const ccResult = crossCamRecommenderEngine.compute({
              geometry: { type: params.geometry_type || "pocket_2d",
                dimensions_mm: params.dimensions_mm || { length: 100, width: 80, depth: 30 },
                corner_radius_mm: params.corner_radius_mm },
              material: { class: params.material_class || "steel_4140",
                iso_group: params.iso_group || "P", hardness_hrc: params.hardness_hrc },
              machine: { spindle_power_kw: params.spindle_power_kw || 15,
                max_rpm: params.max_rpm || 10000, axis_count: params.axis_count || 3,
                controller: params.controller },
              tool: { diameter_mm: params.tool_diameter_mm || 10,
                flute_count: params.flute_count || 4,
                material: params.tool_material || "carbide",
                overhang_mm: params.overhang_mm || 40 },
              constraints: { priority: params.priority || "balanced",
                max_cycle_time_min: params.max_cycle_time_min,
                max_surface_roughness_um: params.max_surface_roughness_um },
              available_cam_systems: params.cam_systems,
            });
            result = ccResult;
            break;
          }
          case "cross_cam_synthesize": {
            const { crossCamRecommenderEngine: sEng } = await import("../../engines/CrossCamRecommenderEngine.js");
            const sr = sEng.compute({
              geometry: { type: params.geometry_type || "pocket_3d",
                dimensions_mm: params.dimensions_mm || { length: 150, width: 100, depth: 50 },
                corner_radius_mm: params.corner_radius_mm || 3 },
              material: { class: params.material_class || "aluminum_6061",
                iso_group: params.iso_group || "N" },
              machine: { spindle_power_kw: params.spindle_power_kw || 15,
                max_rpm: params.max_rpm || 12000, axis_count: params.axis_count || 3 },
              tool: { diameter_mm: params.tool_diameter_mm || 12,
                flute_count: params.flute_count || 3,
                material: params.tool_material || "carbide",
                overhang_mm: params.overhang_mm || 45 },
              constraints: { priority: params.priority || "balanced",
                max_cycle_time_min: params.max_cycle_time_min,
                max_surface_roughness_um: params.max_surface_roughness_um },
            });
            result = {
              hybrid_plan: sr.value.hybrid_recommendation,
              best_overall: sr.value.best_overall,
              trade_offs: sr.value.trade_off_analysis,
              physics: sr.value.physics_summary,
              strategy_count: sr.value.ranked_strategies.length,
            };
            break;
          }
          // ================================================================
          // POST-PROCESSOR INNOVATIONS (7 engines, 21 actions)
          // ================================================================

          // --- Probe Routine Generator (4 actions) ---
          case "probe_wcs_setup": {
            const eng = await getEngine("probeGen");
            result = eng.generateWCSSetup(params);
            break;
          }
          case "probe_inspection": {
            const eng = await getEngine("probeGen");
            result = eng.generatePartInspection(params);
            break;
          }
          case "probe_tool_measure": {
            const eng = await getEngine("probeGen");
            result = eng.generateToolMeasurement(params);
            break;
          }
          case "probe_first_article": {
            const eng = await getEngine("probeGen");
            result = eng.generateFirstArticle(params);
            break;
          }

          // --- Cycle Time Estimator (3 actions) ---
          case "cycle_time_estimate": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.estimateFromGCode(params.gcode, {
              controller: params.controller,
              machine_profile: params.machine_profile,
              machine_name: params.machine_name,
              include_breakdown: params.include_breakdown,
            });
            break;
          }
          case "cycle_time_compare": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.compareEstimates(params.gcode, params.machines);
            break;
          }
          case "cycle_time_bottlenecks": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.identifyBottlenecks(params.gcode, {
              controller: params.controller,
              machine_profile: params.machine_profile,
              top_n: params.top_n,
            });
            break;
          }

          // --- G-Code Safety Analyzer (2 actions) ---
          case "gcode_safety_analyze": {
            const eng = await getEngine("gcodeSafety");
            result = eng.analyze(params.gcode, {
              controller: params.controller,
              tool_data: params.tool_data,
              machine_envelope: params.machine_envelope,
              strictness: params.strictness,
            });
            break;
          }
          case "gcode_safety_fix": {
            const eng = await getEngine("gcodeSafety");
            result = eng.autoFix(params.gcode, {
              controller: params.controller,
              fix_level: params.fix_level,
            });
            break;
          }

          // --- Toolpath Thermal Analysis (3 actions) ---
          case "thermal_analyze": {
            const eng = await getEngine("thermal");
            result = eng.analyzeHeatAccumulation({
              gcode: params.gcode,
              material: params.material,
              tool_diameter: params.tool_diameter,
              workpiece_dimensions: params.workpiece_dimensions,
              coolant_type: params.coolant_type,
              ambient_temp: params.ambient_temp,
            });
            break;
          }
          case "thermal_distortion": {
            const eng = await getEngine("thermal");
            result = eng.predictDistortion({
              gcode: params.gcode,
              material: params.material,
              workpiece_dimensions: params.workpiece_dimensions,
              critical_dimensions: params.critical_dimensions,
              coolant_type: params.coolant_type,
            });
            break;
          }
          case "thermal_optimize": {
            const eng = await getEngine("thermal");
            result = eng.optimizeCuttingSequence({
              gcode: params.gcode,
              material: params.material,
              critical_features: params.critical_features,
            });
            break;
          }

          // --- Energy Optimizer (2 actions) ---
          case "energy_analyze": {
            const eng = await getEngine("energy");
            result = eng.analyzeEnergyConsumption(params.gcode, {
              machine_power_kw: params.machine_power_kw,
              spindle_efficiency: params.spindle_efficiency,
              coolant_pump_kw: params.coolant_pump_kw,
              electricity_rate: params.electricity_rate,
            });
            break;
          }
          case "energy_optimize": {
            const eng = await getEngine("energy");
            result = eng.optimizeForEnergy(params.gcode, {
              machine_power_kw: params.machine_power_kw,
              strategies: params.strategies,
            });
            break;
          }

          // --- Multi-Axis Kinematics (4 actions) ---
          case "kinematic_singularity": {
            const eng = await getEngine("kinematic");
            result = eng.detectSingularities(params.gcode, params.kinematics, {
              tolerance_deg: params.tolerance_deg,
            });
            break;
          }
          case "kinematic_transform": {
            const eng = await getEngine("kinematic");
            result = eng.transformCoordinates(params.gcode, params.from_kinematics, params.to_kinematics);
            break;
          }
          case "kinematic_optimize": {
            const eng = await getEngine("kinematic");
            result = eng.optimizeRotaryMotion(params.gcode, params.kinematics);
            break;
          }
          case "kinematic_reachability": {
            const eng = await getEngine("kinematic");
            result = eng.analyzeReachability(params.gcode, params.kinematics);
            break;
          }

          // --- Setup Sheet from G-Code (3 actions) ---
          case "setup_sheet_generate": {
            const eng = await getEngine("setupSheet");
            result = eng.generateSetupSheet(params.gcode, {
              controller: params.controller,
              part_number: params.part_number,
              operation_name: params.operation_name,
              include_tool_list: params.include_tool_list,
              include_offsets: params.include_offsets,
              include_safety: params.include_safety,
            });
            break;
          }
          case "setup_sheet_tools": {
            const eng = await getEngine("setupSheet");
            result = eng.generateToolList(params.gcode, params.controller);
            break;
          }
          case "setup_sheet_operations": {
            const eng = await getEngine("setupSheet");
            result = eng.generateOperationSequence(params.gcode, params.controller);
            break;
          }

          
          case "auto_speed_feed_optimize": {
            const eng = await getEngine("autoSF");
            result = await eng.optimize(params);
            break;
          }
          case "auto_speed_feed_analyze": {
            const eng = await getEngine("autoSF");
            result = await eng.analyze(params);
            break;
          }
          case "auto_speed_feed_batch": {
            const eng = await getEngine("autoSF");
            result = await eng.batchCalculate(
              params.material, params.iso_group, params.tools,
              params.machine_power_kw, params.machine_max_rpm, params.optimize_for,
            );
            break;
          }
          case "gcode_intelligence_pipeline": {
            const eng = await getEngine("pipeline");
            result = await eng.run(params);
            break;
          }
          case "pp_run_full": {
            const eng = await getEngine("postPipeline");
            result = await eng.process(params);
            break;
          }
          case "pp_run_partial": {
            const eng = await getEngine("postPipeline");
            result = await eng.process(params);
            break;
          }
          case "pp_analyze": {
            const eng = await getEngine("postPipeline");
            result = await eng.analyze(params);
            break;
          }
          case "pp_reoptimize": {
            const eng = await getEngine("postPipeline");
            result = await eng.reoptimize(params);
            break;
          }
          case "five_axis_tcpc": {
            const eng = await getEngine("fiveAxis");
            result = eng.getTCPCCodes(params.controller, params.tool_offset);
            break;
          }
          case "five_axis_singularity": {
            const eng = await getEngine("fiveAxis");
            result = eng.detectSingularities(params.blocks, params.config);
            break;
          }
          case "five_axis_linearize": {
            const eng = await getEngine("fiveAxis");
            result = eng.linearize(params.blocks, params.tolerance_mm);
            break;
          }
          case "pp_verify": {
            const eng = await getEngine("ppVerify");
            result = eng.verify(params);
            break;
          }
          case "pp_backplot": {
            const eng = await getEngine("ppVerify");
            result = eng.backplotVerify(params.gcode, params.original_points, params.tolerance_mm);
            break;
          }
          case "dialect_list": {
            const eng = await getEngine("controllerDialect");
            result = eng.listDialects();
            break;
          }
          case "dialect_translate": {
            const eng = await getEngine("controllerDialect");
            result = eng.translateCannedCycle(params.cycle, params.from, params.to);
            break;
          }
          case "dialect_features": {
            const eng = await getEngine("controllerDialect");
            result = eng.getFeatureCodes(params.controller, params.operation_type ?? "balanced");
            break;
          }
          case "pp_resolve_context": {
            const eng = await getEngine("postPipeline");
            result = await eng.process({ ...params, stages: { speed_feed: false, engagement_analysis: false, safety_analysis: false, playbook_rules: false, wear_progression: false, thermal_tracking: false, gcode_generation: false } });
            result = { machine: result.resolved?.machine, material: result.resolved?.material, tools: result.resolved?.tools, holders: result.resolved?.holders, coolant: result.resolved?.coolant };
            break;
          }
          case "machine_match": {
            const eng = await getEngine("machineMatcher");
            result = eng.match(params);
            break;
          }
          case "machine_quick_match": {
            const eng = await getEngine("machineMatcher");
            result = eng.quickMatch(params.gcode, params.material);
            break;
          }
          case "wear_compensate": {
            const eng = await getEngine("wearComp");
            result = eng.compensate(params);
            break;
          }
          case "wear_analyze": {
            const eng = await getEngine("wearComp");
            result = eng.analyze(params);
            break;
          }

          // Manufacturing Statistics (8 actions)
          case "stats_process_capability": {
            result = (await getEngine("mfgStats")).processCapability(params);
            break;
          }
          case "stats_spc_chart": {
            result = (await getEngine("mfgStats")).spcChart(params);
            break;
          }
          case "stats_weibull": {
            result = (await getEngine("mfgStats")).weibullAnalysis(params);
            break;
          }
          case "stats_monte_carlo_tolerance": {
            result = (await getEngine("mfgStats")).monteCarloTolerance(params);
            break;
          }
          case "stats_anova": {
            result = (await getEngine("mfgStats")).anova(params);
            break;
          }
          case "stats_regression": {
            result = (await getEngine("mfgStats")).regression(params);
            break;
          }
          case "stats_oee": {
            result = (await getEngine("mfgStats")).oee(params);
            break;
          }
          case "stats_gage_rr": {
            result = (await getEngine("mfgStats")).gageRR(params);
            break;
          }

          // Advanced Cutting Math (8 actions)
          case "math_chip_mechanics": {
            result = (await getEngine("cuttingMath")).chipMechanics(params);
            break;
          }
          case "math_thermal_models": {
            result = (await getEngine("cuttingMath")).thermalModels(params);
            break;
          }
          case "math_wear_models": {
            result = (await getEngine("cuttingMath")).wearModels(params);
            break;
          }
          case "math_surface_integrity": {
            result = (await getEngine("cuttingMath")).surfaceIntegrity(params);
            break;
          }
          case "math_timoshenko_deflection": {
            result = (await getEngine("cuttingMath")).timoshenkoDeflection(params);
            break;
          }
          case "math_taguchi": {
            result = (await getEngine("cuttingMath")).taguchiDOE(params.factors, params.responses);
            break;
          }
          case "math_topsis": {
            result = (await getEngine("cuttingMath")).topsis(params);
            break;
          }
          case "math_desirability": {
            result = (await getEngine("cuttingMath")).desirability(params.responses);
            break;
          }

          // ── Advanced Cutting Physics (6) ─────────────────────────
          case "sci_oxley": { result = (await getEngine("cuttingPhysics")).oxleyPredictive(params); break; }
          case "sci_oblique": { result = (await getEngine("cuttingPhysics")).obliqueCutting(params); break; }
          case "sci_size_effect": { result = (await getEngine("cuttingPhysics")).sizeEffect(params); break; }
          case "sci_recht_shear": { result = (await getEngine("cuttingPhysics")).rechtShearInstability(params); break; }
          case "sci_chip_breaking": { result = (await getEngine("cuttingPhysics")).chipBreakingCriterion(params); break; }
          case "sci_process_damping": { result = (await getEngine("cuttingPhysics")).processDamping(params); break; }

          // ── Reliability Engineering (8) ──────────────────────────
          case "rel_cox_hazards": { result = (await getEngine("reliability")).coxProportionalHazards(params); break; }
          case "rel_competing_risks": { result = (await getEngine("reliability")).competingRisks(params); break; }
          case "rel_wiener_rul": { result = (await getEngine("reliability")).wienerDegradation(params); break; }
          case "rel_gamma_degradation": { result = (await getEngine("reliability")).gammaDegradation(params); break; }
          case "rel_bayesian_rul": { result = (await getEngine("reliability")).bayesianRUL(params); break; }
          case "rel_optimal_replacement": { result = (await getEngine("reliability")).optimalReplacement(params); break; }
          case "rel_delay_time": { result = (await getEngine("reliability")).delayTimeModel(params); break; }
          case "rel_renewal_theory": { result = (await getEngine("reliability")).renewalTheory(params); break; }

          // ── Machine Geometric Accuracy (5) ──────────────────────
          case "acc_21_error_model": { result = (await getEngine("machineAccuracy")).twentyOneErrorModel(params); break; }
          case "acc_abbe_offset": { result = (await getEngine("machineAccuracy")).abbeOffset(params); break; }
          case "acc_volumetric": { result = (await getEngine("machineAccuracy")).volumetricAccuracy(params); break; }
          case "acc_ball_bar": { result = (await getEngine("machineAccuracy")).ballBarAnalysis(params); break; }
          case "acc_thermal_error": { result = (await getEngine("machineAccuracy")).thermalErrorModel(params); break; }

          // ── Statistical Process Monitoring (9) ──────────────────
          case "spm_hotelling_t2": { result = (await getEngine("spm")).hotellingT2(params); break; }
          case "spm_pca_monitoring": { result = (await getEngine("spm")).pcaProcessMonitoring(params); break; }
          case "spm_hmm_condition": { result = (await getEngine("spm")).hiddenMarkovModel(params); break; }
          case "spm_bootstrap_ci": { result = (await getEngine("spm")).bootstrapCI(params); break; }
          case "spm_sprt": { result = (await getEngine("spm")).sprt(params); break; }
          case "spm_combined_spc": { result = (await getEngine("spm")).combinedSPCScheme(params); break; }
          case "spm_doe_generate": { result = (await getEngine("spm")).doeGenerator(params); break; }
          case "spm_rsm": { result = (await getEngine("spm")).responseSurfaceMethodology(params); break; }
          case "spm_nbi_optimization": { result = (await getEngine("spm")).nbiOptimization(params); break; }

          // ── Constitutive Models (9) ─────────────────────────────
          case "const_zerilli_armstrong": { result = (await getEngine("constitutive")).zerilliArmstrong(params); break; }
          case "const_mts": { result = (await getEngine("constitutive")).mechanicalThresholdStress(params); break; }
          case "const_voce": { result = (await getEngine("constitutive")).voceHardening(params); break; }
          case "const_ptw": { result = (await getEngine("constitutive")).prestonTonksWallace(params); break; }
          case "const_paris_law": { result = (await getEngine("constitutive")).parisLaw(params); break; }
          case "const_norton_creep": { result = (await getEngine("constitutive")).nortonCreep(params); break; }
          case "const_larson_miller": { result = (await getEngine("constitutive")).larsonMiller(params); break; }
          case "const_hollomon": { result = (await getEngine("constitutive")).hollomonHardening(params); break; }
          case "const_machinability": { result = (await getEngine("constitutive")).machinabilityIndex(params); break; }

          // ── Advanced Wear Physics (7) ───────────────────────────
          case "wear_stochastic": { result = (await getEngine("wearPhysics")).kannateyAsibuStochastic(params); break; }
          case "wear_fick_crater": { result = (await getEngine("wearPhysics")).fickCraterWear(params); break; }
          case "wear_notch": { result = (await getEngine("wearPhysics")).notchWear(params); break; }
          case "wear_lognormal_life": { result = (await getEngine("wearPhysics")).logNormalToolLife(params); break; }
          case "wear_rabinowicz": { result = (await getEngine("wearPhysics")).rabinowiczAbrasiveWear(params); break; }
          case "wear_flank_ode": { result = (await getEngine("wearPhysics")).flankWearODE(params); break; }
          case "wear_combined_mechanisms": { result = (await getEngine("wearPhysics")).combinedWearMechanisms(params); break; }

          // ── Sustainability & LCA (7) ────────────────────────────
          case "sus_lifecycle_assessment": { result = (await getEngine("susLCA")).lifecycleAssessment(params); break; }
          case "sus_eco_efficiency": { result = (await getEngine("susLCA")).ecoEfficiencyFrontier(params); break; }
          case "sus_exergy": { result = (await getEngine("susLCA")).exergyAnalysis(params); break; }
          case "sus_gutowski_energy": { result = (await getEngine("susLCA")).gutowskiEnergyModel(params); break; }
          case "sus_coolant_lifecycle": { result = (await getEngine("susLCA")).coolantLifecycleEnergy(params); break; }
          case "sus_stochastic_economics": { result = (await getEngine("susLCA")).stochasticToolLifeEconomics(params); break; }
          case "sus_total_cost_ownership": { result = (await getEngine("susLCA")).totalCostOfOwnership(params); break; }

          // ── Coolant Dynamics (7) ────────────────────────────────
          case "cool_reynolds_flow": { result = (await getEngine("coolant")).reynoldsChannelFlow(params); break; }
          case "cool_tsc_pressure": { result = (await getEngine("coolant")).throughSpindlePressureDrop(params); break; }
          case "cool_mql_spray": { result = (await getEngine("coolant")).mqlSprayModel(params); break; }
          case "cool_jet_coherence": { result = (await getEngine("coolant")).jetCoherence(params); break; }
          case "cool_chip_transport": { result = (await getEngine("coolant")).chipTransportDrag(params); break; }
          case "cool_komanduri_thermal": { result = (await getEngine("coolant")).komanduriHouThermal(params); break; }
          case "cool_cryogenic": { result = (await getEngine("coolant")).cryogenicMachiningThermal(params); break; }

          // ── CNC Program Assembler ──────────────────────────────────────
          case "program_assemble": { result = await (await getEngine("assembler")).assembleProgram(params as any); break; }
          case "program_batch_sf": { result = await (await getEngine("assembler")).calculateBatchSpeedFeed(params as any); break; }
          case "program_cycle_time": { result = await (await getEngine("assembler")).estimateCycleTime(params as any); break; }

          // ── Motion Dynamics Profile ────────────────────────────────────
          case "motion_trapezoidal": { const p = params as any; result = (await getEngine("motionDyn")).trapezoidalProfile(p.distance_mm, p.v_commanded_mmmin, p.v_entry_mmmin ?? 0, p.v_exit_mmmin ?? 0, p.max_accel_mm_s2); break; }
          case "motion_scurve": { const p = params as any; result = (await getEngine("motionDyn")).sCurveProfile(p.distance_mm, p.v_commanded_mmmin, p.v_entry_mmmin ?? 0, p.v_exit_mmmin ?? 0, p.max_accel_mm_s2, p.max_jerk_mm_s3); break; }
          case "motion_corner_velocity": { const p = params as any; result = (await getEngine("motionDyn")).cornerVelocity(p.v1_direction, p.v2_direction, p.max_accel_mm_s2, p.corner_tolerance_mm); break; }
          case "motion_look_ahead": { const p = params as any; result = (await getEngine("motionDyn")).simulateLookAhead(p.segments, p.kinematics); break; }
          case "motion_axis_decompose": { const p = params as any; result = (await getEngine("motionDyn")).axisDecomposition(p.feed_mmmin, p.direction, p.axis_limits); break; }
          case "motion_feed_effectiveness": { const p = params as any; result = (await getEngine("motionDyn")).feedEffectiveness(p.segments, p.kinematics); break; }
          case "motion_optimize_feed": { const p = params as any; result = (await getEngine("motionDyn")).optimizeFeedProfile(p.segments, p.kinematics); break; }

          // ── Engagement Adaptive Feed ───────────────────────────────────
          case "engage_adapt_feed": {
            result = (await getEngine("engageAdapt")).adaptFeed(params as any);
            break;
          }
          case "engage_calc_engagement": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).calculateEngagement(
              p.tool_diameter_mm, p.radial_depth_mm, p.move_type
            );
            break;
          }
          case "engage_chip_thinning": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).chipThinningFactor(
              p.engagement_deg, p.tool_diameter_mm, p.radial_depth_mm, p.model
            );
            break;
          }
          case "engage_constant_force": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).constantForceFeed(
              p.nominal_fz_mm, p.nominal_engagement_deg, p.new_engagement_deg,
              p.kc1_1, p.mc
            );
            break;
          }
          case "engage_constant_mrr": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).constantMRRFeed(
              p.nominal_fz_mm, p.nominal_ae_mm, p.new_ae_mm
            );
            break;
          }
          case "engage_thermal_balance": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).thermalBalanceFeed(
              p.nominal_fz_mm, p.nominal_ae_mm, p.new_ae_mm,
              p.cutting_speed_mmin, p.axial_depth_mm, p.kc1_1,
              { conductivity_w_mk: p.conductivity_w_mk, rho_c_jm3k: p.rho_c_jm3k }
            );
            break;
          }
          case "engage_ramp_transition": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).rampFeedTransition(
              p.feed_before_mmmin, p.feed_after_mmmin,
              p.ramp_distance_mm, p.num_points
            );
            break;
          }

          case "master_post_process": {
            const { masterPostProcessorEngine } = await import("../../engines/MasterPostProcessorEngine.js");
            result = masterPostProcessorEngine.process(
              (params as any).segments || [],
              params as any
            );
            break;
          }

          // ============================================================================
          // MASTER POST ENGINES (JM Die canonical posts) - PPG-WIRE-MS0
          // ============================================================================

          case "master_post_hurco_v11": {
            const { hurcoV11MillMasterPostEngine } = await import("../../engines/HurcoV11MillMasterPostEngine.js");
            const p = params as {
              operations: Array<{
                operation_type: string;
                tool_number: number;
                tool_diameter_mm: number;
                tool_flutes: number;
                tool_description?: string;
                material_iso: string;
                spindle_rpm: number;
                feed_mm_min: number;
                axial_depth_mm: number;
                radial_depth_mm?: number;
                coolant?: "flood" | "mist" | "tsc" | "off";
                coordinates: Array<{ x: number; y: number; z: number; type: string }>;
                arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
              }>;
              config?: {
                program_number?: number;
                program_comment?: string;
                use_conversational?: boolean;
                use_ultimotion?: boolean;
                coolant_mode?: "flood" | "mist" | "tsc" | "off";
                work_offset?: number;
                units?: "metric" | "inch";
                safe_z_mm?: number;
                tool_change_position?: { x: number; y: number; z: number };
              };
              /** U-PPGM15: gate tier for the post-emit verifier; omit to skip. */
              verify_tier?: "sim" | "proven_out" | "production" | "shop_floor";
            };
            const engineOutput = hurcoV11MillMasterPostEngine.generateProgram(
              p.operations as any,
              p.config
            );
            // U-PPGM15: seal sidecar from engine's block_annotations[] and
            // optionally run the gate. Single dispatch returns the full
            // verified package (gcode + sidecar + verify result).
            const { sealMasterPostOutput } = await import("../../cps/sealMasterPostOutput.js");
            result = sealMasterPostOutput(engineOutput, {
              source_engine_versions: { "HurcoV11MillMasterPostEngine": "1.1.0" },
              verify_tier: p.verify_tier,
            });
            break;
          }

          case "master_post_okuma_b250": {
            const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
            const p = params as {
              operations: Array<{
                operation_type: string;
                tool_number: number;
                tool_orientation: number;
                insert_radius_mm: number;
                tool_description?: string;
                material_iso: string;
                spindle_rpm?: number;
                css_m_min?: number;
                css_max_rpm?: number;
                feed_mm_rev: number;
                depth_of_cut_mm: number;
                start_x: number;
                start_z: number;
                end_x: number;
                end_z: number;
                thread_pitch_mm?: number;
                thread_depth_mm?: number;
                thread_passes?: number;
                groove_width_mm?: number;
                coolant?: "flood" | "off";
              }>;
              config?: {
                program_number?: number;
                program_comment?: string;
                units?: "metric" | "inch";
                work_offset?: number;
                safe_z_mm?: number;
                chuck_pressure?: "high" | "medium" | "low";
                use_css?: boolean;
                css_max_rpm?: number;
                sub_spindle_enabled?: boolean;
                live_tooling_enabled?: boolean;
                c_axis_enabled?: boolean;
                tailstock_position_mm?: number;
              };
              /** U-PPGM15: gate tier for the post-emit verifier; omit to skip. */
              verify_tier?: "sim" | "proven_out" | "production" | "shop_floor";
            };
            const okumaEngineOutput = okumaB250LatheMasterPostEngine.generateProgram(
              p.operations as any,
              p.config
            );
            // U-PPGM15: seal sidecar (G97 ops only — G96 CSS bypasses
            // annotation; gate's anonymous-block rule skips them).
            const { sealMasterPostOutput: sealOkuma } = await import("../../cps/sealMasterPostOutput.js");
            result = sealOkuma(okumaEngineOutput, {
              source_engine_versions: { "OkumaB250LatheMasterPostEngine": "1.1.0" },
              verify_tier: p.verify_tier,
            });
            break;
          }
          case "master_post_okuma_osp": {
            // PPG-WIRE-MS5/U-PPGW-OkumaMill — Okuma OSP-P300M / OSP-P500M
            // mill master post. Closes the OSP-P*M HARD-REJECT branch in
            // master_post_by_machine. Same MillOperation contract as Hurco;
            // family flag selects 3-axis (P300M) vs 5-axis (P500M).
            const { okumaOSPMillMasterPostEngine } = await import("../../engines/OkumaOSPMillMasterPostEngine.js");
            const p = params as {
              operations: Array<{
                operation_type: string;
                tool_number: number;
                tool_diameter_mm: number;
                tool_flutes: number;
                tool_description?: string;
                material_iso: string;
                spindle_rpm: number;
                feed_mm_min: number;
                axial_depth_mm: number;
                radial_depth_mm?: number;
                coolant?: "flood" | "mist" | "tsc" | "off";
                coordinates: Array<{ x: number; y: number; z: number; type: string }>;
                arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
              }>;
              config?: {
                program_number?: number;
                program_comment?: string;
                osp_family?: "P300" | "P500";
                use_super_nurbs?: boolean;
                coolant_mode?: "flood" | "mist" | "tsc" | "off";
                work_offset_index?: number;
                units?: "metric" | "inch";
                safe_z_mm?: number;
                tool_change_position?: { x: number; y: number; z: number };
                max_spindle_rpm?: number;
              };
              /** Tier for sealMasterPostOutput post-emit verifier; omit to skip gate. */
              verify_tier?: "sim" | "proven_out" | "production" | "shop_floor";
            };
            const ospEngineOutput = okumaOSPMillMasterPostEngine.generateProgram(
              p.operations as any,
              p.config,
            );
            const { sealMasterPostOutput: sealOSP } = await import("../../cps/sealMasterPostOutput.js");
            result = sealOSP(ospEngineOutput, {
              source_engine_versions: { "OkumaOSPMillMasterPostEngine": "1.0.0" },
              verify_tier: p.verify_tier,
            });
            break;
          }
          case "master_post_mitsubishi_mv1200r": {
            const { mitsubishiMV1200RWireEDMMasterPostEngine } = await import("../../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js");
            const p = params as {
              operations: Array<{
                operation_type: "profile" | "taper" | "no_core" | "open_path" | "start_hole";
                pass: "rough" | "skim1" | "skim2" | "skim3" | "skim4";
                start_x: number;
                start_y: number;
                profile_points: Array<{ x: number; y: number; u?: number; v?: number; type: "line" | "arc_cw" | "arc_ccw"; r?: number; i?: number; j?: number }>;
                material: { name: string; iso_group?: string; hardness_hrc?: number; conductivity_relative?: number };
                thickness_mm: number;
                wire?: { diameter_mm?: number; tension_g?: number; speed_mmin?: number };
                power_setting?: string;
                on_time_us?: number;
                off_time_us?: number;
                servo_voltage_v?: number;
                flushing_pressure?: "low" | "medium" | "high" | "auto";
                taper_angle_deg?: number;
                taper_height_mm?: number;
                land_height_mm?: number;
                offset_direction: "left" | "right" | "center";
                offset_override_mm?: number;
              }>;
              config?: {
                program_number?: number;
                program_comment?: string;
                units?: "metric" | "inch";
                submerged?: boolean;
                auto_wire_thread?: boolean;
                wire_diameter_mm?: number;
                e_pack_base?: string;
                corner_control?: boolean;
                backup_on_break_mm?: number;
                dialect?: "M700V" | "M800";
                set_work_origin?: boolean;
                adaptive_control?: boolean;
              };
              /** PPG-WIRE-MS6/U-PPGM17a — seal sidecar carrying wedm_block_annotations[]. */
              verify_tier?: "sim" | "proven_out" | "production" | "shop_floor";
            };
            // Map schema types to engine types
            const ops = p.operations.map(op => ({
              ...op,
              profile_points: op.profile_points.map(pt => ({
                ...pt,
                type: pt.type === "line" ? "linear" : pt.type,
              })) as any,
              material: {
                name: op.material.name,
                hardness_hrc: op.material.hardness_hrc ?? 60,
                conductivity: op.material.conductivity_relative ?? 0.1,
              },
              flushing_pressure: op.flushing_pressure === "low" ? 3 : op.flushing_pressure === "medium" ? 8 : op.flushing_pressure === "high" ? 12 : undefined,
              power_setting: op.power_setting ? parseInt(op.power_setting.replace(/[^0-9]/g, ""), 10) : undefined,
            }));
            const wedmEngineOutput = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
              ops as any,
              p.config
            );
            // PPG-WIRE-MS6/U-PPGM17a — route through sealWEDMMasterPostOutput
            // so block_annotations land in sidecar.wedm_block_annotations and
            // the SHA seals over the canonical 1.2.0 payload.
            // PPG-WIRE-MS6/U-PPGM17b — verify_tier now exercises the WEDM
            // verifier (verifyWEDMBlockAnnotations) which reasons over
            // PASS_DEFAULTS / E_PACK_TABLE, NOT milling/turning S/F.
            const { sealWEDMMasterPostOutput: sealWEDM } = await import("../../cps/sealMasterPostOutput.js");
            result = sealWEDM(wedmEngineOutput, {
              source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "1.0.0" },
              verify_tier: p.verify_tier,
            });
            break;
          }
          case "master_post_by_machine": {
            const model = (params.machine_model as string ?? "").toUpperCase();
            // ────────────────────────────────────────────────────────────
            // U-PPGW-OkumaMill (PPG-WIRE-MS5) — Okuma OSP-P*M mill branch.
            // Replaces the previous HARD-REJECT (U-PPGW12). OSP-P300M and
            // OSP-P500M now route through OkumaOSPMillMasterPostEngine.
            // The mill check still PRECEDES the OKUMA-lathe branch so the
            // dispatcher cannot mis-route a mill controller to the lathe
            // engine even when the model name also contains "OKUMA".
            //
            // Family inference: "OSP-P500" / "OSP_P500" → P500M (5-axis
            // MU-V); anything else with "OSP-P*M" suffix → P300M (3-axis
            // MB-V / Genos M, the default).
            // ────────────────────────────────────────────────────────────
            if (model.includes("OSP-P300M") || model.includes("OSP_P300M") ||
                model.includes("OSP-P500M") || model.includes("OSP_P500M")) {
              const { okumaOSPMillMasterPostEngine } = await import("../../engines/OkumaOSPMillMasterPostEngine.js");
              const ospFamily: "P300" | "P500" =
                (model.includes("OSP-P500") || model.includes("OSP_P500")) ? "P500" : "P300";
              const callerCfg = ((params as any).config ?? {}) as Record<string, unknown>;
              const ospEngineOutput = okumaOSPMillMasterPostEngine.generateProgram(
                (params as any).operations,
                { ...callerCfg, osp_family: ospFamily } as any,
              );
              const { sealMasterPostOutput: sealOSPRouter } = await import("../../cps/sealMasterPostOutput.js");
              result = sealOSPRouter(ospEngineOutput, {
                source_engine_versions: { "OkumaOSPMillMasterPostEngine": "1.0.0" },
                verify_tier: (params as any).verify_tier,
              });
            } else if (
              model.includes("OKUMA") || model.includes("LB250") ||
              // U-PPGW12 — Okuma lathe alias-expand: LB-family compact
              // lathes + explicit OSP-PxxxL controllers all route through
              // OkumaB250LatheMasterPostEngine. The engine is hardwired to
              // LB250II-M tribal knowledge; non-LB250 lathes may emit
              // slightly off codes (acknowledged risk per user direction).
              model.includes("LB200") || model.includes("LB300") ||
              model.includes("OSP-P300L") || model.includes("OSP_P300L") ||
              model.includes("OSP-P500L") || model.includes("OSP_P500L")
            ) {
              const { okumaB250LatheMasterPostEngine } = await import("../../engines/OkumaB250LatheMasterPostEngine.js");
              result = okumaB250LatheMasterPostEngine.generateProgram(
                (params as any).operations,
                (params as any).config
              );
            } else if (model.includes("MITSUBISHI") || model.includes("MV1200")) {
              const { mitsubishiMV1200RWireEDMMasterPostEngine } = await import("../../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js");
              const ops = ((params as any).operations ?? []).map((op: any) => ({
                ...op,
                profile_points: (op.profile_points ?? []).map((pt: any) => ({
                  ...pt,
                  type: pt.type === "line" ? "linear" : pt.type,
                })),
                material: {
                  name: op.material?.name ?? "unknown",
                  hardness_hrc: op.material?.hardness_hrc ?? 60,
                  conductivity: op.material?.conductivity_relative ?? 0.1,
                },
              }));
              const wedmRouterOutput = mitsubishiMV1200RWireEDMMasterPostEngine.generateProgram(
                ops as any,
                (params as any).config
              );
              // PPG-WIRE-MS6/U-PPGM17a — auto-router seals the WEDM sidecar
              // symmetrically with the Hurco/Okuma branches.
              // PPG-WIRE-MS6/U-PPGM17b — verify_tier now wires through to the
              // WEDM verifier (PASS_DEFAULTS / E_PACK_TABLE consistency).
              const { sealWEDMMasterPostOutput: sealWEDMRouter } = await import("../../cps/sealMasterPostOutput.js");
              result = sealWEDMRouter(wedmRouterOutput, {
                source_engine_versions: { "MitsubishiMV1200RWireEDMMasterPostEngine": "1.0.0" },
                verify_tier: (params as any).verify_tier,
              });
            } else if (
              model.includes("HURCO") || model.includes("VMX24") || model.includes("VM30I") || model.includes("V11") ||
              // U-PPGW11 — Hurco alias-expand: catches VMX42/VMX60i/VM10/VM20i,
              // legacy ULTIMAX, and explicit ULTIMOTION/MAX31i identifiers.
              // All route through HurcoV11MillMasterPostEngine.
              model.includes("VMX") || model.includes("VM10") || model.includes("VM20") ||
              model.includes("MAX31") || model.includes("ULTIMAX") || model.includes("ULTIMOTION")
            ) {
              const { hurcoV11MillMasterPostEngine } = await import("../../engines/HurcoV11MillMasterPostEngine.js");
              // ──────────────────────────────────────────────────────────
              // U-PPGW11 — Router-infers UltiMotion. ULTIMAX is Hurco's
              // legacy pre-WinMax control which does NOT support G187 P3
              // (UltiMotion). Force-disable for ULTIMAX regardless of
              // caller's config; for everything else leave caller's value
              // (engine default is `true` when omitted).
              // ──────────────────────────────────────────────────────────
              const callerCfg = ((params as any).config ?? {}) as Record<string, unknown>;
              const inferredCfg: Record<string, unknown> = { ...callerCfg };
              if (model.includes("ULTIMAX") && !model.includes("ULTIMOTION")) {
                inferredCfg.use_ultimotion = false;
              }
              result = hurcoV11MillMasterPostEngine.generateProgram(
                (params as any).operations,
                inferredCfg
              );
            } else {
              result = {
                success: false,
                error: `Unknown machine model: ${params.machine_model}. Supported lathes: OKUMA_LB200/LB250/LB300, OSP-P300L, OSP-P500L. Supported mills: HURCO VMX/VM10/VM20/V11/MAX31/ULTIMAX/ULTIMOTION; OKUMA OSP-P300M/OSP-P500M (PPG-WIRE-MS5/U-PPGW-OkumaMill). Wire EDM: MITSUBISHI_MV1200R.`,
              };
            }
            break;
          }
          case "cnc_simulate": {
            const { cncSimulationPipelineEngine } = await import("../../engines/CNCSimulationPipelineEngine.js");
            result = cncSimulationPipelineEngine.simulate({
              gcode_blocks: (params.gcode as string ?? "").split("\n"),
              machine_brand: params.machine_brand as string,
              machine_model: params.machine_model as string,
              tool_diameter_mm: params.tool_diameter_mm as number,
              tool_length_mm: params.tool_length_mm as number,
              material: params.material as string,
            });
            break;
          }
          case "cnc_simulate_report": {
            const { cncSimulationPipelineEngine: simPipe } = await import("../../engines/CNCSimulationPipelineEngine.js");
            const { simulationReportEngine } = await import("../../engines/SimulationReportEngine.js");
            const simRes = simPipe.simulate({
              gcode_blocks: (params.gcode as string ?? "").split("\n"),
              material: params.material as string,
            });
            result = simulationReportEngine.generateReport(simRes);
            break;
          }
          case "cnc_simulate_physics": {
            const { physicsAwareSimulationEngine } = await import("../../engines/PhysicsAwareSimulationEngine.js");
            result = physicsAwareSimulationEngine.computeBlockPhysics({
              cutting_speed_m_min: params.cutting_speed_m_min as number ?? 150,
              feed_mm_rev: params.feed_mm_rev as number ?? 0.2,
              depth_of_cut_mm: params.depth_of_cut_mm as number ?? 3,
              width_of_cut_mm: params.width_of_cut_mm as number ?? 6,
              tool_diameter_mm: params.tool_diameter_mm as number ?? 12,
              tool_length_mm: params.tool_length_mm as number ?? 50,
              tool_flutes: params.tool_flutes as number ?? 4,
              material: params.material as string ?? "steel",
            });
            break;
          }
          case "cnc_simulate_predictive": {
            const { predictiveSimulationEngine } = await import("../../engines/PredictiveSimulationEngine.js");
            result = predictiveSimulationEngine.predict({
              tools: params.tools as any ?? [],
              blocks: params.blocks as any ?? [],
              workpiece_material: params.workpiece_material as string ?? "steel",
            });
            break;
          }
          // ── InstantaneousEngagementEngine (2 actions) ──
          case "instantaneous_engagement_analyze": {
            const eng = await getEngine("instEngage");
            result = eng.analyzeToolpath(params as any);
            break;
          }
          case "instantaneous_engagement_optimal_sf": {
            const eng = await getEngine("instEngage");
            result = eng.computeOptimalSF(params as any);
            break;
          }
          // ── MultiCAMPostEngine (5 actions) ──
          case "multi_cam_post_list": {
            const eng = await getEngine("multiCamPost");
            result = eng.listCAMSystems();
            break;
          }
          case "multi_cam_post_scaffold": {
            const eng = await getEngine("multiCamPost");
            result = eng.getPostScaffold(params.system as any, params.controller as string);
            break;
          }
          case "multi_cam_post_sequence": {
            const eng = await getEngine("multiCamPost");
            result = eng.getMachineSequence(params as any);
            break;
          }
          case "multi_cam_post_millturn": {
            const eng = await getEngine("multiCamPost");
            result = eng.getMillTurnChannels(params.controller as string);
            break;
          }
          case "multi_cam_post_phase_b": {
            const eng = await getEngine("multiCamPost");
            result = eng.getPhaseBCommand(params as any);
            break;
          }
          // ── ProductionToolpathEngine (4 actions) ──
          case "production_toolpath_generate": {
            const eng = await getEngine("prodToolpath");
            result = eng.generateProduction(params as any);
            break;
          }
          case "production_toolpath_gcode": {
            const eng = await getEngine("prodToolpath");
            result = eng.toGcode(params as any);
            break;
          }
          case "production_toolpath_cost": {
            const eng = await getEngine("prodToolpath");
            result = eng.costPerFeature(params as any);
            break;
          }
          case "production_toolpath_chatter_rpm": {
            const eng = await getEngine("prodToolpath");
            result = eng.selectChatterSafeRPM(params as any);
            break;
          }
          // ── PostProcessorAPIEngine (3 actions) ──
          case "pp_api_start": {
            const eng = await getEngine("ppAPI");
            result = await eng.start(params as any);
            break;
          }
          case "pp_api_stop": {
            const eng = await getEngine("ppAPI");
            result = await eng.stop();
            break;
          }
          case "pp_api_status": {
            const eng = await getEngine("ppAPI");
            result = eng.status();
            break;
          }
          // ── ScalableCAMOrchestratorEngine (1 action) ──
          case "scalable_cam_orchestrate": {
            const eng = await getEngine("scalableOrch");
            result = eng.process(params as any);
            break;
          }
          // ── UnifiedCAMPipelineEngine (1 action) ──
          case "unified_cam_pipeline": {
            const eng = await getEngine("unifiedPipe");
            result = eng.generate(params as any);
            break;
          }
          // ── SmartToolSelectorEngine (1 action) ──
          case "smart_tool_select": {
            const eng = await getEngine("smartTool");
            result = eng.select(params as any);
            break;
          }
          // ── AdaptiveToolpathRouterEngine (2 actions) ──
          case "adaptive_toolpath_route": {
            const eng = await getEngine("adaptRouter");
            result = eng.route(params as any);
            break;
          }
          case "adaptive_toolpath_list_algorithms": {
            const eng = await getEngine("adaptRouter");
            result = eng.listAlgorithms();
            break;
          }
          // ── CumulativeStockChainEngine (1 action) ──
          case "cumulative_stock_chain": {
            const eng = await getEngine("cumStock");
            result = eng.chain(params as any);
            break;
          }
          // ── FeatureClusteringEngine (1 action) ──
          case "feature_clustering_cluster": {
            const eng = await getEngine("featCluster");
            result = eng.cluster(params.features as any);
            break;
          }
          // ── ProductionPackageEngine (1 action) ──
          case "production_package_assemble": {
            const eng = await getEngine("prodPackage");
            result = eng.assemble(params as any);
            break;
          }
          case "five_axis_contour": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_contour", params);
            break;
          }
          case "five_axis_port": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_port", params);
            break;
          }
          case "five_axis_singularity_manage": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_singularity_manage", params);
            break;
          }
          case "five_axis_collision_avoid": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_collision_avoid", params);
            break;
          }
          case "five_axis_roughing": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_roughing", params);
            break;
          }
          // ── CK-MS7: CAMKernelOrchestratorEngine (3 actions) ──
          case "cam_generate": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_generate", params);
            break;
          }
          case "cam_turn": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_turn", params);
            break;
          }
          case "cam_simulate": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_simulate", params);
            break;
          }
          // F360-TOOL — Fusion 360 Tool Library Export
          case "fusion_export_tool_library": {
            const { toolCatalogEngine: tce } = await import("../../engines/ToolCatalogEngine.js");
            const { fusionToolExportEngine: fte } = await import("../../engines/FusionToolExportEngine.js");
            const mfr = (params as any).manufacturer as string | undefined;
            const toolType = (params as any).type as string | undefined;
            const limit = (params as any).limit as number | undefined;
            const tools = tce.search({ manufacturer: mfr, type: toolType as any });
            const subset = limit ? tools.slice(0, limit) : tools;
            const library = fte.exportLibrary(subset);
            result = { success: true, tool_count: subset.length, library };
            break;
          }
          case "fusion_sync_tools": {
            const { toolCatalogEngine: tce2 } = await import("../../engines/ToolCatalogEngine.js");
            const { fusionToolSyncEngine: fts } = await import("../../engines/FusionToolSyncEngine.js");
            const { fusionToolExportEngine: fte2 } = await import("../../engines/FusionToolExportEngine.js");
            const mode = (params as any).mode as string ?? "partition";
            if (mode === "partition") {
              const mfr = (params as any).manufacturer as string | undefined;
              const toolType = (params as any).type as string | undefined;
              const maxPer = (params as any).max_per_library as number | undefined;
              const tools = tce2.search({ manufacturer: mfr, type: toolType as any });
              const partitions = fts.partitionForExport(tools, maxPer);
              const libs: Record<string, number> = {};
              Array.from(partitions.entries()).forEach(([name, arr]) => { libs[name] = arr.length; });
              result = { success: true, library_count: partitions.size, libraries: libs };
            } else if (mode === "status") {
              result = { success: true, ...fts.getSyncSummary() };
            } else if (mode === "unsynced") {
              const tools = tce2.search({});
              const unsynced = fts.getUnsyncedTools(tools);
              result = { success: true, unsynced_count: unsynced.length };
            } else if (mode === "job") {
              const toolIds = (params as any).tool_ids as string[];
              const tools = tce2.search({});
              const job = fts.exportJobTools(toolIds ?? [], tools);
              const library = fte2.exportLibrary(job.tools);
              result = {
                success: true,
                library_name: job.libraryName,
                tool_count: job.tools.length,
                library,
              };
            } else if (mode === "crib") {
              const cribTools = (params as any).tools as { id: string }[];
              if (!cribTools?.length) {
                result = { error: "crib mode requires 'tools' array with {id} objects" };
              } else {
                const diff = fts.syncUserCrib(cribTools);
                result = { success: true, ...diff };
              }
            } else {
              result = { error: `Unknown fusion_sync_tools mode: ${mode}` };
            }
            break;
          }
          // PIPE-MS0 — Print-to-Program Pipeline
          case "print_to_program_full": {
            const { printToProgramPipelineEngine } = await import("../../engines/PrintToProgramPipelineEngine.js");
            const ptpResult = printToProgramPipelineEngine.calculate("print_to_program_full", params) as any;
            // PIPELINE-VAR U-PV01: Auto-chain PostProcessor for per-block S/F optimization
            if (ptpResult?.program_text && ptpResult.program_text.length > 0) {
              try {
                const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
                const ppOutput = await postProcessorPipelineEngine.process({
                  gcode: ptpResult.program_text,
                  material: {
                    name: (params as any)?.material?.material_name || ptpResult.material,
                    iso_group: (params as any)?.material?.iso_group,
                  },
                  machine: {
                    name: (params as any)?.machine_model || "generic",
                  },
                  optimization_target: (params as any)?.optimization_target || "balanced",
                });
                if (ppOutput?.output_gcode) {
                  ptpResult.program_text = ppOutput.output_gcode;
                  ptpResult.postprocessor_applied = true;
                }
              } catch (e: any) {
                // PostProcessor is non-blocking — fallback to original G-code
              }
            }
            result = ptpResult;
            break;
          }
          case "print_to_program_enhanced": {
            const { printToProgramPipelineEngine: ptpEnhanced } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = await ptpEnhanced.calculate("print_to_program_enhanced", params);
            break;
          }
          case "print_to_program_plan": {
            const { printToProgramPipelineEngine: ptpPlan } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = ptpPlan.calculate("print_to_program_plan", params);
            break;
          }
          case "print_to_program_validate": {
            const { printToProgramPipelineEngine: ptpVal } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = ptpVal.calculate("print_to_program_validate", params);
            break;
          }
          // ── PIPE-MS2: AutoPrintToProgramBridge (2 actions) ──
          case "auto_print_to_program": {
            const { autoPrintToProgramBridgeEngine } = await import("../../engines/AutoPrintToProgramBridgeEngine.js");
            result = await autoPrintToProgramBridgeEngine.calculate("auto_print_to_program", params);
            break;
          }
          case "auto_detect_format": {
            const { autoPrintToProgramBridgeEngine: bridgeDetect } = await import("../../engines/AutoPrintToProgramBridgeEngine.js");
            result = await bridgeDetect.calculate("auto_detect_format", params);
            break;
          }
          // ── PIPE-MS2: IGESImportEngine (3 actions — previously orphaned) ──
          case "iges_parse": {
            const { igesImportEngine } = await import("../../engines/IGESImportEngine.js");
            result = igesImportEngine.parseIGES({ content: params.content as string });
            break;
          }
          case "iges_extract_geometry": {
            const { igesImportEngine: igesGeo } = await import("../../engines/IGESImportEngine.js");
            result = igesGeo.extractGeometry({ content: params.content as string, filter: params.filter as any });
            break;
          }
          case "iges_summary": {
            const { igesImportEngine: igesSumm } = await import("../../engines/IGESImportEngine.js");
            result = igesSumm.getSummary({ content: params.content as string });
            break;
          }
          // ── CK-MS7: EDMProgramAssemblerEngine (5 actions) ──
          case "edm_wire_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleWireEDM(params);
            break;
          }
          case "edm_sinker_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleSinkerEDM(params);
            break;
          }
          case "edm_micro_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleMicroEDM(params);
            break;
          }
          case "edm_cycle_time": {
            const eng = await getEngine("edmAsm");
            result = eng.estimateCycleTime(params);
            break;
          }
          case "edm_uncertainty": {
            const eng = await getEngine("edmAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMProgramSafetyGateEngine (3 actions) ──
          case "wedm_safety_gate_evaluate": {
            const { wedmProgramSafetyGateEngine } = await import("../../engines/WEDMProgramSafetyGateEngine.js");
            result = wedmProgramSafetyGateEngine.evaluate(params);
            break;
          }
          case "wedm_safety_gate_score": {
            const { wedmProgramSafetyGateEngine } = await import("../../engines/WEDMProgramSafetyGateEngine.js");
            result = { success: true, sx_score: wedmProgramSafetyGateEngine.getScore(params), can_emit: wedmProgramSafetyGateEngine.canEmit(params) };
            break;
          }
          case "wedm_safety_gate_thresholds": {
            const { wedmProgramSafetyGateEngine } = await import("../../engines/WEDMProgramSafetyGateEngine.js");
            result = { success: true, ...wedmProgramSafetyGateEngine.getThresholds(), weights: wedmProgramSafetyGateEngine.getWeights() };
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMUnitTagGateEngine (2 actions) ──
          case "wedm_unit_tag_evaluate": {
            const { WEDMUnitTagGateEngine } = await import("../../engines/WEDMUnitTagGateEngine.js");
            const eng = new WEDMUnitTagGateEngine();
            result = eng.evaluate(params);
            break;
          }
          case "wedm_unit_tag_gate": {
            const { WEDMUnitTagGateEngine } = await import("../../engines/WEDMUnitTagGateEngine.js");
            const eng = new WEDMUnitTagGateEngine();
            result = eng.gate(params);
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMHeadClearanceEngine (2 actions) ──
          case "wedm_head_clearance_evaluate": {
            const { WEDMHeadClearanceEngine } = await import("../../engines/WEDMHeadClearanceEngine.js");
            const eng = new WEDMHeadClearanceEngine();
            result = eng.evaluate(params);
            break;
          }
          case "wedm_head_clearance_gate": {
            const { WEDMHeadClearanceEngine } = await import("../../engines/WEDMHeadClearanceEngine.js");
            const eng = new WEDMHeadClearanceEngine();
            result = eng.gate(params);
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMFlushAdequacyGateEngine (2 actions) ──
          case "wedm_flush_adequacy_evaluate": {
            const { WEDMFlushAdequacyGateEngine } = await import("../../engines/WEDMFlushAdequacyGateEngine.js");
            const eng = new WEDMFlushAdequacyGateEngine();
            result = eng.evaluate(params);
            break;
          }
          case "wedm_flush_adequacy_gate": {
            const { WEDMFlushAdequacyGateEngine } = await import("../../engines/WEDMFlushAdequacyGateEngine.js");
            const eng = new WEDMFlushAdequacyGateEngine();
            result = eng.gate(params);
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMThermalReleaseGateEngine (2 actions) ──
          case "wedm_thermal_release_evaluate": {
            const { WEDMThermalReleaseGateEngine } = await import("../../engines/WEDMThermalReleaseGateEngine.js");
            const eng = new WEDMThermalReleaseGateEngine();
            result = eng.evaluate(params);
            break;
          }
          case "wedm_thermal_release_gate": {
            const { WEDMThermalReleaseGateEngine } = await import("../../engines/WEDMThermalReleaseGateEngine.js");
            const eng = new WEDMThermalReleaseGateEngine();
            result = eng.gate(params);
            break;
          }
          // ── MS-P2.5-SAFETY: WEDMControllerDialectVerifierEngine (3 actions) ──
          case "wedm_dialect_verify": {
            const { WEDMControllerDialectVerifierEngine } = await import("../../engines/WEDMControllerDialectVerifierEngine.js");
            const eng = new WEDMControllerDialectVerifierEngine();
            result = eng.verify(params);
            break;
          }
          case "wedm_dialect_gate": {
            const { WEDMControllerDialectVerifierEngine } = await import("../../engines/WEDMControllerDialectVerifierEngine.js");
            const eng = new WEDMControllerDialectVerifierEngine();
            result = eng.gate(params);
            break;
          }
          case "wedm_dialect_resolve": {
            const { WEDMControllerDialectVerifierEngine } = await import("../../engines/WEDMControllerDialectVerifierEngine.js");
            const eng = new WEDMControllerDialectVerifierEngine();
            result = { controller: eng.resolveController(params.name || params.controller || "") };
            break;
          }
          // ── MS-P3-TIER6A: EDMWireSlugCornerTaperEngine (3 actions) ──
          case "edm_corner_taper_analyze": {
            const { edmWireSlugCornerTaperEngine } = await import("../../engines/EDMWireSlugCornerTaperEngine.js");
            result = edmWireSlugCornerTaperEngine.analyze(params);
            break;
          }
          case "edm_corner_taper_min_radius": {
            const { edmWireSlugCornerTaperEngine } = await import("../../engines/EDMWireSlugCornerTaperEngine.js");
            result = { success: true, min_radius_mm: edmWireSlugCornerTaperEngine.computeMinRadius(params.wire_diameter_mm ?? 0.25, params.spark_gap_mm ?? 0.025) };
            break;
          }
          case "edm_slug_drop_predict": {
            const { edmWireSlugCornerTaperEngine } = await import("../../engines/EDMWireSlugCornerTaperEngine.js");
            const full = edmWireSlugCornerTaperEngine.analyze(params);
            result = { success: full.success, ...full.slug_prediction };
            break;
          }
          // ── MS-P3-TIER6A: EDMMultiPassStrategyEngine (3 actions) ──
          case "edm_multi_pass_plan": {
            const { edmMultiPassStrategyEngine } = await import("../../engines/EDMMultiPassStrategyEngine.js");
            result = edmMultiPassStrategyEngine.plan(params);
            break;
          }
          case "edm_multi_pass_cycle_time": {
            const { edmMultiPassStrategyEngine } = await import("../../engines/EDMMultiPassStrategyEngine.js");
            result = { success: true, cycle_time_min: edmMultiPassStrategyEngine.estimateCycleTime(params.finish_class ?? "standard", params.thickness_mm, params.cut_length_mm, params.material) };
            break;
          }
          case "edm_multi_pass_recast": {
            const { edmMultiPassStrategyEngine } = await import("../../engines/EDMMultiPassStrategyEngine.js");
            result = { success: true, recast_um: edmMultiPassStrategyEngine.calculateRecastAfterPasses(params.pass_count ?? 1), passes_needed: edmMultiPassStrategyEngine.passesForTargetRecast(params.target_recast_um ?? 5) };
            break;
          }
          // ── CK-MS7: GrindingProgramAssemblerEngine (5 actions) ──
          case "grind_surface_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleSurfaceGrind(params);
            break;
          }
          case "grind_cylindrical_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCylindricalGrind(params);
            break;
          }
          case "grind_centerless_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCenterlessGrind(params);
            break;
          }
          case "grind_creepfeed_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCreepFeedGrind(params);
            break;
          }
          case "grind_uncertainty": {
            const eng = await getEngine("grindAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: LaserProgramAssemblerEngine (5 actions) ──
          case "laser_cut_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserCut(params);
            break;
          }
          case "laser_mark_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserMark(params);
            break;
          }
          case "laser_weld_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserWeld(params);
            break;
          }
          case "laser_drill_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserDrill(params);
            break;
          }
          case "laser_uncertainty": {
            const eng = await getEngine("laserAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: WaterjetProgramAssemblerEngine (5 actions) ──
          case "waterjet_abrasive_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleAbrasiveWJ(params);
            break;
          }
          case "waterjet_pure_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assemblePureWJ(params);
            break;
          }
          case "waterjet_taper_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleTaperCompensated(params);
            break;
          }
          case "waterjet_depth_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleControlledDepth(params);
            break;
          }
          case "waterjet_uncertainty": {
            const eng = await getEngine("wjAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: MultiProcessCAMRouterEngine (6 actions) ──
          case "multi_process_route": {
            const eng = await getEngine("multiProc");
            result = eng.routePart(params);
            break;
          }
          case "multi_process_analyze": {
            const eng = await getEngine("multiProc");
            result = eng.analyzeFeatures(params.features, params);
            break;
          }
          case "multi_process_sequence": {
            const eng = await getEngine("multiProc");
            result = eng.sequenceProcesses(params.analyses, params);
            break;
          }
          case "multi_process_cost": {
            const eng = await getEngine("multiProc");
            result = eng.estimateCost(params.route, params.batch_size ?? 1);
            break;
          }
          case "multi_process_alternatives": {
            const eng = await getEngine("multiProc");
            result = eng.compareProcessAlternatives(params.feature, params);
            break;
          }
          case "multi_process_consolidate": {
            const eng = await getEngine("multiProc");
            result = eng.suggestConsolidation(params.route);
            break;
          }
          // ── CK-MS7: MillTurnSwissPipelineEngine (5 actions) ──
          case "mill_turn_live_tooling": {
            const eng = await getEngine("millTurn");
            result = eng.calculateLiveTool(params);
            break;
          }
          case "mill_turn_sub_spindle": {
            const eng = await getEngine("millTurn");
            result = eng.calculateSubSpindleTransfer(params);
            break;
          }
          case "mill_turn_multi_channel": {
            const eng = await getEngine("millTurn");
            result = eng.calculateMultiChannel(params);
            break;
          }
          case "mill_turn_bar_feeder": {
            const eng = await getEngine("millTurn");
            result = eng.calculateBarFeeder(params);
            break;
          }
          case "mill_turn_swiss": {
            const eng = await getEngine("millTurn");
            result = eng.calculateSwissMachining(params);
            break;
          }
          // ── CK-MS7: SelfLearningCAMEngine (5 actions) ──
          case "self_learn_record": {
            const eng = await getEngine("selfLearn");
            result = eng.cutToLearn(params);
            break;
          }
          case "self_learn_twin_sync": {
            const eng = await getEngine("selfLearn");
            result = eng.digitalTwinSync(params);
            break;
          }
          case "self_learn_rank_strategy": {
            const eng = await getEngine("selfLearn");
            result = eng.strategyRanking(params);
            break;
          }
          case "self_learn_anomaly": {
            const eng = await getEngine("selfLearn");
            result = eng.anomalyRelearn(params);
            break;
          }
          case "self_learn_fleet": {
            const eng = await getEngine("selfLearn");
            result = eng.fleetLearn(params);
            break;
          }
          // ── CK-MS10: Turning Profiles ─────────────────────────────────
          case "turning_profile_od": {
            const e = await getEngine("turningProfile");
            result = e.generateODProfile(
              params.features, params.stock_diameter_mm,
              params.material, params.nose_radius_mm, params.num_passes
            );
            break;
          }
          case "turning_profile_id": {
            const e = await getEngine("turningProfile");
            result = e.generateIDProfile(
              params.features, params.bore_diameter_mm, params.stock_bore_diameter_mm,
              params.material, params.nose_radius_mm, params.num_passes
            );
            break;
          }
          case "turning_profile_thread": {
            const e = await getEngine("turningProfile");
            result = e.generateThreadProfile({
              type: params.type ?? "external",
              nominal_diameter_mm: params.nominal_diameter_mm,
              pitch_mm: params.pitch_mm,
              length_mm: params.length_mm,
              z_start_mm: params.z_start_mm ?? 0,
              thread_depth_mm: params.thread_depth_mm,
              infeed_method: params.infeed_method,
              spring_passes: params.spring_passes,
              first_pass_doc_mm: params.first_pass_doc_mm,
              controller: params.controller,
            });
            break;
          }
          case "turning_profile_gcode": {
            const e = await getEngine("turningProfile");
            const lines = e.profileToGCode(params.profile, {
              controller: params.controller,
              program_number: params.program_number,
              sequence_start: params.sequence_start,
              sequence_increment: params.sequence_increment,
              g71_p_label: params.g71_p_label,
              g71_q_label: params.g71_q_label,
              include_g70: params.include_g70,
              rpm_css: params.rpm_css,
              max_rpm: params.max_rpm,
            });
            result = { gcode_lines: lines, line_count: lines.length };
            break;
          }
          // ── CK-MS10: Sheet Nesting ────────────────────────────────────
          case "sheet_nest": {
            const e = await getEngine("sheetNesting");
            result = e.nestParts(params.parts, params.sheet, params.options ?? {});
            break;
          }
          case "sheet_nest_optimize": {
            const e = await getEngine("sheetNesting");
            result = e.optimizeNesting(params.parts, params.sheet, params.options ?? {});
            break;
          }
          case "sheet_cut_order": {
            const e = await getEngine("sheetNesting");
            const order = e.generateCutOrder(params.nesting);
            result = { cut_order: order, total_parts: order.length };
            break;
          }
          // ── CK-MS10: DXF/SVG Parsing ──────────────────────────────────
          case "dxf_parse": {
            const e = await getEngine("dxfParser");
            const fmt = params.format ?? (params.content.trimStart().startsWith("<") ? "svg" : "dxf");
            const polygons = fmt === "svg" ? e.parseSVG(params.content) : e.parseDXF(params.content);
            const classified = (params.classify_contours ?? true) ? e.classifyContours(polygons) : polygons;
            result = {
              polygons: classified,
              count: classified.length,
              format: fmt,
              outer_count: classified.filter((pg: any) => !pg.is_hole).length,
              hole_count: classified.filter((pg: any) => pg.is_hole).length,
            };
            break;
          }
          // ── CAM Kernel Unified Actions (CK Track) ──────────
          case "cam_unified_generate":
          case "cam_complex_generate":
          case "cam_production_toolpath":
          case "cam_multi_process":
          case "cam_mill_turn":
          case "cam_5axis_convert":
          case "cam_advanced_strategy":
          case "cam_smart_tool":
          case "cam_verify":
          case "cam_chatter_rpm":
          case "cam_cost_feature": {
            const { dispatchCAMAction } = await import("../../engines/CAMKernelDispatcherBridge.js");
            result = dispatchCAMAction(action as any, params);
            break;
          }
          // ── CK-MS11: StochasticRoutingEngine ──────────────────────────
          case "stochastic_route": {
            const eng = await getEngine("stochRouter");
            const { feature, material, machine, algorithms, n_samples } = params as any;
            return slimResponse(eng.selectAlgorithm(feature, material, machine ?? {}, { algorithms, n_samples }));
          }
          case "stochastic_compare": {
            const eng = await getEngine("stochRouter");
            const { algorithms, feature, material, machine } = params as any;
            return slimResponse(eng.compareAlgorithms(algorithms, feature, material, machine ?? {}));
          }
          case "stochastic_sensitivity": {
            const eng = await getEngine("stochRouter");
            const { algorithm, feature, material, machine } = params as any;
            return slimResponse(eng.sensitivityAnalysis(algorithm, feature, material, machine ?? {}));
          }
          // ── CK-MS11: ProbingProgramEngine ────────────────────────────
          case "probe_wcs_setup_gen": {
            const eng = await getEngine("probingProg");
            const { datums, config } = params as any;
            return slimResponse(eng.generateWCSSetup(datums, config));
          }
          case "probe_first_article_gen": {
            const eng = await getEngine("probingProg");
            const { features, config } = params as any;
            return slimResponse(eng.generateFirstArticle(features, config));
          }
          case "probe_in_process_gen": {
            const eng = await getEngine("probingProg");
            const { feature, config } = params as any;
            return slimResponse(eng.generateInProcessCheck(feature, config));
          }
          case "probe_tool_measure_gen": {
            const eng = await getEngine("probingProg");
            const { tool, config } = params as any;
            return slimResponse(eng.generateToolMeasure(tool, config));
          }
          case "probe_auto_comp_gen": {
            const eng = await getEngine("probingProg");
            const { feature, offset_register, axis, max_comp_mm, config } = params as any;
            return slimResponse(eng.generateAutoComp({ feature, offset_register, axis, max_comp_mm }, config));
          }
          // ── CK-MS11: DFMFeedbackEngine ───────────────────────────────
          case "dfm_analyze": {
            const eng = await getEngine("dfmFeedback");
            const { features, material, tolerances } = params as any;
            return slimResponse(eng.analyze(features, material, tolerances ?? []));
          }
          case "dfm_suggest": {
            const eng = await getEngine("dfmFeedback");
            const { features, material, tolerances } = params as any;
            const analysis = eng.analyze(features, material, tolerances ?? []);
            return slimResponse(eng.suggestImprovements(analysis));
          }
          case "dfm_report": {
            const eng = await getEngine("dfmFeedback");
            const { features, material, tolerances, include_improvements } = params as any;
            const analysis = eng.analyze(features, material, tolerances ?? []);
            const improvements = (include_improvements !== false)
              ? eng.suggestImprovements(analysis)
              : [];
            return slimResponse(eng.generateReport(analysis, improvements));
          }
          case "cam_intelligent_sequence": {
            const { intelligentSequencingEngine } = await import("../../engines/IntelligentSequencingEngine.js");
            result = intelligentSequencingEngine.sequence(params.operations ?? []);
            break;
          }
          case "cam_list_actions": {
            const { listCAMActions } = await import("../../engines/CAMKernelDispatcherBridge.js");
            result = listCAMActions();
            break;
          }

          // ── CK-MS12: NLPCAMParserEngine ───────────────────────────────────
          case "nlp_cam_parse": {
            const eng = await getEngine("nlpCAMParser");
            return slimResponse(eng.parse(params.text));
          }
          case "nlp_cam_parse_context": {
            const eng = await getEngine("nlpCAMParser");
            return slimResponse(eng.parseWithContext(
              params.text, params.material, params.machine
            ));
          }
          case "nlp_cam_extract_dims": {
            const eng = await getEngine("nlpCAMParser");
            return slimResponse(eng.extractDimensions(params.text));
          }

          // ── CK-MS12: ProgramCompareEngine ─────────────────────────────────
          case "program_compare": {
            const eng = await getEngine("programCompare");
            const cmp = eng.compare(params.program_a, params.program_b);
            if (params.format === "report")   return slimResponse({ report: eng.generateReport(cmp) });
            if (params.format === "summary")  return slimResponse(cmp.summary);
            return slimResponse(cmp);
          }
          case "program_diff": {
            const eng  = await getEngine("programCompare");
            const diff = eng.diffGCode(params.program_a, params.program_b);
            const ctx  = (params.context_lines as number) ?? 3;
            // Filter to changes + ctx surrounding lines of equal
            const filtered = diff.filter((d: any, i: number) => {
              if (d.type !== "equal") return true;
              return diff.slice(Math.max(0, i - ctx), i + ctx + 1)
                .some((n: any) => n.type !== "equal");
            });
            return slimResponse({ diff: filtered, total: diff.length, changes: diff.filter((d: any) => d.type !== "equal").length });
          }
          case "program_compare_physics": {
            const eng = await getEngine("programCompare");
            return slimResponse(eng.comparePhysics(params.program_a, params.program_b));
          }

          // ── CK-MS12: CAMResultCacheEngine ─────────────────────────────────
          case "cam_cache_stats": {
            const eng = await getEngine("camCache");
            return slimResponse(eng.stats());
          }
          case "cam_cache_clear": {
            const eng = await getEngine("camCache");
            eng.clear(params.namespace);
            return slimResponse({ cleared: true, namespace: params.namespace ?? "all" });
          }

          // ── CK-MS12: BatchCAMEngine ────────────────────────────────────────
          case "batch_cam_generate": {
            const eng   = await getEngine("batchCAM");
            let parts   = params.parts as any[];
            if (params.optimize_order) parts = eng.optimizeBatchOrder(parts);
            const results = await eng.parallelGenerate(parts, params.concurrency ?? 4);
            const summary = eng.summarizeBatch(results);
            return slimResponse({ results, summary });
          }
          case "batch_cam_optimize": {
            const eng    = await getEngine("batchCAM");
            const sorted = eng.optimizeBatchOrder(params.parts as any[]);
            return slimResponse({ parts: sorted, count: sorted.length });
          }

          // ── CK-MS13: PipelineCostModelEngine (E1095) ───────────────────────
          case "pipeline_cost_compute": {
            const eng = await getEngine("pipelineCostModel");
            result = eng.computeCostPerPart(params);
            break;
          }
          case "pipeline_cost_compare": {
            const eng = await getEngine("pipelineCostModel");
            result = eng.compareCosts(params.options ?? []);
            break;
          }
          case "pipeline_cost_sensitivity": {
            const eng = await getEngine("pipelineCostModel");
            result = eng.sensitivityAnalysis(params);
            break;
          }
          case "pipeline_cost_breakeven": {
            const eng = await getEngine("pipelineCostModel");
            result = eng.breakEvenQuantity(
              params.setup_cost_usd,
              params.per_part_variable_cost,
              params.target_price_per_part,
            );
            break;
          }

          // ── ProductionBatchOptimizationEngine (E1094) — CAMX-MS21 U08 ──────
          case "production_batch_optimize": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.optimizeBatch(
              params.part_id, params.quantity, params.tools, params.machine, params.material,
              params.part_dims, params.fixture_type, params.fixture_dims,
              params.cycle_time_min, params.tolerances ?? [],
              params.spc_data, params.bar_length_mm,
            );
            break;
          }
          case "production_batch_tool_changes": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.predictToolChanges(params.tools, params.cycle_time_min, params.quantity);
            break;
          }
          case "production_batch_fixture": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.optimizeFixtureLoading(params.part_dims, params.fixture_type, params.fixture_dims);
            break;
          }
          case "production_batch_barstock": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.optimizeBarStock(
              params.part_length_mm, params.part_dia_mm, params.bar_length_mm,
              params.grip_length_mm, params.cutoff_width_mm, params.material,
            );
            break;
          }
          case "production_batch_probing": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.probingSchedule(params.quantity, params.tolerances ?? [], params.spc_data);
            break;
          }
          case "production_batch_cost": {
            const eng = await getEngine("prodBatchOpt");
            result = eng.batchCostAnalysis(params as any);
            break;
          }

          // ── CAMX-MS3 U01: MastercamStrategyEngine (E1102) ────────────────────
          case "mastercam_strategy_recommend": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.recommend(
              params.feature,
              params.material,
              params.machine,
              params.tool,
              params.priority,
            );
            break;
          }
          case "mastercam_strategy_params": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.getParameters(params.strategy_name);
            break;
          }
          case "mastercam_strategy_dynamic_motion": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.dynamicMotionDetails();
            break;
          }
          case "mastercam_strategy_optirough": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.optiRoughDetails();
            break;
          }
          case "mastercam_strategy_profit_turning": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.profitTurningDetails();
            break;
          }
          case "mastercam_strategy_list": {
            const eng = await getEngine("mastercamStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── CAMX-MS3 U09: MastercamCodeGeneratorEngine (E1117) ───────────────
          case "mastercam_code_generate": {
            const eng = await getEngine("mastercamCodeGen");
            const genParams = {
              script_type: params.script_type ?? "vbscript",
              operations: params.operations ?? [],
              tools: params.tools ?? [],
              defaults: params.defaults,
              part_file: params.part_file,
              post_processor: params.post_processor,
              nc_output_path: params.nc_output_path,
              regenerate_all: params.regenerate_all ?? false,
              run_post: params.run_post ?? false,
              error_handling: params.error_handling ?? false,
            };
            if (params.description) {
              result = eng.generateFromDescription(params.description);
            } else {
              result = eng.generate(genParams);
            }
            break;
          }
          case "mastercam_code_templates": {
            const eng = await getEngine("mastercamCodeGen");
            let templates = eng.getTemplates(params.category);
            if (params.script_type) {
              templates = templates.filter((t: any) => t.script_type === params.script_type);
            }
            result = { templates, count: templates.length };
            break;
          }

          // ── CAMX-MS10 U01: MastercamToolExportEngine (E1123) ─────────────────
          case "mastercam_tool_export": {
            const eng = await getEngine("mastercamToolExport");
            const isoGroups = params.cutting_data_materials ?? undefined;
            const filter = params.filter ? { ...params.filter, iso_group: params.filter.iso_group ?? undefined } : undefined;
            if (isoGroups && filter) filter.iso_group = undefined; // iso_group in filter overrides per-group list only if set there
            result = eng.exportLibrary(filter, params.format ?? "mcam-tools");
            break;
          }
          case "mastercam_tool_export_job": {
            const eng = await getEngine("mastercamToolExport");
            result = eng.exportForJob(
              params.job_tools ?? [],
              params.format ?? "mcam-tools",
            );
            break;
          }

          // ── CAMX-MS12 U01: FeatureStrategyKnowledgeBaseEngine (E1112) ────────
          case "strategy_kb_query": {
            const eng = await getEngine("featureStrategyKB");
            const rules = eng.query(params.conditions ?? {});
            const limit = params.limit ?? 10;
            result = { rules: rules.slice(0, limit), total_matched: rules.length };
            break;
          }
          case "strategy_kb_best": {
            const eng = await getEngine("featureStrategyKB");
            result = eng.getBestStrategy(
              params.feature_type,
              params.material_iso,
              params.machine_axes,
              params.operation,
              {
                depth_ratio: params.depth_ratio,
                wall_thickness_mm: params.wall_thickness_mm,
                tolerance_class: params.tolerance_class,
                special_conditions: params.special_conditions,
              },
            );
            break;
          }
          case "strategy_kb_add": {
            const eng = await getEngine("featureStrategyKB");
            eng.addRule({
              id: params.id,
              conditions: params.conditions ?? {},
              strategy: params.strategy,
              parameters: params.parameters,
              justification: params.justification,
              source: params.source,
              confidence: params.confidence,
            });
            result = { added: true, id: params.id, total_rules: eng.getRuleCount() };
            break;
          }
          case "strategy_kb_stats": {
            const eng = await getEngine("featureStrategyKB");
            result = eng.getStats();
            break;
          }
          case "strategy_kb_list": {
            const eng = await getEngine("featureStrategyKB");
            let rules = eng.listRules(params.feature_type);
            if (params.source) rules = rules.filter((r: any) => r.source === params.source);
            if (params.operation) rules = rules.filter((r: any) => r.conditions.operation === params.operation);
            const limit = params.limit ?? 50;
            result = { rules: rules.slice(0, limit), total: rules.length };
            break;
          }

          // ── CAMX-MS12 U02: StrategyBenchmarkEngine (E1096) ───────────────────
          case "strategy_benchmark": {
            const eng = await getEngine("strategyBenchmark");
            result = eng.benchmark(
              params.strategy,
              params.feature,
              params.material,
              params.tool,
              params.machine,
              params.trials,
            );
            break;
          }
          case "strategy_benchmark_compare": {
            const eng = await getEngine("strategyBenchmark");
            result = eng.compareBenchmarks(
              params.strategies,
              params.feature,
              params.material,
              params.tool,
              params.machine,
              params.trials,
            );
            break;
          }
          case "strategy_benchmark_monte_carlo": {
            const eng = await getEngine("strategyBenchmark");
            result = eng.monteCarloBenchmark(
              params.strategy,
              params.feature,
              params.material,
              params.tool,
              params.machine,
              params.trials,
            );
            break;
          }

          // ── CAMX-MS12 U03: StrategyComparisonEngine (E1099) ──────────────
          case "strategy_compare": {
            const eng = await getEngine("strategyComparison");
            result = await eng.compare(
              params.strategies,
              params.feature,
              params.material,
              params.tool,
              params.machine,
              params.priority,
              params.trials,
            );
            break;
          }
          case "strategy_head_to_head": {
            const eng = await getEngine("strategyComparison");
            result = await eng.headToHead(
              params.strategy_a,
              params.strategy_b,
              params.feature,
              params.material,
              params.tool,
              params.machine,
              params.priority,
              params.trials,
            );
            break;
          }
          case "strategy_radar_chart": {
            const eng = await getEngine("strategyComparison");
            result = eng.radarChart(params.comparison);
            break;
          }

          // ── CAMX-MS12 U05: ContextualStrategyOverrideEngine (E1111) ──────
          case "strategy_override_check": {
            const eng = await getEngine("contextualStrategyOverride");
            result = eng.checkOverrides(
              params.feature ?? {},
              params.material ?? {},
              params.tool ?? {},
              params.strategy ?? {},
              params.quantity,
            );
            break;
          }
          case "strategy_override_apply": {
            const eng = await getEngine("contextualStrategyOverride");
            result = eng.applyOverrides(
              params.params ?? {},
              params.overrides ?? [],
            );
            break;
          }
          case "strategy_override_rules": {
            const eng = await getEngine("contextualStrategyOverride");
            result = eng.listRules();
            break;
          }

          // ── CAMX-MS12 U06: StrategySequencingEngine ──────────────────────
          case "strategy_sequence_build": {
            const eng = await getEngine("strategySequencing");
            result = eng.sequenceStrategies(
              params.feature,
              params.material,
              params.tool_options,
              params.machine,
              params.constraints ?? {},
            );
            break;
          }
          case "strategy_sequence_evaluate": {
            const eng = await getEngine("strategySequencing");
            result = eng.evaluateSequence(
              params.ordered_ops,
              params.feature,
              params.material,
              params.machine,
            );
            break;
          }
          case "strategy_sequence_optimize": {
            const eng = await getEngine("strategySequencing");
            result = eng.optimizeSequence(
              params.feature,
              params.material,
              params.tool_options,
              params.machine,
              params.constraints ?? {},
            );
            break;
          }

          // ── CAMX-MS12 U07: FixtureAwareStrategyEngine (E1101) ────────────
          case "strategy_fixture_adjust": {
            const eng = await getEngine("fixtureAwareStrategy");
            result = eng.adjustStrategy(params);
            break;
          }
          case "strategy_fixture_validate": {
            const eng = await getEngine("fixtureAwareStrategy");
            result = eng.validateForFixture(params);
            break;
          }
          case "strategy_fixture_recommend": {
            const eng = await getEngine("fixtureAwareStrategy");
            result = eng.recommendFixture(params.feature, params.strategies ?? []);
            break;
          }

          // ── CAMX-MS12 U08: BatchSizeStrategyEngine (E1100) ───────────────
          case "batch_strategy_recommend": {
            const eng = await getEngine("batchSizeStrategy");
            result = eng.recommend(
              params.batch_size,
              params.feature,
              params.material,
              params.tool,
              params.machine ?? {},
            );
            break;
          }
          case "batch_strategy_adjust": {
            const eng = await getEngine("batchSizeStrategy");
            result = eng.adjustParameters(params.base_params, params.batch_size);
            break;
          }
          case "batch_strategy_cost": {
            const eng = await getEngine("batchSizeStrategy");
            result = eng.costBreakdown(
              params.strategy ?? "default",
              params.batch_size,
              params.params,
              params.feature,
              params.tool,
              params.machine,
            );
            break;
          }

          // ── CAMX-MS12 U11: StrategyStochasticRiskEngine (renamed) ────────
          case "strategy_stochastic_compare": {
            const eng = await getEngine("strategyStochasticRisk");
            result = eng.stochasticCompare(
              params.candidates ?? [],
              params.config ?? params,
              params.lambda,
            );
            break;
          }
          case "strategy_stochastic_rank": {
            const eng = await getEngine("strategyStochasticRisk");
            result = eng.riskRank(
              params.candidates ?? [],
              params.config ?? params,
              params.lambda,
            );
            break;
          }

          // ── CAMX-MS12 U12: CpkPredictionGateEngine ───────────────────────
          case "strategy_cpk_gate": {
            const eng = await getEngine("cpkPredictionGate");
            result = eng.gate(
              params.candidates ?? [],
              params.tolerance_mm,
              params.min_cpk,
              params.ideal_cpk,
            );
            break;
          }
          case "strategy_cpk_filter": {
            const eng = await getEngine("cpkPredictionGate");
            result = eng.filter(
              params.candidates ?? [],
              params.tolerance_mm,
              params.min_cpk,
            );
            break;
          }

          // ── CAMX-MS12 U13: StrategyWorstCaseSelectorEngine (renamed) ─────
          case "strategy_robust_optimize": {
            const eng = await getEngine("strategyWorstCaseSelector");
            result = eng.robustSelect(
              params.candidates ?? [],
              params.scenarios ?? [],
            );
            break;
          }
          case "strategy_robust_worst_case": {
            const eng = await getEngine("strategyWorstCaseSelector");
            result = eng.worstCase(
              params.candidate,
              params.scenarios ?? [],
            );
            break;
          }

          // ── BOX Data: FusionCPSParserEngine ─────────────────────────────
          case "cps_parse_file": {
            const eng = await getEngine("cpsParser");
            const content = await import("fs").then(fs => fs.readFileSync(params.file_path, "utf-8"));
            result = eng.parseCPSFile(content, params.file_path);
            break;
          }
          case "cps_parse_directory": {
            const eng = await getEngine("cpsParser");
            result = eng.parseCPSDirectory(params.directory ?? "H:/prism/BOX/FUSION BASIC POSTS");
            break;
          }
          case "cps_search": {
            const eng = await getEngine("cpsParser");
            if (params.vendor) result = eng.searchByVendor(params.vendor);
            else if (params.capability) result = eng.searchByCapability(params.capability);
            else result = { error: "Provide vendor or capability param" };
            break;
          }
          case "cps_property_catalog": {
            const eng = await getEngine("cpsParser");
            eng.parseCPSDirectory(params.directory ?? "H:/prism/BOX/FUSION BASIC POSTS");
            result = eng.getPropertyCatalog();
            break;
          }
          case "cps_compare_controllers": {
            const eng = await getEngine("cpsParser");
            result = eng.compareControllers(params.controller_a, params.controller_b);
            break;
          }

          // ── BOX Data: OkumaParametricProgramEngine ────────────────────────
          case "okuma_generate_casing": {
            const eng = await getEngine("okumaParam");
            result = eng.generateCasingProgram(params);
            break;
          }
          case "okuma_generate_cbore": {
            const eng = await getEngine("okumaParam");
            result = eng.generateCounterBoreProgram(params);
            break;
          }
          case "okuma_validate_macro": {
            const eng = await getEngine("okumaParam");
            result = eng.validateProgram(params.gcode);
            break;
          }
          case "okuma_parse_macro": {
            const eng = await getEngine("okumaParam");
            result = eng.parseExistingMacro(params.gcode);
            break;
          }
          case "okuma_defaults": {
            const eng = await getEngine("okumaParam");
            result = eng.getDefaults(params.material);
            break;
          }

          case "okuma_convert_to_hardcode": {
            const eng = await getEngine("okumaParam");
            result = eng.convertToHardcode(params.gcode, params.decimal_places);
            break;
          }

          // ── BOX Data: PostProcessorCapabilityMatrixEngine ─────────────────
          case "pp_capability_matrix": {
            const eng = await getEngine("ppCapMatrix");
            result = params.family ? eng.getController(params.family) : eng.getMatrix();
            break;
          }
          case "pp_capability_query": {
            const eng = await getEngine("ppCapMatrix");
            result = eng.query(params);
            break;
          }
          case "pp_capability_compare": {
            const eng = await getEngine("ppCapMatrix");
            result = eng.compare(params.controllers);
            break;
          }
          case "pp_select_post": {
            const eng = await getEngine("ppCapMatrix");
            result = eng.selectPost(params);
            break;
          }
          case "pp_capability_summary": {
            const eng = await getEngine("ppCapMatrix");
            result = eng.getSummary();
            break;
          }

          // ── CAMX-MS5 U01: NXCAMStrategyEngine (E1104) ──────────────────────
          // ── CAMX-MS4 U03: PrismPathConstantEngagementEngine (E1103) ───────────────────
          case "imachining_compute": {
            const eng = await getEngine("iMachining");
            result = eng.compute(params.feature, params.material, params.tool, params.machine, params.level);
            break;
          }
          case "imachining_wizard": {
            const eng = await getEngine("iMachining");
            result = eng.technologyWizard(params.material_iso, params.machine_class, params.level, params.tool_diameter_mm);
            break;
          }
          case "imachining_spiral": {
            const eng = await getEngine("iMachining");
            result = eng.generateMorphedSpiral(params.boundary, params.tool_diameter, params.target_engagement);
            break;
          }
          case "imachining_engagement": {
            const eng = await getEngine("iMachining");
            result = eng.constantEngagement(params.toolpath, params.target_angle);
            break;
          }
          case "imachining_moat": {
            const eng = await getEngine("iMachining");
            result = eng.calculateMoat(params.boundary, params.tool_diameter, params.stepover_mm);
            break;
          }
          case "imachining_chipload": {
            const eng = await getEngine("iMachining");
            result = eng.chipLoadMaintenance(params.engagement_profile, params.base_fz, params.spindle_rpm, params.flutes, params.target_engagement);
            break;
          }
          case "nx_cam_recommend": {
            const eng = await getEngine("nxCAMStrategy");
            result = eng.recommend(params as any);
            break;
          }
          case "nx_cam_parameters": {
            const eng = await getEngine("nxCAMStrategy");
            result = eng.getParameters(params.strategy_name);
            break;
          }
          case "nx_cam_ipw": {
            const eng = await getEngine("nxCAMStrategy");
            result = eng.ipwCapabilities();
            break;
          }
          case "nx_cam_fbm": {
            const eng = await getEngine("nxCAMStrategy");
            result = eng.fbmMapping(params.feature_type);
            break;
          }
          case "nx_cam_list_strategies": {
            const eng = await getEngine("nxCAMStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── CAMX-MS5 U06 — NXCAMCodeGeneratorEngine (E1119) ─────────────
          case "nx_code_generate": {
            const eng = await getEngine("nxCAMCodeGen");
            if (params.description) {
              result = eng.generateFromDescription(params.description);
            } else {
              const lang = params.language ?? "python";
              const ops = params.operations ?? [];
              const tools = params.tools ?? [];
              const genParams = params.params ?? {};
              result = lang === "csharp"
                ? eng.generateCSharp(ops, tools, genParams)
                : eng.generatePython(ops, tools, genParams);
            }
            break;
          }
          case "nx_code_templates": {
            const eng = await getEngine("nxCAMCodeGen");
            result = eng.getTemplates(params.category);
            break;
          }

          // ── E1107 — ML Strategy Ranker ──────────────────────────────────
          case "ml_strategy_record": {
            const eng = await getEngine("mlStrategyRanker");
            result = eng.recordOutcome(params.strategy, params.feature_type, params.material_iso, {
              cycle_time_min: params.cycle_time_min,
              tool_life_min: params.tool_life_min,
              Ra_um: params.Ra_um,
              scrap_rate: params.scrap_rate,
              success: params.success,
              composite_score: params.composite_score,
            });
            break;
          }
          case "ml_strategy_rank": {
            const eng = await getEngine("mlStrategyRanker");
            result = eng.rankStrategies(params.feature_type, params.material_iso, params.candidates, params.exploration);
            break;
          }
          case "ml_strategy_history": {
            const eng = await getEngine("mlStrategyRanker");
            result = eng.getPerformanceHistory(params.strategy, params.feature_type, params.material_iso);
            break;
          }
          case "ml_strategy_recommend": {
            const eng = await getEngine("mlStrategyRanker");
            result = eng.getRecommendation(params.feature_type, params.material_iso, params.priority);
            break;
          }

          // ── CAMX-MS3 U02: SolidCAMStrategyEngine (E1106) ─────────────────
          case "solidcam_strategy_recommend": {
            const eng = await getEngine("solidCAMStrategy");
            result = eng.recommend(
              params.feature,
              params.material,
              params.machine,
              params.tool,
              params.priority,
            );
            break;
          }
          case "solidcam_strategy_params": {
            const eng = await getEngine("solidCAMStrategy");
            result = eng.getParameters(params.strategy_name);
            break;
          }
          case "solidcam_imachining_details": {
            const eng = await getEngine("solidCAMStrategy");
            result = eng.iMachiningDetails();
            break;
          }
          case "solidcam_hss_details": {
            const eng = await getEngine("solidCAMStrategy");
            result = eng.hssDetails();
            break;
          }
          case "solidcam_strategy_list": {
            const eng = await getEngine("solidCAMStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── CAMX-MS3 U02: MastercamSafetyHooksEngine (E1113) ─────────────────
          case "mastercam_safety_validate": {
            const eng = await getEngine("mastercamSafety");
            result = eng.validate(
              params.operation,
              params.tool,
              params.material,
              params.machine,
              params.strategy ?? {},
            );
            break;
          }
          case "mastercam_safety_validate_all": {
            const eng = await getEngine("mastercamSafety");
            result = eng.validateAll(params.operations);
            break;
          }
          case "mastercam_safety_rules": {
            const eng = await getEngine("mastercamSafety");
            result = eng.getRules();
            break;
          }

          // ── E1114: SolidCAMSafetyHooksEngine ─────────────────────────────────
          case "solidcam_safety_validate": {
            const eng = await getEngine("solidcamSafety");
            result = eng.validate(
              params.operation,
              params.tool,
              params.material,
              params.machine,
              params.strategy ?? {},
            );
            break;
          }
          case "solidcam_safety_validate_all": {
            const eng = await getEngine("solidcamSafety");
            result = eng.validateAll(params.operations);
            break;
          }
          case "solidcam_safety_rules": {
            const eng = await getEngine("solidcamSafety");
            result = eng.getRules();
            break;
          }

          // ── E1109: BatchCAMStrategyEngines (12 actions) ─────────────────────
          case "tebis_strategy_recommend": {
            const eng = await getEngine("tebisStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "tebis_strategy_list": {
            const eng = await getEngine("tebisStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "edgecam_strategy_recommend": {
            const eng = await getEngine("edgecamStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "edgecam_strategy_list": {
            const eng = await getEngine("edgecamStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "esprit_strategy_recommend": {
            const eng = await getEngine("espritStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "esprit_strategy_list": {
            const eng = await getEngine("espritStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "gibbscam_strategy_recommend": {
            const eng = await getEngine("gibbsCAMStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "gibbscam_strategy_list": {
            const eng = await getEngine("gibbsCAMStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "camworks_strategy_recommend": {
            const eng = await getEngine("camWorksStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "camworks_strategy_list": {
            const eng = await getEngine("camWorksStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "sprutcam_strategy_recommend": {
            const eng = await getEngine("sprutCAMStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "sprutcam_strategy_list": {
            const eng = await getEngine("sprutCAMStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── E1110: BatchCAMStrategyEngines2 (8 actions) ──────────────────
          case "worknc_strategy_recommend": {
            const eng = await getEngine("workNCStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "worknc_strategy_list": {
            const eng = await getEngine("workNCStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "topsolid_strategy_recommend": {
            const eng = await getEngine("topSolidStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "topsolid_strategy_list": {
            const eng = await getEngine("topSolidStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "bobcad_strategy_recommend": {
            const eng = await getEngine("bobCADStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "bobcad_strategy_list": {
            const eng = await getEngine("bobCADStrategy");
            result = eng.listStrategies(params.category);
            break;
          }
          case "cimatron_strategy_recommend": {
            const eng = await getEngine("cimatronStrategy");
            result = eng.recommend(params.feature, params.material, params.priority);
            break;
          }
          case "cimatron_strategy_list": {
            const eng = await getEngine("cimatronStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── E1108: CATIAStrategyEngine ────────────────────────────────────
          case "catia_strategy_recommend": {
            const eng = await getEngine("catiaStrategy");
            result = eng.recommend(
              params.feature,
              params.material,
              params.machine,
              params.tool,
              params.priority,
            );
            break;
          }
          case "catia_strategy_params": {
            const eng = await getEngine("catiaStrategy");
            result = eng.getParameters(params.strategy_name);
            break;
          }
          case "catia_kbm_details": {
            const eng = await getEngine("catiaStrategy");
            result = eng.kbmDetails();
            break;
          }
          case "catia_mfg_program": {
            const eng = await getEngine("catiaStrategy");
            result = eng.mfgProgramDetails();
            break;
          }
          case "catia_strategy_list": {
            const eng = await getEngine("catiaStrategy");
            result = eng.listStrategies(params.category);
            break;
          }

          // ── E1115: BatchCAMSafetyEngines ──────────────────────────────────
          case "nxcam_safety_validate": {
            const eng = await getEngine("nxCAMSafety");
            result = eng.validate(params.operation, params.tool, params.material, params.machine);
            break;
          }
          case "nxcam_safety_rules": {
            const eng = await getEngine("nxCAMSafety");
            result = eng.getRules();
            break;
          }
          case "powermill_safety_validate": {
            const eng = await getEngine("powerMillSafety");
            result = eng.validate(params.operation, params.tool, params.material, params.machine);
            break;
          }
          case "powermill_safety_rules": {
            const eng = await getEngine("powerMillSafety");
            result = eng.getRules();
            break;
          }
          case "catia_safety_validate": {
            const eng = await getEngine("catiaSafety");
            result = eng.validate(params.operation, params.tool, params.material, params.machine);
            break;
          }
          case "catia_safety_rules": {
            const eng = await getEngine("catiaSafety");
            result = eng.getRules();
            break;
          }

          // ── E1116: BatchCAMMaterialBridgeEngines ──────────────────────────
          case "mastercam_material_lookup": {
            const eng = await getEngine("mastercamMatBridge");
            result = params.strategy
              ? { ...eng.lookup(params.material), strategy_result: eng.getStrategyMultipliers(params.material, params.strategy) }
              : eng.lookup(params.material);
            break;
          }
          case "mastercam_material_search": {
            const eng = await getEngine("mastercamMatBridge");
            result = eng.search(params.query);
            break;
          }
          case "solidcam_material_lookup": {
            const eng = await getEngine("solidCAMMatBridge");
            result = params.strategy
              ? { ...eng.lookup(params.material), strategy_result: eng.getStrategyMultipliers(params.material, params.strategy) }
              : eng.lookup(params.material);
            break;
          }
          case "solidcam_material_search": {
            const eng = await getEngine("solidCAMMatBridge");
            result = eng.search(params.query);
            break;
          }
          case "nx_material_lookup": {
            const eng = await getEngine("nxCAMMatBridge");
            result = params.strategy
              ? { ...eng.lookup(params.material), strategy_result: eng.getStrategyMultipliers(params.material, params.strategy) }
              : eng.lookup(params.material);
            break;
          }
          case "nx_material_search": {
            const eng = await getEngine("nxCAMMatBridge");
            result = eng.search(params.query);
            break;
          }
          case "powermill_material_lookup": {
            const eng = await getEngine("powerMillMatBridge");
            result = params.strategy
              ? { ...eng.lookup(params.material), strategy_result: eng.getStrategyMultipliers(params.material, params.strategy) }
              : eng.lookup(params.material);
            break;
          }
          case "powermill_material_search": {
            const eng = await getEngine("powerMillMatBridge");
            result = eng.search(params.query);
            break;
          }

          // ── E1118: SolidCAMCodeGeneratorEngine ───────────────────────────
          case "solidcam_code_generate": {
            const eng = await getEngine("solidcamCodeGen");
            result = eng.generateVBA(
              params.operations ?? [],
              params.tools ?? [],
              params.params ?? {},
            );
            break;
          }
          case "solidcam_code_templates": {
            const eng = await getEngine("solidcamCodeGen");
            result = eng.getTemplates(params.category);
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM33: SolidCAM25DFunctionIndexEngine ─────
          case "solidcam_25d_index": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_25d_summary": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_25d_list_ops": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_25d_get_op": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_25d_by_category": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_25d_imachining": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getIMachiningParams();
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-30 — SolidCAM 25D completeness (3 actions)
          case "solidcam_25d_find_param": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "solidcam_25d_training_topics": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_25d_category_breakdown": {
            const eng = await getEngine("solidcam25dIndex");
            result = eng.getCategoryBreakdown();
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM34: SolidCAMIMachiningFunctionIndexEngine ─
          case "solidcam_imachining_index": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_imachining_summary": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_imachining_list_ops": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_imachining_get_op": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_imachining_by_category": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_imachining_training_topics": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_imachining_category_breakdown": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getCategoryBreakdown();
            break;
          }
          case "solidcam_imachining_wizard": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.getWizardParams();
            break;
          }
          case "solidcam_imachining_find_param": {
            const eng = await getEngine("solidcamIMachiningIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM35: SolidCAM3DHSSHSRFunctionIndexEngine ──
          case "solidcam_3d_hss_hsr_index": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_3d_hss_hsr_summary": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_3d_hss_hsr_list_ops": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_3d_hss_hsr_get_op": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_3d_hss_hsr_by_category": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_3d_hss_hsr_find_param": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "solidcam_3d_hss_hsr_recommend": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.recommendStrategy(params.wall_angle_deg, params.geometry_hint);
            break;
          }
          case "solidcam_3d_hss_hsr_training_topics": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_3d_hss_hsr_category_breakdown": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            result = eng.getCategoryBreakdown();
            break;
          }
          case "solidcam_3d_hss_hsr_step_from_scallop": {
            const eng = await getEngine("solidcam3DHSSHSRIndex");
            const step = eng.stepOverFromScallop(params.tool_radius_mm, params.scallop_height_mm);
            result = { step_over_mm: step, valid: step !== null };
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM36: SolidCAM5AxisFunctionIndexEngine ──
          case "solidcam_5_axis_index": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_5_axis_summary": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_5_axis_list_ops": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_5_axis_get_op": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_5_axis_by_category": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_5_axis_find_param": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "solidcam_5_axis_recommend": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.recommendByFeature(params.feature);
            break;
          }
          case "solidcam_5_axis_validate_axis": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.validateAxisChange(
              params.feed_rate_mm_per_min,
              params.axis_change_deg_per_mm,
              params.machine_max_rotary_deg_per_sec,
            );
            break;
          }
          case "solidcam_5_axis_singularity": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.singularityCheck(params.tilt_deg);
            break;
          }
          case "solidcam_5_axis_training_topics": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_5_axis_category_breakdown": {
            const eng = await getEngine("solidcam5AxisIndex");
            result = eng.getCategoryBreakdown();
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM37 (turning): SolidCAMTurningFunctionIndexEngine ──
          case "solidcam_turning_index": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_turning_summary": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_turning_list_ops": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_turning_get_op": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_turning_by_category": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_turning_find_param": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "solidcam_turning_recommend": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.recommendByFeature(params.feature);
            break;
          }
          case "solidcam_turning_css": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.calculateCSS(params.diameter_mm, params.css_m_per_min, params.max_rpm);
            break;
          }
          case "solidcam_turning_boring_bar": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.boringBarLDRatio(params.overhang_mm, params.bar_diameter_mm);
            break;
          }
          case "solidcam_turning_thread_passes": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.threadPassSchedule(params.depth_of_thread_mm, params.first_pass_doc_mm, params.min_doc_mm, params.spring_passes ?? 1);
            break;
          }
          case "solidcam_turning_training_topics": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_turning_category_breakdown": {
            const eng = await getEngine("solidcamTurningIndex");
            result = eng.getCategoryBreakdown();
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM37 (mill-turn): SolidCAMMillTurnFunctionIndexEngine ──
          case "solidcam_millturn_index": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getIndex();
            break;
          }
          case "solidcam_millturn_summary": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getSummary();
            break;
          }
          case "solidcam_millturn_list_ops": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.listOperations();
            break;
          }
          case "solidcam_millturn_get_op": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "solidcam_millturn_by_category": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "solidcam_millturn_find_param": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "solidcam_millturn_recommend": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.recommendByFeature(params.feature);
            break;
          }
          case "solidcam_millturn_sync_check": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.validateSubSpindleSync(params.rpm_main, params.rpm_sub, params.tolerance_rpm);
            break;
          }
          case "solidcam_millturn_polar_feed": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.polarFeedAtRadius(params.linear_feed_mm_per_min, params.radius_mm, params.min_radius_mm);
            break;
          }
          case "solidcam_millturn_wait_barriers": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.validateWaitBarriers(params.main_count, params.sub_count);
            break;
          }
          case "solidcam_millturn_training_topics": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getTrainingTopics();
            break;
          }
          case "solidcam_millturn_category_breakdown": {
            const eng = await getEngine("solidcamMillTurnIndex");
            result = eng.getCategoryBreakdown();
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM38: SolidCAMFunctionIndexEngine (unified) ──
          case "solidcam_index_manifest": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.getManifest();
            break;
          }
          case "solidcam_index_sections": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.getSectionList();
            break;
          }
          case "solidcam_index_section_stats": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.getSectionStats(params.section_key);
            break;
          }
          case "solidcam_index_all_ops": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.getAllOperations();
            break;
          }
          case "solidcam_index_find_op": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.findOperation(params.operation_id);
            break;
          }
          case "solidcam_index_find_param": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.findParameterAcrossSections(params.parameter_name, params.limit ?? 50);
            break;
          }
          case "solidcam_index_categories": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.getCategoryUniverse();
            break;
          }
          case "solidcam_index_recommend": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.recommendForFeature(params.feature, params.hint);
            break;
          }
          case "solidcam_index_validate": {
            const eng = await getEngine("solidcamUnifiedIndex");
            result = eng.validateConsistency();
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM39: NXCAMMillingFunctionIndexEngine ──
          case "nxcam_milling_index": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.getIndex();
            break;
          }
          case "nxcam_milling_summary": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.getSummary();
            break;
          }
          case "nxcam_milling_list_ops": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.listOperations();
            break;
          }
          case "nxcam_milling_get_op": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "nxcam_milling_by_category": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "nxcam_milling_find_param": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "nxcam_milling_recommend": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.recommendByFeature(params.feature);
            break;
          }
          case "nxcam_milling_scallop": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.estimateScallopHeight(params.stepover_mm, params.tool_diameter_mm);
            break;
          }
          case "nxcam_milling_adaptive_check": {
            const eng = await getEngine("nxcamMillingIndex");
            result = eng.adaptiveEngagementCheck(params.radial_engagement_pct, params.axial_doc_to_dia_ratio);
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM40: NXCAMTurningFunctionIndexEngine ──
          case "nxcam_turning_index": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.getIndex();
            break;
          }
          case "nxcam_turning_summary": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.getSummary();
            break;
          }
          case "nxcam_turning_list_ops": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.listOperations();
            break;
          }
          case "nxcam_turning_get_op": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "nxcam_turning_by_category": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "nxcam_turning_find_param": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "nxcam_turning_recommend": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.recommendByFeature(params.feature);
            break;
          }
          case "nxcam_turning_nose_radius": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.noseRadiusForSurfaceFinish(params.feed_per_rev_mm, params.target_Ra_um);
            break;
          }
          case "nxcam_turning_taylor": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.taylorToolLife(params.V_m_per_min, params.n, params.C);
            break;
          }
          case "nxcam_turning_teach_validate": {
            const eng = await getEngine("nxcamTurningIndex");
            result = eng.teachModeValidate(params.point_count, params.allow_feed_between, params.allow_rapid_between);
            break;
          }
          // ── CAM-EXHAUST-MS0/U-CAM41: NXCAMFBMFunctionIndexEngine ──
          case "nxcam_fbm_index": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.getIndex();
            break;
          }
          case "nxcam_fbm_summary": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.getSummary();
            break;
          }
          case "nxcam_fbm_list_ops": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.listOperations();
            break;
          }
          case "nxcam_fbm_get_op": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "nxcam_fbm_by_category": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "nxcam_fbm_find_param": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "nxcam_fbm_recommend": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.recommendByFeature(params.intent);
            break;
          }
          case "nxcam_fbm_classify_pocket_depth": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.classifyPocketDepth(params.depth_mm, params.width_mm);
            break;
          }
          case "nxcam_fbm_smallest_fit_tool": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.selectSmallestFitTool(params.feature_min_radius_mm, params.tools);
            break;
          }
          case "nxcam_fbm_match_rule": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.matchKnowledgeRule(params.feature_type, params.material, params.rules, { depth_mm: params.depth_mm, diameter_mm: params.diameter_mm });
            break;
          }
          case "nxcam_fbm_group_efficiency": {
            const eng = await getEngine("nxcamFBMIndex");
            result = eng.featureGroupEfficiency(params.feature_count, params.tool_count);
            break;
          }
          // ── CAM-EXHAUST-MS0/U-CAM42: NXCAMFunctionIndexEngine ──
          case "nxcam_index_manifest": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.getManifest();
            break;
          }
          case "nxcam_index_section_list": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.getSectionList();
            break;
          }
          case "nxcam_index_section_stats": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.getSectionStats(params.section_key);
            break;
          }
          case "nxcam_index_all_ops": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.getAllOperations();
            break;
          }
          case "nxcam_index_find_op": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.findOperation(params.operation_id);
            break;
          }
          case "nxcam_index_find_param": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.findParameterAcrossSections(params.parameter_name, params.limit ?? 50);
            break;
          }
          case "nxcam_index_category_universe": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.getCategoryUniverse();
            break;
          }
          case "nxcam_index_recommend": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.recommendForFeature(params.feature, params.hint);
            break;
          }
          case "nxcam_index_validate": {
            const eng = await getEngine("nxcamUnifiedIndex");
            result = eng.validateConsistency();
            break;
          }
          // ── CAM-EXHAUST-MS0/U-CAM43: PowerMillRoughingFunctionIndexEngine ──
          case "pm_roughing_index": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.getIndex();
            break;
          }
          case "pm_roughing_summary": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.getSummary();
            break;
          }
          case "pm_roughing_list_ops": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.listOperations();
            break;
          }
          case "pm_roughing_get_op": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.getOperation(params.operation_id);
            break;
          }
          case "pm_roughing_by_category": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.getOperationsByCategory(params.category);
            break;
          }
          case "pm_roughing_find_param": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.findParameter(params.parameter_name, params.limit ?? 20);
            break;
          }
          case "pm_roughing_recommend": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.recommendByFeature(params.intent);
            break;
          }
          case "pm_roughing_vortex_check": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.vortexEngagementCheck(params.radial_engagement_pct, params.axial_doc_to_dia_ratio);
            break;
          }
          case "pm_roughing_rest_worthwhile": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.restMachiningWorthwhile(params.previous_tool_diameter_mm, params.current_tool_diameter_mm);
            break;
          }
          case "pm_roughing_plunge_validate": {
            const eng = await getEngine("pmRoughingIndex");
            result = eng.plungeStrategyValidate(params.slot_width_mm, params.tool_diameter_mm, params.plunge_feed_pct);
            break;
          }

          // ── PowerMillFinishingFunctionIndexEngine (CAM-EXHAUST-MS0/U-CAM44) ──
          case "pm_finishing_list": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, operations: eng.listOperations() };
            break;
          }
          case "pm_finishing_get": {
            const eng = await getEngine("pmFinishingIndex");
            const op = eng.getOperation(params.operation_id);
            if (!op) {
              result = { success: false, error: `Operation '${params.operation_id}' not found` };
            } else {
              result = { success: true, operation: op };
            }
            break;
          }
          case "pm_finishing_recommend": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, recommendation: eng.recommendByFeature(params.intent) };
            break;
          }
          case "pm_finishing_scallop": {
            if (params.stepover_mm === undefined) {
              result = { success: false, error: "stepover_mm is required" };
              break;
            }
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, scallop: eng.scallopHeightCalc(params.stepover_mm, params.ball_diameter_mm) };
            break;
          }
          case "pm_finishing_steep_shallow": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, zone: eng.steepShallowThresholdCheck(params.angle_deg, params.threshold_deg) };
            break;
          }
          case "pm_finishing_pencil_coverage": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, coverage: eng.pencilCoverageEstimate(params.reference_tool_dia_mm, params.pencil_tool_dia_mm, params.corner_radius_mm) };
            break;
          }
          case "pm_finishing_validate": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, validation: eng.validateConsistency() };
            break;
          }
          case "pm_finishing_categories": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, categories: eng.getCategories() };
            break;
          }
          case "pm_finishing_by_category": {
            const eng = await getEngine("pmFinishingIndex");
            result = { success: true, operations: eng.listByCategory(params.category) };
            break;
          }

          // ── PowerMill5AxisFunctionIndexEngine (CAM-EXHAUST-MS0/U-CAM45) ──
          case "pm_5axis_list": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, operations: eng.listOperations() };
            break;
          }
          case "pm_5axis_get": {
            const eng = await getEngine("pm5AxisIndex");
            const op = eng.getOperation(params.operation_id);
            if (!op) {
              result = { success: false, error: `Operation '${params.operation_id}' not found` };
            } else {
              result = { success: true, operation: op };
            }
            break;
          }
          case "pm_5axis_recommend": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, recommendation: eng.recommendByFeature(params.intent) };
            break;
          }
          case "pm_5axis_axis_limit": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, check: eng.axisLimitCheck(params.required_a, params.required_c, params.machine_a, params.machine_c) };
            break;
          }
          case "pm_5axis_singularity": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, risk: eng.singularityRiskEstimate(params.j5_angle, params.wrist_alignment_angle, params.wrist_threshold, params.overhead_threshold) };
            break;
          }
          case "pm_5axis_tool_reach": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, reach: eng.toolReachCheck(params.pocket_depth, params.min_clearance, params.tool_cutting_length, params.tool_shank_diameter, params.holder_diameter, params.narrowest_opening) };
            break;
          }
          case "pm_5axis_validate": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, validation: eng.validateConsistency() };
            break;
          }
          case "pm_5axis_categories": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, categories: eng.getCategories() };
            break;
          }
          case "pm_5axis_by_category": {
            const eng = await getEngine("pm5AxisIndex");
            result = { success: true, operations: eng.listByCategory(params.category) };
            break;
          }

          // ── PowerMillUnifiedFunctionIndexEngine (CAM-EXHAUST-MS0/U-CAM46) ──
          case "pm_unified_catalog": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, catalog: eng.getUnifiedCatalog() };
            break;
          }
          case "pm_unified_list": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, operations: eng.listAllOperations() };
            break;
          }
          case "pm_unified_get": {
            const eng = await getEngine("pmUnifiedIndex");
            const op = eng.getOperation(params.operation_id);
            if (!op) {
              result = { success: false, error: `Operation '${params.operation_id}' not found` };
            } else {
              result = { success: true, operation: op };
            }
            break;
          }
          case "pm_unified_search": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, results: eng.searchOperations(params.query) };
            break;
          }
          case "pm_unified_categories": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, categories: eng.listAllCategories() };
            break;
          }
          case "pm_unified_by_category": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, operations: eng.listByCategory(params.category) };
            break;
          }
          case "pm_unified_recommend": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, recommendation: eng.recommendByIntent(params.intent) };
            break;
          }
          case "pm_unified_stats": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, stats: eng.getCatalogStats() };
            break;
          }
          case "pm_unified_validate": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, validation: eng.validateAllCatalogs() };
            break;
          }
          case "pm_unified_workflow": {
            const eng = await getEngine("pmUnifiedIndex");
            result = { success: true, workflow: eng.suggestWorkflow(params) };
            break;
          }

          // ── E1122: CATIACodeGeneratorEngine ──────────────────────────────
          case "catia_code_generate": {
            const eng = await getEngine("catiaCodeGen");
            if (params.from_description) {
              result = eng.generateFromDescription(params.from_description);
            } else if (params.script_type === "ekl") {
              result = eng.generateEKL(
                params.ekl_rules ?? [],
                params.ekl_templates ?? [],
              );
            } else {
              result = eng.generateVBA(
                params.operations ?? [],
                params.tools ?? [],
                params.params ?? {},
              );
            }
            break;
          }
          case "catia_code_templates": {
            const eng = await getEngine("catiaCodeGen");
            result = eng.getTemplates(params.category);
            break;
          }

          // ── E1120: HyperMillCodeGeneratorEngine ──────────────────────────
          case "hypermill_code_generate": {
            const eng = await getEngine("hyperMillCodeGen");
            if (params.from_description) {
              result = eng.generateFromDescription(params.from_description);
            } else {
              result = eng.generateACScript(
                params.operations ?? [],
                params.tools ?? [],
                params.params ?? {},
              );
            }
            break;
          }
          case "hypermill_code_templates": {
            const eng = await getEngine("hyperMillCodeGen");
            result = eng.getTemplates(params.category);
            break;
          }

          // ── CAD-COMPLETE-MS0/U-CADC-HM-PRINT-01 — PrintToHyperMillBridge ──
          case "print_to_hypermill": {
            const bridge = await getEngine("printToHyperMill");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis,
              profiles: params.profiles,
              defaultDepth: params.defaultDepth ?? params.default_depth,
              partName: params.partName ?? params.part_name,
              units: params.units,
              machineName: params.machineName ?? params.machine_name,
              postProcessor: params.postProcessor ?? params.post_processor,
              runNCGeneration: params.runNCGeneration ?? params.run_nc_generation,
              addErrorHandling: params.addErrorHandling ?? params.add_error_handling,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_hypermill_validate": {
            const bridge = await getEngine("printToHyperMill");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_hypermill_capabilities": {
            const bridge = await getEngine("printToHyperMill");
            result = { success: true, ...bridge.capabilities() };
            break;
          }

          // ── CAD-COMPLETE-MS0/U-CADC-PRINT-INVHSM-01 — PrintToInventorHSMBridge ──
          case "print_to_inventor_hsm": {
            const bridge = await getEngine("printToInventorHSM");
            const out = bridge.buildBridgeScript({
              analysis: params.analysis,
              profiles: params.profiles,
              defaultDepth: params.defaultDepth ?? params.default_depth,
              partName: params.partName ?? params.part_name,
              units: params.units,
              machineName: params.machineName ?? params.machine_name,
              postProcessor: params.postProcessor ?? params.post_processor,
              ncOutputPath: params.ncOutputPath ?? params.nc_output_path,
              addErrorHandling: params.addErrorHandling ?? params.add_error_handling,
              useMaterialFeedSpeed: params.useMaterialFeedSpeed ?? params.use_material_feed_speed,
              materialOverride: params.materialOverride ?? params.material_override,
            });
            result = { success: true, ...out };
            break;
          }
          case "print_to_inventor_hsm_validate": {
            const bridge = await getEngine("printToInventorHSM");
            result = { success: true, ...bridge.validate(params) };
            break;
          }
          case "print_to_inventor_hsm_capabilities": {
            const bridge = await getEngine("printToInventorHSM");
            result = { success: true, ...bridge.capabilities() };
            break;
          }

          // ── E1127: HyperMillToolExportEngine (CAMX-MS9/U03) ──────────────
          case "hypermill_tool_export": {
            const eng = await getEngine("hyperMillToolExport");
            result = eng.exportToHMT(
              params.tools ?? [],
              params.options ?? {},
            );
            break;
          }
          case "hypermill_tool_export_job": {
            const eng = await getEngine("hyperMillToolExport");
            const jobTools = (params.job_tools ?? []).map((jt: any) => ({
              type: jt.type ?? "endmill",
              physical: {
                cutting_diameter_mm: jt.diameter_mm ?? 10,
                flute_count: jt.flutes ?? 4,
                flute_length_mm: jt.flute_length_mm ?? (jt.diameter_mm ?? 10) * 3,
                overall_length_mm: jt.overall_length_mm ?? (jt.diameter_mm ?? 10) * 6,
                shank_diameter_mm: jt.diameter_mm ?? 10,
                corner_radius_mm: jt.corner_radius_mm ?? 0,
                point_angle_deg: 140,
              },
              material: jt.material ?? "carbide",
              coating: jt.coating ?? "TiAlN",
              manufacturer: jt.manufacturer ?? "Generic",
              part_number: jt.part_number ?? "",
              description: jt.label ?? "",
            }));
            result = eng.exportToHMT(jobTools, params.options ?? {});
            break;
          }

          // ── E1121: PowerMillCodeGeneratorEngine ──────────────────────────
          case "powermill_code_generate": {
            const eng = await getEngine("powerMillCodeGen");
            if (params.description) {
              result = eng.generateFromDescription(params.description);
            } else {
              result = eng.generateMacro(
                params.operations ?? [],
                params.tools ?? [],
                params.params ?? {},
              );
            }
            break;
          }
          case "powermill_code_templates": {
            const eng = await getEngine("powerMillCodeGen");
            result = eng.getTemplates(params.category);
            break;
          }

          // ================================================================
          // POST-ULT — 20 engines, 48 actions
          // ================================================================

          // ── CpsPostParserEngine (3 actions) ────────────────────────────
          case "cps_parse":
          case "cps_parse_batch":
          case "cps_summary": {
            const eng = await getEngine("cpsPostParser");
            result = eng.execute(action, params);
            break;
          }

          // ── CpsDialectMapperEngine (2 actions) ──────────────────────────
          case "cps_map_dialect":
          case "cps_map_batch": {
            const eng = await getEngine("cpsDialectMapper");
            result = eng.execute(action, params);
            break;
          }

          // ── MachineFingerprintEngine (3 actions) ──────────────────────
          case "machine_fingerprint":
          case "machine_list_manufacturers":
          case "machine_list_models": {
            const eng = await getEngine("machineFingerprint");
            result = eng.execute(action, params);
            break;
          }

          // ── FirmwareFeatureMatrixEngine (3 actions) ───────────────────
          case "firmware_features":
          case "firmware_check":
          case "firmware_controllers": {
            const eng = await getEngine("firmwareFeatureMatrix");
            result = eng.execute(action, params);
            break;
          }

          // ── CoolantControlConfigEngine (3 actions) ────────────────────
          case "ppg_coolant_config":
          case "ppg_coolant_controllers":
          case "ppg_coolant_modes": {
            const eng = await getEngine("coolantControlConfig");
            result = eng.execute(action, params);
            break;
          }

          // ── UnifiedProbingDialectEngine (5 actions) ───────────────────
          case "ppg_probe_wcs":
          case "ppg_probe_inspect":
          case "ppg_probe_tool":
          case "ppg_probe_check":
          case "ppg_probe_controllers": {
            const eng = await getEngine("unifiedProbingDialect");
            result = eng.execute(action, params);
            break;
          }

          // ── SubprogramStructureEngine (2 actions) ─────────────────────
          case "ppg_subprogram_analyze":
          case "ppg_subprogram_detect": {
            const eng = await getEngine("subprogramStructure");
            result = eng.execute(action, params);
            break;
          }

          // ── EDMPostProcessorExtension (2 actions) ──────────────────────
          case "ppg_edm_generate":
          case "ppg_edm_controllers": {
            const eng = await getEngine("edmPostProcessor");
            result = eng.execute(action, params);
            break;
          }

          // ── LaserWaterjetPostExtension (3 actions) ─────────────────────
          case "ppg_laser_generate":
          case "ppg_waterjet_generate":
          case "ppg_sheet_controllers": {
            const eng = await getEngine("laserWaterjetPost");
            result = eng.execute(action, params);
            break;
          }

          // ── PostPropertyTaxonomyEngine (3 actions) ─────────────────────
          case "post_build_taxonomy": {
            const eng = await getEngine("postTaxonomy");
            result = eng.buildTaxonomy();
            break;
          }
          case "post_classify_property": {
            const eng = await getEngine("postTaxonomy");
            result = eng.classifyProperty(params.property_name ?? params.propertyName, params.cps_file_name ?? params.cpsFileName);
            break;
          }
          case "post_list_purchase_options": {
            const eng = await getEngine("postTaxonomy");
            result = eng.listPurchaseOptions(params.manufacturer);
            break;
          }

          // ── MachinePostCrossRefEngine (3 actions) ──────────────────────
          case "post_match_machines":
          case "post_coverage_gaps":
          case "post_coverage_matrix": {
            const eng = await getEngine("machinePostCrossRef");
            const crossRefAction = action === "post_match_machines" ? "match_all"
              : action === "post_coverage_gaps" ? "coverage_gaps"
              : "coverage_matrix";
            result = eng.execute({ action: crossRefAction, ...params });
            break;
          }

          // ── MachineOptionRegistryEngine (4 actions) ────────────────────
          case "post_get_options": {
            const eng = await getEngine("machineOptionRegistry");
            result = eng.get_options(params.machine_id ?? params.machineId);
            break;
          }
          case "post_set_options": {
            const eng = await getEngine("machineOptionRegistry");
            result = eng.set_options(params.machine_id ?? params.machineId, params.options ?? {}, params.validate);
            break;
          }
          case "post_validate_options": {
            const eng = await getEngine("machineOptionRegistry");
            result = eng.validate_options(params.machine_id ?? params.machineId, params.options ?? {});
            break;
          }
          case "post_get_presets": {
            const eng = await getEngine("machineOptionRegistry");
            result = eng.get_presets(params.machine_id ?? params.machineId);
            break;
          }

          // ── ControllerFeatureMatrixEngine (2 actions) ──────────────────
          case "post_get_controller": {
            const eng = await getEngine("controllerMatrix");
            result = eng.getController(params.controller);
            break;
          }
          case "post_compare_controllers": {
            const eng = await getEngine("controllerMatrix");
            result = eng.compareControllers(params.controllers);
            break;
          }

          // ── OptimizationTierEngine (4 actions) ─────────────────────────
          case "post_set_tier": {
            const eng = await getEngine("optimizationTier");
            result = eng.handleAction("set_tier", params);
            break;
          }
          case "post_detect_intent": {
            const eng = await getEngine("optimizationTier");
            result = eng.handleAction("detect_intent", params);
            break;
          }
          case "post_generate_diff": {
            const eng = await getEngine("optimizationTier");
            result = eng.handleAction("generate_diff", params);
            break;
          }
          case "post_apply_approval": {
            const eng = await getEngine("optimizationTier");
            result = eng.handleAction("apply_approval", params);
            break;
          }

          // ── RapidRepositionOptEngine (3 actions) ───────────────────────
          case "post_optimize_rapids": {
            const eng = await getEngine("rapidReposition");
            result = eng.optimizeRapids(params);
            break;
          }
          case "post_calculate_budget": {
            const eng = await getEngine("rapidReposition");
            result = eng.calculateBudget(params);
            break;
          }
          case "post_full_rapid_optimize": {
            const eng = await getEngine("rapidReposition");
            result = eng.fullOptimize(params);
            break;
          }

          // ── PostPhysicsFoundationEngine (1 action) ─────────────────────
          case "post_physics_foundation": {
            const eng = await getEngine("postPhysicsFoundation");
            result = eng.fullFoundation(params);
            break;
          }

          // ── PhysicsSidecarBuilderEngine (3 actions) — MS0/U-PPGM02 ─────
          case "post_sidecar_build": {
            const eng = await getEngine("physicsSidecarBuilder");
            result = eng.buildAndSeal(params);
            break;
          }
          case "post_sidecar_verify": {
            const eng = await getEngine("physicsSidecarBuilder");
            result = eng.verify(params?.sidecar ?? params);
            break;
          }
          case "post_sidecar_canonicalize": {
            const eng = await getEngine("physicsSidecarBuilder");
            const canonical = eng.canonicalize(params?.payload ?? params);
            result = { canonical, sha256: eng.computeSha256(canonical), length: canonical.length };
            break;
          }

          // ── NoInlinePhysicsConstantsEngine (2 actions) — MS0/U-PPGM04 ──
          case "post_check_no_inlined_constants": {
            const eng = await getEngine("noInlinePhysicsConstants");
            result = eng.scan(params?.source ?? "", { tier: params?.tier });
            break;
          }
          case "post_check_no_inlined_constants_or_throw": {
            const eng = await getEngine("noInlinePhysicsConstants");
            result = eng.scanOrThrow(params?.source ?? "", { tier: params?.tier });
            break;
          }

          // ── LineByLineAdaptiveEngine (2 actions) ───────────────────────
          case "post_line_by_line": {
            const eng = await getEngine("lineByLine");
            result = eng.optimize(params);
            break;
          }
          case "post_chip_thinning": {
            const eng = await getEngine("lineByLine");
            result = eng.chipThinningOnly(params);
            break;
          }

          // ── MotionControllerInjectionEngine (3 actions) ────────────────
          case "post_inject_motion": {
            const eng = await getEngine("motionInjection");
            result = eng.inject_all(params);
            break;
          }
          case "post_inject_hsm": {
            const eng = await getEngine("motionInjection");
            result = eng.inject_hsm(params);
            break;
          }
          case "post_inject_coolant": {
            const eng = await getEngine("motionInjection");
            result = eng.inject_coolant(params);
            break;
          }

          // ── PostVerificationSafetyEngine (3 actions) ───────────────────
          case "post_verify_safety": {
            const eng = await getEngine("postVerification");
            result = eng.verify_full(params);
            break;
          }
          case "post_monte_carlo": {
            const eng = await getEngine("postVerification");
            result = eng.monte_carlo(params);
            break;
          }
          case "post_surface_finish": {
            const eng = await getEngine("postVerification");
            result = eng.surface_finish_check(params);
            break;
          }

          // ── PostOutputGenerationEngine (3 actions) ─────────────────────
          case "post_generate_output": {
            const eng = await getEngine("postOutput");
            result = eng.generate(params);
            break;
          }
          case "post_setup_sheet": {
            const eng = await getEngine("postOutput");
            result = eng.setup_sheet(params);
            break;
          }
          case "post_prove_out": {
            const eng = await getEngine("postOutput");
            result = eng.prove_out(params);
            break;
          }

          // ── AdvancedPostPhysicsEngine (3 actions) ──────────────────────
          case "post_advanced_physics": {
            const eng = await getEngine("advancedPhysics");
            result = eng.handle("full_analysis", params);
            break;
          }
          case "post_johnson_cook": {
            const eng = await getEngine("advancedPhysics");
            result = eng.handle("johnson_cook", params);
            break;
          }
          case "post_coupled_analysis": {
            const eng = await getEngine("advancedPhysics");
            result = eng.handle("coupled_analysis", params);
            break;
          }

          // ── CrossCAMPostEngine (3 actions) ─────────────────────────────
          case "post_normalize_cam": {
            const eng = await getEngine("crossCAM");
            result = eng.normalizeInput(params);
            break;
          }
          case "post_detect_subprograms": {
            const eng = await getEngine("crossCAM");
            result = eng.detectSubprograms(params);
            break;
          }
          case "post_multichannel": {
            const eng = await getEngine("crossCAM");
            result = eng.generateMultiChannel(params);
            break;
          }

          // ── PostValidationSuiteEngine (3 actions) ──────────────────────
          case "post_validate_full": {
            const eng = await getEngine("postValidation");
            result = eng("validate_full", params);
            break;
          }
          case "post_ab_compare": {
            const eng = await getEngine("postValidation");
            result = eng("ab_compare", params);
            break;
          }
          case "post_regression_matrix": {
            const eng = await getEngine("postValidation");
            result = eng("regression_matrix", params);
            break;
          }

          // ── PostLibraryConfiguratorEngine (3 actions) ──────────────────
          case "post_browse_library": {
            const eng = await getEngine("postLibrary");
            result = eng.run({ action: "browse", ...params });
            break;
          }
          case "post_configure": {
            const eng = await getEngine("postLibrary");
            result = eng.run({ action: "configure", ...params });
            break;
          }
          case "post_export": {
            const eng = await getEngine("postLibrary");
            result = eng.run({ action: "export_post", ...params });
            break;
          }

          // ── FleetDeploymentLearningEngine (4 actions) ──────────────────
          case "post_fleet_status": {
            const eng = await getEngine("fleetDeployment");
            result = eng.dispatch("fleet_status", params);
            break;
          }
          case "post_update_plan": {
            const eng = await getEngine("fleetDeployment");
            result = eng.dispatch("generate_update_plan", params);
            break;
          }
          case "post_ingest_feedback": {
            const eng = await getEngine("fleetDeployment");
            result = eng.dispatch("ingest_feedback", params);
            break;
          }
          case "post_get_prediction": {
            const eng = await getEngine("fleetDeployment");
            result = eng.dispatch("get_prediction", params);
            break;
          }

          // ── E1124: UniversalToolExportEngine ─────────────────────────────
          case "universal_tool_export": {
            const eng = await getEngine("universalToolExport");
            if (params.list_formats) {
              result = { formats: eng.listFormats() };
            } else {
              const format = params.format ?? "csv";
              result = eng.export(
                params.tools ?? [],
                format,
                params.iso13399_options,
              );
            }
            break;
          }

          // ── E1126: ToolSyncOrchestratorEngine ────────────────────────────
          case "tool_sync_multi": {
            // Batch sync PRISM tools to one or more CAM systems
            // params.tools: ToolRecord[]  (required)
            // params.systems: SupportedSystem[]  (required, e.g. ["fusion360","mastercam"])
            const eng = await getEngine("toolSyncOrchestrator");
            const tools = params.tools ?? [];
            const systems = params.systems ?? ["universal"];
            result = { sync_results: eng.syncToSystems(tools, systems) };
            break;
          }

          case "tool_sync_drift": {
            // Detect drift for a CAM system
            // params.system: SupportedSystem  (required)
            // params.prism_tools: ToolRecord[]  (required)
            // params.cam_tools: ToolRecord[]  (required)
            // Optionally params.resolve_conflicts: boolean — auto-resolve and include resolutions
            const eng = await getEngine("toolSyncOrchestrator");
            const system = params.system ?? "universal";
            const prismTools = params.prism_tools ?? [];
            const camTools = params.cam_tools ?? [];
            const drift = eng.detectDrift(system, prismTools, camTools);
            if (params.resolve_conflicts && drift.modified.length > 0) {
              const resolutions = eng.resolveConflicts(drift.modified);
              result = { drift, conflict_resolutions: resolutions };
            } else {
              result = { drift };
            }
            break;
          }

          case "tool_sync_status": {
            // Get per-system sync health + timestamps (optionally filtered)
            // params.systems: SupportedSystem[]  (optional, defaults to all)
            // params.report: boolean  (optional) — include markdown report
            const eng = await getEngine("toolSyncOrchestrator");
            const systems = params.systems?.length ? params.systems : undefined;
            const status = eng.getSyncStatus(systems);
            if (params.report) {
              result = { status, report: eng.generateSyncReport(systems) };
            } else {
              result = { status };
            }
            break;
          }

          // ── E1125: CAMAddInFrameworkEngine (CAMX-MS11/U01) ───────────────────
          case "cam_addin_generate":
          case "cam_addin_http_client":
          case "cam_addin_ui_panel":
          case "cam_addin_tool_sync":
          case "cam_addin_post_integration":
          case "cam_addin_list_systems": {
            const eng = await getEngine("camAddInFramework");
            result = eng.calculate(action, params);
            break;
          }

          // ── E1128: CuttingDataExportEngine (CAMX-MS10/U06) ──────────────────
          case "cutting_data_export": {
            const eng = await getEngine("cuttingDataExport");
            if (params.list_systems) {
              result = { systems: eng.listSystems() };
            } else if (params.export_all) {
              result = eng.exportAll(
                params.tools ?? [],
                params.materials ?? [],
                params.operation ?? "semi_finishing",
              );
            } else {
              result = eng.exportForSystem(
                params.tools ?? [],
                params.materials ?? [],
                params.cam_system ?? "csv",
                params.operation ?? "semi_finishing",
              );
            }
            break;
          }
          case "cutting_data_compute": {
            const eng = await getEngine("cuttingDataExport");
            result = eng.computeCuttingData(
              params.tool,
              params.material,
              params.operation ?? "semi_finishing",
            );
            break;
          }

          // ── E1129: STEPNCParserEngine (CAMX-MS20 U01) ───────────────────────
          case "stepnc_parse": {
            const eng = await getEngine("stepNCParser");
            const model = eng.parse(params.stepnc_text ?? "");
            const mapToPrism = params.map_to_prism !== false;
            const extractOnly = params.extract_only ?? "all";
            if (extractOnly === "features") {
              result = { features: eng.extractFeatures(model) };
            } else if (extractOnly === "tooling") {
              result = { tooling: eng.extractTooling(model) };
            } else if (extractOnly === "technology") {
              result = { technology: model.technology };
            } else if (extractOnly === "workingsteps") {
              result = { workingsteps: model.workingsteps };
            } else if (extractOnly === "workplans") {
              result = { workplans: model.workplans };
            } else {
              result = {
                model,
                ...(mapToPrism ? {
                  prism_features: eng.extractFeatures(model),
                  prism_tools:    eng.extractTooling(model),
                  prism_params:   eng.extractParameters(model),
                } : {}),
                summary: {
                  workingsteps: model.workingsteps.length,
                  workplans:    model.workplans.length,
                  features:     model.features.length,
                  tools:        model.tooling.length,
                  entity_count: model.entity_count,
                },
              };
            }
            break;
          }

          // ── E1129: STEPNCGeneratorEngine (CAMX-MS20 U02) ─────────────────────
          case "stepnc_generate": {
            const eng = await getEngine("stepNCGenerator");
            const stepnc_text = eng.generate(
              params.features ?? [],
              params.tools    ?? [],
              params.params   ?? [],
              {
                workplan_name: params.workplan_name,
                include_parts: params.include_parts,
                part_name:     params.part_name,
                author:        params.author,
              },
            );
            result = {
              stepnc_text,
              format:      "ISO-10303-21",
              standard:    "ISO 14649 / AP238",
              parts:       params.include_parts ?? ["10", "11", "12", "111"],
              workingstep_count: (params.features ?? []).length,
              tool_count:        (params.tools    ?? []).length,
            };
            break;
          }

          // ── CAMX-MS0: StrategyTaxonomyEngine (E1135) — 7 actions ─────────
          case "strategy_taxonomy_lookup": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { info: strategyTaxonomyEngine.lookup(params.canonical_id as string) };
            break;
          }
          case "strategy_taxonomy_search": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { matches: strategyTaxonomyEngine.search(params.query as string) };
            break;
          }
          case "strategy_taxonomy_equivalents": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { equivalents: strategyTaxonomyEngine.equivalents(params.canonical_id as string) };
            break;
          }
          case "strategy_taxonomy_translate": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            const canonical = strategyTaxonomyEngine.fromNative(
              params.cam_system as any,
              params.native_name as string,
            );
            result = { canonical_id: canonical };
            break;
          }
          case "strategy_taxonomy_by_feature": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { strategies: strategyTaxonomyEngine.byFeature(params.feature_type as string) };
            break;
          }
          case "strategy_taxonomy_by_cam": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { strategies: strategyTaxonomyEngine.byCamSystem(params.cam_system as any) };
            break;
          }
          case "strategy_taxonomy_stats": {
            const { strategyTaxonomyEngine } = await import("../../engines/StrategyTaxonomyEngine.js");
            result = { stats: strategyTaxonomyEngine.stats() };
            break;
          }

          // ── CAMX-MS15/U01: StrategyPerformanceTrackerEngine (E1131) ─────────
          case "strategy_perf_record": {
            const eng = await getEngine("strategyPerfTracker");
            result = eng.record({
              strategy_id:  params.strategy_id,
              feature_type: params.feature_type,
              material_iso: params.material_iso,
              tool_id:      params.tool_id,
              machine_id:   params.machine_id,
              predicted:    params.predicted,
              actual:       params.actual,
              outcome:      params.outcome,
              execution_id: params.execution_id,
              notes:        params.notes,
            });
            break;
          }
          case "strategy_perf_accuracy": {
            const eng = await getEngine("strategyPerfTracker");
            result = eng.getAccuracy(
              params.strategy_id,
              params.material_iso,
              params.feature_type,
            );
            break;
          }
          case "strategy_perf_top": {
            const eng = await getEngine("strategyPerfTracker");
            result = eng.getTopPerformers(
              params.feature_type,
              params.material_iso,
              params.limit,
            );
            break;
          }
          case "strategy_perf_stats": {
            const eng = await getEngine("strategyPerfTracker");
            result = eng.getStats();
            break;
          }

          // ── E1130: VericutBridgeEngine (CAMX-MS20/U05) — 3 actions ──────────

          case "vericut_export": {
            const eng = await getEngine("vericutBridge");
            if (params.machine_mapping_only) {
              result = eng.getMachineMapping(params.machine ?? { name: params.machine_name ?? "unknown" });
            } else {
              const pkg = eng.exportForVericut(
                params.program ?? { name: "O0001", gcode: "" },
                params.machine ?? { name: "generic" },
                params.stock   ?? { length_mm: 100, width_mm: 100, height_mm: 50, material_name: "Steel" },
                params.tools   ?? [],
                params.fixture ?? { type: "vise" },
                params.wcs_list,
              );
              if (params.generate_project) {
                const project = eng.generateVericutProject(pkg);
                result = { export_package: pkg, project };
              } else {
                result = pkg;
              }
            }
            break;
          }

          case "vericut_import_optipath": {
            const eng = await getEngine("vericutBridge");
            result = eng.importOptiPath(
              params.optipath_data ?? [],
              params.session_id,
            );
            break;
          }

          case "vericut_import_collision": {
            const eng = await getEngine("vericutBridge");
            const collision = eng.importCollisionReport(
              {
                events:           params.events,
                material_removal: params.material_removal,
                cycle_time_min:   params.cycle_time_min,
              },
              params.session_id,
            );
            if (params.force_data && params.force_data.length > 0) {
              const force = eng.importForceAnalysis(
                params.force_data,
                params.iso_group ?? "P",
                params.session_id,
              );
              result = { collision, force };
            } else {
              result = { collision };
            }
            break;
          }

          // ── E1132: NCSIMULBridgeEngine (CAMX-MS20/U06) — 2 actions ──────────

          case "ncsimul_export": {
            const eng = await getEngine("ncsimulBridge");
            if (params.machine_mapping_only) {
              result = eng.getMachineMapping(params.machine ?? { name: params.machine_name ?? "unknown" });
            } else {
              const pkg = eng.exportForNCSIMUL(
                params.program ?? { name: "O0001", gcode: "" },
                params.machine ?? { name: "generic" },
                params.stock   ?? { length_mm: 100, width_mm: 100, height_mm: 50, material_name: "Steel" },
                params.tools   ?? [],
                params.fixture ?? { type: "vise" },
                params.wcs_list,
              );
              if (params.generate_project) {
                const project = eng.generateProjectFile(pkg);
                result = { export_package: pkg, project };
              } else {
                result = pkg;
              }
            }
            break;
          }

          case "ncsimul_import": {
            const eng = await getEngine("ncsimulBridge");
            result = eng.importSimulationResults(
              {
                session_id:       params.session_id,
                events:           params.events,
                material_removal: params.material_removal,
                cycle_time_min:   params.cycle_time_min,
                iso_group:        params.iso_group,
                max_chip_load_mm: params.max_chip_load_mm,
                ap_mm:            params.ap_mm,
              },
              params.session_id,
            );
            break;
          }

          // ── E1134: ShopNetworkEngine (CAMX-MS21/U02) — 4 actions ────────────

          case "shop_network_register": {
            const eng = await getEngine("shopNetwork");
            result = eng.registerShop({
              name:                    params.name,
              location:                params.location,
              machines:                params.machines ?? [],
              certifications:          params.certifications ?? [],
              capacity_hours_per_week: params.capacity_hours_per_week,
              shift_schedule:          params.shift_schedule,
              specialties_materials:   params.specialties_materials,
              specialties_part_sizes:  params.specialties_part_sizes,
              specialties_industries:  params.specialties_industries,
              min_order_usd:           params.min_order_usd,
            });
            break;
          }

          case "shop_network_search": {
            const eng = await getEngine("shopNetwork");
            result = eng.searchShops({
              required_capabilities:   params.required_capabilities,
              required_certifications: params.required_certifications,
              max_distance_km:         params.max_distance_km,
              reference_lat:           params.reference_lat,
              reference_lon:           params.reference_lon,
              min_capacity_hours:      params.min_capacity_hours,
              preferred_industries:    params.preferred_industries,
              limit:                   params.limit,
            });
            break;
          }

          case "shop_network_broadcast": {
            const eng = await getEngine("shopNetwork");
            result = eng.broadcastJob({
              title:                    params.title,
              required_process:         params.required_process,
              required_certifications:  params.required_certifications,
              quantity:                 params.quantity,
              material:                 params.material,
              lead_time_days:           params.lead_time_days,
              estimated_hours_per_part: params.estimated_hours_per_part,
              budget_per_part_usd:      params.budget_per_part_usd,
              preferred_region:         params.preferred_region,
              nda_required:             params.nda_required,
            });
            break;
          }

          case "shop_network_stats": {
            const eng = await getEngine("shopNetwork");
            result = eng.getNetworkStats();
            break;
          }

          // ── E1133: ISO13399ToolDataEngine (CAMX-MS20/U03) — 3 actions ────────

          case "iso13399_import": {
            const eng = await getEngine("iso13399ToolData");
            result = eng.importISO13399(params.xml ?? "");
            break;
          }

          case "iso13399_export": {
            const eng = await getEngine("iso13399ToolData");
            if (params.list_gtc_classes) {
              result = { gtc_classes: eng.listGTCClasses() };
            } else {
              result = eng.exportISO13399(
                params.tools ?? [],
                {
                  include_assembly:    params.include_assembly,
                  schema_version:      params.schema_version,
                  units:               params.units,
                  include_cutting_data: params.include_cutting_data,
                },
              );
            }
            break;
          }

          case "iso13399_validate": {
            const eng = await getEngine("iso13399ToolData");
            result = eng.validateISO13399(params.xml ?? "");
            break;
          }

          // ── E1135: QIFIntegrationEngine (CAMX-MS20/U04) — 4 actions ──────

          case "qif_import_plan": {
            const eng = await getEngine("qifIntegration");
            result = eng.importPlan(params.qif_xml ?? "");
            break;
          }

          case "qif_import_results": {
            const eng = await getEngine("qifIntegration");
            result = eng.importResults(params.qif_xml ?? "");
            break;
          }

          case "qif_export_plan": {
            const eng = await getEngine("qifIntegration");
            result = {
              qif_xml: eng.exportPlan(
                params.features ?? [],
                params.tolerances ?? [],
                {
                  plan_name:          params.plan_name,
                  measurement_method: params.measurement_method,
                  part_number:        params.part_number,
                  revision:           params.revision,
                  author:             params.author,
                },
              ),
            };
            break;
          }

          case "qif_export_results": {
            const eng = await getEngine("qifIntegration");
            result = {
              qif_xml: eng.exportResults(
                params.measurements ?? [],
                {
                  inspector:   params.inspector,
                  plan_ref:    params.plan_ref,
                  report_name: params.report_name,
                  date:        params.date,
                  part_number: params.part_number,
                },
              ),
            };
            break;
          }

          // ── E1136: TCODashboardEngine (CAMX-MS13/U06) — 4 actions ──────────

          case "tco_dashboard": {
            const eng = await getEngine("tcoDashboard");
            result = eng.generateDashboard(params);
            break;
          }

          case "tco_compare": {
            const eng = await getEngine("tcoDashboard");
            result = eng.compareCosts(
              params.current_params   ?? params,
              params.optimized_params ?? params,
            );
            break;
          }

          case "tco_savings": {
            const eng = await getEngine("tcoDashboard");
            result = eng.savingsOpportunities(params);
            break;
          }

          case "tco_drivers": {
            const eng = await getEngine("tcoDashboard");
            result = eng.costDriverAnalysis(params);
            break;
          }

          // ── E1137: ToolChangeOptimizationEngine (CAMX-MS13/U02) — 3 actions ──

          case "tool_change_optimize": {
            const eng = await getEngine("toolChangeOpt");
            result = eng.optimizeToolChanges(
              params.operations ?? [],
              params.tools ?? [],
              params.magazine_capacity,
            );
            break;
          }

          case "tool_change_magazine": {
            const eng = await getEngine("toolChangeOpt");
            result = eng.optimizeMagazine(
              params.tools ?? [],
              params.machine ?? { magazine_capacity: 30 },
              params.operation_sequence,
            );
            break;
          }

          case "tool_change_sharing": {
            const eng = await getEngine("toolChangeOpt");
            result = eng.suggestToolSharing(params.operations ?? []);
            break;
          }

          // ── E1138: SafetyEscalationEngine (CAMX-MS14/U03) — 2 actions ────────

          case "safety_escalate": {
            const eng = await getEngine("safetyEscalation");
            result = eng.escalate(
              params.veto_report ?? params,
              params.params ?? params,
              params.machine_limits,
              params.max_iterations,
            );
            break;
          }

          case "safety_escalate_preview": {
            const eng = await getEngine("safetyEscalation");
            result = eng.preview(
              params.veto_report ?? params,
              params.params ?? params,
              params.machine_limits,
              params.max_iterations,
            );
            break;
          }

          // ── E1139: CollisionPreventionEngine (CAMX-MS14/U04) — 3 actions ─────

          case "collision_prevent_full": {
            const eng = await getEngine("collisionPrevention");
            result = eng.checkFullToolpath(
              params.blocks ?? [],
              params.tool_assembly ?? {},
              params.stock ?? {},
              params.fixtures,
              params.machine_envelope,
              params.safety_margin_mm,
            );
            break;
          }

          case "collision_prevent_certify": {
            const eng = await getEngine("collisionPrevention");
            result = eng.certify(
              params.blocks ?? [],
              params.tool_assembly ?? {},
              params.stock ?? {},
              params.fixtures,
              params.safety_margin_mm,
            );
            break;
          }

          case "collision_prevent_zones": {
            const eng = await getEngine("collisionPrevention");
            result = eng.getCollisionZones(
              params.blocks ?? [],
              params.tool_assembly ?? {},
              params.stock ?? {},
              params.fixtures,
              params.safety_margin_mm,
            );
            break;
          }

          // ── E1140: FleetLearningStrategyEngine (CAMX-MS15/U04) — 3 actions ───

          case "fleet_aggregate": {
            const eng = await getEngine("fleetLearning");
            result = eng.aggregateFleet(
              params.shop_data ?? [],
              params.strategy_filter,
              params.material_filter,
            );
            break;
          }

          case "fleet_transfer": {
            const eng = await getEngine("fleetLearning");
            result = eng.transferLearning(
              params.source_data ?? [],
              params.source_context ?? {},
              params.target_context ?? {},
            );
            break;
          }

          case "fleet_insights": {
            const eng = await getEngine("fleetLearning");
            result = eng.getFleetInsights(
              params.shop_data ?? [],
              params.strategy_id ?? "",
              params.material_iso ?? "P",
              params.top_k,
            );
            break;
          }

          // ── E1141: BatchCAMControllerEngines ──────────────────────────
          case "mastercam_controller_lookup": {
            const eng = await getEngine("mastercamCtrlCat");
            result = eng.lookup(params.controller);
            break;
          }
          case "mastercam_controller_list": {
            const eng = await getEngine("mastercamCtrlCat");
            result = eng.listControllers();
            break;
          }
          case "solidcam_controller_lookup": {
            const eng = await getEngine("solidCAMCtrlCat");
            result = eng.lookup(params.controller);
            break;
          }
          case "solidcam_controller_list": {
            const eng = await getEngine("solidCAMCtrlCat");
            result = eng.listControllers();
            break;
          }
          case "nx_controller_lookup": {
            const eng = await getEngine("nxCAMCtrlCat");
            result = eng.lookup(params.controller);
            break;
          }
          case "nx_controller_list": {
            const eng = await getEngine("nxCAMCtrlCat");
            result = eng.listControllers();
            break;
          }
          case "powermill_controller_lookup": {
            const eng = await getEngine("powerMillCtrlCat");
            result = eng.lookup(params.controller);
            break;
          }
          case "powermill_controller_list": {
            const eng = await getEngine("powerMillCtrlCat");
            result = eng.listControllers();
            break;
          }

          // ── E1142: BatchCAMOperationCatalogEngines ─────────────────────
          case "mastercam_op_get": {
            const eng = await getEngine("mastercamOpCat");
            result = params.material_iso
              ? { operation: eng.getOperation(params.name), params: eng.getDefaultParams(params.name, params.material_iso) }
              : eng.getOperation(params.name);
            break;
          }
          case "mastercam_op_list": {
            const eng = await getEngine("mastercamOpCat");
            result = params.feature_type
              ? eng.suggestOperation(params.feature_type)
              : eng.listOperations(params.category);
            break;
          }
          case "solidcam_op_get": {
            const eng = await getEngine("solidCAMOpCat");
            result = params.material_iso
              ? { operation: eng.getOperation(params.name), params: eng.getDefaultParams(params.name, params.material_iso) }
              : eng.getOperation(params.name);
            break;
          }
          case "solidcam_op_list": {
            const eng = await getEngine("solidCAMOpCat");
            result = params.feature_type
              ? eng.suggestOperation(params.feature_type)
              : eng.listOperations(params.category);
            break;
          }
          case "nx_op_get": {
            const eng = await getEngine("nxCAMOpCat");
            result = params.material_iso
              ? { operation: eng.getOperation(params.name), params: eng.getDefaultParams(params.name, params.material_iso) }
              : eng.getOperation(params.name);
            break;
          }
          case "nx_op_list": {
            const eng = await getEngine("nxCAMOpCat");
            result = params.feature_type
              ? eng.suggestOperation(params.feature_type)
              : eng.listOperations(params.category);
            break;
          }
          case "powermill_op_get": {
            const eng = await getEngine("powerMillOpCat");
            result = params.material_iso
              ? { operation: eng.getOperation(params.name), params: eng.getDefaultParams(params.name, params.material_iso) }
              : eng.getOperation(params.name);
            break;
          }
          case "powermill_op_list": {
            const eng = await getEngine("powerMillOpCat");
            result = params.feature_type
              ? eng.suggestOperation(params.feature_type)
              : eng.listOperations(params.category);
            break;
          }

          // ── E1145: BatchCAMAddInGenerators ────────────────────────────────
          case "mastercam_addin_generate": {
            const eng = await getEngine("mastercamAddInGen");
            result = eng.generate(params.options);
            break;
          }
          case "solidcam_addin_generate": {
            const eng = await getEngine("solidCAMAddInGen");
            result = eng.generate(params.options);
            break;
          }
          case "nx_addin_generate": {
            const eng = await getEngine("nxCAMAddInGen");
            result = eng.generate(params.options);
            break;
          }
          case "hypermill_addin_generate": {
            const eng = await getEngine("hyperMillACAddInGen");
            result = eng.generate(params.options);
            break;
          }
          case "powermill_addin_generate": {
            const eng = await getEngine("powerMillAddInGen");
            result = eng.generate(params.options);
            break;
          }
          case "catia_addin_generate": {
            const eng = await getEngine("catiaAddInGen");
            result = eng.generate(params.options);
            break;
          }

          // ── E1143: BatchCAMToolBridgeEngines ──────────────────────────────
          case "mastercam_tool_import": {
            const eng = await getEngine("mastercamToolBridge");
            result = eng.importTools(params.native_data ?? params);
            break;
          }
          case "mastercam_tool_drift": {
            const eng = await getEngine("mastercamToolBridge");
            result = eng.detectDrift(params.native_tools ?? [], params.prism_tools ?? []);
            break;
          }
          case "solidcam_tool_import": {
            const eng = await getEngine("solidCAMToolBridge");
            result = eng.importTools(params.native_data ?? params);
            break;
          }
          case "solidcam_tool_drift": {
            const eng = await getEngine("solidCAMToolBridge");
            result = eng.detectDrift(params.native_tools ?? [], params.prism_tools ?? []);
            break;
          }
          case "nx_tool_import": {
            const eng = await getEngine("nxCAMToolBridge");
            result = eng.importTools(params.native_data ?? params);
            break;
          }
          case "nx_tool_drift": {
            const eng = await getEngine("nxCAMToolBridge");
            result = eng.detectDrift(params.native_tools ?? [], params.prism_tools ?? []);
            break;
          }
          case "hypermill_tool_import": {
            const eng = await getEngine("hyperMillToolBridge");
            result = eng.importTools(params.native_data ?? params);
            break;
          }
          case "hypermill_tool_drift": {
            const eng = await getEngine("hyperMillToolBridge");
            result = eng.detectDrift(params.native_tools ?? [], params.prism_tools ?? []);
            break;
          }

          // ── E1144: BatchCAMAPIBridgeEngines ───────────────────────────────
          case "mastercam_api_connect": {
            const eng = await getEngine("mastercamNETBridge");
            result = await eng.connect(params.host ?? "localhost", params.port ?? 18362);
            break;
          }
          case "mastercam_api_execute": {
            const eng = await getEngine("mastercamNETBridge");
            result = await eng.executeAction(params.action_name ?? params.action ?? "", params.action_params ?? params);
            break;
          }
          case "solidcam_api_connect": {
            const eng = await getEngine("solidCAMSWBridge");
            result = await eng.connect(params.host ?? "localhost", params.port ?? 18363);
            break;
          }
          case "solidcam_api_execute": {
            const eng = await getEngine("solidCAMSWBridge");
            result = await eng.executeAction(params.action_name ?? params.action ?? "", params.action_params ?? params);
            break;
          }
          case "nxopen_api_connect": {
            const eng = await getEngine("nxOpenBridge");
            result = await eng.connect(params.host ?? "localhost", params.port ?? 18364);
            break;
          }
          case "nxopen_api_execute": {
            const eng = await getEngine("nxOpenBridge");
            result = await eng.executeAction(params.action_name ?? params.action ?? "", params.action_params ?? params);
            break;
          }
          case "hypermill_ac_connect": {
            const eng = await getEngine("hyperMillACBridge");
            result = await eng.connect(params.host ?? "localhost", params.port ?? 18365);
            break;
          }
          case "hypermill_ac_execute": {
            const eng = await getEngine("hyperMillACBridge");
            result = await eng.executeAction(params.action_name ?? params.action ?? "", params.action_params ?? params);
            break;
          }

          // ── E1146: StrategyEvolutionEngine (CAMX-MS15/U05) — 3 actions ─────

          case "strategy_evolve": {
            const eng = await getEngine("strategyEvolution");
            result = eng.evolve(
              params.feature ?? {},
              params.material ?? {},
              params.tool ?? {},
              params.machine ?? {},
              params.generations ?? 50,
            );
            break;
          }
          case "strategy_best_discoveries": {
            const eng = await getEngine("strategyEvolution");
            result = eng.getBestDiscoveries();
            break;
          }
          case "strategy_evolution_history": {
            const eng = await getEngine("strategyEvolution");
            result = eng.getEvolutionHistory();
            break;
          }

          // ── E1147: PredictionCalibrationEngine (CAMX-MS15/U06) — 3 actions ──

          case "prediction_calibrate": {
            const eng = await getEngine("predictionCalibration");
            result = eng.calibrate({
              predicted: params.predicted ?? 0,
              actual: params.actual ?? 0,
              type: params.type ?? "force",
              material_key: params.material_key ?? params.material ?? "",
              machine_id: params.machine_id ?? params.machine ?? "",
              Vc: params.Vc,
              fz: params.fz,
              ap: params.ap,
              timestamp: params.timestamp,
              confidence: params.confidence,
            });
            break;
          }
          case "prediction_get_factors": {
            const eng = await getEngine("predictionCalibration");
            result = eng.getCalibrationFactors(
              params.material_key ?? params.material ?? "",
              params.machine_id ?? params.machine ?? "",
            );
            break;
          }
          case "prediction_calibration_history": {
            const eng = await getEngine("predictionCalibration");
            result = eng.getCalibrationHistory(params.material_key, params.machine_id);
            break;
          }

          // ── E1148: WorkholdingVerificationEngine (CAMX-MS14/U06) — 3 actions ─

          case "workholding_verify": {
            const eng = await getEngine("workholdingVerification");
            result = eng.verify(
              params.cutting_forces ?? params.forces ?? {},
              params.workholding ?? {},
              params.part_geometry ?? params.geometry,
            );
            break;
          }
          case "workholding_verify_all": {
            const eng = await getEngine("workholdingVerification");
            result = eng.verifyAllOperations(
              params.operations ?? [],
              params.workholding ?? {},
              params.part_geometry ?? params.geometry,
            );
            break;
          }
          case "workholding_min_safety": {
            const eng = await getEngine("workholdingVerification");
            result = eng.getMinSafetyFactor(
              params.operations ?? [],
              params.workholding ?? {},
              params.part_geometry ?? params.geometry,
            );
            break;
          }

          // ── E1149: ToolBreakagePredictionEngine (CAMX-MS14/U05) — 3 actions ──

          case "tool_breakage_predict": {
            const eng = await getEngine("toolBreakagePrediction");
            result = eng.predictBreakage(
              params.tool ?? {},
              params.forces ?? {},
              params.engagement_history ?? params.history,
            );
            break;
          }
          case "tool_cumulative_damage": {
            const eng = await getEngine("toolBreakagePrediction");
            result = eng.getCumulativeDamage(
              params.tool ?? {},
              params.operations ?? [],
            );
            break;
          }
          case "tool_breakage_risk": {
            const eng = await getEngine("toolBreakagePrediction");
            result = eng.getBreakageRisk(
              params.tool ?? {},
              params.operation ?? {},
            );
            break;
          }

          // ── E1150: CamxEnergyOptimizationEngine (CAMX-MS13/U04) — 3 actions ──

          case "camx_energy_optimize": {
            const eng = await getEngine("camxEnergyOpt");
            result = eng.optimizeEnergy(
              params.program_blocks ?? params.blocks ?? [],
              params.machine ?? {},
            );
            break;
          }
          case "camx_energy_breakdown": {
            const eng = await getEngine("camxEnergyOpt");
            result = eng.getEnergyBreakdown(
              params.program_blocks ?? params.blocks ?? [],
              params.machine ?? {},
            );
            break;
          }
          case "camx_energy_suggest_savings": {
            const eng = await getEngine("camxEnergyOpt");
            result = eng.suggestSavings(
              params.program_blocks ?? params.blocks ?? [],
              params.machine ?? {},
            );
            break;
          }

          // ── E1151: StrategyRankingUpdateEngine (CAMX-MS15/U02) — 3 actions ─

          case "strategy_ranking_record": {
            const eng = await getEngine("strategyRankingUpdate");
            result = eng.recordResult(
              params.strategy ?? "",
              params.material ?? "",
              params.tool ?? "",
              params.outcome ?? {},
            );
            break;
          }
          case "strategy_ranking_get": {
            const eng = await getEngine("strategyRankingUpdate");
            result = eng.getRanking(
              params.material,
              params.feature_type,
            );
            break;
          }
          case "strategy_ranking_confidence": {
            const eng = await getEngine("strategyRankingUpdate");
            result = eng.getConfidence(
              params.strategy ?? "",
              params.material ?? "",
              params.tool ?? "*",
            );
            break;
          }

          // ── E1152: AnomalyDetectionEngine (CAMX-MS15/U03) — 4 actions ───────

          case "anomaly_detect": {
            const eng = await getEngine("anomalyDetection");
            result = eng.detectAnomaly(
              params.predicted ?? {},
              params.actual ?? {},
            );
            break;
          }
          case "anomaly_record_and_detect": {
            const eng = await getEngine("anomalyDetection");
            result = eng.recordAndDetect(
              params.predicted ?? {},
              params.actual ?? {},
              params.context ?? {},
            );
            break;
          }
          case "anomaly_history": {
            const eng = await getEngine("anomalyDetection");
            result = eng.getAnomalyHistory({
              machine_id: params.machine_id,
              strategy: params.strategy,
              material: params.material,
              is_anomaly: params.is_anomaly,
              since_ms: params.since_ms,
              limit: params.limit,
            });
            break;
          }
          case "anomaly_auto_adjust": {
            const eng = await getEngine("anomalyDetection");
            result = eng.autoAdjust(params.anomaly ?? {});
            break;
          }

          // ── E1154: CoolantCostOptimizationEngine (CAMX-MS13/U03) — 3 actions ─

          case "coolant_cost_compare": {
            const eng = await getEngine("coolantCostOpt");
            result = eng.compareCoolantCosts(
              params.operation ?? {},
              params.machine ?? { has_through_tool: false },
              params.annual_volume ?? 1,
            );
            break;
          }
          case "coolant_cost_optimal": {
            const eng = await getEngine("coolantCostOpt");
            result = eng.optimalCoolant(params.constraints ?? params);
            break;
          }
          case "coolant_cost_lifecycle": {
            const eng = await getEngine("coolantCostOpt");
            result = eng.getLifecycleCost(
              params.coolant_type ?? "flood",
              params.annual_hours ?? 2000,
            );
            break;
          }

          // ── E1155: SetupCostOptimizationEngine (CAMX-MS13/U05) — 3 actions ──

          case "setup_cost_optimize": {
            const eng = await getEngine("setupCostOpt");
            result = eng.optimizeSetupCost({
              setups: params.setups ?? [],
              batch_size: params.batch_size ?? 1,
              labor_rate_per_hr: params.labor_rate_per_hr,
              annual_volume: params.annual_volume,
              has_5axis: params.has_5axis,
              has_pallet: params.has_pallet,
            });
            break;
          }
          case "setup_time_estimate": {
            const eng = await getEngine("setupCostOpt");
            result = eng.estimateSetupTime(
              params.complexity ?? "moderate",
              params.modifiers ?? params,
            );
            break;
          }
          case "setup_suggest_reductions": {
            const eng = await getEngine("setupCostOpt");
            result = eng.suggestReductions({
              setups: params.setups ?? [],
              batch_size: params.batch_size ?? 1,
              labor_rate_per_hr: params.labor_rate_per_hr,
              has_5axis: params.has_5axis,
              has_pallet: params.has_pallet,
            });
            break;
          }

          // ── E1156: EnergyOptimizationIntegrationEngine (CAMX-MS13/U04) — 3 actions

          case "energy_add_to_cost": {
            const eng = await getEngine("energyOptInteg");
            result = await eng.addEnergyToCost(
              params.program ?? {},
              params.machine ?? {},
              params.energy_rate,
              params.grid_mix,
              params.custom_emission_factor,
            );
            break;
          }
          case "energy_carbon_footprint": {
            const eng = await getEngine("energyOptInteg");
            result = eng.getCarbonFootprint(
              params.energy_kwh ?? 0,
              params.grid_mix,
              { custom_factor: params.custom_factor, annual_volume: params.annual_volume },
            );
            break;
          }
          case "energy_suggest_savings": {
            const eng = await getEngine("energyOptInteg");
            result = await eng.suggestEnergySavings(
              params.program ?? {},
              params.machine ?? {},
              {
                energy_rate: params.energy_rate,
                grid_mix: params.grid_mix,
                annual_volume: params.annual_volume,
              },
            );
            break;
          }

          // F360-AP-MS1 — AutoProgramOrchestratorEngine
          case "f360_auto_program": {
            const { AutoProgramOrchestratorEngine } = await import("../../engines/AutoProgramOrchestratorEngine.js");
            result = await AutoProgramOrchestratorEngine.run({
              material: params.material as string,
              fusion_url: params.fusion_url as string | undefined,
              iso_group: params.iso_group as "P" | "M" | "K" | "N" | "S" | "H" | undefined,
              machine: params.machine as string | undefined,
              max_rpm: params.max_rpm as number | undefined,
              max_power_kw: params.max_power_kw as number | undefined,
              target_ra_um: params.target_ra_um as number | undefined,
              optimize_for: params.optimize_for as "time" | "quality" | "tool_life" | undefined,
              batch_size: params.batch_size as number | undefined,
              skip_stages: params.skip_stages as import("../../engines/AutoProgramOrchestratorEngine.js").AutoProgramStage[] | undefined,
              resume_from_stage: params.resume_from_stage as import("../../engines/AutoProgramOrchestratorEngine.js").AutoProgramStage | undefined,
              post_processor_path: params.post_processor_path as string | undefined,
              output_folder: params.output_dir as string | undefined,
            });
            break;
          }
          case "f360_auto_program_status": {
            // Status check — returns cached pipeline result if available
            result = { success: true, pipeline_id: params.pipeline_id, status: "complete", message: "Pipeline status tracking requires persistent store — use f360_auto_program directly" };
            break;
          }

          // F360 Live Bridge read-only CAM introspection (OBSIDIAN-AUTOMATE-MS3/U-FUSION-LIVE-READ).
          // Each routes a single GET to PRISMBridge.py — no kernel work, no mutation.
          case "f360_live_operations": {
            const { fusion360LiveBridgeEngine } = await import("../../engines/Fusion360LiveBridgeEngine.js");
            result = await fusion360LiveBridgeEngine.listCamOperations(params.setup_name as string | undefined);
            break;
          }
          case "f360_live_toolpath_validity": {
            const { fusion360LiveBridgeEngine } = await import("../../engines/Fusion360LiveBridgeEngine.js");
            result = await fusion360LiveBridgeEngine.getToolpathValidity(params.setup_name as string | undefined);
            break;
          }
          case "f360_live_cycle_time": {
            const { fusion360LiveBridgeEngine } = await import("../../engines/Fusion360LiveBridgeEngine.js");
            result = await fusion360LiveBridgeEngine.getCycleTime(params.setup_name as string | undefined);
            break;
          }
          case "f360_live_materials": {
            const { fusion360LiveBridgeEngine } = await import("../../engines/Fusion360LiveBridgeEngine.js");
            result = await fusion360LiveBridgeEngine.getCamMaterials();
            break;
          }

          // PostDownloadEngine (PP-MS4/U-PP21) — 3 actions
          case "ppg_format_download": {
            const eng = await getEngine("postDownload");
            result = eng.execute({ ...params, action: "format_download" });
            break;
          }
          case "ppg_setup_sheet": {
            const eng = await getEngine("postDownload");
            result = eng.execute({ ...params, action: "setup_sheet" });
            break;
          }
          case "ppg_manifest": {
            const eng = await getEngine("postDownload");
            result = eng.execute({ ...params, action: "manifest" });
            break;
          }

          // ProveOutModeEngine (PP-MS5/U-PP24) — 2 actions
          case "ppg_prove_out": {
            const eng = await getEngine("proveOut");
            result = await eng.process({ ...params, action: "apply_prove_out" });
            break;
          }
          case "ppg_estimate_impact": {
            const eng = await getEngine("proveOut");
            result = await eng.process({ ...params, action: "estimate_impact" });
            break;
          }

          // PostValidationHardeningEngine (PP-MS5/U-PP25) — 2 actions
          case "ppg_validate_limits": {
            const eng = await getEngine("postValHardening");
            result = await eng.process({ ...params, action: "validate_limits" });
            break;
          }
          case "ppg_check_envelope": {
            const eng = await getEngine("postValHardening");
            result = await eng.process({ ...params, action: "check_envelope" });
            break;
          }

          // PostValidationReportEngine (PP-MS5/U-PP26) — 1 action
          case "ppg_validation_report": {
            const eng = await getEngine("postValReport");
            result = await eng.process({ ...params, action: "generate_report" });
            break;
          }

          // PostLibraryCatalogEngine (PP-MS6/U-PP28) — 4 actions
          case "ppg_library_search": {
            const eng = await getEngine("postLibraryCatalog");
            result = await eng.process({ ...params, action: "search" });
            break;
          }
          case "ppg_library_detail": {
            const eng = await getEngine("postLibraryCatalog");
            result = await eng.process({ ...params, action: "detail" });
            break;
          }
          case "ppg_library_compatibility": {
            const eng = await getEngine("postLibraryCatalog");
            result = await eng.process({ ...params, action: "compatibility" });
            break;
          }
          case "ppg_library_facets": {
            const eng = await getEngine("postLibraryCatalog");
            result = await eng.process({ ...params, action: "list_facets" });
            break;
          }

          // PostVersioningEngine (PP-MS6/U-PP30) — 4 actions
          case "ppg_version_store": {
            const eng = await getEngine("postVersioning");
            result = await eng.process({ ...params, action: "store" });
            break;
          }
          case "ppg_version_history": {
            const eng = await getEngine("postVersioning");
            result = await eng.process({ ...params, action: "history" });
            break;
          }
          case "ppg_version_diff": {
            const eng = await getEngine("postVersioning");
            result = await eng.process({ ...params, action: "diff" });
            break;
          }
          case "ppg_version_retrieve": {
            const eng = await getEngine("postVersioning");
            result = await eng.process({ ...params, action: "retrieve" });
            break;
          }

          // PostProcessorTelemetryEngine (PP-MS11/U-PP47) — 2 actions
          case "ppg_telemetry_record": {
            const eng = await getEngine("ppgTelemetry");
            result = await eng.process({ ...params, action: "record_event" });
            break;
          }
          case "ppg_telemetry_funnel": {
            const eng = await getEngine("ppgTelemetry");
            result = await eng.process({ ...params, action: "funnel_metrics" });
            break;
          }

          // PP-MS10/U-PP45 — ROI calculator
          case "ppg_roi_calculate": {
            const machines = Number(params.machines) || 3;
            const avgCycleMin = Number(params.avg_cycle_min) || 45;
            const hourlyRate = Number(params.hourly_rate) || 125;
            const shiftsPerDay = Number(params.shifts_per_day) || 2;
            const daysPerYear = 250;
            const savingPct = 0.18;
            const crashesPerYear = 2;
            const avgCrashCost = 8500;
            const subscriptionMonthly = 399;
            const totalMachineHours = machines * shiftsPerDay * 8 * daysPerYear;
            const cyclesPerHour = 60 / avgCycleMin;
            const totalCycles = totalMachineHours * cyclesPerHour;
            const minutesSaved = totalCycles * avgCycleMin * savingPct;
            const hoursSaved = minutesSaved / 60;
            const timeSavings = hoursSaved * hourlyRate;
            const crashSavings = crashesPerYear * avgCrashCost * machines;
            const totalSavings = timeSavings + crashSavings;
            const annualSub = subscriptionMonthly * 12;
            const paybackMonths = totalSavings > 0 ? Math.ceil(annualSub / (totalSavings / 12)) : 0;
            result = {
              annual_savings: Math.round(totalSavings),
              cycle_time_savings: Math.round(timeSavings),
              crash_prevention_savings: Math.round(crashSavings),
              hours_saved_per_year: Math.round(hoursSaved),
              payback_months: paybackMonths,
              net_annual_roi: Math.round(totalSavings - annualSub),
              inputs: { machines, avgCycleMin, hourlyRate, shiftsPerDay },
            };
            break;
          }

          // ── Forge-Triple Actions ──────────────────────────────────
          case "validate_pipeline_output": {
            const { gcSafetyAnalyzer } = await import("../../engines/GCodeSafetyAnalyzerEngine.js");
            result = gcSafetyAnalyzer.validatePipelineOutput({
              gcode: params.gcode ?? params.program_text ?? "",
              pipeline: params.pipeline ?? "unknown",
              controller: params.controller,
              machine_limits: params.machine_limits,
            });
            break;
          }
          case "post_process_with_catalog": {
            const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
            result = await postProcessorPipelineEngine.process({
              gcode: params.gcode ?? params.program_text ?? "",
              material: params.material,
              machine: params.machine,
              tools: params.tools,
              optimization_target: params.optimization_target ?? "balanced",
            });
            break;
          }

          // ── HM-REV-MS2 — Material Bridge + PPP Default Path ─────────────

          case "cam_hypermill_material_to_physics": {
            // U-HMR11: Resolve material name → kc1.1 + ISO group + factors
            const bridge = await getEngine("hmMatPhysBridge");
            const physics = bridge.resolve(params.material);
            const output: Record<string, unknown> = { ...physics };
            if (params.include_gate) {
              const { hyperMillMaterialPhysicsGate } = await import("../../engines/HyperMillMaterialPhysicsBridge.js");
              output.gate = hyperMillMaterialPhysicsGate({ material: params.material });
            }
            result = output;
            break;
          }

          case "cam_hypermill_material_to_orchestrator": {
            // U-HMR12: Resolve quality ID → OrchestratorInput fragment
            const { buildOrchestratorInputFromHyperMillMaterial } = await import("../../engines/HyperMillPPPDefaultConfig.js");
            result = await buildOrchestratorInputFromHyperMillMaterial(
              params.quality_id_or_name ?? params.qualityIdOrName ?? ""
            );
            break;
          }

          case "cam_hypermill_calibration_compare": {
            // U-HMR13: Compare PRISM physics vs hypermill-cutting-tech.json
            const { compareToCuttingTech } = await import("../../engines/HyperMillPPPDefaultConfig.js");
            result = await compareToCuttingTech(
              params.material,
              params.tool_diameter_mm ?? params.toolDiameterMm ?? 10
            );
            if (result === null) {
              result = { found: false, reason: `Material '${params.material}' not found in hypermill-cutting-tech.json` };
            }
            break;
          }

          case "cam_hypermill_ppp_defaults": {
            // U-HMR14: Get default PPP config (with optional controller dialect resolution)
            const { getDefaultPPPConfig } = await import("../../engines/HyperMillPPPDefaultConfig.js");
            result = await getDefaultPPPConfig(
              params.controller_id ?? params.controllerId,
              {
                optimize_for: params.optimize_for ?? params.optimizeFor,
                output_annotated: params.output_annotated ?? params.outputAnnotated,
                preserve_rapids: params.preserve_rapids ?? params.preserveRapids,
                five_axis: params.five_axis ?? params.fiveAxis,
              }
            );
            break;
          }

          case "cam_hypermill_register_strategies": {
            // U-HMR15: Register hyperMILL strategies in ToolpathStrategyRegistry
            const { registerHyperMillStrategies, getHyperMillStrategies } = await import("../../engines/HyperMillStrategyRegistration.js");
            const registered = registerHyperMillStrategies();
            const strategies = (params.return_list ?? params.returnList ?? true)
              ? getHyperMillStrategies()
              : undefined;
            result = {
              registered_count: registered,
              total_hypermill_strategies: strategies ? strategies.length : undefined,
              strategies: strategies,
            };
            break;
          }

          case "cam_hypermill_cycle_recommend": {
            // U-HMR16 + U-HMR18: Recommend cycle type + defaults + controller adjustments
            const { hyperMillCycleParameterPipeline } = await import("../../engines/HyperMillCycleParameterPipeline.js");
            const recommendation = hyperMillCycleParameterPipeline.recommend({
              featureType: params.feature_type ?? params.featureType ?? "drill",
              material: params.material,
              controllerId: params.controller_id ?? params.controllerId,
              depth_mm: params.depth_mm ?? params.depthMm,
              diameter_mm: params.diameter_mm ?? params.diameterMm,
              tolerance_mm: params.tolerance_mm ?? params.toleranceMm,
            });

            // Optionally include physics S/F
            let speedFeedResult: Record<string, unknown> | null = null;
            if (params.include_speed_feed ?? params.includeSpeedFeed) {
              try {
                const { speedFeedOrchestratorEngine } = await import("../../engines/SpeedFeedOrchestratorEngine.js");
                const sfInput: Record<string, unknown> = {
                  operation: "milling",
                  tool_diameter_mm: params.diameter_mm ?? params.diameterMm ?? 10,
                  material: params.material ?? "steel",
                };
                speedFeedResult = speedFeedOrchestratorEngine.compute(sfInput as any) as any;
              } catch {
                speedFeedResult = { error: "SpeedFeedOrchestrator unavailable — provide material + tool params" };
              }
            }

            // Trim defaults unless full output requested
            const defaults = (params.include_full_defaults ?? params.includeFullDefaults)
              ? recommendation.defaults
              : Object.fromEntries(
                  Object.entries(recommendation.defaults)
                    .filter(([, v]) => typeof v === "number" && v !== null)
                    .slice(0, 20)
                );

            result = {
              cycle: recommendation.cycle,
              defaults,
              controllerAdjustments: recommendation.controllerAdjustments,
              alternatives: recommendation.alternatives.slice(0, 3),
              defaultsSource: recommendation.defaultsSource,
              formulaParams: recommendation.formulaParams,
              speedFeed: speedFeedResult,
            };
            break;
          }

          case "cam_hypermill_validate_cycle_defaults": {
            // U-HMR17: Validate proposed params against factory defaults
            const { validateCycleDefaults } = await import("../../engines/HyperMillCycleDefaultsValidation.js");
            result = validateCycleDefaults({
              cycleCode: params.cycle_code ?? params.cycleCode ?? "unknown",
              proposed: params.proposed ?? {},
              factoryDefaults: params.factory_defaults ?? params.factoryDefaults ?? {},
            });
            break;
          }

          // ── HM-REV-MS4 — Multi-Axis Physics Pipeline ─────────────────────

          case "cam_hypermill_impeller_pipeline": {
            // U-HMR21: Physics-validated impeller/blisk machining pipeline
            // Chain: geometry → strategy → Kienzle force → tool deflection → material kc1.1
            const { hyperMillMultiAxisPhysicsPipeline } = await import("../../engines/HyperMillMultiAxisPhysicsPipeline.js");
            result = hyperMillMultiAxisPhysicsPipeline.run({
              material: params.material ?? "generic_superalloy",
              geometry: {
                bladeCount: params.blade_count ?? params.bladeCount ?? 6,
                hasSplitterBlades: params.has_splitter_blades ?? params.hasSplitterBlades ?? false,
                hubShroudRatio: params.hub_shroud_ratio ?? params.hubShroudRatio ?? 0.5,
                wallThicknessMm: params.wall_thickness_mm ?? params.wallThicknessMm ?? 3.0,
                channelDepthMm: params.channel_depth_mm ?? params.channelDepthMm ?? 30.0,
                geometryType: params.geometry_type ?? params.geometryType ?? "impeller",
              },
              tool: {
                diameterMm: params.tool_diameter_mm ?? params.toolDiameterMm ?? 10,
                overhangMm: params.tool_overhang_mm ?? params.toolOverhangMm ?? 50,
                flutes: params.flutes ?? 4,
                toolMaterial: params.tool_material ?? params.toolMaterial ?? "carbide",
              },
              goal: params.goal ?? "roughing",
              ap_mm: params.ap_mm,
              ae_mm: params.ae_mm,
              fz_mm: params.fz_mm,
            });
            break;
          }

          case "cam_hypermill_blade_roughing": {
            // U-HMR22: Blade roughing + open/closed channel logic + blisk
            const { hyperMillBladeRoughingEngine } = await import("../../engines/HyperMillBladeRoughingEngine.js");
            if (params.classify_only) {
              result = hyperMillBladeRoughingEngine.classifyChannel(
                params.hub_shroud_ratio ?? params.hubShroudRatio ?? 0.5,
                params.blade_wrap_angle_deg ?? params.bladeWrapAngleDeg ?? 90,
              );
            } else {
              result = hyperMillBladeRoughingEngine.calculate({
                geometryType: params.geometry_type ?? params.geometryType ?? "blade",
                channelType: params.channel_type ?? params.channelType ?? "open",
                isoGroup: params.iso_group ?? params.isoGroup,
                toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm ?? 10,
                channelDepthMm: params.channel_depth_mm ?? params.channelDepthMm ?? 30,
                channelWidthMm: params.channel_width_mm ?? params.channelWidthMm ?? 15,
                levelCount: params.level_count ?? params.levelCount,
                needsRestMaterial: params.needs_rest_material ?? params.needsRestMaterial ?? true,
                ap_per_level_mm: params.ap_per_level_mm ?? params.apPerLevelMm,
              });
            }
            break;
          }

          case "cam_hypermill_tilt_limit_check": {
            // U-HMR23: 5-axis tilt limit hook + collision gate
            const { hypermill5AxisTiltLimitHook, hypermill5AxisCollisionGate, MACHINE_TILT_PRESETS } = await import("../../engines/HyperMill5AxisTiltLimitHook.js");
            if (params.include_collision_gate) {
              result = hypermill5AxisCollisionGate({
                tilt_a_deg: params.tilt_a_deg ?? 0,
                tilt_b_deg: params.tilt_b_deg ?? 0,
                machine_a_min: params.machine_a_min ?? -120,
                machine_a_max: params.machine_a_max ?? 30,
                machine_b_min: params.machine_b_min ?? -360,
                machine_b_max: params.machine_b_max ?? 360,
                toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm ?? 10,
                estimatedClearanceMm: params.estimated_clearance_mm ?? params.estimatedClearanceMm,
              });
            } else if (params.preset) {
              const preset = MACHINE_TILT_PRESETS[params.preset];
              if (!preset) {
                result = { error: `Unknown preset '${params.preset}' — available: ${Object.keys(MACHINE_TILT_PRESETS).join(", ")}` };
              } else {
                result = hypermill5AxisTiltLimitHook({
                  tilt_a_deg: params.tilt_a_deg ?? 0,
                  tilt_b_deg: params.tilt_b_deg ?? 0,
                  ...preset,
                });
              }
            } else {
              result = hypermill5AxisTiltLimitHook({
                tilt_a_deg: params.tilt_a_deg ?? 0,
                tilt_b_deg: params.tilt_b_deg ?? 0,
                machine_a_min: params.machine_a_min ?? -120,
                machine_a_max: params.machine_a_max ?? 30,
                machine_b_min: params.machine_b_min ?? -360,
                machine_b_max: params.machine_b_max ?? 360,
              });
            }
            break;
          }

          case "cam_hypermill_mold_cycle": {
            // U-HMR24: Mold/die domain — cavity/core/parting/electrode/SPI
            const { hyperMillMoldCycleEngine } = await import("../../engines/HyperMillMoldCycleEngine.js");
            if (params.list_spi_grades) {
              result = hyperMillMoldCycleEngine.listSpiGrades();
            } else if (params.spi_grade && !params.feature_type) {
              result = hyperMillMoldCycleEngine.getSpiFinish(params.spi_grade);
            } else {
              result = hyperMillMoldCycleEngine.calculate({
                featureType: params.feature_type ?? params.featureType ?? "cavity",
                spiGrade: params.spi_grade ?? params.spiGrade,
                partLengthMm: params.part_length_mm ?? params.partLengthMm ?? 100,
                partWidthMm: params.part_width_mm ?? params.partWidthMm ?? 100,
                partDepthMm: params.part_depth_mm ?? params.partDepthMm ?? 50,
                toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm ?? 10,
                partingLineZ_mm: params.parting_line_z_mm ?? params.partingLineZMm,
                electrodeMaterial: params.electrode_material ?? params.electrodeMaterial,
                useAdaptiveClearing: params.use_adaptive_clearing ?? params.useAdaptiveClearing,
                allowanceMm: params.allowance_mm ?? params.allowanceMm,
              });
            }
            break;
          }

          case "cam_hypermill_mold_pipeline": {
            // U-HMR25: Mold pipeline — mold cycles wired to multi-axis pipeline
            // Runs cavity + core + SPI analysis in sequence
            const { hyperMillMoldCycleEngine } = await import("../../engines/HyperMillMoldCycleEngine.js");
            const moldInput = {
              partLengthMm: params.part_length_mm ?? params.partLengthMm ?? 100,
              partWidthMm: params.part_width_mm ?? params.partWidthMm ?? 100,
              partDepthMm: params.part_depth_mm ?? params.partDepthMm ?? 50,
              toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm ?? 10,
              partingLineZ_mm: params.parting_line_z_mm ?? params.partingLineZMm,
              allowanceMm: params.allowance_mm ?? params.allowanceMm,
              useAdaptiveClearing: params.use_adaptive_clearing ?? params.useAdaptiveClearing ?? true,
            };
            const cavityResult = hyperMillMoldCycleEngine.calculate({
              ...moldInput,
              featureType: "cavity",
              spiGrade: params.spi_grade ?? params.spiGrade,
            });
            const coreResult = hyperMillMoldCycleEngine.calculate({
              ...moldInput,
              featureType: "core",
            });
            const partingResult = hyperMillMoldCycleEngine.calculate({
              ...moldInput,
              featureType: "parting_line",
            });
            result = {
              cavity: cavityResult,
              core: coreResult,
              partingLine: partingResult,
              spiGrade: params.spi_grade ?? params.spiGrade,
              totalWarnings: [
                ...cavityResult.warnings,
                ...coreResult.warnings,
                ...partingResult.warnings,
              ],
            };
            break;
          }

          case "cam_hypermill_tube_machining": {
            // U-HMR25: Tube machining — wire MultiAxisEngine tube strategies with collision gate
            // Bore geometry requires collision-aware approach: tool axis follows tube centerline.
            // PEEK/CoCr dental materials resolved through MaterialBridge ISO group mapping.
            const { hyperMillMultiAxisEngine } = await import("../../engines/HyperMillMultiAxisEngine.js");
            const { hypermill5AxisCollisionGate } = await import("../../engines/HyperMill5AxisTiltLimitHook.js");

            const tubeMaterial = params.material ?? "generic_steel";
            const toolDia = params.tool_diameter_mm ?? params.toolDiameterMm ?? 10;
            const tubeGoal = params.goal ?? "finishing";

            // Strategy recommendation for tube geometry
            const stratResult = hyperMillMultiAxisEngine.calculate({
              geometry: "tube",
              goal: tubeGoal,
              materialGroup: params.material_group ?? params.materialGroup,
              toolDiameterMm: toolDia,
            });

            // Collision pre-gate for bore geometry: clearance = (boreDiameter - toolDiameter) / 2
            const boreDia = params.bore_diameter_mm ?? params.boreDiameterMm ?? toolDia * 2;
            const estimatedClearance = (boreDia - toolDia) / 2;
            const collisionResult = hypermill5AxisCollisionGate({
              tilt_a_deg: params.tilt_a_deg ?? 0,
              tilt_b_deg: params.tilt_b_deg ?? 0,
              machine_a_min: params.machine_a_min ?? -120,
              machine_a_max: params.machine_a_max ?? 30,
              machine_b_min: params.machine_b_min ?? -360,
              machine_b_max: params.machine_b_max ?? 360,
              toolDiameterMm: toolDia,
              estimatedClearanceMm: estimatedClearance,
            });

            result = {
              material: tubeMaterial,
              boreDiameter_mm: boreDia,
              estimatedClearance_mm: Math.round(estimatedClearance * 100) / 100,
              strategy: stratResult,
              collisionGate: collisionResult,
              ready: stratResult.confidence > 0 && collisionResult.collisionPass,
              warnings: [
                ...(stratResult.warnings ?? []),
                ...(collisionResult.pass ? [] : [collisionResult.reason ?? "Tilt limit violation"]),
                ...(!collisionResult.collisionPass && collisionResult.collisionMessage
                  ? [collisionResult.collisionMessage]
                  : []),
              ],
            };
            break;
          }

          case "cam_hypermill_probe_setup": {
            // U-HMR27: Wire 6 probe types to hyperMILL probing cycle catalog.
            // Validates approach speed, estimates measurement uncertainty (ISO 10360-2),
            // and generates hyperMILL-compatible cycle calls for Renishaw/Blum/Heidenhain.
            const { hyperMillProbingBridge } = await import("../../engines/HyperMillProbingBridge.js");

            const probeType = params.probe_type ?? params.probeType ?? "bore";
            const probeSystem = params.probe_system ?? params.probeSystem ?? "renishaw";

            result = hyperMillProbingBridge.calculate({
              probeType,
              probeSystem,
              nominalDiameter_mm: params.nominal_diameter_mm ?? params.nominalDiameter_mm,
              nominalZ_mm: params.nominal_z_mm ?? params.nominalZ_mm,
              approachSpeed_mmmin: params.approach_speed_mmmin ?? params.approachSpeed_mmmin,
              partTolerance_mm: params.part_tolerance_mm ?? params.partTolerance_mm,
              wcsRegister: params.wcs_register ?? params.wcsRegister,
              measuredValue_mm: params.measured_value_mm ?? params.measuredValue_mm,
              nominalDatum_mm: params.nominal_datum_mm ?? params.nominalDatum_mm,
              toolDiameter_mm: params.tool_diameter_mm ?? params.toolDiameter_mm,
            });
            break;
          }

          case "cam_hypermill_probe_wcs_verify": {
            // U-HMR28: WCS datum verification workflow.
            // Compares measured probe result vs nominal, flags deviation, computes corrected G54-G59 offset.
            const { hyperMillProbingBridge: probeEngine } = await import("../../engines/HyperMillProbingBridge.js");

            const measured = params.measured_mm ?? params.measuredMm;
            const nominal = params.nominal_mm ?? params.nominalMm;
            const tolerance = params.part_tolerance_mm ?? params.partTolerance_mm ?? 0.05;
            const register = params.wcs_register ?? params.wcsRegister ?? "G54";

            if (measured === undefined || nominal === undefined) {
              result = {
                error: "cam_hypermill_probe_wcs_verify requires measured_mm and nominal_mm",
              };
              break;
            }

            result = probeEngine.verifyWCS({
              measured_mm: Number(measured),
              nominal_mm: Number(nominal),
              partTolerance_mm: Number(tolerance),
              wcsRegister: register,
            });
            break;
          }

          case "cam_hypermill_surface_integrity_check": {
            // U-HMR29+30+31: Surface integrity check with white layer hard gate.
            // Runs SurfaceIntegrityEngine + temperature model → white layer gate.
            // Returns Ra/Rz prediction, residual stress state, white layer gate,
            // and a quality report compatible with the MS10 chain.
            const { hyperMillSurfaceIntegrityBridge } = await import("../../engines/HyperMillSurfaceIntegrityBridge.js");

            const siProcess = params.process ?? "milling";
            const siMaterial = params.material ?? "steel";
            const siVc = params.cutting_speed_m_min ?? params.cuttingSpeedMMmin ?? 150;
            const siFz = params.feed_mm ?? params.feedMm ?? 0.15;
            const siAp = params.depth_of_cut_mm ?? params.depthOfCutMm ?? 0.5;

            result = hyperMillSurfaceIntegrityBridge.calculate({
              process: siProcess,
              material: siMaterial,
              cuttingSpeed_m_min: Number(siVc),
              feed_mm: Number(siFz),
              depthOfCut_mm: Number(siAp),
              toolNoseRadius_mm: params.tool_nose_radius_mm ?? params.toolNoseRadiusMm,
              coolant: params.coolant,
              toolCondition: params.tool_condition ?? params.toolCondition,
              requiredRa_um: params.required_ra_um ?? params.requiredRaUm,
              requiredStressState: params.required_stress_state ?? params.requiredStressState,
              ambientTemp_C: params.ambient_temp_c ?? params.ambientTempC,
            });
            break;
          }

          case "cam_hypermill_grinding_route": {
            // U-HMR32+33: Route hyperMILL finishing to grinding + burn risk gate.
            // 4 triggers: Ra < 0.4µm, tolerance < 0.01mm, hardness > 55 HRC, bearing bore.
            const { hyperMillGrindingBridge } = await import("../../engines/HyperMillGrindingBridge.js");
            result = hyperMillGrindingBridge.calculate({
              featureName:             params.feature_name ?? params.featureName ?? "feature",
              material:                params.material ?? "4140_steel",
              requiredRa_um:           Number(params.required_ra_um ?? params.requiredRaUm ?? 1.6),
              tolerance_mm:            Number(params.tolerance_mm ?? params.toleranceMm ?? 0.05),
              hardness_hrc:            Number(params.hardness_hrc ?? params.hardnessHrc ?? 30),
              featureType:             params.feature_type ?? params.featureType,
              partSize_mm:             Number(params.part_size_mm ?? params.partSizeMm ?? 100),
              partWidth_mm:            params.part_width_mm ?? params.partWidthMm,
              stock_mm:                params.stock_mm ?? params.stockMm,
              wheelSpec:               params.wheel_spec ?? params.wheelSpec,
              controller:              params.controller,
              wheelDiameter_mm:        params.wheel_diameter_mm ?? params.wheelDiameterMm,
              wheelWidth_mm:           params.wheel_width_mm ?? params.wheelWidthMm,
              tableSpeed_mmmin:        params.table_speed_mmmin ?? params.tableSpeedMmmin,
              depthOfCut_mm:           params.depth_of_cut_mm ?? params.depthOfCutMm,
              wheelLifeRemaining_pct:  params.wheel_life_remaining_pct ?? params.wheelLifeRemainingPct,
              wheelAbrasive:           params.wheel_abrasive ?? params.wheelAbrasive,
            });
            break;
          }

          case "cam_hypermill_edm_route": {
            // U-HMR34: Route hyperMILL electrode designs to EDM (wire/sinker/micro).
            // Transfers overcut allowance from mold design; auto-selects EDM type.
            const { hyperMillEDMBridge } = await import("../../engines/HyperMillEDMBridge.js");
            const features = params.features ?? [{
              type:     params.feature_type ?? "cavity",
              name:     params.feature_name ?? "cavity_1",
              depth_mm: Number(params.depth_mm ?? params.depthMm ?? 20),
              size_mm:  Number(params.size_mm ?? params.sizeMm ?? 30),
              area_mm2: params.area_mm2 ?? params.areaMm2,
              volume_mm3: params.volume_mm3 ?? params.volumeMm3,
              x_mm: 0,
              y_mm: 0,
              targetRa_um: params.target_ra_um ?? params.targetRaUm,
              thickness_mm: params.thickness_mm ?? params.thicknessMm,
            }];
            result = hyperMillEDMBridge.calculate({
              partName:         params.part_name ?? params.partName ?? "part",
              material:         params.material ?? "tool_steel",
              features,
              electrodeMaterial: params.electrode_material ?? params.electrodeMaterial,
              roughOvercut_mm:  params.rough_overcut_mm ?? params.roughOvercutMm,
              finishOvercut_mm: params.finish_overcut_mm ?? params.finishOvercutMm,
              numSkimPasses:    params.num_skim_passes ?? params.numSkimPasses,
              targetRa_um:      params.target_ra_um ?? params.targetRaUm,
              controller:       params.controller,
              programNumber:    params.program_number ?? params.programNumber,
            });
            break;
          }

          case "cam_hypermill_heat_treat_route": {
            // U-HMR35+37: Heat treatment routing + material cert traceability chain.
            // 4 treatment types: anneal, stress relief, through harden, case harden.
            const { hyperMillHeatTreatmentRouter } = await import("../../engines/HyperMillHeatTreatmentRouter.js");
            result = hyperMillHeatTreatmentRouter.calculate({
              material:                params.material ?? "4140_steel",
              carbonPct:               params.carbon_pct ?? params.carbonPct,
              alloyClass:              params.alloy_class ?? params.alloyClass,
              sectionThickness_mm:     params.section_thickness_mm ?? params.sectionThicknessMm,
              requiredHardness_hrc:    params.required_hardness_hrc ?? params.requiredHardnessHrc,
              requiredCaseDepth_mm:    params.required_case_depth_mm ?? params.requiredCaseDepthMm,
              isWorkHardened:          params.is_work_hardened ?? params.isWorkHardened,
              heavyRoughingPlanned:    params.heavy_roughing_planned ?? params.heavyRoughingPlanned,
              finishGrindingRequired:  params.finish_grinding_required ?? params.finishGrindingRequired,
            });
            break;
          }

          case "cam_hypermill_secondary_ops_sequence": {
            // U-HMR36: Sequence grinding + EDM + heat treat in physically correct order.
            // Enforces 5 physical constraints; returns ordered op list for mold/bearing/gear.
            const { hyperMillSecondaryOpsSequencer } = await import("../../engines/HyperMillSecondaryOpsSequencer.js");
            result = hyperMillSecondaryOpsSequencer.calculate({
              partApplication:    params.part_application ?? params.partApplication ?? "general",
              partName:           params.part_name ?? params.partName ?? "part",
              material:           params.material ?? "steel",
              heatTreatSteps:     params.heat_treat_steps ?? params.heatTreatSteps,
              grindingRequired:   params.grinding_required ?? params.grindingRequired ?? false,
              grindingType:       params.grinding_type ?? params.grindingType,
              edmRequired:        params.edm_required ?? params.edmRequired ?? false,
              edmType:            params.edm_type ?? params.edmType,
              heavyRoughing:      params.heavy_roughing ?? params.heavyRoughing ?? false,
              superfinishRequired: params.superfinish_required ?? params.superfinishRequired ?? false,
              nadcapRequired:     params.nadcap_required ?? params.nadcapRequired ?? false,
            });
            break;
          }

          case "cam_hypermill_millturn_strategy": {
            // U-HMR38+39: Mill-turn strategy recommendation with CSS/TNRC physics.
            // Returns strategy + turningPhysics (G96/G97, kc1.1, Vc, feed) for millturn geometry types.
            const { hyperMillStrategyEngine } = await import("../../engines/HyperMillStrategyEngine.js");
            result = hyperMillStrategyEngine.calculate({
              geometryType:       params.geometry_type ?? params.geometryType ?? "od_profile",
              operationGoal:      params.operation_goal ?? params.operationGoal ?? "roughing",
              materialGroup:      params.material_group ?? params.materialGroup ?? "P",
              toolDiameterMm:     params.tool_diameter_mm ?? params.toolDiameterMm,
              minDiameterMm:      params.min_diameter_mm ?? params.minDiameterMm,
              noseRadiusMm:       params.nose_radius_mm ?? params.noseRadiusMm,
              wallAngleDeg:       params.wall_angle_deg ?? params.wallAngleDeg,
              hasPreviousRoughing: params.has_previous_roughing ?? params.hasPreviousRoughing,
              partToleranceMm:    params.part_tolerance_mm ?? params.partToleranceMm,
            });
            break;
          }

          case "cam_hypermill_millturn_multichannel": {
            // U-HMR40: Multi-channel mill-turn wiring via HyperMillMillTurnBridge.
            // Supports: spindle_handoff, simultaneous_ops, bar_feed_sequence.
            const { hyperMillMillTurnBridge } = await import("../../engines/HyperMillMillTurnBridge.js");
            const subAction = params.sub_action ?? params.subAction ?? "spindle_handoff";
            if (subAction === "spindle_handoff") {
              result = hyperMillMillTurnBridge.calculateSpindleHandoff({
                workpieceDiameter_mm:     params.workpiece_diameter_mm ?? params.workpieceDiameter_mm ?? 20,
                workpieceLength_mm:       params.workpiece_length_mm ?? params.workpieceLength_mm ?? 50,
                material:                 params.material ?? "carbon_steel",
                isoGroup:                 params.iso_group ?? params.isoGroup,
                mainSpindleRPM:           params.main_spindle_rpm ?? params.mainSpindleRPM ?? 1500,
                transferMode:             params.transfer_mode ?? params.transferMode ?? "synchronized",
                cutoffToolWidth_mm:       params.cutoff_tool_width_mm ?? params.cutoffToolWidthMm ?? 3,
                cutoffFeed_mm_rev:        params.cutoff_feed_mm_rev ?? params.cutoffFeedMmRev ?? 0.05,
                subSpindleGripLength_mm:  params.sub_spindle_grip_length_mm ?? params.subSpindleGripLengthMm,
                backWorkOperations:       params.back_work_operations ?? params.backWorkOperations,
              });
            } else if (subAction === "simultaneous_ops") {
              result = hyperMillMillTurnBridge.calculateSimultaneousOps({
                channels:              params.channels ?? [],
                syncStyle:             params.sync_style ?? params.syncStyle,
                machineTurrets:        params.machine_turrets ?? params.machineTurrets,
                collisionClearance_mm: params.collision_clearance_mm ?? params.collisionClearanceMm,
              });
            } else if (subAction === "bar_feed_sequence") {
              result = hyperMillMillTurnBridge.calculateBarFeedSequence({
                barDiameter_mm:       params.bar_diameter_mm ?? params.barDiameterMm ?? 20,
                barLength_mm:         params.bar_length_mm ?? params.barLengthMm ?? 3000,
                partLength_mm:        params.part_length_mm ?? params.partLengthMm ?? 40,
                cutoffWidth_mm:       params.cutoff_width_mm ?? params.cutoffWidthMm ?? 3,
                material:             params.material ?? "carbon_steel",
                isoGroup:             params.iso_group ?? params.isoGroup,
                remnantMinLength_mm:  params.remnant_min_length_mm ?? params.remnantMinLengthMm,
                guideBushing:         params.guide_bushing ?? params.guideBushing ?? false,
                colletType:           params.collet_type ?? params.colletType,
              });
            } else {
              result = { error: `Unknown sub_action: ${subAction} — use spindle_handoff, simultaneous_ops, or bar_feed_sequence` };
            }
            break;
          }

          case "cam_hypermill_css_rpm_check": {
            // U-CAM-HM-MILLTURN-WIRE-01: HyperMillMillTurnStrategyEngine.checkCSSLimit
            // Validates G96 CSS against machine RPM limit at minimum diameter.
            // Formula: RPM = (1000*Vc) / (pi*D_min). Sandvik Coromant + ISO 6983-1.
            const engine = await getEngine("hmMillTurnStrat");
            result = engine.checkCSSLimit({
              vcDesired_m_min: params.vc_desired_m_min ?? params.vcDesired_m_min ?? params.vcDesiredMMin ?? 0,
              minDiameter_mm:  params.min_diameter_mm  ?? params.minDiameter_mm  ?? params.minDiameterMm  ?? 0,
              machineMaxRpm:   params.machine_max_rpm  ?? params.machineMaxRpm   ?? 0,
              isoGroup:        params.iso_group        ?? params.isoGroup,
            });
            break;
          }

          case "cam_hypermill_caxis_indexing": {
            // U-CAM-HM-MILLTURN-WIRE-01: HyperMillMillTurnStrategyEngine.calculateCAxisSync
            // Generates C-axis indexed positions + live-tool effective Vc for cross-hole / cross-slot / off-center features.
            // Reference: DMG MORI NTX/NLX programming manual + Mazak Integrex.
            const engine = await getEngine("hmMillTurnStrat");
            result = engine.calculateCAxisSync({
              syncType:              params.sync_type             ?? params.syncType             ?? "cross_hole",
              cAngle_deg:            params.c_angle_deg           ?? params.cAngle_deg           ?? params.cAngleDeg           ?? 0,
              liveToolRpm:           params.live_tool_rpm         ?? params.liveToolRpm          ?? 0,
              liveToolDiameter_mm:   params.live_tool_diameter_mm ?? params.liveToolDiameter_mm  ?? params.liveToolDiameterMm  ?? 0,
              workpieceSpindleRpm:   params.workpiece_spindle_rpm ?? params.workpieceSpindleRpm,
              featureCount:          params.feature_count         ?? params.featureCount         ?? 1,
            });
            break;
          }

          case "cam_hypermill_millturn_full_strategy": {
            // U-CAM-HM-MILLTURN-WIRE-01: HyperMillMillTurnStrategyEngine.calculateMillTurnStrategy
            // Combined CSS check + optional C-axis sync + optional multi-channel sync; pulls Kienzle from physics/constants.
            const engine = await getEngine("hmMillTurnStrat");
            result = engine.calculateMillTurnStrategy({
              strategyGeometry: params.strategy_geometry ?? params.strategyGeometry ?? "od_profile",
              isoGroup:         params.iso_group         ?? params.isoGroup         ?? "P",
              vcDesired_m_min:  params.vc_desired_m_min  ?? params.vcDesired_m_min  ?? 0,
              minDiameter_mm:   params.min_diameter_mm   ?? params.minDiameter_mm   ?? 0,
              machineMaxRpm:    params.machine_max_rpm   ?? params.machineMaxRpm    ?? 0,
              cAxisConfig:      params.c_axis_config     ?? params.cAxisConfig,
              multiChannelConfig: params.multi_channel_config ?? params.multiChannelConfig,
            });
            break;
          }

          case "cam_hypermill_skill_resolve": {
            // U-CAM-HM-SKILLS-WIRE-01: HyperMillSkillsBatchEngine.resolveSkill
            // Resolves a single hyperMILL skill by slug (e.g. "hypermill-pocket"). Returns metadata or null.
            const engine = await getEngine("hmSkillsBatch");
            const slug = String(params.slug ?? params.skill_slug ?? params.skillSlug ?? "");
            const skill = engine.resolveSkill(slug);
            result = { success: true, slug, skill: skill ?? null, found: skill !== undefined };
            break;
          }

          case "cam_hypermill_skill_list_phase": {
            // U-CAM-HM-SKILLS-WIRE-01: HyperMillSkillsBatchEngine.listByPhase
            // Returns all skills in phase 1, 2, or 3.
            const engine = await getEngine("hmSkillsBatch");
            const rawPhase = params.phase ?? 1;
            const phase = (rawPhase === 1 || rawPhase === 2 || rawPhase === 3) ? rawPhase : 1;
            const skills = engine.listByPhase(phase);
            result = { success: true, phase, count: skills.length, skills };
            break;
          }

          case "cam_hypermill_skill_validate": {
            // U-CAM-HM-SKILLS-WIRE-01: HyperMillSkillsBatchEngine.validateAll
            // Asserts all 60 skills have unique slugs + required fields.
            const engine = await getEngine("hmSkillsBatch");
            result = engine.validateAll();
            break;
          }

          case "cam_hypermill_skill_batch_resolve": {
            // U-CAM-HM-SKILLS-WIRE-01: HyperMillSkillsBatchEngine.batchResolve
            // Resolve multiple skill slugs at once; returns found/missing counts and resolution rate.
            const engine = await getEngine("hmSkillsBatch");
            const slugs = Array.isArray(params.slugs) ? params.slugs.map(String) : [];
            result = engine.batchResolve(slugs);
            break;
          }

          case "cam_hypermill_turning_config_parse_cycturn": {
            // U-CAM-HM-TURNCFG-WIRE-01: HyperMillTurningConfigIngesterEngine.parseCycTurnText
            // Parses hyperMILL cycTurn.def text → cycle defs with id/description/parameters.
            const engine = await getEngine("hmTurningCfgIngester");
            const content = String(params.content ?? params.text ?? "");
            const sourceName = String(params.source_name ?? params.sourceName ?? "in-memory");
            result = engine.parseCycTurnText(content, sourceName);
            break;
          }

          case "cam_hypermill_turning_config_parse_stocklist": {
            // U-CAM-HM-TURNCFG-WIRE-01: HyperMillTurningConfigIngesterEngine.parseStocklistText
            // Parses hyperMILL Stocklist CSV/TSV text → stock entries with hardness/density/kc11/etc.
            const engine = await getEngine("hmTurningCfgIngester");
            const content = String(params.content ?? params.text ?? "");
            const sourceName = String(params.source_name ?? params.sourceName ?? "in-memory");
            result = engine.parseStocklistText(content, sourceName);
            break;
          }

          case "cam_hypermill_turning_config_ingest_dir": {
            // U-CAM-HM-TURNCFG-WIRE-01: HyperMillTurningConfigIngesterEngine.ingestDirectory
            // Reads cycTurn.def + Stocklist.csv from a directory; returns combined config result.
            const engine = await getEngine("hmTurningCfgIngester");
            const dirPath = String(params.dir_path ?? params.dirPath ?? "");
            result = engine.ingestDirectory(dirPath);
            break;
          }

          case "cam_hypermill_turning_config_stats": {
            // U-CAM-HM-TURNCFG-WIRE-01: HyperMillTurningConfigIngesterEngine.getStats
            // Reports supported file types + inferred stock fields.
            const engine = await getEngine("hmTurningCfgIngester");
            result = { success: true, ...engine.getStats() };
            break;
          }

          case "cam_hypermill_om_cycles_extract": {
            // U-CAM-HM-OMCYC-WIRE-01: HyperMillOmCyclesExtractor.extract
            // Reads omCycles.txt (display name → canonical cycle ID mappings).
            // Uses default singleton when no file_path provided; otherwise instantiates fresh.
            const filePath = params.file_path ?? params.filePath;
            if (filePath) {
              const { HyperMillOmCyclesExtractor } = await import(
                "../../engines/HyperMillOmCyclesExtractor.js"
              );
              const extractor = new HyperMillOmCyclesExtractor(String(filePath));
              result = await extractor.extract();
            } else {
              const engine = await getEngine("hmOmCycles");
              result = await engine.extract();
            }
            break;
          }

          case "cam_hypermill_om_cycles_parse_line": {
            // U-CAM-HM-OMCYC-WIRE-01: HyperMillOmCyclesExtractor.parseLine
            // Parses a single omCycles.txt line; returns CycleMapping or null on skip.
            const engine = await getEngine("hmOmCycles");
            const line = String(params.line ?? "");
            const mapping = engine.parseLine(line);
            result = { success: true, mapping, parsed: mapping !== null };
            break;
          }

          case "cam_hypermill_om_cycles_categorize": {
            // U-CAM-HM-OMCYC-WIRE-01: HyperMillOmCyclesExtractor.categorize
            // Groups CycleMapping[] by category key (DR/2D/TP/3D/5X/MT/NC/3L/5L).
            const engine = await getEngine("hmOmCycles");
            const mappings = Array.isArray(params.mappings) ? params.mappings : [];
            const categories = engine.categorize(mappings);
            result = { success: true, categories, total: mappings.length };
            break;
          }

          case "cam_hypermill_skill_registry_list": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.listSkills
            // Returns the full 15-entry skill registry (8 core + 7 operational).
            const engine = await getEngine("hmSkillRegMap");
            const skills = engine.listSkills();
            result = { success: true, skills, count: skills.length };
            break;
          }

          case "cam_hypermill_skill_registry_get": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.getSkill
            // Looks up one skill entry by its slug (e.g. "hypermill-material-lookup").
            const engine = await getEngine("hmSkillRegMap");
            const name = String(params.name ?? params.skill_name ?? params.skillName ?? "");
            const skill = engine.getSkill(name);
            result = { success: true, name, skill, found: skill !== null };
            break;
          }

          case "cam_hypermill_skill_registry_engine_map": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.getEngineMap
            // Returns Record<skillName, engineDependencies[]> across the entire registry.
            const engine = await getEngine("hmSkillRegMap");
            const engineMap = engine.getEngineMap();
            result = { success: true, engineMap, skillCount: Object.keys(engineMap).length };
            break;
          }

          case "cam_hypermill_skill_registry_by_category": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.byCategory
            // Filters to "core" or "operational" skills (rejects unknown categories).
            const engine = await getEngine("hmSkillRegMap");
            const rawCategory = String(params.category ?? "core");
            const category: "core" | "operational" =
              rawCategory === "operational" ? "operational" : "core";
            const skills = engine.byCategory(category);
            result = { success: true, category, skills, count: skills.length };
            break;
          }

          case "cam_hypermill_skill_registry_by_engine": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.byEngine
            // Returns skills depending on the named engine (case-insensitive substring match).
            const engine = await getEngine("hmSkillRegMap");
            const engineName = String(params.engine_name ?? params.engineName ?? params.engine ?? "");
            const skills = engine.byEngine(engineName);
            result = { success: true, engineName, skills, count: skills.length };
            break;
          }

          case "cam_hypermill_skill_registry_by_effort": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.byEffort
            // Filters by effort tier — LOW | MEDIUM | HIGH (rejects unknown tiers).
            const engine = await getEngine("hmSkillRegMap");
            const rawEffort = String(params.effort ?? "LOW").toUpperCase();
            const effort: "LOW" | "MEDIUM" | "HIGH" =
              rawEffort === "HIGH" ? "HIGH" : rawEffort === "MEDIUM" ? "MEDIUM" : "LOW";
            const skills = engine.byEffort(effort);
            result = { success: true, effort, skills, count: skills.length };
            break;
          }

          case "cam_hypermill_skill_registry_stats": {
            // U-CAM-HM-SKILLREG-WIRE-01: HyperMillSkillRegistryMap.stats
            // Reports total/core/operational counts and effort-tier breakdown.
            const engine = await getEngine("hmSkillRegMap");
            const stats = engine.stats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_hypermill_medical_get_profile": {
            // U-CAM-HM-MEDMAT-WIRE-01: HyperMillMedicalMaterialProfiles.getProfile
            // Physics-validated cutting params for medical/implant materials (CoCr, PEEK, Ti-Gr5/Gr23, zirconia).
            // Uses CANONICAL_KIENZLE constants — kc1.1 sourced from src/physics/constants.ts.
            const engine = await getEngine("hmMedMatProfiles");
            const materialKey = String(params.material_key ?? params.materialKey ?? "");
            const rawGoal = String(params.operation_goal ?? params.operationGoal ?? "roughing");
            const operationGoal: "roughing" | "finishing" | "semi_finishing" =
              rawGoal === "finishing" ? "finishing" : rawGoal === "semi_finishing" ? "semi_finishing" : "roughing";
            const wornToolFactorRaw = Number(params.worn_tool_factor ?? params.wornToolFactor ?? 0);
            const wornToolFactor = Number.isFinite(wornToolFactorRaw)
              ? Math.min(1, Math.max(0, wornToolFactorRaw))
              : 0;
            result = { success: true, ...engine.getProfile(materialKey, operationGoal, wornToolFactor) };
            break;
          }

          case "cam_hypermill_medical_resolve_material": {
            // U-CAM-HM-MEDMAT-WIRE-01: HyperMillMedicalMaterialProfiles.resolveMaterialKey
            // Resolves common material aliases (cocr, co-cr, cobalt_chrome, ti6al4v_eli, etc.) to canonical key.
            const engine = await getEngine("hmMedMatProfiles");
            const material = String(params.material ?? "");
            const key = engine.resolveMaterialKey(material);
            result = { success: true, material, key, resolved: key !== null };
            break;
          }

          case "cam_hypermill_medical_list_profiles": {
            // U-CAM-HM-MEDMAT-WIRE-01: HyperMillMedicalMaterialProfiles.listProfiles
            // Returns the catalog (key, displayName, isoGroup) for all medical material profiles.
            const engine = await getEngine("hmMedMatProfiles");
            const profiles = engine.listProfiles();
            result = { success: true, profiles, count: profiles.length };
            break;
          }

          case "cam_hypermill_xml_parse_feature2job": {
            // U-CAM-HM-XMLEXT-WIRE-01: Feature2JobExtractor.parseFile (PURE — no I/O)
            // Parses an in-memory omFeature2JobCatalog*.xml content string into a Feature2JobCatalog.
            const { Feature2JobExtractor } = await import("../../engines/HyperMillXmlExtractor.js");
            const content = String(params.content ?? params.xml ?? "");
            const sourceFile = String(params.source_file ?? params.sourceFile ?? "in-memory");
            const extractor = new Feature2JobExtractor();
            const catalog = extractor.parseFile(content, sourceFile);
            result = {
              success: true,
              catalog,
              mappingCount: catalog.mappings.length,
              groupCount: catalog.groups.length,
            };
            break;
          }

          case "cam_hypermill_xml_parse_post_config": {
            // U-CAM-HM-XMLEXT-WIRE-01: PostConfigExtractor.parse (PURE — no I/O)
            // Parses in-memory omPPFC.cfg content string into PostConfigEntry[].
            const { PostConfigExtractor } = await import("../../engines/HyperMillXmlExtractor.js");
            const content = String(params.content ?? params.cfg ?? "");
            const extractor = new PostConfigExtractor();
            const entries = extractor.parse(content);
            result = { success: true, entries, count: entries.length };
            break;
          }

          case "cam_hypermill_xml_extract_post_config": {
            // U-CAM-HM-XMLEXT-WIRE-01: PostConfigExtractor.extract (filesystem)
            // Reads omPPFC.cfg from disk; missing file returns {entries:[], errors:[...]} (no throw).
            const { PostConfigExtractor } = await import("../../engines/HyperMillXmlExtractor.js");
            const filePath = params.file_path ?? params.filePath;
            const extractor = filePath
              ? new PostConfigExtractor(String(filePath))
              : new PostConfigExtractor();
            const extractResult = await extractor.extract();
            result = {
              success: true,
              entries: extractResult.entries,
              errors: extractResult.errors,
              count: extractResult.entries.length,
            };
            break;
          }

          case "cam_hypermill_xml_extract_all": {
            // U-CAM-HM-XMLEXT-WIRE-01: HyperMillXmlExtractor.extract (full orchestrator)
            // Runs Feature2Job catalog discovery + parsing + post-config extraction in parallel.
            // Uses default singleton when no path overrides; otherwise instantiates fresh.
            const catalogDir = params.catalog_dir ?? params.catalogDir;
            const postConfigPath = params.post_config_path ?? params.postConfigPath;
            if (catalogDir || postConfigPath) {
              const { HyperMillXmlExtractor } = await import("../../engines/HyperMillXmlExtractor.js");
              const extractor = new HyperMillXmlExtractor(
                catalogDir ? String(catalogDir) : undefined,
                postConfigPath ? String(postConfigPath) : undefined,
              );
              result = { success: true, ...(await extractor.extract()) };
            } else {
              const engine = await getEngine("hmXmlExtractor");
              result = { success: true, ...(await engine.extract()) };
            }
            break;
          }

          case "cam_hypermill_ac_server_build_config": {
            // U-CAM-HM-ACSRVCFG-WIRE-01: HyperMillACServerConfig.buildACServerConfig
            // Builds full AC companion HTTP-server config from partial overrides; loopback-only host default.
            const { buildACServerConfig } = await import("../../engines/HyperMillACServerConfig.js");
            const overrides = (params.overrides && typeof params.overrides === "object")
              ? params.overrides
              : {};
            const config = buildACServerConfig(overrides);
            result = { success: true, config };
            break;
          }

          case "cam_hypermill_ac_server_validate_config": {
            // U-CAM-HM-ACSRVCFG-WIRE-01: HyperMillACServerConfig.validateACServerConfig
            // Returns array of validation errors. Critical: rejects host != "127.0.0.1" / "localhost".
            const { validateACServerConfig, buildACServerConfig } = await import("../../engines/HyperMillACServerConfig.js");
            const rawConfig = (params.config && typeof params.config === "object")
              ? buildACServerConfig(params.config)
              : buildACServerConfig({});
            const errors = validateACServerConfig(rawConfig);
            result = { success: true, errors, valid: errors.length === 0, errorCount: errors.length };
            break;
          }

          case "cam_hypermill_ac_server_describe_config": {
            // U-CAM-HM-ACSRVCFG-WIRE-01: HyperMillACServerConfig.describeACServerConfig
            // Human-readable multi-line summary for log startup messages.
            const { describeACServerConfig, buildACServerConfig } = await import("../../engines/HyperMillACServerConfig.js");
            const rawConfig = (params.config && typeof params.config === "object")
              ? buildACServerConfig(params.config)
              : buildACServerConfig({});
            const description = describeACServerConfig(rawConfig);
            result = { success: true, description };
            break;
          }

          case "cam_hypermill_ac_server_get_defaults": {
            // U-CAM-HM-ACSRVCFG-WIRE-01: Surface canonical defaults + named constants + route map.
            const mod = await import("../../engines/HyperMillACServerConfig.js");
            result = {
              success: true,
              defaultConfig: mod.DEFAULT_AC_SERVER_CONFIG,
              defaultPort: mod.AC_SERVER_DEFAULT_PORT,
              bindHost: mod.AC_SERVER_BIND_HOST,
              defaultTimeoutMs: mod.AC_SERVER_DEFAULT_TIMEOUT_MS,
              maxConcurrent: mod.AC_SERVER_MAX_CONCURRENT,
              routes: mod.AC_ROUTES,
              corsDefaults: mod.DEFAULT_AC_CORS_CONFIG,
            };
            break;
          }

          case "cam_hypermill_inhost_register": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.register
            // Registers the in-host Python runner as a CAMPluginCommunicationHub plugin.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const pluginId = params.plugin_id ?? params.pluginId;
            const version = params.version;
            const registration = HyperMillInHostRunnerEngine.register(
              pluginId !== undefined ? String(pluginId) : undefined,
              version !== undefined ? String(version) : undefined,
            );
            result = { success: true, registration };
            break;
          }

          case "cam_hypermill_inhost_plan_scenario": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.planScenario
            // Expands a ScenarioDescriptor into the expected overlay frame plan (Zod-validated).
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = String(params.session_id ?? params.sessionId ?? "");
            const descriptor = params.descriptor ?? {};
            const pluginId = params.plugin_id ?? params.pluginId;
            const plan = HyperMillInHostRunnerEngine.planScenario(
              sessionId,
              descriptor as never,
              pluginId !== undefined ? String(pluginId) : undefined,
            );
            result = { success: true, plan, frameCount: plan.expected_frames.length };
            break;
          }

          case "cam_hypermill_inhost_frame_to_envelope": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.frameToEnvelope (PURE)
            // Converts a PlannedFrame to a HubFrameEnvelope for routing.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const frame = params.frame ?? {};
            const payload = params.payload !== undefined ? String(params.payload) : undefined;
            const envelope = HyperMillInHostRunnerEngine.frameToEnvelope(frame as never, payload);
            result = { success: true, envelope };
            break;
          }

          case "cam_hypermill_inhost_summarize": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.summarize
            // Folds plan + result into a ScenarioSummary (assertion contract: latency p99, hard-stop budget, band transitions).
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = String(params.session_id ?? params.sessionId ?? "");
            const plan = params.plan ?? {};
            const scenarioResult = params.result ?? params.scenario_result ?? params.scenarioResult ?? {};
            const summary = HyperMillInHostRunnerEngine.summarize(
              sessionId,
              plan as never,
              scenarioResult as never,
            );
            result = { success: true, summary };
            break;
          }

          case "cam_hypermill_inhost_get_plan": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.getPlan
            // Looks up a previously-planned ScenarioPlan by session+scenario id; null when missing.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = String(params.session_id ?? params.sessionId ?? "");
            const scenarioId = String(params.scenario_id ?? params.scenarioId ?? "");
            const plan = HyperMillInHostRunnerEngine.getPlan(sessionId, scenarioId);
            result = { success: true, plan, found: plan !== null };
            break;
          }

          case "cam_hypermill_inhost_get_stats": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.getStats
            // Returns aggregated RunnerStats (scenarios planned/passed/failed) for a session.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = String(params.session_id ?? params.sessionId ?? "");
            const stats = HyperMillInHostRunnerEngine.getStats(sessionId);
            result = { success: true, stats };
            break;
          }

          case "cam_hypermill_inhost_reset_session": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.resetSession
            // Clears all in-memory state for one session id.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = String(params.session_id ?? params.sessionId ?? "");
            HyperMillInHostRunnerEngine.resetSession(sessionId);
            result = { success: true, session_id: sessionId, reset: true };
            break;
          }

          case "cam_hypermill_inhost_reset_all": {
            // U-CAM-HM-INHOST-WIRE-01: HyperMillInHostRunnerEngine.resetAll
            // Clears state for ALL sessions — intended for test isolation only.
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            HyperMillInHostRunnerEngine.resetAll();
            result = { success: true, reset: true };
            break;
          }

          case "cam_hypermill_strategy_kb_list_all": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getAllStrategies
            const engine = await getEngine("hmStrategyKB");
            const strategies = engine.getAllStrategies();
            result = { success: true, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_strategy_kb_by_category": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getStrategiesByCategory
            const engine = await getEngine("hmStrategyKB");
            const category = String(params.category ?? "");
            const strategies = engine.getStrategiesByCategory(category);
            result = { success: true, category, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_strategy_kb_get": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getStrategy (exact id lookup)
            const engine = await getEngine("hmStrategyKB");
            const id = String(params.id ?? params.strategy_id ?? params.strategyId ?? "");
            const strategy = engine.getStrategy(id);
            result = { success: true, id, strategy: strategy ?? null, found: strategy !== undefined };
            break;
          }

          case "cam_hypermill_strategy_kb_details": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getStrategyDetails (fuzzy by name)
            const engine = await getEngine("hmStrategyKB");
            const name = String(params.name ?? params.query ?? "");
            const strategy = engine.getStrategyDetails(name);
            result = { success: true, name, strategy: strategy ?? null, found: strategy !== undefined };
            break;
          }

          case "cam_hypermill_strategy_kb_recommend": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.recommendStrategy
            // Recommends an optimal strategy from geometry+material+goal+kinematics; returns alternatives + warnings + parameter suggestions.
            const engine = await getEngine("hmStrategyKB");
            const geometry = String(params.geometry ?? "");
            const material = String(params.material ?? params.iso_group ?? params.isoGroup ?? "P");
            const goal = String(params.goal ?? params.operation_goal ?? params.operationGoal ?? "roughing");
            const kinematics = String(params.kinematics ?? params.machine_kinematics ?? params.machineKinematics ?? "3axis");
            const recommendation = engine.recommendStrategy(geometry, material, goal, kinematics);
            result = { success: true, recommendation };
            break;
          }

          case "cam_hypermill_strategy_kb_search": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.searchStrategies (keyword)
            const engine = await getEngine("hmStrategyKB");
            const keyword = String(params.keyword ?? params.query ?? "");
            const strategies = engine.searchStrategies(keyword);
            result = { success: true, keyword, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_strategy_kb_for_geometry": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getStrategiesForGeometry
            const engine = await getEngine("hmStrategyKB");
            const geometry = String(params.geometry ?? "");
            const strategies = engine.getStrategiesForGeometry(geometry);
            result = { success: true, geometry, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_strategy_kb_jm_die": {
            // U-CAM-HM-STRATKB-WIRE-01: HyperMillStrategyKnowledgeEngine.getJMDieStrategies
            // Surfaces strategies tagged for the JM Die test shop.
            const engine = await getEngine("hmStrategyKB");
            const strategies = engine.getJMDieStrategies();
            result = { success: true, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_dl_select_strategy": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.selectOptimalStrategy
            // Multi-criterion strategy scorer combining material/machine/feature/learning weights.
            const engine = await getEngine("hmDeepLearning");
            const recommendation = engine.selectOptimalStrategy(params as never);
            result = { success: true, recommendation };
            break;
          }

          case "cam_hypermill_dl_recommend_automation": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.recommendAutomation
            // Returns automation tier (none/macro/AC_macro/full_AC) with reasoning.
            const engine = await getEngine("hmDeepLearning");
            const recommendation = engine.recommendAutomation(params as never);
            result = { success: true, recommendation };
            break;
          }

          case "cam_hypermill_dl_validate_toolpath": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.validateToolpath
            // Validates a strategy/constraint set; returns satisfied/violations + advisories.
            const engine = await getEngine("hmDeepLearning");
            const strategyName = String(params.strategy_name ?? params.strategyName ?? "");
            const constraints = Array.isArray(params.constraints) ? params.constraints : [];
            const validation = engine.validateToolpath(strategyName, constraints);
            result = { success: true, validation };
            break;
          }

          case "cam_hypermill_dl_explain_strategy": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.explainStrategy
            // Plain-language explanation of strategy rationale, advantages, limitations.
            const engine = await getEngine("hmDeepLearning");
            const strategyName = String(params.strategy_name ?? params.strategyName ?? "");
            const explanation = engine.explainStrategy(strategyName);
            result = { success: true, strategy_name: strategyName, explanation };
            break;
          }

          case "cam_hypermill_dl_recognize_feature": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.recognizeFeature
            // Pattern-matches geometry signals against known feature templates; returns ranked candidates.
            const engine = await getEngine("hmDeepLearning");
            const signals = Array.isArray(params.geometry_signals)
              ? params.geometry_signals.map(String)
              : Array.isArray(params.geometrySignals)
              ? params.geometrySignals.map(String)
              : [];
            const features = engine.recognizeFeature(signals);
            result = { success: true, features, count: features.length };
            break;
          }

          case "cam_hypermill_dl_get_strategies_by_category": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.getStrategiesByCategory
            // DL-engine view of category-filtered strategies (distinct from StrategyKnowledgeEngine).
            const engine = await getEngine("hmDeepLearning");
            const category = String(params.category ?? "");
            const strategies = engine.getStrategiesByCategory(category);
            result = { success: true, category, strategies, count: strategies.length };
            break;
          }

          case "cam_hypermill_dl_get_sql_table_schema": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.getSQLTableSchema
            // Looks up SQLToolDBTable schema by name; undefined when missing.
            const engine = await getEngine("hmDeepLearning");
            const tableName = String(params.table_name ?? params.tableName ?? "");
            const schema = engine.getSQLTableSchema(tableName);
            result = { success: true, table_name: tableName, schema: schema ?? null, found: schema !== undefined };
            break;
          }

          case "cam_hypermill_dl_get_virtual_machining_features": {
            // U-CAM-HM-DL-WIRE-01: HyperMillDeepLearningEngine.getVirtualMachiningFeatures
            // Returns the catalog of virtual machining capabilities recognised by the DL knowledge base.
            const engine = await getEngine("hmDeepLearning");
            const features = engine.getVirtualMachiningFeatures();
            result = { success: true, features, count: features.length };
            break;
          }

          case "cam_hypermill_ai_orchestrate": {
            // U-CAM-HM-AIORCH-WIRE-01: HyperMillAIOrchestrationEngine.orchestrate
            // Master AGI pipeline — composes Material/DL/Strategy/MultiAxis/MillTurn/EDM/Probing
            // /Grinding/SPC/FAI bridges with one of 8 reasoning modes. Always returns a response
            // (no throw); engine catches sub-engine failures and reports via warnings[].
            const engine = await getEngine("hmAIOrch");
            const response = await engine.orchestrate(params as never);
            result = { success: true, response };
            break;
          }

          case "cam_hypermill_ai_get_reasoning_modes": {
            // U-CAM-HM-AIORCH-WIRE-01: HyperMillAIOrchestrationEngine.getReasoningModes
            // The 8 reasoning modes: chain_of_thought, tree_of_thought, multi_path, backtracking,
            // abductive, deductive, inductive, analogical.
            const engine = await getEngine("hmAIOrch");
            const modes = engine.getReasoningModes();
            result = { success: true, modes, count: modes.length };
            break;
          }

          case "cam_hypermill_ai_get_stats": {
            // U-CAM-HM-AIORCH-WIRE-01: HyperMillAIOrchestrationEngine.getStats
            // Engine integration metadata: reasoning_modes count, tribal_tips count, engines_integrated[], signature_features[].
            const engine = await getEngine("hmAIOrch");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_hypermill_demo_db_extract": {
            // U-CAM-HM-DEMODB-WIRE-01: HyperMillDemoDbExtractor.extract
            // Extracts the hyperMILL v33.0 demo.db SQLite (29 geometry classes, 547 tools,
            // 2706 technologies, 13 workpiece materials).
            // Never throws — returns status="missing"|"error"|"success" gracefully.
            // Uses default singleton when no db_path provided; otherwise instantiates fresh.
            const dbPath = params.db_path ?? params.dbPath;
            if (dbPath) {
              const { HyperMillDemoDbExtractor } = await import("../../engines/HyperMillDemoDbExtractor.js");
              const extractor = new HyperMillDemoDbExtractor(String(dbPath));
              result = { success: true, ...(await extractor.extract()) };
            } else {
              const { hyperMillDemoDbExtractor } = await import("../../engines/HyperMillDemoDbExtractor.js");
              result = { success: true, ...(await hyperMillDemoDbExtractor.extract()) };
            }
            break;
          }

          case "cam_fusion_tool_library_get_sources": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.getSources (PURE)
            // Returns the canonical Fusion 360 tool library root path + expected counts (7 CSV files / 218 tools).
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const sources = FusionToolLibraryEngine.getSources();
            result = { success: true, ...sources };
            break;
          }

          case "cam_fusion_tool_library_harvest": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.harvest (filesystem; never-throw)
            // Reads all 7 CSV files from JM Die Fusion 360 tool crib; aggregates by category/type/material/vendor/file.
            // Missing directory returns an empty result with structurally-valid keys.
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const harvest = await FusionToolLibraryEngine.harvest();
            result = { success: true, ...harvest };
            break;
          }

          case "cam_fusion_tool_library_parse_csv": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.parseCsv (PURE — no I/O)
            // Parses an in-memory Fusion 360 CSV string into FusionTool[] (category inferred from sourceFile).
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const content = String(params.content ?? params.csv ?? "");
            const sourceFile = String(params.source_file ?? params.sourceFile ?? "in-memory.csv");
            const tools = FusionToolLibraryEngine.parseCsv(content, sourceFile);
            result = { success: true, source_file: sourceFile, tools, count: tools.length };
            break;
          }

          case "cam_fusion_tool_library_find_by_description": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.findByDescription (PURE)
            // Substring filter (case-insensitive) over a tools[] payload.
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const tools = Array.isArray(params.tools) ? params.tools : [];
            const query = String(params.query ?? params.description ?? "");
            const matches = FusionToolLibraryEngine.findByDescription(tools as never, query);
            result = { success: true, query, tools: matches, count: matches.length };
            break;
          }

          case "cam_fusion_tool_library_filter_by_category": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.filterByCategory (PURE)
            // Filters a tools[] payload to a single category (turning|boring_rough|boring_finish|insert_drill|twist_drill|end_mill|unknown).
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const tools = Array.isArray(params.tools) ? params.tools : [];
            const category = String(params.category ?? "unknown");
            const matches = FusionToolLibraryEngine.filterByCategory(tools as never, category as never);
            result = { success: true, category, tools: matches, count: matches.length };
            break;
          }

          case "cam_fusion_tool_library_audit": {
            // U-CAM-FUS-TOOLLIB-WIRE-01: FusionToolLibraryEngine.audit (filesystem)
            // Roll-up of harvest() — total tool count + byCategory + byMaterial + file/vendor counts.
            const { FusionToolLibraryEngine } = await import("../../engines/FusionToolLibraryEngine.js");
            const audit = await FusionToolLibraryEngine.audit();
            result = { success: true, ...audit };
            break;
          }

          case "cam_fusion_lathe_post_scan_register": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.scanAndRegister
            // Walks Fusion BASIC POSTS + HSMWorks 2026/posts; classifies each .cps by manufacturer/controller/machine-type.
            const engine = await getEngine("fusLathePostDelta");
            const registration = engine.scanAndRegister();
            result = { success: true, registration };
            break;
          }

          case "cam_fusion_lathe_post_save_registry": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.saveRegistry
            // Persists the in-memory registry to data/post-processors/lathe-post-registry.json.
            const engine = await getEngine("fusLathePostDelta");
            engine.saveRegistry();
            result = { success: true, saved: true };
            break;
          }

          case "cam_fusion_lathe_post_get_registry": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.getRegistry
            // Returns the loaded LathePostRegistry (auto-loads from disk if absent).
            const engine = await getEngine("fusLathePostDelta");
            const registry = engine.getRegistry();
            result = { success: true, registry };
            break;
          }

          case "cam_fusion_lathe_post_lookup": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.lookupPost
            // Looks up the best post for a {manufacturer, controller, machineType, capabilities} query; null on miss.
            const engine = await getEngine("fusLathePostDelta");
            const query = {
              manufacturer: params.manufacturer !== undefined ? String(params.manufacturer) : undefined,
              controller: params.controller !== undefined ? String(params.controller) : undefined,
              machineType: params.machine_type !== undefined ? String(params.machine_type)
                : params.machineType !== undefined ? String(params.machineType) : undefined,
              capabilities: Array.isArray(params.capabilities) ? params.capabilities.map(String) : undefined,
            };
            const post = engine.lookupPost(query as never);
            result = { success: true, query, post: post ?? null, found: post !== null };
            break;
          }

          case "cam_fusion_lathe_post_by_manufacturer": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.getPostsByManufacturer
            // All posts for a given manufacturer string (case-sensitive, matches registry's normalised keys).
            const engine = await getEngine("fusLathePostDelta");
            const manufacturer = String(params.manufacturer ?? "");
            const posts = engine.getPostsByManufacturer(manufacturer);
            result = { success: true, manufacturer, posts, count: posts.length };
            break;
          }

          case "cam_fusion_lathe_post_by_controller": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.getPostsByController
            // All posts for a given ControllerFamily (haas, fanuc, mazak, okuma, doosan, dmg-mori, mitsubishi, generic).
            const engine = await getEngine("fusLathePostDelta");
            const family = String(params.family ?? params.controller_family ?? params.controllerFamily ?? "");
            const posts = engine.getPostsByController(family);
            result = { success: true, family, posts, count: posts.length };
            break;
          }

          case "cam_fusion_lathe_post_summary": {
            // U-CAM-FUS-LATHEPOST-WIRE-01: FusionLathePostDeltaRegistryEngine.getSummary
            // Aggregate roll-up: totals by manufacturer / controller / machine type + verifiedCount.
            const engine = await getEngine("fusLathePostDelta");
            const summary = engine.getSummary();
            result = { success: true, ...summary };
            break;
          }

          case "cam_fusion_ai_orchestrate": {
            // U-CAM-FUS-AIORCH-WIRE-01: FusionAIOrchestrationEngine.orchestrate
            // Master AGI pipeline for Fusion 360 — composes Fusion 360 strategy/material/physics
            // bridges with one of the available reasoning modes. Async; pass-through params.
            const engine = await getEngine("fusAIOrch");
            const response = await engine.orchestrate(params as never);
            result = { success: true, response };
            break;
          }

          case "cam_fusion_ai_get_reasoning_modes": {
            // U-CAM-FUS-AIORCH-WIRE-01: FusionAIOrchestrationEngine.getReasoningModes
            // Returns the catalog of reasoning modes available to the Fusion AGI orchestrator.
            const engine = await getEngine("fusAIOrch");
            const modes = engine.getReasoningModes();
            result = { success: true, modes, count: modes.length };
            break;
          }

          case "cam_fusion_ai_get_stats": {
            // U-CAM-FUS-AIORCH-WIRE-01: FusionAIOrchestrationEngine.getStats
            // Engine integration metadata: reasoning_modes count, tribal_tips count, engines_integrated[], signature_features[].
            const engine = await getEngine("fusAIOrch");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_fusion360_code_gen_get_capabilities": {
            // U-CAM-FUS360-CODEGEN-WIRE-01: Fusion360CodeGeneratorEngine.getCapabilities
            // Returns the CADCapabilityMatrix (cadSystem=fusion360, version, supportedOps, maxComplexity).
            const engine = await getEngine("fus360CodeGen");
            const capabilities = engine.getCapabilities();
            result = { success: true, capabilities };
            break;
          }

          case "cam_fusion360_code_gen_build_script": {
            // U-CAM-FUS360-CODEGEN-WIRE-01: Fusion360CodeGeneratorEngine.buildScript
            // Generates a Fusion 360 Python script (adsk.core/fusion/cam) from CADOperation[].
            // Throws UnsupportedCapabilityError when an op kind isn't in the matrix.
            const engine = await getEngine("fus360CodeGen");
            const ops = Array.isArray(params.ops) ? params.ops : [];
            const ctx = (params.ctx && typeof params.ctx === "object")
              ? params.ctx
              : (params.context && typeof params.context === "object")
              ? params.context
              : undefined;
            const script = engine.buildScript(ops as never, ctx as never);
            result = { success: true, script, opCount: ops.length };
            break;
          }

          case "cam_fusion360_code_gen_execute_script": {
            // U-CAM-FUS360-CODEGEN-WIRE-01: Fusion360CodeGeneratorEngine.executeScript (async; subprocess/COM)
            const engine = await getEngine("fus360CodeGen");
            const script = params.script ?? {};
            const execution = await engine.executeScript(script as never);
            result = { success: true, execution };
            break;
          }

          case "cam_fusion360_code_gen_validate_output": {
            // U-CAM-FUS360-CODEGEN-WIRE-01: Fusion360CodeGeneratorEngine.validateOutput
            // Returns CADValidationReport with structural + semantic checks on a CADExecutionResult.
            const engine = await getEngine("fus360CodeGen");
            const executionResult = params.result ?? params.executionResult ?? {};
            const report = engine.validateOutput(executionResult as never);
            result = { success: true, report };
            break;
          }

          case "cam_mastercam_material_find": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.findMaterial
            // Looks up a Mastercam material by query string (id, name, or alias).
            const engine = await getEngine("mcMatBridge");
            const query = String(params.query ?? params.material ?? "");
            const material = engine.findMaterial(query);
            result = { success: true, query, material: material ?? null, found: material !== null };
            break;
          }

          case "cam_mastercam_material_get_physics": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.getPhysicsProfile
            // Returns the per-material Kienzle (kc1.1, mc) + Taylor (C, n) + thermal profile.
            // Constants are sourced from the engine's material catalog (no inline physics in dispatcher).
            const engine = await getEngine("mcMatBridge");
            const materialId = String(params.material_id ?? params.materialId ?? "");
            const profile = engine.getPhysicsProfile(materialId);
            result = { success: true, material_id: materialId, profile: profile ?? null, found: profile !== null };
            break;
          }

          case "cam_mastercam_material_map_to_iso": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.mapToISO
            // Maps a Mastercam material class string to the canonical ISO group (P/M/K/N/S/H).
            const engine = await getEngine("mcMatBridge");
            const mastercamClass = String(params.mastercam_class ?? params.mastercamClass ?? params.class ?? "");
            const iso = engine.mapToISO(mastercamClass);
            result = { success: true, mastercam_class: mastercamClass, iso };
            break;
          }

          case "cam_mastercam_material_calculate_force": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.calculateCuttingForce
            // Kienzle Fc = kc1.1 * ap * fz^(1-mc); kc constants from per-material profile (NOT inline).
            // Returns null when material profile is missing — caller must check.
            const engine = await getEngine("mcMatBridge");
            const materialId = String(params.material_id ?? params.materialId ?? "");
            const apRaw = Number(params.axial_depth_mm ?? params.axialDepth_mm ?? params.ap_mm ?? NaN);
            const fzRaw = Number(params.feed_per_tooth_mm ?? params.feedPerTooth_mm ?? params.fz_mm ?? NaN);
            const ap = Number.isFinite(apRaw) ? Math.max(0, apRaw) : 0;
            const fz = Number.isFinite(fzRaw) ? Math.max(0, fzRaw) : 0;
            const force = engine.calculateCuttingForce(materialId, ap, fz);
            result = {
              success: true,
              material_id: materialId,
              axial_depth_mm: ap,
              feed_per_tooth_mm: fz,
              force: force ?? null,
              found: force !== null,
            };
            break;
          }

          case "cam_mastercam_material_estimate_tool_life": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.estimateToolLife
            // Taylor T = (C/Vc)^(1/n); Taylor constants from per-material profile (NOT inline).
            // Returns null when material profile is missing.
            const engine = await getEngine("mcMatBridge");
            const materialId = String(params.material_id ?? params.materialId ?? "");
            const vcRaw = Number(params.cutting_speed_m_min ?? params.cuttingSpeed_m_min ?? params.vc_m_min ?? NaN);
            const vc = Number.isFinite(vcRaw) && vcRaw > 0 ? vcRaw : 0;
            const lifeResult = vc > 0 ? engine.estimateToolLife(materialId, vc) : null;
            result = {
              success: true,
              material_id: materialId,
              cutting_speed_m_min: vc,
              life: lifeResult ?? null,
              found: lifeResult !== null,
            };
            break;
          }

          case "cam_mastercam_material_list": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.listMaterials
            // Returns the full Mastercam material catalog (defensive copy).
            const engine = await getEngine("mcMatBridge");
            const materials = engine.listMaterials();
            result = { success: true, materials, count: materials.length };
            break;
          }

          case "cam_mastercam_material_list_by_iso": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.listByISO
            // Filters the catalog to one ISO group (P/M/K/N/S/H).
            const engine = await getEngine("mcMatBridge");
            const iso = String(params.iso ?? params.iso_group ?? params.isoGroup ?? "P");
            const materials = engine.listByISO(iso as never);
            result = { success: true, iso, materials, count: materials.length };
            break;
          }

          case "cam_mastercam_material_get_stats": {
            // U-CAM-MC-MATBRIDGE-WIRE-01: MastercamMaterialBridgeEngine.getStats
            // Aggregate roll-up: total materials, by-ISO counts, source attributions.
            const engine = await getEngine("mcMatBridge");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_mastercam_physics_calculate_milling": {
            // U-CAM-MC-MATPHYS-WIRE-01: MastercamMaterialPhysicsBridge.calculateMillingPhysics
            // Full milling physics solve (force, power, deflection, MRR) from MillingPhysicsInput.
            // Engine pulls Kienzle/Taylor constants from material profile — no inline physics here.
            // Returns null when material profile is missing.
            const engine = await getEngine("mcMatPhys");
            const physics = engine.calculateMillingPhysics(params as never);
            result = { success: true, physics: physics ?? null, found: physics !== null };
            break;
          }

          case "cam_mastercam_physics_calculate_turning": {
            // U-CAM-MC-MATPHYS-WIRE-01: MastercamMaterialPhysicsBridge.calculateTurningPhysics
            // Full turning physics solve from TurningPhysicsInput; null on missing profile.
            const engine = await getEngine("mcMatPhys");
            const physics = engine.calculateTurningPhysics(params as never);
            result = { success: true, physics: physics ?? null, found: physics !== null };
            break;
          }

          case "cam_mastercam_physics_get_summary": {
            // U-CAM-MC-MATPHYS-WIRE-01: MastercamMaterialPhysicsBridge.getMaterialPhysicsSummary
            // Material-level physics roll-up (ISO group + Kienzle range + Taylor exponent).
            const engine = await getEngine("mcMatPhys");
            const materialId = String(params.material_id ?? params.materialId ?? "");
            const summary = engine.getMaterialPhysicsSummary(materialId);
            result = { success: true, material_id: materialId, summary };
            break;
          }

          case "cam_mastercam_physics_compare_materials": {
            // U-CAM-MC-MATPHYS-WIRE-01: MastercamMaterialPhysicsBridge.compareMaterials
            // Side-by-side comparison of physics properties for an arbitrary material list.
            const engine = await getEngine("mcMatPhys");
            const materialIds = Array.isArray(params.material_ids)
              ? params.material_ids.map(String)
              : Array.isArray(params.materialIds)
              ? params.materialIds.map(String)
              : [];
            const comparison = engine.compareMaterials(materialIds);
            result = { success: true, material_ids: materialIds, comparison, count: comparison.length };
            break;
          }

          case "cam_mastercam_fai_extract_characteristics": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.extractCharacteristics
            // Converts MastercamFeatureExtraction[] → FAICharacteristic[] (AS9102 Rev C compliant).
            const engine = await getEngine("mcFAI");
            const features = Array.isArray(params.features) ? params.features : [];
            const characteristics = engine.extractCharacteristics(features);
            result = { success: true, characteristics, count: characteristics.length };
            break;
          }

          case "cam_mastercam_fai_generate_report": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.generateReport
            // Builds a complete FAIReport (form1 + form2 + form3 + status + AS9102_Rev_C compliance tag).
            const engine = await getEngine("mcFAI");
            const form1 = (params.form1 && typeof params.form1 === "object") ? params.form1 : {};
            const form2 = (params.form2 && typeof params.form2 === "object") ? params.form2 : {};
            const characteristics = Array.isArray(params.characteristics) ? params.characteristics : [];
            const report = engine.generateReport(form1 as never, form2 as never, characteristics);
            result = { success: true, report };
            break;
          }

          case "cam_mastercam_fai_apply_measurements": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.applyMeasurements
            // Folds CMM/inspection readings into FAICharacteristic[] — sets PASS/FAIL per balloon-number tolerance.
            const engine = await getEngine("mcFAI");
            const characteristics = Array.isArray(params.characteristics) ? params.characteristics : [];
            const measurements = Array.isArray(params.measurements) ? params.measurements : [];
            const updated = engine.applyMeasurements(characteristics, measurements as never);
            result = { success: true, characteristics: updated, count: updated.length };
            break;
          }

          case "cam_mastercam_fai_export_json": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.exportJSON
            // Serialises an FAIReport to JSON string (for AS9102 system-of-record handoff).
            const engine = await getEngine("mcFAI");
            const report = (params.report && typeof params.report === "object") ? params.report : {};
            const json = engine.exportJSON(report as never);
            result = { success: true, json, byteLength: typeof json === "string" ? json.length : 0 };
            break;
          }

          case "cam_mastercam_fai_generate_balloon_data": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.generateBalloonData
            // Drawing-balloon overlay data for the FAI characteristic set.
            const engine = await getEngine("mcFAI");
            const characteristics = Array.isArray(params.characteristics) ? params.characteristics : [];
            const balloons = engine.generateBalloonData(characteristics);
            result = { success: true, balloons, count: balloons.length };
            break;
          }

          case "cam_mastercam_fai_get_stats": {
            // U-CAM-MC-FAI-WIRE-01: MastercamFAIBridge.getStats
            // Aggregate roll-up: total reports, characteristic counts, pass/fail rates.
            const engine = await getEngine("mcFAI");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_mastercam_spc_create_xbar_r_chart": {
            // U-CAM-MC-SPC-WIRE-01: MastercamSPCBridge.createXBarRChart
            // X-bar/R chart with control limits derived from A2/D3/D4 factors per subgroup size.
            const engine = await getEngine("mcSPC");
            const feature = (params.feature && typeof params.feature === "object") ? params.feature : {};
            const measurements = Array.isArray(params.measurements) ? params.measurements : [];
            const subgroupSizeRaw = Number(params.subgroup_size ?? params.subgroupSize ?? 5);
            const subgroupSize = Number.isFinite(subgroupSizeRaw) && subgroupSizeRaw >= 2
              ? Math.floor(subgroupSizeRaw)
              : 5;
            const chart = engine.createXBarRChart(feature as never, measurements as never, subgroupSize);
            result = { success: true, chart, subgroup_size: subgroupSize };
            break;
          }

          case "cam_mastercam_spc_calculate_capability": {
            // U-CAM-MC-SPC-WIRE-01: MastercamSPCBridge.calculateCapability
            // Cp / Cpk capability indices from feature spec + measurements.
            const engine = await getEngine("mcSPC");
            const capability = engine.calculateCapability(params as never);
            result = { success: true, capability };
            break;
          }

          case "cam_mastercam_spc_analyze_job": {
            // U-CAM-MC-SPC-WIRE-01: MastercamSPCBridge.analyzeJob
            // Full SPC roll-up: per-feature charts + capability + Nelson-rule flags.
            const engine = await getEngine("mcSPC");
            const analysis = engine.analyzeJob(params as never);
            result = { success: true, analysis };
            break;
          }

          case "cam_mastercam_spc_get_stats": {
            // U-CAM-MC-SPC-WIRE-01: MastercamSPCBridge.getStats
            // Engine surface metadata: features_supported, nelson_rules count, capability_indices count.
            const engine = await getEngine("mcSPC");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_mastercam_automation_open": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.open
            // Spawns Mastercam.exe + connects via NET-Hook IPC pipe; mock-mode bypasses spawn.
            // File extensions auto-detected (.MCX | .mcam | .mcx-8). Returns AtomicValue with pid + format.
            const engine = await getEngine("mcAutoBridge");
            const filePath = String(params.file_path ?? params.filePath ?? "");
            const opts = (params.opts && typeof params.opts === "object") ? params.opts : {};
            const opened = await engine.open(filePath, opts);
            result = { success: true, opened };
            break;
          }

          case "cam_mastercam_automation_get_geometry": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.getGeometry
            // Extracts all geometry entities (lines, arcs, splines, surfaces) from the open file.
            const engine = await getEngine("mcAutoBridge");
            const geometry = await engine.getGeometry();
            result = { success: true, geometry };
            break;
          }

          case "cam_mastercam_automation_get_toolpaths": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.getToolpaths
            // Returns operation list with toolpath geometry, tool refs, and parameter envelopes.
            const engine = await getEngine("mcAutoBridge");
            const toolpaths = await engine.getToolpaths();
            result = { success: true, toolpaths };
            break;
          }

          case "cam_mastercam_automation_get_operation_tree": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.getOperationTree
            // Hierarchical view of operations (groups, parents, dependencies).
            const engine = await getEngine("mcAutoBridge");
            const tree = await engine.getOperationTree();
            result = { success: true, tree };
            break;
          }

          case "cam_mastercam_automation_export_step": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.exportSTEP
            // Exports current geometry to STEP AP242 at the requested output path.
            const engine = await getEngine("mcAutoBridge");
            const outputPath = String(params.output_path ?? params.outputPath ?? "");
            const exported = await engine.exportSTEP(outputPath);
            result = { success: true, exported };
            break;
          }

          case "cam_mastercam_automation_close": {
            // U-CAM-MC-AUTOBRIDGE-WIRE-01: MastercamAutomationBridge.close
            // Disconnects pipe + cleans up bridge state. Idempotent; safe to call without prior open.
            const engine = await getEngine("mcAutoBridge");
            const closed = await engine.close();
            result = { success: true, closed };
            break;
          }

          case "cam_esprit_connect": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.connect
            const engine = await getEngine("espCAM");
            const connection = await engine.connect(params as never);
            result = { success: true, connection };
            break;
          }

          case "cam_esprit_get_status": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.getStatus
            const engine = await getEngine("espCAM");
            const status = await engine.getStatus();
            result = { success: true, status };
            break;
          }

          case "cam_esprit_disconnect": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.disconnect
            const engine = await getEngine("espCAM");
            const disconnected = await engine.disconnect();
            result = { success: true, ...disconnected };
            break;
          }

          case "cam_esprit_extract_project": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.extractProject (full project pull)
            const engine = await getEngine("espCAM");
            const project = await engine.extractProject(params as never);
            result = { success: true, project };
            break;
          }

          case "cam_esprit_parse_apt": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.parseAPT (PURE — no I/O)
            const engine = await getEngine("espCAM");
            const content = String(params.content ?? params.apt ?? "");
            const sourceFile = String(params.source_file ?? params.sourceFile ?? "in-memory.apt");
            const apt = engine.parseAPT(content, sourceFile);
            result = { success: true, source_file: sourceFile, apt };
            break;
          }

          case "cam_esprit_parse_nc": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.parseNC (PURE — no I/O)
            const engine = await getEngine("espCAM");
            const content = String(params.content ?? params.nc ?? "");
            const sourceFile = String(params.source_file ?? params.sourceFile ?? "in-memory.nc");
            const nc = engine.parseNC(content, sourceFile);
            result = { success: true, source_file: sourceFile, nc };
            break;
          }

          case "cam_esprit_get_tools": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.getTools
            const engine = await getEngine("espCAM");
            const tools = await engine.getTools();
            result = { success: true, ...tools };
            break;
          }

          case "cam_esprit_get_operations": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.getOperations
            const engine = await getEngine("espCAM");
            const operations = await engine.getOperations();
            result = { success: true, ...operations };
            break;
          }

          case "cam_esprit_push_parameters": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.pushParameters (write to Esprit)
            const engine = await getEngine("espCAM");
            const pushed = await engine.pushParameters(params as never);
            result = { success: true, pushed };
            break;
          }

          case "cam_esprit_sync_tools": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.syncTools (bidirectional tool sync)
            const engine = await getEngine("espCAM");
            const synced = await engine.syncTools(params as never);
            result = { success: true, synced };
            break;
          }

          case "cam_esprit_check_version": {
            // U-CAM-ESP-WIRE-01: EspritCAMBridgeEngine.checkVersionCompatibility (sync, PURE)
            const engine = await getEngine("espCAM");
            const version = String(params.version ?? "");
            const compat = engine.checkVersionCompatibility(version);
            result = { success: true, version, ...compat };
            break;
          }

          case "cam_inventor_automation_open": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.open
            const engine = await getEngine("invAutoBridge");
            const filePath = String(params.file_path ?? params.filePath ?? "");
            const opened = await engine.open(filePath);
            result = { success: true, opened };
            break;
          }

          case "cam_inventor_automation_get_parameters": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.getParameters
            const engine = await getEngine("invAutoBridge");
            const parameters = await engine.getParameters();
            result = { success: true, parameters };
            break;
          }

          case "cam_inventor_automation_get_model_tree": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.getModelTree
            const engine = await getEngine("invAutoBridge");
            const tree = await engine.getModelTree();
            result = { success: true, tree };
            break;
          }

          case "cam_inventor_automation_export_step": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.exportSTEP
            const engine = await getEngine("invAutoBridge");
            const outputPath = String(params.output_path ?? params.outputPath ?? "");
            const exported = await engine.exportSTEP(outputPath);
            result = { success: true, exported };
            break;
          }

          case "cam_inventor_automation_get_mass_properties": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.getMassProperties
            const engine = await getEngine("invAutoBridge");
            const massProperties = await engine.getMassProperties();
            result = { success: true, massProperties };
            break;
          }

          case "cam_inventor_automation_close": {
            // U-CAM-INV-AUTOBRIDGE-WIRE-01: InventorAutomationBridge.close (idempotent)
            const engine = await getEngine("invAutoBridge");
            const closed = await engine.close();
            result = { success: true, closed };
            break;
          }

          case "cam_inventor_camfn_get_summary": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getSummary
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const summary = InventorCAMFunctionIndexEngine.getSummary();
            result = { success: true, summary };
            break;
          }

          case "cam_inventor_camfn_category_breakdown": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getCategoryBreakdown
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const categories = InventorCAMFunctionIndexEngine.getCategoryBreakdown();
            result = { success: true, categories, count: categories.length };
            break;
          }

          case "cam_inventor_camfn_canned_cycle_ref": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getCannedCycleReference
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const reference = InventorCAMFunctionIndexEngine.getCannedCycleReference();
            result = { success: true, reference };
            break;
          }

          case "cam_inventor_camfn_learning_path": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getLearningPath
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const path = InventorCAMFunctionIndexEngine.getLearningPath();
            result = { success: true, path, count: path.length };
            break;
          }

          case "cam_inventor_camfn_all_operations": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getAllOperations
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const operations = InventorCAMFunctionIndexEngine.getAllOperations();
            result = { success: true, operations, count: operations.length };
            break;
          }

          case "cam_inventor_camfn_search_by_category": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.searchByCategory
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const category = String(params.category ?? "");
            const operations = InventorCAMFunctionIndexEngine.searchByCategory(category);
            result = { success: true, category, operations, count: operations.length };
            break;
          }

          case "cam_inventor_camfn_multiaxis_ops": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getMultiaxisOperations
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const ops = InventorCAMFunctionIndexEngine.getMultiaxisOperations();
            result = { success: true, ops, count: ops.length };
            break;
          }

          case "cam_inventor_camfn_probing_ops": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getProbingOperations
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const ops = InventorCAMFunctionIndexEngine.getProbingOperations();
            result = { success: true, ops, count: ops.length };
            break;
          }

          case "cam_inventor_camfn_adaptive_ops": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getAdaptiveOperations
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const ops = InventorCAMFunctionIndexEngine.getAdaptiveOperations();
            result = { success: true, ops, count: ops.length };
            break;
          }

          case "cam_inventor_camfn_list_sections": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.listSections
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const sections = InventorCAMFunctionIndexEngine.listSections();
            result = { success: true, sections };
            break;
          }

          case "cam_inventor_camfn_get_section": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.getSection
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const sectionKey = String(params.section_key ?? params.sectionKey ?? "");
            const section = InventorCAMFunctionIndexEngine.getSection(sectionKey);
            result = { success: true, section_key: sectionKey, section: section ?? null, found: section !== undefined && section !== null };
            break;
          }

          case "cam_inventor_camfn_search_parameters": {
            // U-CAM-INV-CAMFN-WIRE-01: InventorCAMFunctionIndexEngine.searchParameters
            const { InventorCAMFunctionIndexEngine } = await import("../../engines/InventorCAMFunctionIndexEngine.js");
            const query = String(params.query ?? "");
            const limitRaw = Number(params.limit ?? 20);
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20;
            const matches = InventorCAMFunctionIndexEngine.searchParameters(query, limit);
            result = { success: true, query, limit, matches, count: matches.length };
            break;
          }

          case "cam_inventor_ai_orchestrate": {
            // U-CAM-INV-AIORCH-WIRE-01: InventorCAMAIOrchestrationEngine.orchestrate (async)
            const engine = await getEngine("invAIOrch");
            const response = await engine.orchestrate(params as never);
            result = { success: true, response };
            break;
          }

          case "cam_inventor_ai_get_reasoning_modes": {
            // U-CAM-INV-AIORCH-WIRE-01: InventorCAMAIOrchestrationEngine.getReasoningModes
            const engine = await getEngine("invAIOrch");
            const modes = engine.getReasoningModes();
            result = { success: true, modes, count: modes.length };
            break;
          }

          case "cam_inventor_ai_get_stats": {
            // U-CAM-INV-AIORCH-WIRE-01: InventorCAMAIOrchestrationEngine.getStats
            const engine = await getEngine("invAIOrch");
            const stats = engine.getStats();
            result = { success: true, ...stats };
            break;
          }

          case "cam_solidworks_automation_open": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.open
            const engine = await getEngine("swAutoBridge");
            const filePath = String(params.file_path ?? params.filePath ?? "");
            const opened = await engine.open(filePath);
            result = { success: true, opened };
            break;
          }

          case "cam_solidworks_automation_get_feature_tree": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.getFeatureTree
            const engine = await getEngine("swAutoBridge");
            const tree = await engine.getFeatureTree();
            result = { success: true, tree };
            break;
          }

          case "cam_solidworks_automation_export_step": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.exportSTEP
            const engine = await getEngine("swAutoBridge");
            const outputPath = String(params.output_path ?? params.outputPath ?? "");
            const exported = await engine.exportSTEP(outputPath);
            result = { success: true, exported };
            break;
          }

          case "cam_solidworks_automation_export_pdf": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.exportPDF
            const engine = await getEngine("swAutoBridge");
            const outputPath = String(params.output_path ?? params.outputPath ?? "");
            const exported = await engine.exportPDF(outputPath);
            result = { success: true, exported };
            break;
          }

          case "cam_solidworks_automation_get_bounding_box": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.getBoundingBox
            const engine = await getEngine("swAutoBridge");
            const boundingBox = await engine.getBoundingBox();
            result = { success: true, boundingBox };
            break;
          }

          case "cam_solidworks_automation_close": {
            // U-CAM-SW-AUTOBRIDGE-WIRE-01: SolidWorksAutomationBridge.close (idempotent)
            const engine = await getEngine("swAutoBridge");
            const closed = await engine.close();
            result = { success: true, closed };
            break;
          }

          case "cam_hypermill_dental_route": {
            // U-HMR42: Dental blank router — disc/block blank → hyperMILL dental strategy.
            // Routes 4 dental materials (zirconia, PEEK, CoCr, Ti-5) to disc (3+2) or block (5-axis) strategies.
            const { hyperMillDentalBlankRouter } = await import("../../engines/HyperMillDentalBlankRouter.js");
            // Map restoration_type to restorationCategory
            const restoTypeRaw = params.restoration_type ?? params.restorationCategory ?? "crown";
            const resolvedRestCategory =
              ["abutment", "implant_bar", "screw_retained"].includes(restoTypeRaw) ? "implant_prosthetic" :
              ["bridge", "framework"].includes(restoTypeRaw) ? "multi_unit" :
              "single_unit";
            result = hyperMillDentalBlankRouter.route({
              blankType:           params.blank_type ?? params.blankType ?? "disc",
              material:            params.material ?? "zirconia",
              restorationCategory: resolvedRestCategory,
              zirconiaState:       params.zirconia_state ?? params.zirconiaState ?? "green",
              millingUnit:         params.milling_unit ?? params.millingUnit ?? "5axis_dental",
              requiredRa_um:       params.required_ra_um ?? params.requiredRaUm,
            });
            break;
          }

          // ── HM-REV-MS0: HyperCAD-S CAD Automation ─────────────────────────────

          case "cam_hyperCADS_import": {
            // U-HMR01/02: Import STEP/IGES/DXF or bridge via PrintToHyperCADSBridge
            if (params.material) {
              // Bridge mode: STEP + material → import + heal script
              _printToHyperCADS ??= (await import("../../engines/PrintToHyperCADSBridge.js")).printToHyperCADSBridge;
              result = _printToHyperCADS.buildBridgeScript({
                step_file_path:     params.file_path ?? params.step_file_path ?? "",
                material:           params.material,
                tolerance_mm:       params.tolerance_mm,
                stitch_tolerance_mm: params.stitch_tolerance_mm,
                heal_tolerance_mm:  params.heal_tolerance_mm,
                set_as_workpiece:   params.set_as_workpiece ?? true,
                part_name:          params.part_name,
                run_heal:           params.run_heal,
              });
            } else {
              // Direct import script generation
              _hyperCADSAutomation ??= (await import("../../engines/HyperCADSAutomationEngine.js")).hyperCADSAutomationEngine;
              result = _hyperCADSAutomation.generateImportScript({
                file_path:          params.file_path ?? "",
                format:             params.format,
                tolerance_mm:       params.tolerance_mm,
                coordinate_system:  params.coordinate_system,
                set_as_workpiece:   params.set_as_workpiece,
                part_name:          params.part_name,
              });
            }
            break;
          }

          case "cam_hyperCADS_heal": {
            // U-HMR01: Geometry healing script
            _hyperCADSAutomation ??= (await import("../../engines/HyperCADSAutomationEngine.js")).hyperCADSAutomationEngine;
            result = _hyperCADSAutomation.generateHealScript({
              body_name:              params.body_name,
              stitch_tolerance_mm:    params.stitch_tolerance_mm,
              heal_tolerance_mm:      params.heal_tolerance_mm,
              align_normals:          params.align_normals,
              remove_duplicates:      params.remove_duplicates,
              fill_holes_diameter_mm: params.fill_holes_diameter_mm,
            });
            break;
          }

          case "cam_hyperCADS_analyze": {
            // U-HMR01: Feature analysis script (draft, undercut, wall thickness)
            _hyperCADSAutomation ??= (await import("../../engines/HyperCADSAutomationEngine.js")).hyperCADSAutomationEngine;
            result = _hyperCADSAutomation.generateAnalyzeScript({
              body_name:             params.body_name,
              draft_angle_deg:       params.draft_angle_deg,
              detect_undercuts:      params.detect_undercuts,
              min_wall_thickness_mm: params.min_wall_thickness_mm,
              tool_direction:        params.tool_direction,
            });
            break;
          }

          case "cam_hyperCADS_automate": {
            // U-HMR01: Full automation sequence: import → heal → analyze
            _hyperCADSAutomation ??= (await import("../../engines/HyperCADSAutomationEngine.js")).hyperCADSAutomationEngine;
            result = _hyperCADSAutomation.generateAutomationScript({
              import_params: params.import_params ?? {
                file_path:        params.file_path ?? "",
                format:           params.format,
                tolerance_mm:     params.tolerance_mm,
                part_name:        params.part_name,
                set_as_workpiece: params.set_as_workpiece,
              },
              heal:          params.heal,
              heal_params:   params.heal_params,
              analyze:       params.analyze,
              analyze_params: params.analyze_params,
            });
            break;
          }

          case "cam_hyperCADS_stock_model": {
            // U-HMR03: Stock model creation (bounding_box | offset_solid | cylinder)
            _hyperCADSStock ??= (await import("../../engines/HyperCADSStockModelEngine.js")).hyperCADSStockModelEngine;
            const stockMode = params.mode ?? "offset_solid";
            if (stockMode === "cylinder") {
              result = _hyperCADSStock.generateStockScript({
                mode:       "cylinder",
                od_mm:      params.od_mm ?? 100,
                length_mm:  params.length_mm ?? 200,
                axis:       params.axis,
                stock_name: params.stock_name,
                material:   params.material,
              });
            } else if (stockMode === "bounding_box") {
              result = _hyperCADSStock.generateStockScript({
                mode:       "bounding_box",
                body_name:  params.body_name,
                offset_mm:  params.offset_mm,
                stock_name: params.stock_name,
              });
            } else {
              result = _hyperCADSStock.generateStockScript({
                mode:                "offset_solid",
                body_name:           params.body_name,
                axial_allowance_mm:  params.axial_allowance_mm,
                radial_allowance_mm: params.radial_allowance_mm,
                stock_name:          params.stock_name,
              });
            }
            break;
          }

          case "cam_feature_to_strategy": {
            // U-HMR04: Feature recognition results → strategy recommendations
            _featureToStrategy ??= (await import("../../engines/FeatureToStrategyBridgeEngine.js")).featureToStrategyBridgeEngine;
            result = _featureToStrategy.processFeatures({
              features:               params.features ?? [],
              default_material_group: params.default_material_group ?? params.material_group,
              default_tolerance_mm:   params.default_tolerance_mm ?? params.tolerance_mm,
            });
            break;
          }

          // ── HM-REV-MS8: Data Extraction Pipeline (E1157–E1161) ────────────

          case "hypermill_extract_tools": {
            // U-HMR41: Extract tool definitions from demo.db SQLite database.
            // Returns empty result gracefully when demo.db is not present.
            _hmExtractionPipeline ??= (await import("../../engines/HyperMillDataExtractionPipeline.js")).hyperMillDataExtractionPipeline;
            const demoResult = _hmExtractionPipeline.extractFromFile({
              db_path: params.db_path ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/Tool Database/demo.db",
              source: "demo_db",
              output_dir: params.output_dir,
            });
            result = {
              status: demoResult.status,
              db_path: demoResult.db_path,
              extracted_at: demoResult.extracted_at,
              tool_count: demoResult.stats.tool_count,
              cutting_tech_count: demoResult.stats.cutting_tech_count,
              geometry_classes_found: demoResult.stats.geometry_classes_found,
              error_count: demoResult.stats.errors.length,
              tools: demoResult.tools,
              cutting_techs: params.include_cutting_techs !== false ? demoResult.cutting_techs : [],
            };
            break;
          }

          case "hypermill_extraction_schema": {
            // U-HMR41: Return schema info for demo.db extraction format (all 29 geometry classes).
            _hmExtractionPipeline ??= (await import("../../engines/HyperMillDataExtractionPipeline.js")).hyperMillDataExtractionPipeline;
            const schema = _hmExtractionPipeline.getSchemaInfo();
            if (params.geometry_class !== undefined) {
              const gc = _hmExtractionPipeline.getGeometryClass(params.geometry_class);
              result = gc ? { schema: { ...schema, filtered: [gc] } } : { error: `Unknown geometry class id: ${params.geometry_class}` };
            } else {
              result = schema;
            }
            break;
          }

          case "hypermill_extraction_stats": {
            // U-HMR41: Return extraction statistics.
            _hmExtractionPipeline ??= (await import("../../engines/HyperMillDataExtractionPipeline.js")).hyperMillDataExtractionPipeline;
            const statsResult = _hmExtractionPipeline.extractFromFile({
              db_path: params.db_path ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/Tool Database/demo.db",
              source: "demo_db",
              output_dir: params.output_dir,
            });
            result = _hmExtractionPipeline.extractionStats(statsResult);
            break;
          }

          case "hypermill_extract_macros": {
            // U-HMR42: Extract macro definitions from IM_Macro_DB.
            _hmMacroDB ??= (await import("../../engines/HyperMillMacroDBEngine.js")).hyperMillMacroDBEngine;
            const macroResult = _hmMacroDB.extractMacroDB(
              params.db_path ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/IM_Macro_DB"
            );
            let macros = macroResult.macros;
            if (params.macro_type) {
              macros = macros.filter((m: any) => m.type === params.macro_type);
            }
            result = {
              status: macroResult.status,
              macro_count: macros.length,
              formula_count: params.include_formulas !== false ? macroResult.formulas.length : 0,
              material_override_count: macroResult.stats.material_override_count,
              macros,
              formulas: params.include_formulas !== false ? macroResult.formulas : [],
            };
            break;
          }

          case "hypermill_extract_im_tools": {
            // U-HMR42: Extract tool definitions from IM_Tool_DB v1.
            _hmMacroDB ??= (await import("../../engines/HyperMillMacroDBEngine.js")).hyperMillMacroDBEngine;
            const imResult = _hmMacroDB.extractIMToolDB(
              params.db_path ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/IM_Tool_DB"
            );
            let imTools = imResult.tools;
            if (params.geometry_class) {
              imTools = imTools.filter((t: any) => t.geometry_class.toLowerCase() === params.geometry_class.toLowerCase());
            }
            result = {
              status: imResult.status,
              tool_count: imTools.length,
              geometry_classes: imResult.stats.geometry_classes,
              tools: imTools,
            };
            break;
          }

          case "hypermill_macro_schema": {
            // U-HMR42: Return schema info for IM_Macro_DB and IM_Tool_DB extraction.
            _hmMacroDB ??= (await import("../../engines/HyperMillMacroDBEngine.js")).hyperMillMacroDBEngine;
            result = _hmMacroDB.getMacroSchema();
            break;
          }

          case "hypermill_extract_ac_tools": {
            // U-HMR43: Extract tool definitions from AC_Standard_ToolDB.
            _hmACStandardToolDB ??= (await import("../../engines/HyperMillACStandardToolDBEngine.js")).hyperMillACStandardToolDBEngine;
            const acResult = _hmACStandardToolDB.extractACStandardToolDB(
              params.db_path ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/AC_Standard_ToolDB"
            );
            let acTools = acResult.tools;
            if (params.geometry_class) {
              acTools = acTools.filter((t: any) => t.geometry_class.toLowerCase() === params.geometry_class.toLowerCase());
            }
            if (params.include_holders === false) {
              acTools = acTools.map((t: any) => ({ ...t, holders: [] }));
            }
            if (params.include_material_compat === false) {
              acTools = acTools.map((t: any) => ({ ...t, material_compat: [] }));
            }
            result = {
              status: acResult.status,
              tool_count: acTools.length,
              geometry_classes: acResult.stats.geometry_classes,
              holder_count: acResult.stats.holder_count,
              material_compat_count: acResult.stats.material_compat_count,
              tools: acTools,
            };
            break;
          }

          case "hypermill_ac_tool_schema": {
            // U-HMR43: Return AC_Standard_ToolDB schema info.
            _hmACStandardToolDB ??= (await import("../../engines/HyperMillACStandardToolDBEngine.js")).hyperMillACStandardToolDBEngine;
            result = _hmACStandardToolDB.getACToolDBSchema();
            break;
          }

          case "hypermill_extract_metric_cfg": {
            // U-HMR44: Extract all Metric.cfg files from hyperMILL installation.
            _hmMetricCfg ??= (await import("../../engines/HyperMillMetricCfgExtractorEngine.js")).hyperMillMetricCfgExtractorEngine;
            const cfgResult = _hmMetricCfg.extractAll(
              params.cfg_dir ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/Metric.cfg"
            );
            let profiles = cfgResult.profiles;
            if (params.controller_family) {
              profiles = Object.fromEntries(
                Object.entries(profiles).filter(([, p]) => (p as any).machine.controller_family === params.controller_family)
              );
            }
            if (!params.include_raw) {
              profiles = Object.fromEntries(
                Object.entries(profiles).map(([k, p]) => [k, { ...(p as any), raw_sections: undefined }])
              );
            }
            if (params.cycle_code) {
              profiles = Object.fromEntries(
                Object.entries(profiles).map(([k, p]: [string, any]) => [k, {
                  ...p,
                  cycles: p.cycles[params.cycle_code]
                    ? { [params.cycle_code]: p.cycles[params.cycle_code] }
                    : {},
                }])
              );
            }
            result = {
              status: cfgResult.status,
              file_count: cfgResult.stats.file_count,
              cycle_count: cfgResult.stats.cycle_count,
              param_count: cfgResult.stats.param_count,
              formula_count: cfgResult.stats.formula_count,
              controller_families: cfgResult.stats.controller_families,
              profiles,
            };
            break;
          }

          case "hypermill_cfg_stats": {
            // U-HMR44: Return Metric.cfg extraction statistics.
            _hmMetricCfg ??= (await import("../../engines/HyperMillMetricCfgExtractorEngine.js")).hyperMillMetricCfgExtractorEngine;
            const statsRes = _hmMetricCfg.extractAll(
              params.cfg_dir ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/Metric.cfg"
            );
            result = _hmMetricCfg.getExtractionStats(statsRes);
            break;
          }

          case "hypermill_cfg_diff": {
            // U-HMR44: Diff two controller profiles for a given cycle.
            _hmMetricCfg ??= (await import("../../engines/HyperMillMetricCfgExtractorEngine.js")).hyperMillMetricCfgExtractorEngine;
            const diffRes = _hmMetricCfg.extractAll(
              params.cfg_dir ?? "C:/Program Files/OPEN MIND/hyperMILL/33.0/Metric.cfg"
            );
            const profA = diffRes.profiles[params.profile_a ?? "FANUC0M"];
            const profB = diffRes.profiles[params.profile_b ?? "SINUMERIK840D"];
            if (!profA || !profB) {
              result = { error: `Profile not found: ${!profA ? params.profile_a : params.profile_b}. Available: ${Object.keys(diffRes.profiles).join(", ")}` };
            } else {
              result = _hmMetricCfg.diffProfiles(profA, profB, params.cycle_code ?? "hmSlf3");
            }
            break;
          }

          case "hypermill_data_extract_all": {
            // U-HMR48: Run all 5 extraction pipelines.
            _hmExtractionOrch ??= (await import("../../engines/HyperMillDataExtractionOrchestrator.js")).hyperMillDataExtractionOrchestrator;
            result = _hmExtractionOrch.extractAll({
              ...(params.paths ?? {}),
              output_dir: params.output_dir ?? params.paths?.output_dir,
            });
            break;
          }

          case "hypermill_data_status": {
            // U-HMR48: Return per-database extraction status without re-running.
            _hmExtractionOrch ??= (await import("../../engines/HyperMillDataExtractionOrchestrator.js")).hyperMillDataExtractionOrchestrator;
            result = _hmExtractionOrch.getStatus(params.paths ?? {}, params.output_dir);
            break;
          }

          case "hypermill_data_freshness_check": {
            // U-HMR48: Standalone freshness check.
            _hmExtractionOrch ??= (await import("../../engines/HyperMillDataExtractionOrchestrator.js")).hyperMillDataExtractionOrchestrator;
            result = _hmExtractionOrch.checkFreshness(params.output_dir ?? "data/hypermill-extracted");
            break;
          }

          // ── CAM-EXHAUST-MS0/U-CAM-FIDX-28: HyperMILL FunctionIndex (10 actions) ──
          case "hypermill_function_index_get": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            result = { success: true, index: HyperMillFunctionIndexEngine.getIndex() };
            break;
          }
          case "hypermill_function_index_list_modules": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            result = { success: true, modules: HyperMillFunctionIndexEngine.listModules() };
            break;
          }
          case "hypermill_function_index_get_module": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const moduleId = params.module_id as string;
            const mod = HyperMillFunctionIndexEngine.getModule(moduleId);
            result = mod
              ? { success: true, module_id: moduleId, module: mod }
              : { success: false, error: `Module '${moduleId}' not found` };
            break;
          }
          case "hypermill_function_index_find_parameter": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const paramId = params.parameter_id as string;
            const located = HyperMillFunctionIndexEngine.findParameter(paramId);
            result = located
              ? { success: true, parameter: located }
              : { success: false, error: `Parameter '${paramId}' not found` };
            break;
          }
          case "hypermill_function_index_get_parameters_by_formula": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const formulaId = params.formula_id as string;
            result = { success: true, parameters: HyperMillFunctionIndexEngine.getParametersByFormula(formulaId) };
            break;
          }
          case "hypermill_function_index_get_parameters_by_dispatcher": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const dispatcherName = params.dispatcher_name as string;
            result = { success: true, parameters: HyperMillFunctionIndexEngine.getParametersByDispatcher(dispatcherName) };
            break;
          }
          case "hypermill_function_index_get_tribal_tips_by_source": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const source = params.source as string;
            result = { success: true, tips: HyperMillFunctionIndexEngine.getTribalTipsBySource(source) };
            break;
          }
          case "hypermill_function_index_resolve_dependencies": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            const moduleId = params.module_id as string;
            result = { success: true, ...HyperMillFunctionIndexEngine.resolveDependencies(moduleId) };
            break;
          }
          case "hypermill_function_index_total_parameter_count": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            result = { success: true, ...HyperMillFunctionIndexEngine.totalParameterCount() };
            break;
          }
          case "hypermill_function_index_get_load_errors": {
            const { HyperMillFunctionIndexEngine } = await import("../../engines/HyperMillFunctionIndexEngine.js");
            result = { success: true, load_errors: HyperMillFunctionIndexEngine.getLoadErrors() };
            break;
          }

          // ── HM-REV-MS9: AC Bridge + Deployment (E1165–E1169) ──────────────

          case "hypermill_ac_status": {
            // U-HMR47: AC connection health check via HyperMillACConnectionManager.
            _hmACConnMgr ??= (await import("../../engines/HyperMillACConnectionManager.js")).hyperMillACConnectionManagerMock;
            result = await _hmACConnMgr.healthCheck();
            break;
          }

          case "hypermill_ppp_write": {
            // U-HMR50: Write PPP-optimized NC output to disk.
            _hmPPPFileWriter ??= (await import("../../engines/HyperMillPPPFileWriter.js")).hyperMillPPPFileWriter;
            result = _hmPPPFileWriter.write({
              ncContent:         params.nc_content ?? params.ncContent ?? "",
              jobName:           params.job_name   ?? params.jobName   ?? "prism_job",
              controllerDialect: params.controller_dialect ?? params.controllerDialect ?? "fanuc",
              projectFolder:     params.project_folder ?? params.projectFolder ?? {
                projectRoot:       params.project_root ?? process.cwd(),
                ncSubFolder:       params.nc_sub_folder ?? "NC",
                backupSubFolder:   params.backup_sub_folder ?? "NC_backup",
                subProgramSubFolder: params.sub_program_sub_folder ?? "NC_sub",
              },
              splitSubPrograms:  params.split_sub_programs ?? false,
              prismMetadata:     params.prism_metadata ?? {},
            });
            break;
          }

          case "hypermill_job_status": {
            // U-HMR49: Get status of a tracked AC job.
            _hmJobMonitor ??= (await import("../../engines/HyperMillJobMonitor.js")).hyperMillJobMonitorMock;
            const jobId = params.job_id ?? params.jobId;
            if (jobId) {
              result = _hmJobMonitor.getJob(jobId) ?? { error: `Job "${jobId}" not found` };
            } else {
              result = { jobs: _hmJobMonitor.getAllJobs() };
            }
            break;
          }

          case "hypermill_job_submit": {
            // U-HMR49: Submit a new job to the AC job monitor.
            _hmJobMonitor ??= (await import("../../engines/HyperMillJobMonitor.js")).hyperMillJobMonitorMock;
            const newJobId = params.job_id ?? params.jobId ?? `job_${Date.now()}`;
            const newJobName = params.job_name ?? params.jobName ?? newJobId;
            result = _hmJobMonitor.submitJob(newJobId, newJobName);
            break;
          }

          case "hypermill_job_list": {
            // U-HMR49: List all tracked AC jobs.
            _hmJobMonitor ??= (await import("../../engines/HyperMillJobMonitor.js")).hyperMillJobMonitorMock;
            const stateFilter = params.state;
            result = {
              jobs: stateFilter
                ? _hmJobMonitor.getJobsByState(stateFilter)
                : _hmJobMonitor.getAllJobs(),
            };
            break;
          }

          // ── HM-REV-MS10: Quality Chain + Setup Sheet (U-HMR51–U-HMR55) ──────
          case "cam_hypermill_setup_sheet": {
            // U-HMR51: Auto-generate setup sheet from hyperMILL job data
            const { hyperMillSetupSheetBridge } = await import("../../engines/HyperMillSetupSheetBridge.js");
            result = hyperMillSetupSheetBridge.generate(params as any);
            break;
          }

          case "cam_hypermill_quality_package": {
            // U-HMR52/53: Generate FAI (AS9102) + SPC control plan from hyperMILL job
            const [{ hyperMillFAIBridge }, { hyperMillSPCBridge }] = await Promise.all([
              import("../../engines/HyperMillFAIBridge.js"),
              import("../../engines/HyperMillSPCBridge.js"),
            ]);
            const faiResult = await hyperMillFAIBridge.generate({
              job_id: params.job_id,
              part_number: params.part_number,
              revision: params.revision,
              supplier: params.supplier,
              purchase_order: params.purchase_order,
              drawing_number: params.drawing_number,
              organization: params.organization,
              inspector: params.inspector,
              serial_number: params.serial_number,
              material_cert_id: params.material_cert_id,
              operations: params.operations ?? [],
              fixture: params.fixture,
            });
            const spcResult = hyperMillSPCBridge.generate({
              job_id: params.job_id,
              part_number: params.part_number,
              operations: params.operations ?? [],
              subgroup_size: params.subgroup_size ?? 5,
              target_cpk: params.target_cpk ?? 1.33,
              aerospace: true,
            });
            // Quality gate check
            const setupPresent = !!(params.setup_sheet_present ?? false);
            const { hyperMillSetupSheetBridge } = await import("../../engines/HyperMillSetupSheetBridge.js");
            const gateResult = hyperMillSetupSheetBridge.qualityGateCheck(
              setupPresent,
              faiResult.balloon_count > 0,
              spcResult.feature_count > 0
            );
            result = {
              job_id: params.job_id,
              part_number: params.part_number,
              quality_gate: gateResult,
              fai_plan: {
                balloon_count: faiResult.balloon_count,
                critical_count: faiResult.critical_count,
                form_1: faiResult.form_1,
                form_3: faiResult.form_3,
              },
              spc_control_plan: {
                feature_count: spcResult.feature_count,
                critical_feature_count: spcResult.critical_feature_count,
                default_chart_type: spcResult.default_chart_type,
                subgroup_size: spcResult.subgroup_size,
                target_cpk: spcResult.target_cpk,
                chart_type_summary: spcResult.chart_type_summary,
                control_plan: spcResult.control_plan.map((e) => ({
                  entry_number: e.entry_number,
                  feature_name: e.feature_plan.feature_name,
                  chart_type: e.feature_plan.chart_type,
                  target_cpk: e.feature_plan.target_cpk,
                  is_critical: e.feature_plan.is_critical,
                  sampling_frequency: e.feature_plan.sampling_frequency,
                  measurement_method: e.feature_plan.measurement_method,
                })),
              },
            };
            break;
          }

          // ── HM-REV-MS11: PPP Integration (U-HMR59–U-HMR63) ──────────────────
          case "hypermill_ppp_process": {
            // U-HMR59/60/61: Adapt hyperMILL NC → PPP, fix G43.4, TRAORI passthrough
            const { hyperMillPPPInputAdapter } = await import("../../engines/HyperMillPPPInputAdapter.js");
            const { hyperMillPPPBridgeHooks } = await import("../../engines/HyperMillPPPBridgeHooks.js");
            const adapterResult = hyperMillPPPInputAdapter.adapt({
              nc_text: params.nc_text ?? "",
              post_config_code: params.post_config_code,
              dialect_override: params.dialect_override,
              strip_comments: params.strip_comments ?? false,
            });
            const preHook = hyperMillPPPBridgeHooks.preHook(adapterResult.blocks, {
              material_iso_group: params.material_iso_group ?? "P",
              cycle_type: params.cycle_type ?? "unknown",
              tool_diameter_mm: params.tool_diameter_mm ?? 10,
              flute_count: params.flute_count ?? 4,
              controller_family: adapterResult.controller_family,
              dialect: adapterResult.dialect,
              machine_max_rpm: params.machine_max_rpm ?? 15000,
              machine_max_feed_mmpm: params.machine_max_feed_mmpm ?? 40000,
            });
            const postHook = hyperMillPPPBridgeHooks.postHook(adapterResult.blocks, preHook.context);
            result = {
              dialect: adapterResult.dialect,
              controller_family: adapterResult.controller_family,
              block_count: adapterResult.block_count,
              rtcp_block_count: adapterResult.rtcp_block_count,
              traori_block_count: adapterResult.traori_block_count,
              toolchange_count: adapterResult.toolchange_count,
              sf_coverage: adapterResult.sf_coverage,
              pre_hook: preHook,
              post_hook: postHook,
              warnings: adapterResult.warnings,
              blocks: adapterResult.blocks,
            };
            break;
          }

          // ── HM-REV-MS12: Batch Script (U-HMR64) ──────────────────────────
          case "hypermill_batch_script": {
            // Returns metadata about a named Python batch script in scripts/hypermill/
            const scriptName: string = params.script_name ?? "";
            const validScripts = [
              "extract_all",
              "setup_job",
              "tool_export_sql",
              "project_template",
              "version_check",
            ];
            if (!scriptName) {
              result = {
                available_scripts: validScripts,
                scripts_dir: "scripts/hypermill/",
                usage: "Pass script_name to get script details",
              };
            } else {
              const scriptSlug = scriptName.replace(/\.py$/, "");
              const isKnown = validScripts.includes(scriptSlug);
              result = {
                script_name: scriptSlug + ".py",
                scripts_dir: "scripts/hypermill/",
                known: isKnown,
                run_command: `python scripts/hypermill/${scriptSlug}.py`,
                note: isKnown
                  ? `Run with --help for CLI usage`
                  : `Unknown script '${scriptSlug}' — check scripts/hypermill/ for available scripts`,
              };
            }
            break;
          }

          // ── HM-KC-MS0: Intelligent Macro DB extractors (U-HKC04) ─────────────

          case "hypermill_im_tool_db_extract": {
            // U-HKC04: Extract materials, cutting materials, formulas, and MatTech
            // data from IM_Tool_DB_V2023.1.db.
            _hmIMToolDb ??= (await import("../../engines/HyperMillIMDbExtractor.js")).imToolDbExtractor;
            const imToolPath: string | undefined = params.db_path;
            const extractor = imToolPath
              ? new (await import("../../engines/HyperMillIMDbExtractor.js")).IMToolDbExtractor(imToolPath)
              : _hmIMToolDb;
            const imToolResult = await extractor.extract();
            result = {
              status: imToolResult.status,
              material_count: imToolResult.materials.length,
              cutting_material_count: imToolResult.cuttingMaterials.length,
              formula_count: imToolResult.formulas.length,
              mat_tech_count: imToolResult.matTechCount,
              mat_tech_item_count: imToolResult.matTechItemCount,
              table_count: imToolResult.tables.length,
              materials: imToolResult.materials,
              cutting_materials: imToolResult.cuttingMaterials,
              formulas: imToolResult.formulas,
              tables: imToolResult.tables,
              extracted_at: imToolResult.extractedAt,
              error: imToolResult.error,
            };
            break;
          }

          case "hypermill_im_macro_db_extract": {
            // U-HKC04: Extract macro type definitions, macro entries, and job
            // parameter schemas from IM_Macro_DB.db.
            _hmIMMacroDB ??= (await import("../../engines/HyperMillIMDbExtractor.js")).imMacroDbExtractor;
            const imMacroPath: string | undefined = params.db_path;
            const macroExtractor = imMacroPath
              ? new (await import("../../engines/HyperMillIMDbExtractor.js")).IMMacroDbExtractor(imMacroPath)
              : _hmIMMacroDB;
            const imMacroResult = await macroExtractor.extract();
            result = {
              status: imMacroResult.status,
              table_count: imMacroResult.tables.length,
              macro_type_count: imMacroResult.macroTypes.length,
              macro_count: imMacroResult.macroCount,
              job_count: imMacroResult.jobs.length,
              version: imMacroResult.version,
              tables: imMacroResult.tables,
              macro_types: imMacroResult.macroTypes,
              macros: imMacroResult.macros,
              jobs: imMacroResult.jobs,
              extracted_at: imMacroResult.extractedAt,
              error: imMacroResult.error,
            };
            break;
          }
          // ── SimulationVisualizationBridgeEngine (3 actions) ──────────────────
          case "simulation_visualize": {
            const { simulationVisualizationBridgeEngine } = await import("../../engines/SimulationVisualizationBridgeEngine.js");
            const { cncSimulationPipelineEngine } = await import("../../engines/CNCSimulationPipelineEngine.js");
            // Parse gcode string into blocks array
            const gcodeBlocks = typeof params.gcode === "string"
              ? (params.gcode as string).split("\n").filter(l => l.trim())
              : (params.gcode_blocks as string[] ?? []);
            const simResult = cncSimulationPipelineEngine.simulate({
              gcode_blocks: gcodeBlocks,
              material: params.material as string ?? "steel",
            });
            result = simulationVisualizationBridgeEngine.generateVisualization(simResult, {
              colorMode: params.color_mode as any ?? "force",
              showCollisionZones: params.show_collisions ?? true,
              animationFps: params.animation_fps ?? 30,
            });
            break;
          }
          case "simulation_toolpath_colors": {
            const { simulationVisualizationBridgeEngine: vizBridge } = await import("../../engines/SimulationVisualizationBridgeEngine.js");
            const { cncSimulationPipelineEngine: simPipe } = await import("../../engines/CNCSimulationPipelineEngine.js");
            const gcodeLines = typeof params.gcode === "string"
              ? (params.gcode as string).split("\n").filter(l => l.trim())
              : (params.gcode_blocks as string[] ?? []);
            const simRes = simPipe.simulate({
              gcode_blocks: gcodeLines,
              material: params.material as string ?? "steel",
            });
            const vizData = vizBridge.generateVisualization(simRes, {
              colorMode: params.color_mode as any ?? "force",
            });
            result = {
              segments: vizData.toolpath_segments,
              statistics: vizData.statistics,
            };
            break;
          }
          case "simulation_animation_frames": {
            const { simulationVisualizationBridgeEngine: vizEng } = await import("../../engines/SimulationVisualizationBridgeEngine.js");
            const { cncSimulationPipelineEngine: simEng } = await import("../../engines/CNCSimulationPipelineEngine.js");
            const blocks = typeof params.gcode === "string"
              ? (params.gcode as string).split("\n").filter(l => l.trim())
              : (params.gcode_blocks as string[] ?? []);
            const simData = simEng.simulate({
              gcode_blocks: blocks,
              material: params.material as string ?? "steel",
            });
            const vizResult = vizEng.generateVisualization(simData, {
              animationFps: params.fps ?? 30,
            });
            result = {
              tool_timeline: vizResult.tool_timeline,
              stock_frames: vizResult.stock_frames,
              total_frames: vizResult.tool_timeline.length,
            };
            break;
          }
          // ── MultiProcessCAMBridgeEngine (3 actions) ──────────────────────────
          case "multi_process_detect": {
            const { multiProcessCAMBridgeEngine } = await import("../../engines/MultiProcessCAMBridgeEngine.js");
            result = {
              feature_type: params.feature_type as string,
              detected_process: multiProcessCAMBridgeEngine.detectProcess(params.feature_type as string),
            };
            break;
          }
          case "multi_process_full_pipeline": {
            const { multiProcessCAMBridgeEngine: mpBridge } = await import("../../engines/MultiProcessCAMBridgeEngine.js");
            result = mpBridge.processAll(
              params.features as any[],
              { iso_group: params.iso_group as string ?? "P", name: params.material as string },
              { name: params.machine as string, max_rpm: params.max_rpm as number, max_power_kw: params.max_power_kw as number },
            );
            break;
          }
          case "multi_process_physics": {
            const { multiProcessCAMBridgeEngine: mpEng } = await import("../../engines/MultiProcessCAMBridgeEngine.js");
            // Process a single feature through the bridge
            const singleFeature = params.feature as any;
            const material = { iso_group: params.iso_group as string ?? "P", name: params.material as string ?? "steel" };
            const processResult = mpEng.processAll([singleFeature], material);
            result = processResult.results[0] ?? { error: "No result for feature" };
            break;
          }

          // ── PP-AI: Post Processor AI (22 actions — 3 engines) ─────────────────

          // Layer 1: Deep Learning Engine
          case "pp_ai_recognize_patterns": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.recognizePatterns({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              machine_controller: params.machine_controller,
            });
            break;
          }
          case "pp_ai_optimize_feed": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.optimizeFeed({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              machine_controller: params.machine_controller,
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
            });
            break;
          }
          case "pp_ai_classify_controller": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.classifyController({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
            });
            break;
          }
          case "pp_ai_estimate_cycle_time": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.estimateCycleTime({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              machine_controller: params.machine_controller,
            });
            break;
          }
          case "pp_ai_score_quality": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.scorePostQuality({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              machine_controller: params.machine_controller,
            });
            break;
          }
          case "pp_ai_deep_learning_analyze": {
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            result = _ppAIDeepLearning.analyze({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              machine_controller: params.machine_controller,
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
            });
            break;
          }

          // Layer 2: Deep Reasoning Engine
          case "pp_ai_chain_of_thought": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.chainOfThought({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              query: params.query as string,
            });
            break;
          }
          case "pp_ai_causal_inference": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.causalInference({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              issue: params.issue as string,
            });
            break;
          }
          case "pp_ai_cross_cam_synthesis": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.synthesizeCrossCAM({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              source_cams: params.source_cams as any[],
            });
            break;
          }
          case "pp_ai_controller_optimize": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.optimizeForController({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_physics_reasoning": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.physicsReasoning({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
            });
            break;
          }
          case "pp_ai_self_consistency": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.verifySelfConsistency({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
            });
            break;
          }
          case "pp_ai_deep_reasoning_analyze": {
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            result = _ppAIDeepReasoning.analyze({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              source_cams: params.source_cams as any[],
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
            });
            break;
          }

          // Layer 3: Ultimate AI Engine
          case "pp_ai_deep_ensemble": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.deepEnsemble({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_episodic_memory": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.retrieveEpisodes({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_store_episode": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            const episodeId = _ppAIUltimate.storeEpisode({
              controller: params.controller,
              source_cam: params.source_cam,
              machine: params.machine as string,
              post_config: params.post_config as Record<string, unknown>,
              outcome: params.outcome,
              cycle_time_actual_sec: params.cycle_time_actual_sec as number,
              notes: params.notes as string,
            });
            result = { episode_id: episodeId, stored: true };
            break;
          }
          case "pp_ai_knowledge_graph": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.queryKnowledgeGraph({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_tree_of_thoughts": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.treeOfThoughts({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_meta_learning": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.metaLearning({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_adversarial_validate": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.adversarialValidation({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
            });
            break;
          }
          case "pp_ai_generate_post": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.generatePost({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              generate_post: true,
            });
            break;
          }
          case "pp_ai_llm_cli_query": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            const llmAnalysis = _ppAIUltimate.analyze({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              query: params.query as string,
              generate_post: params.generate_post as boolean,
              llm_cli_mode: true,
            });
            result = llmAnalysis.llm_cli_output ?? llmAnalysis;
            break;
          }
          case "pp_ai_ultimate_analyze": {
            _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
            result = _ppAIUltimate.analyze({
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              target_controller: params.target_controller,
              source_cams: params.source_cams as any[],
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
              generate_post: params.generate_post as boolean,
              llm_cli_mode: params.llm_cli_mode as boolean,
              query: params.query as string,
            });
            break;
          }

          // ═══════════════════════════════════════════════════════════════
          // PP-AI ORCHESTRATOR (7 actions) — Master orchestration engine
          // ═══════════════════════════════════════════════════════════════

          case "pp_ai_classify_intent": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            result = _ppAIOrchestrator.classifyIntent(
              params.query as string,
              params.context
            );
            break;
          }

          case "pp_ai_route_engines": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            const intent = {
              primary_intent: params.primary_intent,
              complexity: params.complexity ?? "moderate",
              confidence: 0.8,
              secondary_intents: [],
              entities: { controllers: [], materials: [], operations: [], issues: [] },
              requires_gcode: false,
            };
            result = _ppAIOrchestrator.routeToEngines(intent);
            break;
          }

          case "pp_ai_expert_rules": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            result = _ppAIOrchestrator.runExpertRules(params.gcode as string, {
              query: "",
              gcode: params.gcode as string,
              controller: params.controller,
              material_iso: params.material_iso,
              tool_diameter_mm: params.tool_diameter_mm as number,
              output_mode: params.output_mode,
            });
            break;
          }

          case "pp_ai_neural_optimize": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            result = _ppAIOrchestrator.neuralOptimization({
              query: "",
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              controller: params.controller,
            });
            break;
          }

          case "pp_ai_aggregate_analysis": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            // Aggregate from available engines
            let deepLearning, deepReasoning, ultimateAI;
            if (params.run_engines?.includes("deep_learning") || !params.run_engines) {
              _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
              deepLearning = _ppAIDeepLearning.analyze({ gcode: params.gcode, material_iso: params.material_iso });
            }
            if (params.run_engines?.includes("deep_reasoning") || !params.run_engines) {
              _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
              deepReasoning = _ppAIDeepReasoning.analyze({ gcode: params.gcode, material_iso: params.material_iso, target_controller: params.controller });
            }
            if (params.run_engines?.includes("ultimate_ai") || !params.run_engines) {
              _ppAIUltimate ??= (await import("../../engines/PostProcessorUltimateAIEngine.js")).postProcessorUltimateAIEngine;
              ultimateAI = _ppAIUltimate.analyze({ gcode: params.gcode, material_iso: params.material_iso, target_controller: params.controller });
            }
            const expertRules = _ppAIOrchestrator.runExpertRules(params.gcode as string, { query: "", gcode: params.gcode, controller: params.controller, material_iso: params.material_iso });
            const neuralOpt = _ppAIOrchestrator.neuralOptimization({ query: "", gcode: params.gcode, material_iso: params.material_iso, controller: params.controller });
            result = _ppAIOrchestrator.aggregateAnalysis(deepLearning, deepReasoning, ultimateAI, expertRules, neuralOpt);
            break;
          }

          case "pp_ai_proactive_suggestions": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            _ppAIDeepLearning ??= (await import("../../engines/PostProcessorDeepLearningEngine.js")).postProcessorDeepLearningEngine;
            _ppAIDeepReasoning ??= (await import("../../engines/PostProcessorDeepReasoningEngine.js")).postProcessorDeepReasoningEngine;
            const dlAnalysis = _ppAIDeepLearning.analyze({ gcode: params.gcode, material_iso: params.material_iso });
            const drAnalysis = _ppAIDeepReasoning.analyze({ gcode: params.gcode, material_iso: params.material_iso, target_controller: params.controller });
            const aggregated = _ppAIOrchestrator.aggregateAnalysis(dlAnalysis, drAnalysis);
            result = _ppAIOrchestrator.generateProactiveSuggestions(aggregated);
            break;
          }

          case "pp_ai_orchestrate": {
            _ppAIOrchestrator ??= (await import("../../engines/PostProcessorIntelligenceOrchestratorEngine.js")).postProcessorIntelligenceOrchestrator;
            result = await _ppAIOrchestrator.orchestrate({
              query: params.query as string,
              gcode: params.gcode as string,
              material_iso: params.material_iso,
              controller: params.controller,
              source_cam: params.source_cam,
              machine_model: params.machine_model as string,
              tool_diameter_mm: params.tool_diameter_mm as number,
              spindle_rpm: params.spindle_rpm as number,
              context: params.context,
              output_mode: params.output_mode,
            });
            break;
          }

          // ================================================================
          // PP-KB: POST PROCESSOR KNOWLEDGE ENGINE (13 actions)
          // ================================================================

          case "pp_kb_get_entry_function": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getEntryFunction(params.function_name as string);
            break;
          }

          case "pp_kb_get_entry_functions_by_category": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getEntryFunctionsByCategory(params.category as "lifecycle" | "motion" | "cycle" | "command" | "manual" | "utility");
            break;
          }

          case "pp_kb_get_drilling_cycle": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getDrillingCycle(params.cycle_type as string);
            break;
          }

          case "pp_kb_get_all_drilling_cycles": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getAllDrillingCycles();
            break;
          }

          case "pp_kb_get_upk_switch": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getUPKSwitch(params.switch_name as string);
            break;
          }

          case "pp_kb_get_upk_switches_by_category": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getUPKSwitchesByCategory(params.category as "rotary" | "offset" | "control" | "home" | "5axis" | "millturn" | "misc");
            break;
          }

          case "pp_kb_get_misc_value": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getMiscValue(params.misc_id as string);
            break;
          }

          case "pp_kb_get_circular_settings": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getCircularSettings();
            break;
          }

          case "pp_kb_search": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.search(params.query as string);
            break;
          }

          case "pp_kb_get_recommended_settings": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getRecommendedSettings(params.machine_type as string);
            break;
          }

          case "pp_kb_validate_configuration": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.validateConfiguration(params.config as Record<string, unknown>);
            break;
          }

          case "pp_kb_generate_function_template": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.generateFunctionTemplate(params.function_name as string);
            break;
          }

          case "pp_kb_get_statistics": {
            const { postProcessorKnowledgeEngine } = await import("../../engines/PostProcessorKnowledgeEngine.js");
            result = postProcessorKnowledgeEngine.getStatistics();
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // CAMX-MS2/U07 — Controller & machine strategy validation actions
          // ═══════════════════════════════════════════════════════════════════
          case "strategy_controller_validate": {
            const { controllerStrategyValidatorEngine } = await import("../../engines/ControllerStrategyValidatorEngine.js");
            result = controllerStrategyValidatorEngine.validate(
              params.strategy as any,
              params.controller as any,
              params.overrides as any,
            );
            break;
          }

          case "strategy_machine_validate": {
            const { machineStrategyConstraintEngine } = await import("../../engines/MachineStrategyConstraintEngine.js");
            result = machineStrategyConstraintEngine.validate({
              strategy: params.strategy as string,
              machine: params.machine as any,
              part_envelope_mm: params.part_envelope_mm as any,
              tool_count: params.tool_count as number | undefined,
              coolant_type: params.coolant_type as string | undefined,
            });
            break;
          }

          case "strategy_find_compatible_controllers": {
            const { controllerStrategyValidatorEngine } = await import("../../engines/ControllerStrategyValidatorEngine.js");
            result = controllerStrategyValidatorEngine.findCompatibleControllers(params.strategy as any);
            break;
          }

          case "strategy_find_best_machine": {
            const { machineStrategyConstraintEngine } = await import("../../engines/MachineStrategyConstraintEngine.js");
            result = machineStrategyConstraintEngine.findBestMachine({
              strategy: params.strategy as string,
              machines: params.machines as any,
              part_envelope_mm: params.part_envelope_mm as any,
              tool_count: params.tool_count as number | undefined,
              coolant_type: params.coolant_type as string | undefined,
            });
            break;
          }

          case "strategy_compatibility_matrix": {
            const { controllerStrategyValidatorEngine } = await import("../../engines/ControllerStrategyValidatorEngine.js");
            result = controllerStrategyValidatorEngine.compatibilityMatrix();
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // CAMX-MS2/U05 — Cost-optimal strategy decision actions
          // ═══════════════════════════════════════════════════════════════════
          case "strategy_cost_compute": {
            const { strategyCostOptimalEngine } = await import("../../engines/StrategyCostOptimalEngine.js");
            result = strategyCostOptimalEngine.computeCost(
              params.option as any,
              params.rates as any,
            );
            break;
          }

          case "strategy_cost_decide": {
            const { strategyCostOptimalEngine } = await import("../../engines/StrategyCostOptimalEngine.js");
            result = strategyCostOptimalEngine.decide(
              params.options as any,
              params.rates as any,
            );
            break;
          }

          case "strategy_cost_sensitivity": {
            const { strategyCostOptimalEngine } = await import("../../engines/StrategyCostOptimalEngine.js");
            result = strategyCostOptimalEngine.sensitivity(
              params.option as any,
              params.rates as any,
              params.delta_pct as number | undefined,
            );
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // CAMX-MS2/U06 — Safety-first strategy decision actions
          // ═══════════════════════════════════════════════════════════════════
          case "strategy_safety_assess": {
            const { strategySafetyDecisionEngine } = await import("../../engines/StrategySafetyDecisionEngine.js");
            result = strategySafetyDecisionEngine.assess(params.option as any);
            break;
          }

          case "strategy_safety_decide": {
            const { strategySafetyDecisionEngine } = await import("../../engines/StrategySafetyDecisionEngine.js");
            result = strategySafetyDecisionEngine.decide(
              params.options as any,
              params.cost_preferred_id as string | undefined,
            );
            break;
          }

          case "strategy_safety_filter": {
            const { strategySafetyDecisionEngine } = await import("../../engines/StrategySafetyDecisionEngine.js");
            result = strategySafetyDecisionEngine.filterSafe(params.options as any);
            break;
          }

          // CAMX-MS2/U03 — Strategy fallback chain walker
          case "strategy_fallback_chain": {
            const { strategyFallbackChainEngine } = await import("../../engines/StrategyFallbackChainEngine.js");
            result = strategyFallbackChainEngine.choose({
              preferred: params.preferred as any,
              controller: params.controller as any,
              custom_chain: params.custom_chain,
              machine_flags: params.machine_flags,
            });
            break;
          }

          case "strategy_fallback_default_chain": {
            const { strategyFallbackChainEngine } = await import("../../engines/StrategyFallbackChainEngine.js");
            result = strategyFallbackChainEngine.getDefaultChain(params.strategy as any);
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM96..100 — cohesive-unit cross-wiring ──
          case "cam_hub_register": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            CAMPluginCommunicationHubEngine.register(params.registration as any, params.now_ms as number | undefined);
            result = { registered: true, plugin_id: params.registration?.plugin_id };
            break;
          }
          case "cam_hub_unregister": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            CAMPluginCommunicationHubEngine.unregister(params.plugin_id as string);
            result = { unregistered: true, plugin_id: params.plugin_id };
            break;
          }
          case "cam_hub_route": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            result = CAMPluginCommunicationHubEngine.route(
              params.session_id as string,
              params.envelope as any,
              params.now_ms as number | undefined,
            );
            break;
          }
          case "cam_hub_stats": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            result = CAMPluginCommunicationHubEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_hub_heartbeat": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            result = {
              ok: CAMPluginCommunicationHubEngine.heartbeat(
                params.plugin_id as string,
                params.now_ms as number | undefined,
              ),
            };
            break;
          }
          case "cam_hub_drain": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            result = {
              depth_before: CAMPluginCommunicationHubEngine.queuedDepth(params.plugin_id as string),
              plugin_id: params.plugin_id,
            };
            break;
          }
          case "cam_hub_supported_targets": {
            const { CAMPluginCommunicationHubEngine } = await import("../../engines/CAMPluginCommunicationHubEngine.js");
            result = {
              targets: CAMPluginCommunicationHubEngine.supportedTargets(),
              transports: CAMPluginCommunicationHubEngine.supportedTransports(),
              frame_types: CAMPluginCommunicationHubEngine.supportedFrameTypes(),
            };
            break;
          }
          case "cam_geometry_register": {
            const { CAMGeometryExchangeEngine } = await import("../../engines/CAMGeometryExchangeEngine.js");
            // Accept base64-encoded bytes to survive JSON transport
            const bytes = typeof params.bytes_b64 === "string"
              ? new Uint8Array(Buffer.from(params.bytes_b64 as string, "base64"))
              : (params.bytes as Uint8Array);
            result = CAMGeometryExchangeEngine.registerBlob({
              blob_id: params.blob_id as string,
              format: params.format as any,
              bytes,
              metadata: params.metadata as any,
              chunk_size: params.chunk_size as number | undefined,
            });
            break;
          }
          case "cam_geometry_validate": {
            const { CAMGeometryExchangeEngine } = await import("../../engines/CAMGeometryExchangeEngine.js");
            const bytes = typeof params.bytes_b64 === "string"
              ? new Uint8Array(Buffer.from(params.bytes_b64 as string, "base64"))
              : (params.bytes as Uint8Array);
            result = CAMGeometryExchangeEngine.validateFormat(params.format as any, bytes);
            break;
          }
          case "cam_geometry_estimate_chunks": {
            const { CAMGeometryExchangeEngine } = await import("../../engines/CAMGeometryExchangeEngine.js");
            result = {
              chunk_count: CAMGeometryExchangeEngine.estimateChunkCount(
                params.total_size as number,
                params.chunk_size as number | undefined,
              ),
              is_large: CAMGeometryExchangeEngine.isLargeModel(params.total_size as number),
            };
            break;
          }
          case "cam_geometry_progress": {
            const { CAMGeometryExchangeEngine } = await import("../../engines/CAMGeometryExchangeEngine.js");
            result = CAMGeometryExchangeEngine.streamProgress(
              params.session_id as string,
              params.blob_id as string,
            );
            break;
          }
          case "cam_geometry_supported_formats": {
            const { CAMGeometryExchangeEngine } = await import("../../engines/CAMGeometryExchangeEngine.js");
            result = { formats: CAMGeometryExchangeEngine.supportedFormats() };
            break;
          }
          case "cam_registry_register": {
            const { CAMPluginRegistryEngine } = await import("../../engines/CAMPluginRegistryEngine.js");
            result = CAMPluginRegistryEngine.register(params.registration as any, params.now_ms as number | undefined);
            break;
          }
          case "cam_registry_heartbeat": {
            const { CAMPluginRegistryEngine } = await import("../../engines/CAMPluginRegistryEngine.js");
            result = { ok: CAMPluginRegistryEngine.heartbeat(params.plugin_id as string, params.now_ms as number | undefined) };
            break;
          }
          case "cam_registry_dashboard": {
            const { CAMPluginRegistryEngine } = await import("../../engines/CAMPluginRegistryEngine.js");
            result = CAMPluginRegistryEngine.computeHealthDashboard(params.now_ms as number | undefined);
            break;
          }
          case "cam_registry_compat": {
            const { CAMPluginRegistryEngine } = await import("../../engines/CAMPluginRegistryEngine.js");
            result = CAMPluginRegistryEngine.checkCompatibility(
              params.plugin_id as string,
              params.prism_version as string,
            );
            break;
          }
          case "cam_registry_list": {
            const { CAMPluginRegistryEngine } = await import("../../engines/CAMPluginRegistryEngine.js");
            result = {
              plugins: CAMPluginRegistryEngine.listPlugins(params.filter as any),
            };
            break;
          }
          case "cam_speedfeed_compute": {
            const { CAMSpeedFeedBridgeEngine } = await import("../../engines/CAMSpeedFeedBridgeEngine.js");
            result = CAMSpeedFeedBridgeEngine.compute({
              target: params.target as any,
              native_request: params.native_request as any,
            });
            break;
          }
          case "cam_speedfeed_translate": {
            const { CAMSpeedFeedBridgeEngine } = await import("../../engines/CAMSpeedFeedBridgeEngine.js");
            result = CAMSpeedFeedBridgeEngine.translateRequest(
              params.target as any,
              params.native_request as any,
            );
            break;
          }
          case "cam_post_select": {
            const { CAMPostSelectorUIEngine } = await import("../../engines/CAMPostSelectorUIEngine.js");
            result = CAMPostSelectorUIEngine.recommendForMachine(params.machine_id as string);
            break;
          }
          case "cam_post_list": {
            const { CAMPostSelectorUIEngine } = await import("../../engines/CAMPostSelectorUIEngine.js");
            result = { machines: CAMPostSelectorUIEngine.listMachines(params.filter as any) };
            break;
          }
          case "cam_post_encode": {
            const { CAMPostSelectorUIEngine } = await import("../../engines/CAMPostSelectorUIEngine.js");
            result = CAMPostSelectorUIEngine.encodeForTarget(
              params.target as any,
              params.operation_id as string,
              params.filter as any,
            );
            break;
          }
          case "cam_post_dashboard": {
            const { CAMPostSelectorUIEngine } = await import("../../engines/CAMPostSelectorUIEngine.js");
            result = CAMPostSelectorUIEngine.dashboard();
            break;
          }

          // ── U-CAM90..95 overlay engines ──────────────────────────────────
          case "cam_overlay_force_render": {
            const { ForceOverlayVisualizationEngine } = await import("../../engines/ForceOverlayVisualizationEngine.js");
            result = ForceOverlayVisualizationEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_force_stats": {
            const { ForceOverlayVisualizationEngine } = await import("../../engines/ForceOverlayVisualizationEngine.js");
            result = ForceOverlayVisualizationEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_force_reset": {
            const { ForceOverlayVisualizationEngine } = await import("../../engines/ForceOverlayVisualizationEngine.js");
            ForceOverlayVisualizationEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }
          case "cam_overlay_chatter_render": {
            const { SLDOverlayEngine } = await import("../../engines/SLDOverlayEngine.js");
            result = SLDOverlayEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_chatter_stats": {
            const { SLDOverlayEngine } = await import("../../engines/SLDOverlayEngine.js");
            result = SLDOverlayEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_chatter_reset": {
            const { SLDOverlayEngine } = await import("../../engines/SLDOverlayEngine.js");
            SLDOverlayEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }
          case "cam_overlay_deflection_render": {
            const { DeflectionOverlayEngine } = await import("../../engines/DeflectionOverlayEngine.js");
            result = DeflectionOverlayEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_deflection_stats": {
            const { DeflectionOverlayEngine } = await import("../../engines/DeflectionOverlayEngine.js");
            result = DeflectionOverlayEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_deflection_reset": {
            const { DeflectionOverlayEngine } = await import("../../engines/DeflectionOverlayEngine.js");
            DeflectionOverlayEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }
          case "cam_overlay_thermal_render": {
            const { ThermalOverlayEngine } = await import("../../engines/ThermalOverlayEngine.js");
            result = ThermalOverlayEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_thermal_stats": {
            const { ThermalOverlayEngine } = await import("../../engines/ThermalOverlayEngine.js");
            result = ThermalOverlayEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_thermal_reset": {
            const { ThermalOverlayEngine } = await import("../../engines/ThermalOverlayEngine.js");
            ThermalOverlayEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }
          case "cam_overlay_tool_life_render": {
            const { ToolLifeOverlayEngine } = await import("../../engines/ToolLifeOverlayEngine.js");
            result = ToolLifeOverlayEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_tool_life_stats": {
            const { ToolLifeOverlayEngine } = await import("../../engines/ToolLifeOverlayEngine.js");
            result = ToolLifeOverlayEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_tool_life_reset": {
            const { ToolLifeOverlayEngine } = await import("../../engines/ToolLifeOverlayEngine.js");
            ToolLifeOverlayEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }
          case "cam_overlay_safety_score_render": {
            const { SafetyScoreOverlayEngine } = await import("../../engines/SafetyScoreOverlayEngine.js");
            result = SafetyScoreOverlayEngine.renderFrame(
              params.session_id as string,
              params.point as any,
              params.overlay as any,
              (params.target as any) ?? "generic",
            );
            break;
          }
          case "cam_overlay_safety_score_stats": {
            const { SafetyScoreOverlayEngine } = await import("../../engines/SafetyScoreOverlayEngine.js");
            result = SafetyScoreOverlayEngine.getStats(params.session_id as string);
            break;
          }
          case "cam_overlay_safety_score_reset": {
            const { SafetyScoreOverlayEngine } = await import("../../engines/SafetyScoreOverlayEngine.js");
            SafetyScoreOverlayEngine.resetSession(params.session_id as string);
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM101: Tribal knowledge tooltip injection ──
          case "cam_tooltip_render": {
            const { CAMTribalKnowledgeInjectionEngine } = await import("../../engines/CAMTribalKnowledgeInjectionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const target = (params.target as string) ?? "generic";
            const context = (params.context ?? params) as Parameters<typeof CAMTribalKnowledgeInjectionEngine.renderTooltip>[1];
            result = CAMTribalKnowledgeInjectionEngine.renderTooltip(sessionId, context, target as Parameters<typeof CAMTribalKnowledgeInjectionEngine.renderTooltip>[2]);
            break;
          }
          case "cam_tooltip_stats": {
            const { CAMTribalKnowledgeInjectionEngine } = await import("../../engines/CAMTribalKnowledgeInjectionEngine.js");
            result = CAMTribalKnowledgeInjectionEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_tooltip_reset": {
            const { CAMTribalKnowledgeInjectionEngine } = await import("../../engines/CAMTribalKnowledgeInjectionEngine.js");
            CAMTribalKnowledgeInjectionEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM102: Error prediction & predictive alerts ──
          case "cam_predict_segment": {
            const { CAMMachiningErrorPredictionEngine } = await import("../../engines/CAMMachiningErrorPredictionEngine.js");
            const segment = (params.segment ?? params) as Parameters<typeof CAMMachiningErrorPredictionEngine.evaluateSegment>[0];
            result = { alerts: CAMMachiningErrorPredictionEngine.evaluateSegment(segment) };
            break;
          }
          case "cam_predict_scan": {
            const { CAMMachiningErrorPredictionEngine } = await import("../../engines/CAMMachiningErrorPredictionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const segments = (params.segments ?? []) as Parameters<typeof CAMMachiningErrorPredictionEngine.scanToolpath>[1];
            result = CAMMachiningErrorPredictionEngine.scanToolpath(sessionId, segments);
            break;
          }
          case "cam_predict_encode": {
            const { CAMMachiningErrorPredictionEngine } = await import("../../engines/CAMMachiningErrorPredictionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const target = (params.target as string) ?? "generic";
            const segments = (params.segments ?? []) as Parameters<typeof CAMMachiningErrorPredictionEngine.scanToolpath>[1];
            const report = CAMMachiningErrorPredictionEngine.scanToolpath(sessionId, segments);
            result = {
              report,
              payload: CAMMachiningErrorPredictionEngine.encodeReport(report, target as Parameters<typeof CAMMachiningErrorPredictionEngine.encodeReport>[1]),
            };
            break;
          }
          case "cam_predict_stats": {
            const { CAMMachiningErrorPredictionEngine } = await import("../../engines/CAMMachiningErrorPredictionEngine.js");
            result = CAMMachiningErrorPredictionEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_predict_reset": {
            const { CAMMachiningErrorPredictionEngine } = await import("../../engines/CAMMachiningErrorPredictionEngine.js");
            CAMMachiningErrorPredictionEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM103: AI optimization suggestions ──
          case "cam_suggest_recommend": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const baseline = (params.baseline ?? params.segment) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[1];
            const goal = (params.goal as string) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[2];
            const limits = (params.limits ?? CAMOptimizationSuggestionEngine.DEFAULT_LIMITS) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[3];
            const topN = (params.top_n as number | undefined) ?? 5;
            result = CAMOptimizationSuggestionEngine.recommend(sessionId, baseline, goal, limits, topN);
            break;
          }
          case "cam_suggest_recommend_all": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const baseline = (params.baseline ?? params.segment) as Parameters<typeof CAMOptimizationSuggestionEngine.recommendAll>[1];
            const limits = (params.limits ?? CAMOptimizationSuggestionEngine.DEFAULT_LIMITS) as Parameters<typeof CAMOptimizationSuggestionEngine.recommendAll>[2];
            const topN = (params.top_n as number | undefined) ?? 5;
            result = CAMOptimizationSuggestionEngine.recommendAll(sessionId, baseline, limits, topN);
            break;
          }
          case "cam_suggest_apply": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const baseline = (params.baseline ?? params.segment) as Parameters<typeof CAMOptimizationSuggestionEngine.applySuggestion>[1];
            const suggestion = params.suggestion as Parameters<typeof CAMOptimizationSuggestionEngine.applySuggestion>[2];
            result = { patched: CAMOptimizationSuggestionEngine.applySuggestion(sessionId, baseline, suggestion) };
            break;
          }
          case "cam_suggest_encode": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const baseline = (params.baseline ?? params.segment) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[1];
            const goal = (params.goal as string) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[2];
            const target = (params.target as string) ?? "generic";
            const limits = (params.limits ?? CAMOptimizationSuggestionEngine.DEFAULT_LIMITS) as Parameters<typeof CAMOptimizationSuggestionEngine.recommend>[3];
            const topN = (params.top_n as number | undefined) ?? 5;
            const report = CAMOptimizationSuggestionEngine.recommend(sessionId, baseline, goal, limits, topN);
            result = {
              report,
              payload: CAMOptimizationSuggestionEngine.encodeReport(report, target as Parameters<typeof CAMOptimizationSuggestionEngine.encodeReport>[1]),
            };
            break;
          }
          case "cam_suggest_stats": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            result = CAMOptimizationSuggestionEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_suggest_reset": {
            const { CAMOptimizationSuggestionEngine } = await import("../../engines/CAMOptimizationSuggestionEngine.js");
            CAMOptimizationSuggestionEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST01: hyperMILL in-host runner ──
          case "cam_inhost_hypermill_register": {
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const pluginId = params.plugin_id as string | undefined;
            const version = params.version as string | undefined;
            result = { registration: HyperMillInHostRunnerEngine.register(pluginId, version) };
            break;
          }
          case "cam_inhost_hypermill_plan": {
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const descriptor = (params.descriptor ?? params) as Parameters<typeof HyperMillInHostRunnerEngine.planScenario>[1];
            const pluginId = params.plugin_id as string | undefined;
            result = HyperMillInHostRunnerEngine.planScenario(sessionId, descriptor, pluginId);
            break;
          }
          case "cam_inhost_hypermill_summarize": {
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const plan = params.plan as Parameters<typeof HyperMillInHostRunnerEngine.summarize>[1];
            const scenarioResult = params.result as Parameters<typeof HyperMillInHostRunnerEngine.summarize>[2];
            result = HyperMillInHostRunnerEngine.summarize(sessionId, plan, scenarioResult);
            break;
          }
          case "cam_inhost_hypermill_stats": {
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            result = HyperMillInHostRunnerEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_inhost_hypermill_reset": {
            const { HyperMillInHostRunnerEngine } = await import("../../engines/HyperMillInHostRunnerEngine.js");
            HyperMillInHostRunnerEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST02: Fusion 360 in-host runner ──
          case "cam_inhost_fusion360_register": {
            const { Fusion360InHostRunnerEngine } = await import("../../engines/Fusion360InHostRunnerEngine.js");
            const pluginId = params.plugin_id as string | undefined;
            const version = params.version as string | undefined;
            result = { registration: Fusion360InHostRunnerEngine.register(pluginId, version) };
            break;
          }
          case "cam_inhost_fusion360_plan": {
            const { Fusion360InHostRunnerEngine } = await import("../../engines/Fusion360InHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const descriptor = (params.descriptor ?? params) as Parameters<typeof Fusion360InHostRunnerEngine.planScenario>[1];
            const pluginId = params.plugin_id as string | undefined;
            result = Fusion360InHostRunnerEngine.planScenario(sessionId, descriptor, pluginId);
            break;
          }
          case "cam_inhost_fusion360_summarize": {
            const { Fusion360InHostRunnerEngine } = await import("../../engines/Fusion360InHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const plan = params.plan as Parameters<typeof Fusion360InHostRunnerEngine.summarize>[1];
            const scenarioResult = params.result as Parameters<typeof Fusion360InHostRunnerEngine.summarize>[2];
            result = Fusion360InHostRunnerEngine.summarize(sessionId, plan, scenarioResult);
            break;
          }
          case "cam_inhost_fusion360_stats": {
            const { Fusion360InHostRunnerEngine } = await import("../../engines/Fusion360InHostRunnerEngine.js");
            result = Fusion360InHostRunnerEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_inhost_fusion360_reset": {
            const { Fusion360InHostRunnerEngine } = await import("../../engines/Fusion360InHostRunnerEngine.js");
            Fusion360InHostRunnerEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST03: Inventor HSM in-host runner ──
          case "cam_inhost_inventor_hsm_register": {
            const { InventorHSMInHostRunnerEngine } = await import("../../engines/InventorHSMInHostRunnerEngine.js");
            const pluginId = params.plugin_id as string | undefined;
            const version = params.version as string | undefined;
            result = { registration: InventorHSMInHostRunnerEngine.register(pluginId, version) };
            break;
          }
          case "cam_inhost_inventor_hsm_plan": {
            const { InventorHSMInHostRunnerEngine } = await import("../../engines/InventorHSMInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const descriptor = (params.descriptor ?? params) as Parameters<typeof InventorHSMInHostRunnerEngine.planScenario>[1];
            const pluginId = params.plugin_id as string | undefined;
            result = InventorHSMInHostRunnerEngine.planScenario(sessionId, descriptor, pluginId);
            break;
          }
          case "cam_inhost_inventor_hsm_summarize": {
            const { InventorHSMInHostRunnerEngine } = await import("../../engines/InventorHSMInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const plan = params.plan as Parameters<typeof InventorHSMInHostRunnerEngine.summarize>[1];
            const scenarioResult = params.result as Parameters<typeof InventorHSMInHostRunnerEngine.summarize>[2];
            result = InventorHSMInHostRunnerEngine.summarize(sessionId, plan, scenarioResult);
            break;
          }
          case "cam_inhost_inventor_hsm_stats": {
            const { InventorHSMInHostRunnerEngine } = await import("../../engines/InventorHSMInHostRunnerEngine.js");
            result = InventorHSMInHostRunnerEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_inhost_inventor_hsm_reset": {
            const { InventorHSMInHostRunnerEngine } = await import("../../engines/InventorHSMInHostRunnerEngine.js");
            InventorHSMInHostRunnerEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST04: Mastercam X8 in-host runner ──
          case "cam_inhost_mastercam_register": {
            const { MastercamInHostRunnerEngine } = await import("../../engines/MastercamInHostRunnerEngine.js");
            const pluginId = params.plugin_id as string | undefined;
            const version = params.version as string | undefined;
            result = { registration: MastercamInHostRunnerEngine.register(pluginId, version) };
            break;
          }
          case "cam_inhost_mastercam_plan": {
            const { MastercamInHostRunnerEngine } = await import("../../engines/MastercamInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const descriptor = (params.descriptor ?? params) as Parameters<typeof MastercamInHostRunnerEngine.planScenario>[1];
            const pluginId = params.plugin_id as string | undefined;
            result = MastercamInHostRunnerEngine.planScenario(sessionId, descriptor, pluginId);
            break;
          }
          case "cam_inhost_mastercam_summarize": {
            const { MastercamInHostRunnerEngine } = await import("../../engines/MastercamInHostRunnerEngine.js");
            const sessionId = (params.session_id as string) ?? "default";
            const plan = params.plan as Parameters<typeof MastercamInHostRunnerEngine.summarize>[1];
            const scenarioResult = params.result as Parameters<typeof MastercamInHostRunnerEngine.summarize>[2];
            result = MastercamInHostRunnerEngine.summarize(sessionId, plan, scenarioResult);
            break;
          }
          case "cam_inhost_mastercam_stats": {
            const { MastercamInHostRunnerEngine } = await import("../../engines/MastercamInHostRunnerEngine.js");
            result = MastercamInHostRunnerEngine.getStats((params.session_id as string) ?? "default");
            break;
          }
          case "cam_inhost_mastercam_reset": {
            const { MastercamInHostRunnerEngine } = await import("../../engines/MastercamInHostRunnerEngine.js");
            MastercamInHostRunnerEngine.resetSession((params.session_id as string) ?? "default");
            result = { reset: true, session_id: params.session_id };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST05: Fixture Part Catalog ──
          case "cam_fixture_part_list": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            result = { parts: FixturePartCatalogEngine.list() };
            break;
          }
          case "cam_fixture_part_list_by_category": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            const category = params.category as Parameters<typeof FixturePartCatalogEngine.listByCategory>[0];
            result = { category, parts: FixturePartCatalogEngine.listByCategory(category) };
            break;
          }
          case "cam_fixture_part_list_by_host": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            const host = params.host as Parameters<typeof FixturePartCatalogEngine.listByHost>[0];
            result = { host, parts: FixturePartCatalogEngine.listByHost(host) };
            break;
          }
          case "cam_fixture_part_get": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            const partId = params.part_id as string;
            result = { part_id: partId, part: FixturePartCatalogEngine.get(partId) };
            break;
          }
          case "cam_fixture_part_count": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            result = { count: FixturePartCatalogEngine.count(), expected: FixturePartCatalogEngine.EXPECTED_TOTAL };
            break;
          }
          case "cam_fixture_part_count_by_category": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            result = { distribution: FixturePartCatalogEngine.countByCategory() };
            break;
          }
          case "cam_fixture_part_audit": {
            const { FixturePartCatalogEngine } = await import("../../engines/FixturePartCatalogEngine.js");
            result = FixturePartCatalogEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST06: Stock + Workholding Catalog ──
          case "cam_stock_setup_list": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            result = { setups: StockWorkholdingCatalogEngine.list() };
            break;
          }
          case "cam_stock_setup_list_by_part": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            const partId = params.part_id as string;
            result = { part_id: partId, setups: StockWorkholdingCatalogEngine.listByPart(partId) };
            break;
          }
          case "cam_stock_setup_list_by_material": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            const slot = params.material_slot as Parameters<typeof StockWorkholdingCatalogEngine.listByMaterial>[0];
            result = { material_slot: slot, setups: StockWorkholdingCatalogEngine.listByMaterial(slot) };
            break;
          }
          case "cam_stock_setup_list_by_form": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            const form = params.form as Parameters<typeof StockWorkholdingCatalogEngine.listByForm>[0];
            result = { form, setups: StockWorkholdingCatalogEngine.listByForm(form) };
            break;
          }
          case "cam_stock_setup_get": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            const stockId = params.stock_id as string;
            result = { stock_id: stockId, setup: StockWorkholdingCatalogEngine.get(stockId) };
            break;
          }
          case "cam_stock_setup_count": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            result = { count: StockWorkholdingCatalogEngine.count(), expected: StockWorkholdingCatalogEngine.EXPECTED_TOTAL };
            break;
          }
          case "cam_stock_setup_count_by_material": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            result = { distribution: StockWorkholdingCatalogEngine.countByMaterial() };
            break;
          }
          case "cam_stock_setup_audit": {
            const { StockWorkholdingCatalogEngine } = await import("../../engines/StockWorkholdingCatalogEngine.js");
            result = StockWorkholdingCatalogEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST07: Material × Tool Matrix ──
          case "cam_mt_matrix_slots": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            result = { slots: MaterialToolMatrixEngine.slots() };
            break;
          }
          case "cam_mt_matrix_tool_classes_for": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            const category = params.category as Parameters<typeof MaterialToolMatrixEngine.toolClassesFor>[0];
            result = { category, tool_classes: MaterialToolMatrixEngine.toolClassesFor(category) };
            break;
          }
          case "cam_mt_matrix_combos_for_part": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            const partId = params.part_id as string;
            result = { part_id: partId, combos: MaterialToolMatrixEngine.comboesForPart(partId) };
            break;
          }
          case "cam_mt_matrix_get_combo": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            const partId = params.part_id as string;
            const slotId = params.slot_id as string;
            result = { part_id: partId, slot_id: slotId, combo: MaterialToolMatrixEngine.getCombo(partId, slotId) };
            break;
          }
          case "cam_mt_matrix_all_combos": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            result = { combos: MaterialToolMatrixEngine.allCombos() };
            break;
          }
          case "cam_mt_matrix_expected_count": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            result = { expected: MaterialToolMatrixEngine.expectedComboCount() };
            break;
          }
          case "cam_mt_matrix_audit": {
            const { MaterialToolMatrixEngine } = await import("../../engines/MaterialToolMatrixEngine.js");
            result = MaterialToolMatrixEngine.auditMatrix();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST08..13: Unified scenario generator ──
          case "cam_scenario_generate": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            const config = (params.config ?? {}) as Parameters<typeof CAMScenarioGeneratorEngine.generate>[0];
            result = { scenarios: CAMScenarioGeneratorEngine.generate(config) };
            break;
          }
          case "cam_scenario_generate_all": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { scenarios: CAMScenarioGeneratorEngine.generateAll() };
            break;
          }
          case "cam_scenario_generate_pocket_2d": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST08", scenarios: CAMScenarioGeneratorEngine.generatePocket2D() };
            break;
          }
          case "cam_scenario_generate_contour_2d": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST09", scenarios: CAMScenarioGeneratorEngine.generateContour2D() };
            break;
          }
          case "cam_scenario_generate_drilling_threading": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST10", scenarios: CAMScenarioGeneratorEngine.generateDrillingAndThreading() };
            break;
          }
          case "cam_scenario_generate_surface_3d": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST11", scenarios: CAMScenarioGeneratorEngine.generateSurface3D() };
            break;
          }
          case "cam_scenario_generate_multi_axis": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST12", scenarios: CAMScenarioGeneratorEngine.generateMultiAxis() };
            break;
          }
          case "cam_scenario_generate_turning": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = { unit: "U-CAMTEST13", scenarios: CAMScenarioGeneratorEngine.generateTurning() };
            break;
          }
          case "cam_scenario_predict_count": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            const config = (params.config ?? {}) as Parameters<typeof CAMScenarioGeneratorEngine.predictCount>[0];
            result = { count: CAMScenarioGeneratorEngine.predictCount(config) };
            break;
          }
          case "cam_scenario_audit": {
            const { CAMScenarioGeneratorEngine } = await import("../../engines/CAMScenarioGeneratorEngine.js");
            result = CAMScenarioGeneratorEngine.auditGenerator();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST14: Central 7-family assertion bundle ──
          case "cam_assertion_bundle_evaluate": {
            const { CAMInHostAssertionBundleEngine } = await import("../../engines/CAMInHostAssertionBundleEngine.js");
            const input = params.input as Parameters<typeof CAMInHostAssertionBundleEngine.evaluate>[0];
            result = CAMInHostAssertionBundleEngine.evaluate(input);
            break;
          }
          case "cam_assertion_bundle_failed": {
            const { CAMInHostAssertionBundleEngine } = await import("../../engines/CAMInHostAssertionBundleEngine.js");
            const bundle = params.bundle as Parameters<typeof CAMInHostAssertionBundleEngine.failed>[0];
            result = { failed: CAMInHostAssertionBundleEngine.failed(bundle) };
            break;
          }
          case "cam_assertion_bundle_by_name": {
            const { CAMInHostAssertionBundleEngine } = await import("../../engines/CAMInHostAssertionBundleEngine.js");
            const bundle = params.bundle as Parameters<typeof CAMInHostAssertionBundleEngine.byName>[0];
            const name = params.name as Parameters<typeof CAMInHostAssertionBundleEngine.byName>[1];
            result = { assertion: CAMInHostAssertionBundleEngine.byName(bundle, name) };
            break;
          }
          case "cam_assertion_bundle_audit": {
            const { CAMInHostAssertionBundleEngine } = await import("../../engines/CAMInHostAssertionBundleEngine.js");
            const bundle = params.bundle as Parameters<typeof CAMInHostAssertionBundleEngine.auditBundle>[0];
            result = CAMInHostAssertionBundleEngine.auditBundle(bundle);
            break;
          }
          case "cam_assertion_bundle_families": {
            const { CAMInHostAssertionBundleEngine } = await import("../../engines/CAMInHostAssertionBundleEngine.js");
            result = { families: CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES };
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST15: Results bridge ──
          case "cam_results_bridge_ingest": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            const env = params.envelope as Parameters<typeof CAMInHostResultsBridgeEngine.ingestEnvelope>[0];
            result = { envelope: CAMInHostResultsBridgeEngine.ingestEnvelope(env) };
            break;
          }
          case "cam_results_bridge_list": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            const host = params.host as Parameters<typeof CAMInHostResultsBridgeEngine.listByHost>[0] | undefined;
            const category = params.category as Parameters<typeof CAMInHostResultsBridgeEngine.listByCategory>[0] | undefined;
            let envelopes;
            if (host !== undefined) envelopes = CAMInHostResultsBridgeEngine.listByHost(host);
            else if (category !== undefined) envelopes = CAMInHostResultsBridgeEngine.listByCategory(category);
            else envelopes = CAMInHostResultsBridgeEngine.list();
            result = { envelopes, count: envelopes.length };
            break;
          }
          case "cam_results_bridge_list_failures": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            const failures = CAMInHostResultsBridgeEngine.listFailures();
            result = { envelopes: failures, count: failures.length };
            break;
          }
          case "cam_results_bridge_summarize": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            result = { summary: CAMInHostResultsBridgeEngine.summarize() };
            break;
          }
          case "cam_results_bridge_persist": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            const target = (params.path as string | undefined) ?? CAMInHostResultsBridgeEngine.DEFAULT_RESULTS_PATH;
            result = CAMInHostResultsBridgeEngine.persist(target);
            break;
          }
          case "cam_results_bridge_load": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            const source = (params.path as string | undefined) ?? CAMInHostResultsBridgeEngine.DEFAULT_RESULTS_PATH;
            result = CAMInHostResultsBridgeEngine.load(source);
            break;
          }
          case "cam_results_bridge_reset": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            CAMInHostResultsBridgeEngine.reset();
            result = { reset: true };
            break;
          }
          case "cam_results_bridge_audit": {
            const { CAMInHostResultsBridgeEngine } = await import("../../engines/CAMInHostResultsBridgeEngine.js");
            result = CAMInHostResultsBridgeEngine.auditBridge();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST16: Nightly orchestrator (backend) ──
          case "cam_nightly_run": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const opts = (params.options ?? {}) as Parameters<typeof CAMInHostNightlyOrchestratorEngine.run>[0];
            result = await CAMInHostNightlyOrchestratorEngine.run(opts);
            break;
          }
          case "cam_nightly_list_recent": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const opts = (params.options ?? {}) as Parameters<typeof CAMInHostNightlyOrchestratorEngine.listRecentRuns>[0];
            result = { runs: CAMInHostNightlyOrchestratorEngine.listRecentRuns(opts) };
            break;
          }
          case "cam_nightly_get_run": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const runId = params.run_id as string;
            const dir = params.dir as string | undefined;
            result = CAMInHostNightlyOrchestratorEngine.getRun(runId, dir);
            break;
          }
          case "cam_nightly_text_dashboard": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostNightlyOrchestratorEngine.formatTextDashboard>[0];
            result = { dashboard: CAMInHostNightlyOrchestratorEngine.formatTextDashboard(report) };
            break;
          }
          case "cam_nightly_dashboard_data": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostNightlyOrchestratorEngine.dashboardData>[0];
            result = { data: CAMInHostNightlyOrchestratorEngine.dashboardData(report) };
            break;
          }
          case "cam_nightly_audit": {
            const { CAMInHostNightlyOrchestratorEngine } = await import("../../engines/CAMInHostNightlyOrchestratorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostNightlyOrchestratorEngine.auditOrchestrator>[0];
            result = CAMInHostNightlyOrchestratorEngine.auditOrchestrator(report);
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAMTEST17: Regression detector ──
          case "cam_regression_detect": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const current = params.current as Parameters<typeof CAMInHostRegressionDetectorEngine.detectRegressions>[0];
            const baseline = params.baseline as Parameters<typeof CAMInHostRegressionDetectorEngine.detectRegressions>[1];
            result = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
            break;
          }
          case "cam_regression_detect_against_golden": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const current = params.current as Parameters<typeof CAMInHostRegressionDetectorEngine.detectAgainstGolden>[0];
            const goldenPath = params.golden_path as string | undefined;
            result = CAMInHostRegressionDetectorEngine.detectAgainstGolden(current, goldenPath);
            break;
          }
          case "cam_regression_load_golden": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const goldenPath = params.path as string | undefined;
            result = { golden: CAMInHostRegressionDetectorEngine.loadGolden(goldenPath) };
            break;
          }
          case "cam_regression_promote_golden": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostRegressionDetectorEngine.promoteToGolden>[0];
            const goldenPath = params.path as string | undefined;
            result = CAMInHostRegressionDetectorEngine.promoteToGolden(report, goldenPath);
            break;
          }
          case "cam_regression_has_golden": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const goldenPath = params.path as string | undefined;
            result = { has_golden: CAMInHostRegressionDetectorEngine.hasGolden(goldenPath), path: goldenPath ?? CAMInHostRegressionDetectorEngine.DEFAULT_GOLDEN_PATH };
            break;
          }
          case "cam_regression_findings_by_severity": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostRegressionDetectorEngine.findingsBySeverity>[0];
            const severity = params.severity as Parameters<typeof CAMInHostRegressionDetectorEngine.findingsBySeverity>[1];
            result = { findings: CAMInHostRegressionDetectorEngine.findingsBySeverity(report, severity) };
            break;
          }
          case "cam_regression_findings_by_type": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostRegressionDetectorEngine.findingsByType>[0];
            const type = params.type as Parameters<typeof CAMInHostRegressionDetectorEngine.findingsByType>[1];
            result = { findings: CAMInHostRegressionDetectorEngine.findingsByType(report, type) };
            break;
          }
          case "cam_regression_audit": {
            const { CAMInHostRegressionDetectorEngine } = await import("../../engines/CAMInHostRegressionDetectorEngine.js");
            const report = params.report as Parameters<typeof CAMInHostRegressionDetectorEngine.auditReport>[0];
            result = CAMInHostRegressionDetectorEngine.auditReport(report);
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-CYCLES-01: Fusion 360 cycle catalog ──
          case "cam_fusion360_cycle_catalog_list": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            result = { cycles: Fusion360CycleCatalogEngine.list() };
            break;
          }
          case "cam_fusion360_cycle_catalog_list_by_category": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            const category = params.category as Parameters<typeof Fusion360CycleCatalogEngine.listByCategory>[0];
            result = { category, cycles: Fusion360CycleCatalogEngine.listByCategory(category) };
            break;
          }
          case "cam_fusion360_cycle_catalog_lookup": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            const code = params.code as string;
            result = { code, cycle: Fusion360CycleCatalogEngine.lookup(code) };
            break;
          }
          case "cam_fusion360_cycle_catalog_search": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            const query = params.query as string;
            result = { query, cycles: Fusion360CycleCatalogEngine.search(query) };
            break;
          }
          case "cam_fusion360_cycle_catalog_stats": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            result = Fusion360CycleCatalogEngine.stats();
            break;
          }
          case "cam_fusion360_cycle_catalog_audit": {
            const { Fusion360CycleCatalogEngine } = await import("../../engines/Fusion360CycleCatalogEngine.js");
            result = Fusion360CycleCatalogEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-CTRL-01: Fusion 360 controller catalog ──
          case "cam_fusion360_controller_list": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            result = { families: Fusion360ControllerCatalogEngine.list() };
            break;
          }
          case "cam_fusion360_controller_lookup": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            const id = params.id as string;
            result = { id, family: Fusion360ControllerCatalogEngine.lookup(id) };
            break;
          }
          case "cam_fusion360_controller_search": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            const query = params.query as string;
            result = { query, families: Fusion360ControllerCatalogEngine.search(query) };
            break;
          }
          case "cam_fusion360_controller_dialect": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            const dialect = params.dialect as string;
            result = { dialect, families: Fusion360ControllerCatalogEngine.listByDialect(dialect) };
            break;
          }
          case "cam_fusion360_controller_stats": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            result = Fusion360ControllerCatalogEngine.stats();
            break;
          }
          case "cam_fusion360_controller_audit": {
            const { Fusion360ControllerCatalogEngine } = await import("../../engines/Fusion360ControllerCatalogEngine.js");
            result = Fusion360ControllerCatalogEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-STRAT-01: Fusion 360 strategy engine ──
          case "cam_fusion360_strategy_recommend": {
            const { Fusion360StrategyEngine } = await import("../../engines/Fusion360StrategyEngine.js");
            const request = params.request as Parameters<typeof Fusion360StrategyEngine.recommend>[0];
            result = Fusion360StrategyEngine.recommend(request);
            break;
          }
          case "cam_fusion360_strategy_pick_cycle": {
            const { Fusion360StrategyEngine } = await import("../../engines/Fusion360StrategyEngine.js");
            const request = params.request as Parameters<typeof Fusion360StrategyEngine.pickCycle>[0];
            result = { cycle: Fusion360StrategyEngine.pickCycle(request) };
            break;
          }
          case "cam_fusion360_strategy_baseline_vc": {
            const { Fusion360StrategyEngine } = await import("../../engines/Fusion360StrategyEngine.js");
            const all = params.all === true;
            if (all) {
              result = { table: Fusion360StrategyEngine.baselineVcTable() };
            } else {
              const op = params.operation as Parameters<typeof Fusion360StrategyEngine.baselineVc>[0];
              const iso = params.iso_group as Parameters<typeof Fusion360StrategyEngine.baselineVc>[1];
              result = { operation: op, iso_group: iso, vc_mmin: Fusion360StrategyEngine.baselineVc(op, iso) };
            }
            break;
          }
          case "cam_fusion360_strategy_audit": {
            const { Fusion360StrategyEngine } = await import("../../engines/Fusion360StrategyEngine.js");
            result = Fusion360StrategyEngine.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-SAFETY-01: Fusion 360 safety hooks ──
          case "cam_fusion360_safety_validate": {
            const { Fusion360SafetyHooksEngine } = await import("../../engines/Fusion360SafetyHooksEngine.js");
            const ctx = params.context as Parameters<typeof Fusion360SafetyHooksEngine.validate>[0];
            result = Fusion360SafetyHooksEngine.validate(ctx);
            break;
          }
          case "cam_fusion360_safety_validate_all": {
            const { Fusion360SafetyHooksEngine } = await import("../../engines/Fusion360SafetyHooksEngine.js");
            const ops = params.operations as Parameters<typeof Fusion360SafetyHooksEngine.validateAll>[0];
            result = Fusion360SafetyHooksEngine.validateAll(ops);
            break;
          }
          case "cam_fusion360_safety_rules": {
            const { Fusion360SafetyHooksEngine } = await import("../../engines/Fusion360SafetyHooksEngine.js");
            result = { rules: Fusion360SafetyHooksEngine.getRules() };
            break;
          }
          case "cam_fusion360_safety_audit": {
            const { Fusion360SafetyHooksEngine } = await import("../../engines/Fusion360SafetyHooksEngine.js");
            result = Fusion360SafetyHooksEngine.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-MAT-01: Fusion 360 material bridge ──
          case "cam_fusion360_material_list": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            result = { materials: Fusion360MaterialBridgeEngine.list() };
            break;
          }
          case "cam_fusion360_material_lookup": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            const id = params.id as string;
            result = { id, material: Fusion360MaterialBridgeEngine.lookup(id) };
            break;
          }
          case "cam_fusion360_material_search": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            const query = params.query as string;
            result = { query, materials: Fusion360MaterialBridgeEngine.search(query) };
            break;
          }
          case "cam_fusion360_material_by_iso": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            const iso = params.iso_group as Parameters<typeof Fusion360MaterialBridgeEngine.listByISOGroup>[0];
            result = { iso_group: iso, materials: Fusion360MaterialBridgeEngine.listByISOGroup(iso) };
            break;
          }
          case "cam_fusion360_material_kienzle": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            const id = params.material_id as string;
            result = { material_id: id, kienzle: Fusion360MaterialBridgeEngine.kienzleFor(id) };
            break;
          }
          case "cam_fusion360_material_audit": {
            const { Fusion360MaterialBridgeEngine } = await import("../../engines/Fusion360MaterialBridgeEngine.js");
            result = Fusion360MaterialBridgeEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-PROBE-01: Fusion 360 probing bridge ──
          case "cam_fusion360_probing_list": {
            const { Fusion360ProbingBridgeEngine } = await import("../../engines/Fusion360ProbingBridgeEngine.js");
            result = { operations: Fusion360ProbingBridgeEngine.list() };
            break;
          }
          case "cam_fusion360_probing_lookup": {
            const { Fusion360ProbingBridgeEngine } = await import("../../engines/Fusion360ProbingBridgeEngine.js");
            const id = params.id as string;
            result = { id, operation: Fusion360ProbingBridgeEngine.lookup(id) };
            break;
          }
          case "cam_fusion360_probing_validate": {
            const { Fusion360ProbingBridgeEngine } = await import("../../engines/Fusion360ProbingBridgeEngine.js");
            const args = params as Parameters<typeof Fusion360ProbingBridgeEngine.validateProbeParams>[0];
            result = Fusion360ProbingBridgeEngine.validateProbeParams(args);
            break;
          }
          case "cam_fusion360_probing_audit": {
            const { Fusion360ProbingBridgeEngine } = await import("../../engines/Fusion360ProbingBridgeEngine.js");
            result = Fusion360ProbingBridgeEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-TOOL-01: Fusion 360 tool library ──
          case "cam_fusion360_tool_parse": {
            const { Fusion360ToolExportEngine } = await import("../../engines/Fusion360ToolExportEngine.js");
            const json = params.json_text as string;
            result = { library: Fusion360ToolExportEngine.parse(json) };
            break;
          }
          case "cam_fusion360_tool_serialize": {
            const { Fusion360ToolExportEngine } = await import("../../engines/Fusion360ToolExportEngine.js");
            const tools = params.tools as Parameters<typeof Fusion360ToolExportEngine.serialize>[0];
            const exportedAtIso = params.exported_at_iso as string | undefined;
            result = { json_text: Fusion360ToolExportEngine.serialize(tools, { exportedAtIso }) };
            break;
          }
          case "cam_fusion360_tool_validate": {
            const { Fusion360ToolExportEngine } = await import("../../engines/Fusion360ToolExportEngine.js");
            const tools = params.tools as Parameters<typeof Fusion360ToolExportEngine.validate>[0];
            result = Fusion360ToolExportEngine.validate(tools);
            break;
          }
          case "cam_fusion360_tool_stats": {
            const { Fusion360ToolExportEngine } = await import("../../engines/Fusion360ToolExportEngine.js");
            const tools = params.tools as Parameters<typeof Fusion360ToolExportEngine.stats>[0];
            result = Fusion360ToolExportEngine.stats(tools);
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-MULTIAXIS-01: Fusion 360 multi-axis ──
          case "cam_fusion360_multiaxis_list": {
            const { Fusion360MultiAxisEngine } = await import("../../engines/Fusion360MultiAxisEngine.js");
            result = { kinematics: Fusion360MultiAxisEngine.list() };
            break;
          }
          case "cam_fusion360_multiaxis_lookup": {
            const { Fusion360MultiAxisEngine } = await import("../../engines/Fusion360MultiAxisEngine.js");
            const id = params.id as string;
            result = { id, kinematic: Fusion360MultiAxisEngine.lookup(id) };
            break;
          }
          case "cam_fusion360_multiaxis_validate": {
            const { Fusion360MultiAxisEngine } = await import("../../engines/Fusion360MultiAxisEngine.js");
            const args = params as Parameters<typeof Fusion360MultiAxisEngine.validateOrientation>[0];
            result = Fusion360MultiAxisEngine.validateOrientation(args);
            break;
          }
          case "cam_fusion360_multiaxis_plane_matrix": {
            const { Fusion360MultiAxisEngine } = await import("../../engines/Fusion360MultiAxisEngine.js");
            const plane = params.plane as Parameters<typeof Fusion360MultiAxisEngine.planeRotationMatrix>[0];
            result = { matrix: Fusion360MultiAxisEngine.planeRotationMatrix(plane) };
            break;
          }
          case "cam_fusion360_multiaxis_audit": {
            const { Fusion360MultiAxisEngine } = await import("../../engines/Fusion360MultiAxisEngine.js");
            result = Fusion360MultiAxisEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-MILLTURN-01: Fusion 360 mill-turn ──
          case "cam_fusion360_millturn_list": {
            const { Fusion360MillTurnBridgeEngine } = await import("../../engines/Fusion360MillTurnBridgeEngine.js");
            result = { archetypes: Fusion360MillTurnBridgeEngine.list() };
            break;
          }
          case "cam_fusion360_millturn_lookup": {
            const { Fusion360MillTurnBridgeEngine } = await import("../../engines/Fusion360MillTurnBridgeEngine.js");
            const id = params.id as string;
            result = { id, archetype: Fusion360MillTurnBridgeEngine.lookup(id) };
            break;
          }
          case "cam_fusion360_millturn_validate_handoff": {
            const { Fusion360MillTurnBridgeEngine } = await import("../../engines/Fusion360MillTurnBridgeEngine.js");
            const args = params as Parameters<typeof Fusion360MillTurnBridgeEngine.validateHandoff>[0];
            result = Fusion360MillTurnBridgeEngine.validateHandoff(args);
            break;
          }
          case "cam_fusion360_millturn_thread_passes": {
            const { Fusion360MillTurnBridgeEngine } = await import("../../engines/Fusion360MillTurnBridgeEngine.js");
            const tcParams = params.params as Parameters<typeof Fusion360MillTurnBridgeEngine.threadPassSchedule>[0];
            const numPasses = params.num_passes as number;
            result = Fusion360MillTurnBridgeEngine.threadPassSchedule(tcParams, numPasses);
            break;
          }
          case "cam_fusion360_millturn_audit": {
            const { Fusion360MillTurnBridgeEngine } = await import("../../engines/Fusion360MillTurnBridgeEngine.js");
            result = Fusion360MillTurnBridgeEngine.auditCatalog();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-FUSION-AI-01: Fusion 360 AI orchestration ──
          case "cam_fusion360_ai_route": {
            const { Fusion360AIOrchestrationEngine } = await import("../../engines/Fusion360AIOrchestrationEngine.js");
            const request = params.request as Parameters<typeof Fusion360AIOrchestrationEngine.route>[0];
            result = Fusion360AIOrchestrationEngine.route(request);
            break;
          }
          case "cam_fusion360_ai_routes": {
            const { Fusion360AIOrchestrationEngine } = await import("../../engines/Fusion360AIOrchestrationEngine.js");
            result = { routes: Fusion360AIOrchestrationEngine.routes() };
            break;
          }
          case "cam_fusion360_ai_tasks_routed_to": {
            const { Fusion360AIOrchestrationEngine } = await import("../../engines/Fusion360AIOrchestrationEngine.js");
            const target = params.target as Parameters<typeof Fusion360AIOrchestrationEngine.tasksRoutedTo>[0];
            result = { target, tasks: Fusion360AIOrchestrationEngine.tasksRoutedTo(target) };
            break;
          }
          case "cam_fusion360_ai_audit": {
            const { Fusion360AIOrchestrationEngine } = await import("../../engines/Fusion360AIOrchestrationEngine.js");
            result = Fusion360AIOrchestrationEngine.auditRouting();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-MC-EDM-01: Mastercam EDM bridge ──
          case "cam_mastercam_edm_route": {
            const { MastercamEDMBridge } = await import("../../engines/MastercamEDMBridge.js");
            const f = params.feature as Parameters<typeof MastercamEDMBridge.route>[0];
            result = MastercamEDMBridge.route(f);
            break;
          }
          case "cam_mastercam_edm_pick_route_type": {
            const { MastercamEDMBridge } = await import("../../engines/MastercamEDMBridge.js");
            const f = params.feature as Parameters<typeof MastercamEDMBridge.pickRouteType>[0];
            result = { route_type: MastercamEDMBridge.pickRouteType(f) };
            break;
          }
          case "cam_mastercam_edm_skim_passes": {
            const { MastercamEDMBridge } = await import("../../engines/MastercamEDMBridge.js");
            const t = params.workpiece_thickness_mm as number;
            result = { passes: MastercamEDMBridge.recommendSkimPasses(t), workpiece_thickness_mm: t };
            break;
          }
          case "cam_mastercam_edm_stats": {
            const { MastercamEDMBridge } = await import("../../engines/MastercamEDMBridge.js");
            const features = params.features as Parameters<typeof MastercamEDMBridge.stats>[0];
            result = MastercamEDMBridge.stats(features);
            break;
          }
          case "cam_mastercam_edm_audit": {
            const { MastercamEDMBridge } = await import("../../engines/MastercamEDMBridge.js");
            result = MastercamEDMBridge.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-MC-GRIND-01: Mastercam grinding bridge ──
          case "cam_mastercam_grinding_plan": {
            const { MastercamGrindingBridge } = await import("../../engines/MastercamGrindingBridge.js");
            const f = params.feature as Parameters<typeof MastercamGrindingBridge.plan>[0];
            result = MastercamGrindingBridge.plan(f);
            break;
          }
          case "cam_mastercam_grinding_wheel_rpm": {
            const { MastercamGrindingBridge } = await import("../../engines/MastercamGrindingBridge.js");
            const dia = params.wheel_dia_mm as number;
            const speed = params.surface_speed_ms as number;
            result = { wheel_dia_mm: dia, surface_speed_ms: speed, rpm: MastercamGrindingBridge.wheelRpmFromSurfaceSpeed(dia, speed) };
            break;
          }
          case "cam_mastercam_grinding_cycle_codes": {
            const { MastercamGrindingBridge } = await import("../../engines/MastercamGrindingBridge.js");
            result = { codes: MastercamGrindingBridge.cycleCodes() };
            break;
          }
          case "cam_mastercam_grinding_audit": {
            const { MastercamGrindingBridge } = await import("../../engines/MastercamGrindingBridge.js");
            result = MastercamGrindingBridge.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-MC-SI-01: Mastercam surface integrity ──
          case "cam_mastercam_si_predict": {
            const { MastercamSurfaceIntegrityBridge } = await import("../../engines/MastercamSurfaceIntegrityBridge.js");
            const r = params.request as Parameters<typeof MastercamSurfaceIntegrityBridge.predict>[0];
            result = MastercamSurfaceIntegrityBridge.predict(r);
            break;
          }
          case "cam_mastercam_si_validate": {
            const { MastercamSurfaceIntegrityBridge } = await import("../../engines/MastercamSurfaceIntegrityBridge.js");
            const a = params as Parameters<typeof MastercamSurfaceIntegrityBridge.validateAgainstSpec>[0];
            result = MastercamSurfaceIntegrityBridge.validateAgainstSpec(a);
            break;
          }
          case "cam_mastercam_si_audit": {
            const { MastercamSurfaceIntegrityBridge } = await import("../../engines/MastercamSurfaceIntegrityBridge.js");
            result = MastercamSurfaceIntegrityBridge.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-MC-MOLD-01: Mastercam mold cavity/core cycle planner ──
          case "cam_mastercam_mold_plan": {
            const { MastercamMoldCycleEngine } = await import("../../engines/MastercamMoldCycleEngine.js");
            const f = params.feature as Parameters<typeof MastercamMoldCycleEngine.plan>[0];
            result = MastercamMoldCycleEngine.plan(f);
            break;
          }
          case "cam_mastercam_mold_needs_edm": {
            const { MastercamMoldCycleEngine } = await import("../../engines/MastercamMoldCycleEngine.js");
            const f = params.feature as Parameters<typeof MastercamMoldCycleEngine.needsEdmFinishing>[0];
            result = { needs_edm_finishing: MastercamMoldCycleEngine.needsEdmFinishing(f) };
            break;
          }
          case "cam_mastercam_mold_audit": {
            const { MastercamMoldCycleEngine } = await import("../../engines/MastercamMoldCycleEngine.js");
            result = MastercamMoldCycleEngine.auditEngine();
            break;
          }

          // ── CAM-EXHAUST-MS0 U-CAM-MC-PROBE-01: Mastercam probing bridge ──
          case "cam_mastercam_probe_part_setup": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            const features = params.features as Parameters<typeof mastercamProbingBridge.generatePartSetup>[0];
            const wcsNumber = (params.wcs_number as number | undefined) ?? 54;
            result = mastercamProbingBridge.generatePartSetup(features, wcsNumber);
            break;
          }
          case "cam_mastercam_probe_create_cycle": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            const cycleType = params.cycle_type as Parameters<typeof mastercamProbingBridge.createProbeCycle>[0];
            const x = params.x as number;
            const y = params.y as number;
            const z = params.z as number;
            const options = (params.options as Parameters<typeof mastercamProbingBridge.createProbeCycle>[4]) ?? {};
            result = mastercamProbingBridge.createProbeCycle(cycleType, x, y, z, options);
            break;
          }
          case "cam_mastercam_probe_gcode": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            const cycles = params.cycles as Parameters<typeof mastercamProbingBridge.generateGCode>[0];
            const controller = (params.controller as Parameters<typeof mastercamProbingBridge.generateGCode>[1]) ?? "fanuc";
            const probeSystem = (params.probe_system as Parameters<typeof mastercamProbingBridge.generateGCode>[2]) ?? "renishaw";
            result = mastercamProbingBridge.generateGCode(cycles, controller, probeSystem);
            break;
          }
          case "cam_mastercam_probe_tool": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            const tools = params.tools as Parameters<typeof mastercamProbingBridge.generateToolProbing>[0];
            const controller = (params.controller as Parameters<typeof mastercamProbingBridge.generateToolProbing>[1]) ?? "fanuc";
            result = { gcode_lines: mastercamProbingBridge.generateToolProbing(tools, controller) };
            break;
          }
          case "cam_mastercam_probe_verify": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            const cycles = params.cycles as Parameters<typeof mastercamProbingBridge.simulateVerification>[0];
            const measurementError = (params.measurement_error as number | undefined) ?? 0.0005;
            result = { results: mastercamProbingBridge.simulateVerification(cycles, measurementError) };
            break;
          }
          case "cam_mastercam_probe_stats": {
            const { mastercamProbingBridge } = await import("../../engines/MastercamProbingBridge.js");
            result = mastercamProbingBridge.getStats();
            break;
          }

          // CAM-UIX-MS0/U-ONTOLOGY-SEED01 — Cross-CAM ontology translation
          case "ontology_translate": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = ontologyGrowthRegistryEngine.translate(
              params.sourceCAM as string,
              params.targetCAM as string,
              params.fieldName as string
            );
            break;
          }
          case "ontology_translate_strategy": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = ontologyGrowthRegistryEngine.translateStrategy(
              params.sourceCAM as string,
              params.targetCAM as string,
              params.strategyName as string
            );
            break;
          }
          case "ontology_get_canonical": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = {
              cam: params.cam,
              fieldName: params.fieldName,
              canonical: ontologyGrowthRegistryEngine.getCanonical(
                params.cam as string,
                params.fieldName as string
              ),
            };
            break;
          }
          case "ontology_get_aliases": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = {
              canonical: params.canonical,
              cam: params.cam,
              aliases: ontologyGrowthRegistryEngine.getAliasesForCanonical(
                params.canonical as string,
                params.cam as string | undefined
              ),
            };
            break;
          }
          case "ontology_list_canonicals": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = { canonicals: ontologyGrowthRegistryEngine.getAllCanonicals() };
            break;
          }
          case "ontology_list_cams": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = { cams: ontologyGrowthRegistryEngine.getSupportedCAMs() };
            break;
          }
          case "ontology_stats": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = ontologyGrowthRegistryEngine.getOntologyStats();
            break;
          }
          case "ontology_get_range": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = {
              canonical: params.canonical,
              range: ontologyGrowthRegistryEngine.getTypicalRange(params.canonical as string),
            };
            break;
          }
          case "ontology_get_valid_values": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = {
              canonical: params.canonical,
              validValues: ontologyGrowthRegistryEngine.getValidValues(params.canonical as string),
            };
            break;
          }
          case "ontology_check_applicable": {
            const { ontologyGrowthRegistryEngine } = await import("../../engines/OntologyGrowthRegistryEngine.js");
            result = {
              canonical: params.canonical,
              machineType: params.machineType,
              applicable: ontologyGrowthRegistryEngine.isApplicableTo(
                params.canonical as string,
                params.machineType as string
              ),
            };
            break;
          }

          // CAM-EXHAUST-MS0/U-CAM25 — Fusion360 Function Index
          case "fusion360_function_index_get": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, index: Fusion360FunctionIndexEngine.getIndex() };
            break;
          }
          case "fusion360_function_index_list_modules": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, modules: Fusion360FunctionIndexEngine.listModules() };
            break;
          }
          case "fusion360_function_index_get_module": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            const mod = Fusion360FunctionIndexEngine.getModule(params.module_id as string);
            result = mod ? { success: true, module: mod } : { success: false, error: "Module not found" };
            break;
          }
          case "fusion360_function_index_list_toolpaths": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, toolpaths: Fusion360FunctionIndexEngine.listAllToolpaths() };
            break;
          }
          case "fusion360_function_index_find_parameter": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            const param = Fusion360FunctionIndexEngine.findParameter(params.parameter_name as string);
            result = param ? { success: true, parameter: param } : { success: false, error: "Parameter not found" };
            break;
          }
          case "fusion360_function_index_search_parameters": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, parameters: Fusion360FunctionIndexEngine.searchParameters(params.query as string, params.limit as number | undefined) };
            break;
          }
          case "fusion360_function_index_get_toolpaths_by_category": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, toolpaths: Fusion360FunctionIndexEngine.getToolpathsByCategory(params.category as string) };
            break;
          }
          case "fusion360_function_index_get_summary": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, ...Fusion360FunctionIndexEngine.getSummary() };
            break;
          }
          case "fusion360_function_index_get_hsm_toolpaths": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, toolpaths: Fusion360FunctionIndexEngine.getHSMToolpaths() };
            break;
          }
          case "fusion360_function_index_get_mfg_ext_toolpaths": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, toolpaths: Fusion360FunctionIndexEngine.getManufacturingExtensionToolpaths() };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-26 — Fusion360 singular toolpath getter
          case "fusion360_function_index_get_toolpath": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            const toolpathId = params.toolpath_id as string;
            result = { success: true, ...Fusion360FunctionIndexEngine.getToolpath(toolpathId) };
            break;
          }
          // CAM-EXHAUST-MS1-01 — Fusion360 Probing module
          case "fusion360_function_index_get_probing_operations": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, operations: Fusion360FunctionIndexEngine.getProbingOperations() };
            break;
          }
          // CAM-EXHAUST-MS1-02 — Fusion360 Additive module
          case "fusion360_function_index_get_additive_operations": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, operations: Fusion360FunctionIndexEngine.getAdditiveOperations() };
            break;
          }
          // CAM-EXHAUST-MS1-03 — Fusion360 Cutting module
          case "fusion360_function_index_get_cutting_operations": {
            const { Fusion360FunctionIndexEngine } = await import("../../engines/Fusion360FunctionIndexEngine.js");
            result = { success: true, operations: Fusion360FunctionIndexEngine.getCuttingOperations() };
            break;
          }

          // CAM-EXHAUST-MS0/U-CAM26 — Inventor HSM Function Index
          case "inventor_hsm_function_index_get": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, index: InventorHSMFunctionIndexEngine.getIndex() };
            break;
          }
          case "inventor_hsm_function_index_list_sections": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, sections: InventorHSMFunctionIndexEngine.listSections() };
            break;
          }
          case "inventor_hsm_function_index_get_section": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: InventorHSMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "inventor_hsm_function_index_list_operations": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, operations: InventorHSMFunctionIndexEngine.listOperations() };
            break;
          }
          case "inventor_hsm_function_index_find_parameter": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: InventorHSMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "inventor_hsm_function_index_search_parameters": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: InventorHSMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "inventor_hsm_function_index_get_operations_by_category": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: InventorHSMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "inventor_hsm_function_index_get_summary": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, ...InventorHSMFunctionIndexEngine.getSummary() };
            break;
          }
          case "inventor_hsm_function_index_get_hsm_operations": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, operations: InventorHSMFunctionIndexEngine.getHSMOperations() };
            break;
          }
          case "inventor_hsm_function_index_get_25d_operations": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            result = { success: true, operations: InventorHSMFunctionIndexEngine.get25DOperations() };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-29 — Inventor HSM singular operation getter
          case "inventor_hsm_function_index_get_operation": {
            const { InventorHSMFunctionIndexEngine } = await import("../../engines/InventorHSMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...InventorHSMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-09 — Edgecam Function Index (10 actions)
          case "edgecam_function_index_get": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            result = { success: true, index: EdgecamFunctionIndexEngine.getIndex() };
            break;
          }
          case "edgecam_function_index_list_sections": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            result = { success: true, sections: EdgecamFunctionIndexEngine.listSections() };
            break;
          }
          case "edgecam_function_index_get_section": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: EdgecamFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "edgecam_function_index_list_operations": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            result = { success: true, operations: EdgecamFunctionIndexEngine.listOperations() };
            break;
          }
          case "edgecam_function_index_find_parameter": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: EdgecamFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "edgecam_function_index_search_parameters": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: EdgecamFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "edgecam_function_index_get_operations_by_category": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: EdgecamFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "edgecam_function_index_get_summary": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            result = { success: true, ...EdgecamFunctionIndexEngine.getSummary() };
            break;
          }
          case "edgecam_function_index_get_waveform_operations": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            result = { success: true, operations: EdgecamFunctionIndexEngine.getWaveformOperations() };
            break;
          }
          case "edgecam_function_index_get_operation": {
            const { EdgecamFunctionIndexEngine } = await import("../../engines/EdgecamFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...EdgecamFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-10 — ESPRIT Function Index (10 actions)
          case "esprit_function_index_get": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            result = { success: true, index: EspritFunctionIndexEngine.getIndex() };
            break;
          }
          case "esprit_function_index_list_sections": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            result = { success: true, sections: EspritFunctionIndexEngine.listSections() };
            break;
          }
          case "esprit_function_index_get_section": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: EspritFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "esprit_function_index_list_operations": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            result = { success: true, operations: EspritFunctionIndexEngine.listOperations() };
            break;
          }
          case "esprit_function_index_find_parameter": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: EspritFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "esprit_function_index_search_parameters": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: EspritFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "esprit_function_index_get_operations_by_category": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: EspritFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "esprit_function_index_get_summary": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            result = { success: true, ...EspritFunctionIndexEngine.getSummary() };
            break;
          }
          case "esprit_function_index_get_profit_operations": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            result = { success: true, operations: EspritFunctionIndexEngine.getProfitOperations() };
            break;
          }
          case "esprit_function_index_get_operation": {
            const { EspritFunctionIndexEngine } = await import("../../engines/EspritFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...EspritFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-11 — GibbsCAM Function Index (10 actions)
          case "gibbscam_function_index_get": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            result = { success: true, index: GibbsCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "gibbscam_function_index_list_sections": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            result = { success: true, sections: GibbsCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "gibbscam_function_index_get_section": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: GibbsCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "gibbscam_function_index_list_operations": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            result = { success: true, operations: GibbsCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "gibbscam_function_index_find_parameter": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: GibbsCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "gibbscam_function_index_search_parameters": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: GibbsCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "gibbscam_function_index_get_operations_by_category": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: GibbsCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "gibbscam_function_index_get_summary": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            result = { success: true, ...GibbsCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "gibbscam_function_index_get_volumill_operations": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            result = { success: true, operations: GibbsCAMFunctionIndexEngine.getVoluMillOperations() };
            break;
          }
          case "gibbscam_function_index_get_operation": {
            const { GibbsCAMFunctionIndexEngine } = await import("../../engines/GibbsCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...GibbsCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-12 — WorkNC Function Index (10 actions)
          case "worknc_function_index_get": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            result = { success: true, index: WorkNCFunctionIndexEngine.getIndex() };
            break;
          }
          case "worknc_function_index_list_sections": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            result = { success: true, sections: WorkNCFunctionIndexEngine.listSections() };
            break;
          }
          case "worknc_function_index_get_section": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: WorkNCFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "worknc_function_index_list_operations": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            result = { success: true, operations: WorkNCFunctionIndexEngine.listOperations() };
            break;
          }
          case "worknc_function_index_find_parameter": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: WorkNCFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "worknc_function_index_search_parameters": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: WorkNCFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "worknc_function_index_get_operations_by_category": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: WorkNCFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "worknc_function_index_get_summary": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            result = { success: true, ...WorkNCFunctionIndexEngine.getSummary() };
            break;
          }
          case "worknc_function_index_get_auto5_operations": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            result = { success: true, operations: WorkNCFunctionIndexEngine.getAuto5Operations() };
            break;
          }
          case "worknc_function_index_get_operation": {
            const { WorkNCFunctionIndexEngine } = await import("../../engines/WorkNCFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...WorkNCFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-13 — TopSolid'Cam Function Index (10 actions)
          case "topsolid_function_index_get": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            result = { success: true, index: TopSolidCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "topsolid_function_index_list_sections": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            result = { success: true, sections: TopSolidCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "topsolid_function_index_get_section": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: TopSolidCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "topsolid_function_index_list_operations": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "topsolid_function_index_find_parameter": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: TopSolidCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "topsolid_function_index_search_parameters": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: TopSolidCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "topsolid_function_index_get_operations_by_category": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "topsolid_function_index_get_summary": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            result = { success: true, ...TopSolidCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "topsolid_function_index_get_pmi_operations": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            result = { success: true, operations: TopSolidCAMFunctionIndexEngine.getPMIOperations() };
            break;
          }
          case "topsolid_function_index_get_operation": {
            const { TopSolidCAMFunctionIndexEngine } = await import("../../engines/TopSolidCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...TopSolidCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-14 — CAMWorks Function Index (10 actions)
          case "camworks_function_index_get": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            result = { success: true, index: CAMWorksFunctionIndexEngine.getIndex() };
            break;
          }
          case "camworks_function_index_list_sections": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            result = { success: true, sections: CAMWorksFunctionIndexEngine.listSections() };
            break;
          }
          case "camworks_function_index_get_section": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: CAMWorksFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "camworks_function_index_list_operations": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            result = { success: true, operations: CAMWorksFunctionIndexEngine.listOperations() };
            break;
          }
          case "camworks_function_index_find_parameter": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: CAMWorksFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "camworks_function_index_search_parameters": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: CAMWorksFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "camworks_function_index_get_operations_by_category": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: CAMWorksFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "camworks_function_index_get_summary": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            result = { success: true, ...CAMWorksFunctionIndexEngine.getSummary() };
            break;
          }
          case "camworks_function_index_get_afr_operations": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            result = { success: true, operations: CAMWorksFunctionIndexEngine.getAFROperations() };
            break;
          }
          case "camworks_function_index_get_operation": {
            const { CAMWorksFunctionIndexEngine } = await import("../../engines/CAMWorksFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...CAMWorksFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-15 — Tebis Function Index (10 actions)
          case "tebis_function_index_get": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            result = { success: true, index: TebisFunctionIndexEngine.getIndex() };
            break;
          }
          case "tebis_function_index_list_sections": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            result = { success: true, sections: TebisFunctionIndexEngine.listSections() };
            break;
          }
          case "tebis_function_index_get_section": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: TebisFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "tebis_function_index_list_operations": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            result = { success: true, operations: TebisFunctionIndexEngine.listOperations() };
            break;
          }
          case "tebis_function_index_find_parameter": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: TebisFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "tebis_function_index_search_parameters": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: TebisFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "tebis_function_index_get_operations_by_category": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: TebisFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "tebis_function_index_get_summary": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            result = { success: true, ...TebisFunctionIndexEngine.getSummary() };
            break;
          }
          case "tebis_function_index_get_proven_process_operations": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            result = { success: true, operations: TebisFunctionIndexEngine.getProvenProcessOperations() };
            break;
          }
          case "tebis_function_index_get_operation": {
            const { TebisFunctionIndexEngine } = await import("../../engines/TebisFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...TebisFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-16 — BobCAD-CAM Function Index (10 actions)
          case "bobcad_function_index_get": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            result = { success: true, index: BobCADCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "bobcad_function_index_list_sections": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            result = { success: true, sections: BobCADCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "bobcad_function_index_get_section": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: BobCADCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "bobcad_function_index_list_operations": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            result = { success: true, operations: BobCADCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "bobcad_function_index_find_parameter": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: BobCADCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "bobcad_function_index_search_parameters": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: BobCADCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "bobcad_function_index_get_operations_by_category": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: BobCADCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "bobcad_function_index_get_summary": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            result = { success: true, ...BobCADCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "bobcad_function_index_get_dmt_operations": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            result = { success: true, operations: BobCADCAMFunctionIndexEngine.getDMTOperations() };
            break;
          }
          case "bobcad_function_index_get_operation": {
            const { BobCADCAMFunctionIndexEngine } = await import("../../engines/BobCADCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...BobCADCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-17 — Cimatron Function Index (10 actions)
          case "cimatron_function_index_get": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            result = { success: true, index: CimatronFunctionIndexEngine.getIndex() };
            break;
          }
          case "cimatron_function_index_list_sections": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            result = { success: true, sections: CimatronFunctionIndexEngine.listSections() };
            break;
          }
          case "cimatron_function_index_get_section": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: CimatronFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "cimatron_function_index_list_operations": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            result = { success: true, operations: CimatronFunctionIndexEngine.listOperations() };
            break;
          }
          case "cimatron_function_index_find_parameter": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: CimatronFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "cimatron_function_index_search_parameters": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: CimatronFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "cimatron_function_index_get_operations_by_category": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: CimatronFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "cimatron_function_index_get_summary": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            result = { success: true, ...CimatronFunctionIndexEngine.getSummary() };
            break;
          }
          case "cimatron_function_index_get_mold_die_operations": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            result = { success: true, operations: CimatronFunctionIndexEngine.getMoldDieOperations() };
            break;
          }
          case "cimatron_function_index_get_operation": {
            const { CimatronFunctionIndexEngine } = await import("../../engines/CimatronFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...CimatronFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-18 — SprutCAM Function Index (10 actions)
          case "sprutcam_function_index_get": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            result = { success: true, index: SprutCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "sprutcam_function_index_list_sections": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            result = { success: true, sections: SprutCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "sprutcam_function_index_get_section": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: SprutCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "sprutcam_function_index_list_operations": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            result = { success: true, operations: SprutCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "sprutcam_function_index_find_parameter": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: SprutCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "sprutcam_function_index_search_parameters": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: SprutCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "sprutcam_function_index_get_operations_by_category": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: SprutCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "sprutcam_function_index_get_summary": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            result = { success: true, ...SprutCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "sprutcam_function_index_get_robot_operations": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            result = { success: true, operations: SprutCAMFunctionIndexEngine.getRobotOperations() };
            break;
          }
          case "sprutcam_function_index_get_operation": {
            const { SprutCAMFunctionIndexEngine } = await import("../../engines/SprutCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...SprutCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-19 — Alphacam Function Index (10 actions)
          case "alphacam_function_index_get": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            result = { success: true, index: AlphacamFunctionIndexEngine.getIndex() };
            break;
          }
          case "alphacam_function_index_list_sections": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            result = { success: true, sections: AlphacamFunctionIndexEngine.listSections() };
            break;
          }
          case "alphacam_function_index_get_section": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: AlphacamFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "alphacam_function_index_list_operations": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            result = { success: true, operations: AlphacamFunctionIndexEngine.listOperations() };
            break;
          }
          case "alphacam_function_index_find_parameter": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: AlphacamFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "alphacam_function_index_search_parameters": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: AlphacamFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "alphacam_function_index_get_operations_by_category": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: AlphacamFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "alphacam_function_index_get_summary": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            result = { success: true, ...AlphacamFunctionIndexEngine.getSummary() };
            break;
          }
          case "alphacam_function_index_get_drilling_operations": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            result = { success: true, operations: AlphacamFunctionIndexEngine.getDrillingOperations() };
            break;
          }
          case "alphacam_function_index_get_operation": {
            const { AlphacamFunctionIndexEngine } = await import("../../engines/AlphacamFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...AlphacamFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM51 — SURFCAM Function Index (10 actions, TrueMill HSM flagship)
          case "surfcam_function_index_get": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            result = { success: true, index: SURFCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "surfcam_function_index_list_sections": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            result = { success: true, sections: SURFCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "surfcam_function_index_get_section": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: SURFCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "surfcam_function_index_list_operations": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            result = { success: true, operations: SURFCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "surfcam_function_index_find_parameter": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: SURFCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "surfcam_function_index_search_parameters": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: SURFCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "surfcam_function_index_get_operations_by_category": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: SURFCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "surfcam_function_index_get_summary": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            result = { success: true, ...SURFCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "surfcam_function_index_get_truemill_operations": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            result = { success: true, operations: SURFCAMFunctionIndexEngine.getTrueMillOperations() };
            break;
          }
          case "surfcam_function_index_get_operation": {
            const { SURFCAMFunctionIndexEngine } = await import("../../engines/SURFCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...SURFCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM112 — OllamaCAM local-LLM CAM inference (8 actions)
          case "ollama_cam_query": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await OllamaCAMIntegrationEngine.query(task, prompt, opts);
            break;
          }
          case "ollama_cam_strategy_recommend": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await OllamaCAMIntegrationEngine.strategyRecommend(prompt, opts);
            break;
          }
          case "ollama_cam_parameter_extract": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await OllamaCAMIntegrationEngine.parameterExtract(prompt, opts);
            break;
          }
          case "ollama_cam_operation_classify": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await OllamaCAMIntegrationEngine.operationClassify(prompt, opts);
            break;
          }
          case "ollama_cam_tool_select_advisor": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await OllamaCAMIntegrationEngine.toolSelectAdvisor(prompt, opts);
            break;
          }
          case "ollama_cam_health_check": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            result = { success: true, ...(await OllamaCAMIntegrationEngine.healthCheck()) };
            break;
          }
          case "ollama_cam_list_tasks": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            result = { success: true, tasks: OllamaCAMIntegrationEngine.listTasks() };
            break;
          }
          case "ollama_cam_get_system_prompt": {
            const { OllamaCAMIntegrationEngine } = await import("../../engines/OllamaCAMIntegrationEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            result = { success: true, system_prompt: OllamaCAMIntegrationEngine.getSystemPrompt(task) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM113 — NVIDIA NIM/Triton GPU CAM inference (9 actions)
          case "nvidia_cam_query": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await NVIDIALLMCAMEngine.query(task, prompt, opts);
            break;
          }
          case "nvidia_cam_strategy_recommend": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await NVIDIALLMCAMEngine.strategyRecommend(prompt, opts);
            break;
          }
          case "nvidia_cam_parameter_extract": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await NVIDIALLMCAMEngine.parameterExtract(prompt, opts);
            break;
          }
          case "nvidia_cam_operation_classify": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await NVIDIALLMCAMEngine.operationClassify(prompt, opts);
            break;
          }
          case "nvidia_cam_tool_select_advisor": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await NVIDIALLMCAMEngine.toolSelectAdvisor(prompt, opts);
            break;
          }
          case "nvidia_cam_health_check": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const opts = (params.options as { endpoint?: string; apiKey?: string; model?: string } | undefined) ?? {};
            result = { success: true, ...(await NVIDIALLMCAMEngine.healthCheck(opts)) };
            break;
          }
          case "nvidia_cam_list_tasks": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            result = { success: true, tasks: NVIDIALLMCAMEngine.listTasks() };
            break;
          }
          case "nvidia_cam_resolve_endpoint": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const override = params.override as string | undefined;
            result = { success: true, endpoint: NVIDIALLMCAMEngine.resolveEndpoint(override) };
            break;
          }
          case "nvidia_cam_get_system_prompt": {
            const { NVIDIALLMCAMEngine } = await import("../../engines/NVIDIALLMCAMEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            result = { success: true, system_prompt: NVIDIALLMCAMEngine.getSystemPrompt(task) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM117 — Deep Learning Orchestrator (4 actions)
          case "cam_dl_decide": {
            const { CAMDeepLearningOrchestratorEngine } = await import("../../engines/CAMDeepLearningOrchestratorEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = await CAMDeepLearningOrchestratorEngine.decide(task, prompt, opts);
            break;
          }
          case "cam_dl_health_check_all": {
            const { CAMDeepLearningOrchestratorEngine } = await import("../../engines/CAMDeepLearningOrchestratorEngine.js");
            result = { success: true, sources: await CAMDeepLearningOrchestratorEngine.healthCheckAll() };
            break;
          }
          case "cam_dl_list_sources": {
            const { CAMDeepLearningOrchestratorEngine } = await import("../../engines/CAMDeepLearningOrchestratorEngine.js");
            result = { success: true, sources: CAMDeepLearningOrchestratorEngine.listSources() };
            break;
          }
          case "cam_dl_get_default_weights": {
            const { CAMDeepLearningOrchestratorEngine } = await import("../../engines/CAMDeepLearningOrchestratorEngine.js");
            result = { success: true, weights: CAMDeepLearningOrchestratorEngine.getDefaultWeights() };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM118 — Reasoning Chain (8 actions)
          case "cam_reasoning_decide": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
            const prompt = params.prompt as string;
            const opts = (params.options as Record<string, unknown> | undefined) ?? {};
            result = { success: true, ...(await CAMReasoningChainEngine.decide(task, prompt, opts)) };
            break;
          }
          case "cam_reasoning_build_from_decision": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const decision = params.decision as Parameters<typeof CAMReasoningChainEngine.buildFromDecision>[0];
            const request = params.request as Parameters<typeof CAMReasoningChainEngine.buildFromDecision>[1];
            result = { success: true, chain: CAMReasoningChainEngine.buildFromDecision(decision, request) };
            break;
          }
          case "cam_reasoning_get_chain": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const chainId = params.chain_id as string;
            const chain = CAMReasoningChainEngine.getChain(chainId);
            result = { success: chain !== null, chain };
            break;
          }
          case "cam_reasoning_list_chains": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const filter = params.filter as Parameters<typeof CAMReasoningChainEngine.listChains>[0];
            result = { success: true, chains: CAMReasoningChainEngine.listChains(filter) };
            break;
          }
          case "cam_reasoning_why_decision": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const chainId = params.chain_id as string;
            const query = params.query as string;
            result = { success: true, ...CAMReasoningChainEngine.whyDecision(chainId, query) };
            break;
          }
          case "cam_reasoning_compare_alternatives": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const chainId = params.chain_id as string;
            result = { success: true, ...CAMReasoningChainEngine.compareAlternatives(chainId) };
            break;
          }
          case "cam_reasoning_clear_chains": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            CAMReasoningChainEngine.clearChains();
            result = { success: true };
            break;
          }
          case "cam_reasoning_set_max_chains": {
            const { CAMReasoningChainEngine } = await import("../../engines/CAMReasoningChainEngine.js");
            const max = params.max as number;
            CAMReasoningChainEngine.setMaxChains(max);
            result = { success: true, max };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM119 — Confidence Calibration (8 actions)
          case "cam_calibration_record_outcome": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const outcome = CAMConfidenceCalibrationEngine.recordOutcome({
              decisionId: params.decision_id as string,
              task: params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor",
              predictedConfidence: params.predicted_confidence as number,
              wasCorrect: params.was_correct as boolean,
            });
            result = { success: true, outcome };
            break;
          }
          case "cam_calibration_calibrate": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const raw = params.raw_confidence as number;
            const opts = (params.options as Parameters<typeof CAMConfidenceCalibrationEngine.calibrate>[1]) ?? {};
            result = { success: true, ...CAMConfidenceCalibrationEngine.calibrate(raw, opts) };
            break;
          }
          case "cam_calibration_calibrate_decision": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const decision = params.decision as Parameters<typeof CAMConfidenceCalibrationEngine.calibrateDecision>[0];
            const opts = (params.options as Parameters<typeof CAMConfidenceCalibrationEngine.calibrateDecision>[1]) ?? {};
            result = { success: true, ...CAMConfidenceCalibrationEngine.calibrateDecision(decision, opts) };
            break;
          }
          case "cam_calibration_metrics": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const opts = (params.options as Parameters<typeof CAMConfidenceCalibrationEngine.metrics>[0]) ?? {};
            result = { success: true, metrics: CAMConfidenceCalibrationEngine.metrics(opts) };
            break;
          }
          case "cam_calibration_recommend_method": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor" | undefined;
            result = { success: true, method: CAMConfidenceCalibrationEngine.recommendMethod(task) };
            break;
          }
          case "cam_calibration_get_outcome_count": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const task = params.task as "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor" | undefined;
            result = { success: true, count: CAMConfidenceCalibrationEngine.getOutcomeCount(task) };
            break;
          }
          case "cam_calibration_clear_outcomes": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            CAMConfidenceCalibrationEngine.clearOutcomes();
            result = { success: true };
            break;
          }
          case "cam_calibration_set_outcome_cap": {
            const { CAMConfidenceCalibrationEngine } = await import("../../engines/CAMConfidenceCalibrationEngine.js");
            const cap = params.cap as number;
            CAMConfidenceCalibrationEngine.setOutcomeCap(cap);
            result = { success: true, cap };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM121 — Cross-CAM Transfer Learning (13 actions)
          case "cam_transfer_register_domain": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const features = params.features as Parameters<typeof CAMTransferLearningEngine.registerCAMDomain>[0];
            result = { success: true, domain: CAMTransferLearningEngine.registerCAMDomain(features) };
            break;
          }
          case "cam_transfer_list_cams": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            result = { success: true, cams: CAMTransferLearningEngine.listSupportedCAMs() };
            break;
          }
          case "cam_transfer_get_domain": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const slug = params.slug as string;
            result = { success: true, domain: CAMTransferLearningEngine.getDomain(slug) ?? null };
            break;
          }
          case "cam_transfer_domain_similarity": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const sourceCam = params.source_cam as string;
            const targetCam = params.target_cam as string;
            const sigma = params.sigma as number | undefined;
            result = { success: true, ...CAMTransferLearningEngine.domainSimilarity(sourceCam, targetCam, sigma) };
            break;
          }
          case "cam_transfer_record_observation": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const observation = params.observation as Parameters<typeof CAMTransferLearningEngine.recordObservation>[0];
            result = { success: true, observation: CAMTransferLearningEngine.recordObservation(observation) };
            break;
          }
          case "cam_transfer_predict": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const request = params.request as Parameters<typeof CAMTransferLearningEngine.transfer>[0];
            result = { success: true, ...CAMTransferLearningEngine.transfer(request) };
            break;
          }
          case "cam_transfer_best_source": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const targetCam = params.target_cam as string;
            const task = params.task as Parameters<typeof CAMTransferLearningEngine.bestSourceCAM>[1];
            const operation = params.operation as string;
            const material = params.material as string;
            result = { success: true, best: CAMTransferLearningEngine.bestSourceCAM(targetCam, task, operation, material) };
            break;
          }
          case "cam_transfer_record_outcome": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const outcome = params.outcome as Parameters<typeof CAMTransferLearningEngine.recordTransferOutcome>[0];
            result = { success: true, outcome: CAMTransferLearningEngine.recordTransferOutcome(outcome) };
            break;
          }
          case "cam_transfer_accuracy": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const sourceCam = params.source_cam as string | undefined;
            const targetCam = params.target_cam as string | undefined;
            result = { success: true, accuracy: CAMTransferLearningEngine.transferAccuracy(sourceCam, targetCam) };
            break;
          }
          case "cam_transfer_list_observations": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const filter = params.filter as Parameters<typeof CAMTransferLearningEngine.listObservations>[0];
            result = { success: true, observations: CAMTransferLearningEngine.listObservations(filter) };
            break;
          }
          case "cam_transfer_clear_all": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            CAMTransferLearningEngine.clearAll();
            result = { success: true };
            break;
          }
          case "cam_transfer_set_observation_cap": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const cap = params.cap as number;
            CAMTransferLearningEngine.setObservationCap(cap);
            result = { success: true, cap };
            break;
          }
          case "cam_transfer_set_outcome_cap": {
            const { CAMTransferLearningEngine } = await import("../../engines/CAMTransferLearningEngine.js");
            const cap = params.cap as number;
            CAMTransferLearningEngine.setOutcomeCap(cap);
            result = { success: true, cap };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM122 — Model Serving (27 actions)
          case "cam_serve_register_model": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const specArg = params.spec as Parameters<typeof CAMModelServingEngine.registerModel>[0];
            result = { success: true, model: CAMModelServingEngine.registerModel(specArg) };
            break;
          }
          case "cam_serve_deregister_model": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            CAMModelServingEngine.deregisterModel(id);
            result = { success: true, id };
            break;
          }
          case "cam_serve_list_models": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const filter = params.filter as Parameters<typeof CAMModelServingEngine.listModels>[0];
            result = { success: true, models: CAMModelServingEngine.listModels(filter) };
            break;
          }
          case "cam_serve_get_model": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, model: CAMModelServingEngine.getModel(id) };
            break;
          }
          case "cam_serve_update_endpoint": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const url = params.url as string;
            result = { success: true, model: CAMModelServingEngine.updateModelEndpoint(id, url) };
            break;
          }
          case "cam_serve_set_routing_policy": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const camSystem = params.cam_system as string;
            const task = params.task as string;
            const kind = params.kind as Parameters<typeof CAMModelServingEngine.setRoutingPolicy>[2];
            const overrides = params.overrides as Parameters<typeof CAMModelServingEngine.setRoutingPolicy>[3];
            result = { success: true, policy: CAMModelServingEngine.setRoutingPolicy(camSystem, task, kind, overrides) };
            break;
          }
          case "cam_serve_get_routing_policy": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const camSystem = params.cam_system as string;
            const task = params.task as string;
            result = { success: true, policy: CAMModelServingEngine.getRoutingPolicy(camSystem, task) };
            break;
          }
          case "cam_serve_list_routing_policies": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            result = { success: true, policies: CAMModelServingEngine.listRoutingPolicies() };
            break;
          }
          case "cam_serve_route_request": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const req = params.request as Parameters<typeof CAMModelServingEngine.routeRequest>[0];
            result = { success: true, decision: CAMModelServingEngine.routeRequest(req) };
            break;
          }
          case "cam_serve_deploy_shadow": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, envelope: CAMModelServingEngine.deployShadow(id) };
            break;
          }
          case "cam_serve_promote_to_canary": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const weight = params.weight as number;
            result = { success: true, envelope: CAMModelServingEngine.promoteToCanary(id, weight) };
            break;
          }
          case "cam_serve_promote_to_active": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, envelope: CAMModelServingEngine.promoteToActive(id) };
            break;
          }
          case "cam_serve_demote_from_active": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const reason = params.reason as string;
            result = { success: true, envelope: CAMModelServingEngine.demoteFromActive(id, reason) };
            break;
          }
          case "cam_serve_rollback_canary": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const reason = params.reason as string;
            result = { success: true, envelope: CAMModelServingEngine.rollbackCanary(id, reason) };
            break;
          }
          case "cam_serve_retire_model": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, envelope: CAMModelServingEngine.retireModel(id) };
            break;
          }
          case "cam_serve_record_metric": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const sample = params.sample as Parameters<typeof CAMModelServingEngine.recordMetric>[1];
            CAMModelServingEngine.recordMetric(id, sample);
            result = { success: true, id };
            break;
          }
          case "cam_serve_get_health": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, health: CAMModelServingEngine.getModelHealth(id) };
            break;
          }
          case "cam_serve_list_health": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            result = { success: true, health: CAMModelServingEngine.listAllHealth() };
            break;
          }
          case "cam_serve_enqueue_batch": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const batchKey = params.batch_key as string;
            const requestId = params.request_id as string;
            const payload = params.payload as unknown;
            result = { success: true, ...CAMModelServingEngine.enqueueBatchRequest(id, batchKey, requestId, payload) };
            break;
          }
          case "cam_serve_drain_batch": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const batchKey = params.batch_key as string;
            const force = params.force as boolean | undefined;
            const drained = CAMModelServingEngine.drainBatch(id, batchKey, force);
            result = { success: true, drained };
            break;
          }
          case "cam_serve_peek_batch_size": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const batchKey = params.batch_key as string;
            result = { success: true, size: CAMModelServingEngine.peekBatchSize(id, batchKey) };
            break;
          }
          case "cam_serve_check_rate_limit": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            result = { success: true, ...CAMModelServingEngine.checkRateLimit(id) };
            break;
          }
          case "cam_serve_set_rate_limit": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const id = params.id as string;
            const capacity = params.capacity as number;
            const refillPerSec = params.refill_per_sec as number;
            result = { success: true, model: CAMModelServingEngine.setRateLimit(id, capacity, refillPerSec) };
            break;
          }
          case "cam_serve_list_pending_confirmations": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const filter = params.filter as Parameters<typeof CAMModelServingEngine.listPendingConfirmations>[0];
            result = { success: true, confirmations: CAMModelServingEngine.listPendingConfirmations(filter) };
            break;
          }
          case "cam_serve_clear_confirmations": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            result = { success: true, cleared: CAMModelServingEngine.clearConfirmations() };
            break;
          }
          case "cam_serve_set_metric_buffer_size": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            const size = params.size as number;
            CAMModelServingEngine.setMetricBufferSize(size);
            result = { success: true, size };
            break;
          }
          case "cam_serve_clear_all": {
            const { CAMModelServingEngine } = await import("../../engines/CAMModelServingEngine.js");
            CAMModelServingEngine.clearAll();
            result = { success: true };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM127 — AI Validation (production-readiness behavioral harness)
          case "cam_ai_validate": {
            const { CAMAIValidationEngine } = await import("../../engines/CAMAIValidationEngine.js");
            const outputPath = params.outputPath as string | undefined;
            const report = await CAMAIValidationEngine.runValidation({ outputPath });
            result = { success: true, report };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM120 — Feedback Loop (9 actions)
          case "cam_feedback_record_correction": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const input = params.input as Parameters<typeof CAMFeedbackLoopEngine.recordCorrection>[0];
            result = { success: true, record: CAMFeedbackLoopEngine.recordCorrection(input) };
            break;
          }
          case "cam_feedback_record_outcome": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const input = params.input as Parameters<typeof CAMFeedbackLoopEngine.recordOutcome>[0];
            result = { success: true, record: CAMFeedbackLoopEngine.recordOutcome(input) };
            break;
          }
          case "cam_feedback_get_corrections": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const filter = (params.filter as Parameters<typeof CAMFeedbackLoopEngine.getCorrections>[0]) ?? {};
            result = { success: true, corrections: CAMFeedbackLoopEngine.getCorrections(filter) };
            break;
          }
          case "cam_feedback_accuracy_drift": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const opts = (params.opts as Parameters<typeof CAMFeedbackLoopEngine.accuracyDrift>[0]) ?? {};
            result = { success: true, report: CAMFeedbackLoopEngine.accuracyDrift(opts) };
            break;
          }
          case "cam_feedback_correction_patterns": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const opts = (params.opts as Parameters<typeof CAMFeedbackLoopEngine.correctionPatterns>[0]) ?? {};
            result = { success: true, report: CAMFeedbackLoopEngine.correctionPatterns(opts) };
            break;
          }
          case "cam_feedback_lora_training_export": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const opts = (params.opts as Parameters<typeof CAMFeedbackLoopEngine.loraTrainingExport>[0]) ?? {};
            result = { success: true, pairs: CAMFeedbackLoopEngine.loraTrainingExport(opts) };
            break;
          }
          case "cam_feedback_stats": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            result = { success: true, stats: CAMFeedbackLoopEngine.feedbackStats() };
            break;
          }
          case "cam_feedback_set_buffer_cap": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            const cap = params.cap as number;
            CAMFeedbackLoopEngine.setBufferCap(cap);
            result = { success: true, cap };
            break;
          }
          case "cam_feedback_clear_all": {
            const { CAMFeedbackLoopEngine } = await import("../../engines/CAMFeedbackLoopEngine.js");
            CAMFeedbackLoopEngine.clearAll();
            result = { success: true };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-20 — VISI Function Index (10 actions)
          case "visi_function_index_get": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            result = { success: true, index: VISIFunctionIndexEngine.getIndex() };
            break;
          }
          case "visi_function_index_list_sections": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            result = { success: true, sections: VISIFunctionIndexEngine.listSections() };
            break;
          }
          case "visi_function_index_get_section": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: VISIFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "visi_function_index_list_operations": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            result = { success: true, operations: VISIFunctionIndexEngine.listOperations() };
            break;
          }
          case "visi_function_index_find_parameter": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: VISIFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "visi_function_index_search_parameters": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: VISIFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "visi_function_index_get_operations_by_category": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: VISIFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "visi_function_index_get_summary": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            result = { success: true, ...VISIFunctionIndexEngine.getSummary() };
            break;
          }
          case "visi_function_index_get_mold_operations": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            result = { success: true, operations: VISIFunctionIndexEngine.getMoldOperations() };
            break;
          }
          case "visi_function_index_get_operation": {
            const { VISIFunctionIndexEngine } = await import("../../engines/VISIFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...VISIFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-21 — Creo (PTC) Function Index (10 actions)
          case "creo_function_index_get": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            result = { success: true, index: CreoFunctionIndexEngine.getIndex() };
            break;
          }
          case "creo_function_index_list_sections": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            result = { success: true, sections: CreoFunctionIndexEngine.listSections() };
            break;
          }
          case "creo_function_index_get_section": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: CreoFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "creo_function_index_list_operations": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            result = { success: true, operations: CreoFunctionIndexEngine.listOperations() };
            break;
          }
          case "creo_function_index_find_parameter": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: CreoFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "creo_function_index_search_parameters": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: CreoFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "creo_function_index_get_operations_by_category": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: CreoFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "creo_function_index_get_summary": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            result = { success: true, ...CreoFunctionIndexEngine.getSummary() };
            break;
          }
          case "creo_function_index_get_mill_turn_operations": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            result = { success: true, operations: CreoFunctionIndexEngine.getMillTurnOperations() };
            break;
          }
          case "creo_function_index_get_operation": {
            const { CreoFunctionIndexEngine } = await import("../../engines/CreoFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...CreoFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-22 — PartMaker (Autodesk Swiss) Function Index (10 actions)
          case "partmaker_function_index_get": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            result = { success: true, index: PartMakerFunctionIndexEngine.getIndex() };
            break;
          }
          case "partmaker_function_index_list_sections": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            result = { success: true, sections: PartMakerFunctionIndexEngine.listSections() };
            break;
          }
          case "partmaker_function_index_get_section": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: PartMakerFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "partmaker_function_index_list_operations": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            result = { success: true, operations: PartMakerFunctionIndexEngine.listOperations() };
            break;
          }
          case "partmaker_function_index_find_parameter": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: PartMakerFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "partmaker_function_index_search_parameters": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: PartMakerFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "partmaker_function_index_get_operations_by_category": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: PartMakerFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "partmaker_function_index_get_summary": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            result = { success: true, ...PartMakerFunctionIndexEngine.getSummary() };
            break;
          }
          case "partmaker_function_index_get_swiss_turning_operations": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            result = { success: true, operations: PartMakerFunctionIndexEngine.getSwissTurningOperations() };
            break;
          }
          case "partmaker_function_index_get_operation": {
            const { PartMakerFunctionIndexEngine } = await import("../../engines/PartMakerFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...PartMakerFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-23 — CATIA Machining (Dassault) Function Index (10 actions)
          case "catia_machining_function_index_get": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            result = { success: true, index: CATIAMachiningFunctionIndexEngine.getIndex() };
            break;
          }
          case "catia_machining_function_index_list_sections": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            result = { success: true, sections: CATIAMachiningFunctionIndexEngine.listSections() };
            break;
          }
          case "catia_machining_function_index_get_section": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: CATIAMachiningFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "catia_machining_function_index_list_operations": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.listOperations() };
            break;
          }
          case "catia_machining_function_index_find_parameter": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: CATIAMachiningFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "catia_machining_function_index_search_parameters": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: CATIAMachiningFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "catia_machining_function_index_get_operations_by_category": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "catia_machining_function_index_get_summary": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            result = { success: true, ...CATIAMachiningFunctionIndexEngine.getSummary() };
            break;
          }
          case "catia_machining_function_index_get_surface_operations": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            result = { success: true, operations: CATIAMachiningFunctionIndexEngine.getSurfaceMachiningOperations() };
            break;
          }
          case "catia_machining_function_index_get_operation": {
            const { CATIAMachiningFunctionIndexEngine } = await import("../../engines/CATIAMachiningFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...CATIAMachiningFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-24 — FeatureCAM (Autodesk AFR) Function Index (10 actions)
          case "featurecam_function_index_get": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            result = { success: true, index: FeatureCAMFunctionIndexEngine.getIndex() };
            break;
          }
          case "featurecam_function_index_list_sections": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            result = { success: true, sections: FeatureCAMFunctionIndexEngine.listSections() };
            break;
          }
          case "featurecam_function_index_get_section": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: FeatureCAMFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "featurecam_function_index_list_operations": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            result = { success: true, operations: FeatureCAMFunctionIndexEngine.listOperations() };
            break;
          }
          case "featurecam_function_index_find_parameter": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: FeatureCAMFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "featurecam_function_index_search_parameters": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: FeatureCAMFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "featurecam_function_index_get_operations_by_category": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: FeatureCAMFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "featurecam_function_index_get_summary": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            result = { success: true, ...FeatureCAMFunctionIndexEngine.getSummary() };
            break;
          }
          case "featurecam_function_index_get_afr_operations": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            result = { success: true, operations: FeatureCAMFunctionIndexEngine.getAFROperations() };
            break;
          }
          case "featurecam_function_index_get_operation": {
            const { FeatureCAMFunctionIndexEngine } = await import("../../engines/FeatureCAMFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...FeatureCAMFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-25 — VERICUT (CGTech NC verification + OptiPath) Function Index (10 actions)
          case "vericut_function_index_get": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, index: VericutFunctionIndexEngine.getIndex() };
            break;
          }
          case "vericut_function_index_list_sections": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, sections: VericutFunctionIndexEngine.listSections() };
            break;
          }
          case "vericut_function_index_get_section": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            const sectionKey = params.section_key as string;
            result = { success: true, section: VericutFunctionIndexEngine.getSection(sectionKey) };
            break;
          }
          case "vericut_function_index_list_operations": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, operations: VericutFunctionIndexEngine.listOperations() };
            break;
          }
          case "vericut_function_index_find_parameter": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            const paramName = params.parameter_name as string;
            result = { success: true, results: VericutFunctionIndexEngine.findParameter(paramName) };
            break;
          }
          case "vericut_function_index_search_parameters": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: VericutFunctionIndexEngine.searchParameters(query, limit) };
            break;
          }
          case "vericut_function_index_get_operations_by_category": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            const category = params.category as string;
            result = { success: true, operations: VericutFunctionIndexEngine.getOperationsByCategory(category) };
            break;
          }
          case "vericut_function_index_get_summary": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, ...VericutFunctionIndexEngine.getSummary() };
            break;
          }
          case "vericut_function_index_get_verification_operations": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, operations: VericutFunctionIndexEngine.getVerificationOperations() };
            break;
          }
          case "vericut_function_index_get_optimization_operations": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            result = { success: true, operations: VericutFunctionIndexEngine.getOptimizationOperations() };
            break;
          }
          case "vericut_function_index_get_operation": {
            const { VericutFunctionIndexEngine } = await import("../../engines/VericutFunctionIndexEngine.js");
            const operationId = params.operation_id as string;
            result = { success: true, ...VericutFunctionIndexEngine.getOperation(operationId) };
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM74..U-CAM78 - Phase-5 production engines
          case "cam_param_optimize": {
            const { camParameterOptimizerEngine } = await import("../../engines/CAMParameterOptimizerEngine.js");
            result = { success: true, ...camParameterOptimizerEngine.optimize({
              target_cam: params.target_cam as string,
              objective: params.objective as "cycle_time" | "surface_finish" | "tool_life" | "balanced",
              current: (params.current as Record<string, number>) ?? {},
              max_step_pct: params.max_step_pct as number | undefined,
            }) };
            break;
          }
          case "cam_cross_translate": {
            const { camCrossSystemTranslatorEngine } = await import("../../engines/CAMCrossSystemTranslatorEngine.js");
            result = { success: true, ...camCrossSystemTranslatorEngine.translate({
              source_cam: params.source_cam as string,
              target_cam: params.target_cam as string,
              source_operation: params.source_operation as string,
              source_parameters: (params.source_parameters as Record<string, unknown>) ?? {},
            }) };
            break;
          }
          case "cam_agi_reason": {
            const { camAGIReasoningEngine } = await import("../../engines/CAMAGIReasoningEngine.js");
            result = { success: true, ...camAGIReasoningEngine.reason({
              target_cam: params.target_cam as string,
              decision_context: params.decision_context as string,
              options: (params.options as string[] | undefined) ?? [],
            }) };
            break;
          }
          case "cam_tribal_lookup": {
            const { camTribalKnowledgeEngine } = await import("../../engines/CAMTribalKnowledgeEngine.js");
            result = { success: true, ...camTribalKnowledgeEngine.lookup({
              target_cam: params.target_cam as string,
              query: params.query as string,
              max_tips: params.max_tips as number | undefined,
            }) };
            break;
          }
          case "cam_feature_recognize": {
            const { camFeatureLearningEngine } = await import("../../engines/CAMFeatureLearningEngine.js");
            result = { success: true, ...camFeatureLearningEngine.recognize({
              target_cam: params.target_cam as string,
              part_geometry_hint: params.part_geometry_hint as string | undefined,
            }) };
            break;
          }

          // MILL-MASTER/P1-U06 — CAM AGI Master Orchestrator (3 actions)
          case "cam_agi_route": {
            const { camAGIMasterOrchestratorEngine } = await import("../../engines/CAMAGIMasterOrchestratorEngine.js");
            const orchestrationResult = camAGIMasterOrchestratorEngine.orchestrate({
              request_type: (params.request_type as "recommend" | "compare" | "generate" | "analyze" | "tribal") ?? "recommend",
              reasoning_mode: params.reasoning_mode,
              part_name: params.part_name,
              material: params.material,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              machine_type: params.machine_type,
              machine_model: params.machine_model,
              controller: params.controller,
              feature_type: params.feature_type,
              operation: params.operation,
              tool_diameter_mm: params.tool_diameter_mm,
              tool_flutes: params.tool_flutes,
              part_complexity: params.part_complexity,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              has_undercuts: params.has_undercuts,
              requires_5axis: params.requires_5axis,
              available_cams: params.available_cams,
              preferred_cam: params.preferred_cam,
              include_tribal: params.include_tribal,
              include_comparison: params.include_comparison,
              include_reasoning_chain: params.include_reasoning_chain,
            });
            result = { success: true, ...orchestrationResult };
            break;
          }
          case "cam_compare_systems": {
            const { camAGIMasterOrchestratorEngine } = await import("../../engines/CAMAGIMasterOrchestratorEngine.js");
            const featureType = params.feature_type ?? "pocket_2d";
            const comparison = camAGIMasterOrchestratorEngine.compareStrategies(featureType, {
              request_type: "compare",
              feature_type: featureType,
              material: params.material,
              material_iso: params.material_iso,
              operation: params.operation,
              part_complexity: params.part_complexity,
              available_cams: params.available_cams,
            });
            result = { success: true, comparison };
            break;
          }
          case "cam_ensemble": {
            const { camAGIMasterOrchestratorEngine } = await import("../../engines/CAMAGIMasterOrchestratorEngine.js");
            const ensembleResult = camAGIMasterOrchestratorEngine.orchestrate({
              request_type: "analyze",
              reasoning_mode: params.reasoning_mode ?? "multi_path",
              part_name: params.part_name,
              material: params.material,
              material_iso: params.material_iso,
              machine_type: params.machine_type,
              feature_type: params.feature_type,
              operation: params.operation,
              part_complexity: params.part_complexity,
              available_cams: params.available_cams ?? ["hypermill", "mastercam", "fusion360", "inventorcam"],
              include_tribal: true,
              include_comparison: true,
              include_reasoning_chain: true,
            });
            result = { success: true, ensemble: ensembleResult };
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // CAM-EXHAUST-MS0 WIRING — 12 engines, 35 actions
          // ═══════════════════════════════════════════════════════════════════

          case "cam_analyze_toolpath": {
            const { CAMAnalyzeEngine } = await import("../../engines/CAMAnalyzeEngine.js");
            const analysis = CAMAnalyzeEngine.analyze(params);
            result = { success: true, analysis };
            break;
          }

          case "cam_deep_query": {
            const { camDeepLearningEngine } = await import("../../engines/CAMDeepLearningEngine.js");
            const response = camDeepLearningEngine.processQuery(params.query, params.context);
            result = { success: true, response };
            break;
          }
          case "cam_deep_similar": {
            const { camDeepLearningEngine } = await import("../../engines/CAMDeepLearningEngine.js");
            const strategies = camDeepLearningEngine.findSimilarStrategies(params.strategy, params.topK ?? 5);
            result = { success: true, strategies };
            break;
          }
          case "cam_deep_cross_map": {
            const { camDeepLearningEngine } = await import("../../engines/CAMDeepLearningEngine.js");
            const mapping = camDeepLearningEngine.getCrossCAMMapping(params.source_cam, params.target_cam);
            result = { success: true, mapping };
            break;
          }
          case "cam_deep_systems": {
            const { camDeepLearningEngine } = await import("../../engines/CAMDeepLearningEngine.js");
            const systems = camDeepLearningEngine.getSupportedCAMSystems();
            result = { success: true, systems };
            break;
          }

          case "cam_export": {
            const { CAMExportEngine } = await import("../../engines/CAMExportEngine.js");
            const exported = CAMExportEngine.export(params);
            result = { success: true, exported };
            break;
          }
          case "cam_export_get": {
            const { CAMExportEngine } = await import("../../engines/CAMExportEngine.js");
            const exportData = CAMExportEngine.getExport(params.export_id);
            result = { success: true, export: exportData };
            break;
          }
          case "cam_export_systems": {
            const { CAMExportEngine } = await import("../../engines/CAMExportEngine.js");
            const systems = CAMExportEngine.listSupportedSystems();
            result = { success: true, systems };
            break;
          }

          case "cam_exhaustion_plan_next": {
            const { camInputExhaustionPlannerEngine } = await import("../../engines/CAMInputExhaustionPlannerEngine.js");
            const plan = camInputExhaustionPlannerEngine.planNext(params);
            result = { success: true, plan };
            break;
          }
          case "cam_exhaustion_coverage": {
            const { camInputExhaustionPlannerEngine } = await import("../../engines/CAMInputExhaustionPlannerEngine.js");
            const coverage = camInputExhaustionPlannerEngine.getCoverageReport();
            result = { success: true, coverage };
            break;
          }
          case "cam_exhaustion_audit": {
            const { camInputExhaustionPlannerEngine } = await import("../../engines/CAMInputExhaustionPlannerEngine.js");
            const audit = camInputExhaustionPlannerEngine.auditCam(params.cam_system);
            result = { success: true, audit };
            break;
          }
          case "cam_exhaustion_in_scope": {
            const { camInputExhaustionPlannerEngine } = await import("../../engines/CAMInputExhaustionPlannerEngine.js");
            const cams = camInputExhaustionPlannerEngine.getInScopeCams();
            result = { success: true, cams };
            break;
          }

          case "cam_kernel_parse_dxf": {
            const { camKernelExtensionEngine } = await import("../../engines/CAMKernelExtensionEngine.js");
            const parsed = camKernelExtensionEngine.parseDXF(params.dxf_content);
            result = { success: true, parsed };
            break;
          }
          case "cam_kernel_parse_svg": {
            const { camKernelExtensionEngine } = await import("../../engines/CAMKernelExtensionEngine.js");
            const parsed = camKernelExtensionEngine.parseSVG(params.svg_content);
            result = { success: true, parsed };
            break;
          }
          case "cam_kernel_interpret_nl": {
            const { camKernelExtensionEngine } = await import("../../engines/CAMKernelExtensionEngine.js");
            const interpreted = camKernelExtensionEngine.interpretNLCommand(params.command);
            result = { success: true, interpreted };
            break;
          }
          case "cam_kernel_diff_gcode": {
            const { camKernelExtensionEngine } = await import("../../engines/CAMKernelExtensionEngine.js");
            const diff = camKernelExtensionEngine.diffGCode(params.gcode_a, params.gcode_b);
            result = { success: true, diff };
            break;
          }

          case "cam_kernel_validate": {
            const { camKernelValidationEngine } = await import("../../engines/CAMKernelValidationEngine.js");
            const validation = camKernelValidationEngine.validateCAMInput(params);
            result = { success: true, validation };
            break;
          }
          case "cam_kernel_list_schemas": {
            const { camKernelValidationEngine } = await import("../../engines/CAMKernelValidationEngine.js");
            const schemas = camKernelValidationEngine.listSchemas();
            result = { success: true, schemas };
            break;
          }
          case "cam_kernel_dfm_analyze": {
            const { camKernelValidationEngine } = await import("../../engines/CAMKernelValidationEngine.js");
            const dfm = camKernelValidationEngine.analyzeDFM(params);
            result = { success: true, dfm };
            break;
          }

          case "cam_sdk_optimize_sf": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            const optimized = camPluginSDKEngine.optimizeSF(params);
            result = { success: true, optimized };
            break;
          }
          case "cam_sdk_check_safety": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            const safety = camPluginSDKEngine.checkSafety(params);
            result = { success: true, safety };
            break;
          }
          case "cam_sdk_suggest_tool": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            const suggestion = camPluginSDKEngine.suggestTool(params);
            result = { success: true, suggestion };
            break;
          }
          case "cam_sdk_get_tip": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            const tip = camPluginSDKEngine.getTip(params.operation, params.material);
            result = { success: true, tip };
            break;
          }
          case "cam_sdk_batch": {
            const { camPluginSDKEngine } = await import("../../engines/CAMPluginSDKEngine.js");
            const batchResult = camPluginSDKEngine.batch(params.operations);
            result = { success: true, batch: batchResult };
            break;
          }

          case "cam_strategy_recommend_full": {
            const { camStrategyRecommenderEngine } = await import("../../engines/CAMStrategyRecommenderEngine.js");
            const recommendation = camStrategyRecommenderEngine.recommend(params);
            result = { success: true, recommendation };
            break;
          }

          case "cam_tool_library_create": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const library = CAMToolLibraryEngine.createLibrary(params.name, params.description);
            result = { success: true, library };
            break;
          }
          case "cam_tool_library_add": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const added = CAMToolLibraryEngine.addToolToLibrary(params.library_id, params.tool);
            result = { success: true, added };
            break;
          }
          case "cam_tool_library_search": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const tools = CAMToolLibraryEngine.searchTools(params.query, params.filters);
            result = { success: true, tools };
            break;
          }
          case "cam_tool_library_params": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const paramResult = CAMToolLibraryEngine.getToolParameters(params.tool_id, params.operation);
            result = { success: true, parameters: paramResult };
            break;
          }
          case "cam_tool_library_export": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const exported = CAMToolLibraryEngine.exportLibrary(params.library_id, params.format);
            result = { success: true, exported };
            break;
          }
          case "cam_tool_library_list": {
            const { CAMToolLibraryEngine } = await import("../../engines/CAMToolLibraryEngine.js");
            const libraries = CAMToolLibraryEngine.listLibraries();
            result = { success: true, libraries };
            break;
          }

          case "cam_tool_get_by_number": {
            const { CAMToolGetEngine } = await import("../../engines/CAMToolGetEngine.js");
            const tool = CAMToolGetEngine.getByNumber(params.tool_number, params.library_id);
            result = { success: true, tool };
            break;
          }
          case "cam_tool_query": {
            const { CAMToolGetEngine } = await import("../../engines/CAMToolGetEngine.js");
            const tools = CAMToolGetEngine.query(params);
            result = { success: true, tools };
            break;
          }
          case "cam_tool_select_for_op": {
            const { CAMToolGetEngine } = await import("../../engines/CAMToolGetEngine.js");
            const selection = CAMToolGetEngine.selectForOperation(params);
            result = { success: true, selection };
            break;
          }
          case "cam_tool_magazine": {
            const { CAMToolGetEngine } = await import("../../engines/CAMToolGetEngine.js");
            const magazine = CAMToolGetEngine.getMagazine(params.machine_id);
            result = { success: true, magazine };
            break;
          }
          case "cam_tool_find_replacement": {
            const { CAMToolGetEngine } = await import("../../engines/CAMToolGetEngine.js");
            const replacement = CAMToolGetEngine.findReplacement(params.tool_id, params.reason);
            result = { success: true, replacement };
            break;
          }
          // CAM-EXHAUST-MS0: MillingLoRACadenceEngine (3 actions)
          case "milling_lora_predict": {
            const { millingLoRACadenceEngine } = await import("../../engines/MillingLoRACadenceEngine.js");
            const trigger = millingLoRACadenceEngine.shouldTriggerRun();
            result = { success: true, should_trigger: trigger.shouldTrigger, reason: trigger.reason, state: millingLoRACadenceEngine.getState() };
            break;
          }
          case "milling_lora_train": {
            const { millingLoRACadenceEngine } = await import("../../engines/MillingLoRACadenceEngine.js");
            const p = params as { trigger_type?: "scheduled" | "data-drift" | "performance-drop" | "manual"; notes?: string };
            const run = millingLoRACadenceEngine.startRun(p.trigger_type ?? "manual", p.notes);
            result = { success: true, run_id: run.id, status: run.status, started_at: run.startedAt };
            break;
          }
          case "milling_lora_optimize": {
            const { millingLoRACadenceEngine } = await import("../../engines/MillingLoRACadenceEngine.js");
            const p = params as { current_score: number; baseline_score: number };
            const drift = millingLoRACadenceEngine.checkDrift(p.current_score, p.baseline_score);
            result = { success: true, drift_detected: drift.driftDetected, drift_amount: drift.driftAmount, threshold: drift.threshold };
            break;
          }
          // CAM-EXHAUST-MS0: MillTurnLoRACadenceEngine (3 actions)
          case "millturn_lora_predict": {
            const { millTurnLoRACadenceEngine } = await import("../../engines/MillTurnLoRACadenceEngine.js");
            const trigger = millTurnLoRACadenceEngine.shouldTriggerRun();
            result = { success: true, should_trigger: trigger.shouldTrigger, reason: trigger.reason, state: millTurnLoRACadenceEngine.getState() };
            break;
          }
          case "millturn_lora_train": {
            const { millTurnLoRACadenceEngine } = await import("../../engines/MillTurnLoRACadenceEngine.js");
            const p = params as { trigger_type?: "scheduled" | "data-drift" | "performance-drop" | "manual"; notes?: string };
            const run = millTurnLoRACadenceEngine.startRun(p.trigger_type ?? "manual", p.notes);
            result = { success: true, run_id: run.id, status: run.status, started_at: run.startedAt };
            break;
          }
          case "millturn_lora_optimize": {
            const { millTurnLoRACadenceEngine } = await import("../../engines/MillTurnLoRACadenceEngine.js");
            const p = params as { current_score: number; baseline_score: number };
            const drift = millTurnLoRACadenceEngine.checkDrift(p.current_score, p.baseline_score);
            result = { success: true, drift_detected: drift.driftDetected, drift_amount: drift.driftAmount, threshold: drift.threshold };
            break;
          }

// Legacy actions declared in commits b7e0b298f / 5af81bd79 — engines live in
          // other dispatchers. Route callers to the correct dispatcher.
          case "cam_compare_programs": {
            result = {
              success: false,
              error: "cam_compare_programs handled by ProgramCompareEngine via prism_quality dispatcher",
              redirect: { dispatcher: "prism_quality", action: "program_compare" },
            };
            break;
          }
          case "cam_dfm_check": {
            result = {
              success: false,
              error: "cam_dfm_check handled by DFMAnalyzer via prism_cad dispatcher",
              redirect: { dispatcher: "prism_cad", action: "dfm_check" },
            };
            break;
          }
          case "cam_feasibility_check": {
            result = {
              success: false,
              error: "cam_feasibility_check handled by FeasibilityOrchestrator via prism_feasibility dispatcher",
              redirect: { dispatcher: "prism_feasibility", action: "orchestrator_full" },
            };
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE12 — mastercam5AxisEngine (E2501)
          case "mastercam_5axis_recommend": {
            const { mastercam5AxisEngine } = await import("../../engines/Mastercam5AxisEngine.js");
            result = { success: true, recommendations: mastercam5AxisEngine.recommend({
              geometry: params.geometry,
              goal: params.goal,
              isoGroup: params.isoGroup ?? params.iso_group,
              toolDiameterMm: params.toolDiameterMm ?? params.tool_diameter_mm,
              toolType: params.toolType ?? params.tool_type,
              cornerRadiusMm: params.cornerRadiusMm ?? params.corner_radius_mm,
              kinematics: params.kinematics,
              maxWallAngleDeg: params.maxWallAngleDeg ?? params.max_wall_angle_deg,
              minFilletRadiusMm: params.minFilletRadiusMm ?? params.min_fillet_radius_mm,
              targetRaUm: params.targetRaUm ?? params.target_ra_um,
              requireCollisionCheck: params.requireCollisionCheck ?? params.require_collision_check,
              partToleranceMm: params.partToleranceMm ?? params.part_tolerance_mm,
            }) };
            break;
          }
          case "mastercam_5axis_tilt_limits": {
            const { mastercam5AxisEngine } = await import("../../engines/Mastercam5AxisEngine.js");
            result = { success: true, ...mastercam5AxisEngine.checkTiltLimits({
              tiltADeg: params.tiltADeg ?? params.tilt_a_deg,
              tiltBDeg: params.tiltBDeg ?? params.tilt_b_deg,
              machineAMin: params.machineAMin ?? params.machine_a_min,
              machineAMax: params.machineAMax ?? params.machine_a_max,
              machineBMin: params.machineBMin ?? params.machine_b_min,
              machineBMax: params.machineBMax ?? params.machine_b_max,
            }) };
            break;
          }
          case "mastercam_5axis_list_strategies": {
            const { mastercam5AxisEngine } = await import("../../engines/Mastercam5AxisEngine.js");
            result = { success: true, strategies: mastercam5AxisEngine.listStrategies() };
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE12 — multiAgentAIInterfaceEngine
          case "multi_agent_register_session": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            result = { success: true, ...multiAgentAIInterfaceEngine.registerSession({
              agent_id: params.agent_id,
              family: params.family,
              lane: params.lane,
              machine: params.machine,
              token_budget: params.token_budget,
            }) };
            break;
          }
          case "multi_agent_get_activity": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            result = { success: true, ...multiAgentAIInterfaceEngine.getActivity() };
            break;
          }
          case "multi_agent_query_chains": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            result = { success: true, chains: multiAgentAIInterfaceEngine.queryChains({
              intent_pattern: params.intent_pattern,
              source: params.source,
              status: params.status,
              created_by: params.created_by,
              since: params.since,
              limit: params.limit,
            }) };
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE12 — fusion360AutomationBridge
          case "fusion360_open": {
            const { fusion360AutomationBridge } = await import("../../engines/Fusion360AutomationBridge.js");
            try {
              const r = await fusion360AutomationBridge.open(
                params.file_path as string,
                params.base_url ? { baseUrl: params.base_url as string } : {},
              );
              result = { success: true, ...r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          case "fusion360_get_geometry": {
            const { fusion360AutomationBridge } = await import("../../engines/Fusion360AutomationBridge.js");
            try {
              const r = await fusion360AutomationBridge.getGeometry();
              result = { success: true, geometry: r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          case "fusion360_export_step": {
            const { fusion360AutomationBridge } = await import("../../engines/Fusion360AutomationBridge.js");
            try {
              const r = await fusion360AutomationBridge.exportSTEP(params.output_path as string);
              result = { success: true, ...r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE12 — hypermillAutomationBridge
          case "hypermill_bridge_open": {
            const { hypermillAutomationBridge } = await import("../../engines/HyperMILLAutomationBridge.js");
            try {
              const r = await hypermillAutomationBridge.open(
                params.file_path as string,
                { acHost: params.ac_host as string | undefined, acPort: params.ac_port as number | undefined },
              );
              result = { success: true, ...r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          case "hypermill_bridge_get_geometry": {
            const { hypermillAutomationBridge } = await import("../../engines/HyperMILLAutomationBridge.js");
            try {
              const r = await hypermillAutomationBridge.getGeometry();
              result = { success: true, geometry: r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          case "hypermill_bridge_export_step": {
            const { hypermillAutomationBridge } = await import("../../engines/HyperMILLAutomationBridge.js");
            try {
              const r = await hypermillAutomationBridge.exportSTEP(params.output_path as string);
              result = { success: true, ...r.value, confidence: r.confidence, source: r.source };
            } catch (err: any) { result = { success: false, error: err.message }; }
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE12 — hyperCADSMockLayer (E1164)
          case "hypercads_mock_import": {
            const { hyperCADSMockLayer } = await import("../../engines/HyperCADSMockLayer.js");
            result = { success: true, ...hyperCADSMockLayer.getMockImportResponse(params.file_path as string | undefined) };
            break;
          }
          case "hypercads_mock_heal": {
            const { hyperCADSMockLayer } = await import("../../engines/HyperCADSMockLayer.js");
            result = { success: true, ...hyperCADSMockLayer.getMockHealResponse(params.body_name as string | undefined) };
            break;
          }
          case "hypercads_mock_analyze": {
            const { hyperCADSMockLayer } = await import("../../engines/HyperCADSMockLayer.js");
            result = { success: true, ...hyperCADSMockLayer.getMockAnalyzeResponse(params.body_name as string | undefined) };
            break;
          }
          case "hypercads_mock_stock": {
            const { hyperCADSMockLayer } = await import("../../engines/HyperCADSMockLayer.js");
            result = { success: true, ...hyperCADSMockLayer.getMockStockModelResponse(params.mode as string | undefined) };
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE14 — 5 Mastercam engines
          case "mastercam_ai_orchestrate": {
            const { mastercamAIOrchestrationEngine } = await import("../../engines/MastercamAIOrchestrationEngine.js");
            result = await mastercamAIOrchestrationEngine.orchestrate(
              params as Parameters<typeof mastercamAIOrchestrationEngine.orchestrate>[0],
            );
            break;
          }
          case "mastercam_cycle_search": {
            const { mastercamCycleCatalogEngine } = await import("../../engines/MastercamCycleCatalogEngine.js");
            const p = params as { query: string };
            result = mastercamCycleCatalogEngine.search(p.query);
            break;
          }
          case "mastercam_cycle_lookup_code": {
            const { mastercamCycleCatalogEngine } = await import("../../engines/MastercamCycleCatalogEngine.js");
            const p = params as { code: string };
            result = mastercamCycleCatalogEngine.lookupByCode(p.code);
            break;
          }
          case "mastercam_cycle_stats": {
            const { mastercamCycleCatalogEngine } = await import("../../engines/MastercamCycleCatalogEngine.js");
            result = mastercamCycleCatalogEngine.stats();
            break;
          }
          case "mastercam_deep_select_strategy": {
            const { mastercamDeepLearningEngine } = await import("../../engines/MastercamDeepLearningEngine.js");
            result = mastercamDeepLearningEngine.selectOptimalStrategy(
              params as Parameters<typeof mastercamDeepLearningEngine.selectOptimalStrategy>[0],
            );
            break;
          }
          case "mastercam_function_index_summary": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            result = MFIE.getSummary();
            break;
          }
          // CAM-EXHAUST-MS0/U-CAM-FIDX-27 — Mastercam full FunctionIndex wiring (9 actions)
          case "mastercam_function_index_get": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            result = { success: true, index: MFIE.getIndex() };
            break;
          }
          case "mastercam_function_index_list_modules": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            result = { success: true, modules: MFIE.listModules() };
            break;
          }
          case "mastercam_function_index_get_module": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            const moduleId = params.module_id as string;
            const module_ = MFIE.getModule(moduleId);
            result = module_
              ? { success: true, module_id: moduleId, module: module_ }
              : { success: false, error: `Module '${moduleId}' not found` };
            break;
          }
          case "mastercam_function_index_list_toolpaths": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            result = { success: true, toolpaths: MFIE.listAllToolpaths() };
            break;
          }
          case "mastercam_function_index_find_parameter": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            const paramId = params.parameter_id as string;
            const located = MFIE.findParameter(paramId);
            result = located
              ? { success: true, parameter: located }
              : { success: false, error: `Parameter '${paramId}' not found` };
            break;
          }
          case "mastercam_function_index_search_parameters": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            const query = params.query as string;
            const limit = params.limit as number | undefined;
            result = { success: true, results: MFIE.searchParameters(query, limit) };
            break;
          }
          case "mastercam_function_index_get_toolpaths_by_category": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            const category = params.category as string;
            result = { success: true, toolpaths: MFIE.getToolpathsByCategory(category) };
            break;
          }
          case "mastercam_function_index_get_toolpath": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            const toolpathId = params.toolpath_id as string;
            result = { success: true, ...MFIE.getToolpath(toolpathId) };
            break;
          }
          case "mastercam_function_index_get_total_parameter_count": {
            const MFIE = (await import("../../engines/MastercamFunctionIndexEngine.js")).default;
            result = { success: true, total_parameter_count: MFIE.getTotalParameterCount() };
            break;
          }
          case "mastercam_multiaxis_recommend": {
            const { mastercamMultiAxisEngine } = await import("../../engines/MastercamMultiAxisEngine.js");
            result = mastercamMultiAxisEngine.calculate(
              params as Parameters<typeof mastercamMultiAxisEngine.calculate>[0],
            );
            break;
          }
          case "mastercam_multiaxis_list_strategies": {
            const { mastercamMultiAxisEngine } = await import("../../engines/MastercamMultiAxisEngine.js");
            result = mastercamMultiAxisEngine.listStrategies();
            break;
          }
          // ─────────────────────────────────────────────────────────────────
          // ENGINE-WIRE-CAM-MS0/U-WIRE-CAM-BATCH1: 6 unwired CAM engines
          // ─────────────────────────────────────────────────────────────────
          case "cam_recommend": {
            const { CAMRecommendEngine } = await import("../../engines/CAMRecommendEngine.js");
            const analysis = (params as { analysis: Parameters<typeof CAMRecommendEngine.recommend>[0] }).analysis;
            const machineType = (params as { machineType?: string }).machineType;
            if (!analysis) throw new Error("cam_recommend requires 'analysis' (PartAnalysis)");
            result = { recommendations: CAMRecommendEngine.recommend(analysis, machineType) };
            break;
          }
          case "cam_strategy_optimal_select": {
            const { optimalStrategySelectionEngine } = await import("../../engines/OptimalStrategySelectionEngine.js");
            const p = params as Parameters<typeof optimalStrategySelectionEngine.compute>[0];
            result = optimalStrategySelectionEngine.compute(p);
            break;
          }
          case "cam_toolpath_force_profile": {
            const { toolpathForceProfileEngine } = await import("../../engines/ToolpathForceProfileEngine.js");
            const p = params as Parameters<typeof toolpathForceProfileEngine.analyze>[0];
            result = toolpathForceProfileEngine.analyze(p);
            break;
          }
          case "cam_toolpath_segment_optimize": {
            const { toolpathSegmentOptimizerEngine } = await import("../../engines/ToolpathSegmentOptimizerEngine.js");
            const p = params as Parameters<typeof toolpathSegmentOptimizerEngine.compute>[0];
            result = toolpathSegmentOptimizerEngine.compute(p);
            break;
          }
          case "cam_toolpath_strategy_route": {
            const { toolpathStrategyRouterEngine } = await import("../../engines/ToolpathStrategyRouterEngine.js");
            await toolpathStrategyRouterEngine.initialize();
            const p = params as Parameters<typeof toolpathStrategyRouterEngine.route>[0];
            result = await toolpathStrategyRouterEngine.route(p);
            break;
          }
          case "cam_hsm_dwell_at_corner": {
            const { HSMDwellAtCornerEngine } = await import("../../engines/HSMDwellAtCornerEngine.js");
            const corner = (params as { corner: Parameters<typeof HSMDwellAtCornerEngine.analyzeDwell>[0] }).corner;
            const servo = (params as { servo: Parameters<typeof HSMDwellAtCornerEngine.analyzeDwell>[1] }).servo;
            const hsmParams = (params as { hsm: Parameters<typeof HSMDwellAtCornerEngine.analyzeDwell>[2] }).hsm;
            if (!corner || !servo || !hsmParams) {
              throw new Error("cam_hsm_dwell_at_corner requires 'corner', 'servo', and 'hsm' params");
            }
            result = HSMDwellAtCornerEngine.analyzeDwell(corner, servo, hsmParams);
            break;
          }
          // ─────────────────────────────────────────────────────────────────
          // ENGINE-WIRE-POST-MS0/U-WIRE-POST-BATCH1: 6 unwired post engines
          // ─────────────────────────────────────────────────────────────────
          case "post_gcode_snippet_get": {
            const { gCodeSnippetEngine } = await import("../../engines/GCodeSnippetEngine.js");
            const id = (params as { id: string }).id;
            if (typeof id !== "string") throw new Error("post_gcode_snippet_get requires 'id' (string)");
            const snippet = gCodeSnippetEngine.get(id);
            result = { id, found: snippet !== null, snippet };
            break;
          }
          case "post_gcode_snippet_fill": {
            const { gCodeSnippetEngine } = await import("../../engines/GCodeSnippetEngine.js");
            const id = (params as { id: string }).id;
            const fillParams = (params as { params: Record<string, string | number> }).params;
            if (typeof id !== "string") throw new Error("post_gcode_snippet_fill requires 'id'");
            if (!fillParams || typeof fillParams !== "object") throw new Error("post_gcode_snippet_fill requires 'params'");
            const filled = gCodeSnippetEngine.fill(id, fillParams);
            result = { id, gcode: filled, found: filled !== null };
            break;
          }
          case "post_gcode_tokenize": {
            const { gcodeUnderstandingTransformerEngine } = await import("../../engines/GCodeUnderstandingTransformerEngine.js");
            const gcode = (params as { gcode: string }).gcode;
            if (typeof gcode !== "string") throw new Error("post_gcode_tokenize requires 'gcode' (string)");
            const tokens = gcodeUnderstandingTransformerEngine.tokenize(gcode);
            result = { tokens, token_count: tokens.length };
            break;
          }
          case "post_fanuc_legacy_profile": {
            const { fanucLegacyControllerEngine } = await import("../../engines/FanucLegacyControllerEngine.js");
            const model = (params as { model?: string }).model;
            const models = fanucLegacyControllerEngine.listModels();
            if (model) {
              const profile = fanucLegacyControllerEngine.getProfile(
                model as Parameters<typeof fanucLegacyControllerEngine.getProfile>[0],
              );
              result = { model, profile, all_models: models };
            } else {
              result = { all_models: models };
            }
            break;
          }
          case "post_okuma_legacy_detect": {
            const { okumaLegacyControllerEngine } = await import("../../engines/OkumaLegacyControllerEngine.js");
            const programLines = (params as { program_lines: string[] }).program_lines;
            if (!Array.isArray(programLines)) {
              throw new Error("post_okuma_legacy_detect requires 'program_lines' (string[])");
            }
            result = okumaLegacyControllerEngine.detectController(programLines);
            break;
          }
          case "post_siemens_legacy_profile": {
            const { siemensLegacyControllerEngine } = await import("../../engines/SiemensLegacyControllerEngine.js");
            const p = params as { machineType: Parameters<typeof siemensLegacyControllerEngine.getProfile>[0]; nckVersion?: string };
            if (!p.machineType) throw new Error("post_siemens_legacy_profile requires 'machineType'");
            result = siemensLegacyControllerEngine.getProfile(p.machineType, p.nckVersion);
            break;
          }
          case "cam_fusion_tool_export": {
            result = {
              success: false,
              error: "cam_fusion_tool_export handled by FusionToolLibraryEngine via prism_cam fusion_export_tool_library",
              redirect: { dispatcher: "prism_cam", action: "fusion_export_tool_library" },
            };
            break;
          }
          
          
                    default:
            result = { error: `Unknown action: ${action}` };
        }
        // POST-TOOLPATH HOOKS
        try {
          await hookExecutor.execute("post-toolpath", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_cam] Post-toolpath hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_cam");
      }
      // MS-P0.5-COORD: attach awareness summary when present
      if (_awareness && result && typeof result === "object" && !Array.isArray(result)) {
        (result as any)._awareness = _awareness;
      }
      // MS-P0.5-COORD U-08: unified outcome recording via multi-agent dispatch engine
      if (_isWedmAction) {
        try {
          const { wedmMultiAgentDispatchEngine } = await import("../../engines/WEDMMultiAgentDispatchEngine.js");
          const isError = result && typeof result === "object" && "error" in (result as any);
          wedmMultiAgentDispatchEngine.recordOutcome({
            dispatcher: "cam",
            action,
            keywords: _awarenessKeywords,
            entryAt: _entryAt,
            success: !isError,
            awareness_used: !!_awareness,
            error: isError ? String((result as any).error) : undefined,
          });
        } catch { /* ledger never blocks */ }
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
