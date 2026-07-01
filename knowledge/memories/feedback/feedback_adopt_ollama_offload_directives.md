---
name: feedback_adopt_ollama_offload_directives
description: "When the ⚡ AUTO-OFFLOAD directive fires, ACTUALLY run ask-ollama -- don't re-derive on Claude. Adoption is the verified offload-rate bottleneck, not the infra."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.395Z
aliases: feedback_adopt_ollama_offload_directives
---


The Ollama-offload INFRASTRUCTURE is mature, armed, and working (verified 2026-06-12): the
`PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` knob is set, `ollama-task-offloader` correctly fires the
`⚡ AUTO-OFFLOAD (<category>) -- route this to local Ollama, do NOT re-derive it` directive with a
ready-to-run `node scripts/ask-ollama.mjs <mode> <file>` command, and the Ollama-down path falls back
to cheap-Claude (sonnet/haiku), never opus. **The bottleneck for the ~9% offload rate is ADOPTION --
the directive fires and I ignore it** (the dashboard shows 143 silent suggestions, a handful of actual
offloads). The "kept on Claude" cases are mostly CORRECT (orchestration / operator-directives / deep
reasoning genuinely belong on Claude); the miss is the file-target mechanical tasks that DO get the ⚡.

**Rule:** when a `⚡ AUTO-OFFLOAD` directive (or the model-tier-advisor "OFFLOAD to Ollama" block)
appears, **run the suggested `ask-ollama` command FIRST and relay the result** -- do NOT re-derive the
summary/explanation/triage on this (opus) session. ask-ollama FILE_MODES are `summarize` / `explain` /
`triage` (a file path, or `-` for stdin). This is quality-SAFE: the file→digest is line-anchored and
verifiable -- spot-check any load-bearing claim against the cited source line, exactly as the yolo-mode
doctrine prescribes ("trust the digest, spot-check, skip the full Read").

**Only keep it on Claude when** the task needs cross-file reasoning Ollama can't see, OR it is
safety/physics (Ollama lacks `physics/constants.ts` -- the SAFETY_PRE gate already refuses those), OR
it is genuine orchestration / deep reasoning. Otherwise: offload it.

This is the same discipline as [[feedback_auto_route_mechanical_fanout_to_ollama]] (smartFanout for
fan-out) applied to the single-task path. Architectural truth that bounds the rest: a UserPromptSubmit
hook cannot call Ollama on a file itself (no file context), and a big Read cannot be auto-blocked
without risking quality (Read-before-Edit + digest-can-miss) -- so the fleet relies on ME acting on the
directive. Pairs with [[feedback_utilize_ollama_for_efficiency]] + the offload dashboard
(`node scripts/ollama-offload-dashboard.mjs`).
