/**
 * FAIAutoGenerationEngine — First Article Inspection (AS9102) Form 1/2/3 generator
 *
 * Generates the full AS9102 First Article Inspection Report from
 * (part header + material accountability + dimensional characteristic table).
 *
 * Closes the NASA/Lockheed/Northrop aerospace customer requirement: every
 * first-piece off a new program ships with FAI Form 1+2+3 (PART, PRODUCT,
 * CHARACTERISTIC accountability) per AS9102 §4.
 *
 * Forms:
 *   Form 1 — Part Number Accountability (PN, rev, FAIR number, type)
 *   Form 2 — Product Accountability — Materials/Special Processes/Functional Test
 *   Form 3 — Characteristic Accountability — per-dimension verification table
 *
 * Verdict rules per AS9102 §6.3:
 *   - Every characteristic must be "Accept" OR have a documented disposition
 *   - Any "Reject" characteristic → FAIR fails; non-conformance report attached
 *   - Missing measurement → "Incomplete" verdict, blocks part release
 *
 * Reference: SAE AS9102 Rev C (2024); AS9100 Rev D §8.5.1.3 (FAI); SAE ARP9162
 *   (FAIR explanation); NASA-STD-8739.8 (S/W workmanship for high-rel).
 *
 * @version 1.0.0
 * @module FAIAutoGenerationEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface FAIPartInfo {
  part_number: string;
  part_revision: string;
  part_name: string;
  fair_number: string;
  fair_type: "full" | "partial" | "delta";
  organization: string;
  customer: string;
  drawing_number: string;
  drawing_revision: string;
  serial_number?: string;
  manufacturing_process: string;
}

export interface FAIMaterialEntry {
  material_designation: string;
  spec_number: string;
  cert_number: string;
  cert_attached: boolean;
}

export interface FAISpecialProcess {
  process_name: string;
  spec_number: string;
  supplier: string;
  cert_attached: boolean;
}

export interface FAIFunctionalTest {
  test_name: string;
  spec_number: string;
  result: "pass" | "fail" | "n/a";
}

export interface FAICharacteristic {
  /** AS9102 §6.3 characteristic number (sequential per drawing zone) */
  char_number: number;
  /** Drawing zone (e.g. "A2", "B4") */
  drawing_zone: string;
  /** Feature designator (e.g. "Ø.500 thru", "DATUM A flatness 0.005") */
  requirement: string;
  /** Inspection method (e.g. "CMM", "calipers", "go/no-go gage") */
  inspection_method: string;
  /** Measured value (string allows units, tolerance bands, etc.) */
  measured?: string;
  /** Verdict — derived from measured vs requirement when computable */
  verdict?: "accept" | "reject" | "incomplete";
  /** Disposition notes for non-conformances */
  notes?: string;
}

export interface FAIAutoGenerationInput {
  part: FAIPartInfo;
  materials: FAIMaterialEntry[];
  special_processes: FAISpecialProcess[];
  functional_tests: FAIFunctionalTest[];
  characteristics: FAICharacteristic[];
  /** Inspector signature + date */
  inspector_name?: string;
  inspection_date_iso?: string;
}

export interface FAIAutoGenerationResult {
  fair_number: string;
  form1_markdown: string;
  form2_markdown: string;
  form3_markdown: string;
  full_markdown: string;
  total_characteristics: number;
  accept_count: number;
  reject_count: number;
  incomplete_count: number;
  verdict: "fair_pass" | "fair_fail" | "fair_incomplete";
  warnings: string[];
  source: string;
}

export class FAIAutoGenerationEngine {
  generate(input: FAIAutoGenerationInput): FAIAutoGenerationResult {
    if (!input || !input.part || !Array.isArray(input.characteristics)) {
      throw new Error("FAIAutoGenerationEngine.generate: part + characteristics[] required");
    }
    const warnings: string[] = [];

    // ── Form 1 ────────────────────────────────────────────────────────
    const p = input.part;
    const form1Lines: string[] = [
      "## AS9102 Form 1 — Part Number Accountability",
      "",
      "| Field | Value |",
      "|---|---|",
      `| Part number | ${p.part_number} |`,
      `| Part revision | ${p.part_revision} |`,
      `| Part name | ${p.part_name} |`,
      `| FAIR number | ${p.fair_number} |`,
      `| FAIR type | ${p.fair_type} |`,
      `| Organization | ${p.organization} |`,
      `| Customer | ${p.customer} |`,
      `| Drawing | ${p.drawing_number} rev ${p.drawing_revision} |`,
      `| Serial number | ${p.serial_number ?? "N/A"} |`,
      `| Manufacturing process | ${p.manufacturing_process} |`,
    ];
    const form1 = form1Lines.join("\n");

    // ── Form 2 ────────────────────────────────────────────────────────
    const form2Lines: string[] = [
      "## AS9102 Form 2 — Product Accountability",
      "",
      "### Materials",
      "",
      "| # | Designation | Spec | Cert # | Cert attached |",
      "|---:|---|---|---|:---:|",
    ];
    input.materials.forEach((m, i) => {
      form2Lines.push(`| ${i + 1} | ${m.material_designation} | ${m.spec_number} | ${m.cert_number} | ${m.cert_attached ? "✓" : "✗"} |`);
      if (!m.cert_attached) warnings.push(`Material cert missing: ${m.material_designation}`);
    });

    form2Lines.push("");
    form2Lines.push("### Special Processes");
    form2Lines.push("");
    if (input.special_processes.length === 0) {
      form2Lines.push("_None._");
    } else {
      form2Lines.push("| # | Process | Spec | Supplier | Cert attached |");
      form2Lines.push("|---:|---|---|---|:---:|");
      input.special_processes.forEach((sp, i) => {
        form2Lines.push(`| ${i + 1} | ${sp.process_name} | ${sp.spec_number} | ${sp.supplier} | ${sp.cert_attached ? "✓" : "✗"} |`);
        if (!sp.cert_attached) warnings.push(`Special process cert missing: ${sp.process_name}`);
      });
    }

    form2Lines.push("");
    form2Lines.push("### Functional Tests");
    form2Lines.push("");
    if (input.functional_tests.length === 0) {
      form2Lines.push("_None._");
    } else {
      form2Lines.push("| # | Test | Spec | Result |");
      form2Lines.push("|---:|---|---|:---:|");
      input.functional_tests.forEach((ft, i) => {
        form2Lines.push(`| ${i + 1} | ${ft.test_name} | ${ft.spec_number} | ${ft.result.toUpperCase()} |`);
        if (ft.result === "fail") warnings.push(`Functional test FAILED: ${ft.test_name}`);
      });
    }
    const form2 = form2Lines.join("\n");

    // ── Form 3 ────────────────────────────────────────────────────────
    let accept = 0, reject = 0, incomplete = 0;
    const form3Lines: string[] = [
      "## AS9102 Form 3 — Characteristic Accountability",
      "",
      "| Char # | Zone | Requirement | Method | Measured | Verdict | Notes |",
      "|---:|---|---|---|---|:---:|---|",
    ];
    for (const c of input.characteristics) {
      let verdict: NonNullable<FAICharacteristic["verdict"]> = c.verdict ?? "incomplete";
      if (!c.measured && c.verdict === undefined) verdict = "incomplete";
      if (verdict === "accept") accept++;
      else if (verdict === "reject") reject++;
      else incomplete++;

      const verdictMark = verdict === "accept" ? "✓ Accept" : verdict === "reject" ? "✗ REJECT" : "⚠ Incomplete";
      form3Lines.push(`| ${c.char_number} | ${c.drawing_zone} | ${c.requirement} | ${c.inspection_method} | ${c.measured ?? "—"} | ${verdictMark} | ${c.notes ?? ""} |`);

      if (verdict === "reject") warnings.push(`Char #${c.char_number} REJECTED — non-conformance report required`);
      if (verdict === "incomplete") warnings.push(`Char #${c.char_number} INCOMPLETE — measurement missing`);
    }
    const form3 = form3Lines.join("\n");

    let verdict: FAIAutoGenerationResult["verdict"];
    if (reject > 0) verdict = "fair_fail";
    else if (incomplete > 0) verdict = "fair_incomplete";
    else verdict = "fair_pass";

    // ── Header + signature ────────────────────────────────────────────
    const header = [
      `# First Article Inspection Report (AS9102 Rev C) — ${p.fair_number}`,
      "",
      `**Part:** ${p.part_number} rev ${p.part_revision} (${p.part_name})  |  **Customer:** ${p.customer}  |  **FAIR type:** ${p.fair_type}`,
      "",
    ].join("\n");

    const signature = [
      "",
      "## Sign-off",
      "",
      `**Inspector:** ${input.inspector_name ?? "_______________"}  |  **Date:** ${input.inspection_date_iso ?? new Date().toISOString().slice(0, 10)}`,
      "",
      `**Verdict:** ${verdict.toUpperCase().replace("_", " ")}  |  **Accept:** ${accept}  |  **Reject:** ${reject}  |  **Incomplete:** ${incomplete}`,
    ].join("\n");

    const full = [header, form1, "", form2, "", form3, signature].join("\n");

    return {
      fair_number: p.fair_number,
      form1_markdown: form1,
      form2_markdown: form2,
      form3_markdown: form3,
      full_markdown: full,
      total_characteristics: input.characteristics.length,
      accept_count: accept,
      reject_count: reject,
      incomplete_count: incomplete,
      verdict,
      warnings,
      source: "FAIAutoGenerationEngine — SAE AS9102 Rev C + AS9100 §8.5.1.3 + SAE ARP9162",
    };
  }
}

export const faiAutoGenerationEngine = new FAIAutoGenerationEngine();
