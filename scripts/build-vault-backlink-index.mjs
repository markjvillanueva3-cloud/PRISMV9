#!/usr/bin/env node
/**
 * build-vault-backlink-index.mjs — build the REVERSE edge of CHEAP-NODE-ACCESS-MS0.
 *
 * Streams the EXISTING `node-cards.jsonl` (160 MB, the forward graph→vault edge)
 * and inverts each card's `wikiEntries`/`memoryEntries` into a single map
 * `{ vaultKey: [nodeId, ...] }` written to `vault-backlinks.json`. So an agent
 * reading a wiki/memory doc can answer "which live graph node(s) does this doc
 * document?" in one map hit, then `node-card <id>` for the node's real state —
 * WITHOUT ever loading the 644 MB system-graph.json.
 *
 * R12: fail-loud if node-cards.jsonl is absent (the forward edge must exist first
 * — it's emitted by build-graph-index regen). No Date — freshness is stamped from
 * the SOURCE file's mtime (ties the artifact's freshness to its input, and keeps
 * the build resume-safe per the offset-lib discipline). Atomic write (.tmp+rename).
 *
 * Usage: node scripts/build-vault-backlink-index.mjs [--json] [--cards <path>] [--out <path>]
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  BACKLINK_SCHEMA_VERSION,
  NODE_CAP,
  normalizeVaultKey,
  makeBacklinkRecord,
} from "./lib/vault-backlink-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");

const args = process.argv.slice(2);
const wantJson = args.includes("--json");
const valAfter = (flag) => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
const CARDS_PATH = valAfter("--cards") || path.join(VIZ_DIR, "node-cards.jsonl");
const OUT_PATH = valAfter("--out") || path.join(VIZ_DIR, "vault-backlinks.json");

/**
 * Stream the cards jsonl and invert wiki+memory entries into one Map<key,Set<id>>.
 * @returns {Promise<{map:Map<string,Set<string>>, cardCount:number, edgeCount:number}>}
 */
async function invertCards(cardsPath) {
  if (!fs.existsSync(cardsPath)) {
    throw new Error(
      `vault-backlink: source node-cards.jsonl not found at ${cardsPath} — ` +
      `the forward graph→vault edge must be built first (build-graph-index regen). Cannot invert a missing edge.`,
    );
  }
  const map = new Map();
  let cardCount = 0;
  let edgeCount = 0;
  const add = (rawKey, id) => {
    const key = normalizeVaultKey(rawKey);
    if (key === "" || typeof id !== "string" || id === "") return;
    let set = map.get(key);
    if (!set) { set = new Set(); map.set(key, set); }
    if (!set.has(id)) { set.add(id); edgeCount++; }
  };
  const rl = readline.createInterface({
    input: fs.createReadStream(cardsPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let card;
    try { card = JSON.parse(line); } catch { continue; } // skip a torn line, don't abort the whole build
    if (!card || typeof card.id !== "string" || !card.id) continue;
    cardCount++;
    if (Array.isArray(card.wikiEntries)) for (const w of card.wikiEntries) add(w, card.id);
    if (Array.isArray(card.memoryEntries)) for (const m of card.memoryEntries) add(m, card.id);
  }
  return { map, cardCount, edgeCount };
}

/**
 * Serialize the inverted Map into the on-disk index shape. `map[key]` is the
 * capped, sorted node-id array; `truncated[key]` records the TRUE pre-cap total
 * only for the keys that overflowed NODE_CAP (so the common case stays compact
 * and the reader can still report an honest total).
 */
function buildIndexObject(invMap, meta) {
  const map = {};
  const truncated = {};
  let cappedKeyCount = 0;
  for (const [key, set] of invMap) {
    const rec = makeBacklinkRecord(key, [...set]); // re-dedupe/sort/cap via the canonical contract
    if (!rec) continue;
    map[rec.key] = rec.nodeIds;
    if (rec.total > rec.nodeIds.length) { truncated[rec.key] = rec.total; cappedKeyCount++; }
  }
  return {
    schemaVersion: BACKLINK_SCHEMA_VERSION,
    nodeCap: NODE_CAP,
    builtFrom: path.relative(ROOT, meta.cardsPath).replace(/\\/g, "/"),
    builtFromMtimeMs: meta.mtimeMs,    // freshness tied to source, not wall-clock (no Date)
    sourceCardCount: meta.cardCount,
    keyCount: Object.keys(map).length,
    edgeCount: meta.edgeCount,
    cappedKeyCount,
    truncated,
    map,
  };
}

function atomicWriteJson(outPath, obj) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj), "utf8"); // compact (no null,2) — V8 string-cap + token discipline
  fs.renameSync(tmp, outPath);
}

async function main() {
  const st = fs.existsSync(CARDS_PATH) ? fs.statSync(CARDS_PATH) : null;
  const { map, cardCount, edgeCount } = await invertCards(CARDS_PATH);
  const index = buildIndexObject(map, {
    cardsPath: CARDS_PATH,
    mtimeMs: st ? Math.round(st.mtimeMs) : 0,
    cardCount,
    edgeCount,
  });
  atomicWriteJson(OUT_PATH, index);
  const outSt = fs.statSync(OUT_PATH);
  const summary = {
    ok: true,
    out: path.relative(ROOT, OUT_PATH).replace(/\\/g, "/"),
    outBytes: outSt.size,
    sourceCardCount: index.sourceCardCount,
    keyCount: index.keyCount,
    edgeCount: index.edgeCount,
    cappedKeyCount: index.cappedKeyCount,
  };
  if (wantJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      `[vault-backlink] built ${summary.keyCount} vault keys ← ${summary.edgeCount} edges ` +
      `from ${summary.sourceCardCount} cards · ${(summary.outBytes / 1e6).toFixed(1)}MB · ` +
      `${summary.cappedKeyCount} keys capped at ${NODE_CAP} → ${summary.out}`,
    );
  }
}

main().catch((e) => { console.error(`[vault-backlink] FAILED: ${e.message}`); process.exit(1); });
