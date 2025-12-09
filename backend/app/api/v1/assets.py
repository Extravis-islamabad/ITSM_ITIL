from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, desc, extract
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import qrcode
import io
import base64
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from pathlib import Path
import os

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_agent_or_above, require_manager_or_above
from app.models.user import User
from app.models.asset import (
    Asset, AssetType, AssetAssignment, AssetRelationship,
    AssetHistory, AssetContract, AssetStatus, AssetCondition
)
from app.schemas.asset import (
    AssetTypeCreate, AssetTypeUpdate, AssetTypeResponse,
    AssetCreate, AssetUpdate, AssetResponse, AssetDetailResponse,
    AssetAssignmentCreate, AssetAssignmentReturn, AssetAssignmentResponse,
    AssetRelationshipCreate, AssetRelationshipResponse,
    AssetContractCreate, AssetContractUpdate, AssetContractResponse,
    AssetHistoryResponse, AssetAnalytics, AssetQRCodeResponse
)

router = APIRouter()


# ==================== Helper Functions ====================

def log_asset_history(
    db: Session,
    asset_id: int,
    action: str,
    user_id: int,
    description: Optional[str] = None,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None
):
    """Create asset history entry"""
    history = AssetHistory(
        asset_id=asset_id,
        action=action,
        user_id=user_id,
        description=description,
        field_name=field_name,
        old_value=str(old_value) if old_value else None,
        new_value=str(new_value) if new_value else None
    )
    db.add(history)
    db.commit()


def generate_qr_code(data: str) -> str:
    """Generate QR code and return base64 encoded image"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


# ==================== Asset Types ====================

@router.get("/types", response_model=List[AssetTypeResponse])
async def get_asset_types(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get all asset types"""
    query = db.query(AssetType)

    if is_active is not None:
        query = query.filter(AssetType.is_active == is_active)

    types = query.order_by(AssetType.name).all()

    # Add asset counts
    result = []
    for asset_type in types:
        type_dict = {
            "id": asset_type.id,
            "name": asset_type.name,
            "description": asset_type.description,
            "icon": asset_type.icon,
            "color": asset_type.color,
            "parent_id": asset_type.parent_id,
            "is_hardware": asset_type.is_hardware,
            "requires_serial": asset_type.requires_serial,
            "is_active": asset_type.is_active,
            "created_at": asset_type.created_at,
            "updated_at": asset_type.updated_at,
            "asset_count": db.query(Asset).filter(Asset.asset_type_id == asset_type.id).count()
        }
        result.append(AssetTypeResponse(**type_dict))

    return result


@router.post("/types", response_model=AssetTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_asset_type(
    asset_type: AssetTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above())
):
    """Create new asset type (Manager+ only)"""
    # Check if name already exists
    existing = db.query(AssetType).filter(AssetType.name == asset_type.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset type with this name already exists"
        )

    db_asset_type = AssetType(**asset_type.model_dump())
    db.add(db_asset_type)
    db.commit()
    db.refresh(db_asset_type)

    return AssetTypeResponse(
        **db_asset_type.__dict__,
        asset_count=0
    )


@router.put("/types/{type_id}", response_model=AssetTypeResponse)
async def update_asset_type(
    type_id: int,
    asset_type: AssetTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above())
):
    """Update asset type (Manager+ only)"""
    db_asset_type = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not db_asset_type:
        raise HTTPException(status_code=404, detail="Asset type not found")

    update_data = asset_type.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_asset_type, field, value)

    db.commit()
    db.refresh(db_asset_type)

    asset_count = db.query(Asset).filter(Asset.asset_type_id == db_asset_type.id).count()

    return AssetTypeResponse(
        **db_asset_type.__dict__,
        asset_count=asset_count
    )


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above())
):
    """Delete asset type (Manager+ only)"""
    db_asset_type = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not db_asset_type:
        raise HTTPException(status_code=404, detail="Asset type not found")

    # Check if there are assets using this type
    asset_count = db.query(Asset).filter(Asset.asset_type_id == type_id).count()
    if asset_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete asset type. {asset_count} assets are using this type."
        )

    db.delete(db_asset_type)
    db.commit()


# ==================== Assets ====================

@router.get("", response_model=dict)
async def get_assets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    asset_type_id: Optional[int] = None,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    department_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    is_assigned: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get assets with pagination and filters (Agent+ only)"""
    query = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department),
        joinedload(Asset.assigned_to),
        joinedload(Asset.created_by)
    )

    # Apply filters
    if search:
        search_filter = or_(
            Asset.asset_tag.ilike(f"%{search}%"),
            Asset.name.ilike(f"%{search}%"),
            Asset.serial_number.ilike(f"%{search}%"),
            Asset.model.ilike(f"%{search}%"),
            Asset.manufacturer.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    if asset_type_id:
        query = query.filter(Asset.asset_type_id == asset_type_id)

    if status:
        query = query.filter(Asset.status == status)

    if condition:
        query = query.filter(Asset.condition == condition)

    if department_id:
        query = query.filter(Asset.department_id == department_id)

    if assigned_to_id:
        query = query.filter(Asset.assigned_to_id == assigned_to_id)

    if is_assigned is not None:
        if is_assigned:
            query = query.filter(Asset.assigned_to_id.isnot(None))
        else:
            query = query.filter(Asset.assigned_to_id.is_(None))

    # Get total count
    total = query.count()

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    skip = (page - 1) * page_size

    # Get assets for current page
    assets = query.order_by(desc(Asset.created_at)).offset(skip).limit(page_size).all()

    # Build response items
    items = []
    for asset in assets:
        asset_dict = {
            **asset.__dict__,
            "asset_type_name": asset.asset_type.name if asset.asset_type else None,
            "department_name": asset.department.name if asset.department else None,
            "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
            "assigned_to_email": asset.assigned_to.email if asset.assigned_to else None,
            "created_by_name": asset.created_by.full_name if asset.created_by else None,
            "assignment_count": len(asset.assignments) if asset.assignments else 0,
            "contract_count": len(asset.contracts) if asset.contracts else 0,
            "relationship_count": (
                len(asset.parent_relationships if asset.parent_relationships else []) +
                len(asset.child_relationships if asset.child_relationships else [])
            )
        }
        items.append(AssetResponse(**asset_dict))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/{asset_id}", response_model=AssetDetailResponse)
async def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset by ID with full details (Agent+ only)"""
    asset = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department),
        joinedload(Asset.assigned_to),
        joinedload(Asset.created_by),
        joinedload(Asset.assignments),
        joinedload(Asset.contracts),
        joinedload(Asset.history),
        joinedload(Asset.parent_relationships),
        joinedload(Asset.child_relationships)
    ).filter(Asset.id == asset_id).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Build detailed response
    asset_dict = {
        **asset.__dict__,
        "asset_type_name": asset.asset_type.name if asset.asset_type else None,
        "department_name": asset.department.name if asset.department else None,
        "assigned_to_name": asset.assigned_to.full_name if asset.assigned_to else None,
        "assigned_to_email": asset.assigned_to.email if asset.assigned_to else None,
        "created_by_name": asset.created_by.full_name if asset.created_by else None,
        "assignment_count": len(asset.assignments) if asset.assignments else 0,
        "contract_count": len(asset.contracts) if asset.contracts else 0,
        "relationship_count": (
            len(asset.parent_relationships if asset.parent_relationships else []) +
            len(asset.child_relationships if asset.child_relationships else [])
        ),
        "assignments": [],
        "contracts": [],
        "history": [],
        "parent_relationships": [],
        "child_relationships": []
    }

    # Add assignments
    if asset.assignments:
        for assignment in asset.assignments:
            asset_dict["assignments"].append(AssetAssignmentResponse(
                **assignment.__dict__,
                user_name=assignment.user.full_name if assignment.user else None,
                user_email=assignment.user.email if assignment.user else None,
                assigned_by_name=assignment.assigned_by.full_name if assignment.assigned_by else None,
                asset_name=asset.name,
                asset_tag=asset.asset_tag
            ))

    # Add contracts
    if asset.contracts:
        for contract in asset.contracts:
            from datetime import timezone
            days_until_expiry = (contract.end_date - datetime.now(timezone.utc)).days if contract.end_date else None
            asset_dict["contracts"].append(AssetContractResponse(
                **contract.__dict__,
                created_by_name=contract.created_by.full_name if contract.created_by else None,
                asset_name=asset.name,
                asset_tag=asset.asset_tag,
                days_until_expiry=days_until_expiry,
                is_expired=days_until_expiry < 0 if days_until_expiry is not None else False
            ))

    # Add history
    if asset.history:
        for history in sorted(asset.history, key=lambda x: x.created_at, reverse=True):
            asset_dict["history"].append(AssetHistoryResponse(
                **history.__dict__,
                user_name=history.user.full_name if history.user else None
            ))

    # Add relationships
    if asset.parent_relationships:
        for rel in asset.parent_relationships:
            asset_dict["parent_relationships"].append(AssetRelationshipResponse(
                **rel.__dict__,
                parent_asset_name=rel.parent_asset.name if rel.parent_asset else None,
                parent_asset_tag=rel.parent_asset.asset_tag if rel.parent_asset else None,
                child_asset_name=rel.child_asset.name if rel.child_asset else None,
                child_asset_tag=rel.child_asset.asset_tag if rel.child_asset else None,
                created_by_name=rel.created_by.full_name if rel.created_by else None
            ))

    if asset.child_relationships:
        for rel in asset.child_relationships:
            asset_dict["child_relationships"].append(AssetRelationshipResponse(
                **rel.__dict__,
                parent_asset_name=rel.parent_asset.name if rel.parent_asset else None,
                parent_asset_tag=rel.parent_asset.asset_tag if rel.parent_asset else None,
                child_asset_name=rel.child_asset.name if rel.child_asset else None,
                child_asset_tag=rel.child_asset.asset_tag if rel.child_asset else None,
                created_by_name=rel.created_by.full_name if rel.created_by else None
            ))

    return AssetDetailResponse(**asset_dict)


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Create new asset (Agent+ only)"""
    # Check if asset tag already exists
    existing = db.query(Asset).filter(Asset.asset_tag == asset.asset_tag).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset with this asset tag already exists"
        )

    # Create asset
    asset_data = asset.model_dump()
    asset_data["created_by_id"] = current_user.id

    # Store assigned_to_id before creating asset (for assignment record)
    assigned_to_id = asset_data.get("assigned_to_id")

    db_asset = Asset(**asset_data)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)

    # Log creation
    log_asset_history(
        db, db_asset.id, "CREATED", current_user.id,
        description=f"Asset created: {db_asset.name}"
    )

    # Create assignment record if asset is assigned to someone
    if assigned_to_id:
        assignment = AssetAssignment(
            asset_id=db_asset.id,
            user_id=assigned_to_id,
            assigned_by_id=current_user.id,
            assigned_date=datetime.now(timezone.utc),
            is_current=True,
            notes="Initial assignment during asset creation"
        )
        db.add(assignment)
        db.commit()

        # Log assignment in history
        assigned_user = db.query(User).filter(User.id == assigned_to_id).first()
        if assigned_user:
            log_asset_history(
                db, db_asset.id, "ASSIGNED", current_user.id,
                description=f"Asset assigned to {assigned_user.full_name}"
            )

    # Load relationships for response
    db_asset = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department),
        joinedload(Asset.assigned_to),
        joinedload(Asset.created_by),
        joinedload(Asset.assignments)
    ).filter(Asset.id == db_asset.id).first()

    return AssetResponse(
        **db_asset.__dict__,
        asset_type_name=db_asset.asset_type.name if db_asset.asset_type else None,
        department_name=db_asset.department.name if db_asset.department else None,
        assigned_to_name=db_asset.assigned_to.full_name if db_asset.assigned_to else None,
        assigned_to_email=db_asset.assigned_to.email if db_asset.assigned_to else None,
        created_by_name=db_asset.created_by.full_name if db_asset.created_by else None,
        assignment_count=len(db_asset.assignments) if db_asset.assignments else 0,
        contract_count=0,
        relationship_count=0
    )


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: int,
    asset: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Update asset (Agent+ only)"""
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset.model_dump(exclude_unset=True)

    # Track changes for history
    for field, new_value in update_data.items():
        old_value = getattr(db_asset, field)
        if old_value != new_value:
            log_asset_history(
                db, asset_id, "UPDATED", current_user.id,
                field_name=field,
                old_value=str(old_value),
                new_value=str(new_value),
                description=f"Updated {field}"
            )
            setattr(db_asset, field, new_value)

    db.commit()
    db.refresh(db_asset)

    # Load relationships for response
    db_asset = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department),
        joinedload(Asset.assigned_to),
        joinedload(Asset.created_by),
        joinedload(Asset.assignments),
        joinedload(Asset.contracts),
        joinedload(Asset.parent_relationships),
        joinedload(Asset.child_relationships)
    ).filter(Asset.id == asset_id).first()

    return AssetResponse(
        **db_asset.__dict__,
        asset_type_name=db_asset.asset_type.name if db_asset.asset_type else None,
        department_name=db_asset.department.name if db_asset.department else None,
        assigned_to_name=db_asset.assigned_to.full_name if db_asset.assigned_to else None,
        assigned_to_email=db_asset.assigned_to.email if db_asset.assigned_to else None,
        created_by_name=db_asset.created_by.full_name if db_asset.created_by else None,
        assignment_count=len(db_asset.assignments) if db_asset.assignments else 0,
        contract_count=len(db_asset.contracts) if db_asset.contracts else 0,
        relationship_count=(
            len(db_asset.parent_relationships if db_asset.parent_relationships else []) +
            len(db_asset.child_relationships if db_asset.child_relationships else [])
        )
    )


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Delete asset (Agent+ only)"""
    from app.models.ticket import Ticket
    from sqlalchemy.exc import IntegrityError

    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check if asset is linked to any tickets
    ticket_count = db.query(Ticket).filter(Ticket.asset_id == asset_id).count()
    if ticket_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete asset. It is linked to {ticket_count} ticket(s). Please unlink the tickets first."
        )

    try:
        db.delete(db_asset)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete asset. It is referenced by other records in the system."
        )


# ==================== Asset QR Code ====================

@router.get("/{asset_id}/qr-code", response_model=AssetQRCodeResponse)
async def get_asset_qr_code(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Generate and return QR code for asset (Agent+ only)"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # QR code data - encode as URL for easy scanning
    # Format: JSON with asset details for scanner apps
    import json
    qr_data = json.dumps({
        "type": "ITSM_ASSET",
        "id": asset.id,
        "tag": asset.asset_tag,
        "name": asset.name,
        "serial": asset.serial_number,
        "url": f"/assets/{asset.id}"
    })
    qr_code_b64 = generate_qr_code(qr_data)

    # Update asset with QR code URL (in a real app, you'd save the image to storage)
    asset.qr_code = f"/assets/{asset.id}/qr"
    db.commit()

    return AssetQRCodeResponse(
        asset_id=asset.id,
        asset_tag=asset.asset_tag,
        qr_code_url=asset.qr_code,
        qr_code_data=qr_code_b64
    )


# ==================== Asset Assignments ====================

@router.post("/{asset_id}/assign", response_model=AssetAssignmentResponse)
async def assign_asset(
    asset_id: int,
    assignment: AssetAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Assign asset to user (Agent+ only)"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Mark previous assignments as not current
    db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id,
        AssetAssignment.is_current == True
    ).update({"is_current": False})

    # Create new assignment
    db_assignment = AssetAssignment(
        asset_id=asset_id,
        user_id=assignment.user_id,
        assigned_by_id=current_user.id,
        notes=assignment.notes,
        is_current=True
    )
    db.add(db_assignment)

    # Update asset
    asset.assigned_to_id = assignment.user_id
    asset.assigned_date = datetime.now()

    db.commit()
    db.refresh(db_assignment)

    # Log assignment
    user = db.query(User).filter(User.id == assignment.user_id).first()
    log_asset_history(
        db, asset_id, "ASSIGNED", current_user.id,
        description=f"Asset assigned to {user.full_name if user else 'Unknown'}"
    )

    # Load relationships
    db_assignment = db.query(AssetAssignment).options(
        joinedload(AssetAssignment.user),
        joinedload(AssetAssignment.assigned_by),
        joinedload(AssetAssignment.asset)
    ).filter(AssetAssignment.id == db_assignment.id).first()

    return AssetAssignmentResponse(
        **db_assignment.__dict__,
        user_name=db_assignment.user.full_name if db_assignment.user else None,
        user_email=db_assignment.user.email if db_assignment.user else None,
        assigned_by_name=db_assignment.assigned_by.full_name if db_assignment.assigned_by else None,
        asset_name=db_assignment.asset.name if db_assignment.asset else None,
        asset_tag=db_assignment.asset.asset_tag if db_assignment.asset else None
    )


@router.post("/{asset_id}/return", response_model=AssetAssignmentResponse)
async def return_asset(
    asset_id: int,
    return_data: AssetAssignmentReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Return asset from user (Agent+ only)"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Find current assignment
    assignment = db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id,
        AssetAssignment.is_current == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=400, detail="Asset is not currently assigned")

    # Update assignment
    assignment.returned_date = datetime.now()
    assignment.is_current = False
    if return_data.notes:
        assignment.notes = (assignment.notes or "") + f"\nReturn notes: {return_data.notes}"

    # Update asset
    asset.assigned_to_id = None
    asset.assigned_date = None

    db.commit()
    db.refresh(assignment)

    # Log return
    log_asset_history(
        db, asset_id, "RETURNED", current_user.id,
        description=f"Asset returned from {assignment.user.full_name if assignment.user else 'Unknown'}"
    )

    # Load relationships
    assignment = db.query(AssetAssignment).options(
        joinedload(AssetAssignment.user),
        joinedload(AssetAssignment.assigned_by),
        joinedload(AssetAssignment.asset)
    ).filter(AssetAssignment.id == assignment.id).first()

    return AssetAssignmentResponse(
        **assignment.__dict__,
        user_name=assignment.user.full_name if assignment.user else None,
        user_email=assignment.user.email if assignment.user else None,
        assigned_by_name=assignment.assigned_by.full_name if assignment.assigned_by else None,
        asset_name=assignment.asset.name if assignment.asset else None,
        asset_tag=assignment.asset.asset_tag if assignment.asset else None
    )


# ==================== Asset Relationships ====================

@router.post("/{asset_id}/relationships", response_model=AssetRelationshipResponse)
async def create_asset_relationship(
    asset_id: int,
    relationship: AssetRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Create relationship between assets (Agent+ only)"""
    # Verify assets exist
    parent_asset = db.query(Asset).filter(Asset.id == relationship.parent_asset_id).first()
    child_asset = db.query(Asset).filter(Asset.id == relationship.child_asset_id).first()

    if not parent_asset or not child_asset:
        raise HTTPException(status_code=404, detail="One or both assets not found")

    # Create relationship
    db_relationship = AssetRelationship(
        **relationship.model_dump(),
        created_by_id=current_user.id
    )
    db.add(db_relationship)
    db.commit()
    db.refresh(db_relationship)

    # Load relationships
    db_relationship = db.query(AssetRelationship).options(
        joinedload(AssetRelationship.parent_asset),
        joinedload(AssetRelationship.child_asset),
        joinedload(AssetRelationship.created_by)
    ).filter(AssetRelationship.id == db_relationship.id).first()

    return AssetRelationshipResponse(
        **db_relationship.__dict__,
        parent_asset_name=db_relationship.parent_asset.name if db_relationship.parent_asset else None,
        parent_asset_tag=db_relationship.parent_asset.asset_tag if db_relationship.parent_asset else None,
        child_asset_name=db_relationship.child_asset.name if db_relationship.child_asset else None,
        child_asset_tag=db_relationship.child_asset.asset_tag if db_relationship.child_asset else None,
        created_by_name=db_relationship.created_by.full_name if db_relationship.created_by else None
    )


@router.delete("/relationships/{relationship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_relationship(
    relationship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Delete asset relationship (Agent+ only)"""
    relationship = db.query(AssetRelationship).filter(AssetRelationship.id == relationship_id).first()
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    db.delete(relationship)
    db.commit()


# ==================== Asset Contracts ====================

@router.post("/{asset_id}/contracts", response_model=AssetContractResponse, status_code=status.HTTP_201_CREATED)
async def create_asset_contract(
    asset_id: int,
    contract: AssetContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Create asset contract/warranty (Agent+ only)"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db_contract = AssetContract(
        **contract.model_dump(),
        created_by_id=current_user.id
    )
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)

    # Load relationships
    db_contract = db.query(AssetContract).options(
        joinedload(AssetContract.asset),
        joinedload(AssetContract.created_by)
    ).filter(AssetContract.id == db_contract.id).first()

    days_until_expiry = (db_contract.end_date.replace(tzinfo=None) - datetime.now()).days if db_contract.end_date else None

    return AssetContractResponse(
        **db_contract.__dict__,
        created_by_name=db_contract.created_by.full_name if db_contract.created_by else None,
        asset_name=db_contract.asset.name if db_contract.asset else None,
        asset_tag=db_contract.asset.asset_tag if db_contract.asset else None,
        days_until_expiry=days_until_expiry,
        is_expired=days_until_expiry < 0 if days_until_expiry is not None else False
    )


@router.put("/contracts/{contract_id}", response_model=AssetContractResponse)
async def update_asset_contract(
    contract_id: int,
    contract: AssetContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Update asset contract (Agent+ only)"""
    db_contract = db.query(AssetContract).filter(AssetContract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = contract.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contract, field, value)

    db.commit()
    db.refresh(db_contract)

    # Load relationships
    db_contract = db.query(AssetContract).options(
        joinedload(AssetContract.asset),
        joinedload(AssetContract.created_by)
    ).filter(AssetContract.id == contract_id).first()

    days_until_expiry = (db_contract.end_date.replace(tzinfo=None) - datetime.now()).days if db_contract.end_date else None

    return AssetContractResponse(
        **db_contract.__dict__,
        created_by_name=db_contract.created_by.full_name if db_contract.created_by else None,
        asset_name=db_contract.asset.name if db_contract.asset else None,
        asset_tag=db_contract.asset.asset_tag if db_contract.asset else None,
        days_until_expiry=days_until_expiry,
        is_expired=days_until_expiry < 0 if days_until_expiry is not None else False
    )


@router.delete("/contracts/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Delete asset contract (Agent+ only)"""
    contract = db.query(AssetContract).filter(AssetContract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    db.delete(contract)
    db.commit()


# ==================== Analytics ====================

@router.get("/analytics/overview", response_model=AssetAnalytics)
async def get_asset_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset analytics and statistics (Agent+ only)"""
    # Total assets
    total_assets = db.query(Asset).count()

    # Total value
    total_value_result = db.query(func.sum(Asset.current_value)).scalar()
    total_value = total_value_result if total_value_result else Decimal('0.00')

    # By status
    status_counts = db.query(
        Asset.status,
        func.count(Asset.id)
    ).group_by(Asset.status).all()
    by_status = {status: count for status, count in status_counts}

    # By type
    type_counts = db.query(
        AssetType.name,
        func.count(Asset.id)
    ).join(Asset).group_by(AssetType.name).all()
    by_type = {type_name: count for type_name, count in type_counts}

    # By condition
    condition_counts = db.query(
        Asset.condition,
        func.count(Asset.id)
    ).filter(Asset.condition.isnot(None)).group_by(Asset.condition).all()
    by_condition = {condition: count for condition, count in condition_counts}

    # Assigned vs unassigned
    assigned_count = db.query(Asset).filter(Asset.assigned_to_id.isnot(None)).count()
    unassigned_count = db.query(Asset).filter(Asset.assigned_to_id.is_(None)).count()

    # Expiring warranties (next 30 days)
    thirty_days_from_now = datetime.now() + timedelta(days=30)
    expiring_warranty_assets = db.query(Asset).options(
        joinedload(Asset.asset_type)
    ).filter(
        and_(
            Asset.warranty_end_date.isnot(None),
            Asset.warranty_end_date >= datetime.now(),
            Asset.warranty_end_date <= thirty_days_from_now
        )
    ).limit(10).all()

    # Expiring contracts (next 30 days)
    expiring_contracts = db.query(AssetContract).options(
        joinedload(AssetContract.asset),
        joinedload(AssetContract.created_by)
    ).filter(
        and_(
            AssetContract.end_date >= datetime.now(),
            AssetContract.end_date <= thirty_days_from_now,
            AssetContract.is_active == True
        )
    ).limit(10).all()

    # Recent acquisitions (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent_assets = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department)
    ).filter(
        Asset.created_at >= thirty_days_ago
    ).order_by(desc(Asset.created_at)).limit(10).all()

    return AssetAnalytics(
        total_assets=total_assets,
        total_value=total_value,
        by_status=by_status,
        by_type=by_type,
        by_condition=by_condition,
        assigned_count=assigned_count,
        unassigned_count=unassigned_count,
        expiring_warranties=[AssetResponse(
            **asset.__dict__,
            asset_type_name=asset.asset_type.name if asset.asset_type else None,
            department_name=asset.department.name if asset.department else None,
            assigned_to_name=asset.assigned_to.full_name if asset.assigned_to else None,
            assigned_to_email=asset.assigned_to.email if asset.assigned_to else None,
            created_by_name=asset.created_by.full_name if asset.created_by else None,
            assignment_count=0,
            contract_count=0,
            relationship_count=0
        ) for asset in expiring_warranty_assets],
        expiring_contracts=[AssetContractResponse(
            **contract.__dict__,
            created_by_name=contract.created_by.full_name if contract.created_by else None,
            asset_name=contract.asset.name if contract.asset else None,
            asset_tag=contract.asset.asset_tag if contract.asset else None,
            days_until_expiry=(contract.end_date.replace(tzinfo=None) - datetime.now()).days if contract.end_date else 0,
            is_expired=False
        ) for contract in expiring_contracts],
        recent_acquisitions=[AssetResponse(
            **asset.__dict__,
            asset_type_name=asset.asset_type.name if asset.asset_type else None,
            department_name=asset.department.name if asset.department else None,
            assigned_to_name=asset.assigned_to.full_name if asset.assigned_to else None,
            assigned_to_email=asset.assigned_to.email if asset.assigned_to else None,
            created_by_name=asset.created_by.full_name if asset.created_by else None,
            assignment_count=0,
            contract_count=0,
            relationship_count=0
        ) for asset in recent_assets]
    )


# ==================== Asset Reports ====================

@router.get("/reports/inventory")
async def get_inventory_report(
    asset_type_id: Optional[int] = None,
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    format: str = Query("json", regex="^(json|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset inventory report (Agent+ only)"""
    query = db.query(Asset).options(
        joinedload(Asset.asset_type),
        joinedload(Asset.department),
        joinedload(Asset.assigned_to)
    )

    # Apply filters
    if asset_type_id:
        query = query.filter(Asset.asset_type_id == asset_type_id)
    if status:
        query = query.filter(Asset.status == status)
    if department_id:
        query = query.filter(Asset.department_id == department_id)

    assets = query.order_by(Asset.asset_tag).all()

    if format == "pdf":
        return generate_inventory_pdf(assets)

    # JSON response
    return {
        "report_type": "inventory",
        "generated_at": datetime.now(),
        "filters": {
            "asset_type_id": asset_type_id,
            "status": status,
            "department_id": department_id
        },
        "total_assets": len(assets),
        "total_value": sum([asset.current_value or Decimal('0') for asset in assets]),
        "assets": [AssetResponse(
            **asset.__dict__,
            asset_type_name=asset.asset_type.name if asset.asset_type else None,
            department_name=asset.department.name if asset.department else None,
            assigned_to_name=asset.assigned_to.full_name if asset.assigned_to else None,
            assigned_to_email=asset.assigned_to.email if asset.assigned_to else None,
            created_by_name=asset.created_by.full_name if asset.created_by else None,
            assignment_count=0,
            contract_count=0,
            relationship_count=0
        ) for asset in assets]
    }


def generate_inventory_pdf(assets):
    """Generate professional PDF for inventory report with SupportX branding"""
    buffer = io.BytesIO()

    # Brand colors
    PRIMARY_COLOR = colors.HexColor('#6366f1')  # Indigo
    SECONDARY_COLOR = colors.HexColor('#4f46e5')  # Darker indigo
    ACCENT_COLOR = colors.HexColor('#818cf8')  # Light indigo
    TEXT_COLOR = colors.HexColor('#1f2937')  # Dark gray
    LIGHT_GRAY = colors.HexColor('#f3f4f6')
    BORDER_COLOR = colors.HexColor('#e5e7eb')

    # Get logo path
    logo_path = Path(__file__).parent.parent.parent.parent / "static" / "logo.png"

    # Page setup with margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=0.75*inch
    )

    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
        alignment=TA_RIGHT
    )

    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=PRIMARY_COLOR,
        spaceAfter=5,
        spaceBefore=10,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold'
    )

    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#6b7280'),
        spaceAfter=20,
        alignment=TA_LEFT
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )

    summary_label_style = ParagraphStyle(
        'SummaryLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#6b7280'),
    )

    summary_value_style = ParagraphStyle(
        'SummaryValue',
        parent=styles['Normal'],
        fontSize=16,
        textColor=TEXT_COLOR,
        fontName='Helvetica-Bold'
    )

    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER
    )

    # ========== HEADER SECTION ==========
    # Logo and title in a table for alignment
    header_data = []

    # Add logo if it exists
    if logo_path.exists():
        logo = Image(str(logo_path), width=1.5*inch, height=0.5*inch)
        logo.hAlign = 'LEFT'
        header_data.append([logo, Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", header_style)])
    else:
        header_data.append([
            Paragraph("<b>SupportX</b>", ParagraphStyle('LogoText', parent=styles['Normal'], fontSize=18, textColor=PRIMARY_COLOR, fontName='Helvetica-Bold')),
            Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", header_style)
        ])

    header_table = Table(header_data, colWidths=[3.5*inch, 3.5*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    # Divider line
    elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR, spaceBefore=5, spaceAfter=15))

    # Title
    elements.append(Paragraph("Asset Inventory Report", title_style))
    elements.append(Paragraph("Comprehensive overview of all organizational assets", subtitle_style))

    # ========== SUMMARY SECTION ==========
    total_value = sum([asset.current_value or Decimal('0') for asset in assets])
    active_count = sum(1 for a in assets if hasattr(a.status, 'value') and a.status.value == 'ACTIVE' or str(a.status) == 'ACTIVE')
    assigned_count = sum(1 for a in assets if a.assigned_to)

    # Summary cards in a table
    summary_data = [
        [
            Paragraph("Total Assets", summary_label_style),
            Paragraph("Total Value", summary_label_style),
            Paragraph("Active Assets", summary_label_style),
            Paragraph("Assigned", summary_label_style),
        ],
        [
            Paragraph(f"{len(assets)}", summary_value_style),
            Paragraph(f"${total_value:,.2f}", summary_value_style),
            Paragraph(f"{active_count}", summary_value_style),
            Paragraph(f"{assigned_count}", summary_value_style),
        ]
    ]

    summary_table = Table(summary_data, colWidths=[1.75*inch, 1.75*inch, 1.75*inch, 1.75*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(summary_table)

    # ========== ASSET TABLE SECTION ==========
    elements.append(Paragraph("Asset Details", section_header_style))

    # Table header and data
    table_data = [['Asset Tag', 'Name', 'Type', 'Status', 'Assigned To', 'Value']]

    for asset in assets:
        status_val = asset.status.value if hasattr(asset.status, 'value') else str(asset.status)
        table_data.append([
            asset.asset_tag or 'N/A',
            (asset.name[:28] + '..') if asset.name and len(asset.name) > 30 else (asset.name or 'N/A'),
            asset.asset_type.name if asset.asset_type else 'N/A',
            status_val,
            (asset.assigned_to.full_name[:18] + '..') if asset.assigned_to and len(asset.assigned_to.full_name) > 20 else (asset.assigned_to.full_name if asset.assigned_to else 'Unassigned'),
            f"${asset.current_value or 0:,.2f}"
        ])

    # Create table with proper column widths
    asset_table = Table(table_data, colWidths=[1.1*inch, 1.8*inch, 1.1*inch, 0.9*inch, 1.3*inch, 0.8*inch], repeatRows=1)
    asset_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

        # Data rows styling
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),

        # Alternating row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),

        # Borders
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('LINEBELOW', (0, 0), (-1, 0), 2, SECONDARY_COLOR),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, BORDER_COLOR),

        # Alignment
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),  # Right align value column
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(asset_table)

    # ========== FOOTER SECTION ==========
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=10, spaceAfter=10))

    footer_text = f"""
    <para align="center">
    <font color="#6b7280" size="8">
    This report was generated by SupportX ITSM Platform<br/>
    Confidential - For internal use only<br/>
    © {datetime.now().year} SupportX. All rights reserved.
    </font>
    </para>
    """
    elements.append(Paragraph(footer_text, styles['Normal']))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=SupportX_Asset_Inventory_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf",
            "Content-Type": "application/pdf"
        }
    )


@router.get("/reports/lifecycle")
async def get_lifecycle_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset lifecycle analysis report"""
    # Assets by status
    status_distribution = db.query(
        Asset.status,
        func.count(Asset.id).label('count'),
        func.sum(Asset.current_value).label('total_value')
    ).group_by(Asset.status).all()

    # Assets by age
    current_year = datetime.now().year
    assets_by_age = db.query(
        extract('year', Asset.purchase_date).label('purchase_year'),
        func.count(Asset.id).label('count')
    ).filter(Asset.purchase_date.isnot(None)).group_by('purchase_year').order_by('purchase_year').all()

    # Retirement pipeline (old assets)
    five_years_ago = datetime.now() - timedelta(days=365*5)
    old_assets = db.query(Asset).options(
        joinedload(Asset.asset_type)
    ).filter(
        and_(
            Asset.purchase_date.isnot(None),
            Asset.purchase_date <= five_years_ago,
            Asset.status.in_([AssetStatus.ACTIVE, AssetStatus.IN_MAINTENANCE])
        )
    ).order_by(Asset.purchase_date).limit(50).all()

    return {
        "report_type": "lifecycle",
        "generated_at": datetime.now(),
        "status_distribution": [
            {
                "status": str(item.status),
                "count": item.count,
                "total_value": float(item.total_value or 0)
            }
            for item in status_distribution
        ],
        "assets_by_age": [
            {
                "year": int(item.purchase_year) if item.purchase_year else None,
                "count": item.count
            }
            for item in assets_by_age
        ],
        "retirement_pipeline": [AssetResponse(
            **asset.__dict__,
            asset_type_name=asset.asset_type.name if asset.asset_type else None,
            department_name=asset.department.name if asset.department else None,
            assigned_to_name=asset.assigned_to.full_name if asset.assigned_to else None,
            assigned_to_email=asset.assigned_to.email if asset.assigned_to else None,
            created_by_name=asset.created_by.full_name if asset.created_by else None,
            assignment_count=0,
            contract_count=0,
            relationship_count=0
        ) for asset in old_assets]
    }


@router.get("/reports/warranties")
async def get_warranties_report(
    status: str = Query("all", regex="^(all|active|expiring|expired)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get warranties and contracts report"""
    query = db.query(AssetContract).options(
        joinedload(AssetContract.asset),
        joinedload(AssetContract.created_by)
    ).filter(AssetContract.contract_type == "WARRANTY")

    now = datetime.now()
    thirty_days = now + timedelta(days=30)

    if status == "active":
        query = query.filter(AssetContract.end_date >= now, AssetContract.is_active == True)
    elif status == "expiring":
        query = query.filter(
            AssetContract.end_date >= now,
            AssetContract.end_date <= thirty_days,
            AssetContract.is_active == True
        )
    elif status == "expired":
        query = query.filter(AssetContract.end_date < now)

    contracts = query.order_by(AssetContract.end_date).all()

    return {
        "report_type": "warranties",
        "generated_at": datetime.now(),
        "filter": status,
        "total_contracts": len(contracts),
        "contracts": [AssetContractResponse(
            **contract.__dict__,
            created_by_name=contract.created_by.full_name if contract.created_by else None,
            asset_name=contract.asset.name if contract.asset else None,
            asset_tag=contract.asset.asset_tag if contract.asset else None,
            days_until_expiry=(contract.end_date - now).days if contract.end_date else None,
            is_expired=(contract.end_date < now) if contract.end_date else False
        ) for contract in contracts]
    }


@router.get("/reports/assignments")
async def get_assignments_report(
    user_id: Optional[int] = None,
    current: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset assignments report"""
    query = db.query(AssetAssignment).options(
        joinedload(AssetAssignment.asset),
        joinedload(AssetAssignment.user),
        joinedload(AssetAssignment.assigned_by)
    )

    if user_id:
        query = query.filter(AssetAssignment.user_id == user_id)

    if current:
        query = query.filter(AssetAssignment.is_current == True)

    assignments = query.order_by(desc(AssetAssignment.assigned_date)).all()

    # Group by user
    user_assignments = {}
    for assignment in assignments:
        user_name = assignment.user.full_name if assignment.user else "Unknown"
        if user_name not in user_assignments:
            user_assignments[user_name] = []
        user_assignments[user_name].append(assignment)

    return {
        "report_type": "assignments",
        "generated_at": datetime.now(),
        "filter": {"user_id": user_id, "current_only": current},
        "total_assignments": len(assignments),
        "by_user": {
            user: [AssetAssignmentResponse(
                **assignment.__dict__,
                user_name=assignment.user.full_name if assignment.user else None,
                user_email=assignment.user.email if assignment.user else None,
                assigned_by_name=assignment.assigned_by.full_name if assignment.assigned_by else None,
                asset_name=assignment.asset.name if assignment.asset else None,
                asset_tag=assignment.asset.asset_tag if assignment.asset else None
            ) for assignment in assignments]
            for user, assignments in user_assignments.items()
        }
    }


@router.get("/reports/value")
async def get_value_report(
    group_by: str = Query("type", regex="^(type|department|status)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_agent_or_above())
):
    """Get asset value analysis report"""
    total_purchase_value = db.query(func.sum(Asset.purchase_cost)).scalar() or Decimal('0')
    total_current_value = db.query(func.sum(Asset.current_value)).scalar() or Decimal('0')
    depreciation = total_purchase_value - total_current_value

    # Group by requested dimension
    if group_by == "type":
        grouped_data = db.query(
            AssetType.name.label('group_name'),
            func.count(Asset.id).label('count'),
            func.sum(Asset.purchase_cost).label('purchase_value'),
            func.sum(Asset.current_value).label('current_value')
        ).join(Asset).group_by(AssetType.name).all()
    elif group_by == "status":
        grouped_data = db.query(
            Asset.status.label('group_name'),
            func.count(Asset.id).label('count'),
            func.sum(Asset.purchase_cost).label('purchase_value'),
            func.sum(Asset.current_value).label('current_value')
        ).group_by(Asset.status).all()
    else:  # department
        from app.models.department import Department
        grouped_data = db.query(
            Department.name.label('group_name'),
            func.count(Asset.id).label('count'),
            func.sum(Asset.purchase_cost).label('purchase_value'),
            func.sum(Asset.current_value).label('current_value')
        ).join(Asset, Asset.department_id == Department.id).group_by(Department.name).all()

    return {
        "report_type": "value_analysis",
        "generated_at": datetime.now(),
        "group_by": group_by,
        "summary": {
            "total_purchase_value": float(total_purchase_value),
            "total_current_value": float(total_current_value),
            "total_depreciation": float(depreciation),
            "depreciation_percentage": float((depreciation / total_purchase_value * 100) if total_purchase_value > 0 else 0)
        },
        "grouped_data": [
            {
                "group": str(item.group_name),
                "count": item.count,
                "purchase_value": float(item.purchase_value or 0),
                "current_value": float(item.current_value or 0),
                "depreciation": float((item.purchase_value or 0) - (item.current_value or 0))
            }
            for item in grouped_data
        ]
    }
