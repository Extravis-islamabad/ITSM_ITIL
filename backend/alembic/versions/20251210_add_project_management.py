"""Add project management tables

Revision ID: project_mgmt_001
Revises: live_chat_001
Create Date: 2025-12-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = 'project_mgmt_001'
down_revision = 'live_chat_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types
    project_status = postgresql.ENUM(
        'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED',
        name='project_status_enum',
        create_type=False
    )
    project_status.create(op.get_bind(), checkfirst=True)

    sprint_status = postgresql.ENUM(
        'PLANNING', 'ACTIVE', 'COMPLETED',
        name='sprint_status_enum',
        create_type=False
    )
    sprint_status.create(op.get_bind(), checkfirst=True)

    task_status = postgresql.ENUM(
        'BACKLOG', 'TODO', 'IN_PROGRESS', 'QA', 'DONE',
        name='task_status_enum',
        create_type=False
    )
    task_status.create(op.get_bind(), checkfirst=True)

    task_priority = postgresql.ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
        name='task_priority_enum',
        create_type=False
    )
    task_priority.create(op.get_bind(), checkfirst=True)

    task_type = postgresql.ENUM(
        'TASK', 'BUG', 'FEATURE', 'IMPROVEMENT', 'STORY',
        name='task_type_enum',
        create_type=False
    )
    task_type.create(op.get_bind(), checkfirst=True)

    project_member_role = postgresql.ENUM(
        'OWNER', 'ADMIN', 'MEMBER', 'VIEWER',
        name='project_member_role_enum',
        create_type=False
    )
    project_member_role.create(op.get_bind(), checkfirst=True)

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_key', sa.String(length=10), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', project_status, nullable=False, server_default='PLANNING'),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('task_sequence', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['lead_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_key')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_project_key'), 'projects', ['project_key'], unique=True)

    # Create board_columns table
    op.create_table(
        'board_columns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('status_key', sa.String(length=50), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('color', sa.String(length=50), nullable=True, server_default='gray'),
        sa.Column('is_default', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_done_column', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_board_columns_id'), 'board_columns', ['id'], unique=False)

    # Create project_members table
    op.create_table(
        'project_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', project_member_role, nullable=False, server_default='MEMBER'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_members_id'), 'project_members', ['id'], unique=False)

    # Create sprints table
    op.create_table(
        'sprints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('goal', sa.Text(), nullable=True),
        sa.Column('status', sprint_status, nullable=False, server_default='PLANNING'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sprints_id'), 'sprints', ['id'], unique=False)

    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('sprint_id', sa.Integer(), nullable=True),
        sa.Column('task_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('task_type', task_type, nullable=False, server_default='TASK'),
        sa.Column('status', task_status, nullable=False, server_default='BACKLOG'),
        sa.Column('priority', task_priority, nullable=False, server_default='MEDIUM'),
        sa.Column('assignee_id', sa.Integer(), nullable=True),
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('story_points', sa.Integer(), nullable=True),
        sa.Column('time_estimate', sa.Float(), nullable=True),
        sa.Column('time_spent', sa.Float(), nullable=True, server_default='0'),
        sa.Column('parent_task_id', sa.Integer(), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sprint_id'], ['sprints.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assignee_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_number')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_task_number'), 'tasks', ['task_number'], unique=True)
    op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)

    # Create task_comments table
    op.create_table(
        'task_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_comments_id'), 'task_comments', ['id'], unique=False)

    # Create task_activities table
    op.create_table(
        'task_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_activities_id'), 'task_activities', ['id'], unique=False)

    # Create task_attachments table
    op.create_table(
        'task_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_attachments_id'), 'task_attachments', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_task_attachments_id'), table_name='task_attachments')
    op.drop_table('task_attachments')

    op.drop_index(op.f('ix_task_activities_id'), table_name='task_activities')
    op.drop_table('task_activities')

    op.drop_index(op.f('ix_task_comments_id'), table_name='task_comments')
    op.drop_table('task_comments')

    op.drop_index(op.f('ix_tasks_status'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_task_number'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')

    op.drop_index(op.f('ix_sprints_id'), table_name='sprints')
    op.drop_table('sprints')

    op.drop_index(op.f('ix_project_members_id'), table_name='project_members')
    op.drop_table('project_members')

    op.drop_index(op.f('ix_board_columns_id'), table_name='board_columns')
    op.drop_table('board_columns')

    op.drop_index(op.f('ix_projects_project_key'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')

    # Drop enum types
    sa.Enum(name='project_member_role_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='task_type_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='task_priority_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='task_status_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='sprint_status_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='project_status_enum').drop(op.get_bind(), checkfirst=True)
