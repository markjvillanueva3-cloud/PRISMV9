#!/usr/bin/env node
/**
 * fusion-claim-instance.mjs — record kilo's OPERATOR-PINNED Fusion port.
 *
 * Operator /goal: "delta claimed one of the two instances of fusion open so claim the other one."
 * OPERATOR-AUTHORITATIVE (reference_fusion_port_assignment_kilo_18361_2026_06_02): kilo=:18361,
 * delta=:18362 (CAD). Ownership is assigned by the operator — NOT inferred from /documents
 * capability or saved/modified flags. The auto-detect resolver once wrongly picked delta's :18362
 * CAD window (R12); the PIN (PRISM_FUSION_KILO_PORT, default 18361) is now canonical and overrides
 * auto-detect. Delta-owned ports (PRISM_FUSION_DELTA_PORTS, default 18362) are hard-excluded.
 *
 * This still probes the LIVE add-in ports (timeout-wrapped fetch) to REPORT each port's liveness/
 * capability, but the chosen port = the pin, not the heuristic. --claim records the claim to
 * state/shared/cam-drive/fusion-kilo-claim.json (atomic write) so peers see kilo's port.
 *
 * SAFETY (R12/R13): kilo NEVER drives or claims a delta-owned port, pin or auto-detect. Read-only
 * by default; --claim only writes the claim sidecar (never touches Fusion docs).
 *
 *   node scripts/fusion-claim-instance.mjs            # probe + report
 *   node scripts/fusion-claim-instance.mjs --claim    # probe + record kilo's claim
 *   node scripts/fusion-claim-instance.mjs --ports 18360,18362,18365 --timeout 2500
 */
import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { classifyInstance, resolveKiloScratchInstance, parsePorts } from "./lib/fusion-instance-resolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAIM_PATH = resolve(__dirname, "../state/shared/cam-drive/fusion-kilo-claim.json");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const DO_CLAIM = process.argv.includes("--claim");
const TIMEOUT_MS = Number(arg("--timeout", "3000")) || 3000;
// Probe a slightly wider range than the documented two — the operator may have opened the 2nd
// instance on a fresh port. Probe list ≠ ownership (see the pin below).
const PORTS = process.argv.includes("--ports")
  ? parsePorts(arg("--ports", ""))
  : [18360, 18361, 18362, 18363, 18364, 18365, 18366];

// OPERATOR-AUTHORITATIVE port assignment (reference_fusion_port_assignment_kilo_18361_2026_06_02):
// kilo=:18361, delta=:18362 (CAD). Ownership comes from the operator, NOT from a /documents or
// saved/modified heuristic — the auto-detect once wrongly picked :18362 (delta's CAD window). The
// pin WINS over auto-detect; delta-owned ports are hard-excluded.
const KILO_PORT = process.env.PRISM_FUSION_KILO_PORT ? Number(process.env.PRISM_FUSION_KILO_PORT) : 18361;
const DELTA_PORTS = (process.env.PRISM_FUSION_DELTA_PORTS || "18362").split(",").map((s) => Number(s.trim())).filter(Boolean);

/** Global fetch with a hard per-request timeout so a hung port can't stall the probe. */
function timeoutFetch(ms) {
  return async (url, opts = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await globalThis.fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };
}

/**
 * Pure: build the kilo claim record from a resolver pick + classified topology.
 * Exported for tests. `nowIso` injected so the function stays deterministic/testable.
 * @returns {object|null} the claim record, or null if no safe instance was chosen.
 */
export function buildClaimRecord(pick, classified, ports, nowIso, meta = {}) {
  if (!pick || pick.chosenPort == null) return null;
  const source = meta.source || "auto-detect";
  const pinned = source.startsWith("operator-pin");
  return {
    schemaVersion: "1.1.0",
    slot: "kilo",
    claimedPort: pick.chosenPort,
    claimedAtIso: nowIso,
    source,                       // "operator-pin (PRISM_FUSION_KILO_PORT)" | "auto-detect"
    deltaOwnedPorts: meta.deltaPorts ?? null, // ports hard-excluded as delta-owned (CAD)
    probedPorts: ports,
    topology: (classified || []).map((c) => ({
      port: c.port, up: c.up, capable: c.capable, safe: c.safe, foreignDocs: c.foreignDocs ?? null,
    })),
    note: pinned
      ? "OPERATOR-PINNED port (reference_fusion_port_assignment_kilo_18361_2026_06_02): kilo=:18361, delta=:18362 (CAD). kilo drives SCRATCH docs ONLY here; NEVER touches a delta-owned port. The pin overrides auto-detect."
      : "kilo drives SCRATCH docs ONLY on this port; delta owns the other instance (live CAD). Per operator /goal 'claim the other one'.",
  };
}

export function atomicWriteJson(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}

async function main() {
  const fetchImpl = timeoutFetch(TIMEOUT_MS);

  console.log(`# Fusion instance probe (kilo) — ports ${PORTS.join(",")} · timeout ${TIMEOUT_MS}ms\n`);
  const classified = [];
  for (const port of PORTS) {
    const r = await classifyInstance({ port, fetchImpl });
    classified.push(r);
    const tag = !r.up ? "DOWN" : r.safe ? "SAFE" : "UNSAFE";
    console.log(
      `  :${port}  ${tag.padEnd(6)} up=${r.up} capable=${r.capable} ` +
        `docs=${r.totalDocs ?? "-"} foreign=${r.foreignDocs ?? "-"} scratch=${r.scratchDocs ?? "-"}  ${r.reason || ""}`
    );
  }

  const autoPick = await resolveKiloScratchInstance({ ports: PORTS, fetchImpl });
  console.log("");
  console.log(`  delta-owned (excluded): ${DELTA_PORTS.map((p) => `:${p}`).join(", ") || "(none)"}`);
  console.log(`  auto-detect picked: ${autoPick.chosenPort != null ? `:${autoPick.chosenPort}` : `(none — ${autoPick.refusal})`}`);

  // OPERATOR PIN WINS. Ownership is operator-assigned, NOT inferred from /documents or saved/modified
  // flags (the auto-detect once wrongly picked delta's :18362 CAD window — R12). The pin is the
  // canonical kilo port; auto-detect is advisory. A delta-owned port is NEVER claimable, pin or not.
  let pick, source;
  if (DELTA_PORTS.includes(KILO_PORT)) {
    // misconfiguration guard: the pin must not name a delta-owned port.
    pick = { chosenPort: null, refusal: `PRISM_FUSION_KILO_PORT=:${KILO_PORT} is delta-owned (CAD) — refusing. Pin kilo to a non-delta port.` };
    source = "operator-pin-conflict";
  } else {
    pick = { chosenPort: KILO_PORT, refusal: null };
    source = "operator-pin (PRISM_FUSION_KILO_PORT)";
  }

  const pinClass = classified.find((c) => c.port === KILO_PORT);
  if (pick.chosenPort != null) {
    const up = pinClass?.up ? "up" : "DOWN (operator must load PRISM_Fusion_Drive there)";
    const capable = pinClass?.capable ? "capable" : "old-addin/not-capable yet";
    console.log(`\n✅ KILO PORT (operator-pinned): :${pick.chosenPort} — ${up}, ${capable}`);
    if (!pinClass?.up || !pinClass?.capable) {
      console.log(`   ⚠ pinned port not live-capable yet; the pin still owns it — kilo drives :${pick.chosenPort} once the add-in is loaded.`);
    }
  } else {
    console.log(`\n⛔ REFUSE — ${pick.refusal}`);
  }

  if (DO_CLAIM && pick.chosenPort != null) {
    // timestamp comes from the runtime here (CLI, not a workflow) — Date is allowed in a script.
    const claim = buildClaimRecord(pick, classified, PORTS, new Date().toISOString(), { source, deltaPorts: DELTA_PORTS });
    atomicWriteJson(CLAIM_PATH, claim);
    console.log(`\n📌 Claim recorded: ${CLAIM_PATH} (kilo -> :${pick.chosenPort}, ${source})`);
  } else if (DO_CLAIM) {
    console.log(`\n(no claim recorded — refused; fix the pin)`);
  }

  // exit 0 always (probe is informational); the chosenPort==null case is reported, not an error code,
  // so a /loop wrapper can re-probe without treating "Fusion not ready yet" as a hard failure.
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("fusion-claim-instance: probe error —", e?.message || e);
    process.exit(1);
  });
}
