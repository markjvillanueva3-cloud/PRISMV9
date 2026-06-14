---
name: oscar-segmented-calibration-2026-06-01
description: "U-OSC9-SEGMENTED-CALIBRATION shipped (commit b80a1e6365) — per-(iso x regime) L1 speed/feed calibration on SpeedFeedDeepLearningEngine, write==read coherent, backward-compatible; answers the operator's per-material/finish design question at the calibration layer. + EOL-index lesson (slot:oscar)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.245Z
aliases: reference_oscar_segmented_calibration_2026_06_01
---


Answers the operator's 2026-05-31 design question ("separate calculators per material/tool/finish/rough-semi-fine?") at the **calibration layer**, NOT by duplicating physics (that's the JC-fragmentation anti-pattern). The physics stays ONE parameterized core; the L1 self-learning calibration becomes per-segment.

**SHIPPED — U-OSC9-SEGMENTED-CALIBRATION (commit b80a1e6365):** `SpeedFeedDeepLearningEngine`'s single GLOBAL `calibrationFactors` → `globalFactors` (fallback) + `segmentFactors: Map` + `segmentSampleCount: Map`. `recordFeedback` gains an OPTIONAL 4th `context?: {material,toolMaterial,regime,operation}` arg — backward-compatible (context-less feedback is byte-identical to before: trains global, no segment). Per-segment warmup>=5 seeded from current global; `getCalibrationFactors(segmentKey?)` per-metric fallback to global when starved (<5) or NaN; `[0.5,2.0]` clamp + NaN-safe apply (closes a latent unbounded-drift bug both reviewers flagged). `export class` + engine `getCalibrationFactors(key?)` accessor + `export composeSegmentKey` for testability. additive `getStats().segments`.

**SCOPE (deliberate, documented — NOT silent):** SPEED + FEED are segmented, keyed `iso|_|regime` (**tool-agnostic** — the speed/feed prediction model assumes carbide, so the WRITE key `composeSegmentKey({material,regime})` EQUALS the predictSpeed/predictFeed READ key → write==read coherence, machine-verified by test T7). **tool_life + surface_finish stay on GLOBAL** — their coherent per-metric segmentation (`iso|tool|_` and `_|_|regime`) needs per-metric write-key routing, deferred to **U-OSC9-SEG-TOOLLIFE-SURFACE** (task #50).

**KEY LESSON — the per-file scrutiny gate EARNED ITS KEEP:** my first implementation stored ALL 4 metrics under one `composeSegmentKey(context)` key but each predict site READ a different key (predictSpeed hardcoded carbide; tool_life omitted regime; surface regime-only) → write-key ≠ read-key → the loop wouldn't close for non-carbide / tool_life / surface. Reviewer B caught it (P2-1). Fix = tool-agnostic speed/feed key + global for the others + T7 coherence test. **Always test write-key==read-key coherence end-to-end, not just the store in isolation.**

**EOL LESSON (reusable doctrine):** `SpeedFeedDeepLearningEngine.ts` was **CRLF on disk but LF in the git index** (`git ls-files --eol` → `i/lf w/crlf`, `core.autocrlf=false`). My CRLF-preserving Python edit matched disk but git saw a full-file rewrite (1361/1279). FIX: converted working file to LF (matches index) → clean 119/31 diff. **RULE: before choosing CRLF-preserve vs the Edit tool (LF), check `git ls-files --eol <file>` (the INDEX EOL), not just the disk bytes.** calcDispatcher.ts IS crlf-in-index (CRLF-preserve correct there); this engine is LF-in-index.

**FOLLOW-UPS:** #49 U-OSC9-SEG-CALIB-FORWARD (forward context from bridges/dispatcher so segments POPULATE in production — the core is dormant until then); #50 U-OSC9-SEG-TOOLLIFE-SURFACE (per-metric keys + fix pre-existing unbounded feedbackHistory O(N^2) per Reviewer B P1-1); the 2 live-:3100-audit speed-feed bugs oscar owns ([[reference_sfc_speed_feed_bugs_2026_05_31]]).

Relates to [[oscar-hsmadvisor-live-wire-2026-06-01]], [[oscar-sfc-close-loop-2026-05-31]], [[oscar-jc-multifit-registry-u1-2026-05-31]] (don't-duplicate-physics). Wiki: [[sfc-segmented-calibration]].
