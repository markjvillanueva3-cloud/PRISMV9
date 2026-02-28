"""Shared test fixtures for PRISM CAD Engine tests."""

import os
import pytest


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
