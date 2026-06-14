/**
 * MachineInvestmentROIEngine — capacity-aware payback for new-machine purchases
 *
 * Operator iter11 directive (continued): "roi investments on tooling or
 * machines to improve cost efficiency for future orders".
 *
 * iter17 wired CrossPartToolingSynergyEngine to the JM fleet ledger for the
 * "what other parts benefit" axis. This engine adds the OTHER half — for a
 * CANDIDATE NEW MACHINE, what's the payback if it (a) shifts a percentage of
 * fleet work onto a cheaper-per-hour machine and (b) frees capacity on the
 * existing fleet for new revenue.
 *
 * Composes:
 *   - ShopProfileTemplateEngine  (existing & new machine $/hr rates)
 *   - JMDieScanLedgerEngine      (fleet rows — used to estimate eligible work)
 *
 * Pure compositional + fail-soft.
 *
 * @milestone QUOTING-SYNERGY-MS0/U-MACHINE-INVEST-FROM-FLEET (charlie /goal-20 iter18)
 */

import type { ShopProfile } from "./ShopProfileTemplateEngine.js";

export interface MachineInvestmentProposal {
  /** Machine family id of the CANDIDATE new machine (e.g., "haas_vf3", "doosan_dnm_5700"). */
  candidate_family: string;
  /** Domain of the candidate. */
  candidate_domain: "mill" | "lathe" | "wedm" | "sinker_edm" | "grinder";
  /** Acquisition cost in USD. */
  cost_usd: number;
  /** Candidate's billable $/hr (lower than incumbent → cost savings per hr). */
  candidate_rate_usd_per_hr: number;
  /** Candidate's power draw kW (for utility-cost estimation). */
  candidate_power_kw: number;
  /** Candidate's utilization fraction (uptime / wall-clock). */
  candidate_utilization_pct: number;
  /** Incumbent machine family the candidate would displace (e.g., "haas_vf2" → upgrade to "haas_vf3"). */
  incumbent_family: string;
  /** Fraction (0..1) of incumbent's fleet hours that would migrate to the candidate. */
  migration_fraction: number;
  /** Optional candidate-machine wallclock-hours per month (override estimation; defaults to 160 = 1-shift). */
  monthly_target_hours?: number;
}

export interface MachineInvestmentResult {
  ok: boolean;
  reason?: string;
  /** Acquisition cost passed through. */
  investment_cost_usd: number;
  /** Per-hour cost savings (incumbent_rate - candidate_rate) — positive means candidate is cheaper. */
  per_hour_savings_usd: number;
  /** Hours/month the candidate would actually run at after migration. */
  migrated_hours_per_month: number;
  /** Monthly direct $/savings from migration alone (excl. capacity freed). */
  monthly_migration_savings_usd: number;
  /** Annualized direct savings. */
  annual_migration_savings_usd: number;
  /** Eligible fleet rows (count) — what % of fleet ledger this domain could feed. */
  eligible_fleet_rows: number;
  /** Payback in months from migration savings (null if not positive). */
  payback_months: number | null;
  /** Recommendation per the same buy / consider / skip thresholds as CrossPartToolingSynergyEngine. */
  recommendation: "buy" | "consider" | "skip";
  rationale: string;
  /** Shop profile that was used (for caller audit). */
  profile_id: string;
  /** When the JM Die fleet ledger had no matching rows, flag the assumption. */
  warnings: string[];
}

const BUY_PAYBACK_MONTHS = 12;
const CONSIDER_PAYBACK_MONTHS = 24;
const DEFAULT_MONTHLY_HOURS = 160; // 1-shift / 5-day-week / 8hr-day

export class MachineInvestmentROIEngine {
  /**
   * Compute payback for a candidate new machine. Caller supplies the candidate's
   * known rate ($/hr) — the engine looks up the incumbent's rate from the shop
   * profile and computes migration savings = (incumbent_rate - candidate_rate)
   * × migrated_hours/month. Eligibility is gut-checked against the JM fleet
   * ledger (count of rows in the candidate's domain).
   */
  async evaluate(
    proposal: MachineInvestmentProposal,
    opts: { profile_id?: string; ledgerPath?: string } = {}
  ): Promise<MachineInvestmentResult> {
    const empty: MachineInvestmentResult = {
      ok: false, investment_cost_usd: 0, per_hour_savings_usd: 0,
      migrated_hours_per_month: 0, monthly_migration_savings_usd: 0,
      annual_migration_savings_usd: 0, eligible_fleet_rows: 0,
      payback_months: null, recommendation: "skip", rationale: "",
      profile_id: opts.profile_id ?? "jm-die", warnings: [],
    };
    if (!proposal || typeof proposal.candidate_family !== "string") {
      return { ...empty, reason: "candidate_family required" };
    }
    if (!Number.isFinite(proposal.cost_usd) || proposal.cost_usd <= 0) {
      return { ...empty, reason: "cost_usd must be positive finite" };
    }
    if (!Number.isFinite(proposal.candidate_rate_usd_per_hr) || proposal.candidate_rate_usd_per_hr < 0) {
      return { ...empty, reason: "candidate_rate_usd_per_hr must be non-negative finite" };
    }
    if (!Number.isFinite(proposal.migration_fraction) || proposal.migration_fraction < 0 || proposal.migration_fraction > 1) {
      return { ...empty, reason: "migration_fraction must be in [0, 1]" };
    }

    const warnings: string[] = [];
    const { shopProfileTemplateEngine } = await import("./ShopProfileTemplateEngine.js");
    const profile = await shopProfileTemplateEngine.getProfile(opts.profile_id);

    const incumbent = profile.machines.find(m => m.family.toLowerCase() === proposal.incumbent_family.toLowerCase());
    let incumbentRate: number;
    if (incumbent) {
      incumbentRate = incumbent.rate_usd_per_hr;
    } else {
      warnings.push(`incumbent_family "${proposal.incumbent_family}" not in profile "${profile.profile_id}" — using default_machine_rate ($${profile.default_machine_rate_usd_per_hr}/hr)`);
      incumbentRate = profile.default_machine_rate_usd_per_hr;
    }

    const perHourSavings = round2(incumbentRate - proposal.candidate_rate_usd_per_hr);
    const monthlyTargetHours = Math.max(0, proposal.monthly_target_hours ?? DEFAULT_MONTHLY_HOURS);
    const migratedHoursPerMonth = round2(monthlyTargetHours * proposal.migration_fraction);
    const monthlyMigrationSavings = round2(perHourSavings * migratedHoursPerMonth);
    const annualMigrationSavings = round2(monthlyMigrationSavings * 12);

    // Eligibility gut-check against JM fleet ledger — domain match.
    let eligibleRows = 0;
    try {
      const { JMDieScanLedgerEngine } = await import("./JMDieScanLedgerEngine.js");
      const ledger = new JMDieScanLedgerEngine(opts.ledgerPath);
      const rows = ledger.readAllRows();
      eligibleRows = rows.filter(r => mapMachineFamilyToDomain(r.machine_family) === proposal.candidate_domain).length;
      if (rows.length === 0) {
        warnings.push("JM Die fleet ledger empty — eligibility gut-check skipped");
      } else if (eligibleRows === 0) {
        warnings.push(`no ${proposal.candidate_domain} rows in ledger — migration_fraction is operator-supplied with no fleet evidence`);
      }
    } catch (e) {
      warnings.push(`ledger read failed (ENOENT or malformed): ${e instanceof Error ? e.message : String(e)}`);
    }

    let paybackMonths: number | null;
    let recommendation: "buy" | "consider" | "skip";
    let rationale: string;
    if (monthlyMigrationSavings > 0) {
      paybackMonths = round2(proposal.cost_usd / monthlyMigrationSavings);
      if (paybackMonths <= BUY_PAYBACK_MONTHS) {
        recommendation = "buy";
        rationale = `Payback ${paybackMonths}mo ≤ ${BUY_PAYBACK_MONTHS}mo threshold; candidate saves $${perHourSavings}/hr on ${migratedHoursPerMonth}hr/mo migrated work`;
      } else if (paybackMonths <= CONSIDER_PAYBACK_MONTHS) {
        recommendation = "consider";
        rationale = `Payback ${paybackMonths}mo in ${BUY_PAYBACK_MONTHS}-${CONSIDER_PAYBACK_MONTHS}mo band; revisit if fleet utilization grows beyond ${(proposal.migration_fraction * 100).toFixed(0)}%`;
      } else {
        recommendation = "skip";
        rationale = `Payback ${paybackMonths}mo exceeds ${CONSIDER_PAYBACK_MONTHS}mo threshold; defer until volume justifies`;
      }
    } else {
      paybackMonths = null;
      if (perHourSavings <= 0) {
        recommendation = "skip";
        rationale = `Candidate rate ($${proposal.candidate_rate_usd_per_hr}/hr) ≥ incumbent rate ($${incumbentRate}/hr); no per-hour savings, no payback`;
      } else {
        recommendation = "skip";
        rationale = "Zero migration_fraction or zero monthly_target_hours — no work would migrate, no payback";
      }
    }

    return {
      ok: true,
      investment_cost_usd: proposal.cost_usd,
      per_hour_savings_usd: perHourSavings,
      migrated_hours_per_month: migratedHoursPerMonth,
      monthly_migration_savings_usd: monthlyMigrationSavings,
      annual_migration_savings_usd: annualMigrationSavings,
      eligible_fleet_rows: eligibleRows,
      payback_months: paybackMonths,
      recommendation,
      rationale,
      profile_id: profile.profile_id,
      warnings,
    };
  }

  /** Helper exposed for tests + UI surface: list known machine families from a profile by domain. */
  listIncumbentsByDomain(profile: ShopProfile, domain: "mill" | "lathe" | "wedm" | "sinker_edm" | "grinder"): string[] {
    return profile.machines.filter(m => m.domain === domain).map(m => m.family);
  }
}

function mapMachineFamilyToDomain(family?: string): string | undefined {
  if (!family) return undefined;
  const f = family.toLowerCase();
  if (f.includes("mill")) return "mill";
  if (f.includes("lathe") || f.includes("turn")) return "lathe";
  if (f.includes("wedm") || f.includes("wire")) return "wedm";
  if (f.includes("sinker") || f.includes("edm")) return "sinker_edm";
  if (f.includes("grind")) return "grinder";
  return undefined;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const machineInvestmentROIEngine = new MachineInvestmentROIEngine();
export default machineInvestmentROIEngine;
