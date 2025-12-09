from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager_or_above
from app.schemas.sla_policy import (
    SLAPolicyCreate,
    SLAPolicyUpdate,
    SLAPolicyResponse
)
from app.models.user import User
from app.models.sla_policy import SLAPolicy

router = APIRouter(prefix="/sla-policies", tags=["SLA Policies"])


@router.get("", response_model=List[SLAPolicyResponse])
async def get_sla_policies(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all SLA policies"""
    query = db.query(SLAPolicy)

    if is_active is not None:
        query = query.filter(SLAPolicy.is_active == is_active)

    policies = query.offset(skip).limit(limit).all()
    return policies


@router.get("/{policy_id}", response_model=SLAPolicyResponse)
async def get_sla_policy(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SLA policy by ID"""
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")
    return policy


@router.post("", response_model=SLAPolicyResponse)
async def create_sla_policy(
    policy_data: SLAPolicyCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new SLA policy (Manager+ only)"""
    # If this is set as default, unset all other defaults
    if policy_data.is_default:
        db.query(SLAPolicy).update({SLAPolicy.is_default: False})

    policy = SLAPolicy(**policy_data.dict())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/{policy_id}", response_model=SLAPolicyResponse)
async def update_sla_policy(
    policy_id: int,
    policy_data: SLAPolicyUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update an SLA policy (Manager+ only)"""
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")

    # If this is being set as default, unset all other defaults
    if policy_data.is_default:
        db.query(SLAPolicy).filter(SLAPolicy.id != policy_id).update({SLAPolicy.is_default: False})

    update_dict = policy_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(policy, key, value)

    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/{policy_id}")
async def delete_sla_policy(
    policy_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete an SLA policy (Manager+ only)"""
    policy = db.query(SLAPolicy).filter(SLAPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SLA policy not found")

    # Check if policy is in use
    if policy.tickets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete SLA policy that is in use by tickets"
        )

    db.delete(policy)
    db.commit()
    return {"message": "SLA policy deleted successfully"}


@router.get("/default/policy", response_model=SLAPolicyResponse)
async def get_default_sla_policy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the default SLA policy"""
    policy = db.query(SLAPolicy).filter(SLAPolicy.is_default == True).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No default SLA policy found")
    return policy
