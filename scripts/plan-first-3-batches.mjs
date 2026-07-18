#!/usr/bin/env node
/**
 * Plan first 3 batches from MILL+HURCO+WEDM subdirs (not yet ledger-seeded).
 * Output: a planning report the parallel-agent dispatcher can consume.
 */
import { jmDieScanCoordinatorEngine } from "../mcp-server/dist/engines/JMDieScanCoordinatorEngine.js";

const r = jmDieScanCoordinatorEngine.plan({
  archiveRoot: "H:/prism/JM DIE",
  batchSize: 2000,
  maxBatches: 3,
  walkLimit: 6000,
  subdirs: ["CNC MILL HAAS", "HURCO CNC PROGRAMS", "WIRE EDM", "CNC OKUMA MULTUS", "ROKU-ROKU"],
});

console.log(JSON.stringify({
  ok: r.ok,
  walked: r.walked_files,
  already: r.already_scanned,
  to_scan: r.to_scan,
  batch_count: r.batch_count,
  batches: r.batches.map((b) => ({
    id: b.batch_id,
    count: b.file_count,
    cnc: b.cnc_program_count,
    docu: b.docustrata_count,
    other: b.other_count,
    suggest: b.suggested_engine,
    families: b.family_mix,
    sample_files: b.files.slice(0, 3).map((f) => ({ rel: f.rel_path, fam: f.machine_family, ext: f.extension })),
  })),
  errors: r.errors,
}, null, 2));
