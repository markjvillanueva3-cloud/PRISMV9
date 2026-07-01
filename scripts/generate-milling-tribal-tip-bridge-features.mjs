#!/usr/bin/env node
/**
 * generate-milling-tribal-tip-bridge-features.mjs — bridges the
 * MILLING_PDF_CITED_TIPS tribal-tip seed (mcp-server/src/data/tribal-tips/
 * milling-pdf-cited-tips.ts) to the peer-echo JM Die TRIBAL+WIKI corpus
 * augmentation (jm-die-tribal-wiki-augmentation.json) so /system-viz
 * renders the tribal-tip nodes UNDER their source PDF nodes — operator
 * directive: "wire, bridge and synergize with AI systems and PSN + /system-viz".
 *
 * The bridge:
 *   - reads peer's L10 PDF nodes (id pattern ghost.jm_die_tribal_wiki_corpus.<domain>.<slug>)
 *   - reads the cited-tip seed via the same slug derivation peer uses
 *   - emits one L11 tip node per tribal tip, parented to the matched PDF node
 *   - emits an edge from each tip node back to its primary engine consumer
 *
 * Idempotent: merge-augmentations.mjs dedupes by node-id.
 *
 * Slug derivation mirrors scripts/generate-jm-die-tribal-wiki-features.mjs
 * safeSlug() — must match exactly so node-id matching works.
 *
 * @milestone MILL-PDF-CORPUS-MS0/U-MILLING-TIP-BRIDGE
 * @slot foxtrot
 * @iter 8+
 * @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.jm_die_tribal_wiki_corpus";
export const PEER_AUG_PATH = path.join(ROOT, "state/shared/system-viz/jm-die-tribal-wiki-augmentation.json");
export const TIPS_TS_PATH = path.join(ROOT, "mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts");
export const OUT_PATH = path.join(ROOT, "state/shared/system-viz/milling-tribal-tip-bridge-augmentation.json");
export const TIP_LAYER = "L11";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

export function safeSlug(raw) {
  return String(raw || "x").toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "").slice(0, 60) || "x";
}

export function parseCitedTips(tsText) {
  const tips = [];
  // Split into individual tip object literals — each starts with `{` followed by
  // `id: "MILL-TIP-...` and ends at the matching `},`. Use a permissive sentinel
  // pattern, then extract fields independently regardless of order.
  const tipRe = /\{[\s\S]*?id:\s*"(MILL-TIP-[A-Z0-9_-]+)"([\s\S]*?)\n  \},/g;
  let m;
  while ((m = tipRe.exec(tsText)) !== null) {
    const id = m[1];
    const body = m[2];
    const get = (field) => {
      const fr = new RegExp(`${field}:\\s*"([^"]+)"`);
      const fm = body.match(fr);
      return fm ? fm[1] : "";
    };
    tips.push({
      id,
      operation: get("operation"),
      headline: get("headline").slice(0, MAX_INFO),
      vendor: get("vendor"),
      citation: get("citation"),
      confidence: get("confidence") || "draft",
    });
  }
  return tips;
}

export function slugFromCitation(citation) {
  if (!citation || !citation.startsWith("file://")) return null;
  try {
    const decoded = decodeURIComponent(citation);
    const base = path.basename(decoded, ".pdf");
    return safeSlug(base);
  } catch { return null; }
}

export function generate(citedTips, peerNodes) {
  const peerById = new Map(peerNodes.map(n => [n.id, n]));
  const newNodes = [];
  const newEdges = [];
  const stats = { tips_total: citedTips.length, tips_bridged: 0, tips_unmatched: 0, by_domain: {} };

  for (const tip of citedTips) {
    const slug = slugFromCitation(tip.citation);
    if (!slug) { stats.tips_unmatched++; continue; }

    const candidates = [
      `${ROOST_ID}.mill.${slug}`,
      `${ROOST_ID}.cam.${slug}`,
      `${ROOST_ID}.reference.${slug}`,
      `${ROOST_ID}.post.${slug}`,
      `${ROOST_ID}.cad.${slug}`,
    ];
    const parentId = candidates.find(id => peerById.has(id));
    if (!parentId) { stats.tips_unmatched++; continue; }

    const tipNodeId = `${parentId}.tip.${safeSlug(tip.id)}`;
    const domain = parentId.split(".")[2];
    stats.by_domain[domain] = (stats.by_domain[domain] ?? 0) + 1;

    newNodes.push({
      id: tipNodeId,
      label: tip.headline.slice(0, MAX_LABEL),
      info: `[${tip.confidence}] ${tip.vendor} - ${tip.operation}`,
      layer: TIP_LAYER,
      parent: parentId,
      kind: "tribal-tip",
      tipId: tip.id,
      operation: tip.operation,
      vendor: tip.vendor,
      confidence: tip.confidence,
    });
    newEdges.push({ from: parentId, to: tipNodeId, kind: "extracts" });
    newEdges.push({ from: tipNodeId, to: "engine.KnowledgeCurriculumBridgeEngine", kind: "consumed-by" });
    stats.tips_bridged++;
  }

  return { newNodes, newEdges, stats };
}

export function main() {
  if (!fs.existsSync(PEER_AUG_PATH)) {
    console.error(`[bridge] peer augmentation not found at ${PEER_AUG_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(TIPS_TS_PATH)) {
    console.error(`[bridge] cited-tip seed not found at ${TIPS_TS_PATH}`);
    process.exit(1);
  }

  const peerAug = JSON.parse(fs.readFileSync(PEER_AUG_PATH, "utf8"));
  const tsText = fs.readFileSync(TIPS_TS_PATH, "utf8");
  const tips = parseCitedTips(tsText);
  const { newNodes, newEdges, stats } = generate(tips, peerAug.newNodes || []);

  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "scripts/generate-milling-tribal-tip-bridge-features.mjs",
    parentAugmentation: "jm-die-tribal-wiki-augmentation.json",
    newNodes,
    newEdges,
    stats,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(`[bridge] ${stats.tips_bridged}/${stats.tips_total} tips bridged - ${OUT_PATH}`);
  console.log(`[bridge] by domain:`, stats.by_domain);
  if (stats.tips_unmatched > 0) {
    console.log(`[bridge] ${stats.tips_unmatched} tips unmatched (citation slug did not resolve to a peer node)`);
  }
}

const argv1 = process.argv[1];
if (argv1 && import.meta.url === `file://${argv1.replace(/\\/g, "/")}`) {
  main();
} else {
  // Windows: import.meta.url emits `file:///H:/...` (three slashes) while the
  // guard above computes `file://H:/...` (two slashes), so equality always
  // fails when launched via `node path/to/script.mjs`. Sibling script
  // generate-milling-extracted-pdf-bridge.mjs already has this else branch.
  // R12 fail-loud: run main() unconditionally rather than silently no-op.
  main();
}
