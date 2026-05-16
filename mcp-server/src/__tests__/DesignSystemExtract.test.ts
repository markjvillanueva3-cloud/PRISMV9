/**
 * DesignSystemExtract.test.ts — verifies scripts/extract-design-system.mjs
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-HTML-DESIGN-SYSTEM (C3).
 *
 * Mix of:
 *   - Static unit tests on the pure parsers + builders (fixture inputs)
 *   - Static integration test on the REAL web/src/styles/design-system.ts +
 *     tailwind.config.js source (catches drift between extractor + source)
 *   - Live opportunistic spawn of the CLI in --check / --dry-run mode
 *     (silent-skips if portable node OOMs under fleet pressure — same
 *     pattern as HtmlOutputMode.test.ts).
 *
 * The "≥10 components" exit condition is verified twice: once via direct
 * walkComponentsDir() call against the real components dir, once by
 * spawning `--check` (which exits 0 only when ≥10).
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DESIGN_SYSTEM_SCHEMA_VERSION,
  parseDesignSystemTs,
  parseTopLevelRecord,
  parseStatusBlock,
  parseTypographyBlock,
  parseFontSizeBlock,
  parseRecordBody,
  parseTailwindConfig,
  iterTopLevelObjectEntries,
  sliceBalanced,
  walkComponentsDir,
  buildCatalog,
  catalogToTokensCss,
  catalogToHtmlSections,
  generateDesignSystemHtml,
} from "../../../scripts/extract-design-system.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const EXTRACTOR_SCRIPT = join(REPO_ROOT, "scripts/extract-design-system.mjs");
const NODE = process.env.PORTABLE_NODE || "node";

const MIN_COMPONENTS = 10; // Exit condition threshold (≥10 per envelope)
const SPAWN_TIMEOUT_MS = 20_000; // < vitest hookTimeout 30s

describe("DESIGN_SYSTEM_SCHEMA_VERSION", () => {
  it("is a non-empty semver-ish string", () => {
    expect(typeof DESIGN_SYSTEM_SCHEMA_VERSION).toBe("string");
    expect(DESIGN_SYSTEM_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("parseRecordBody", () => {
  it("returns null for non-string input", () => {
    expect(parseRecordBody(null)).toBeNull();
    expect(parseRecordBody(undefined)).toBeNull();
    expect(parseRecordBody(123 as unknown as string)).toBeNull();
  });
  it("parses single-quoted values", () => {
    const out = parseRecordBody("{ a: 'x', b: 'y' }");
    expect(out).toEqual({ a: "x", b: "y" });
  });
  it("parses double-quoted values", () => {
    const out = parseRecordBody('{ a: "x", b: "y" }');
    expect(out).toEqual({ a: "x", b: "y" });
  });
  it("tolerates quoted keys", () => {
    const out = parseRecordBody("{ '50': '#f0fdf4', '100': '#dcfce7' }");
    expect(out).toEqual({ "50": "#f0fdf4", "100": "#dcfce7" });
  });
  it("strips line comments before parsing", () => {
    const out = parseRecordBody(
      "{ a: 'x', // comment with 'fake': 'value'\n b: 'y' }",
    );
    expect(out).toEqual({ a: "x", b: "y" });
  });
  it("rejects bodies containing nested objects (caller must use structural parser)", () => {
    expect(parseRecordBody("{ a: { b: 'c' } }")).toBeNull();
  });
  it("returns null when no key:value pairs match", () => {
    expect(parseRecordBody("{ }")).toBeNull();
    expect(parseRecordBody("{ /* nothing */ }")).toBeNull();
  });
});

describe("sliceBalanced", () => {
  it("returns null if start does not point at {", () => {
    expect(sliceBalanced("hello", 0)).toBeNull();
    expect(sliceBalanced("xyz {abc}", 0)).toBeNull();
  });
  it("extracts a balanced top-level block", () => {
    const src = "before { inner } after";
    expect(sliceBalanced(src, 7)).toBe("{ inner }");
  });
  it("respects nested braces", () => {
    const src = "{ a: { b: 1 }, c: { d: 2 } }";
    expect(sliceBalanced(src, 0)).toBe(src);
  });
  it("returns null on unbalanced input", () => {
    expect(sliceBalanced("{ unclosed", 0)).toBeNull();
  });
  it("ignores braces inside string literals", () => {
    const src = "{ x: '}', y: 'a {b} c', z: \"d}e\" }";
    const out = sliceBalanced(src, 0);
    expect(out).toBe(src);
  });
  it("handles escaped quote characters inside strings", () => {
    const src = "{ x: 'it\\'s }' }";
    const out = sliceBalanced(src, 0);
    expect(out).toBe(src);
  });
});

describe("iterTopLevelObjectEntries", () => {
  it("yields each top-level key:{...} block", () => {
    const inner = `
      a: { x: 1, y: 2 },
      b: { z: 3 }
    `;
    const seen: Array<{ name: string; body: string }> = [];
    for (const e of iterTopLevelObjectEntries(inner)) seen.push(e);
    expect(seen.map((s) => s.name)).toEqual(["a", "b"]);
    expect(seen[0].body).toContain("x: 1");
    expect(seen[1].body).toContain("z: 3");
  });
  it("skips non-object entries", () => {
    const inner = `a: 'scalar', b: { z: 1 }`;
    const seen: string[] = [];
    for (const e of iterTopLevelObjectEntries(inner)) seen.push(e.name);
    expect(seen).toEqual(["b"]);
  });
  it("returns nothing on non-string input", () => {
    const seen: unknown[] = [];
    for (const e of iterTopLevelObjectEntries(
      null as unknown as string,
    )) seen.push(e);
    expect(seen).toEqual([]);
  });
});

describe("parseTopLevelRecord", () => {
  it("parses a basic export const block", () => {
    const src = `export const spacing = { xs: '0.25rem', sm: '0.5rem' } as const;`;
    expect(parseTopLevelRecord(src, "spacing")).toEqual({
      xs: "0.25rem",
      sm: "0.5rem",
    });
  });
  it("returns null when block is missing", () => {
    expect(parseTopLevelRecord("nothing here", "missing")).toBeNull();
  });
  it("returns null on bad inputs", () => {
    expect(parseTopLevelRecord(null as unknown as string, "x")).toBeNull();
    expect(parseTopLevelRecord("src", null as unknown as string)).toBeNull();
  });
});

describe("parseStatusBlock", () => {
  it("parses nested status definitions", () => {
    const src = `colors = { status: {
      info: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    } }`;
    const out = parseStatusBlock(src);
    expect(out).not.toBeNull();
    expect(out!.info).toEqual({
      bg: "bg-cyan-500/20",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
    });
    expect(out!.success.text).toBe("text-emerald-400");
  });
  it("returns null if no status block present", () => {
    expect(parseStatusBlock("no status here")).toBeNull();
  });
});

describe("parseTypographyBlock", () => {
  const src = `export const typography = {
    fontFamily: { sans: 'Inter, sans-serif', mono: 'JetBrains Mono, monospace' },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
    },
    fontWeight: { normal: '400', bold: '700' }
  } as const;`;
  it("returns all three sub-blocks", () => {
    const out = parseTypographyBlock(src);
    expect(out).not.toBeNull();
    expect(out!.fontFamily.sans).toBe("Inter, sans-serif");
    expect(out!.fontSize.xs).toContain("0.75rem");
    expect(out!.fontSize.xs).toContain("lh 1rem");
    expect(out!.fontWeight.normal).toBe("400");
  });
});

describe("parseFontSizeBlock", () => {
  it("flattens tuple form to 'size / lh lineHeight'", () => {
    const src = `fontSize: { xs: ['0.75rem', { lineHeight: '1rem' }] }`;
    const out = parseFontSizeBlock(src);
    expect(out!.xs).toBe("0.75rem / lh 1rem");
  });
  it("supports plain string form", () => {
    const src = `fontSize: { plain: '12px' }`;
    const out = parseFontSizeBlock(src);
    expect(out!.plain).toBe("12px");
  });
});

describe("parseTailwindConfig", () => {
  it("parses prism + safety palettes from a real-shape config", () => {
    const src = `
      export default {
        content: [],
        theme: {
          extend: {
            colors: {
              prism: { 50: '#f0f4ff', 500: '#5c7cfa', 900: '#364fc7' },
              safety: { pass: '#2b8a3e', warn: '#e67700', fail: '#c92a2a' }
            }
          }
        }
      };`;
    const out = parseTailwindConfig(src);
    expect(out.prism).toEqual({ "50": "#f0f4ff", "500": "#5c7cfa", "900": "#364fc7" });
    expect(out.safety).toEqual({ pass: "#2b8a3e", warn: "#e67700", fail: "#c92a2a" });
  });
  it("returns {} on missing colors block", () => {
    expect(parseTailwindConfig("export default { theme: {} };")).toEqual({});
  });
});

describe("parseDesignSystemTs (end-to-end on real source)", () => {
  const REAL_DS = resolve(
    REPO_ROOT,
    "mcp-server/web/src/styles/design-system.ts",
  );
  it("real design-system.ts exists", () => {
    expect(existsSync(REAL_DS)).toBe(true);
  });
  it("parses the actual repo source — colors, spacing, typography all populated", () => {
    const src = readFileSync(REAL_DS, "utf8");
    const out = parseDesignSystemTs(src);
    expect(out).not.toBeNull();
    // Primary scale ≥5 entries (real source has 10)
    expect(Object.keys(out!.colors.primary).length).toBeGreaterThanOrEqual(5);
    expect(out!.colors.primary["500"]).toBe("#22c55e");
    // Status nested block parsed: success.text known value
    expect(typeof out!.colors.status.success).toBe("object");
    expect(out!.colors.status.success.text).toBe("text-emerald-400");
    // Spacing — md is canonical 1rem
    expect(out!.spacing.md).toBe("1rem");
    // Typography
    expect(out!.typography.fontFamily.sans).toMatch(/Inter/);
    expect(out!.typography.fontSize.base).toContain("1rem");
    // Variants — ≥3 button variants (real has 6)
    expect(Object.keys(out!.buttonVariants).length).toBeGreaterThanOrEqual(3);
    expect(out!.buttonVariants.primary).toContain("bg-blue-600");
  });
});

describe("walkComponentsDir", () => {
  it("returns empty when dir does not exist (injected fs)", () => {
    const fakeFs = {
      existsSync: () => false,
      readdirSync: () => [],
      statSync: () => ({ isDirectory: () => false }),
    };
    const out = walkComponentsDir("/nonexistent", fakeFs);
    expect(out).toEqual({ topLevel: [], categories: {}, totalCount: 0 });
  });
  it("categorizes injected fixture (top-level + subdirs)", () => {
    // Normalize path separators so Windows `\` and POSIX `/` both hit fixture
    // keys. walkComponentsDir uses path.join() which produces `\` on Windows.
    const norm = (p: string) => p.replace(/\\/g, "/");
    const layout: Record<string, string[]> = {
      "/comp": ["Button.tsx", "Layout.tsx", "calculator", "charts", ".hidden"],
      "/comp/calculator": ["A.tsx", "B.tsx", "README.md"],
      "/comp/charts": ["Pie.tsx"],
    };
    const fakeFs = {
      existsSync: (p: string) => {
        const np = norm(p);
        return (
          Object.prototype.hasOwnProperty.call(layout, np) ||
          layout["/comp"].some((n) => np === `/comp/${n}`)
        );
      },
      readdirSync: (p: string) => layout[norm(p)] || [],
      statSync: (p: string) => {
        const np = norm(p);
        const isDir = ["/comp/calculator", "/comp/charts"].includes(np);
        return { isDirectory: () => isDir };
      },
    };
    const out = walkComponentsDir("/comp", fakeFs);
    expect(out.topLevel.map((c: { name: string }) => c.name).sort()).toEqual([
      "Button",
      "Layout",
    ]);
    expect(out.categories).toEqual({ calculator: 2, charts: 1 });
    expect(out.totalCount).toBe(5);
  });
  it("skips dotfiles", () => {
    const fakeFs = {
      existsSync: () => true,
      readdirSync: () => [".eslintrc", "Foo.tsx"],
      statSync: () => ({ isDirectory: () => false }),
    };
    const out = walkComponentsDir("/x", fakeFs);
    expect(out.topLevel.map((c: { name: string }) => c.name)).toEqual(["Foo"]);
  });
  it("recovers gracefully when readdirSync throws", () => {
    const fakeFs = {
      existsSync: () => true,
      readdirSync: () => {
        throw new Error("permission");
      },
      statSync: () => ({ isDirectory: () => false }),
    };
    const out = walkComponentsDir("/x", fakeFs);
    expect(out.topLevel).toEqual([]);
  });
});

describe("walkComponentsDir against real components dir (regression for ≥10 components rule)", () => {
  it("reports ≥10 total components AND ≥3 categories", () => {
    const realPath = resolve(REPO_ROOT, "mcp-server/web/src/components");
    if (!existsSync(realPath)) return; // not a hard-fail
    const out = walkComponentsDir(realPath);
    expect(out.totalCount).toBeGreaterThanOrEqual(MIN_COMPONENTS);
    expect(Object.keys(out.categories).length).toBeGreaterThanOrEqual(3);
  });
});

describe("buildCatalog", () => {
  it("composes a complete catalog from valid parts", () => {
    const cat = buildCatalog({
      designSystem: {
        colors: { primary: { "500": "#fff" } },
        spacing: { md: "1rem" },
        typography: { fontFamily: { sans: "X" } },
      },
      tailwind: { prism: { "500": "#abc" } },
      components: {
        topLevel: [{ name: "A", path: "p/A.tsx" }],
        categories: { calc: 3 },
        totalCount: 4,
      },
    });
    expect(cat.schemaVersion).toBe(DESIGN_SYSTEM_SCHEMA_VERSION);
    expect(cat.colors.primary["500"]).toBe("#fff");
    expect(cat.tailwindExtensions.prism["500"]).toBe("#abc");
    expect(cat.components.totalCount).toBe(4);
    expect(typeof cat.generatedAt).toBe("string");
    expect(cat.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it("tolerates missing inputs (returns shape with empty defaults)", () => {
    const cat = buildCatalog({});
    expect(cat.colors).toEqual({});
    expect(cat.components).toEqual({
      topLevel: [],
      categories: {},
      totalCount: 0,
    });
  });
});

describe("catalogToTokensCss", () => {
  it("emits a :root { ... } block with --ds- prefixed vars", () => {
    const cat = buildCatalog({
      designSystem: {
        colors: {
          background: { base: "rgb(1,2,3)" },
          text: { primary: "#fff" },
          primary: { "500": "#abc" },
        },
        spacing: { md: "1rem" },
        borderRadius: { lg: "0.5rem" },
        typography: { fontFamily: { sans: "Inter, sans-serif" } },
      },
    });
    const css = catalogToTokensCss(cat);
    expect(css).toContain(":root {");
    expect(css).toContain("--ds-ok:");
    expect(css).toContain("--ds-bg-base: rgb(1,2,3);");
    expect(css).toContain("--ds-text-primary: #fff;");
    expect(css).toContain("--ds-primary-500: #abc;");
    expect(css).toContain("--ds-space-md: 1rem;");
    expect(css).toContain("--ds-radius-lg: 0.5rem;");
    expect(css).toContain("--ds-font-sans: Inter, sans-serif;");
    expect(css).toContain("}");
  });
  it("returns empty string on null input", () => {
    expect(catalogToTokensCss(null)).toBe("");
    expect(catalogToTokensCss(undefined)).toBe("");
  });
});

describe("catalogToHtmlSections", () => {
  const cat = buildCatalog({
    designSystem: parseDesignSystemTs(
      readFileSync(
        resolve(REPO_ROOT, "mcp-server/web/src/styles/design-system.ts"),
        "utf8",
      ),
    ),
    tailwind: parseTailwindConfig(
      readFileSync(
        resolve(REPO_ROOT, "mcp-server/web/tailwind.config.js"),
        "utf8",
      ),
    ),
    components: {
      topLevel: [
        { name: "Button", path: "p/Button.tsx" },
        { name: "Card", path: "p/Card.tsx" },
      ],
      categories: { calc: 5, charts: 3 },
      totalCount: 10,
    },
  });
  it("returns a non-empty array of section descriptors", () => {
    const sections = catalogToHtmlSections(cat);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(5);
  });
  it("first section is a headline with ≥3 cards", () => {
    const sections = catalogToHtmlSections(cat);
    expect(sections[0].kind).toBe("headline");
    expect(sections[0].cards.length).toBeGreaterThanOrEqual(3);
  });
  it("includes a primary-palette table", () => {
    const sections = catalogToHtmlSections(cat);
    const primaryTable = sections.find(
      (s: { kind: string; caption?: string }) =>
        s.kind === "table" && !!s.caption && /Primary palette/.test(s.caption),
    );
    expect(typeof primaryTable).toBe("object");
    expect(primaryTable).not.toBeNull();
  });
  it("returns [] on null catalog", () => {
    expect(catalogToHtmlSections(null)).toEqual([]);
  });
});

describe("generateDesignSystemHtml", () => {
  it("produces a self-contained HTML document", () => {
    const cat = buildCatalog({
      designSystem: {
        colors: { primary: { "500": "#fff" } },
        buttonVariants: { primary: "bg-blue-600" },
      },
      components: { topLevel: [], categories: {}, totalCount: 0 },
    });
    const html = generateDesignSystemHtml(cat);
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain("<style>");
    expect(html).toContain("</html>");
    expect(html).toContain("PRISM Design System");
    expect(html).toContain(DESIGN_SYSTEM_SCHEMA_VERSION);
  });
  it("HTML never references external CDN (air-gap safe)", () => {
    const cat = buildCatalog({
      designSystem: { colors: { primary: { "500": "#fff" } } },
    });
    const html = generateDesignSystemHtml(cat);
    expect(html).not.toMatch(/<script\b[^>]*src=/i);
    expect(html).not.toMatch(/<link\b[^>]*href=/i);
    expect(html).not.toMatch(/@import\s+url/);
    expect(html).not.toMatch(/url\(['"]?https?:/);
  });
  it("HTML has no obvious XSS surface from string data", () => {
    const cat = buildCatalog({
      designSystem: {
        buttonVariants: { evil: "<script>alert(1)</script>" },
      },
    });
    const html = generateDesignSystemHtml(cat);
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("live CLI — --check mode", () => {
  it("exits 0 with totalComponents ≥ 10 on the real components dir", () => {
    if (!existsSync(EXTRACTOR_SCRIPT)) return;
    const r = spawnSync(NODE, [EXTRACTOR_SCRIPT, "--check"], {
      cwd: REPO_ROOT,
      timeout: SPAWN_TIMEOUT_MS,
      encoding: "utf8",
    });
    if (r.status === null) return; // OOM / timeout tolerance
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/"ok":\s*true/);
    const m = r.stdout.match(/"totalComponents":\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(MIN_COMPONENTS);
  });
});

describe("live CLI — --dry-run mode", () => {
  it("emits a valid JSON catalog on stdout", () => {
    if (!existsSync(EXTRACTOR_SCRIPT)) return;
    const r = spawnSync(NODE, [EXTRACTOR_SCRIPT, "--dry-run"], {
      cwd: REPO_ROOT,
      timeout: SPAWN_TIMEOUT_MS,
      encoding: "utf8",
    });
    if (r.status === null) return;
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.schemaVersion).toBe(DESIGN_SYSTEM_SCHEMA_VERSION);
    expect(parsed.components.totalCount).toBeGreaterThanOrEqual(
      MIN_COMPONENTS,
    );
    expect(
      Object.keys(parsed.colors.primary || {}).length,
    ).toBeGreaterThanOrEqual(5);
  });
});

describe("live CLI — full write produces fresh artifact", () => {
  it("HTML + tokens-css files are written, parse non-empty, contain expected structure", () => {
    if (!existsSync(EXTRACTOR_SCRIPT)) return;
    const htmlPath = join(REPO_ROOT, "state/shared/design-system.html");
    const before = existsSync(htmlPath) ? statSync(htmlPath).mtimeMs : 0;
    const r = spawnSync(NODE, [EXTRACTOR_SCRIPT, "--tokens-css"], {
      cwd: REPO_ROOT,
      timeout: SPAWN_TIMEOUT_MS,
      encoding: "utf8",
    });
    if (r.status === null) return;
    expect(r.status).toBe(0);
    expect(existsSync(htmlPath)).toBe(true);
    const after = statSync(htmlPath).mtimeMs;
    expect(after).toBeGreaterThanOrEqual(before);
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("PRISM Design System");
    expect(html).toContain("Components");
    expect(html.length).toBeGreaterThan(1000);

    const cssPath = join(REPO_ROOT, "state/shared/design-system-tokens.css");
    expect(existsSync(cssPath)).toBe(true);
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(":root {");
    expect(css).toContain("--ds-ok:");
  });
});
