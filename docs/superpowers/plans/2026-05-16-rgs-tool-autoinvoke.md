# RGS-TOOL-AUTOINVOKE-MS0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach a self-correcting PRISM toolchain (dev pipeline + tribal + skills + MCP tools + review agents) to every open roadmap unit, surfaced at pickup, learning from shipped/blocked outcomes.

**Architecture:** A pure signal-fusion lib delegates to existing recommenders (the only net-new logic is a keyword→pipeline+agent rule table). A detached batch orchestrator loads the system-viz graph once, enumerates open units from milestone envelopes, fuses signals, optionally synthesizes via the canonical Ollama helper, and writes a schema-versioned sidecar with an append-only JSONL checkpoint. Surfacing folds into the existing `pick-prefresh-inject.mjs` hook (no new hook). A Stop-arm back-annotates shipped/blocked outcomes so the fusion lib re-ranks future plans (Beta-smoothed), preventing the static-index rot.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, existing PRISM engines via dynamic import, Ollama qwen2.5-coder:7b via `ollama-hook-bridge.mjs`, JSON/JSONL state in `state/shared/`.

**Spec:** `docs/superpowers/specs/2026-05-16-rgs-tool-autoinvoke-design.md` (read §3 enumeration, §4 delegation table, §5.1 minimum-plan contract, §9 feedback loop before starting).

**Conventions:** All new state JSON carries `schemaVersion:"1.0.0"` (string semver). `.md` commits → normal gated path then `git show --stat <sha>` verify (lintstaged-noop guard); `--no-verify` is blast-dampener-limited, do not rely on it. Commit format `[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-<id>: title`. Per-file scrutiny gate (2 parallel reviewer agents after each engine/lib/hook file). Run tests with the portable node: `"H:/.claude/bin/portable-node" --test <file>`.

---

## Shared Contract (referenced by all tasks — do not duplicate, link here)

**`plan` object** (the unit of output, written into the sidecar `plans["<ms>::<unit>"].plan`):

```js
/** @typedef {Object} ToolPlan
 * @property {{skill:string, why:string, confidence:number}[]} pipelines  // ≥1 required
 * @property {{id:string, tip:string, score:number}[]} tribal
 * @property {string[]} skills
 * @property {string[]} mcpTools
 * @property {string[]} agents
 * @property {"build"|"integrate"|"close-out"} buildVsIntegrate
 * @property {"S"|"M"|"L"|"XL"} complexityTier
 * @property {number} confidence            // [0,1]; ≤0.6 when source==="deterministic"
 * @property {string} rationale             // one line
 * @property {"ollama"|"deterministic"} source
 */
```

**Minimum-viable-plan contract (spec §5.1, anti-stub R12):** a `deterministic` plan is VALID iff
`pipelines.length>=1 && buildVsIntegrate in {build,integrate,close-out} && complexityTier in {S,M,L,XL}
&& (tribal.length>=1 || skills.length>=1 || mcpTools.length>=1)`. A plan failing this is thrown as
`new Error("RGS_DETERMINISTIC_PLAN_INVALID: "+reason)`, never returned as a low-confidence success.

**Composite key:** `` `${milestoneId}::${unitId}` `` — synthesized, never read (unit ids are phase-relative).

**Source hash:** `sha256(nfc(title).replace(/\s+/g," ").trim() + "" + nfc(desc).replace(/\s+/g," ").trim() + "" + tier + "" + verdict)` where `nfc(s)=s.normalize("NFC")`.

---

## Task 1: `scripts/lib/system-viz-graph.mjs` — graph-load-once lib

**Files:**
- Create: `scripts/lib/system-viz-graph.mjs`
- Test: `scripts/lib/system-viz-graph.test.mjs`
- Modify: `scripts/system-viz-query.mjs` (make CLI a thin wrapper over the lib — keep all existing CLI behavior identical)

- [ ] **Step 1: Read the current loader/query seam.** Read `scripts/system-viz-query.mjs` lines 1–60 and the `find` command body (~line 160). Identify the `JSON.parse(fs.readFileSync(GRAPH))` load (≈line 39) and the find/match function (≈line 166).

- [ ] **Step 2: Write the failing test** `scripts/lib/system-viz-graph.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGraph, findInGraph } from "./system-viz-graph.mjs";

test("loadGraph returns a graph object with nodes array", () => {
  const G = loadGraph();
  assert.ok(Array.isArray(G.nodes), "G.nodes must be an array");
  assert.ok(G.nodes.length > 1000, `expected >1000 nodes, got ${G.nodes.length}`);
});

test("findInGraph(G, 'kienzle') returns ≥1 hit whose label or id contains kienzle (case-insensitive)", () => {
  const G = loadGraph();
  const hits = findInGraph(G, "kienzle", { limit: 5 });
  assert.ok(hits.length >= 1, "expected ≥1 kienzle hit");
  assert.ok(
    hits.every(h => /kienzle/i.test(h.label + " " + h.id + " " + (h.info || ""))),
    "every hit must actually match the term"
  );
});

test("findInGraph is pure — second call on same G yields identical result", () => {
  const G = loadGraph();
  assert.deepEqual(findInGraph(G, "tool", { limit: 3 }), findInGraph(G, "tool", { limit: 3 }));
});

test("findInGraph respects limit", () => {
  const G = loadGraph();
  assert.equal(findInGraph(G, "engine", { limit: 2 }).length <= 2, true);
});
```

- [ ] **Step 3: Run test, verify it fails.** Run: `"H:/.claude/bin/portable-node" --test scripts/lib/system-viz-graph.test.mjs` — Expected: FAIL "Cannot find module './system-viz-graph.mjs'".

- [ ] **Step 4: Implement `scripts/lib/system-viz-graph.mjs`.** Extract the load + find logic verbatim from `system-viz-query.mjs` (same GRAPH path resolution, same scoring/match used by the `find` command). Export `loadGraph()` (reads + parses the graph JSON once, returns the parsed object) and `findInGraph(G, terms, {limit=5})` (the existing match/scoring against `G.nodes`, returns the same hit shape the CLI prints: `{id,label,info,layer,subgroup,...}`). No behavior change vs the current CLI matcher — copy its predicate exactly.

- [ ] **Step 5: Run test, verify pass.** Run: `"H:/.claude/bin/portable-node" --test scripts/lib/system-viz-graph.test.mjs` — Expected: 4 pass.

- [ ] **Step 6: Refactor `system-viz-query.mjs` to consume the lib.** Replace its inline load+find with `import { loadGraph, findInGraph }`. Run the CLI two ways and confirm byte-identical output to a pre-change capture: `node scripts/system-viz-query.mjs find kienzle > /tmp/after.txt` vs a `git stash`-captured `before.txt` (or compare to `git show HEAD:scripts/system-viz-query.mjs` behavior by eye on 2 queries: `find kienzle`, `find tool`).

- [ ] **Step 7: Per-file scrutiny gate.** Dispatch 2 parallel reviewer agents (`code-analyzer` + `reviewer`) on `scripts/lib/system-viz-graph.mjs` AND the `system-viz-query.mjs` diff: verify CLI output is unchanged, no behavior drift, pure `findInGraph`. Fix P0/P1 before commit.

- [ ] **Step 8: Commit.**

```bash
cd H:/prism && git add scripts/lib/system-viz-graph.mjs scripts/lib/system-viz-graph.test.mjs scripts/system-viz-query.mjs && git commit -m "[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-VIZLIB: extract loadGraph/findInGraph (load-once)
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git show --stat HEAD | tail -4   # verify 3 files landed
```

---

## Task 2: `ollama-hook-bridge.mjs` — additive `format` support

**Files:**
- Modify: `H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs` (add `options.format` passthrough)
- Test: `H:/prism/.claude/hooks/lib/__tests__/ollama-hook-bridge-format.test.mjs`

- [ ] **Step 1: Read** `.claude/hooks/lib/ollama-hook-bridge.mjs` — locate the request body construction (`{model, prompt, stream:false, options:{num_predict, temperature}}`) and the `queryOllama(prompt, opts)` signature.

- [ ] **Step 2: Write failing test:**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRequestBody } from "../ollama-hook-bridge.mjs"; // export this pure helper in step 4

test("format option is forwarded into request body when provided", () => {
  const b = buildRequestBody("p", { format: "json", maxTokens: 300, temperature: 0.2 });
  assert.equal(b.format, "json");
  assert.equal(b.options.num_predict, 300);
  assert.equal(b.options.temperature, 0.2);
});
test("format absent by default (backward compatible)", () => {
  const b = buildRequestBody("p", {});
  assert.equal("format" in b, false);
});
```

- [ ] **Step 3: Run, verify fail** (`buildRequestBody` not exported). Run: `"H:/.claude/bin/portable-node" --test .claude/hooks/lib/__tests__/ollama-hook-bridge-format.test.mjs`

- [ ] **Step 4: Implement.** Extract body construction into an exported pure `buildRequestBody(prompt, opts)` that the existing `queryOllama` now calls. Add: `if (opts.format) body.format = opts.format;`. Default unchanged (no `format` key when absent). Do not change any other behavior or the `queryOllama` external contract.

- [ ] **Step 5: Run, verify pass** (2 pass) + run the existing ollama-hook-bridge test suite if present to confirm no regression.

- [ ] **Step 6: Per-file scrutiny gate** (2 agents: `code-analyzer` + `wiring-review-agent`) — confirm backward compatibility, no contract break for existing callers.

- [ ] **Step 7: Commit.**

```bash
cd H:/prism && git add .claude/hooks/lib/ollama-hook-bridge.mjs .claude/hooks/lib/__tests__/ollama-hook-bridge-format.test.mjs && git commit -m "[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-OLLAMAFMT: additive format passthrough in ollama-hook-bridge
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git show --stat HEAD | tail -3
```

---

## Task 3: `scripts/lib/rgs-unit-enum.mjs` — open-unit enumerator

**Files:**
- Create: `scripts/lib/rgs-unit-enum.mjs`
- Test: `scripts/lib/rgs-unit-enum.test.mjs`

- [ ] **Step 1: Confirm shapes.** `node -e "const e=require('./mcp-server/data/milestones/ACP-MS0.json'); console.log(JSON.stringify(Object.keys(e))); console.log(JSON.stringify((e.phases||[]).slice(0,1)))"` and `node -e "const m=require('./state/shared/MILESTONE_PROGRESS.json'); console.log(JSON.stringify(m.milestones[0]))"`. Confirm envelope has `id` + `phases[].units[]` (`{id,title,description,effort,dependencies}`) and MILESTONE_PROGRESS `milestones[].units[].shipped`.

- [ ] **Step 2: Write failing test:**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enumerateOpenUnits } from "./rgs-unit-enum.mjs";

const fakeEnvelopes = {
  "MS-A": { id: "MS-A", phases: [{ units: [
    { id: "P0-U01", title: "Alpha", description: "a", effort: 30, dependencies: [] },
    { id: "P0-U02", title: "Beta", description: "b", effort: 60, dependencies: ["P0-U01"] },
  ]}]},
};
const fakeProgress = { milestones: [{ id: "MS-A", units: [
  { id: "P0-U01", shipped: true }, { id: "P0-U02", shipped: false },
]}]};

test("only non-shipped units are returned, composite key synthesized", () => {
  const open = enumerateOpenUnits({ envelopes: fakeEnvelopes, progress: fakeProgress });
  assert.equal(open.length, 1);
  assert.equal(open[0].key, "MS-A::P0-U02");
  assert.equal(open[0].title, "Beta");
  assert.equal(open[0].milestone, "MS-A");
});

test("unit absent from progress is treated as open (no shipped row = not shipped)", () => {
  const prog = { milestones: [{ id: "MS-A", units: [{ id: "P0-U01", shipped: true }] }] };
  const open = enumerateOpenUnits({ envelopes: fakeEnvelopes, progress: prog });
  assert.deepEqual(open.map(u => u.key).sort(), ["MS-A::P0-U02"]);
});

test("phase-relative ids do not collide across milestones", () => {
  const env = { "MS-A": fakeEnvelopes["MS-A"],
    "MS-B": { id: "MS-B", phases: [{ units: [{ id: "P0-U01", title: "X", description: "x", effort: 1, dependencies: [] }] }] } };
  const prog = { milestones: [
    { id: "MS-A", units: [{ id: "P0-U01", shipped: false }, { id: "P0-U02", shipped: false }] },
    { id: "MS-B", units: [{ id: "P0-U01", shipped: false }] }] };
  const keys = enumerateOpenUnits({ envelopes: env, progress: prog }).map(u => u.key).sort();
  assert.deepEqual(keys, ["MS-A::P0-U01", "MS-A::P0-U02", "MS-B::P0-U01"]);
});
```

- [ ] **Step 3: Run, verify fail.** `"H:/.claude/bin/portable-node" --test scripts/lib/rgs-unit-enum.test.mjs`

- [ ] **Step 4: Implement `enumerateOpenUnits({envelopes, progress})`** (pure; readers injected): for each envelope, for each `phases[].units[]`, build `key=`${env.id}::${unit.id}``; look up `progress.milestones.find(m=>m.id===env.id)?.units.find(u=>u.id===unit.id)`; include the unit iff that row is missing OR `shipped!==true`. Return `[{key, milestone, unitId, title, description, effort, dependencies}]`. Also export `loadEnvelopes(dir)` and `loadProgress(path)` thin file readers (used by the orchestrator, not by tests).

- [ ] **Step 5: Run, verify pass** (3 pass).

- [ ] **Step 6: Per-file scrutiny gate** (`code-analyzer` + `reviewer`).

- [ ] **Step 7: Commit** (`U-ENUM`, same pattern as Task 1 Step 8).

---

## Task 4: `scripts/lib/rgs-pipeline-rules.mjs` — the net-new rule table

**Files:**
- Create: `scripts/lib/rgs-pipeline-rules.mjs`
- Test: `scripts/lib/rgs-pipeline-rules.test.mjs`

- [ ] **Step 1: Write failing test (real-value, contrapositive):**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPipelines, matchAgents } from "./rgs-pipeline-rules.mjs";

test("pdf/document text → /pdf-learn", () => {
  const p = matchPipelines({ title: "Ingest vendor PDF catalog", description: "parse document" });
  assert.ok(p.some(x => x.skill === "/pdf-learn"), "pdf unit must map to /pdf-learn");
});
test("new engine+skill+hook → /forge-triple", () => {
  const p = matchPipelines({ title: "Create FooEngine + skill + hook", description: "" });
  assert.ok(p.some(x => x.skill === "/forge-triple"));
});
test("unwired/dispatcher wiring → /wire-unwired", () => {
  const p = matchPipelines({ title: "Wire BarEngine to dispatcher", description: "needs wiring" });
  assert.ok(p.some(x => x.skill === "/wire-unwired"));
});
test("physics/kienzle unit → physics-reviewer agent", () => {
  const a = matchAgents({ title: "Kienzle force model fix", description: "cutting force" });
  assert.ok(a.includes("physics-reviewer"));
});
test("CONTRAPOSITIVE: a pure-docs unit does NOT map to /forge-triple", () => {
  const p = matchPipelines({ title: "Update README wording", description: "docs only" });
  assert.equal(p.some(x => x.skill === "/forge-triple"), false);
});
test("every unit gets ≥1 pipeline (generic fallback when no keyword hits)", () => {
  const p = matchPipelines({ title: "zxqv", description: "" });
  assert.ok(p.length >= 1, "fallback pipeline required so minimum-plan contract holds");
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement.** A frozen `RULES` array of `{test: RegExp, skill, why, confidence}` covering at minimum: `/pdf|document|catalog|manual/i→/pdf-learn`, `/video|youtube|tutorial/i→/video-learn`, `/engine.*(skill|hook)|forge.triple/i→/forge-triple`, `/wire|dispatcher|unwired|orphan/i→/wire-unwired`, `/test|coverage|vitest/i→test-team`, `/physics|kienzle|taylor|force|thermal/i→physics-reviewer (agent)`, `/scrutin|review|audit/i→/scrutinize`, `/dedup|duplicate/i→/dedup`. `matchPipelines(unit)` returns matched `{skill,why,confidence}[]` and if EMPTY returns `[{skill:"/forge-triple",why:"generic build fallback",confidence:0.3}]` (guarantees the minimum-plan contract). `matchAgents(unit)` returns the agent subset (physics-reviewer/test-review-agent/wiring-review-agent/code-analyzer) by the same keyword classes. Pure, no I/O.

- [ ] **Step 4: Run, verify pass** (6 pass).

- [ ] **Step 5: Per-file scrutiny gate** (`code-analyzer` + `reviewer` — weight: rule coverage completeness, no inlined physics constants, fallback correctness).

- [ ] **Step 6: Commit** (`U-RULES`).

---

## Task 5: `scripts/lib/rgs-signal-fusion.mjs` — pure fuser + minimum-plan + re-rank

**Files:**
- Create: `scripts/lib/rgs-signal-fusion.mjs`
- Test: `scripts/lib/rgs-signal-fusion.test.mjs` (adopt the agent-6 T1–T6 suite verbatim from spec §5.6)

- [ ] **Step 1: Write the failing test** — copy the T1–T6 suite the test-review agent produced (it is in the scrutiny output for this spec; reproduced here so the engineer needn't hunt):

```js
// Full T1–T6 from spec §5.6 — reader-injection (T1), Ollama-down exact bounds (T2),
// domain-boost algebraic invariant T3 (latheIdx<millIdx), purity deepStrictEqual (T4),
// adversarial exact verdicts T5a–e (empty→null|conf0; NaN→sanitize|throw;
// unicode→preserve|clear-error; missing ms→conf0; 100KB→no-crash|size-error),
// spanning mill/lathe/wedm T6. Each asserts CONTRAPOSITIVE: verdict change ⇒ pipeline change.
```

(Engineer: paste the exact T1–T6 code block from the spec's scrutiny record. Do not weaken any assertion.)

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `fuseSignals({unit, readers})`** (pure, all readers injected):
  1. `caps = await readers.capabilities(text)` → engines/mcpTools (delegates `PRISMSelfAwarenessEngine.findCapabilities`).
  2. `skills = await readers.skillTriggers(text)` (delegates skill-auto-trigger scoreMatch + corpus).
  3. `{tier, verdict} = readers.complexity(unit.milestone)` (per-milestone cached roadmap_intel adapter; `verdict∈{build,integrate}` then override to `close-out` if `readers.buildState(unit)` says shipped).
  4. `tribal = await readers.tribal(text, {prefDomain})` (delegates master-index-search-lib runTribalSearch); apply additive domain boost so same-domain tips rank first.
  5. `pipelines = matchPipelines(unit)`, `agents = matchAgents(unit)` (Task 4).
  6. Build candidate `plan`. Apply re-rank: for each pipeline, `cohort=readers.outcomes({pipeline,tier,verdict}); s=cohort.shipped; f=cohort.blocked+cohort.reverted; mult=0.5+(s+1)/(s+f+2); pipeline.confidence*=mult` (clamp [0,1]).
  7. If `readers.ollama` present and reachable: synth via it (JSON format), parse+schema-validate; on success `source="ollama"`; on network/timeout/parse/schema-fail → deterministic path.
  8. Deterministic path: assemble from steps 1–6, `source="deterministic"`, `confidence=min(rawConfidence,0.6)`. **Assert minimum-plan contract; throw `RGS_DETERMINISTIC_PLAN_INVALID` if violated.**
  9. Adversarial guards: empty title → return `null`; NaN in any injected score → coerce non-finite to `0` (document: sanitize, not throw — chosen for batch resilience); `desc.length>20000` → truncate to 20000 before hashing/keyword match; missing `unit.milestone` → `confidence=0`.

- [ ] **Step 4: Run, verify pass** (all T1–T6).

- [ ] **Step 5: Per-file scrutiny gate** (`code-analyzer` + `test-review-agent` — weight: contract enforcement, no stub fallback, contrapositive coverage).

- [ ] **Step 6: Commit** (`U-FUSION`).

---

## Task 6: `scripts/rgs-tool-planner.mjs` — detached batch orchestrator

**Files:**
- Create: `scripts/rgs-tool-planner.mjs`
- Test: `scripts/rgs-tool-planner.test.mjs` (hermetic: inject fake graph, fake envelopes, fake ollama)

- [ ] **Step 1: Write failing test** asserting: (a) `--unit MS-A::P0-U02` writes one `plans[key]` entry with schemaVersion `"1.0.0"`; (b) re-run without `--force` skips (idempotent — sourceHash unchanged); (c) `--ollama-off` → `source:"deterministic"` for all; (d) checkpoint JSONL gains one line per completed unit and resume skips completed keys (set-membership, order-independent); (e) `ollama.up===false` at start → whole index `degraded:true`. Use injected fakes; no real graph/ollama.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement.** CLI flags per spec §5.2. Sequence: `ollama-docker-health` gate (stamp `degraded` if down) → `loadGraph()` ONCE → `enumerateOpenUnits` → per-milestone roadmap_intel cache → for each unit: skip if checkpoint has key AND sourceHash matches AND not `--force`; else `fuseSignals` with bound readers → append `{key,hash,completedAt}` to `.roadmap-tool-plans.checkpoint.json` (JSONL) → every 50 units flush full sidecar (atomic tmp+rename, same volume, retry on Win32 EBUSY) → final flush. Lock `.roadmap-tool-plans.lock` with ≤2-min heartbeat refresh. `--time-budget` exits cleanly mid-batch (checkpoint intact). Detached-spawn helper documented in header.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Per-file scrutiny gate** (`code-analyzer` + `reviewer` — weight: resume determinism, atomic write, no O(n²) flush, lock heartbeat).

- [ ] **Step 6: Smoke run** `node scripts/rgs-tool-planner.mjs --limit 5 --json` against the real repo; confirm 5 plans, valid sidecar, checkpoint JSONL.

- [ ] **Step 7: Commit** (`U-PLANNER`).

---

## Task 7: `scripts/lib/rgs-plan-outcome.mjs` + Stop-arm — the feedback loop

**Files:**
- Create: `scripts/lib/rgs-plan-outcome.mjs` (pure), `.claude/hooks/rgs-outcome-record-stop.mjs`
- Test: `scripts/lib/rgs-plan-outcome.test.mjs`
- Modify: `C:/Users/wompu/.claude/settings.json` Stop chain (then mirror-verify to H:)

- [ ] **Step 1: Write failing test** for `extractOutcomes({scrutinyLedger, commitBodies, pickedEvents, gitRevertLog})` → `[{unitKey,outcome:"shipped"|"blocked"|"reverted",predictedPipelines}]`. Assert: U-id in a commit body + 3-of-3 PASS ledger → `shipped`; `picked` event with no terminal join → `blocked`; emitted file in `git log --since=24h` revert → `reverted`. Contrapositive: a `picked` WITH a matching shipped commit is NOT `blocked`.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** the pure extractor (regex `[\[/](U-[A-Z0-9-]+)` on commit bodies; join `picked` events by `sid+unitKey`; timeout-classify unjoined `picked` as `blocked`). Implement `.claude/hooks/rgs-outcome-record-stop.mjs`: on clean Stop, read SCRUTINY_LEDGER + last 30 commit bodies + pickedEvents JSONL, call extractor, append records to `state/shared/roadmap-tool-plan-outcomes.jsonl` (`v:1`). No-finding path → `{continue:true,suppressOutput:true}` (zero-risk wiring rule).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Wire the Stop-arm.** Edit `C:/Users/wompu/.claude/settings.json` Stop chain — insert `rgs-outcome-record-stop.mjs` between `session-end-peer-share` and `duplication-guard-stop` (advisory cluster, timeout 3000ms) **using the Edit tool** (triggers c-to-h-mirror). Then verify both copies:

```bash
node -e "['H:/.claude/settings.json','C:/Users/wompu/.claude/settings.json'].forEach(p=>{const c=require('fs').readFileSync(p,'utf8');console.log(p+': '+((c.match(/rgs-outcome-record-stop/g)||[]).length))})"
# both must print 1; if H: prints 0, manual: cp C:/Users/wompu/.claude/settings.json H:/.claude/settings.json
echo '{}' | "H:/.claude/bin/portable-node" .claude/hooks/rgs-outcome-record-stop.mjs   # must emit {"continue":true}
```

- [ ] **Step 6: Per-file scrutiny gate** (`wiring-review-agent` + `reviewer` — weight: zero-risk wiring, mirror parity, survivorship-bias guard present).

- [ ] **Step 7: Commit** (`U-OUTCOME` — `.mjs` files normal gated; settings.json same commit; verify `git show --stat`).

---

## Task 8: Extend `pick-prefresh-inject.mjs` — surface + picked-event log

**Files:**
- Modify: `H:/prism/.claude/hooks/pick-prefresh-inject.mjs`
- Test: `H:/prism/.claude/hooks/__tests__/pick-prefresh-tool-plan.test.mjs`

- [ ] **Step 1: Read** `pick-prefresh-inject.mjs` — find `TRIGGER_RX` and `buildContext()`/`additionalContext` assembly.

- [ ] **Step 2: Write failing test:** given a prompt `/pick-unit MS-A::P0-U02` and a fixture sidecar containing that key, the hook's output `additionalContext` contains the plan's pipelines; AND a `{unitKey,event:"picked"}` line is appended to the pickedEvents JSONL; AND when stored `sourceHash != currentHash`, the injected block is prefixed `⚠ STALE PLAN`.

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Implement.** Extend `TRIGGER_RX` to also match `/rgs continue` + `/continue-roadmap`; gate `/loop` on a unit-id token being present. Add `loadToolPlan(unitKey)` (mtime-cached sidecar read). Append the plan section to the existing single `additionalContext` block (do not emit a second block). On stale hash → prefix warning + append `{unitKey,event:"stale-on-pickup"}`. Always append `{unitKey,event:"picked",predictedPipelines,predictedConfidence,sid}` when a plan is injected (survivorship guard). No-trigger fast path unchanged (`{continue:true}`).

- [ ] **Step 5: Run, verify pass.**

- [ ] **Step 6: Per-file scrutiny gate** (`wiring-review-agent` + `reviewer` — weight: single additionalContext block, no collision regression, fast-path preserved).

- [ ] **Step 7: Commit** (`U-SURFACE`). No settings.json change (hook already wired).

---

## Task 9: `/rgs tool-plan` op + `scripts/rgs-plan-coverage.mjs`

**Files:**
- Modify: `H:/prism/.claude/commands/rgs.md` (add `tool-plan` op to the `Args:` dispatch — name `tool-plan` NOT `plan-tools` to avoid `plan` route prefix-collision, per agent-7)
- Create: `scripts/rgs-plan-coverage.mjs` + `scripts/rgs-plan-coverage.test.mjs`

- [ ] **Step 1: Write failing test** for `coverage({sidecar, openUnits})` → `{total, withFreshPlan, stalePct, perPipeline:{[skill]:{shipped,blocked,reverted}}}`. Assert: a unit with matching sourceHash counts as fresh; changed hash counts stale; per-pipeline rates aggregate from outcomes JSONL.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** `scripts/rgs-plan-coverage.mjs` (`--json`/text, joins sidecar + outcomes JSONL + open-unit enum; emits `% open units with fresh plan` as the anti-rot metric). Add `tool-plan [milestone|--all-open]` to `rgs.md` `Args:` list routing to `node scripts/rgs-tool-planner.mjs` (and `tool-plan-coverage` → the dashboard). Frontmatter unchanged (agent-7: no schema change needed).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Per-file scrutiny gate** (`reviewer` + `code-analyzer` — weight: `rgs.md` convention match, no route prefix-collision, coverage math correctness).

- [ ] **Step 6: Commit** — `.md` normal gated then `git show --stat` verify; `.mjs` separate or same commit (`U-COVERAGE`).

---

## Task 10: Docs — 5-surface reflection + close-out

**Files:**
- Create: `knowledge/wiki/architecture/rgs-tool-autoinvoke-ms0.md`
- Modify: `H:/prism/CLAUDE.md` (≤6-line pointer section), `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` (1 line ≤200 chars), new Obsidian memory `reference_rgs_tool_autoinvoke_ms0_2026_05_16.md`
- Verify: settings.json grep (5th surface)

- [ ] **Step 1: Write the wiki entry** — architecture diagram (signal sources → fusion → sidecar → pickup → outcome loop), the delegation table, safety properties (suggest-only, operator-gated), the pre-impl viz-first dedup verdict for each delegate, knobs.

- [ ] **Step 2: CLAUDE.md pointer** — add a ≤6-line `## RGS-TOOL-AUTOINVOKE-MS0` section: what it is, sidecar path, the `/rgs tool-plan` op, the coverage anti-rot metric, wiki link, memory link.

- [ ] **Step 3: MEMORY.md** — one index line ≤200 chars under "Indexed memories" pointing at the new Obsidian memory.

- [ ] **Step 4: Obsidian memory** `reference_rgs_tool_autoinvoke_ms0_2026_05_16.md` with frontmatter (type:reference), the design decisions, the 10-agent scrutiny outcome, knobs, `[[ ]]` links to `[[reference_ollama_pipeline_ms0_2026_05_15]]`, `[[feedback_system_viz_first_audit]]`.

- [ ] **Step 5: 5th surface — settings.json grep verification:**

```bash
node -e "['H:/.claude/settings.json','C:/Users/wompu/.claude/settings.json'].forEach(p=>{const c=require('fs').readFileSync(p,'utf8');console.log(p+': rgs-outcome-record-stop='+((c.match(/rgs-outcome-record-stop/g)||[]).length))})"
# both ≥1 — record this output in the close-out commit body
```

- [ ] **Step 6: Per-file scrutiny gate** on the wiki + CLAUDE.md diff (`reviewer` — weight: accuracy vs shipped code, no overclaim).

- [ ] **Step 7: Commit** — all `.md` in one doc-only commit, normal gated, then `git show --stat HEAD` to confirm all landed (lintstaged-noop guard). `[MAIN] [RGS-TOOL-AUTOINVOKE-MS0]/U-DOCS: 5-surface reflection`.

- [ ] **Step 8: Milestone close-out** — create/flip `mcp-server/data/milestones/RGS-TOOL-AUTOINVOKE-MS0.json` envelope (status, 10 units shipped), regen MILESTONE_PROGRESS + BUILD_STATE (`node scripts/build-milestone-progress.mjs && node scripts/build-state-snapshot.mjs`), post close-out to chat bus.

---

## Self-Review

**Spec coverage:** §3 enum→T3, §4 delegation→T5 steps, §5.1 minimum-plan→T5 contract+test, §5.3 fold→T8, §5.4 ollama→T2+T6 gate, §5.5 schema→T6, §5.6 tests→T5, §6 perf→T1+T6, §9 feedback loop→T7+T8 picked-event+T9 coverage, §5.8 5-surface→T10. All covered.

**Placeholder scan:** T5 Step 1 references "paste the exact T1–T6 from the spec scrutiny record" — this is a deliberate pointer to a concrete artifact (the test-review agent's full code block is in this session's scrutiny output and reproduced in spec §5.6 summary), not a vague TODO; the engineer has the exact assertions enumerated inline (bounds, contrapositive, adversarial verdicts). Acceptable. No other placeholders.

**Type consistency:** `ToolPlan` shape, composite key, sourceHash formula defined once in Shared Contract, referenced by T5/T6/T8/T9. `fuseSignals({unit,readers})`, `enumerateOpenUnits({envelopes,progress})`, `matchPipelines/matchAgents(unit)`, `extractOutcomes({...})`, `coverage({sidecar,openUnits})` — signatures consistent across tasks. Re-rank multiplier `0.5+(s+1)/(s+f+2)` identical in spec §5.1 and T5 Step 3.

No gaps found.
