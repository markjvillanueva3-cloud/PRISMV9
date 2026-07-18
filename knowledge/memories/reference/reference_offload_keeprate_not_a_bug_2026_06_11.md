---
name: reference_offload_keeprate_not_a_bug_2026_06_11
description: The Ollama-offload 91% keep-rate is NOT a classifier bug -- verified working-as-intended. ollama-task-offloader.mjs already offloads mechanical work + correctly keeps judgment; broadening OFFLOADABLE_PATTERNS blindly degrades quality + isn't supported by live data.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.670Z
aliases: reference_offload_keeprate_not_a_bug_2026_06_11
---


# Offload keep-rate is NOT a bug -- the classifier is correct (2026-06-11, slot:sierra)

## The recurring (wrong) audit hypothesis
Efficiency audits (EFFICIENCY-UTILIZATION-QUEUE-2026-06-11 U-EFF-05, and earlier) keep flagging:
"Ollama offload only 9.2% / keep-classifier keeps ~91% on Claude -> broaden the classifier."
This is a Sonnet-agent hypothesis that does NOT survive reading the actual code + live data.

## Verified reality (read `.claude/hooks/ollama-task-offloader.mjs:84-153`)
- `OFFLOADABLE_PATTERNS` (12) ALREADY routes the mechanical work to Ollama: explain / summarize /
  what-does-X / document / docstring / format-convert / search-synthesis / list-engines /
  prism inventory+introspect+audit / git-summary / describe-file. (lines 88-101)
- `KEEP_ON_CLAUDE` (24) keeps GENUINELY judgment work: orchestration (`/checkin /loop /goal`),
  multi-file refactor, git ops, deep-reasoning (root-cause/assess/evaluate), operator directives
  (fix/diagnose/continue/sync), coordination directives. (lines 107-153)
- `SAFETY_PRE` gates safety+physics BEFORE the offload patterns (always keep).
- The classifier is conservative + left-anchored/word-boundaried to avoid mis-classifying casual
  verb mentions (e.g. "the /goal is ambitious" is NOT treated as orchestration).

## Why the keep-rate is HIGH and CORRECT
PRISM's prompt mix is genuinely orchestration/judgment-heavy (a 26-slot autonomous build fleet:
/checkin, /loop, /goal, operator directives, multi-file builds, deep reasoning). Those SHOULD stay
on Claude. The high keep-rate reflects the WORKLOAD, not a classifier defect. Routing judgment work
to a local model degrades answer quality -> wrong answers cost FAR more than the tokens "saved" ->
the OPPOSITE of efficiency.

## Why a "safe broadening" is not available here
A data-driven broadening would need a sample of the "unknown"-bucket KEPT prompts to find recurring
unambiguously-mechanical shapes. The live `ollama-offload-stats.json` event log has only ~7 events
(0 sampleable unknown-kept prompts). The audit's "38 unknown keeps / 805 kept" came from a larger
transcript-mined sample NOT present in live state. Without that sample, adding OFFLOADABLE patterns
is GUESSING -> mis-routing risk. So: do NOT broaden blindly.

## Disposition
- Offload keep-rate: **working as intended -- do NOT "fix".**
- The genuine offload lever is **keeping Ollama UP** (when it wedges, EVERYTHING silently falls back
  to Claude -- see [[reference_ollama_wedged_running_unreachable_2026_06_11]]). Restoring a wedged
  daemon is far higher ROI than re-tuning an already-correct classifier.
- If a future broadening is attempted, it MUST be data-driven from a real unknown-bucket sample +
  conservative (left-anchored) + A/B-measured on offload-rate AND answer-quality, never blind.

Pairs with [[feedback_ollama_fallback_sonnet_agents]] (when Ollama IS down, route mechanical work to
a SONNET subagent, never silently to session Opus).
