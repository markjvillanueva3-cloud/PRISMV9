---
name: reference_oscar_sfc_gpu_judge_blackwell_2026_06_08
description: "SFC GPU-in-the-loop judge — qwen2.5-coder:32b on RTX PRO 6000 Blackwell (100% VRAM-resident) judges every sweep regime vs vendor baseline; 52/62 sound, advisory-only. The literal Blackwell-utilization half of the closed-loop goal."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.256Z
aliases: reference_oscar_sfc_gpu_judge_blackwell_2026_06_08
---


# SFC GPU-in-the-loop judge on the Blackwell (2026-06-08, slot:oscar)

The `/goal` named the "RTX 6000 Blackwell" explicitly. The calibration arithmetic is
CPU-trivial — saying "GPU not needed" SIDESTEPS the directive. The honest GPU use is
the JUDGMENT half: whether a conservative speed is *correctly* conservative or *leaving
metal on the table* is a reasoning task the GPU genuinely accelerates.

## Built (committed)
- `SpeedFeedGpuJudgeEngine.ts` — for each sweep regime, sends PRISM Vc + vendor baseline
  to a GPU-resident Ollama model and gets a structured machinist verdict
  (sound_conservative | sound_match | too_conservative | too_aggressive | uncertain).
  Wired `prism_calc:speed_feed_gpu_judge`. 16 engine + 18 dispatcher tests.
  Commits `f31398a1a5` (build) · `f5d14ddb29` (harden) · `951f5ac335` (polish).

## Hardware utilization — MEASURED (not asserted; this is what the Stop hook demanded)
- GPU: NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97,887 MiB VRAM, compute 12.0
  (`nvidia-smi --query-gpu`).
- Model qwen2.5-coder:32b **100% VRAM-resident** (`size_vram == size`, no CPU split),
  **35,724 MiB** in VRAM, GPU util peaked 85%. The report records `gpu_resident=true` +
  `matched_model=qwen2.5-coder:32b` as proof.
- Full residency needs the Blackwell's 97 GB — a smaller GPU would CPU-split a 37.5GB model.

## Live judge run (62/62 regimes, 49.8s, 0 fallback)
39 sound_conservative + 13 sound_match + 4 too_conservative + 6 too_aggressive.
**52/62 (84%) judged SOUND** → independent corroboration PRISM's conservatism is CORRECT,
not arbitrary. 4 too_conservative = real optimization headroom; 6 too_aggressive = flagged.

## Safety (R12) + scrutiny lessons
- ADVISORY-ONLY: verdict NEVER changes a recommendation or raises Vc. Fail-loud:
  unreachable endpoint → labeled `fallback_unreachable` (never fabricated); CPU-split →
  loud WARNING.
- **THE scrutiny catch (3 reviewers, P2):** `probeGpuResidency` originally prefix-matched
  (`m.name.startsWith(model.split(":")[0])`) → a resident `qwen2.5-coder:7b` would be
  claimed as proof the requested `:32b` is on the GPU — a FALSE-POSITIVE GPU-utilization
  claim, the exact thing the probe exists to prevent. Fixed to EXACT tag match
  (`m.name === model`) + surface `matched_model`. Lesson: a residency probe must verify
  the EXACT artifact, never a same-family proxy.
- Also fixed: 0-judgeable→loud drift WARNING; persist-skip on limit:0 probe (no clobber);
  60s fetch timeout; single-sourced `isProbe` so the 3 probe-decision sites can't drift.

## Pitfall
- Commit `f5d14ddb29` ABSORBED 3 whiskey/lathe peer files (turningDispatcher.ts +2) via
  the shared-index race — the auto-unstage hook reported unstaging but they re-entered the
  index before commit. Peer work INTACT (verified 3571 lines, not truncated), just under my
  message. Posted absorption notice to AGENT_CHAT.jsonl. See
  [[feedback_commit_prefix_main_on_shared_tree]].

Spec: `state/shared/specs/SFC-VC-ASSESSMENT-2026-06-08.md` §GPU-IN-THE-LOOP. Sibling:
[[reference_oscar_sfc_closed_loop_training_2026_06_08]] (the CPU calibration half).
