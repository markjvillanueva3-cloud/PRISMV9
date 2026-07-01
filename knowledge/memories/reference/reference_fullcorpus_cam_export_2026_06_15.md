---
name: reference_fullcorpus_cam_export_2026_06_15
description: "FULLCORPUS-CAM (slot:romeo 2026-06-15): the COMPLETE 118,409-tool + 1,164-holder unified corpus exported to all 3 CAD/CAM DBs (Fusion .tools / hyperMILL .hmt / Mastercam .mcam-tools) with ALL-MEANS-ALL count assertions. Operator directive: every tool/holder/insert present in each CAD/CAM DB, 100k+ items. Closed the exporters' silent max_tools<=100,000 cap (was dropping 18,409 tools)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.581Z
aliases: reference_fullcorpus_cam_export_2026_06_15
---


**FULLCORPUS-CAM** (slot:romeo, 2026-06-15). Operator directive (cross-galaxy permission, ALL MEANS ALL): *"continue building until every tool holder, tool body, insert and tooling are present in each cad/cam database. I want ALL tools and holders in our database which is over 100k total items plus combinations for materials for parameters."*

**Enumerated first (ALL-MEANS-ALL step 1, mandatory):** `toolCatalogEngine.stats().total_tools` = **118,409 tools** + `getAllHolders()` = **1,164 holders** = 119,573 items. Inserts = 13,118 (a tool TYPE within the 118,409, not separate). By type: end_mill 49,517 / drill 36,202 / insert 13,118 / tap 6,183 / turning 5,959 / ball_mill 2,217 / face_mill 1,986 / grooving 938 / threading 936 / boring_bar 752 / reamer 216 / thread_mill 151 / + 8 smaller.

**Enumeration accessor:** `toolCatalogEngine.search({ max_results: 1_000_000 })` -> all 118,409 (search is `[...this.tools.values()].slice(0, max_results ?? 20)` -- no-filter returns all before slice; DEFAULT cap is 20, and the exporters' fallback `search({max_results: options.max_tools ?? 100_000})` was 18,409 SHORT of the corpus -- a silent ALL-MEANS-ALL violation now closed). `getAllTools()` does NOT exist (returns 0); use `search({})`.

**4 generators (`mcp-server/scripts/generate-fullcorpus-*.ts`), each asserts `output_count === corpus` + `process.exit(1)` on shortfall:**
- `generate-fullcorpus-fusion.ts` -> `fusionToolExportEngine.exportLibrary(all)` -> Fusion `.tools` JSON v2, 6 material presets/tool, 195MB. Commit `77e280af92`. Geometry coverage (validateCoverage R15): A=75,329 B=8,713 C=16,647 D=17,720 (71% B+; D=no cutting-diameter, mostly inserts w/ incomplete SOURCE dims). Compact JSON.stringify + streaming fallback for V8 512MB cap.
- `generate-fullcorpus-hypermill.ts` -> `hyperMillToolExportEngine.exportToHMT(all, {max_tools: 1_000_000})` -> `.hmt` SQLite, 355,237 INSERTs, 92MB, 6 ISO Materials factors + per-tool NCTool holders. Commit `61631e6a19`.
- `generate-fullcorpus-mastercam.ts` -> `mastercamToolExportEngine.exportFromTools(all)` -> `.mcam-tools` JSON, 258MB, per-ISO cutting + inferred holder. Commit `7c8f055397`.
- `generate-fullcorpus-holders.ts` -> `getAllHolders()` 1,164 -> universal holder catalog CSV+JSON (committed, small). 5 vendors, 28 tapers, 33 types. Commit `24a16cd656` (+ FULLCORPUS-MASTER-LEDGER.json).

**Outputs:** `state/shared/fullcorpus-cam-libraries/{fusion,hypermill,mastercam,holders}/`. Big `FULLCORPUS.*` (92-195MB) GITIGNORED (`.gitignore` pattern `state/shared/fullcorpus-cam-libraries/**/FULLCORPUS.*`) -- deterministically regenerable; ledgers + samples + holder CSV/JSON committed. Regen: `NODE_OPTIONS=--max-old-space-size=12288 npx tsx scripts/generate-fullcorpus-{fusion,hypermill,mastercam,holders}.ts`.

**Material-depth honesty (R12):** full corpus gets per-MATERIAL presets (Fusion 6 / hyperMILL+Mastercam per-ISO) -- the format-native model. Full per-grade x per-toolpath atomicity for 100k tools = ~13M rows = impractical as a library; that deep atomicity is reserved for the 218-tool JM crib ([[reference_jm_by_machine_fleet_libraries_2026_06_15]]). hyperMILL/Mastercam apply toolpath-specific cutting at the CAM-OPERATION level, not the tool DB (verified format-native, not a gap).

**Engine source note:** the exporters (FusionToolExportEngine/HyperMillToolExportEngine/MastercamToolExportEngine) are CAM-galaxy (kilo); romeo edited only NEW generator scripts feeding them (no exporter-engine edits), under operator cross-galaxy permission. kilo flagged on chat-bus.

**Commit-race (recurring):** index.lock contention hit ~4x this session (fleet busy). `git commit -- <pathspec>` (NOT bare) + `-m` BEFORE `--` (everything after `--` is pathspec -- `-m` after `--` = "pathspec '-m' did not match"). `git add` untracked files first (`git commit -- <untracked>` = "did not match any file known to git"). See [[feedback_check_inprogress_git_op_before_commit]].

Linked: [[reference_corpus_cutting_corpus_2026_06_14]] (the 118k x material x toolpath cutting accounting), [[reference_jm_by_machine_fleet_libraries_2026_06_15]] (JM 218-crib full atomicity), [[reference_cam_collision_sim_geometry_state_2026_06_15]].
