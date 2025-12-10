"""
Project Management Service
Business logic for Projects, Tasks, Sprints, and Board operations
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from app.models.project import (
    Project, BoardColumn, ProjectMember, Sprint, Task,
    TaskComment, TaskActivity, TaskAttachment,
    ProjectStatus, SprintStatus, TaskStatus, TaskPriority, TaskType, ProjectMemberRole
)
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, SprintCreate, SprintUpdate,
    TaskCreate, TaskUpdate, TaskMove, BoardColumnCreate, BoardColumnUpdate,
    ProjectMemberCreate, TaskCommentCreate
)


class ProjectService:
    """Service for managing projects"""

    # ==================== PROJECT CRUD ====================

    @staticmethod
    def create_project(db: Session, project_data: ProjectCreate, current_user: User) -> Project:
        """Create a new project with default board columns"""
        # Check if project key already exists
        existing = db.query(Project).filter(Project.project_key == project_data.project_key.upper()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project key '{project_data.project_key}' already exists"
            )

        project = Project(
            project_key=project_data.project_key.upper(),
            name=project_data.name,
            description=project_data.description,
            status=ProjectStatus.PLANNING,
            owner_id=current_user.id,
            lead_id=project_data.lead_id,
            start_date=project_data.start_date,
            end_date=project_data.end_date,
            task_sequence=0
        )
        db.add(project)
        db.flush()

        # Create default board columns
        default_columns = [
            {"name": "Backlog", "status_key": "BACKLOG", "position": 0, "color": "gray", "is_default": True},
            {"name": "To Do", "status_key": "TODO", "position": 1, "color": "blue", "is_default": True},
            {"name": "In Progress", "status_key": "IN_PROGRESS", "position": 2, "color": "yellow", "is_default": True},
            {"name": "QA", "status_key": "QA", "position": 3, "color": "purple", "is_default": True},
            {"name": "Done", "status_key": "DONE", "position": 4, "color": "green", "is_default": True, "is_done_column": True},
        ]
        for col_data in default_columns:
            column = BoardColumn(project_id=project.id, **col_data)
            db.add(column)

        # Add owner as project member
        member = ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            role=ProjectMemberRole.OWNER
        )
        db.add(member)

        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_project(db: Session, project_id: int) -> Optional[Project]:
        """Get a project by ID"""
        return db.query(Project).options(
            joinedload(Project.owner),
            joinedload(Project.lead),
            joinedload(Project.columns),
            joinedload(Project.members).joinedload(ProjectMember.user)
        ).filter(Project.id == project_id).first()

    @staticmethod
    def get_projects(
        db: Session,
        current_user: User,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        owner_id: Optional[int] = None
    ) -> tuple:
        """Get all projects accessible to user"""
        query = db.query(Project)

        # Filter by membership or ownership (unless admin)
        if not current_user.is_superuser:
            member_project_ids = db.query(ProjectMember.project_id).filter(
                ProjectMember.user_id == current_user.id
            ).subquery()
            query = query.filter(
                or_(
                    Project.owner_id == current_user.id,
                    Project.id.in_(member_project_ids)
                )
            )

        if search:
            query = query.filter(
                or_(
                    Project.name.ilike(f"%{search}%"),
                    Project.project_key.ilike(f"%{search}%"),
                    Project.description.ilike(f"%{search}%")
                )
            )

        if status:
            query = query.filter(Project.status == status)

        if owner_id:
            query = query.filter(Project.owner_id == owner_id)

        total = query.count()
        projects = query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

        return projects, total

    @staticmethod
    def update_project(db: Session, project_id: int, project_data: ProjectUpdate) -> Optional[Project]:
        """Update a project"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return None

        update_data = project_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field == 'status':
                    value = ProjectStatus(value)
                setattr(project, field, value)

        project.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: int) -> bool:
        """Delete a project"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False
        db.delete(project)
        db.commit()
        return True

    # ==================== BOARD COLUMNS ====================

    @staticmethod
    def get_board_columns(db: Session, project_id: int) -> List[BoardColumn]:
        """Get all board columns for a project"""
        return db.query(BoardColumn).filter(
            BoardColumn.project_id == project_id
        ).order_by(BoardColumn.position).all()

    @staticmethod
    def create_board_column(db: Session, project_id: int, column_data: BoardColumnCreate) -> BoardColumn:
        """Add a new column to the board"""
        # Get max position
        max_pos = db.query(func.max(BoardColumn.position)).filter(
            BoardColumn.project_id == project_id
        ).scalar() or 0

        column = BoardColumn(
            project_id=project_id,
            name=column_data.name,
            status_key=column_data.status_key.upper(),
            position=max_pos + 1,
            color=column_data.color,
            is_default=False,
            is_done_column=column_data.is_done_column
        )
        db.add(column)
        db.commit()
        db.refresh(column)
        return column

    @staticmethod
    def update_board_column(db: Session, column_id: int, column_data: BoardColumnUpdate) -> Optional[BoardColumn]:
        """Update a board column"""
        column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
        if not column:
            return None

        update_data = column_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(column, field, value)

        db.commit()
        db.refresh(column)
        return column

    @staticmethod
    def delete_board_column(db: Session, column_id: int) -> bool:
        """Delete a board column (only non-default columns)"""
        column = db.query(BoardColumn).filter(BoardColumn.id == column_id).first()
        if not column or column.is_default:
            return False

        # Check if any tasks use this column
        task_count = db.query(Task).filter(Task.status == column.status_key).count()
        if task_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete column with {task_count} tasks. Move tasks first."
            )

        db.delete(column)
        db.commit()
        return True

    @staticmethod
    def reorder_columns(db: Session, project_id: int, column_ids: List[int]) -> List[BoardColumn]:
        """Reorder board columns"""
        for idx, col_id in enumerate(column_ids):
            db.query(BoardColumn).filter(
                BoardColumn.id == col_id,
                BoardColumn.project_id == project_id
            ).update({"position": idx})
        db.commit()
        return ProjectService.get_board_columns(db, project_id)

    # ==================== PROJECT MEMBERS ====================

    @staticmethod
    def get_project_members(db: Session, project_id: int) -> List[ProjectMember]:
        """Get all members of a project"""
        return db.query(ProjectMember).options(
            joinedload(ProjectMember.user)
        ).filter(ProjectMember.project_id == project_id).all()

    @staticmethod
    def add_project_member(db: Session, project_id: int, member_data: ProjectMemberCreate) -> ProjectMember:
        """Add a member to a project"""
        # Check if already a member
        existing = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_data.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this project"
            )

        member = ProjectMember(
            project_id=project_id,
            user_id=member_data.user_id,
            role=member_data.role
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def update_project_member(db: Session, project_id: int, user_id: int, role: ProjectMemberRole) -> Optional[ProjectMember]:
        """Update a member's role"""
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        if not member:
            return None

        # Can't change owner role
        if member.role == ProjectMemberRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change role of project owner"
            )

        member.role = role
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def remove_project_member(db: Session, project_id: int, user_id: int) -> bool:
        """Remove a member from a project"""
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        if not member:
            return False

        # Can't remove owner
        if member.role == ProjectMemberRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove project owner"
            )

        db.delete(member)
        db.commit()
        return True

    @staticmethod
    def check_project_access(db: Session, project_id: int, user: User, required_role: Optional[ProjectMemberRole] = None) -> bool:
        """Check if user has access to project"""
        if user.is_superuser:
            return True

        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        ).first()

        if not member:
            # Check if owner
            project = db.query(Project).filter(Project.id == project_id).first()
            if project and project.owner_id == user.id:
                return True
            return False

        if required_role:
            role_hierarchy = [ProjectMemberRole.VIEWER, ProjectMemberRole.MEMBER, ProjectMemberRole.ADMIN, ProjectMemberRole.OWNER]
            return role_hierarchy.index(member.role) >= role_hierarchy.index(required_role)

        return True


class SprintService:
    """Service for managing sprints"""

    @staticmethod
    def get_sprints(db: Session, project_id: int) -> List[Sprint]:
        """Get all sprints for a project"""
        sprints = db.query(Sprint).filter(
            Sprint.project_id == project_id
        ).order_by(Sprint.created_at.desc()).all()

        # Add task counts
        for sprint in sprints:
            tasks = db.query(Task).filter(Task.sprint_id == sprint.id).all()
            sprint.task_count = len(tasks)
            sprint.completed_task_count = len([t for t in tasks if t.status == TaskStatus.DONE])
            sprint.total_story_points = sum(t.story_points or 0 for t in tasks)
            sprint.completed_story_points = sum(t.story_points or 0 for t in tasks if t.status == TaskStatus.DONE)

        return sprints

    @staticmethod
    def get_sprint(db: Session, sprint_id: int) -> Optional[Sprint]:
        """Get a sprint by ID"""
        return db.query(Sprint).filter(Sprint.id == sprint_id).first()

    @staticmethod
    def get_active_sprint(db: Session, project_id: int) -> Optional[Sprint]:
        """Get the active sprint for a project"""
        return db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status == SprintStatus.ACTIVE
        ).first()

    @staticmethod
    def create_sprint(db: Session, project_id: int, sprint_data: SprintCreate) -> Sprint:
        """Create a new sprint"""
        sprint = Sprint(
            project_id=project_id,
            name=sprint_data.name,
            goal=sprint_data.goal,
            status=SprintStatus.PLANNING,
            start_date=sprint_data.start_date,
            end_date=sprint_data.end_date
        )
        db.add(sprint)
        db.commit()
        db.refresh(sprint)
        return sprint

    @staticmethod
    def update_sprint(db: Session, sprint_id: int, sprint_data: SprintUpdate) -> Optional[Sprint]:
        """Update a sprint"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            return None

        update_data = sprint_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(sprint, field, value)

        sprint.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sprint)
        return sprint

    @staticmethod
    def start_sprint(db: Session, sprint_id: int) -> Sprint:
        """Start a sprint"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")

        # Check if there's already an active sprint
        active = db.query(Sprint).filter(
            Sprint.project_id == sprint.project_id,
            Sprint.status == SprintStatus.ACTIVE
        ).first()
        if active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sprint '{active.name}' is already active. Complete it first."
            )

        sprint.status = SprintStatus.ACTIVE
        sprint.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sprint)
        return sprint

    @staticmethod
    def complete_sprint(db: Session, sprint_id: int, move_to: str = "backlog") -> Sprint:
        """Complete a sprint and handle incomplete tasks"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")

        if sprint.status != SprintStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only active sprints can be completed"
            )

        # Handle incomplete tasks
        incomplete_tasks = db.query(Task).filter(
            Task.sprint_id == sprint_id,
            Task.status != TaskStatus.DONE
        ).all()

        if move_to == "backlog":
            for task in incomplete_tasks:
                task.sprint_id = None
        elif move_to.isdigit():
            # Move to another sprint
            next_sprint_id = int(move_to)
            next_sprint = db.query(Sprint).filter(Sprint.id == next_sprint_id).first()
            if next_sprint:
                for task in incomplete_tasks:
                    task.sprint_id = next_sprint_id

        sprint.status = SprintStatus.COMPLETED
        sprint.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sprint)
        return sprint

    @staticmethod
    def delete_sprint(db: Session, sprint_id: int) -> bool:
        """Delete a sprint (moves tasks to backlog)"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            return False

        # Move all tasks to backlog
        db.query(Task).filter(Task.sprint_id == sprint_id).update({"sprint_id": None})

        db.delete(sprint)
        db.commit()
        return True


class TaskService:
    """Service for managing tasks"""

    @staticmethod
    def _generate_task_number(db: Session, project: Project) -> str:
        """Generate next task number for project"""
        project.task_sequence += 1
        return f"{project.project_key}-{project.task_sequence}"

    @staticmethod
    def get_tasks(
        db: Session,
        project_id: int,
        skip: int = 0,
        limit: int = 50,
        sprint_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        task_type: Optional[str] = None,
        assignee_id: Optional[int] = None,
        search: Optional[str] = None,
        in_backlog: Optional[bool] = None
    ) -> tuple:
        """Get tasks with filters"""
        query = db.query(Task).filter(Task.project_id == project_id)

        if sprint_id is not None:
            query = query.filter(Task.sprint_id == sprint_id)
        elif in_backlog:
            query = query.filter(Task.sprint_id.is_(None))

        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if task_type:
            query = query.filter(Task.task_type == task_type)
        if assignee_id:
            query = query.filter(Task.assignee_id == assignee_id)
        if search:
            query = query.filter(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.task_number.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )

        total = query.count()
        tasks = query.options(
            joinedload(Task.assignee),
            joinedload(Task.reporter)
        ).order_by(Task.position, Task.created_at.desc()).offset(skip).limit(limit).all()

        # Add counts
        for task in tasks:
            task.subtask_count = db.query(Task).filter(Task.parent_task_id == task.id).count()
            task.comment_count = db.query(TaskComment).filter(TaskComment.task_id == task.id).count()

        return tasks, total

    @staticmethod
    def get_task(db: Session, task_id: int) -> Optional[Task]:
        """Get a task with all details"""
        task = db.query(Task).options(
            joinedload(Task.assignee),
            joinedload(Task.reporter),
            joinedload(Task.comments).joinedload(TaskComment.user),
            joinedload(Task.activities).joinedload(TaskActivity.user),
            joinedload(Task.attachments).joinedload(TaskAttachment.user),
            joinedload(Task.subtasks)
        ).filter(Task.id == task_id).first()

        if task:
            task.subtask_count = len(task.subtasks) if task.subtasks else 0
            task.comment_count = len(task.comments) if task.comments else 0

        return task

    @staticmethod
    def get_task_by_number(db: Session, task_number: str) -> Optional[Task]:
        """Get a task by its number"""
        return db.query(Task).filter(Task.task_number == task_number).first()

    @staticmethod
    def create_task(db: Session, project_id: int, task_data: TaskCreate, current_user: User) -> Task:
        """Create a new task"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        task_number = TaskService._generate_task_number(db, project)

        # Get max position in status
        max_pos = db.query(func.max(Task.position)).filter(
            Task.project_id == project_id,
            Task.status == task_data.status.value
        ).scalar() or 0

        task = Task(
            project_id=project_id,
            task_number=task_number,
            title=task_data.title,
            description=task_data.description,
            task_type=task_data.task_type,
            status=task_data.status,
            priority=task_data.priority,
            assignee_id=task_data.assignee_id,
            reporter_id=current_user.id,
            sprint_id=task_data.sprint_id,
            story_points=task_data.story_points,
            time_estimate=task_data.time_estimate,
            due_date=task_data.due_date,
            parent_task_id=task_data.parent_task_id,
            position=max_pos + 1
        )
        db.add(task)
        db.flush()

        # Log activity
        activity = TaskActivity(
            task_id=task.id,
            user_id=current_user.id,
            activity_type="created",
            description=f"Task created by {current_user.full_name}"
        )
        db.add(activity)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_task(db: Session, task_id: int, task_data: TaskUpdate, current_user: User) -> Optional[Task]:
        """Update a task"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        update_data = task_data.model_dump(exclude_unset=True)
        changes = []

        for field, value in update_data.items():
            if value is not None:
                old_value = getattr(task, field)
                if old_value != value:
                    changes.append({
                        "field": field,
                        "old": str(old_value) if old_value else None,
                        "new": str(value)
                    })

                    # Convert enums
                    if field == 'status':
                        value = TaskStatus(value)
                        if value == TaskStatus.DONE and task.completed_at is None:
                            task.completed_at = datetime.now(timezone.utc)
                        elif value != TaskStatus.DONE:
                            task.completed_at = None
                    elif field == 'priority':
                        value = TaskPriority(value)
                    elif field == 'task_type':
                        value = TaskType(value)

                    setattr(task, field, value)

        # Log activity for changes
        if changes:
            for change in changes:
                activity = TaskActivity(
                    task_id=task.id,
                    user_id=current_user.id,
                    activity_type="updated",
                    field_name=change["field"],
                    old_value=change["old"],
                    new_value=change["new"],
                    description=f"{change['field']} changed from '{change['old']}' to '{change['new']}'"
                )
                db.add(activity)

        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def move_task(db: Session, task_id: int, move_data: TaskMove, current_user: User) -> Optional[Task]:
        """Move a task to a different status (column)"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        old_status = task.status
        new_status = TaskStatus(move_data.status)

        task.status = new_status

        if move_data.position is not None:
            task.position = move_data.position

        if new_status == TaskStatus.DONE and task.completed_at is None:
            task.completed_at = datetime.now(timezone.utc)
        elif new_status != TaskStatus.DONE:
            task.completed_at = None

        # Log activity
        activity = TaskActivity(
            task_id=task.id,
            user_id=current_user.id,
            activity_type="status_changed",
            field_name="status",
            old_value=old_status.value,
            new_value=new_status.value,
            description=f"Status changed from {old_status.value} to {new_status.value}"
        )
        db.add(activity)

        task.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def bulk_move_to_sprint(db: Session, task_ids: List[int], sprint_id: Optional[int]) -> int:
        """Move multiple tasks to a sprint (or backlog if None)"""
        count = db.query(Task).filter(Task.id.in_(task_ids)).update(
            {"sprint_id": sprint_id},
            synchronize_session=False
        )
        db.commit()
        return count

    @staticmethod
    def delete_task(db: Session, task_id: int) -> bool:
        """Delete a task"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        db.delete(task)
        db.commit()
        return True

    # ==================== COMMENTS ====================

    @staticmethod
    def add_comment(db: Session, task_id: int, comment_data: TaskCommentCreate, current_user: User) -> TaskComment:
        """Add a comment to a task"""
        comment = TaskComment(
            task_id=task_id,
            user_id=current_user.id,
            content=comment_data.content
        )
        db.add(comment)

        # Log activity
        activity = TaskActivity(
            task_id=task_id,
            user_id=current_user.id,
            activity_type="commented",
            description=f"{current_user.full_name} added a comment"
        )
        db.add(activity)

        db.commit()
        db.refresh(comment)
        return comment

    @staticmethod
    def update_comment(db: Session, comment_id: int, content: str, current_user: User) -> Optional[TaskComment]:
        """Update a comment"""
        comment = db.query(TaskComment).filter(TaskComment.id == comment_id).first()
        if not comment or comment.user_id != current_user.id:
            return None

        comment.content = content
        comment.is_edited = True
        comment.edited_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(comment)
        return comment

    @staticmethod
    def delete_comment(db: Session, comment_id: int, current_user: User) -> bool:
        """Delete a comment"""
        comment = db.query(TaskComment).filter(TaskComment.id == comment_id).first()
        if not comment or (comment.user_id != current_user.id and not current_user.is_superuser):
            return False
        db.delete(comment)
        db.commit()
        return True


class ProjectReportService:
    """Service for project reports"""

    @staticmethod
    def get_burndown_data(db: Session, sprint_id: int) -> Dict[str, Any]:
        """Get burndown chart data for a sprint"""
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            return {}

        tasks = db.query(Task).filter(Task.sprint_id == sprint_id).all()
        total_points = sum(t.story_points or 0 for t in tasks)
        completed_points = sum(t.story_points or 0 for t in tasks if t.status == TaskStatus.DONE)

        # Calculate data points (simplified - would need activity history for accurate burndown)
        data_points = []
        if sprint.start_date and sprint.end_date:
            days = (sprint.end_date - sprint.start_date).days or 1
            for i in range(days + 1):
                date = sprint.start_date + timedelta(days=i)
                ideal = total_points - (total_points / days * i)
                # In real implementation, calculate actual remaining from activities
                data_points.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "remaining_points": total_points - completed_points if i == days else total_points,
                    "ideal_points": round(ideal, 1)
                })

        return {
            "sprint_id": sprint_id,
            "sprint_name": sprint.name,
            "total_points": total_points,
            "completed_points": completed_points,
            "data_points": data_points
        }

    @staticmethod
    def get_velocity_data(db: Session, project_id: int, num_sprints: int = 5) -> Dict[str, Any]:
        """Get velocity chart data for recent sprints"""
        sprints = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status == SprintStatus.COMPLETED
        ).order_by(Sprint.completed_at.desc()).limit(num_sprints).all()

        data_points = []
        total_velocity = 0

        for sprint in reversed(sprints):
            tasks = db.query(Task).filter(Task.sprint_id == sprint.id).all()
            committed = sum(t.story_points or 0 for t in tasks)
            completed = sum(t.story_points or 0 for t in tasks if t.status == TaskStatus.DONE)
            total_velocity += completed
            data_points.append({
                "sprint_name": sprint.name,
                "committed_points": committed,
                "completed_points": completed
            })

        avg_velocity = total_velocity / len(sprints) if sprints else 0

        return {
            "project_id": project_id,
            "average_velocity": round(avg_velocity, 1),
            "data_points": data_points
        }

    @staticmethod
    def get_status_distribution(db: Session, project_id: int) -> Dict[str, Any]:
        """Get task status distribution"""
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        total = len(tasks)

        status_counts = {}
        for task in tasks:
            status = task.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        distribution = []
        for status, count in status_counts.items():
            distribution.append({
                "status": status,
                "count": count,
                "percentage": round((count / total * 100) if total > 0 else 0, 1)
            })

        return {
            "project_id": project_id,
            "total_tasks": total,
            "distribution": distribution
        }
