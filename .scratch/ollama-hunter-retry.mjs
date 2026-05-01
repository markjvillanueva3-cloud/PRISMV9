#!/usr/bin/env node
// Retry the failed Ollama hunts (biz + failure-modes) + add a NEW pass:
// "cited-but-unused" — engines named in PPG-MS leverage_existing that don't appear in any unit's files_to_modify.

import fs from "node:fs";
import path from "node:path";

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "qwen2.5-coder:7b";
const MS_DIR = "H:/prism/mcp-server/data/milestones";
const OUT = "H:/prism/.scratch/ollama-opportunities-retry.json";

const NUM_PREDICT_BIZ = 2400;
const NUM_PREDICT_FAIL = 2400;
const NUM_PREDICT_UNUSED = 2400;

async function ask(prompt, max = 2000, temp = 0.3) {
  const t0 = Date.now();
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: temp, num_predict: max } })
    });
    const j = await res.json();
    return { ok: true, response: j.response || "", elapsed_ms: Date.now() - t0 };
  } catch (err) {
    return { ok: false, error: String(err), elapsed_ms: Date.now() - t0 };
  }
}

function tryJson(text) {
  if (!text) return null;
  const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ---------- Load roadmap context ----------
const ppgFiles = fs.readdirSync(MS_DIR).filter(f => f.startsWith("PPG-MS") && f.endsWith(".json"));
const ppgEnvelopes = ppgFiles.map(f => JSON.parse(fs.readFileSync(path.join(MS_DIR, f), "utf8")));

// Collect cited engines and the unit files where each appears
const engineRefs = new Map(); // engineName -> Set of (milestone:unit:where)
for (const env of ppgEnvelopes) {
  // From leverage_existing
  if (Array.isArray(env.leverage_existing)) {
    for (const line of env.leverage_existing) {
      const matches = (line || "").match(/[A-Z][a-zA-Z0-9]+Engine/g) || [];
      for (const e of matches) {
        if (!engineRefs.has(e)) engineRefs.set(e, { leverage: [], files_to_modify: [] });
        engineRefs.get(e).leverage.push(env.id);
      }
    }
  }
  // From unit files_to_modify
  if (Array.isArray(env.units)) {
    for (const u of env.units) {
      if (Array.isArray(u.files_to_modify)) {
        for (const fp of u.files_to_modify) {
          const m = fp.match(/([A-Z][a-zA-Z0-9]+Engine)\.ts/);
          if (m) {
            const e = m[1];
            if (!engineRefs.has(e)) engineRefs.set(e, { leverage: [], files_to_modify: [] });
            engineRefs.get(e).files_to_modify.push(`${env.id}/${u.id}`);
          }
        }
      }
    }
  }
}

// Cited-but-unused: in leverage_existing but never in files_to_modify
const citedButUnused = [];
for (const [engine, refs] of engineRefs) {
  if (refs.leverage.length > 0 && refs.files_to_modify.length === 0) {
    citedButUnused.push({ engine, leverage_in: refs.leverage });
  }
}
console.error(`Cited-but-unused engines: ${citedButUnused.length} of ${engineRefs.size} total`);

// ---------- Hunts ----------
const ppgSummaryShort = ppgEnvelopes.map(e => `${e.id}: ${e.title.slice(0, 80)}`).slice(0, 18).join("\n");

async function huntBusiness() {
  const prompt = `You are a startup strategist for PRISM (CNC manufacturing post-processor).

Competitors: SolidCAM iMachining ($8-15k/seat), Vericut ($5-12k), Mastercam, hyperMILL.
Customer #1: JM Die Company, 21 machines, fastener dies.

Roadmap covers: technical depth, compliance, demo/ROI, pilot.

OUTPUT 6 BUSINESS-MODEL ANGLES that create defensible advantage. STRICT JSON ONLY:

[{"angle":"name","mechanism":"how it works in 60 words","moat":"why competitors can't copy in 30 words"},...]

NO PREAMBLE. START WITH [`;
  return ask(prompt, NUM_PREDICT_BIZ, 0.4);
}

async function huntFailures() {
  const prompt = `You are a strategic-risk reviewer for a CNC manufacturing platform with 39 milestones, ~225 units. Already covered: physics correctness, wiring, lathe coverage, WEDM coverage, orchestrators, patent FTO, compliance (AS9100/NADCAP/ITAR/ISO13485/IATF/CMMC), dependency graph, UX.

OUTPUT 6 NON-OBVIOUS RISKS that prior reviews missed. Categories: hidden tool/hardware dependency, dependency bottleneck, copy-vulnerability, regulatory exposure, operator confusion. STRICT JSON ONLY:

[{"risk":"name","mode":"how it manifests in 60 words","mitigation":"in 30 words"},...]

NO PREAMBLE. START WITH [`;
  return ask(prompt, NUM_PREDICT_FAIL, 0.4);
}

async function huntCitedButUnused() {
  const list = citedButUnused.slice(0, 80).map(x => `- ${x.engine} (cited in: ${x.leverage_in.join(",")})`).join("\n");
  const prompt = `These engines are CITED in PPG roadmap leverage_existing but no unit lists their .ts file in files_to_modify — meaning they're invoked-only, never modified. For each, indicate if missing wiring is a real gap or acceptable (some engines are invoked but don't need modification).

Output JSON (top 8 most concerning):
[{"engine":"name","verdict":"GAP or OK","reason":"in 50 words"},...]

ENGINES:
${list}

JSON ONLY. START WITH [`;
  return ask(prompt, NUM_PREDICT_UNUSED, 0.3);
}

console.error("Starting 3 retry hunts in parallel...");
const t0 = Date.now();
const [bizR, failR, unusedR] = await Promise.all([huntBusiness(), huntFailures(), huntCitedButUnused()]);
console.error(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const biz = tryJson(bizR.response);
const fail = tryJson(failR.response);
const unused = tryJson(unusedR.response);

const result = {
  meta: {
    generated_at: new Date().toISOString(),
    elapsed_seconds: Math.round((Date.now() - t0) / 1000),
    cited_but_unused_total: citedButUnused.length,
    biz_returned: biz ? biz.length : 0,
    failures_returned: fail ? fail.length : 0,
    unused_returned: unused ? unused.length : 0,
    raw_lengths: { biz: bizR.response.length, fail: failR.response.length, unused: unusedR.response.length }
  },
  business_model_angles: biz || [],
  failure_modes_and_risks: fail || [],
  cited_but_unused_assessment: unused || [],
  cited_but_unused_full_list: citedButUnused
};

fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.meta, null, 2));
if (!biz) console.error("BIZ raw start: " + bizR.response.slice(0, 200));
if (!fail) console.error("FAIL raw start: " + failR.response.slice(0, 200));
if (!unused) console.error("UNUSED raw start: " + unusedR.response.slice(0, 200));
