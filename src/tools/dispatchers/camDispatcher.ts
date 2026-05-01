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
};
import { ACTION_CAMX_MS10_U01_SCHEMAS } from "../../schemas/camxMs10U01ActionSchemas.js";
import { ACTION_CAMX_MS9_U03_SCHEMAS } from "../../schemas/camxMs9U03ActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

let _cam: any, _toolpath: any, _post: any, _collision: any, _stock: any, _toolAsm: any, _fixture: any, _hmStrategy: any, _hmSafety: any, _hmMultiAxis: any, _hmMaterialMap: any, _hmCycleCatalog: any, _hmController: any, _hmCycleDefaults: any, _hmThread: any, _lathePost: any, _probing: any, _subprogram: any, _nesting: any, _tpSim: any, _advPost: any, _portability: any, _multiCam: any, _feedOpt: any, _transpiler: any, _stabilityRPM: any, _probeGen: any, _cycleTimeEst: any, _gcodeSafety: any, _thermal: any, _energy: any, _kinematic: any, _setupSheet: any, _autoSF: any, _instEngage: any, _multiCamPost: any, _prodToolpath: any, _ppAPI: any, _scalableOrch: any, _unifiedPipe: any, _smartTool: any, _adaptRouter: any, _cumStock: any, _featCluster: any, _prodPackage: any, _edmAsm: any, _grindAsm: any, _laserAsm: any, _wjAsm: any, _multiProc: any, _millTurn: any, _selfLearn: any, _turningProfile: any, _sheetNesting: any, _dxfParser: any, _stochRouter: any, _probingProg: any, _dfmFeedback: any;
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
// CAMX-MS12 U08 singletons
let _batchSizeStrategy: any;
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
// E1122 — CATIACodeGeneratorEngine singleton
let _catiaCodeGen: any;
// E1120 — HyperMillCodeGeneratorEngine singleton
let _hyperMillCodeGen: any;
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
    case "probing": return _probing ??= (await import("../../engines/ProbingCycleEngine.js")).probingCycleEngine;
    case "subprogram": return _subprogram ??= (await import("../../engines/SubprogramEngine.js")).subprogramEngine;
    case "nesting": return _nesting ??= (await import("../../engines/NestingEngine.js")).nestingEngine;
    case "tpSim": return _tpSim ??= (await import("../../engines/ToolpathSimulationEngine.js")).toolpathSimulationEngine;
    case "hmController": return _hmController ??= (await import("../../engines/HyperMillControllerCatalogEngine.js")).hyperMillControllerCatalogEngine;
    case "hmCycleDefaults": return _hmCycleDefaults ??= (await import("../../engines/HyperMillCycleDefaultsEngine.js")).hyperMillCycleDefaultsEngine;
    case "hmThread": return _hmThread ??= (await import("../../engines/HyperMillThreadStandardEngine.js")).hyperMillThreadStandardEngine;
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
    // CAMX-MS12 U08
    case "batchSizeStrategy": return _batchSizeStrategy ??= (await import("../../engines/BatchSizeStrategyEngine.js")).batchSizeStrategyEngine;
    // BOX Data engines
    case "cpsParser": return _cpsParser ??= (await import("../../engines/FusionCPSParserEngine.js")).fusionCPSParserEngine;
    case "okumaParam": return _okumaParam ??= (await import("../../engines/OkumaParametricProgramEngine.js")).okumaParametricProgramEngine;
    case "ppCapMatrix": return _ppCapMatrix ??= (await import("../../engines/PostProcessorCapabilityMatrixEngine.js")).postProcessorCapabilityMatrixEngine;
    // CAMX-MS5 U01
    case "nxCAMStrategy": return _nxCAMStrategy ??= (await import("../../engines/NXCAMStrategyEngine.js")).nxCAMStrategyEngine;
    // CAMX-MS5 U06 — NXCAMCodeGeneratorEngine (E1119)
    case "nxCAMCodeGen": return _nxCAMCodeGen ??= (await import("../../engines/NXCAMCodeGeneratorEngine.js")).nxCAMCodeGeneratorEngine;
    // CAMX-MS4 U03
    case "iMachining": return _iMachining ??= (await import("../../engines/SolidCAMiMachiningEngine.js")).solidCAMiMachiningEngine;
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
    // E1118 — SolidCAMCodeGeneratorEngine
    case "solidcamCodeGen": return _solidcamCodeGen ??= (await import("../../engines/SolidCAMCodeGeneratorEngine.js")).solidCAMCodeGeneratorEngine;
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
  "cam_strategy_recommend", "cam_safety_validate",
  "cam_multiaxis_recommend", "cam_material_map",
  "cam_cycle_catalog",
  "lathe_post_process", "probe_generate",
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
  // CAMX-MS12 U08 — BatchSizeStrategyEngine (E1100)
  "batch_strategy_recommend", "batch_strategy_adjust", "batch_strategy_cost",
  // BOX Data — FusionCPSParser (5), OkumaParametricProgram (5), PostProcessorCapabilityMatrix (5)
  "cps_parse_file", "cps_parse_directory", "cps_search", "cps_property_catalog", "cps_compare_controllers",
  "okuma_generate_casing", "okuma_generate_cbore", "okuma_validate_macro", "okuma_parse_macro", "okuma_defaults", "okuma_convert_to_hardcode",
  "pp_capability_matrix", "pp_capability_query", "pp_capability_compare", "pp_select_post", "pp_capability_summary",
  // CAMX-MS5 U01 — NXCAMStrategyEngine (E1104)
  "nx_cam_recommend", "nx_cam_parameters", "nx_cam_ipw", "nx_cam_fbm", "nx_cam_list_strategies",
  // CAMX-MS5 U06 — NXCAMCodeGeneratorEngine (E1119)
  "nx_code_generate", "nx_code_templates",
  // CAMX-MS4 U03 — SolidCAMiMachiningEngine (E1103)
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
  // E1122 — CATIACodeGeneratorEngine (2 actions)
  "catia_code_generate", "catia_code_templates",
  // E1120 — HyperMillCodeGeneratorEngine (2 actions)
  "hypermill_code_generate", "hypermill_code_templates",
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
] as const;

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
          // ── CAMX-MS4 U03: SolidCAMiMachiningEngine (E1103) ───────────────────
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
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
