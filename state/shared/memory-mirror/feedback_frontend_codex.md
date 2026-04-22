---
name: Frontend Development — Codex Page Protection
description: Never build over Codex frontend pages. Analyze and improve existing pages, maintain Calculator Studio design language.
type: feedback
originSessionId: 8091cec3-cc47-4c85-a178-f7abaaea8614
---
**Rule:** Do NOT build over Codex frontend builds/web pages.

**Why:** Codex has established frontend pages with specific design patterns and functionality. Building new pages that duplicate or override these creates inconsistency and wastes existing work.

**How to apply:**
1. Before creating any new frontend page, check if a similar page already exists
2. If existing page found → analyze and improve it instead of creating new
3. Always maintain existing features and functionality
4. Follow the Calculator Studio page (CalculatorPage.tsx) design concept:
   - PRISM dark theme with glow borders
   - LED sweep spectrum effects
   - Status chips with color coding
   - Tab-based layouts where appropriate
   - Consistent component patterns

**Calculator Studio Design Elements:**
- `prism-glow-*` CSS classes for colored glows (cyan, violet, emerald, amber, red)
- `prism-chip` for status badges
- `prism-spectrum-fill` for progress bars
- `prism-led-sweep` for animated effects
- Dark theme: `bg-[rgba(2,6,23,0.78)]` backgrounds
- Border styling: `border-white/10`, `rgba(148,163,184,0.08)`

**For WIRE-MS0 and similar UI work:**
- Check web/src/pages/ for existing pages first
- Enhance existing pages rather than creating duplicates
- Only create new pages for genuinely new functionality not covered anywhere

**BLOCKING HOOK ENFORCED: pre-frontend-page-create-audit**
- Location: src/hooks/EnforcementHooks.ts
- Mode: BLOCKING (critical priority)
- Requires: frontendFeatureAuditHook.analyze() audit report before page creation
- Blocks if existing page coverage > 50%
- Audit report: data/state/WIRE-MS0/frontend-coverage-audit.json

**WIRE-MS0 Audit Results (2026-04-12):**
- 3 CREATE_NEW: MechanicalDesignPage (done), GrindingPage, WeldingPage
- 9 ENHANCE_EXISTING: ShopFloorLivePage, RootCausePage, PostProcessorGeneratorPage,
  KnowledgeBrowserPage, CalculatorPage (2x), IntegrationsPage, WireEdmWizardPage, SheetMetalQuotePage, ShopProfilePage
- 1 VERIFY_EXISTING: LatheWizardPage (85% coverage adequate)
- 1 AUDIT_ONLY: Final pipeline verification
