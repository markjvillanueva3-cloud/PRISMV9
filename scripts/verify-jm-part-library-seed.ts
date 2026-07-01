#!/usr/bin/env tsx
/**
 * verify-jm-part-library-seed — real-data check for U-JMDOC05 (JM-DOC-POPULATION-MS0, slot:hotel).
 *
 * The unit test proves seedFromJMCorpus on samples. This closes the live-E2E gap by streaming the
 * REAL jm-file-inventory.jsonl (554,999 rows), filtering to the STRUCTURAL part_library/other rows
 * with the SAME classifier the engine + ledger use, running the ACTUAL
 * PartsLibraryEngine.seedFromJMCorpus, and asserting:
 *   - the structural count reconciles with the accountability ledger:
 *       streamed_structural === by_source_bucket(part_library/other).count − unrouted(part_library/other).count
 *     (i.e. the 30,890 structural rows = full tuple minus the 133 non-structural deferred rows)
 *   - the 5 counters PARTITION every row (zero silent drops)
 *   - every structural row resolves to a part (skipped_invalid === 0 on the real corpus)
 *   - getStats().total_parts === parts_created
 *   - re-seeding is idempotent (0 new parts, all rows skipped_existing)
 *
 * Run: npx tsx scripts/verify-jm-part-library-seed.ts   (from repo root). Exit 0 = PASS, 1 = FAIL.
 */
import { promises as fs, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import {
  partsLibraryEngine,
  isStructuralPartLibraryOther,
  type JMPartSeedRecord,
} from "../mcp-server/src/engines/PartsLibraryEngine.js";

const INVENTORY = resolve("state/shared/databases/jm-file-inventory.jsonl");
const LEDGER = resolve("state/shared/databases/jm-document-ledger-summary.json");
const TUPLE = "part_library/other";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  // Expected structural count from the proven ledger: full tuple count minus the
  // explicitly-deferred non-structural rows.
  const ledger = JSON.parse(await fs.readFile(LEDGER, "utf8").catch(() => fail(`cannot read ${LEDGER}`)));
  const tupleRow = (ledger.by_source_bucket as Array<{ source: string; bucket: string; count: number }>)
    .find((t) => `${t.source}/${t.bucket}` === TUPLE);
  if (!tupleRow) fail(`ledger has no by_source_bucket row for ${TUPLE}`);
  const unroutedRow = (ledger.unrouted_detail as Array<{ source: string; bucket: string; count: number }>)
    .find((u) => `${u.source}/${u.bucket}` === TUPLE);
  const nonStructural = unroutedRow?.count ?? 0;
  const expectedStructural = tupleRow.count - nonStructural;
  console.log(`ledger ${TUPLE}: ${tupleRow.count} total − ${nonStructural} non-structural(deferred) = ${expectedStructural} structural expected`);

  // Stream the real inventory, filter to the structural part_library/other rows.
  const records: JMPartSeedRecord[] = [];
  await new Promise<void>((res, rej) => {
    const rl = createInterface({ input: createReadStream(INVENTORY, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      let rec: any;
      try { rec = JSON.parse(t); } catch { return; }
      if (rec && isStructuralPartLibraryOther(rec)) records.push(rec);
    });
    rl.on("close", () => res());
    rl.on("error", rej);
  });
  console.log(`streamed + filtered ${records.length} structural ${TUPLE} rows from the real inventory`);

  if (records.length !== expectedStructural) {
    fail(`filtered ${records.length} != ledger-expected structural ${expectedStructural} (classifier drift between engine and build-jm-document-ledger.mjs)`);
  }

  // Run the ACTUAL engine seed.
  const r = partsLibraryEngine.seedFromJMCorpus(records);
  console.log(`seed: ${JSON.stringify({
    total: r.total_records, parts_created: r.parts_created, revisions_added: r.revisions_added,
    existing: r.skipped_existing, oos: r.skipped_out_of_scope, invalid: r.skipped_invalid,
    distinct_customers: r.distinct_customers,
  })}`);

  // Partition invariant (zero silent drops).
  const partition = r.parts_created + r.revisions_added + r.skipped_existing + r.skipped_out_of_scope + r.skipped_invalid;
  if (partition !== r.total_records) {
    fail(`partition ${partition} != total_records ${r.total_records} (a row was double-counted or dropped)`);
  }
  if (r.skipped_out_of_scope !== 0) fail(`expected 0 out-of-scope (pre-filtered to structural), got ${r.skipped_out_of_scope}`);
  if (r.skipped_invalid !== 0) fail(`expected 0 invalid on the real corpus (every structural row must derive an identity), got ${r.skipped_invalid}`);
  if (r.parts_created < 100) fail(`expected >=100 parts seeded, got ${r.parts_created}`);
  if (r.distinct_customers < 1) fail(`expected >=1 distinct customer, got ${r.distinct_customers}`);

  const stats = partsLibraryEngine.getStats();
  if (stats.total_parts !== r.parts_created) {
    fail(`catalog total_parts ${stats.total_parts} != parts_created ${r.parts_created}`);
  }
  console.log(`catalog: ${stats.total_parts} parts, ${stats.total_revisions} revisions across ${r.distinct_customers} customers`);

  // Idempotency on real data: re-seed adds nothing; every row is now skipped_existing.
  const r2 = partsLibraryEngine.seedFromJMCorpus(records);
  if (r2.parts_created !== 0 || r2.revisions_added !== 0 || r2.skipped_existing !== r2.total_records) {
    fail(`idempotency broken: re-seed parts_created=${r2.parts_created} revisions_added=${r2.revisions_added} skipped_existing=${r2.skipped_existing}/${r2.total_records}`);
  }
  if (partsLibraryEngine.getStats().total_parts !== stats.total_parts) {
    fail(`re-seed mutated the catalog (total_parts changed)`);
  }
  console.log(`idempotency OK: re-seed added 0 new parts/revisions, skipped all ${r2.skipped_existing} existing rows`);

  console.log(`PASS — ${r.parts_created} JM parts (${stats.total_revisions} revisions, ${r.distinct_customers} customers) seeded from ${records.length} structural ${TUPLE} rows; reconciles with ledger (${expectedStructural}), partition holds (zero silent drops), idempotent.`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
