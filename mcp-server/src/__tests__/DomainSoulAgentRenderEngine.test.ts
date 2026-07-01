/**
 * DomainSoulAgentRenderEngine.test.ts -- DOMAIN-SOUL-AGENTS / U1.
 *
 * Verifies the pure render core composes a slot soul + galaxy meta into a valid
 * spawnable agent definition: name = <slot>-<domain>, refuse_list carried VERBATIM,
 * domain knowledge pointers present, failure + adversarial inputs handled (R9).
 */
import { describe, it, expect } from "vitest";
import {
  DomainSoulAgentRenderEngine,
  DEFAULT_AGENT_TOOLS,
  MAX_RENDERED_BYTES,
  type GalaxyMeta,
} from "../engines/DomainSoulAgentRenderEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

function charlieSoul(over: Partial<SlotSoul> = {}): SlotSoul {
  return {
    slot: "charlie",
    role: "quoting-specialist",
    voice: "margin-rigorous",
    tone: "precise",
    escalation_path: "route-cycle-time-and-physics-before-cost",
    refuse_list: [
      "inline-shop-rate-or-margin-constants",
      "softening-quote-vs-actual-reconciliation-thresholds",
      "emitting-customer-quote-without-margin-floor-gate",
    ],
    preferred_subagent_type: "code-analyzer",
    domain_filter: "quote|quoting|pricing|margin|cost|estimat|bid",
    hermes_role: "specialist-quoting",
    body: "# Charlie\nquoting specialist body",
    ...over,
  };
}

const quotingMeta: GalaxyMeta = {
  domain: "quoting",
  identity: "Quoting Galaxy -- print-to-quote, instant quotes, quote-vs-actual reconciliation",
  knowledgePaths: [
    "mcp-server/src/engines/quoting/CLAUDE.md",
    "mcp-server/src/engines/quoting/MEMORY.md",
    "mcp-server/src/engines/quoting/PATHS.md",
  ],
};

/** Extract a single frontmatter line by key, or "" if absent. */
function fmLine(content: string, key: string): string {
  return content.split("\n").find((l) => l.startsWith(`${key}:`)) ?? "";
}

describe("DomainSoulAgentRenderEngine.renderAgent", () => {
  it("renders charlie+quoting -> name 'charlie-quoting' with correct frontmatter", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), quotingMeta);
    expect(r.ok).toBe(true);
    expect(r.name).toBe("charlie-quoting");
    expect(fmLine(r.content, "name")).toBe("name: charlie-quoting");
    // full build/work tools granted (operator: build/review/audit)
    for (const t of DEFAULT_AGENT_TOOLS) expect(r.content).toContain(t);
    expect(fmLine(r.content, "tools")).toBe("tools: Read, Grep, Glob, Bash, Write, Edit");
    // carried-through keys the auto-trigger + lane selector read
    expect(fmLine(r.content, "slot")).toBe("slot: charlie");
    expect(fmLine(r.content, "domain")).toBe("domain: quoting");
    expect(fmLine(r.content, "hermes_capable")).toBe("hermes_capable: true");
    expect(r.content).toContain("domain_filter: ");
  });

  it("carries the refuse_list VERBATIM (the domain guardrails must survive)", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), quotingMeta);
    expect(r.content).toContain("inline-shop-rate-or-margin-constants");
    expect(r.content).toContain("softening-quote-vs-actual-reconciliation-thresholds");
    expect(r.content).toContain("emitting-customer-quote-without-margin-floor-gate");
    expect(r.content).toContain("Refuse-list (HARD");
  });

  it("includes the galaxy knowledge pointers + universal-rails pointer", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), quotingMeta);
    expect(r.content).toContain("mcp-server/src/engines/quoting/CLAUDE.md");
    expect(r.content).toContain("mcp-server/src/engines/quoting/MEMORY.md");
    expect(r.content).toContain("H:/prism/CLAUDE.md");
    expect(r.content).toContain("Full multi-domain access");
  });

  it("falls back to a default knowledge pointer when knowledgePaths omitted", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), { domain: "quoting" });
    expect(r.ok).toBe(true);
    expect(r.content).toContain("mcp-server/src/engines/quoting/");
  });

  it("uses model override when provided", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), { ...quotingMeta, model: "sonnet" });
    expect(fmLine(r.content, "model")).toBe("model: sonnet");
  });

  // ---- failure modes -----------------------------------------------------
  it("FAILURE: missing soul -> ok:false", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(null, quotingMeta);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/soul.*required/i);
  });

  it("FAILURE: soul without a slot -> ok:false", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul({ slot: "" }), quotingMeta);
    expect(r.ok).toBe(false);
  });

  it("FAILURE: invalid galaxy meta (empty domain) -> ok:false", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), { domain: "" } as GalaxyMeta);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/galaxy meta/i);
  });

  it("FAILURE: empty refuse_list still renders a valid agent (no refuse section, no crash)", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul({ refuse_list: [] }), quotingMeta);
    expect(r.ok).toBe(true);
    expect(r.content).not.toContain("Refuse-list (HARD");
    expect(fmLine(r.content, "name")).toBe("name: charlie-quoting");
  });

  // ---- adversarial inputs ------------------------------------------------
  it("ADVERSARIAL: description with YAML-significant chars is quote-escaped (valid frontmatter)", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul(), {
      domain: "quoting",
      identity: 'has: colons, "quotes", and [brackets]',
    });
    expect(r.ok).toBe(true);
    // the description line must be a quoted scalar (starts with description: ")
    const descLine = fmLine(r.content, "description");
    expect(descLine.startsWith('description: "')).toBe(true);
    expect(descLine.endsWith('"')).toBe(true);
  });

  it("ADVERSARIAL: oversize content truncates to the byte cap + flags a warning", () => {
    // The render body is bounded by the inputs; to exceed the 24KB cap we need a
    // large refuse_list of long entries. 40 refuses x 600 chars ~= 24KB of body alone.
    const r = DomainSoulAgentRenderEngine.renderAgent(
      charlieSoul({ refuse_list: Array.from({ length: 40 }, (_, i) => "refuse-" + "y".repeat(600) + i) }),
      { domain: "quoting", identity: "z".repeat(390) }
    );
    expect(r.ok).toBe(true);
    expect(r.content.length).toBeLessThanOrEqual(MAX_RENDERED_BYTES);
    expect(r.errors.some((e) => /truncated/.test(e))).toBe(true);
  });

  it("ADVERSARIAL: unusual voice/tone does not break the render", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(
      charlieSoul({ voice: "precise", tone: "direct" }),
      { domain: "quoting", identity: "cafe resume" }
    );
    expect(r.ok).toBe(true);
    expect(fmLine(r.content, "name")).toBe("name: charlie-quoting");
  });

  it("lowercases + composes slot/domain into the name", () => {
    const r = DomainSoulAgentRenderEngine.renderAgent(charlieSoul({ slot: "HOTEL" }), { domain: "ERP" });
    expect(r.name).toBe("hotel-erp");
    expect(fmLine(r.content, "name")).toBe("name: hotel-erp");
  });
});
