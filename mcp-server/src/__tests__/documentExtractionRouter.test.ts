/**
 * Tests for documentExtractionRouter -- the "apply document reading to its consumers" fan-out.
 * Reference-value + invariant (R9): kind-based eligibility (tool_code->tool-crib, material->speed/feed,
 * procedure/note->tribal), the tribal confirm-gate (commitment, blocks on below-floor entries), payloads,
 * summary identities, and totality on a malformed contract.
 *
 * @since U-XRAY-DOCUMENT-EXTRACT-ROUTER (2026-06-24, slot xray)
 */
import { describe, it, expect } from "vitest";
import {
  routeDocumentToConsumers,
  DOCUMENT_ROUTING_PLAN_VERSION,
  type DocumentRoutingPlan,
} from "../engines/blueprint-vision/documentExtractionRouter.js";
import {
  DOCUMENT_EXTRACTION_CONTRACT_VERSION,
  type DocumentExtractionContract,
  type DocEntry,
} from "../schemas/DocumentExtractionContract.js";

const TOTAL_CONSUMERS = 5; // tool_crib_lookup, speed_feed, tribal_capture, tool_catalog_lookup, material_price_lookup
const COMMITMENT = new Set(["tribal_capture"]);

function mkEntry(kind: string, value: string, needs_confirm = true): DocEntry {
  return { kind, value, confidence: needs_confirm ? 0.6 : 0.9, needs_confirm };
}
function mkDocContract(entries: DocEntry[] = [], doc_type = "office"): DocumentExtractionContract {
  const by_kind: Record<string, number> = {};
  for (const e of entries) by_kind[e.kind] = (by_kind[e.kind] ?? 0) + 1;
  return {
    schemaVersion: DOCUMENT_EXTRACTION_CONTRACT_VERSION,
    doc_type,
    entries,
    confirm_floor: 0.7,
    summary: { n_entries: entries.length, n_needs_confirm: entries.filter((e) => e.needs_confirm).length, by_kind },
  };
}
const routeById = (plan: DocumentRoutingPlan, id: string) => plan.routes.find((r) => r.consumer === id)!;

function assertInvariants(plan: DocumentRoutingPlan): void {
  expect(plan.schemaVersion).toBe(DOCUMENT_ROUTING_PLAN_VERSION);
  expect(plan.contract_version).toBe(DOCUMENT_EXTRACTION_CONTRACT_VERSION);
  expect(plan.summary.n_eligible).toBe(plan.summary.n_ready + plan.summary.n_blocked_on_confirm);
  expect(plan.summary.n_eligible + plan.summary.n_ineligible).toBe(TOTAL_CONSUMERS);
  for (const r of plan.routes) {
    if (r.requires_confirmation) {
      expect(COMMITMENT.has(r.consumer)).toBe(true);
      expect(r.eligible).toBe(true);
      expect(r.blocking_fields).toBeGreaterThan(0);
    }
    if (!COMMITMENT.has(r.consumer)) {
      expect(r.blocking_fields).toBe(0);
      expect(r.requires_confirmation).toBe(false);
    }
  }
}

describe("routeDocumentToConsumers -- office contract (tool codes + materials, regex sub-floor)", () => {
  const plan = routeDocumentToConsumers(
    mkDocContract([mkEntry("tool_code", "CNMG432"), mkEntry("material", "4140"), mkEntry("speed", "1200 rpm")]),
  );
  it("routes tool_crib_lookup + speed_feed (advisory, ready); tribal ineligible (no procedure/note)", () => {
    assertInvariants(plan);
    expect(plan.summary.n_eligible).toBe(4); // tool_crib+tool_catalog (tool_code), speed_feed+material_price (material)
    expect(plan.summary.n_ready).toBe(4); // all 4 advisory -> never gated even though entries are below floor
    expect(plan.summary.n_blocked_on_confirm).toBe(0);
    expect(plan.summary.n_ineligible).toBe(1); // tribal_capture (no procedure/note)
    expect(plan.summary.n_needs_confirm).toBe(3);
    expect(routeById(plan, "tribal_capture").eligible).toBe(false);
  });
  it("maps consumers to disk-verified dispatcher:action + carries kind-filtered payloads", () => {
    expect(routeById(plan, "tool_crib_lookup")).toMatchObject({ dispatcher: "prism_calc", action: "tool_crib_inventory", kind: "advisory" });
    expect(routeById(plan, "speed_feed")).toMatchObject({ dispatcher: "prism_product", action: "sfc_calculate", kind: "advisory" });
    expect(routeById(plan, "tribal_capture")).toMatchObject({ dispatcher: "prism_knowledge", action: "tribal_capture", kind: "commitment" });
    expect(routeById(plan, "tool_catalog_lookup")).toMatchObject({ dispatcher: "prism_calc", action: "tool_catalog_lookup", kind: "advisory" });
    expect(routeById(plan, "material_price_lookup")).toMatchObject({ dispatcher: "prism_business", action: "material_price_lookup", kind: "advisory" });
    expect(routeById(plan, "tool_crib_lookup").payload.tool_codes).toEqual(["CNMG432"]);
    expect(routeById(plan, "speed_feed").payload).toMatchObject({ materials: ["4140"], speeds: ["1200 rpm"] });
    expect(routeById(plan, "tool_catalog_lookup").payload.tool_codes).toEqual(["CNMG432"]);
    expect(routeById(plan, "material_price_lookup").payload.materials).toEqual(["4140"]);
  });
});

describe("routeDocumentToConsumers -- tribal confirm-gate (commitment)", () => {
  it("high-trust procedure/note -> tribal eligible + ready (not gated)", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("procedure", "deburr after milling", false)]));
    const t = routeById(plan, "tribal_capture");
    expect(t.eligible).toBe(true);
    expect(t.requires_confirmation).toBe(false);
    expect(t.blocking_fields).toBe(0);
    expect(t.payload.entries).toHaveLength(1);
    assertInvariants(plan);
  });
  it("below-floor procedure/note -> tribal eligible but BLOCKED on confirm (no corpus pollution)", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("procedure", "maybe deburr", true), mkEntry("note", "check fixture", true)]));
    const t = routeById(plan, "tribal_capture");
    expect(t.eligible).toBe(true);
    expect(t.requires_confirmation).toBe(true);
    expect(t.blocking_fields).toBe(2);
    expect(plan.summary.n_blocked_on_confirm).toBe(1);
    expect(plan.summary.n_ready).toBe(0);
    assertInvariants(plan);
  });
});

describe("routeDocumentToConsumers -- empty + includeIneligible + adversarial", () => {
  it("empty contract -> every consumer ineligible", () => {
    const plan = routeDocumentToConsumers(mkDocContract([]));
    expect(plan.summary).toEqual({ n_eligible: 0, n_ready: 0, n_blocked_on_confirm: 0, n_ineligible: 5, n_needs_confirm: 0 });
    assertInvariants(plan);
  });
  it("includeIneligible:false omits ineligible routes; summary still spans all consumers", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("material", "6061")]), { includeIneligible: false });
    expect(plan.routes.length).toBe(2); // material drives speed_feed + material_price_lookup
    expect(plan.routes.map((r) => r.consumer).sort()).toEqual(["material_price_lookup", "speed_feed"]);
    expect(plan.summary.n_ineligible).toBe(3);
  });
  it("preserves doc_type + is total on a malformed contract (never throws)", () => {
    const plan = routeDocumentToConsumers({ schemaVersion: DOCUMENT_EXTRACTION_CONTRACT_VERSION, doc_type: "catalog", entries: "nope" } as unknown as DocumentExtractionContract);
    expect(plan.doc_type).toBe("catalog");
    expect(plan.summary.n_eligible).toBe(0);
    expect(plan.summary.n_ineligible).toBe(5);
    expect(plan.summary.n_needs_confirm).toBe(0);
  });
  it("empty object falls back to default contract version + unknown doc_type", () => {
    const plan = routeDocumentToConsumers({} as unknown as DocumentExtractionContract);
    expect(plan.contract_version).toBe(DOCUMENT_EXTRACTION_CONTRACT_VERSION);
    expect(plan.doc_type).toBe("unknown");
    expect(plan.summary.n_ineligible).toBe(5);
  });
});

describe("routeDocumentToConsumers -- cross-galaxy consumers (U-XRAY-DOC-ROUTER-XGALAXY)", () => {
  it("tool_catalog_lookup: advisory, eligible on a tool_code, never gated; maps to prism_calc:tool_catalog_lookup", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("tool_code", "CNMG432")]));
    const r = routeById(plan, "tool_catalog_lookup");
    expect(r).toMatchObject({ dispatcher: "prism_calc", action: "tool_catalog_lookup", kind: "advisory", eligible: true, requires_confirmation: false });
    expect(r.payload.tool_codes).toEqual(["CNMG432"]);
  });
  it("material_price_lookup: advisory, eligible on a material; maps to prism_business:material_price_lookup", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("material", "4140")]));
    const r = routeById(plan, "material_price_lookup");
    expect(r).toMatchObject({ dispatcher: "prism_business", action: "material_price_lookup", kind: "advisory", eligible: true, requires_confirmation: false });
    expect(r.payload.materials).toEqual(["4140"]);
  });
  it("both ineligible when their entry kind is absent (procedure-only contract)", () => {
    const plan = routeDocumentToConsumers(mkDocContract([mkEntry("procedure", "deburr", false)]));
    expect(routeById(plan, "tool_catalog_lookup").eligible).toBe(false);
    expect(routeById(plan, "material_price_lookup").eligible).toBe(false);
  });
});
