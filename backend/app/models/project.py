"""
Project Management Models
Similar to Jira - Projects with Tasks, Sprints, and Kanban Boards
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


# ==================== ENUMS ====================

class ProjectStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SprintStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TaskStatus(str, enum.Enum):
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    QA = "QA"
    DONE = "DONE"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskType(str, enum.Enum):
    TASK = "TASK"
    BUG = "BUG"
    FEATURE = "FEATURE"
    IMPROVEMENT = "IMPROVEMENT"
    STORY = "STORY"


class ProjectMemberRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


# ==================== MODELS ====================

class Project(Base):
    """Main project entity"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_key = Column(String(10), unique=True, nullable=False, index=True)  # e.g., "PROJ", "ITSM"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    status = Column(
        SQLEnum(ProjectStatus, name='project_status_enum', create_type=False),
        default=ProjectStatus.PLANNING,
        nullable=False
    )

    # Project leads
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Dates
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)

    # Tracking
    task_sequence = Column(Integer, default=0)  # For generating task numbers

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_projects")
    lead = relationship("User", foreign_keys=[lead_id], backref="led_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    columns = relationship("BoardColumn", back_populates="project", cascade="all, delete-orphan", order_by="BoardColumn.position")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Project {self.project_key}: {self.name}>"


class BoardColumn(Base):
    """Customizable kanban board columns"""
    __tablename__ = "board_columns"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(100), nullable=False)
    status_key = Column(String(50), nullable=False)  # Maps to TaskStatus or custom
    position = Column(Integer, default=0, nullable=False)
    color = Column(String(50), default="gray")  # Tailwind color name

    is_default = Column(Boolean, default=False)  # System columns can't be deleted
    is_done_column = Column(Boolean, default=False)  # Tasks here are considered "done"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="columns")

    def __repr__(self):
        return f"<BoardColumn {self.name} ({self.status_key})>"


class ProjectMember(Base):
    """Project team members"""
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    role = Column(
        SQLEnum(ProjectMemberRole, name='project_member_role_enum', create_type=False),
        default=ProjectMemberRole.MEMBER,
        nullable=False
    )

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", backref="project_memberships")

    def __repr__(self):
        return f"<ProjectMember user={self.user_id} project={self.project_id}>"


class Sprint(Base):
    """Time-boxed iterations for agile planning"""
    __tablename__ = "sprints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    goal = Column(Text, nullable=True)

    status = Column(
        SQLEnum(SprintStatus, name='sprint_status_enum', create_type=False),
        default=SprintStatus.PLANNING,
        nullable=False
    )

    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)

    # Actual dates (when sprint was started/completed)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="sprints")
    tasks = relationship("Task", back_populates="sprint")

    def __repr__(self):
        return f"<Sprint {self.name}>"


class Task(Base):
    """Work items within a project"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True)

    # Task identifier (e.g., PROJ-123)
    task_number = Column(String(50), unique=True, nullable=False, index=True)

    # Basic info
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Type and status
    task_type = Column(
        SQLEnum(TaskType, name='task_type_enum', create_type=False),
        default=TaskType.TASK,
        nullable=False
    )
    status = Column(
        SQLEnum(TaskStatus, name='task_status_enum', create_type=False),
        default=TaskStatus.BACKLOG,
        nullable=False,
        index=True
    )
    priority = Column(
        SQLEnum(TaskPriority, name='task_priority_enum', create_type=False),
        default=TaskPriority.MEDIUM,
        nullable=False
    )

    # People
    assignee_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Estimation
    story_points = Column(Integer, nullable=True)
    time_estimate = Column(Float, nullable=True)  # Hours
    time_spent = Column(Float, default=0)  # Hours

    # Subtasks
    parent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)

    # Dates
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Position in column for ordering
    position = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks")
    reporter = relationship("User", foreign_keys=[reporter_id], backref="reported_tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    activities = relationship("TaskActivity", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Task {self.task_number}: {self.title}>"


class TaskComment(Base):
    """Comments on tasks"""
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)

    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", backref="task_comments")

    def __repr__(self):
        return f"<TaskComment on {self.task_id} by {self.user_id}>"


class TaskActivity(Base):
    """Audit trail for task changes"""
    __tablename__ = "task_activities"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    activity_type = Column(String(50), nullable=False)  # created, updated, status_changed, assigned, etc.
    field_name = Column(String(100), nullable=True)  # Which field changed
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="activities")
    user = relationship("User", backref="task_activities")

    def __repr__(self):
        return f"<TaskActivity {self.activity_type} on {self.task_id}>"


class TaskAttachment(Base):
    """File attachments on tasks"""
    __tablename__ = "task_attachments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="attachments")
    user = relationship("User", backref="task_attachments")

    def __repr__(self):
        return f"<TaskAttachment {self.file_name}>"
