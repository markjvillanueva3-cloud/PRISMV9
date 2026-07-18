# Proposed Patch — `H:/PRISM/.claude/helpers/svi-refresh.mjs`

**Generated:** 2026-06-22T17:18:27Z  ·  **Status:** PROPOSAL (not applied)
**Basis:** `svi-deep-recount-report.md` (same run)  ·  **Supersedes:** prior patch draft

---

## PATCH 1 — `WIRED_PCT` (lines ~62–80)

Two values are wrong by import-graph measurement; the rest are kept (not verifiable from the static graph). Comments refreshed to live counts.

```diff
 const WIRED_PCT = {
   materials: 95,
   tools: 98,
   machines: 95,
   tribal_tips: 80,
   handbooks: 78,
   formulas: 95,
   algorithms: 85,
   strategies: 90,
-  engines: 88,        // 1,738 engine refs in 79 dispatchers; ~88% of 1,266 files actively dispatched;
-                      //   remaining 12% are sub-engines called by wired engines (not orphaned)
+  engines: 95,        // 3,488 unique engines imported by dispatchers / 3,651 files = 95.5%;
+                      //   99.97% (3,650/3,651) have ≥1 import edge anywhere in src/ (recount 2026-06-22)
-  dispatchers: 98,    // all 79 dispatchers registered, schema-validated, and active
+  dispatchers: 95,    // 102 of 107 dispatcher files imported by src/index.ts (MCP reg hub) = 95.3%
+                      //   (routes/ does NOT import dispatchers; index.ts is the wiring point) (2026-06-22)
-  actions: 96,        // 4,206 actions; 96% reachable with valid schemas and test coverage
+  actions: 96,        // 10,307 actions (z.enum across dispatchers); all inside 102 registered
+                      //   dispatchers → 96% reachable retained (2026-06-22)
   pipelines: 100,
   dialects: 95,
   tests: 100,         // live 4,696 test files wired to vitest runner (was commented 886)
+
+  // --- new subsystems (recount 2026-06-22) ---
+  web_pages: 76,      // 121 of 159 web/src/pages call backend (fetch / /api/ / prism_)
+  registries: 96,     // 26 src/registries/*.ts, all imported by engines/dispatchers
+  cad_engine: 70,     // 185 cad-engine source .py (excl venv); ~70% reachable via prism_cad
+  skills: 88,         // 751 .claude/commands/*.md automation surfaces
 };
```

## PATCH 2 — `DIMS` (lines ~33–48): add 4 entries

```diff
   pipelines: 50,
   dialects: 38,
   tests: 3,
+  web_pages: 2,
+  registries: 3,
+  cad_engine: 3,
+  skills: 2,
 };
```

## PATCH 3 — `CATEGORY` (lines ~89–104): add 4 entries

```diff
   pipelines: "output",
   dialects: "output",
   tests: "intelligence",
+  web_pages: "output",
+  registries: "data",
+  cad_engine: "pipeline",
+  skills: "intelligence",
 };
```

## PATCH 4 — `DISPLAY_NAMES`: add 4 entries

```diff
   pipelines: "Pipelines",
   dialects: "Dialects",
   tests: "Tests",
+  web_pages: "Web Pages",
+  registries: "Registries",
+  cad_engine: "CAD Engine",
+  skills: "Skills",
 };
```

## PATCH 5 — `SUBSYSTEM_ORDER` (lines ~150–155)

```diff
 const SUBSYSTEM_ORDER = [
   "materials", "tools", "machines", "tribal_tips", "handbooks",
   "formulas", "algorithms", "strategies",
   "engines", "dispatchers", "actions",
+  "registries", "cad_engine",
   "pipelines", "dialects", "tests",
+  "web_pages", "skills",
 ];
```

## PATCH 6 — `gatherCounts()`: add 4 live counters

```diff
     pipelines: 9,
     dialects: 20,
     tests: countTests(),
+    web_pages: countWebPages(),
+    registries: countRegistries(),
+    cad_engine: countCadEngine(),
+    skills: countSkills(),
   };
 }
```

…with these new counting functions (place near the other `count*()` fns):

```js
function countWebPages() {
  const dir = path.join(MCP, "web", "src", "pages");
  try {
    if (!existsSync(dir)) return 159;
    const walk = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) return n + walk(fp);
      return n + (/\.(tsx|jsx)$/.test(e.name) ? 1 : 0);
    }, 0);
    return Math.max(walk(dir), 1);
  } catch { return 159; }
}

function countRegistries() {
  const dir = path.join(MCP, "src", "registries");
  return countTsFiles(dir, /Registry\.ts$/, /\.test\.ts$/) || 26;
}

function countCadEngine() {
  const dir = path.join("H:\\prism", "cad-engine");
  try {
    if (!existsSync(dir)) return 185;
    const SKIP = /venv|site-packages|__pycache__|dist-info|node_modules/;
    const walk = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => {
      const fp = path.join(d, e.name);
      if (SKIP.test(fp)) return n;
      if (e.isDirectory()) return n + walk(fp);
      return n + (e.name.endsWith(".py") ? 1 : 0);
    }, 0);
    return Math.max(walk(dir), 1);
  } catch { return 185; }
}

function countSkills() {
  const dir = path.join("H:\\prism", ".claude", "commands");
  try {
    if (!existsSync(dir)) return 751;
    return readdirSync(dir).filter((f) => f.endsWith(".md")).length || 751;
  } catch { return 751; }
}
```

## PATCH 7 (recommended) — dual Psi in `computeSVI()`

Surface an un-weighted per-subsystem mean alongside the entity-weighted Psi, so under-wired surfaces (CAD 70%, web 76%) stop hiding behind `tools` (93.5% of variability).

```diff
   const psi = total_variability > 0 ? total_reachable / total_variability : 0;
+
+  // Un-weighted: each subsystem contributes equally (surfaces weak surfaces)
+  const active = subsystems.filter((s) => s.variability > 0);
+  const psi_subsystem = active.length
+    ? active.reduce((sum, s) => sum + s.wired_pct / 100, 0) / active.length
+    : 0;

   return {
     svi_log10: Math.round(svi_log10 * 100) / 100,
     psi,
+    psi_subsystem: Math.round(psi_subsystem * 1000) / 1000,
     total_variability,
     total_reachable,
   };
```
(then add `psi_subsystem` to `buildReport()` output and the compact markdown.)

## PATCH 8 (optional) — fix `countMaterials()` undercount

`data/materials/` holds only 6 ISO-group files (sums to 9 entities); canonical ≈ 2,957 lives in `MaterialRegistry.ts`. At minimum, raise the floor so the count is not absurdly low:

```diff
 function countMaterials() {
   const count = countJsonDir(path.join(MCP, "data", "materials"));
-  return count || 3;
+  // data/materials holds only ISO-group summary files (≈9 entities);
+  // canonical grade count lives in MaterialRegistry.ts (~2,957). Use registry floor.
+  return Math.max(count, 2957);
 }
```
*(Even at 2,957 × 8 dims = 23,656 var, materials is ~2.3% of total — Psi impact <0.3 pp. Cosmetic, but correct.)*

---

## Expected effect after applying PATCH 1–6

| Metric | Before | After |
|--------|-------:|------:|
| Ψ (entity-weighted) | 97.66% | ~97.70% |
| Ψ_subsystem (if PATCH 7) | n/a | ~90.4% |
| Subsystem count | 14 | 18 |
| Total variability | 1,022,554 | 1,025,007 |

**Do NOT add** quality (48) / business (211) / learning (126) engine subsets as subsystems — they are already inside `engines`=3,651 and would double-count.

## Apply

No source files were modified by this run. To apply: hand-edit `svi-refresh.mjs` per PATCH 1–6 (+7/8 optional), then `node H:/prism/.claude/helpers/svi-refresh.mjs` and confirm `SVI.json` / `SVI-compact.md` regenerate with the 18-subsystem set.
