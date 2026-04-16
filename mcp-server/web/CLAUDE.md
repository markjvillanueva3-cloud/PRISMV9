# PRISM Web Frontend — Development Rules

## Codex Page Protection (CRITICAL)
**DO NOT build over Codex frontend builds/web pages.**

Before creating ANY new page:
1. Check `web/src/pages/` for existing pages with similar functionality
2. If found → analyze and improve the existing page
3. Only create new pages for genuinely new functionality

## Design Language: Calculator Studio
All pages MUST follow the Calculator Studio (CalculatorPage.tsx) design concept:

### Theme
- PRISM dark theme with glow borders
- LED sweep spectrum effects
- Consistent color palette

### CSS Classes
```css
/* Glow effects */
.prism-glow-cyan, .prism-glow-violet, .prism-glow-emerald, .prism-glow-amber, .prism-glow-red

/* Components */
.prism-chip          /* Status badges */
.prism-spectrum-fill /* Progress bars */
.prism-led-sweep     /* Animated effects */

/* Backgrounds */
bg-[rgba(2,6,23,0.78)]

/* Borders */
border-white/10
rgba(148,163,184,0.08)
```

### Status Color Mapping
- Cyan: ordered, shipped, info
- Violet: scheduled, pending
- Emerald: in_progress, complete, success
- Amber: on_hold, qc_pending, warning
- Red: qc_failed, error

## Page Structure
- Tab-based layouts for multi-feature pages
- Status chips with color coding
- Progress bars with spectrum fill
- Consistent card components

## API Integration
- API clients in `web/src/api/`
- Types in `web/src/types/`
- Hooks in `web/src/hooks/`
- Routes wired in `App.tsx`

## Existing Pages (102 total)
Check these before creating new pages:
- CalculatorPage.tsx (12,909 LOC) — main speed/feed calculator
- ShopFloorLivePage.tsx — job/labor tracking
- LatheWizardPage.tsx, WireEdmWizardPage.tsx — wizard flows
- See full list with `ls web/src/pages/`
