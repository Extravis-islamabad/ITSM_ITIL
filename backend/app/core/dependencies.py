from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from typing import Optional

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user

def check_permission(module: str, action: str):
    """Check if user has permission for module and action"""
    def permission_checker(current_user: User = Depends(get_current_user)):
        # Superusers have all permissions
        if current_user.is_superuser:
            return current_user

        # Check role permissions
        if current_user.role:
            for permission in current_user.role.permissions:
                # Check both resource and module fields for compatibility
                perm_module = getattr(permission, 'module', None) or getattr(permission, 'resource', None)
                if perm_module == module:
                    perm_action = getattr(permission, 'action', None)
                    if perm_action == action or perm_action == 'all':
                        return current_user
                    # Also check actions list if exists
                    actions = getattr(permission, 'actions', None) or []
                    if action in actions or 'all' in actions:
                        return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to {action} {module}"
        )

    return permission_checker


def require_admin():
    """Require user to be admin or superuser"""
    def admin_checker(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user

        if current_user.role:
            # Normalize role name for comparison (case-insensitive)
            role_name = current_user.role.name.lower().replace(' ', '_').replace('-', '_')
            allowed_roles = ['admin', 'system_administrator', 'administrator']
            if role_name in allowed_roles:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return admin_checker


def require_manager_or_above():
    """Require user to be manager, admin, or superuser"""
    def manager_checker(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user

        if current_user.role:
            # Normalize role name for comparison
            role_name = current_user.role.name.lower().replace(' ', '_').replace('-', '_')
            allowed_roles = ['admin', 'system_administrator', 'administrator', 'manager', 'it_manager', 'service_manager']
            if role_name in allowed_roles:
                return current_user

        # Also check role level if exists
        if current_user.role and hasattr(current_user.role, 'level'):
            if current_user.role.level >= 80:  # Manager level or above
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin access required"
        )

    return manager_checker


def require_teamlead_or_above():
    """Require user to be team lead, manager, admin, or superuser"""
    def teamlead_checker(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user

        if current_user.role:
            # Normalize role name for comparison
            role_name = current_user.role.name.lower().replace(' ', '_').replace('-', '_')
            allowed_roles = [
                'admin', 'system_administrator', 'administrator',
                'manager', 'it_manager', 'service_manager',
                'team_lead', 'teamlead', 'team_leader', 'lead'
            ]
            if role_name in allowed_roles:
                return current_user

        # Check role level if exists
        if current_user.role and hasattr(current_user.role, 'level'):
            if current_user.role.level >= 60:  # Team Lead level or above
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Team Lead or above access required"
        )

    return teamlead_checker


def require_agent_or_above():
    """Require user to be at least an agent"""
    def agent_checker(current_user: User = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user

        allowed_roles = ['admin', 'manager', 'team_lead', 'agent',
                        'System Administrator', 'Manager', 'Team Lead', 'Support Agent']

        if current_user.role and current_user.role.name in allowed_roles:
            return current_user

        # Check role level
        if current_user.role and hasattr(current_user.role, 'level'):
            if current_user.role.level >= 40:  # Agent level or above
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent access or above required"
        )

    return agent_checker