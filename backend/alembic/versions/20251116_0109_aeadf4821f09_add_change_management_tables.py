"""Add change management tables

Revision ID: aeadf4821f09
Revises: 00003
Create Date: 2025-11-16 01:09:48.478013+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'aeadf4821f09'
down_revision = '00003'  # Fixed: was referencing missing af9b8869bdb6
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("CREATE TYPE changetype AS ENUM ('STANDARD', 'NORMAL', 'EMERGENCY')")
    op.execute("CREATE TYPE changestatus AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'IN_PROGRESS', 'IMPLEMENTED', 'CLOSED', 'CANCELLED')")
    op.execute("CREATE TYPE changerisk AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')")
    op.execute("CREATE TYPE changeimpact AS ENUM ('LOW', 'MEDIUM', 'HIGH')")
    
    # Create changes table
    op.create_table(
        'changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('change_number', sa.String(length=50), nullable=True),
        sa.Column('change_type', postgresql.ENUM('STANDARD', 'NORMAL', 'EMERGENCY', name='changetype'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', postgresql.ENUM('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'IN_PROGRESS', 'IMPLEMENTED', 'CLOSED', 'CANCELLED', name='changestatus'), nullable=True),
        sa.Column('risk', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='changerisk'), nullable=True),
        sa.Column('impact', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', name='changeimpact'), nullable=True),
        sa.Column('priority', sa.String(length=20), nullable=True),
        sa.Column('requester_id', sa.Integer(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('implementer_id', sa.Integer(), nullable=True),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('reason_for_change', sa.Text(), nullable=True),
        sa.Column('implementation_plan', sa.Text(), nullable=True),
        sa.Column('rollback_plan', sa.Text(), nullable=True),
        sa.Column('testing_plan', sa.Text(), nullable=True),
        sa.Column('planned_start', sa.DateTime(), nullable=True),
        sa.Column('planned_end', sa.DateTime(), nullable=True),
        sa.Column('actual_start', sa.DateTime(), nullable=True),
        sa.Column('actual_end', sa.DateTime(), nullable=True),
        sa.Column('requires_cab_approval', sa.Boolean(), nullable=True),
        sa.Column('cab_approved', sa.Boolean(), nullable=True),
        sa.Column('cab_approved_by_id', sa.Integer(), nullable=True),
        sa.Column('cab_approved_at', sa.DateTime(), nullable=True),
        sa.Column('cab_comments', sa.Text(), nullable=True),
        sa.Column('business_justification', sa.Text(), nullable=True),
        sa.Column('affected_services', sa.Text(), nullable=True),
        sa.Column('affected_users_count', sa.Integer(), nullable=True),
        sa.Column('closure_notes', sa.Text(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['cab_approved_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.ForeignKeyConstraint(['closed_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['implementer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_changes_change_number'), 'changes', ['change_number'], unique=True)
    op.create_index(op.f('ix_changes_id'), 'changes', ['id'], unique=False)

    # Create change_tasks table
    op.create_table(
        'change_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('change_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sequence', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['change_id'], ['changes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_change_tasks_id'), 'change_tasks', ['id'], unique=False)

    # Create change_activities table
    op.create_table(
        'change_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('change_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('activity_type', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['change_id'], ['changes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_change_activities_id'), 'change_activities', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_change_activities_id'), table_name='change_activities')
    op.drop_table('change_activities')
    op.drop_index(op.f('ix_change_tasks_id'), table_name='change_tasks')
    op.drop_table('change_tasks')
    op.drop_index(op.f('ix_changes_id'), table_name='changes')
    op.drop_index(op.f('ix_changes_change_number'), table_name='changes')
    op.drop_table('changes')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS changetype")
    op.execute("DROP TYPE IF EXISTS changestatus")
    op.execute("DROP TYPE IF EXISTS changerisk")
    op.execute("DROP TYPE IF EXISTS changeimpact")