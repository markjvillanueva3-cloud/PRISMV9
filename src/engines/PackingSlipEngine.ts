/**
 * PackingSlipEngine.ts — CAMX-MS21 U05 Professional Packing Slip Generation
 * ============================================================================
 *
 * Generates professional packing slips for shipping manufactured parts.
 * Three output formats:
 *
 *   1. **markdown**  — Rich markdown for chat/web display
 *   2. **json**      — Structured data for ERP integration
 *   3. **printable** — ASCII box-drawing for physical printing
 *                      (matches SetupSheetEngine printable format)
 *
 * Packing slip numbering: PS-YYYYMMDD-NNN (auto-increment per day)
 * ITAR marking applied automatically when any line item is ITAR-controlled.
 *
 * @shortcode E1089
 * @version 1.0.0 — CAMX-MS21 U05
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PackingSlipFormat = "markdown" | "json" | "printable";

/** A single line item on the packing slip. */
export interface PackingSlipLineItem {
  /** Customer or internal part number */
  part_number: string;
  /** Drawing revision (e.g. "B", "C2") */
  revision: string;
  /** Human-readable part description */
  description: string;
  /** Quantity originally ordered */
  quantity_ordered: number;
  /** Quantity actually shipped in this shipment */
  quantity_shipped: number;
  /** Raw material used (e.g. "6061-T6 Aluminum") */
  material: string;
  /** Material cert / heat number reference */
  material_cert_ref: string;
  /** Whether this part is ITAR-controlled */
  itar_controlled?: boolean;
  /** First Article Inspection reference number, if applicable */
  fai_reference?: string;
  /** Inspection result: true = pass, false = fail */
  inspection_pass?: boolean;
}

/** Ship-to address block. */
export interface ShipToAddress {
  customer_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

/** Ship-from address block. */
export interface ShipFromAddress {
  shop_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

/** Footer / logistics data. */
export interface PackingSlipFooter {
  packed_by: string;
  checked_by: string;
  weight_lbs?: number;
  box_count?: number;
  carrier?: string;
  tracking_number?: string;
}

/** Full input structure for packing slip generation. */
export interface PackingSlipInput {
  /** Customer PO number */
  customer_po: string;
  ship_to: ShipToAddress;
  ship_from: ShipFromAddress;
  line_items: PackingSlipLineItem[];
  footer: PackingSlipFooter;
  /** Special handling notes */
  notes?: string[];
  /** Hazardous material flag */
  hazmat?: boolean;
  /** Override auto-generated slip number */
  slip_number?: string;
  /** Override date (ISO date string) */
  date?: string;
  format?: PackingSlipFormat;
}

/** Fully generated packing slip. */
export interface PackingSlipResult {
  slip_number: string;
  date: string;
  customer_po: string;
  ship_to: ShipToAddress;
  ship_from: ShipFromAddress;
  line_items: PackingSlipLineItem[];
  footer: PackingSlipFooter;
  notes: string[];
  hazmat: boolean;
  itar_required: boolean;
  format: PackingSlipFormat;
  rendered: string;
  locked: boolean;
}

// ─── Packing Slip Numbering ──────────────────────────────────────────────────

/** Per-day counter: resets each calendar day. */
const _dayCounters = new Map<string, number>();

function generateSlipNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = (now.getMonth() + 1).toString().padStart(2, "0");
  const dd = now.getDate().toString().padStart(2, "0");
  const dayKey = `${yyyy}${mm}${dd}`;
  const seq = (_dayCounters.get(dayKey) ?? 0) + 1;
  _dayCounters.set(dayKey, seq);
  return `PS-${dayKey}-${seq.toString().padStart(3, "0")}`;
}

// ─── Slip Store (for addLineItem / finalize) ─────────────────────────────────

/** In-memory store keyed by slip_number. */
const _slipStore = new Map<string, PackingSlipResult>();

// ─── ASCII Helpers (mirrors SetupSheetEngine style) ─────────────────────────

const W = 64; // inner box width

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function row(content: string): string {
  return `| ${pad(content, W - 1)}|`;
}

function twoCol(left: string, right: string): string {
  const half = Math.floor((W - 3) / 2);
  return `| ${pad(left, half)} | ${pad(right, half)} |`;
}

// ─── Renderers ───────────────────────────────────────────────────────────────

function renderPrintable(slip: PackingSlipResult): string {
  const line  = "+" + "-".repeat(W) + "+";
  const dline = "+" + "=".repeat(W) + "+";
  const lines: string[] = [];

  // Header
  lines.push(line);
  lines.push(row(`PRISM MANUFACTURING                   PACKING SLIP`));
  lines.push(row(`[LOGO]                         Slip #: ${slip.slip_number}`));
  lines.push(row(`                                 Date: ${slip.date}`));
  lines.push(row(`                                   PO: ${slip.customer_po}`));
  lines.push(dline);

  // Ship-from / Ship-to
  const sf = slip.ship_from;
  const st = slip.ship_to;
  lines.push(twoCol("SHIP FROM:", "SHIP TO:"));
  lines.push(twoCol(sf.shop_name, st.customer_name));
  lines.push(twoCol(sf.address_line1, st.address_line1));
  if (sf.address_line2 || st.address_line2) {
    lines.push(twoCol(sf.address_line2 ?? "", st.address_line2 ?? ""));
  }
  lines.push(twoCol(`${sf.city}, ${sf.state} ${sf.zip}`, `${st.city}, ${st.state} ${st.zip}`));
  if (sf.country || st.country) {
    lines.push(twoCol(sf.country ?? "", st.country ?? ""));
  }
  if (st.contact_name) {
    lines.push(twoCol("", `Attn: ${st.contact_name}`));
  }
  if (st.contact_phone) {
    lines.push(twoCol("", `Tel:  ${st.contact_phone}`));
  }
  lines.push(dline);

  // Line items header
  lines.push(row("LINE ITEMS"));
  lines.push("| " + "-".repeat(W - 2) + " |");
  const colHdr = `${"PART #".padEnd(14)} ${"REV".padEnd(4)} ${"ORD".padEnd(5)} ${"SHIP".padEnd(5)} INSP  DESCRIPTION`;
  lines.push(row(colHdr));
  lines.push("| " + "-".repeat(W - 2) + " |");

  for (const item of slip.line_items) {
    const insp = item.inspection_pass === undefined ? "N/A " : item.inspection_pass ? "PASS" : "FAIL";
    const lineStr = `${pad(item.part_number, 14)} ${pad(item.revision, 4)} ${pad(item.quantity_ordered.toString(), 5)} ${pad(item.quantity_shipped.toString(), 5)} ${insp}  ${item.description}`;
    lines.push(row(lineStr));
    if (item.material_cert_ref) {
      lines.push(row(`  Cert: ${item.material_cert_ref}  Mat: ${item.material}`));
    }
    if (item.fai_reference) {
      lines.push(row(`  FAI: ${item.fai_reference} (First Article)`));
    }
    if (item.itar_controlled) {
      lines.push(row(`  *** ITAR CONTROLLED ***`));
    }
  }

  lines.push(dline);

  // Inspection summary
  lines.push(row("INSPECTION SUMMARY"));
  lines.push("| " + "-".repeat(W - 2) + " |");
  for (const item of slip.line_items) {
    const status = item.inspection_pass === undefined ? "Not recorded" : item.inspection_pass ? "PASS" : "FAIL";
    const fai = item.fai_reference ? `  [FAI: ${item.fai_reference}]` : "";
    lines.push(row(`  ${pad(item.part_number, 16)} Rev ${item.revision}  ${status}${fai}`));
  }
  lines.push(dline);

  // ITAR warning
  if (slip.itar_required) {
    lines.push(row("*** ITAR WARNING ***"));
    lines.push(row("This shipment contains items subject to ITAR (22 CFR 120-130)."));
    lines.push(row("Export, re-export, or transfer to foreign persons is prohibited"));
    lines.push(row("without prior U.S. government authorization."));
    lines.push(dline);
  }

  // Hazmat warning
  if (slip.hazmat) {
    lines.push(row("*** HAZARDOUS MATERIAL ***"));
    lines.push(row("This shipment contains hazardous material. Handle per regulations."));
    lines.push(dline);
  }

  // Notes
  if (slip.notes.length > 0) {
    lines.push(row("SPECIAL NOTES"));
    lines.push("| " + "-".repeat(W - 2) + " |");
    for (const note of slip.notes) {
      lines.push(row(`  - ${note}`));
    }
    lines.push(dline);
  }

  // Footer
  const ft = slip.footer;
  lines.push(row("SHIPPING DETAILS"));
  lines.push("| " + "-".repeat(W - 2) + " |");
  lines.push(twoCol(`Packed by:   ${ft.packed_by}`, `Checked by: ${ft.checked_by}`));
  lines.push(twoCol(`Boxes: ${ft.box_count ?? "N/A"}`, `Weight: ${ft.weight_lbs != null ? ft.weight_lbs + " lbs" : "N/A"}`));
  lines.push(twoCol(`Carrier: ${ft.carrier ?? "N/A"}`, `Tracking: ${ft.tracking_number ?? "N/A"}`));
  lines.push(line);
  lines.push(row(`Generated by PRISM Manufacturing Intelligence`));
  lines.push(line);

  return lines.join("\n");
}

function renderMarkdown(slip: PackingSlipResult): string {
  const lines: string[] = [];
  const sf = slip.ship_from;
  const st = slip.ship_to;
  const ft = slip.footer;

  lines.push(`# Packing Slip ${slip.slip_number}`);
  lines.push("");

  // Header table
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Slip # | ${slip.slip_number} |`);
  lines.push(`| Date | ${slip.date} |`);
  lines.push(`| Customer PO | ${slip.customer_po} |`);
  lines.push("");

  // Addresses
  lines.push("## Addresses");
  lines.push("");
  lines.push("| Ship From | Ship To |");
  lines.push("|-----------|---------|");
  lines.push(`| **${sf.shop_name}** | **${st.customer_name}** |`);
  lines.push(`| ${sf.address_line1} | ${st.address_line1} |`);
  if (sf.address_line2 || st.address_line2) {
    lines.push(`| ${sf.address_line2 ?? ""} | ${st.address_line2 ?? ""} |`);
  }
  lines.push(`| ${sf.city}, ${sf.state} ${sf.zip} | ${st.city}, ${st.state} ${st.zip} |`);
  if (sf.country || st.country) {
    lines.push(`| ${sf.country ?? ""} | ${st.country ?? ""} |`);
  }
  if (st.contact_name) {
    lines.push(`| | Attn: ${st.contact_name} |`);
  }
  lines.push("");

  // Line items
  lines.push("## Line Items");
  lines.push("");
  lines.push("| Part # | Rev | Ordered | Shipped | Material | Cert Ref | Inspection |");
  lines.push("|--------|-----|---------|---------|----------|----------|------------|");
  for (const item of slip.line_items) {
    const insp = item.inspection_pass === undefined ? "N/A" : item.inspection_pass ? "PASS" : "FAIL";
    lines.push(`| ${item.part_number} | ${item.revision} | ${item.quantity_ordered} | ${item.quantity_shipped} | ${item.material} | ${item.material_cert_ref} | ${insp} |`);
  }
  lines.push("");

  // Inspection details (FAI, ITAR flags)
  const faiItems = slip.line_items.filter(i => i.fai_reference);
  if (faiItems.length > 0) {
    lines.push("### First Article Inspection");
    lines.push("");
    for (const item of faiItems) {
      lines.push(`- **${item.part_number}** Rev ${item.revision}: FAI Ref ${item.fai_reference}`);
    }
    lines.push("");
  }

  // ITAR warning
  if (slip.itar_required) {
    lines.push("> **ITAR WARNING:** This shipment contains items subject to ITAR (22 CFR 120-130). Export, re-export, or transfer to foreign persons is prohibited without prior U.S. government authorization.");
    lines.push("");
  }

  // Hazmat
  if (slip.hazmat) {
    lines.push("> **HAZARDOUS MATERIAL:** This shipment contains hazardous material. Handle per applicable regulations.");
    lines.push("");
  }

  // Notes
  if (slip.notes.length > 0) {
    lines.push("## Special Notes");
    lines.push("");
    for (const note of slip.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("## Shipping Details");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Packed by | ${ft.packed_by} |`);
  lines.push(`| Checked by | ${ft.checked_by} |`);
  lines.push(`| Box count | ${ft.box_count ?? "N/A"} |`);
  lines.push(`| Weight | ${ft.weight_lbs != null ? ft.weight_lbs + " lbs" : "N/A"} |`);
  lines.push(`| Carrier | ${ft.carrier ?? "N/A"} |`);
  lines.push(`| Tracking # | ${ft.tracking_number ?? "N/A"} |`);
  lines.push("");
  lines.push("---");
  lines.push("*Generated by PRISM Manufacturing Intelligence*");

  return lines.join("\n");
}

// ─── Core Build Function ─────────────────────────────────────────────────────

/**
 * Build a PackingSlipResult from a PackingSlipInput.
 * Detects ITAR requirement automatically from line items.
 * @param input - packing slip input data
 * @returns fully rendered PackingSlipResult
 */
export function buildPackingSlip(input: PackingSlipInput): PackingSlipResult {
  const format: PackingSlipFormat = input.format ?? "markdown";
  const slip_number = input.slip_number ?? generateSlipNumber();
  const date = input.date ?? new Date().toISOString().split("T")[0];
  const itar_required = input.line_items.some(i => i.itar_controlled === true);
  const hazmat = input.hazmat ?? false;
  const notes: string[] = [...(input.notes ?? [])];

  const slip: PackingSlipResult = {
    slip_number,
    date,
    customer_po: input.customer_po,
    ship_to: input.ship_to,
    ship_from: input.ship_from,
    line_items: input.line_items,
    footer: input.footer,
    notes,
    hazmat,
    itar_required,
    format,
    rendered: "",
    locked: false,
  };

  // Render
  if (format === "printable") {
    slip.rendered = renderPrintable(slip);
  } else if (format === "markdown") {
    slip.rendered = renderMarkdown(slip);
  } else {
    slip.rendered = JSON.stringify(slip, null, 2);
  }

  return slip;
}

// ─── PackingSlipEngine Class ─────────────────────────────────────────────────

/**
 * PackingSlipEngine — E1089
 *
 * Generates, mutates, and finalizes professional packing slips for
 * shipping manufactured parts.
 */
export class PackingSlipEngine {
  /**
   * Generate a new packing slip from the given input.
   * @param input - full packing slip input
   * @returns the generated PackingSlipResult
   */
  generate(input: PackingSlipInput): PackingSlipResult {
    const slip = buildPackingSlip(input);
    _slipStore.set(slip.slip_number, slip);
    return slip;
  }

  /**
   * Add a line item to an existing (unlocked) slip.
   * Re-renders the slip after adding.
   * @param slip_id - the slip_number of the target slip
   * @param item - the line item to add
   * @returns the updated PackingSlipResult
   */
  addLineItem(slip_id: string, item: PackingSlipLineItem): PackingSlipResult {
    const slip = _slipStore.get(slip_id);
    if (!slip) throw new Error(`PackingSlipEngine: slip "${slip_id}" not found`);
    if (slip.locked) throw new Error(`PackingSlipEngine: slip "${slip_id}" is locked`);

    slip.line_items.push(item);
    // Recheck ITAR
    (slip as any).itar_required = slip.line_items.some(i => i.itar_controlled === true);

    // Re-render
    if (slip.format === "printable") {
      slip.rendered = renderPrintable(slip);
    } else if (slip.format === "markdown") {
      slip.rendered = renderMarkdown(slip);
    } else {
      slip.rendered = JSON.stringify(slip, null, 2);
    }

    return slip;
  }

  /**
   * Finalize (lock) a slip.  After this, no further mutations are allowed.
   * Returns the finalized slip with its permanent packing slip number.
   * @param slip_id - the slip_number of the target slip
   * @returns the finalized PackingSlipResult
   */
  finalize(slip_id: string): PackingSlipResult {
    const slip = _slipStore.get(slip_id);
    if (!slip) throw new Error(`PackingSlipEngine: slip "${slip_id}" not found`);
    (slip as any).locked = true;
    return slip;
  }

  /**
   * Dispatcher entry point.
   * @param action - one of: packing_slip_generate, packing_slip_add_item, packing_slip_finalize
   * @param params - action parameters
   */
  dispatch(action: string, params: Record<string, any>): any {
    switch (action) {
      case "packing_slip_generate":
        return this.generate(params as PackingSlipInput);

      case "packing_slip_add_item": {
        const { slip_id, item } = params;
        if (!slip_id) throw new Error(`packing_slip_add_item: slip_id required`);
        if (!item) throw new Error(`packing_slip_add_item: item required`);
        return this.addLineItem(slip_id as string, item as PackingSlipLineItem);
      }

      case "packing_slip_finalize": {
        const { slip_id } = params;
        if (!slip_id) throw new Error(`packing_slip_finalize: slip_id required`);
        return this.finalize(slip_id as string);
      }

      default:
        throw new Error(`PackingSlipEngine: unknown action "${action}"`);
    }
  }
}

// ─── Singleton Export (E1089) ─────────────────────────────────────────────────

/** Singleton instance — E1089 */
export const packingSlipEngine = new PackingSlipEngine();
