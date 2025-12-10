"""Add first_response_at to tickets

Revision ID: 20251209_first_response
Revises: ticket_assets_001
Create Date: 2025-12-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251209_first_response'
down_revision = 'ticket_assets_001'  # Fixed: was '20251207_add_ticket_assets' but actual revision is 'ticket_assets_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add first_response_at column to tickets table
    op.add_column('tickets', sa.Column('first_response_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('tickets', 'first_response_at')
