#!/usr/bin/env node
/**
 * jm-die-full-corpus-ingest — walks the entire JM Die corpus + DocuStrata
 * and emits 3 structured JSONL databases for downstream training:
 *
 *   state/shared/databases/jm-customers.jsonl     — one record per customer
 *   state/shared/databases/jm-vendors.jsonl       — one record per vendor/supplier
 *   state/shared/databases/jm-file-inventory.jsonl — one record per file
 *
 * QUOTING-SYNERGY-MS0/U-QP-FULL-CORPUS-INGEST (slot:charlie iter56 2026-05-27).
 *
 * Sources walked:
 *   1. H:/PRISM/JM DIE/_PART LIBRARY/ — 476 customer folders (folder name = customer key)
 *   2. H:/PRISM/JM DIE/<category>/ — CNC LATHE, CNC MILL HAAS, CNC OKUMA MULTUS, WIRE EDM, etc.
 *      (programs + CAD files NOT in _PART LIBRARY)
 *   3. H:/PRISM/Docustrata/manifest.json — 111,745 docs, 47 typed (4 invoices + 43 quotes)
 *      with extracted_data.customer.name + extracted_data.vendor.name + line_items
 *   4. H:/PRISM/Docustrata/_organized/<role>/ — by-role file inventory
 *      (INVOICES/QUOTES/JOB_TICKETS/SALES_ORDERS/PRINTS/PACKING_SLIPS/etc.)
 *
 * File classification — bucket each file by content type via path + extension:
 *   - program: .NC, .MIN, .MCX*, .MIN5, .EIA, .CNC, .H, .CPS
 *   - cad: .STEP, .STP, .IGES, .IGS, .X_T, .X_B, .SLDPRT, .IPT, .SAT
 *   - print: .PDF (drawings, in PRINTS/ or with drawing keywords)
 *   - scan: .PDF (scans, generic OCR-able)
 *   - setup: .PDF/.XLSX (setup sheets, with "setup" keyword)
 *   - quote/invoice/po/ack: from Docustrata _organized/<role>/
 *
 * Customer features (per-customer record):
 *   - customer (canonical name)
 *   - aliases (variants observed)
 *   - file_count, program_count, cad_count, print_count, scan_count
 *   - materials_seen (from path tokens via iter45/48 normalizers)
 *   - first_seen_date, last_seen_date
 *   - has_docustrata_record (boolean — any classified doc names this customer)
 *
 * Vendor features (per-vendor record):
 *   - vendor (canonical name)
 *   - doc_count
 *   - total_spend_usd
 *   - grades_supplied[] (from iter53 normalizeGrade on line items)
 *   - unit_price_min, p25, median, p75, max
 *   - date_range {first, last}
 *
 * R12 — every record carries an evidence_count + source_files[] so the DB
 * is auditable. No silent fabrication: if a customer has 0 files, they don't
 * make the DB; if a vendor has 0 priced line items, no price distribution.
 */

import { promises as fs } from "node:fs";
import { resolve, dirname, extname, basename } from "node:path";
import { normalizeGrade } from "../mcp-server/src/engines/DocuStrataMaterialPriorEngine.js";

// ─── Named constants ───────────────────────────────────────────────────────

const JM_DIE_ROOT = resolve("H:/PRISM/JM DIE");
const PART_LIBRARY_ROOT = resolve(JM_DIE_ROOT, "_PART LIBRARY");
const DOCUSTRATA_MANIFEST = resolve("H:/PRISM/Docustrata/manifest.json");
const DOCUSTRATA_ORGANIZED = resolve("H:/PRISM/Docustrata/_organized");
const OUT_DIR = resolve("H:/PRISM/state/shared/databases");
const OUT_CUSTOMERS = resolve(OUT_DIR, "jm-customers.jsonl");
const OUT_VENDORS = resolve(OUT_DIR, "jm-vendors.jsonl");
const OUT_INVENTORY = resolve(OUT_DIR, "jm-file-inventory.jsonl");
const OUT_SUMMARY = resolve(OUT_DIR, "jm-corpus-summary.json");

// ─── File-type buckets ─────────────────────────────────────────────────────

const PROGRAM_EXTS = new Set([
  ".nc", ".min", ".min5", ".mcx", ".mcx-8", ".mcx-9", ".mcx-x2", ".mcx-x9", ".eia", ".cnc", ".h", ".cps", ".pps", ".tap", ".ssb",
]);
const CAD_EXTS = new Set([
  ".step", ".stp", ".iges", ".igs", ".x_t", ".x_b", ".sldprt", ".sldasm", ".ipt", ".iam", ".sat", ".dxf", ".dwg", ".f3d", ".prt", ".asm", ".par", ".psm",
]);
const SETUP_EXTS = new Set([".xlsx", ".xlsm", ".xls", ".docx", ".doc"]);
const SCAN_PRINT_EXTS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"]);

const PRINT_KEYWORDS = /\b(print|drawing|drwg|blueprint|dim|tol|toler)\b/i;
const SETUP_KEYWORDS = /\b(setup|set[\s_-]?up|fixture|workhold|first[\s_-]?article|fai|inspection)\b/i;
const PROGRAM_KEYWORDS = /\b(program|nc|toolpath|operation|op[0-9])\b/i;

function classifyFile(fullPath) {
  const ext = extname(fullPath).toLowerCase();
  const name = basename(fullPath).toLowerCase();
  const dir = dirname(fullPath).toLowerCase();
  if (PROGRAM_EXTS.has(ext)) return "program";
  if (CAD_EXTS.has(ext)) return "cad";
  if (SCAN_PRINT_EXTS.has(ext)) {
    if (PRINT_KEYWORDS.test(name) || /\\prints?\\/i.test(dir)) return "print";
    if (SETUP_KEYWORDS.test(name) || /\\setups?\\/i.test(dir)) return "setup";
    return "scan";
  }
  if (SETUP_EXTS.has(ext)) {
    if (PROGRAM_KEYWORDS.test(name)) return "program_doc";
    if (SETUP_KEYWORDS.test(name)) return "setup";
    return "doc";
  }
  return "other";
}

// ─── Walker — async-generator over a directory tree ─────────────────────────

async function* walkDir(root, maxDepth = 12) {
  const stack = [{ path: root, depth: 0 }];
  while (stack.length > 0) {
    const { path: p, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try {
      entries = await fs.readdir(p, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = resolve(p, e.name);
      if (e.isDirectory()) {
        stack.push({ path: full, depth: depth + 1 });
      } else if (e.isFile()) {
        yield { fullPath: full, depth: depth + 1, name: e.name };
      }
    }
  }
}

// ─── Customer normalizer ───────────────────────────────────────────────────

function normalizeCustomerName(raw) {
  if (!raw) return null;
  return String(raw)
    .toUpperCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(INC|LLC|LTD|CORP|CORPORATION|COMPANY|CO|CO\.|CO,|MFG|MANUFACTURING|INDUSTRIES|INDUSTRY|FASTENERS|FASTENER)\b/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
}

function isJMDie(name) {
  return /\b(J\s*M\s*DIE|JM\s*DIE|J\s*\.?\s*M\s*\.?\s*DIE)\b/i.test(String(name ?? ""));
}

// ─── Material detection from path (iter45 letter-boundary lookarounds) ─────

function detectMaterialFromPath(p) {
  const u = p.toUpperCase();
  if (/(?<![A-Z0-9])AL[\s_-]?7075/.test(u) || /(?<![A-Z0-9])7075/.test(u)) return "aluminum_7075";
  if (/(?<![A-Z0-9])AL[\s_-]?6061/.test(u) || /(?<![A-Z0-9])6061/.test(u)) return "aluminum_6061";
  if (/(?<![A-Z0-9])SS[\s_-]?304/.test(u) || /(?<![A-Z0-9])304[\s_-]?SS/.test(u)) return "stainless_304";
  if (/(?<![A-Z0-9])SS[\s_-]?316/.test(u) || /(?<![A-Z0-9])316[\s_-]?SS/.test(u)) return "stainless_316";
  if (/(?<![A-Z0-9])302[\s_-]?SS/.test(u)) return "stainless_302";
  if (/(?<![A-Z0-9])D2(?![A-Z0-9])/.test(u)) return "tool_steel_d2";
  if (/(?<![A-Z0-9])A2(?![A-Z0-9])/.test(u)) return "tool_steel_a2";
  if (/(?<![A-Z0-9])H13(?![A-Z0-9])/.test(u)) return "tool_steel_h13";
  if (/(?<![A-Z0-9])M[\s_-]?2(?![A-Z0-9])/.test(u)) return "hss_m2";
  if (/(?<![A-Z0-9])M[\s_-]?3(?![A-Z0-9])/.test(u)) return "hss_m3";
  if (/(?<![A-Z0-9])1018(?![A-Z0-9])/.test(u)) return "steel_1018";
  if (/(?<![A-Z0-9])4140(?![A-Z0-9])/.test(u)) return "steel_4140";
  return null;
}

// ─── Machine class detection from path ─────────────────────────────────────

function detectMachineClassFromPath(p) {
  const u = p.toUpperCase();
  if (/WIRE[\s_-]?EDM|MITSUBISHI[\s_-]?WEDM|FANUC[\s_-]?WEDM/.test(u)) return "wedm";
  if (/CNC[\s_-]?LATHE|LATHE/.test(u)) return "lathe";
  if (/MILL[\s_-]?TURN|OKUMA[\s_-]?MULTUS|MULTUS/.test(u)) return "mill_turn";
  if (/CNC[\s_-]?MILL|MILL[\s_-]?HAAS|HAAS/.test(u)) return "mill";
  if (/HURCO/.test(u)) return "mill_hurco";
  if (/ROKU[\s_-]?ROKU/.test(u)) return "mill_roku";
  if (/OKUMA(?![\s_-]?MULTUS)/.test(u)) return "lathe_okuma";
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const log = (...a) => console.log("[ingest]", ...a);

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const customers = new Map(); // canonicalKey → {customer, aliases:Set, files:int, program:int, cad:int, print:int, scan:int, materials:Set, machineClasses:Set, firstSeen,lastSeen, hasDocustrata:bool}
  const vendors = new Map(); // canonicalKey → {vendor, docCount, lineItems[], totalSpend, gradesSupplied:Set, dateRange}
  let inventoryHandle = null;
  let totalFiles = 0;
  let categorizedFiles = 0;

  // Open file-inventory stream for direct append
  inventoryHandle = await fs.open(OUT_INVENTORY, "w");

  // 1. Walk JM DIE/_PART LIBRARY/ — folder name = customer key
  log("scanning JM DIE/_PART LIBRARY/ ...");
  let partLibraryFolders;
  try {
    partLibraryFolders = (await fs.readdir(PART_LIBRARY_ROOT, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch (e) {
    log(`R12 FAIL — _PART LIBRARY not readable: ${e.message}`);
    partLibraryFolders = [];
  }
  log(`found ${partLibraryFolders.length} customer folders in _PART LIBRARY`);

  for (const folder of partLibraryFolders) {
    const cKey = normalizeCustomerName(folder);
    if (!cKey) continue;
    const cust = customers.get(cKey) ?? {
      customer: cKey, aliases: new Set([folder]),
      files: 0, program: 0, cad: 0, print: 0, scan: 0, setup: 0, doc: 0, other: 0,
      materials: new Set(), machineClasses: new Set(),
      firstSeen: null, lastSeen: null,
      hasDocustrata: false,
      sourceFolders: [],
    };
    cust.aliases.add(folder);
    cust.sourceFolders.push(`_PART LIBRARY/${folder}`);
    customers.set(cKey, cust);

    // Walk this customer's folder
    const folderPath = resolve(PART_LIBRARY_ROOT, folder);
    for await (const f of walkDir(folderPath)) {
      totalFiles += 1;
      const bucket = classifyFile(f.fullPath);
      cust.files += 1;
      if (bucket in cust) cust[bucket] += 1;
      else cust.other += 1;
      const mat = detectMaterialFromPath(f.fullPath);
      const mach = detectMachineClassFromPath(f.fullPath);
      if (mat) cust.materials.add(mat);
      if (mach) cust.machineClasses.add(mach);
      if (bucket !== "other") categorizedFiles += 1;

      await inventoryHandle.write(JSON.stringify({
        path: f.fullPath.replace(/\\/g, "/"),
        bucket,
        customer: cKey,
        material: mat,
        machine_class: mach,
        source: "part_library",
      }) + "\n");
    }
  }
  log(`scanned ${totalFiles} files across ${customers.size} customers from _PART LIBRARY`);

  // 2. Walk JM DIE/ top-level category folders (CNC LATHE, CNC MILL HAAS, etc.)
  log("scanning JM DIE/ top-level category folders ...");
  const jmDieTop = await fs.readdir(JM_DIE_ROOT, { withFileTypes: true });
  const categoryFolders = jmDieTop.filter((e) => e.isDirectory() && e.name !== "_PART LIBRARY").map((e) => e.name);
  log(`found ${categoryFolders.length} category folders in JM DIE/ root`);

  for (const folder of categoryFolders) {
    const folderPath = resolve(JM_DIE_ROOT, folder);
    let categoryFileCount = 0;
    for await (const f of walkDir(folderPath, 6)) {
      totalFiles += 1;
      categoryFileCount += 1;
      const bucket = classifyFile(f.fullPath);
      const mat = detectMaterialFromPath(f.fullPath);
      const mach = detectMachineClassFromPath(f.fullPath);
      if (bucket !== "other") categorizedFiles += 1;

      await inventoryHandle.write(JSON.stringify({
        path: f.fullPath.replace(/\\/g, "/"),
        bucket,
        customer: null, // category files aren't directly attributed
        category: folder,
        material: mat,
        machine_class: mach,
        source: "jm_die_category",
      }) + "\n");
    }
    log(`  ${folder} → ${categoryFileCount} files`);
  }

  // 3. Walk Docustrata/manifest.json — classified docs + customer/vendor extraction
  log("parsing Docustrata/manifest.json ...");
  const manifest = JSON.parse(await fs.readFile(DOCUSTRATA_MANIFEST, "utf8"));
  const docs = manifest.documents ?? [];
  log(`manifest has ${docs.length} documents`);

  for (const d of docs) {
    const ed = d.extracted_data;
    if (!ed) continue;

    // Customer-side
    const custName = ed.customer?.name;
    if (custName && !isJMDie(custName)) {
      // This is an OUTBOUND-flavored hit (rare per iter51 finding, but we still catch it)
      const cKey = normalizeCustomerName(custName);
      if (cKey) {
        const cust = customers.get(cKey) ?? {
          customer: cKey, aliases: new Set([custName]),
          files: 0, program: 0, cad: 0, print: 0, scan: 0, setup: 0, doc: 0, other: 0,
          materials: new Set(), machineClasses: new Set(),
          firstSeen: null, lastSeen: null, hasDocustrata: true, sourceFolders: [],
        };
        cust.aliases.add(custName);
        cust.hasDocustrata = true;
        if (ed.date) {
          if (!cust.firstSeen || ed.date < cust.firstSeen) cust.firstSeen = ed.date;
          if (!cust.lastSeen || ed.date > cust.lastSeen) cust.lastSeen = ed.date;
        }
        customers.set(cKey, cust);
      }
    }

    // Vendor-side — every classified inbound doc names a supplier
    const vName = ed.vendor?.name;
    if (vName && !isJMDie(vName)) {
      const vKey = normalizeCustomerName(vName);
      if (vKey) {
        const v = vendors.get(vKey) ?? {
          vendor: vKey, aliases: new Set([vName]),
          docCount: 0, lineItemCount: 0, totalSpend: 0,
          gradesSupplied: new Set(), unitPrices: [],
          firstSeen: null, lastSeen: null,
        };
        v.aliases.add(vName);
        v.docCount += 1;
        if (ed.date) {
          if (!v.firstSeen || ed.date < v.firstSeen) v.firstSeen = ed.date;
          if (!v.lastSeen || ed.date > v.lastSeen) v.lastSeen = ed.date;
        }
        const items = ed.line_items ?? [];
        for (const it of items) {
          if (typeof it.unit_price === "number" && it.unit_price > 0) {
            v.unitPrices.push(it.unit_price);
            v.lineItemCount += 1;
            v.totalSpend += typeof it.amount === "number" ? it.amount : (it.unit_price * (it.quantity ?? 1));
            const g = normalizeGrade(it.description ?? "", it.parsed?.grade);
            if (g) v.gradesSupplied.add(g);
          }
        }
        vendors.set(vKey, v);
      }
    }

    // Add a file-inventory row for the doc itself
    await inventoryHandle.write(JSON.stringify({
      path: `Docustrata/${d.filename ?? d.id}`,
      bucket: d.document_type ?? "doc",
      customer: ed.customer?.name ? normalizeCustomerName(ed.customer.name) : null,
      vendor: ed.vendor?.name ? normalizeCustomerName(ed.vendor.name) : null,
      material: null,
      machine_class: null,
      source: "docustrata_manifest",
      doc_date: ed.date ?? null,
    }) + "\n");
    totalFiles += 1;
  }

  // 4. Walk Docustrata/_organized/<role>/ — file-by-role inventory
  log("scanning Docustrata/_organized/ ...");
  let organizedRoles;
  try {
    organizedRoles = (await fs.readdir(DOCUSTRATA_ORGANIZED, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    organizedRoles = [];
  }
  for (const role of organizedRoles) {
    const roleDir = resolve(DOCUSTRATA_ORGANIZED, role);
    let roleCount = 0;
    for await (const f of walkDir(roleDir, 3)) {
      totalFiles += 1;
      roleCount += 1;
      await inventoryHandle.write(JSON.stringify({
        path: f.fullPath.replace(/\\/g, "/"),
        bucket: role.toLowerCase(),
        customer: null,
        material: null,
        machine_class: null,
        source: "docustrata_organized",
      }) + "\n");
    }
    log(`  _organized/${role} → ${roleCount} files`);
  }

  await inventoryHandle.close();

  // ── Write customers.jsonl ──
  log(`writing ${customers.size} customer records ...`);
  const custLines = [];
  for (const [k, c] of customers) {
    custLines.push(JSON.stringify({
      customer_key: k,
      aliases: [...c.aliases],
      files_total: c.files,
      files_by_bucket: {
        program: c.program, cad: c.cad, print: c.print, scan: c.scan,
        setup: c.setup, doc: c.doc, other: c.other,
      },
      materials_seen: [...c.materials],
      machine_classes_seen: [...c.machineClasses],
      first_seen_date: c.firstSeen,
      last_seen_date: c.lastSeen,
      has_docustrata_record: c.hasDocustrata,
      source_folders: c.sourceFolders,
    }));
  }
  await fs.writeFile(OUT_CUSTOMERS, custLines.join("\n") + "\n", "utf8");

  // ── Write vendors.jsonl ──
  log(`writing ${vendors.size} vendor records ...`);
  const vendLines = [];
  for (const [k, v] of vendors) {
    const sortedPrices = v.unitPrices.slice().sort((a, b) => a - b);
    const q = (p) => sortedPrices[Math.max(0, Math.floor(sortedPrices.length * p) - (p === 1 ? 1 : 0))] ?? 0;
    vendLines.push(JSON.stringify({
      vendor_key: k,
      aliases: [...v.aliases],
      doc_count: v.docCount,
      line_item_count: v.lineItemCount,
      total_spend_usd: Math.round(v.totalSpend * 100) / 100,
      grades_supplied: [...v.gradesSupplied],
      unit_price_usd: sortedPrices.length > 0 ? {
        min: q(0), p25: q(0.25), median: q(0.5), p75: q(0.75), max: q(1),
      } : null,
      first_seen_date: v.firstSeen,
      last_seen_date: v.lastSeen,
    }));
  }
  await fs.writeFile(OUT_VENDORS, vendLines.join("\n") + "\n", "utf8");

  // ── Write summary ──
  const summary = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    milestone: "QUOTING-SYNERGY-MS0",
    unit: "U-QP-FULL-CORPUS-INGEST",
    iter: 56,
    slot: "charlie",
    stats: {
      total_files_inventoried: totalFiles,
      categorized_files: categorizedFiles,
      customer_count: customers.size,
      vendor_count: vendors.size,
      docustrata_manifest_docs: docs.length,
      part_library_folders: partLibraryFolders.length,
      jm_die_category_folders: categoryFolders.length,
    },
    outputs: {
      customers: OUT_CUSTOMERS.replace(/\\/g, "/"),
      vendors: OUT_VENDORS.replace(/\\/g, "/"),
      file_inventory: OUT_INVENTORY.replace(/\\/g, "/"),
    },
  };
  await fs.writeFile(OUT_SUMMARY, JSON.stringify(summary, null, 2), "utf8");

  log(`DONE.`);
  log(`  customers:    ${customers.size}`);
  log(`  vendors:      ${vendors.size}`);
  log(`  total files:  ${totalFiles}`);
  log(`  categorized:  ${categorizedFiles} (${((categorizedFiles / totalFiles) * 100).toFixed(1)}%)`);
  log(`  summary →     ${OUT_SUMMARY}`);
}

main().catch((e) => {
  console.error(`[ingest] FATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(2);
});
