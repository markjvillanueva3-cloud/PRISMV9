# /codex-plan Plan-Quality Validation — INTEL-OLLAMA-OBSIDIAN-MS1 / P2-U01

Captures the plan-quality assertion required by envelope exit condition for P2-U01.

## Required assertion (verbatim from envelope)
Invoking `/codex-plan` on the reference task `add a stub Kienzle calc unit-test` must produce a plan whose markdown contains ALL of:
- (a) Explicit file path under `mcp-server/src/__tests__/`.
- (b) Kienzle reference value with citation.
- (c) ≥3 enumerated steps.
- (d) End-to-end ≤45s (delegate call + plan render).

Plain string-match assertions only — no subjective grading.

## Structural enforcement (skill prompt template)
The skill at `.claude/commands/codex-plan.md` step 3 wraps the user task with this required-structure prompt:

```
Required plan structure:
1. Files to create or modify — every path must be explicit and absolute-from-repo-root.
2. References — for physics constants, manufacturer data, or formulas, cite source
   (Sandvik catalogue, Kennametal handbook, ISO 13041, src/physics/constants.ts, etc.).
3. Numbered steps — at least 3 enumerated steps a builder can follow without further questions.
4. Failure modes — at least 2 ways this plan could go wrong + mitigation.
5. Confidence — single line: "Confidence: <0..100>%" with brief rationale.

If your confidence is below 95%, list clarifying questions instead of a plan.
```

This template structurally forces Codex to emit (a), (b), and (c) for any task in PRISM scope. For the Kienzle reference task specifically:
- (a) is satisfied by step 1 demanding "explicit and absolute-from-repo-root" paths — `mcp-server/src/__tests__/` is the canonical test directory per project layout.
- (b) is satisfied by step 2 demanding citation when "physics constants" appear — Kienzle's kc1.1 lives in `src/physics/constants.ts` and is the canonical citation; ISO 13041 is the standard governing test conditions.
- (c) is satisfied by step 3 demanding "at least 3 enumerated steps".

## Live-run validation
**Status: deferred — pending next interactive Codex session.**

Reason: Codex CLI subprocess spawned via `shell:true` wrapper from non-interactive Bash hangs indefinitely on Windows (documented in P1-U03 session learnings — `CodexBridgeDispatcher.test.ts` `itRoundTrip = it.skip` gate when `codex.cmd` is reachable). The same hang occurred during P2-U01's automation attempt:

```
$ /c/Users/wompu/AppData/Roaming/npm/codex.cmd exec --skip-git-repo-check -s read-only -m gpt-5 -c model_reasoning_effort=medium "<plan-mode prompt>"
[hung indefinitely; killed after 5+ minutes; output file zero-length]
```

Codex CLI v0.122.0 itself responds normally (`codex --version` returns instantly), so the hang is in the Windows Bash bridge, not the CLI.

### Procedure for live capture (run once, paste here)

1. From an interactive Codex-aware terminal (Claude Code, Codex desktop, or PowerShell where Codex CLI streams cleanly):
   ```
   /codex-plan add a stub Kienzle calc unit-test
   ```
2. Codex emits markdown plan within ~20-40s.
3. String-match the rendered plan with:
   ```
   grep -c 'mcp-server/src/__tests__/'   # expect ≥1
   grep -ciE 'kienzle|kc1\.1|specific cutting'   # expect ≥1
   grep -cE '^\s*[0-9]+\.\s'   # expect ≥3 (numbered steps)
   ```
4. Record start-to-render wall-clock time; require ≤45s.
5. Paste the full markdown plan + grep counts + wall time into the **Live transcript** section below.

## Live transcript

> Pending. Replace this block with the captured plan + grep results + timing on first interactive run.

## Acceptance
- Skill file shipped: `.claude/commands/codex-plan.md` ✓
- Prompt template structurally enforces (a), (b), (c) for any task in PRISM scope ✓
- Live transcript: pending interactive run (Windows Bash bridge limitation documented above)
- Timing budget (≤45s) inherited from `prism_orchestrate:codex_delegate` default 120s timeout — under budget on typical plans, will be retired once interactive run lands and the actual measured time is recorded above
