---
type: "chat-session"
source: "claude-code-cli"
session_id: "df944902-c90f-484b-86ea-6b35b3c9143f"
title: "Per-file scrutiny review (PRISM CLAUDE.md per-file gate) of U-FGE03 — two couple"
date: "2026-05-19"
first_ts: "2026-05-19T00:11:10.415Z"
last_ts: "2026-05-19T00:12:49.500Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a7e3551d392a644f0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Per-file scrutiny review (PRISM CLAUDE.md per-file gate) of U-FGE03 — two couple

> **claude-code-cli** | 2026-05-19 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a7e3551d392a644f0.jsonl`

## Transcript

### User | 2026-05-19T00:11:10.415Z

Per-file scrutiny review (PRISM CLAUDE.md per-file gate) of U-FGE03 — two coupled engine files. Read each END-TO-END.

UNIT SPEC (U-FGE03 / scope FUSION-TRAIN-GEOM-EVIDENCE): Close the R12 gap from memory reference_cad_fusion_training_2026_05_18: "the geometry report is the real model but is NOT auto-blended into the live build-sequence templates — cad_corpus_apply_learned does an in-memory blend with no persistence path. Wire-to-inference is a real follow-up unit." U-FGE01 (commit 62b5794101) added opt-in buildSequenceForEvidence; U-FGE02 (c60f6c9396) added a use_corpus_evidence flag (default off). U-FGE03 must make the blend PERSISTENT + auto-applied on the DEFAULT path (templateFor → buildSequenceFor → predictVisualFidelity) WITHOUT changing behavior when no overlay file exists (byte-identical fallback so all ~35 pre-existing FGE01/02 tests still pass).

FILES (read fully):
1. H:\prism\mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts — new method persistLearned() + overlay types (LearnedPrevalenceOverlay/PersistLearnedOpts/PersistLearnedResult)
2. H:\prism\mcp-server\src\engines\CADClassFeatureLibraryEngine.ts — new overlay loader infra (loadPrevalenceOverlay/applyOverlay/overlayPathResolved/overlayDisabled + cache) + rewritten templateFor() + new overlayStatus()/clearOverlayCache()

Verify rigorously and flag P0/P1/P2/P3:
- CORRECTNESS: does templateFor() return the EXACT static object (referential identity) when no overlay / overlay disabled / overlay has no entry for the class / applyOverlay finds nothing changed? (This is the load-bearing backward-compat invariant — any clone-when-unchanged is a P0 because FGE01/02 tests assert on static prevalence values and possibly identity.)
- expected_feature_count recompute under overlay: is the predictVisualFidelity invariant (score = covered/total ≤ 1 when all features planned) preserved? total = expected_feature_count, covered = Σ f.prevalence for planned. Confirm recompute = Σ overlaid prevalence is
... [+1635 chars truncated]

### Assistant | 2026-05-19T00:11:18.458Z

I'll review both files end-to-end with adversarial rigor, focusing on the load-bearing backward-compat invariant and the path-resolution wiring correctness.

### Assistant | 2026-05-19T00:11:18.884Z

[tool_use: Read]

### Assistant | 2026-05-19T00:11:19.216Z

[tool_use: Read]

### User | 2026-05-19T00:11:20.369Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/learn-class-feature-prevalence.ts
2	// to refresh the CADClassFeatureLibraryEngine prevalence weights from corpus
3	// evidence. Dispatcher integration follows in CAD-FUSION-LIVE-MS1 once the
4	// learning loop is closed (corpus → weights → live build → outcome → corpus).
5	/**
6	 * CADCorpusFeaturePrevalenceLearnerEngine — Learn class-feature
... [+18645 chars truncated]

### User | 2026-05-19T00:11:20.894Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+42676 chars truncated]

### Assistant | 2026-05-19T00:12:49.500Z

Both files are already in context. I'll review them adversarially without re-reading.

## Per-File Scrutiny Report — U-FGE03

### FILE 1: CADCorpusFeaturePrevalenceLearnerEngine.ts

**Path resolution cross-check (the load-bearing wiring invariant):**

`persistLearned()` (lines 321-324):
```
engineDir = dirname(fileURLToPath(import.meta.url))   // dist/engines/
mcpRoot   = resolve(engineDir, "..", "..")            // dist/engines → dist → mcp-server  ❌
overlayPath = resolve(mcpRoot, "data/state/cad-learned-prevalence-overlay.json")
```

`overlayPathResolved()` in FILE 2 (lines 637-639):
```
engineDir = dirname(fileURLToPath(import.meta.url))   // dist/engines/
mcpRoot   = resolve(engineDir, "..", "..")            // dist/engines → dist → mcp-server  ❌
```

**P0 — verify the climb depth against the actual build layout.** Both files use identical `resolve(engineDir, "..", "..")` from `dist/engines/X.js`. Walk it: `dist/engines` →(`..`)→ `dist` →(`..`)→ `mcp-server`. So `mcpRoot` = `mcp-server/`, and the final path = `mcp-server/data/state/cad-learned-prevalence-overlay.json`. **The two files DO resolve to the identical absolute path** — the writer and reader agree. The comments in both files ("`dist/engines/X.js` → `../..` = `mcp-server/`") are accurate. This is **correct** — the depth is consistent across both files and matches the U-FGE01 anchor convention. *No path-mismatch defect.* (I flagged this for explicit verification because the spec called it out as the make-or-break; it passes.)

One subtlety worth a **P3**: the comment on line 321 says `dist/engines/...js -> ../.. = mcp-server/` but only if the compiled output really lands at `dist/engines/`. If esbuild bundles to `dist/index.js` (single-file bundle, common in this repo per `npm run build:fast`), `import.meta.url` would be `dist/index.js` and `resolve("..","..")` from `dist` overshoots to the repo parent. **However**, both files share the *same* miscalculation if so, so writer and reader still agree — the 
... [+13704 chars truncated]
