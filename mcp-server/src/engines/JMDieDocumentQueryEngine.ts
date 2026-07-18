/**
 * JMDieDocumentQueryEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS08
 *
 * Role-aware query layer over the 301,948-row jm-die-scan-ledger.jsonl.
 * Each employee role consumes the ledger differently:
 *
 *   - Operator   -> findByPart(partId) | findByCustomer(customer)
 *   - Quoter     -> findByCustomer(customer) + filter by kind=docustrata
 *   - Setup      -> findByPart(partId) + filter by extension in {pdf,jpg,png}
 *   - Manager    -> findByMachineFamily(family) for production load
 *   - Engineer   -> findByTokens(["CNMG120408",...]) for tool/program search
 *
 * Pure deterministic filter. No shell, no network, no LLM. Per R12: missing
 * ledger surfaces reason="ledger-not-found"; parse errors counted not swallowed.
 *
 * @milestone JM-DIE-FLEET-SCAN-MS0/U-FS08-DOCUMENT-QUERY
 * @author slot:charlie /goal-16 iter2, 2026-05-24
 */

import * as fs from "node:fs";
import type { LedgerRow, LedgerKind } from "./JMDieScanLedgerEngine.js";

const DEFAULT_LEDGER_PATH = "H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl";
const DEFAULT_LIMIT = 50;

export interface QueryResult {
  ok: boolean;
  query: string;
  total_matched: number;
  returned: number;
  parse_errors: number;
  results: LedgerRow[];
  reason?: string;
}

function readLedgerRows(ledgerPath: string): { rows: LedgerRow[]; parse_errors: number; reason?: string } {
  if (!fs.existsSync(ledgerPath)) {
    return { rows: [], parse_errors: 0, reason: "ledger-not-found" };
  }
  const rows: LedgerRow[] = [];
  let parseErrors = 0;
  const raw = fs.readFileSync(ledgerPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const r = JSON.parse(trimmed) as LedgerRow;
      if (typeof r.abs_path === "string" && r.abs_path.length > 0) rows.push(r);
      else parseErrors++;
    } catch {
      parseErrors++;
    }
  }
  return { rows, parse_errors: parseErrors };
}

function byMtimeDesc(a: LedgerRow, b: LedgerRow): number {
  return b.mtime_iso.localeCompare(a.mtime_iso);
}

export class JMDieDocumentQueryEngine {
  private readonly ledgerPath: string;
  private cache: { mtime: number; rows: LedgerRow[]; parse_errors: number } | null = null;

  constructor(ledgerPath: string = DEFAULT_LEDGER_PATH) {
    this.ledgerPath = ledgerPath;
  }

  private loadRows(): { rows: LedgerRow[]; parse_errors: number; reason?: string } {
    if (!fs.existsSync(this.ledgerPath)) {
      return { rows: [], parse_errors: 0, reason: "ledger-not-found" };
    }
    const stat = fs.statSync(this.ledgerPath);
    if (this.cache && this.cache.mtime === stat.mtimeMs) {
      return { rows: this.cache.rows, parse_errors: this.cache.parse_errors };
    }
    const r = readLedgerRows(this.ledgerPath);
    this.cache = { mtime: stat.mtimeMs, rows: r.rows, parse_errors: r.parse_errors };
    return r;
  }

  /** OPERATOR/QUOTER role - case-insensitive substring on absolute path. */
  findByCustomer(customer: string, limit: number = DEFAULT_LIMIT, kindFilter?: LedgerKind): QueryResult {
    const empty: QueryResult = { ok: false, query: `customer:${customer}`, total_matched: 0, returned: 0, parse_errors: 0, results: [] };
    if (!customer || typeof customer !== "string" || customer.length === 0) {
      return { ...empty, reason: "empty-customer" };
    }
    const { rows, parse_errors, reason } = this.loadRows();
    if (reason) return { ...empty, parse_errors, reason };
    const needle = customer.toLowerCase();
    const matched = rows.filter((r) => {
      if (kindFilter && r.kind !== kindFilter) return false;
      return r.abs_path.toLowerCase().includes(needle);
    });
    matched.sort(byMtimeDesc);
    return {
      ok: true,
      query: `customer:${customer}${kindFilter ? `+kind:${kindFilter}` : ""}`,
      total_matched: matched.length,
      returned: Math.min(matched.length, limit),
      parse_errors,
      results: matched.slice(0, limit),
    };
  }

  /** SETUP/OPERATOR role - all docs touching a part id. */
  findByPart(partId: string, limit: number = DEFAULT_LIMIT, kindFilter?: LedgerKind): QueryResult {
    const empty: QueryResult = { ok: false, query: `part:${partId}`, total_matched: 0, returned: 0, parse_errors: 0, results: [] };
    if (!partId || typeof partId !== "string" || partId.length === 0) {
      return { ...empty, reason: "empty-partId" };
    }
    const { rows, parse_errors, reason } = this.loadRows();
    if (reason) return { ...empty, parse_errors, reason };
    const needle = partId.toLowerCase();
    const matched = rows.filter((r) => {
      if (kindFilter && r.kind !== kindFilter) return false;
      return r.abs_path.toLowerCase().includes(needle);
    });
    matched.sort(byMtimeDesc);
    return {
      ok: true,
      query: `part:${partId}${kindFilter ? `+kind:${kindFilter}` : ""}`,
      total_matched: matched.length,
      returned: Math.min(matched.length, limit),
      parse_errors,
      results: matched.slice(0, limit),
    };
  }

  /** MANAGER role - all docs/programs for a machine family (mill/lathe/wedm/etc). */
  findByMachineFamily(family: string, limit: number = DEFAULT_LIMIT): QueryResult {
    const empty: QueryResult = { ok: false, query: `machine_family:${family}`, total_matched: 0, returned: 0, parse_errors: 0, results: [] };
    if (!family || typeof family !== "string" || family.length === 0) {
      return { ...empty, reason: "empty-family" };
    }
    const { rows, parse_errors, reason } = this.loadRows();
    if (reason) return { ...empty, parse_errors, reason };
    const matched = rows.filter((r) => r.machine_family === family);
    matched.sort(byMtimeDesc);
    return {
      ok: true,
      query: `machine_family:${family}`,
      total_matched: matched.length,
      returned: Math.min(matched.length, limit),
      parse_errors,
      results: matched.slice(0, limit),
    };
  }

  /** ENGINEER role - programs by file extension (e.g. all .min files). */
  findByExtension(extension: string, limit: number = DEFAULT_LIMIT): QueryResult {
    const empty: QueryResult = { ok: false, query: `ext:${extension}`, total_matched: 0, returned: 0, parse_errors: 0, results: [] };
    if (!extension || typeof extension !== "string" || extension.length === 0) {
      return { ...empty, reason: "empty-extension" };
    }
    const { rows, parse_errors, reason } = this.loadRows();
    if (reason) return { ...empty, parse_errors, reason };
    const needle = "." + extension.toLowerCase().replace(/^\./, "");
    const matched = rows.filter((r) => r.abs_path.toLowerCase().endsWith(needle));
    matched.sort(byMtimeDesc);
    return {
      ok: true,
      query: `ext:${extension}`,
      total_matched: matched.length,
      returned: Math.min(matched.length, limit),
      parse_errors,
      results: matched.slice(0, limit),
    };
  }

  /**
   * ENGINEER role - files whose path contains ANY of the tokens (OR semantics).
   * Score = number of tokens matched; ties broken by recency.
   */
  findByTokens(tokens: string[], limit: number = DEFAULT_LIMIT): QueryResult {
    const empty: QueryResult = { ok: false, query: `tokens:${tokens.join(",")}`, total_matched: 0, returned: 0, parse_errors: 0, results: [] };
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return { ...empty, reason: "empty-tokens" };
    }
    const { rows, parse_errors, reason } = this.loadRows();
    if (reason) return { ...empty, parse_errors, reason };
    const normalized = tokens.map((t) => String(t).toLowerCase()).filter((t) => t.length > 0);
    if (normalized.length === 0) return { ...empty, parse_errors, reason: "all-tokens-empty" };
    const scored: Array<{ row: LedgerRow; score: number }> = [];
    for (const r of rows) {
      const path = r.abs_path.toLowerCase();
      let score = 0;
      for (const tok of normalized) if (path.includes(tok)) score++;
      if (score > 0) scored.push({ row: r, score });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.row.mtime_iso.localeCompare(a.row.mtime_iso);
    });
    const matched = scored.map((s) => s.row);
    return {
      ok: true,
      query: `tokens:${tokens.join(",")}`,
      total_matched: matched.length,
      returned: Math.min(matched.length, limit),
      parse_errors,
      results: matched.slice(0, limit),
    };
  }

  /** SALES/QUOTER overview - per-customer doc counts (top N). */
  customerRollup(limit: number = DEFAULT_LIMIT): { ok: boolean; total_customers: number; top_customers: Array<{ customer: string; doc_count: number }>; reason?: string } {
    const { rows, reason } = this.loadRows();
    if (reason) return { ok: false, total_customers: 0, top_customers: [], reason };
    const counts = new Map<string, number>();
    const re = /\/_PART LIBRARY\/([^/]+)\//i;
    for (const r of rows) {
      const m = re.exec(r.abs_path);
      if (m) {
        const cust = m[1].toUpperCase();
        counts.set(cust, (counts.get(cust) ?? 0) + 1);
      }
    }
    const top = Array.from(counts.entries())
      .map(([customer, doc_count]) => ({ customer, doc_count }))
      .sort((a, b) => b.doc_count - a.doc_count)
      .slice(0, limit);
    return { ok: true, total_customers: counts.size, top_customers: top };
  }
}

export const jmDieDocumentQueryEngine = new JMDieDocumentQueryEngine();
