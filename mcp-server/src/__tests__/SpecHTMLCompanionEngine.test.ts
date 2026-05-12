/**
 * SpecHTMLCompanionEngine.test.ts — behavior tests for the PRISM spec → HTML render layer.
 *
 * Covers BACKEND-DEVTOOLS-RGS6 HTML-COMPANION-MS0 HC-0..HC-5: master renderer, anchors+slugs,
 * mermaid embed, theme switching, ARIA landmarks, the drift-hash guard — plus the spec's
 * adversarial / variability / failure-mode budget (XSS, oversized input, malformed frontmatter,
 * 4 spec-type shapes). Assertions check *intent*, not the mere presence of output.
 */

import { describe, it, expect } from "vitest";
import {
  specHtmlCompanionEngine,
  SpecHTMLCompanionEngine,
  escapeHtml,
} from "../engines/SpecHTMLCompanionEngine.js";

const RESEARCH_CARD = `---
title: Research card — graphs as LLM context
date: 2026-05-10
sources: 22
---

# Graphs as LLM context

A short synthesis paragraph with a [reference link](https://example.com/graph-rag) and some **bold** plus _italic_ and \`inline code\`.

## Key findings

- ego-graph extraction beats whole-graph dumps
- dual-channel context (structured + prose)
- GraphRAG retrieval at k=5

## Open questions

1. how to bound the ego radius
2. dedup vs the existing index
`;

const ROADMAP_LIKE = `# Mini roadmap

| Unit | Tier | Why |
|------|:----:|-----|
| U-A | T1 | foundation |
| U-B | T2 | wiring |

## Notes

> Critical-path: U-A blocks U-B.

\`\`\`bash
node scripts/emit-spec-html.mjs roadmap.md
\`\`\`
`;

const AUDIT_LIKE = `# Audit verdict: REVISE

## Findings

### F1 — header drift

Some prose.

### F2 — missing wiring

\`\`\`ts
const x: number = 1;
\`\`\`
`;

describe("SpecHTMLCompanionEngine — escapeHtml", () => {
  it("escapes the five HTML-significant characters and nothing else", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
    expect(escapeHtml("plain text 123 — ok")).toBe("plain text 123 — ok");
  });
  it("is idempotent-safe to call exactly once (does not double-encode within one call)", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
});

describe("SpecHTMLCompanionEngine — happy paths across spec types", () => {
  it("renders a research-card-style doc: frontmatter panel, headings with ids, links, lists", () => {
    const r = specHtmlCompanionEngine.render(RESEARCH_CARD);
    expect(r.html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(r.html).toContain("<title>Research card — graphs as LLM context</title>");
    // frontmatter became a metadata panel
    expect(r.html).toContain('<details class="frontmatter"');
    expect(r.html).toContain("sources");
    // headings carry stable ids
    expect(r.html).toMatch(/<h1 id="graphs-as-llm-context">/);
    expect(r.html).toMatch(/<h2 id="key-findings">/);
    expect(r.html).toMatch(/<h2 id="open-questions">/);
    // inline link, bold, italic, code
    expect(r.html).toContain('<a href="https://example.com/graph-rag" rel="noopener noreferrer">reference link</a>');
    expect(r.html).toContain("<strong>bold</strong>");
    expect(r.html).toContain("<em>italic</em>");
    expect(r.html).toContain("<code>inline code</code>");
    // lists: one <ul>, one <ol>
    expect(r.html).toContain("<ul>");
    expect((r.html.match(/<li>/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(r.html).toContain("<ol>");
    expect(r.headings.map((h) => h.text)).toEqual(["Graphs as LLM context", "Key findings", "Open questions"]);
    expect(r.frontmatter.title).toBe("Research card — graphs as LLM context");
    expect(r.frontmatter.sources).toBe("22");
  });

  it("renders a roadmap-style doc: GFM table with alignment, blockquote, code fence", () => {
    const r = specHtmlCompanionEngine.render(ROADMAP_LIKE);
    expect(r.html).toContain("<table>");
    expect(r.html).toMatch(/<thead><tr><th>Unit<\/th><th[^>]*>Tier<\/th><th>Why<\/th><\/tr><\/thead>/);
    // centered Tier column gets text-align:center
    expect(r.html).toContain('text-align:center');
    expect(r.html).toContain("<td>U-A</td>");
    expect(r.html).toContain("<blockquote>");
    expect(r.html).toContain("Critical-path");
    expect(r.html).toContain('<pre><code class="language-bash">node scripts/emit-spec-html.mjs roadmap.md');
  });

  it("renders an audit-style doc: nested headings each get unique ids", () => {
    const r = specHtmlCompanionEngine.render(AUDIT_LIKE);
    expect(r.html).toMatch(/<h1 id="audit-verdict-revise">/);
    expect(r.html).toMatch(/<h3 id="f1-header-drift">/);
    expect(r.html).toMatch(/<h3 id="f2-missing-wiring">/);
    expect(r.html).toContain('<pre><code class="language-ts">const x: number = 1;');
    // <title> falls back to the first H1 when no frontmatter title
    expect(r.html).toContain("<title>Audit verdict: REVISE</title>");
  });
});

describe("SpecHTMLCompanionEngine — XSS / sanitization", () => {
  it("escapes raw HTML and script tags inside a code fence (not passed through)", () => {
    const md = "```html\n<script>alert(1)</script><img src=x onerror=alert(1)>\n```";
    const r = specHtmlCompanionEngine.render(md);
    expect(r.html).not.toContain("<script>alert(1)</script>");
    expect(r.html).not.toContain("onerror=alert(1)>");
    expect(r.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(r.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes raw HTML in body prose, never passes it through", () => {
    const r = specHtmlCompanionEngine.render("# T\n\nHello <b onmouseover=alert(1)>x</b> and <iframe src=evil></iframe>.");
    expect(r.html).not.toContain("<b onmouseover=alert(1)>");
    expect(r.html).not.toContain("<iframe src=evil>");
    expect(r.html).toContain("&lt;b onmouseover=alert(1)&gt;");
    expect(r.html).toContain("&lt;iframe src=evil&gt;");
  });

  it("drops javascript:/data: link URLs but keeps the visible label; keeps http(s)/relative/anchor", () => {
    const r = specHtmlCompanionEngine.render(
      "# T\n\n[a](javascript:void0) [b](data:text/html,x) [c](https://ok.example) [d](./rel/path.md) [e](#anchor)",
    );
    expect(r.html).not.toMatch(/href="javascript:/i);
    expect(r.html).not.toMatch(/href="data:/i);
    expect(r.html).toMatch(/<p>a b <a /); // labels "a" and "b" survive as bare text where their links were stripped
    expect(r.html).toContain('<a href="https://ok.example" rel="noopener noreferrer">c</a>');
    expect(r.html).toContain('<a href="./rel/path.md">d</a>');
    expect(r.html).toContain('<a href="#anchor">e</a>');
  });
});

describe("SpecHTMLCompanionEngine — HC-3 slugs & anchors", () => {
  it("generates unique, valid ids for duplicate / special-char headings", () => {
    const md = "# Overview\n\n## Details\n\n## Details\n\n## §5 — Stuff & Things!\n\n## 🎯 Targets";
    const r = specHtmlCompanionEngine.render(md);
    const slugs = r.headings.map((h) => h.slug);
    expect(slugs).toEqual(["overview", "details", "details-2", "5-stuff-things", "targets"]);
    // every slug is a syntactically valid HTML id (no spaces, no markup chars)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
    // each heading id appears once, and has a permalink anchor
    for (const s of slugs) {
      expect((r.html.match(new RegExp(`id="${s}"`, "g")) || []).length).toBe(1);
      expect(r.html).toContain(`href="#${s}"`);
    }
    expect(r.html).toContain('<a class="anchor" href="#overview"');
  });
});

describe("SpecHTMLCompanionEngine — HC-3 mermaid embed", () => {
  it("turns a ```mermaid fence into <div class=mermaid> (escaped) and pulls in mermaid.js", () => {
    const md = "# Diagram\n\n```mermaid\ngraph LR; A-->B; B-->C\n```\n\nDone.";
    const r = specHtmlCompanionEngine.render(md);
    expect(r.hasMermaid).toBe(true);
    expect(r.html).toContain('<div class="mermaid">');
    expect(r.html).toContain("graph LR; A--&gt;B; B--&gt;C"); // arrows escaped, mermaid.js un-escapes client-side
    expect(r.html).not.toContain("<pre><code"); // a mermaid fence is NOT a normal code block
    expect(r.html).toMatch(/<script type="module">[\s\S]*mermaid/);
  });

  it("does not load mermaid.js when there is no mermaid fence", () => {
    const r = specHtmlCompanionEngine.render("# No diagrams here\n\nJust text and a ```js\nx=1\n``` block.");
    expect(r.hasMermaid).toBe(false);
    expect(r.html).not.toContain("cdn.jsdelivr.net/npm/mermaid");
    expect(r.html).not.toContain('<div class="mermaid">');
  });
});

describe("SpecHTMLCompanionEngine — HC-2 theme", () => {
  it("pins data-theme for dark / light and leaves it off for auto, always shipping the media-query", () => {
    const dark = specHtmlCompanionEngine.render("# T", { theme: "dark" });
    const light = specHtmlCompanionEngine.render("# T", { theme: "light" });
    const auto = specHtmlCompanionEngine.render("# T");
    expect(dark.html).toContain('<html lang="en" data-theme="dark">');
    expect(light.html).toContain('<html lang="en" data-theme="light">');
    expect(auto.html).toContain('<html lang="en">');
    expect(auto.html).not.toMatch(/<html[^>]*data-theme/); // the <html> element carries no pinned theme in auto mode
    // dark + light token sets and the prefers-color-scheme fallback are all present in the stylesheet
    for (const r of [dark, light, auto]) {
      expect(r.html).toContain('[data-theme="dark"]');
      expect(r.html).toContain("@media (prefers-color-scheme: dark)");
    }
    // a theme toggle button + progressive-enhancement script ships regardless
    expect(auto.html).toContain('id="themeToggle"');
    expect(auto.html).toContain("prism-spec-theme");
  });
});

describe("SpecHTMLCompanionEngine — HC-4 ARIA landmarks + HC-3 TOC", () => {
  it("emits skip-link, role=main, and a labelled TOC nav with one entry per heading", () => {
    const r = specHtmlCompanionEngine.render("# A\n\n## B\n\ntext\n\n## C\n\nmore");
    expect(r.html).toContain('<a class="skip-link" href="#content">');
    expect(r.html).toContain('<main id="content" class="doc-body" role="main">');
    expect(r.html).toContain('<nav class="toc" aria-label="Table of contents">');
    for (const h of r.headings) expect(r.html).toContain(`<li class="toc-l${h.level}"><a href="#${h.slug}">`);
    // TOC entry count == heading count (all are level ≤ 4 here)
    const tocEntries = (r.html.match(/class="toc-l\d"/g) || []).length;
    expect(tocEntries).toBe(r.headings.length);
  });

  it("omits the TOC when there are fewer than two headings, or when toc:false", () => {
    expect(specHtmlCompanionEngine.render("# Only one").html).not.toContain('class="toc"');
    expect(specHtmlCompanionEngine.render("text only, no headings").html).not.toContain('class="toc"');
    expect(specHtmlCompanionEngine.render("# A\n## B\n## C", { toc: false }).html).not.toContain('class="toc"');
  });
});

describe("SpecHTMLCompanionEngine — failure modes", () => {
  it("malformed (unclosed) frontmatter: no crash, warns, treats it as body", () => {
    const md = "---\ntitle: Truncated\nfoo: bar\n# Body heading\n\nSome content.";
    const r = specHtmlCompanionEngine.render(md);
    expect(r.frontmatter).toEqual({}); // not parsed as frontmatter
    expect(r.warnings.some((w) => /frontmatter/i.test(w))).toBe(true);
    expect(r.html).toContain("<h1 id=\"body-heading\">");
    expect(r.html).toContain("Some content.");
  });

  it("handles oversized input without hanging or OOM (~1 MB renders quickly)", () => {
    const block = "## Section heading\n\nA paragraph of moderately sized text with a [link](https://x.example) and **bold**.\n\n- item one\n- item two\n\n";
    const big = "# Big doc\n\n" + block.repeat(8000); // ~1 MB
    expect(big.length).toBeGreaterThan(900_000);
    const t0 = Date.now();
    const r = specHtmlCompanionEngine.render(big);
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(4000);
    expect(r.html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(r.html.endsWith("</html>\n")).toBe(true);
    expect(r.headings.length).toBeGreaterThan(7000);
  });

  it("truncates inputs over maxBytes and surfaces a visible notice", () => {
    const md = "# T\n\n" + "word ".repeat(2000);
    const r = specHtmlCompanionEngine.render(md, { maxBytes: 600 });
    expect(r.warnings.some((w) => /truncat/i.test(w))).toBe(true);
    expect(r.html).toContain("truncation-notice");
    expect(r.bytes).toBeLessThan(md.length + 12000); // not exploded by the truncation path
  });

  it("never throws on degenerate inputs", () => {
    for (const md of ["", "   ", "\n\n\n", "```\nunterminated fence", "| broken | table", "#", "######", "- ", ">"]) {
      expect(() => specHtmlCompanionEngine.render(md)).not.toThrow();
      const r = specHtmlCompanionEngine.render(md);
      expect(typeof r.html).toBe("string");
      expect(r.html).toContain("<!DOCTYPE html>");
    }
  });
});

describe("SpecHTMLCompanionEngine — HC-5 drift hash", () => {
  it("hashSource is deterministic, 64 hex chars, and sensitive to any change", () => {
    const a = specHtmlCompanionEngine.hashSource("# X\n\nbody");
    const b = specHtmlCompanionEngine.hashSource("# X\n\nbody");
    const c = specHtmlCompanionEngine.hashSource("# X\n\nbody.");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("embeds the source hash in <meta> and isDrifted detects staleness", () => {
    const md = "# Drift test\n\ncontent here";
    const r = specHtmlCompanionEngine.render(md);
    expect(r.html).toContain(`<meta name="prism-source-hash" content="${r.sourceHash}">`);
    expect(specHtmlCompanionEngine.isDrifted(md, r.html)).toBe(false);          // fresh
    expect(specHtmlCompanionEngine.isDrifted(md + "\nmore", r.html)).toBe(true); // source changed
    expect(specHtmlCompanionEngine.isDrifted(md, "<html>no meta tag</html>")).toBe(true); // no recorded hash
  });
});

describe("SpecHTMLCompanionEngine — inline & list fidelity", () => {
  it("renders all supported inline syntax", () => {
    const r = specHtmlCompanionEngine.render("# T\n\n**b** and _i_ and `c` and ~~s~~ and [L](http://e.example) end.");
    expect(r.html).toContain("<strong>b</strong>");
    expect(r.html).toContain("<em>i</em>");
    expect(r.html).toContain("<code>c</code>");
    expect(r.html).toContain("<del>s</del>");
    expect(r.html).toContain('<a href="http://e.example" rel="noopener noreferrer">L</a>');
  });

  it("nests lists by indentation", () => {
    const r = specHtmlCompanionEngine.render("# T\n\n- a\n  - b\n  - c\n- d\n");
    // a <ul> with a nested <ul> inside the first <li>
    expect(r.html).toMatch(/<ul>[\s\S]*<li>a[\s\S]*<ul>[\s\S]*<li>b<\/li>[\s\S]*<li>c<\/li>[\s\S]*<\/ul>[\s\S]*<\/li>[\s\S]*<li>d<\/li>[\s\S]*<\/ul>/);
  });

  it("respects an ordered-list start offset", () => {
    const r = specHtmlCompanionEngine.render("# T\n\n3. third\n4. fourth\n");
    expect(r.html).toContain('<ol start="3">');
  });
});

describe("SpecHTMLCompanionEngine — title precedence & instance", () => {
  it("title: opts > frontmatter.title > frontmatter.milestone > first H1 > default", () => {
    expect(specHtmlCompanionEngine.render("---\ntitle: FM\n---\n# H1", { title: "OPT" }).title).toBe("OPT");
    expect(specHtmlCompanionEngine.render("---\ntitle: FM\n---\n# H1").title).toBe("FM");
    expect(specHtmlCompanionEngine.render("---\nmilestone: MS-X\n---\n# H1").title).toBe("MS-X");
    expect(specHtmlCompanionEngine.render("# Just an H1\n\nbody").title).toBe("Just an H1");
    expect(specHtmlCompanionEngine.render("no headings, no frontmatter").title).toBe("PRISM Spec");
  });

  it("exports a usable singleton and the class", () => {
    expect(specHtmlCompanionEngine).toBeInstanceOf(SpecHTMLCompanionEngine);
    const fresh = new SpecHTMLCompanionEngine();
    expect(fresh.render("# X").html).toContain("<title>X</title>");
  });
});
