---
name: echo-undone-h2-h6-2026-05-20
description: "ECHO-UNDONE survey H2-H6 shipped+wired — 3 system-viz layers, NN feedback loop, handoff-prune cron. All H1-H6 complete."
aliases: reference_echo_undone_h2_h6_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.565Z
---


# ECHO-UNDONE H1–H6 — all complete and wired (2026-05-20, slot echo)

The ECHO-UNDONE-2026-05-18-19 survey listed six undone Track-H items. All six
shipped this session. H1 has its own memo ([[reference_u_tribal_to_wiki_promote_2026_05_20]]);
this covers H2–H6.

- **H2/H3/H5 — U-VIZ observability layers.** `scripts/generate-echo-viz-layers-features.mjs`
  — one generator, three pure layer functions: tribal corpus, live agents/chat-slots,
  active handoffs → `echo-viz-layers-augmentation.json`. Commit `7ceab4ce8`.
  Wired: `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` 4-site splice. 26/26 tests.
  Key fix: 4 anchored `HANDOFF_INSTANCE_PATTERNS` regexes — the greedy splitter
  mis-parsed `Agent@DESKTOP-N7MI1VB_<uuid>` (dashed hostnames) and `Claude-<uuid>`.

- **H4 — U-NEURAL-FEEDBACK-LOOP.** `scripts/nn-feedback-to-memory.mjs` reads
  `state/shared/nn-graph/retrain-lifecycle.jsonl`, selects `trained===true` rounds,
  writes `reference`-type memory entries (idempotent via a captured-ids sidecar).
  `oneLine()` sanitizer prevents YAML-frontmatter newline injection (R12). 15/15 tests.
  Wired: `nn-graph-retrain-lifecycle.mjs` best-effort spawns it. Shipped via absorbed
  peer commit `58345a0a74` (index.lock race → misattribution; work on-branch + correct).

- **H6 — U-HANDOFF-PRUNE-CRON.** `scripts/handoff-prune-cron.mjs` — monthly cron that
  ARCHIVES (a MOVE, never delete) handoffs untouched >30d into
  `state/shared/handoffs/archive/<YYYY-MM>/`. Age = frontmatter `written_at` (mtime is
  reset by git checkout + C:->H: mirror). Dry-run default; 30d self-throttle. 14/14 tests.
  Commit `84e0eb555f` (cron+test) + `7fcbe2f72` (wired into `handoff-memory-seed-stop.mjs`
  Stop hook as a detached non-blocking piggyback). Per-file 2-of-2 + end-of-task 3-of-3
  all PASS.

## H6 P2 follow-ups (logged — not blocking; 3-of-3 graded PASS)

The 3-of-3 reviewers (arms B+C, independent) surfaced deferrable P2s on H6:
- `writeThrottle()` uses a bare `fs.writeFileSync` — not atomic. Switch to
  temp-file + `renameSync`; consider an O_EXCL lock around the apply block.
- The 30d throttle de-conflicts apply-runs across MONTHS but NOT the
  first-of-month Stop burst: across the 26-chat fleet, every chat hitting Stop
  before any has written the throttle sees `shouldRun→true` and applies
  concurrently. Self-healing + harmless (per-file `existsSync(dest)` collision
  skip + JSON-parse-fail → treat as no-run), but the in-code "single-instance…
  no concurrent archiver can race" TOCTOU comment overstates the guarantee.
- The throttle gate is checked AFTER the full 587-file directory scan +
  per-file `written_at` read — so the 29/30-day "no-op" still does the whole
  scan every Stop. Move the throttle-mtime check ahead of `readHandoffFiles`.
- `main()`/apply-path has no unit tests (pure core fully covered) — disclosed
  in the commit body as an accepted deferral.

Related: [[reference_u_tribal_to_wiki_promote_2026_05_20]] · [[handoff-prune-cron]]
