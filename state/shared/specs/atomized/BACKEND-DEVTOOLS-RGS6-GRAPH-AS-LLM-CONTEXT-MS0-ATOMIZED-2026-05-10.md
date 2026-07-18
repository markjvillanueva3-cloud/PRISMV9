---
milestone: GRAPH-AS-LLM-CONTEXT-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
research_source: state/shared/research/2026-05-10-pass2-graph-as-llm-context.md
total_units: 8
critical_path_role: unblocks atomization viz_node_id resolution for every other milestone
loop_registrations: 1 (stale-graph cron)
date: 2026-05-10
---

# GRAPH-AS-LLM-CONTEXT-MS0 — atomized

> Make the live PRISM /system-viz (126,441 nodes / 11 layers) directly addressable as LLM context. Foundation for spatial-UI agent coordination + GraphRAG retrieval over PRISM substrate.

---

## U-GAC01 — Build `GraphContextLensEngine` (ego-graph extraction)

- pillar: graph
- tier: T1
- ai_priority_score: 80
- leverage_score: 13
- why: agents need scoped slices of the 126k-node graph (not the whole thing) — ego-graph around a target node is the canonical unit
- depends_on: []
- blocks: [U-GAC02, U-GAC04, U-GAC05]
- parallel_with: [U-VAULT01, U-HKA01]
- viz_node_id: `eng.knowledge.graphcontextlensengine` (TBD-create)
- closes_synergy_edge: system-viz × handoffs (currently "none" in synergy matrix)
- loop_schedule: none

verifies_via:
  channel: test
  tool: `npx vitest run mcp-server/src/__tests__/GraphContextLensEngine.test.ts`
  expected_signal: `7 passed`
  re_run_cost: 4s
  baseline: file does not exist yet

micro_steps:
  - step-1:
      tool: Bash
      path: `mcp-server/src/engines/`
      action: confirm engine doesn't already exist (duplication guard)
      verify: `ls mcp-server/src/engines/GraphContextLensEngine.ts 2>&1` → "No such file"
  - step-2:
      tool: Read
      path: `mcp-server/src/engines/KnowledgeGraphEngine.ts`
      action: read pattern reference (1-50 lines for class skeleton)
      verify: file readable, includes singleton export
  - step-3:
      tool: Write
      path: `mcp-server/src/engines/GraphContextLensEngine.ts`
      action: create engine — methods `extractEgoGraph(nodeId, hops)`, `extractByDomain(domain)`, `summarizeCommunity(nodes)`; reads `state/shared/system-viz/system-graph.json`
      verify: `ls mcp-server/src/engines/GraphContextLensEngine.ts` → exists
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/GraphContextLensEngine.test.ts`
      action: 7 test cases — happy (1-hop on known node), 2-hop, 3-hop, unknown node, empty graph (mock), oversized (1000+ hops), malformed system-graph.json
      verify: `npx vitest run GraphContextLensEngine` → 7 passed
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: add action `graph_context_lens_extract` with Zod schema + lazy import + call site
      verify: round-trip MCP `prism_ai:graph_context_lens_extract` returns 200
  - step-6:
      tool: Bash
      path: `mcp-server/`
      action: build verification
      verify: `npm run build:fast 2>&1 | tail -3` shows no TS errors

adversarial_cases:
  - circular reference in graph (cycle detection)
  - node_id with shell-special chars (`;`, `|`, `..`)
  - 100MB system-graph.json (memory exhaustion)

variability_axis:
  - 1-hop / 3-hop / 7-hop ego-graphs
  - L4 dispatcher / L5 engine / L11 file targets
  - JSON / Markdown / Mermaid output formats

failure_modes:
  - graph corrupted at read time → fall back to last-known-good cache at `state/shared/system-viz/system-graph.previous.json`
  - hop count > graph diameter → return reachable subset + warning
  - dispatcher schema mismatch → reject with 400 before engine call

---

## U-GAC02 — GraphRAG retrieval over wiki + system-graph

- pillar: graph
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: classic vector RAG fails on multi-hop manufacturing queries; GraphRAG (Edge et al. arXiv:2404.16130) outperforms by 30-50%
- depends_on: [U-GAC01]
- blocks: [U-GAC06]
- parallel_with: [U-GAC03, U-GAC04]
- viz_node_id: `eng.knowledge.graphragretrievalengine` (TBD-create)
- closes_synergy_edge: wiki × neural (currently "none")
- loop_schedule: none

verifies_via:
  channel: eval
  tool: `node scripts/graphrag-eval.mjs --queries=10`
  expected_signal: `recall@3 >= 0.7`
  re_run_cost: 30s
  baseline: vector-only RAG recall@3 ~ 0.5

micro_steps:
  - step-1:
      tool: Read
      path: `state/shared/research/2026-05-10-pass2-graph-as-llm-context.md`
      action: extract GraphRAG section (look for "Edge et al" reference)
      verify: section found, methodology clear
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/GraphRAGRetrievalEngine.ts`
      action: implement entity extraction + community detection + 1-hop expansion + LLM summarization
      verify: file exists, exports `graphRAGRetrievalEngine` singleton
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/GraphRAGRetrievalEngine.test.ts`
      action: 6 cases — happy (known entity), unknown entity, ambiguous (multiple matches), no neighbors, oversized result set, malformed wiki entry
      verify: 6 passed
  - step-4:
      tool: Write
      path: `scripts/graphrag-eval.mjs`
      action: 10 fixed eval queries with ground-truth top-3 answers
      verify: script runs; outputs recall@3 metric
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
      action: wire `graphrag_retrieve` action
      verify: round-trip MCP returns top-3 entities

adversarial_cases:
  - prompt injection in retrieved entity body
  - empty wiki (cold-start)

variability_axis:
  - manufacturing / AI-systems / dev-tools domains
  - 3 / 10 / 50 entity retrieval

failure_modes:
  - LLM summarization OOM → truncate + retry
  - entity ambiguity → return top-N with disambiguation prompt
  - wiki entry stale → flag freshness in result

---

## U-GAC03 — Code-graph projection for `mcp-server/src`

- pillar: graph
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: SWE-bench-style code agents perform better with ego-graph retrieval (RepoGraph ICLR 2025 +32.8%)
- depends_on: [U-GAC01]
- blocks: []
- parallel_with: [U-GAC02, U-GAC04]
- viz_node_id: `eng.system.codegraphprojectionengine` (TBD-create)
- closes_synergy_edge: engines × tribal (currently "none")
- loop_schedule: 24h (rebuild on source-tree change)

verifies_via:
  channel: integration
  tool: `node scripts/code-graph-projection.mjs --target=mcp-server/src/__tests__/SpecificCuttingEnergyEngine.test.ts`
  expected_signal: `nodes>=5,edges>=3,deps_resolved=true`
  re_run_cost: 8s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Bash
      path: `mcp-server/`
      action: enumerate existing TypeScript ASTs already cached
      verify: `ls mcp-server/data/state/*ast*.json 2>&1 | wc -l` (informational)
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/CodeGraphProjectionEngine.ts`
      action: parse `src/**/*.ts` via ts-morph, emit `{nodes:[{file,kind,symbol}],edges:[{from,to,kind}]}` JSON
      verify: engine exports singleton
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/CodeGraphProjectionEngine.test.ts`
      action: 5 tests — single file, multi-file deps, cyclic import, unparseable file, large file (>10k LOC)
      verify: 5 passed
  - step-4:
      tool: Write
      path: `scripts/code-graph-projection.mjs`
      action: CLI wrapper — `--target <path>` → JSON to stdout
      verify: script runs, outputs JSON
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: wire `code_graph_project` action
      verify: round-trip MCP returns valid graph

adversarial_cases:
  - syntactically invalid TS file
  - 50MB single source file

variability_axis:
  - single-file / package-level / project-level scope
  - top-level function / class / interface symbols

failure_modes:
  - ts-morph OOM on large project → fall back to per-file walk
  - dep cycle → record + continue, do not throw
  - missing file → warn + skip

---

## U-GAC04 — Dual-channel context (JSON + viz screenshot) for subagent dispatch

- pillar: graph
- tier: T1
- ai_priority_score: 68
- leverage_score: 11
- why: tldraw-style dual-channel pattern beats prose-only context for multi-agent coordination (per 2025 X-post evidence)
- depends_on: [U-GAC01]
- blocks: []
- parallel_with: [U-GAC02, U-GAC03]
- viz_node_id: `eng.system.dualchannelcontextengine` (TBD-create)
- closes_synergy_edge: system-viz × subagents (currently "none")
- loop_schedule: none

verifies_via:
  channel: integration
  tool: spawn subagent with JSON + PNG attached → check it references both
  expected_signal: subagent output mentions both `node-id:` and visual layer
  re_run_cost: 60s
  baseline: nonexistent

micro_steps:
  - step-1:
      tool: Bash
      path: `state/shared/system-viz/`
      action: check if headless screenshot tool available (puppeteer / chromium)
      verify: `which chromium 2>&1 || npx puppeteer --version 2>&1` returns version
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/DualChannelContextEngine.ts`
      action: methods `attachJsonContext(subagentPrompt, nodeId)`, `attachVizScreenshot(subagentPrompt, layerFilter)`
      verify: file exists
  - step-3:
      tool: Write
      path: `scripts/render-viz-screenshot.mjs`
      action: headless chromium → PNG of viz with layer filter applied
      verify: PNG file produced, > 5KB
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/DualChannelContextEngine.test.ts`
      action: 5 tests — happy, missing screenshot tool, oversized PNG, malformed nodeId, layer filter with no matches
      verify: 5 passed
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
      action: add `dual_channel_dispatch` action
      verify: round-trip MCP

adversarial_cases:
  - subagent prompt contains screenshot-of-screenshot recursion
  - PNG with embedded malicious payload

variability_axis:
  - JSON-only / PNG-only / both (3 modes)
  - layer-filter: L0 / L4 / L11

failure_modes:
  - chromium unavailable → MD-text fallback
  - PNG > 10MB → downscale + warn
  - subagent rejects binary → flatten to base64 data URI

---

## U-GAC05 — Spatial-UI agent coordination (locked viz coordinates as shared address space)

- pillar: graph
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: when N agents share a fixed spatial layout, coordination collapses from O(N²) text exchange to O(1) node-id mention
- depends_on: [U-GAC01, U-GAC04]
- blocks: []
- parallel_with: [U-GAC06]
- viz_node_id: `eng.coordination.spatialaddressbookengine` (TBD-create)
- closes_synergy_edge: handoffs × system-viz (currently "none")
- loop_schedule: none

verifies_via:
  channel: integration
  tool: 2 agents dispatched with same viz, coordinate via node-id → check no text-overlap
  expected_signal: both agents reference same `node-id` without paraphrase drift
  re_run_cost: 90s
  baseline: text-only coordination has ~30% paraphrase drift

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/SpatialAddressBookEngine.ts`
      action: lock-list of canonical node-ids; method `resolveAlias(text) → node-id`
      verify: file exists
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/SpatialAddressBookEngine.test.ts`
      action: 5 tests — exact match, fuzzy match, ambiguous, unknown, malformed
      verify: 5 passed
  - step-3:
      tool: Edit
      path: `.claude/hooks/agent-handoff-canonicalize.mjs`
      action: NEW hook — rewrite handoff text to use canonical node-ids
      verify: hook tested via stdin → JSON
  - step-4:
      tool: Edit
      path: `.claude/settings.json`
      action: wire new hook on UserPromptSubmit
      verify: `node H:/prism/.claude/hooks/agent-handoff-canonicalize.mjs <<< '{}'` returns valid JSON

adversarial_cases:
  - 2 chats canonicalize same alias to different IDs (race)
  - node deleted while alias still cached

variability_axis:
  - 2 / 6 / 12 concurrent agents
  - L4 / L5 / L8 target layer

failure_modes:
  - alias ambiguous → return all candidates + ask user
  - cache stale → trigger graph re-read
  - node renamed → fall back to fuzzy match

---

## U-GAC06 — Community-summary generator over engine clusters

- pillar: graph
- tier: T1
- ai_priority_score: 55
- leverage_score: 10
- why: 3,181 engines is too many to enumerate; community summaries collapse clusters to <200 tokens each
- depends_on: [U-GAC02]
- blocks: []
- parallel_with: [U-GAC05, U-GAC07, U-GAC08]
- viz_node_id: `eng.knowledge.communitysummaryengine` (TBD-create)
- closes_synergy_edge: engines × wiki (already auto, this reinforces)
- loop_schedule: 7d (regenerate weekly)

verifies_via:
  channel: metric
  tool: `node scripts/community-summary-gen.mjs --domain=Lathe`
  expected_signal: output token count ∈ [100, 300]
  re_run_cost: 15s
  baseline: full engine list = ~8000 tokens

micro_steps:
  - step-1:
      tool: Bash
      path: `mcp-server/data/docs/`
      action: confirm ENGINE_DIGEST.md exists with domain groupings
      verify: `grep -c '^## ' mcp-server/data/docs/ENGINE_DIGEST.md` > 10
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/CommunitySummaryEngine.ts`
      action: cluster engines by domain → call Ollama qwen for ≤200-token summary per cluster
      verify: file exists
  - step-3:
      tool: Write
      path: `scripts/community-summary-gen.mjs`
      action: CLI wrapper writing to `state/shared/community-summaries.json`
      verify: script runs, JSON valid
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/CommunitySummaryEngine.test.ts`
      action: 5 tests — happy, empty cluster, Ollama unreachable, oversized cluster, token-cap exceeded
      verify: 5 passed

adversarial_cases:
  - Ollama returns empty string
  - 1000-engine single cluster

variability_axis:
  - Lathe / Mill / WEDM / AI / Other (5 domains)
  - 5 / 20 / 100 engines per cluster

failure_modes:
  - Ollama offline → fall back to Claude (cost-aware, max 5 invocations)
  - summary >300 tokens → truncate + warn
  - cluster name collision → suffix with index

---

## U-GAC07 — Stale-graph detector (mtime + hash blocker)

- pillar: graph
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: agents using stale viz make wrong decisions; >6h staleness blocks
- depends_on: [U-GAC01]
- blocks: []
- parallel_with: [U-GAC06, U-GAC08]
- viz_node_id: `core.hooks.stalegraphguard` (TBD-create hook)
- closes_synergy_edge: hooks × system-viz (currently manual)
- loop_schedule: 1h (cron check)

verifies_via:
  channel: integration
  tool: `touch -t 202001010000 state/shared/system-viz/system-graph.json && node .claude/hooks/stale-graph-guard.mjs <<< '{"tool_name":"system_viz_query"}'`
  expected_signal: stdout includes `"decision":"deny"`
  re_run_cost: 1s
  baseline: no guard exists

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/stale-graph-guard.mjs`
      action: PreToolUse hook — if `system-graph.json` mtime > 6h, return `{decision:"deny",reason:"stale graph"}`
      verify: hook fires correctly with mocked old mtime
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook for system-viz-query matcher
      verify: `cat .claude/settings.json | jq '.hooks.PreToolUse[]|select(.matcher|contains("system_viz"))'` non-empty
  - step-3:
      tool: Bash
      path: `state/shared/system-viz/`
      action: install cron — every 1h check + auto-regen if stale
      verify: cron entry persists in `.claude/cron-registry.json`

adversarial_cases:
  - mtime in the future
  - file deleted entirely

variability_axis:
  - 1h / 6h / 24h threshold
  - graceful-degrade / hard-block modes

failure_modes:
  - clock skew → use file hash as secondary signal
  - regen mid-query → retry once after regen completes

---

## U-GAC08 — Hallucinated-node-id guard

- pillar: graph
- tier: T1
- ai_priority_score: 48
- leverage_score: 9
- why: agents emit fictional node-ids when context is incomplete; guard catches before action
- depends_on: [U-GAC01]
- blocks: []
- parallel_with: [U-GAC06, U-GAC07]
- viz_node_id: `core.hooks.hallucinatednodeidguard` (TBD-create hook)
- closes_synergy_edge: hooks × system-viz
- loop_schedule: none

verifies_via:
  channel: test
  tool: `node .claude/hooks/hallucinated-node-id-guard.mjs <<< '{"tool_name":"Bash","tool_input":{"command":"echo fake.node.id"}}'`
  expected_signal: exit code 2 + stderr `unknown node-id`
  re_run_cost: 0.5s
  baseline: no guard

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/hooks/hallucinated-node-id-guard.mjs`
      action: load `system-graph.json` node-id set on startup, scan tool input for `eng.*`, `disp.*`, `core.*` patterns, deny if any not in set
      verify: hook runs with fake id → exit 2
  - step-2:
      tool: Edit
      path: `.claude/settings.json`
      action: register on PreToolUse for all Bash/Edit/Write events
      verify: settings parse clean
  - step-3:
      tool: Write
      path: `.claude/hooks/__tests__/hallucinated-node-id-guard.test.mjs`
      action: 5 tests — known id passes, unknown fails, no ids in input passes, malformed pattern handled, oversized input
      verify: 5 passed

adversarial_cases:
  - node-id with regex-special chars
  - 1000 node-ids in single tool call

variability_axis:
  - L4 / L5 / L8 / L11 layer patterns
  - happy / unknown / mixed inputs

failure_modes:
  - id-set load slow → cache for 5min
  - false-positive on legitimate new node → soft-warn mode
  - graph regen mid-check → reload + retry

---

## §X — Closing notes

**Critical-path observation:** U-GAC01 is the entry. Everything else fans out. Build U-GAC01 first, then U-GAC02/U-GAC03/U-GAC04 in parallel.

**Cron registration to add at milestone close:** `CronCreate "7 * * * *"` for U-GAC07 stale-graph check (off-minute).

**Synergy edges closed by this milestone:** 6 of the 56 "none" edges in `system-synergy-map.mjs` output (system-viz × handoffs, wiki × neural, engines × tribal, system-viz × subagents, handoffs × system-viz, hooks × system-viz).
