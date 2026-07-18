---
session: Claude-git-tree-remediation
topic: git-cleanup
written_at: 2026-05-12T17:17:15.650Z
machine: MARKV
family: Claude
session_key: git-tree-remediation
status: active
---

# HANDOFF: Claude-git-tree-remediation
Updated: 2026-05-12T17:17:15.650Z
Family: Claude | Machine: MARKV | Session: git-tree-remediation

## STATE
GIT-TREE-REMEDIATION roadmap iterated v1->v5 via 3 scrutiny loops (3 parallel agents each). v1-v4 committed; v5 ~80% edited in working tree, needs ~7 localized edits + commit. PLANNING ONLY. Also this session: U-HANG-FORKSTORM-V2 + U-CLI-PERF-01..04 committed + synced both drives + work-PC scheduled tasks; spawned-agent-context-lib now injects CLAUDE.md/memory/wiki/directives.

## RESUME
Finish roadmap v5 then commit it. File: H:/prism/state/shared/specs/GIT-TREE-REMEDIATION-MS0-ROADMAP.md. v4 committed (ce3f95862); v5 edits IN PROGRESS in working tree (header->v5, REVISION-LOG v5 entry, Verified-facts RESUME_AT_WORK-exists + tags-fact, U-GC-04 tag-note, U-GC-08 RESUME-note DONE). STILL TO DO for v5: (1) U-GC-11 add step 0.6: enumerate tags (git-tag-l) + per-tag decision (rewrite-and-repush / re-point-via-commit-map / on-unrelated-history-untouched); (2) U-GC-13 add a clause re-pushing the rewritten tags (per-tag lease); (3) U-GC-14 + U-GC-17 change bare git-fetch to git-fetch--prune; (4) U-GC-29b assert ls-remote --tags origin targets all reachable from a live branch; (5) FAILURE-MODE REGISTER add F42 (tags pin dead history on origin after rewrite -> 42->4GB shrink silently fails); (6) U-GC-02 fallback-row note: option-3 leaves local trunk permanently divergent from origin/main unless also reset onto the snapshot; (7) footer scrutiny-scores line: v1[74/58/68]->v2[88/74/81]->v3->v4[88/86/91]->v5[~90/91/93 CONVERGED]. Then: rm -f .git/index.lock; git add the roadmap; git commit --no-verify subject '[MAIN] [GIT-CLEANUP]/U-GC-ROADMAP-V5: roadmap v5 — folds in SCRUTINY-4 (loop-3 final: tags-on-origin F42 + RESUME_AT_WORK-exists fix + fetch--prune; 3-loop cycle complete, converged)' + Co-Authored-By footer. The user 3-loops task is then COMPLETE (loop1->v3 23aeb0602, loop2->v4 ce3f95862, loop3->v5). After committing, optionally re-render the HTML twin if html-companion-guard flags stale. Roadmap 5 decision gates stay OPEN for the user — do NOT execute any git mutation; PLANNING ONLY.

## CONTEXT

