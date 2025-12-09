"""add_service_request_templates

Revision ID: 00003
Revises: 00002
Create Date: 2025-11-16

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '00003'
down_revision = '00002'  # Change this to match your actual latest revision
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'service_request_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('estimated_days', sa.Integer(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_request_templates_id'), 'service_request_templates', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_service_request_templates_id'), table_name='service_request_templates')
    op.drop_table('service_request_templates')