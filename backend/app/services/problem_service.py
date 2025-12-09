from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.problem import (
    Problem, ProblemStatus, ProblemIncidentLink,
    KnownError, ProblemActivity, ProblemComment, ProblemAttachment
)
from app.models.user import User
from app.schemas.problem import (
    ProblemCreate, ProblemUpdate, ProblemRCAUpdate,
    ProblemWorkaroundUpdate, ProblemSolutionUpdate,
    KnownErrorCreate, KnownErrorUpdate,
    ProblemIncidentLinkCreate, ProblemCommentCreate
)
from fastapi import HTTPException, status
import math


class ProblemService:
    """Service for Problem Management operations"""

    @staticmethod
    def generate_problem_number(db: Session) -> str:
        """Generate unique problem number"""
        # Get the latest problem number
        latest_problem = db.query(Problem).order_by(Problem.id.desc()).first()

        if latest_problem and latest_problem.problem_number:
            # Extract number from format PRB-XXXXXX
            try:
                last_num = int(latest_problem.problem_number.split('-')[1])
                new_num = last_num + 1
            except:
                new_num = 1
        else:
            new_num = 1

        return f"PRB-{new_num:06d}"

    @staticmethod
    def create_problem(
        db: Session,
        problem_data: ProblemCreate,
        created_by_id: int
    ) -> Problem:
        """Create a new problem"""
        # Generate problem number
        problem_number = ProblemService.generate_problem_number(db)

        # Create problem
        problem = Problem(
            problem_number=problem_number,
            **problem_data.model_dump()
        )

        db.add(problem)
        db.flush()

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=created_by_id,
            activity_type="CREATED",
            description=f"Problem {problem_number} created"
        )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def get_problem(db: Session, problem_id: int) -> Optional[Problem]:
        """Get problem by ID with relationships"""
        return db.query(Problem).options(
            joinedload(Problem.category),
            joinedload(Problem.subcategory),
            joinedload(Problem.assigned_to),
            joinedload(Problem.assigned_group),
            # known_error and related_change relationships temporarily disabled
            joinedload(Problem.activities).joinedload(ProblemActivity.user),
            joinedload(Problem.comments).joinedload(ProblemComment.user),
            joinedload(Problem.related_incidents)
        ).filter(Problem.id == problem_id).first()

    @staticmethod
    def get_problems(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to_id: Optional[int] = None,
        assigned_group_id: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get paginated list of problems with filters"""
        query = db.query(Problem).options(
            joinedload(Problem.category),
            joinedload(Problem.subcategory),
            joinedload(Problem.assigned_to),
            joinedload(Problem.assigned_group)
            # known_error relationship temporarily disabled due to circular FK issue
        )

        # Apply filters
        if status:
            query = query.filter(Problem.status == status)
        if priority:
            query = query.filter(Problem.priority == priority)
        if assigned_to_id:
            query = query.filter(Problem.assigned_to_id == assigned_to_id)
        if assigned_group_id:
            query = query.filter(Problem.assigned_group_id == assigned_group_id)
        if search:
            search_filter = or_(
                Problem.title.ilike(f"%{search}%"),
                Problem.description.ilike(f"%{search}%"),
                Problem.problem_number.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # Get total count
        total = query.count()

        # Apply sorting
        if sort_order == "desc":
            query = query.order_by(getattr(Problem, sort_by).desc())
        else:
            query = query.order_by(getattr(Problem, sort_by).asc())

        # Apply pagination
        offset = (page - 1) * page_size
        problems = query.offset(offset).limit(page_size).all()

        return {
            "items": problems,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 0
        }

    @staticmethod
    def update_problem(
        db: Session,
        problem_id: int,
        problem_data: ProblemUpdate,
        updated_by_id: int
    ) -> Problem:
        """Update problem"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        # Track changes
        changes = []
        update_dict = problem_data.model_dump(exclude_unset=True)

        for field, new_value in update_dict.items():
            old_value = getattr(problem, field)
            if old_value != new_value:
                setattr(problem, field, new_value)
                changes.append({
                    "field": field,
                    "old_value": str(old_value) if old_value else None,
                    "new_value": str(new_value) if new_value else None
                })

        if changes:
            for change in changes:
                ProblemService._log_activity(
                    db=db,
                    problem_id=problem.id,
                    user_id=updated_by_id,
                    activity_type="UPDATED",
                    description=f"Updated {change['field']}",
                    old_value=change['old_value'],
                    new_value=change['new_value']
                )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def update_status(
        db: Session,
        problem_id: int,
        new_status: ProblemStatus,
        user_id: int
    ) -> Problem:
        """Update problem status"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        old_status = problem.status
        problem.status = new_status

        # Update timestamps based on status
        if new_status == ProblemStatus.INVESTIGATING and not problem.investigation_started_at:
            problem.investigation_started_at = datetime.utcnow()
        elif new_status == ProblemStatus.ROOT_CAUSE_FOUND and not problem.root_cause_found_at:
            problem.root_cause_found_at = datetime.utcnow()
        elif new_status == ProblemStatus.WORKAROUND_AVAILABLE and not problem.workaround_available_at:
            problem.workaround_available_at = datetime.utcnow()
        elif new_status == ProblemStatus.RESOLVED and not problem.resolved_at:
            problem.resolved_at = datetime.utcnow()
        elif new_status == ProblemStatus.CLOSED and not problem.closed_at:
            problem.closed_at = datetime.utcnow()

        # Log activity - format status for display
        def format_status(status_val):
            val = status_val.value if hasattr(status_val, 'value') else str(status_val)
            return val.replace('_', ' ').title()

        old_status_display = format_status(old_status)
        new_status_display = format_status(new_status)
        old_status_value = old_status.value if hasattr(old_status, 'value') else str(old_status)
        new_status_value = new_status.value if hasattr(new_status, 'value') else str(new_status)

        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="STATUS_CHANGED",
            description=f"Status changed from {old_status_display} to {new_status_display}",
            old_value=old_status_value,
            new_value=new_status_value
        )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def update_rca(
        db: Session,
        problem_id: int,
        rca_data: ProblemRCAUpdate,
        user_id: int
    ) -> Problem:
        """Update Root Cause Analysis"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        problem.rca_method = rca_data.rca_method
        problem.root_cause = rca_data.root_cause
        if rca_data.investigation_notes:
            problem.investigation_notes = rca_data.investigation_notes

        if not problem.root_cause_found_at:
            problem.root_cause_found_at = datetime.utcnow()

        # Auto-update status if still investigating
        if problem.status == ProblemStatus.INVESTIGATING:
            problem.status = ProblemStatus.ROOT_CAUSE_FOUND

        # Log activity - format RCA method for display
        rca_method_value = rca_data.rca_method.value if hasattr(rca_data.rca_method, 'value') else str(rca_data.rca_method)
        # Map RCA methods to readable names
        rca_method_names = {
            'FIVE_WHYS': '5 Whys',
            'FISHBONE': 'Fishbone Diagram',
            'FAULT_TREE': 'Fault Tree Analysis',
            'KEPNER_TREGOE': 'Kepner-Tregoe',
            'OTHER': 'Other',
        }
        rca_method_display = rca_method_names.get(rca_method_value, rca_method_value.replace('_', ' ').title())
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="RCA_UPDATED",
            description=f"Root cause analysis updated using {rca_method_display} method"
        )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def update_workaround(
        db: Session,
        problem_id: int,
        workaround_data: ProblemWorkaroundUpdate,
        user_id: int
    ) -> Problem:
        """Update workaround"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        problem.has_workaround = True
        problem.workaround_description = workaround_data.workaround_description
        if workaround_data.workaround_steps:
            problem.workaround_steps = workaround_data.workaround_steps

        if not problem.workaround_available_at:
            problem.workaround_available_at = datetime.utcnow()

        # Auto-update status
        if problem.status in [ProblemStatus.INVESTIGATING, ProblemStatus.ROOT_CAUSE_FOUND]:
            problem.status = ProblemStatus.WORKAROUND_AVAILABLE

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="WORKAROUND_ADDED",
            description="Workaround added"
        )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def update_solution(
        db: Session,
        problem_id: int,
        solution_data: ProblemSolutionUpdate,
        user_id: int
    ) -> Problem:
        """Update permanent solution"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        problem.has_permanent_solution = True
        problem.permanent_solution_description = solution_data.permanent_solution_description
        if solution_data.solution_implementation_plan:
            problem.solution_implementation_plan = solution_data.solution_implementation_plan

        # Auto-update status
        if problem.status != ProblemStatus.RESOLVED:
            problem.status = ProblemStatus.PERMANENT_SOLUTION_FOUND

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="SOLUTION_ADDED",
            description="Permanent solution added"
        )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def assign_problem(
        db: Session,
        problem_id: int,
        assigned_to_id: Optional[int],
        assigned_group_id: Optional[int],
        assigned_by_id: int
    ) -> Problem:
        """Assign problem to user or group"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        old_assignee = problem.assigned_to_id
        old_group = problem.assigned_group_id

        problem.assigned_to_id = assigned_to_id
        problem.assigned_group_id = assigned_group_id

        # Log activity
        if assigned_to_id:
            assignee = db.query(User).filter(User.id == assigned_to_id).first()
            ProblemService._log_activity(
                db=db,
                problem_id=problem.id,
                user_id=assigned_by_id,
                activity_type="ASSIGNED",
                description=f"Assigned to {assignee.full_name if assignee else 'Unknown'}"
            )

        db.commit()
        db.refresh(problem)

        return problem

    @staticmethod
    def link_incident(
        db: Session,
        problem_id: int,
        link_data: ProblemIncidentLinkCreate,
        linked_by_id: int
    ) -> ProblemIncidentLink:
        """Link an incident to a problem"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        # Check if link already exists
        existing_link = db.query(ProblemIncidentLink).filter(
            and_(
                ProblemIncidentLink.problem_id == problem_id,
                ProblemIncidentLink.ticket_id == link_data.ticket_id
            )
        ).first()

        if existing_link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incident already linked to this problem"
            )

        # Create link
        link = ProblemIncidentLink(
            problem_id=problem_id,
            ticket_id=link_data.ticket_id,
            linked_by_id=linked_by_id,
            link_reason=link_data.link_reason
        )

        db.add(link)

        # Update incident count
        problem.incident_count = db.query(ProblemIncidentLink).filter(
            ProblemIncidentLink.problem_id == problem_id
        ).count() + 1

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=linked_by_id,
            activity_type="INCIDENT_LINKED",
            description=f"Incident #{link_data.ticket_id} linked to problem"
        )

        db.commit()
        db.refresh(link)

        return link

    @staticmethod
    def add_comment(
        db: Session,
        problem_id: int,
        comment_data: ProblemCommentCreate,
        user_id: int
    ) -> ProblemComment:
        """Add comment to problem"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        comment = ProblemComment(
            problem_id=problem_id,
            user_id=user_id,
            **comment_data.model_dump()
        )

        db.add(comment)

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="COMMENT_ADDED",
            description="Comment added"
        )

        db.commit()
        db.refresh(comment)

        return comment

    @staticmethod
    def delete_problem(db: Session, problem_id: int, user_id: int) -> bool:
        """Delete problem (soft delete by setting to CANCELLED)"""
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        problem.status = ProblemStatus.CANCELLED

        # Log activity
        ProblemService._log_activity(
            db=db,
            problem_id=problem.id,
            user_id=user_id,
            activity_type="CANCELLED",
            description="Problem cancelled"
        )

        db.commit()

        return True

    @staticmethod
    def _log_activity(
        db: Session,
        problem_id: int,
        user_id: int,
        activity_type: str,
        description: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        activity_metadata: Optional[Dict] = None
    ):
        """Log problem activity"""
        activity = ProblemActivity(
            problem_id=problem_id,
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            old_value=old_value,
            new_value=new_value,
            activity_metadata=activity_metadata
        )
        db.add(activity)


class KnownErrorService:
    """Service for Known Error Database (KEDB) operations"""

    @staticmethod
    def generate_known_error_number(db: Session) -> str:
        """Generate unique known error number"""
        latest_ke = db.query(KnownError).order_by(KnownError.id.desc()).first()

        if latest_ke and latest_ke.known_error_number:
            try:
                last_num = int(latest_ke.known_error_number.split('-')[1])
                new_num = last_num + 1
            except:
                new_num = 1
        else:
            new_num = 1

        return f"KE-{new_num:06d}"

    @staticmethod
    def create_known_error(
        db: Session,
        ke_data: KnownErrorCreate,
        created_by_id: int
    ) -> KnownError:
        """Create known error from problem"""
        # Verify problem exists
        problem = db.query(Problem).filter(Problem.id == ke_data.problem_id).first()
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Problem not found"
            )

        # Check if known error already exists for this problem
        existing_ke = db.query(KnownError).filter(
            KnownError.problem_id == ke_data.problem_id
        ).first()

        if existing_ke:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Known error already exists for this problem"
            )

        # Generate known error number
        ke_number = KnownErrorService.generate_known_error_number(db)

        # Create known error
        known_error = KnownError(
            known_error_number=ke_number,
            **ke_data.model_dump()
        )

        db.add(known_error)
        db.commit()
        db.refresh(known_error)

        return known_error

    @staticmethod
    def get_known_errors(
        db: Session,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Get paginated list of known errors"""
        query = db.query(KnownError).options(
            joinedload(KnownError.problem),
            joinedload(KnownError.kb_article)
        )

        # Apply filters
        if is_active is not None:
            query = query.filter(KnownError.is_active == is_active)

        if search:
            search_filter = or_(
                KnownError.title.ilike(f"%{search}%"),
                KnownError.description.ilike(f"%{search}%"),
                KnownError.known_error_number.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        known_errors = query.order_by(KnownError.created_at.desc()).offset(offset).limit(page_size).all()

        return {
            "items": known_errors,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 0
        }

    @staticmethod
    def get_known_error(db: Session, ke_id: int) -> Optional[KnownError]:
        """Get known error by ID"""
        ke = db.query(KnownError).options(
            joinedload(KnownError.problem),
            joinedload(KnownError.kb_article)
        ).filter(KnownError.id == ke_id).first()

        if ke:
            # Increment views count
            ke.views_count += 1
            db.commit()

        return ke

    @staticmethod
    def update_known_error(
        db: Session,
        ke_id: int,
        ke_data: KnownErrorUpdate
    ) -> KnownError:
        """Update known error"""
        known_error = db.query(KnownError).filter(KnownError.id == ke_id).first()
        if not known_error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Known error not found"
            )

        update_dict = ke_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(known_error, field, value)

        db.commit()
        db.refresh(known_error)

        return known_error

    @staticmethod
    def mark_helpful(db: Session, ke_id: int) -> KnownError:
        """Mark known error as helpful"""
        known_error = db.query(KnownError).filter(KnownError.id == ke_id).first()
        if not known_error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Known error not found"
            )

        known_error.helpful_count += 1
        db.commit()
        db.refresh(known_error)

        return known_error
