/**
 * Extract real data from Box drive programs and Fusion 360 local cache.
 * Outputs structured JSON to data/box-extraction/ and data/fusion-programs/.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, basename, extname } from "path";

const BOX_ROOT = "H:/prism/BOX";
const FUSION_POSTS = process.env.LOCALAPPDATA + "/Autodesk/Autodesk Fusion 360/CAM/cache/posts";
const FUSION_TOOLS = process.env.LOCALAPPDATA + "/Autodesk/Autodesk Fusion 360/YJY2T8B3QGVYLQ6R/W.login/M/D20230831668142481/CAMTools";
const OUT_BOX = "H:/prism/mcp-server/data/box-extraction";
const OUT_FUSION = "H:/prism/mcp-server/data/fusion-programs";

// ── Collect all .MIN files ──────────────────────────────────────
function findFiles(dir, ext, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) findFiles(full, ext, results);
      else if (extname(entry).toLowerCase() === ext) results.push(full);
    } catch {}
  }
  return results;
}

// ── Parse Okuma .MIN programs ───────────────────────────────────
function parseOkumaProgram(content, filename) {
  const lines = content.split(/\r?\n/);
  const tools = [];
  const variables = [];
  const speeds = [];
  let currentTool = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Variable assignments: V1 = 1.905 (STOCK DIAMETER)
    const varMatch = line.match(/^V(\d+)\s*=\s*([+-]?\d*\.?\d+)\s*(?:\(([^)]*)\))?/);
    if (varMatch) {
      variables.push({
        variable: `V${varMatch[1]}`,
        value: parseFloat(varMatch[2]),
        comment: varMatch[3]?.trim() || null,
        line: i + 1,
      });
    }

    // Tool changes: T010101, N1 T010101
    const toolMatch = line.match(/(?:^N\d+\s+)?T(\d{2})(\d{2})(\d{2})/);
    if (toolMatch) {
      currentTool = {
        station: parseInt(toolMatch[1]),
        offset: parseInt(toolMatch[2]),
        compensation: parseInt(toolMatch[3]),
        line: i + 1,
        comment: null,
        speeds: [],
        feeds: [],
      };
      // Check previous line for comment
      if (i > 0 && lines[i-1].trim().startsWith("(")) {
        currentTool.comment = lines[i-1].trim().replace(/[()]/g, "").trim();
      }
      // Check same line comment
      const inlineComment = line.match(/\(([^)]+)\)/);
      if (inlineComment) currentTool.comment = inlineComment[1].trim();
      tools.push(currentTool);
    }

    // Speed: G96 S600, G97 S1200
    const speedMatch = line.match(/G9([67])\s+S(\d+)/);
    if (speedMatch) {
      const entry = {
        mode: speedMatch[1] === "6" ? "css" : "rpm",
        value: parseInt(speedMatch[2]),
        line: i + 1,
        tool_station: currentTool?.station || null,
      };
      speeds.push(entry);
      if (currentTool) currentTool.speeds.push(entry);
    }

    // Feed: F0.012, F1.91
    const feedMatch = line.match(/F(\d*\.?\d+)/);
    if (feedMatch && currentTool && !line.startsWith("(")) {
      currentTool.feeds.push({
        value: parseFloat(feedMatch[1]),
        line: i + 1,
      });
    }
  }

  // Detect features
  const hasG85 = lines.some(l => /\bG85\b/.test(l));
  const hasG74 = lines.some(l => /\bG74\b/.test(l));
  const hasG71 = lines.some(l => /\bG71\b/.test(l));
  const hasBarFeeder = lines.some(l => /CALL OBAR|GOTO NBAR/i.test(l));
  const hasMacros = variables.length > 0;
  const hasCSS = speeds.some(s => s.mode === "css");
  const hasG50 = lines.some(l => /\bG50\s+S\d/.test(l));

  return {
    filename,
    line_count: lines.length,
    tools,
    variables,
    speeds,
    features: { hasG85, hasG74, hasG71, hasBarFeeder, hasMacros, hasCSS, hasG50 },
    tool_count: tools.length,
    variable_count: variables.length,
  };
}

// ── Parse Fusion .cps post files (header only) ──────────────────
function parseCPSHeader(content, filename) {
  const lines = content.split(/\r?\n/).slice(0, 100);
  const info = { filename, description: null, vendor: null, model: null, capabilities: [] };

  for (const line of lines) {
    const descMatch = line.match(/description\s*[:=]\s*"([^"]+)"/i);
    if (descMatch) info.description = descMatch[1];

    const vendorMatch = line.match(/vendor\s*[:=]\s*"([^"]+)"/i);
    if (vendorMatch) info.vendor = vendorMatch[1];

    const modelMatch = line.match(/model\s*[:=]\s*"([^"]+)"/i);
    if (modelMatch) info.model = modelMatch[1];

    if (/milling/i.test(line)) info.capabilities.push("milling");
    if (/turning/i.test(line)) info.capabilities.push("turning");
    if (/mill.?turn/i.test(line)) info.capabilities.push("mill-turn");
    if (/5.?axis/i.test(line)) info.capabilities.push("5-axis");
  }

  return info;
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

console.log("=== BOX PROGRAM EXTRACTION ===");

// 1. Parse all .MIN files
const minFiles = findFiles(BOX_ROOT, ".min");
console.log(`Found ${minFiles.length} .MIN files`);

const parsedPrograms = [];
for (const file of minFiles) {
  const content = readFileSync(file, "utf8");
  const parsed = parseOkumaProgram(content, basename(file));
  parsed.source_path = file.replace(/\\/g, "/");
  parsedPrograms.push(parsed);
  console.log(`  ${basename(file)}: ${parsed.tool_count} tools, ${parsed.variable_count} vars, ${parsed.line_count} lines`);
}

writeFileSync(join(OUT_BOX, "okuma-programs.json"), JSON.stringify(parsedPrograms, null, 2));
console.log(`\nWrote ${parsedPrograms.length} parsed programs to box-extraction/okuma-programs.json`);

// 2. Collect STEP files
const stepFiles = findFiles(BOX_ROOT, ".step");
const stepIndex = stepFiles.map(f => ({
  filename: basename(f),
  path: f.replace(/\\/g, "/"),
  size_bytes: statSync(f).size,
  // Try to extract machine hint from filename
  machine_hint: f.match(/MACHINE\s*(\d+)|MULTUS|HURCO/i)?.[0] || null,
}));
writeFileSync(join(OUT_BOX, "step-file-index.json"), JSON.stringify(stepIndex, null, 2));
console.log(`\nIndexed ${stepIndex.length} STEP files`);

// 3. Parse Fusion tool holders
if (existsSync(FUSION_TOOLS)) {
  const toolFiles = findFiles(FUSION_TOOLS, ".json");
  const allHolders = [];
  for (const tf of toolFiles) {
    try {
      const data = JSON.parse(readFileSync(tf, "utf8"));
      if (data.data && Array.isArray(data.data)) {
        for (const holder of data.data) {
          allHolders.push({
            description: holder.description,
            vendor: holder.vendor || null,
            product_id: holder["product-id"] || null,
            gauge_length: holder.gaugeLength,
            unit: holder.unit,
            type: holder.type,
            segments: holder.segments?.length || 0,
            source_file: basename(tf),
          });
        }
      }
    } catch {}
  }
  writeFileSync(join(OUT_FUSION, "fusion-tool-holders.json"), JSON.stringify(allHolders, null, 2));
  console.log(`\nExtracted ${allHolders.length} Fusion tool holders`);
}

// 4. Parse relevant .cps posts
const targetPosts = ["okuma", "haas", "hurco", "mitsubishi", "fanuc"];
if (existsSync(FUSION_POSTS)) {
  const cpsFiles = findFiles(FUSION_POSTS, ".cps");
  const relevantPosts = [];

  for (const cps of cpsFiles) {
    const name = basename(cps).toLowerCase();
    if (targetPosts.some(t => name.includes(t))) {
      const content = readFileSync(cps, "utf8");
      const info = parseCPSHeader(content, basename(cps));
      info.size_bytes = statSync(cps).size;
      info.path = cps.replace(/\\/g, "/");
      relevantPosts.push(info);
    }
  }

  writeFileSync(join(OUT_FUSION, "relevant-cps-posts.json"), JSON.stringify(relevantPosts, null, 2));
  console.log(`\nExtracted ${relevantPosts.length} relevant CPS posts (from ${cpsFiles.length} total)`);
}

// 5. Summary
const summary = {
  extracted_at: new Date().toISOString(),
  okuma_programs: parsedPrograms.length,
  total_tools_across_programs: parsedPrograms.reduce((s, p) => s + p.tool_count, 0),
  total_variables_across_programs: parsedPrograms.reduce((s, p) => s + p.variable_count, 0),
  programs_with_macros: parsedPrograms.filter(p => p.features.hasMacros).length,
  programs_with_css: parsedPrograms.filter(p => p.features.hasCSS).length,
  step_files: stepIndex.length,
  step_with_machine_hint: stepIndex.filter(s => s.machine_hint).length,
};
writeFileSync(join(OUT_BOX, "extraction-summary.json"), JSON.stringify(summary, null, 2));
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));
