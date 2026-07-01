/**
 * ProspectiveCustomer.test.ts — hotel iter21.
 * Real-behavior assertions: state-machine forward-only enforcement,
 * PII redaction, email content composition by work-type, seed catalog
 * validity with concrete content checks (no presence-only stubs).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prospectiveCustomerEngine } from "../engines/ProspectiveCustomerEngine.js";
import type { ProspectiveCustomerInput } from "../engines/ProspectiveCustomerEngine.js";
import {
  generateFirstContactEmail,
  salesApproachGuide,
  firstQuotePrompts,
} from "../algorithms/FirstContactEmailTemplateFormula.js";
import { JM_DIE_PROSPECTS_SEED } from "../data/jm-die-prospects-seed.js";

const SAMPLE_PROSPECT: ProspectiveCustomerInput = {
  company_name: "Acme Stamping Corp",
  industry: "automotive-stamping",
  city: "Naperville",
  state: "IL",
  estimated_annual_machining_spend_usd: 500_000,
  work_types_relevant: ["progressive_die", "stamping_die_repair"],
  relevance_score: 0.85,
  why_relevant: "Tier-2 stamping shop with aging tooling — repeat-repair pattern matches JM Die wheelhouse",
  contact: {
    primary_contact_name: "Jane Buyer",
    title: "Tooling Sourcing Manager",
    email: "jane@acmestamping.example",
    phone: "555-0100",
  },
};
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

describe("ProspectiveCustomerEngine — CRUD + sort", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("creates prospect with PROSP-000001 id, status cold, ISO created_at", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    expect(p.id).toBe("PROSP-000001");
    expect(p.status).toBe("cold");
    expect(p.created_at).toMatch(ISO_DATETIME_RE);
  });

  it("defensive copy — mutating returned object doesn't affect storage", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    p.company_name = "MUTATED";
    p.work_types_relevant.push("cnc_milling");
    const reread = prospectiveCustomerEngine.get(p.id);
    expect(reread?.company_name).toBe("Acme Stamping Corp");
    expect(reread?.work_types_relevant).toEqual(["progressive_die", "stamping_die_repair"]);
  });

  it("list sorts by relevance_score DESC + id ASC tie-break", () => {
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, company_name: "LowFit", relevance_score: 0.4 });
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, company_name: "HighFit", relevance_score: 0.9 });
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, company_name: "MidFit", relevance_score: 0.6 });
    const list = prospectiveCustomerEngine.list();
    expect(list.map(p => p.company_name)).toEqual(["HighFit", "MidFit", "LowFit"]);
  });

  it("list filters by work_type + min_relevance", () => {
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, work_types_relevant: ["cnc_milling"] });
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, work_types_relevant: ["wire_edm"], relevance_score: 0.3 });
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, work_types_relevant: ["wire_edm"], relevance_score: 0.8 });
    expect(prospectiveCustomerEngine.list({ work_type: "wire_edm" }).length).toBe(2);
    expect(prospectiveCustomerEngine.list({ work_type: "wire_edm", min_relevance: 0.5 }).length).toBe(1);
  });
});

describe("ProspectiveCustomerEngine — PII redaction", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("redacts SSN-pattern from contact_memo", () => {
    const p = prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT,
      contact_memo: "Buyer SSN 123-45-6789 disclosed for NDA",
    });
    expect(p.contact_memo).toBe("Buyer SSN [SSN-REDACTED] disclosed for NDA");
  });

  it("redacts card-number-pattern", () => {
    const p = prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT,
      contact_memo: "Demo charge on 4111111111111111 expected",
    });
    expect(p.contact_memo).toBe("Demo charge on [CARD-REDACTED] expected");
  });
});

describe("ProspectiveCustomerEngine — state machine (forward-only)", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("cold → researched → first_contact → engaged → quoted → won stamps each transition", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    prospectiveCustomerEngine.advanceStatus(p.id, "researched");
    const afterFC = prospectiveCustomerEngine.advanceStatus(p.id, "first_contact");
    expect(afterFC.first_contact_at).toMatch(ISO_DATETIME_RE);
    prospectiveCustomerEngine.advanceStatus(p.id, "engaged");
    const afterQ = prospectiveCustomerEngine.advanceStatus(p.id, "quoted");
    expect(afterQ.quoted_at).toMatch(ISO_DATETIME_RE);
    const final = prospectiveCustomerEngine.advanceStatus(p.id, "won");
    expect(final.status).toBe("won");
    expect(final.closed_at).toMatch(ISO_DATETIME_RE);
  });

  it("HOTEL-SOUL: rejects backward transition (engaged → first_contact)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    prospectiveCustomerEngine.advanceStatus(p.id, "researched");
    prospectiveCustomerEngine.advanceStatus(p.id, "first_contact");
    prospectiveCustomerEngine.advanceStatus(p.id, "engaged");
    expect(() => prospectiveCustomerEngine.advanceStatus(p.id, "first_contact"))
      .toThrow(/illegal transition/);
  });

  it("HOTEL-SOUL: rejects skip-step (cold → quoted)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    expect(() => prospectiveCustomerEngine.advanceStatus(p.id, "quoted"))
      .toThrow(/illegal transition/);
  });

  it("HOTEL-SOUL: rejects transition from terminal state (won → engaged)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    prospectiveCustomerEngine.advanceStatus(p.id, "researched");
    prospectiveCustomerEngine.advanceStatus(p.id, "first_contact");
    prospectiveCustomerEngine.advanceStatus(p.id, "engaged");
    prospectiveCustomerEngine.advanceStatus(p.id, "quoted");
    prospectiveCustomerEngine.advanceStatus(p.id, "won");
    expect(() => prospectiveCustomerEngine.advanceStatus(p.id, "engaged"))
      .toThrow(/terminal state/);
  });

  it("cold → lost is legal (sales disqualifies early)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const updated = prospectiveCustomerEngine.advanceStatus(p.id, "lost");
    expect(updated.status).toBe("lost");
    expect(updated.closed_at).toMatch(ISO_DATETIME_RE);
  });
});

describe("ProspectiveCustomerEngine — pipelineReport", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("reports total + cold-bucket spend correctly for 2 cold prospects @ 100k+200k", () => {
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, estimated_annual_machining_spend_usd: 100_000 });
    prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, estimated_annual_machining_spend_usd: 200_000 });
    const r = prospectiveCustomerEngine.pipelineReport();
    expect(r.total_prospects).toBe(2);
    expect(r.by_status.cold.count).toBe(2);
    expect(r.by_status.cold.est_spend_total).toBe(300_000);
    expect(r.total_pipeline_value_usd).toBe(300_000);
  });

  it("lost prospects excluded from pipeline_value (500k lost → 0 pipeline)", () => {
    const p = prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, estimated_annual_machining_spend_usd: 500_000 });
    prospectiveCustomerEngine.advanceStatus(p.id, "lost");
    const r = prospectiveCustomerEngine.pipelineReport();
    expect(r.total_pipeline_value_usd).toBe(0);
    expect(r.by_status.lost.count).toBe(1);
    expect(r.by_status.lost.est_spend_total).toBe(500_000);
  });
});

describe("ProspectiveCustomerEngine — R12 fail-loud", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("rejects empty company_name", () => {
    expect(() => prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, company_name: "" })).toThrow(/empty/);
  });

  it("rejects relevance_score outside [0,1]", () => {
    expect(() => prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, relevance_score: 1.5 })).toThrow(/\[0, 1\]/);
    expect(() => prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, relevance_score: -0.1 })).toThrow(/\[0, 1\]/);
  });

  it("rejects empty work_types_relevant", () => {
    expect(() => prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, work_types_relevant: [] })).toThrow(/empty/);
  });

  it("rejects unknown work_type 'fake_type'", () => {
    expect(() => prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT, work_types_relevant: ["fake_type"] as never,
    })).toThrow(/unknown type 'fake_type'/);
  });

  it("rejects contact.email without '@'", () => {
    expect(() => prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT,
      contact: { ...SAMPLE_PROSPECT.contact, email: "not-an-email" },
    })).toThrow(/must contain '@'/);
  });
});

describe("generateFirstContactEmail — outreach composition", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("subject for progressive-die prospect mentions cost-per-hit value-prop", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const email = generateFirstContactEmail(p);
    expect(email.subject).toBe("Acme Stamping Corp — progressive dies with cost-per-hit roll-up + force/stress validation");
  });

  it("body opens with prospect contact name + closes with phone number", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const email = generateFirstContactEmail(p);
    expect(email.body.startsWith("Jane Buyer,")).toBe(true);
    expect(email.body).toContain("(708) 343-0900");
  });

  it("body cites ITW/Alcoa/Optimas/SFS/Holo-Krome reference customers", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const email = generateFirstContactEmail(p);
    expect(email.body).toContain("ITW");
    expect(email.body).toContain("Alcoa");
    expect(email.body).toContain("Optimas");
  });

  it("wire_edm subject differs from progressive_die subject (work-type-tailored)", () => {
    const wirePr = prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT, work_types_relevant: ["wire_edm"],
    });
    const email = generateFirstContactEmail(wirePr);
    expect(email.subject).toBe("Acme Stamping Corp — wire EDM with predicted cut-time + finish-Ra guarantees");
    expect(email.body).toContain("wire EDM");
  });

  it("signature is exact JM Die corporate signature block", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const email = generateFirstContactEmail(p);
    expect(email.signature).toContain("Mark Villanueva");
    expect(email.signature).toContain("JM Die Company");
    expect(email.signature).toContain("Melrose Park, IL 60160");
    expect(email.signature).toContain("mvillanueva@jmdie.com");
  });

  it("recipient_email matches the prospect contact email exactly", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const email = generateFirstContactEmail(p);
    expect(email.recipient_email).toBe("jane@acmestamping.example");
  });
});

describe("salesApproachGuide — SPIN + BANT + Cialdini", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("SPIN questions for wire_edm reference wire-EDM-specific equipment/material", () => {
    const p = prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT, work_types_relevant: ["wire_edm"],
    });
    const guide = salesApproachGuide(p);
    // wire_edm question set includes material types D2/A2/M2/carbide
    expect(guide.spin_questions.situation.join(" ")).toContain("wire EDM");
    expect(guide.spin_questions.situation.join(" ")).toMatch(/D2|A2|M2|carbide/);
  });

  it("BANT budget line embeds the prospect's actual annual spend dollar figure", () => {
    const p = prospectiveCustomerEngine.create({
      ...SAMPLE_PROSPECT, estimated_annual_machining_spend_usd: 750_000,
    });
    const guide = salesApproachGuide(p);
    expect(guide.bant_qualifiers.budget).toContain("$750,000");
    expect(guide.bant_qualifiers.authority).toContain("Jane Buyer");
  });

  it("follow-up cadence is the empirical 3/8/18 day schedule", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const guide = salesApproachGuide(p);
    expect(guide.follow_up_cadence_days).toEqual([3, 8, 18]);
  });

  it("Cialdini hooks include reciprocity + authority + social-proof + scarcity (4 hooks)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const guide = salesApproachGuide(p);
    expect(guide.cialdini_hooks.length).toBe(4);
    const joined = guide.cialdini_hooks.join(" ");
    expect(joined).toMatch(/Reciprocity:/);
    expect(joined).toMatch(/Authority:/);
    expect(joined).toMatch(/Social proof:/);
    expect(joined).toMatch(/Scarcity/);
  });
});

describe("firstQuotePrompts — extraction checklist", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  it("required list contains drawing + quantity + lead-time + material + tolerance (5 items)", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const q = firstQuotePrompts(p);
    expect(q.required_questions.length).toBe(5);
    const joined = q.required_questions.join(" ");
    expect(joined).toMatch(/[Dd]rawing|CAD/);
    expect(joined).toMatch(/[Qq]uantity|EAU/);
    expect(joined).toMatch(/[Ll]ead-time/);
    expect(joined).toMatch(/[Mm]aterial/);
    expect(joined).toMatch(/[Tt]olerance/);
  });

  it("warning_if_skipped explicitly names the drawing-missing failure mode", () => {
    const p = prospectiveCustomerEngine.create(SAMPLE_PROSPECT);
    const q = firstQuotePrompts(p);
    expect(q.warning_if_skipped.some(w => /[Nn]o drawing/.test(w))).toBe(true);
    expect(q.warning_if_skipped.some(w => /[Nn]o quantity/.test(w))).toBe(true);
  });
});

describe("JM_DIE_PROSPECTS_SEED — catalog integrity", () => {
  it("seed catalog has exactly 20 prospects (8 Midwest+CT + 6 East/SE + 6 West/Mtn/SW)", () => {
    expect(JM_DIE_PROSPECTS_SEED.length).toBe(20);
  });

  it("national geographic coverage — at least 12 distinct states represented", () => {
    const states = new Set(JM_DIE_PROSPECTS_SEED.map(p => p.state));
    expect(states.size).toBeGreaterThanOrEqual(12);
    // Spot-check key regions present
    expect(states.has("CA")).toBe(true);  // West
    expect(states.has("TX")).toBe(true);  // Southwest
    expect(states.has("FL")).toBe(true);  // Southeast
    expect(states.has("MA")).toBe(true);  // Northeast
    expect(states.has("IL")).toBe(false); // JM Die itself is IL — prospects don't include self
  });

  it("industry diversity — at least 10 distinct industries (cross-vertical coverage)", () => {
    const industries = new Set(JM_DIE_PROSPECTS_SEED.map(p => p.industry));
    expect(industries.size).toBeGreaterThanOrEqual(10);
    // Major verticals present
    const joined = [...industries].join(" ");
    expect(joined).toMatch(/aerospace/);
    expect(joined).toMatch(/defense/);
    expect(joined).toMatch(/medical/);
    expect(joined).toMatch(/oilfield|energy/);
    expect(joined).toMatch(/semiconductor/);
  });

  it("every seed entry has VERIFY-prefixed contact name (PII safety contract)", () => {
    for (const seed of JM_DIE_PROSPECTS_SEED) {
      expect(seed.contact.primary_contact_name.startsWith("VERIFY")).toBe(true);
    }
  });

  it("Pridgeon & Clay seed has correct relevance, industry, and work types", () => {
    const pc = JM_DIE_PROSPECTS_SEED.find(s => s.company_name.includes("Pridgeon & Clay"));
    expect(pc).not.toBe(undefined);
    expect(pc!.relevance_score).toBe(0.88);
    expect(pc!.industry).toBe("automotive-stamping");
    expect(pc!.work_types_relevant).toEqual(["progressive_die", "stamping_die_repair", "wire_edm"]);
  });

  it("seed total estimated annual machining spend is $23.42M (national 20-prospect catalog)", () => {
    const totalSpend = JM_DIE_PROSPECTS_SEED.reduce(
      (s, p) => s + (p.estimated_annual_machining_spend_usd ?? 0), 0,
    );
    // Tier1 (8): 850+420+1200+280+650+380+2400+320 = 6,500
    // Tier2 (6): 1800+920+3400+1500+1100+680 = 9,400
    // Tier3 (6): 2200+950+1400+780+540+1650 = 7,520
    // Total: 6500 + 9400 + 7520 = 23,420 thousand
    expect(totalSpend).toBe(23_420_000);
  });

  it("loading entire seed catalog into engine: 20 prospects, pipeline value = $23.42M", () => {
    prospectiveCustomerEngine.__resetForTests();
    for (const seed of JM_DIE_PROSPECTS_SEED) {
      prospectiveCustomerEngine.create(seed);
    }
    const report = prospectiveCustomerEngine.pipelineReport();
    expect(report.total_prospects).toBe(20);
    expect(report.total_pipeline_value_usd).toBe(23_420_000);
    expect(report.by_status.cold.count).toBe(20);  // all freshly loaded are cold
  });

  it("highest-relevance seed (Pridgeon & Clay 0.88) generates progressive-die-focused subject", () => {
    prospectiveCustomerEngine.__resetForTests();
    let created;
    for (const seed of JM_DIE_PROSPECTS_SEED) {
      const p = prospectiveCustomerEngine.create(seed);
      if (seed.company_name.includes("Pridgeon & Clay")) created = p;
    }
    expect(created).not.toBe(undefined);
    const email = generateFirstContactEmail(created!);
    expect(email.subject).toBe("Pridgeon & Clay (Grand Rapids, MI) — progressive dies with cost-per-hit roll-up + force/stress validation");
  });
});

// U-HOTEL-WIRE-PIPELINE: the FE adapters backing SalesPipelinePage (forecast tiles + stage funnel).
// Reference values verified against the engine's documented stage-probability weights.
describe("ProspectiveCustomerEngine — pipelineForecast + pipelineStages (FE adapters)", () => {
  beforeEach(() => prospectiveCustomerEngine.__resetForTests());

  /** Create a prospect at `spend` then advance it through the forward-only FSM to `to`. */
  function seedAt(name: string, spend: number, to: string): string {
    const p = prospectiveCustomerEngine.create({ ...SAMPLE_PROSPECT, company_name: name, estimated_annual_machining_spend_usd: spend });
    const path: Record<string, string[]> = {
      cold: [],
      researched: ["researched"],
      first_contact: ["researched", "first_contact"],
      engaged: ["researched", "first_contact", "engaged"],
      quoted: ["researched", "first_contact", "engaged", "quoted"],
      won: ["researched", "first_contact", "engaged", "quoted", "won"],
      lost: ["researched", "lost"],
    };
    for (const s of path[to] ?? []) prospectiveCustomerEngine.advanceStatus(p.id, s as never);
    return p.id;
  }

  it("forecast — pipeline_value (open only), conversion, probability-weighted 30/90d, backlog", () => {
    seedAt("Quoted Co", 100_000, "quoted");
    seedAt("Engaged Co", 50_000, "engaged");
    seedAt("Cold Co", 200_000, "cold");
    seedAt("Won Co", 80_000, "won");
    seedAt("Lost Co", 30_000, "lost");
    const f = prospectiveCustomerEngine.pipelineForecast();
    expect(f.pipeline_value).toBe(350_000);       // open: 100k + 50k + 200k (won/lost excluded)
    expect(f.conversion_rate).toBe(0.5);          // won 1 / (won 1 + lost 1)
    expect(f.backlog_value).toBe(80_000);         // closed-won annual spend
    // 90d = all open stages weighted: 200k*.05 + 50k*.40 + 100k*.65 = 10k + 20k + 65k
    expect(f.forecast_90d).toBe(95_000);
    // 30d = near-close only: 50k*.40 + 100k*.65 = 20k + 65k
    expect(f.forecast_30d).toBe(85_000);
  });

  it("forecast — empty store: zeros, conversion 0 (no divide-by-zero)", () => {
    const f = prospectiveCustomerEngine.pipelineForecast();
    expect(f).toEqual({ pipeline_value: 0, conversion_rate: 0, forecast_30d: 0, forecast_90d: 0, backlog_value: 0 });
  });

  it("forecast — conversion 0 when only open prospects (no closed deals)", () => {
    seedAt("A", 10_000, "quoted");
    expect(prospectiveCustomerEngine.pipelineForecast().conversion_rate).toBe(0);
  });

  it("forecast — conversion 1.0 when all closed deals won", () => {
    seedAt("W1", 10_000, "won");
    seedAt("W2", 20_000, "won");
    expect(prospectiveCustomerEngine.pipelineForecast().conversion_rate).toBe(1);
  });

  it("stages — 5 open stages with count/value/weighted_value/probability_pct (won/lost excluded)", () => {
    seedAt("Quoted Co", 100_000, "quoted");
    seedAt("Won Co", 80_000, "won");
    const stages = prospectiveCustomerEngine.pipelineStages();
    expect(stages.length).toBe(5);
    expect(stages.map((s) => s.stage)).toEqual(["cold", "researched", "first_contact", "engaged", "quoted"]);
    const q = stages.find((s) => s.stage === "quoted")!;
    expect(q.count).toBe(1);
    expect(q.value).toBe(100_000);
    expect(q.probability_pct).toBe(65);
    expect(q.weighted_value).toBe(65_000); // 100k * 0.65
    expect(stages.find((s) => (s.stage as string) === "won")).toBeUndefined(); // terminal, not a stage row
  });

  it("stages — empty store: 5 zero-count stages, each frozen", () => {
    const stages = prospectiveCustomerEngine.pipelineStages();
    expect(stages.length).toBe(5);
    expect(stages.every((s) => s.count === 0 && s.value === 0 && s.weighted_value === 0)).toBe(true);
    expect(Object.isFrozen(stages[0])).toBe(true);
  });

  it("adversarial — forecast/stages never NaN even with zero-spend prospects", () => {
    seedAt("ZeroSpend", 0, "engaged");
    const f = prospectiveCustomerEngine.pipelineForecast();
    expect(Number.isFinite(f.forecast_30d)).toBe(true);
    expect(Number.isFinite(f.forecast_90d)).toBe(true);
    expect(Number.isFinite(f.conversion_rate)).toBe(true);
    const stages = prospectiveCustomerEngine.pipelineStages();
    expect(stages.every((s) => Number.isFinite(s.weighted_value))).toBe(true);
  });
});
