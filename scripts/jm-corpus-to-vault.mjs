#!/usr/bin/env node
/**
 * jm-corpus-to-vault.mjs -- emit the JM settled-price corpus into the Obsidian vault as
 * PER-CUSTOMER recall notes, so the quoting AI can semantically recall "what have we settled for
 * this customer / part?" when quoting a new job (RAG-for-quoting; flat JSONL has no semantic search
 * or backlink graph -- the vault does).
 *
 * Source : state/shared/quoting/orders-closed-actuals.jsonl ($355M / 6,718 real Orders-Closed POs)
 * Output : knowledge/jm-corpus/customers/<slug>.md   (one note per customer)
 *          knowledge/jm-corpus/INDEX.md               (corpus index, top customers by spend)
 *          knowledge/memories/reference/reference_jm_corpus_customer_recall.md  (memory-recallable pointer)
 *
 * QUOTING-SYNERGY-MS0/U-QP-JM-CORPUS-VAULT (slot:charlie). Pure core in lib/jm-corpus-vault-lib.mjs.
 * Re-runnable: rerun after the actuals are re-extracted to refresh the recall corpus.
 *   node scripts/jm-corpus-to-vault.mjs            # write the notes
 *   node scripts/jm-corpus-to-vault.mjs --json     # stats only, no write
 *   node scripts/jm-corpus-to-vault.mjs --dry-run  # plan, no write
 */
import { promises as fs } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  groupActualsByCustomer, customerPriceStats, renderCustomerNote, slugifyCustomer,
  DEFAULT_MAX_PLAUSIBLE_USD, DEFAULT_MIN_PLAUSIBLE_USD,
} from "./lib/jm-corpus-vault-lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ACTUALS = join(ROOT, "state/shared/quoting/orders-closed-actuals.jsonl");
const CUST_DIR = join(ROOT, "knowledge/jm-corpus/customers");
const INDEX_MD = join(ROOT, "knowledge/jm-corpus/INDEX.md");
const RECALL_NOTE = join(ROOT, "knowledge/memories/reference/reference_jm_corpus_customer_recall.md");

const ARGS = process.argv.slice(2);
const flag = (n) => ARGS.includes(`--${n}`);
const val = (n, d) => { const i = ARGS.indexOf(`--${n}`); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : d; };
const jsonOut = flag("json");
const dryRun = flag("dry-run") || jsonOut;
const minConfidence = Number(val("min-confidence", "0.6"));
const maxPlausibleUsd = Number(val("max-plausible-usd", String(DEFAULT_MAX_PLAUSIBLE_USD)));
const minPlausibleUsd = Number(val("min-plausible-usd", String(DEFAULT_MIN_PLAUSIBLE_USD)));
const maxRows = Number(val("max-rows", "60"));
const limit = Number(val("limit", "0")) || Infinity;

const USD = (v) => "$" + Math.round(Number(v) || 0).toLocaleString("en-US");

async function atomicWrite(path, content) {
  await fs.mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, path);
}

async function main() {
  let raw;
  try { raw = await fs.readFile(ACTUALS, "utf-8"); }
  catch (e) { process.stderr.write(`[jm-corpus-to-vault] FAIL: cannot read actuals ${ACTUALS}: ${e}\n`); process.exit(1); }
  let actuals;
  try { actuals = JSON.parse(raw).actuals; }
  catch (e) { process.stderr.write(`[jm-corpus-to-vault] FAIL: actuals not valid JSON: ${e}\n`); process.exit(1); }
  if (!Array.isArray(actuals) || actuals.length === 0) {
    process.stderr.write(`[jm-corpus-to-vault] FAIL: no actuals in ${ACTUALS} (run docustrata-run-all-documents on JMD Orders Closed first)\n`);
    process.exit(1);
  }

  const excluded = {};
  const groups = groupActualsByCustomer(actuals, { minConfidence, maxPlausibleUsd, minPlausibleUsd, excluded });
  // build per-customer stats + notes
  const customers = [];
  for (const [, { display, rows }] of groups) {
    const stats = customerPriceStats(rows);
    if (!stats) continue;
    const note = renderCustomerNote(display, rows, stats, { minConfidence, maxRows });
    customers.push({ display, slug: note.slug, stats, content: note.content });
  }
  customers.sort((a, b) => b.stats.settled_total_usd - a.stats.settled_total_usd);

  const totalSettled = customers.reduce((s, c) => s + c.stats.settled_total_usd, 0);
  const totalParts = customers.reduce((s, c) => s + c.stats.part_count, 0);
  const summary = {
    actuals_total: actuals.length,
    min_confidence: minConfidence,
    max_plausible_usd: maxPlausibleUsd,
    excluded,
    customers: customers.length,
    parts_covered: totalParts,
    settled_total_usd: Math.round(totalSettled * 100) / 100,
    top5: customers.slice(0, 5).map((c) => ({ customer: c.display, settled_usd: c.stats.settled_total_usd, parts: c.stats.part_count })),
  };

  if (jsonOut) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }

  const toWrite = customers.slice(0, limit);
  let pruned = 0;
  if (!dryRun) {
    for (const c of toWrite) await atomicWrite(join(CUST_DIR, `${c.slug}.md`), c.content);
    // PRUNE (idempotency): remove orphan notes from a prior run whose customer no longer survives the
    // current extraction + gates -- so a re-run CONVERGES to the live dataset (no stale poisoned recall).
    // Only prune when emitting the FULL set (no --limit), else a capped run would wrongly delete the tail.
    if (Number.isFinite(limit) === false) {
      const want = new Set(toWrite.map((c) => `${c.slug}.md`));
      let existing = [];
      try { existing = await fs.readdir(CUST_DIR); } catch { existing = []; }
      for (const f of existing) {
        if (f.endsWith(".md") && !want.has(f)) { try { await fs.unlink(join(CUST_DIR, f)); pruned++; } catch { /* best-effort */ } }
      }
    }
    // INDEX.md -- the corpus map (top customers by settled spend)
    const idx =
      `# JM Die customer settled-price corpus (quoting recall)\n\n` +
      `Per-customer Obsidian notes distilled from the real $355M Orders-Closed actuals so the quoting AI ` +
      `can semantically recall a customer's settled-price history. Generated by \`jm-corpus-to-vault.mjs\`.\n\n` +
      `- Customers: **${customers.length}** | Parts covered: **${totalParts}** | Settled total: **${USD(totalSettled)}** ` +
      `| confidence floor: ${minConfidence}\n\n## Top customers by settled spend\n\n` +
      `| Customer | Settled $ | Parts | Orders | Note |\n|---|---:|---:|---:|---|\n` +
      customers.slice(0, 40).map((c) => `| ${c.display} | ${USD(c.stats.settled_total_usd)} | ${c.stats.part_count} | ${c.stats.order_count} | [[jm_corpus_customer_${c.slug}]] |`).join("\n") + "\n";
    await atomicWrite(INDEX_MD, idx);
    // memory-recallable pointer (so the memory-inject + master-index surface this corpus on quoting prompts)
    const recall =
      `---\nname: reference_jm_corpus_customer_recall\n` +
      `description: ${customers.length} JM customers' real settled-price history is in the vault at knowledge/jm-corpus/customers/ -- recall before quoting a known customer\n` +
      `metadata:\n  type: reference\n  node_type: memory\n---\n\n` +
      `**JM customer settled-price recall corpus (slot:charlie).** The real $355M Orders-Closed actuals are now ` +
      `per-customer Obsidian notes at \`knowledge/jm-corpus/customers/<slug>.md\` (${customers.length} customers, ` +
      `${totalParts} parts, ${USD(totalSettled)} settled, confidence >= ${minConfidence}). **When quoting a part for a known ` +
      `customer, recall their note** (\`jm_corpus_customer_<slug>\`) for the real settled-price history -- ADVISORY recall, ` +
      `apply the live margin floor + calibration, NEVER a bare quote. Index: \`knowledge/jm-corpus/INDEX.md\`. ` +
      `Regenerate: \`node scripts/jm-corpus-to-vault.mjs\`. See [[reference_charlie_docustrata_corpus_price_map_2026_06_13]].\n`;
    await atomicWrite(RECALL_NOTE, recall);
  }

  process.stdout.write(
    `[jm-corpus-to-vault] ${dryRun ? "DRY-RUN " : "WROTE "}${toWrite.length} customer note(s) -> knowledge/jm-corpus/customers/ ` +
    `(${customers.length} customers, ${totalParts} parts, ${USD(totalSettled)} settled, conf>=${minConfidence})\n` +
    `[jm-corpus-to-vault] excluded (R12): outlier-price=${excluded.outlierPrice} (>${USD(maxPlausibleUsd)}), sub-dollar=${excluded.subDollar} (<${USD(minPlausibleUsd)}), form-label=${excluded.formLabel}, low-conf=${excluded.lowConf}, empty-customer=${excluded.emptyCustomer}, nulled-dates=${excluded.nulledDate}${dryRun ? "" : `, pruned-orphans=${pruned}`}\n` +
    `[jm-corpus-to-vault] top: ${summary.top5.map((t) => `${t.customer}(${USD(t.settled_usd)})`).join(", ")}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => { process.stderr.write(`[jm-corpus-to-vault] UNHANDLED: ${e}\n`); process.exit(1); });
}
