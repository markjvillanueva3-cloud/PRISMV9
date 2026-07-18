# `components/prism` — Calculator Studio design-system primitives

Quebec /goal-loop 2026-05-26 / U-Q-PRISM-PRIMITIVES.

Shared component kit that wraps the Calculator Studio CSS classes (`prism-glow-*`, `prism-chip`, `prism-spectrum-fill`, `prism-led-sweep`) as typed React components, so every PRISM app domain — post-processors (echo), milling wizard (foxtrot), wire wizard (mike), lathe wizard (whiskey), speed/feed (oscar), CAM (kilo), CAD (delta), quote (charlie), ERP/HR (hotel), academy (lima) — can render Calculator Studio's visual language without re-implementing the styles.

Other chats: import from `@/components/prism` (or relative `../../components/prism`). Quebec owns the kit; reuse it freely.

## Usage

```tsx
import { PrismGlowCard, PrismChip, PrismSpectrumFill, PrismLedSweep } from "../../components/prism";

// Card surface — replaces hand-typed `prism-glow-cyan border ...` divs.
<PrismGlowCard color="cyan" role="region" aria-label="Tool status">
  <h2 className="text-lg font-bold">Tool 17 — 1/2" 4F Carbide EM</h2>
  <PrismChip tone="emerald">READY</PrismChip>
  <PrismSpectrumFill value={0.62} withPercent />
</PrismGlowCard>

// Live-indicator wrapper — sweeps a white band across the content on a 5.8s loop.
<PrismLedSweep active={machine.running}>
  <span>{machine.name} — {machine.programNumber}</span>
</PrismLedSweep>
```

## Component contracts

| Component | Wraps CSS class | Purpose |
|---|---|---|
| `<PrismGlowCard color={cyan|violet|emerald|amber|red}>` | `.prism-glow-{color}` | Card surface with colored border + soft glow |
| `<PrismChip tone={cyan|violet|emerald|amber|red|slate}>` | `.prism-chip` | Status badge — uppercase letter-spaced |
| `<PrismSpectrumFill value={0..1}>` | `.prism-spectrum-fill` | Red→green progress bar with outer glow |
| `<PrismLedSweep active>` | `.prism-led-sweep` | Animated diagonal sweep — "live / streaming" affordance |

## Tone semantics

Use the same tone for the same meaning across domains:

| Tone | Use for |
|---|---|
| `cyan` | informational / running / active |
| `violet` | queued / pending / scheduled |
| `emerald` | success / ready / passing |
| `amber` | warning / draft / waiting-on-input |
| `red` | error / blocked / out-of-tolerance |
| `slate` (chip only) | neutral / inactive |

## Why a typed kit, not just CSS

- **Type-checked tone enums** prevent typos like `prism-glow-cyann` from silently rendering an unstyled card.
- **One import path** = one upgrade path. When Calculator Studio gets a new visual layer, every consumer picks it up by re-installing.
- **Accessibility defaults** baked in — `<PrismSpectrumFill>` ships `role="progressbar"` + ARIA value attributes; `<PrismLedSweep>` marks the band `aria-hidden`.
- **Anti-vibe-coded** per `feedback_ui_ux_ai_mutations_flag_gated`: agents proposing visual mutations should compose existing primitives instead of inventing new CSS.

## Cross-references

- `web/DESIGN.md` — design doctrine (motion / state-coverage / a11y / Codex protection / AI-mutation flag-gating).
- `web/src/lib/motion.ts` — companion motion tokens (`motionStyle("modal-open")` etc).
- `web/src/index.css` — CSS source-of-truth lines 3670-3690 for the wrapped classes.
- `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.6 — vibe-coded vs professional gap.
- `H:/fleet-status.md` — quebec = frontend web + phone app domain; other chats own their domain pages and consume this kit.
