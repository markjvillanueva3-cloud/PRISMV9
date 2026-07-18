import { jsPDF } from "jspdf";
import type {
  ErpQuoteGenerateResult,
  ErpQuoteBreakdownResult,
} from "../types/erp";

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

interface QuotePdfOptions {
  quote: ErpQuoteGenerateResult;
  breakdown?: ErpQuoteBreakdownResult | null;
  companyName?: string;
  validityDays?: number;
}

/**
 * Generate a PDF quote document and trigger download.
 */
export function generateQuotePdf({
  quote,
  breakdown,
  companyName = "Kienzle Manufacturing",
  validityDays = 30,
}: QuotePdfOptions): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ---- Header ----
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Manufacturing Quote", 15, y);

  doc.setFontSize(10);
  doc.text(`Quote #${quote.quote_id}`, pageWidth - 15, y, { align: "right" });
  y += 4;

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`Date: ${dateStr}`, pageWidth - 15, y, { align: "right" });
  y += 8;

  // ---- Divider ----
  doc.setDrawColor(200);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // ---- Summary ----
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Quote Summary", 15, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const summaryRows: [string, string][] = [
    ["Total Cost", `$${quote.total_cost.toFixed(2)}`],
    ["Unit Cost", `$${quote.unit_cost.toFixed(2)}`],
    ["Quantity", String(quote.quantity)],
    ["Lead Time", `${quote.lead_time_days} days`],
    ["Material Cost", `$${quote.material_cost.toFixed(2)}`],
    ["Labor Cost", `$${quote.labor_cost.toFixed(2)}`],
    ["Overhead Cost", `$${quote.overhead_cost.toFixed(2)}`],
    ["Margin", `${quote.margin_pct.toFixed(1)}%`],
  ];

  for (const [label, value] of summaryRows) {
    doc.setTextColor(100);
    doc.text(label, 20, y);
    doc.setTextColor(0);
    doc.text(value, 80, y);
    y += 5;
  }
  y += 5;

  // ---- Operations table ----
  if (quote.line_items.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Operations", 15, y);
    y += 7;

    // Table header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text("Operation", 20, y);
    doc.text("Machine", 65, y);
    doc.text("Cycle (min)", 105, y);
    doc.text("Setup (min)", 130, y);
    doc.text("Cost", 160, y);
    y += 2;

    doc.setDrawColor(220);
    doc.line(20, y, pageWidth - 15, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    for (const item of quote.line_items) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.operation, 20, y);
      doc.text(item.machine, 65, y);
      doc.text(String(item.cycle_time_min), 105, y);
      doc.text(String(item.setup_time_min), 130, y);
      doc.text(`$${item.cost.toFixed(2)}`, 160, y);
      y += 5;
    }
    y += 5;
  }

  // ---- Cost breakdown ----
  if (breakdown && breakdown.categories.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Cost Breakdown", 15, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text("Category", 20, y);
    doc.text("Amount", 100, y);
    doc.text("%", 140, y);
    y += 2;
    doc.line(20, y, pageWidth - 15, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);

    for (const cat of breakdown.categories) {
      doc.text(cat.category, 20, y);
      doc.text(`$${cat.amount.toFixed(2)}`, 100, y);
      doc.text(`${cat.pct.toFixed(1)}%`, 140, y);
      y += 5;
    }

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.text("Total", 20, y);
    doc.text(`$${breakdown.total.toFixed(2)} ${breakdown.currency}`, 100, y);
    y += 8;
  }

  // ---- Terms ----
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(200);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Terms & Conditions", 15, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  const terms = [
    `This quote is valid for ${validityDays} days from the date of issue.`,
    "Prices are subject to material availability at time of order.",
    "Lead times begin from receipt of purchase order and material.",
    "Payment terms: Net 30 days from date of invoice.",
    "Tolerances per drawing unless otherwise specified.",
  ];

  for (const term of terms) {
    doc.text(`• ${term}`, 20, y);
    y += 4;
  }

  // ---- Warnings ----
  if (quote.warnings.length > 0) {
    y += 3;
    doc.setTextColor(180, 100, 0);
    for (const w of quote.warnings) {
      doc.text(`⚠ ${w}`, 20, y);
      y += 4;
    }
  }

  // ---- Download ----
  doc.save(`quote-${quote.quote_id}.pdf`);
}
