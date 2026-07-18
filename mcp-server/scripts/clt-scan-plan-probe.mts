/**
 * CLT-1 live probe -- run the (fixed) JMDieScanCoordinatorEngine.plan() against the
 * REAL JM DIE corpus + REAL scan ledger and print ONLY the summary numbers (never
 * the batches: a full plan is ~108MB of file records). Proves the canonical-path
 * ledger diff live: pre-fix to_scan == walked_files (317,130); post-fix to_scan
 * must equal walked - canon(already_scanned intersection).
 *
 * Usage: npx tsx scripts/clt-scan-plan-probe.mts [archiveRoot]
 */
import { JMDieScanCoordinatorEngine } from "../src/engines/JMDieScanCoordinatorEngine.js";

const root = process.argv[2] ?? "H:/PRISM/JM DIE";
const c = new JMDieScanCoordinatorEngine();
const s = c.plan({ archiveRoot: root, batchSize: 5000 });
console.log(JSON.stringify({
  ok: s.ok,
  archive_root: s.archive_root,
  walked_files: s.walked_files,
  already_scanned: s.already_scanned,
  to_scan: s.to_scan,
  batch_count: s.batch_count,
  errors: s.errors.slice(0, 3),
}));
