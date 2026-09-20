"""DentalOS Agent — FastAPI service with KSoR knowledge integration."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .gemini_tools import GEMINI_TOOLS, TOOL_HANDLERS, handle_query_clinic_knowledge
from .mcp_client import ksor_search
from .system_instructions import SYSTEM_INSTRUCTIONS
from .tenant_config import tenant_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DentalOS Agent",
    description="DentalOS clinic agent with KSoR knowledge integration",
    version="0.1.0",
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    clinic_slug: str = "smile-care-karachi"


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict[str, Any]] = []
    knowledge_used: bool = False


@app.get("/health")
async def health():
    return {"status": "ok", "service": "dentalos-agent"}


@app.get("/tools")
async def list_tools():
    """List available Gemini tools."""
    return GEMINI_TOOLS


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message through the DentalOS agent.

    This endpoint demonstrates the KSoR integration flow:
    1. Receives patient messages
    2. Routes policy/FAQ questions to query_clinic_knowledge
    3. Routes booking operations to the appropriate tools
    4. Returns the agent response with citations
    """
    # Get the last user message
    user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_message = msg.content
            break

    if not user_message:
        raise HTTPException(status_code=400, detail="No user message found")

    # Simple intent detection (in production, use Gemini for this)
    policy_keywords = [
        "policy", "policies", "rule", "rules", "cancel", "cancellation",
        "refund", "reschedule", "hours", "pricing", "price", "cost",
        "insurance", "procedure", "root canal", "whitening", "scaling",
        "cleaning", "recall", "reminder", "book", "appointment",
    ]

    is_policy_question = any(kw in user_message.lower() for kw in policy_keywords)

    tool_calls = []
    knowledge_used = False
    response_text = ""

    if is_policy_question:
        # Route to KSoR knowledge base
        result = await handle_query_clinic_knowledge(
            query=user_message,
            clinic_slug=request.clinic_slug,
        )
        knowledge_used = True
        tool_calls.append({"tool": "query_clinic_knowledge", "result": result})

        if result.get("abstained"):
            response_text = (
                "I don't have that information in our clinic records. "
                "Let me connect you with our front desk for accurate details."
            )
        else:
            # Build response from citations
            citations = result.get("citations", [])
            if citations:
                response_text = "Based on our clinic policies:\n\n"
                for i, cite in enumerate(citations[:3], 1):
                    content = cite.get("content", "").strip()
                    source = cite.get("source", "")
                    response_text += f"{content}\n\n"
                response_text += f"\nSources: {', '.join(c.get('source', '') for c in citations[:3])}"
            else:
                response_text = "I found some relevant information but couldn't retrieve the details. Let me connect you with our front desk."
    else:
        # For non-policy questions, return a generic response
        response_text = (
            "I can help you with clinic policies, procedures, and booking. "
            "For specific appointment operations, I'll connect you with our scheduling system."
        )

    return ChatResponse(
        response=response_text,
        tool_calls=tool_calls,
        knowledge_used=knowledge_used,
    )


@app.post("/mcp/search")
async def mcp_search(query: str, k: int = 5, clinic_slug: str = "smile-care-karachi"):
    """Direct MCP search endpoint for testing."""
    subtree = tenant_config.tenant_subtrees.get(clinic_slug)
    if not subtree:
        raise HTTPException(status_code=400, detail=f"Unknown clinic: {clinic_slug}")

    result = await ksor_search(
        mcp_url=tenant_config.ksor_mcp_url,
        query=query,
        k=k,
        tenant_subtree=subtree,
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
