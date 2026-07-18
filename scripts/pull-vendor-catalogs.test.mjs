/**
 * Tests for pull-vendor-catalogs.mjs — VENDOR-NETWORK-MS0/U-VDN-CATALOG-PULL.
 * Real-value assertions on the pure logic half (no network).
 * Run: node --test scripts/pull-vendor-catalogs.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  isValidPdfBuffer,
  isPdfUrl,
  extractPdfLinks,
  pickBestPdfLinks,
  mergeManifest,
  SEED_VENDORS,
} from "./pull-vendor-catalogs.mjs";

test("slugify: kebab, lowercase, trims, defaults", () => {
  assert.equal(slugify("Garr Tool"), "garr-tool");
  assert.equal(slugify("M.A. Ford!"), "m-a-ford");
  assert.equal(slugify("  YG-1  "), "yg-1");
  assert.equal(slugify(""), "vendor");
  assert.equal(slugify(null), "vendor");
  assert.equal(slugify("///"), "vendor");
});

test("isValidPdfBuffer: %PDF magic only", () => {
  assert.equal(isValidPdfBuffer(Buffer.from("%PDF-1.7\n...")), true);
  assert.equal(isValidPdfBuffer(Buffer.from("<!DOCTYPE html>")), false, "HTML error page is not a PDF");
  assert.equal(isValidPdfBuffer(Buffer.from("%PD")), false, "too short");
  assert.equal(isValidPdfBuffer(Buffer.from("")), false);
  assert.equal(isValidPdfBuffer(null), false);
});

test("isPdfUrl: path ends .pdf ignoring query/fragment", () => {
  assert.equal(isPdfUrl("https://x.com/catalog.pdf"), true);
  assert.equal(isPdfUrl("https://x.com/catalog.PDF?v=2"), true);
  assert.equal(isPdfUrl("https://x.com/catalog.pdf#page=3"), true);
  assert.equal(isPdfUrl("https://x.com/resources/"), false);
  assert.equal(isPdfUrl("https://x.com/pdf-viewer"), false, "not a .pdf path");
  assert.equal(isPdfUrl(null), false);
  assert.equal(isPdfUrl(""), false);
});

test("extractPdfLinks: absolute + relative resolution + dedup", () => {
  const html = `
    <a href="/files/speeds-feeds.pdf">SF</a>
    <a href='https://cdn.x.com/catalog-2024.pdf?dl=1'>cat</a>
    <a href="../old/catalog-2024.pdf?dl=1">dup-after-resolve</a>
    <img src="logo.png"> <a href="page.html">no</a>
  `;
  const links = extractPdfLinks(html, "https://x.com/resources/index.html");
  assert.ok(links.includes("https://x.com/files/speeds-feeds.pdf"), "root-relative resolved");
  assert.ok(links.includes("https://cdn.x.com/catalog-2024.pdf?dl=1"), "absolute cross-host kept");
  assert.ok(links.includes("https://x.com/old/catalog-2024.pdf?dl=1"), "dot-relative resolved");
  assert.ok(!links.some((l) => l.endsWith(".png") || l.endsWith(".html")), "non-pdf excluded");
});

test("extractPdfLinks: catches absolute PDF URLs in sitemap <loc> / JSON / JS payloads (no href)", () => {
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>https://v.com/files/2024-tool-catalog.pdf</loc></url>
    <url><loc>https://v.com/page</loc></url></urlset>`;
  const links = extractPdfLinks(sitemap, "https://v.com/sitemap.xml");
  assert.ok(links.includes("https://v.com/files/2024-tool-catalog.pdf"), "sitemap <loc> PDF found");
  assert.ok(!links.some((l) => l.endsWith("/page")), "non-pdf loc excluded");
  // JS/JSON-embedded absolute URL (JS-rendered site ships it in initial payload)
  const jsonish = `{"pdf":"https://cdn.v.com/sf/speeds-feeds.pdf?v=9","x":1}`;
  assert.ok(extractPdfLinks(jsonish, "https://v.com/").includes("https://cdn.v.com/sf/speeds-feeds.pdf?v=9"));
});

test("extractPdfLinks: defensive on null/empty/garbage", () => {
  assert.deepEqual(extractPdfLinks(null, "https://x.com/"), []);
  assert.deepEqual(extractPdfLinks("", "https://x.com/"), []);
  assert.deepEqual(extractPdfLinks("<a href='x.pdf'>", "::::bad-base"), [], "unresolvable base → dropped, no throw");
});

test("pickBestPdfLinks: catalog/speed keywords rank first, capped", () => {
  const links = [
    "https://x.com/random-file.pdf",
    "https://x.com/2024-tool-catalog.pdf",
    "https://x.com/speeds-and-feeds-guide.pdf",
    "https://x.com/legal-terms.pdf",
  ];
  const top2 = pickBestPdfLinks(links, 2);
  assert.equal(top2.length, 2);
  assert.ok(top2.every((u) => /catalog|speed|feed|guide/.test(u)), "keyword PDFs win the top slots");
  assert.equal(pickBestPdfLinks([], 3).length, 0);
  assert.equal(pickBestPdfLinks(["a", "a", "b"], 5).length, 2, "dedups");
});

test("mergeManifest: keyed by url, first_seen preserved, status refreshed", () => {
  const t0 = "2026-05-29T00:00:00.000Z";
  const t1 = "2026-05-29T01:00:00.000Z";
  const first = mergeManifest(null, [
    { vendor: "Garr Tool", slug: "garr-tool", tier: 1, url: "https://g.com/cat.pdf", status: "pending", note: "404" },
  ], t0);
  assert.equal(first.pdfs.length, 1);
  assert.equal(first.pdfs[0].first_seen, t0);
  assert.equal(first.pdfs[0].status, "pending");

  const second = mergeManifest(first, [
    { vendor: "Garr Tool", slug: "garr-tool", tier: 1, url: "https://g.com/cat.pdf", status: "downloaded", bytes: 9_000_000, note: "validated-%PDF", path: "/x/garr.pdf" },
  ], t1);
  assert.equal(second.pdfs.length, 1, "same url → updated in place, not duplicated");
  assert.equal(second.pdfs[0].first_seen, t0, "first_seen preserved across runs");
  assert.equal(second.pdfs[0].last_attempt, t1);
  assert.equal(second.pdfs[0].status, "downloaded");
  assert.equal(second.pdfs[0].bytes, 9_000_000);
});

test("mergeManifest: url-less pending row is stable across runs (no title-drift duplicate)", () => {
  const t0 = "2026-05-29T00:00:00.000Z";
  const t1 = "2026-05-29T01:00:00.000Z";
  const r1 = mergeManifest(null, [{ vendor: "Garr Tool", slug: "garr-tool", tier: 1, status: "pending", note: "404", title: "garr-tool" }], t0);
  const r2 = mergeManifest(r1, [{ vendor: "Garr Tool", slug: "garr-tool", tier: 1, status: "pending", note: "still 404", title: "Garr 2024 Catalog" }], t1);
  assert.equal(r2.pdfs.length, 1, "same vendor pending → updated in place despite title drift");
  assert.equal(r2.pdfs[0].first_seen, t0, "first_seen preserved");
  assert.equal(r2.pdfs[0].note, "still 404");
});

test("mergeManifest: malformed pre-existing entry (no vendor) does not crash the sort", () => {
  const existing = { schemaVersion: "1.0.0", manifest_id: "x", pdfs: [{ url: "u.pdf", tier: 2 }] }; // no vendor field
  const out = mergeManifest(existing, [{ vendor: "A Co", tier: 1, url: "a.pdf", status: "downloaded" }], "2026-05-29T00:00:00.000Z");
  assert.ok(Array.isArray(out.pdfs) && out.pdfs.length === 2, "merged without throwing on undefined vendor");
});

test("mergeManifest: tier-sorted, skips rows with no vendor", () => {
  const m = mergeManifest(null, [
    { vendor: "Z Co", tier: 3, url: "z.pdf", status: "pending" },
    { vendor: "A Co", tier: 1, url: "a.pdf", status: "downloaded" },
    { url: "junk.pdf", status: "pending" }, // no vendor → skipped
  ], "2026-05-29T00:00:00.000Z");
  assert.equal(m.pdfs.length, 2, "vendorless row skipped");
  assert.equal(m.pdfs[0].vendor, "A Co", "tier 1 sorts before tier 3");
});

test("SEED_VENDORS: real, distinct, all cutting-tool makers with urls", () => {
  assert.ok(SEED_VENDORS.length >= 10, "meaningful seed set");
  const slugs = new Set(SEED_VENDORS.map((v) => v.slug));
  assert.equal(slugs.size, SEED_VENDORS.length, "slugs unique");
  for (const v of SEED_VENDORS) {
    assert.ok(Array.isArray(v.urls) && v.urls.length >= 1, `${v.vendor} has at least one url`);
    assert.equal(v.category, "tooling-consumable", `${v.vendor} is S/F-bearing`);
    assert.ok(v.urls.every((u) => /^https?:\/\//.test(u)), `${v.vendor} urls are absolute`);
  }
  // none of the already-pulled / already-ingested vendors leak into the seed
  const forbidden = ["harvey", "helical", "korloy", "ford", "niagara", "walter", "osg", "sandvik", "kennametal", "iscar", "tungaloy", "sumitomo"];
  for (const v of SEED_VENDORS) {
    assert.ok(!forbidden.some((f) => v.slug.includes(f)), `${v.slug} should not duplicate already-have vendors`);
  }
});
