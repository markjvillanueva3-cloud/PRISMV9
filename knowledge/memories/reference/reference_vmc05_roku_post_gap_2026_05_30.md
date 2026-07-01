---
name: reference_vmc05_roku_post_gap_2026_05_30
description: "VMC-05 Roku-Roku (Fanuc 31i-B5) is ALREADY covered by the verified PP-FANUC-5AX-001 \"Fanuc 30i/31i 5-Axis Mill Post\" — NOT a missing-post gap. Only minor gap = no explicit VMC-05→post binding. Awareness banner \"no registered post\" is over-cautious."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
aliases: reference_vmc05_roku_post_gap_2026_05_30
---


# VMC-05 Roku-Roku post — RESOLVED as a NON-gap (foxtrot, 2026-05-30)

The foxtrot awareness banner flags "VMC-05 Roku-Roku Fanuc-31i (no registered post — **verify**)". On clean deterministic verification (after two tool-glitched false starts this session — see Lesson), the answer is: **a verified post already covers it.**

## Ground truth (deterministic `node fs` reads — NOT grep, which glitched this session)
- `src/registries/PostProcessorRegistry.ts` defines **`PP-FANUC-5AX-001`**: name "Fanuc 30i/31i 5-Axis Mill Post", `controller: "Fanuc 30i/31i-B5"`, caps `G43.4 TCP` + `G68.2 tilted work plane` + smooth TCP, `verified: true`, `confidence: 0.93`, notes: "Validated against Okuma M460V-5AX (JM Die VMC-02)." Also `PP-FANUC-3AX-001` ("Fanuc 0i/30i/31i 3-Axis Mill Post", validated vs Haas VMC-03/04).
- JM Die **VMC-05 = Roku-Roku, controller Fanuc 31i-B5** → squarely within `PP-FANUC-5AX-001`'s declared coverage (Fanuc 30i/31i-B5, 5-axis mill).
- `machine-post-enriched.ts` has **no `post_processor_id` field at all** (0 occurrences) — machine→post resolution is by controller-string match, not an explicit per-machine post id. So there is no "VMC-05 points at a missing post" problem.

## Conclusion / how to apply
**NOT a missing-post gap.** VMC-05 resolves to `PP-FANUC-5AX-001` by its Fanuc 31i-B5 controller today. The only minor, optional improvement (echo's domain): add an EXPLICIT VMC-05→PP-FANUC-5AX-001 binding + correct the over-cautious "no registered post" line in `foxtrot-mill-awareness-inject.mjs`. Chat-bus: echo received the final accurate status (2 earlier foxtrot msgs were tool-glitch errors, retracted).

## Lesson (R12)
Three chat-bus messages were needed because the first two were built on **glitched grep/read output** (garbled, contradictory, double-printed) during a heavy session (RAM pressure). Deterministic `node fs.readFileSync(...).includes(...)` is the reliable check; broad recursive grep was not. Never broadcast "confirmed/grep-confirmed" to peers off a single flaky read — verify deterministically first. [[feedback_verify_actual_contract_not_proxy]] · [[feedback_always_fill_gaps]] (a gap must be REALLY verified before claiming it).
