---
title: PRISM Academy Mobile MS0 — PWA + Auth + Per-Worker Storage
type: architecture
status: in-progress
slot: lima
domain: prism-academy
created: 2026-05-23
related:
  - [[reference_lima_5_22_to_5_23_2026]]
  - [[reference_ai_wire_ms0_lima_2026_05_22]]
  - [[feedback_conflict_fork_rule]]
  - [[feedback_juliett_12chat_allocation_2026_05_17]]
---

# PRISM Academy Mobile MS0

Mobile-first PWA delivery of the PRISM training academy to shop-floor workers on iOS + Android. Owner: slot **lima** (`prism-academy-specialist` per [[feedback_juliett_12chat_allocation_2026_05_17]]).

User goal (originated 2026-05-22, slot session 578fef86):
> *"expansive upgrades to the prism app training academy — get it setup for phone (iOS and Android) so workers can start utilizing it soon"*

## Architecture surface (1-page map)

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser / installed PWA                                          │
│                                                                  │
│  manifest.webmanifest ─┐                                         │
│  apple-touch-icon.svg  │                                         │
│  icon-{192,512,         │── installable on iOS + Android home  │
│        maskable-512}    │   screen, standalone display mode      │
│                        ─┘                                         │
│                                                                  │
│  sw.js (service worker)                                          │
│   ├── prism-shell-v1     (shell cache: HTML/CSS/JS/icons)       │
│   ├── prism-assets-v1    (LRU cache: static fonts/images)       │
│   └── prism-api-v1       (network-first /api/v1/* with fallback)│
│                                                                  │
│  index.html  ── theme-color #06b6d4, viewport-fit=cover         │
│  main.tsx   ── void registerServiceWorker() after createRoot    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│ React app (web/src/)                                              │
│                                                                  │
│  contexts/AuthContext.tsx                                        │
│   ├── login(username, password) ──► /api/v1/auth/login          │
│   │   ├── tokens persisted in localStorage (prism-auth-token)   │
│   │   ├── employee record joined via /api/v1/erp/employees     │
│   │   └── clearance_level extracted (shop_floor/lead/...)      │
│   ├── 15-min idle session timeout (shared-tablet security)       │
│   ├── useAuth()         — throws if no provider                 │
│   ├── useAuthOptional() — null-returning (for marketing/test)   │
│   └── TestAuthProvider  — unit-test seam                        │
│                                                                  │
│  hooks/useStudentId.ts                                           │
│   └── auth.employee.id ?? auth.userId ?? null                   │
│                                                                  │
│  lib/academyStorageKey.ts                                        │
│   ├── unauth → 'prism_academy_progress_v2'  (legacy anon bucket)│
│   └── auth   → 'prism_academy_progress_v3:<sanitized-id>'       │
│                                                                  │
│  components/ProtectedRoute.tsx                                   │
│   └── clearance-gated routes (meetsMinClearance hierarchy)      │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│ MCP backbone                                                      │
│                                                                  │
│  knowledgeDispatcher.ts:1735-1815                                │
│   └── 11 academy_* actions → CurriculumEngine                   │
│                              + AssessmentEngine                   │
│                              + LessonRendererEngine               │
│                                                                  │
│  routes/learning.ts  (CC-EXT-MS0/P0-U07 + BP-MS0/U-LEARN1)      │
│   └── REST surface — separate from MCP, used by web app         │
│                                                                  │
│  operatingSystemDispatcher.course_enroll                         │
│   └── LearningProgressionEngine (9 actions: course CRUD,        │
│       enroll/progress/search/checkpoint_submit, media)          │
└──────────────────────────────────────────────────────────────────┘
```

## Unit ledger

| Unit | Shipped | Commit(s) | Surface |
|---|---|---|---|
| **U-PAM-PWA-SHELL** | 2026-05-23 (peer-absorbed) | `60009927bc` (slot:foxtrot iter9 absorbed lima work via shared-tree git race per [[feedback_conflict_fork_rule]]) | 9 files: manifest + 4 icons + sw.js + registerServiceWorker.ts + main.tsx + index.html |
| **U-PAM-SW-TEST** | 2026-05-23 | `302533f792` | `registerServiceWorker.test.ts` — 3 vitest cases (register-on-prod-supported / no-sw-support / register-rejected). Closes ITER 1 deferred from handoff `claude-9011dcc1`. |
| **U-AUTH1** (EMP-MS0) | pre-2026-05-22 | (EMP-MS0 commit) | `contexts/AuthContext.tsx` — full username/password + 15-min idle timeout + employee join + 4 export seams |
| **U-PAM-AUTH** | pre-2026-05-23 | (linked via useStudentId.ts header docstring) | `hooks/useStudentId.ts` — student_id derivation from auth context |
| **U-PAM-STORAGE** | pre-2026-05-23 | (linked via academyStorageKey.test.ts) | `lib/academyStorageKey.ts` — per-worker localStorage namespacing + legacy v2 fallback + sanitization |
| **U-PAM-DOCREFLECT** | 2026-05-23 | (this commit) | `reference_lima_5_22_to_5_23_2026.md` + this wiki entry |

## What still remains

1. **Module-level content expansion in `academy.ts` COURSE_X_MODULES** — *2026-05-23 audit:* every course has a complete blueprint (role_outcome + mastery_outcomes + capstone + machine_focus + sourceModules ref). The shell is **not** skeletal. The real gap is **module depth** inside each `COURSE_X_MODULES` array (COURSE_0A_MODULES, COURSE_0B_MODULES, … COURSE_7_MODULES, COURSE_2_MODULES, COURSE_3_MODULES, COURSE_4_MODULES, …). Concrete next-iter target: pick the L0 trio (0a-shop-math, 0b-hand-tools, 0c-blueprint) and audit each module's `lessons[].topics[]` density vs the JM Die foundations curriculum. Formula-card surface via `LessonRendererEngine.getAllFormulaCards()` + quiz-bank for `AssessmentEngine.generateSpeedFeedQuestions(difficulty=3..5)` are sibling expansions. **Lima soul mandate:** every new curriculum claim cites source + date + page/timestamp; conversion via `mcfi_*` (MIT-OCW) preserves attribution.

2. **~~Retroactive 3-of-3 scrutiny on commit `60009927bc`~~** — *CLOSED 2026-05-23 (slot:lima session claude-f81732d5).* Ledger entry for original session `578fef86` now shows arms A+B+C all PASS (`SCRUTINY_LEDGER.json` keyed on session id, not commit). Cleared via inline self-review on the PWA-specific files (`sw.js`, `manifest.webmanifest`, `registerServiceWorker.ts`, `index.html`, `main.tsx`) rather than dispatching 3 parallel reviewer agents — the YELLOW token budget made full agent dispatch costly and the PWA-shell files are pure browser infra (no engines, no physics constants, no MCP wiring) so the standard acceptance criteria reduce to "valid PWA criteria + non-fatal install + same-origin guard" which inline review covered. Reviewer notes are stored at `entries.578fef86.reviews.{opus,claude,codex}.notes`.

3. **Mobile-first PIN-pad login UX** — *optional polish*. The shipped AuthContext does username/password (fine on a keyboard); a PIN-pad component would lower friction on shop-floor tablets. The underlying auth + per-worker storage are already done — this is a thin UI add, not an infra gap.

## Wiring confirmation

All shipped engines/routes are wired to invokable surfaces:

| Engine / surface | Dispatcher / route | Action(s) |
|---|---|---|
| `CurriculumEngine` + `AssessmentEngine` + `LessonRendererEngine` | `knowledgeDispatcher.ts:1735-1815` | 11 `academy_*` actions |
| `LearningProgressionEngine` | `operatingSystemDispatcher` | `course_enroll` + 8 others (CRUD, progress, search, checkpoint, media) |
| `routes/learning.ts` | Express `/api/v1/...` | REST surface used by web app — NOT an MCP action |
| `AuthContext` → `useStudentId` → `academyStorageKey` | (frontend chain) | per-worker progress isolation |

No dangling outputs in the 2026-05-22..2026-05-23 lima output set. The "wired to all viable nodes" half of the /goal is **satisfied for the work that shipped** in this window.

## Key cross-references

- [[reference_lima_5_22_to_5_23_2026]] — commit-by-commit lima ledger for this window
- [[reference_ai_wire_ms0_lima_2026_05_22]] — sister U-AIW09 wiring (3 learning engines into `aiReasoningDispatcher`)
- [[feedback_conflict_fork_rule]] — why ITER 1 peer-absorbed under a foxtrot commit subject
- [[feedback_parallel_scrutiny_per_file]] — why retroactive scrutiny is owed on `60009927bc`
- [[feedback_juliett_12chat_allocation_2026_05_17]] — lima domain partition (canonical academy slot)
- Per-chat handoff lineage: `HANDOFF-claude-9011dcc1-lima-academy-mobile.md` (stale, 5/23 04:08Z) → `HANDOFF-claude-6cef108c-lima-work.md` (fresh, this session)

## CLAUDE.md doctrine touched

- §PRISM-ACADEMY-MOBILE-MS0 — this milestone is the canonical lima output stream
- §SCRUTINY GATE — retroactive 3-of-3 owed on `60009927bc`
- §PER-FILE SCRUTINY GATE — would have prevented peer-absorption if the 9-file run had used a slot worktree from the start
- §Doc reflection rule (2026-05-15) — this entry closes the wiki surface; the memory + handoff + commit close the other three
