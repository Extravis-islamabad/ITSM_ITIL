"""
Project Management API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
from pathlib import Path

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import TaskAttachment
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse,
    SprintCreate, SprintUpdate, SprintResponse, SprintComplete,
    TaskCreate, TaskUpdate, TaskResponse, TaskDetailResponse, TaskMove, TaskBulkMove,
    BoardColumnCreate, BoardColumnUpdate, BoardColumnResponse, BoardColumnReorder,
    ProjectMemberCreate, ProjectMemberUpdate, ProjectMemberResponse,
    TaskCommentCreate, TaskCommentResponse,
    PaginatedProjects, PaginatedTasks,
    BurndownReport, VelocityReport, ProjectStatusReport,
    ProjectMemberRoleEnum
)
from app.services.project_service import (
    ProjectService, SprintService, TaskService, ProjectReportService
)

router = APIRouter(prefix="/projects", tags=["Projects"])

UPLOAD_DIR = Path("uploads/tasks")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ==================== PROJECT ENDPOINTS ====================

@router.get("", response_model=PaginatedProjects)
async def get_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    owner_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of projects accessible to user"""
    skip = (page - 1) * page_size
    projects, total = ProjectService.get_projects(
        db, current_user, skip, page_size, search, status, owner_id
    )

    items = []
    for p in projects:
        from sqlalchemy import func
        from app.models.project import ProjectMember, Task, TaskStatus

        member_count = db.query(func.count(ProjectMember.id)).filter(
            ProjectMember.project_id == p.id
        ).scalar()
        task_count = db.query(func.count(Task.id)).filter(
            Task.project_id == p.id
        ).scalar()
        open_task_count = db.query(func.count(Task.id)).filter(
            Task.project_id == p.id,
            Task.status != TaskStatus.DONE
        ).scalar()

        items.append({
            "id": p.id,
            "project_key": p.project_key,
            "name": p.name,
            "description": p.description,
            "status": p.status.value,
            "owner_id": p.owner_id,
            "lead_id": p.lead_id,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "task_sequence": p.task_sequence,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "owner": {"id": p.owner.id, "full_name": p.owner.full_name, "email": p.owner.email} if p.owner else None,
            "lead": {"id": p.lead.id, "full_name": p.lead.full_name, "email": p.lead.email} if p.lead else None,
            "member_count": member_count,
            "task_count": task_count,
            "open_task_count": open_task_count
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    project = ProjectService.create_project(db, project_data, current_user)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get active sprint
    active_sprint = SprintService.get_active_sprint(db, project_id)

    return {
        "id": project.id,
        "project_key": project.project_key,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "owner_id": project.owner_id,
        "lead_id": project.lead_id,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "task_sequence": project.task_sequence,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "owner": {"id": project.owner.id, "full_name": project.owner.full_name, "email": project.owner.email, "avatar_url": project.owner.avatar_url} if project.owner else None,
        "lead": {"id": project.lead.id, "full_name": project.lead.full_name, "email": project.lead.email, "avatar_url": project.lead.avatar_url} if project.lead else None,
        "columns": project.columns,
        "members": [{"id": m.id, "project_id": m.project_id, "user_id": m.user_id, "role": m.role.value, "joined_at": m.joined_at, "user": {"id": m.user.id, "full_name": m.user.full_name, "email": m.user.email, "avatar_url": m.user.avatar_url} if m.user else None} for m in project.members],
        "active_sprint": active_sprint,
        "member_count": len(project.members),
        "task_count": len(project.tasks) if project.tasks else 0,
        "open_task_count": len([t for t in project.tasks if t.status.value != "DONE"]) if project.tasks else 0
    }


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    project = ProjectService.update_project(db, project_id, project_data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project"""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only project owner can delete")

    ProjectService.delete_project(db, project_id)


# ==================== BOARD COLUMN ENDPOINTS ====================

@router.get("/{project_id}/board/columns", response_model=List[BoardColumnResponse])
async def get_board_columns(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get board columns for a project"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectService.get_board_columns(db, project_id)


@router.post("/{project_id}/board/columns", response_model=BoardColumnResponse, status_code=status.HTTP_201_CREATED)
async def create_board_column(
    project_id: int,
    column_data: BoardColumnCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new column to the board"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectService.create_board_column(db, project_id, column_data)


@router.put("/{project_id}/board/columns/{column_id}", response_model=BoardColumnResponse)
async def update_board_column(
    project_id: int,
    column_id: int,
    column_data: BoardColumnUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a board column"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    column = ProjectService.update_board_column(db, column_id, column_data)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    return column


@router.delete("/{project_id}/board/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board_column(
    project_id: int,
    column_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a board column"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    if not ProjectService.delete_board_column(db, column_id):
        raise HTTPException(status_code=400, detail="Cannot delete column")


@router.put("/{project_id}/board/columns/reorder", response_model=List[BoardColumnResponse])
async def reorder_board_columns(
    project_id: int,
    reorder_data: BoardColumnReorder,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder board columns"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectService.reorder_columns(db, project_id, reorder_data.column_ids)


# ==================== PROJECT MEMBER ENDPOINTS ====================

@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def get_project_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project members"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    members = ProjectService.get_project_members(db, project_id)
    return [
        {
            "id": m.id,
            "project_id": m.project_id,
            "user_id": m.user_id,
            "role": m.role.value,
            "joined_at": m.joined_at,
            "user": {"id": m.user.id, "full_name": m.user.full_name, "email": m.user.email, "avatar_url": m.user.avatar_url} if m.user else None
        }
        for m in members
    ]


@router.post("/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to the project"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    member = ProjectService.add_project_member(db, project_id, member_data)
    return member


@router.put("/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: int,
    user_id: int,
    member_data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a member's role"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    member = ProjectService.update_project_member(db, project_id, user_id, member_data.role)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from the project"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    if not ProjectService.remove_project_member(db, project_id, user_id):
        raise HTTPException(status_code=404, detail="Member not found")


# ==================== SPRINT ENDPOINTS ====================

@router.get("/{project_id}/sprints", response_model=List[SprintResponse])
async def get_sprints(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sprints for a project"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    sprints = SprintService.get_sprints(db, project_id)
    return [
        {
            "id": s.id,
            "project_id": s.project_id,
            "name": s.name,
            "goal": s.goal,
            "status": s.status.value,
            "start_date": s.start_date,
            "end_date": s.end_date,
            "started_at": s.started_at,
            "completed_at": s.completed_at,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "task_count": getattr(s, 'task_count', 0),
            "completed_task_count": getattr(s, 'completed_task_count', 0),
            "total_story_points": getattr(s, 'total_story_points', 0),
            "completed_story_points": getattr(s, 'completed_story_points', 0)
        }
        for s in sprints
    ]


@router.post("/{project_id}/sprints", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
async def create_sprint(
    project_id: int,
    sprint_data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    return SprintService.create_sprint(db, project_id, sprint_data)


@router.get("/{project_id}/sprints/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    project_id: int,
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a sprint by ID"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    sprint = SprintService.get_sprint(db, sprint_id)
    if not sprint or sprint.project_id != project_id:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.put("/{project_id}/sprints/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    project_id: int,
    sprint_id: int,
    sprint_data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    sprint = SprintService.update_sprint(db, sprint_id, sprint_data)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.post("/{project_id}/sprints/{sprint_id}/start", response_model=SprintResponse)
async def start_sprint(
    project_id: int,
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    return SprintService.start_sprint(db, sprint_id)


@router.post("/{project_id}/sprints/{sprint_id}/complete", response_model=SprintResponse)
async def complete_sprint(
    project_id: int,
    sprint_id: int,
    complete_data: SprintComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    return SprintService.complete_sprint(db, sprint_id, complete_data.move_incomplete_to)


@router.delete("/{project_id}/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    project_id: int,
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")

    if not SprintService.delete_sprint(db, sprint_id):
        raise HTTPException(status_code=404, detail="Sprint not found")


# ==================== TASK ENDPOINTS ====================

@router.get("/{project_id}/tasks", response_model=PaginatedTasks)
async def get_tasks(
    project_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sprint_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    task_type: Optional[str] = None,
    assignee_id: Optional[int] = None,
    search: Optional[str] = None,
    in_backlog: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks with filters"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    skip = (page - 1) * page_size
    tasks, total = TaskService.get_tasks(
        db, project_id, skip, page_size, sprint_id, status, priority,
        task_type, assignee_id, search, in_backlog
    )

    items = []
    for t in tasks:
        items.append({
            "id": t.id,
            "project_id": t.project_id,
            "sprint_id": t.sprint_id,
            "task_number": t.task_number,
            "title": t.title,
            "description": t.description,
            "task_type": t.task_type.value,
            "status": t.status.value,
            "priority": t.priority.value,
            "assignee_id": t.assignee_id,
            "reporter_id": t.reporter_id,
            "story_points": t.story_points,
            "time_estimate": t.time_estimate,
            "time_spent": t.time_spent or 0,
            "due_date": t.due_date,
            "parent_task_id": t.parent_task_id,
            "position": t.position,
            "completed_at": t.completed_at,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "assignee": {"id": t.assignee.id, "full_name": t.assignee.full_name, "email": t.assignee.email, "avatar_url": t.assignee.avatar_url} if t.assignee else None,
            "reporter": {"id": t.reporter.id, "full_name": t.reporter.full_name, "email": t.reporter.email, "avatar_url": t.reporter.avatar_url} if t.reporter else None,
            "subtask_count": getattr(t, 'subtask_count', 0),
            "comment_count": getattr(t, 'comment_count', 0)
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: int,
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    task = TaskService.create_task(db, project_id, task_data, current_user)
    return task


@router.get("/{project_id}/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task details"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    task = TaskService.get_task(db, task_id)
    if not task or task.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": task.id,
        "project_id": task.project_id,
        "sprint_id": task.sprint_id,
        "task_number": task.task_number,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type.value,
        "status": task.status.value,
        "priority": task.priority.value,
        "assignee_id": task.assignee_id,
        "reporter_id": task.reporter_id,
        "story_points": task.story_points,
        "time_estimate": task.time_estimate,
        "time_spent": task.time_spent or 0,
        "due_date": task.due_date,
        "parent_task_id": task.parent_task_id,
        "position": task.position,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "assignee": {"id": task.assignee.id, "full_name": task.assignee.full_name, "email": task.assignee.email, "avatar_url": task.assignee.avatar_url} if task.assignee else None,
        "reporter": {"id": task.reporter.id, "full_name": task.reporter.full_name, "email": task.reporter.email, "avatar_url": task.reporter.avatar_url} if task.reporter else None,
        "subtask_count": getattr(task, 'subtask_count', 0),
        "comment_count": getattr(task, 'comment_count', 0),
        "comments": [
            {
                "id": c.id,
                "task_id": c.task_id,
                "user_id": c.user_id,
                "content": c.content,
                "is_edited": c.is_edited,
                "edited_at": c.edited_at,
                "created_at": c.created_at,
                "user": {"id": c.user.id, "full_name": c.user.full_name, "email": c.user.email, "avatar_url": c.user.avatar_url} if c.user else None
            }
            for c in (task.comments or [])
        ],
        "activities": [
            {
                "id": a.id,
                "task_id": a.task_id,
                "user_id": a.user_id,
                "activity_type": a.activity_type,
                "field_name": a.field_name,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "description": a.description,
                "created_at": a.created_at,
                "user": {"id": a.user.id, "full_name": a.user.full_name, "email": a.user.email, "avatar_url": a.user.avatar_url} if a.user else None
            }
            for a in (task.activities or [])
        ],
        "attachments": [
            {
                "id": att.id,
                "task_id": att.task_id,
                "user_id": att.user_id,
                "file_name": att.file_name,
                "file_path": att.file_path,
                "file_type": att.file_type,
                "file_size": att.file_size,
                "created_at": att.created_at,
                "user": {"id": att.user.id, "full_name": att.user.full_name, "email": att.user.email, "avatar_url": att.user.avatar_url} if att.user else None
            }
            for att in (task.attachments or [])
        ],
        "subtasks": [
            {
                "id": s.id,
                "project_id": s.project_id,
                "sprint_id": s.sprint_id,
                "task_number": s.task_number,
                "title": s.title,
                "description": s.description,
                "task_type": s.task_type.value,
                "status": s.status.value,
                "priority": s.priority.value,
                "assignee_id": s.assignee_id,
                "reporter_id": s.reporter_id,
                "story_points": s.story_points,
                "time_estimate": s.time_estimate,
                "time_spent": s.time_spent or 0,
                "due_date": s.due_date,
                "parent_task_id": s.parent_task_id,
                "position": s.position,
                "completed_at": s.completed_at,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
                "assignee": None,
                "reporter": None,
                "subtask_count": 0,
                "comment_count": 0
            }
            for s in (task.subtasks or [])
        ]
    }


@router.put("/{project_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: int,
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    task = TaskService.update_task(db, task_id, task_data, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{project_id}/tasks/{task_id}/move", response_model=TaskResponse)
async def move_task(
    project_id: int,
    task_id: int,
    move_data: TaskMove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move a task to a different column (status)"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    task = TaskService.move_task(db, task_id, move_data, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{project_id}/tasks/bulk-move")
async def bulk_move_tasks(
    project_id: int,
    bulk_data: TaskBulkMove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move multiple tasks to a sprint (or backlog)"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    count = TaskService.bulk_move_to_sprint(db, bulk_data.task_ids, bulk_data.sprint_id)
    return {"moved_count": count}


@router.delete("/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    if not ProjectService.check_project_access(db, project_id, current_user, ProjectMemberRoleEnum.MEMBER):
        raise HTTPException(status_code=403, detail="Access denied")

    if not TaskService.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found")


# ==================== TASK COMMENT ENDPOINTS ====================

@router.post("/{project_id}/tasks/{task_id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_task_comment(
    project_id: int,
    task_id: int,
    comment_data: TaskCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a task"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    comment = TaskService.add_comment(db, task_id, comment_data, current_user)
    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "is_edited": comment.is_edited,
        "edited_at": comment.edited_at,
        "created_at": comment.created_at,
        "user": {"id": current_user.id, "full_name": current_user.full_name, "email": current_user.email, "avatar_url": current_user.avatar_url}
    }


@router.delete("/{project_id}/tasks/{task_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_comment(
    project_id: int,
    task_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment"""
    if not TaskService.delete_comment(db, comment_id, current_user):
        raise HTTPException(status_code=404, detail="Comment not found or access denied")


# ==================== TASK ATTACHMENT ENDPOINTS ====================

@router.post("/{project_id}/tasks/{task_id}/attachments")
async def upload_task_attachment(
    project_id: int,
    task_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file attachment to a task"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    # Verify task exists
    task = TaskService.get_task(db, task_id)
    if not task or task.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create attachment record
    attachment = TaskAttachment(
        task_id=task_id,
        user_id=current_user.id,
        file_name=file.filename,
        file_path=str(file_path),
        file_type=file.content_type,
        file_size=len(content)
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "file_path": attachment.file_path,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size
    }


# ==================== REPORT ENDPOINTS ====================

@router.get("/{project_id}/reports/burndown")
async def get_burndown_report(
    project_id: int,
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get burndown chart data for a sprint"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectReportService.get_burndown_data(db, sprint_id)


@router.get("/{project_id}/reports/velocity")
async def get_velocity_report(
    project_id: int,
    num_sprints: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get velocity chart data"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectReportService.get_velocity_data(db, project_id, num_sprints)


@router.get("/{project_id}/reports/status")
async def get_status_report(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get task status distribution"""
    if not ProjectService.check_project_access(db, project_id, current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectReportService.get_status_distribution(db, project_id)
