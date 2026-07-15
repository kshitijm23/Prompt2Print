"""Supabase JWT verification for FastAPI.

Uses Supabase's JWKS endpoint to verify ES256-signed tokens. Falls back
to the legacy HS256 secret if configured (older Supabase projects).
"""

import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")  # legacy HS256, optional

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL env var is required"
    )

# Supabase's JWKS endpoint for asymmetric (ES256) signing keys
_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
_jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)

_bearer = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """Try ES256 via JWKS first, fall back to HS256 with the shared secret."""
    unverified_header = jwt.get_unverified_header(token)
    alg = unverified_header.get("alg", "")

    if alg == "ES256":
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
    elif alg == "HS256":
        if not SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError(
                "Token uses HS256 but SUPABASE_JWT_SECRET is not configured"
            )
        return jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    else:
        raise jwt.InvalidTokenError(f"Unsupported algorithm: {alg}")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """FastAPI dependency: verify the Supabase JWT and return the user's UUID.

    Raises 401 if the token is missing, expired, or invalid.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    token = credentials.credentials
    try:
        payload = _decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired — sign in again",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)[:100]}",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no subject",
        )
    return user_id