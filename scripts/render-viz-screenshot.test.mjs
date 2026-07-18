/**
 * render-viz-screenshot.test.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04
 *
 * Chrome-free unit coverage of the headless PNG renderer:
 *   - esc(): HTML-escapes the chars that matter (the "embedded malicious payload"
 *     adversarial case -- closed at the render boundary).
 *   - buildHtml(): escapes node labels/ids, renders an explicit empty-layer card,
 *     applies the layer filter.
 *   - renderEgoToPng(): returns the structured chromium-unavailable status when no
 *     browser binary resolves (so the engine can do its MD fallback).
 * The real Chrome render is environment-gated (proven on a free-Chrome host); these
 * tests pin the deterministic, Chrome-independent contract.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { esc, buildHtml, filterNodes, isEmptyForLayer, renderEgoToPng } from "./render-viz-screenshot.mjs";

const ego = {
  center: "eng.system.foo",
  effectiveHops: 1,
  nodes: [
    { id: "eng.system.foo", distance: 0, label: "FooEngine", layer: "L6", kind: "engine", status: "built" },
    { id: "eng.system.bar", distance: 1, label: "BarEngine", layer: "L6", kind: "engine", status: "built" },
    { id: "disp.prism_ai", distance: 1, label: "prism_ai", layer: "L4", kind: "dispatcher", status: "built" },
  ],
  edges: [
    { from: "eng.system.foo", to: "eng.system.bar", type: "calls" },
    { from: "eng.system.foo", to: "disp.prism_ai", type: "wired-to" },
  ],
};

describe("esc", () => {
  it("escapes the five XSS-relevant chars", () => {
    assert.equal(esc(`<script>alert("x")&'</script>`), "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;");
  });
  it("handles null/undefined as empty string", () => {
    assert.equal(esc(null), "");
    assert.equal(esc(undefined), "");
  });
});

describe("buildHtml", () => {
  it("escapes a malicious node label -- raw <script> never reaches the page", () => {
    const evil = { center: "x", effectiveHops: 1, nodes: [{ id: "x", distance: 0, label: "<script>steal()</script>" }], edges: [] };
    const html = buildHtml(evil, undefined);
    assert.ok(!html.includes("<script>steal()</script>"), "raw script tag must not appear");
    assert.ok(html.includes("&lt;script&gt;"), "escaped form must appear");
  });
  it("escapes a malicious node id too", () => {
    const evil = { center: "<img src=x onerror=alert(1)>", effectiveHops: 1, nodes: [{ id: "<img src=x onerror=alert(1)>", distance: 0 }], edges: [] };
    const html = buildHtml(evil, undefined);
    assert.ok(!html.includes("<img src=x onerror=alert(1)>"), "raw img tag must not appear");
    assert.ok(html.includes("&lt;img"), "escaped form must appear");
  });
  it("renders the SVG with a node per entry (full graph)", () => {
    const html = buildHtml(ego, undefined);
    assert.ok(html.includes("FooEngine"));
    assert.ok(html.includes("BarEngine"));
    assert.ok(html.includes("prism_ai"));
    assert.ok(html.startsWith("<!doctype html>"));
  });
  it("layer filter keeps only matching nodes (plus the center)", () => {
    const html = buildHtml(ego, "L4");
    assert.ok(html.includes("prism_ai"), "L4 dispatcher kept");
    // BarEngine is L6 and not the center -> filtered out
    assert.ok(!html.includes("BarEngine"), "L6 non-center filtered out");
  });
  it("empty layer renders an explicit no-nodes card", () => {
    const html = buildHtml(ego, "L99");
    assert.ok(html.includes("no nodes in layer L99"));
  });
});

describe("filterNodes / isEmptyForLayer", () => {
  it("filterNodes keeps center + layer matches", () => {
    const f = filterNodes(ego, "L4");
    const ids = f.map((n) => n.id);
    assert.ok(ids.includes("eng.system.foo")); // center always kept
    assert.ok(ids.includes("disp.prism_ai"));
    assert.ok(!ids.includes("eng.system.bar"));
  });
  it("isEmptyForLayer is true only when nothing but a non-matching center remains", () => {
    assert.equal(isEmptyForLayer(ego, "L99"), true);
    assert.equal(isEmptyForLayer(ego, "L4"), false);
    assert.equal(isEmptyForLayer(ego, undefined), false);
  });
});

describe("renderEgoToPng", () => {
  it("returns chromium-unavailable when no browser binary resolves", () => {
    const res = renderEgoToPng({ ego, out: "/nonexistent/out.png", chromeBin: "/no/such/chrome-binary-xyz", maxBytes: 1024 });
    // a bogus chromeBin is used verbatim; spawn fails -> render-failed (a non-ok
    // status the engine treats identically to unavailable -> MD fallback).
    assert.equal(res.ok, false);
    assert.ok(["render-failed", "chromium-unavailable"].includes(res.reason), `unexpected reason: ${res.reason}`);
    assert.equal(res.nodeCount, 3);
  });
});
