"""
Offline tests for `prism_hypercads_addin` (CAD-FUSION-LIVE-MS0 / U-HCS-ADDIN-TEST)
==================================================================================

These tests run WITHOUT a hyperCAD-S install — they exercise:
  • Catalog membership validators (electrode descriptions / orbits / holders)
  • Top-level dispatcher routing (cad vs electrode vs unknown)
  • Op-counter state transitions on success / failure / unknown
  • Structural shape of every dispatch result (ok, opId, error, durationMs)

We monkey-patch `om_cad` into the addin module so the dispatcher paths
that look up `om.cad.<func>` find a deterministic fake object.

The live `om.cad` paths are tested only inside hyperCAD-S — they cannot
be tested offline because the OPEN MIND scripting bridge is closed-source.

Run:
    python -m pytest H:/PRISM/resources/OPEN\\ MIND/hyperCAD-S/test_prism_hypercads_addin.py -v
"""

from __future__ import annotations

import importlib
import sys
import types

import pytest

# Make the addin importable by relative path even though it lives outside src/.
sys.path.insert(0, "H:/PRISM/resources/OPEN MIND/hyperCAD-S")
addin = importlib.import_module("prism_hypercads_addin")


# ── Fake om.cad surface ──────────────────────────────────────────────────────

class FakeElectrode:
    def pick_block_holder(self, **kw):
        return {"holder_id": f"holder-{kw['library']}-{kw['z_height_mm']}mm", "kw": kw}

    def set_orbit(self, **kw):
        return {"orbit_id": f"orbit-{kw['strategy']}", "kw": kw}

    def set_description(self, **kw):
        return {"description_id": f"desc-{kw['description']}", "kw": kw}

    def generate(self, **kw):
        return {"electrode_id": "elec-001", "kw": kw}

    def export_to_edm(self, **kw):
        return {"export_path": kw.get("path") or "/tmp/elec.step", "kw": kw}

    def clamping_setup(self, **kw):
        return {"clamping_id": "clamp-001", "kw": kw}

    def burn_sequence(self, **kw):
        return {"sequence_id": "seq-001", "kw": kw}


class FakeOmCad:
    def __init__(self):
        self.electrode = FakeElectrode()

    def create_sketch(self, **kw):
        return {"sketch_id": "sk-001", "kw": kw}

    def extrude(self, **kw):
        return {"feature_id": "ex-001", "kw": kw}

    def fillet(self, **kw):
        return {"feature_id": "fl-001", "kw": kw}

    def chamfer(self, **kw):
        return {"feature_id": "ch-001", "kw": kw}

    def revolve(self, **kw):
        return {"feature_id": "rv-001", "kw": kw}

    def hole(self, **kw):
        return {"feature_id": "hl-001", "kw": kw}

    def pattern(self, **kw):
        return {"feature_id": "pat-001", "kw": kw}

    def boolean(self, **kw):
        return {"feature_id": f"bool-{kw['op']}-001", "kw": kw}

    def shell(self, **kw):
        return {"feature_id": "sh-001", "kw": kw}

    def export(self, **kw):
        return {"path": kw.get("path") or f"/tmp/out.{kw['format']}", "kw": kw}


@pytest.fixture(autouse=True)
def _patch_om_cad(monkeypatch):
    fake = FakeOmCad()
    monkeypatch.setattr(addin, "om_cad", fake)
    return fake


@pytest.fixture
def state():
    return addin.AddinState()


# ── Catalog tests ────────────────────────────────────────────────────────────

class TestCatalogs:
    def test_electrode_descriptions_count_matches_xml(self):
        # electrode_descriptions.xml has exactly 9 items
        assert len(addin.ELECTRODE_DESCRIPTIONS) == 9

    def test_electrode_orbits_count_matches_xml(self):
        # electrode_orbit.xml has exactly 11 orbit strategies
        assert len(addin.ELECTRODE_ORBITS) == 11

    def test_holder_libraries_count(self):
        # Erowa_r / Erowa_s / System-3R_r / System-3R_s
        assert len(addin.HOLDER_LIBRARIES) == 4
        assert "Erowa_s" in addin.HOLDER_LIBRARIES
        assert "System-3R_r" in addin.HOLDER_LIBRARIES

    def test_holder_z_heights_match_xml(self):
        # electrode_blocks_holders.xml standard sizes
        assert addin.HOLDER_Z_HEIGHTS_MM == (20, 40, 60, 80, 100, 150, 200, 250, 300)

    def test_cad_op_kinds_count_matches_live_bridge(self):
        # HyperCADSLiveBridgeEngine has 14 live ops + 3 boolean variants - 1 (pattern split)
        # CAD_OP_KINDS = sketch + 5 features + 2 patterns + 3 booleans + shell + 5 exports = 17
        assert len(addin.CAD_OP_KINDS) == 17

    def test_electrode_op_kinds_complete(self):
        # 7 distinct electrode operations
        assert len(addin.ELECTRODE_OP_KINDS) == 7
        assert "electrode_generate" in addin.ELECTRODE_OP_KINDS


# ── CAD-op dispatch tests ────────────────────────────────────────────────────

class TestCADDispatch:
    def test_sketch_create_ok(self, state):
        result = addin.handle_op(state, {
            "kind": "sketch_create",
            "args": {"plane": "XY", "shapes": []},
        })
        assert result["ok"] is True
        assert result["kind"] == "sketch_create"
        assert state.ops_succeeded == 1
        assert state.ops_failed == 0

    def test_extrude_ok(self, state):
        result = addin.handle_op(state, {
            "kind": "feature_extrude",
            "args": {"profileId": "p1", "distance": 25.0, "operation": "new_body"},
        })
        assert result["ok"] is True
        assert "feature" in result["result"]

    def test_unknown_kind_rejected(self, state):
        result = addin.handle_op(state, {
            "kind": "bogus_kind",
            "args": {},
        })
        assert result["ok"] is False
        assert "unknown CADOperation kind" in result["error"]
        assert state.ops_failed == 1
        assert state.ops_succeeded == 0

    def test_boolean_union_routes_to_boolean(self, state):
        result = addin.handle_op(state, {
            "kind": "boolean_union",
            "args": {"bodyIds": ["b1", "b2"]},
        })
        assert result["ok"] is True
        assert "bool-union" in result["result"]["feature"]["feature_id"]

    def test_pattern_linear_vs_circular(self, state):
        r1 = addin.handle_op(state, {
            "kind": "feature_pattern_linear",
            "args": {"count": 5, "spacing": 10.0},
        })
        r2 = addin.handle_op(state, {
            "kind": "feature_pattern_circular",
            "args": {"count": 8},
        })
        assert r1["ok"] is True and r2["ok"] is True

    def test_export_all_formats(self, state):
        for fmt in ("step", "iges", "stl", "dxf", "pdf"):
            result = addin.handle_op(state, {
                "kind": f"export_{fmt}",
                "args": {"path": f"/tmp/out.{fmt}"},
            })
            assert result["ok"] is True, f"export_{fmt} failed"
            assert result["kind"] == f"export_{fmt}"

    def test_missing_om_cad_function_fails_loud(self, state, monkeypatch):
        # Replace om_cad with an empty namespace so the getattr lookup misses.
        # Use SimpleNamespace (no methods, no class-level fallback) — the
        # FakeOmCad fixture has class-level methods that would survive
        # instance-level delattr, hence the cleaner replacement here.
        monkeypatch.setattr(addin, "om_cad", types.SimpleNamespace())
        result = addin.handle_op(state, {
            "kind": "feature_extrude",
            "args": {"distance": 10.0},
        })
        assert result["ok"] is False
        assert "om.cad.extrude not found" in result["error"]

    def test_duration_ms_populated(self, state):
        result = addin.handle_op(state, {
            "kind": "sketch_create",
            "args": {"plane": "XY"},
        })
        assert "durationMs" in result
        assert isinstance(result["durationMs"], float)
        assert result["durationMs"] >= 0


# ── Electrode dispatch tests ─────────────────────────────────────────────────

class TestElectrodeDispatch:
    def test_pick_block_holder_ok(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_pick_block_holder",
            "args": {
                "library": "Erowa_s",
                "face_x_mm": 35,
                "face_y_mm": 35,
                "z_height_mm": 60,
                "clamping": "000",
            },
        })
        assert result["ok"] is True
        assert "Erowa_s" in result["result"]["holder"]["holder_id"]

    def test_pick_block_holder_unknown_library_rejected(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_pick_block_holder",
            "args": {"library": "Acme_Vise_Co", "face_x_mm": 30, "face_y_mm": 30},
        })
        assert result["ok"] is False
        assert "unknown holder library" in result["error"]

    def test_pick_block_holder_non_standard_z_rejected(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_pick_block_holder",
            "args": {"library": "Erowa_s", "z_height_mm": 77},  # not in catalog
        })
        assert result["ok"] is False
        assert "non-standard Z height" in result["error"]

    @pytest.mark.parametrize("orbit", [
        "Sink", "Sphere", "Square", "Widen", "Linear",
        "Sink and widen", "Sink and shpere", "Sink and square",
        "Injection", "Half sphere", "ISOG",
    ])
    def test_all_11_orbits_accepted(self, state, orbit):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_set_orbit_strategy",
            "args": {"orbit": orbit, "undersize_mm": 0.05},
        })
        assert result["ok"] is True, f"orbit {orbit} rejected"

    def test_unknown_orbit_rejected(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_set_orbit_strategy",
            "args": {"orbit": "Twirl"},
        })
        assert result["ok"] is False
        assert "unknown orbit strategy" in result["error"]

    @pytest.mark.parametrize("description", [
        "Core electrode", "Cavity electrode", "Insert electrode",
        "Side electrode", "Master electrode", "Virtual electrode",
        "Injection electrode", "Rotational electrode", "User defined electrode",
    ])
    def test_all_9_descriptions_accepted(self, state, description):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_set_description",
            "args": {"description": description},
        })
        assert result["ok"] is True, f"description {description} rejected"

    def test_unknown_description_rejected(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_set_description",
            "args": {"description": "Wizard electrode"},
        })
        assert result["ok"] is False
        assert "unknown electrode description" in result["error"]

    def test_electrode_generate_with_full_args(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_generate",
            "args": {
                "description": "Core electrode",
                "cavity_body_id": "cav-1",
                "burn_face_ids": ["f1", "f2", "f3"],
                "holder_library": "Erowa_s",
                "orbit_strategy": "Sink",
                "undersize_mm": 0.05,
                "material": "Cu_OFHC",
            },
        })
        assert result["ok"] is True
        assert result["result"]["electrode"]["electrode_id"] == "elec-001"

    def test_electrode_export_to_edm(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_export_to_edm",
            "args": {"electrode_id": "elec-001", "format": "step", "path": "/tmp/e.step"},
        })
        assert result["ok"] is True

    def test_clamping_setup_default_code(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_clamping_setup",
            "args": {"electrode_id": "elec-001"},
        })
        assert result["ok"] is True

    def test_burn_sequence(self, state):
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_burn_sequence",
            "args": {
                "electrode_ids": ["e1", "e2", "e3"],
                "order": "depth_descending",
            },
        })
        assert result["ok"] is True

    def test_missing_electrode_module_fails_loud(self, state, monkeypatch):
        # Strip the electrode module — should fail with structured AttributeError.
        fake_om = types.SimpleNamespace()
        monkeypatch.setattr(addin, "om_cad", fake_om)
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_generate",
            "args": {"description": "Core electrode"},
        })
        assert result["ok"] is False
        assert "om.cad.electrode not found" in result["error"]


# ── Top-level dispatcher ─────────────────────────────────────────────────────

class TestDispatcher:
    def test_routes_cad_kind_to_handle_op(self, state):
        result = addin.dispatch(state, {
            "kind": "sketch_create",
            "args": {"plane": "XY"},
        })
        assert result["ok"] is True

    def test_routes_electrode_kind_to_handle_electrode_op(self, state):
        result = addin.dispatch(state, {
            "kind": "electrode_set_description",
            "args": {"description": "Core electrode"},
        })
        assert result["ok"] is True

    def test_unknown_kind_in_dispatcher_short_circuits(self, state):
        result = addin.dispatch(state, {
            "kind": "fly_to_moon",
            "args": {},
        })
        assert result["ok"] is False
        assert "unknown op kind" in result["error"]
        assert state.ops_failed == 1

    def test_op_id_propagates(self, state):
        result = addin.dispatch(state, {
            "kind": "sketch_create",
            "operationId": "user-op-42",
            "args": {"plane": "XY"},
        })
        assert result["opId"] == "user-op-42"


# ── State / counter tests ────────────────────────────────────────────────────

class TestState:
    def test_reset_counters(self, state):
        state.ops_in = 5
        state.ops_succeeded = 3
        state.ops_failed = 2
        state.last_error = "old"
        state.reset_counters()
        assert state.ops_in == 0
        assert state.ops_succeeded == 0
        assert state.ops_failed == 0
        assert state.last_error is None

    def test_counters_accumulate_across_dispatches(self, state):
        for i in range(3):
            addin.dispatch(state, {"kind": "sketch_create", "args": {}})
        addin.dispatch(state, {"kind": "bogus", "args": {}})
        assert state.ops_succeeded == 3
        assert state.ops_failed == 1


# ── Adversarial input tests ──────────────────────────────────────────────────

class TestAdversarial:
    def test_dispatch_with_missing_kind_field(self, state):
        result = addin.dispatch(state, {"args": {}})
        assert result["ok"] is False

    def test_dispatch_with_empty_envelope(self, state):
        result = addin.dispatch(state, {})
        assert result["ok"] is False

    def test_electrode_op_with_empty_args(self, state):
        # electrode_set_description with no description → rejected by validator
        result = addin.handle_electrode_op(state, {
            "kind": "electrode_set_description",
            "args": {},
        })
        assert result["ok"] is False

    def test_om_cad_unavailable_raises_for_cad(self, state, monkeypatch):
        monkeypatch.setattr(addin, "om_cad", None)
        with pytest.raises(RuntimeError, match="om.cad not available"):
            addin.handle_op(state, {"kind": "sketch_create", "args": {}})

    def test_om_cad_unavailable_raises_for_electrode(self, state, monkeypatch):
        monkeypatch.setattr(addin, "om_cad", None)
        with pytest.raises(RuntimeError, match="om.cad not available"):
            addin.handle_electrode_op(state, {"kind": "electrode_generate", "args": {}})
