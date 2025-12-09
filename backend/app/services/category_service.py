from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from app.models.category import Category, Subcategory
from app.schemas.category import CategoryCreate, CategoryUpdate, SubcategoryCreate, SubcategoryUpdate

class CategoryService:
    @staticmethod
    def create_category(db: Session, category_data: CategoryCreate) -> Category:
        # Check if category name already exists
        existing = db.query(Category).filter(Category.name == category_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category name already exists"
            )
        
        db_category = Category(**category_data.dict())
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        
        return db_category
    
    @staticmethod
    def get_category(db: Session, category_id: int) -> Optional[Category]:
        return db.query(Category).filter(Category.id == category_id).first()
    
    @staticmethod
    def get_categories(db: Session, is_active: Optional[bool] = None):
        query = db.query(Category)
        
        if is_active is not None:
            query = query.filter(Category.is_active == is_active)
        
        return query.all()
    
    @staticmethod
    def update_category(db: Session, category_id: int, category_data: CategoryUpdate) -> Category:
        db_category = db.query(Category).filter(Category.id == category_id).first()
        
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        update_data = category_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)
        
        db.commit()
        db.refresh(db_category)
        
        return db_category
    
    @staticmethod
    def delete_category(db: Session, category_id: int) -> bool:
        db_category = db.query(Category).filter(Category.id == category_id).first()
        
        if not db_category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if category has tickets
        from app.models.ticket import Ticket
        ticket_count = db.query(Ticket).filter(Ticket.category_id == category_id).count()
        
        if ticket_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete category. {ticket_count} tickets are using this category"
            )
        
        db.delete(db_category)
        db.commit()
        
        return True
    
    # Subcategory methods
    @staticmethod
    def create_subcategory(db: Session, subcategory_data: SubcategoryCreate) -> Subcategory:
        db_subcategory = Subcategory(**subcategory_data.dict())
        db.add(db_subcategory)
        db.commit()
        db.refresh(db_subcategory)
        
        return db_subcategory
    
    @staticmethod
    def get_subcategories(db: Session, category_id: Optional[int] = None):
        query = db.query(Subcategory)
        
        if category_id:
            query = query.filter(Subcategory.category_id == category_id)
        
        return query.all()