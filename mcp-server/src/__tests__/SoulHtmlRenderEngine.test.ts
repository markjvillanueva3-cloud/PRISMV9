/** SoulHtmlRenderEngine tests — HSE04. */
import { describe, it, expect } from "vitest";
import { SoulHtmlRenderEngine } from "../engines/SoulHtmlRenderEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "physics-first",
  tone: "rigorous",
  refuse_list: ["inline-physics-constants", "stub-engine-creation"],
  preferred_subagent_type: "physics-reviewer",
  domain_filter: "mill|kienzle",
  escalation_path: "validate-kc-before-edit",
  hermes_role: "specialist-mill",
  body: "# Bravo body\n\nphysics-first review on every Kienzle edit.",
  ...over,
});

describe("SoulHtmlRenderEngine.render — happy", () => {
  it("emits a valid HTML5 doctype + lang", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.includes('<html lang="en">')).toBe(true);
  });

  it("title carries slot + role", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect(html.includes("<title>bravo — mill-specialist")).toBe(true);
  });

  it("renders refuse list as <ul>", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect(html.includes("<ul")).toBe(true);
    expect(html.includes("inline-physics-constants")).toBe(true);
    expect(html.includes("stub-engine-creation")).toBe(true);
  });

  it("body content preserved", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect(html.includes("physics-first review on every Kienzle edit")).toBe(true);
  });
});

describe("SoulHtmlRenderEngine.render — accessibility + escape", () => {
  it("aria-labelledby anchors on every section", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect((html.match(/aria-labelledby/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it("XSS payload escaped in role field", () => {
    const evil = SOUL({ role: '<script>alert("x")</script>' });
    const html = SoulHtmlRenderEngine.render(evil);
    expect(html.includes("<script>alert")).toBe(false);
    expect(html.includes("&lt;script&gt;")).toBe(true);
  });

  it("XSS payload escaped in refuse list item", () => {
    const evil = SOUL({ refuse_list: ["<img onerror=x>"] });
    const html = SoulHtmlRenderEngine.render(evil);
    expect(html.includes("<img onerror")).toBe(false);
  });

  it("empty refuse_list shows no-refuses placeholder", () => {
    const html = SoulHtmlRenderEngine.render(SOUL({ refuse_list: [] }));
    expect(html.includes("No refuses declared")).toBe(true);
  });

  it("missing optional fields → em-dash placeholder", () => {
    const html = SoulHtmlRenderEngine.render(
      SOUL({ preferred_subagent_type: undefined, domain_filter: undefined, escalation_path: undefined }),
    );
    expect((html.match(/—/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("missing soul throws", () => {
    expect(() => SoulHtmlRenderEngine.render(null as never)).toThrow();
  });

  it("CSS variables defined for dark theme", () => {
    const html = SoulHtmlRenderEngine.render(SOUL());
    expect(html.includes("--bg:#0d1117")).toBe(true);
    expect(html.includes("--fg:#c9d1d9")).toBe(true);
  });
});
