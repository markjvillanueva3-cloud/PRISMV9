#!/usr/bin/env node
/**
 * generate-octopus-consensus-features.mjs — PSN-OCTOPUS-FLEET-SYNERGY-MS0 / U-FLEET-CONSUME-VIZ.
 *
 * The third consumer of the per-galaxy octopus-outcomes feeds (after the consumption bridge +
 * the WeeklySynthesis per-domain rollup): surfaces real octopus consensus per galaxy as
 * searchable /system-viz nodes — the "synergized to system-viz" leg of the goal.
 *
 * Reads (never writes) the per-galaxy feeds via the consumption bridge:
 *   state/shared/octopus-outcomes/<domain>.jsonl  (listOutcomeDomains + readConsensusOutcomes)
 *
 * Emits a self-contained ghost roost to state/shared/system-viz/octopus-consensus-augmentation.json:
 *   - one root node  ghost.octopus_consensus           (L8 cluster root)
 *   - one node/galaxy ghost.octopus_consensus.<domain> (L9, parent=root) carrying the latest
 *     real-consensus verdict + confidence + voice tally + outcome count
 *   - "contains" edges root→domain (guaranteed-valid — only internal ids, never dangling)
 *
 * picked up by regen-viz.mjs FAST[] + merge-augmentations.mjs loadOptional("octopus-consensus-augmentation.json").
 *
 * R12 fail-soft: no feeds / unreadable dir → empty newNodes/newEdges (merge skips cleanly), exit 0.
 * The feeds only carry real dispatched+ok consensus (producer-gated), so the roost reflects ONLY
 * genuine fleet decisions — empty until a live octopus dispatch publishes (honest, not dormant).
 *
 * A galaxy-node bridge (edge from each domain node to its system-viz galaxy node) is a clean
 * follow-up (P3) — deferred to avoid emitting dangling edges to unverified node ids.
 *
 * @milestone PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-FLEET-CONSUME-VIZ
 * @slot bravo
 * @date 2026-06-01
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOutcomeDomains, readConsensusOutcomes, OUTCOME_BASE } from "./lib/octopus-consumption-bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.octopus_consensus";
export const ROOST_LAYER = "L8";
export const DOMAIN_LAYER = "L9";
export const OUT_PATH = path.join(ROOT, "state/shared/system-viz/octopus-consensus-augmentation.json");
// Recent outcomes read per galaxy to compute the count + latest. A week of real consensus per
// galaxy is small; 20 is generous and bounds the read.
export const PER_DOMAIN_LIMIT = 20;
const MAX_LABEL = 80;
const MAX_INFO = 200;

function truncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/**
 * Pure: project a map of domain → recent outcomes[] into the roost's nodes/edges. No I/O.
 * `domainOutcomes` :: { [domain]: Array<outcome record> } (most-recent-LAST, as readConsensusOutcomes returns).
 * Returns { newNodes, newEdges, stats }. A galaxy with zero outcomes contributes nothing.
 */
export function generate(domainOutcomes) {
  const newNodes = [];
  const newEdges = [];
  const stats = { domains_total: 0, domains_with_consensus: 0, outcomes_total: 0, by_domain: {} };

  const domains = Object.keys(domainOutcomes || {}).sort();
  stats.domains_total = domains.length;

  const live = domains.filter((d) => Array.isArray(domainOutcomes[d]) && domainOutcomes[d].length > 0);
  if (live.length === 0) return { newNodes, newEdges, stats };

  // Root cluster node — only emitted when at least one galaxy has real consensus.
  newNodes.push({
    id: ROOST_ID,
    label: "Octopus per-domain consensus",
    info: `${live.length} galaxy(ies) with real fleet consensus`,
    layer: ROOST_LAYER,
    kind: "ghost-roost",
  });

  for (const domain of live) {
    const outcomes = domainOutcomes[domain];
    const latest = outcomes[outcomes.length - 1]; // most-recent-LAST
    const verdict = truncate(typeof latest?.verdict === "string" ? latest.verdict : "(no-verdict)", MAX_LABEL);
    // Keep the numeric confidence for the node field (downstream numeric filters) AND a display
    // string for the human-readable info line — never store the formatted string as the value.
    const confNum =
      typeof latest?.confidence === "number" && Number.isFinite(latest.confidence) ? latest.confidence : null;
    const conf = confNum !== null ? confNum.toFixed(2) : "n/a";
    const voiceCount = Number.isFinite(latest?.voiceCount) ? latest.voiceCount : 0;
    const successCount = Number.isFinite(latest?.successCount) ? latest.successCount : voiceCount;
    const at = typeof latest?.at === "string" && latest.at ? latest.at : "(no-ts)";
    const nodeId = `${ROOST_ID}.${domain}`;

    newNodes.push({
      id: nodeId,
      label: `${domain}: ${verdict}`,
      info: truncate(`conf=${conf} · ${successCount}/${voiceCount} voices · ${outcomes.length} outcome(s) · latest ${at}`, MAX_INFO),
      layer: DOMAIN_LAYER,
      parent: ROOST_ID,
      kind: "octopus-consensus",
      domain,
      confidence: confNum,
      outcomeCount: outcomes.length,
    });
    newEdges.push({ from: ROOST_ID, to: nodeId, kind: "contains" });

    stats.domains_with_consensus++;
    stats.outcomes_total += outcomes.length;
    stats.by_domain[domain] = outcomes.length;
  }

  return { newNodes, newEdges, stats };
}

/** Read every per-galaxy feed under `baseDir` into { domain: outcomes[] }. Fail-soft → {}. */
export function readAllFeeds(baseDir = OUTCOME_BASE, perDomainLimit = PER_DOMAIN_LIMIT) {
  const out = {};
  let domains;
  try {
    domains = listOutcomeDomains({ baseDir });
  } catch {
    return out;
  }
  for (const domain of domains) {
    try {
      const recs = readConsensusOutcomes(domain, { baseDir, limit: perDomainLimit });
      if (Array.isArray(recs) && recs.length > 0) out[domain] = recs;
    } catch {
      /* skip an unreadable feed */
    }
  }
  return out;
}

export function main() {
  // Test/headless override so a run can point at a sandboxed feed dir.
  const baseDir =
    typeof process.env.PRISM_OCTOPUS_OUTCOMES_DIR === "string" && process.env.PRISM_OCTOPUS_OUTCOMES_DIR
      ? process.env.PRISM_OCTOPUS_OUTCOMES_DIR
      : OUTCOME_BASE;
  const domainOutcomes = readAllFeeds(baseDir, PER_DOMAIN_LIMIT);
  const { newNodes, newEdges, stats } = generate(domainOutcomes);

  const outPath =
    typeof process.env.PRISM_OCTOPUS_CONSENSUS_OUT === "string" && process.env.PRISM_OCTOPUS_CONSENSUS_OUT
      ? process.env.PRISM_OCTOPUS_CONSENSUS_OUT
      : OUT_PATH;
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "scripts/generate-octopus-consensus-features.mjs",
    newNodes,
    newEdges,
    stats,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`[octopus-consensus-viz] ${stats.domains_with_consensus}/${stats.domains_total} galaxies with consensus, ${newNodes.length} nodes → ${outPath}`);
}

const argv1 = process.argv[1];
if (argv1 && import.meta.url === `file://${argv1.replace(/\\/g, "/")}`) {
  main();
} else if (argv1 && argv1.endsWith("generate-octopus-consensus-features.mjs")) {
  // Windows: import.meta.url emits `file:///H:/...` (three slashes) while the guard above computes
  // `file://H:/...` — equality fails when launched via `node path/to/script.mjs`. Match on the
  // script basename instead so a direct run still executes main() (R12 fail-loud, never silent no-op).
  main();
}
