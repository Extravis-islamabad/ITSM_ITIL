from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager_or_above
from app.models.user import User
from app.models.category import Category, Subcategory, CategoryType
from datetime import datetime

router = APIRouter(prefix="/categories", tags=["Categories"])


# Schemas
class SubcategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class SubcategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category_type: CategoryType
    subcategories: Optional[List[SubcategoryCreate]] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category_type: Optional[CategoryType] = None
    is_active: Optional[bool] = None

@router.get("")
async def get_categories(
    category_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get categories, optionally filtered by type and active status"""
    query = db.query(Category)

    # Filter by active status (default to active only for non-admin use)
    if is_active is not None:
        query = query.filter(Category.is_active == is_active)

    # Filter by type if provided
    if category_type:
        try:
            cat_type = CategoryType[category_type]
            query = query.filter(Category.category_type == cat_type)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Invalid category type: {category_type}")
    
    categories = query.all()
    
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "category_type": cat.category_type.value,
            "is_active": cat.is_active,
            "subcategories": [
                {
                    "id": sub.id,
                    "name": sub.name,
                    "description": sub.description,
                    "is_active": sub.is_active,
                }
                for sub in cat.subcategories if sub.is_active
            ]
        }
        for cat in categories
    ]


@router.get("/{category_id}")
async def get_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single category by ID"""
    category = db.query(Category).filter(Category.id == category_id).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "is_active": category.is_active,
        "subcategories": [
            {
                "id": sub.id,
                "name": sub.name,
                "description": sub.description,
                "is_active": sub.is_active,
            }
            for sub in category.subcategories if sub.is_active
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new category (Manager+ only)"""
    # Check for duplicate name
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )

    # Create category
    category = Category(
        name=category_data.name,
        description=category_data.description,
        icon=category_data.icon,
        color=category_data.color,
        category_type=category_data.category_type,
        is_active=True
    )

    db.add(category)
    db.flush()

    # Create subcategories if provided
    if category_data.subcategories:
        for sub_data in category_data.subcategories:
            subcategory = Subcategory(
                category_id=category.id,
                name=sub_data.name,
                description=sub_data.description,
                is_active=True
            )
            db.add(subcategory)

    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "color": category.color,
        "category_type": category.category_type.value,
        "is_active": category.is_active,
        "subcategories": [
            {
                "id": sub.id,
                "name": sub.name,
                "description": sub.description,
                "is_active": sub.is_active,
            }
            for sub in category.subcategories
        ]
    }


@router.put("/{category_id}")
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update a category (Manager+ only)"""
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check for duplicate name if name is being updated
    if category_data.name and category_data.name != category.name:
        existing = db.query(Category).filter(
            Category.name == category_data.name,
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )

    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    category.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "color": category.color,
        "category_type": category.category_type.value,
        "is_active": category.is_active
    }


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete a category (Manager+ only) - Soft delete by setting is_active=False"""
    category = db.query(Category).filter(Category.id == category_id).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Soft delete
    category.is_active = False
    category.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Category deleted successfully"}


# Subcategory endpoints
@router.post("/{category_id}/subcategories", status_code=status.HTTP_201_CREATED)
async def create_subcategory(
    category_id: int,
    subcategory_data: SubcategoryCreate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Create a new subcategory for a category (Manager+ only)"""
    # Check if category exists
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check for duplicate name within the category
    existing = db.query(Subcategory).filter(
        Subcategory.category_id == category_id,
        Subcategory.name == subcategory_data.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subcategory with this name already exists in this category"
        )

    # Create subcategory
    subcategory = Subcategory(
        category_id=category_id,
        name=subcategory_data.name,
        description=subcategory_data.description,
        is_active=True
    )

    db.add(subcategory)
    db.commit()
    db.refresh(subcategory)

    return {
        "id": subcategory.id,
        "category_id": subcategory.category_id,
        "name": subcategory.name,
        "description": subcategory.description,
        "is_active": subcategory.is_active
    }


@router.put("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: int,
    subcategory_data: SubcategoryUpdate,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Update a subcategory (Manager+ only)"""
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    # Check for duplicate name if name is being updated
    if subcategory_data.name and subcategory_data.name != subcategory.name:
        existing = db.query(Subcategory).filter(
            Subcategory.category_id == subcategory.category_id,
            Subcategory.name == subcategory_data.name,
            Subcategory.id != subcategory_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subcategory with this name already exists in this category"
            )

    # Update fields
    update_data = subcategory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)

    subcategory.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(subcategory)

    return {
        "id": subcategory.id,
        "category_id": subcategory.category_id,
        "name": subcategory.name,
        "description": subcategory.description,
        "is_active": subcategory.is_active
    }


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(
    subcategory_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Delete a subcategory (Manager+ only) - Soft delete by setting is_active=False"""
    subcategory = db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    # Soft delete
    subcategory.is_active = False
    subcategory.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Subcategory deleted successfully"}