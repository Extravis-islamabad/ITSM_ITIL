from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager_or_above
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import PaginatedResponse
from app.core.security import get_password_hash
from datetime import datetime
import math

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new user (Manager+ only)"""
    
    # Check if user already exists by email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Verify role exists
    if user_data.role_id:
        role = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
    
    try:
        # Create user
        user = User(
            email=user_data.email,
            username=user_data.username or user_data.email.split('@')[0],
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            phone=user_data.phone,
            employee_id=user_data.employee_id,
            is_active=True,
            is_verified=False,
            is_superuser=False,
            timezone=user_data.timezone or 'UTC',
            language=user_data.language or 'en',
            role_id=user_data.role_id,
            department_id=user_data.department_id,
            manager_id=user_data.manager_id,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            employee_id=user.employee_id,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            avatar_url=user.avatar_url,  # ✅ Add this
            timezone=user.timezone,
            language=user.language,
            role_id=user.role_id,
            role_name=user.role.name if user.role else None,
            department_id=user.department_id,
            manager_id=user.manager_id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.get("")
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    role_id: Optional[int] = None,
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of users"""
    query = db.query(User)

    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.username.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if role_id:
        query = query.filter(User.role_id == role_id)

    if department_id:
        query = query.filter(User.department_id == department_id)

    # Get total count
    total = query.count()

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Get paginated users
    users = query.offset(skip).limit(page_size).all()

    # Build response items
    items = [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "phone": u.phone,
            "employee_id": u.employee_id,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "is_superuser": u.is_superuser,
            "avatar_url": u.avatar_url,
            "timezone": u.timezone,
            "language": u.language,
            "role_id": u.role_id,
            "role": u.role.name if u.role else None,
            "department_id": u.department_id,
            "department": u.department.name if u.department else None,
            "manager_id": u.manager_id,
            "created_at": u.created_at,
            "updated_at": u.updated_at,
            "last_login": u.last_login
        }
        for u in users
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        phone=user.phone,
        employee_id=user.employee_id,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        avatar_url=user.avatar_url,  # ✅ Add this
        timezone=user.timezone,
        language=user.language,
        role_id=user.role_id,
        role_name=user.role.name if user.role else None,
        department_id=user.department_id,
        manager_id=user.manager_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update a user (Manager+ only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    
    # Hash password if provided
    if 'password' in update_data and update_data['password']:
        update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
    
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(user)
        
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            employee_id=user.employee_id,
            is_active=user.is_active,
            is_verified=user.is_verified,
            is_superuser=user.is_superuser,
            avatar_url=user.avatar_url,  # ✅ Add this
            timezone=user.timezone,
            language=user.language,
            role_id=user.role_id,
            role_name=user.role.name if user.role else None,
            department_id=user.department_id,
            manager_id=user.manager_id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete a user (Manager+ only)"""
    from app.models.ticket import Ticket
    from app.models.notification import Notification
    from app.models.change import Change, ChangeTask, ChangeActivity
    from app.models.problem import Problem, ProblemActivity, ProblemComment, ProblemAttachment, ProblemIncidentLink
    from app.models.group import group_members
    from app.models.notification_preference import NotificationPreference

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Prevent deleting superuser
    if user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete superuser account"
        )

    try:
        # Check if user has created tickets - if so, prevent deletion
        created_tickets = db.query(Ticket).filter(Ticket.requester_id == user_id).count()
        if created_tickets > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user. User has {created_tickets} ticket(s) as requester. Please reassign or delete these tickets first."
            )

        # Check if user has created changes - if so, prevent deletion
        created_changes = db.query(Change).filter(Change.requester_id == user_id).count()
        if created_changes > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete user. User has {created_changes} change(s) as requester. Please reassign or delete these changes first."
            )

        # ============ TICKETS ============
        # Unassign user from any assigned tickets
        db.query(Ticket).filter(Ticket.assignee_id == user_id).update(
            {"assignee_id": None}, synchronize_session=False
        )
        db.query(Ticket).filter(Ticket.resolved_by_id == user_id).update(
            {"resolved_by_id": None}, synchronize_session=False
        )
        db.query(Ticket).filter(Ticket.closed_by_id == user_id).update(
            {"closed_by_id": None}, synchronize_session=False
        )
        db.query(Ticket).filter(Ticket.approved_by_id == user_id).update(
            {"approved_by_id": None}, synchronize_session=False
        )

        # ============ CHANGES ============
        # Clear user references in changes
        db.query(Change).filter(Change.owner_id == user_id).update(
            {"owner_id": None}, synchronize_session=False
        )
        db.query(Change).filter(Change.implementer_id == user_id).update(
            {"implementer_id": None}, synchronize_session=False
        )
        db.query(Change).filter(Change.cab_approved_by_id == user_id).update(
            {"cab_approved_by_id": None}, synchronize_session=False
        )
        db.query(Change).filter(Change.closed_by_id == user_id).update(
            {"closed_by_id": None}, synchronize_session=False
        )
        # Clear user from change tasks
        db.query(ChangeTask).filter(ChangeTask.assigned_to_id == user_id).update(
            {"assigned_to_id": None}, synchronize_session=False
        )

        # ============ PROBLEMS ============
        # Clear user references in problems
        db.query(Problem).filter(Problem.assigned_to_id == user_id).update(
            {"assigned_to_id": None}, synchronize_session=False
        )

        # ============ NOTIFICATIONS ============
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)

        # ============ NOTIFICATION PREFERENCES ============
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).delete(synchronize_session=False)

        # ============ GROUP MEMBERSHIPS ============
        # Remove user from all groups
        db.execute(group_members.delete().where(group_members.c.user_id == user_id))

        # Delete the user
        db.delete(user)
        db.commit()
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )