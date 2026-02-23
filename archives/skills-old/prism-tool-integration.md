# PRISM Tool Integration Skill v1.0
## Unified Workspace: Excel + DuckDB + Obsidian + Google Drive
## Level 2 Workflow Skill | Triggers: "tools", "integrate", "sync", "query", "excel"

---

# 1. OVERVIEW

## 1.1 The Integrated Ecosystem

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   EXCEL     │───►│    JSON     │───►│   DUCKDB    │───►│   CLAUDE    │
│ (Bulk Edit) │    │  (Storage)  │    │  (Queries)  │    │   (Dev)     │
└─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘
                         │
                         ▼
                  ┌─────────────┐    ┌─────────────┐
                  │  OBSIDIAN   │    │   GOOGLE    │
                  │ (Knowledge) │    │   DRIVE     │
                  └─────────────┘    │  (Backup)   │
                                     └─────────────┘
```

## 1.2 Tool Responsibilities

| Tool | Primary Use | PRISM Application |
|------|-------------|-------------------|
| **Excel** | Bulk data entry with validation | Materials, Machines, Alarms databases |
| **DuckDB** | SQL queries, cross-reference | Gap analysis, complex queries |
| **Obsidian** | Linked notes, knowledge graph | Skills, materials, courses |
| **Google Drive** | Cloud backup, sharing | Disaster recovery, remote access |

---

# 2. QUICK COMMANDS

## 2.1 Master Sync (Run Daily)

```powershell
# Full pipeline: Excel → JSON → DuckDB → Obsidian → Drive
py -3 C:\PRISM\scripts\integration\master_sync.py

# Skip Drive sync (faster)
py -3 C:\PRISM\scripts\integration\master_sync.py --skip-drive

# Only specific steps
py -3 C:\PRISM\scripts\integration\master_sync.py --only excel,duckdb
```

## 2.2 Individual Tools

```powershell
# Convert Excel to JSON
py -3 C:\PRISM\scripts\integration\excel_to_json.py

# Load JSON into DuckDB
py -3 C:\PRISM\scripts\integration\json_to_duckdb.py

# Generate Obsidian notes
py -3 C:\PRISM\scripts\integration\obsidian_generator.py

# Sync to Google Drive
py -3 C:\PRISM\scripts\integration\sync_to_drive.py --full
```

## 2.3 DuckDB Queries

```powershell
# Interactive SQL shell
py -3 C:\PRISM\scripts\integration\json_to_duckdb.py --interactive

# Single query
py -3 C:\PRISM\scripts\integration\json_to_duckdb.py --query "SELECT * FROM materials LIMIT 10"

# Common queries
duckdb C:\PRISM\data\databases\PRISM.duckdb
> SELECT * FROM materials_gaps;
> SELECT * FROM alarms_by_family;
> SELECT * FROM materials_by_category;
```

---

# 3. FOLDER STRUCTURE

```
C:\PRISM\
├── data\
│   └── databases\
│       ├── *.xlsx              # Excel source files
│       ├── *.json              # JSON exports
│       └── PRISM.duckdb        # SQL database
│
├── knowledge\                  # Obsidian vault
│   ├── Skills\                 # Auto-generated skill notes
│   ├── Materials\              # Auto-generated material notes
│   └── Sessions\               # Session logs
│
├── scripts\
│   └── integration\
│       ├── excel_to_json.py
│       ├── json_to_duckdb.py
│       ├── obsidian_generator.py
│       ├── sync_to_drive.py
│       └── master_sync.py
│
└── diagrams\                   # Draw.io files (manual)
```

---

# 4. EXCEL WORKFLOW

## 4.1 Creating Database Spreadsheets

When creating Excel files for PRISM databases:

### Materials Template

| material_id | name | iso_group | category | density | kc1_1 | mc | n_taylor |
|-------------|------|-----------|----------|---------|-------|-----|----------|
| CS-001 | AISI 1010 | P | Carbon Steel | 7850 | 1800 | 0.25 | 0.28 |

### Alarms Template

| alarm_id | code | family | category | severity | description | causes |
|----------|------|--------|----------|----------|-------------|--------|
| ALM-FAN-001 | 001 | FANUC | SERVO | CRITICAL | ... | ... |

## 4.2 Best Practices

```
DO:
✓ Save frequently (every 5-10 entries)
✓ Use data validation for dropdowns
✓ Use conditional formatting for gaps
✓ Keep Excel and JSON in sync (run excel_to_json.py)

DON'T:
✗ Leave required fields empty
✗ Edit exported JSON directly (edit Excel instead)
✗ Mix units (always use SI)
```

---

# 5. DUCKDB QUERIES

## 5.1 Pre-built Views

| View | Purpose |
|------|---------|
| `materials_complete` | Materials with all Kienzle params |
| `materials_gaps` | Materials missing critical data |
| `materials_by_category` | Count by ISO group |
| `alarms_by_family` | Alarm count by controller |
| `alarms_severity_summary` | Severity breakdown |

## 5.2 Useful Queries

```sql
-- Find materials missing kc1.1
SELECT name, iso_group FROM materials WHERE kc1_1 IS NULL;

-- Cross-reference materials and machines
SELECT m.name, mc.model 
FROM materials m, machines mc 
WHERE m.iso_group = 'S';

-- Alarm coverage by family
SELECT family, COUNT(*) as total,
       SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as documented
FROM alarms GROUP BY family;
```

---

# 6. OBSIDIAN KNOWLEDGE GRAPH

## 6.1 Auto-Generated Notes

The obsidian_generator.py creates:
- **Skills/**: One note per skill with metadata and links
- **Materials/**: One note per material with properties
- **Sessions/**: Session summaries from CURRENT_STATE.json

## 6.2 Using the Knowledge Graph

1. Open Obsidian
2. File → Open folder as vault → `C:\PRISM\knowledge`
3. Use Graph View to see connections
4. Use search to find related concepts

## 6.3 Recommended Plugins

- **Dataview**: Query notes like a database
- **Graph Analysis**: Find clusters
- **Templater**: Auto-generate notes

---

# 7. DAILY WORKFLOW

## 7.1 Morning

```
1. Claude reads CURRENT_STATE.json
2. Open Obsidian for context if needed
```

## 7.2 During Work

```
3. Edit databases in Excel as needed
4. Query DuckDB for analysis
5. Document insights in Obsidian
```

## 7.3 End of Day

```
6. Update CURRENT_STATE.json
7. Run: py -3 C:\PRISM\scripts\integration\master_sync.py
8. Everything syncs to Drive automatically
```

---

# 8. TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| "duckdb not found" | `pip install duckdb` |
| "pandas not found" | `pip install pandas openpyxl` |
| Excel conversion fails | Close Excel file first |
| Obsidian notes empty | Run `obsidian_generator.py` |
| Drive sync fails | Check Google Drive app is running |

---

# 9. SKILL METADATA

```yaml
skill_id: prism-tool-integration
version: 1.0.0
level: L2_WORKFLOW
category: DEVELOPMENT
priority: MEDIUM

triggers:
  keywords:
    - "excel", "spreadsheet", "xlsx"
    - "duckdb", "sql", "query"
    - "obsidian", "knowledge", "notes"
    - "sync", "drive", "backup"
    - "tools", "integrate"
  
  contexts:
    - Managing large datasets (materials, machines, alarms)
    - Running SQL queries for analysis
    - Building knowledge graphs
    - Daily backup workflows

activation_rule: |
  IF (task involves bulk data entry)
  OR (task involves SQL queries)
  OR (task involves knowledge organization)
  OR (task involves backup/sync)
  THEN activate prism-tool-integration
```

---

*Part of PRISM Manufacturing Intelligence v9.0*
*Created: 2026-01-30*
