import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const SOURCE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const MARKER_DIR = "PRISM_UPGRADED";
function parseWindowMs(raw) {
  if (!raw) return 12 * 60 * 60 * 1000;
  const m = raw.match(/^(\d+)([mhd])$/);
  if (!m) { process.stderr.write(`bad window ${raw}\n`); process.exit(2); }
  const n = parseInt(m[1], 10), u = m[2];
  return n * (u === "m" ? 60000 : u === "h" ? 3600000 : 86400000);
}
const argIdx = process.argv.indexOf("--window");
const cutoff = Date.now() - parseWindowMs(argIdx >= 0 ? process.argv[argIdx + 1] : null);
function rd(d) { try { return readdirSync(d, { withFileTypes: true }); } catch { return null; } }
function mt(p) { try { return statSync(p).mtimeMs; } catch { return -1; } }
let totalRecent = 0, totalAll = 0, customers = 0, machines = 0, mostRecent = 0;
const perMachine = new Map();
const customerList = rd(SOURCE_ROOT);
if (!customerList) { process.stderr.write("ROOT MISSING\n"); process.exit(1); }
for (const c of customerList) {
  if (!c.isDirectory()) continue;
  const up = join(SOURCE_ROOT, c.name, MARKER_DIR);
  const mlist = rd(up);
  if (!mlist) continue;
  customers++;
  for (const mc of mlist) {
    if (!mc.isDirectory()) continue;
    const mdir = join(up, mc.name);
    const files = rd(mdir);
    if (!files) continue;
    machines++;
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith(".nc")) continue;
      totalAll++;
      const ms = mt(join(mdir, f.name));
      if (ms > cutoff) {
        totalRecent++;
        perMachine.set(mc.name, (perMachine.get(mc.name) || 0) + 1);
        if (ms > mostRecent) mostRecent = ms;
      }
    }
  }
}
process.stdout.write(JSON.stringify({
  asOf: new Date().toISOString(),
  windowLabel: argIdx >= 0 ? process.argv[argIdx + 1] : "12h",
  totalAll, totalRecent, customersWithUpgraded: customers, machineDirs: machines,
  mostRecentIso: mostRecent ? new Date(mostRecent).toISOString() : null,
  perMachine: Object.fromEntries(perMachine),
}, null, 2) + "\n");
