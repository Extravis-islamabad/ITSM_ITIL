from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.problem import ProblemStatus, ProblemPriority, ProblemImpact, RCAMethod


# Problem Schemas
class ProblemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    priority: ProblemPriority = ProblemPriority.MEDIUM
    impact: ProblemImpact = ProblemImpact.MEDIUM
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    assigned_group_id: Optional[int] = None
    symptoms: Optional[str] = None
    tags: Optional[List[str]] = None


class ProblemCreate(ProblemBase):
    pass


class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[ProblemStatus] = None
    priority: Optional[ProblemPriority] = None
    impact: Optional[ProblemImpact] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    assigned_group_id: Optional[int] = None
    symptoms: Optional[str] = None
    investigation_notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ProblemRCAUpdate(BaseModel):
    rca_method: RCAMethod
    root_cause: str = Field(..., min_length=1)
    investigation_notes: Optional[str] = None


class ProblemWorkaroundUpdate(BaseModel):
    workaround_description: str = Field(..., min_length=1)
    workaround_steps: Optional[str] = None


class ProblemSolutionUpdate(BaseModel):
    permanent_solution_description: str = Field(..., min_length=1)
    solution_implementation_plan: Optional[str] = None


class ProblemResponse(BaseModel):
    id: int
    problem_number: str
    title: str
    description: str
    status: ProblemStatus
    priority: ProblemPriority
    impact: ProblemImpact
    category_id: Optional[int]
    subcategory_id: Optional[int]
    assigned_to_id: Optional[int]
    assigned_group_id: Optional[int]
    rca_method: Optional[RCAMethod]
    root_cause: Optional[str]
    symptoms: Optional[str]
    investigation_notes: Optional[str]
    has_workaround: bool
    workaround_description: Optional[str]
    workaround_steps: Optional[str]
    has_permanent_solution: bool
    permanent_solution_description: Optional[str]
    solution_implementation_plan: Optional[str]
    related_change_id: Optional[int]
    known_error_id: Optional[int] = None
    tags: Optional[List[str]]
    incident_count: int
    affected_users_count: int
    business_impact_description: Optional[str]
    identified_at: datetime
    investigation_started_at: Optional[datetime]
    root_cause_found_at: Optional[datetime]
    workaround_available_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Related objects (optional, loaded with relationships)
    category: Optional[dict] = None
    subcategory: Optional[dict] = None
    assigned_to: Optional[dict] = None
    assigned_group: Optional[dict] = None
    related_incidents: Optional[List[dict]] = None
    comments: Optional[List[dict]] = None
    activities: Optional[List[dict]] = None

    class Config:
        from_attributes = True


# Known Error Schemas
class KnownErrorBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    error_symptoms: str = Field(..., min_length=1)
    root_cause: str = Field(..., min_length=1)
    workaround_description: str = Field(..., min_length=1)
    workaround_steps: Optional[str] = None
    workaround_limitations: Optional[str] = None
    permanent_solution_description: Optional[str] = None
    solution_status: Optional[str] = None
    solution_eta: Optional[datetime] = None
    affected_cis: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    kb_article_id: Optional[int] = None


class KnownErrorCreate(KnownErrorBase):
    problem_id: int


class KnownErrorUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    error_symptoms: Optional[str] = Field(None, min_length=1)
    root_cause: Optional[str] = Field(None, min_length=1)
    workaround_description: Optional[str] = Field(None, min_length=1)
    workaround_steps: Optional[str] = None
    workaround_limitations: Optional[str] = None
    permanent_solution_description: Optional[str] = None
    solution_status: Optional[str] = None
    solution_eta: Optional[datetime] = None
    affected_cis: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    kb_article_id: Optional[int] = None
    is_active: Optional[bool] = None


class KnownErrorResponse(BaseModel):
    id: int
    known_error_number: str
    title: str
    description: str
    is_active: bool
    problem_id: int
    error_symptoms: str
    root_cause: str
    affected_cis: Optional[List[dict]]
    workaround_description: str
    workaround_steps: Optional[str]
    workaround_limitations: Optional[str]
    permanent_solution_description: Optional[str]
    solution_status: Optional[str]
    solution_eta: Optional[datetime]
    kb_article_id: Optional[int]
    tags: Optional[List[str]]
    views_count: int
    helpful_count: int
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime]

    # Related objects
    problem: Optional[dict] = None
    kb_article: Optional[dict] = None

    class Config:
        from_attributes = True


# Problem Incident Link Schemas
class ProblemIncidentLinkCreate(BaseModel):
    ticket_id: int
    link_reason: Optional[str] = None


class ProblemIncidentLinkResponse(BaseModel):
    id: int
    problem_id: int
    ticket_id: int
    linked_at: datetime
    linked_by_id: int
    link_reason: Optional[str]

    # Related objects
    ticket: Optional[dict] = None
    linked_by: Optional[dict] = None

    class Config:
        from_attributes = True


# Problem Comment Schemas
class ProblemCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)
    is_internal: bool = False


class ProblemCommentResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    comment: str
    is_internal: bool
    created_at: datetime
    updated_at: datetime

    # Related objects
    user: Optional[dict] = None

    class Config:
        from_attributes = True


# Problem Activity Schemas
class ProblemActivityResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    activity_type: str
    description: str
    old_value: Optional[str]
    new_value: Optional[str]
    activity_metadata: Optional[dict]
    created_at: datetime

    # Related objects
    user: Optional[dict] = None

    class Config:
        from_attributes = True


# List Response Schemas
class ProblemListResponse(BaseModel):
    items: List[ProblemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class KnownErrorListResponse(BaseModel):
    items: List[KnownErrorResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
