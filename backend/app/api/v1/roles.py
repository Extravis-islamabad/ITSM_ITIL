from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_permission, require_admin
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, RoleDetailResponse, PermissionResponse
from app.schemas.common import ResponseBase, PaginatedResponse
from app.services.role_service import RoleService
from app.models.user import User
from math import ceil

router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
    dependencies=[Depends(require_admin())]  # All role management endpoints require Admin
)

@router.post("", response_model=RoleResponse, dependencies=[Depends(check_permission("roles", "create"))])
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new role"""
    role = RoleService.create_role(db, role_data, created_by=current_user.id)
    return role

@router.get("", response_model=PaginatedResponse)
async def get_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    role_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of roles"""
    skip = (page - 1) * page_size
    roles, total = RoleService.get_roles(
        db,
        skip=skip,
        limit=page_size,
        role_type=role_type,
        is_active=is_active
    )
    
    role_list = [RoleResponse.model_validate(role) for role in roles]
    
    return PaginatedResponse(
        items=[r.model_dump() for r in role_list],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available permissions"""
    permissions = RoleService.get_all_permissions(db)
    return [PermissionResponse.model_validate(p) for p in permissions]

@router.get("/{role_id}", response_model=RoleDetailResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get role by ID"""
    role = RoleService.get_role(db, role_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Count users with this role
    from app.models.user import User as UserModel
    user_count = db.query(UserModel).filter(UserModel.role_id == role_id).count()
    
    role_data = RoleDetailResponse.model_validate(role)
    role_data.user_count = user_count
    
    return role_data

@router.put("/{role_id}", response_model=RoleResponse, dependencies=[Depends(check_permission("roles", "update"))])
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update role"""
    role = RoleService.update_role(db, role_id, role_data, updated_by=current_user.id)
    return role

@router.delete("/{role_id}", response_model=ResponseBase, dependencies=[Depends(check_permission("roles", "delete"))])
async def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete role"""
    RoleService.delete_role(db, role_id, deleted_by=current_user.id)
    
    return ResponseBase(
        success=True,
        message="Role deleted successfully"
    )