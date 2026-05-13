#!/usr/bin/env node
// tier: T4
/**
 * customer-directory-watcher.mjs — U-CUC05 Stop hook
 *
 * Watches for new customer directories in JM DIE/ and catalogs them.
 * Debounced hourly to avoid excessive scanning on every session stop.
 * Outputs to CUSTOMER_CAD_CATALOG.jsonl.
 */

import { readdirSync, statSync, readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const JM_DIE_ROOT = "H:/prism/JM DIE";
const STATE_DIR = "H:/prism/mcp-server/data/state";
const CATALOG_PATH = path.join(STATE_DIR, "CUSTOMER_CAD_CATALOG.jsonl");
const LAST_RUN_PATH = path.join(STATE_DIR, "customer-watcher-last-run.json");
const DEBOUNCE_HOURS = 1;

// Machine type directories that contain customer subdirectories
const MACHINE_DIRS = [
  "CNC LATHE",
  "CNC MILL HAAS",
  "HAAS-HURCO",
  "WIRE EDM",
  "OKUMA",
  "ROKU-ROKU",
  "CNC OKUMA MULTUS",
];

// Non-customer directories to skip
const SKIP_DIRS = new Set([
  "POSTS AND MACHINES",
  "OLD",
  "BACKUP",
  "ARCHIVE",
  "TEMP",
  "TEST",
  "hyperCAD-S and hyperMILL Online Training",
]);

function shouldDebounce() {
  try {
    if (!existsSync(LAST_RUN_PATH)) return false;
    const lastRun = JSON.parse(readFileSync(LAST_RUN_PATH, "utf8"));
    const ageHours = (Date.now() - new Date(lastRun.timestamp).getTime()) / (1000 * 60 * 60);
    return ageHours < DEBOUNCE_HOURS;
  } catch {
    return false;
  }
}

function updateLastRun() {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(LAST_RUN_PATH, JSON.stringify({
    timestamp: new Date().toISOString(),
    customersScanned: true,
  }));
}

function getKnownCustomers() {
  const known = new Set();
  try {
    if (!existsSync(CATALOG_PATH)) return known;
    const lines = readFileSync(CATALOG_PATH, "utf8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        known.add(entry.customerPath);
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist yet
  }
  return known;
}

function scanCustomerDirectories() {
  const customers = [];

  for (const machineDir of MACHINE_DIRS) {
    const machinePath = path.join(JM_DIE_ROOT, machineDir);
    let entries;
    try {
      entries = readdirSync(machinePath);
    } catch {
      continue; // Directory doesn't exist
    }

    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const fullPath = path.join(machinePath, name);

      try {
        const st = statSync(fullPath);
        if (!st.isDirectory()) continue;

        // Count files in this customer directory
        let fileCount = 0;
        let cadExts = new Set();
        try {
          const files = readdirSync(fullPath, { recursive: true });
          for (const f of files) {
            if (typeof f === "string") {
              fileCount++;
              const ext = path.extname(f).toLowerCase();
              if (ext && ext.length > 1) cadExts.add(ext);
            }
          }
        } catch {
          // Can't read subdirectories
        }

        customers.push({
          customerName: name,
          customerPath: fullPath,
          machineType: machineDir,
          fileCount,
          extensions: [...cadExts].slice(0, 10),
          discoveredAt: new Date().toISOString(),
          dirMtime: st.mtime.toISOString(),
        });
      } catch {
        continue;
      }
    }
  }

  return customers;
}

function main() {
  const result = { continue: true, systemMessage: "" };

  try {
    // Check debounce
    if (shouldDebounce()) {
      console.log(JSON.stringify(result));
      return;
    }

    const known = getKnownCustomers();
    const current = scanCustomerDirectories();

    // Find new customers
    const newCustomers = current.filter(c => !known.has(c.customerPath));

    if (newCustomers.length === 0) {
      updateLastRun();
      console.log(JSON.stringify(result));
      return;
    }

    // Append new customers to catalog
    mkdirSync(STATE_DIR, { recursive: true });
    for (const customer of newCustomers) {
      appendFileSync(CATALOG_PATH, JSON.stringify(customer) + "\n");
    }

    updateLastRun();

    // Report new customers
    const names = newCustomers.slice(0, 5).map(c => c.customerName).join(", ");
    const suffix = newCustomers.length > 5 ? ` +${newCustomers.length - 5} more` : "";
    result.systemMessage = `📁 NEW CUSTOMERS DETECTED: ${newCustomers.length} new customer directories in JM DIE: ${names}${suffix}. Added to CUSTOMER_CAD_CATALOG.jsonl.`;

    console.log(JSON.stringify(result));
  } catch (err) {
    result.systemMessage = `customer-directory-watcher: ${err.message}`;
    console.log(JSON.stringify(result));
  }
}

main();
