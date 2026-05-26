from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from functools import wraps

from app.core.security import decode_token, CREDENTIALS_EXCEPTION
from app.core.rbac import Role, Permission, has_permission
from app.db.session import get_db
from app.models.user import User

# ── NEW ──
import redis.asyncio as aioredis
from app.core.config import settings
# ─────────

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials, expected_type="access")
    user_id: str = payload.get("sub")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise CREDENTIALS_EXCEPTION
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


def require_permission(permission: Permission):
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: '{permission.value}' required",
            )
        return current_user
    return _check


def require_role(*roles: Role):
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {[r.value for r in roles]}",
            )
        return current_user
    return _check


# Convenience shortcuts
RequireAdmin = Depends(require_role(Role.ADMIN))
RequireManagerOrAbove = Depends(require_role(Role.ADMIN, Role.MANAGER))


# ── NEW: Redis dependency for ML endpoints ────────────────────────────────
async def get_redis():
    """Yield an async Redis client, then close it."""
    client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    try:
        yield client
    finally:
        await client.aclose()
# ─────────────────────────────────────────────────────────────────────────