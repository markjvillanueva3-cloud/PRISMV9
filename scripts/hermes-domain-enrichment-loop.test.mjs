/**
 * Tests for hermes-domain-enrichment-loop.mjs (hermetic -- no live Hermes, no real ledgers).
 * Run: node scripts/hermes-domain-enrichment-loop.test.mjs
 * Verifies INTENT (R9): dedup cursor, novelty-stop, exhaustion trajectory, parse, diverge-prompt.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  norm, parseItems, domainPrompt, mergeFresh, mapPool, probeLane, resolveLane, laneCandidates, makeFailoverAsk, loadGrounding, loadCitedTips, composeGrounding, scoreTip, renderDigest, DOMAINS, AXES,
} from "./hermes-domain-enrichment-loop.mjs";

const okJson = (content) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });

test("makeFailoverAsk: grok 404 -> fails over to ollama (no-downtime core)", async () => {
  const lanes = [{ name: "local-grok", url: "http://127.0.0.1:8645/v1", token: "x", model: "g" }, { name: "local-ollama", url: "http://127.0.0.1:11434/v1", token: "ollama", model: "q" }];
  const fakeFetch = async (url) => (/8645/.test(url) ? { ok: false, status: 404 } : okJson("OLLAMA ITEM 1"));
  let used = null;
  const ask = makeFailoverAsk(lanes, { log: (n) => (used = n), fetchImpl: fakeFetch });
  const out = await ask({ system: "s", prompt: "p" });
  assert.match(out, /OLLAMA ITEM 1/);
  assert.equal(used, "local-ollama", "must skip the 404 grok lane and use ollama");
});

test("makeFailoverAsk: empty content skips to the next lane", async () => {
  const lanes = [{ name: "a", url: "u1", token: "x", model: "m" }, { name: "b", url: "u2", token: "x", model: "m" }];
  const fakeFetch = async (url) => (/u1/.test(url) ? okJson("   ") : okJson("REAL"));
  let used = null;
  const ask = makeFailoverAsk(lanes, { log: (n) => (used = n), fetchImpl: fakeFetch });
  assert.equal(await ask({ system: "s", prompt: "p" }), "REAL");
  assert.equal(used, "b");
});

test("makeFailoverAsk: ALL lanes fail -> throws (genuine all-dark)", async () => {
  const lanes = [{ name: "a", url: "u1", token: "x", model: "m" }, { name: "b", url: "u2", token: "x", model: "m" }];
  const ask = makeFailoverAsk(lanes, { fetchImpl: async () => ({ ok: false, status: 500 }) });
  await assert.rejects(() => ask({ system: "s", prompt: "p" }));
});

test("laneCandidates includes local-ollama as the reliable floor, grok first", () => {
  const names = laneCandidates().map((l) => l.name);
  assert.equal(names[0], "local-grok");
  assert.ok(names.includes("local-ollama"), "ollama floor must be present for no-downtime");
});

test("resolveLane: local UP -> returns local-grok (no failover)", async () => {
  const cands = [{ name: "local-grok", url: "http://127.0.0.1:8645/v1" }, { name: "cloud-nvidia", url: "https://integrate.api.nvidia.com/v1" }];
  const probe = async (_f, url) => /127\.0\.0\.1/.test(url); // local up, cloud "down"
  const lane = await resolveLane(probe, cands);
  assert.equal(lane.name, "local-grok");
});

test("resolveLane: local DARK -> fails over to cloud-nvidia", async () => {
  const cands = [{ name: "local-grok", url: "http://127.0.0.1:8645/v1" }, { name: "cloud-nvidia", url: "https://integrate.api.nvidia.com/v1" }];
  const probe = async (_f, url) => !/127\.0\.0\.1/.test(url); // local down, cloud up
  const lane = await resolveLane(probe, cands);
  assert.equal(lane.name, "cloud-nvidia", "must fail over to the cloud lane when local is dark");
});

test("resolveLane: ALL dark -> null (cron no-op, never crashes)", async () => {
  const cands = [{ name: "local-grok", url: "x" }, { name: "cloud-nvidia", url: "y" }];
  const lane = await resolveLane(async () => false, cands);
  assert.equal(lane, null);
});

test("laneCandidates always offers local-grok first", () => {
  const lanes = laneCandidates();
  assert.equal(lanes[0].name, "local-grok");
  assert.ok(lanes.length >= 1);
});

test("probeLane skips /health for cloud endpoints (no probe -> assume up)", async () => {
  let called = false;
  const fakeFetch = async () => { called = true; throw new Error("must not be called"); };
  const ok = await probeLane(fakeFetch, "https://integrate.api.nvidia.com/v1");
  assert.equal(ok, true);
  assert.equal(called, false, "cloud lane must NOT hit /health (it has none)");
});

test("probeLane DOES probe /health for the local proxy", async () => {
  let url = null;
  const fakeFetch = async (u) => { url = u; return { ok: true, json: async () => ({ authenticated: true }) }; };
  const ok = await probeLane(fakeFetch, "http://127.0.0.1:8645/v1");
  assert.equal(ok, true);
  assert.match(url, /127\.0\.0\.1:8645\/health/);
});

test("mapPool bounds concurrency + isolates a throwing task to {__error}", async () => {
  let inFlight = 0, maxInFlight = 0;
  const items = [1, 2, 3, 4, 5, 6];
  const out = await mapPool(items, 2, async (n) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    if (n === 3) throw new Error("boom-3");
    return n * 10;
  });
  assert.ok(maxInFlight <= 2, `concurrency must stay <=2, saw ${maxInFlight}`);
  assert.equal(out[0], 10);
  assert.equal(out[2].__error, "boom-3"); // throwing task isolated, pool not rejected
  assert.equal(out[5], 60);
});

const SAMPLE = `1. (a) Helical ramp plunge angle by tool/material
(b) max 2.0deg carbide in Ti, 7deg in Al; pitch=pi*D*tan(a)
(c) 12.7mm tool at 1.8deg -> 1.25mm/rev
(d) Sandvik Milling App Guide p.68
(e) safety: yes

2. (a) Min feed floor stops rubbing in austenitics
(b) fz>=0.075 mm/tooth for 300-series SS
(c) 10mm tool in 316L at fz=0.04 -> hardened layer
(d) Kennametal H-2000 p.14
(e) safety: no`;

test("norm collapses case + punctuation so dedup catches variants", () => {
  assert.equal(norm("Helical Ramp, Angle!"), norm("helical   ramp angle"));
  assert.equal(norm(""), "");
  assert.equal(norm(null), "");
});

test("parseItems extracts rule/formula/cite/safety from a numbered (a)-(e) block", () => {
  const items = parseItems(SAMPLE);
  assert.equal(items.length, 2);
  assert.match(items[0].title, /Helical ramp plunge angle/);
  assert.match(items[0].formula, /pitch=pi\*D\*tan/);
  assert.match(items[0].cite, /Sandvik/);
  assert.equal(items[0].safety, true);
  assert.equal(items[1].safety, false);
});

test("parseItems: empty + garbage -> [] (no crash, no junk rows)", () => {
  assert.deepEqual(parseItems(""), []);
  assert.deepEqual(parseItems("   \n\n"), []);
  assert.equal(parseItems("1. (a) x").length, 0); // title too short (<=8 chars)
});

test("mergeFresh dedups by normalized title across runs (the exhaustion cursor)", () => {
  const L = { domain: "mill", items: [], seen: [], axisIdx: 0, dryStreak: 0, exhausted: false, runs: 0 };
  const stamp = () => "2026-06-29T00:00:00.000Z";
  const items = [{ title: "Chip thinning correction", safety: false }, { title: "Stability lobe peaks", safety: false }];
  const s1 = mergeFresh(L, items, AXES[0], stamp);
  assert.equal(s1.fresh, 2);
  assert.equal(L.items.length, 2);
  // same titles (different case/punct) next run -> 0 fresh
  const s2 = mergeFresh(L, [{ title: "CHIP-THINNING correction." }, { title: "stability lobe peaks" }], AXES[1], stamp);
  assert.equal(s2.fresh, 0, "duplicate titles must not re-add");
  assert.equal(L.items.length, 2);
});

test("novelty-stop: 2 consecutive dry runs (<NOVELTY_FLOOR fresh) -> exhausted", () => {
  const L = { domain: "cad", items: [], seen: [], axisIdx: 0, dryStreak: 0, exhausted: false, runs: 0 };
  const stamp = () => "2026-06-29T00:00:00.000Z";
  // run 1: 5 fresh -> not dry, not exhausted
  mergeFresh(L, Array.from({ length: 5 }, (_, i) => ({ title: `cad rule alpha ${i}` })), AXES[0], stamp);
  assert.equal(L.exhausted, false);
  assert.equal(L.dryStreak, 0);
  // run 2: 1 fresh (<2) -> dryStreak 1
  mergeFresh(L, [{ title: "cad rule beta unique" }, { title: "cad rule alpha 0" }], AXES[1], stamp);
  assert.equal(L.dryStreak, 1);
  assert.equal(L.exhausted, false);
  // run 3: 0 fresh (all dup) -> dryStreak 2 -> exhausted
  mergeFresh(L, [{ title: "cad rule beta unique" }], AXES[2], stamp);
  assert.equal(L.dryStreak, 2);
  assert.equal(L.exhausted, true, "DRY_STREAK_MAX consecutive dry runs must exhaust the domain");
});

test("dryStreak RESETS when a fresh run lands between dry runs", () => {
  const L = { domain: "wedm", items: [], seen: [], axisIdx: 0, dryStreak: 1, exhausted: false, runs: 3 };
  const stamp = () => "2026-06-29T00:00:00.000Z";
  mergeFresh(L, [{ title: "wedm fresh one" }, { title: "wedm fresh two" }, { title: "wedm fresh three" }], AXES[0], stamp);
  assert.equal(L.dryStreak, 0, "a productive run clears the dry streak");
  assert.equal(L.exhausted, false);
});

test("axisIdx advances each run -> the prompt diverges to a fresh focus axis", () => {
  const L = { domain: "cam", items: [], seen: [], axisIdx: 0, dryStreak: 0, exhausted: false, runs: 0 };
  const stamp = () => "2026-06-29T00:00:00.000Z";
  mergeFresh(L, [{ title: "cam rule x" }], AXES[0], stamp);
  mergeFresh(L, [{ title: "cam rule y" }], AXES[1], stamp);
  assert.equal(L.axisIdx, 2);
});

test("domainPrompt embeds the focus axis + the seen-list (diverge instruction)", () => {
  const d = DOMAINS.find((x) => x.key === "lathe");
  const { system, prompt } = domainPrompt(d, AXES[3], ["nose radius ra", "css g50 cap"]);
  assert.match(system, /turning\/lathe process engineer/);
  assert.match(prompt, /Focus axis THIS pass: surface finish/);
  assert.match(prompt, /do NOT repeat/);
  assert.match(prompt, /nose radius ra/);
  assert.match(prompt, /safety: yes\/no/);
});

test("AXES: >=18 distinct focus axes (broadened extraction surface, no duplicates)", () => {
  assert.ok(AXES.length >= 18, `expected >=18 axes for maximum-knowledge coverage, got ${AXES.length}`);
  assert.equal(new Set(AXES.map((a) => a.toLowerCase())).size, AXES.length, "every axis must be distinct (no dup divergence slices)");
  // the new categories must be genuinely present (not silently dropped by a merge)
  for (const needle of ["chatter", "chip evacuation", "wear mechanisms", "on-machine probing", "lights-out", "micro-geometry"]) {
    assert.ok(AXES.some((a) => a.toLowerCase().includes(needle)), `missing broadened axis: ${needle}`);
  }
});

test("all 6 primary domains present + each has a slot owner", () => {
  const keys = DOMAINS.map((d) => d.key).sort();
  assert.deepEqual(keys, ["cad", "cam", "lathe", "mill", "post-processor", "wedm"]);
  for (const d of DOMAINS) assert.ok(["foxtrot", "whiskey", "mike", "kilo", "echo", "delta"].includes(d.slot));
});

// ── H-DRIVE GROUNDING (directive first half: enrich FROM the H-drive corpus, not just model training) ──
const FAKE_MEMORY = `# Mill Galaxy MEMORY.md
## Master-brain link
- **UP (pull):** semantic_search query="mill" -- recall path, NOT shop knowledge
- **MASTER-INDEX edge:** master MEMORY.md carries the [galaxy:mill] back-pointer
<!-- GALAXY-BRAIN-FILL:BEGIN -->
## High-ROI memories
- **Chip thinning**: the canonical chip-thinning factor exists -- do NOT re-derive it.
- **Machine fleet**: JM Die runs VMC-01..05 (Haas + Mazak); spindle 12k rpm.
- **Spindle-power gate**: power headroom check grounded in physics gate #3.
<!-- GALAXY-BRAIN-FILL:END -->`;

test("loadGrounding: missing MEMORY.md -> '' (fail-soft, ungrounded -- no regression)", () => {
  const g = loadGrounding("mill", { existsImpl: () => false });
  assert.equal(g, "", "missing grounding file must yield empty string, never throw");
});

test("loadGrounding: extracts shop-knowledge bullets, strips master-brain plumbing, respects cap", () => {
  const g = loadGrounding("mill", { existsImpl: () => true, readFileImpl: () => FAKE_MEMORY });
  assert.match(g, /chip-thinning factor/, "must keep real shop-knowledge bullets");
  assert.match(g, /VMC-01\.\.05/, "must surface the actual machine fleet for grounding");
  assert.ok(!/semantic_search/.test(g), "must drop the master-brain recall plumbing line");
  assert.ok(!/back-pointer/.test(g), "must drop the master-index back-pointer plumbing line");
  const capped = loadGrounding("cam", { existsImpl: () => true, readFileImpl: () => "- " + "x".repeat(5000) });
  assert.ok(capped.length <= 1200, `grounding must be capped (<=1200), saw ${capped.length}`);
});

test("domainPrompt WITH grounding injects the real-shop-context block", () => {
  const d = DOMAINS.find((x) => x.key === "mill");
  const { prompt } = domainPrompt(d, AXES[0], ["face mill ipt"], "- JM Die runs VMC-01..05; spindle 12k rpm.");
  assert.match(prompt, /REAL PRISM\/JM-Die shop context/);
  assert.match(prompt, /VMC-01\.\.05/, "the grounding content must reach the prompt");
  assert.match(prompt, /Focus axis THIS pass/, "axis + structure preserved alongside grounding");
});

test("domainPrompt WITHOUT grounding -> NO shop-context block (back-compat, byte-identical path)", () => {
  const d = DOMAINS.find((x) => x.key === "lathe");
  const { prompt } = domainPrompt(d, AXES[3], ["nose radius ra"]);
  assert.ok(!/REAL PRISM\/JM-Die shop context/.test(prompt), "omitted grounding must not inject a block");
  assert.match(prompt, /do NOT repeat/, "the original prompt body is unchanged when grounding is omitted");
});

// ── STRUCTURAL QUALITY PRE-SCREEN (directive: knowledge must be USABLE, pre-triaged for specialists) ──
test("scoreTip: complete tip (numeric threshold + unit + cite + specific) -> high tier, no flags", () => {
  const q = scoreTip({ title: "Min feed floor stops rubbing in austenitic stainless", formula: "fz >= 0.075 mm/tooth for 300-series", cite: "Kennametal H-2000 p.14", safety: false });
  assert.equal(q.tier, "high", `expected high, got ${q.tier} (score ${q.score})`);
  assert.ok(q.score >= 70);
  assert.deepEqual(q.flags, [], "a complete numeric+cited+specific tip carries no structural flags");
});

test("scoreTip: vague + no-number + no-cite -> low tier with the right flags", () => {
  const q = scoreTip({ title: "Use a good feed", formula: "it depends on the material", cite: "n/a", safety: false });
  assert.equal(q.tier, "low", `expected low, got ${q.tier} (score ${q.score})`);
  for (const f of ["no-number", "no-cite", "short", "vague"]) assert.ok(q.flags.includes(f), `missing flag ${f} in ${JSON.stringify(q.flags)}`);
});

const FAKE_STAGING = {
  count: 3, qualitySummary: { high: 1, mid: 0, low: 2 },
  tips: [
    { title: "Face-mill ae 60-75% cutter dia", source: "Sandvik p.68", tags: ["domain:mill"], quality: { score: 100, tier: "high", flags: [] } },
    { title: "Use a good feed", source: "n/a", tags: ["domain:mill"], quality: { score: 10, tier: "low", flags: ["no-number", "no-cite", "vague"] } },
    { title: "Wire tension affects taper", source: "GF AgieCharmilles", tags: ["domain:wedm"], quality: { score: 30, tier: "low", flags: ["no-number"] } },
  ],
};

test("renderDigest: groups by domain, HIGH first, LOW collapsed with flags", () => {
  const md = renderDigest(FAKE_STAGING);
  assert.match(md, /## mill -- 2 tips \(high 1 \/ mid 0 \/ low 1\)/, "per-domain header with tier counts");
  assert.match(md, /## wedm -- 1 tips/, "second domain section present");
  assert.match(md, /\*\*\[100\] Face-mill ae 60-75% cutter dia\*\*/, "high-tier tip listed with score");
  assert.match(md, /<details><summary>\(!\) 1 LOW-tier/, "low-tier collapsed in a details block");
  assert.match(md, /Use a good feed -- flags: no-number, no-cite, vague/, "low-tier shows its flags");
  assert.ok(md.indexOf("## mill") < md.indexOf("## wedm"), "domains alpha-sorted");
  assert.ok(md.indexOf("Face-mill") < md.indexOf("Use a good feed"), "HIGH before LOW within a domain");
});

test("renderDigest: empty/garbage staging -> header only, no crash", () => {
  const md = renderDigest({});
  assert.match(md, /Specialist Review Digest/);
  assert.match(md, /Total 0 tips/);
  assert.doesNotThrow(() => renderDigest(null));
  assert.doesNotThrow(() => renderDigest({ tips: "not-an-array" }));
});

test("scoreTip: numeric threshold in the TITLE (no formula field) still credits hasNumber (not a false-low)", () => {
  // the floor model often emits a freeform rule -> parseItems puts the number in title, formula empty
  const q = scoreTip({ title: "Toolpath spacing <= 0.5 x feature width to meet Ra tolerance", formula: "", cite: "" });
  assert.ok(q.flags.includes("no-formula"), "still honestly flags the absent formula field");
  assert.ok(!q.flags.includes("no-number"), "a number in the title must NOT be flagged no-number");
  assert.ok(q.score >= 45, `a title-embedded numeric rule should not be low-tier, got ${q.score}`);
});

test("scoreTip: empty item -> score 0 + all structural-absence flags (no crash)", () => {
  const q = scoreTip({});
  assert.equal(q.score, 0);
  assert.equal(q.tier, "low");
  for (const f of ["no-formula", "no-number", "no-cite", "short"]) assert.ok(q.flags.includes(f));
});

// ── CITED-TIPS GROUNDING (directive: ground in the densest H-drive PDF knowledge, both schemas) ──
const FAKE_TIPS_TS = `export const tips = [
  { id: "T1", headline: "Climb mill thin walls to push deflection into the wall not the cut", vendor: "Sandvik" },
  { id: "T2", title: "Peck drill deep holes above 5xD to clear chips and avoid 316L work-hardening" },
  { x: 1 },
  { id: "T3", headline: "Climb mill thin walls to push deflection into the wall not the cut" },
];`;

test("loadCitedTips: extracts BOTH headline and title fields, dedups, fail-soft on missing", () => {
  const g = loadCitedTips("mill", { existsImpl: () => true, readFileImpl: () => FAKE_TIPS_TS, sources: ["x.ts"] });
  assert.match(g, /Climb mill thin walls/, "must extract a headline: field");
  assert.match(g, /Peck drill deep holes/, "must extract a title: field too (mixed schemas)");
  assert.equal((g.match(/Climb mill thin walls/g) || []).length, 1, "duplicate headline must appear once");
  assert.equal(loadCitedTips("mill", { existsImpl: () => false, sources: ["x.ts"] }), "", "missing file -> '' (fail-soft)");
});

test("loadCitedTips: caps the sample count (PRISM_HERMES_ENRICH_CITED_N default 12)", () => {
  const many = "export const t=[" + Array.from({ length: 50 }, (_, i) => `{headline:"cited milling rule number ${i} with enough length"}`).join(",") + "];";
  const g = loadCitedTips("mill", { existsImpl: () => true, readFileImpl: () => many, sources: ["x.ts"] });
  assert.ok(g.split("\n").length <= 12, `sample must be capped, saw ${g.split("\n").length} lines`);
});

test("composeGrounding: cited PDF facts FIRST, then domain context (both present)", () => {
  const g = composeGrounding("mill", {
    cited: { existsImpl: () => true, readFileImpl: () => FAKE_TIPS_TS, sources: ["x.ts"] },
    mem: { existsImpl: () => true, readFileImpl: () => "- **Fleet**: JM Die runs VMC-01..05." },
  });
  assert.match(g, /ALREADY cited from this shop's H-drive PDF corpus/);
  assert.match(g, /Climb mill thin walls/, "cited content present");
  assert.match(g, /VMC-01\.\.05/, "memory context present");
  assert.ok(g.indexOf("Climb mill") < g.indexOf("VMC-01"), "cited facts must come BEFORE memory context");
});

test("composeGrounding: cad (no cited source) -> memory-only, graceful", () => {
  const g = composeGrounding("cad", {
    cited: { existsImpl: () => false, sources: [] },
    mem: { existsImpl: () => true, readFileImpl: () => "- **GD&T**: datum precedence A-B-C." },
  });
  assert.ok(!/ALREADY cited/.test(g), "no cited block when the domain has no cited corpus");
  assert.match(g, /datum precedence/, "falls back to memory context");
});
