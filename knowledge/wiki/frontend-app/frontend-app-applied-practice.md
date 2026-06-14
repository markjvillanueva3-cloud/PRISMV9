---
title: Frontend-App Applied Practice — web front-end practitioner gotchas, failure modes, and technique decisions
galaxy: frontend-app
owner_slot: quebec
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: each practitioner gotcha WebFetch-confirmed against a free/legal primary source — React official docs (react.dev) x5, Next.js official docs, web.dev (Google web-standards guidance), W3C WAI ARIA Authoring Practices Guide. Established framework/standards behavior asserted with inline citation. PRISM-specific benchmark numbers + the live app's measured conformance left to quebec (owner-gate).
tags: [frontend-app, react, hooks, re-renders, memoization, stale-closure, derived-state, hydration-mismatch, ssr, accessibility, focus-management, keyboard, list-keys, fetch-race, code-splitting, bundle-size, practitioner-knowledge, tribal-knowledge, gotchas, failure-modes]
---

# Frontend-App Applied Practice

The **practitioner-knowledge layer** for the **frontend-app** galaxy (owner: quebec): the hard-won gotchas, failure modes, and technique decisions a world-class web front-end engineer carries that pure theory does not teach. This is the tribal-knowledge complement to `frontend-app-foundations.md` (theory: rendering pipeline, semantic HTML, one-way data flow, WCAG/ARIA principles, HTTP semantics, DOM event phases). Foundations tells you *how the platform works*; this entry tells you *where it bites in real code and how the expert sidesteps it*. Every claim below was **WebFetch-confirmed against a free/legal primary source** (React official docs, Next.js docs, web.dev, W3C WAI APG). PRISM-specific measured numbers (bundle sizes, the live app's WCAG conformance, route-level fetch timings) are **[quebec-gate]** — quebec measures them against the live `mcp-server/web/` app, not hardcoded here.

## Common failure modes — render + state

### 1. New object/array/function props silently defeat `React.memo`
**The gotcha:** wrapping a child in `React.memo` to "stop unnecessary re-renders," then passing it `style={{...}}`, `items={[...]}`, or `onClick={() => ...}` created inline in the parent's render — and the memo does nothing.

**WHY** ([React.dev — `memo`](https://react.dev/reference/react/memo)): `memo` compares each prop to its previous value with `Object.is`. `Object.is(3, 3)` is `true`, but **`Object.is({}, {})` is `false`** — objects, arrays, and functions are equal only if they are the *same reference*. "If you create a new object or array each time the parent is re-rendered, even if the individual elements are each the same, React will still consider it to have changed... `memo` is completely useless if the props passed to your component are *always different*."

**Expert avoidance:** memoize the *reference*, not just the component — stabilize object/array/function props with `useMemo`/`useCallback` (or hoist constants out of the component), OR pass primitives instead of objects. Also know memo's three escape hatches from the same docs: a memoized component **still** re-renders on its own state change and on a consumed **context** change — memo only governs props from the parent.

### 2. Stale closures — an effect/callback reading a value that's frozen at an old render
**The gotcha:** an effect uses a prop or state value but the dependency array omits it (often to "run once" with `[]`), so the effect captures the value from the render it was created in and never sees updates.

**WHY** ([React.dev — `useEffect`](https://react.dev/reference/react/useEffect)): "**You can't 'choose' the dependencies of your Effect.** Every reactive value used by your Effect's code must be declared as a dependency" — reactive values are props, state, and variables/functions declared in the component body. Suppressing the lint warning means you "**lie** to React about the values your Effect depends on," and "when dependencies don't match the code, there is a high risk of introducing bugs" — the effect reads **stale values from previous renders**.

**Expert avoidance:** never silence the `react-hooks/exhaustive-deps` lint to force `[]`; instead remove the *need* for the dependency (move the value inside the effect, lift it to a ref via the documented patterns, or restructure so the value isn't reactive). Treating the linter as authoritative is the cheapest defense against this entire bug class.

### 3. Derived state stored in state + synced by an effect (redundant-state trap)
**The gotcha:** keeping a value like `fullName` in `useState` and writing a `useEffect` to recompute it whenever `firstName`/`lastName` change — producing cascading extra renders and a state that can drift out of sync.

**WHY** ([React.dev — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)): "**When something can be calculated from the existing props or state, don't put it in state. Instead, calculate it during rendering.**" The effect-sync version is "redundant state and unnecessary Effect"; the correct form is a plain `const fullName = firstName + ' ' + lastName`. Chaining effects that each adjust state based on other state triggers "multiple unnecessary re-renders" — "it's better to calculate what you can during rendering, and adjust the state in the event handler."

**Expert avoidance:** before adding a `useState`, ask the three "is it state?" questions (does it change? is it passed via props? is it computable from existing state/props?) — if computable, derive it in the render body. This is the front-end analog of single-source-of-truth (CLAUDE.md R7: surface one source, don't keep two and sync them).

### 4. `key={index}` / `key={Math.random()}` on a reordering list
**The gotcha:** using the array index (or a fresh random) as the list key. With index keys, inserting/deleting/reordering items makes React reuse the wrong DOM node for the wrong data; with random keys, *every* render recreates *every* node.

**WHY** ([React.dev — Rendering Lists](https://react.dev/learn/rendering-lists)): "the order in which you render items will change over time if an item is inserted, deleted, or if the array gets reordered. **Index as a key often leads to subtle and confusing bugs.**" And "do not generate keys on the fly, e.g. with `key={Math.random()}`. **This will cause keys to never match up between renders, leading to all your components and DOM being recreated every time.** Not only is this slow, but it will also lose any user input inside the list items." The rules: keys must be **unique among siblings** and **must not change**.

**Expert avoidance:** key on a stable identity from the data — a database id, or `crypto.randomUUID()` assigned **once at creation** and stored with the item (not regenerated in render). Index keys are only safe for a list that is static, never reordered, and never filtered.

## Common failure modes — SSR + async

### 5. Hydration mismatch — server HTML differs from the client's first render
**The gotcha:** in an SSR/Next.js app, the prerendered HTML must byte-match what the client produces on its *first* render. Reading `window`/`localStorage`, calling `Date()`/`Math.random()` during render, or branching on `typeof window !== 'undefined'` makes them differ — and hydration throws.

**WHY** ([Next.js — React Hydration Error](https://nextjs.org/docs/messages/react-hydration-error)): "there was a difference between the React tree that was prerendered from the server and the React tree that was rendered during the first render in the browser (hydration)." Documented causes include incorrect HTML nesting (e.g. `<div>` inside `<p>`, `<a>` inside `<a>`), `typeof window` checks in render logic, **browser-only APIs (`window`, `localStorage`)**, **time-dependent APIs like `Date()`**, browser extensions modifying the HTML, and misconfigured CSS-in-JS.

**Expert avoidance:** defer client-only content to a `useEffect` (which runs only after hydration, where browser APIs are safe) gated by an `isClient` flag; OR disable SSR for that subtree via `dynamic(..., { ssr: false })`; use `suppressHydrationWarning` **only** as a one-level escape hatch for genuinely unavoidable diffs like a timestamp — the docs explicitly warn "don't overuse it." Note an invalid-HTML-nesting mismatch is *also* a semantic-HTML bug per foundations §2.

### 6. Fetch race conditions in effects — the wrong response wins
**The gotcha:** an effect fetches data keyed on a prop (e.g. `person`); the prop changes rapidly; responses arrive out of order; a stale response overwrites the fresh one. Symptom: the UI shows data for the *previous* selection.

**WHY** ([React.dev — `useEffect`](https://react.dev/reference/react/useEffect)): the documented fix is the **ignore-flag cleanup** — `let ignore = false;` at the top of the effect, guard `if (!ignore) setBio(result)` in the `.then`, and `return () => { ignore = true; }` in cleanup. "This ensures your code doesn't suffer from 'race conditions': **network responses may arrive in a different order than you sent them.**" When a new request fires before the previous completes, cleanup sets the old effect's `ignore = true`, so the late response is discarded.

**Expert avoidance:** every data-fetching effect needs a cleanup that invalidates the in-flight request (ignore flag, or `AbortController`). A data-fetching library (e.g. TanStack Query, per the quebec galaxy brain) handles this race for you — which is itself an argument for not hand-rolling fetch-in-effect. Pair with the HTTP idempotency contract from foundations §6: a retry wrapper may auto-retry GET but must not blindly retry a non-idempotent POST.

## Common failure modes — accessibility (the silent ones)

### 7. Focus is lost (or trapped) when the DOM changes
**The gotcha:** a deleted list row, a closed modal, or a route change leaves keyboard focus on a now-removed node — so focus silently reverts to `<body>`, stranding keyboard/screen-reader users at the top of the page. The inverse failure is *trapping* focus where it can't escape.

**WHY** ([W3C WAI — ARIA APG, Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)): "all interactive elements must be operable via the keyboard," and "when elements are removed or hidden (like deleted list items), developers must actively manage focus to prevent it from reverting to the body element, which causes loss of keyboard operability." Unlike native HTML controls, **custom ARIA widgets get no keyboard behavior for free** — you implement it.

**Expert avoidance:** on any focus-bearing removal/transition, programmatically move focus to a sensible successor (the next row, the element that opened the dialog, or the new page's `<h1>`) with `element.focus()`. This is the practitioner reason `tabindex="-1"` exists: it makes a non-interactive target *programmatically* focusable without putting it in the Tab order. Maps to WCAG Operable (foundations §5) — but theory says "be keyboard operable"; practice says "and you must catch the DOM-mutation moment where operability silently breaks."

### 8. `tabindex` misuse — positive values and div-buttons
**The gotcha:** reaching for positive `tabindex` (`tabindex="1"`, `"2"`...) to "fix" tab order, or making a clickable `<div>` keyboard-reachable by bolting on `tabindex="0"` without role + key handlers.

**WHY** ([W3C WAI — ARIA APG keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)): `tabindex="0"` adds an element to the tab sequence **at its DOM position**; `tabindex="-1"` makes it focusable via `.focus()` but **not** in the tab sequence; the guide "strongly advises against using positive tabindex values (1-32767), as these create unpredictable focus ordering." For composites, **only one element should be in the tab sequence** — the **roving tabindex** pattern keeps `tabindex="0"` on the active item and `tabindex="-1"` on the rest, swapping as arrow keys move focus.

**Expert avoidance:** never use positive `tabindex` — fix order by fixing DOM order. Prefer a native `<button>` over a `tabindex`-ed `<div>` (it gets focus, Enter/Space activation, and the role for free — the "first rule of ARIA" from foundations §5). Use roving tabindex for menus/grids/toolbars rather than putting every child in the Tab order.

## Technique decisions — performance + bundle

### 9. Ship route-sized bundles, not the whole app, on first load
**The gotcha:** a single large JS bundle on the initial route. Beyond download bytes, the hidden cost is **parse + compile + execution on the main thread** before the page is interactive.

**WHY** ([web.dev — Reduce JavaScript payloads with code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)): "Sending large JavaScript payloads impacts the speed of your site significantly," and code splitting reduces "JavaScript parse, compile, and execution-related startup costs" by cutting main-thread work during the critical initial load. The strategy: "split your bundle into multiple pieces and only send what's necessary at the very beginning," loading the rest "only when it is needed" via dynamic imports — which improves **Interaction to Next Paint (INP)** by freeing the main thread.

**Expert avoidance:** route-level code-split by default (dynamic `import()` for heavy, below-the-fold, or rarely-used components — charts, editors, modals); lazy-load on interaction/navigation rather than at startup. Tie this back to foundations §3: JS is the first stage of the pixel pipeline and competes with the 10 ms/frame budget — a smaller startup bundle is also a smoother-frames decision. The app's actual bundle sizes + INP are **[quebec-gate]** — measure, don't assume.

### 10. A re-render is recursive — a state update high in the tree re-runs the subtree
**The gotcha:** assuming a state change re-renders "just this component." It re-renders this component **and recursively every descendant it returns**, until React diffs against the DOM. Misjudging this is why people sprinkle `memo` everywhere — usually solving a problem they don't have, or one #1 quietly defeats.

**WHY** ([React.dev — Render and Commit](https://react.dev/learn/render-and-commit)): a component renders on initial mount and "when the component's (or one of its ancestors') state has been updated." "This process is **recursive**: if the updated component returns some other component, React will render *that* component next... until there are no more nested components." React then **commits only the DOM nodes that differ** between renders.

**Expert avoidance:** rendering is cheap by design (no DOM write unless the output differs) — so *measure before memoizing*. When a subtree is genuinely expensive, the real levers are: lift state down (keep the state-owning component small so its subtree is small), pass expensive subtrees as `children` props (they don't re-render when the wrapper's state changes), and only then `memo` with *stable* props per #1. Premature memoization is the front-end over-engineering tax (CLAUDE.md: simplicity first).

## Verification / how to check these in a real app

- **Re-renders (#1, #10):** React DevTools "Highlight updates when components render" + the Profiler flamegraph show which components re-render and why; a component flashing on every keystroke that shouldn't = a stale-reference or missing-memo smell. (Tooling per React official docs.)
- **Stale closures + missing deps (#2, #3, #6):** the `eslint-plugin-react-hooks` `exhaustive-deps` rule is the authoritative detector — treat its warnings as errors in CI, never inline-disable to force `[]`.
- **List keys (#4):** React logs a console warning "Each child in a list should have a unique 'key' prop" for missing keys; index/random keys pass the warning but fail under reorder — test by reordering/deleting and watching for lost input or wrong-row state.
- **Hydration (#5):** Next.js throws the hydration-error overlay in dev; reproduce by toggling time/random/`window` reads in render. A clean dev run is the gate.
- **Accessibility (#7, #8):** keyboard-only walkthrough (unplug the mouse) + a screen reader + an automated axe/Lighthouse pass; positive `tabindex` and focus-lost-to-body are catchable by manual Tab-through, which automation often misses.
- **Bundle (#9):** the bundler's analyzer (e.g. `@next/bundle-analyzer`) + a Lighthouse/web.dev run for INP and unused-JS. Concrete byte/INP thresholds are **[quebec-gate]**.

## Owner-gate (NOT promoted)

The following require quebec's verification against the live `mcp-server/web/` app and are NOT asserted here:
- **The app's measured bundle sizes, per-route JS payloads, and INP/Core-Web-Vitals numbers** — every benchmark figure is quebec's to measure; this entry only states the *direction* (smaller startup bundle is better), not a target number.
- **The app's actual WCAG conformance level + which of the focus-management/`tabindex` gotchas currently exist** in the live components — audit, don't assume.
- **Whether the data layer (TanStack Query per the galaxy brain) already covers the fetch-race (#6)** for every route, or whether any hand-rolled fetch-in-effect remains — quebec to inventory.
- **Which components use `memo`/`useMemo`/`useCallback` correctly vs. cargo-culted** (#1, #10) — measure with the Profiler before adding or removing memoization.
- **Any PRISM-specific React 19 / Next.js 15 App-Router behavior** (Server Components, streaming, the `use` hook) that changes the SSR/hydration story (#5) — bind against the live stack + version, not this entry.

## Sources (each WebFetch-confirmed during the 2026-06-10 applied-practice pass)

> Every URL below was fetched + confirmed. Sources are free/legal primary references: React official docs, Next.js official docs, web.dev (Google web-standards guidance), and the W3C WAI ARIA Authoring Practices Guide. No URL is duplicated. No source overlaps the foundations entry's URL set.

- **React.dev — `memo` (props comparison, Object.is, referential equality, memo escape hatches)** (official framework docs) — https://react.dev/reference/react/memo
- **React.dev — `useEffect` (dependencies, stale closures, fetch race / ignore-flag cleanup)** (official framework docs) — https://react.dev/reference/react/useEffect
- **React.dev — You Might Not Need an Effect (derived state, redundant-state trap, effect chains)** (official framework docs) — https://react.dev/learn/you-might-not-need-an-effect
- **React.dev — Rendering Lists (key prop rules, index-as-key + Math.random pitfalls)** (official framework docs) — https://react.dev/learn/rendering-lists
- **React.dev — Render and Commit (recursive re-render, commit only-diffs)** (official framework docs) — https://react.dev/learn/render-and-commit
- **Next.js — React Hydration Error (SSR/client mismatch causes + fixes)** (official framework docs) — https://nextjs.org/docs/messages/react-hydration-error
- **W3C WAI — ARIA Authoring Practices Guide, Developing a Keyboard Interface (focus management, tabindex 0/-1, roving tabindex, focus loss)** (web standards body) — https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/
- **web.dev — Reduce JavaScript payloads with code splitting (bundle parse/compile cost, lazy loading, INP)** (Google web-standards guidance) — https://web.dev/articles/reduce-javascript-payloads-with-code-splitting

## Cross-refs
- Theory companion: `knowledge/wiki/frontend-app/frontend-app-foundations.md` (rendering pipeline §3, one-way data flow §4, WCAG/ARIA §5, HTTP semantics §6, DOM event phases §7)
- Galaxy brain: `mcp-server/src/engines/frontend-app/MEMORY.md`
