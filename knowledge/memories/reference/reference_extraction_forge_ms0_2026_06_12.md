---
name: reference-extraction-forge-ms0-2026-06-12
description: EXTRACTION-FORGE-MS0 (slot:bravo) — when any extraction runs, forge-worthy CAPABILITIES are auto-detected + queued to forge-queue.jsonl; the autonomous /loop drains them via /forge-triple (dedup-gated). The "auto-apply forge-triple on extraction" the operator asked for.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.571Z
aliases: reference_extraction_forge_ms0_2026_06_12
---


**EXTRACTION-FORGE-MS0 (slot:bravo, 2026-06-12)** — operator: *"did you build so that anytime we run pdf
learn or video learn or any sort of data extraction, we automatically apply forge-triple?"* (the prior
EXTRACTION-INTAKE-MS0 ingests KNOWLEDGE; this adds the CAPABILITY-forge half.)

**Key constraint (R12):** `/forge-triple` is a Claude-driven 30-turn skill (it reasons + writes
engine+skill+hook code) — a hook CANNOT run it. So "auto-apply" = a hook DETECTS + QUEUES forge-worthy
extractions; the autonomous /loop drains the queue by running /forge-triple (dedup-gated). Operator chose:
**worthiness-gated queue, drained by the autonomous /loop** (AskUserQuestion 2026-06-12).

**Built (landed trunk `17b515fde9`, 11/11 tests):**
1. `scripts/lib/forge-worthiness.mjs` — `classifyForgeWorthiness(text)` coarse pre-filter: capability/math
   language minus tip-framing → {worthy, kind: engine|algorithm|formula, score, conceptName}. Reuses the
   `course-data-router-lib` FORGE thresholds (algorithm 0.5 / engine 0.6 / formula 0.3). **Coarse on purpose**
   — /forge-triple + DuplicationGuard is the REAL gate when the loop drains. Tested 6/6.
2. `scripts/extraction-forge-detect.mjs` (PRODUCER) — scans `knowledge/wiki/code-tribal/*.md`, classifies,
   appends worthy candidates to `state/shared/forge-queue.jsonl` (deduped by source, resumable). LIGHT (no
   537MB index load, no heap reexec). Live: 387 scanned → 25 worthy → seeded 5. Tested 3/3.
3. `.claude/hooks/forge-queue-inject.mjs` (CONSUMER, UserPromptSubmit T2) — in a /loop/build context,
   surfaces top-K (3) pending candidates + their `/forge-triple <kind>:<name>` action + a mark-done
   (`echo <src> >> forge-queue-done.txt`). Bounded + debounced (5min) + silent when empty. Tested 2/2.

**Wiring:** the existing `extraction-intake-trigger.mjs` PostToolUse(Bash) hook now spawns the detector too
(so extractions auto-queue capabilities); `forge-queue-inject` wired into settings.json UserPromptSubmit
(62→63, both C+H, validated+backed-up). Activates on next session start.

**Honest precision note:** the classifier is coarse — concept names are video titles, kind over-biases
"engine", and many candidates (chip thinning, CSS/G96) will correctly DEDUP-BLOCK at /forge-triple against
existing engines. That's the intended two-stage design (pre-filter → Claude+dedup gate), not a defect. The
/loop drain is bounded (3/loop) so dedup-blocked candidates cost little. Knobs:
`PRISM_EXTRACTION_FORGE_DISABLE`, `PRISM_FORGE_QUEUE_INJECT_{DISABLE,K,DEBOUNCE_MS}`. Sibling:
[[reference_extraction_intake_ms0_2026_06_12]]. Reuses: `scripts/lib/course-data-router-lib.mjs` thresholds.
