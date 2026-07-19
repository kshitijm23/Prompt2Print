"""LemonSqueezy webhook helpers: signature verification, payload parsing.

Webhook flow:
1. LemonSqueezy sends POST to /lemonsqueezy-webhook with signed body
2. verify_signature() checks HMAC-SHA256 using LEMONSQUEEZY_WEBHOOK_SECRET
3. parse_order_created() extracts user_id (from custom_data), variant_id, credits
4. main.py grants credits via credits.add_credits() RPC
"""

import hashlib
import hmac
import logging
import os
from typing import Optional

log = logging.getLogger("prompt2print.lemonsqueezy")

LEMONSQUEEZY_WEBHOOK_SECRET = os.environ.get("LEMONSQUEEZY_WEBHOOK_SECRET")

if not LEMONSQUEEZY_WEBHOOK_SECRET:
    raise RuntimeError(
        "LEMONSQUEEZY_WEBHOOK_SECRET env var is required "
        "(LemonSqueezy dashboard → Settings → Webhooks → Signing secret)"
    )

# Map variant_id (numeric, as string) -> credits granted
# UPDATE THESE if you change your product variants.
VARIANT_CREDITS = {
    "1927049": 20,   # Starter — $9.99 for 20 worksheets
    "1927054": 100,  # Classroom — $40 for 100 worksheets
}


def verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """Verify LemonSqueezy's X-Signature header.

    LemonSqueezy signs the raw request body with HMAC-SHA256 using the webhook
    secret. We recompute and compare using constant-time comparison.
    """
    if not signature_header:
        return False
    expected = hmac.new(
        LEMONSQUEEZY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def parse_order_created(payload: dict) -> dict:
    """Extract the fields we care about from an order_created webhook payload.

    LemonSqueezy payload shape (order_created):
    {
      "meta": {
        "event_name": "order_created",
        "custom_data": { "user_id": "<supabase-uuid>" }
      },
      "data": {
        "id": "<order-id>",
        "attributes": {
          "store_id": ...,
          "total": 999,      // cents
          "currency": "USD",
          "first_order_item": {
            "variant_id": 1927049,
            ...
          },
          ...
        }
      }
    }
    """
    meta = payload.get("meta") or {}
    data = payload.get("data") or {}
    attributes = data.get("attributes") or {}
    custom_data = meta.get("custom_data") or {}
    first_item = attributes.get("first_order_item") or {}

    variant_id = str(first_item.get("variant_id", ""))
    user_id = custom_data.get("user_id")
    order_id = str(data.get("id", ""))
    event_name = meta.get("event_name", "")

    return {
        "event_name": event_name,
        "order_id": order_id,
        "user_id": user_id,
        "variant_id": variant_id,
        "credits": VARIANT_CREDITS.get(variant_id, 0),
        "total_cents": int(attributes.get("total", 0) or 0),
        "currency": attributes.get("currency", "USD") or "USD",
    }