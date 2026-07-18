---
name: reference_oscar_sfc_fe_p3_strategy_panel_2026_05_30
description: SFC frontend P3 — wired the inert mill StrategyPanel in CalculatorPage to live state + dynamic ISO; the testable-seam pattern for editing the untestable 13.7k-line page
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.702Z
aliases: reference_oscar_sfc_fe_p3_strategy_panel_2026_05_30
---


OSCAR-SFC-9AXIS-MS0/U-OSC9-FE-P3 (slot:oscar, 2026-05-30, commit `b0942e512e`). Closed the last identified frontend gap of the operator's "finish building the front end app of the calculator" order.

**What was wrong:** the mill `StrategyPanel` (operation-sequence picker — facing/roughing/finishing/HSM/trochoidal/adaptive/rest/pencil with drag-reorder) rendered in `CalculatorPage.tsx` (~line 9283) but inert: `selectedStrategies={[]}` + no-op `onStrategiesChange={() => {/* Phase B: wire to calculatorStore */}}` + hardcoded `materialIsoGroup="P"`. The "calculatorStore" the comment promised **never existed** — the page holds all state in `useState`, no Zustand store.

**Fix (3 hunks):** (1) `const [millStrategies, setMillStrategies] = useState<MillingStrategy[]>([])`; (2) render now `selectedStrategies={millStrategies} onStrategiesChange={setMillStrategies}`; (3) `materialIsoGroup={resolveMillStrategyIso(selectedMaterial?.isoGroup)}` so the ISO chip tracks the actually-selected material. StrategyPanel is self-managing (computes each new array purely from the `selectedStrategies` prop, calls `onStrategiesChange([...])`), so the parent only holds + passes back.

**Reusable pattern — the testable seam:** `CalculatorPage.tsx` is 13.7k lines and NOT vitest-testable in a slot worktree (no `@types/react` → `react/jsx-runtime` has no decl file). So the only NEW logic — coercing the wide `selectedMaterial.isoGroup: string` to the panel's `"P"|"M"|"K"|"N"|"S"|"H"` union — was extracted into a tiny standalone pure module `web/src/components/mill/strategyIso.ts` (`resolveMillStrategyIso`, `VALID_ISO_GROUPS.find(g => g === iso)`), tested in `web/src/__tests__/strategyIso.test.ts` (8 cases, 6 failure modes incl. case-sensitivity + embedded-substring `P20`/` P`). When you must edit the untestable monolith page, push the genuinely-new logic into a small co-located pure helper and test THAT — the page wiring then carries zero untested logic. Standalone module also keeps the `lazyNamed` chunk isolation (no transitive runtime import of StrategyPanel.tsx into the main bundle); the `MillingStrategy` type comes in via `import type` (erased).

Verify in-worktree: `cd mcp-server && npx vitest run web/src/__tests__/strategyIso.test.ts --root .` (web's own vite config can't load without `@vitejs/plugin-react`; run web pure-core under the mcp-server node config). Full page render NOT verifiable in-worktree — stated honestly per R12. 87/87 web pure-core suite green; 2-of-2 Claude scrutiny PASS.

Sibling SFC frontend work this session: P1 (tool-life wired into Mill+Lathe panels via [[reference_oscar_sfc_domain_map_2026_05_27]] extended-Taylor), P2 (PRISM-vs-vendor compare test+fine-tune surface). Backend gaps still open: T1-B semi-discretization chatter solver (needs proper augmented-monodromy build), JC single-source dedup (JohnsonCookEngine 62 vs JohnsonCookModel 63 drift).
