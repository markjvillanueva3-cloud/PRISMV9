# system-viz dead-pixel sweep — 2026-06-27T03:58:27.514Z

Nodes: 374725
Edges: 880039
Dead edges: 5050 (0.57%)
  ├─ advisory (intentional gap-surfacing bridges to not-yet-built nodes): 4427
  └─ DEFECT (structural edges that should connect real nodes): 623  ← triage these
Skipped (malformed) edges: 0

## Dead-edge count by edge type (advisory vs defect)
    2499  bridge-to-engine  [advisory]
    1502  enriches-engine  [advisory]
     461  ghost-wire-validation  [defect]
     423  ghost-wire  [advisory]
     105  synergy  [defect]
      57  contains  [defect]
       3  feeds-dispatcher  [advisory]

## Top 50 orphan targets (referenced-but-missing, ranked by inbound count)
     906  engine.ToolLifeEngine
         e.g. from: pdf-extract.pdf_cam_training_downloaded_mastercam_basic_3d_machining_pdf, pdf-extract.pdf_virtual_machining_center_virtual_machining_center_manual_en_pdf, pdf-extract.resource_pdfs_basic_3d_machining_pdf
     886  engine.PdfMachiningHandbookExtractorEngine
         e.g. from: college.course.pdf-resources-1_basic_training_day_1_2d_drawing_pdf, college.course.pdf-resources-ac1337_handout_1337_ac1377_20_20mighty_20macros_20_2013_1115_pdf, college.course.pdf-resources-manufacturer_catalogs_uploaded_01_global_cnc_full_catalog_2023_pdf
     829  engine.PdfGenericExtractorEngine
         e.g. from: pdf-extract.ac1337_handout_1337_ac1377_20_20mighty_20macros_20_2013_1115_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_mppostdebuggerug_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_quick_ref_card_pdf
     414  engine.JMDieCustomerEngine
         e.g. from: college.course.jm-die-baseball_parts, college.course.jm-die-baseball_parts_oldversions, college.course.jm-die-cnc_lathe
     414  engine.PrismTrainingModuleEngine
         e.g. from: college.course.jm-die-baseball_parts, college.course.jm-die-baseball_parts_oldversions, college.course.jm-die-cnc_lathe
     308  engine.ShopToolingRegistryEngine
         e.g. from: pdf-extract.manufacturer_catalogs_uploaded_01_global_cnc_full_catalog_2023_pdf, pdf-extract.manufacturer_catalogs_uploaded_2018_rapidkut_catalog_pdf, pdf-extract.manufacturer_catalogs_uploaded_543f80b8_2016_orange_vise_catalog_pdf
     116  disp.prism_quoting
         e.g. from: ghost.unwired.QuotingClosedLoopRunnerEngine, ghost.vault-wired.QuoteCERCalibratorEngine, ghost.vault-wired.ToleranceCostEngine
      64  disp.prism_machinesetup
         e.g. from: ghost.codebase-wired.BalancingMachineEngine, ghost.codebase-wired.CobotMachiningEngine, ghost.codebase-wired.ControllerProgrammingIntelligenceEngine
      62  disp.prism_orchestration
         e.g. from: ghost.unwired.WetRunProgramVersionLockEngine, ghost.codebase-wired.AgentExecutor, ghost.codebase-wired.AgentRegistryEngine
      51  engine.FanucMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      51  engine.HaasMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      51  engine.MachineControllerEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      51  engine.OkumaMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      49  disp.prism_shop
         e.g. from: college.course.1_basic_training_day_1, college.course.2_basic_training_day_2, college.course.3_basic_training_day_3
      38  disp.prism_quality
         e.g. from: ghost.codebase-wired.AS9100TraceabilityEngine, ghost.codebase-wired.CAPAWorkflowEngine, ghost.codebase-wired.ChangePointDetectionEngine
      38  disp.unknown
         e.g. from: ghost.unwired.BlastDampenerEngine, ghost.unwired.cadLiveDispatch, ghost.unwired.CadPartLibraryEngine
      34  disp.prism_cncops
         e.g. from: ghost.codebase-wired.BroachDesignEngine, ghost.codebase-wired.CenterDrillEngine, ghost.codebase-wired.ChamferEngine
      34  disp.prism_security
         e.g. from: ghost.codebase-wired.AccessControlListEngine, ghost.codebase-wired.AuditLoggingEngine, ghost.codebase-wired.AuthorizationEngine
      30  disp.prism_cpl
         e.g. from: ghost.codebase-wired.BarStockVibrationEngine, ghost.codebase-wired.ClothoidBlendingEngine, ghost.codebase-wired.ContactMechanicsSurfaceEngine
      30  disp.prism_infra
         e.g. from: ghost.codebase-wired.BatchProcessor, ghost.codebase-wired.ConfigEngine, ghost.codebase-wired.DiffEngine
      30  disp.prism_toolpath
         e.g. from: ghost.codebase-wired.AlgorithmSelectorEngine, ghost.codebase-wired.CollisionIntegrationEngine, ghost.codebase-wired.CrossCamNovelAlgorithms
      28  disp.prism_auth
         e.g. from: ghost.unwired.TenantOnboardingRunbookEngine, ghost.unwired.WetRunChangeFreezeEngine, ghost.unwired.WetRunNonConformanceEngine
      26  disp.prism_vibrationphysics
         e.g. from: ghost.codebase-wired.AdaptiveFeedModulationEngine, ghost.codebase-wired.BurrFormationEngine, ghost.codebase-wired.CutterContactEngine
      24  disp.prism_operatingsystem
         e.g. from: ghost.unwired.OperatingSystemJobPacketEngine, ghost.codebase-wired.DeskPayloadEngine, ghost.codebase-wired.GlobalSearchEngine
      22  disp.prism_turningprogram
         e.g. from: ghost.codebase-wired.AmbiguityResolutionEngine, ghost.codebase-wired.FitNotationParserEngine, ghost.codebase-wired.ISO2768ApplicatorEngine
      21  engine.MaterialRegistryEngine
         e.g. from: pdf-extract.pdf_cam_training_downloaded_mastercam_basic_3d_machining_pdf, pdf-extract.pdf_virtual_machining_center_virtual_machining_center_manual_en_pdf, pdf-extract.resource_pdfs_basic_3d_machining_pdf
      20  disp.prism_machine
         e.g. from: ghost.codebase-wired.MachineConsumerBindingEngine, ghost.codebase-wired.MachineKinematicStateEngine, ghost.codebase-wired.MachineLayerMerger
      18  disp.prism_materialprocessing
         e.g. from: ghost.codebase-wired.AutoclaveProcessEngine, ghost.codebase-wired.CoatingSelectionAdapter, ghost.codebase-wired.ElectrochemicalEngine
      16  disp.prism_formingcasting
         e.g. from: ghost.codebase-wired.BlowMoldingEngine, ghost.codebase-wired.CalenderingEngine, ghost.codebase-wired.FilamentWindingEngine
      12  disp.prism_diagnosis
         e.g. from: ghost.codebase-wired.AlarmEscalationEngine, ghost.codebase-wired.ScrapRootCauseEngine, ghost.codebase-wired.SustainCarbonEngine
      12  disp.prism_monitoring
         e.g. from: ghost.codebase-wired.EmergentBehaviorMonitorEngine, ghost.codebase-wired.GrafanaBridgeEngine, ghost.codebase-wired.HyperMillMetricCfgExtractor
      12  disp.prism_resourceextraction
         e.g. from: ghost.codebase-wired.ArchiveCrawlerEngine, ghost.codebase-wired.CrossTerminalCoordinationEngine, ghost.codebase-wired.DarkContentClassifierEngine
      10  disp.prism_feasibility
         e.g. from: ghost.codebase-wired.AccessibilityAnalysisEngine, ghost.codebase-wired.FeasibilityOrchestratorEngine, ghost.codebase-wired.RigidityDegradationEngine
      10  disp.prism_l2engine
         e.g. from: ghost.codebase-wired.AIMLEngine, ghost.codebase-wired.FileIOEngine, ghost.codebase-wired.SettingsEngine
      10  disp.prism_resourceharvester
         e.g. from: ghost.codebase-wired.FolderScannerEngine, ghost.codebase-wired.HarvestPipelineEngine, ghost.codebase-wired.JMDieMillProgramHarvestEngine
      10  disp.prism_scientificmath
         e.g. from: ghost.codebase-wired.FuzzyNeuralHybridEngine, ghost.codebase-wired.GraphTheoryEngine, ghost.codebase-wired.InformationTheoryEngine
      10  disp.prism_skillscript
         e.g. from: ghost.codebase-wired.ScriptExecutor, ghost.codebase-wired.SkillAutoLoader, ghost.codebase-wired.SkillBundleEngine
      10  disp.prism_unwiredbridge
         e.g. from: ghost.codebase-wired.FisherInformationEngine, ghost.codebase-wired.GoldenBaselineManagerEngine, ghost.codebase-wired.HypothesisRankerEngine
      10  disp.prism_weldingjoining
         e.g. from: ghost.codebase-wired.AdhesiveBondEngine, ghost.codebase-wired.BrazingSolderingEngine, ghost.codebase-wired.UltrasonicWeldingEngine
      10  domain:work
         e.g. from: ghost.chat_slot.juliett, ghost.chat_slot.november, ghost.chat_slot.quebec
       9  fs.h.mcp-starter-kit-for-friend
         e.g. from: fs.h.mcp-starter-kit-for-friend.slash_commands, fs.h.mcp-starter-kit-for-friend.claude_config, fs.h.mcp-starter-kit-for-friend.hooks_reference
       9  fs.h.prism-cad-complete
         e.g. from: fs.h.prism-cad-complete.mcp_server, fs.h.prism-cad-complete.state, fs.h.prism-cad-complete.claude
       9  fs.h.prism-cad-sw-fidx
         e.g. from: fs.h.prism-cad-sw-fidx.knowledge, fs.h.prism-cad-sw-fidx.mcp_server, fs.h.prism-cad-sw-fidx.state
       9  fs.h.prism-cam-engine-fixes
         e.g. from: fs.h.prism-cam-engine-fixes.mcp_server, fs.h.prism-cam-engine-fixes.knowledge, fs.h.prism-cam-engine-fixes.state
       9  fs.h.prism-cam-exhaust
         e.g. from: fs.h.prism-cam-exhaust.state, fs.h.prism-cam-exhaust.mcp_server, fs.h.prism-cam-exhaust.claude
       8  disp.prism_business
         e.g. from: ghost.vault-wired.CustomerManagementEngine, ghost.vault-wired.PayrollLiabilityFilingEngine, ghost.vault-wired.QuoteToOrderBridgeEngine
       8  disp.prism_product
         e.g. from: ghost.codebase-wired.AirCutDetectionEngine, ghost.codebase-wired.OptimizationReportEngine, ghost.codebase-wired.PostSelectionEngine
       6  disp.prism_automation
         e.g. from: ghost.codebase-wired.DigitalThreadEngine, ghost.codebase-wired.DigitalWorkInstructionEngine, ghost.codebase-wired.ShiftHandoffEngine
       6  disp.prism_multi
         e.g. from: ghost.codebase-wired.MultiSetupFeasibilityChainEngine, ghost.codebase-wired.MultiSignalAutoRollbackEngine, ghost.codebase-wired.MultiTurretSyncEngine
       6  fs.h.prism-agi-infra-a
         e.g. from: fs.h.prism-agi-infra-a.mcp_server, fs.h.prism-agi-infra-a.state, fs.h.prism-agi-infra-a.claude

## Dead-edge count by source-node layer
    4109  layer=L9
     884  layer=L13
      57  layer=?

## Missing ids by prefix (= which generator leaks)
    4001  engine
     887  disp
      57  fs
      10  domain:work
       1  file:state/shared/slot-souls/alpha
       1  file:state/shared/token-budget-alpha
       1  branch:slot/alpha
       1  domain:efficiency-watchdog
       1  file:state/shared/slot-souls/bravo
       1  file:state/shared/token-budget-bravo
       1  branch:slot/bravo
       1  domain:builder-hermes-zulu
       1  file:state/shared/slot-souls/charlie
       1  file:state/shared/token-budget-charlie
       1  branch:slot/charlie
       1  domain:quoting
       1  file:state/shared/slot-souls/delta
       1  file:state/shared/token-budget-delta
       1  branch:slot/delta
       1  domain:cad
       1  file:state/shared/slot-souls/echo
       1  file:state/shared/token-budget-echo
       1  branch:slot/echo
       1  domain:post-processor
       1  file:state/shared/slot-souls/foxtrot
       1  file:state/shared/token-budget-foxtrot
       1  branch:slot/foxtrot
       1  domain:mill
       1  file:state/shared/slot-souls/golf
       1  file:state/shared/token-budget-golf
