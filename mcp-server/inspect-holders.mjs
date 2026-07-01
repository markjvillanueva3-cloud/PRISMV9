import Database from "better-sqlite3";

const db = new Database("H:/prism/resources/MasterCam/tutorialx8-tool-manager/Tool_Library/gsg_Tool_Manager.tooldb", { readonly: true });

// Sample holder
const holder = db.prepare("SELECT * FROM TlHolder LIMIT 1").get();
console.log("=== TlHolder Sample ===");
Object.keys(holder).forEach(k => console.log(`  ${k}: ${holder[k]}`));

// Holder types (from HolderType INT)
console.log("\n=== Holder Type Values (unique) ===");
const holderTypes = db.prepare("SELECT DISTINCT HolderType FROM TlHolder ORDER BY HolderType").all();
holderTypes.forEach(h => console.log(`  HolderType: ${h.HolderType}`));

// Connection types
console.log("\n=== Upper Connection Types (unique) ===");
const upperConn = db.prepare("SELECT DISTINCT UpperConnectionType, UpperConnectionSize FROM TlHolder ORDER BY UpperConnectionType").all();
upperConn.forEach(c => console.log(`  Type: ${c.UpperConnectionType}, Size: ${c.UpperConnectionSize}`));

console.log("\n=== Lower Connection Types (unique) ===");
const lowerConn = db.prepare("SELECT DISTINCT LowerConnectionType, LowerConnectionSize FROM TlHolder ORDER BY LowerConnectionType").all();
lowerConn.forEach(c => console.log(`  Type: ${c.LowerConnectionType}, Size: ${c.LowerConnectionSize}`));

// Holder-to-tool linkage
console.log("\n=== Assemblies with Holders ===");
const assemblies = db.prepare(`
  SELECT COUNT(*) as total, MainHolder, MainTool FROM TlAssembly GROUP BY MainHolder LIMIT 3
`).all();
assemblies.forEach(a => console.log(`  Holder: ${a.MainHolder ? 'yes' : 'no'}, Tool: ${a.MainTool ? 'yes' : 'no'}, Count: ${a.total}`));

db.close();
