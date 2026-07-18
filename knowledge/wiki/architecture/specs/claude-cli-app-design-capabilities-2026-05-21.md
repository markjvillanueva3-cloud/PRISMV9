# Deep Research — Improving Claude CLI App-Design Capabilities

> **Trigger.** User directive 2026-05-21 (slot juliett), immediately after a
> Playwright audit of the PRISM Speed-Feed calculator studio pages:
> *"do deep research on improving claude cli app design capabilities."*
>
> **Method.** `claude-code-guide` agent survey of the Claude Code design
> surface + 2 web-research passes (frontend-aesthetics best practice;
> Playwright-MCP visual loop). Synthesized + mapped onto PRISM's actual
> installed tooling.

## 1. The core finding

Claude Code is **excellent at the engineering half** of frontend work
(wiring components, routing, state, tests, backend integration) and
**mediocre at the design half**. Two root causes, both fixable with
*inputs*, not model changes:

1. **Claude works visually blind by default.** It reasons over markup as
   text; it does not see a rendered UI unless a screenshot is fed back. Gaps
   (overflow, buried CTA, clipped modal, off spacing) only surface at
   runtime. → Fix: a screenshot/Playwright **verification loop**.
2. **"Distributive convergence" → AI slop.** With no aesthetic direction the
   model samples the statistical center of its training data: Inter
   everywhere, muted palettes, identical cards, purple-on-white gradients.
   → Fix: explicit **design direction + token doc** as durable input.

Everything below is leverage applied to those two causes.

## 2. The capability surface (what exists)

### 2.1 Skills
- **`frontend-design`** (Anthropic official, INSTALLED in PRISM) — forces a
  deliberate aesthetic direction (brutalist / editorial / industrial / …)
  before coding; bans Inter/Roboto + purple-on-white clichés; makes Claude
  reason through purpose / tone / constraints / differentiation first.
- **`verify`, `run`** (bundled, INSTALLED) — launch the app, screenshot it,
  compare before/after. The backbone of the visual loop.
- **`skill-creator`, `playground`** (INSTALLED) — author new design skills;
  scratch-space prototyping.
- **`figma:*`** family (INSTALLED, needs OAuth) — design-to-code + code-to-Figma.
- **`chrome-devtools-mcp:*`** family (INSTALLED) — live DOM, a11y, perf,
  LCP / memory-leak debugging.

### 2.2 MCP servers for the design loop
- **Playwright MCP** (INSTALLED — used in the 2026-05-21 SF audit) — real
  Chromium: navigate, click, resize, screenshot, read console + a11y tree.
  Snapshot mode (accessibility tree) is faster + cheaper than screenshots;
  `--caps=vision` adds pixel-coordinate mode. **The piece that turns the
  feedback loop from human-driven to Claude-driven.**
- **Figma MCP** (`mcp.figma.com`, INSTALLED, not yet authenticated) — read
  frames/variables/Code-Connect; write components back as editable layers.
- **Chrome DevTools MCP** — Lighthouse / axe / Core Web Vitals.
- **shadcn / component-registry MCP** — *not installed*; lets Claude read an
  existing component library instead of hand-rolling. PRISM uses Radix UI +
  Tailwind, so a Radix-aware equivalent is the analogue.

### 2.3 The recommended workflow (Anthropic + ecosystem consensus)
```
plan-mode (research + plan, no code)
  → frontend-design skill (commit to an aesthetic direction)
    → generate component against an explicit token doc
      → /run or Playwright MCP → screenshot
        → compare to intent, list concrete gaps, iterate
          → a11y + perf + responsive sweep (Playwright multi-viewport)
            → (optional) push to Figma for designer review
```
Anthropic's 3 aesthetic-prompting strategies: (a) guide typography / color /
motion / backgrounds *individually*, (b) reference concrete design
inspirations, (c) explicitly name the generic defaults to avoid.

## 3. PRISM gap analysis (what's missing here)

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| G1 | No design-token doc → Claude hardcodes hex/px | HIGH | **FIXED 2026-05-21** — `mcp-server/web/DESIGN.md` created |
| G2 | `web/CLAUDE.md` has no aesthetic-direction block (Anthropic's 3 strategies) | HIGH | open |
| G3 | No auto-screenshot verification hook on UI edits | MED | open |
| G4 | Figma MCP installed but not authenticated → design-to-code loop dormant | MED | open (needs operator OAuth) |
| G5 | No `/ui-audit` skill chaining design-token + a11y + responsive checks | MED | open |
| G6 | Component-registry MCP (Radix-aware) not wired → Claude may hand-roll overlays | LOW | open |
| G7 | SF-studio mode buttons miss `aria-pressed` (found in 2026-05-21 audit) | LOW | logged → `U-SFC-A11Y-PRESSED` |

## 4. Improvement plan (highest-leverage first)

1. **G1 — token doc** ✅ done. `web/DESIGN.md` is the portable token index;
   `index.css` stays the value source of truth.
2. **G2 — aesthetic block in `web/CLAUDE.md`.** Append: the "Calculator
   Studio = industrial dark HUD" direction, the "avoid Inter/Roboto +
   purple-on-white" ban, and "reference `DESIGN.md` tokens — never inline
   hex/px." One-shot edit; biggest quality lever after G1.
3. **G3 — verification-loop discipline.** Adopt the screenshot loop as
   standing practice for every UI change (already proven in the 2026-05-21
   SF audit). Optionally a `PostToolUse` hook on `web/src/**/*.tsx` edits
   that flags "run the Playwright screenshot loop."
4. **G5 — `/ui-audit` skill.** Forked-context skill: token compliance vs
   `DESIGN.md` + WCAG 2.2 AA (keyboard, contrast, `aria-pressed`, focus,
   44px targets) + responsive sweep (320 / 768 / 1440). Reusable per page.
5. **G4 — authenticate Figma MCP** (operator action) — unlocks design-to-code.
6. **G7 — ship `U-SFC-A11Y-PRESSED`** — add `aria-pressed` to SF-studio mode
   buttons (Quick/Full/Pareto, Guided/Balanced/Experienced).
7. **G6 — component-registry MCP** — lowest priority; PRISM's Radix usage is
   already conventional.

## 5. The meta-lesson

Claude Code's app-design quality is **input-bound, not capability-bound**.
The three durable inputs that move it most:
1. **A token doc** (`DESIGN.md`) — kills hardcoded-value drift.
2. **An aesthetic-direction block** in `CLAUDE.md` — kills AI slop.
3. **A Claude-driven visual loop** (Playwright MCP screenshots) — kills the
   blind-coding gap; the loop becomes self-correcting instead of
   human-in-the-loop.

PRISM already has every tool installed. The work is wiring the *inputs*
(G1 done, G2 next) and adopting the *loop* as standing discipline.

## Sources
- [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Frontend Design plugin](https://claude.com/plugins/frontend-design)
- [Prompting for frontend aesthetics — Claude Cookbook](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics)
- [Figma × Claude Code MCP setup](https://help.figma.com/hc/en-us/articles/39888612464151-Claude-Code-and-Figma-Set-up-the-MCP-server)
- [Playwright MCP with Claude Code — Builder.io](https://www.builder.io/blog/playwright-mcp-server-claude-code)
- [Round-trip screenshot testing](https://medium.com/@rotbart/giving-claude-code-eyes-round-trip-screenshot-testing-ce52f7dcc563)
- [Transform Claude Code into a self-correcting designer (Playwright MCP)](https://lilys.ai/en/notes/claude-code-20251028/claude-code-self-correcting-designer-playwright-mcp)
- [7 Claude Code design skills that follow a real design process](https://medium.com/@julian.oczkowski/7-claude-code-design-skills-that-follow-a-real-design-process-b871b8673d05)
- [Best Claude Code skills 2026 — Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills)
- [Subagents guide](https://code.claude.com/docs/en/sub-agents)
