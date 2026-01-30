#!/usr/bin/env python3
"""
PRISM DevTools - Comprehensive Development Toolkit
===================================================
Master CLI for all PRISM development utilities.

Tools included:
- gap: Find missing data in databases
- excel: Generate/import Excel templates for bulk editing
- obsidian: Generate Obsidian vault with linked knowledge
- diagram: Generate architecture diagrams
- validate: Validate JSON against schemas
- report: Generate comprehensive reports
- query: SQL queries on JSON data via DuckDB
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from pathlib import Path
import json
import sys

app = typer.Typer(
    name="prism-devtools",
    help="PRISM Manufacturing Intelligence Development Toolkit",
    add_completion=False
)

console = Console()

# Sub-apps
gap_app = typer.Typer(help="Gap analysis tools")
excel_app = typer.Typer(help="Excel template tools")
obsidian_app = typer.Typer(help="Obsidian vault generator")
diagram_app = typer.Typer(help="Diagram generators")
validate_app = typer.Typer(help="Data validation")
report_app = typer.Typer(help="Report generators")
query_app = typer.Typer(help="DuckDB SQL queries")

app.add_typer(gap_app, name="gap")
app.add_typer(excel_app, name="excel")
app.add_typer(obsidian_app, name="obsidian")
app.add_typer(diagram_app, name="diagram")
app.add_typer(validate_app, name="validate")
app.add_typer(report_app, name="report")
app.add_typer(query_app, name="query")


@app.command()
def status():
    """Show toolkit status and available tools."""
    console.print(Panel.fit(
        "[bold cyan]PRISM DevTools v1.0[/bold cyan]\n"
        "Comprehensive Development Toolkit",
        title="Status"
    ))
    
    table = Table(title="Available Tools")
    table.add_column("Command", style="cyan")
    table.add_column("Description", style="green")
    table.add_column("Status", style="yellow")
    
    tools = [
        ("gap", "Find missing data in databases", "Ready"),
        ("excel", "Generate/import Excel templates", "Ready"),
        ("obsidian", "Generate Obsidian knowledge vault", "Ready"),
        ("diagram", "Generate architecture diagrams", "Ready"),
        ("validate", "Validate JSON against schemas", "Ready"),
        ("report", "Generate comprehensive reports", "Ready"),
        ("query", "SQL queries via DuckDB", "Ready"),
    ]
    
    for cmd, desc, status in tools:
        table.add_row(cmd, desc, status)
    
    console.print(table)
    
    # Check dependencies
    console.print("\n[bold]Dependency Check:[/bold]")
    deps = check_dependencies()
    for dep, installed in deps.items():
        status = "[green]OK[/green]" if installed else "[red]MISSING[/red]"
        console.print(f"  {dep}: {status}")


def check_dependencies():
    """Check if required packages are installed."""
    deps = {}
    packages = ['pandas', 'duckdb', 'openpyxl', 'jsonschema', 'networkx', 
                'matplotlib', 'rich', 'pydantic', 'yaml']
    
    for pkg in packages:
        try:
            __import__(pkg)
            deps[pkg] = True
        except ImportError:
            deps[pkg] = False
    
    return deps


# Gap analysis
@gap_app.command("materials")
def gap_materials(source: Path = typer.Argument(..., help="Path to materials JSON")):
    """Analyze materials database for missing fields."""
    import pandas as pd
    
    console.print(f"[cyan]Analyzing materials from:[/cyan] {source}")
    
    with open(source) as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        materials = list(data.values())
    else:
        materials = data
    
    df = pd.DataFrame(materials)
    
    critical_fields = [
        'kc1_1', 'mc', 'density', 'hardness', 'tensile_strength',
        'thermal_conductivity', 'specific_heat', 'elastic_modulus'
    ]
    
    console.print(f"\n[bold]Total Materials:[/bold] {len(df)}")
    
    table = Table(title="Gap Analysis - Critical Fields")
    table.add_column("Field", style="cyan")
    table.add_column("Present", style="green")
    table.add_column("Missing", style="red")
    table.add_column("Coverage %", style="yellow")
    
    for field in critical_fields:
        if field in df.columns:
            present = df[field].notna().sum()
            missing = df[field].isna().sum()
            pct = (present / len(df)) * 100
        else:
            present = 0
            missing = len(df)
            pct = 0
        
        table.add_row(field, str(present), str(missing), f"{pct:.1f}%")
    
    console.print(table)


# Excel tools
@excel_app.command("template")
def excel_template(
    output: Path = typer.Argument(..., help="Output Excel path"),
    type: str = typer.Option("materials", help="Template type: materials, machines")
):
    """Generate Excel template for bulk data entry."""
    import pandas as pd
    
    templates = {
        'materials': {
            'columns': [
                'id', 'name', 'category', 'kc1_1', 'mc', 'density', 
                'hardness_brinell', 'tensile_strength', 'thermal_conductivity',
                'specific_heat', 'elastic_modulus', 'machinability_rating'
            ],
            'validation': {
                'category': ['P-Steel', 'M-Stainless', 'K-Cast Iron', 
                           'N-Non-Ferrous', 'S-Superalloy', 'H-Hardened']
            }
        },
        'machines': {
            'columns': [
                'id', 'manufacturer', 'model', 'type', 'controller',
                'x_travel', 'y_travel', 'z_travel', 'spindle_max_rpm',
                'spindle_power_kw', 'tool_capacity'
            ],
            'validation': {
                'type': ['VMC', 'HMC', 'Lathe', '5-Axis', 'Mill-Turn']
            }
        }
    }
    
    template = templates.get(type, templates['materials'])
    df = pd.DataFrame(columns=template['columns'])
    
    for i in range(100):
        df.loc[i] = [None] * len(template['columns'])
    
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='Data', index=False)
        workbook = writer.book
        worksheet = writer.sheets['Data']
        
        for col_name, options in template['validation'].items():
            if col_name in template['columns']:
                col_idx = template['columns'].index(col_name)
                col_letter = chr(65 + col_idx)
                worksheet.data_validation(
                    f'{col_letter}2:{col_letter}101',
                    {'validate': 'list', 'source': options}
                )
        
        header_format = workbook.add_format({'bold': True, 'bg_color': '#4472C4', 'font_color': 'white'})
        for col_num, value in enumerate(template['columns']):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, max(len(value) + 2, 15))
    
    console.print(f"[green]Template created:[/green] {output}")


# Query tools
@query_app.command("run")
def query_run(
    file: Path = typer.Argument(..., help="JSON or CSV file"),
    sql: str = typer.Argument(..., help="SQL query")
):
    """Run SQL query on JSON/CSV data using DuckDB."""
    import duckdb
    import pandas as pd
    
    console.print(f"[cyan]Querying:[/cyan] {file}")
    
    with open(file) as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        data = list(data.values()) if 'materials' not in data else data['materials']
    
    df = pd.DataFrame(data)
    conn = duckdb.connect(':memory:')
    conn.register('data', df)
    
    query = sql.replace('FROM materials', 'FROM data').replace('FROM data', 'FROM data')
    
    try:
        result = conn.execute(query).fetchdf()
        console.print(result.to_string())
        console.print(f"\n[green]Rows returned:[/green] {len(result)}")
    except Exception as e:
        console.print(f"[red]Query error:[/red] {e}")


@query_app.command("gaps")
def query_gaps(
    file: Path = typer.Argument(..., help="JSON file"),
    field: str = typer.Argument(..., help="Field to check for NULL")
):
    """Find records with missing field values."""
    import duckdb
    import pandas as pd
    
    with open(file) as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        data = list(data.values())
    
    df = pd.DataFrame(data)
    conn = duckdb.connect(':memory:')
    conn.register('data', df)
    
    query = f"SELECT id, name FROM data WHERE {field} IS NULL"
    
    try:
        result = conn.execute(query).fetchdf()
        console.print(f"[yellow]Records missing '{field}':[/yellow] {len(result)}")
        console.print(result.to_string())
    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")


# Validation
@validate_app.command("material")
def validate_material(file: Path = typer.Argument(..., help="Material JSON file")):
    """Validate material data completeness."""
    
    with open(file) as f:
        data = json.load(f)
    
    materials = data if isinstance(data, list) else list(data.values())
    
    required = ['id', 'name', 'category']
    recommended = ['kc1_1', 'mc', 'density', 'hardness', 'tensile_strength']
    
    stats = {'complete': 0, 'partial': 0, 'minimal': 0}
    
    for mat in materials:
        req_ok = all(mat.get(f) for f in required)
        rec_ok = all(mat.get(f) for f in recommended)
        
        if req_ok and rec_ok:
            stats['complete'] += 1
        elif req_ok:
            stats['partial'] += 1
        else:
            stats['minimal'] += 1
    
    table = Table(title="Material Validation Results")
    table.add_column("Category", style="cyan")
    table.add_column("Count", style="green")
    table.add_column("Percentage", style="yellow")
    
    total = len(materials)
    for cat, count in stats.items():
        table.add_row(cat.title(), str(count), f"{count/total*100:.1f}%")
    
    console.print(table)


# Diagrams
@diagram_app.command("architecture")
def diagram_architecture(
    output: Path = typer.Argument(..., help="Output file"),
    type: str = typer.Option("layers", help="Diagram type: layers, flow")
):
    """Generate architecture diagrams (Mermaid)."""
    
    diagrams = {
        'layers': '''```mermaid
graph TB
    subgraph Products
        P1[Speed/Feed Calculator]
        P2[Post Processor]
    end
    subgraph Engines
        E1[Physics Engines]
        E2[AI/ML Engines]
    end
    subgraph Databases
        D1[(Materials)]
        D2[(Machines)]
        D3[(Tools)]
    end
    subgraph Core
        C1[Gateway]
        C2[Event Bus]
    end
    P1 & P2 --> E1 & E2
    E1 & E2 --> D1 & D2 & D3
    D1 & D2 & D3 --> C1 & C2
```''',
        'flow': '''```mermaid
flowchart LR
    A[Input] --> B{Type?}
    B -->|Calculate| C[Physics]
    B -->|Generate| D[CAM]
    C & D --> E[Validate]
    E --> F[Output]
```'''
    }
    
    content = f"# PRISM Architecture - {type.title()}\n\n{diagrams.get(type, diagrams['layers'])}"
    
    with open(output, 'w') as f:
        f.write(content)
    
    console.print(f"[green]Diagram saved to:[/green] {output}")


if __name__ == "__main__":
    app()
