"""Component Generator — Produce PRISM component files from bridge specs.

Takes ComponentSpec[] from knowledge_bridge.py and generates actual file
contents: TypeScript for engines/algorithms/hooks, Markdown for skills,
Python for scripts, JSON for schemas/formulas.

Each generator produces a string of file content ready to write to disk.
Provenance is embedded in every generated file.

Part of CC-MS2: Component Generation for /video-learn pipeline.
"""

from __future__ import annotations

import json
import re
import textwrap
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

# Import ComponentSpec and ComponentType from the bridge
from knowledge_bridge import ComponentSpec, ComponentType


@dataclass
class GeneratedComponent:
    """A generated component ready to write to disk."""
    spec: ComponentSpec
    file_path: str
    content: str
    file_type: str  # "typescript", "python", "markdown", "json"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "spec_name": self.spec.name,
            "spec_type": self.spec.type.value,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "content_length": len(self.content),
            "warnings": self.warnings,
        }


@dataclass
class GenerationResult:
    """Result of generating all components from a bridge result."""
    video_id: str
    components: list[GeneratedComponent] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def success_count(self) -> int:
        return len(self.components)

    @property
    def by_type(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for c in self.components:
            counts[c.spec.type.value] = counts.get(c.spec.type.value, 0) + 1
        return counts

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "success_count": self.success_count,
            "by_type": self.by_type,
            "components": [c.to_dict() for c in self.components],
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_components(
    specs: list[ComponentSpec],
    video_id: str,
    *,
    base_dir: str = "C:/PRISM",
) -> GenerationResult:
    """Generate PRISM component files from bridge specs.

    Args:
        specs: ComponentSpec list from bridge_knowledge().
        video_id: Video ID for provenance.
        base_dir: Root directory for PRISM project.

    Returns:
        GenerationResult with generated file contents.
    """
    result = GenerationResult(video_id=video_id)

    generators = {
        ComponentType.TRIBAL_TIP: _generate_tribal_tip,
        ComponentType.ENGINE: _generate_engine,
        ComponentType.ALGORITHM: _generate_algorithm,
        ComponentType.HOOK: _generate_hook,
        ComponentType.SKILL: _generate_skill,
        ComponentType.SCRIPT: _generate_script,
        ComponentType.SCHEMA: _generate_schema,
        ComponentType.FORMULA: _generate_formula,
    }

    for spec in specs:
        generator = generators.get(spec.type)
        if not generator:
            result.errors.append(f"No generator for type {spec.type.value}: {spec.name}")
            continue
        try:
            component = generator(spec, video_id, base_dir)
            result.components.append(component)
        except Exception as e:
            result.errors.append(f"Failed to generate {spec.type.value} '{spec.name}': {e}")

    return result


# ---------------------------------------------------------------------------
# Tribal Tip Generator
# ---------------------------------------------------------------------------

def _generate_tribal_tip(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a TypeScript KnowledgeTip object literal."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    body = cd.get("body", spec.description)
    category = _map_tip_category(cd.get("category", "general"))
    tags = cd.get("tags", spec.tags)
    confidence = int(spec.confidence * 100)

    # Determine material groups and operation types from tags
    material_groups = _infer_material_groups(tags + [body])
    operation_types = _infer_operation_types(tags + [body])

    tip_id = f"tk-vl-{video_id}-{_short_hash(title)}"

    mat_line = f'material_groups: {json.dumps(material_groups)}, ' if material_groups else ""
    ops_line = f'operation_types: {json.dumps(operation_types)}, ' if operation_types else ""

    ts_body = _escape_ts_string(body)
    ts_title = _escape_ts_string(title)

    content = (
        f'  {{ id: "{tip_id}", '
        f'title: "{ts_title}", '
        f'body: "{ts_body}", '
        f'category: "{category}", '
        f'tags: {json.dumps(tags)}, '
        f'{mat_line}'
        f'{ops_line}'
        f'confidence: {confidence}, '
        f'source: "video:{video_id}", '
        f'created_at: "{date.today().isoformat()}", '
        f'usage_count: 0 }},'
    )

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/src/engines/TribalKnowledgeEngine.ts",
        content=content,
        file_type="typescript",
    )


# ---------------------------------------------------------------------------
# Engine Generator
# ---------------------------------------------------------------------------

def _generate_engine(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a TypeScript engine file."""
    cd = spec.content_data
    name = spec.name
    title = cd.get("title", name)
    body = cd.get("body", "")
    params = cd.get("parameters", {})

    # Build typed interfaces from parameters
    input_fields = []
    for k, v in params.items():
        ts_type = "number" if isinstance(v, (int, float)) else "string"
        if isinstance(v, list):
            ts_type = "number[]" if v and isinstance(v[0], (int, float)) else "string[]"
        input_fields.append(f"  {_to_camel(k)}: {ts_type};")

    input_interface = "\n".join(input_fields) if input_fields else "  // Add input fields based on domain"
    ts_body = _escape_ts_string(body)

    content = textwrap.dedent(f"""\
        /**
         * {name} — Video-Learned Engine
         *
         * {title}
         * {ts_body[:200]}
         *
         * Source: video:{video_id}
         * Generated by /video-learn pipeline
         */

        // ============================================================================
        // TYPES
        // ============================================================================

        export interface {name}Input {{
        {input_interface}
        }}

        export interface {name}Result {{
          value: number;
          unit: string;
          uncertainty: number;
          source: string;
          warnings: string[];
        }}

        export interface {name}Stats {{
          calculations: number;
          lastInput: {name}Input | null;
        }}

        // ============================================================================
        // ENGINE
        // ============================================================================

        export class {name} {{
          private calcCount = 0;
          private lastInput: {name}Input | null = null;

          calculate(input: {name}Input): {name}Result {{
            this.calcCount++;
            this.lastInput = input;

            const warnings: string[] = [];

            // TODO: Implement calculation based on video knowledge
            // {ts_body[:120]}
            const value = 0;

            return {{
              value,
              unit: "",
              uncertainty: 0.25, // 25% — video-learned, needs validation
              source: "video:{video_id}",
              warnings,
            }};
          }}

          stats(): {name}Stats {{
            return {{
              calculations: this.calcCount,
              lastInput: this.lastInput,
            }};
          }}

          clear(): void {{
            this.calcCount = 0;
            this.lastInput = null;
          }}
        }}

        export const {_to_camel(name, lower_first=True)} = new {name}();
    """)

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/src/engines/{name}.ts",
        content=content,
        file_type="typescript",
        warnings=["Engine has TODO placeholder — implement calculate() with domain logic"],
    )


# ---------------------------------------------------------------------------
# Algorithm Generator
# ---------------------------------------------------------------------------

def _generate_algorithm(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a TypeScript Algorithm<I,O> implementation."""
    cd = spec.content_data
    name = spec.name
    title = cd.get("title", name)
    equation = cd.get("equation", "")
    body = cd.get("body", "")
    inputs = cd.get("inputs", {})
    outputs = cd.get("outputs", {})
    reference = cd.get("reference", f"Video tutorial: {video_id}")

    # Build input interface
    input_lines = []
    input_meta = {}
    for k, v in inputs.items():
        ts_type = "number" if isinstance(v, (int, float)) else "string"
        input_lines.append(f"  {_to_camel(k)}: {ts_type};")
        input_meta[_to_camel(k)] = f"{k}"

    input_block = "\n".join(input_lines) if input_lines else "  // Define input parameters"

    # Build output interface
    output_lines = []
    output_meta = {}
    for k, v in outputs.items():
        output_lines.append(f"  {_to_camel(k)}: number;")
        output_meta[_to_camel(k)] = f"{k}"

    output_block = "\n".join(output_lines) if output_lines else "  result: number;"

    # Build validation
    validations = []
    for k in inputs:
        cc = _to_camel(k)
        if isinstance(inputs[k], (int, float)):
            validations.append(
                f'    if (typeof input.{cc} !== "number" || input.{cc} <= 0) '
                f'issues.push({{ field: "{cc}", message: "{cc} must be positive", severity: "error" }});'
            )

    validation_block = "\n".join(validations) if validations else "    // Add input validation"

    ts_body = _escape_ts_string(body)
    ts_eq = _escape_ts_string(equation)

    content = textwrap.dedent(f"""\
        /**
         * {name} — Video-Learned Algorithm
         *
         * {title}
         * Equation: {ts_eq}
         *
         * Source: video:{video_id}
         * Reference: {reference}
         * Generated by /video-learn pipeline
         */

        import type {{ Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings }} from "./types.js";

        // ============================================================================
        // TYPES
        // ============================================================================

        export interface {name}Input {{
        {input_block}
        }}

        export interface {name}Output extends WithWarnings {{
        {output_block}
          calculationMethod: string;
        }}

        // ============================================================================
        // ALGORITHM
        // ============================================================================

        export class {name} implements Algorithm<{name}Input, {name}Output> {{

          validate(input: {name}Input): ValidationResult {{
            const issues: ValidationIssue[] = [];
        {validation_block}
            return {{ valid: issues.filter(i => i.severity === "error").length === 0, issues }};
          }}

          calculate(input: {name}Input): {name}Output {{
            const warnings: string[] = [];

            // TODO: Implement calculation
            // Equation: {ts_eq}
            // {ts_body[:150]}

            return {{
              {"result: 0," if not output_lines else "".join(f"{_to_camel(k)}: 0, " for k in outputs)}
              calculationMethod: "video-learned:{video_id}",
              warnings,
            }};
          }}

          getMetadata(): AlgorithmMeta {{
            return {{
              id: "{_to_kebab(name)}",
              name: "{title}",
              description: "{ts_body[:100]}",
              formula: "{ts_eq}",
              reference: "{reference}",
              safety_class: "standard",
              domain: "{spec.domain}",
              inputs: {json.dumps(input_meta)},
              outputs: {json.dumps(output_meta)},
            }};
          }}
        }}
    """)

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/src/algorithms/{name}.ts",
        content=content,
        file_type="typescript",
        warnings=["Algorithm has TODO placeholder — implement calculate() with equation logic"],
    )


# ---------------------------------------------------------------------------
# Hook Generator
# ---------------------------------------------------------------------------

def _generate_hook(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a TypeScript HookDefinition."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    body = cd.get("body", "")
    mode = cd.get("mode", "warning")  # Never blocking from video knowledge
    category = cd.get("category", "safety")
    priority = cd.get("priority", "normal")

    hook_id = _to_kebab(spec.name)
    ts_body = _escape_ts_string(body)

    content = textwrap.dedent(f"""\
        /**
         * Video-Learned Safety Hook: {title}
         *
         * {ts_body[:200]}
         *
         * Source: video:{video_id}
         * Mode: {mode} (never blocking from video knowledge)
         * Generated by /video-learn pipeline
         */

        import {{
          HookDefinition,
          HookContext,
          HookResult,
          hookSuccess,
          hookWarning,
        }} from "../engines/HookExecutor.js";

        export const {_to_camel(spec.name, lower_first=True)}: HookDefinition = {{
          id: "{hook_id}",
          name: "{title}",
          description: "{ts_body[:120]}",

          phase: "pre-operation",
          category: "{category}",
          mode: "{mode}",
          priority: "{priority}",
          enabled: true,

          tags: {json.dumps(spec.tags)},

          handler: (context: HookContext): HookResult => {{
            // Video-learned safety check
            // {ts_body[:100]}

            const data = context.target?.data as Record<string, unknown>;
            if (!data) {{
              return hookSuccess({_to_camel(spec.name, lower_first=True)}, "No data to validate");
            }}

            // TODO: Implement specific validation logic from video knowledge
            // Original advice: {ts_body[:80]}

            return hookSuccess(
              {_to_camel(spec.name, lower_first=True)},
              "Video-learned check passed",
              {{ score: 1.0 }},
            );
          }},
        }};
    """)

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/src/hooks/VideoLearnedHooks.ts",
        content=content,
        file_type="typescript",
        warnings=[f"Hook handler needs domain-specific validation logic from: {body[:80]}"],
    )


# ---------------------------------------------------------------------------
# Skill Generator
# ---------------------------------------------------------------------------

def _generate_skill(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a Markdown slash command skill file."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    body = cd.get("body", "")
    steps = cd.get("steps", [])
    skill_name = spec.name

    # Build step list
    step_lines = []
    for i, step in enumerate(steps, 1):
        step_lines.append(f"{i}. {step}")
    step_block = "\n".join(step_lines) if step_lines else "1. [Define steps from video knowledge]"

    content = textwrap.dedent(f"""\
        # {title}

        Video-learned procedure from manufacturing tutorial.
        Source: video:{video_id}
        Generated by /video-learn pipeline.

        ## Args: $ARGUMENTS
        - Empty: run full procedure
        - `check`: verify prerequisites only
        - `--step=N`: start from step N

        ## Prerequisites
        - Machine powered on and homed
        - Appropriate tooling loaded
        - Workpiece secured in fixture

        ## Procedure

        {step_block}

        ## Verification
        After completing the procedure:
        1. Verify all dimensions are within tolerance
        2. Check surface finish visually
        3. Document any deviations

        ## Notes
        {body}

        ## Safety
        - Follow all shop safety protocols
        - Wear appropriate PPE
        - Never bypass safety interlocks

        ## Source
        Learned from video tutorial: {video_id}
        Confidence: {spec.confidence:.0%}
    """)

    # Resolve home dir for skill files
    import os
    home = os.path.expanduser("~")
    file_path = f"{home}/.claude/commands/{skill_name}.md"

    return GeneratedComponent(
        spec=spec,
        file_path=file_path,
        content=content,
        file_type="markdown",
    )


# ---------------------------------------------------------------------------
# Script Generator
# ---------------------------------------------------------------------------

def _generate_script(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a Python automation script."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    body = cd.get("body", "")
    steps = cd.get("steps", [])
    params = cd.get("parameters", {})

    # Build step functions
    step_funcs = []
    for i, step in enumerate(steps, 1):
        safe_step = step.replace('"', '\\"')
        step_funcs.append(f'    print(f"  [{i}/{len(steps)}] {safe_step}")')

    steps_block = "\n".join(step_funcs) if step_funcs else '    print("  [1/1] Execute main operation")'

    # Build argparse args from parameters
    arg_lines = []
    for k, v in params.items():
        py_type = "float" if isinstance(v, (int, float)) else "str"
        default = repr(v)
        arg_lines.append(f'    parser.add_argument("--{k}", type={py_type}, default={default})')

    args_block = "\n".join(arg_lines) if arg_lines else '    # No parameters extracted from video'

    content = textwrap.dedent(f'''\
        """
        {title}

        {body[:200]}

        Source: video:{video_id}
        Generated by /video-learn pipeline.

        Usage:
            python {spec.name}.py
            python {spec.name}.py --dry-run
        """

        from __future__ import annotations

        import argparse
        import json
        import sys
        from pathlib import Path


        def run(args: argparse.Namespace) -> dict:
            """Execute the main procedure."""
            results = {{"status": "pending", "steps_completed": 0, "errors": []}}

            try:
        {steps_block}
                results["status"] = "pass"
                results["steps_completed"] = {len(steps) or 1}
            except Exception as e:
                results["errors"].append(str(e))
                results["status"] = "fail"

            return results


        def main() -> int:
            parser = argparse.ArgumentParser(description="{title}")
            parser.add_argument("--dry-run", action="store_true", help="Print steps without executing")
        {args_block}
            args = parser.parse_args()

            print("=" * 60)
            print(f"{title}")
            print(f"Source: video:{video_id}")
            print("=" * 60)

            if args.dry_run:
                print("DRY RUN — no changes will be made")
                return 0

            results = run(args)

            print(f"\\nResult: {{results['status'].upper()}}")
            if results["errors"]:
                for err in results["errors"]:
                    print(f"  ERROR: {{err}}")
                return 1

            return 0


        if __name__ == "__main__":
            sys.exit(main())
    ''')

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/scripts/{spec.name}.py",
        content=content,
        file_type="python",
    )


# ---------------------------------------------------------------------------
# Schema Generator
# ---------------------------------------------------------------------------

def _generate_schema(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a JSON data file with parameter data."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    params = cd.get("parameters", {})

    schema_data = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": f"prism-video-learned-{_to_kebab(spec.name)}",
        "title": title,
        "description": f"Parameter data from video tutorial: {video_id}",
        "type": "object",
        "properties": {},
        "metadata": {
            "source": f"video:{video_id}",
            "confidence": spec.confidence,
            "generated_by": "video-learn",
            "created_at": date.today().isoformat(),
        },
    }

    # Convert parameters to schema properties
    for k, v in params.items():
        if isinstance(v, list):
            schema_data["properties"][k] = {
                "type": "array",
                "items": {"type": "number" if v and isinstance(v[0], (int, float)) else "string"},
                "default": v,
                "description": f"Extracted from video: {k}",
            }
        elif isinstance(v, (int, float)):
            schema_data["properties"][k] = {
                "type": "number",
                "default": v,
                "description": f"Extracted from video: {k}",
            }
        else:
            schema_data["properties"][k] = {
                "type": "string",
                "default": str(v),
                "description": f"Extracted from video: {k}",
            }

    content = json.dumps(schema_data, indent=2)

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/data/video-learned/{_to_kebab(spec.name)}.json",
        content=content,
        file_type="json",
    )


# ---------------------------------------------------------------------------
# Formula Generator
# ---------------------------------------------------------------------------

def _generate_formula(
    spec: ComponentSpec, video_id: str, base_dir: str,
) -> GeneratedComponent:
    """Generate a formula JSON file conforming to formula-schema.json."""
    cd = spec.content_data
    title = cd.get("title", spec.name)
    equation = cd.get("equation", "")
    params = cd.get("parameters", {})
    domain = cd.get("domain", "CUTTING").upper()
    inputs_raw = cd.get("inputs", [])
    outputs_raw = cd.get("outputs", [])

    # Build inputs array
    inputs = []
    if isinstance(inputs_raw, list):
        inputs = inputs_raw
    elif isinstance(inputs_raw, dict):
        for k, v in inputs_raw.items():
            entry = {"name": k, "symbol": k, "unit": ""}
            if isinstance(v, (int, float)):
                entry["default"] = v
            inputs.append(entry)

    # Build outputs array
    outputs = []
    if isinstance(outputs_raw, list):
        outputs = outputs_raw
    elif isinstance(outputs_raw, dict):
        for k, v in outputs_raw.items():
            outputs.append({"name": k, "symbol": k, "unit": ""})

    # Build formula ID
    domain_code = domain[:8].upper().replace(" ", "_")
    formula_id = f"F-{domain_code}-VL{_short_hash(title)}"

    formula_data = {
        "id": formula_id,
        "name": title,
        "domain": domain_code,
        "category": spec.domain,
        "equation": equation,
        "equation_code": f"// TODO: implement — {equation[:80]}",
        "inputs": inputs,
        "outputs": outputs if outputs else [{"name": "result", "symbol": "R", "unit": ""}],
        "assumptions": [
            "Extracted from video tutorial — verify against handbook values",
            f"Confidence: {spec.confidence:.0%}",
        ],
        "limitations": [
            "Video-learned formula — may not cover all edge cases",
            "Verify parameter ranges before production use",
        ],
        "accuracy": f"±25% estimated (video-learned, confidence {spec.confidence:.0%})",
        "references": [
            f"Video tutorial: {video_id}",
        ],
        "related_formulas": [],
        "example": {
            "inputs": {inp.get("symbol", inp.get("name", f"x{i}")): inp.get("default", 0) for i, inp in enumerate(inputs)},
            "outputs": {},
            "description": "Example from video tutorial",
        },
        "metadata": {
            "source": f"video:{video_id}",
            "verified": False,
            "skill": "video-learn",
            "created_at": date.today().isoformat(),
        },
    }

    content = json.dumps(formula_data, indent=2)
    file_name = _to_kebab(title) if title else f"vl-{video_id}"

    return GeneratedComponent(
        spec=spec,
        file_path=f"{base_dir}/mcp-server/data/formulas/{file_name}.json",
        content=content,
        file_type="json",
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _escape_ts_string(text: str) -> str:
    """Escape text for safe embedding in a TypeScript double-quoted string.

    Handles: backslashes (first!), double quotes, newlines, carriage returns, tabs.
    """
    text = text.replace("\\", "\\\\")   # Must be first
    text = text.replace('"', '\\"')
    text = text.replace("\n", " ")
    text = text.replace("\r", "")
    text = text.replace("\t", " ")
    return text


def _to_camel(text: str, lower_first: bool = False) -> str:
    """Convert text to camelCase or PascalCase."""
    parts = re.sub(r"[^a-zA-Z0-9]", " ", text).split()
    if not parts:
        return text
    if lower_first:
        return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])
    return "".join(p.capitalize() for p in parts)


def _to_kebab(text: str) -> str:
    """Convert text to kebab-case."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return re.sub(r"\s+", "-", cleaned.strip()).lower()


def _short_hash(text: str) -> str:
    """Generate a short deterministic hash for IDs."""
    h = 0
    for c in text.lower():
        h = (h * 31 + ord(c)) & 0xFFFF
    return f"{h:04x}"


def _map_tip_category(raw: str) -> str:
    """Map raw category to valid KnowledgeCategory.

    KnowledgeCategory is now extensible (string & {}) so any category is valid.
    Core manufacturing categories are mapped via aliases; non-machining
    categories pass through directly for dynamic category creation.
    """
    # Core manufacturing categories
    core = {
        "setup", "tooling", "speeds_feeds", "fixturing", "surface_finish",
        "thread", "safety", "maintenance", "material_handling", "quality",
        "troubleshooting",
    }
    if raw in core:
        return raw

    # Extended categories (non-machining, also explicitly known)
    extended = {
        "programming", "electronics", "automation", "metrology",
        "design", "materials_science", "process_engineering",
        "lean_manufacturing", "additive", "inspection",
    }
    if raw in extended:
        return raw

    # Common aliases for core categories
    aliases = {
        "cutting": "speeds_feeds",
        "speed": "speeds_feeds",
        "feed": "speeds_feeds",
        "tool": "tooling",
        "fixture": "fixturing",
        "surface": "surface_finish",
        "general": "setup",
        "code": "programming",
        "software": "programming",
        "debug": "troubleshooting",
        "measure": "metrology",
        "print": "additive",
        "3d_printing": "additive",
        "lean": "lean_manufacturing",
    }
    mapped = aliases.get(raw)
    if mapped:
        return mapped

    # Dynamic category: if it's a valid identifier-like string, pass through
    clean = re.sub(r"[^a-z0-9_]", "_", raw.lower()).strip("_")
    return clean if clean else "setup"


def _infer_material_groups(text_sources: list[str]) -> list[str]:
    """Infer ISO material groups from text content."""
    combined = " ".join(str(s) for s in text_sources).lower()
    groups = []

    material_map = {
        "P": ["steel", "carbon steel", "alloy steel", "cast steel"],
        "M": ["stainless", "304", "316", "austenitic"],
        "K": ["cast iron", "gray iron", "ductile iron", "malleable"],
        "N": ["aluminum", "aluminium", "copper", "brass", "bronze"],
        "S": ["titanium", "inconel", "superalloy", "nickel alloy", "ti-6al-4v", "hastelloy"],
        "H": ["hardened", "hard steel", "hrc 45", "hrc 50", "hrc 60"],
    }

    for group, keywords in material_map.items():
        if any(kw in combined for kw in keywords):
            groups.append(group)

    return groups


def _infer_operation_types(text_sources: list[str]) -> list[str]:
    """Infer operation types from text content."""
    combined = " ".join(str(s) for s in text_sources).lower()
    ops = []

    op_map = {
        "face": ["facing", "face mill", "face milling"],
        "pocket": ["pocket", "pocketing", "cavity"],
        "profile": ["profile", "contour", "contouring", "wall"],
        "drill": ["drill", "drilling", "peck", "hole"],
        "thread": ["thread", "threading", "tap", "tapping"],
        "slot": ["slot", "slotting", "groove"],
        "bore": ["bore", "boring", "ream", "reaming"],
    }

    for op, keywords in op_map.items():
        if any(kw in combined for kw in keywords):
            ops.append(op)

    return ops
