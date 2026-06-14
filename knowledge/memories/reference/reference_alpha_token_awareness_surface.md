---
name: reference_alpha_token_awareness_surface
description: alpha's custom domain awareness surface — token-awareness-snapshot.mjs + auto-inject hook (11-leg PSN audit)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.020Z
aliases: reference_alpha_token_awareness_surface
---


slot:alpha built a custom domain awareness surface (2026-05-29, SYNERGY goal) so future alpha sessions always have token-optimization domain context — the oscar SFC-AWARENESS pattern applied to token-optimization:

- **Generator:** `scripts/token-awareness-snapshot.mjs` — pure core (`computeAwareness`/`renderMarkdown`) + injectable fail-soft readers + 2-path resolver (worktree→H:/prism fallback; **fleet-shared telemetry reads integration-tree-first** so a stale slot worktree doesn't report stale numbers). Emits `state/shared/TOKEN-OPTIMIZATION-AWARENESS.md` (+ `--json`/`--stdout`). 13 `node:test` cases incl. real-data E2E + 3 regression guards.
- **Output:** an 11-leg PSN synergy audit (Obsidian/PRISM-OS/Wiki/Memories/Tribal/SystemViz/Engines/Algorithms/Formulas/NN-GNN/PRISM-AI) + live token-economy metrics (Ollama offload ratio, PSN cumulative savings). Verdict 🟢/🟡/🔴. Legs that aren't deterministically file-checkable are marked ⚠ UNKNOWN (R12 — never silently green).
- **Auto-inject hook:** `H:/.claude/hooks/alpha-token-domain-awareness-inject.mjs` (SessionStart, **alpha-gated** — silent for every other slot), wired in `H:/.claude/settings.json`. Distinct from `token-awareness-inject.mjs` (the live GREEN/YELLOW/RED zone block). Knob `PRISM_TOKEN_AWARENESS_INJECT_DISABLE=1`.
- **Regenerate:** `node scripts/token-awareness-snapshot.mjs`. First run: 🟡 PARTIAL 6🟢/3◐/0○/2⚠ (offload ratio 9.7% — below 30% target = the standing alpha discipline gap).

Bugs found by running it (R12 verify-don't-trust): stale-worktree-first resolver read ollama 2/1 instead of live 199/1843; `Last master-sync:` regex didn't handle `**bold**`; psn field is `totals.savedTokens`. All fixed + regression-tested. Related: [[reference_oscar_sfc_awareness_surface_2026_05_28]], [[reference_alpha_psn_savings_detectors]].
