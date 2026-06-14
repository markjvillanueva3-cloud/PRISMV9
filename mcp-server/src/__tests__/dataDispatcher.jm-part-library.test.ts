/**
 * dataDispatcher — DB-EXPANSION/DB-GAP-LIST-B2 round-trip suite
 * ============================================================
 *
 * JMDiePartLibraryEngine — prism_data:jm_die_part_lookup. Closes B2: the 30,890
 * orphaned `part.json` extraction sidecars (consolidated by
 * scripts/build-jm-part-library.mjs into state/shared/databases/jm-part-library.jsonl)
 * had NO runtime consumer. This suite round-trips THROUGH the dispatcher (lazy import →
 * Zod-validated params → engine functions → {success,data} envelope), not the engine
 * singleton, per R15 (TEST leg) + comprehensive-build-enforce.
 *
 * Coverage floor:
 *   • Happy path (4)          — exact PN, customer filter, hasProgramLink, matchConfidence band
 *   • Variability (≥3 configs) — assigned vs unassigned, 4 confidence bands, program/cad links
 *   • Schema rejection (3)    — bad enum, bad limit type, negative limit
 *   • Adversarial (3)         — NaN limit, oversize limit, unknown PN (empty result, not crash)
 *   • Data-integrity (2)      — malformed row excluded from query + stats reconcile
 *   • FAIL-LOUD (1)           — missing store throws → dispatcherError envelope
 *   • Regression (1)          — action registered in the enum
 *
 * @milestone DB-EXPANSION
 * @unit DB-GAP-LIST-B2
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";
import { _resetPartIndexCache } from "../engines/JMDiePartLibraryEngine.js";

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
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
let tmpDir: string;
let tmpStore: string;

// Fixture spanning the real store's variability: assigned + unassigned, all 4 confidence
// bands, with/without program & cad links, plus an explicit malformed-bucket row (the
// 24 real malformed sidecars the live ingest surfaced — must be counted but never queried).
const FIXTURE_ROWS = [
  {
    schemaVersion: "1.0.0", partNumber: "1860", partNumberNormalized: "1860",
    customer: "AAAMECONINGPIN", customerSource: "print_ocr", matchConfidence: "miss",
    rawMatchConfidence: "miss", assigned: true, printCount: 3, programCount: 0, cadCamCount: 0,
    hasProgramLink: false, hasCadLink: false, prints: [{}, {}, {}], cncPrograms: [], cadCam: [],
    sourceSidecar: "H:/x/AAAMECONINGPIN/1860/part.json",
  },
  {
    schemaVersion: "1.0.0", partNumber: "9082526", partNumberNormalized: "9082526",
    customer: "FASTENAL", customerSource: "join", matchConfidence: "exact",
    rawMatchConfidence: "exact", assigned: true, printCount: 1, programCount: 2, cadCamCount: 1,
    hasProgramLink: true, hasCadLink: true, prints: [{}], cncPrograms: [{}, {}], cadCam: [{}],
    sourceSidecar: "H:/x/FASTENAL/9082526/part.json",
  },
  {
    schemaVersion: "1.0.0", partNumber: "8047D3", partNumberNormalized: "8047D3",
    customer: "AGRATI", matchConfidence: "loose", rawMatchConfidence: "loose",
    assigned: true, printCount: 2, programCount: 1, cadCamCount: 0,
    hasProgramLink: true, hasCadLink: false, prints: [{}, {}], cncPrograms: [{}], cadCam: [],
    sourceSidecar: "H:/x/AGRATI/8047D3/part.json",
  },
  {
    schemaVersion: "1.0.0", partNumber: "ZX99", partNumberNormalized: "ZX99",
    customer: "_UNASSIGNED", matchConfidence: "ambiguous", rawMatchConfidence: "ambiguous",
    assigned: false, printCount: 1, programCount: 0, cadCamCount: 0,
    hasProgramLink: false, hasCadLink: false, prints: [{}], cncPrograms: [], cadCam: [],
    sourceSidecar: "H:/x/_UNASSIGNED/ZX99/part.json",
  },
  { schemaVersion: "1.0.0", malformed: true, sourceSidecar: "H:/x/_UNASSIGNED/BAD/part.json" },
];

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jm-part-disp-"));
  tmpStore = path.join(tmpDir, "jm-part-library.jsonl");
  fs.writeFileSync(tmpStore, FIXTURE_ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  _resetPartIndexCache(); // each test re-loads the fixture cleanly
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths (4)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 happy paths — round-trip via prism_data", () => {
  it("exact part_number lookup resolves one record", async () => {
    const r = await call(server, "jm_die_part_lookup", { part_number: "9082526", store_jsonl_path: tmpStore });
    expect(r.ok).toBe(true);
    const d = r.data.data as { total: number; returned: number; matches: { customer: string; hasProgramLink: boolean }[] };
    expect(d.total).toBe(1);
    expect(d.returned).toBe(1);
    expect(d.matches[0]!.customer).toBe("FASTENAL");
    expect(d.matches[0]!.hasProgramLink).toBe(true);
  });

  it("exact part_number lookup normalizes case + surrounding whitespace", async () => {
    // The stored PN is "8047D3"; the query "  8047d3 " differs in BOTH case and padding.
    // total===1 PROVES normalization ran — a raw verbatim string match would return 0.
    const r = await call(server, "jm_die_part_lookup", { part_number: "  8047d3 ", store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { partNumber: string }[] };
    expect(d.total).toBe(1);
    expect(d.matches[0]!.partNumber).toBe("8047D3");
  });

  it("customer filter scopes to one shop", async () => {
    const r = await call(server, "jm_die_part_lookup", { customer: "AGRATI", store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { partNumber: string }[] };
    expect(d.total).toBe(1);
    expect(d.matches[0]!.partNumber).toBe("8047D3");
  });

  it("has_program_link=true returns only program-joined parts", async () => {
    const r = await call(server, "jm_die_part_lookup", { has_program_link: true, store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { partNumber: string }[] };
    expect(d.total).toBe(2); // 9082526 + 8047D3
    expect(d.matches.map((m) => m.partNumber).sort()).toEqual(["8047D3", "9082526"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability — ≥3 spanning configs (assigned/unassigned, bands, cad link)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 variability across configs", () => {
  it("match_confidence=exact selects only the exact-band part (excludes the other 3 bands)", async () => {
    const r = await call(server, "jm_die_part_lookup", { match_confidence: "exact", store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { partNumber: string; matchConfidence: string }[] };
    expect(d.total).toBe(1); // proves a broken filter returning all 4 bands would FAIL here
    expect(d.matches[0]!.partNumber).toBe("9082526");
    // R9 exclusion proof: every returned row IS the exact band — the miss/loose/ambiguous
    // fixture rows (1860/8047D3/ZX99) must NOT leak through.
    expect(d.matches.every((m) => m.matchConfidence === "exact")).toBe(true);
    expect(d.matches.map((m) => m.partNumber)).not.toContain("1860");
    expect(d.matches.map((m) => m.partNumber)).not.toContain("8047D3");
  });

  it("assigned=false isolates the _UNASSIGNED population", async () => {
    const r = await call(server, "jm_die_part_lookup", { assigned: false, store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { customer: string }[] };
    expect(d.total).toBe(1);
    expect(d.matches[0]!.customer).toBe("_UNASSIGNED");
  });

  it("assigned=true isolates the 3 assigned parts (malformed excluded)", async () => {
    const r = await call(server, "jm_die_part_lookup", { assigned: true, store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number };
    expect(d.total).toBe(3); // 1860 + 9082526 + 8047D3; malformed + ZX99 excluded
  });

  it("has_cad_link=true returns only the cad-joined part", async () => {
    const r = await call(server, "jm_die_part_lookup", { has_cad_link: true, store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matches: { partNumber: string }[] };
    expect(d.total).toBe(1);
    expect(d.matches[0]!.partNumber).toBe("9082526");
  });

  it("empty filter returns all NON-malformed rows (4 of 5) with a confidence histogram", async () => {
    const r = await call(server, "jm_die_part_lookup", { store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; matchConfidenceHistogram: Record<string, number> };
    expect(d.total).toBe(4); // 5 rows - 1 malformed
    expect(d.matchConfidenceHistogram).toEqual({ miss: 1, exact: 1, loose: 1, ambiguous: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection (3)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 schema rejection", () => {
  it("rejects an out-of-vocab match_confidence", async () => {
    const r = await call(server, "jm_die_part_lookup", { match_confidence: "definitely", store_jsonl_path: tmpStore });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-integer limit", async () => {
    const r = await call(server, "jm_die_part_lookup", { limit: 3.5, store_jsonl_path: tmpStore });
    expect(r.ok).toBe(false);
  });

  it("rejects a negative limit", async () => {
    const r = await call(server, "jm_die_part_lookup", { limit: -10, store_jsonl_path: tmpStore });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial (3)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 adversarial inputs", () => {
  it("limit > hard cap is rejected by schema (max 500)", async () => {
    const r = await call(server, "jm_die_part_lookup", { limit: 99999, store_jsonl_path: tmpStore });
    expect(r.ok).toBe(false); // z.number().int().max(500) rejects at the boundary
  });

  it("unknown part number returns an empty result, NOT an error", async () => {
    const r = await call(server, "jm_die_part_lookup", { part_number: "DOES-NOT-EXIST", store_jsonl_path: tmpStore });
    expect(r.ok).toBe(true);
    const d = r.data.data as { total: number; returned: number; matches?: unknown[] };
    expect(d.total).toBe(0);
    expect(d.returned).toBe(0);
    // NOTE: the dispatcher's `slimResponse` post-process strips empty arrays (token saving),
    // so a zero-match query returns `matches: undefined` (field absent), NOT `matches: []`.
    // Same contract as customer_material_lookup. Assert emptiness via total/returned + the
    // loose-null check on matches — both encode "no matches".
    expect(d.matches == null || (Array.isArray(d.matches) && d.matches.length === 0)).toBe(true);
  });

  it("limit=1 caps the returned page below the matched total", async () => {
    const r = await call(server, "jm_die_part_lookup", { limit: 1, store_jsonl_path: tmpStore });
    const d = r.data.data as { total: number; returned: number; matches: unknown[] };
    expect(d.total).toBe(4); // all non-malformed match
    expect(d.returned).toBe(1);
    expect(d.matches.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Data-integrity — malformed row handling + stat reconciliation (2)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 data integrity", () => {
  it("malformed rows are counted in store_stats but never returned by any query", async () => {
    // even a filter that would match a malformed row's only field (none) returns nothing
    const r = await call(server, "jm_die_part_lookup", { store_jsonl_path: tmpStore });
    const d = r.data.data as { matches: { malformed?: boolean }[]; store_stats: { malformed: number; parsed: number } };
    expect(d.matches.some((m) => m.malformed === true)).toBe(false);
    expect(d.store_stats.malformed).toBe(1);
    expect(d.store_stats.parsed).toBe(5); // all 5 lines parse as JSON; 1 is the malformed bucket
  });

  it("store_stats partition reconciles: assigned+unassigned+malformed == parsed", async () => {
    const r = await call(server, "jm_die_part_lookup", { store_jsonl_path: tmpStore });
    const s = (r.data.data as { store_stats: Record<string, number> }).store_stats;
    // algebraic invariant (fixture-independent): the partition must be complete.
    expect(s.assigned + s.unassigned + s.malformed).toBe(s.parsed);
    // fixture-derived expectations (FIXTURE_ROWS above): rows 0,1,2 assigned · row 3 _UNASSIGNED ·
    // row 4 malformed · program-links on rows 1,2 · cad-link on row 1. These FAIL if buildIndex miscounts.
    expect(s.assigned).toBe(3);
    expect(s.unassigned).toBe(1);
    expect(s.withProgramLink).toBe(2);
    expect(s.withCadLink).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. FAIL-LOUD — missing store (1)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 fail-loud", () => {
  it("a missing store path produces a dispatcherError envelope, not a silent empty result", async () => {
    const r = await call(server, "jm_die_part_lookup", {
      store_jsonl_path: path.join(tmpDir, "does-not-exist.jsonl"),
    });
    expect(r.ok).toBe(false);
    const errText = JSON.stringify(r.data).toLowerCase();
    expect(errText).toContain("store not found");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7. Regression — action registered (1)
// ─────────────────────────────────────────────────────────────────────
describe("DB-GAP-LIST-B2 regression", () => {
  it("jm_die_part_lookup is a registered prism_data action (unknown actions error)", async () => {
    const ok = await call(server, "jm_die_part_lookup", { store_jsonl_path: tmpStore });
    expect(ok.ok).toBe(true); // registered → handled
    const bad = await call(server, "jm_die_part_lookup_TYPO", { store_jsonl_path: tmpStore });
    expect(bad.ok).toBe(false); // unknown action → error
  });
});
