/**
 * LatheChangeoverBriefEngine
 * ============================
 *
 * Workholding-oriented changeover brief for lathe operators.
 *
 * Distinct from SetupSheetEngine (which is generic tool/op oriented):
 * this engine produces the *changeover* document — the "what does the
 * machine need to look like before first-off?" brief:
 *
 *   1. Job header        — part number, rev, customer, qty, deadline
 *   2. Work holding      — chuck ID, jaw type (soft/hard/step/collet),
 *                          grip OD, grip length, face-Z, tailstock,
 *                          steady rest
 *   3. Turret loading    — position / tool / holder (minimum, not speeds)
 *   4. Work offsets      — G54 X/Z + auxiliary offsets
 *   5. Coolant & spindle — type, pressure, level; max rpm, gear, G96/G97
 *   6. Program reference — O-number, revision, expected cycle, first-off
 *                          approver
 *   7. Warnings / notes  — soft-jaw bore required, interferences, probe
 *                          cycles, timeouts
 *
 * Composes with SetupSheetEngine (the tool/op-level doc) — they are
 * different documents with different purposes.
 *
 * References:
 *   - AIAG CQI-8 Layered-Process Audit §5 (setup verification)
 *   - Okuma PLC Machine Setup Procedure §3.1
 *
 * @module engines/LatheChangeoverBriefEngine
 * @milestone LATHE-PRO-MS11
 */

export interface LatheTurretEntry {
  turret_position: number;
  description: string;
  holder_id?: string;
  insert_id?: string;
  x_offset?: number;
  z_offset?: number;
  nose_radius_mm?: number;
  tool_angle_code?: string;
}

export interface LatheChangeoverBriefInput {
  part_number: string;
  revision: string;
  customer?: string;
  quantity?: number;
  due_date?: string;

  machine_id: string;

  chuck_id: string;
  jaw_type: "soft" | "hard" | "step" | "collet";
  jaw_grip_od_mm: number;
  jaw_grip_length_mm: number;
  face_z_mm?: number;
  tailstock_used?: boolean;
  tailstock_position_z_mm?: number;
  steady_rest_used?: boolean;

  turret: LatheTurretEntry[];

  work_offset_g54_x_mm?: number;
  work_offset_g54_z_mm?: number;
  auxiliary_work_offsets?: Record<string, { x_mm?: number; z_mm?: number }>;

  coolant_type?: "flood" | "through_tool" | "mist" | "mql" | "dry";
  coolant_pressure_bar?: number;
  coolant_level_percent?: number;

  max_spindle_rpm?: number;
  gear_range?: number;
  mode_g96_g97?: "G96" | "G97" | "mixed";

  program_number: number;
  program_revision?: string;
  expected_cycle_s?: number;
  first_off_approver?: string;

  warnings?: string[];
  notes?: string;
}

export interface LatheChangeoverBriefOutput {
  document_id: string;
  section_ordered: Array<{ title: string; lines: string[] }>;
  operator_check_list: string[];
  warnings: string[];
  markdown: string;
  generated_at: string;
}

class LatheChangeoverBriefEngineImpl {
  generate(i: LatheChangeoverBriefInput): LatheChangeoverBriefOutput {
    const now = new Date().toISOString();
    const docId = `CB-${i.part_number}-${i.revision}-${i.machine_id}-${now.slice(0, 10)}`;
    const warnings = [...(i.warnings ?? [])];

    const sections: LatheChangeoverBriefOutput["section_ordered"] = [];

    sections.push({
      title: "1. Job Header",
      lines: [
        `Part: ${i.part_number} Rev ${i.revision}`,
        `Customer: ${i.customer ?? "—"}`,
        `Qty: ${i.quantity ?? "—"}    Due: ${i.due_date ?? "—"}`,
        `Machine: ${i.machine_id}`,
      ],
    });

    sections.push({
      title: "2. Work Holding",
      lines: [
        `Chuck: ${i.chuck_id}  |  Jaws: ${i.jaw_type}`,
        `Grip OD: Ø${i.jaw_grip_od_mm}mm    Grip length: ${i.jaw_grip_length_mm}mm`,
        `Face Z: ${i.face_z_mm ?? "—"}mm`,
        `Tailstock: ${i.tailstock_used ? `Z=${i.tailstock_position_z_mm ?? "?"}mm` : "not used"}`,
        `Steady rest: ${i.steady_rest_used ? "in use" : "not used"}`,
      ],
    });

    sections.push({
      title: "3. Turret Loading",
      lines: [
        "Pos | Description | Holder | Insert | X-off | Z-off | Rn",
        ...i.turret.map((t) =>
          `T${String(t.turret_position).padStart(2, "0")} | ${t.description} | ${t.holder_id ?? "—"} | ${t.insert_id ?? "—"} | ${t.x_offset ?? 0} | ${t.z_offset ?? 0} | ${t.nose_radius_mm ?? "—"}`,
        ),
      ],
    });

    const offsetLines = [
      `G54 X=${i.work_offset_g54_x_mm ?? 0}mm Z=${i.work_offset_g54_z_mm ?? 0}mm`,
    ];
    if (i.auxiliary_work_offsets) {
      for (const [code, v] of Object.entries(i.auxiliary_work_offsets)) {
        offsetLines.push(`${code} X=${v.x_mm ?? 0}mm Z=${v.z_mm ?? 0}mm`);
      }
    }
    sections.push({ title: "4. Work Offsets", lines: offsetLines });

    sections.push({
      title: "5. Coolant & Spindle",
      lines: [
        `Coolant: ${i.coolant_type ?? "—"}  Pressure: ${i.coolant_pressure_bar ?? "—"} bar  Level: ${i.coolant_level_percent ?? "—"}%`,
        `Max RPM: ${i.max_spindle_rpm ?? "—"}    Gear: ${i.gear_range ?? "—"}    Mode: ${i.mode_g96_g97 ?? "—"}`,
      ],
    });

    sections.push({
      title: "6. Program & First-Off",
      lines: [
        `Program: O${i.program_number} Rev ${i.program_revision ?? "—"}`,
        `Expected cycle: ${i.expected_cycle_s ?? "—"}s`,
        `First-off approver: ${i.first_off_approver ?? "pending assignment"}`,
      ],
    });

    // Auto-warnings
    if (i.jaw_type === "soft" && !/bore/i.test(i.notes ?? "")) {
      warnings.push("Soft jaws — verify bore dimension matches grip OD before clamping");
    }
    if (i.coolant_level_percent !== undefined && i.coolant_level_percent < 40) {
      warnings.push(`Coolant level ${i.coolant_level_percent}% — top up before running`);
    }

    if (warnings.length > 0 || i.notes) {
      sections.push({
        title: "7. Warnings & Notes",
        lines: [
          ...warnings.map((w) => `⚠ ${w}`),
          ...(i.notes ? [i.notes] : []),
        ],
      });
    }

    const checkList: string[] = [
      "[ ] Chuck jaws correct type and bored/step-ground as required",
      "[ ] Part seated against jaw-face and facebolts torqued",
      "[ ] All turret positions loaded per turret list",
      "[ ] Tool offsets populated (X/Z/R)",
      "[ ] Coolant type and level correct",
      "[ ] Work offsets entered (G54 + aux)",
      "[ ] Tailstock / steady rest set if required",
      "[ ] First-off sign-off scheduled before production quantity runs",
    ];

    const md = [
      `# ${docId}`,
      `*Generated ${now}*`,
      "",
      ...sections.flatMap((s) => [`## ${s.title}`, ...s.lines, ""]),
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

  getStats(): { sections: number; reference: string } {
    return {
      sections: 7,
      reference: "AIAG CQI-8 §5 setup verification; Okuma PLC Machine Setup §3.1",
    };
  }
}

export const latheChangeoverBriefEngine = new LatheChangeoverBriefEngineImpl();
export type { LatheChangeoverBriefEngineImpl };
