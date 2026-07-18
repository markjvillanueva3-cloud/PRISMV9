---
name: reference_romeo_already_wired_guard_2026_06_17
description: romeo triage ALREADY-WIRED guard catches audit false-negatives (engines wired via *Dispatch wrapper-export) -- XProc proof; tango owns the audit fix
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.147Z
aliases: reference_romeo_already_wired_guard_2026_06_17
---


ROMEO VERIFICATION + GUARD (slot:romeo, 2026-06-17, commits `0f01a00fcf` + `5a0e262b71` on cad-fusion-live-ms0). Under the operator's "continue in engineered loops/harnesses/ollama optimally" + ultracode, with romeo's clean wire queue exhausted, I ran an exhaustive per-engine verification of all 18 "unwired" engines (grep each vs the dispatcher tree + read source) to PROVE exhaustion rather than trust the suffix heuristic.

**FINDINGS (16 confirmed correct; 2 surfaced):**
1. `reactiveChainBootstrap` -- its only dispatcher "ref" is a COMMENT (`// Skipped (3): ... reactiveChainBootstrap`) -> correctly WIRE-EXEMPT (no live wire).
2. `XProcNeuralAutoFireEngine` -- **GENUINELY ALREADY WIRED**: aiReasoningDispatcher routes `xproc_autofire_{activate,deactivate,status}` -> `import(".../XProcNeuralAutoFireEngine.js").xProcNeuralAutoFireDispatch` (routes :719-721, switch cases :2823-2825, export :493). But `audit-unwired-engines.mjs` LISTS IT UNWIRED -> a confirmed **audit FALSE-NEGATIVE**: the audit's reference detection misses engines wired via a `*Dispatch` WRAPPER-EXPORT (the dispatcher imports the engine FILE but calls a dispatch fn, not the singleton symbol).

**FIX (romeo-lane = the triage harness `scripts/romeo-wiring-triage.mjs`):** added `alreadyDispatcherWired(name, corpus=dispatcherCorpus())` -- scans a COMMENT-STRIPPED dispatcher corpus with a BOUNDARY-ANCHORED regex `[/"'\`]<name>\.js\b` (regex-escaped) for the engine's source import. `classify()` runs it FIRST and returns a new `ALREADY-WIRED` verdict (owner=tango) -> a 5th output bucket. Romeo never double-wires a wired engine; the audit miss is surfaced. Live: XProc moved cross-domain -> ALREADY-WIRED; partition 0 wireable / 1 cross / 14 exempt / 2 review / 1 already-wired = 18.

**SCRUTINY HARDENING (3-of-3, arm C first FAILED):** the initial match was an UNANCHORED `corpus.includes("<name>.js")` -> a strict SUFFIX of a wired filename would false-positive (e.g. a future "FooEngine" matching "SuperFooEngine.js") -> silently HIDE a real romeo wire (the DANGEROUS direction). Fixed with the boundary anchor (require `/` or quote before the name); arm C re-verified 0 false-positives on the live corpus + flipped to PASS. Also extracted+unit-tested `stripDispatcherComments` (arm B P1: the comment-not-counted test had been passing for the wrong reason). 23/23 tests, clean 3-of-3.

**TANGO HANDOFF (the upstream fix, tango's lane = discovery/audit):** `audit-unwired-engines.mjs` should detect `*Dispatch` wrapper-export wiring -- match `import(".../<Engine>.js")` (the file import), not just the singleton symbol. XProc is the proof case, likely NOT the only fleet-wide false-negative. Until then, romeo's triage self-corrects via the ALREADY-WIRED guard.

**LESSON.** "Existence != correct" applies to a tool's CLASSIFICATION too: prove exhaustion with per-engine evidence, don't trust a heuristic. A reference-detector that matches a SINGLETON symbol misses wrapper-export wiring; a substring matcher must be path-boundary-anchored or it false-positives in the silent-capability-loss direction. Sibling of [[reference_romeo_triage_ctor_parse_fix_2026_06_17]] (same harness, same session) + [[feedback_verify_unwired_against_shared_tree]].
