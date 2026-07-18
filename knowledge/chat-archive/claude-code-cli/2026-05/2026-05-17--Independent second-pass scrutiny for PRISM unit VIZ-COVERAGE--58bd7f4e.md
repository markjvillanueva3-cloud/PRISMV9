---
type: "chat-session"
source: "claude-code-cli"
session_id: "58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd"
title: "Independent second-pass scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-"
date: "2026-05-17"
first_ts: "2026-05-17T20:01:15.562Z"
last_ts: "2026-05-17T20:07:15.024Z"
cwd: "H:\\prism"
messages: 68
user_msgs: 25
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-a1cf9e6bf96002bee.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent second-pass scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-

> **claude-code-cli** | 2026-05-17 | 68 msgs (25 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd/subagents/agent-a1cf9e6bf96002bee.jsonl`

## Transcript

### User | 2026-05-17T20:01:15.562Z

Independent second-pass scrutiny for PRISM unit VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX. Do NOT assume the other reviewer caught everything. Read all three files END-TO-END:

1. H:/prism/scripts/lib/viz-domain-coverage.mjs (new pure lib)
2. H:/prism/scripts/lib/viz-domain-coverage.test.mjs (new — 18 node:test cases)
3. H:/prism/scripts/generate-system-viz.mjs (EDITED — L5 section, phantom-edge annotator, phase-2 roadmap, `meta` object, new import)

CONTEXT: the unit replaced a hardcoded `domainsBuiltIn` array (stale hand-edited engine counts) in the system-viz L5 layer with a single-source read of BUILD_STATE.COVERAGE_BY_DOMAIN.rows. Regenerated graph verified: 41 L5 nodes, no dup ids, meta.coverage matches BUILD_STATE exactly, 18/18 tests pass.

You earlier returned FAIL on files 1+2 because the real BUILD_STATE domain "Other" → node id `eng.other` would collide with a legacy hardcoded `eng.other` catchall. That legacy block has now been DELETED in file 3. Verify that resolution is real and complete.

Weight your review toward what a correctness reviewer misses:
- INTEGRATION/COUPLING: With the legacy block gone, is the L5 layer's downstream (L4→L5 edges, L5→L6 edges, phantom suggestion edges, phase-2 roadmap, the summary HTML render) still correct? Did any consumer assume specific L5 node ids or the OLD shape (count = unwired-only count vs new count = total)?
- REGRESSION: the old L5 had semantic domains (Cad, Cam, WEDM, Safety, AI). New L5 uses BUILD_STATE's first-capword-prefix taxonomy (Other, Lathe, Hyper, Cross...). Is losing the semantic domains an acceptable, documented trade-off, or a silent quality regression that should be surfaced?
- CONVENTION: does the edit match surrounding generate-system-viz.mjs idiom/style?
- TEST INTEGRITY: are the 18 tests genuine intent checks? Is the new test 18 (reads generated system-graph.json) meaningfully strong, and does its t.skip path stay honest?
- Stale hardcoded numbers ANYWHERE else in the touched regions (the unit's w
... [+236 chars truncated]

### Assistant | 2026-05-17T20:01:21.032Z

I'll review all three files end-to-end for this unit.

### Assistant | 2026-05-17T20:01:21.436Z

[tool_use: Read]

### Assistant | 2026-05-17T20:01:21.709Z

[tool_use: Read]

### User | 2026-05-17T20:01:21.948Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-domain-coverage.mjs' was already read 12s ago in this session and is unchanged (mtime 1779047629475). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-17T20:01:22.588Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\viz-domain-coverage.test.mjs' was already read 12s ago in this session and is unchanged (mtime 1779048028870). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T20:01:26.871Z

The read-once guard says these files are already in context, but I don't actually see their content in my context. Let me bypass the cache to do a genuine review.

### Assistant | 2026-05-17T20:01:27.720Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:01:28.486Z

[tool_use: Bash]

### User | 2026-05-17T20:01:34.490Z

[tool_result] /**
 * viz-domain-coverage.mjs — single-source engine-domain coverage for the
 * system-viz L5 layer.
 *
 * VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
 * --------------------------------------------------------------------------
 * generate-system-viz.mjs used to carry a hand-edited `domainsBuiltIn` array
 * of ~24 engine domains with HARDCODED engine counts. Those counts drifted
 * from reality — the 
... [+5153 chars truncated]

### User | 2026-05-17T20:01:39.339Z

[tool_result] /**
 * viz-domain-coverage.test.mjs — VIZ-COVERAGE-MS0 / U-VIZ-COVERAGE-FIX
 *
 * Enforces the single-source-of-truth contract between BUILD_STATE and the
 * system-viz L5 layer: every L5 domain node (top-N + the aggregated "rest"
 * bucket) must sum back to the canonical BUILD_STATE coverage figure — no
 * domain dropped, none double-counted.
 *
 * Run: node --test scripts/lib/viz-domain-coverage
... [+12108 chars truncated]

### Assistant | 2026-05-17T20:01:43.840Z

Now the critical file — the edited generator. Let me read it fully.

### Assistant | 2026-05-17T20:01:44.755Z

[tool_use: Bash]

### User | 2026-05-17T20:01:49.853Z

[tool_result] 1251

### Assistant | 2026-05-17T20:02:00.513Z

[tool_use: Bash]

### User | 2026-05-17T20:02:05.384Z

[tool_result] <persisted-output>
Output too large (73.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--PRISM\58bd7f4e-dac4-40e6-995e-d2cfdbc2cfdd\tool-results\bt1uv5pri.txt

Preview (first 2KB):
   1 │ #!/usr/bin/env node
   2 │ /**
   3 │  * generate-system-viz.mjs — atomic 10-layer PRISM system snapshot
   4 │  *
   5 │  * Layers (top→bottom):
   6 │  *   L0 Personas        — 5 user roles
   7 │
... [+1807 chars truncated]

### Assistant | 2026-05-17T20:02:08.572Z

The output was saved to a file. Let me read the relevant L5 section and surrounding consumer regions directly.

### Assistant | 2026-05-17T20:02:10.547Z

[tool_use: Bash]

### User | 2026-05-17T20:02:14.428Z

[tool_result] 10: *   L4 Dispatchers     — every dispatcher.ts as its own node (~97)
11: *   L5 Engine Domains  — top 40 engine clusters by count (wired + unwired)
12: *   L6 Cores           — algorithms / schemas / physics constants / migrations
32:import { computeDomainCoverage } from "./lib/viz-domain-coverage.mjs";
86:const stateSharedFiles = safeListDir(path.join(ROOT, "state", "shared"), ".md").length;
93
... [+7168 chars truncated]

### Assistant | 2026-05-17T20:02:18.775Z

Now let me read the key regions in detail — the L5 generation block, the L4→L5 mapping, the L5→L6 edges, the phantom annotator, and the phase-2 roadmap.

### Assistant | 2026-05-17T20:02:20.383Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:02:21.076Z

[tool_use: Bash]

### User | 2026-05-17T20:02:28.518Z

[tool_result] // ---------- L4 Dispatchers — every file ----------
const dispatcherCatCount = { manufacturing:0, ai_intel:0, system:0, business:0, knowledge:0, other:0 };
const dispatcherNodes = [];
for (const f of dispatcherFiles.sort()) {
  if (f.includes(".test.") || f === "CLAUDE.md") continue;
  const cat = dispatcherCategory(f);
  dispatcherCatCount[cat]++;
  const id = `disp.${f.replace(".ts","").toLower
... [+4449 chars truncated]

### User | 2026-05-17T20:02:37.911Z

[tool_result]   addEdge("ai.t2.coordinator", `ai.t3.${t3}`, "delegate", "active", 0.6);
}
// Ollama models receive offloaded work from Claude
for (const o of ["qwen","llama","embed","reflect"]) {
  addEdge("ai.t1.claude", `ai.ollama.${o}`, "offload", "active", 0.4);
}

// L3 -> L4 (each Tier-3 specialist routes to its dispatcher cluster)
const t3map = {
  mill:    ["disp.milldispatcher","disp.machininggkbdispat
... [+3119 chars truncated]

### Assistant | 2026-05-17T20:02:41.858Z

This is the critical integration finding. Let me look at the phantom annotator and roadmap blocks, and confirm what BUILD_STATE's actual domain names are.

### Assistant | 2026-05-17T20:02:43.591Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:02:46.180Z

[tool_use: Bash]

### User | 2026-05-17T20:02:47.905Z

[tool_result] // ---------- WIRING SUGGESTIONS for unwired engine domains ----------
// For each unwired domain, propose 1-3 dispatcher candidates by name pattern.
function suggestDispatchersForDomain(domain) {
  const d = domain.toLowerCase();
  const candidates = [];
  for (const dispNode of dispatcherNodes) {
    const dn = dispNode.id.replace("disp.","").toLowerCase();
    if (dn.includes(d) || d.includes(d
... [+5534 chars truncated]

### User | 2026-05-17T20:02:53.210Z

[tool_result] rows: 935
all domains: Other, Lathe, Machine, Multi, Tool, Five, Shop, Outcome, Hyper, Fusion, Milling, Process, Turning, Wire, Wet, Swiss, Mastercam, Print, Okuma, Speed, Electrode, Mobile, Cross, Mill, Inventor, Session, Tribal, Unified, Consensus, Agent, Video, Qdrant, Build, Creo, Live, Business, Sensor, Sustain, Post, Advanced, Batch, Auto, Material, Physics, Knowledge, Master, Coolant, Pipel
... [+8165 chars truncated]

### Assistant | 2026-05-17T20:03:01.351Z

A critical finding is emerging. BUILD_STATE.COVERAGE_BY_DOMAIN has **935 rows** (the first-capword-prefix taxonomy), and the legacy hardcoded `domainsBuiltIn` used **semantic** domain ids like `eng.mill`, `eng.cad`, `eng.cam`, `eng.wedm`, `eng.safety`. Let me verify exactly which `eng.*` ids the L4→L5 and phantom blocks reference, and which ones now actually exist as L5 nodes.

### Assistant | 2026-05-17T20:03:07.487Z

[tool_use: Bash]

### User | 2026-05-17T20:03:11.468Z

[tool_result] Exit code 1
file:///H:/prism/[eval1]:2
const fs=require("fs");
         ^

ReferenceError: require is not defined in ES module scope, you can use import instead
    at file:///H:/prism/[eval1]:2:10
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:217:26)
    at async ModuleLoader.eval (node:int
... [+137 chars truncated]

### Assistant | 2026-05-17T20:03:20.715Z

[tool_use: Bash]

### User | 2026-05-17T20:03:24.746Z

[tool_result] L5 node count: 41
L5 ids: eng.adaptive, eng.advanced, eng.auto, eng.batch, eng.blueprint, eng.context, eng.cross, eng.five, eng.fusion, eng.hook, eng.hyper, eng.inventor, eng.knowledge, eng.laser, eng.lathe, eng.machine, eng.mastercam, eng.material, eng.mill, eng.milling, eng.miscdomains, eng.multi, eng.okuma, eng.other, eng.physics, eng.post, eng.print, eng.program, eng.session, eng.shop, eng.sol
... [+896 chars truncated]

### Assistant | 2026-05-17T20:03:29.274Z

Confirmed. This is the central P1. The taxonomy change broke the L4→L5 edge mapping. Let me check the magnitude of the regression — how many L4→L5 edges existed before vs now, by examining git history and the t3map.

### Assistant | 2026-05-17T20:03:31.419Z

[tool_use: Bash]

### User | 2026-05-17T20:03:35.362Z

[tool_result] c1e7c6d065 [MAIN] [OBSIDIAN-INTELLIGENCE-MS3]/G2: agent-status overlay for system-viz
387d385d1b [OBSIDIAN-INTELLIGENCE-MS3]/C1-U-HTML-OUTPUT-MODE: --html flag on 3 generators + shared render lib
e37cb66515 [SLOT-WORKTREE-MS0]/U-VIZ-WORKTREE-MAP-EXT: archive-history ghost nodes in /system-viz L9
36b353f54b [MAIN] [SLOT-WORKTREE-MS0]/U-VIZ-WORKTREE-MAP: map all git worktrees into /system-viz as a l
... [+249 chars truncated]

### Assistant | 2026-05-17T20:03:39.466Z

The current edit isn't yet committed (HEAD still has `domainsBuiltIn`). Let me see the full pre-edit L5 block to compare semantic domains, and confirm the legacy `eng.other` block.

### Assistant | 2026-05-17T20:03:40.055Z

[tool_use: Bash]

### User | 2026-05-17T20:03:44.949Z

[tool_result] const domainsBuiltIn = [
  { domain: "Mill",        count: 240, status: "wired" },
  { domain: "WEDM",        count: 130, status: "wired" },
  { domain: "Cad",         count: 200, status: "wired" },
  { domain: "Cam",         count: 290, status: "wired" },
  { domain: "Safety",      count: 80,  status: "wired" },
  { domain: "AI",          count: 280, status: "wired" },
  { domain: "Quality",     
... [+2322 chars truncated]

### Assistant | 2026-05-17T20:03:50.198Z

Now I have the full picture. The legacy block had `eng.cad`, `eng.cam`, `eng.wedm`, `eng.safety`, `eng.ai`, `eng.quality`, `eng.cost`, `eng.erp`, `eng.memory`, `eng.probe`, `eng.forge`, `eng.inspect`, `eng.network`, `eng.calibration`, `eng.twin` — and the legacy `eng.other` catchall. Let me verify the new L5 set against the t3map references and check whether the regenerated graph actually shows the dead edges.

### Assistant | 2026-05-17T20:03:58.215Z

[tool_use: Bash]

### User | 2026-05-17T20:04:04.307Z

[tool_result] L5 nodes in generated graph: 41
L4->L5 lazy_import edges present: 26
dangling eng.* refs in edges: (none)
meta.coverage: {"total":3274,"wired":2545,"unwired":729,"coverage_pct":78,"domains":935}
unwired L5 nodes: 32 eng.other,eng.lathe,eng.hyper,eng.cross,eng.tool,eng.post,eng.machine,eng.fusion,eng.milling,eng.multi,eng.mastercam,eng.turning,eng.mill,eng.print,eng.wire,eng.advanced,eng.batch,eng.
... [+276 chars truncated]

### Assistant | 2026-05-17T20:04:08.959Z

No *dangling* edges (the `addEdge`/`nodes.find` guard prevents broken edges from being emitted — dead targets are simply skipped, not left dangling). So this is a **silent edge loss**, not a corruption. The graph is internally consistent. Let me quantify the L4→L5 edge loss and verify the phase-2 reason string is not stale.

### Assistant | 2026-05-17T20:04:18.751Z

[tool_use: Bash]

### User | 2026-05-17T20:04:41.665Z

[tool_result] L4->L5 edges that resolved with OLD ids: 43
L4->L5 edges that resolve with NEW ids: 26
LOST L4->L5 edges: 17

### Assistant | 2026-05-17T20:04:48.376Z

Quantified: **17 of 43 L4→L5 dispatcher-to-engine-domain edges are silently lost** because the new BUILD_STATE taxonomy has no `eng.cad`, `eng.cam`, `eng.wedm`, `eng.safety`, `eng.ai`, `eng.quality`, `eng.cost`, `eng.erp`, `eng.memory`, `eng.probe`, `eng.forge`, `eng.inspect`, `eng.network`, `eng.calibration`, `eng.twin` nodes. The CAD/CAM/WEDM/Safety dispatcher clusters are now disconnected from the engine layer in the viz.

Let me check the remaining touched regions — the meta object end, the summary HTML render, and confirm the test file's claims.

### Assistant | 2026-05-17T20:04:49.708Z

[tool_use: Bash]

### User | 2026-05-17T20:04:56.416Z

[tool_result]   worktrees: worktreeSummary,
  roadmap,
};
const layers = [
  { id: "L0", name: "User Personas",      y:  9.0, color: "#fde68a" },
  { id: "L1", name: "Frontend",           y:  7.0, color: "#7dd3fc" },
  { id: "L2", name: "Transport / API",    y:  5.0, color: "#a78bfa" },
  { id: "L3", name: "AI Hierarchy",       y:  3.0, color: "#22d3ee" },
  { id: "L4", name: "Dispatchers (97)",   y:  1.0, colo
... [+5529 chars truncated]

### Assistant | 2026-05-17T20:05:00.654Z

Now let me check the `unwired`/`built` headline variables and whether they still tie to `l5Coverage`, plus verify the `meta.headline` vs `meta.coverage` consistency.

### Assistant | 2026-05-17T20:05:02.610Z

[tool_use: Bash]

### User | 2026-05-17T20:05:06.206Z

[tool_result] 107:const built = headline.built_engines ?? 2269;
108:const unwired = headline.needs_wiring ?? 898;
109:const pendingFE = headline.needs_frontend_merge_count ?? 2;
110:const drift = headline.drift_milestones ?? 3;
134:  return n || (headline.built_with_wiki ?? 774);
136:const wikiEntries = countArchitectureWikiEntries();

### Assistant | 2026-05-17T20:05:11.243Z

Important consistency point: `meta.headline.built` = `2269` (or `headline.built_engines`) while `meta.coverage.wired` = `2545`, `meta.coverage.total` = `3274`, and `counts.engines` = `3173`. The phase-2 reason now reads `729 unwired = 22%` but the headline card still says "Engines unwired" = `unwired` (`headline.needs_wiring`, likely `898`). Let me verify this divergence and run the tests.

### Assistant | 2026-05-17T20:05:15.311Z

[tool_use: Bash]

### User | 2026-05-17T20:05:20.594Z

[tool_result] headline: {"built":2543,"unwired":729,"pendingFE":2,"drift":175,"wikiEntries":23981}
coverage: {"total":3274,"wired":2545,"unwired":729,"coverage_pct":78,"domains":935}
counts.engines: 3273

DIVERGENCE CHECK -- three different built-engine figures the viz now shows:
  meta.headline.built  = 2543
  meta.coverage.wired  = 2545
  meta.counts.engines  = 3273 (vs coverage.total 3274)
  meta.headline.un
... [+38 chars truncated]

### Assistant | 2026-05-17T20:05:27.702Z

Good — the divergence is small (built 2543 vs coverage.wired 2545; engines 3273 vs total 3274) and `headline.unwired` (729) now agrees with `coverage.unwired` (729). The off-by-2/off-by-1 comes from different counting sources but is not a regression introduced by this unit. The `built`/`unwired` values come from `headline.*` in BUILD_STATE — those are separate fields. This is acceptable (pre-existing minor source skew), though worth a P2 note.

Now let me run the tests and check for the magic-number issue in the phase-2 reason and phase-4 reason.

### Assistant | 2026-05-17T20:05:28.442Z

[tool_use: Bash]

### User | 2026-05-17T20:05:34.591Z

[tool_result]   ...
# Subtest: real BUILD_STATE: L5 nodes sum back to the COVERAGE_BY_DOMAIN total
ok 17 - real BUILD_STATE: L5 nodes sum back to the COVERAGE_BY_DOMAIN total
  ---
  duration_ms: 2.9985
  ...
# Subtest: generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes
ok 18 - generated system-graph.json: meta.coverage matches BUILD_STATE + L5 nodes
  ---
  duration_ms: 197.6662
  ...
1.
... [+102 chars truncated]

### Assistant | 2026-05-17T20:05:38.453Z

18/18 pass. Now let me check the phase-4 reason string (the unit's whole point is killing stale hardcoded numbers) and verify line 1056.

### Assistant | 2026-05-17T20:05:39.572Z

[tool_use: Bash]

### User | 2026-05-17T20:05:46.102Z

[tool_result] 303:// block carried hardcoded engine counts that drifted from BUILD_STATE, so the
1033:      reason: `${l5Coverage.unwired} unwired engines = ${100 - l5Coverage.coverage_pct}% of code orphaned. Wiring is cheap, capability gain is huge.`,
1056:      reason: "Don't add new engines/pages while 28% of existing engines are unwired. YAGNI.",

### Assistant | 2026-05-17T20:05:58.579Z

Found a P1 finding the first reviewer (and the unit author) missed. **Line 1056** — the phase-4 roadmap `reason` still hardcodes **"28% of existing engines are unwired"**. The phase-2 reason was correctly templatized to `${100 - l5Coverage.coverage_pct}%` (now renders 22%), but phase-4 left a stale hardcoded `28%` literal. The unit's stated purpose is "killing stale hardcoded coverage numbers" — and `28% ≠ 22%`. This is exactly the class of bug the unit exists to eliminate, sitting 23 lines below the line that was fixed.

Let me verify the test-18 t.skip honesty and check whether there's any error-budget gap when COVERAGE_BY_DOMAIN is missing.

### Assistant | 2026-05-17T20:06:02.974Z

[tool_use: Bash]

### User | 2026-05-17T20:06:10.169Z

[tool_result] MISSING COVERAGE_BY_DOMAIN -> top: 0 rest: null coverage: {"total":0,"wired":0,"unwired":0,"coverage_pct":0,"domains":0}
phase2 reason would render: 0 unwired engines = 100% of code orphaned

### Assistant | 2026-05-17T20:06:20.989Z

Confirmed P1 fail-loud gap. If `BUILD_STATE.COVERAGE_BY_DOMAIN` is missing or empty (a stale/partial BUILD_STATE.json — entirely plausible on a fresh checkout or after a `build-state-snapshot.mjs` schema change), the generator:
- Emits **zero L5 nodes** — the entire engine-domains layer vanishes silently
- `meta.coverage` becomes `{total:0, wired:0, unwired:0, coverage_pct:0}`
- The phase-2 roadmap reason renders the **alarming-but-false "0 unwired engines = 100% of code orphaned"**
- The HTML headline "Engines built" still shows the real `built/counts.engines` from `headline.*`, so the viz simultaneously claims engines are built AND that the coverage layer is empty

The generator never fails loud on a missing single-source input. The lib's graceful zeroing (correct for the lib in isolation) becomes a silent whole-layer drop at the call site. The old code had `counts.engines || 3173` and `NEEDS_WIRING?.top_domains` as a fallback path that at least produced *some* L5 nodes; the new code has no guard at the `generate-system-viz.mjs` call site. Karpathy R12 — "fail loud" — is violated: a missing canonical input produces a plausible-looking but empty graph instead of an error.

Let me do a final check on the convention/idiom and the test-18 strength.

### Assistant | 2026-05-17T20:06:22.314Z

[tool_use: Bash]

### User | 2026-05-17T20:06:33.511Z

[tool_result] 51:function safeReadJson(p, fb = null) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
63:const buildState = safeReadJson(path.join(ROOT, "state", "shared", "BUILD_STATE.json")) ?? {};
106:const headline = buildState.headline ?? {};
313:  computeDomainCoverage(buildState.COVERAGE_BY_DOMAIN?.rows ?? []);
688:const recallState = safeReadJson(path.join(ROOT, "mcp-serve
... [+149 chars truncated]

### Assistant | 2026-05-17T20:07:15.024Z

I have everything I need. The generator's whole-file convention IS "best-effort, no fail-loud" (`safeReadJson` swallows errors everywhere), so a missing `COVERAGE_BY_DOMAIN` producing an empty layer is *consistent with surrounding idiom* — but for a designated **single-source-of-truth** input that the unit explicitly elevates, silent zeroing is still a regression vs the old fallback path. I'll grade this as P1 (surface it) rather than P0.

---

## Independent Second-Pass Scrutiny — VIZ-COVERAGE-MS0/U-VIZ-COVERAGE-FIX

**GRADE: FAIL**

The `eng.other` collision you flagged earlier IS genuinely and completely resolved — the legacy `domainsBuiltIn` array, the `unwiredDomains`/`allDomains` block, and the hand-rolled `eng.other` catchall (`git show HEAD` lines 300-360) are all deleted; the new code emits exactly 41 unique L5 ids, no `eng.other` collision, 18/18 tests pass, no dangling edges in the regenerated graph. The lib itself (files 1+2) is clean. **But the resolution introduced a real, unflagged integration regression in file 3.**

### P0 — none

### P1 (must fix before ship)

**P1-A — 17 of 43 L4→L5 edges silently lost (INTEGRATION REGRESSION, undocumented).**
The old `domainsBuiltIn` carried *semantic* domain ids: `eng.cad`, `eng.cam`, `eng.wedm`, `eng.safety`, `eng.ai`, `eng.quality`, `eng.cost`, `eng.erp`, `eng.memory`, `eng.probe`, `eng.forge`, `eng.inspect`, `eng.network`, `eng.calibration`, `eng.twin`. The new BUILD_STATE first-capword taxonomy has **none of those 15** (it has `eng.wire` not `eng.wedm`, no `eng.cad`/`eng.cam`/`eng.safety` at all). Two downstream consumers at lines 857-891 (`dispatcherToDomains`) and 991 (`suggestDispatchersForDomain`) still target the OLD ids. Measured: L4→L5 `lazy_import` edges resolve 43→26 — **17 edges dropped**. The CAD, CAM, WEDM, Safety, Quality, Cost dispatcher clusters are now visually disconnected from the engine-domain layer. No edge *dangles* (the `nodes.find(...)` guard at L888 silently skips dead targets — so it
... [+4764 chars truncated]
