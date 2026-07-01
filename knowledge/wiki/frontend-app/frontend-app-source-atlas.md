---
title: Frontend-App Open Source Atlas — the living "keep-learning" directory for modern web front-end development (free/legal sources only)
galaxy: frontend-app
owner_slot: quebec
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: every source below was WebFetch-confirmed live, free-to-access, and legally open during the 2026-06-10 atlas pass. Confirmed set (15): MDN Learn Web Development (CC), web.dev/learn (Google), react.dev/learn (official), TanStack Query docs (open-source), Next.js Learn (Vercel official), W3C WAI fundamentals, Eloquent JavaScript (CC BY-NC), You Don't Know JS Yet (CC BY-NC-ND), WHATWG HTML Living Standard, TC39 ECMA-262, MDN browser-compat-data (CC0), MIT OCW 6.005 Software Construction, Frontend Masters free guides, web.dev Baseline, freeCodeCamp (501c3 nonprofit, 100% free). 1 candidate dropped (Web Dev Simplified YouTube — channel pages do not render via WebFetch, could not confirm content per R12). No paywalled / no LibGen / no SciHub. PRISM-stack version specifics left to quebec (owner-gate).
tags: [frontend-app, source-atlas, keep-learning, open-courseware, free-textbooks, MDN, web-dev, react, nextjs, tanstack-query, WCAG, WAI, WHATWG, ECMAScript, TC39, MIT-OCW, freecodecamp, frontend-masters, baseline, browser-compat-data, living-source-curriculum]
---

# Frontend-App Open Source Atlas

The **living-source curriculum** for the **frontend-app** galaxy (owner: quebec): a curated directory of WHERE to keep learning modern web front-end engineering from reputable **free + legal** sources, so this galaxy's knowledge never goes stale.

This entry is deliberately DISTINCT from its two siblings:
- `frontend-app-foundations.md` = the synthesized *theory* (rendering pipeline, semantic HTML, one-way data flow, WCAG/ARIA principles, HTTP semantics, DOM event phases).
- `frontend-app-applied-practice.md` = the *practitioner gotchas* (memo referential equality, stale closures, hydration mismatch, focus management, code-splitting).
- **THIS entry** = the *keep-learning directory* — the free college courses, free textbooks, lecture/curriculum hubs, official docs, standards, and data archives a quebec engineer returns to as the platform evolves. It does not re-teach the theory; it tells you where to go to refresh and extend it.

Every URL below was **WebFetch-confirmed live + free + legal on 2026-06-10**. A source that could not be confirmed was DROPPED, not guessed (R12). Counts are at the foot of the entry.

---

## 1. Free college courses + open courseware

The software-engineering substrate under any front-end (TypeScript static checking, specifications, immutability, testing). Feeds the **engineering-discipline** layer of the galaxy — the "front-end is software first, UI second" stance in foundations §1.

- **MIT OpenCourseWare — 6.005 Software Construction (Spring 2016)** — https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
  Free MIT OCW: specifications + invariants, testing, abstract data types, OO design, concurrency, functional programming. Downloadable for offline use; the canonical "safe from bugs, easy to understand, ready for change" course (companion to the 6.031 homepage cited in foundations).
  *Feeds:* the engineering-discipline spine — component contracts as specifications, immutability, test-first.

- **MIT 6.031 — Software Construction (current course site)** — https://web.mit.edu/6.031/www/sp22/
  The actively-maintained successor to 6.005, taught in TypeScript; 29 readings spanning static checking, ADTs, parsing, callbacks, GUIs, and promises/concurrency. Use this as the *living* version when the OCW snapshot ages out.
  *Feeds:* same engineering-discipline spine, kept current.

---

## 2. Free structured curriculum hubs (the spine to follow end-to-end)

Reputable, free, structured learning paths — the "follow this in order" anchors for someone ramping the galaxy or refreshing a gap.

- **MDN — Learn Web Development** — https://developer.mozilla.org/en-US/docs/Learn_web_development
  CC-licensed, free. Structured beginner-to-competent path: HTML, CSS, JavaScript, Web APIs/fetch, accessibility (incl. WAI-ARIA), frameworks (React), version control, web performance, testing. Interactive code editors + skill tests.
  *Feeds:* the full-stack-of-the-front-end map (HTML semantics, the HTTP/fetch contract, accessibility) — the primary general curriculum for this galaxy.

- **web.dev — Learn (Google / Chrome team)** — https://web.dev/learn
  12 free expert-written courses: Learn HTML, CSS, JavaScript, Performance, Accessibility, Forms, Images, Design, PWA, Privacy, Testing, AI. No paywall.
  *Feeds:* the rendering-performance + accessibility + forms layers (the pixel-pipeline / INP / a11y material behind applied-practice §7-9).

- **freeCodeCamp** — https://www.freecodecamp.org/news/about/
  501(c)(3) nonprofit; "every aspect is 100% free" (courses, projects, certifications). Project-based front-end curriculum + a large free YouTube channel of long-form course videos.
  *Feeds:* hands-on project repetition + the free lecture-video stream for this galaxy (the video-channel slot in this atlas — confirmed free, unlike the unconfirmable individual creator channels).

- **Frontend Masters — Free Guides / Books** — https://frontendmasters.com/guides/
  Free-to-read-online handbooks: Front-End Handbook 2024, Learning Roadmap, JavaScript (ES2015+) Enlightenment, React Enlightenment. (These specific guides are free; the video courses are paid — only the guides are listed here.)
  *Feeds:* the "what to learn next / how the front-end field is shaped" roadmap + modern-JS + React orientation.

---

## 3. Free textbooks (deep, durable, openly licensed)

Long-form open texts for the JavaScript-language depth that docs skim — read once deeply, return to as reference.

- **Eloquent JavaScript (4th ed., 2024) — Marijn Haverbeke** — https://eloquentjavascript.net/
  Full text free online; text CC BY-NC 3.0, code MIT. Language fundamentals -> browser dev (DOM, events, canvas, HTTP) -> Node.js, with real projects.
  *Feeds:* the JS-language + DOM-manipulation depth under the framework layer (the platform reality the Virtual DOM abstracts over, foundations §4/§7).

- **You Don't Know JS Yet (2nd ed.) — Kyle Simpson** — https://github.com/getify/You-Dont-Know-JS
  Complete series free to read online; CC BY-NC-ND 4.0. Deep mechanics: scope + closures, objects + classes, types + grammar, async.
  *Feeds:* the closure/scope/async-mechanics layer — directly underpins the stale-closure gotcha (applied-practice §2) and the fetch-race async model (§6).

---

## 4. Official docs + framework references (the kept-current canon)

The authoritative, continuously-updated docs for PRISM's front-end stack. These are the *living* sources — version with the libraries, so re-fetch rather than memorize.

- **React — Learn React (official docs)** — https://react.dev/learn
  Free official React learning hub: components/JSX, state + the `useState` Hook, conditional rendering, list keys, events, lifting state up. The canonical reference for the galaxy's component model.
  *Feeds:* component architecture + state (foundations §4) and the entire React-gotchas surface (applied-practice §1-6, §10).

- **Next.js — Learn (Vercel official)** — https://nextjs.org/learn
  Free interactive App-Router course (16 chapters): styling, layouts/pages/navigation, data fetching, static/dynamic rendering + streaming, mutations, error handling, auth, accessibility, metadata. Plus React Foundations + Pages-Router tracks.
  *Feeds:* the App-Router / SSR / streaming model the galaxy brain records (Next.js 15) — the SSR + hydration story behind applied-practice §5.

- **TanStack Query (React Query) — official docs** — https://tanstack.com/query/latest/docs/framework/react/overview
  Open-source, free docs: fetching/caching/synchronizing/updating *server* state, `useQuery`/mutations, pagination + lazy loading.
  *Feeds:* the data layer — the library that handles the fetch-race + retry-idempotency concerns from applied-practice §6 / foundations §6 so the app doesn't hand-roll fetch-in-effect.

---

## 5. Web standards + platform specs (the ground truth)

The authoritative specifications. When docs and reality disagree, the spec wins. Free, living, no paywall.

- **WHATWG — HTML Living Standard (multipage)** — https://html.spec.whatwg.org/multipage/
  The authoritative HTML spec: every element + its content model, forms, interactive elements, parsing algorithms, rendering requirements. Continuously updated (no frozen version).
  *Feeds:* semantic-HTML ground truth (foundations §2) — the definitive arbiter of "is this element used per its content model."

- **TC39 — ECMA-262 ECMAScript Language Specification** — https://tc39.es/ecma262/
  The official JavaScript language standard: types, operators, execution model (lexical environments, scoping, execution contexts), built-ins, grammar, ASI. Free online, latest published edition.
  *Feeds:* the precise language semantics under Eloquent JS / YDKJS — the final word on closures, `this`, type coercion, async ordering.

- **W3C WAI — Accessibility Fundamentals + Resources** — https://www.w3.org/WAI/fundamentals/
  The accessibility standards-body hub: free "Digital Accessibility Foundations" self-paced course, intro videos, principles, components of accessibility, plus the gateway to WCAG + the ARIA Authoring Practices Guide.
  *Feeds:* the accessibility conformance + semantics base (foundations §5, applied-practice §7-8) — the source-of-record for WCAG/ARIA, kept current as new success criteria land.

---

## 6. Data + archives (machine-readable, "can I use it yet?" decisions)

Free, openly-licensed datasets + readiness signals that turn "should I adopt this feature?" into a checkable fact rather than a guess.

- **MDN browser-compat-data (BCD)** — https://github.com/mdn/browser-compat-data
  CC0-1.0 (public domain). Machine-readable browser-compatibility data for Web APIs, CSS, HTML, JavaScript, HTTP, SVG, WebAssembly. Powers MDN, CanIUse, VS Code, TypeScript.
  *Feeds:* automatable feature-support gating for the app — query BCD before relying on a platform feature, instead of trusting a blog post.

- **web.dev — Baseline** — https://web.dev/baseline
  Free Google/WebDX-Community-Group initiative. Tells you a feature's interop status: "Newly available" (works across Chrome/Edge/Firefox/Safari) -> "Widely available" (30 months later, broadly safe). Pairs with BCD as the human-readable adoption signal.
  *Feeds:* the adoption-risk decision layer — "is this CSS/JS feature safe to ship in the PRISM web app yet?"

---

## Keep-fresh cadence

This atlas is a LIVING directory — re-validate it so it never goes stagnant:
- **Quarterly (quebec):** re-fetch the four official-docs URLs in §4 (React, Next.js, TanStack Query) + the stack versions in `mcp-server/web/package.json`. Framework docs drift faster than anything else here; a doc link that 404s or a major-version jump (React 19 -> 20, Next 15 -> 16) is the trigger to refresh §4 and the galaxy brain together.
- **On a WCAG / standards bump:** when a new WCAG version or a new ECMAScript edition publishes, refresh §5 + the foundations conformance floor (currently WCAG 2.2 AA) in lockstep.
- **Annually:** re-confirm every URL is still live + free (the CC-licensed texts and OCW snapshots are stable; the curriculum hubs occasionally reorganize paths). Drop any source that goes paywalled or dead — a shorter verified list beats a stale one (R12).
- **On any drop:** never replace a dead link with a guess; re-search, WebFetch-confirm, then add. Record the drop in the verification_method note.
- **Owner-gate:** PRISM-stack version specifics (exact React/Next/TanStack versions, route count, the port-3100 bridge) live in the quebec galaxy brain, NOT here — this atlas points at the *sources*, quebec binds the *versions*.

## Sources

> All 15 WebFetch-confirmed live, free, and legal on 2026-06-10. No URL paywalled; no LibGen/SciHub. Each is distinct.

1. MIT OpenCourseWare — 6.005 Software Construction (Spring 2016) — https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/
2. MIT 6.031 — Software Construction (current course site) — https://web.mit.edu/6.031/www/sp22/
3. MDN — Learn Web Development (CC-licensed) — https://developer.mozilla.org/en-US/docs/Learn_web_development
4. web.dev — Learn (Google / Chrome team) — https://web.dev/learn
5. freeCodeCamp (501c3 nonprofit, 100% free) — https://www.freecodecamp.org/news/about/
6. Frontend Masters — Free Guides / Books — https://frontendmasters.com/guides/
7. Eloquent JavaScript, 4th ed. (CC BY-NC 3.0 text / MIT code) — https://eloquentjavascript.net/
8. You Don't Know JS Yet, 2nd ed. (CC BY-NC-ND 4.0) — https://github.com/getify/You-Dont-Know-JS
9. React — Learn React (official docs) — https://react.dev/learn
10. Next.js — Learn (Vercel official) — https://nextjs.org/learn
11. TanStack Query — official docs — https://tanstack.com/query/latest/docs/framework/react/overview
12. WHATWG — HTML Living Standard (multipage) — https://html.spec.whatwg.org/multipage/
13. TC39 — ECMA-262 ECMAScript Language Specification — https://tc39.es/ecma262/
14. W3C WAI — Accessibility Fundamentals + Resources — https://www.w3.org/WAI/fundamentals/
15. MDN browser-compat-data (CC0-1.0) — https://github.com/mdn/browser-compat-data
16. web.dev — Baseline — https://web.dev/baseline

> Dropped (could not confirm via WebFetch — not guessed, per R12): Web Dev Simplified YouTube channel (https://www.youtube.com/@WebDevSimplified) — YouTube channel pages return only footer/nav to WebFetch, so video content could not be confirmed; freeCodeCamp's confirmed free curriculum + YouTube channel covers the lecture-video slot instead.

## Cross-refs
- Theory companion: `knowledge/wiki/frontend-app/frontend-app-foundations.md`
- Practitioner companion: `knowledge/wiki/frontend-app/frontend-app-applied-practice.md`
- Galaxy brain: `mcp-server/src/engines/frontend-app/MEMORY.md`
