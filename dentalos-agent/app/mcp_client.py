"""Thin MCP client wrapper that calls the KSoR server's search/outline/read tools."""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# MCP JSON-RPC request ID counter
_request_id = 0


def _next_id() -> int:
    global _request_id
    _request_id += 1
    return _request_id


async def ksor_search(
    mcp_url: str,
    query: str,
    k: int = 5,
    tenant_subtree: str | None = None,
) -> dict[str, Any]:
    """Call the KSoR MCP server's search tool.

    Args:
        mcp_url: The MCP server endpoint URL.
        query: The search query.
        k: Number of results to return.
        tenant_subtree: If set, prefix the query with the tenant's scope.

    Returns:
        The parsed JSON response from the KSoR server.
    """
    scoped_query = f"{tenant_subtree} {query}" if tenant_subtree else query

    payload = {
        "jsonrpc": "2.0",
        "id": _next_id(),
        "method": "tools/call",
        "params": {
            "name": "search",
            "arguments": {
                "query": scoped_query,
                "k": k,
            },
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            mcp_url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        response.raise_for_status()

    # Parse SSE response
    text = response.text
    for line in text.split("\n"):
        if line.startswith("data: "):
            data = json.loads(line[6:])
            return data.get("result", {})

    return {"error": "No data in response"}


async def ksor_outline(
    mcp_url: str,
    node: str | None = None,
    depth: int = 1,
) -> dict[str, Any]:
    """Call the KSoR MCP server's outline tool."""
    payload = {
        "jsonrpc": "2.0",
        "id": _next_id(),
        "method": "tools/call",
        "params": {
            "name": "outline",
            "arguments": {"node": node, "depth": depth},
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            mcp_url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        response.raise_for_status()

    text = response.text
    for line in text.split("\n"):
        if line.startswith("data: "):
            data = json.loads(line[6:])
            return data.get("result", {})

    return {"error": "No data in response"}


async def ksor_read(
    mcp_url: str,
    slug: str,
    heading: str | None = None,
) -> dict[str, Any]:
    """Call the KSoR MCP server's read tool."""
    payload = {
        "jsonrpc": "2.0",
        "id": _next_id(),
        "method": "tools/call",
        "params": {
            "name": "read",
            "arguments": {"slug": slug, "heading": heading},
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            mcp_url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        response.raise_for_status()

    text = response.text
    for line in text.split("\n"):
        if line.startswith("data: "):
            data = json.loads(line[6:])
            return data.get("result", {})

    return {"error": "No data in response"}
