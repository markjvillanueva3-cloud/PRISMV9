---
type: "chat-session"
source: "claude-code-cli"
session_id: "58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd"
title: "Final per-file scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX. Read"
date: "2026-05-17"
first_ts: "2026-05-17T20:01:03.919Z"
last_ts: "2026-05-17T20:04:42.400Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 20
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-abc421d851e00f8fb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Final per-file scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX. Read

> **claude-code-cli** | 2026-05-17 | 55 msgs (20 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-abc421d851e00f8fb.jsonl`

## Transcript

### User | 2026-05-17T20:01:03.919Z

Final per-file scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX. Read all three files END-TO-END:

1. H:/prism/scripts/lib/viz-domain-coverage.mjs (new pure lib — computeDomainCoverage)
2. H:/prism/scripts/lib/viz-domain-coverage.test.mjs (new — 18 node:test cases, all passing)
3. H:/prism/scripts/generate-system-viz.mjs (EDITED — the L5 "Engine Domains" section ~line 299-336, the phantom-edge annotator ~line 989-1005, the phase-2 roadmap ~line 1030-1044, the `meta` object ~line 1063, and a new import ~line 32).

WHAT THE UNIT DID: replaced a hardcoded `domainsBuiltIn` array (24 domains with stale hand-edited engine counts) + a separate `unwiredDomains`/`otherCount` residual catchall in generate-system-viz.mjs with a single-source read of BUILD_STATE.COVERAGE_BY_DOMAIN.rows via the new lib. The viz L5 layer now renders the top-40 domains by engine count + 1 aggregated "Misc Domains" rest node, summing back to the BUILD_STATE total exactly.

VERIFIED EMPIRICALLY this session: `node --check` clean; regenerated system-graph.json has 41 L5 nodes, ZERO duplicate ids, meta.coverage={total:3274,wired:2545,unwired:729,pct:78} == BUILD_STATE.COVERAGE_BY_DOMAIN raw row sum; 18/18 tests pass.

A prior scrutiny round on files 1+2 flagged (now claimed fixed — VERIFY): (A1) total!=wired+unwired untested → test 14 added; (A2) explicit topN>=rowcount untested → test 13; (A3) duplicate domains untested → test 15; (B1) real domain "Other"→eng.other would collide with the legacy hardcoded eng.other catchall → the legacy catchall block was DELETED, lib rest bucket is `eng.miscdomains`; (B2) silent if(!exists)return → converted to t.skip().

Verify the three files END-TO-END. Confirm the prior findings are genuinely closed. Hunt for NEW issues:
- Did deleting the catchall block leave any dangling reference (domainsBuiltIn/unwiredDomains/allDomains/domainSum/totalEngines/otherCount)? Any downstream code that relied on those L5 node shapes?
- The L4→L5 edge heuristic (`dispatch
... [+386 chars truncated]

### Assistant | 2026-05-17T20:01:09.446Z

I'll perform a thorough end-to-end scrutiny of all three files.

### Assistant | 2026-05-17T20:01:09.878Z

[tool_use: Read]

### Assistant | 2026-05-17T20:01:10.090Z

[tool_use: Read]

### User | 2026-05-17T20:01:10.813Z

[tool_result] 1	/**
2	 * viz-domain-coverage.mjs — single-source engine-domain coverage for the
3	 * system-viz L5 layer.
4	 *
5	 * VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
6	 * --------------------------------------------------------------------------
7	 * generate-system-viz.mjs used to carry a hand-edited `domainsBuiltIn` array
8	 * of ~24 engine domains with HARDCODED engine counts. Those counts drifted
9	 * f
... [+5610 chars truncated]

### User | 2026-05-17T20:01:11.040Z

[tool_result] 1	/**
2	 * viz-domain-coverage.test.mjs — VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
3	 *
4	 * Enforces the single-source-of-truth contract between BUILD_STATE and the
5	 * system-viz L5 layer: every L5 domain node (top-N + the aggregated "rest"
6	 * bucket) must sum back to the canonical BUILD_STATE coverage figure — no
7	 * domain dropped, none double-counted.
8	 *
9	 * Run: node --test scripts/lib/v
... [+13301 chars truncated]

### Assistant | 2026-05-17T20:01:15.189Z

Now the main edited file. Let me read the relevant sections plus surrounding context to verify the dangling-reference concerns.

### Assistant | 2026-05-17T20:01:15.954Z

[tool_use: Read]

### Assistant | 2026-05-17T20:01:16.602Z

[tool_use: Read]

### User | 2026-05-17T20:01:17.149Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
4	 *
5	 * Layers (top→bottom):
6	 *   L0 Personas        — 5 user roles
7	 *   L1 Frontend        — 144 web pages clustered into functional groups + CLIs
8	 *   L2 Transport       — MCP / REST / gRPC / GraphQL / WS / auth / rate / telemetry
9	 *   L3 AI Hierarchy    — Tier-1 Claude / Tier-2 coordinator
... [+2690 chars truncated]

### User | 2026-05-17T20:01:17.755Z

[tool_result] 270	  { id: "ai.ollama.llama",     label: "Ollama: llama3.2",       info: "Local general LLM (offload)", color: "#a3e635", size: 0.9 },
271	  { id: "ai.ollama.embed",     label: "Ollama: embeddings",     info: "Vector search backbone", color: "#a3e635", size: 0.9 },
272	  { id: "ai.ollama.reflect",   label: "Ollama: reflection",     info: "Multi-pass self-critique", color: "#a3e635", size: 0.9 },

... [+6748 chars truncated]

### Assistant | 2026-05-17T20:01:21.780Z

Now the phantom-edge annotator, phase-2 roadmap, meta object, and the L4→L5 edge heuristic. Let me find those sections.

### Assistant | 2026-05-17T20:01:23.643Z

[tool_use: Grep]

### User | 2026-05-17T20:01:26.578Z

[tool_result] 302:// viz-domain-coverage lib — NOT a hand-edited array. The old `domainsBuiltIn`
312:const { top: l5Domains, rest: l5Rest, coverage: l5Coverage } =
318:    id: isRest ? "eng.miscdomains" : `eng.${d.domain.toLowerCase()}`,
338:for (const d of l5Domains) addEngineDomainNode(d);
339:if (l5Rest) addEngineDomainNode(l5Rest, { isRest: true });
858:function dispatcherToDomains(name) {
886:  const doms 
... [+494 chars truncated]

### Assistant | 2026-05-17T20:01:31.475Z

No dangling references to the deleted identifiers — `domainsBuiltIn` appears only in a comment, and `unwiredDomains`/`allDomains`/`domainSum`/`totalEngines`/`otherCount` have zero matches. Let me read the L4→L5 edge heuristic and the phantom-edge/phase-2/meta sections in full.

### Assistant | 2026-05-17T20:01:32.116Z

[tool_use: Read]

### User | 2026-05-17T20:01:33.637Z

[tool_result] 855	}
856	
857	// L4 -> L5 (dispatcher → engine domain — heuristic mapping)
858	function dispatcherToDomains(name) {
859	  const n = name.toLowerCase();
860	  const d = [];
861	  if (/mill/.test(n)) d.push("mill");
862	  if (/lathe|turning/.test(n)) d.push("lathe","turning");
863	  if (/cad/.test(n)) d.push("cad");
864	  if (/cam|toolpath/.test(n)) d.push("cam","toolpath","tool");
865	  if (/edm|w
... [+6210 chars truncated]

### Assistant | 2026-05-17T20:01:37.109Z

Now the rest of the phantom-edge annotator and phase-2 roadmap and meta section.

### Assistant | 2026-05-17T20:01:38.000Z

[tool_use: Read]

### User | 2026-05-17T20:01:39.452Z

[tool_result] 984	    }
985	  }
986	  return candidates.slice(0, 3);
987	}
988	
989	// Annotate each unwired L5 node with suggestions and emit "phantom" edges
990	const suggestionEdges = [];
991	for (const n of nodes.filter(x => x.layer === "L5" && x.subgroup === "unwired")) {
992	  const targets = suggestDispatchersForDomain(n.domain ?? n.label.split('\n')[0]);
993	  n.suggestedDispatchers = targets;
994	  // 
... [+5139 chars truncated]

### Assistant | 2026-05-17T20:01:43.640Z

Now let me verify the `built`/`unwired` headline variables are still computed elsewhere (the `meta.headline` uses `unwired` — confirm it's not the deleted variable) and check the L5 edge concern with actual BUILD_STATE domain names.

### Assistant | 2026-05-17T20:01:45.385Z

[tool_use: Grep]

### User | 2026-05-17T20:01:46.240Z

[tool_result] 107:const built = headline.built_engines ?? 2269;
108:const unwired = headline.needs_wiring ?? 898;
316:  const fullyWired = d.unwired === 0;

### Assistant | 2026-05-17T20:01:48.132Z

[tool_use: Bash]

### User | 2026-05-17T20:01:53.375Z

[tool_result] rowcount: 935
domains: Other, Lathe, Machine, Multi, Tool, Five, Shop, Outcome, Hyper, Fusion, Milling, Process, Turning, Wire, Wet, Swiss, Mastercam, Print, Okuma, Speed, Electrode, Mobile, Cross, Mill, Inventor, Session, Tribal, Unified, Consensus, Agent, Video, Qdrant, Build, Creo, Live, Business, Sensor, Sustain, Post, Advanced, Batch, Auto, Material, Physics, Knowledge, Master, Coolant, Pipel
... [+8174 chars truncated]

### Assistant | 2026-05-17T20:01:58.954Z

Now I can verify the critical L4→L5 edge concern. The `dispatcherToDomains` heuristic emits lowercase domain tokens like `mill`, `cad`, `cam`, `safety`, `wedm`. BUILD_STATE domains are capitalized first-words (`Mill`, `Cad`, `Cam`, `Wire`, `Safety`...). Let me check which heuristic domains actually survive into L5 top-40 vs the rest bucket.

### Assistant | 2026-05-17T20:02:05.129Z

[tool_use: Bash]

### User | 2026-05-17T20:02:10.417Z

[tool_result] L5 node count: 41
top-40 domains: Other, Lathe, Hyper, Cross, Tool, Post, Machine, Fusion, Milling, Multi, Mastercam, Turning, Mill, Adaptive, Print, Wire, Advanced, Solid, Batch, Context, Hook, Shop, Stochastic, Wet, Auto, Material, Surface, Five, Inventor, Okuma, Physics, Program, Session, Strategy, Thermal, Tribal, Knowledge, Toolpath, Blueprint, Laser
HEURISTIC RESOLVED (11): mill, lathe, turn
... [+201 chars truncated]

### Assistant | 2026-05-17T20:02:16.369Z

This confirms the prior round's B-type concern is **real and unaddressed**. The L4→L5 edge heuristic builds `eng.${dom}` IDs from lowercased tokens, but `nodes.find(n => n.id === ...)` silently drops 15 of 26 — including the entire semantic CAM/CAD/WEDM/safety cluster. Let me verify the actual edge impact: count L4→L5 edges generated, and confirm whether `cad`/`cam`/`wedm`/`safety` ever existed as L5 nodes before this change.

### Assistant | 2026-05-17T20:02:19.932Z

[tool_use: Bash]

### User | 2026-05-17T20:02:27.179Z

[tool_result] HEAD L5 domainsBuiltIn ids (0):

### Assistant | 2026-05-17T20:02:31.650Z

The regex didn't match (multiline array). Let me check the committed (pre-edit) version more directly.

### Assistant | 2026-05-17T20:02:32.980Z

[tool_use: Bash]

### User | 2026-05-17T20:02:39.971Z

[tool_result] 300:const domainsBuiltIn = [
326:const unwiredDomains = (buildState.NEEDS_WIRING?.top_domains ?? []).slice(0, 16);
328:  ...domainsBuiltIn,
329:  ...unwiredDomains.map(d => ({ domain: d.domain, count: d.count, status: "unwired" })),
348:const otherCount = Math.max(0, totalEngines - domainSum);
349:if (otherCount > 0) {
351:    id: "eng.other",
354:    label: `Other\n(${otherCount})`,
357:    size:
... [+156 chars truncated]

### Assistant | 2026-05-17T20:02:43.804Z

[tool_use: Bash]

### User | 2026-05-17T20:02:48.653Z

[tool_result] const domainsBuiltIn = [
  { domain: "Mill",        count: 240, status: "wired" },
  { domain: "WEDM",        count: 130, status: "wired" },
  { domain: "Cad",         count: 200, status: "wired" },
  { domain: "Cam",         count: 290, status: "wired" },
  { domain: "Safety",      count: 80,  status: "wired" },
  { domain: "AI",          count: 280, status: "wired" },
  { domain: "Quality",     
... [+1101 chars truncated]

### Assistant | 2026-05-17T20:02:54.599Z

This is the critical finding. The pre-edit `domainsBuiltIn` array contained `WEDM`, `Cad`, `Cam`, `Safety`, `AI`, `Quality`, `Cost`, `ERP`, `Memory`, `Probe`, `Forge`, `Inspect`, `Network`, `Calibration`, `Twin` — all with `eng.<lowercase>` ids that the L4→L5 `dispatcherToDomains` heuristic was designed to target. The new BUILD_STATE-derived domains use first-word-of-engine-name (`Wire` not `WEDM`, no `Cad`/`Cam`/`Safety` because those engines' names start differently). Let me quantify the actual edge loss and check the rendered graph.

### Assistant | 2026-05-17T20:02:58.344Z

[tool_use: Bash]

### User | 2026-05-17T20:03:02.296Z

[tool_result] L4->L5 edges in CURRENT generated graph: 26
L5 targets actually hit: eng.adaptive, eng.knowledge, eng.physics, eng.toolpath, eng.tool, eng.hook, eng.material, eng.mill, eng.session, eng.lathe, eng.turning
suggested_wire (phantom) edges: 39
meta.coverage: {"total":3274,"wired":2545,"unwired":729,"coverage_pct":78,"domains":935}
meta.totals: {"nodes":20617,"edges":77531,"layers":11}

### Assistant | 2026-05-17T20:03:08.754Z

Confirmed. The L4→L5 layer now resolves only 11 of 26 heuristic domains — **the dispatcher→engine-domain edges for cad, cam, wedm, safety, quality, cost, erp, memory, probe, calibration, ai, twin, forge, network, inspect silently vanished.** Visually, the dispatcher layer (L4) no longer connects to the CAD/CAM/WEDM/safety engine clusters at all. This is a real regression introduced by the change, and the test suite does not cover the integration script's edge generation.

Let me verify the remaining points: `meta.headline.unwired` correctness, the phantom-edge `n.unwired` semantics, and run the tests.

### Assistant | 2026-05-17T20:03:09.641Z

[tool_use: Bash]

### User | 2026-05-17T20:03:14.141Z

[tool_result] CHECK_OK
  ...
# Subtest: generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes
ok 18 - generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes
  ---
  duration_ms: 149.1464
  ...
1..18
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 244.94

### Assistant | 2026-05-17T20:03:19.674Z

All 18 tests pass. Now let me check `headline.needs_wiring` (line 108 `unwired`) vs the new `l5Coverage.unwired` — the meta object has BOTH `headline.unwired` (898) and `coverage.unwired` (729). Verify the phantom-edge annotator: it filters L5 nodes by `subgroup === "unwired"`, and `n.unwired` is the per-domain unwired count from BUILD_STATE rows. Let me check how BUILD_STATE rows define `unwired` to confirm the phase-2 backlog metric.

### Assistant | 2026-05-17T20:03:25.518Z

[tool_use: Bash]

### User | 2026-05-17T20:03:31.304Z

[tool_result] PARTIAL rows: [{"domain":"Other","total":605,"wired":474,"unwired":131,"coverage_pct":78,"sample_unwired":["AIMLFormulasEngine","AMSAAReliabilityGrowthEngine","AS9100TraceabilityEngine","cadLiveDispatch","CADScreenshotCapturer","CADToSTEPPipelineEngine"]},{"domain":"Lathe","total":188,"wired":106,"unwired":82,"coverage_pct":56,"sample_unwired":["LatheAdvancedOperationsEngine","LatheAIFeatureRegist
... [+1112 chars truncated]

### Assistant | 2026-05-17T20:03:40.155Z

The phantom-edge annotator and phase-2 roadmap logic are now correct: `n.unwired` is the per-domain unwired count, and `wireBacklog = n.unwired ?? n.count ?? 0` correctly uses the unwired count (the actual backlog) rather than total — that's a genuine improvement over the pre-edit code where `n.count` was the only field. Both fallbacks resolve since every L5 node carries `unwired`.

One observation on the rest bucket: it has `unwired:382` so the `MiscDomains` node gets `subgroup:"unwired"` and `status:"stub_heavy"` (382>50), and it WILL appear in the phantom-edge annotator and phase-2 roadmap. `suggestDispatchersForDomain("MiscDomains")` will return `[]` (no fallback key, no name match), so `n.unlocks = {engines:382, dispatchersGain:0, leverageScore:0}` — it produces zero phantom edges and sorts to the bottom of phase-2. Harmless but slightly odd (an aggregate bucket appearing as a "wire-up target"). Not a P0/P1.

Let me do a final verification of node-id uniqueness and the meta object integrity in the generated graph, and confirm no other file referenced the old L5 node shapes.

### Assistant | 2026-05-17T20:03:42.365Z

[tool_use: Bash]

### User | 2026-05-17T20:03:48.695Z

[tool_result] scripts/generate-galaxy-constituents.mjs
scripts/lib/viz-domain-coverage.mjs
---grep done---

### Assistant | 2026-05-17T20:03:52.874Z

A second downstream file references old L5 ids. Let me check `generate-galaxy-constituents.mjs`.

### Assistant | 2026-05-17T20:03:54.103Z

[tool_use: Bash]

### User | 2026-05-17T20:03:58.973Z

[tool_result] 8: *   1. L5 engine-domain rollups (eng.mill, eng.lathe, eng.cam, ...) →
29:const ENGINE_DIR = path.join(ROOT, "mcp-server", "src", "engines");
31:const MAX_MOLECULES_PER_NODE = 600;     // hard cap so even eng.other (562) fits
79:  // L5 domain rollup nodes: layer L5, id starts with eng., parent is null or
80:  // doesn't start with eng. (i.e. they're not children of another eng.X node).
82:    n
... [+1197 chars truncated]

### Assistant | 2026-05-17T20:04:03.301Z

Let me read `classifyEngine` and the L5-consuming logic in `generate-galaxy-constituents.mjs` more closely to assess whether the L5-shape change breaks it.

### Assistant | 2026-05-17T20:04:03.821Z

[tool_use: Read]

### User | 2026-05-17T20:04:05.010Z

[tool_result] 75	  return out;
76	}
77	
78	function loadGraphDomains(graph) {
79	  // L5 domain rollup nodes: layer L5, id starts with eng., parent is null or
80	  // doesn't start with eng. (i.e. they're not children of another eng.X node).
81	  const rollups = graph.nodes.filter(n =>
82	    n.layer === "L5" && n.id.startsWith("eng.")
83	    && (!n.parent || !n.parent.startsWith("eng."))
84	  );
85	  // Map a 
... [+2463 chars truncated]

### Assistant | 2026-05-17T20:04:42.400Z

This is interesting and relevant. `generate-galaxy-constituents.mjs` reads L5 nodes from the graph dynamically (`loadGraphDomains`) and classifies engines by `engineName.toLowerCase().startsWith(key)`. The new L5 domains derive from BUILD_STATE's `computeCoverageByDomain` which buckets engines by their **first word** — and `classifyEngine` here uses the same `startsWith` logic. So the new domain keys (`other`, `lathe`, `wire`, `mill`, `milling`...) are actually *better aligned* with this consumer's prefix-classification than the old hand-rolled `cad`/`cam`/`wedm` keys were. This consumer is NOT broken — if anything it's improved. Note the line-31 comment "even eng.other (562) fits" — `eng.other` still exists (now total 605), so that's fine.

But it confirms `eng.other` collision was a real hazard the unit correctly avoided by deleting the legacy catchall. Good.

Now I have everything. Let me finalize the verdict.

## Scrutiny Verdict: **FAIL**

One genuine P1 regression introduced by the change. Files 1 & 2 are clean; the prior findings on them are genuinely closed. The defect is in file 3 (`generate-system-viz.mjs`) — an integration-edge regression the test suite cannot catch because it only tests the pure lib.

---

### Prior findings — VERIFIED CLOSED
- **A1** (total≠wired+unwired): closed — `viz-domain-coverage.test.mjs:208-220` "counts pass through verbatim" genuinely asserts `coverage.total===10` against `wired:3,unwired:2`. Real R9 test, not a stub.
- **A2** (topN≥rowcount): closed — test:194-206 asserts `top.length===3, rest===null` with `topN=999`. Genuine.
- **A3** (duplicate domains): closed — test:222-233 asserts `coverage.domains===2`, no merge. Genuine.
- **B1** (`eng.other` id collision): closed — the legacy `domainsBuiltIn`/`unwiredDomains`/`otherCount` catchall block (HEAD lines 300-360) is fully deleted; rest bucket id is `eng.miscdomains` (line 318). Confirmed no dangling reference to any deleted identifier (`domainsBuiltIn` survives only in a com
... [+3826 chars truncated]
