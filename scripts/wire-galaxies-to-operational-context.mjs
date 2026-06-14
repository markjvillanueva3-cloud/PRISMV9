#!/usr/bin/env node
// Wire a maintained OPERATIONAL CONTEXT pointer block into each primary-domain galaxy's TOOLBELT.md.
// Operator directive 2026-06-10: "update each galaxy one by one with updated pc specs, tool upgrades,
// features, ollama utilization, how to run loops, obsidian vault, harnesses/lora/cag/rag."
// DRY: the block is a POINTER to canonical single-sources (CANONICAL-HOST-FACTS + the wiki methodology
// entry), NOT a copy of the specs (which would rot). Idempotent: strips its own marker block to the
// end-marker, then re-appends. Mirrors scripts/wire-galaxies-to-resource-roots.mjs.
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const ENGINES = path.join(ROOT, "mcp-server/src/engines");
const START = "<!-- OPERATIONAL-CONTEXT (auto-wired by scripts/wire-galaxies-to-operational-context.mjs -- regenerate, do not hand-edit) -->";
const END = "<!-- /OPERATIONAL-CONTEXT -->";

// ALL 34 PRISM galaxies (operator: "update EACH galaxy one by one"). owner = canonical slot.
// The 8 primary manufacturing domains lead; the operational context (PC specs / Ollama / loops /
// vault / LoRA-CAG-RAG) is universal and applies to every galaxy.
const PRIMARY = [
  // primary manufacturing 8
  ["mill", "foxtrot"], ["lathe", "whiskey"], ["wedm", "mike"], ["cam", "kilo"],
  ["speed-feed", "oscar"], ["post-processor", "echo"], ["cad", "delta"], ["blueprint-vision", "xray"],
  // non-manufacturing domain galaxies
  ["quoting", "charlie"], ["business", "hotel"], ["academy", "lima"], ["ai-training", "india"],
  ["database-expansion", "juliett"], ["frontend-app", "quebec"], ["quality", "golf"], ["shop-floor", "golf"],
  ["cad-fusion-live", "delta"],
  // meta / infra galaxies
  ["token-optimization", "alpha"], ["hermes-zulu", "zebra"], ["fleet-hygiene", "golf"], ["discovery", "tango"],
  ["system-viz", "sierra"], ["agent-orchestration", "zebra"], ["wiring", "romeo"], ["bug-hunting", "golf"],
  ["backend-helper", "papa"], ["dormant-data", "victor"], ["compliance-safety", "golf"],
  ["knowledge-conversion", "golf"], ["corpus-aggregation", "golf"], ["mit-curriculum", "lima"],
  ["tribal-knowledge", "golf"], ["pdf-corpus", "xray"], ["pdf-corpus-mill", "golf"],
];
const PRIMARY_MFG = new Set(["mill", "lathe", "wedm", "cam", "speed-feed", "post-processor", "cad", "blueprint-vision"]);

const CUTTING = new Set(["mill", "lathe", "wedm", "cam", "speed-feed", "post-processor", "cad"]);

// Per-domain tool stack + on-disk versions (from the LIVE resources/ enumeration 2026-06-10).
// "tool upgrades / features" the operator named -- kept current via the resource-map keep-fresh cadence.
const TOOLS = {
  "mill": "hyperMILL/OPEN MIND, Mastercam, HSMWorks 2027, Fusion 360; controllers Haas/Hurco/Roku-Roku",
  "lathe": "Okuma MULTUS (mill-turn), Fusion/Mastercam turning; controllers Okuma OSP/Fanuc",
  "wedm": "wire-EDM controllers (Makino/Mitsubishi/Sodick/GF); JM 99-customer program corpus",
  "cam": "OPEN MIND hyperMILL, Mastercam, HSMWorks 2027, SolidCAM, Fusion 360, CIMCO 2026 (verify/backplot)",
  "speed-feed": "vendor cutting-data catalogs (MANUFACTURER_CATALOGS), HSMAdvisor/G-Wizard parity surface",
  "post-processor": "Fusion post, CIMCO 2025/2026, controller dialects (Haas/Fanuc/Heidenhain/Okuma/LinuxCNC)",
  "cad": "Fusion 360, SolidWorks, Inventor 2027, FreeCAD, DWG TrueView 2027",
  "blueprint-vision": "multi-VLM OCR ensemble (qwen3-vl / qwen2.5vl / llama3.2-vision), Docustrata index, pypdf/Tesseract",
};

function layerLinks(g) {
  const links = [`[[${g}-foundations]]`, `[[${g}-source-atlas]]`, `[[${g}-applied-practice]]`];
  if (fs.existsSync(path.join(ROOT, `knowledge/wiki/${g}/${g}-advanced-techniques.md`))) {
    links.push(`[[${g}-advanced-techniques]]`);
  }
  return links.join(" / ");
}

function block(g, owner) {
  const safety = CUTTING.has(g)
    ? " Cutting numerics (SFM/IPR/chip-load/Kienzle/Taylor) are NEVER inlined -- import from mcp-server/src/physics/constants.ts."
    : "";
  return [
    START,
    `## OPERATIONAL CONTEXT (PC specs / Ollama / loops / vault / LoRA-CAG-RAG -- auto-wired)`,
    `- **Hardware (size every build to it):** RTX PRO 6000 Blackwell 96GB VRAM, Ryzen 9 9950X3D 32T, ~127GB RAM. Canonical: \`state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md\` (cite, do not restate -- it drifts otherwise).`,
    `- **Ollama utilization (offload here; reserve Claude for deep reasoning + safety):** code explain/review/lint -> \`qwen2.5-coder:32b\`; deep local reasoning -> \`gpt-oss:120b\` (65GB, fits resident on the 96GB card); trivial -> \`qwen2.5-coder:1.5b\`. Full roster + when-to-use each tier: [[prism-methodology-foundations]] section 1.`,
    `- **How to run loops:** [[agent-loop-design-rules]] (CLOSED-loop, eval-gate every iter, each pass feeds the next, BUDGET is a stop condition). **Obsidian vault (PSN brain):** [[feedback-obsidian-brain]] (recall before re-deriving; auto-fed every Stop). **Harnesses / LoRA / CAG / RAG:** [[prism-methodology-foundations]] (orchestrator/specialist/subagent split; arXiv-grounded).`,
    `- **Tool stack + on-disk versions (tool upgrades / features):** ${TOOLS[g] || "see this galaxy's PATHS.md / TOOLBELT.md for its tool + library stack"}.${PRIMARY_MFG.has(g) ? " Live corpus + versions: [[primary-domain-resource-map]] (keep-fresh cadence there)." : ""}`,
    `- **This domain's knowledge layers (auto-invoked via wiki-precheck-inject when relevant):** ${layerLinks(g)}.`,
    PRIMARY_MFG.has(g)
      ? `- **This domain's local resource trove (resources/ + JM DIE/ subdirs, easy access):** [[primary-domain-resource-map]] (owner: ${owner}).${safety}`
      : `- **Resource roots (easy access):** this galaxy's PATHS.md + \`mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json\` (H:/PRISM/resources, JM DIE, Docustrata) (owner: ${owner}).${safety}`,
    END,
    "",
  ].join("\n");
}

let wrote = 0;
const results = [];
for (const [g, owner] of PRIMARY) {
  const tb = path.join(ENGINES, g, "TOOLBELT.md");
  if (!fs.existsSync(tb)) { results.push(`${g}: NO TOOLBELT (skipped)`); continue; }
  let txt = fs.readFileSync(tb, "utf8").replace(/\r\n/g, "\n");
  const s = txt.indexOf(START);
  if (s !== -1) {
    const e = txt.indexOf(END, s);
    const cut = e === -1 ? txt.length : e + END.length;
    // strip the prior block (and a trailing newline) so re-runs do not stack
    txt = (txt.slice(0, s).replace(/\n+$/, "\n") + txt.slice(cut)).replace(/\n+$/, "\n");
  }
  if (!txt.endsWith("\n")) txt += "\n";
  txt += "\n" + block(g, owner);
  fs.writeFileSync(tb, txt, "utf8");
  wrote++;
  results.push(`${g}: wired (owner ${owner})`);
}
console.log(`wire-galaxies-to-operational-context: wrote ${wrote}/${PRIMARY.length} TOOLBELT.md op-context blocks`);
for (const r of results) console.log("  " + r);
