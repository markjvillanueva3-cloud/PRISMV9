/**
 * SoulHtmlRenderEngine — HSE04 per-slot soul.html renderer.
 *
 * Pure-core: given a SlotSoul, emit a standalone, accessibility-conformant
 * HTML5 page (PRISM dark-theme, WCAG 2.1 AA contrast). Closes the
 * html-companion-discipline gap on slot souls — every soul.md gets a
 * soul.html twin.
 *
 * Output: string of HTML5. Caller writes it to disk.
 *
 * @module engines/SoulHtmlRenderEngine
 */

import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPE[c] ?? c);
}

const DARK_CSS = `:root{--bg:#0d1117;--fg:#c9d1d9;--mute:#8b949e;--accent:#58a6ff;--warn:#f0883e;--ok:#3fb950;--bad:#f85149;--card:#161b22;--border:#30363d}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:var(--bg);color:var(--fg);line-height:1.5;padding:2rem}
main{max-width:80ch;margin:0 auto}
h1{color:var(--accent);border-bottom:2px solid var(--border);padding-bottom:.5rem}
h2{color:var(--accent);margin-top:2rem}
.meta{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1rem;margin:1rem 0;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:6px}
.meta dt{color:var(--mute);font-weight:600}
.meta dd{margin:0}
.refuses li{color:var(--warn)}
.role-badge{display:inline-block;padding:.25rem .5rem;background:var(--accent);color:#000;border-radius:3px;font-size:.85rem;font-weight:600}
code{background:var(--card);padding:.1rem .3rem;border-radius:3px;font-size:.9em}
.body{margin-top:1.5rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:6px;white-space:pre-wrap}`;

export class SoulHtmlRenderEngine {
  static render(soul: SlotSoul): string {
    if (!soul || typeof soul !== "object") throw new Error("SoulHtmlRender.render: soul required");
    const title = `${soul.slot} — ${soul.role}`;
    const refuses = soul.refuse_list.length
      ? `<ul class="refuses">${soul.refuse_list.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
      : '<p class="mute">No refuses declared</p>';

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)} — PRISM slot soul</title>
<style>${DARK_CSS}</style>
</head>
<body>
<main aria-labelledby="t">
<h1 id="t"><span class="role-badge" aria-label="Hermes role">${esc(soul.hermes_role)}</span> ${esc(title)}</h1>

<section aria-labelledby="m">
<h2 id="m">Frontmatter</h2>
<dl class="meta">
<dt>Slot</dt><dd><code>${esc(soul.slot)}</code></dd>
<dt>Role</dt><dd>${esc(soul.role)}</dd>
<dt>Voice</dt><dd>${esc(soul.voice)}</dd>
<dt>Tone</dt><dd>${esc(soul.tone)}</dd>
<dt>Preferred subagent</dt><dd>${soul.preferred_subagent_type ? `<code>${esc(soul.preferred_subagent_type)}</code>` : "—"}</dd>
<dt>Domain filter</dt><dd>${soul.domain_filter ? `<code>${esc(soul.domain_filter)}</code>` : "—"}</dd>
<dt>Escalation path</dt><dd>${soul.escalation_path ? esc(soul.escalation_path) : "—"}</dd>
</dl>
</section>

<section aria-labelledby="r">
<h2 id="r">Refuse list (${soul.refuse_list.length})</h2>
${refuses}
</section>

<section aria-labelledby="b">
<h2 id="b">Body</h2>
<div class="body">${esc(soul.body)}</div>
</section>
</main>
</body>
</html>`;
    return html;
  }
}

export const soulHtmlRenderEngine = SoulHtmlRenderEngine;
