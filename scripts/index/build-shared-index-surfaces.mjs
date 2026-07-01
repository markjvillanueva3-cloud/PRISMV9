import { promises as fs } from "node:fs";
import path from "node:path";

const OUTPUTS = {
  json: "C:\\PRISM\\state\\shared\\PRISM_SHARED_INDEX_SURFACES.json",
  markdown: "C:\\PRISM\\state\\shared\\PRISM_SHARED_INDEX_SURFACES.md",
};

const SURFACES = [
  {
    id: "master_index_compact",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\MASTER_INDEX_COMPACT.md",
    category: "inventory",
    priority: 1,
    purpose: "Fast compact system inventory for broad PRISM orientation before deep repo search.",
  },
  {
    id: "master_index",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\MASTER_INDEX.md",
    category: "inventory",
    priority: 2,
    purpose: "Expanded master system inventory when the compact version is insufficient.",
  },
  {
    id: "directory_digest",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\DIRECTORY_DIGEST.md",
    category: "navigation",
    priority: 1,
    purpose: "Directory-level purpose map for fast navigation without broad filesystem sweeps.",
  },
  {
    id: "path_index",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\PATH_INDEX.md",
    category: "navigation",
    priority: 2,
    purpose: "Path-oriented lookup for locating files and subsystems quickly.",
  },
  {
    id: "code_system_index_json",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\CODE_SYSTEM_INDEX.json",
    category: "code",
    priority: 1,
    purpose: "Machine-readable code shortcode and location index for low-token code lookup.",
  },
  {
    id: "code_system_index_md",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\CODE_SYSTEM_INDEX.md",
    category: "code",
    priority: 2,
    purpose: "Human-readable companion to the code system index.",
  },
  {
    id: "engine_digest",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\ENGINE_DIGEST.md",
    category: "code",
    priority: 1,
    purpose: "Engine inventory with short descriptions for engine discovery before file greps.",
  },
  {
    id: "dispatcher_digest",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\DISPATCHER_DIGEST.md",
    category: "code",
    priority: 1,
    purpose: "Dispatcher inventory with action counts for fast tool/action orientation.",
  },
  {
    id: "script_index",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\SCRIPT_INDEX.json",
    category: "code",
    priority: 2,
    purpose: "Machine-readable script index for locating automation and maintenance scripts.",
  },
  {
    id: "roadmap_index",
    path: "C:\\PRISM\\mcp-server\\data\\roadmap-index.json",
    category: "roadmap",
    priority: 1,
    purpose: "Canonical roadmap envelope index and milestone lookup surface.",
  },
  {
    id: "roadmap_section_index",
    path: "C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\ROADMAP_SECTION_INDEX.md",
    category: "roadmap",
    priority: 2,
    purpose: "Section-level roadmap navigation before scanning full roadmap docs.",
  },
];

async function statInfo(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return {
      exists: true,
      size_bytes: stat.size,
      modified_at: stat.mtime.toISOString(),
    };
  } catch {
    return {
      exists: false,
      size_bytes: null,
      modified_at: null,
    };
  }
}

function renderMarkdown(payload) {
  const lines = [];
  lines.push("# PRISM Shared Index Surfaces");
  lines.push("");
  lines.push(`Generated: ${payload.generated_at}`);
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "These are the canonical index and digest surfaces both Claude and Codex should prefer before broad repo sweeps when they need orientation, navigation, or low-token discovery.",
  );
  lines.push("");
  lines.push("## Preferred Order");
  lines.push("");
  lines.push("1. Shared directives, handoff, and current position");
  lines.push("2. Compact/system indexes and digests");
  lines.push("3. Targeted file reads");
  lines.push("4. Broad search only when the indexed surfaces are insufficient");
  lines.push("");
  lines.push("## Indexed Surfaces");
  lines.push("");
  for (const surface of payload.surfaces) {
    lines.push(
      `- \`${surface.id}\` [${surface.category}] priority ${surface.priority} — ${surface.exists ? "present" : "missing"} — \`${surface.path}\``,
    );
    lines.push(`  ${surface.purpose}`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Present: ${payload.summary.present}`);
  lines.push(`- Missing: ${payload.summary.missing}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const enriched = [];
  for (const surface of SURFACES) {
    const info = await statInfo(surface.path);
    enriched.push({
      ...surface,
      ...info,
    });
  }

  const payload = {
    generated_at: new Date().toISOString(),
    generator: "C:\\PRISM\\scripts\\index\\build-shared-index-surfaces.mjs",
    summary: {
      present: enriched.filter((surface) => surface.exists).length,
      missing: enriched.filter((surface) => !surface.exists).length,
    },
    surfaces: enriched,
  };

  await fs.mkdir(path.dirname(OUTPUTS.json), { recursive: true });
  await fs.writeFile(OUTPUTS.json, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(OUTPUTS.markdown, renderMarkdown(payload), "utf8");

  process.stdout.write(
    JSON.stringify({
      ok: true,
      json: OUTPUTS.json,
      markdown: OUTPUTS.markdown,
      summary: payload.summary,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
