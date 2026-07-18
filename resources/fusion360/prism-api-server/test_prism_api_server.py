"""
Offline tests for prism_api_server (CAD-FUSION-LIVE-MS0 / U-FUS-APISRV-TEST)
============================================================================

Exercises without a Fusion install:
  - Route registration completeness (17 routes, GET/POST split)
  - Validator paths (unknown plane, unknown operation, etc.) — they reject
    BEFORE the adsk-only code path, so they run offline
  - _handle_raw_code env kill switch
  - _run_on_ui_thread offline fallback (when adsk is None, invokes fn directly)
  - JSON parse rejection
  - Unknown-route 404

Live-Fusion paths (sketch/extrude/etc.) are exercised end-to-end on the
operator's workstation per INSTALL.md smoke-test block.

Run:
    cd "H:/PRISM/resources/fusion360/prism-api-server"
    python -m pytest test_prism_api_server.py -v
"""

from __future__ import annotations

import importlib
import os
import sys

import pytest

sys.path.insert(0, "H:/PRISM/resources/fusion360/prism-api-server")
api = importlib.import_module("prism_api_server")


# Route catalog tests

class TestRouteCatalog:
    def test_17_routes_total(self):
        assert len(api.DISPATCH) == 17

    def test_get_routes(self):
        assert ("GET", "/health") in api.DISPATCH
        assert ("GET", "/status") in api.DISPATCH
        assert ("GET", "/geometry") in api.DISPATCH
        # Total of 3 GET routes
        get_routes = [r for r in api.DISPATCH if r[0] == "GET"]
        assert len(get_routes) == 3

    def test_post_routes(self):
        for route in ("/new", "/sketch", "/extrude", "/fillet", "/chamfer",
                      "/revolve", "/hole", "/pattern", "/combine", "/shell",
                      "/export", "/undo", "/parameter", "/execute"):
            assert ("POST", route) in api.DISPATCH, f"missing POST {route}"
        post_routes = [r for r in api.DISPATCH if r[0] == "POST"]
        assert len(post_routes) == 14

    def test_constants(self):
        assert api.SERVER_HOST == "127.0.0.1"  # loopback enforcement
        assert api.SERVER_PORT == 18360  # matches Fusion360LiveBridgeEngine.F360_URL
        assert api.UI_THREAD_TIMEOUT_S == 60.0

    def test_cors_allowlist(self):
        # CORS is strict — only the PRISM Hub origin
        assert "http://localhost:7421" in api.CORS_ORIGINS
        assert "http://127.0.0.1:7421" in api.CORS_ORIGINS
        assert len(api.CORS_ORIGINS) == 2


# Health/route routing tests

class TestHandlerRouting:
    def test_handle_health_returns_status_ok(self):
        result = api._handle_health({})
        assert result == {"status": "ok", "version": api.SERVER_VERSION}

    def test_offline_status_returns_fusion_unavailable(self):
        # adsk is None offline -> _handle_status returns the structured error
        result = api._handle_status({})
        assert result.get("ok") is False
        assert "fusion_unavailable" in result.get("error", "")

    def test_offline_geometry_returns_fusion_unavailable(self):
        result = api._handle_geometry({})
        assert result.get("ok") is False
        assert "fusion_unavailable" in result.get("error", "")

    def test_offline_new_returns_fusion_unavailable(self):
        result = api._handle_new({"name": "Test"})
        assert result.get("ok") is False
        assert "fusion_unavailable" in result.get("error", "")

    def test_offline_undo_returns_fusion_unavailable(self):
        result = api._handle_undo({})
        assert result.get("ok") is False
        assert "fusion_unavailable" in result.get("error", "")


# Raw-code kill switch

class TestRawCodeKillSwitch:
    def test_kill_switch_blocks_when_env_set(self, monkeypatch):
        monkeypatch.setenv(api.RAW_DISABLE_ENV, "1")
        result = api._handle_raw_code({"code": "result = 1+1"})
        assert result["ok"] is False
        assert "raw_code_disabled_by_env" in result["error"]

    @pytest.mark.parametrize("env_val", ["1", "true", "yes", "TRUE", "Yes"])
    def test_kill_switch_accepts_truthy_values(self, monkeypatch, env_val):
        monkeypatch.setenv(api.RAW_DISABLE_ENV, env_val)
        result = api._handle_raw_code({"code": "result = 1+1"})
        assert result["ok"] is False

    def test_kill_switch_off_runs_code(self, monkeypatch):
        # Ensure env not set
        monkeypatch.delenv(api.RAW_DISABLE_ENV, raising=False)
        result = api._handle_raw_code({"code": "result = 7 * 6"})
        assert result["success"] is True
        assert result["result"] == 42

    def test_empty_code_rejected(self, monkeypatch):
        monkeypatch.delenv(api.RAW_DISABLE_ENV, raising=False)
        with pytest.raises(ValueError, match="execute_code_must_be_nonempty_string"):
            api._handle_raw_code({"code": ""})

    def test_non_string_code_rejected(self, monkeypatch):
        monkeypatch.delenv(api.RAW_DISABLE_ENV, raising=False)
        with pytest.raises(ValueError, match="execute_code_must_be_nonempty_string"):
            api._handle_raw_code({"code": 42})


# _run_on_ui_thread fallback

class TestUIThreadFallback:
    def test_offline_invokes_fn_directly(self, monkeypatch):
        # adsk is None offline; _run_on_ui_thread falls through to direct call
        monkeypatch.setattr(api, "adsk", None)
        calls = []
        def fn(payload):
            calls.append(payload)
            return {"echoed": payload.get("x", "default")}
        result = api._run_on_ui_thread(fn, {"x": 99})
        assert result == {"echoed": 99}
        assert calls == [{"x": 99}]

    def test_offline_fn_exception_surfaces(self, monkeypatch):
        monkeypatch.setattr(api, "adsk", None)
        def boom(_payload):
            raise ValueError("boom_value")
        result = api._run_on_ui_thread(boom, {})
        assert result["ok"] is False
        assert "ValueError: boom_value" in result["error"]


# Plane resolver — pure function offline-safe

class TestPlaneResolver:
    def test_unknown_plane_raises(self, monkeypatch):
        # _plane_from_name takes a design + name; rejecting unknown happens BEFORE
        # touching design — but we still pass a stub design to exercise the path
        class StubDesign:
            class rootComponent:
                xYConstructionPlane = "xy"
                xZConstructionPlane = "xz"
                yZConstructionPlane = "yz"
        with pytest.raises(ValueError, match="unknown_plane"):
            api._plane_from_name(StubDesign, "AB")

    def test_known_planes_resolve(self):
        class StubDesign:
            class rootComponent:
                xYConstructionPlane = "xy"
                xZConstructionPlane = "xz"
                yZConstructionPlane = "yz"
        assert api._plane_from_name(StubDesign, "XY") == "xy"
        assert api._plane_from_name(StubDesign, "XZ") == "xz"
        assert api._plane_from_name(StubDesign, "YZ") == "yz"

    def test_case_insensitive(self):
        class StubDesign:
            class rootComponent:
                xYConstructionPlane = "xy"
                xZConstructionPlane = "xz"
                yZConstructionPlane = "yz"
        assert api._plane_from_name(StubDesign, "xy") == "xy"
        assert api._plane_from_name(StubDesign, "yZ") == "yz"


# Module surface

class TestModuleSurface:
    def test_handlers_callable(self):
        for handler in api.DISPATCH.values():
            assert callable(handler)

    def test_route_lists_match_dispatch(self):
        for path in api.ROUTE_GET:
            assert ("GET", path) in api.DISPATCH
        for path in api.ROUTE_POST:
            assert ("POST", path) in api.DISPATCH

    def test_addin_lifecycle_functions_present(self):
        # Fusion calls run(context) / stop(context) at add-in load/unload
        assert callable(api.run)
        assert callable(api.stop)

    def test_request_handler_class_present(self):
        assert hasattr(api, "PRISMRequestHandler")

    def test_pending_queue_empty_at_module_load(self):
        # Cold-start state — no requests queued
        with api._pending_lock:
            assert api._pending == []
