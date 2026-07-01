# system-viz dead-pixel sweep — 2026-06-12T15:20:03.222Z

Nodes: 336405
Edges: 698135
Dead edges: 3897 (0.56%)
  ├─ advisory (intentional gap-surfacing bridges to not-yet-built nodes): 3678
  └─ DEFECT (structural edges that should connect real nodes): 219  ← triage these
Skipped (malformed) edges: 0

## Dead-edge count by edge type (advisory vs defect)
    2197  bridge-to-engine  [advisory]
    1461  enriches-engine  [advisory]
     104  synergy  [defect]
      57  contains  [defect]
      46  ghost-wire-validation  [defect]
      17  ghost-wire  [advisory]
      12  extracts  [defect]
       3  feeds-dispatcher  [advisory]

## Top 25 orphan targets (referenced-but-missing, ranked by inbound count)
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
      33  disp.unknown
         e.g. from: ghost.unwired.BlastDampenerEngine, ghost.unwired.cadLiveDispatch, ghost.unwired.CadPartLibraryEngine
      14  disp.prism_auth
         e.g. from: ghost.unwired.TenantOnboardingRunbookEngine, ghost.unwired.WetRunChangeFreezeEngine, ghost.unwired.WetRunNonConformanceEngine
      14  engine.MaterialRegistryEngine
         e.g. from: pdf-extract.pdf_cam_training_downloaded_mastercam_basic_3d_machining_pdf, pdf-extract.pdf_virtual_machining_center_virtual_machining_center_manual_en_pdf, pdf-extract.resource_pdfs_basic_3d_machining_pdf
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
       7  disp.prism_shop
         e.g. from: college.course.1_basic_training_day_1, college.course.2_basic_training_day_2, college.course.3_basic_training_day_3
       6  fs.h.prism-agi-infra-a
         e.g. from: fs.h.prism-agi-infra-a.mcp_server, fs.h.prism-agi-infra-a.state, fs.h.prism-agi-infra-a.claude
       6  fs.h.prism-ai-aware
         e.g. from: fs.h.prism-ai-aware.mcp_server, fs.h.prism-ai-aware.state, fs.h.prism-ai-aware.claude
       3  disp.prism_business
         e.g. from: ghost.vault-wired.CustomerManagementEngine, ghost.vault-wired.PayrollLiabilityFilingEngine, ghost.vault-wired.QuoteToOrderBridgeEngine
       3  engine.OperatorOnboardingEngine
         e.g. from: college.course.1_basic_training_day_1, college.course.2_basic_training_day_2, college.course.3_basic_training_day_3
       3  engine.OperatorSkillProgressionEngine
         e.g. from: college.course.1_basic_training_day_1, college.course.2_basic_training_day_2, college.course.3_basic_training_day_3

## Dead-edge count by source-node layer
    3765  layer=L9
      69  layer=?
      63  layer=L13

## Missing ids by prefix (= which generator leaks)
    3658  engine
      66  disp
      57  fs
      12  ghost
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
