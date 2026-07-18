---
name: reference-video-embed-and-route-fix-2026-05-27
description: Authorship note — lima session 92ef25c0 authored the YouTube embed renderer (LessonView.tsx +175), 27-pick curated youtube-picks.ts (302 lines), and the /academy→/learning/academy dev-seed fix. All 3 files were absorbed into peer commit 56930728f5 (slot:echo) via git add -A. Per [[feedback_commit_to_slot_worktree]], shared-tree commits get absorbed when peers run in parallel.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.251Z
aliases: reference_video_embed_and_route_fix_2026_05_27
---


# Video embed + route fix — authorship note (lima, 2026-05-27)

## What lima shipped this session arc

Two operator prompts addressed:
1. "not seeing the prism academy button" → /academy → /learning/academy route fix
2. "can you link youtube vids for visual learners?" → video embed + 27-pick atlas

Files written:
- `mcp-server/web/src/components/learning/LessonView.tsx` (+175 lines) — `<video>`
  ContentType now auto-embeds YouTube URLs as 16:9 iframes (youtube-nocookie.com,
  rel=0+modestbranding=1, lazy + strict-origin referrer). Falls back to placeholder
  for non-YT video.
- `mcp-server/web/src/data/youtube-picks.ts` (NEW, 302 lines) — 27 curated picks
  across CAM/CAD/MILL/LATHE/WEDM/GENERAL with channel + WHY citation per pick.
  `videoBody(pickId, caption)` helper for course authors. Sourced from
  mcp-server/data/tribal/youtube-toolpath-tribal.jsonl (360 unique videos analyzed).
- `mcp-server/web/public/dev-seed-apprentice.html` — post-seed redirect corrected
  to /learning/academy (the actual route per App.tsx).

## Git capture

All 3 files landed in commit `56930728f5` (slot:echo /loop iter58) via a
parallel `git add -A` that swept my staged changes into echo's commit. Per
[[feedback_commit_to_slot_worktree]], shared-tree (H:/prism, not H:/prism-slot-lima)
work is vulnerable to peer-commit absorption. Functionally fine — content is on disk + in git.

Lima session 92ef25c0 is on the shared tree this session because the work is
[MAIN]-level PWA infrastructure (vite config, public/, web/src/components), not
slot-lima-specific academy content. Future infra work of this kind should still
attempt slot-worktree where possible to preserve attribution.

## How this completes the apprentice-phone arc

Earlier this session:
- `4ec78cc987` — 8-file phone-test infra (dev-seed, tunnel script, vercel.json,
  Playwright smoke, onboarding doc, vite LAN-host knob)
- `b644804e48` — per-employee curriculum tracks (Mark/Chris/Justin) + 3-card
  dev-seed picker

This commit (absorbed into `56930728f5`) closes:
- Route bug: dev-seed pointed at /academy, but the actual route is /learning/academy
- Visual-learner gap: <video> sections were placeholders; now real YouTube embeds

Net effect: Justin can install on his phone, tap his card, land in the Academy
catalog, open a lesson with an embedded YouTube video, and watch the visual
walkthrough inline.

## Next units this unlocks
- U-COURSES-VIDEO-EMBED-PASS: add 1-3 video sections to every course module
  (60+ courses × ~3 modules ≈ 200 insertions, scriptable)
- U-EMPLOYEE-TRACK-VIDEOS: per-employee starter video on the dev-seed page
  ("watch this 5-min intro before your first lesson")
- U-REAL-ERP-LOGIN: replace dev-seed with /api/v1/auth/login when ERP records exist
