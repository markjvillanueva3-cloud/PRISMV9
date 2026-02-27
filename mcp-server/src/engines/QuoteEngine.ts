/**
 * QuoteEngine — Manufacturing Intelligence Layer
 *
 * Generates customer quotations from cost estimates, adding markup,
 * lead time calculation, quantity breaks, and terms.
 *
 * Actions: quote_generate, quote_quantity_breaks, quote_margin_analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteInput {
  customer_name: string;
  part_name: string;
  quantity: number;
  cost_per_part: number;
  setup_cost: number;
  material_cost_per_part: number;
  cycle_time_min: number;
  num_setups: number;
  complexity: "simple" | "moderate" | "complex" | "extreme";
  urgency: "standard" | "rush" | "emergency";
  repeat_order?: boolean;
}

export interface Quote {
  quote_number: string;
  customer: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  markup_pct: number;
  margin_pct: number;
  line_items: QuoteLineItem[];
  terms: string[];
  valid_days: number;
  notes: string[];
}

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface QuantityBreak {
  quantity: number;
  unit_price: number;
  total_price: number;
  savings_pct: number;
  lead_time_days: number;
}

export interface MarginAnalysis {
  cost_per_part: number;
  quoted_price: number;
  margin_pct: number;
  breakeven_quantity: number;
  profit_at_quoted: number;
  scenarios: { markup_pct: number; unit_price: number; margin_pct: number; total_profit: number }[];
}

// ============================================================================
// PRICING LOGIC
// ============================================================================

const COMPLEXITY_MARKUP: Record<string, number> = { simple: 1.25, moderate: 1.40, complex: 1.60, extreme: 2.00 };
const URGENCY_MARKUP: Record<string, number> = { standard: 1.0, rush: 1.35, emergency: 1.75 };
const QUANTITY_DISCOUNT_BREAKS = [
  { min: 1, discount: 0 },
  { min: 10, discount: 0.05 },
  { min: 50, discount: 0.10 },
  { min: 100, discount: 0.15 },
  { min: 500, discount: 0.20 },
  { min: 1000, discount: 0.25 },
];

function getQuantityDiscount(qty: number): number {
  let discount = 0;
  for (const b of QUANTITY_DISCOUNT_BREAKS) {
    if (qty >= b.min) discount = b.discount;
  }
  return discount;
}

function estimateLeadTime(quantity: number, cycleTimeMin: number, numSetups: number, urgency: string): number {
  const machineHours = (quantity * cycleTimeMin) / 60;
  const setupHours = numSetups * 2;
  const totalHours = machineHours + setupHours;
  const daysAtCapacity = totalHours / 16; // 2-shift

  // Add queue time
  let queueDays: number;
  if (urgency === "emergency") queueDays = 1;
  else if (urgency === "rush") queueDays = 3;
  else queueDays = 7;

  // Add inspection + shipping
  const inspDays = quantity > 100 ? 2 : 1;
  return Math.ceil(daysAtCapacity + queueDays + inspDays);
}

function generateQuoteNumber(): string {
  const d = new Date();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `Q-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${seq}`;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class QuoteEngine {
  generate(input: QuoteInput): Quote {
    const complexityMark = COMPLEXITY_MARKUP[input.complexity] || 1.40;
    const urgencyMark = URGENCY_MARKUP[input.urgency] || 1.0;
    const qtyDiscount = getQuantityDiscount(input.quantity);
    const repeatDiscount = input.repeat_order ? 0.05 : 0;

    const totalMarkup = complexityMark * urgencyMark;
    const totalDiscount = qtyDiscount + repeatDiscount;
    const effectiveMarkup = totalMarkup * (1 - totalDiscount);

    const unitPrice = Math.round(input.cost_per_part * effectiveMarkup * 100) / 100;
    const setupCharge = Math.round(input.setup_cost * complexityMark * 100) / 100;
    const totalPrice = Math.round((unitPrice * input.quantity + setupCharge) * 100) / 100;

    const marginPct = Math.round(((unitPrice - input.cost_per_part) / unitPrice) * 10000) / 100;
    const leadTime = estimateLeadTime(input.quantity, input.cycle_time_min, input.num_setups, input.urgency);

    const lineItems: QuoteLineItem[] = [
      { description: `${input.part_name} — machined part`, quantity: input.quantity, unit_cost: unitPrice, total: Math.round(unitPrice * input.quantity * 100) / 100 },
      { description: "Setup charge", quantity: 1, unit_cost: setupCharge, total: setupCharge },
    ];

    const terms: string[] = [
      "Net 30 days",
      "FOB shipping point",
      `Material certification: standard mill cert`,
      input.urgency === "standard" ? "Standard lead time" : `${input.urgency.toUpperCase()} surcharge applied`,
    ];

    const notes: string[] = [];
    if (qtyDiscount > 0) notes.push(`Quantity discount: ${(qtyDiscount * 100).toFixed(0)}%`);
    if (repeatDiscount > 0) notes.push("Repeat order discount: 5%");

    return {
      quote_number: generateQuoteNumber(), customer: input.customer_name,
      part_name: input.part_name, quantity: input.quantity,
      unit_price: unitPrice, total_price: totalPrice,
      lead_time_days: leadTime,
      markup_pct: Math.round((effectiveMarkup - 1) * 10000) / 100,
      margin_pct: marginPct, line_items: lineItems,
      terms, valid_days: 30, notes,
    };
  }

  quantityBreaks(input: QuoteInput, quantities: number[]): QuantityBreak[] {
    const baseQuote = this.generate(input);
    return quantities.map(qty => {
      const q = this.generate({ ...input, quantity: qty });
      const savings = Math.round(((baseQuote.unit_price - q.unit_price) / baseQuote.unit_price) * 10000) / 100;
      return {
        quantity: qty, unit_price: q.unit_price,
        total_price: q.total_price, savings_pct: Math.max(0, savings),
        lead_time_days: q.lead_time_days,
      };
    });
  }

  marginAnalysis(input: QuoteInput): MarginAnalysis {
    const quote = this.generate(input);
    const profit = (quote.unit_price - input.cost_per_part) * input.quantity;
    const breakeven = input.setup_cost > 0
      ? Math.ceil(input.setup_cost / (quote.unit_price - input.cost_per_part))
      : 1;

    const scenarios = [20, 30, 40, 50, 60, 80].map(markup => {
      const price = Math.round(input.cost_per_part * (1 + markup / 100) * 100) / 100;
      const margin = Math.round((markup / (100 + markup)) * 10000) / 100;
      return { markup_pct: markup, unit_price: price, margin_pct: margin, total_profit: Math.round((price - input.cost_per_part) * input.quantity * 100) / 100 };
    });

    return {
      cost_per_part: input.cost_per_part, quoted_price: quote.unit_price,
      margin_pct: quote.margin_pct, breakeven_quantity: breakeven,
      profit_at_quoted: Math.round(profit * 100) / 100, scenarios,
    };
  }
}

export const quoteEngine = new QuoteEngine();
