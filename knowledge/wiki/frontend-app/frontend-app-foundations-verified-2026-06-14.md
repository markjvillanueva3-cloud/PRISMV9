---
name: frontend-app-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the frontend-app galaxy (web/mobile engineering — WCAG accessibility, state management, signals, Next.js data fetching). 6 fetched sources. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: frontend-app
  tier: VERIFIED
  verifiedBy: WebFetch
---

# frontend-app galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source WebFetched + excerpted. Pure web-engineering domain.

## Synthesis
Three interconnected threads. **Accessibility as standards-law** — WCAG 2.2 is now ISO/IEC 40500:2025, so its 86 testable success criteria (POUR: Perceivable/Operable/Understandable/Robust, levels A/AA/AAA) carry international-regulation force in procurement/public-sector; every PRISM surface must be designed against POUR from the component level. **State-management paradigm transition** — the 2024 ASM survey establishes local / library-global (Redux/Zustand/MobX) / server-side (TanStack Query/SWR) as distinct tiers requiring intentional selection; the June-2025 Signal-First paper shows signal-based reactivity is a statistically-significant gain (5.7× execution, 3.2× memory, LCP 310ms faster than VDOM) — the trajectory React is following with the React Compiler. **Data-fetching resolved in Next.js App Router** — async Server Components + native fetch, React.cache memoization, Suspense-bounded streaming, Promise.all parallelism are canonical; client-only fetching is now a narrow interactive/real-time exception.

## Verified sources
### [WCAG 2.2 — W3C Recommendation](https://www.w3.org/TR/WCAG22/) — standard
> "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes (Success Criterion 2.1.1)."

**Knowledge:** WCAG 2.2 (now ISO/IEC 40500:2025) — 86 testable success criteria across 4 POUR principles; technology-agnostic conformance at A/AA/AAA satisfied via component design, keyboard nav, ARIA, color contrast. Mandatory accessibility target in regulated contexts.

### [WCAG 2 Overview — W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/) — standard
> "WCAG 2 is developed through the W3C process... with a goal of providing a single shared standard for web content accessibility."

**Knowledge:** Authoritative entry point for the WCAG family + its legal/governmental adoption worldwide; normative guidance on choosing conformance targets for diverse user populations.

### [Application State Management in Modern Web/Mobile: A Comprehensive Review (arXiv 2407.19318)](https://arxiv.org/abs/2407.19318) — paper
> "By analyzing popular front end frameworks the study delves into local state management mechanisms. It also evaluates the state of front end management libraries."

**Knowledge:** Categorizes ASM into three tiers (local / library [Redux/Zustand/MobX] / server-side) benchmarked on consistency, performance, DX — the comparative framework for selecting the right state layer in React/Next.js.

### [Signal-First Architectures: Rethinking Front-End Reactivity (arXiv 2506.13815)](https://arxiv.org/abs/2506.13815) — paper
> "Signal-First enforces reactive flows from explicit signal declarations, with derived values via computed() and side effects scoped to effect()... eliminating implicit subscriptions."

**Knowledge:** Signal-based reactivity — 5.7× faster execution, 3.2× memory efficiency, LCP 310ms faster than React-style VDOM. Signals (Angular 19, SolidJS, Qwik) are the paradigm React converges toward via the React Compiler.

### [Next.js Documentation: Fetching Data (App Router)](https://nextjs.org/docs/app/getting-started/fetching-data) — article
> "Identical fetch requests in a React component tree are memoized by default, so you can fetch data in the component that needs it instead of drilling props."

**Knowledge:** Canonical App Router data patterns — async Server Components with native fetch, React.cache cross-component memoization, Suspense-bounded streaming (loading.js), Promise.all parallel fetching, SWR/TanStack Query for client. Governs PRISM frontend↔MCP-dispatcher data flows.

### [React Documentation: Managing State](https://react.dev/learn/managing-state) — article
> "Redundant or duplicate state is a common source of bugs."

**Knowledge:** Official patterns — lifting state up, useReducer for complex state machines, Context for cross-tree sharing, derive-don't-duplicate. The baseline all third-party libraries (Zustand, Jotai, XState) extend.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
