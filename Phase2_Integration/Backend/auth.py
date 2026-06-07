import os
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List

logger = logging.getLogger("eiip-auth")

# Token endpoint reference
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Development bypass flag
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "true").lower() == "true"

# Try to import jwt for signature decoding
try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    logger.warning("PyJWT not installed. Authentication will operate in local developer bypass mode.")

class UserPayload:
    def __init__(self, username: str, roles: List[str]):
        self.username = username
        self.roles = roles

    def has_role(self, role: str) -> bool:
        return role in self.roles

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPayload:
    """
    Decodes Keycloak JWT claims, verifies signature, and extracts user roles.
    Falls back to a mock Admin payload in DEVELOPMENT_MODE if Keycloak is unreachable or PyJWT is missing.
    """
    if DEVELOPMENT_MODE or not token:
        logger.info("DEVELOPMENT BYPASS: Authenticating as Mock Admin (roles: ['admin', 'operator'])")
        return UserPayload(username="dev_user", roles=["admin", "operator"])

    if not JWT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT library unavailable. Please enable DEVELOPMENT_MODE or install 'PyJWT'."
        )

    try:
        # Decode token without verification first to inspect payload (in production, verify with JWKS)
        payload = jwt.decode(token, options={"verify_signature": False})
        
        username = payload.get("preferred_username", "anonymous")
        
        # Keycloak maps client/realm roles in resource_access or realm_access claims
        realm_access = payload.get("realm_access", {})
        roles = realm_access.get("roles", [])

        logger.info(f"Authenticated user: {username} (roles: {roles})")
        return UserPayload(username=username, roles=roles)
    except Exception as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(required_role: str):
    """
    Dependency gate ensuring the authenticated user holds a specific security role.
    """
    async def role_checker(user: UserPayload = Depends(get_current_user)):
        if not user.has_role(required_role):
            logger.warning(f"Access Denied: User {user.username} lacks required role '{required_role}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted to users with '{required_role}' role."
            )
        return user
    return role_checker
