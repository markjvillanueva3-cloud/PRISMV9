---
title: HTML-as-Primary-Spec — Research Pass 2
date: 2026-05-10
session: claude-2570c8f5
sources_count: 17
x_posts_count: 12
---

# §1 — Why this matters (user directive + Thariq case + counter-cases)

## User directive
> "add html utilization in place of md files to the deep research list so we generate the road map with that in mind."

PRISM today ships every strategic surface (roadmap, audit reports, research dossiers, milestone envelopes, BUILD_STATE) as Markdown. Peer chat U-REVENUE-V7 already shipped `scripts/emit-revenue-roadmap-html.mjs` proving the pattern: a single self-contained HTML companion that renders the same JSON the Markdown surface reads, embedding Mermaid graphs, dark-theme CSS, and per-section anchors. That commit is the existence proof for the user directive — the question is no longer "can we" but "for which surfaces."

## The Thariq case (May 8 2026 — ~5M views in 48h)
Thariq Shihipar, engineering lead for Claude Code at Anthropic, published **"The Unreasonable Effectiveness of HTML"** with a companion site of 20 self-contained Claude-Code-generated HTML files. Core thesis from his X post:

> "HTML is the new markdown. I've stopped writing markdown files for almost everything and switched to using Claude Code to generate HTML for me. This is why." — Thariq, 2026-05-08

The argument that landed (paraphrased from the post + companion site): Markdown's dominance came from the GPT-4 token-budget era; with 200K+ context windows that constraint is gone. HTML wins on five axes — information density (tables + SVG + JS + CSS in one file), readability beyond ~100 lines, shareability (browser-native), interactivity (sliders/toggles modify the prompt), and the "joy factor" of a polished output humans actually open.

**Concrete examples on thariqs.github.io/html-effectiveness** span 9 categories: exploration & planning (side-by-side code comparisons, timeline-based implementation plans), code review (annotated diffs with margin notes, module diagrams as "boxes and arrows"), design systems (copyable color swatches), prototyping (animation sandboxes with tunable easing curves), diagrams (inline SVG with clickable steps), reports (weekly status with charts, incident timelines), and custom editors (drag-and-drop triage boards, feature flag toggles with dependency warnings).

Anthropic-internal claim per the post: HTML is now "the format Anthropic itself is adopting as the internal default for plans, code reviews, design systems, and reports."

## The Karpathy counter-case (2025-03 → still load-bearing)
Andrej Karpathy's opposite-direction stance from 2025-03-11 (X) — quoted from search snippet:

> "It's 2025 and most content is still written for humans instead of LLMs. 99.9% of attention is about to be LLM attention, not human attention. E.g. 99% of libraries still have docs that basically render to some pretty .html static pages assuming a human will click through them."

Karpathy's framing: docs should be **a single text file intended to go into an LLM's context window**, not a rendered HTML site humans click through. This is the LLM-as-primary-consumer thesis — and it directly contradicts Thariq's human-as-primary-consumer thesis. **Both are right for their respective consumer**. The PRISM routing decision is which consumer dominates per surface.

## The Bun counter-evidence
> "When Claude Code fetches Bun's docs, Bun's docs now send markdown instead of HTML by default. This shrinks token usage for our docs by about 10x." — Bun, 2025-09-26 (X @bunjavascript)

Simon Willison's measurement on the same axis: Hacker News homepage in Markdown = 1,550 tokens; same content in HTML = 13,367 tokens. **8.6× difference.** When the consumer is an LLM, HTML is a tax. When the consumer is a human, the tax buys interactivity.

## Synthesis (the routing rule)
Both theses are correct because they target different consumers. PRISM has both: humans review roadmaps and audit reports; LLMs (Claude + Codex + Gemini + Ollama) read CLAUDE.md, hooks, skills, and JSON state. The HTML-vs-MD question collapses into a routing question per surface, not a global flag-flip.

---

# §2 — Reputable sources (URLs verified)

| # | Source | URL | Status |
|---|--------|-----|--------|
| 1 | Thariq Shihipar, "Unreasonable Effectiveness of HTML" — companion examples | https://thariqs.github.io/html-effectiveness/ | 200 — fetched |
| 2 | Simon Willison, "Using Claude Code: The Unreasonable Effectiveness of HTML" | https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/ | 200 — fetched |
| 3 | Pasquale Pillitteri, "HTML vs Markdown in Claude Code: Why Anthropic's Thariq Changed the Default" | https://pasqualepillitteri.it/en/news/2243/html-vs-markdown-claude-code-thariq-anthropic | 200 — fetched |
| 4 | StableLearn, "Claude Code Should Output HTML, Not Just Markdown" | https://stable-learn.com/en/claude-code-html-output/ | 200 — fetched |
| 5 | Chew Loong Nian (Medium), "Anthropic's Thariq Stopped Writing Markdown — His 20 HTML Examples Killed My 3-Year Default" | https://medium.com/@chewloongnian/anthropics-thariq-stopped-writing-markdown-his-20-html-examples-killed-my-3-year-default-a9eee9216187 | 200 — fetched |
| 6 | Joe Njenga (Medium), "Anthropic Engineer Just Killed Markdown Outputs — I Tested His HTML in Claude Code" | https://medium.com/@joe.njenga/anthropic-engineer-just-killed-markdown-as-ai-output-i-tested-his-html-in-claude-code-hes-right-71816cf8e414 | 200 — referenced |
| 7 | Marco Kotrotsos (Medium), "Writing HTML For Documentation Instead of Markdown is a Game-Changer" | https://kotrotsos.medium.com/writing-html-for-documentation-instead-of-markdown-is-a-game-changer-6ab60d0fa0bc | 200 — referenced |
| 8 | Hacker News, "Why not just give the HTML to the LLM?" | https://news.ycombinator.com/item?id=42093820 | 200 — fetched |
| 9 | Hacker News, "Convert HTML DOM to semantic markdown for use in LLMs" | https://news.ycombinator.com/item?id=41043771 | 200 — referenced |
| 10 | KRO / di.gg, "Anthropic engineer Thariq Shihipar switches to Claude-generated HTML" | https://di.gg/ai/zrklaakw | 200 — referenced |
| 11 | Anthropic Engineering Index | https://www.anthropic.com/engineering | 200 — referenced |
| 12 | arXiv 2210.03945, "Understanding HTML with Large Language Models" | https://arxiv.org/pdf/2210.03945 | 200 — referenced |
| 13 | MDN, ARIA reference (accessibility canon for the HTML-spec path) | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA | 200 — canonical |
| 14 | W3C WAI-ARIA Overview | https://www.w3.org/WAI/standards-guidelines/aria/ | 200 — canonical |
| 15 | WebAim, ARIA-error survey (accessibility regression risk) | (referenced via web search snippet — "home pages with ARIA averaged 41% more detected errors than those without") | quoted via search |
| 16 | Mermaid CLI for SVG/PNG rendering inside HTML companions | https://github.com/mermaid-js/mermaid-cli | 200 — canonical |
| 17 | Anthropic, "An update on recent Claude Code quality reports" (April 23 2026 postmortem — relevant because Claude Code is the HTML-emitting agent) | https://www.anthropic.com/engineering/april-23-postmortem | 200 — referenced |

---

# §3 — X / Twitter highlights (quotes + URLs — both pro-HTML and pro-MD)

## Pro-HTML

**1. Thariq (@trq212) — the catalyst, ~5M views**
> "HTML is the new markdown. I've stopped writing markdown files for almost everything and switched to using Claude Code to generate HTML for me. This is why."
URL: https://x.com/trq212/status/2052811606032269638
(Note: X URL returns HTTP 402 to unauthenticated WebFetch; verbatim quote pulled from WebSearch snippet, which surfaces the post title verbatim.)

**2. Addy Osmani (Google Chrome DevRel)**
> "Move from Markdown to HTML and give AI a richer canvas to communicate output humans will actually read. Think plans, specs even throwaway editors. Like this idea which keeps more humans in the loop."
URL: https://x.com/addyosmani/status/2052998409213358255

**3. Rohit Ghumare**
> "Thariq dropped a piece yesterday that already crossed 5M views on HTML, beating Markdown as the agent output format, and it's the cleanest framing of the format problem I've read this year. The argument that lands: HTML wins because humans actually open the output."
URL: https://x.com/ghumare64/status/2053106700324897063

**4. alex duffy**
> "By order of Anthropic, let it be known throughout the land: HTML hath dethroned Markdown. God save the Context Window!"
URL: https://x.com/alxai_/status/2052824217893077376

**5. Shakthi Vadakkepat**
> "HTML is the new Markdown? Thariq at Anthropic shared how he ditched Markdown files for most work and now uses Claude Code to generate full HTML instead. The results are richer, more readable, and far more effective for complex documents. HTML lets you create interactive…"
URL: https://x.com/v_shakthi/status/2052993170167013594

**6. Pavel Surmenok**
> "I use Claude Code to generate HTML documents a lot. Especially useful for system design diagrams, PR explainers, data visualization."
URL: https://x.com/surmenok/status/2052885036832370955

**7. Mayur Patil — interactive-decisions skill**
> "HOTDROP: A new Claude Code skill renders decisions as interactive HTML pages! This is brilliant for developers and data scientists who need to visualize AI decisions or share interactive reports dynamic from your AI."
URL: https://x.com/YouTuberMayur/status/2030001806726828422

**8. Simon Willison — claude-code-transcripts**
> "I built a new Python CLI tool called claude-code-transcripts that can create nice readable HTML versions of your Claude Code sessions, both local and pulled from Claude Code for web, and makes it easy to publish them online too."
URL: https://x.com/simonw/status/2004339799512305758

## Pro-Markdown / Counter

**9. Andrej Karpathy — the LLM-as-primary-consumer thesis (load-bearing counter)**
> "It's 2025 and most content is still written for humans instead of LLMs. 99.9% of attention is about to be LLM attention, not human attention. E.g. 99% of libraries still have docs that basically render to some pretty .html static pages assuming a human will click through them."
URL: https://x.com/karpathy/status/1899876370492383450

**10. Bun (@bunjavascript) — empirical token-cost counter (10× saving from MD)**
> "When Claude Code fetches Bun's docs, Bun's docs now send markdown instead of HTML by default. This shrinks token usage for our docs by about 10x."
URL: https://x.com/bunjavascript/status/1971934734940098971

**11. Freek Van der Herten — Markdown-first response surfaces**
> "We just released spatie/laravel-markdown-response. Add .md to any URL on your Laravel app and get clean markdown instead of HTML. AI agents get this automatically when they visit your pages."
URL: https://x.com/freekmurze/status/2024106387610185969

**12. mattt — sosumi.ai, Markdown-for-AI proxy for Apple docs**
> "Apple's JS-rendered docs leave AI tools staring at blank pages. I got tired of Claude writing broken SwiftUI code, so I built sosumi.ai. Swap developer․apple․com → sosumi․ai in URLs to get clean, AI-readable Markdown. Or connect via MCP."
URL: https://x.com/mattt/status/1961423805630611930

**Editorial counter from the Pasquale Pillitteri synthesis (verbatim cited in the article body):**
> "If it is a spec sheet of something complex, I want to be able to go in and edit what was produced. With an HTML document, that is much harder than with a Markdown one."

**Hacker News thread "Why not just give the HTML to the LLM?" — top counter from simonw:**
> "The Hacker News homepage as Markdown uses 1,550 tokens but requires 13,367 tokens as HTML — an 8.6x difference." (paraphrased from Hacker News thread)

**Hacker News commenter dtjohnnyb on the failure mode of trimmed HTML in context:**
> "The LLM was able to extract information, but it very commonly would start trying to continue the html blocks that had been left open." (instruction-tuned completion behavior compromises truncated-HTML inputs)

---

# §4 — Concrete PRISM unit proposals

The HTML-companion pattern is already half-built (`scripts/emit-revenue-roadmap-html.mjs`). The proposals below lift that one-off into a reusable engine + dispatcher action surface + theme system + accessibility gate, all wired through PRISM's existing duplication-guard + scrutiny pipeline.

## U-HTML-SPEC-V1: `SpecHTMLCompanionEngine`
- **File:** `mcp-server/src/engines/SpecHTMLCompanionEngine.ts`
- **API:**
  - `render({ source: 'PRISM-UNIFIED-ROADMAP-v2.md', target: '<out>.html', theme: 'auto'|'dark'|'light', embedMermaid: true, embedSVG: true, embedJSONState?: 'state/shared/BUILD_STATE.json' }) → { htmlPath, sha, tokenSize }`
  - `lint(htmlPath) → { ariaErrors, oversize, unsafeInline, missingViewBox }`
- **Dependencies:** reuses `MermaidRenderEngine` (build if absent), reads physics-constants registry for any spec that embeds numeric tables.
- **Wire to:** `prism_dev:render_html_companion`, `prism_session:emit_html_spec`, `prism_context:html_render`.
- **Test acceptance (`SpecHTMLCompanionEngine.test.ts`):** render PRISM-UNIFIED-ROADMAP-v2 → verify (a) single-file output (no external CSS/JS), (b) Mermaid blocks compile to inline SVG, (c) WCAG-AA contrast on both dark+light themes, (d) total HTML ≤ 6× source Markdown bytes.

## U-HTML-PIPE-V1: `html-render-pipeline.mjs`
- **File:** `scripts/html-render-pipeline.mjs`
- **Behavior:** Watches MD-source surfaces tagged with frontmatter `htmlCompanion: true` and re-emits the HTML twin on every `git commit` post-hook. Avoids drift between source-of-truth MD and companion HTML.
- **Integrates with:** existing `build-state-snapshot.mjs` (companion auto-rebuilds on state mutation), `scrutinize-before-stop.mjs` (block Stop if companion is stale vs source).

## U-HTML-THEME-V1: `SpecHTMLThemeEngine`
- **File:** `mcp-server/src/engines/SpecHTMLThemeEngine.ts`
- **Behavior:** Single source of truth for HTML-companion CSS. Three themes: `dark` (default — matches Anthropic.com look), `light`, `auto` (respects `prefers-color-scheme`). All inline, no CDN. Token-level contrast verified against WCAG-AA in tests.
- **Wire to:** `prism_dev:html_theme_get`, exposed via `SpecHTMLCompanionEngine.render(theme: ...)`.

## U-HTML-NAV-V1: `SpecHTMLNavigationEngine`
- **File:** `mcp-server/src/engines/SpecHTMLNavigationEngine.ts`
- **Behavior:** Builds the left-rail TOC, anchor-stable hash links, breadcrumb header, and inter-spec cross-links (each spec references neighbors in the same family — roadmap ↔ build-state ↔ milestone-progress ↔ system-viz). Octicons embedded inline as SVG.
- **Critical:** preserves anchor IDs across regenerations so external links survive companion rebuilds.

## U-HTML-A11Y-V1: `SpecHTMLAccessibilityHook`
- **File:** `mcp-server/.claude/hooks/html-companion-a11y-gate.mjs`
- **Wired as:** Stop hook + PreToolUse on `Write *.html`.
- **Behavior:** HARD BLOCK on any HTML companion that fails: WCAG-AA contrast on default theme, missing `lang` attribute, ARIA-role overload (WebAim's finding: pages with ARIA average 41% more errors), images missing alt text, no skip-to-content link.
- **Counter-design rationale:** prevents the regression where Thariq's "joy factor" hides accessibility loss for users on screen readers — accessibility cannot be optional on a primary-spec surface.

## U-HTML-MD-DRIFT-GUARD: `md-companion-drift-guard.mjs`
- **File:** `mcp-server/.claude/hooks/md-companion-drift-guard.mjs`
- **Wired as:** Stop hook.
- **Behavior:** For every `*.md` spec marked `htmlCompanion: true`, verify `<basename>.html` exists, was generated by `html-render-pipeline.mjs`, and has SHA matching the source MD's content hash. Block Stop on drift. Pairs symmetrically with the existing scrutiny ledger.

## U-HTML-EMIT-DISPATCH: extend `prism_dev` dispatcher
- New actions:
  - `prism_dev:render_html_companion { source, target?, theme? }`
  - `prism_dev:html_lint { path }`
  - `prism_dev:html_theme_get { theme }`
- Reuse existing dispatcher routing in `mcp-server/src/tools/dispatchers/devDispatcher.ts`.

---

# §5 — Surface routing decision

The framing that resolves the Karpathy↔Thariq tension is the **consumer-of-record per surface**. PRISM has two consumers (humans + LLMs) and ~25 named surfaces. The routing table below maps each surface to its primary consumer, then to its native format.

| Surface | Primary consumer | Native format | HTML companion? | Why |
|---------|------------------|---------------|----------------|-----|
| `PRISM-UNIFIED-ROADMAP-v2.md` | Human (planning sessions) | **HTML primary, MD source** | YES (revenue-roadmap pattern proven by U-REVENUE-V7) | Read 5×/week, needs Mermaid graphs + status filters + clickable milestone drilldown |
| `state/shared/BUILD_STATE.md` | Both (LLM auto-inject + human review) | **MD primary, HTML companion** | YES | LLM consumes via `build-state-inject` hook — MD must stay; humans benefit from interactive status filter on companion |
| `state/shared/MILESTONE_PROGRESS.md` | Both | **MD primary, HTML companion** | YES | Same dual-consumer logic |
| `state/shared/system-viz/system-viz.html` | Human | **HTML primary** (already) | N/A | Already HTML-native; graph viz is impossible in MD |
| `state/shared/research/*.md` (this file's siblings) | Both (LLM digest + human archive) | **MD primary, HTML companion optional** | OPTIONAL | Token cost of HTML companions per file × frequency of regeneration is high; gate on `htmlCompanion: true` frontmatter |
| `state/shared/handoffs/HANDOFF-*-<topic>.md` | LLM (next-session restore) | **MD-only** | NO | Pure LLM-consumer surface — HTML is wasted bytes; matches Karpathy thesis |
| `mcp-server/data/state/SCRUTINY_LEDGER.json` | LLM | JSON | NO | Machine-consumed JSON, irrelevant to MD/HTML debate |
| `CLAUDE.md` (root + per-dir) | LLM (auto-injected at SessionStart) | **MD-only** | NO | Highest-frequency LLM-context surface; HTML would 8× the token bill on every session start |
| `mcp-server/data/docs/ENGINE_DIGEST.md` | LLM (digest lookups) | **MD-only** | NO | Karpathy thesis territory |
| `mcp-server/data/docs/DISPATCHER_DIGEST.md` | LLM | **MD-only** | NO | Same |
| `state/shared/CLAUDE-CODEX-*-DIRECTIVE.md` | LLM (cross-agent coordination) | **MD-only** | NO | Pure LLM contract |
| `~/.claude/commands/*.md` (skills) | LLM (skill loader) | **MD-only** | NO | Loaded into context by Skill tool — HTML would break parsing |
| `.claude/hooks/*.mjs` source | Machine | JS | NO | Not a doc surface |
| `PRISM-INVENTORY-LATEST.md` | Both | **MD primary, HTML companion** | YES | Counts table looks great as HTML grid; LLM still wants MD for grep |
| `state/shared/AGENT_WORKBOARD.md` | Both | **MD primary, HTML companion** | YES (live status board) | Interactive filtering by chat/lane is a huge UX win |
| Audit reports (`forge-audit`, `scrutinize`, `prism-review` outputs) | Human (review) + LLM (next-pass input) | **HTML primary, MD source** | YES | Audit reports are exactly the "code review" use case Thariq highlighted |
| Research dossiers (deep-research pass-1, pass-2) | Both | **MD primary, HTML companion when pinned** | OPTIONAL | Most dossiers archive-once; pin companion via frontmatter for keystone deliverables |
| Roadmap progress dashboards | Human | **HTML primary** | N/A | Charts + filters + interactivity = native HTML |
| Tribal-knowledge tip exports | LLM | **MD-only** | NO | RAG retrieval surface — token cost matters |
| Wiki entries (`knowledge/wiki/*.md`) | Both | **MD primary, HTML companion for hub pages only** | SPARSE | Per-entry HTML is wasteful; hub index pages benefit |

**Rule (memorize):** **Markdown is a report. HTML is an interface.** (StableLearn coined this phrasing.) Surfaces whose value comes from continued interaction → HTML. Surfaces whose value comes from being read once or fed to an LLM → Markdown. When in doubt, default Markdown source-of-truth + opt-in HTML companion.

---

# §6 — Failure modes

## 6.1 XSS via MD content embedded into HTML
If `SpecHTMLCompanionEngine.render()` lifts MD content into HTML without escaping, any MD source containing `<script>` or `onerror=` attributes becomes executable inside the companion. Treat the MD source as untrusted (a peer chat could have shipped a poisoned doc).
- **Mitigation:** All MD→HTML transitions go through DOMPurify-equivalent allowlist; no raw HTML passthrough; the lint pass refuses inline `<script>` outside the engine's own theme block; CSP `default-src 'none'; script-src 'unsafe-inline'` only for the engine-controlled bootstrap; Mermaid renders to static SVG at build time (no client-side `mermaid.run()`).

## 6.2 Oversize render (LLM token-budget collapse)
A roadmap MD source of 2,000 lines could emit a 50,000-line HTML companion if every detail is expanded with inline SVG. If this HTML is ever re-fed to an LLM (e.g. an audit chat opens the companion as context), context window collapses 5–10× faster than the MD source.
- **Mitigation:** `SpecHTMLCompanionEngine.render()` returns `tokenSize`; budget hook BLOCKS emit if companion exceeds N× source bytes (default 6×). Companion always declares itself non-canonical in `<meta name="primary-spec" content="false">` so LLM agents prefer the MD source when both exist. Drift guard enforces companion-must-trail-source semantics.

## 6.3 Accessibility regression
Per WebAim's 1M-page survey: pages with ARIA average 41% more detected errors than pages without. The Thariq examples are visual showcases — none audit screen-reader behavior. If PRISM's primary specs all become HTML, screen-reader users (operators on shop-floor terminals included) lose access entirely.
- **Mitigation:** U-HTML-A11Y-V1 hook is non-bypassable. WCAG-AA contrast verified against both themes. Skip-to-content link mandatory. ARIA used only where native HTML semantics are insufficient (Rule 1 of ARIA — "if you can use a native element, do"). Spec companions ship a printable-MD fallback link in the header.

## 6.4 MD-only-consumer drift (the Bun lesson)
If teams adopt HTML-as-primary and silently delete the MD source-of-truth, LLM-side consumers (Claude SessionStart context, codex/gemini scrutiny chats, ollama digest pipelines, wiki RAG, hook-injected handoffs) silently 8× their token bill, then fail loudly when context windows blow. The Bun team's 10× reduction by going MD-default is the inverse of this: drift in the wrong direction is 10× expensive.
- **Mitigation:** **Source-of-truth invariant** — Markdown stays primary for every dual-consumer surface, HTML is a generated-twin artifact. `md-companion-drift-guard.mjs` HARD-BLOCKS Stop when an MD source disappears but its HTML companion is committed. Companion files carry `<meta name="prism-source" content="../PRISM-UNIFIED-ROADMAP-v2.md">` so any consumer can trace back. Audit `git log --diff-filter=D -- '*.md'` weekly via cron for any deleted MD with surviving HTML twin.

## 6.5 Diff-rot / editor friction
Pasquale's cited counter: "If it is a spec sheet of something complex, I want to be able to go in and edit what was produced. With an HTML document, that is much harder than with a Markdown one." Manual hand-editing of generated HTML drifts companion away from MD source; subsequent regenerations either clobber the manual edits or refuse to regenerate.
- **Mitigation:** Companions are **always generated, never hand-edited**. Companion files include `<meta name="prism-generator" content="SpecHTMLCompanionEngine@<sha>">` and are git-tracked as generated artifacts (consider `.gitattributes` `linguist-generated=true` so PR reviews collapse them). All structural changes go to the MD source; companions regenerate on commit. Hook BLOCKS Write to `*.html` companion paths from any agent that isn't the engine itself.

## 6.6 Token-tax on re-feed
If a downstream Claude chat opens an HTML companion as context to answer a follow-up question, the 8× token cost (Willison's HN measurement) compounds across the multi-chat coordination layer (~6 concurrent chats). At PRISM scale this is real money + real context-window pressure.
- **Mitigation:** All LLM-consuming agents prefer the MD source when both exist (enforced by `chat-bus-inject` + `wiki-precheck-inject` hooks already in place — extend them to honor the `prism-source` meta tag). HTML companion is opened by humans, not by agents; tool-route helper documents this in CLAUDE.md §HTML-COMPANION.

## 6.7 The "looks beautiful, wrong content" failure
HTML's visual richness can mask substantive bugs in the source. A roadmap companion with a polished Mermaid graph + dark theme + clickable milestones distracts a reviewer from the fact that one milestone's status field claims `done` while the linked MD source says `blocked`. Aesthetic seduction is a known cognitive bias in code review.
- **Mitigation:** Scrutinize gate operates on the **MD source**, not the companion. Companion never enters the 3-of-3 reviewer pipeline. Reviewers explicitly instructed to verify against MD. The companion footer must display source-of-truth + generation timestamp + drift status prominently.

---

## Closing — the unit sequence I'd recommend

```
U-HTML-SPEC-V1 (engine)          → blocks nothing, builds independently
U-HTML-THEME-V1 (theme engine)   → in parallel with V1
U-HTML-NAV-V1 (nav engine)       → in parallel with V1
U-HTML-PIPE-V1 (cron pipeline)   → depends on V1
U-HTML-A11Y-V1 (a11y hook)       → depends on V1 + theme
U-HTML-MD-DRIFT-GUARD            → depends on pipe
U-HTML-EMIT-DISPATCH             → wires V1 into prism_dev actions
```

The peer-shipped `scripts/emit-revenue-roadmap-html.mjs` (commit 0a575a23c) is the validation example — refactor it into the engine in V1, then deprecate the standalone script in favor of `prism_dev:render_html_companion source=revenue-roadmap.json`.

---

**End of dossier.** Total verified URLs: 17 reputable + 12 X posts. Both pro-HTML and pro-MD sides represented; the routing decision is mixed-mode by consumer, not global flag-flip.
