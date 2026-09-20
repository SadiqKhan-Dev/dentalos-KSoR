"""Gemini function-calling tools for the DentalOS agent."""

from __future__ import annotations

import json
import logging
from typing import Any

from .mcp_client import ksor_search
from .tenant_config import tenant_config

logger = logging.getLogger(__name__)

# Tool definitions for Gemini function calling
GEMINI_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "query_clinic_knowledge",
                "description": (
                    "Search the clinic's governed knowledge base for policies, FAQs, "
                    "and procedures. Use this for questions about booking rules, pricing, "
                    "insurance, procedures, recall cadence, and clinic policies. "
                    "If the knowledge base has no answer, it will abstain — do not "
                    "fabricate an answer from general knowledge."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {
                            "type": "STRING",
                            "description": "A focused question about clinic policies or procedures",
                        },
                        "clinic_slug": {
                            "type": "STRING",
                            "description": "The clinic identifier (e.g., 'smile-care-karachi')",
                        },
                    },
                    "required": ["query", "clinic_slug"],
                },
            },
            {
                "name": "book_appointment",
                "description": "Book a dental appointment for a patient.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "patient_id": {"type": "STRING", "description": "Patient identifier"},
                        "date": {"type": "STRING", "description": "Preferred date (YYYY-MM-DD)"},
                        "time": {"type": "STRING", "description": "Preferred time (HH:MM)"},
                        "procedure": {"type": "STRING", "description": "Procedure type"},
                    },
                    "required": ["patient_id", "date", "time"],
                },
            },
            {
                "name": "reschedule_appointment",
                "description": "Reschedule an existing appointment.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "appointment_id": {"type": "STRING", "description": "Appointment identifier"},
                        "new_date": {"type": "STRING", "description": "New date (YYYY-MM-DD)"},
                        "new_time": {"type": "STRING", "description": "New time (HH:MM)"},
                    },
                    "required": ["appointment_id", "new_date", "new_time"],
                },
            },
            {
                "name": "check_recall_status",
                "description": "Check when a patient is due for their next cleaning/recall.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "patient_id": {"type": "STRING", "description": "Patient identifier"},
                    },
                    "required": ["patient_id"],
                },
            },
        ]
    }
]


async def handle_query_clinic_knowledge(
    query: str,
    clinic_slug: str,
) -> dict[str, Any]:
    """Handle the query_clinic_knowledge tool call.

    Returns the KSoR search results, or an abstention message if the
    knowledge base has no answer.
    """
    subtree = tenant_config.tenant_subtrees.get(clinic_slug)
    if not subtree:
        return {
            "abstained": True,
            "reason": f"Unknown clinic: {clinic_slug}",
        }

    result = await ksor_search(
        mcp_url=tenant_config.ksor_mcp_url,
        query=query,
        k=5,
        tenant_subtree=subtree,
    )

    # Check if the search abstained
    if result.get("abstained"):
        return {
            "abstained": True,
            "reason": result.get("reason", "Information not found in clinic knowledge base"),
        }

    # Format the results for the agent
    hits = result.get("hits", [])
    if not hits:
        return {
            "abstained": True,
            "reason": "No relevant information found in clinic knowledge base",
        }

    # Build a cited response
    citations = []
    for hit in hits:
        provenance = hit.get("provenance", {})
        citations.append({
            "content": hit.get("content", ""),
            "source": provenance.get("stable_id", "unknown"),
            "score": hit.get("rrf_score", 0),
        })

    return {
        "abstained": False,
        "citations": citations,
        "top_score": hits[0].get("rrf_score", 0) if hits else 0,
    }


# Tool handler dispatch
TOOL_HANDLERS = {
    "query_clinic_knowledge": handle_query_clinic_knowledge,
    "book_appointment": lambda **kwargs: {"status": "not_implemented", "tool": "book_appointment"},
    "reschedule_appointment": lambda **kwargs: {"status": "not_implemented", "tool": "reschedule_appointment"},
    "check_recall_status": lambda **kwargs: {"status": "not_implemented", "tool": "check_recall_status"},
}
