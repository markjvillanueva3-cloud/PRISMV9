"""Shared test fixtures for PRISM CAD Engine tests."""

import os
import sys
import pytest

# ---------------------------------------------------------------------------
# Workaround: Python 3.12 on Windows uses _wmi.exec_query() inside
# platform.uname(), which deadlocks when the WMI service is unresponsive.
# Pre-populate the cache so WMI is never invoked.
# ---------------------------------------------------------------------------
if sys.platform == "win32":
    import platform as _platform
    if not hasattr(_platform, '_uname_cache') or _platform._uname_cache is None:
        _platform._uname_cache = _platform.uname_result(
            system=sys.platform,
            node=os.environ.get('COMPUTERNAME', ''),
            release=str(getattr(sys, 'getwindowsversion', lambda: type('', (), {'major': ''})())().major) if hasattr(sys, 'getwindowsversion') else '',
            version=str(sys.getwindowsversion()) if hasattr(sys, 'getwindowsversion') else '',
            machine=os.environ.get('PROCESSOR_ARCHITECTURE', 'AMD64'),
        )


REFERENCE_PARTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reference_parts")
EXPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "exports")


@pytest.fixture
def reference_parts_dir():
    """Path to reference parts directory."""
    os.makedirs(REFERENCE_PARTS_DIR, exist_ok=True)
    return REFERENCE_PARTS_DIR


@pytest.fixture
def exports_dir():
    """Path to exports directory for test output."""
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    return EXPORTS_DIR
