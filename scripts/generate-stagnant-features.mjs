#!/usr/bin/env node
/**
 * generate-stagnant-features.mjs — surface PLANNED-but-UNBUILT work as ghost nodes.
 *
 * Sources:
 *   1. state/shared/MILESTONE_PROGRESS.json — 613 milestones, 2,722 pending units.
 *      Every milestone whose `derivedStatus` is `not_started_real` becomes a
 *      ghost L8 node. Every pending unit becomes a ghost L9 node linked to it.
 *   2. state/shared/specs/*.md — design docs for proposed work that never landed.
 *      Each spec becomes a ghost L8 node tagged `kind: design`.
 *
 * Routing edges:
 *   When a milestone title or scope contains a known dispatcher keyword
 *   (cam/cad/turning/edm/safety/etc.), emit a ghost `planned_for` edge from
 *   the milestone → the dispatcher node, so users can see "this dispatcher
 *   has X planned features waiting to be built."
 *
 * All emitted nodes carry `status: "ghost"` and `ghost: true` so the viz
 * Ghost-Mode toggle (G key) can highlight them.
 *
 * Output: state/shared/system-viz/stagnant-features-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const MP = path.join(ROOT, "state", "shared", "MILESTONE_PROGRESS.json");
const SPECS_DIR = path.join(ROOT, "state", "shared", "specs");

const MAX_UNITS_PER_MS = 60;     // cap so a 200-unit milestone doesn't explode
const SHIP_RECENCY_DAYS = 21;    // a milestone w/ shipped within N days isn't stagnant

function safeId(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 80);
}

function dispKeywordRoutes(text) {
  // Map title keywords → existing dispatcher node ids (a subset that covers
  // ~95% of milestone routing).
  const t = text.toLowerCase();
  const out = new Set();
  const rules = [
    [/wedm|wire.?edm|edm/, "disp.edmdispatcher"],
    [/lathe|turning|millturn|mill.?turn/, "disp.turningdispatcher"],
    [/print.?to.?program|p2p/, "disp.turningprogramdispatcher"],
    [/mill\b|milling/, "disp.milldispatcher"],
    [/\bcam\b|toolpath|strategy/, "disp.camdispatcher"],
    [/\bcad\b|geometry|sketch/, "disp.caddispatcher"],
    [/safety|s\(x\)|omega/, "disp.safetydispatcher"],
    [/quality|spc|cpk|fai/, "disp.qualitydispatcher"],
    [/cost|quote|erp|billing/, "disp.businessdispatcher"],
    [/probe|inspection|cmm/, "disp.qualitydispatcher"],
    [/post.?proc|ppg|gcode|controller/, "disp.camdispatcher"],
    [/grinding|grind/, "disp.grindingdispatcher"],
    [/calc|kienzle|taylor|cutting.?force|chatter|deflection/, "disp.calcdispatcher"],
    [/tool|insert|holder|coating/, "disp.datadispatcher"],
    [/material|alloy|hardness/, "disp.datadispatcher"],
    [/agi|reasoning|neural|deep.?learn|wisdom/, "disp.aidispatcher"],
    [/orchestrat|autopilot|agent|atcs/, "disp.orchestratedispatcher"],
    [/session|context|memory|handoff/, "disp.sessiondispatcher"],
    [/safety.?gate|veto|guard|enforce/, "disp.guarddispatcher"],
    [/process.?control|ctc|ewma|cusum/, "disp.process_controldispatcher"],
    [/hook|enforcement/, "disp.hookdispatcher"],
    [/feasibility|accessibility|workholding|rigidity/, "disp.feasibilitydispatcher"],
    [/scheduling|capacity|due.?date/, "disp.schedulingdispatcher"],
    [/automation|oee|bottleneck|digital.?thread/, "disp.automationdispatcher"],
    [/multi.?op|sequence|setup|transition/, "disp.multi_opdispatcher"],
    [/calibrat|adaptive|drift|bayesian/, "disp.adaptivecontroldispatcher"],
    [/tribal|wiki|knowledge|learn/, "disp.knowledgedispatcher"],
  ];
  for (const [re, disp] of rules) if (re.test(t)) out.add(disp);
  return [...out];
}

function looksRecentlyActive(ms) {
  if (!ms.lastShippedDate) return false;
  const d = new Date(ms.lastShippedDate).getTime();
  if (!Number.isFinite(d)) return false;
  const ageMs = Date.now() - d;
  return ageMs < SHIP_RECENCY_DAYS * 86400_000;
}

function loadMilestones() {
  if (!fs.existsSync(MP)) return null;
  return JSON.parse(fs.readFileSync(MP, "utf8"));
}

function listSpecs() {
  if (!fs.existsSync(SPECS_DIR)) return [];
  return fs.readdirSync(SPECS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => ({
      name: f.replace(/\.md$/, ""),
      path: path.join(SPECS_DIR, f),
      stat: (() => { try { return fs.statSync(path.join(SPECS_DIR, f)); } catch { return null; } })(),
    }))
    .filter(s => s.stat);
}

function generate() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingNodeIds = new Set(graph.nodes.map(n => n.id));
  const newNodes = [];
  const newEdges = [];
  const stats = {
    msTotal: 0, msStagnant: 0, msSkippedActive: 0, msSkippedNoUnits: 0,
    msEmitted: 0, unitsEmitted: 0, specsEmitted: 0,
    routeEdges: 0, missingDisp: 0,
  };

  // ===== Synthesize a ghost-features parent so they have somewhere to roost =====
  const PLANNED_PARENT = "ghost.planned_features";
  if (!existingNodeIds.has(PLANNED_PARENT)) {
    newNodes.push({
      id: PLANNED_PARENT,
      label: "Planned Features (ghosts)",
      layer: "L8",
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
    });
    existingNodeIds.add(PLANNED_PARENT);
  }

  // ===== 1. Milestones =====
  const mp = loadMilestones();
  if (mp?.milestones) {
    for (const ms of Object.values(mp.milestones)) {
      stats.msTotal++;
      const status = (ms.derivedStatus || "").toLowerCase();
      const isStagnant =
        status.includes("not_started") ||
        status.includes("stagnant") ||
        (ms.shipped === 0 && (ms.total ?? 0) > 0);
      if (!isStagnant) continue;
      if (!ms.id || (ms.total ?? 0) === 0) {
        stats.msSkippedNoUnits++;
        continue;
      }
      if (looksRecentlyActive(ms)) {
        stats.msSkippedActive++;
        continue;
      }
      stats.msStagnant++;

      const msId = "ghost.ms." + safeId(ms.id);
      if (!existingNodeIds.has(msId)) {
        newNodes.push({
          id: msId,
          label: `🔻 ${ms.id} · ${ms.title || ""}`.slice(0, 120),
          layer: "L8",
          ghost: true,
          status: "ghost",
          kind: "milestone",
          parent: PLANNED_PARENT,
          info: `${ms.shipped}/${ms.total} units shipped` +
                (ms.lastShippedDate ? ` · last ship ${ms.lastShippedDate}` : " · never started"),
        });
        existingNodeIds.add(msId);
        stats.msEmitted++;
      }

      // Route edges to suggested dispatchers based on title keywords
      const dispatchers = dispKeywordRoutes((ms.title || "") + " " + (ms.id || ""));
      for (const d of dispatchers) {
        if (!existingNodeIds.has(d)) { stats.missingDisp++; continue; }
        newEdges.push({
          from: msId, to: d,
          type: "planned_for", status: "ghost", intensity: 0.3,
        });
        stats.routeEdges++;
      }

      // Pending units → child ghost nodes
      const pendingUnits = (ms.units || []).filter(u =>
        !u.shipped &&
        !(u.status || "").toLowerCase().includes("shipped") &&
        !(u.status || "").toLowerCase().includes("done")
      ).slice(0, MAX_UNITS_PER_MS);
      for (const u of pendingUnits) {
        const uid = msId + "." + safeId(u.id || u.title || "unit_" + stats.unitsEmitted);
        if (existingNodeIds.has(uid)) continue;
        newNodes.push({
          id: uid,
          label: u.id || (u.title || "").slice(0, 60) || "(unnamed unit)",
          layer: "L9",
          ghost: true,
          status: "ghost",
          kind: "planned-unit",
          parent: msId,
          info: u.title || "",
        });
        existingNodeIds.add(uid);
        stats.unitsEmitted++;
      }
    }
  }

  // ===== 2. Specs (design docs for proposed work) =====
  for (const s of listSpecs()) {
    const sid = "ghost.spec." + safeId(s.name);
    if (existingNodeIds.has(sid)) continue;
    let title = s.name;
    let summary = "";
    try {
      const head = fs.readFileSync(s.path, "utf8").slice(0, 4000);
      const titleMatch = head.match(/^#\s+(.+)$/m);
      if (titleMatch) title = titleMatch[1].slice(0, 120);
      const summaryMatch = head.match(/(?:^##?\s*Summary[\s\S]+?\n)([^\n#]+)/im) ||
                           head.match(/^(?!#)([^\n]{40,200})/m);
      if (summaryMatch) summary = summaryMatch[1].trim().slice(0, 200);
    } catch {}
    newNodes.push({
      id: sid,
      label: `📐 ${title}`.slice(0, 120),
      layer: "L8",
      ghost: true,
      status: "ghost",
      kind: "design-spec",
      parent: PLANNED_PARENT,
      info: summary || "design spec",
      file: path.relative(ROOT, s.path).replace(/\\/g, "/"),
    });
    existingNodeIds.add(sid);
    stats.specsEmitted++;

    // Spec → dispatcher routing as well
    const dispatchers = dispKeywordRoutes(title + " " + summary);
    for (const d of dispatchers) {
      if (!existingNodeIds.has(d)) continue;
      newEdges.push({
        from: sid, to: d,
        type: "designed_for", status: "ghost", intensity: 0.25,
      });
      stats.routeEdges++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "stagnant-features-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  milestones inspected:    ${result.stats.msTotal}`);
console.log(`  milestones stagnant:     ${result.stats.msStagnant}`);
console.log(`  milestones emitted:      ${result.stats.msEmitted}`);
console.log(`  pending units emitted:   ${result.stats.unitsEmitted}`);
console.log(`  specs emitted:           ${result.stats.specsEmitted}`);
console.log(`  route edges (→ disp):    ${result.stats.routeEdges}`);
console.log(`  missing dispatchers:     ${result.stats.missingDisp}`);
console.log(`  total new nodes:         ${result.newNodes.length}`);
console.log(`  total new edges:         ${result.newEdges.length}`);
