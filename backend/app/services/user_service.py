from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Tuple
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from fastapi import HTTPException, status

class UserService:
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate, created_by: int = None) -> User:
        """Create a new user"""
        
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Generate username if not provided
        username = user_data.username if user_data.username else user_data.email.split('@')[0]
        
        # Check if username already exists
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Check if employee_id already exists (if provided)
        if user_data.employee_id:
            existing_employee = db.query(User).filter(User.employee_id == user_data.employee_id).first()
            if existing_employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee ID already exists"
                )
        
        # Verify role exists
        if not user_data.role_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role is required"
            )
            
        role = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        try:
            # Create new user
            user = User(
                email=user_data.email,
                username=username,
                full_name=user_data.full_name,
                hashed_password=get_password_hash(user_data.password),
                phone=user_data.phone,
                employee_id=user_data.employee_id,
                is_active=True,
                is_verified=False,
                is_superuser=False,
                timezone=user_data.timezone if user_data.timezone else 'UTC',
                language=user_data.language if user_data.language else 'en',
                role_id=user_data.role_id,
                department_id=user_data.department_id if user_data.department_id else None,
                manager_id=user_data.manager_id if user_data.manager_id else None,
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            return user
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )
    
    @staticmethod
    def get_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        role_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[User], int]:
        """Get list of users with filters"""
        query = db.query(User)
        
        # Apply filters
        if search:
            search_filter = or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.employee_id.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        if department_id:
            query = query.filter(User.department_id == department_id)
        
        if role_id:
            query = query.filter(User.role_id == role_id)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        
        return users, total
    
    @staticmethod
    def get_user(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def update_user(
        db: Session, 
        user_id: int, 
        user_data: UserUpdate, 
        updated_by: int = None
    ) -> User:
        """Update user"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get update data
        update_data = user_data.dict(exclude_unset=True)
        
        # Check for duplicate email
        if 'email' in update_data and update_data['email'] != user.email:
            existing = db.query(User).filter(User.email == update_data['email']).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        # Check for duplicate username
        if 'username' in update_data and update_data['username'] != user.username:
            existing = db.query(User).filter(User.username == update_data['username']).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Check for duplicate employee_id
        if 'employee_id' in update_data and update_data['employee_id'] and update_data['employee_id'] != user.employee_id:
            existing = db.query(User).filter(User.employee_id == update_data['employee_id']).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee ID already exists"
                )
        
        # Hash password if provided
        if 'password' in update_data and update_data['password']:
            update_data['hashed_password'] = get_password_hash(update_data.pop('password'))
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        try:
            db.commit()
            db.refresh(user)
            return user
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user: {str(e)}"
            )
    
    @staticmethod
    def delete_user(db: Session, user_id: int, deleted_by: int = None) -> bool:
        """Delete (deactivate) user"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        try:
            # Soft delete - just deactivate
            user.is_active = False
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user: {str(e)}"
            )