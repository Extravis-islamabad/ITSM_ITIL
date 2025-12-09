"""
Integration Service - Handles imports from JIRA, Trello, and Asana
"""
import httpx
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.integration import (
    Integration, ImportJob, ImportedItem,
    IntegrationType, IntegrationStatus, ImportStatus
)
from app.models.ticket import Ticket, TicketType, TicketStatus, TicketPriority
from app.models.category import Category
from app.models.user import User


class IntegrationService:
    """Base integration service with common functionality"""

    # Default mappings for statuses
    DEFAULT_STATUS_MAPPINGS = {
        "JIRA": {
            "To Do": TicketStatus.NEW,
            "Open": TicketStatus.OPEN,
            "In Progress": TicketStatus.IN_PROGRESS,
            "In Review": TicketStatus.IN_PROGRESS,
            "Done": TicketStatus.RESOLVED,
            "Closed": TicketStatus.CLOSED,
            "Backlog": TicketStatus.NEW,
            "Selected for Development": TicketStatus.OPEN,
        },
        "TRELLO": {
            "To Do": TicketStatus.NEW,
            "Doing": TicketStatus.IN_PROGRESS,
            "Done": TicketStatus.RESOLVED,
        },
        "ASANA": {
            "Not Started": TicketStatus.NEW,
            "In Progress": TicketStatus.IN_PROGRESS,
            "Completed": TicketStatus.RESOLVED,
            "On Hold": TicketStatus.PENDING,
        }
    }

    # Default priority mappings
    DEFAULT_PRIORITY_MAPPINGS = {
        "JIRA": {
            "Highest": TicketPriority.CRITICAL,
            "High": TicketPriority.HIGH,
            "Medium": TicketPriority.MEDIUM,
            "Low": TicketPriority.LOW,
            "Lowest": TicketPriority.LOW,
        },
        "TRELLO": {
            # Trello uses labels, we'll map common ones
            "urgent": TicketPriority.CRITICAL,
            "high": TicketPriority.HIGH,
            "medium": TicketPriority.MEDIUM,
            "low": TicketPriority.LOW,
        },
        "ASANA": {
            "high": TicketPriority.HIGH,
            "medium": TicketPriority.MEDIUM,
            "low": TicketPriority.LOW,
        }
    }

    @staticmethod
    def get_integration(db: Session, integration_id: int) -> Optional[Integration]:
        """Get integration by ID"""
        return db.query(Integration).filter(Integration.id == integration_id).first()

    @staticmethod
    def get_integrations(
        db: Session,
        integration_type: Optional[IntegrationType] = None,
        status: Optional[IntegrationStatus] = None
    ) -> List[Integration]:
        """Get all integrations with optional filters"""
        query = db.query(Integration)

        if integration_type:
            query = query.filter(Integration.integration_type == integration_type)
        if status:
            query = query.filter(Integration.status == status)

        return query.order_by(Integration.created_at.desc()).all()

    @staticmethod
    def create_integration(
        db: Session,
        name: str,
        integration_type: IntegrationType,
        user_id: int,
        **kwargs
    ) -> Integration:
        """Create a new integration"""
        integration = Integration(
            name=name,
            integration_type=integration_type,
            created_by_id=user_id,
            status=IntegrationStatus.PENDING,
            **kwargs
        )
        db.add(integration)
        db.commit()
        db.refresh(integration)
        return integration

    @staticmethod
    def update_integration(
        db: Session,
        integration: Integration,
        **kwargs
    ) -> Integration:
        """Update an integration"""
        for key, value in kwargs.items():
            if hasattr(integration, key):
                setattr(integration, key, value)
        integration.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(integration)
        return integration

    @staticmethod
    def delete_integration(db: Session, integration_id: int) -> bool:
        """Delete an integration"""
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if integration:
            db.delete(integration)
            db.commit()
            return True
        return False

    @staticmethod
    def create_import_job(
        db: Session,
        integration_id: int,
        user_id: int,
        import_type: str = "full"
    ) -> ImportJob:
        """Create a new import job"""
        job = ImportJob(
            integration_id=integration_id,
            started_by_id=user_id,
            import_type=import_type,
            status=ImportStatus.PENDING
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def get_import_jobs(
        db: Session,
        integration_id: Optional[int] = None,
        limit: int = 50
    ) -> List[ImportJob]:
        """Get import jobs"""
        query = db.query(ImportJob)
        if integration_id:
            query = query.filter(ImportJob.integration_id == integration_id)
        return query.order_by(ImportJob.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_import_job(db: Session, job_id: int) -> Optional[ImportJob]:
        """Get import job by ID"""
        return db.query(ImportJob).filter(ImportJob.id == job_id).first()

    @staticmethod
    def get_or_create_default_category(db: Session) -> Category:
        """Get or create a default category for imported tickets"""
        category = db.query(Category).filter(Category.name == "Imported").first()
        if not category:
            from app.models.category import CategoryType
            category = Category(
                name="Imported",
                description="Imported tickets from external systems",
                category_type=CategoryType.INCIDENT,
                is_active=True
            )
            db.add(category)
            db.commit()
            db.refresh(category)
        return category

    @staticmethod
    def create_ticket_from_external(
        db: Session,
        title: str,
        description: str,
        external_id: str,
        external_key: str,
        integration: Integration,
        requester_id: int,
        status: TicketStatus = TicketStatus.NEW,
        priority: TicketPriority = TicketPriority.MEDIUM,
        category_id: Optional[int] = None,
        external_url: Optional[str] = None,
        external_data: Optional[Dict] = None
    ) -> Ticket:
        """Create a ticket from external data"""
        # Get next ticket number
        max_number = db.query(func.max(Ticket.ticket_number)).scalar() or 0

        ticket = Ticket(
            ticket_number=max_number + 1,
            ticket_type=TicketType.INCIDENT,
            title=title[:500] if title else "Imported Ticket",
            description=description or "",
            status=status,
            priority=priority,
            category_id=category_id,
            requester_id=requester_id,
            source="import"
        )
        db.add(ticket)
        db.flush()
        return ticket


class JiraService:
    """Service for JIRA integration"""

    @staticmethod
    async def test_connection(integration: Integration) -> Dict[str, Any]:
        """Test JIRA connection"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # JIRA Cloud uses Basic Auth with email:api_token
                auth = (integration.username, integration.api_key) if integration.username else None
                headers = {"Accept": "application/json"}

                response = await client.get(
                    f"{integration.api_url}/rest/api/3/myself",
                    auth=auth,
                    headers=headers
                )

                if response.status_code == 200:
                    user_data = response.json()
                    return {
                        "success": True,
                        "message": f"Connected as {user_data.get('displayName', 'Unknown')}",
                        "user": user_data.get("displayName"),
                        "email": user_data.get("emailAddress")
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Connection failed: {response.status_code}",
                        "error": response.text
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection error: {str(e)}",
                "error": str(e)
            }

    @staticmethod
    async def get_projects(integration: Integration) -> List[Dict]:
        """Get available JIRA projects"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                auth = (integration.username, integration.api_key) if integration.username else None
                headers = {"Accept": "application/json"}

                response = await client.get(
                    f"{integration.api_url}/rest/api/3/project",
                    auth=auth,
                    headers=headers
                )

                if response.status_code == 200:
                    return response.json()
                return []
        except Exception:
            return []

    @staticmethod
    async def fetch_issues(
        integration: Integration,
        project_key: Optional[str] = None,
        max_results: int = 100,
        start_at: int = 0
    ) -> Dict[str, Any]:
        """Fetch issues from JIRA"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                auth = (integration.username, integration.api_key) if integration.username else None
                headers = {"Accept": "application/json"}

                # Build JQL query
                jql = f"project = {project_key or integration.jira_project_key}"

                params = {
                    "jql": jql,
                    "maxResults": max_results,
                    "startAt": start_at,
                    "fields": "summary,description,status,priority,assignee,reporter,created,updated,labels,components,issuetype"
                }

                response = await client.get(
                    f"{integration.api_url}/rest/api/3/search",
                    auth=auth,
                    headers=headers,
                    params=params
                )

                if response.status_code == 200:
                    return response.json()
                return {"issues": [], "total": 0, "error": response.text}
        except Exception as e:
            return {"issues": [], "total": 0, "error": str(e)}

    @staticmethod
    def map_jira_issue_to_ticket(
        issue: Dict,
        integration: Integration,
        db: Session,
        requester_id: int,
        category_id: int
    ) -> Dict[str, Any]:
        """Map JIRA issue data to ticket data"""
        fields = issue.get("fields", {})

        # Get status mapping
        status_mappings = integration.status_mappings or IntegrationService.DEFAULT_STATUS_MAPPINGS["JIRA"]
        jira_status = fields.get("status", {}).get("name", "To Do")
        status = status_mappings.get(jira_status, TicketStatus.NEW)
        if isinstance(status, str):
            status = TicketStatus(status) if status in [s.value for s in TicketStatus] else TicketStatus.NEW

        # Get priority mapping
        priority_mappings = integration.priority_mappings or IntegrationService.DEFAULT_PRIORITY_MAPPINGS["JIRA"]
        jira_priority = fields.get("priority", {}).get("name", "Medium")
        priority = priority_mappings.get(jira_priority, TicketPriority.MEDIUM)
        if isinstance(priority, str):
            priority = TicketPriority(priority) if priority in [p.value for p in TicketPriority] else TicketPriority.MEDIUM

        # Extract description (JIRA uses ADF format in Cloud)
        description = ""
        if fields.get("description"):
            if isinstance(fields["description"], dict):
                # ADF format - extract text content
                content = fields["description"].get("content", [])
                for block in content:
                    if block.get("type") == "paragraph":
                        for item in block.get("content", []):
                            if item.get("type") == "text":
                                description += item.get("text", "")
                        description += "\n"
            else:
                description = str(fields["description"])

        return {
            "title": fields.get("summary", "Untitled Issue"),
            "description": description.strip(),
            "status": status,
            "priority": priority,
            "external_id": issue.get("id"),
            "external_key": issue.get("key"),
            "external_url": f"{integration.api_url}/browse/{issue.get('key')}",
            "category_id": category_id,
            "requester_id": requester_id,
            "external_data": {
                "issue_type": fields.get("issuetype", {}).get("name"),
                "labels": fields.get("labels", []),
                "components": [c.get("name") for c in fields.get("components", [])],
                "reporter": fields.get("reporter", {}).get("displayName"),
                "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else None,
                "created": fields.get("created"),
                "updated": fields.get("updated"),
            }
        }


class TrelloService:
    """Service for Trello integration"""

    @staticmethod
    async def test_connection(integration: Integration) -> Dict[str, Any]:
        """Test Trello connection"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "key": integration.api_key,
                    "token": integration.api_secret
                }

                response = await client.get(
                    "https://api.trello.com/1/members/me",
                    params=params
                )

                if response.status_code == 200:
                    user_data = response.json()
                    return {
                        "success": True,
                        "message": f"Connected as {user_data.get('fullName', 'Unknown')}",
                        "user": user_data.get("fullName"),
                        "username": user_data.get("username")
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Connection failed: {response.status_code}",
                        "error": response.text
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection error: {str(e)}",
                "error": str(e)
            }

    @staticmethod
    async def get_boards(integration: Integration) -> List[Dict]:
        """Get available Trello boards"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "key": integration.api_key,
                    "token": integration.api_secret
                }

                response = await client.get(
                    "https://api.trello.com/1/members/me/boards",
                    params=params
                )

                if response.status_code == 200:
                    return response.json()
                return []
        except Exception:
            return []

    @staticmethod
    async def fetch_cards(
        integration: Integration,
        board_id: Optional[str] = None
    ) -> List[Dict]:
        """Fetch cards from a Trello board"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                params = {
                    "key": integration.api_key,
                    "token": integration.api_secret,
                    "fields": "name,desc,due,dueComplete,labels,idList,url,dateLastActivity",
                    "members": "true",
                    "member_fields": "fullName,username"
                }

                board = board_id or integration.trello_board_id
                response = await client.get(
                    f"https://api.trello.com/1/boards/{board}/cards",
                    params=params
                )

                if response.status_code == 200:
                    return response.json()
                return []
        except Exception:
            return []

    @staticmethod
    async def get_lists(integration: Integration, board_id: Optional[str] = None) -> List[Dict]:
        """Get lists from a Trello board"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "key": integration.api_key,
                    "token": integration.api_secret
                }

                board = board_id or integration.trello_board_id
                response = await client.get(
                    f"https://api.trello.com/1/boards/{board}/lists",
                    params=params
                )

                if response.status_code == 200:
                    return response.json()
                return []
        except Exception:
            return []

    @staticmethod
    def map_trello_card_to_ticket(
        card: Dict,
        list_name: str,
        integration: Integration,
        db: Session,
        requester_id: int,
        category_id: int
    ) -> Dict[str, Any]:
        """Map Trello card data to ticket data"""
        # Get status mapping based on list name
        status_mappings = integration.status_mappings or IntegrationService.DEFAULT_STATUS_MAPPINGS["TRELLO"]
        status = status_mappings.get(list_name, TicketStatus.NEW)
        if isinstance(status, str):
            status = TicketStatus(status) if status in [s.value for s in TicketStatus] else TicketStatus.NEW

        # Get priority from labels
        priority = TicketPriority.MEDIUM
        priority_mappings = integration.priority_mappings or IntegrationService.DEFAULT_PRIORITY_MAPPINGS["TRELLO"]
        for label in card.get("labels", []):
            label_name = label.get("name", "").lower()
            if label_name in priority_mappings:
                priority = priority_mappings[label_name]
                if isinstance(priority, str):
                    priority = TicketPriority(priority) if priority in [p.value for p in TicketPriority] else TicketPriority.MEDIUM
                break

        return {
            "title": card.get("name", "Untitled Card"),
            "description": card.get("desc", ""),
            "status": status,
            "priority": priority,
            "external_id": card.get("id"),
            "external_key": card.get("shortLink", card.get("id")),
            "external_url": card.get("url"),
            "category_id": category_id,
            "requester_id": requester_id,
            "external_data": {
                "list_name": list_name,
                "labels": [l.get("name") for l in card.get("labels", [])],
                "due": card.get("due"),
                "due_complete": card.get("dueComplete"),
                "members": [m.get("fullName") for m in card.get("members", [])],
                "last_activity": card.get("dateLastActivity"),
            }
        }


class AsanaService:
    """Service for Asana integration"""

    @staticmethod
    async def test_connection(integration: Integration) -> Dict[str, Any]:
        """Test Asana connection"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {integration.api_key}",
                    "Accept": "application/json"
                }

                response = await client.get(
                    "https://app.asana.com/api/1.0/users/me",
                    headers=headers
                )

                if response.status_code == 200:
                    data = response.json().get("data", {})
                    return {
                        "success": True,
                        "message": f"Connected as {data.get('name', 'Unknown')}",
                        "user": data.get("name"),
                        "email": data.get("email")
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Connection failed: {response.status_code}",
                        "error": response.text
                    }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection error: {str(e)}",
                "error": str(e)
            }

    @staticmethod
    async def get_workspaces(integration: Integration) -> List[Dict]:
        """Get available Asana workspaces"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {integration.api_key}",
                    "Accept": "application/json"
                }

                response = await client.get(
                    "https://app.asana.com/api/1.0/workspaces",
                    headers=headers
                )

                if response.status_code == 200:
                    return response.json().get("data", [])
                return []
        except Exception:
            return []

    @staticmethod
    async def get_projects(integration: Integration, workspace_id: Optional[str] = None) -> List[Dict]:
        """Get projects in a workspace"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {integration.api_key}",
                    "Accept": "application/json"
                }

                workspace = workspace_id or integration.asana_workspace_id
                response = await client.get(
                    f"https://app.asana.com/api/1.0/workspaces/{workspace}/projects",
                    headers=headers
                )

                if response.status_code == 200:
                    return response.json().get("data", [])
                return []
        except Exception:
            return []

    @staticmethod
    async def fetch_tasks(
        integration: Integration,
        project_id: Optional[str] = None
    ) -> List[Dict]:
        """Fetch tasks from an Asana project"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                headers = {
                    "Authorization": f"Bearer {integration.api_key}",
                    "Accept": "application/json"
                }

                project = project_id or integration.asana_project_id
                params = {
                    "opt_fields": "name,notes,completed,due_on,assignee,assignee.name,tags,tags.name,created_at,modified_at,permalink_url"
                }

                response = await client.get(
                    f"https://app.asana.com/api/1.0/projects/{project}/tasks",
                    headers=headers,
                    params=params
                )

                if response.status_code == 200:
                    return response.json().get("data", [])
                return []
        except Exception:
            return []

    @staticmethod
    def map_asana_task_to_ticket(
        task: Dict,
        integration: Integration,
        db: Session,
        requester_id: int,
        category_id: int
    ) -> Dict[str, Any]:
        """Map Asana task data to ticket data"""
        # Determine status based on completion
        if task.get("completed"):
            status = TicketStatus.RESOLVED
        else:
            status = TicketStatus.OPEN

        # Get priority from tags
        priority = TicketPriority.MEDIUM
        priority_mappings = integration.priority_mappings or IntegrationService.DEFAULT_PRIORITY_MAPPINGS["ASANA"]
        for tag in task.get("tags", []):
            tag_name = tag.get("name", "").lower()
            if tag_name in priority_mappings:
                priority = priority_mappings[tag_name]
                if isinstance(priority, str):
                    priority = TicketPriority(priority) if priority in [p.value for p in TicketPriority] else TicketPriority.MEDIUM
                break

        return {
            "title": task.get("name", "Untitled Task"),
            "description": task.get("notes", ""),
            "status": status,
            "priority": priority,
            "external_id": task.get("gid"),
            "external_key": task.get("gid"),
            "external_url": task.get("permalink_url"),
            "category_id": category_id,
            "requester_id": requester_id,
            "external_data": {
                "completed": task.get("completed"),
                "due_on": task.get("due_on"),
                "assignee": task.get("assignee", {}).get("name") if task.get("assignee") else None,
                "tags": [t.get("name") for t in task.get("tags", [])],
                "created_at": task.get("created_at"),
                "modified_at": task.get("modified_at"),
            }
        }
