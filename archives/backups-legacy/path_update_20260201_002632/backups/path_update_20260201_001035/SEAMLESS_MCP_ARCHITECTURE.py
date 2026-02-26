"""
PRISM MCP SERVER - SEAMLESS ARCHITECTURE DESIGN
Auto-discovers databases, hot-reloads on changes, zero code changes for additions
"""

# ============================================================================
# ARCHITECTURE OVERVIEW
# ============================================================================
"""
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRISM MCP SERVER ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     DATA LAYER (Auto-Discovery)                      │   │
│  │                                                                      │   │
│  │  /data/materials/*.json  ─┬─► MaterialRegistry ─► prism_material_*  │   │
│  │  /data/machines/*.json   ─┼─► MachineRegistry  ─► prism_machine_*   │   │
│  │  /data/tools/*.json      ─┼─► ToolRegistry     ─► prism_tool_*      │   │
│  │  /data/alarms/*.json     ─┼─► AlarmRegistry    ─► prism_alarm_*     │   │
│  │  /data/fixtures/*.json   ─┼─► FixtureRegistry  ─► prism_fixture_*   │   │
│  │  /data/posts/*.json      ─┼─► PostRegistry     ─► prism_post_*      │   │
│  │  /data/formulas/*.json   ─┼─► FormulaRegistry  ─► prism_formula_*   │   │
│  │  /skills/**/*.md         ─┴─► SkillRegistry    ─► prism_skill_*     │   │
│  │                                                                      │   │
│  │  FileWatcher ─► on_change() ─► rebuild_index() ─► notify_clients()  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     INDEX LAYER (Fast Lookups)                       │   │
│  │                                                                      │   │
│  │  materials_by_name:     {"1018": [...], "4140": [...], ...}         │   │
│  │  materials_by_iso:      {"P": [...], "M": [...], ...}               │   │
│  │  materials_by_hardness: {"<200": [...], "200-300": [...], ...}      │   │
│  │                                                                      │   │
│  │  machines_by_mfg:       {"DMG": [...], "Mazak": [...], ...}         │   │
│  │  machines_by_type:      {"VMC": [...], "HMC": [...], ...}           │   │
│  │                                                                      │   │
│  │  alarms_by_controller:  {"FANUC": [...], "SIEMENS": [...], ...}     │   │
│  │  alarms_by_code:        {"1001": [...], "2001": [...], ...}         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     TOOL LAYER (MCP Interface)                       │   │
│  │                                                                      │   │
│  │  Generic handlers that read from registries - NO hardcoded data     │   │
│  │                                                                      │   │
│  │  prism_query(registry, filters) → results                           │   │
│  │  prism_calculate(formula_id, params) → result                       │   │
│  │  prism_search(registry, query) → matches                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

HOW ADDITIONS WORK:

1. ADD NEW MATERIAL:
   - Create: /data/materials/superalloys/inconel-718.json
   - FileWatcher detects new file
   - MaterialRegistry.reload() called
   - Index rebuilt with new material
   - prism_material_query("inconel 718") → works immediately

2. ADD NEW ALARM CODES:
   - Update: /data/alarms/FANUC_ALARMS.json (add new entries)
   - FileWatcher detects modification
   - AlarmRegistry.reload() called
   - prism_alarm_decode("FANUC", "9999") → works immediately

3. ADD NEW SKILL:
   - Create: /skills/user/prism-new-skill/SKILL.md
   - FileWatcher detects new directory
   - SkillRegistry.reload() called
   - prism_skill_load("prism-new-skill") → works immediately

ZERO CODE CHANGES REQUIRED FOR ANY DATA ADDITION
"""

# ============================================================================
# DATA DIRECTORY STRUCTURE
# ============================================================================
DATA_STRUCTURE = """
C:\\PRISM\\mcp-server\\
├── data/
│   ├── materials/
│   │   ├── _schema.json           # Material schema (127 params)
│   │   ├── _index.json            # Auto-generated index
│   │   ├── steels/
│   │   │   ├── carbon/*.json
│   │   │   ├── alloy/*.json
│   │   │   └── tool/*.json
│   │   ├── stainless/*.json
│   │   ├── aluminum/*.json
│   │   ├── superalloys/*.json
│   │   └── ...
│   │
│   ├── machines/
│   │   ├── _schema.json           # Machine schema
│   │   ├── _index.json            # Auto-generated index
│   │   ├── dmg/*.json
│   │   ├── mazak/*.json
│   │   ├── haas/*.json
│   │   └── ...
│   │
│   ├── alarms/
│   │   ├── _schema.json           # Alarm schema
│   │   ├── _index.json            # Auto-generated index
│   │   ├── FANUC_ALARMS.json
│   │   ├── SIEMENS_ALARMS.json
│   │   ├── HAAS_ALARMS.json
│   │   └── ...
│   │
│   ├── tools/
│   │   ├── _schema.json
│   │   ├── endmills/*.json
│   │   ├── drills/*.json
│   │   ├── inserts/*.json
│   │   └── holders/*.json
│   │
│   ├── fixtures/
│   │   ├── _schema.json
│   │   ├── vises/*.json
│   │   ├── chucks/*.json
│   │   └── clamps/*.json
│   │
│   ├── formulas/
│   │   ├── _schema.json
│   │   ├── cutting/*.json         # Kienzle, Merchant, etc.
│   │   ├── thermal/*.json
│   │   ├── tool_life/*.json
│   │   └── optimization/*.json
│   │
│   ├── posts/
│   │   ├── _schema.json
│   │   ├── fanuc/*.json
│   │   ├── siemens/*.json
│   │   └── ...
│   │
│   └── gcodes/
│       ├── _schema.json
│       ├── fanuc_gcodes.json
│       ├── siemens_gcodes.json
│       └── ...
│
├── skills/                        # Symlink to C:\\PRISM\\skills-consolidated
│
├── modules/                       # Symlink to C:\\PRISM\\extracted_modules
│
└── src/
    ├── index.ts                   # MCP server entry
    ├── registries/
    │   ├── base-registry.ts       # Abstract registry with file watching
    │   ├── material-registry.ts
    │   ├── machine-registry.ts
    │   ├── alarm-registry.ts
    │   ├── tool-registry.ts
    │   ├── fixture-registry.ts
    │   ├── formula-registry.ts
    │   ├── skill-registry.ts
    │   └── module-registry.ts
    │
    ├── tools/
    │   ├── query-tools.ts         # Generic query handlers
    │   ├── calc-tools.ts          # Calculation tools
    │   ├── search-tools.ts        # Full-text search
    │   └── session-tools.ts       # State management
    │
    └── utils/
        ├── file-watcher.ts        # Watch for changes
        ├── index-builder.ts       # Build search indexes
        └── schema-validator.ts    # Validate against schemas
"""

# ============================================================================
# BASE REGISTRY CLASS (TypeScript pseudo-code)
# ============================================================================
BASE_REGISTRY_CODE = '''
// base-registry.ts
import { watch } from 'chokidar';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export abstract class BaseRegistry<T> {
  protected data: Map<string, T> = new Map();
  protected indexes: Map<string, Map<string, string[]>> = new Map();
  protected schemaPath: string;
  protected dataPath: string;
  protected watcher: any;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.schemaPath = join(dataPath, '_schema.json');
    this.loadAll();
    this.setupWatcher();
  }

  // Load all JSON files from directory tree
  private loadAll(): void {
    this.data.clear();
    this.walkDir(this.dataPath, (filePath) => {
      if (filePath.endsWith('.json') && !filePath.includes('_schema') && !filePath.includes('_index')) {
        const content = JSON.parse(readFileSync(filePath, 'utf-8'));
        this.processFile(filePath, content);
      }
    });
    this.rebuildIndexes();
    console.log(`[${this.constructor.name}] Loaded ${this.data.size} items`);
  }

  // Watch for file changes - auto reload
  private setupWatcher(): void {
    this.watcher = watch(this.dataPath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('add', (path: string) => {
      console.log(`[${this.constructor.name}] New file: ${path}`);
      this.loadAll();
    });

    this.watcher.on('change', (path: string) => {
      console.log(`[${this.constructor.name}] File changed: ${path}`);
      this.loadAll();
    });

    this.watcher.on('unlink', (path: string) => {
      console.log(`[${this.constructor.name}] File removed: ${path}`);
      this.loadAll();
    });
  }

  // Abstract methods - implemented by each registry
  protected abstract processFile(filePath: string, content: any): void;
  protected abstract rebuildIndexes(): void;
  protected abstract getIndexFields(): string[];

  // Generic query method
  query(filters: Record<string, any>): T[] {
    let results = Array.from(this.data.values());
    
    for (const [field, value] of Object.entries(filters)) {
      if (this.indexes.has(field)) {
        // Use index for fast lookup
        const index = this.indexes.get(field)!;
        const ids = index.get(String(value).toLowerCase()) || [];
        results = results.filter(item => ids.includes((item as any).id));
      } else {
        // Fall back to linear search
        results = results.filter(item => 
          String((item as any)[field]).toLowerCase().includes(String(value).toLowerCase())
        );
      }
    }
    
    return results;
  }

  // Full-text search
  search(query: string): T[] {
    const terms = query.toLowerCase().split(/\s+/);
    return Array.from(this.data.values()).filter(item => {
      const text = JSON.stringify(item).toLowerCase();
      return terms.every(term => text.includes(term));
    });
  }

  // Get by ID
  get(id: string): T | undefined {
    return this.data.get(id);
  }

  // Get all
  getAll(): T[] {
    return Array.from(this.data.values());
  }

  // Get count
  count(): number {
    return this.data.size;
  }

  // Force reload
  reload(): void {
    this.loadAll();
  }
}
'''

# ============================================================================
# MATERIAL REGISTRY EXAMPLE
# ============================================================================
MATERIAL_REGISTRY_CODE = '''
// material-registry.ts
import { BaseRegistry } from './base-registry';

interface Material {
  id: string;
  name: string;
  grade: string;
  iso_class: string;  // P, M, K, N, S, H
  hardness_hb: number;
  tensile_strength_mpa: number;
  // ... 127 parameters
  kc1_1: number;      // Kienzle specific cutting force
  mc: number;         // Kienzle exponent
  n_taylor: number;   // Taylor exponent
  // ...
}

export class MaterialRegistry extends BaseRegistry<Material> {
  constructor() {
    super('C:/PRISM/mcp-server/data/materials');
  }

  protected processFile(filePath: string, content: any): void {
    // Handle single material or array of materials
    const materials = Array.isArray(content) ? content : [content];
    for (const mat of materials) {
      if (mat.id) {
        this.data.set(mat.id, mat);
      }
    }
  }

  protected getIndexFields(): string[] {
    return ['name', 'grade', 'iso_class', 'category'];
  }

  protected rebuildIndexes(): void {
    this.indexes.clear();
    
    // Index by ISO class
    const isoIndex = new Map<string, string[]>();
    // Index by name
    const nameIndex = new Map<string, string[]>();
    // Index by hardness range
    const hardnessIndex = new Map<string, string[]>();
    
    for (const [id, mat] of this.data) {
      // ISO class index
      const iso = mat.iso_class?.toLowerCase() || 'unknown';
      if (!isoIndex.has(iso)) isoIndex.set(iso, []);
      isoIndex.get(iso)!.push(id);
      
      // Name index (tokenized)
      const nameTokens = mat.name?.toLowerCase().split(/[\s-_]+/) || [];
      for (const token of nameTokens) {
        if (!nameIndex.has(token)) nameIndex.set(token, []);
        nameIndex.get(token)!.push(id);
      }
      
      // Hardness range index
      const hb = mat.hardness_hb || 0;
      const range = hb < 200 ? '<200' : hb < 300 ? '200-300' : hb < 400 ? '300-400' : '>400';
      if (!hardnessIndex.has(range)) hardnessIndex.set(range, []);
      hardnessIndex.get(range)!.push(id);
    }
    
    this.indexes.set('iso_class', isoIndex);
    this.indexes.set('name', nameIndex);
    this.indexes.set('hardness_range', hardnessIndex);
  }

  // Convenience methods
  getByISO(isoClass: string): Material[] {
    return this.query({ iso_class: isoClass });
  }

  getByHardnessRange(min: number, max: number): Material[] {
    return Array.from(this.data.values()).filter(m => 
      m.hardness_hb >= min && m.hardness_hb <= max
    );
  }

  getCuttingParams(id: string): { kc1_1: number; mc: number } | null {
    const mat = this.get(id);
    return mat ? { kc1_1: mat.kc1_1, mc: mat.mc } : null;
  }
}
'''

# ============================================================================
# MCP TOOL DEFINITIONS (Generic)
# ============================================================================
MCP_TOOLS_CODE = '''
// tools/query-tools.ts
import { MaterialRegistry } from '../registries/material-registry';
import { MachineRegistry } from '../registries/machine-registry';
import { AlarmRegistry } from '../registries/alarm-registry';
// ... other registries

// Global registry instances - loaded once, auto-refresh on file changes
const registries = {
  materials: new MaterialRegistry(),
  machines: new MachineRegistry(),
  alarms: new AlarmRegistry(),
  tools: new ToolRegistry(),
  fixtures: new FixtureRegistry(),
  formulas: new FormulaRegistry(),
  skills: new SkillRegistry(),
  modules: new ModuleRegistry(),
};

// Generic query tool - works with ANY registry
export const prism_query = {
  name: 'prism_query',
  description: 'Query any PRISM database (materials, machines, tools, alarms, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      registry: {
        type: 'string',
        enum: Object.keys(registries),
        description: 'Which database to query'
      },
      filters: {
        type: 'object',
        description: 'Filter criteria (field: value pairs)'
      },
      limit: {
        type: 'number',
        default: 10
      }
    },
    required: ['registry']
  },
  handler: async ({ registry, filters = {}, limit = 10 }) => {
    const reg = registries[registry];
    if (!reg) return { error: `Unknown registry: ${registry}` };
    
    const results = reg.query(filters).slice(0, limit);
    return {
      count: results.length,
      total: reg.count(),
      results
    };
  }
};

// Search tool - full text search across any registry
export const prism_search = {
  name: 'prism_search',
  description: 'Full-text search across any PRISM database',
  inputSchema: {
    type: 'object',
    properties: {
      registry: { type: 'string', enum: Object.keys(registries) },
      query: { type: 'string', description: 'Search terms' },
      limit: { type: 'number', default: 10 }
    },
    required: ['registry', 'query']
  },
  handler: async ({ registry, query, limit = 10 }) => {
    const reg = registries[registry];
    if (!reg) return { error: `Unknown registry: ${registry}` };
    
    const results = reg.search(query).slice(0, limit);
    return { count: results.length, results };
  }
};

// Stats tool - get registry statistics
export const prism_stats = {
  name: 'prism_stats',
  description: 'Get statistics about PRISM databases',
  handler: async () => {
    const stats = {};
    for (const [name, reg] of Object.entries(registries)) {
      stats[name] = { count: reg.count() };
    }
    return stats;
  }
};
'''

# ============================================================================
# ADDITION WORKFLOW
# ============================================================================
ADDITION_WORKFLOW = """
# HOW TO ADD NEW DATA (Zero Code Changes)

## Add New Material
1. Create JSON file following schema:
   C:\\PRISM\\mcp-server\\data\\materials\\superalloys\\inconel-718.json
   
   {
     "id": "MAT-SA-001",
     "name": "Inconel 718",
     "grade": "AMS 5662",
     "iso_class": "S",
     "hardness_hb": 363,
     "tensile_strength_mpa": 1240,
     "kc1_1": 2800,
     "mc": 0.25,
     ...
   }

2. File watcher detects new file
3. MaterialRegistry.reload() runs automatically
4. New material immediately available via:
   prism_query({registry: "materials", filters: {name: "inconel"}})

## Add New Machine
1. Create JSON file:
   C:\\PRISM\\mcp-server\\data\\machines\\dmg\\dmu-50.json

2. Auto-discovered and indexed

## Add New Alarm Codes
1. Add entries to existing file OR create new file:
   C:\\PRISM\\mcp-server\\data\\alarms\\FANUC_ALARMS.json
   
   (add new entries to array)

2. Auto-reloaded on save

## Add New Skill
1. Create skill directory:
   C:\\PRISM\\skills-consolidated\\prism-new-skill\\SKILL.md

2. SkillRegistry detects new directory
3. prism_skill_load("prism-new-skill") works immediately

## Add New Formula
1. Create JSON file:
   C:\\PRISM\\mcp-server\\data\\formulas\\cutting\\new-formula.json
   
   {
     "id": "FORM-CUT-999",
     "name": "New Cutting Formula",
     "domain": "cutting",
     "equation": "result = a * x^b + c",
     "parameters": ["a", "b", "c", "x"],
     "units": {...}
   }

2. Auto-discovered
3. prism_formula_calc("FORM-CUT-999", {a: 1, b: 2, c: 3, x: 10}) works
"""

print("=" * 80)
print("SEAMLESS MCP ARCHITECTURE DESIGN COMPLETE")
print("=" * 80)
print(DATA_STRUCTURE)
print("\n" + "=" * 80)
print("ADDITION WORKFLOW")
print("=" * 80)
print(ADDITION_WORKFLOW)
