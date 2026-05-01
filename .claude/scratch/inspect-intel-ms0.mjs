import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const path = args[0];
const m = JSON.parse(readFileSync(path, "utf8"));
console.log("id:", m.id);
console.log("status:", m.status);
console.log("depends_on:", JSON.stringify(m.depends_on));
console.log("phases:", m.phases?.length || 0);
if (m.phases) {
  for (let i = 0; i < m.phases.length; i++) {
    const p = m.phases[i];
    const total = p.units?.length || 0;
    const done = p.units?.filter((u) => u.status === "complete").length || 0;
    console.log(`\nP${i}: ${p.id || p.name || "?"} (${done}/${total})`);
    console.log(`     ${p.title || p.description || ""}`.slice(0, 140));
    if (p.units) {
      const limit = args[1] === "all" ? total : 5;
      p.units.slice(0, limit).forEach((u) => {
        console.log(`  ${u.id}: ${(u.title || u.name || "").slice(0, 90)} [${u.status || "pending"}]`);
      });
      if (total > limit) console.log(`  ... +${total - limit} more units`);
    }
  }
}
