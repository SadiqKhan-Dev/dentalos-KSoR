"""Unit tests for the query_clinic_knowledge tool."""

from unittest.mock import AsyncMock, patch

import pytest

from app.gemini_tools import handle_query_clinic_knowledge
from app.tenant_config import tenant_config


@pytest.fixture
def mock_ksor_search():
    """Mock the ksor_search function."""
    with patch("app.gemini_tools.ksor_search") as mock:
        yield mock


@pytest.mark.asyncio
async def test_in_corpus_query_returns_citations(mock_ksor_search):
    """In-corpus question should return cited results, not abstain."""
    mock_ksor_search.return_value = {
        "abstained": False,
        "hits": [
            {
                "content": "24-hour notice is required for cancellation.",
                "rrf_score": 0.69,
                "provenance": {
                    "stable_id": "knowledge/smile-care-karachi/booking-policy",
                    "slug": "booking-policy",
                },
            }
        ],
    }

    result = await handle_query_clinic_knowledge(
        query="what is the cancellation policy",
        clinic_slug="smile-care-karachi",
    )

    assert result["abstained"] is False
    assert len(result["citations"]) == 1
    assert "cancellation" in result["citations"][0]["content"].lower()
    assert result["citations"][0]["source"] == "knowledge/smile-care-karachi/booking-policy"
    mock_ksor_search.assert_called_once()


@pytest.mark.asyncio
async def test_out_of_corpus_query_abstains(mock_ksor_search):
    """Out-of-corpus question should trigger abstention."""
    mock_ksor_search.return_value = {
        "abstained": True,
        "reason": "abstained",
        "hits": [],
    }

    result = await handle_query_clinic_knowledge(
        query="how do I file my tax return",
        clinic_slug="smile-care-karachi",
    )

    assert result["abstained"] is True
    assert "reason" in result
    assert len(result.get("citations", [])) == 0


@pytest.mark.asyncio
async def test_unknown_clinic_abstains(mock_ksor_search):
    """Unknown clinic slug should trigger abstention."""
    result = await handle_query_clinic_knowledge(
        query="what are the hours",
        clinic_slug="unknown-clinic",
    )

    assert result["abstained"] is True
    assert "Unknown clinic" in result["reason"]
    mock_ksor_search.assert_not_called()


@pytest.mark.asyncio
async def test_booking_function_not_routed_to_knowledge(mock_ksor_search):
    """Booking tool calls should NOT go through query_clinic_knowledge."""
    from app.gemini_tools import TOOL_HANDLERS

    # Verify book_appointment handler exists and doesn't call ksor_search
    handler = TOOL_HANDLERS.get("book_appointment")
    assert handler is not None

    # The booking handler should be a simple lambda, not the knowledge handler
    result = handler(patient_id="p123", date="2026-09-25", time="10:00")
    assert result["status"] == "not_implemented"
    assert result["tool"] == "book_appointment"

    # ksor_search should not have been called
    mock_ksor_search.assert_not_called()


@pytest.mark.asyncio
async def test_reschedule_not_routed_to_knowledge(mock_ksor_search):
    """Reschedule tool calls should NOT go through query_clinic_knowledge."""
    from app.gemini_tools import TOOL_HANDLERS

    handler = TOOL_HANDLERS.get("reschedule_appointment")
    assert handler is not None

    result = handler(appointment_id="a456", new_date="2026-09-26", new_time="14:00")
    assert result["status"] == "not_implemented"
    mock_ksor_search.assert_not_called()


@pytest.mark.asyncio
async def test_recall_not_routed_to_knowledge(mock_ksor_search):
    """Recall tool calls should NOT go through query_clinic_knowledge."""
    from app.gemini_tools import TOOL_HANDLERS

    handler = TOOL_HANDLERS.get("check_recall_status")
    assert handler is not None

    result = handler(patient_id="p123")
    assert result["status"] == "not_implemented"
    mock_ksor_search.assert_not_called()
