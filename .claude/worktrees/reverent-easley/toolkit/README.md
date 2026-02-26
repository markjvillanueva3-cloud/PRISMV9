# PRISM Development Toolkit v1.0

Comprehensive utilities for PRISM Manufacturing Intelligence development.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Or install individually
pip install duckdb pandas rich openpyxl
```

## Tools Overview

| Tool | Purpose | Command |
|------|---------|---------|
| **Gap Analysis** | Find missing data in materials/machines | `python prism_dev_toolkit.py gaps <dir>` |
| **Excel Export** | Bulk edit data with validation | `python prism_dev_toolkit.py excel <dir> <out.xlsx>` |
| **SQL Shell** | Query JSON data with SQL | `python prism_dev_toolkit.py sql <dir>` |
| **Obsidian Vault** | Generate linked markdown knowledge base | `python prism_dev_toolkit.py obsidian <dir> <out>` |
| **Mermaid Diagrams** | Generate architecture diagrams | `python prism_dev_toolkit.py mermaid architecture` |
| **Statistics** | Show data statistics | `python prism_dev_toolkit.py stats <dir>` |

## Quick Queries

Pre-built queries for common data analysis tasks:

```bash
python quick_queries.py missing_kc1_1 <json_dir>    # Materials without Kienzle
python quick_queries.py incomplete <json_dir>       # Missing critical fields
python quick_queries.py categories <json_dir>       # Count by ISO 513
python quick_queries.py hardness <json_dir>         # Hardness distribution
python quick_queries.py duplicates <json_dir>       # Find duplicate IDs
```

## SQL Examples

The SQL shell loads all JSON files as tables:

```sql
-- Find materials missing physics data
SELECT id, name FROM materials WHERE kc1_1 IS NULL;

-- Count by category
SELECT category, COUNT(*) as count 
FROM materials GROUP BY category ORDER BY count DESC;

-- High hardness materials
SELECT id, name, hardness_brinell 
FROM materials WHERE hardness_brinell > 400;

-- Materials with complete Kienzle data
SELECT id, name, kc1_1, mc 
FROM materials WHERE kc1_1 IS NOT NULL AND mc IS NOT NULL;
```

## Mermaid Diagram Types

```bash
python prism_dev_toolkit.py mermaid architecture   # System architecture
python prism_dev_toolkit.py mermaid materials      # Material schema
python prism_dev_toolkit.py mermaid skills         # Skill hierarchy
```

## Excel Export Features

The Excel export includes:
- **Materials sheet**: All materials with all fields
- **Gap Analysis sheet**: Completion % for each material
- **Field Reference sheet**: Field descriptions and requirements

## Obsidian Vault

Generates an Obsidian-compatible vault with:
- Linked skill notes
- Linked material notes
- Category indexes
- Cross-references with `[[wiki links]]`

## External Tools Integration

| Tool | How to Use |
|------|------------|
| **Excel** | Export data, edit in Excel, import back |
| **DuckDB** | SQL queries on JSON files directly |
| **Obsidian** | Open generated vault for visual graph |
| **Draw.io** | Use Mermaid or export to Draw.io XML |
| **Mermaid** | Copy to GitHub/Obsidian for rendering |

## File Structure

```
C:\PRISM\toolkit\
├── prism_dev_toolkit.py    # Main toolkit
├── quick_queries.py        # Pre-built queries
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Python Dependencies Installed

- **duckdb** - SQL on JSON files
- **pandas** - Data manipulation
- **rich** - Beautiful terminal output
- **openpyxl** - Excel read/write
- **matplotlib** - Charts and visualization
- **networkx** - Graph analysis
- **jsonschema** - Schema validation
- **pydantic** - Data validation

---

**PRISM Manufacturing Intelligence v9.0**
