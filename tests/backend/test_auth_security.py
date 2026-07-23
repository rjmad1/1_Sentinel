import pytest
from fastapi import HTTPException
from Phase2_Integration.Backend.auth import get_current_user

@pytest.mark.asyncio
async def test_auth_bypass_prevented_in_production(monkeypatch):
    # Set DEVELOPMENT_MODE to false (Production Mode)
    monkeypatch.setenv("DEVELOPMENT_MODE", "false")
    
    # Passing token=None or empty token must raise HTTP 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token=None)
    
    assert exc_info.value.status_code == 401
    assert "Authentication credentials were not provided" in exc_info.value.detail

@pytest.mark.asyncio
async def test_dev_mode_bypass_allowed(monkeypatch):
    # Set DEVELOPMENT_MODE to true
    monkeypatch.setenv("DEVELOPMENT_MODE", "true")
    
    user = await get_current_user(token=None)
    assert user.username == "dev_user"
    assert "admin" in user.roles
