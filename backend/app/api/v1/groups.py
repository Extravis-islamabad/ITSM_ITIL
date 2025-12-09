from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager_or_above
from app.models.user import User
from app.models.group import Group, group_members
from datetime import datetime

router = APIRouter(prefix="/groups", tags=["Groups"])


# Schemas
class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    lead_id: Optional[int] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    lead_id: Optional[int] = None
    is_active: Optional[bool] = None


class GroupMemberAdd(BaseModel):
    user_ids: List[int]


class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    lead_id: Optional[int]
    lead_name: Optional[str]
    is_active: bool
    member_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    members: List[dict]


@router.get("", response_model=List[GroupResponse])
async def get_groups(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups"""
    query = db.query(Group)

    if is_active is not None:
        query = query.filter(Group.is_active == is_active)

    groups = query.order_by(Group.name).all()

    return [
        {
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "lead_id": g.lead_id,
            "lead_name": g.lead.full_name if g.lead else None,
            "is_active": g.is_active,
            "member_count": len(g.members),
            "created_at": g.created_at
        }
        for g in groups
    ]


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single group with members"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "lead_id": group.lead_id,
        "lead_name": group.lead.full_name if group.lead else None,
        "is_active": group.is_active,
        "member_count": len(group.members),
        "created_at": group.created_at,
        "members": [
            {
                "id": m.id,
                "full_name": m.full_name,
                "email": m.email,
                "role": m.role.name if m.role else None
            }
            for m in group.members
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new group (Manager+ only)"""
    # Check for duplicate name
    existing = db.query(Group).filter(Group.name == group_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group with this name already exists"
        )

    # Validate lead exists if provided
    if group_data.lead_id:
        lead = db.query(User).filter(User.id == group_data.lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lead user not found"
            )

    group = Group(
        name=group_data.name,
        description=group_data.description,
        lead_id=group_data.lead_id,
        is_active=True
    )

    db.add(group)
    db.commit()
    db.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "lead_id": group.lead_id,
        "lead_name": group.lead.full_name if group.lead else None,
        "is_active": group.is_active,
        "member_count": 0,
        "created_at": group.created_at
    }


@router.put("/{group_id}")
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update a group (Manager+ only)"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check for duplicate name if name is being updated
    if group_data.name and group_data.name != group.name:
        existing = db.query(Group).filter(
            Group.name == group_data.name,
            Group.id != group_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group with this name already exists"
            )

    # Validate lead exists if provided
    if group_data.lead_id:
        lead = db.query(User).filter(User.id == group_data.lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lead user not found"
            )

    # Update fields
    update_data = group_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(group, field, value)

    group.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(group)

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "lead_id": group.lead_id,
        "lead_name": group.lead.full_name if group.lead else None,
        "is_active": group.is_active,
        "member_count": len(group.members),
        "created_at": group.created_at
    }


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete a group (Manager+ only) - Soft delete"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Soft delete
    group.is_active = False
    group.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Group deleted successfully"}


@router.post("/{group_id}/members")
async def add_members(
    group_id: int,
    member_data: GroupMemberAdd,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Add members to a group (Manager+ only)"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get users to add
    users = db.query(User).filter(User.id.in_(member_data.user_ids)).all()

    if len(users) != len(member_data.user_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users not found"
        )

    # Add users to group
    for user in users:
        if user not in group.members:
            group.members.append(user)

    db.commit()

    return {
        "message": f"Added {len(users)} members to group",
        "member_count": len(group.members)
    }


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Remove a member from a group (Manager+ only)"""
    group = db.query(Group).filter(Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user in group.members:
        group.members.remove(user)
        db.commit()

    return {"message": "Member removed from group"}
