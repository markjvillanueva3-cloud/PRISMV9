---
name: reference-iter2-html-adopt-misattribution-2026-05-18
description: "Commit f5403a8274 (banner [KNOWLEDGE-ENRICH-MS0]/U-KE01) actually also carries [HTML-ADOPT]/U-HTML-COMPANION-SRCHASH — 6-file HTML drift-detection cluster"
aliases: reference_iter2_html_adopt_misattribution_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.164Z
---


**2026-05-18, slot lima (claude-bca3789f).** Iter2 of the HTML+RTK /loop — the
adopt of slot kilo's HTML source-hash drift-detection cluster — was completed,
2-reviewer-scrutiny PASS/PASS, but got **swept into a peer's commit**.

`f5403a8274` — subject `[MAIN] [KNOWLEDGE-ENRICH-MS0]/U-KE01: enrich 439
roadmap units with knowledge bundle` — ALSO contains all 6 files of the
intended `[HTML-ADOPT]/U-HTML-COMPANION-SRCHASH` unit:
`.claude/hooks/html-companion-guard.mjs`, `.claude/hooks/__tests__/html-companion-guard.test.mjs`,
`scripts/md-to-html.mjs`, `scripts/lib/html-report-render.mjs`,
`scripts/emit-all-spec-html.ts`, `scripts/lib/md-to-html.test.mjs`.

**Root cause:** same shared-main-tree class as [[reference_cross_chat_commit_misattribution_2026_05_18]]
+ [[reference_iter11_cross_attribution_regression_2026_05_18]]. lima's
retry-loop commit script ran `git add -- <6 files>` into the shared `H:/prism`
index; before lima's own `git commit` could land (blocked first by index.lock
contention, then by a wedged peer `git commit` PID 64848, then by MSYS `fork()`
failures under host memory pressure), a peer's broad `git commit` for U-KE01
swept the staged index and committed lima's 6 files under the U-KE01 banner.

**Work is correct:** both test suites pass against HEAD — `html-companion-guard.test.mjs`
24/24, `md-to-html.test.mjs` 19/19. The Option-B deferral (ROOT_DOC arm removed
from `isCompanionTarget`, root-doc targeting deferred to `U-HTML-GUARD-ROOTDOC`)
is intact. Only the commit banner is wrong.

**Not rewritten:** `f5403a8274` is 2+ commits deep on the shared branch
(downstream-visible) — history rewrite is forbidden/destructive. Future
commit-subject audits must apply the manual override
`f5403a8274 → also [HTML-ADOPT]/U-HTML-COMPANION-SRCHASH`.

**Why:** the shared `H:/prism` main tree has no per-chat index isolation; any
`git add` is visible to every peer's next `git commit`.
**How to apply:** work in the slot worktree (`slot/<nato>`), or use
`git commit -- <pathspec>` and commit FAST after `git add` to shrink the
sweep window. See [[feedback_chat_lane_discipline]] and the new wiki
`knowledge/wiki/.../git shared-index hazards` (peer commit `359245c7a0`).
