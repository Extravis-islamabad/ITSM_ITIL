"""
Project Management Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# ==================== ENUMS ====================

class ProjectStatusEnum(str, Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SprintStatusEnum(str, Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TaskStatusEnum(str, Enum):
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    QA = "QA"
    DONE = "DONE"


class TaskPriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskTypeEnum(str, Enum):
    TASK = "TASK"
    BUG = "BUG"
    FEATURE = "FEATURE"
    IMPROVEMENT = "IMPROVEMENT"
    STORY = "STORY"


class ProjectMemberRoleEnum(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


# ==================== USER SCHEMAS ====================

class UserBrief(BaseModel):
    id: int
    full_name: str
    email: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== BOARD COLUMN SCHEMAS ====================

class BoardColumnBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    status_key: str = Field(..., min_length=1, max_length=50)
    position: int = 0
    color: str = "gray"
    is_default: bool = False
    is_done_column: bool = False


class BoardColumnCreate(BoardColumnBase):
    pass


class BoardColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    color: Optional[str] = None
    is_done_column: Optional[bool] = None


class BoardColumnResponse(BoardColumnBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BoardColumnReorder(BaseModel):
    column_ids: List[int]


# ==================== PROJECT MEMBER SCHEMAS ====================

class ProjectMemberBase(BaseModel):
    user_id: int
    role: ProjectMemberRoleEnum = ProjectMemberRoleEnum.MEMBER


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberUpdate(BaseModel):
    role: ProjectMemberRoleEnum


class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: ProjectMemberRoleEnum
    joined_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ==================== SPRINT SCHEMAS ====================

class SprintBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class SprintResponse(SprintBase):
    id: int
    project_id: int
    status: SprintStatusEnum
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    task_count: int = 0
    completed_task_count: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0

    class Config:
        from_attributes = True


class SprintComplete(BaseModel):
    move_incomplete_to: Optional[str] = "backlog"  # "backlog" or sprint_id


# ==================== TASK COMMENT SCHEMAS ====================

class TaskCommentBase(BaseModel):
    content: str = Field(..., min_length=1)


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class TaskCommentResponse(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ==================== TASK ACTIVITY SCHEMAS ====================

class TaskActivityResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    activity_type: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ==================== TASK ATTACHMENT SCHEMAS ====================

class TaskAttachmentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    user: Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ==================== TASK SCHEMAS ====================

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    task_type: TaskTypeEnum = TaskTypeEnum.TASK
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    story_points: Optional[int] = None
    time_estimate: Optional[float] = None
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    status: TaskStatusEnum = TaskStatusEnum.BACKLOG
    assignee_id: Optional[int] = None
    sprint_id: Optional[int] = None
    parent_task_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskTypeEnum] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[TaskPriorityEnum] = None
    assignee_id: Optional[int] = None
    sprint_id: Optional[int] = None
    story_points: Optional[int] = None
    time_estimate: Optional[float] = None
    time_spent: Optional[float] = None
    due_date: Optional[date] = None
    position: Optional[int] = None


class TaskMove(BaseModel):
    status: TaskStatusEnum
    position: Optional[int] = None


class TaskBulkMove(BaseModel):
    task_ids: List[int]
    sprint_id: Optional[int] = None  # None means backlog


class TaskResponse(TaskBase):
    id: int
    project_id: int
    sprint_id: Optional[int] = None
    task_number: str
    status: TaskStatusEnum
    assignee_id: Optional[int] = None
    reporter_id: int
    time_spent: float = 0
    parent_task_id: Optional[int] = None
    position: int = 0
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserBrief] = None
    reporter: Optional[UserBrief] = None
    subtask_count: int = 0
    comment_count: int = 0

    class Config:
        from_attributes = True


class TaskDetailResponse(TaskResponse):
    comments: List[TaskCommentResponse] = []
    activities: List[TaskActivityResponse] = []
    attachments: List[TaskAttachmentResponse] = []
    subtasks: List["TaskResponse"] = []

    class Config:
        from_attributes = True


# ==================== PROJECT SCHEMAS ====================

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    project_key: str = Field(..., min_length=2, max_length=10, pattern="^[A-Z0-9]+$")
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    lead_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatusEnum] = None
    lead_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectResponse(ProjectBase):
    id: int
    status: ProjectStatusEnum
    owner_id: int
    lead_id: Optional[int] = None
    task_sequence: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: Optional[UserBrief] = None
    lead: Optional[UserBrief] = None
    member_count: int = 0
    task_count: int = 0
    open_task_count: int = 0

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    columns: List[BoardColumnResponse] = []
    members: List[ProjectMemberResponse] = []
    active_sprint: Optional[SprintResponse] = None

    class Config:
        from_attributes = True


# ==================== REPORT SCHEMAS ====================

class BurndownDataPoint(BaseModel):
    date: str
    remaining_points: int
    ideal_points: float


class BurndownReport(BaseModel):
    sprint_id: int
    sprint_name: str
    total_points: int
    completed_points: int
    data_points: List[BurndownDataPoint]


class VelocityDataPoint(BaseModel):
    sprint_name: str
    completed_points: int
    committed_points: int


class VelocityReport(BaseModel):
    project_id: int
    average_velocity: float
    data_points: List[VelocityDataPoint]


class StatusDistribution(BaseModel):
    status: str
    count: int
    percentage: float


class ProjectStatusReport(BaseModel):
    project_id: int
    total_tasks: int
    distribution: List[StatusDistribution]


# ==================== PAGINATION ====================

class PaginatedProjects(BaseModel):
    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedTasks(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
