# BRIDGE VERIFICATION — 5 Live MCP Tests (Section 0.75.4)

Generated: 2026-05-02. All queries executed against live MCP server. Latency captured at the harness level (single tool round-trip).

## TEST 1 — `prism_product:sfc_calculate`
- **Query**: `{material:"AISI 4140",tool_diameter_mm:12,flutes:4,operation:"pocket_roughing"}`
- **Response excerpt**: `{"blocked":true,"blocker":"pre-machine-completeness-gate","reason":"INCOMPLETE MACHINE DATA: Critical machine fields missing: spindle.max_rpm, spindle.power"}`
- **Retry with machine_id+spindle params**: STILL BLOCKED with same error (gate ignores inline override)
- **Tribal sources cited**: NO (request never reached compute path; gate fires first)
- **Latency**: ~80ms (gate-only)
- **Bridge fired**: NO — `pre-machine-completeness-gate` short-circuits before `tribalKnowledgeEngine.search()` at line 3163 can run
- **Verdict**: FAIL — bridge is wired but unreachable from default action invocation. Real users hit the gate, never see tribal tips.

## TEST 2 — `prism_cam:post_line_by_line`
- **Query**: `{controller:"hurco_winmax",material:"AISI 4140",operation:"finishing"}`
- **Response excerpt**: `(no output)` — empty response object
- **Tribal sources cited**: NO
- **Playbook rules cited**: NO
- **Latency**: ~120ms
- **Bridge fired**: NO — dispatcher line 8594 calls `eng.optimize(params)` directly with NO tribal/playbook injection. Confirmed by source inspection: zero `tribal*` or `playbook*` references in this case branch.
- **Verdict**: FAIL — `post_line_by_line` is a pure mechanical optimizer; the 38-stage `PostProcessorPipelineEngine` (which DOES inject playbook+tribal at stages 5.2 / 5.3) is a different code path not reached by this action.

## TEST 3 — `prism_ai:ai_milling_deep_reason`
- **Query** (after schema fix): `{query:"adaptive roughing in Inconel 718 Ø10 endmill 30mm DOC variation", context:{material:"Inconel 718", tool:"endmill", operation:"adaptive_roughing"}}`
- **Response excerpt**:
  ```
  step 2: "Found 0 relevant evidence items. Sources: ."
  conclusion: "Unable to determine"
  caveats: ["No customer context — some tribal knowledge may not apply"]
  physics_validation: {kienzle_check:true, taylor_check:true, deflection_check:true}
  ```
- **Tribal sources cited**: NO — explicitly "0 relevant evidence items"
- **Latency**: ~340ms
- **Bridge fired**: YES (the evidence-retrieval step ran) — but returned EMPTY for a query about a material (Inconel 718) and operation (adaptive_roughing) that should have hundreds of matching tips in the 7,250-tip store
- **Verdict**: FAIL (the worst kind: bridge-fired-but-empty). Reasoning chain references "tribal knowledge" in caveats but the actual retrieval step finds zero hits, indicating the AI engine queries a different (likely empty) index than `cad-engine/knowledge_store/`.

## TEST 4 — `prism_cam:cam_strategy_recommend`
- **Query**: `{feature:"deep_pocket",material_iso_group:"S",cam_system:"fusion360"}`
- **Response excerpt**: `(no output)` — empty
- **Tribal sources cited**: NO
- **`cam_tribal_lookup` consulted**: NO
- **Latency**: ~95ms
- **Bridge fired**: NO — confirmed by source inspection (camDispatcher.ts line 2024-2034): the case branch is `runHyperMillSafetyChecks` → `hmStrategy.recommend(params)`. There is no call to `cam_tribal_lookup`, `camTribalRAGEngine`, or `tribalKnowledgeEngine` anywhere in this branch.
- **Verdict**: FAIL — flagship CAM strategy recommender does NOT consult tribal store despite both `cam_tribal_lookup` and `cam_rag_retrieve` actions existing in the same dispatcher.

## TEST 5 — `prism_cad:dfm_check`
- **Query** (initial): `{feature_set:"thin_wall_aluminum"}` → `{pass:true,summary:{total_features:0,errors:0,warnings:0,infos:0}}`
- **Retry with concrete feature**: `{features:[{type:"thin_wall",material:"aluminum_6061",thickness_mm:0.8,height_mm:25}]}` → `{pass:true,summary:{total_features:1,errors:0,warnings:0,infos:0}}`
- **Tribal manufacturability rules cited**: NO — 0 errors/warnings/infos for a 0.8mm thin wall × 25mm tall aluminum (aspect ratio 31:1) which any DFM rulebook would flag
- **Latency**: ~70ms
- **Bridge fired**: NO — dispatcher line 258-262 calls `dfm.checkDfMRules(params)` only. No tribal lookup. The fact that a clearly-bad geometry passes silently means even the rule-corpus isn't engaging properly, but tribal augmentation is definitely not wired.
- **Verdict**: FAIL — both the rule engine and any tribal manufacturability augmentation are silent.

## SUMMARY (5/5 tests fail or return empty)
| Test | Action | Bridge Fired | Cited Tribal | Verdict |
|---|---|---|---|---|
| 1 | sfc_calculate | NO (gate blocks) | NO | FAIL |
| 2 | post_line_by_line | NO | NO | FAIL |
| 3 | ai_milling_deep_reason | YES (empty hits) | NO | FAIL (silent-rot exemplar) |
| 4 | cam_strategy_recommend | NO | NO | FAIL |
| 5 | dfm_check | NO | NO | FAIL |

**0/5 tests cited tribal sources from the 7,250-tip ingested corpus.** This confirms Mark's hypothesis: ingestion is heavily populated, but consumer-side bridges are predominantly broken or never-wired.
