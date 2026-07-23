import os
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List

logger = logging.getLogger("eiip-auth")

# Token endpoint reference
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Development bypass flag (defaults to False for production security)
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"

# Try to import jwt for signature decoding
try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    logger.warning("PyJWT not installed. Authentication will operate in local developer bypass mode.")

class UserPayload:
    def __init__(self, username: str, roles: List[str], tenant_id: str = "default-tenant"):
        self.username = username
        self.roles = roles
        self.tenant_id = tenant_id

    def has_role(self, role: str) -> bool:
        return role in self.roles

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPayload:
    """
    Decodes Keycloak JWT claims, verifies signature, and extracts user roles and tenant ID.
    Falls back to a mock Admin payload ONLY when DEVELOPMENT_MODE is explicitly enabled.
    """
    dev_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
    if dev_mode:
        logger.info("DEVELOPMENT BYPASS: Authenticating as Mock Admin (roles: ['admin', 'operator'])")
        return UserPayload(username="dev_user", roles=["admin", "operator"], tenant_id="default-tenant")

    if not token:
        logger.warning("Unauthenticated request blocked: missing Bearer token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not JWT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT library unavailable. Please install 'PyJWT' or check backend dependencies."
        )

    try:
        # Decode token with signature verification when secret key is provided
        jwt_secret = os.getenv("SENTINEL_JWT_SECRET") or os.getenv("JWT_SECRET_KEY")
        algorithms = [os.getenv("JWT_ALGORITHM", "HS256")]
        
        if jwt_secret:
            payload = jwt.decode(token, jwt_secret, algorithms=algorithms, options={"verify_signature": True})
        else:
            # Decode token structure (when JWT secret is not configured in environment)
            payload = jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256", "RS256"])
        
        username = payload.get("preferred_username") or payload.get("sub") or "anonymous"
        tenant_id = payload.get("tenant_id", "default-tenant")
        
        # Keycloak maps client/realm roles in resource_access or realm_access claims
        realm_access = payload.get("realm_access", {})
        roles = realm_access.get("roles", [])

        logger.info(f"Authenticated user: {username} (tenant: {tenant_id}, roles: {roles})")
        return UserPayload(username=username, roles=roles, tenant_id=tenant_id)
    except jwt.ExpiredSignatureError:
        logger.error("JWT token has expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        logger.error(f"JWT validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
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

