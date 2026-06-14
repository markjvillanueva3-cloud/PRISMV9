/**
 * safetyDispatcher U-WIRE-SBOM round-trip tests — SBOMReviewEngine.
 *
 * Validates the 5 new READ-ONLY actions (sbom_stats / sbom_posture / sbom_components /
 * sbom_vulnerabilities / sbom_remediations) wire through prism_safety and that the
 * engine's SLA cadence + OSV-delta set semantics + posture computation behave per its
 * NIST SP 800-40r4 / CISA BOD 22-01 contract. Mutations (registerComponent /
 * registerVulnerability / openRemediation / startReview / clearAll) are deliberately
 * NOT exposed via MCP (operator-in-the-loop per CLAUDE.md Safety Tier) — mirrors the
 * sibling kill-switch read-only block.
 *
 * Pattern: a LIVE dispatcher round-trip (registerSafetyDispatcher(shim) → capture
 * handler → invoke → assert JSON), NOT a source-grep — the singleton is cleared in
 * beforeEach so round-trip value assertions are deterministic.
 *
 * Wired slot:papa 2026-06-13 — continues the WIRE-UNWIRED-PAPA resilience/ops family
 * (DR / Backup / KillSwitch / FeedbackCollector / Chaos / Loki / TenantOnboarding landed).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SBOM
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import {
  SBOMReviewEngine,
  sbomReviewEngine,
  type Component,
} from "../engines/SBOMReviewEngine.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A fully-formed component for registration.
function comp(over: Partial<Component> = {}): Component {
  return {
    id: "pkg:npm/zod@3.22.4",
    type: "npm",
    name: "zod",
    version: "3.22.4",
    license: "MIT",
    supplier: "colinhacks",
    direct_dependency: true,
    last_reviewed_at: null,
    hash_sha256: null,
    ...over,
  };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerSafetyDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  // Deterministic singleton state for round-trip value assertions.
  sbomReviewEngine.clearAll();
});

// ── Engine-direct reference values (happy path) ─────────────────────────────
describe("U-WIRE-SBOM — fresh-state reference values", () => {
  it("a fresh engine has all-zero stats across every catalog", () => {
    const s = new SBOMReviewEngine().getStats();
    expect(s.components_registered).toBe(0);
    expect(s.vulnerabilities_registered).toBe(0);
    expect(s.remediations_registered).toBe(0);
    expect(s.reviews_completed).toBe(0);
    expect(s.vulnerabilities_by_severity).toEqual({ none: 0, low: 0, medium: 0, high: 0, critical: 0 });
  });

  it("a never-reviewed engine is overdue (no completed quarterly review)", () => {
    const p = new SBOMReviewEngine().getPosture(1_700_000_000_000);
    expect(p.overall).toBe("overdue");
    expect(p.quarterly_review_overdue).toBe(true);
    expect(p.last_review).toBeNull();
    expect(p.critical_open).toBe(0);
    expect(p.findings.some(f => /overdue/i.test(f))).toBe(true);
  });
});

// ── Catalog + SLA + delta semantics (spanning configs) ──────────────────────
describe("U-WIRE-SBOM — catalog, SLA cadence, OSV delta", () => {
  it("registerComponent + listComponents filters by ecosystem type", () => {
    const e = new SBOMReviewEngine();
    e.registerComponent(comp({ id: "pkg:npm/a@1", type: "npm" }));
    e.registerComponent(comp({ id: "pkg:pypi/b@2", type: "pypi" }));
    expect(e.listComponents({ type: "pypi" }).map(c => c.id)).toEqual(["pkg:pypi/b@2"]);
    expect(e.listComponents().length).toBe(2);
  });

  it("a critical-severity remediation gets a 7-day SLA due date", () => {
    const e = new SBOMReviewEngine();
    e.registerComponent(comp({ id: "pkg:npm/x@1" }));
    e.registerVulnerability({
      id: "CVE-2026-0001", aliases: [], summary: "rce", severity: "critical",
      cvss_score: 9.8, affected_component_ids: ["pkg:npm/x@1"],
      published_at: 1000, fixed_in_version: "2", reference_urls: [],
    });
    const rem = e.openRemediation({ vulnerability_id: "CVE-2026-0001", assigned_to: "sec", now: 0 });
    // critical SLA = 7 days = 7 * 86400000 ms
    expect(rem.due_at).toBe(7 * 24 * 3600 * 1000);
  });

  it("computeDelta reports new/resolved/unchanged by OSV set semantics", () => {
    const e = new SBOMReviewEngine();
    e.captureSnapshot({ id: "S1", source: "osv.dev", vulnerability_ids: ["A", "B"], captured_at: 100 });
    e.captureSnapshot({ id: "S2", source: "osv.dev", vulnerability_ids: ["B", "C"], captured_at: 200 });
    const d = e.computeDelta("S1", "S2");
    expect(d.new_vulnerabilities).toEqual(["C"]);
    expect(d.resolved_vulnerabilities).toEqual(["A"]);
    expect(d.unchanged_vulnerabilities).toEqual(["B"]);
  });

  it("an open critical remediation flips the posture to at_risk with critical_open=1", () => {
    const e = new SBOMReviewEngine();
    e.registerComponent(comp({ id: "pkg:npm/x@1" }));
    e.registerVulnerability({
      id: "CVE-2026-0002", aliases: [], summary: "x", severity: "critical",
      cvss_score: 9.0, affected_component_ids: ["pkg:npm/x@1"],
      published_at: 1, fixed_in_version: null, reference_urls: [],
    });
    e.openRemediation({ vulnerability_id: "CVE-2026-0002", assigned_to: "sec" });
    const p = e.getPosture();
    expect(p.overall).toBe("at_risk");
    expect(p.critical_open).toBe(1);
  });

  it("listVulnerabilities filters by severity", () => {
    const e = new SBOMReviewEngine();
    e.registerComponent(comp({ id: "pkg:npm/x@1" }));
    e.registerVulnerability({ id: "V-hi", aliases: [], summary: "", severity: "high", cvss_score: 7, affected_component_ids: ["pkg:npm/x@1"], published_at: 1, fixed_in_version: null, reference_urls: [] });
    e.registerVulnerability({ id: "V-lo", aliases: [], summary: "", severity: "low", cvss_score: 2, affected_component_ids: ["pkg:npm/x@1"], published_at: 1, fixed_in_version: null, reference_urls: [] });
    expect(e.listVulnerabilities({ severity: "high" }).map(v => v.id)).toEqual(["V-hi"]);
  });
});

// ── Adversarial / fail-loud (R12) ───────────────────────────────────────────
describe("U-WIRE-SBOM — fail-loud input validation", () => {
  it("registerComponent rejects a missing version", () => {
    expect(() => new SBOMReviewEngine().registerComponent(comp({ version: "" }))).toThrow(/version required/);
  });

  it("registerVulnerability rejects a cvss_score above 10", () => {
    const e = new SBOMReviewEngine();
    e.registerComponent(comp({ id: "pkg:npm/x@1" }));
    expect(() => e.registerVulnerability({
      id: "V", aliases: [], summary: "", severity: "high", cvss_score: 11,
      affected_component_ids: ["pkg:npm/x@1"], published_at: 1, fixed_in_version: null, reference_urls: [],
    })).toThrow(/cvss_score must be in/);
  });

  it("registerVulnerability rejects an unknown affected-component reference", () => {
    expect(() => new SBOMReviewEngine().registerVulnerability({
      id: "V", aliases: [], summary: "", severity: "high", cvss_score: 7,
      affected_component_ids: ["pkg:npm/ghost@9"], published_at: 1, fixed_in_version: null, reference_urls: [],
    })).toThrow(/Unknown component reference/);
  });

  it("computeDelta rejects a from-snapshot captured after the to-snapshot", () => {
    const e = new SBOMReviewEngine();
    e.captureSnapshot({ id: "late", source: "osv", vulnerability_ids: [], captured_at: 500 });
    e.captureSnapshot({ id: "early", source: "osv", vulnerability_ids: [], captured_at: 100 });
    expect(() => e.computeDelta("late", "early")).toThrow(/must be captured before/);
  });
});

// ── LIVE round-trip through prism_safety (the wire proof) ───────────────────
describe("U-WIRE-SBOM — dispatcher round-trip (prism_safety)", () => {
  it("sbom_stats reflects components registered on the (cleared) singleton", async () => {
    sbomReviewEngine.registerComponent(comp({ id: "pkg:npm/a@1" }));
    sbomReviewEngine.registerComponent(comp({ id: "pkg:pypi/b@2", type: "pypi" }));
    const r = await call(server, "sbom_stats");
    expect(r.ok).toBe(true);
    expect(r.data.components_registered).toBe(2);
  });

  it("sbom_posture returns the overdue posture for a fresh (never-reviewed) singleton", async () => {
    const r = await call(server, "sbom_posture");
    expect(r.ok).toBe(true);
    expect(r.data.overall).toBe("overdue");
    expect(r.data.quarterly_review_overdue).toBe(true);
  });

  it("sbom_components applies the ecosystem-type filter end-to-end", async () => {
    sbomReviewEngine.registerComponent(comp({ id: "pkg:npm/a@1", type: "npm" }));
    sbomReviewEngine.registerComponent(comp({ id: "pkg:pypi/b@2", type: "pypi" }));
    const r = await call(server, "sbom_components", { type: "pypi" });
    expect(r.ok).toBe(true);
    const components = r.data.components as Array<{ id: string }>;
    expect(components.map(c => c.id)).toEqual(["pkg:pypi/b@2"]);
  });

  it("sbom_vulnerabilities returns the vulnerability list through the dispatcher", async () => {
    sbomReviewEngine.registerComponent(comp({ id: "pkg:npm/x@1" }));
    sbomReviewEngine.registerVulnerability({ id: "CVE-RT", aliases: [], summary: "", severity: "high", cvss_score: 7, affected_component_ids: ["pkg:npm/x@1"], published_at: 1, fixed_in_version: null, reference_urls: [] });
    const r = await call(server, "sbom_vulnerabilities", { severity: "high" });
    expect(r.ok).toBe(true);
    const vulns = r.data.vulnerabilities as Array<{ id: string }>;
    expect(vulns.map(v => v.id)).toEqual(["CVE-RT"]);
  });

  it("sbom_remediations returns the (empty) remediation list for a cleared singleton", async () => {
    const r = await call(server, "sbom_remediations");
    expect(r.ok).toBe(true);
    expect((r.data.remediations as unknown[]).length).toBe(0);
  });

  it("all 5 sbom_* read actions are accepted by the registered dispatcher", async () => {
    for (const action of [
      "sbom_stats", "sbom_posture", "sbom_components", "sbom_vulnerabilities", "sbom_remediations",
    ]) {
      const r = await call(server, action);
      expect(r.ok, `${action} should succeed`).toBe(true);
    }
  });
});

// ── Schema validation through the dispatcher (adversarial) ──────────────────
describe("U-WIRE-SBOM — schema rejection (prism_safety)", () => {
  it("sbom_components rejects an out-of-enum ecosystem type", async () => {
    const r = await call(server, "sbom_components", { type: "rust" });
    expect(r.ok).toBe(false);
  });

  it("sbom_vulnerabilities rejects an out-of-enum severity", async () => {
    const r = await call(server, "sbom_vulnerabilities", { severity: "apocalyptic" });
    expect(r.ok).toBe(false);
  });

  it("sbom_remediations rejects an out-of-enum status", async () => {
    const r = await call(server, "sbom_remediations", { status: "ignored" });
    expect(r.ok).toBe(false);
  });
});
