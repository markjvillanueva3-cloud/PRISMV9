import Database from "better-sqlite3";

const db = new Database("H:/prism/resources/MasterCam/tutorialx8-tool-manager/Tool_Library/gsg_Tool_Manager.tooldb", { readonly: true });

// Get one tool with all related data
const tool = db.prepare("SELECT * FROM TlTool LIMIT 1").get();
console.log("TlTool row:");
console.log(`  ID: ${tool.ID}`);
console.log(`  ToolNumber: ${tool.ToolNumber}`);
console.log(`  OpToolInfo BLOB size: ${tool.OpToolInfo ? tool.OpToolInfo.length : 0} bytes`);
console.log(`  First 128 hex bytes of OpToolInfo:`);
if (tool.OpToolInfo) {
  const hex = tool.OpToolInfo.subarray(0, 128).toString('hex');
  console.log(`  ${hex}`);
}

// Get detailed tool type data for this tool
const toolMill = db.prepare("SELECT * FROM TlToolMill WHERE ID = ?").get(tool.ID);
console.log("\nTlToolMill data:");
if (toolMill) {
  Object.keys(toolMill).forEach(k => {
    console.log(`  ${k}: ${toolMill[k]}`);
  });
} else {
  console.log("  (no TlToolMill entry)");
}

// Check related assembly
const assembly = db.prepare("SELECT * FROM TlAssembly WHERE MainTool = ? LIMIT 1").get(tool.ID);
console.log("\nRelated TlAssembly:");
if (assembly) {
  Object.keys(assembly).forEach(k => {
    console.log(`  ${k}: ${assembly[k]}`);
  });
}

// Count by tool type
console.log("\n=== Tool Type Distribution ===");
const counts = db.prepare(`
  SELECT 'EndMill' as type, COUNT(*) as cnt FROM TlToolEndmill
  UNION ALL SELECT 'Drill', COUNT(*) FROM TlToolDrill
  UNION ALL SELECT 'Reamer', COUNT(*) FROM TlToolReamer
  UNION ALL SELECT 'CenterDrill', COUNT(*) FROM TlToolCenterDrill
  UNION ALL SELECT 'CounterBore', COUNT(*) FROM TlToolCounterBore
  UNION ALL SELECT 'Threading', COUNT(*) FROM TlToolThreading
`).all();
counts.forEach(r => console.log(`  ${r.type}: ${r.cnt}`));

db.close();
