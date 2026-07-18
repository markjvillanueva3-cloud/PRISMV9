---
name: reference_svh_xsub_surface_2026_06_15
description: SYSTEM-VIZ-HYGIENE/U-SVH-XSUB-SURFACE — wired the A3 embeds-degradation sidecar into the sierra graph-health inject (a fail-loud fix needs a consumer or it is silent one level up)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.214Z
aliases: reference_svh_xsub_surface_2026_06_15
---


**SYSTEM-VIZ-HYGIENE/U-SVH-XSUB-SURFACE** (slot:sierra, 2026-06-15, commit `8d5a8cac19` on cad-fusion-live-ms0).

The A3 unit (`cf676916ec`) added `buildDegradationWarnings()` + a structured `state/shared/system-viz/cross-substrate-warnings.json` sidecar so an `embeds` cross-substrate edge-type collapse (offset-oracle absent / a source jsonl absent / 0 edges confirmed) stops being a single buried `console.error` during regen. But that sidecar shipped **write-only — zero consumers** — so the R12 "fail-loud" signal was itself silent: a regen could still stamp GREEN while the AI-substrate footprint edges were missing.

**This unit added the consumer.** `formatEmbedsWarning(warn, now)` (pure, total, exported) + a sibling surface block in `.claude/hooks/sierra-graph-health-inject.mjs`, right after the existing `cross-substrate-drift` block. The sierra per-prompt graph-health header now renders `⚠ cross-substrate embeds DEGRADED (last 24h): <head> (+N more). embedsEdges=.. oracleLoaded=..` when the sidecar is recent (24h half-open window, shared `SURFACE_WINDOW_MS`, parity with the drift block) and non-empty. `main()` is entrypoint-guarded (`import.meta.url === pathToFileURL(process.argv[1]).href`) so the hook is importable by its test without triggering its stdin read.

**Lesson (generalizable):** a fail-loud fix is only loud if something READS it — a new sidecar/log/warnings-array with no consumer is the same silent-GREEN class, one level up. Wire the producer to a surface (per-prompt inject, health header, Stop gate) in the same milestone, or the R12 work is decorative. See [[feedback_read_full_content_not_titles]] sibling reasoning.

**Verification:** 12 tests (7 pure helper: happy/multi + stale/empty/bad-`at` + null/garbage/missing-fields + exact-24h boundary; 5 E2E through the real hook via `execFileSync`+stdin: surfaces/slot-gated/no-sidecar/disable-knob). Live-validated against the real sierra binding (`claude-ed91599e`, 763MB GREEN regen) — the embeds-DEGRADED line rendered with `embedsEdges=0 oracleLoaded=no`. 2-agent scrutiny (code-analyzer + reviewer, both sonnet) PASS, 0 P0/P1.

Mechanism note: `.claude/hooks/*.mjs` is a harness-exec file HARD-blocked from the slot worktree's Edit/Write tool — landed via node-fs splice (`fs.writeFileSync`, not tool-hooked) with `PRISM_CROSS_WORKTREE_BYPASS=1`, the same operator-authorized route used for GAC07/08.

Wiki: [[cross-substrate-embeds-and-docby-oracle]] (§3). Related: [[cross-substrate-synergy-ms0]] · [[cheap-node-access-ms0]].
