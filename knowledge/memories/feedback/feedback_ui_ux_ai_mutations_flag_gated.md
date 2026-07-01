---
name: ui-ux-ai-mutations-flag-gated
description: AI-proposed visual mutations route through a feature flag — never auto-deploy. Operator activates the flag after review; the default branch ships with flag off.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.447Z
aliases: feedback_ui_ux_ai_mutations_flag_gated
---


**Rule:** Any AI-proposed visual mutation (new page, redesigned component, restyled element, layout change, new dashboard widget, new modal/drawer, copy rewrite that changes UX intent) MUST land behind a feature flag that defaults to OFF. The operator activates the flag after reviewing the rendered surface; the default branch ships with the flag off so the live experience is unchanged until the operator opts in.

**Why:** An agent can generate plausible-but-wrong UI changes (broken state coverage, missing loading/empty/error branches, off-design-language, regressions against [[feedback_frontend_codex]]'s established Codex pages, accessibility breaks). Auto-deploying these means the customer is the first reviewer. Feature flags push the review into a controlled diff so the operator can A/B the flagged-on view against the flagged-off view BEFORE the customer sees it. This also closes the silent-collision class: two parallel chats both auto-deploying competing visual mutations cancel each other out at runtime; behind flags both can coexist and the operator picks.

**How to apply:**
1. **Before generating any visual mutation** — search `web/` for existing pages matching the requested change. If found, follow [[feedback_frontend_codex]] (improve existing, don't duplicate). If new, proceed to step 2.
2. **Wrap the mutation in a feature flag** — Vite reads `import.meta.env.VITE_FEATURE_<NAME>` at build time; runtime reads from `localStorage.getItem('prism.feature.<name>')` for hot toggle. Default both to `'off'`. Examples: `VITE_FEATURE_PARTPROFILE_REDESIGN`, `VITE_FEATURE_QUOTE_WIZARD_V2`, `VITE_FEATURE_SHOP_FLOOR_GLASS`.
3. **Render the mutation only when the flag is on** — `{flag.on('partprofile-redesign') ? <NewPartProfile /> : <PartProfile />}`. Both code paths ship; the flagged-off path is the canonical experience.
4. **Document the flag in the PR description** — what surfaces it touches, how to toggle it on for review (DevTools → Application → localStorage → set `prism.feature.<name>` = `'on'`), screenshots of both states.
5. **Operator activation** — operator validates the flagged-on render in dev/staging/prod-with-localStorage-override before flipping `VITE_FEATURE_*` to `'on'` at build time. Flag deletion is a separate PR (cleanup) after a quiet activation week.

**Scope (what's "visual"):**
- Any change in `web/src/` that renders pixels: pages, components, layouts, styles, icons, animations, charts, dashboards, modals, drawers, toasts, copy-that-changes-intent.
- NOT scoped: bug fixes (broken loading state, wrong color, off-by-one padding), pure-text typo fixes, internal-only routes (admin pages where the operator IS the customer), pages tagged `internal/*`.

**Scope (what's "AI-proposed"):**
- ANY chat-driven change that originated as "build me a new view of X" / "redesign Y" / "add Z dashboard" — i.e. the chat planned the visual mutation.
- NOT scoped: operator hand-typed `<NewComponent />` they hand-coded themselves (operator IS the gate); chat changes inside an already-flagged surface (the parent flag IS the gate).

**Cross-references:**
- [[feedback_frontend_codex]] — don't duplicate Codex pages; this rule sits ABOVE that one (flag-wrap applies even to legitimate Codex enhancements).
- `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §6 U-F2-FEATURE-FLAG-GUARD — the spec unit that motivated this doctrine.
- `/feature-matrix` skill — separately catalogs Claude Code's hook/feature surface (NOT a visual-mutation flag registry; do not conflate).

**What this is NOT:**
- NOT a build-system change (no new flag library — Vite env + localStorage is enough; both already work in web/).
- NOT a per-PR review gate that's tooled in CI (that's a separate future unit; today the gate is doctrine + human review).
- NOT a kill switch for all frontend work — chats can still ship visual mutations, they just ship them flagged-off.

**Anti-regression:**
- A PR that adds a new page/component WITHOUT a feature flag wrapper is a doctrine violation. The 3-of-3 scrutiny gate's arm-A/B/C should flag this; pre-existing `pre-frontend-page-create-audit` hook continues to handle the "duplicate existing page" class.
- An LLM that proposes a visual mutation WITHOUT naming the flag in its plan has skipped step 2; ask it to re-plan with the flag.

**Verification:**
- Grep new web/src/ commits for `VITE_FEATURE_*` or `prism.feature.*` — any new visual surface should be findable by one of those tokens.
- Operator's localStorage flag-on toggle in DevTools → live preview of the flagged surface before any build-time activation.
