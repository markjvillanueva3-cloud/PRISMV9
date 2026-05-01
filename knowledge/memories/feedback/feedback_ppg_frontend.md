---
name: PPG frontend must match Codex calculator design
description: All PPG page frontend work must follow the Codex-built calculator/PPG design theme — dark, WorkspacePrimitives, rounded-[22px] panels
type: feedback
originSessionId: b2275eb6-905d-4cfd-b008-2e9529bed75a
---
PPG frontend work must match the Codex-built design from the calculator page.

**Why:** User explicitly said "make sure its to the codex build and you're following the same design theme that it built for the calculator page of the prism app."

**How to apply:**
- Use WorkspacePrimitives: WorkspaceHero, SummaryTile, PanelCard, TabButton, StatusPill, Field, Input, Select, ActionButton
- Dark theme: `bg-[#081018]`, `border-white/10`, `text-slate-50/300/400/500`
- Rounded panels: `rounded-[22px]` for cards, `rounded-[28px]` for sections, `rounded-[32px]` for hero
- Accent colors: cyan-300/400 (primary), emerald (success), violet (status), amber (warning)
- Gradient backgrounds: `bg-[linear-gradient(135deg,...)]` on hero, `bg-[linear-gradient(180deg,...)]` on panels
- Shadow: `shadow-[0_30px_90px_rgba(0,0,0,0.28)]`
- Text: uppercase tracking labels `text-[11px] font-semibold uppercase tracking-[0.22em]`
- PostProcessorGeneratorPage.tsx already has 3386 lines of Codex-built code — extend, don't rewrite
