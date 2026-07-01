/**
 * MillChangeoverBriefEngine — workholding-oriented changeover brief for mill operators
 *
 * Mill-domain parity for LatheChangeoverBriefEngine (LATHE-PRO-MS11). Same purpose
 * ("what does the machine need to look like before first-off?") but mill-specific
 * sections — replaces lathe's chuck/jaws/turret/X-Z model with mill's vise/fixture/
 * tool-magazine/X-Y-Z(/A-B-C) model.
 *
 * 7 SECTIONS:
 *   1. Job Header           — part number, rev, customer, qty, deadline, machine
 *   2. Work Holding         — vise / fixture / soft-jaw / magnetic-chuck / vacuum,
 *                             grip area, clamping force, parallels, datum scheme
 *   3. Tool Magazine        — pocket / tool / holder / projection
 *   4. Work Offsets         — G54 X/Y/Z + auxiliary (G55..G59, G54.1 Pxx)
 *   5. Coolant & Spindle    — type, pressure, level; max rpm, gear, TSC option
 *   6. Program Reference    — O-number, revision, expected cycle, first-off approver
 *   7. Warnings / Notes     — soft-jaw bore, fixture interference, probe cycle,
 *                             5-axis singularity, head-tilt limits
 *
 * Composes with SetupSheetEngine (the tool/op-level doc) — they are different
 * documents with different purposes. The changeover brief is what an operator
 * USES at the machine to set up before first-off.
 *
 * References:
 *   - AIAG CQI-8 Layered-Process Audit §5 (setup verification)
 *   - Haas Operator's Manual §4 (mill setup sheet conventions)
 *   - Mazak HCN HMC Setup Procedure (work-holding + tool-magazine)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-CHANGEOVER-BRIEF (iter65)
 * @version 1.0.0
 * @module MillChangeoverBriefEngine
 */

export type MillWorkHoldingType =
  | "vise"
  | "soft_jaw_vise"
  | "fixture_plate"
  | "custom_fixture"
  | "magnetic_chuck"
  | "vacuum_table"
  | "tombstone"
  | "rotary_table"
  | "5axis_trunnion";

export type MillCoolantType = "flood" | "tsc" | "mist" | "mql" | "air_blast" | "dry";

export interface MillToolMagazineEntry {
  pocket: number;
  description: string;
  holder_id?: string;
  insert_id?: string;
  /** Total projection from spindle nose (mm) — drives deflection check */
  projection_mm?: number;
  /** Tool length offset (H register) */
  h_offset?: number;
  /** Diameter offset (D register) */
  d_offset?: number;
  /** Comment / setup note */
  notes?: string;
}

export interface MillChangeoverBriefInput {
  part_number: string;
  revision: string;
  customer?: string;
  quantity?: number;
  due_date?: string;

  machine_id: string;
  /** 3-axis / 3+2 / 4-axis / 5-axis simultaneous */
  axis_count: 3 | 4 | 5;

  workholding_type: MillWorkHoldingType;
  /** Grip area for vises/jaws (mm) — used for warning rules */
  grip_area_mm?: { x: number; y: number };
  /** Clamping force (N) when known */
  clamping_force_n?: number;
  /** Parallels height (mm) for vise setups */
  parallels_height_mm?: number;
  /** Datum scheme: "3-2-1" | "circle-line-point" | etc. */
  datum_scheme?: string;

  tool_magazine: MillToolMagazineEntry[];

  /** G54 work offsets — X/Y/Z all required for mill (vs lathe X/Z) */
  work_offset_g54_x_mm?: number;
  work_offset_g54_y_mm?: number;
  work_offset_g54_z_mm?: number;
  auxiliary_work_offsets?: Record<string, { x_mm?: number; y_mm?: number; z_mm?: number }>;

  coolant_type?: MillCoolantType;
  coolant_pressure_bar?: number;
  coolant_level_percent?: number;
  tsc_available?: boolean;

  max_spindle_rpm?: number;
  gear_range?: number;

  program_number: number;
  program_revision?: string;
  expected_cycle_s?: number;
  first_off_approver?: string;

  /** 5-axis-specific: head tilt limits to clear (deg) */
  head_tilt_limit_deg?: { min: number; max: number };
  /** Probe cycle expected pre-cut? */
  probe_cycle_expected?: boolean;

  warnings?: string[];
  notes?: string;
}

export interface MillChangeoverBriefOutput {
  document_id: string;
  section_ordered: Array<{ title: string; lines: string[] }>;
  operator_check_list: string[];
  warnings: string[];
  markdown: string;
  generated_at: string;
}

class MillChangeoverBriefEngineImpl {
  generate(i: MillChangeoverBriefInput): MillChangeoverBriefOutput {
    this.validate(i);
    const now = new Date().toISOString();
    const docId = `MILL-CB-${i.part_number}-${i.revision}-${i.machine_id}-${now.slice(0, 10)}`;
    const warnings = [...(i.warnings ?? [])];

    const sections: MillChangeoverBriefOutput["section_ordered"] = [];

    // 1. Job Header
    sections.push({
      title: "1. Job Header",
      lines: [
        `Part: ${i.part_number} Rev ${i.revision}`,
        `Customer: ${i.customer ?? "—"}`,
        `Qty: ${i.quantity ?? "—"}    Due: ${i.due_date ?? "—"}`,
        `Machine: ${i.machine_id}    Axes: ${i.axis_count}`,
      ],
    });

    // 2. Work Holding
    const ghLines: string[] = [
      `Workholding: ${i.workholding_type}`,
    ];
    if (i.grip_area_mm) {
      ghLines.push(`Grip area: X=${i.grip_area_mm.x}mm × Y=${i.grip_area_mm.y}mm`);
    }
    if (i.clamping_force_n !== undefined) {
      ghLines.push(`Clamping force: ${i.clamping_force_n}N`);
    }
    if (i.parallels_height_mm !== undefined) {
      ghLines.push(`Parallels height: ${i.parallels_height_mm}mm`);
    }
    if (i.datum_scheme) {
      ghLines.push(`Datum scheme: ${i.datum_scheme}`);
    }
    sections.push({ title: "2. Work Holding", lines: ghLines });

    // 3. Tool Magazine
    sections.push({
      title: "3. Tool Magazine",
      lines: [
        "Pocket | Description | Holder | Insert/Tool | Projection | H-off | D-off",
        ...i.tool_magazine.map(t =>
          `T${String(t.pocket).padStart(2, "0")} | ${t.description} | ${t.holder_id ?? "—"} | ${t.insert_id ?? "—"} | ${t.projection_mm ?? "—"}mm | ${t.h_offset ?? 0} | ${t.d_offset ?? 0}`,
        ),
      ],
    });

    // 4. Work Offsets
    const offsetLines = [
      `G54 X=${i.work_offset_g54_x_mm ?? 0}mm  Y=${i.work_offset_g54_y_mm ?? 0}mm  Z=${i.work_offset_g54_z_mm ?? 0}mm`,
    ];
    if (i.auxiliary_work_offsets) {
      for (const [code, v] of Object.entries(i.auxiliary_work_offsets)) {
        offsetLines.push(`${code} X=${v.x_mm ?? 0}mm  Y=${v.y_mm ?? 0}mm  Z=${v.z_mm ?? 0}mm`);
      }
    }
    sections.push({ title: "4. Work Offsets", lines: offsetLines });

    // 5. Coolant & Spindle
    sections.push({
      title: "5. Coolant & Spindle",
      lines: [
        `Coolant: ${i.coolant_type ?? "—"}  Pressure: ${i.coolant_pressure_bar ?? "—"} bar  Level: ${i.coolant_level_percent ?? "—"}%  TSC: ${i.tsc_available ? "yes" : "no"}`,
        `Max RPM: ${i.max_spindle_rpm ?? "—"}    Gear: ${i.gear_range ?? "—"}`,
      ],
    });

    // 6. Program Reference
    sections.push({
      title: "6. Program & First-Off",
      lines: [
        `Program: O${i.program_number} Rev ${i.program_revision ?? "—"}`,
        `Expected cycle: ${i.expected_cycle_s ?? "—"}s`,
        `First-off approver: ${i.first_off_approver ?? "pending assignment"}`,
      ],
    });

    // Auto-warnings (mill-specific tribal rules)
    if (i.workholding_type === "soft_jaw_vise" && !/bore/i.test(i.notes ?? "")) {
      warnings.push("Soft jaws — verify bore dimension matches part profile before clamping");
    }
    if (i.workholding_type === "vacuum_table" && !i.parallels_height_mm) {
      warnings.push("Vacuum table — verify part flatness and seal area before vacuum on");
    }
    if (i.coolant_level_percent !== undefined && i.coolant_level_percent < 40) {
      warnings.push(`Coolant level ${i.coolant_level_percent}% — top up before running`);
    }
    if (i.coolant_type === "tsc" && !i.tsc_available) {
      warnings.push("Program calls for TSC but machine has no TSC plumbing — verify or post-process to alternative coolant");
    }
    if (i.axis_count === 5 && !i.head_tilt_limit_deg) {
      warnings.push("5-axis machine but no head_tilt_limit_deg supplied — verify no singularity in program");
    }
    if (i.axis_count >= 4 && i.workholding_type === "vise") {
      warnings.push(`${i.axis_count}-axis machine with vise — verify clearance for rotary moves`);
    }
    // Tool magazine sanity: check for excessive projection
    for (const t of i.tool_magazine) {
      if (t.projection_mm !== undefined && t.projection_mm > 100) {
        warnings.push(`T${t.pocket} (${t.description}) projection ${t.projection_mm}mm — verify deflection check via prism_mill:mill_deflection_check`);
      }
    }

    if (warnings.length > 0 || i.notes) {
      sections.push({
        title: "7. Warnings & Notes",
        lines: [
          ...warnings.map(w => `⚠ ${w}`),
          ...(i.notes ? [i.notes] : []),
        ],
      });
    }

    const checkList: string[] = [
      "[ ] Workholding type matches setup sheet",
      "[ ] Part seated against fixture/jaw face per datum scheme",
      "[ ] All tool magazine pockets loaded per tool list",
      "[ ] Tool length offsets (H) populated; diameter offsets (D) for endmills",
      "[ ] Tool projection verified against deflection envelope",
      "[ ] Coolant type and level correct; TSC plumbed if required",
      "[ ] Work offsets G54 X/Y/Z entered (+ aux offsets if used)",
      i.axis_count >= 4 ? "[ ] Rotary axis homed; head tilt limits cleared (5-axis)" : "[ ] Z-zero verified at top of part",
      "[ ] Probe cycle pre-cut verifies part presence and WCS",
      "[ ] First-off sign-off scheduled before production quantity runs",
    ];

    const md = [
      `# ${docId}`,
      `*Generated ${now}*`,
      "",
      ...sections.flatMap(s => [`## ${s.title}`, ...s.lines, ""]),
      `## Operator Checklist`,
      ...checkList,
    ].join("\n");

    return {
      document_id: docId,
      section_ordered: sections,
      operator_check_list: checkList,
      warnings,
      markdown: md,
      generated_at: now,
    };
  }

  getStats(): {
    sections: number;
    supported_workholding_types: MillWorkHoldingType[];
    supported_coolant_types: MillCoolantType[];
    reference: string;
  } {
    return {
      sections: 7,
      supported_workholding_types: [
        "vise", "soft_jaw_vise", "fixture_plate", "custom_fixture",
        "magnetic_chuck", "vacuum_table", "tombstone", "rotary_table", "5axis_trunnion",
      ],
      supported_coolant_types: ["flood", "tsc", "mist", "mql", "air_blast", "dry"],
      reference: "AIAG CQI-8 §5; Haas Operator's Manual §4; Mazak HCN Setup Procedure",
    };
  }

  // ── Validation ────────────────────────────────────────────────────────

  private validate(i: MillChangeoverBriefInput): void {
    if (!i) throw new Error("MillChangeoverBriefEngine.generate: input required");
    if (!i.part_number) throw new Error("MillChangeoverBriefEngine.generate: part_number required");
    if (!i.revision) throw new Error("MillChangeoverBriefEngine.generate: revision required");
    if (!i.machine_id) throw new Error("MillChangeoverBriefEngine.generate: machine_id required");
    if (!Array.isArray(i.tool_magazine)) throw new Error("MillChangeoverBriefEngine.generate: tool_magazine[] required");
    if (i.program_number === undefined || i.program_number === null) {
      throw new Error("MillChangeoverBriefEngine.generate: program_number required");
    }
    if (![3, 4, 5].includes(i.axis_count)) {
      throw new Error("MillChangeoverBriefEngine.generate: axis_count must be 3, 4, or 5");
    }
  }
}

export const millChangeoverBriefEngine = new MillChangeoverBriefEngineImpl();
export type { MillChangeoverBriefEngineImpl };
