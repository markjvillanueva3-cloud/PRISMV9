/**
 * Tests for DreamMarkerScannerEngine (DREAM-RECEIPT-MS0/U-DR07).
 *
 * Covers 16 cases: 4 happy (one per marker kind) + 4 failure modes + 3 adversarial
 * + 3 variability (multi-line, position-independent, markdown-bullet prefix)
 * + 2 composition (markersToProposals adapter end-to-end).
 *
 * Floor compliance (per comprehensive-build-enforce):
 *   - ≥ happy + 3 failure + 2 adversarial: 4+4+3 ✓
 *   - ≥ 3 spanning variability cases: 3 spans ✓
 *   - Real reference values, no toBeDefined() stubs ✓
 */

import { describe, it, expect } from "vitest";
import {
  DreamMarkerScannerEngine,
  type DreamMarker,
} from "../engines/DreamMarkerScannerEngine.js";
import { DreamArtifactBundleEngine } from "../engines/DreamArtifactBundleEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// HAPPY PATH — 4 cases, one per marker kind
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamMarkerScannerEngine — happy path", () => {
  it("T01 parses a `DREAM: memory:` marker", () => {
    const src = `DREAM: memory: Keep updates short and concrete.\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].kind).toBe("memory");
    expect(r.markers[0].body).toBe("Keep updates short and concrete.");
    expect(r.markers[0].line).toBe(1);
  });

  it("T02 parses a `DREAM: user:` marker", () => {
    const src = `Some preamble\nDREAM: user: Prefer concise status updates.\nMore body\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].kind).toBe("user");
    expect(r.markers[0].line).toBe(2);
    expect(r.markers[0].body).toBe("Prefer concise status updates.");
  });

  it("T03 parses a `DREAM: fact:` marker with JSON body and validates schema", () => {
    const src = `DREAM: fact: {"type":"preference","key":"tone","value":"casual"}\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].kind).toBe("fact");
    const fact = r.markers[0].body as { type: string; key: string; value: unknown };
    expect(fact.type).toBe("preference");
    expect(fact.key).toBe("tone");
    expect(fact.value).toBe("casual");
  });

  it("T04 parses a `DREAM: skill:` marker with path + description", () => {
    const src = `DREAM: skill: path=skills/review.md | Preserve review gates and backups.\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(1);
    expect(r.markers[0].kind).toBe("skill");
    const skill = r.markers[0].body as { path: string; description: string };
    expect(skill.path).toBe("skills/review.md");
    expect(skill.description).toBe("Preserve review gates and backups.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE MODES — 4 cases, all land in malformed[] not throw
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamMarkerScannerEngine — failure modes", () => {
  it("T05 fact with malformed JSON lands in malformed[] with parse-error reason", () => {
    const src = `DREAM: fact: {not valid json}\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toEqual([]);
    expect(r.malformed).toHaveLength(1);
    expect(r.malformed[0].line).toBe(1);
    expect(r.malformed[0].reason).toContain("fact JSON parse");
  });

  it("T06 fact with valid JSON but wrong schema lands in malformed[] with schema reason", () => {
    const src = `DREAM: fact: {"wrong":"shape"}\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toEqual([]);
    expect(r.malformed).toHaveLength(1);
    expect(r.malformed[0].reason).toContain("fact schema");
  });

  it("T07 skill body missing pipe separator lands in malformed[]", () => {
    const src = `DREAM: skill: path=foo.md description-without-pipe\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toEqual([]);
    expect(r.malformed).toHaveLength(1);
    expect(r.malformed[0].reason).toContain("'|' separator");
  });

  it("T08 skill body with empty path lands in malformed[]", () => {
    const src = `DREAM: skill: path= | empty path here\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toEqual([]);
    expect(r.malformed).toHaveLength(1);
    expect(r.malformed[0].reason).toContain("path=<rel-path>");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADVERSARIAL — 3 cases
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamMarkerScannerEngine — adversarial inputs", () => {
  it("T09 non-string source throws TypeError immediately (defensive)", () => {
    expect(() => DreamMarkerScannerEngine.scan(undefined as unknown as string)).toThrow(TypeError);
    expect(() => DreamMarkerScannerEngine.scan(42 as unknown as string)).toThrow(TypeError);
    expect(() => DreamMarkerScannerEngine.scan({} as unknown as string)).toThrow(TypeError);
  });

  it("T10 fact with oversized value (>500 chars) lands in malformed[] via Zod max", () => {
    const huge = "x".repeat(501);
    const src = `DREAM: fact: {"type":"t","key":"k","value":${JSON.stringify(huge)}}\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toEqual([]);
    expect(r.malformed).toHaveLength(1);
    expect(r.malformed[0].reason).toContain("fact schema");
  });

  it("T11 fact JSON with __proto__ injection — Object.prototype stays clean and parsed body has no polluted key", () => {
    const before = Object.prototype.hasOwnProperty.call(Object.prototype, "polluted");
    expect(before).toBe(false);
    const src = `DREAM: fact: {"type":"t","key":"k","value":"v","__proto__":{"polluted":"YES_POLLUTED"}}\n`;
    const r = DreamMarkerScannerEngine.scan(src);
    // .strict() either accepts and strips OR rejects via malformed[]. Either path must NOT pollute Object.prototype.
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
    const probe: { polluted?: string } = {};
    expect(probe.polluted).not.toBe("YES_POLLUTED");
    if (r.markers.length > 0) {
      const fact = r.markers[0].body as Record<string, unknown>;
      expect(Object.keys(fact)).not.toContain("__proto__");
      expect(Object.keys(fact)).not.toContain("polluted");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VARIABILITY — 3 spans: multi-line, position-independent, markdown-bullet prefix
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamMarkerScannerEngine — variability", () => {
  it("T12 scans a multi-marker source (all 4 kinds in one file) and tracks line numbers", () => {
    const src = [
      "# A handoff",
      "DREAM: memory: be concise",
      "Random body line",
      "DREAM: user: prefer prose",
      "More noise",
      "DREAM: fact: {\"type\":\"pref\",\"key\":\"tone\",\"value\":\"casual\"}",
      "Final noise",
      "DREAM: skill: path=skills/a.md | description here",
      "",
    ].join("\n");
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(4);
    expect(r.markers.map((x: DreamMarker) => x.kind)).toEqual(["memory", "user", "fact", "skill"]);
    expect(r.markers.map((x: DreamMarker) => x.line)).toEqual([2, 4, 6, 8]);
    expect(r.total_lines_scanned).toBe(9);
  });

  it("T13 leading whitespace + markdown bullet prefix `- DREAM:` is accepted", () => {
    const src = [
      "- DREAM: memory: with bullet prefix",
      "  * DREAM: user: with indented asterisk bullet",
      "    DREAM: memory: with deep indent",
    ].join("\n");
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.malformed).toEqual([]);
    expect(r.markers).toHaveLength(3);
    expect(r.markers[0].body).toBe("with bullet prefix");
    expect(r.markers[1].body).toBe("with indented asterisk bullet");
    expect(r.markers[2].body).toBe("with deep indent");
  });

  it("T14 mixed valid + malformed markers — both buckets populated correctly", () => {
    const src = [
      "DREAM: memory: valid line 1",
      "DREAM: fact: {not json}",
      "DREAM: skill: path=x | desc",
      "DREAM: user: ",
      "DREAM: memory: valid line 5",
    ].join("\n");
    const r = DreamMarkerScannerEngine.scan(src);
    expect(r.markers).toHaveLength(3);
    expect(r.markers.map((x: DreamMarker) => x.line)).toEqual([1, 3, 5]);
    expect(r.malformed).toHaveLength(2);
    expect(r.malformed[0].line).toBe(2);
    expect(r.malformed[1].line).toBe(4);
    expect(r.malformed[1].reason).toContain("empty body");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSITION — markersToProposals → DreamArtifactBundleEngine.createBundle round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe("DreamMarkerScannerEngine — composition with DreamArtifactBundleEngine", () => {
  it("T15 markersToProposals produces valid Proposal[] consumable by createBundle (round-trip)", () => {
    const src = [
      "DREAM: memory: short and concrete updates",
      "DREAM: skill: path=skills/audit.md | nightly audit skill",
      "DREAM: fact: {\"type\":\"pref\",\"key\":\"tone\",\"value\":\"casual\"}",
    ].join("\n");
    const scan = DreamMarkerScannerEngine.scan(src);
    const proposals = DreamMarkerScannerEngine.markersToProposals(scan.markers, {
      slot_soul_path: "state/shared/slot-souls/bravo.md",
      skill_root: ".claude/commands",
      source_path: "state/shared/handoffs/HANDOFF-bravo-test.md",
    });
    expect(proposals).toHaveLength(3);
    expect(proposals.map((p) => p.risk_class).sort()).toEqual(["memory", "memory", "skill"]);
    expect(proposals.map((p) => p.mutation_type).sort()).toEqual(["append", "append", "write"]);

    const bundle = DreamArtifactBundleEngine.createBundle({
      artifact_id: "dr-marker-roundtrip",
      created_at: "2026-05-26T15:30:00.000Z",
      created_by: "claude-00569f88-bravo",
      source_summary: `scanned ${scan.markers.length} markers from HANDOFF-bravo-test.md`,
      proposals,
    });
    const valid = DreamArtifactBundleEngine.validateBundle(bundle);
    expect(valid.ok).toBe(true);
    expect(valid.errors).toEqual([]);
    expect(bundle.manifest.proposal_count).toBe(3);
  });

  it("T16 skill proposal target_path correctly composes skill_root + scanner path with leading-slash stripped", () => {
    const src = `DREAM: skill: path=/with/leading/slash.md | desc\n`;
    const scan = DreamMarkerScannerEngine.scan(src);
    const proposals = DreamMarkerScannerEngine.markersToProposals(scan.markers, {
      slot_soul_path: "state/shared/slot-souls/golf.md",
      skill_root: ".claude/commands",
      source_path: "transcript",
    });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].target_path).toBe(".claude/commands/with/leading/slash.md");
    expect(proposals[0].mutation_type).toBe("write");
    expect(proposals[0].risk_class).toBe("skill");
  });
});
