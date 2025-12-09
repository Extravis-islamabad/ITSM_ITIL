from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_teamlead_or_above
from app.models.user import User
from app.models.problem import ProblemStatus, Problem
from app.schemas.problem import (
    ProblemCreate, ProblemUpdate, ProblemResponse, ProblemListResponse,
    ProblemRCAUpdate, ProblemWorkaroundUpdate, ProblemSolutionUpdate,
    KnownErrorCreate, KnownErrorUpdate, KnownErrorResponse, KnownErrorListResponse,
    ProblemIncidentLinkCreate, ProblemIncidentLinkResponse,
    ProblemCommentCreate, ProblemCommentResponse,
    ProblemActivityResponse
)
from app.services.problem_service import ProblemService, KnownErrorService

router = APIRouter(
    dependencies=[Depends(require_teamlead_or_above())]  # All problem endpoints require Team Lead+
)


def serialize_problem_response(problem: Problem) -> dict:
    """Helper function to serialize problem with nested objects"""
    problem_dict = {
        "id": problem.id,
        "problem_number": problem.problem_number,
        "title": problem.title,
        "description": problem.description,
        "status": problem.status,
        "priority": problem.priority,
        "impact": problem.impact,
        "category_id": problem.category_id,
        "subcategory_id": problem.subcategory_id,
        "assigned_to_id": problem.assigned_to_id,
        "assigned_group_id": problem.assigned_group_id,
        "rca_method": problem.rca_method,
        "root_cause": problem.root_cause,
        "symptoms": problem.symptoms,
        "investigation_notes": problem.investigation_notes,
        "has_workaround": problem.has_workaround,
        "workaround_description": problem.workaround_description,
        "workaround_steps": problem.workaround_steps,
        "has_permanent_solution": problem.has_permanent_solution,
        "permanent_solution_description": problem.permanent_solution_description,
        "solution_implementation_plan": problem.solution_implementation_plan,
        "related_change_id": problem.related_change_id,
        "known_error_id": None,  # Temporarily disabled
        "tags": problem.tags,
        "incident_count": problem.incident_count,
        "affected_users_count": problem.affected_users_count,
        "business_impact_description": problem.business_impact_description,
        "identified_at": problem.identified_at,
        "investigation_started_at": problem.investigation_started_at,
        "root_cause_found_at": problem.root_cause_found_at,
        "workaround_available_at": problem.workaround_available_at,
        "resolved_at": problem.resolved_at,
        "closed_at": problem.closed_at,
        "created_at": problem.created_at,
        "updated_at": problem.updated_at,
    }

    # Serialize nested objects
    if problem.category:
        problem_dict["category"] = {
            "id": problem.category.id,
            "name": problem.category.name,
            "description": problem.category.description,
        }

    if problem.subcategory:
        problem_dict["subcategory"] = {
            "id": problem.subcategory.id,
            "name": problem.subcategory.name,
        }

    if problem.assigned_to:
        problem_dict["assigned_to"] = {
            "id": problem.assigned_to.id,
            "full_name": problem.assigned_to.full_name,
            "email": problem.assigned_to.email,
        }

    if problem.assigned_group:
        problem_dict["assigned_group"] = {
            "id": problem.assigned_group.id,
            "name": problem.assigned_group.name,
        }

    # Serialize related incidents
    if hasattr(problem, 'related_incidents') and problem.related_incidents:
        problem_dict["related_incidents"] = [
            {
                "id": link.id,
                "problem_id": link.problem_id,
                "ticket_id": link.ticket_id,
                "linked_at": link.linked_at,
                "linked_by_id": link.linked_by_id,
                "link_reason": link.link_reason,
            }
            for link in problem.related_incidents
        ]
    else:
        problem_dict["related_incidents"] = []

    # Serialize comments
    if hasattr(problem, 'comments') and problem.comments:
        problem_dict["comments"] = [
            {
                "id": comment.id,
                "problem_id": comment.problem_id,
                "user_id": comment.user_id,
                "comment": comment.comment,
                "is_internal": comment.is_internal,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
                "user": {
                    "id": comment.user.id,
                    "full_name": comment.user.full_name,
                    "email": comment.user.email,
                } if comment.user else None,
            }
            for comment in problem.comments
        ]
    else:
        problem_dict["comments"] = []

    # Serialize activities
    if hasattr(problem, 'activities') and problem.activities:
        problem_dict["activities"] = [
            {
                "id": activity.id,
                "problem_id": activity.problem_id,
                "user_id": activity.user_id,
                "activity_type": activity.activity_type,
                "description": activity.description,
                "old_value": activity.old_value,
                "new_value": activity.new_value,
                "created_at": activity.created_at,
                "user": {
                    "id": activity.user.id,
                    "full_name": activity.user.full_name,
                } if activity.user else None,
            }
            for activity in problem.activities
        ]
    else:
        problem_dict["activities"] = []

    return problem_dict


# Problem endpoints
@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new problem"""
    problem = ProblemService.create_problem(db, problem_data, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.get("", response_model=ProblemListResponse)
async def get_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
    assigned_group_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of problems with filters"""
    result = ProblemService.get_problems(
        db=db,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        assigned_to_id=assigned_to_id,
        assigned_group_id=assigned_group_id,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )

    # Serialize each problem
    serialized_items = [serialize_problem_response(problem) for problem in result['items']]

    return {
        "items": serialized_items,
        "total": result['total'],
        "page": result['page'],
        "page_size": result['page_size'],
        "total_pages": result['total_pages']
    }


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get problem by ID"""
    problem = ProblemService.get_problem(db, problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )
    return serialize_problem_response(problem)


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    problem_data: ProblemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update problem"""
    problem = ProblemService.update_problem(db, problem_id, problem_data, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete (cancel) problem"""
    ProblemService.delete_problem(db, problem_id, current_user.id)
    return None


@router.post("/{problem_id}/status", response_model=ProblemResponse)
async def update_problem_status(
    problem_id: int,
    new_status: ProblemStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update problem status"""
    problem = ProblemService.update_status(db, problem_id, new_status, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.post("/{problem_id}/rca", response_model=ProblemResponse)
async def update_rca(
    problem_id: int,
    rca_data: ProblemRCAUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update Root Cause Analysis"""
    problem = ProblemService.update_rca(db, problem_id, rca_data, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.post("/{problem_id}/workaround", response_model=ProblemResponse)
async def update_workaround(
    problem_id: int,
    workaround_data: ProblemWorkaroundUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add/update workaround"""
    problem = ProblemService.update_workaround(db, problem_id, workaround_data, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.post("/{problem_id}/solution", response_model=ProblemResponse)
async def update_solution(
    problem_id: int,
    solution_data: ProblemSolutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add/update permanent solution"""
    problem = ProblemService.update_solution(db, problem_id, solution_data, current_user.id)
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.post("/{problem_id}/assign", response_model=ProblemResponse)
async def assign_problem(
    problem_id: int,
    assigned_to_id: Optional[int] = None,
    assigned_group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign problem to user or group"""
    problem = ProblemService.assign_problem(
        db, problem_id, assigned_to_id, assigned_group_id, current_user.id
    )
    # Reload with relationships
    problem = ProblemService.get_problem(db, problem.id)
    return serialize_problem_response(problem)


@router.post("/{problem_id}/incidents", response_model=ProblemIncidentLinkResponse, status_code=status.HTTP_201_CREATED)
async def link_incident(
    problem_id: int,
    link_data: ProblemIncidentLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link an incident to problem"""
    link = ProblemService.link_incident(db, problem_id, link_data, current_user.id)
    # Serialize the response
    return {
        "id": link.id,
        "problem_id": link.problem_id,
        "ticket_id": link.ticket_id,
        "linked_at": link.linked_at,
        "linked_by_id": link.linked_by_id,
        "link_reason": link.link_reason,
        "ticket": {
            "id": link.ticket.id,
            "ticket_number": link.ticket.ticket_number,
            "title": link.ticket.title,
        } if link.ticket else None,
        "linked_by": {
            "id": link.linked_by.id,
            "full_name": link.linked_by.full_name,
            "email": link.linked_by.email,
        } if link.linked_by else None,
    }


@router.post("/{problem_id}/comments", response_model=ProblemCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    problem_id: int,
    comment_data: ProblemCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add comment to problem"""
    comment = ProblemService.add_comment(db, problem_id, comment_data, current_user.id)
    # Serialize the response
    return {
        "id": comment.id,
        "problem_id": comment.problem_id,
        "user_id": comment.user_id,
        "comment": comment.comment,
        "is_internal": comment.is_internal,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "user": {
            "id": comment.user.id,
            "full_name": comment.user.full_name,
            "email": comment.user.email,
        } if comment.user else None,
    }


# Known Error endpoints
@router.post("/known-errors", response_model=KnownErrorResponse, status_code=status.HTTP_201_CREATED)
async def create_known_error(
    ke_data: KnownErrorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create known error from problem"""
    return KnownErrorService.create_known_error(db, ke_data, current_user.id)


@router.get("/known-errors", response_model=KnownErrorListResponse)
async def get_known_errors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of known errors"""
    return KnownErrorService.get_known_errors(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        is_active=is_active
    )


@router.get("/known-errors/{ke_id}", response_model=KnownErrorResponse)
async def get_known_error(
    ke_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get known error by ID"""
    ke = KnownErrorService.get_known_error(db, ke_id)
    if not ke:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Known error not found"
        )
    return ke


@router.put("/known-errors/{ke_id}", response_model=KnownErrorResponse)
async def update_known_error(
    ke_id: int,
    ke_data: KnownErrorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update known error"""
    return KnownErrorService.update_known_error(db, ke_id, ke_data)


@router.post("/known-errors/{ke_id}/helpful", response_model=KnownErrorResponse)
async def mark_known_error_helpful(
    ke_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark known error as helpful"""
    return KnownErrorService.mark_helpful(db, ke_id)
