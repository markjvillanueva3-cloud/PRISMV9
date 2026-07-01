"""Tests for U-HMT-EXTRACTOR-FAILLOUD (2026-05-21).

R12 fail-loud: extractor must raise SilentExtractionError when a >5-page PDF
produces 0 tips and the caller did NOT pass expected_zero_tips=True.

Sister-fix to U-HMT-FUSION-CAD-FIX. The investigation found that
doc-fusion-cad.json (252 pages, 23 chunks, 0 errors, 0 tips) was persisted
silently because is_valid=False alone didn't block the artifact write — the
extractor needs to RAISE before the result is built.

Tests use unittest stdlib (no pytest dependency — pytest is not installed in
the portable Python at H:/Tools/python).

Run:
    cd H:/prism/cad-engine && python -m unittest tests.test_extractor_failloud -v
"""
from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

# Make src/ importable without requiring a packaged install.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Inject a minimal pypdf stub BEFORE document_extract is imported.
# The portable Python at H:/Tools/python doesn't have pypdf installed, but
# we never touch a real PDF in these tests — we patch PdfReader downstream.
if "pypdf" not in sys.modules:
    _stub_pypdf = types.ModuleType("pypdf")

    class _StubPdfReader:  # pragma: no cover — replaced per-test by patch.object
        def __init__(self, *a, **kw):
            self.pages = []

    _stub_pypdf.PdfReader = _StubPdfReader
    sys.modules["pypdf"] = _stub_pypdf


class TestFailLoudExceptionShape(unittest.TestCase):
    """SilentExtractionError carries the diagnostic context callers need."""

    def test_error_class_exists_and_subclasses_runtimeerror(self):
        from src.document_extract import SilentExtractionError
        self.assertTrue(issubclass(SilentExtractionError, RuntimeError))

    def test_error_carries_diagnostic_attrs(self):
        from src.document_extract import SilentExtractionError
        err = SilentExtractionError(
            "boom", title="X", page_count=42,
            chunk_errors=3, formulas_total=1, tables_total=2,
        )
        self.assertEqual(err.title, "X")
        self.assertEqual(err.page_count, 42)
        self.assertEqual(err.chunk_errors, 3)
        self.assertEqual(err.formulas_total, 1)
        self.assertEqual(err.tables_total, 2)
        # Message preserved for top-level logging.
        self.assertEqual(str(err), "boom")


class TestExtractFromDocumentSignature(unittest.TestCase):
    """The new params are optional + defaults preserve back-compat."""

    def test_new_params_are_optional(self):
        import inspect
        from src.document_extract import extract_from_document
        sig = inspect.signature(extract_from_document)
        self.assertIn("expected_zero_tips", sig.parameters)
        self.assertIn("fail_loud_page_threshold", sig.parameters)
        # Both must have defaults — old 4-arg call sites must keep working.
        self.assertIs(sig.parameters["expected_zero_tips"].default, False)
        self.assertEqual(sig.parameters["fail_loud_page_threshold"].default, 5)

    def test_legacy_callsite_signature_compatible(self):
        """The 4 batch scripts pass file_path/title/document_id only."""
        import inspect
        from src.document_extract import extract_from_document
        sig = inspect.signature(extract_from_document)
        # Confirm legacy 4 params still positional-or-keyword.
        legacy = ["file_path", "title", "force_domain", "document_id"]
        for name in legacy:
            p = sig.parameters[name]
            self.assertIn(
                p.kind,
                (p.POSITIONAL_OR_KEYWORD, p.KEYWORD_ONLY),
                f"{name} kind changed — would break batch_extract.py",
            )


class _Stub:
    """Stand-in for the heavy backend; we never call the real LLM in tests."""


class TestFailLoudFiring(unittest.TestCase):
    """The raise fires on the exact (tips=0, pages>threshold, !expected) case."""

    def _run_with_mocks(self, *, pages, return_per_chunk, expected_zero=False,
                        threshold=5):
        """Drive extract_from_document with stubbed pdf reader + backend.

        Returns the SilentExtractionError raised, or None if no raise.
        """
        from src import document_extract as mod

        # Stub pdf.PageObject extract_text() -> non-empty per page.
        class _StubPage:
            def extract_text(self):
                return "stub-page-text"

        class _StubReader:
            def __init__(self, _path):
                self.pages = [_StubPage() for _ in range(pages)]

        # Stub _call_backend → return constant per-chunk payload.
        def _stub_call_backend(backend, client, text, doc_title, page_range):
            return return_per_chunk

        with patch.object(mod.pypdf, "PdfReader", _StubReader), \
             patch.object(mod, "_call_backend", _stub_call_backend):
            try:
                res = mod.extract_from_document(
                    file_path="H:/fake.pdf",
                    title="test-doc",
                    document_id="test-doc",
                    expected_zero_tips=expected_zero,
                    fail_loud_page_threshold=threshold,
                )
                return None, res
            except mod.SilentExtractionError as e:
                return e, None

    def test_raises_on_substantive_pdf_with_zero_tips(self):
        """252-page Fusion-CAD case: pages>5, tips=0, !expected → RAISE."""
        err, res = self._run_with_mocks(
            pages=10,
            return_per_chunk={"tips": [], "formulas": [], "parameter_tables": []},
            expected_zero=False,
        )
        self.assertIsNotNone(err)
        self.assertIsNone(res)
        self.assertEqual(err.page_count, 10)
        self.assertIn("R12 fail-loud", str(err))
        self.assertIn("expected_zero_tips=True", str(err))

    def test_no_raise_when_expected_zero_tips_true(self):
        """The Fusion-CAD opt-out: expected_zero=True → no raise, recorded."""
        err, res = self._run_with_mocks(
            pages=10,
            return_per_chunk={"tips": [], "formulas": [], "parameter_tables": []},
            expected_zero=True,
        )
        self.assertIsNone(err)
        self.assertIsNotNone(res)
        # Flag must round-trip into the persisted stats.
        self.assertTrue(
            res.knowledge["extraction_stats"]["expected_zero_tips"],
            "expected_zero_tips=True must be recorded in stats for audit",
        )

    def test_no_raise_when_pdf_smaller_than_threshold(self):
        """3-page PDF below threshold: 0 tips OK even without opt-out."""
        err, res = self._run_with_mocks(
            pages=3,
            return_per_chunk={"tips": [], "formulas": [], "parameter_tables": []},
            expected_zero=False,
        )
        self.assertIsNone(err)
        self.assertIsNotNone(res)
        # Default flag is False on the unflagged path.
        self.assertFalse(
            res.knowledge["extraction_stats"]["expected_zero_tips"]
        )

    def test_no_raise_when_extraction_produced_tips(self):
        """Healthy path: 1 tip → no raise, flag stays False."""
        err, res = self._run_with_mocks(
            pages=10,
            return_per_chunk={
                "tips": [{"title": "Use coolant for steel", "body": "...", "category": "speeds"}],
                "formulas": [],
                "parameter_tables": [],
            },
            expected_zero=False,
        )
        self.assertIsNone(err)
        self.assertIsNotNone(res)
        self.assertEqual(res.knowledge["extraction_stats"]["tips_unique"], 1)
        self.assertFalse(res.knowledge["extraction_stats"]["expected_zero_tips"])

    def test_threshold_override_relaxes_check(self):
        """fail_loud_page_threshold=999 makes even a 100-page silent run pass."""
        err, res = self._run_with_mocks(
            pages=100,
            return_per_chunk={"tips": [], "formulas": [], "parameter_tables": []},
            expected_zero=False,
            threshold=999,
        )
        self.assertIsNone(err)
        self.assertIsNotNone(res)

    def test_error_message_mentions_chunk_errors_when_present(self):
        """Investigation spec: error message includes chunk-error context."""
        from src import document_extract as mod

        class _StubPage:
            def extract_text(self):
                return "stub-page-text"

        class _StubReader:
            def __init__(self, _path):
                self.pages = [_StubPage() for _ in range(8)]

        # Backend that raises so chunk_errors > 0 — still produces 0 tips.
        def _exploding_backend(*args, **kwargs):
            raise RuntimeError("backend offline")

        with patch.object(mod.pypdf, "PdfReader", _StubReader), \
             patch.object(mod, "_call_backend", _exploding_backend):
            with self.assertRaises(mod.SilentExtractionError) as ctx:
                mod.extract_from_document(
                    file_path="H:/fake.pdf",
                    title="error-case",
                    document_id="error-case",
                )
            # Message should surface that there WERE errors (vs the
            # silent-success case where the error message says "no errors").
            self.assertIn("chunk error", str(ctx.exception))
            self.assertGreater(ctx.exception.chunk_errors, 0)


class TestStatsRecordingIsAuditable(unittest.TestCase):
    """expected_zero_tips must always be recorded — opt-in OR opt-out."""

    def test_stats_records_false_default_path(self):
        """Healthy run: expected_zero_tips:false in stats for audit."""
        from src import document_extract as mod

        class _StubPage:
            def extract_text(self):
                return "x"

        class _StubReader:
            def __init__(self, _path):
                self.pages = [_StubPage() for _ in range(4)]

        def _backend(*args, **kwargs):
            return {"tips": [{"title": "t", "body": "b"}],
                    "formulas": [], "parameter_tables": []}

        with patch.object(mod.pypdf, "PdfReader", _StubReader), \
             patch.object(mod, "_call_backend", _backend):
            res = mod.extract_from_document(
                file_path="H:/fake.pdf", title="x", document_id="x",
            )
            stats = res.knowledge["extraction_stats"]
            self.assertIn("expected_zero_tips", stats)
            self.assertFalse(stats["expected_zero_tips"])


if __name__ == "__main__":
    unittest.main()
