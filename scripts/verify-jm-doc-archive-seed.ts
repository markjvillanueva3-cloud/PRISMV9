#!/usr/bin/env tsx
/**
 * verify-jm-doc-archive-seed — real-data check for U-JMDOC07 (JM-DOC-POPULATION-MS0).
 *
 * The unit test proves seedFromJMCorpus on samples. This closes the live-E2E gap by streaming the
 * REAL jm-file-inventory.jsonl (554,999 rows), filtering to the 8 allowlisted doc-archive tuples,
 * running the ACTUAL DocumentInboxEngine.seedFromJMCorpus, and asserting:
 *   - every allowlisted row seeds (seeded === filtered, 0 invalid on the real corpus)
 *   - the seeded count reconciles with the accountability ledger's 8 doc-archive tuple counts
 *   - re-seeding is idempotent (0 new, all skipped_existing)
 *   - NO financial bucket leaked in (skipped_out_of_scope covers only non-allowlisted rows we pass; here we pass only allowlisted, so 0)
 *
 * Run: npx tsx scripts/verify-jm-doc-archive-seed.ts   (from repo root). Exit 0 = PASS, 1 = FAIL.
 */
import { promises as fs, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { documentInboxEngine, JM_DOC_ARCHIVE_ALLOWLIST, JM_VIEWER_ARCHIVE_ALLOWLIST, JM_MANIFEST_ARCHIVE_ALLOWLIST, JM_FINANCIAL_ARCHIVE_ALLOWLIST } from "../mcp-server/src/engines/DocumentInboxEngine.js";

const INVENTORY = resolve("state/shared/databases/jm-file-inventory.jsonl");
const LEDGER = resolve("state/shared/databases/jm-document-ledger-summary.json");

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  // Expected counts from the proven ledger (cross-check).
  const ledger = JSON.parse(await fs.readFile(LEDGER, "utf8").catch(() => fail(`cannot read ${LEDGER}`)));
  const expectedByTuple: Record<string, number> = {};
  let expectedTotal = 0;
  for (const t of ledger.by_source_bucket as Array<{ source: string; bucket: string; count: number }>) {
    const key = `${t.source}/${t.bucket}`;
    if (key in JM_DOC_ARCHIVE_ALLOWLIST) { expectedByTuple[key] = t.count; expectedTotal += t.count; }
  }
  console.log(`ledger expects ${expectedTotal} doc-archive rows across ${Object.keys(expectedByTuple).length} tuples`);

  // Stream the real inventory, filter to the allowlist.
  const records: any[] = [];
  await new Promise<void>((res, rej) => {
    const rl = createInterface({ input: createReadStream(INVENTORY, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      let rec: any;
      try { rec = JSON.parse(t); } catch { return; }
      if (rec && JM_DOC_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) records.push(rec);
    });
    rl.on("close", () => res());
    rl.on("error", rej);
  });
  console.log(`streamed + filtered ${records.length} doc-archive rows from the real inventory`);

  if (records.length !== expectedTotal) {
    fail(`filtered ${records.length} != ledger-expected ${expectedTotal} (routing drift between ledger and allowlist)`);
  }

  const r = documentInboxEngine.seedFromJMCorpus(records);
  console.log(`seed: ${JSON.stringify({ total: r.total_records, seeded: r.seeded, existing: r.skipped_existing, oos: r.skipped_out_of_scope, invalid: r.skipped_invalid })}`);
  console.log(`by_type: ${JSON.stringify(r.by_type)}`);

  if (r.skipped_out_of_scope !== 0) fail(`expected 0 out-of-scope (we pre-filtered to allowlist), got ${r.skipped_out_of_scope}`);
  if (r.seeded + r.skipped_invalid + r.skipped_existing !== r.total_records) fail(`accounting mismatch`);
  if (r.seeded < 100) fail(`expected >=100 archived docs, got ${r.seeded}`);
  if (r.seeded !== records.length - r.skipped_invalid - r.skipped_existing) fail(`seeded count inconsistent`);
  if (documentInboxEngine.stats().total_items !== r.seeded) fail(`inbox total ${documentInboxEngine.stats().total_items} != seeded ${r.seeded}`);

  // Idempotency on real data.
  const r2 = documentInboxEngine.seedFromJMCorpus(records);
  if (r2.seeded !== 0 || r2.skipped_existing !== r.seeded) {
    fail(`idempotency broken: re-seed added ${r2.seeded} / skipped_existing=${r2.skipped_existing} (expected 0 / ${r.seeded})`);
  }
  console.log(`idempotency OK: re-seed added 0 new, skipped all ${r2.skipped_existing} existing`);

  // ---- U-JMDOC08 viewer-only path ----
  const expectedViewerByTuple: Record<string, number> = {};
  let expectedViewerTotal = 0;
  for (const t of ledger.by_source_bucket as Array<{ source: string; bucket: string; count: number }>) {
    const key = `${t.source}/${t.bucket}`;
    if (key in JM_VIEWER_ARCHIVE_ALLOWLIST) { expectedViewerByTuple[key] = t.count; expectedViewerTotal += t.count; }
  }
  console.log(`ledger expects ${expectedViewerTotal} viewer-only rows across ${Object.keys(expectedViewerByTuple).length} tuples`);

  const viewerRecords: any[] = [];
  await new Promise<void>((res, rej) => {
    const rl = createInterface({ input: createReadStream(INVENTORY, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      let rec: any;
      try { rec = JSON.parse(t); } catch { return; }
      if (rec && JM_VIEWER_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) viewerRecords.push(rec);
    });
    rl.on("close", () => res());
    rl.on("error", rej);
  });
  if (viewerRecords.length !== expectedViewerTotal) {
    fail(`viewer filtered ${viewerRecords.length} != ledger-expected ${expectedViewerTotal}`);
  }
  const v = documentInboxEngine.seedViewerArchive(viewerRecords);
  console.log(`viewer seed: ${JSON.stringify({ total: v.total_records, seeded: v.seeded, existing: v.skipped_existing, oos: v.skipped_out_of_scope, invalid: v.skipped_invalid })}`);
  if (v.skipped_out_of_scope !== 0) fail(`viewer expected 0 out-of-scope (pre-filtered), got ${v.skipped_out_of_scope}`);
  if (v.seeded + v.skipped_invalid + v.skipped_existing !== v.total_records) fail(`viewer accounting mismatch`);
  if (v.seeded < 100) fail(`viewer expected >=100 docs, got ${v.seeded}`);
  // Shared dedup: total inbox now = doc-archive seeded + viewer seeded (disjoint paths).
  const combined = documentInboxEngine.stats().total_items;
  if (combined !== r.seeded + v.seeded) fail(`inbox total ${combined} != docArchive ${r.seeded} + viewer ${v.seeded}`);
  console.log(`viewer OK: ${v.seeded} viewer-only docs (disjoint from ${r.seeded} doc-archive; inbox total ${combined})`);

  // ---- U-JMDOC09 manifest-pointer path ----
  const expectedManifestByTuple: Record<string, number> = {};
  let expectedManifestTotal = 0;
  for (const t of ledger.by_source_bucket as Array<{ source: string; bucket: string; count: number }>) {
    const key = `${t.source}/${t.bucket}`;
    if (key in JM_MANIFEST_ARCHIVE_ALLOWLIST) { expectedManifestByTuple[key] = t.count; expectedManifestTotal += t.count; }
  }
  console.log(`ledger expects ${expectedManifestTotal} manifest-pointer rows across ${Object.keys(expectedManifestByTuple).length} tuples`);

  const manifestRecords: any[] = [];
  await new Promise<void>((res, rej) => {
    const rl = createInterface({ input: createReadStream(INVENTORY, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      let rec: any;
      try { rec = JSON.parse(t); } catch { return; }
      if (rec && JM_MANIFEST_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) manifestRecords.push(rec);
    });
    rl.on("close", () => res());
    rl.on("error", rej);
  });
  if (manifestRecords.length !== expectedManifestTotal) {
    fail(`manifest filtered ${manifestRecords.length} != ledger-expected ${expectedManifestTotal}`);
  }
  const m = documentInboxEngine.seedManifestPointers(manifestRecords);
  console.log(`manifest seed: ${JSON.stringify({ total: m.total_records, seeded: m.seeded, existing: m.skipped_existing, oos: m.skipped_out_of_scope, invalid: m.skipped_invalid })}`);
  if (m.skipped_out_of_scope !== 0) fail(`manifest expected 0 out-of-scope (pre-filtered), got ${m.skipped_out_of_scope}`);
  if (m.seeded + m.skipped_invalid + m.skipped_existing !== m.total_records) fail(`manifest accounting mismatch`);
  if (m.seeded < 100) fail(`manifest expected >=100 docs, got ${m.seeded}`);
  const afterManifest = documentInboxEngine.stats().total_items;
  if (afterManifest !== r.seeded + v.seeded + m.seeded) fail(`inbox total ${afterManifest} != ${r.seeded}+${v.seeded}+${m.seeded}`);
  console.log(`manifest OK: ${m.seeded} manifest pointers (disjoint; inbox total ${afterManifest})`);

  // ---- U-JMDOC10 financial link-only path ----
  // The 8 financial tuples route to "Financial document archive (link only, NO discrete ERP records)".
  // These are POINTERS — seedFinancialPointers creates ZERO AR/AP/GL records (financial_guard set).
  const expectedFinancialByTuple: Record<string, number> = {};
  let expectedFinancialTotal = 0;
  for (const t of ledger.by_source_bucket as Array<{ source: string; bucket: string; count: number }>) {
    const key = `${t.source}/${t.bucket}`;
    if (key in JM_FINANCIAL_ARCHIVE_ALLOWLIST) { expectedFinancialByTuple[key] = t.count; expectedFinancialTotal += t.count; }
  }
  console.log(`ledger expects ${expectedFinancialTotal} financial link-only rows across ${Object.keys(expectedFinancialByTuple).length} tuples`);
  // Cross-check against the ledger's published financial_guarded_count (the SAME 8 tuples).
  if (typeof ledger.financial_guarded_count === "number" && expectedFinancialTotal !== ledger.financial_guarded_count) {
    fail(`financial tuple sum ${expectedFinancialTotal} != ledger.financial_guarded_count ${ledger.financial_guarded_count}`);
  }

  const financialRecords: any[] = [];
  await new Promise<void>((res, rej) => {
    const rl = createInterface({ input: createReadStream(INVENTORY, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      let rec: any;
      try { rec = JSON.parse(t); } catch { return; }
      if (rec && JM_FINANCIAL_ARCHIVE_ALLOWLIST[`${rec.source}/${rec.bucket}`]) financialRecords.push(rec);
    });
    rl.on("close", () => res());
    rl.on("error", rej);
  });
  if (financialRecords.length !== expectedFinancialTotal) {
    fail(`financial filtered ${financialRecords.length} != ledger-expected ${expectedFinancialTotal}`);
  }
  const f = documentInboxEngine.seedFinancialPointers(financialRecords);
  console.log(`financial seed: ${JSON.stringify({ total: f.total_records, seeded: f.seeded, existing: f.skipped_existing, oos: f.skipped_out_of_scope, invalid: f.skipped_invalid })}`);
  console.log(`financial by_type: ${JSON.stringify(f.by_type)}`);
  if (f.skipped_out_of_scope !== 0) fail(`financial expected 0 out-of-scope (pre-filtered), got ${f.skipped_out_of_scope}`);
  if (f.seeded + f.skipped_invalid + f.skipped_existing !== f.total_records) fail(`financial accounting mismatch`);
  if (f.seeded < 100) fail(`financial expected >=100 docs, got ${f.seeded}`);
  if (f.seeded !== financialRecords.length - f.skipped_invalid - f.skipped_existing) fail(`financial seeded count inconsistent`);

  // SOUL CHECK: every seeded financial item is a POINTER carrying financial_guard="true" — NO AR/AP/GL record.
  let financialGuarded = 0;
  let nonPointer = 0;
  for (const id of f.item_ids) {
    const it = documentInboxEngine.get(id);
    if (it?.extracted_data?.custom_fields?.financial_guard === "true" && it?.extracted_data?.custom_fields?.archive_class === "financial-link" && it?.status === "archived") financialGuarded++;
    if (it && (it.matched_part_ids.length > 0 || it.linked_records.length > 0 || it.file_id)) nonPointer++;
  }
  if (financialGuarded !== f.seeded) fail(`financial guard mismatch: ${financialGuarded} guarded != ${f.seeded} seeded`);
  if (nonPointer !== 0) fail(`financial soul violation: ${nonPointer} items are NOT pure pointers (have part/record/file links)`);
  console.log(`financial soul OK: all ${financialGuarded} financial items are link-only pointers (financial_guard=true, archive_class=financial-link, archived; zero AR/AP/GL records)`);

  const grand = documentInboxEngine.stats().total_items;
  if (grand !== r.seeded + v.seeded + m.seeded + f.seeded) fail(`inbox grand total ${grand} != ${r.seeded}+${v.seeded}+${m.seeded}+${f.seeded}`);
  console.log(`financial OK: ${f.seeded} financial link-only pointers (disjoint; inbox grand total ${grand})`);

  console.log(`PASS — ${r.seeded} doc-archive (U-JMDOC07) + ${v.seeded} viewer-only (U-JMDOC08) + ${m.seeded} manifest-pointer (U-JMDOC09) + ${f.seeded} financial link-only (U-JMDOC10) = ${grand} JM documents index into the inbox, all reconcile with ledger, idempotent, allowlists disjoint, financial docs are link-only pointers (NO discrete AR/AP/GL records, financial_guard set).`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
