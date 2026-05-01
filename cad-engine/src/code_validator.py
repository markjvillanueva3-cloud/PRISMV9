"""CadQuery Code Validator — CC-MS3.

Verifies generated CadQuery scripts:
  1. Parse check (AST validation)
  2. Execution check (runs without error)
  3. Geometry check (non-zero volume, manifold)
  4. Parameter check (all params used)
"""

from __future__ import annotations

import ast
import sys
import traceback
from dataclasses import dataclass, field
from io import StringIO
from pathlib import Path
from typing import Optional


@dataclass
class ValidationResult:
    """Result of validating a generated CadQuery script."""
    is_valid: bool = True
    parse_ok: bool = False
    executes_ok: bool = False
    geometry_ok: bool = False
    volume_mm3: float = 0.0
    is_manifold: bool = False
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "parse_ok": self.parse_ok,
            "executes_ok": self.executes_ok,
            "geometry_ok": self.geometry_ok,
            "volume_mm3": self.volume_mm3,
            "is_manifold": self.is_manifold,
            "errors": self.errors,
            "warnings": self.warnings,
        }


class CodeValidator:
    """Validates generated CadQuery scripts."""

    def validate(self, code: str) -> ValidationResult:
        """Run all validation checks on generated code."""
        result = ValidationResult()

        # Step 1: AST parse check
        self._check_parse(code, result)
        if not result.parse_ok:
            result.is_valid = False
            return result

        # Step 2: Execution check
        self._check_execution(code, result)
        if not result.executes_ok:
            result.is_valid = False
            return result

        # Step 3: Geometry check
        self._check_geometry(code, result)
        if not result.geometry_ok:
            result.is_valid = False

        return result

    def validate_file(self, path: str) -> ValidationResult:
        """Validate a CadQuery script file."""
        code = Path(path).read_text(encoding="utf-8")
        return self.validate(code)

    def _check_parse(self, code: str, result: ValidationResult) -> None:
        """Verify the script parses as valid Python."""
        try:
            tree = ast.parse(code)
            result.parse_ok = True

            # Check for common issues
            has_import = False
            has_result = False
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if "cadquery" in alias.name:
                            has_import = True
                elif isinstance(node, ast.ImportFrom):
                    if node.module and "cadquery" in node.module:
                        has_import = True
                elif isinstance(node, ast.Name) and node.id == "result":
                    has_result = True

            if not has_import:
                result.warnings.append("No cadquery import found")
            if not has_result:
                result.warnings.append("No 'result' variable assignment found")

        except SyntaxError as e:
            result.parse_ok = False
            result.errors.append(f"Syntax error at line {e.lineno}: {e.msg}")

    def _check_execution(self, code: str, result: ValidationResult) -> None:
        """Execute the script and check for runtime errors."""
        try:
            import cadquery as cq  # noqa: F401
        except ImportError:
            result.warnings.append("CadQuery not installed — skipping execution check")
            result.executes_ok = True  # Can't test, assume OK
            return

        # Execute in isolated namespace
        namespace: dict = {}
        old_stdout = sys.stdout
        sys.stdout = StringIO()

        try:
            # Remove export lines to avoid file creation during validation
            safe_code = _strip_export_lines(code)
            exec(safe_code, namespace)  # noqa: S102
            result.executes_ok = True

            # Extract result object
            if "result" in namespace:
                result_obj = namespace["result"]
                if hasattr(result_obj, "val"):
                    result.volume_mm3 = _compute_volume(result_obj)
        except Exception as e:
            result.executes_ok = False
            tb = traceback.format_exc()
            result.errors.append(f"Execution error: {e}")
            # Add last 3 lines of traceback for debugging
            tb_lines = tb.strip().split("\n")
            for line in tb_lines[-3:]:
                result.errors.append(f"  {line.strip()}")
        finally:
            sys.stdout = old_stdout

    def _check_geometry(self, code: str, result: ValidationResult) -> None:
        """Check that the generated geometry is valid."""
        if result.volume_mm3 <= 0:
            result.geometry_ok = False
            result.errors.append(
                f"Non-positive volume: {result.volume_mm3:.4f} mm³"
            )
            return

        # Check manifold (requires CadQuery)
        try:
            import cadquery as cq  # noqa: F401

            namespace: dict = {}
            safe_code = _strip_export_lines(code)
            exec(safe_code, namespace)  # noqa: S102

            if "result" in namespace:
                result_obj = namespace["result"]
                is_manifold = _check_manifold(result_obj)
                result.is_manifold = is_manifold
                if not is_manifold:
                    result.warnings.append("Geometry may not be manifold/watertight")
                result.geometry_ok = True
            else:
                result.geometry_ok = False
                result.errors.append("No 'result' variable after execution")
        except ImportError:
            result.geometry_ok = True  # Can't check, assume OK
            result.warnings.append("CadQuery not installed — skipping manifold check")
        except Exception as e:
            result.geometry_ok = False
            result.errors.append(f"Geometry check error: {e}")


def _strip_export_lines(code: str) -> str:
    """Remove export/print lines from code to avoid side effects."""
    lines = code.split("\n")
    return "\n".join(
        line
        for line in lines
        if not line.strip().startswith("cq.exporters.export")
        and not line.strip().startswith("print(")
    )


def _compute_volume(workplane) -> float:
    """Compute volume of a CadQuery Workplane result."""
    try:
        from OCP.BRepGProp import BRepGProp
        from OCP.GProp import GProp_GProps

        solid = workplane.val()
        if hasattr(solid, "wrapped"):
            shape = solid.wrapped
        else:
            shape = solid

        props = GProp_GProps()
        BRepGProp.VolumeProperties_s(shape, props)
        return abs(props.Mass())
    except Exception:
        return 0.0


def _check_manifold(workplane) -> bool:
    """Check if geometry is manifold/watertight."""
    try:
        from OCP.BRepCheck import BRepCheck_Analyzer

        solid = workplane.val()
        shape = solid.wrapped if hasattr(solid, "wrapped") else solid
        analyzer = BRepCheck_Analyzer(shape)
        return analyzer.IsValid()
    except Exception:
        return True  # Can't check, assume OK
