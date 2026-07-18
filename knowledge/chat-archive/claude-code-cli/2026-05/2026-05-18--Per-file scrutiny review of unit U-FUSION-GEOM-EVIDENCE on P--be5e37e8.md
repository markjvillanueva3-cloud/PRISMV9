---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "Per-file scrutiny review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mike, cla"
date: "2026-05-18"
first_ts: "2026-05-18T14:55:27.909Z"
last_ts: "2026-05-18T14:57:23.532Z"
cwd: "H:\\prism\\mcp-server"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-aecdee7b87d09e773.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Per-file scrutiny review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mike, cla

> **claude-code-cli** | 2026-05-18 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-aecdee7b87d09e773.jsonl`

## Transcript

### User | 2026-05-18T14:55:27.909Z

Per-file scrutiny review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mike, claude-be5e37e8).

**Unit goal:** Close the named gap "STEP geometry corpus not auto-wired into build-sequence inference" by adding evidence-driven feature ranking to `CADClassFeatureLibraryEngine`.

**Files to review (read end-to-end, NOT excerpts):**

1. `H:/prism/mcp-server/src/engines/CADClassFeatureLibraryEngine.ts` — new public method `buildSequenceForEvidence(partClass, opts)` at the bottom of the class, new exported types `CADCorpusStepGeometryReport`, `BuildSequenceEvidenceOpts`, `BuildSequenceEvidenceResult`.

2. `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` — new action `cad_class_build_sequence_evidence` added to z.enum (search for the new entry) + new `case` block immediately after the existing `cad_class_build_sequence` case. The dispatcher does fs/path I/O to load `mcp-server/data/state/cad-corpus-step-geometry-report.json` and passes the parsed JSON into the engine as `corpus_report`.

3. `H:/prism/mcp-server/src/__tests__/CADClassFeatureLibraryEngine.test.ts` — 12 new test cases at the bottom under `describe("CADClassFeatureLibraryEngine.buildSequenceForEvidence")`. All 34 tests in the file PASS via vitest.

**Verdict criteria (PASS/FAIL):**
- Flag every P0/P1 issue.
- Specifically check: (a) silent breakage risk — does anything change behavior of existing `buildSequenceFor`? (b) hostile-payload risk in dispatcher I/O (JSON.parse of an external file) — what if the file is missing/corrupt/huge/malicious? (c) integration coupling — does the engine method maintain the "no I/O" doctrine cited in the engine's header comment? (d) error budget — fail-loud R12 semantics (returns caveats array even on success, never silently substitutes)?  (e) inlined-constant detection — any magic numbers introduced? (f) regression-test integrity — do the 12 new tests actually exercise behavior that would fail if the engine were broken?

**Output format:**
```
VERDICT: PASS or FAIL
P
... [+157 chars truncated]

### Assistant | 2026-05-18T14:55:38.045Z

I'll review the three files end-to-end.

### Assistant | 2026-05-18T14:55:38.682Z

[tool_use: Read]

### User | 2026-05-18T14:55:41.608Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+33410 chars truncated]

### Assistant | 2026-05-18T14:55:46.783Z

Acknowledged. Continuing review.

### Assistant | 2026-05-18T14:55:48.360Z

[tool_use: Read]

### User | 2026-05-18T14:55:49.575Z

[tool_result] 1	/**
2	 * prism_cad — CAD/Geometry Dispatcher
3	 *
4	 * 71 actions: geometry (3), mesh (3), feature (2), stock/wcs/dfm (5), grasshopper (4),
5	 *   sketch (5), part (7), part_library (2), assembly (6),
6	 *   cad_taxonomy (9), cadquery (5), f360_codegen (4), f360_live (14), blueprint (2)
7	 *
8	 * Engine dependencies: CADKernelEngine, GeometryEngine, MeshEngine,
9	 *   FeatureRecognitionEngine, S
... [+8702 chars truncated]

### Assistant | 2026-05-18T14:55:49.782Z

[tool_use: Bash]

### User | 2026-05-18T14:55:57.569Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
10 matches in 3F:

[file] 2041 (1):
     0: {

[file] 2047 (1):
     0: {

[file] H:/.../dispatchers/cadDispatcher.ts (8):
   226: "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence...
  2027: const {
... [+588 chars truncated]

### Assistant | 2026-05-18T14:56:02.801Z

Acknowledged. Continuing review of the dispatcher.

### Assistant | 2026-05-18T14:56:04.422Z

[tool_use: Read]

### Assistant | 2026-05-18T14:56:05.151Z

[tool_use: Read]

### User | 2026-05-18T14:56:08.106Z

[tool_result] 220	  "gear_compute_geometry", "gear_generate_tooth_profile", "gear_compute_contact_ratio",
221	  // Helical Spring Engine (U-CADC16)
222	  "spring_compute_geometry", "spring_compute_mechanics", "spring_compute_stress_at_force", "spring_generate_coil_path",
223	  // CAD-FUSION-LIVE-MS0 training surface (U-CAD-CORPUS-PHASE1..8)
224	  "cad_corpus_ingest", "cad_corpus_load_manifest", "cad_corpus_find
... [+793 chars truncated]

### User | 2026-05-18T14:56:09.133Z

[tool_result] 2020	            if (!manifest) { result = { success: false, error: "manifest not found" }; break; }
2021	            const recovered = cadCorpusPatternEngine.recoverUnclassified(manifest);
2022	            const updated = cadCorpusPatternEngine.applyRecoveries(manifest, recovered);
2023	            result = { success: true, data: { recovered_count: recovered.length, recovered, updated_manifest: u
... [+7682 chars truncated]

### Assistant | 2026-05-18T14:56:20.064Z

Acknowledged. Continuing review — reading the test file end-to-end.

### Assistant | 2026-05-18T14:56:22.186Z

[tool_use: Bash]

### Assistant | 2026-05-18T14:56:23.159Z

[tool_use: Bash]

### User | 2026-05-18T14:56:31.739Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
145 matches in 15F:

[file] 204 (1):
     0: oil_hole top)", () => {

[file] 205 (1):
     0: punchCorpus });

[file] 214 (1):
     0: punchCorpus });

[file] 225 (1):
     0: punchCorpus, min_evidence_ratio: 0.9 });

[file] 22
... [+2160 chars truncated]

### User | 2026-05-18T14:56:32.880Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
325 __tests__/CADClassFeatureLibraryEngine.test.ts
804 engines/CADClassFeatureLibraryEngine.ts
4072 tools/dispatchers/cadDispatcher.ts
Σ 5201

### Assistant | 2026-05-18T14:56:37.315Z

[tool_use: Read]

### User | 2026-05-18T14:56:39.566Z

[tool_result] 175	    expect(kinds.includes("leading_edge_fillet")).toBe(true);
176	    expect(kinds.includes("trailing_edge_fillet")).toBe(true);
177	    expect(kinds.includes("blade_root_fillet")).toBe(true);
178	  });
179	});
180	
181	// ── buildSequenceForEvidence — wires LIVE corpus into build sequence ──
182	
183	describe("CADClassFeatureLibraryEngine.buildSequenceForEvidence", () => {
184	  // Corpus mat
... [+7783 chars truncated]

### Assistant | 2026-05-18T14:57:23.532Z

Acknowledged conventions. I have all three files reviewed end-to-end now. Producing verdict.

VERDICT: FAIL

P0 findings:
- **(b) Hostile-payload / DoS risk in dispatcher I/O** — `cadDispatcher.ts:2061-2066` calls `fs.readFile(reportPath, "utf8")` then `JSON.parse(raw)` with **zero size cap and zero shape validation**. A symlinked / replaced `cad-corpus-step-geometry-report.json` of arbitrary size will be slurped into memory and parsed (Node `JSON.parse` is synchronous, blocks the event loop, and OOMs above ~512MB; the operator's own host has demonstrated this exact class — see `## Recent regressions` 2026-05-18 `seed-ghost-from-unwired.mjs` V8 string-cap crash, and `ask-ollama.mjs` shipped an explicit `MAX_GRAPH_BYTES=80MB` cap for the same reason). The cast `corpusReport as never` then bypasses every type check; only the engine's `Array.isArray(corpus.per_class)` guard saves the engine-side from a non-array, but a maliciously-shaped `per_class: [{ part_class: "extrude_punch", files_examined: 1, feature_evidence_counts: <huge-object> }]` propagates straight into `Number(counts[f.kind] ?? 0)` lookups. Required: pre-`stat` size cap (≤16MB suggested), Zod schema validation of the parsed shape, and reject `feature_evidence_counts` whose key count exceeds a sane bound.

- **(c) Engine "no-I/O" doctrine intact, BUT JSDoc lies about caller contract** — header comment line 22 says *"Read-only API (no live geometry, no I/O)"* which the new method honors; however the new docstring at line 670-674 reads *"the dispatcher reads `state/cad-corpus-step-geometry-report.json`"* with a relative path. The dispatcher uses `path.resolve(process.cwd(), "mcp-server/data/state/cad-corpus-step-geometry-report.json")` — **CWD-dependent**. If the MCP server is launched from any working directory other than the repo root (`H:/prism`), this resolves to a nonexistent path and the action silently returns the template fallback with a `corpus_read_error` field that callers must opt-in to inspect. 
... [+4280 chars truncated]
