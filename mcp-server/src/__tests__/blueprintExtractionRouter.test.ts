/**
 * Tests for blueprintExtractionRouter -- the "apply extraction to ALL prism features" fan-out.
 *
 * Reference-value + invariant tests (R9 -- a test must FAIL when the routing logic changes):
 *  - eligibility per consumer is exercised against the EXACT field it depends on
 *  - the commitment-consumer confirm-gate (quote/program/inspection) blocks on a below-floor field
 *  - advisory/privacy consumers NEVER confirm-gate
 *  - summary identities hold across every fixture
 *  - the router is total (never throws) on a malformed contract
 *
 * @since U-XRAY-EXTRACT-CONSUMER-ROUTER (2026-06-24, slot xray)
 */
import { describe, it, expect } from "vitest";
import {
  routeExtractionToConsumers,
  BLUEPRINT_ROUTING_PLAN_VERSION,
  type ExtractionRoutingPlan,
} from "../engines/blueprint-vision/blueprintExtractionRouter.js";
import {
  BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
  type BlueprintExtractionContract,
  type ContractDimension,
  type ContractCallout,
} from "../schemas/BlueprintExtractionContract.js";

// the full consumer set (a deliberate consumer add updates this -- R9 intent, not a brittle count)
// 7 core + 4 machining-prep + 3 quality (fai_run/spc_calculate/cmm_plan_path) + 2 business (material_price_lookup/job_create)
// + 4 gap-close (smart_tool_select/stock_allowance/lathe_workholding/setup_sheet, U-XRAY-EXTRACT-ROUTER-GAP-CLOSE)
const TOTAL_CONSUMERS = 20;
const COMMITMENT = new Set(["quote", "print_to_program", "inspection_plan", "fai_run", "cmm_plan_path"]);

function mkDim(value_mm: number, needs_confirm = false): ContractDimension {
  return {
    value_mm,
    type: "linear",
    confidence: needs_confirm ? 0.4 : 0.95,
    needs_confirm,
    status: needs_confirm ? "singleton" : "corroborated",
    hallucination_candidate: false,
  };
}
function mkCallout(value: string, needs_confirm = false): ContractCallout {
  return { value, confidence: needs_confirm ? 0.4 : 0.95, needs_confirm, hallucination_candidate: false };
}

function mkContract(over: Partial<BlueprintExtractionContract> = {}): BlueprintExtractionContract {
  const dimensions = over.dimensions ?? [];
  const gdt = over.gdt ?? [];
  const notes = over.notes ?? [];
  const profiles = over.profiles ?? [];
  const surface_finishes = over.surface_finishes ?? [];
  const allCallouts = [...gdt, ...notes, ...profiles, ...surface_finishes];
  const n_needs_confirm =
    dimensions.filter((d) => d.needs_confirm).length + allCallouts.filter((c) => c.needs_confirm).length;
  return {
    schemaVersion: BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
    units: "mm",
    dimensions,
    gdt,
    notes,
    profiles,
    surface_finishes,
    confirm_floor: 0.7,
    summary: {
      n_dimensions: dimensions.length,
      n_needs_confirm,
      n_corroborated: dimensions.filter((d) => d.status === "corroborated").length,
      n_gdt: gdt.length,
      n_notes: notes.length,
      n_profiles: profiles.length,
      n_surface_finishes: surface_finishes.length,
      n_models: 2,
    },
    ...over,
  };
}

const routeById = (plan: ExtractionRoutingPlan, id: string) => plan.routes.find((r) => r.consumer === id)!;

/** invariants that MUST hold for any plan (property-style). */
function assertInvariants(plan: ExtractionRoutingPlan, expectTotalRoutes = TOTAL_CONSUMERS): void {
  expect(plan.schemaVersion).toBe(BLUEPRINT_ROUTING_PLAN_VERSION);
  expect(plan.contract_version).toBe(BLUEPRINT_EXTRACTION_CONTRACT_VERSION);
  expect(plan.routes.length).toBe(expectTotalRoutes);
  // eligible = ready + blocked
  expect(plan.summary.n_eligible).toBe(plan.summary.n_ready + plan.summary.n_blocked_on_confirm);
  // eligible + ineligible = full consumer set (summary is over ALL consumers regardless of includeIneligible)
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

describe("routeExtractionToConsumers — full high-trust contract", () => {
  const plan = routeExtractionToConsumers(
    mkContract({
      dimensions: [mkDim(12.7), mkDim(25.4)],
      gdt: [mkCallout("|POS|0.05|A|")],
      title_block: { customer: "SEMBLEX", material: "4140 steel" },
    }),
  );

  it("routes every consumer as eligible + ready (nothing below the confirm floor)", () => {
    assertInvariants(plan);
    expect(plan.summary).toEqual({
      n_eligible: 20,
      n_ready: 20,
      n_blocked_on_confirm: 0,
      n_ineligible: 0,
      n_needs_confirm: 0,
    });
  });

  it("maps each consumer to its disk-verified dispatcher + action", () => {
    expect(routeById(plan, "quote")).toMatchObject({ dispatcher: "prism_business", action: "blueprint_to_quote", kind: "commitment" });
    expect(routeById(plan, "print_to_program")).toMatchObject({ dispatcher: "prism_cam", action: "print_to_program_full" });
    expect(routeById(plan, "inspection_plan")).toMatchObject({ dispatcher: "prism_quality", action: "blueprint_inspection_plan" });
    expect(routeById(plan, "feature_recognize")).toMatchObject({ dispatcher: "prism_cad", action: "feature_recognize", kind: "advisory" });
    expect(routeById(plan, "cad_reconstruct")).toMatchObject({ dispatcher: "prism_cad", action: "blueprint_to_all_cads" });
    expect(routeById(plan, "material_resolve")).toMatchObject({ dispatcher: "prism_business", action: "blueprint_resolve_material" });
    expect(routeById(plan, "redact")).toMatchObject({ dispatcher: "prism_cad", action: "blueprint_redact", kind: "privacy" });
    // machining-prep chain (all advisory)
    expect(routeById(plan, "stock_optimize")).toMatchObject({ dispatcher: "prism_business", action: "stock_size_optimize", kind: "advisory" });
    expect(routeById(plan, "fixture_design")).toMatchObject({ dispatcher: "prism_calc", action: "fixture_design_recommend", kind: "advisory" });
    expect(routeById(plan, "tool_select")).toMatchObject({ dispatcher: "prism_calc", action: "tool_select_recommend", kind: "advisory" });
    expect(routeById(plan, "speed_feed")).toMatchObject({ dispatcher: "prism_product", action: "sfc_calculate", kind: "advisory" });
    // quality chain
    expect(routeById(plan, "fai_run")).toMatchObject({ dispatcher: "prism_quality", action: "fai_run", kind: "commitment" });
    expect(routeById(plan, "spc_calculate")).toMatchObject({ dispatcher: "prism_quality", action: "spc_calculate", kind: "advisory" });
    // business chain (advisory)
    expect(routeById(plan, "material_price_lookup")).toMatchObject({ dispatcher: "prism_business", action: "material_price_lookup", kind: "advisory" });
    expect(routeById(plan, "job_create")).toMatchObject({ dispatcher: "prism_business", action: "job_create", kind: "advisory" });
    expect(routeById(plan, "cmm_plan_path")).toMatchObject({ dispatcher: "prism_calc", action: "cmm_plan_path", kind: "commitment" });
    // gap-close chain (all advisory, disk-verified 2026-06-24)
    expect(routeById(plan, "smart_tool_select")).toMatchObject({ dispatcher: "prism_cam", action: "smart_tool_select", kind: "advisory" });
    expect(routeById(plan, "stock_allowance")).toMatchObject({ dispatcher: "prism_calc", action: "stock_allowance", kind: "advisory" });
    expect(routeById(plan, "lathe_workholding")).toMatchObject({ dispatcher: "prism_turning", action: "lathe_workholding_select_jaw", kind: "advisory" });
    expect(routeById(plan, "setup_sheet")).toMatchObject({ dispatcher: "prism_cam", action: "setup_sheet_generate", kind: "advisory" });
  });

  it("redact is eligible (title-block customer); reason names the FIELD PATH not the cleartext value; payload auto-delivers the redacted extraction", () => {
    const redact = routeById(plan, "redact");
    expect(redact.eligible).toBe(true);
    expect(redact.kind).toBe("privacy");
    expect(redact.requires_confirmation).toBe(false); // privacy never confirm-gates
    // the operator-facing reason names the masked field PATH, NOT the customer name (the plan must not echo PII)
    expect(redact.reason).toContain("title_block.customer");
    expect(redact.reason).not.toContain("SEMBLEX");
    // the payload AUTO-DELIVERS the redacted extraction: customer masked, material (non-PII) preserved,
    // numeric structure untouched -- redaction is automatic, no second blueprint_redact call required.
    const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
    expect(red).toBeTruthy();
    expect((red.title_block as Record<string, unknown>).customer).toBe("[REDACTED]");
    expect((red.title_block as Record<string, unknown>).material).toBe("4140 steel");
    expect(red.dimensions.length).toBe(2);
    expect(red.dimensions[0].value_mm).toBe(12.7); // numbers pass through redaction unchanged
    expect(redact.payload.pii_fields as string[]).toContain("title_block.customer");
    expect(redact.payload.n_redactions).toBe(1);
  });

  it("commitment payloads carry the contract dimensions + material", () => {
    const quote = routeById(plan, "quote");
    expect((quote.payload.dimensions as ContractDimension[]).length).toBe(2);
    expect(quote.payload.material).toBe("4140 steel");
  });
});

describe("routeExtractionToConsumers — confirm-gate on below-floor dimensions", () => {
  // 3 dims ALL below floor, 1 GD&T below floor -> n_needs_confirm = 4
  const plan = routeExtractionToConsumers(
    mkContract({
      dimensions: [mkDim(1, true), mkDim(2, true), mkDim(3, true)],
      gdt: [mkCallout("|FLAT|0.1|", true)],
      title_block: { customer: "TOPURA", material: "6061-T6" },
    }),
  );

  it("blocks the 3 commitment consumers on operator-confirm; advisory/privacy stay ready", () => {
    assertInvariants(plan);
    expect(plan.summary.n_eligible).toBe(20); // all eligible (dims + customer + material present)
    expect(plan.summary.n_blocked_on_confirm).toBe(5); // quote, print_to_program, inspection_plan, fai_run, cmm_plan_path
    expect(plan.summary.n_ready).toBe(15); // 5 core advisory/privacy + 4 machining-prep + spc + 2 business + 4 gap-close
    expect(plan.summary.n_needs_confirm).toBe(4);
    expect(routeById(plan, "fai_run").requires_confirmation).toBe(true); // AS9102 form gates on unconfirmed chars
    expect(routeById(plan, "fai_run").blocking_fields).toBe(4); // 3 dims + 1 gd&t
    expect(routeById(plan, "cmm_plan_path").requires_confirmation).toBe(true); // CMM probes unconfirmed chars
    expect(routeById(plan, "cmm_plan_path").blocking_fields).toBe(4); // 3 dims + 1 gd&t
    expect(routeById(plan, "spc_calculate").requires_confirmation).toBe(false); // advisory analysis
  });

  it("quote + program block on the 3 unconfirmed dimensions", () => {
    for (const id of ["quote", "print_to_program"]) {
      const r = routeById(plan, id);
      expect(r.requires_confirmation).toBe(true);
      expect(r.blocking_fields).toBe(3);
    }
  });

  it("inspection blocks on dims AND gd&t (3 + 1 = 4)", () => {
    const insp = routeById(plan, "inspection_plan");
    expect(insp.requires_confirmation).toBe(true);
    expect(insp.blocking_fields).toBe(4);
  });

  it("advisory feature_recognize is eligible but never confirm-gated even with unconfirmed dims", () => {
    const fr = routeById(plan, "feature_recognize");
    expect(fr.eligible).toBe(true);
    expect(fr.requires_confirmation).toBe(false);
    expect(fr.blocking_fields).toBe(0);
  });
});

describe("routeExtractionToConsumers — empty contract (nothing extracted)", () => {
  const plan = routeExtractionToConsumers(mkContract({}));
  it("marks every consumer ineligible", () => {
    assertInvariants(plan);
    expect(plan.summary).toEqual({
      n_eligible: 0,
      n_ready: 0,
      n_blocked_on_confirm: 0,
      n_ineligible: 20,
      n_needs_confirm: 0,
    });
  });
});

describe("routeExtractionToConsumers — GD&T-only (no dimensions)", () => {
  const plan = routeExtractionToConsumers(mkContract({ gdt: [mkCallout("|POS|0.02|A|B|")] }));
  it("only inspection_plan is eligible (GD&T drives inspection); dim-dependent consumers are not", () => {
    assertInvariants(plan);
    // GD&T drives BOTH inspection_plan and fai_run (the AS9102 form records GD&T characteristics)
    expect(routeById(plan, "inspection_plan").eligible).toBe(true);
    expect(routeById(plan, "inspection_plan").requires_confirmation).toBe(false); // gd&t is above floor
    expect(routeById(plan, "fai_run").eligible).toBe(true);
    expect(routeById(plan, "fai_run").requires_confirmation).toBe(false); // gd&t above floor
    expect(routeById(plan, "cmm_plan_path").eligible).toBe(true); // CMM also driven by GD&T
    expect(routeById(plan, "cmm_plan_path").requires_confirmation).toBe(false); // gd&t above floor
    // everything else needs dims (machining-prep + feature/cad/quote/program + spc) or material/customer -> ineligible
    for (const id of ["quote", "print_to_program", "feature_recognize", "cad_reconstruct", "redact", "material_resolve",
      "stock_optimize", "fixture_design", "tool_select", "speed_feed", "spc_calculate", "material_price_lookup", "job_create",
      "smart_tool_select", "stock_allowance", "lathe_workholding", "setup_sheet"]) {
      expect(routeById(plan, id).eligible).toBe(false);
    }
    expect(plan.summary.n_eligible).toBe(3);
  });
});

describe("routeExtractionToConsumers — material-only quote path (no dimensions)", () => {
  const plan = routeExtractionToConsumers(mkContract({ title_block: { material: "A2 tool steel" } }));
  it("quote is eligible via material even with zero dimensions, and not confirm-gated (no dims to confirm)", () => {
    const quote = routeById(plan, "quote");
    expect(quote.eligible).toBe(true);
    expect(quote.reason).toContain("A2 tool steel");
    expect(quote.requires_confirmation).toBe(false);
    expect(quote.blocking_fields).toBe(0);
    // material present -> material_resolve + speed_feed eligible; no customer -> redact ineligible;
    // no dims -> program + the envelope-driven prep (stock/fixture/tool) ineligible
    expect(routeById(plan, "material_resolve").eligible).toBe(true);
    expect(routeById(plan, "speed_feed").eligible).toBe(true); // speeds/feeds need only the material
    expect(routeById(plan, "material_price_lookup").eligible).toBe(true); // price lookup needs only the material
    expect(routeById(plan, "job_create").eligible).toBe(true); // a job can be seeded from material alone
    expect(routeById(plan, "redact").eligible).toBe(false);
    expect(routeById(plan, "print_to_program").eligible).toBe(false);
    for (const id of ["stock_optimize", "fixture_design", "tool_select", "fai_run", "spc_calculate", "cmm_plan_path",
      "smart_tool_select", "stock_allowance", "lathe_workholding", "setup_sheet"]) {
      expect(routeById(plan, id).eligible).toBe(false); // these need dims/gd&t, absent here
    }
    assertInvariants(plan);
  });
});

describe("routeExtractionToConsumers — includeIneligible:false", () => {
  const contract = mkContract({ gdt: [mkCallout("|POS|0.02|A|")] }); // only inspection eligible
  it("omits ineligible routes but the summary still counts the full consumer set", () => {
    const plan = routeExtractionToConsumers(contract, { includeIneligible: false });
    expect(plan.routes.length).toBe(3); // inspection_plan + fai_run + cmm_plan_path are all GD&T-driven
    expect(plan.routes.map((r) => r.consumer).sort()).toEqual(["cmm_plan_path", "fai_run", "inspection_plan"]);
    expect(plan.summary.n_eligible).toBe(3);
    expect(plan.summary.n_ineligible).toBe(17); // summary spans ALL consumers, not just the returned routes
  });
});

describe("routeExtractionToConsumers — adversarial / defensive (never throws)", () => {
  it("a malformed contract (non-array fields, no summary) routes to all-ineligible without throwing", () => {
    const garbage = {
      schemaVersion: BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
      dimensions: "not-an-array",
      gdt: null,
      title_block: 42,
    } as unknown as BlueprintExtractionContract;
    const plan = routeExtractionToConsumers(garbage);
    expect(plan.summary.n_eligible).toBe(0);
    expect(plan.summary.n_ineligible).toBe(20);
    expect(plan.summary.n_needs_confirm).toBe(0); // missing arrays -> recomputed 0
    expect(plan.routes.length).toBe(20);
  });

  it("an empty object falls back to the default contract version (drift trip-wire still set)", () => {
    const plan = routeExtractionToConsumers({} as unknown as BlueprintExtractionContract);
    expect(plan.contract_version).toBe(BLUEPRINT_EXTRACTION_CONTRACT_VERSION);
    expect(plan.summary.n_ineligible).toBe(20);
  });

  it("a whitespace-only customer/material is treated as absent (not a false PII/quote signal)", () => {
    const plan = routeExtractionToConsumers(
      mkContract({ dimensions: [mkDim(5)], title_block: { customer: "   ", material: "  " } }),
    );
    expect(routeById(plan, "redact").eligible).toBe(false); // blank customer != PII
    // quote still eligible via the dimension, not the blank material
    const quote = routeById(plan, "quote");
    expect(quote.eligible).toBe(true);
    expect(quote.payload.material).toBeUndefined();
  });
});

describe("routeExtractionToConsumers — gap-close consumers (U-XRAY-EXTRACT-ROUTER-GAP-CLOSE)", () => {
  const GAP_CLOSE = ["smart_tool_select", "stock_allowance", "lathe_workholding", "setup_sheet"] as const;

  it("all 4 are advisory, eligible on a single dimension, and never confirm-gated even below floor", () => {
    const plan = routeExtractionToConsumers(mkContract({ dimensions: [mkDim(8, true)] })); // below-floor dim
    for (const id of GAP_CLOSE) {
      const r = routeById(plan, id);
      expect(r.kind).toBe("advisory");
      expect(r.eligible).toBe(true); // dims > 0
      expect(r.requires_confirmation).toBe(false); // advisory never gates on the unconfirmed dim
      expect(r.blocking_fields).toBe(0);
    }
  });

  it("all 4 are ineligible with zero dimensions (the part envelope is the substance they consume)", () => {
    // GD&T + a material title-block present, but NO dimensions -> all 4 dim-driven gap-close consumers ineligible
    const plan = routeExtractionToConsumers(mkContract({ gdt: [mkCallout("|POS|0.02|A|")], title_block: { material: "4140" } }));
    for (const id of GAP_CLOSE) {
      expect(routeById(plan, id).eligible).toBe(false);
    }
  });

  it("maps each gap-close consumer to its disk-verified dispatcher:action", () => {
    const plan = routeExtractionToConsumers(mkContract({ dimensions: [mkDim(10)] }));
    expect(routeById(plan, "smart_tool_select")).toMatchObject({ dispatcher: "prism_cam", action: "smart_tool_select" });
    expect(routeById(plan, "stock_allowance")).toMatchObject({ dispatcher: "prism_calc", action: "stock_allowance" });
    expect(routeById(plan, "lathe_workholding")).toMatchObject({ dispatcher: "prism_turning", action: "lathe_workholding_select_jaw" });
    expect(routeById(plan, "setup_sheet")).toMatchObject({ dispatcher: "prism_cam", action: "setup_sheet_generate" });
  });

  it("stock_allowance payload carries profiles + gd&t (not just dims); setup_sheet carries the title-block", () => {
    const plan = routeExtractionToConsumers(
      mkContract({
        dimensions: [mkDim(10)],
        profiles: [mkCallout("PROFILE 0.1 A")],
        gdt: [mkCallout("|POS|0.02|A|")],
        title_block: { material: "4140", customer: "ACME" },
      }),
    );
    const sa = routeById(plan, "stock_allowance");
    expect((sa.payload.profiles as ContractCallout[]).length).toBe(1);
    expect((sa.payload.gdt as ContractCallout[]).length).toBe(1);
    expect(routeById(plan, "setup_sheet").payload.title_block).toBeTruthy();
  });
});

describe("routeExtractionToConsumers — comprehensive PII detection (U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII)", () => {
  // the prior eligibility was Boolean(title_block.customer) -- these prove the privacy false-negatives it
  // missed (PII in a note / the source path / a non-customer identity field) are now caught + auto-redacted.
  const redactOf = (over: Partial<BlueprintExtractionContract>) =>
    routeById(routeExtractionToConsumers(mkContract(over)), "redact");

  it("REGRESSION: PII only in a NOTE (no title_block.customer) is now eligible (was a privacy false-negative)", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], notes: [mkCallout("MADE FOR SEMBLEX CORP")] });
    expect(redact.eligible).toBe(true);
    expect(redact.reason).toContain("notes[0].value");
    expect(redact.reason).not.toContain("SEMBLEX"); // path named, value not leaked
    const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
    expect(red.notes[0].value).toContain("[REDACTED]");
    expect(red.notes[0].value).not.toContain("SEMBLEX");
  });

  it("REGRESSION: PII only in the `source` print PATH (no title-block) is now eligible", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], source: "uploads/ITW/D-12345.pdf" });
    expect(redact.eligible).toBe(true);
    expect(redact.reason).toContain("source");
    const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
    expect(red.source).toContain("[REDACTED]"); // ITW (customer) + D-12345 (part number) masked in the path
    expect(red.source).not.toContain("ITW");
  });

  it("REGRESSION: PII in a NON-customer title-block identity field (part_number) is now eligible + masked wholesale", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], title_block: { part_number: "ABC-9981", material: "4140" } });
    expect(redact.eligible).toBe(true);
    expect(redact.reason).toContain("title_block.part_number");
    const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
    expect((red.title_block as Record<string, unknown>).part_number).toBe("[REDACTED]"); // identity field masked
    expect((red.title_block as Record<string, unknown>).material).toBe("4140"); // material preserved (non-PII)
  });

  it("PII in an arbitrary catchall identity key (work_order) is caught", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], title_block: { material: "4140", work_order: "WO-77123" } });
    expect(redact.eligible).toBe(true);
    const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
    expect((red.title_block as Record<string, unknown>).work_order).toBe("[REDACTED]");
  });

  it("NO over-redaction: a legit 'ACME THREAD 1/2-13' note (ACME = common drawing word) does NOT false-flag", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], notes: [mkCallout("ACME THREAD 1/2-13")] });
    expect(redact.eligible).toBe(false); // no genuine PII -> nothing to redact
    expect(redact.reason).toContain("no customer-identity");
    expect(redact.payload.n_redactions).toBe(0);
  });

  it("a clean part (no customer-identity / part-number anywhere) -> redact ineligible", () => {
    const redact = redactOf({ dimensions: [mkDim(5)], notes: [mkCallout("DEBURR ALL EDGES")], title_block: { material: "6061-T6" } });
    expect(redact.eligible).toBe(false);
    expect(redact.payload.n_redactions).toBe(0);
  });

  it("NO over-redaction (P1 scrutiny): a hyphenated material grade (AISI-1045) is NOT mistaken for a part number -> redact ineligible + material preserved", () => {
    // "AISI-1045" matches the part-number shape but is a material grade -> the NON_PII_VALUE_KEYS
    // exemption keeps a clean part ineligible AND preserves the material in the auto-redacted artifact.
    for (const grade of ["AISI-1045", "SAE-4340", "AL-6061"]) {
      const redact = redactOf({ dimensions: [mkDim(5)], title_block: { material: grade } });
      expect(redact.eligible).toBe(false);
      expect(redact.payload.n_redactions).toBe(0);
      const red = redact.payload.redacted_extraction as BlueprintExtractionContract;
      expect((red.title_block as Record<string, unknown>).material).toBe(grade); // not corrupted to [REDACTED]
    }
  });

  it("privacy is a PRECURSOR, not a block: a PII-bearing part still routes to its other (eligible) consumers", () => {
    const plan = routeExtractionToConsumers(
      mkContract({ dimensions: [mkDim(12)], notes: [mkCallout("FOR SEMBLEX")], title_block: { material: "4140" } }),
    );
    assertInvariants(plan);
    expect(routeById(plan, "redact").eligible).toBe(true);
    expect(routeById(plan, "redact").requires_confirmation).toBe(false); // privacy never confirm-gates
    expect(routeById(plan, "quote").eligible).toBe(true); // quote still proceeds (redaction is for external share)
  });

  it("eligibility matches redactExtraction's audit exactly (no double-counting; n_redactions === pii spans)", () => {
    // customer + a note name + a part-number in source -> multiple spans across multiple fields
    const redact = redactOf({
      dimensions: [mkDim(5)],
      notes: [mkCallout("RUN FOR SEMBLEX")],
      source: "uploads/ITW/D-12345.pdf",
      title_block: { customer: "TOPURA", material: "4140" },
    });
    expect(redact.eligible).toBe(true);
    const fields = redact.payload.pii_fields as string[];
    expect(fields).toContain("title_block.customer");
    expect(fields).toContain("notes[0].value");
    expect(fields).toContain("source");
    expect(redact.payload.n_redactions as number).toBeGreaterThanOrEqual(fields.length);
  });
});

describe("routeExtractionToConsumers — redactPayloads external-safe plan (U-XRAY-REDACT-PLAN-PAYLOADS)", () => {
  const contract = mkContract({
    dimensions: [mkDim(12.7), mkDim(25.4)],
    title_block: { customer: "SEMBLEX", material: "4140 steel" },
    source: "uploads/ITW/D-12345.pdf",
  });

  it("DEFAULT plan keeps the raw customer in the INTERNAL consumer payloads + raw source (no redacted flag)", () => {
    const plan = routeExtractionToConsumers(contract);
    expect(plan.redacted).toBeUndefined();
    expect((routeById(plan, "quote").payload.title_block as Record<string, unknown>).customer).toBe("SEMBLEX");
    expect(plan.source).toBe("uploads/ITW/D-12345.pdf");
  });

  it("redactPayloads:true masks the customer in EVERY payload that carries it + masks the source; marks plan.redacted", () => {
    const plan = routeExtractionToConsumers(contract, { redactPayloads: true });
    expect(plan.redacted).toBe(true);
    // every title-block-carrying payload (incl. fai_run + setup_sheet) is masked
    for (const id of ["quote", "print_to_program", "job_create", "cad_reconstruct", "fai_run", "setup_sheet"]) {
      const tb = routeById(plan, id).payload.title_block as Record<string, unknown> | undefined;
      expect(tb && tb.customer).toBe("[REDACTED]");
    }
    // non-PII material + numeric dims survive redaction (the artifact stays usable)
    const quote = routeById(plan, "quote");
    expect(quote.payload.material).toBe("4140 steel");
    expect((quote.payload.dimensions as ContractDimension[]).length).toBe(2);
    // the source print path PII (customer ITW + part number D-12345) is masked
    expect(plan.source).toContain("[REDACTED]");
    expect(plan.source).not.toMatch(/ITW/);
    expect(plan.source).not.toMatch(/D-12345/);
  });

  it("redactPayloads also scrubs the REASON (a customer mislabeled into the material field would otherwise leak through a material-interpolating reason)", () => {
    // quote/material_resolve/speed_feed/job_create/material_price_lookup reasons interpolate material(c).
    const mislabeled = mkContract({
      dimensions: [mkDim(10)],
      title_block: { material: "4140 PER ITW SPEC" }, // customer name mislabeled into the material field
    });
    const plain = routeExtractionToConsumers(mislabeled);
    expect(routeById(plain, "quote").reason).toMatch(/ITW/); // default plan: the raw reason carries it
    const safe = routeExtractionToConsumers(mislabeled, { redactPayloads: true });
    for (const r of safe.routes) {
      expect(r.reason).not.toMatch(/ITW/); // external-safe plan: no reason leaks the customer
    }
    // and the payload material is scrubbed too (the under-redaction case the lib already defends)
    expect(routeById(safe, "quote").payload.material).not.toMatch(/ITW/);
  });

  it("redactPayloads is CONTENT-ONLY: eligibility, confirm-gates, and the summary are identical to the default plan", () => {
    const a = routeExtractionToConsumers(contract);
    const b = routeExtractionToConsumers(contract, { redactPayloads: true });
    expect(b.summary).toEqual(a.summary);
    for (const r of b.routes) {
      const orig = routeById(a, r.consumer);
      expect(r.eligible).toBe(orig.eligible);
      expect(r.requires_confirmation).toBe(orig.requires_confirmation);
      expect(r.blocking_fields).toBe(orig.blocking_fields);
    }
    assertInvariants(b);
  });

  it("the privacy route's own payload stays a valid redacted artifact under redactPayloads (idempotent)", () => {
    const plan = routeExtractionToConsumers(contract, { redactPayloads: true });
    const red = routeById(plan, "redact").payload.redacted_extraction as BlueprintExtractionContract;
    expect((red.title_block as Record<string, unknown>).customer).toBe("[REDACTED]");
  });
});
