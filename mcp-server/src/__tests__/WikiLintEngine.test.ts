/**
 * WikiLintEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI03
 *
 * Behavior assertions only. Each test creates a synthetic vault in tmpdir,
 * runs the lint, and checks specific findings. Drift tests use the canonical
 * kc1.1 P value (1800 N/mm²) and compute deltas mathematically — never
 * inlined as magic numbers.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WikiLintEngine,
  scoreDrift,
  extractWikilinks,
  extractClaimedValue,
  formatReport,
  DRIFT_THRESHOLDS,
  type LintFinding,
} from "../engines/WikiLintEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

const KC11_P_CANONICAL = CANONICAL_KIENZLE.P.kc1_1; // 1800

let TMP: string;
let vault: string;
let reports: string;
let engine: WikiLintEngine;

async function writePage(category: string, slug: string, frontmatter: string, body: string): Promise<string> {
  const dir = join(vault, category);
  await fs.mkdir(dir, { recursive: true });
  const path = join(dir, `${slug}.md`);
  const fm = frontmatter ? `---\n${frontmatter}\n---\n` : "";
  await fs.writeFile(path, fm + body, "utf-8");
  return path;
}

beforeEach(async () => {
  TMP = await fs.mkdtemp(join(tmpdir(), "wiki-lint-"));
  vault = join(TMP, "wiki");
  reports = join(TMP, "lint-reports");
  await fs.mkdir(vault, { recursive: true });
  engine = new WikiLintEngine(vault, reports);
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

// ─── helpers ───────────────────────────────────────────────────────────

function bySev(findings: LintFinding[], sev: string): LintFinding[] {
  return findings.filter((f) => f.severity === sev);
}
function byCat(findings: LintFinding[], cat: string): LintFinding[] {
  return findings.filter((f) => f.category === cat);
}

// ─── pure-function unit tests ──────────────────────────────────────────

describe("scoreDrift — severity scaling matches WIKI_SCHEMA §3.3", () => {
  it("(<2%) below threshold returns null severity", () => {
    const claimed = KC11_P_CANONICAL * 1.008; // +0.8%
    const r = scoreDrift(KC11_P_CANONICAL, claimed);
    expect(r.severity).toStrictEqual(null);
    expect(r.pct).toBeLessThan(DRIFT_THRESHOLDS.MINOR);
  });

  it("(2-5%) MINOR — exit_condition example: kc1.1=1840 (~2.22%)", () => {
    const r = scoreDrift(1800, 1840);
    expect(r.severity).toStrictEqual("MINOR");
    expect(r.pct).toBeGreaterThan(DRIFT_THRESHOLDS.MINOR);
    expect(r.pct).toBeLessThan(DRIFT_THRESHOLDS.MAJOR);
  });

  it("(5-10%) MAJOR — kc1.1=1900 (~5.55%)", () => {
    const r = scoreDrift(1800, 1900);
    expect(r.severity).toStrictEqual("MAJOR");
    expect(r.pct).toBeGreaterThan(DRIFT_THRESHOLDS.MAJOR);
    expect(r.pct).toBeLessThan(DRIFT_THRESHOLDS.CRITICAL);
  });

  it("(>=10%) CRITICAL — exit_condition example: kc1.1=2000 (~11.11%)", () => {
    const r = scoreDrift(1800, 2000);
    expect(r.severity).toStrictEqual("CRITICAL");
    expect(r.pct).toBeGreaterThan(DRIFT_THRESHOLDS.CRITICAL);
  });

  it("(0.83% — exit_condition NOT-flagged sentinel: kc1.1=1815)", () => {
    const r = scoreDrift(1800, 1815);
    expect(r.severity).toStrictEqual(null);
    expect(r.pct).toBeLessThan(DRIFT_THRESHOLDS.MINOR);
  });

  it("zero canonical or non-finite values return null severity (defensive)", () => {
    expect(scoreDrift(0, 100).severity).toStrictEqual(null);
    expect(scoreDrift(1800, NaN).severity).toStrictEqual(null);
    expect(scoreDrift(Infinity, 1800).severity).toStrictEqual(null);
  });
});

describe("extractWikilinks", () => {
  it("extracts the inner targets, ignores empty brackets", () => {
    const text = "see [[force-kienzle]] and [[itw]] and [[]] and [[ thermal ]]";
    expect(extractWikilinks(text)).toStrictEqual(["force-kienzle", "itw", "thermal"]);
  });

  it("returns [] when there are no wikilinks", () => {
    expect(extractWikilinks("no links here")).toStrictEqual([]);
  });

  it("captures the TARGET of an aliased wikilink (regression: aliased links were dropped entirely)", () => {
    // Obsidian display-alias syntax `[[target|alias]]`. The old regex demanded
    // `]]` straight after the target and matched NOTHING here, so both links
    // vanished from the backlink graph.
    const text = "see [[force-kienzle|the Kienzle model]] and [[itw|ITW Inc.]] and [[plain]]";
    expect(extractWikilinks(text)).toStrictEqual(["force-kienzle", "itw", "plain"]);
  });

  it("handles an alias with surrounding whitespace and an empty alias", () => {
    const text = "[[ target | display text ]] then [[other|]]";
    expect(extractWikilinks(text)).toStrictEqual(["target", "other"]);
  });
});

describe("extractClaimedValue — finds numeric assertions for kc1.1 / Taylor", () => {
  it("matches `kc1.1 P = 1840`", () => {
    expect(extractClaimedValue("kc1.1 P = 1840 N/mm²", "kc1.1", "P")).toStrictEqual(1840);
  });

  it("matches `kc1.1[P] = 2000`", () => {
    expect(extractClaimedValue("kc1.1[P] = 2000", "kc1.1", "P")).toStrictEqual(2000);
  });

  it("matches `Taylor C P = 360`", () => {
    expect(extractClaimedValue("Taylor C P = 360 m/min", "Taylor C", "P")).toStrictEqual(360);
  });

  it("returns null when no assertion present", () => {
    expect(extractClaimedValue("some random text without numbers", "kc1.1", "P")).toStrictEqual(null);
  });
});

// ─── Detector tests ────────────────────────────────────────────────────

describe("detectOrphans — 100% recall on deliberate violations", () => {
  it("flags 5 deliberately-orphaned pages, leaves the linked-into one alone", async () => {
    // Hub page that everyone links to — should NOT be orphaned.
    await writePage("concepts", "hub", "", "Central reference page.");
    // 5 orphans (no inbound links anywhere)
    for (let i = 0; i < 5; i++) {
      await writePage("concepts", `orphan-${i}`, "", `Standalone page ${i}, mentions [[hub]].`);
    }
    const r = await engine.lint({ writeReport: false });
    const orphans = byCat(r.findings, "orphan");
    const orphanSlugs = new Set(orphans.map((f) => f.page));
    expect(orphans).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(orphanSlugs.has(`orphan-${i}`)).toStrictEqual(true);
    }
    expect(orphanSlugs.has("hub")).toStrictEqual(false);
  });

  it("self-references do not save a page from being flagged orphan", async () => {
    await writePage("concepts", "narcissus", "", "I am [[narcissus]] and only I cite me.");
    const r = await engine.lint({ writeReport: false });
    const orphans = byCat(r.findings, "orphan");
    expect(orphans.map((f) => f.page)).toStrictEqual(["narcissus"]);
  });
});

describe("detectBrokenRefs", () => {
  it("flags wikilinks pointing to non-existent pages", async () => {
    await writePage("concepts", "page-a", "", "links to [[real-target]] and [[nope-not-here]].");
    await writePage("concepts", "real-target", "", "I exist. Linked from [[page-a]].");
    const r = await engine.lint({ writeReport: false });
    const broken = byCat(r.findings, "broken-ref");
    expect(broken).toHaveLength(1);
    expect(broken[0].page).toStrictEqual("page-a");
    expect((broken[0].details as { target: string }).target).toStrictEqual("nope-not-here");
  });
});

describe("detectStaleClaims", () => {
  it("flags MAJOR when source is newer than page", async () => {
    const sourceFile = join(TMP, "fake-source.ts");
    await fs.writeFile(sourceFile, "// canonical source\n", "utf-8");
    // Make the page older than the source.
    await writePage(
      "concepts",
      "stale-page",
      `sources: [${JSON.stringify(sourceFile.replace(/\\/g, "/"))}]`,
      "Body.\n[[stale-page]]\n"
    );
    // Force page mtime to 1 day in the past, source to now.
    const pagePath = join(vault, "concepts", "stale-page.md");
    const past = (Date.now() - 86_400_000) / 1000;
    await fs.utimes(pagePath, past, past);
    await fs.utimes(sourceFile, Date.now() / 1000, Date.now() / 1000);
    const r = await engine.lint({ writeReport: false });
    const stale = r.findings.filter(
      (f) => f.category === "stale-claim" && f.page === "stale-page" && f.severity === "MAJOR"
    );
    expect(stale).toHaveLength(1);
  });

  it("flags MAJOR when a referenced source path does not exist", async () => {
    await writePage(
      "concepts",
      "ghost-source",
      `sources: ["${TMP.replace(/\\/g, "/")}/does/not/exist.ts"]`,
      "Body. [[ghost-source]]"
    );
    const r = await engine.lint({ writeReport: false });
    const stale = r.findings.filter((f) => f.category === "stale-claim" && f.page === "ghost-source");
    expect(stale.length).toBeGreaterThanOrEqual(1);
    expect(stale[0].severity).toStrictEqual("MAJOR");
  });
});

describe("detectPhysicsDrift — REAL constants imports, ≥2% threshold", () => {
  it("kc1.1 P = 2000 → CRITICAL (~11%)", async () => {
    await writePage("concepts", "kc-critical", "", "Kienzle: kc1.1 P = 2000 N/mm². [[kc-critical]]");
    const r = await engine.lint({ writeReport: false });
    const drift = r.findings.filter((f) => f.category === "physics-drift" && f.page === "kc-critical");
    expect(drift).toHaveLength(1);
    expect(drift[0].severity).toStrictEqual("CRITICAL");
    const d = drift[0].details as { canonical: number; claimed: number; field: string };
    expect(d.canonical).toStrictEqual(KC11_P_CANONICAL);
    expect(d.claimed).toStrictEqual(2000);
    expect(d.field).toStrictEqual("kc1.1");
  });

  it("kc1.1 P = 1840 → MINOR (~2.22%)", async () => {
    await writePage("concepts", "kc-minor", "", "Kienzle kc1.1 P = 1840. [[kc-minor]]");
    const r = await engine.lint({ writeReport: false });
    const drift = r.findings.filter((f) => f.category === "physics-drift" && f.page === "kc-minor");
    expect(drift).toHaveLength(1);
    expect(drift[0].severity).toStrictEqual("MINOR");
  });

  it("kc1.1 P = 1815 → NOT flagged (~0.83%, below threshold)", async () => {
    await writePage("concepts", "kc-clean", "", "Kienzle kc1.1 P = 1815. [[kc-clean]]");
    const r = await engine.lint({ writeReport: false });
    const drift = r.findings.filter((f) => f.category === "physics-drift" && f.page === "kc-clean");
    expect(drift).toHaveLength(0);
  });

  it("Taylor C P = 360 → MINOR (~2.86% off canonical 350)", async () => {
    await writePage("concepts", "taylor-c", "", "Taylor tool life: Taylor C P = 360 m/min. [[taylor-c]]");
    const r = await engine.lint({ writeReport: false });
    const drift = r.findings.filter((f) => f.category === "physics-drift" && f.page === "taylor-c");
    expect(drift).toHaveLength(1);
    expect(drift[0].severity).toStrictEqual("MINOR");
    const d = drift[0].details as { canonical: number };
    expect(d.canonical).toStrictEqual(CANONICAL_TAYLOR.P.C);
  });

  it("page without physics keywords is skipped — no false positives", async () => {
    await writePage("entities", "ITW", "", "Customer profile. Big shop. [[ITW]]");
    const r = await engine.lint({ writeReport: false });
    expect(byCat(r.findings, "physics-drift")).toHaveLength(0);
  });

  it("M-group drift: kc1.1 M = 2400 → CRITICAL (~14.3% off canonical 2100)", async () => {
    await writePage(
      "concepts",
      "kc-m-critical",
      "",
      "M-group steel: kc1.1 M = 2400 (canonical is 2100). [[kc-m-critical]]"
    );
    const r = await engine.lint({ writeReport: false });
    const drift = r.findings.filter((f) => f.category === "physics-drift" && f.page === "kc-m-critical");
    expect(drift).toHaveLength(1);
    expect(drift[0].severity).toStrictEqual("CRITICAL");
    const d = drift[0].details as { group: string; canonical: number };
    expect(d.group).toStrictEqual("M");
    expect(d.canonical).toStrictEqual(CANONICAL_KIENZLE.M.kc1_1);
  });
});

describe("WikiLintEngine.lint — orchestration + report", () => {
  it("writes lint-reports/YYYY-MM-DD.md with severity-prefixed bullets", async () => {
    await writePage("concepts", "orphan-1", "", "I link to [[nowhere]].");
    await writePage("concepts", "kc-bad", "", "kc1.1 P = 2000. [[kc-bad]]");
    const r = await engine.lint();
    expect(r.reportPath).toBeTypeOf("string");
    const md = await fs.readFile(r.reportPath as string, "utf-8");
    const today = new Date().toISOString().slice(0, 10);
    expect(md.startsWith(`# Wiki Lint Report — ${today}`)).toStrictEqual(true);
    expect(md.includes("[CRITICAL] (physics-drift)")).toStrictEqual(true);
    expect(md.includes("[BROKEN] (broken-ref)") || md.includes("[BROKEN] (orphan)")).toStrictEqual(true);
  });

  it("findings are sorted CRITICAL → BROKEN → MAJOR → MINOR", async () => {
    await writePage("concepts", "orphan-1", "", "Body. links nowhere.");
    await writePage("concepts", "kc-bad", "", "kc1.1 P = 1840. [[kc-bad]]"); // MINOR
    await writePage("concepts", "kc-worst", "", "kc1.1 P = 2200. [[kc-worst]]"); // CRITICAL ~22%
    const r = await engine.lint({ writeReport: false });
    const sevSeq = r.findings.map((f) => f.severity);
    // Verify monotonic non-decreasing in our enum order: CRITICAL=0, BROKEN=1, MAJOR=2, MINOR=3
    const order: Record<string, number> = { CRITICAL: 0, BROKEN: 1, MAJOR: 2, MINOR: 3 };
    for (let i = 1; i < sevSeq.length; i++) {
      expect(order[sevSeq[i]]).toBeGreaterThanOrEqual(order[sevSeq[i - 1]]);
    }
  });

  it("clean vault yields a 'no findings' report", async () => {
    // Two pages that link to each other — no orphans, no broken refs, no physics text.
    await writePage("concepts", "alpha", "", "I link to [[beta]].");
    await writePage("concepts", "beta", "", "I link back to [[alpha]].");
    const r = await engine.lint();
    expect(r.findings).toHaveLength(0);
    const md = await fs.readFile(r.reportPath as string, "utf-8");
    expect(md.includes("Vault is clean")).toStrictEqual(true);
  });

  it("missing vault yields zero pages, empty findings", async () => {
    const ghostEngine = new WikiLintEngine(join(TMP, "no-vault-here"), reports);
    const r = await ghostEngine.lint({ writeReport: false });
    expect(r.pagesScanned).toStrictEqual(0);
    expect(r.findings).toStrictEqual([]);
  });
});

describe("formatReport — output shape", () => {
  it("emits header lines + each finding as `- [SEVERITY] (category) message`", () => {
    const md = formatReport({
      date: "2026-04-27",
      vault: "/x/y",
      pagesScanned: 3,
      findings: [
        { severity: "CRITICAL", category: "physics-drift", page: "kc-bad", message: "boom" },
        { severity: "BROKEN", category: "orphan", page: "lonely", message: "no inbound" },
      ],
    });
    expect(md.includes("# Wiki Lint Report — 2026-04-27")).toStrictEqual(true);
    expect(md.includes("Pages scanned: **3**")).toStrictEqual(true);
    expect(md.includes("- [CRITICAL] (physics-drift) boom")).toStrictEqual(true);
    expect(md.includes("- [BROKEN] (orphan) no inbound")).toStrictEqual(true);
  });
});
