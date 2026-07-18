---
name: feedback_advisory_offload_telemetry_not_a_gap
description: "An ADVISORY offload hook's `offloaded:0` in ollama-offload-stats.json is CORRECT-BY-DESIGN (it nudges, it does not offload) -- do NOT misread it as a dead/broken utilization path. Verify the REAL converters before claiming an offload-utilization gap."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.396Z
aliases: feedback_advisory_offload_telemetry_not_a_gap
---


**Advisory offload telemetry is NOT an offload gap** (slot:alpha, 2026-06-25, verified U1+U4 of the
octopus-hermes-ollama-synergy /goal).

**The trap:** `mcp-server/data/state/ollama-offload-stats.json` shows several `byHook` entries with a
high `fired`/`suggested` and `offloaded:0` (e.g. `large-read-digest-advisory` 484 fired -> 0 offloaded,
`grep-index-first` 729 -> 0, `ollama-route-pretooluse` 945 -> 0). It LOOKS like a dead utilization path.
It is NOT -- those are **advisory** hooks: they emit a `/ollama-summarize` / digest / index NUDGE in
`additionalContext`; they NEVER perform an offload themselves. `offloaded:0` is the CORRECT, expected
value for an advisory hook -- conversion is the model's choice on the next turn, not the hook's act.

**Before claiming an "ollama offload utilization gap," check the REAL converters (R12):**
- `byHook['ask-hermes'].tokensSaved` -- the Hermes OAuth-proxy bridge (the xAI/Grok backbone). The
  workhorse; was ~479k tokens saved on 2026-06-25 and growing. THIS is real offload.
- `byHook['ollama-task-offloader'].offloaded` -- the auto-exec directive emitter (real `ask-ollama`
  runs; ~60 real offloads).
- `ollama-route-pretooluse` DOES offload when `mode:auto` + a gist-safe bulk file is Read (proven live:
  a 1MB .log -> 1.5b gist). Its "0" was a telemetry-window artifact (no gist-safe bulk read that window).

**Also:** the advisory hooks are already wired to `scripts/lib/advisory-decay.mjs` (`decayDecision`
CALLED, not just imported -- large-read-digest L176, grep-index L539) so a proven-noise advisory
(high-suggest / ~0-take) self-MUTES. And `0 refs in settings.json` does NOT mean unwired -- many hooks
fire via bundles (`read-bundle.mjs`, grep bundle); the telemetry `fired` count is the proof of wiring.

**Rule:** an advisory hook firing a lot with `offloaded:0` is healthy-by-design, not a bug. Don't
fabricate a "fix" (R12). Measure the CONVERTER hooks' tokensSaved/offloaded for the real utilization
signal. Sibling lesson: [[reference_ollama_generative_stratified_harness_2026_06_25]] (false-0 misread).
