"""Credits RPC wrapper.

Calls the Supabase Postgres functions we defined in the migrations:
  - deduct_credit(user_id, reason, metadata) -> bool
  - add_credits(user_id, amount, reason, metadata) -> bool
  - record_purchase(...) -> 'recorded' | 'already_processed'

Uses the service role key so RLS is bypassed. Never expose this key to the
frontend.
"""

import logging
import os
from typing import Optional

import httpx
from fastapi import HTTPException, status

log = logging.getLogger("prompt2print.credits")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required"
    )

_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


def _rpc(fn_name: str, payload: dict) -> httpx.Response:
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn_name}"
    try:
        with httpx.Client(timeout=10.0) as client:
            return client.post(url, json=payload, headers=_HEADERS)
    except httpx.HTTPError as e:
        log.exception("Supabase RPC network error for %s", fn_name)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Credits service unreachable: {e}",
        )


def deduct_credit(
    user_id: str, reason: str, metadata: Optional[dict] = None
) -> bool:
    """Atomically deduct 1 credit. Returns True if deducted, False if user has 0."""
    resp = _rpc(
        "deduct_credit",
        {
            "p_user_id": user_id,
            "p_reason": reason,
            "p_metadata": metadata or {},
        },
    )
    if resp.status_code != 200:
        log.error("deduct_credit RPC failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Credits service error",
        )
    return bool(resp.json())


def add_credits(
    user_id: str, amount: int, reason: str, metadata: Optional[dict] = None
) -> bool:
    """Add credits to a user (used for refunds and purchases). Returns True on success."""
    resp = _rpc(
        "add_credits",
        {
            "p_user_id": user_id,
            "p_amount": amount,
            "p_reason": reason,
            "p_metadata": metadata or {},
        },
    )
    if resp.status_code != 200:
        log.error("add_credits RPC failed: %s %s", resp.status_code, resp.text[:200])
        return False
    return bool(resp.json())


def require_and_deduct_credit(
    user_id: str, reason: str, metadata: Optional[dict] = None
) -> None:
    """Deduct 1 credit or raise 402 Payment Required if the user has none."""
    ok = deduct_credit(user_id, reason, metadata)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "out_of_credits",
                "message": "You've used all your worksheets. Upgrade to keep generating.",
            },
        )


def refund_credit(user_id: str, reason: str, metadata: Optional[dict] = None) -> None:
    """Refund 1 credit on generation pipeline failure. Never raises — best effort."""
    try:
        ok = add_credits(user_id, 1, reason, metadata)
        if not ok:
            log.error("Refund failed for user=%s reason=%s", user_id, reason)
    except Exception:
        log.exception("Refund threw unexpectedly for user=%s", user_id)


def record_purchase(
    user_id: str,
    order_id: str,
    variant_id: str,
    credits: int,
    total_cents: int,
    currency: str = "USD",
    raw_payload: Optional[dict] = None,
) -> str:
    """Record a purchase in the purchases table. Idempotent via unique constraint
    on provider_order_id.

    Returns:
      'recorded'          - newly inserted; caller should grant credits
      'already_processed' - duplicate webhook; caller should NOT re-grant credits
    """
    resp = _rpc(
        "record_purchase",
        {
            "p_user_id": user_id,
            "p_order_id": order_id,
            "p_variant_id": variant_id,
            "p_credits": credits,
            "p_total_cents": total_cents,
            "p_currency": currency,
            "p_raw_payload": raw_payload or {},
        },
    )
    if resp.status_code != 200:
        log.error("record_purchase RPC failed: %s %s", resp.status_code, resp.text[:200])
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Purchase record service error",
        )
    return resp.json()  # 'recorded' or 'already_processed'