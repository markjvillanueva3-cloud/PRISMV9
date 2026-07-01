# system-viz dead-pixel sweep — 2026-05-31T07:05:01.777Z

Nodes: 301145
Edges: 1043218
Dead edges: 6128 (0.59%)
  ├─ advisory (intentional gap-surfacing bridges to not-yet-built nodes): 3710
  └─ DEFECT (structural edges that should connect real nodes): 2418  ← triage these
Skipped (malformed) edges: 0

## Dead-edge count by edge type (advisory vs defect)
    2197  bridge-to-engine  [advisory]
    1461  enriches-engine  [advisory]
     775  invokes  [defect]
     541  wire_target  [defect]
     245  bridge_to_existing  [defect]
     198  engine_import  [defect]
     188  covers  [defect]
     130  ghost-wire-validation  [defect]
     104  synergy  [defect]
     102  uses_type  [defect]
      60  uses_constant  [defect]
      46  ghost-wire  [advisory]
      36  contains  [defect]
      19  imports_from  [defect]
      12  extracts  [defect]
       6  feeds-dispatcher  [advisory]
       4  engine_import_dynamic  [defect]
       4  validates  [defect]

## Top 50 orphan targets (referenced-but-missing, ranked by inbound count)
     899  engine.ToolLifeEngine
         e.g. from: pdf-extract.pdf_cam_training_downloaded_mastercam_basic_3d_machining_pdf, pdf-extract.pdf_virtual_machining_center_virtual_machining_center_manual_en_pdf, pdf-extract.resource_pdfs_basic_3d_machining_pdf
     886  engine.PdfMachiningHandbookExtractorEngine
         e.g. from: college.course.pdf-resources-1_basic_training_day_1_2d_drawing_pdf, college.course.pdf-resources-ac1337_handout_1337_ac1377_20_20mighty_20macros_20_2013_1115_pdf, college.course.pdf-resources-manufacturer_catalogs_uploaded_01_global_cnc_full_catalog_2023_pdf
     772  engine.PdfGenericExtractorEngine
         e.g. from: pdf-extract.ac1337_handout_1337_ac1377_20_20mighty_20macros_20_2013_1115_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_mppostdebuggerug_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_quick_ref_card_pdf
     414  engine.JMDieCustomerEngine
         e.g. from: college.course.jm-die-baseball_parts, college.course.jm-die-baseball_parts_oldversions, college.course.jm-die-cnc_lathe
     414  engine.PrismTrainingModuleEngine
         e.g. from: college.course.jm-die-baseball_parts, college.course.jm-die-baseball_parts_oldversions, college.course.jm-die-cnc_lathe
     254  prism_dev
         e.g. from: extracted.extracted_modules.giant-prism_signal_enhanced-js, extracted.extracted_modules.giant-prism_subscription_system-js, extracted.extracted.materials_complete-p_steels-p_steels_complete-js
     220  prism_data
         e.g. from: extracted.extracted.machines-consolidated-all_machines-json, extracted.extracted.materials-p_steels-tool_steels_hardness_conditions-js, extracted.extracted.materials-p_steels-tool_steels_101_150-js
     100  disp.unknown
         e.g. from: ghost.unwired.BlamelessPostMortemEngine, ghost.unwired.BlastDampenerEngine, ghost.unwired.BooleanKernelEngine
      72  engine.ShopToolingRegistryEngine
         e.g. from: pdf-extract.manufacturer_catalogs_uploaded_01_global_cnc_full_catalog_2023_pdf, pdf-extract.manufacturer_catalogs_uploaded_2018_rapidkut_catalog_pdf, pdf-extract.manufacturer_catalogs_uploaded_543f80b8_2016_orange_vise_catalog_pdf
      42  engine.FanucMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      42  engine.HaasMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      42  engine.MachineControllerEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      42  engine.OkumaMacroEngine
         e.g. from: pdf-extract.mastercam_mastercam_mcamx8_documentation_administrator_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_installation_guide_pdf, pdf-extract.mastercam_mastercam_mcamx8_documentation_transition_guide_pdf
      40  eng.other.algorithmgatewayengine
         e.g. from: disp.algorithmdispatcher.action.signal_fft, disp.algorithmdispatcher.action.signal_spectral, disp.algorithmdispatcher.action.signal_filter
      31  prism_ai
         e.g. from: extracted.extracted_modules.giant-prism_ai_expert_integration-js, extracted.extracted_modules.giant-prism_ai_100_kb_connector-js, extracted.extracted_modules.ultra-prism_phase6_deeplearning-js
      27  eng.other.cadbundlereplaycompareengine
         e.g. from: test.cadbundlereplaycompareengine, schema.cadbundlereplayschema.cadbundleschema, schema.cadbundlereplayschema.cadoperationschema
      26  eng.other.cadassemblygraphengine
         e.g. from: test.cadassemblygraphengine, schema.cadassemblygraphschema.assemblygraphschema, schema.cadassemblygraphschema.assemblynodeschema
      26  prism_calc
         e.g. from: extracted.extracted_modules.giant-prism_pso_optimizer-js, extracted.extracted_modules.ultra-prism_cutting_tool_expansion_v3-js, extracted.extracted_modules.mega-prism_constrained_optimization_enhanced-js
      25  eng.other.cadfilesystemreconciliationengine
         e.g. from: test.cadfilesystemreconciliationengine, schema.cadfilesystemreconciliationschema.registryentryschema, schema.cadfilesystemreconciliationschema.diskentryschema
      22  eng.other.cadaccesscontrolrbacabacengine
         e.g. from: test.cadaccesscontrolrbacabacengine, schema.cadaccesscontrolschema.accesspolicyschema, schema.cadaccesscontrolschema.accessgrantschema
      22  eng.other.cadcontentaddressablestoreengine
         e.g. from: test.cadcontentaddressablestoreengine, schema.cadfileregistryschema.cadfileregistryschema, schema.cadfileregistryschema.cadregistryentryschema
      21  eng.other.cadreplicationdurabilityengine
         e.g. from: test.cadreplicationdurabilityengine, schema.cadreplicationdurabilityschema.replicalocationschema, schema.cadreplicationdurabilityschema.replicationrecordschema
      21  eng.other.camcatalogloaderengine
         e.g. from: eng.ai.camagireasoningengine, eng.other.camcrosssystemtranslatorengine, eng.cad.camfeaturelearningengine
      20  eng.other.agentmemoryfabricengine
         e.g. from: disp.agentdispatcher.action.memory, disp.agentdispatcher.action.remember_fact, disp.agentdispatcher.action.remember_preference
      20  eng.other.cadfileindexerengine
         e.g. from: eng.other.baseengine, eng.other.iengine, eng.other.universalcadindexengine
      19  eng.other.auditengine
         e.g. from: disp.camdispatcher.action.cam_fusion360_strategy_audit, disp.camdispatcher.action.cam_fusion360_safety_audit, disp.camdispatcher.action.cam_mastercam_edm_audit
      18  eng.other.cadfileclassifierengine
         e.g. from: eng.other.baseengine, eng.other.iengine, test.cadfileclassifier
      18  eng.other.cadtenantnamespaceengine
         e.g. from: test.cadtenantnamespaceengine, schema.cadtenantnamespaceschema.tenantcontentschema, schema.cadtenantnamespaceschema.ndagateschema
      17  eng.other.airesourcelearningengine
         e.g. from: eng.other.patterndatabaseengine, test.aireasoningdispatcher.uaimax10, disp.aireasoningdispatcher.action.ai_material_lookup
      16  eng.other.cadarchivejoinaugmenterengine
         e.g. from: eng.other.baseengine, eng.other.iengine, eng.program.programprintlinkindexengine
      16  eng.other.cadbundlesigningversioningengine
         e.g. from: test.cadbundlesigningversioningengine, schema.cadbundlesigningschema.signingkeyschema, schema.cadbundlesigningschema.bundlesignatureschema
      16  eng.other.cadformatconversionmatrixengine
         e.g. from: test.cadformatconversionmatrixengine, schema.cadformatconversionschema.conversionedgeschema, schema.cadformatconversionschema.conversionreportschema
      16  eng.other.cadsearchuniversalengine
         e.g. from: test.cadsearchuniversalengine, schema.cadsearchuniversalschema.searchdocumentschema, schema.cadsearchuniversalschema.searchqueryschema
      14  eng.other.cadretrievalaugmentationengine
         e.g. from: eng.blueprint.blueprinttocadgenerationengine, eng.other.baseengine, eng.other.iengine
      14  eng.other.cadvisualdiffengine
         e.g. from: test.cadvisualdiffengine, schema.cadvisualdiffschema.featuresnapshotschema, schema.cadvisualdiffschema.visualdiffreportschema
      14  engine.MaterialRegistryEngine
         e.g. from: pdf-extract.pdf_cam_training_downloaded_mastercam_basic_3d_machining_pdf, pdf-extract.pdf_virtual_machining_center_virtual_machining_center_manual_en_pdf, pdf-extract.resource_pdfs_basic_3d_machining_pdf
      13  eng.other.cadcorpusingestionengine
         e.g. from: eng.cad.cadcorpusfeatureprevalencelearnerengine, eng.blueprint.blueprintvisionocrengine, eng.other.cadcorpuspatternengine
      13  eng.other.cadlicensehealthengine
         e.g. from: test.cadlicensehealthengine, disp.cadautomationdispatcher.action.cad_license_server_add, disp.cadautomationdispatcher.action.cad_license_server_list
      13  eng.other.cadtestcheckpointengine
         e.g. from: eng.other.baseengine, eng.other.iengine, test.cadregressionpipeline
      13  eng.other.ppjobscenarioadvisorengine
         e.g. from: eng.ai.ppagireasoningworkflowengine, eng.other.ppagireportgeneratorengine, eng.ai.ppcontrollerembeddingengine
      12  domain:work
         e.g. from: ghost.chat_slot.juliett, ghost.chat_slot.november, ghost.chat_slot.oscar
      12  eng.other.algorithmengine
         e.g. from: eng.other.index, eng.intelligence.intelligenceengine, eng.other.productengine
      12  eng.other.cadknowledgegraphengine
         e.g. from: eng.other.cadcorpusingesterengine, eng.other.baseengine, eng.other.iengine
      12  eng.other.cadpreviewthumbnailcacheengine
         e.g. from: test.cadpreviewthumbnailcacheengine, schema.cadthumbnailcacheschema.thumbnailentryschema, schema.cadthumbnailcacheschema.cachestatsschema
      12  eng.other.cadtokenrepresentationengine
         e.g. from: eng.other.cadcorpusingesterengine, eng.other.baseengine, eng.other.iengine
      12  eng.other.ppagisystemdashboardengine
         e.g. from: eng.other.ppagireportgeneratorengine, eng.ai.ppcontrollerembeddingengine, eng.ai.ppmachinevectorencoderengine
      11  eng.other.aicapabilitymaximizerengine
         e.g. from: test.aireasoningdispatcher.uaimax10, disp.aireasoningdispatcher.action.ai_capability_compute_metrics, disp.aireasoningdispatcher.action.ai_capability_get_metrics
      11  eng.other.cadcrashrecoveryengine
         e.g. from: test.cadcrashrecoveryengine, disp.cadautomationdispatcher.action.cad_crash_session_list, disp.cadautomationdispatcher.action.cad_crash_session_get
      11  eng.other.cadoperationtaxonomyengine
         e.g. from: eng.other.cadquerycodegeneratorengine, test.video-action-replay, disp.cadautomationdispatcher.action.cad_taxonomy_get
      11  eng.other.nlhookengine
         e.g. from: eng.other.complianceengine, eng.hook.hookexecutor, test.batch33-engines

## Dead-edge count by source-node layer
    3768  layer=L9
     786  layer=L10
     775  layer=L4a
     389  layer=?
     188  layer=L6
     176  layer=L13
      46  layer=L5

## Missing ids by prefix (= which generator leaks)
    3658  engine
    1350  eng
     254  prism_dev
     220  prism_data
     163  disp
      36  fs
      31  prism_ai
      26  prism_calc
      19  dispatcher
      12  domain:work
      12  ghost
       7  InteriorPointEngine
       5  MonteCarloEngine
       5  CollisionEngine
       5  MeshEngine
       5  SimulationEngine
       4  prism_cad
       4  prism_cam
       4  GraphAlgorithmsEngine
       4  FeatureInteractionEngine
       4  GeodesicDistanceEngine
       4  BayesianToolLifeEngine
       4  MachineLearningFeedbackEngine
       3  SchedulingEngine
       3  JobShopSchedulingEngine
       3  BVHEngine
       3  OffsetSurfaceEngine
       3  VoronoiEngine
       3  MultiObjectiveEngine
       3  PostProcessorEngine
