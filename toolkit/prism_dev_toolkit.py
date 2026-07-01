#!/usr/bin/env python3
"""
PRISM Development Toolkit v1.0
Comprehensive utilities for PRISM Manufacturing Intelligence development.

Usage:
    python prism_dev_toolkit.py gaps <json_dir>           # Find missing data
    python prism_dev_toolkit.py excel <json_dir> <out>    # Export to Excel
    python prism_dev_toolkit.py sql <json_dir>            # Interactive SQL shell
    python prism_dev_toolkit.py obsidian <dir> <out>      # Generate Obsidian vault
    python prism_dev_toolkit.py mermaid <type>            # Generate diagrams
    python prism_dev_toolkit.py validate <json_file>      # Validate against schema
    python prism_dev_toolkit.py stats <json_dir>          # Show statistics
    python prism_dev_toolkit.py audit <dir>               # Full audit report

Required packages: pip install duckdb pandas rich openpyxl xlsxwriter
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Rich for beautiful output
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import track
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    console = None

# DuckDB for SQL queries
try:
    import duckdb
    DUCKDB_AVAILABLE = True
except ImportError:
    DUCKDB_AVAILABLE = False

# Pandas for data manipulation
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# MATERIAL SCHEMA
MATERIAL_REQUIRED_FIELDS = ['id', 'name', 'category', 'subcategory',
    'density', 'hardness_brinell', 'tensile_strength', 'yield_strength']

MATERIAL_PHYSICS_FIELDS = ['kc1_1', 'mc', 'A', 'B', 'C', 'n', 'm', 
    'T_melt', 'T_ref', 'epsilon_ref', 'epsilon_dot_ref',
    'C_taylor', 'n_taylor', 'V_ref',
    'thermal_conductivity', 'specific_heat', 'thermal_diffusivity']

MATERIAL_OPTIONAL_FIELDS = ['elastic_modulus', 'poisson_ratio', 'elongation',
    'machinability_rating', 'chip_breaking_index', 'standard', 'uns_number', 'din_number']


def analyze_gaps(json_dir: str) -> Dict[str, Any]:
    """Analyze gaps in material/machine data."""
    results = {'materials': {'total': 0, 'complete': 0, 'gaps': []}, 'summary': {}}
    json_path = Path(json_dir)
    
    for json_file in json_path.glob('**/*.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            items = data if isinstance(data, list) else data.get('materials', [])
            for item in items:
                results['materials']['total'] += 1
                missing = []
                for field in MATERIAL_REQUIRED_FIELDS:
                    if not item.get(field): missing.append({'field': field, 'severity': 'CRITICAL'})
                for field in MATERIAL_PHYSICS_FIELDS:
                    if item.get(field) is None: missing.append({'field': field, 'severity': 'HIGH'})
                
                if not missing:
                    results['materials']['complete'] += 1
                else:
                    results['materials']['gaps'].append({
                        'id': item.get('id', 'UNKNOWN'), 'name': item.get('name', 'UNKNOWN'),
                        'source': json_file.name, 'missing': missing
                    })
        except: pass
    
    mat = results['materials']
    results['summary'] = {
        'total': mat['total'], 'complete': mat['complete'],
        'rate': f"{(mat['complete']/mat['total']*100):.1f}%" if mat['total'] > 0 else "N/A"
    }
    return results


def export_to_excel(json_dir: str, output_path: str):
    """Export all JSON data to Excel for bulk editing."""
    if not PANDAS_AVAILABLE:
        print("pip install pandas openpyxl"); return
    
    materials = []
    for json_file in Path(json_dir).glob('**/*.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get('materials', [])
            for item in items:
                item['_source'] = json_file.name
                materials.append(item)
        except: pass
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        pd.DataFrame(materials).to_excel(writer, sheet_name='Materials', index=False)
        
        gaps = []
        for mat in materials:
            missing_req = sum(1 for f in MATERIAL_REQUIRED_FIELDS if not mat.get(f))
            missing_phys = sum(1 for f in MATERIAL_PHYSICS_FIELDS if mat.get(f) is None)
            gaps.append({
                'id': mat.get('id', ''), 'name': mat.get('name', ''),
                'missing_required': missing_req, 'missing_physics': missing_phys,
                'completion_%': round((1 - (missing_req + missing_phys) / 25) * 100, 1)
            })
        pd.DataFrame(gaps).to_excel(writer, sheet_name='Gap Analysis', index=False)
    
    print(f"✓ Exported {len(materials)} materials to {output_path}")


def sql_shell(json_dir: str):
    """Interactive SQL shell for JSON data."""
    if not DUCKDB_AVAILABLE:
        print("pip install duckdb"); return
    
    conn = duckdb.connect(':memory:')
    tables = []
    for json_file in Path(json_dir).glob('**/*.json'):
        table_name = json_file.stem.lower().replace('-', '_').replace(' ', '_')
        try:
            conn.execute(f"CREATE TABLE {table_name} AS SELECT * FROM read_json_auto('{json_file}')")
            tables.append(table_name)
        except: pass
    
    print(f"PRISM SQL Shell | Tables: {', '.join(tables)}")
    print("Example: SELECT * FROM materials WHERE kc1_1 IS NULL;")
    print("Type 'exit' to quit.\n")
    
    while True:
        try:
            query = input("SQL> ").strip()
            if query.lower() in ('exit', 'quit', 'q'): break
            if query: print(conn.execute(query).fetchdf().to_string(), "\n")
        except KeyboardInterrupt: break
        except Exception as e: print(f"Error: {e}")
    conn.close()


def generate_mermaid(diagram_type: str) -> str:
    """Generate Mermaid diagram code."""
    diagrams = {
        'architecture': '''flowchart TB
    subgraph Products
        SFC[Speed/Feed Calculator]
        PPG[Post Processor]
    end
    subgraph Gateway
        API[REST API]
        VALID[Validation]
    end
    subgraph Engines
        KIENZLE[Kienzle Force]
        TAYLOR[Taylor Tool Life]
    end
    subgraph Data
        MAT[(Materials 1,047)]
        MACH[(Machines 824)]
    end
    Products --> Gateway --> Engines --> Data''',
        
        'materials': '''flowchart LR
    subgraph ISO[ISO 513]
        P[P: Steel]
        M[M: Stainless]
        K[K: Cast Iron]
    end
    subgraph Params[127 Parameters]
        KIENZLE[kc1.1, mc]
        JC[A,B,C,n,m]
        TAYLOR[C, n, V_ref]
    end
    ISO --> Params''',
        
        'skills': '''flowchart TB
    L0[Level 0: Always-On] --> L1[Level 1: Cognitive]
    L1 --> L2[Level 2: Workflow]
    L2 --> L3[Level 3: Domain]'''
    }
    return f"```mermaid\n{diagrams.get(diagram_type, 'Unknown type')}\n```"


def show_statistics(json_dir: str):
    """Show data statistics."""
    stats = {'files': 0, 'size_kb': 0, 'materials': 0, 'by_category': {}}
    
    for json_file in Path(json_dir).glob('**/*.json'):
        stats['files'] += 1
        stats['size_kb'] += json_file.stat().st_size / 1024
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get('materials', [])
            for item in items:
                stats['materials'] += 1
                cat = item.get('category', 'Unknown')
                stats['by_category'][cat] = stats['by_category'].get(cat, 0) + 1
        except: pass
    
    print(f"\nFiles: {stats['files']} | Size: {stats['size_kb']:.1f} KB | Materials: {stats['materials']}")
    print("\nBy Category:")
    for cat, count in sorted(stats['by_category'].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    
    cmd = sys.argv[1].lower()
    
    if cmd == 'gaps' and len(sys.argv) >= 3:
        results = analyze_gaps(sys.argv[2])
        print(f"\nTotal: {results['summary']['total']} | Complete: {results['summary']['complete']} | Rate: {results['summary']['rate']}")
        for gap in results['materials']['gaps'][:20]:
            critical = len([m for m in gap['missing'] if m['severity'] == 'CRITICAL'])
            print(f"  {gap['id']}: {critical} critical missing")
    elif cmd == 'excel' and len(sys.argv) >= 4:
        export_to_excel(sys.argv[2], sys.argv[3])
    elif cmd == 'sql' and len(sys.argv) >= 3:
        sql_shell(sys.argv[2])
    elif cmd == 'mermaid' and len(sys.argv) >= 3:
        print(generate_mermaid(sys.argv[2]))
    elif cmd == 'stats' and len(sys.argv) >= 3:
        show_statistics(sys.argv[2])
    else:
        print(__doc__)

if __name__ == '__main__':
    main()
