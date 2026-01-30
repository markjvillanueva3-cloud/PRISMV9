# PRISM Development Toolkit
## Comprehensive Tools for Manufacturing Intelligence Development

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run master CLI
python prism_devtools.py status

# Quick analysis
python analysis/quick_analysis.py materials.json

# Interactive SQL
python analysis/duckdb_helper.py materials.json
```

---

## Tools Included

| Tool | Command | Purpose |
|------|---------|---------|
| **Gap Analysis** | `python prism_devtools.py gap materials <file>` | Find missing data |
| **Excel Templates** | `python prism_devtools.py excel template <output>` | Bulk data entry |
| **SQL Queries** | `python prism_devtools.py query run <file> "<sql>"` | DuckDB queries |
| **Validation** | `python prism_devtools.py validate material <file>` | Check completeness |
| **Diagrams** | `python prism_devtools.py diagram architecture <out>` | Mermaid diagrams |

---

## DuckDB Pre-built Queries

```bash
# Summary statistics
python analysis/duckdb_helper.py materials.json summary

# Find gaps in kc1.1
python analysis/duckdb_helper.py materials.json gaps_kc11

# Category breakdown
python analysis/duckdb_helper.py materials.json by_category

# Completeness ranking
python analysis/duckdb_helper.py materials.json completeness

# Custom SQL
python analysis/duckdb_helper.py materials.json "SELECT * FROM data WHERE hardness > 300"
```

---

## Excel Bulk Editing

```bash
# Generate template with dropdowns
python prism_devtools.py excel template materials.xlsx --type materials
python prism_devtools.py excel template machines.xlsx --type machines

# Import filled Excel back to JSON
python prism_devtools.py excel import filled.xlsx output.json
```

---

## Directory Structure

```
C:\PRISM\devtools\
├── prism_devtools.py      # Master CLI
├── requirements.txt       # Dependencies
├── README.md              # This file
│
├── analysis/
│   ├── quick_analysis.py  # Instant insights
│   └── duckdb_helper.py   # SQL queries
│
└── schemas/
    └── material_schema.json  # 127-parameter validation
```

---

## Installed Python Packages

- **pandas** - Data manipulation
- **duckdb** - SQL on JSON/CSV
- **openpyxl/xlsxwriter** - Excel read/write
- **jsonschema** - JSON validation
- **rich** - Beautiful terminal output
- **typer** - CLI framework
- **matplotlib/seaborn** - Visualization
- **networkx** - Graph analysis

---

## Common Workflows

### 1. Find Data Gaps
```bash
python analysis/quick_analysis.py materials.json
```

### 2. Bulk Edit in Excel
```bash
python prism_devtools.py excel template edit.xlsx
# Edit in Excel...
python prism_devtools.py excel import edit.xlsx updated.json
```

### 3. Validate Before Commit
```bash
python prism_devtools.py validate material updated.json
```

---

**PRISM Manufacturing Intelligence**
*Tools that save lives.*
