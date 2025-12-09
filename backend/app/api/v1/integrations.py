"""
API endpoints for external integrations (JIRA, Trello, Asana)
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, require_manager_or_above
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketType
from app.models.integration import (
    Integration, ImportJob, ImportedItem,
    IntegrationType, IntegrationStatus, ImportStatus
)
from app.services.integration_service import (
    IntegrationService, JiraService, TrelloService, AsanaService
)

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ============ Schemas ============

class IntegrationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    integration_type: IntegrationType

    # Connection details
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    username: Optional[str] = None

    # JIRA specific
    jira_project_key: Optional[str] = None

    # Trello specific
    trello_board_id: Optional[str] = None

    # Asana specific
    asana_workspace_id: Optional[str] = None
    asana_project_id: Optional[str] = None

    # Settings
    auto_sync: bool = False
    sync_interval_minutes: int = 60
    import_attachments: bool = True
    import_comments: bool = True

    # Mappings
    field_mappings: Optional[Dict[str, Any]] = None
    status_mappings: Optional[Dict[str, str]] = None
    priority_mappings: Optional[Dict[str, str]] = None


class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    username: Optional[str] = None

    jira_project_key: Optional[str] = None
    trello_board_id: Optional[str] = None
    asana_workspace_id: Optional[str] = None
    asana_project_id: Optional[str] = None

    auto_sync: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None
    import_attachments: Optional[bool] = None
    import_comments: Optional[bool] = None

    field_mappings: Optional[Dict[str, Any]] = None
    status_mappings: Optional[Dict[str, str]] = None
    priority_mappings: Optional[Dict[str, str]] = None
    status: Optional[IntegrationStatus] = None


class IntegrationResponse(BaseModel):
    id: int
    name: str
    integration_type: IntegrationType
    status: IntegrationStatus
    api_url: Optional[str]
    jira_project_key: Optional[str]
    trello_board_id: Optional[str]
    asana_workspace_id: Optional[str]
    asana_project_id: Optional[str]
    auto_sync: bool
    sync_interval_minutes: int
    import_attachments: bool
    import_comments: bool
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
    created_at: datetime
    field_mappings: Optional[Dict[str, Any]]
    status_mappings: Optional[Dict[str, str]]
    priority_mappings: Optional[Dict[str, str]]

    class Config:
        from_attributes = True


class ImportJobResponse(BaseModel):
    id: int
    integration_id: int
    status: ImportStatus
    import_type: str
    total_items: int
    processed_items: int
    successful_items: int
    failed_items: int
    skipped_items: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_log: Optional[List[Dict]]
    created_at: datetime

    class Config:
        from_attributes = True


class ImportRequest(BaseModel):
    project_key: Optional[str] = None  # For JIRA
    board_id: Optional[str] = None  # For Trello
    project_id: Optional[str] = None  # For Asana


# ============ Integration CRUD Endpoints ============

@router.get("", response_model=List[IntegrationResponse])
async def get_integrations(
    integration_type: Optional[IntegrationType] = None,
    status: Optional[IntegrationStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all integrations"""
    integrations = IntegrationService.get_integrations(
        db, integration_type=integration_type, status=status
    )
    return integrations


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get integration by ID"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return integration


@router.post("", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    data: IntegrationCreate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Create a new integration (Admin only)"""
    integration = IntegrationService.create_integration(
        db=db,
        name=data.name,
        integration_type=data.integration_type,
        user_id=current_user.id,
        api_url=data.api_url,
        api_key=data.api_key,
        api_secret=data.api_secret,
        username=data.username,
        jira_project_key=data.jira_project_key,
        trello_board_id=data.trello_board_id,
        asana_workspace_id=data.asana_workspace_id,
        asana_project_id=data.asana_project_id,
        auto_sync=data.auto_sync,
        sync_interval_minutes=data.sync_interval_minutes,
        import_attachments=data.import_attachments,
        import_comments=data.import_comments,
        field_mappings=data.field_mappings,
        status_mappings=data.status_mappings,
        priority_mappings=data.priority_mappings
    )
    return integration


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    data: IntegrationUpdate,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Update an integration (Admin only)"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    update_data = data.model_dump(exclude_unset=True)
    integration = IntegrationService.update_integration(db, integration, **update_data)
    return integration


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    current_user: User = Depends(require_admin()),
    db: Session = Depends(get_db)
):
    """Delete an integration (Admin only)"""
    success = IntegrationService.delete_integration(db, integration_id)
    if not success:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"message": "Integration deleted successfully"}


# ============ Connection Test Endpoints ============

@router.post("/{integration_id}/test")
async def test_integration_connection(
    integration_id: int,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Test integration connection"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    result = None
    if integration.integration_type == IntegrationType.JIRA:
        result = await JiraService.test_connection(integration)
    elif integration.integration_type == IntegrationType.TRELLO:
        result = await TrelloService.test_connection(integration)
    elif integration.integration_type == IntegrationType.ASANA:
        result = await AsanaService.test_connection(integration)

    # Update integration status based on result
    if result and result.get("success"):
        integration.status = IntegrationStatus.ACTIVE
        integration.last_error = None
    else:
        integration.status = IntegrationStatus.ERROR
        integration.last_error = result.get("message") if result else "Unknown error"

    db.commit()
    return result


# ============ Resource Discovery Endpoints ============

@router.get("/{integration_id}/projects")
async def get_integration_projects(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available projects/boards from the integration"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if integration.integration_type == IntegrationType.JIRA:
        projects = await JiraService.get_projects(integration)
        return {"projects": projects}
    elif integration.integration_type == IntegrationType.TRELLO:
        boards = await TrelloService.get_boards(integration)
        return {"boards": boards}
    elif integration.integration_type == IntegrationType.ASANA:
        workspaces = await AsanaService.get_workspaces(integration)
        return {"workspaces": workspaces}

    return {"error": "Unknown integration type"}


@router.get("/{integration_id}/asana/projects")
async def get_asana_projects(
    integration_id: int,
    workspace_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Asana projects in a workspace"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration or integration.integration_type != IntegrationType.ASANA:
        raise HTTPException(status_code=404, detail="Asana integration not found")

    projects = await AsanaService.get_projects(integration, workspace_id)
    return {"projects": projects}


@router.get("/{integration_id}/trello/lists")
async def get_trello_lists(
    integration_id: int,
    board_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Trello lists from a board"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration or integration.integration_type != IntegrationType.TRELLO:
        raise HTTPException(status_code=404, detail="Trello integration not found")

    lists = await TrelloService.get_lists(integration, board_id)
    return {"lists": lists}


# ============ Import Endpoints ============

@router.post("/{integration_id}/import", response_model=ImportJobResponse)
async def start_import(
    integration_id: int,
    import_request: ImportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Start an import job from the integration"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    if integration.status != IntegrationStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integration is not active. Please test the connection first."
        )

    # Create import job
    job = IntegrationService.create_import_job(
        db=db,
        integration_id=integration_id,
        user_id=current_user.id,
        import_type="full"
    )

    # Start background import task
    background_tasks.add_task(
        run_import_job,
        job_id=job.id,
        integration_id=integration_id,
        user_id=current_user.id,
        project_key=import_request.project_key,
        board_id=import_request.board_id,
        project_id=import_request.project_id
    )

    return job


@router.get("/{integration_id}/imports", response_model=List[ImportJobResponse])
async def get_import_jobs(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get import jobs for an integration"""
    jobs = IntegrationService.get_import_jobs(db, integration_id=integration_id)
    return jobs


@router.get("/imports/{job_id}", response_model=ImportJobResponse)
async def get_import_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get import job by ID"""
    job = IntegrationService.get_import_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job


@router.get("/imports/{job_id}/items")
async def get_import_job_items(
    job_id: int,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get items from an import job"""
    query = db.query(ImportedItem).filter(ImportedItem.import_job_id == job_id)

    if status_filter:
        query = query.filter(ImportedItem.status == status_filter)

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": item.id,
                "external_id": item.external_id,
                "external_key": item.external_key,
                "external_url": item.external_url,
                "ticket_id": item.ticket_id,
                "status": item.status,
                "error_message": item.error_message,
                "created_at": item.created_at
            }
            for item in items
        ]
    }


# ============ Preview Endpoint ============

@router.post("/{integration_id}/preview")
async def preview_import(
    integration_id: int,
    import_request: ImportRequest,
    current_user: User = Depends(require_manager_or_above()),
    db: Session = Depends(get_db)
):
    """Preview items that would be imported"""
    integration = IntegrationService.get_integration(db, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    items = []
    total = 0

    if integration.integration_type == IntegrationType.JIRA:
        result = await JiraService.fetch_issues(
            integration,
            project_key=import_request.project_key,
            max_results=20
        )
        issues = result.get("issues", [])
        total = result.get("total", 0)
        items = [
            {
                "external_id": issue.get("id"),
                "external_key": issue.get("key"),
                "title": issue.get("fields", {}).get("summary"),
                "status": issue.get("fields", {}).get("status", {}).get("name"),
                "priority": issue.get("fields", {}).get("priority", {}).get("name"),
                "type": issue.get("fields", {}).get("issuetype", {}).get("name"),
            }
            for issue in issues
        ]

    elif integration.integration_type == IntegrationType.TRELLO:
        cards = await TrelloService.fetch_cards(
            integration,
            board_id=import_request.board_id
        )
        total = len(cards)
        items = [
            {
                "external_id": card.get("id"),
                "external_key": card.get("shortLink"),
                "title": card.get("name"),
                "labels": [l.get("name") for l in card.get("labels", [])],
            }
            for card in cards[:20]
        ]

    elif integration.integration_type == IntegrationType.ASANA:
        tasks = await AsanaService.fetch_tasks(
            integration,
            project_id=import_request.project_id
        )
        total = len(tasks)
        items = [
            {
                "external_id": task.get("gid"),
                "external_key": task.get("gid"),
                "title": task.get("name"),
                "completed": task.get("completed"),
                "assignee": task.get("assignee", {}).get("name") if task.get("assignee") else None,
            }
            for task in tasks[:20]
        ]

    return {
        "total": total,
        "preview_count": len(items),
        "items": items
    }


# ============ Default Mappings Endpoint ============

@router.get("/mappings/defaults")
async def get_default_mappings(
    integration_type: IntegrationType,
    current_user: User = Depends(get_current_user)
):
    """Get default field mappings for an integration type"""
    return {
        "status_mappings": IntegrationService.DEFAULT_STATUS_MAPPINGS.get(integration_type.value, {}),
        "priority_mappings": IntegrationService.DEFAULT_PRIORITY_MAPPINGS.get(integration_type.value, {})
    }


# ============ Background Import Task ============

async def run_import_job(
    job_id: int,
    integration_id: int,
    user_id: int,
    project_key: Optional[str] = None,
    board_id: Optional[str] = None,
    project_id: Optional[str] = None
):
    """Background task to run import job"""
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not job or not integration:
            return

        # Update job status
        job.status = ImportStatus.IN_PROGRESS
        job.started_at = datetime.utcnow()
        db.commit()

        # Get or create default category
        category = IntegrationService.get_or_create_default_category(db)

        items_to_import = []
        error_log = []

        try:
            if integration.integration_type == IntegrationType.JIRA:
                # Fetch all JIRA issues
                all_issues = []
                start_at = 0
                while True:
                    result = await JiraService.fetch_issues(
                        integration,
                        project_key=project_key,
                        max_results=100,
                        start_at=start_at
                    )
                    issues = result.get("issues", [])
                    all_issues.extend(issues)

                    if len(issues) < 100 or len(all_issues) >= result.get("total", 0):
                        break
                    start_at += 100

                job.total_items = len(all_issues)
                db.commit()

                for issue in all_issues:
                    try:
                        ticket_data = JiraService.map_jira_issue_to_ticket(
                            issue, integration, db, user_id, category.id
                        )
                        items_to_import.append(ticket_data)
                    except Exception as e:
                        error_log.append({
                            "external_id": issue.get("id"),
                            "external_key": issue.get("key"),
                            "error": str(e)
                        })

            elif integration.integration_type == IntegrationType.TRELLO:
                # Fetch Trello cards
                cards = await TrelloService.fetch_cards(
                    integration,
                    board_id=board_id
                )

                # Get list names for status mapping
                lists = await TrelloService.get_lists(integration, board_id)
                list_map = {l.get("id"): l.get("name") for l in lists}

                job.total_items = len(cards)
                db.commit()

                for card in cards:
                    try:
                        list_name = list_map.get(card.get("idList"), "Unknown")
                        ticket_data = TrelloService.map_trello_card_to_ticket(
                            card, list_name, integration, db, user_id, category.id
                        )
                        items_to_import.append(ticket_data)
                    except Exception as e:
                        error_log.append({
                            "external_id": card.get("id"),
                            "external_key": card.get("shortLink"),
                            "error": str(e)
                        })

            elif integration.integration_type == IntegrationType.ASANA:
                # Fetch Asana tasks
                tasks = await AsanaService.fetch_tasks(
                    integration,
                    project_id=project_id
                )

                job.total_items = len(tasks)
                db.commit()

                for task in tasks:
                    try:
                        ticket_data = AsanaService.map_asana_task_to_ticket(
                            task, integration, db, user_id, category.id
                        )
                        items_to_import.append(ticket_data)
                    except Exception as e:
                        error_log.append({
                            "external_id": task.get("gid"),
                            "external_key": task.get("gid"),
                            "error": str(e)
                        })

            # Create tickets
            imported_ticket_ids = []
            for item_data in items_to_import:
                try:
                    # Check if already imported
                    existing = db.query(ImportedItem).filter(
                        ImportedItem.external_id == item_data["external_id"]
                    ).first()

                    if existing:
                        job.skipped_items += 1
                        continue

                    # Create ticket
                    max_number = db.query(func.max(Ticket.ticket_number)).scalar() or 0
                    ticket = Ticket(
                        ticket_number=max_number + 1,
                        ticket_type=TicketType.INCIDENT,
                        title=item_data["title"][:500] if item_data["title"] else "Imported Ticket",
                        description=item_data.get("description", ""),
                        status=item_data.get("status", TicketStatus.NEW),
                        priority=item_data.get("priority", TicketPriority.MEDIUM),
                        category_id=item_data.get("category_id"),
                        requester_id=item_data.get("requester_id"),
                        source="import"
                    )
                    db.add(ticket)
                    db.flush()

                    # Create imported item record
                    imported_item = ImportedItem(
                        import_job_id=job.id,
                        external_id=item_data["external_id"],
                        external_key=item_data.get("external_key"),
                        external_url=item_data.get("external_url"),
                        ticket_id=ticket.id,
                        status="success",
                        external_data=item_data.get("external_data")
                    )
                    db.add(imported_item)

                    imported_ticket_ids.append(ticket.id)
                    job.successful_items += 1
                    job.processed_items += 1

                except Exception as e:
                    job.failed_items += 1
                    job.processed_items += 1
                    error_log.append({
                        "external_id": item_data.get("external_id"),
                        "external_key": item_data.get("external_key"),
                        "error": str(e)
                    })

                    # Create failed imported item record
                    imported_item = ImportedItem(
                        import_job_id=job.id,
                        external_id=item_data.get("external_id", "unknown"),
                        external_key=item_data.get("external_key"),
                        status="failed",
                        error_message=str(e)
                    )
                    db.add(imported_item)

                db.commit()

            # Update job completion
            job.imported_ticket_ids = imported_ticket_ids
            job.error_log = error_log if error_log else None
            job.completed_at = datetime.utcnow()

            if job.failed_items > 0 and job.successful_items > 0:
                job.status = ImportStatus.PARTIALLY_COMPLETED
            elif job.failed_items > 0:
                job.status = ImportStatus.FAILED
            else:
                job.status = ImportStatus.COMPLETED

            # Update integration last sync
            integration.last_sync_at = datetime.utcnow()
            integration.last_error = None

            db.commit()

        except Exception as e:
            job.status = ImportStatus.FAILED
            job.error_log = [{"error": str(e)}]
            job.completed_at = datetime.utcnow()
            integration.last_error = str(e)
            db.commit()

    finally:
        db.close()
