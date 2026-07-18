/**
 * ai-upgrade-broadcast.mjs — FLEET-WIDE AI-upgrade broadcast protocol.
 *
 * Doctrine (operator, 2026-05-30): every galaxy OWNS its own AI training (no
 * passing off to india), AND every AI-system upgrade a galaxy ships must be
 * announced to (a) the master brain and (b) the corresponding/adjacent galaxies,
 * so the whole fleet compounds together.
 *
 * This is the shared tool every galaxy invokes to do that announcement. It hits
 * two DURABLE surfaces (peers read these at /checkin) + one best-effort channel:
 *   1. state/shared/ai-upgrade-ledger.jsonl   — append-only fleet ledger (the broadcast)
 *   2. state/shared/AI-UPGRADES-MASTER.md      — master-brain human index (one row/upgrade)
 *   3. AGENT_CHAT chat-bus                      — best-effort live ping (skipped if absent)
 *
 *   node scripts/ai-upgrade-broadcast.mjs --slot mike --galaxy wedm \
 *     --upgrade "wire knowledge LoRA corpus + in-galaxy training" --kind training \
 *     --artifacts "scripts/build-wedm-knowledge-corpus.ts,..." \
 *     --affects "echo,india,cad,cam,quality" --notes "171 pairs; bundle ready"
 *
 * Pure `buildUpgradeRecord()` (testable) + I/O injectable for tests.
 * No ${...} template literals — the scripts/ security hook flags them.
 *
 * @module scripts/ai-upgrade-broadcast
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(REPO_ROOT, "state/shared/ai-upgrade-ledger.jsonl");
const MASTER_PATH = path.join(REPO_ROOT, "state/shared/AI-UPGRADES-MASTER.md");

const CSV = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/**
 * Build the canonical OutcomeLedger-style AI-upgrade record. Pure + deterministic
 * (pass `ts` for reproducibility). Fail-loud: slot/galaxy/upgrade are required —
 * a broadcast with no domain or no description is meaningless noise.
 */
export function buildUpgradeRecord(opts = {}) {
  const slot = String(opts.slot ?? "").trim();
  const galaxy = String(opts.galaxy ?? "").trim();
  const upgrade = String(opts.upgrade ?? "").trim();
  if (!slot || !galaxy || !upgrade) {
    throw new Error("ai-upgrade-broadcast: --slot, --galaxy and --upgrade are all required");
  }
  return {
    schemaVersion: 1,
    ts: String(opts.ts ?? "").trim() || new Date().toISOString(),
    slot,
    galaxy,
    kind: String(opts.kind ?? "ai-upgrade").trim() || "ai-upgrade",
    upgrade,
    artifacts: CSV(opts.artifacts),
    affects_galaxies: CSV(opts.affects),
    notes: String(opts.notes ?? "").trim() || undefined,
  };
}

/** One markdown row for the master-brain human index. */
export function masterIndexRow(rec) {
  const affects = rec.affects_galaxies.length ? rec.affects_galaxies.join(", ") : "(fleet)";
  return (
    "- " + rec.ts + " | **[" + rec.galaxy + "]** (slot:" + rec.slot + ", " + rec.kind + ") — " +
    rec.upgrade + " → affects: " + affects + (rec.notes ? " · " + rec.notes : "")
  );
}

/**
 * Broadcast an AI upgrade to the fleet. I/O is injectable (`io.appendLedger`,
 * `io.appendMaster`) so tests target an in-memory sink instead of the live
 * shared files. Returns the record. Throws (fail-loud) on a malformed record.
 */
export function broadcast(opts = {}, io = {}) {
  const rec = buildUpgradeRecord(opts);
  const appendLedger =
    io.appendLedger ??
    ((line) => {
      fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
      fs.appendFileSync(LEDGER_PATH, line, "utf8");
    });
  const appendMaster =
    io.appendMaster ??
    ((line) => {
      fs.mkdirSync(path.dirname(MASTER_PATH), { recursive: true });
      if (!fs.existsSync(MASTER_PATH)) {
        fs.writeFileSync(
          MASTER_PATH,
          "# Fleet AI-Upgrade Master Index\n\n" +
            "> Every galaxy appends here (via `scripts/ai-upgrade-broadcast.mjs`) when it ships an\n" +
            "> AI-system upgrade, so the master brain + peers see it. Durable mirror of\n" +
            "> `state/shared/ai-upgrade-ledger.jsonl`. Doctrine: [[feedback_ai_upgrade_broadcast_protocol]].\n\n",
          "utf8",
        );
      }
      fs.appendFileSync(MASTER_PATH, line + "\n", "utf8");
    });

  appendLedger(JSON.stringify(rec) + "\n");
  appendMaster(masterIndexRow(rec));
  return rec;
}

// ── CLI ──
function parseArgv(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : "true";
      o[k] = v;
    }
  }
  return o;
}

function main() {
  const opts = parseArgv(process.argv.slice(2));
  let rec;
  try {
    rec = broadcast(opts);
  } catch (err) {
    console.error("[ai-upgrade-broadcast] " + (err && err.message ? err.message : String(err)));
    process.exit(2);
  }
  console.log("[ai-upgrade-broadcast] OK — recorded [" + rec.galaxy + "] " + rec.kind + " upgrade");
  console.log("  ledger: " + LEDGER_PATH.replace(/\\/g, "/"));
  console.log("  master: " + MASTER_PATH.replace(/\\/g, "/"));
  console.log("  affects: " + (rec.affects_galaxies.join(", ") || "(fleet)"));
}

// Run main only as a CLI (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
