# 📚 CAM Knowledge Index (slot:kilo — compiled wiki + tribal + paths)

_Generated 2026-05-29T15:42:39.660Z · regen: `node scripts/cam-knowledge-index.mjs` · the one-stop CAM knowledge map for fast search._

## Tribal knowledge
- **Catalog tribal corpus:** `state/shared/corpus/cam-tribal-tips.jsonl` — 928 real-data tips (regen `node scripts/emit-cam-tribal-tips.mjs`, MCP/Ollama-free).
- **Tribal RAG index:** `mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json` (6M).
- **Dev-pattern tribal:** `mcp-server/src/engines/cam/GSD.md` §4 (wiring/security-hook/cwd gotchas) + [[reference_kilo_cam_gsd_2026_05_29]].
- **Per-prompt surfacing:** `.claude/hooks/tribal-by-domain-inject.mjs` (top-3 CAM tribal by domain).

## CAM wiki entries (519 leaves)
### architecture (10)
- [[cad-cam-resources-pdf-index]] · `knowledge/wiki/architecture/cad-cam-resources-pdf-index.md`
- [[cam-galaxy]] · `knowledge/wiki/architecture/cam-galaxy.md`
- [[cam-knowledge-index]] · `knowledge/wiki/architecture/cam-knowledge-index.md`
- [[cam-self-teaching-pipeline-ms0]] · `knowledge/wiki/architecture/cam-self-teaching-pipeline-ms0.md`
- [[dispatcher-cam]] · `knowledge/wiki/architecture/dispatcher-cam.md`
- [[dispatcher-camfunction]] · `knowledge/wiki/architecture/dispatcher-camfunction.md`
- [[dispatcher-toolpath]] · `knowledge/wiki/architecture/dispatcher-toolpath.md`
- [[domain-cam]] · `knowledge/wiki/architecture/domain-cam.md`
- [[domain-mastercam]] · `knowledge/wiki/architecture/domain-mastercam.md`
- [[domain-toolpath]] · `knowledge/wiki/architecture/domain-toolpath.md`

### architecture/datacat (26)
- [[bobcad-cam-tips]] · `knowledge/wiki/architecture/datacat/bobcad-cam-tips.md`
- [[camworks-cam-tips]] · `knowledge/wiki/architecture/datacat/camworks-cam-tips.md`
- [[catia-cam-tips]] · `knowledge/wiki/architecture/datacat/catia-cam-tips.md`
- [[cimatron-cam-tips]] · `knowledge/wiki/architecture/datacat/cimatron-cam-tips.md`
- [[edgecam-cam-tips]] · `knowledge/wiki/architecture/datacat/edgecam-cam-tips.md`
- [[esprit-cam-tips]] · `knowledge/wiki/architecture/datacat/esprit-cam-tips.md`
- [[fusion360-cam-tips-ext]] · `knowledge/wiki/architecture/datacat/fusion360-cam-tips-ext.md`
- [[fusion360-cam-tips]] · `knowledge/wiki/architecture/datacat/fusion360-cam-tips.md`
- [[hypermill-automation-center]] · `knowledge/wiki/architecture/datacat/hypermill-automation-center.md`
- [[hypermill-cam-tips-ext]] · `knowledge/wiki/architecture/datacat/hypermill-cam-tips-ext.md`
- [[hypermill-extracted-tips]] · `knowledge/wiki/architecture/datacat/hypermill-extracted-tips.md`
- [[hypermill-formula-registry]] · `knowledge/wiki/architecture/datacat/hypermill-formula-registry.md`
- [[hypermill-materials-catalog]] · `knowledge/wiki/architecture/datacat/hypermill-materials-catalog.md`
- [[hypermill-speed-feed-catalog]] · `knowledge/wiki/architecture/datacat/hypermill-speed-feed-catalog.md`
- [[hypermill-tool-schema-notes]] · `knowledge/wiki/architecture/datacat/hypermill-tool-schema-notes.md`
- [[hypermill-turning-strategy-catalog]] · `knowledge/wiki/architecture/datacat/hypermill-turning-strategy-catalog.md`
- [[mastercam-cam-tips]] · `knowledge/wiki/architecture/datacat/mastercam-cam-tips.md`
- [[nx-cam-tips-ext]] · `knowledge/wiki/architecture/datacat/nx-cam-tips-ext.md`
- [[nx-cam-tips]] · `knowledge/wiki/architecture/datacat/nx-cam-tips.md`
- [[powermill-cam-tips]] · `knowledge/wiki/architecture/datacat/powermill-cam-tips.md`
- [[solidcam-cam-tips]] · `knowledge/wiki/architecture/datacat/solidcam-cam-tips.md`
- [[sprutcam-cam-tips]] · `knowledge/wiki/architecture/datacat/sprutcam-cam-tips.md`
- [[surfcam-cam-tips]] · `knowledge/wiki/architecture/datacat/surfcam-cam-tips.md`
- [[tebis-cam-tips]] · `knowledge/wiki/architecture/datacat/tebis-cam-tips.md`
- [[topsolid-cam-tips]] · `knowledge/wiki/architecture/datacat/topsolid-cam-tips.md`
- [[worknc-cam-tips]] · `knowledge/wiki/architecture/datacat/worknc-cam-tips.md`

### architecture/diagrams (1)
- [[cam-flow]] · `knowledge/wiki/architecture/diagrams/cam-flow.md`

### architecture/engines/bridge (4)
- [[bobcadcambridgeengine]] · `knowledge/wiki/architecture/engines/bridge/bobcadcambridgeengine.md`
- [[cimatroncambridgeengine]] · `knowledge/wiki/architecture/engines/bridge/cimatroncambridgeengine.md`
- [[sprutcambridgeengine]] · `knowledge/wiki/architecture/engines/bridge/sprutcambridgeengine.md`
- [[worknccambridgeengine]] · `knowledge/wiki/architecture/engines/bridge/worknccambridgeengine.md`

### architecture/engines/cad (1)
- [[featurecamfunctionindexengine]] · `knowledge/wiki/architecture/engines/cad/featurecamfunctionindexengine.md`

### architecture/engines/calc (1)
- [[trochoidalmillingengine]] · `knowledge/wiki/architecture/engines/calc/trochoidalmillingengine.md`

### architecture/engines/cam (11)
- [[camworksfunctionindexengine]] · `knowledge/wiki/architecture/engines/cam/camworksfunctionindexengine.md`
- [[espritcambridgeengine]] · `knowledge/wiki/architecture/engines/cam/espritcambridgeengine.md`
- [[inventorcamaiorchestrationengine]] · `knowledge/wiki/architecture/engines/cam/inventorcamaiorchestrationengine.md`
- [[mastercam5axisengine]] · `knowledge/wiki/architecture/engines/cam/mastercam5axisengine.md`
- [[mastercamcontrollercatalogengine]] · `knowledge/wiki/architecture/engines/cam/mastercamcontrollercatalogengine.md`
- [[mastercammultiaxisengine]] · `knowledge/wiki/architecture/engines/cam/mastercammultiaxisengine.md`
- [[mastercamsafetyhooksengine]] · `knowledge/wiki/architecture/engines/cam/mastercamsafetyhooksengine.md`
- [[nxcamcodegeneratorengine]] · `knowledge/wiki/architecture/engines/cam/nxcamcodegeneratorengine.md`
- [[powermillcodegeneratorengine]] · `knowledge/wiki/architecture/engines/cam/powermillcodegeneratorengine.md`
- [[solidcamcodegeneratorengine]] · `knowledge/wiki/architecture/engines/cam/solidcamcodegeneratorengine.md`
- [[solidcamsafetyhooksengine]] · `knowledge/wiki/architecture/engines/cam/solidcamsafetyhooksengine.md`

### architecture/engines/cpl (2)
- [[phcurvetoolpathengine]] · `knowledge/wiki/architecture/engines/cpl/phcurvetoolpathengine.md`
- [[stochastictoolpathroutingengine]] · `knowledge/wiki/architecture/engines/cpl/stochastictoolpathroutingengine.md`

### architecture/engines/edm (1)
- [[edmtoolpathstrategyengine]] · `knowledge/wiki/architecture/engines/edm/edmtoolpathstrategyengine.md`

### architecture/engines/five (1)
- [[solidcam5axisfunctionindexengine]] · `knowledge/wiki/architecture/engines/five/solidcam5axisfunctionindexengine.md`

### architecture/engines/hyper (17)
- [[hypermill5axistiltlimithook]] · `knowledge/wiki/architecture/engines/hyper/hypermill5axistiltlimithook.md`
- [[hypermillacserverconfig]] · `knowledge/wiki/architecture/engines/hyper/hypermillacserverconfig.md`
- [[hypermillbladeroughingengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillbladeroughingengine.md`
- [[hypermillcycledefaultsvalidation]] · `knowledge/wiki/architecture/engines/hyper/hypermillcycledefaultsvalidation.md`
- [[hypermillfunctionindexengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillfunctionindexengine.md`
- [[hypermilljobmonitor]] · `knowledge/wiki/architecture/engines/hyper/hypermilljobmonitor.md`
- [[hypermillmillturnstrategyengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillmillturnstrategyengine.md`
- [[hypermillmoldcycleengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillmoldcycleengine.md`
- [[hypermillmultiaxisphysicspipeline]] · `knowledge/wiki/architecture/engines/hyper/hypermillmultiaxisphysicspipeline.md`
- [[hypermillpppfilewriter]] · `knowledge/wiki/architecture/engines/hyper/hypermillpppfilewriter.md`
- [[hypermillprobingbridge]] · `knowledge/wiki/architecture/engines/hyper/hypermillprobingbridge.md`
- [[hypermillresourceindexengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillresourceindexengine.md`
- [[hypermillsafetyhooks]] · `knowledge/wiki/architecture/engines/hyper/hypermillsafetyhooks.md`
- [[hypermillskillregistrymap]] · `knowledge/wiki/architecture/engines/hyper/hypermillskillregistrymap.md`
- [[hypermillskillsbatchengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillskillsbatchengine.md`
- [[hypermillthreadstandardengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillthreadstandardengine.md`
- [[hypermillturningconfigingesterengine]] · `knowledge/wiki/architecture/engines/hyper/hypermillturningconfigingesterengine.md`

### architecture/engines/inventor (1)
- [[inventorcamstrategyengine]] · `knowledge/wiki/architecture/engines/inventor/inventorcamstrategyengine.md`

### architecture/engines/mastercam (8)
- [[mastercamfaibridge]] · `knowledge/wiki/architecture/engines/mastercam/mastercamfaibridge.md`
- [[mastercamfunctionindexengine]] · `knowledge/wiki/architecture/engines/mastercam/mastercamfunctionindexengine.md`
- [[mastercamgrindingbridge]] · `knowledge/wiki/architecture/engines/mastercam/mastercamgrindingbridge.md`
- [[mastercamheadlessintegrationtestengine]] · `knowledge/wiki/architecture/engines/mastercam/mastercamheadlessintegrationtestengine.md`
- [[mastercammoldcycleengine]] · `knowledge/wiki/architecture/engines/mastercam/mastercammoldcycleengine.md`
- [[mastercamprobingbridge]] · `knowledge/wiki/architecture/engines/mastercam/mastercamprobingbridge.md`
- [[mastercamspcbridge]] · `knowledge/wiki/architecture/engines/mastercam/mastercamspcbridge.md`
- [[mastercamsurfaceintegritybridge]] · `knowledge/wiki/architecture/engines/mastercam/mastercamsurfaceintegritybridge.md`

### architecture/engines/mill (2)
- [[mastercammillturnbridge]] · `knowledge/wiki/architecture/engines/mill/mastercammillturnbridge.md`
- [[solidcammillturnfunctionindexengine]] · `knowledge/wiki/architecture/engines/mill/solidcammillturnfunctionindexengine.md`

### architecture/engines/milling (1)
- [[nxcammillingfunctionindexengine]] · `knowledge/wiki/architecture/engines/milling/nxcammillingfunctionindexengine.md`

### architecture/engines/multi (1)
- [[multiaxistoolpathengine]] · `knowledge/wiki/architecture/engines/multi/multiaxistoolpathengine.md`

### architecture/engines/other (15)
- [[alphacamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/alphacamfunctionindexengine.md`
- [[bobcadcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/bobcadcamfunctionindexengine.md`
- [[cimatronfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/cimatronfunctionindexengine.md`
- [[edgecamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/edgecamfunctionindexengine.md`
- [[nxcamfbmfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/nxcamfbmfunctionindexengine.md`
- [[nxcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/nxcamfunctionindexengine.md`
- [[solidcam25dfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/solidcam25dfunctionindexengine.md`
- [[solidcam3dhsshsrfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/solidcam3dhsshsrfunctionindexengine.md`
- [[solidcamalgorithmsengine]] · `knowledge/wiki/architecture/engines/other/solidcamalgorithmsengine.md`
- [[solidcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/solidcamfunctionindexengine.md`
- [[solidcamimachiningfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/solidcamimachiningfunctionindexengine.md`
- [[sprutcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/sprutcamfunctionindexengine.md`
- [[surfcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/surfcamfunctionindexengine.md`
- [[topsolidcamfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/topsolidcamfunctionindexengine.md`
- [[workncfunctionindexengine]] · `knowledge/wiki/architecture/engines/other/workncfunctionindexengine.md`

### architecture/engines/toolpath (4)
- [[toolpathlinkingengine]] · `knowledge/wiki/architecture/engines/toolpath/toolpathlinkingengine.md`
- [[toolpathstepoverengine]] · `knowledge/wiki/architecture/engines/toolpath/toolpathstepoverengine.md`
- [[toolpathstrategyengine]] · `knowledge/wiki/architecture/engines/toolpath/toolpathstrategyengine.md`
- [[toolpathstrategyrouterengine]] · `knowledge/wiki/architecture/engines/toolpath/toolpathstrategyrouterengine.md`

### architecture/engines/turning (2)
- [[nxcamturningfunctionindexengine]] · `knowledge/wiki/architecture/engines/turning/nxcamturningfunctionindexengine.md`
- [[solidcamturningfunctionindexengine]] · `knowledge/wiki/architecture/engines/turning/solidcamturningfunctionindexengine.md`

### architecture/engines/wedm (1)
- [[mastercamedmbridge]] · `knowledge/wiki/architecture/engines/wedm/mastercamedmbridge.md`

### architecture/extracts (12)
- [[fusion360-2d-toolpath-parameters]] · `knowledge/wiki/architecture/extracts/fusion360-2d-toolpath-parameters.md`
- [[hypermill-api-1776043438323]] · `knowledge/wiki/architecture/extracts/hypermill-api-1776043438323.md`
- [[hypermill-atoms-1776036032655]] · `knowledge/wiki/architecture/extracts/hypermill-atoms-1776036032655.md`
- [[hypermill-complete-inventory]] · `knowledge/wiki/architecture/extracts/hypermill-complete-inventory.md`
- [[hypermill-complete-ui-inventory]] · `knowledge/wiki/architecture/extracts/hypermill-complete-ui-inventory.md`
- [[hypermill-deep-extraction-1776035440520]] · `knowledge/wiki/architecture/extracts/hypermill-deep-extraction-1776035440520.md`
- [[hypermill-knowledge-graph-1776036032655]] · `knowledge/wiki/architecture/extracts/hypermill-knowledge-graph-1776036032655.md`
- [[hypermill-tips-1776035440520]] · `knowledge/wiki/architecture/extracts/hypermill-tips-1776035440520.md`
- [[hypermill-tribal-tips-1776036032655]] · `knowledge/wiki/architecture/extracts/hypermill-tribal-tips-1776036032655.md`
- [[hypermill-workflows-1776043719163]] · `knowledge/wiki/architecture/extracts/hypermill-workflows-1776043719163.md`
- [[mastercam-tribal-extraction]] · `knowledge/wiki/architecture/extracts/mastercam-tribal-extraction.md`
- [[mastercam-x8-complete-inventory]] · `knowledge/wiki/architecture/extracts/mastercam-x8-complete-inventory.md`

### architecture/hooks/engine (3)
- [[hypermilldatafreshnesshook]] · `knowledge/wiki/architecture/hooks/engine/hypermilldatafreshnesshook.md`
- [[hypermillmillturnhooks]] · `knowledge/wiki/architecture/hooks/engine/hypermillmillturnhooks.md`
- [[hypermillturninghooks]] · `knowledge/wiki/architecture/hooks/engine/hypermillturninghooks.md`

### architecture/jmdie (1)
- [[customer-hypercad-s-and-hypermill-online-training]] · `knowledge/wiki/architecture/jmdie/customer-hypercad-s-and-hypermill-online-training.md`

### architecture/milestones (1)
- [[milestone-ghost-ms-cam-ml-closedloop-ms0]] · `knowledge/wiki/architecture/milestones/milestone-ghost-ms-cam-ml-closedloop-ms0.md`

### architecture/monolith-modules/algorithms (2)
- [[complete-toolpath-algorithm-library]] · `knowledge/wiki/architecture/monolith-modules/algorithms/complete-toolpath-algorithm-library.md`
- [[prism-graph-toolpath]] · `knowledge/wiki/architecture/monolith-modules/algorithms/prism-graph-toolpath.md`

### architecture/monolith-modules/complete (3)
- [[prism-cam-kernel-pass2]] · `knowledge/wiki/architecture/monolith-modules/complete/prism-cam-kernel-pass2.md`
- [[prism-intelligent-rest-machining]] · `knowledge/wiki/architecture/monolith-modules/complete/prism-intelligent-rest-machining.md`
- [[prism-master-cad-cam-database]] · `knowledge/wiki/architecture/monolith-modules/complete/prism-master-cad-cam-database.md`

### architecture/monolith-modules/complete-extraction (32)
- [[prism-2d-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-2d-toolpath-engine.md`
- [[prism-5axis-blisk-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-5axis-blisk-cam-engine.md`
- [[prism-adaptive-clearing-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-adaptive-clearing-engine.md`
- [[prism-advanced-rest-machining]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-advanced-rest-machining.md`
- [[prism-ai-toolpath-database]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-ai-toolpath-database.md`
- [[prism-cad-cam-integration-hub]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cad-cam-integration-hub.md`
- [[prism-cam-100-percent-enhancement]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-100-percent-enhancement.md`
- [[prism-cam-kernel-mit]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-kernel-mit.md`
- [[prism-cam-kernel-pass2]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-kernel-pass2.md`
- [[prism-cam-learning-engine-enhanced]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-learning-engine-enhanced.md`
- [[prism-cam-learning-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-learning-engine.md`
- [[prism-cam-toolpath-parameters-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-toolpath-parameters-engine.md`
- [[prism-cam-workflow]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-cam-workflow.md`
- [[prism-enhanced-mill-turn-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-enhanced-mill-turn-cam-engine.md`
- [[prism-enhanced-toolpath-generator]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-enhanced-toolpath-generator.md`
- [[prism-expanded-cad-cam-library]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-expanded-cad-cam-library.md`
- [[prism-graph-toolpath]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-graph-toolpath.md`
- [[prism-hypermill-automation-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-hypermill-automation-engine.md`
- [[prism-hypermill-python-api-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-hypermill-python-api-engine.md`
- [[prism-hypermill-simulation-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-hypermill-simulation-engine.md`
- [[prism-intelligent-rest-machining]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-intelligent-rest-machining.md`
- [[prism-lathe-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-lathe-toolpath-engine.md`
- [[prism-master-toolpath-registry]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-master-toolpath-registry.md`
- [[prism-multiaxis-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-multiaxis-toolpath-engine.md`
- [[prism-real-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-real-toolpath-engine.md`
- [[prism-rest-machining-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-rest-machining-engine.md`
- [[prism-siemens-5axis-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-siemens-5axis-cam-engine.md`
- [[prism-swarm-toolpath]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-swarm-toolpath.md`
- [[prism-toolpath-gcode-bridge]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-toolpath-gcode-bridge.md`
- [[prism-toolpath-optimization]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-toolpath-optimization.md`
- [[prism-toolpath-strategies-complete]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-toolpath-strategies-complete.md`
- [[prism-unified-toolpath-decision-engine]] · `knowledge/wiki/architecture/monolith-modules/complete-extraction/prism-unified-toolpath-decision-engine.md`

### architecture/monolith-modules/core (1)
- [[prism-master-toolpath-registry]] · `knowledge/wiki/architecture/monolith-modules/core/prism-master-toolpath-registry.md`

### architecture/monolith-modules/databases (1)
- [[prism-hypermill-fixture-database]] · `knowledge/wiki/architecture/monolith-modules/databases/prism-hypermill-fixture-database.md`

### architecture/monolith-modules/engines-ai-ml (2)
- [[prism-ai-auto-cam]] · `knowledge/wiki/architecture/monolith-modules/engines-ai-ml/prism-ai-auto-cam.md`
- [[prism-cam-learning-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-ai-ml/prism-cam-learning-engine.md`

### architecture/monolith-modules/engines-cad-cam (15)
- [[prism-adaptive-clearing-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-adaptive-clearing-engine.md`
- [[prism-cad-cam-integration-hub]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-cad-cam-integration-hub.md`
- [[prism-cam-kernel-complete]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-cam-kernel-complete.md`
- [[prism-cam-kernel-mit]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-cam-kernel-mit.md`
- [[prism-cam-toolpath-parameters-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-cam-toolpath-parameters-engine.md`
- [[prism-enhanced-mill-turn-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-enhanced-mill-turn-cam-engine.md`
- [[prism-enhanced-toolpath-generator]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-enhanced-toolpath-generator.md`
- [[prism-lathe-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-lathe-toolpath-engine.md`
- [[prism-multiaxis-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-multiaxis-toolpath-engine.md`
- [[prism-real-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-real-toolpath-engine.md`
- [[prism-rest-machining-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-rest-machining-engine.md`
- [[prism-siemens-5axis-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-siemens-5axis-cam-engine.md`
- [[prism-toolpath-optimization]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-toolpath-optimization.md`
- [[prism-toolpath-strategies-complete]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-toolpath-strategies-complete.md`
- [[prism-unified-toolpath-decision-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-cam/prism-unified-toolpath-decision-engine.md`

### architecture/monolith-modules/engines-cad-complete (1)
- [[prism-complete-cad-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-cad-complete/prism-complete-cad-cam-engine.md`

### architecture/monolith-modules/engines-optimization (1)
- [[prism-swarm-toolpath]] · `knowledge/wiki/architecture/monolith-modules/engines-optimization/prism-swarm-toolpath.md`

### architecture/monolith-modules/engines-simulation (1)
- [[prism-3d-toolpath-strategy-engine]] · `knowledge/wiki/architecture/monolith-modules/engines-simulation/prism-3d-toolpath-strategy-engine.md`

### architecture/monolith-modules/geometry-engines (1)
- [[prism-complete-cad-cam-engine]] · `knowledge/wiki/architecture/monolith-modules/geometry-engines/prism-complete-cad-cam-engine.md`

### architecture/monolith-modules/mega (1)
- [[prism-real-toolpath-engine]] · `knowledge/wiki/architecture/monolith-modules/mega/prism-real-toolpath-engine.md`

### architecture/monolith-modules/mit (1)
- [[prism-cam-kernel-mit]] · `knowledge/wiki/architecture/monolith-modules/mit/prism-cam-kernel-mit.md`

### architecture/monolith-modules/physics-engines (1)
- [[prism-cam-cutting-param-bridge]] · `knowledge/wiki/architecture/monolith-modules/physics-engines/prism-cam-cutting-param-bridge.md`

### architecture/monolith-modules/priority-extraction (3)
- [[prism-3d-toolpath-strategy-engine]] · `knowledge/wiki/architecture/monolith-modules/priority-extraction/prism-3d-toolpath-strategy-engine.md`
- [[prism-comprehensive-cam-strategies]] · `knowledge/wiki/architecture/monolith-modules/priority-extraction/prism-comprehensive-cam-strategies.md`
- [[prism-hybrid-toolpath-synthesizer]] · `knowledge/wiki/architecture/monolith-modules/priority-extraction/prism-hybrid-toolpath-synthesizer.md`

### architecture/monolith-modules/ultra (2)
- [[prism-cam-workflow]] · `knowledge/wiki/architecture/monolith-modules/ultra/prism-cam-workflow.md`
- [[prism-expanded-cad-cam-library]] · `knowledge/wiki/architecture/monolith-modules/ultra/prism-expanded-cad-cam-library.md`

### architecture/registries (37)
- [[registry-datacat-cam-knowledge]] · `knowledge/wiki/architecture/registries/registry-datacat-cam-knowledge.md`
- [[registry-datacat-cam-tips]] · `knowledge/wiki/architecture/registries/registry-datacat-cam-tips.md`
- [[registry-extract-fusion360-cam]] · `knowledge/wiki/architecture/registries/registry-extract-fusion360-cam.md`
- [[registry-extract-hypermill-api]] · `knowledge/wiki/architecture/registries/registry-extract-hypermill-api.md`
- [[registry-extract-hypermill-workflows]] · `knowledge/wiki/architecture/registries/registry-extract-hypermill-workflows.md`
- [[registry-extract-hypermill]] · `knowledge/wiki/architecture/registries/registry-extract-hypermill.md`
- [[registry-extract-mastercam]] · `knowledge/wiki/architecture/registries/registry-extract-mastercam.md`
- [[registry-reg-cadfunctioncatalog-mastercam]] · `knowledge/wiki/architecture/registries/registry-reg-cadfunctioncatalog-mastercam.md`
- [[registry-reg-camfunctioncatalog-alphacam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-alphacam.md`
- [[registry-reg-camfunctioncatalog-bobcad]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-bobcad.md`
- [[registry-reg-camfunctioncatalog-camworks]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-camworks.md`
- [[registry-reg-camfunctioncatalog-catia]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-catia.md`
- [[registry-reg-camfunctioncatalog-cimatron]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-cimatron.md`
- [[registry-reg-camfunctioncatalog-creo]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-creo.md`
- [[registry-reg-camfunctioncatalog-edgecam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-edgecam.md`
- [[registry-reg-camfunctioncatalog-esprit]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-esprit.md`
- [[registry-reg-camfunctioncatalog-featurecam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-featurecam.md`
- [[registry-reg-camfunctioncatalog-fusion360]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-fusion360.md`
- [[registry-reg-camfunctioncatalog-hypermill]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-hypermill.md`
- [[registry-reg-camfunctioncatalog-inventor-hsm]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-inventor-hsm.md`
- [[registry-reg-camfunctioncatalog-mastercam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-mastercam.md`
- [[registry-reg-camfunctioncatalog-nxcam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-nxcam.md`
- [[registry-reg-camfunctioncatalog-partmaker]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-partmaker.md`
- [[registry-reg-camfunctioncatalog-powermill]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-powermill.md`
- [[registry-reg-camfunctioncatalog-solidcam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-solidcam.md`
- [[registry-reg-camfunctioncatalog-sprutcam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-sprutcam.md`
- [[registry-reg-camfunctioncatalog-surfcam]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-surfcam.md`
- [[registry-reg-camfunctioncatalog-tebis]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-tebis.md`
- [[registry-reg-camfunctioncatalog-topsolid]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-topsolid.md`
- [[registry-reg-camfunctioncatalog-vericut]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-vericut.md`
- [[registry-reg-camfunctioncatalog-visi]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-visi.md`
- [[registry-reg-camfunctioncatalog-worknc]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog-worknc.md`
- [[registry-reg-camfunctioncatalog]] · `knowledge/wiki/architecture/registries/registry-reg-camfunctioncatalog.md`
- [[registry-reg-camuicatalog-hypermill]] · `knowledge/wiki/architecture/registries/registry-reg-camuicatalog-hypermill.md`
- [[registry-reg-camuicatalog-mastercam]] · `knowledge/wiki/architecture/registries/registry-reg-camuicatalog-mastercam.md`
- [[registry-reg-toolpathstrategyregistry-part1]] · `knowledge/wiki/architecture/registries/registry-reg-toolpathstrategyregistry-part1.md`
- [[registry-reg-toolpathstrategyregistry]] · `knowledge/wiki/architecture/registries/registry-reg-toolpathstrategyregistry.md`

### architecture/skills/project (5)
- [[cam-fixture]] · `knowledge/wiki/architecture/skills/project/cam-fixture.md`
- [[cam-post-lint]] · `knowledge/wiki/architecture/skills/project/cam-post-lint.md`
- [[cam-strategy]] · `knowledge/wiki/architecture/skills/project/cam-strategy.md`
- [[cam-toolpath-check]] · `knowledge/wiki/architecture/skills/project/cam-toolpath-check.md`
- [[cam-workholding]] · `knowledge/wiki/architecture/skills/project/cam-workholding.md`

### architecture/skills/user (19)
- [[cam-bridge]] · `knowledge/wiki/architecture/skills/user/cam-bridge.md`
- [[cam-export-tools]] · `knowledge/wiki/architecture/skills/user/cam-export-tools.md`
- [[cam-fixture]] · `knowledge/wiki/architecture/skills/user/cam-fixture.md`
- [[cam-post-lint]] · `knowledge/wiki/architecture/skills/user/cam-post-lint.md`
- [[cam-strategy-compare]] · `knowledge/wiki/architecture/skills/user/cam-strategy-compare.md`
- [[cam-strategy-select]] · `knowledge/wiki/architecture/skills/user/cam-strategy-select.md`
- [[cam-strategy]] · `knowledge/wiki/architecture/skills/user/cam-strategy.md`
- [[cam-toolpath-check]] · `knowledge/wiki/architecture/skills/user/cam-toolpath-check.md`
- [[cam-workholding]] · `knowledge/wiki/architecture/skills/user/cam-workholding.md`
- [[catia-cam-setup]] · `knowledge/wiki/architecture/skills/user/catia-cam-setup.md`
- [[hypermill-3d-strategy-guide]] · `knowledge/wiki/architecture/skills/user/hypermill-3d-strategy-guide.md`
- [[hypermill-project-setup]] · `knowledge/wiki/architecture/skills/user/hypermill-project-setup.md`
- [[mastercam-setup]] · `knowledge/wiki/architecture/skills/user/mastercam-setup.md`
- [[mastercam-strategy-guide]] · `knowledge/wiki/architecture/skills/user/mastercam-strategy-guide.md`
- [[nx-cam-setup]] · `knowledge/wiki/architecture/skills/user/nx-cam-setup.md`
- [[powermill-setup]] · `knowledge/wiki/architecture/skills/user/powermill-setup.md`
- [[powermill-strategy-guide]] · `knowledge/wiki/architecture/skills/user/powermill-strategy-guide.md`
- [[solidcam-imachining-guide]] · `knowledge/wiki/architecture/skills/user/solidcam-imachining-guide.md`
- [[solidcam-setup]] · `knowledge/wiki/architecture/skills/user/solidcam-setup.md`

### architecture/tribal (68)
- [[tribal-bobcad-cam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-bobcad-cam-cam-tips.md`
- [[tribal-cam-tips-from-online-research-2026-05-26]] · `knowledge/wiki/architecture/tribal/tribal-cam-tips-from-online-research-2026-05-26.md`
- [[tribal-cam-tips-from-online-research-batch-2-2026-05-26]] · `knowledge/wiki/architecture/tribal/tribal-cam-tips-from-online-research-batch-2-2026-05-26.md`
- [[tribal-cam-tips-from-online-research-batch-3-2026-05-26]] · `knowledge/wiki/architecture/tribal/tribal-cam-tips-from-online-research-batch-3-2026-05-26.md`
- [[tribal-camworks-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-camworks-cam-tips.md`
- [[tribal-catia-machining-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-catia-machining-cam-tips.md`
- [[tribal-cimatron-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-cimatron-cam-tips.md`
- [[tribal-edgecam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-edgecam-cam-tips.md`
- [[tribal-esprit-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-esprit-cam-tips.md`
- [[tribal-esprit-from-youtube]] · `knowledge/wiki/architecture/tribal/tribal-esprit-from-youtube.md`
- [[tribal-fusion-360-cam-tips-2]] · `knowledge/wiki/architecture/tribal/tribal-fusion-360-cam-tips-2.md`
- [[tribal-fusion-360-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-fusion-360-cam-tips.md`
- [[tribal-hypermill-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-hypermill-cam-tips.md`
- [[tribal-hypermill-extracted-tips-hm-extracted]] · `knowledge/wiki/architecture/tribal/tribal-hypermill-extracted-tips-hm-extracted.md`
- [[tribal-hypermill-from-pdf]] · `knowledge/wiki/architecture/tribal/tribal-hypermill-from-pdf.md`
- [[tribal-hypermill-from-youtube]] · `knowledge/wiki/architecture/tribal/tribal-hypermill-from-youtube.md`
- [[tribal-mastercam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-mastercam-cam-tips.md`
- [[tribal-mastercam-from-youtube]] · `knowledge/wiki/architecture/tribal/tribal-mastercam-from-youtube.md`
- [[tribal-powermill-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-powermill-cam-tips.md`
- [[tribal-siemens-nx-cam-tips-2]] · `knowledge/wiki/architecture/tribal/tribal-siemens-nx-cam-tips-2.md`
- [[tribal-siemens-nx-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-siemens-nx-cam-tips.md`
- [[tribal-solidcam-cam-tips-10]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-10.md`
- [[tribal-solidcam-cam-tips-11]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-11.md`
- [[tribal-solidcam-cam-tips-12]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-12.md`
- [[tribal-solidcam-cam-tips-13]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-13.md`
- [[tribal-solidcam-cam-tips-14]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-14.md`
- [[tribal-solidcam-cam-tips-15]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-15.md`
- [[tribal-solidcam-cam-tips-16]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-16.md`
- [[tribal-solidcam-cam-tips-17]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-17.md`
- [[tribal-solidcam-cam-tips-18]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-18.md`
- [[tribal-solidcam-cam-tips-19]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-19.md`
- [[tribal-solidcam-cam-tips-2]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-2.md`
- [[tribal-solidcam-cam-tips-20]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-20.md`
- [[tribal-solidcam-cam-tips-21]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-21.md`
- [[tribal-solidcam-cam-tips-22]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-22.md`
- [[tribal-solidcam-cam-tips-23]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-23.md`
- [[tribal-solidcam-cam-tips-24]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-24.md`
- [[tribal-solidcam-cam-tips-25]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-25.md`
- [[tribal-solidcam-cam-tips-26]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-26.md`
- [[tribal-solidcam-cam-tips-27]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-27.md`
- [[tribal-solidcam-cam-tips-28]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-28.md`
- [[tribal-solidcam-cam-tips-29]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-29.md`
- [[tribal-solidcam-cam-tips-3]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-3.md`
- [[tribal-solidcam-cam-tips-30]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-30.md`
- [[tribal-solidcam-cam-tips-31]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-31.md`
- [[tribal-solidcam-cam-tips-32]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-32.md`
- [[tribal-solidcam-cam-tips-33]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-33.md`
- [[tribal-solidcam-cam-tips-34]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-34.md`
- [[tribal-solidcam-cam-tips-35]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-35.md`
- [[tribal-solidcam-cam-tips-36]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-36.md`
- [[tribal-solidcam-cam-tips-37]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-37.md`
- [[tribal-solidcam-cam-tips-38]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-38.md`
- [[tribal-solidcam-cam-tips-39]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-39.md`
- [[tribal-solidcam-cam-tips-4]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-4.md`
- [[tribal-solidcam-cam-tips-40]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-40.md`
- [[tribal-solidcam-cam-tips-5]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-5.md`
- [[tribal-solidcam-cam-tips-6]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-6.md`
- [[tribal-solidcam-cam-tips-7]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-7.md`
- [[tribal-solidcam-cam-tips-8]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-8.md`
- [[tribal-solidcam-cam-tips-9]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips-9.md`
- [[tribal-solidcam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-cam-tips.md`
- [[tribal-solidcam-from-youtube]] · `knowledge/wiki/architecture/tribal/tribal-solidcam-from-youtube.md`
- [[tribal-solidworks-cam-from-youtube]] · `knowledge/wiki/architecture/tribal/tribal-solidworks-cam-from-youtube.md`
- [[tribal-sprutcam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-sprutcam-cam-tips.md`
- [[tribal-surfcam-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-surfcam-cam-tips.md`
- [[tribal-tebis-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-tebis-cam-tips.md`
- [[tribal-topsolid-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-topsolid-cam-tips.md`
- [[tribal-worknc-cam-tips]] · `knowledge/wiki/architecture/tribal/tribal-worknc-cam-tips.md`

### architecture/tribal/per-toolpath (194)
- [[tribal-esprit-adaptive-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-adaptive-roughing.md`
- [[tribal-esprit-b-axis-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-b-axis-mill.md`
- [[tribal-esprit-b-axis-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-b-axis-turn.md`
- [[tribal-esprit-b-axis]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-b-axis.md`
- [[tribal-esprit-contouring-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-contouring-cycle.md`
- [[tribal-esprit-face-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-face-turn.md`
- [[tribal-esprit-finish-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-finish-turn.md`
- [[tribal-esprit-live-tooling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-live-tooling.md`
- [[tribal-esprit-machine-swap]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-machine-swap.md`
- [[tribal-esprit-main-spindle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-main-spindle.md`
- [[tribal-esprit-master-channel]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-master-channel.md`
- [[tribal-esprit-mid-program-sim]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-mid-program-sim.md`
- [[tribal-esprit-modeless-programming]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-modeless-programming.md`
- [[tribal-esprit-multitasking]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-multitasking.md`
- [[tribal-esprit-pocketing-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-pocketing-cycle.md`
- [[tribal-esprit-profiling-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-profiling-cycle.md`
- [[tribal-esprit-profit-milling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-profit-milling.md`
- [[tribal-esprit-profit-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-profit-roughing.md`
- [[tribal-esprit-profit-turning]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-profit-turning.md`
- [[tribal-esprit-rough-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-rough-turn.md`
- [[tribal-esprit-solidturn-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-solidturn-finish.md`
- [[tribal-esprit-solidturn-groove]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-solidturn-groove.md`
- [[tribal-esprit-solidturn-parting]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-solidturn-parting.md`
- [[tribal-esprit-solidturn-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-solidturn-rough.md`
- [[tribal-esprit-solidturn-thread]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-solidturn-thread.md`
- [[tribal-esprit-stock-aware-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-stock-aware-cycle.md`
- [[tribal-esprit-sub-spindle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-sub-spindle.md`
- [[tribal-esprit-sync-parallel]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-sync-parallel.md`
- [[tribal-esprit-sync-sequential]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-sync-sequential.md`
- [[tribal-esprit-wire-edm]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-esprit-wire-edm.md`
- [[tribal-fusion360-adaptive-clearing-general]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-fusion360-adaptive-clearing-general.md`
- [[tribal-fusion360-multi-axis-swarf]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-fusion360-multi-axis-swarf.md`
- [[tribal-fusion360-rest-machining]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-fusion360-rest-machining.md`
- [[tribal-fusion360-scallop]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-fusion360-scallop.md`
- [[tribal-hypermill-2d-contour]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-2d-contour.md`
- [[tribal-hypermill-2d-pocket]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-2d-pocket.md`
- [[tribal-hypermill-5ax-contour]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-contour.md`
- [[tribal-hypermill-5ax-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-drill.md`
- [[tribal-hypermill-5ax-profile]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-profile.md`
- [[tribal-hypermill-5ax-rest]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-rest.md`
- [[tribal-hypermill-5ax-shape-offset]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-shape-offset.md`
- [[tribal-hypermill-5ax-swarf-cutting]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-swarf-cutting.md`
- [[tribal-hypermill-5ax-tilt-strategy]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-tilt-strategy.md`
- [[tribal-hypermill-5ax-top-milling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-5ax-top-milling.md`
- [[tribal-hypermill-automation-macros]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-automation-macros.md`
- [[tribal-hypermill-cam-plan]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-cam-plan.md`
- [[tribal-hypermill-closest-c-angle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-closest-c-angle.md`
- [[tribal-hypermill-collision-avoidance]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-collision-avoidance.md`
- [[tribal-hypermill-deburring-strategy]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-deburring-strategy.md`
- [[tribal-hypermill-drilling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-drilling.md`
- [[tribal-hypermill-dynamic-stock-link]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-dynamic-stock-link.md`
- [[tribal-hypermill-engraving]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-engraving.md`
- [[tribal-hypermill-face-milling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-face-milling.md`
- [[tribal-hypermill-helical-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-helical-drill.md`
- [[tribal-hypermill-hole-recognition]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hole-recognition.md`
- [[tribal-hypermill-hsc-contour-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-contour-rough.md`
- [[tribal-hypermill-hsc-contour]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-contour.md`
- [[tribal-hypermill-hsc-plane-milling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-plane-milling.md`
- [[tribal-hypermill-hsc-profile-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-profile-finish.md`
- [[tribal-hypermill-hsc-profile]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-profile.md`
- [[tribal-hypermill-hsc-residual-stock]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-residual-stock.md`
- [[tribal-hypermill-hsc-rest-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-rest-roughing.md`
- [[tribal-hypermill-hsc-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-roughing.md`
- [[tribal-hypermill-hsc-surface-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-hsc-surface-finish.md`
- [[tribal-hypermill-lead-angle-correction]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-lead-angle-correction.md`
- [[tribal-hypermill-maxx-plunge]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-maxx-plunge.md`
- [[tribal-hypermill-maxx-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-maxx-roughing.md`
- [[tribal-hypermill-maxx-tangent-plane]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-maxx-tangent-plane.md`
- [[tribal-hypermill-maxx-tangent]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-maxx-tangent.md`
- [[tribal-hypermill-maxx-trochoidal]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-maxx-trochoidal.md`
- [[tribal-hypermill-millturn-finish-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-millturn-finish-turn.md`
- [[tribal-hypermill-millturn-groove]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-millturn-groove.md`
- [[tribal-hypermill-millturn-rough-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-millturn-rough-turn.md`
- [[tribal-hypermill-millturn-thread]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-millturn-thread.md`
- [[tribal-hypermill-multiblade-best-fit]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-multiblade-best-fit.md`
- [[tribal-hypermill-multiblade-blade]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-multiblade-blade.md`
- [[tribal-hypermill-multiblade-blisk]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-multiblade-blisk.md`
- [[tribal-hypermill-multiblade-rolling-ball]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-multiblade-rolling-ball.md`
- [[tribal-hypermill-thread-milling]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-thread-milling.md`
- [[tribal-hypermill-tube-machining]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-tube-machining.md`
- [[tribal-hypermill-workplane-tilt]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-hypermill-workplane-tilt.md`
- [[tribal-mastercam-2d-contour]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-2d-contour.md`
- [[tribal-mastercam-2d-pocket]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-2d-pocket.md`
- [[tribal-mastercam-accelerated-finishing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-accelerated-finishing.md`
- [[tribal-mastercam-area-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-area-rough.md`
- [[tribal-mastercam-blend-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-blend-mill.md`
- [[tribal-mastercam-bore-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-bore-cycle.md`
- [[tribal-mastercam-circle-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-circle-mill.md`
- [[tribal-mastercam-drill-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-drill-cycle.md`
- [[tribal-mastercam-dynamic-area-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-dynamic-area-mill.md`
- [[tribal-mastercam-dynamic-contour]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-dynamic-contour.md`
- [[tribal-mastercam-dynamic-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-dynamic-mill.md`
- [[tribal-mastercam-dynamic-rest-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-dynamic-rest-mill.md`
- [[tribal-mastercam-engrave]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-engrave.md`
- [[tribal-mastercam-engraving]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-engraving.md`
- [[tribal-mastercam-equidistant]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-equidistant.md`
- [[tribal-mastercam-face-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-face-mill.md`
- [[tribal-mastercam-flowline]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-flowline.md`
- [[tribal-mastercam-hybrid-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-hybrid-finish.md`
- [[tribal-mastercam-lathe-bar-feed]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-bar-feed.md`
- [[tribal-mastercam-lathe-cutoff]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-cutoff.md`
- [[tribal-mastercam-lathe-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-drill.md`
- [[tribal-mastercam-lathe-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-finish.md`
- [[tribal-mastercam-lathe-groove]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-groove.md`
- [[tribal-mastercam-lathe-plunge-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-plunge-turn.md`
- [[tribal-mastercam-lathe-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-rough.md`
- [[tribal-mastercam-lathe-thread]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-lathe-thread.md`
- [[tribal-mastercam-millturn-handoff]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-millturn-handoff.md`
- [[tribal-mastercam-millturn-sync]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-millturn-sync.md`
- [[tribal-mastercam-multiaxis-blade]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-blade.md`
- [[tribal-mastercam-multiaxis-curve]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-curve.md`
- [[tribal-mastercam-multiaxis-deburr]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-deburr.md`
- [[tribal-mastercam-multiaxis-flow]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-flow.md`
- [[tribal-mastercam-multiaxis-port]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-port.md`
- [[tribal-mastercam-multiaxis-swarf]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-multiaxis-swarf.md`
- [[tribal-mastercam-opticore]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-opticore.md`
- [[tribal-mastercam-optirough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-optirough.md`
- [[tribal-mastercam-parallel-3d]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-parallel-3d.md`
- [[tribal-mastercam-peel-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-peel-mill.md`
- [[tribal-mastercam-pencil-trace]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-pencil-trace.md`
- [[tribal-mastercam-plunge-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-plunge-rough.md`
- [[tribal-mastercam-project-curve]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-project-curve.md`
- [[tribal-mastercam-raster-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-raster-finish.md`
- [[tribal-mastercam-rest-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-rest-rough.md`
- [[tribal-mastercam-scallop-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-scallop-finish.md`
- [[tribal-mastercam-slot-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-slot-mill.md`
- [[tribal-mastercam-surface-high-speed]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-surface-high-speed.md`
- [[tribal-mastercam-tap-cycle]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-tap-cycle.md`
- [[tribal-mastercam-thread-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-thread-mill.md`
- [[tribal-mastercam-waterline]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-waterline.md`
- [[tribal-mastercam-wire-edm-2axis]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-wire-edm-2axis.md`
- [[tribal-mastercam-wire-edm-4axis]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-wire-edm-4axis.md`
- [[tribal-mastercam-wire-edm-nocore]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-mastercam-wire-edm-nocore.md`
- [[tribal-solidcam-alternate-cut-direction]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-alternate-cut-direction.md`
- [[tribal-solidcam-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-drill.md`
- [[tribal-solidcam-engrave]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-engrave.md`
- [[tribal-solidcam-face-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-face-mill.md`
- [[tribal-solidcam-hsc-cycle-32]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-hsc-cycle-32.md`
- [[tribal-solidcam-hsm-finishing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-hsm-finishing.md`
- [[tribal-solidcam-hsr-roughing]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-hsr-roughing.md`
- [[tribal-solidcam-ifinish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-ifinish.md`
- [[tribal-solidcam-imachining-2d]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-imachining-2d.md`
- [[tribal-solidcam-imachining-3d]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-imachining-3d.md`
- [[tribal-solidcam-imachining-general]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-imachining-general.md`
- [[tribal-solidcam-indexed-5x]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-indexed-5x.md`
- [[tribal-solidcam-insert-cutter-override]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-insert-cutter-override.md`
- [[tribal-solidcam-level-slider]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-level-slider.md`
- [[tribal-solidcam-moating]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-moating.md`
- [[tribal-solidcam-morphing-spiral]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-morphing-spiral.md`
- [[tribal-solidcam-pencil-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-pencil-mill.md`
- [[tribal-solidcam-pocket-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-pocket-mill.md`
- [[tribal-solidcam-profile-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-profile-mill.md`
- [[tribal-solidcam-rest-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-rest-mill.md`
- [[tribal-solidcam-sim-5x]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-sim-5x.md`
- [[tribal-solidcam-spiral-efficiency]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-spiral-efficiency.md`
- [[tribal-solidcam-start-point-hint]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-start-point-hint.md`
- [[tribal-solidcam-technology-wizard]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-technology-wizard.md`
- [[tribal-solidcam-thread-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-thread-mill.md`
- [[tribal-solidcam-turning-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-turning-finish.md`
- [[tribal-solidcam-turning-groove]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-turning-groove.md`
- [[tribal-solidcam-turning-parting]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-turning-parting.md`
- [[tribal-solidcam-turning-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-turning-rough.md`
- [[tribal-solidcam-turning-thread]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-turning-thread.md`
- [[tribal-solidcam-view2-diagnostic]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidcam-view2-diagnostic.md`
- [[tribal-solidworks-cam-afr]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-afr.md`
- [[tribal-solidworks-cam-assembly-mode]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-assembly-mode.md`
- [[tribal-solidworks-cam-avoid-area]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-avoid-area.md`
- [[tribal-solidworks-cam-contain-area]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-contain-area.md`
- [[tribal-solidworks-cam-contour-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-contour-mill.md`
- [[tribal-solidworks-cam-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-drill.md`
- [[tribal-solidworks-cam-engrave]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-engrave.md`
- [[tribal-solidworks-cam-face-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-face-mill.md`
- [[tribal-solidworks-cam-featureworks]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-featureworks.md`
- [[tribal-solidworks-cam-fixture-clipping]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-fixture-clipping.md`
- [[tribal-solidworks-cam-ifr]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-ifr.md`
- [[tribal-solidworks-cam-lead-in]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-lead-in.md`
- [[tribal-solidworks-cam-lead-out]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-lead-out.md`
- [[tribal-solidworks-cam-mill-turn]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-mill-turn.md`
- [[tribal-solidworks-cam-operation-tree]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-operation-tree.md`
- [[tribal-solidworks-cam-pocket-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-pocket-mill.md`
- [[tribal-solidworks-cam-post-process]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-post-process.md`
- [[tribal-solidworks-cam-rest-machining]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-rest-machining.md`
- [[tribal-solidworks-cam-rough-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-rough-mill.md`
- [[tribal-solidworks-cam-slot-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-slot-mill.md`
- [[tribal-solidworks-cam-technology-database]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-technology-database.md`
- [[tribal-solidworks-cam-thread-mill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-thread-mill.md`
- [[tribal-solidworks-cam-three-plus-two]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-three-plus-two.md`
- [[tribal-solidworks-cam-turn-cutoff]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-cutoff.md`
- [[tribal-solidworks-cam-turn-drill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-drill.md`
- [[tribal-solidworks-cam-turn-finish]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-finish.md`
- [[tribal-solidworks-cam-turn-groove]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-groove.md`
- [[tribal-solidworks-cam-turn-rough]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-rough.md`
- [[tribal-solidworks-cam-turn-thread]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-turn-thread.md`
- [[tribal-solidworks-cam-volumill]] · `knowledge/wiki/architecture/tribal/per-toolpath/tribal-solidworks-cam-volumill.md`

### code-tribal/canonical (1)
- [[machining-tactics-climb-trochoidal-chip-thinning]] · `knowledge/wiki/code-tribal/canonical/machining-tactics-climb-trochoidal-chip-thinning.md`

## Key CAM file paths (full atlas: `mcp-server/src/engines/cam/PATHS.md`)
- **Galaxy brain:** `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD}.md`
- **Dispatchers:** `mcp-server/src/tools/dispatchers/{camDispatcher,camFunctionDispatcher,toolpathDispatcher}.ts`
- **Engines:** `mcp-server/src/engines/CAM*.ts` (99) · `HyperMill*.ts` (61) · `engines/hypermill/*.ts` (17) · `engines/cam/` (galaxy)
- **State:** `mcp-server/data/state/CAM_{VENDOR_REGISTRY,AI_ACTIONS_INDEX,TRIBAL_RAG_INDEX,ML_DRIFT_LOG}.json` · `cad-cam-resources-pdf-index.json`
- **Awareness:** `state/shared/CAM-AWARENESS-SNAPSHOT.md` (regen `cam-awareness-snapshot.mjs`) · verify `cam-galaxy-verify.mjs`
- **Skills:** `/cam-route-kilo` · `/cam-context` · `/cam-strategy*` · vendor guides (`/mastercam-*`, `/hypermill-*`, `/nx-cam-*`, …)
- **JM Die CAM corpus:** `JM DIE/FUSION CAD AND CAM FILES/` · `JM DIE/ROKU-ROKU/CAM TEMPLATES` · `JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training`

_Auto-invoked: referenced from cam/MEMORY.md (galaxy brain) + surfaced via the awareness snapshot. Query `/wiki-query <name>` for any entry above._
