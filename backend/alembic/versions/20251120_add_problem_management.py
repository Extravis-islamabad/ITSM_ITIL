"""add problem management tables

Revision ID: 20251120_problem_mgmt
Revises: 20251117_0300_chat_001_add_chat_tables
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'problem_mgmt_001'
down_revision = 'chat_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create problems table
    op.create_table(
        'problems',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('problem_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('NEW', 'INVESTIGATING', 'ROOT_CAUSE_FOUND', 'WORKAROUND_AVAILABLE', 'PERMANENT_SOLUTION_FOUND', 'RESOLVED', 'CLOSED', 'CANCELLED', name='problemstatus'), nullable=False),
        sa.Column('priority', sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='problempriority'), nullable=False),
        sa.Column('impact', sa.Enum('LOW', 'MEDIUM', 'HIGH', name='problemimpact'), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('subcategory_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('assigned_group_id', sa.Integer(), nullable=True),
        sa.Column('rca_method', sa.Enum('FIVE_WHYS', 'FISHBONE', 'FAULT_TREE', 'KEPNER_TREGOE', 'OTHER', name='rcamethod'), nullable=True),
        sa.Column('root_cause', sa.Text(), nullable=True),
        sa.Column('symptoms', sa.Text(), nullable=True),
        sa.Column('investigation_notes', sa.Text(), nullable=True),
        sa.Column('has_workaround', sa.Boolean(), nullable=False, default=False),
        sa.Column('workaround_description', sa.Text(), nullable=True),
        sa.Column('workaround_steps', sa.Text(), nullable=True),
        sa.Column('has_permanent_solution', sa.Boolean(), nullable=False, default=False),
        sa.Column('permanent_solution_description', sa.Text(), nullable=True),
        sa.Column('solution_implementation_plan', sa.Text(), nullable=True),
        sa.Column('related_change_id', sa.Integer(), nullable=True),
        sa.Column('known_error_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('custom_fields', sa.JSON(), nullable=True),
        sa.Column('incident_count', sa.Integer(), nullable=False, default=0),
        sa.Column('affected_users_count', sa.Integer(), nullable=False, default=0),
        sa.Column('business_impact_description', sa.Text(), nullable=True),
        sa.Column('identified_at', sa.DateTime(), nullable=False),
        sa.Column('investigation_started_at', sa.DateTime(), nullable=True),
        sa.Column('root_cause_found_at', sa.DateTime(), nullable=True),
        sa.Column('workaround_available_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['subcategory_id'], ['subcategories.id'], ),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['assigned_group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['related_change_id'], ['changes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problems_id'), 'problems', ['id'], unique=False)
    op.create_index(op.f('ix_problems_problem_number'), 'problems', ['problem_number'], unique=True)
    op.create_index(op.f('ix_problems_status'), 'problems', ['status'], unique=False)
    op.create_index(op.f('ix_problems_priority'), 'problems', ['priority'], unique=False)
    op.create_index(op.f('ix_problems_assigned_to_id'), 'problems', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_problems_assigned_group_id'), 'problems', ['assigned_group_id'], unique=False)

    # Create known_errors table
    op.create_table(
        'known_errors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('known_error_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('error_symptoms', sa.Text(), nullable=False),
        sa.Column('root_cause', sa.Text(), nullable=False),
        sa.Column('affected_cis', sa.JSON(), nullable=True),
        sa.Column('workaround_description', sa.Text(), nullable=False),
        sa.Column('workaround_steps', sa.Text(), nullable=True),
        sa.Column('workaround_limitations', sa.Text(), nullable=True),
        sa.Column('permanent_solution_description', sa.Text(), nullable=True),
        sa.Column('solution_status', sa.String(length=50), nullable=True),
        sa.Column('solution_eta', sa.DateTime(), nullable=True),
        sa.Column('kb_article_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('views_count', sa.Integer(), nullable=False, default=0),
        sa.Column('helpful_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ),
        sa.ForeignKeyConstraint(['kb_article_id'], ['knowledge_articles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_known_errors_id'), 'known_errors', ['id'], unique=False)
    op.create_index(op.f('ix_known_errors_known_error_number'), 'known_errors', ['known_error_number'], unique=True)
    op.create_index(op.f('ix_known_errors_is_active'), 'known_errors', ['is_active'], unique=False)
    op.create_index(op.f('ix_known_errors_problem_id'), 'known_errors', ['problem_id'], unique=True)

    # Add foreign key to problems table for known_error_id (circular reference handled after table creation)
    op.create_foreign_key('fk_problems_known_error_id', 'problems', 'known_errors', ['known_error_id'], ['id'])

    # Create problem_incident_links table
    op.create_table(
        'problem_incident_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('linked_at', sa.DateTime(), nullable=False),
        sa.Column('linked_by_id', sa.Integer(), nullable=False),
        sa.Column('link_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['linked_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problem_incident_links_id'), 'problem_incident_links', ['id'], unique=False)

    # Create problem_activities table
    op.create_table(
        'problem_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problem_activities_id'), 'problem_activities', ['id'], unique=False)
    op.create_index(op.f('ix_problem_activities_problem_id'), 'problem_activities', ['problem_id'], unique=False)

    # Create problem_comments table
    op.create_table(
        'problem_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('is_internal', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problem_comments_id'), 'problem_comments', ['id'], unique=False)
    op.create_index(op.f('ix_problem_comments_problem_id'), 'problem_comments', ['problem_id'], unique=False)

    # Create problem_attachments table
    op.create_table(
        'problem_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('problem_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['problem_id'], ['problems.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_problem_attachments_id'), 'problem_attachments', ['id'], unique=False)
    op.create_index(op.f('ix_problem_attachments_problem_id'), 'problem_attachments', ['problem_id'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('problem_attachments')
    op.drop_table('problem_comments')
    op.drop_table('problem_activities')
    op.drop_table('problem_incident_links')
    op.drop_table('known_errors')
    op.drop_table('problems')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS problemstatus')
    op.execute('DROP TYPE IF EXISTS problempriority')
    op.execute('DROP TYPE IF EXISTS problemimpact')
    op.execute('DROP TYPE IF EXISTS rcamethod')
