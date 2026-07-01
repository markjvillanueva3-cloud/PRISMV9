import Database from "better-sqlite3";

const db = new Database("H:/prism/resources/MasterCam/tutorialx8-tool-manager/Tool_Library/gsg_Tool_Manager.tooldb", { readonly: true });

console.log("=== TABLES ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`  ${t.name}`));

console.log("\n=== TOOL-RELATED TABLES ===");
const toolTables = tables.filter(t => t.name.toLowerCase().includes('tool') || t.name.toLowerCase().includes('holder') || t.name.toLowerCase().includes('geom'));
toolTables.forEach(t => {
  console.log(`\n-- ${t.name} --`);
  const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get();
  console.log(`  [${count.cnt} rows]`);
});

console.log("\n=== ALL TABLES WITH SCHEMA ===");
tables.forEach(t => {
  console.log(`\n-- ${t.name} --`);
  const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`Columns: ${schema.length}`);
  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type}`);
  });
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get();
  console.log(`Rows: ${count.cnt}`);
});

db.close();
