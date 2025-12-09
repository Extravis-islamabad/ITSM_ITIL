from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from app.models.role import Role
from app.models.permission import Permission
from app.models.audit_log import AuditLog
from app.schemas.role import RoleCreate, RoleUpdate

class RoleService:
    @staticmethod
    def create_role(db: Session, role_data: RoleCreate, created_by: Optional[int] = None) -> Role:
        # Check if role name already exists
        existing_role = db.query(Role).filter(Role.name == role_data.name).first()
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
        
        # Create role
        db_role = Role(
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            role_type=role_data.role_type,
            level=role_data.level
        )
        
        # Add permissions
        if role_data.permission_ids:
            permissions = db.query(Permission).filter(
                Permission.id.in_(role_data.permission_ids)
            ).all()
            db_role.permissions = permissions
        
        db.add(db_role)
        db.commit()
        db.refresh(db_role)
        
        # Audit log
        if created_by:
            audit_log = AuditLog(
                user_id=created_by,
                action="create",
                module="roles",
                entity_type="Role",
                entity_id=db_role.id,
                new_values={"name": db_role.name, "display_name": db_role.display_name},
                description=f"Created role {db_role.name}"
            )
            db.add(audit_log)
            db.commit()
        
        return db_role
    
    @staticmethod
    def get_role(db: Session, role_id: int) -> Optional[Role]:
        return db.query(Role).filter(Role.id == role_id).first()
    
    @staticmethod
    def get_roles(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role_type: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> tuple:
        query = db.query(Role)
        
        if role_type:
            query = query.filter(Role.role_type == role_type)
        
        if is_active is not None:
            query = query.filter(Role.is_active == is_active)
        
        total = query.count()
        roles = query.offset(skip).limit(limit).all()
        
        return roles, total
    
    @staticmethod
    def update_role(
        db: Session,
        role_id: int,
        role_data: RoleUpdate,
        updated_by: Optional[int] = None
    ) -> Role:
        db_role = db.query(Role).filter(Role.id == role_id).first()
        
        if not db_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        if db_role.is_system:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify system role"
            )
        
        old_values = {}
        new_values = {}
        
        # Update fields
        update_data = role_data.dict(exclude_unset=True, exclude={'permission_ids'})
        
        for field, value in update_data.items():
            if hasattr(db_role, field):
                old_values[field] = getattr(db_role, field)
                setattr(db_role, field, value)
                new_values[field] = value
        
        # Update permissions
        if role_data.permission_ids is not None:
            permissions = db.query(Permission).filter(
                Permission.id.in_(role_data.permission_ids)
            ).all()
            db_role.permissions = permissions
        
        db.commit()
        db.refresh(db_role)
        
        # Audit log
        if updated_by and old_values:
            audit_log = AuditLog(
                user_id=updated_by,
                action="update",
                module="roles",
                entity_type="Role",
                entity_id=db_role.id,
                old_values=old_values,
                new_values=new_values,
                description=f"Updated role {db_role.name}"
            )
            db.add(audit_log)
            db.commit()
        
        return db_role
    
    @staticmethod
    def delete_role(db: Session, role_id: int, deleted_by: Optional[int] = None) -> bool:
        db_role = db.query(Role).filter(Role.id == role_id).first()
        
        if not db_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        if db_role.is_system:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete system role"
            )
        
        # Check if role is assigned to any users
        from app.models.user import User
        user_count = db.query(User).filter(User.role_id == role_id).count()
        
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete role. {user_count} users are assigned to this role"
            )
        
        db.delete(db_role)
        db.commit()
        
        # Audit log
        if deleted_by:
            audit_log = AuditLog(
                user_id=deleted_by,
                action="delete",
                module="roles",
                entity_type="Role",
                entity_id=role_id,
                description=f"Deleted role {db_role.name}"
            )
            db.add(audit_log)
            db.commit()
        
        return True
    
    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        return db.query(Permission).filter(Permission.is_active == True).all()