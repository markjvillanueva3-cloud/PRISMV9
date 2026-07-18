# knowledge-conversion — fleet-managed

> Assessment date: 2026-06-13 | Assessor: subagent (sonnet-4-6) | Branch: cad-fusion-live-ms0

---

## Current state

**Size:** ~80 lines, ~3.8 KB
**Quality grade: PARTIAL**

The file has a correct skeleton — scope, cross-galaxy edges, Ollama cross-cutting methodology block, and Critic/keep-working contract pointer. However the "Key engines" section is the primary quality problem: it copies 12 engine names verbatim from PATHS.md's keyword-match list (explicitly labelled "verify ownership") and includes false positives like `AdaptiveToolpathRouterEngine`, `CameraIntakeRouterEngine`, `BatchMacroConversionEngine` — CAD/CAM routing engines, not knowledge-conversion engines. The real core assets are absent. The auto-generated "Domain knowledge" paragraph is advisory Ollama prose with no file:line anchors.

**Specific stale/inaccurate content found:**

1. `## Key engines` (lines 22-33) — lists 12 engines from `PATHS.md` keyword-match (126 found, explicitly advisory). At least 7 are NOT knowledge-conversion domain engines: `AdaptiveToolpathRouterEngine`, `AdditiveManufacturingTribalCorpusEngine`, `BackendRouterEngine`, `BatchMacroConversionEngine`, `CADAutomationRouter`, `CADDrawingKnowledgeEngine`, `CADFormatConversionMatrixEngine`. The real core engines (`KnowledgeInjectionPipelineEngine`, `KnowledgeDeduplicationEngine`, `KnowledgeDistillationEngine`) and the 7 ported algorithms are absent.

2. `## Domain knowledge` (line 19) — Ollama-distilled advisory prose flagged `advisory; verify engine names against PATHS.md`. No file:line citations. Zero load-bearing content; wastes ~80 tokens per load.

3. `## High-ROI domain memories` (lines 36-40) — three of five bullets point at OTHER-domain memories. `reference_oscar_sfc_knowledge_index_2026_05_29` is an SFC/oscar artifact. The `node_formula_*` entry is a graph-node auto-memory, not a substantive lesson.

4. **Missing dispatcher table** — TOOLBELT.md says "owning slot lists the domain's prism_* actions here" but neither CLAUDE.md nor TOOLBELT.md has filled this in. Verified actions exist in `knowledgeDispatcher.ts:173` (`tribal_search`, `tribal_capture`, `tribal_suggest`, `tribal_stats`) and `devDispatcher.ts` (`mcfi_*`, `mcdl_*`). This is the #1 daily-use gap.

5. **Missing live pipeline state pointers** — The routing ledger (`state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json`: 65 candidates, 126 routed = 31 TRIBAL-SHIPPED / 69 FORGE-QUEUE / 10 DUPLICATE / 16 DISCARD) and master plan (`KNOWLEDGE-CONVERSION-PLAN.md`) are cited in MEMORY.md but absent from CLAUDE.md.

6. **AWARENESS.md reports 0 AI engines, 0 AI dispatcher actions, 0 reasoning/neural bridges** — real AI-adjacent engines (`KnowledgeGraphNeuralBridgeEngine`, `KnowledgeDistillationEngine`) exist but are unregistered. The CLAUDE.md silence compounds this.

---

## KEEP

The following sections are accurate and load-bearing; retain them:

- `## Scope` (line 6) — accurate 1-paragraph domain definition, Lane A/B/C description, shipped algorithm list with test counts. Correct and dense.
- `## Cross-galaxy edges` (lines 8-12) — accurate symmetric edge table (mit-curriculum / academy / pdf-corpus / tribal-knowledge / ai-training). Keep verbatim.
- Cross-cutting methodology block (lines 54-64) — accurate Ollama model routing, loop discipline, Obsidian vault path. Retain trimmed to pointers.
- `CRITIC-KEEPWORKING-STANZA` block (lines 76-80) — universal pointer; keep as-is (pointer only, no duplicated prose).
- `AI-SYSTEMS-STATE` block — accurate fleet-state pointer; keep.
- `## Cross-refs` (line 52) — accurate sibling + parent doctrine pointers; keep.
- `GALAXY-CLAUDEMD-FILL` comment markers — keep for idempotent regen; drop the advisory prose content inside.

---

## DROP

1. `## Key engines` (lines 22-33) — remove entirely. Replace with the verified list in ADD section below. The current list is a keyword-match false-positive set from an advisory PATHS.md baseline.

2. `## Domain knowledge` advisory Ollama-prose paragraph (line 19) — drop. Zero load-bearing content; scope section already covers this.

3. `## High-ROI domain memories` bullets 3 and 5 — drop `reference_oscar_sfc_knowledge_index_2026_05_29` (SFC-owned) and the `node_formula_*` graph-node pointer (noise). Retain only the two genuinely knowledge-conversion bullets (Three-lane model + MIT-OCW dispatcher separation).

4. `_Domain-knowledge core auto-populated...` footer note (line 47) — drop from rendered doctrine; belongs in a comment, not as text the chat reads every turn.

5. Redundant universal patterns (Route-before-Grep, RTK-on-bash, parallel-tool-calls, Karpathy 5-step) — universal-core content already in main CLAUDE.md + TOOLBELT.md. Do NOT duplicate here.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Verified dispatcher action table (daily use)

Verified against `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:173` and `devDispatcher.ts`:

```
## Dispatchers (verified)
| Dispatcher      | File                  | Key actions for this galaxy                                        |
|-----------------|-----------------------|--------------------------------------------------------------------|
| prism_knowledge | knowledgeDispatcher.ts| tribal_search, tribal_capture, tribal_suggest, tribal_stats        |
| prism_dev       | devDispatcher.ts      | mcfi_* (MIT curriculum index), mcdl_* (MIT course download/list)   |
| prism_calc      | physicsDispatcher     | downstream when Lane-C algorithms need physics validation           |

RULE: MIT-OCW actions (mcfi_*, mcdl_*) live in prism_dev — NOT prism_ai.
Source: reference_lima_mcdl_mcfi_in_prism_dev
```

### 2. Verified core engine + script list (replaces current false-positive list)

All paths verified by Bash ls on disk:

```
## Core engines and scripts (verified)

# Lane C router (pure-core):
  scripts/lib/course-data-router-lib.mjs      (14 exports, 30 tests, CamelCase dedup)
  scripts/course-data-router.mjs              (CLI)
  scripts/lib/course-data-router-lib.test.mjs

# Lane A emitters:
  scripts/course-to-tribal-tips.mjs           (course -> KnowledgeTip[])
  scripts/monolith-to-tribal-tips.mjs         (monolith extraction)

# Lane C keystone engine:
  mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts  (+.test.ts)
  mcp-server/scripts/knowledge-injection-pipeline.ts          (CLI)

# 7 ported algorithms (mcp-server/src/algorithms/ — all verified on disk):
  OperatorSplittingMethod.ts + .test.ts
  ODEIntegrator.ts + .test.ts
  LinearStateSpaceModel.ts + .test.ts
  FiniteDifferenceMethod.ts + .test.ts
  FiniteElementMethod1D.ts + .test.ts
  GradientDescent.ts + .test.ts
  LagrangianMechanics.ts + .test.ts
  SafeExpressionEvaluator.ts + .test.ts       (keystone — 60 tests; do NOT bypass with raw code)

# Round-trip test:
  mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts

# Ledger/audit:
  scripts/audit-monolith-port-state.mjs       (advisory ledger)
```

### 3. Live pipeline state pointers (currently absent from CLAUDE.md)

```
## Live pipeline state
Master plan:     state/shared/specs/KNOWLEDGE-CONVERSION-PLAN.md
Router ledger:   state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json
                 65 candidates -> 126 routed: 31 TRIBAL-SHIPPED / 69 FORGE-QUEUE / 10 DUPLICATE / 16 DISCARD
Formula audit:   state/shared/specs/U-KC-C1-FORMULA-PORT-VERIFICATION.md  (12 formulas, 0 ports)
Algorithm audit: state/shared/specs/U-KC-C2-ALGORITHM-VERIFICATION.md    (52 algos, 1 forge-candidate)
Monolith state:  state/shared/specs/monolith-port-ledger.json
Wiki canonical:  knowledge/wiki/architecture/knowledge-conversion-ms0.md
DB intake:       AlgorithmDB (data/algorithms/, 52 entries)
                 KnowledgeDB (data/knowledge/, 58 entries)
Query DB:        prism_data:database_search  OR  node scripts/db-toolbelt.mjs --status
```

### 4. Domain corpus pointers (specific to this galaxy)

```
## Domain corpora
MIT OCW source:   H:/PRISM/resources/MIT COURSES
Algorithm corpus: H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS
Tribal + wiki:    H:/PRISM/JM DIE/TRIBAL + WIKI   (Lane A primary target)
Galaxy reasoning: node scripts/lib/galaxy-reasoning-bridge.mjs knowledge-conversion "<q>"
                  ($0, local Ollama, hybrid RAG+CAG)
```

### 5. Domain invariants (promote from MEMORY.md — currently absent from CLAUDE.md)

```
## Domain invariants (non-negotiable)
1. NEVER inline physics constants — formula path is ALWAYS Lane C with physics-reviewer.
   Canonical: mcp-server/src/physics/constants.ts ONLY.
   The 7 ported algorithms landed as `algorithm` (numerical primitives, caller owns physics)
   precisely to avoid the constants path.
2. NEVER auto-emit engines — router output is advisory ledger only.
   advisoryOnly: true + mustHumanVerify: true on every generated ledger entry.
3. R12 fail-loud on unknown asset kinds — DISCARD with audit-trail rationale; never silent-drop.
   Example: singular Lagrangian -> NaN generalized acceleration -> flag, not default.
4. 1 real-data E2E test per pipeline — hermetic-only hides schema-seam bugs (RGS-TOOL-MS1).
   Gate: mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts
5. R8 read-before-write — pure-core + injected readers; cross-ref against existing PRISM
   content before classifying a candidate as missing.
```

### 6. What NOT to do in this domain (Refuses)

```
## Refuses
- Bypassing Lane B (port-verify) for formulas/algorithms — validation is mandatory
- Injecting unvalidated tribal wisdom into physics models
- Overriding SafeExpressionEvaluator with raw dynamic code construction or script injection
- Routing MIT-OCW actions (mcfi_*, mcdl_*) through prism_ai — they live in prism_dev
- Skipping node-indexed pointer resolution (query wiki/memory before re-deriving)
- Writing a new router variant — course-data-router-lib.mjs is canonical; extend its exports, never fork
- Emitting engine source files directly from the router — advisory ledger only
- Trusting PATHS.md engine list as ground truth — it is a keyword-match baseline with false positives
- Citing reference_oscar_sfc_knowledge_index or other SFC-domain memories as knowledge-conversion doctrine
```

### 7. Node-type taxonomy (the 6-node-type forge model)

```
## 6-node-type forge model (Lane output targets)
| Node type  | Lane           | Example output                                  |
|------------|----------------|-------------------------------------------------|
| knowledge  | A (direct-wire)| tribal tip -> TribalKnowledgeEngine             |
| formula    | B (port-verify)| Lagrangian formula — physics-reviewer required  |
| algorithm  | C (forge-gated)| OperatorSplittingMethod.ts — human-in-loop      |
| engine     | C (forge-gated)| new TS engine — human-in-loop                  |
| skill      | C (forge-gated)| new .md skill — human-in-loop                  |
| pipeline   | C (forge-gated)| KIP stage — human-in-loop                      |
```

---

## IDEAL SECTION OUTLINE

Ordered sections the galaxy CLAUDE.md should contain:

```
1.  Header comment (1 line: scope + slot=fleet-managed + populated date + universal-core pointer)
2.  ## Scope                       [KEEP current]
3.  ## Cross-galaxy edges          [KEEP current]
4.  ## Dispatchers                 [ADD — verified prism_knowledge + prism_dev action table]
5.  ## Core engines and scripts    [REPLACE — verified list, drop PATHS.md keyword matches]
6.  ## 6-node-type forge model     [ADD — Lane A/B/C taxonomy table]
7.  ## Domain invariants           [ADD — promote from MEMORY.md]
8.  ## Refuses                     [ADD — what NOT to do list]
9.  ## Live pipeline state         [ADD — ledger + plan + DB intake pointers]
10. ## Domain corpora              [ADD — MIT COURSES / MACHINING ALGORITHMS / JM DIE TRIBAL+WIKI]
11. ## Test commands               [KEEP current]
12. ## Cross-refs                  [KEEP current]
13. GALAXY-CLAUDEMD-FILL markers   [KEEP markers, drop advisory prose body]
14. AI-SYSTEMS-STATE pointer       [KEEP]
15. CRITIC-KEEPWORKING pointer     [KEEP — pointer only, no duplicated prose]
16. ## Cross-cutting methodology   [KEEP trimmed — Ollama tiers + loop discipline + vault path only]
```

Sections to OMIT (covered by universal-core or are noise):
- Generic RTK / Glob-over-Bash / parallel-tool-calls advice
- Full Karpathy 5-step text (in TOOLBELT.md + universal core)
- Advisory Ollama-distilled domain prose (no file:line anchors = noise)
- SFC-domain memory references (wrong domain)
- Full PATHS.md keyword-match engine list (126 false positives)

---

## UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md must NOT duplicate these — point to `H:/PRISM/CLAUDE.md`:

- **Safety rails:** UNITS FIRST · no inline physics constants · no stub engines · run affected tests · check ENGINE_DIGEST.md before creating
- **Process gates:** 3-of-3 scrutiny gate (`scrutiny-3way.mjs`) · per-file 2-arm scrutiny · per-chat handoff (`per-agent-handoff.mjs`) · commit format `[SCOPE]/U-ID: title`
- **Rules R1-R15:** Karpathy 4 + agent-era R5-R15 (R8 read-before-write, R9 tests-verify-intent, R12 fail-loud, R13 comprehensive route)
- **Token economy:** RTK prefix · Glob/Grep over Bash · parallel tool calls · Read offset/limit
- **AI routing fallback ladder:** Ollama -> Sonnet subagent -> Opus (never silently promote mechanical work)
- **Fleet coordination:** 26 NATO slots · slot-worktree discipline · per-agent handoff read/write
- **Hook gates:** scrutinize-before-stop · enforce-handoff-topic · comprehensive-build-enforce · duplication-hard-block

Pointer line to include at top of galaxy CLAUDE.md:
```
> Universal rails: H:/PRISM/CLAUDE.md (R1-R15, scrutiny gate, handoff, commit format, safety).
> This file = knowledge-conversion domain doctrine ONLY.
```
