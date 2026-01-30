#!/usr/bin/env python3
"""PRISM DuckDB Query Helper - SQL queries on JSON/CSV data"""

import duckdb
import pandas as pd
import json
from pathlib import Path

# Pre-built analysis queries
QUERIES = {
    "summary": "SELECT COUNT(*) as total, COUNT(kc1_1) as has_kc11, COUNT(mc) as has_mc FROM {t}",
    "gaps_kc11": "SELECT id, name FROM {t} WHERE kc1_1 IS NULL",
    "gaps_mc": "SELECT id, name FROM {t} WHERE mc IS NULL",
    "by_category": "SELECT category, COUNT(*) as cnt FROM {t} GROUP BY category ORDER BY cnt DESC",
    "hardest": "SELECT id, name, hardness FROM {t} WHERE hardness IS NOT NULL ORDER BY hardness DESC LIMIT 20",
    "completeness": """
        SELECT id, name,
            (CASE WHEN kc1_1 IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN mc IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN density IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN hardness IS NOT NULL THEN 1 ELSE 0 END) * 25 as score
        FROM {t} ORDER BY score ASC LIMIT 30
    """
}

def load_json(filepath: str):
    """Load JSON file into DuckDB."""
    with open(filepath) as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        if 'materials' in data:
            data = data['materials']
        else:
            data = list(data.values())
    
    return pd.DataFrame(data)

def run_query(filepath: str, query_name: str = "summary"):
    """Run pre-built query on file."""
    df = load_json(filepath)
    conn = duckdb.connect(':memory:')
    conn.register('data', df)
    
    if query_name in QUERIES:
        sql = QUERIES[query_name].format(t='data')
    else:
        sql = query_name.replace('FROM materials', 'FROM data')
    
    try:
        result = conn.execute(sql).fetchdf()
        print(result.to_string())
        print(f"\nRows: {len(result)}")
    except Exception as e:
        print(f"Error: {e}")

def interactive(filepath: str = None):
    """Interactive SQL mode."""
    conn = duckdb.connect(':memory:')
    
    if filepath:
        df = load_json(filepath)
        conn.register('data', df)
        print(f"Loaded {len(df)} records from {filepath}")
    
    print("\nPRISM DuckDB Interactive")
    print("Commands: .quit, .tables, .help")
    print("Or type SQL queries\n")
    
    while True:
        try:
            sql = input("prism> ").strip()
            if not sql: continue
            if sql == ".quit": break
            if sql == ".help":
                print("Pre-built queries:", list(QUERIES.keys()))
                continue
            if sql in QUERIES:
                sql = QUERIES[sql].format(t='data')
            
            result = conn.execute(sql).fetchdf()
            print(result.to_string())
        except KeyboardInterrupt:
            print("\nUse .quit to exit")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python duckdb_helper.py <file.json> [query_name]")
        print("Queries:", list(QUERIES.keys()))
    elif len(sys.argv) == 2:
        interactive(sys.argv[1])
    else:
        run_query(sys.argv[1], sys.argv[2])
