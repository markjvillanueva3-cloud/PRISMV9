"""STEP round-trip accuracy tests.

Export each reference part to STEP, re-import, and compare volumes.
Volume must match within 0.1% tolerance.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from reference_parts import REFERENCE_PARTS
from cad_export import export_step, import_step


class TestStepRoundTrip:
    """STEP export → import must preserve volume within tolerance."""

    TOLERANCE_PCT = 0.1  # 0.1% volume tolerance

    @pytest.mark.parametrize("name,factory", list(REFERENCE_PARTS.items()))
    def test_roundtrip_volume(self, name, factory, exports_dir):
        """Export to STEP, re-import, compare volumes."""
        # Build original
        original = factory()
        original_vol = original.val().Volume()

        # Export
        step_path = os.path.join(exports_dir, f"roundtrip_{name}.step")
        result = export_step(original, step_path)
        assert result.success, f"STEP export failed for {name}"

        # Import
        imported = import_step(step_path)
        imported_vol = imported.val().Volume()

        # Compare
        if original_vol > 0:
            pct_diff = abs(original_vol - imported_vol) / original_vol * 100
            assert pct_diff < self.TOLERANCE_PCT, (
                f"{name}: volume mismatch {pct_diff:.4f}% "
                f"(original={original_vol:.4f}, imported={imported_vol:.4f})"
            )
        else:
            pytest.skip(f"{name}: zero original volume")
