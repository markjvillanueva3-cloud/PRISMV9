/**
 * CrossPartToolingSynergyEngine — U-QP-CROSS-PART-SYNERGY (Axis I — NOVEL)
 *
 * Operator-stated (verbatim): "add additional benefits for other parts that
 * can utilize tooling or machine upgrade for higher cost efficiency."
 *
 * Given a quoted part REQUESTING a new tool/fixture/machine investment, scan
 * the pipeline (existing quoted/active parts + historical JM Die parts) for
 * OTHER parts that would benefit from the same purchase. Emits an annualized
 * total-benefit estimate + per-beneficiary breakdown + payback months.
 *
 * Has no current implementation per QUOTING-COMPLETENESS-AUDIT-2026-05-25 §I.
 *
 * Pure engine. Caller supplies the part corpus + the investment proposal.
 * Engine does the matching logic + payback math.
 *
 * Match criteria (any 1 of):
 *   - Same material family (aluminum, steel, etc.)
 *   - Same primary process (mill / lathe / wedm)
 *   - Overlapping feature_tokens (operator-supplied keywords like
 *     "small-bore", "thin-wall", "interrupted-cut")
 *   - Same machine family (for machine-investment proposals)
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-CROSS-PART-SYNERGY (NOVEL, charlie /goal-20 iter6)
 */

export type InvestmentType = "tool" | "fixture" | "machine" | "consumable";

export interface InvestmentProposal {
  type: InvestmentType;
  /** Short descriptor (e.g., "5mm carbide endmill", "vacuum chuck", "Hurco VM10i"). */
  description: string;
  /** Acquisition cost USD. */
  cost_usd: number;
  /** Per-part savings the proposal generates for the QUOTED part (vs status-quo). */
  savings_per_part_usd_quoted: number;
  /** Quoted part's annual volume estimate. */
  quoted_annual_volume: number;
  /** Match criteria for OTHER parts to benefit. */
  match: {
    materials?: string[];
    processes?: string[];
    feature_tokens?: string[];
    machines?: string[];
  };
  /** Per-beneficiary savings rate (multiplier applied to a beneficiary's annual_volume). */
  savings_per_part_usd_beneficiary?: number;
}

export interface CandidatePart {
  part_id: string;
  customer?: string;
  material?: string;
  process?: string;
  feature_tokens?: string[];
  machine?: string;
  annual_volume?: number;
}

export interface BeneficiaryBenefit {
  part_id: string;
  customer?: string;
  matched_on: string[];
  annual_volume: number;
  annual_savings_usd: number;
}

export interface SynergyAnalysisInput {
  proposal: InvestmentProposal;
  corpus: CandidatePart[];
}

export interface SynergyAnalysisResult {
  ok: boolean;
  reason?: string;
  investment_cost_usd: number;
  quoted_part_annual_savings_usd: number;
  beneficiaries: BeneficiaryBenefit[];
  total_annual_savings_usd: number;
  payback_months: number | null;
  roi_year1_pct: number | null;
  recommendation: "buy" | "consider" | "skip";
  rationale: string;
}

const BUY_PAYBACK_MONTHS = 12;       // ≤12mo payback → BUY
const CONSIDER_PAYBACK_MONTHS = 24;  // 12-24mo → CONSIDER

export class CrossPartToolingSynergyEngine {
  /**
   * Analyze synergy across a candidate part corpus.
   * Returns annualized total benefit + payback + buy/consider/skip rec.
   */
  analyze(input: SynergyAnalysisInput): SynergyAnalysisResult {
    const empty: SynergyAnalysisResult = {
      ok: false,
      investment_cost_usd: 0,
      quoted_part_annual_savings_usd: 0,
      beneficiaries: [],
      total_annual_savings_usd: 0,
      payback_months: null,
      roi_year1_pct: null,
      recommendation: "skip",
      rationale: "",
    };

    const { proposal } = input;
    if (!proposal || !Number.isFinite(proposal.cost_usd) || proposal.cost_usd <= 0) {
      return { ...empty, reason: "investment cost_usd must be positive finite" };
    }
    if (!Array.isArray(input.corpus)) {
      return { ...empty, reason: "corpus must be an array" };
    }

    const quotedAnnualSavings = round2(
      Math.max(0, proposal.savings_per_part_usd_quoted) *
      Math.max(0, proposal.quoted_annual_volume)
    );

    const benefRate = Number.isFinite(proposal.savings_per_part_usd_beneficiary)
      && proposal.savings_per_part_usd_beneficiary! > 0
      ? proposal.savings_per_part_usd_beneficiary!
      : proposal.savings_per_part_usd_quoted; // default: same rate as quoted part

    const beneficiaries: BeneficiaryBenefit[] = [];
    for (const part of input.corpus) {
      const matchedOn: string[] = [];
      if (proposal.match.materials && part.material &&
          proposal.match.materials.some(m => m.toLowerCase() === part.material!.toLowerCase())) {
        matchedOn.push("material");
      }
      if (proposal.match.processes && part.process &&
          proposal.match.processes.some(p => p.toLowerCase() === part.process!.toLowerCase())) {
        matchedOn.push("process");
      }
      if (proposal.match.feature_tokens && part.feature_tokens && part.feature_tokens.length > 0) {
        const overlap = proposal.match.feature_tokens.filter(t =>
          part.feature_tokens!.some(pt => pt.toLowerCase() === t.toLowerCase())
        );
        if (overlap.length > 0) matchedOn.push(`features:${overlap.join("+")}`);
      }
      if (proposal.match.machines && part.machine &&
          proposal.match.machines.some(m => m.toLowerCase() === part.machine!.toLowerCase())) {
        matchedOn.push("machine");
      }
      if (matchedOn.length === 0) continue;

      const annualVolume = Math.max(0, part.annual_volume ?? 0);
      const annualSavings = round2(benefRate * annualVolume);
      if (annualSavings <= 0) continue; // no annualized benefit → skip
      beneficiaries.push({
        part_id: part.part_id,
        customer: part.customer,
        matched_on: matchedOn,
        annual_volume: annualVolume,
        annual_savings_usd: annualSavings,
      });
    }

    beneficiaries.sort((a, b) => b.annual_savings_usd - a.annual_savings_usd);

    const beneficiaryTotal = round2(beneficiaries.reduce((s, b) => s + b.annual_savings_usd, 0));
    const totalAnnualSavings = round2(quotedAnnualSavings + beneficiaryTotal);

    const monthlySavings = totalAnnualSavings / 12;
    const paybackMonths = monthlySavings > 0
      ? round2(proposal.cost_usd / monthlySavings)
      : null;
    const roiYear1Pct = totalAnnualSavings > 0
      ? round2(((totalAnnualSavings - proposal.cost_usd) / proposal.cost_usd) * 100)
      : null;

    let recommendation: "buy" | "consider" | "skip";
    let rationale: string;
    if (paybackMonths === null) {
      recommendation = "skip";
      rationale = "No annual savings projected — investment does not pay for itself";
    } else if (paybackMonths <= BUY_PAYBACK_MONTHS) {
      recommendation = "buy";
      rationale = `Payback ${paybackMonths}mo ≤ ${BUY_PAYBACK_MONTHS}mo threshold; ${beneficiaries.length} additional part(s) benefit beyond quoted part`;
    } else if (paybackMonths <= CONSIDER_PAYBACK_MONTHS) {
      recommendation = "consider";
      rationale = `Payback ${paybackMonths}mo between thresholds (${BUY_PAYBACK_MONTHS}-${CONSIDER_PAYBACK_MONTHS}mo); revisit if pipeline grows`;
    } else {
      recommendation = "skip";
      rationale = `Payback ${paybackMonths}mo exceeds ${CONSIDER_PAYBACK_MONTHS}mo threshold; defer until volume justifies`;
    }

    return {
      ok: true,
      investment_cost_usd: proposal.cost_usd,
      quoted_part_annual_savings_usd: quotedAnnualSavings,
      beneficiaries,
      total_annual_savings_usd: totalAnnualSavings,
      payback_months: paybackMonths,
      roi_year1_pct: roiYear1Pct,
      recommendation,
      rationale,
    };
  }

  /**
   * U-CROSS-PART-SYNERGY-FROM-JM-FLEET (iter17):
   * Auto-populate corpus from the JM Die fleet-scan ledger
   * (state/shared/scan-tracking/jm-die-scan-ledger.jsonl), then call analyze().
   *
   * Closes operator's iter11 directive on the "additional benefits for other
   * parts that can utilize tooling or machine upgrade" axis — the corpus is
   * now the REAL JM Die part library (6,474 ledger rows as of 2026-05-24)
   * instead of caller-supplied stub.
   *
   * Mapping LedgerRow → CandidatePart:
   *   - abs_path basename     → part_id
   *   - abs_path path tokens  → customer (segment after "JM DIE")
   *   - machine_family        → process (mill | lathe | wedm | sinker_edm) + machine
   *   - material, features    → NOT in ledger; analyze() handles undefined gracefully
   *
   * Optional filter narrows the corpus before analysis — useful for very large
   * fleets where the operator wants "only ALCOA parts" or "only mill work".
   *
   * Fail-soft: ledger missing → returns ok:true with empty corpus + warning;
   *            ledger malformed → returns ok:false with reason.
   */
  async analyzeFromJMFleet(
    proposal: InvestmentProposal,
    opts: {
      ledgerPath?: string;
      customerFilter?: string;
      machineFamilyFilter?: string;
      annualVolumePerPart?: number;
    } = {}
  ): Promise<SynergyAnalysisResult & { corpus_source: "jm-fleet-ledger"; corpus_size: number; ledger_path: string; ledger_warning?: string }> {
    const { JMDieScanLedgerEngine } = await import("./JMDieScanLedgerEngine.js");
    const ledger = new JMDieScanLedgerEngine(opts.ledgerPath);

    let corpus: CandidatePart[] = [];
    let ledgerWarning: string | undefined;
    try {
      const rows = ledger.readAllRows();
      const cust = opts.customerFilter?.toLowerCase();
      const mach = opts.machineFamilyFilter?.toLowerCase();
      const perPart = Number.isFinite(opts.annualVolumePerPart) && opts.annualVolumePerPart! >= 0
        ? opts.annualVolumePerPart!
        : 100; // conservative default — operator overrides per part-type rate when known
      const seen = new Set<string>();
      for (const row of rows) {
        if (mach && (row.machine_family ?? "").toLowerCase() !== mach) continue;
        const customer = extractCustomerFromPath(row.abs_path);
        if (cust && (customer ?? "").toLowerCase().indexOf(cust) === -1) continue;
        const partId = extractPartIdFromPath(row.abs_path);
        // Dedup on (customer, part_id) — same part may have many revisions/files in fleet.
        const key = `${customer ?? ""}|${partId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const process = mapMachineFamilyToProcess(row.machine_family);
        corpus.push({
          part_id: partId,
          customer,
          process,
          machine: row.machine_family,
          annual_volume: perPart,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/ENOENT|no such file/i.test(msg)) {
        ledgerWarning = `JM Die fleet ledger not present at ${ledger.getPath()} — analysis falls back to empty corpus`;
        corpus = [];
      } else {
        // Malformed / unreadable → propagate as analysis failure to surface real problems.
        const failed = this.analyze({ proposal, corpus: [] });
        return { ...failed, ok: false, reason: `ledger read failed: ${msg}`, corpus_source: "jm-fleet-ledger", corpus_size: 0, ledger_path: ledger.getPath() };
      }
    }

    const result = this.analyze({ proposal, corpus });
    return {
      ...result,
      corpus_source: "jm-fleet-ledger",
      corpus_size: corpus.length,
      ledger_path: ledger.getPath(),
      ledger_warning: ledgerWarning,
    };
  }
}

/** Extract customer name from JM Die archive path — "H:/prism/JM DIE/CNC MILL/ALCOA/x.MIN" → "ALCOA". */
function extractCustomerFromPath(absPath: string): string | undefined {
  if (typeof absPath !== "string" || absPath.length === 0) return undefined;
  const normalized = absPath.replace(/\\/g, "/");
  const tokens = normalized.split("/");
  const jmIdx = tokens.findIndex(t => /^jm[\s_-]?die$/i.test(t));
  if (jmIdx === -1 || jmIdx + 2 >= tokens.length) return undefined;
  // Skip the machine-category segment (e.g., "CNC MILL"); customer is the segment after that.
  const customer = tokens[jmIdx + 2];
  return customer && customer.length > 0 ? customer : undefined;
}

/** Extract part id (filename without extension) from absolute path. */
function extractPartIdFromPath(absPath: string): string {
  if (typeof absPath !== "string" || absPath.length === 0) return "unknown";
  const normalized = absPath.replace(/\\/g, "/");
  const name = normalized.split("/").pop() ?? "unknown";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(0, dotIdx) : name;
}

/** Map machine_family ledger value to a process identifier the engine matches on. */
function mapMachineFamilyToProcess(family?: string): string | undefined {
  if (!family) return undefined;
  const f = family.toLowerCase();
  if (f.includes("mill")) return "milling";
  if (f.includes("lathe") || f.includes("turn")) return "turning";
  if (f.includes("wedm") || f.includes("wire")) return "wedm";
  if (f.includes("sinker") || f.includes("edm")) return "sinker_edm";
  if (f.includes("grind")) return "grinding";
  return family;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const crossPartToolingSynergyEngine = new CrossPartToolingSynergyEngine();
export default crossPartToolingSynergyEngine;
