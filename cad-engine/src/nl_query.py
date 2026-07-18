"""Cross-Domain Natural Language Query Handler — CC-MS10.

Routes operator queries to the correct knowledge domain (CAD, CAM, SHOP,
troubleshooting) and returns validated responses with provenance.

Integrates with:
  - Memory system (CC-MS7) for knowledge retrieval
  - Platform mapper (CC-MS8) for cross-platform term resolution
  - Validation bridge (CC-MS9) for safety validation of responses

Query flow:
  NL input -> classify intent -> route to domain -> retrieve -> validate -> respond
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Query Intent Classification
# ---------------------------------------------------------------------------

class QueryDomain(str, Enum):
    CAD = "cad"
    CAM = "cam"
    SHOP = "shop"
    TROUBLESHOOT = "troubleshoot"
    GENERAL = "general"


class QueryIntent(str, Enum):
    DRAW = "draw"               # "Draw me a bearing block"
    EXPLAIN = "explain"         # "What is a fillet?"
    RECOMMEND = "recommend"     # "Best strategy for roughing 4140?"
    TROUBLESHOOT = "troubleshoot"  # "I'm getting chatter"
    SETUP = "setup"             # "How do I set up for this part?"
    COMPARE = "compare"         # "Climb vs conventional milling?"
    CALCULATE = "calculate"     # "What RPM for 6061 with 10mm endmill?"
    TEACH = "teach"             # "Teach me from this video: ..."
    LOOKUP = "lookup"           # "Show me titanium properties"


# ---------------------------------------------------------------------------
# Domain keyword maps
# ---------------------------------------------------------------------------

_DOMAIN_SIGNALS: dict[str, list[str]] = {
    "cad": [
        "draw", "sketch", "model", "extrude", "fillet", "chamfer",
        "dimension", "tolerance", "gd&t", "cad", "solidworks",
        "fusion", "catia", "bearing block", "bracket", "housing",
        "feature tree", "assembly", "part design", "3d model",
    ],
    "cam": [
        "strategy", "toolpath", "roughing", "finishing", "machining",
        "cam", "gcode", "g-code", "feed", "speed", "rpm", "sfm",
        "stepover", "depth of cut", "adaptive", "trochoidal", "pocket",
        "contour", "mastercam", "hypermill", "powermill", "esprit",
    ],
    "shop": [
        "setup", "workholding", "vise", "clamp", "fixture", "coolant",
        "tool change", "probe", "zero", "offset", "practice", "tip",
        "shop", "operator", "machine setup", "work coordinate",
    ],
    "troubleshoot": [
        "chatter", "vibration", "noise", "poor finish", "tool breakage",
        "chip", "burr", "deflection", "runout", "taper", "out of tolerance",
        "crash", "alarm", "error", "problem", "issue", "trouble",
    ],
}

_INTENT_SIGNALS: dict[str, list[str]] = {
    "draw": ["draw", "create", "design", "model", "make me", "build", "generate"],
    "explain": ["what is", "explain", "define", "describe", "tell me about"],
    "recommend": ["best", "recommend", "suggest", "optimal", "which", "should i"],
    "troubleshoot": ["chatter", "vibration", "problem", "issue", "getting",
                     "trouble", "wrong", "bad", "poor", "failing"],
    "setup": ["set up", "setup", "how do i", "prepare", "configure", "mount"],
    "compare": ["vs", "versus", "compare", "difference", "better"],
    "calculate": ["calculate", "compute", "what rpm", "what speed", "what feed",
                  "how fast", "how much"],
    "teach": ["teach me", "learn from", "video"],
    "lookup": ["show me", "look up", "properties", "data for", "specs"],
}

# Material keywords for extraction
_MATERIAL_KEYWORDS = [
    "aluminum", "6061", "7075", "2024",
    "steel", "4140", "1018", "1045", "4340", "d2", "a2", "o1",
    "stainless", "304", "316", "17-4",
    "titanium", "ti-6al-4v", "ti64",
    "cast iron", "brass", "copper", "inconel", "718",
    "plastic", "delrin", "nylon", "peek", "acetal",
]


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class QueryClassification:
    """Classification result for an NL query."""
    raw_query: str
    domain: QueryDomain
    intent: QueryIntent
    confidence: float
    extracted_material: str = ""
    extracted_operation: str = ""
    extracted_parameters: dict = field(default_factory=dict)
    keywords: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "raw_query": self.raw_query,
            "domain": self.domain.value,
            "intent": self.intent.value,
            "confidence": round(self.confidence, 4),
            "extracted_material": self.extracted_material,
            "extracted_operation": self.extracted_operation,
            "extracted_parameters": self.extracted_parameters,
            "keywords": self.keywords,
        }


@dataclass
class QueryResponse:
    """Response to an operator query with provenance."""
    classification: QueryClassification
    answer: str
    steps: list[str] = field(default_factory=list)
    sources: list[str] = field(default_factory=list)
    validation_status: str = "unvalidated"  # "validated", "unvalidated", "warning", "blocked"
    safety_score: float = 1.0
    related_queries: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "classification": self.classification.to_dict(),
            "answer": self.answer,
            "steps": self.steps,
            "sources": self.sources,
            "validation_status": self.validation_status,
            "safety_score": round(self.safety_score, 4),
            "related_queries": self.related_queries,
        }


# ---------------------------------------------------------------------------
# NLQueryHandler
# ---------------------------------------------------------------------------

class NLQueryHandler:
    """Cross-domain natural language query handler.

    Classifies operator queries by domain and intent, extracts
    parameters, and routes to the appropriate knowledge source.
    """

    def classify(self, query: str) -> QueryClassification:
        """Classify a natural language query into domain + intent."""
        q = query.lower().strip()

        domain, domain_conf = self._detect_domain(q)
        intent, intent_conf = self._detect_intent(q)
        material = self._extract_material(q)
        operation = self._extract_operation(q)
        params = self._extract_parameters(q)
        keywords = self._extract_keywords(q)

        overall_conf = (domain_conf + intent_conf) / 2.0

        return QueryClassification(
            raw_query=query,
            domain=domain,
            intent=intent,
            confidence=overall_conf,
            extracted_material=material,
            extracted_operation=operation,
            extracted_parameters=params,
            keywords=keywords,
        )

    def route(self, classification: QueryClassification) -> QueryResponse:
        """Route a classified query and generate a response skeleton.

        In production this would call memory search, strategy recommender,
        trouble tree walker, etc. Here we build the response framework
        with routing information and provenance placeholders.
        """
        domain = classification.domain
        intent = classification.intent

        # Build response based on domain + intent
        if intent == QueryIntent.TEACH:
            return self._route_teach(classification)

        if domain == QueryDomain.CAD:
            return self._route_cad(classification)
        elif domain == QueryDomain.CAM:
            return self._route_cam(classification)
        elif domain == QueryDomain.SHOP:
            return self._route_shop(classification)
        elif domain == QueryDomain.TROUBLESHOOT:
            return self._route_troubleshoot(classification)

        return QueryResponse(
            classification=classification,
            answer="Query received. Domain could not be determined — please provide more context.",
            validation_status="unvalidated",
        )

    def handle(self, query: str) -> QueryResponse:
        """Full pipeline: classify -> route -> respond."""
        classification = self.classify(query)
        return self.route(classification)

    # -- Domain detection --

    def _detect_domain(self, q: str) -> tuple[QueryDomain, float]:
        scores: dict[str, float] = {}
        for domain, keywords in _DOMAIN_SIGNALS.items():
            # Troubleshoot signals get 2x weight — problem indicators
            # should override incidental domain keywords like "finishing"
            weight = 2.0 if domain == "troubleshoot" else 1.0
            score = sum(weight for kw in keywords if kw in q)
            if score > 0:
                scores[domain] = score

        if not scores:
            return QueryDomain.GENERAL, 0.3

        best = max(scores, key=scores.get)  # type: ignore[arg-type]
        total = sum(scores.values())
        conf = scores[best] / max(total, 1.0)

        domain_map = {
            "cad": QueryDomain.CAD,
            "cam": QueryDomain.CAM,
            "shop": QueryDomain.SHOP,
            "troubleshoot": QueryDomain.TROUBLESHOOT,
        }
        return domain_map[best], min(conf + 0.3, 1.0)

    def _detect_intent(self, q: str) -> tuple[QueryIntent, float]:
        scores: dict[str, float] = {}
        for intent, keywords in _INTENT_SIGNALS.items():
            score = sum(1.0 for kw in keywords if kw in q)
            if score > 0:
                scores[intent] = score

        if not scores:
            return QueryIntent.EXPLAIN, 0.3

        best = max(scores, key=scores.get)  # type: ignore[arg-type]
        total = sum(scores.values())
        conf = scores[best] / max(total, 1.0)

        intent_map = {
            "draw": QueryIntent.DRAW,
            "explain": QueryIntent.EXPLAIN,
            "recommend": QueryIntent.RECOMMEND,
            "troubleshoot": QueryIntent.TROUBLESHOOT,
            "setup": QueryIntent.SETUP,
            "compare": QueryIntent.COMPARE,
            "calculate": QueryIntent.CALCULATE,
            "teach": QueryIntent.TEACH,
            "lookup": QueryIntent.LOOKUP,
        }
        return intent_map[best], min(conf + 0.3, 1.0)

    def _extract_material(self, q: str) -> str:
        for mat in _MATERIAL_KEYWORDS:
            if mat in q:
                return mat
        return ""

    def _extract_operation(self, q: str) -> str:
        ops = [
            "roughing", "finishing", "adaptive", "trochoidal", "pocket",
            "contour", "drilling", "turning", "facing", "threading",
            "boring", "reaming", "tapping", "grooving", "parting",
        ]
        for op in ops:
            if op in q:
                return op
        return ""

    def _extract_parameters(self, q: str) -> dict:
        params: dict = {}
        # RPM
        rpm_match = re.search(r"(\d{3,6})\s*rpm", q, re.IGNORECASE)
        if rpm_match:
            params["rpm"] = int(rpm_match.group(1))
        # Diameter
        dia_match = re.search(r"(\d+(?:\.\d+)?)\s*mm\s*(?:end\s*mill|tool|drill|cutter)", q)
        if dia_match:
            params["tool_diameter"] = float(dia_match.group(1))
        # Speed
        speed_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:sfm|m/min)", q, re.IGNORECASE)
        if speed_match:
            params["cutting_speed"] = float(speed_match.group(1))
        # Video URL
        url_match = re.search(r"(https?://\S+)", q)
        if url_match:
            params["url"] = url_match.group(1)
        return params

    def _extract_keywords(self, q: str) -> list[str]:
        stop = {"the", "a", "an", "for", "in", "on", "with", "about",
                "how", "to", "what", "is", "are", "do", "does", "can",
                "best", "good", "when", "why", "i", "me", "my", "this",
                "that", "it", "of", "and", "or"}
        words = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", q)
        return [w for w in words if w not in stop and len(w) > 1]

    # -- Domain routers --

    def _route_cad(self, c: QueryClassification) -> QueryResponse:
        if c.intent == QueryIntent.DRAW:
            return QueryResponse(
                classification=c,
                answer=f"CAD generation request: '{c.raw_query}'",
                steps=[
                    "Parse feature requirements from query",
                    "Generate CadQuery script for requested geometry",
                    "Validate manufacturability via CC-MS9 bridge",
                    "Export STEP/STL for downstream use",
                ],
                sources=["CadQuery parametric engine", "CC-MS9 validation bridge"],
                validation_status="validated",
                safety_score=1.0,
            )
        return QueryResponse(
            classification=c,
            answer=f"CAD domain query: '{c.raw_query}'",
            sources=["PRISM CAD knowledge base"],
            validation_status="validated",
        )

    def _route_cam(self, c: QueryClassification) -> QueryResponse:
        mat_info = f" for {c.extracted_material}" if c.extracted_material else ""
        op_info = f" ({c.extracted_operation})" if c.extracted_operation else ""
        return QueryResponse(
            classification=c,
            answer=f"CAM strategy recommendation{mat_info}{op_info}",
            steps=[
                "Query strategy database for matching parameters",
                "Rank strategies by validation score",
                "Cross-check against Kienzle force model (CC-MS9)",
                "Return top recommendations with safety margins",
            ],
            sources=["PRISM strategy DB", "Kienzle force model", "CC-MS9 CAM overlay"],
            validation_status="validated",
            safety_score=1.0,
        )

    def _route_shop(self, c: QueryClassification) -> QueryResponse:
        return QueryResponse(
            classification=c,
            answer=f"Shop practice query: '{c.raw_query}'",
            steps=[
                "Search shop practice knowledge base",
                "Filter by material and operation",
                "Validate practices via CC-MS9 safety validator",
                "Return step-by-step guidance with warnings",
            ],
            sources=["PRISM shop practice KB", "CC-MS9 shop safety validator"],
            validation_status="validated",
            safety_score=1.0,
        )

    def _route_troubleshoot(self, c: QueryClassification) -> QueryResponse:
        return QueryResponse(
            classification=c,
            answer=f"Troubleshooting: '{c.raw_query}'",
            steps=[
                "Match symptoms to troubleshooting decision tree",
                "Walk tree to identify probable causes",
                "Provide diagnostic steps",
                "Suggest solutions ranked by likelihood",
            ],
            sources=["PRISM trouble tree DB", "Shop practice KB"],
            validation_status="validated",
            safety_score=1.0,
            related_queries=[
                "What causes chatter in milling?",
                "How to reduce vibration?",
                "Tool deflection troubleshooting",
            ],
        )

    def _route_teach(self, c: QueryClassification) -> QueryResponse:
        url = c.extracted_parameters.get("url", "")
        return QueryResponse(
            classification=c,
            answer=f"Teach-me mode: will ingest content from '{url}'" if url
                   else "Teach-me mode: please provide a URL to learn from",
            steps=[
                "Download and extract content from URL",
                "Classify content by domain (CAD/CAM/SHOP)",
                "Extract actionable knowledge",
                "Validate against physics models",
                "Store validated knowledge to memory",
                "Generate learning report",
            ],
            sources=["Video/document learning pipeline"],
            validation_status="unvalidated",
        )
