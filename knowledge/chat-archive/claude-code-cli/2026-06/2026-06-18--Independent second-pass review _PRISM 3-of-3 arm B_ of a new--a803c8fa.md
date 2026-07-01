---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Independent second-pass review (PRISM 3-of-3 arm B) of a new per-machine LoRA co"
date: "2026-06-18"
first_ts: "2026-06-18T17:54:25.348Z"
last_ts: "2026-06-18T17:57:11.275Z"
cwd: "H:\\prism-slot-india"
messages: 43
user_msgs: 17
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-af2061a92f3475dbe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Independent second-pass review (PRISM 3-of-3 arm B) of a new per-machine LoRA co

> **claude-code-cli** | 2026-06-18 | 43 msgs (17 user / 26 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-af2061a92f3475dbe.jsonl`

## Transcript

### User | 2026-06-18T17:54:25.348Z

Independent second-pass review (PRISM 3-of-3 arm B) of a new per-machine LoRA corpus producer + its inventory registration (slot:india, U-LORA-MACHINE-CORPUS-PRODUCER, commits 4756e77c8b + 16bc1440f8). Read END TO END:

1. H:/prism/scripts/build-machine-lora-datasets.mjs  (NEW producer; exports buildMachineDatasets, parseJobsJsonl, flattenExamples, outPathFor, writeJsonlAtomic, MACHINES)
2. H:/prism/scripts/build-fleet-training-corpus-inventory.mjs  (MODIFIED — search "U-LORA-MACHINE-CORPUS-PRODUCER": imports MACHINES+outPathFor from the producer, builds MACHINE_LORA_SOURCES, spreads into SOURCES)
3. H:/prism/scripts/build-machine-lora-datasets.test.mjs  (NEW test)

Cross-check the producer's MACHINES registry against reality:
- The 8 singleton names + engine .js filenames must match the real engines under H:/prism/mcp-server/src/engines/*LoRADatasetBuilderEngine.ts (e.g. millingLoRADatasetBuilderEngine, fiveAxisLoRADatasetBuilderEngine, millTurnLoRADatasetBuilderEngine, wedm/sinkerEDM/laser/waterjet/grinding). Flag any name mismatch (would fail at runtime in distResolver).
- Confirm lathe is correctly EXCLUDED (it's LatheLoRADatasetBuilderEngine, a 716-line async archive-scanner with a different buildDataset({options}) signature — NOT a RawJob[] transform).

WEIGHT toward: integration coupling (does importing the producer into the inventory builder introduce side effects? the producer guards main() behind __isMain so import must be side-effect-free — verify), convention conformance with the sibling producer build-outcomes-lora-dataset.mjs, the DRY single-source-of-truth claim (does outPathFor() really drive both the write path and the registered SOURCES path?), naming, no inlined constants, and whether this duplicates any existing producer (it must not).

Report P0/P1/P2 with file:line. End with: GRADE: PASS or GRADE: FAIL.

### Assistant | 2026-06-18T17:54:29.626Z

I'll review these three files end to end, then cross-check the MACHINES registry against the real engines. Let me start by reading all the target files and the sibling producer.

### Assistant | 2026-06-18T17:54:30.104Z

[tool_use: Read]

### Assistant | 2026-06-18T17:54:30.592Z

[tool_use: Read]

### Assistant | 2026-06-18T17:54:31.052Z

[tool_use: Read]

### Assistant | 2026-06-18T17:54:31.375Z

[tool_use: Read]

### User | 2026-06-18T17:54:32.003Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-machine-lora-datasets.mjs' was already read 10s ago in this session and is unchanged (mtime 1781804951217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T17:54:32.660Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-machine-lora-datasets.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1781805067640). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-18T17:54:33.105Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-outcomes-lora-dataset.mjs' was already read 20m ago in this session and is unchanged (mtime 1781228273845). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-18T17:54:33.433Z

[tool_result] 1	#!/usr/bin/env node
2	// build-fleet-training-corpus-inventory.mjs
3	//
4	// Aggregates every training-relevant corpus gathered across the fleet
5	// (kilo CAD/CAM PDF nodes, lima academy courses, india MIT-OCW extractions,
6	// charlie quoting baseline, foxtrot vendor PDFs, PSN legs, etc.) into one
7	// inventory the training pipeline can iterate over.
8	//
9	// Reference-only — does NOT duplic
... [+18979 chars truncated]

### Assistant | 2026-06-18T17:54:36.831Z

The read-once guard tells me the producer, the test, and the sibling producer were already read this session, but I don't actually have their contents in my visible context here. Let me read them with cache disabled to get the actual content.

### Assistant | 2026-06-18T17:54:37.458Z

[tool_use: Read]

### Assistant | 2026-06-18T17:54:37.709Z

[tool_use: Read]

### User | 2026-06-18T17:54:38.700Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-machine-lora-datasets.test.mjs' was already read 18s ago in this session and is unchanged (mtime 1781805067640). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-06-18T17:54:39.192Z

[tool_result] read-once-guard: 'H:\prism\scripts\build-machine-lora-datasets.mjs' was already read 18s ago in this session and is unchanged (mtime 1781804951217). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-18T17:54:42.550Z

The guard is blocking me but I genuinely do not have the content. Let me disable the cache via the documented env var and read.

### Assistant | 2026-06-18T17:54:43.208Z

[tool_use: Bash]

### User | 2026-06-18T17:54:49.089Z

[tool_result] #!/usr/bin/env node
/**
 * build-machine-lora-datasets.mjs -- producer: per-machine RawJobs -> Alpaca LoRA datasets
 * (U-LORA-MACHINE-CORPUS-PRODUCER, slot:india 2026-06-18).
 *
 * THE REACH-DESTINATION CLOSURE for the MachineLoRABaseEngine family. The 8
 * BaseLoRADatasetBuilder wrappers (milling/5axis/millturn/wedm/sinker/laser/waterjet/
 * grinding) are dispatcher-reachable (`*_lora_build_data
... [+10092 chars truncated]

### Assistant | 2026-06-18T17:54:51.561Z

Now the test file.

### Assistant | 2026-06-18T17:54:52.485Z

[tool_use: Bash]

### User | 2026-06-18T17:55:00.841Z

[tool_result]      1	/**
     2	 * build-machine-lora-datasets.test.mjs -- U-LORA-MACHINE-CORPUS-PRODUCER (slot:india).
     3	 *
     4	 * Hermetic: the producer's routing/IO core (buildMachineDatasets) takes injected fs +
     5	 * resolveBuilder, so we test it WITHOUT dist or the real TS engines. Real-behavior
     6	 * asserts (R9): per-machine routing, atomic write content, the no-fabrication 0-row
     7	
... [+8225 chars truncated]

### Assistant | 2026-06-18T17:55:04.564Z

I have all three files. Now let me cross-check the MACHINES registry against the real engine files on disk. I need to verify each engine `.ts` exists with the matching singleton export, and confirm lathe's shape.

### Assistant | 2026-06-18T17:55:10.379Z

[tool_use: Bash]

### Assistant | 2026-06-18T17:55:10.579Z

[tool_use: Grep]

### User | 2026-06-18T17:55:23.246Z

[tool_result] FiveAxisLoRADatasetBuilderEngine.ts
GrindingLoRADatasetBuilderEngine.ts
LaserLoRADatasetBuilderEngine.ts
LatheLoRADatasetBuilderEngine.ts
MillTurnLoRADatasetBuilderEngine.ts
MillingLoRADatasetBuilderEngine.ts
SinkerEDMLoRADatasetBuilderEngine.ts
WEDMLoRADatasetBuilderEngine.ts
WaterjetLoRADatasetBuilderEngine.ts

### User | 2026-06-18T17:55:25.231Z

[tool_result] H:\prism\mcp-server\src\engines\FiveAxisLoRADatasetBuilderEngine.ts:117:export const fiveAxisLoRADatasetBuilderEngine = new FiveAxisLoRADatasetBuilderEngineImpl();
H:\prism\mcp-server\src\engines\GrindingLoRADatasetBuilderEngine.ts:105:export const grindingLoRADatasetBuilderEngine = new GrindingLoRADatasetBuilderEngineImpl();
H:\prism\mcp-server\src\engines\LaserLoRADatasetBuilderEngine.ts:106:exp
... [+889 chars truncated]

### Assistant | 2026-06-18T17:55:33.054Z

All 8 engine files exist with exactly matching singleton exports. Let me verify the cross-check map precisely against the registry, confirm the lathe engine's distinct shape, and confirm `.js` filenames will match the dist output (engineFile vs actual .ts basename).

All 8 from the registry match:
- `MillingLoRADatasetBuilderEngine.js` → `millingLoRADatasetBuilderEngine` ✓ (line 109)
- `FiveAxisLoRADatasetBuilderEngine.js` → `fiveAxisLoRADatasetBuilderEngine` ✓ (line 117)
- `MillTurnLoRADatasetBuilderEngine.js` → `millTurnLoRADatasetBuilderEngine` ✓ (line 112)
- `WEDMLoRADatasetBuilderEngine.js` → `wedmLoRADatasetBuilderEngine` ✓ (line 120)
- `SinkerEDMLoRADatasetBuilderEngine.js` → `sinkerEDMLoRADatasetBuilderEngine` ✓ (line 107)
- `LaserLoRADatasetBuilderEngine.js` → `laserLoRADatasetBuilderEngine` ✓ (line 106)
- `WaterjetLoRADatasetBuilderEngine.js` → `waterjetLoRADatasetBuilderEngine` ✓ (line 92)
- `GrindingLoRADatasetBuilderEngine.js` → `grindingLoRADatasetBuilderEngine` ✓ (line 105)

Now let me verify the lathe engine's distinct shape (the exclusion justification) and check the `buildDataset` signature of one of the included engines to confirm `buildDataset(jobs)` is the real contract.

### Assistant | 2026-06-18T17:55:35.490Z

[tool_use: Bash]

### Assistant | 2026-06-18T17:55:37.535Z

[tool_use: Bash]

### User | 2026-06-18T17:55:41.180Z

[tool_result] /**
 * LatheLoRADatasetBuilderEngine — LATHE-LORA-MS0 U-LLR05
 * ======================================================
 *
 * Builds training datasets for LatheLoRA fine-tuning from JM Die program archive.
 * Converts raw Okuma .MIN programs into instruction-tuning format suitable for
 * Unsloth/PEFT LoRA training.
 *
 * Pipeline:
 *   1. Scan JM DIE archive (5,297 .MIN lathe programs)
 *   2. Par
... [+1832 chars truncated]

### User | 2026-06-18T17:55:48.690Z

[tool_result] 9: * INPUT: RawJob records sourced from PrintToProgramPipeline outputs +
14: * OUTPUT: Alpaca-format instruction-tuning examples where:
31:  type RawJob,
45:class MillingLoRADatasetBuilderEngineImpl {
60:  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
71:  private validate(job: RawJob): string | null {
88:  private render(job: RawJob): { instruction:
... [+1049 chars truncated]

### Assistant | 2026-06-18T17:55:54.085Z

This confirms the critical contract. Let me verify the two things that matter most for runtime correctness:

1. The included engines' `buildDataset(jobs: RawJob[], split)` signature matches what the producer calls (`builder.buildDataset(jobs)`) — confirmed at MillingLoRADatasetBuilderEngine.ts:60.
2. The lathe engine's `buildDataset` at line 516 has a **different signature** — let me confirm it takes `options` not `RawJob[]`, validating the exclusion.

Let me also verify the `DatasetBuildResult` shape (`examples.{train,val,test}` + `stats.validJobs`) matches what `flattenExamples` and the producer expect.

### Assistant | 2026-06-18T17:55:56.469Z

[tool_use: Bash]

### User | 2026-06-18T17:56:03.676Z

[tool_result]   async buildDataset(
    options: {
      basePath?: string;
      splitConfig?: Partial<DatasetSplitConfig>;
      maxPrograms?: number;
      outputDir?: string;
    } = {}
  ): Promise<DatasetBuildResult> {
    const startTime = Date.now();
    const config = { ...DEFAULT_SPLIT_CONFIG, ...options.splitConfig };
    const outputDir = options.outputDir || "H:/prism/mcp-server/data/lathe-lora";


... [+1869 chars truncated]

### Assistant | 2026-06-18T17:56:12.340Z

This fully confirms the core correctness claims:

- **Lathe exclusion is correct**: `LatheLoRADatasetBuilderEngine.buildDataset(options: {...})` (line 516) takes an options object and scans the archive — NOT `RawJob[]`. Calling it with `builder.buildDataset(jobs)` would silently ignore the jobs array (it'd scan the archive instead). The exclusion prevents a real bug. The two engines also have a **different `DatasetBuildResult` shape** for the empty case (lathe returns `{success:false, stats, errors, warnings}` with NO `examples` key), so `flattenExamples` would return `[]` — but more importantly the lathe needs a `basePath`, not jobs.
- **Included engines match**: `buildDataset(jobs: RawJob[], split)` (Milling:60) matches the producer's `builder.buildDataset(jobs)` call. The result shape `examples.{train,val,test}` + `stats.validJobs` matches `flattenExamples` and `rec.validJobs` extraction.

Now let me check the integration coupling concerns: side-effect-free import (the `__isMain` guard), DRY claim (does `outPathFor` drive both write and registration), and whether this duplicates an existing producer. Let me check `assemble-fleet-lora-corpus.mjs` to confirm the manifest-driven fold claim, and check for any pre-existing per-machine producer.

### Assistant | 2026-06-18T17:56:13.759Z

[tool_use: Grep]

### User | 2026-06-18T17:56:15.280Z

[tool_result] H:\prism\scripts\build-fleet-training-corpus-inventory.mjs:23:import { MACHINES as MACHINE_LORA_BUILDERS, outPathFor as machineLoraOutPath } from './build-machine-lora-datasets.mjs';
H:\prism\scripts\build-fleet-training-corpus-inventory.mjs:28:// Per-machine LoRA datasets produced by scripts/build-machine-lora-datasets.mjs. status
H:\prism\scripts\build-fleet-training-corpus-inventory.mjs:32:cons
... [+2668 chars truncated]

### Assistant | 2026-06-18T17:56:16.844Z

[tool_use: Bash]

### User | 2026-06-18T17:56:23.379Z

[tool_result] 8: * build-fleet-training-corpus-inventory.mjs REGISTERS them as
44:const INVENTORY_PATH = path.join(ROOT, "state", "shared", "training", "fleet-training-corpus-inventory.json");
96:      `fleet-training-corpus-inventory not found at ${p} -- run: node scripts/build-fleet-training-corpus-inventory.mjs`,
262:      `lora-training-jsonl sources -- rerun build-fleet-training-corpus-inventory.mjs and re
... [+1829 chars truncated]

### Assistant | 2026-06-18T17:56:31.325Z

This confirms the full pipeline integration. The assembler (`selectLoraSources`, line 103) filters `kind === "lora-training-jsonl" && status === "present"` — so the registered `MACHINE_LORA_SOURCES` (kind `lora-training-jsonl`) will be folded automatically once present. The DRY claim holds: `outPathFor()` drives both the write (producer line 153) AND the registered SOURCES path (inventory line 35).

Let me verify three remaining concerns:
1. **No duplicate producer** — confirm no pre-existing per-machine producer writes `machine-*-dataset.jsonl`.
2. **`advisory: false` on machine sources** — does the assembler weight these correctly, and is `advisory:false` (full weight) the right call for what will be REAL shop actuals? (semantically consistent with vault-feedback-lora which is also `advisory:false` for verified data).
3. **Side-effect-free import** — confirm the inventory builder's `main()` is also guarded so importing MACHINES doesn't trigger work, AND that the producer import chain (`node:fs/path/url` only at module top) is genuinely inert.

### Assistant | 2026-06-18T17:56:33.799Z

[tool_use: Bash]

### User | 2026-06-18T17:56:39.943Z

[tool_result] === any OTHER script writing machine-*-dataset.jsonl ? ===
H:/prism/scripts/build-machine-lora-datasets.mjs
=== assembler advisory weighting ===
13: * every PRESENT lora-training-jsonl source into ONE deduped, weighted, staged
20: * Trust weighting (R7 -- the two signals are kept distinct, not blended): a
21: * source whose id/description marks it advisory (the galaxy-synthesis brains, which
24: *
... [+1278 chars truncated]

### Assistant | 2026-06-18T17:57:11.275Z

No duplicate producer (`build-machine-lora-datasets.mjs` is the only writer of `machine-*-dataset.jsonl`). The assembler's `sourceWeight` honors the explicit `advisory` flag (line 74-75): `advisory: false` → `VERIFIED_WEIGHT`. Since the machine jobs are documented as REAL shop actuals (no synthetic data, owning-slot-supplied), `advisory: false` is the semantically correct trust assignment — consistent with vault-feedback-lora and vault-galaxy-aisynergy-lora (both `advisory: false` for verified data).

I've verified everything end-to-end. I have enough to render the verdict. Let me do a final confirmation of the side-effect-free import guards in both files (already visible: producer uses `__isMain` at the bottom; inventory uses `invokedDirectly` check at line 337-339). Both `main()` calls are guarded — importing `MACHINES`/`outPathFor` triggers no I/O. The producer's module-top only imports `node:fs/path/url` and defines pure constants/functions; no top-level side effects.

One last edge-case check on the test's `flattenExamples(null)` assertion and the `empty-after-parse` skip label collision.

The test at line 141 asserts `byType.laser.skipped === "empty-after-parse"` for an all-malformed file. Looking at the producer logic (lines): a file with all-malformed lines yields `jobs.length === 0`, which hits the `rec.skipped = "empty-after-parse"` branch — so "empty-after-parse" covers both genuinely-empty AND all-malformed-after-parse. The test correctly asserts `byType.laser.malformed === 2` alongside, so the malformed count is preserved and not lost. This is honest (R12): the malformed count surfaces even though the skip label is shared. Minor observability nuance only.

---

VERDICT: PASS

summary: The per-machine LoRA producer is correct, DRY, side-effect-free on import, and well-tested with real-behavior assertions. All 8 registry rows (`engineFile` + `singleton`) match the actual engines on disk exactly, and lathe's exclusion is justified by a genuinely incompatib
... [+3281 chars truncated]
