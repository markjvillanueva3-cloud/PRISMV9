/**
 * Tests for generate-commands-digest.mjs — pure-function coverage.
 *
 * U-MWO16 (slot:bravo 2026-05-26).  Real concrete-value assertions
 * (no toBeDefined stubs — per feedback_test_legitimacy gate).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontmatter,
  extractFallback,
  tighten,
  render,
  walkSkills,
} from "./generate-commands-digest.mjs";

describe("parseFrontmatter", () => {
  it("extracts name + description from valid frontmatter", () => {
    const src = `---\nname: my-skill\ndescription: Does the thing\n---\n# body`;
    const fm = parseFrontmatter(src);
    assert.equal(fm.name, "my-skill");
    assert.equal(fm.description, "Does the thing");
  });

  it("strips surrounding quotes", () => {
    const src = `---\nname: "quoted-skill"\ndescription: 'single quoted'\n---\n`;
    const fm = parseFrontmatter(src);
    assert.equal(fm.name, "quoted-skill");
    assert.equal(fm.description, "single quoted");
  });

  it("returns null when no frontmatter", () => {
    assert.equal(parseFrontmatter("# just a heading"), null);
  });

  it("returns null when frontmatter is unterminated", () => {
    assert.equal(parseFrontmatter("---\nname: x\n# no closing"), null);
  });

  it("ignores non-key lines", () => {
    const src = `---\n# comment\nname: ok\n  invalid line\n---\n`;
    const fm = parseFrontmatter(src);
    assert.equal(fm.name, "ok");
    assert.equal(fm["#"], undefined);
  });
});

describe("extractFallback", () => {
  it("uses first H1 as name and first body line as description", () => {
    const src = "# My Skill\n\nDoes a thing\n";
    const out = extractFallback(src);
    assert.equal(out.name, "My Skill");
    assert.equal(out.description, "Does a thing");
  });

  it("strips em-dash skill-name suffix", () => {
    const src = "# Tool Select — Complete Tool Selection Pipeline\n\nDescr\n";
    const out = extractFallback(src);
    assert.equal(out.name, "Tool Select");
  });

  it("strips blockquote prefix", () => {
    const src = "# X\n\n> blockquoted desc\n";
    assert.equal(extractFallback(src).description, "blockquoted desc");
  });

  it("returns nulls when no H1 found", () => {
    const out = extractFallback("just text no heading");
    assert.equal(out.name, null);
    assert.equal(out.description, null);
  });
});

describe("tighten", () => {
  it("returns placeholder for empty input", () => {
    assert.equal(tighten(""), "(no description)");
    assert.equal(tighten(null), "(no description)");
    assert.equal(tighten(undefined), "(no description)");
  });

  it("collapses whitespace", () => {
    assert.equal(tighten("a  b\n\tc"), "a b c");
  });

  it("clips long input with ellipsis", () => {
    const long = "x".repeat(200);
    const out = tighten(long);
    assert.equal(out.length, 120);
    assert.ok(out.endsWith("…"));
  });

  it("preserves short input verbatim", () => {
    assert.equal(tighten("short"), "short");
  });
});

describe("render", () => {
  it("groups by category, sorts categories + skills, escapes pipes", () => {
    const entries = [
      { name: "z-skill", description: "Description with | pipe", category: "wedm" },
      { name: "a-skill", description: "Alpha", category: "wedm" },
      { name: "top", description: "Top-level skill", category: "(top-level)" },
    ];
    const md = render(entries);
    // Counts in header
    assert.ok(md.includes("**3 skills**"));
    assert.ok(md.includes("2 categories"));
    // Sorted categories: "(top-level)" sorts before "wedm" (paren < letter ASCII)
    const topIdx = md.indexOf("## (top-level)");
    const wedmIdx = md.indexOf("## wedm");
    assert.ok(topIdx >= 0 && wedmIdx > topIdx, "categories must be sorted alphabetically");
    // Sorted skills within category
    const aIdx = md.indexOf("`/a-skill`");
    const zIdx = md.indexOf("`/z-skill`");
    assert.ok(aIdx < zIdx, "skills must be alphabetically sorted within category");
    // Pipe escaped
    assert.ok(md.includes("Description with \\| pipe"));
    // Markdown table header present per group
    assert.ok((md.match(/\| Skill \| Description \|/g) || []).length === 2);
  });

  it("renders zero-entry list without crashing", () => {
    const md = render([]);
    assert.ok(md.includes("**0 skills**"));
    assert.ok(md.includes("0 categories"));
  });
});

describe("walkSkills (with mock fs)", () => {
  const makeMockFs = (tree) => ({
    readdirSync(dir, opts) {
      const children = tree[dir];
      if (!children) throw new Error(`ENOENT ${dir}`);
      if (opts?.withFileTypes) {
        return children.map((c) => ({
          name: c.name,
          isFile: () => c.type === "file",
          isDirectory: () => c.type === "dir",
        }));
      }
      return children.map((c) => c.name);
    },
  });

  it("collects top-level .md files and subdir .md files; skips COMMANDS_DIGEST.md", () => {
    const cmds = "/cmds";
    const wedm = path.join(cmds, "wedm");
    const tree = {
      [cmds]: [
        { name: "alpha.md", type: "file" },
        { name: "COMMANDS_DIGEST.md", type: "file" },
        { name: "README.txt", type: "file" },
        { name: "wedm", type: "dir" },
      ],
      [wedm]: [
        { name: "studio.md", type: "file" },
        { name: "ignore.json", type: "file" },
      ],
    };
    const result = walkSkills({ commandsDir: cmds, fsImpl: makeMockFs(tree) });
    assert.equal(result.length, 2);
    assert.ok(result.some((r) => r.file.endsWith("alpha.md") && r.category === "(top-level)"));
    assert.ok(result.some((r) => r.file.endsWith("studio.md") && r.category === "wedm"));
    // COMMANDS_DIGEST.md excluded
    assert.ok(!result.some((r) => r.file.endsWith("COMMANDS_DIGEST.md")));
    // README.txt excluded
    assert.ok(!result.some((r) => r.file.endsWith("README.txt")));
  });

  it("returns empty array on unreadable commands dir", () => {
    assert.deepEqual(walkSkills({ commandsDir: "/does-not-exist", fsImpl: makeMockFs({}) }), []);
  });
});

// path import for walkSkills test
import path from "node:path";
