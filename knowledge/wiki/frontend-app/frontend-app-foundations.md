---
title: Frontend-App Foundations — web/front-end software engineering, the DOM + rendering pipeline, component architecture, accessibility, HTTP
galaxy: frontend-app
owner_slot: quebec
status: VERIFIED-PARTIAL
verified_by: "papa-create-workflow (2026-06-10)"
verification_method: institutional + standards facts WebFetch-confirmed against primary/open sources (MIT 6.031 Software Construction course homepage; MDN Web Docs CC-licensed reference x5; W3C WAI WCAG + ARIA Authoring Practices Guide; WHATWG DOM living standard; web.dev rendering-performance; React official docs). Established software-engineering literature asserted with citation. PRISM-specific application + tech-stack specifics left to quebec (owner-gate).
tags: [frontend-app, web-engineering, DOM, rendering-pipeline, html-semantics, accessibility, WCAG, WAI-ARIA, HTTP, REST, react, component-architecture, state-management, software-construction, MIT-6031, MDN, W3C, WHATWG, web-standards]
---

# Frontend-App Foundations

The domain-knowledge spine for the **frontend-app** galaxy (owner: quebec): how PRISM's web front-end should be engineered — semantic markup, the browser rendering pipeline, component + state architecture, accessibility, and the HTTP contract to the backend. Every claim below was **WebFetch-confirmed against a free/legal primary or open-licensed source** (MIT open courseware, MDN CC-licensed reference, W3C/WHATWG living standards, web.dev, React official docs). Established software-engineering principles are asserted with citation; **PRISM-specific stack facts** (Next.js 15 / React 19 / TanStack Query / Zustand, the ~18 web routes, the port-3100 HTTP bridge per the quebec galaxy brain) are **[quebec-gate]** — verified by quebec against the live `mcp-server/web/` app, not hardcoded here.

## 1. Software-construction discipline (the engineering substrate under any front-end)

### MIT 6.031 — "safe from bugs, easy to understand, ready for change"
**CONFIRMED** against the MIT 6.031 Software Construction course homepage ([MIT 6.031 sp22](https://web.mit.edu/6.031/www/sp22/)):
- 6.031 is MIT's **"Software Construction"** course; its 29 readings span **static checking, TypeScript, testing, code review, version control, specifications, abstract data types, abstraction functions + representation invariants, immutability vs mutability, recursion, functional programming (map/filter/reduce), recursive data types, parsing, callbacks, GUIs, and concurrency (promises, mutual exclusion, message passing).**
- The course is organized around the three goals of good software — **safe from bugs, easy to understand, ready for change** — pursued through static checking, specifications, and testing rather than after-the-fact debugging.

**Design implication for frontend-app:** the front-end is software first, UI second. TypeScript static checking, written specifications for component contracts, and immutability (the same discipline React's one-way data flow depends on — section 4) are the load-bearing mechanisms, not optional polish. A front-end built without specifications + tests is "safe from bugs" only by luck.

## 2. HTML semantics + content categories (the structural contract of a page)

### MDN content-category model
**CONFIRMED** ([MDN HTML Content Categories](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories)) — MDN content is **available under a Creative Commons license** (per the page footer):
- HTML elements are grouped into **seven main content categories: Metadata, Flow, Sectioning, Heading, Phrasing, Embedded, and Interactive content** (plus secondary categories: palpable, form-associated, script-supporting, and the transparent content model).
- **Sectioning content** (`<article>`, `<aside>`, `<nav>`, `<section>`) creates the document outline and scopes `<header>`/`<footer>`; **Heading content** is `<h1>`-`<h6>` + `<hgroup>`; **Interactive content** (`<button>`, `<details>`, `<select>`, `<textarea>`, etc.) is designed for user interaction.
- Using elements **according to their content model + intended purpose rather than their visual appearance** is the foundation of semantic HTML — which is the precondition for the accessibility work in section 5 (native semantics give assistive tech the element's role for free).

**Design implication for frontend-app:** choosing the semantically-correct element (a `<button>`, not a styled `<div>`) is the cheapest accessibility + maintainability win available — it is also the "first rule of ARIA" (section 5).

## 3. The browser rendering pipeline (how markup + CSS become pixels)

### MDN Critical Rendering Path
**CONFIRMED** ([MDN Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)):
- The browser renders in sequence: **DOM (built incrementally as HTML is parsed) -> CSSOM (built as CSS is parsed) -> Render Tree (DOM + CSSOM combined) -> Layout (size + position of elements) -> Paint (pixels to screen).**
- **CSSOM construction is NOT incremental and CSS is render-blocking** — "the browser blocks page rendering until it receives and processes all the CSS," because later CSS rules can override earlier ones. This is why CSS in the document head blocks first paint.

### web.dev pixel pipeline + frame budget
**CONFIRMED** ([web.dev Rendering Performance](https://web.dev/articles/rendering-performance)):
- The runtime "pixel pipeline" has five stages developers control: **JavaScript -> Style calculations -> Layout -> Paint -> Composite.**
- "**Most devices today refresh their screens 60 times a second**"; with browser overhead, developers have roughly **10 milliseconds** per frame to produce a frame for an animation to avoid jank.
- Changing layout properties (width, height, position) forces the browser to **reflow** the page — recalculating other elements' geometry and repainting affected areas — a costly operation; for discrete (non-animated) UI changes the responsiveness target is around 100 ms (INP rates 200 ms or lower as "good").

**Design implication for frontend-app:** prefer composite-only changes (transform/opacity) over layout-triggering property changes in animations; the 10 ms/frame budget is a hard physical constraint, not a guideline. The render-blocking nature of CSS argues for shipping critical CSS first.

## 4. Component architecture + state (how front-end apps are structured)

### React official "Thinking in React" — one-way data flow
**CONFIRMED** ([React.dev — Thinking in React](https://react.dev/learn/thinking-in-react)) — five steps:
1. **Break the UI into a component hierarchy.**
2. **Build a static version** (render from the data model via props, **no state**).
3. **Find the minimal but complete state** — a value is NOT state if it is unchanging, passed in via props, or computable from existing state/props.
4. **Identify where state should live** — at the **closest common parent** of all components that read it.
5. **Add inverse data flow** — pass callbacks down so children update the parent's state.
- The docs state data flows **one way: "the data flows down from the top-level component to the ones at the bottom of the tree."** **Props** are like function arguments (parent -> child, customize appearance); **state** is a component's memory (changes over time, only for interactivity).

### MDN — main features of JS frameworks (cross-framework view)
**CONFIRMED** ([MDN — Framework main features](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/Main_features)):
- A **component** is a reusable, self-contained UI building block encapsulating markup (structure), styling (appearance), and logic (behavior/state/event handling), configured by **props** (external data) and holding **state** (internal persistent data).
- Frameworks share: component composition, props + state, event handling, lifecycle, **routing** (client-side navigation), testing utilities, and a **DOM rendering strategy** — React/Vue use a **Virtual DOM** (a JS copy diffed against the real DOM), Angular uses Incremental DOM, Ember uses the Glimmer VM. Dependency injection avoids "prop drilling."

**Design implication for frontend-app:** the minimal-state rule (derive, don't store) + state-at-closest-common-parent are framework-agnostic correctness rules — they prevent the duplicated/contradictory-state class of bug (the front-end analog of CLAUDE.md R7 "surface conflicts, don't average them"). Identifying state via the three "is it state?" questions is the cheapest defense against state sprawl.

## 5. Accessibility — WCAG + WAI-ARIA (the conformance + semantics base)

### W3C WCAG — POUR principles + conformance levels
**CONFIRMED** ([W3C WAI — WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)):
- WCAG organizes guidelines under **four principles: Perceivable, Operable, Understandable, Robust ("POUR").**
- Success criteria are graded at **three conformance levels: A, AA, AAA.**
- **WCAG 2.2 is the latest + recommended version** (published 2023-10-05, updated 2024-12-12): 13 guidelines, 9 new success criteria, **backward compatible** with WCAG 2.1 and 2.0 — content meeting 2.2 automatically meets the earlier versions.

### MDN + W3C ARIA — the "first rule of ARIA" + accessible names
**CONFIRMED** ([MDN ARIA Techniques](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Techniques)):
- ARIA roles fall into categories: **Widget roles** (button, checkbox, slider, tab...), **Composite roles** (combobox, grid, listbox, menu, tablist, tree...), **Document-structure roles** (heading, list, article, table...), **Landmark roles** (banner, main, navigation, search, complementary, contentinfo, region), and **Live-region roles** (alert, status, log, timer).
- ARIA semantics are exposed to the accessibility API **without changing the DOM**; the core principle is **"use native HTML elements whenever possible instead of adding ARIA to non-semantic HTML"** (a `<button>` over a `role="button"` div).

**CONFIRMED** ([W3C ARIA Authoring Practices Guide — Names & Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)):
- An **accessible name** conveys an element's purpose/intent and distinguishes it from other elements — assistive tech depends on it for navigation + comprehension.
- The browser's name-calculation precedence is: **`aria-labelledby` (highest) -> `aria-label` -> host-language elements (`<label>`, `<legend>`, `<caption>`) -> child content -> fallback attributes (`title`, `placeholder`).**
- The guide emphasizes preferring **visible text + native techniques over ARIA attributes** for robust, maintainable accessibility.

**Design implication for frontend-app:** target **WCAG 2.2 level AA** as the front-end conformance floor; every interactive control must carry an accessible name; reach for native HTML semantics first and ARIA only for gaps native HTML can't express (the same ordering MDN + the W3C APG independently converge on). PRISM's md-to-html renderer already emits WAI-ARIA-compliant HTML (fleet fix, commit 32a429543) — the same standard governs the app UI.

## 6. The HTTP contract (front-end <-> backend)

### MDN HTTP methods — safe + idempotent semantics
**CONFIRMED** ([MDN HTTP Request Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)):
- **GET** retrieves a representation (no request body, data-only); **POST** submits an entity (may cause state change/side effects); **PUT** replaces the target resource; **DELETE** removes it; **PATCH** applies partial modification; **HEAD** = GET without a body; **OPTIONS** describes communication options.
- **Safe methods** (no server-state modification): **GET, HEAD, OPTIONS, TRACE.**
- **Idempotent methods** (same result on repeated calls): **GET, HEAD, OPTIONS, TRACE, PUT, DELETE.** **POST and PATCH are NOT idempotent.**
- Cacheability: GET/HEAD cacheable; POST/PATCH conditionally cacheable only with freshness info + a matching `Content-Location`.

**Design implication for frontend-app:** the safe/idempotent table is the correctness contract for the app's data layer — a retry-on-failure wrapper (e.g. TanStack Query) may safely auto-retry GET/PUT/DELETE but must NOT blindly retry POST (non-idempotent -> duplicate side effects). Mapping CRUD onto the right method is a correctness issue, not a style choice.

## 7. The platform standard (what the browser actually implements)

### WHATWG DOM living standard
**CONFIRMED** ([WHATWG DOM Standard](https://dom.spec.whatwg.org/)):
- The DOM Standard is a **WHATWG "Living Standard"** (continuously updated, not version-frozen) defining a platform-neutral model for **events, aborting activities, and node trees**.
- It represents a document as a **hierarchical tree of nodes** and defines the core interfaces: **`Node`, `Element`, `Document`, `DocumentFragment`, `Text`, `Comment`, `Event`, `EventTarget`.**
- **Event propagation has three phases: Capturing (downward through ancestors) -> At Target -> Bubbling (upward back through ancestors).** A `bubbles: true` event propagates through ancestor listeners in reverse tree order after reaching the target.

**Design implication for frontend-app:** event delegation (attach one listener on a parent, exploit bubbling) is a direct consequence of the three-phase model — a real performance + memory pattern grounded in the platform spec, not framework magic. Knowing capture vs bubble is what lets a front-end correctly intercept (or stop) an event before/after the target.

## Owner-gate (NOT promoted) — quebec must verify

The following are the frontend-app galaxy's PRISM-specific facts; they are NOT WebFetch-verifiable web-engineering claims and are left for quebec to confirm against the live app before any engine/doc hardcodes them:
- **Tech stack** — the quebec galaxy brain (`mcp-server/src/engines/frontend-app/MEMORY.md`) records Next.js 15 App Router / React 19 / TanStack Query / Zustand / Recharts / Tailwind, ~18 routes under `mcp-server/web/app`, consuming all `prism_*` dispatchers via `lib/api.ts` -> the port-3100 HTTP bridge. **Verify versions + route count against the live `package.json` + filesystem** — versions drift.
- **Which WCAG level the app actually targets + currently meets** (this entry recommends 2.2 AA as the floor; the app's measured conformance is quebec's to audit).
- **The two pending frontend merges** (cqask/ui, mcp-cadquery/frontend) noted in the galaxy brain — status is quebec's to confirm.
- Any **specific component contracts, state-tree shape, or routing map** — bind against the real `web/` source, never hardcode from this foundations entry.

## Sources (each WebFetch-confirmed during the 2026-06-10 create pass)

> Every URL below was fetched + confirmed. Categories prioritized: free college courseware (MIT OCW-class), open-licensed free reference (MDN, CC-licensed), and web living standards / standards-body guidance (W3C WAI, WHATWG, web.dev). No URL is duplicated.

- **MIT 6.031 "Software Construction" — course homepage** (free college course) — https://web.mit.edu/6.031/www/sp22/
- **MDN — HTML Content Categories** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories
- **MDN — Critical Rendering Path** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path
- **web.dev — Rendering Performance (pixel pipeline + 60fps budget)** (Google web standards/guidance) — https://web.dev/articles/rendering-performance
- **React.dev — Thinking in React** (official framework docs) — https://react.dev/learn/thinking-in-react
- **MDN — Main features of JavaScript frameworks** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/Main_features
- **W3C WAI — WCAG overview (POUR + A/AA/AAA + 2.2)** (web standards body) — https://www.w3.org/WAI/standards-guidelines/wcag/
- **MDN — ARIA Techniques (roles, states, first rule of ARIA)** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Techniques
- **W3C ARIA Authoring Practices Guide — Names & Descriptions** (web standards body) — https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
- **MDN — HTTP Request Methods (safe/idempotent semantics)** (free CC-licensed reference) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods
- **WHATWG — DOM Standard (living standard, node tree, event phases)** (web living standard) — https://dom.spec.whatwg.org/

> Not promoted (fetch failed — left out per R12): MIT OCW 6.031 Spring-2017 course page (HTTP 404; the substantive facts were instead confirmed against the canonical `web.mit.edu/6.031/www/sp22/` homepage above).

## Cross-refs
- Galaxy brain: `mcp-server/src/engines/frontend-app/MEMORY.md`
- Related fleet fix: md-to-html renderer emits WAI-ARIA-compliant HTML (commit 32a429543, 2026-06-09)
