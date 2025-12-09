from app.core.database import Base
from app.models.user import User
from app.models.role import Role, role_permissions
from app.models.permission import Permission
from app.models.department import Department
from app.models.audit_log import AuditLog
from app.models.ticket import Ticket, TicketType, TicketStatus, TicketPriority, TicketImpact, TicketUrgency, TicketAsset
from app.models.ticket_comment import TicketComment
from app.models.ticket_attachment import TicketAttachment
from app.models.ticket_activity import TicketActivity
from app.models.category import Category, Subcategory
from app.models.group import Group, group_members
from app.models.sla_policy import SLAPolicy
from app.models.sla_pause import SLAPause
from app.models.system_settings import SystemSettings
from app.models.asset import (
    Asset,
    AssetType,
    AssetAssignment,
    AssetRelationship,
    AssetHistory,
    AssetContract,
    AssetStatus,
    AssetCondition,
    RelationshipType
)
from app.models.service_request_template import ServiceRequestTemplate
from app.models.change import Change, ChangeTask, ChangeActivity
from app.models.knowledge import (
    KnowledgeCategory,
    KnowledgeArticle,
    ArticleAttachment,
    ArticleRating,
    ArticleView,
    ArticleStatus
)
from app.models.notification import Notification, NotificationPreference, NotificationType
from app.models.chat_conversation import ChatConversation, ChatMessage
from app.models.problem import (
    Problem, ProblemStatus, ProblemPriority, ProblemImpact, RCAMethod,
    ProblemIncidentLink, KnownError, ProblemActivity, ProblemComment, ProblemAttachment
)
from app.models.scheduled_report import (
    ScheduledReport, ReportExecution, ReportTemplate,
    ReportType, ReportFrequency, ExportFormat
)
from app.models.change_template import ChangeTemplate
from app.models.integration import (
    Integration, ImportJob, ImportedItem,
    IntegrationType, IntegrationStatus, ImportStatus
)

__all__ = [
    "Base",
    "User",
    "Role",
    "Permission",
    "Department",
    "AuditLog",
    "role_permissions",
    "Ticket",
    "TicketType",
    "TicketStatus",
    "TicketPriority",
    "TicketImpact",
    "TicketUrgency",
    "TicketAsset",
    "TicketComment",
    "TicketAttachment",
    "TicketActivity",
    "Category",
    "Subcategory",
    "Group",
    "group_members",
    "SLAPolicy",
    "SLAPause",  # Add this line
    "Asset",
    "AssetType",
    "AssetAssignment",
    "AssetRelationship",
    "AssetHistory",
    "AssetContract",
    "AssetStatus",
    "AssetCondition",
    "RelationshipType",
    "ServiceRequestTemplate",
    'Change',
    'ChangeTask',
    'ChangeActivity',
    'KnowledgeCategory',
    'KnowledgeArticle',
    'ArticleAttachment',
    'ArticleRating',
    'ArticleView',
    'ArticleStatus',
    'SystemSettings',
    'Notification',
    'NotificationPreference',
    'NotificationType',
    'ChatConversation',
    'ChatMessage',
    'Problem',
    'ProblemStatus',
    'ProblemPriority',
    'ProblemImpact',
    'RCAMethod',
    'ProblemIncidentLink',
    'KnownError',
    'ProblemActivity',
    'ProblemComment',
    'ProblemAttachment',
    'ScheduledReport',
    'ReportExecution',
    'ReportTemplate',
    'ReportType',
    'ReportFrequency',
    'ExportFormat',
    'ChangeTemplate',
    'Integration',
    'ImportJob',
    'ImportedItem',
    'IntegrationType',
    'IntegrationStatus',
    'ImportStatus',
]