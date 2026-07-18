---
title: Frontend-App Resource Atlas — one-stop easy-access hub fusing the LOCAL trove with curated video/seminar + reputable free online resources for modern web front-end development
galaxy: frontend-app
owner_slot: quebec
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas (2026-06-10)"
verification_method: LOCAL store pointers reproduced verbatim from the operator-supplied pre-known set and confirmed present on disk (mcp-server/web/ exists as a real Next.js/Vite app dir with src/, e2e/, deploy config, CLAUDE.md, DESIGN.md). ONLINE + VIDEO sources were each WebFetch-confirmed live + free + legal on 2026-06-10; any handle that 404'd or resolved to a different/ambiguous channel was DROPPED, not guessed (R12). Confirmed online (7): MDN Web Docs, web.dev Core Web Vitals, react.dev/learn, Patterns.dev, W3C WAI-ARIA Overview, MIT 6.031 Software Construction (current site), joshwcomeau.com (free educator). Confirmed video/seminar (4): Fireship YouTube, Theo (t3.gg) YouTube, Chrome for Developers YouTube (web.dev/Core-Web-Vitals talks host), React Conf (conf.react.dev). DROPPED: @JoshWComeau (404), @beautifuldev (resolved to a DIFFERENT channel "DevFrys"), @web-dev (resolved to "Alex"), @React / @reactjs (resolved to ambiguous non-Meta channels) — React Conf is instead surfaced via its official site. No numeric perf/Cpk/safety constant promoted (R12 owner-gate to quebec + constants.ts).
tags: [frontend-app, resource-atlas, easy-access-hub, local-trove, youtube, seminars, free-online, MDN, web-dev, react, nextjs, recharts, tanstack-query, zustand, core-web-vitals, WCAG, WAI-ARIA, patterns-dev, MIT-6031, keep-fresh]
---

# Frontend-App Resource Atlas

The **one-stop easy-access hub** for the **frontend-app** galaxy (owner: quebec). It fuses the two halves a chat in this galaxy needs to jump straight to what it wants:

1. the **LOCAL** stores/corpora that ARE this galaxy (the PRISM web app + its merge-pending frontends + stack); and
2. the **ONLINE / VIDEO** half — curated YouTube channels, free conference talks/seminars, reputable docs/standards, and data reports — for keeping the domain knowledge fresh.

This entry is deliberately DISTINCT from its siblings:
- [[frontend-app-foundations]] = synthesized *theory* (rendering pipeline, semantic HTML, one-way data flow, WCAG/ARIA principles, HTTP semantics, DOM event phases).
- [[frontend-app-source-atlas]] = the *free-college-course + free-textbook* keep-learning curriculum (MIT OCW, freeCodeCamp, Eloquent JS, official docs as courseware).
- [[frontend-app-applied-practice]] = practitioner *gotchas* (memo referential equality, stale closures, hydration mismatch, focus management).
- [[frontend-app-advanced-techniques]] = *world-leader strategy* (perf budgets, RSC architecture, edge rendering).
- **THIS entry** = the *resource hub* — it adds the **LOCAL trove pointers** + the **video/seminar/data-report** half + a one-stop cross-link map, so a quebec engineer reaches the right asset in one hop instead of re-deriving where it lives.

> **Do not stay stagnant.** The whole point of this atlas is easy access to reputable, living sources. Every external URL below was WebFetch-confirmed live on 2026-06-10; re-confirm on the cadence at the foot of the entry.

---

## 1. Local stores + corpora (verbatim, verified)

These are the operator pre-known local pointers — reproduced exactly, confirmed present on disk. Pathway convention = the store/corpus **plus its own index** (read the dir's `CLAUDE.md` / `DESIGN.md` / `README.md` as the index, then the source tree).

| Store / corpus | Pathway | What it is |
|----------------|---------|------------|
| **PRISM web app** | `mcp-server/web/` | Next.js 15 App Router, ~18 routes; `lib/api.ts` → HTTP bridge on **:3100**. The live galaxy. Its index: `mcp-server/web/CLAUDE.md` + `DESIGN.md` + `README.md`. |
| **Pending merge — cqask/ui** | `cqask/ui` (pending merge into `mcp-server/web/`) | A frontend slated to fold into the canonical web app; track via quebec's merge plan. |
| **Pending merge — mcp-cadquery/frontend** | `mcp-cadquery/frontend` (pending merge into `mcp-server/web/`) | A second frontend slated to fold in; track via quebec's merge plan. |
| **Stack** | (within `mcp-server/web/`) | **Recharts** (charts) · **TanStack** (Query/Table, server-state + data grids) · **Zustand** (client state). The galaxy's chosen libraries — pair each with its official docs in §3. |

Pure consumer pattern: the web app talks to every `prism_*` dispatcher exclusively through `lib/api.ts` → the HTTP bridge on **:3100**. Backend physics/safety numbers are NEVER inlined here — they are fetched, owner-gated to the backend + `constants.ts` (see Owner-gate).

> Local merge status (cqask/ui, mcp-cadquery/frontend "pending") is reproduced as given; the authoritative live status is quebec's `/frontend-merge-plan`. Do not re-count routes here — read the app's own index.

---

## 2. Curated YouTube + seminars (WebFetch-confirmed)

Channels and free conference talks for staying current on the web platform + React. Each link below **resolved live on 2026-06-10**; dead/ambiguous handles were dropped (see frontmatter `verification_method`).

| Source | Link | Why it earns a slot |
|--------|------|---------------------|
| **Chrome for Developers** (Google) | https://www.youtube.com/@ChromeDevs | Official Google channel — Core Web Vitals, rendering performance, DevTools, web platform talks. The video companion to web.dev. |
| **React Conf** (Meta + Callstack) | https://conf.react.dev/ | Official React conference — recorded keynotes + talks (archives back to 2015). Free seminar-grade content straight from the React team. |
| **Fireship** | https://www.youtube.com/@Fireship | High-density, fast web-dev explainers (frameworks, JS features, tooling). Good for a rapid "what changed" scan. |
| **Theo — t3.gg** | https://www.youtube.com/@t3dotgg | Opinionated modern full-stack-TS / React / Next.js commentary; useful for framework-tradeoff context. Weight as opinion, cross-check against official docs. |

DROPPED on 2026-06-10 (R12, never list a source that doesn't resolve to what it claims): `@JoshWComeau` (HTTP 404), `@beautifuldev` (resolved to a different channel, "DevFrys"), `@web-dev` (resolved to "Alex", not Google web.dev), `@React`/`@reactjs` (resolved to ambiguous non-Meta channels). Josh Comeau is instead surfaced as his **site** in §3 (which did resolve). React talks are surfaced via the React Conf **site** above.

---

## 3. Reputable free online + data reports (WebFetch-confirmed)

Official docs, standards bodies, and reputable educators — **free + legal only** (no paywall, no LibGen/SciHub). Each resolved live on 2026-06-10.

| Source | Link | Role for this galaxy |
|--------|------|----------------------|
| **MDN Web Docs** | https://developer.mozilla.org/en-US/docs/Web | The reference. HTML / CSS / JS / Web APIs / HTTP / accessibility / performance. First stop for any platform question. |
| **web.dev — Core Web Vitals** | https://web.dev/explore/learn-core-web-vitals | Google's guidance on LCP / CLS / INP — measure/debug/improve + best practices. The *method* for perf; the *thresholds* stay owner-gated (see below). |
| **React docs (react.dev/learn)** | https://react.dev/learn | Official React learning path — components, JSX, state, Hooks, data sharing. Canonical for the galaxy's UI framework. |
| **Patterns.dev** | https://www.patterns.dev/ | Free catalog of design / rendering / performance patterns for JS, React (+Next.js) and Vue. Architecture-pattern reference. |
| **W3C WAI — WAI-ARIA Overview** | https://www.w3.org/WAI/standards-guidelines/aria/ | The accessibility standard (ARIA 1.2, 1.3 in development). Authoritative for roles/states/properties — pairs with the a11y discipline in [[frontend-app-applied-practice]]. |
| **MIT 6.031 — Software Construction** | https://web.mit.edu/6.031/www/sp22/ | Free MIT course on correct/robust/maintainable software (specs, testing, immutability, ADTs). Engineering rigor behind the UI code. Also indexed in [[frontend-app-source-atlas]]. |
| **Josh W Comeau** (educator) | https://www.joshwcomeau.com/ | Free interactive CSS / React / JS / Next.js guides (e.g. the Flexbox guide, a Modern CSS Reset). Strong applied-practice complement. |

Stack-specific official docs to keep one hop away (pair with §1 stack): Recharts, TanStack Query/Table, and Zustand each publish open docs — query them directly when working their surface. (Their exact current version pin is quebec's owner-gate, not promoted here.)

Data reports / living signals worth a periodic read: **web.dev Baseline** + **MDN browser-compat-data** (feature-availability across browsers) are the canonical "is this safe to ship" data archives — both are surfaced as keep-learning sources in [[frontend-app-source-atlas]]; reach them from there.

---

## 4. Cross-links (sibling wiki layers + galaxy hubs)

- [[frontend-app-foundations]] — theory layer (rendering, data flow, a11y principles, HTTP).
- [[frontend-app-source-atlas]] — free college courses + free textbooks (the keep-learning curriculum half).
- [[frontend-app-applied-practice]] — practitioner gotchas (memoization, hydration, focus, splitting).
- [[frontend-app-advanced-techniques]] — world-leader strategy (perf budgets, RSC, edge).
- [[primary-domain-resource-map]] — the fleet-wide map of every galaxy's resource atlas.
- [[prism-methodology-foundations]] — PRISM build/verify/scrutiny method that governs how this galaxy ships.

---

## 5. Keep-fresh cadence

- **Monthly:** re-WebFetch every URL in §2 and §3; a 404 or a channel that no longer resolves to its claimed owner is DROPPED (retry once), not silently kept. Bump `verified_by` + the date on a successful pass.
- **On a platform shift** (new React/Next major, a Core Web Vitals metric change, an ARIA version bump): add the new official source, mark the superseded one, and flag the delta to quebec.
- **On a local merge landing** (cqask/ui or mcp-cadquery/frontend folds into `mcp-server/web/`): update §1 from "pending merge" to the merged path; re-read the app's own `CLAUDE.md`/`DESIGN.md` index rather than re-counting routes here.
- **Drift guard:** this atlas links the *method/source*; never copy a number out of it. If a perf threshold or budget needs to live in code, it goes to the backend + `constants.ts` under quebec's gate, not into this wiki entry.

---

## Owner-gate (NOT promoted)

The following stay owner-gated to **quebec** + canonical code, and are deliberately NOT written as numbers in this atlas (R12):
- Concrete **Core Web Vitals thresholds / performance budgets** (LCP/CLS/INP targets, bundle-size ceilings) — link web.dev's *method*; the live numbers belong to quebec + `mcp-server/src/physics/constants.ts` / the app's deploy config, never copied here.
- Any **manufacturing physics / Cpk / OEE / S(x) safety** value that the UI renders — those are fetched from `prism_*` dispatchers via `:3100` and are owned by the backend + `constants.ts`. The frontend is a pure consumer; it never inlines a cutting constant or a safety threshold.
- The exact **dependency version pins** (Next.js / React / Recharts / TanStack / Zustand) — read from the app's `package.json`, owned by quebec, not duplicated here (it rots).

## Sources

Local (operator pre-known, reproduced verbatim; confirmed present on disk 2026-06-10):
- `mcp-server/web/` — Next.js 15 App Router, ~18 routes, `lib/api.ts` → HTTP bridge :3100 (index: its own `CLAUDE.md` + `DESIGN.md` + `README.md`).
- `cqask/ui` — pending merge into `mcp-server/web/`.
- `mcp-cadquery/frontend` — pending merge into `mcp-server/web/`.
- Stack: Recharts / TanStack / Zustand.

Online + video (WebFetch-confirmed live + free + legal, 2026-06-10):
- MDN Web Docs — https://developer.mozilla.org/en-US/docs/Web ("Web technology for developers | MDN").
- web.dev Core Web Vitals — https://web.dev/explore/learn-core-web-vitals ("Core Web Vitals").
- React docs — https://react.dev/learn ("Quick Start").
- Patterns.dev — https://www.patterns.dev/ ("Improve how you architect webapps").
- W3C WAI-ARIA Overview — https://www.w3.org/WAI/standards-guidelines/aria/.
- MIT 6.031 Software Construction (Spring 2022 site) — https://web.mit.edu/6.031/www/sp22/.
- Josh W Comeau — https://www.joshwcomeau.com/ ("Josh W Comeau homepage").
- Chrome for Developers (YouTube) — https://www.youtube.com/@ChromeDevs.
- Theo — t3.gg (YouTube) — https://www.youtube.com/@t3dotgg.
- Fireship (YouTube) — https://www.youtube.com/@Fireship.
- React Conf — https://conf.react.dev/ ("React Conf 2025").

Dropped on 2026-06-10 (did not resolve to claimed owner — R12): `@JoshWComeau` (404), `@beautifuldev` ("DevFrys"), `@web-dev` ("Alex"), `@React`/`@reactjs` (ambiguous non-Meta).
