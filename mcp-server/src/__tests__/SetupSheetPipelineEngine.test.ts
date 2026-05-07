/**
 * SetupSheetPipelineEngine Tests (U-MIO35)
 * ========================================
 * Covers: op enrichment, pocket collision detection, tool sanity warnings,
 * first-part cross-link, summary rollup, Markdown/CSV rendering, storage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SetupSheetPipelineEngine,
  type SetupSheetPipelineInput,
  type SetupPipelineOperationInput,
} from "../engines/SetupSheetPipelineEngine.js";

function op(over: Partial<SetupPipelineOperationInput> = {}): SetupPipelineOperationInput {
  return {
    op_num: 10,
    op_name: "Face & turn OD",
    machine_id: "OKUMA-LB3000",
    wcs: "G54",
    tools: [
      {
        tool_id: "T01",
        pocket: 1,
        description: "Ø12mm CNMG-432 rough turn",
        holder_id: "KM63-TRI",
        stickout_mm: 40,
        life_budget_min: 45,
        offsets: [
          { type: "length", method: "presetter", nominal: 150, unit: "mm" },
          { type: "diameter", method: "probe", nominal: 12, unit: "mm" },
        ],
      },
    ],
    workholding: {
      clamp_type: "chuck",
      clamp_id: "CH-8",
      clamp_torque_nm: 45,
    },
    stock: { dims_mm: [50, 50, 150], orientation: "Z+ axis" },
    ...over,
  };
}

function base(extra: Partial<SetupSheetPipelineInput> = {}): SetupSheetPipelineInput {
  return {
    part_number: "PN-SETUP-1",
    revision: "A",
    job_id: "J-100",
    customer: "ALCOA",
    quantity: 50,
    routing_id: "RT-00001",
    control_plan_id: "CP-00001",
    programmer: "Mark V.",
    operators: ["Op-1", "Op-2"],
    operations: [op()],
    safety_notes: ["Coolant ON before spindle start"],
    ...extra,
  };
}

describe("SetupSheetPipelineEngine — generate", () => {
  let engine: SetupSheetPipelineEngine;
  beforeEach(() => { engine = new SetupSheetPipelineEngine(); });

  it("generates pipeline with setup_id and one op block per input op", () => {
    const p = engine.generate(base({
      operations: [op({ op_num: 10 }), op({ op_num: 20, op_name: "Bore" }), op({ op_num: 30, op_name: "Thread" })],
    }));
    expect(p.setup_id).toMatch(/^SU-\d{5}$/);
    expect(p.operations).toHaveLength(3);
    expect(p.summary.operation_count).toBe(3);
  });

  it("rolls up tool counts and unique pockets correctly", () => {
    const p = engine.generate(base({
      operations: [
        op({
          op_num: 10,
          tools: [
            { tool_id: "T01", pocket: 1, description: "tool1", offsets: [{ type: "length", method: "presetter" }] },
            { tool_id: "T02", pocket: 2, description: "tool2", offsets: [{ type: "length", method: "presetter" }] },
          ],
        }),
        op({
          op_num: 20,
          tools: [
            { tool_id: "T01", pocket: 1, description: "tool1", offsets: [{ type: "length", method: "presetter" }] },  // reused
            { tool_id: "T03", pocket: 3, description: "tool3", offsets: [{ type: "length", method: "presetter" }] },
          ],
        }),
      ],
    }));
    expect(p.summary.total_tools).toBe(4);
    expect(p.summary.unique_tools).toBe(3); // T01 reused
    expect(p.summary.unique_pockets).toBe(3);
  });

  it("counts probing ops correctly (ignores routine=none)", () => {
    const p = engine.generate(base({
      operations: [
        op({ op_num: 10, probing: { routine: "wcs_find", cycle_number: "G65 P9801" } }),
        op({ op_num: 20, probing: { routine: "feature_probe" } }),
        op({ op_num: 30, probing: { routine: "none" } }),
        op({ op_num: 40 }),
      ],
    }));
    expect(p.summary.probing_ops).toBe(2);
  });

  it("computes offsets_to_preset per operation", () => {
    const p = engine.generate(base({
      operations: [op({
        tools: [
          { tool_id: "T01", pocket: 1, description: "t1",
            offsets: [{ type: "length", method: "presetter" }, { type: "diameter", method: "probe" }] },
          { tool_id: "T02", pocket: 2, description: "t2",
            offsets: [{ type: "length", method: "presetter" }] },
        ],
      })],
    }));
    expect(p.operations[0].offsets_to_preset).toBe(3);
  });

  it("flags pocket collisions (two tools same pocket) as warning", () => {
    const p = engine.generate(base({
      operations: [op({
        tools: [
          { tool_id: "T01", pocket: 1, description: "a", offsets: [{ type: "length", method: "presetter" }] },
          { tool_id: "T02", pocket: 1, description: "b", offsets: [{ type: "length", method: "presetter" }] },
        ],
      })],
    }));
    expect(p.operations[0].pocket_collisions).toEqual(["T01", "T02"]);
    expect(p.summary.warnings.some(w => w.includes("pocket 1"))).toBe(true);
  });

  it("does NOT flag pocket=0 (lathe gang / unassigned) as collision", () => {
    const p = engine.generate(base({
      operations: [op({
        tools: [
          { tool_id: "T01", pocket: 0, description: "a", offsets: [{ type: "length", method: "presetter" }] },
          { tool_id: "T02", pocket: 0, description: "b", offsets: [{ type: "length", method: "presetter" }] },
        ],
      })],
    }));
    expect(p.operations[0].pocket_collisions).toEqual([]);
    expect(p.summary.warnings.some(w => w.includes("pocket 0"))).toBe(false);
  });

  it("warns on invalid stickout (<=0)", () => {
    const p = engine.generate(base({
      operations: [op({
        tools: [{ tool_id: "T01", pocket: 1, description: "a", stickout_mm: 0, offsets: [{ type: "length", method: "presetter" }] }],
      })],
    }));
    expect(p.summary.warnings.some(w => w.includes("invalid stickout"))).toBe(true);
  });

  it("warns on tool with zero offsets", () => {
    const p = engine.generate(base({
      operations: [op({
        tools: [{ tool_id: "T01", pocket: 1, description: "a", offsets: [] }],
      })],
    }));
    expect(p.summary.warnings.some(w => w.includes("no offsets"))).toBe(true);
  });

  it("warns on non-monotonic op sequence", () => {
    const p = engine.generate(base({
      operations: [op({ op_num: 10 }), op({ op_num: 20 }), op({ op_num: 15 })],
    }));
    expect(p.summary.warnings.some(w => w.includes("monotonic"))).toBe(true);
  });

  it("warns when first_part_check.after_op doesn't match any op", () => {
    const p = engine.generate(base({
      operations: [op({ op_num: 10 }), op({ op_num: 20 })],
      first_part_checks: [
        { feature_id: "F1", feature_name: "OD", severity: "critical", after_op: 99, instruction: "Check" },
      ],
    }));
    expect(p.summary.warnings.some(w => w.includes("after_op=99"))).toBe(true);
  });

  it("tallies first-part checkpoint severities", () => {
    const p = engine.generate(base({
      first_part_checks: [
        { feature_id: "F1", feature_name: "OD", severity: "critical", after_op: 10, instruction: "c1" },
        { feature_id: "F2", feature_name: "Length", severity: "major", after_op: 10, instruction: "c2" },
        { feature_id: "F3", feature_name: "Thread", severity: "major", after_op: 10, instruction: "c3" },
        { feature_id: "F4", feature_name: "Chamfer", severity: "minor", after_op: 10, instruction: "c4" },
      ],
    }));
    expect(p.summary.critical_checkpoints).toBe(1);
    expect(p.summary.major_checkpoints).toBe(2);
    expect(p.summary.minor_checkpoints).toBe(1);
  });

  it("throws when operations list is empty", () => {
    expect(() => engine.generate(base({ operations: [] }))).toThrow(/at least one operation/);
  });

  it("applies defaults for missing job_id/customer/quantity/routing/cp", () => {
    const p = engine.generate({
      part_number: "PN-D",
      revision: "A",
      operations: [op()],
    });
    expect(p.job_id).toBe("N/A");
    expect(p.customer).toBe("N/A");
    expect(p.quantity).toBe(1);
    expect(p.routing_id).toBe("N/A");
    expect(p.control_plan_id).toBe("N/A");
    expect(p.programmer).toBe("N/A");
    expect(p.operators).toEqual([]);
    expect(p.safety_notes).toEqual([]);
  });

  it("increments setup_id monotonically", () => {
    const p1 = engine.generate(base());
    const p2 = engine.generate(base());
    expect(p1.setup_id).toBe("SU-00001");
    expect(p2.setup_id).toBe("SU-00002");
  });
});

describe("SetupSheetPipelineEngine — rendering", () => {
  it("renders Markdown with headers, op blocks, tool tables, summary", () => {
    const engine = new SetupSheetPipelineEngine();
    const forms = engine.generateAll(base({
      operations: [op({ op_num: 10, op_name: "Rough turn" })],
      first_part_checks: [
        { feature_id: "F1", feature_name: "OD", severity: "critical", after_op: 10, gage_id: "GAGE-1", instruction: "Measure OD" },
      ],
    }));
    expect(forms.markdown).toContain("# Setup Sheet SU-");
    expect(forms.markdown).toContain("PN-SETUP-1 Rev A");
    expect(forms.markdown).toContain("## Op 10");
    expect(forms.markdown).toContain("### Workholding");
    expect(forms.markdown).toContain("### Tools");
    expect(forms.markdown).toContain("## First-Part Verification Checklist");
    expect(forms.markdown).toContain("## Safety Notes");
    expect(forms.markdown).toContain("## Summary");
  });

  it("renders Probing section only for ops with probing != none", () => {
    const engine = new SetupSheetPipelineEngine();
    const noProbing = engine.generateAll(base({ operations: [op()] }));
    expect(noProbing.markdown).not.toContain("### Probing");

    const withProbing = engine.generateAll(base({
      operations: [op({ probing: { routine: "wcs_find", cycle_number: "G65 P9801" } })],
    }));
    expect(withProbing.markdown).toContain("### Probing");
    expect(withProbing.markdown).toContain("G65 P9801");
  });

  it("renders CSV with one row per tool across all ops", () => {
    const engine = new SetupSheetPipelineEngine();
    const forms = engine.generateAll(base({
      operations: [
        op({ op_num: 10, tools: [
          { tool_id: "T01", pocket: 1, description: "a", offsets: [{ type: "length", method: "presetter" }] },
          { tool_id: "T02", pocket: 2, description: "b", offsets: [{ type: "diameter", method: "probe" }] },
        ]}),
        op({ op_num: 20, tools: [
          { tool_id: "T03", pocket: 3, description: "c", offsets: [{ type: "length", method: "presetter" }] },
        ]}),
      ],
    }));
    const rows = forms.csv.split("\n");
    expect(rows.length).toBe(4); // header + 3 tool rows
    expect(rows[0]).toContain("setup_id");
    expect(rows[0]).toContain("tool_id");
    expect(rows[1]).toContain("T01");
    expect(rows[3]).toContain("T03");
  });

  it("escapes CSV cells with commas, quotes, newlines", () => {
    const engine = new SetupSheetPipelineEngine();
    const forms = engine.generateAll(base({
      operations: [op({
        op_name: "Rough, then finish",
        tools: [{
          tool_id: "T01", pocket: 1, description: 'Ø12mm, 4fl "carbide"',
          notes: "Use M8, rigid\ntap only",
          offsets: [{ type: "length", method: "presetter" }],
        }],
      })],
    }));
    expect(forms.csv).toContain('"Rough, then finish"');
    expect(forms.csv).toContain('"Ø12mm, 4fl ""carbide"""');
    expect(forms.csv).toContain('"Use M8, rigid\ntap only"');
  });
});

describe("SetupSheetPipelineEngine — storage & retrieval", () => {
  it("retrieves pipelines by setup_id", () => {
    const engine = new SetupSheetPipelineEngine();
    const p = engine.generate(base());
    expect(engine.get(p.setup_id)).toEqual(p);
    expect(engine.get("SU-99999")).toBeNull();
  });

  it("reset() clears the store and counter", () => {
    const engine = new SetupSheetPipelineEngine();
    const p1 = engine.generate(base());
    engine.reset();
    expect(engine.get(p1.setup_id)).toBeNull();
    const p2 = engine.generate(base());
    expect(p2.setup_id).toBe("SU-00001");
  });
});
