"""CMM Data Importer — CC-EXT-MS4 P0-U01.

Parses DMIS result files and QIF XML inspection data into unified
InspectionResult objects.  Supports multiple vendor formats:
PC-DMIS, Calypso, MCOSMOS, and standard DMIS/QIF.

DMIS (Dimensional Measuring Interface Standard):
  Parses FEAT/, MEAS/, TOL/, ENDMES blocks to extract feature geometry,
  measured actuals, and tolerance evaluations.

QIF (Quality Information Framework):
  Parses XML MeasurementResults with CharacteristicActuals linked to
  CharacteristicNominals.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional

from .inspection_schema import (
    FeatureType,
    InspectionFeature,
    InspectionResult,
    SurfaceFinishResult,
    ToleranceStatus,
    VendorFormat,
)


# ---------------------------------------------------------------------------
# Feature-type mapping
# ---------------------------------------------------------------------------

_DMIS_FEATURE_MAP: dict[str, FeatureType] = {
    "POINT": FeatureType.POINT,
    "LINE": FeatureType.LINE,
    "PLANE": FeatureType.PLANE,
    "CIRCLE": FeatureType.CIRCLE,
    "CYLNDR": FeatureType.CYLINDER,
    "CYLINDER": FeatureType.CYLINDER,
    "CONE": FeatureType.CONE,
    "SPHERE": FeatureType.SPHERE,
    "SLOT": FeatureType.SLOT,
    "DIST": FeatureType.DISTANCE,
    "ANGLE": FeatureType.ANGLE,
    "FLATNS": FeatureType.FLATNESS,
    "FLATNESS": FeatureType.FLATNESS,
    "RNDNES": FeatureType.ROUNDNESS,
    "ROUNDNESS": FeatureType.ROUNDNESS,
    "PERPEN": FeatureType.PERPENDICULARITY,
    "PERPENDICULARITY": FeatureType.PERPENDICULARITY,
    "PARLEL": FeatureType.PARALLELISM,
    "PARALLELISM": FeatureType.PARALLELISM,
    "POSIT": FeatureType.POSITION,
    "POSITION": FeatureType.POSITION,
    "PROFILE": FeatureType.PROFILE,
    "RUNOUT": FeatureType.RUNOUT,
    "CONCEN": FeatureType.CONCENTRICITY,
    "CONCENTRICITY": FeatureType.CONCENTRICITY,
    "SYMMET": FeatureType.SYMMETRY,
    "SYMMETRY": FeatureType.SYMMETRY,
}

_QIF_FEATURE_MAP: dict[str, FeatureType] = {
    "PointFeature": FeatureType.POINT,
    "LineFeature": FeatureType.LINE,
    "PlaneFeature": FeatureType.PLANE,
    "CircleFeature": FeatureType.CIRCLE,
    "CylinderFeature": FeatureType.CYLINDER,
    "ConeFeature": FeatureType.CONE,
    "SphereFeature": FeatureType.SPHERE,
    "DistanceBetween": FeatureType.DISTANCE,
    "AngleBetween": FeatureType.ANGLE,
    "FlatnessCharacteristic": FeatureType.FLATNESS,
    "RoundnessCharacteristic": FeatureType.ROUNDNESS,
    "PositionCharacteristic": FeatureType.POSITION,
    "ProfileCharacteristic": FeatureType.PROFILE,
    "RunoutCharacteristic": FeatureType.RUNOUT,
    "ConcentricityCharacteristic": FeatureType.CONCENTRICITY,
    "PerpendicularityCharacteristic": FeatureType.PERPENDICULARITY,
    "ParallelismCharacteristic": FeatureType.PARALLELISM,
    "SymmetryCharacteristic": FeatureType.SYMMETRY,
}


# ---------------------------------------------------------------------------
# DMIS Parser
# ---------------------------------------------------------------------------

@dataclass
class _DMISFeatureBlock:
    """Intermediate parsed DMIS feature block."""
    name: str = ""
    feature_type: str = ""
    nominal_values: list[float] = field(default_factory=list)
    actual_values: list[float] = field(default_factory=list)
    tolerance_upper: float = 0.0
    tolerance_lower: float = 0.0
    deviation: float = 0.0
    status: str = ""  # "PASS", "FAIL", "OUTTOL", "INTOL"


class DMISParser:
    """Parse DMIS result files into InspectionResult objects.

    Handles standard DMIS format plus PC-DMIS and MCOSMOS vendor extensions.

    DMIS block types parsed:
    - FEAT/  ... : Feature definition with nominal geometry
    - MEAS/  ... : Actual measured values
    - TOL/   ... : Tolerance evaluation (upper, lower, deviation, status)
    - SNSET/ ... : Surface roughness data
    - ENDMES     : End of measurement program
    """

    def __init__(self, vendor: VendorFormat = VendorFormat.DMIS_STANDARD):
        self.vendor = vendor

    def parse(self, content: str, source_file: str = "") -> InspectionResult:
        """Parse DMIS content string into InspectionResult."""
        result = InspectionResult(
            vendor_format=self.vendor,
            source_file=source_file,
        )

        # Extract header metadata
        self._parse_header(content, result)

        # Parse feature blocks
        feature_blocks = self._extract_feature_blocks(content)

        # Parse tolerance evaluations
        tolerance_map = self._extract_tolerances(content)

        # Parse measurement actuals
        measurement_map = self._extract_measurements(content)

        # Parse surface finish
        surface_finishes = self._extract_surface_finish(content)
        result.surface_finishes = surface_finishes

        # Build inspection features
        for block in feature_blocks:
            feat = self._build_feature(block, tolerance_map, measurement_map)
            if feat:
                result.features.append(feat)

        # Evaluate all tolerances
        result.evaluate_all()

        return result

    def parse_file(self, filepath: str) -> InspectionResult:
        """Parse a DMIS file from disk."""
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.parse(content, source_file=filepath)

    def _parse_header(self, content: str, result: InspectionResult) -> None:
        """Extract header metadata from DMIS content."""
        # PARTID
        m = re.search(r"PARTID/([^\n,]+)", content)
        if m:
            result.part_number = m.group(1).strip().strip("'\"")

        # PARTNO (alternative)
        m = re.search(r"PARTNO/([^\n,]+)", content)
        if m:
            result.part_number = result.part_number or m.group(1).strip().strip("'\"")

        # MACHIN
        m = re.search(r"MACHIN/([^\n,]+)", content)
        if m:
            result.cmm_model = m.group(1).strip().strip("'\"")

        # DATSET (operator)
        m = re.search(r"DATSET/([^\n,]+)", content)
        if m:
            result.operator_id = m.group(1).strip().strip("'\"")

        # PRESSION-SPECIFIC: PC-DMIS program name
        if self.vendor == VendorFormat.PC_DMIS:
            m = re.search(r"FILNAM/([^\n,]+)", content)
            if m:
                result.program_name = m.group(1).strip().strip("'\"")

    def _extract_feature_blocks(self, content: str) -> list[_DMISFeatureBlock]:
        """Extract FEAT/ blocks from DMIS content."""
        blocks = []
        # Match FEAT/name,type,... patterns
        # Standard: FEAT/name,CART,type,x,y,z,i,j,k
        # Also handles: F(name)=FEAT/type,CART,...
        patterns = [
            # PC-DMIS style: F(name)=FEAT/type,CART,x,y,z,... (must come first)
            r"F\((\w+)\)\s*=\s*FEAT/\s*(\w+)\s*,\s*CART\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)",
            # Standard DMIS: FEAT/name,type,CART,x,y,z,...  (not preceded by =)
            r"(?<!=)FEAT/\s*(\w+)\s*,\s*(\w+)\s*,\s*CART\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)",
            # Simple: FEAT/name,type,value  (not preceded by =)
            r"(?<!=)FEAT/\s*(\w+)\s*,\s*(\w+)\s*,\s*([-\d.]+)",
        ]

        seen_names: set[str] = set()
        for pattern in patterns:
            for m in re.finditer(pattern, content):
                name = m.group(1)
                if name in seen_names:
                    continue  # Skip duplicate matches from less-specific patterns
                seen_names.add(name)
                block = _DMISFeatureBlock()
                block.name = name
                block.feature_type = m.group(2).upper()
                try:
                    block.nominal_values = [float(v) for v in m.groups()[2:] if v]
                except (ValueError, IndexError):
                    pass
                blocks.append(block)

        return blocks

    def _extract_tolerances(self, content: str) -> dict[str, _DMISFeatureBlock]:
        """Extract TOL/ blocks mapping feature names to tolerance data."""
        tol_map: dict[str, _DMISFeatureBlock] = {}

        # TOL/INTOL or TOL/OUTTOL,name,upper,lower,deviation
        # Also: T(name)=TOL/type,upper,lower,measured
        patterns = [
            # Standard: TOL/name,INTOL|OUTTOL,upper,lower,deviation
            r"TOL/\s*(\w+)\s*,\s*(INTOL|OUTTOL|PASS|FAIL)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)",
            # PC-DMIS: T(name)=TOL/POSIT,upper,lower,INTOL|OUTTOL,deviation
            r"T\((\w+)\)\s*=\s*TOL/\s*\w+\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*(INTOL|OUTTOL|PASS|FAIL)\s*,\s*([-\d.]+)",
        ]

        for pattern in patterns:
            for m in re.finditer(pattern, content):
                groups = m.groups()
                name = groups[0]
                block = _DMISFeatureBlock(name=name)

                # Determine which groups are numeric vs status
                numeric_vals = []
                for g in groups[1:]:
                    try:
                        numeric_vals.append(float(g))
                    except ValueError:
                        if g.upper() in ("INTOL", "PASS"):
                            block.status = "PASS"
                        elif g.upper() in ("OUTTOL", "FAIL"):
                            block.status = "FAIL"

                if len(numeric_vals) >= 3:
                    block.tolerance_upper = numeric_vals[0]
                    block.tolerance_lower = numeric_vals[1]
                    block.deviation = numeric_vals[2]
                elif len(numeric_vals) == 2:
                    block.tolerance_upper = numeric_vals[0]
                    block.tolerance_lower = -numeric_vals[0]
                    block.deviation = numeric_vals[1]

                tol_map[name] = block

        return tol_map

    def _extract_measurements(self, content: str) -> dict[str, list[float]]:
        """Extract MEAS/ blocks mapping feature names to actual values."""
        meas_map: dict[str, list[float]] = {}

        # MEAS/name,CART,x,y,z
        # Also: M(name)=MEAS/CART,x,y,z
        patterns = [
            r"MEAS/\s*(\w+)\s*,\s*CART\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)",
            r"M\((\w+)\)\s*=\s*MEAS/\s*CART\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)",
            r"MEAS/\s*(\w+)\s*,\s*([-\d.]+)",
        ]

        for pattern in patterns:
            for m in re.finditer(pattern, content):
                name = m.group(1)
                vals = []
                for g in m.groups()[1:]:
                    try:
                        vals.append(float(g))
                    except ValueError:
                        pass
                meas_map[name] = vals

        return meas_map

    def _extract_surface_finish(self, content: str) -> list[SurfaceFinishResult]:
        """Extract surface finish measurements from DMIS content."""
        finishes = []

        # SNSET/ROUGHA,value (Ra) or SNSET/ROUGHZ,value (Rz)
        ra_values = re.findall(r"SNSET/\s*ROUGHA\s*,\s*([-\d.]+)", content)
        rz_values = re.findall(r"SNSET/\s*ROUGHZ\s*,\s*([-\d.]+)", content)
        rmax_values = re.findall(r"SNSET/\s*ROUGHM\s*,\s*([-\d.]+)", content)

        # Pair them up
        max_count = max(len(ra_values), len(rz_values), len(rmax_values), 0)
        for i in range(max_count):
            sf = SurfaceFinishResult()
            if i < len(ra_values):
                sf.ra = float(ra_values[i])
            if i < len(rz_values):
                sf.rz = float(rz_values[i])
            if i < len(rmax_values):
                sf.rmax = float(rmax_values[i])
            finishes.append(sf)

        return finishes

    def _build_feature(
        self,
        block: _DMISFeatureBlock,
        tol_map: dict[str, _DMISFeatureBlock],
        meas_map: dict[str, list[float]],
    ) -> Optional[InspectionFeature]:
        """Combine FEAT, MEAS, and TOL data into InspectionFeature."""
        feat_type = _DMIS_FEATURE_MAP.get(block.feature_type, FeatureType.POINT)

        feat = InspectionFeature(
            feature_name=block.name,
            feature_type=feat_type,
        )

        # Set nominal from FEAT block
        if block.nominal_values:
            feat.nominal_value = block.nominal_values[0]
            if len(block.nominal_values) >= 3:
                feat.nominal_x = block.nominal_values[0]
                feat.nominal_y = block.nominal_values[1]
                feat.nominal_z = block.nominal_values[2]

        # Set actual from MEAS block
        if block.name in meas_map:
            actuals = meas_map[block.name]
            if actuals:
                feat.actual_value = actuals[0]
                if len(actuals) >= 3:
                    feat.actual_x = actuals[0]
                    feat.actual_y = actuals[1]
                    feat.actual_z = actuals[2]

        # Set tolerance from TOL block
        if block.name in tol_map:
            tol = tol_map[block.name]
            feat.upper_tolerance = tol.tolerance_upper
            feat.lower_tolerance = tol.tolerance_lower
            feat.deviation = tol.deviation
            feat.tolerance_zone = tol.tolerance_upper - tol.tolerance_lower
            if tol.status == "PASS":
                feat.status = ToleranceStatus.PASS
            elif tol.status == "FAIL":
                feat.status = ToleranceStatus.FAIL

        return feat


# ---------------------------------------------------------------------------
# QIF Parser
# ---------------------------------------------------------------------------

class QIFParser:
    """Parse QIF (Quality Information Framework) XML into InspectionResult.

    QIF uses XML with namespaced elements. Key elements:
    - MeasurementResults/MeasuredCharacteristics
    - CharacteristicActual with links to CharacteristicNominal
    - FeatureActual with measured geometry
    """

    # Common QIF namespace
    NS = {
        "qif": "http://qifstandards.org/xsd/qif3",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
    }

    def parse(self, content: str, source_file: str = "") -> InspectionResult:
        """Parse QIF XML content into InspectionResult."""
        result = InspectionResult(
            vendor_format=VendorFormat.QIF_STANDARD,
            source_file=source_file,
        )

        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return result

        # Remove namespace prefixes for simpler XPath
        content_clean = re.sub(r'\sxmlns[^"]*"[^"]*"', '', content)
        try:
            root = ET.fromstring(content_clean)
        except ET.ParseError:
            pass

        # Extract header
        self._parse_header(root, result)

        # Extract features and characteristics
        self._parse_features(root, result)

        # Extract surface finish
        self._parse_surface_finish(root, result)

        # Evaluate tolerances
        result.evaluate_all()

        return result

    def parse_file(self, filepath: str) -> InspectionResult:
        """Parse a QIF file from disk."""
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.parse(content, source_file=filepath)

    def _parse_header(self, root: ET.Element, result: InspectionResult) -> None:
        """Extract header metadata from QIF XML."""
        # Try various header locations
        for tag in ["PartNumber", "partNumber"]:
            el = root.find(f".//{tag}")
            if el is not None and el.text:
                result.part_number = el.text.strip()
                break

        for tag in ["MachineId", "machineId", "InstrumentId"]:
            el = root.find(f".//{tag}")
            if el is not None and el.text:
                result.cmm_model = el.text.strip()
                break

        for tag in ["OperatorId", "operatorId"]:
            el = root.find(f".//{tag}")
            if el is not None and el.text:
                result.operator_id = el.text.strip()
                break

    def _parse_features(self, root: ET.Element, result: InspectionResult) -> None:
        """Extract measured features from QIF XML."""
        # Look for CharacteristicActual elements
        for actual_el in root.iter():
            tag = actual_el.tag.split("}")[-1] if "}" in actual_el.tag else actual_el.tag

            # Match known characteristic actual types
            if not tag.endswith("Actual") and tag != "CharacteristicActual":
                continue

            feat = InspectionFeature()

            # Feature name / ID
            id_el = actual_el.find("Id")
            if id_el is None:
                id_el = actual_el.find("id")
            if id_el is not None and id_el.text:
                feat.feature_id = id_el.text.strip()

            name_el = actual_el.find("Name")
            if name_el is None:
                name_el = actual_el.find("name")
            if name_el is not None and name_el.text:
                feat.feature_name = name_el.text.strip()

            # Feature type from tag name
            base_type = tag.replace("Actual", "").replace("Characteristic", "Feature")
            feat.feature_type = _QIF_FEATURE_MAP.get(
                tag.replace("Actual", "Characteristic"),
                _QIF_FEATURE_MAP.get(base_type, FeatureType.POINT),
            )

            # Nominal value
            for nom_tag in ["NominalValue", "nominalValue", "Nominal"]:
                nom_el = actual_el.find(nom_tag)
                if nom_el is not None and nom_el.text:
                    try:
                        feat.nominal_value = float(nom_el.text.strip())
                    except ValueError:
                        pass
                    break

            # Actual value
            for act_tag in ["Value", "value", "ActualValue", "MeasuredValue"]:
                act_el = actual_el.find(act_tag)
                if act_el is not None and act_el.text:
                    try:
                        feat.actual_value = float(act_el.text.strip())
                    except ValueError:
                        pass
                    break

            # Deviation
            for dev_tag in ["Deviation", "deviation"]:
                dev_el = actual_el.find(dev_tag)
                if dev_el is not None and dev_el.text:
                    try:
                        feat.deviation = float(dev_el.text.strip())
                    except ValueError:
                        pass
                    break

            # Tolerance
            for utol_tag in ["UpperTolerance", "upperTolerance", "MaxValue"]:
                utol_el = actual_el.find(utol_tag)
                if utol_el is not None and utol_el.text:
                    try:
                        feat.upper_tolerance = float(utol_el.text.strip())
                    except ValueError:
                        pass
                    break

            for ltol_tag in ["LowerTolerance", "lowerTolerance", "MinValue"]:
                ltol_el = actual_el.find(ltol_tag)
                if ltol_el is not None and ltol_el.text:
                    try:
                        feat.lower_tolerance = float(ltol_el.text.strip())
                    except ValueError:
                        pass
                    break

            # Status
            for stat_tag in ["Status", "status", "CharacteristicStatus"]:
                stat_el = actual_el.find(stat_tag)
                if stat_el is not None and stat_el.text:
                    status_text = stat_el.text.strip().upper()
                    if status_text in ("PASS", "INTOL", "CONFORMING"):
                        feat.status = ToleranceStatus.PASS
                    elif status_text in ("FAIL", "OUTTOL", "NONCONFORMING"):
                        feat.status = ToleranceStatus.FAIL
                    break

            # Calculate deviation if not provided
            if feat.deviation == 0.0 and feat.actual_value != 0.0 and feat.nominal_value != 0.0:
                feat.deviation = feat.actual_value - feat.nominal_value

            # Calculate tolerance zone
            if feat.upper_tolerance != 0.0 or feat.lower_tolerance != 0.0:
                feat.tolerance_zone = feat.upper_tolerance - feat.lower_tolerance

            # Only add if we got meaningful data
            if feat.feature_name or feat.actual_value != 0.0 or feat.nominal_value != 0.0:
                result.features.append(feat)

    def _parse_surface_finish(self, root: ET.Element, result: InspectionResult) -> None:
        """Extract surface finish measurements from QIF XML."""
        for el in root.iter():
            tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
            if tag not in ("SurfaceRoughness", "RoughnessResult", "SurfaceFinish"):
                continue

            sf = SurfaceFinishResult()
            for child in el:
                child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if child.text is None:
                    continue
                try:
                    val = float(child.text.strip())
                except ValueError:
                    continue

                if child_tag.lower() in ("ra", "arithmeticmean"):
                    sf.ra = val
                elif child_tag.lower() in ("rz", "averagemaximum"):
                    sf.rz = val
                elif child_tag.lower() in ("rmax", "maximumroughness"):
                    sf.rmax = val
                elif child_tag.lower() in ("rq", "rootmeansquare"):
                    sf.rq = val

            if sf.ra is not None or sf.rz is not None:
                result.surface_finishes.append(sf)


# ---------------------------------------------------------------------------
# Vendor Adaptations
# ---------------------------------------------------------------------------

class _CalypsoAdapter:
    """Adapt Calypso XML output to standard QIF-like structure."""

    def parse(self, content: str, source_file: str = "") -> InspectionResult:
        """Parse Calypso XML output."""
        result = InspectionResult(
            vendor_format=VendorFormat.CALYPSO,
            source_file=source_file,
        )

        try:
            root = ET.fromstring(content)
        except ET.ParseError:
            return result

        # Calypso uses <CMMResult> or <ZeissResult> root
        # Features under <Feature> elements
        for feat_el in root.iter("Feature"):
            feat = InspectionFeature()

            name = feat_el.get("Name") or feat_el.get("name", "")
            feat.feature_name = name

            type_str = feat_el.get("Type") or feat_el.get("type", "POINT")
            feat.feature_type = _DMIS_FEATURE_MAP.get(
                type_str.upper(), FeatureType.POINT
            )

            # Nominal
            nom_el = feat_el.find("Nominal")
            if nom_el is not None and nom_el.text:
                try:
                    feat.nominal_value = float(nom_el.text.strip())
                except ValueError:
                    pass

            # Actual
            act_el = feat_el.find("Actual")
            if act_el is not None and act_el.text:
                try:
                    feat.actual_value = float(act_el.text.strip())
                except ValueError:
                    pass

            # Deviation
            dev_el = feat_el.find("Deviation")
            if dev_el is not None and dev_el.text:
                try:
                    feat.deviation = float(dev_el.text.strip())
                except ValueError:
                    pass

            # Tolerances
            utol_el = feat_el.find("UpperTolerance")
            if utol_el is not None and utol_el.text:
                try:
                    feat.upper_tolerance = float(utol_el.text.strip())
                except ValueError:
                    pass

            ltol_el = feat_el.find("LowerTolerance")
            if ltol_el is not None and ltol_el.text:
                try:
                    feat.lower_tolerance = float(ltol_el.text.strip())
                except ValueError:
                    pass

            # Status
            stat_el = feat_el.find("Status")
            if stat_el is not None and stat_el.text:
                st = stat_el.text.strip().upper()
                if st in ("PASS", "OK", "INTOL"):
                    feat.status = ToleranceStatus.PASS
                elif st in ("FAIL", "NOK", "OUTTOL"):
                    feat.status = ToleranceStatus.FAIL

            if feat.feature_name:
                result.features.append(feat)

        # Header
        header = root.find("Header")
        if header is None:
            header = root.find("header")
        if header is not None:
            pn = header.find("PartNumber")
            if pn is not None and pn.text:
                result.part_number = pn.text.strip()
            mc = header.find("Machine")
            if mc is not None and mc.text:
                result.cmm_model = mc.text.strip()

        result.evaluate_all()
        return result


# ---------------------------------------------------------------------------
# Unified Importer
# ---------------------------------------------------------------------------

class CMMImporter:
    """Unified CMM data importer supporting multiple formats.

    Auto-detects format from content or uses explicit vendor specification.

    Usage:
        importer = CMMImporter()
        result = importer.import_string(content)
        # or
        result = importer.import_file("path/to/results.dms")
    """

    def __init__(self):
        self._dmis_parser = DMISParser()
        self._pcdmis_parser = DMISParser(vendor=VendorFormat.PC_DMIS)
        self._qif_parser = QIFParser()
        self._calypso_adapter = _CalypsoAdapter()

    def import_string(
        self,
        content: str,
        vendor: Optional[VendorFormat] = None,
        source_file: str = "",
    ) -> InspectionResult:
        """Import CMM data from a string.

        Auto-detects format if vendor is not specified.
        """
        if vendor is None:
            vendor = self._detect_format(content, source_file)

        if vendor == VendorFormat.QIF_STANDARD:
            return self._qif_parser.parse(content, source_file)
        elif vendor == VendorFormat.CALYPSO:
            return self._calypso_adapter.parse(content, source_file)
        elif vendor == VendorFormat.PC_DMIS:
            return self._pcdmis_parser.parse(content, source_file)
        elif vendor == VendorFormat.MCOSMOS:
            # MCOSMOS uses DMIS-like format with extensions
            return self._dmis_parser.parse(content, source_file)
        else:
            return self._dmis_parser.parse(content, source_file)

    def import_file(
        self,
        filepath: str,
        vendor: Optional[VendorFormat] = None,
    ) -> InspectionResult:
        """Import CMM data from a file."""
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.import_string(content, vendor=vendor, source_file=filepath)

    def _detect_format(self, content: str, source_file: str) -> VendorFormat:
        """Auto-detect CMM data format from content and filename."""
        content_lower = content.strip().lower()

        # XML-based formats
        if content_lower.startswith("<?xml") or content_lower.startswith("<"):
            if "qif" in content_lower or "qualityinformation" in content_lower:
                return VendorFormat.QIF_STANDARD
            if "zeiss" in content_lower or "calypso" in content_lower or "<cmmresult" in content_lower:
                return VendorFormat.CALYPSO
            # Generic XML - try QIF
            return VendorFormat.QIF_STANDARD

        # DMIS-based formats
        if "filnam/" in content_lower or "pcdmis" in content_lower:
            return VendorFormat.PC_DMIS
        if "mcosmos" in content_lower:
            return VendorFormat.MCOSMOS

        # File extension hints
        ext = source_file.lower().split(".")[-1] if source_file else ""
        if ext in ("xml", "qif"):
            return VendorFormat.QIF_STANDARD
        if ext in ("prg", "rpt"):
            return VendorFormat.PC_DMIS

        # Default to standard DMIS
        return VendorFormat.DMIS_STANDARD
