# PRISM v9 Roadmap -- Startup CTO Technical Feasibility Review

## Executive Summary

The plan is thorough, well-researched (177 scrutiny findings synthesized), and architecturally sound. The micro-session approach is genuinely clever for AI-assisted development. However, the plan underestimates total effort by roughly 2x, has Sprint 15 (infrastructure) dangerously placed at the end when it should be Sprint 1, and is missing several pieces of critical infrastructure. Below is a section-by-section critique.

---

## 1. Are 15 Sprints Realistic? Timeline Estimate

**Verdict: The sprint count is fine. The timeline will be longer than expected.**

### Raw Session Math
- 45 micro-sessions at 3-5 files each
- Each micro-session = 1 Claude Code session = roughly 60-90 minutes of wall clock for a solo dev reviewing + guiding AI output
- That is 45-67 hours of pure session time
- Add 30% for debugging, browser testing, compaction overhead, session restarts: ~60-90 hours
- Add 20% for "the AI got it wrong and I need to redo it": ~72-108 hours

### Realistic Timeline
| Pace | Hours/Week | Calendar Weeks | Months |
|------|-----------|----------------|--------|
| Full-time solo + AI | 30-40 | 3-4 | ~1 month |
| Part-time (evenings/weekends) | 10-15 | 7-10 | ~2-3 months |
| Solo + other responsibilities | 15-20 | 5-7 | ~1.5-2 months |

### The Hidden Cost: Integration Testing
The plan has 45 micro-sessions that each produce 3-5 files. But it does not account for:
- **Cross-sprint integration testing** -- e.g., does the Job Tracker Kanban actually work with the Quote-to-Job conversion from Sprint 6?
- **State management sprawl** -- by Sprint 7, you will have 5+ React contexts. They will interact in ways the per-session scope cannot catch.
- **Visual regression** -- Sprint 5's sidebar restructure will break Sprint 3's onboarding tour references.

**Recommendation:** Add 5 integration-testing sessions (one after each phase boundary) bringing total to ~50 sessions. Budget 2x the naive estimate.

---

## 2. Dependency Evaluation

### Currently in package.json (6 runtime deps)
```
@monaco-editor/react  -- G-code editing (PPG page)
jspdf                  -- PDF export
react                  -- Core
react-dom              -- Core
react-router-dom       -- Routing
recharts               -- Charts
```

### Proposed Additions (6 new)
```
framer-motion          -- Animations
lucide-react           -- Icons
react-joyride          -- Guided tours
cmdk                   -- Command palette
@dnd-kit/core          -- Drag-drop
@dnd-kit/sortable      -- Sortable lists
```

### Assessment of Each Proposed Dependency

| Dep | Verdict | Size (gzip) | Notes |
|-----|---------|-------------|-------|
| `lucide-react` | **KEEP -- essential** | ~5KB (tree-shakes) | Replacing emojis with real icons is non-negotiable. Tree-shakes well -- you only bundle icons you import. |
| `framer-motion` | **KEEP with caution** | ~32KB gzip | Good for Modal enter/exit and layout animations. BUT: do NOT animate 50+ elements simultaneously (SFC results page with many cards). Use `will-change: transform` sparingly. The plan's "haptic buttons" can be done with pure CSS transitions -- framer-motion is overkill for hover effects. |
| `cmdk` | **KEEP** | ~4KB gzip | Tiny, well-maintained, exactly what you need. No concerns. |
| `@dnd-kit/core` + `@dnd-kit/sortable` | **KEEP** | ~12KB gzip combined | Needed for Kanban (Jobs), turret layout, tool crib. The alternative (react-beautiful-dnd) is unmaintained. |
| `react-joyride` | **DEFER to Sprint 3** | ~25KB gzip | Only needed for onboarding. Do not install in Sprint 0. Install when Sprint 3 starts. Reduces initial bundle for 95% of users who skip the tour. Better yet: lazy-load it behind a dynamic import. |

### Dependencies That SHOULD Be Added

| Dep | Why | Priority |
|-----|-----|----------|
| **`@tanstack/react-query` (TanStack Query)** | **CRITICAL.** The current codebase has 35 API modules, 28 hooks, and ZERO caching/deduplication. Every page re-fetches on mount. TanStack Query gives you: cache, dedup, stale-while-revalidate, optimistic updates, retry, devtools. The plan mentions it in Sprint 15 as "consider adopting" -- this is backwards. It should be Sprint 0. Every hook you write without it is technical debt you will rewrite. | Sprint 0 |
| **`zustand`** | The plan is heading toward 6-8 React Contexts (Onboarding, ERP, Learning, Auth, Theme, Shop, SFC state). Context re-renders every consumer on any change. Zustand gives you selector-based subscriptions with zero boilerplate. It is 1.1KB gzipped. Use it for cross-cutting state (user preferences, experience level, selected shop/machine). Keep React Context for true dependency injection (providers wrapping subtrees). | Sprint 0 |
| **`@tanstack/react-table`** | You have 12+ pages that will need sortable/filterable tables (employees, inventory, invoices, jobs, timecards, quality records). Rolling your own table with sort/filter/pagination in each page is a massive time sink. TanStack Table is headless -- works with your existing Tailwind styling. | Sprint 4 |
| **`date-fns` or `dayjs`** | Scheduling, timecards, job tracking, invoice due dates, Gantt charts. You need date manipulation. `date-fns` tree-shakes perfectly. Do not use `moment`. | Sprint 4 |
| **`zod`** | Form validation across 15+ forms (quotes, jobs, employees, materials). The plan calls for safety validation (sfcValidation.ts) but every form needs schema validation. Zod gives you runtime validation + TypeScript inference from one schema. | Sprint 0 |

### Dependencies to NOT Add

| Dep | Why Not |
|-----|---------|
| **Radix UI** | You already have 11 UI components (Button, Card, Modal, Tabs, etc.) that work. Radix is for building design systems from scratch. Migrating to Radix now means rewriting every component for zero user-visible benefit. If you were starting from scratch, yes. At this stage, no. |
| **Headless UI** | Same reasoning as Radix. You have components. |
| **Three.js / @react-three/fiber** | The plan puts this in Sprint 10. That is correct -- defer it as long as possible. When you do add it: THREE.js is ~150KB gzipped. Use dynamic import. Never put it in the main bundle. Consider if a 2D canvas backplot (Sprint 8) is sufficient for MVP -- it probably is. |
| **Sentry** | Not yet. Add after you have real users. Use a simple ErrorBoundary + console reporting for now. |
| **Redux / MobX** | Zustand + TanStack Query covers everything Redux would and with 1/10th the boilerplate. |

---

## 3. Micro-Session Architecture: Is It Practical?

**Verdict: Yes, this is one of the strongest parts of the plan, with two caveats.**

### What is genuinely good:
- **3-5 files per session** prevents context window bloat
- **Mandatory compaction triggers** at 60% context window is correct
- **Handoff notes** between sessions solve the "fresh context" problem
- **Session naming** (0-A, 0-B, etc.) gives clear traceability in git log
- **TypeScript check after every file change** catches drift early

### Caveat 1: Session boundaries will not always be clean
The plan assumes each micro-session is fully independent. In practice:
- Session 1-A (merge MachinePanel) will need to read SfcCalculatorPage.tsx, MachineConfigPanel.tsx, SmartMachineSelector.tsx, AND the types in sfc.ts. That is already 4 files before writing anything.
- Session 4-B (Jobs Kanban) needs to understand QuoteBuilderPage.tsx for the "Convert Quote to Job" flow, but that page is not built until Sprint 6. The session either builds a stub or creates a dependency.

**Recommendation:** Allow sessions to READ up to 8 files but WRITE only 3-5. The handoff note should list both read-set and write-set.

### Caveat 2: The compaction-between-every-session overhead is real
45 sessions with mandatory git commit + MEMORY.md update + handoff note = ~45 compaction cycles. At 5-10 minutes each, that is 4-7 hours of pure overhead. Worth it for quality, but budget it.

---

## 4. Technical Risks

### RISK 1: Sprint 15 Infrastructure Is Too Late (SEVERITY: CRITICAL)

The plan puts unified HTTP client, auth token fix, and TanStack Query adoption in Sprint 15 -- the LAST sprint. This is backwards. Between Sprint 0 and Sprint 15, you will write 30+ pages that each have their own loading/error/fetch pattern. Then in Sprint 15, you rewrite all 30.

**The current API layer is already a problem.** `web/src/api/client.ts` is hardcoded to `/api/v1/sfc` with no auth token injection. The 35 other API modules likely have similar issues.

**Fix:** Move Sprint 15 content into Sprint 0. Specifically:
- 15-A (unified HTTP client + auth) becomes 0-A-infra
- 15-B (TanStack Query) becomes 0-B-infra
- Every page built after Sprint 0 automatically gets caching, auth, error handling for free

### RISK 2: State Management Spaghetti (SEVERITY: HIGH)

The plan currently uses:
- `LearningContext` (exists)
- `ErpContext` (exists)
- `OnboardingContext` (Sprint 3)
- localStorage for SFC state, theme, experience level

By Sprint 10 you will have 5-6 contexts + scattered localStorage reads. Components will re-render unnecessarily because Context triggers full subtree re-renders.

**Fix:** Adopt Zustand in Sprint 0 for cross-cutting state. Keep Context only for provider-pattern use cases (theming, auth session).

### RISK 3: Three.js Bundle Size (SEVERITY: MEDIUM)

Three.js core is ~600KB uncompressed / ~150KB gzipped. With @react-three/fiber and @react-three/drei, you are looking at ~200KB gzipped of JS just for the 3D viewer page. If this is in the main bundle, initial load time doubles.

**Fix:** The plan already uses `lazy()` for pages. Ensure Three.js is in its own chunk:
```ts
const ViewerPage = lazy(() => import('./pages/ViewerPage'));
```
This naturally code-splits. Verify with `npx vite build` + bundle analyzer that Three.js does not leak into the main chunk. Consider whether a 2D SVG/Canvas approach for backplot (Sprint 8) eliminates the Three.js need entirely for MVP.

### RISK 4: framer-motion Performance on Complex Pages (SEVERITY: MEDIUM)

The SFC Calculator page already has 21 components. Wrapping many of them in `motion.div` for layout animations can cause layout thrashing when the results panel updates (which triggers position recalculation on every animated element).

**Fix:** Use framer-motion ONLY for:
- Modal enter/exit (AnimatePresence)
- Page transitions (if desired)
- Specific deliberate animations (accordion expand, tab slide)

Do NOT use it for:
- Button hover effects (CSS is faster and does not load 32KB of JS)
- Card hover effects
- Every panel in SFC Calculator

### RISK 5: No Error Boundary Strategy (SEVERITY: HIGH)

The plan mentions zero error boundaries. With 67 lazy-loaded pages, a single runtime error in any page crashes the entire app. This is especially bad for a manufacturing tool -- a machinist mid-calculation loses their work.

**Fix:** Add to Sprint 0:
- A root `ErrorBoundary` wrapping `<Routes>` that shows a "Something went wrong, reload this page" fallback
- A `PageErrorBoundary` wrapping each lazy-loaded page route
- A `SuspenseErrorBoundary` pattern:
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Spinner />}>
    <LazyPage />
  </Suspense>
</ErrorBoundary>
```

### RISK 6: No Offline / Degraded Network Strategy (SEVERITY: MEDIUM-HIGH)

The plan mentions "static data files become fallbacks for offline/demo mode" (Sprint 15, 9.4) but does not architect this. For a shop floor tool, network reliability is a real concern -- machine shops are not data centers.

This connects to the PWA question (see section 7 below).

---

## 5. Missing Critical Infrastructure

| Missing Piece | Impact | When to Add |
|---------------|--------|-------------|
| **ErrorBoundary** | App crashes show white screen | Sprint 0 |
| **Unified HTTP client with auth** | 35 API modules, no auth injection | Sprint 0 (not Sprint 15) |
| **TanStack Query** | No caching, dedup, or retry | Sprint 0 |
| **Form validation (zod)** | 15+ forms with no validation | Sprint 0 |
| **Bundle analysis** | No visibility into bundle size | Sprint 0 (add `rollup-plugin-visualizer`) |
| **Toast/notification system** | Users get no feedback on async operations | Sprint 0 (Toast.tsx exists but needs integration) |
| **Confirmation dialogs** | Delete job? Convert quote? No "are you sure?" pattern | Sprint 0 |
| **Loading skeleton strategy** | Plan mentions SkeletonLoader but no strategy for which pages use it | Sprint 0 |
| **Feature flags / tier gating** | Plan mentions tier gating (P0-U01) but no implementation approach | Sprint 0 |
| **Environment config** | No `.env` strategy for API base URL, feature flags | Sprint 0 |
| **Sentry / error reporting** | Not needed now. Add when real users exist. | Post-launch |
| **Analytics** | Not needed now. User behavior data is premature. | Post-launch |

---

## 6. Should the App Be a PWA for Shop Floor Offline Use?

**Verdict: Yes, but not in this plan's scope. Add a PWA spike as Sprint 16.**

### Why PWA matters for this product:
- Machine shops have unreliable WiFi (metal buildings, RF interference from VFDs and spindle motors)
- A machinist at the machine needs to look up feeds/speeds mid-operation. If the server is down, they are stuck
- The SFC Calculator is the most latency-sensitive page. Its calculation data (materials, operations, tool data) is static-ish and perfect for caching
- Mobile access on the shop floor (phone/tablet at the machine) is a real use case

### What a PWA gives you:
- **Service Worker** caches static assets and API responses
- **Offline SFC Calculator** using local data files (which already exist in `web/src/data/`)
- **Install to home screen** on tablets
- **Background sync** for queuing operations when offline (submit quote, create job)

### Why NOT to do it in this plan:
- Vite has good PWA plugin support (`vite-plugin-pwa`) but configuring cache strategies for 35 API endpoints is a sprint of its own
- The plan already has 45 sessions. Adding PWA mid-stream creates cross-cutting complexity
- You need a working app first. PWA is a deployment concern, not a feature concern

### Recommendation:
- Sprint 0: Add a `manifest.json` stub and the Vite PWA plugin with a basic cache-first strategy for static assets. This is 30 minutes of work and gives you "installable" for free.
- Post-Sprint 15: Full PWA sprint with offline SFC Calculator, background sync, and cache strategy tuning.

---

## 7. Most Likely Failure Mode

**The most likely failure mode is: Sprint 0 foundation is insufficient, causing cascading rework in Sprints 4-7.**

### Here is how it plays out:

1. Sprint 0 installs deps and builds pretty components (buttons, cards, icons). This feels productive.
2. Sprints 1-3 build the SFC Calculator and onboarding. These work because SFC is mostly self-contained with local state.
3. Sprint 4 (Shop Dashboard + Jobs Kanban) hits the wall:
   - Jobs need to fetch from API. There is no unified HTTP client (that is Sprint 15).
   - Jobs need caching. There is no TanStack Query (that is Sprint 15).
   - Jobs need to share state with Quotes (Sprint 6) and Invoices (Sprint 7). There is no state management strategy.
   - The Kanban board needs optimistic updates on drag-drop. Without TanStack Query's `useMutation`, you are hand-rolling optimistic state.
4. You hand-roll everything in Sprint 4. It works, but it is bespoke.
5. Sprint 6 (Quoting) needs the same patterns. You copy-paste Sprint 4's patterns. Now you have two hand-rolled fetch/cache systems.
6. Sprint 7 (Finance) needs the same. Three copies.
7. Sprint 15 arrives. You now need to retrofit TanStack Query into 30+ pages that each have their own fetch/state/error patterns. This is a rewrite, not a refactor. Estimated: 2-3 additional sprints of migration work.

### The fix is simple:
**Move infrastructure to Sprint 0.** Specifically:
- Unified HTTP client with auth interceptor (half a session)
- TanStack Query setup with default query/mutation patterns (half a session)
- Zustand store skeleton for cross-cutting state (quarter session)
- ErrorBoundary wrapper (quarter session)
- Zod schema for SFC params as a template for all future forms (quarter session)

This adds 2 micro-sessions to Sprint 0 (making it 6 sessions instead of 4) but saves 5-10 sessions of rework later.

---

## 8. Revised Sprint 0 Recommendation

### Current Sprint 0 (4 sessions):
```
0-A: Install deps + brand colors + elevation tokens + text utilities
0-B: Button haptic + Card glass + Modal animation + Tabs underline
0-C: New components (InfoTooltip, SkeletonLoader, EmptyState, StatusPill, StepWizard)
0-D: Lucide icon swap
```

### Recommended Sprint 0 (6 sessions):
```
0-A: Install ALL deps (including @tanstack/react-query, zustand, zod, date-fns) + brand tokens + text utilities
0-B: Unified HTTP client + auth interceptor + TanStack Query provider + Zustand store skeleton + ErrorBoundary
0-C: Button haptic + Card glass + Modal animation + Tabs underline
0-D: New components (InfoTooltip, SkeletonLoader, EmptyState, StatusPill)
0-E: Lucide icon swap (machineModes.ts + AppShell.tsx + MachineModeTabs.tsx)
0-F: Zod schema for SFC params + form validation pattern template
```

---

## 9. Summary Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Scope completeness** | 9/10 | Impressively thorough. 177 findings addressed. Only gaps are infra timing and PWA. |
| **Sprint ordering** | 5/10 | Infrastructure last is the critical flaw. SFC-first is correct. Aerospace at 13-14 is fine (niche). |
| **Dependency choices** | 7/10 | Good instincts (lucide, dnd-kit, cmdk). Missing TanStack Query and Zustand. |
| **Micro-session design** | 9/10 | Best part of the plan. Compaction discipline is strong. |
| **Risk awareness** | 6/10 | Knows about jsPDF lazy loading and React.memo. Misses HTTP client, state management, ErrorBoundary, offline. |
| **Timeline realism** | 6/10 | 45 sessions is accurate for the work. But integration testing overhead and rework risk from late infra adds 30-50%. |
| **Manufacturing domain fit** | 10/10 | The naming, safety guards, AS9100, and machinist-informed findings show deep domain understanding. |

### Bottom Line

This is a strong plan that will produce a strong product. The single most impactful change is: **move infrastructure (HTTP client, TanStack Query, Zustand, ErrorBoundary) from Sprint 15 to Sprint 0.** Everything else is refinement. The micro-session architecture is well-suited to solo-dev-plus-AI execution and the compaction discipline will prevent the context-drift failures that kill most AI-assisted large projects.

Estimated delivery: **6-8 weeks full-time, 12-16 weeks part-time.** Not the 45 sessions the plan implies, but roughly 55-60 sessions accounting for integration testing and infrastructure front-loading.
