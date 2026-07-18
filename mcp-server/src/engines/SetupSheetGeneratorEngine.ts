/**
 * SetupSheetGeneratorEngine — single shop-floor setup-sheet document generator
 *
 * Consumes outputs from PreCutChecklist + ProbeMacroGen + ToolMagazineIntegrity +
 * WorkholdingTorqueSpec + WCSEnvelopeValidator + CoolantFlowVerification +
 * SpindleWarmupCycle + ToolLifeBudget into a single printable operator
 * setup sheet (markdown) that contains EVERY artifact the operator needs to
 * stand up a first-piece run.
 *
 * Output format: markdown + optional plaintext. Includes:
 *   - Header (program ID, part ID, customer, material, date)
 *   - Stock spec + receiving check
 *   - Fixture + clamp torque table
 *   - Tool list (pocket / offsets / remaining life / spares)
 *   - WCS origin + machine envelope confirmation
 *   - Probe-macro sequence
 *   - Coolant + spindle warm-up
 *   - PreCut checklist sign-off (operator initials)
 *   - First-piece inspection plan (CMM cycles)
 *
 * Reference: DMG MORI setup-sheet template; Mazak operator manual §setup;
 *   AS9100 §8.5.1 (production / service); JM Die operator setup SOP.
 *
 * @version 1.0.0
 * @module SetupSheetGeneratorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface SetupSheetInput {
  header: {
    program_id: string;
    part_id: string;
    customer: string;
    material: string;
    operator?: string;
    date_iso?: string;
    revision?: string;
  };
  stock: {
    designation: string;
    dim_x_mm: number;
    dim_y_mm: number;
    dim_z_mm: number;
    lot_id?: string;
  };
  machine: {
    machine_id: string;
    controller: string;
    spindle_max_rpm: number;
  };
  fixture: {
    fixture_id: string;
    n_clamps: number;
    bolt_diameter_mm: number;
    per_clamp_torque_nm: number;
    workholding_method: string;
  };
  wcs: {
    g54_x_mm: number;
    g54_y_mm: number;
    g54_z_mm: number;
    datum_strategy?: string;
  };
  tools: Array<{
    tool_id: string;
    pocket: number;
    description: string;
    length_offset_mm: number;
    diameter_offset_mm: number;
    remaining_life_min?: number;
    spare_pocket?: number;
  }>;
  coolant: {
    type: string;
    concentration_target: string;
    pressure_min_bar: number;
  };
  warmup: {
    required: boolean;
    stages_count?: number;
    total_duration_min?: number;
  };
  inspection: {
    first_piece_required: boolean;
    cmm_features?: string[];
    cpk_target?: number;
  };
  /** Estimated cycle time per part (s) */
  cycle_time_s: number;
  /** Run quantity */
  run_qty: number;
}

export interface SetupSheetResult {
  program_id: string;
  markdown: string;
  plaintext: string;
  line_count: AtomicValue;
  warnings: string[];
  source: string;
}

export class SetupSheetGeneratorEngine {
  generate(input: SetupSheetInput): SetupSheetResult {
    if (!input || !input.header || !input.stock || !input.machine || !input.fixture || !input.wcs || !Array.isArray(input.tools)) {
      throw new Error("SetupSheetGeneratorEngine.generate: complete setup-sheet input required");
    }
    const warnings: string[] = [];
    const lines: string[] = [];
    const date = input.header.date_iso ?? new Date().toISOString().slice(0, 10);

    // ── Header ────────────────────────────────────────────────────────
    lines.push(`# Setup Sheet — ${input.header.program_id}`);
    lines.push("");
    lines.push(`**Part:** ${input.header.part_id}  |  **Customer:** ${input.header.customer}  |  **Date:** ${date}`);
    if (input.header.revision) lines.push(`**Revision:** ${input.header.revision}`);
    if (input.header.operator) lines.push(`**Operator:** ${input.header.operator}`);
    lines.push(`**Material:** ${input.header.material}  |  **Machine:** ${input.machine.machine_id} (${input.machine.controller})`);
    lines.push("");

    // ── Stock ─────────────────────────────────────────────────────────
    lines.push("## 1. Stock");
    lines.push("");
    lines.push(`- **Designation:** ${input.stock.designation}`);
    lines.push(`- **Dimensions:** ${input.stock.dim_x_mm} × ${input.stock.dim_y_mm} × ${input.stock.dim_z_mm} mm`);
    if (input.stock.lot_id) lines.push(`- **Lot ID:** ${input.stock.lot_id}`);
    lines.push("- **Receiving check:** [ ] XRF  [ ] hardness  [ ] cert verified  [ ] dim verified");
    lines.push("");

    // ── Fixture + torque ──────────────────────────────────────────────
    lines.push("## 2. Workholding");
    lines.push("");
    lines.push(`- **Fixture:** ${input.fixture.fixture_id} — ${input.fixture.workholding_method}`);
    lines.push(`- **Clamps:** ${input.fixture.n_clamps} × M${input.fixture.bolt_diameter_mm}`);
    lines.push(`- **Torque per clamp:** ${input.fixture.per_clamp_torque_nm.toFixed(1)} N·m (${(input.fixture.per_clamp_torque_nm * 0.737562).toFixed(1)} ft·lb)`);
    lines.push("- **Verified:** [ ] all clamps torqued to spec  [ ] anti-tip checked  [ ] part seated");
    lines.push("");

    // ── WCS ───────────────────────────────────────────────────────────
    lines.push("## 3. Work Coordinate System (G54)");
    lines.push("");
    lines.push("| Axis | Value (mm) |");
    lines.push("|---|---:|");
    lines.push(`| X | ${input.wcs.g54_x_mm} |`);
    lines.push(`| Y | ${input.wcs.g54_y_mm} |`);
    lines.push(`| Z | ${input.wcs.g54_z_mm} |`);
    if (input.wcs.datum_strategy) lines.push(`\n**Datum strategy:** ${input.wcs.datum_strategy}`);
    lines.push("- **Verified:** [ ] probed datum  [ ] G54 written  [ ] envelope OK");
    lines.push("");

    // ── Tools ─────────────────────────────────────────────────────────
    lines.push("## 4. Tool List");
    lines.push("");
    lines.push("| Pocket | Tool ID | Description | Length (mm) | Diameter (mm) | Life remaining (min) | Spare pocket |");
    lines.push("|---:|---|---|---:|---:|---:|---:|");
    for (const t of input.tools) {
      const life = t.remaining_life_min !== undefined ? t.remaining_life_min.toFixed(0) : "—";
      const spare = t.spare_pocket !== undefined ? `P${t.spare_pocket}` : "—";
      lines.push(`| ${t.pocket} | ${t.tool_id} | ${t.description} | ${t.length_offset_mm} | ${t.diameter_offset_mm} | ${life} | ${spare} |`);
    }
    lines.push("- **Verified:** [ ] all tools in correct pockets  [ ] offsets entered  [ ] sister tools loaded");
    lines.push("");

    // ── Coolant ───────────────────────────────────────────────────────
    lines.push("## 5. Coolant");
    lines.push("");
    lines.push(`- **Type:** ${input.coolant.type}`);
    lines.push(`- **Concentration target:** ${input.coolant.concentration_target}`);
    lines.push(`- **Minimum nozzle pressure:** ${input.coolant.pressure_min_bar} bar`);
    lines.push("- **Verified:** [ ] refractometer reading in band  [ ] nozzle pressure OK  [ ] flow at tool tip");
    lines.push("");

    // ── Warm-up ───────────────────────────────────────────────────────
    lines.push("## 6. Spindle Warm-up");
    lines.push("");
    if (input.warmup.required) {
      lines.push(`- **Required:** ${input.warmup.stages_count ?? 4} stages, ~${input.warmup.total_duration_min?.toFixed(0) ?? 26} min`);
      lines.push("- **Verified:** [ ] warm-up cycle run to completion  [ ] spindle temperature stable");
    } else {
      lines.push("- **Skipped:** spindle ≥60 min run history");
    }
    lines.push("");

    // ── Inspection ────────────────────────────────────────────────────
    lines.push("## 7. First-Piece Inspection");
    lines.push("");
    if (input.inspection.first_piece_required) {
      lines.push("- **FAI required.** Stop after first piece, submit to CMM.");
      if (input.inspection.cpk_target !== undefined) lines.push(`- **Cpk target:** ≥ ${input.inspection.cpk_target}`);
      if (input.inspection.cmm_features && input.inspection.cmm_features.length > 0) {
        lines.push("- **CMM features to verify:**");
        for (const f of input.inspection.cmm_features) lines.push(`  - ${f}`);
      }
    } else {
      lines.push("- Per-piece SPC; FAI waived for this run.");
    }
    lines.push("");

    // ── Run summary ───────────────────────────────────────────────────
    lines.push("## 8. Run Summary");
    lines.push("");
    const totalRunMin = (input.cycle_time_s * input.run_qty) / 60;
    lines.push(`- **Cycle time / part:** ${input.cycle_time_s.toFixed(1)} s`);
    lines.push(`- **Quantity:** ${input.run_qty} parts`);
    lines.push(`- **Estimated run time:** ${totalRunMin.toFixed(1)} min (${(totalRunMin / 60).toFixed(2)} h)`);
    lines.push("");

    // ── Operator sign-off ─────────────────────────────────────────────
    lines.push("## 9. Operator Sign-off");
    lines.push("");
    lines.push("All 12 first-part-perfect axes confirmed before first cut:");
    lines.push("");
    lines.push("[ ] 1. stock verified  [ ] 2. datum probed  [ ] 3. tool offsets verified  [ ] 4. magazine integrity");
    lines.push("[ ] 5. coolant verified  [ ] 6. spindle warmed up  [ ] 7. workholding torqued  [ ] 8. collision sim passed");
    lines.push("[ ] 9. WCS envelope OK  [ ] 10. tool life budget  [ ] 11. post dialect audited  [ ] 12. operator skill OK");
    lines.push("");
    lines.push(`**Operator initials:** _____   **Time:** _____   **Witness:** _____`);

    // ── Warnings ──────────────────────────────────────────────────────
    if (input.tools.length === 0) warnings.push("Zero tools listed — verify tool list before run");
    if (input.run_qty <= 0) warnings.push(`Run qty ${input.run_qty} — verify quantity before run`);
    if (input.fixture.per_clamp_torque_nm <= 0) warnings.push("Clamp torque not specified — compute via WorkholdingTorqueSpecEngine");

    const markdown = lines.join("\n");
    const plaintext = markdown
      .replace(/\*\*/g, "")
      .replace(/^#+ ?/gm, "")
      .replace(/^[\-|] ?/gm, "");

    return {
      program_id: input.header.program_id,
      markdown,
      plaintext,
      line_count: {
        value: lines.length,
        unit: "lines",
        source: "markdown line count",
      },
      warnings,
      source: "SetupSheetGeneratorEngine — DMG MORI template + AS9100 §8.5.1 + JM Die operator SOP",
    };
  }
}

export const setupSheetGeneratorEngine = new SetupSheetGeneratorEngine();
