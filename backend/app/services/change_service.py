from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List, Tuple
from datetime import datetime
from app.models.change import Change, ChangeActivity, ChangeTask, ChangeStatus, ChangeType
from app.models.user import User
from app.schemas.change import ChangeCreate, ChangeUpdate

class ChangeService:
    @staticmethod
    def generate_change_number(db: Session) -> str:
        """Generate unique change number"""
        last_change = db.query(Change).order_by(Change.id.desc()).first()
        if last_change:
            last_num = int(last_change.change_number.split('-')[1])
            return f"CHG-{last_num + 1:06d}"
        return "CHG-000001"
    
    @staticmethod
    def create_change(db: Session, change_data: ChangeCreate, requester_id: int) -> Change:
        """Create new change request"""
        change = Change(
            change_number=ChangeService.generate_change_number(db),
            requester_id=requester_id,
            **change_data.model_dump(exclude={'tasks'})
        )
        
        # Set initial status based on change type
        if change_data.change_type == ChangeType.EMERGENCY:
            change.status = ChangeStatus.PENDING_APPROVAL
        else:
            change.status = ChangeStatus.DRAFT
        
        db.add(change)
        db.flush()
        
        # Create tasks
        if change_data.tasks:
            for task_data in change_data.tasks:
                task = ChangeTask(
                    change_id=change.id,
                    **task_data.model_dump()
                )
                db.add(task)
        
        # Log activity
        activity = ChangeActivity(
            change_id=change.id,
            user_id=requester_id,
            activity_type="created",
            description=f"Change request {change.change_number} created"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def get_changes(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        change_type: Optional[str] = None,
        risk: Optional[str] = None,
        owner_id: Optional[int] = None,
    ) -> Tuple[List[Change], int]:
        """Get list of changes with filters"""
        query = db.query(Change)
        
        if search:
            query = query.filter(
                or_(
                    Change.change_number.ilike(f"%{search}%"),
                    Change.title.ilike(f"%{search}%"),
                    Change.description.ilike(f"%{search}%")
                )
            )
        
        if status:
            # Support comma-separated status values - convert strings to enum
            status_list = [s.strip() for s in status.split(',')]
            try:
                status_enums = [ChangeStatus[s] for s in status_list]
                if len(status_enums) == 1:
                    query = query.filter(Change.status == status_enums[0])
                else:
                    query = query.filter(Change.status.in_(status_enums))
            except KeyError:
                pass  # Invalid status value, ignore filter
        
        if change_type:
            try:
                query = query.filter(Change.change_type == ChangeType[change_type])
            except KeyError:
                pass  # Invalid change type, ignore filter

        if risk:
            try:
                from app.models.change import RiskLevel
                query = query.filter(Change.risk == RiskLevel[risk])
            except KeyError:
                pass  # Invalid risk level, ignore filter
        
        if owner_id:
            query = query.filter(Change.owner_id == owner_id)
        
        total = query.count()
        changes = query.order_by(Change.created_at.desc()).offset(skip).limit(limit).all()
        
        return changes, total
    
    @staticmethod
    def get_change(db: Session, change_id: int) -> Optional[Change]:
        """Get change by ID"""
        return db.query(Change).filter(Change.id == change_id).first()
    
    @staticmethod
    def update_change(db: Session, change_id: int, change_data: ChangeUpdate, user_id: int) -> Optional[Change]:
        """Update change request"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None
        
        update_data = change_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if value is not None:
                old_value = getattr(change, field)
                setattr(change, field, value)
                
                # Log activity
                activity = ChangeActivity(
                    change_id=change.id,
                    user_id=user_id,
                    activity_type="updated",
                    description=f"Updated {field}",
                    old_value=str(old_value),
                    new_value=str(value)
                )
                db.add(activity)
        
        change.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def submit_for_approval(db: Session, change_id: int, user_id: int) -> Optional[Change]:
        """Submit change for CAB approval"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None
        
        change.status = ChangeStatus.PENDING_APPROVAL
        
        activity = ChangeActivity(
            change_id=change.id,
            user_id=user_id,
            activity_type="submitted",
            description="Change submitted for CAB approval"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def approve_change(db: Session, change_id: int, user_id: int, comments: str) -> Optional[Change]:
        """CAB approval of change"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None
        
        change.status = ChangeStatus.APPROVED
        change.cab_approved = True
        change.cab_approved_by_id = user_id
        change.cab_approved_at = datetime.utcnow()
        change.cab_comments = comments
        
        activity = ChangeActivity(
            change_id=change.id,
            user_id=user_id,
            activity_type="approved",
            description=f"Change approved by CAB: {comments}"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def reject_change(db: Session, change_id: int, user_id: int, comments: str) -> Optional[Change]:
        """CAB rejection of change"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None

        change.status = ChangeStatus.REJECTED
        change.cab_approved = False
        change.cab_approved_by_id = user_id
        change.cab_approved_at = datetime.utcnow()
        change.cab_comments = comments

        activity = ChangeActivity(
            change_id=change.id,
            user_id=user_id,
            activity_type="rejected",
            description=f"Change rejected by CAB: {comments}"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def start_implementation(db: Session, change_id: int, user_id: int) -> Optional[Change]:
        """Start change implementation"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None
        
        change.status = ChangeStatus.IN_PROGRESS
        change.actual_start = datetime.utcnow()
        
        activity = ChangeActivity(
            change_id=change.id,
            user_id=user_id,
            activity_type="started",
            description="Change implementation started"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def complete_implementation(db: Session, change_id: int, user_id: int, notes: str) -> Optional[Change]:
        """Complete change implementation"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            return None
        
        change.status = ChangeStatus.IMPLEMENTED
        change.actual_end = datetime.utcnow()
        change.closure_notes = notes
        
        activity = ChangeActivity(
            change_id=change.id,
            user_id=user_id,
            activity_type="implemented",
            description=f"Change implementation completed: {notes}"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(change)
        return change
    
    @staticmethod
    def add_task(db: Session, change_id: int, task_data: dict, user_id: int):
        """Add a task to a change"""
        change = db.query(Change).filter(Change.id == change_id).first()
        if not change:
            raise ValueError("Change not found")
        
        task = ChangeTask(
            change_id=change_id,
            title=task_data.get('title'),
            description=task_data.get('description'),
            sequence=task_data.get('sequence', 0),
            assigned_to_id=task_data.get('assigned_to_id'),
            status=task_data.get('status', 'PENDING')
        )
        db.add(task)
        
        # Log activity
        activity = ChangeActivity(
            change_id=change_id,
            user_id=user_id,
            activity_type="task_added",
            description=f"Task '{task_data.get('title')}' added"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def update_task(db: Session, task_id: int, task_data: dict, user_id: int):
        """Update a task"""
        task = db.query(ChangeTask).filter(ChangeTask.id == task_id).first()
        if not task:
            raise ValueError("Task not found")
        
        old_status = task.status
        
        # Update fields
        if 'title' in task_data:
            task.title = task_data['title']
        if 'description' in task_data:
            task.description = task_data['description']
        if 'assigned_to_id' in task_data:
            task.assigned_to_id = task_data['assigned_to_id']
        if 'status' in task_data:
            task.status = task_data['status']
            if task_data['status'] == 'COMPLETED':
                task.completed_at = datetime.utcnow()
        if 'sequence' in task_data:
            task.sequence = task_data['sequence']
        
        # Log activity if status changed
        if old_status != task.status:
            activity = ChangeActivity(
                change_id=task.change_id,
                user_id=user_id,
                activity_type="task_updated",
                description=f"Task '{task.title}' status changed from {old_status} to {task.status}",
                old_value=old_status,
                new_value=task.status
            )
            db.add(activity)
        
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def delete_task(db: Session, task_id: int, user_id: int):
        """Delete a task"""
        task = db.query(ChangeTask).filter(ChangeTask.id == task_id).first()
        if not task:
            raise ValueError("Task not found")
        
        change_id = task.change_id
        task_title = task.title
        
        db.delete(task)
        
        # Log activity
        activity = ChangeActivity(
            change_id=change_id,
            user_id=user_id,
            activity_type="task_deleted",
            description=f"Task '{task_title}' deleted"
        )
        db.add(activity)
        
        db.commit()
        return True
    
    @staticmethod
    def get_change_progress(db: Session, change_id: int):
        """Calculate change progress based on tasks"""
        tasks = db.query(ChangeTask).filter(ChangeTask.change_id == change_id).all()
        
        if not tasks:
            return {
                "total_tasks": 0,
                "completed_tasks": 0,
                "progress_percentage": 0
            }
        
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status == 'COMPLETED'])
        progress_percentage = int((completed_tasks / total_tasks) * 100)
        
        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": total_tasks - completed_tasks,
            "progress_percentage": progress_percentage
        }