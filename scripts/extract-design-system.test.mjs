#!/usr/bin/env node
/**
 * Tests for extract-design-system.mjs — pure-function units only.
 * Run: node --test scripts/extract-design-system.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

const { scanForExtraTokens, renderDesignSystemHtml, tokensToJson, CANONICAL_TOKENS } =
  await import("./extract-design-system.mjs");

// ---------- CANONICAL_TOKENS shape ----------

test("CANONICAL_TOKENS exposes colors/typography/spacing/radii/components", () => {
  assert.ok(CANONICAL_TOKENS.colors);
  assert.ok(CANONICAL_TOKENS.typography);
  assert.ok(CANONICAL_TOKENS.spacing);
  assert.ok(CANONICAL_TOKENS.radii);
  assert.ok(CANONICAL_TOKENS.components);
});

test("CANONICAL_TOKENS has ≥ 10 components per envelope exit-condition", () => {
  assert.ok(Object.keys(CANONICAL_TOKENS.components).length >= 10);
});

test("CANONICAL_TOKENS has critical severity colors (success/warn/critical)", () => {
  assert.ok(CANONICAL_TOKENS.colors["accent-success"]);
  assert.ok(CANONICAL_TOKENS.colors["accent-warning"]);
  assert.ok(CANONICAL_TOKENS.colors["accent-critical"]);
});

test("CANONICAL_TOKENS color values are valid 6-hex strings", () => {
  for (const [name, v] of Object.entries(CANONICAL_TOKENS.colors)) {
    assert.ok(/^#[0-9a-f]{6}$/i.test(v.hex), `${name} not a 6-hex color: ${v.hex}`);
  }
});

// ---------- renderDesignSystemHtml ----------

test("renderDesignSystemHtml returns valid HTML5 document", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS);
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes("<html"));
  assert.ok(html.includes("</html>"));
  assert.ok(html.includes('<meta charset="UTF-8">'));
});

test("renderDesignSystemHtml embeds inline CSS vars from tokens", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS);
  assert.ok(html.includes("--bg-base:"));
  assert.ok(html.includes("--accent-primary:"));
  assert.ok(html.includes("--radius-md:"));
});

test("renderDesignSystemHtml has color/typography/components tables", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS);
  assert.ok(html.includes(">Colors</h2>"));
  assert.ok(html.includes(">Typography</h2>"));
  assert.ok(html.includes(">Components</h2>"));
  // Three <table> elements minimum:
  const tableCount = (html.match(/<table>/g) || []).length;
  assert.ok(tableCount >= 3);
});

test("renderDesignSystemHtml is self-contained (no external href/src)", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS);
  // No external CDN / link rel=stylesheet / script src — exit_condition requirement.
  assert.ok(!/<link[^>]+href=/i.test(html), "should not link external stylesheet");
  assert.ok(!/<script[^>]+src=/i.test(html), "should not include external script");
});

test("renderDesignSystemHtml accepts an extras array and renders observed classes", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS, ["text-red-500", "p-4", "rounded-md"]);
  assert.ok(html.includes("text-red-500"));
  assert.ok(html.includes("Tailwind classes observed"));
});

test("renderDesignSystemHtml omits 'observed' section on empty extras", () => {
  const html = renderDesignSystemHtml(CANONICAL_TOKENS, []);
  assert.ok(!html.includes("Tailwind classes observed"));
});

test("renderDesignSystemHtml caps extras display at 200", () => {
  const many = Array.from({ length: 250 }, (_, i) => `cls${i}`);
  const html = renderDesignSystemHtml(CANONICAL_TOKENS, many);
  assert.ok(html.includes("cls0"));
  assert.ok(!html.includes(">cls249<"));   // cls249 should be in the … truncated
  assert.ok(/\d+ more not shown/.test(html));
});

// ---------- scanForExtraTokens ----------

test("scanForExtraTokens returns [] when readdir throws", () => {
  const out = scanForExtraTokens({
    webDir: "/nonexistent/dir",
    readdir: () => { throw new Error("ENOENT"); },
    readFile: () => "",
    maxFiles: 10,
  });
  assert.deepEqual(out, []);
});

test("scanForExtraTokens extracts className tokens from tsx file", () => {
  const fakeReaddir = (dir) => {
    if (dir === "/fake") return [{ name: "App.tsx", isDirectory: () => false, isFile: () => true }];
    return [];
  };
  const fakeRead = () => `
    export default function App() {
      return <div className="bg-slate-900 text-white p-4">hi</div>;
    }
  `;
  const out = scanForExtraTokens({
    webDir: "/fake", readdir: fakeReaddir, readFile: fakeRead, maxFiles: 5,
  });
  assert.ok(out.includes("bg-slate-900"));
  assert.ok(out.includes("text-white"));
  assert.ok(out.includes("p-4"));
});

test("scanForExtraTokens dedups + sorts ascending", () => {
  const fakeReaddir = (dir) => {
    if (dir === "/fake") return [
      { name: "a.tsx", isDirectory: () => false, isFile: () => true },
      { name: "b.tsx", isDirectory: () => false, isFile: () => true },
    ];
    return [];
  };
  const fakeRead = () => `<div className="alpha beta">{ <span className="alpha gamma" /> }</div>`;
  const out = scanForExtraTokens({
    webDir: "/fake", readdir: fakeReaddir, readFile: fakeRead, maxFiles: 5,
  });
  // alpha appears once even though in 2 files
  assert.equal(out.filter((c) => c === "alpha").length, 1);
  // Ascending sort
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i - 1] <= out[i]);
  }
});

test("scanForExtraTokens skips node_modules + .git + dist directories", () => {
  const visited = [];
  const fakeReaddir = (dir) => {
    visited.push(dir);
    if (dir === "/fake") return [
      { name: "node_modules", isDirectory: () => true, isFile: () => false },
      { name: ".git", isDirectory: () => true, isFile: () => false },
      { name: "dist", isDirectory: () => true, isFile: () => false },
      { name: "src", isDirectory: () => true, isFile: () => false },
    ];
    if (dir.endsWith("/src")) return [];
    return [];
  };
  scanForExtraTokens({
    webDir: "/fake", readdir: fakeReaddir, readFile: () => "", maxFiles: 50,
  });
  assert.ok(visited.includes("/fake"));
  assert.ok(visited.some((d) => /[\\/]src$/.test(d)), `expected '/src' or '\\src' visit; got ${JSON.stringify(visited)}`);
  assert.ok(!visited.some((d) => d.includes("node_modules")));
  assert.ok(!visited.some((d) => d.includes(".git")));
  assert.ok(!visited.some((d) => /[\\/]dist$/.test(d)));
});

test("scanForExtraTokens respects maxFiles cap", () => {
  let filesRead = 0;
  const fakeReaddir = (dir) => {
    if (dir === "/fake") return Array.from({ length: 50 }, (_, i) => ({
      name: `f${i}.tsx`, isDirectory: () => false, isFile: () => true,
    }));
    return [];
  };
  const fakeRead = () => { filesRead++; return `<div className="x" />`; };
  scanForExtraTokens({
    webDir: "/fake", readdir: fakeReaddir, readFile: fakeRead, maxFiles: 5,
  });
  assert.ok(filesRead <= 5, `expected ≤5 files read, got ${filesRead}`);
});

test("scanForExtraTokens filters interpolated / invalid classnames", () => {
  const fakeReaddir = (dir) => {
    if (dir === "/fake") return [{ name: "x.tsx", isDirectory: () => false, isFile: () => true }];
    return [];
  };
  const fakeRead = () => `<div className="valid-name ${"${interp}"} another-valid 1starts-numeric" />`;
  const out = scanForExtraTokens({
    webDir: "/fake", readdir: fakeReaddir, readFile: fakeRead, maxFiles: 5,
  });
  assert.ok(out.includes("valid-name"));
  assert.ok(out.includes("another-valid"));
  // "1starts-numeric" begins with digit — should be filtered
  assert.ok(!out.includes("1starts-numeric"));
});

// ---------- tokensToJson ----------

test("tokensToJson produces parseable JSON", () => {
  const json = tokensToJson(CANONICAL_TOKENS, ["a-class"]);
  const parsed = JSON.parse(json);
  assert.ok(parsed.tokens);
  assert.deepEqual(parsed.extras, ["a-class"]);
});

test("tokensToJson default extras is empty array", () => {
  const json = tokensToJson(CANONICAL_TOKENS);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed.extras, []);
});
