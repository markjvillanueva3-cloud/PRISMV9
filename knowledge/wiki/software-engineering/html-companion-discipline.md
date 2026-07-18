---
name: html-companion-discipline
category: software-engineering
domain: backend-dev
tags: [html, markdown, companion, a11y, accessibility, specs, research, drift, prism-development]
last_updated: 2026-05-19
---

# HTML Companion Discipline — markdown twins, drift detection, a11y

PRISM keeps **HTML twins** for `state/shared/specs/**.md` + `state/shared/research/**.md` + per-surface "PATCH-SIBLING" docs. The reason: operators (and their browsers) often need to read a long spec or audit report without a Markdown viewer — the HTML twin renders the same content with navigable headings, tables, code blocks, and a11y semantics. A PreToolUse hook (`html-companion-guard.mjs`) detects drift (HTML out of sync with its `.md`) and a11y violations (WAI-ARIA gaps). This wiki names the convention: when to add a twin, how to render it, the 5 a11y requirements, the drift mechanism, and the fix recipes.

## When a twin exists — the placement rule

| Path pattern | HTML twin? | Why |
|---|---|---|
| `state/shared/specs/**.md` | ✓ required | Audits, plans, design docs that operators open in browser |
| `state/shared/research/**.md` | ✓ required | Research artifacts surfaced via dashboards |
| `state/shared/dashboards/**.md` | ✓ if surfaced via web | When the dashboard has a URL consumer |
| `state/shared/dashboards/patches/<SURFACE>-PATCH-<unit>.md` | ✓ recommended | Patch-sibling for peer-locked surfaces |
| `knowledge/wiki/**.md` | ❌ no twin | Auto-rendered into the wiki brain; not opened in raw HTML |
| `knowledge/memories/**.md` | ❌ no twin | Obsidian-vault-only; HTML view via Obsidian app |
| `state/shared/handoffs/**.md` | ❌ no twin | Session-scoped; not for operator-browser consumption |
| `CLAUDE.md`, `MEMORY.md`, `README.md` | ❌ no twin (separately renderable) | Already auto-renderable via `mdToHtml` on demand |

The rule: **operator-facing artifacts that survive the session get a twin; ephemeral or vault-only content does not.**

## The render scripts — three entry points

| Tool | Use when | Command |
|---|---|---|
| `mdToHtml(filePath, opts)` | Programmatic — from another script | `import { mdToHtml } from "scripts/lib/html-report-render.mjs"` |
| `scripts/md-to-html.mjs` | Single file | `node H:/prism/scripts/md-to-html.mjs <input.md> [--out <out.html>] [--toc] [--title "..."]` |
| `scripts/emit-all-spec-html.ts` | Bulk re-render of all `state/shared/specs/**.md` twins | `node H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --force` |

The renderer covers headings (with auto-generated IDs for the a11y check), lists, tables, fenced code blocks, links, blockquotes, bold/italic, inline code. It is intentionally minimal — no JS, no client-side libraries, just a standalone HTML5 page with the PRISM dark theme.

**XSS guard:** `javascript:` URIs are stripped at render time. Don't disable.

## The 5 a11y requirements

`scripts/check-spec-html-a11y.mjs` enforces WAI-ARIA basics on every spec twin:

1. **Skip-link present** — `<a href="#content" class="skip-link">` near document top so keyboard users can jump past the nav to the main content.
2. **`<main>` has `role="main"`** — explicit landmark role (modern browsers infer it but assistive tech often expects the literal attribute).
3. **`<main>` has `id="content"`** — the target of the skip-link above.
4. **Every `<nav>` region has `aria-label` OR `aria-labelledby`** — names the nav region for screen readers ("Page navigation", "Table of contents", etc.).
5. **Every heading (`<h1>..<h6>`) has an `id` attribute** — enables deep-linking and the skip-around navigation pattern.

The renderer SHOULD produce all 5 by default. When the hook flags issues, the bug is usually one of:
- Old HTML rendered with a previous version of `mdToHtml` (re-render with the current script)
- Hand-edited HTML with a11y attributes stripped
- A new heading format the renderer doesn't yet handle

## The drift detection mechanism

`.claude/hooks/html-companion-guard.mjs` fires PreToolUse on commits touching markdown files that should have twins. Detection logic:

1. For each staged `.md` file under a twin-required path, check for a `<basename>.html` sibling.
2. If missing → flag as **MISSING**.
3. If present but the `.md` content hash differs from an embedded srchash comment in the `.html` → flag as **DRIFTED**.
4. For each staged `.html` under specs/research → run a11y check → flag any violations.

The hook is **warn-only by default**. `PRISM_HTML_GUARD_BLOCK=1` upgrades to hard block; `PRISM_HTML_GUARD=0` disables entirely.

Why warn-only: HTML render can be slow on a large audit doc; in active iteration, a chat may want to commit the .md without immediately re-rendering. The warning surfaces the gap; the chat decides whether to fix-now or defer.

## The srchash convention

The renderer embeds an HTML comment near the top of the output:

```html
<!-- srchash:<sha256-of-source-md-content> -->
```

The guard compares this hash against the current `.md` content. Match → fresh. Mismatch → drift. The hash is byte-accurate (whitespace-sensitive). Reformatting the `.md` triggers a re-render requirement.

The U-HTML-COMPANION-SRCHASH commit (2026-05-18) introduced this. Before that, drift detection was timestamp-based — slow and fragile. The srchash is the canonical source-of-truth-vs-rendering mechanism.

## Fix recipes — three failure modes

### Failure 1: HTML twin MISSING

```bash
# Single file:
node H:/prism/scripts/md-to-html.mjs state/shared/specs/MY-SPEC.md

# Bulk:
node H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --force

# Re-stage the .html:
git add state/shared/specs/MY-SPEC.html
```

### Failure 2: HTML DRIFTED (srchash mismatch)

Re-render with same commands. The new srchash embeds the current `.md` content's hash. Re-stage + commit.

### Failure 3: A11Y violations

The renderer SHOULD produce a11y-clean HTML. If the check flags violations:

```bash
# Re-check standalone:
node H:/prism/scripts/check-spec-html-a11y.mjs state/shared/specs/MY-SPEC.html

# Re-render to pick up the latest renderer:
node H:/prism/scripts/md-to-html.mjs state/shared/specs/MY-SPEC.md
```

If the violation persists after a fresh render, the renderer has a bug for the specific markdown shape. File as a finding + fix in `scripts/lib/html-report-render.mjs`.

## When to add a NEW twin

The decision is upstream of the rendering. You add a twin when:

- You're committing a `state/shared/specs/**.md` file (always)
- You're committing a `state/shared/research/**.md` file (always)
- A dashboard `.md` will be linked from a web surface (Forge, system-viz HTML view)
- A patch-sibling `.md` documents a peer-locked surface (CLAUDE.md / MEMORY.md patches — convention from JULIETT-PATCH-SIBLING)

You do NOT add a twin when:
- The `.md` is a wiki entry, memory, or handoff (Obsidian + auto-regen take over)
- The doc is one-session-only (handoffs, drafts)
- The path is outside the twin-required set above

## The patch-sibling pattern — peer-locked surfaces

When a `peer-locked` surface (CLAUDE.md, MEMORY.md owned by a peer chat) needs an update from your slot, write a **patch sibling**:

```
state/shared/dashboards/patches/CLAUDE-MD-PATCH-<unit>.md
state/shared/dashboards/patches/CLAUDE-MD-PATCH-<unit>.html  ← twin
```

The patch sibling is your slot's proposal; the owner chat reads + integrates on its next pass. The HTML twin makes the patch reviewable in browser. See JULIETT-12CHAT-ALLOCATION-MS0 for the canonical worked example.

## Anti-patterns

- **Committing a `state/shared/specs/**.md` without re-rendering the twin** → drift warning on every subsequent commit until fixed.
- **Hand-editing the `.html`** → loses srchash + diverges from `.md`. Always edit the `.md` and re-render.
- **Disabling the guard (`PRISM_HTML_GUARD=0`) instead of fixing the drift** → debt accumulates; future chats see stale HTML.
- **Adding a twin for a wiki/memory** → wasted maintenance; the wiki system has its own rendering.
- **A11y violation "I'll fix it later"** → screen-reader users + keyboard-only operators can't navigate the doc.
- **Renaming an `.md` without renaming the `.html`** → orphan HTML twin with mismatched srchash.
- **Committing without re-staging the new `.html`** → drift warning persists until the HTML lands too.

## Checklist — every commit touching state/shared/specs|research/**.md

- [ ] Did the `.md` content change since the last render?
- [ ] Did I re-render via `md-to-html.mjs` (single) or `emit-all-spec-html.ts` (bulk)?
- [ ] Is the `.html` srchash comment current?
- [ ] Did the a11y check pass (5 requirements)?
- [ ] Did I stage BOTH the `.md` and the `.html` in this commit?
- [ ] If patch-sibling: is the target surface noted in the commit body for the owner chat?
- [ ] If first-time twin: is the new HTML being added in the right path?

## Verification

```bash
# Find any stale twins fleet-wide:
for md in $(find state/shared/specs -name "*.md"); do
  html="${md%.md}.html"
  if [ ! -f "$html" ]; then echo "MISSING: $html"; continue; fi
  md_hash=$(sha256sum "$md" | cut -c1-12)
  html_hash=$(grep -o 'srchash:[a-f0-9]\{12\}' "$html" | head -1 | cut -c9-)
  [ "$md_hash" != "$html_hash" ] && echo "DRIFT: $md (md=$md_hash html=$html_hash)"
done

# A11y check single file:
node H:/prism/scripts/check-spec-html-a11y.mjs state/shared/specs/MY-SPEC.html
```

If the audit script finds many drift cases, run the bulk re-render: `node H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --force`.

## Related

- [[wiki-automation-discipline]] — the wiki side renders differently (auto-regen + per-engine pages); HTML twins are operator-facing artifacts
- [[obsidian-vault-flow]] — memories use Obsidian rendering, not HTML twins
- [[commit-message-conventions]] — what subject format pairs with twin re-render commits
- [[fleet-coordination-discipline]] — patch-sibling pattern for peer-locked surfaces
- `scripts/lib/html-report-render.mjs` — the canonical `mdToHtml` implementation
- `scripts/md-to-html.mjs` — single-file CLI entry
- `scripts/emit-all-spec-html.ts` — bulk re-render
- `scripts/check-spec-html-a11y.mjs` — WAI-ARIA validation
- `.claude/hooks/html-companion-guard.mjs` — the PreToolUse drift + a11y guard
- CLAUDE.md §HTML-FOR-MD (AUDIT-SYNERGY-MS0) — the doctrine pointer for the rendering subsystem
