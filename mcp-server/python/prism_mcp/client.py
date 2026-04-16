"""
PRISM MCP Client

Main client class for interacting with PRISM API.
"""

import os
from typing import Any, Dict, List, Optional, Union
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import json

from .exceptions import (
    PRISMError,
    EngineNotFoundError,
    MethodNotFoundError,
    ValidationError,
    FormulaError,
    APIError,
    ConnectionError,
)


class EngineClient:
    """Client for engine operations."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def call(self, engine: str, method: str, **kwargs) -> Dict[str, Any]:
        """
        Call an engine method.

        Args:
            engine: Engine name (e.g., "KienzleForceModelEngine")
            method: Method name (e.g., "calculate")
            **kwargs: Method parameters

        Returns:
            Result from the engine method

        Raises:
            EngineNotFoundError: If engine doesn't exist
            MethodNotFoundError: If method doesn't exist
            ValidationError: If parameters are invalid
        """
        response = _post(
            f"{self._base_url}/engine/call",
            {"engine": engine, "method": method, "args": kwargs},
        )

        if response.get("error") == "ENGINE_NOT_FOUND":
            raise EngineNotFoundError(engine)
        if response.get("error") == "METHOD_NOT_FOUND":
            raise MethodNotFoundError(engine, method, response.get("available", []))

        return response.get("result", response)

    def list(self) -> List[str]:
        """
        List all available engines.

        Returns:
            List of engine names
        """
        response = _get(f"{self._base_url}/engine/list")
        return response.get("engines", [])


class FormulaClient:
    """Client for formula operations."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def calculate(self, formula: str, **params) -> Dict[str, Any]:
        """
        Calculate a physics formula.

        Args:
            formula: Formula name (e.g., "kienzle_force")
            **params: Formula parameters (numeric values)

        Returns:
            Calculation result

        Raises:
            FormulaError: If calculation fails
            ValidationError: If parameters are invalid
        """
        # Convert all params to float
        numeric_params = {k: float(v) for k, v in params.items()}

        response = _post(
            f"{self._base_url}/formula/calculate",
            {"formula": formula, "params": numeric_params},
        )

        if response.get("error") == "FORMULA_ERROR":
            raise FormulaError(formula, response.get("message", "Unknown error"))

        return response.get("result", response)

    def list(self) -> List[str]:
        """
        List all available formulas.

        Returns:
            List of formula names
        """
        response = _get(f"{self._base_url}/formula/list")
        return response.get("formulas", [])


class TribalClient:
    """Client for tribal knowledge operations."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def search(
        self,
        query: str,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search tribal knowledge.

        Args:
            query: Search query
            limit: Maximum results (default 10)
            category: Optional category filter

        Returns:
            List of matching tips/knowledge entries
        """
        payload = {"query": query, "limit": limit}
        if category:
            payload["category"] = category

        response = _post(f"{self._base_url}/tribal/search", payload)
        return response.get("results", [])


class MaterialClient:
    """Client for material operations."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def lookup(
        self,
        name: Optional[str] = None,
        iso_group: Optional[str] = None,
        hardness_min: Optional[float] = None,
        hardness_max: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Look up materials.

        Args:
            name: Material name filter (partial match)
            iso_group: ISO material group (P, M, K, N, S, H)
            hardness_min: Minimum hardness
            hardness_max: Maximum hardness

        Returns:
            List of matching materials
        """
        payload = {}
        if name:
            payload["name"] = name
        if iso_group:
            payload["iso_group"] = iso_group
        if hardness_min is not None:
            payload["hardness_min"] = hardness_min
        if hardness_max is not None:
            payload["hardness_max"] = hardness_max

        response = _post(f"{self._base_url}/material/lookup", payload)
        return response.get("materials", [])


class ToolClient:
    """Client for tool operations."""

    def __init__(self, base_url: str):
        self._base_url = base_url

    def search(
        self,
        type: Optional[str] = None,
        diameter: Optional[float] = None,
        material: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search for tools.

        Args:
            type: Tool type (endmill, drill, insert, etc.)
            diameter: Tool diameter in mm
            material: Workpiece material
            operation: Operation type (roughing, finishing, etc.)
            limit: Maximum results (default 10)

        Returns:
            List of matching tools
        """
        payload = {"limit": limit}
        if type:
            payload["type"] = type
        if diameter is not None:
            payload["diameter"] = diameter
        if material:
            payload["material"] = material
        if operation:
            payload["operation"] = operation

        response = _post(f"{self._base_url}/tool/search", payload)
        return response.get("tools", [])


class Client:
    """
    PRISM MCP Client.

    Main entry point for interacting with PRISM API.

    Usage:
        client = Client()  # Uses default localhost:3000
        client = Client("http://prism.example.com:3000/api/py")

        # Engine calls
        result = client.engine.call("KienzleForceModelEngine", "calculate", ap=2.0)
        engines = client.engine.list()

        # Formula calculations
        force = client.formula.calculate("kienzle_force", ap=2, fz=0.1, kc1_1=1800)
        formulas = client.formula.list()

        # Tribal knowledge
        tips = client.tribal.search("thin wall", limit=5)

        # Material lookup
        materials = client.material.lookup(iso_group="P")

        # Tool search
        tools = client.tool.search(type="endmill", diameter=12)
    """

    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize PRISM client.

        Args:
            base_url: API base URL (default: PRISM_API_URL env var or localhost:3000)
        """
        self._base_url = base_url or os.environ.get(
            "PRISM_API_URL", "http://localhost:3000/api/py"
        )

        self.engine = EngineClient(self._base_url)
        self.formula = FormulaClient(self._base_url)
        self.tribal = TribalClient(self._base_url)
        self.material = MaterialClient(self._base_url)
        self.tool = ToolClient(self._base_url)

    def health(self) -> Dict[str, Any]:
        """
        Check API health.

        Returns:
            Health status dict
        """
        return _get(f"{self._base_url}/health")

    def capabilities(self) -> Dict[str, Any]:
        """
        Get API capabilities.

        Returns:
            Capabilities dict
        """
        return _get(f"{self._base_url}/capabilities")


# ============================================================================
# HTTP HELPERS
# ============================================================================


def _get(url: str) -> Dict[str, Any]:
    """Make a GET request."""
    try:
        request = Request(url, headers={"Accept": "application/json"})
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else "{}"
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"message": body}
        _handle_error(e.code, data)
    except URLError as e:
        raise ConnectionError(url, e)


def _post(url: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Make a POST request."""
    try:
        body = json.dumps(data).encode("utf-8")
        request = Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else "{}"
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"message": body}
        _handle_error(e.code, data)
    except URLError as e:
        raise ConnectionError(url, e)


def _handle_error(status_code: int, data: Dict[str, Any]):
    """Handle API error response."""
    error_code = data.get("error", "UNKNOWN_ERROR")
    message = data.get("message", "Unknown error")

    if error_code == "VALIDATION_ERROR":
        raise ValidationError(message, data.get("issues", []))

    raise APIError(status_code, message, data)
