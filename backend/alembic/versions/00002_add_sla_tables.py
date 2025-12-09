"""add_sla_tables

Revision ID: 00002
Revises: 
Create Date: 2024-xx-xx

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '00002'  
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create sla_policies table
    op.create_table(
        'sla_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('response_time', sa.Integer(), nullable=False),
        sa.Column('resolution_time', sa.Integer(), nullable=False),
        sa.Column('priority_times', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('business_hours_only', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('is_default', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sla_pauses table
    op.create_table(
        'sla_pauses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('paused_by_id', sa.Integer(), nullable=False),
        sa.Column('resumed_by_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('paused_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('resumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pause_duration', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.ForeignKeyConstraint(['paused_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['resumed_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_sla_pauses_ticket', 'sla_pauses', ['ticket_id'])
    op.create_index('idx_sla_pauses_active', 'sla_pauses', ['is_active'])

def downgrade():
    op.drop_index('idx_sla_pauses_active', table_name='sla_pauses')
    op.drop_index('idx_sla_pauses_ticket', table_name='sla_pauses')
    op.drop_table('sla_pauses')
    op.drop_table('sla_policies')