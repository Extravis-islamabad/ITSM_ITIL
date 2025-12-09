"""add ticket_assets junction table

Revision ID: ticket_assets_001
Revises: problem_mgmt_001
Create Date: 2025-12-07

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ticket_assets_001'
down_revision = 'problem_mgmt_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create ticket_assets junction table for many-to-many relationship
    op.create_table(
        'ticket_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for faster lookups
    op.create_index('ix_ticket_assets_ticket_id', 'ticket_assets', ['ticket_id'], unique=False)
    op.create_index('ix_ticket_assets_asset_id', 'ticket_assets', ['asset_id'], unique=False)

    # Create unique constraint to prevent duplicate links
    op.create_unique_constraint('uq_ticket_asset', 'ticket_assets', ['ticket_id', 'asset_id'])


def downgrade():
    op.drop_constraint('uq_ticket_asset', 'ticket_assets', type_='unique')
    op.drop_index('ix_ticket_assets_asset_id', table_name='ticket_assets')
    op.drop_index('ix_ticket_assets_ticket_id', table_name='ticket_assets')
    op.drop_table('ticket_assets')
